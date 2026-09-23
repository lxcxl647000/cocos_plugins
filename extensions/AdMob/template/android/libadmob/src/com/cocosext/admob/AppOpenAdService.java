package com.cocosext.admob;

import android.app.Activity;

import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.appopen.AppOpenAd;

import org.json.JSONException;
import org.json.JSONObject;

/**
 * App open ad format. Unlike the other full-screen formats, this one is
 * typically shown proactively by the app itself on cold start or when
 * returning to the foreground — this class only exposes load/isReady/show;
 * the *decision* of when to call show() (and any "don't show right after
 * the user leaves an interstitial/rewarded ad" guard) is left to the game's
 * own code, driven from JS via `admob.appOpen`. See doc/en/index.md for the
 * recommended guard pattern.
 */
final class AppOpenAdService {
    private static final String TEST_AD_UNIT_ID = "ca-app-pub-3940256099942544/9257395921"; // Google public test: app open

    private final AdMobServiceHub hub;
    private AppOpenAd ad;

    AppOpenAdService(AdMobServiceHub hub) {
        this.hub = hub;
    }

    void load(int id, JSONObject args) throws JSONException {
        String adUnitId = hub.isUseTestAds() ? TEST_AD_UNIT_ID : args.optString("adUnitId", TEST_AD_UNIT_ID);
        AppOpenAd.load(hub.getAppContext(), adUnitId, new AdRequest.Builder().build(), new AppOpenAd.AppOpenAdLoadCallback() {
            @Override
            public void onAdLoaded(AppOpenAd loadedAd) {
                ad = loadedAd;
                hub.getBridge().respondOk(id, null);
                hub.getBridge().sendEvent("appOpen.loaded", null);
            }

            @Override
            public void onAdFailedToLoad(LoadAdError error) {
                ad = null;
                hub.getBridge().respondErr(id, "E_LOAD_FAILED", error.getMessage());
                hub.getBridge().sendEvent("appOpen.failedToLoad", errorPayload(error.getCode(), error.getMessage()));
            }
        });
    }

    void isReady(int id) {
        hub.getBridge().respondOk(id, ad != null);
    }

    void show(int id) {
        if (ad == null) {
            hub.getBridge().respondErr(id, "E_NOT_READY", "Call appOpen.load() and wait for it to resolve before show().");
            return;
        }
        Activity activity = hub.getActivity();
        if (activity == null) {
            hub.getBridge().respondErr(id, "E_NO_ACTIVITY", "No foreground Activity available to show the app open ad.");
            return;
        }
        ad.setFullScreenContentCallback(new FullScreenContentCallback() {
            @Override
            public void onAdShowedFullScreenContent() {
                hub.getBridge().sendEvent("appOpen.showed", null);
            }

            @Override
            public void onAdFailedToShowFullScreenContent(AdError error) {
                ad = null;
                hub.getBridge().respondErr(id, "E_SHOW_FAILED", error.getMessage());
                hub.getBridge().sendEvent("appOpen.failedToShow", errorPayload(error.getCode(), error.getMessage()));
            }

            @Override
            public void onAdDismissedFullScreenContent() {
                ad = null;
                hub.getBridge().respondOk(id, null);
                hub.getBridge().sendEvent("appOpen.dismissed", null);
            }
        });
        ad.show(activity);
    }

    private static JSONObject errorPayload(int code, String message) {
        try {
            JSONObject payload = new JSONObject();
            payload.put("code", String.valueOf(code));
            payload.put("message", message);
            return payload;
        } catch (JSONException e) {
            return new JSONObject();
        }
    }
}
