/*
 * @Author: wujianfen wujianfen@yongwangkeji.cn
 * @Date: 2023-01-19 12:47:37
 * @LastEditors: wujianfen wujianfen@yongwangkeji.cn
 * @LastEditTime: 2023-01-31 18:36:13
 * @FilePath: \auto-pack-creator\src\platforms\Android.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { exec, execFile, spawn } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import path from 'path';
import xml2js from 'xml2js';
import PackUtil from "../utils/PackUtil";
import { BasePlatform } from "./BasePlatform";
import { ChannelInfo } from "./PlatformConfig";
const PGYERAppUploader = require('../utils/PGYERAppUploader');
export class Android extends BasePlatform {
    private _androidDir: string = "";
    public isBundle: boolean = false;
    public bmsVersion: string = "";
    public bmsName: string = "";
    public QRCodeURL: string = "";
    public buildVersion: string = "";
    public async afterBuildFinish() {
        let channelInfo: ChannelInfo = this.configData.platforms[this.curPackChannel];
        if (this.isHotUpLoad) {
            let hotSettingFire: any = path.join(this.projectDir, "settings", "ccc-zz-hot-update.json");
            if (existsSync(hotSettingFire) && channelInfo.remoteHotUpdateDir != "") {
                console.log('upload hotupdate cdn res start');
                let hotSettingFile = JSON.parse(readFileSync(hotSettingFire).toString());
                let remotepath = path.join(hotSettingFile.outputPath, hotSettingFile.version);
                let cdnrespath = channelInfo.remoteHotUpdateDir!;
                this.QRCodeURL = `${hotSettingFile.remoteUrl}${hotSettingFile.version}/project.manifest`;
                PackUtil.mkdirSync(cdnrespath);
                try {
                    PackUtil.pullCDNRes(cdnrespath);
                } catch (error) {
                    console.error(error)
                }
                PackUtil.moveFiles(remotepath, cdnrespath);
                PackUtil.uploadCDNRes(cdnrespath);
                console.log('upload hotupdatecdn res finish');
                super.afterBuildFinish();
            }
        } else {
            //真正打包
            this._androidDir = path.join(this.outputPath, `jsb-${channelInfo.template}`, 'frameworks', 'runtime-src', 'proj.android-studio');
            console.log('start to build APK...', this._androidDir, Number(channelInfo.apiLevel));
            let code = PackUtil.appVersionToCode(this.version);
            const gpPath = path.join(this._androidDir, 'gradle.properties');
            //修改配置
            // let gpData = readFileSync(gpPath).toString();
            // gpData = gpData.replace(/PROP_COMPILE_SDK_VERSION=.*/, `PROP_COMPILE_SDK_VERSION=${Number(channelInfo.apiLevel) || 29}`);
            // gpData = gpData.replace(/PROP_TARGET_SDK_VERSION=.*/, `PROP_TARGET_SDK_VERSION=${Number(channelInfo.apiLevel) || 29}`);
            // gpData = gpData.replace(/RELEASE_STORE_FILE=.*/, `RELEASE_STORE_FILE=${channelInfo.keystorePath}`);
            // gpData = gpData.replace(/RELEASE_STORE_PASSWORD=.*/, `RELEASE_STORE_PASSWORD=${channelInfo.keystorePassword}`);
            // gpData = gpData.replace(/RELEASE_KEY_ALIAS=.*/, `RELEASE_KEY_ALIAS=${channelInfo.keystoreAlias}`);
            // gpData = gpData.replace(/RELEASE_KEY_PASSWORD=.*/, `RELEASE_KEY_PASSWORD=${channelInfo.keystoreAliasPassword}`);
            // writeFileSync(gpPath, gpData);

            //修改包名
            const abgPath = path.join(this._androidDir, 'app', 'build.gradle');
            const outputApkPath = path.join(this._androidDir, 'app', 'build', "outputs");
            let gradleData = readFileSync(abgPath).toString();
            let matcher1 = /applicationId[ ]+\"[a-zA-Z0-9_.]+\"/;
            gradleData = gradleData.replace(matcher1, `applicationId "${channelInfo.packageName}"`);
            writeFileSync(abgPath, gradleData);
            if (existsSync(outputApkPath)) {//为了处理apk一些输出问题，删除outputs下所有东西
                PackUtil.removeFiles(outputApkPath);
            }
            return new Promise<void>((resolve, reject) => {
                let buildType = this.isBundle ? "bundleRelease" : "assembleRelease";
                let oparray = ["-q", buildType, `-PVERSION_CODE=${code}`, `-PVERSION_NAME=${this.version}`];
                if (this.configData.apksOutput) {
                    let time = Math.ceil((new Date()).getTime() / 1000);
                    let suffix = `_${this.version}_${time}`;
                    let outputapks = path.join(this.configData.apksOutput, this.curPackChannel + (this.isBundle ? "_bundle" : (this.isDebug ? "_debug" : "")) + suffix);
                    // this.outputPath = outputapks;
                    this.configData.apksOutput = outputapks;
                    oparray.push(`-POUT_PUT_DIR=${outputapks}`);
                }
                console.log(this._androidDir)
                // 检查gradlew文件是否存在并设置执行权限（macOS/Linux）
                let gradlewPath = path.join(this._androidDir, PackUtil.isWindow ? 'gradlew.bat' : 'gradlew');
                if (!existsSync(gradlewPath)) {
                    console.error(`gradlew文件不存在: ${gradlewPath}`);
                    reject(new Error(`gradlew文件不存在，请确保CocosCreator已正确构建Android项目`));
                    return;
                }
                if (!PackUtil.isWindow && existsSync(gradlewPath)) {
                    // 在macOS/Linux上给gradlew文件添加执行权限
                    const { execSync } = require('child_process');
                    try {
                        execSync(`chmod +x "${gradlewPath}"`, { cwd: this._androidDir });
                        console.log('已设置gradlew执行权限');
                    } catch (error) {
                        console.warn('设置gradlew执行权限失败:', error);
                    }
                }
                let self = this;
                let command;
                if (PackUtil.isWindow) {
                    // Windows使用execFile
                    command = 'gradlew.bat';
                } else {
                    // macOS/Linux使用exec，并明确指定shell脚本路径
                    command = `./gradlew`;
                }
                let pro;
                if (PackUtil.isWindow) {
                    // Windows使用execFile执行gradlew.bat
                    console.log('Windows系统: 使用execFile执行gradlew.bat');
                    pro = execFile('gradlew.bat', oparray, { cwd: this._androidDir, shell: true, encoding: "utf-8" });
                } else {
                    // macOS/Linux使用exec执行./gradlew
                    console.log('macOS/Linux系统: 使用exec执行./gradlew');
                    let fullCommand = `./gradlew ${oparray.join(' ')}`;
                    console.log('执行命令:', fullCommand);
                    pro = exec(fullCommand, { cwd: this._androidDir, encoding: "utf-8" });
                }
                pro.stdout?.on('error', (data) => {
                    console.error("fasheng错误", data.toString());
                    reject(null);
                })
                pro.stderr?.on('data', (data) => {
                    console.log(data);
                    // throw Error();
                })
                pro.on('exit', (code, sign) => {
                    if (code == 0) {
                        //上传到蒲公英
                        if (channelInfo.pgyerApiKey && !this.isBundle) {
                            let apkFilePath = '';
                            try {
                                const apkFiles = PackUtil.findApkFiles(this.configData.apksOutput);
                                if (apkFiles.length > 0) {
                                    apkFilePath = apkFiles[0]; // 使用第一个找到的apk文件
                                    console.log('找到apk文件:', apkFilePath);
                                } else {
                                    console.error('在outputPath目录下未找到apk文件:', this.configData.apksOutput);
                                    reject(new Error('未找到apk文件'));
                                    return;
                                }
                            } catch (error) {
                                console.error('查找apk文件失败:', error);
                                reject(error);
                                return;
                            }
                            const uploadOptions = {
                                filePath: apkFilePath, // 上传文件路径
                                log: true, // 显示 log
                                buildInstallType: 1, // 安装方式:  2 为密码安装
                            }
                            let pgyerAppUploader = new PGYERAppUploader(channelInfo.pgyerApiKey);
                            pgyerAppUploader.upload(uploadOptions).then((res: any) => {
                                console.log("上传蒲公英成功", res);
                                self.QRCodeURL = res.data.buildQRCodeURL;
                                self.buildVersion = res.data.buildBuildVersion;
                                resolve();
                                super.afterBuildFinish();
                            }).catch((err: any) => {
                                console.error("上传蒲公英失败", err);
                                reject();
                                throw Error();
                            });
                        } else {
                            resolve();
                            super.afterBuildFinish();
                        }
                    } else {
                        console.log("exit error", code, sign);
                        reject(sign);
                        throw Error();
                    }
                });
                pro.on('error', (data) => {
                    console.log("fa生错误", data);
                })
            });
        }

    }

    public async build(): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            let configData = this.configData;
            let channelInfo = this.channelInfo;
            let buildPath = this.outputPath;
            //构建信息
            let buildInfo = `"title=${configData.title};platform=${channelInfo.platform};buildPath=${buildPath};debug=false;md5Cache=${channelInfo.md5Cache};packageName=${channelInfo.packageName};useDebugKeystore=false;keystorePath=${channelInfo.keystorePath};keystorePassword=${channelInfo.keystorePassword};keystoreAlias=${channelInfo.keystoreAlias};keystoreAliasPassword=${channelInfo.keystoreAliasPassword};template=${channelInfo.template};orientation={'portrait':${this.configData.orientation == 'portrait'},'landscapeLeft':${this.configData.orientation != 'portrait'}};apiLevel=android-${Number(channelInfo.apiLevel) || 29};appABIs=['armeabi-v7a','arm64-v8a'];"`;
            try {
                console.log("building...");
                let sp = spawn(`${this.enginePath}`, ["--path", `${this.projectDir}`, "--build", `${buildInfo}`], { shell: true });
                sp.stdout.setEncoding('utf8');
                sp.stdout.on('data', (data) => {
                    console.log(data.toString())
                });
                sp.stdout.on('error', (data) => {
                    console.error(data.toString());
                })
                sp.stderr.on('data', (data) => {
                    console.log(data.toString())
                })
                sp.on('exit', (code, sign) => {
                    if (code == 0) {
                        console.log(`build finish ${this.curPackChannel}`);
                        resolve(true);
                    } else {
                        console.log(`build Error : ${code} , ${sign}`);
                        throw Error();
                    }
                });
                sp.on('error', (data) => {
                    console.log(data.toString());
                })
                console.log("output path = ", buildPath)
            } catch (error) {
                console.log(`build failed ${this.curPackChannel}:${error}`);
                reject(false);
                throw Error();
            }
        });
    }
    public async beforeStartBuild() {

        let configPath = path.join(this.projectDir, "settings", "builder.json");
        if (existsSync(configPath)) {
            let config = JSON.parse(readFileSync(configPath, { encoding: 'utf-8' }));
            if (this.channelInfo.packageName && config && config.android) {
                config.android.packageName = this.channelInfo.packageName;
            }
            writeFileSync(configPath, JSON.stringify(config, null, "\t"), { encoding: 'utf-8' });
        } else {
            throw Error("please pack first in editor");
        }
        if (this.bmsVersion == "") {
            this.bmsVersion = this.version;
        }
        if (this.bmsName != "" || this.bmsVersion != "") {
            await this.configAndroidManifest();
        }
        await super.beforeStartBuild();
    }

    public configAndroidManifest() {
        let self = this;
        let ischange = false;
        let channelInfo = this.channelInfo;
        //真正打包
        let _androidDir = path.join(this.outputPath, `jsb-${channelInfo.template}`, 'frameworks', 'runtime-src', 'proj.android-studio');
        return new Promise((resolve, reject) => {
            //修改Androidmanifest.xml配置
            const manifest = path.join(_androidDir, 'app', 'AndroidManifest.xml');
            if (existsSync(manifest)) {
                let str = readFileSync(manifest, { encoding: 'utf-8' });
                const Parser = new xml2js.Parser({});
                Parser.parseString(str, function (err: any, result: any) {
                    let matadatas: any[] = result.manifest.application[0]["meta-data"];
                    if (matadatas && matadatas.length) {
                        for (let i = 0, len = matadatas.length; i < len; i++) {
                            let arr = matadatas[i];
                            if (arr["$"]) {
                                /*if (self.bmsName && arr["$"]["android:name"] == "BMS_CONFIG_APP_NAME") {
                                    arr["$"]["android:value"] = self.bmsName;
                                    ischange = true;
                                } else if */
                                if (self.bmsVersion && arr["$"]["android:name"] == "BMS_CONFIG_VERSION") {
                                    arr["$"]["android:value"] = self.bmsVersion;
                                    ischange = true;
                                }
                            }
                        }
                        if (ischange) {
                            let builder = new xml2js.Builder({ xmldec: { standalone: false, version: '1.0', encoding: 'utf-8' }, renderOpts: { newline: "\n", pretty: true } });
                            let xml = builder.buildObject(result);
                            writeFileSync(manifest, xml, { encoding: 'utf-8' });
                        }
                        resolve(null);
                    }
                })
            } else {
                console.log("不存在AndroidManifest.xml");
                resolve(null);
            }
        });
    }
}