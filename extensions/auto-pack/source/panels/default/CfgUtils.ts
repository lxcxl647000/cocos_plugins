import { emptyDirSync, existsSync, writeFileSync } from "fs-extra";
import { parse } from "node-xlsx";
import { cutString } from "./StrUtils";
import path from "path";

export default class CfgUtils {
    public static deleteConfigs(path: string) {
        if (existsSync(path)) {
            emptyDirSync(path);
        }
        else {
            console.log(`删除配置的路径不存在 ${path}`);
        }
    }

    public static parseExcel(excelPaths: string[], exportPath: string, cb: Function) {
        if (excelPaths) {
            for (let i = 0; i < excelPaths.length; i++) {
                let excelData = parse(excelPaths[i]);
                if (excelData) {
                    let sheetData = excelData[0].data;
                    if (sheetData) {
                        console.log('sheetdata : ', sheetData);

                        if (sheetData.length > 3) {
                            let sheet = { data: sheetData, name: excelData[0].name };
                            if (exportPath) {
                                CfgUtils.writeFileJson(exportPath, sheet);
                            }
                        }
                        else {
                            console.log(`行数低于3行，无效配置 ${excelPaths[i]} ${excelData[0].name}`);
                        }
                    }
                }
                else {
                    console.log(`配置文件 ${excelPaths[i]} 解析失败`);
                }
            }
            cb && cb();
        }
        else {
            console.log('配置路径为空----');
        }
    }

    public static writeFileJson(exportPath: string, sheet: { data: unknown, name: string }) {
        if (exportPath === '') return;
        let { data, name } = sheet;
        let jsonData = CfgUtils.getJsonData(data);
        if (jsonData) {
            if (Object.keys(jsonData).length > 0) {
                let exportFile = path.join(exportPath, `${name}.json`);
                let str = '';
                str = JSON.stringify(jsonData, null, '\t');
                writeFileSync(exportFile, str);
            }
        }
    }

    public static getJsonData(excelData: any) {
        let title = excelData[0];
        let desc = excelData[1];
        let ruleText = excelData[2];
        let ret = null;

        let exportData = [];
        for (let i = 3; i < excelData.length; i++) {
            let lineData = excelData[i];
            if (lineData.length !== title.length) {
                console.log(`配置表头和配置数据不匹配: ${title} - ${lineData} : 第${i + 1}行`);
                console.log("跳过该行数据");
                continue;
            }

            let saveLineData = {};

            // todo 将ID字段也加入到data中
            for (let j = 0; j < title.length; j++) {
                let key = title[j];

                let rule = ruleText[j].trim();
                if (key === 'Empty' || rule === 'Empty') {
                    continue;
                }

                let value = lineData[j];
                if (value === undefined) {
                    value = "";
                }

                if (value) {
                    value = cutString(rule, value.toString());
                }

                saveLineData[key] = value;
            }

            (exportData as Array<any>).push(saveLineData);
        }
        ret = exportData;
        return ret;
    }
}