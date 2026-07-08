"use strict";
/* eslint-disable vue/one-component-per-file */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openDilog = void 0;
const fs_extra_1 = require("fs-extra");
const path_1 = __importStar(require("path"));
const vue_1 = require("vue");
const CfgUtils_1 = __importDefault(require("./CfgUtils"));
// import archiver from 'archiver';
const panelDataMap = new WeakMap();
const archiver = require('archiver');
const openDilog = async (type, title, message, btnMap, cancel) => {
    let option = {
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
    let code = await Editor.Dialog[type](message, option);
    if (btnMap) {
        let key = option.buttons[code.response];
        if (btnMap.has(key)) {
            let func = btnMap.get(key);
            if (func) {
                func();
            }
        }
    }
};
exports.openDilog = openDilog;
module.exports = Editor.Panel.define({
    listeners: {
        show() { console.log('show'); },
        hide() { console.log('hide'); },
    },
    template: (0, fs_extra_1.readFileSync)((0, path_1.join)(__dirname, '../../../static/template/default/index.html'), 'utf-8'),
    style: (0, fs_extra_1.readFileSync)((0, path_1.join)(__dirname, '../../../static/style/default/index.css'), 'utf-8'),
    $: {
        app: '#app',
    },
    methods: {},
    ready() {
        if (this.$.app) {
            const app = (0, vue_1.createApp)({});
            app.config.compilerOptions.isCustomElement = (tag) => tag.startsWith('ui-');
            app.component('MyProject', (0, vue_1.defineComponent)({
                data() {
                    return {
                        exportPath: '',
                        excelPath: '',
                        files: [],
                        isFormat: false,
                        exportTSPath: '',
                        isArr: true,
                        useExportPathConfig: false,
                        exportPathConfig: {
                            exportPath: '',
                            exportTSPath: '',
                            excelPath: ''
                        },
                        jsonFiles: []
                    };
                },
                methods: {
                    filterExcel() {
                        let files = [];
                        if (this.excelPath) {
                            let dir = (0, fs_extra_1.readdirSync)(this.excelPath);
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
                                        filePath: (0, path_1.join)(this.excelPath, item),
                                        isDelete: false
                                    });
                                }
                            });
                        }
                        return files;
                    },
                    setAllSelected(isSelected) {
                        this.files.forEach((item) => {
                            item.selected = isSelected;
                        });
                    },
                    exportConfig() {
                        let exportFiles = this.files.filter((item) => item.selected).map((item) => (0, path_1.join)(this.excelPath, item.name));
                        CfgUtils_1.default.parseExcel(exportFiles, this.exportPath, this.exportTSPath, this.isFormat, this.isArr, async () => {
                            (0, exports.openDilog)('info', 'info', '导表完成');
                            this.saveExportPathConfig();
                            // 将json文件压缩成zip
                            let zip = async function compressToZip(jsonDatas, outputFileName) {
                                return new Promise((resolve, reject) => {
                                    const output = (0, fs_extra_1.createWriteStream)(outputFileName);
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
                                        if (!(0, fs_extra_1.existsSync)(filePath)) {
                                            console.warn(`⚠️ 警告: 路径不存在，已跳过 -> ${filePath}`);
                                            continue;
                                        }
                                        const stats = (0, fs_extra_1.statSync)(filePath);
                                        if (stats.isDirectory()) {
                                            archive.directory(filePath, path_1.default.basename(filePath), (entry) => {
                                                return entry;
                                            });
                                        }
                                        else {
                                            archive.file(filePath, { name: path_1.default.basename(filePath) });
                                        }
                                    }
                                    archive.finalize();
                                });
                            };
                            try {
                                let jsonDatas = [];
                                let dir = (0, fs_extra_1.readdirSync)(this.exportPath);
                                dir.forEach((item) => {
                                    if (item.endsWith('.json')) {
                                        jsonDatas.push({
                                            filePath: (0, path_1.join)(this.exportPath, item),
                                            isDelete: true
                                        });
                                    }
                                });
                                jsonDatas = jsonDatas.concat(this.jsonFiles);
                                await zip(jsonDatas, (0, path_1.join)(this.exportPath, 'config.bin'));
                                jsonDatas.forEach((jData) => {
                                    if ((0, fs_extra_1.existsSync)(jData.filePath) && jData.isDelete) {
                                        (0, fs_extra_1.removeSync)(jData.filePath);
                                    }
                                });
                            }
                            catch (error) {
                                (0, exports.openDilog)('error', 'error', `zip失败,${error}`);
                            }
                        });
                    },
                    changeExportPathConfig(isUse) {
                        this.useExportPathConfig = isUse;
                        if (this.useExportPathConfig) {
                            let configPath = (0, path_1.join)(__dirname, '../../../static/ExportPathConfig.json');
                            if (!(0, fs_extra_1.existsSync)(configPath)) {
                                this.exportPathConfig = { exportPath: this.exportPath, exportTSPath: this.exportTSPath, excelPath: this.excelPath };
                            }
                            else {
                                this.exportPathConfig = JSON.parse((0, fs_extra_1.readFileSync)(configPath, 'utf-8'));
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
                        let configPath = (0, path_1.join)(__dirname, '../../../static/ExportPathConfig.json');
                        (0, fs_extra_1.writeFileSync)(configPath, JSON.stringify(this.exportPathConfig, null, '\t'));
                    },
                    refreshFiles() {
                        this.files = this.filterExcel();
                    }
                },
                template: (0, fs_extra_1.readFileSync)((0, path_1.join)(__dirname, '../../../static/template/vue/project.html'), 'utf-8'),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zb3VyY2UvcGFuZWxzL2RlZmF1bHQvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLCtDQUErQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRS9DLHVDQUF5SDtBQUN6SCw2Q0FBa0M7QUFDbEMsNkJBQXNEO0FBQ3RELDBEQUFrQztBQUNsQyxtQ0FBbUM7QUFDbkMsTUFBTSxZQUFZLEdBQUcsSUFBSSxPQUFPLEVBQVksQ0FBQztBQUM3QyxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7QUFrQjlCLE1BQU0sU0FBUyxHQUFHLEtBQUssRUFBRSxJQUFZLEVBQUUsS0FBYSxFQUFFLE9BQWUsRUFBRSxNQUE4QixFQUFFLE1BQWUsRUFBRSxFQUFFO0lBQzdILElBQUksTUFBTSxHQUF1QztRQUM3QyxLQUFLO0tBQ1IsQ0FBQztJQUNGLElBQUksTUFBTSxFQUFFLENBQUM7UUFDVCxNQUFNLENBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztRQUNwQixNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxFQUFFO1lBQzFCLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzdCLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztJQUNELElBQUksTUFBTSxLQUFLLFNBQVMsRUFBRSxDQUFDO1FBQ3ZCLE1BQU0sQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO0lBQzNCLENBQUM7SUFDRCxJQUFJLElBQUksR0FBNEMsTUFBTSxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztJQUMvRixJQUFJLE1BQU0sRUFBRSxDQUFDO1FBQ1QsSUFBSSxHQUFHLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMs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QkFDSCxPQUFPLEtBQUssS0FBSyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQztvQkFDdkMsQ0FBQztvQkFDRCxhQUFhO3dCQUNULE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO29CQUNqRSxDQUFDO2lCQUNKO2FBQ0osQ0FBQyxDQUFDLENBQUM7WUFDSixHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDdEIsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDaEMsQ0FBQztJQUNMLENBQUM7SUFDRCxXQUFXLEtBQUssQ0FBQztJQUNqQixLQUFLO1FBQ0QsTUFBTSxHQUFHLEdBQUcsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNuQyxJQUFJLEdBQUcsRUFBRSxDQUFDO1lBQ04sR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2xCLENBQUM7SUFDTCxDQUFDO0NBQ0osQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgdnVlL29uZS1jb21wb25lbnQtcGVyLWZpbGUgKi9cclxuXHJcbmltcG9ydCB7IGNyZWF0ZVdyaXRlU3RyZWFtLCBleGlzdHNTeW5jLCByZWFkZGlyU3luYywgcmVhZEZpbGVTeW5jLCByZW1vdmVTeW5jLCBzdGF0U3luYywgd3JpdGVGaWxlU3luYyB9IGZyb20gJ2ZzLWV4dHJhJztcclxuaW1wb3J0IHBhdGgsIHsgam9pbiB9IGZyb20gJ3BhdGgnO1xyXG5pbXBvcnQgeyBjcmVhdGVBcHAsIEFwcCwgZGVmaW5lQ29tcG9uZW50IH0gZnJvbSAndnVlJztcclxuaW1wb3J0IENmZ1V0aWxzIGZyb20gJy4vQ2ZnVXRpbHMnO1xyXG4vLyBpbXBvcnQgYXJjaGl2ZXIgZnJvbSAnYXJjaGl2ZXInO1xyXG5jb25zdCBwYW5lbERhdGFNYXAgPSBuZXcgV2Vha01hcDxhbnksIEFwcD4oKTtcclxuY29uc3QgYXJjaGl2ZXIgPSByZXF1aXJlKCdhcmNoaXZlcicpO1xyXG4vKipcclxuICogQHpoIOWmguaenOW4jOacm+WFvOWuuSAzLjMg5LmL5YmN55qE54mI5pys5Y+v5Lul5L2/55So5LiL5pa555qE5Luj56CBXHJcbiAqIEBlbiBZb3UgY2FuIGFkZCB0aGUgY29kZSBiZWxvdyBpZiB5b3Ugd2FudCBjb21wYXRpYmlsaXR5IHdpdGggdmVyc2lvbnMgcHJpb3IgdG8gMy4zXHJcbiAqL1xyXG4vLyBFZGl0b3IuUGFuZWwuZGVmaW5lID0gRWRpdG9yLlBhbmVsLmRlZmluZSB8fCBmdW5jdGlvbihvcHRpb25zOiBhbnkpIHsgcmV0dXJuIG9wdGlvbnMgfVxyXG5cclxuaW50ZXJmYWNlIElGaWxlRGF0YSB7XHJcbiAgICBpZDogbnVtYmVyLFxyXG4gICAgbmFtZTogc3RyaW5nLFxyXG4gICAgc2VsZWN0ZWQ6IGJvb2xlYW5cclxufVxyXG5cclxuaW50ZXJmYWNlIElKc29uRGF0YSB7XHJcbiAgICBmaWxlUGF0aDogc3RyaW5nLFxyXG4gICAgaXNEZWxldGU6IGJvb2xlYW5cclxufVxyXG5cclxuZXhwb3J0IGNvbnN0IG9wZW5EaWxvZyA9IGFzeW5jICh0eXBlOiBzdHJpbmcsIHRpdGxlOiBzdHJpbmcsIG1lc3NhZ2U6IHN0cmluZywgYnRuTWFwPzogTWFwPHN0cmluZywgRnVuY3Rpb24+LCBjYW5jZWw/OiBudW1iZXIpID0+IHtcclxuICAgIGxldCBvcHRpb246IEVkaXRvci5EaWFsb2cuTWVzc2FnZURpYWxvZ09wdGlvbnMgPSB7XHJcbiAgICAgICAgdGl0bGVcclxuICAgIH07XHJcbiAgICBpZiAoYnRuTWFwKSB7XHJcbiAgICAgICAgb3B0aW9uLmJ1dHRvbnMgPSBbXTtcclxuICAgICAgICBidG5NYXAuZm9yRWFjaCgodmFsdWUsIGtleSkgPT4ge1xyXG4gICAgICAgICAgICBvcHRpb24uYnV0dG9ucy5wdXNoKGtleSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBpZiAoY2FuY2VsICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICBvcHRpb24uY2FuY2VsID0gY2FuY2VsO1xyXG4gICAgfVxyXG4gICAgbGV0IGNvZGU6IHsgcmVzcG9uc2U6IDAsIGNoZWNrYm94Q2hlY2tlZDogZmFsc2UgfSA9IGF3YWl0IEVkaXRvci5EaWFsb2dbdHlwZV0obWVzc2FnZSwgb3B0aW9uKTtcclxuICAgIGlmIChidG5NYXApIHtcclxuICAgICAgICBsZXQga2V5ID0gb3B0aW9uLmJ1dHRvbnNbY29kZS5yZXNwb25zZV07XHJcbiAgICAgICAgaWYgKGJ0bk1hcC5oYXMoa2V5KSkge1xyXG4gICAgICAgICAgICBsZXQgZnVuYyA9IGJ0bk1hcC5nZXQoa2V5KTtcclxuICAgICAgICAgICAgaWYgKGZ1bmMpIHtcclxuICAgICAgICAgICAgICAgIGZ1bmMoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBFZGl0b3IuUGFuZWwuZGVmaW5lKHtcclxuICAgIGxpc3RlbmVyczoge1xyXG4gICAgICAgIHNob3coKSB7IGNvbnNvbGUubG9nKCdzaG93Jyk7IH0sXHJcbiAgICAgICAgaGlkZSgpIHsgY29uc29sZS5sb2coJ2hpZGUnKTsgfSxcclxuICAgIH0sXHJcbiAgICB0ZW1wbGF0ZTogcmVhZEZpbGVTeW5jKGpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vc3RhdGljL3RlbXBsYXRlL2RlZmF1bHQvaW5kZXguaHRtbCcpLCAndXRmLTgnKSxcclxuICAgIHN0eWxlOiByZWFkRmlsZVN5bmMoam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi9zdGF0aWMvc3R5bGUvZGVmYXVsdC9pbmRleC5jc3MnKSwgJ3V0Zi04JyksXHJcbiAgICAkOiB7XHJcbiAgICAgICAgYXBwOiAnI2FwcCcsXHJcbiAgICB9LFxyXG4gICAgbWV0aG9kczoge1xyXG5cclxuICAgIH0sXHJcbiAgICByZWFkeSgpIHtcclxuICAgICAgICBpZiAodGhpcy4kLmFwcCkge1xyXG4gICAgICAgICAgICBjb25zdCBhcHAgPSBjcmVhdGVBcHAoe30pO1xyXG4gICAgICAgICAgICBhcHAuY29uZmlnLmNvbXBpbGVyT3B0aW9ucy5pc0N1c3RvbUVsZW1lbnQgPSAodGFnKSA9PiB0YWcuc3RhcnRzV2l0aCgndWktJyk7XHJcblxyXG4gICAgICAgICAgICBhcHAuY29tcG9uZW50KCdNeVByb2plY3QnLCBkZWZpbmVDb21wb25lbnQoe1xyXG4gICAgICAgICAgICAgICAgZGF0YSgpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBleHBvcnRQYXRoOiAnJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXhjZWxQYXRoOiAnJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZmlsZXM6IFtdIGFzIElGaWxlRGF0YVtdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpc0Zvcm1hdDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydFRTUGF0aDogJycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzQXJyOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB1c2VFeHBvcnRQYXRoQ29uZmlnOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0UGF0aENvbmZpZzoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0UGF0aDogJycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnRUU1BhdGg6ICcnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhjZWxQYXRoOiAnJ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBqc29uRmlsZXM6IFtdIGFzIElKc29uRGF0YVtdXHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBtZXRob2RzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZmlsdGVyRXhjZWwoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBmaWxlczogSUZpbGVEYXRhW10gPSBbXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuZXhjZWxQYXRoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgZGlyID0gcmVhZGRpclN5bmModGhpcy5leGNlbFBhdGgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGluZGV4ID0gMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpci5mb3JFYWNoKChpdGVtKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKChpdGVtLmVuZHNXaXRoKCcueGxzeCcpIHx8IGl0ZW0uZW5kc1dpdGgoJy54bHNtJykpICYmICFpdGVtLnN0YXJ0c1dpdGgoJ34kJykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZXMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZDogaW5kZXgrKyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IGl0ZW0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZDogZmFsc2VcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpdGVtLmVuZHNXaXRoKCcuanNvbicpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuanNvbkZpbGVzLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZVBhdGg6IGpvaW4odGhpcy5leGNlbFBhdGgsIGl0ZW0pLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNEZWxldGU6IGZhbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZpbGVzO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgc2V0QWxsU2VsZWN0ZWQoaXNTZWxlY3RlZDogYm9vbGVhbikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmZpbGVzLmZvckVhY2goKGl0ZW0pID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0uc2VsZWN0ZWQgPSBpc1NlbGVjdGVkO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGV4cG9ydENvbmZpZygpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGV4cG9ydEZpbGVzID0gdGhpcy5maWxlcy5maWx0ZXIoKGl0ZW0pID0+IGl0ZW0uc2VsZWN0ZWQpLm1hcCgoaXRlbSkgPT4gam9pbih0aGlzLmV4Y2VsUGF0aCwgaXRlbS5uYW1lKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIENmZ1V0aWxzLnBhcnNlRXhjZWwoZXhwb3J0RmlsZXMsIHRoaXMuZXhwb3J0UGF0aCwgdGhpcy5leHBvcnRUU1BhdGgsIHRoaXMuaXNGb3JtYXQsIHRoaXMuaXNBcnIsIGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnaW5mbycsICdpbmZvJywgJ+WvvOihqOWujOaIkCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zYXZlRXhwb3J0UGF0aENvbmZpZygpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWwhmpzb27mlofku7bljovnvKnmiJB6aXBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCB6aXAgPSBhc3luYyBmdW5jdGlvbiBjb21wcmVzc1RvWmlwKGpzb25EYXRhczogSUpzb25EYXRhW10sIG91dHB1dEZpbGVOYW1lOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBvdXRwdXQgPSBjcmVhdGVXcml0ZVN0cmVhbShvdXRwdXRGaWxlTmFtZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhcmNoaXZlID0gYXJjaGl2ZXIoJ3ppcCcsIHsgemxpYjogeyBsZXZlbDogOSB9IH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3V0cHV0Lm9uKCdjbG9zZScsICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGDinIUg5Y6L57yp5a6M5oiQOiAke291dHB1dEZpbGVOYW1lfSAoJHthcmNoaXZlLnBvaW50ZXIoKX0gYnl0ZXMpYCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXJjaGl2ZS5vbignZXJyb3InLCAoZXJyKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcmNoaXZlLnBpcGUob3V0cHV0KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgakRhdGEgb2YganNvbkRhdGFzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgeyBmaWxlUGF0aCB9ID0gakRhdGE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWV4aXN0c1N5bmMoZmlsZVBhdGgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGDimqDvuI8g6K2m5ZGKOiDot6/lvoTkuI3lrZjlnKjvvIzlt7Lot7Pov4cgLT4gJHtmaWxlUGF0aH1gKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzdGF0cyA9IHN0YXRTeW5jKGZpbGVQYXRoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzdGF0cy5pc0RpcmVjdG9yeSgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXJjaGl2ZS5kaXJlY3RvcnkoZmlsZVBhdGgsIHBhdGguYmFzZW5hbWUoZmlsZVBhdGgpLCAoZW50cnk6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZW50cnk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFyY2hpdmUuZmlsZShmaWxlUGF0aCwgeyBuYW1lOiBwYXRoLmJhc2VuYW1lKGZpbGVQYXRoKSB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXJjaGl2ZS5maW5hbGl6ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQganNvbkRhdGFzOiBJSnNvbkRhdGFbXSA9IFtdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBkaXIgPSByZWFkZGlyU3luYyh0aGlzLmV4cG9ydFBhdGgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpci5mb3JFYWNoKChpdGVtKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpdGVtLmVuZHNXaXRoKCcuanNvbicpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBqc29uRGF0YXMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZVBhdGg6IGpvaW4odGhpcy5leHBvcnRQYXRoLCBpdGVtKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc0RlbGV0ZTogdHJ1ZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBqc29uRGF0YXMgPSBqc29uRGF0YXMuY29uY2F0KHRoaXMuanNvbkZpbGVzKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgemlwKGpzb25EYXRhcywgam9pbih0aGlzLmV4cG9ydFBhdGgsICdjb25maWcuYmluJykpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGpzb25EYXRhcy5mb3JFYWNoKChqRGF0YTogSUpzb25EYXRhKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChleGlzdHNTeW5jKGpEYXRhLmZpbGVQYXRoKSAmJiBqRGF0YS5pc0RlbGV0ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVtb3ZlU3luYyhqRGF0YS5maWxlUGF0aCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCdlcnJvcicsICdlcnJvcicsIGB6aXDlpLHotKUsJHtlcnJvcn1gKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBjaGFuZ2VFeHBvcnRQYXRoQ29uZmlnKGlzVXNlOiBib29sZWFuKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudXNlRXhwb3J0UGF0aENvbmZpZyA9IGlzVXNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy51c2VFeHBvcnRQYXRoQ29uZmlnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgY29uZmlnUGF0aCA9IGpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vc3RhdGljL0V4cG9ydFBhdGhDb25maWcuanNvbicpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFleGlzdHNTeW5jKGNvbmZpZ1BhdGgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5leHBvcnRQYXRoQ29uZmlnID0geyBleHBvcnRQYXRoOiB0aGlzLmV4cG9ydFBhdGgsIGV4cG9ydFRTUGF0aDogdGhpcy5leHBvcnRUU1BhdGgsIGV4Y2VsUGF0aDogdGhpcy5leGNlbFBhdGggfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZXhwb3J0UGF0aENvbmZpZyA9IEpTT04ucGFyc2UocmVhZEZpbGVTeW5jKGNvbmZpZ1BhdGgsICd1dGYtOCcpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmV4cG9ydFBhdGggPSB0aGlzLmV4cG9ydFBhdGhDb25maWcuZXhwb3J0UGF0aDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmV4cG9ydFRTUGF0aCA9IHRoaXMuZXhwb3J0UGF0aENvbmZpZy5leHBvcnRUU1BhdGg7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5leGNlbFBhdGggPSB0aGlzLmV4cG9ydFBhdGhDb25maWcuZXhjZWxQYXRoO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBzYXZlRXhwb3J0UGF0aENvbmZpZygpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLnVzZUV4cG9ydFBhdGhDb25maWcpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmV4cG9ydFBhdGhDb25maWcuZXhwb3J0UGF0aCA9IHRoaXMuZXhwb3J0UGF0aDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5leHBvcnRQYXRoQ29uZmlnLmV4cG9ydFRTUGF0aCA9IHRoaXMuZXhwb3J0VFNQYXRoO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmV4cG9ydFBhdGhDb25maWcuZXhjZWxQYXRoID0gdGhpcy5leGNlbFBhdGg7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjb25maWdQYXRoID0gam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi9zdGF0aWMvRXhwb3J0UGF0aENvbmZpZy5qc29uJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdyaXRlRmlsZVN5bmMoY29uZmlnUGF0aCwgSlNPTi5zdHJpbmdpZnkodGhpcy5leHBvcnRQYXRoQ29uZmlnLCBudWxsLCAnXFx0JykpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVmcmVzaEZpbGVzKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmZpbGVzID0gdGhpcy5maWx0ZXJFeGNlbCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZTogcmVhZEZpbGVTeW5jKGpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vc3RhdGljL3RlbXBsYXRlL3Z1ZS9wcm9qZWN0Lmh0bWwnKSwgJ3V0Zi04JyksXHJcbiAgICAgICAgICAgICAgICBjb21wdXRlZDoge1xyXG4gICAgICAgICAgICAgICAgICAgIGV4Y2VsUGF0aENvbXB1dGVkKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmZpbGVzID0gdGhpcy5maWx0ZXJFeGNlbCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5leGNlbFBhdGg7XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBhbGxTZWxlY3RlZCgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGNvdW50ID0gMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5maWxlcy5mb3JFYWNoKChpdGVtKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbS5zZWxlY3RlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50Kys7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY291bnQgPT09IHRoaXMuZmlsZXMubGVuZ3RoO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWRFeGNlbCgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZmlsZXMuZmlsdGVyKChpdGVtKSA9PiBpdGVtLnNlbGVjdGVkKS5sZW5ndGggPiAwO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSkpO1xyXG4gICAgICAgICAgICBhcHAubW91bnQodGhpcy4kLmFwcCk7XHJcbiAgICAgICAgICAgIHBhbmVsRGF0YU1hcC5zZXQodGhpcywgYXBwKTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG4gICAgYmVmb3JlQ2xvc2UoKSB7IH0sXHJcbiAgICBjbG9zZSgpIHtcclxuICAgICAgICBjb25zdCBhcHAgPSBwYW5lbERhdGFNYXAuZ2V0KHRoaXMpO1xyXG4gICAgICAgIGlmIChhcHApIHtcclxuICAgICAgICAgICAgYXBwLnVubW91bnQoKTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG59KTtcclxuIl19