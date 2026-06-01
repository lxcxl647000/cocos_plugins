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
                        isAutoPack: false
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
                                this.isAutoPack = true;
                                (0, main_1.checkTaobaoLogin)(() => {
                                    this.isAutoPack = false;
                                    func && func();
                                }, () => {
                                    this.isAutoPack = false;
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
                            this.taskList = this.taskList.filter((task) => task.appId !== item.appId);
                            taskList = this.taskList;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zb3VyY2UvcGFuZWxzL2RlZmF1bHQvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLCtDQUErQzs7Ozs7O0FBRS9DLGlEQUE0RTtBQUM1RSx1Q0FBbUU7QUFDbkUsK0JBQTRCO0FBQzVCLDZCQUFzRDtBQUN0RCw0Q0FBb0I7QUFDcEIscUNBQThEO0FBQzlELE1BQU0sWUFBWSxHQUFHLElBQUksT0FBTyxFQUFZLENBQUM7QUFpQjdDLE1BQU0sU0FBUyxHQUFHLElBQUEsV0FBSSxFQUFDLFNBQVMsRUFBRSx3Q0FBd0MsQ0FBQyxDQUFDO0FBQzVFLElBQUksUUFBUSxHQUFrQixJQUFBLHFCQUFVLEVBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBQSx1QkFBWSxFQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0FBRTlHLE1BQU0saUJBQWlCLEdBQUcsR0FBRyxFQUFFO0lBQzNCLElBQUksSUFBSSxHQUFHLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxDQUFDO0lBQy9CLElBQUksT0FBTyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUMvQyxJQUFBLHdCQUFhLEVBQUMsSUFBQSxXQUFJLEVBQUMsU0FBUyxFQUFFLHdDQUF3QyxDQUFDLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBQy9GLENBQUMsQ0FBQztBQUVLLE1BQU0sU0FBUyxHQUFHLEtBQUssRUFBRSxJQUFZLEVBQUUsS0FBYSxFQUFFLE9BQWUsRUFBRSxNQUE4QixFQUFFLE1BQWUsRUFBRSxFQUFFO0lBQzdILElBQUksTUFBTSxHQUF1QztRQUM3QyxLQUFLO0tBQ1IsQ0FBQztJQUNGLElBQUksTUFBTSxFQUFFLENB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QUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDdEIsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDaEMsQ0FBQztJQUNMLENBQUM7SUFDRCxXQUFXO0lBQ1gsQ0FBQztJQUNELEtBQUs7UUFDRCxNQUFNLEdBQUcsR0FBRyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ25DLElBQUksR0FBRyxFQUFFLENBQUM7WUFDTixpQkFBaUIsRUFBRSxDQUFDO1lBRXBCLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNsQixDQUFDO0lBQ0wsQ0FBQztDQUNKLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIHZ1ZS9vbmUtY29tcG9uZW50LXBlci1maWxlICovXHJcblxyXG5pbXBvcnQgeyBDaGlsZFByb2Nlc3NXaXRob3V0TnVsbFN0cmVhbXMsIHNwYXduLCBleGVjIH0gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XHJcbmltcG9ydCB7IGV4aXN0c1N5bmMsIHJlYWRGaWxlU3luYywgd3JpdGVGaWxlU3luYyB9IGZyb20gJ2ZzLWV4dHJhJztcclxuaW1wb3J0IHsgam9pbiB9IGZyb20gJ3BhdGgnO1xyXG5pbXBvcnQgeyBjcmVhdGVBcHAsIEFwcCwgZGVmaW5lQ29tcG9uZW50IH0gZnJvbSAndnVlJztcclxuaW1wb3J0IG9zIGZyb20gJ29zJztcclxuaW1wb3J0IHsgY2hlY2tUYW9iYW9Mb2dpbiwgbG9naW5Gb3JUYW9iYW8gfSBmcm9tICcuLi8uLi9tYWluJztcclxuY29uc3QgcGFuZWxEYXRhTWFwID0gbmV3IFdlYWtNYXA8YW55LCBBcHA+KCk7XHJcbi8qKlxyXG4gKiBAemgg5aaC5p6c5biM5pyb5YW85a65IDMuMyDkuYvliY3nmoTniYjmnKzlj6/ku6Xkvb/nlKjkuIvmlrnnmoTku6PnoIFcclxuICogQGVuIFlvdSBjYW4gYWRkIHRoZSBjb2RlIGJlbG93IGlmIHlvdSB3YW50IGNvbXBhdGliaWxpdHkgd2l0aCB2ZXJzaW9ucyBwcmlvciB0byAzLjNcclxuICovXHJcbi8vIEVkaXRvci5QYW5lbC5kZWZpbmUgPSBFZGl0b3IuUGFuZWwuZGVmaW5lIHx8IGZ1bmN0aW9uKG9wdGlvbnM6IGFueSkgeyByZXR1cm4gb3B0aW9ucyB9XHJcblxyXG5pbnRlcmZhY2UgUGFja1Byb2plY3Qge1xyXG4gICAgYXBwSWQ6IHN0cmluZyxcclxuICAgIG5hbWU6IHN0cmluZyxcclxuICAgIHBhdGg6IHN0cmluZywvLyBDb2Nvc+mhueebruagueebruW9lVxyXG4gICAgY2hhbm5lbDogc3RyaW5nLC8vIOaMh+WumuaJk+WMheWvueW6lOa4oOmBk+WQjeensFxyXG4gICAgc2tpcD86IGJvb2xlYW4sLy8g5piv5ZCm6Lez6L+HY29jb3PmnoTlu7rlt6XnqIvvvIznm7TmjqXkvb/nlKjlr7zlh7rlt6XnqItcclxuICAgIHVwbG9hZD86IGJvb2xlYW4vLyDmmK/lkKbpnIDopoHkuIrkvKBcclxuICAgIG5lZWRBdXRvUGFjaz86IGJvb2xlYW4vLyDmmK/lkKbpnIDopoHov5vooYzoh6rliqjmnoTlu7rkuIrkvKBcclxufVxyXG5cclxuY29uc3QgcGFja3NQYXRoID0gam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi9zdGF0aWMvcGFja2NvbmZpZ3MvUGFja3MuanNvbicpO1xyXG5sZXQgdGFza0xpc3Q6IFBhY2tQcm9qZWN0W10gPSBleGlzdHNTeW5jKHBhY2tzUGF0aCkgPyBKU09OLnBhcnNlKHJlYWRGaWxlU3luYyhwYWNrc1BhdGgsICd1dGYtOCcpKS5wYWNrcyA6IFtdO1xyXG5cclxuY29uc3QgbW9kaWZ5UGFja2FnZUpzb24gPSAoKSA9PiB7XHJcbiAgICBsZXQgZGF0YSA9IHsgcGFja3M6IHRhc2tMaXN0IH07XHJcbiAgICBsZXQgZGF0YVN0ciA9IEpTT04uc3RyaW5naWZ5KGRhdGEsIG51bGwsIFwiXFx0XCIpO1xyXG4gICAgd3JpdGVGaWxlU3luYyhqb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uL3N0YXRpYy9wYWNrY29uZmlncy9QYWNrcy5qc29uJyksIGRhdGFTdHIsICd1dGYtOCcpO1xyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IG9wZW5EaWxvZyA9IGFzeW5jICh0eXBlOiBzdHJpbmcsIHRpdGxlOiBzdHJpbmcsIG1lc3NhZ2U6IHN0cmluZywgYnRuTWFwPzogTWFwPHN0cmluZywgRnVuY3Rpb24+LCBjYW5jZWw/OiBudW1iZXIpID0+IHtcclxuICAgIGxldCBvcHRpb246IEVkaXRvci5EaWFsb2cuTWVzc2FnZURpYWxvZ09wdGlvbnMgPSB7XHJcbiAgICAgICAgdGl0bGVcclxuICAgIH07XHJcbiAgICBpZiAoYnRuTWFwKSB7XHJcbiAgICAgICAgb3B0aW9uLmJ1dHRvbnMgPSBbXTtcclxuICAgICAgICBidG5NYXAuZm9yRWFjaCgodmFsdWUsIGtleSkgPT4ge1xyXG4gICAgICAgICAgICBvcHRpb24uYnV0dG9ucy5wdXNoKGtleSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBpZiAoY2FuY2VsICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICBvcHRpb24uY2FuY2VsID0gY2FuY2VsO1xyXG4gICAgfVxyXG4gICAgbGV0IGNvZGU6IHsgcmVzcG9uc2U6IDAsIGNoZWNrYm94Q2hlY2tlZDogZmFsc2UgfSA9IGF3YWl0IEVkaXRvci5EaWFsb2dbdHlwZV0obWVzc2FnZSwgb3B0aW9uKTtcclxuICAgIGlmIChidG5NYXApIHtcclxuICAgICAgICBsZXQga2V5ID0gb3B0aW9uLmJ1dHRvbnNbY29kZS5yZXNwb25zZV07XHJcbiAgICAgICAgaWYgKGJ0bk1hcC5oYXMoa2V5KSkge1xyXG4gICAgICAgICAgICBsZXQgZnVuYyA9IGJ0bk1hcC5nZXQoa2V5KTtcclxuICAgICAgICAgICAgaWYgKGZ1bmMpIHtcclxuICAgICAgICAgICAgICAgIGZ1bmMoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBFZGl0b3IuUGFuZWwuZGVmaW5lKHtcclxuICAgIGxpc3RlbmVyczoge1xyXG4gICAgICAgIHNob3coKSB7IGNvbnNvbGUubG9nKCdzaG93Jyk7IH0sXHJcbiAgICAgICAgaGlkZSgpIHsgY29uc29sZS5sb2coJ2hpZGUnKTsgfSxcclxuICAgIH0sXHJcbiAgICB0ZW1wbGF0ZTogcmVhZEZpbGVTeW5jKGpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vc3RhdGljL3RlbXBsYXRlL2RlZmF1bHQvaW5kZXguaHRtbCcpLCAndXRmLTgnKSxcclxuICAgIHN0eWxlOiByZWFkRmlsZVN5bmMoam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi9zdGF0aWMvc3R5bGUvZGVmYXVsdC9pbmRleC5jc3MnKSwgJ3V0Zi04JyksXHJcbiAgICAkOiB7XHJcbiAgICAgICAgYXBwOiAnI2FwcCcsXHJcbiAgICB9LFxyXG4gICAgbWV0aG9kczoge1xyXG5cclxuICAgIH0sXHJcbiAgICByZWFkeSgpIHtcclxuICAgICAgICBpZiAodGhpcy4kLmFwcCkge1xyXG4gICAgICAgICAgICBjb25zdCBhcHAgPSBjcmVhdGVBcHAoe30pO1xyXG4gICAgICAgICAgICBhcHAuY29uZmlnLmNvbXBpbGVyT3B0aW9ucy5pc0N1c3RvbUVsZW1lbnQgPSAodGFnKSA9PiB0YWcuc3RhcnRzV2l0aCgndWktJyk7XHJcblxyXG4gICAgICAgICAgICBhcHAuY29tcG9uZW50KCdNeVByb2plY3QnLCBkZWZpbmVDb21wb25lbnQoe1xyXG4gICAgICAgICAgICAgICAgZGF0YSgpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0YXNrTGlzdDogdGFza0xpc3QsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzQXV0b1BhY2s6IGZhbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBtZXRob2RzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3RhcnRBdXRvUGFjaygpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLnRhc2tMaXN0IHx8IHRoaXMudGFza0xpc3QubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgYnRuTWFwID0gbmV3IE1hcDxzdHJpbmcsIEZ1bmN0aW9uPigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnRuTWFwLnNldCgnYWRkJywgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkUHJvamVjdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBidG5NYXAuc2V0KCdjYW5jZWwnLCBudWxsKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnd2FybicsICd3YXJuJywgJ+ivt+WFiOa3u+WKoOiHquWKqOWMlumhueebrumFjee9ru+8gScsIGJ0bk1hcCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgdGFzayBvZiB0aGlzLnRhc2tMaXN0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRhc2sucGF0aCB8fCAhdGFzay5jaGFubmVsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHN0ciA9ICcnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGFzay5hcHBJZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gJ+acqumFjee9rmFwcElkICc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGFzay5wYXRoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0ciArPSAn5pyq6YWN572u6aG555uu6Lev5b6EICc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGFzay5jaGFubmVsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0ciArPSAn5pyq6YWN572u5rig6YGTICc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnd2FybicsICd3YXJuJywgYGFwcElkOiR7dGFzay5hcHBJZH0ke3Rhc2submFtZX0ke3N0cn3or7fmo4Dmn6XphY3nva7vvIFgKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuZ2V0QXV0b0NvdW50KCkgPT09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnd2FybicsICd3YXJuJywgJ+aXoOiHquWKqOWMlumhueebriEnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5pc0F1dG9QYWNrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAnd2FybicsICfmraPlnKjoh6rliqjljJbvvIzor7fnqI3lkI7lho3or5UhJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNoZWNrVGFvYmFvID0gKGZ1bmM6IEZ1bmN0aW9uKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgY2hlY2sgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IHRhc2sgb2YgdGhpcy50YXNrTGlzdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0YXNrLmNoYW5uZWwgPT09ICd0YW9iYW8tbWluaS1nYW1lJykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGVjayA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjaGVjaykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaXNBdXRvUGFjayA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hlY2tUYW9iYW9Mb2dpbihcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pc0F1dG9QYWNrID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jICYmIGZ1bmMoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pc0F1dG9QYWNrID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAnd2FybicsICfmt5jlrp3nmbvlvZXmgIHov4fmnJ/vvIzor7fph43mlrDnmbvlvZUhJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnVuYyAmJiBmdW5jKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGF1dG9QYWNrID0gKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCdpbmZvJywgJ3N0YXJ0JywgJ+W8gOWni+iHquWKqOWMlicpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pc0F1dG9QYWNrID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1vZGlmeVBhY2thZ2VKc29uKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgZGF0YSA9IHsgcGFja3M6IHRoaXMudGFza0xpc3QgfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBkYXRhU3RyID0gSlNPTi5zdHJpbmdpZnkoZGF0YSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDlsIYgSlNPTiDlrZfnrKbkuLLovazkuLogQmFzZTY0IOe8lueggSDpgb/lhY3lj4zlvJXlj7flnKjlkb3ku6TooYzkuK3ooqvlkIPmjolcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBiYXNlNjRTdHIgPSBCdWZmZXIuZnJvbShkYXRhU3RyKS50b1N0cmluZygnYmFzZTY0Jyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHBhdGggPSBqb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uL3N0YXRpYy9hdXRvLXBhY2svYnVpbGQvYXBwLmpzJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgYXJncyA9IFtwYXRoLCAnLS1wYWNrcycsIGJhc2U2NFN0cl07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHNwOiBDaGlsZFByb2Nlc3NXaXRob3V0TnVsbFN0cmVhbXMgPSBzcGF3bihcIm5vZGVcIiwgYXJncywgeyBzaGVsbDogdHJ1ZSB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNwLnN0ZG91dC5zZXRFbmNvZGluZygndXRmOCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3Auc3Rkb3V0Lm9uKCdkYXRhJywgKGRhdGEpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgYXV0b1BhY2sgc3Rkb3V0ICR7ZGF0YS50b1N0cmluZygpfWApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzcC5zdGRlcnIub24oJ2RhdGEnLCAoZGF0YSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBhdXRvUGFjayBzdGRlcnIgJHtkYXRhLnRvU3RyaW5nKCl9YCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3Aub24oJ2V4aXQnLCAoY29kZSwgZGF0YSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb2RlID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBhdXRvUGFjayBleGl0IHN1c2Nlc3MgJHtkYXRhfWApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ2luZm8nLCAn5a6M5oiQJywgJ+iHquWKqOWMluWujOaIkCEnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBhdXRvUGFjayBleGl0IGZhaWwgJHtkYXRhfWApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ2Vycm9yJywgJ+Wksei0pScsICfoh6rliqjljJblpLHotKUhJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaXNBdXRvUGFjayA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG1zZyA9ICcnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgdXBsb2FkQ291bnQgPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgcGFja0NvdW50ID0gMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGF1dG9Db3VudCA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IHRhc2sgb2YgdGhpcy50YXNrTGlzdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRhc2submVlZEF1dG9QYWNrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXV0b0NvdW50Kys7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRhc2sudXBsb2FkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVwbG9hZENvdW50Kys7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGFzay5za2lwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhY2tDb3VudCsrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtc2cgKz0gYCR7dGFzay5hcHBJZH3vvJoke3Rhc2submFtZX3vvIzmnoTlu7rvvJokeyh0YXNrLnNraXAgPyAn4pyVJyA6ICfinJMnKX3vvIzkuIrkvKDvvJokeyh0YXNrLnVwbG9hZCA/ICfinJMnIDogJ+KclScpfVxcbmA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgbXNnICs9IGDoh6rliqjljJbvvJoke2F1dG9Db3VudH3kuKrvvIzmnoTlu7rvvJoke3BhY2tDb3VudH3kuKrvvIzkuIrkvKDvvJoke3VwbG9hZENvdW50feS4qlxcbmA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBidG5NYXAgPSBuZXcgTWFwPHN0cmluZywgRnVuY3Rpb24+KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ0bk1hcC5zZXQoJ29rJywgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hlY2tUYW9iYW8oKCkgPT4geyBhdXRvUGFjaygpOyB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnd2FybicsICd3YXJuJywgYCR7bXNnfeW8gOWni+iHquWKqOWMlj9gLCBidG5NYXAsIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgYWRkUHJvamVjdCgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YXNrTGlzdC5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwcElkOiAnJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6ICcnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDogJycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGFubmVsOiAndGFvYmFvLW1pbmktZ2FtZScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cGxvYWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2tpcDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZWVkQXV0b1BhY2s6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCdpbmZvJywgJ2FkZCcsICfmt7vliqDmiJDlip8nKTtcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGRlbFByb2plY3QoaXRlbTogUGFja1Byb2plY3QpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGJ0bk1hcCA9IG5ldyBNYXA8c3RyaW5nLCBGdW5jdGlvbj4oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnRuTWFwLnNldCgnZGVsZXRlJywgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YXNrTGlzdCA9IHRoaXMudGFza0xpc3QuZmlsdGVyKCh0YXNrOiBQYWNrUHJvamVjdCkgPT4gdGFzay5hcHBJZCAhPT0gaXRlbS5hcHBJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXNrTGlzdCA9IHRoaXMudGFza0xpc3Q7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAnZGVsZXRlJywgJ+aYr+WQpuWIoOmZpOmFjee9rj8nLCBidG5NYXAsIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgaW1wb3J0UGFja3NDb25maWcoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGltcG9ydEZ1bmMgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAxLiDliqjmgIHliJvlu7rkuIDkuKrpmpDol4/nmoQgaW5wdXQg5qCH562+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnB1dC50eXBlID0gJ2ZpbGUnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g6ZmQ5Yi25Y+q6IO96YCJ5oupIGpzb24g5paH5Lu277yM5aaC5p6c5a+85YWlIEV4Y2VsIOWPr+S7peaUueS4uiAnLnhsc3gsIC54bHMnXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnB1dC5hY2NlcHQgPSAnLmpzb24nO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXQuc3R5bGUuZGlzcGxheSA9ICdub25lJztcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAyLiDnm5HlkKzmlofku7bpgInmi6nnmoTlj5jljJZcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0Lm9uY2hhbmdlID0gKGUpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmaWxlID0gKGUudGFyZ2V0IGFzIEhUTUxJbnB1dEVsZW1lbnQpLmZpbGVzPy5bMF07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFmaWxlKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIDMuIOS9v+eUqCBGaWxlUmVhZGVyIOivu+WPluaWh+S7tuWGheWuuVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVhZGVyLm9ubG9hZCA9IChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g6I635Y+W5paH5Lu26YeM55qE5paH5pys5YaF5a655bm26Kej5p6Q5Li6IEpTT05cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGV2ZW50LnRhcmdldD8ucmVzdWx0IGFzIHN0cmluZztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGltcG9ydGVkRGF0YSA9IEpTT04ucGFyc2UocmVzdWx0KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDlgYforr7lr7zlhaXnmoQgSlNPTiDmoLzlvI/kuZ/mmK8geyBwYWNrczogWy4uLl0gfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGltcG9ydGVkRGF0YS5wYWNrcyAmJiBBcnJheS5pc0FycmF5KGltcG9ydGVkRGF0YS5wYWNrcykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDlsIblr7zlhaXnmoTmlbDmja7mm7/mjaLliLDlvZPliY3nmoQgdGFza0xpc3Qg5LitXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YXNrTGlzdCA9IGltcG9ydGVkRGF0YS5wYWNrcztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXNrTGlzdCA9IHRoaXMudGFza0xpc3Q7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIDQuIOinpuWPkeS/neWtmO+8jOWwhuaWsOaVsOaNruWGmeWFpeacrOWcsCBQYWNrcy5qc29uXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbW9kaWZ5UGFja2FnZUpzb24oKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5aaC5p6c5pyJIEVkaXRvci5EaWFsb2fvvIzlj6/ku6XlvLnkuKrmiJDlip/mj5DnpLpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ2luZm8nLCAn5o+Q56S6JywgJ+WvvOWFpeaIkOWKn++8gScpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAn6K2m5ZGKJywgJ+WvvOWFpeeahOaWh+S7tuagvOW8j+S4jeato+ehru+8gScpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ2Vycm9yJywgJ+mUmeivrycsICfmlofku7bop6PmnpDlpLHotKXvvIzor7fmo4Dmn6Xmlofku7bmoLzlvI/vvIEnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gNS4g5riF55CG77ya5bCG5Li05pe25Yib5bu655qEIGlucHV0IOagh+etvuS7jumhtemdouS4reenu+mZpFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKGlucHV0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlYWRlci5yZWFkQXNUZXh0KGZpbGUpOyAvLyDku6XmlofmnKzlvaLlvI/or7vlj5bmlofku7ZcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gNi4g5bCGIGlucHV0IOaMgui9veWIsOmhtemdouW5tuinpuWPkeeCueWHu++8jOW8ueWHuuaWh+S7tumAieaLqeahhlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChpbnB1dCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnB1dC5jbGljaygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDor7TmmI7pnZnmgIHmlofku7bkuK3mnIkgUGFja3MuanNvbuS6hu+8jOivoumXruaYr+WQpuabv+aNolxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy50YXNrTGlzdCAmJiB0aGlzLnRhc2tMaXN0Lmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBidG5NYXAgPSBuZXcgTWFwPHN0cmluZywgRnVuY3Rpb24+KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBidG5NYXAuc2V0KCdyZXBsYWNlJywgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGltcG9ydEZ1bmMoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnRuTWFwLnNldCgnY2FuY2VsJywgbnVsbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAncmVwbGFjZScsICdQYWNrcy5qc29uIOW3suWtmOWcqO+8jOaYr+WQpuabv+aNoj8nLCBidG5NYXApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW1wb3J0RnVuYygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBleHBvcnRQYWNrc0NvbmZpZygpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8g6K+05piO5rKh5pyJ6YWN572uXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy50YXNrTGlzdCB8fCB0aGlzLnRhc2tMaXN0Lmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ+itpuWRiicsICfmsqHmnInphY3nva7vvIzml6Dms5Xlr7zlh7onKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gMS4g57uE6KOF6ZyA6KaB5a+85Ye655qE5pWw5o2uXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBleHBvcnREYXRhID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhY2tzOiB0aGlzLnRhc2tMaXN0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF0YVN0ciA9IEpTT04uc3RyaW5naWZ5KGV4cG9ydERhdGEsIG51bGwsIFwiXFx0XCIpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIDIuIOiOt+WPluW9k+WJjeezu+e7n+eahOahjOmdoui3r+W+hFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGVza3RvcFBhdGggPSBvcy5ob21lZGlyKCkgKyAnL0Rlc2t0b3AnO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIDMuIOaLvOaOpeWujOaVtOeahOS/neWtmOi3r+W+hFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2F2ZVBhdGggPSBqb2luKGRlc2t0b3BQYXRoLCBgUGFja3MuanNvbmApO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIDQuIOS9v+eUqCBOb2RlLmpzIOWOn+eUnyBmcyDmqKHlnZflkIzmraXlhpnlhaXmlofku7bliLDmoYzpnaJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdyaXRlRmlsZVN5bmMoc2F2ZVBhdGgsIGRhdGFTdHIsICd1dGYtOCcpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIDUuIOW8ueWHuuaIkOWKn+aPkOekulxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCdpbmZvJywgJ+aPkOekuicsIGDphY3nva7lt7LmiJDlip/lr7zlh7rliLDmoYzpnaLvvIFcXG7mlofku7blkI3vvJoke2BQYWNrcy5qc29uYH1gKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCflr7zlh7rlpLHotKU6JywgZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCdlcnJvcicsICfplJnor68nLCAn5a+85Ye66YWN572u5paH5Lu25aSx6LSl77yM6K+35qOA5p+l5p2D6ZmQ77yBJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIG9uZWtleU9wZXJhdGVBdXRvUGFjayhmbGFnOiBib29sZWFuKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy50YXNrTGlzdC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YXNrTGlzdFtpXS5uZWVkQXV0b1BhY2sgPSBmbGFnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFmbGFnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YXNrTGlzdFtpXS51cGxvYWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhc2tMaXN0W2ldLnNraXAgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgb25la2V5T3BlcmF0ZVVwbG9hZChmbGFnOiBib29sZWFuKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy50YXNrTGlzdC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YXNrTGlzdFtpXS51cGxvYWQgPSBmbGFnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBvbmVrZXlPcGVyYXRlU2tpcFBhY2soZmxhZzogYm9vbGVhbikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudGFza0xpc3QubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGFza0xpc3RbaV0uc2tpcCA9IGZsYWc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGdldEF1dG9Db3VudCgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGNvdW50ID0gMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRhc2tMaXN0Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy50YXNrTGlzdFtpXS5uZWVkQXV0b1BhY2spIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb3VudCsrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjb3VudDtcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGdldFVwbG9hZENvdW50KCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgY291bnQgPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudGFza0xpc3QubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnRhc2tMaXN0W2ldLnVwbG9hZCAmJiB0aGlzLnRhc2tMaXN0W2ldLm5lZWRBdXRvUGFjaykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50Kys7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNvdW50O1xyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgZ2V0UGFja0NvdW50KCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgY291bnQgPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudGFza0xpc3QubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy50YXNrTGlzdFtpXS5za2lwICYmIHRoaXMudGFza0xpc3RbaV0ubmVlZEF1dG9QYWNrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY291bnQrKztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY291bnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBvcGVuTG9nRGlyKHBhdGg6IHN0cmluZykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWV4aXN0c1N5bmMocGF0aCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnd2FybicsICd3YXJuJywgJ+aXpeW/l+aWh+S7tuWkueS4jeWtmOWcqO+8gScpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBleGVjKGBzdGFydCBcIlwiIFwiJHtwYXRofVwiYCwgKGVycm9yKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+aJp+ihjOWRveS7pOWHuumUmTonLCBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnZXJyb3InLCAn6ZSZ6K+vJywgJ+aXoOazleaJk+W8gOebruW9le+8jOivt+ajgOafpei3r+W+hOaIluadg+mZkO+8gScpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcign5omT5byA55uu5b2V5byC5bi4OicsIGVycm9yKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnZXJyb3InLCAn6ZSZ6K+vJywgJ+WPkeeUn+acquefpemUmeivr++8jOaXoOazleaJk+W8gOebruW9le+8gScpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBvcGVuVG9vbExvZygpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5vcGVuTG9nRGlyKGpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vdG9vbExvZycpKTtcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHRhb2Jhb0xvZ2luKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsb2dpbkZvclRhb2JhbygpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgY2xpY2tBdXRvUGFja1RvZ2dsZShpdGVtOiBQYWNrUHJvamVjdCwgZmxhZzogYm9vbGVhbikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtLm5lZWRBdXRvUGFjayA9IGZsYWc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZmxhZykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS51cGxvYWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0uc2tpcCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHRlbXBsYXRlOiByZWFkRmlsZVN5bmMoam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi9zdGF0aWMvdGVtcGxhdGUvdnVlL3Byb2plY3QuaHRtbCcpLCAndXRmLTgnKSxcclxuICAgICAgICAgICAgfSkpO1xyXG4gICAgICAgICAgICBhcHAubW91bnQodGhpcy4kLmFwcCk7XHJcbiAgICAgICAgICAgIHBhbmVsRGF0YU1hcC5zZXQodGhpcywgYXBwKTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG4gICAgYmVmb3JlQ2xvc2UoKSB7XHJcbiAgICB9LFxyXG4gICAgY2xvc2UoKSB7XHJcbiAgICAgICAgY29uc3QgYXBwID0gcGFuZWxEYXRhTWFwLmdldCh0aGlzKTtcclxuICAgICAgICBpZiAoYXBwKSB7XHJcbiAgICAgICAgICAgIG1vZGlmeVBhY2thZ2VKc29uKCk7XHJcblxyXG4gICAgICAgICAgICBhcHAudW5tb3VudCgpO1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcbn0pO1xyXG4iXX0=