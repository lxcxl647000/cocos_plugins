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
const panelDataMap = new WeakMap();
const packsPath = (0, path_1.join)(__dirname, '../../../static/packconfigs/Packs.json');
const savePath = (0, path_1.join)(__dirname, '../../../static/packconfigs/save.json');
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
                        taskList: {},
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zb3VyY2UvcGFuZWxzL2RlZmF1bHQvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLCtDQUErQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFL0MsaURBQTRFO0FBQzVFLHVDQUFpRjtBQUNqRiw2Q0FBa0M7QUFDbEMsNkJBQXNEO0FBQ3RELDRDQUFvQjtBQUNwQiwwREFBa0M7QUFDbEMsMkNBQTZCO0FBQzdCLE1BQU0sWUFBWSxHQUFHLElBQUksT0FBTyxFQUFZLENBQUM7QUE2QjdDLE1BQU0sU0FBUyxHQUFHLElBQUEsV0FBSSxFQUFDLFNBQVMsRUFBRSx3Q0FBd0MsQ0FBQyxDQUFDO0FBQzVFLE1BQU0sUUFBUSxHQUFHLElBQUEsV0FBSSxFQUFDLFNBQVMsRUFBRSx1Q0FBdUMsQ0FBQyxDQUFDO0FBcUMxRSxNQUFNLFFBQVEsR0FBZ0I7SUFDMUIsS0FBSyxFQUFFLEVBQUU7SUFDVCxJQUFJLEVBQUUsRUFBRTtJQUNSLElBQUksRUFBRSxFQUFFO0lBQ1IsT0FBTyxFQUFFLGtCQUFrQjtJQUMzQixJQUFJLEVBQUUsS0FBSztJQUNYLE1BQU0sRUFBRSxLQUFLO0lBQ2IsWUFBWSxFQUFFLEtBQUs7SUFDbkIsYUFBYSxFQUFFO1FBQ1gsa0JBQWtCLEVBQUU7WUFDaEIsSUFBSSxFQUFFLEVBQUU7WUFDUixNQUFNLEVBQUUsS0FBSztTQUNoQjtLQUNKO0lBQ0QsY0FBYyxFQUFFLEtBQUs7SUFDckIsZUFBZSxFQUFFLEtBQUs7SUFDdEIsUUFBUSxFQUFFLEtBQUs7SUFDZixVQUFVLEVBQUUsS0FBSztJQUNqQixnQkFBZ0IsRUFBRSxFQUFFO0lBQ3BCLHlCQUF5QixFQUFFLE1BQU07SUFDakMsVUFBVSxFQUFFLEVBQUU7SUFDZCxTQUFTLEVBQUUsRUFBRTtJQUNiLHNCQUFzQixFQUFFLE9BQU87SUFDL0IsT0FBTyxF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YUFBYSxFQUFFLENBQUM7d0JBQ3pCLE9BQU8sUUFBUSxDQUFDLGFBQWEsQ0FBQztvQkFDbEMsQ0FBQztvQkFDRCxJQUFJLFFBQVEsQ0FBQyxXQUFXLEVBQUUsQ0FBQzt3QkFDdkIsT0FBTyxRQUFRLENBQUMsV0FBVyxDQUFDO29CQUNoQyxDQUFDO29CQUNELElBQUksV0FBVyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztvQkFDdkQsSUFBQSx3QkFBYSxFQUFDLFFBQVEsRUFBRSxXQUFXLEVBQUUsT0FBTyxDQUFDLENBQUM7Z0JBQ2xELENBQUM7WUFDTCxDQUFDO1lBRUQsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2xCLENBQUM7SUFDTCxDQUFDO0NBQ0osQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgdnVlL29uZS1jb21wb25lbnQtcGVyLWZpbGUgKi9cblxuaW1wb3J0IHsgQ2hpbGRQcm9jZXNzV2l0aG91dE51bGxTdHJlYW1zLCBzcGF3biwgZXhlYyB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0IHsgZXhpc3RzU3luYywgcmVhZEZpbGVTeW5jLCByZWFkSlNPTlN5bmMsIHdyaXRlRmlsZVN5bmMgfSBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgcGF0aCwgeyBqb2luIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBjcmVhdGVBcHAsIEFwcCwgZGVmaW5lQ29tcG9uZW50IH0gZnJvbSAndnVlJztcbmltcG9ydCBvcyBmcm9tICdvcyc7XG5pbXBvcnQgQ2ZnVXRpbHMgZnJvbSAnLi9DZmdVdGlscyc7XG5pbXBvcnQgKiBhcyBYTFNYIGZyb20gJ3hsc3gnO1xuY29uc3QgcGFuZWxEYXRhTWFwID0gbmV3IFdlYWtNYXA8YW55LCBBcHA+KCk7XG4vKipcbiAqIEB6aCDlpoLmnpzluIzmnJvlhbzlrrkgMy4zIOS5i+WJjeeahOeJiOacrOWPr+S7peS9v+eUqOS4i+aWueeahOS7o+eggVxuICogQGVuIFlvdSBjYW4gYWRkIHRoZSBjb2RlIGJlbG93IGlmIHlvdSB3YW50IGNvbXBhdGliaWxpdHkgd2l0aCB2ZXJzaW9ucyBwcmlvciB0byAzLjNcbiAqL1xuLy8gRWRpdG9yLlBhbmVsLmRlZmluZSA9IEVkaXRvci5QYW5lbC5kZWZpbmUgfHwgZnVuY3Rpb24ob3B0aW9uczogYW55KSB7IHJldHVybiBvcHRpb25zIH1cblxuaW50ZXJmYWNlIFBhY2tQcm9qZWN0IHtcbiAgICBhcHBJZDogc3RyaW5nLFxuICAgIG5hbWU6IHN0cmluZyxcbiAgICBwYXRoOiBzdHJpbmcsLy8gQ29jb3Ppobnnm67moLnnm67lvZVcbiAgICBjaGFubmVsOiBzdHJpbmcsLy8g5oyH5a6a5omT5YyF5a+55bqU5rig6YGT5ZCN56ewXG4gICAgc2tpcDogYm9vbGVhbiwvLyDmmK/lkKbot7Pov4djb2Nvc+aehOW7uuW3peeoi++8jOebtOaOpeS9v+eUqOWvvOWHuuW3peeoi1xuICAgIHVwbG9hZDogYm9vbGVhbiwvLyDmmK/lkKbpnIDopoHkuIrkvKAg5LiOcHJldmlld+S6kuaWpVxuICAgIG5lZWRBdXRvUGFjazogYm9vbGVhbiwvLyDmmK/lkKbpnIDopoHov5vooYzoh6rliqjmnoTlu7rkuIrkvKBcbiAgICBwbGF0Zm9ybUZpbGVzOiB7IFtrZXk6IHN0cmluZ106IHsgcGF0aDogc3RyaW5nLCBpc1Rlc3Q6IGJvb2xlYW4sIGFwaVZlcnNpb24/OiBzdHJpbmcgfSB9LC8vIGtleeW5s+WPsOWQjeensOS4jmNoYW5uZWzlr7nlupTvvIx2YWx1Zea4uOaIj+W3peeoi+S4reW5s+WPsOeahOmFjee9ruaWh+S7tlxuICAgIHBvc3RUb0RpbmdUYWxrOiBib29sZWFuLC8vIOaYr+WQpuaOqOmAgemSiemSiWNvY29z5p6E5bu657uT5p6cXG4gICAgcG9zdFRvRGluZ1RhbGsyOiBib29sZWFuLC8vIOaYr+WQpuaOqOmAgemSiemSiWNsaeS4iuS8oOaIlumihOiniOe7k+aenFxuICAgIG1kNUNhY2hlOiBib29sZWFuLFxuICAgIHNvdXJjZU1hcHM6IGJvb2xlYW4sXG4gICAgY3VzdG9tQ29uZmlnUGF0aDogc3RyaW5nLC8v6Ieq5a6a5LmJ5p6E5bu65qih5p2/anNvbui3r+W+hFxuICAgIG1haW5CdW5kbGVDb21wcmVzc2lvblR5cGU6IHN0cmluZywvL+S4u+WMheWOi+e8qeexu+WeiyAg5peg5Y6L57yp77yaIFwibm9uZVwiICDlkIjlubbkvp3otZbvvJogXCJtZXJnZV9kZXBcIiAg5ZCI5bm25omA5pyJSlNPTu+8miBcIm1lcmdlX2FsbF9qc29uXCIgIFpJUO+8miBcInppcFwiICDlsI/muLjmiI/liIbljIXvvJogXCJzdWJwYWNrYWdlXCJcbiAgICBlbmdpbmVQYXRoOiBzdHJpbmcsLy8gY29jb3PlvJXmk47ot6/lvoRcbiAgICBlbmdpbmVWZXI6IHN0cmluZywvLyBjb2Nvc+W8leaTjueJiOacrFxuICAgIG5hdmlnYXRpb25CYXJUZXh0U3R5bGU6IHN0cmluZywvLyDlr7zoiKrmoI/moIfpopjpopzoibJcbiAgICBwcmV2aWV3OiBib29sZWFuLC8vIOaYr+WQpumihOiniCDkuI51cGxvYWTkupLmlqVcbiAgICB0Yl9jbGlfdG9rZW4/OiBzdHJpbmcsLy8gdGFvYmFvIGNsaSB0b2tlblxuICAgIGRpbmdUYWxrPzogRGluZ1RhbGssLy8g6ZKJ6ZKJ5py65Zmo5Lq66YWN572uXG59XG5jb25zdCBwYWNrc1BhdGggPSBqb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uL3N0YXRpYy9wYWNrY29uZmlncy9QYWNrcy5qc29uJyk7XG5jb25zdCBzYXZlUGF0aCA9IGpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vc3RhdGljL3BhY2tjb25maWdzL3NhdmUuanNvbicpO1xuXG5pbnRlcmZhY2UgVGFvQmFvX0NsaV9Ub2tlbiB7XG4gICAgYXBwaWQ6IHN0cmluZyxcbiAgICBuYW1lOiBzdHJpbmcsXG4gICAgdG9rZW46IHN0cmluZ1xufVxuXG5pbnRlcmZhY2UgRGluZ1RhbGsge1xuICAgIGRpbmdUYWxrV2ViSG9vazogc3RyaW5nLFxuICAgIGRpbmdUYWxrQ3VzdG9tQ29udGVudF9wYWNrOiBzdHJpbmcsXG4gICAgZGluZ1RhbGtDdXN0b21Db250ZW50X3VwbG9hZDogc3RyaW5nXG59XG5cbmludGVyZmFjZSBRUkNvZGUge1xuICAgIGFwcGlkOiBzdHJpbmcsXG4gICAgdXJsOiBzdHJpbmdcbn1cblxuaW50ZXJmYWNlIEFwaVZlcnNpb24ge1xuICAgIGFwcGlkOiBzdHJpbmcsXG4gICAgYXBpVmVyc2lvbjogc3RyaW5nXG59XG5cbmludGVyZmFjZSBTYXZlRGF0YSB7XG4gICAgZGluZ190YWxrOiBEaW5nVGFsayxcbiAgICB0YW9iYW9fY2xpX3Rva2VuOiBUYW9CYW9fQ2xpX1Rva2VuW10sXG4gICAgcXJDb2RlVXJsczogUVJDb2RlW10sXG4gICAgc3VjY2Vzc2VkUGFjaz86IHN0cmluZ1tdLFxuICAgIGZhaWxlZFBhY2s/OiBzdHJpbmdbXSxcbiAgICBzdWNjZXNzZWRVcGxvYWQ/OiBzdHJpbmdbXSxcbiAgICBmYWlsZWRVcGxvYWQ/OiBzdHJpbmdbXSxcbiAgICBzdWNjZXNzZWRQcmV2aWV3Pzogc3RyaW5nW10sXG4gICAgZmFpbGVkUHJldmlldz86IHN0cmluZ1tdLFxuICAgIGFwaVZlcnNpb25zPzogQXBpVmVyc2lvbltdXG59XG5cbmNvbnN0IFRhc2tUZW1wOiBQYWNrUHJvamVjdCA9IHtcbiAgICBhcHBJZDogJycsXG4gICAgbmFtZTogJycsXG4gICAgcGF0aDogJycsXG4gICAgY2hhbm5lbDogJ3Rhb2Jhby1taW5pLWdhbWUnLFxuICAgIHNraXA6IGZhbHNlLFxuICAgIHVwbG9hZDogZmFsc2UsXG4gICAgbmVlZEF1dG9QYWNrOiBmYWxzZSxcbiAgICBwbGF0Zm9ybUZpbGVzOiB7XG4gICAgICAgICd0YW9iYW8tbWluaS1nYW1lJzoge1xuICAgICAgICAgICAgcGF0aDogJycsXG4gICAgICAgICAgICBpc1Rlc3Q6IGZhbHNlXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHBvc3RUb0RpbmdUYWxrOiBmYWxzZSxcbiAgICBwb3N0VG9EaW5nVGFsazI6IGZhbHNlLFxuICAgIG1kNUNhY2hlOiBmYWxzZSxcbiAgICBzb3VyY2VNYXBzOiBmYWxzZSxcbiAgICBjdXN0b21Db25maWdQYXRoOiAnJyxcbiAgICBtYWluQnVuZGxlQ29tcHJlc3Npb25UeXBlOiAnbm9uZScsXG4gICAgZW5naW5lUGF0aDogJycsXG4gICAgZW5naW5lVmVyOiAnJyxcbiAgICBuYXZpZ2F0aW9uQmFyVGV4dFN0eWxlOiAnYmxhY2snLFxuICAgIHByZXZpZXc6IGZhbHNlLFxufTtcblxuY29uc3Qgc3Bhd25fdGIgPSAoYXJnczogc3RyaW5nW10sIHN1Y2Nlc3M6IEZ1bmN0aW9uLCBmYWlsOiBGdW5jdGlvbikgPT4ge1xuICAgIGxldCBzcDogQ2hpbGRQcm9jZXNzV2l0aG91dE51bGxTdHJlYW1zID0gc3Bhd24oXCJ0YmdhbWVcIiwgYXJncywgeyBzaGVsbDogdHJ1ZSB9KTtcbiAgICBzcC5zdGRvdXQuc2V0RW5jb2RpbmcoJ3V0ZjgnKTtcbiAgICBsZXQgY29tbW9uZFN0ciA9IHNwLnNwYXduYXJnc1s0XS5yZXBsYWNlKC9cIi9nLCAnJyk7XG4gICAgbGV0IGNsaVRva2VuRmFpbGVkID0gZmFsc2U7XG4gICAgbGV0IHZlcnNpb24gPSAnJztcbiAgICBsZXQgcHJldmlld1VybCA9ICcnO1xuICAgIGxldCBuZXh0RGF0YUlzUXJDb2RlID0gZmFsc2U7XG5cbiAgICBzcC5zdGRvdXQub24oJ2RhdGEnLCAoZGF0YSkgPT4ge1xuICAgICAgICBpZiAobmV4dERhdGFJc1FyQ29kZSkge1xuICAgICAgICAgICAgbmV4dERhdGFJc1FyQ29kZSA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coYHNwYXduX3RiOiAke2NvbW1vbmRTdHJ9IHN0ZG91dCAke2RhdGEudG9TdHJpbmcoKX1gKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF0YS5pbmRleE9mKCfmnIDmlrDnur/kuIrniYjmnKw6JykgPiAtMSkge1xuICAgICAgICAgICAgbGV0IHN0cjogc3RyaW5nID0gZGF0YS50cmltKCk7XG4gICAgICAgICAgICBsZXQgYXJyID0gc3RyLnNwbGl0KCfmnIDmlrDnur/kuIrniYjmnKw6Jyk7XG4gICAgICAgICAgICB2ZXJzaW9uID0gYXJyWzFdLnRyaW0oKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF0YS5pbmRleE9mKCfpooTop4jkuoznu7TnoIHlnLDlnYDvvJonKSA+IC0xKSB7XG4gICAgICAgICAgICBsZXQgc3RyOiBzdHJpbmcgPSBkYXRhLnRyaW0oKTtcbiAgICAgICAgICAgIGxldCBhcnIgPSBzdHIuc3BsaXQoJ+mihOiniOS6jOe7tOeggeWcsOWdgO+8micpO1xuICAgICAgICAgICAgcHJldmlld1VybCA9IGFyclsxXS50cmltKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhdGEuaW5kZXhPZign5bey5aSN5Yi26aKE6KeI56CB5Yiw5Ymq6LS05p2/JykgPiAtMSkge1xuICAgICAgICAgICAgbmV4dERhdGFJc1FyQ29kZSA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICBzcC5zdGRlcnIub24oJ2RhdGEnLCAoZGF0YSkgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZyhgc3Bhd25fdGI6ICR7Y29tbW9uZFN0cn0gc3RkZXJyICR7ZGF0YS50b1N0cmluZygpfWApO1xuICAgICAgICBpZiAoZGF0YS5pbmRleE9mKCdDTEkgYXV0aCBmYWlsZWQnKSA+IC0xKSB7XG4gICAgICAgICAgICBjbGlUb2tlbkZhaWxlZCA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICBzcC5vbignZXhpdCcsIGFzeW5jIChjb2RlLCBkYXRhKSA9PiB7XG4gICAgICAgIGlmIChjb2RlID09PSAwKSB7XG4gICAgICAgICAgICBpZiAoY2xpVG9rZW5GYWlsZWQpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgc3Bhd25fdGI6ICR7Y29tbW9uZFN0cn0gZmFpbGVkIOiuvue9ruiwg+eUqOWHreivgVRva2Vu6ZSZ6K+vYCk7XG4gICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ3dhcm4nLCAn6K6+572u6LCD55So5Yet6K+BVG9rZW7plJnor68hJyk7XG4gICAgICAgICAgICAgICAgZmFpbCAmJiBmYWlsKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgc3Bhd25fdGI6ICR7Y29tbW9uZFN0cn0gc3VjY2Vzc2ApO1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3MgJiYgc3VjY2Vzcyh7IHZlcnNpb24sIHByZXZpZXdVcmwgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgc3Bhd25fdGI6ICR7Y29tbW9uZFN0cn0gZmFpbGVkYCk7XG4gICAgICAgICAgICBmYWlsICYmIGZhaWwoKTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxuZXhwb3J0IGNvbnN0IG9wZW5EaWxvZyA9IGFzeW5jICh0eXBlOiBzdHJpbmcsIHRpdGxlOiBzdHJpbmcsIG1lc3NhZ2U6IHN0cmluZywgYnRuTWFwPzogTWFwPHN0cmluZywgRnVuY3Rpb24+LCBjYW5jZWw/OiBudW1iZXIpID0+IHtcbiAgICBsZXQgb3B0aW9uOiBFZGl0b3IuRGlhbG9nLk1lc3NhZ2VEaWFsb2dPcHRpb25zID0ge1xuICAgICAgICB0aXRsZVxuICAgIH07XG4gICAgaWYgKGJ0bk1hcCkge1xuICAgICAgICBvcHRpb24uYnV0dG9ucyA9IFtdO1xuICAgICAgICBidG5NYXAuZm9yRWFjaCgodmFsdWUsIGtleSkgPT4ge1xuICAgICAgICAgICAgb3B0aW9uLmJ1dHRvbnMucHVzaChrZXkpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgaWYgKGNhbmNlbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIG9wdGlvbi5jYW5jZWwgPSBjYW5jZWw7XG4gICAgfVxuICAgIGxldCBjb2RlOiB7IHJlc3BvbnNlOiAwLCBjaGVja2JveENoZWNrZWQ6IGZhbHNlIH0gPSBhd2FpdCBFZGl0b3IuRGlhbG9nW3R5cGVdKG1lc3NhZ2UsIG9wdGlvbik7XG4gICAgaWYgKGJ0bk1hcCkge1xuICAgICAgICBsZXQga2V5ID0gb3B0aW9uLmJ1dHRvbnNbY29kZS5yZXNwb25zZV07XG4gICAgICAgIGlmIChidG5NYXAuaGFzKGtleSkpIHtcbiAgICAgICAgICAgIGxldCBmdW5jID0gYnRuTWFwLmdldChrZXkpO1xuICAgICAgICAgICAgaWYgKGZ1bmMpIHtcbiAgICAgICAgICAgICAgICBmdW5jKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmNvbnN0IGltcG9ydEZ1bmMgPSAoY2I6IEZ1bmN0aW9uKSA9PiB7XG4gICAgLy8gMS4g5Yqo5oCB5Yib5bu65LiA5Liq6ZqQ6JeP55qEIGlucHV0IOagh+etvlxuICAgIGNvbnN0IGlucHV0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW5wdXQnKTtcbiAgICBpbnB1dC50eXBlID0gJ2ZpbGUnO1xuICAgIC8vIOmZkOWItuWPquiDvemAieaLqSBqc29uIOaWh+S7tu+8jOWmguaenOWvvOWFpSBFeGNlbCDlj6/ku6XmlLnkuLogJy54bHN4LCAueGxzJ1xuICAgIGlucHV0LmFjY2VwdCA9ICcuanNvbiwueGxzeCwueGxzJztcbiAgICBpbnB1dC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuXG4gICAgLy8gMi4g55uR5ZCs5paH5Lu26YCJ5oup55qE5Y+Y5YyWXG4gICAgaW5wdXQub25jaGFuZ2UgPSAoZSkgPT4ge1xuICAgICAgICBjb25zdCBmaWxlID0gKGUudGFyZ2V0IGFzIEhUTUxJbnB1dEVsZW1lbnQpLmZpbGVzPy5bMF07XG4gICAgICAgIGlmICghZmlsZSkgcmV0dXJuO1xuXG4gICAgICAgIC8vIOiOt+WPluaWh+S7tuWQjue8gOWQje+8jOWIpOaWreaWh+S7tuexu+Wei1xuICAgICAgICBjb25zdCBmaWxlTmFtZSA9IGZpbGUubmFtZTtcbiAgICAgICAgY29uc3QgZmlsZUV4dCA9IGZpbGVOYW1lLnNsaWNlKGZpbGVOYW1lLmxhc3RJbmRleE9mKCcuJykpLnRvTG93ZXJDYXNlKCk7XG5cbiAgICAgICAgLy8gMy4g5L2/55SoIEZpbGVSZWFkZXIg6K+75Y+W5paH5Lu25YaF5a65XG4gICAgICAgIGNvbnN0IHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG4gICAgICAgIHJlYWRlci5vbmxvYWQgPSAoZXZlbnQpID0+IHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgbGV0IGltcG9ydGVkRGF0YSA9IG51bGw7XG4gICAgICAgICAgICAgICAgaWYgKGZpbGVFeHQgPT09ICcuanNvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8g6I635Y+W5paH5Lu26YeM55qE5paH5pys5YaF5a655bm26Kej5p6Q5Li6IEpTT05cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gZXZlbnQudGFyZ2V0Py5yZXN1bHQgYXMgc3RyaW5nO1xuICAgICAgICAgICAgICAgICAgICBpbXBvcnRlZERhdGEgPSBKU09OLnBhcnNlKHJlc3VsdCk7XG5cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGZpbGVFeHQgPT09ICcueGxzeCcgfHwgZmlsZUV4dCA9PT0gJy54bHMnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEV4Y2VsIOaWh+S7tu+8muS7peS6jOi/m+WItuW9ouW8j+ivu+WPluW5tuino+aekFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRhID0gbmV3IFVpbnQ4QXJyYXkoZXZlbnQudGFyZ2V0Py5yZXN1bHQgYXMgQXJyYXlCdWZmZXIpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB3b3JrYm9vayA9IFhMU1gucmVhZChkYXRhLCB7IHR5cGU6ICdhcnJheScgfSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpcnN0U2hlZXROYW1lID0gd29ya2Jvb2suU2hlZXROYW1lc1swXTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgd29ya3NoZWV0ID0gd29ya2Jvb2suU2hlZXRzW2ZpcnN0U2hlZXROYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2hlZXREYXRhID0gWExTWC51dGlscy5zaGVldF90b19qc29uKHdvcmtzaGVldCwgeyBoZWFkZXI6IDEgfSk7XG4gICAgICAgICAgICAgICAgICAgIGltcG9ydGVkRGF0YSA9IENmZ1V0aWxzLmdldEpzb25EYXRhKHNoZWV0RGF0YSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNiICYmIGNiKGltcG9ydGVkRGF0YSk7XG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xuICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnZXJyb3InLCAn6ZSZ6K+vJywgJ+aWh+S7tuino+aekOWksei0pe+8jOivt+ajgOafpeaWh+S7tuagvOW8j++8gScpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyA1LiDmuIXnkIbvvJrlsIbkuLTml7bliJvlu7rnmoQgaW5wdXQg5qCH562+5LuO6aG16Z2i5Lit56e76ZmkXG4gICAgICAgICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKGlucHV0KTtcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKGZpbGVFeHQgPT09ICcuanNvbicpIHtcbiAgICAgICAgICAgIHJlYWRlci5yZWFkQXNUZXh0KGZpbGUpOyAvLyBKU09OIOS7peaWh+acrOW9ouW8j+ivu+WPllxuICAgICAgICB9IGVsc2UgaWYgKGZpbGVFeHQgPT09ICcueGxzeCcgfHwgZmlsZUV4dCA9PT0gJy54bHMnKSB7XG4gICAgICAgICAgICByZWFkZXIucmVhZEFzQXJyYXlCdWZmZXIoZmlsZSk7IC8vIEV4Y2VsIOS7peS6jOi/m+WItuW9ouW8j+ivu+WPllxuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8vIDYuIOWwhiBpbnB1dCDmjILovb3liLDpobXpnaLlubbop6blj5Hngrnlh7vvvIzlvLnlh7rmlofku7bpgInmi6nmoYZcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGlucHV0KTtcbiAgICBpbnB1dC5jbGljaygpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBFZGl0b3IuUGFuZWwuZGVmaW5lKHtcbiAgICBsaXN0ZW5lcnM6IHtcbiAgICAgICAgc2hvdygpIHsgY29uc29sZS5sb2coJ3Nob3cnKTsgfSxcbiAgICAgICAgaGlkZSgpIHsgY29uc29sZS5sb2coJ2hpZGUnKTsgfSxcbiAgICB9LFxuICAgIHRlbXBsYXRlOiByZWFkRmlsZVN5bmMoam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi9zdGF0aWMvdGVtcGxhdGUvZGVmYXVsdC9pbmRleC5odG1sJyksICd1dGYtOCcpLFxuICAgIHN0eWxlOiByZWFkRmlsZVN5bmMoam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi9zdGF0aWMvc3R5bGUvZGVmYXVsdC9pbmRleC5jc3MnKSwgJ3V0Zi04JyksXG4gICAgJDoge1xuICAgICAgICBhcHA6ICcjYXBwJyxcbiAgICB9LFxuICAgIG1ldGhvZHM6IHtcblxuICAgIH0sXG4gICAgcmVhZHkoKSB7XG4gICAgICAgIGlmICh0aGlzLiQuYXBwKSB7XG4gICAgICAgICAgICBjb25zdCBhcHAgPSBjcmVhdGVBcHAoe30pO1xuICAgICAgICAgICAgYXBwLmNvbmZpZy5jb21waWxlck9wdGlvbnMuaXNDdXN0b21FbGVtZW50ID0gKHRhZykgPT4gdGFnLnN0YXJ0c1dpdGgoJ3VpLScpO1xuXG4gICAgICAgICAgICBhcHAuY29tcG9uZW50KCdNeVByb2plY3QnLCBkZWZpbmVDb21wb25lbnQoe1xuICAgICAgICAgICAgICAgIGRhdGEoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0YXNrTGlzdDoge30gYXMgUGFja1Byb2plY3RbXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzQXV0b1BhY2s6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgcXJDb2RlVXJsOiAnJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzU2V0VGJDbGlUb2tlbjogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBkaW5nVGFsazogeyBkaW5nVGFsa1dlYkhvb2s6ICcnLCBkaW5nVGFsa0N1c3RvbUNvbnRlbnRfcGFjazogJycsIGRpbmdUYWxrQ3VzdG9tQ29udGVudF91cGxvYWQ6ICcnIH0gYXMgRGluZ1RhbGssXG4gICAgICAgICAgICAgICAgICAgICAgICBxckNvZGVVcmxNYXA6IG5ldyBNYXA8c3RyaW5nLCBRUkNvZGU+KClcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG1vdW50ZWQoKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaW5pdFNhdmVEYXRhKCk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBtZXRob2RzOiB7XG4gICAgICAgICAgICAgICAgICAgIGluaXRTYXZlRGF0YSgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGFza0xpc3QgPSBleGlzdHNTeW5jKHBhY2tzUGF0aCkgPyBKU09OLnBhcnNlKHJlYWRGaWxlU3luYyhwYWNrc1BhdGgsICd1dGYtOCcpKS5wYWNrcyA6IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHRhb2Jhb0NsaVRva2VuTWFwOiBNYXA8c3RyaW5nLCBUYW9CYW9fQ2xpX1Rva2VuPiA9IG5ldyBNYXA8c3RyaW5nLCBUYW9CYW9fQ2xpX1Rva2VuPigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGV4aXN0c1N5bmMoc2F2ZVBhdGgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGRhdGE6IFNhdmVEYXRhID0gcmVhZEpTT05TeW5jKHNhdmVQYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS5kaW5nX3RhbGspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZGluZ1RhbGsgPSBkYXRhLmRpbmdfdGFsaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS50YW9iYW9fY2xpX3Rva2VuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGRhdGEudGFvYmFvX2NsaV90b2tlbi5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhb2Jhb0NsaVRva2VuTWFwLnNldChkYXRhLnRhb2Jhb19jbGlfdG9rZW5baV0uYXBwaWQsIGRhdGEudGFvYmFvX2NsaV90b2tlbltpXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnRhc2tMaXN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRhc2tMaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0YW9iYW9DbGlUb2tlbk1hcC5oYXModGhpcy50YXNrTGlzdFtpXS5hcHBJZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGFza0xpc3RbaV0udGJfY2xpX3Rva2VuID0gdGFvYmFvQ2xpVG9rZW5NYXAuZ2V0KHRoaXMudGFza0xpc3RbaV0uYXBwSWQpLnRva2VuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGFza0xpc3RbaV0uZGluZ1RhbGsgPSB0aGlzLmRpbmdUYWxrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgc3RhcnRBdXRvUGFjaygpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCB0ZXN0U2VydmVyV2FybnM6IHN0cmluZyA9ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLnRhc2tMaXN0IHx8IHRoaXMudGFza0xpc3QubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGJ0bk1hcCA9IG5ldyBNYXA8c3RyaW5nLCBGdW5jdGlvbj4oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBidG5NYXAuc2V0KCdhZGQnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkUHJvamVjdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ0bk1hcC5zZXQoJ2NhbmNlbCcsIG51bGwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnd2FybicsICd3YXJuJywgJ+ivt+WFiOa3u+WKoOiHquWKqOWMlumhueebrumFjee9ru+8gScsIGJ0bk1hcCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuZ2V0QXV0b0NvdW50KCkgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAnd2FybicsICfml6Doh6rliqjljJbpobnnm64hJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRhc2tMaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YXNrTGlzdFtpXSA9IHsgLi4uVGFza1RlbXAsIC4uLnRoaXMudGFza0xpc3RbaV0gfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgdGFzazogUGFja1Byb2plY3QgPSB0aGlzLnRhc2tMaXN0W2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0YXNrLm5lZWRBdXRvUGFjayA9PT0gZmFsc2UpIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGFzay5hcHBJZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAnd2FybicsICfoh6rliqjljJbpobnnm67kuK3mnKrphY3nva5hcHBJZO+8jOivt+ajgOafpemFjee9ru+8gScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGFzay5wYXRoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnd2FybicsICd3YXJuJywgJ+iHquWKqOWMlumhueebruS4reacqumFjee9rumhueebrui3r+W+hO+8jOivt+ajgOafpemFjee9ru+8gScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGFzay5jaGFubmVsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnd2FybicsICd3YXJuJywgJ+iHquWKqOWMlumhueebruS4reacqumFjee9rua4oOmBk+W5s+WPsO+8jOivt+ajgOafpemFjee9ru+8gScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGFzay5lbmdpbmVQYXRoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnd2FybicsICd3YXJuJywgJ+iHquWKqOWMlumhueebruS4reacqumFjee9ruW8leaTjui3r+W+hO+8jOivt+ajgOafpemFjee9ru+8gScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGFzay5lbmdpbmVWZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ3dhcm4nLCAn6Ieq5Yqo5YyW6aG555uu5Lit5pyq6YWN572u5byV5pOO54mI5pys77yM6K+35qOA5p+l6YWN572u77yBJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRhc2suY2hhbm5lbCA9PT0gJ3Rhb2Jhby1taW5pLWdhbWUnICYmICh0YXNrLnVwbG9hZCB8fCB0YXNrLnByZXZpZXcpICYmICF0YXNrLnRiX2NsaV90b2tlbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAnd2FybicsICfor7fmraPnoa7loavlhpnmt5jlrp3lsI/muLjmiI9DTEkgVG9rZW7vvIEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICgodGFzay5wb3N0VG9EaW5nVGFsayB8fCB0YXNrLnBvc3RUb0RpbmdUYWxrMikgJiYgKCF0YXNrLmRpbmdUYWxrIHx8ICF0YXNrLmRpbmdUYWxrLmRpbmdUYWxrV2ViSG9vaykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ3dhcm4nLCAn5Yu+6YCJ5LqG6ZKJ6ZKJ5o6o6YCB77yM6K+35q2j56Gu5aGr5YaZ6ZKJ6ZKJV2ViSG9va++8gScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHBsYXRmb3JtRmlsZXBhdGggPSB0aGlzLmdldFBsYXRmb3JtRmlsZSh0YXNrKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocGxhdGZvcm1GaWxlcGF0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBub3JtYWxpemVkUGF0aCA9IHBhdGgubm9ybWFsaXplKHRhc2sucGF0aCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwbGF0Zm9ybUZpbGVwYXRoLmluZGV4T2Yobm9ybWFsaXplZFBhdGgpIDwgMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ3dhcm4nLCBgYXBwSWQ6JHt0YXNrLmFwcElkfSR7dGFzay5uYW1lfSwke3Rhc2suY2hhbm5lbH3phY3nva7kuI3lnKjpobnnm67ot6/lvoTkuK0s6K+35qOA5p+l6YWN572u77yBYCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGlzVGVzdCA9IHRoaXMuZ2V0UGxhdGZvcm1GaWxlU2VydmVyKHRhc2spO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNUZXN0ICYmIHRhc2sudXBsb2FkICYmICF0YXNrLnNraXApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlc3RTZXJ2ZXJXYXJucyArPSBg5rOo5oSP77yB77yBJHt0YXNrLmFwcElkfe+8miR7dGFzay5uYW1lfe+8jOS9v+eUqOeahOa1i+ivleacje+8ge+8gVxcbmBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmlzQXV0b1BhY2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAnd2FybicsICfmraPlnKjoh6rliqjljJbvvIzor7fnqI3lkI7lho3or5UhJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhdXRvUGFjayA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ2luZm8nLCAnc3RhcnQnLCAn5byA5aeL6Ieq5Yqo5YyWJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pc0F1dG9QYWNrID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNhdmVDb25maWcoKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwYXRoID0gam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi9zdGF0aWMvYXV0by1wYWNrL2J1aWxkL2FwcC5qcycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhcmdzID0gW3BhdGhdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBzcDogQ2hpbGRQcm9jZXNzV2l0aG91dE51bGxTdHJlYW1zID0gc3Bhd24oXCJub2RlXCIsIGFyZ3MsIHsgc2hlbGw6IHRydWUgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3Auc3Rkb3V0LnNldEVuY29kaW5nKCd1dGY4Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3Auc3Rkb3V0Lm9uKCdkYXRhJywgKGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYGF1dG9QYWNrIHN0ZG91dCAke2RhdGEudG9TdHJpbmcoKX1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzcC5zdGRlcnIub24oJ2RhdGEnLCAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgYXV0b1BhY2sgc3RkZXJyICR7ZGF0YS50b1N0cmluZygpfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3Aub24oJ2V4aXQnLCAoY29kZSwgZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29kZSA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYGF1dG9QYWNrIGV4aXQgc3VzY2VzcyAke2RhdGF9YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbXNnID0gJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXhpc3RzU3luYyhzYXZlUGF0aCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgc2F2ZURhdGE6IFNhdmVEYXRhID0gSlNPTi5wYXJzZShyZWFkRmlsZVN5bmMoc2F2ZVBhdGgsICd1dGYtOCcpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDmo4DmtYvmmK/lkKbmnInpooTop4jnoIHnlJ/miJBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnFyQ29kZVVybE1hcC5jbGVhcigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzYXZlRGF0YS5xckNvZGVVcmxzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2F2ZURhdGEucXJDb2RlVXJscy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5xckNvZGVVcmxNYXAuc2V0KHNhdmVEYXRhLnFyQ29kZVVybHNbaV0uYXBwaWQsIHNhdmVEYXRhLnFyQ29kZVVybHNbaV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOiHquWKqOWMlue7k+aenFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzYXZlRGF0YS5zdWNjZXNzZWRQYWNrICYmIHNhdmVEYXRhLnN1Y2Nlc3NlZFBhY2subGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtc2cgKz0gJ+aehOW7uuaIkOWKn++8mic7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2F2ZURhdGEuc3VjY2Vzc2VkUGFjay5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXNnICs9IGAke3NhdmVEYXRhLnN1Y2Nlc3NlZFBhY2tbaV19JHtpID09PSBzYXZlRGF0YS5zdWNjZXNzZWRQYWNrLmxlbmd0aCAtIDEgPyAnXFxuJyA6ICcgJ31gO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzYXZlRGF0YS5mYWlsZWRQYWNrICYmIHNhdmVEYXRhLmZhaWxlZFBhY2subGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtc2cgKz0gJ+aehOW7uuWksei0pe+8mic7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2F2ZURhdGEuZmFpbGVkUGFjay5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXNnICs9IGAke3NhdmVEYXRhLmZhaWxlZFBhY2tbaV19JHtpID09PSBzYXZlRGF0YS5mYWlsZWRQYWNrLmxlbmd0aCAtIDEgPyAnXFxuJyA6ICcgJ31gO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzYXZlRGF0YS5zdWNjZXNzZWRVcGxvYWQgJiYgc2F2ZURhdGEuc3VjY2Vzc2VkVXBsb2FkLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXNnICs9ICfkuIrkvKDmiJDlip/vvJonO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNhdmVEYXRhLnN1Y2Nlc3NlZFVwbG9hZC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXNnICs9IGAke3NhdmVEYXRhLnN1Y2Nlc3NlZFVwbG9hZFtpXX0ke2kgPT09IHNhdmVEYXRhLnN1Y2Nlc3NlZFVwbG9hZC5sZW5ndGggLSAxID8gJ1xcbicgOiAnICd9YDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2F2ZURhdGEuZmFpbGVkVXBsb2FkICYmIHNhdmVEYXRhLmZhaWxlZFVwbG9hZC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zZyArPSAn5LiK5Lyg5aSx6LSl77yaJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzYXZlRGF0YS5mYWlsZWRVcGxvYWQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zZyArPSBgJHtzYXZlRGF0YS5mYWlsZWRVcGxvYWRbaV19JHtpID09PSBzYXZlRGF0YS5mYWlsZWRVcGxvYWQubGVuZ3RoIC0gMSA/ICdcXG4nIDogJyAnfWA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNhdmVEYXRhLnN1Y2Nlc3NlZFByZXZpZXcgJiYgc2F2ZURhdGEuc3VjY2Vzc2VkUHJldmlldy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zZyArPSAn6aKE6KeI5oiQ5Yqf77yaJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzYXZlRGF0YS5zdWNjZXNzZWRQcmV2aWV3Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtc2cgKz0gYCR7c2F2ZURhdGEuc3VjY2Vzc2VkUHJldmlld1tpXX0ke2kgPT09IHNhdmVEYXRhLnN1Y2Nlc3NlZFByZXZpZXcubGVuZ3RoIC0gMSA/ICdcXG4nIDogJyAnfWA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNhdmVEYXRhLmZhaWxlZFByZXZpZXcgJiYgc2F2ZURhdGEuZmFpbGVkUHJldmlldy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zZyArPSAn6aKE6KeI5aSx6LSl77yaJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzYXZlRGF0YS5mYWlsZWRQcmV2aWV3Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtc2cgKz0gYCR7c2F2ZURhdGEuZmFpbGVkUHJldmlld1tpXX0ke2kgPT09IHNhdmVEYXRhLmZhaWxlZFByZXZpZXcubGVuZ3RoIC0gMSA/ICdcXG4nIDogJyAnfWA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ2luZm8nLCAn5a6M5oiQJywgYOiHquWKqOWMluWujOaIkCFcXG4ke21zZ31gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBhdXRvUGFjayBleGl0IGZhaWwgJHtkYXRhfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCdlcnJvcicsICflpLHotKUnLCAn6Ieq5Yqo5YyW5aSx6LSlIScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaXNBdXRvUGFjayA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG1zZyA9ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHVwbG9hZENvdW50ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwYWNrQ291bnQgPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGF1dG9Db3VudCA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgcHJldmlld0NvdW50ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IHRhc2sgb2YgdGhpcy50YXNrTGlzdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0YXNrLm5lZWRBdXRvUGFjaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdXRvQ291bnQrKztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRhc2sudXBsb2FkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cGxvYWRDb3VudCsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGFzay5za2lwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYWNrQ291bnQrKztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGFzay5wcmV2aWV3KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcmV2aWV3Q291bnQrKztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgc2VydmVyTXNnID0gdGFzay5za2lwID8gJycgOiAodGFzay5wbGF0Zm9ybUZpbGVzICYmIHRhc2sucGxhdGZvcm1GaWxlc1t0YXNrLmNoYW5uZWxdID8gJ++8jCcgKyAodGFzay5wbGF0Zm9ybUZpbGVzW3Rhc2suY2hhbm5lbF0uaXNUZXN0ID8gJ+a1i+ivleacjScgOiAn5q2j5byP5pyNJykgOiAnJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zZyArPSBgJHt0YXNrLmFwcElkfe+8miR7dGFzay5uYW1lfe+8jOaehOW7uu+8miR7KHRhc2suc2tpcCA/ICfinJUnIDogJ+Kckycpfe+8jOS4iuS8oO+8miR7KHRhc2sudXBsb2FkID8gJ+KckycgOiAn4pyVJyl977yM6aKE6KeI77yaJHsodGFzay5wcmV2aWV3ID8gJ+KckycgOiAn4pyVJyl9JHtzZXJ2ZXJNc2d9XFxuYDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBtc2cgKz0gYOiHquWKqOWMlu+8miR7YXV0b0NvdW50feS4qu+8jOaehOW7uu+8miR7cGFja0NvdW50feS4qu+8jOS4iuS8oO+8miR7dXBsb2FkQ291bnR95Liq77yM6aKE6KeI77yaJHtwcmV2aWV3Q291bnR95LiqXFxuYDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0ZXN0U2VydmVyV2FybnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtc2cgKz0gdGVzdFNlcnZlcldhcm5zO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGJ0bk1hcCA9IG5ldyBNYXA8c3RyaW5nLCBGdW5jdGlvbj4oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ0bk1hcC5zZXQoJ29rJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF1dG9QYWNrKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnd2FybicsICd3YXJuJywgYCR7bXNnfeW8gOWni+iHquWKqOWMlj9gLCBidG5NYXAsIDEpO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBhZGRQcm9qZWN0KCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YXNrTGlzdC5wdXNoKHsgLi4uVGFza1RlbXAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ2luZm8nLCAnYWRkJywgJ+a3u+WKoOaIkOWKnycpO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBkZWxQcm9qZWN0KGl0ZW06IFBhY2tQcm9qZWN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgYnRuTWFwID0gbmV3IE1hcDxzdHJpbmcsIEZ1bmN0aW9uPigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnRuTWFwLnNldCgnZGVsZXRlJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy50YXNrTGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgdGFzayA9IHRoaXMudGFza0xpc3RbaV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0YXNrLmFwcElkID09PSBpdGVtLmFwcElkICYmIHRhc2submFtZSA9PT0gaXRlbS5uYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhc2tMaXN0LnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAnZGVsZXRlJywgJ+aYr+WQpuWIoOmZpOmFjee9rj8nLCBidG5NYXAsIDEpO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBpbXBvcnRQYWNrc0NvbmZpZygpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIOivtOaYjumdmeaAgeaWh+S7tuS4reaciSBQYWNrcy5qc29u5LqG77yM6K+i6Zeu5piv5ZCm5pu/5o2iXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjYiA9IChpbXBvcnRlZERhdGE6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWBh+iuvuWvvOWFpeeahCBKU09OIOagvOW8j+S5n+aYryB7IHBhY2tzOiBbLi4uXSB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGltcG9ydGVkRGF0YSAmJiAoKGltcG9ydGVkRGF0YS5wYWNrcyAmJiBBcnJheS5pc0FycmF5KGltcG9ydGVkRGF0YS5wYWNrcykgfHwgQXJyYXkuaXNBcnJheShpbXBvcnRlZERhdGEpKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5bCG5a+85YWl55qE5pWw5o2u5pu/5o2i5Yiw5b2T5YmN55qEIHRhc2tMaXN0IOS4rVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgZGF0YSA9IGltcG9ydGVkRGF0YS5wYWNrcyA/IGltcG9ydGVkRGF0YS5wYWNrcyA6IGltcG9ydGVkRGF0YTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHRtcHM6IFBhY2tQcm9qZWN0W10gPSBbLi4udGhpcy50YXNrTGlzdF07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGFza0xpc3QgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBkYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhc2tMaXN0W2ldID0geyAuLi5UYXNrVGVtcCwgLi4uZGF0YVtpXSB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YXNrTGlzdFtpXS5kaW5nVGFsayA9IHRoaXMuZGluZ1RhbGs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IHRtcHMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy50YXNrTGlzdFtpXS5hcHBJZCA9PT0gdG1wc1tqXS5hcHBJZCAmJiB0bXBzW2pdLnRiX2NsaV90b2tlbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhc2tMaXN0W2ldLnRiX2NsaV90b2tlbiA9IHRtcHNbal0udGJfY2xpX3Rva2VuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyA0LiDop6blj5Hkv53lrZjvvIzlsIbmlrDmlbDmja7lhpnlhaXmnKzlnLAgUGFja3MuanNvblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNhdmVDb25maWcoKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDlpoLmnpzmnIkgRWRpdG9yLkRpYWxvZ++8jOWPr+S7peW8ueS4quaIkOWKn+aPkOekulxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ2luZm8nLCAn5o+Q56S6JywgJ+WvvOWFpeaIkOWKn++8gScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ+itpuWRiicsICflr7zlhaXnmoTmlofku7bmoLzlvI/kuI3mraPnoa7vvIEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudGFza0xpc3QgJiYgdGhpcy50YXNrTGlzdC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGJ0bk1hcCA9IG5ldyBNYXA8c3RyaW5nLCBGdW5jdGlvbj4oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBidG5NYXAuc2V0KCdyZXBsYWNlJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbXBvcnRGdW5jKGNiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBidG5NYXAuc2V0KCdjYW5jZWwnLCBudWxsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAncmVwbGFjZScsICdQYWNrcy5qc29uIOW3suWtmOWcqO+8jOaYr+WQpuabv+aNoj8nLCBidG5NYXApO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW1wb3J0RnVuYyhjYik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGV4cG9ydFBhY2tzQ29uZmlnKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8g6K+05piO5rKh5pyJ6YWN572uXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMudGFza0xpc3QgfHwgdGhpcy50YXNrTGlzdC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAn6K2m5ZGKJywgJ+ayoeaciemFjee9ru+8jOaXoOazleWvvOWHuicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gMS4g57uE6KOF6ZyA6KaB5a+85Ye655qE5pWw5o2uXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHBhY2tzOiBQYWNrUHJvamVjdFtdID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRhc2tMaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgZGluZ1RhbGssIHRiX2NsaV90b2tlbiwgLi4udCB9ID0gdGhpcy50YXNrTGlzdFtpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFja3MucHVzaCh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZXhwb3J0RGF0YSA9IHsgcGFja3MgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRhU3RyID0gSlNPTi5zdHJpbmdpZnkoZXhwb3J0RGF0YSwgbnVsbCwgXCJcXHRcIik7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAyLiDojrflj5blvZPliY3ns7vnu5/nmoTmoYzpnaLot6/lvoRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkZXNrdG9wUGF0aCA9IG9zLmhvbWVkaXIoKSArICcvRGVza3RvcCc7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAzLiDmi7zmjqXlrozmlbTnmoTkv53lrZjot6/lvoRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBleHBvcnRQYXRoID0gam9pbihkZXNrdG9wUGF0aCwgYFBhY2tzLmpzb25gKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIDQuIOS9v+eUqCBOb2RlLmpzIOWOn+eUnyBmcyDmqKHlnZflkIzmraXlhpnlhaXmlofku7bliLDmoYzpnaJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3cml0ZUZpbGVTeW5jKGV4cG9ydFBhdGgsIGRhdGFTdHIsICd1dGYtOCcpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gNS4g5by55Ye65oiQ5Yqf5o+Q56S6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCdpbmZvJywgJ+aPkOekuicsIGDphY3nva7lt7LmiJDlip/lr7zlh7rliLDmoYzpnaLvvIFcXG7mlofku7blkI3vvJoke2BQYWNrcy5qc29uYH1gKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCflr7zlh7rlpLHotKU6JywgZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnZXJyb3InLCAn6ZSZ6K+vJywgJ+WvvOWHuumFjee9ruaWh+S7tuWksei0pe+8jOivt+ajgOafpeadg+mZkO+8gScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBvbmVrZXlPcGVyYXRlQXV0b1BhY2soZmxhZzogYm9vbGVhbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRhc2tMaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YXNrTGlzdFtpXS5uZWVkQXV0b1BhY2sgPSBmbGFnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZmxhZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhc2tMaXN0W2ldLnVwbG9hZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhc2tMaXN0W2ldLnNraXAgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgb25la2V5T3BlcmF0ZVVwbG9hZChmbGFnOiBib29sZWFuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudGFza0xpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhc2tMaXN0W2ldLnVwbG9hZCA9IGZsYWc7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIG9uZWtleU9wZXJhdGVTa2lwUGFjayhmbGFnOiBib29sZWFuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudGFza0xpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhc2tMaXN0W2ldLnNraXAgPSBmbGFnO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnZXRBdXRvQ291bnQoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgY291bnQgPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRhc2tMaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudGFza0xpc3RbaV0ubmVlZEF1dG9QYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50Kys7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNvdW50O1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnZXRVcGxvYWRDb3VudCgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjb3VudCA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudGFza0xpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy50YXNrTGlzdFtpXS51cGxvYWQgJiYgdGhpcy50YXNrTGlzdFtpXS5uZWVkQXV0b1BhY2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY291bnQrKztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY291bnQ7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdldFByZXZpZXdDb3VudCgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjb3VudCA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudGFza0xpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy50YXNrTGlzdFtpXS5wcmV2aWV3ICYmIHRoaXMudGFza0xpc3RbaV0ubmVlZEF1dG9QYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50Kys7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNvdW50O1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnZXRQYWNrQ291bnQoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgY291bnQgPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRhc2tMaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLnRhc2tMaXN0W2ldLnNraXAgJiYgdGhpcy50YXNrTGlzdFtpXS5uZWVkQXV0b1BhY2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY291bnQrKztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY291bnQ7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIG9wZW5Mb2dEaXIocGF0aDogc3RyaW5nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWV4aXN0c1N5bmMocGF0aCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAnd2FybicsICfml6Xlv5fmlofku7blpLnkuI3lrZjlnKjvvIEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4ZWMoYHN0YXJ0IFwiXCIgXCIke3BhdGh9XCJgLCAoZXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCfmiafooYzlkb3ku6Tlh7rplJk6JywgZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCdlcnJvcicsICfplJnor68nLCAn5peg5rOV5omT5byA55uu5b2V77yM6K+35qOA5p+l6Lev5b6E5oiW5p2D6ZmQ77yBJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcign5omT5byA55uu5b2V5byC5bi4OicsIGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ2Vycm9yJywgJ+mUmeivrycsICflj5HnlJ/mnKrnn6XplJnor6/vvIzml6Dms5XmiZPlvIDnm67lvZXvvIEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgb3BlblRvb2xMb2coKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm9wZW5Mb2dEaXIoam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi90b29sTG9nJykpO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBjbGlja0F1dG9QYWNrVG9nZ2xlKGl0ZW06IFBhY2tQcm9qZWN0LCBmbGFnOiBib29sZWFuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtLm5lZWRBdXRvUGFjayA9IGZsYWc7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWZsYWcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtLnVwbG9hZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0uc2tpcCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS5wcmV2aWV3ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHNldFBsYXRmb3JtRmlsZShpdGVtOiBQYWNrUHJvamVjdCwgcGF0aDogc3RyaW5nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWl0ZW0ucGxhdGZvcm1GaWxlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0ucGxhdGZvcm1GaWxlcyA9IHt9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFpdGVtLnBsYXRmb3JtRmlsZXNbaXRlbS5jaGFubmVsXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0ucGxhdGZvcm1GaWxlc1tpdGVtLmNoYW5uZWxdID0geyBwYXRoOiAnJywgaXNUZXN0OiBmYWxzZSB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS5wbGF0Zm9ybUZpbGVzW2l0ZW0uY2hhbm5lbF0ucGF0aCA9IHBhdGg7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHNldFBsYXRmb3JtRmlsZVNlcnZlcihpdGVtOiBQYWNrUHJvamVjdCwgaXNUZXN0OiBib29sZWFuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWl0ZW0ucGxhdGZvcm1GaWxlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0ucGxhdGZvcm1GaWxlcyA9IHt9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFpdGVtLnBsYXRmb3JtRmlsZXNbaXRlbS5jaGFubmVsXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0ucGxhdGZvcm1GaWxlc1tpdGVtLmNoYW5uZWxdID0geyBwYXRoOiAnJywgaXNUZXN0OiBmYWxzZSB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS5wbGF0Zm9ybUZpbGVzW2l0ZW0uY2hhbm5lbF0uaXNUZXN0ID0gaXNUZXN0O1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnZXRQbGF0Zm9ybUZpbGUoaXRlbTogUGFja1Byb2plY3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpdGVtLnBsYXRmb3JtRmlsZXMgJiYgaXRlbS5wbGF0Zm9ybUZpbGVzW2l0ZW0uY2hhbm5lbF0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gaXRlbS5wbGF0Zm9ybUZpbGVzW2l0ZW0uY2hhbm5lbF0ucGF0aCB8fCAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2V0UGxhdGZvcm1GaWxlU2VydmVyKGl0ZW06IFBhY2tQcm9qZWN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbS5wbGF0Zm9ybUZpbGVzICYmIGl0ZW0ucGxhdGZvcm1GaWxlc1tpdGVtLmNoYW5uZWxdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGl0ZW0ucGxhdGZvcm1GaWxlc1tpdGVtLmNoYW5uZWxdLmlzVGVzdCB8fCBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2V0QXBpVmVyc2lvbihpdGVtOiBQYWNrUHJvamVjdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFwaVZlcnNpb246IHN0cmluZyA9ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW0ucGxhdGZvcm1GaWxlcyAmJiBpdGVtLnBsYXRmb3JtRmlsZXNbaXRlbS5jaGFubmVsXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwYXRoID0gaXRlbS5wbGF0Zm9ybUZpbGVzW2l0ZW0uY2hhbm5lbF0ucGF0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXhpc3RzU3luYyhwYXRoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGZpbGVDb250ZW50ID0gcmVhZEZpbGVTeW5jKHBhdGgsICd1dGYtOCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZpbGVDb250ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5L2/55So5q2j5YiZ6KGo6L6+5byP5Yy56YWNIGFwaVZlcnNpb24g55qE5YC8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g6L+Z5Liq5q2j5YiZ6KGo6L6+5byP55qE6Kej6YeK77yaXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYXBpVmVyc2lvbjogICAgICAgIC0+IOWMuemFjeWtl+mdoumHjyBcImFwaVZlcnNpb246XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBcXHMqICAgICAgICAgICAgICAgIC0+IOWMuemFjembtuS4quaIluWkmuS4quepuueZveWtl+espu+8iOWmguepuuagvOOAgeaNouihjO+8iVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFwiICAgICAgICAgICAgICAgICAgLT4g5Yy56YWN5LiA5Liq5Y+M5byV5Y+3XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gKFteXCJdKikgICAgICAgICAgICAtPiDov5nmmK/kuIDkuKrmjZXojrfnu4TvvIzljLnphY3pmaTkuoblj4zlvJXlj7fku6XlpJbnmoTku7vmhI/lrZfnrKbvvIznm7TliLDpgYfliLDkuIvkuIDkuKrlj4zlvJXlj7dcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBcIiAgICAgICAgICAgICAgICAgIC0+IOWMuemFjee7k+WwvueahOWPjOW8leWPt1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZlcnNpb25SZWdleCA9IC9hcGlWZXJzaW9uOlxccypcIihbXlwiXSopXCIvO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG1hdGNoUmVzdWx0ID0gZmlsZUNvbnRlbnQubWF0Y2godmVyc2lvblJlZ2V4KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOajgOafpeaYr+WQpuWMuemFjeaIkOWKn+W5tuaPkOWPluWAvFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtYXRjaFJlc3VsdCAmJiBtYXRjaFJlc3VsdFsxXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBtYXRjaFJlc3VsdFsxXSDlsLHmmK/nrKzkuIDkuKrmjZXojrfnu4TnmoTlhoXlrrnvvIzkuZ/lsLHmmK/miJHku6zmg7PopoHnmoTlgLxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBpVmVyc2lvbiA9IG1hdGNoUmVzdWx0WzFdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXBpVmVyc2lvbjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhcGlWZXJzaW9uO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXBpVmVyc2lvbjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXBpVmVyc2lvbjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2V0VGFvQmFvRGVidWdVcmwoaXRlbTogUGFja1Byb2plY3QsIGlzUHJldmlldzogYm9vbGVhbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ3dhcm4nLCAn6aG555uu6YWN572u5Li656m677yM6K+35qOA5p+l6YWN572uJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFpdGVtLmFwcElkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ3dhcm4nLCAn6K+36L6T5YWl5q2j56Gu55qEYXBwSWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWl0ZW0udGJfY2xpX3Rva2VuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ3dhcm4nLCAn6K+36L6T5YWl5q2j56Gu55qE5reY5a6dQ0xJIFRva2VuJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmlzU2V0VGJDbGlUb2tlbiA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBzcGF3bl90YihbJ2NvbmZpZycsICdzZXQnLCAndG9rZW4nLCBpdGVtLnRiX2NsaV90b2tlbl0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmlzU2V0VGJDbGlUb2tlbiA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmlzQXV0b1BhY2sgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNQcmV2aWV3KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgY29tcGFyZVZlcnNpb24gPSAodmVyMTogc3RyaW5nLCB2ZXIyOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgYXJyMSA9IHZlcjEuc3BsaXQoJy4nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgYXJyMiA9IHZlcjIuc3BsaXQoJy4nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbGVuZ3RoID0gTWF0aC5taW4oYXJyMS5sZW5ndGgsIGFycjIubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcnIxW2ldID09IGFycjJbaV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBOdW1iZXIoYXJyMVtpXSkgLSBOdW1iZXIoYXJyMltpXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhcnIxLmxlbmd0aCAtIGFycjIubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBvdXRQYXRoID0gcGF0aC5qb2luKGl0ZW0ucGF0aCwgYGJ1aWxkLyR7Y29tcGFyZVZlcnNpb24oaXRlbS5lbmdpbmVWZXIsIFwiMy4wLjBcIikgPyBpdGVtLmNoYW5uZWwgOiAndGFvYmFvLW1pbmlnYW1lJ31gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNwYXduX3RiKFtcInByZXZpZXdcIiwgXCItaVwiLCBvdXRQYXRoLCBcIi1hXCIsIGl0ZW0uYXBwSWQsIFwiLXRcIiwgXCJtaW5pZ2FtZVwiLCBcIi0tY29weVwiLCBcInRydWVcIiwgXCItLXJlbmRlck1vZGVcIiwgXCJoaWdoUGVyZm9ybWFuY2VcIl0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKGRhdGE6IHsgcHJldmlld1VybDogc3RyaW5nIH0pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pc0F1dG9QYWNrID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy50YXNrTGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudGFza0xpc3RbaV0uYXBwSWQgPT09IGl0ZW0uYXBwSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnFyQ29kZVVybE1hcC5zZXQoaXRlbS5hcHBJZCwgeyBhcHBpZDogaXRlbS5hcHBJZCwgdXJsOiBkYXRhLnByZXZpZXdVcmwgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pc0F1dG9QYWNrID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNwYXduX3RiKFsnYXBwJywgJy1hJywgaXRlbS5hcHBJZF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKGRhdGE6IHsgdmVyc2lvbjogc3RyaW5nIH0pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pc0F1dG9QYWNrID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLnZlcnNpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCB1cmwgPSBgaHR0cHM6Ly9tLmR1YW5xdS5jb20/X2FyaXZlcl9hcHBpZD0ke2l0ZW0uYXBwSWR9Jm5ic3Y9JHtkYXRhLnZlcnNpb259Jm5ic291cmNlPWRlYnVnJm5ic249VFJJQUwmX21wX2NvZGU9dGImX2NvbnRhaW5lcl90eXBlPWdtJnZjb25zb2xlPXRydWVgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnFyQ29kZVVybCA9IHVybDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBnZXRUYW9CYW9EZWJ1Z1VybCBzdXNjZXNzICR7dXJsfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCdlcnJvcicsICflpLHotKUnLCAn5aSN5Yi26ZO+5o6l5aSx6LSlIScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaXNBdXRvUGFjayA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ2Vycm9yJywgJ+Wksei0pScsICflpI3liLbpk77mjqXlpLHotKUhJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmlzU2V0VGJDbGlUb2tlbiA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGNsb3NlUXJDb2RlKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5xckNvZGVVcmwgPSAnJztcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgYXN5bmMgY29weUxpbmsobGluazogc3RyaW5nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobGluayAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCBuYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dChsaW5rKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCdpbmZvJywgJ+WujOaIkCcsIGDlpI3liLbpk77mjqXmiJDlip/vvIzlj6/nspjotLTkvb/nlKjvvIFgKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnZXJyb3InLCAn5aSx6LSlJywgYOWkjeWItumTvuaOpeWksei0pSEgJHtlcnJvcn1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGNoZWNrVXBsb2FkKGl0ZW06IFBhY2tQcm9qZWN0LCBpc0NoZWNrOiBib29sZWFuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbS5wcmV2aWV3KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS5wcmV2aWV3ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtLnVwbG9hZCA9IGlzQ2hlY2s7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGNoZWNrUHJldmlldyhpdGVtOiBQYWNrUHJvamVjdCwgaXNDaGVjazogYm9vbGVhbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW0udXBsb2FkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS51cGxvYWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0ucHJldmlldyA9IGlzQ2hlY2s7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHNhdmVDb25maWcoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXhpc3RzU3luYyhzYXZlUGF0aCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgc2F2ZURhdGE6IFNhdmVEYXRhID0gcmVhZEpTT05TeW5jKHNhdmVQYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2F2ZURhdGEgJiYgc2F2ZURhdGEuYXBpVmVyc2lvbnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2F2ZURhdGEuYXBpVmVyc2lvbnMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHNhdmVEYXRhU3RyID0gSlNPTi5zdHJpbmdpZnkoc2F2ZURhdGEsIG51bGwsIFwiXFx0XCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3cml0ZUZpbGVTeW5jKHNhdmVQYXRoLCBzYXZlRGF0YVN0ciwgJ3V0Zi04Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHNhdmVEYXRhOiBTYXZlRGF0YSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaW5nX3RhbGs6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGluZ1RhbGtXZWJIb29rOiAnJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGluZ1RhbGtDdXN0b21Db250ZW50X3BhY2s6ICcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaW5nVGFsa0N1c3RvbUNvbnRlbnRfdXBsb2FkOiAnJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFvYmFvX2NsaV90b2tlbjogW10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcXJDb2RlVXJsczogW10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBpVmVyc2lvbnM6IFtdXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHNhdmVEaW5nVGFsayA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHBhY2tzOiBQYWNrUHJvamVjdFtdID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudGFza0xpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhc2tMaXN0W2ldID0geyAuLi5UYXNrVGVtcCwgLi4udGhpcy50YXNrTGlzdFtpXSB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnRhc2tMaXN0W2ldLnRiX2NsaV90b2tlbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzYXZlRGF0YS50YW9iYW9fY2xpX3Rva2VuLnB1c2goeyBhcHBpZDogdGhpcy50YXNrTGlzdFtpXS5hcHBJZCwgbmFtZTogdGhpcy50YXNrTGlzdFtpXS5uYW1lLCB0b2tlbjogdGhpcy50YXNrTGlzdFtpXS50Yl9jbGlfdG9rZW4gfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudGFza0xpc3RbaV0uZGluZ1RhbGspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFzYXZlRGluZ1RhbGspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNhdmVEaW5nVGFsayA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzYXZlRGF0YS5kaW5nX3RhbGsgPSB7IC4uLnRoaXMudGFza0xpc3RbaV0uZGluZ1RhbGsgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnRhc2tMaXN0W2ldLnBsYXRmb3JtRmlsZXMgJiYgdGhpcy50YXNrTGlzdFtpXS5wbGF0Zm9ybUZpbGVzW3RoaXMudGFza0xpc3RbaV0uY2hhbm5lbF0gJiYgdGhpcy50YXNrTGlzdFtpXS5wbGF0Zm9ybUZpbGVzW3RoaXMudGFza0xpc3RbaV0uY2hhbm5lbF0uYXBpVmVyc2lvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzYXZlRGF0YS5hcGlWZXJzaW9ucy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwcGlkOiB0aGlzLnRhc2tMaXN0W2ldLmFwcElkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBpVmVyc2lvbjogdGhpcy50YXNrTGlzdFtpXS5wbGF0Zm9ybUZpbGVzW3RoaXMudGFza0xpc3RbaV0uY2hhbm5lbF0uYXBpVmVyc2lvblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMudGFza0xpc3RbaV0ucGxhdGZvcm1GaWxlc1t0aGlzLnRhc2tMaXN0W2ldLmNoYW5uZWxdLmFwaVZlcnNpb247XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBkaW5nVGFsaywgdGJfY2xpX3Rva2VuLCAuLi50IH0gPSB0aGlzLnRhc2tMaXN0W2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhY2tzLnB1c2godCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucXJDb2RlVXJsTWFwLmNsZWFyKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBkYXRhID0geyBwYWNrcyB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGRhdGFTdHIgPSBKU09OLnN0cmluZ2lmeShkYXRhLCBudWxsLCBcIlxcdFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdyaXRlRmlsZVN5bmMocGFja3NQYXRoLCBkYXRhU3RyLCAndXRmLTgnKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHNhdmVEYXRhU3RyID0gSlNPTi5zdHJpbmdpZnkoc2F2ZURhdGEsIG51bGwsIFwiXFx0XCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgd3JpdGVGaWxlU3luYyhzYXZlUGF0aCwgc2F2ZURhdGFTdHIsICd1dGYtOCcpO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBpbXBvcnRDbGlUb2tlbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNiID0gKGRhdGE6IFRhb0Jhb19DbGlfVG9rZW5bXSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnRhc2tMaXN0ICYmIHRoaXMudGFza0xpc3QubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRhc2tMaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHRhc2s6IFBhY2tQcm9qZWN0ID0gdGhpcy50YXNrTGlzdFtpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGFzay5jaGFubmVsID09PSAndGFvYmFvLW1pbmktZ2FtZScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBkYXRhLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YVtqXS5hcHBpZCA9PT0gdGFzay5hcHBJZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhc2sudGJfY2xpX3Rva2VuID0gZGF0YVtqXS50b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnaW5mbycsICdpbmZvJywgJ+WvvOWFpeaIkOWKn++8gScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zYXZlQ29uZmlnKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAnd2FybicsICfor7flhYjmt7vliqDoh6rliqjljJbpobnnm67phY3nva7vvIEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ3dhcm4nLCAn5a+85YWlY2xpIHRva2VuIOaVsOaNruWksei0pe+8gScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICBpbXBvcnRGdW5jKGNiKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgdGVtcGxhdGU6IHJlYWRGaWxlU3luYyhqb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uL3N0YXRpYy90ZW1wbGF0ZS92dWUvcHJvamVjdC5odG1sJyksICd1dGYtOCcpLFxuICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgYXBwLm1vdW50KHRoaXMuJC5hcHApO1xuICAgICAgICAgICAgcGFuZWxEYXRhTWFwLnNldCh0aGlzLCBhcHApO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBiZWZvcmVDbG9zZSgpIHtcbiAgICB9LFxuICAgIGNsb3NlKCkge1xuICAgICAgICBjb25zdCBhcHAgPSBwYW5lbERhdGFNYXAuZ2V0KHRoaXMpO1xuICAgICAgICBpZiAoYXBwKSB7XG4gICAgICAgICAgICBpZiAoZXhpc3RzU3luYyhzYXZlUGF0aCkpIHtcbiAgICAgICAgICAgICAgICBsZXQgc2F2ZURhdGE6IFNhdmVEYXRhID0gcmVhZEpTT05TeW5jKHNhdmVQYXRoKTtcbiAgICAgICAgICAgICAgICBpZiAoc2F2ZURhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgc2F2ZURhdGEucXJDb2RlVXJscyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2F2ZURhdGEuc3VjY2Vzc2VkUGFjaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHNhdmVEYXRhLnN1Y2Nlc3NlZFBhY2s7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHNhdmVEYXRhLmZhaWxlZFBhY2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBzYXZlRGF0YS5mYWlsZWRQYWNrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChzYXZlRGF0YS5zdWNjZXNzZWRVcGxvYWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBzYXZlRGF0YS5zdWNjZXNzZWRVcGxvYWQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHNhdmVEYXRhLmZhaWxlZFVwbG9hZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHNhdmVEYXRhLmZhaWxlZFVwbG9hZDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoc2F2ZURhdGEuc3VjY2Vzc2VkUHJldmlldykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHNhdmVEYXRhLnN1Y2Nlc3NlZFByZXZpZXc7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHNhdmVEYXRhLmZhaWxlZFByZXZpZXcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBzYXZlRGF0YS5mYWlsZWRQcmV2aWV3O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChzYXZlRGF0YS5hcGlWZXJzaW9ucykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHNhdmVEYXRhLmFwaVZlcnNpb25zO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGxldCBzYXZlRGF0YVN0ciA9IEpTT04uc3RyaW5naWZ5KHNhdmVEYXRhLCBudWxsLCBcIlxcdFwiKTtcbiAgICAgICAgICAgICAgICAgICAgd3JpdGVGaWxlU3luYyhzYXZlUGF0aCwgc2F2ZURhdGFTdHIsICd1dGYtOCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgYXBwLnVubW91bnQoKTtcbiAgICAgICAgfVxuICAgIH0sXG59KTsiXX0=