const fs = require('fs').promises;
const path = require('path');
const Xls2json = require('./Xls2json');

let clientConfigOutputPath;

export async function gen(excelPath, targetPath, files) {
    clientConfigOutputPath = targetPath;    
    await mkdirIfNotExist(clientConfigOutputPath);

    const tasks = [];
    for (let index = 0; index < files.length; index++) {
        const filename = files[index];
        if (filename.startsWith('~') || filename.endsWith('.xlsx') === false) {
            continue
        }

        tasks.push(writeExcel(path.join(excelPath,filename)));
    }
    await Promise.all(tasks);
}

async function writeExcel(xlsxPath) {
    const data = new Xls2json(xlsxPath, 1, 2, 3, 4, 5);
    const sheetConfigs = await data.fromFileAsync()
    const tasks = [];
    const sheetKeys = Object.keys(sheetConfigs);
    for (let index = 0; index < sheetKeys.length; index++) {
        const sheetName = sheetKeys[index];
        tasks.push(writeSheet(sheetName, sheetConfigs[sheetName]));
    }
    await Promise.all(tasks);
    console.log('完成', xlsxPath);
}

async function writeSheet(sheetName, config) {
    let c, s;
    if (config.isMap) {
        c = config.dataList;
        s = config.dataList;
    } else {
        c = {};
        config.csMap = {};
        for (let index = 0; index < config.varList?.length; index++) {
            const key = config.varList[index];
            config.csMap[key] = {
                isC: config.csList[index].indexOf('c') !== -1,
            }
        }

        for (const key in config.dataList) {
            const value = config.dataList[key];
            if (!value.id) { continue; }
            const tempC = {};
            let hasC = false;

            for (let index = 0; index < config.varList.length; index++) {
                const keyOfObj = config.varList[index];
                const csData = config.csMap[keyOfObj];
                if (csData.isC) {
                    tempC[keyOfObj] = value[keyOfObj];
                    hasC = true;
                }
            }

            if (hasC) {
                c[tempC.id] = tempC;
            }
        }
    }
    if(Object.keys(c).length == 0) {
        return;
    }
    await fs.writeFile(path.join(clientConfigOutputPath, sheetName + '.json'), stringify(c));
}


async function mkdirIfNotExist(dirPath) {
    try {
        await fs.stat(dirPath);
    } catch (error) {
        await fs.mkdir(dirPath);
    }
}

function stringify(passedObj, options) {
    var stringOrChar = /("(?:[^\\"]|\\.)*")|[:,]/g;
    var arrayAndObject = /\[\{/g;
    var indent, maxLength, replacer;
    options = options || {};
    indent = "";
    maxLength = indent === "" ? Infinity : options.maxLength === undefined ? 150 : options.maxLength;
    replacer = options.replacer;
    //@ts-ignore
    return (function _stringify(obj, currentIndent, reserved) {
        var end, index, items, key, keyPart, keys, length, nextIndent, prettified, start, string, value;
        if (obj && typeof obj.toJSON === "function") {
            obj = obj.toJSON();
        }
        string = JSON.stringify(obj, replacer);
        if (string === undefined) {
            return string;
        }
        length = maxLength - currentIndent.length - reserved;
        if (string.length <= length && string.search(arrayAndObject)) {
            prettified = string.replace(stringOrChar, function (match, stringLiteral) {
                return stringLiteral || match + " ";
            });
            if (prettified.length <= length) {
                prettified = prettified.replace(/: /g, ":");
                prettified = prettified.replace(/, /g, ",");
                return prettified;
            }
        }
        if (replacer != null) {
            obj = JSON.parse(string);
            replacer = undefined;
        }
        if (typeof obj === "object" && obj !== null) {
            nextIndent = currentIndent + indent;
            items = [];
            index = 0;
            if (Array.isArray(obj)) {
                start = "[";
                end = "]";
                length = obj.length;
                for (; index < length; index++) {
                    items.push(_stringify(obj[index], nextIndent, index === length - 1 ? 0 : 1) || "null");
                }
            } else {
                start = "{";
                end = "}";
                keys = Object.keys(obj);
                length = keys.length;
                for (; index < length; index++) {
                    key = keys[index];
                    keyPart = JSON.stringify(key) + ":";
                    value = _stringify(obj[key], nextIndent, keyPart.length + (index === length - 1 ? 0 : 1));
                    if (value !== undefined) {
                        items.push(keyPart + value);
                    }
                }
            }
            if (items.length > 0) {
                return [start, indent + items.join(",\n" + nextIndent), end].join("\n" + currentIndent);
            }
        }
        return string;
    })(passedObj, "", 0);
};
