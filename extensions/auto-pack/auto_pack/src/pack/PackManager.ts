import path from 'path';
import { BasePlatform } from '../platforms/BasePlatform';
import { supportPlatform } from '../platforms/PlatformConfig';
import LogHelper from './LogHelper';
import { TaoBaoMiniGame } from '../platforms/TaoBaoMiniGame';

export interface PackProject {
    appId: string,
    name: string,
    path: string,// Cocos项目根目录
    channel: string,// 指定打包对应渠道名称
    skip: boolean,// 是否跳过cocos构建工程，直接使用导出工程
    upload: boolean,// 是否需要上传 与preview互斥
    needAutoPack: boolean,// 是否需要进行自动构建上传
    platformFiles: { [key: string]: { path: string, isTest: boolean } },// key平台名称与channel对应，value游戏工程中平台的配置文件
    postToDingTalk: boolean,// 是否推送钉钉cocos构建结果
    postToDingTalk2: boolean,// 是否推送钉钉cli上传或预览结果
    md5Cache: boolean,
    sourceMaps: boolean,
    customConfigPath: string,//自定义构建模板json路径
    mainBundleCompressionType: string,//主包压缩类型  无压缩： "none"  合并依赖： "merge_dep"  合并所有JSON： "merge_all_json"  ZIP： "zip"  小游戏分包： "subpackage"
    enginePath: string,// cocos引擎路径
    engineVer: string,// cocos引擎版本
    navigationBarTextStyle: string,// 导航栏标题颜色
    preview: boolean,// 预览 与upload互斥
    tb_cli_token?: string,// 淘宝cli token
    qrCodeUrl?: string,
    dingTalk?: DingTalk,// 钉钉机器人配置
}

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

export interface SaveData {
    ding_talk: DingTalk,
    taobao_cli_token: TaoBao_Cli_Token[],
    qrCodeUrls: QRCode[]
}

class _Pack {
    public curPlatform: BasePlatform = null!;
    public constructor() {

    }
    /**
     * 初始化必要参数
     * @param packChannel 打包渠道
     * @returns 
     */
    public init(project: PackProject) {
        let packChannel = project.channel;
        const scripts = supportPlatform[packChannel] || null;
        if (!scripts) {
            PackManager.ins.logHelper.error(`${project.name} current channel ${packChannel} pack script does't extis, please confirm`);
            return;
        }
        this.curPlatform = new scripts();
        this.curPlatform.init(project);

        this.startBuild(packChannel);
    }

    public startBuild(packChannel: string) {
        this.curPlatform.startBuild();
    }
}

export default class PackManager {
    private static _mgr: PackManager = null!;
    public static get ins(): PackManager {
        if (!this._mgr) {
            this._mgr = new PackManager();
            let logOutputPath = path.resolve(__dirname, '../../../../toolLog');
            this._mgr._logHelper = new LogHelper(logOutputPath, 'PackManager');
        }
        return this._mgr;
    }

    private _logHelper: LogHelper = null!;
    public get logHelper() {
        return this._logHelper;
    }

    private _oneByOne = false;
    public set oneByOne(oneByOne: boolean) {
        this._oneByOne = oneByOne;
    }
    public get oneByOne() {
        return this._oneByOne;
    }

    private _packs: PackProject[] = [];
    public get packs() {
        return this._packs;
    }
    public set packs(packs: PackProject[]) {
        this._packs = [];
        for (let i = 0; i < packs.length; i++) {
            let data: PackProject = packs[i];
            if (data.needAutoPack) {
                this._packs.push(data);
            }
        }
        this._totalUploads = 0;
        this._totalPreviews = 0;
        for (let i = 0; i < this._packs.length; i++) {
            let pack = this._packs[i];
            if (pack.upload) {
                this._totalUploads++;
            }
            if (pack.preview) {
                this._totalPreviews++;
            }
        }
    }

    private _packIndex = 0;
    public get packIndex() {
        return this._packIndex;
    }
    public set packIndex(index: number) {
        if (index === 0) {// 从0开始的时候把数据清空
            this._successPackProjects = [];
            this._failPackProjects = [];
            this._successUploads = [];
            this._failUploads = [];

            TaoBaoMiniGame.clearData();
        }
        this._packIndex = index;

        if (this._oneByOne) {
            this._packOneByOne();
        }
        else {
            if (index === 0) {
                let packs = PackManager.ins.packs;
                for (let i = 0; i < packs.length; i++) {
                    PackManager.ins.doPack(i);
                }
            }
            else {
                this._checkFinishPack();
            }
        }
    }

    private _successPackProjects: string[] = [];
    private _failPackProjects: string[] = [];
    public addSuccessProject(name: string) {
        this._successPackProjects.push(name);
    }
    public addFailProject(name: string) {
        this._failPackProjects.push(name);
    }

    private _successUploads: BasePlatform[] = [];
    private _failUploads: string[] = [];
    private _successPreviews: BasePlatform[] = [];
    private _failPreviews: string[] = [];
    private _totalUploads = 0;
    private _totalPreviews = 0;
    public addSuccessed(platform: BasePlatform) {
        if (platform.project.upload) {
            this._successUploads.push(platform);
        }
        else if (platform.project.preview) {
            this._successPreviews.push(platform);
        }
        this._checkFinished();
    }
    public addFailed(platform: BasePlatform) {
        let name = platform.project.name;
        if (platform.project.upload) {
            this._failUploads.push(name);
        }
        else if (platform.project.preview) {
            this._failPreviews.push(name);
        }
        this._checkFinished();
    }
    private _checkFinished() {
        if ((this._successUploads.length + this._failUploads.length) + (this._successPreviews.length + this._failPreviews.length) === this._totalUploads + this._totalPreviews) {
            let uploadLog = `total upload ${this._totalUploads}  success : ${this._successUploads.length}  fail : ${this._failUploads.length}`;
            let previewLog = `total preview ${this._totalPreviews}  success : ${this._successPreviews.length}  fail : ${this._failPreviews.length}`;
            PackManager.ins.logHelper.log(`${uploadLog}\n${previewLog}`);

            let successStr = 'success upload:' + '\n';
            let failStr = 'fail upload:' + '\n';
            for (let i = 0; i < this._successUploads.length; i++) {
                successStr += `${this._successUploads[i].project.name}, DebugUrl: ${this._successUploads[i].debugUrl}\n`;
            }
            PackManager.ins.logHelper.log(successStr);

            for (let i = 0; i < this._failUploads.length; i++) {
                failStr += this._failUploads[i] + '\n';
            }
            PackManager.ins.logHelper.log(failStr);

            successStr = 'success preview:' + '\n';
            failStr = 'fail preview:' + '\n';
            for (let i = 0; i < this._successPreviews.length; i++) {
                successStr += `${this._successPreviews[i].project.name}, DebugUrl: ${this._successPreviews[i].debugUrl}\n`;
            }
            PackManager.ins.logHelper.log(successStr);

            for (let i = 0; i < this._failPreviews.length; i++) {
                failStr += this._failPreviews[i] + '\n';
            }
            PackManager.ins.logHelper.log(failStr);

            if (this._packIndex >= PackManager.ins.packs.length) {
                PackManager.ins.logHelper.saveLog();
            }
        }
    }

    // 一个打完打下一个
    private _packOneByOne() {
        if (this._packIndex < PackManager.ins.packs.length) {
            let project = PackManager.ins.packs[this._packIndex];
            if (project.path && project.channel) {
                new _Pack().init(project);
            }
            else {
                this._failedByPathOrChannel(project);
            }
        }
        else {
            this._finishPack();
        }
    }

    private _checkFinishPack() {
        if (this._packIndex >= PackManager.ins.packs.length) {
            this._finishPack();
        }
    }

    private _finishPack() {
        PackManager.ins.logHelper.log(`total build projects ${PackManager.ins.packs.length}  success : ${this._successPackProjects.length}  fail : ${this._failPackProjects.length}`);
        let successStr = 'success pack projects:';
        let failStr = 'fail pack projects:';
        for (let i = 0; i < this._successPackProjects.length; i++) {
            successStr += this._successPackProjects[i] + (i === this._successPackProjects.length - 1 ? '' : ',');
        }
        PackManager.ins.logHelper.log(successStr);
        for (let i = 0; i < this._failPackProjects.length; i++) {
            failStr += this._failPackProjects[i] + (i === this._failPackProjects.length - 1 ? '' : ',');
        }
        PackManager.ins.logHelper.log(failStr);

        if (this._successUploads.length + this._failUploads.length === this._totalUploads) {
            PackManager.ins.logHelper.saveLog();
        }
    }

    // 直接打，不用等上一个打完
    public doPack(index: number) {
        let project = PackManager.ins.packs[index];
        if (project.path && project.channel) {
            new _Pack().init(project);
        }
        else {
            this._failedByPathOrChannel(project);
        }
    }

    private _failedByPathOrChannel(project: PackProject) {
        let reason = '';
        if (!project.path) {
            reason += 'path is empty ';
        }
        if (!project.channel) {
            reason += 'channel is empty ';
        }
        const now = new Date();
        const timeStr = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
        PackManager.ins.logHelper.log(`${project.name}打包失败，原因:${reason}${timeStr}`);
        this.addFailProject(project.name);
        this.packIndex++;
    }
}