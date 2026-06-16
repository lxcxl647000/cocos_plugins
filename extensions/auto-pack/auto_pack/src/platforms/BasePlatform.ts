import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import path from 'path';
import { afterBuildFinish, beforeStartBuild } from '../build-custom/BuildCustom';
import PackUtil from '../utils/PackUtil';
import { channelToName } from './PlatformConfig';
import PackManager, { PackProject } from '../pack/PackManager';
import LogHelper from '../pack/LogHelper';
import { DingdingBot } from '../utils/DingdingBot';
import * as QRCode from 'qrcode';
export class BasePlatform {
    public outputPath: string = '';
    public isEngine3: boolean = false;
    public logHelper: LogHelper = null;
    public platformFile: { path: string, isTest: boolean } = { path: '', isTest: false };
    public modifyServer: boolean = false;

    private _project: PackProject = {
        appId: '',
        name: '',
        path: '',
        channel: '',
        skip: false,
        upload: false,
        needAutoPack: false,
        platformFiles: {},
        postToDingTalk: false,
        md5Cache: false,
        sourceMaps: false,
        enableHighPerformanceMode: false,
        customConfigPath: '',
        mainBundleCompressionType: '',
        dingTalkWebHook: '',
        dingTalkCustomContent_pack: '',
        dingTalkCustomContent_upload: '',
        enginePath: '',
        engineVer: '',
        navigationBarTextStyle: ''
    };

    public get project() {
        return this._project;
    }

    public constructor() {
    }
    public init(project: PackProject) {
        this._project = project;
        let channel = project.channel;
        let outputpath = project.path;
        this.outputPath = path.join(outputpath, 'build');
        this.logHelper = new LogHelper(path.join(this.outputPath, 'log'), project.name);
        if (project.platformFiles && project.platformFiles[channel]) {
            this.platformFile.path = project.platformFiles[channel].path || '';
            this.platformFile.isTest = project.platformFiles[channel].isTest || false;
        }
        if (PackUtil.compareVersion(project.engineVer, "3.0.0") >= 0) {
            this.isEngine3 = true;
        }
        PackUtil.mkdirSync(this.outputPath);//没有对应输出目录则创建目录
    }
    public async startBuild() {
        //开始构建前
        await this.beforeStartBuild();
        let boo = true;
        if (!this._project.skip) {
            boo = await this.build();
        }
        if (boo) {
            //构建完成后
            await this.afterBuildFinish();
        }
        else {
            PackManager.ins.addFailProject(this._project.name);
            PackManager.ins.packIndex++;
        }
    }

    public async build(): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            let buildPath = this.outputPath;
            //构建信息
            let buildInfo = '';
            if (this.isEngine3) {
                buildInfo = `"title=${this._project.name};platform=${this._project.channel};buildPath=${buildPath};debug=false;md5Cache=${this._project.md5Cache};`;
            }
            else {
                buildInfo = `"platform=${this._project.channel};debug=false;md5Cache=${this._project.md5Cache};`;
            }
            if (this._project.sourceMaps) {
                buildInfo = `${buildInfo}sourceMaps=true;debug=true`;
                buildInfo = buildInfo.replace("debug=false;", "");
            }
            if (this._project.mainBundleCompressionType) {
                buildInfo = `${buildInfo}mainBundleCompressionType=${this._project.mainBundleCompressionType};`
            }
            try {
                let sp: ChildProcessWithoutNullStreams = null;
                this.logHelper.log("building...", buildInfo);
                if (this.isEngine3) {
                    buildInfo += `name=${this._project.name};`;
                    if (this._project.customConfigPath) {
                        buildInfo += `configPath=${this._project.customConfigPath}`;
                    } else {
                        this.logHelper.warn("缺少configName字段，将使用引擎默认构建配置");
                    }
                    buildInfo = `${buildInfo}"`;
                    this.logHelper.log(`构建参数: ${this._project.enginePath} --project ${this._project.path} --build ${buildInfo}`);
                    //win  ...\CocosCreator.exe --project projectPath --build "platform=web-desktop;debug=true"
                    sp = spawn(`${this._project.enginePath}`, ["--project", `${this._project.path}`, "--build", `${buildInfo}`]);
                } else {
                    buildInfo = `${buildInfo}"`;
                    //CocosCreator/CocosCreator.exe --path projectPath --build "platform=android;debug=true"
                    //D:\cocos_editor\Creator\2.4.15\CocosCreator.exe --path D:\cocos_project\copy\cybersh-2.4.15 --build "platform=taobao-minigame;debug=false;md5Cache=false;mainBundleCompressionType=subpackage"
                    sp = spawn(`${this._project.enginePath}`, ["--path", `${this._project.path}`, "--build", `${buildInfo}`]);
                }

                sp.stdout.setEncoding('utf8');
                sp.stdout.on('data', (data) => {
                    if (data.indexOf('[Build]') >= 0 || data.indexOf('[Package]') >= 0 || data.indexOf('[Build-plugin]') >= 0) {
                        console.log(`stdout cocos build ${data}`);
                    }
                    else {
                        this.logHelper.log(`stdout cocos build ${data}`);
                    }
                });
                sp.stderr.on('data', (data) => {
                    if (data.indexOf('[Build]') >= 0 || data.indexOf('[Package]') >= 0 || data.indexOf('[Build-plugin]') >= 0) {
                        console.log(`stderr cocos build ${data}`);
                    }
                    else {
                        this.logHelper.log(`stderr cocos build ${data}`);
                    }
                });
                sp.on('exit', (code, sign) => {
                    if (code == 0 || (this.isEngine3 && code == 36)) {
                        this.logHelper.log(`cocos build finish ${this._project.channel} ${this._project.name}`);
                        resolve(true);
                    } else {
                        this.logHelper.error(`
                            构建失败,错误代码:${code}
                            32 构建失败 —— 构建参数不合法
                            34 构建失败 —— 构建过程出错失败，详情请参考构建日志
                        `);
                        resolve(false);
                    }
                });
                this.logHelper.log("output path=", buildPath);
            } catch (error) {
                this.logHelper.log(`cocos build failed ${this._project.channel} ${this._project.name}:${error}`);
                reject(false);
            }
        });
    }

    public async beforeStartBuild() {
        return new Promise<void>((resolve, reject) => {
            beforeStartBuild(this, () => {
                resolve();
            })
        });
    }

    public async afterBuildFinish() {
        return new Promise<void>((resolve, reject) => {
            afterBuildFinish(this, () => {
                resolve();
                PackManager.ins.addSuccessProject(this._project.name);
                PackManager.ins.packIndex++;
            })
        });
    }

    public getDebugUrl(): string {
        return '';
    }

    public async postToDingTalk(result: string, isUpload: boolean, version?: string) {
        if (this._project.postToDingTalk && this._project.dingTalkWebHook) {
            let oprateType = '';
            let versionStr = '';
            let oprateStr = '';
            let channelName = channelToName[this._project.channel] || '';
            let outputPath = '';
            let serverName = '';
            let debugUrl = '';
            if (isUpload) {
                oprateStr = this._project.dingTalkCustomContent_upload;
                oprateType = '上传';
                versionStr = `##### ${oprateType}版本：**${version}** \n`;
                outputPath = channelName + "后台";
                debugUrl = this.getDebugUrl();
            }
            else {
                oprateStr = this._project.dingTalkCustomContent_pack;
                oprateType = '打包';
                outputPath = path.join(this.outputPath, this._project.channel);
                if (this.modifyServer && this.platformFile.path) {
                    serverName = ` ##### 服务器：**${this.platformFile.isTest ? '测试服' : '正式服'}** \n`;
                }
            }
            let bot = new DingdingBot(this._project.dingTalkWebHook);
            let msg = `#### **<font color='#e61a1a'>${oprateStr}</font>** \n` +
                ` #### 游戏名字：**<font color='#1E90FF'>${this._project.name}</font>** \n` +
                ` ##### 游戏渠道：**${channelName}**\n` +
                ` ${versionStr}` +
                ` ##### 状态：**<font color='#00dd00'>${oprateType + result}</font>** \n` +
                ` ##### 资源包路径：${outputPath} \n` +
                ` ##### ${oprateType}时间：**${new Date().toLocaleString()}** \n` +
                `${serverName}`;

            if (debugUrl) {
                msg += `${debugUrl}\n`;
                try {
                    let base64Image = await QRCode.toDataURL(debugUrl, {
                        width: 300,       // 二维码宽度
                        margin: 2,        // 边距
                        color: { dark: '#000000', light: '#ffffff' }
                    });
                    msg += `##### 请使用手机淘宝扫描下方二维码: \n` +
                        `![预览二维码](${base64Image})\n`;
                } catch (err) {
                    this.logHelper.error(`生成或推送二维码时发生错误: ${err}`);
                }
            }

            let title = `${this._project.name}`;
            bot.pushMsgMarkdown(msg, title);
        }
    }
}