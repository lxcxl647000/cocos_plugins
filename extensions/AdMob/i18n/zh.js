module.exports = {
    title: 'AdMob',
    description: 'Google AdMob（Google Mobile Ads SDK）集成：横幅、插屏、激励、激励插屏、开屏、原生广告，以及 UMP 用户同意流程。',
    enableAdMob: {
        title: '启用 AdMob',
        tip: '总开关。关闭时，构建产物中不会加入任何 AdMob 原生代码。',
    },
    androidAppId: {
        title: 'Android App ID',
        tip: '你的 AdMob Android App ID，格式为 "ca-app-pub-xxxxxxxxxxxxxxxx~yyyyyyyyyy"。留空则使用 Google 公开的测试 App ID。',
    },
    iosAppId: {
        title: 'iOS App ID',
        tip: '你的 AdMob iOS App ID，格式为 "ca-app-pub-xxxxxxxxxxxxxxxx~yyyyyyyyyy"。留空则使用 Google 公开的测试 App ID。',
    },
    useTestAds: {
        title: '使用测试广告',
        tip: '强制使用 Google 公开的测试广告单元 ID，并将本机注册为测试设备。在应用正式发布前请保持开启——点击自己的正式广告可能导致 AdMob 账号被封禁。',
    },
    testDeviceIds: {
        title: '测试设备 ID',
        tip: '以逗号分隔的 AdMob 测试设备哈希 ID 列表，当“使用测试广告”关闭、但仍希望在自己设备上看到测试广告时使用。',
    },
    overwriteLibrary: {
        title: '覆盖原生库',
        tip: '每次构建都覆盖原生 AdMob 库目录。仅当你打算手动修改已复制的原生文件时才关闭。',
    },
};
