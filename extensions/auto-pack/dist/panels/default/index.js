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
const child_process_1 = require("child_process");
const fs_extra_1 = require("fs-extra");
const path_1 = __importStar(require("path"));
const vue_1 = require("vue");
const os_1 = __importDefault(require("os"));
const main_1 = require("../../main");
const panelDataMap = new WeakMap();
const packsPath = (0, path_1.join)(__dirname, '../../../static/packconfigs/Packs.json');
let taskList = (0, fs_extra_1.existsSync)(packsPath) ? JSON.parse((0, fs_extra_1.readFileSync)(packsPath, 'utf-8')).packs : [];
const TaskTemp = {
    appId: '',
    name: '',
    path: '',
    channel: 'taobao-mini-game',
    skip: false,
    upload: false,
    needAutoPack: false,
    platformFiles: {
        'taobao-mini-game': {
            path: '',
            isTest: false
        }
    },
    postToDingTalk: true,
    md5Cache: false,
    sourceMaps: false,
    enableHighPerformanceMode: true,
    customConfigPath: '',
    mainBundleCompressionType: 'none',
    dingTalkWebHook: '',
    dingTalkCustomContent_pack: '',
    dingTalkCustomContent_upload: '',
    enginePath: '',
    engineVer: '',
    navigationBarTextStyle: 'black'
};
const modifyPackageJson = () => {
    for (let i = 0; i < taskList.length; i++) {
        taskList[i] = Object.assign(Object.assign({}, TaskTemp), taskList[i]);
    }
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
                        isCheckLogin: false,
                        qrCodeUrl: '',
                    };
                },
                methods: {
                    startAutoPack() {
                        let testServerWarns = '';
                        if (!this.taskList || this.taskList.length === 0) {
                            let btnMap = new Map();
                            btnMap.set('add', () => {
                                this.addProject();
                            });
                            btnMap.set('cancel', null);
                            (0, exports.openDilog)('warn', 'warn', '请先添加自动化项目配置！', btnMap);
                            return;
                        }
                        if (this.getAutoCount() === 0) {
                            (0, exports.openDilog)('warn', 'warn', '无自动化项目!');
                            return;
                        }
                        for (let i = 0; i < this.taskList.length; i++) {
                            this.taskList[i] = Object.assign(Object.assign({}, TaskTemp), this.taskList[i]);
                            let task = this.taskList[i];
                            if (task.needAutoPack === false)
                                continue;
                            if (!task.appId) {
                                (0, exports.openDilog)('warn', 'warn', '自动化项目中未配置appId，请检查配置！');
                                return;
                            }
                            if (!task.path) {
                                (0, exports.openDilog)('warn', 'warn', '自动化项目中未配置项目路径，请检查配置！');
                                return;
                            }
                            if (!task.channel) {
                                (0, exports.openDilog)('warn', 'warn', '自动化项目中未配置渠道平台，请检查配置！');
                                return;
                            }
                            if (!task.enginePath) {
                                (0, exports.openDilog)('warn', 'warn', '自动化项目中未配置引擎路径，请检查配置！');
                                return;
                            }
                            if (!task.engineVer) {
                                (0, exports.openDilog)('warn', 'warn', '自动化项目中未配置引擎版本，请检查配置！');
                                return;
                            }
                            let platformFilepath = this.getPlatformFile(task);
                            if (platformFilepath) {
                                const normalizedPath = path_1.default.normalize(task.path);
                                if (platformFilepath.indexOf(normalizedPath) < 0) {
                                    (0, exports.openDilog)('warn', 'warn', `appId:${task.appId}${task.name},${task.channel}配置不在项目路径中,请检查配置！`);
                                    return;
                                }
                                let isTest = this.getPlatformFileServer(task);
                                if (isTest && task.upload && !task.skip) {
                                    testServerWarns += `注意！！${task.appId}：${task.name}，使用的测试服！！\n`;
                                }
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
                            let path = (0, path_1.join)(__dirname, '../../../static/auto-pack/build/app.js');
                            let args = [path];
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
                        if (testServerWarns) {
                            msg += testServerWarns;
                        }
                        let btnMap = new Map();
                        btnMap.set('ok', () => {
                            checkTaobao(() => { autoPack(); });
                        });
                        (0, exports.openDilog)('warn', 'warn', `${msg}开始自动化?`, btnMap, 1);
                    },
                    addProject() {
                        this.taskList.push(Object.assign({}, TaskTemp));
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
                                this.taskList[i].skip = true;
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
                            item.skip = true;
                        }
                    },
                    setPlatformFile(item, path) {
                        if (!item.platformFiles) {
                            item.platformFiles = {};
                        }
                        if (!item.platformFiles[item.channel]) {
                            item.platformFiles[item.channel] = { path: '', isTest: false };
                        }
                        item.platformFiles[item.channel].path = path;
                    },
                    setPlatformFileServer(item, isTest) {
                        if (!item.platformFiles) {
                            item.platformFiles = {};
                        }
                        if (!item.platformFiles[item.channel]) {
                            item.platformFiles[item.channel] = { path: '', isTest: false };
                        }
                        item.platformFiles[item.channel].isTest = isTest;
                    },
                    getPlatformFile(item) {
                        if (item.platformFiles && item.platformFiles[item.channel]) {
                            return item.platformFiles[item.channel].path || '';
                        }
                        else {
                            return '';
                        }
                    },
                    getPlatformFileServer(item) {
                        if (item.platformFiles && item.platformFiles[item.channel]) {
                            return item.platformFiles[item.channel].isTest || false;
                        }
                        else {
                            return false;
                        }
                    },
                    getTaoBaoDebugUrl(appId) {
                        if (!appId) {
                            (0, exports.openDilog)('warn', 'warn', '请输入正确的appId');
                            return;
                        }
                        this.isCheckLogin = true;
                        let version = '';
                        let sp = (0, child_process_1.spawn)("tbopen", ['app', '-a', appId], { shell: true });
                        sp.stdout.setEncoding('utf8');
                        sp.stdout.on('data', (data) => {
                            console.log(`getTaoBaoDebugUrl stdout ${data.toString()}`);
                            let str = data.trim();
                            let arr = str.split('最新线上版本:');
                            version = arr[1].trim();
                        });
                        sp.stderr.on('data', (data) => {
                            console.log(`getTaoBaoDebugUrl stderr ${data.toString()}`);
                        });
                        sp.on('exit', async (code, data) => {
                            this.isCheckLogin = false;
                            if (version) {
                                console.log(`getTaoBaoDebugUrl suscess ${data}`);
                                let url = `https://m.duanqu.com?_ariver_appid=${appId}&nbsv=${version}&nbsource=debug&nbsn=TRIAL&_mp_code=tb&_container_type=gm&vconsole=true`;
                                this.qrCodeUrl = url;
                            }
                            else {
                                (0, exports.openDilog)('error', '失败', '复制链接失败!');
                            }
                        });
                    },
                    closeQrCode() {
                        this.qrCodeUrl = '';
                    },
                    async copyLink() {
                        if (this.qrCodeUrl !== '') {
                            try {
                                await navigator.clipboard.writeText(this.qrCodeUrl);
                                (0, exports.openDilog)('info', '完成', `复制链接成功，可粘贴使用！`);
                            }
                            catch (error) {
                                (0, exports.openDilog)('error', '失败', `复制链接失败! ${error}`);
                            }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zb3VyY2UvcGFuZWxzL2RlZmF1bHQvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLCtDQUErQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRS9DLGlEQUE0RTtBQUM1RSx1Q0FBbUU7QUFDbkUsNkNBQWtDO0FBQ2xDLDZCQUFzRDtBQUN0RCw0Q0FBb0I7QUFDcEIscUNBQThEO0FBQzlELE1BQU0sWUFBWSxHQUFHLElBQUksT0FBTyxFQUFZLENBQUM7QUE4QjdDLE1BQU0sU0FBUyxHQUFHLElBQUEsV0FBSSxFQUFDLFNBQVMsRUFBRSx3Q0FBd0MsQ0FBQyxDQUFDO0FBQzVFLElBQUksUUFBUSxHQUFrQixJQUFBLHFCQUFVLEVBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBQSx1QkFBWSxFQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0FBQzlHLE1BQU0sUUFBUSxHQUFnQjtJQUMxQixLQUFLLEVBQUUsRUFBRTtJQUNULElBQUksRUFBRSxFQUFFO0lBQ1IsSUFBSSxFQUFFLEVBQUU7SUFDUixPQUFPLEVBQUUsa0JBQWtCO0lBQzNCLElBQUksRUFBRSxLQUFLO0lBQ1gsTUFBTSxFQUFFLEtBQUs7SUFDYixZQUFZLEVBQUUsS0FBSztJQUNuQixhQUFhLEVBQUU7UUFDWCxrQkFBa0IsRUFBRTtZQUNoQixJQUFJLEVBQUUsRUFBRTtZQUNSLE1BQU0sRUFBRSxLQUFLO1NBQ2hCO0tBQ0o7SUFDRCxjQUFjLEVBQUUsSUFBSTtJQUNwQixRQUFRLEVBQUUsS0FBSztJQUNmLFVBQVUsRUFBRSxLQUFLO0lBQ2pCLHlCQUF5QixFQUFFLElBQUk7SUFDL0IsZ0JBQWdCLEVBQUUsRUFBRTtJQUNwQix5QkFBeUIsRUFBRSxNQUFNO0lB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QUFFLDJDQUEyQyxDQUFDLEVBQUUsT0FBTyxDQUFDO2FBQ2hHLENBQUMsQ0FBQyxDQUFDO1lBQ0osR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3RCLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ2hDLENBQUM7SUFDTCxDQUFDO0lBQ0QsV0FBVztJQUNYLENBQUM7SUFDRCxLQUFLO1FBQ0QsTUFBTSxHQUFHLEdBQUcsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNuQyxJQUFJLEdBQUcsRUFBRSxDQUFDO1lBQ04saUJBQWlCLEVBQUUsQ0FBQztZQUVwQixHQUFHLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDbEIsQ0FBQztJQUNMLENBQUM7Q0FDSixDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSB2dWUvb25lLWNvbXBvbmVudC1wZXItZmlsZSAqL1xuXG5pbXBvcnQgeyBDaGlsZFByb2Nlc3NXaXRob3V0TnVsbFN0cmVhbXMsIHNwYXduLCBleGVjIH0gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgeyBleGlzdHNTeW5jLCByZWFkRmlsZVN5bmMsIHdyaXRlRmlsZVN5bmMgfSBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgcGF0aCwgeyBqb2luIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBjcmVhdGVBcHAsIEFwcCwgZGVmaW5lQ29tcG9uZW50IH0gZnJvbSAndnVlJztcbmltcG9ydCBvcyBmcm9tICdvcyc7XG5pbXBvcnQgeyBjaGVja1Rhb2Jhb0xvZ2luLCBsb2dpbkZvclRhb2JhbyB9IGZyb20gJy4uLy4uL21haW4nO1xuY29uc3QgcGFuZWxEYXRhTWFwID0gbmV3IFdlYWtNYXA8YW55LCBBcHA+KCk7XG4vKipcbiAqIEB6aCDlpoLmnpzluIzmnJvlhbzlrrkgMy4zIOS5i+WJjeeahOeJiOacrOWPr+S7peS9v+eUqOS4i+aWueeahOS7o+eggVxuICogQGVuIFlvdSBjYW4gYWRkIHRoZSBjb2RlIGJlbG93IGlmIHlvdSB3YW50IGNvbXBhdGliaWxpdHkgd2l0aCB2ZXJzaW9ucyBwcmlvciB0byAzLjNcbiAqL1xuLy8gRWRpdG9yLlBhbmVsLmRlZmluZSA9IEVkaXRvci5QYW5lbC5kZWZpbmUgfHwgZnVuY3Rpb24ob3B0aW9uczogYW55KSB7IHJldHVybiBvcHRpb25zIH1cblxuaW50ZXJmYWNlIFBhY2tQcm9qZWN0IHtcbiAgICBhcHBJZDogc3RyaW5nLFxuICAgIG5hbWU6IHN0cmluZyxcbiAgICBwYXRoOiBzdHJpbmcsLy8gQ29jb3Ppobnnm67moLnnm67lvZVcbiAgICBjaGFubmVsOiBzdHJpbmcsLy8g5oyH5a6a5omT5YyF5a+55bqU5rig6YGT5ZCN56ewXG4gICAgc2tpcDogYm9vbGVhbiwvLyDmmK/lkKbot7Pov4djb2Nvc+aehOW7uuW3peeoi++8jOebtOaOpeS9v+eUqOWvvOWHuuW3peeoi1xuICAgIHVwbG9hZDogYm9vbGVhbiwvLyDmmK/lkKbpnIDopoHkuIrkvKBcbiAgICBuZWVkQXV0b1BhY2s6IGJvb2xlYW4sLy8g5piv5ZCm6ZyA6KaB6L+b6KGM6Ieq5Yqo5p6E5bu65LiK5LygXG4gICAgcGxhdGZvcm1GaWxlczogeyBba2V5OiBzdHJpbmddOiB7IHBhdGg6IHN0cmluZywgaXNUZXN0OiBib29sZWFuIH0gfSwvLyBrZXnlubPlj7DlkI3np7DkuI5jaGFubmVs5a+55bqU77yMdmFsdWXmuLjmiI/lt6XnqIvkuK3lubPlj7DnmoTphY3nva7mlofku7ZcbiAgICBwb3N0VG9EaW5nVGFsazogYm9vbGVhbiwvLyDmmK/lkKbmjqjpgIHpkonpkolcbiAgICBtZDVDYWNoZTogYm9vbGVhbixcbiAgICBzb3VyY2VNYXBzOiBib29sZWFuLFxuICAgIGVuYWJsZUhpZ2hQZXJmb3JtYW5jZU1vZGU6IGJvb2xlYW4sLy/mmK/lkKblvIDlkK/pq5jmgKfog73mqKHlvI9cbiAgICBjdXN0b21Db25maWdQYXRoOiBzdHJpbmcsLy/oh6rlrprkuYnmnoTlu7rmqKHmnb9qc29u6Lev5b6EXG4gICAgbWFpbkJ1bmRsZUNvbXByZXNzaW9uVHlwZTogc3RyaW5nLC8v5Li75YyF5Y6L57yp57G75Z6LICDml6DljovnvKnvvJogXCJub25lXCIgIOWQiOW5tuS+nei1lu+8miBcIm1lcmdlX2RlcFwiICDlkIjlubbmiYDmnIlKU09O77yaIFwibWVyZ2VfYWxsX2pzb25cIiAgWklQ77yaIFwiemlwXCIgIOWwj+a4uOaIj+WIhuWMhe+8miBcInN1YnBhY2thZ2VcIlxuICAgIGRpbmdUYWxrV2ViSG9vazogc3RyaW5nLC8vIOmSiemSieacuuWZqOS6uueahHdlYmhvb2vlnLDlnYBcbiAgICBkaW5nVGFsa0N1c3RvbUNvbnRlbnRfcGFjazogc3RyaW5nLC8vIOmSiemSieacuuWZqOS6uueahOiHquWumuS5ieWGheWuuVxuICAgIGRpbmdUYWxrQ3VzdG9tQ29udGVudF91cGxvYWQ6IHN0cmluZywvLyDpkonpkonmnLrlmajkurrnmoToh6rlrprkuYnlhoXlrrlcbiAgICBlbmdpbmVQYXRoOiBzdHJpbmcsLy8gY29jb3PlvJXmk47ot6/lvoRcbiAgICBlbmdpbmVWZXI6IHN0cmluZywvLyBjb2Nvc+W8leaTjueJiOacrFxuICAgIG5hdmlnYXRpb25CYXJUZXh0U3R5bGU6IHN0cmluZywvLyDlr7zoiKrmoI/moIfpopjpopzoibJcbn1cblxuY29uc3QgcGFja3NQYXRoID0gam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi9zdGF0aWMvcGFja2NvbmZpZ3MvUGFja3MuanNvbicpO1xubGV0IHRhc2tMaXN0OiBQYWNrUHJvamVjdFtdID0gZXhpc3RzU3luYyhwYWNrc1BhdGgpID8gSlNPTi5wYXJzZShyZWFkRmlsZVN5bmMocGFja3NQYXRoLCAndXRmLTgnKSkucGFja3MgOiBbXTtcbmNvbnN0IFRhc2tUZW1wOiBQYWNrUHJvamVjdCA9IHtcbiAgICBhcHBJZDogJycsXG4gICAgbmFtZTogJycsXG4gICAgcGF0aDogJycsXG4gICAgY2hhbm5lbDogJ3Rhb2Jhby1taW5pLWdhbWUnLFxuICAgIHNraXA6IGZhbHNlLFxuICAgIHVwbG9hZDogZmFsc2UsXG4gICAgbmVlZEF1dG9QYWNrOiBmYWxzZSxcbiAgICBwbGF0Zm9ybUZpbGVzOiB7XG4gICAgICAgICd0YW9iYW8tbWluaS1nYW1lJzoge1xuICAgICAgICAgICAgcGF0aDogJycsXG4gICAgICAgICAgICBpc1Rlc3Q6IGZhbHNlXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHBvc3RUb0RpbmdUYWxrOiB0cnVlLFxuICAgIG1kNUNhY2hlOiBmYWxzZSxcbiAgICBzb3VyY2VNYXBzOiBmYWxzZSxcbiAgICBlbmFibGVIaWdoUGVyZm9ybWFuY2VNb2RlOiB0cnVlLFxuICAgIGN1c3RvbUNvbmZpZ1BhdGg6ICcnLFxuICAgIG1haW5CdW5kbGVDb21wcmVzc2lvblR5cGU6ICdub25lJyxcbiAgICBkaW5nVGFsa1dlYkhvb2s6ICcnLFxuICAgIGRpbmdUYWxrQ3VzdG9tQ29udGVudF9wYWNrOiAnJyxcbiAgICBkaW5nVGFsa0N1c3RvbUNvbnRlbnRfdXBsb2FkOiAnJyxcbiAgICBlbmdpbmVQYXRoOiAnJyxcbiAgICBlbmdpbmVWZXI6ICcnLFxuICAgIG5hdmlnYXRpb25CYXJUZXh0U3R5bGU6ICdibGFjaydcbn07XG5cbmNvbnN0IG1vZGlmeVBhY2thZ2VKc29uID0gKCkgPT4ge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGFza0xpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdGFza0xpc3RbaV0gPSB7IC4uLlRhc2tUZW1wLCAuLi50YXNrTGlzdFtpXSB9O1xuICAgIH1cbiAgICBsZXQgZGF0YSA9IHsgcGFja3M6IHRhc2tMaXN0IH07XG4gICAgbGV0IGRhdGFTdHIgPSBKU09OLnN0cmluZ2lmeShkYXRhLCBudWxsLCBcIlxcdFwiKTtcbiAgICB3cml0ZUZpbGVTeW5jKGpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vc3RhdGljL3BhY2tjb25maWdzL1BhY2tzLmpzb24nKSwgZGF0YVN0ciwgJ3V0Zi04Jyk7XG59O1xuXG5leHBvcnQgY29uc3Qgb3BlbkRpbG9nID0gYXN5bmMgKHR5cGU6IHN0cmluZywgdGl0bGU6IHN0cmluZywgbWVzc2FnZTogc3RyaW5nLCBidG5NYXA/OiBNYXA8c3RyaW5nLCBGdW5jdGlvbj4sIGNhbmNlbD86IG51bWJlcikgPT4ge1xuICAgIGxldCBvcHRpb246IEVkaXRvci5EaWFsb2cuTWVzc2FnZURpYWxvZ09wdGlvbnMgPSB7XG4gICAgICAgIHRpdGxlXG4gICAgfTtcbiAgICBpZiAoYnRuTWFwKSB7XG4gICAgICAgIG9wdGlvbi5idXR0b25zID0gW107XG4gICAgICAgIGJ0bk1hcC5mb3JFYWNoKCh2YWx1ZSwga2V5KSA9PiB7XG4gICAgICAgICAgICBvcHRpb24uYnV0dG9ucy5wdXNoKGtleSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBpZiAoY2FuY2VsICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgb3B0aW9uLmNhbmNlbCA9IGNhbmNlbDtcbiAgICB9XG4gICAgbGV0IGNvZGU6IHsgcmVzcG9uc2U6IDAsIGNoZWNrYm94Q2hlY2tlZDogZmFsc2UgfSA9IGF3YWl0IEVkaXRvci5EaWFsb2dbdHlwZV0obWVzc2FnZSwgb3B0aW9uKTtcbiAgICBpZiAoYnRuTWFwKSB7XG4gICAgICAgIGxldCBrZXkgPSBvcHRpb24uYnV0dG9uc1tjb2RlLnJlc3BvbnNlXTtcbiAgICAgICAgaWYgKGJ0bk1hcC5oYXMoa2V5KSkge1xuICAgICAgICAgICAgbGV0IGZ1bmMgPSBidG5NYXAuZ2V0KGtleSk7XG4gICAgICAgICAgICBpZiAoZnVuYykge1xuICAgICAgICAgICAgICAgIGZ1bmMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBFZGl0b3IuUGFuZWwuZGVmaW5lKHtcbiAgICBsaXN0ZW5lcnM6IHtcbiAgICAgICAgc2hvdygpIHsgY29uc29sZS5sb2coJ3Nob3cnKTsgfSxcbiAgICAgICAgaGlkZSgpIHsgY29uc29sZS5sb2coJ2hpZGUnKTsgfSxcbiAgICB9LFxuICAgIHRlbXBsYXRlOiByZWFkRmlsZVN5bmMoam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi9zdGF0aWMvdGVtcGxhdGUvZGVmYXVsdC9pbmRleC5odG1sJyksICd1dGYtOCcpLFxuICAgIHN0eWxlOiByZWFkRmlsZVN5bmMoam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi9zdGF0aWMvc3R5bGUvZGVmYXVsdC9pbmRleC5jc3MnKSwgJ3V0Zi04JyksXG4gICAgJDoge1xuICAgICAgICBhcHA6ICcjYXBwJyxcbiAgICB9LFxuICAgIG1ldGhvZHM6IHtcblxuICAgIH0sXG4gICAgcmVhZHkoKSB7XG4gICAgICAgIGlmICh0aGlzLiQuYXBwKSB7XG4gICAgICAgICAgICBjb25zdCBhcHAgPSBjcmVhdGVBcHAoe30pO1xuICAgICAgICAgICAgYXBwLmNvbmZpZy5jb21waWxlck9wdGlvbnMuaXNDdXN0b21FbGVtZW50ID0gKHRhZykgPT4gdGFnLnN0YXJ0c1dpdGgoJ3VpLScpO1xuXG4gICAgICAgICAgICBhcHAuY29tcG9uZW50KCdNeVByb2plY3QnLCBkZWZpbmVDb21wb25lbnQoe1xuICAgICAgICAgICAgICAgIGRhdGEoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0YXNrTGlzdDogdGFza0xpc3QsXG4gICAgICAgICAgICAgICAgICAgICAgICBpc0F1dG9QYWNrOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzQ2hlY2tMb2dpbjogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBxckNvZGVVcmw6ICcnLFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgbWV0aG9kczoge1xuICAgICAgICAgICAgICAgICAgICBzdGFydEF1dG9QYWNrKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHRlc3RTZXJ2ZXJXYXJuczogc3RyaW5nID0gJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMudGFza0xpc3QgfHwgdGhpcy50YXNrTGlzdC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgYnRuTWFwID0gbmV3IE1hcDxzdHJpbmcsIEZ1bmN0aW9uPigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ0bk1hcC5zZXQoJ2FkZCcsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGRQcm9qZWN0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnRuTWFwLnNldCgnY2FuY2VsJywgbnVsbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ3dhcm4nLCAn6K+35YWI5re75Yqg6Ieq5Yqo5YyW6aG555uu6YWN572u77yBJywgYnRuTWFwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5nZXRBdXRvQ291bnQoKSA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnd2FybicsICd3YXJuJywgJ+aXoOiHquWKqOWMlumhueebriEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudGFza0xpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhc2tMaXN0W2ldID0geyAuLi5UYXNrVGVtcCwgLi4udGhpcy50YXNrTGlzdFtpXSB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCB0YXNrOiBQYWNrUHJvamVjdCA9IHRoaXMudGFza0xpc3RbaV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRhc2submVlZEF1dG9QYWNrID09PSBmYWxzZSkgY29udGludWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0YXNrLmFwcElkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnd2FybicsICd3YXJuJywgJ+iHquWKqOWMlumhueebruS4reacqumFjee9rmFwcElk77yM6K+35qOA5p+l6YWN572u77yBJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0YXNrLnBhdGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ3dhcm4nLCAn6Ieq5Yqo5YyW6aG555uu5Lit5pyq6YWN572u6aG555uu6Lev5b6E77yM6K+35qOA5p+l6YWN572u77yBJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0YXNrLmNoYW5uZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ3dhcm4nLCAn6Ieq5Yqo5YyW6aG555uu5Lit5pyq6YWN572u5rig6YGT5bmz5Y+w77yM6K+35qOA5p+l6YWN572u77yBJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0YXNrLmVuZ2luZVBhdGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ3dhcm4nLCAn6Ieq5Yqo5YyW6aG555uu5Lit5pyq6YWN572u5byV5pOO6Lev5b6E77yM6K+35qOA5p+l6YWN572u77yBJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0YXNrLmVuZ2luZVZlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAnd2FybicsICfoh6rliqjljJbpobnnm67kuK3mnKrphY3nva7lvJXmk47niYjmnKzvvIzor7fmo4Dmn6XphY3nva7vvIEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwbGF0Zm9ybUZpbGVwYXRoID0gdGhpcy5nZXRQbGF0Zm9ybUZpbGUodGFzayk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBsYXRmb3JtRmlsZXBhdGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgbm9ybWFsaXplZFBhdGggPSBwYXRoLm5vcm1hbGl6ZSh0YXNrLnBhdGgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocGxhdGZvcm1GaWxlcGF0aC5pbmRleE9mKG5vcm1hbGl6ZWRQYXRoKSA8IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnd2FybicsICd3YXJuJywgYGFwcElkOiR7dGFzay5hcHBJZH0ke3Rhc2submFtZX0sJHt0YXNrLmNoYW5uZWx96YWN572u5LiN5Zyo6aG555uu6Lev5b6E5LitLOivt+ajgOafpemFjee9ru+8gWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBpc1Rlc3QgPSB0aGlzLmdldFBsYXRmb3JtRmlsZVNlcnZlcih0YXNrKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzVGVzdCAmJiB0YXNrLnVwbG9hZCAmJiAhdGFzay5za2lwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXN0U2VydmVyV2FybnMgKz0gYOazqOaEj++8ge+8gSR7dGFzay5hcHBJZH3vvJoke3Rhc2submFtZX3vvIzkvb/nlKjnmoTmtYvor5XmnI3vvIHvvIFcXG5gXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5pc0F1dG9QYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ3dhcm4nLCAn5q2j5Zyo6Ieq5Yqo5YyW77yM6K+356iN5ZCO5YaN6K+VIScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY2hlY2tUYW9iYW8gPSAoZnVuYzogRnVuY3Rpb24pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgY2hlY2sgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCB0YXNrIG9mIHRoaXMudGFza0xpc3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRhc2suY2hhbm5lbCA9PT0gJ3Rhb2Jhby1taW5pLWdhbWUnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGVjayA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2hlY2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pc0NoZWNrTG9naW4gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGVja1Rhb2Jhb0xvZ2luKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaXNDaGVja0xvZ2luID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnVuYyAmJiBmdW5jKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaXNDaGVja0xvZ2luID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ3dhcm4nLCAn5reY5a6d55m75b2V5oCB6L+H5pyf77yM6K+36YeN5paw55m75b2VIScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnVuYyAmJiBmdW5jKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhdXRvUGFjayA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ2luZm8nLCAnc3RhcnQnLCAn5byA5aeL6Ieq5Yqo5YyWJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pc0F1dG9QYWNrID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtb2RpZnlQYWNrYWdlSnNvbigpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHBhdGggPSBqb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uL3N0YXRpYy9hdXRvLXBhY2svYnVpbGQvYXBwLmpzJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFyZ3MgPSBbcGF0aF07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHNwOiBDaGlsZFByb2Nlc3NXaXRob3V0TnVsbFN0cmVhbXMgPSBzcGF3bihcIm5vZGVcIiwgYXJncywgeyBzaGVsbDogdHJ1ZSB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzcC5zdGRvdXQuc2V0RW5jb2RpbmcoJ3V0ZjgnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzcC5zdGRvdXQub24oJ2RhdGEnLCAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgYXV0b1BhY2sgc3Rkb3V0ICR7ZGF0YS50b1N0cmluZygpfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNwLnN0ZGVyci5vbignZGF0YScsIChkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBhdXRvUGFjayBzdGRlcnIgJHtkYXRhLnRvU3RyaW5nKCl9YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzcC5vbignZXhpdCcsIChjb2RlLCBkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb2RlID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgYXV0b1BhY2sgZXhpdCBzdXNjZXNzICR7ZGF0YX1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnaW5mbycsICflrozmiJAnLCAn6Ieq5Yqo5YyW5a6M5oiQIScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYGF1dG9QYWNrIGV4aXQgZmFpbCAke2RhdGF9YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ2Vycm9yJywgJ+Wksei0pScsICfoh6rliqjljJblpLHotKUhJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pc0F1dG9QYWNrID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbXNnID0gJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgdXBsb2FkQ291bnQgPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHBhY2tDb3VudCA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgYXV0b0NvdW50ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IHRhc2sgb2YgdGhpcy50YXNrTGlzdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0YXNrLm5lZWRBdXRvUGFjaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdXRvQ291bnQrKztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRhc2sudXBsb2FkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cGxvYWRDb3VudCsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGFzay5za2lwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYWNrQ291bnQrKztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtc2cgKz0gYCR7dGFzay5hcHBJZH3vvJoke3Rhc2submFtZX3vvIzmnoTlu7rvvJokeyh0YXNrLnNraXAgPyAn4pyVJyA6ICfinJMnKX3vvIzkuIrkvKDvvJokeyh0YXNrLnVwbG9hZCA/ICfinJMnIDogJ+KclScpfVxcbmA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgbXNnICs9IGDoh6rliqjljJbvvJoke2F1dG9Db3VudH3kuKrvvIzmnoTlu7rvvJoke3BhY2tDb3VudH3kuKrvvIzkuIrkvKDvvJoke3VwbG9hZENvdW50feS4qlxcbmA7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGVzdFNlcnZlcldhcm5zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXNnICs9IHRlc3RTZXJ2ZXJXYXJucztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBidG5NYXAgPSBuZXcgTWFwPHN0cmluZywgRnVuY3Rpb24+KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBidG5NYXAuc2V0KCdvaycsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGVja1Rhb2JhbygoKSA9PiB7IGF1dG9QYWNrKCk7IH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAnd2FybicsIGAke21zZ33lvIDlp4voh6rliqjljJY/YCwgYnRuTWFwLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgYWRkUHJvamVjdCgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGFza0xpc3QucHVzaCh7IC4uLlRhc2tUZW1wIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCdpbmZvJywgJ2FkZCcsICfmt7vliqDmiJDlip8nKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZGVsUHJvamVjdChpdGVtOiBQYWNrUHJvamVjdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGJ0bk1hcCA9IG5ldyBNYXA8c3RyaW5nLCBGdW5jdGlvbj4oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ0bk1hcC5zZXQoJ2RlbGV0ZScsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudGFza0xpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHRhc2sgPSB0aGlzLnRhc2tMaXN0W2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGFzay5hcHBJZCA9PT0gaXRlbS5hcHBJZCAmJiB0YXNrLm5hbWUgPT09IGl0ZW0ubmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YXNrTGlzdC5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ2RlbGV0ZScsICfmmK/lkKbliKDpmaTphY3nva4/JywgYnRuTWFwLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgaW1wb3J0UGFja3NDb25maWcoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpbXBvcnRGdW5jID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIDEuIOWKqOaAgeWIm+W7uuS4gOS4qumakOiXj+eahCBpbnB1dCDmoIfnrb5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXQudHlwZSA9ICdmaWxlJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDpmZDliLblj6rog73pgInmi6kganNvbiDmlofku7bvvIzlpoLmnpzlr7zlhaUgRXhjZWwg5Y+v5Lul5pS55Li6ICcueGxzeCwgLnhscydcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnB1dC5hY2NlcHQgPSAnLmpzb24nO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0LnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAyLiDnm5HlkKzmlofku7bpgInmi6nnmoTlj5jljJZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnB1dC5vbmNoYW5nZSA9IChlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbGUgPSAoZS50YXJnZXQgYXMgSFRNTElucHV0RWxlbWVudCkuZmlsZXM/LlswXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFmaWxlKSByZXR1cm47XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gMy4g5L2/55SoIEZpbGVSZWFkZXIg6K+75Y+W5paH5Lu25YaF5a65XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlYWRlci5vbmxvYWQgPSAoZXZlbnQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g6I635Y+W5paH5Lu26YeM55qE5paH5pys5YaF5a655bm26Kej5p6Q5Li6IEpTT05cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBldmVudC50YXJnZXQ/LnJlc3VsdCBhcyBzdHJpbmc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaW1wb3J0ZWREYXRhID0gSlNPTi5wYXJzZShyZXN1bHQpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5YGH6K6+5a+85YWl55qEIEpTT04g5qC85byP5Lmf5pivIHsgcGFja3M6IFsuLi5dIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW1wb3J0ZWREYXRhLnBhY2tzICYmIEFycmF5LmlzQXJyYXkoaW1wb3J0ZWREYXRhLnBhY2tzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDlsIblr7zlhaXnmoTmlbDmja7mm7/mjaLliLDlvZPliY3nmoQgdGFza0xpc3Qg5LitXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGFza0xpc3QgPSBpbXBvcnRlZERhdGEucGFja3M7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhc2tMaXN0ID0gdGhpcy50YXNrTGlzdDtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyA0LiDop6blj5Hkv53lrZjvvIzlsIbmlrDmlbDmja7lhpnlhaXmnKzlnLAgUGFja3MuanNvblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtb2RpZnlQYWNrYWdlSnNvbigpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWmguaenOaciSBFZGl0b3IuRGlhbG9n77yM5Y+v5Lul5by55Liq5oiQ5Yqf5o+Q56S6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnaW5mbycsICfmj5DnpLonLCAn5a+85YWl5oiQ5Yqf77yBJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ+itpuWRiicsICflr7zlhaXnmoTmlofku7bmoLzlvI/kuI3mraPnoa7vvIEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnZXJyb3InLCAn6ZSZ6K+vJywgJ+aWh+S7tuino+aekOWksei0pe+8jOivt+ajgOafpeaWh+S7tuagvOW8j++8gScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyA1LiDmuIXnkIbvvJrlsIbkuLTml7bliJvlu7rnmoQgaW5wdXQg5qCH562+5LuO6aG16Z2i5Lit56e76ZmkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKGlucHV0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVhZGVyLnJlYWRBc1RleHQoZmlsZSk7IC8vIOS7peaWh+acrOW9ouW8j+ivu+WPluaWh+S7tlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyA2LiDlsIYgaW5wdXQg5oyC6L295Yiw6aG16Z2i5bm26Kem5Y+R54K55Ye777yM5by55Ye65paH5Lu26YCJ5oup5qGGXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChpbnB1dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXQuY2xpY2soKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDor7TmmI7pnZnmgIHmlofku7bkuK3mnIkgUGFja3MuanNvbuS6hu+8jOivoumXruaYr+WQpuabv+aNolxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudGFza0xpc3QgJiYgdGhpcy50YXNrTGlzdC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGJ0bk1hcCA9IG5ldyBNYXA8c3RyaW5nLCBGdW5jdGlvbj4oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBidG5NYXAuc2V0KCdyZXBsYWNlJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbXBvcnRGdW5jKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnRuTWFwLnNldCgnY2FuY2VsJywgbnVsbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ3JlcGxhY2UnLCAnUGFja3MuanNvbiDlt7LlrZjlnKjvvIzmmK/lkKbmm7/mjaI/JywgYnRuTWFwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGltcG9ydEZ1bmMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZXhwb3J0UGFja3NDb25maWcoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDor7TmmI7msqHmnInphY3nva5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy50YXNrTGlzdCB8fCB0aGlzLnRhc2tMaXN0Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnd2FybicsICforablkYonLCAn5rKh5pyJ6YWN572u77yM5peg5rOV5a+85Ye6Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAxLiDnu4Too4XpnIDopoHlr7zlh7rnmoTmlbDmja5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBleHBvcnREYXRhID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYWNrczogdGhpcy50YXNrTGlzdFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF0YVN0ciA9IEpTT04uc3RyaW5naWZ5KGV4cG9ydERhdGEsIG51bGwsIFwiXFx0XCIpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gMi4g6I635Y+W5b2T5YmN57O757uf55qE5qGM6Z2i6Lev5b6EXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGVza3RvcFBhdGggPSBvcy5ob21lZGlyKCkgKyAnL0Rlc2t0b3AnO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gMy4g5ou85o6l5a6M5pW055qE5L+d5a2Y6Lev5b6EXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2F2ZVBhdGggPSBqb2luKGRlc2t0b3BQYXRoLCBgUGFja3MuanNvbmApO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gNC4g5L2/55SoIE5vZGUuanMg5Y6f55SfIGZzIOaooeWdl+WQjOatpeWGmeWFpeaWh+S7tuWIsOahjOmdolxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdyaXRlRmlsZVN5bmMoc2F2ZVBhdGgsIGRhdGFTdHIsICd1dGYtOCcpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gNS4g5by55Ye65oiQ5Yqf5o+Q56S6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCdpbmZvJywgJ+aPkOekuicsIGDphY3nva7lt7LmiJDlip/lr7zlh7rliLDmoYzpnaLvvIFcXG7mlofku7blkI3vvJoke2BQYWNrcy5qc29uYH1gKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCflr7zlh7rlpLHotKU6JywgZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnZXJyb3InLCAn6ZSZ6K+vJywgJ+WvvOWHuumFjee9ruaWh+S7tuWksei0pe+8jOivt+ajgOafpeadg+mZkO+8gScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBvbmVrZXlPcGVyYXRlQXV0b1BhY2soZmxhZzogYm9vbGVhbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRhc2tMaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YXNrTGlzdFtpXS5uZWVkQXV0b1BhY2sgPSBmbGFnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZmxhZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhc2tMaXN0W2ldLnVwbG9hZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhc2tMaXN0W2ldLnNraXAgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgb25la2V5T3BlcmF0ZVVwbG9hZChmbGFnOiBib29sZWFuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudGFza0xpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhc2tMaXN0W2ldLnVwbG9hZCA9IGZsYWc7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIG9uZWtleU9wZXJhdGVTa2lwUGFjayhmbGFnOiBib29sZWFuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudGFza0xpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhc2tMaXN0W2ldLnNraXAgPSBmbGFnO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnZXRBdXRvQ291bnQoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgY291bnQgPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRhc2tMaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudGFza0xpc3RbaV0ubmVlZEF1dG9QYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50Kys7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNvdW50O1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnZXRVcGxvYWRDb3VudCgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjb3VudCA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudGFza0xpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy50YXNrTGlzdFtpXS51cGxvYWQgJiYgdGhpcy50YXNrTGlzdFtpXS5uZWVkQXV0b1BhY2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY291bnQrKztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY291bnQ7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdldFBhY2tDb3VudCgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjb3VudCA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudGFza0xpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMudGFza0xpc3RbaV0uc2tpcCAmJiB0aGlzLnRhc2tMaXN0W2ldLm5lZWRBdXRvUGFjaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb3VudCsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjb3VudDtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgb3BlbkxvZ0RpcihwYXRoOiBzdHJpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZXhpc3RzU3luYyhwYXRoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnd2FybicsICd3YXJuJywgJ+aXpeW/l+aWh+S7tuWkueS4jeWtmOWcqO+8gScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhlYyhgc3RhcnQgXCJcIiBcIiR7cGF0aH1cImAsIChlcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+aJp+ihjOWRveS7pOWHuumUmTonLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ2Vycm9yJywgJ+mUmeivrycsICfml6Dms5XmiZPlvIDnm67lvZXvvIzor7fmo4Dmn6Xot6/lvoTmiJbmnYPpmZDvvIEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCfmiZPlvIDnm67lvZXlvILluLg6JywgZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnZXJyb3InLCAn6ZSZ6K+vJywgJ+WPkeeUn+acquefpemUmeivr++8jOaXoOazleaJk+W8gOebruW9le+8gScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBvcGVuVG9vbExvZygpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMub3BlbkxvZ0Rpcihqb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uL3Rvb2xMb2cnKSk7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHRhb2Jhb0xvZ2luKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbG9naW5Gb3JUYW9iYW8oKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgY2xpY2tBdXRvUGFja1RvZ2dsZShpdGVtOiBQYWNrUHJvamVjdCwgZmxhZzogYm9vbGVhbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS5uZWVkQXV0b1BhY2sgPSBmbGFnO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFmbGFnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS51cGxvYWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtLnNraXAgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBzZXRQbGF0Zm9ybUZpbGUoaXRlbTogUGFja1Byb2plY3QsIHBhdGg6IHN0cmluZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFpdGVtLnBsYXRmb3JtRmlsZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtLnBsYXRmb3JtRmlsZXMgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaXRlbS5wbGF0Zm9ybUZpbGVzW2l0ZW0uY2hhbm5lbF0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtLnBsYXRmb3JtRmlsZXNbaXRlbS5jaGFubmVsXSA9IHsgcGF0aDogJycsIGlzVGVzdDogZmFsc2UgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0ucGxhdGZvcm1GaWxlc1tpdGVtLmNoYW5uZWxdLnBhdGggPSBwYXRoO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBzZXRQbGF0Zm9ybUZpbGVTZXJ2ZXIoaXRlbTogUGFja1Byb2plY3QsIGlzVGVzdDogYm9vbGVhbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFpdGVtLnBsYXRmb3JtRmlsZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtLnBsYXRmb3JtRmlsZXMgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaXRlbS5wbGF0Zm9ybUZpbGVzW2l0ZW0uY2hhbm5lbF0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtLnBsYXRmb3JtRmlsZXNbaXRlbS5jaGFubmVsXSA9IHsgcGF0aDogJycsIGlzVGVzdDogZmFsc2UgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0ucGxhdGZvcm1GaWxlc1tpdGVtLmNoYW5uZWxdLmlzVGVzdCA9IGlzVGVzdDtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2V0UGxhdGZvcm1GaWxlKGl0ZW06IFBhY2tQcm9qZWN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbS5wbGF0Zm9ybUZpbGVzICYmIGl0ZW0ucGxhdGZvcm1GaWxlc1tpdGVtLmNoYW5uZWxdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGl0ZW0ucGxhdGZvcm1GaWxlc1tpdGVtLmNoYW5uZWxdLnBhdGggfHwgJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdldFBsYXRmb3JtRmlsZVNlcnZlcihpdGVtOiBQYWNrUHJvamVjdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW0ucGxhdGZvcm1GaWxlcyAmJiBpdGVtLnBsYXRmb3JtRmlsZXNbaXRlbS5jaGFubmVsXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBpdGVtLnBsYXRmb3JtRmlsZXNbaXRlbS5jaGFubmVsXS5pc1Rlc3QgfHwgZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdldFRhb0Jhb0RlYnVnVXJsKGFwcElkOiBzdHJpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghYXBwSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAnd2FybicsICfor7fovpPlhaXmraPnoa7nmoRhcHBJZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaXNDaGVja0xvZ2luID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCB2ZXJzaW9uID0gJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgc3A6IENoaWxkUHJvY2Vzc1dpdGhvdXROdWxsU3RyZWFtcyA9IHNwYXduKFwidGJvcGVuXCIsIFsnYXBwJywgJy1hJywgYXBwSWRdLCB7IHNoZWxsOiB0cnVlIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgc3Auc3Rkb3V0LnNldEVuY29kaW5nKCd1dGY4Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzcC5zdGRvdXQub24oJ2RhdGEnLCAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBnZXRUYW9CYW9EZWJ1Z1VybCBzdGRvdXQgJHtkYXRhLnRvU3RyaW5nKCl9YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHN0cjogc3RyaW5nID0gZGF0YS50cmltKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFyciA9IHN0ci5zcGxpdCgn5pyA5paw57q/5LiK54mI5pysOicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcnNpb24gPSBhcnJbMV0udHJpbSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzcC5zdGRlcnIub24oJ2RhdGEnLCAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBnZXRUYW9CYW9EZWJ1Z1VybCBzdGRlcnIgJHtkYXRhLnRvU3RyaW5nKCl9YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgc3Aub24oJ2V4aXQnLCBhc3luYyAoY29kZSwgZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaXNDaGVja0xvZ2luID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZlcnNpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYGdldFRhb0Jhb0RlYnVnVXJsIHN1c2Nlc3MgJHtkYXRhfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgdXJsID0gYGh0dHBzOi8vbS5kdWFucXUuY29tP19hcml2ZXJfYXBwaWQ9JHthcHBJZH0mbmJzdj0ke3ZlcnNpb259Jm5ic291cmNlPWRlYnVnJm5ic249VFJJQUwmX21wX2NvZGU9dGImX2NvbnRhaW5lcl90eXBlPWdtJnZjb25zb2xlPXRydWVgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucXJDb2RlVXJsID0gdXJsO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCdlcnJvcicsICflpLHotKUnLCAn5aSN5Yi26ZO+5o6l5aSx6LSlIScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBjbG9zZVFyQ29kZSgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucXJDb2RlVXJsID0gJyc7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGFzeW5jIGNvcHlMaW5rKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMucXJDb2RlVXJsICE9PSAnJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IG5hdmlnYXRvci5jbGlwYm9hcmQud3JpdGVUZXh0KHRoaXMucXJDb2RlVXJsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCdpbmZvJywgJ+WujOaIkCcsIGDlpI3liLbpk77mjqXmiJDlip/vvIzlj6/nspjotLTkvb/nlKjvvIFgKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnZXJyb3InLCAn5aSx6LSlJywgYOWkjeWItumTvuaOpeWksei0pSEgJHtlcnJvcn1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHRlbXBsYXRlOiByZWFkRmlsZVN5bmMoam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi9zdGF0aWMvdGVtcGxhdGUvdnVlL3Byb2plY3QuaHRtbCcpLCAndXRmLTgnKSxcbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIGFwcC5tb3VudCh0aGlzLiQuYXBwKTtcbiAgICAgICAgICAgIHBhbmVsRGF0YU1hcC5zZXQodGhpcywgYXBwKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgYmVmb3JlQ2xvc2UoKSB7XG4gICAgfSxcbiAgICBjbG9zZSgpIHtcbiAgICAgICAgY29uc3QgYXBwID0gcGFuZWxEYXRhTWFwLmdldCh0aGlzKTtcbiAgICAgICAgaWYgKGFwcCkge1xuICAgICAgICAgICAgbW9kaWZ5UGFja2FnZUpzb24oKTtcblxuICAgICAgICAgICAgYXBwLnVubW91bnQoKTtcbiAgICAgICAgfVxuICAgIH0sXG59KTtcbiJdfQ==