# AdMob for Cocos Creator — iOS setup

See [../index.md](../index.md) for the platform-agnostic overview, the
JS/TS API reference, and the test-ads warning. This page covers iOS-only
details.

## Requirements

- Deployment target 12.0 or higher (the minimum supported by both Google
  Mobile Ads SDK 13.7.0 and User Messaging Platform SDK 3.1.0, per their
  official CocoaPods podspecs).
- Xcode with command-line tools, `curl`, `shasum`, and `tar` available on
  your build machine (all standard on macOS) — required by the fetch script
  below, not by the build itself.

## One-time setup: fetching the SDK

The `.xcframework` bundles for the Google Mobile Ads SDK and UMP SDK are
**not committed to this repository** — together they are on the order of
tens of megabytes, and redistributing Google's binary SDK is unnecessary
when Google already hosts it. Before your first iOS build, run:

```bash
bash extensions/AdMob/scripts/fetch-admob-ios-sdk.sh
```

This downloads pinned versions from Google's own `dl.google.com`
distribution — Google Mobile Ads SDK **13.7.0** and User Messaging Platform
SDK **3.1.0** — at the exact URLs published in Google's official CocoaPods
trunk podspecs for those versions, verifies each download's SHA-256 against
a checksum computed locally from a real download (never invented), and
unpacks both `.xcframework` bundles into
`extensions/AdMob/template/ios/admob/`. That directory is `.gitignore`'d —
every developer on your team, and every CI machine, needs to run this
script once (it is safe to re-run; it will ask before overwriting an
already-populated destination).

If you build for iOS without running this script first, the build fails
immediately with a clear error naming the missing framework(s) and pointing
back at this script — it does not fail obscurely later inside Xcode.

## What the build adds to your project

When **Enable AdMob** is checked, the build hook:

- Copies `template/ios/admob` (the native bridge source
  `CCEAdMobServiceHub.h`/`.mm`, plus the two fetched `.xcframework`
  bundles) and the CMake hooks `Pre-admob.cmake` / `Post-admob.cmake` into
  your generated native iOS project (`native/engine/ios/`).
- Sets `GADApplicationIdentifier` in `Info.plist` to the **iOS App ID** you
  entered in the build panel, or Google's public test app ID
  `ca-app-pub-3940256099942544~1458002511` if left empty.
- Merges Google's published SKAdNetwork identifier list into
  `SKAdNetworkItems` in `Info.plist` (additively — your own or other
  plugins' entries are preserved, duplicates are skipped).
- Links the two `.xcframework` bundles and the system
  frameworks/libraries their podspecs declare (see
  `extensions/AdMob/template/ios/admob/admob.cmake` for the exact list),
  and force-loads Objective-C symbols with the `-ObjC` linker flag, which
  static libraries containing Objective-C categories/classes need.

This extension deliberately does **not** add `NSUserTrackingUsageDescription`
to `Info.plist` — see [Known limitations](../index.md#known-limitations) on
the overview page for why.

## Finding a test device ID

To register a physical iOS device for test ads (in addition to, not instead
of, leaving **Use test ads** on):

1. Run your app once on the device with test ads enabled.
2. Watch the Xcode console: the Google Mobile Ads SDK logs a line similar to
   `To get test ads on this device, set: GADMobileAds.sharedInstance().requestConfiguration.testDeviceIdentifiers = @[ @"2077ef9a63d2b398840261c8221a0c9b" ]`
   the first time it makes an ad request from an unrecognized device — copy
   that identifier string.
3. Paste it into the build panel's **Test device IDs** field
   (comma-separate multiple devices).

## Troubleshooting

- **Build fails with "Missing iOS SDK framework(s)"**: you have not run
  `extensions/AdMob/scripts/fetch-admob-ios-sdk.sh` yet, or it was run
  against a different checkout. Run it from the repository root (or let its
  relative path resolve from `extensions/AdMob/scripts/`).
- **Checksum mismatch when running the fetch script**: this means the
  bytes served by Google's CDN did not match the pinned SHA-256 — the
  script refuses to unpack a mismatched archive. Do not bypass this check;
  re-run the script (transient CDN/proxy issues are the most common cause),
  and if it persists, treat it as a signal to investigate before building.
- **Duplicate symbol or missing symbol linker errors**: most commonly
  caused by another plugin also linking a copy of the Google Mobile Ads or
  UMP SDK (e.g. a mediation adapter plugin, or a second AdMob-style
  extension installed alongside this one). Only one copy of each Google SDK
  can be linked into a single app target.
- **App rejected by App Store review citing missing ATT prompt**: this
  extension does not implement App Tracking Transparency — see
  [Known limitations](../index.md#known-limitations). If your app requests
  IDFA-based attribution, you must add the ATT prompt and the
  `NSUserTrackingUsageDescription` key yourself, outside this extension.
