import { BasePlatform } from "./BasePlatform"
import { spawn, spawnSync } from "child_process";
import { ChannelInfo, SupportPlatform } from "./PlatformConfig";
import path from "path";
import PackUtil from "../utils/PackUtil";
import { createReadStream, existsSync } from "fs";
import request from 'request';
import qrcode from "qrcode-terminal";
import { PackProject } from "../pack/PackManager";
export class IOS extends BasePlatform {
    private _iosDir: string = "";
    public isBundle: boolean = false;
    public bmsVersion: string = "";
    public bmsName: string = "";
    public exportIpaPath: string = "";
    public workspacePath: string = "";
    public exportOptionsPath: string = "";
    public archivePath: string = "";
    public QRCodeURL: string = "";
    public schemeName: string = "";
    public buildVersion: string = "";
    public init(option: {
        configData: any,
        project: PackProject
    }) {
        super.init(option);
        let channelInfo: ChannelInfo = this.configData.platforms[this.curPackChannel];
        this._iosDir = path.join(this.outputPath, `jsb-${channelInfo.template}`, 'frameworks', 'runtime-src', 'proj.ios_mac');
        this.workspacePath = path.join(this._iosDir, `${this.channelInfo.targetName!}.xcworkspace`);
        this.exportIpaPath = path.join(this.configData.apksOutput, this.isDebug ? "Debug" : "Release", this.version, "ipa");
        this.exportOptionsPath = path.join(this._iosDir, this.isDebug ? "ExportOptionsDevelop.plist" : "ExportOptionsAppStore.plist");
        this.archivePath = path.join(this.configData.apksOutput, "Release", this.version, `${this.channelInfo.targetName!}-${this.version}.xcarchive`);
        this.schemeName = `${channelInfo.targetName!}-mobile`;
    }
    public async afterBuildFinish() {

        //真正打包

        console.log('start to build ...', this._iosDir);
        let code = PackUtil.appVersionToCode(this.version);
        /**
         * 1.修改版本号
         * 2.修改bms配置
         * 3.清理空间
         * 4.构建ar
         */
        let boo = true;
        //@ts-ignore
        if (!this.skipBuild) {
            boo = await this.changeBaseInfo();
            await this.cleanProject();
            boo = await this.buildArchive();
        }
        if (boo) {
            boo = await this.buildIpa();
        }
        if (boo) {
            await this.uploadIpa();
        }
        if (boo) {
            super.afterBuildFinish();
        }
    }

    public async build(): Promise<boolean> {
        console.log("start build");
        return new Promise<boolean>((resolve, reject) => {
            let configData = this.configData;
            let channelInfo = this.channelInfo;
            let buildPath = this.outputPath;
            //构建信息
            let buildInfo = `"title=${channelInfo.targetName};platform=${channelInfo.platform};buildPath=${buildPath};debug=false;md5Cache=${channelInfo.md5Cache};packageName=${channelInfo.packageName};template=${channelInfo.template};orientation={'portrait':${this.configData.orientation == 'portrait'},'landscapeLeft':${this.configData.orientation != 'portrait'}};"`;
            try {
                console.log("building...");
                let sp = spawn(`${this.enginePath}`, ["--path", `${this.projectDir}`, "--build", `${buildInfo}`], { shell: true });
                sp.stdout.setEncoding('utf8');
                sp.stdout.on('data', (data) => {
                    console.log(data);
                });
                sp.stdout.on('error', (data) => {
                    console.error("error", data.message);
                })
                sp.stderr.on('data', (data) => {
                    console.log("data", data.toString())
                })
                sp.on('exit', (code, sign) => {
                    if (code == 0) {
                        console.log(`build finish ${this.curPackChannel}`);
                        resolve(true);
                    } else {
                        console.log(`build fail ${this.curPackChannel}`, code, sign);
                        throw Error();
                    }
                });
                sp.on('error', (data) => {
                    console.log("error^^", data.message);
                })
                console.log("output path = ", buildPath)
            } catch (error) {
                console.log(`build failed ${this.curPackChannel}:${error}`);
                reject(false);
                throw Error();
            }
        });
    }

    public changeBaseInfo(): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {

            let infoplistpath = path.join(this._iosDir, "ios");
            console.log("修改版本号...", this.version, infoplistpath);
            spawnSync("xcrun", ["agvtool", "new-marketing-version", this.version], { cwd: this._iosDir, shell: true, encoding: 'utf-8' });
            spawnSync("xcrun", ["agvtool", "next-version", "-all"], { cwd: this._iosDir, shell: true, encoding: 'utf-8' });
            spawnSync("/usr/libexec/PlistBuddy", ["-c", `"Set :BMSVersion ${this.version}"`, "info.plist"], { cwd: infoplistpath, shell: true, encoding: 'utf-8' });
            if (this.bmsName) {
                spawnSync("/usr/libexec/PlistBuddy", ["-c", `"Set :BMSName ${this.bmsName}"`, "info.plist"], { cwd: infoplistpath, shell: true, encoding: 'utf-8' });
            }
            let v = spawnSync("/usr/libexec/PlistBuddy", ["-c", `"Print :CFBundleVersion"`, "info.plist"], { cwd: infoplistpath, shell: true, encoding: 'utf-8' });
            this.buildVersion = v.stdout;
            resolve(true);
        })
    }
    public cleanProject(): Promise<boolean> {
        // xcodebuild clean -workspace ${workspace_name}.xcworkspace \
        //          -scheme ${scheme_name} \
        //          -configuration ${build_configuration}
        console.log("--------------------------");
        console.log("清理空间 target= ", this.schemeName);
        return new Promise<boolean>((resolve, reject) => {
            let cleanpro = spawn("xcodebuild", ["clean", "-workspace", this.workspacePath, "-scheme", this.schemeName, "-configuration", "Release", "-quiet"], { cwd: this._iosDir, shell: true });
            cleanpro.stdout.setEncoding('utf8');
            cleanpro.stdout?.on('data', (data) => {
                console.log(data);
            })
            cleanpro.stdout?.on('error', (data) => {
                console.error("错误=", data);
                reject(false);
            })
            cleanpro.stderr?.on('data', (data) => {
                console.log("data", data.toString())
                // throw Error();
            })
            cleanpro.on('exit', (code, sign) => {
                if (code == 0) {
                    resolve(true);
                } else {
                    console.log("exit error", code, sign);
                    reject(false);
                    throw Error();
                }
            });
        });
    }
    public buildArchive(): Promise<boolean> {
        console.log("--------------------------");
        console.log("开始构建Archive target = ", this.schemeName);
        // xcodebuild archive -workspace ${workspace_name}.xcworkspace \
        //            -scheme ${scheme_name} \
        //            -configuration ${build_configuration} \
        //            -archivePath ${export_archive_path}
        return new Promise<boolean>((resolve, reject) => {
            if (existsSync(this.archivePath)) {
                PackUtil.removeFiles(this.archivePath);
            }
            let cleanpro = spawn("xcodebuild", ["archive", "-workspace", this.workspacePath, "-scheme", this.schemeName, "-configuration", "Release", "-archivePath", this.archivePath, "-quiet"], { cwd: this._iosDir, shell: true });
            cleanpro.stdout.setEncoding('utf8');
            cleanpro.stdout?.on('data', (data) => {
                console.log("data", data)
            })
            cleanpro.stdout?.on('error', (data) => {
                console.error("错误=", data.toString());
                reject(false);
            })
            cleanpro.stderr?.on('data', (data) => {
                console.log("data", data.toString())
                // throw Error();
            })
            cleanpro.on('exit', (code, sign) => {
                if (code == 0) {
                    resolve(true);
                } else {
                    console.log("exit error", code, sign);
                    reject(false);
                    throw Error();
                }
            });
        });
    }
    public buildIpa(): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            if (!existsSync(this.archivePath)) {
                console.log("不存在构建的archive, path = ", this.archivePath);
                reject(false);
                return;
            }
            console.log("--------------------------");
            console.log("开始构建Ipa ", this.channelInfo.targetName!);
            console.log("ExportPlist path = ", this.exportOptionsPath);
            let cleanpro = spawn("xcodebuild", ["-exportArchive", "-archivePath", this.archivePath, "-exportPath", this.exportIpaPath, "-exportOptionsPlist", this.exportOptionsPath], { cwd: this._iosDir, shell: true });
            cleanpro.stdout.setEncoding('utf-8');
            cleanpro.stdout?.on('data', (data) => {
                console.log("data", data.toString())
            })
            cleanpro.stdout?.on('error', (data) => {
                console.error("错误=", data);
                reject(false);
            })
            cleanpro.stderr?.on('data', (data) => {
                console.log("data", data.toString())
            })
            cleanpro.on('exit', (code, sign) => {
                if (code == 0) {
                    resolve(true);
                } else {
                    console.log("exit error", code, sign);
                    reject(false);
                    throw Error();
                }
            });
        })
    }
    public uploadIpa(): Promise<boolean> {
        let self = this;
        console.log("开始上传ipa")
        //蒲公英上传分发
        //        https://www.pgyer.com/apiv2/app/upload
        if (this.isDebug) {
            return new Promise<boolean>((resolve, reject) => {
                let self = this;
                request.post("https://www.pgyer.com/apiv2/app/getCOSToken",
                    {
                        _api_key: self.channelInfo.privateKey,
                        buildType: "ios",
                        buildInstallType: 1,
                    } as request.CoreOptions, function (error, response, body) {
                        if (!error && response.statusCode == 200) {
                            let bodyobj: { code: number, message: string, data: { key: string, endpoint: string, params: any } } = JSON.parse(body);
                            if (bodyobj.code == 0) {
                                console.log("获取上传还token成功", bodyobj);
                                request.post(bodyobj.data.endpoint, {
                                    //@ts-ignore
                                    key: bodyobj.data.key,
                                    signature: bodyobj.data.params.signature,
                                    "x-cos-security-token": bodyobj.data.params["x-cos-security-token"],
                                    file: createReadStream(path.join(self.exportIpaPath, `${self.schemeName}.ipa`))
                                }, function (terror, tresponse, tbody) {
                                    if (!terror && tresponse.statusCode === 204) {
                                        console.log("上传成功,获取二维码中");
                                        let getUploadResult = () => {
                                            request.get("https://www.pgyer.com/apiv2/app/buildInfo", { _api_key: self.channelInfo.privateKey, buildKey: bodyobj.data.key } as request.CoreOptions, function (gerror, greponse, ebody: any) {
                                                if (greponse.statusCode !== 200) {
                                                    setTimeout(() => {
                                                        getUploadResult()
                                                    }, 1500);
                                                    return;
                                                }

                                                let obj: { code: number, message: string, data: any } = JSON.parse(ebody);
                                                if (obj.code === 1247) {
                                                    console.log('Parsing App Data ... Please Wait ... \n');
                                                    setTimeout(() => getUploadResult(), 1500);
                                                } else if (obj.code) {
                                                    console.log('PGYER Service Error > ' + obj.code + ': ' + obj.message);
                                                    setTimeout(() => getUploadResult(), 1500);
                                                } else {
                                                    console.log("上传成功");
                                                    self.QRCodeURL = obj.data.buildQRCodeURL;
                                                    qrcode.generate(self.QRCodeURL, { small: true }, (qrcode: string) => {
                                                        console.log(qrcode);
                                                    });
                                                    resolve(true);
                                                }
                                            });
                                        }
                                        // resolve(true);
                                    } else {
                                        console.log("上传失败", terror);
                                        resolve(false);
                                    }
                                });
                            } else {
                                console.log("获取上传Token 失败", bodyobj.code, "message=", bodyobj.message);
                                resolve(false);
                            }
                        } else {
                            console.log(error);
                            resolve(false);
                        }
                    })

                // let options: request.CoreOptions = {
                //     headers: {
                //         "Content-Type": "application/x-www-form-urlencoded"
                //     },
                //     formData: {
                //         _api_key: this.channelInfo.privateKey!,
                //         file: createReadStream(path.join(this.exportIpaPath, `${self.schemeName}.ipa`)),
                //     },
                // };

                // request.post("https://www.pgyer.com/apiv2/app/upload", options, function (error, response, body) {
                //     console.debug(`response: ${JSON.stringify(body)}`);
                //     if (!error && response.statusCode == 200) {
                //         let bodyobj: { code: number, message: string, data: any } = JSON.parse(body);
                //         if (bodyobj.code == 0) {
                //             console.log("上传成功");
                //             self.QRCodeURL = bodyobj.data.buildQRCodeURL;
                //             qrcode.generate(self.QRCodeURL, { small: true }, (qrcode: string) => {
                //                 console.log(qrcode);
                //             });
                //             resolve(true);
                //         } else {
                //             console.log("上传失败 code", bodyobj.code, "message=", bodyobj.message);
                //             resolve(false);
                //         }

                //     } else {
                //         console.log(error);
                //         resolve(false);
                //     }
                // });
            });
        } else {
            return new Promise<boolean>((resolve, reject) => {
                let cleanpro = spawn("xcrun", ["altool", "--upload-app", "-f", path.join(this.exportIpaPath, `${self.schemeName}.ipa`), "-u", self.channelInfo.account!, "-p", self.channelInfo.password!, "--type", "ios"], { cwd: this._iosDir, shell: true });
                cleanpro.stdout.setEncoding('utf-8');
                cleanpro.stdout?.on('data', (data) => {
                    console.log("data", data.toString())
                })
                cleanpro.stdout?.on('error', (data) => {
                    console.error("错误=", data);
                    reject(false);
                })
                cleanpro.stderr?.on('data', (data) => {
                    console.log("data", data.toString())
                })
                cleanpro.on('exit', (code, sign) => {
                    if (code == 0) {
                        console.log("上传成功");
                        resolve(true);
                    } else {
                        console.log("exit error", code, sign);
                        reject(false);
                        throw Error();
                    }
                });
            });
        }
    }
}