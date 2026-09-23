/**
 * Shared JS↔native contract. Both `AdMobBridge.java` (Android) and
 * `CCEAdMobServiceHub.mm` (iOS) must use these exact event names and payload
 * shapes — the two native implementations are independent code but must
 * agree byte-for-byte on the wire format.
 */

/** Ad format identifiers, used as a namespace prefix for event names (`"<format>.<event>"`). */
export enum AdFormat {
    Banner = 'banner',
    Interstitial = 'interstitial',
    Rewarded = 'rewarded',
    RewardedInterstitial = 'rewardedInterstitial',
    AppOpen = 'appOpen',
    Native = 'native',
}

/** Event names dispatched from native to JS via {@link import('./core/Bridge').bridge.on}. */
export const AdMobEvent = {
    // Banner
    BannerLoaded: 'banner.loaded',
    BannerFailedToLoad: 'banner.failedToLoad',
    BannerOpened: 'banner.opened',
    BannerClosed: 'banner.closed',

    // Interstitial
    InterstitialLoaded: 'interstitial.loaded',
    InterstitialFailedToLoad: 'interstitial.failedToLoad',
    InterstitialShowed: 'interstitial.showed',
    InterstitialFailedToShow: 'interstitial.failedToShow',
    InterstitialDismissed: 'interstitial.dismissed',

    // Rewarded
    RewardedLoaded: 'rewarded.loaded',
    RewardedFailedToLoad: 'rewarded.failedToLoad',
    RewardedShowed: 'rewarded.showed',
    RewardedFailedToShow: 'rewarded.failedToShow',
    RewardedDismissed: 'rewarded.dismissed',
    RewardedEarnedReward: 'rewarded.earnedReward',

    // Rewarded interstitial (identical lifecycle to rewarded)
    RewardedInterstitialLoaded: 'rewardedInterstitial.loaded',
    RewardedInterstitialFailedToLoad: 'rewardedInterstitial.failedToLoad',
    RewardedInterstitialShowed: 'rewardedInterstitial.showed',
    RewardedInterstitialFailedToShow: 'rewardedInterstitial.failedToShow',
    RewardedInterstitialDismissed: 'rewardedInterstitial.dismissed',
    RewardedInterstitialEarnedReward: 'rewardedInterstitial.earnedReward',

    // App open
    AppOpenLoaded: 'appOpen.loaded',
    AppOpenFailedToLoad: 'appOpen.failedToLoad',
    AppOpenShowed: 'appOpen.showed',
    AppOpenFailedToShow: 'appOpen.failedToShow',
    AppOpenDismissed: 'appOpen.dismissed',

    // Native
    NativeLoaded: 'native.loaded',
    NativeFailedToLoad: 'native.failedToLoad',
    NativeClicked: 'native.clicked',
    NativeImpression: 'native.impression',
    NativeOpened: 'native.opened',
    NativeClosed: 'native.closed',

    // Consent (UMP)
    ConsentInfoUpdated: 'consent.infoUpdated',
    ConsentFormDismissed: 'consent.formDismissed',
} as const;

export type AdMobEventName = typeof AdMobEvent[keyof typeof AdMobEvent];

/** Payload of `rewarded.earnedReward` / `rewardedInterstitial.earnedReward`. */
export interface AdMobReward {
    type: string;
    amount: number;
}

/** Payload of any `*.failedToLoad` / `*.failedToShow` event. */
export interface AdMobLoadError {
    code: string;
    message: string;
}

/** `admob.banner.load()` options. */
export interface BannerOptions {
    adUnitId: string;
    position?: 'top' | 'bottom';
    /**
     * Anchored adaptive banner width in density-independent points. If
     * omitted, the native side uses the full device width.
     */
    width?: number;
}

/**
 * `admob.native.load()` options.
 *
 * A native ad is rendered by a **platform view composited on top of the GL
 * surface** (an `Android View`/`UIView`), not a node in the Cocos scene
 * graph. It cannot be z-ordered between Cocos nodes, does not scroll or
 * transform with the scene, and is positioned in screen pixel coordinates,
 * not scene/world coordinates.
 */
export interface NativeAdOptions {
    adUnitId: string;
    position?: 'top' | 'bottom' | 'center';
    /** Container width in density-independent points. If omitted, the native side uses the full device width. */
    width?: number;
    /** Container height in density-independent points. If omitted, the native side chooses a default height that fits the template layout. */
    height?: number;
}

/** `admob.initialize()` options. */
export interface InitializeOptions {
    /**
     * Overrides the build-panel "Test device IDs" option at runtime, for
     * cases where a QA device ID isn't known until app launch.
     */
    testDeviceIds?: string[];
}

/** `admob.consent.request()` result. */
export interface ConsentInfo {
    /** Mirrors Google UMP's `ConsentStatus` (`UNKNOWN`/`REQUIRED`/`NOT_REQUIRED`/`OBTAINED`). */
    status: 'UNKNOWN' | 'REQUIRED' | 'NOT_REQUIRED' | 'OBTAINED';
    isConsentFormAvailable: boolean;
    canRequestAds: boolean;
}
