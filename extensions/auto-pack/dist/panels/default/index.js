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
    customConfigPath: '',
    mainBundleCompressionType: 'none',
    dingTalkWebHook: '',
    dingTalkCustomContent_pack: '',
    dingTalkCustomContent_upload: '',
    enginePath: '',
    engineVer: '',
    navigationBarTextStyle: 'black',
    preview: false,
    tb_cli_token: ''
};
const modifyPackageJson = () => {
    for (let i = 0; i < taskList.length; i++) {
        taskList[i] = Object.assign(Object.assign({}, TaskTemp), taskList[i]);
        if (taskList[i].qrCodeUrl) {
            delete taskList[i].qrCodeUrl;
        }
    }
    let data = { packs: taskList };
    let dataStr = JSON.stringify(data, null, "\t");
    (0, fs_extra_1.writeFileSync)((0, path_1.join)(__dirname, '../../../static/packconfigs/Packs.json'), dataStr, 'utf-8');
};
const spawn_tb = (args, success, fail) => {
    let sp = (0, child_process_1.spawn)("tbgame", args, { shell: true });
    sp.stdout.setEncoding('utf8');
    let commondStr = sp.spawnargs[4].replace(/"/g, '');
    let cliTokenFailed = false;
    let version = '';
    let previewUrl = '';
    let nextDataIsQrCode = false;
    sp.stdout.on('data', (data) => {
        if (nextDataIsQrCode) {
            nextDataIsQrCode = false;
        }
        else {
            console.log(`spawn_tb: ${commondStr} stdout ${data.toString()}`);
        }
        if (data.indexOf('最新线上版本:') > -1) {
            let str = data.trim();
            let arr = str.split('最新线上版本:');
            version = arr[1].trim();
        }
        if (data.indexOf('预览二维码地址：') > -1) {
            let str = data.trim();
            let arr = str.split('预览二维码地址：');
            previewUrl = arr[1].trim();
        }
        if (data.indexOf('已复制预览码到剪贴板') > -1) {
            nextDataIsQrCode = true;
        }
    });
    sp.stderr.on('data', (data) => {
        console.log(`spawn_tb: ${commondStr} stderr ${data.toString()}`);
        if (data.indexOf('CLI auth failed') > -1) {
            cliTokenFailed = true;
        }
        console.log('test error data ', data);
    });
    sp.on('exit', async (code, data) => {
        if (code === 0) {
            if (cliTokenFailed) {
                console.log(`spawn_tb: ${commondStr} failed 设置调用凭证Token错误`);
                (0, exports.openDilog)('warn', 'warn', '设置调用凭证Token错误!');
                fail && fail();
            }
            else {
                console.log(`spawn_tb: ${commondStr} success`);
                success && success({ version, previewUrl });
            }
        }
        else {
            console.log(`spawn_tb: ${commondStr} failed`);
            fail && fail();
        }
    });
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
                        qrCodeUrl: '',
                        isSetTbCliToken: false
                    };
                },
                computed: {
                    uploadStatus(item) {
                        if (item.preview) {
                            return false;
                        }
                        return item.upload;
                    },
                    previewStatus(item) {
                        if (item.upload) {
                            return false;
                        }
                        return item.preview;
                    }
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
                            if (task.channel === 'taobao-mini-game' && (task.upload || task.preview) && !task.tb_cli_token) {
                                (0, exports.openDilog)('warn', 'warn', '请正确填写淘宝小游戏CLI Token！');
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
                                    taskList = (0, fs_extra_1.existsSync)(packsPath) ? JSON.parse((0, fs_extra_1.readFileSync)(packsPath, 'utf-8')).packs : [];
                                    this.taskList = taskList;
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
                        let previewCount = 0;
                        for (let task of this.taskList) {
                            if (task.needAutoPack) {
                                autoCount++;
                                if (task.upload) {
                                    uploadCount++;
                                }
                                if (!task.skip) {
                                    packCount++;
                                }
                                if (task.preview) {
                                    previewCount++;
                                }
                                msg += `${task.appId}：${task.name}，构建：${(task.skip ? '✕' : '✓')}，上传：${(task.upload ? '✓' : '✕')}，预览：${(task.preview ? '✓' : '✕')}\n`;
                            }
                        }
                        msg += `自动化：${autoCount}个，构建：${packCount}个，上传：${uploadCount}个，预览：${previewCount}个\n`;
                        if (testServerWarns) {
                            msg += testServerWarns;
                        }
                        let btnMap = new Map();
                        btnMap.set('ok', () => {
                            autoPack();
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
                    getPreviewCount() {
                        let count = 0;
                        for (let i = 0; i < this.taskList.length; i++) {
                            if (this.taskList[i].preview && this.taskList[i].needAutoPack) {
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
                    getTaoBaoDebugUrl(item, isPreview) {
                        if (!item) {
                            (0, exports.openDilog)('warn', 'warn', '项目配置为空，请检查配置');
                            return;
                        }
                        if (!item.appId) {
                            (0, exports.openDilog)('warn', 'warn', '请输入正确的appId');
                            return;
                        }
                        if (!item.tb_cli_token) {
                            (0, exports.openDilog)('warn', 'warn', '请输入正确的淘宝CLI Token');
                            return;
                        }
                        this.isSetTbCliToken = true;
                        spawn_tb(['config', 'set', 'token', item.tb_cli_token], () => {
                            this.isSetTbCliToken = false;
                            this.isAutoPack = true;
                            if (isPreview) {
                                let compareVersion = (ver1, ver2) => {
                                    let arr1 = ver1.split('.');
                                    let arr2 = ver2.split('.');
                                    let length = Math.min(arr1.length, arr2.length);
                                    for (let i = 0; i < length; i++) {
                                        if (arr1[i] == arr2[i]) {
                                            continue;
                                        }
                                        return Number(arr1[i]) - Number(arr2[i]);
                                    }
                                    return arr1.length - arr2.length;
                                };
                                let outPath = path_1.default.join(item.path, `build/${compareVersion(item.engineVer, "3.0.0") ? item.channel : 'taobao-minigame'}`);
                                spawn_tb(["preview", "-i", outPath, "-a", item.appId, "-t", "minigame", "--copy", "true", "--renderMode", "highPerformance"], (data) => {
                                    this.isAutoPack = false;
                                    for (let i = 0; i < this.taskList.length; i++) {
                                        if (this.taskList[i].appId === item.appId) {
                                            this.taskList[i].qrCodeUrl = data.previewUrl;
                                            break;
                                        }
                                    }
                                }, () => {
                                    this.isAutoPack = false;
                                });
                            }
                            else {
                                spawn_tb(['app', '-a', item.appId], (data) => {
                                    this.isAutoPack = false;
                                    if (data.version) {
                                        let url = `https://m.duanqu.com?_ariver_appid=${item.appId}&nbsv=${data.version}&nbsource=debug&nbsn=TRIAL&_mp_code=tb&_container_type=gm&vconsole=true`;
                                        this.qrCodeUrl = url;
                                        console.log(`getTaoBaoDebugUrl suscess ${url}`);
                                    }
                                    else {
                                        (0, exports.openDilog)('error', '失败', '复制链接失败!');
                                    }
                                }, () => {
                                    this.isAutoPack = false;
                                    (0, exports.openDilog)('error', '失败', '复制链接失败!');
                                });
                            }
                        }, () => {
                            this.isSetTbCliToken = false;
                        });
                    },
                    closeQrCode() {
                        this.qrCodeUrl = '';
                    },
                    async copyLink(link) {
                        if (link !== '') {
                            try {
                                await navigator.clipboard.writeText(link);
                                (0, exports.openDilog)('info', '完成', `复制链接成功，可粘贴使用！`);
                            }
                            catch (error) {
                                (0, exports.openDilog)('error', '失败', `复制链接失败! ${error}`);
                            }
                        }
                    },
                    checkUpload(item, isCheck) {
                        if (item.preview) {
                            item.preview = false;
                        }
                        item.upload = isCheck;
                    },
                    checkPreview(item, isCheck) {
                        if (item.upload) {
                            item.upload = false;
                        }
                        item.preview = isCheck;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zb3VyY2UvcGFuZWxzL2RlZmF1bHQvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLCtDQUErQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRS9DLGlEQUE0RTtBQUM1RSx1Q0FBbUU7QUFDbkUsNkNBQWtDO0FBQ2xDLDZCQUFzRDtBQUN0RCw0Q0FBb0I7QUFDcEIsTUFBTSxZQUFZLEdBQUcsSUFBSSxPQUFPLEVBQVksQ0FBQztBQWdDN0MsTUFBTSxTQUFTLEdBQUcsSUFBQSxXQUFJLEVBQUMsU0FBUyxFQUFFLHdDQUF3QyxDQUFDLENBQUM7QUFDNUUsSUFBSSxRQUFRLEdBQWtCLElBQUEscUJBQVUsRUFBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFBLHVCQUFZLEVBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDOUcsTUFBTSxRQUFRLEdBQWdCO0lBQzFCLEtBQUssRUFBRSxFQUFFO0lBQ1QsSUFBSSxFQUFFLEVBQUU7SUFDUixJQUFJLEVBQUUsRUFBRTtJQUNSLE9BQU8sRUFBRSxrQkFBa0I7SUFDM0IsSUFBSSxFQUFFLEtBQUs7SUFDWCxNQUFNLEVBQUUsS0FBSztJQUNiLFlBQVksRUFBRSxLQUFLO0lBQ25CLGFBQWEsRUFBRTtRQUNYLGtCQUFrQixFQUFFO1lBQ2hCLElBQUksRUFBRSxFQUFFO1lBQ1IsTUFBTSxFQUFFLEtBQUs7U0FDaEI7S0FDSjtJQUNELGNBQWMsRUFBRSxJQUFJO0lBQ3BCLFFBQVEsRUFBRSxLQUFLO0lBQ2YsVUFBVSxFQUFFLEtBQUs7SUFDakIsZ0JBQWdCLEVBQUUsRUFBRTtJQUNwQix5QkFBeUIsRUFBRSxNQUFNO0lBQ2pDLGVBQWUsRUFBRSxFQUFFO0lBQ25CLDBCQUEwQixFQUFF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SUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUN0QixZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNoQyxDQUFDO0lBQ0wsQ0FBQztJQUNELFdBQVc7SUFDWCxDQUFDO0lBQ0QsS0FBSztRQUNELE1BQU0sR0FBRyxHQUFHLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbkMsSUFBSSxHQUFHLEVBQUUsQ0FBQztZQUNOLGlCQUFpQixFQUFFLENBQUM7WUFFcEIsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2xCLENBQUM7SUFDTCxDQUFDO0NBQ0osQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgdnVlL29uZS1jb21wb25lbnQtcGVyLWZpbGUgKi9cblxuaW1wb3J0IHsgQ2hpbGRQcm9jZXNzV2l0aG91dE51bGxTdHJlYW1zLCBzcGF3biwgZXhlYyB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0IHsgZXhpc3RzU3luYywgcmVhZEZpbGVTeW5jLCB3cml0ZUZpbGVTeW5jIH0gZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IHBhdGgsIHsgam9pbiB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgY3JlYXRlQXBwLCBBcHAsIGRlZmluZUNvbXBvbmVudCB9IGZyb20gJ3Z1ZSc7XG5pbXBvcnQgb3MgZnJvbSAnb3MnO1xuY29uc3QgcGFuZWxEYXRhTWFwID0gbmV3IFdlYWtNYXA8YW55LCBBcHA+KCk7XG4vKipcbiAqIEB6aCDlpoLmnpzluIzmnJvlhbzlrrkgMy4zIOS5i+WJjeeahOeJiOacrOWPr+S7peS9v+eUqOS4i+aWueeahOS7o+eggVxuICogQGVuIFlvdSBjYW4gYWRkIHRoZSBjb2RlIGJlbG93IGlmIHlvdSB3YW50IGNvbXBhdGliaWxpdHkgd2l0aCB2ZXJzaW9ucyBwcmlvciB0byAzLjNcbiAqL1xuLy8gRWRpdG9yLlBhbmVsLmRlZmluZSA9IEVkaXRvci5QYW5lbC5kZWZpbmUgfHwgZnVuY3Rpb24ob3B0aW9uczogYW55KSB7IHJldHVybiBvcHRpb25zIH1cblxuaW50ZXJmYWNlIFBhY2tQcm9qZWN0IHtcbiAgICBhcHBJZDogc3RyaW5nLFxuICAgIG5hbWU6IHN0cmluZyxcbiAgICBwYXRoOiBzdHJpbmcsLy8gQ29jb3Ppobnnm67moLnnm67lvZVcbiAgICBjaGFubmVsOiBzdHJpbmcsLy8g5oyH5a6a5omT5YyF5a+55bqU5rig6YGT5ZCN56ewXG4gICAgc2tpcDogYm9vbGVhbiwvLyDmmK/lkKbot7Pov4djb2Nvc+aehOW7uuW3peeoi++8jOebtOaOpeS9v+eUqOWvvOWHuuW3peeoi1xuICAgIHVwbG9hZDogYm9vbGVhbiwvLyDmmK/lkKbpnIDopoHkuIrkvKAg5LiOcHJldmlld+S6kuaWpVxuICAgIG5lZWRBdXRvUGFjazogYm9vbGVhbiwvLyDmmK/lkKbpnIDopoHov5vooYzoh6rliqjmnoTlu7rkuIrkvKBcbiAgICBwbGF0Zm9ybUZpbGVzOiB7IFtrZXk6IHN0cmluZ106IHsgcGF0aDogc3RyaW5nLCBpc1Rlc3Q6IGJvb2xlYW4gfSB9LC8vIGtleeW5s+WPsOWQjeensOS4jmNoYW5uZWzlr7nlupTvvIx2YWx1Zea4uOaIj+W3peeoi+S4reW5s+WPsOeahOmFjee9ruaWh+S7tlxuICAgIHBvc3RUb0RpbmdUYWxrOiBib29sZWFuLC8vIOaYr+WQpuaOqOmAgemSiemSiVxuICAgIG1kNUNhY2hlOiBib29sZWFuLFxuICAgIHNvdXJjZU1hcHM6IGJvb2xlYW4sXG4gICAgY3VzdG9tQ29uZmlnUGF0aDogc3RyaW5nLC8v6Ieq5a6a5LmJ5p6E5bu65qih5p2/anNvbui3r+W+hFxuICAgIG1haW5CdW5kbGVDb21wcmVzc2lvblR5cGU6IHN0cmluZywvL+S4u+WMheWOi+e8qeexu+WeiyAg5peg5Y6L57yp77yaIFwibm9uZVwiICDlkIjlubbkvp3otZbvvJogXCJtZXJnZV9kZXBcIiAg5ZCI5bm25omA5pyJSlNPTu+8miBcIm1lcmdlX2FsbF9qc29uXCIgIFpJUO+8miBcInppcFwiICDlsI/muLjmiI/liIbljIXvvJogXCJzdWJwYWNrYWdlXCJcbiAgICBkaW5nVGFsa1dlYkhvb2s6IHN0cmluZywvLyDpkonpkonmnLrlmajkurrnmoR3ZWJob29r5Zyw5Z2AXG4gICAgZGluZ1RhbGtDdXN0b21Db250ZW50X3BhY2s6IHN0cmluZywvLyDpkonpkonmnLrlmajkurrnmoToh6rlrprkuYnlhoXlrrlcbiAgICBkaW5nVGFsa0N1c3RvbUNvbnRlbnRfdXBsb2FkOiBzdHJpbmcsLy8g6ZKJ6ZKJ5py65Zmo5Lq655qE6Ieq5a6a5LmJ5YaF5a65XG4gICAgZW5naW5lUGF0aDogc3RyaW5nLC8vIGNvY29z5byV5pOO6Lev5b6EXG4gICAgZW5naW5lVmVyOiBzdHJpbmcsLy8gY29jb3PlvJXmk47niYjmnKxcbiAgICBuYXZpZ2F0aW9uQmFyVGV4dFN0eWxlOiBzdHJpbmcsLy8g5a+86Iiq5qCP5qCH6aKY6aKc6ImyXG4gICAgcHJldmlldzogYm9vbGVhbiwvLyDmmK/lkKbpooTop4gg5LiOdXBsb2Fk5LqS5palXG4gICAgdGJfY2xpX3Rva2VuOiBzdHJpbmcsLy8gdGFvYmFvIGNsaSB0b2tlblxuICAgIHFyQ29kZVVybD86IHN0cmluZywvLyDkuoznu7TnoIF1cmxcbn1cblxuY29uc3QgcGFja3NQYXRoID0gam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi9zdGF0aWMvcGFja2NvbmZpZ3MvUGFja3MuanNvbicpO1xubGV0IHRhc2tMaXN0OiBQYWNrUHJvamVjdFtdID0gZXhpc3RzU3luYyhwYWNrc1BhdGgpID8gSlNPTi5wYXJzZShyZWFkRmlsZVN5bmMocGFja3NQYXRoLCAndXRmLTgnKSkucGFja3MgOiBbXTtcbmNvbnN0IFRhc2tUZW1wOiBQYWNrUHJvamVjdCA9IHtcbiAgICBhcHBJZDogJycsXG4gICAgbmFtZTogJycsXG4gICAgcGF0aDogJycsXG4gICAgY2hhbm5lbDogJ3Rhb2Jhby1taW5pLWdhbWUnLFxuICAgIHNraXA6IGZhbHNlLFxuICAgIHVwbG9hZDogZmFsc2UsXG4gICAgbmVlZEF1dG9QYWNrOiBmYWxzZSxcbiAgICBwbGF0Zm9ybUZpbGVzOiB7XG4gICAgICAgICd0YW9iYW8tbWluaS1nYW1lJzoge1xuICAgICAgICAgICAgcGF0aDogJycsXG4gICAgICAgICAgICBpc1Rlc3Q6IGZhbHNlXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHBvc3RUb0RpbmdUYWxrOiB0cnVlLFxuICAgIG1kNUNhY2hlOiBmYWxzZSxcbiAgICBzb3VyY2VNYXBzOiBmYWxzZSxcbiAgICBjdXN0b21Db25maWdQYXRoOiAnJyxcbiAgICBtYWluQnVuZGxlQ29tcHJlc3Npb25UeXBlOiAnbm9uZScsXG4gICAgZGluZ1RhbGtXZWJIb29rOiAnJyxcbiAgICBkaW5nVGFsa0N1c3RvbUNvbnRlbnRfcGFjazogJycsXG4gICAgZGluZ1RhbGtDdXN0b21Db250ZW50X3VwbG9hZDogJycsXG4gICAgZW5naW5lUGF0aDogJycsXG4gICAgZW5naW5lVmVyOiAnJyxcbiAgICBuYXZpZ2F0aW9uQmFyVGV4dFN0eWxlOiAnYmxhY2snLFxuICAgIHByZXZpZXc6IGZhbHNlLFxuICAgIHRiX2NsaV90b2tlbjogJydcbn07XG5cbmNvbnN0IG1vZGlmeVBhY2thZ2VKc29uID0gKCkgPT4ge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGFza0xpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdGFza0xpc3RbaV0gPSB7IC4uLlRhc2tUZW1wLCAuLi50YXNrTGlzdFtpXSB9O1xuICAgICAgICBpZiAodGFza0xpc3RbaV0ucXJDb2RlVXJsKSB7XG4gICAgICAgICAgICBkZWxldGUgdGFza0xpc3RbaV0ucXJDb2RlVXJsO1xuICAgICAgICB9XG4gICAgfVxuICAgIGxldCBkYXRhID0geyBwYWNrczogdGFza0xpc3QgfTtcbiAgICBsZXQgZGF0YVN0ciA9IEpTT04uc3RyaW5naWZ5KGRhdGEsIG51bGwsIFwiXFx0XCIpO1xuICAgIHdyaXRlRmlsZVN5bmMoam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi9zdGF0aWMvcGFja2NvbmZpZ3MvUGFja3MuanNvbicpLCBkYXRhU3RyLCAndXRmLTgnKTtcbn07XG5cbmNvbnN0IHNwYXduX3RiID0gKGFyZ3M6IHN0cmluZ1tdLCBzdWNjZXNzOiBGdW5jdGlvbiwgZmFpbDogRnVuY3Rpb24pID0+IHtcbiAgICBsZXQgc3A6IENoaWxkUHJvY2Vzc1dpdGhvdXROdWxsU3RyZWFtcyA9IHNwYXduKFwidGJnYW1lXCIsIGFyZ3MsIHsgc2hlbGw6IHRydWUgfSk7XG4gICAgc3Auc3Rkb3V0LnNldEVuY29kaW5nKCd1dGY4Jyk7XG4gICAgbGV0IGNvbW1vbmRTdHIgPSBzcC5zcGF3bmFyZ3NbNF0ucmVwbGFjZSgvXCIvZywgJycpO1xuICAgIGxldCBjbGlUb2tlbkZhaWxlZCA9IGZhbHNlO1xuICAgIGxldCB2ZXJzaW9uID0gJyc7XG4gICAgbGV0IHByZXZpZXdVcmwgPSAnJztcbiAgICBsZXQgbmV4dERhdGFJc1FyQ29kZSA9IGZhbHNlO1xuXG4gICAgc3Auc3Rkb3V0Lm9uKCdkYXRhJywgKGRhdGEpID0+IHtcbiAgICAgICAgaWYgKG5leHREYXRhSXNRckNvZGUpIHtcbiAgICAgICAgICAgIG5leHREYXRhSXNRckNvZGUgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBzcGF3bl90YjogJHtjb21tb25kU3RyfSBzdGRvdXQgJHtkYXRhLnRvU3RyaW5nKCl9YCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhdGEuaW5kZXhPZign5pyA5paw57q/5LiK54mI5pysOicpID4gLTEpIHtcbiAgICAgICAgICAgIGxldCBzdHI6IHN0cmluZyA9IGRhdGEudHJpbSgpO1xuICAgICAgICAgICAgbGV0IGFyciA9IHN0ci5zcGxpdCgn5pyA5paw57q/5LiK54mI5pysOicpO1xuICAgICAgICAgICAgdmVyc2lvbiA9IGFyclsxXS50cmltKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhdGEuaW5kZXhPZign6aKE6KeI5LqM57u056CB5Zyw5Z2A77yaJykgPiAtMSkge1xuICAgICAgICAgICAgbGV0IHN0cjogc3RyaW5nID0gZGF0YS50cmltKCk7XG4gICAgICAgICAgICBsZXQgYXJyID0gc3RyLnNwbGl0KCfpooTop4jkuoznu7TnoIHlnLDlnYDvvJonKTtcbiAgICAgICAgICAgIHByZXZpZXdVcmwgPSBhcnJbMV0udHJpbSgpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXRhLmluZGV4T2YoJ+W3suWkjeWItumihOiniOeggeWIsOWJqui0tOadvycpID4gLTEpIHtcbiAgICAgICAgICAgIG5leHREYXRhSXNRckNvZGUgPSB0cnVlO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgc3Auc3RkZXJyLm9uKCdkYXRhJywgKGRhdGEpID0+IHtcbiAgICAgICAgY29uc29sZS5sb2coYHNwYXduX3RiOiAke2NvbW1vbmRTdHJ9IHN0ZGVyciAke2RhdGEudG9TdHJpbmcoKX1gKTtcbiAgICAgICAgaWYgKGRhdGEuaW5kZXhPZignQ0xJIGF1dGggZmFpbGVkJykgPiAtMSkge1xuICAgICAgICAgICAgY2xpVG9rZW5GYWlsZWQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUubG9nKCd0ZXN0IGVycm9yIGRhdGEgJywgZGF0YSk7XG4gICAgfSlcbiAgICBzcC5vbignZXhpdCcsIGFzeW5jIChjb2RlLCBkYXRhKSA9PiB7XG4gICAgICAgIGlmIChjb2RlID09PSAwKSB7XG4gICAgICAgICAgICBpZiAoY2xpVG9rZW5GYWlsZWQpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgc3Bhd25fdGI6ICR7Y29tbW9uZFN0cn0gZmFpbGVkIOiuvue9ruiwg+eUqOWHreivgVRva2Vu6ZSZ6K+vYCk7XG4gICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ3dhcm4nLCAn6K6+572u6LCD55So5Yet6K+BVG9rZW7plJnor68hJyk7XG4gICAgICAgICAgICAgICAgZmFpbCAmJiBmYWlsKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgc3Bhd25fdGI6ICR7Y29tbW9uZFN0cn0gc3VjY2Vzc2ApO1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3MgJiYgc3VjY2Vzcyh7IHZlcnNpb24sIHByZXZpZXdVcmwgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgc3Bhd25fdGI6ICR7Y29tbW9uZFN0cn0gZmFpbGVkYCk7XG4gICAgICAgICAgICBmYWlsICYmIGZhaWwoKTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxuZXhwb3J0IGNvbnN0IG9wZW5EaWxvZyA9IGFzeW5jICh0eXBlOiBzdHJpbmcsIHRpdGxlOiBzdHJpbmcsIG1lc3NhZ2U6IHN0cmluZywgYnRuTWFwPzogTWFwPHN0cmluZywgRnVuY3Rpb24+LCBjYW5jZWw/OiBudW1iZXIpID0+IHtcbiAgICBsZXQgb3B0aW9uOiBFZGl0b3IuRGlhbG9nLk1lc3NhZ2VEaWFsb2dPcHRpb25zID0ge1xuICAgICAgICB0aXRsZVxuICAgIH07XG4gICAgaWYgKGJ0bk1hcCkge1xuICAgICAgICBvcHRpb24uYnV0dG9ucyA9IFtdO1xuICAgICAgICBidG5NYXAuZm9yRWFjaCgodmFsdWUsIGtleSkgPT4ge1xuICAgICAgICAgICAgb3B0aW9uLmJ1dHRvbnMucHVzaChrZXkpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgaWYgKGNhbmNlbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIG9wdGlvbi5jYW5jZWwgPSBjYW5jZWw7XG4gICAgfVxuICAgIGxldCBjb2RlOiB7IHJlc3BvbnNlOiAwLCBjaGVja2JveENoZWNrZWQ6IGZhbHNlIH0gPSBhd2FpdCBFZGl0b3IuRGlhbG9nW3R5cGVdKG1lc3NhZ2UsIG9wdGlvbik7XG4gICAgaWYgKGJ0bk1hcCkge1xuICAgICAgICBsZXQga2V5ID0gb3B0aW9uLmJ1dHRvbnNbY29kZS5yZXNwb25zZV07XG4gICAgICAgIGlmIChidG5NYXAuaGFzKGtleSkpIHtcbiAgICAgICAgICAgIGxldCBmdW5jID0gYnRuTWFwLmdldChrZXkpO1xuICAgICAgICAgICAgaWYgKGZ1bmMpIHtcbiAgICAgICAgICAgICAgICBmdW5jKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRWRpdG9yLlBhbmVsLmRlZmluZSh7XG4gICAgbGlzdGVuZXJzOiB7XG4gICAgICAgIHNob3coKSB7IGNvbnNvbGUubG9nKCdzaG93Jyk7IH0sXG4gICAgICAgIGhpZGUoKSB7IGNvbnNvbGUubG9nKCdoaWRlJyk7IH0sXG4gICAgfSxcbiAgICB0ZW1wbGF0ZTogcmVhZEZpbGVTeW5jKGpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vc3RhdGljL3RlbXBsYXRlL2RlZmF1bHQvaW5kZXguaHRtbCcpLCAndXRmLTgnKSxcbiAgICBzdHlsZTogcmVhZEZpbGVTeW5jKGpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vc3RhdGljL3N0eWxlL2RlZmF1bHQvaW5kZXguY3NzJyksICd1dGYtOCcpLFxuICAgICQ6IHtcbiAgICAgICAgYXBwOiAnI2FwcCcsXG4gICAgfSxcbiAgICBtZXRob2RzOiB7XG5cbiAgICB9LFxuICAgIHJlYWR5KCkge1xuICAgICAgICBpZiAodGhpcy4kLmFwcCkge1xuICAgICAgICAgICAgY29uc3QgYXBwID0gY3JlYXRlQXBwKHt9KTtcbiAgICAgICAgICAgIGFwcC5jb25maWcuY29tcGlsZXJPcHRpb25zLmlzQ3VzdG9tRWxlbWVudCA9ICh0YWcpID0+IHRhZy5zdGFydHNXaXRoKCd1aS0nKTtcblxuICAgICAgICAgICAgYXBwLmNvbXBvbmVudCgnTXlQcm9qZWN0JywgZGVmaW5lQ29tcG9uZW50KHtcbiAgICAgICAgICAgICAgICBkYXRhKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGFza0xpc3Q6IHRhc2tMaXN0LFxuICAgICAgICAgICAgICAgICAgICAgICAgaXNBdXRvUGFjazogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBxckNvZGVVcmw6ICcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgaXNTZXRUYkNsaVRva2VuOiBmYWxzZVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgY29tcHV0ZWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgdXBsb2FkU3RhdHVzKGl0ZW06IFBhY2tQcm9qZWN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbS5wcmV2aWV3KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGl0ZW0udXBsb2FkO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBwcmV2aWV3U3RhdHVzKGl0ZW06IFBhY2tQcm9qZWN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbS51cGxvYWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gaXRlbS5wcmV2aWV3O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBtZXRob2RzOiB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0QXV0b1BhY2soKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgdGVzdFNlcnZlcldhcm5zOiBzdHJpbmcgPSAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy50YXNrTGlzdCB8fCB0aGlzLnRhc2tMaXN0Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBidG5NYXAgPSBuZXcgTWFwPHN0cmluZywgRnVuY3Rpb24+KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnRuTWFwLnNldCgnYWRkJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZFByb2plY3QoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBidG5NYXAuc2V0KCdjYW5jZWwnLCBudWxsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAnd2FybicsICfor7flhYjmt7vliqDoh6rliqjljJbpobnnm67phY3nva7vvIEnLCBidG5NYXApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmdldEF1dG9Db3VudCgpID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ3dhcm4nLCAn5peg6Ieq5Yqo5YyW6aG555uuIScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy50YXNrTGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGFza0xpc3RbaV0gPSB7IC4uLlRhc2tUZW1wLCAuLi50aGlzLnRhc2tMaXN0W2ldIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHRhc2s6IFBhY2tQcm9qZWN0ID0gdGhpcy50YXNrTGlzdFtpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGFzay5uZWVkQXV0b1BhY2sgPT09IGZhbHNlKSBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRhc2suYXBwSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ3dhcm4nLCAn6Ieq5Yqo5YyW6aG555uu5Lit5pyq6YWN572uYXBwSWTvvIzor7fmo4Dmn6XphY3nva7vvIEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRhc2sucGF0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAnd2FybicsICfoh6rliqjljJbpobnnm67kuK3mnKrphY3nva7pobnnm67ot6/lvoTvvIzor7fmo4Dmn6XphY3nva7vvIEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRhc2suY2hhbm5lbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAnd2FybicsICfoh6rliqjljJbpobnnm67kuK3mnKrphY3nva7muKDpgZPlubPlj7DvvIzor7fmo4Dmn6XphY3nva7vvIEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRhc2suZW5naW5lUGF0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAnd2FybicsICfoh6rliqjljJbpobnnm67kuK3mnKrphY3nva7lvJXmk47ot6/lvoTvvIzor7fmo4Dmn6XphY3nva7vvIEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRhc2suZW5naW5lVmVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnd2FybicsICd3YXJuJywgJ+iHquWKqOWMlumhueebruS4reacqumFjee9ruW8leaTjueJiOacrO+8jOivt+ajgOafpemFjee9ru+8gScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0YXNrLmNoYW5uZWwgPT09ICd0YW9iYW8tbWluaS1nYW1lJyAmJiAodGFzay51cGxvYWQgfHwgdGFzay5wcmV2aWV3KSAmJiAhdGFzay50Yl9jbGlfdG9rZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ3dhcm4nLCAn6K+35q2j56Gu5aGr5YaZ5reY5a6d5bCP5ri45oiPQ0xJIFRva2Vu77yBJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgcGxhdGZvcm1GaWxlcGF0aCA9IHRoaXMuZ2V0UGxhdGZvcm1GaWxlKHRhc2spO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwbGF0Zm9ybUZpbGVwYXRoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5vcm1hbGl6ZWRQYXRoID0gcGF0aC5ub3JtYWxpemUodGFzay5wYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBsYXRmb3JtRmlsZXBhdGguaW5kZXhPZihub3JtYWxpemVkUGF0aCkgPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAnd2FybicsIGBhcHBJZDoke3Rhc2suYXBwSWR9JHt0YXNrLm5hbWV9LCR7dGFzay5jaGFubmVsfemFjee9ruS4jeWcqOmhueebrui3r+W+hOS4rSzor7fmo4Dmn6XphY3nva7vvIFgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgaXNUZXN0ID0gdGhpcy5nZXRQbGF0Zm9ybUZpbGVTZXJ2ZXIodGFzayk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc1Rlc3QgJiYgdGFzay51cGxvYWQgJiYgIXRhc2suc2tpcCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVzdFNlcnZlcldhcm5zICs9IGDms6jmhI/vvIHvvIEke3Rhc2suYXBwSWR977yaJHt0YXNrLm5hbWV977yM5L2/55So55qE5rWL6K+V5pyN77yB77yBXFxuYFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuaXNBdXRvUGFjaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnd2FybicsICd3YXJuJywgJ+ato+WcqOiHquWKqOWMlu+8jOivt+eojeWQjuWGjeivlSEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGF1dG9QYWNrID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnaW5mbycsICdzdGFydCcsICflvIDlp4voh6rliqjljJYnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmlzQXV0b1BhY2sgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1vZGlmeVBhY2thZ2VKc29uKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgcGF0aCA9IGpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vc3RhdGljL2F1dG8tcGFjay9idWlsZC9hcHAuanMnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgYXJncyA9IFtwYXRoXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgc3A6IENoaWxkUHJvY2Vzc1dpdGhvdXROdWxsU3RyZWFtcyA9IHNwYXduKFwibm9kZVwiLCBhcmdzLCB7IHNoZWxsOiB0cnVlIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNwLnN0ZG91dC5zZXRFbmNvZGluZygndXRmOCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNwLnN0ZG91dC5vbignZGF0YScsIChkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBhdXRvUGFjayBzdGRvdXQgJHtkYXRhLnRvU3RyaW5nKCl9YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3Auc3RkZXJyLm9uKCdkYXRhJywgKGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYGF1dG9QYWNrIHN0ZGVyciAke2RhdGEudG9TdHJpbmcoKX1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNwLm9uKCdleGl0JywgKGNvZGUsIGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvZGUgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBhdXRvUGFjayBleGl0IHN1c2Nlc3MgJHtkYXRhfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCdpbmZvJywgJ+WujOaIkCcsICfoh6rliqjljJblrozmiJAhJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhc2tMaXN0ID0gZXhpc3RzU3luYyhwYWNrc1BhdGgpID8gSlNPTi5wYXJzZShyZWFkRmlsZVN5bmMocGFja3NQYXRoLCAndXRmLTgnKSkucGFja3MgOiBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGFza0xpc3QgPSB0YXNrTGlzdDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBhdXRvUGFjayBleGl0IGZhaWwgJHtkYXRhfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCdlcnJvcicsICflpLHotKUnLCAn6Ieq5Yqo5YyW5aSx6LSlIScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaXNBdXRvUGFjayA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG1zZyA9ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHVwbG9hZENvdW50ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwYWNrQ291bnQgPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGF1dG9Db3VudCA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgcHJldmlld0NvdW50ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IHRhc2sgb2YgdGhpcy50YXNrTGlzdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0YXNrLm5lZWRBdXRvUGFjaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdXRvQ291bnQrKztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRhc2sudXBsb2FkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cGxvYWRDb3VudCsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGFzay5za2lwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYWNrQ291bnQrKztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGFzay5wcmV2aWV3KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcmV2aWV3Q291bnQrKztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtc2cgKz0gYCR7dGFzay5hcHBJZH3vvJoke3Rhc2submFtZX3vvIzmnoTlu7rvvJokeyh0YXNrLnNraXAgPyAn4pyVJyA6ICfinJMnKX3vvIzkuIrkvKDvvJokeyh0YXNrLnVwbG9hZCA/ICfinJMnIDogJ+KclScpfe+8jOmihOiniO+8miR7KHRhc2sucHJldmlldyA/ICfinJMnIDogJ+KclScpfVxcbmA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgbXNnICs9IGDoh6rliqjljJbvvJoke2F1dG9Db3VudH3kuKrvvIzmnoTlu7rvvJoke3BhY2tDb3VudH3kuKrvvIzkuIrkvKDvvJoke3VwbG9hZENvdW50feS4qu+8jOmihOiniO+8miR7cHJldmlld0NvdW50feS4qlxcbmA7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGVzdFNlcnZlcldhcm5zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXNnICs9IHRlc3RTZXJ2ZXJXYXJucztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBidG5NYXAgPSBuZXcgTWFwPHN0cmluZywgRnVuY3Rpb24+KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBidG5NYXAuc2V0KCdvaycsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdXRvUGFjaygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAnd2FybicsIGAke21zZ33lvIDlp4voh6rliqjljJY/YCwgYnRuTWFwLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgYWRkUHJvamVjdCgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGFza0xpc3QucHVzaCh7IC4uLlRhc2tUZW1wIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCdpbmZvJywgJ2FkZCcsICfmt7vliqDmiJDlip8nKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZGVsUHJvamVjdChpdGVtOiBQYWNrUHJvamVjdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGJ0bk1hcCA9IG5ldyBNYXA8c3RyaW5nLCBGdW5jdGlvbj4oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ0bk1hcC5zZXQoJ2RlbGV0ZScsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudGFza0xpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHRhc2sgPSB0aGlzLnRhc2tMaXN0W2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGFzay5hcHBJZCA9PT0gaXRlbS5hcHBJZCAmJiB0YXNrLm5hbWUgPT09IGl0ZW0ubmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YXNrTGlzdC5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ2RlbGV0ZScsICfmmK/lkKbliKDpmaTphY3nva4/JywgYnRuTWFwLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgaW1wb3J0UGFja3NDb25maWcoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpbXBvcnRGdW5jID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIDEuIOWKqOaAgeWIm+W7uuS4gOS4qumakOiXj+eahCBpbnB1dCDmoIfnrb5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXQudHlwZSA9ICdmaWxlJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDpmZDliLblj6rog73pgInmi6kganNvbiDmlofku7bvvIzlpoLmnpzlr7zlhaUgRXhjZWwg5Y+v5Lul5pS55Li6ICcueGxzeCwgLnhscydcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnB1dC5hY2NlcHQgPSAnLmpzb24nO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0LnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAyLiDnm5HlkKzmlofku7bpgInmi6nnmoTlj5jljJZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnB1dC5vbmNoYW5nZSA9IChlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbGUgPSAoZS50YXJnZXQgYXMgSFRNTElucHV0RWxlbWVudCkuZmlsZXM/LlswXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFmaWxlKSByZXR1cm47XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gMy4g5L2/55SoIEZpbGVSZWFkZXIg6K+75Y+W5paH5Lu25YaF5a65XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlYWRlci5vbmxvYWQgPSAoZXZlbnQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g6I635Y+W5paH5Lu26YeM55qE5paH5pys5YaF5a655bm26Kej5p6Q5Li6IEpTT05cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBldmVudC50YXJnZXQ/LnJlc3VsdCBhcyBzdHJpbmc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaW1wb3J0ZWREYXRhID0gSlNPTi5wYXJzZShyZXN1bHQpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5YGH6K6+5a+85YWl55qEIEpTT04g5qC85byP5Lmf5pivIHsgcGFja3M6IFsuLi5dIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW1wb3J0ZWREYXRhLnBhY2tzICYmIEFycmF5LmlzQXJyYXkoaW1wb3J0ZWREYXRhLnBhY2tzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDlsIblr7zlhaXnmoTmlbDmja7mm7/mjaLliLDlvZPliY3nmoQgdGFza0xpc3Qg5LitXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGFza0xpc3QgPSBpbXBvcnRlZERhdGEucGFja3M7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhc2tMaXN0ID0gdGhpcy50YXNrTGlzdDtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyA0LiDop6blj5Hkv53lrZjvvIzlsIbmlrDmlbDmja7lhpnlhaXmnKzlnLAgUGFja3MuanNvblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtb2RpZnlQYWNrYWdlSnNvbigpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWmguaenOaciSBFZGl0b3IuRGlhbG9n77yM5Y+v5Lul5by55Liq5oiQ5Yqf5o+Q56S6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnaW5mbycsICfmj5DnpLonLCAn5a+85YWl5oiQ5Yqf77yBJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ+itpuWRiicsICflr7zlhaXnmoTmlofku7bmoLzlvI/kuI3mraPnoa7vvIEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnZXJyb3InLCAn6ZSZ6K+vJywgJ+aWh+S7tuino+aekOWksei0pe+8jOivt+ajgOafpeaWh+S7tuagvOW8j++8gScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyA1LiDmuIXnkIbvvJrlsIbkuLTml7bliJvlu7rnmoQgaW5wdXQg5qCH562+5LuO6aG16Z2i5Lit56e76ZmkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKGlucHV0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVhZGVyLnJlYWRBc1RleHQoZmlsZSk7IC8vIOS7peaWh+acrOW9ouW8j+ivu+WPluaWh+S7tlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyA2LiDlsIYgaW5wdXQg5oyC6L295Yiw6aG16Z2i5bm26Kem5Y+R54K55Ye777yM5by55Ye65paH5Lu26YCJ5oup5qGGXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChpbnB1dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXQuY2xpY2soKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDor7TmmI7pnZnmgIHmlofku7bkuK3mnIkgUGFja3MuanNvbuS6hu+8jOivoumXruaYr+WQpuabv+aNolxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudGFza0xpc3QgJiYgdGhpcy50YXNrTGlzdC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGJ0bk1hcCA9IG5ldyBNYXA8c3RyaW5nLCBGdW5jdGlvbj4oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBidG5NYXAuc2V0KCdyZXBsYWNlJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbXBvcnRGdW5jKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnRuTWFwLnNldCgnY2FuY2VsJywgbnVsbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ3JlcGxhY2UnLCAnUGFja3MuanNvbiDlt7LlrZjlnKjvvIzmmK/lkKbmm7/mjaI/JywgYnRuTWFwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGltcG9ydEZ1bmMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZXhwb3J0UGFja3NDb25maWcoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDor7TmmI7msqHmnInphY3nva5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy50YXNrTGlzdCB8fCB0aGlzLnRhc2tMaXN0Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnd2FybicsICforablkYonLCAn5rKh5pyJ6YWN572u77yM5peg5rOV5a+85Ye6Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAxLiDnu4Too4XpnIDopoHlr7zlh7rnmoTmlbDmja5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBleHBvcnREYXRhID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYWNrczogdGhpcy50YXNrTGlzdFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF0YVN0ciA9IEpTT04uc3RyaW5naWZ5KGV4cG9ydERhdGEsIG51bGwsIFwiXFx0XCIpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gMi4g6I635Y+W5b2T5YmN57O757uf55qE5qGM6Z2i6Lev5b6EXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGVza3RvcFBhdGggPSBvcy5ob21lZGlyKCkgKyAnL0Rlc2t0b3AnO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gMy4g5ou85o6l5a6M5pW055qE5L+d5a2Y6Lev5b6EXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2F2ZVBhdGggPSBqb2luKGRlc2t0b3BQYXRoLCBgUGFja3MuanNvbmApO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gNC4g5L2/55SoIE5vZGUuanMg5Y6f55SfIGZzIOaooeWdl+WQjOatpeWGmeWFpeaWh+S7tuWIsOahjOmdolxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdyaXRlRmlsZVN5bmMoc2F2ZVBhdGgsIGRhdGFTdHIsICd1dGYtOCcpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gNS4g5by55Ye65oiQ5Yqf5o+Q56S6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCdpbmZvJywgJ+aPkOekuicsIGDphY3nva7lt7LmiJDlip/lr7zlh7rliLDmoYzpnaLvvIFcXG7mlofku7blkI3vvJoke2BQYWNrcy5qc29uYH1gKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCflr7zlh7rlpLHotKU6JywgZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnZXJyb3InLCAn6ZSZ6K+vJywgJ+WvvOWHuumFjee9ruaWh+S7tuWksei0pe+8jOivt+ajgOafpeadg+mZkO+8gScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBvbmVrZXlPcGVyYXRlQXV0b1BhY2soZmxhZzogYm9vbGVhbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRhc2tMaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YXNrTGlzdFtpXS5uZWVkQXV0b1BhY2sgPSBmbGFnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZmxhZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhc2tMaXN0W2ldLnVwbG9hZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhc2tMaXN0W2ldLnNraXAgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgb25la2V5T3BlcmF0ZVVwbG9hZChmbGFnOiBib29sZWFuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudGFza0xpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhc2tMaXN0W2ldLnVwbG9hZCA9IGZsYWc7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIG9uZWtleU9wZXJhdGVTa2lwUGFjayhmbGFnOiBib29sZWFuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudGFza0xpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhc2tMaXN0W2ldLnNraXAgPSBmbGFnO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnZXRBdXRvQ291bnQoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgY291bnQgPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRhc2tMaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudGFza0xpc3RbaV0ubmVlZEF1dG9QYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50Kys7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNvdW50O1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnZXRVcGxvYWRDb3VudCgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjb3VudCA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudGFza0xpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy50YXNrTGlzdFtpXS51cGxvYWQgJiYgdGhpcy50YXNrTGlzdFtpXS5uZWVkQXV0b1BhY2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY291bnQrKztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY291bnQ7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdldFByZXZpZXdDb3VudCgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjb3VudCA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudGFza0xpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy50YXNrTGlzdFtpXS5wcmV2aWV3ICYmIHRoaXMudGFza0xpc3RbaV0ubmVlZEF1dG9QYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50Kys7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNvdW50O1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnZXRQYWNrQ291bnQoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgY291bnQgPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRhc2tMaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLnRhc2tMaXN0W2ldLnNraXAgJiYgdGhpcy50YXNrTGlzdFtpXS5uZWVkQXV0b1BhY2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY291bnQrKztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY291bnQ7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIG9wZW5Mb2dEaXIocGF0aDogc3RyaW5nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWV4aXN0c1N5bmMocGF0aCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAnd2FybicsICfml6Xlv5fmlofku7blpLnkuI3lrZjlnKjvvIEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4ZWMoYHN0YXJ0IFwiXCIgXCIke3BhdGh9XCJgLCAoZXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCfmiafooYzlkb3ku6Tlh7rplJk6JywgZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCdlcnJvcicsICfplJnor68nLCAn5peg5rOV5omT5byA55uu5b2V77yM6K+35qOA5p+l6Lev5b6E5oiW5p2D6ZmQ77yBJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcign5omT5byA55uu5b2V5byC5bi4OicsIGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ2Vycm9yJywgJ+mUmeivrycsICflj5HnlJ/mnKrnn6XplJnor6/vvIzml6Dms5XmiZPlvIDnm67lvZXvvIEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgb3BlblRvb2xMb2coKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm9wZW5Mb2dEaXIoam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi90b29sTG9nJykpO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBjbGlja0F1dG9QYWNrVG9nZ2xlKGl0ZW06IFBhY2tQcm9qZWN0LCBmbGFnOiBib29sZWFuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtLm5lZWRBdXRvUGFjayA9IGZsYWc7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWZsYWcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtLnVwbG9hZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0uc2tpcCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHNldFBsYXRmb3JtRmlsZShpdGVtOiBQYWNrUHJvamVjdCwgcGF0aDogc3RyaW5nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWl0ZW0ucGxhdGZvcm1GaWxlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0ucGxhdGZvcm1GaWxlcyA9IHt9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFpdGVtLnBsYXRmb3JtRmlsZXNbaXRlbS5jaGFubmVsXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0ucGxhdGZvcm1GaWxlc1tpdGVtLmNoYW5uZWxdID0geyBwYXRoOiAnJywgaXNUZXN0OiBmYWxzZSB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS5wbGF0Zm9ybUZpbGVzW2l0ZW0uY2hhbm5lbF0ucGF0aCA9IHBhdGg7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHNldFBsYXRmb3JtRmlsZVNlcnZlcihpdGVtOiBQYWNrUHJvamVjdCwgaXNUZXN0OiBib29sZWFuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWl0ZW0ucGxhdGZvcm1GaWxlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0ucGxhdGZvcm1GaWxlcyA9IHt9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFpdGVtLnBsYXRmb3JtRmlsZXNbaXRlbS5jaGFubmVsXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0ucGxhdGZvcm1GaWxlc1tpdGVtLmNoYW5uZWxdID0geyBwYXRoOiAnJywgaXNUZXN0OiBmYWxzZSB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS5wbGF0Zm9ybUZpbGVzW2l0ZW0uY2hhbm5lbF0uaXNUZXN0ID0gaXNUZXN0O1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnZXRQbGF0Zm9ybUZpbGUoaXRlbTogUGFja1Byb2plY3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpdGVtLnBsYXRmb3JtRmlsZXMgJiYgaXRlbS5wbGF0Zm9ybUZpbGVzW2l0ZW0uY2hhbm5lbF0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gaXRlbS5wbGF0Zm9ybUZpbGVzW2l0ZW0uY2hhbm5lbF0ucGF0aCB8fCAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2V0UGxhdGZvcm1GaWxlU2VydmVyKGl0ZW06IFBhY2tQcm9qZWN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbS5wbGF0Zm9ybUZpbGVzICYmIGl0ZW0ucGxhdGZvcm1GaWxlc1tpdGVtLmNoYW5uZWxdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGl0ZW0ucGxhdGZvcm1GaWxlc1tpdGVtLmNoYW5uZWxdLmlzVGVzdCB8fCBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2V0VGFvQmFvRGVidWdVcmwoaXRlbTogUGFja1Byb2plY3QsIGlzUHJldmlldzogYm9vbGVhbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ3dhcm4nLCAn6aG555uu6YWN572u5Li656m677yM6K+35qOA5p+l6YWN572uJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFpdGVtLmFwcElkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ3dhcm4nLCAn6K+36L6T5YWl5q2j56Gu55qEYXBwSWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWl0ZW0udGJfY2xpX3Rva2VuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ3dhcm4nLCAn6K+36L6T5YWl5q2j56Gu55qE5reY5a6dQ0xJIFRva2VuJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmlzU2V0VGJDbGlUb2tlbiA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBzcGF3bl90YihbJ2NvbmZpZycsICdzZXQnLCAndG9rZW4nLCBpdGVtLnRiX2NsaV90b2tlbl0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmlzU2V0VGJDbGlUb2tlbiA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmlzQXV0b1BhY2sgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNQcmV2aWV3KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgY29tcGFyZVZlcnNpb24gPSAodmVyMTogc3RyaW5nLCB2ZXIyOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgYXJyMSA9IHZlcjEuc3BsaXQoJy4nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgYXJyMiA9IHZlcjIuc3BsaXQoJy4nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbGVuZ3RoID0gTWF0aC5taW4oYXJyMS5sZW5ndGgsIGFycjIubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcnIxW2ldID09IGFycjJbaV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBOdW1iZXIoYXJyMVtpXSkgLSBOdW1iZXIoYXJyMltpXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhcnIxLmxlbmd0aCAtIGFycjIubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBvdXRQYXRoID0gcGF0aC5qb2luKGl0ZW0ucGF0aCwgYGJ1aWxkLyR7Y29tcGFyZVZlcnNpb24oaXRlbS5lbmdpbmVWZXIsIFwiMy4wLjBcIikgPyBpdGVtLmNoYW5uZWwgOiAndGFvYmFvLW1pbmlnYW1lJ31gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNwYXduX3RiKFtcInByZXZpZXdcIiwgXCItaVwiLCBvdXRQYXRoLCBcIi1hXCIsIGl0ZW0uYXBwSWQsIFwiLXRcIiwgXCJtaW5pZ2FtZVwiLCBcIi0tY29weVwiLCBcInRydWVcIiwgXCItLXJlbmRlck1vZGVcIiwgXCJoaWdoUGVyZm9ybWFuY2VcIl0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKGRhdGE6IHsgcHJldmlld1VybDogc3RyaW5nIH0pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pc0F1dG9QYWNrID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy50YXNrTGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudGFza0xpc3RbaV0uYXBwSWQgPT09IGl0ZW0uYXBwSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhc2tMaXN0W2ldLnFyQ29kZVVybCA9IGRhdGEucHJldmlld1VybDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmlzQXV0b1BhY2sgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3Bhd25fdGIoWydhcHAnLCAnLWEnLCBpdGVtLmFwcElkXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoZGF0YTogeyB2ZXJzaW9uOiBzdHJpbmcgfSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmlzQXV0b1BhY2sgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEudmVyc2lvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHVybCA9IGBodHRwczovL20uZHVhbnF1LmNvbT9fYXJpdmVyX2FwcGlkPSR7aXRlbS5hcHBJZH0mbmJzdj0ke2RhdGEudmVyc2lvbn0mbmJzb3VyY2U9ZGVidWcmbmJzbj1UUklBTCZfbXBfY29kZT10YiZfY29udGFpbmVyX3R5cGU9Z20mdmNvbnNvbGU9dHJ1ZWBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucXJDb2RlVXJsID0gdXJsO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYGdldFRhb0Jhb0RlYnVnVXJsIHN1c2Nlc3MgJHt1cmx9YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ2Vycm9yJywgJ+Wksei0pScsICflpI3liLbpk77mjqXlpLHotKUhJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pc0F1dG9QYWNrID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnZXJyb3InLCAn5aSx6LSlJywgJ+WkjeWItumTvuaOpeWksei0pSEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaXNTZXRUYkNsaVRva2VuID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgY2xvc2VRckNvZGUoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnFyQ29kZVVybCA9ICcnO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBhc3luYyBjb3B5TGluayhsaW5rOiBzdHJpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChsaW5rICE9PSAnJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IG5hdmlnYXRvci5jbGlwYm9hcmQud3JpdGVUZXh0KGxpbmspO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ2luZm8nLCAn5a6M5oiQJywgYOWkjeWItumTvuaOpeaIkOWKn++8jOWPr+eymOi0tOS9v+eUqO+8gWApO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCdlcnJvcicsICflpLHotKUnLCBg5aSN5Yi26ZO+5o6l5aSx6LSlISAke2Vycm9yfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgY2hlY2tVcGxvYWQoaXRlbTogUGFja1Byb2plY3QsIGlzQ2hlY2s6IGJvb2xlYW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpdGVtLnByZXZpZXcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtLnByZXZpZXcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0udXBsb2FkID0gaXNDaGVjaztcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgY2hlY2tQcmV2aWV3KGl0ZW06IFBhY2tQcm9qZWN0LCBpc0NoZWNrOiBib29sZWFuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbS51cGxvYWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtLnVwbG9hZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS5wcmV2aWV3ID0gaXNDaGVjaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgdGVtcGxhdGU6IHJlYWRGaWxlU3luYyhqb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uL3N0YXRpYy90ZW1wbGF0ZS92dWUvcHJvamVjdC5odG1sJyksICd1dGYtOCcpLFxuICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgYXBwLm1vdW50KHRoaXMuJC5hcHApO1xuICAgICAgICAgICAgcGFuZWxEYXRhTWFwLnNldCh0aGlzLCBhcHApO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBiZWZvcmVDbG9zZSgpIHtcbiAgICB9LFxuICAgIGNsb3NlKCkge1xuICAgICAgICBjb25zdCBhcHAgPSBwYW5lbERhdGFNYXAuZ2V0KHRoaXMpO1xuICAgICAgICBpZiAoYXBwKSB7XG4gICAgICAgICAgICBtb2RpZnlQYWNrYWdlSnNvbigpO1xuXG4gICAgICAgICAgICBhcHAudW5tb3VudCgpO1xuICAgICAgICB9XG4gICAgfSxcbn0pO1xuIl19