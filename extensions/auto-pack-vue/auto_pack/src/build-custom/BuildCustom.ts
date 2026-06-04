import { execSync } from 'child_process';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import path from 'path';
import { BasePlatform } from '../platforms/BasePlatform';
import { AutoUploadPlatform, ChannelInfo, channelToName, EPlatform, GAMEPF } from '../platforms/PlatformConfig';
import { FeiShuBot } from '../utils/FeiShuBot';
import { LogReport } from '../utils/LogReport';
import PackUtil from '../utils/PackUtil';
const LZString = require("../utils/lzstring");
const { gen } = require("../execl/index");
let originPlatformId: number = 1;
export function beforeStartBuild(options: {
    channel: string,//渠道
    projectDir: string,//工程目录
    platformsInfo: ChannelInfo,//渠道信息
    isDebug?: boolean,//是否是测试版本
    bmsName?: string,//强制bmsname
    platform: BasePlatform,//平台对象
}, callback: Function) {
    let { platform } = options;
    //构建前工作

    // 检测是否需要修改游戏中平台配置文件
    let platformFile = platform.platformFile;
    if (platformFile.path && existsSync(platformFile.path)) {
        let baseUrl = platformFile.isTest ? 'https://quchuangtest.yundps.com' : 'https://quchuang.yundps.com';
        let domain = platformFile.isTest ? 'https://mobiletest.yundps.com' : 'https://mobile.yundps.com';
        try {
            let fileContent = readFileSync(platformFile.path, 'utf-8');
            if (fileContent) {
                let newBaseUrl = '';
                let newDomain = '';
                fileContent = fileContent.replace(/(baseUrl|domain)\s*:\s*["'][^"']*["']/g, (match, p1) => {
                    const newValue = p1 === 'baseUrl' ? baseUrl : domain;
                    if (p1 === 'baseUrl') {
                        newBaseUrl = newValue;
                    }
                    if (p1 === 'domain') {
                        newDomain = newValue;
                    }
                    return `${p1}: "${newValue}"`;
                });
                if (newBaseUrl && newDomain) {
                    writeFileSync(platformFile.path, fileContent, 'utf-8');
                    platform.logHelper.log(`修改${platformFile.path}成功, ${newBaseUrl} , ${newDomain}`);
                }
                else {
                    platform.logHelper.log(`修改${platformFile.path}失败,未匹配到baseUrl或domain`);
                }
            }
            else {
                platform.logHelper.log(`修改${platformFile.path}失败,文件不存在`);
            }
        } catch (error) {
            platform.logHelper.log(`修改${platformFile.path}失败,${error}`);
        }
    }

    let launcherscene = path.join(options.projectDir, "assets/scene/Launcher.fire");
    if (existsSync(launcherscene)) {
        let launcher: any[] = JSON.parse(readFileSync(launcherscene, { encoding: 'utf-8' }));
        for (let i = 0, len = launcher.length; i < len; i++) {
            let obj = launcher[i];
            if (obj.hasOwnProperty('CustomPlatform')) {
                //@ts-ignore
                originPlatformId = obj['CustomPlatform'];
                //@ts-ignore
                obj['CustomPlatform'] = options.platformsInfo.forceChannelId || EPlatform[options.channel] || originPlatformId;
                if (obj.hasOwnProperty("testMode")) {
                    //@ts-ignore
                    obj['testMode'] = !!options.isDebug;
                }

                if (obj.hasOwnProperty("remoteConfig")) {
                    obj['remoteConfig'] = platform.remoteConfig;
                }
                if (obj.hasOwnProperty("bmsVersion")) {
                    obj['bmsVersion'] = platform.bmsVersion;
                    console.log('options.platform.bmsVersion', obj['bmsVersion'])
                }
                writeFileSync(launcherscene, JSON.stringify(launcher, null, "\t\t"), { encoding: 'utf8' });
                break;
            }

        }
    } else {//另外一个配置
        let configtspath = path.join(options.projectDir, "assets/script/config/GConfig.ts");
        if (existsSync(configtspath)) {
            let configts = readFileSync(configtspath, { encoding: 'utf-8' }).toString();
            //@ts-ignore
            let curChannel = GAMEPF[options.channel];
            // if(options.bmsName){
            //     curChannel = options.bmsName;
            //     console.log("强制bms=",curChannel);
            // }
            let newp = configts.replace(/public PF = .*/, `public PF = '${curChannel}';`);
            writeFileSync(configtspath, newp, { encoding: 'utf8' });
        }
    }

    let compressFire = path.join(options.projectDir, "settings", "ccc-png-auto-compress.json");
    if (existsSync(compressFire)) {
        let compressfile: any = JSON.parse(readFileSync(compressFire, { encoding: 'utf-8' }));
        compressfile["enabled"] = !!platform.isCompress;
        writeFileSync(compressFire, JSON.stringify(compressfile, null, "\t\t"), { encoding: 'utf8' });
    }
    let ocFire = path.join(options.projectDir, "settings", "ccc-obfuscated-code.json");
    if (existsSync(ocFire)) {
        let ocssfile: any = JSON.parse(readFileSync(ocFire, { encoding: 'utf-8' }));
        ocssfile["auto"] = !!platform.isOc;
        writeFileSync(ocFire, JSON.stringify(ocssfile, null, "\t\t"), { encoding: 'utf8' });
    }
    if (options.platformsInfo.isNative) {
        let hotSettingFire = path.join(options.projectDir, "settings", "ccc-zz-hot-update.json");
        if (existsSync(hotSettingFire)) {
            let hotSettingFile: any = JSON.parse(readFileSync(hotSettingFire, { encoding: 'utf-8' }));
            hotSettingFile["enabled"] = !!platform.isHotUpdate;
            if (options.platformsInfo.hotUpdateGenerateDir) {
                hotSettingFile["outputPath"] = options.platformsInfo.hotUpdateGenerateDir;
            }
            let jsbdefaultpath = path.join(platform.outputPath, `jsb-${options.platformsInfo.template}`);
            hotSettingFile["jsbdefaultPath"] = jsbdefaultpath;
            hotSettingFile["version"] = platform.version;
            writeFileSync(hotSettingFire, JSON.stringify(hotSettingFile, null, "\t\t"), { encoding: 'utf8' });
        }

    }
    let builder = path.join(options.projectDir, "settings", "project.json");

    if (existsSync(builder) && options.platformsInfo.isNative) {
        let builderFile: any = JSON.parse(readFileSync(builder, { encoding: 'utf-8' }));

        if (builderFile["excluded-modules"]) {
            builderFile["excluded-modules"] = [
                "3D",
                "3D Primitive",
                "3D Physics/cannon.js",
                "3D Physics/Builtin",
                "3D Particle"
            ];
            writeFileSync(builder, JSON.stringify(builderFile, null, "\t\t"), { encoding: 'utf8' });
        }
        console.log(builderFile)
    }


    if (platform.gameConfigPath && platform.gameConfigPath.startsWith("svn")) {
        processSVNAndXLSX(options, () => {
            compressConfig(options);
            callback();
        });
    } else {
        compressConfig(options);
        callback();
    }
    if (platform.configData.hookPath) {
        const hook = require(platform.configData.hookPath);
        if (hook.beforeStartBuild) {
            hook.beforeStartBuild(options);
        }
    }
}

function compressConfig(options: {
    channel: string,//渠道
    projectDir: string,//工程目录
    platformsInfo: ChannelInfo,//渠道信息
    isDebug?: boolean,//是否是测试版本
    bmsName?: string,//强制bmsname
    platform: BasePlatform
}) {
    if (options.platform.compressCfg) {
        const configPath = path.join(options.projectDir, 'assets/resources/config');
        const outputPath = path.join(configPath, `GameJsonCfg.txt`);
        console.log("开始压缩配置")
        // 收集所有JSON文件
        const jsonFiles: { fullPath: string, fileName: string }[] = [];
        function traverse(dir: string) {
            readdirSync(dir).forEach(file => {
                const fullPath = path.join(dir, file);
                if (statSync(fullPath).isDirectory()) {
                    traverse(fullPath);
                } else if (path.extname(file) === '.json') {
                    jsonFiles.push({ fullPath, fileName: path.basename(file, '.json') });
                }
            });
        }

        traverse(configPath);

        // 构建配置对象并压缩
        const configObj: any = {};
        jsonFiles.forEach(filePath => {
            configObj[filePath.fileName] = JSON.parse(readFileSync(filePath.fullPath, 'utf-8'));
        });

        const compressed = LZString.compressToBase64(JSON.stringify(configObj));
        writeFileSync(outputPath, compressed);
        console.log("压缩配置完成")
    }
}

async function processSVNAndXLSX(options: {
    channel: string,//渠道
    projectDir: string,//工程目录
    platformsInfo: ChannelInfo,//渠道信息
    isDebug?: boolean,//是否是测试版本
    bmsName?: string,//强制bmsname
    platform: BasePlatform
}, callback: Function) {
    const configPath = options.platform.gameConfigPath;

    let dirname = PackUtil.getLastDirectoryName(configPath);
    const exportPath = path.join(options.projectDir, "settings", dirname);
    if (existsSync(exportPath)) {
        PackUtil.removeFiles(exportPath);
    }
    console.log(`正在从SVN拉取文件: ${configPath}`);
    execSync(`svn checkout ${configPath} ${exportPath}`, { stdio: 'inherit' });

    // const excelPath = path.join(exportPath, dirname);
    const jsonexportPath = path.join(options.projectDir, "assets/resources/config");
    console.log(`正在导出到: ${exportPath} ${jsonexportPath}`);
    const files = readdirSync(exportPath);
    await gen(exportPath, jsonexportPath, files);
    // execSync(`rmdir /s /q ${exportPath}`, { stdio: 'inherit' });
    callback();
    console.log('SVN处理和xlsx转换完成');
}

export function afterBuildFinish(options: {
    platform: BasePlatform
}, callback: Function) {
    if (options.platform.configData.hookPath) {
        const hook = require(options.platform.configData.hookPath);
        if (hook.afterBuildFinish) {
            hook.afterBuildFinish(options);
        }
    }
    let pl = options.platform;
    let version = pl.version;
    let channelName = channelToName[pl.curPackChannel] || pl.channelInfo.platform;
    let gameName = pl.channelInfo.gameName ? pl.channelInfo.gameName : pl.configData.gameName;
    let outputPath = AutoUploadPlatform[pl.curPackChannel] ? (channelName + "后台") : (pl.curPackChannel == 'web_mobile' || pl.curPackChannel == 'web_desktop' ? `[${channelName}链接](${pl.channelInfo.serverPath}?t=${Date.now()})` : pl.outputPath.substr(2));
    outputPath = pl.curPackChannel == 'web_mobile' || pl.curPackChannel == 'web_desktop' ? `[${channelName}链接](${pl.channelInfo.serverPath}?t=${Date.now()})` : path.join(pl.outputPath, pl.curPackChannel);
    if (pl.curPackChannel == 'oppo' || pl.curPackChannel == 'vivo' || pl.curPackChannel == 'xiaomi' || pl.curPackChannel == 'huawei') {
        outputPath = `${outputPath}\\${pl.channelInfo.platform}\\dist\\`;
    }
    //@ts-ignore
    if (pl.curPackChannel == 'alipay' && pl.QRCodeURL) {
        //@ts-ignore
        outputPath = `[${channelName}链接](${pl.QRCodeURL})`;
    }

    if (pl.curPackChannel.indexOf("ios") != -1 && pl.isDebug) {
        //@ts-ignore
        outputPath = `[${channelName}链接](${pl.QRCodeURL})`;
        //@ts-ignore
        version = `${version}(${pl.buildVersion})`
    }
    if (pl.curPackChannel.indexOf("android") != -1) {
        //@ts-ignore
        if (pl.hotupdateUrl) {
            //@ts-ignore
            outputPath = `[热更包链接](${pl.hotupdateUrl})`;
            //@ts-ignore
            version = `${version}`
        }
        else if (pl['QRCodeURL']) {
            outputPath = pl.isHotUpLoad ? `[热更包链接](${pl['QRCodeURL']})` : `[${channelName}链接](${pl['QRCodeURL']})`;
            //@ts-ignore
            version = `${version}(${pl.buildVersion})`
        } else {
            outputPath = pl.configData.apksOutput;
        }
    }

    if (!pl.skipBuild) {
        options.platform.postToDingTalk("完成", false);
    }


    if (pl.configData.notifyFeiShuTalk && pl.configData.feiShuWebHook && !options.platform.isSkipNotify) {
        let feishubot = new FeiShuBot(pl.configData.feiShuWebHook);
        let msg =
            `游戏名字：**${gameName}**
游戏渠道：**${channelName}**
游戏版本：**${version}**
打包状态：**完成**
资源包路径：${outputPath}
打包时间：**${new Date().toLocaleString()}**
`
        let title = `${gameName}打包通知`;
        //@ts-ignore
        let directTo = outputPath.indexOf("http") != -1 ? `${pl.QRCodeURL || pl.channelInfo.serverPath}?t=${Date.now()}` : null;
        if (pl.curPackChannel === "bytedance") {
            if (pl.channelInfo.appid) {
                directTo = `https://developer.open-douyin.com/game/${pl.channelInfo.appid}/publish`
            }
        }
        feishubot.pushMsgMarkdown(msg, title, directTo);
    }
    if (pl.configData.logReportUrl) {
        let reporter = new LogReport(pl.configData.logReportUrl);
        let data: any = {};
        data.name = gameName;
        data.version = version;
        data.source_path = outputPath;
        data.build_time = `${Math.round(Date.now() / 1000)}`;
        data.release_channel = channelName;
        if (pl.channelInfo.packageName) {
            data.pkg_name = pl.channelInfo.packageName;
        }
        reporter.postLog(data)
    }
    //构建完成后工作
    callback();
}