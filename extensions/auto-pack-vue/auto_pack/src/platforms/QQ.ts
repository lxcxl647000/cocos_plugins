import { execFile, execFileSync, execSync, spawn, spawnSync } from "child_process";
import { BasePlatform } from "./BasePlatform";
import path from 'path';
import PackUtil from "../utils/PackUtil";
import { ChannelInfo } from "./PlatformConfig";
import { existsSync, readFileSync, writeFileSync } from "fs";
export class QQ extends BasePlatform {
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

            let desc = this.desc ? this.desc : `autopack-${this.version}`;
            let runpath = path.join(__dirname, "../../");
            console.log("version=",this.version, desc, this.channelInfo.privatePath!, path.join(this.outputPath, this.channelInfo.platform));
            let upload = execFile(`qqupload.bat`, [this.version, desc, this.channelInfo.privatePath!, path.join(this.outputPath, this.channelInfo.platform)], { cwd: runpath });
            // let upload = execFile(`cli.bat`, ["-u", `${this.version}@${this.outputPath}`, "--upload-desc", desc], { cwd: this.channelInfo.toolsDir });
            upload.on('data', (data) => {
                console.log(data);
            });
            upload.on('error', (err: Error) => {
                console.log(err.message);
            });
            upload.on('exit', (code, sign) => {
                if (code == 0) {
                    console.log(`upload ${this.curPackChannel} success!`);
                    this.saveBackUpConfig();
                    super.afterBuildFinish();
                } else {
                    console.log(code, sign);
                    throw Error();
                }
            });
            // this.saveBackUpConfig();
        } else {
            throw Error("please pack first in editor");
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