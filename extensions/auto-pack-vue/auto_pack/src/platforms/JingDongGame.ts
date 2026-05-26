import { execSync, spawn, spawnSync } from "child_process";
import { BasePlatform } from "./BasePlatform";
import path from 'path';
import PackUtil from "../utils/PackUtil";
import { ChannelInfo } from "./PlatformConfig";
import { existsSync, readFileSync, writeFileSync } from "fs";
// import wechatci = require('miniprogram-ci');
const jgcCli = require('jd-minigame-ci')
export class JingDongGame extends BasePlatform {
    public async afterBuildFinish() {
        let configPath = path.join(this.projectDir, "settings", "wechatgame.json");
        if (existsSync(configPath)) {
            let channelInfo: ChannelInfo = this.configData.platforms[this.curPackChannel];
            let remoteDir = PackUtil.compareVersion(this.configData.engineVer, "2.4.0") >= 0 ? "remote" : "res";
            let remotepath = path.join(this.outputPath, channelInfo.platform, remoteDir);
            console.log(JSON.stringify(channelInfo))
            console.log(remotepath)
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

            let desc = this.desc ? this.desc : `autopack-${this.version}-${new Date().toLocaleString()}`;
            let uploadInfo = {
                type: 'game', // 类型
                appId: this.channelInfo.appid, // 小游戏的appId
                requestToken: this.channelInfo.token, // 小游戏的上传秘钥
                entry: path.join(this.outputPath, this.channelInfo.platform),  // 需要被打包的小游戏（或者游戏插件）的路径
                version: this.version, // 小游戏版本号
                versionName: this.version, // 小游戏版本号
                description: 'fix:' + desc, // 小游戏版本描述
            }
            console.log("[uploadInfo]", uploadInfo)


            try {

                jgcCli.upload(uploadInfo).then(async (res: any) => {
                    console.log('[upload]finish', res);
                    if(!res.code){
                         //上传
                        console.log('二维码地址:', res?.url);
                        console.log('过期时间:', res?.expiredTime);
                        await super.afterBuildFinish();
                    }
                    else{
                        throw Error(res?.message);
                    }
                });

                this.saveBackUpConfig();
            } catch (error) {
                throw error;
            }


        }
    }

    public async beforeStartBuild() {
        // if (PackUtil.compareVersion(this.configData.engineVer, "2.4.0") < 0) {//低版本需要把配置修改一下
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
        // }
        await super.beforeStartBuild();
    }
}