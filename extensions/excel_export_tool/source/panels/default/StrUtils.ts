/**
 * 支持的规则类型
 * Number：1
 * String："aaa"
 * Array[Number]：1;2;3
 * Array[String]：a;b;c
 * Array[Array[Number]]：[1;2];[3;4]
 * Array[Array[String]]：[aa;bb];[cc;dd]
 * Array[Object{"type":Number,"count":Array[Number],"name":String}]：{1,[2;3],test1};{3,[4;5],测试1}
 * Object{"num":Number,"name":String}：1,aaa
 */

/**
 * 切割字符串数据 —— 根据规则字符串将自定义格式文本解析为 JS 数据结构
 * @param rule 规则字符串，描述目标数据结构
 * @param text 数据字符串，自定义分隔格式（分号分隔）
 * @returns 解析后的 JS 对象/数组/基本类型
 */
export function cutString(rule: string, text: string): unknown {
    if (typeof text !== 'string') {
        throw new TypeError(`text 必须是字符串类型，当前为: ${typeof text}`);
    }

    // 预处理：去除空白、换行、首尾多余分隔符
    text = preprocessText(text);

    // 按规则类型分发解析
    if (isRuleMatch(rule, /^Array\[Object\{/)) {
        return parseArrayObject(rule, text);
    }
    if (isRuleMatch(rule, /^Array\[Array\[Number\]\]/)) {
        return parseArrayArrayNumber(text);
    }
    if (isRuleMatch(rule, /^Array\[Number\]/)) {
        return parseArrayNumber(text);
    }
    if (isRuleMatch(rule, /^Array\[Array\[String\]\]/)) {
        return parseArrayArrayString(text);
    }
    if (isRuleMatch(rule, /^Array\[String\]/)) {
        return parseArrayString(text);
    }
    if (isRuleMatch(rule, /^Object\{/)) {
        return parseObject(rule, text);
    }
    if (isRuleMatch(rule, /^Number/)) {
        return Number(text);
    }
    if (isRuleMatch(rule, /^String/)) {
        return text;
    }

    throw new Error(`不支持的规则类型: ${rule}`);
}

// ======================== 工具函数 ========================

/** 预处理文本：去空白、换行、首尾分隔符 */
function preprocessText(text: string): string {
    text = text.trim().replace(/\n|\r/g, '');

    const lastChar = text[text.length - 1];
    if (lastChar === ';' || lastChar === ',') {
        text = text.slice(0, -1);
    }

    const firstChar = text[0];
    if (firstChar === ';' || firstChar === ',') {
        text = text.slice(1);
    }

    return text;
}

/** 判断规则是否匹配指定正则 */
export function isRuleMatch(rule: string, pattern: RegExp): boolean {
    return pattern.test(rule);
}

/** 从规则字符串中提取所有 key 名称 */
function extractKeys(rule: string): string[] {
    const keys: string[] = [];
    const reg = /"([a-zA-Z0-9]*)":/g;
    let match: RegExpExecArray | null;

    while ((match = reg.exec(rule)) !== null) {
        keys.push(match[1]);
    }

    return keys;
}

/**
 * 将文本中的裸字符串值加上双引号包裹，使其可被 JSON.parse 解析
 * 例如: hello → "hello"，但数字 123 不变
 */
function quoteStringValues(text: string): string {
    // 匹配所有非分隔符的 token
    const tokens = text.match(/[^[\];:}{,]+/g);
    if (!tokens) return text;

    const numberReg = /^\d+(\.\d+)?$/;

    // 收集所有非数字的字符串值（去重）
    const stringValues = [...new Set(
        tokens.filter(token => !numberReg.test(token))
    )];

    // 对每个字符串值，在文本中找到并加上双引号
    for (const value of stringValues) {
        // 转义正则特殊字符，避免注入
        const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // 匹配该值出现在分隔符边界的情况
        const pattern = new RegExp(`(^|[^"\\w])(${escaped})(?=[;\\]},]|$)`);
        text = text.replace(pattern, `$1"$2"`);
    }

    return text;
}

/** 安全地解析 JSON，失败时抛出有意义的错误 */
function safeJsonParse(jsonStr: string, context: string): unknown {
    try {
        return JSON.parse(jsonStr);
    } catch (e) {
        throw new Error(`JSON 解析失败 [${context}]: ${(e as Error).message}\n输入: ${jsonStr}`);
    }
}

// ======================== 各类型解析器 ========================

/** 解析 Array[Number]：如 "1;2;3" → [1, 2, 3] */
function parseArrayNumber(text: string): number[] {
    const jsonStr = `[${text.replace(/;/g, ',')}]`;
    return safeJsonParse(jsonStr, 'Array[Number]') as number[];
}

/** 解析 Array[Array[Number]]：如 "[1;2];[3;4]" → [[1,2],[3,4]] */
function parseArrayArrayNumber(text: string): number[][] {
    const jsonStr = `[${text.replace(/;/g, ',')}]`;
    return safeJsonParse(jsonStr, 'Array[Array[Number]]') as number[][];
}

/** 解析 Array[String]：如 "a;b;c" → ["a","b","c"] */
function parseArrayString(text: string): string[] {
    const tokens = text.match(/[^[\];]+/g) || [];
    const jsonStr = `[${tokens.map(t => `"${t}"`).join(',')}]`;
    return safeJsonParse(jsonStr, 'Array[String]') as string[];
}

/** 解析 Array[Array[String]]：如 "[a;b];[c;d]" → [["a","b"],["c","d"]] */
function parseArrayArrayString(text: string): string[][] {
    const result: string[][] = [];
    const arrayMatches = text.match(/\[[^[\]]*\]/g) || [];

    for (const item of arrayMatches) {
        const tokens = item.match(/[^[\];]+/g) || [];
        const jsonStr = `[${tokens.map(t => `"${t}"`).join(',')}]`;
        result.push(safeJsonParse(jsonStr, 'Array[Array[String]]') as string[]);
    }

    return result;
}

/** 解析 Object{...}：如 "1,2,hello" → { key1: 1, key2: 2, key3: "hello" } */
function parseObject(rule: string, text: string): Record<string, unknown> {
    if (rule.includes('String')) {
        text = quoteStringValues(text);
    }

    const keys = extractKeys(rule);
    const jsonStr = `[${text.replace(/;/g, ',')}]`;
    const parsed = safeJsonParse(jsonStr, 'Object') as unknown[];

    const result: Record<string, unknown> = {};
    keys.forEach((key, index) => {
        result[key] = parsed[index];
    });

    return result;
}

/** 解析 Array[Object{...}]：如 "1,2;3,4" → [{key1:1,key2:2},{key1:3,key2:2}] */
function parseArrayObject(rule: string, text: string): Record<string, unknown>[] {
    if (rule.includes('String')) {
        text = quoteStringValues(text);
    }

    const keys = extractKeys(rule);
    const hasNestedArray = rule.includes('Array');

    let items: string[];

    if (!hasNestedArray) {
        // 简单对象数组：按 ; 拆分，每组包裹 {}
        items = text.split(';').map(item => `{${item}}`);
    } else {
        // 含嵌套数组的对象：用正则提取 {...} 块
        items = text.match(/{[^{}]*}/g) || [];
    }

    // 将自定义格式转为 JSON 可解析格式：{ → [，} → ]，; → ,
    const dataArray: unknown[] = items.map(item => {
        const jsonStr = item
            .replace(/\{/g, '[')
            .replace(/\}/g, ']')
            .replace(/;/g, ',');
        return safeJsonParse(jsonStr, 'Array[Object] item');
    });

    // 将数组数据按 key 映射为对象
    return dataArray.map(data => {
        const obj: Record<string, unknown> = {};
        const arr = data as unknown[];
        keys.forEach((key, index) => {
            obj[key] = arr[index];
        });
        return obj;
    });
}