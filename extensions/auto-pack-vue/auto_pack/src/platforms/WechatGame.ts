import { execSync, spawn, spawnSync } from "child_process";
import { BasePlatform } from "./BasePlatform";
import path from 'path';
import PackUtil from "../utils/PackUtil";
import { ChannelInfo } from "./PlatformConfig";
import { existsSync, readFileSync, writeFileSync } from "fs";
import wechatci = require('miniprogram-ci');
// const {protect} = require('minigame-code-fortify-cli');
export class WechatGame extends BasePlatform {
    public async afterBuildFinish() {
        let configPath = path.join(this.projectDir, "settings", "wechatgame.json");
        if (existsSync(configPath)) {
            let channelInfo: ChannelInfo = this.configData.platforms[this.curPackChannel];
            let remoteDir = PackUtil.compareVersion(this.configData.engineVer, "2.4.0") >= 0 ? "remote" : "res";
            let remotepath = path.join(this.outputPath, channelInfo.platform, remoteDir);
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


            // console.log("[this.channelInfo]", this.channelInfo)


            let config = JSON.parse(readFileSync(configPath, { encoding: 'utf-8' }));
            const projectConfigPath = path.join(this.outputPath, this.channelInfo.platform, "project.config.json");
            const projectContent = JSON.parse(readFileSync(projectConfigPath, { encoding: 'utf-8' }));
            projectContent.libVersion = "latest";
            writeFileSync(projectConfigPath, JSON.stringify(projectContent, null, 2));
            const project = new wechatci.Project({
                appid: config.appid,
                type: 'miniGame',
                projectPath: path.join(this.outputPath, this.channelInfo.platform),
                privateKeyPath: channelInfo.privatePath,
                ignores: ['node_modules/**/*'],
            })
            let desc = this.desc ? this.desc : `autopack-${this.version}-${new Date().toLocaleString()}`;


            // await protect("minigame", "./output")

            try {

                const uploadResut = await wechatci.upload({
                    project,
                    version: this.version,
                    desc: desc,
                    setting: {
                        es6: true, // 对应于微信开发者工具的 "ES6 转 ES5"
                        minify: true, // 上传时压缩所有代码，对应于微信开发者工具的 "上传时压缩代码"
                        autoPrefixWXSS: true
                    },
                    onProgressUpdate: console.log,
                });


                this.saveBackUpConfig();
            } catch (error) {
                throw error;
            }
        } else {
            throw Error("please pack first in editor");
        }
        //上传
        await super.afterBuildFinish();
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