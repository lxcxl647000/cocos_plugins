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
                        jsonFiles: [],
                        isZip: true
                    };
                },
                methods: {
                    filterExcel() {
                        let files = [];
                        if (this.excelPath && (0, fs_extra_1.existsSync)(this.excelPath)) {
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
                            if (this.isZip) {
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
                            }
                        });
                    },
                    changeExportPathConfig(isUse) {
                        this.useExportPathConfig = isUse;
                        if (this.useExportPathConfig) {
                            let configPath = (0, path_1.join)(__dirname, '../../../static/ExportPathConfig.json');
                            if ((0, fs_extra_1.existsSync)(configPath)) {
                                let { exportPath, exportTSPath, excelPath } = JSON.parse((0, fs_extra_1.readFileSync)(configPath, 'utf-8'));
                                this.exportPath = exportPath;
                                this.exportTSPath = exportTSPath;
                                this.excelPath = excelPath;
                            }
                        }
                    },
                    saveExportPathConfig() {
                        if (!this.useExportPathConfig) {
                            return;
                        }
                        let exportPathConfig = {
                            exportPath: this.exportPath,
                            exportTSPath: this.exportTSPath,
                            excelPath: this.excelPath
                        };
                        let configPath = (0, path_1.join)(__dirname, '../../../static/ExportPathConfig.json');
                        (0, fs_extra_1.writeFileSync)(configPath, JSON.stringify(exportPathConfig, null, '\t'));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zb3VyY2UvcGFuZWxzL2RlZmF1bHQvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLCtDQUErQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRS9DLHVDQUF5SDtBQUN6SCw2Q0FBa0M7QUFDbEMsNkJBQXNEO0FBQ3RELDBEQUFrQztBQUNsQyxNQUFNLFlBQVksR0FBRyxJQUFJLE9BQU8sRUFBWSxDQUFDO0FBQzdDLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztBQWtCOUIsTUFBTSxTQUFTLEdBQUcsS0FBSyxFQUFFLElBQVksRUFBRSxLQUFhLEVBQUUsT0FBZSxFQUFFLE1BQThCLEVBQUUsTUFBZSxFQUFFLEVBQUU7SUFDN0gsSUFBSSxNQUFNLEdBQXVDO1FBQzdDLEtBQUs7S0FDUixDQUFDO0lBQ0YsSUFBSSxNQUFNLEVBQUUsQ0FBQztRQUNULE1BQU0sQ0FBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1FBQ3BCLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLEVBQUU7WUFDMUIsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDN0IsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDO0lBQ0QsSUFBSSxNQUFNLEtBQUssU0FBUyxFQUFFLENBQUM7UUFDdkIsTUFBTSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7SUFDM0IsQ0FBQztJQUNELElBQUksSUFBSSxHQUE0QyxNQUFNLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQy9GLElBQUksTUFBTSxFQUFFLENBQUM7UUFDVCxJQUFJLEdBQUcsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FB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QUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3RCLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ2hDLENBQUM7SUFDTCxDQUFDO0lBQ0QsV0FBVyxLQUFLLENBQUM7SUFDakIsS0FBSztRQUNELE1BQU0sR0FBRyxHQUFHLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbkMsSUFBSSxHQUFHLEVBQUUsQ0FBQztZQUNOLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNsQixDQUFDO0lBQ0wsQ0FBQztDQUNKLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIHZ1ZS9vbmUtY29tcG9uZW50LXBlci1maWxlICovXHJcblxyXG5pbXBvcnQgeyBjcmVhdGVXcml0ZVN0cmVhbSwgZXhpc3RzU3luYywgcmVhZGRpclN5bmMsIHJlYWRGaWxlU3luYywgcmVtb3ZlU3luYywgc3RhdFN5bmMsIHdyaXRlRmlsZVN5bmMgfSBmcm9tICdmcy1leHRyYSc7XHJcbmltcG9ydCBwYXRoLCB7IGpvaW4gfSBmcm9tICdwYXRoJztcclxuaW1wb3J0IHsgY3JlYXRlQXBwLCBBcHAsIGRlZmluZUNvbXBvbmVudCB9IGZyb20gJ3Z1ZSc7XHJcbmltcG9ydCBDZmdVdGlscyBmcm9tICcuL0NmZ1V0aWxzJztcclxuY29uc3QgcGFuZWxEYXRhTWFwID0gbmV3IFdlYWtNYXA8YW55LCBBcHA+KCk7XHJcbmNvbnN0IGFyY2hpdmVyID0gcmVxdWlyZSgnYXJjaGl2ZXInKTtcclxuLyoqXHJcbiAqIEB6aCDlpoLmnpzluIzmnJvlhbzlrrkgMy4zIOS5i+WJjeeahOeJiOacrOWPr+S7peS9v+eUqOS4i+aWueeahOS7o+eggVxyXG4gKiBAZW4gWW91IGNhbiBhZGQgdGhlIGNvZGUgYmVsb3cgaWYgeW91IHdhbnQgY29tcGF0aWJpbGl0eSB3aXRoIHZlcnNpb25zIHByaW9yIHRvIDMuM1xyXG4gKi9cclxuLy8gRWRpdG9yLlBhbmVsLmRlZmluZSA9IEVkaXRvci5QYW5lbC5kZWZpbmUgfHwgZnVuY3Rpb24ob3B0aW9uczogYW55KSB7IHJldHVybiBvcHRpb25zIH1cclxuXHJcbmludGVyZmFjZSBJRmlsZURhdGEge1xyXG4gICAgaWQ6IG51bWJlcixcclxuICAgIG5hbWU6IHN0cmluZyxcclxuICAgIHNlbGVjdGVkOiBib29sZWFuXHJcbn1cclxuXHJcbmludGVyZmFjZSBJSnNvbkRhdGEge1xyXG4gICAgZmlsZVBhdGg6IHN0cmluZyxcclxuICAgIGlzRGVsZXRlOiBib29sZWFuXHJcbn1cclxuXHJcbmV4cG9ydCBjb25zdCBvcGVuRGlsb2cgPSBhc3luYyAodHlwZTogc3RyaW5nLCB0aXRsZTogc3RyaW5nLCBtZXNzYWdlOiBzdHJpbmcsIGJ0bk1hcD86IE1hcDxzdHJpbmcsIEZ1bmN0aW9uPiwgY2FuY2VsPzogbnVtYmVyKSA9PiB7XHJcbiAgICBsZXQgb3B0aW9uOiBFZGl0b3IuRGlhbG9nLk1lc3NhZ2VEaWFsb2dPcHRpb25zID0ge1xyXG4gICAgICAgIHRpdGxlXHJcbiAgICB9O1xyXG4gICAgaWYgKGJ0bk1hcCkge1xyXG4gICAgICAgIG9wdGlvbi5idXR0b25zID0gW107XHJcbiAgICAgICAgYnRuTWFwLmZvckVhY2goKHZhbHVlLCBrZXkpID0+IHtcclxuICAgICAgICAgICAgb3B0aW9uLmJ1dHRvbnMucHVzaChrZXkpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgaWYgKGNhbmNlbCAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgb3B0aW9uLmNhbmNlbCA9IGNhbmNlbDtcclxuICAgIH1cclxuICAgIGxldCBjb2RlOiB7IHJlc3BvbnNlOiAwLCBjaGVja2JveENoZWNrZWQ6IGZhbHNlIH0gPSBhd2FpdCBFZGl0b3IuRGlhbG9nW3R5cGVdKG1lc3NhZ2UsIG9wdGlvbik7XHJcbiAgICBpZiAoYnRuTWFwKSB7XHJcbiAgICAgICAgbGV0IGtleSA9IG9wdGlvbi5idXR0b25zW2NvZGUucmVzcG9uc2VdO1xyXG4gICAgICAgIGlmIChidG5NYXAuaGFzKGtleSkpIHtcclxuICAgICAgICAgICAgbGV0IGZ1bmMgPSBidG5NYXAuZ2V0KGtleSk7XHJcbiAgICAgICAgICAgIGlmIChmdW5jKSB7XHJcbiAgICAgICAgICAgICAgICBmdW5jKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRWRpdG9yLlBhbmVsLmRlZmluZSh7XHJcbiAgICBsaXN0ZW5lcnM6IHtcclxuICAgICAgICBzaG93KCkgeyBjb25zb2xlLmxvZygnc2hvdycpOyB9LFxyXG4gICAgICAgIGhpZGUoKSB7IGNvbnNvbGUubG9nKCdoaWRlJyk7IH0sXHJcbiAgICB9LFxyXG4gICAgdGVtcGxhdGU6IHJlYWRGaWxlU3luYyhqb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uL3N0YXRpYy90ZW1wbGF0ZS9kZWZhdWx0L2luZGV4Lmh0bWwnKSwgJ3V0Zi04JyksXHJcbiAgICBzdHlsZTogcmVhZEZpbGVTeW5jKGpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vc3RhdGljL3N0eWxlL2RlZmF1bHQvaW5kZXguY3NzJyksICd1dGYtOCcpLFxyXG4gICAgJDoge1xyXG4gICAgICAgIGFwcDogJyNhcHAnLFxyXG4gICAgfSxcclxuICAgIG1ldGhvZHM6IHtcclxuXHJcbiAgICB9LFxyXG4gICAgcmVhZHkoKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuJC5hcHApIHtcclxuICAgICAgICAgICAgY29uc3QgYXBwID0gY3JlYXRlQXBwKHt9KTtcclxuICAgICAgICAgICAgYXBwLmNvbmZpZy5jb21waWxlck9wdGlvbnMuaXNDdXN0b21FbGVtZW50ID0gKHRhZykgPT4gdGFnLnN0YXJ0c1dpdGgoJ3VpLScpO1xyXG5cclxuICAgICAgICAgICAgYXBwLmNvbXBvbmVudCgnTXlQcm9qZWN0JywgZGVmaW5lQ29tcG9uZW50KHtcclxuICAgICAgICAgICAgICAgIGRhdGEoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0UGF0aDogJycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4Y2VsUGF0aDogJycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVzOiBbXSBhcyBJRmlsZURhdGFbXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXNGb3JtYXQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBleHBvcnRUU1BhdGg6ICcnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpc0FycjogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdXNlRXhwb3J0UGF0aENvbmZpZzogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGpzb25GaWxlczogW10gYXMgSUpzb25EYXRhW10sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzWmlwOiB0cnVlXHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBtZXRob2RzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZmlsdGVyRXhjZWwoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBmaWxlczogSUZpbGVEYXRhW10gPSBbXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuZXhjZWxQYXRoICYmIGV4aXN0c1N5bmModGhpcy5leGNlbFBhdGgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgZGlyID0gcmVhZGRpclN5bmModGhpcy5leGNlbFBhdGgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGluZGV4ID0gMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpci5mb3JFYWNoKChpdGVtKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKChpdGVtLmVuZHNXaXRoKCcueGxzeCcpIHx8IGl0ZW0uZW5kc1dpdGgoJy54bHNtJykpICYmICFpdGVtLnN0YXJ0c1dpdGgoJ34kJykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZXMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZDogaW5kZXgrKyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IGl0ZW0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZDogZmFsc2VcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpdGVtLmVuZHNXaXRoKCcuanNvbicpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuanNvbkZpbGVzLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZVBhdGg6IGpvaW4odGhpcy5leGNlbFBhdGgsIGl0ZW0pLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNEZWxldGU6IGZhbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZpbGVzO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgc2V0QWxsU2VsZWN0ZWQoaXNTZWxlY3RlZDogYm9vbGVhbikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmZpbGVzLmZvckVhY2goKGl0ZW0pID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0uc2VsZWN0ZWQgPSBpc1NlbGVjdGVkO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGV4cG9ydENvbmZpZygpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGV4cG9ydEZpbGVzID0gdGhpcy5maWxlcy5maWx0ZXIoKGl0ZW0pID0+IGl0ZW0uc2VsZWN0ZWQpLm1hcCgoaXRlbSkgPT4gam9pbih0aGlzLmV4Y2VsUGF0aCwgaXRlbS5uYW1lKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIENmZ1V0aWxzLnBhcnNlRXhjZWwoZXhwb3J0RmlsZXMsIHRoaXMuZXhwb3J0UGF0aCwgdGhpcy5leHBvcnRUU1BhdGgsIHRoaXMuaXNGb3JtYXQsIHRoaXMuaXNBcnIsIGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnaW5mbycsICdpbmZvJywgJ+WvvOihqOWujOaIkCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zYXZlRXhwb3J0UGF0aENvbmZpZygpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmlzWmlwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5bCGanNvbuaWh+S7tuWOi+e8qeaIkHppcFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCB6aXAgPSBhc3luYyBmdW5jdGlvbiBjb21wcmVzc1RvWmlwKGpzb25EYXRhczogSUpzb25EYXRhW10sIG91dHB1dEZpbGVOYW1lOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG91dHB1dCA9IGNyZWF0ZVdyaXRlU3RyZWFtKG91dHB1dEZpbGVOYW1lKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhcmNoaXZlID0gYXJjaGl2ZXIoJ3ppcCcsIHsgemxpYjogeyBsZXZlbDogOSB9IH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG91dHB1dC5vbignY2xvc2UnLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYOKchSDljovnvKnlrozmiJA6ICR7b3V0cHV0RmlsZU5hbWV9ICgke2FyY2hpdmUucG9pbnRlcigpfSBieXRlcylgKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcmNoaXZlLm9uKCdlcnJvcicsIChlcnIpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFyY2hpdmUucGlwZShvdXRwdXQpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgakRhdGEgb2YganNvbkRhdGFzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHsgZmlsZVBhdGggfSA9IGpEYXRhO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZXhpc3RzU3luYyhmaWxlUGF0aCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGDimqDvuI8g6K2m5ZGKOiDot6/lvoTkuI3lrZjlnKjvvIzlt7Lot7Pov4cgLT4gJHtmaWxlUGF0aH1gKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzdGF0cyA9IHN0YXRTeW5jKGZpbGVQYXRoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoc3RhdHMuaXNEaXJlY3RvcnkoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcmNoaXZlLmRpcmVjdG9yeShmaWxlUGF0aCwgcGF0aC5iYXNlbmFtZShmaWxlUGF0aCksIChlbnRyeTogYW55KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZW50cnk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFyY2hpdmUuZmlsZShmaWxlUGF0aCwgeyBuYW1lOiBwYXRoLmJhc2VuYW1lKGZpbGVQYXRoKSB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXJjaGl2ZS5maW5hbGl6ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGpzb25EYXRhczogSUpzb25EYXRhW10gPSBbXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGRpciA9IHJlYWRkaXJTeW5jKHRoaXMuZXhwb3J0UGF0aCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpci5mb3JFYWNoKChpdGVtKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbS5lbmRzV2l0aCgnLmpzb24nKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGpzb25EYXRhcy5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZVBhdGg6IGpvaW4odGhpcy5leHBvcnRQYXRoLCBpdGVtKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNEZWxldGU6IHRydWVcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGpzb25EYXRhcyA9IGpzb25EYXRhcy5jb25jYXQodGhpcy5qc29uRmlsZXMpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgemlwKGpzb25EYXRhcywgam9pbih0aGlzLmV4cG9ydFBhdGgsICdjb25maWcuYmluJykpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBqc29uRGF0YXMuZm9yRWFjaCgoakRhdGE6IElKc29uRGF0YSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGV4aXN0c1N5bmMoakRhdGEuZmlsZVBhdGgpICYmIGpEYXRhLmlzRGVsZXRlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVtb3ZlU3luYyhqRGF0YS5maWxlUGF0aCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnZXJyb3InLCAnZXJyb3InLCBgemlw5aSx6LSlLCR7ZXJyb3J9YCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGNoYW5nZUV4cG9ydFBhdGhDb25maWcoaXNVc2U6IGJvb2xlYW4pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy51c2VFeHBvcnRQYXRoQ29uZmlnID0gaXNVc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnVzZUV4cG9ydFBhdGhDb25maWcpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjb25maWdQYXRoID0gam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi9zdGF0aWMvRXhwb3J0UGF0aENvbmZpZy5qc29uJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXhpc3RzU3luYyhjb25maWdQYXRoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCB7IGV4cG9ydFBhdGgsIGV4cG9ydFRTUGF0aCwgZXhjZWxQYXRoIH0gPSBKU09OLnBhcnNlKHJlYWRGaWxlU3luYyhjb25maWdQYXRoLCAndXRmLTgnKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5leHBvcnRQYXRoID0gZXhwb3J0UGF0aDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmV4cG9ydFRTUGF0aCA9IGV4cG9ydFRTUGF0aDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmV4Y2VsUGF0aCA9IGV4Y2VsUGF0aDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgc2F2ZUV4cG9ydFBhdGhDb25maWcoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy51c2VFeHBvcnRQYXRoQ29uZmlnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGV4cG9ydFBhdGhDb25maWcgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnRQYXRoOiB0aGlzLmV4cG9ydFBhdGgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnRUU1BhdGg6IHRoaXMuZXhwb3J0VFNQYXRoLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhjZWxQYXRoOiB0aGlzLmV4Y2VsUGF0aFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgY29uZmlnUGF0aCA9IGpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vc3RhdGljL0V4cG9ydFBhdGhDb25maWcuanNvbicpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB3cml0ZUZpbGVTeW5jKGNvbmZpZ1BhdGgsIEpTT04uc3RyaW5naWZ5KGV4cG9ydFBhdGhDb25maWcsIG51bGwsICdcXHQnKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZWZyZXNoRmlsZXMoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZmlsZXMgPSB0aGlzLmZpbHRlckV4Y2VsKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHRlbXBsYXRlOiByZWFkRmlsZVN5bmMoam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi9zdGF0aWMvdGVtcGxhdGUvdnVlL3Byb2plY3QuaHRtbCcpLCAndXRmLTgnKSxcclxuICAgICAgICAgICAgICAgIGNvbXB1dGVkOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZXhjZWxQYXRoQ29tcHV0ZWQoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZmlsZXMgPSB0aGlzLmZpbHRlckV4Y2VsKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmV4Y2VsUGF0aDtcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGFsbFNlbGVjdGVkKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgY291bnQgPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmZpbGVzLmZvckVhY2goKGl0ZW0pID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpdGVtLnNlbGVjdGVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY291bnQrKztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjb3VudCA9PT0gdGhpcy5maWxlcy5sZW5ndGg7XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZEV4Y2VsKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5maWxlcy5maWx0ZXIoKGl0ZW0pID0+IGl0ZW0uc2VsZWN0ZWQpLmxlbmd0aCA+IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgICAgIGFwcC5tb3VudCh0aGlzLiQuYXBwKTtcclxuICAgICAgICAgICAgcGFuZWxEYXRhTWFwLnNldCh0aGlzLCBhcHApO1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcbiAgICBiZWZvcmVDbG9zZSgpIHsgfSxcclxuICAgIGNsb3NlKCkge1xyXG4gICAgICAgIGNvbnN0IGFwcCA9IHBhbmVsRGF0YU1hcC5nZXQodGhpcyk7XHJcbiAgICAgICAgaWYgKGFwcCkge1xyXG4gICAgICAgICAgICBhcHAudW5tb3VudCgpO1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcbn0pO1xyXG4iXX0=