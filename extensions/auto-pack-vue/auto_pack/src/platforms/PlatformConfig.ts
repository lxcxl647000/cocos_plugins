import { AlipayMicro } from "./AlipayMicro";
import { Android } from "./Android";
import { BaiDu } from "./BaiDu";
import { BasePlatform } from "./BasePlatform";
import { Bilibili } from "./Bilibili";
import { ByteDance } from "./ByteDance";
import { HuaweiMicro } from "./HuaweiMicro";
import { IOS } from "./IOS";
import { JingDongGame } from "./JingDongGame";
import { KwaiGame } from "./KwaiGame";
import { OppoMicro } from "./OppoMicro";
import { QQ } from "./QQ";
import { TaoBaoMicro } from "./TaoBaoMicro";
import { VivoMicro } from "./VivoMicro";
import { WebMobile } from "./WebMobile";
import { WechatGame } from "./WechatGame";
import { XiaomiMicro } from "./XiaomiMicro";
export type Constructor<T = {}> = new (...args: any[]) => T;

export interface SupportPlatform {
    [key: string]: Constructor<BasePlatform>;
}
export interface ChannelToName {
    [key: string]: string,
}

export const supportPlatform: SupportPlatform = {
    "web_mobile": WebMobile,
    "web_desktop": WebMobile,
    "bytedance": ByteDance,
    "wechatgame": WechatGame,
    "jingdonggame": JingDongGame,
    "bilibili": Bilibili,
    "android": Android,
    "alipay": AlipayMicro,
    "kwai": KwaiGame,
    "oppo": OppoMicro,
    "vivo": VivoMicro,
    "qq": QQ,
    "zijiaandroid": Android,
    "taptapandroid": Android,
    "mmyandroid": Android,
    "baidu": BaiDu,
    "xiaomi": XiaomiMicro,
    "googleandroid": Android,
    "googleandroidAD": Android,
    "oppoandroid": Android,
    "vivoandroid": Android,
    "hykbandroid": Android,
    "android233": Android,
    "android566": Android,
    "android233nxh": Android,
    "huawei": HuaweiMicro,
    "xiaomiandroid": Android,
    "cn_ios": IOS,
    "na_ios": IOS,
    "fxrandroid": Android,
    "hhrandroid": Android,
    "qqesandroid": Android,
    "hlxandroid": Android,
    "huaweiandroid": Android,
    "ttlyandroid": Android,
    "meizuandroid": Android,
    "amazonandroid": Android,
    "wg_web_mobile": WebMobile,
    "taobao-mini-game": TaoBaoMicro
}

export const channelToName: ChannelToName = {
    "bytedance": "字节跳动平台",
    "kwai": "快手小游戏",
    "oppo": "Oppo小游戏",
    "vivo": "Vivo小游戏",
    "qq": "QQ小游戏",
    "web_mobile": "H5",
    "web_desktop": "H5",
    "wechatgame": "微信小游戏",
    "jingdonggame": "京东小游戏",
    "zijiaandroid": "自家聚合安卓",
    "taptapandroid": "taptap安卓",
    "mmyandroid": "摸摸鱼安卓",
    "baidu": "百度小游戏",
    "xiaomi": "小米快游戏",
    "googleandroid": "谷歌安卓",
    "googleandroidAD": "谷歌安卓广告版",
    "oppoandroid": "Oppo安卓",
    "vivoandroid": "Vivo安卓",
    "hykbandroid": "安卓-好游快爆渠道",
    "android233": "安卓233渠道",
    "android233nxh": "安卓233内循环",
    "android566": "安卓566渠道",
    "huawei": "华为快游戏",
    "xiaomiandroid": "小米安卓",
    "cn_ios": "国内ios",
    "na_ios": "海外ios",
    "fxrandroid": "发行人安卓",
    "hhrandroid": "合伙人安卓",
    "qqesandroid": "7723安卓",
    "huaweiandroid": "华为安卓",
    "hlxandroid": "葫芦侠安卓",
    "ttlyandroid": "字节直播联运",
    "meizuandroid": "魅族安卓",
    "amazonandroid": "亞馬遜安卓",
    "wg_web_mobile": "微游",
    "alipay": "支付宝小游戏",
    "bilibili": "B站小游戏",
    "taobao-mini-game": "淘宝小游戏"
}

export const AutoUploadPlatform: ChannelToName = {
    "bytedance": "1",
    "wechatgame": "1",
    "jingdonggame": "1",
    "baidu": "1",
    "qq": "1",
    "cn_ios": "1",
    "na_ios": "1",
    "alipay": "1",
    "taobao-mini-game": "1"
}


export const EPlatform = {
    "web_mobile": 1,
    "web_desktop": 1,
    "zijiaandroid": 2,
    "na_ios": 3,
    "wechatgame": 4,//微信小游戏
    "bytedance": 5,//字节跳动
    "qq": 6,//qq小游戏
    "baidu": 7,//百度小游戏
    "qttgame": 8,//趣头条
    "jkwgame": 9,//即可玩
    "oppoandroid": 10,   // OPPO
    "oppo": 11,     // OPPO 快游戏
    "vivo": 12,     //vivo小游戏
    "vivoandroid": 13,       // vivo
    "xiaomiandroid": 14,      // xiaomi
    "uc": 15,
    "googleandroid": 16,      //谷歌android
    "googleandroidAD": 116,      //谷歌android
    "xiaomi": 17,//小米快游戏
    "kwai": 18,//快手
    "4399android": 19,//4399安卓
    "huaweiandroid": 20,//华为海外安卓
    "meizu": 21,
    "huawei": 22,//华为小游戏
    "taptapandroid": 23,//taptap
    "mmyandroid": 24,//mmy
    "hykbandroid": 25,
    "android233": 26,
    "cn_ios": 28,
    "android233nxh": 29,//233nxh渠道
    "android566": 30,//566渠道
    "jingdonggame": 40,//京东小游戏
    "fxrandroid": 100,
    "hhrandroid": 101,
    "meizuandroid": 102,
    "ttlyandroid": 103,/** TT直播联运安卓 */
    "amazonandroid": 104,//亞馬遜安卓
    "alipay": 105,
    "bilibili": 106,
    "taobao-mini-game": 107
}

export const GAMEPF = {
    "web_mobile": "WEB",
    "zijiaandroid": "ADR_OWN",
    "na_ios": "IOS",
    "wechatgame": "WX",//微信小游戏
    "bytedance": "TT",//字节跳动
    "qq": "QQ",//qq小游戏
    "baidu": 7,//百度小游戏
    "qttgame": 8,//趣头条
    "jkwgame": 9,//即可玩
    "oppoandroid": "ADR_OPPO",   // OPPO
    "oppo": "MIN_OPPO",     // OPPO 快游戏
    "vivo": "MIN_VIVO",     //vivo小游戏
    "vivoandroid": "ADR_VIVO",       // vivo
    "xiaomiandroid": "ADR_XM",      // xiaomi
    "uc": 15,
    "googleandroid": "ADR_GOOGLE",      //谷歌android
    "googleandroidAD": "ADR_GOOGLE",      //谷歌android
    "xiaomi": "MIN_XMKYX",//小米快游戏
    "kwai": "KS",//快手
    "4399android": 19,//4399安卓
    "huaweiandroid": "ADR_HUAWEI",//华为安卓
    "meizu": 21,
    "huawei": "MIN_HUAWEI",//华为小游戏
    "taptapandroid": "ADR_TapTap",//taptap
    "mmyandroid": "ADR_MMY",//mmy
    "hykbandroid": "ADR_HYKB",
    "android233": "ADR_233",
    "android566": "ADR_566",//566渠道
    "qqesandroid": "ADR_7723",
    "hlxandroid": "ADR_HLX",
    "cn_ios": "IOS",
    "android233nxh": 29,//233nxh渠道
    "fxrandroid": "ADR_OWN",
    "hhrandroid": 101,
    "ttlyandroid": "ADR_TTLY",/** TT直播联运安卓 */
    "meizuandroid": "ADR_MZ",//魅族安卓
    "amazonandroid": "ADR_AMAZON",      // 亚马逊安卓
    "wg_web_mobile": "WGmae_Web",//微游
    "alipay": 105,     //支付宝小游戏
    "bilibili": 106,
    "taobao-mini-game": 107
}

export interface IPackConfig {
    title: string,//打包标题
    gameName: string,//游戏名称
    teamName: string,//团队名称
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
    notifyFeiShuTalk?: boolean,//是否通知飞书
    feiShuWebHook?: string,//飞书webhook
    logReportUrl?: string,//日志上报url
    orientation?: string,//屏幕方向
    hookPath?: string,//自定义构建脚本路径
    keyStoreInfo?: {//keystore信息
        keystorePath: string,//keystore路径
        keystorePassword: string,//keystore密码
        keystoreAlias: string,//keystore别名
        keystoreAliasPassword: string,//keystore别名密码
    },
    PgyerInfo?: {//蒲公英信息
        pgyerApiKey: string,//蒲公英APIKey
    },
    platforms: { [key: string]: ChannelInfo },//平台信息
}

export interface ChannelInfo {
    version: string,
    isNative: boolean,
    md5Cache: boolean,
    account?: string,
    password?: string,
    buildPath: string,
    platform: string,
    remoteDir: string,
    toolsDir?: string,
    privateKey?: string,//私钥 微信
    privatePath?: string,//快游戏rpk需要的
    certificatePath?: string,//快游戏rpk需要的
    icon?: string,//图标路径
    keystorePath?: string,
    packageName?: string,
    keystorePassword?: string,
    keystoreAlias?: string,
    keystoreAliasPassword?: string,
    template?: string,
    apiLevel?: number,
    serverPath?: string,
    localPath?: string,
    appid?: string,
    REMOTE_SERVER_ROOT?: string,
    gameName?: string,
    targetName?: string,
    previewWidth?: number,
    previewHeight?: number,
    sourceMaps?: boolean,
    token?: string,
    pgyerApiKey?: string,//蒲公英APIKey
    uid?: string,//bilibili小游戏上传所需UID
    enableHighPerformanceMode?: boolean,//是否开启高性能模式
    configName?: string,//构建模板json名，位于项目settings下
    customTemplate?: string, //自定义构建模板路径 用于构建完成后使用customTemplate目录资源覆盖构建目录 填写CocosCreator项目内路径
    forceChannelId?: number,//强制指定渠道id
    channel?: string,//渠道名称
    mainBundleCompressionType?: string,//主包压缩类型  无压缩： "none"  合并依赖： "merge_dep"  合并所有JSON： "merge_all_json"  ZIP： "zip"  小游戏分包： "subpackage"

    /***热更配置 */
    remoteHotUpdateDir?: string,//热更资源包上传目录
    hotUpdateGenerateDir?: string,//热更资源包生成目录
}
