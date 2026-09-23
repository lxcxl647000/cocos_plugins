# AdMob — Cocos Creator 的 Google AdMob 扩展

一个 Cocos Creator 3.8.x 扩展，为 Android 和 iOS 封装了 Google Mobile Ads SDK
（GMA）与 Google User Messaging Platform（UMP）SDK，并通过一套小巧的、基于
Promise 的 TypeScript API 暴露给你的游戏脚本。

这是一份专为本项目从零编写的独立实现，不衍生自任何现有的 Cocos Creator AdMob
插件，也与它们没有任何关联。

- 平台专属设置：[Android](./android/index.md) · [iOS](./ios/index.md)
- English docs: [../en/index.md](../en/index.md)

## 功能特性（v1.1.0）

| 广告形式 | 加载 | 展示 | 说明 |
| --- | --- | --- | --- |
| 横幅（Banner） | 支持 | 支持 | 自适应锚定横幅，可停靠顶部或底部；`show()` / `hide()` / `destroy()` |
| 插屏（Interstitial） | 支持 | 支持 | 全屏广告，`show()` 前需调用 `isReady()` |
| 激励视频（Rewarded） | 支持 | 支持 | `show()` 完成后返回 `{ type, amount }` 的奖励信息 |
| 激励型插屏（Rewarded interstitial） | 支持 | 支持 | 与 Rewarded 结构相同 |
| 开屏广告（App open） | 支持 | 支持 | 冷启动 / 前台恢复时展示的广告 |
| 原生广告（Native） | 支持 | 支持 | 由广告素材渲染而成、叠加在 GL 渲染表面之上的原生视图；详见下方[原生广告](#原生广告) |
| UMP 用户同意流程（欧盟/英国） | — | — | `request()`、`showFormIfRequired()`、`canRequestAds()`、`reset()` |
| 测试模式 | — | — | 默认开启；使用 Google 公开的测试广告单元 ID |

## 兼容性

| Cocos Creator | Android | iOS | Web / 预览 |
| --- | --- | --- | --- |
| >= 3.8.0 | 支持（minSdk 21+，依据 Google Mobile Ads SDK 25.4.0 的要求） | 支持（部署目标 12.0+，依据 GMA 13.7.0 / UMP 3.1.0 的要求） | API 存在，但每次调用都会以“不可用”结果 resolve/reject —— 编辑器或 Web 预览中不会渲染任何广告。 |

## 安装

1. 将 `extensions/AdMob` 复制到你项目的 `extensions/` 目录下（或者直接克隆本
   整个仓库并将其作为项目打开 —— 其中已经包含按广告形式拆分的多个可运行演示
   场景）。
2. 重启 Cocos Creator，或打开 **扩展 → 扩展管理器** 启用 **AdMob**。
3. 打开 **项目 → 构建**，选择 **Android** 和/或 **iOS**，在平台选项面板中
   查看 **AdMob** 分组 —— 详见下方的[构建面板选项](#构建面板选项)。
4. 仅限 iOS：首次为 iOS 构建之前，先运行一次
   `extensions/AdMob/scripts/fetch-admob-ios-sdk.sh` 下载 Google Mobile Ads
   与 UMP 的 `.xcframework` 包。详见 [iOS 设置](./ios/index.md) —— 如果跳过
   这一步，构建会立即报错并给出明确提示。

## 获取 AdMob App ID 与广告单元 ID

1. 登录 [AdMob 控制台](https://apps.admob.com/)，注册你的应用（或关联你在
   Google Play 管理中心 / App Store Connect 中已有的应用）。
2. 在 **应用 → 应用设置** 中复制 **应用 ID**（格式类似
   `ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY`）。Android 和 iOS 各需要一个独立
   的应用 ID，分别填入对应的构建面板字段。
3. 在 **应用 → 广告单元** 中，为你计划展示的每种广告形式（横幅、插屏、激励
   视频、激励型插屏、开屏、原生）分别创建一个广告单元，并复制其 **广告单元
   ID**（格式为 `ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ`）—— 这些 ID 会传给
   游戏脚本中的 `load(adUnitId)`，而不是填入构建面板。

### ⚠️ 测试广告与正式广告的区别

**切勿点击、轻触或以任何方式与自己的正式（生产环境）广告互动。**
Google 会主动检测无效流量（包括开发者点击自己真实广告单元的行为），这是导致
AdMob 账号被封禁或永久停用的最常见原因之一 —— 通常没有申诉余地。

- 开发期间请保持构建面板中的 **使用测试广告** 选项开启（默认已开启）。这会
  让所有广告请求都走 Google 公开的测试广告单元和明确标注的测试素材，可以
  放心点击。
- 另外，在构建面板的 **测试设备 ID** 中登记你的真实测试设备（这是与上面
  相互独立的第二重保护）—— 具体获取方式见各平台文档页。
- 只有在准备提交应用审核或正式发布给真实用户的构建中才关闭测试广告，并且
  切勿在该构建上自己点击广告。

## Google User Messaging Platform（UMP）用户同意

如果你的应用可能面向欧盟（EEA）、英国等有用户同意要求的地区用户展示，请在
请求任何广告之前先调用同意流程：

```ts
import { admob } from 'db://admob/index';

await admob.initialize();
const info = await admob.consent.request();
if (info.isConsentFormAvailable) {
    await admob.consent.showFormIfRequired();
}
if (await admob.consent.canRequestAds()) {
    await admob.banner.load({ adUnitId: '...' });
}
```

`admob.consent.request()` 同时会派发一个携带相同数据的 `consent.infoUpdated`
事件，供在调用 resolve 之前就已注册的监听器使用。完整的 `ConsentInfo` 结构
和所有事件名称请见 [Types.ts](../../assets/Types.ts)。

只要 **启用 AdMob** 开启，原生用户同意 SDK 就会始终被链接 —— 构建面板中没有
单独控制它的开关。Google 建议每个 AdMob 集成都随附 UMP（体积仅增加约
171 KB）；如果你的应用永远不需要用户同意流程，只需不调用 `admob.consent.*`
即可。

## 构建面板选项

以下选项在每个平台（Android、iOS）下各出现一次，位于 **项目 → 构建 →
[平台] → AdMob**：

| 选项 | 类型 | 默认值 | 含义 |
| --- | --- | --- | --- |
| 启用 AdMob（Enable AdMob） | 复选框 | 开 | 总开关。关闭时，本扩展不会向构建产物添加任何原生代码、manifest/plist 修改或 SDK 依赖。 |
| Android App ID / iOS App ID | 文本 | 空 | 你在对应平台的 AdMob 应用 ID（`ca-app-pub-…~…`）。留空时会回退到 Google 公开的测试应用 ID，保证新检出的项目也能直接构建运行。 |
| 使用测试广告（Use test ads） | 复选框 | 开 | 强制所有广告请求都走 Google 的测试广告单元，无论你的游戏代码传入了什么广告单元 ID。**关闭前请务必阅读上方的警告。** |
| 测试设备 ID（Test device IDs） | 文本（逗号分隔） | 空 | 即使关闭了“使用测试广告”，仍应始终收到测试广告的物理设备标识列表 —— 获取方式见各平台文档页。 |
| 覆盖库文件（Overwrite library） | 复选框 | 开 | 实际上仅对 Android 生效（为保持两平台面板一致而在两侧都展示）：每次构建都会重新拷贝本扩展的原生库源码到生成的原生工程中，覆盖你手动做的任何修改。只有在你刻意手动修补了生成的原生工程、并希望这些修改在重新构建后仍然保留时才应关闭。 |

## API 速查

```ts
import { admob, AdMobEvent } from 'db://admob/index';

await admob.initialize({ testDeviceIds: [] });

admob.on(AdMobEvent.RewardedEarnedReward, (reward) => {
    console.log('earned', reward.type, reward.amount);
});

await admob.banner.load({ adUnitId: '...', position: 'bottom' });
admob.banner.show();
admob.banner.hide();
admob.banner.destroy();

await admob.interstitial.load('...');
if (await admob.interstitial.isReady()) {
    await admob.interstitial.show();
}

await admob.rewarded.load('...');
const reward = await admob.rewarded.show(); // { type, amount }

await admob.rewardedInterstitial.load('...');
await admob.rewardedInterstitial.show();

await admob.appOpen.load('...');
await admob.appOpen.show();

await admob.native.load({ adUnitId: '...', position: 'bottom' });
admob.native.show();
admob.native.hide();
admob.native.destroy();
```

`AdMobClient`、`BannerClient`、`InterstitialClient`、`RewardedClient`、
`AppOpenClient` 和 `NativeClient` 的完整说明以 `@en`/`@zh` JSDoc 的形式直接
写在 [`assets/AdMobClient.ts`](../../assets/AdMobClient.ts) 中；所有事件
名称、数据结构和枚举值定义在 [`assets/Types.ts`](../../assets/Types.ts)。
这两个文件才是权威来源 —— 本页只是摘要，不能替代它们。

## 原生广告

原生广告是用广告方提供的素材（标题、正文、图标、媒体、行动号召按钮）渲染
出来的，渲染结果是一个**叠加在 GL 渲染表面之上的原生平台视图**——Android
上是一个 `View`，iOS 上是一个 `UIView`。它**不是** Cocos 场景图中的节点：

- 无法与 Cocos 节点进行 z 排序：它总是绘制在 GL 渲染表面渲染的所有内容
  之上（隐藏时则完全不可见）。
- 不会随 Cocos 场景滚动、旋转或做任何变换——在其下方移动/播放某个 Cocos
  节点的动画，不会影响它的位置。
- 使用 `NativeAdOptions` 中的 `position`、`width`、`height` 以**屏幕像素
  坐标**定位，而不是场景/世界坐标。

`admob.native.load()` / `show()` / `hide()` / `destroy()` 遵循与
`admob.banner` 相同的持久化视图生命周期。两个平台都会自动渲染 Google 强制
要求的 AdChoices 图标；本扩展手动构建了 "Ad" 属性标签（Google 不会自动
生成该标签），并将所用到的每个素材视图都注册给 SDK，以确保展示次数和点击
能被正确统计。

## 示例

项目根目录已包含一个可直接运行的演示，并**按广告形式拆分为多个场景**，
外加一个菜单场景，使每种形式的用法都保持简短易读：

| 场景 | 脚本 | 覆盖内容 |
|---|---|---|
| `assets/scene/main.scene` | `MainMenu.ts` | 菜单 —— 七个按钮，分别对应下方各场景 |
| `assets/scene/1.banner.scene` | `BannerDemo.ts` | `load` / `show` / `hide` / `destroy` |
| `assets/scene/2.interstitial.scene` | `InterstitialDemo.ts` | `load` / `isReady` / `show` |
| `assets/scene/3.appOpenAd.scene` | `AppOpenDemo.ts` | `load` / `isReady` / `show` |
| `assets/scene/4.rewardedAd.scene` | `RewardedDemo.ts` | `load` / `isReady` / `show`，并记录奖励数据 |
| `assets/scene/5.rewardedInterstitialAd.scene` | `RewardedInterstitialDemo.ts` | `load` / `isReady` / `show`，并记录奖励数据 |
| `assets/scene/6.nativeAd.scene` | `NativeDemo.ts` | `load` / `show` / `hide` / `destroy` |
| `assets/scene/7.consent.scene` | `ConsentDemo.ts` | `request` / `showFormIfRequired` / `canRequestAds` / `reset` |

打开 `assets/scene/main.scene` 场景，在编辑器中点击运行，或直接构建到真机 ——
菜单通过 `director.loadScene()` 加载下方各广告形式的场景，且每个场景都带有
“Back to menu”（返回菜单）按钮。你也可以不经过菜单，直接打开任意
`N.*.scene` 场景并点击运行：每个广告形式场景会在 `start()` 中自行调用
`admob.initialize()`，并通过一个跨场景共享的判重机制保证一次会话内只
初始化一次，无论你在场景之间如何切换。每个场景都在代码中构建自己的 UI，
订阅该广告形式的事件，并将其打印到屏幕日志中 —— 这样加载失败、或初始化
失败时也能看到，而不是悄无声息。按钮 / 日志面板的公共代码位于
`assets/script/test/DemoUI.ts`。全程只使用 Google 公开的测试广告单元 ID。

## 故障排查

- **开发期间频繁出现“No fill” / `failedToLoad` 事件**：属于正常且常见的
  情况，尤其是激励视频/开屏广告 —— 测试广告的填充率并不保证每次请求都成功。
  应带退避重试，而不是当作硬性错误处理。
- **`load()` 已经 resolve，但 iOS 上广告仍不展示**：请确认在构建出当前测试
  的这个二进制文件之前，已经运行过 `fetch-admob-ios-sdk.sh`——
  如果没有真实的 `.xcframework` 包，应用根本无法编译成功，所以出现这种症状
  通常说明你运行的是 SDK 拉取之前构建出的旧二进制。
- **账号收到警告或被封禁**：请参见上方关于测试广告与正式广告的警告。这是
  Google AdMob 的政策问题，本扩展无法替你预防。
- **构建报缺少 xcframework 错误**：见 [iOS 设置](./ios/index.md)。
- **Android 上 Gradle 依赖解析失败**：见 [Android 设置](./android/index.md)。

## 已知限制

本扩展刻意聚焦于一个明确的功能范围。以下内容**未实现**，不在本版本范围内：

- **广告聚合（Mediation）适配器**（Meta Audience Network、AppLovin、
  Unity Ads 等）—— 未实现。仅提供 Google 自有的 AdMob 广告需求。
- **激励广告服务端验证（Rewarded SSV）** —— 未实现。如果需要 SSV，请参阅
  [Google 的 SSV 文档](https://developers.google.com/admob/android/rewarded-video-ssv)
  并自行接入 `customData`/回调 URL；本扩展的 `rewarded.show()` 只提供
  客户端侧的奖励回调。
- **iOS 上的 App Tracking Transparency（ATT）** —— 未实现。本扩展刻意
  **不会**向 `Info.plist` 添加 `NSUserTrackingUsageDescription`，也不会
  调用 `ATTrackingManager`。在从未展示 ATT 弹窗的情况下添加该 Info.plist
  键，会误导审核人员和用户，甚至可能引发 App Store 审核方面的问题。如果你
  的应用需要基于 IDFA 的追踪/归因，你需要在调用 `admob.initialize()` 之前
  自行实现 ATT 弹窗（并在自己项目的 `Info.plist` 中添加该使用说明键，这一
  步在本扩展之外完成）。
- **Web / 编辑器预览** —— 未实现。所有 API 调用都存在，因此你的游戏代码
  无需区分平台分支，但调用会以“不可用”结果 resolve 或 reject，而不会展示
  真实或模拟的广告。
