import { existsSync } from "fs";
import path from 'path';
import PackUtil from "../utils/PackUtil";
import { BasePlatform } from "./BasePlatform";
import { ChannelInfo } from "./PlatformConfig";
export class WebMobile extends BasePlatform {
    public async afterBuildFinish() {
        let channelInfo: ChannelInfo = this.configData.platforms[this.curPackChannel];
        let remotepath = path.join(this.outputPath, channelInfo.platform);
        if (existsSync(remotepath) && channelInfo.remoteDir != "" && !this.isPackLocal) {
            console.log('upload cdn res start');
            let cdnrespath = channelInfo.remoteDir;
            PackUtil.mkdirSync(channelInfo.remoteDir);
            PackUtil.pullCDNRes(cdnrespath);
            PackUtil.copyFiles(remotepath, cdnrespath);
            PackUtil.uploadCDNRes(cdnrespath);
            console.log('upload cdn res finish');
        }
        if (this.isPackLocal) {

            let local = path.join(this.outputPath, channelInfo.platform + "local");
            console.log('move files start', local)
            // if (existsSync(local)) {
            //     PackUtil.removeFiles(local);
            // }
            // PackUtil.mkdirSync(local);
            // let detetefile = path.join(local, channelInfo.platform);
            //NOTE: 不能移除，移除了之后正在访问游戏的浏览器会丢失以往的资源
            // if (existsSync(detetefile)) {
            //     console.log('remove old files', detetefile);
            //     PackUtil.removeFiles(detetefile);
            // }
            PackUtil.copyFiles(remotepath, local);
            console.log('move files end')
            if (channelInfo.localPath) {
                channelInfo.serverPath = channelInfo.localPath;
            } else {
                channelInfo.serverPath = "http://192.168.20.58:5500/"
            }
        }
        //上传
        await super.afterBuildFinish();
    }
}