package com.cocosext.admob;

import android.content.Context;
import android.util.Log;

import com.cocos.lib.CocosHelper;
import com.cocos.lib.JsbBridgeWrapper;

import org.json.JSONException;
import org.json.JSONObject;

/**
 * Wire-protocol layer between JS ({@code assets/core/Bridge.ts}) and native.
 *
 * Uses {@link JsbBridgeWrapper}, the multi-listener bridge API — deliberately
 * NOT the legacy single-callback {@code JsbBridge}, so this extension can
 * coexist with every other "cocos-*" extension in the same project.
 *
 * Envelope shapes (must match {@code assets/core/Bridge.ts} exactly):
 * <pre>
 *   JS -> native (request):  {"id": number, "method": string, "args": object}
 *   native -> JS (response): {"kind": "response", "id": number, "success": bool, "data"?: any, "error"?: {"code": string, "message": string}}
 *   native -> JS (event):    {"kind": "event", "name": string, "data"?: any}
 * </pre>
 */
public final class AdMobBridge {
    private static final String TAG = "AdMobBridge";
    private static final String CHANNEL = "admob";

    private static AdMobBridge sInstance;

    private final AdMobServiceHub hub;

    private AdMobBridge(Context context) {
        this.hub = new AdMobServiceHub(context, this);
    }

    /** Called once from {@link AdMobInitProvider#onCreate()}, before {@code Application.onCreate()}. */
    public static synchronized void register(Context context) {
        if (sInstance != null) {
            return;
        }
        sInstance = new AdMobBridge(context.getApplicationContext());
        JsbBridgeWrapper.getInstance().addScriptEventListener(CHANNEL, sInstance::handleIncoming);
    }

    private void handleIncoming(String message) {
        int id = -1;
        try {
            JSONObject json = new JSONObject(message);
            id = json.optInt("id", -1);
            String method = json.optString("method", "");
            JSONObject args = json.optJSONObject("args");
            if (args == null) {
                args = new JSONObject();
            }
            hub.dispatch(id, method, args);
        } catch (JSONException e) {
            Log.e(TAG, "Malformed message from JS: " + message, e);
            if (id != -1) {
                respondErr(id, "E_BAD_REQUEST", "Malformed request JSON: " + e.getMessage());
            }
        } catch (RuntimeException e) {
            Log.e(TAG, "Unhandled error dispatching message: " + message, e);
            if (id != -1) {
                respondErr(id, "E_INTERNAL", String.valueOf(e.getMessage()));
            }
        }
    }

    /** Resolve the JS-side promise for request {@code id} with {@code data} (may be null). */
    public void respondOk(int id, Object data) {
        try {
            JSONObject envelope = new JSONObject();
            envelope.put("kind", "response");
            envelope.put("id", id);
            envelope.put("success", true);
            if (data != null) {
                envelope.put("data", data);
            }
            sendToScript(envelope);
        } catch (JSONException e) {
            Log.e(TAG, "Failed to build response envelope", e);
        }
    }

    /** Reject the JS-side promise for request {@code id} with an {@code {code, message}} error. */
    public void respondErr(int id, String code, String messageText) {
        try {
            JSONObject error = new JSONObject();
            error.put("code", code);
            error.put("message", messageText);

            JSONObject envelope = new JSONObject();
            envelope.put("kind", "response");
            envelope.put("id", id);
            envelope.put("success", false);
            envelope.put("error", error);
            sendToScript(envelope);
        } catch (JSONException e) {
            Log.e(TAG, "Failed to build error envelope", e);
        }
    }

    /** Push a native-initiated event (ad lifecycle, reward, consent, ...) to every JS listener. */
    public void sendEvent(String name, Object data) {
        try {
            JSONObject envelope = new JSONObject();
            envelope.put("kind", "event");
            envelope.put("name", name);
            if (data != null) {
                envelope.put("data", data);
            }
            sendToScript(envelope);
        } catch (JSONException e) {
            Log.e(TAG, "Failed to build event envelope", e);
        }
    }

    private void sendToScript(JSONObject envelope) {
        final String json = envelope.toString();
        // Ad SDK callbacks can arrive on arbitrary threads; JS must only ever
        // be touched from the GL/game thread.
        CocosHelper.runOnGameThread(() -> JsbBridgeWrapper.getInstance().dispatchEventToScript(CHANNEL, json));
    }
}
