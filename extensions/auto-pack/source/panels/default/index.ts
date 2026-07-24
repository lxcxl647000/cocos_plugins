/* eslint-disable vue/one-component-per-file */

import { ChildProcessWithoutNullStreams, spawn, exec } from 'child_process';
import { existsSync, readFileSync, readJSONSync, writeFileSync } from 'fs-extra';
import path, { join } from 'path';
import { createApp, App, defineComponent } from 'vue';
import os from 'os';
import CfgUtils from './CfgUtils';
import * as XLSX from 'xlsx';
const panelDataMap = new WeakMap<any, App>();
/**
 * @zh 如果希望兼容 3.3 之前的版本可以使用下方的代码
 * @en You can add the code below if you want compatibility with versions prior to 3.3
 */
// Editor.Panel.define = Editor.Panel.define || function(options: any) { return options }

interface PackProject {
    appId: string,
    name: string,
    path: string,// Cocos项目根目录
    channel: string,// 指定打包对应渠道名称
    skip: boolean,// 是否跳过cocos构建工程，直接使用导出工程
    upload: boolean,// 是否需要上传 与preview互斥
    needAutoPack: boolean,// 是否需要进行自动构建上传
    platformFiles: { [key: string]: { path: string, isTest: boolean, apiVersion?: string } },// key平台名称与channel对应，value游戏工程中平台的配置文件
    postToDingTalk: boolean,// 是否推送钉钉cocos构建结果
    postToDingTalk2: boolean,// 是否推送钉钉cli上传或预览结果
    md5Cache: boolean,
    sourceMaps: boolean,
    customConfigPath: string,//自定义构建模板json路径
    mainBundleCompressionType: string,//主包压缩类型  无压缩： "none"  合并依赖： "merge_dep"  合并所有JSON： "merge_all_json"  ZIP： "zip"  小游戏分包： "subpackage"
    enginePath: string,// cocos引擎路径
    engineVer: string,// cocos引擎版本
    navigationBarTextStyle: string,// 导航栏标题颜色
    preview: boolean,// 是否预览 与upload互斥
    tb_cli_token?: string,// taobao cli token
    dingTalk?: DingTalk,// 钉钉机器人配置
}
const packsPath = join(__dirname, '../../../static/packconfigs/Packs.json');
const savePath = join(__dirname, '../../../static/packconfigs/save.json');

interface TaoBao_Cli_Token {
    appid: string,
    name: string,
    token: string
}

interface DingTalk {
    dingTalkWebHook: string,
    dingTalkCustomContent_pack: string,
    dingTalkCustomContent_upload: string
}

interface QRCode {
    appid: string,
    url: string
}

interface ApiVersion {
    appid: string,
    apiVersion: string
}

interface SaveData {
    ding_talk: DingTalk,
    taobao_cli_token: TaoBao_Cli_Token[],
    qrCodeUrls: QRCode[],
    successedPack?: string[],
    failedPack?: string[],
    successedUpload?: string[],
    failedUpload?: string[],
    successedPreview?: string[],
    failedPreview?: string[],
    apiVersions?: ApiVersion[]
}

const TaskTemp: PackProject = {
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

const spawn_tb = (args: string[], success: Function, fail: Function) => {
    let sp: ChildProcessWithoutNullStreams = spawn("tbgame", args, { shell: true });
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
            let str: string = data.trim();
            let arr = str.split('最新线上版本:');
            version = arr[1].trim();
        }
        if (data.indexOf('预览二维码地址：') > -1) {
            let str: string = data.trim();
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
                openDilog('warn', 'warn', '设置调用凭证Token错误!');
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

export const openDilog = async (type: string, title: string, message: string, btnMap?: Map<string, Function>, cancel?: number) => {
    let option: Editor.Dialog.MessageDialogOptions = {
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
    let code: { response: 0, checkboxChecked: false } = await Editor.Dialog[type](message, option);
    if (btnMap) {
        let key = option.buttons[code.response];
        if (btnMap.has(key)) {
            let func = btnMap.get(key);
            if (func) {
                func();
            }
        }
    }
}

const importFunc = (cb: Function) => {
    // 1. 动态创建一个隐藏的 input 标签
    const input = document.createElement('input');
    input.type = 'file';
    // 限制只能选择 json 文件，如果导入 Excel 可以改为 '.xlsx, .xls'
    input.accept = '.json,.xlsx,.xls';
    input.style.display = 'none';

    // 2. 监听文件选择的变化
    input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        // 获取文件后缀名，判断文件类型
        const fileName = file.name;
        const fileExt = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();

        // 3. 使用 FileReader 读取文件内容
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                let importedData = null;
                if (fileExt === '.json') {
                    // 获取文件里的文本内容并解析为 JSON
                    const result = event.target?.result as string;
                    importedData = JSON.parse(result);

                } else if (fileExt === '.xlsx' || fileExt === '.xls') {
                    // Excel 文件：以二进制形式读取并解析
                    const data = new Uint8Array(event.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                    importedData = CfgUtils.getJsonData(sheetData);
                }
                cb && cb(importedData);
            } catch (error) {
                console.error(error);
                openDilog('error', '错误', '文件解析失败，请检查文件格式！');
            }

            // 5. 清理：将临时创建的 input 标签从页面中移除
            document.body.removeChild(input);
        };
        if (fileExt === '.json') {
            reader.readAsText(file); // JSON 以文本形式读取
        } else if (fileExt === '.xlsx' || fileExt === '.xls') {
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
    template: readFileSync(join(__dirname, '../../../static/template/default/index.html'), 'utf-8'),
    style: readFileSync(join(__dirname, '../../../static/style/default/index.css'), 'utf-8'),
    $: {
        app: '#app',
    },
    methods: {

    },
    ready() {
        if (this.$.app) {
            const app = createApp({});
            app.config.compilerOptions.isCustomElement = (tag) => tag.startsWith('ui-');

            app.component('MyProject', defineComponent({
                data() {
                    return {
                        taskList: {} as PackProject[],
                        isAutoPack: false,
                        qrCodeUrl: '',
                        isSetTbCliToken: false,
                        dingTalk: { dingTalkWebHook: '', dingTalkCustomContent_pack: '', dingTalkCustomContent_upload: '' } as DingTalk,
                        qrCodeUrlMap: new Map<string, QRCode>()
                    };
                },
                mounted() {
                    this.initSaveData();
                },
                methods: {
                    initSaveData() {
                        this.taskList = existsSync(packsPath) ? JSON.parse(readFileSync(packsPath, 'utf-8')).packs : [];
                        let taobaoCliTokenMap: Map<string, TaoBao_Cli_Token> = new Map<string, TaoBao_Cli_Token>();
                        if (existsSync(savePath)) {
                            let data: SaveData = readJSONSync(savePath);
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
                        let testServerWarns: string = '';
                        if (!this.taskList || this.taskList.length === 0) {
                            let btnMap = new Map<string, Function>();
                            btnMap.set('add', () => {
                                this.addProject();
                            });
                            btnMap.set('cancel', null);
                            openDilog('warn', 'warn', '请先添加自动化项目配置！', btnMap);
                            return;
                        }
                        if (this.getAutoCount() === 0) {
                            openDilog('warn', 'warn', '无自动化项目!');
                            return;
                        }
                        for (let i = 0; i < this.taskList.length; i++) {
                            this.taskList[i] = { ...TaskTemp, ...this.taskList[i] };
                            let task: PackProject = this.taskList[i];
                            if (task.needAutoPack === false) continue;
                            if (!task.appId) {
                                openDilog('warn', 'warn', '自动化项目中未配置appId，请检查配置！');
                                return;
                            }
                            if (!task.path) {
                                openDilog('warn', 'warn', '自动化项目中未配置项目路径，请检查配置！');
                                return;
                            }
                            if (!task.channel) {
                                openDilog('warn', 'warn', '自动化项目中未配置渠道平台，请检查配置！');
                                return;
                            }
                            if (!task.enginePath) {
                                openDilog('warn', 'warn', '自动化项目中未配置引擎路径，请检查配置！');
                                return;
                            }
                            if (!task.engineVer) {
                                openDilog('warn', 'warn', '自动化项目中未配置引擎版本，请检查配置！');
                                return;
                            }
                            if (task.channel === 'taobao-mini-game' && (task.upload || task.preview) && !task.tb_cli_token) {
                                openDilog('warn', 'warn', '请正确填写淘宝小游戏CLI Token！');
                                return;
                            }

                            if ((task.postToDingTalk || task.postToDingTalk2) && (!task.dingTalk || !task.dingTalk.dingTalkWebHook)) {
                                openDilog('warn', 'warn', '勾选了钉钉推送，请正确填写钉钉WebHook！');
                                return;
                            }

                            let platformFilepath = this.getPlatformFile(task);
                            if (platformFilepath) {
                                const normalizedPath = path.normalize(task.path);
                                if (platformFilepath.indexOf(normalizedPath) < 0) {
                                    openDilog('warn', 'warn', `appId:${task.appId}${task.name},${task.channel}配置不在项目路径中,请检查配置！`);
                                    return;
                                }
                                let isTest = this.getPlatformFileServer(task);
                                if (isTest && task.upload && !task.skip) {
                                    testServerWarns += `注意！！${task.appId}：${task.name}，使用的测试服！！\n`
                                }
                            }
                        }
                        if (this.isAutoPack) {
                            openDilog('warn', 'warn', '正在自动化，请稍后再试!');
                            return;
                        }

                        const autoPack = () => {
                            openDilog('info', 'start', '开始自动化');
                            this.isAutoPack = true;
                            this.saveConfig();

                            let path = join(__dirname, '../../../static/auto-pack/build/app.js');
                            let args = [path];
                            let sp: ChildProcessWithoutNullStreams = spawn("node", args, { shell: true });
                            sp.stdout.setEncoding('utf8');
                            sp.stdout.on('data', (data) => {
                                console.log(`autoPack stdout ${data.toString()}`);
                            });
                            sp.stderr.on('data', (data) => {
                                console.log(`autoPack stderr ${data.toString()}`);
                            })
                            sp.on('exit', (code, data) => {
                                if (code === 0) {
                                    console.log(`autoPack exit suscess ${data}`);
                                    let msg = '';
                                    if (existsSync(savePath)) {
                                        let saveData: SaveData = JSON.parse(readFileSync(savePath, 'utf-8'));
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
                                    openDilog('info', '完成', `自动化完成!\n${msg}`);
                                }
                                else {
                                    console.log(`autoPack exit fail ${data}`);
                                    openDilog('error', '失败', '自动化失败!');
                                }
                                this.isAutoPack = false;
                            });
                        }
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
                        let btnMap = new Map<string, Function>();
                        btnMap.set('ok', () => {
                            autoPack();
                        });
                        openDilog('warn', 'warn', `${msg}开始自动化?`, btnMap, 1);
                    },
                    addProject() {
                        this.taskList.push({ ...TaskTemp });
                        openDilog('info', 'add', '添加成功');
                    },
                    delProject(item: PackProject) {
                        let btnMap = new Map<string, Function>();
                        btnMap.set('delete', () => {
                            for (let i = 0; i < this.taskList.length; i++) {
                                let task = this.taskList[i];
                                if (task.appId === item.appId && task.name === item.name) {
                                    this.taskList.splice(i, 1);
                                    break;
                                }
                            }
                        });
                        openDilog('warn', 'delete', '是否删除配置?', btnMap, 1);
                    },
                    importPacksConfig() {
                        // 说明静态文件中有 Packs.json了，询问是否替换
                        const cb = (importedData: any) => {
                            // 假设导入的 JSON 格式也是 { packs: [...] }
                            if (importedData && ((importedData.packs && Array.isArray(importedData.packs) || Array.isArray(importedData)))) {
                                // 将导入的数据替换到当前的 taskList 中
                                let data = importedData.packs ? importedData.packs : importedData;
                                let tmps: PackProject[] = [...this.taskList];
                                this.taskList = [];
                                for (let i = 0; i < data.length; i++) {
                                    this.taskList[i] = { ...TaskTemp, ...data[i] };
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
                                openDilog('info', '提示', '导入成功！');
                            }
                            else {
                                openDilog('warn', '警告', '导入的文件格式不正确！');
                            }
                        };
                        if (this.taskList && this.taskList.length > 0) {
                            let btnMap = new Map<string, Function>();
                            btnMap.set('replace', () => {
                                importFunc(cb);
                            });
                            btnMap.set('cancel', null);
                            openDilog('warn', 'replace', 'Packs.json 已存在，是否替换?', btnMap);
                        }
                        else {
                            importFunc(cb);
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
                            let packs: PackProject[] = [];
                            for (let i = 0; i < this.taskList.length; i++) {
                                const { dingTalk, tb_cli_token, ...t } = this.taskList[i];
                                packs.push(t);
                            }
                            const exportData = { packs };
                            const dataStr = JSON.stringify(exportData, null, "\t");

                            // 2. 获取当前系统的桌面路径
                            const desktopPath = os.homedir() + '/Desktop';

                            // 3. 拼接完整的保存路径
                            const exportPath = join(desktopPath, `Packs.json`);

                            // 4. 使用 Node.js 原生 fs 模块同步写入文件到桌面
                            writeFileSync(exportPath, dataStr, 'utf-8');

                            // 5. 弹出成功提示
                            openDilog('info', '提示', `配置已成功导出到桌面！\n文件名：${`Packs.json`}`);

                        } catch (error) {
                            console.error('导出失败:', error);
                            openDilog('error', '错误', '导出配置文件失败，请检查权限！');
                        }
                    },
                    onekeyOperateAutoPack(flag: boolean) {
                        for (let i = 0; i < this.taskList.length; i++) {
                            this.taskList[i].needAutoPack = flag;
                            if (!flag) {
                                this.taskList[i].upload = false;
                                this.taskList[i].skip = true;
                            }
                        }
                    },
                    onekeyOperateUpload(flag: boolean) {
                        for (let i = 0; i < this.taskList.length; i++) {
                            this.taskList[i].upload = flag;
                        }
                    },
                    onekeyOperateSkipPack(flag: boolean) {
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
                    openLogDir(path: string) {
                        if (!existsSync(path)) {
                            openDilog('warn', 'warn', '日志文件夹不存在！');
                            return;
                        }
                        try {
                            exec(`start "" "${path}"`, (error) => {
                                if (error) {
                                    console.error('执行命令出错:', error);
                                    openDilog('error', '错误', '无法打开目录，请检查路径或权限！');
                                }
                            });
                        } catch (error) {
                            console.error('打开目录异常:', error);
                            openDilog('error', '错误', '发生未知错误，无法打开目录！');
                        }
                    },
                    openToolLog() {
                        this.openLogDir(join(__dirname, '../../../toolLog'));
                    },
                    clickAutoPackToggle(item: PackProject, flag: boolean) {
                        item.needAutoPack = flag;
                        if (!flag) {
                            item.upload = false;
                            item.skip = true;
                            item.preview = false;
                        }
                    },
                    setPlatformFile(item: PackProject, path: string) {
                        if (!item.platformFiles) {
                            item.platformFiles = {};
                        }
                        if (!item.platformFiles[item.channel]) {
                            item.platformFiles[item.channel] = { path: '', isTest: false };
                        }
                        item.platformFiles[item.channel].path = path;
                    },
                    setPlatformFileServer(item: PackProject, isTest: boolean) {
                        if (!item.platformFiles) {
                            item.platformFiles = {};
                        }
                        if (!item.platformFiles[item.channel]) {
                            item.platformFiles[item.channel] = { path: '', isTest: false };
                        }
                        item.platformFiles[item.channel].isTest = isTest;
                    },
                    getPlatformFile(item: PackProject) {
                        if (item.platformFiles && item.platformFiles[item.channel]) {
                            return item.platformFiles[item.channel].path || '';
                        }
                        else {
                            return '';
                        }
                    },
                    getPlatformFileServer(item: PackProject) {
                        if (item.platformFiles && item.platformFiles[item.channel]) {
                            return item.platformFiles[item.channel].isTest || false;
                        }
                        else {
                            return false;
                        }
                    },
                    getApiVersion(item: PackProject) {
                        let apiVersion: string = '';
                        if (item.platformFiles && item.platformFiles[item.channel]) {
                            let path = item.platformFiles[item.channel].path;
                            if (existsSync(path)) {
                                try {
                                    let fileContent = readFileSync(path, 'utf-8');
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
                                } catch (error) {
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
                    getTaoBaoDebugUrl(item: PackProject, isPreview: boolean) {
                        if (!item) {
                            openDilog('warn', 'warn', '项目配置为空，请检查配置');
                            return;
                        }
                        if (!item.appId) {
                            openDilog('warn', 'warn', '请输入正确的appId');
                            return;
                        }
                        if (!item.tb_cli_token) {
                            openDilog('warn', 'warn', '请输入正确的淘宝CLI Token');
                            return;
                        }

                        this.isSetTbCliToken = true;
                        spawn_tb(['config', 'set', 'token', item.tb_cli_token],
                            () => {
                                this.isSetTbCliToken = false;
                                this.isAutoPack = true;
                                if (isPreview) {
                                    let compareVersion = (ver1: string, ver2: string) => {
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
                                    let outPath = path.join(item.path, `build/${compareVersion(item.engineVer, "3.0.0") ? item.channel : 'taobao-minigame'}`);
                                    spawn_tb(["preview", "-i", outPath, "-a", item.appId, "-t", "minigame", "--copy", "true", "--renderMode", "highPerformance"],
                                        (data: { previewUrl: string }) => {
                                            this.isAutoPack = false;
                                            for (let i = 0; i < this.taskList.length; i++) {
                                                if (this.taskList[i].appId === item.appId) {
                                                    this.qrCodeUrlMap.set(item.appId, { appid: item.appId, url: data.previewUrl });
                                                    break;
                                                }
                                            }
                                        },
                                        () => {
                                            this.isAutoPack = false;
                                        }
                                    );
                                }
                                else {
                                    spawn_tb(['app', '-a', item.appId],
                                        (data: { version: string }) => {
                                            this.isAutoPack = false;
                                            if (data.version) {
                                                let url = `https://m.duanqu.com?_ariver_appid=${item.appId}&nbsv=${data.version}&nbsource=debug&nbsn=TRIAL&_mp_code=tb&_container_type=gm&vconsole=true`
                                                this.qrCodeUrl = url;
                                                console.log(`getTaoBaoDebugUrl suscess ${url}`);
                                            }
                                            else {
                                                openDilog('error', '失败', '复制链接失败!');
                                            }
                                        },
                                        () => {
                                            this.isAutoPack = false;
                                            openDilog('error', '失败', '复制链接失败!');
                                        }
                                    );
                                }
                            },
                            () => {
                                this.isSetTbCliToken = false;
                            }
                        );
                    },
                    closeQrCode() {
                        this.qrCodeUrl = '';
                    },
                    async copyLink(link: string) {
                        if (link !== '') {
                            try {
                                await navigator.clipboard.writeText(link);
                                openDilog('info', '完成', `复制链接成功，可粘贴使用！`);

                            } catch (error) {
                                openDilog('error', '失败', `复制链接失败! ${error}`);
                            }
                        }
                    },
                    checkUpload(item: PackProject, isCheck: boolean) {
                        if (item.preview) {
                            item.preview = false;
                        }
                        item.upload = isCheck;
                    },
                    checkPreview(item: PackProject, isCheck: boolean) {
                        if (item.upload) {
                            item.upload = false;
                        }
                        item.preview = isCheck;
                    },
                    saveConfig() {
                        if (existsSync(savePath)) {
                            let saveData: SaveData = readJSONSync(savePath);
                            if (saveData && saveData.apiVersions) {
                                saveData.apiVersions = [];
                                let saveDataStr = JSON.stringify(saveData, null, "\t");
                                writeFileSync(savePath, saveDataStr, 'utf-8');
                            }
                        }
                        let saveData: SaveData = {
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
                        let packs: PackProject[] = [];
                        for (let i = 0; i < this.taskList.length; i++) {
                            this.taskList[i] = { ...TaskTemp, ...this.taskList[i] };
                            if (this.taskList[i].tb_cli_token) {
                                saveData.taobao_cli_token.push({ appid: this.taskList[i].appId, name: this.taskList[i].name, token: this.taskList[i].tb_cli_token });
                            }

                            if (this.taskList[i].dingTalk) {
                                if (!saveDingTalk) {
                                    saveDingTalk = true;
                                    saveData.ding_talk = { ...this.taskList[i].dingTalk };
                                }
                            }

                            if (this.taskList[i].platformFiles && this.taskList[i].platformFiles[this.taskList[i].channel] && this.taskList[i].platformFiles[this.taskList[i].channel].apiVersion) {
                                saveData.apiVersions.push({
                                    appid: this.taskList[i].appId,
                                    apiVersion: this.taskList[i].platformFiles[this.taskList[i].channel].apiVersion
                                });
                                delete this.taskList[i].platformFiles[this.taskList[i].channel].apiVersion;
                            }

                            const { dingTalk, tb_cli_token, ...t } = this.taskList[i];
                            packs.push(t);
                        }

                        this.qrCodeUrlMap.clear();

                        let data = { packs };
                        let dataStr = JSON.stringify(data, null, "\t");
                        writeFileSync(packsPath, dataStr, 'utf-8');

                        let saveDataStr = JSON.stringify(saveData, null, "\t");
                        writeFileSync(savePath, saveDataStr, 'utf-8');
                    },
                    importCliToken() {
                        const cb = (data: TaoBao_Cli_Token[]) => {
                            if (data) {
                                if (this.taskList && this.taskList.length > 0) {
                                    for (let i = 0; i < this.taskList.length; i++) {
                                        let task: PackProject = this.taskList[i];
                                        if (task.channel === 'taobao-mini-game') {
                                            for (let j = 0; j < data.length; j++) {
                                                if (data[j].appid === task.appId) {
                                                    task.tb_cli_token = data[j].token;
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                    openDilog('info', 'info', '导入成功！');
                                    this.saveConfig();
                                }
                                else {
                                    openDilog('warn', 'warn', '请先添加自动化项目配置！');
                                }
                            }
                            else {
                                openDilog('warn', 'warn', '导入cli token 数据失败！');
                            }
                        };
                        importFunc(cb);
                    }
                },
                template: readFileSync(join(__dirname, '../../../static/template/vue/project.html'), 'utf-8'),
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
            if (existsSync(savePath)) {
                let saveData: SaveData = readJSONSync(savePath);
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
                    writeFileSync(savePath, saveDataStr, 'utf-8');
                }
            }

            app.unmount();
        }
    },
});