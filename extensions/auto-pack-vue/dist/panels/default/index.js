"use strict";
/* eslint-disable vue/one-component-per-file */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const fs_extra_1 = require("fs-extra");
const path_1 = require("path");
const vue_1 = require("vue");
const os_1 = __importDefault(require("os"));
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
                            openDilog('warn', 'warn', '请先添加自动化项目配置！', btnMap);
                            return;
                        }
                        if (this.isAutoPack) {
                            openDilog('warn', 'warn', '正在自动化，请稍后再试!');
                            return;
                        }
                        const autoPack = () => {
                            openDilog('info', 'start', '开始自动化');
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
                                console.log(`stdout ${data.toString()}`);
                            });
                            sp.stderr.on('data', (data) => {
                                console.log(`stderr ${data.toString()}`);
                            });
                            sp.on('exit', (code, data) => {
                                if (code === 0) {
                                    openDilog('info', 'suscess', '自动化成功!');
                                }
                                else {
                                    openDilog('error', 'fail', '自动化失败!');
                                }
                                this.isAutoPack = false;
                            });
                        };
                        let hasUpload = false;
                        for (let task of this.taskList) {
                            if (task.needAutoPack && task.upload) {
                                hasUpload = true;
                                break;
                            }
                        }
                        if (hasUpload) {
                            let btnMap = new Map();
                            btnMap.set('ok', () => {
                                autoPack();
                            });
                            openDilog('warn', 'warn', '有游戏需要上传，是否继续', btnMap, 1);
                        }
                        else {
                            autoPack();
                        }
                    },
                    addProject() {
                        let id = 0;
                        for (let task of this.taskList) {
                            if (task.id > id) {
                                id = task.id;
                            }
                        }
                        id++;
                        this.taskList.push({
                            id,
                            name: '',
                            path: '',
                            channel: '',
                            upload: false,
                            skip: false,
                            needAutoPack: false,
                        });
                    },
                    delProject(item) {
                        let btnMap = new Map();
                        btnMap.set('delete', () => {
                            this.taskList = this.taskList.filter((task) => task.id !== item.id);
                            taskList = this.taskList;
                        });
                        openDilog('warn', 'delete', '是否删除配置?', btnMap, 1);
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
                                            openDilog('info', '提示', '导入成功！');
                                        }
                                        else {
                                            openDilog('warn', '警告', '导入的文件格式不正确！');
                                        }
                                    }
                                    catch (error) {
                                        console.error(error);
                                        openDilog('error', '错误', '文件解析失败，请检查文件格式！');
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
                            openDilog('warn', 'replace', 'Packs.json 已存在，是否替换?', btnMap);
                        }
                        else {
                            importFunc();
                        }
                    },
                    exportPacksConfig() {
                        // 说明没有配置
                        if (!this.taskList || this.taskList.length === 0) {
                            openDilog('warn', '警告', '没有配置，无法导出');
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
                            openDilog('info', '提示', `配置已成功导出到桌面！\n文件名：${`Packs.json`}`);
                        }
                        catch (error) {
                            console.error('导出失败:', error);
                            openDilog('error', '错误', '导出配置文件失败，请检查权限！');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zb3VyY2UvcGFuZWxzL2RlZmF1bHQvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLCtDQUErQzs7Ozs7QUFFL0MsaURBQXNFO0FBQ3RFLHVDQUFtRTtBQUNuRSwrQkFBNEI7QUFDNUIsNkJBQXNEO0FBQ3RELDRDQUFvQjtBQUNwQixNQUFNLFlBQVksR0FBRyxJQUFJLE9BQU8sRUFBWSxDQUFDO0FBaUI3QyxNQUFNLFNBQVMsR0FBRyxJQUFBLFdBQUksRUFBQyxTQUFTLEVBQUUsd0NBQXdDLENBQUMsQ0FBQztBQUM1RSxJQUFJLFFBQVEsR0FBa0IsSUFBQSxxQkFBVSxFQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUEsdUJBQVksRUFBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUU5RyxNQUFNLGlCQUFpQixHQUFHLEdBQUcsRUFBRTtJQUMzQixJQUFJLElBQUksR0FBRyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsQ0FBQztJQUMvQixJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDL0MsSUFBQSx3QkFBYSxFQUFDLElBQUEsV0FBSSxFQUFDLFNBQVMsRUFBRSx3Q0FBd0MsQ0FBQyxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztBQUMvRixDQUFDLENBQUM7QUFFRixNQUFNLFNBQVMsR0FBRyxLQUFLLEVBQUUsSUFBWSxFQUFFLEtBQWEsRUFBRSxPQUFlLEVBQUUsTUFBOEIsRUFBRSxNQUFlLEVBQUUsRUFBRTtJQUN0SCxJQUFJLE1BQU0sR0FBdUM7UUFDN0MsS0FBSztLQUNSLENBQUM7SUFDRixJQUFJLE1BQU0sRUFBRSxDQUFDO1FBQ1QsTUFBTSxD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T0FBTyxDQUFDO2FBQ2hHLENBQUMsQ0FBQyxDQUFDO1lBQ0osR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3RCLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ2hDLENBQUM7SUFDTCxDQUFDO0lBQ0QsV0FBVztJQUNYLENBQUM7SUFDRCxLQUFLO1FBQ0QsTUFBTSxHQUFHLEdBQUcsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNuQyxJQUFJLEdBQUcsRUFBRSxDQUFDO1lBQ04saUJBQWlCLEVBQUUsQ0FBQztZQUVwQixHQUFHLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDbEIsQ0FBQztJQUNMLENBQUM7Q0FDSixDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSB2dWUvb25lLWNvbXBvbmVudC1wZXItZmlsZSAqL1xyXG5cclxuaW1wb3J0IHsgQ2hpbGRQcm9jZXNzV2l0aG91dE51bGxTdHJlYW1zLCBzcGF3biB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xyXG5pbXBvcnQgeyBleGlzdHNTeW5jLCByZWFkRmlsZVN5bmMsIHdyaXRlRmlsZVN5bmMgfSBmcm9tICdmcy1leHRyYSc7XHJcbmltcG9ydCB7IGpvaW4gfSBmcm9tICdwYXRoJztcclxuaW1wb3J0IHsgY3JlYXRlQXBwLCBBcHAsIGRlZmluZUNvbXBvbmVudCB9IGZyb20gJ3Z1ZSc7XHJcbmltcG9ydCBvcyBmcm9tICdvcyc7XHJcbmNvbnN0IHBhbmVsRGF0YU1hcCA9IG5ldyBXZWFrTWFwPGFueSwgQXBwPigpO1xyXG4vKipcclxuICogQHpoIOWmguaenOW4jOacm+WFvOWuuSAzLjMg5LmL5YmN55qE54mI5pys5Y+v5Lul5L2/55So5LiL5pa555qE5Luj56CBXHJcbiAqIEBlbiBZb3UgY2FuIGFkZCB0aGUgY29kZSBiZWxvdyBpZiB5b3Ugd2FudCBjb21wYXRpYmlsaXR5IHdpdGggdmVyc2lvbnMgcHJpb3IgdG8gMy4zXHJcbiAqL1xyXG4vLyBFZGl0b3IuUGFuZWwuZGVmaW5lID0gRWRpdG9yLlBhbmVsLmRlZmluZSB8fCBmdW5jdGlvbihvcHRpb25zOiBhbnkpIHsgcmV0dXJuIG9wdGlvbnMgfVxyXG5cclxuaW50ZXJmYWNlIFBhY2tQcm9qZWN0IHtcclxuICAgIGlkOiBudW1iZXIsXHJcbiAgICBuYW1lOiBzdHJpbmcsXHJcbiAgICBwYXRoOiBzdHJpbmcsLy8gQ29jb3Ppobnnm67moLnnm67lvZVcclxuICAgIGNoYW5uZWw6IHN0cmluZywvLyDmjIflrprmiZPljIXlr7nlupTmuKDpgZPlkI3np7BcclxuICAgIHNraXA/OiBib29sZWFuLC8vIOaYr+WQpui3s+i/h2NvY29z5p6E5bu65bel56iL77yM55u05o6l5L2/55So5a+85Ye65bel56iLXHJcbiAgICB1cGxvYWQ/OiBib29sZWFuLy8g5piv5ZCm6ZyA6KaB5LiK5LygXHJcbiAgICBuZWVkQXV0b1BhY2s/OiBib29sZWFuLy8g5piv5ZCm6ZyA6KaB6L+b6KGM6Ieq5Yqo5p6E5bu65LiK5LygXHJcbn1cclxuXHJcbmNvbnN0IHBhY2tzUGF0aCA9IGpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vc3RhdGljL3BhY2tjb25maWdzL1BhY2tzLmpzb24nKTtcclxubGV0IHRhc2tMaXN0OiBQYWNrUHJvamVjdFtdID0gZXhpc3RzU3luYyhwYWNrc1BhdGgpID8gSlNPTi5wYXJzZShyZWFkRmlsZVN5bmMocGFja3NQYXRoLCAndXRmLTgnKSkucGFja3MgOiBbXTtcclxuXHJcbmNvbnN0IG1vZGlmeVBhY2thZ2VKc29uID0gKCkgPT4ge1xyXG4gICAgbGV0IGRhdGEgPSB7IHBhY2tzOiB0YXNrTGlzdCB9O1xyXG4gICAgbGV0IGRhdGFTdHIgPSBKU09OLnN0cmluZ2lmeShkYXRhLCBudWxsLCBcIlxcdFwiKTtcclxuICAgIHdyaXRlRmlsZVN5bmMoam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi9zdGF0aWMvcGFja2NvbmZpZ3MvUGFja3MuanNvbicpLCBkYXRhU3RyLCAndXRmLTgnKTtcclxufTtcclxuXHJcbmNvbnN0IG9wZW5EaWxvZyA9IGFzeW5jICh0eXBlOiBzdHJpbmcsIHRpdGxlOiBzdHJpbmcsIG1lc3NhZ2U6IHN0cmluZywgYnRuTWFwPzogTWFwPHN0cmluZywgRnVuY3Rpb24+LCBjYW5jZWw/OiBudW1iZXIpID0+IHtcclxuICAgIGxldCBvcHRpb246IEVkaXRvci5EaWFsb2cuTWVzc2FnZURpYWxvZ09wdGlvbnMgPSB7XHJcbiAgICAgICAgdGl0bGVcclxuICAgIH07XHJcbiAgICBpZiAoYnRuTWFwKSB7XHJcbiAgICAgICAgb3B0aW9uLmJ1dHRvbnMgPSBbXTtcclxuICAgICAgICBidG5NYXAuZm9yRWFjaCgodmFsdWUsIGtleSkgPT4ge1xyXG4gICAgICAgICAgICBvcHRpb24uYnV0dG9ucy5wdXNoKGtleSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBpZiAoY2FuY2VsICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICBvcHRpb24uY2FuY2VsID0gY2FuY2VsO1xyXG4gICAgfVxyXG4gICAgbGV0IGNvZGU6IHsgcmVzcG9uc2U6IDAsIGNoZWNrYm94Q2hlY2tlZDogZmFsc2UgfSA9IGF3YWl0IEVkaXRvci5EaWFsb2dbdHlwZV0obWVzc2FnZSwgb3B0aW9uKTtcclxuICAgIGlmIChidG5NYXApIHtcclxuICAgICAgICBsZXQga2V5ID0gb3B0aW9uLmJ1dHRvbnNbY29kZS5yZXNwb25zZV07XHJcbiAgICAgICAgaWYgKGJ0bk1hcC5oYXMoa2V5KSkge1xyXG4gICAgICAgICAgICBsZXQgZnVuYyA9IGJ0bk1hcC5nZXQoa2V5KTtcclxuICAgICAgICAgICAgaWYgKGZ1bmMpIHtcclxuICAgICAgICAgICAgICAgIGZ1bmMoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBFZGl0b3IuUGFuZWwuZGVmaW5lKHtcclxuICAgIGxpc3RlbmVyczoge1xyXG4gICAgICAgIHNob3coKSB7IGNvbnNvbGUubG9nKCdzaG93Jyk7IH0sXHJcbiAgICAgICAgaGlkZSgpIHsgY29uc29sZS5sb2coJ2hpZGUnKTsgfSxcclxuICAgIH0sXHJcbiAgICB0ZW1wbGF0ZTogcmVhZEZpbGVTeW5jKGpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vc3RhdGljL3RlbXBsYXRlL2RlZmF1bHQvaW5kZXguaHRtbCcpLCAndXRmLTgnKSxcclxuICAgIHN0eWxlOiByZWFkRmlsZVN5bmMoam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi9zdGF0aWMvc3R5bGUvZGVmYXVsdC9pbmRleC5jc3MnKSwgJ3V0Zi04JyksXHJcbiAgICAkOiB7XHJcbiAgICAgICAgYXBwOiAnI2FwcCcsXHJcbiAgICB9LFxyXG4gICAgbWV0aG9kczoge1xyXG5cclxuICAgIH0sXHJcbiAgICByZWFkeSgpIHtcclxuICAgICAgICBpZiAodGhpcy4kLmFwcCkge1xyXG4gICAgICAgICAgICBjb25zdCBhcHAgPSBjcmVhdGVBcHAoe30pO1xyXG4gICAgICAgICAgICBhcHAuY29uZmlnLmNvbXBpbGVyT3B0aW9ucy5pc0N1c3RvbUVsZW1lbnQgPSAodGFnKSA9PiB0YWcuc3RhcnRzV2l0aCgndWktJyk7XHJcblxyXG4gICAgICAgICAgICBhcHAuY29tcG9uZW50KCdNeVByb2plY3QnLCBkZWZpbmVDb21wb25lbnQoe1xyXG4gICAgICAgICAgICAgICAgZGF0YSgpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0YXNrTGlzdDogdGFza0xpc3QsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzQXV0b1BhY2s6IGZhbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBtZXRob2RzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3RhcnRBdXRvUGFjaygpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLnRhc2tMaXN0IHx8IHRoaXMudGFza0xpc3QubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgYnRuTWFwID0gbmV3IE1hcDxzdHJpbmcsIEZ1bmN0aW9uPigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnRuTWFwLnNldCgnYWRkJywgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkUHJvamVjdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBidG5NYXAuc2V0KCdjYW5jZWwnLCBudWxsKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnd2FybicsICd3YXJuJywgJ+ivt+WFiOa3u+WKoOiHquWKqOWMlumhueebrumFjee9ru+8gScsIGJ0bk1hcCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuaXNBdXRvUGFjaykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ3dhcm4nLCAn5q2j5Zyo6Ieq5Yqo5YyW77yM6K+356iN5ZCO5YaN6K+VIScpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGF1dG9QYWNrID0gKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCdpbmZvJywgJ3N0YXJ0JywgJ+W8gOWni+iHquWKqOWMlicpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pc0F1dG9QYWNrID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1vZGlmeVBhY2thZ2VKc29uKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgZGF0YSA9IHsgcGFja3M6IHRoaXMudGFza0xpc3QgfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBkYXRhU3RyID0gSlNPTi5zdHJpbmdpZnkoZGF0YSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDlsIYgSlNPTiDlrZfnrKbkuLLovazkuLogQmFzZTY0IOe8lueggSDpgb/lhY3lj4zlvJXlj7flnKjlkb3ku6TooYzkuK3ooqvlkIPmjolcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBiYXNlNjRTdHIgPSBCdWZmZXIuZnJvbShkYXRhU3RyKS50b1N0cmluZygnYmFzZTY0Jyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHBhdGggPSBqb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uL3N0YXRpYy9hdXRvLXBhY2svYnVpbGQvYXBwLmpzJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgYXJncyA9IFtwYXRoLCAnLS1wYWNrcycsIGJhc2U2NFN0cl07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHNwOiBDaGlsZFByb2Nlc3NXaXRob3V0TnVsbFN0cmVhbXMgPSBzcGF3bihcIm5vZGVcIiwgYXJncywgeyBzaGVsbDogdHJ1ZSB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNwLnN0ZG91dC5zZXRFbmNvZGluZygndXRmOCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3Auc3Rkb3V0Lm9uKCdkYXRhJywgKGRhdGEpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgc3Rkb3V0ICR7ZGF0YS50b1N0cmluZygpfWApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzcC5zdGRlcnIub24oJ2RhdGEnLCAoZGF0YSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBzdGRlcnIgJHtkYXRhLnRvU3RyaW5nKCl9YCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3Aub24oJ2V4aXQnLCAoY29kZSwgZGF0YSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb2RlID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnaW5mbycsICdzdXNjZXNzJywgJ+iHquWKqOWMluaIkOWKnyEnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnZXJyb3InLCAnZmFpbCcsICfoh6rliqjljJblpLHotKUhJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaXNBdXRvUGFjayA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGhhc1VwbG9hZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCB0YXNrIG9mIHRoaXMudGFza0xpc3QpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0YXNrLm5lZWRBdXRvUGFjayAmJiB0YXNrLnVwbG9hZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhc1VwbG9hZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGhhc1VwbG9hZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGJ0bk1hcCA9IG5ldyBNYXA8c3RyaW5nLCBGdW5jdGlvbj4oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ0bk1hcC5zZXQoJ29rJywgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF1dG9QYWNrKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnd2FybicsICd3YXJuJywgJ+aciea4uOaIj+mcgOimgeS4iuS8oO+8jOaYr+WQpue7p+e7rScsIGJ0bk1hcCwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdXRvUGFjaygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBhZGRQcm9qZWN0KCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgaWQgPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCB0YXNrIG9mIHRoaXMudGFza0xpc3QpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0YXNrLmlkID4gaWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZCA9IHRhc2suaWQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWQrKztcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YXNrTGlzdC5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogJycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiAnJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoYW5uZWw6ICcnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXBsb2FkOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNraXA6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmVlZEF1dG9QYWNrOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBkZWxQcm9qZWN0KGl0ZW06IFBhY2tQcm9qZWN0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBidG5NYXAgPSBuZXcgTWFwPHN0cmluZywgRnVuY3Rpb24+KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ0bk1hcC5zZXQoJ2RlbGV0ZScsICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGFza0xpc3QgPSB0aGlzLnRhc2tMaXN0LmZpbHRlcigodGFzazogUGFja1Byb2plY3QpID0+IHRhc2suaWQgIT09IGl0ZW0uaWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFza0xpc3QgPSB0aGlzLnRhc2tMaXN0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ2RlbGV0ZScsICfmmK/lkKbliKDpmaTphY3nva4/JywgYnRuTWFwLCAxKTtcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGltcG9ydFBhY2tzQ29uZmlnKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpbXBvcnRGdW5jID0gKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gMS4g5Yqo5oCB5Yib5bu65LiA5Liq6ZqQ6JeP55qEIGlucHV0IOagh+etvlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbnB1dCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXQudHlwZSA9ICdmaWxlJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOmZkOWItuWPquiDvemAieaLqSBqc29uIOaWh+S7tu+8jOWmguaenOWvvOWFpSBFeGNlbCDlj6/ku6XmlLnkuLogJy54bHN4LCAueGxzJ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXQuYWNjZXB0ID0gJy5qc29uJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0LnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gMi4g55uR5ZCs5paH5Lu26YCJ5oup55qE5Y+Y5YyWXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnB1dC5vbmNoYW5nZSA9IChlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZmlsZSA9IChlLnRhcmdldCBhcyBIVE1MSW5wdXRFbGVtZW50KS5maWxlcz8uWzBdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZmlsZSkgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAzLiDkvb/nlKggRmlsZVJlYWRlciDor7vlj5bmlofku7blhoXlrrlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlYWRlci5vbmxvYWQgPSAoZXZlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOiOt+WPluaWh+S7tumHjOeahOaWh+acrOWGheWuueW5tuino+aekOS4uiBKU09OXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBldmVudC50YXJnZXQ/LnJlc3VsdCBhcyBzdHJpbmc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpbXBvcnRlZERhdGEgPSBKU09OLnBhcnNlKHJlc3VsdCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5YGH6K6+5a+85YWl55qEIEpTT04g5qC85byP5Lmf5pivIHsgcGFja3M6IFsuLi5dIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbXBvcnRlZERhdGEucGFja3MgJiYgQXJyYXkuaXNBcnJheShpbXBvcnRlZERhdGEucGFja3MpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5bCG5a+85YWl55qE5pWw5o2u5pu/5o2i5Yiw5b2T5YmN55qEIHRhc2tMaXN0IOS4rVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGFza0xpc3QgPSBpbXBvcnRlZERhdGEucGFja3M7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFza0xpc3QgPSB0aGlzLnRhc2tMaXN0O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyA0LiDop6blj5Hkv53lrZjvvIzlsIbmlrDmlbDmja7lhpnlhaXmnKzlnLAgUGFja3MuanNvblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1vZGlmeVBhY2thZ2VKc29uKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWmguaenOaciSBFZGl0b3IuRGlhbG9n77yM5Y+v5Lul5by55Liq5oiQ5Yqf5o+Q56S6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCdpbmZvJywgJ+aPkOekuicsICflr7zlhaXmiJDlip/vvIEnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ+itpuWRiicsICflr7zlhaXnmoTmlofku7bmoLzlvI/kuI3mraPnoa7vvIEnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCdlcnJvcicsICfplJnor68nLCAn5paH5Lu26Kej5p6Q5aSx6LSl77yM6K+35qOA5p+l5paH5Lu25qC85byP77yBJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIDUuIOa4heeQhu+8muWwhuS4tOaXtuWIm+W7uueahCBpbnB1dCDmoIfnrb7ku47pobXpnaLkuK3np7vpmaRcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZChpbnB1dCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWFkZXIucmVhZEFzVGV4dChmaWxlKTsgLy8g5Lul5paH5pys5b2i5byP6K+75Y+W5paH5Lu2XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIDYuIOWwhiBpbnB1dCDmjILovb3liLDpobXpnaLlubbop6blj5Hngrnlh7vvvIzlvLnlh7rmlofku7bpgInmi6nmoYZcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoaW5wdXQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXQuY2xpY2soKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8g6K+05piO6Z2Z5oCB5paH5Lu25Lit5pyJIFBhY2tzLmpzb27kuobvvIzor6Lpl67mmK/lkKbmm7/mjaJcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudGFza0xpc3QgJiYgdGhpcy50YXNrTGlzdC5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgYnRuTWFwID0gbmV3IE1hcDxzdHJpbmcsIEZ1bmN0aW9uPigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnRuTWFwLnNldCgncmVwbGFjZScsICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbXBvcnRGdW5jKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ0bk1hcC5zZXQoJ2NhbmNlbCcsIG51bGwpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ3JlcGxhY2UnLCAnUGFja3MuanNvbiDlt7LlrZjlnKjvvIzmmK/lkKbmm7/mjaI/JywgYnRuTWFwKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGltcG9ydEZ1bmMoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgZXhwb3J0UGFja3NDb25maWcoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIOivtOaYjuayoeaciemFjee9rlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMudGFza0xpc3QgfHwgdGhpcy50YXNrTGlzdC5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnd2FybicsICforablkYonLCAn5rKh5pyJ6YWN572u77yM5peg5rOV5a+85Ye6Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIDEuIOe7hOijhemcgOimgeWvvOWHuueahOaVsOaNrlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZXhwb3J0RGF0YSA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYWNrczogdGhpcy50YXNrTGlzdFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGFTdHIgPSBKU09OLnN0cmluZ2lmeShleHBvcnREYXRhLCBudWxsLCBcIlxcdFwiKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAyLiDojrflj5blvZPliY3ns7vnu5/nmoTmoYzpnaLot6/lvoRcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRlc2t0b3BQYXRoID0gb3MuaG9tZWRpcigpICsgJy9EZXNrdG9wJztcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAzLiDmi7zmjqXlrozmlbTnmoTkv53lrZjot6/lvoRcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNhdmVQYXRoID0gam9pbihkZXNrdG9wUGF0aCwgYFBhY2tzLmpzb25gKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyA0LiDkvb/nlKggTm9kZS5qcyDljp/nlJ8gZnMg5qih5Z2X5ZCM5q2l5YaZ5YWl5paH5Lu25Yiw5qGM6Z2iXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3cml0ZUZpbGVTeW5jKHNhdmVQYXRoLCBkYXRhU3RyLCAndXRmLTgnKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyA1LiDlvLnlh7rmiJDlip/mj5DnpLpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnaW5mbycsICfmj5DnpLonLCBg6YWN572u5bey5oiQ5Yqf5a+85Ye65Yiw5qGM6Z2i77yBXFxu5paH5Lu25ZCN77yaJHtgUGFja3MuanNvbmB9YCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcign5a+85Ye65aSx6LSlOicsIGVycm9yKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnZXJyb3InLCAn6ZSZ6K+vJywgJ+WvvOWHuumFjee9ruaWh+S7tuWksei0pe+8jOivt+ajgOafpeadg+mZkO+8gScpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHRlbXBsYXRlOiByZWFkRmlsZVN5bmMoam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi9zdGF0aWMvdGVtcGxhdGUvdnVlL3Byb2plY3QuaHRtbCcpLCAndXRmLTgnKSxcclxuICAgICAgICAgICAgfSkpO1xyXG4gICAgICAgICAgICBhcHAubW91bnQodGhpcy4kLmFwcCk7XHJcbiAgICAgICAgICAgIHBhbmVsRGF0YU1hcC5zZXQodGhpcywgYXBwKTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG4gICAgYmVmb3JlQ2xvc2UoKSB7XHJcbiAgICB9LFxyXG4gICAgY2xvc2UoKSB7XHJcbiAgICAgICAgY29uc3QgYXBwID0gcGFuZWxEYXRhTWFwLmdldCh0aGlzKTtcclxuICAgICAgICBpZiAoYXBwKSB7XHJcbiAgICAgICAgICAgIG1vZGlmeVBhY2thZ2VKc29uKCk7XHJcblxyXG4gICAgICAgICAgICBhcHAudW5tb3VudCgpO1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcbn0pO1xyXG4iXX0=