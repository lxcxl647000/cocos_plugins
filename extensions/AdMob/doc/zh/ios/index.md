# Cocos Creator 的 AdMob 扩展 —— iOS 设置

平台无关的总览、JS/TS API 参考以及测试广告警告请见
[../index.md](../index.md)。本页只涵盖 iOS 专属细节。

## 环境要求

- 部署目标（Deployment Target）需为 12.0 或更高 —— 这是 Google Mobile Ads
  SDK 13.7.0 与 User Messaging Platform SDK 3.1.0 官方 CocoaPods podspec
  中声明的最低支持版本。
- 构建机器需具备 Xcode 命令行工具、`curl`、`shasum`、`tar`（macOS 均已
  自带）—— 这些是下面拉取脚本所需，而非构建本身所需。

## 一次性设置：拉取 SDK

Google Mobile Ads SDK 与 UMP SDK 的 `.xcframework` 包**不会提交到本仓库**
—— 两者加起来体积达数十兆字节，而 Google 自己已经在托管这些二进制文件，
没有必要再重新分发。在首次为 iOS 构建之前，请运行：

```bash
bash extensions/AdMob/scripts/fetch-admob-ios-sdk.sh
```

该脚本会从 Google 自己的 `dl.google.com` 分发渠道下载锁定版本 —— Google
Mobile Ads SDK **13.7.0** 与 User Messaging Platform SDK **3.1.0**，下载
地址与 Google 官方 CocoaPods trunk 上这些版本对应 podspec 中发布的地址
完全一致，并会用本地针对真实下载文件计算得到（绝非凭空编造）的 SHA-256
校验和进行校验，随后将两个 `.xcframework` 包解包到
`extensions/AdMob/template/ios/admob/`。该目录已被 `.gitignore` 忽略 ——
团队中的每位开发者、以及每台 CI 机器，都需要各自运行一次该脚本（可安全
重复运行；如果目标目录已有内容，会先询问是否覆盖）。

如果没有先运行该脚本就为 iOS 构建，构建会立即失败，并清晰指出缺失的
framework 名称、引导你运行这个脚本 —— 而不是让 Xcode 在构建后期报出难以
理解的错误。

## 构建会向你的项目添加什么

当 **启用 AdMob** 被勾选时，构建钩子会：

- 将 `template/ios/admob`（原生桥接源码 `CCEAdMobServiceHub.h`/`.mm`，以及
  拉取到的两个 `.xcframework` 包）与 CMake 钩子文件
  `Pre-admob.cmake` / `Post-admob.cmake` 拷贝到你生成的原生 iOS 工程
  （`native/engine/ios/`）中。
- 将 `Info.plist` 中的 `GADApplicationIdentifier` 设置为你在构建面板中
  填写的 **iOS App ID**，留空时回退到 Google 公开的测试应用 ID
  `ca-app-pub-3940256099942544~1458002511`。
- 将 Google 公布的 SKAdNetwork 标识符列表合并进 `Info.plist` 的
  `SKAdNetworkItems`（采用追加方式 —— 会保留你自己或其他插件已有的条目，
  并跳过重复项）。
- 链接这两个 `.xcframework` 包，以及它们各自 podspec 中声明的系统
  framework/库（完整清单见
  `extensions/AdMob/template/ios/admob/admob.cmake`），并使用 `-ObjC`
  链接器标志强制加载 Objective-C 符号 —— 包含 Objective-C 分类/类的静态库
  需要这个标志。

本扩展刻意**不会**向 `Info.plist` 添加 `NSUserTrackingUsageDescription` ——
原因见总览页的[已知限制](../index.md#已知限制)部分。

## 查找测试设备 ID

要为一台真实 iOS 设备登记测试广告（这是在保持 **使用测试广告** 开启之外
的额外保护，而不是替代它）：

1. 先在该设备上以开启测试广告的状态运行一次应用。
2. 查看 Xcode 控制台：Google Mobile Ads SDK 在首次从未识别的设备发起广告
   请求时，会打印类似
   `To get test ads on this device, set: GADMobileAds.sharedInstance().requestConfiguration.testDeviceIdentifiers = @[ @"2077ef9a63d2b398840261c8221a0c9b" ]`
   的日志 —— 复制其中的标识符字符串。
3. 将其粘贴到构建面板的 **测试设备 ID** 字段中（多个设备用逗号分隔）。

## 故障排查

- **构建报错 "Missing iOS SDK framework(s)"**：说明你还没有运行
  `extensions/AdMob/scripts/fetch-admob-ios-sdk.sh`，或者是针对另一个
  检出目录运行的。请从仓库根目录运行（或让脚本按其相对于
  `extensions/AdMob/scripts/` 的路径自行解析）。
- **运行拉取脚本时校验和不匹配**：说明 Google CDN 返回的字节内容与锁定的
  SHA-256 不一致 —— 脚本会拒绝解包不匹配的压缩包。切勿绕过这项检查；
  请重新运行脚本（最常见原因是 CDN/代理的临时问题），如果持续出现，应将
  其视为需要先排查清楚再继续构建的信号。
- **符号重复或符号缺失的链接错误**：最常见的原因是另一个插件也链接了
  Google Mobile Ads 或 UMP SDK 的另一份副本（例如某个广告聚合适配器插件，
  或同时安装了另一个类 AdMob 扩展）。单个 App target 中，每个 Google SDK
  只能被链接一份。
- **App Store 审核以缺少 ATT 弹窗为由拒绝应用**：本扩展未实现 App Tracking
  Transparency —— 见[已知限制](../index.md#已知限制)。如果你的应用需要
  基于 IDFA 的归因，你需要在本扩展之外自行添加 ATT 弹窗和
  `NSUserTrackingUsageDescription` 键。
