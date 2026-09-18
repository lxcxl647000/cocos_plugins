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
                        let needPackAndHasGitUrlArr = [];
                        for (let task of this.taskList) {
                            if (task.needAutoPack) {
                                autoCount++;
                                if (task.upload) {
                                    uploadCount++;
                                }
                                if (!task.skip) {
                                    packCount++;
                                    if (task.gitConfig && task.gitConfig.gitUrl) {
                                        needPackAndHasGitUrlArr.push(task);
                                    }
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
                        btnMap.set('ok', async () => {
                            // 如果有需要cocos构建的工程并且配置了git地址，检测一下和git远程版本是否是最新
                            if (needPackAndHasGitUrlArr.length > 0) {
                                this.isPullGit = true;
                                let needPullGitArr = [];
                                let pullGitNames = [];
                                let index = 0;
                                const tasks = needPackAndHasGitUrlArr.map((pack) => {
                                    let projectPath = pack.path;
                                    let gitUrl = pack.gitConfig.gitUrl;
                                    let gitHelper = this.getGitHelper(index, { projectPath, gitUrl });
                                    index++;
                                    return gitHelper.checkVersionSync().then((res) => {
                                        if (!res.isSynced) {
                                            needPullGitArr.push({ projectPath, gitUrl, branch: pack.gitConfig.gitBranch || '' });
                                            pullGitNames.push(pack.name);
                                        }
                                    }).catch((error) => {
                                    });
                                });
                                await Promise.all(tasks);
                                this.isPullGit = false;
                                if (needPullGitArr.length > 0) {
                                    let btnMap2 = new Map();
                                    btnMap2.set('ok', async () => {
                                        await this.pullGitArr(needPullGitArr);
                                        autoPack();
                                    });
                                    btnMap2.set('cancel', () => {
                                        autoPack();
                                    });
                                    let names = '';
                                    for (let i = 0; i < pullGitNames.length; i++) {
                                        names += `${pullGitNames[i]} `;
                                    }
                                    (0, exports.openDilog)('warn', 'warn', `${names}检测到需要更新的Git仓库，是否更新?`, btnMap2);
                                }
                                else {
                                    autoPack();
                                }
                            }
                            else {
                                autoPack();
                            }
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
                        let gitHelper = this.getGitHelper(0, { projectPath, gitUrl });
                        this.isPullGit = true;
                        let result = await gitHelper.updateToLatest({ projectPath, gitUrl, branch, force: true });
                        this.isPullGit = false;
                        if (!result.success) {
                            (0, exports.openDilog)('warn', 'warn', result.message);
                            return;
                        }
                        (0, exports.openDilog)('info', 'info', '更新成功');
                    },
                    allPullGit() {
                        let pullArr = [];
                        for (let i = 0; i < this.taskList.length; i++) {
                            const task = this.taskList[i];
                            if (task.path && task.gitConfig && task.gitConfig.gitUrl) {
                                pullArr.push({ projectPath: task.path, gitUrl: task.gitConfig.gitUrl, branch: task.gitConfig.gitBranch });
                            }
                        }
                        this.pullGitArr(pullArr);
                    },
                    async pullGitArr(pullArr) {
                        let total = pullArr.length;
                        if (total > 0) {
                            this.isPullGit = true;
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
                                let gitHelper = this.getGitHelper(index, { projectPath, gitUrl });
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
                            return true;
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
                    },
                    getGitHelper(index, data) {
                        let { projectPath, gitUrl } = data;
                        let gitHelper = null;
                        if (index <= this.gitHelpers.length - 1) {
                            gitHelper = this.gitHelpers[index];
                            gitHelper.updateGit(projectPath);
                        }
                        else {
                            gitHelper = new GitHelper_1.GitHelper({ projectPath, gitUrl, onLog: (msg) => { console.log(`GitHelper: ${projectPath}  ${msg}`); } });
                            this.gitHelpers.push(gitHelper);
                        }
                        return gitHelper;
                    },
                    configToTop(item) {
                        if (this.taskList && this.taskList.length > 0) {
                            let index = this.taskList.indexOf(item);
                            if (index > 0) {
                                let top = this.taskList[0];
                                this.taskList[0] = item;
                                this.taskList[index] = top;
                                this.saveConfig();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zb3VyY2UvcGFuZWxzL2RlZmF1bHQvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLCtDQUErQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFL0MsaURBQTRFO0FBQzVFLHVDQUFpRjtBQUNqRiw2Q0FBa0M7QUFDbEMsNkJBQXNEO0FBQ3RELDRDQUFvQjtBQUNwQiwwREFBa0M7QUFDbEMsMkNBQTZCO0FBQzdCLDJDQUF3QztBQUN4QywyQ0FBd0M7QUFDeEMsTUFBTSxZQUFZLEdBQUcsSUFBSSxPQUFPLEVBQVksQ0FBQztBQThCN0MsTUFBTSxTQUFTLEdBQUcsSUFBQSxXQUFJLEVBQUMsU0FBUyxFQUFFLHdDQUF3QyxDQUFDLENBQUM7QUFDNUUsTUFBTSxRQUFRLEdBQUcsSUFBQSxXQUFJLEVBQUMsU0FBUyxFQUFFLHVDQUF1QyxDQUFDLENBQUM7QUFFMUUsaUJBQWlCO0FBQ2pCLE1BQU0sY0FBYyxHQUFHO0lBQ25CLGtCQUFrQixFQUFFLDBCQUEwQjtDQUNqRCxDQUFBO0FBMENELE1BQU0sUUFBUSxHQUFnQjtJQUMxQixLQUFLLEVBQUUsRUFBRTtJQUNULElBQUksRUFBRSxFQUFFO0lBQ1IsSUFBSSxFQUFFLEVBQUU7SUFDUixPQUFPLEVBQUUsa0JBQWtCO0lBQzNCLElBQUksRUFBRSxLQUFLO0lBQ1gsTUFBTSxFQUFFLEtBQUs7SUFDYixZQUFZLEVBQUUsS0FBSztJQUNuQixhQUFhLEVBQUU7UUFDWCxrQkFBa0IsRUFBRTtZQUNoQixJQUFJLEVBQUUsRUFBRTtZQUNSLE1BQU0sRUFBRSxLQUFLO1NBQ2hCO0tBQ0o7SUFDRCxjQUFjLEVBQUUsS0FBSztJQUNyQixlQUFlLEVBQUUsS0FBSztJQUN0QixRQUFRLEVBQUUsS0FBSztJQUNmLFVBQVUsRUFBRSxLQUFLO0lBQ2pCLGdCQUFnQixFQUFFLEVBQUU7SUFDcEIseUJBQXlCLEVBQUUsTUFBTTtJQUNqQyxVQUFVLEVBQUUsRUFBRTtJQUNkLFNBQVMsRUFBRSxFQUFFO0lBQ2Isc0JBQXNCLEVBQUUsT0FBTztJQUMvQixPQUFPLEVBQUUsS0FBSztDQUNqQixDQUFDO0FBRUYsTUFBTSxRQUFRLEdBQUcsQ0FBQyxJQUFjLEVBQUUsT0FBaUIsRUFBRSxJQUFjLEVBQUUsRUFBRTtJQUNuRSxJQUFJLEVBQUUsR0FBbUMsSUFBQSxxQkFBSyxFQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUNoRixFQUFFLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUM5QixJQUFJLFVBQVUsR0FBRyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDbkQsSUFBSSxjQUFjLEdBQUcsS0FBSyxDQUFDO0lBQzNCLElBQUksT0FBTyxHQUFHLEVBQUUsQ0FBQztJQUNqQixJQUFJLFVBQVUsR0FBRyxFQUFFLENBQUM7SUFDcEIsSUFBSSxnQkFBZ0IsR0FBRyxLQUFLLENBQUM7SUFFN0IsRUFBRSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUU7UUFDMUIsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO1lBQ25CLGdCQUFnQixHQUFHLEtBQUssQ0FBQztRQUM3QixDQUFDO2FBQ0ksQ0FBQztZQUNGLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxVQUFVLFdBQVcsSUFBSSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNyRSxDQUFDO1FBQ0QsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDL0IsSUFBSSxHQUFHLEdBQVcsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzlCLElBQUksR0FBRyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDL0IsT0FBTyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUM1QixDQUFDO1FBQ0QsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDaEMsSUFBSSxHQUFHLEdBQVcsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzlCLElBQUksR0FBRyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDaEMsVUFBVSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUMvQixDQUFDO1FBQ0QsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDbEMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDO1FBQzVCLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUNILEVBQUUsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFO1FBQzFCLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxVQUFVLFdBQVcsSUFBSSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNqRSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ3ZDLGNBQWMsR0FBRyxJQUFJLENBQUM7UUFDMUIsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0lBQ0gsRUFBRSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsRUFBRTtRQUMvQixJQUFJLElBQUksS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNiLElBQUksY0FBYyxFQUFFLENBQUM7Z0JBQ2pCLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxVQUFVLHVCQUF1QixDQUFDLENBQUM7Z0JBQzVELElBQUEsaUJBQVMsRUFBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLGdCQUFnQixDQUFDLENBQUM7Z0JBQzVDLElBQUksSUFBSSxJQUFJLEVBQUUsQ0FBQztZQUNuQixDQUFDO2lCQUNJLENBQUM7Z0JBQ0YsT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLFVBQVUsVUFBVSxDQUFDLENBQUM7Z0JBQy9DLE9BQU8sSUFBSSxPQUFPLENBQUMsRUFBRSxPQUFPLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQztZQUNoRCxDQUFDO1FBQ0wsQ0FBQzthQUNJLENBQUM7WUFDRixPQUFPLENBQUMsR0FBRyxDQUFDLGFBQWEsVUFBVSxTQUFTLENBQUMsQ0FBQztZQUM5QyxJQUFJLElBQUksSUFBSSxFQUFFLENBQUM7UUFDbkIsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyxDQUFDO0FBRUssTUFBTSxTQUFTLEdBQUcsS0FBSyxFQUFFLElBQVksRUFBRSxLQUFhLEVBQUUsT0FBZSxFQUFFLE1BQThCLEVBQUUsTUFBZSxFQUFFLEVBQUU7SUFDN0gsSUFBSSxNQUFNLEdBQXVDO1FBQzdDLEtBQUs7S0FDUixDQUFDO0lBQ0YsSUFBSSxNQUFNLEVBQUUsQ0FBQztRQUNULE1BQU0sQ0FBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1FBQ3BCLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLEVBQUU7WUFDMUIsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDN0IsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDO0lBQ0QsSUFBSSxNQUFNLEtBQUssU0FBUyxFQUFFLENBQUM7UUFDdkIsTUFBTSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7SUFDM0IsQ0FBQztJQUNELElBQUksSUFBSSxHQUE0QyxNQUFNLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQy9GLElBQUksTUFBTSxFQUFFLENBQUM7UUFDVCxJQUFJLEdBQUcsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN4QyxJQUFJLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNsQixJQUFJLElBQUksR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQzNCLElBQUksSUFBSSxFQUFFLENBQUM7Z0JBQ1AsSUFBSSxFQUFFLENBQUM7WUFDWCxDQUFDO1FBQ0wsQ0FBQztJQUNMLENBQUM7QUFDTCxDQUFDLENBQUE7QUF2QlksUUFBQSxTQUFTLGFBdUJyQjtBQUVELE1BQU0sVUFBVSxHQUFHLENBQUMsRUFBWSxFQUFFLEVBQUU7SUFDaEMsd0JBQXdCO0lBQ3hCLE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDOUMsS0FBSyxDQUFDLElBQUksR0FBRyxNQUFNLENBQUM7SUFDcEIsK0NBQStDO0lBQy9DLEtBQUssQ0FBQyxNQUFNLEdBQUcsa0JBQWtCLENBQUM7SUFDbEMsS0FBSyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDO0lBRTdCLGVBQWU7SUFDZixLQUFLLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUU7O1FBQ25CLE1BQU0sSUFBSSxHQUFHLE1BQUMsQ0FBQyxDQUFDLE1BQTJCLENBQUMsS0FBSywwQ0FBRyxDQUFDLENBQUMsQ0FBQztRQUN2RCxJQUFJLENBQUMsSUFBSTtZQUFFLE9BQU87UUFFbEIsaUJBQWlCO1FBQ2pCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7UUFDM0IsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7UUFFeEUsMEJBQTBCO1FBQzFCLE1BQU0sTUFBTSxHQUFHLElBQUksVUFBVSxFQUFFLENBQUM7UUFDaEMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLEtBQUssRUFBRSxFQUFFOztZQUN0QixJQUFJLENBQUM7Z0JBQ0QsSUFBSSxZQUFZLEdBQUcsSUFBSSxDQUFDO2dCQUN4QixJQUFJLE9BQU8sS0FBSyxPQUFPLEVBQUUsQ0FBQztvQkFDdEIsc0JBQXNCO29CQUN0QixNQUFNLE1BQU0sR0FBRyxNQUFBLEtBQUssQ0FBQyxNQUFNLDBDQUFFLE1BQWdCLENBQUM7b0JBQzlDLFlBQVksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUV0QyxDQUFDO3FCQUFNLElBQUksT0FBTyxLQUFLLE9BQU8sSUFBSSxPQUFPLEtBQUssTUFBTSxFQUFFLENBQUM7b0JBQ25ELHVCQUF1QjtvQkFDdkIsTUFBTSxJQUFJLEdBQUcsSUFBSSxVQUFVLENBQUMsTUFBQSxLQUFLLENBQUMsTUFBTSwwQ0FBRSxNQUFxQixDQUFDLENBQUM7b0JBQ2pFLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUM7b0JBQ3BELE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQzlDLE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUM7b0JBQ2xELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLFNBQVMsRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUNyRSxZQUFZLEdBQUcsa0JBQVEsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUM7Z0JBQ25ELENBQUM7Z0JBQ0QsRUFBRSxJQUFJLEVBQUUsQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUMzQixDQUFDO1lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztnQkFDYixPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUNyQixJQUFBLGlCQUFTLEVBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1lBQ2hELENBQUM7WUFFRCw4QkFBOEI7WUFDOUIsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDckMsQ0FBQyxDQUFDO1FBQ0YsSUFBSSxPQUFPLEtBQUssT0FBTyxFQUFFLENBQUM7WUFDdEIsTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLGVBQWU7UUFDNUMsQ0FBQzthQUFNLElBQUksT0FBTyxLQUFLLE9BQU8sSUFBSSxPQUFPLEtBQUssTUFBTSxFQUFFLENBQUM7WUFDbkQsTUFBTSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsaUJBQWlCO1FBQ3JELENBQUM7SUFDTCxDQUFDLENBQUM7SUFFRixnQ0FBZ0M7SUFDaEMsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDakMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDO0FBQ2xCLENBQUMsQ0FBQztBQUVGLE1BQU0sQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUM7SUFDakMsU0FBUyxFQUFFO1FBQ1AsSUFBSSxLQUFLLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQy9CLElBQUksS0FBSyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNsQztJQUNELFFBQVEsRUFBRSxJQUFBLHVCQUFZLEVBQUMsSUFBQSxXQUFJLEVBQUMsU0FBUyxFQUFFLDZDQUE2QyxDQUFDLEVBQUUsT0FBTyxDQUFDO0lBQy9GLEtBQUssRUFBRSxJQUFBLHVCQUFZLEVBQUMsSUFBQSxXQUFJLEVBQUMsU0FBUyxFQUFFLHlDQUF5QyxDQUFDLEVBQUUsT0FBTyxDQUFDO0lBQ3hGLENBQUMsRUFBRTtRQUNDLEdBQUcsRUFBRSxNQUFNO0tBQ2Q7SUFDRCxPQUFPLEVBQUUsRUFFUjtJQUNELEtBQUs7UUFDRCxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDYixNQUFNLEdBQUcsR0FBRyxJQUFBLGVBQVMsRUFBQyxFQUFFLENBQUMsQ0FBQztZQUMxQixHQUFHLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxlQUFlLEdBQUcsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7WUFFNUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxXQUFXLEVBQUUsSUFBQSxxQkFBZSxFQUFDO2dCQUN2QyxJQUFJO29CQUNBLE9BQU87d0JBQ0gsUUFBUSxFQUFFLEVBQW1CO3dCQUM3QixVQUFVLEVBQUUsS0FBSzt3QkFDakIsU0FBUyxFQUFFLEVBQUU7d0JBQ2IsZUFBZSxFQUFFLEtBQUs7d0JBQ3RCLFFBQVEsRUFBRSxFQUFFLGVBQWUsRUFBRSxFQUFFLEVBQUUsMEJBQTBCLEVBQUUsRUFBRSxFQUFFLDRCQUE0QixFQUFFLEVBQUUsRUFBYzt3QkFDL0csWUFBWSxFQUFFLElBQUksR0FBRyxFQUFrQjt3QkFDdkMsVUFBVSxFQUFFLEVBQWlCO3dCQUM3QixTQUFTLEVBQUUsS0FBSztxQkFDbkIsQ0FBQztnQkFDTixDQUFDO2dCQUNELE9BQU87b0JBQ0gsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO2dCQUN4QixDQUFDO2dCQUNELE9BQU8sRUFBRTtvQkFDTCxZQUFZO3dCQUNSLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBQSxxQkFBVSxFQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUEsdUJBQVksRUFBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQzt3QkFDaEcsSUFBSSxpQkFBaUIsR0FBa0MsSUFBSSxHQUFHLEVBQTRCLENBQUM7d0JBQzNGLElBQUksSUFBQSxxQkFBVSxFQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7NEJBQ3ZCLElBQUksSUFBSSxHQUFhLElBQUEsdUJBQVksRUFBQyxRQUFRLENBQUMsQ0FBQzs0QkFDNUMsSUFBSSxJQUFJLEVBQUUsQ0FBQztnQ0FDUCxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztvQ0FDakIsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDO2dDQUNuQyxDQUFDO2dDQUNELElBQUksSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7b0NBQ3hCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7d0NBQ3BELGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO29DQUNwRixDQUFDO2dDQUNMLENBQUM7NEJBQ0wsQ0FBQzt3QkFDTCxDQUFDO3dCQUVELElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDOzRCQUNoQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQ0FDNUMsSUFBSSxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO29DQUNoRCxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksR0FBRyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUM7Z0NBQ3hGLENBQUM7Z0NBQ0QsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQzs0QkFDOUMsQ0FBQzt3QkFDTCxDQUFDO29CQUNMLENBQUM7b0JBQ0QsYUFBYTt3QkFDVCxJQUFJLGVBQWUsR0FBVyxFQUFFLENBQUM7d0JBQ2pDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDOzRCQUMvQyxJQUFJLE1BQU0sR0FBRyxJQUFJLEdBQUcsRUFBb0IsQ0FBQzs0QkFDekMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFO2dDQUNuQixJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7NEJBQ3RCLENBQUMsQ0FBQyxDQUFDOzRCQUNILE1BQU0sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDOzRCQUMzQixJQUFBLGlCQUFTLEVBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxjQUFjLEVBQUUsTUFBTSxDQUFDLENBQUM7NEJBQ2xELE9BQU87d0JBQ1gsQ0FBQzt3QkFDRCxJQUFJLElBQUksQ0FBQyxZQUFZLEVBQUUsS0FBSyxDQUFDLEVBQUUsQ0FBQzs0QkFDNUIsSUFBQSxpQkFBUyxFQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7NEJBQ3JDLE9BQU87d0JBQ1gsQ0FBQzt3QkFDRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQzs0QkFDNUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsbUNBQVEsUUFBUSxHQUFLLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUUsQ0FBQzs0QkFDeEQsSUFBSSxJQUFJLEdBQWdCLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7NEJBQ3pDLElBQUksSUFBSSxDQUFDLFlBQVksS0FBSyxLQUFLO2dDQUFFLFNBQVM7NEJBQzFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7Z0NBQ2QsSUFBQSxpQkFBUyxFQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsdUJBQXVCLENBQUMsQ0FBQztnQ0FDbkQsT0FBTzs0QkFDWCxDQUFDOzRCQUNELElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7Z0NBQ2IsSUFBQSxpQkFBUyxFQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsc0JBQXNCLENBQUMsQ0FBQztnQ0FDbEQsT0FBTzs0QkFDWCxDQUFDOzRCQUNELElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7Z0NBQ2hCLElBQUEsaUJBQVMsRUFBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLHNCQUFzQixDQUFDLENBQUM7Z0NBQ2xELE9BQU87NEJBQ1gsQ0FBQzs0QkFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO2dDQUNuQixJQUFBLGlCQUFTLEVBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxzQkFBc0IsQ0FBQyxDQUFDO2dDQUNsRCxPQUFPOzRCQUNYLENBQUM7NEJBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQ0FDbEIsSUFBQSxpQkFBUyxFQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsc0JBQXNCLENBQUMsQ0FBQztnQ0FDbEQsT0FBTzs0QkFDWCxDQUFDOzRCQUNELElBQUksSUFBSSxDQUFDLE9BQU8sS0FBSyxrQkFBa0IsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO2dDQUM3RixJQUFBLGlCQUFTLEVBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxzQkFBc0IsQ0FBQyxDQUFDO2dDQUNsRCxPQUFPOzRCQUNYLENBQUM7NEJBRUQsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLElBQUksSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDO2dDQUN0RyxJQUFBLGlCQUFTLEVBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSx5QkFBeUIsQ0FBQyxDQUFDO2dDQUNyRCxPQUFPOzRCQUNYLENBQUM7NEJBRUQsSUFBSSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDOzRCQUNsRCxJQUFJLGdCQUFnQixFQUFFLENBQUM7Z0NBQ25CLE1BQU0sY0FBYyxHQUFHLGNBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2dDQUNqRCxJQUFJLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztvQ0FDL0MsSUFBQSxpQkFBUyxFQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsU0FBUyxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLE9BQU8sa0JBQWtCLENBQUMsQ0FBQztvQ0FDN0YsT0FBTztnQ0FDWCxDQUFDO2dDQUNELElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQ0FDOUMsSUFBSSxNQUFNLElBQUksSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztvQ0FDdEMsZUFBZSxJQUFJLE9BQU8sSUFBSSxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsSUFBSSxhQUFhLENBQUE7Z0NBQ2xFLENBQUM7NEJBQ0wsQ0FBQzt3QkFDTCxDQUFDO3dCQUNELElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDOzRCQUNsQixJQUFBLGlCQUFTLEVBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQzs0QkFDMUMsT0FBTzt3QkFDWCxDQUFDO3dCQUVELE1BQU0sUUFBUSxHQUFHLEdBQUcsRUFBRTs0QkFDbEIsSUFBQSxpQkFBUyxFQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7NEJBQ3BDLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDOzRCQUN2QixJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7NEJBRWxCLElBQUksSUFBSSxHQUFHLElBQUEsV0FBSSxFQUFDLFNBQVMsRUFBRSx3Q0FBd0MsQ0FBQyxDQUFDOzRCQUNyRSxJQUFJLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDOzRCQUNsQixJQUFJLEVBQUUsR0FBbUMsSUFBQSxxQkFBSyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQzs0QkFDOUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUM7NEJBQzlCLEVBQUUsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFO2dDQUMxQixPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixJQUFJLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDOzRCQUN0RCxDQUFDLENBQUMsQ0FBQzs0QkFDSCxFQUFFLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRTtnQ0FDMUIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsSUFBSSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQzs0QkFDdEQsQ0FBQyxDQUFDLENBQUE7NEJBQ0YsRUFBRSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQUU7Z0NBQ3pCLElBQUksSUFBSSxLQUFLLENBQUMsRUFBRSxDQUFDO29DQUNiLE9BQU8sQ0FBQyxHQUFHLENBQUMseUJBQXlCLElBQUksRUFBRSxDQUFDLENBQUM7b0NBQzdDLElBQUksR0FBRyxHQUFHLEVBQUUsQ0FBQztvQ0FDYixJQUFJLElBQUEscUJBQVUsRUFBQyxRQUFRLENBQUMsRUFBRSxDQUFDO3dDQUN2QixJQUFJLFFBQVEsR0FBYSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUEsdUJBQVksRUFBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQzt3Q0FDckUsYUFBYTt3Q0FDYixJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxDQUFDO3dDQUMxQixJQUFJLFFBQVEsQ0FBQyxVQUFVLEVBQUUsQ0FBQzs0Q0FDdEIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0RBQ2xELElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs0Q0FDaEYsQ0FBQzt3Q0FDTCxDQUFDO3dDQUNELFFBQVE7d0NBQ1IsSUFBSSxRQUFRLENBQUMsYUFBYSxJQUFJLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDOzRDQUM5RCxHQUFHLElBQUksT0FBTyxDQUFDOzRDQUNmLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dEQUNyRCxHQUFHLElBQUksR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7NENBQ2pHLENBQUM7d0NBQ0wsQ0FBQzt3Q0FDRCxJQUFJLFFBQVEsQ0FBQyxVQUFVLElBQUksUUFBUSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7NENBQ3hELEdBQUcsSUFBSSxPQUFPLENBQUM7NENBQ2YsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0RBQ2xELEdBQUcsSUFBSSxHQUFHLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLFFBQVEsQ0FBQyxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQzs0Q0FDM0YsQ0FBQzt3Q0FDTCxDQUFDO3dDQUNELElBQUksUUFBUSxDQUFDLGVBQWUsSUFBSSxRQUFRLENBQUMsZUFBZSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQzs0Q0FDbEUsR0FBRyxJQUFJLE9BQU8sQ0FBQzs0Q0FDZixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsUUFBUSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnREFDdkQsR0FBRyxJQUFJLEdBQUcsUUFBUSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssUUFBUSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDOzRDQUNyRyxDQUFDO3dDQUNMLENBQUM7d0NBQ0QsSUFBSSxRQUFRLENBQUMsWUFBWSxJQUFJLFFBQVEsQ0FBQyxZQUFZLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDOzRDQUM1RCxHQUFHLElBQUksT0FBTyxDQUFDOzRDQUNmLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxRQUFRLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dEQUNwRCxHQUFHLElBQUksR0FBRyxRQUFRLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxRQUFRLENBQUMsWUFBWSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7NENBQy9GLENBQUM7d0NBQ0wsQ0FBQzt3Q0FDRCxJQUFJLFFBQVEsQ0FBQyxnQkFBZ0IsSUFBSSxRQUFRLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDOzRDQUNwRSxHQUFHLElBQUksT0FBTyxDQUFDOzRDQUNmLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0RBQ3hELEdBQUcsSUFBSSxHQUFHLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssUUFBUSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7NENBQ3ZHLENBQUM7d0NBQ0wsQ0FBQzt3Q0FDRCxJQUFJLFFBQVEsQ0FBQyxhQUFhLElBQUksUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7NENBQzlELEdBQUcsSUFBSSxPQUFPLENBQUM7NENBQ2YsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0RBQ3JELEdBQUcsSUFBSSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQzs0Q0FDakcsQ0FBQzt3Q0FDTCxDQUFDO29DQUNMLENBQUM7b0NBQ0QsSUFBQSxpQkFBUyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsV0FBVyxHQUFHLEVBQUUsQ0FBQyxDQUFDO2dDQUM5QyxDQUFDO3FDQUNJLENBQUM7b0NBQ0YsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsSUFBSSxFQUFFLENBQUMsQ0FBQztvQ0FDMUMsSUFBQSxpQkFBUyxFQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUM7Z0NBQ3ZDLENBQUM7Z0NBQ0QsSUFBSSxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUM7NEJBQzVCLENBQUMsQ0FBQyxDQUFDO3dCQUNQLENBQUMsQ0FBQTt3QkFDRCxJQUFJLEdBQUcsR0FBRyxFQUFFLENBQUM7d0JBQ2IsSUFBSSxXQUFXLEdBQUcsQ0FBQyxDQUFDO3dCQUNwQixJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUM7d0JBQ2xCLElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQzt3QkFDbEIsSUFBSSxZQUFZLEdBQUcsQ0FBQyxDQUFDO3dCQUNyQixJQUFJLHVCQUF1QixHQUFrQixFQUFFLENBQUM7d0JBQ2hELEtBQUssSUFBSSxJQUFJLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDOzRCQUM3QixJQUFJLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztnQ0FDcEIsU0FBUyxFQUFFLENBQUM7Z0NBQ1osSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7b0NBQ2QsV0FBVyxFQUFFLENBQUM7Z0NBQ2xCLENBQUM7Z0NBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztvQ0FDYixTQUFTLEVBQUUsQ0FBQztvQ0FDWixJQUFJLElBQUksQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQzt3Q0FDMUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO29DQUN2QyxDQUFDO2dDQUNMLENBQUM7Z0NBQ0QsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7b0NBQ2YsWUFBWSxFQUFFLENBQUM7Z0NBQ25CLENBQUM7Z0NBQ0QsSUFBSSxTQUFTLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7Z0NBQ2pLLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxTQUFTLElBQUksQ0FBQzs0QkFDckosQ0FBQzt3QkFDTCxDQUFDO3dCQUNELEdBQUcsSUFBSSxPQUFPLFNBQVMsUUFBUSxTQUFTLFFBQVEsV0FBVyxRQUFRLFlBQVksS0FBSyxDQUFDO3dCQUNyRixJQUFJLGVBQWUsRUFBRSxDQUFDOzRCQUNsQixHQUFHLElBQUksZUFBZSxDQUFDO3dCQUMzQixDQUFDO3dCQUNELElBQUksTUFBTSxHQUFHLElBQUksR0FBRyxFQUFvQixDQUFDO3dCQUN6QyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxLQUFLLElBQUksRUFBRTs0QkFDeEIsOENBQThDOzRCQUM5QyxJQUFJLHVCQUF1QixDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztnQ0FDckMsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUM7Z0NBQ3RCLElBQUksY0FBYyxHQUE4RCxFQUFFLENBQUM7Z0NBQ25GLElBQUksWUFBWSxHQUFhLEVBQUUsQ0FBQztnQ0FDaEMsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDO2dDQUNkLE1BQU0sS0FBSyxHQUFHLHVCQUF1QixDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQWlCLEVBQUUsRUFBRTtvQ0FDNUQsSUFBSSxXQUFXLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztvQ0FDNUIsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUM7b0NBQ25DLElBQUksU0FBUyxHQUFjLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUM7b0NBQzdFLEtBQUssRUFBRSxDQUFDO29DQUNSLE9BQU8sU0FBUyxDQUFDLGdCQUFnQixFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUU7d0NBQzdDLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUM7NENBQ2hCLGNBQWMsQ0FBQyxJQUFJLENBQUMsRUFBRSxXQUFXLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDOzRDQUNyRixZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzt3Q0FDakMsQ0FBQztvQ0FDTCxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtvQ0FFbkIsQ0FBQyxDQUFDLENBQUM7Z0NBQ1AsQ0FBQyxDQUFDLENBQUM7Z0NBQ0gsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO2dDQUN6QixJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztnQ0FDdkIsSUFBSSxjQUFjLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO29DQUM1QixJQUFJLE9BQU8sR0FBRyxJQUFJLEdBQUcsRUFBb0IsQ0FBQztvQ0FDMUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxJQUFJLEVBQUU7d0NBQ3pCLE1BQU0sSUFBSSxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUMsQ0FBQzt3Q0FDdEMsUUFBUSxFQUFFLENBQUM7b0NBQ2YsQ0FBQyxDQUFDLENBQUM7b0NBQ0gsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFO3dDQUN2QixRQUFRLEVBQUUsQ0FBQztvQ0FDZixDQUFDLENBQUMsQ0FBQztvQ0FDSCxJQUFJLEtBQUssR0FBRyxFQUFFLENBQUM7b0NBQ2YsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQzt3Q0FDM0MsS0FBSyxJQUFJLEdBQUcsWUFBWSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7b0NBQ25DLENBQUM7b0NBQ0QsSUFBQSxpQkFBUyxFQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxLQUFLLHFCQUFxQixFQUFFLE9BQU8sQ0FBQyxDQUFDO2dDQUN0RSxDQUFDO3FDQUNJLENBQUM7b0NBQ0YsUUFBUSxFQUFFLENBQUM7Z0NBQ2YsQ0FBQzs0QkFDTCxDQUFDO2lDQUNJLENBQUM7Z0NBQ0YsUUFBUSxFQUFFLENBQUM7NEJBQ2YsQ0FBQzt3QkFDTCxDQUFDLENBQUMsQ0FBQzt3QkFDSCxJQUFBLGlCQUFTLEVBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLEdBQUcsUUFBUSxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFDekQsQ0FBQztvQkFDRCxVQUFVO3dCQUNOLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxtQkFBTSxRQUFRLEVBQUcsQ0FBQzt3QkFDcEMsSUFBQSxpQkFBUyxFQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUM7b0JBQ3JDLENBQUM7b0JBQ0QsVUFBVSxDQUFDLElBQWlCO3dCQUN4QixJQUFJLE1BQU0sR0FBRyxJQUFJLEdBQUcsRUFBb0IsQ0FBQzt3QkFDekMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFOzRCQUN0QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQ0FDNUMsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQ0FDNUIsSUFBSSxJQUFJLENBQUMsS0FBSyxLQUFLLElBQUksQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7b0NBQ3ZELElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztvQ0FDM0IsTUFBTTtnQ0FDVixDQUFDOzRCQUNMLENBQUM7d0JBQ0wsQ0FBQyxDQUFDLENBQUM7d0JBQ0gsSUFBQSxpQkFBUyxFQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFDdEQsQ0FBQztvQkFDRCxpQkFBaUI7d0JBQ2IsOEJBQThCO3dCQUM5QixNQUFNLEVBQUUsR0FBRyxDQUFDLFlBQWlCLEVBQUUsRUFBRTs0QkFDN0IsbUNBQW1DOzRCQUNuQyxJQUFJLFlBQVksSUFBSSxDQUFDLENBQUMsWUFBWSxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO2dDQUM3RywwQkFBMEI7Z0NBQzFCLElBQUksSUFBSSxHQUFHLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQztnQ0FDbEUsSUFBSSxJQUFJLEdBQWtCLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7Z0NBQzdDLElBQUksQ0FBQyxRQUFRLEdBQUcsRUFBRSxDQUFDO2dDQUNuQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO29DQUNuQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxtQ0FBUSxRQUFRLEdBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFFLENBQUM7b0NBQy9DLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7b0NBQzFDLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO29DQUN2QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO3dDQUNuQyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksRUFBRSxDQUFDOzRDQUNuRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDOzRDQUNyRCxNQUFNO3dDQUNWLENBQUM7b0NBQ0wsQ0FBQztnQ0FDTCxDQUFDO2dDQUVELDhCQUE4QjtnQ0FDOUIsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO2dDQUVsQiw2QkFBNkI7Z0NBQzdCLElBQUEsaUJBQVMsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDOzRCQUNyQyxDQUFDO2lDQUNJLENBQUM7Z0NBQ0YsSUFBQSxpQkFBUyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsYUFBYSxDQUFDLENBQUM7NEJBQzNDLENBQUM7d0JBQ0wsQ0FBQyxDQUFDO3dCQUNGLElBQUksSUFBSSxDQUFDLFFBQVEsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQzs0QkFDNUMsSUFBSSxNQUFNLEdBQUcsSUFBSSxHQUFHLEVBQW9CLENBQUM7NEJBQ3pDLE1BQU0sQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRTtnQ0FDdkIsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDOzRCQUNuQixDQUFDLENBQUMsQ0FBQzs0QkFDSCxNQUFNLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQzs0QkFDM0IsSUFBQSxpQkFBUyxFQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxDQUFDLENBQUM7d0JBQ2pFLENBQUM7NkJBQ0ksQ0FBQzs0QkFDRixVQUFVLENBQUMsRUFBRSxDQUFDLENBQUM7d0JBQ25CLENBQUM7b0JBQ0wsQ0FBQztvQkFDRCxpQkFBaUI7d0JBQ2IsU0FBUzt3QkFDVCxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQzs0QkFDL0MsSUFBQSxpQkFBUyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUM7NEJBQ3JDLE9BQU87d0JBQ1gsQ0FBQzt3QkFDRCxJQUFJLENBQUM7NEJBQ0QsZUFBZTs0QkFDZixJQUFJLEtBQUssR0FBa0IsRUFBRSxDQUFDOzRCQUM5QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQ0FDNUMsTUFBTSxLQUFtQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFuRCxFQUFFLFFBQVEsRUFBRSxZQUFZLE9BQTJCLEVBQXRCLENBQUMsY0FBOUIsNEJBQWdDLENBQW1CLENBQUM7Z0NBQzFELEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7NEJBQ2xCLENBQUM7NEJBQ0QsTUFBTSxVQUFVLEdBQUcsRUFBRSxLQUFLLEVBQUUsQ0FBQzs0QkFDN0IsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDOzRCQUV2RCxpQkFBaUI7NEJBQ2pCLE1BQU0sV0FBVyxHQUFHLFlBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxVQUFVLENBQUM7NEJBRTlDLGVBQWU7NEJBQ2YsTUFBTSxVQUFVLEdBQUcsSUFBQSxXQUFJLEVBQUMsV0FBVyxFQUFFLFlBQVksQ0FBQyxDQUFDOzRCQUVuRCxrQ0FBa0M7NEJBQ2xDLElBQUEsd0JBQWEsRUFBQyxVQUFVLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDOzRCQUU1QyxZQUFZOzRCQUNaLElBQUEsaUJBQVMsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLG9CQUFvQixZQUFZLEVBQUUsQ0FBQyxDQUFDO3dCQUVoRSxDQUFDO3dCQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7NEJBQ2IsT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7NEJBQzlCLElBQUEsaUJBQVMsRUFBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLGlCQUFpQixDQUFDLENBQUM7d0JBQ2hELENBQUM7b0JBQ0wsQ0FBQztvQkFDRCxxQkFBcUIsQ0FBQyxJQUFhO3dCQUMvQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQzs0QkFDNUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDOzRCQUNyQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7Z0NBQ1IsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDO2dDQUNoQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUM7Z0NBQ2pDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQzs0QkFDakMsQ0FBQzt3QkFDTCxDQUFDO29CQUNMLENBQUM7b0JBQ0QsbUJBQW1CLENBQUMsSUFBYTt3QkFDN0IsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7NEJBQzVDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQzt3QkFDbkMsQ0FBQztvQkFDTCxDQUFDO29CQUNELG9CQUFvQixDQUFDLElBQWE7d0JBQzlCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDOzRCQUM1QyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7d0JBQ3BDLENBQUM7b0JBQ0wsQ0FBQztvQkFDRCxxQkFBcUIsQ0FBQyxJQUFhO3dCQUMvQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQzs0QkFDNUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO3dCQUNqQyxDQUFDO29CQUNMLENBQUM7b0JBQ0QsWUFBWTt3QkFDUixJQUFJLEtBQUssR0FBRyxDQUFDLENBQUM7d0JBQ2QsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7NEJBQzVDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLEVBQUUsQ0FBQztnQ0FDaEMsS0FBSyxFQUFFLENBQUM7NEJBQ1osQ0FBQzt3QkFDTCxDQUFDO3dCQUNELE9BQU8sS0FBSyxDQUFDO29CQUNqQixDQUFDO29CQUNELGNBQWM7d0JBQ1YsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDO3dCQUNkLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDOzRCQUM1QyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxFQUFFLENBQUM7Z0NBQzNELEtBQUssRUFBRSxDQUFDOzRCQUNaLENBQUM7d0JBQ0wsQ0FBQzt3QkFDRCxPQUFPLEtBQUssQ0FBQztvQkFDakIsQ0FBQztvQkFDRCxlQUFlO3dCQUNYLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQzt3QkFDZCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQzs0QkFDNUMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksRUFBRSxDQUFDO2dDQUM1RCxLQUFLLEVBQUUsQ0FBQzs0QkFDWixDQUFDO3dCQUNMLENBQUM7d0JBQ0QsT0FBTyxLQUFLLENBQUM7b0JBQ2pCLENBQUM7b0JBQ0QsWUFBWTt3QkFDUixJQUFJLEtBQUssR0FBRyxDQUFDLENBQUM7d0JBQ2QsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7NEJBQzVDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksRUFBRSxDQUFDO2dDQUMxRCxLQUFLLEVBQUUsQ0FBQzs0QkFDWixDQUFDO3dCQUNMLENBQUM7d0JBQ0QsT0FBTyxLQUFLLENBQUM7b0JBQ2pCLENBQUM7b0JBQ0QsVUFBVSxDQUFDLElBQVk7d0JBQ25CLElBQUksQ0FBQyxJQUFBLHFCQUFVLEVBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQzs0QkFDcEIsSUFBQSxpQkFBUyxFQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsV0FBVyxDQUFDLENBQUM7NEJBQ3ZDLE9BQU87d0JBQ1gsQ0FBQzt3QkFDRCxJQUFJLENBQUM7NEJBQ0QsSUFBQSxvQkFBSSxFQUFDLGFBQWEsSUFBSSxHQUFHLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRTtnQ0FDakMsSUFBSSxLQUFLLEVBQUUsQ0FBQztvQ0FDUixPQUFPLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQztvQ0FDaEMsSUFBQSxpQkFBUyxFQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztnQ0FDakQsQ0FBQzs0QkFDTCxDQUFDLENBQUMsQ0FBQzt3QkFDUCxDQUFDO3dCQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7NEJBQ2IsT0FBTyxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7NEJBQ2hDLElBQUEsaUJBQVMsRUFBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixDQUFDLENBQUM7d0JBQy9DLENBQUM7b0JBQ0wsQ0FBQztvQkFDRCxXQUFXO3dCQUNQLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBQSxXQUFJLEVBQUMsU0FBUyxFQUFFLGtCQUFrQixDQUFDLENBQUMsQ0FBQztvQkFDekQsQ0FBQztvQkFDRCxtQkFBbUIsQ0FBQyxJQUFpQixFQUFFLElBQWE7d0JBQ2hELElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDO3dCQUN6QixJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7NEJBQ1IsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7NEJBQ3BCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDOzRCQUNqQixJQUFJLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQzt3QkFDekIsQ0FBQztvQkFDTCxDQUFDO29CQUNELHFCQUFxQixDQUFDLElBQWlCLEVBQUUsTUFBZTt3QkFDcEQsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQzs0QkFDdEIsSUFBSSxDQUFDLGFBQWEsR0FBRyxFQUFFLENBQUM7d0JBQzVCLENBQUM7d0JBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7NEJBQ3BDLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLENBQUM7d0JBQ25FLENBQUM7d0JBQ0QsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztvQkFDckQsQ0FBQztvQkFDRCxlQUFlLENBQUMsSUFBaUI7d0JBQzdCLElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDOzRCQUNaLElBQUksSUFBSSxHQUFHLHFCQUFTLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsY0FBYyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDOzRCQUN2RSxJQUFJLElBQUksQ0FBQyxhQUFhLElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztnQ0FDekQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQzs0QkFDakQsQ0FBQzs0QkFDRCxPQUFPLElBQUksQ0FBQzt3QkFDaEIsQ0FBQzs2QkFDSSxDQUFDOzRCQUNGLE9BQU8sRUFBRSxDQUFDO3dCQUNkLENBQUM7b0JBQ0wsQ0FBQztvQkFDRCxxQkFBcUIsQ0FBQyxJQUFpQjt3QkFDbkMsSUFBSSxJQUFJLENBQUMsYUFBYSxJQUFJLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7NEJBQ3pELE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxJQUFJLEtBQUssQ0FBQzt3QkFDNUQsQ0FBQzs2QkFDSSxDQUFDOzRCQUNGLE9BQU8sS0FBSyxDQUFDO3dCQUNqQixDQUFDO29CQUNMLENBQUM7b0JBQ0QsYUFBYSxDQUFDLElBQWlCO3dCQUMzQixJQUFJLFVBQVUsR0FBVyxFQUFFLENBQUM7d0JBQzVCLElBQUksSUFBSSxDQUFDLGFBQWEsSUFBSSxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDOzRCQUN6RCxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDOzRCQUN0QyxJQUFJLElBQUEscUJBQVUsRUFBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2dDQUNuQixJQUFJLENBQUM7b0NBQ0QsSUFBSSxXQUFXLEdBQUcsSUFBQSx1QkFBWSxFQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztvQ0FDOUMsSUFBSSxXQUFXLEVBQUUsQ0FBQzt3Q0FDZCwwQkFBMEI7d0NBQzFCLGNBQWM7d0NBQ2QsNENBQTRDO3dDQUM1Qyw0Q0FBNEM7d0NBQzVDLGdDQUFnQzt3Q0FDaEMsMERBQTBEO3dDQUMxRCxpQ0FBaUM7d0NBQ2pDLE1BQU0sWUFBWSxHQUFHLHlCQUF5QixDQUFDO3dDQUMvQyxNQUFNLFdBQVcsR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDO3dDQUVwRCxlQUFlO3dDQUNmLElBQUksV0FBVyxJQUFJLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDOzRDQUNoQyx1Q0FBdUM7NENBQ3ZDLFVBQVUsR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7d0NBQ2hDLENBQUM7d0NBQ0QsT0FBTyxVQUFVLENBQUM7b0NBQ3RCLENBQUM7Z0NBQ0wsQ0FBQztnQ0FBQyxPQUFPLEtBQUssRUFBRSxDQUFDO29DQUNiLE9BQU8sVUFBVSxDQUFDO2dDQUN0QixDQUFDOzRCQUNMLENBQUM7aUNBQ0ksQ0FBQztnQ0FDRixPQUFPLFVBQVUsQ0FBQzs0QkFDdEIsQ0FBQzt3QkFDTCxDQUFDOzZCQUNJLENBQUM7NEJBQ0YsT0FBTyxVQUFVLENBQUM7d0JBQ3RCLENBQUM7b0JBQ0wsQ0FBQztvQkFDRCxpQkFBaUIsQ0FBQyxJQUFpQixFQUFFLFNBQWtCO3dCQUNuRCxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7NEJBQ1IsSUFBQSxpQkFBUyxFQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUM7NEJBQzFDLE9BQU87d0JBQ1gsQ0FBQzt3QkFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDOzRCQUNkLElBQUEsaUJBQVMsRUFBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLGFBQWEsQ0FBQyxDQUFDOzRCQUN6QyxPQUFPO3dCQUNYLENBQUM7d0JBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQzs0QkFDckIsSUFBQSxpQkFBUyxFQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsbUJBQW1CLENBQUMsQ0FBQzs0QkFDL0MsT0FBTzt3QkFDWCxDQUFDO3dCQUVELElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDO3dCQUM1QixRQUFRLENBQUMsQ0FBQyxRQUFRLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQ2xELEdBQUcsRUFBRTs0QkFDRCxJQUFJLENBQUMsZUFBZSxHQUFHLEtBQUssQ0FBQzs0QkFDN0IsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7NEJBQ3ZCLElBQUksU0FBUyxFQUFFLENBQUM7Z0NBQ1osSUFBSSxjQUFjLEdBQUcsQ0FBQyxJQUFZLEVBQUUsSUFBWSxFQUFFLEVBQUU7b0NBQ2hELElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7b0NBQzNCLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7b0NBQzNCLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7b0NBQ2hELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQzt3Q0FDOUIsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7NENBQ3JCLFNBQVM7d0NBQ2IsQ0FBQzt3Q0FDRCxPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7b0NBQzdDLENBQUM7b0NBQ0QsT0FBTyxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7Z0NBQ3JDLENBQUMsQ0FBQztnQ0FDRixJQUFJLE9BQU8sR0FBRyxjQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsU0FBUyxjQUFjLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDO2dDQUMxSCxRQUFRLENBQUMsQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsY0FBYyxFQUFFLGlCQUFpQixDQUFDLEVBQ3hILENBQUMsSUFBNEIsRUFBRSxFQUFFO29DQUM3QixJQUFJLENBQUMsVUFBVSxHQUFHLEtBQUssQ0FBQztvQ0FDeEIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7d0NBQzVDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEtBQUssSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDOzRDQUN4QyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDOzRDQUMvRSxNQUFNO3dDQUNWLENBQUM7b0NBQ0wsQ0FBQztnQ0FDTCxDQUFDLEVBQ0QsR0FBRyxFQUFFO29DQUNELElBQUksQ0FBQyxVQUFVLEdBQUcsS0FBSyxDQUFDO2dDQUM1QixDQUFDLENBQ0osQ0FBQzs0QkFDTixDQUFDO2lDQUNJLENBQUM7Z0NBQ0YsUUFBUSxDQUFDLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQzlCLENBQUMsSUFBeUIsRUFBRSxFQUFFO29DQUMxQixJQUFJLENBQUMsVUFBVSxHQUFHLEtBQUssQ0FBQztvQ0FDeEIsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7d0NBQ2YsSUFBSSxHQUFHLEdBQUcsc0NBQXNDLElBQUksQ0FBQyxLQUFLLFNBQVMsSUFBSSxDQUFDLE9BQU8seUVBQXlFLENBQUE7d0NBQ3hKLElBQUksQ0FBQyxTQUFTLEdBQUcsR0FBRyxDQUFDO3dDQUNyQixPQUFPLENBQUMsR0FBRyxDQUFDLDZCQUE2QixHQUFHLEVBQUUsQ0FBQyxDQUFDO29DQUNwRCxDQUFDO3lDQUNJLENBQUM7d0NBQ0YsSUFBQSxpQkFBUyxFQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUM7b0NBQ3hDLENBQUM7Z0NBQ0wsQ0FBQyxFQUNELEdBQUcsRUFBRTtvQ0FDRCxJQUFJLENBQUMsVUFBVSxHQUFHLEtBQUssQ0FBQztvQ0FDeEIsSUFBQSxpQkFBUyxFQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUM7Z0NBQ3hDLENBQUMsQ0FDSixDQUFDOzRCQUNOLENBQUM7d0JBQ0wsQ0FBQyxFQUNELEdBQUcsRUFBRTs0QkFDRCxJQUFJLENBQUMsZUFBZSxHQUFHLEtBQUssQ0FBQzt3QkFDakMsQ0FBQyxDQUNKLENBQUM7b0JBQ04sQ0FBQztvQkFDRCxXQUFXO3dCQUNQLElBQUksQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFDO29CQUN4QixDQUFDO29CQUNELEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBWTt3QkFDdkIsSUFBSSxJQUFJLEtBQUssRUFBRSxFQUFFLENBQUM7NEJBQ2QsSUFBSSxDQUFDO2dDQUNELE1BQU0sU0FBUyxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7Z0NBQzFDLElBQUEsaUJBQVMsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLGVBQWUsQ0FBQyxDQUFDOzRCQUU3QyxDQUFDOzRCQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7Z0NBQ2IsSUFBQSxpQkFBUyxFQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxLQUFLLEVBQUUsQ0FBQyxDQUFDOzRCQUNqRCxDQUFDO3dCQUNMLENBQUM7b0JBQ0wsQ0FBQztvQkFDRCxXQUFXLENBQUMsSUFBaUIsRUFBRSxPQUFnQjt3QkFDM0MsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7NEJBQ2YsSUFBSSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUM7d0JBQ3pCLENBQUM7d0JBQ0QsSUFBSSxDQUFDLE1BQU0sR0FBRyxPQUFPLENBQUM7b0JBQzFCLENBQUM7b0JBQ0QsWUFBWSxDQUFDLElBQWlCLEVBQUUsT0FBZ0I7d0JBQzVDLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDOzRCQUNkLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDO3dCQUN4QixDQUFDO3dCQUNELElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO29CQUMzQixDQUFDO29CQUNELFVBQVU7d0JBQ04sSUFBSSxJQUFBLHFCQUFVLEVBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQzs0QkFDdkIsSUFBSSxRQUFRLEdBQWEsSUFBQSx1QkFBWSxFQUFDLFFBQVEsQ0FBQyxDQUFDOzRCQUNoRCxJQUFJLFFBQVEsSUFBSSxRQUFRLENBQUMsV0FBVyxFQUFFLENBQUM7Z0NBQ25DLFFBQVEsQ0FBQyxXQUFXLEdBQUcsRUFBRSxDQUFDO2dDQUMxQixJQUFJLFdBQVcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0NBQ3ZELElBQUEsd0JBQWEsRUFBQyxRQUFRLEVBQUUsV0FBVyxFQUFFLE9BQU8sQ0FBQyxDQUFDOzRCQUNsRCxDQUFDO3dCQUNMLENBQUM7d0JBQ0QsSUFBSSxRQUFRLEdBQWE7NEJBQ3JCLFNBQVMsRUFBRTtnQ0FDUCxlQUFlLEVBQUUsRUFBRTtnQ0FDbkIsMEJBQTBCLEVBQUUsRUFBRTtnQ0FDOUIsNEJBQTRCLEVBQUUsRUFBRTs2QkFDbkM7NEJBQ0QsZ0JBQWdCLEVBQUUsRUFBRTs0QkFDcEIsVUFBVSxFQUFFLEVBQUU7NEJBQ2QsV0FBVyxFQUFFLEVBQUU7eUJBQ2xCLENBQUM7d0JBQ0YsSUFBSSxZQUFZLEdBQUcsS0FBSyxDQUFDO3dCQUN6QixJQUFJLEtBQUssR0FBa0IsRUFBRSxDQUFDO3dCQUM5QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQzs0QkFDNUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsbUNBQVEsUUFBUSxHQUFLLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUUsQ0FBQzs0QkFDeEQsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksRUFBRSxDQUFDO2dDQUNoQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDOzRCQUN6SSxDQUFDOzRCQUVELElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQ0FDNUIsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO29DQUNoQixZQUFZLEdBQUcsSUFBSSxDQUFDO29DQUNwQixRQUFRLENBQUMsU0FBUyxxQkFBUSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBRSxDQUFDO2dDQUMxRCxDQUFDOzRCQUNMLENBQUM7NEJBRUQsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsVUFBVSxFQUFFLENBQUM7Z0NBQ3BLLFFBQVEsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDO29DQUN0QixLQUFLLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLO29DQUM3QixVQUFVLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxVQUFVO2lDQUNsRixDQUFDLENBQUM7Z0NBQ0gsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFVBQVUsQ0FBQzs0QkFDL0UsQ0FBQzs0QkFFRCxNQUFNLEtBQW1DLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQW5ELEVBQUUsUUFBUSxFQUFFLFlBQVksT0FBMkIsRUFBdEIsQ0FBQyxjQUE5Qiw0QkFBZ0MsQ0FBbUIsQ0FBQzs0QkFDMUQsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFDbEIsQ0FBQzt3QkFFRCxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxDQUFDO3dCQUUxQixJQUFJLElBQUksR0FBRyxFQUFFLEtBQUssRUFBRSxDQUFDO3dCQUNyQixJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7d0JBQy9DLElBQUEsd0JBQWEsRUFBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO3dCQUUzQyxJQUFJLFdBQVcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7d0JBQ3ZELElBQUEsd0JBQWEsRUFBQyxRQUFRLEVBQUUsV0FBVyxFQUFFLE9BQU8sQ0FBQyxDQUFDO29CQUNsRCxDQUFDO29CQUNELGNBQWM7d0JBQ1YsTUFBTSxFQUFFLEdBQUcsQ0FBQyxJQUF3QixFQUFFLEVBQUU7NEJBQ3BDLElBQUksSUFBSSxFQUFFLENBQUM7Z0NBQ1AsSUFBSSxJQUFJLENBQUMsUUFBUSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO29DQUM1QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQzt3Q0FDNUMsSUFBSSxJQUFJLEdBQWdCLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7d0NBQ3pDLElBQUksSUFBSSxDQUFDLE9BQU8sS0FBSyxrQkFBa0IsRUFBRSxDQUFDOzRDQUN0QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dEQUNuQyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEtBQUssSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO29EQUMvQixJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7b0RBQ2xDLE1BQU07Z0RBQ1YsQ0FBQzs0Q0FDTCxDQUFDO3dDQUNMLENBQUM7b0NBQ0wsQ0FBQztvQ0FDRCxJQUFBLGlCQUFTLEVBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztvQ0FDbkMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO2dDQUN0QixDQUFDO3FDQUNJLENBQUM7b0NBQ0YsSUFBQSxpQkFBUyxFQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUM7Z0NBQzlDLENBQUM7NEJBQ0wsQ0FBQztpQ0FDSSxDQUFDO2dDQUNGLElBQUEsaUJBQVMsRUFBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLG1CQUFtQixDQUFDLENBQUM7NEJBQ25ELENBQUM7d0JBQ0wsQ0FBQyxDQUFDO3dCQUNGLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQztvQkFDbkIsQ0FBQztvQkFDRCxLQUFLLENBQUMsT0FBTyxDQUFDLElBQWlCO3dCQUMzQixJQUFJLFdBQVcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO3dCQUM1QixJQUFJLE1BQU0sR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7d0JBQzdELElBQUksTUFBTSxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQzt3QkFDaEUsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDOzRCQUNmLElBQUEsaUJBQVMsRUFBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDOzRCQUNyQyxPQUFPO3dCQUNYLENBQUM7d0JBQ0QsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDOzRCQUNWLElBQUEsaUJBQVMsRUFBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLFVBQVUsQ0FBQyxDQUFDOzRCQUN0QyxPQUFPO3dCQUNYLENBQUM7d0JBQ0QsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDOzRCQUNWLE1BQU0sR0FBRyxRQUFRLENBQUM7d0JBQ3RCLENBQUM7d0JBQ0QsSUFBSSxTQUFTLEdBQWMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLEVBQUUsRUFBRSxXQUFXLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQzt3QkFDekUsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUM7d0JBQ3RCLElBQUksTUFBTSxHQUFHLE1BQU0sU0FBUyxDQUFDLGNBQWMsQ0FBQyxFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO3dCQUMxRixJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQzt3QkFDdkIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQzs0QkFDbEIsSUFBQSxpQkFBUyxFQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDOzRCQUMxQyxPQUFPO3dCQUNYLENBQUM7d0JBQ0QsSUFBQSxpQkFBUyxFQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7b0JBQ3RDLENBQUM7b0JBQ0QsVUFBVTt3QkFDTixJQUFJLE9BQU8sR0FBOEQsRUFBRSxDQUFDO3dCQUM1RSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQzs0QkFDNUMsTUFBTSxJQUFJLEdBQWdCLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7NEJBQzNDLElBQUksSUFBSSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUM7Z0NBQ3ZELE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxXQUFXLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQzs0QkFDOUcsQ0FBQzt3QkFDTCxDQUFDO3dCQUNELElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7b0JBQzdCLENBQUM7b0JBQ0QsS0FBSyxDQUFDLFVBQVUsQ0FBQyxPQUFrRTt3QkFDL0UsSUFBSSxLQUFLLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQzt3QkFDM0IsSUFBSSxLQUFLLEdBQUcsQ0FBQyxFQUFFLENBQUM7NEJBQ1osSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUM7NEJBQ3RCLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQzs0QkFDZCxJQUFJLFdBQVcsR0FBYSxFQUFFLENBQUM7NEJBQy9CLE1BQU0sU0FBUyxHQUFHLENBQUMsS0FBYSxFQUFFLEVBQUU7Z0NBQ2hDLElBQUksS0FBSyxLQUFLLEtBQUssRUFBRSxDQUFDO29DQUNsQixJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztvQ0FDdkIsSUFBSSxPQUFPLEdBQUcsRUFBRSxDQUFDO29DQUNqQixJQUFJLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7d0NBQ3pCLE9BQU8sR0FBRyxJQUFJLEdBQUcsU0FBUyxHQUFHLElBQUksQ0FBQzt3Q0FDbEMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQzs0Q0FDMUMsT0FBTyxJQUFJLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7d0NBQ3JDLENBQUM7d0NBQ0QsT0FBTyxJQUFJLE1BQU0sS0FBSyxFQUFFLENBQUM7b0NBQzdCLENBQUM7b0NBQ0QsSUFBQSxpQkFBUyxFQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsT0FBTyxPQUFPLEVBQUUsQ0FBQyxDQUFDO2dDQUNoRCxDQUFDOzRCQUNMLENBQUMsQ0FBQTs0QkFFRCxJQUFJLEtBQUssR0FBRyxDQUFDLENBQUM7NEJBQ2QsSUFBSSxNQUFNLEdBQVcsRUFBRSxDQUFDOzRCQUN4QixNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7Z0NBQy9CLElBQUksRUFBRSxXQUFXLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQztnQ0FDM0MsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO29DQUNWLE1BQU0sR0FBRyxRQUFRLENBQUM7Z0NBQ3RCLENBQUM7Z0NBQ0QsSUFBSSxTQUFTLEdBQWMsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsRUFBRSxXQUFXLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztnQ0FDN0UsS0FBSyxFQUFFLENBQUM7Z0NBQ1IsT0FBTyxTQUFTLENBQUMsY0FBYyxDQUFDLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7b0NBQzFGLEtBQUssRUFBRSxDQUFDO29DQUNSLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7d0NBQ2xCLFdBQVcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDO29DQUN6QyxDQUFDO29DQUNELFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztnQ0FDdEIsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7b0NBQ2YsTUFBTSxJQUFJLEtBQUssR0FBRyxJQUFJLENBQUM7b0NBQ3ZCLEtBQUssRUFBRSxDQUFDO29DQUNSLFdBQVcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7b0NBQzlCLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztnQ0FDdEIsQ0FBQyxDQUFDLENBQUM7NEJBQ1AsQ0FBQyxDQUFDLENBQUM7NEJBRUgsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDOzRCQUN6QixPQUFPLElBQUksQ0FBQzt3QkFDaEIsQ0FBQztvQkFDTCxDQUFDO29CQUNELFNBQVMsQ0FBQyxJQUFpQixFQUFFLE1BQWM7d0JBQ3ZDLElBQUksSUFBSSxFQUFFLENBQUM7NEJBQ1AsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQ0FDbEIsSUFBSSxDQUFDLFNBQVMsR0FBRyxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRSxDQUFDOzRCQUNuRCxDQUFDOzRCQUNELElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQzt3QkFDbkMsQ0FBQztvQkFDTCxDQUFDO29CQUNELFlBQVksQ0FBQyxJQUFpQixFQUFFLFNBQWlCO3dCQUM3QyxJQUFJLElBQUksRUFBRSxDQUFDOzRCQUNQLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7Z0NBQ2xCLElBQUksQ0FBQyxTQUFTLEdBQUcsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxFQUFFLEVBQUUsQ0FBQzs0QkFDbkQsQ0FBQzs0QkFDRCxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7d0JBQ3pDLENBQUM7b0JBQ0wsQ0FBQztvQkFDRCxnQkFBZ0I7d0JBQ1osSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO3dCQUNsQixJQUFBLGlCQUFTLEVBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztvQkFDdEMsQ0FBQztvQkFDRCxZQUFZLENBQUMsS0FBYSxFQUFFLElBQTZDO3dCQUNyRSxJQUFJLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQzt3QkFDbkMsSUFBSSxTQUFTLEdBQWMsSUFBSSxDQUFDO3dCQUNoQyxJQUFJLEtBQUssSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQzs0QkFDdEMsU0FBUyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7NEJBQ25DLFNBQVMsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUM7d0JBQ3JDLENBQUM7NkJBQ0ksQ0FBQzs0QkFDRixTQUFTLEdBQUcsSUFBSSxxQkFBUyxDQUFDLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsQ0FBQyxHQUFXLEVBQUUsRUFBRSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxXQUFXLEtBQUssR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7NEJBQ2xJLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO3dCQUNwQyxDQUFDO3dCQUNELE9BQU8sU0FBUyxDQUFDO29CQUNyQixDQUFDO29CQUNELFdBQVcsQ0FBQyxJQUFpQjt3QkFDekIsSUFBSSxJQUFJLENBQUMsUUFBUSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDOzRCQUM1QyxJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQzs0QkFDeEMsSUFBSSxLQUFLLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0NBQ1osSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQ0FDM0IsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUM7Z0NBQ3hCLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxDQUFDO2dDQUMzQixJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7NEJBQ3RCLENBQUM7d0JBQ0wsQ0FBQztvQkFDTCxDQUFDO2lCQUNKO2dCQUNELFFBQVEsRUFBRSxJQUFBLHVCQUFZLEVBQUMsSUFBQSxXQUFJLEVBQUMsU0FBUyxFQUFFLDJDQUEyQyxDQUFDLEVBQUUsT0FBTyxDQUFDO2FBQ2hHLENBQUMsQ0FBQyxDQUFDO1lBQ0osR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3RCLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ2hDLENBQUM7SUFDTCxDQUFDO0lBQ0QsV0FBVztJQUNYLENBQUM7SUFDRCxLQUFLO1FBQ0QsTUFBTSxHQUFHLEdBQUcsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNuQyxJQUFJLEdBQUcsRUFBRSxDQUFDO1lBQ04sSUFBSSxJQUFBLHFCQUFVLEVBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztnQkFDdkIsSUFBSSxRQUFRLEdBQWEsSUFBQSx1QkFBWSxFQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUNoRCxJQUFJLFFBQVEsRUFBRSxDQUFDO29CQUNYLFFBQVEsQ0FBQyxVQUFVLEdBQUcsRUFBRSxDQUFDO29CQUN6QixJQUFJLFFBQVEsQ0FBQyxhQUFhLEVBQUUsQ0FBQzt3QkFDekIsT0FBTyxRQUFRLENBQUMsYUFBYSxDQUFDO29CQUNsQyxDQUFDO29CQUNELElBQUksUUFBUSxDQUFDLFVBQVUsRUFBRSxDQUFDO3dCQUN0QixPQUFPLFFBQVEsQ0FBQyxVQUFVLENBQUM7b0JBQy9CLENBQUM7b0JBQ0QsSUFBSSxRQUFRLENBQUMsZUFBZSxFQUFFLENBQUM7d0JBQzNCLE9BQU8sUUFBUSxDQUFDLGVBQWUsQ0FBQztvQkFDcEMsQ0FBQztvQkFDRCxJQUFJLFFBQVEsQ0FBQyxZQUFZLEVBQUUsQ0FBQzt3QkFDeEIsT0FBTyxRQUFRLENBQUMsWUFBWSxDQUFDO29CQUNqQyxDQUFDO29CQUNELElBQUksUUFBUSxDQUFDLGdCQUFnQixFQUFFLENBQUM7d0JBQzVCLE9BQU8sUUFBUSxDQUFDLGdCQUFnQixDQUFDO29CQUNyQyxDQUFDO29CQUNELElBQUksUUFBUSxDQUFDLGFBQWEsRUFBRSxDQUFDO3dCQUN6QixPQUFPLFFBQVEsQ0FBQyxhQUFhLENBQUM7b0JBQ2xDLENBQUM7b0JBQ0QsSUFBSSxRQUFRLENBQUMsV0FBVyxFQUFFLENBQUM7d0JBQ3ZCLE9BQU8sUUFBUSxDQUFDLFdBQVcsQ0FBQztvQkFDaEMsQ0FBQztvQkFDRCxJQUFJLFdBQVcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7b0JBQ3ZELElBQUEsd0JBQWEsRUFBQyxRQUFRLEVBQUUsV0FBVyxFQUFFLE9BQU8sQ0FBQyxDQUFDO2dCQUNsRCxDQUFDO1lBQ0wsQ0FBQztZQUVELEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNsQixDQUFDO0lBQ0wsQ0FBQztDQUNKLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIHZ1ZS9vbmUtY29tcG9uZW50LXBlci1maWxlICovXG5cbmltcG9ydCB7IENoaWxkUHJvY2Vzc1dpdGhvdXROdWxsU3RyZWFtcywgc3Bhd24sIGV4ZWMgfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCB7IGV4aXN0c1N5bmMsIHJlYWRGaWxlU3luYywgcmVhZEpTT05TeW5jLCB3cml0ZUZpbGVTeW5jIH0gZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IHBhdGgsIHsgam9pbiB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgY3JlYXRlQXBwLCBBcHAsIGRlZmluZUNvbXBvbmVudCB9IGZyb20gJ3Z1ZSc7XG5pbXBvcnQgb3MgZnJvbSAnb3MnO1xuaW1wb3J0IENmZ1V0aWxzIGZyb20gJy4vQ2ZnVXRpbHMnO1xuaW1wb3J0ICogYXMgWExTWCBmcm9tICd4bHN4JztcbmltcG9ydCB7IEZpbGVVdGlscyB9IGZyb20gJy4vRmlsZVV0aWxzJztcbmltcG9ydCB7IEdpdEhlbHBlciB9IGZyb20gJy4vR2l0SGVscGVyJztcbmNvbnN0IHBhbmVsRGF0YU1hcCA9IG5ldyBXZWFrTWFwPGFueSwgQXBwPigpO1xuLyoqXG4gKiBAemgg5aaC5p6c5biM5pyb5YW85a65IDMuMyDkuYvliY3nmoTniYjmnKzlj6/ku6Xkvb/nlKjkuIvmlrnnmoTku6PnoIFcbiAqIEBlbiBZb3UgY2FuIGFkZCB0aGUgY29kZSBiZWxvdyBpZiB5b3Ugd2FudCBjb21wYXRpYmlsaXR5IHdpdGggdmVyc2lvbnMgcHJpb3IgdG8gMy4zXG4gKi9cbi8vIEVkaXRvci5QYW5lbC5kZWZpbmUgPSBFZGl0b3IuUGFuZWwuZGVmaW5lIHx8IGZ1bmN0aW9uKG9wdGlvbnM6IGFueSkgeyByZXR1cm4gb3B0aW9ucyB9XG5cbmludGVyZmFjZSBQYWNrUHJvamVjdCB7XG4gICAgYXBwSWQ6IHN0cmluZyxcbiAgICBuYW1lOiBzdHJpbmcsXG4gICAgcGF0aDogc3RyaW5nLC8vIENvY29z6aG555uu5qC555uu5b2VXG4gICAgY2hhbm5lbDogc3RyaW5nLC8vIOaMh+WumuaJk+WMheWvueW6lOa4oOmBk+WQjeensFxuICAgIHNraXA6IGJvb2xlYW4sLy8g5piv5ZCm6Lez6L+HY29jb3PmnoTlu7rlt6XnqIvvvIznm7TmjqXkvb/nlKjlr7zlh7rlt6XnqItcbiAgICB1cGxvYWQ6IGJvb2xlYW4sLy8g5piv5ZCm6ZyA6KaB5LiK5LygIOS4jnByZXZpZXfkupLmlqVcbiAgICBuZWVkQXV0b1BhY2s6IGJvb2xlYW4sLy8g5piv5ZCm6ZyA6KaB6L+b6KGM6Ieq5Yqo5p6E5bu65LiK5LygXG4gICAgcGxhdGZvcm1GaWxlczogeyBba2V5OiBzdHJpbmddOiB7IHBhdGg6IHN0cmluZywgaXNUZXN0OiBib29sZWFuLCBhcGlWZXJzaW9uPzogc3RyaW5nIH0gfSwvLyBrZXnlubPlj7DlkI3np7DkuI5jaGFubmVs5a+55bqU77yMdmFsdWXmuLjmiI/lt6XnqIvkuK3lubPlj7DnmoTphY3nva7mlofku7ZcbiAgICBwb3N0VG9EaW5nVGFsazogYm9vbGVhbiwvLyDmmK/lkKbmjqjpgIHpkonpkoljb2Nvc+aehOW7uue7k+aenFxuICAgIHBvc3RUb0RpbmdUYWxrMjogYm9vbGVhbiwvLyDmmK/lkKbmjqjpgIHpkonpkoljbGnkuIrkvKDmiJbpooTop4jnu5PmnpxcbiAgICBtZDVDYWNoZTogYm9vbGVhbixcbiAgICBzb3VyY2VNYXBzOiBib29sZWFuLFxuICAgIGN1c3RvbUNvbmZpZ1BhdGg6IHN0cmluZywvL+iHquWumuS5ieaehOW7uuaooeadv2pzb27ot6/lvoRcbiAgICBtYWluQnVuZGxlQ29tcHJlc3Npb25UeXBlOiBzdHJpbmcsLy/kuLvljIXljovnvKnnsbvlnosgIOaXoOWOi+e8qe+8miBcIm5vbmVcIiAg5ZCI5bm25L6d6LWW77yaIFwibWVyZ2VfZGVwXCIgIOWQiOW5tuaJgOaciUpTT07vvJogXCJtZXJnZV9hbGxfanNvblwiICBaSVDvvJogXCJ6aXBcIiAg5bCP5ri45oiP5YiG5YyF77yaIFwic3VicGFja2FnZVwiXG4gICAgZW5naW5lUGF0aDogc3RyaW5nLC8vIGNvY29z5byV5pOO6Lev5b6EXG4gICAgZW5naW5lVmVyOiBzdHJpbmcsLy8gY29jb3PlvJXmk47niYjmnKxcbiAgICBuYXZpZ2F0aW9uQmFyVGV4dFN0eWxlOiBzdHJpbmcsLy8g5a+86Iiq5qCP5qCH6aKY6aKc6ImyXG4gICAgcHJldmlldzogYm9vbGVhbiwvLyDmmK/lkKbpooTop4gg5LiOdXBsb2Fk5LqS5palXG4gICAgdGJfY2xpX3Rva2VuPzogc3RyaW5nLC8vIHRhb2JhbyBjbGkgdG9rZW5cbiAgICBkaW5nVGFsaz86IERpbmdUYWxrLC8vIOmSiemSieacuuWZqOS6uumFjee9rlxuICAgIGdpdENvbmZpZz86IEdpdENvbmZpZywvLyBnaXTphY3nva5cbn1cbmNvbnN0IHBhY2tzUGF0aCA9IGpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vc3RhdGljL3BhY2tjb25maWdzL1BhY2tzLmpzb24nKTtcbmNvbnN0IHNhdmVQYXRoID0gam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi9zdGF0aWMvcGFja2NvbmZpZ3Mvc2F2ZS5qc29uJyk7XG5cbi8vIOWvueW6lOW3peeoi+S4reS4jeWQjOW5s+WPsOS9v+eUqOeahOmFjee9rlxuY29uc3QgUGxhdGZvcm1Db25maWcgPSB7XG4gICAgJ3Rhb2Jhby1taW5pLWdhbWUnOiAnUGxhdGZvcm1Db25maWdfdGFvYmFvLnRzJ1xufVxuXG5pbnRlcmZhY2UgVGFvQmFvX0NsaV9Ub2tlbiB7XG4gICAgYXBwaWQ6IHN0cmluZyxcbiAgICBuYW1lOiBzdHJpbmcsXG4gICAgdG9rZW46IHN0cmluZ1xufVxuXG5pbnRlcmZhY2UgRGluZ1RhbGsge1xuICAgIGRpbmdUYWxrV2ViSG9vazogc3RyaW5nLFxuICAgIGRpbmdUYWxrQ3VzdG9tQ29udGVudF9wYWNrOiBzdHJpbmcsXG4gICAgZGluZ1RhbGtDdXN0b21Db250ZW50X3VwbG9hZDogc3RyaW5nXG59XG5cbmludGVyZmFjZSBRUkNvZGUge1xuICAgIGFwcGlkOiBzdHJpbmcsXG4gICAgdXJsOiBzdHJpbmdcbn1cblxuaW50ZXJmYWNlIEFwaVZlcnNpb24ge1xuICAgIGFwcGlkOiBzdHJpbmcsXG4gICAgYXBpVmVyc2lvbjogc3RyaW5nXG59XG5cbmludGVyZmFjZSBTYXZlRGF0YSB7XG4gICAgZGluZ190YWxrOiBEaW5nVGFsayxcbiAgICB0YW9iYW9fY2xpX3Rva2VuOiBUYW9CYW9fQ2xpX1Rva2VuW10sXG4gICAgcXJDb2RlVXJsczogUVJDb2RlW10sXG4gICAgc3VjY2Vzc2VkUGFjaz86IHN0cmluZ1tdLFxuICAgIGZhaWxlZFBhY2s/OiBzdHJpbmdbXSxcbiAgICBzdWNjZXNzZWRVcGxvYWQ/OiBzdHJpbmdbXSxcbiAgICBmYWlsZWRVcGxvYWQ/OiBzdHJpbmdbXSxcbiAgICBzdWNjZXNzZWRQcmV2aWV3Pzogc3RyaW5nW10sXG4gICAgZmFpbGVkUHJldmlldz86IHN0cmluZ1tdLFxuICAgIGFwaVZlcnNpb25zPzogQXBpVmVyc2lvbltdXG59XG5cbmludGVyZmFjZSBHaXRDb25maWcge1xuICAgIGdpdFVybDogc3RyaW5nLFxuICAgIGdpdEJyYW5jaDogc3RyaW5nXG59XG5cbmNvbnN0IFRhc2tUZW1wOiBQYWNrUHJvamVjdCA9IHtcbiAgICBhcHBJZDogJycsXG4gICAgbmFtZTogJycsXG4gICAgcGF0aDogJycsXG4gICAgY2hhbm5lbDogJ3Rhb2Jhby1taW5pLWdhbWUnLFxuICAgIHNraXA6IGZhbHNlLFxuICAgIHVwbG9hZDogZmFsc2UsXG4gICAgbmVlZEF1dG9QYWNrOiBmYWxzZSxcbiAgICBwbGF0Zm9ybUZpbGVzOiB7XG4gICAgICAgICd0YW9iYW8tbWluaS1nYW1lJzoge1xuICAgICAgICAgICAgcGF0aDogJycsXG4gICAgICAgICAgICBpc1Rlc3Q6IGZhbHNlXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHBvc3RUb0RpbmdUYWxrOiBmYWxzZSxcbiAgICBwb3N0VG9EaW5nVGFsazI6IGZhbHNlLFxuICAgIG1kNUNhY2hlOiBmYWxzZSxcbiAgICBzb3VyY2VNYXBzOiBmYWxzZSxcbiAgICBjdXN0b21Db25maWdQYXRoOiAnJyxcbiAgICBtYWluQnVuZGxlQ29tcHJlc3Npb25UeXBlOiAnbm9uZScsXG4gICAgZW5naW5lUGF0aDogJycsXG4gICAgZW5naW5lVmVyOiAnJyxcbiAgICBuYXZpZ2F0aW9uQmFyVGV4dFN0eWxlOiAnYmxhY2snLFxuICAgIHByZXZpZXc6IGZhbHNlXG59O1xuXG5jb25zdCBzcGF3bl90YiA9IChhcmdzOiBzdHJpbmdbXSwgc3VjY2VzczogRnVuY3Rpb24sIGZhaWw6IEZ1bmN0aW9uKSA9PiB7XG4gICAgbGV0IHNwOiBDaGlsZFByb2Nlc3NXaXRob3V0TnVsbFN0cmVhbXMgPSBzcGF3bihcInRiZ2FtZVwiLCBhcmdzLCB7IHNoZWxsOiB0cnVlIH0pO1xuICAgIHNwLnN0ZG91dC5zZXRFbmNvZGluZygndXRmOCcpO1xuICAgIGxldCBjb21tb25kU3RyID0gc3Auc3Bhd25hcmdzWzRdLnJlcGxhY2UoL1wiL2csICcnKTtcbiAgICBsZXQgY2xpVG9rZW5GYWlsZWQgPSBmYWxzZTtcbiAgICBsZXQgdmVyc2lvbiA9ICcnO1xuICAgIGxldCBwcmV2aWV3VXJsID0gJyc7XG4gICAgbGV0IG5leHREYXRhSXNRckNvZGUgPSBmYWxzZTtcblxuICAgIHNwLnN0ZG91dC5vbignZGF0YScsIChkYXRhKSA9PiB7XG4gICAgICAgIGlmIChuZXh0RGF0YUlzUXJDb2RlKSB7XG4gICAgICAgICAgICBuZXh0RGF0YUlzUXJDb2RlID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgc3Bhd25fdGI6ICR7Y29tbW9uZFN0cn0gc3Rkb3V0ICR7ZGF0YS50b1N0cmluZygpfWApO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXRhLmluZGV4T2YoJ+acgOaWsOe6v+S4iueJiOacrDonKSA+IC0xKSB7XG4gICAgICAgICAgICBsZXQgc3RyOiBzdHJpbmcgPSBkYXRhLnRyaW0oKTtcbiAgICAgICAgICAgIGxldCBhcnIgPSBzdHIuc3BsaXQoJ+acgOaWsOe6v+S4iueJiOacrDonKTtcbiAgICAgICAgICAgIHZlcnNpb24gPSBhcnJbMV0udHJpbSgpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXRhLmluZGV4T2YoJ+mihOiniOS6jOe7tOeggeWcsOWdgO+8micpID4gLTEpIHtcbiAgICAgICAgICAgIGxldCBzdHI6IHN0cmluZyA9IGRhdGEudHJpbSgpO1xuICAgICAgICAgICAgbGV0IGFyciA9IHN0ci5zcGxpdCgn6aKE6KeI5LqM57u056CB5Zyw5Z2A77yaJyk7XG4gICAgICAgICAgICBwcmV2aWV3VXJsID0gYXJyWzFdLnRyaW0oKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF0YS5pbmRleE9mKCflt7LlpI3liLbpooTop4jnoIHliLDliarotLTmnb8nKSA+IC0xKSB7XG4gICAgICAgICAgICBuZXh0RGF0YUlzUXJDb2RlID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHNwLnN0ZGVyci5vbignZGF0YScsIChkYXRhKSA9PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKGBzcGF3bl90YjogJHtjb21tb25kU3RyfSBzdGRlcnIgJHtkYXRhLnRvU3RyaW5nKCl9YCk7XG4gICAgICAgIGlmIChkYXRhLmluZGV4T2YoJ0NMSSBhdXRoIGZhaWxlZCcpID4gLTEpIHtcbiAgICAgICAgICAgIGNsaVRva2VuRmFpbGVkID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHNwLm9uKCdleGl0JywgYXN5bmMgKGNvZGUsIGRhdGEpID0+IHtcbiAgICAgICAgaWYgKGNvZGUgPT09IDApIHtcbiAgICAgICAgICAgIGlmIChjbGlUb2tlbkZhaWxlZCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBzcGF3bl90YjogJHtjb21tb25kU3RyfSBmYWlsZWQg6K6+572u6LCD55So5Yet6K+BVG9rZW7plJnor69gKTtcbiAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAnd2FybicsICforr7nva7osIPnlKjlh63or4FUb2tlbumUmeivryEnKTtcbiAgICAgICAgICAgICAgICBmYWlsICYmIGZhaWwoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBzcGF3bl90YjogJHtjb21tb25kU3RyfSBzdWNjZXNzYCk7XG4gICAgICAgICAgICAgICAgc3VjY2VzcyAmJiBzdWNjZXNzKHsgdmVyc2lvbiwgcHJldmlld1VybCB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBzcGF3bl90YjogJHtjb21tb25kU3RyfSBmYWlsZWRgKTtcbiAgICAgICAgICAgIGZhaWwgJiYgZmFpbCgpO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG5leHBvcnQgY29uc3Qgb3BlbkRpbG9nID0gYXN5bmMgKHR5cGU6IHN0cmluZywgdGl0bGU6IHN0cmluZywgbWVzc2FnZTogc3RyaW5nLCBidG5NYXA/OiBNYXA8c3RyaW5nLCBGdW5jdGlvbj4sIGNhbmNlbD86IG51bWJlcikgPT4ge1xuICAgIGxldCBvcHRpb246IEVkaXRvci5EaWFsb2cuTWVzc2FnZURpYWxvZ09wdGlvbnMgPSB7XG4gICAgICAgIHRpdGxlXG4gICAgfTtcbiAgICBpZiAoYnRuTWFwKSB7XG4gICAgICAgIG9wdGlvbi5idXR0b25zID0gW107XG4gICAgICAgIGJ0bk1hcC5mb3JFYWNoKCh2YWx1ZSwga2V5KSA9PiB7XG4gICAgICAgICAgICBvcHRpb24uYnV0dG9ucy5wdXNoKGtleSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBpZiAoY2FuY2VsICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgb3B0aW9uLmNhbmNlbCA9IGNhbmNlbDtcbiAgICB9XG4gICAgbGV0IGNvZGU6IHsgcmVzcG9uc2U6IDAsIGNoZWNrYm94Q2hlY2tlZDogZmFsc2UgfSA9IGF3YWl0IEVkaXRvci5EaWFsb2dbdHlwZV0obWVzc2FnZSwgb3B0aW9uKTtcbiAgICBpZiAoYnRuTWFwKSB7XG4gICAgICAgIGxldCBrZXkgPSBvcHRpb24uYnV0dG9uc1tjb2RlLnJlc3BvbnNlXTtcbiAgICAgICAgaWYgKGJ0bk1hcC5oYXMoa2V5KSkge1xuICAgICAgICAgICAgbGV0IGZ1bmMgPSBidG5NYXAuZ2V0KGtleSk7XG4gICAgICAgICAgICBpZiAoZnVuYykge1xuICAgICAgICAgICAgICAgIGZ1bmMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuY29uc3QgaW1wb3J0RnVuYyA9IChjYjogRnVuY3Rpb24pID0+IHtcbiAgICAvLyAxLiDliqjmgIHliJvlu7rkuIDkuKrpmpDol4/nmoQgaW5wdXQg5qCH562+XG4gICAgY29uc3QgaW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbnB1dCcpO1xuICAgIGlucHV0LnR5cGUgPSAnZmlsZSc7XG4gICAgLy8g6ZmQ5Yi25Y+q6IO96YCJ5oupIGpzb24g5paH5Lu277yM5aaC5p6c5a+85YWlIEV4Y2VsIOWPr+S7peaUueS4uiAnLnhsc3gsIC54bHMnXG4gICAgaW5wdXQuYWNjZXB0ID0gJy5qc29uLC54bHN4LC54bHMnO1xuICAgIGlucHV0LnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG5cbiAgICAvLyAyLiDnm5HlkKzmlofku7bpgInmi6nnmoTlj5jljJZcbiAgICBpbnB1dC5vbmNoYW5nZSA9IChlKSA9PiB7XG4gICAgICAgIGNvbnN0IGZpbGUgPSAoZS50YXJnZXQgYXMgSFRNTElucHV0RWxlbWVudCkuZmlsZXM/LlswXTtcbiAgICAgICAgaWYgKCFmaWxlKSByZXR1cm47XG5cbiAgICAgICAgLy8g6I635Y+W5paH5Lu25ZCO57yA5ZCN77yM5Yik5pat5paH5Lu257G75Z6LXG4gICAgICAgIGNvbnN0IGZpbGVOYW1lID0gZmlsZS5uYW1lO1xuICAgICAgICBjb25zdCBmaWxlRXh0ID0gZmlsZU5hbWUuc2xpY2UoZmlsZU5hbWUubGFzdEluZGV4T2YoJy4nKSkudG9Mb3dlckNhc2UoKTtcblxuICAgICAgICAvLyAzLiDkvb/nlKggRmlsZVJlYWRlciDor7vlj5bmlofku7blhoXlrrlcbiAgICAgICAgY29uc3QgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcbiAgICAgICAgcmVhZGVyLm9ubG9hZCA9IChldmVudCkgPT4ge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBsZXQgaW1wb3J0ZWREYXRhID0gbnVsbDtcbiAgICAgICAgICAgICAgICBpZiAoZmlsZUV4dCA9PT0gJy5qc29uJykge1xuICAgICAgICAgICAgICAgICAgICAvLyDojrflj5bmlofku7bph4znmoTmlofmnKzlhoXlrrnlubbop6PmnpDkuLogSlNPTlxuICAgICAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBldmVudC50YXJnZXQ/LnJlc3VsdCBhcyBzdHJpbmc7XG4gICAgICAgICAgICAgICAgICAgIGltcG9ydGVkRGF0YSA9IEpTT04ucGFyc2UocmVzdWx0KTtcblxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZmlsZUV4dCA9PT0gJy54bHN4JyB8fCBmaWxlRXh0ID09PSAnLnhscycpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRXhjZWwg5paH5Lu277ya5Lul5LqM6L+b5Yi25b2i5byP6K+75Y+W5bm26Kej5p6QXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBuZXcgVWludDhBcnJheShldmVudC50YXJnZXQ/LnJlc3VsdCBhcyBBcnJheUJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHdvcmtib29rID0gWExTWC5yZWFkKGRhdGEsIHsgdHlwZTogJ2FycmF5JyB9KTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZmlyc3RTaGVldE5hbWUgPSB3b3JrYm9vay5TaGVldE5hbWVzWzBdO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB3b3Jrc2hlZXQgPSB3b3JrYm9vay5TaGVldHNbZmlyc3RTaGVldE5hbWVdO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBzaGVldERhdGEgPSBYTFNYLnV0aWxzLnNoZWV0X3RvX2pzb24od29ya3NoZWV0LCB7IGhlYWRlcjogMSB9KTtcbiAgICAgICAgICAgICAgICAgICAgaW1wb3J0ZWREYXRhID0gQ2ZnVXRpbHMuZ2V0SnNvbkRhdGEoc2hlZXREYXRhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2IgJiYgY2IoaW1wb3J0ZWREYXRhKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XG4gICAgICAgICAgICAgICAgb3BlbkRpbG9nKCdlcnJvcicsICfplJnor68nLCAn5paH5Lu26Kej5p6Q5aSx6LSl77yM6K+35qOA5p+l5paH5Lu25qC85byP77yBJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIDUuIOa4heeQhu+8muWwhuS4tOaXtuWIm+W7uueahCBpbnB1dCDmoIfnrb7ku47pobXpnaLkuK3np7vpmaRcbiAgICAgICAgICAgIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQoaW5wdXQpO1xuICAgICAgICB9O1xuICAgICAgICBpZiAoZmlsZUV4dCA9PT0gJy5qc29uJykge1xuICAgICAgICAgICAgcmVhZGVyLnJlYWRBc1RleHQoZmlsZSk7IC8vIEpTT04g5Lul5paH5pys5b2i5byP6K+75Y+WXG4gICAgICAgIH0gZWxzZSBpZiAoZmlsZUV4dCA9PT0gJy54bHN4JyB8fCBmaWxlRXh0ID09PSAnLnhscycpIHtcbiAgICAgICAgICAgIHJlYWRlci5yZWFkQXNBcnJheUJ1ZmZlcihmaWxlKTsgLy8gRXhjZWwg5Lul5LqM6L+b5Yi25b2i5byP6K+75Y+WXG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLy8gNi4g5bCGIGlucHV0IOaMgui9veWIsOmhtemdouW5tuinpuWPkeeCueWHu++8jOW8ueWHuuaWh+S7tumAieaLqeahhlxuICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoaW5wdXQpO1xuICAgIGlucHV0LmNsaWNrKCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEVkaXRvci5QYW5lbC5kZWZpbmUoe1xuICAgIGxpc3RlbmVyczoge1xuICAgICAgICBzaG93KCkgeyBjb25zb2xlLmxvZygnc2hvdycpOyB9LFxuICAgICAgICBoaWRlKCkgeyBjb25zb2xlLmxvZygnaGlkZScpOyB9LFxuICAgIH0sXG4gICAgdGVtcGxhdGU6IHJlYWRGaWxlU3luYyhqb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uL3N0YXRpYy90ZW1wbGF0ZS9kZWZhdWx0L2luZGV4Lmh0bWwnKSwgJ3V0Zi04JyksXG4gICAgc3R5bGU6IHJlYWRGaWxlU3luYyhqb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uL3N0YXRpYy9zdHlsZS9kZWZhdWx0L2luZGV4LmNzcycpLCAndXRmLTgnKSxcbiAgICAkOiB7XG4gICAgICAgIGFwcDogJyNhcHAnLFxuICAgIH0sXG4gICAgbWV0aG9kczoge1xuXG4gICAgfSxcbiAgICByZWFkeSgpIHtcbiAgICAgICAgaWYgKHRoaXMuJC5hcHApIHtcbiAgICAgICAgICAgIGNvbnN0IGFwcCA9IGNyZWF0ZUFwcCh7fSk7XG4gICAgICAgICAgICBhcHAuY29uZmlnLmNvbXBpbGVyT3B0aW9ucy5pc0N1c3RvbUVsZW1lbnQgPSAodGFnKSA9PiB0YWcuc3RhcnRzV2l0aCgndWktJyk7XG5cbiAgICAgICAgICAgIGFwcC5jb21wb25lbnQoJ015UHJvamVjdCcsIGRlZmluZUNvbXBvbmVudCh7XG4gICAgICAgICAgICAgICAgZGF0YSgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhc2tMaXN0OiBbXSBhcyBQYWNrUHJvamVjdFtdLFxuICAgICAgICAgICAgICAgICAgICAgICAgaXNBdXRvUGFjazogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBxckNvZGVVcmw6ICcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgaXNTZXRUYkNsaVRva2VuOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpbmdUYWxrOiB7IGRpbmdUYWxrV2ViSG9vazogJycsIGRpbmdUYWxrQ3VzdG9tQ29udGVudF9wYWNrOiAnJywgZGluZ1RhbGtDdXN0b21Db250ZW50X3VwbG9hZDogJycgfSBhcyBEaW5nVGFsayxcbiAgICAgICAgICAgICAgICAgICAgICAgIHFyQ29kZVVybE1hcDogbmV3IE1hcDxzdHJpbmcsIFFSQ29kZT4oKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGdpdEhlbHBlcnM6IFtdIGFzIEdpdEhlbHBlcltdLFxuICAgICAgICAgICAgICAgICAgICAgICAgaXNQdWxsR2l0OiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG1vdW50ZWQoKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaW5pdFNhdmVEYXRhKCk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBtZXRob2RzOiB7XG4gICAgICAgICAgICAgICAgICAgIGluaXRTYXZlRGF0YSgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGFza0xpc3QgPSBleGlzdHNTeW5jKHBhY2tzUGF0aCkgPyBKU09OLnBhcnNlKHJlYWRGaWxlU3luYyhwYWNrc1BhdGgsICd1dGYtOCcpKS5wYWNrcyA6IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHRhb2Jhb0NsaVRva2VuTWFwOiBNYXA8c3RyaW5nLCBUYW9CYW9fQ2xpX1Rva2VuPiA9IG5ldyBNYXA8c3RyaW5nLCBUYW9CYW9fQ2xpX1Rva2VuPigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGV4aXN0c1N5bmMoc2F2ZVBhdGgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGRhdGE6IFNhdmVEYXRhID0gcmVhZEpTT05TeW5jKHNhdmVQYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS5kaW5nX3RhbGspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZGluZ1RhbGsgPSBkYXRhLmRpbmdfdGFsaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS50YW9iYW9fY2xpX3Rva2VuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGRhdGEudGFvYmFvX2NsaV90b2tlbi5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhb2Jhb0NsaVRva2VuTWFwLnNldChkYXRhLnRhb2Jhb19jbGlfdG9rZW5baV0uYXBwaWQsIGRhdGEudGFvYmFvX2NsaV90b2tlbltpXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnRhc2tMaXN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRhc2tMaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0YW9iYW9DbGlUb2tlbk1hcC5oYXModGhpcy50YXNrTGlzdFtpXS5hcHBJZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGFza0xpc3RbaV0udGJfY2xpX3Rva2VuID0gdGFvYmFvQ2xpVG9rZW5NYXAuZ2V0KHRoaXMudGFza0xpc3RbaV0uYXBwSWQpLnRva2VuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGFza0xpc3RbaV0uZGluZ1RhbGsgPSB0aGlzLmRpbmdUYWxrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgc3RhcnRBdXRvUGFjaygpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCB0ZXN0U2VydmVyV2FybnM6IHN0cmluZyA9ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLnRhc2tMaXN0IHx8IHRoaXMudGFza0xpc3QubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGJ0bk1hcCA9IG5ldyBNYXA8c3RyaW5nLCBGdW5jdGlvbj4oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBidG5NYXAuc2V0KCdhZGQnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkUHJvamVjdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ0bk1hcC5zZXQoJ2NhbmNlbCcsIG51bGwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnd2FybicsICd3YXJuJywgJ+ivt+WFiOa3u+WKoOiHquWKqOWMlumhueebrumFjee9ru+8gScsIGJ0bk1hcCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuZ2V0QXV0b0NvdW50KCkgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAnd2FybicsICfml6Doh6rliqjljJbpobnnm64hJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRhc2tMaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YXNrTGlzdFtpXSA9IHsgLi4uVGFza1RlbXAsIC4uLnRoaXMudGFza0xpc3RbaV0gfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgdGFzazogUGFja1Byb2plY3QgPSB0aGlzLnRhc2tMaXN0W2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0YXNrLm5lZWRBdXRvUGFjayA9PT0gZmFsc2UpIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGFzay5hcHBJZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAnd2FybicsICfoh6rliqjljJbpobnnm67kuK3mnKrphY3nva5hcHBJZO+8jOivt+ajgOafpemFjee9ru+8gScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGFzay5wYXRoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnd2FybicsICd3YXJuJywgJ+iHquWKqOWMlumhueebruS4reacqumFjee9rumhueebrui3r+W+hO+8jOivt+ajgOafpemFjee9ru+8gScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGFzay5jaGFubmVsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnd2FybicsICd3YXJuJywgJ+iHquWKqOWMlumhueebruS4reacqumFjee9rua4oOmBk+W5s+WPsO+8jOivt+ajgOafpemFjee9ru+8gScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGFzay5lbmdpbmVQYXRoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnd2FybicsICd3YXJuJywgJ+iHquWKqOWMlumhueebruS4reacqumFjee9ruW8leaTjui3r+W+hO+8jOivt+ajgOafpemFjee9ru+8gScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGFzay5lbmdpbmVWZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ3dhcm4nLCAn6Ieq5Yqo5YyW6aG555uu5Lit5pyq6YWN572u5byV5pOO54mI5pys77yM6K+35qOA5p+l6YWN572u77yBJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRhc2suY2hhbm5lbCA9PT0gJ3Rhb2Jhby1taW5pLWdhbWUnICYmICh0YXNrLnVwbG9hZCB8fCB0YXNrLnByZXZpZXcpICYmICF0YXNrLnRiX2NsaV90b2tlbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAnd2FybicsICfor7fmraPnoa7loavlhpnmt5jlrp3lsI/muLjmiI9DTEkgVG9rZW7vvIEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICgodGFzay5wb3N0VG9EaW5nVGFsayB8fCB0YXNrLnBvc3RUb0RpbmdUYWxrMikgJiYgKCF0YXNrLmRpbmdUYWxrIHx8ICF0YXNrLmRpbmdUYWxrLmRpbmdUYWxrV2ViSG9vaykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ3dhcm4nLCAn5Yu+6YCJ5LqG6ZKJ6ZKJ5o6o6YCB77yM6K+35q2j56Gu5aGr5YaZ6ZKJ6ZKJV2ViSG9va++8gScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHBsYXRmb3JtRmlsZXBhdGggPSB0aGlzLmdldFBsYXRmb3JtRmlsZSh0YXNrKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocGxhdGZvcm1GaWxlcGF0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBub3JtYWxpemVkUGF0aCA9IHBhdGgubm9ybWFsaXplKHRhc2sucGF0aCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwbGF0Zm9ybUZpbGVwYXRoLmluZGV4T2Yobm9ybWFsaXplZFBhdGgpIDwgMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ3dhcm4nLCBgYXBwSWQ6JHt0YXNrLmFwcElkfSR7dGFzay5uYW1lfSwke3Rhc2suY2hhbm5lbH3phY3nva7kuI3lnKjpobnnm67ot6/lvoTkuK0s6K+35qOA5p+l6YWN572u77yBYCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGlzVGVzdCA9IHRoaXMuZ2V0UGxhdGZvcm1GaWxlU2VydmVyKHRhc2spO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNUZXN0ICYmIHRhc2sudXBsb2FkICYmICF0YXNrLnNraXApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlc3RTZXJ2ZXJXYXJucyArPSBg5rOo5oSP77yB77yBJHt0YXNrLmFwcElkfe+8miR7dGFzay5uYW1lfe+8jOS9v+eUqOeahOa1i+ivleacje+8ge+8gVxcbmBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmlzQXV0b1BhY2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAnd2FybicsICfmraPlnKjoh6rliqjljJbvvIzor7fnqI3lkI7lho3or5UhJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhdXRvUGFjayA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ2luZm8nLCAnc3RhcnQnLCAn5byA5aeL6Ieq5Yqo5YyWJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pc0F1dG9QYWNrID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNhdmVDb25maWcoKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwYXRoID0gam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi9zdGF0aWMvYXV0by1wYWNrL2J1aWxkL2FwcC5qcycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhcmdzID0gW3BhdGhdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBzcDogQ2hpbGRQcm9jZXNzV2l0aG91dE51bGxTdHJlYW1zID0gc3Bhd24oXCJub2RlXCIsIGFyZ3MsIHsgc2hlbGw6IHRydWUgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3Auc3Rkb3V0LnNldEVuY29kaW5nKCd1dGY4Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3Auc3Rkb3V0Lm9uKCdkYXRhJywgKGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYGF1dG9QYWNrIHN0ZG91dCAke2RhdGEudG9TdHJpbmcoKX1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzcC5zdGRlcnIub24oJ2RhdGEnLCAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgYXV0b1BhY2sgc3RkZXJyICR7ZGF0YS50b1N0cmluZygpfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3Aub24oJ2V4aXQnLCAoY29kZSwgZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29kZSA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYGF1dG9QYWNrIGV4aXQgc3VzY2VzcyAke2RhdGF9YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbXNnID0gJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXhpc3RzU3luYyhzYXZlUGF0aCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgc2F2ZURhdGE6IFNhdmVEYXRhID0gSlNPTi5wYXJzZShyZWFkRmlsZVN5bmMoc2F2ZVBhdGgsICd1dGYtOCcpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDmo4DmtYvmmK/lkKbmnInpooTop4jnoIHnlJ/miJBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnFyQ29kZVVybE1hcC5jbGVhcigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzYXZlRGF0YS5xckNvZGVVcmxzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2F2ZURhdGEucXJDb2RlVXJscy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5xckNvZGVVcmxNYXAuc2V0KHNhdmVEYXRhLnFyQ29kZVVybHNbaV0uYXBwaWQsIHNhdmVEYXRhLnFyQ29kZVVybHNbaV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOiHquWKqOWMlue7k+aenFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzYXZlRGF0YS5zdWNjZXNzZWRQYWNrICYmIHNhdmVEYXRhLnN1Y2Nlc3NlZFBhY2subGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtc2cgKz0gJ+aehOW7uuaIkOWKn++8mic7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2F2ZURhdGEuc3VjY2Vzc2VkUGFjay5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXNnICs9IGAke3NhdmVEYXRhLnN1Y2Nlc3NlZFBhY2tbaV19JHtpID09PSBzYXZlRGF0YS5zdWNjZXNzZWRQYWNrLmxlbmd0aCAtIDEgPyAnXFxuJyA6ICcgJ31gO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzYXZlRGF0YS5mYWlsZWRQYWNrICYmIHNhdmVEYXRhLmZhaWxlZFBhY2subGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtc2cgKz0gJ+aehOW7uuWksei0pe+8mic7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2F2ZURhdGEuZmFpbGVkUGFjay5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXNnICs9IGAke3NhdmVEYXRhLmZhaWxlZFBhY2tbaV19JHtpID09PSBzYXZlRGF0YS5mYWlsZWRQYWNrLmxlbmd0aCAtIDEgPyAnXFxuJyA6ICcgJ31gO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzYXZlRGF0YS5zdWNjZXNzZWRVcGxvYWQgJiYgc2F2ZURhdGEuc3VjY2Vzc2VkVXBsb2FkLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXNnICs9ICfkuIrkvKDmiJDlip/vvJonO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNhdmVEYXRhLnN1Y2Nlc3NlZFVwbG9hZC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbXNnICs9IGAke3NhdmVEYXRhLnN1Y2Nlc3NlZFVwbG9hZFtpXX0ke2kgPT09IHNhdmVEYXRhLnN1Y2Nlc3NlZFVwbG9hZC5sZW5ndGggLSAxID8gJ1xcbicgOiAnICd9YDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2F2ZURhdGEuZmFpbGVkVXBsb2FkICYmIHNhdmVEYXRhLmZhaWxlZFVwbG9hZC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zZyArPSAn5LiK5Lyg5aSx6LSl77yaJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzYXZlRGF0YS5mYWlsZWRVcGxvYWQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zZyArPSBgJHtzYXZlRGF0YS5mYWlsZWRVcGxvYWRbaV19JHtpID09PSBzYXZlRGF0YS5mYWlsZWRVcGxvYWQubGVuZ3RoIC0gMSA/ICdcXG4nIDogJyAnfWA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNhdmVEYXRhLnN1Y2Nlc3NlZFByZXZpZXcgJiYgc2F2ZURhdGEuc3VjY2Vzc2VkUHJldmlldy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zZyArPSAn6aKE6KeI5oiQ5Yqf77yaJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzYXZlRGF0YS5zdWNjZXNzZWRQcmV2aWV3Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtc2cgKz0gYCR7c2F2ZURhdGEuc3VjY2Vzc2VkUHJldmlld1tpXX0ke2kgPT09IHNhdmVEYXRhLnN1Y2Nlc3NlZFByZXZpZXcubGVuZ3RoIC0gMSA/ICdcXG4nIDogJyAnfWA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNhdmVEYXRhLmZhaWxlZFByZXZpZXcgJiYgc2F2ZURhdGEuZmFpbGVkUHJldmlldy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zZyArPSAn6aKE6KeI5aSx6LSl77yaJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzYXZlRGF0YS5mYWlsZWRQcmV2aWV3Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtc2cgKz0gYCR7c2F2ZURhdGEuZmFpbGVkUHJldmlld1tpXX0ke2kgPT09IHNhdmVEYXRhLmZhaWxlZFByZXZpZXcubGVuZ3RoIC0gMSA/ICdcXG4nIDogJyAnfWA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ2luZm8nLCAn5a6M5oiQJywgYOiHquWKqOWMluWujOaIkCFcXG4ke21zZ31gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBhdXRvUGFjayBleGl0IGZhaWwgJHtkYXRhfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCdlcnJvcicsICflpLHotKUnLCAn6Ieq5Yqo5YyW5aSx6LSlIScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaXNBdXRvUGFjayA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG1zZyA9ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHVwbG9hZENvdW50ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwYWNrQ291bnQgPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGF1dG9Db3VudCA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgcHJldmlld0NvdW50ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZWVkUGFja0FuZEhhc0dpdFVybEFycjogUGFja1Byb2plY3RbXSA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgdGFzayBvZiB0aGlzLnRhc2tMaXN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRhc2submVlZEF1dG9QYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF1dG9Db3VudCsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGFzay51cGxvYWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVwbG9hZENvdW50Kys7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0YXNrLnNraXApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhY2tDb3VudCsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRhc2suZ2l0Q29uZmlnICYmIHRhc2suZ2l0Q29uZmlnLmdpdFVybCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5lZWRQYWNrQW5kSGFzR2l0VXJsQXJyLnB1c2godGFzayk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRhc2sucHJldmlldykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJldmlld0NvdW50Kys7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHNlcnZlck1zZyA9IHRhc2suc2tpcCA/ICcnIDogKHRhc2sucGxhdGZvcm1GaWxlcyAmJiB0YXNrLnBsYXRmb3JtRmlsZXNbdGFzay5jaGFubmVsXSA/ICfvvIwnICsgKHRhc2sucGxhdGZvcm1GaWxlc1t0YXNrLmNoYW5uZWxdLmlzVGVzdCA/ICfmtYvor5XmnI0nIDogJ+ato+W8j+acjScpIDogJycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtc2cgKz0gYCR7dGFzay5hcHBJZH3vvJoke3Rhc2submFtZX3vvIzmnoTlu7rvvJokeyh0YXNrLnNraXAgPyAn4pyVJyA6ICfinJMnKX3vvIzkuIrkvKDvvJokeyh0YXNrLnVwbG9hZCA/ICfinJMnIDogJ+KclScpfe+8jOmihOiniO+8miR7KHRhc2sucHJldmlldyA/ICfinJMnIDogJ+KclScpfSR7c2VydmVyTXNnfVxcbmA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgbXNnICs9IGDoh6rliqjljJbvvJoke2F1dG9Db3VudH3kuKrvvIzmnoTlu7rvvJoke3BhY2tDb3VudH3kuKrvvIzkuIrkvKDvvJoke3VwbG9hZENvdW50feS4qu+8jOmihOiniO+8miR7cHJldmlld0NvdW50feS4qlxcbmA7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGVzdFNlcnZlcldhcm5zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXNnICs9IHRlc3RTZXJ2ZXJXYXJucztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBidG5NYXAgPSBuZXcgTWFwPHN0cmluZywgRnVuY3Rpb24+KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBidG5NYXAuc2V0KCdvaycsIGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDlpoLmnpzmnInpnIDopoFjb2Nvc+aehOW7uueahOW3peeoi+W5tuS4lOmFjee9ruS6hmdpdOWcsOWdgO+8jOajgOa1i+S4gOS4i+WSjGdpdOi/nOeoi+eJiOacrOaYr+WQpuaYr+acgOaWsFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZWVkUGFja0FuZEhhc0dpdFVybEFyci5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaXNQdWxsR2l0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5lZWRQdWxsR2l0QXJyOiB7IHByb2plY3RQYXRoOiBzdHJpbmcsIGdpdFVybDogc3RyaW5nLCBicmFuY2g6IHN0cmluZyB9W10gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHB1bGxHaXROYW1lczogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGluZGV4ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdGFza3MgPSBuZWVkUGFja0FuZEhhc0dpdFVybEFyci5tYXAoKHBhY2s6IFBhY2tQcm9qZWN0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgcHJvamVjdFBhdGggPSBwYWNrLnBhdGg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgZ2l0VXJsID0gcGFjay5naXRDb25maWcuZ2l0VXJsO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGdpdEhlbHBlcjogR2l0SGVscGVyID0gdGhpcy5nZXRHaXRIZWxwZXIoaW5kZXgsIHsgcHJvamVjdFBhdGgsIGdpdFVybCB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4Kys7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2l0SGVscGVyLmNoZWNrVmVyc2lvblN5bmMoKS50aGVuKChyZXMpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXJlcy5pc1N5bmNlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZWVkUHVsbEdpdEFyci5wdXNoKHsgcHJvamVjdFBhdGgsIGdpdFVybCwgYnJhbmNoOiBwYWNrLmdpdENvbmZpZy5naXRCcmFuY2ggfHwgJycgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHB1bGxHaXROYW1lcy5wdXNoKHBhY2submFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goKGVycm9yKSA9PiB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgUHJvbWlzZS5hbGwodGFza3MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmlzUHVsbEdpdCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobmVlZFB1bGxHaXRBcnIubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGJ0bk1hcDIgPSBuZXcgTWFwPHN0cmluZywgRnVuY3Rpb24+KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBidG5NYXAyLnNldCgnb2snLCBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wdWxsR2l0QXJyKG5lZWRQdWxsR2l0QXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdXRvUGFjaygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBidG5NYXAyLnNldCgnY2FuY2VsJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF1dG9QYWNrKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuYW1lcyA9ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwdWxsR2l0TmFtZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lcyArPSBgJHtwdWxsR2l0TmFtZXNbaV19IGA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAnd2FybicsIGAke25hbWVzfeajgOa1i+WIsOmcgOimgeabtOaWsOeahEdpdOS7k+W6k++8jOaYr+WQpuabtOaWsD9gLCBidG5NYXAyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF1dG9QYWNrKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF1dG9QYWNrKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAnd2FybicsIGAke21zZ33lvIDlp4voh6rliqjljJY/YCwgYnRuTWFwLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgYWRkUHJvamVjdCgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGFza0xpc3QucHVzaCh7IC4uLlRhc2tUZW1wIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCdpbmZvJywgJ2FkZCcsICfmt7vliqDmiJDlip8nKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZGVsUHJvamVjdChpdGVtOiBQYWNrUHJvamVjdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGJ0bk1hcCA9IG5ldyBNYXA8c3RyaW5nLCBGdW5jdGlvbj4oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ0bk1hcC5zZXQoJ2RlbGV0ZScsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudGFza0xpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHRhc2sgPSB0aGlzLnRhc2tMaXN0W2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGFzay5hcHBJZCA9PT0gaXRlbS5hcHBJZCAmJiB0YXNrLm5hbWUgPT09IGl0ZW0ubmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YXNrTGlzdC5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ2RlbGV0ZScsICfmmK/lkKbliKDpmaTphY3nva4/JywgYnRuTWFwLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgaW1wb3J0UGFja3NDb25maWcoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDor7TmmI7pnZnmgIHmlofku7bkuK3mnIkgUGFja3MuanNvbuS6hu+8jOivoumXruaYr+WQpuabv+aNolxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY2IgPSAoaW1wb3J0ZWREYXRhOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDlgYforr7lr7zlhaXnmoQgSlNPTiDmoLzlvI/kuZ/mmK8geyBwYWNrczogWy4uLl0gfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbXBvcnRlZERhdGEgJiYgKChpbXBvcnRlZERhdGEucGFja3MgJiYgQXJyYXkuaXNBcnJheShpbXBvcnRlZERhdGEucGFja3MpIHx8IEFycmF5LmlzQXJyYXkoaW1wb3J0ZWREYXRhKSkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWwhuWvvOWFpeeahOaVsOaNruabv+aNouWIsOW9k+WJjeeahCB0YXNrTGlzdCDkuK1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGRhdGEgPSBpbXBvcnRlZERhdGEucGFja3MgPyBpbXBvcnRlZERhdGEucGFja3MgOiBpbXBvcnRlZERhdGE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCB0bXBzOiBQYWNrUHJvamVjdFtdID0gWy4uLnRoaXMudGFza0xpc3RdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhc2tMaXN0ID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YXNrTGlzdFtpXSA9IHsgLi4uVGFza1RlbXAsIC4uLmRhdGFbaV0gfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGFza0xpc3RbaV0uZGluZ1RhbGsgPSB0aGlzLmRpbmdUYWxrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5nZXRQbGF0Zm9ybUZpbGUodGhpcy50YXNrTGlzdFtpXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IHRtcHMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy50YXNrTGlzdFtpXS5hcHBJZCA9PT0gdG1wc1tqXS5hcHBJZCAmJiB0bXBzW2pdLnRiX2NsaV90b2tlbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhc2tMaXN0W2ldLnRiX2NsaV90b2tlbiA9IHRtcHNbal0udGJfY2xpX3Rva2VuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyA0LiDop6blj5Hkv53lrZjvvIzlsIbmlrDmlbDmja7lhpnlhaXmnKzlnLAgUGFja3MuanNvblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNhdmVDb25maWcoKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDlpoLmnpzmnIkgRWRpdG9yLkRpYWxvZ++8jOWPr+S7peW8ueS4quaIkOWKn+aPkOekulxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ2luZm8nLCAn5o+Q56S6JywgJ+WvvOWFpeaIkOWKn++8gScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ+itpuWRiicsICflr7zlhaXnmoTmlofku7bmoLzlvI/kuI3mraPnoa7vvIEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudGFza0xpc3QgJiYgdGhpcy50YXNrTGlzdC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGJ0bk1hcCA9IG5ldyBNYXA8c3RyaW5nLCBGdW5jdGlvbj4oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBidG5NYXAuc2V0KCdyZXBsYWNlJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbXBvcnRGdW5jKGNiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBidG5NYXAuc2V0KCdjYW5jZWwnLCBudWxsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAncmVwbGFjZScsICdQYWNrcy5qc29uIOW3suWtmOWcqO+8jOaYr+WQpuabv+aNoj8nLCBidG5NYXApO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW1wb3J0RnVuYyhjYik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGV4cG9ydFBhY2tzQ29uZmlnKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8g6K+05piO5rKh5pyJ6YWN572uXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMudGFza0xpc3QgfHwgdGhpcy50YXNrTGlzdC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAn6K2m5ZGKJywgJ+ayoeaciemFjee9ru+8jOaXoOazleWvvOWHuicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gMS4g57uE6KOF6ZyA6KaB5a+85Ye655qE5pWw5o2uXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHBhY2tzOiBQYWNrUHJvamVjdFtdID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRhc2tMaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgZGluZ1RhbGssIHRiX2NsaV90b2tlbiwgLi4udCB9ID0gdGhpcy50YXNrTGlzdFtpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFja3MucHVzaCh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZXhwb3J0RGF0YSA9IHsgcGFja3MgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRhU3RyID0gSlNPTi5zdHJpbmdpZnkoZXhwb3J0RGF0YSwgbnVsbCwgXCJcXHRcIik7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAyLiDojrflj5blvZPliY3ns7vnu5/nmoTmoYzpnaLot6/lvoRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkZXNrdG9wUGF0aCA9IG9zLmhvbWVkaXIoKSArICcvRGVza3RvcCc7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAzLiDmi7zmjqXlrozmlbTnmoTkv53lrZjot6/lvoRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBleHBvcnRQYXRoID0gam9pbihkZXNrdG9wUGF0aCwgYFBhY2tzLmpzb25gKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIDQuIOS9v+eUqCBOb2RlLmpzIOWOn+eUnyBmcyDmqKHlnZflkIzmraXlhpnlhaXmlofku7bliLDmoYzpnaJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3cml0ZUZpbGVTeW5jKGV4cG9ydFBhdGgsIGRhdGFTdHIsICd1dGYtOCcpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gNS4g5by55Ye65oiQ5Yqf5o+Q56S6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCdpbmZvJywgJ+aPkOekuicsIGDphY3nva7lt7LmiJDlip/lr7zlh7rliLDmoYzpnaLvvIFcXG7mlofku7blkI3vvJoke2BQYWNrcy5qc29uYH1gKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCflr7zlh7rlpLHotKU6JywgZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnZXJyb3InLCAn6ZSZ6K+vJywgJ+WvvOWHuumFjee9ruaWh+S7tuWksei0pe+8jOivt+ajgOafpeadg+mZkO+8gScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBvbmVrZXlPcGVyYXRlQXV0b1BhY2soZmxhZzogYm9vbGVhbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRhc2tMaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YXNrTGlzdFtpXS5uZWVkQXV0b1BhY2sgPSBmbGFnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZmxhZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhc2tMaXN0W2ldLnVwbG9hZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhc2tMaXN0W2ldLnByZXZpZXcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YXNrTGlzdFtpXS5za2lwID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIG9uZWtleU9wZXJhdGVVcGxvYWQoZmxhZzogYm9vbGVhbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRhc2tMaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YXNrTGlzdFtpXS51cGxvYWQgPSBmbGFnO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBvbmVrZXlPcGVyYXRlUHJldmlldyhmbGFnOiBib29sZWFuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudGFza0xpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhc2tMaXN0W2ldLnByZXZpZXcgPSBmbGFnO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBvbmVrZXlPcGVyYXRlU2tpcFBhY2soZmxhZzogYm9vbGVhbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRhc2tMaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YXNrTGlzdFtpXS5za2lwID0gZmxhZztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2V0QXV0b0NvdW50KCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGNvdW50ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy50YXNrTGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnRhc2tMaXN0W2ldLm5lZWRBdXRvUGFjaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb3VudCsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjb3VudDtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2V0VXBsb2FkQ291bnQoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgY291bnQgPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRhc2tMaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudGFza0xpc3RbaV0udXBsb2FkICYmIHRoaXMudGFza0xpc3RbaV0ubmVlZEF1dG9QYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50Kys7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNvdW50O1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnZXRQcmV2aWV3Q291bnQoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgY291bnQgPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRhc2tMaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudGFza0xpc3RbaV0ucHJldmlldyAmJiB0aGlzLnRhc2tMaXN0W2ldLm5lZWRBdXRvUGFjaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb3VudCsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjb3VudDtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2V0UGFja0NvdW50KCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGNvdW50ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy50YXNrTGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy50YXNrTGlzdFtpXS5za2lwICYmIHRoaXMudGFza0xpc3RbaV0ubmVlZEF1dG9QYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50Kys7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNvdW50O1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBvcGVuTG9nRGlyKHBhdGg6IHN0cmluZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFleGlzdHNTeW5jKHBhdGgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ3dhcm4nLCAn5pel5b+X5paH5Lu25aS55LiN5a2Y5Zyo77yBJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBleGVjKGBzdGFydCBcIlwiIFwiJHtwYXRofVwiYCwgKGVycm9yKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcign5omn6KGM5ZG95Luk5Ye66ZSZOicsIGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnZXJyb3InLCAn6ZSZ6K+vJywgJ+aXoOazleaJk+W8gOebruW9le+8jOivt+ajgOafpei3r+W+hOaIluadg+mZkO+8gScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+aJk+W8gOebruW9leW8guW4uDonLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCdlcnJvcicsICfplJnor68nLCAn5Y+R55Sf5pyq55+l6ZSZ6K+v77yM5peg5rOV5omT5byA55uu5b2V77yBJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIG9wZW5Ub29sTG9nKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5vcGVuTG9nRGlyKGpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vdG9vbExvZycpKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgY2xpY2tBdXRvUGFja1RvZ2dsZShpdGVtOiBQYWNrUHJvamVjdCwgZmxhZzogYm9vbGVhbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS5uZWVkQXV0b1BhY2sgPSBmbGFnO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFmbGFnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS51cGxvYWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtLnNraXAgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0ucHJldmlldyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBzZXRQbGF0Zm9ybUZpbGVTZXJ2ZXIoaXRlbTogUGFja1Byb2plY3QsIGlzVGVzdDogYm9vbGVhbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFpdGVtLnBsYXRmb3JtRmlsZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtLnBsYXRmb3JtRmlsZXMgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaXRlbS5wbGF0Zm9ybUZpbGVzW2l0ZW0uY2hhbm5lbF0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtLnBsYXRmb3JtRmlsZXNbaXRlbS5jaGFubmVsXSA9IHsgcGF0aDogJycsIGlzVGVzdDogZmFsc2UgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0ucGxhdGZvcm1GaWxlc1tpdGVtLmNoYW5uZWxdLmlzVGVzdCA9IGlzVGVzdDtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2V0UGxhdGZvcm1GaWxlKGl0ZW06IFBhY2tQcm9qZWN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbS5wYXRoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHBhdGggPSBGaWxlVXRpbHMuZmluZEZpbGUoaXRlbS5wYXRoLCBQbGF0Zm9ybUNvbmZpZ1tpdGVtLmNoYW5uZWxdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbS5wbGF0Zm9ybUZpbGVzICYmIGl0ZW0ucGxhdGZvcm1GaWxlc1tpdGVtLmNoYW5uZWxdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0ucGxhdGZvcm1GaWxlc1tpdGVtLmNoYW5uZWxdLnBhdGggPSBwYXRoO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcGF0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2V0UGxhdGZvcm1GaWxlU2VydmVyKGl0ZW06IFBhY2tQcm9qZWN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbS5wbGF0Zm9ybUZpbGVzICYmIGl0ZW0ucGxhdGZvcm1GaWxlc1tpdGVtLmNoYW5uZWxdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGl0ZW0ucGxhdGZvcm1GaWxlc1tpdGVtLmNoYW5uZWxdLmlzVGVzdCB8fCBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2V0QXBpVmVyc2lvbihpdGVtOiBQYWNrUHJvamVjdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFwaVZlcnNpb246IHN0cmluZyA9ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW0ucGxhdGZvcm1GaWxlcyAmJiBpdGVtLnBsYXRmb3JtRmlsZXNbaXRlbS5jaGFubmVsXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwYXRoID0gdGhpcy5nZXRQbGF0Zm9ybUZpbGUoaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGV4aXN0c1N5bmMocGF0aCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBmaWxlQ29udGVudCA9IHJlYWRGaWxlU3luYyhwYXRoLCAndXRmLTgnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmaWxlQ29udGVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOS9v+eUqOato+WImeihqOi+vuW8j+WMuemFjSBhcGlWZXJzaW9uIOeahOWAvFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOi/meS4quato+WImeihqOi+vuW8j+eahOino+mHiu+8mlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGFwaVZlcnNpb246ICAgICAgICAtPiDljLnphY3lrZfpnaLph48gXCJhcGlWZXJzaW9uOlwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gXFxzKiAgICAgICAgICAgICAgICAtPiDljLnphY3pm7bkuKrmiJblpJrkuKrnqbrnmb3lrZfnrKbvvIjlpoLnqbrmoLzjgIHmjaLooYzvvIlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBcIiAgICAgICAgICAgICAgICAgIC0+IOWMuemFjeS4gOS4quWPjOW8leWPt1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIChbXlwiXSopICAgICAgICAgICAgLT4g6L+Z5piv5LiA5Liq5o2V6I6357uE77yM5Yy56YWN6Zmk5LqG5Y+M5byV5Y+35Lul5aSW55qE5Lu75oSP5a2X56ym77yM55u05Yiw6YGH5Yiw5LiL5LiA5Liq5Y+M5byV5Y+3XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gXCIgICAgICAgICAgICAgICAgICAtPiDljLnphY3nu5PlsL7nmoTlj4zlvJXlj7dcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2ZXJzaW9uUmVnZXggPSAvYXBpVmVyc2lvbjpcXHMqXCIoW15cIl0qKVwiLztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBtYXRjaFJlc3VsdCA9IGZpbGVDb250ZW50Lm1hdGNoKHZlcnNpb25SZWdleCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDmo4Dmn6XmmK/lkKbljLnphY3miJDlip/lubbmj5Dlj5blgLxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobWF0Y2hSZXN1bHQgJiYgbWF0Y2hSZXN1bHRbMV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gbWF0Y2hSZXN1bHRbMV0g5bCx5piv56ys5LiA5Liq5o2V6I6357uE55qE5YaF5a6577yM5Lmf5bCx5piv5oiR5Lus5oOz6KaB55qE5YC8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwaVZlcnNpb24gPSBtYXRjaFJlc3VsdFsxXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGFwaVZlcnNpb247XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXBpVmVyc2lvbjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGFwaVZlcnNpb247XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGFwaVZlcnNpb247XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdldFRhb0Jhb0RlYnVnVXJsKGl0ZW06IFBhY2tQcm9qZWN0LCBpc1ByZXZpZXc6IGJvb2xlYW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnd2FybicsICd3YXJuJywgJ+mhueebrumFjee9ruS4uuepuu+8jOivt+ajgOafpemFjee9ricpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaXRlbS5hcHBJZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnd2FybicsICd3YXJuJywgJ+ivt+i+k+WFpeato+ehrueahGFwcElkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFpdGVtLnRiX2NsaV90b2tlbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnd2FybicsICd3YXJuJywgJ+ivt+i+k+WFpeato+ehrueahOa3mOWunUNMSSBUb2tlbicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pc1NldFRiQ2xpVG9rZW4gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgc3Bhd25fdGIoWydjb25maWcnLCAnc2V0JywgJ3Rva2VuJywgaXRlbS50Yl9jbGlfdG9rZW5dLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pc1NldFRiQ2xpVG9rZW4gPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pc0F1dG9QYWNrID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzUHJldmlldykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGNvbXBhcmVWZXJzaW9uID0gKHZlcjE6IHN0cmluZywgdmVyMjogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFycjEgPSB2ZXIxLnNwbGl0KCcuJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFycjIgPSB2ZXIyLnNwbGl0KCcuJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGxlbmd0aCA9IE1hdGgubWluKGFycjEubGVuZ3RoLCBhcnIyLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXJyMVtpXSA9PSBhcnIyW2ldKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gTnVtYmVyKGFycjFbaV0pIC0gTnVtYmVyKGFycjJbaV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXJyMS5sZW5ndGggLSBhcnIyLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgb3V0UGF0aCA9IHBhdGguam9pbihpdGVtLnBhdGgsIGBidWlsZC8ke2NvbXBhcmVWZXJzaW9uKGl0ZW0uZW5naW5lVmVyLCBcIjMuMC4wXCIpID8gaXRlbS5jaGFubmVsIDogJ3Rhb2Jhby1taW5pZ2FtZSd9YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzcGF3bl90YihbXCJwcmV2aWV3XCIsIFwiLWlcIiwgb3V0UGF0aCwgXCItYVwiLCBpdGVtLmFwcElkLCBcIi10XCIsIFwibWluaWdhbWVcIiwgXCItLWNvcHlcIiwgXCJ0cnVlXCIsIFwiLS1yZW5kZXJNb2RlXCIsIFwiaGlnaFBlcmZvcm1hbmNlXCJdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIChkYXRhOiB7IHByZXZpZXdVcmw6IHN0cmluZyB9KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaXNBdXRvUGFjayA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudGFza0xpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnRhc2tMaXN0W2ldLmFwcElkID09PSBpdGVtLmFwcElkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5xckNvZGVVcmxNYXAuc2V0KGl0ZW0uYXBwSWQsIHsgYXBwaWQ6IGl0ZW0uYXBwSWQsIHVybDogZGF0YS5wcmV2aWV3VXJsIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaXNBdXRvUGFjayA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzcGF3bl90YihbJ2FwcCcsICctYScsIGl0ZW0uYXBwSWRdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIChkYXRhOiB7IHZlcnNpb246IHN0cmluZyB9KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaXNBdXRvUGFjayA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS52ZXJzaW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgdXJsID0gYGh0dHBzOi8vbS5kdWFucXUuY29tP19hcml2ZXJfYXBwaWQ9JHtpdGVtLmFwcElkfSZuYnN2PSR7ZGF0YS52ZXJzaW9ufSZuYnNvdXJjZT1kZWJ1ZyZuYnNuPVRSSUFMJl9tcF9jb2RlPXRiJl9jb250YWluZXJfdHlwZT1nbSZ2Y29uc29sZT10cnVlYFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5xckNvZGVVcmwgPSB1cmw7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgZ2V0VGFvQmFvRGVidWdVcmwgc3VzY2VzcyAke3VybH1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnZXJyb3InLCAn5aSx6LSlJywgJ+WkjeWItumTvuaOpeWksei0pSEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmlzQXV0b1BhY2sgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCdlcnJvcicsICflpLHotKUnLCAn5aSN5Yi26ZO+5o6l5aSx6LSlIScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pc1NldFRiQ2xpVG9rZW4gPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBjbG9zZVFyQ29kZSgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucXJDb2RlVXJsID0gJyc7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGFzeW5jIGNvcHlMaW5rKGxpbms6IHN0cmluZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGxpbmsgIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgbmF2aWdhdG9yLmNsaXBib2FyZC53cml0ZVRleHQobGluayk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnaW5mbycsICflrozmiJAnLCBg5aSN5Yi26ZO+5o6l5oiQ5Yqf77yM5Y+v57KY6LS05L2/55So77yBYCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ2Vycm9yJywgJ+Wksei0pScsIGDlpI3liLbpk77mjqXlpLHotKUhICR7ZXJyb3J9YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBjaGVja1VwbG9hZChpdGVtOiBQYWNrUHJvamVjdCwgaXNDaGVjazogYm9vbGVhbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW0ucHJldmlldykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0ucHJldmlldyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS51cGxvYWQgPSBpc0NoZWNrO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBjaGVja1ByZXZpZXcoaXRlbTogUGFja1Byb2plY3QsIGlzQ2hlY2s6IGJvb2xlYW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpdGVtLnVwbG9hZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0udXBsb2FkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtLnByZXZpZXcgPSBpc0NoZWNrO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBzYXZlQ29uZmlnKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGV4aXN0c1N5bmMoc2F2ZVBhdGgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHNhdmVEYXRhOiBTYXZlRGF0YSA9IHJlYWRKU09OU3luYyhzYXZlUGF0aCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNhdmVEYXRhICYmIHNhdmVEYXRhLmFwaVZlcnNpb25zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNhdmVEYXRhLmFwaVZlcnNpb25zID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBzYXZlRGF0YVN0ciA9IEpTT04uc3RyaW5naWZ5KHNhdmVEYXRhLCBudWxsLCBcIlxcdFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd3JpdGVGaWxlU3luYyhzYXZlUGF0aCwgc2F2ZURhdGFTdHIsICd1dGYtOCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBzYXZlRGF0YTogU2F2ZURhdGEgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGluZ190YWxrOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpbmdUYWxrV2ViSG9vazogJycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpbmdUYWxrQ3VzdG9tQ29udGVudF9wYWNrOiAnJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGluZ1RhbGtDdXN0b21Db250ZW50X3VwbG9hZDogJydcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhb2Jhb19jbGlfdG9rZW46IFtdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHFyQ29kZVVybHM6IFtdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwaVZlcnNpb25zOiBbXVxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBzYXZlRGluZ1RhbGsgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwYWNrczogUGFja1Byb2plY3RbXSA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRhc2tMaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YXNrTGlzdFtpXSA9IHsgLi4uVGFza1RlbXAsIC4uLnRoaXMudGFza0xpc3RbaV0gfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy50YXNrTGlzdFtpXS50Yl9jbGlfdG9rZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2F2ZURhdGEudGFvYmFvX2NsaV90b2tlbi5wdXNoKHsgYXBwaWQ6IHRoaXMudGFza0xpc3RbaV0uYXBwSWQsIG5hbWU6IHRoaXMudGFza0xpc3RbaV0ubmFtZSwgdG9rZW46IHRoaXMudGFza0xpc3RbaV0udGJfY2xpX3Rva2VuIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnRhc2tMaXN0W2ldLmRpbmdUYWxrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghc2F2ZURpbmdUYWxrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzYXZlRGluZ1RhbGsgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2F2ZURhdGEuZGluZ190YWxrID0geyAuLi50aGlzLnRhc2tMaXN0W2ldLmRpbmdUYWxrIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy50YXNrTGlzdFtpXS5wbGF0Zm9ybUZpbGVzICYmIHRoaXMudGFza0xpc3RbaV0ucGxhdGZvcm1GaWxlc1t0aGlzLnRhc2tMaXN0W2ldLmNoYW5uZWxdICYmIHRoaXMudGFza0xpc3RbaV0ucGxhdGZvcm1GaWxlc1t0aGlzLnRhc2tMaXN0W2ldLmNoYW5uZWxdLmFwaVZlcnNpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2F2ZURhdGEuYXBpVmVyc2lvbnMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcHBpZDogdGhpcy50YXNrTGlzdFtpXS5hcHBJZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwaVZlcnNpb246IHRoaXMudGFza0xpc3RbaV0ucGxhdGZvcm1GaWxlc1t0aGlzLnRhc2tMaXN0W2ldLmNoYW5uZWxdLmFwaVZlcnNpb25cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLnRhc2tMaXN0W2ldLnBsYXRmb3JtRmlsZXNbdGhpcy50YXNrTGlzdFtpXS5jaGFubmVsXS5hcGlWZXJzaW9uO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgZGluZ1RhbGssIHRiX2NsaV90b2tlbiwgLi4udCB9ID0gdGhpcy50YXNrTGlzdFtpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYWNrcy5wdXNoKHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnFyQ29kZVVybE1hcC5jbGVhcigpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgZGF0YSA9IHsgcGFja3MgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBkYXRhU3RyID0gSlNPTi5zdHJpbmdpZnkoZGF0YSwgbnVsbCwgXCJcXHRcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICB3cml0ZUZpbGVTeW5jKHBhY2tzUGF0aCwgZGF0YVN0ciwgJ3V0Zi04Jyk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBzYXZlRGF0YVN0ciA9IEpTT04uc3RyaW5naWZ5KHNhdmVEYXRhLCBudWxsLCBcIlxcdFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdyaXRlRmlsZVN5bmMoc2F2ZVBhdGgsIHNhdmVEYXRhU3RyLCAndXRmLTgnKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgaW1wb3J0Q2xpVG9rZW4oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjYiA9IChkYXRhOiBUYW9CYW9fQ2xpX1Rva2VuW10pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy50YXNrTGlzdCAmJiB0aGlzLnRhc2tMaXN0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy50YXNrTGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCB0YXNrOiBQYWNrUHJvamVjdCA9IHRoaXMudGFza0xpc3RbaV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRhc2suY2hhbm5lbCA9PT0gJ3Rhb2Jhby1taW5pLWdhbWUnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgZGF0YS5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGFbal0uYXBwaWQgPT09IHRhc2suYXBwSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXNrLnRiX2NsaV90b2tlbiA9IGRhdGFbal0udG9rZW47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ2luZm8nLCAnaW5mbycsICflr7zlhaXmiJDlip/vvIEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2F2ZUNvbmZpZygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ3dhcm4nLCAn6K+35YWI5re75Yqg6Ieq5Yqo5YyW6aG555uu6YWN572u77yBJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnd2FybicsICd3YXJuJywgJ+WvvOWFpWNsaSB0b2tlbiDmlbDmja7lpLHotKXvvIEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgaW1wb3J0RnVuYyhjYik7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGFzeW5jIHB1bGxHaXQoaXRlbTogUGFja1Byb2plY3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwcm9qZWN0UGF0aCA9IGl0ZW0ucGF0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBnaXRVcmwgPSAoaXRlbS5naXRDb25maWcgJiYgaXRlbS5naXRDb25maWcuZ2l0VXJsKSB8fCAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBicmFuY2ggPSAoaXRlbS5naXRDb25maWcgJiYgaXRlbS5naXRDb25maWcuZ2l0QnJhbmNoKSB8fCAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghcHJvamVjdFBhdGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ3dhcm4nLCAnd2FybicsICfor7fovpPlhaXpobnnm67ot6/lvoQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWdpdFVybCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5EaWxvZygnd2FybicsICd3YXJuJywgJ+ivt+i+k+WFpWdpdOWcsOWdgCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghYnJhbmNoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJhbmNoID0gJ21hc3Rlcic7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgZ2l0SGVscGVyOiBHaXRIZWxwZXIgPSB0aGlzLmdldEdpdEhlbHBlcigwLCB7IHByb2plY3RQYXRoLCBnaXRVcmwgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmlzUHVsbEdpdCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgcmVzdWx0ID0gYXdhaXQgZ2l0SGVscGVyLnVwZGF0ZVRvTGF0ZXN0KHsgcHJvamVjdFBhdGgsIGdpdFVybCwgYnJhbmNoLCBmb3JjZTogdHJ1ZSB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaXNQdWxsR2l0ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXJlc3VsdC5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCd3YXJuJywgJ3dhcm4nLCByZXN1bHQubWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkRpbG9nKCdpbmZvJywgJ2luZm8nLCAn5pu05paw5oiQ5YqfJyk7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGFsbFB1bGxHaXQoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgcHVsbEFycjogeyBwcm9qZWN0UGF0aDogc3RyaW5nLCBnaXRVcmw6IHN0cmluZywgYnJhbmNoOiBzdHJpbmcgfVtdID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudGFza0xpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0YXNrOiBQYWNrUHJvamVjdCA9IHRoaXMudGFza0xpc3RbaV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRhc2sucGF0aCAmJiB0YXNrLmdpdENvbmZpZyAmJiB0YXNrLmdpdENvbmZpZy5naXRVcmwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHVsbEFyci5wdXNoKHsgcHJvamVjdFBhdGg6IHRhc2sucGF0aCwgZ2l0VXJsOiB0YXNrLmdpdENvbmZpZy5naXRVcmwsIGJyYW5jaDogdGFzay5naXRDb25maWcuZ2l0QnJhbmNoIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVsbEdpdEFycihwdWxsQXJyKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgYXN5bmMgcHVsbEdpdEFycihwdWxsQXJyOiB7IHByb2plY3RQYXRoOiBzdHJpbmcsIGdpdFVybDogc3RyaW5nLCBicmFuY2g6IHN0cmluZyB9W10pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCB0b3RhbCA9IHB1bGxBcnIubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRvdGFsID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaXNQdWxsR2l0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgY291bnQgPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBmYWlsUHVsbEFycjogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjaGVja092ZXIgPSAoZXJyb3I6IHN0cmluZykgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY291bnQgPT09IHRvdGFsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmlzUHVsbEdpdCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGZhaWxTdHIgPSAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmYWlsUHVsbEFyci5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmFpbFN0ciA9ICdcXG4nICsgJ+abtOaWsOWksei0pemhueebrjonICsgJ1xcbic7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBmYWlsUHVsbEFyci5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmYWlsU3RyICs9IGAke2ZhaWxQdWxsQXJyW2ldfVxcbmA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZhaWxTdHIgKz0gYFxcbiAke2Vycm9yfWA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ2luZm8nLCAnaW5mbycsIGDmm7TmlrDlrozmiJAke2ZhaWxTdHJ9YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgaW5kZXggPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBlcnJNc2c6IHN0cmluZyA9ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRhc2tzID0gcHVsbEFyci5tYXAoKGl0ZW0pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHsgcHJvamVjdFBhdGgsIGdpdFVybCwgYnJhbmNoIH0gPSBpdGVtO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWJyYW5jaCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJhbmNoID0gJ21hc3Rlcic7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGdpdEhlbHBlcjogR2l0SGVscGVyID0gdGhpcy5nZXRHaXRIZWxwZXIoaW5kZXgsIHsgcHJvamVjdFBhdGgsIGdpdFVybCB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5kZXgrKztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGdpdEhlbHBlci51cGRhdGVUb0xhdGVzdCh7IHByb2plY3RQYXRoLCBnaXRVcmwsIGJyYW5jaCwgZm9yY2U6IHRydWUgfSkudGhlbigocmVzdWx0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb3VudCsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFyZXN1bHQuc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZhaWxQdWxsQXJyLnB1c2gocmVzdWx0LnByb2plY3RQYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoZWNrT3ZlcihlcnJNc2cpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVyck1zZyArPSBlcnJvciArICdcXG4nO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY291bnQrKztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZhaWxQdWxsQXJyLnB1c2gocHJvamVjdFBhdGgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hlY2tPdmVyKGVyck1zZyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgUHJvbWlzZS5hbGwodGFza3MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBzZXRHaXRVcmwoaXRlbTogUGFja1Byb2plY3QsIGdpdFVybDogc3RyaW5nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaXRlbS5naXRDb25maWcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS5naXRDb25maWcgPSB7IGdpdFVybDogJycsIGdpdEJyYW5jaDogJycgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS5naXRDb25maWcuZ2l0VXJsID0gZ2l0VXJsO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBzZXRHaXRCcmFuY2goaXRlbTogUGFja1Byb2plY3QsIGdpdEJyYW5jaDogc3RyaW5nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaXRlbS5naXRDb25maWcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS5naXRDb25maWcgPSB7IGdpdFVybDogJycsIGdpdEJyYW5jaDogJycgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS5naXRDb25maWcuZ2l0QnJhbmNoID0gZ2l0QnJhbmNoO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBvbmVrZXlTYXZlQ29uZmlnKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zYXZlQ29uZmlnKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBvcGVuRGlsb2coJ2luZm8nLCAnaW5mbycsICfkv53lrZjmiJDlip8nKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2V0R2l0SGVscGVyKGluZGV4OiBudW1iZXIsIGRhdGE6IHsgcHJvamVjdFBhdGg6IHN0cmluZywgZ2l0VXJsOiBzdHJpbmcgfSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHsgcHJvamVjdFBhdGgsIGdpdFVybCB9ID0gZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBnaXRIZWxwZXI6IEdpdEhlbHBlciA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPD0gdGhpcy5naXRIZWxwZXJzLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnaXRIZWxwZXIgPSB0aGlzLmdpdEhlbHBlcnNbaW5kZXhdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdpdEhlbHBlci51cGRhdGVHaXQocHJvamVjdFBhdGgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2l0SGVscGVyID0gbmV3IEdpdEhlbHBlcih7IHByb2plY3RQYXRoLCBnaXRVcmwsIG9uTG9nOiAobXNnOiBzdHJpbmcpID0+IHsgY29uc29sZS5sb2coYEdpdEhlbHBlcjogJHtwcm9qZWN0UGF0aH0gICR7bXNnfWApOyB9IH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZ2l0SGVscGVycy5wdXNoKGdpdEhlbHBlcik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2l0SGVscGVyO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBjb25maWdUb1RvcChpdGVtOiBQYWNrUHJvamVjdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudGFza0xpc3QgJiYgdGhpcy50YXNrTGlzdC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGluZGV4ID0gdGhpcy50YXNrTGlzdC5pbmRleE9mKGl0ZW0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbmRleCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHRvcCA9IHRoaXMudGFza0xpc3RbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGFza0xpc3RbMF0gPSBpdGVtO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhc2tMaXN0W2luZGV4XSA9IHRvcDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zYXZlQ29uZmlnKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZTogcmVhZEZpbGVTeW5jKGpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vc3RhdGljL3RlbXBsYXRlL3Z1ZS9wcm9qZWN0Lmh0bWwnKSwgJ3V0Zi04JyksXG4gICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICBhcHAubW91bnQodGhpcy4kLmFwcCk7XG4gICAgICAgICAgICBwYW5lbERhdGFNYXAuc2V0KHRoaXMsIGFwcCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIGJlZm9yZUNsb3NlKCkge1xuICAgIH0sXG4gICAgY2xvc2UoKSB7XG4gICAgICAgIGNvbnN0IGFwcCA9IHBhbmVsRGF0YU1hcC5nZXQodGhpcyk7XG4gICAgICAgIGlmIChhcHApIHtcbiAgICAgICAgICAgIGlmIChleGlzdHNTeW5jKHNhdmVQYXRoKSkge1xuICAgICAgICAgICAgICAgIGxldCBzYXZlRGF0YTogU2F2ZURhdGEgPSByZWFkSlNPTlN5bmMoc2F2ZVBhdGgpO1xuICAgICAgICAgICAgICAgIGlmIChzYXZlRGF0YSkge1xuICAgICAgICAgICAgICAgICAgICBzYXZlRGF0YS5xckNvZGVVcmxzID0gW107XG4gICAgICAgICAgICAgICAgICAgIGlmIChzYXZlRGF0YS5zdWNjZXNzZWRQYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgc2F2ZURhdGEuc3VjY2Vzc2VkUGFjaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoc2F2ZURhdGEuZmFpbGVkUGFjaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHNhdmVEYXRhLmZhaWxlZFBhY2s7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHNhdmVEYXRhLnN1Y2Nlc3NlZFVwbG9hZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHNhdmVEYXRhLnN1Y2Nlc3NlZFVwbG9hZDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoc2F2ZURhdGEuZmFpbGVkVXBsb2FkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgc2F2ZURhdGEuZmFpbGVkVXBsb2FkO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChzYXZlRGF0YS5zdWNjZXNzZWRQcmV2aWV3KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgc2F2ZURhdGEuc3VjY2Vzc2VkUHJldmlldztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoc2F2ZURhdGEuZmFpbGVkUHJldmlldykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHNhdmVEYXRhLmZhaWxlZFByZXZpZXc7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHNhdmVEYXRhLmFwaVZlcnNpb25zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgc2F2ZURhdGEuYXBpVmVyc2lvbnM7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgbGV0IHNhdmVEYXRhU3RyID0gSlNPTi5zdHJpbmdpZnkoc2F2ZURhdGEsIG51bGwsIFwiXFx0XCIpO1xuICAgICAgICAgICAgICAgICAgICB3cml0ZUZpbGVTeW5jKHNhdmVQYXRoLCBzYXZlRGF0YVN0ciwgJ3V0Zi04Jyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBhcHAudW5tb3VudCgpO1xuICAgICAgICB9XG4gICAgfSxcbn0pOyJdfQ==