# Cocos Creator 的 AdMob 扩展 —— Android 设置

平台无关的总览、JS/TS API 参考以及测试广告警告请见
[../index.md](../index.md)。本页只涵盖 Android 专属细节。

## 环境要求

- `minSdkVersion` 需为 21 或更高，这是
  [Google Mobile Ads SDK 25.4.0](https://developers.google.com/admob/android/quick-start)
  自身的要求。Cocos Creator 3.8 的 Android 模板默认 `minSdkVersion` 已经
  满足这一要求，大多数项目无需修改。
- 目标设备/模拟器需具备 Google Play 服务（任意安装了 Play 商店的真机，或
  Google Play 模拟器镜像 —— 而不是裸 AOSP 镜像）。

## SDK 是如何获取的

本扩展的 Android 部分**不会**内置任何 `.aar`/`.jar` 文件。在构建面板中
启用 **AdMob** 会添加两个 Gradle 依赖，构建时从 Google 的 Maven 仓库解析：

- `com.google.android.gms:play-services-ads:25.4.0`
- `com.google.android.ump:user-messaging-platform:4.0.0`

两者都锁定为精确版本号而非浮动区间，以保证构建可复现。只要勾选了
**启用 AdMob**，这两个依赖就都会被添加 —— UMP SDK 没有单独的开关，它
始终与 Google Mobile Ads SDK 一起被引入。若要升级到
更新的 SDK 版本，请自行修改
`extensions/AdMob/template/android/libadmob/build.gradle` 中的版本号，
并重新验证兼容性。

## 构建会向你的项目添加什么

当 **启用 AdMob** 被勾选时，构建钩子会：

- 将 `template/android/libadmob`（一个小型 Android 库模块，Java 包名为
  `com.cocosext.admob`）拷贝到你生成的原生工程中，并作为 Gradle 模块依赖
  添加到你的 app 模块。
- 向 `AndroidManifest.xml` 注入 `com.google.android.gms.ads.APPLICATION_ID`
  这个 `<meta-data>` 条目，值取自你在构建面板中填写的 **Android App ID**
  （留空时回退到 Google 公开的测试应用 ID
  `ca-app-pub-3940256099942544~3347511713`）。
- 添加上面列出的 Gradle 依赖。

如果 **覆盖库文件** 保持勾选（默认如此），这一拷贝步骤会在每次构建时执行，
无条件覆盖生成的原生工程中 `libadmob` 的源码 —— 请不要手动修改
`native/android/app/libadmob/`（或等效路径）下的文件并期望它们在重新构建
后仍然存在；应改为修改
`extensions/AdMob/template/android/libadmob` 后再重新构建。

## 查找测试设备 ID

要为一台真实 Android 设备登记测试广告（这是在保持 **使用测试广告** 开启
之外的额外保护，而不是替代它 —— 详见总览页中的警告）：

1. 先在该设备上以开启测试广告的状态运行一次应用。
2. 用 `adb logcat` 过滤 `Ads`：Google SDK 在首次从未识别的设备发起广告
   请求时，会打印类似
   `Use RequestConfiguration.Builder().setTestDeviceIds(Arrays.asList("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"))`
   的日志 —— 复制其中 32 位十六进制字符串。
3. 将其粘贴到构建面板的 **测试设备 ID** 字段中（多个设备用逗号分隔）。

## 故障排查

- **`Manifest merger failed` 提示 `APPLICATION_ID` 冲突**：说明另一个插件
  也在注入 `com.google.android.gms.ads.APPLICATION_ID`。请禁用重复的来源，
  或者如果你是有意在别处管理该值，移除本扩展的条目。
- **Gradle 无法解析 `play-services-ads` 或 `user-messaging-platform`**：
  确认项目仓库列表中包含 `google()`（Cocos Creator 默认的 Android 模板
  已经包含），并确认构建期间能访问 Google 的 Maven 仓库。
- **模拟器上没有广告**：请使用带 Google Play 的系统镜像（而非裸 AOSP），
  或使用已登录 Google 账号的真机。
