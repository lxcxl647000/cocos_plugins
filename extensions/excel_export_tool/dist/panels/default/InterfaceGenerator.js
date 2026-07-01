"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ruleToTsType = ruleToTsType;
exports.generateInterface = generateInterface;
/**
 * 将自定义规则字符串转换为 TypeScript 类型字符串
 * @param rule 规则字符串，例如 'Array[Object{"id":Number,"tags":Array[String]}]'
 * @returns TypeScript 类型字符串，例如 'Array<{id: number, tags: Array<string>}>'
 */
function ruleToTsType(rule) {
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
    if (rule === 'Array[Number]')
        return 'Array<number>';
    if (rule === 'Array[String]')
        return 'Array<string>';
    if (rule === 'Array[Array[Number]]')
        return 'Array<Array<number>>';
    if (rule === 'Array[Array[String]]')
        return 'Array<Array<string>>';
    // 4. 处理基础类型
    if (rule === 'Number')
        return 'number';
    if (rule === 'String')
        return 'string';
    // 默认 fallback，防止未知类型导致生成失败
    console.warn(`未知规则: ${rule}，将生成为 any 类型`);
    return 'any';
}
/**
 * 解析 Object{...} 大括号内部的规则，提取字段名和类型
 * @param innerRule Object{} 内部的字符串，如 `"id":Number,"tags":Array[String]`
 * @returns 包含字段名和TS类型的对象数组
 */
function parseObjectRule(innerRule) {
    const fields = [];
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
        if (rawType === 'Number')
            fieldType = 'number';
        else if (rawType === 'String')
            fieldType = 'string';
        else if (rawType === 'Array[Number]')
            fieldType = 'Array<number>';
        else if (rawType === 'Array[String]')
            fieldType = 'Array<string>';
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
function generateInterface(sheetName, titles, rules) {
    const interfaceName = `I_${sheetName}`; // 或者你可以自定义命名规则
    let content = `/**\n * 该文件由工具自动生成，请勿手动修改\n * 源数据: ${sheetName}\n */\n\n`;
    content += `export interface ${interfaceName} {\n`;
    titles.forEach((title, index) => {
        const rule = rules[index];
        // 跳过 Empty 字段
        if (title === 'Empty' || rule === 'Empty')
            return;
        const tsType = ruleToTsType(rule);
        content += `  /** ${rule} */\n`; // 可选：将原始规则作为注释写入
        content += `  ${title}: ${tsType};\n`;
    });
    content += `}\n`;
    // 额外导出一个 Record 类型，方便通过 ID 索引（匹配你 JSON 的结构）
    content += `\nexport type ${interfaceName}Map = Record<string, ${interfaceName}>;\n`;
    return content;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiSW50ZXJmYWNlR2VuZXJhdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc291cmNlL3BhbmVscy9kZWZhdWx0L0ludGVyZmFjZUdlbmVyYXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUtBLG9DQWdDQztBQWlERCw4Q0FzQkM7QUE1R0Q7Ozs7R0FJRztBQUNILFNBQWdCLFlBQVksQ0FBQyxJQUFZO0lBQ3JDLGtDQUFrQztJQUNsQyxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsMkJBQTJCLENBQUMsQ0FBQztJQUNqRSxJQUFJLGdCQUFnQixFQUFFLENBQUM7UUFDbkIsTUFBTSxTQUFTLEdBQUcsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEMsTUFBTSxNQUFNLEdBQUcsZUFBZSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzFDLE1BQU0sYUFBYSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3pFLE9BQU8sVUFBVSxhQUFhLElBQUksQ0FBQztJQUN2QyxDQUFDO0lBRUQsb0JBQW9CO0lBQ3BCLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsQ0FBQztJQUNuRCxJQUFJLFdBQVcsRUFBRSxDQUFDO1FBQ2QsTUFBTSxTQUFTLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2pDLE1BQU0sTUFBTSxHQUFHLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUMxQyxNQUFNLGFBQWEsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLElB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QUFDO0lBRW5ELE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLEVBQUU7UUFDNUIsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzFCLGNBQWM7UUFDZCxJQUFJLEtBQUssS0FBSyxPQUFPLElBQUksSUFBSSxLQUFLLE9BQU87WUFBRSxPQUFPO1FBRWxELE1BQU0sTUFBTSxHQUFHLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNsQyxPQUFPLElBQUksU0FBUyxJQUFJLE9BQU8sQ0FBQyxDQUFDLGlCQUFpQjtRQUNsRCxPQUFPLElBQUksS0FBSyxLQUFLLEtBQUssTUFBTSxLQUFLLENBQUM7SUFDMUMsQ0FBQyxDQUFDLENBQUM7SUFFSCxPQUFPLElBQUksS0FBSyxDQUFDO0lBRWpCLDRDQUE0QztJQUM1QyxPQUFPLElBQUksaUJBQWlCLGFBQWEsd0JBQXdCLGFBQWEsTUFBTSxDQUFDO0lBRXJGLE9BQU8sT0FBTyxDQUFDO0FBQ25CLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICog5bCG6Ieq5a6a5LmJ6KeE5YiZ5a2X56ym5Liy6L2s5o2i5Li6IFR5cGVTY3JpcHQg57G75Z6L5a2X56ym5LiyXHJcbiAqIEBwYXJhbSBydWxlIOinhOWImeWtl+espuS4su+8jOS+i+WmgiAnQXJyYXlbT2JqZWN0e1wiaWRcIjpOdW1iZXIsXCJ0YWdzXCI6QXJyYXlbU3RyaW5nXX1dJ1xyXG4gKiBAcmV0dXJucyBUeXBlU2NyaXB0IOexu+Wei+Wtl+espuS4su+8jOS+i+WmgiAnQXJyYXk8e2lkOiBudW1iZXIsIHRhZ3M6IEFycmF5PHN0cmluZz59PidcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBydWxlVG9Uc1R5cGUocnVsZTogc3RyaW5nKTogc3RyaW5nIHtcclxuICAgIC8vIDEuIOWkhOeQhiBBcnJheVtPYmplY3R7Li4ufV0g6L+Z56eN5aSN5p2C5bWM5aWXXHJcbiAgICBjb25zdCBhcnJheU9iamVjdE1hdGNoID0gcnVsZS5tYXRjaCgvXkFycmF5XFxbT2JqZWN0XFx7KC4rKVxcfVxcXSQvKTtcclxuICAgIGlmIChhcnJheU9iamVjdE1hdGNoKSB7XHJcbiAgICAgICAgY29uc3QgaW5uZXJSdWxlID0gYXJyYXlPYmplY3RNYXRjaFsxXTtcclxuICAgICAgICBjb25zdCBmaWVsZHMgPSBwYXJzZU9iamVjdFJ1bGUoaW5uZXJSdWxlKTtcclxuICAgICAgICBjb25zdCBpbnRlcmZhY2VCb2R5ID0gZmllbGRzLm1hcChmID0+IGAke2YubmFtZX06ICR7Zi50eXBlfWApLmpvaW4oJywgJyk7XHJcbiAgICAgICAgcmV0dXJuIGBBcnJheTx7JHtpbnRlcmZhY2VCb2R5fX0+YDtcclxuICAgIH1cclxuXHJcbiAgICAvLyAyLiDlpITnkIYgT2JqZWN0ey4uLn1cclxuICAgIGNvbnN0IG9iamVjdE1hdGNoID0gcnVsZS5tYXRjaCgvXk9iamVjdFxceyguKylcXH0kLyk7XHJcbiAgICBpZiAob2JqZWN0TWF0Y2gpIHtcclxuICAgICAgICBjb25zdCBpbm5lclJ1bGUgPSBvYmplY3RNYXRjaFsxXTtcclxuICAgICAgICBjb25zdCBmaWVsZHMgPSBwYXJzZU9iamVjdFJ1bGUoaW5uZXJSdWxlKTtcclxuICAgICAgICBjb25zdCBpbnRlcmZhY2VCb2R5ID0gZmllbGRzLm1hcChmID0+IGAke2YubmFtZX06ICR7Zi50eXBlfWApLmpvaW4oJywgJyk7XHJcbiAgICAgICAgcmV0dXJuIGB7JHtpbnRlcmZhY2VCb2R5fX1gO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIDMuIOWkhOeQhuWfuuehgOaVsOe7hOexu+Wei1xyXG4gICAgaWYgKHJ1bGUgPT09ICdBcnJheVtOdW1iZXJdJykgcmV0dXJuICdBcnJheTxudW1iZXI+JztcclxuICAgIGlmIChydWxlID09PSAnQXJyYXlbU3RyaW5nXScpIHJldHVybiAnQXJyYXk8c3RyaW5nPic7XHJcbiAgICBpZiAocnVsZSA9PT0gJ0FycmF5W0FycmF5W051bWJlcl1dJykgcmV0dXJuICdBcnJheTxBcnJheTxudW1iZXI+Pic7XHJcbiAgICBpZiAocnVsZSA9PT0gJ0FycmF5W0FycmF5W1N0cmluZ11dJykgcmV0dXJuICdBcnJheTxBcnJheTxzdHJpbmc+Pic7XHJcblxyXG4gICAgLy8gNC4g5aSE55CG5Z+656GA57G75Z6LXHJcbiAgICBpZiAocnVsZSA9PT0gJ051bWJlcicpIHJldHVybiAnbnVtYmVyJztcclxuICAgIGlmIChydWxlID09PSAnU3RyaW5nJykgcmV0dXJuICdzdHJpbmcnO1xyXG5cclxuICAgIC8vIOm7mOiupCBmYWxsYmFja++8jOmYsuatouacquefpeexu+Wei+WvvOiHtOeUn+aIkOWksei0pVxyXG4gICAgY29uc29sZS53YXJuKGDmnKrnn6Xop4TliJk6ICR7cnVsZX3vvIzlsIbnlJ/miJDkuLogYW55IOexu+Wei2ApO1xyXG4gICAgcmV0dXJuICdhbnknO1xyXG59XHJcblxyXG4vKipcclxuICog6Kej5p6QIE9iamVjdHsuLi59IOWkp+aLrOWPt+WGhemDqOeahOinhOWIme+8jOaPkOWPluWtl+auteWQjeWSjOexu+Wei1xyXG4gKiBAcGFyYW0gaW5uZXJSdWxlIE9iamVjdHt9IOWGhemDqOeahOWtl+espuS4su+8jOWmgiBgXCJpZFwiOk51bWJlcixcInRhZ3NcIjpBcnJheVtTdHJpbmddYFxyXG4gKiBAcmV0dXJucyDljIXlkKvlrZfmrrXlkI3lkoxUU+exu+Wei+eahOWvueixoeaVsOe7hFxyXG4gKi9cclxuZnVuY3Rpb24gcGFyc2VPYmplY3RSdWxlKGlubmVyUnVsZTogc3RyaW5nKTogeyBuYW1lOiBzdHJpbmcsIHR5cGU6IHN0cmluZyB9W10ge1xyXG4gICAgY29uc3QgZmllbGRzOiB7IG5hbWU6IHN0cmluZywgdHlwZTogc3RyaW5nIH1bXSA9IFtdO1xyXG4gICAgLy8g5Yy56YWNIFwia2V5XCI6VHlwZSDnu5PmnoRcclxuICAgIGNvbnN0IHJlZ2V4ID0gL1wiKFthLXpBLVowLTlfXSspXCJcXHMqOlxccyooW14sfV0rKS9nO1xyXG4gICAgbGV0IG1hdGNoO1xyXG5cclxuICAgIHdoaWxlICgobWF0Y2ggPSByZWdleC5leGVjKGlubmVyUnVsZSkpICE9PSBudWxsKSB7XHJcbiAgICAgICAgY29uc3QgZmllbGROYW1lID0gbWF0Y2hbMV07XHJcbiAgICAgICAgbGV0IHJhd1R5cGUgPSBtYXRjaFsyXS50cmltKCk7XHJcblxyXG4gICAgICAgIC8vIOmAkuW9kuiwg+eUqOiHqui6q++8jOWkhOeQhuW1jOWll+exu+Wei++8iOiZveeEtuW9k+WJjemAu+i+keWPquaUr+aMgeS4gOWxgiBPYmplY3TvvIzkvYbov5nmoLflhpnmm7TlgaXlo67vvIlcclxuICAgICAgICAvLyDms6jmhI/vvJrov5nph4znm7TmjqXosIPnlKggcnVsZVRvVHNUeXBlIOWPr+iDveS8muWvvOiHtOaXoOmZkOmAkuW9ku+8jOWboOS4uiBydWxlVG9Uc1R5cGUg5Y+I5Lya6LCD5Zue6L+Z6YeM44CCXHJcbiAgICAgICAgLy8g5a+55LqO5b2T5YmN6ZyA5rGC77yM5oiR5Lus5Y+q6ZyA6KaB5aSE55CG5LiA5bGC5Y2z5Y+v77yM5oiW6ICF5Y+v5Lul5LyY5YyW6YCS5b2S6YC76L6R44CCXHJcbiAgICAgICAgLy8g5Li65LqG566A5Y2V6LW36KeB77yM5oiR5Lus5YGH6K6+IE9iamVjdCDlhoXpg6jkuI3lho3ltYzlpZcgT2JqZWN077yM5Y+q5bWM5aWXIEFycmF544CCXHJcblxyXG4gICAgICAgIGxldCBmaWVsZFR5cGUgPSAnYW55JztcclxuICAgICAgICBpZiAocmF3VHlwZSA9PT0gJ051bWJlcicpIGZpZWxkVHlwZSA9ICdudW1iZXInO1xyXG4gICAgICAgIGVsc2UgaWYgKHJhd1R5cGUgPT09ICdTdHJpbmcnKSBmaWVsZFR5cGUgPSAnc3RyaW5nJztcclxuICAgICAgICBlbHNlIGlmIChyYXdUeXBlID09PSAnQXJyYXlbTnVtYmVyXScpIGZpZWxkVHlwZSA9ICdBcnJheTxudW1iZXI+JztcclxuICAgICAgICBlbHNlIGlmIChyYXdUeXBlID09PSAnQXJyYXlbU3RyaW5nXScpIGZpZWxkVHlwZSA9ICdBcnJheTxzdHJpbmc+JztcclxuICAgICAgICBlbHNlIGlmIChyYXdUeXBlLnN0YXJ0c1dpdGgoJ0FycmF5W09iamVjdCcpKSB7XHJcbiAgICAgICAgICAgIC8vIOeJueauiuWkhOeQhiBBcnJheVtPYmplY3Rd77yM5o+Q5Y+W5YaF6YOo57uT5p6EXHJcbiAgICAgICAgICAgIGNvbnN0IGlubmVyT2JqTWF0Y2ggPSByYXdUeXBlLm1hdGNoKC9eQXJyYXlcXFtPYmplY3RcXHsoLispXFx9XFxdJC8pO1xyXG4gICAgICAgICAgICBpZiAoaW5uZXJPYmpNYXRjaCkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgaW5uZXJGaWVsZHMgPSBwYXJzZU9iamVjdFJ1bGUoaW5uZXJPYmpNYXRjaFsxXSk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBpbm5lckJvZHkgPSBpbm5lckZpZWxkcy5tYXAoZiA9PiBgJHtmLm5hbWV9OiAke2YudHlwZX1gKS5qb2luKCcsICcpO1xyXG4gICAgICAgICAgICAgICAgZmllbGRUeXBlID0gYEFycmF5PHske2lubmVyQm9keX19PmA7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZpZWxkcy5wdXNoKHsgbmFtZTogZmllbGROYW1lLCB0eXBlOiBmaWVsZFR5cGUgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGZpZWxkcztcclxufVxyXG5cclxuLyoqXHJcbiAqIOagueaNruihqOWktOWSjOinhOWImeeUn+aIkOWujOaVtOeahCBJbnRlcmZhY2Ug5a2X56ym5LiyXHJcbiAqIEBwYXJhbSBzaGVldE5hbWUgRXhjZWwg6KGo5ZCN77yM55So5L2cIEludGVyZmFjZSDlkI1cclxuICogQHBhcmFtIHRpdGxlcyDooajlpLTmlbDnu4RcclxuICogQHBhcmFtIHJ1bGVzIOinhOWImeaVsOe7hFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGdlbmVyYXRlSW50ZXJmYWNlKHNoZWV0TmFtZTogc3RyaW5nLCB0aXRsZXM6IHN0cmluZ1tdLCBydWxlczogc3RyaW5nW10pOiBzdHJpbmcge1xyXG4gICAgY29uc3QgaW50ZXJmYWNlTmFtZSA9IGBJXyR7c2hlZXROYW1lfWA7IC8vIOaIluiAheS9oOWPr+S7peiHquWumuS5ieWRveWQjeinhOWImVxyXG4gICAgbGV0IGNvbnRlbnQgPSBgLyoqXFxuICog6K+l5paH5Lu255Sx5bel5YW36Ieq5Yqo55Sf5oiQ77yM6K+35Yu/5omL5Yqo5L+u5pS5XFxuICog5rqQ5pWw5o2uOiAke3NoZWV0TmFtZX1cXG4gKi9cXG5cXG5gO1xyXG5cclxuICAgIGNvbnRlbnQgKz0gYGV4cG9ydCBpbnRlcmZhY2UgJHtpbnRlcmZhY2VOYW1lfSB7XFxuYDtcclxuXHJcbiAgICB0aXRsZXMuZm9yRWFjaCgodGl0bGUsIGluZGV4KSA9PiB7XHJcbiAgICAgICAgY29uc3QgcnVsZSA9IHJ1bGVzW2luZGV4XTtcclxuICAgICAgICAvLyDot7Pov4cgRW1wdHkg5a2X5q61XHJcbiAgICAgICAgaWYgKHRpdGxlID09PSAnRW1wdHknIHx8IHJ1bGUgPT09ICdFbXB0eScpIHJldHVybjtcclxuXHJcbiAgICAgICAgY29uc3QgdHNUeXBlID0gcnVsZVRvVHNUeXBlKHJ1bGUpO1xyXG4gICAgICAgIGNvbnRlbnQgKz0gYCAgLyoqICR7cnVsZX0gKi9cXG5gOyAvLyDlj6/pgInvvJrlsIbljp/lp4vop4TliJnkvZzkuLrms6jph4rlhpnlhaVcclxuICAgICAgICBjb250ZW50ICs9IGAgICR7dGl0bGV9OiAke3RzVHlwZX07XFxuYDtcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnRlbnQgKz0gYH1cXG5gO1xyXG5cclxuICAgIC8vIOmineWkluWvvOWHuuS4gOS4qiBSZWNvcmQg57G75Z6L77yM5pa55L6/6YCa6L+HIElEIOe0ouW8le+8iOWMuemFjeS9oCBKU09OIOeahOe7k+aehO+8iVxyXG4gICAgY29udGVudCArPSBgXFxuZXhwb3J0IHR5cGUgJHtpbnRlcmZhY2VOYW1lfU1hcCA9IFJlY29yZDxzdHJpbmcsICR7aW50ZXJmYWNlTmFtZX0+O1xcbmA7XHJcblxyXG4gICAgcmV0dXJuIGNvbnRlbnQ7XHJcbn0iXX0=