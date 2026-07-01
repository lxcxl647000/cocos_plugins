/* eslint-disable vue/one-component-per-file */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs-extra';
import { join } from 'path';
import { createApp, App, defineComponent } from 'vue';
import CfgUtils from './CfgUtils';
const panelDataMap = new WeakMap<any, App>();
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

interface IExportPathConfig {
    exportPath: string,
    exportTSPath: string,
    excelPath: string
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
                        }
                    };
                },
                methods: {
                    filterExcel() {
                        let files: IFileData[] = [];
                        if (this.excelPath) {
                            let dir = readdirSync(this.excelPath);
                            let index = 0;
                            dir.forEach((item) => {
                                if ((item.endsWith('.xlsx') || item.endsWith('.xlsm') && !item.startsWith('~$'))) {
                                    files.push({
                                        id: index++,
                                        name: item,
                                        selected: false
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
                        CfgUtils.parseExcel(exportFiles, this.exportPath, this.exportTSPath, this.isFormat, this.isArr, () => {
                            openDilog('info', 'info', '导表完成');
                            this.saveExportPathConfig();
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
