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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
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
const CfgUtils_1 = __importDefault(require("./CfgUtils"));
const XLSX = __importStar(require("xlsx"));
const FileUtils_1 = require("./FileUtils");
const GitHelper_1 = require("./GitHelper");
const panelDataMap = new WeakMap();
const packsPath = (0, path_1.join)(__dirname, '../../../static/packconfigs/Packs.json');
const savePath = (0, path_1.join)(__dirname, '../../../static/packconfigs/save.json');
// 对应工程中不同平台使用的配置
const PlatformConfig = {
    'taobao-mini-game': 'PlatformConfig_taobao.ts'
};
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
    postToDingTalk: false,
    postToDingTalk2: false,
    md5Cache: false,
    sourceMaps: false,
    customConfigPath: '',
    mainBundleCompressionType: 'none',
    enginePath: '',
    engineVer: '',
    navigationBarTextStyle: 'black',
    preview: false
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
const importFunc = (cb) => {
    // 1. 动态创建一个隐藏的 input 标签
    const input = document.createElement('input');
    input.type = 'file';
    // 限制只能选择 json 文件，如果导入 Excel 可以改为 '.xlsx, .xls'
    input.accept = '.json,.xlsx,.xls';
    input.style.display = 'none';
    // 2. 监听文件选择的变化
    input.onchange = (e) => {
        var _a;
        const file = (_a = e.target.files) === null || _a === void 0 ? void 0 : _a[0];
        if (!file)
            return;
        // 获取文件后缀名，判断文件类型
        const fileName = file.name;
        const fileExt = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
        // 3. 使用 FileReader 读取文件内容
        const reader = new FileReader();
        reader.onload = (event) => {
            var _a, _b;
            try {
                let importedData = null;
                if (fileExt === '.json') {
                    // 获取文件里的文本内容并解析为 JSON
                    const result = (_a = event.target) === null || _a === void 0 ? void 0 : _a.result;
                    importedData = JSON.parse(result);
                }
                else if (fileExt === '.xlsx' || fileExt === '.xls') {
                    // Excel 文件：以二进制形式读取并解析
                    const data = new Uint8Array((_b = event.target) === null || _b === void 0 ? void 0 : _b.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                    importedData = CfgUtils_1.default.getJsonData(sheetData);
                }
                cb && cb(importedData);
            }
            catch (error) {
                console.error(error);
                (0, exports.openDilog)('error', '错误', '文件解析失败，请检查文件格式！');
            }
            // 5. 清理：将临时创建的 input 标签从页面中移除
            document.body.removeChild(input);
        };
        if (fileExt === '.json') {
            reader.readAsText(file); // JSON 以文本形式读取
        }
        else if (fileExt === '.xlsx' || fileExt === '.xls') {
            reader.readAsArrayBuffer(file); // Excel 以二进制形式读取
        }
    };
    // 6. 将 input 挂载到页面并触发点击，弹出文件选择框
    document.body.appendChild(input);
    input.click();
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
                        taskList: [],
                        isAutoPack: false,
                        qrCodeUrl: '',
                        isSetTbCliToken: false,
                        dingTalk: { dingTalkWebHook: '', dingTalkCustomContent_pack: '', dingTalkCustomContent_upload: '' },
                        qrCodeUrlMap: new Map(),
                        gitHelpers: [],
                        isPullGit: false,
                    };
                },
                mounted() {
                    this.initSaveData();
                },
                methods: {
                    initSaveData() {
                        this.taskList = (0, fs_extra_1.existsSync)(packsPath) ? JSON.parse((0, fs_extra_1.readFileSync)(packsPath, 'utf-8')).packs : [];
                        let taobaoCliTokenMap = new Map();
                        if ((0, fs_extra_1.existsSync)(savePath)) {
                            let data = (0, fs_extra_1.readJSONSync)(savePath);
                            if (data) {
                                if (data.ding_talk) {
                                    this.dingTalk = data.ding_talk;
                                }
                                if (data.taobao_cli_token) {
                                    for (let i = 0; i < data.taobao_cli_token.length; i++) {
                                        taobaoCliTokenMap.set(data.taobao_cli_token[i].appid, data.taobao_cli_token[i]);
                                    }
                                }
                            }
                        }
                        if (this.taskList) {
                            for (let i = 0; i < this.taskList.length; i++) {
                                if (taobaoCliTokenMap.has(this.taskList[i].appId)) {
                                    this.taskList[i].tb_cli_token = taobaoCliTokenMap.get(this.taskList[i].appId).token;
                                }
                                this.taskList[i].dingTalk = this.dingTalk;
                            }
                        }
                    },
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
                            if ((task.postToDingTalk || task.postToDingTalk2) && (!task.dingTalk || !task.dingTalk.dingTalkWebHook)) {
                                (0, exports.openDilog)('warn', 'warn', '勾选了钉钉推送，请正确填写钉钉WebHook！');
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
                            this.saveConfig();
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
                                    let msg = '';
                                    if ((0, fs_extra_1.existsSync)(savePath)) {
                                        let saveData = JSON.parse((0, fs_extra_1.readFileSync)(savePath, 'utf-8'));
                                        // 检测是否有预览码生成
                                        this.qrCodeUrlMap.clear();
                                        if (saveData.qrCodeUrls) {
                                            for (let i = 0; i < saveData.qrCodeUrls.length; i++) {
                                                this.qrCodeUrlMap.set(saveData.qrCodeUrls[i].appid, saveData.qrCodeUrls[i]);
                                            }
                                        }
                                        // 自动化结果
                                        if (saveData.successedPack && saveData.successedPack.length > 0) {
                                            msg += '构建成功：';
                                            for (let i = 0; i < saveData.successedPack.length; i++) {
                                                msg += `${saveData.successedPack[i]}${i === saveData.successedPack.length - 1 ? '\n' : ' '}`;
                                            }
                                        }
                                        if (saveData.failedPack && saveData.failedPack.length > 0) {
                                            msg += '构建失败：';
                                            for (let i = 0; i < saveData.failedPack.length; i++) {
                                                msg += `${saveData.failedPack[i]}${i === saveData.failedPack.length - 1 ? '\n' : ' '}`;
                                            }
                                        }
                                        if (saveData.successedUpload && saveData.successedUpload.length > 0) {
                                            msg += '上传成功：';
                                            for (let i = 0; i < saveData.successedUpload.length; i++) {
                                                msg += `${saveData.successedUpload[i]}${i === saveData.successedUpload.length - 1 ? '\n' : ' '}`;
                                            }
                                        }
                                        if (saveData.failedUpload && saveData.failedUpload.length > 0) {
                                            msg += '上传失败：';
                                            for (let i = 0; i < saveData.failedUpload.length; i++) {
                                                msg += `${saveData.failedUpload[i]}${i === saveData.failedUpload.length - 1 ? '\n' : ' '}`;
                                            }
                                        }
                                        if (saveData.successedPreview && saveData.successedPreview.length > 0) {
                                            msg += '预览成功：';
                                            for (let i = 0; i < saveData.successedPreview.length; i++) {
                                                msg += `${saveData.successedPreview[i]}${i === saveData.successedPreview.length - 1 ? '\n' : ' '}`;
                                            }
                                        }
                                        if (saveData.failedPreview && saveData.failedPreview.length > 0) {
                                            msg += '预览失败：';
                                            for (let i = 0; i < saveData.failedPreview.length; i++) {
                                                msg += `${saveData.failedPreview[i]}${i === saveData.failedPreview.length - 1 ? '\n' : ' '}`;
                                            }
                                        }
                                    }
                                    (0, exports.openDilog)('info', '完成', `自动化完成!\n${msg}`);
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
                                let serverMsg = task.skip ? '' : (task.platformFiles && task.platformFiles[task.channel] ? '，' + (task.platformFiles[task.channel].isTest ? '测试服' : '正式服') : '');
                                msg += `${task.appId}：${task.name}，构建：${(task.skip ? '✕' : '✓')}，上传：${(task.upload ? '✓' : '✕')}，预览：${(task.preview ? '✓' : '✕')}${serverMsg}\n`;
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
                        // 说明静态文件中有 Packs.json了，询问是否替换
                        const cb = (importedData) => {
                            // 假设导入的 JSON 格式也是 { packs: [...] }
                            if (importedData && ((importedData.packs && Array.isArray(importedData.packs) || Array.isArray(importedData)))) {
                                // 将导入的数据替换到当前的 taskList 中
                                let data = importedData.packs ? importedData.packs : importedData;
                                let tmps = [...this.taskList];
                                this.taskList = [];
                                for (let i = 0; i < data.length; i++) {
                                    this.taskList[i] = Object.assign(Object.assign({}, TaskTemp), data[i]);
                                    this.taskList[i].dingTalk = this.dingTalk;
                                    this.getPlatformFile(this.taskList[i]);
                                    for (let j = 0; j < tmps.length; j++) {
                                        if (this.taskList[i].appId === tmps[j].appId && tmps[j].tb_cli_token) {
                                            this.taskList[i].tb_cli_token = tmps[j].tb_cli_token;
                                            break;
                                        }
                                    }
                                }
                                // 4. 触发保存，将新数据写入本地 Packs.json
                                this.saveConfig();
                                // 如果有 Editor.Dialog，可以弹个成功提示
                                (0, exports.openDilog)('info', '提示', '导入成功！');
                            }
                            else {
                                (0, exports.openDilog)('warn', '警告', '导入的文件格式不正确！');
                            }
                        };
                        if (this.taskList && this.taskList.length > 0) {
                            let btnMap = new Map();
                            btnMap.set('replace', () => {
                                importFunc(cb);
                            });
                            btnMap.set('cancel', null);
                            (0, exports.openDilog)('warn', 'replace', 'Packs.json 已存在，是否替换?', btnMap);
                        }
                        else {
                            importFunc(cb);
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
                            let packs = [];
                            for (let i = 0; i < this.taskList.length; i++) {
                                const _a = this.taskList[i], { dingTalk, tb_cli_token } = _a, t = __rest(_a, ["dingTalk", "tb_cli_token"]);
                                packs.push(t);
                            }
                            const exportData = { packs };
                            const dataStr = JSON.stringify(exportData, null, "\t");
                            // 2. 获取当前系统的桌面路径
                            const desktopPath = os_1.default.homedir() + '/Desktop';
                            // 3. 拼接完整的保存路径
                            const exportPath = (0, path_1.join)(desktopPath, `Packs.json`);
                            // 4. 使用 Node.js 原生 fs 模块同步写入文件到桌面
                            (0, fs_extra_1.writeFileSync)(exportPath, dataStr, 'utf-8');
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
                                this.taskList[i].preview = false;
                                this.taskList[i].skip = true;
                            }
                        }
                    },
                    onekeyOperateUpload(flag) {
                        for (let i = 0; i < this.taskList.length; i++) {
                            this.taskList[i].upload = flag;
                        }
                    },
                    onekeyOperatePreview(flag) {
                        for (let i = 0; i < this.taskList.length; i++) {
                            this.taskList[i].preview = flag;
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
                            item.preview = false;
                        }
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
                        if (item.path) {
                            let path = FileUtils_1.FileUtils.findFile(item.path, PlatformConfig[item.channel]);
                            if (item.platformFiles && item.platformFiles[item.channel]) {
                                item.platformFiles[item.channel].path = path;
                            }
                            return path;
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
                    getApiVersion(item) {
                        let apiVersion = '';
                        if (item.platformFiles && item.platformFiles[item.channel]) {
                            let path = this.getPlatformFile(item);
                            if ((0, fs_extra_1.existsSync)(path)) {
                                try {
                                    let fileContent = (0, fs_extra_1.readFileSync)(path, 'utf-8');
                                    if (fileContent) {
                                        // 使用正则表达式匹配 apiVersion 的值
                                        // 这个正则表达式的解释：
                                        // apiVersion:        -> 匹配字面量 "apiVersion:"
                                        // \s*                -> 匹配零个或多个空白字符（如空格、换行）
                                        // "                  -> 匹配一个双引号
                                        // ([^"]*)            -> 这是一个捕获组，匹配除了双引号以外的任意字符，直到遇到下一个双引号
                                        // "                  -> 匹配结尾的双引号
                                        const versionRegex = /apiVersion:\s*"([^"]*)"/;
                                        const matchResult = fileContent.match(versionRegex);
                                        // 检查是否匹配成功并提取值
                                        if (matchResult && matchResult[1]) {
                                            // matchResult[1] 就是第一个捕获组的内容，也就是我们想要的值
                                            apiVersion = matchResult[1];
                                        }
                                        return apiVersion;
                                    }
                                }
                                catch (error) {
                                    return apiVersion;
                                }
                            }
                            else {
                                return apiVersion;
                            }
                        }
                        else {
                            return apiVersion;
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
                                            this.qrCodeUrlMap.set(item.appId, { appid: item.appId, url: data.previewUrl });
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
                    },
                    saveConfig() {
                        if ((0, fs_extra_1.existsSync)(savePath)) {
                            let saveData = (0, fs_extra_1.readJSONSync)(savePath);
                            if (saveData && saveData.apiVersions) {
                                saveData.apiVersions = [];
                                let saveDataStr = JSON.stringify(saveData, null, "\t");
                                (0, fs_extra_1.writeFileSync)(savePath, saveDataStr, 'utf-8');
                            }
                        }
                        let saveData = {
                            ding_talk: {
                                dingTalkWebHook: '',
                                dingTalkCustomContent_pack: '',
                                dingTalkCustomContent_upload: ''
                            },
                            taobao_cli_token: [],
                            qrCodeUrls: [],
                            apiVersions: []
                        };
                        let saveDingTalk = false;
                        let packs = [];
                        for (let i = 0; i < this.taskList.length; i++) {
                            this.taskList[i] = Object.assign(Object.assign({}, TaskTemp), this.taskList[i]);
                            if (this.taskList[i].tb_cli_token) {
                                saveData.taobao_cli_token.push({ appid: this.taskList[i].appId, name: this.taskList[i].name, token: this.taskList[i].tb_cli_token });
                            }
                            if (this.taskList[i].dingTalk) {
                                if (!saveDingTalk) {
                                    saveDingTalk = true;
                                    saveData.ding_talk = Object.assign({}, this.taskList[i].dingTalk);
                                }
                            }
                            if (this.taskList[i].platformFiles && this.taskList[i].platformFiles[this.taskList[i].channel] && this.taskList[i].platformFiles[this.taskList[i].channel].apiVersion) {
                                saveData.apiVersions.push({
                                    appid: this.taskList[i].appId,
                                    apiVersion: this.taskList[i].platformFiles[this.taskList[i].channel].apiVersion
                                });
                                delete this.taskList[i].platformFiles[this.taskList[i].channel].apiVersion;
                            }
                            const _a = this.taskList[i], { dingTalk, tb_cli_token } = _a, t = __rest(_a, ["dingTalk", "tb_cli_token"]);
                            packs.push(t);
                        }
                        this.qrCodeUrlMap.clear();
                        let data = { packs };
                        let dataStr = JSON.stringify(data, null, "\t");
                        (0, fs_extra_1.writeFileSync)(packsPath, dataStr, 'utf-8');
                        let saveDataStr = JSON.stringify(saveData, null, "\t");
                        (0, fs_extra_1.writeFileSync)(savePath, saveDataStr, 'utf-8');
                    },
                    importCliToken() {
                        const cb = (data) => {
                            if (data) {
                                if (this.taskList && this.taskList.length > 0) {
                                    for (let i = 0; i < this.taskList.length; i++) {
                                        let task = this.taskList[i];
                                        if (task.channel === 'taobao-mini-game') {
                                            for (let j = 0; j < data.length; j++) {
                                                if (data[j].appid === task.appId) {
                                                    task.tb_cli_token = data[j].token;
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                    (0, exports.openDilog)('info', 'info', '导入成功！');
                                    this.saveConfig();
                                }
                                else {
                                    (0, exports.openDilog)('warn', 'warn', '请先添加自动化项目配置！');
                                }
                            }
                            else {
                                (0, exports.openDilog)('warn', 'warn', '导入cli token 数据失败！');
                            }
                        };
                        importFunc(cb);
                    },
                    async pullGit(item) {
                        let projectPath = item.path;
                        let gitUrl = (item.gitConfig && item.gitConfig.gitUrl) || '';
                        let branch = (item.gitConfig && item.gitConfig.gitBranch) || '';
                        if (!projectPath) {
                            (0, exports.openDilog)('warn', 'warn', '请输入项目路径');
                            return;
                        }
                        if (!gitUrl) {
                            (0, exports.openDilog)('warn', 'warn', '请输入git地址');
                            return;
                        }
                        if (!branch) {
                            branch = 'master';
                        }
                        let gitHelper = null;
                        if (this.gitHelpers.length > 0) {
                            gitHelper = this.gitHelpers[0];
                            gitHelper.updateGit(projectPath);
                        }
                        else {
                            gitHelper = new GitHelper_1.GitHelper({ projectPath, gitUrl, onLog: (msg) => { console.log(`GitHelper: ${projectPath}  ${msg}`); } });
                            this.gitHelpers.push(gitHelper);
                        }
                        this.isPullGit = true;
                        let result = await gitHelper.updateToLatest({ projectPath, gitUrl, branch, force: true });
                        this.isPullGit = false;
                        if (!result.success) {
                            (0, exports.openDilog)('warn', 'warn', result.message);
                            return;
                        }
                        (0, exports.openDilog)('info', 'info', '更新成功');
                    },
                    async allPullGit() {
                        let pullArr = [];
                        for (let i = 0; i < this.taskList.length; i++) {
                            const task = this.taskList[i];
                            if (task.path && task.gitConfig && task.gitConfig.gitUrl) {
                                pullArr.push({ projectPath: task.path, gitUrl: task.gitConfig.gitUrl, branch: task.gitConfig.gitBranch });
                            }
                        }
                        let total = pullArr.length;
                        if (total > 0) {
                            let count = 0;
                            let failPullArr = [];
                            const checkOver = (error) => {
                                if (count === total) {
                                    this.isPullGit = false;
                                    let failStr = '';
                                    if (failPullArr.length > 0) {
                                        failStr = '\n' + '更新失败项目:' + '\n';
                                        for (let i = 0; i < failPullArr.length; i++) {
                                            failStr += `${failPullArr[i]}\n`;
                                        }
                                        failStr += `\n ${error}`;
                                    }
                                    (0, exports.openDilog)('info', 'info', `更新完成${failStr}`);
                                }
                            };
                            let index = 0;
                            let errMsg = '';
                            const tasks = pullArr.map((item) => {
                                let { projectPath, gitUrl, branch } = item;
                                if (!branch) {
                                    branch = 'master';
                                }
                                let gitHelper = null;
                                if (index <= this.gitHelpers.length - 1) {
                                    gitHelper = this.gitHelpers[index];
                                    gitHelper.updateGit(projectPath);
                                }
                                else {
                                    gitHelper = new GitHelper_1.GitHelper({ projectPath, gitUrl, onLog: (msg) => { console.log(`GitHelper: ${projectPath}  ${msg}`); } });
                                    this.gitHelpers.push(gitHelper);
                                }
                                index++;
                                return gitHelper.updateToLatest({ projectPath, gitUrl, branch, force: true }).then((result) => {
                                    count++;
                                    if (!result.success) {
                                        failPullArr.push(result.projectPath);
                                    }
                                    checkOver(errMsg);
                                }).catch((error) => {
                                    errMsg += error + '\n';
                                    count++;
                                    failPullArr.push(projectPath);
                                    checkOver(errMsg);
                                });
                            });
                            await Promise.all(tasks);
                        }
                    },
                    setGitUrl(item, gitUrl) {
                        if (item) {
                            if (!item.gitConfig) {
                                item.gitConfig = { gitUrl: '', gitBranch: '' };
                            }
                            item.gitConfig.gitUrl = gitUrl;
                        }
                    },
                    setGitBranch(item, gitBranch) {
                        if (item) {
                            if (!item.gitConfig) {
                                item.gitConfig = { gitUrl: '', gitBranch: '' };
                            }
                            item.gitConfig.gitBranch = gitBranch;
                        }
                    },
                    onekeySaveConfig() {
                        this.saveConfig();
                        (0, exports.openDilog)('info', 'info', '保存成功');
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
            if ((0, fs_extra_1.existsSync)(savePath)) {
                let saveData = (0, fs_extra_1.readJSONSync)(savePath);
                if (saveData) {
                    saveData.qrCodeUrls = [];
                    if (saveData.successedPack) {
                        delete saveData.successedPack;
                    }
                    if (saveData.failedPack) {
                        delete saveData.failedPack;
                    }
                    if (saveData.successedUpload) {
                        delete saveData.successedUpload;
                    }
                    if (saveData.failedUpload) {
                        delete saveData.failedUpload;
                    }
                    if (saveData.successedPreview) {
                        delete saveData.successedPreview;
                    }
                    if (saveData.failedPreview) {
                        delete saveData.failedPreview;
                    }
                    if (saveData.apiVersions) {
                        delete saveData.apiVersions;
                    }
                    let saveDataStr = JSON.stringify(saveData, null, "\t");
                    (0, fs_extra_1.writeFileSync)(savePath, saveDataStr, 'utf-8');
                }
            }
            app.unmount();
        }
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zb3VyY2UvcGFuZWxzL2RlZmF1bHQvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLCtDQUErQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFL0MsaURBQTRFO0FBQzVFLHVDQUFpRjtBQUNqRiw2Q0FBa0M7QUFDbEMsNkJBQXNEO0FBQ3RELDRDQUFvQjtBQUNwQiwwREFBa0M7QUFDbEMsMkNBQTZCO0FBQzdCLDJDQUF3QztBQUN4QywyQ0FBd0M7QUFDeEMsTUFBTSxZQUFZLEdBQUcsSUFBSSxPQUFPLEVBQVksQ0FBQztBQThCN0MsTUFBTSxTQUFTLEdBQUcsSUFBQSxXQUFJLEVBQUMsU0FBUyxFQUFFLHdDQUF3QyxDQUFDLENBQUM7QUFDNUUsTUFBTSxRQUFRLEdBQUcsSUFBQSxXQUFJLEVBQUMsU0FBUyxFQUFFLHVDQUF1QyxDQUFDLENBQUM7QUFFMUUsaUJBQWlCO0FBQ2pCLE1BQU0sY0FBYyxHQUFHO0lBQ25CLGtCQUFrQixFQUFFLDBCQUEwQjtDQUNqRCxDQUFBO0FBMENELE1BQU0sUUFBUSxHQUFnQjtJQUMxQixLQUFLLEVBQUUsRUFBRTtJQUNULElBQUksRUFBRSxFQUFFO0lBQ1IsSUFBSSxFQUFFLEVBQUU7SUFDUixPQUFPLEVBQUUsa0JBQWtCO0lBQzNCLElBQUksRUFBRSxLQUFLO0lBQ1gsTUFBTSxFQUFFLEtBQUs7SUFDYixZQUFZLEVBQUUsS0FBSztJQUNuQixhQUFhLEVBQUU7UUFDWCxrQkFBa0IsRUFBRTtZQUNoQixJQUFJLEVBQUUsRUFBRTtZQUNSLE1BQU0sRUFBRSxLQUFLO1NBQ2hCO0tBQ0o7SUFDRCxjQUFjLEVBQUUsS0FBSztJQUNyQixlQUFlLEVBQUUsS0FBSztJQUN0QixRQUFRLEVBQUUsS0FBSztJQUNmLFVBQVUsRUFBRSxLQUFLO0lBQ2pCLGdCQUFnQixFQUFFLEVBQUU7SUFD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b0JBQ3BDLENBQUM7b0JBQ0QsSUFBSSxRQUFRLENBQUMsWUFBWSxFQUFFLENBQUM7d0JBQ3hCLE9BQU8sUUFBUSxDQUFDLFlBQVksQ0FBQztvQkFDakMsQ0FBQztvQkFDRCxJQUFJLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO3dCQUM1QixPQUFPLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQztvQkFDckMsQ0FBQztvQkFDRCxJQUFJLFFBQVEsQ0FBQyxhQUFhLEVBQUUsQ0FBQzt3QkFDekIsT0FBTyxRQUFRLENBQUMsYUFBYSxDQUFDO29CQUNsQyxDQUFDO29CQUNELElBQUksUUFBUSxDQUFDLFdBQVcsRUFBRSxDQUFDO3dCQUN2QixPQUFPLFFBQVEsQ0FBQyxXQUFXLENBQUM7b0JBQ2hDLENBQUM7b0JBQ0QsSUFBSSxXQUFXLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO29CQUN2RCxJQUFBLHdCQUFhLEVBQUMsUUFBUSxFQUFFLFdBQVcsRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFDbEQsQ0FBQztZQUNMLENBQUM7WUFFRCxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDbEIsQ0FBQztJQUNMLENBQUM7Q0FDSixDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSB2dWUvb25lLWNvbXBvbmVudC1wZXItZmlsZSAqL1xuXG5pbXBvcnQgeyBDaGlsZFByb2Nlc3NXaXRob3V0TnVsbFN0cmVhbXMsIHNwYXduLCBleGVjIH0gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgeyBleGlzdHNTeW5jLCByZWFkRmlsZVN5bmMsIHJlYWRKU09OU3luYywgd3JpdGVGaWxlU3luYyB9IGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBwYXRoLCB7IGpvaW4gfSBmcm9tICdwYXRoJztcbmltcG9ydCB7IGNyZWF0ZUFwcCwgQXBwLCBkZWZpbmVDb21wb25lbnQgfSBmcm9tICd2dWUnO1xuaW1wb3J0IG9zIGZyb20gJ29zJztcbmltcG9ydCBDZmdVdGlscyBmcm9tICcuL0NmZ1V0aWxzJztcbmltcG9ydCAqIGFzIFhMU1ggZnJvbSAneGxzeCc7XG5pbXBvcnQgeyBGaWxlVXRpbHMgfSBmcm9tICcuL0ZpbGVVdGlscyc7XG5pbXBvcnQgeyBHaXRIZWxwZXIgfSBmcm9tICcuL0dpdEhlbHBlcic7XG5jb25zdCBwYW5lbERhdGFNYXAgPSBuZXcgV2Vha01hcDxhbnksIEFwcD4oKTtcbi8qKlxuICogQHpoIOWmguaenOW4jOacm+WFvOWuuSAzLjMg5LmL5YmN55qE54mI5pys5Y+v5Lul5L2/55So5LiL5pa555qE5Luj56CBXG4gKiBAZW4gWW91IGNhbiBhZGQgdGhlIGNvZGUgYmVsb3cgaWYgeW91IHdhbnQgY29tcGF0aWJpbGl0eSB3aXRoIHZlcnNpb25zIHByaW9yIHRvIDMuM1xuICovXG4vLyBFZGl0b3IuUGFuZWwuZGVmaW5lID0gRWRpdG9yLlBhbmVsLmRlZmluZSB8fCBmdW5jdGlvbihvcHRpb25zOiBhbnkpIHsgcmV0dXJuIG9wdGlvbnMgfVxuXG5pbnRlcmZhY2UgUGFja1Byb2plY3Qge1xuICAgIGFwcElkOiBzdHJpbmcsXG4gICAgbmFtZTogc3RyaW5nLFxuICAgIHBhdGg6IHN0cmluZywvLyBDb2Nvc+mhueebruagueebruW9lVxuICAgIGNoYW5uZWw6IHN0cmluZywvLyDmjIflrprmiZPljIXlr7nlupTmuKDpgZPlkI3np7BcbiAgICBza2lwOiBib29sZWFuLC8vIOaYr+WQpui3s+i/h2NvY29z5p6E5bu65bel56iL77yM55u05o6l5L2/55So5a+85Ye65bel56iLXG4gICAgdXBsb2FkOiBib29sZWFuLC8vIOaYr+WQpumcgOimgeS4iuS8oCDkuI5wcmV2aWV35LqS5palXG4gICAgbmVlZEF1dG9QYWNrOiBib29sZWFuLC8vIOaYr+WQpumcgOimgei/m+ihjOiHquWKqOaehOW7uuS4iuS8oFxuICAgIHBsYXRmb3JtRmlsZXM6IHsgW2tleTogc3RyaW5nXTogeyBwYXRoOiBzdHJpbmcsIGlzVGVzdDogYm9vbGVhbiwgYXBpVmVyc2lvbj86IHN0cmluZyB9IH0sLy8ga2V55bmz5Y+w5ZCN56ew5LiOY2hhbm5lbOWvueW6lO+8jHZhbHVl5ri45oiP5bel56iL5Lit5bmz5Y+w55qE6YWN572u5paH5Lu2XG4gICAgcG9zdFRvRGluZ1RhbGs6IGJvb2xlYW4sLy8g5piv5ZCm5o6o6YCB6ZKJ6ZKJY29jb3PmnoTlu7rnu5PmnpxcbiAgICBwb3N0VG9EaW5nVGFsazI6IGJvb2xlYW4sLy8g5piv5ZCm5o6o6YCB6ZKJ6ZKJY2xp5LiK5Lyg5oiW6aKE6KeI57uT5p6cXG4gICAgbWQ1Q2FjaGU6IGJvb2xlYW4sXG4gICAgc291cmNlTWFwczogYm9vbGVhbixcbiAgICBjdXN0b21Db25maWdQYXRoOiBzdHJpbmcsLy/oh6rlrprkuYnmnoTlu7rmqKHmnb9qc29u6Lev5b6EXG4gICAgbWFpbkJ1bmRsZUNvbXByZXNzaW9uVHlwZTogc3RyaW5nLC8v5Li75YyF5Y6L57yp57G75Z6LICDml6DljovnvKnvvJogXCJub25lXCIgIOWQiOW5tuS+nei1lu+8miBcIm1lcmdlX2RlcFwiICDlkIjlubbmiYDmnIlKU09O77yaIFwibWVyZ2VfYWxsX2pzb25cIiAgWklQ77yaIFwiemlwXCIgIOWwj+a4uOaIj+WIhuWMhe+8miBcInN1YnBhY2thZ2VcIlxuICAgIGVuZ2luZVBhdGg6IHN0cmluZywvLyBjb2Nvc+W8leaTjui3r+W+hFxuICAgIGVuZ2luZVZlcjogc3RyaW5nLC8vIGNvY29z5byV5pOO54mI5pysXG4gICAgbmF2aWdhdGlvbkJhclRleHRTdHlsZTogc3RyaW5nLC8vIOWvvOiIquagj+agh+mimOminOiJslxuICAgIHByZXZpZXc6IGJvb2xlYW4sLy8g5piv5ZCm6aKE6KeIIOS4jnVwbG9hZOS6kuaWpVxuICAgIHRiX2NsaV90b2tlbj86IHN0cmluZywvLyB0YW9iYW8gY2xpIHRva2VuXG4gICAgZGluZ1RhbGs/OiBEaW5nVGFsaywvLyDpkonpkonmnLrlmajkurrphY3nva5cbiAgICBnaXRDb25maWc/OiBHaXRDb25maWcsLy8gZ2l06YWN572uXG59XG5jb25zdCBwYWNrc1BhdGggPSBqb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uL3N0YXRpYy9wYWNrY29uZmlncy9QYWNrcy5qc29uJyk7XG5jb25zdCBzYXZlUGF0aCA9IGpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vc3RhdGljL3BhY2tjb25maWdzL3NhdmUuanNvbicpO1xuXG4vLyDlr7nlupTlt6XnqIvkuK3kuI3lkIzlubPlj7Dkvb/nlKjnmoTphY3nva5cbmNvbnN0IFBsYXRmb3JtQ29uZmlnID0ge1xuICAgICd0YW9iYW8tbWluaS1nYW1lJzogJ1BsYXRmb3JtQ29uZmlnX3Rhb2Jhby50cydcbn1cblxuaW50ZXJmYWNlIFRhb0Jhb19DbGlfVG9rZW4ge1xuICAgIGFwcGlkOiBzdHJpbmcsXG4gICAgbmFtZTogc3RyaW5nLFxuICAgIHRva2VuOiBzdHJpbmdcbn1cblxuaW50ZXJmYWNlIERpbmdUYWxrIHtcbiAgICBkaW5nVGFsa1dlYkhvb2s6IHN0cmluZyxcbiAgICBkaW5nVGFsa0N1c3RvbUNvbnRlbnRfcGFjazogc3RyaW5nLFxuICAgIGRpbmdUYWxrQ3VzdG9tQ29udGVudF91cGxvYWQ6IHN0cmluZ1xufVxuXG5pbnRlcmZhY2UgUVJDb2RlIHtcbiAgICBhcHBpZDogc3RyaW5nLFxuICAgIHVybDogc3RyaW5nXG59XG5cbmludGVyZmFjZSBBcGlWZXJzaW9uIHtcbiAgICBhcHBpZDogc3RyaW5nLFxuICAgIGFwaVZlcnNpb246IHN0cmluZ1xufVxuXG5pbnRlcmZhY2UgU2F2ZURhdGEge1xuICAgIGRpbmdfdGFsazogRGluZ1RhbGssXG4gICAgdGFvYmFvX2NsaV90b2tlbjogVGFvQmFvX0NsaV9Ub2tlbltdLFxuICAgIHFyQ29kZVVybHM6IFFSQ29kZVtdLFxuICAgIHN1Y2Nlc3NlZFBhY2s/OiBzdHJpbmdbXSxcbiAgICBmYWlsZWRQYWNrPzogc3RyaW5nW10sXG4gICAgc3VjY2Vzc2VkVXBsb2FkPzogc3RyaW5nW10sXG4gICAgZmFpbGVkVXBsb2FkPzogc3RyaW5nW10sXG4gICAgc3VjY2Vzc2VkUHJldmlldz86IHN0cmluZ1tdLFxuICAgIGZhaWxlZFByZXZpZXc/OiBzdHJpbmdbXSxcbiAgICBhcGlWZXJzaW9ucz86IEFwaVZlcnNpb25bXVxufVxuXG5pbnRlcmZhY2UgR2l0Q29uZmlnIHtcbiAgICBnaXRVcmw6IHN0cmluZyxcbiAgICBnaXRCcmFuY2g6IHN0cmluZ1xufVxuXG5jb25zdCBUYXNrVGVtcDogUGFja1Byb2plY3QgPSB7XG4gICAgYXBwSWQ6ICcnLFxuICAgIG5hbWU6ICcnLFxuICAgIHBhdGg6ICcnLFxuICAgIGNoYW5uZWw6ICd0YW9iYW8tbWluaS1nYW1lJyxcbiAgICBza2lwOiBmYWxzZSxcbiAgICB1cGxvYWQ6IGZhbHNlLFxuICAgIG5lZWRBdXRvUGFjazogZmFsc2UsXG4gICAgcGxhdGZvcm1GaWxlczoge1xuICAgICAgICAndGFvYmFvLW1pbmktZ2FtZSc6IHtcbiAgICAgICAgICAgIHBhdGg6ICcnLFxuICAgICAgICAgICAgaXNUZXN0OiBmYWxzZVxuICAgICAgICB9XG4gICAgfSxcbiAgICBwb3N0VG9EaW5nVGFsazogZmFsc2UsXG4gICAgcG9zdFRvRGluZ1RhbGsyOiBmYWxzZSxcbiAgICBtZDVDYWNoZTogZmFsc2UsXG4gICAgc291cmNlTWFwczogZmFsc2UsXG4gICAgY3VzdG9tQ29uZmlnUGF0aDogJycsXG4gICAgbWFpbkJ1bmRsZUNvbXByZXNzaW9uVHlwZTogJ25vbmUnLFxuICAgIGVuZ2luZVBhdGg6ICcnLFxuICAgIGVuZ2luZVZlcjogJycsXG4gICAgbmF2aWdhdGlvbkJhclRleHRTdHlsZTogJ2JsYWNrJyxcbiAgICBwcmV2aWV3OiBmYWxzZVxufTtcblxuY29uc3Qgc3Bhd25fdGIgPSAoYXJnczogc3RyaW5nW10sIHN1Y2Nlc3M6IEZ1bmN0aW9uLCBmYWlsOiBGdW5jdGlvbikgPT4ge1xuICAgIGxldCBzcDogQ2hpbGRQcm9jZXNzV2l0aG91dE51bGxTdHJlYW1zID0gc3Bhd24oXCJ0YmdhbWVcIiwgYXJncywgeyBzaGVsbDogdHJ1ZSB9KTtcbiAgICBzcC5zdGRvdXQuc2V0RW5jb2RpbmcoJ3V0ZjgnKTtcbiAgICBsZXQgY29tbW9uZFN0ciA9IHNwLnNwYXduYXJnc1s0XS5yZXBsYWNlKC9cIi9nLCAnJyk7XG4gICAgbGV0IGNsaVRva2VuRmFpbGVkID0gZmFsc2U7XG4gICAgbGV0IHZlcnNpb24gPSAnJztcbiAgICBsZXQgcHJldmlld1VybCA9ICcnO1xuICAgIGxldCBuZXh0RGF0YUlzUXJDb2RlID0gZmFsc2U7XG5cbiAgICBzcC5zdGRvdXQub24oJ2RhdGEnLCAoZGF0YSkgPT4ge1xuICAgICAgICBpZiAobmV4dERhdGFJc1FyQ29kZSkge1xuICAgICAgICAgICAgbmV4dERhdGFJc1FyQ29kZSA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coYHNwYXduX3RiOiAke2NvbW1vbmRTdHJ9IHN0ZG91dCAke2RhdGEudG9TdHJpbmcoKX1gKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF0YS5pbmRleE9mKCfmnIDmlrDnur/kuIrniYjmnKw6JykgPiAtMSkge1xuICAgICAgICAgICAgbGV0IHN0cjogc3RyaW5nID0gZGF0YS50cmltKCk7XG4gICAgICAgICAgICBsZXQgYXJyID0gc3RyLnNwbGl0KCfmnIDmlrDnur/kuIrniYjmnKw6Jyk7XG4gICAgICAgICAgICB2ZXJzaW9uID0gYXJyWzFdLnRyaW0oKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF0YS5pbmRleE9mKCfpooTop4jkuoznu7TnoIHlnLDlnYDvvJonKSA+IC0xKSB7XG4gICAgICAgICAgICBsZXQgc3RyOiBzdHJpbmcgPSBkYXRhLnRyaW0oKTtcbiAgICAgICAgICAgIGxldCBhcnIgPSBzdHIuc3BsaXQoJ+mihOiniOS6jOe7tOeggeWcsOWdgO+8micpO1xuICAgICAgICAgICAgcHJldmlld1VybCA9IGFyclsxXS50cmltKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhdGEuaW5kZXhPZign5bey5aSN5Yi26aKE6KeI56CB5Yiw5Ymq6LS05p2/JykgPiAtMSkge1xuICAgICAgICAgICAgbmV4dERhdGFJc1FyQ29kZSA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICBzcC5zdGRlcnIub24oJ2RhdGEnLCAoZGF0YSkgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZyhgc3Bhd25fdGI6ICR7Y29tbW9uZFN0cn0gc3RkZXJyICR7ZGF0YS50b1N0cmluZygpfWApO1xuICAgICAgICBpZiAoZGF0YS5pbmRleE9mKCdDTEkgYXV0aCBmYWlsZWQnKSA+IC0xKSB7XG4gICAgICAgICAgICBjbGlUb2tlbkZhaWxlZCA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICBzcC5vbignZXhpdCcsIGFzeW5jIChjb2RlLCBkYXRhKSA9PiB7XG4gICAgICAgIGlmIChjb2RlID09PSAwKSB7XG4gICAgICAgICAgICBpZiAoY2xpVG9rZW5GYWlsZWQpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgc3Bhd25fdGI6ICR7Y29tbW9uZFN0cn0gZmFpbGVkIOiuvue9ruiwg+eUqOWHreivgVRva2Vu6ZSZ6K+vYCk7XG4gICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ3dhcm4nLCAn6K6+572u6LCD55So5Yet6K+BVG9rZW7plJnor68hJyk7XG4gICAgICAgICAgICAgICAgZmFpbCAmJiBmYWlsKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgc3Bhd25fdGI6ICR7Y29tbW9uZFN0cn0gc3VjY2Vzc2ApO1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3MgJiYgc3VjY2Vzcyh7IHZlcnNpb24sIHByZXZpZXdVcmwgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgc3Bhd25fdGI6ICR7Y29tbW9uZFN0cn0gZmFpbGVkYCk7XG4gICAgICAgICAgICBmYWlsICYmIGZhaWwoKTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxuZXhwb3J0IGNvbnN0IG9wZW5EaWxvZyA9IGFzeW5jICh0eXBlOiBzdHJpbmcsIHRpdGxlOiBzdHJpbmcsIG1lc3NhZ2U6IHN0cmluZywgYnRuTWFwPzogTWFwPHN0cmluZywgRnVuY3Rpb24+LCBjYW5jZWw/OiBudW1iZXIpID0+IHtcbiAgICBsZXQgb3B0aW9uOiBFZGl0b3IuRGlhbG9nLk1lc3NhZ2VEaWFsb2dPcHRpb25zID0ge1xuICAgICAgICB0aXRsZVxuICAgIH07XG4gICAgaWYgKGJ0bk1hcCkge1xuICAgICAgICBvcHRpb24uYnV0dG9ucyA9IFtdO1xuICAgICAgICBidG5NYXAuZm9yRWFjaCgodmFsdWUsIGtleSkgPT4ge1xuICAgICAgICAgICAgb3B0aW9uLmJ1dHRvbnMucHVzaChrZXkpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgaWYgKGNhbmNlbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIG9wdGlvbi5jYW5jZWwgPSBjYW5jZWw7XG4gICAgfVxuICAgIGxldCBjb2RlOiB7IHJlc3BvbnNlOiAwLCBjaGVja2JveENoZWNrZWQ6IGZhbHNlIH0gPSBhd2FpdCBFZGl0b3IuRGlhbG9nW3R5cGVdKG1lc3NhZ2UsIG9wdGlvbik7XG4gICAgaWYgKGJ0bk1hcCkge1xuICAgICAgICBsZXQga2V5ID0gb3B0aW9uLmJ1dHRvbnNbY29kZS5yZXNwb25zZV07XG4gICAgICAgIGlmIChidG5NYXAuaGFzKGtleSkpIHtcbiAgICAgICAgICAgIGxldCBmdW5jID0gYnRuTWFwLmdldChrZXkpO1xuICAgICAgICAgICAgaWYgKGZ1bmMpIHtcbiAgICAgICAgICAgICAgICBmdW5jKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmNvbnN0IGltcG9ydEZ1bmMgPSAoY2I6IEZ1bmN0aW9uKSA9PiB7XG4gICAgLy8gMS4g5Yqo5oCB5Yib5bu65LiA5Liq6ZqQ6JeP55qEIGlucHV0IOagh+etvlxuICAgIGNvbnN0IGlucHV0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW5wdXQnKTtcbiAgICBpbnB1dC50eXBlID0gJ2ZpbGUnO1xuICAgIC8vIOmZkOWItuWPquiDvemAieaLqSBqc29uIOaWh+S7tu+8jOWmguaenOWvvOWFpSBFeGNlbCDlj6/ku6XmlLnkuLogJy54bHN4LCAueGxzJ1xuICAgIGlucHV0LmFjY2VwdCA9ICcuanNvbiwueGxzeCwueGxzJztcbiAgICBpbnB1dC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuXG4gICAgLy8gMi4g55uR5ZCs5paH5Lu26YCJ5oup55qE5Y+Y5YyWXG4gICAgaW5wdXQub25jaGFuZ2UgPSAoZSkgPT4ge1xuICAgICAgICBjb25zdCBmaWxlID0gKGUudGFyZ2V0IGFzIEhUTUxJbnB1dEVsZW1lbnQpLmZpbGVzPy5bMF07XG4gICAgICAgIGlmICghZmlsZSkgcmV0dXJuO1xuXG4gICAgICAgIC8vIOiOt+WPluaWh+S7tuWQjue8gOWQje+8jOWIpOaWreaWh+S7tuexu+Wei1xuICAgICAgICBjb25zdCBmaWxlTmFtZSA9IGZpbGUubmFtZTtcbiAgICAgICAgY29uc3QgZmlsZUV4dCA9IGZpbGVOYW1lLnNsaWNlKGZpbGVOYW1lLmxhc3RJbmRleE9mKCcuJykpLnRvTG93ZXJDYXNlKCk7XG5cbiAgICAgICAgLy8gMy4g5L2/55SoIEZpbGVSZWFkZXIg6K+75Y+W5paH5Lu25YaF5a65XG4gICAgICAgIGNvbnN0IHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG4gICAgICAgIHJlYWRlci5vbmxvYWQgPSAoZXZlbnQpID0+IHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgbGV0IGltcG9ydGVkRGF0YSA9IG51bGw7XG4gICAgICAgICAgICAgICAgaWYgKGZpbGVFeHQgPT09ICcuanNvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8g6I635Y+W5paH5Lu26YeM55qE5paH5pys5YaF5a655bm26Kej5p6Q5Li6IEpTT05cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gZXZlbnQudGFyZ2V0Py5yZXN1bHQgYXMgc3RyaW5nO1xuICAgICAgICAgICAgICAgICAgICBpbXBvcnRlZERhdGEgPSBKU09OLnBhcnNlKHJlc3VsdCk7XG5cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGZpbGVFeHQgPT09ICcueGxzeCcgfHwgZmlsZUV4dCA9PT0gJy54bHMnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEV4Y2VsIOaWh+S7tu+8muS7peS6jOi/m+WItuW9ouW8j+ivu+WPluW5tuino+aekFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRhID0gbmV3IFVpbnQ4QXJyYXkoZXZlbnQudGFyZ2V0Py5yZXN1bHQgYXMgQXJyYXlCdWZmZXIpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB3b3JrYm9vayA9IFhMU1gucmVhZChkYXRhLCB7IHR5cGU6ICdhcnJheScgfSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpcnN0U2hlZXROYW1lID0gd29ya2Jvb2suU2hlZXROYW1lc1swXTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgd29ya3NoZWV0ID0gd29ya2Jvb2suU2hlZXRzW2ZpcnN0U2hlZXROYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2hlZXREYXRhID0gWExTWC51dGlscy5zaGVldF90b19qc29uKHdvcmtzaGVldCwgeyBoZWFkZXI6IDEgfSk7XG4gICAgICAgICAgICAgICAgICAgIGltcG9ydGVkRGF0YSA9IENmZ1V0aWxzLmdldEpzb25EYXRhKHNoZWV0RGF0YSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNiICYmIGNiKGltcG9ydGVkRGF0YSk7XG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xuICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnZXJyb3InLCAn6ZSZ6K+vJywgJ+aWh+S7tuino+aekOWksei0pe+8jOivt+ajgOafpeaWh+S7tuagvOW8j++8gScpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyA1LiDmuIXnkIbvvJrlsIbkuLTml7bliJvlu7rnmoQgaW5wdXQg5qCH562+5LuO6aG16Z2i5Lit56e76ZmkXG4gICAgICAgICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKGlucHV0KTtcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKGZpbGVFeHQgPT09ICcuanNvbicpIHtcbiAgICAgICAgICAgIHJlYWRlci5yZWFkQXNUZXh0KGZpbGUpOyAvLyBKU09OIOS7peaWh+acrOW9ouW8j+ivu+WPllxuICAgICAgICB9IGVsc2UgaWYgKGZpbGVFeHQgPT09ICcueGxzeCcgfHwgZmlsZUV4dCA9PT0gJy54bHMnKSB7XG4gICAgICAgICAgICByZWFkZXIucmVhZEFzQXJyYXlCdWZmZXIoZmlsZSk7IC8vIEV4Y2VsIOS7peS6jOi/m+WItuW9ouW8j+ivu+WPllxuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8vIDYuIOWwhiBpbnB1dCDmjILovb3liLDpobXpnaLlubbop6blj5Hngrnlh7vvvIzlvLnlh7rmlofku7bpgInmi6nmoYZcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGlucHV0KTtcbiAgICBpbnB1dC5jbGljaygpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBFZGl0b3IuUGFuZWwuZGVmaW5lKHtcbiAgICBsaXN0ZW5lcnM6IHtcbiAgICAgICAgc2hvdygpIHsgY29uc29sZS5sb2coJ3Nob3cnKTsgfSxcbiAgICAgICAgaGlkZSgpIHsgY29uc29sZS5sb2coJ2hpZGUnKTsgfSxcbiAgICB9LFxuICAgIHRlbXBsYXRlOiByZWFkRmlsZVN5bmMoam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi9zdGF0aWMvdGVtcGxhdGUvZGVmYXVsdC9pbmRleC5odG1sJyksICd1dGYtOCcpLFxuICAgIHN0eWxlOiByZWFkRmlsZVN5bmMoam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi9zdGF0aWMvc3R5bGUvZGVmYXVsdC9pbmRleC5jc3MnKSwgJ3V0Zi04JyksXG4gICAgJDoge1xuICAgICAgICBhcHA6ICcjYXBwJyxcbiAgICB9LFxuICAgIG1ldGhvZHM6IHtcblxuICAgIH0sXG4gICAgcmVhZHkoKSB7XG4gICAgICAgIGlmICh0aGlzLiQuYXBwKSB7XG4gICAgICAgICAgICBjb25zdCBhcHAgPSBjcmVhdGVBcHAoe30pO1xuICAgICAgICAgICAgYXBwLmNvbmZpZy5jb21waWxlck9wdGlvbnMuaXNDdXN0b21FbGVtZW50ID0gKHRhZykgPT4gdGFnLnN0YXJ0c1dpdGgoJ3VpLScpO1xuXG4gICAgICAgICAgICBhcHAuY29tcG9uZW50KCdNeVByb2plY3QnLCBkZWZpbmVDb21wb25lbnQoe1xuICAgICAgICAgICAgICAgIGRhdGEoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0YXNrTGlzdDogW10gYXMgUGFja1Byb2plY3RbXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzQXV0b1BhY2s6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgcXJDb2RlVXJsOiAnJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzU2V0VGJDbGlUb2tlbjogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBkaW5nVGFsazogeyBkaW5nVGFsa1dlYkhvb2s6ICcnLCBkaW5nVGFsa0N1c3RvbUNvbnRlbnRfcGFjazogJycsIGRpbmdUYWxrQ3VzdG9tQ29udGVudF91cGxvYWQ6ICcnIH0gYXMgRGluZ1RhbGssXG4gICAgICAgICAgICAgICAgICAgICAgICBxckNvZGVVcmxNYXA6IG5ldyBNYXA8c3RyaW5nLCBRUkNvZGU+KCksXG4gICAgICAgICAgICAgICAgICAgICAgICBnaXRIZWxwZXJzOiBbXSBhcyBHaXRIZWxwZXJbXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzUHVsbEdpdDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBtb3VudGVkKCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmluaXRTYXZlRGF0YSgpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgbWV0aG9kczoge1xuICAgICAgICAgICAgICAgICAgICBpbml0U2F2ZURhdGEoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhc2tMaXN0ID0gZXhpc3RzU3luYyhwYWNrc1BhdGgpID8gSlNPTi5wYXJzZShyZWFkRmlsZVN5bmMocGFja3NQYXRoLCAndXRmLTgnKSkucGFja3MgOiBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCB0YW9iYW9DbGlUb2tlbk1hcDogTWFwPHN0cmluZywgVGFvQmFvX0NsaV9Ub2tlbj4gPSBuZXcgTWFwPHN0cmluZywgVGFvQmFvX0NsaV9Ub2tlbj4oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChleGlzdHNTeW5jKHNhdmVQYXRoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBkYXRhOiBTYXZlRGF0YSA9IHJlYWRKU09OU3luYyhzYXZlUGF0aCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEuZGluZ190YWxrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmRpbmdUYWxrID0gZGF0YS5kaW5nX3RhbGs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEudGFvYmFvX2NsaV90b2tlbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBkYXRhLnRhb2Jhb19jbGlfdG9rZW4ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YW9iYW9DbGlUb2tlbk1hcC5zZXQoZGF0YS50YW9iYW9fY2xpX3Rva2VuW2ldLmFwcGlkLCBkYXRhLnRhb2Jhb19jbGlfdG9rZW5baV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy50YXNrTGlzdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy50YXNrTGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGFvYmFvQ2xpVG9rZW5NYXAuaGFzKHRoaXMudGFza0xpc3RbaV0uYXBwSWQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhc2tMaXN0W2ldLnRiX2NsaV90b2tlbiA9IHRhb2Jhb0NsaVRva2VuTWFwLmdldCh0aGlzLnRhc2tMaXN0W2ldLmFwcElkKS50b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhc2tMaXN0W2ldLmRpbmdUYWxrID0gdGhpcy5kaW5nVGFsaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0QXV0b1BhY2soKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgdGVzdFNlcnZlcldhcm5zOiBzdHJpbmcgPSAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy50YXNrTGlzdCB8fCB0aGlzLnRhc2tMaXN0Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBidG5NYXAgPSBuZXcgTWFwPHN0cmluZywgRnVuY3Rpb24+KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnRuTWFwLnNldCgnYWRkJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZFByb2plY3QoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBidG5NYXAuc2V0KCdjYW5jZWwnLCBudWxsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAnd2FybicsICfor7flhYjmt7vliqDoh6rliqjljJbpobnnm67phY3nva7vvIEnLCBidG5NYXApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmdldEF1dG9Db3VudCgpID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ3dhcm4nLCAn5peg6Ieq5Yqo5YyW6aG555uuIScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy50YXNrTGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGFza0xpc3RbaV0gPSB7IC4uLlRhc2tUZW1wLCAuLi50aGlzLnRhc2tMaXN0W2ldIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHRhc2s6IFBhY2tQcm9qZWN0ID0gdGhpcy50YXNrTGlzdFtpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGFzay5uZWVkQXV0b1BhY2sgPT09IGZhbHNlKSBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRhc2suYXBwSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ3dhcm4nLCAn6Ieq5Yqo5YyW6aG555uu5Lit5pyq6YWN572uYXBwSWTvvIzor7fmo4Dmn6XphY3nva7vvIEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRhc2sucGF0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAnd2FybicsICfoh6rliqjljJbpobnnm67kuK3mnKrphY3nva7pobnnm67ot6/lvoTvvIzor7fmo4Dmn6XphY3nva7vvIEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRhc2suY2hhbm5lbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAnd2FybicsICfoh6rliqjljJbpobnnm67kuK3mnKrphY3nva7muKDpgZPlubPlj7DvvIzor7fmo4Dmn6XphY3nva7vvIEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRhc2suZW5naW5lUGF0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAnd2FybicsICfoh6rliqjljJbpobnnm67kuK3mnKrphY3nva7lvJXmk47ot6/lvoTvvIzor7fmo4Dmn6XphY3nva7vvIEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRhc2suZW5naW5lVmVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnd2FybicsICd3YXJuJywgJ+iHquWKqOWMlumhueebruS4reacqumFjee9ruW8leaTjueJiOacrO+8jOivt+ajgOafpemFjee9ru+8gScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0YXNrLmNoYW5uZWwgPT09ICd0YW9iYW8tbWluaS1nYW1lJyAmJiAodGFzay51cGxvYWQgfHwgdGFzay5wcmV2aWV3KSAmJiAhdGFzay50Yl9jbGlfdG9rZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ3dhcm4nLCAn6K+35q2j56Gu5aGr5YaZ5reY5a6d5bCP5ri45oiPQ0xJIFRva2Vu77yBJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoKHRhc2sucG9zdFRvRGluZ1RhbGsgfHwgdGFzay5wb3N0VG9EaW5nVGFsazIpICYmICghdGFzay5kaW5nVGFsayB8fCAhdGFzay5kaW5nVGFsay5kaW5nVGFsa1dlYkhvb2spKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnd2FybicsICd3YXJuJywgJ+WLvumAieS6humSiemSieaOqOmAge+8jOivt+ato+ehruWhq+WGmemSiemSiVdlYkhvb2vvvIEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwbGF0Zm9ybUZpbGVwYXRoID0gdGhpcy5nZXRQbGF0Zm9ybUZpbGUodGFzayk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBsYXRmb3JtRmlsZXBhdGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgbm9ybWFsaXplZFBhdGggPSBwYXRoLm5vcm1hbGl6ZSh0YXNrLnBhdGgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocGxhdGZvcm1GaWxlcGF0aC5pbmRleE9mKG5vcm1hbGl6ZWRQYXRoKSA8IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnd2FybicsICd3YXJuJywgYGFwcElkOiR7dGFzay5hcHBJZH0ke3Rhc2submFtZX0sJHt0YXNrLmNoYW5uZWx96YWN572u5LiN5Zyo6aG555uu6Lev5b6E5LitLOivt+ajgOafpemFjee9ru+8gWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBpc1Rlc3QgPSB0aGlzLmdldFBsYXRmb3JtRmlsZVNlcnZlcih0YXNrKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzVGVzdCAmJiB0YXNrLnVwbG9hZCAmJiAhdGFzay5za2lwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXN0U2VydmVyV2FybnMgKz0gYOazqOaEj++8ge+8gSR7dGFzay5hcHBJZH3vvJoke3Rhc2submFtZX3vvIzkvb/nlKjnmoTmtYvor5XmnI3vvIHvvIFcXG5gXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5pc0F1dG9QYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ3dhcm4nLCAn5q2j5Zyo6Ieq5Yqo5YyW77yM6K+356iN5ZCO5YaN6K+VIScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYXV0b1BhY2sgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCdpbmZvJywgJ3N0YXJ0JywgJ+W8gOWni+iHquWKqOWMlicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaXNBdXRvUGFjayA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zYXZlQ29uZmlnKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgcGF0aCA9IGpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vc3RhdGljL2F1dG8tcGFjay9idWlsZC9hcHAuanMnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgYXJncyA9IFtwYXRoXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgc3A6IENoaWxkUHJvY2Vzc1dpdGhvdXROdWxsU3RyZWFtcyA9IHNwYXduKFwibm9kZVwiLCBhcmdzLCB7IHNoZWxsOiB0cnVlIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNwLnN0ZG91dC5zZXRFbmNvZGluZygndXRmOCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNwLnN0ZG91dC5vbignZGF0YScsIChkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBhdXRvUGFjayBzdGRvdXQgJHtkYXRhLnRvU3RyaW5nKCl9YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3Auc3RkZXJyLm9uKCdkYXRhJywgKGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYGF1dG9QYWNrIHN0ZGVyciAke2RhdGEudG9TdHJpbmcoKX1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNwLm9uKCdleGl0JywgKGNvZGUsIGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvZGUgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBhdXRvUGFjayBleGl0IHN1c2Nlc3MgJHtkYXRhfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG1zZyA9ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGV4aXN0c1N5bmMoc2F2ZVBhdGgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHNhdmVEYXRhOiBTYXZlRGF0YSA9IEpTT04ucGFyc2UocmVhZEZpbGVTeW5jKHNhdmVQYXRoLCAndXRmLTgnKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5qOA5rWL5piv5ZCm5pyJ6aKE6KeI56CB55Sf5oiQXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5xckNvZGVVcmxNYXAuY2xlYXIoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2F2ZURhdGEucXJDb2RlVXJscykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNhdmVEYXRhLnFyQ29kZVVybHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucXJDb2RlVXJsTWFwLnNldChzYXZlRGF0YS5xckNvZGVVcmxzW2ldLmFwcGlkLCBzYXZlRGF0YS5xckNvZGVVcmxzW2ldKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDoh6rliqjljJbnu5PmnpxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2F2ZURhdGEuc3VjY2Vzc2VkUGFjayAmJiBzYXZlRGF0YS5zdWNjZXNzZWRQYWNrLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXNnICs9ICfmnoTlu7rmiJDlip/vvJonO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNhdmVEYXRhLnN1Y2Nlc3NlZFBhY2subGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zZyArPSBgJHtzYXZlRGF0YS5zdWNjZXNzZWRQYWNrW2ldfSR7aSA9PT0gc2F2ZURhdGEuc3VjY2Vzc2VkUGFjay5sZW5ndGggLSAxID8gJ1xcbicgOiAnICd9YDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2F2ZURhdGEuZmFpbGVkUGFjayAmJiBzYXZlRGF0YS5mYWlsZWRQYWNrLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXNnICs9ICfmnoTlu7rlpLHotKXvvJonO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNhdmVEYXRhLmZhaWxlZFBhY2subGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zZyArPSBgJHtzYXZlRGF0YS5mYWlsZWRQYWNrW2ldfSR7aSA9PT0gc2F2ZURhdGEuZmFpbGVkUGFjay5sZW5ndGggLSAxID8gJ1xcbicgOiAnICd9YDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2F2ZURhdGEuc3VjY2Vzc2VkVXBsb2FkICYmIHNhdmVEYXRhLnN1Y2Nlc3NlZFVwbG9hZC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zZyArPSAn5LiK5Lyg5oiQ5Yqf77yaJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzYXZlRGF0YS5zdWNjZXNzZWRVcGxvYWQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zZyArPSBgJHtzYXZlRGF0YS5zdWNjZXNzZWRVcGxvYWRbaV19JHtpID09PSBzYXZlRGF0YS5zdWNjZXNzZWRVcGxvYWQubGVuZ3RoIC0gMSA/ICdcXG4nIDogJyAnfWA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNhdmVEYXRhLmZhaWxlZFVwbG9hZCAmJiBzYXZlRGF0YS5mYWlsZWRVcGxvYWQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtc2cgKz0gJ+S4iuS8oOWksei0pe+8mic7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2F2ZURhdGEuZmFpbGVkVXBsb2FkLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtc2cgKz0gYCR7c2F2ZURhdGEuZmFpbGVkVXBsb2FkW2ldfSR7aSA9PT0gc2F2ZURhdGEuZmFpbGVkVXBsb2FkLmxlbmd0aCAtIDEgPyAnXFxuJyA6ICcgJ31gO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzYXZlRGF0YS5zdWNjZXNzZWRQcmV2aWV3ICYmIHNhdmVEYXRhLnN1Y2Nlc3NlZFByZXZpZXcubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtc2cgKz0gJ+mihOiniOaIkOWKn++8mic7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2F2ZURhdGEuc3VjY2Vzc2VkUHJldmlldy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXNnICs9IGAke3NhdmVEYXRhLnN1Y2Nlc3NlZFByZXZpZXdbaV19JHtpID09PSBzYXZlRGF0YS5zdWNjZXNzZWRQcmV2aWV3Lmxlbmd0aCAtIDEgPyAnXFxuJyA6ICcgJ31gO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzYXZlRGF0YS5mYWlsZWRQcmV2aWV3ICYmIHNhdmVEYXRhLmZhaWxlZFByZXZpZXcubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtc2cgKz0gJ+mihOiniOWksei0pe+8mic7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2F2ZURhdGEuZmFpbGVkUHJldmlldy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXNnICs9IGAke3NhdmVEYXRhLmZhaWxlZFByZXZpZXdbaV19JHtpID09PSBzYXZlRGF0YS5mYWlsZWRQcmV2aWV3Lmxlbmd0aCAtIDEgPyAnXFxuJyA6ICcgJ31gO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCdpbmZvJywgJ+WujOaIkCcsIGDoh6rliqjljJblrozmiJAhXFxuJHttc2d9YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgYXV0b1BhY2sgZXhpdCBmYWlsICR7ZGF0YX1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnZXJyb3InLCAn5aSx6LSlJywgJ+iHquWKqOWMluWksei0pSEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmlzQXV0b1BhY2sgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBtc2cgPSAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCB1cGxvYWRDb3VudCA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgcGFja0NvdW50ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhdXRvQ291bnQgPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHByZXZpZXdDb3VudCA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCB0YXNrIG9mIHRoaXMudGFza0xpc3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGFzay5uZWVkQXV0b1BhY2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXV0b0NvdW50Kys7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0YXNrLnVwbG9hZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXBsb2FkQ291bnQrKztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRhc2suc2tpcCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFja0NvdW50Kys7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRhc2sucHJldmlldykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJldmlld0NvdW50Kys7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHNlcnZlck1zZyA9IHRhc2suc2tpcCA/ICcnIDogKHRhc2sucGxhdGZvcm1GaWxlcyAmJiB0YXNrLnBsYXRmb3JtRmlsZXNbdGFzay5jaGFubmVsXSA/ICfvvIwnICsgKHRhc2sucGxhdGZvcm1GaWxlc1t0YXNrLmNoYW5uZWxdLmlzVGVzdCA/ICfmtYvor5XmnI0nIDogJ+ato+W8j+acjScpIDogJycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtc2cgKz0gYCR7dGFzay5hcHBJZH3vvJoke3Rhc2submFtZX3vvIzmnoTlu7rvvJokeyh0YXNrLnNraXAgPyAn4pyVJyA6ICfinJMnKX3vvIzkuIrkvKDvvJokeyh0YXNrLnVwbG9hZCA/ICfinJMnIDogJ+KclScpfe+8jOmihOiniO+8miR7KHRhc2sucHJldmlldyA/ICfinJMnIDogJ+KclScpfSR7c2VydmVyTXNnfVxcbmA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgbXNnICs9IGDoh6rliqjljJbvvJoke2F1dG9Db3VudH3kuKrvvIzmnoTlu7rvvJoke3BhY2tDb3VudH3kuKrvvIzkuIrkvKDvvJoke3VwbG9hZENvdW50feS4qu+8jOmihOiniO+8miR7cHJldmlld0NvdW50feS4qlxcbmA7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGVzdFNlcnZlcldhcm5zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXNnICs9IHRlc3RTZXJ2ZXJXYXJucztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBidG5NYXAgPSBuZXcgTWFwPHN0cmluZywgRnVuY3Rpb24+KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBidG5NYXAuc2V0KCdvaycsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdXRvUGFjaygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAnd2FybicsIGAke21zZ33lvIDlp4voh6rliqjljJY/YCwgYnRuTWFwLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgYWRkUHJvamVjdCgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGFza0xpc3QucHVzaCh7IC4uLlRhc2tUZW1wIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCdpbmZvJywgJ2FkZCcsICfmt7vliqDmiJDlip8nKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZGVsUHJvamVjdChpdGVtOiBQYWNrUHJvamVjdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGJ0bk1hcCA9IG5ldyBNYXA8c3RyaW5nLCBGdW5jdGlvbj4oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ0bk1hcC5zZXQoJ2RlbGV0ZScsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudGFza0xpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHRhc2sgPSB0aGlzLnRhc2tMaXN0W2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGFzay5hcHBJZCA9PT0gaXRlbS5hcHBJZCAmJiB0YXNrLm5hbWUgPT09IGl0ZW0ubmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YXNrTGlzdC5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ2RlbGV0ZScsICfmmK/lkKbliKDpmaTphY3nva4/JywgYnRuTWFwLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgaW1wb3J0UGFja3NDb25maWcoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDor7TmmI7pnZnmgIHmlofku7bkuK3mnIkgUGFja3MuanNvbuS6hu+8jOivoumXruaYr+WQpuabv+aNolxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY2IgPSAoaW1wb3J0ZWREYXRhOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDlgYforr7lr7zlhaXnmoQgSlNPTiDmoLzlvI/kuZ/mmK8geyBwYWNrczogWy4uLl0gfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbXBvcnRlZERhdGEgJiYgKChpbXBvcnRlZERhdGEucGFja3MgJiYgQXJyYXkuaXNBcnJheShpbXBvcnRlZERhdGEucGFja3MpIHx8IEFycmF5LmlzQXJyYXkoaW1wb3J0ZWREYXRhKSkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWwhuWvvOWFpeeahOaVsOaNruabv+aNouWIsOW9k+WJjeeahCB0YXNrTGlzdCDkuK1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGRhdGEgPSBpbXBvcnRlZERhdGEucGFja3MgPyBpbXBvcnRlZERhdGEucGFja3MgOiBpbXBvcnRlZERhdGE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCB0bXBzOiBQYWNrUHJvamVjdFtdID0gWy4uLnRoaXMudGFza0xpc3RdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhc2tMaXN0ID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YXNrTGlzdFtpXSA9IHsgLi4uVGFza1RlbXAsIC4uLmRhdGFbaV0gfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGFza0xpc3RbaV0uZGluZ1RhbGsgPSB0aGlzLmRpbmdUYWxrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5nZXRQbGF0Zm9ybUZpbGUodGhpcy50YXNrTGlzdFtpXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IHRtcHMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy50YXNrTGlzdFtpXS5hcHBJZCA9PT0gdG1wc1tqXS5hcHBJZCAmJiB0bXBzW2pdLnRiX2NsaV90b2tlbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhc2tMaXN0W2ldLnRiX2NsaV90b2tlbiA9IHRtcHNbal0udGJfY2xpX3Rva2VuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyA0LiDop6blj5Hkv53lrZjvvIzlsIbmlrDmlbDmja7lhpnlhaXmnKzlnLAgUGFja3MuanNvblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNhdmVDb25maWcoKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDlpoLmnpzmnIkgRWRpdG9yLkRpYWxvZ++8jOWPr+S7peW8ueS4quaIkOWKn+aPkOekulxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ2luZm8nLCAn5o+Q56S6JywgJ+WvvOWFpeaIkOWKn++8gScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ+itpuWRiicsICflr7zlhaXnmoTmlofku7bmoLzlvI/kuI3mraPnoa7vvIEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudGFza0xpc3QgJiYgdGhpcy50YXNrTGlzdC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGJ0bk1hcCA9IG5ldyBNYXA8c3RyaW5nLCBGdW5jdGlvbj4oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBidG5NYXAuc2V0KCdyZXBsYWNlJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbXBvcnRGdW5jKGNiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBidG5NYXAuc2V0KCdjYW5jZWwnLCBudWxsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAncmVwbGFjZScsICdQYWNrcy5qc29uIOW3suWtmOWcqO+8jOaYr+WQpuabv+aNoj8nLCBidG5NYXApO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW1wb3J0RnVuYyhjYik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGV4cG9ydFBhY2tzQ29uZmlnKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8g6K+05piO5rKh5pyJ6YWN572uXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMudGFza0xpc3QgfHwgdGhpcy50YXNrTGlzdC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAn6K2m5ZGKJywgJ+ayoeaciemFjee9ru+8jOaXoOazleWvvOWHuicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gMS4g57uE6KOF6ZyA6KaB5a+85Ye655qE5pWw5o2uXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHBhY2tzOiBQYWNrUHJvamVjdFtdID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRhc2tMaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgZGluZ1RhbGssIHRiX2NsaV90b2tlbiwgLi4udCB9ID0gdGhpcy50YXNrTGlzdFtpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFja3MucHVzaCh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZXhwb3J0RGF0YSA9IHsgcGFja3MgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRhU3RyID0gSlNPTi5zdHJpbmdpZnkoZXhwb3J0RGF0YSwgbnVsbCwgXCJcXHRcIik7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAyLiDojrflj5blvZPliY3ns7vnu5/nmoTmoYzpnaLot6/lvoRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkZXNrdG9wUGF0aCA9IG9zLmhvbWVkaXIoKSArICcvRGVza3RvcCc7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAzLiDmi7zmjqXlrozmlbTnmoTkv53lrZjot6/lvoRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBleHBvcnRQYXRoID0gam9pbihkZXNrdG9wUGF0aCwgYFBhY2tzLmpzb25gKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIDQuIOS9v+eUqCBOb2RlLmpzIOWOn+eUnyBmcyDmqKHlnZflkIzmraXlhpnlhaXmlofku7bliLDmoYzpnaJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3cml0ZUZpbGVTeW5jKGV4cG9ydFBhdGgsIGRhdGFTdHIsICd1dGYtOCcpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gNS4g5by55Ye65oiQ5Yqf5o+Q56S6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCdpbmZvJywgJ+aPkOekuicsIGDphY3nva7lt7LmiJDlip/lr7zlh7rliLDmoYzpnaLvvIFcXG7mlofku7blkI3vvJoke2BQYWNrcy5qc29uYH1gKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCflr7zlh7rlpLHotKU6JywgZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnZXJyb3InLCAn6ZSZ6K+vJywgJ+WvvOWHuumFjee9ruaWh+S7tuWksei0pe+8jOivt+ajgOafpeadg+mZkO+8gScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBvbmVrZXlPcGVyYXRlQXV0b1BhY2soZmxhZzogYm9vbGVhbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRhc2tMaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YXNrTGlzdFtpXS5uZWVkQXV0b1BhY2sgPSBmbGFnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZmxhZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhc2tMaXN0W2ldLnVwbG9hZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhc2tMaXN0W2ldLnByZXZpZXcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YXNrTGlzdFtpXS5za2lwID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIG9uZWtleU9wZXJhdGVVcGxvYWQoZmxhZzogYm9vbGVhbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRhc2tMaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YXNrTGlzdFtpXS51cGxvYWQgPSBmbGFnO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBvbmVrZXlPcGVyYXRlUHJldmlldyhmbGFnOiBib29sZWFuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudGFza0xpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhc2tMaXN0W2ldLnByZXZpZXcgPSBmbGFnO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBvbmVrZXlPcGVyYXRlU2tpcFBhY2soZmxhZzogYm9vbGVhbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRhc2tMaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YXNrTGlzdFtpXS5za2lwID0gZmxhZztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2V0QXV0b0NvdW50KCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGNvdW50ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy50YXNrTGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnRhc2tMaXN0W2ldLm5lZWRBdXRvUGFjaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb3VudCsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjb3VudDtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2V0VXBsb2FkQ291bnQoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgY291bnQgPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRhc2tMaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudGFza0xpc3RbaV0udXBsb2FkICYmIHRoaXMudGFza0xpc3RbaV0ubmVlZEF1dG9QYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50Kys7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNvdW50O1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnZXRQcmV2aWV3Q291bnQoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgY291bnQgPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRhc2tMaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudGFza0xpc3RbaV0ucHJldmlldyAmJiB0aGlzLnRhc2tMaXN0W2ldLm5lZWRBdXRvUGFjaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb3VudCsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjb3VudDtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2V0UGFja0NvdW50KCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGNvdW50ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy50YXNrTGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy50YXNrTGlzdFtpXS5za2lwICYmIHRoaXMudGFza0xpc3RbaV0ubmVlZEF1dG9QYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50Kys7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNvdW50O1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBvcGVuTG9nRGlyKHBhdGg6IHN0cmluZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFleGlzdHNTeW5jKHBhdGgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ3dhcm4nLCAn5pel5b+X5paH5Lu25aS55LiN5a2Y5Zyo77yBJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBleGVjKGBzdGFydCBcIlwiIFwiJHtwYXRofVwiYCwgKGVycm9yKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcign5omn6KGM5ZG95Luk5Ye66ZSZOicsIGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnZXJyb3InLCAn6ZSZ6K+vJywgJ+aXoOazleaJk+W8gOebruW9le+8jOivt+ajgOafpei3r+W+hOaIluadg+mZkO+8gScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+aJk+W8gOebruW9leW8guW4uDonLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCdlcnJvcicsICfplJnor68nLCAn5Y+R55Sf5pyq55+l6ZSZ6K+v77yM5peg5rOV5omT5byA55uu5b2V77yBJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIG9wZW5Ub29sTG9nKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5vcGVuTG9nRGlyKGpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vdG9vbExvZycpKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgY2xpY2tBdXRvUGFja1RvZ2dsZShpdGVtOiBQYWNrUHJvamVjdCwgZmxhZzogYm9vbGVhbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS5uZWVkQXV0b1BhY2sgPSBmbGFnO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFmbGFnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS51cGxvYWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtLnNraXAgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0ucHJldmlldyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBzZXRQbGF0Zm9ybUZpbGVTZXJ2ZXIoaXRlbTogUGFja1Byb2plY3QsIGlzVGVzdDogYm9vbGVhbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFpdGVtLnBsYXRmb3JtRmlsZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtLnBsYXRmb3JtRmlsZXMgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaXRlbS5wbGF0Zm9ybUZpbGVzW2l0ZW0uY2hhbm5lbF0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtLnBsYXRmb3JtRmlsZXNbaXRlbS5jaGFubmVsXSA9IHsgcGF0aDogJycsIGlzVGVzdDogZmFsc2UgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0ucGxhdGZvcm1GaWxlc1tpdGVtLmNoYW5uZWxdLmlzVGVzdCA9IGlzVGVzdDtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2V0UGxhdGZvcm1GaWxlKGl0ZW06IFBhY2tQcm9qZWN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbS5wYXRoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHBhdGggPSBGaWxlVXRpbHMuZmluZEZpbGUoaXRlbS5wYXRoLCBQbGF0Zm9ybUNvbmZpZ1tpdGVtLmNoYW5uZWxdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbS5wbGF0Zm9ybUZpbGVzICYmIGl0ZW0ucGxhdGZvcm1GaWxlc1tpdGVtLmNoYW5uZWxdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0ucGxhdGZvcm1GaWxlc1tpdGVtLmNoYW5uZWxdLnBhdGggPSBwYXRoO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcGF0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2V0UGxhdGZvcm1GaWxlU2VydmVyKGl0ZW06IFBhY2tQcm9qZWN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbS5wbGF0Zm9ybUZpbGVzICYmIGl0ZW0ucGxhdGZvcm1GaWxlc1tpdGVtLmNoYW5uZWxdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGl0ZW0ucGxhdGZvcm1GaWxlc1tpdGVtLmNoYW5uZWxdLmlzVGVzdCB8fCBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2V0QXBpVmVyc2lvbihpdGVtOiBQYWNrUHJvamVjdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFwaVZlcnNpb246IHN0cmluZyA9ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW0ucGxhdGZvcm1GaWxlcyAmJiBpdGVtLnBsYXRmb3JtRmlsZXNbaXRlbS5jaGFubmVsXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwYXRoID0gdGhpcy5nZXRQbGF0Zm9ybUZpbGUoaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGV4aXN0c1N5bmMocGF0aCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBmaWxlQ29udGVudCA9IHJlYWRGaWxlU3luYyhwYXRoLCAndXRmLTgnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmaWxlQ29udGVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOS9v+eUqOato+WImeihqOi+vuW8j+WMuemFjSBhcGlWZXJzaW9uIOeahOWAvFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOi/meS4quato+WImeihqOi+vuW8j+eahOino+mHiu+8mlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGFwaVZlcnNpb246ICAgICAgICAtPiDljLnphY3lrZfpnaLph48gXCJhcGlWZXJzaW9uOlwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gXFxzKiAgICAgICAgICAgICAgICAtPiDljLnphY3pm7bkuKrmiJblpJrkuKrnqbrnmb3lrZfnrKbvvIjlpoLnqbrmoLzjgIHmjaLooYzvvIlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBcIiAgICAgICAgICAgICAgICAgIC0+IOWMuemFjeS4gOS4quWPjOW8leWPt1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIChbXlwiXSopICAgICAgICAgICAgLT4g6L+Z5piv5LiA5Liq5o2V6I6357uE77yM5Yy56YWN6Zmk5LqG5Y+M5byV5Y+35Lul5aSW55qE5Lu75oSP5a2X56ym77yM55u05Yiw6YGH5Yiw5LiL5LiA5Liq5Y+M5byV5Y+3XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gXCIgICAgICAgICAgICAgICAgICAtPiDljLnphY3nu5PlsL7nmoTlj4zlvJXlj7dcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2ZXJzaW9uUmVnZXggPSAvYXBpVmVyc2lvbjpcXHMqXCIoW15cIl0qKVwiLztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBtYXRjaFJlc3VsdCA9IGZpbGVDb250ZW50Lm1hdGNoKHZlcnNpb25SZWdleCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDmo4Dmn6XmmK/lkKbljLnphY3miJDlip/lubbmj5Dlj5blgLxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobWF0Y2hSZXN1bHQgJiYgbWF0Y2hSZXN1bHRbMV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gbWF0Y2hSZXN1bHRbMV0g5bCx5piv56ys5LiA5Liq5o2V6I6357uE55qE5YaF5a6577yM5Lmf5bCx5piv5oiR5Lus5oOz6KaB55qE5YC8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwaVZlcnNpb24gPSBtYXRjaFJlc3VsdFsxXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGFwaVZlcnNpb247XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXBpVmVyc2lvbjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGFwaVZlcnNpb247XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGFwaVZlcnNpb247XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdldFRhb0Jhb0RlYnVnVXJsKGl0ZW06IFBhY2tQcm9qZWN0LCBpc1ByZXZpZXc6IGJvb2xlYW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnd2FybicsICd3YXJuJywgJ+mhueebrumFjee9ruS4uuepuu+8jOivt+ajgOafpemFjee9ricpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaXRlbS5hcHBJZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnd2FybicsICd3YXJuJywgJ+ivt+i+k+WFpeato+ehrueahGFwcElkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFpdGVtLnRiX2NsaV90b2tlbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnd2FybicsICd3YXJuJywgJ+ivt+i+k+WFpeato+ehrueahOa3mOWunUNMSSBUb2tlbicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pc1NldFRiQ2xpVG9rZW4gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgc3Bhd25fdGIoWydjb25maWcnLCAnc2V0JywgJ3Rva2VuJywgaXRlbS50Yl9jbGlfdG9rZW5dLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pc1NldFRiQ2xpVG9rZW4gPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pc0F1dG9QYWNrID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzUHJldmlldykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGNvbXBhcmVWZXJzaW9uID0gKHZlcjE6IHN0cmluZywgdmVyMjogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFycjEgPSB2ZXIxLnNwbGl0KCcuJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFycjIgPSB2ZXIyLnNwbGl0KCcuJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGxlbmd0aCA9IE1hdGgubWluKGFycjEubGVuZ3RoLCBhcnIyLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXJyMVtpXSA9PSBhcnIyW2ldKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gTnVtYmVyKGFycjFbaV0pIC0gTnVtYmVyKGFycjJbaV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXJyMS5sZW5ndGggLSBhcnIyLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgb3V0UGF0aCA9IHBhdGguam9pbihpdGVtLnBhdGgsIGBidWlsZC8ke2NvbXBhcmVWZXJzaW9uKGl0ZW0uZW5naW5lVmVyLCBcIjMuMC4wXCIpID8gaXRlbS5jaGFubmVsIDogJ3Rhb2Jhby1taW5pZ2FtZSd9YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzcGF3bl90YihbXCJwcmV2aWV3XCIsIFwiLWlcIiwgb3V0UGF0aCwgXCItYVwiLCBpdGVtLmFwcElkLCBcIi10XCIsIFwibWluaWdhbWVcIiwgXCItLWNvcHlcIiwgXCJ0cnVlXCIsIFwiLS1yZW5kZXJNb2RlXCIsIFwiaGlnaFBlcmZvcm1hbmNlXCJdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIChkYXRhOiB7IHByZXZpZXdVcmw6IHN0cmluZyB9KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaXNBdXRvUGFjayA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudGFza0xpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnRhc2tMaXN0W2ldLmFwcElkID09PSBpdGVtLmFwcElkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5xckNvZGVVcmxNYXAuc2V0KGl0ZW0uYXBwSWQsIHsgYXBwaWQ6IGl0ZW0uYXBwSWQsIHVybDogZGF0YS5wcmV2aWV3VXJsIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaXNBdXRvUGFjayA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzcGF3bl90YihbJ2FwcCcsICctYScsIGl0ZW0uYXBwSWRdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIChkYXRhOiB7IHZlcnNpb246IHN0cmluZyB9KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaXNBdXRvUGFjayA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS52ZXJzaW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgdXJsID0gYGh0dHBzOi8vbS5kdWFucXUuY29tP19hcml2ZXJfYXBwaWQ9JHtpdGVtLmFwcElkfSZuYnN2PSR7ZGF0YS52ZXJzaW9ufSZuYnNvdXJjZT1kZWJ1ZyZuYnNuPVRSSUFMJl9tcF9jb2RlPXRiJl9jb250YWluZXJfdHlwZT1nbSZ2Y29uc29sZT10cnVlYFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5xckNvZGVVcmwgPSB1cmw7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgZ2V0VGFvQmFvRGVidWdVcmwgc3VzY2VzcyAke3VybH1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnZXJyb3InLCAn5aSx6LSlJywgJ+WkjeWItumTvuaOpeWksei0pSEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmlzQXV0b1BhY2sgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCdlcnJvcicsICflpLHotKUnLCAn5aSN5Yi26ZO+5o6l5aSx6LSlIScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pc1NldFRiQ2xpVG9rZW4gPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBjbG9zZVFyQ29kZSgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucXJDb2RlVXJsID0gJyc7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGFzeW5jIGNvcHlMaW5rKGxpbms6IHN0cmluZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGxpbmsgIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgbmF2aWdhdG9yLmNsaXBib2FyZC53cml0ZVRleHQobGluayk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnaW5mbycsICflrozmiJAnLCBg5aSN5Yi26ZO+5o6l5oiQ5Yqf77yM5Y+v57KY6LS05L2/55So77yBYCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ2Vycm9yJywgJ+Wksei0pScsIGDlpI3liLbpk77mjqXlpLHotKUhICR7ZXJyb3J9YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBjaGVja1VwbG9hZChpdGVtOiBQYWNrUHJvamVjdCwgaXNDaGVjazogYm9vbGVhbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW0ucHJldmlldykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0ucHJldmlldyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS51cGxvYWQgPSBpc0NoZWNrO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBjaGVja1ByZXZpZXcoaXRlbTogUGFja1Byb2plY3QsIGlzQ2hlY2s6IGJvb2xlYW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpdGVtLnVwbG9hZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0udXBsb2FkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtLnByZXZpZXcgPSBpc0NoZWNrO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBzYXZlQ29uZmlnKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGV4aXN0c1N5bmMoc2F2ZVBhdGgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHNhdmVEYXRhOiBTYXZlRGF0YSA9IHJlYWRKU09OU3luYyhzYXZlUGF0aCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNhdmVEYXRhICYmIHNhdmVEYXRhLmFwaVZlcnNpb25zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNhdmVEYXRhLmFwaVZlcnNpb25zID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBzYXZlRGF0YVN0ciA9IEpTT04uc3RyaW5naWZ5KHNhdmVEYXRhLCBudWxsLCBcIlxcdFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd3JpdGVGaWxlU3luYyhzYXZlUGF0aCwgc2F2ZURhdGFTdHIsICd1dGYtOCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBzYXZlRGF0YTogU2F2ZURhdGEgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGluZ190YWxrOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpbmdUYWxrV2ViSG9vazogJycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpbmdUYWxrQ3VzdG9tQ29udGVudF9wYWNrOiAnJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGluZ1RhbGtDdXN0b21Db250ZW50X3VwbG9hZDogJydcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhb2Jhb19jbGlfdG9rZW46IFtdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHFyQ29kZVVybHM6IFtdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwaVZlcnNpb25zOiBbXVxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBzYXZlRGluZ1RhbGsgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwYWNrczogUGFja1Byb2plY3RbXSA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRhc2tMaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YXNrTGlzdFtpXSA9IHsgLi4uVGFza1RlbXAsIC4uLnRoaXMudGFza0xpc3RbaV0gfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy50YXNrTGlzdFtpXS50Yl9jbGlfdG9rZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2F2ZURhdGEudGFvYmFvX2NsaV90b2tlbi5wdXNoKHsgYXBwaWQ6IHRoaXMudGFza0xpc3RbaV0uYXBwSWQsIG5hbWU6IHRoaXMudGFza0xpc3RbaV0ubmFtZSwgdG9rZW46IHRoaXMudGFza0xpc3RbaV0udGJfY2xpX3Rva2VuIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnRhc2tMaXN0W2ldLmRpbmdUYWxrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghc2F2ZURpbmdUYWxrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzYXZlRGluZ1RhbGsgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2F2ZURhdGEuZGluZ190YWxrID0geyAuLi50aGlzLnRhc2tMaXN0W2ldLmRpbmdUYWxrIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy50YXNrTGlzdFtpXS5wbGF0Zm9ybUZpbGVzICYmIHRoaXMudGFza0xpc3RbaV0ucGxhdGZvcm1GaWxlc1t0aGlzLnRhc2tMaXN0W2ldLmNoYW5uZWxdICYmIHRoaXMudGFza0xpc3RbaV0ucGxhdGZvcm1GaWxlc1t0aGlzLnRhc2tMaXN0W2ldLmNoYW5uZWxdLmFwaVZlcnNpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2F2ZURhdGEuYXBpVmVyc2lvbnMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcHBpZDogdGhpcy50YXNrTGlzdFtpXS5hcHBJZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwaVZlcnNpb246IHRoaXMudGFza0xpc3RbaV0ucGxhdGZvcm1GaWxlc1t0aGlzLnRhc2tMaXN0W2ldLmNoYW5uZWxdLmFwaVZlcnNpb25cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLnRhc2tMaXN0W2ldLnBsYXRmb3JtRmlsZXNbdGhpcy50YXNrTGlzdFtpXS5jaGFubmVsXS5hcGlWZXJzaW9uO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgZGluZ1RhbGssIHRiX2NsaV90b2tlbiwgLi4udCB9ID0gdGhpcy50YXNrTGlzdFtpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYWNrcy5wdXNoKHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnFyQ29kZVVybE1hcC5jbGVhcigpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgZGF0YSA9IHsgcGFja3MgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBkYXRhU3RyID0gSlNPTi5zdHJpbmdpZnkoZGF0YSwgbnVsbCwgXCJcXHRcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICB3cml0ZUZpbGVTeW5jKHBhY2tzUGF0aCwgZGF0YVN0ciwgJ3V0Zi04Jyk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBzYXZlRGF0YVN0ciA9IEpTT04uc3RyaW5naWZ5KHNhdmVEYXRhLCBudWxsLCBcIlxcdFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdyaXRlRmlsZVN5bmMoc2F2ZVBhdGgsIHNhdmVEYXRhU3RyLCAndXRmLTgnKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgaW1wb3J0Q2xpVG9rZW4oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjYiA9IChkYXRhOiBUYW9CYW9fQ2xpX1Rva2VuW10pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy50YXNrTGlzdCAmJiB0aGlzLnRhc2tMaXN0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy50YXNrTGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCB0YXNrOiBQYWNrUHJvamVjdCA9IHRoaXMudGFza0xpc3RbaV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRhc2suY2hhbm5lbCA9PT0gJ3Rhb2Jhby1taW5pLWdhbWUnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgZGF0YS5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGFbal0uYXBwaWQgPT09IHRhc2suYXBwSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXNrLnRiX2NsaV90b2tlbiA9IGRhdGFbal0udG9rZW47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ2luZm8nLCAnaW5mbycsICflr7zlhaXmiJDlip/vvIEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2F2ZUNvbmZpZygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ3dhcm4nLCAn6K+35YWI5re75Yqg6Ieq5Yqo5YyW6aG555uu6YWN572u77yBJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnd2FybicsICd3YXJuJywgJ+WvvOWFpWNsaSB0b2tlbiDmlbDmja7lpLHotKXvvIEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgaW1wb3J0RnVuYyhjYik7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGFzeW5jIHB1bGxHaXQoaXRlbTogUGFja1Byb2plY3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwcm9qZWN0UGF0aCA9IGl0ZW0ucGF0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBnaXRVcmwgPSAoaXRlbS5naXRDb25maWcgJiYgaXRlbS5naXRDb25maWcuZ2l0VXJsKSB8fCAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBicmFuY2ggPSAoaXRlbS5naXRDb25maWcgJiYgaXRlbS5naXRDb25maWcuZ2l0QnJhbmNoKSB8fCAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghcHJvamVjdFBhdGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAnd2FybicsICfor7fovpPlhaXpobnnm67ot6/lvoQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWdpdFVybCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnd2FybicsICd3YXJuJywgJ+ivt+i+k+WFpWdpdOWcsOWdgCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghYnJhbmNoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJhbmNoID0gJ21hc3Rlcic7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgZ2l0SGVscGVyOiBHaXRIZWxwZXIgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuZ2l0SGVscGVycy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2l0SGVscGVyID0gdGhpcy5naXRIZWxwZXJzWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdpdEhlbHBlci51cGRhdGVHaXQocHJvamVjdFBhdGgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2l0SGVscGVyID0gbmV3IEdpdEhlbHBlcih7IHByb2plY3RQYXRoLCBnaXRVcmwsIG9uTG9nOiAobXNnOiBzdHJpbmcpID0+IHsgY29uc29sZS5sb2coYEdpdEhlbHBlcjogJHtwcm9qZWN0UGF0aH0gICR7bXNnfWApOyB9IH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZ2l0SGVscGVycy5wdXNoKGdpdEhlbHBlcik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmlzUHVsbEdpdCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgcmVzdWx0ID0gYXdhaXQgZ2l0SGVscGVyLnVwZGF0ZVRvTGF0ZXN0KHsgcHJvamVjdFBhdGgsIGdpdFVybCwgYnJhbmNoLCBmb3JjZTogdHJ1ZSB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaXNQdWxsR2l0ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXJlc3VsdC5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ3dhcm4nLCByZXN1bHQubWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCdpbmZvJywgJ2luZm8nLCAn5pu05paw5oiQ5YqfJyk7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGFzeW5jIGFsbFB1bGxHaXQoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgcHVsbEFycjogeyBwcm9qZWN0UGF0aDogc3RyaW5nLCBnaXRVcmw6IHN0cmluZywgYnJhbmNoOiBzdHJpbmcgfVtdID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudGFza0xpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0YXNrOiBQYWNrUHJvamVjdCA9IHRoaXMudGFza0xpc3RbaV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRhc2sucGF0aCAmJiB0YXNrLmdpdENvbmZpZyAmJiB0YXNrLmdpdENvbmZpZy5naXRVcmwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHVsbEFyci5wdXNoKHsgcHJvamVjdFBhdGg6IHRhc2sucGF0aCwgZ2l0VXJsOiB0YXNrLmdpdENvbmZpZy5naXRVcmwsIGJyYW5jaDogdGFzay5naXRDb25maWcuZ2l0QnJhbmNoIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCB0b3RhbCA9IHB1bGxBcnIubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRvdGFsID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjb3VudCA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGZhaWxQdWxsQXJyOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNoZWNrT3ZlciA9IChlcnJvcjogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb3VudCA9PT0gdG90YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaXNQdWxsR2l0ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgZmFpbFN0ciA9ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZhaWxQdWxsQXJyLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmYWlsU3RyID0gJ1xcbicgKyAn5pu05paw5aSx6LSl6aG555uuOicgKyAnXFxuJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGZhaWxQdWxsQXJyLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZhaWxTdHIgKz0gYCR7ZmFpbFB1bGxBcnJbaV19XFxuYDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmFpbFN0ciArPSBgXFxuICR7ZXJyb3J9YDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnaW5mbycsICdpbmZvJywgYOabtOaWsOWujOaIkCR7ZmFpbFN0cn1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBpbmRleCA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGVyck1zZzogc3RyaW5nID0gJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdGFza3MgPSBwdWxsQXJyLm1hcCgoaXRlbSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgeyBwcm9qZWN0UGF0aCwgZ2l0VXJsLCBicmFuY2ggfSA9IGl0ZW07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghYnJhbmNoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmFuY2ggPSAnbWFzdGVyJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgZ2l0SGVscGVyOiBHaXRIZWxwZXIgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPD0gdGhpcy5naXRIZWxwZXJzLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdpdEhlbHBlciA9IHRoaXMuZ2l0SGVscGVyc1tpbmRleF07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnaXRIZWxwZXIudXBkYXRlR2l0KHByb2plY3RQYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdpdEhlbHBlciA9IG5ldyBHaXRIZWxwZXIoeyBwcm9qZWN0UGF0aCwgZ2l0VXJsLCBvbkxvZzogKG1zZzogc3RyaW5nKSA9PiB7IGNvbnNvbGUubG9nKGBHaXRIZWxwZXI6ICR7cHJvamVjdFBhdGh9ICAke21zZ31gKTsgfSB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZ2l0SGVscGVycy5wdXNoKGdpdEhlbHBlcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5kZXgrKztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdpdEhlbHBlci51cGRhdGVUb0xhdGVzdCh7IHByb2plY3RQYXRoLCBnaXRVcmwsIGJyYW5jaCwgZm9yY2U6IHRydWUgfSkudGhlbigocmVzdWx0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb3VudCsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFyZXN1bHQuc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZhaWxQdWxsQXJyLnB1c2gocmVzdWx0LnByb2plY3RQYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoZWNrT3ZlcihlcnJNc2cpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVyck1zZyArPSBlcnJvciArICdcXG4nO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY291bnQrKztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZhaWxQdWxsQXJyLnB1c2gocHJvamVjdFBhdGgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hlY2tPdmVyKGVyck1zZyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgUHJvbWlzZS5hbGwodGFza3MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBzZXRHaXRVcmwoaXRlbTogUGFja1Byb2plY3QsIGdpdFVybDogc3RyaW5nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaXRlbS5naXRDb25maWcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS5naXRDb25maWcgPSB7IGdpdFVybDogJycsIGdpdEJyYW5jaDogJycgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS5naXRDb25maWcuZ2l0VXJsID0gZ2l0VXJsO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBzZXRHaXRCcmFuY2goaXRlbTogUGFja1Byb2plY3QsIGdpdEJyYW5jaDogc3RyaW5nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaXRlbS5naXRDb25maWcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS5naXRDb25maWcgPSB7IGdpdFVybDogJycsIGdpdEJyYW5jaDogJycgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS5naXRDb25maWcuZ2l0QnJhbmNoID0gZ2l0QnJhbmNoO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBvbmVrZXlTYXZlQ29uZmlnKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zYXZlQ29uZmlnKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ2luZm8nLCAnaW5mbycsICfkv53lrZjmiJDlip8nKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgdGVtcGxhdGU6IHJlYWRGaWxlU3luYyhqb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uL3N0YXRpYy90ZW1wbGF0ZS92dWUvcHJvamVjdC5odG1sJyksICd1dGYtOCcpLFxuICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgYXBwLm1vdW50KHRoaXMuJC5hcHApO1xuICAgICAgICAgICAgcGFuZWxEYXRhTWFwLnNldCh0aGlzLCBhcHApO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBiZWZvcmVDbG9zZSgpIHtcbiAgICB9LFxuICAgIGNsb3NlKCkge1xuICAgICAgICBjb25zdCBhcHAgPSBwYW5lbERhdGFNYXAuZ2V0KHRoaXMpO1xuICAgICAgICBpZiAoYXBwKSB7XG4gICAgICAgICAgICBpZiAoZXhpc3RzU3luYyhzYXZlUGF0aCkpIHtcbiAgICAgICAgICAgICAgICBsZXQgc2F2ZURhdGE6IFNhdmVEYXRhID0gcmVhZEpTT05TeW5jKHNhdmVQYXRoKTtcbiAgICAgICAgICAgICAgICBpZiAoc2F2ZURhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgc2F2ZURhdGEucXJDb2RlVXJscyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2F2ZURhdGEuc3VjY2Vzc2VkUGFjaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHNhdmVEYXRhLnN1Y2Nlc3NlZFBhY2s7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHNhdmVEYXRhLmZhaWxlZFBhY2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBzYXZlRGF0YS5mYWlsZWRQYWNrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChzYXZlRGF0YS5zdWNjZXNzZWRVcGxvYWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBzYXZlRGF0YS5zdWNjZXNzZWRVcGxvYWQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHNhdmVEYXRhLmZhaWxlZFVwbG9hZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHNhdmVEYXRhLmZhaWxlZFVwbG9hZDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoc2F2ZURhdGEuc3VjY2Vzc2VkUHJldmlldykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHNhdmVEYXRhLnN1Y2Nlc3NlZFByZXZpZXc7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHNhdmVEYXRhLmZhaWxlZFByZXZpZXcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBzYXZlRGF0YS5mYWlsZWRQcmV2aWV3O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChzYXZlRGF0YS5hcGlWZXJzaW9ucykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHNhdmVEYXRhLmFwaVZlcnNpb25zO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGxldCBzYXZlRGF0YVN0ciA9IEpTT04uc3RyaW5naWZ5KHNhdmVEYXRhLCBudWxsLCBcIlxcdFwiKTtcbiAgICAgICAgICAgICAgICAgICAgd3JpdGVGaWxlU3luYyhzYXZlUGF0aCwgc2F2ZURhdGFTdHIsICd1dGYtOCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgYXBwLnVubW91bnQoKTtcbiAgICAgICAgfVxuICAgIH0sXG59KTsiXX0=