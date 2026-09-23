# AdMob — Google AdMob Extension for Cocos Creator

A Cocos Creator 3.8.x extension that wraps the Google Mobile Ads SDK (GMA) and
the Google User Messaging Platform (UMP) SDK for Android and iOS, exposed to
your game scripts through a small, promise-based TypeScript API.

This is an independent, clean-room implementation written specifically for
this project. It is not derived from, and is not affiliated with, any
existing AdMob plugin for Cocos Creator.

- Platform-specific setup: [Android](./android/index.md) · [iOS](./ios/index.md)
- 中文文档: [../zh/index.md](../zh/index.md)

## Features (v1.1.0)

| Ad format | Load | Show | Notes |
| --- | --- | --- | --- |
| Banner | Yes | Yes | Anchored adaptive banner, docked top or bottom; `show()` / `hide()` / `destroy()` |
| Interstitial | Yes | Yes | Full-screen, `isReady()` before `show()` |
| Rewarded | Yes | Yes | Resolves with `{ type, amount }` on `show()` |
| Rewarded interstitial | Yes | Yes | Same shape as Rewarded |
| App open | Yes | Yes | Cold-start / foreground-resume ad |
| Native | Yes | Yes | Ad-supplied assets rendered into a platform view composited over the GL surface; see [Native ads](#native-ads) below |
| UMP consent (EEA/UK) | — | — | `request()`, `showFormIfRequired()`, `canRequestAds()`, `reset()` |
| Test mode | — | — | On by default; uses Google's public test ad unit IDs |

## Compatibility

| Cocos Creator | Android | iOS | Web / Preview |
| --- | --- | --- | --- |
| >= 3.8.0 | Yes (minSdk 21+, per Google Mobile Ads SDK 25.4.0) | Yes (deployment target 12.0+, per GMA 13.7.0 / UMP 3.1.0) | API is present but every call resolves/rejects as unavailable — no ads render in the editor or web preview. |

## Installation

1. Copy `extensions/AdMob` into your project's `extensions/` folder (or clone
   this whole repository and open it as your project — it already contains
   working demo scenes, one per ad format).
2. Restart Cocos Creator, or open **Extension → Extension Manager** and
   enable **AdMob**.
3. Open **Project → Build**, pick **Android** and/or **iOS**, and look for
   the **AdMob** section in the platform options panel — see
   [Build Panel Options](#build-panel-options) below.
4. iOS only: before your first iOS build, run
   `extensions/AdMob/scripts/fetch-admob-ios-sdk.sh` once to download the
   Google Mobile Ads and UMP `.xcframework` bundles. See
   [iOS setup](./ios/index.md) for details — the build fails loudly with
   instructions if you skip this step.

## Getting an AdMob App ID and ad unit IDs

1. Sign in to the [AdMob console](https://apps.admob.com/) and register your
   app (or link the app you already have in Google Play Console / App Store
   Connect).
2. Under **Apps → App settings**, copy the **App ID** — it looks like
   `ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY`. You need one for Android and a
   separate one for iOS; enter each in the corresponding build-panel field.
3. Under **Apps → Ad units**, create one ad unit per format you plan to show
   (banner, interstitial, rewarded, rewarded interstitial, app open, native)
   and copy each **Ad unit ID** (`ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ`) —
   these are passed to `load(adUnitId)` in your game script, not entered in
   the build panel.

### ⚠️ Test ads vs. production ads

**Never click, tap, or otherwise interact with your own live/production ads
while testing.** Google actively detects invalid traffic (including
developers testing their own real ad units) and this is one of the most
common causes of AdMob account suspension or permanent bans — there is
typically no appeal.

- While developing, leave the build panel's **Use test ads** option enabled
  (it is on by default). This routes every ad request through Google's
  public test ad units and clearly-labeled test creatives, which are safe to
  click as much as you like.
- Additionally register your physical test devices under **Test device IDs**
  in the build panel (comma-separated), which is a second, independent
  safeguard — see the platform pages for how to find your device's ID.
- Only turn test ads off in a build you are about to submit to app review or
  release to real users, and never tap ads in that build yourself.

## Google User Messaging Platform (UMP) consent

If your app may be shown to users in the EEA, the UK, or other regions with
consent requirements, call the consent flow before requesting any ads:

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

`admob.consent.request()` also emits a `consent.infoUpdated` event with the
same payload, for listeners that were registered before the call resolves.
See [Types.ts](../../assets/Types.ts) for the full `ConsentInfo` shape and
every event name.

The native UMP consent SDK is always linked into the build whenever
**Enable AdMob** is on — there is no build-panel toggle for it. Google
recommends shipping UMP with every AdMob integration (it adds only ~171 KB),
and if your app never needs a consent flow you simply never call
`admob.consent.*`.

## Build Panel Options

These appear once per platform (Android, iOS) under **Project → Build →
[Platform] → AdMob**:

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| Enable AdMob | checkbox | on | Master switch. When off, none of this extension's native code, manifest/plist edits, or SDK dependencies are added to the build. |
| Android App ID / iOS App ID | text | empty | Your platform-specific AdMob App ID (`ca-app-pub-…~…`). When empty, the build falls back to Google's public test app ID so a fresh checkout still builds and runs. |
| Use test ads | checkbox | on | Forces every ad request through Google's test ad units regardless of the ad unit IDs your game code passes. **Read the warning above before turning this off.** |
| Test device IDs | text (comma-separated) | empty | Physical device identifiers that should always receive test ads even when "Use test ads" is off — see the platform pages for how to obtain a device's ID. |
| Overwrite library | checkbox | on | Android only in practice (present on both platforms for UI consistency): re-copies this extension's native library sources into the generated native project on every build, discarding any manual edits you made there. Turn off only if you intentionally hand-patched the generated native project and want to preserve those edits across rebuilds. |

## API quick reference

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

`AdMobClient`, `BannerClient`, `InterstitialClient`, `RewardedClient`,
`AppOpenClient`, and `NativeClient` are fully documented with `@en`/`@zh`
JSDoc directly in [`assets/AdMobClient.ts`](../../assets/AdMobClient.ts);
every event name, payload shape, and enum value is defined in
[`assets/Types.ts`](../../assets/Types.ts). Both files are the
authoritative source — this page is a summary, not a substitute.

## Native ads

A native ad is rendered from ad-supplied assets (headline, body, icon,
media, call-to-action) into a **platform view composited on top of the GL
surface** — an `Android View` on Android, a `UIView` on iOS. It is **not** a
node in the Cocos scene graph:

- It cannot be z-ordered between Cocos nodes; it always draws above (or, if
  hidden, is fully absent from) everything the GL surface renders.
- It does not scroll, rotate, or otherwise transform with the Cocos scene —
  moving/animating a Cocos node underneath it has no effect on its position.
- It is positioned in **screen pixel coordinates** via `NativeAdOptions`
  (`position`, `width`, `height`), not scene/world coordinates.

`admob.native.load()` / `show()` / `hide()` / `destroy()` follow the same
persistent-view lifecycle as `admob.banner`. Both platforms auto-render the
Google-mandated AdChoices icon; this extension builds the "Ad" attribution
label by hand (Google does not auto-generate it) and registers every asset
view it uses with the SDK so impressions and clicks are counted correctly.

## Examples

A runnable demo is included at the project root, split into **one scene per
ad format** plus a menu, so each format's usage stays small and readable:

| Scene | Script | Covers |
|---|---|---|
| `assets/scene/main.scene` | `MainMenu.ts` | Menu — seven buttons, one per scene below |
| `assets/scene/1.banner.scene` | `BannerDemo.ts` | `load` / `show` / `hide` / `destroy` |
| `assets/scene/2.interstitial.scene` | `InterstitialDemo.ts` | `load` / `isReady` / `show` |
| `assets/scene/3.appOpenAd.scene` | `AppOpenDemo.ts` | `load` / `isReady` / `show` |
| `assets/scene/4.rewardedAd.scene` | `RewardedDemo.ts` | `load` / `isReady` / `show`, logs the reward payload |
| `assets/scene/5.rewardedInterstitialAd.scene` | `RewardedInterstitialDemo.ts` | `load` / `isReady` / `show`, logs the reward payload |
| `assets/scene/6.nativeAd.scene` | `NativeDemo.ts` | `load` / `show` / `hide` / `destroy` |
| `assets/scene/7.consent.scene` | `ConsentDemo.ts` | `request` / `showFormIfRequired` / `canRequestAds` / `reset` |

Open `assets/scene/main.scene` and press Play in the editor, or build to a
device — the menu loads each format's scene with `director.loadScene()`,
and every format scene has a "Back to menu" button. You can also open any
`N.*.scene` directly and press Play without going through the menu first:
each format scene calls `admob.initialize()` itself on `start()`, guarded
so it only runs once per session even if you navigate between scenes.
Every scene builds its UI in code, subscribes to that format's events, and
prints them to an on-screen log — so a failed load, or a failed
initialize, is visible, not silent. The shared button/log-panel code lives
in `assets/script/test/DemoUI.ts`. Only Google's public test ad unit IDs
are used throughout.

## Troubleshooting

- **"No fill" / `failedToLoad` events during development**: expected and
  common, especially for rewarded/app-open formats — test ad fill is not
  guaranteed on every request. Retry with backoff rather than treating it as
  a hard error.
- **Ads never show on iOS even though `load()` resolved**: make sure you ran
  `fetch-admob-ios-sdk.sh` before the build that produced the binary you are
  testing — an app built without the real `.xcframework` bundles will not
  even compile, so this specific symptom usually means you're running a
  stale binary from before the SDKs were fetched.
- **Account warnings/suspension**: see the test-vs-production warning above.
  This is a Google AdMob policy matter, not something this extension can
  prevent for you.
- **Build fails with a missing xcframework error**: see
  [iOS setup](./ios/index.md).
- **Gradle dependency resolution errors on Android**: see
  [Android setup](./android/index.md).

## Known limitations

This extension deliberately ships a focused feature set. The
following are **not implemented** and are out of scope for this version:

- **Mediation adapters** (Meta Audience Network, AppLovin, Unity Ads, etc.)
  — not implemented. Only Google's own AdMob demand is served.
- **Rewarded Server-Side Verification (SSV)** — not implemented. If you
  need SSV, see
  [Google's SSV documentation](https://developers.google.com/admob/android/rewarded-video-ssv)
  and add the `customData`/callback-URL wiring yourself; this extension's
  `rewarded.show()` only surfaces the client-side reward callback.
- **App Tracking Transparency (ATT) on iOS** — not implemented. This
  extension deliberately does **not** add `NSUserTrackingUsageDescription`
  to `Info.plist` and does not call `ATTrackingManager`. Adding the Info.plist
  key without ever showing the ATT prompt would be misleading to reviewers
  and to users, and could itself raise App Store review questions. If your
  app needs IDFA-based tracking/attribution, you must implement the ATT
  prompt yourself (and then add the usage-description key in your own
  project's `Info.plist`, outside this extension) before calling
  `admob.initialize()`.
- **Web / editor preview** — not implemented. Every API call is present so
  your game code doesn't need platform branches, but calls resolve or
  reject as "unavailable" rather than showing real or simulated ads.
