package com.cocosext.admob;

import android.app.Activity;
import android.app.Application;
import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.util.Log;

import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.RequestConfiguration;
import com.google.android.gms.ads.initialization.InitializationStatus;
import com.google.android.gms.ads.initialization.OnInitializationCompleteListener;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.lang.ref.WeakReference;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * Owns the Google Mobile Ads SDK lifecycle and routes bridge method calls to
 * the per-format service classes. This is the Android mirror of
 * {@code CCEAdMobServiceHub} on iOS; both must expose the identical set of
 * bridge method names (see {@code assets/AdMobClient.ts}).
 */
final class AdMobServiceHub {
    private static final String TAG = "AdMobServiceHub";

    /** Google's public test device ID for the Android emulator (safe to always include). */
    private static final String TEST_DEVICE_ID_EMULATOR = "00000000-0000-0000-0000-000000000000";

    private final Context appContext;
    private final AdMobBridge bridge;

    private final BannerAdService banner;
    private final InterstitialAdService interstitial;
    private final RewardedAdService rewarded;
    private final RewardedInterstitialAdService rewardedInterstitial;
    private final AppOpenAdService appOpen;
    private final NativeAdService nativeAd;
    private final ConsentService consent;

    private WeakReference<Activity> currentActivity = new WeakReference<>(null);

    private boolean initialized = false;
    private boolean useTestAdsFromManifest = true;
    private List<String> testDeviceIdsFromManifest = new ArrayList<>();

    AdMobServiceHub(Context appContext, AdMobBridge bridge) {
        this.appContext = appContext;
        this.bridge = bridge;
        this.banner = new BannerAdService(this);
        this.interstitial = new InterstitialAdService(this);
        this.rewarded = new RewardedAdService(this, "rewarded");
        this.rewardedInterstitial = new RewardedInterstitialAdService(this);
        this.appOpen = new AppOpenAdService(this);
        this.nativeAd = new NativeAdService(this);
        this.consent = new ConsentService(this);

        readManifestMetaData();
        trackForegroundActivity();
    }

    Context getAppContext() {
        return appContext;
    }

    /** Best-effort current foreground Activity, needed to show full-screen ad formats. May return null very early in app startup. */
    Activity getActivity() {
        return currentActivity.get();
    }

    AdMobBridge getBridge() {
        return bridge;
    }

    boolean isUseTestAds() {
        return useTestAdsFromManifest;
    }

    private void trackForegroundActivity() {
        if (!(appContext instanceof Application)) {
            Log.w(TAG, "Application context unavailable; full-screen ad formats may not resolve an Activity.");
            return;
        }
        ((Application) appContext).registerActivityLifecycleCallbacks(new Application.ActivityLifecycleCallbacks() {
            @Override public void onActivityCreated(Activity activity, Bundle savedInstanceState) { currentActivity = new WeakReference<>(activity); }
            @Override public void onActivityStarted(Activity activity) { currentActivity = new WeakReference<>(activity); }
            @Override public void onActivityResumed(Activity activity) { currentActivity = new WeakReference<>(activity); }
            @Override public void onActivityPaused(Activity activity) {}
            @Override public void onActivityStopped(Activity activity) {}
            @Override public void onActivitySaveInstanceState(Activity activity, Bundle outState) {}
            @Override public void onActivityDestroyed(Activity activity) {
                if (currentActivity.get() == activity) {
                    currentActivity = new WeakReference<>(null);
                }
            }
        });
    }

    /**
     * Reads the `${admobUseTestAds}` / `${admobTestDeviceIds}` manifest
     * placeholders (written by `BuildTaskAndroid.ts` from the build panel's
     * "Use test ads" / "Test device IDs" options) via the standard
     * {@link PackageManager} application-info metadata API.
     */
    private void readManifestMetaData() {
        try {
            ApplicationInfo info = appContext.getPackageManager()
                    .getApplicationInfo(appContext.getPackageName(), PackageManager.GET_META_DATA);
            Bundle meta = info.metaData;
            if (meta != null) {
                useTestAdsFromManifest = !"false".equals(meta.getString("com.cocosext.admob.USE_TEST_ADS"));
                String ids = meta.getString("com.cocosext.admob.TEST_DEVICE_IDS");
                if (ids != null && !ids.trim().isEmpty()) {
                    testDeviceIdsFromManifest = new ArrayList<>(Arrays.asList(ids.split("\\s*,\\s*")));
                }
            }
        } catch (PackageManager.NameNotFoundException e) {
            Log.w(TAG, "Could not read AdMob manifest metadata; defaulting to test ads ON.", e);
        }
    }

    void dispatch(int id, String method, JSONObject args) {
        try {
            switch (method) {
                case "initialize":
                    initialize(id, args);
                    return;
                case "banner.load": banner.load(id, args); return;
                case "banner.show": banner.show(id); return;
                case "banner.hide": banner.hide(id); return;
                case "banner.destroy": banner.destroy(id); return;

                case "interstitial.load": interstitial.load(id, args); return;
                case "interstitial.isReady": interstitial.isReady(id); return;
                case "interstitial.show": interstitial.show(id); return;

                case "rewarded.load": rewarded.load(id, args); return;
                case "rewarded.isReady": rewarded.isReady(id); return;
                case "rewarded.show": rewarded.show(id); return;

                case "rewardedInterstitial.load": rewardedInterstitial.load(id, args); return;
                case "rewardedInterstitial.isReady": rewardedInterstitial.isReady(id); return;
                case "rewardedInterstitial.show": rewardedInterstitial.show(id); return;

                case "appOpen.load": appOpen.load(id, args); return;
                case "appOpen.isReady": appOpen.isReady(id); return;
                case "appOpen.show": appOpen.show(id); return;

                case "native.load": nativeAd.load(id, args); return;
                case "native.show": nativeAd.show(id); return;
                case "native.hide": nativeAd.hide(id); return;
                case "native.destroy": nativeAd.destroy(id); return;

                case "consent.request": consent.request(id); return;
                case "consent.showFormIfRequired": consent.showFormIfRequired(id); return;
                case "consent.canRequestAds": consent.canRequestAds(id); return;
                case "consent.reset": consent.reset(id); return;

                default:
                    bridge.respondErr(id, "E_UNKNOWN_METHOD", "Unknown AdMob bridge method: " + method);
            }
        } catch (JSONException e) {
            bridge.respondErr(id, "E_BAD_ARGS", "Invalid arguments for '" + method + "': " + e.getMessage());
        }
    }

    private void initialize(int id, JSONObject args) throws JSONException {
        if (initialized) {
            bridge.respondOk(id, null);
            return;
        }

        List<String> deviceIds = new ArrayList<>();
        deviceIds.add(TEST_DEVICE_ID_EMULATOR);
        deviceIds.addAll(testDeviceIdsFromManifest);
        JSONArray overrideIds = args.optJSONArray("testDeviceIds");
        if (overrideIds != null) {
            for (int i = 0; i < overrideIds.length(); i++) {
                deviceIds.add(overrideIds.optString(i));
            }
        }

        RequestConfiguration config = new RequestConfiguration.Builder()
                .setTestDeviceIds(deviceIds)
                .build();
        MobileAds.setRequestConfiguration(config);

        MobileAds.initialize(appContext, new OnInitializationCompleteListener() {
            @Override
            public void onInitializationComplete(InitializationStatus status) {
                initialized = true;
                bridge.respondOk(id, null);
            }
        });
    }
}
