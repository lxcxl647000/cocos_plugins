/**
 * 将自定义规则字符串转换为 TypeScript 类型字符串
 * @param rule 规则字符串，例如 'Array[Object{"id":Number,"tags":Array[String]}]'
 * @returns TypeScript 类型字符串，例如 'Array<{id: number, tags: Array<string>}>'
 */
export function ruleToTsType(rule: string): string {
    // 1. 处理 Array[Object{...}] 这种复杂嵌套
    const arrayObjectMatch = rule.match(/^Array\[Object\{(.+)\}\]$/);
    if (arrayObjectMatch) {
        const innerRule = arrayObjectMatch[1];
        const fields = parseObjectRule(innerRule);
        const interfaceBody = fields.map(f => `${f.name}: ${f.type}`).join(', ');
        return `Array<{${interfaceBody}}>`;
    }

    // 2. 处理 Object{...}
    const objectMatch = rule.match(/^Object\{(.+)\}$/);
    if (objectMatch) {
        const innerRule = objectMatch[1];
        const fields = parseObjectRule(innerRule);
        const interfaceBody = fields.map(f => `${f.name}: ${f.type}`).join(', ');
        return `{${interfaceBody}}`;
    }

    // 3. 处理基础数组类型
    if (rule === 'Array[Number]') return 'Array<number>';
    if (rule === 'Array[String]') return 'Array<string>';
    if (rule === 'Array[Array[Number]]') return 'Array<Array<number>>';
    if (rule === 'Array[Array[String]]') return 'Array<Array<string>>';

    // 4. 处理基础类型
    if (rule === 'Number') return 'number';
    if (rule === 'String') return 'string';

    // 默认 fallback，防止未知类型导致生成失败
    console.warn(`未知规则: ${rule}，将生成为 any 类型`);
    return 'any';
}

/**
 * 解析 Object{...} 大括号内部的规则，提取字段名和类型
 * @param innerRule Object{} 内部的字符串，如 `"id":Number,"tags":Array[String]`
 * @returns 包含字段名和TS类型的对象数组
 */
function parseObjectRule(innerRule: string): { name: string, type: string }[] {
    const fields: { name: string, type: string }[] = [];
    // 匹配 "key":Type 结构
    const regex = /"([a-zA-Z0-9_]+)"\s*:\s*([^,}]+)/g;
    let match;

    while ((match = regex.exec(innerRule)) !== null) {
        const fieldName = match[1];
        let rawType = match[2].trim();

        // 递归调用自身，处理嵌套类型（虽然当前逻辑只支持一层 Object，但这样写更健壮）
        // 注意：这里直接调用 ruleToTsType 可能会导致无限递归，因为 ruleToTsType 又会调回这里。
        // 对于当前需求，我们只需要处理一层即可，或者可以优化递归逻辑。
        // 为了简单起见，我们假设 Object 内部不再嵌套 Object，只嵌套 Array。

        let fieldType = 'any';
        if (rawType === 'Number') fieldType = 'number';
        else if (rawType === 'String') fieldType = 'string';
        else if (rawType === 'Array[Number]') fieldType = 'Array<number>';
        else if (rawType === 'Array[String]') fieldType = 'Array<string>';
        else if (rawType.startsWith('Array[Object')) {
            // 特殊处理 Array[Object]，提取内部结构
            const innerObjMatch = rawType.match(/^Array\[Object\{(.+)\}\]$/);
            if (innerObjMatch) {
                const innerFields = parseObjectRule(innerObjMatch[1]);
                const innerBody = innerFields.map(f => `${f.name}: ${f.type}`).join(', ');
                fieldType = `Array<{${innerBody}}>`;
            }
        }

        fields.push({ name: fieldName, type: fieldType });
    }

    return fields;
}

/**
 * 根据表头和规则生成完整的 Interface 字符串
 * @param sheetName Excel 表名，用作 Interface 名
 * @param titles 表头数组
 * @param rules 规则数组
 */
export function generateInterface(sheetName: string, titles: string[], rules: string[]): string {
    const interfaceName = `I_${sheetName}`; // 或者你可以自定义命名规则
    let content = `/**\n * 该文件由工具自动生成，请勿手动修改\n * 源数据: ${sheetName}\n */\n\n`;

    content += `export interface ${interfaceName} {\n`;

    titles.forEach((title, index) => {
        const rule = rules[index];
        // 跳过 Empty 字段
        if (title === 'Empty' || rule === 'Empty') return;

        const tsType = ruleToTsType(rule);
        content += `  /** ${rule} */\n`; // 可选：将原始规则作为注释写入
        content += `  ${title}: ${tsType};\n`;
    });

    content += `}\n`;

    // 额外导出一个 Record 类型，方便通过 ID 索引（匹配你 JSON 的结构）
    content += `\nexport type ${interfaceName}Map = Record<string, ${interfaceName}>;\n`;

    return content;
}