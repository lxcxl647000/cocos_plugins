"use strict";
/* eslint-disable vue/one-component-per-file */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openDilog = void 0;
const child_process_1 = require("child_process");
const fs_extra_1 = require("fs-extra");
const path_1 = require("path");
const vue_1 = require("vue");
const os_1 = __importDefault(require("os"));
const main_1 = require("../../main");
const panelDataMap = new WeakMap();
const packsPath = (0, path_1.join)(__dirname, '../../../static/packconfigs/Packs.json');
let taskList = (0, fs_extra_1.existsSync)(packsPath) ? JSON.parse((0, fs_extra_1.readFileSync)(packsPath, 'utf-8')).packs : [];
const modifyPackageJson = () => {
    let data = { packs: taskList };
    let dataStr = JSON.stringify(data, null, "\t");
    (0, fs_extra_1.writeFileSync)((0, path_1.join)(__dirname, '../../../static/packconfigs/Packs.json'), dataStr, 'utf-8');
};
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
                        taskList: taskList,
                        isAutoPack: false,
                        isCheckLogin: false
                    };
                },
                methods: {
                    startAutoPack() {
                        if (!this.taskList || this.taskList.length === 0) {
                            let btnMap = new Map();
                            btnMap.set('add', () => {
                                this.addProject();
                            });
                            btnMap.set('cancel', null);
                            (0, exports.openDilog)('warn', 'warn', '请先添加自动化项目配置！', btnMap);
                            return;
                        }
                        for (let task of this.taskList) {
                            if (!task.path || !task.channel) {
                                let str = '';
                                if (!task.appId) {
                                    str += '未配置appId ';
                                }
                                if (!task.path) {
                                    str += '未配置项目路径 ';
                                }
                                if (!task.channel) {
                                    str += '未配置渠道 ';
                                }
                                (0, exports.openDilog)('warn', 'warn', `appId:${task.appId}${task.name}${str}请检查配置！`);
                                return;
                            }
                        }
                        if (this.getAutoCount() === 0) {
                            (0, exports.openDilog)('warn', 'warn', '无自动化项目!');
                            return;
                        }
                        if (this.isAutoPack) {
                            (0, exports.openDilog)('warn', 'warn', '正在自动化，请稍后再试!');
                            return;
                        }
                        const checkTaobao = (func) => {
                            let check = false;
                            for (let task of this.taskList) {
                                if (task.channel === 'taobao-mini-game') {
                                    check = true;
                                    break;
                                }
                            }
                            if (check) {
                                this.isCheckLogin = true;
                                (0, main_1.checkTaobaoLogin)(() => {
                                    this.isCheckLogin = false;
                                    func && func();
                                }, () => {
                                    this.isCheckLogin = false;
                                    (0, exports.openDilog)('warn', 'warn', '淘宝登录态过期，请重新登录!');
                                });
                            }
                            else {
                                func && func();
                            }
                        };
                        const autoPack = () => {
                            (0, exports.openDilog)('info', 'start', '开始自动化');
                            this.isAutoPack = true;
                            modifyPackageJson();
                            let data = { packs: this.taskList };
                            let dataStr = JSON.stringify(data);
                            // 将 JSON 字符串转为 Base64 编码 避免双引号在命令行中被吃掉
                            let base64Str = Buffer.from(dataStr).toString('base64');
                            let path = (0, path_1.join)(__dirname, '../../../static/auto-pack/build/app.js');
                            let args = [path, '--packs', base64Str];
                            let sp = (0, child_process_1.spawn)("node", args, { shell: true });
                            sp.stdout.setEncoding('utf8');
                            sp.stdout.on('data', (data) => {
                                console.log(`autoPack stdout ${data.toString()}`);
                            });
                            sp.stderr.on('data', (data) => {
                                console.log(`autoPack stderr ${data.toString()}`);
                            });
                            sp.on('exit', (code, data) => {
                                if (code === 0) {
                                    console.log(`autoPack exit suscess ${data}`);
                                    (0, exports.openDilog)('info', '完成', '自动化完成!');
                                }
                                else {
                                    console.log(`autoPack exit fail ${data}`);
                                    (0, exports.openDilog)('error', '失败', '自动化失败!');
                                }
                                this.isAutoPack = false;
                            });
                        };
                        let msg = '';
                        let uploadCount = 0;
                        let packCount = 0;
                        let autoCount = 0;
                        for (let task of this.taskList) {
                            if (task.needAutoPack) {
                                autoCount++;
                                if (task.upload) {
                                    uploadCount++;
                                }
                                if (!task.skip) {
                                    packCount++;
                                }
                                msg += `${task.appId}：${task.name}，构建：${(task.skip ? '✕' : '✓')}，上传：${(task.upload ? '✓' : '✕')}\n`;
                            }
                        }
                        msg += `自动化：${autoCount}个，构建：${packCount}个，上传：${uploadCount}个\n`;
                        let btnMap = new Map();
                        btnMap.set('ok', () => {
                            checkTaobao(() => { autoPack(); });
                        });
                        (0, exports.openDilog)('warn', 'warn', `${msg}开始自动化?`, btnMap, 1);
                    },
                    addProject() {
                        this.taskList.push({
                            appId: '',
                            name: '',
                            path: '',
                            channel: 'taobao-mini-game',
                            upload: false,
                            skip: false,
                            needAutoPack: false,
                        });
                        (0, exports.openDilog)('info', 'add', '添加成功');
                    },
                    delProject(item) {
                        let btnMap = new Map();
                        btnMap.set('delete', () => {
                            for (let i = 0; i < this.taskList.length; i++) {
                                let task = this.taskList[i];
                                if (task.appId === item.appId && task.name === item.name) {
                                    this.taskList.splice(i, 1);
                                    break;
                                }
                            }
                        });
                        (0, exports.openDilog)('warn', 'delete', '是否删除配置?', btnMap, 1);
                    },
                    importPacksConfig() {
                        const importFunc = () => {
                            // 1. 动态创建一个隐藏的 input 标签
                            const input = document.createElement('input');
                            input.type = 'file';
                            // 限制只能选择 json 文件，如果导入 Excel 可以改为 '.xlsx, .xls'
                            input.accept = '.json';
                            input.style.display = 'none';
                            // 2. 监听文件选择的变化
                            input.onchange = (e) => {
                                var _a;
                                const file = (_a = e.target.files) === null || _a === void 0 ? void 0 : _a[0];
                                if (!file)
                                    return;
                                // 3. 使用 FileReader 读取文件内容
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                    var _a;
                                    try {
                                        // 获取文件里的文本内容并解析为 JSON
                                        const result = (_a = event.target) === null || _a === void 0 ? void 0 : _a.result;
                                        const importedData = JSON.parse(result);
                                        // 假设导入的 JSON 格式也是 { packs: [...] }
                                        if (importedData.packs && Array.isArray(importedData.packs)) {
                                            // 将导入的数据替换到当前的 taskList 中
                                            this.taskList = importedData.packs;
                                            taskList = this.taskList;
                                            // 4. 触发保存，将新数据写入本地 Packs.json
                                            modifyPackageJson();
                                            // 如果有 Editor.Dialog，可以弹个成功提示
                                            (0, exports.openDilog)('info', '提示', '导入成功！');
                                        }
                                        else {
                                            (0, exports.openDilog)('warn', '警告', '导入的文件格式不正确！');
                                        }
                                    }
                                    catch (error) {
                                        console.error(error);
                                        (0, exports.openDilog)('error', '错误', '文件解析失败，请检查文件格式！');
                                    }
                                    // 5. 清理：将临时创建的 input 标签从页面中移除
                                    document.body.removeChild(input);
                                };
                                reader.readAsText(file); // 以文本形式读取文件
                            };
                            // 6. 将 input 挂载到页面并触发点击，弹出文件选择框
                            document.body.appendChild(input);
                            input.click();
                        };
                        // 说明静态文件中有 Packs.json了，询问是否替换
                        if (this.taskList && this.taskList.length > 0) {
                            let btnMap = new Map();
                            btnMap.set('replace', () => {
                                importFunc();
                            });
                            btnMap.set('cancel', null);
                            (0, exports.openDilog)('warn', 'replace', 'Packs.json 已存在，是否替换?', btnMap);
                        }
                        else {
                            importFunc();
                        }
                    },
                    exportPacksConfig() {
                        // 说明没有配置
                        if (!this.taskList || this.taskList.length === 0) {
                            (0, exports.openDilog)('warn', '警告', '没有配置，无法导出');
                            return;
                        }
                        try {
                            // 1. 组装需要导出的数据
                            const exportData = {
                                packs: this.taskList
                            };
                            const dataStr = JSON.stringify(exportData, null, "\t");
                            // 2. 获取当前系统的桌面路径
                            const desktopPath = os_1.default.homedir() + '/Desktop';
                            // 3. 拼接完整的保存路径
                            const savePath = (0, path_1.join)(desktopPath, `Packs.json`);
                            // 4. 使用 Node.js 原生 fs 模块同步写入文件到桌面
                            (0, fs_extra_1.writeFileSync)(savePath, dataStr, 'utf-8');
                            // 5. 弹出成功提示
                            (0, exports.openDilog)('info', '提示', `配置已成功导出到桌面！\n文件名：${`Packs.json`}`);
                        }
                        catch (error) {
                            console.error('导出失败:', error);
                            (0, exports.openDilog)('error', '错误', '导出配置文件失败，请检查权限！');
                        }
                    },
                    onekeyOperateAutoPack(flag) {
                        for (let i = 0; i < this.taskList.length; i++) {
                            this.taskList[i].needAutoPack = flag;
                            if (!flag) {
                                this.taskList[i].upload = false;
                                this.taskList[i].skip = false;
                            }
                        }
                    },
                    onekeyOperateUpload(flag) {
                        for (let i = 0; i < this.taskList.length; i++) {
                            this.taskList[i].upload = flag;
                        }
                    },
                    onekeyOperateSkipPack(flag) {
                        for (let i = 0; i < this.taskList.length; i++) {
                            this.taskList[i].skip = flag;
                        }
                    },
                    getAutoCount() {
                        let count = 0;
                        for (let i = 0; i < this.taskList.length; i++) {
                            if (this.taskList[i].needAutoPack) {
                                count++;
                            }
                        }
                        return count;
                    },
                    getUploadCount() {
                        let count = 0;
                        for (let i = 0; i < this.taskList.length; i++) {
                            if (this.taskList[i].upload && this.taskList[i].needAutoPack) {
                                count++;
                            }
                        }
                        return count;
                    },
                    getPackCount() {
                        let count = 0;
                        for (let i = 0; i < this.taskList.length; i++) {
                            if (!this.taskList[i].skip && this.taskList[i].needAutoPack) {
                                count++;
                            }
                        }
                        return count;
                    },
                    openLogDir(path) {
                        if (!(0, fs_extra_1.existsSync)(path)) {
                            (0, exports.openDilog)('warn', 'warn', '日志文件夹不存在！');
                            return;
                        }
                        try {
                            (0, child_process_1.exec)(`start "" "${path}"`, (error) => {
                                if (error) {
                                    console.error('执行命令出错:', error);
                                    (0, exports.openDilog)('error', '错误', '无法打开目录，请检查路径或权限！');
                                }
                            });
                        }
                        catch (error) {
                            console.error('打开目录异常:', error);
                            (0, exports.openDilog)('error', '错误', '发生未知错误，无法打开目录！');
                        }
                    },
                    openToolLog() {
                        this.openLogDir((0, path_1.join)(__dirname, '../../../toolLog'));
                    },
                    taobaoLogin() {
                        (0, main_1.loginForTaobao)();
                    },
                    clickAutoPackToggle(item, flag) {
                        item.needAutoPack = flag;
                        if (!flag) {
                            item.upload = false;
                            item.skip = false;
                        }
                    }
                },
                template: (0, fs_extra_1.readFileSync)((0, path_1.join)(__dirname, '../../../static/template/vue/project.html'), 'utf-8'),
            }));
            app.mount(this.$.app);
            panelDataMap.set(this, app);
        }
    },
    beforeClose() {
    },
    close() {
        const app = panelDataMap.get(this);
        if (app) {
            modifyPackageJson();
            app.unmount();
        }
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zb3VyY2UvcGFuZWxzL2RlZmF1bHQvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLCtDQUErQzs7Ozs7O0FBRS9DLGlEQUE0RTtBQUM1RSx1Q0FBbUU7QUFDbkUsK0JBQTRCO0FBQzVCLDZCQUFzRDtBQUN0RCw0Q0FBb0I7QUFDcEIscUNBQThEO0FBQzlELE1BQU0sWUFBWSxHQUFHLElBQUksT0FBTyxFQUFZLENBQUM7QUFpQjdDLE1BQU0sU0FBUyxHQUFHLElBQUEsV0FBSSxFQUFDLFNBQVMsRUFBRSx3Q0FBd0MsQ0FBQyxDQUFDO0FBQzVFLElBQUksUUFBUSxHQUFrQixJQUFBLHFCQUFVLEVBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBQSx1QkFBWSxFQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0FBRTlHLE1BQU0saUJBQWlCLEdBQUcsR0FBRyxFQUFFO0lBQzNCLElBQUksSUFBSSxHQUFHLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxDQUFDO0lBQy9CLElBQUksT0FBTyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUMvQyxJQUFBLHdCQUFhLEVBQUMsSUFBQSxXQUFJLEVBQUMsU0FBUyxFQUFFLHdDQUF3QyxDQUFDLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBQy9GLENBQUMsQ0FBQztBQUVLLE1BQU0sU0FBUyxHQUFHLEtBQUssRUFBRSxJQUFZLEVBQUUsS0FBYSxFQUFFLE9BQWUsRUFBRSxNQUE4QixFQUFFLE1BQWUsRUFBRSxFQUFFO0lBQzdILElBQUksTUFBTSxHQUF1QztRQUM3QyxLQUFLO0tBQ1IsQ0FBQztJQUNGLElBQUksTUFBTSxFQUFFLENB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LEtBQUssQ0FBQzs0QkFDcEIsSUFBSSxDQUFDLElBQUksR0FBRyxLQUFLLENBQUM7d0JBQ3RCLENBQUM7b0JBQ0wsQ0FBQztpQkFDSjtnQkFDRCxRQUFRLEVBQUUsSUFBQSx1QkFBWSxFQUFDLElBQUEsV0FBSSxFQUFDLFNBQVMsRUFBRSwyQ0FBMkMsQ0FBQyxFQUFFLE9BQU8sQ0FBQzthQUNoRyxDQUFDLENBQUMsQ0FBQztZQUNKLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUN0QixZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNoQyxDQUFDO0lBQ0wsQ0FBQztJQUNELFdBQVc7SUFDWCxDQUFDO0lBQ0QsS0FBSztRQUNELE1BQU0sR0FBRyxHQUFHLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbkMsSUFBSSxHQUFHLEVBQUUsQ0FBQztZQUNOLGlCQUFpQixFQUFFLENBQUM7WUFFcEIsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2xCLENBQUM7SUFDTCxDQUFDO0NBQ0osQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgdnVlL29uZS1jb21wb25lbnQtcGVyLWZpbGUgKi9cclxuXHJcbmltcG9ydCB7IENoaWxkUHJvY2Vzc1dpdGhvdXROdWxsU3RyZWFtcywgc3Bhd24sIGV4ZWMgfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcclxuaW1wb3J0IHsgZXhpc3RzU3luYywgcmVhZEZpbGVTeW5jLCB3cml0ZUZpbGVTeW5jIH0gZnJvbSAnZnMtZXh0cmEnO1xyXG5pbXBvcnQgeyBqb2luIH0gZnJvbSAncGF0aCc7XHJcbmltcG9ydCB7IGNyZWF0ZUFwcCwgQXBwLCBkZWZpbmVDb21wb25lbnQgfSBmcm9tICd2dWUnO1xyXG5pbXBvcnQgb3MgZnJvbSAnb3MnO1xyXG5pbXBvcnQgeyBjaGVja1Rhb2Jhb0xvZ2luLCBsb2dpbkZvclRhb2JhbyB9IGZyb20gJy4uLy4uL21haW4nO1xyXG5jb25zdCBwYW5lbERhdGFNYXAgPSBuZXcgV2Vha01hcDxhbnksIEFwcD4oKTtcclxuLyoqXHJcbiAqIEB6aCDlpoLmnpzluIzmnJvlhbzlrrkgMy4zIOS5i+WJjeeahOeJiOacrOWPr+S7peS9v+eUqOS4i+aWueeahOS7o+eggVxyXG4gKiBAZW4gWW91IGNhbiBhZGQgdGhlIGNvZGUgYmVsb3cgaWYgeW91IHdhbnQgY29tcGF0aWJpbGl0eSB3aXRoIHZlcnNpb25zIHByaW9yIHRvIDMuM1xyXG4gKi9cclxuLy8gRWRpdG9yLlBhbmVsLmRlZmluZSA9IEVkaXRvci5QYW5lbC5kZWZpbmUgfHwgZnVuY3Rpb24ob3B0aW9uczogYW55KSB7IHJldHVybiBvcHRpb25zIH1cclxuXHJcbmludGVyZmFjZSBQYWNrUHJvamVjdCB7XHJcbiAgICBhcHBJZDogc3RyaW5nLFxyXG4gICAgbmFtZTogc3RyaW5nLFxyXG4gICAgcGF0aDogc3RyaW5nLC8vIENvY29z6aG555uu5qC555uu5b2VXHJcbiAgICBjaGFubmVsOiBzdHJpbmcsLy8g5oyH5a6a5omT5YyF5a+55bqU5rig6YGT5ZCN56ewXHJcbiAgICBza2lwPzogYm9vbGVhbiwvLyDmmK/lkKbot7Pov4djb2Nvc+aehOW7uuW3peeoi++8jOebtOaOpeS9v+eUqOWvvOWHuuW3peeoi1xyXG4gICAgdXBsb2FkPzogYm9vbGVhbi8vIOaYr+WQpumcgOimgeS4iuS8oFxyXG4gICAgbmVlZEF1dG9QYWNrPzogYm9vbGVhbi8vIOaYr+WQpumcgOimgei/m+ihjOiHquWKqOaehOW7uuS4iuS8oFxyXG59XHJcblxyXG5jb25zdCBwYWNrc1BhdGggPSBqb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uL3N0YXRpYy9wYWNrY29uZmlncy9QYWNrcy5qc29uJyk7XHJcbmxldCB0YXNrTGlzdDogUGFja1Byb2plY3RbXSA9IGV4aXN0c1N5bmMocGFja3NQYXRoKSA/IEpTT04ucGFyc2UocmVhZEZpbGVTeW5jKHBhY2tzUGF0aCwgJ3V0Zi04JykpLnBhY2tzIDogW107XHJcblxyXG5jb25zdCBtb2RpZnlQYWNrYWdlSnNvbiA9ICgpID0+IHtcclxuICAgIGxldCBkYXRhID0geyBwYWNrczogdGFza0xpc3QgfTtcclxuICAgIGxldCBkYXRhU3RyID0gSlNPTi5zdHJpbmdpZnkoZGF0YSwgbnVsbCwgXCJcXHRcIik7XHJcbiAgICB3cml0ZUZpbGVTeW5jKGpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vc3RhdGljL3BhY2tjb25maWdzL1BhY2tzLmpzb24nKSwgZGF0YVN0ciwgJ3V0Zi04Jyk7XHJcbn07XHJcblxyXG5leHBvcnQgY29uc3Qgb3BlbkRpbG9nID0gYXN5bmMgKHR5cGU6IHN0cmluZywgdGl0bGU6IHN0cmluZywgbWVzc2FnZTogc3RyaW5nLCBidG5NYXA/OiBNYXA8c3RyaW5nLCBGdW5jdGlvbj4sIGNhbmNlbD86IG51bWJlcikgPT4ge1xyXG4gICAgbGV0IG9wdGlvbjogRWRpdG9yLkRpYWxvZy5NZXNzYWdlRGlhbG9nT3B0aW9ucyA9IHtcclxuICAgICAgICB0aXRsZVxyXG4gICAgfTtcclxuICAgIGlmIChidG5NYXApIHtcclxuICAgICAgICBvcHRpb24uYnV0dG9ucyA9IFtdO1xyXG4gICAgICAgIGJ0bk1hcC5mb3JFYWNoKCh2YWx1ZSwga2V5KSA9PiB7XHJcbiAgICAgICAgICAgIG9wdGlvbi5idXR0b25zLnB1c2goa2V5KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGlmIChjYW5jZWwgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIG9wdGlvbi5jYW5jZWwgPSBjYW5jZWw7XHJcbiAgICB9XHJcbiAgICBsZXQgY29kZTogeyByZXNwb25zZTogMCwgY2hlY2tib3hDaGVja2VkOiBmYWxzZSB9ID0gYXdhaXQgRWRpdG9yLkRpYWxvZ1t0eXBlXShtZXNzYWdlLCBvcHRpb24pO1xyXG4gICAgaWYgKGJ0bk1hcCkge1xyXG4gICAgICAgIGxldCBrZXkgPSBvcHRpb24uYnV0dG9uc1tjb2RlLnJlc3BvbnNlXTtcclxuICAgICAgICBpZiAoYnRuTWFwLmhhcyhrZXkpKSB7XHJcbiAgICAgICAgICAgIGxldCBmdW5jID0gYnRuTWFwLmdldChrZXkpO1xyXG4gICAgICAgICAgICBpZiAoZnVuYykge1xyXG4gICAgICAgICAgICAgICAgZnVuYygpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEVkaXRvci5QYW5lbC5kZWZpbmUoe1xyXG4gICAgbGlzdGVuZXJzOiB7XHJcbiAgICAgICAgc2hvdygpIHsgY29uc29sZS5sb2coJ3Nob3cnKTsgfSxcclxuICAgICAgICBoaWRlKCkgeyBjb25zb2xlLmxvZygnaGlkZScpOyB9LFxyXG4gICAgfSxcclxuICAgIHRlbXBsYXRlOiByZWFkRmlsZVN5bmMoam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi9zdGF0aWMvdGVtcGxhdGUvZGVmYXVsdC9pbmRleC5odG1sJyksICd1dGYtOCcpLFxyXG4gICAgc3R5bGU6IHJlYWRGaWxlU3luYyhqb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uL3N0YXRpYy9zdHlsZS9kZWZhdWx0L2luZGV4LmNzcycpLCAndXRmLTgnKSxcclxuICAgICQ6IHtcclxuICAgICAgICBhcHA6ICcjYXBwJyxcclxuICAgIH0sXHJcbiAgICBtZXRob2RzOiB7XHJcblxyXG4gICAgfSxcclxuICAgIHJlYWR5KCkge1xyXG4gICAgICAgIGlmICh0aGlzLiQuYXBwKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGFwcCA9IGNyZWF0ZUFwcCh7fSk7XHJcbiAgICAgICAgICAgIGFwcC5jb25maWcuY29tcGlsZXJPcHRpb25zLmlzQ3VzdG9tRWxlbWVudCA9ICh0YWcpID0+IHRhZy5zdGFydHNXaXRoKCd1aS0nKTtcclxuXHJcbiAgICAgICAgICAgIGFwcC5jb21wb25lbnQoJ015UHJvamVjdCcsIGRlZmluZUNvbXBvbmVudCh7XHJcbiAgICAgICAgICAgICAgICBkYXRhKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhc2tMaXN0OiB0YXNrTGlzdCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXNBdXRvUGFjazogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzQ2hlY2tMb2dpbjogZmFsc2VcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIG1ldGhvZHM6IHtcclxuICAgICAgICAgICAgICAgICAgICBzdGFydEF1dG9QYWNrKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMudGFza0xpc3QgfHwgdGhpcy50YXNrTGlzdC5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBidG5NYXAgPSBuZXcgTWFwPHN0cmluZywgRnVuY3Rpb24+KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBidG5NYXAuc2V0KCdhZGQnLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGRQcm9qZWN0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ0bk1hcC5zZXQoJ2NhbmNlbCcsIG51bGwpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ3dhcm4nLCAn6K+35YWI5re75Yqg6Ieq5Yqo5YyW6aG555uu6YWN572u77yBJywgYnRuTWFwKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCB0YXNrIG9mIHRoaXMudGFza0xpc3QpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGFzay5wYXRoIHx8ICF0YXNrLmNoYW5uZWwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgc3RyID0gJyc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0YXNrLmFwcElkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0ciArPSAn5pyq6YWN572uYXBwSWQgJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0YXNrLnBhdGgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RyICs9ICfmnKrphY3nva7pobnnm67ot6/lvoQgJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0YXNrLmNoYW5uZWwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RyICs9ICfmnKrphY3nva7muKDpgZMgJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ3dhcm4nLCBgYXBwSWQ6JHt0YXNrLmFwcElkfSR7dGFzay5uYW1lfSR7c3Ryfeivt+ajgOafpemFjee9ru+8gWApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5nZXRBdXRvQ291bnQoKSA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ3dhcm4nLCAn5peg6Ieq5Yqo5YyW6aG555uuIScpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmlzQXV0b1BhY2spIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnd2FybicsICd3YXJuJywgJ+ato+WcqOiHquWKqOWMlu+8jOivt+eojeWQjuWGjeivlSEnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY2hlY2tUYW9iYW8gPSAoZnVuYzogRnVuY3Rpb24pID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjaGVjayA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgdGFzayBvZiB0aGlzLnRhc2tMaXN0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRhc2suY2hhbm5lbCA9PT0gJ3Rhb2Jhby1taW5pLWdhbWUnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoZWNrID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNoZWNrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pc0NoZWNrTG9naW4gPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoZWNrVGFvYmFvTG9naW4oXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaXNDaGVja0xvZ2luID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jICYmIGZ1bmMoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pc0NoZWNrTG9naW4gPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnd2FybicsICd3YXJuJywgJ+a3mOWuneeZu+W9leaAgei/h+acn++8jOivt+mHjeaWsOeZu+W9lSEnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jICYmIGZ1bmMoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYXV0b1BhY2sgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ2luZm8nLCAnc3RhcnQnLCAn5byA5aeL6Ieq5Yqo5YyWJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmlzQXV0b1BhY2sgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbW9kaWZ5UGFja2FnZUpzb24oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBkYXRhID0geyBwYWNrczogdGhpcy50YXNrTGlzdCB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGRhdGFTdHIgPSBKU09OLnN0cmluZ2lmeShkYXRhKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWwhiBKU09OIOWtl+espuS4sui9rOS4uiBCYXNlNjQg57yW56CBIOmBv+WFjeWPjOW8leWPt+WcqOWRveS7pOihjOS4reiiq+WQg+aOiVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGJhc2U2NFN0ciA9IEJ1ZmZlci5mcm9tKGRhdGFTdHIpLnRvU3RyaW5nKCdiYXNlNjQnKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgcGF0aCA9IGpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vc3RhdGljL2F1dG8tcGFjay9idWlsZC9hcHAuanMnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhcmdzID0gW3BhdGgsICctLXBhY2tzJywgYmFzZTY0U3RyXTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgc3A6IENoaWxkUHJvY2Vzc1dpdGhvdXROdWxsU3RyZWFtcyA9IHNwYXduKFwibm9kZVwiLCBhcmdzLCB7IHNoZWxsOiB0cnVlIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3Auc3Rkb3V0LnNldEVuY29kaW5nKCd1dGY4Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzcC5zdGRvdXQub24oJ2RhdGEnLCAoZGF0YSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBhdXRvUGFjayBzdGRvdXQgJHtkYXRhLnRvU3RyaW5nKCl9YCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNwLnN0ZGVyci5vbignZGF0YScsIChkYXRhKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYGF1dG9QYWNrIHN0ZGVyciAke2RhdGEudG9TdHJpbmcoKX1gKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzcC5vbignZXhpdCcsIChjb2RlLCBkYXRhKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvZGUgPT09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYGF1dG9QYWNrIGV4aXQgc3VzY2VzcyAke2RhdGF9YCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnaW5mbycsICflrozmiJAnLCAn6Ieq5Yqo5YyW5a6M5oiQIScpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYGF1dG9QYWNrIGV4aXQgZmFpbCAke2RhdGF9YCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnZXJyb3InLCAn5aSx6LSlJywgJ+iHquWKqOWMluWksei0pSEnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pc0F1dG9QYWNrID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbXNnID0gJyc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCB1cGxvYWRDb3VudCA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwYWNrQ291bnQgPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgYXV0b0NvdW50ID0gMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgdGFzayBvZiB0aGlzLnRhc2tMaXN0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGFzay5uZWVkQXV0b1BhY2spIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdXRvQ291bnQrKztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGFzay51cGxvYWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXBsb2FkQ291bnQrKztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0YXNrLnNraXApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFja0NvdW50Kys7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zZyArPSBgJHt0YXNrLmFwcElkfe+8miR7dGFzay5uYW1lfe+8jOaehOW7uu+8miR7KHRhc2suc2tpcCA/ICfinJUnIDogJ+Kckycpfe+8jOS4iuS8oO+8miR7KHRhc2sudXBsb2FkID8gJ+KckycgOiAn4pyVJyl9XFxuYDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtc2cgKz0gYOiHquWKqOWMlu+8miR7YXV0b0NvdW50feS4qu+8jOaehOW7uu+8miR7cGFja0NvdW50feS4qu+8jOS4iuS8oO+8miR7dXBsb2FkQ291bnR95LiqXFxuYDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGJ0bk1hcCA9IG5ldyBNYXA8c3RyaW5nLCBGdW5jdGlvbj4oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnRuTWFwLnNldCgnb2snLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGVja1Rhb2JhbygoKSA9PiB7IGF1dG9QYWNrKCk7IH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ3dhcm4nLCBgJHttc2d95byA5aeL6Ieq5Yqo5YyWP2AsIGJ0bk1hcCwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBhZGRQcm9qZWN0KCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhc2tMaXN0LnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBwSWQ6ICcnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogJycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiAnJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoYW5uZWw6ICd0YW9iYW8tbWluaS1nYW1lJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVwbG9hZDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBza2lwOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5lZWRBdXRvUGFjazogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ2luZm8nLCAnYWRkJywgJ+a3u+WKoOaIkOWKnycpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgZGVsUHJvamVjdChpdGVtOiBQYWNrUHJvamVjdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgYnRuTWFwID0gbmV3IE1hcDxzdHJpbmcsIEZ1bmN0aW9uPigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBidG5NYXAuc2V0KCdkZWxldGUnLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudGFza0xpc3QubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgdGFzayA9IHRoaXMudGFza0xpc3RbaV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRhc2suYXBwSWQgPT09IGl0ZW0uYXBwSWQgJiYgdGFzay5uYW1lID09PSBpdGVtLm5hbWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YXNrTGlzdC5zcGxpY2UoaSwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnd2FybicsICdkZWxldGUnLCAn5piv5ZCm5Yig6Zmk6YWN572uPycsIGJ0bk1hcCwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBpbXBvcnRQYWNrc0NvbmZpZygpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaW1wb3J0RnVuYyA9ICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIDEuIOWKqOaAgeWIm+W7uuS4gOS4qumakOiXj+eahCBpbnB1dCDmoIfnrb5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlucHV0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW5wdXQnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0LnR5cGUgPSAnZmlsZSc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDpmZDliLblj6rog73pgInmi6kganNvbiDmlofku7bvvIzlpoLmnpzlr7zlhaUgRXhjZWwg5Y+v5Lul5pS55Li6ICcueGxzeCwgLnhscydcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0LmFjY2VwdCA9ICcuanNvbic7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnB1dC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIDIuIOebkeWQrOaWh+S7tumAieaLqeeahOWPmOWMllxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXQub25jaGFuZ2UgPSAoZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbGUgPSAoZS50YXJnZXQgYXMgSFRNTElucHV0RWxlbWVudCkuZmlsZXM/LlswXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWZpbGUpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gMy4g5L2/55SoIEZpbGVSZWFkZXIg6K+75Y+W5paH5Lu25YaF5a65XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWFkZXIub25sb2FkID0gKGV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDojrflj5bmlofku7bph4znmoTmlofmnKzlhoXlrrnlubbop6PmnpDkuLogSlNPTlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gZXZlbnQudGFyZ2V0Py5yZXN1bHQgYXMgc3RyaW5nO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaW1wb3J0ZWREYXRhID0gSlNPTi5wYXJzZShyZXN1bHQpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWBh+iuvuWvvOWFpeeahCBKU09OIOagvOW8j+S5n+aYryB7IHBhY2tzOiBbLi4uXSB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW1wb3J0ZWREYXRhLnBhY2tzICYmIEFycmF5LmlzQXJyYXkoaW1wb3J0ZWREYXRhLnBhY2tzKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWwhuWvvOWFpeeahOaVsOaNruabv+aNouWIsOW9k+WJjeeahCB0YXNrTGlzdCDkuK1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhc2tMaXN0ID0gaW1wb3J0ZWREYXRhLnBhY2tzO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhc2tMaXN0ID0gdGhpcy50YXNrTGlzdDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gNC4g6Kem5Y+R5L+d5a2Y77yM5bCG5paw5pWw5o2u5YaZ5YWl5pys5ZywIFBhY2tzLmpzb25cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtb2RpZnlQYWNrYWdlSnNvbigpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDlpoLmnpzmnIkgRWRpdG9yLkRpYWxvZ++8jOWPr+S7peW8ueS4quaIkOWKn+aPkOekulxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnaW5mbycsICfmj5DnpLonLCAn5a+85YWl5oiQ5Yqf77yBJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnd2FybicsICforablkYonLCAn5a+85YWl55qE5paH5Lu25qC85byP5LiN5q2j56Gu77yBJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnZXJyb3InLCAn6ZSZ6K+vJywgJ+aWh+S7tuino+aekOWksei0pe+8jOivt+ajgOafpeaWh+S7tuagvOW8j++8gScpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyA1LiDmuIXnkIbvvJrlsIbkuLTml7bliJvlu7rnmoQgaW5wdXQg5qCH562+5LuO6aG16Z2i5Lit56e76ZmkXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQoaW5wdXQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVhZGVyLnJlYWRBc1RleHQoZmlsZSk7IC8vIOS7peaWh+acrOW9ouW8j+ivu+WPluaWh+S7tlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyA2LiDlsIYgaW5wdXQg5oyC6L295Yiw6aG16Z2i5bm26Kem5Y+R54K55Ye777yM5by55Ye65paH5Lu26YCJ5oup5qGGXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGlucHV0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0LmNsaWNrKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIOivtOaYjumdmeaAgeaWh+S7tuS4reaciSBQYWNrcy5qc29u5LqG77yM6K+i6Zeu5piv5ZCm5pu/5o2iXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnRhc2tMaXN0ICYmIHRoaXMudGFza0xpc3QubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGJ0bk1hcCA9IG5ldyBNYXA8c3RyaW5nLCBGdW5jdGlvbj4oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ0bk1hcC5zZXQoJ3JlcGxhY2UnLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW1wb3J0RnVuYygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBidG5NYXAuc2V0KCdjYW5jZWwnLCBudWxsKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnd2FybicsICdyZXBsYWNlJywgJ1BhY2tzLmpzb24g5bey5a2Y5Zyo77yM5piv5ZCm5pu/5o2iPycsIGJ0bk1hcCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbXBvcnRGdW5jKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGV4cG9ydFBhY2tzQ29uZmlnKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDor7TmmI7msqHmnInphY3nva5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLnRhc2tMaXN0IHx8IHRoaXMudGFza0xpc3QubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAn6K2m5ZGKJywgJ+ayoeaciemFjee9ru+8jOaXoOazleWvvOWHuicpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAxLiDnu4Too4XpnIDopoHlr7zlh7rnmoTmlbDmja5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGV4cG9ydERhdGEgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFja3M6IHRoaXMudGFza0xpc3RcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRhU3RyID0gSlNPTi5zdHJpbmdpZnkoZXhwb3J0RGF0YSwgbnVsbCwgXCJcXHRcIik7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gMi4g6I635Y+W5b2T5YmN57O757uf55qE5qGM6Z2i6Lev5b6EXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkZXNrdG9wUGF0aCA9IG9zLmhvbWVkaXIoKSArICcvRGVza3RvcCc7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gMy4g5ou85o6l5a6M5pW055qE5L+d5a2Y6Lev5b6EXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzYXZlUGF0aCA9IGpvaW4oZGVza3RvcFBhdGgsIGBQYWNrcy5qc29uYCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gNC4g5L2/55SoIE5vZGUuanMg5Y6f55SfIGZzIOaooeWdl+WQjOatpeWGmeWFpeaWh+S7tuWIsOahjOmdolxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd3JpdGVGaWxlU3luYyhzYXZlUGF0aCwgZGF0YVN0ciwgJ3V0Zi04Jyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gNS4g5by55Ye65oiQ5Yqf5o+Q56S6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ2luZm8nLCAn5o+Q56S6JywgYOmFjee9ruW3suaIkOWKn+WvvOWHuuWIsOahjOmdou+8gVxcbuaWh+S7tuWQje+8miR7YFBhY2tzLmpzb25gfWApO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+WvvOWHuuWksei0pTonLCBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ2Vycm9yJywgJ+mUmeivrycsICflr7zlh7rphY3nva7mlofku7blpLHotKXvvIzor7fmo4Dmn6XmnYPpmZDvvIEnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgb25la2V5T3BlcmF0ZUF1dG9QYWNrKGZsYWc6IGJvb2xlYW4pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRhc2tMaXN0Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhc2tMaXN0W2ldLm5lZWRBdXRvUGFjayA9IGZsYWc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWZsYWcpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhc2tMaXN0W2ldLnVwbG9hZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGFza0xpc3RbaV0uc2tpcCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBvbmVrZXlPcGVyYXRlVXBsb2FkKGZsYWc6IGJvb2xlYW4pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRhc2tMaXN0Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhc2tMaXN0W2ldLnVwbG9hZCA9IGZsYWc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIG9uZWtleU9wZXJhdGVTa2lwUGFjayhmbGFnOiBib29sZWFuKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy50YXNrTGlzdC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YXNrTGlzdFtpXS5za2lwID0gZmxhZztcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgZ2V0QXV0b0NvdW50KCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgY291bnQgPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudGFza0xpc3QubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnRhc2tMaXN0W2ldLm5lZWRBdXRvUGFjaykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50Kys7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNvdW50O1xyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgZ2V0VXBsb2FkQ291bnQoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjb3VudCA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy50YXNrTGlzdC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudGFza0xpc3RbaV0udXBsb2FkICYmIHRoaXMudGFza0xpc3RbaV0ubmVlZEF1dG9QYWNrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY291bnQrKztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY291bnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBnZXRQYWNrQ291bnQoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjb3VudCA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy50YXNrTGlzdC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLnRhc2tMaXN0W2ldLnNraXAgJiYgdGhpcy50YXNrTGlzdFtpXS5uZWVkQXV0b1BhY2spIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb3VudCsrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjb3VudDtcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIG9wZW5Mb2dEaXIocGF0aDogc3RyaW5nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZXhpc3RzU3luYyhwYXRoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ3dhcm4nLCAn5pel5b+X5paH5Lu25aS55LiN5a2Y5Zyo77yBJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4ZWMoYHN0YXJ0IFwiXCIgXCIke3BhdGh9XCJgLCAoZXJyb3IpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcign5omn6KGM5ZG95Luk5Ye66ZSZOicsIGVycm9yKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCdlcnJvcicsICfplJnor68nLCAn5peg5rOV5omT5byA55uu5b2V77yM6K+35qOA5p+l6Lev5b6E5oiW5p2D6ZmQ77yBJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCfmiZPlvIDnm67lvZXlvILluLg6JywgZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCdlcnJvcicsICfplJnor68nLCAn5Y+R55Sf5pyq55+l6ZSZ6K+v77yM5peg5rOV5omT5byA55uu5b2V77yBJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIG9wZW5Ub29sTG9nKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm9wZW5Mb2dEaXIoam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi90b29sTG9nJykpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgdGFvYmFvTG9naW4oKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2luRm9yVGFvYmFvKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBjbGlja0F1dG9QYWNrVG9nZ2xlKGl0ZW06IFBhY2tQcm9qZWN0LCBmbGFnOiBib29sZWFuKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0ubmVlZEF1dG9QYWNrID0gZmxhZztcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFmbGFnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtLnVwbG9hZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS5za2lwID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgdGVtcGxhdGU6IHJlYWRGaWxlU3luYyhqb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uL3N0YXRpYy90ZW1wbGF0ZS92dWUvcHJvamVjdC5odG1sJyksICd1dGYtOCcpLFxyXG4gICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgICAgIGFwcC5tb3VudCh0aGlzLiQuYXBwKTtcclxuICAgICAgICAgICAgcGFuZWxEYXRhTWFwLnNldCh0aGlzLCBhcHApO1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcbiAgICBiZWZvcmVDbG9zZSgpIHtcclxuICAgIH0sXHJcbiAgICBjbG9zZSgpIHtcclxuICAgICAgICBjb25zdCBhcHAgPSBwYW5lbERhdGFNYXAuZ2V0KHRoaXMpO1xyXG4gICAgICAgIGlmIChhcHApIHtcclxuICAgICAgICAgICAgbW9kaWZ5UGFja2FnZUpzb24oKTtcclxuXHJcbiAgICAgICAgICAgIGFwcC51bm1vdW50KCk7XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxufSk7XHJcbiJdfQ==