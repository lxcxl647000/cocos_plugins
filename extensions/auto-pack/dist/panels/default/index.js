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
    preview: false,
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
                        qrCodeUrlMap: new Map()
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
                            item.preview = false;
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
                        for (let t of this.taskList) {
                            console.log(JSON.stringify(t.platformFiles));
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
                        if (item.path && item.platformFiles && item.platformFiles[item.channel]) {
                            if (!item.platformFiles[item.channel].path || !(0, fs_extra_1.existsSync)(item.platformFiles[item.channel].path)) {
                                item.platformFiles[item.channel].path = FileUtils_1.FileUtils.findFile(item.path, PlatformConfig[item.channel]);
                            }
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
                    getApiVersion(item) {
                        let apiVersion = '';
                        if (item.platformFiles && item.platformFiles[item.channel]) {
                            let path = item.platformFiles[item.channel].path;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zb3VyY2UvcGFuZWxzL2RlZmF1bHQvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLCtDQUErQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFL0MsaURBQTRFO0FBQzVFLHVDQUFpRjtBQUNqRiw2Q0FBa0M7QUFDbEMsNkJBQXNEO0FBQ3RELDRDQUFvQjtBQUNwQiwwREFBa0M7QUFDbEMsMkNBQTZCO0FBQzdCLDJDQUF3QztBQUN4QyxNQUFNLFlBQVksR0FBRyxJQUFJLE9BQU8sRUFBWSxDQUFDO0FBNkI3QyxNQUFNLFNBQVMsR0FBRyxJQUFBLFdBQUksRUFBQyxTQUFTLEVBQUUsd0NBQXdDLENBQUMsQ0FBQztBQUM1RSxNQUFNLFFBQVEsR0FBRyxJQUFBLFdBQUksRUFBQyxTQUFTLEVBQUUsdUNBQXVDLENBQUMsQ0FBQztBQUUxRSxpQkFBaUI7QUFDakIsTUFBTSxjQUFjLEdBQUc7SUFDbkIsa0JBQWtCLEVBQUUsMEJBQTBCO0NBQ2pELENBQUE7QUFxQ0QsTUFBTSxRQUFRLEdBQWdCO0lBQzFCLEtBQUssRUFBRSxFQUFFO0lBQ1QsSUFBSSxFQUFFLEVBQUU7SUFDUixJQUFJLEVBQUUsRUFBRTtJQUNSLE9BQU8sRUFBRSxrQkFBa0I7SUFDM0IsSUFBSSxFQUFFLEtBQUs7SUFDWCxNQUFNLEVBQUUsS0FBSztJQUNiLFlBQVksRUFBRSxLQUFLO0lBQ25CLGFBQWEsRUFBRTtRQUNYLGtCQUFrQixFQUFFO1lBQ2hCLElBQUksRUFBRSxFQUFFO1lBQ1IsTUFBTSxFQUFFLEtBQUs7U0FDaEI7S0FDSjtJQUNELGNBQWMsRUFBRSxLQUFLO0lBQ3JCLGVBQWUsRUFBRSxLQUFLO0lBQ3RCLFFBQVEsRUFBRSxLQUFLO0lBQ2YsVUFBVSxFQUFFLEtBQUs7SUFDakIsZ0JBQWdCLEVBQUUsRUFBRTtJQUNwQix5QkFBeUIsRUFB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QUMsRUFBRSxDQUFDLEdBQUcsUUFBUSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnREFDbEQsR0FBRyxJQUFJLEdBQUcsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssUUFBUSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDOzRDQUMzRixDQUFDO3dDQUNMLENBQUM7d0NBQ0QsSUFBSSxRQUFRLENBQUMsZUFBZSxJQUFJLFFBQVEsQ0FBQyxlQUFlLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDOzRDQUNsRSxHQUFHLElBQUksT0FBTyxDQUFDOzRDQUNmLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxRQUFRLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dEQUN2RCxHQUFHLElBQUksR0FBRyxRQUFRLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxRQUFRLENBQUMsZUFBZSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7NENBQ3JHLENBQUM7d0NBQ0wsQ0FBQzt3Q0FDRCxJQUFJLFFBQVEsQ0FBQyxZQUFZLElBQUksUUFBUSxDQUFDLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7NENBQzVELEdBQUcsSUFBSSxPQUFPLENBQUM7NENBQ2YsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0RBQ3BELEdBQUcsSUFBSSxHQUFHLFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLFFBQVEsQ0FBQyxZQUFZLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQzs0Q0FDL0YsQ0FBQzt3Q0FDTCxDQUFDO3dDQUNELElBQUksUUFBUSxDQUFDLGdCQUFnQixJQUFJLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7NENBQ3BFLEdBQUcsSUFBSSxPQUFPLENBQUM7NENBQ2YsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnREFDeEQsR0FBRyxJQUFJLEdBQUcsUUFBUSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQzs0Q0FDdkcsQ0FBQzt3Q0FDTCxDQUFDO3dDQUNELElBQUksUUFBUSxDQUFDLGFBQWEsSUFBSSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQzs0Q0FDOUQsR0FBRyxJQUFJLE9BQU8sQ0FBQzs0Q0FDZixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnREFDckQsR0FBRyxJQUFJLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDOzRDQUNqRyxDQUFDO3dDQUNMLENBQUM7b0NBQ0wsQ0FBQztvQ0FDRCxJQUFBLGlCQUFTLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxXQUFXLEdBQUcsRUFBRSxDQUFDLENBQUM7Z0NBQzlDLENBQUM7cUNBQ0ksQ0FBQztvQ0FDRixPQUFPLENBQUMsR0FBRyxDQUFDLHNCQUFzQixJQUFJLEVBQUUsQ0FBQyxDQUFDO29DQUMxQyxJQUFBLGlCQUFTLEVBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQztnQ0FDdkMsQ0FBQztnQ0FDRCxJQUFJLENBQUMsVUFBVSxHQUFHLEtBQUssQ0FBQzs0QkFDNUIsQ0FBQyxDQUFDLENBQUM7d0JBQ1AsQ0FBQyxDQUFBO3dCQUNELElBQUksR0FBRyxHQUFHLEVBQUUsQ0FBQzt3QkFDYixJQUFJLFdBQVcsR0FBRyxDQUFDLENBQUM7d0JBQ3BCLElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQzt3QkFDbEIsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFDO3dCQUNsQixJQUFJLFlBQVksR0FBRyxDQUFDLENBQUM7d0JBQ3JCLEtBQUssSUFBSSxJQUFJLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDOzRCQUM3QixJQUFJLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztnQ0FDcEIsU0FBUyxFQUFFLENBQUM7Z0NBQ1osSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7b0NBQ2QsV0FBVyxFQUFFLENBQUM7Z0NBQ2xCLENBQUM7Z0NBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztvQ0FDYixTQUFTLEVBQUUsQ0FBQztnQ0FDaEIsQ0FBQztnQ0FDRCxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQ0FDZixZQUFZLEVBQUUsQ0FBQztnQ0FDbkIsQ0FBQztnQ0FDRCxJQUFJLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsSUFBSSxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQ0FDakssR0FBRyxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLFNBQVMsSUFBSSxDQUFDOzRCQUNySixDQUFDO3dCQUNMLENBQUM7d0JBQ0QsR0FBRyxJQUFJLE9BQU8sU0FBUyxRQUFRLFNBQVMsUUFBUSxXQUFXLFFBQVEsWUFBWSxLQUFLLENBQUM7d0JBQ3JGLElBQUksZUFBZSxFQUFFLENBQUM7NEJBQ2xCLEdBQUcsSUFBSSxlQUFlLENBQUM7d0JBQzNCLENBQUM7d0JBQ0QsSUFBSSxNQUFNLEdBQUcsSUFBSSxHQUFHLEVBQW9CLENBQUM7d0JBQ3pDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRTs0QkFDbEIsUUFBUSxFQUFFLENBQUM7d0JBQ2YsQ0FBQyxDQUFDLENBQUM7d0JBQ0gsSUFBQSxpQkFBUyxFQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxHQUFHLFFBQVEsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7b0JBQ3pELENBQUM7b0JBQ0QsVUFBVTt3QkFDTixJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksbUJBQU0sUUFBUSxFQUFHLENBQUM7d0JBQ3BDLElBQUEsaUJBQVMsRUFBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDO29CQUNyQyxDQUFDO29CQUNELFVBQVUsQ0FBQyxJQUFpQjt3QkFDeEIsSUFBSSxNQUFNLEdBQUcsSUFBSSxHQUFHLEVBQW9CLENBQUM7d0JBQ3pDLE1BQU0sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRTs0QkFDdEIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0NBQzVDLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0NBQzVCLElBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxJQUFJLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO29DQUN2RCxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7b0NBQzNCLE1BQU07Z0NBQ1YsQ0FBQzs0QkFDTCxDQUFDO3dCQUNMLENBQUMsQ0FBQyxDQUFDO3dCQUNILElBQUEsaUJBQVMsRUFBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7b0JBQ3RELENBQUM7b0JBQ0QsaUJBQWlCO3dCQUNiLDhCQUE4Qjt3QkFDOUIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxZQUFpQixFQUFFLEVBQUU7NEJBQzdCLG1DQUFtQzs0QkFDbkMsSUFBSSxZQUFZLElBQUksQ0FBQyxDQUFDLFlBQVksQ0FBQyxLQUFLLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQ0FDN0csMEJBQTBCO2dDQUMxQixJQUFJLElBQUksR0FBRyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUM7Z0NBQ2xFLElBQUksSUFBSSxHQUFrQixDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dDQUM3QyxJQUFJLENBQUMsUUFBUSxHQUFHLEVBQUUsQ0FBQztnQ0FDbkIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztvQ0FDbkMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsbUNBQVEsUUFBUSxHQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBRSxDQUFDO29DQUMvQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO29DQUMxQyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQ0FDdkMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQzt3Q0FDbkMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLEVBQUUsQ0FBQzs0Q0FDbkUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQzs0Q0FDckQsTUFBTTt3Q0FDVixDQUFDO29DQUNMLENBQUM7Z0NBQ0wsQ0FBQztnQ0FFRCw4QkFBOEI7Z0NBQzlCLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztnQ0FFbEIsNkJBQTZCO2dDQUM3QixJQUFBLGlCQUFTLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQzs0QkFDckMsQ0FBQztpQ0FDSSxDQUFDO2dDQUNGLElBQUEsaUJBQVMsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLGFBQWEsQ0FBQyxDQUFDOzRCQUMzQyxDQUFDO3dCQUNMLENBQUMsQ0FBQzt3QkFDRixJQUFJLElBQUksQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7NEJBQzVDLElBQUksTUFBTSxHQUFHLElBQUksR0FBRyxFQUFvQixDQUFDOzRCQUN6QyxNQUFNLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUU7Z0NBQ3ZCLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQzs0QkFDbkIsQ0FBQyxDQUFDLENBQUM7NEJBQ0gsTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7NEJBQzNCLElBQUEsaUJBQVMsRUFBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sQ0FBQyxDQUFDO3dCQUNqRSxDQUFDOzZCQUNJLENBQUM7NEJBQ0YsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDO3dCQUNuQixDQUFDO29CQUNMLENBQUM7b0JBQ0QsaUJBQWlCO3dCQUNiLFNBQVM7d0JBQ1QsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7NEJBQy9DLElBQUEsaUJBQVMsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFDOzRCQUNyQyxPQUFPO3dCQUNYLENBQUM7d0JBQ0QsSUFBSSxDQUFDOzRCQUNELGVBQWU7NEJBQ2YsSUFBSSxLQUFLLEdBQWtCLEVBQUUsQ0FBQzs0QkFDOUIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0NBQzVDLE1BQU0sS0FBbUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBbkQsRUFBRSxRQUFRLEVBQUUsWUFBWSxPQUEyQixFQUF0QixDQUFDLGNBQTlCLDRCQUFnQyxDQUFtQixDQUFDO2dDQUMxRCxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDOzRCQUNsQixDQUFDOzRCQUNELE1BQU0sVUFBVSxHQUFHLEVBQUUsS0FBSyxFQUFFLENBQUM7NEJBQzdCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQzs0QkFFdkQsaUJBQWlCOzRCQUNqQixNQUFNLFdBQVcsR0FBRyxZQUFFLENBQUMsT0FBTyxFQUFFLEdBQUcsVUFBVSxDQUFDOzRCQUU5QyxlQUFlOzRCQUNmLE1BQU0sVUFBVSxHQUFHLElBQUEsV0FBSSxFQUFDLFdBQVcsRUFBRSxZQUFZLENBQUMsQ0FBQzs0QkFFbkQsa0NBQWtDOzRCQUNsQyxJQUFBLHdCQUFhLEVBQUMsVUFBVSxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQzs0QkFFNUMsWUFBWTs0QkFDWixJQUFBLGlCQUFTLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxvQkFBb0IsWUFBWSxFQUFFLENBQUMsQ0FBQzt3QkFFaEUsQ0FBQzt3QkFBQyxPQUFPLEtBQUssRUFBRSxDQUFDOzRCQUNiLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDOzRCQUM5QixJQUFBLGlCQUFTLEVBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO3dCQUNoRCxDQUFDO29CQUNMLENBQUM7b0JBQ0QscUJBQXFCLENBQUMsSUFBYTt3QkFDL0IsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7NEJBQzVDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQzs0QkFDckMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO2dDQUNSLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztnQ0FDaEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDOzRCQUNqQyxDQUFDO3dCQUNMLENBQUM7b0JBQ0wsQ0FBQztvQkFDRCxtQkFBbUIsQ0FBQyxJQUFhO3dCQUM3QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQzs0QkFDNUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDO3dCQUNuQyxDQUFDO29CQUNMLENBQUM7b0JBQ0QscUJBQXFCLENBQUMsSUFBYTt3QkFDL0IsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7NEJBQzVDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQzt3QkFDakMsQ0FBQztvQkFDTCxDQUFDO29CQUNELFlBQVk7d0JBQ1IsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDO3dCQUNkLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDOzRCQUM1QyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxFQUFFLENBQUM7Z0NBQ2hDLEtBQUssRUFBRSxDQUFDOzRCQUNaLENBQUM7d0JBQ0wsQ0FBQzt3QkFDRCxPQUFPLEtBQUssQ0FBQztvQkFDakIsQ0FBQztvQkFDRCxjQUFjO3dCQUNWLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQzt3QkFDZCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQzs0QkFDNUMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksRUFBRSxDQUFDO2dDQUMzRCxLQUFLLEVBQUUsQ0FBQzs0QkFDWixDQUFDO3dCQUNMLENBQUM7d0JBQ0QsT0FBTyxLQUFLLENBQUM7b0JBQ2pCLENBQUM7b0JBQ0QsZUFBZTt3QkFDWCxJQUFJLEtBQUssR0FBRyxDQUFDLENBQUM7d0JBQ2QsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7NEJBQzVDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLEVBQUUsQ0FBQztnQ0FDNUQsS0FBSyxFQUFFLENBQUM7NEJBQ1osQ0FBQzt3QkFDTCxDQUFDO3dCQUNELE9BQU8sS0FBSyxDQUFDO29CQUNqQixDQUFDO29CQUNELFlBQVk7d0JBQ1IsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDO3dCQUNkLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDOzRCQUM1QyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLEVBQUUsQ0FBQztnQ0FDMUQsS0FBSyxFQUFFLENBQUM7NEJBQ1osQ0FBQzt3QkFDTCxDQUFDO3dCQUNELE9BQU8sS0FBSyxDQUFDO29CQUNqQixDQUFDO29CQUNELFVBQVUsQ0FBQyxJQUFZO3dCQUNuQixJQUFJLENBQUMsSUFBQSxxQkFBVSxFQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7NEJBQ3BCLElBQUEsaUJBQVMsRUFBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLFdBQVcsQ0FBQyxDQUFDOzRCQUN2QyxPQUFPO3dCQUNYLENBQUM7d0JBQ0QsSUFBSSxDQUFDOzRCQUNELElBQUEsb0JBQUksRUFBQyxhQUFhLElBQUksR0FBRyxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUU7Z0NBQ2pDLElBQUksS0FBSyxFQUFFLENBQUM7b0NBQ1IsT0FBTyxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7b0NBQ2hDLElBQUEsaUJBQVMsRUFBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLGtCQUFrQixDQUFDLENBQUM7Z0NBQ2pELENBQUM7NEJBQ0wsQ0FBQyxDQUFDLENBQUM7d0JBQ1AsQ0FBQzt3QkFBQyxPQUFPLEtBQUssRUFBRSxDQUFDOzRCQUNiLE9BQU8sQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDOzRCQUNoQyxJQUFBLGlCQUFTLEVBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO3dCQUMvQyxDQUFDO29CQUNMLENBQUM7b0JBQ0QsV0FBVzt3QkFDUCxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUEsV0FBSSxFQUFDLFNBQVMsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDLENBQUM7b0JBQ3pELENBQUM7b0JBQ0QsbUJBQW1CLENBQUMsSUFBaUIsRUFBRSxJQUFhO3dCQUNoRCxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQzt3QkFDekIsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDOzRCQUNSLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDOzRCQUNwQixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQzs0QkFDakIsSUFBSSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUM7d0JBQ3pCLENBQUM7b0JBQ0wsQ0FBQztvQkFDRCxlQUFlLENBQUMsSUFBaUIsRUFBRSxJQUFZO3dCQUMzQyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDOzRCQUN0QixJQUFJLENBQUMsYUFBYSxHQUFHLEVBQUUsQ0FBQzt3QkFDNUIsQ0FBQzt3QkFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQzs0QkFDcEMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsQ0FBQzt3QkFDbkUsQ0FBQzt3QkFDRCxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO3dCQUM3QyxLQUFLLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQzs0QkFDMUIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO3dCQUNqRCxDQUFDO29CQUNMLENBQUM7b0JBQ0QscUJBQXFCLENBQUMsSUFBaUIsRUFBRSxNQUFlO3dCQUNwRCxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDOzRCQUN0QixJQUFJLENBQUMsYUFBYSxHQUFHLEVBQUUsQ0FBQzt3QkFDNUIsQ0FBQzt3QkFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQzs0QkFDcEMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsQ0FBQzt3QkFDbkUsQ0FBQzt3QkFDRCxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO29CQUNyRCxDQUFDO29CQUNELGVBQWUsQ0FBQyxJQUFpQjt3QkFDN0IsSUFBSSxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxhQUFhLElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQzs0QkFDdEUsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLElBQUEscUJBQVUsRUFBQyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2dDQUMvRixJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUcscUJBQVMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxjQUFjLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7NEJBQ3hHLENBQUM7NEJBQ0QsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDO3dCQUN2RCxDQUFDOzZCQUNJLENBQUM7NEJBQ0YsT0FBTyxFQUFFLENBQUM7d0JBQ2QsQ0FBQztvQkFDTCxDQUFDO29CQUNELHFCQUFxQixDQUFDLElBQWlCO3dCQUNuQyxJQUFJLElBQUksQ0FBQyxhQUFhLElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQzs0QkFDekQsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLElBQUksS0FBSyxDQUFDO3dCQUM1RCxDQUFDOzZCQUNJLENBQUM7NEJBQ0YsT0FBTyxLQUFLLENBQUM7d0JBQ2pCLENBQUM7b0JBQ0wsQ0FBQztvQkFDRCxhQUFhLENBQUMsSUFBaUI7d0JBQzNCLElBQUksVUFBVSxHQUFXLEVBQUUsQ0FBQzt3QkFDNUIsSUFBSSxJQUFJLENBQUMsYUFBYSxJQUFJLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7NEJBQ3pELElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQzs0QkFDakQsSUFBSSxJQUFBLHFCQUFVLEVBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQ0FDbkIsSUFBSSxDQUFDO29DQUNELElBQUksV0FBVyxHQUFHLElBQUEsdUJBQVksRUFBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7b0NBQzlDLElBQUksV0FBVyxFQUFFLENBQUM7d0NBQ2QsMEJBQTBCO3dDQUMxQixjQUFjO3dDQUNkLDRDQUE0Qzt3Q0FDNUMsNENBQTRDO3dDQUM1QyxnQ0FBZ0M7d0NBQ2hDLDBEQUEwRDt3Q0FDMUQsaUNBQWlDO3dDQUNqQyxNQUFNLFlBQVksR0FBRyx5QkFBeUIsQ0FBQzt3Q0FDL0MsTUFBTSxXQUFXLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQzt3Q0FFcEQsZUFBZTt3Q0FDZixJQUFJLFdBQVcsSUFBSSxXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQzs0Q0FDaEMsdUNBQXVDOzRDQUN2QyxVQUFVLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO3dDQUNoQyxDQUFDO3dDQUNELE9BQU8sVUFBVSxDQUFDO29DQUN0QixDQUFDO2dDQUNMLENBQUM7Z0NBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztvQ0FDYixPQUFPLFVBQVUsQ0FBQztnQ0FDdEIsQ0FBQzs0QkFDTCxDQUFDO2lDQUNJLENBQUM7Z0NBQ0YsT0FBTyxVQUFVLENBQUM7NEJBQ3RCLENBQUM7d0JBQ0wsQ0FBQzs2QkFDSSxDQUFDOzRCQUNGLE9BQU8sVUFBVSxDQUFDO3dCQUN0QixDQUFDO29CQUNMLENBQUM7b0JBQ0QsaUJBQWlCLENBQUMsSUFBaUIsRUFBRSxTQUFrQjt3QkFDbkQsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDOzRCQUNSLElBQUEsaUJBQVMsRUFBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDOzRCQUMxQyxPQUFPO3dCQUNYLENBQUM7d0JBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQzs0QkFDZCxJQUFBLGlCQUFTLEVBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxhQUFhLENBQUMsQ0FBQzs0QkFDekMsT0FBTzt3QkFDWCxDQUFDO3dCQUNELElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7NEJBQ3JCLElBQUEsaUJBQVMsRUFBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLG1CQUFtQixDQUFDLENBQUM7NEJBQy9DLE9BQU87d0JBQ1gsQ0FBQzt3QkFFRCxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQzt3QkFDNUIsUUFBUSxDQUFDLENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUNsRCxHQUFHLEVBQUU7NEJBQ0QsSUFBSSxDQUFDLGVBQWUsR0FBRyxLQUFLLENBQUM7NEJBQzdCLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDOzRCQUN2QixJQUFJLFNBQVMsRUFBRSxDQUFDO2dDQUNaLElBQUksY0FBYyxHQUFHLENBQUMsSUFBWSxFQUFFLElBQVksRUFBRSxFQUFFO29DQUNoRCxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO29DQUMzQixJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO29DQUMzQixJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO29DQUNoRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7d0NBQzlCLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDOzRDQUNyQixTQUFTO3dDQUNiLENBQUM7d0NBQ0QsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO29DQUM3QyxDQUFDO29DQUNELE9BQU8sSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO2dDQUNyQyxDQUFDLENBQUM7Z0NBQ0YsSUFBSSxPQUFPLEdBQUcsY0FBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFNBQVMsY0FBYyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixFQUFFLENBQUMsQ0FBQztnQ0FDMUgsUUFBUSxDQUFDLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLGNBQWMsRUFBRSxpQkFBaUIsQ0FBQyxFQUN4SCxDQUFDLElBQTRCLEVBQUUsRUFBRTtvQ0FDN0IsSUFBSSxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUM7b0NBQ3hCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO3dDQUM1QyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxLQUFLLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQzs0Q0FDeEMsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQzs0Q0FDL0UsTUFBTTt3Q0FDVixDQUFDO29DQUNMLENBQUM7Z0NBQ0wsQ0FBQyxFQUNELEdBQUcsRUFBRTtvQ0FDRCxJQUFJLENBQUMsVUFBVSxHQUFHLEtBQUssQ0FBQztnQ0FDNUIsQ0FBQyxDQUNKLENBQUM7NEJBQ04sQ0FBQztpQ0FDSSxDQUFDO2dDQUNGLFFBQVEsQ0FBQyxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUM5QixDQUFDLElBQXlCLEVBQUUsRUFBRTtvQ0FDMUIsSUFBSSxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUM7b0NBQ3hCLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO3dDQUNmLElBQUksR0FBRyxHQUFHLHNDQUFzQyxJQUFJLENBQUMsS0FBSyxTQUFTLElBQUksQ0FBQyxPQUFPLHlFQUF5RSxDQUFBO3dDQUN4SixJQUFJLENBQUMsU0FBUyxHQUFHLEdBQUcsQ0FBQzt3Q0FDckIsT0FBTyxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsR0FBRyxFQUFFLENBQUMsQ0FBQztvQ0FDcEQsQ0FBQzt5Q0FDSSxDQUFDO3dDQUNGLElBQUEsaUJBQVMsRUFBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDO29DQUN4QyxDQUFDO2dDQUNMLENBQUMsRUFDRCxHQUFHLEVBQUU7b0NBQ0QsSUFBSSxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUM7b0NBQ3hCLElBQUEsaUJBQVMsRUFBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDO2dDQUN4QyxDQUFDLENBQ0osQ0FBQzs0QkFDTixDQUFDO3dCQUNMLENBQUMsRUFDRCxHQUFHLEVBQUU7NEJBQ0QsSUFBSSxDQUFDLGVBQWUsR0FBRyxLQUFLLENBQUM7d0JBQ2pDLENBQUMsQ0FDSixDQUFDO29CQUNOLENBQUM7b0JBQ0QsV0FBVzt3QkFDUCxJQUFJLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQztvQkFDeEIsQ0FBQztvQkFDRCxLQUFLLENBQUMsUUFBUSxDQUFDLElBQVk7d0JBQ3ZCLElBQUksSUFBSSxLQUFLLEVBQUUsRUFBRSxDQUFDOzRCQUNkLElBQUksQ0FBQztnQ0FDRCxNQUFNLFNBQVMsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO2dDQUMxQyxJQUFBLGlCQUFTLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxlQUFlLENBQUMsQ0FBQzs0QkFFN0MsQ0FBQzs0QkFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO2dDQUNiLElBQUEsaUJBQVMsRUFBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsS0FBSyxFQUFFLENBQUMsQ0FBQzs0QkFDakQsQ0FBQzt3QkFDTCxDQUFDO29CQUNMLENBQUM7b0JBQ0QsV0FBVyxDQUFDLElBQWlCLEVBQUUsT0FBZ0I7d0JBQzNDLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDOzRCQUNmLElBQUksQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDO3dCQUN6QixDQUFDO3dCQUNELElBQUksQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDO29CQUMxQixDQUFDO29CQUNELFlBQVksQ0FBQyxJQUFpQixFQUFFLE9BQWdCO3dCQUM1QyxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQzs0QkFDZCxJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQzt3QkFDeEIsQ0FBQzt3QkFDRCxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztvQkFDM0IsQ0FBQztvQkFDRCxVQUFVO3dCQUNOLElBQUksSUFBQSxxQkFBVSxFQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7NEJBQ3ZCLElBQUksUUFBUSxHQUFhLElBQUEsdUJBQVksRUFBQyxRQUFRLENBQUMsQ0FBQzs0QkFDaEQsSUFBSSxRQUFRLElBQUksUUFBUSxDQUFDLFdBQVcsRUFBRSxDQUFDO2dDQUNuQyxRQUFRLENBQUMsV0FBVyxHQUFHLEVBQUUsQ0FBQztnQ0FDMUIsSUFBSSxXQUFXLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO2dDQUN2RCxJQUFBLHdCQUFhLEVBQUMsUUFBUSxFQUFFLFdBQVcsRUFBRSxPQUFPLENBQUMsQ0FBQzs0QkFDbEQsQ0FBQzt3QkFDTCxDQUFDO3dCQUNELElBQUksUUFBUSxHQUFhOzRCQUNyQixTQUFTLEVBQUU7Z0NBQ1AsZUFBZSxFQUFFLEVBQUU7Z0NBQ25CLDBCQUEwQixFQUFFLEVBQUU7Z0NBQzlCLDRCQUE0QixFQUFFLEVBQUU7NkJBQ25DOzRCQUNELGdCQUFnQixFQUFFLEVBQUU7NEJBQ3BCLFVBQVUsRUFBRSxFQUFFOzRCQUNkLFdBQVcsRUFBRSxFQUFFO3lCQUNsQixDQUFDO3dCQUNGLElBQUksWUFBWSxHQUFHLEtBQUssQ0FBQzt3QkFDekIsSUFBSSxLQUFLLEdBQWtCLEVBQUUsQ0FBQzt3QkFDOUIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7NEJBQzVDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLG1DQUFRLFFBQVEsR0FBSyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFFLENBQUM7NEJBQ3hELElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLEVBQUUsQ0FBQztnQ0FDaEMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQzs0QkFDekksQ0FBQzs0QkFFRCxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUM7Z0NBQzVCLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztvQ0FDaEIsWUFBWSxHQUFHLElBQUksQ0FBQztvQ0FDcEIsUUFBUSxDQUFDLFNBQVMscUJBQVEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUUsQ0FBQztnQ0FDMUQsQ0FBQzs0QkFDTCxDQUFDOzRCQUVELElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFVBQVUsRUFBRSxDQUFDO2dDQUNwSyxRQUFRLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQztvQ0FDdEIsS0FBSyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSztvQ0FDN0IsVUFBVSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsVUFBVTtpQ0FDbEYsQ0FBQyxDQUFDO2dDQUNILE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxVQUFVLENBQUM7NEJBQy9FLENBQUM7NEJBRUQsTUFBTSxLQUFtQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFuRCxFQUFFLFFBQVEsRUFBRSxZQUFZLE9BQTJCLEVBQXRCLENBQUMsY0FBOUIsNEJBQWdDLENBQW1CLENBQUM7NEJBQzFELEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQ2xCLENBQUM7d0JBRUQsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsQ0FBQzt3QkFFMUIsSUFBSSxJQUFJLEdBQUcsRUFBRSxLQUFLLEVBQUUsQ0FBQzt3QkFDckIsSUFBSSxPQUFPLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO3dCQUMvQyxJQUFBLHdCQUFhLEVBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQzt3QkFFM0MsSUFBSSxXQUFXLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO3dCQUN2RCxJQUFBLHdCQUFhLEVBQUMsUUFBUSxFQUFFLFdBQVcsRUFBRSxPQUFPLENBQUMsQ0FBQztvQkFDbEQsQ0FBQztvQkFDRCxjQUFjO3dCQUNWLE1BQU0sRUFBRSxHQUFHLENBQUMsSUFBd0IsRUFBRSxFQUFFOzRCQUNwQyxJQUFJLElBQUksRUFBRSxDQUFDO2dDQUNQLElBQUksSUFBSSxDQUFDLFFBQVEsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztvQ0FDNUMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7d0NBQzVDLElBQUksSUFBSSxHQUFnQixJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO3dDQUN6QyxJQUFJLElBQUksQ0FBQyxPQUFPLEtBQUssa0JBQWtCLEVBQUUsQ0FBQzs0Q0FDdEMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnREFDbkMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxLQUFLLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztvREFDL0IsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO29EQUNsQyxNQUFNO2dEQUNWLENBQUM7NENBQ0wsQ0FBQzt3Q0FDTCxDQUFDO29DQUNMLENBQUM7b0NBQ0QsSUFBQSxpQkFBUyxFQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7b0NBQ25DLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztnQ0FDdEIsQ0FBQztxQ0FDSSxDQUFDO29DQUNGLElBQUEsaUJBQVMsRUFBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDO2dDQUM5QyxDQUFDOzRCQUNMLENBQUM7aUNBQ0ksQ0FBQztnQ0FDRixJQUFBLGlCQUFTLEVBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxtQkFBbUIsQ0FBQyxDQUFDOzRCQUNuRCxDQUFDO3dCQUNMLENBQUMsQ0FBQzt3QkFDRixVQUFVLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQ25CLENBQUM7aUJBQ0o7Z0JBQ0QsUUFBUSxFQUFFLElBQUEsdUJBQVksRUFBQyxJQUFBLFdBQUksRUFBQyxTQUFTLEVBQUUsMkNBQTJDLENBQUMsRUFBRSxPQUFPLENBQUM7YUFDaEcsQ0FBQyxDQUFDLENBQUM7WUFDSixHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDdEIsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDaEMsQ0FBQztJQUNMLENBQUM7SUFDRCxXQUFXO0lBQ1gsQ0FBQztJQUNELEtBQUs7UUFDRCxNQUFNLEdBQUcsR0FBRyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ25DLElBQUksR0FBRyxFQUFFLENBQUM7WUFDTixJQUFJLElBQUEscUJBQVUsRUFBQyxRQUFRLENBQUMsRUFBRSxDQUFDO2dCQUN2QixJQUFJLFFBQVEsR0FBYSxJQUFBLHVCQUFZLEVBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ2hELElBQUksUUFBUSxFQUFFLENBQUM7b0JBQ1gsUUFBUSxDQUFDLFVBQVUsR0FBRyxFQUFFLENBQUM7b0JBQ3pCLElBQUksUUFBUSxDQUFDLGFBQWEsRUFBRSxDQUFDO3dCQUN6QixPQUFPLFFBQVEsQ0FBQyxhQUFhLENBQUM7b0JBQ2xDLENBQUM7b0JBQ0QsSUFBSSxRQUFRLENBQUMsVUFBVSxFQUFFLENBQUM7d0JBQ3RCLE9BQU8sUUFBUSxDQUFDLFVBQVUsQ0FBQztvQkFDL0IsQ0FBQztvQkFDRCxJQUFJLFFBQVEsQ0FBQyxlQUFlLEVBQUUsQ0FBQzt3QkFDM0IsT0FBTyxRQUFRLENBQUMsZUFBZSxDQUFDO29CQUNwQyxDQUFDO29CQUNELElBQUksUUFBUSxDQUFDLFlBQVksRUFBRSxDQUFDO3dCQUN4QixPQUFPLFFBQVEsQ0FBQyxZQUFZLENBQUM7b0JBQ2pDLENBQUM7b0JBQ0QsSUFBSSxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQzt3QkFDNUIsT0FBTyxRQUFRLENBQUMsZ0JBQWdCLENBQUM7b0JBQ3JDLENBQUM7b0JBQ0QsSUFBSSxRQUFRLENBQUMsYUFBYSxFQUFFLENBQUM7d0JBQ3pCLE9BQU8sUUFBUSxDQUFDLGFBQWEsQ0FBQztvQkFDbEMsQ0FBQztvQkFDRCxJQUFJLFFBQVEsQ0FBQyxXQUFXLEVBQUUsQ0FBQzt3QkFDdkIsT0FBTyxRQUFRLENBQUMsV0FBVyxDQUFDO29CQUNoQyxDQUFDO29CQUNELElBQUksV0FBVyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztvQkFDdkQsSUFBQSx3QkFBYSxFQUFDLFFBQVEsRUFBRSxXQUFXLEVBQUUsT0FBTyxDQUFDLENBQUM7Z0JBQ2xELENBQUM7WUFDTCxDQUFDO1lBRUQsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2xCLENBQUM7SUFDTCxDQUFDO0NBQ0osQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgdnVlL29uZS1jb21wb25lbnQtcGVyLWZpbGUgKi9cblxuaW1wb3J0IHsgQ2hpbGRQcm9jZXNzV2l0aG91dE51bGxTdHJlYW1zLCBzcGF3biwgZXhlYyB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0IHsgZXhpc3RzU3luYywgcmVhZEZpbGVTeW5jLCByZWFkSlNPTlN5bmMsIHdyaXRlRmlsZVN5bmMgfSBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgcGF0aCwgeyBqb2luIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBjcmVhdGVBcHAsIEFwcCwgZGVmaW5lQ29tcG9uZW50IH0gZnJvbSAndnVlJztcbmltcG9ydCBvcyBmcm9tICdvcyc7XG5pbXBvcnQgQ2ZnVXRpbHMgZnJvbSAnLi9DZmdVdGlscyc7XG5pbXBvcnQgKiBhcyBYTFNYIGZyb20gJ3hsc3gnO1xuaW1wb3J0IHsgRmlsZVV0aWxzIH0gZnJvbSAnLi9GaWxlVXRpbHMnO1xuY29uc3QgcGFuZWxEYXRhTWFwID0gbmV3IFdlYWtNYXA8YW55LCBBcHA+KCk7XG4vKipcbiAqIEB6aCDlpoLmnpzluIzmnJvlhbzlrrkgMy4zIOS5i+WJjeeahOeJiOacrOWPr+S7peS9v+eUqOS4i+aWueeahOS7o+eggVxuICogQGVuIFlvdSBjYW4gYWRkIHRoZSBjb2RlIGJlbG93IGlmIHlvdSB3YW50IGNvbXBhdGliaWxpdHkgd2l0aCB2ZXJzaW9ucyBwcmlvciB0byAzLjNcbiAqL1xuLy8gRWRpdG9yLlBhbmVsLmRlZmluZSA9IEVkaXRvci5QYW5lbC5kZWZpbmUgfHwgZnVuY3Rpb24ob3B0aW9uczogYW55KSB7IHJldHVybiBvcHRpb25zIH1cblxuaW50ZXJmYWNlIFBhY2tQcm9qZWN0IHtcbiAgICBhcHBJZDogc3RyaW5nLFxuICAgIG5hbWU6IHN0cmluZyxcbiAgICBwYXRoOiBzdHJpbmcsLy8gQ29jb3Ppobnnm67moLnnm67lvZVcbiAgICBjaGFubmVsOiBzdHJpbmcsLy8g5oyH5a6a5omT5YyF5a+55bqU5rig6YGT5ZCN56ewXG4gICAgc2tpcDogYm9vbGVhbiwvLyDmmK/lkKbot7Pov4djb2Nvc+aehOW7uuW3peeoi++8jOebtOaOpeS9v+eUqOWvvOWHuuW3peeoi1xuICAgIHVwbG9hZDogYm9vbGVhbiwvLyDmmK/lkKbpnIDopoHkuIrkvKAg5LiOcHJldmlld+S6kuaWpVxuICAgIG5lZWRBdXRvUGFjazogYm9vbGVhbiwvLyDmmK/lkKbpnIDopoHov5vooYzoh6rliqjmnoTlu7rkuIrkvKBcbiAgICBwbGF0Zm9ybUZpbGVzOiB7IFtrZXk6IHN0cmluZ106IHsgcGF0aDogc3RyaW5nLCBpc1Rlc3Q6IGJvb2xlYW4sIGFwaVZlcnNpb24/OiBzdHJpbmcgfSB9LC8vIGtleeW5s+WPsOWQjeensOS4jmNoYW5uZWzlr7nlupTvvIx2YWx1Zea4uOaIj+W3peeoi+S4reW5s+WPsOeahOmFjee9ruaWh+S7tlxuICAgIHBvc3RUb0RpbmdUYWxrOiBib29sZWFuLC8vIOaYr+WQpuaOqOmAgemSiemSiWNvY29z5p6E5bu657uT5p6cXG4gICAgcG9zdFRvRGluZ1RhbGsyOiBib29sZWFuLC8vIOaYr+WQpuaOqOmAgemSiemSiWNsaeS4iuS8oOaIlumihOiniOe7k+aenFxuICAgIG1kNUNhY2hlOiBib29sZWFuLFxuICAgIHNvdXJjZU1hcHM6IGJvb2xlYW4sXG4gICAgY3VzdG9tQ29uZmlnUGF0aDogc3RyaW5nLC8v6Ieq5a6a5LmJ5p6E5bu65qih5p2/anNvbui3r+W+hFxuICAgIG1haW5CdW5kbGVDb21wcmVzc2lvblR5cGU6IHN0cmluZywvL+S4u+WMheWOi+e8qeexu+WeiyAg5peg5Y6L57yp77yaIFwibm9uZVwiICDlkIjlubbkvp3otZbvvJogXCJtZXJnZV9kZXBcIiAg5ZCI5bm25omA5pyJSlNPTu+8miBcIm1lcmdlX2FsbF9qc29uXCIgIFpJUO+8miBcInppcFwiICDlsI/muLjmiI/liIbljIXvvJogXCJzdWJwYWNrYWdlXCJcbiAgICBlbmdpbmVQYXRoOiBzdHJpbmcsLy8gY29jb3PlvJXmk47ot6/lvoRcbiAgICBlbmdpbmVWZXI6IHN0cmluZywvLyBjb2Nvc+W8leaTjueJiOacrFxuICAgIG5hdmlnYXRpb25CYXJUZXh0U3R5bGU6IHN0cmluZywvLyDlr7zoiKrmoI/moIfpopjpopzoibJcbiAgICBwcmV2aWV3OiBib29sZWFuLC8vIOaYr+WQpumihOiniCDkuI51cGxvYWTkupLmlqVcbiAgICB0Yl9jbGlfdG9rZW4/OiBzdHJpbmcsLy8gdGFvYmFvIGNsaSB0b2tlblxuICAgIGRpbmdUYWxrPzogRGluZ1RhbGssLy8g6ZKJ6ZKJ5py65Zmo5Lq66YWN572uXG59XG5jb25zdCBwYWNrc1BhdGggPSBqb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uL3N0YXRpYy9wYWNrY29uZmlncy9QYWNrcy5qc29uJyk7XG5jb25zdCBzYXZlUGF0aCA9IGpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vc3RhdGljL3BhY2tjb25maWdzL3NhdmUuanNvbicpO1xuXG4vLyDlr7nlupTlt6XnqIvkuK3kuI3lkIzlubPlj7Dkvb/nlKjnmoTphY3nva5cbmNvbnN0IFBsYXRmb3JtQ29uZmlnID0ge1xuICAgICd0YW9iYW8tbWluaS1nYW1lJzogJ1BsYXRmb3JtQ29uZmlnX3Rhb2Jhby50cydcbn1cblxuaW50ZXJmYWNlIFRhb0Jhb19DbGlfVG9rZW4ge1xuICAgIGFwcGlkOiBzdHJpbmcsXG4gICAgbmFtZTogc3RyaW5nLFxuICAgIHRva2VuOiBzdHJpbmdcbn1cblxuaW50ZXJmYWNlIERpbmdUYWxrIHtcbiAgICBkaW5nVGFsa1dlYkhvb2s6IHN0cmluZyxcbiAgICBkaW5nVGFsa0N1c3RvbUNvbnRlbnRfcGFjazogc3RyaW5nLFxuICAgIGRpbmdUYWxrQ3VzdG9tQ29udGVudF91cGxvYWQ6IHN0cmluZ1xufVxuXG5pbnRlcmZhY2UgUVJDb2RlIHtcbiAgICBhcHBpZDogc3RyaW5nLFxuICAgIHVybDogc3RyaW5nXG59XG5cbmludGVyZmFjZSBBcGlWZXJzaW9uIHtcbiAgICBhcHBpZDogc3RyaW5nLFxuICAgIGFwaVZlcnNpb246IHN0cmluZ1xufVxuXG5pbnRlcmZhY2UgU2F2ZURhdGEge1xuICAgIGRpbmdfdGFsazogRGluZ1RhbGssXG4gICAgdGFvYmFvX2NsaV90b2tlbjogVGFvQmFvX0NsaV9Ub2tlbltdLFxuICAgIHFyQ29kZVVybHM6IFFSQ29kZVtdLFxuICAgIHN1Y2Nlc3NlZFBhY2s/OiBzdHJpbmdbXSxcbiAgICBmYWlsZWRQYWNrPzogc3RyaW5nW10sXG4gICAgc3VjY2Vzc2VkVXBsb2FkPzogc3RyaW5nW10sXG4gICAgZmFpbGVkVXBsb2FkPzogc3RyaW5nW10sXG4gICAgc3VjY2Vzc2VkUHJldmlldz86IHN0cmluZ1tdLFxuICAgIGZhaWxlZFByZXZpZXc/OiBzdHJpbmdbXSxcbiAgICBhcGlWZXJzaW9ucz86IEFwaVZlcnNpb25bXVxufVxuXG5jb25zdCBUYXNrVGVtcDogUGFja1Byb2plY3QgPSB7XG4gICAgYXBwSWQ6ICcnLFxuICAgIG5hbWU6ICcnLFxuICAgIHBhdGg6ICcnLFxuICAgIGNoYW5uZWw6ICd0YW9iYW8tbWluaS1nYW1lJyxcbiAgICBza2lwOiBmYWxzZSxcbiAgICB1cGxvYWQ6IGZhbHNlLFxuICAgIG5lZWRBdXRvUGFjazogZmFsc2UsXG4gICAgcGxhdGZvcm1GaWxlczoge1xuICAgICAgICAndGFvYmFvLW1pbmktZ2FtZSc6IHtcbiAgICAgICAgICAgIHBhdGg6ICcnLFxuICAgICAgICAgICAgaXNUZXN0OiBmYWxzZVxuICAgICAgICB9XG4gICAgfSxcbiAgICBwb3N0VG9EaW5nVGFsazogZmFsc2UsXG4gICAgcG9zdFRvRGluZ1RhbGsyOiBmYWxzZSxcbiAgICBtZDVDYWNoZTogZmFsc2UsXG4gICAgc291cmNlTWFwczogZmFsc2UsXG4gICAgY3VzdG9tQ29uZmlnUGF0aDogJycsXG4gICAgbWFpbkJ1bmRsZUNvbXByZXNzaW9uVHlwZTogJ25vbmUnLFxuICAgIGVuZ2luZVBhdGg6ICcnLFxuICAgIGVuZ2luZVZlcjogJycsXG4gICAgbmF2aWdhdGlvbkJhclRleHRTdHlsZTogJ2JsYWNrJyxcbiAgICBwcmV2aWV3OiBmYWxzZSxcbn07XG5cbmNvbnN0IHNwYXduX3RiID0gKGFyZ3M6IHN0cmluZ1tdLCBzdWNjZXNzOiBGdW5jdGlvbiwgZmFpbDogRnVuY3Rpb24pID0+IHtcbiAgICBsZXQgc3A6IENoaWxkUHJvY2Vzc1dpdGhvdXROdWxsU3RyZWFtcyA9IHNwYXduKFwidGJnYW1lXCIsIGFyZ3MsIHsgc2hlbGw6IHRydWUgfSk7XG4gICAgc3Auc3Rkb3V0LnNldEVuY29kaW5nKCd1dGY4Jyk7XG4gICAgbGV0IGNvbW1vbmRTdHIgPSBzcC5zcGF3bmFyZ3NbNF0ucmVwbGFjZSgvXCIvZywgJycpO1xuICAgIGxldCBjbGlUb2tlbkZhaWxlZCA9IGZhbHNlO1xuICAgIGxldCB2ZXJzaW9uID0gJyc7XG4gICAgbGV0IHByZXZpZXdVcmwgPSAnJztcbiAgICBsZXQgbmV4dERhdGFJc1FyQ29kZSA9IGZhbHNlO1xuXG4gICAgc3Auc3Rkb3V0Lm9uKCdkYXRhJywgKGRhdGEpID0+IHtcbiAgICAgICAgaWYgKG5leHREYXRhSXNRckNvZGUpIHtcbiAgICAgICAgICAgIG5leHREYXRhSXNRckNvZGUgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBzcGF3bl90YjogJHtjb21tb25kU3RyfSBzdGRvdXQgJHtkYXRhLnRvU3RyaW5nKCl9YCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhdGEuaW5kZXhPZign5pyA5paw57q/5LiK54mI5pysOicpID4gLTEpIHtcbiAgICAgICAgICAgIGxldCBzdHI6IHN0cmluZyA9IGRhdGEudHJpbSgpO1xuICAgICAgICAgICAgbGV0IGFyciA9IHN0ci5zcGxpdCgn5pyA5paw57q/5LiK54mI5pysOicpO1xuICAgICAgICAgICAgdmVyc2lvbiA9IGFyclsxXS50cmltKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhdGEuaW5kZXhPZign6aKE6KeI5LqM57u056CB5Zyw5Z2A77yaJykgPiAtMSkge1xuICAgICAgICAgICAgbGV0IHN0cjogc3RyaW5nID0gZGF0YS50cmltKCk7XG4gICAgICAgICAgICBsZXQgYXJyID0gc3RyLnNwbGl0KCfpooTop4jkuoznu7TnoIHlnLDlnYDvvJonKTtcbiAgICAgICAgICAgIHByZXZpZXdVcmwgPSBhcnJbMV0udHJpbSgpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXRhLmluZGV4T2YoJ+W3suWkjeWItumihOiniOeggeWIsOWJqui0tOadvycpID4gLTEpIHtcbiAgICAgICAgICAgIG5leHREYXRhSXNRckNvZGUgPSB0cnVlO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgc3Auc3RkZXJyLm9uKCdkYXRhJywgKGRhdGEpID0+IHtcbiAgICAgICAgY29uc29sZS5sb2coYHNwYXduX3RiOiAke2NvbW1vbmRTdHJ9IHN0ZGVyciAke2RhdGEudG9TdHJpbmcoKX1gKTtcbiAgICAgICAgaWYgKGRhdGEuaW5kZXhPZignQ0xJIGF1dGggZmFpbGVkJykgPiAtMSkge1xuICAgICAgICAgICAgY2xpVG9rZW5GYWlsZWQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgc3Aub24oJ2V4aXQnLCBhc3luYyAoY29kZSwgZGF0YSkgPT4ge1xuICAgICAgICBpZiAoY29kZSA9PT0gMCkge1xuICAgICAgICAgICAgaWYgKGNsaVRva2VuRmFpbGVkKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYHNwYXduX3RiOiAke2NvbW1vbmRTdHJ9IGZhaWxlZCDorr7nva7osIPnlKjlh63or4FUb2tlbumUmeivr2ApO1xuICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnd2FybicsICd3YXJuJywgJ+iuvue9ruiwg+eUqOWHreivgVRva2Vu6ZSZ6K+vIScpO1xuICAgICAgICAgICAgICAgIGZhaWwgJiYgZmFpbCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYHNwYXduX3RiOiAke2NvbW1vbmRTdHJ9IHN1Y2Nlc3NgKTtcbiAgICAgICAgICAgICAgICBzdWNjZXNzICYmIHN1Y2Nlc3MoeyB2ZXJzaW9uLCBwcmV2aWV3VXJsIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coYHNwYXduX3RiOiAke2NvbW1vbmRTdHJ9IGZhaWxlZGApO1xuICAgICAgICAgICAgZmFpbCAmJiBmYWlsKCk7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cbmV4cG9ydCBjb25zdCBvcGVuRGlsb2cgPSBhc3luYyAodHlwZTogc3RyaW5nLCB0aXRsZTogc3RyaW5nLCBtZXNzYWdlOiBzdHJpbmcsIGJ0bk1hcD86IE1hcDxzdHJpbmcsIEZ1bmN0aW9uPiwgY2FuY2VsPzogbnVtYmVyKSA9PiB7XG4gICAgbGV0IG9wdGlvbjogRWRpdG9yLkRpYWxvZy5NZXNzYWdlRGlhbG9nT3B0aW9ucyA9IHtcbiAgICAgICAgdGl0bGVcbiAgICB9O1xuICAgIGlmIChidG5NYXApIHtcbiAgICAgICAgb3B0aW9uLmJ1dHRvbnMgPSBbXTtcbiAgICAgICAgYnRuTWFwLmZvckVhY2goKHZhbHVlLCBrZXkpID0+IHtcbiAgICAgICAgICAgIG9wdGlvbi5idXR0b25zLnB1c2goa2V5KTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGlmIChjYW5jZWwgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBvcHRpb24uY2FuY2VsID0gY2FuY2VsO1xuICAgIH1cbiAgICBsZXQgY29kZTogeyByZXNwb25zZTogMCwgY2hlY2tib3hDaGVja2VkOiBmYWxzZSB9ID0gYXdhaXQgRWRpdG9yLkRpYWxvZ1t0eXBlXShtZXNzYWdlLCBvcHRpb24pO1xuICAgIGlmIChidG5NYXApIHtcbiAgICAgICAgbGV0IGtleSA9IG9wdGlvbi5idXR0b25zW2NvZGUucmVzcG9uc2VdO1xuICAgICAgICBpZiAoYnRuTWFwLmhhcyhrZXkpKSB7XG4gICAgICAgICAgICBsZXQgZnVuYyA9IGJ0bk1hcC5nZXQoa2V5KTtcbiAgICAgICAgICAgIGlmIChmdW5jKSB7XG4gICAgICAgICAgICAgICAgZnVuYygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5jb25zdCBpbXBvcnRGdW5jID0gKGNiOiBGdW5jdGlvbikgPT4ge1xuICAgIC8vIDEuIOWKqOaAgeWIm+W7uuS4gOS4qumakOiXj+eahCBpbnB1dCDmoIfnrb5cbiAgICBjb25zdCBpbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XG4gICAgaW5wdXQudHlwZSA9ICdmaWxlJztcbiAgICAvLyDpmZDliLblj6rog73pgInmi6kganNvbiDmlofku7bvvIzlpoLmnpzlr7zlhaUgRXhjZWwg5Y+v5Lul5pS55Li6ICcueGxzeCwgLnhscydcbiAgICBpbnB1dC5hY2NlcHQgPSAnLmpzb24sLnhsc3gsLnhscyc7XG4gICAgaW5wdXQuc3R5bGUuZGlzcGxheSA9ICdub25lJztcblxuICAgIC8vIDIuIOebkeWQrOaWh+S7tumAieaLqeeahOWPmOWMllxuICAgIGlucHV0Lm9uY2hhbmdlID0gKGUpID0+IHtcbiAgICAgICAgY29uc3QgZmlsZSA9IChlLnRhcmdldCBhcyBIVE1MSW5wdXRFbGVtZW50KS5maWxlcz8uWzBdO1xuICAgICAgICBpZiAoIWZpbGUpIHJldHVybjtcblxuICAgICAgICAvLyDojrflj5bmlofku7blkI7nvIDlkI3vvIzliKTmlq3mlofku7bnsbvlnotcbiAgICAgICAgY29uc3QgZmlsZU5hbWUgPSBmaWxlLm5hbWU7XG4gICAgICAgIGNvbnN0IGZpbGVFeHQgPSBmaWxlTmFtZS5zbGljZShmaWxlTmFtZS5sYXN0SW5kZXhPZignLicpKS50b0xvd2VyQ2FzZSgpO1xuXG4gICAgICAgIC8vIDMuIOS9v+eUqCBGaWxlUmVhZGVyIOivu+WPluaWh+S7tuWGheWuuVxuICAgICAgICBjb25zdCByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xuICAgICAgICByZWFkZXIub25sb2FkID0gKGV2ZW50KSA9PiB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGxldCBpbXBvcnRlZERhdGEgPSBudWxsO1xuICAgICAgICAgICAgICAgIGlmIChmaWxlRXh0ID09PSAnLmpzb24nKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIOiOt+WPluaWh+S7tumHjOeahOaWh+acrOWGheWuueW5tuino+aekOS4uiBKU09OXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGV2ZW50LnRhcmdldD8ucmVzdWx0IGFzIHN0cmluZztcbiAgICAgICAgICAgICAgICAgICAgaW1wb3J0ZWREYXRhID0gSlNPTi5wYXJzZShyZXN1bHQpO1xuXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChmaWxlRXh0ID09PSAnLnhsc3gnIHx8IGZpbGVFeHQgPT09ICcueGxzJykge1xuICAgICAgICAgICAgICAgICAgICAvLyBFeGNlbCDmlofku7bvvJrku6Xkuozov5vliLblvaLlvI/or7vlj5blubbop6PmnpBcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF0YSA9IG5ldyBVaW50OEFycmF5KGV2ZW50LnRhcmdldD8ucmVzdWx0IGFzIEFycmF5QnVmZmVyKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgd29ya2Jvb2sgPSBYTFNYLnJlYWQoZGF0YSwgeyB0eXBlOiAnYXJyYXknIH0pO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBmaXJzdFNoZWV0TmFtZSA9IHdvcmtib29rLlNoZWV0TmFtZXNbMF07XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHdvcmtzaGVldCA9IHdvcmtib29rLlNoZWV0c1tmaXJzdFNoZWV0TmFtZV07XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNoZWV0RGF0YSA9IFhMU1gudXRpbHMuc2hlZXRfdG9fanNvbih3b3Jrc2hlZXQsIHsgaGVhZGVyOiAxIH0pO1xuICAgICAgICAgICAgICAgICAgICBpbXBvcnRlZERhdGEgPSBDZmdVdGlscy5nZXRKc29uRGF0YShzaGVldERhdGEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYiAmJiBjYihpbXBvcnRlZERhdGEpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcbiAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ2Vycm9yJywgJ+mUmeivrycsICfmlofku7bop6PmnpDlpLHotKXvvIzor7fmo4Dmn6Xmlofku7bmoLzlvI/vvIEnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gNS4g5riF55CG77ya5bCG5Li05pe25Yib5bu655qEIGlucHV0IOagh+etvuS7jumhtemdouS4reenu+mZpFxuICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZChpbnB1dCk7XG4gICAgICAgIH07XG4gICAgICAgIGlmIChmaWxlRXh0ID09PSAnLmpzb24nKSB7XG4gICAgICAgICAgICByZWFkZXIucmVhZEFzVGV4dChmaWxlKTsgLy8gSlNPTiDku6XmlofmnKzlvaLlvI/or7vlj5ZcbiAgICAgICAgfSBlbHNlIGlmIChmaWxlRXh0ID09PSAnLnhsc3gnIHx8IGZpbGVFeHQgPT09ICcueGxzJykge1xuICAgICAgICAgICAgcmVhZGVyLnJlYWRBc0FycmF5QnVmZmVyKGZpbGUpOyAvLyBFeGNlbCDku6Xkuozov5vliLblvaLlvI/or7vlj5ZcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvLyA2LiDlsIYgaW5wdXQg5oyC6L295Yiw6aG16Z2i5bm26Kem5Y+R54K55Ye777yM5by55Ye65paH5Lu26YCJ5oup5qGGXG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChpbnB1dCk7XG4gICAgaW5wdXQuY2xpY2soKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRWRpdG9yLlBhbmVsLmRlZmluZSh7XG4gICAgbGlzdGVuZXJzOiB7XG4gICAgICAgIHNob3coKSB7IGNvbnNvbGUubG9nKCdzaG93Jyk7IH0sXG4gICAgICAgIGhpZGUoKSB7IGNvbnNvbGUubG9nKCdoaWRlJyk7IH0sXG4gICAgfSxcbiAgICB0ZW1wbGF0ZTogcmVhZEZpbGVTeW5jKGpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vc3RhdGljL3RlbXBsYXRlL2RlZmF1bHQvaW5kZXguaHRtbCcpLCAndXRmLTgnKSxcbiAgICBzdHlsZTogcmVhZEZpbGVTeW5jKGpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vc3RhdGljL3N0eWxlL2RlZmF1bHQvaW5kZXguY3NzJyksICd1dGYtOCcpLFxuICAgICQ6IHtcbiAgICAgICAgYXBwOiAnI2FwcCcsXG4gICAgfSxcbiAgICBtZXRob2RzOiB7XG5cbiAgICB9LFxuICAgIHJlYWR5KCkge1xuICAgICAgICBpZiAodGhpcy4kLmFwcCkge1xuICAgICAgICAgICAgY29uc3QgYXBwID0gY3JlYXRlQXBwKHt9KTtcbiAgICAgICAgICAgIGFwcC5jb25maWcuY29tcGlsZXJPcHRpb25zLmlzQ3VzdG9tRWxlbWVudCA9ICh0YWcpID0+IHRhZy5zdGFydHNXaXRoKCd1aS0nKTtcblxuICAgICAgICAgICAgYXBwLmNvbXBvbmVudCgnTXlQcm9qZWN0JywgZGVmaW5lQ29tcG9uZW50KHtcbiAgICAgICAgICAgICAgICBkYXRhKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGFza0xpc3Q6IFtdIGFzIFBhY2tQcm9qZWN0W10sXG4gICAgICAgICAgICAgICAgICAgICAgICBpc0F1dG9QYWNrOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHFyQ29kZVVybDogJycsXG4gICAgICAgICAgICAgICAgICAgICAgICBpc1NldFRiQ2xpVG9rZW46IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGluZ1RhbGs6IHsgZGluZ1RhbGtXZWJIb29rOiAnJywgZGluZ1RhbGtDdXN0b21Db250ZW50X3BhY2s6ICcnLCBkaW5nVGFsa0N1c3RvbUNvbnRlbnRfdXBsb2FkOiAnJyB9IGFzIERpbmdUYWxrLFxuICAgICAgICAgICAgICAgICAgICAgICAgcXJDb2RlVXJsTWFwOiBuZXcgTWFwPHN0cmluZywgUVJDb2RlPigpXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBtb3VudGVkKCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmluaXRTYXZlRGF0YSgpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgbWV0aG9kczoge1xuICAgICAgICAgICAgICAgICAgICBpbml0U2F2ZURhdGEoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhc2tMaXN0ID0gZXhpc3RzU3luYyhwYWNrc1BhdGgpID8gSlNPTi5wYXJzZShyZWFkRmlsZVN5bmMocGFja3NQYXRoLCAndXRmLTgnKSkucGFja3MgOiBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCB0YW9iYW9DbGlUb2tlbk1hcDogTWFwPHN0cmluZywgVGFvQmFvX0NsaV9Ub2tlbj4gPSBuZXcgTWFwPHN0cmluZywgVGFvQmFvX0NsaV9Ub2tlbj4oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChleGlzdHNTeW5jKHNhdmVQYXRoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBkYXRhOiBTYXZlRGF0YSA9IHJlYWRKU09OU3luYyhzYXZlUGF0aCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEuZGluZ190YWxrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmRpbmdUYWxrID0gZGF0YS5kaW5nX3RhbGs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEudGFvYmFvX2NsaV90b2tlbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBkYXRhLnRhb2Jhb19jbGlfdG9rZW4ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YW9iYW9DbGlUb2tlbk1hcC5zZXQoZGF0YS50YW9iYW9fY2xpX3Rva2VuW2ldLmFwcGlkLCBkYXRhLnRhb2Jhb19jbGlfdG9rZW5baV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy50YXNrTGlzdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy50YXNrTGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGFvYmFvQ2xpVG9rZW5NYXAuaGFzKHRoaXMudGFza0xpc3RbaV0uYXBwSWQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhc2tMaXN0W2ldLnRiX2NsaV90b2tlbiA9IHRhb2Jhb0NsaVRva2VuTWFwLmdldCh0aGlzLnRhc2tMaXN0W2ldLmFwcElkKS50b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhc2tMaXN0W2ldLmRpbmdUYWxrID0gdGhpcy5kaW5nVGFsaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0QXV0b1BhY2soKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgdGVzdFNlcnZlcldhcm5zOiBzdHJpbmcgPSAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy50YXNrTGlzdCB8fCB0aGlzLnRhc2tMaXN0Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBidG5NYXAgPSBuZXcgTWFwPHN0cmluZywgRnVuY3Rpb24+KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnRuTWFwLnNldCgnYWRkJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZFByb2plY3QoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBidG5NYXAuc2V0KCdjYW5jZWwnLCBudWxsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAnd2FybicsICfor7flhYjmt7vliqDoh6rliqjljJbpobnnm67phY3nva7vvIEnLCBidG5NYXApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmdldEF1dG9Db3VudCgpID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ3dhcm4nLCAn5peg6Ieq5Yqo5YyW6aG555uuIScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy50YXNrTGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGFza0xpc3RbaV0gPSB7IC4uLlRhc2tUZW1wLCAuLi50aGlzLnRhc2tMaXN0W2ldIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHRhc2s6IFBhY2tQcm9qZWN0ID0gdGhpcy50YXNrTGlzdFtpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGFzay5uZWVkQXV0b1BhY2sgPT09IGZhbHNlKSBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRhc2suYXBwSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ3dhcm4nLCAn6Ieq5Yqo5YyW6aG555uu5Lit5pyq6YWN572uYXBwSWTvvIzor7fmo4Dmn6XphY3nva7vvIEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRhc2sucGF0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAnd2FybicsICfoh6rliqjljJbpobnnm67kuK3mnKrphY3nva7pobnnm67ot6/lvoTvvIzor7fmo4Dmn6XphY3nva7vvIEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRhc2suY2hhbm5lbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAnd2FybicsICfoh6rliqjljJbpobnnm67kuK3mnKrphY3nva7muKDpgZPlubPlj7DvvIzor7fmo4Dmn6XphY3nva7vvIEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRhc2suZW5naW5lUGF0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAnd2FybicsICfoh6rliqjljJbpobnnm67kuK3mnKrphY3nva7lvJXmk47ot6/lvoTvvIzor7fmo4Dmn6XphY3nva7vvIEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRhc2suZW5naW5lVmVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnd2FybicsICd3YXJuJywgJ+iHquWKqOWMlumhueebruS4reacqumFjee9ruW8leaTjueJiOacrO+8jOivt+ajgOafpemFjee9ru+8gScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0YXNrLmNoYW5uZWwgPT09ICd0YW9iYW8tbWluaS1nYW1lJyAmJiAodGFzay51cGxvYWQgfHwgdGFzay5wcmV2aWV3KSAmJiAhdGFzay50Yl9jbGlfdG9rZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ3dhcm4nLCAn6K+35q2j56Gu5aGr5YaZ5reY5a6d5bCP5ri45oiPQ0xJIFRva2Vu77yBJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoKHRhc2sucG9zdFRvRGluZ1RhbGsgfHwgdGFzay5wb3N0VG9EaW5nVGFsazIpICYmICghdGFzay5kaW5nVGFsayB8fCAhdGFzay5kaW5nVGFsay5kaW5nVGFsa1dlYkhvb2spKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnd2FybicsICd3YXJuJywgJ+WLvumAieS6humSiemSieaOqOmAge+8jOivt+ato+ehruWhq+WGmemSiemSiVdlYkhvb2vvvIEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwbGF0Zm9ybUZpbGVwYXRoID0gdGhpcy5nZXRQbGF0Zm9ybUZpbGUodGFzayk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBsYXRmb3JtRmlsZXBhdGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgbm9ybWFsaXplZFBhdGggPSBwYXRoLm5vcm1hbGl6ZSh0YXNrLnBhdGgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocGxhdGZvcm1GaWxlcGF0aC5pbmRleE9mKG5vcm1hbGl6ZWRQYXRoKSA8IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnd2FybicsICd3YXJuJywgYGFwcElkOiR7dGFzay5hcHBJZH0ke3Rhc2submFtZX0sJHt0YXNrLmNoYW5uZWx96YWN572u5LiN5Zyo6aG555uu6Lev5b6E5LitLOivt+ajgOafpemFjee9ru+8gWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBpc1Rlc3QgPSB0aGlzLmdldFBsYXRmb3JtRmlsZVNlcnZlcih0YXNrKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzVGVzdCAmJiB0YXNrLnVwbG9hZCAmJiAhdGFzay5za2lwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXN0U2VydmVyV2FybnMgKz0gYOazqOaEj++8ge+8gSR7dGFzay5hcHBJZH3vvJoke3Rhc2submFtZX3vvIzkvb/nlKjnmoTmtYvor5XmnI3vvIHvvIFcXG5gXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5pc0F1dG9QYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ3dhcm4nLCAn5q2j5Zyo6Ieq5Yqo5YyW77yM6K+356iN5ZCO5YaN6K+VIScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYXV0b1BhY2sgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCdpbmZvJywgJ3N0YXJ0JywgJ+W8gOWni+iHquWKqOWMlicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaXNBdXRvUGFjayA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zYXZlQ29uZmlnKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgcGF0aCA9IGpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vc3RhdGljL2F1dG8tcGFjay9idWlsZC9hcHAuanMnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgYXJncyA9IFtwYXRoXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgc3A6IENoaWxkUHJvY2Vzc1dpdGhvdXROdWxsU3RyZWFtcyA9IHNwYXduKFwibm9kZVwiLCBhcmdzLCB7IHNoZWxsOiB0cnVlIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNwLnN0ZG91dC5zZXRFbmNvZGluZygndXRmOCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNwLnN0ZG91dC5vbignZGF0YScsIChkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBhdXRvUGFjayBzdGRvdXQgJHtkYXRhLnRvU3RyaW5nKCl9YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3Auc3RkZXJyLm9uKCdkYXRhJywgKGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYGF1dG9QYWNrIHN0ZGVyciAke2RhdGEudG9TdHJpbmcoKX1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNwLm9uKCdleGl0JywgKGNvZGUsIGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvZGUgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBhdXRvUGFjayBleGl0IHN1c2Nlc3MgJHtkYXRhfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG1zZyA9ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGV4aXN0c1N5bmMoc2F2ZVBhdGgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHNhdmVEYXRhOiBTYXZlRGF0YSA9IEpTT04ucGFyc2UocmVhZEZpbGVTeW5jKHNhdmVQYXRoLCAndXRmLTgnKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5qOA5rWL5piv5ZCm5pyJ6aKE6KeI56CB55Sf5oiQXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5xckNvZGVVcmxNYXAuY2xlYXIoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2F2ZURhdGEucXJDb2RlVXJscykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNhdmVEYXRhLnFyQ29kZVVybHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucXJDb2RlVXJsTWFwLnNldChzYXZlRGF0YS5xckNvZGVVcmxzW2ldLmFwcGlkLCBzYXZlRGF0YS5xckNvZGVVcmxzW2ldKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDoh6rliqjljJbnu5PmnpxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2F2ZURhdGEuc3VjY2Vzc2VkUGFjayAmJiBzYXZlRGF0YS5zdWNjZXNzZWRQYWNrLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXNnICs9ICfmnoTlu7rmiJDlip/vvJonO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNhdmVEYXRhLnN1Y2Nlc3NlZFBhY2subGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zZyArPSBgJHtzYXZlRGF0YS5zdWNjZXNzZWRQYWNrW2ldfSR7aSA9PT0gc2F2ZURhdGEuc3VjY2Vzc2VkUGFjay5sZW5ndGggLSAxID8gJ1xcbicgOiAnICd9YDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2F2ZURhdGEuZmFpbGVkUGFjayAmJiBzYXZlRGF0YS5mYWlsZWRQYWNrLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXNnICs9ICfmnoTlu7rlpLHotKXvvJonO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNhdmVEYXRhLmZhaWxlZFBhY2subGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zZyArPSBgJHtzYXZlRGF0YS5mYWlsZWRQYWNrW2ldfSR7aSA9PT0gc2F2ZURhdGEuZmFpbGVkUGFjay5sZW5ndGggLSAxID8gJ1xcbicgOiAnICd9YDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2F2ZURhdGEuc3VjY2Vzc2VkVXBsb2FkICYmIHNhdmVEYXRhLnN1Y2Nlc3NlZFVwbG9hZC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zZyArPSAn5LiK5Lyg5oiQ5Yqf77yaJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzYXZlRGF0YS5zdWNjZXNzZWRVcGxvYWQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zZyArPSBgJHtzYXZlRGF0YS5zdWNjZXNzZWRVcGxvYWRbaV19JHtpID09PSBzYXZlRGF0YS5zdWNjZXNzZWRVcGxvYWQubGVuZ3RoIC0gMSA/ICdcXG4nIDogJyAnfWA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNhdmVEYXRhLmZhaWxlZFVwbG9hZCAmJiBzYXZlRGF0YS5mYWlsZWRVcGxvYWQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtc2cgKz0gJ+S4iuS8oOWksei0pe+8mic7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2F2ZURhdGEuZmFpbGVkVXBsb2FkLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtc2cgKz0gYCR7c2F2ZURhdGEuZmFpbGVkVXBsb2FkW2ldfSR7aSA9PT0gc2F2ZURhdGEuZmFpbGVkVXBsb2FkLmxlbmd0aCAtIDEgPyAnXFxuJyA6ICcgJ31gO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzYXZlRGF0YS5zdWNjZXNzZWRQcmV2aWV3ICYmIHNhdmVEYXRhLnN1Y2Nlc3NlZFByZXZpZXcubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtc2cgKz0gJ+mihOiniOaIkOWKn++8mic7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2F2ZURhdGEuc3VjY2Vzc2VkUHJldmlldy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXNnICs9IGAke3NhdmVEYXRhLnN1Y2Nlc3NlZFByZXZpZXdbaV19JHtpID09PSBzYXZlRGF0YS5zdWNjZXNzZWRQcmV2aWV3Lmxlbmd0aCAtIDEgPyAnXFxuJyA6ICcgJ31gO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzYXZlRGF0YS5mYWlsZWRQcmV2aWV3ICYmIHNhdmVEYXRhLmZhaWxlZFByZXZpZXcubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtc2cgKz0gJ+mihOiniOWksei0pe+8mic7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2F2ZURhdGEuZmFpbGVkUHJldmlldy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXNnICs9IGAke3NhdmVEYXRhLmZhaWxlZFByZXZpZXdbaV19JHtpID09PSBzYXZlRGF0YS5mYWlsZWRQcmV2aWV3Lmxlbmd0aCAtIDEgPyAnXFxuJyA6ICcgJ31gO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCdpbmZvJywgJ+WujOaIkCcsIGDoh6rliqjljJblrozmiJAhXFxuJHttc2d9YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgYXV0b1BhY2sgZXhpdCBmYWlsICR7ZGF0YX1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnZXJyb3InLCAn5aSx6LSlJywgJ+iHquWKqOWMluWksei0pSEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmlzQXV0b1BhY2sgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBtc2cgPSAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCB1cGxvYWRDb3VudCA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgcGFja0NvdW50ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhdXRvQ291bnQgPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHByZXZpZXdDb3VudCA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCB0YXNrIG9mIHRoaXMudGFza0xpc3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGFzay5uZWVkQXV0b1BhY2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXV0b0NvdW50Kys7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0YXNrLnVwbG9hZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXBsb2FkQ291bnQrKztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRhc2suc2tpcCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFja0NvdW50Kys7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRhc2sucHJldmlldykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJldmlld0NvdW50Kys7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHNlcnZlck1zZyA9IHRhc2suc2tpcCA/ICcnIDogKHRhc2sucGxhdGZvcm1GaWxlcyAmJiB0YXNrLnBsYXRmb3JtRmlsZXNbdGFzay5jaGFubmVsXSA/ICfvvIwnICsgKHRhc2sucGxhdGZvcm1GaWxlc1t0YXNrLmNoYW5uZWxdLmlzVGVzdCA/ICfmtYvor5XmnI0nIDogJ+ato+W8j+acjScpIDogJycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtc2cgKz0gYCR7dGFzay5hcHBJZH3vvJoke3Rhc2submFtZX3vvIzmnoTlu7rvvJokeyh0YXNrLnNraXAgPyAn4pyVJyA6ICfinJMnKX3vvIzkuIrkvKDvvJokeyh0YXNrLnVwbG9hZCA/ICfinJMnIDogJ+KclScpfe+8jOmihOiniO+8miR7KHRhc2sucHJldmlldyA/ICfinJMnIDogJ+KclScpfSR7c2VydmVyTXNnfVxcbmA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgbXNnICs9IGDoh6rliqjljJbvvJoke2F1dG9Db3VudH3kuKrvvIzmnoTlu7rvvJoke3BhY2tDb3VudH3kuKrvvIzkuIrkvKDvvJoke3VwbG9hZENvdW50feS4qu+8jOmihOiniO+8miR7cHJldmlld0NvdW50feS4qlxcbmA7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGVzdFNlcnZlcldhcm5zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXNnICs9IHRlc3RTZXJ2ZXJXYXJucztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBidG5NYXAgPSBuZXcgTWFwPHN0cmluZywgRnVuY3Rpb24+KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBidG5NYXAuc2V0KCdvaycsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdXRvUGFjaygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAnd2FybicsIGAke21zZ33lvIDlp4voh6rliqjljJY/YCwgYnRuTWFwLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgYWRkUHJvamVjdCgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGFza0xpc3QucHVzaCh7IC4uLlRhc2tUZW1wIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCdpbmZvJywgJ2FkZCcsICfmt7vliqDmiJDlip8nKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZGVsUHJvamVjdChpdGVtOiBQYWNrUHJvamVjdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGJ0bk1hcCA9IG5ldyBNYXA8c3RyaW5nLCBGdW5jdGlvbj4oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ0bk1hcC5zZXQoJ2RlbGV0ZScsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudGFza0xpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHRhc2sgPSB0aGlzLnRhc2tMaXN0W2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGFzay5hcHBJZCA9PT0gaXRlbS5hcHBJZCAmJiB0YXNrLm5hbWUgPT09IGl0ZW0ubmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YXNrTGlzdC5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ2RlbGV0ZScsICfmmK/lkKbliKDpmaTphY3nva4/JywgYnRuTWFwLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgaW1wb3J0UGFja3NDb25maWcoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDor7TmmI7pnZnmgIHmlofku7bkuK3mnIkgUGFja3MuanNvbuS6hu+8jOivoumXruaYr+WQpuabv+aNolxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY2IgPSAoaW1wb3J0ZWREYXRhOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDlgYforr7lr7zlhaXnmoQgSlNPTiDmoLzlvI/kuZ/mmK8geyBwYWNrczogWy4uLl0gfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbXBvcnRlZERhdGEgJiYgKChpbXBvcnRlZERhdGEucGFja3MgJiYgQXJyYXkuaXNBcnJheShpbXBvcnRlZERhdGEucGFja3MpIHx8IEFycmF5LmlzQXJyYXkoaW1wb3J0ZWREYXRhKSkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWwhuWvvOWFpeeahOaVsOaNruabv+aNouWIsOW9k+WJjeeahCB0YXNrTGlzdCDkuK1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGRhdGEgPSBpbXBvcnRlZERhdGEucGFja3MgPyBpbXBvcnRlZERhdGEucGFja3MgOiBpbXBvcnRlZERhdGE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCB0bXBzOiBQYWNrUHJvamVjdFtdID0gWy4uLnRoaXMudGFza0xpc3RdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhc2tMaXN0ID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YXNrTGlzdFtpXSA9IHsgLi4uVGFza1RlbXAsIC4uLmRhdGFbaV0gfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGFza0xpc3RbaV0uZGluZ1RhbGsgPSB0aGlzLmRpbmdUYWxrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5nZXRQbGF0Zm9ybUZpbGUodGhpcy50YXNrTGlzdFtpXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IHRtcHMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy50YXNrTGlzdFtpXS5hcHBJZCA9PT0gdG1wc1tqXS5hcHBJZCAmJiB0bXBzW2pdLnRiX2NsaV90b2tlbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhc2tMaXN0W2ldLnRiX2NsaV90b2tlbiA9IHRtcHNbal0udGJfY2xpX3Rva2VuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyA0LiDop6blj5Hkv53lrZjvvIzlsIbmlrDmlbDmja7lhpnlhaXmnKzlnLAgUGFja3MuanNvblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNhdmVDb25maWcoKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDlpoLmnpzmnIkgRWRpdG9yLkRpYWxvZ++8jOWPr+S7peW8ueS4quaIkOWKn+aPkOekulxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ2luZm8nLCAn5o+Q56S6JywgJ+WvvOWFpeaIkOWKn++8gScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ+itpuWRiicsICflr7zlhaXnmoTmlofku7bmoLzlvI/kuI3mraPnoa7vvIEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudGFza0xpc3QgJiYgdGhpcy50YXNrTGlzdC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGJ0bk1hcCA9IG5ldyBNYXA8c3RyaW5nLCBGdW5jdGlvbj4oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBidG5NYXAuc2V0KCdyZXBsYWNlJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbXBvcnRGdW5jKGNiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBidG5NYXAuc2V0KCdjYW5jZWwnLCBudWxsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAncmVwbGFjZScsICdQYWNrcy5qc29uIOW3suWtmOWcqO+8jOaYr+WQpuabv+aNoj8nLCBidG5NYXApO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW1wb3J0RnVuYyhjYik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGV4cG9ydFBhY2tzQ29uZmlnKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8g6K+05piO5rKh5pyJ6YWN572uXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMudGFza0xpc3QgfHwgdGhpcy50YXNrTGlzdC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAn6K2m5ZGKJywgJ+ayoeaciemFjee9ru+8jOaXoOazleWvvOWHuicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gMS4g57uE6KOF6ZyA6KaB5a+85Ye655qE5pWw5o2uXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHBhY2tzOiBQYWNrUHJvamVjdFtdID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRhc2tMaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgZGluZ1RhbGssIHRiX2NsaV90b2tlbiwgLi4udCB9ID0gdGhpcy50YXNrTGlzdFtpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFja3MucHVzaCh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZXhwb3J0RGF0YSA9IHsgcGFja3MgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRhU3RyID0gSlNPTi5zdHJpbmdpZnkoZXhwb3J0RGF0YSwgbnVsbCwgXCJcXHRcIik7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAyLiDojrflj5blvZPliY3ns7vnu5/nmoTmoYzpnaLot6/lvoRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkZXNrdG9wUGF0aCA9IG9zLmhvbWVkaXIoKSArICcvRGVza3RvcCc7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAzLiDmi7zmjqXlrozmlbTnmoTkv53lrZjot6/lvoRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBleHBvcnRQYXRoID0gam9pbihkZXNrdG9wUGF0aCwgYFBhY2tzLmpzb25gKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIDQuIOS9v+eUqCBOb2RlLmpzIOWOn+eUnyBmcyDmqKHlnZflkIzmraXlhpnlhaXmlofku7bliLDmoYzpnaJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3cml0ZUZpbGVTeW5jKGV4cG9ydFBhdGgsIGRhdGFTdHIsICd1dGYtOCcpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gNS4g5by55Ye65oiQ5Yqf5o+Q56S6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCdpbmZvJywgJ+aPkOekuicsIGDphY3nva7lt7LmiJDlip/lr7zlh7rliLDmoYzpnaLvvIFcXG7mlofku7blkI3vvJoke2BQYWNrcy5qc29uYH1gKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCflr7zlh7rlpLHotKU6JywgZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnZXJyb3InLCAn6ZSZ6K+vJywgJ+WvvOWHuumFjee9ruaWh+S7tuWksei0pe+8jOivt+ajgOafpeadg+mZkO+8gScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBvbmVrZXlPcGVyYXRlQXV0b1BhY2soZmxhZzogYm9vbGVhbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRhc2tMaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YXNrTGlzdFtpXS5uZWVkQXV0b1BhY2sgPSBmbGFnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZmxhZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhc2tMaXN0W2ldLnVwbG9hZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhc2tMaXN0W2ldLnNraXAgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgb25la2V5T3BlcmF0ZVVwbG9hZChmbGFnOiBib29sZWFuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudGFza0xpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhc2tMaXN0W2ldLnVwbG9hZCA9IGZsYWc7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIG9uZWtleU9wZXJhdGVTa2lwUGFjayhmbGFnOiBib29sZWFuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudGFza0xpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhc2tMaXN0W2ldLnNraXAgPSBmbGFnO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnZXRBdXRvQ291bnQoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgY291bnQgPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRhc2tMaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudGFza0xpc3RbaV0ubmVlZEF1dG9QYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50Kys7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNvdW50O1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnZXRVcGxvYWRDb3VudCgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjb3VudCA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudGFza0xpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy50YXNrTGlzdFtpXS51cGxvYWQgJiYgdGhpcy50YXNrTGlzdFtpXS5uZWVkQXV0b1BhY2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY291bnQrKztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY291bnQ7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdldFByZXZpZXdDb3VudCgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjb3VudCA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudGFza0xpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy50YXNrTGlzdFtpXS5wcmV2aWV3ICYmIHRoaXMudGFza0xpc3RbaV0ubmVlZEF1dG9QYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50Kys7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNvdW50O1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnZXRQYWNrQ291bnQoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgY291bnQgPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRhc2tMaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLnRhc2tMaXN0W2ldLnNraXAgJiYgdGhpcy50YXNrTGlzdFtpXS5uZWVkQXV0b1BhY2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY291bnQrKztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY291bnQ7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIG9wZW5Mb2dEaXIocGF0aDogc3RyaW5nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWV4aXN0c1N5bmMocGF0aCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAnd2FybicsICfml6Xlv5fmlofku7blpLnkuI3lrZjlnKjvvIEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4ZWMoYHN0YXJ0IFwiXCIgXCIke3BhdGh9XCJgLCAoZXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCfmiafooYzlkb3ku6Tlh7rplJk6JywgZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCdlcnJvcicsICfplJnor68nLCAn5peg5rOV5omT5byA55uu5b2V77yM6K+35qOA5p+l6Lev5b6E5oiW5p2D6ZmQ77yBJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcign5omT5byA55uu5b2V5byC5bi4OicsIGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ2Vycm9yJywgJ+mUmeivrycsICflj5HnlJ/mnKrnn6XplJnor6/vvIzml6Dms5XmiZPlvIDnm67lvZXvvIEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgb3BlblRvb2xMb2coKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm9wZW5Mb2dEaXIoam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi90b29sTG9nJykpO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBjbGlja0F1dG9QYWNrVG9nZ2xlKGl0ZW06IFBhY2tQcm9qZWN0LCBmbGFnOiBib29sZWFuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtLm5lZWRBdXRvUGFjayA9IGZsYWc7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWZsYWcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtLnVwbG9hZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0uc2tpcCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS5wcmV2aWV3ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHNldFBsYXRmb3JtRmlsZShpdGVtOiBQYWNrUHJvamVjdCwgcGF0aDogc3RyaW5nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWl0ZW0ucGxhdGZvcm1GaWxlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0ucGxhdGZvcm1GaWxlcyA9IHt9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFpdGVtLnBsYXRmb3JtRmlsZXNbaXRlbS5jaGFubmVsXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0ucGxhdGZvcm1GaWxlc1tpdGVtLmNoYW5uZWxdID0geyBwYXRoOiAnJywgaXNUZXN0OiBmYWxzZSB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS5wbGF0Zm9ybUZpbGVzW2l0ZW0uY2hhbm5lbF0ucGF0aCA9IHBhdGg7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCB0IG9mIHRoaXMudGFza0xpc3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeSh0LnBsYXRmb3JtRmlsZXMpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgc2V0UGxhdGZvcm1GaWxlU2VydmVyKGl0ZW06IFBhY2tQcm9qZWN0LCBpc1Rlc3Q6IGJvb2xlYW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaXRlbS5wbGF0Zm9ybUZpbGVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS5wbGF0Zm9ybUZpbGVzID0ge307XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWl0ZW0ucGxhdGZvcm1GaWxlc1tpdGVtLmNoYW5uZWxdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS5wbGF0Zm9ybUZpbGVzW2l0ZW0uY2hhbm5lbF0gPSB7IHBhdGg6ICcnLCBpc1Rlc3Q6IGZhbHNlIH07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtLnBsYXRmb3JtRmlsZXNbaXRlbS5jaGFubmVsXS5pc1Rlc3QgPSBpc1Rlc3Q7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdldFBsYXRmb3JtRmlsZShpdGVtOiBQYWNrUHJvamVjdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW0ucGF0aCAmJiBpdGVtLnBsYXRmb3JtRmlsZXMgJiYgaXRlbS5wbGF0Zm9ybUZpbGVzW2l0ZW0uY2hhbm5lbF0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWl0ZW0ucGxhdGZvcm1GaWxlc1tpdGVtLmNoYW5uZWxdLnBhdGggfHwgIWV4aXN0c1N5bmMoaXRlbS5wbGF0Zm9ybUZpbGVzW2l0ZW0uY2hhbm5lbF0ucGF0aCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS5wbGF0Zm9ybUZpbGVzW2l0ZW0uY2hhbm5lbF0ucGF0aCA9IEZpbGVVdGlscy5maW5kRmlsZShpdGVtLnBhdGgsIFBsYXRmb3JtQ29uZmlnW2l0ZW0uY2hhbm5lbF0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gaXRlbS5wbGF0Zm9ybUZpbGVzW2l0ZW0uY2hhbm5lbF0ucGF0aCB8fCAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2V0UGxhdGZvcm1GaWxlU2VydmVyKGl0ZW06IFBhY2tQcm9qZWN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbS5wbGF0Zm9ybUZpbGVzICYmIGl0ZW0ucGxhdGZvcm1GaWxlc1tpdGVtLmNoYW5uZWxdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGl0ZW0ucGxhdGZvcm1GaWxlc1tpdGVtLmNoYW5uZWxdLmlzVGVzdCB8fCBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2V0QXBpVmVyc2lvbihpdGVtOiBQYWNrUHJvamVjdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFwaVZlcnNpb246IHN0cmluZyA9ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW0ucGxhdGZvcm1GaWxlcyAmJiBpdGVtLnBsYXRmb3JtRmlsZXNbaXRlbS5jaGFubmVsXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwYXRoID0gaXRlbS5wbGF0Zm9ybUZpbGVzW2l0ZW0uY2hhbm5lbF0ucGF0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXhpc3RzU3luYyhwYXRoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGZpbGVDb250ZW50ID0gcmVhZEZpbGVTeW5jKHBhdGgsICd1dGYtOCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZpbGVDb250ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5L2/55So5q2j5YiZ6KGo6L6+5byP5Yy56YWNIGFwaVZlcnNpb24g55qE5YC8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g6L+Z5Liq5q2j5YiZ6KGo6L6+5byP55qE6Kej6YeK77yaXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYXBpVmVyc2lvbjogICAgICAgIC0+IOWMuemFjeWtl+mdoumHjyBcImFwaVZlcnNpb246XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBcXHMqICAgICAgICAgICAgICAgIC0+IOWMuemFjembtuS4quaIluWkmuS4quepuueZveWtl+espu+8iOWmguepuuagvOOAgeaNouihjO+8iVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFwiICAgICAgICAgICAgICAgICAgLT4g5Yy56YWN5LiA5Liq5Y+M5byV5Y+3XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gKFteXCJdKikgICAgICAgICAgICAtPiDov5nmmK/kuIDkuKrmjZXojrfnu4TvvIzljLnphY3pmaTkuoblj4zlvJXlj7fku6XlpJbnmoTku7vmhI/lrZfnrKbvvIznm7TliLDpgYfliLDkuIvkuIDkuKrlj4zlvJXlj7dcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBcIiAgICAgICAgICAgICAgICAgIC0+IOWMuemFjee7k+WwvueahOWPjOW8leWPt1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZlcnNpb25SZWdleCA9IC9hcGlWZXJzaW9uOlxccypcIihbXlwiXSopXCIvO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG1hdGNoUmVzdWx0ID0gZmlsZUNvbnRlbnQubWF0Y2godmVyc2lvblJlZ2V4KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOajgOafpeaYr+WQpuWMuemFjeaIkOWKn+W5tuaPkOWPluWAvFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtYXRjaFJlc3VsdCAmJiBtYXRjaFJlc3VsdFsxXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBtYXRjaFJlc3VsdFsxXSDlsLHmmK/nrKzkuIDkuKrmjZXojrfnu4TnmoTlhoXlrrnvvIzkuZ/lsLHmmK/miJHku6zmg7PopoHnmoTlgLxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBpVmVyc2lvbiA9IG1hdGNoUmVzdWx0WzFdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXBpVmVyc2lvbjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhcGlWZXJzaW9uO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXBpVmVyc2lvbjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXBpVmVyc2lvbjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2V0VGFvQmFvRGVidWdVcmwoaXRlbTogUGFja1Byb2plY3QsIGlzUHJldmlldzogYm9vbGVhbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ3dhcm4nLCAn6aG555uu6YWN572u5Li656m677yM6K+35qOA5p+l6YWN572uJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFpdGVtLmFwcElkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ3dhcm4nLCAn6K+36L6T5YWl5q2j56Gu55qEYXBwSWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWl0ZW0udGJfY2xpX3Rva2VuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ3dhcm4nLCAn6K+36L6T5YWl5q2j56Gu55qE5reY5a6dQ0xJIFRva2VuJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmlzU2V0VGJDbGlUb2tlbiA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBzcGF3bl90YihbJ2NvbmZpZycsICdzZXQnLCAndG9rZW4nLCBpdGVtLnRiX2NsaV90b2tlbl0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmlzU2V0VGJDbGlUb2tlbiA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmlzQXV0b1BhY2sgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNQcmV2aWV3KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgY29tcGFyZVZlcnNpb24gPSAodmVyMTogc3RyaW5nLCB2ZXIyOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgYXJyMSA9IHZlcjEuc3BsaXQoJy4nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgYXJyMiA9IHZlcjIuc3BsaXQoJy4nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbGVuZ3RoID0gTWF0aC5taW4oYXJyMS5sZW5ndGgsIGFycjIubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcnIxW2ldID09IGFycjJbaV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBOdW1iZXIoYXJyMVtpXSkgLSBOdW1iZXIoYXJyMltpXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhcnIxLmxlbmd0aCAtIGFycjIubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBvdXRQYXRoID0gcGF0aC5qb2luKGl0ZW0ucGF0aCwgYGJ1aWxkLyR7Y29tcGFyZVZlcnNpb24oaXRlbS5lbmdpbmVWZXIsIFwiMy4wLjBcIikgPyBpdGVtLmNoYW5uZWwgOiAndGFvYmFvLW1pbmlnYW1lJ31gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNwYXduX3RiKFtcInByZXZpZXdcIiwgXCItaVwiLCBvdXRQYXRoLCBcIi1hXCIsIGl0ZW0uYXBwSWQsIFwiLXRcIiwgXCJtaW5pZ2FtZVwiLCBcIi0tY29weVwiLCBcInRydWVcIiwgXCItLXJlbmRlck1vZGVcIiwgXCJoaWdoUGVyZm9ybWFuY2VcIl0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKGRhdGE6IHsgcHJldmlld1VybDogc3RyaW5nIH0pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pc0F1dG9QYWNrID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy50YXNrTGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudGFza0xpc3RbaV0uYXBwSWQgPT09IGl0ZW0uYXBwSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnFyQ29kZVVybE1hcC5zZXQoaXRlbS5hcHBJZCwgeyBhcHBpZDogaXRlbS5hcHBJZCwgdXJsOiBkYXRhLnByZXZpZXdVcmwgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pc0F1dG9QYWNrID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNwYXduX3RiKFsnYXBwJywgJy1hJywgaXRlbS5hcHBJZF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKGRhdGE6IHsgdmVyc2lvbjogc3RyaW5nIH0pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pc0F1dG9QYWNrID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLnZlcnNpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCB1cmwgPSBgaHR0cHM6Ly9tLmR1YW5xdS5jb20/X2FyaXZlcl9hcHBpZD0ke2l0ZW0uYXBwSWR9Jm5ic3Y9JHtkYXRhLnZlcnNpb259Jm5ic291cmNlPWRlYnVnJm5ic249VFJJQUwmX21wX2NvZGU9dGImX2NvbnRhaW5lcl90eXBlPWdtJnZjb25zb2xlPXRydWVgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnFyQ29kZVVybCA9IHVybDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBnZXRUYW9CYW9EZWJ1Z1VybCBzdXNjZXNzICR7dXJsfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCdlcnJvcicsICflpLHotKUnLCAn5aSN5Yi26ZO+5o6l5aSx6LSlIScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaXNBdXRvUGFjayA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ2Vycm9yJywgJ+Wksei0pScsICflpI3liLbpk77mjqXlpLHotKUhJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmlzU2V0VGJDbGlUb2tlbiA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGNsb3NlUXJDb2RlKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5xckNvZGVVcmwgPSAnJztcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgYXN5bmMgY29weUxpbmsobGluazogc3RyaW5nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobGluayAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCBuYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dChsaW5rKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCdpbmZvJywgJ+WujOaIkCcsIGDlpI3liLbpk77mjqXmiJDlip/vvIzlj6/nspjotLTkvb/nlKjvvIFgKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnZXJyb3InLCAn5aSx6LSlJywgYOWkjeWItumTvuaOpeWksei0pSEgJHtlcnJvcn1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGNoZWNrVXBsb2FkKGl0ZW06IFBhY2tQcm9qZWN0LCBpc0NoZWNrOiBib29sZWFuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbS5wcmV2aWV3KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS5wcmV2aWV3ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtLnVwbG9hZCA9IGlzQ2hlY2s7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGNoZWNrUHJldmlldyhpdGVtOiBQYWNrUHJvamVjdCwgaXNDaGVjazogYm9vbGVhbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW0udXBsb2FkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS51cGxvYWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0ucHJldmlldyA9IGlzQ2hlY2s7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHNhdmVDb25maWcoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXhpc3RzU3luYyhzYXZlUGF0aCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgc2F2ZURhdGE6IFNhdmVEYXRhID0gcmVhZEpTT05TeW5jKHNhdmVQYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2F2ZURhdGEgJiYgc2F2ZURhdGEuYXBpVmVyc2lvbnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2F2ZURhdGEuYXBpVmVyc2lvbnMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHNhdmVEYXRhU3RyID0gSlNPTi5zdHJpbmdpZnkoc2F2ZURhdGEsIG51bGwsIFwiXFx0XCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3cml0ZUZpbGVTeW5jKHNhdmVQYXRoLCBzYXZlRGF0YVN0ciwgJ3V0Zi04Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHNhdmVEYXRhOiBTYXZlRGF0YSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaW5nX3RhbGs6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGluZ1RhbGtXZWJIb29rOiAnJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGluZ1RhbGtDdXN0b21Db250ZW50X3BhY2s6ICcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaW5nVGFsa0N1c3RvbUNvbnRlbnRfdXBsb2FkOiAnJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFvYmFvX2NsaV90b2tlbjogW10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcXJDb2RlVXJsczogW10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBpVmVyc2lvbnM6IFtdXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHNhdmVEaW5nVGFsayA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHBhY2tzOiBQYWNrUHJvamVjdFtdID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudGFza0xpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhc2tMaXN0W2ldID0geyAuLi5UYXNrVGVtcCwgLi4udGhpcy50YXNrTGlzdFtpXSB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnRhc2tMaXN0W2ldLnRiX2NsaV90b2tlbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzYXZlRGF0YS50YW9iYW9fY2xpX3Rva2VuLnB1c2goeyBhcHBpZDogdGhpcy50YXNrTGlzdFtpXS5hcHBJZCwgbmFtZTogdGhpcy50YXNrTGlzdFtpXS5uYW1lLCB0b2tlbjogdGhpcy50YXNrTGlzdFtpXS50Yl9jbGlfdG9rZW4gfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudGFza0xpc3RbaV0uZGluZ1RhbGspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFzYXZlRGluZ1RhbGspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNhdmVEaW5nVGFsayA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzYXZlRGF0YS5kaW5nX3RhbGsgPSB7IC4uLnRoaXMudGFza0xpc3RbaV0uZGluZ1RhbGsgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnRhc2tMaXN0W2ldLnBsYXRmb3JtRmlsZXMgJiYgdGhpcy50YXNrTGlzdFtpXS5wbGF0Zm9ybUZpbGVzW3RoaXMudGFza0xpc3RbaV0uY2hhbm5lbF0gJiYgdGhpcy50YXNrTGlzdFtpXS5wbGF0Zm9ybUZpbGVzW3RoaXMudGFza0xpc3RbaV0uY2hhbm5lbF0uYXBpVmVyc2lvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzYXZlRGF0YS5hcGlWZXJzaW9ucy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwcGlkOiB0aGlzLnRhc2tMaXN0W2ldLmFwcElkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBpVmVyc2lvbjogdGhpcy50YXNrTGlzdFtpXS5wbGF0Zm9ybUZpbGVzW3RoaXMudGFza0xpc3RbaV0uY2hhbm5lbF0uYXBpVmVyc2lvblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMudGFza0xpc3RbaV0ucGxhdGZvcm1GaWxlc1t0aGlzLnRhc2tMaXN0W2ldLmNoYW5uZWxdLmFwaVZlcnNpb247XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBkaW5nVGFsaywgdGJfY2xpX3Rva2VuLCAuLi50IH0gPSB0aGlzLnRhc2tMaXN0W2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhY2tzLnB1c2godCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucXJDb2RlVXJsTWFwLmNsZWFyKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBkYXRhID0geyBwYWNrcyB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGRhdGFTdHIgPSBKU09OLnN0cmluZ2lmeShkYXRhLCBudWxsLCBcIlxcdFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdyaXRlRmlsZVN5bmMocGFja3NQYXRoLCBkYXRhU3RyLCAndXRmLTgnKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHNhdmVEYXRhU3RyID0gSlNPTi5zdHJpbmdpZnkoc2F2ZURhdGEsIG51bGwsIFwiXFx0XCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgd3JpdGVGaWxlU3luYyhzYXZlUGF0aCwgc2F2ZURhdGFTdHIsICd1dGYtOCcpO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBpbXBvcnRDbGlUb2tlbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNiID0gKGRhdGE6IFRhb0Jhb19DbGlfVG9rZW5bXSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnRhc2tMaXN0ICYmIHRoaXMudGFza0xpc3QubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRhc2tMaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHRhc2s6IFBhY2tQcm9qZWN0ID0gdGhpcy50YXNrTGlzdFtpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGFzay5jaGFubmVsID09PSAndGFvYmFvLW1pbmktZ2FtZScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBkYXRhLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YVtqXS5hcHBpZCA9PT0gdGFzay5hcHBJZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhc2sudGJfY2xpX3Rva2VuID0gZGF0YVtqXS50b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnaW5mbycsICdpbmZvJywgJ+WvvOWFpeaIkOWKn++8gScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zYXZlQ29uZmlnKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAnd2FybicsICfor7flhYjmt7vliqDoh6rliqjljJbpobnnm67phY3nva7vvIEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ3dhcm4nLCAn5a+85YWlY2xpIHRva2VuIOaVsOaNruWksei0pe+8gScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICBpbXBvcnRGdW5jKGNiKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgdGVtcGxhdGU6IHJlYWRGaWxlU3luYyhqb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uL3N0YXRpYy90ZW1wbGF0ZS92dWUvcHJvamVjdC5odG1sJyksICd1dGYtOCcpLFxuICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgYXBwLm1vdW50KHRoaXMuJC5hcHApO1xuICAgICAgICAgICAgcGFuZWxEYXRhTWFwLnNldCh0aGlzLCBhcHApO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBiZWZvcmVDbG9zZSgpIHtcbiAgICB9LFxuICAgIGNsb3NlKCkge1xuICAgICAgICBjb25zdCBhcHAgPSBwYW5lbERhdGFNYXAuZ2V0KHRoaXMpO1xuICAgICAgICBpZiAoYXBwKSB7XG4gICAgICAgICAgICBpZiAoZXhpc3RzU3luYyhzYXZlUGF0aCkpIHtcbiAgICAgICAgICAgICAgICBsZXQgc2F2ZURhdGE6IFNhdmVEYXRhID0gcmVhZEpTT05TeW5jKHNhdmVQYXRoKTtcbiAgICAgICAgICAgICAgICBpZiAoc2F2ZURhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgc2F2ZURhdGEucXJDb2RlVXJscyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2F2ZURhdGEuc3VjY2Vzc2VkUGFjaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHNhdmVEYXRhLnN1Y2Nlc3NlZFBhY2s7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHNhdmVEYXRhLmZhaWxlZFBhY2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBzYXZlRGF0YS5mYWlsZWRQYWNrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChzYXZlRGF0YS5zdWNjZXNzZWRVcGxvYWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBzYXZlRGF0YS5zdWNjZXNzZWRVcGxvYWQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHNhdmVEYXRhLmZhaWxlZFVwbG9hZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHNhdmVEYXRhLmZhaWxlZFVwbG9hZDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoc2F2ZURhdGEuc3VjY2Vzc2VkUHJldmlldykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHNhdmVEYXRhLnN1Y2Nlc3NlZFByZXZpZXc7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHNhdmVEYXRhLmZhaWxlZFByZXZpZXcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBzYXZlRGF0YS5mYWlsZWRQcmV2aWV3O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChzYXZlRGF0YS5hcGlWZXJzaW9ucykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHNhdmVEYXRhLmFwaVZlcnNpb25zO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGxldCBzYXZlRGF0YVN0ciA9IEpTT04uc3RyaW5naWZ5KHNhdmVEYXRhLCBudWxsLCBcIlxcdFwiKTtcbiAgICAgICAgICAgICAgICAgICAgd3JpdGVGaWxlU3luYyhzYXZlUGF0aCwgc2F2ZURhdGFTdHIsICd1dGYtOCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgYXBwLnVubW91bnQoKTtcbiAgICAgICAgfVxuICAgIH0sXG59KTsiXX0=