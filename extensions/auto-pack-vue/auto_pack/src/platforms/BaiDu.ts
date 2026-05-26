import { execSync, spawn, spawnSync } from "child_process";
import { BasePlatform } from "./BasePlatform";
import path from 'path';
import PackUtil from "../utils/PackUtil";
import { ChannelInfo } from "./PlatformConfig";
import { existsSync } from "fs";
export class BaiDu extends BasePlatform {
    public async afterBuildFinish() {
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
        //login
        let cmd = path.join(__dirname, "../../node_modules/.bin/swan.cmd");
        let desc = this.desc ? this.desc : `autopack-${this.version}-${new Date().toLocaleString()}`;
        let upload = spawn(cmd, ['upload', "--project-path", path.join(this.outputPath, channelInfo.platform), "--token", channelInfo.privateKey!, "--release-version", `${this.version}`, "--desc", desc, "--min-swan-version", "1.26.3", "--game"]);
        upload.stdout.setEncoding('utf-8');
        upload.stderr.setEncoding('utf-8');
        upload.stdout.on('data', (data) => {
            console.log(data);
        });
        upload.on('error', (data) => {
            console.log('error=', data);
        });
        upload.stderr.on("data", (data) => {
            console.log('error=', data);
        })
        upload.on('exit', (code, sign) => {
            if (code == 0) {
                console.log(`upload ${this.curPackChannel} success!`);
                this.saveBackUpConfig();
                super.afterBuildFinish();
            } else {
                throw Error();
            }
        });
        //上传
        // await super.afterBuildFinish();
    }
}