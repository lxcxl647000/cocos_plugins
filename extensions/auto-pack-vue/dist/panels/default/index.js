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
                                (0, main_1.checkTaobaoLogin)(() => {
                                    func && func();
                                }, () => {
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
                            // autoPack();
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
                            if (this.taskList[i].upload) {
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
                        // let sp: ChildProcessWithoutNullStreams = spawn("tbopen", ['login'], { shell: true });
                        // sp.stdout.setEncoding('utf8');
                        // sp.stdout.on('data', (data) => {
                        //     console.log(`taobaoLogin stdout ${data.toString()}`);
                        // });
                        // sp.stderr.on('data', (data) => {
                        //     console.log(`taobaoLogin stderr ${data.toString()}`);
                        // })
                        // sp.on('exit', (code) => {
                        //     console.log(`taobaoLogin exit ${code}`);
                        //     if (code === 0) {
                        //         checkTaobaoLogin(
                        //             () => {
                        //                 openDilog('warn', 'success', '登录成功，请继续自动化!');
                        //             },
                        //             () => {
                        //                 openDilog('warn', 'warn', '登录失败，请重新扫码!');
                        //             }
                        //         );
                        //     }
                        // });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zb3VyY2UvcGFuZWxzL2RlZmF1bHQvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLCtDQUErQzs7Ozs7O0FBRS9DLGlEQUE0RTtBQUM1RSx1Q0FBbUU7QUFDbkUsK0JBQTRCO0FBQzVCLDZCQUFzRDtBQUN0RCw0Q0FBb0I7QUFDcEIscUNBQThEO0FBQzlELE1BQU0sWUFBWSxHQUFHLElBQUksT0FBTyxFQUFZLENBQUM7QUFpQjdDLE1BQU0sU0FBUyxHQUFHLElBQUEsV0FBSSxFQUFDLFNBQVMsRUFBRSx3Q0FBd0MsQ0FBQyxDQUFDO0FBQzVFLElBQUksUUFBUSxHQUFrQixJQUFBLHFCQUFVLEVBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBQSx1QkFBWSxFQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0FBRTlHLE1BQU0saUJBQWlCLEdBQUcsR0FBRyxFQUFFO0lBQzNCLElBQUksSUFBSSxHQUFHLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxDQUFDO0lBQy9CLElBQUksT0FBTyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUMvQyxJQUFBLHdCQUFhLEVBQUMsSUFBQSxXQUFJLEVBQUMsU0FBUyxFQUFFLHdDQUF3QyxDQUFDLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBQy9GLENBQUMsQ0FBQztBQUVLLE1BQU0sU0FBUyxHQUFHLEtBQUssRUFBRSxJQUFZLEVBQUUsS0FBYSxFQUFFLE9BQWUsRUFBRSxNQUE4QixFQUFFLE1BQWUsRUFBRSxFQUFFO0lBQzdILElBQUksTUFBTSxHQUF1QztRQUM3QyxLQUFLO0tBQ1IsQ0FBQztJQUNGLElBQUksTUFBTSxFQUFFLENB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bmVudC1wZXItZmlsZSAqL1xyXG5cclxuaW1wb3J0IHsgQ2hpbGRQcm9jZXNzV2l0aG91dE51bGxTdHJlYW1zLCBzcGF3biwgZXhlYyB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xyXG5pbXBvcnQgeyBleGlzdHNTeW5jLCByZWFkRmlsZVN5bmMsIHdyaXRlRmlsZVN5bmMgfSBmcm9tICdmcy1leHRyYSc7XHJcbmltcG9ydCB7IGpvaW4gfSBmcm9tICdwYXRoJztcclxuaW1wb3J0IHsgY3JlYXRlQXBwLCBBcHAsIGRlZmluZUNvbXBvbmVudCB9IGZyb20gJ3Z1ZSc7XHJcbmltcG9ydCBvcyBmcm9tICdvcyc7XHJcbmltcG9ydCB7IGNoZWNrVGFvYmFvTG9naW4sIGxvZ2luRm9yVGFvYmFvIH0gZnJvbSAnLi4vLi4vbWFpbic7XHJcbmNvbnN0IHBhbmVsRGF0YU1hcCA9IG5ldyBXZWFrTWFwPGFueSwgQXBwPigpO1xyXG4vKipcclxuICogQHpoIOWmguaenOW4jOacm+WFvOWuuSAzLjMg5LmL5YmN55qE54mI5pys5Y+v5Lul5L2/55So5LiL5pa555qE5Luj56CBXHJcbiAqIEBlbiBZb3UgY2FuIGFkZCB0aGUgY29kZSBiZWxvdyBpZiB5b3Ugd2FudCBjb21wYXRpYmlsaXR5IHdpdGggdmVyc2lvbnMgcHJpb3IgdG8gMy4zXHJcbiAqL1xyXG4vLyBFZGl0b3IuUGFuZWwuZGVmaW5lID0gRWRpdG9yLlBhbmVsLmRlZmluZSB8fCBmdW5jdGlvbihvcHRpb25zOiBhbnkpIHsgcmV0dXJuIG9wdGlvbnMgfVxyXG5cclxuaW50ZXJmYWNlIFBhY2tQcm9qZWN0IHtcclxuICAgIGFwcElkOiBzdHJpbmcsXHJcbiAgICBuYW1lOiBzdHJpbmcsXHJcbiAgICBwYXRoOiBzdHJpbmcsLy8gQ29jb3Ppobnnm67moLnnm67lvZVcclxuICAgIGNoYW5uZWw6IHN0cmluZywvLyDmjIflrprmiZPljIXlr7nlupTmuKDpgZPlkI3np7BcclxuICAgIHNraXA/OiBib29sZWFuLC8vIOaYr+WQpui3s+i/h2NvY29z5p6E5bu65bel56iL77yM55u05o6l5L2/55So5a+85Ye65bel56iLXHJcbiAgICB1cGxvYWQ/OiBib29sZWFuLy8g5piv5ZCm6ZyA6KaB5LiK5LygXHJcbiAgICBuZWVkQXV0b1BhY2s/OiBib29sZWFuLy8g5piv5ZCm6ZyA6KaB6L+b6KGM6Ieq5Yqo5p6E5bu65LiK5LygXHJcbn1cclxuXHJcbmNvbnN0IHBhY2tzUGF0aCA9IGpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vc3RhdGljL3BhY2tjb25maWdzL1BhY2tzLmpzb24nKTtcclxubGV0IHRhc2tMaXN0OiBQYWNrUHJvamVjdFtdID0gZXhpc3RzU3luYyhwYWNrc1BhdGgpID8gSlNPTi5wYXJzZShyZWFkRmlsZVN5bmMocGFja3NQYXRoLCAndXRmLTgnKSkucGFja3MgOiBbXTtcclxuXHJcbmNvbnN0IG1vZGlmeVBhY2thZ2VKc29uID0gKCkgPT4ge1xyXG4gICAgbGV0IGRhdGEgPSB7IHBhY2tzOiB0YXNrTGlzdCB9O1xyXG4gICAgbGV0IGRhdGFTdHIgPSBKU09OLnN0cmluZ2lmeShkYXRhLCBudWxsLCBcIlxcdFwiKTtcclxuICAgIHdyaXRlRmlsZVN5bmMoam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi9zdGF0aWMvcGFja2NvbmZpZ3MvUGFja3MuanNvbicpLCBkYXRhU3RyLCAndXRmLTgnKTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBvcGVuRGlsb2cgPSBhc3luYyAodHlwZTogc3RyaW5nLCB0aXRsZTogc3RyaW5nLCBtZXNzYWdlOiBzdHJpbmcsIGJ0bk1hcD86IE1hcDxzdHJpbmcsIEZ1bmN0aW9uPiwgY2FuY2VsPzogbnVtYmVyKSA9PiB7XHJcbiAgICBsZXQgb3B0aW9uOiBFZGl0b3IuRGlhbG9nLk1lc3NhZ2VEaWFsb2dPcHRpb25zID0ge1xyXG4gICAgICAgIHRpdGxlXHJcbiAgICB9O1xyXG4gICAgaWYgKGJ0bk1hcCkge1xyXG4gICAgICAgIG9wdGlvbi5idXR0b25zID0gW107XHJcbiAgICAgICAgYnRuTWFwLmZvckVhY2goKHZhbHVlLCBrZXkpID0+IHtcclxuICAgICAgICAgICAgb3B0aW9uLmJ1dHRvbnMucHVzaChrZXkpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgaWYgKGNhbmNlbCAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgb3B0aW9uLmNhbmNlbCA9IGNhbmNlbDtcclxuICAgIH1cclxuICAgIGxldCBjb2RlOiB7IHJlc3BvbnNlOiAwLCBjaGVja2JveENoZWNrZWQ6IGZhbHNlIH0gPSBhd2FpdCBFZGl0b3IuRGlhbG9nW3R5cGVdKG1lc3NhZ2UsIG9wdGlvbik7XHJcbiAgICBpZiAoYnRuTWFwKSB7XHJcbiAgICAgICAgbGV0IGtleSA9IG9wdGlvbi5idXR0b25zW2NvZGUucmVzcG9uc2VdO1xyXG4gICAgICAgIGlmIChidG5NYXAuaGFzKGtleSkpIHtcclxuICAgICAgICAgICAgbGV0IGZ1bmMgPSBidG5NYXAuZ2V0KGtleSk7XHJcbiAgICAgICAgICAgIGlmIChmdW5jKSB7XHJcbiAgICAgICAgICAgICAgICBmdW5jKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRWRpdG9yLlBhbmVsLmRlZmluZSh7XHJcbiAgICBsaXN0ZW5lcnM6IHtcclxuICAgICAgICBzaG93KCkgeyBjb25zb2xlLmxvZygnc2hvdycpOyB9LFxyXG4gICAgICAgIGhpZGUoKSB7IGNvbnNvbGUubG9nKCdoaWRlJyk7IH0sXHJcbiAgICB9LFxyXG4gICAgdGVtcGxhdGU6IHJlYWRGaWxlU3luYyhqb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uL3N0YXRpYy90ZW1wbGF0ZS9kZWZhdWx0L2luZGV4Lmh0bWwnKSwgJ3V0Zi04JyksXHJcbiAgICBzdHlsZTogcmVhZEZpbGVTeW5jKGpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vc3RhdGljL3N0eWxlL2RlZmF1bHQvaW5kZXguY3NzJyksICd1dGYtOCcpLFxyXG4gICAgJDoge1xyXG4gICAgICAgIGFwcDogJyNhcHAnLFxyXG4gICAgfSxcclxuICAgIG1ldGhvZHM6IHtcclxuXHJcbiAgICB9LFxyXG4gICAgcmVhZHkoKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuJC5hcHApIHtcclxuICAgICAgICAgICAgY29uc3QgYXBwID0gY3JlYXRlQXBwKHt9KTtcclxuICAgICAgICAgICAgYXBwLmNvbmZpZy5jb21waWxlck9wdGlvbnMuaXNDdXN0b21FbGVtZW50ID0gKHRhZykgPT4gdGFnLnN0YXJ0c1dpdGgoJ3VpLScpO1xyXG5cclxuICAgICAgICAgICAgYXBwLmNvbXBvbmVudCgnTXlQcm9qZWN0JywgZGVmaW5lQ29tcG9uZW50KHtcclxuICAgICAgICAgICAgICAgIGRhdGEoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGFza0xpc3Q6IHRhc2tMaXN0LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpc0F1dG9QYWNrOiBmYWxzZVxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgbWV0aG9kczoge1xyXG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0QXV0b1BhY2soKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy50YXNrTGlzdCB8fCB0aGlzLnRhc2tMaXN0Lmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGJ0bk1hcCA9IG5ldyBNYXA8c3RyaW5nLCBGdW5jdGlvbj4oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ0bk1hcC5zZXQoJ2FkZCcsICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZFByb2plY3QoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnRuTWFwLnNldCgnY2FuY2VsJywgbnVsbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAnd2FybicsICfor7flhYjmt7vliqDoh6rliqjljJbpobnnm67phY3nva7vvIEnLCBidG5NYXApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IHRhc2sgb2YgdGhpcy50YXNrTGlzdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0YXNrLnBhdGggfHwgIXRhc2suY2hhbm5lbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBzdHIgPSAnJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRhc2suYXBwSWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RyICs9ICfmnKrphY3nva5hcHBJZCAnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRhc2sucGF0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gJ+acqumFjee9rumhueebrui3r+W+hCAnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRhc2suY2hhbm5lbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gJ+acqumFjee9rua4oOmBkyAnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAnd2FybicsIGBhcHBJZDoke3Rhc2suYXBwSWR9JHt0YXNrLm5hbWV9JHtzdHJ96K+35qOA5p+l6YWN572u77yBYCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmlzQXV0b1BhY2spIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnd2FybicsICd3YXJuJywgJ+ato+WcqOiHquWKqOWMlu+8jOivt+eojeWQjuWGjeivlSEnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY2hlY2tUYW9iYW8gPSAoZnVuYzogRnVuY3Rpb24pID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjaGVjayA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgdGFzayBvZiB0aGlzLnRhc2tMaXN0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRhc2suY2hhbm5lbCA9PT0gJ3Rhb2Jhby1taW5pLWdhbWUnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoZWNrID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNoZWNrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hlY2tUYW9iYW9Mb2dpbihcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnVuYyAmJiBmdW5jKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnd2FybicsICd3YXJuJywgJ+a3mOWuneeZu+W9leaAgei/h+acn++8jOivt+mHjeaWsOeZu+W9lSEnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jICYmIGZ1bmMoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYXV0b1BhY2sgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ2luZm8nLCAnc3RhcnQnLCAn5byA5aeL6Ieq5Yqo5YyWJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmlzQXV0b1BhY2sgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbW9kaWZ5UGFja2FnZUpzb24oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBkYXRhID0geyBwYWNrczogdGhpcy50YXNrTGlzdCB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGRhdGFTdHIgPSBKU09OLnN0cmluZ2lmeShkYXRhKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWwhiBKU09OIOWtl+espuS4sui9rOS4uiBCYXNlNjQg57yW56CBIOmBv+WFjeWPjOW8leWPt+WcqOWRveS7pOihjOS4reiiq+WQg+aOiVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGJhc2U2NFN0ciA9IEJ1ZmZlci5mcm9tKGRhdGFTdHIpLnRvU3RyaW5nKCdiYXNlNjQnKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgcGF0aCA9IGpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vc3RhdGljL2F1dG8tcGFjay9idWlsZC9hcHAuanMnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhcmdzID0gW3BhdGgsICctLXBhY2tzJywgYmFzZTY0U3RyXTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgc3A6IENoaWxkUHJvY2Vzc1dpdGhvdXROdWxsU3RyZWFtcyA9IHNwYXduKFwibm9kZVwiLCBhcmdzLCB7IHNoZWxsOiB0cnVlIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3Auc3Rkb3V0LnNldEVuY29kaW5nKCd1dGY4Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzcC5zdGRvdXQub24oJ2RhdGEnLCAoZGF0YSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBhdXRvUGFjayBzdGRvdXQgJHtkYXRhLnRvU3RyaW5nKCl9YCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNwLnN0ZGVyci5vbignZGF0YScsIChkYXRhKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYGF1dG9QYWNrIHN0ZGVyciAke2RhdGEudG9TdHJpbmcoKX1gKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzcC5vbignZXhpdCcsIChjb2RlLCBkYXRhKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvZGUgPT09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYGF1dG9QYWNrIGV4aXQgc3VzY2VzcyAke2RhdGF9YCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnaW5mbycsICflrozmiJAnLCAn6Ieq5Yqo5YyW5a6M5oiQIScpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYGF1dG9QYWNrIGV4aXQgZmFpbCAke2RhdGF9YCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnZXJyb3InLCAn5aSx6LSlJywgJ+iHquWKqOWMluWksei0pSEnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pc0F1dG9QYWNrID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbXNnID0gJyc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCB1cGxvYWRDb3VudCA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwYWNrQ291bnQgPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgYXV0b0NvdW50ID0gMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgdGFzayBvZiB0aGlzLnRhc2tMaXN0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGFzay5uZWVkQXV0b1BhY2spIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdXRvQ291bnQrKztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGFzay51cGxvYWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXBsb2FkQ291bnQrKztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0YXNrLnNraXApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFja0NvdW50Kys7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zZyArPSBgJHt0YXNrLmFwcElkfe+8miR7dGFzay5uYW1lfe+8jOaehOW7uu+8miR7KHRhc2suc2tpcCA/ICfinJUnIDogJ+Kckycpfe+8jOS4iuS8oO+8miR7KHRhc2sudXBsb2FkID8gJ+KckycgOiAn4pyVJyl9XFxuYDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtc2cgKz0gYOiHquWKqOWMlu+8miR7YXV0b0NvdW50feS4qu+8jOaehOW7uu+8miR7cGFja0NvdW50feS4qu+8jOS4iuS8oO+8miR7dXBsb2FkQ291bnR95LiqXFxuYDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGJ0bk1hcCA9IG5ldyBNYXA8c3RyaW5nLCBGdW5jdGlvbj4oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnRuTWFwLnNldCgnb2snLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGVja1Rhb2JhbygoKSA9PiB7IGF1dG9QYWNrKCk7IH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYXV0b1BhY2soKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnd2FybicsICd3YXJuJywgYCR7bXNnfeW8gOWni+iHquWKqOWMlj9gLCBidG5NYXAsIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgYWRkUHJvamVjdCgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YXNrTGlzdC5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwcElkOiAnJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6ICcnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDogJycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGFubmVsOiAndGFvYmFvLW1pbmktZ2FtZScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cGxvYWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2tpcDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZWVkQXV0b1BhY2s6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCdpbmZvJywgJ2FkZCcsICfmt7vliqDmiJDlip8nKTtcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGRlbFByb2plY3QoaXRlbTogUGFja1Byb2plY3QpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGJ0bk1hcCA9IG5ldyBNYXA8c3RyaW5nLCBGdW5jdGlvbj4oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnRuTWFwLnNldCgnZGVsZXRlJywgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YXNrTGlzdCA9IHRoaXMudGFza0xpc3QuZmlsdGVyKCh0YXNrOiBQYWNrUHJvamVjdCkgPT4gdGFzay5hcHBJZCAhPT0gaXRlbS5hcHBJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXNrTGlzdCA9IHRoaXMudGFza0xpc3Q7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAnZGVsZXRlJywgJ+aYr+WQpuWIoOmZpOmFjee9rj8nLCBidG5NYXAsIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgaW1wb3J0UGFja3NDb25maWcoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGltcG9ydEZ1bmMgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAxLiDliqjmgIHliJvlu7rkuIDkuKrpmpDol4/nmoQgaW5wdXQg5qCH562+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnB1dC50eXBlID0gJ2ZpbGUnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g6ZmQ5Yi25Y+q6IO96YCJ5oupIGpzb24g5paH5Lu277yM5aaC5p6c5a+85YWlIEV4Y2VsIOWPr+S7peaUueS4uiAnLnhsc3gsIC54bHMnXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnB1dC5hY2NlcHQgPSAnLmpzb24nO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXQuc3R5bGUuZGlzcGxheSA9ICdub25lJztcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAyLiDnm5HlkKzmlofku7bpgInmi6nnmoTlj5jljJZcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0Lm9uY2hhbmdlID0gKGUpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmaWxlID0gKGUudGFyZ2V0IGFzIEhUTUxJbnB1dEVsZW1lbnQpLmZpbGVzPy5bMF07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFmaWxlKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIDMuIOS9v+eUqCBGaWxlUmVhZGVyIOivu+WPluaWh+S7tuWGheWuuVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVhZGVyLm9ubG9hZCA9IChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g6I635Y+W5paH5Lu26YeM55qE5paH5pys5YaF5a655bm26Kej5p6Q5Li6IEpTT05cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGV2ZW50LnRhcmdldD8ucmVzdWx0IGFzIHN0cmluZztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGltcG9ydGVkRGF0YSA9IEpTT04ucGFyc2UocmVzdWx0KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDlgYforr7lr7zlhaXnmoQgSlNPTiDmoLzlvI/kuZ/mmK8geyBwYWNrczogWy4uLl0gfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGltcG9ydGVkRGF0YS5wYWNrcyAmJiBBcnJheS5pc0FycmF5KGltcG9ydGVkRGF0YS5wYWNrcykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDlsIblr7zlhaXnmoTmlbDmja7mm7/mjaLliLDlvZPliY3nmoQgdGFza0xpc3Qg5LitXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YXNrTGlzdCA9IGltcG9ydGVkRGF0YS5wYWNrcztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXNrTGlzdCA9IHRoaXMudGFza0xpc3Q7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIDQuIOinpuWPkeS/neWtmO+8jOWwhuaWsOaVsOaNruWGmeWFpeacrOWcsCBQYWNrcy5qc29uXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbW9kaWZ5UGFja2FnZUpzb24oKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5aaC5p6c5pyJIEVkaXRvci5EaWFsb2fvvIzlj6/ku6XlvLnkuKrmiJDlip/mj5DnpLpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ2luZm8nLCAn5o+Q56S6JywgJ+WvvOWFpeaIkOWKn++8gScpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAn6K2m5ZGKJywgJ+WvvOWFpeeahOaWh+S7tuagvOW8j+S4jeato+ehru+8gScpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ2Vycm9yJywgJ+mUmeivrycsICfmlofku7bop6PmnpDlpLHotKXvvIzor7fmo4Dmn6Xmlofku7bmoLzlvI/vvIEnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gNS4g5riF55CG77ya5bCG5Li05pe25Yib5bu655qEIGlucHV0IOagh+etvuS7jumhtemdouS4reenu+mZpFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKGlucHV0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlYWRlci5yZWFkQXNUZXh0KGZpbGUpOyAvLyDku6XmlofmnKzlvaLlvI/or7vlj5bmlofku7ZcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gNi4g5bCGIGlucHV0IOaMgui9veWIsOmhtemdouW5tuinpuWPkeeCueWHu++8jOW8ueWHuuaWh+S7tumAieaLqeahhlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChpbnB1dCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnB1dC5jbGljaygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDor7TmmI7pnZnmgIHmlofku7bkuK3mnIkgUGFja3MuanNvbuS6hu+8jOivoumXruaYr+WQpuabv+aNolxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy50YXNrTGlzdCAmJiB0aGlzLnRhc2tMaXN0Lmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBidG5NYXAgPSBuZXcgTWFwPHN0cmluZywgRnVuY3Rpb24+KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBidG5NYXAuc2V0KCdyZXBsYWNlJywgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGltcG9ydEZ1bmMoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnRuTWFwLnNldCgnY2FuY2VsJywgbnVsbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAncmVwbGFjZScsICdQYWNrcy5qc29uIOW3suWtmOWcqO+8jOaYr+WQpuabv+aNoj8nLCBidG5NYXApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW1wb3J0RnVuYygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBleHBvcnRQYWNrc0NvbmZpZygpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8g6K+05piO5rKh5pyJ6YWN572uXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy50YXNrTGlzdCB8fCB0aGlzLnRhc2tMaXN0Lmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ+itpuWRiicsICfmsqHmnInphY3nva7vvIzml6Dms5Xlr7zlh7onKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gMS4g57uE6KOF6ZyA6KaB5a+85Ye655qE5pWw5o2uXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBleHBvcnREYXRhID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhY2tzOiB0aGlzLnRhc2tMaXN0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF0YVN0ciA9IEpTT04uc3RyaW5naWZ5KGV4cG9ydERhdGEsIG51bGwsIFwiXFx0XCIpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIDIuIOiOt+WPluW9k+WJjeezu+e7n+eahOahjOmdoui3r+W+hFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGVza3RvcFBhdGggPSBvcy5ob21lZGlyKCkgKyAnL0Rlc2t0b3AnO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIDMuIOaLvOaOpeWujOaVtOeahOS/neWtmOi3r+W+hFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2F2ZVBhdGggPSBqb2luKGRlc2t0b3BQYXRoLCBgUGFja3MuanNvbmApO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIDQuIOS9v+eUqCBOb2RlLmpzIOWOn+eUnyBmcyDmqKHlnZflkIzmraXlhpnlhaXmlofku7bliLDmoYzpnaJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdyaXRlRmlsZVN5bmMoc2F2ZVBhdGgsIGRhdGFTdHIsICd1dGYtOCcpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIDUuIOW8ueWHuuaIkOWKn+aPkOekulxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCdpbmZvJywgJ+aPkOekuicsIGDphY3nva7lt7LmiJDlip/lr7zlh7rliLDmoYzpnaLvvIFcXG7mlofku7blkI3vvJoke2BQYWNrcy5qc29uYH1gKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCflr7zlh7rlpLHotKU6JywgZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCdlcnJvcicsICfplJnor68nLCAn5a+85Ye66YWN572u5paH5Lu25aSx6LSl77yM6K+35qOA5p+l5p2D6ZmQ77yBJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIG9uZWtleU9wZXJhdGVBdXRvUGFjayhmbGFnOiBib29sZWFuKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy50YXNrTGlzdC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YXNrTGlzdFtpXS5uZWVkQXV0b1BhY2sgPSBmbGFnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBvbmVrZXlPcGVyYXRlVXBsb2FkKGZsYWc6IGJvb2xlYW4pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRhc2tMaXN0Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhc2tMaXN0W2ldLnVwbG9hZCA9IGZsYWc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIG9uZWtleU9wZXJhdGVTa2lwUGFjayhmbGFnOiBib29sZWFuKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy50YXNrTGlzdC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YXNrTGlzdFtpXS5za2lwID0gZmxhZztcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgZ2V0QXV0b0NvdW50KCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgY291bnQgPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudGFza0xpc3QubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnRhc2tMaXN0W2ldLm5lZWRBdXRvUGFjaykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50Kys7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNvdW50O1xyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgZ2V0VXBsb2FkQ291bnQoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjb3VudCA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy50YXNrTGlzdC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudGFza0xpc3RbaV0udXBsb2FkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY291bnQrKztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY291bnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBnZXRQYWNrQ291bnQoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjb3VudCA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy50YXNrTGlzdC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLnRhc2tMaXN0W2ldLnNraXAgJiYgdGhpcy50YXNrTGlzdFtpXS5uZWVkQXV0b1BhY2spIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb3VudCsrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjb3VudDtcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIG9wZW5Mb2dEaXIocGF0aDogc3RyaW5nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZXhpc3RzU3luYyhwYXRoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ3dhcm4nLCAn5pel5b+X5paH5Lu25aS55LiN5a2Y5Zyo77yBJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4ZWMoYHN0YXJ0IFwiXCIgXCIke3BhdGh9XCJgLCAoZXJyb3IpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcign5omn6KGM5ZG95Luk5Ye66ZSZOicsIGVycm9yKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCdlcnJvcicsICfplJnor68nLCAn5peg5rOV5omT5byA55uu5b2V77yM6K+35qOA5p+l6Lev5b6E5oiW5p2D6ZmQ77yBJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCfmiZPlvIDnm67lvZXlvILluLg6JywgZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCdlcnJvcicsICfplJnor68nLCAn5Y+R55Sf5pyq55+l6ZSZ6K+v77yM5peg5rOV5omT5byA55uu5b2V77yBJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIG9wZW5Ub29sTG9nKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm9wZW5Mb2dEaXIoam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi90b29sTG9nJykpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgdGFvYmFvTG9naW4oKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2luRm9yVGFvYmFvKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGxldCBzcDogQ2hpbGRQcm9jZXNzV2l0aG91dE51bGxTdHJlYW1zID0gc3Bhd24oXCJ0Ym9wZW5cIiwgWydsb2dpbiddLCB7IHNoZWxsOiB0cnVlIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzcC5zdGRvdXQuc2V0RW5jb2RpbmcoJ3V0ZjgnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gc3Auc3Rkb3V0Lm9uKCdkYXRhJywgKGRhdGEpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgIGNvbnNvbGUubG9nKGB0YW9iYW9Mb2dpbiBzdGRvdXQgJHtkYXRhLnRvU3RyaW5nKCl9YCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzcC5zdGRlcnIub24oJ2RhdGEnLCAoZGF0YSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgY29uc29sZS5sb2coYHRhb2Jhb0xvZ2luIHN0ZGVyciAke2RhdGEudG9TdHJpbmcoKX1gKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gfSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gc3Aub24oJ2V4aXQnLCAoY29kZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgY29uc29sZS5sb2coYHRhb2Jhb0xvZ2luIGV4aXQgJHtjb2RlfWApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgaWYgKGNvZGUgPT09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgICAgICBjaGVja1Rhb2Jhb0xvZ2luKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgICAgICAgICAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAnc3VjY2VzcycsICfnmbvlvZXmiJDlip/vvIzor7fnu6fnu63oh6rliqjljJYhJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICAgICAgICAgICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnd2FybicsICd3YXJuJywgJ+eZu+W9leWksei0pe+8jOivt+mHjeaWsOaJq+eggSEnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZTogcmVhZEZpbGVTeW5jKGpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vc3RhdGljL3RlbXBsYXRlL3Z1ZS9wcm9qZWN0Lmh0bWwnKSwgJ3V0Zi04JyksXHJcbiAgICAgICAgICAgIH0pKTtcclxuICAgICAgICAgICAgYXBwLm1vdW50KHRoaXMuJC5hcHApO1xyXG4gICAgICAgICAgICBwYW5lbERhdGFNYXAuc2V0KHRoaXMsIGFwcCk7XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuICAgIGJlZm9yZUNsb3NlKCkge1xyXG4gICAgfSxcclxuICAgIGNsb3NlKCkge1xyXG4gICAgICAgIGNvbnN0IGFwcCA9IHBhbmVsRGF0YU1hcC5nZXQodGhpcyk7XHJcbiAgICAgICAgaWYgKGFwcCkge1xyXG4gICAgICAgICAgICBtb2RpZnlQYWNrYWdlSnNvbigpO1xyXG5cclxuICAgICAgICAgICAgYXBwLnVubW91bnQoKTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG59KTtcclxuIl19