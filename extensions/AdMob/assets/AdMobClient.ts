import { bridge, EventListener } from './core/Bridge';
import {
    AdMobEvent,
    AdMobEventName,
    AdMobReward,
    BannerOptions,
    ConsentInfo,
    InitializeOptions,
    NativeAdOptions,
} from './Types';

/**
 * @en Banner ad sub-API. A banner is a persistent view, not a one-shot
 * full-screen ad, so its lifecycle is load → show → hide → destroy rather
 * than load → show like the full-screen formats below.
 */
class BannerClient {
    /** @en Load (and, on Android/iOS, attach) a banner view. Resolves once the first ad has loaded. */
    load(options: BannerOptions): Promise<void> {
        return bridge.call('banner.load', options);
    }

    /** @en Make a previously loaded banner visible. */
    show(): Promise<void> {
        return bridge.call('banner.show');
    }

    /** @en Hide a visible banner without destroying it (can be shown again). */
    hide(): Promise<void> {
        return bridge.call('banner.hide');
    }

    /** @en Destroy the banner view and free its native resources. */
    destroy(): Promise<void> {
        return bridge.call('banner.destroy');
    }
}

/** @en Interstitial ad sub-API: load once, show once, then load again for the next impression. */
class InterstitialClient {
    load(adUnitId: string): Promise<void> {
        return bridge.call('interstitial.load', { adUnitId });
    }

    isReady(): Promise<boolean> {
        return bridge.call('interstitial.isReady');
    }

    /** @en Resolves after the ad has been dismissed (or immediately rejects if it could not be shown). */
    show(): Promise<void> {
        return bridge.call('interstitial.show');
    }
}

/**
 * @en Rewarded / rewarded-interstitial ad sub-API. Both formats share this
 * exact lifecycle; `admob.rewarded` and `admob.rewardedInterstitial` are two
 * independent instances of this same class, talking to two independent
 * native ad objects.
 */
class RewardedClient {
    constructor(private readonly _method: string) {}

    load(adUnitId: string): Promise<void> {
        return bridge.call(`${this._method}.load`, { adUnitId });
    }

    isReady(): Promise<boolean> {
        return bridge.call(`${this._method}.isReady`);
    }

    /** @en Resolves with the earned reward once the user completes the ad, or rejects if they close early / it fails to show. */
    show(): Promise<AdMobReward> {
        return bridge.call(`${this._method}.show`);
    }
}

/** @en App open ad sub-API. Typically loaded once and shown on cold start / foreground. */
class AppOpenClient {
    load(adUnitId: string): Promise<void> {
        return bridge.call('appOpen.load', { adUnitId });
    }

    isReady(): Promise<boolean> {
        return bridge.call('appOpen.isReady');
    }

    show(): Promise<void> {
        return bridge.call('appOpen.show');
    }
}

/**
 * @en Native ad sub-API. Like {@link BannerClient}, a native ad is a
 * persistent view (load → show → hide → destroy), but unlike a banner it is
 * rendered from ad-supplied assets (headline, body, icon, media, call to
 * action) into a **platform view composited on top of the GL surface** —
 * it is not a node in the Cocos scene graph, cannot be z-ordered between
 * Cocos nodes, does not scroll/transform with the scene, and is positioned
 * in screen pixel coordinates. See {@link NativeAdOptions}.
 *
 * @zh 原生广告子 API。与 {@link BannerClient} 类似，原生广告也是一个持久化的
 * 视图（load → show → hide → destroy），但与横幅不同，它是用广告方提供的素材
 * （标题、正文、图标、媒体、行动号召按钮）渲染出来的 —— 渲染结果是一个**叠加
 * 在 GL 渲染表面之上的原生平台视图**，并不是 Cocos 场景图中的节点：无法与
 * Cocos 节点进行 z 排序，不会随场景滚动/变换，且使用屏幕像素坐标定位。详见
 * {@link NativeAdOptions}。
 */
class NativeClient {
    /** @en Load (and, on Android/iOS, render) a native ad view. Resolves once the first ad has loaded. */
    load(options: NativeAdOptions): Promise<void> {
        return bridge.call('native.load', options);
    }

    /** @en Make a previously loaded native ad view visible. */
    show(): Promise<void> {
        return bridge.call('native.show');
    }

    /** @en Hide a visible native ad view without destroying it (can be shown again). */
    hide(): Promise<void> {
        return bridge.call('native.hide');
    }

    /** @en Destroy the native ad view and free its native resources (both the view and the underlying `NativeAd`/`GADNativeAd`). */
    destroy(): Promise<void> {
        return bridge.call('native.destroy');
    }
}

/** @en Google User Messaging Platform (UMP) consent sub-API. Required for EEA/UK compliance. */
class ConsentClient {
    /** @en Fetch the user's current consent requirement/status from Google. */
    request(): Promise<ConsentInfo> {
        return bridge.call('consent.request');
    }

    /** @en Show Google's consent form only if `request()` reported one is required. No-op (resolves immediately) otherwise. */
    showFormIfRequired(): Promise<ConsentInfo> {
        return bridge.call('consent.showFormIfRequired');
    }

    /** @en Whether ads may currently be requested (consent obtained, or not required). */
    canRequestAds(): Promise<boolean> {
        return bridge.call('consent.canRequestAds');
    }

    /** @en Reset all locally stored consent state (mainly useful for QA/testing). */
    reset(): Promise<void> {
        return bridge.call('consent.reset');
    }
}

/**
 * @en Public entry point for the AdMob extension's runtime API. Every method
 * degrades safely when no native bridge is present (web preview / editor
 * play mode): calls reject with an `E_NOT_SUPPORTED` error rather than
 * throwing synchronously or hanging forever.
 *
 * @zh AdMob 扩展运行时 API 的入口。当没有原生桥接可用时（Web 预览 / 编辑器
 * 运行模式），所有方法都会安全降级：以 `E_NOT_SUPPORTED` 错误 reject，
 * 而不是同步抛出异常或永久挂起。
 */
class AdMobClient {
    readonly banner = new BannerClient();
    readonly interstitial = new InterstitialClient();
    readonly rewarded = new RewardedClient('rewarded');
    readonly rewardedInterstitial = new RewardedClient('rewardedInterstitial');
    readonly appOpen = new AppOpenClient();
    readonly native = new NativeClient();
    readonly consent = new ConsentClient();

    /** @en Initialize the underlying Google Mobile Ads SDK. Call once before any other method. */
    initialize(options: InitializeOptions = {}): Promise<void> {
        return bridge.call('initialize', options);
    }

    /** @en Subscribe to an ad lifecycle / consent event. See {@link AdMobEvent} for the full list. */
    on(event: AdMobEventName, listener: EventListener): void {
        bridge.on(event, listener);
    }

    /** @en Unsubscribe a listener previously passed to {@link on}. */
    off(event: AdMobEventName, listener: EventListener): void {
        bridge.off(event, listener);
    }
}

export const admob = new AdMobClient();
export { AdMobEvent };
