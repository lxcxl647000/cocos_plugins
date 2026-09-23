package com.cocosext.admob;

import android.app.Activity;
import android.util.DisplayMetrics;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.TextView;

import com.google.android.gms.ads.AdListener;
import com.google.android.gms.ads.AdLoader;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.nativead.MediaView;
import com.google.android.gms.ads.nativead.NativeAd;
import com.google.android.gms.ads.nativead.NativeAdView;

import org.json.JSONException;
import org.json.JSONObject;

/**
 * Native ad format: like {@link BannerAdService}, a persistent attach/detach
 * -able view rather than a one-shot full-screen ad, but rendered from
 * ad-supplied assets into a hand-written template (this project's own
 * {@code res/layout/admob_native_ad_view.xml}, not any third-party sample
 * layout — see ADMOB-CLEANROOM-SPEC.md §2).
 *
 * Two Google policy requirements this class must satisfy:
 * <ul>
 *   <li>The "Ad" attribution badge is built by hand in the layout XML —
 *       Google does not auto-generate it.</li>
 *   <li>The AdChoices overlay IS auto-added by the SDK on top of the
 *       {@link NativeAdView} as long as {@code setAdChoicesView} is never
 *       called here, so this class deliberately leaves that alone.</li>
 *   <li>Every asset view actually used must be registered with
 *       {@code NativeAdView.set*View()} and the ad object itself passed to
 *       {@link NativeAdView#setNativeAd}, or impressions/clicks are not
 *       counted.</li>
 * </ul>
 */
final class NativeAdService {
    private static final String TEST_AD_UNIT_ID = "ca-app-pub-3940256099942544/2247696110"; // Google public test: native advanced

    private final AdMobServiceHub hub;
    private AdLoader adLoader;
    private NativeAd nativeAd;
    private NativeAdView adView;
    private FrameLayout container;
    private String position = "bottom";

    NativeAdService(AdMobServiceHub hub) {
        this.hub = hub;
    }

    void load(int id, JSONObject args) throws JSONException {
        Activity activity = hub.getActivity();
        if (activity == null) {
            hub.getBridge().respondErr(id, "E_NO_ACTIVITY", "No foreground Activity available to load the native ad.");
            return;
        }
        String adUnitId = hub.isUseTestAds() ? TEST_AD_UNIT_ID : args.optString("adUnitId", TEST_AD_UNIT_ID);
        position = args.optString("position", "bottom");
        final Integer widthDp = args.has("width") ? args.optInt("width") : null;
        final Integer heightDp = args.has("height") ? args.optInt("height") : null;

        activity.runOnUiThread(() -> {
            destroyInternal();

            AdLoader.Builder builder = new AdLoader.Builder(activity, adUnitId);
            builder.forNativeAd(loadedAd -> renderNativeAd(activity, loadedAd, id, widthDp, heightDp));
            builder.withAdListener(new AdListener() {
                @Override
                public void onAdFailedToLoad(LoadAdError error) {
                    hub.getBridge().respondErr(id, "E_LOAD_FAILED", error.getMessage());
                    hub.getBridge().sendEvent("native.failedToLoad", errorPayload(error));
                }

                @Override
                public void onAdClicked() {
                    hub.getBridge().sendEvent("native.clicked", null);
                }

                @Override
                public void onAdImpression() {
                    hub.getBridge().sendEvent("native.impression", null);
                }

                @Override
                public void onAdOpened() {
                    hub.getBridge().sendEvent("native.opened", null);
                }

                @Override
                public void onAdClosed() {
                    hub.getBridge().sendEvent("native.closed", null);
                }
            });
            adLoader = builder.build();
            adLoader.loadAd(new AdRequest.Builder().build());
        });
    }

    /** Inflates the template layout, binds ad assets into it, and registers everything with the SDK. Must run on the UI thread. */
    private void renderNativeAd(Activity activity, NativeAd loadedAd, int id, Integer widthDp, Integer heightDp) {
        nativeAd = loadedAd;

        LayoutInflater inflater = LayoutInflater.from(activity);
        adView = (NativeAdView) inflater.inflate(R.layout.admob_native_ad_view, null);

        TextView headline = adView.findViewById(R.id.admob_native_ad_headline);
        TextView body = adView.findViewById(R.id.admob_native_ad_body);
        ImageView icon = adView.findViewById(R.id.admob_native_ad_icon);
        MediaView media = adView.findViewById(R.id.admob_native_ad_media);
        Button callToAction = adView.findViewById(R.id.admob_native_ad_call_to_action);

        headline.setText(loadedAd.getHeadline());
        adView.setHeadlineView(headline);

        if (loadedAd.getBody() != null) {
            body.setText(loadedAd.getBody());
            body.setVisibility(View.VISIBLE);
        } else {
            body.setVisibility(View.INVISIBLE);
        }
        adView.setBodyView(body);

        if (loadedAd.getIcon() != null) {
            icon.setImageDrawable(loadedAd.getIcon().getDrawable());
            icon.setVisibility(View.VISIBLE);
        } else {
            icon.setVisibility(View.GONE);
        }
        adView.setIconView(icon);

        media.setMediaContent(loadedAd.getMediaContent());
        adView.setMediaView(media);

        if (loadedAd.getCallToAction() != null) {
            callToAction.setText(loadedAd.getCallToAction());
            callToAction.setVisibility(View.VISIBLE);
        } else {
            callToAction.setVisibility(View.INVISIBLE);
        }
        adView.setCallToActionView(callToAction);

        // Google policy: the loaded NativeAd must be registered with the view
        // that renders it, or impressions/clicks are not recorded. This must
        // run after every set*View() call above.
        adView.setNativeAd(loadedAd);

        container = new FrameLayout(activity);
        FrameLayout.LayoutParams containerParams = new FrameLayout.LayoutParams(
                widthDp != null ? dpToPx(activity, widthDp) : FrameLayout.LayoutParams.MATCH_PARENT,
                heightDp != null ? dpToPx(activity, heightDp) : FrameLayout.LayoutParams.WRAP_CONTENT);
        containerParams.gravity = gravityForPosition(position);
        container.setVisibility(View.GONE);
        activity.addContentView(container, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        container.addView(adView, containerParams);

        hub.getBridge().respondOk(id, null);
        hub.getBridge().sendEvent("native.loaded", null);
    }

    void show(int id) {
        Activity activity = hub.getActivity();
        if (activity == null || container == null) {
            hub.getBridge().respondErr(id, "E_NOT_LOADED", "Call native.load() before native.show().");
            return;
        }
        activity.runOnUiThread(() -> {
            container.setVisibility(View.VISIBLE);
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
            container.setVisibility(View.GONE);
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
        adLoader = null;
        if (nativeAd != null) {
            nativeAd.destroy();
            nativeAd = null;
        }
        adView = null;
        if (container != null) {
            if (container.getParent() instanceof ViewGroup) {
                ((ViewGroup) container.getParent()).removeView(container);
            }
            container = null;
        }
    }

    private static int gravityForPosition(String position) {
        if ("top".equals(position)) {
            return Gravity.TOP;
        }
        if ("center".equals(position)) {
            return Gravity.CENTER;
        }
        return Gravity.BOTTOM;
    }

    private static int dpToPx(Activity activity, int dp) {
        DisplayMetrics metrics = activity.getResources().getDisplayMetrics();
        return (int) (dp * metrics.density);
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
