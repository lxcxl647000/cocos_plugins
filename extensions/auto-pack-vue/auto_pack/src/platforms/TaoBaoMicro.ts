import { BasePlatform } from "./BasePlatform";
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import path from "path";
import PackManager from "../pack/PackManager";
import fs from 'fs';
export class TaoBaoMicro extends BasePlatform {
    public QRCodeURL: string = "";
    public async afterBuildFinish() {
        if (this.upload) {
            let version = '';
            let outPath = path.join(this.outputPath, this.curPackChannel);
            this.logHelper.log('start upload get version');

            let uploadSuccess = () => {
                PackManager.ins.addSuccessUpload(this.configData.gameName);
                this.postToDingTalk('成功', true, version);
                this.logHelper.saveLog();
            };
            let uploadFail = () => {
                PackManager.ins.addFailUpload(this.configData.gameName);
                this.postToDingTalk('失败，查看日志失败详情', true, version);
                this.logHelper.saveLog();
            };

            try {
                // 获取小游戏信息，拿到版本号
                this._spawn(["app", "--appId", this.channelInfo.appid],
                    (data: string) => {
                        let str: string = data.trim();
                        let arr = str.split('最新线上版本:');
                        version = arr[1].trim();
                    },
                    () => {
                        if (version) {
                            let versionArr = version.split('.');
                            version = versionArr[0] + '.' + versionArr[1] + '.' + (+versionArr[2] + 1);

                            // 上传游戏之前设置game.json文件高新能模式
                            this._setHighPerformanceMode();

                            // 上传小游戏
                            this.logHelper.log(`start upload version:${version}`);
                            this._spawn(["upload", "--input", outPath, "--appId", this.channelInfo.appid, "--type", "minigame", "--version", version], null,
                                (data: any) => {
                                    uploadSuccess();
                                },
                                () => {
                                    uploadFail();
                                }
                            );
                        }
                        // 有可能登录态过期，获取版本号失败
                        else {
                            this.logHelper.log(`upload failed :获取版本号失败`);
                            uploadFail();
                        }
                    },
                    () => {
                        uploadFail();
                    }
                );
            } catch (error) {
                this.logHelper.log(`upload failed :${error}`);
                uploadFail();
            }
        }
        else {
            this.logHelper.log(`not need to upload`);
            this.logHelper.saveLog();
        }
        this.saveBackUpConfig();
        await super.afterBuildFinish();
    }

    private _spawn(args: string[], outFunc: Function, success: Function, fail: Function) {
        if (!args || args.length === 0) {
            return;
        }
        let needLogin = false;
        let uploadFailed = false;
        let sp: ChildProcessWithoutNullStreams = spawn("tbopen", args, { shell: true });
        sp.stdout.setEncoding('utf8');
        let commondStr = sp.spawnargs[4].replace(/"/g, '');
        sp.stdout.on('data', (data) => {
            this.logHelper.log(`${commondStr} stdout ${data.toString()}`);
            outFunc && outFunc(data);
        });
        sp.stderr.on('data', (data) => {
            this.logHelper.log(`${commondStr} stderr ${data.toString()}`);
            if (data.indexOf('登录态过期，可使用指令 tbopen login 刷新登录态') > -1 || data.indexOf('need login') > -1) {
                needLogin = true;
            }
            if (data.indexOf('上传失败') > -1) {
                uploadFailed = true;
            }
        })
        sp.on('exit', (code) => {
            if (code === 0) {
                if (needLogin || uploadFailed) {
                    this.logHelper.log(`${this.configData.gameName} ${commondStr} failed : ${needLogin ? '登录过期' : '上传失败'}`);
                    fail && fail();
                }
                else {
                    this.logHelper.log(`${commondStr} success`);
                    success && success();
                }
            }
            else {
                this.logHelper.log(`${this.configData.gameName} ${commondStr} failed`);
                fail && fail();
            }
        });
    }

    private _setHighPerformanceMode() {
        this.logHelper.log('set game.json high performance mode');
        let gameJsonPath = path.join(this.outputPath, `${this.curPackChannel}/game.json`);
        if (!fs.existsSync(gameJsonPath)) {
            this.logHelper.log('game.json is not exist', gameJsonPath);
        }
        else {
            this.logHelper.log('game.json  exist', gameJsonPath);
            let content = fs.readFileSync(gameJsonPath, 'utf-8');
            if (content) {
                this.logHelper.log(`get game.json content ${content}`);
                let newContent = content;
                let data = JSON.parse(content);
                let newData = { ...data, highPerformanceMode: true };
                newContent = JSON.stringify(newData);
                this.logHelper.log(`get game.json newContent ${newContent}`);
                fs.writeFileSync(gameJsonPath, newContent, 'utf-8');
            }
            else {
                this.logHelper.log('cant get game.json content ');
            }
        }
    }

    public async beforeStartBuild() {
        await super.beforeStartBuild();
    }
}