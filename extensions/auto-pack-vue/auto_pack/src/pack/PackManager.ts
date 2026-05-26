import fs, { existsSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import yaml from 'yamljs';
import { BasePlatform } from '../platforms/BasePlatform';
import { IPackConfig, supportPlatform } from '../platforms/PlatformConfig';
import PackUtil from '../utils/PackUtil';

export interface PackProject {
    name: string,
    path: string,// Cocos项目根目录
    channel: string,// 指定打包对应渠道名称
    version?: string,// 设置打包的版本号
    debug?: boolean,// 是否为测试包true:不是测试包,false:测试包
    skip?: boolean,// 是否跳过cocos构建工程，直接使用导出工程
    nonotify?: boolean,// 是否跳过钉钉通知
    tdesc?: string,// 小游戏后台上传描述，字节微信等
    BMSName?: string,// 实名控制的BMSName
    BMSVersion?: string,// 实名控制的BMSVersion
    compress?: boolean,// 是否压缩资源
    obfuscated?: boolean,// 是否混淆
    remoteConfig?: string,// 远程配置路径
    local?: boolean,// 是否本地
    config?: boolean,// 是否压缩配置
    svnConfigPath?: string,// 配置表
    bundle?: boolean,// 是否打包App Bundle 安卓需要
    hotUpdate?: boolean,// 是否需要热更包配置
    hotUpLoad?: boolean// 是否需要上传热更包配置
    upload?: boolean// 是否需要上传
    needAutoPack?: boolean// 是否需要进行自动构建上传
}

class _Pack {
    public configData: IPackConfig = null!;
    public curPackChannel: string = "";
    public projectDir: string = "";
    public isDebug: boolean = false;

    public curPlatform: BasePlatform = null!;
    public constructor() {

    }
    /**
     * 初始化必要参数
     * @param projectDir 项目目录
     * @param packChannel 打包渠道
     * @returns 
     */
    public init(project: PackProject) {
        let projectDir = project.path;
        let packChannel = project.channel;
        let version = project.version || "0.0.1";
        let isdebug = project.debug || false;
        let androidBundle = project.bundle;
        let bmsname = typeof project.BMSName == "string" ? project.BMSName : "";
        let bmsversion = typeof project.BMSVersion == "string" ? project.BMSVersion : version as string;

        this.isDebug = isdebug;
        let configyml = PackUtil.isIOS ? "pack.configios.yml" : "pack.config.yml";
        let configPath = path.join(projectDir, "settings", configyml);
        console.log(`projectDir=${projectDir}`, `pack channel=${packChannel}`);
        if (!fs.existsSync(configPath)) {
            console.error(`config file does't exits：${configPath}`);
            return;
        }
        this.projectDir = projectDir;
        this.configData = yaml.parse(fs.readFileSync(configPath).toString());
        const channelInfo = this.configData.platforms[packChannel];
        if (!channelInfo) {
            console.error(`current channel ${packChannel} does't extis, please check ${configyml}`);
            return;
        }
        const scripts = supportPlatform[packChannel] || (channelInfo.channel ? supportPlatform[channelInfo.channel] : null);
        if (!scripts) {
            console.error(`current channel ${packChannel} pack script does't extis, please confirm`);
            return;
        }
        this.checkCustomEngine();
        this.curPlatform = new scripts();
        (<any>this.curPlatform).bmsName = bmsname;
        this.curPlatform.init({ configData: this.configData, project: project });
        if (this.curPlatform.channelInfo.isNative) {
            console.log("isBundle = ", androidBundle, "bmsname = ", bmsname, "bmsversion = ", bmsversion);
            (<any>this.curPlatform).isBundle = androidBundle;

            (<any>this.curPlatform).bmsVersion = bmsversion;
        }

        this.startBuild(packChannel);
    }

    public startBuild(packChannel: string) {
        this.curPlatform.startBuild();
    }

    /**
     * 检测是否有自定义引擎路径，有则修改local/settings.json下的配置
     */
    public checkCustomEngine() {
        if (this.configData.customJsEnginePath || this.configData.customCppEnginePath) {
            let configPath = path.join(this.projectDir, "local");
            let settingjsonpath = path.join(configPath, "settings.json");
            if (!existsSync(settingjsonpath)) {
                PackUtil.mkdirSync(configPath);//没有对应输出目录则创建目录
                let obj = {
                    "use-global-engine-setting": false,
                    "use-default-js-engine": !this.configData.customJsEnginePath,
                    "js-engine-path": this.configData.customJsEnginePath ? this.configData.customJsEnginePath : "",
                    "use-default-cpp-engine": !this.configData.customCppEnginePath,
                    "cpp-engine-path": this.configData.customCppEnginePath ? this.configData.customCppEnginePath : "",
                }
                writeFileSync(settingjsonpath, JSON.stringify(obj, null, "\t"), { encoding: 'utf-8' });
            } else {
                let configinfo = JSON.parse(readFileSync(settingjsonpath, { encoding: 'utf-8' }));
                configinfo["use-global-engine-setting"] = false;
                configinfo["use-default-js-engine"] = !this.configData.customJsEnginePath;
                configinfo["use-default-cpp-engine"] = !this.configData.customCppEnginePath;
                if (this.configData.customJsEnginePath)
                    configinfo["js-engine-path"] = this.configData.customJsEnginePath;
                if (this.configData.customCppEnginePath) {
                    configinfo["cpp-engine-path"] = this.configData.customCppEnginePath;
                }
                writeFileSync(settingjsonpath, JSON.stringify(configinfo, null, "\t"), { encoding: 'utf-8' });
            }
        }
    }
}

export default class PackManager {
    private static _mgr: PackManager = null!;
    public static get ins(): PackManager {
        if (!this._mgr) {
            this._mgr = new PackManager();
            // this._mgr.getPackProjectDatas();
        }
        return this._mgr;
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
        for (let i = 0; i < this._packs.length; i++) {
            let pack = this._packs[i];
            if (pack.upload) {
                this._totalUploads++;
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
        }
        this._packIndex = index;

        if (this._oneByOne) {
            this._packOneByOne();
        }
        else {
            this._checkFinishPack();
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

    private _successUploads: string[] = [];
    private _failUploads: string[] = [];
    private _totalUploads = 0;
    public addSuccessUpload(name: string) {
        this._successUploads.push(name);
        this._checkFinishUpload();
    }
    public addFailUpload(name: string) {
        this._failUploads.push(name);
        this._checkFinishUpload();
    }
    private _checkFinishUpload() {
        if (this._successUploads.length + this._failUploads.length === this._totalUploads) {
            console.log(`--------------total upload ${this._totalUploads}  success : ${this._successUploads.length}  fail : ${this._failUploads.length}--------------------`);
            let successStr = 'success upload:' + '\n';
            let failStr = 'fail upload:' + '\n';
            for (let i = 0; i < this._successUploads.length; i++) {
                successStr += this._successUploads[i] + '\n';
            }
            console.log(successStr);

            for (let i = 0; i < this._failUploads.length; i++) {
                failStr += this._failUploads[i] + '\n';
            }
            console.log(failStr);
        }
    }

    // 一个打完打下一个
    private _packOneByOne() {
        if (!this._oneByOne) {
            console.log("oneByOne is false,不能使用这个方法--------------------");
            return;
        }
        if (this._packIndex < PackManager.ins.packs.length) {
            let project = PackManager.ins.packs[this._packIndex];
            if (project.path && project.channel) {
                new _Pack().init(project);
            }
        }
        else {
            console.log(`--------------total build projects ${PackManager.ins.packs.length}  success : ${this._successPackProjects.length}  fail : ${this._failPackProjects.length}--------------------`);
            console.log("--------------build finish all projects--------------------");
            let successStr = 'success pack projects:' + '\n';
            let failStr = 'fail pack projects:' + '\n';
            for (let i = 0; i < this._successPackProjects.length; i++) {
                successStr += this._successPackProjects[i] + '\n';
            }
            console.log(successStr);
            for (let i = 0; i < this._failPackProjects.length; i++) {
                failStr += this._failPackProjects[i] + '\n';
            }
            console.log(failStr);
            console.log("--------------build finish all projects--------------------");
        }
    }

    private _checkFinishPack() {
        if (this._packIndex >= PackManager.ins.packs.length) {
            console.log(`--------------total build projects ${PackManager.ins.packs.length}  success : ${this._successPackProjects.length}  fail : ${this._failPackProjects.length}--------------------`);
            console.log("--------------build finish all projects--------------------");
            let successStr = 'success pack projects:' + '\n';
            let failStr = 'fail pack projects:' + '\n';
            for (let i = 0; i < this._successPackProjects.length; i++) {
                successStr += this._successPackProjects[i] + '\n';
            }
            console.log(successStr);
            for (let i = 0; i < this._failPackProjects.length; i++) {
                failStr += this._failPackProjects[i] + '\n';
            }
            console.log(failStr);
            console.log("--------------build finish all projects--------------------");
        }
    }

    // 直接打，不用等上一个打完
    public doPack(index: number) {
        if (this._oneByOne) {
            console.log("oneByOne is true,不能使用这个方法--------------------");
            return;
        }
        let project = PackManager.ins.packs[index];
        if (project.path && project.channel) {
            new _Pack().init(project);
        }
    }
}