import { BasePlatform } from "./BasePlatform";
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import path from "path";
import PackManager from "../pack/PackManager";
import { DingdingBot } from "../utils/DingdingBot";
import { AutoUploadPlatform, channelToName } from "./PlatformConfig";
export class TaoBaoMicro extends BasePlatform {
    public QRCodeURL: string = "";
    public async afterBuildFinish() {
        if (this.upload) {
            let version = '';
            let outPath = path.join(this.outputPath, this.curPackChannel);
            this.logHelper.log('start upload get version');

            let uploadSuccess = () => {
                PackManager.ins.addSuccessUpload(this.configData.gameName);
                this._postToDingTalk(version, '成功');
                this.logHelper.saveLog();
            };
            let uploadFail = () => {
                PackManager.ins.addFailUpload(this.configData.gameName);
                this._postToDingTalk(version, '失败，查看日志失败详情');
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

    private _postToDingTalk(version: string, result: string) {
        if (this.configData.notifyDingTalk && this.configData.dingTalkWebHook && !this.isSkipNotify) {
            let channelName = channelToName[this.curPackChannel] || this.channelInfo.platform;
            let outputPath = AutoUploadPlatform[this.curPackChannel] ? (channelName + "后台") : (this.curPackChannel == 'web_mobile' || this.curPackChannel == 'web_desktop' ? `[${channelName}链接](${this.channelInfo.serverPath}?t=${Date.now()})` : this.outputPath.substr(2));
            let bot = new DingdingBot(this.configData.dingTalkWebHook);
            let msg = `#### **<font color='#e61a1a'>${this.configData.dingTalkCustomContent_upload}</font>** \n #### 游戏名字：**<font color='#1E90FF'>${this.configData.gameName}</font>** \n ##### 游戏渠道：**${channelName}**\n ##### 上传版本：**${version}** \n ##### 状态：**<font color='#00dd00'>上传${result}</font>** \n ##### 资源包路径：${outputPath} \n ##### 上传时间：**${new Date().toLocaleString()}** \n`;
            let title = `${this.configData.gameName}`;
            bot.pushMsgMarkdown(msg, title);
        }
    }

    private _spawn(args: string[], outFunc: Function, success: Function, fail: Function) {
        if (!args || args.length === 0) {
            return;
        }
        let needLogin = false;
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
        })
        sp.on('exit', (code) => {
            if (code === 0) {
                if (needLogin) {
                    this.logHelper.log(`${this.configData.gameName} ${commondStr} failed : 登录过期`);
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

    public async beforeStartBuild() {
        await super.beforeStartBuild();
    }
}