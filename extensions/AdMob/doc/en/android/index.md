# AdMob for Cocos Creator — Android setup

See [../index.md](../index.md) for the platform-agnostic overview, the
JS/TS API reference, and the test-ads warning. This page covers Android-only
details.

## Requirements

- `minSdkVersion` 21 or higher, per the
  [Google Mobile Ads SDK 25.4.0](https://developers.google.com/admob/android/quick-start)
  requirements. This is Cocos Creator 3.8's own default Android template's
  `minSdkVersion` already, so most projects need no change.
- Google Play services available on the target device/emulator (any real
  device with the Play Store, or a Google Play emulator image — not a bare
  AOSP image).

## How the SDK is obtained

The Android side of this extension does **not** vendor any `.aar`/`.jar`
files. Enabling **AdMob** in the build panel adds two Gradle dependencies,
resolved from Google's Maven repository at build time:

- `com.google.android.gms:play-services-ads:25.4.0`
- `com.google.android.ump:user-messaging-platform:4.0.0`

Both are pinned to exact versions rather than a floating range, so builds
are reproducible. Both are added whenever **Enable AdMob** is checked — the
UMP SDK has no separate on/off switch, it is always included alongside the
Google Mobile Ads SDK. To pick up a newer SDK release, edit the version numbers
in `extensions/AdMob/template/android/libadmob/build.gradle` yourself and
re-verify compatibility.

## What the build adds to your project

When **Enable AdMob** is checked, the build hook:

- Copies `template/android/libadmob` (a small Android library module, Java
  package `com.cocosext.admob`) into your generated native project and adds
  it as a Gradle module dependency of your app module.
- Injects the `com.google.android.gms.ads.APPLICATION_ID` `<meta-data>` entry
  into `AndroidManifest.xml`, using the **Android App ID** you entered in the
  build panel (or Google's public test app ID
  `ca-app-pub-3940256099942544~3347511713` if you leave it empty).
- Adds the Gradle dependencies listed above.

If **Overwrite library** is checked (default), this copy step runs on every
build and replaces `libadmob`'s sources in the generated native project
unconditionally — do not hand-edit files under
`native/android/app/libadmob/` (or equivalent) and expect them to survive a
rebuild; edit `extensions/AdMob/template/android/libadmob` instead and
rebuild.

## Finding a test device ID

To register a physical Android device for test ads (in addition to, not
instead of, leaving **Use test ads** on — see the warning in the main
overview page):

1. Run your app once on the device with test ads enabled.
2. Filter `adb logcat` for `Ads`: Google's SDK logs a line like
   `Use RequestConfiguration.Builder().setTestDeviceIds(Arrays.asList("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"))`
   the first time it makes an ad request from an unrecognized device — copy
   the 32-character hex string.
3. Paste it into the build panel's **Test device IDs** field (comma-separate
   multiple devices).

## Troubleshooting

- **`Manifest merger failed` mentioning `APPLICATION_ID`**: another plugin
  is also injecting `com.google.android.gms.ads.APPLICATION_ID`. Disable
  the duplicate source, or remove this extension's entry if you are
  intentionally managing it elsewhere.
- **Gradle can't resolve `play-services-ads` or `user-messaging-platform`**:
  confirm `google()` is listed in your project's repositories (Cocos
  Creator's default Android template already includes it) and that you have
  network access to Google's Maven repository during the build.
- **No ads on an emulator**: use a Google Play (not bare AOSP) system image,
  or a real device signed into a Google account.
