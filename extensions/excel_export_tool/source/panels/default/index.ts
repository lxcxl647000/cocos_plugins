/* eslint-disable vue/one-component-per-file */

import { createWriteStream, existsSync, readdirSync, readFileSync, removeSync, statSync, writeFileSync } from 'fs-extra';
import path, { join } from 'path';
import { createApp, App, defineComponent } from 'vue';
import CfgUtils from './CfgUtils';
const panelDataMap = new WeakMap<any, App>();
const archiver = require('archiver');
/**
 * @zh 如果希望兼容 3.3 之前的版本可以使用下方的代码
 * @en You can add the code below if you want compatibility with versions prior to 3.3
 */
// Editor.Panel.define = Editor.Panel.define || function(options: any) { return options }

interface IFileData {
    id: number,
    name: string,
    selected: boolean
}

interface IJsonData {
    filePath: string,
    isDelete: boolean
}

export const openDilog = async (type: string, title: string, message: string, btnMap?: Map<string, Function>, cancel?: number) => {
    let option: Editor.Dialog.MessageDialogOptions = {
        title
    };
    if (btnMap) {
        option.buttons = [];
        btnMap.forEach((value, key) => {
            option.buttons.push(key);
        });
    }
    if (cancel !== undefined) {
        option.cancel = cancel;
    }
    let code: { response: 0, checkboxChecked: false } = await Editor.Dialog[type](message, option);
    if (btnMap) {
        let key = option.buttons[code.response];
        if (btnMap.has(key)) {
            let func = btnMap.get(key);
            if (func) {
                func();
            }
        }
    }
}

module.exports = Editor.Panel.define({
    listeners: {
        show() { console.log('show'); },
        hide() { console.log('hide'); },
    },
    template: readFileSync(join(__dirname, '../../../static/template/default/index.html'), 'utf-8'),
    style: readFileSync(join(__dirname, '../../../static/style/default/index.css'), 'utf-8'),
    $: {
        app: '#app',
    },
    methods: {

    },
    ready() {
        if (this.$.app) {
            const app = createApp({});
            app.config.compilerOptions.isCustomElement = (tag) => tag.startsWith('ui-');

            app.component('MyProject', defineComponent({
                data() {
                    return {
                        exportPath: '',
                        excelPath: '',
                        files: [] as IFileData[],
                        isFormat: false,
                        exportTSPath: '',
                        isArr: true,
                        useExportPathConfig: false,
                        exportPathConfig: {
                            exportPath: '',
                            exportTSPath: '',
                            excelPath: ''
                        },
                        jsonFiles: [] as IJsonData[]
                    };
                },
                methods: {
                    filterExcel() {
                        let files: IFileData[] = [];
                        if (this.excelPath) {
                            let dir = readdirSync(this.excelPath);
                            let index = 0;
                            dir.forEach((item) => {
                                if ((item.endsWith('.xlsx') || item.endsWith('.xlsm')) && !item.startsWith('~$')) {
                                    files.push({
                                        id: index++,
                                        name: item,
                                        selected: false
                                    });
                                }
                                if (item.endsWith('.json')) {
                                    this.jsonFiles.push({
                                        filePath: join(this.excelPath, item),
                                        isDelete: false
                                    });
                                }
                            })
                        }
                        return files;
                    },
                    setAllSelected(isSelected: boolean) {
                        this.files.forEach((item) => {
                            item.selected = isSelected;
                        });
                    },
                    exportConfig() {
                        let exportFiles = this.files.filter((item) => item.selected).map((item) => join(this.excelPath, item.name));
                        CfgUtils.parseExcel(exportFiles, this.exportPath, this.exportTSPath, this.isFormat, this.isArr, async () => {
                            openDilog('info', 'info', '导表完成');
                            this.saveExportPathConfig();

                            // 将json文件压缩成zip
                            let zip = async function compressToZip(jsonDatas: IJsonData[], outputFileName: string): Promise<void> {
                                return new Promise((resolve, reject) => {
                                    const output = createWriteStream(outputFileName);

                                    const archive = archiver('zip', { zlib: { level: 9 } });

                                    output.on('close', () => {
                                        console.log(`✅ 压缩完成: ${outputFileName} (${archive.pointer()} bytes)`);
                                        resolve();
                                    });

                                    archive.on('error', (err) => {
                                        reject(err);
                                    });

                                    archive.pipe(output);

                                    for (const jData of jsonDatas) {
                                        let { filePath } = jData;
                                        if (!existsSync(filePath)) {
                                            console.warn(`⚠️ 警告: 路径不存在，已跳过 -> ${filePath}`);
                                            continue;
                                        }

                                        const stats = statSync(filePath);
                                        if (stats.isDirectory()) {
                                            archive.directory(filePath, path.basename(filePath), (entry: any) => {
                                                return entry;
                                            });
                                        } else {
                                            archive.file(filePath, { name: path.basename(filePath) });
                                        }
                                    }

                                    archive.finalize();
                                });
                            }
                            try {
                                let jsonDatas: IJsonData[] = [];
                                let dir = readdirSync(this.exportPath);
                                dir.forEach((item) => {
                                    if (item.endsWith('.json')) {
                                        jsonDatas.push({
                                            filePath: join(this.exportPath, item),
                                            isDelete: true
                                        });
                                    }
                                });
                                jsonDatas = jsonDatas.concat(this.jsonFiles);

                                await zip(jsonDatas, join(this.exportPath, 'config.bin'));
                                jsonDatas.forEach((jData: IJsonData) => {
                                    if (existsSync(jData.filePath) && jData.isDelete) {
                                        removeSync(jData.filePath);
                                    }
                                });
                            } catch (error) {
                                openDilog('error', 'error', `zip失败,${error}`);
                            }
                        });
                    },
                    changeExportPathConfig(isUse: boolean) {
                        this.useExportPathConfig = isUse;
                        if (this.useExportPathConfig) {
                            let configPath = join(__dirname, '../../../static/ExportPathConfig.json');
                            if (!existsSync(configPath)) {
                                this.exportPathConfig = { exportPath: this.exportPath, exportTSPath: this.exportTSPath, excelPath: this.excelPath };
                            }
                            else {
                                this.exportPathConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
                                this.exportPath = this.exportPathConfig.exportPath;
                                this.exportTSPath = this.exportPathConfig.exportTSPath;
                                this.excelPath = this.exportPathConfig.excelPath;
                            }
                        }
                    },
                    saveExportPathConfig() {
                        if (!this.useExportPathConfig) {
                            return;
                        }
                        this.exportPathConfig.exportPath = this.exportPath;
                        this.exportPathConfig.exportTSPath = this.exportTSPath;
                        this.exportPathConfig.excelPath = this.excelPath;
                        let configPath = join(__dirname, '../../../static/ExportPathConfig.json');
                        writeFileSync(configPath, JSON.stringify(this.exportPathConfig, null, '\t'));
                    },
                    refreshFiles() {
                        this.files = this.filterExcel();
                    }
                },
                template: readFileSync(join(__dirname, '../../../static/template/vue/project.html'), 'utf-8'),
                computed: {
                    excelPathComputed() {
                        this.files = this.filterExcel();
                        return this.excelPath;
                    },
                    allSelected() {
                        let count = 0;
                        this.files.forEach((item) => {
                            if (item.selected) {
                                count++;
                            }
                        });
                        return count === this.files.length;
                    },
                    selectedExcel() {
                        return this.files.filter((item) => item.selected).length > 0;
                    }
                }
            }));
            app.mount(this.$.app);
            panelDataMap.set(this, app);
        }
    },
    beforeClose() { },
    close() {
        const app = panelDataMap.get(this);
        if (app) {
            app.unmount();
        }
    },
});
