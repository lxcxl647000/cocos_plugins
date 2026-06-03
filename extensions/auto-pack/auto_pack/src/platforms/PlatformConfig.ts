import { BasePlatform } from "./BasePlatform";
import { TaoBaoMiniGame } from "./TaoBaoMiniGame";
export type Constructor<T = {}> = new (...args: any[]) => T;

export interface SupportPlatform {
    [key: string]: Constructor<BasePlatform>;
}
export interface ChannelToName {
    [key: string]: string,
}

export const supportPlatform: SupportPlatform = {
    "taobao-mini-game": TaoBaoMiniGame
}

export const channelToName: ChannelToName = {
    "taobao-mini-game": "淘宝小游戏"
}

export interface IPackConfig {
    title: string,//打包标题
    gameName: string,//游戏名称
    enginePath: string,//引擎路径
    engineVer: string,//引擎版本
    outputDir: string,//输出目录
    customJsEnginePath?: string,//自定义js引擎路径
    customCppEnginePath?: string,//自定义cpp引擎路径
    apksOutput: string,//输出apk/ipa目录
    notifyDingTalk?: boolean,//是否通知钉钉
    dingTalkWebHook?: string,//钉钉webhook
    dingTalkCustomContent_pack?: string,//钉钉自定义内容
    dingTalkCustomContent_upload?: string,//钉钉自定义内容
    orientation?: string,//屏幕方向
    hookPath?: string,//自定义构建脚本路径
    platforms: { [key: string]: ChannelInfo },//平台信息
}

export interface ChannelInfo {
    version: string,
    md5Cache: boolean,
    buildPath: string,
    platform: string,
    appid?: string,
    gameName?: string,
    sourceMaps?: boolean,
    enableHighPerformanceMode?: boolean,//是否开启高性能模式
    configName?: string,//构建模板json名，位于项目settings下
    customTemplate?: string, //自定义构建模板路径 用于构建完成后使用customTemplate目录资源覆盖构建目录 填写CocosCreator项目内路径
    channel?: string,//渠道名称
    mainBundleCompressionType?: string,//主包压缩类型  无压缩： "none"  合并依赖： "merge_dep"  合并所有JSON： "merge_all_json"  ZIP： "zip"  小游戏分包： "subpackage"
}
