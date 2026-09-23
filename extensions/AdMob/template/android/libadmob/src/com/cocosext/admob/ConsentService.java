package com.cocosext.admob;

import android.app.Activity;

import com.google.android.ump.ConsentDebugSettings;
import com.google.android.ump.ConsentInformation;
import com.google.android.ump.ConsentRequestParameters;
import com.google.android.ump.FormError;
import com.google.android.ump.UserMessagingPlatform;

import org.json.JSONException;
import org.json.JSONObject;

/**
 * Google User Messaging Platform (UMP) consent sub-API. This is not optional
 * boilerplate: apps that serve ads to users in the EEA/UK must go through
 * this flow before requesting ads, per Google's policies.
 */
final class ConsentService {
    private final AdMobServiceHub hub;
    private ConsentInformation consentInformation;

    ConsentService(AdMobServiceHub hub) {
        this.hub = hub;
    }

    void request(int id) {
        Activity activity = hub.getActivity();
        if (activity == null) {
            hub.getBridge().respondErr(id, "E_NO_ACTIVITY", "No foreground Activity available to request consent info.");
            return;
        }
        consentInformation = UserMessagingPlatform.getConsentInformation(hub.getAppContext());

        ConsentRequestParameters.Builder paramsBuilder = new ConsentRequestParameters.Builder();
        if (hub.isUseTestAds()) {
            // In test mode, mark this device as a debug device so UMP always
            // simulates being in the EEA (otherwise the debug geography is a
            // no-op for real, non-EEA devices).
            ConsentDebugSettings debugSettings = new ConsentDebugSettings.Builder(activity)
                    .setDebugGeography(ConsentDebugSettings.DebugGeography.DEBUG_GEOGRAPHY_EEA)
                    .build();
            paramsBuilder.setConsentDebugSettings(debugSettings);
        }
        ConsentRequestParameters params = paramsBuilder.build();

        consentInformation.requestConsentInfoUpdate(
                activity,
                params,
                () -> {
                    hub.getBridge().sendEvent("consent.infoUpdated", buildConsentInfoPayload());
                    hub.getBridge().respondOk(id, buildConsentInfoPayload());
                },
                (FormError error) -> hub.getBridge().respondErr(id, "E_CONSENT_UPDATE_FAILED", error.getMessage()));
    }

    void showFormIfRequired(int id) {
        Activity activity = hub.getActivity();
        if (activity == null) {
            hub.getBridge().respondErr(id, "E_NO_ACTIVITY", "No foreground Activity available to show the consent form.");
            return;
        }
        UserMessagingPlatform.loadAndShowConsentFormIfRequired(activity, (FormError error) -> {
            if (error != null) {
                hub.getBridge().respondErr(id, "E_CONSENT_FORM_FAILED", error.getMessage());
                return;
            }
            hub.getBridge().sendEvent("consent.formDismissed", null);
            hub.getBridge().respondOk(id, buildConsentInfoPayload());
        });
    }

    void canRequestAds(int id) {
        boolean canRequest = consentInformation != null && consentInformation.canRequestAds();
        hub.getBridge().respondOk(id, canRequest);
    }

    void reset(int id) {
        if (consentInformation != null) {
            consentInformation.reset();
        }
        hub.getBridge().respondOk(id, null);
    }

    private JSONObject buildConsentInfoPayload() {
        try {
            JSONObject payload = new JSONObject();
            payload.put("status", consentStatusName());
            payload.put("isConsentFormAvailable", consentInformation != null && consentInformation.isConsentFormAvailable());
            payload.put("canRequestAds", consentInformation != null && consentInformation.canRequestAds());
            return payload;
        } catch (JSONException e) {
            return new JSONObject();
        }
    }

    private String consentStatusName() {
        if (consentInformation == null) {
            return "UNKNOWN";
        }
        switch (consentInformation.getConsentStatus()) {
            case ConsentInformation.ConsentStatus.REQUIRED:
                return "REQUIRED";
            case ConsentInformation.ConsentStatus.NOT_REQUIRED:
                return "NOT_REQUIRED";
            case ConsentInformation.ConsentStatus.OBTAINED:
                return "OBTAINED";
            case ConsentInformation.ConsentStatus.UNKNOWN:
            default:
                return "UNKNOWN";
        }
    }
}
