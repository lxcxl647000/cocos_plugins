import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { afterBuildFinish, beforeStartBuild } from '../build-custom/BuildCustom';
import PackUtil from '../utils/PackUtil';
import { ChannelInfo, IPackConfig } from './PlatformConfig';
import PackManager, { PackProject } from '../pack/PackManager';
export class BasePlatform {
    public configData: IPackConfig = null!;
    public channelInfo: ChannelInfo = null!;
    public enginePath: string = "";
    public curPackChannel: string = "";
    public projectDir: string = "";
    public isDebug: boolean = false;
    public version: string = '1.0.0';//版本名称
    public appVerCode: number = 1;//app版本号，小游戏不需要
    public outputPath: string = '';
    public desc: string | null = null;
    public bmsName: string = "";
    public isEngine3: boolean = false;
    public upload: boolean = false;
    public skipBuild: boolean = false;

    public isSkipNotify: boolean = false;
    public isCompress: boolean = false;
    public isOc: boolean = false;
    public remoteConfig: string = "";
    public isPackLocal: boolean = false;
    public compressCfg: boolean = false;
    public bmsVersion: string = "";
    public isHotUpdate: boolean = false;
    public isHotUpLoad: boolean = false;
    public gameConfigPath: string = "";

    public constructor() {
    }
    public init(options: {
        configData: IPackConfig,
        project: PackProject,
    }) {
        this.gameConfigPath = options.project.svnConfigPath || "";
        this.isHotUpdate = options.project.hotUpdate || false;
        this.isHotUpLoad = options.project.hotUpLoad || false;
        this.bmsVersion = options.project.BMSVersion || "";
        this.compressCfg = options.project.config || false;
        this.isPackLocal = options.project.local || false;
        this.remoteConfig = (options.project.remoteConfig && options.project.remoteConfig.length > 0) ? options.project.remoteConfig : "";
        this.isOc = options.project.obfuscated || false;
        this.isCompress = options.project.compress || false;
        this.isSkipNotify = options.project.nonotify || false;
        this.skipBuild = options.project.skip || false;
        this.upload = options.project.upload || false;
        this.configData = options.configData;
        this.enginePath = options.configData.enginePath;
        this.projectDir = options.project.path;
        this.curPackChannel = options.project.channel;
        this.channelInfo = this.configData.platforms[this.curPackChannel];
        let outputpath = this.configData.outputDir;
        this.desc = options.project.tdesc || "";
        this.isDebug = options.project.debug || false;
        this.outputPath = path.join(outputpath, this.channelInfo.buildPath);
        if (PackUtil.compareVersion(this.configData.engineVer, "3.0.0") >= 0) {
            this.isEngine3 = true;
        }
        PackUtil.mkdirSync(this.outputPath);//没有对应输出目录则创建目录
        if (options.project.version) {
            this.version = options.project.version || "0.0.1";
        } else {
            this.checkNewVersion();
        }
        console.log("current is debug? ", this.isDebug);
    }
    public async startBuild() {
        let channelInfo = this.configData.platforms[this.curPackChannel] as ChannelInfo;
        if (!channelInfo) {
            console.error(`current channel ${this.curPackChannel} config info does't exits, please confirm`);
            return;
        }
        //开始构建前
        await this.beforeStartBuild();
        let boo = true;
        if (!this.skipBuild) {
            boo = await this.build();
        }
        if (channelInfo.customTemplate) {
            let customTemplatePath = path.join(this.projectDir, channelInfo.customTemplate);
            console.log('start customTemplate copy success');
            if (fs.existsSync(customTemplatePath)) {
                PackUtil.copyFiles(customTemplatePath, this.outputPath);
                console.log('customTemplate copy success');
            } else {
                console.error(`customTemplate path ${customTemplatePath} does't exits, please confirm`);
            }
        }
        if (boo) {
            //构建完成后
            await this.afterBuildFinish();
        }
        else {
            PackManager.ins.addFailProject(this.configData.gameName);
            PackManager.ins.packIndex++;
        }
    }

    public async build(): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            let configData = this.configData;
            let channelInfo = this.channelInfo;
            let buildPath = this.outputPath;
            //构建信息
            let buildInfo = `"title=${configData.title};platform=${channelInfo.platform};buildPath=${buildPath};debug=false;md5Cache=${channelInfo.md5Cache};`;
            if (channelInfo.previewHeight) {
                buildInfo = `${buildInfo}previewWidth=${channelInfo.previewWidth};previewHeight=${channelInfo.previewHeight};`
            }
            if (this.isDebug) {
                buildInfo = buildInfo.replace("debug=false;", "debug=true;");
            }
            if (channelInfo.sourceMaps || channelInfo.localPath) {
                buildInfo = `${buildInfo}sourceMaps=true;debug=true`;
                buildInfo = buildInfo.replace("debug=false;", "");
            }
            if (channelInfo.mainBundleCompressionType) {
                buildInfo = `${buildInfo}mainBundleCompressionType=${channelInfo.mainBundleCompressionType};`
            }
            try {

                // console.log(`${this.enginePath} --path ${this.projectDir} --build ${buildInfo}`);
                //@ts-ignore
                let sp: ChildProcessWithoutNullStreams = null;

                console.log("building...", buildInfo);
                if (this.isEngine3) {
                    buildInfo += `;name=${configData.title};`;
                    if (channelInfo.configName) {
                        buildInfo += `configPath=${this.projectDir}/settings/${channelInfo.configName}`;
                    } else {
                        console.warn("缺少configName字段，将使用引擎默认构建配置");
                    }
                    buildInfo = `${buildInfo}"`;
                    console.log(`构建参数: ${this.enginePath} --project ${this.projectDir} --build ${buildInfo}`);
                    //win  ...\CocosCreator.exe --project projectPath --build "platform=web-desktop;debug=true"
                    sp = spawn(`${this.enginePath}`, ["--project", `${this.projectDir}`, "--build", `${buildInfo}`]);
                } else {
                    buildInfo = `${buildInfo}"`;
                    sp = spawn(`${this.enginePath}`, ["--path", `${this.projectDir}`, "--build", `${buildInfo}`]);
                }

                sp.stdout.setEncoding('utf8');
                sp.stdout.on('data', (data) => {
                    console.log(data.toString());
                });
                sp.stderr.on('data', (data) => {
                    console.log(data.toString());
                })
                sp.on('exit', (code, sign) => {
                    if (code == 0 || (this.isEngine3 && code == 36)) {
                        console.log(`build finish ${this.curPackChannel}`);
                        resolve(true);
                    } else {
                        console.error(`
                            构建失败,错误代码:${code}
                            32 构建失败 —— 构建参数不合法
                            34 构建失败 —— 构建过程出错失败，详情请参考构建日志
                        `);
                        // throw Error();
                        resolve(false);
                    }
                });
                console.log("output path=", buildPath);
            } catch (error) {
                console.log(`build failed ${this.curPackChannel}:${error}`);
                reject(false);
            }
        });
    }

    public async beforeStartBuild() {
        let channelInfo = this.configData.platforms[this.curPackChannel];
        return new Promise<void>((resolve, reject) => {
            beforeStartBuild({ channel: this.curPackChannel, platformsInfo: channelInfo, projectDir: this.projectDir, isDebug: this.isDebug, bmsName: this.bmsName, platform: this }, () => {
                resolve();
            })
        });
    }

    public async afterBuildFinish() {
        return new Promise<void>((resolve, reject) => {
            afterBuildFinish({ platform: this }, () => {
                resolve();
                // 打包下一个工程
                PackManager.ins.addSuccessProject(this.configData.gameName);
                PackManager.ins.packIndex++;
            })
        });
    }

    public checkNewVersion() {
        let configVersion = this.channelInfo.version;//配置中的版本
        this.version = configVersion;
        //获取备份中的版本号 如果有
        const backPath = path.join(this.outputPath, 'pack.back.json');
        if (fs.existsSync(backPath)) {
            let backData: Object = JSON.parse(fs.readFileSync(backPath, { encoding: 'utf8' }));
            //@ts-ignore
            let backVersion: string = backData[this.curPackChannel];
            if (backVersion) {
                if (PackUtil.compareVersion(configVersion, backVersion) <= 0) {
                    this.version = PackUtil.versionUp(backVersion);
                }
            }
        }
    }

    public saveBackUpConfig() {
        let backData = {};
        //@ts-ignore
        backData[this.curPackChannel] = this.version;
        const backPath = path.join(this.outputPath, 'pack.back.json');
        if (fs.existsSync(backPath)) {
            fs.readFileSync(backPath, { encoding: 'utf8' });
            backData = JSON.parse(fs.readFileSync(backPath, { encoding: 'utf8' }));
            //@ts-ignore
            backData[this.curPackChannel] = this.version;
        }
        fs.writeFileSync(backPath, JSON.stringify(backData, null, "\t"), { encoding: 'utf8' });
    }
}