package com.cocosext.admob;

import android.app.Activity;
import android.util.DisplayMetrics;
import android.view.Gravity;
import android.widget.FrameLayout;

import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdSize;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.LoadAdError;

import org.json.JSONException;
import org.json.JSONObject;

/** Banner ad format: a persistent, attach/detach-able view rather than a one-shot full-screen ad. */
final class BannerAdService {
    private static final String TEST_AD_UNIT_ID = "ca-app-pub-3940256099942544/9214589741"; // Google public test: anchored adaptive banner

    private final AdMobServiceHub hub;
    private AdView adView;
    private FrameLayout container;
    private String position = "bottom";

    BannerAdService(AdMobServiceHub hub) {
        this.hub = hub;
    }

    void load(int id, JSONObject args) throws JSONException {
        Activity activity = hub.getActivity();
        if (activity == null) {
            hub.getBridge().respondErr(id, "E_NO_ACTIVITY", "No foreground Activity available to attach the banner to.");
            return;
        }
        String adUnitId = hub.isUseTestAds() ? TEST_AD_UNIT_ID : args.optString("adUnitId", TEST_AD_UNIT_ID);
        position = args.optString("position", "bottom");

        activity.runOnUiThread(() -> {
            destroyInternal();

            adView = new AdView(activity);
            adView.setAdUnitId(adUnitId);
            adView.setAdSize(computeAdaptiveBannerSize(activity));
            adView.setAdListener(new com.google.android.gms.ads.AdListener() {
                @Override
                public void onAdLoaded() {
                    hub.getBridge().respondOk(id, null);
                    hub.getBridge().sendEvent("banner.loaded", null);
                }

                @Override
                public void onAdFailedToLoad(LoadAdError error) {
                    hub.getBridge().respondErr(id, "E_LOAD_FAILED", error.getMessage());
                    hub.getBridge().sendEvent("banner.failedToLoad", errorPayload(error));
                }

                @Override
                public void onAdOpened() {
                    hub.getBridge().sendEvent("banner.opened", null);
                }

                @Override
                public void onAdClosed() {
                    hub.getBridge().sendEvent("banner.closed", null);
                }
            });

            container = new FrameLayout(activity);
            FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.WRAP_CONTENT);
            params.gravity = "top".equals(position) ? Gravity.TOP : Gravity.BOTTOM;
            container.setVisibility(android.view.View.GONE);
            activity.addContentView(container, new FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
            container.addView(adView, params);

            adView.loadAd(new AdRequest.Builder().build());
        });
    }

    void show(int id) {
        Activity activity = hub.getActivity();
        if (activity == null || container == null) {
            hub.getBridge().respondErr(id, "E_NOT_LOADED", "Call banner.load() before banner.show().");
            return;
        }
        activity.runOnUiThread(() -> {
            container.setVisibility(android.view.View.VISIBLE);
            hub.getBridge().respondOk(id, null);
        });
    }

    void hide(int id) {
        Activity activity = hub.getActivity();
        if (activity == null || container == null) {
            hub.getBridge().respondOk(id, null);
            return;
        }
        activity.runOnUiThread(() -> {
            container.setVisibility(android.view.View.GONE);
            hub.getBridge().respondOk(id, null);
        });
    }

    void destroy(int id) {
        Activity activity = hub.getActivity();
        if (activity == null) {
            destroyInternal();
            hub.getBridge().respondOk(id, null);
            return;
        }
        activity.runOnUiThread(() -> {
            destroyInternal();
            hub.getBridge().respondOk(id, null);
        });
    }

    private void destroyInternal() {
        if (adView != null) {
            adView.destroy();
            adView = null;
        }
        if (container != null) {
            if (container.getParent() instanceof android.view.ViewGroup) {
                ((android.view.ViewGroup) container.getParent()).removeView(container);
            }
            container = null;
        }
    }

    private AdSize computeAdaptiveBannerSize(Activity activity) {
        DisplayMetrics metrics = activity.getResources().getDisplayMetrics();
        float widthPixels = metrics.widthPixels;
        int adWidth = (int) (widthPixels / metrics.density);
        return AdSize.getCurrentOrientationAnchoredAdaptiveBannerAdSize(activity, adWidth);
    }

    private static JSONObject errorPayload(LoadAdError error) {
        try {
            JSONObject payload = new JSONObject();
            payload.put("code", String.valueOf(error.getCode()));
            payload.put("message", error.getMessage());
            return payload;
        } catch (JSONException e) {
            return new JSONObject();
        }
    }
}
