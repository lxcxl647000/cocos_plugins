package com.cocosext.admob;

import android.app.Activity;

import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.OnUserEarnedRewardListener;
import com.google.android.gms.ads.rewarded.RewardItem;
import com.google.android.gms.ads.rewardedinterstitial.RewardedInterstitialAd;
import com.google.android.gms.ads.rewardedinterstitial.RewardedInterstitialAdLoadCallback;

import org.json.JSONException;
import org.json.JSONObject;

/**
 * Rewarded interstitial ad format: identical show/reward lifecycle to
 * {@link RewardedAdService}, but a distinct Google Mobile Ads SDK class
 * ({@code RewardedInterstitialAd}) with its own load callback type, so it
 * cannot share a base class with the plain rewarded format without an
 * unnecessary abstraction over two SDK types that just happen to look alike.
 */
final class RewardedInterstitialAdService {
    private static final String TEST_AD_UNIT_ID = "ca-app-pub-3940256099942544/5354046379"; // Google public test: rewarded interstitial
    private static final String EVENT_NAMESPACE = "rewardedInterstitial";

    private final AdMobServiceHub hub;
    private RewardedInterstitialAd ad;
    private RewardItem pendingReward;

    RewardedInterstitialAdService(AdMobServiceHub hub) {
        this.hub = hub;
    }

    void load(int id, JSONObject args) throws JSONException {
        String adUnitId = hub.isUseTestAds() ? TEST_AD_UNIT_ID : args.optString("adUnitId", TEST_AD_UNIT_ID);
        RewardedInterstitialAd.load(hub.getAppContext(), adUnitId, new AdRequest.Builder().build(), new RewardedInterstitialAdLoadCallback() {
            @Override
            public void onAdLoaded(RewardedInterstitialAd loadedAd) {
                ad = loadedAd;
                hub.getBridge().respondOk(id, null);
                hub.getBridge().sendEvent(EVENT_NAMESPACE + ".loaded", null);
            }

            @Override
            public void onAdFailedToLoad(LoadAdError error) {
                ad = null;
                hub.getBridge().respondErr(id, "E_LOAD_FAILED", error.getMessage());
                hub.getBridge().sendEvent(EVENT_NAMESPACE + ".failedToLoad", errorPayload(error.getCode(), error.getMessage()));
            }
        });
    }

    void isReady(int id) {
        hub.getBridge().respondOk(id, ad != null);
    }

    void show(int id) {
        if (ad == null) {
            hub.getBridge().respondErr(id, "E_NOT_READY", "Call rewardedInterstitial.load() and wait for it to resolve before show().");
            return;
        }
        Activity activity = hub.getActivity();
        if (activity == null) {
            hub.getBridge().respondErr(id, "E_NO_ACTIVITY", "No foreground Activity available to show the rewarded interstitial ad.");
            return;
        }
        pendingReward = null;
        ad.setFullScreenContentCallback(new FullScreenContentCallback() {
            @Override
            public void onAdShowedFullScreenContent() {
                hub.getBridge().sendEvent(EVENT_NAMESPACE + ".showed", null);
            }

            @Override
            public void onAdFailedToShowFullScreenContent(AdError error) {
                ad = null;
                hub.getBridge().respondErr(id, "E_SHOW_FAILED", error.getMessage());
                hub.getBridge().sendEvent(EVENT_NAMESPACE + ".failedToShow", errorPayload(error.getCode(), error.getMessage()));
            }

            @Override
            public void onAdDismissedFullScreenContent() {
                ad = null;
                hub.getBridge().sendEvent(EVENT_NAMESPACE + ".dismissed", null);
                if (pendingReward != null) {
                    hub.getBridge().respondOk(id, rewardPayload(pendingReward));
                } else {
                    hub.getBridge().respondErr(id, "E_DISMISSED_WITHOUT_REWARD", "User closed the ad before earning a reward.");
                }
            }
        });
        ad.show(activity, (OnUserEarnedRewardListener) reward -> {
            pendingReward = reward;
            hub.getBridge().sendEvent(EVENT_NAMESPACE + ".earnedReward", rewardPayload(reward));
        });
    }

    private static JSONObject rewardPayload(RewardItem reward) {
        try {
            JSONObject payload = new JSONObject();
            payload.put("type", reward.getType());
            payload.put("amount", reward.getAmount());
            return payload;
        } catch (JSONException e) {
            return new JSONObject();
        }
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
