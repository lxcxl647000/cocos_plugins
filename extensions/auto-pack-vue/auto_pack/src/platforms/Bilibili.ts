import { spawn } from "child_process";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import PackUtil from "../utils/PackUtil";
import { ChannelInfo } from "./PlatformConfig";
import { BasePlatform } from "./BasePlatform";

export class Bilibili extends BasePlatform {
    public async afterBuildFinish() {

        let channelInfo: ChannelInfo = this.configData.platforms[this.curPackChannel];
        //不同cocos版本处理方法不同，具体根据官网来修改，这里暂只处理2.4的
        if (PackUtil.compareVersion(this.configData.engineVer, "2.4.0") >= 0) {
            //复制res/bilibili/blapp-adapter-cocos.js到根目录
            let filePath = "./blapp-adapter-cocos.js";
            if (!existsSync(path.join(this.outputPath, channelInfo.platform, "blapp-adapter-cocos.js"))) {
                filePath = path.join(__dirname, "../", filePath);
                copyFileSync(filePath, path.join(this.outputPath, channelInfo.platform, "blapp-adapter-cocos.js"));
            }

            //修改game.js
            //在require('adapter-min.js');下一行加入require('blapp-adapter-cocos.js');
            //在window.boot();下一行加入bl.launchSuccess();
            try {
                const gamejsPath = path.join(this.outputPath, channelInfo.platform, "game.js");

                // 读取文件内容
                let content = readFileSync(gamejsPath, 'utf8');

                //由于不支持requirePlugin,替换"requirePlugin('cocos');"为"require("cocos/cocos2d-js-min.js");"
                content = content.replace(`requirePlugin('cocos');`, `require("cocos/cocos2d-js-min.js");`);

                // 定义要查找的行和要插入的行
                const targetLine = "require('adapter-min.js');";
                const insertLine = "require('blapp-adapter-cocos.js');";

                // 查找目标行的位置
                const lines = content.split('\n');

                const targetIndex = lines.findIndex(line => line.trim() === targetLine);
                if (targetIndex === -1) {
                    console.log('未找到目标行:', targetLine);
                } else {
                    // 在目标行后插入新行
                    lines.splice(targetIndex + 1, 0, insertLine);
                }

                const targetLine2 = "window.boot();";
                const insertLine2 = "bl.launchSuccess();";
                const targetIndex2 = lines.findIndex(line => line.trim() === targetLine2);
                if (targetIndex === -1) {
                    console.log('未找到目标行:', targetLine2);
                } else {
                    // 在目标行后插入新行
                    lines.splice(targetIndex2 + 1, 0, insertLine2);
                }


                // 重新组合内容
                content = lines.join('\n');
                // 写回文件
                writeFileSync(gamejsPath, content, 'utf8');

                const gamejsonPath = path.join(this.outputPath, channelInfo.platform, "game.json");
                // 读取文件内容
                let jsonContent = JSON.parse(readFileSync(gamejsonPath, 'utf8'));
                if (channelInfo.appid) {
                    jsonContent.appId = channelInfo.appid;
                }
                // if (!jsonContent.version) {
                jsonContent.version = this.version;
                // }

                //是否开启高性能模式
                if (channelInfo.enableHighPerformanceMode != undefined) {
                    jsonContent.enableIOSHighPerformanceMode = channelInfo.enableHighPerformanceMode;
                }

                writeFileSync(gamejsonPath, JSON.stringify(jsonContent), 'utf8');

                console.log('文件修改完成');
            } catch (error) {
                console.error('处理文件时出错:', error);
            }
        }

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

            //上传到渠道
            if (channelInfo.uid) {
                console.log("upload start");
                let desc = this.desc ? this.desc : `autopack-${this.version}-${new Date().toLocaleString()}`;
                let bibliCliPath = path.join(__dirname, "../../node_modules/.bin/bili-sgame-cli");
                let sp = spawn(bibliCliPath, ['upload', channelInfo.uid, desc], {
                    cwd: path.join(this.outputPath, channelInfo.platform), // 设置工作目录
                    stdio: 'inherit',      // 将子进程的输入输出重定向到父进程
                    shell: true            // 使用 shell 执行命令
                });
                // sp.stdout.setEncoding('utf8');
                // sp.stdout.on('data', (data) => {
                //     console.log(data.toString());
                // });
                // sp.stderr.on('data', (data) => {
                //     console.log(data.toString());
                // })
                sp.on('error', (err) => {
                    console.log("upload err:", err);
                })
                sp.on('exit', async (code, sign) => {
                    if (code == 0) {
                        console.log("upload end");
                        //上传
                        await super.afterBuildFinish();
                    } else {
                        throw Error();
                    }
                });
            } else {
                throw Error("需要配置上传b站包的uid")
            }
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