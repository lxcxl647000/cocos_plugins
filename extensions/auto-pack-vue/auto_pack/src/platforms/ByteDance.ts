import { spawn, spawnSync } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import path from 'path';
import PackUtil from "../utils/PackUtil";
import { BasePlatform } from "./BasePlatform";
import { ChannelInfo } from "./PlatformConfig";
const { upload, setConfig, loginByEmail, logout } = require('tt-minigame-ide-cli');
export class ByteDance extends BasePlatform {
    public QRCodeURL: string = "";
    public async beforeStartBuild() {
        if (PackUtil.compareVersion(this.configData.engineVer, "2.4.0") < 0) {//低版本需要把配置修改一下
            let configPath = path.join(this.projectDir, "settings", "wechatgame.json");
            if (existsSync(configPath)) {
                let config = JSON.parse(readFileSync(configPath, { encoding: 'utf-8' }));
                if (this.channelInfo.appid) {
                    config.appid = this.channelInfo.appid;
                }
                if (typeof this.channelInfo.REMOTE_SERVER_ROOT != 'undefined') {
                    config.REMOTE_SERVER_ROOT = this.channelInfo.REMOTE_SERVER_ROOT;
                }
                writeFileSync(configPath, JSON.stringify(config, null, "\t"), { encoding: 'utf-8' });
            } else {
                throw Error("please pack first in editor");
            }
        } else {
            let configPath = path.join(this.projectDir, "settings", "bytedance.json");
            if (existsSync(configPath)) {
                let config = JSON.parse(readFileSync(configPath, { encoding: 'utf-8' }));
                if (this.channelInfo.appid) {
                    config.appid = this.channelInfo.appid;
                } else {
                    this.channelInfo.appid = config.appid;
                }
                if (typeof this.channelInfo.REMOTE_SERVER_ROOT != 'undefined') {
                    config.REMOTE_SERVER_ROOT = this.channelInfo.REMOTE_SERVER_ROOT;
                }
                writeFileSync(configPath, JSON.stringify(config, null, "\t"), { encoding: 'utf-8' });
            } else {
                throw Error("please pack first in editor");
            }
        }
        await super.beforeStartBuild();
    }

    public async afterBuildFinish() {
        console.log("afterBuildFinish");
        let channelInfo: ChannelInfo = this.configData.platforms[this.curPackChannel];
        let remoteDir = PackUtil.compareVersion(this.configData.engineVer, "2.4.0") >= 0 ? "remote" : "res";
        let remotepath = path.join(this.outputPath, channelInfo.platform, remoteDir);
        console.log('remotepath', remotepath, channelInfo.remoteDir);
        if (existsSync(remotepath) && channelInfo.remoteDir != "") {
            console.log('upload cdn res start');
            let cdnrespath = channelInfo.remoteDir;
            PackUtil.mkdirSync(channelInfo.remoteDir);
            try {
                PackUtil.pullCDNRes(cdnrespath);
            } catch (error) {
                console.error(error)
            }
            PackUtil.moveFiles(remotepath, cdnrespath);
            PackUtil.uploadCDNRes(cdnrespath);
            console.log('upload cdn res finish');
        }
        console.log("byte start login");
        // setConfig(
        //     {
        //         proxy: 'http://localhost:888', // 配置全局代理为http://localhost:8888
        //         allowReportEvent: false, // 是否允许采集使用行为
        //     },
        //     false, // 是否使用默认的配置
        // );

        await loginByEmail({
            email: channelInfo.account,
            password: channelInfo.password,
        });
        let self = this;
        let desc = this.desc ? this.desc : `autopack-${this.version}-${new Date().toLocaleString()}`;
        (async () => {
            const res = await upload({
                project: {
                    path: path.join(this.outputPath, "bytedance"), // 小游戏项目地址
                },
                qrcode: {
                    format: 'imageFile', // 以文件形式保存二维码
                    output: './bytedance.png', // 二维码保存地址
                },
                changeLog: desc, // 此版本的版本日志
                version: this.version, // 发布的小游戏版本
                // channel: '1', // 测试通道，需要传入1-24的整数字符串，不传为默认通道
                bgColor: '#ffffffff' // 输出的二维码图片背景色（16进制rgba格式）
            });
            if (res && res.shortUrl) {
                console.log(`upload ${this.curPackChannel} success! ${res.shortUrl}`);
                self.QRCodeURL = res.shortUrl;
                super.afterBuildFinish();
            } else {
                throw Error();
            }
        })();
        //login
        /*let cmd = path.join(__dirname, "../../node_modules/.bin/tmg" + (PackUtil.isWindow ? ".cmd" : ""));
        let returninfo = spawnSync(cmd, ['login-e', `${channelInfo.account}`, `${channelInfo.password}`, '-p http://localhost:8888'], { stdio: 'inherit', shell: true });
        if (returninfo.error) {
            console.error("login error：", returninfo.error);
        }
        console.log("byte start end");
        
        console.log(cmd, 'upload', "-v", `${this.version}`, "-c", desc, path.join(this.outputPath, "bytedance"));*/
        /*let upload = spawn(cmd, ['upload', "-v", `${this.version}`, "-c", desc, path.join(this.outputPath, "bytedance")], { shell: true });
        upload.stdout.setEncoding('utf8');
        upload.stdout.on('data', (data) => {
            console.log(data);
        });
        upload.stderr.on('data', (data) => {
            const datstr = data.toString();
            console.log(datstr);
            if (datstr.startsWith("Upload Error")) {
                throw Error("upload error");
            }
        });
        upload.on('error', (err: Error) => {
            console.log('error', err.message);
        });
        upload.on('exit', (code, sign) => {
            console.log('exit', code, sign)
            if (code == 0) {
                console.log(`upload ${this.curPackChannel} success!`);
                this.saveBackUpConfig();
                super.afterBuildFinish();
            } else {
                throw Error();
            }
        });*/
    }
}