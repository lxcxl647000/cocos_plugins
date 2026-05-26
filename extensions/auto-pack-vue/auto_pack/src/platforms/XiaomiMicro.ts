import { BasePlatform } from "./BasePlatform";
import path from 'path';
import PackUtil from "../utils/PackUtil";
import { ChannelInfo } from "./PlatformConfig";
import { existsSync, readFileSync, statSync, writeFileSync } from "fs";
export class XiaomiMicro extends BasePlatform {

    public async beforeStartBuild() {
        let channelInfo: ChannelInfo = this.configData.platforms[this.curPackChannel];
        let configPath = path.join(this.projectDir, "settings", "xiaomi-runtime.json");
        if (existsSync(configPath)) {
            let config = JSON.parse(readFileSync(configPath, { encoding: 'utf-8' }));
            config.versionName = this.version;
            config.versionCode = `${PackUtil.appVersionToCode(this.version)}`;
            if (channelInfo.icon) {
                config.icon = channelInfo.icon;
            }
            if (channelInfo.privatePath) {
                config.privatePath = channelInfo.privatePath;
            }
            if (channelInfo.certificatePath) {
                config.certificatePath = channelInfo.certificatePath;
            }
            // let remotepath = path.join(this.outputPath, channelInfo.platform, "remote");
            // if(channelInfo.remoteDir){
            //     config.tinyPackageServer = channelInfo.remoteDir;
            // }
            writeFileSync(configPath, JSON.stringify(config, null, "\t"), { encoding: 'utf-8' });
        }

        await super.beforeStartBuild();
    }
    public async afterBuildFinish() {
        let channelInfo: ChannelInfo = this.configData.platforms[this.curPackChannel];
        let remoteDir = PackUtil.compareVersion(this.configData.engineVer, "2.4.0") >= 0 ? "remote" : "res";
        let remotepath = path.join(this.outputPath, channelInfo.platform, remoteDir);
        // let remotepath = path.join(this.outputPath, channelInfo.platform, "remote");
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
        this.saveBackUpConfig();
        await super.afterBuildFinish();
    }
}