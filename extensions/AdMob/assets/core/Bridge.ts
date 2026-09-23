import { native } from 'cc';
import { NATIVE } from 'cc/env';

/**
 * Wire protocol channel name. Both the Android (`AdMobBridge.java`) and iOS
 * (`CCEAdMobServiceHub.mm`) native sides register their `JsbBridgeWrapper`
 * listener on this exact string.
 */
const CHANNEL = 'admob';

/** Default timeout (ms) for a native call before its promise auto-rejects. Pass 0 to disable. */
const DEFAULT_TIMEOUT_MS = 15000;

export interface NativeErrorPayload {
    code: string;
    message: string;
}

interface RequestEnvelope {
    id: number;
    method: string;
    args: any;
}

interface ResponseEnvelope {
    kind: 'response';
    id: number;
    success: boolean;
    data?: any;
    error?: NativeErrorPayload;
}

interface EventEnvelope {
    kind: 'event';
    name: string;
    data?: any;
}

type IncomingEnvelope = ResponseEnvelope | EventEnvelope;

interface PendingCall {
    resolve: (value: any) => void;
    reject: (reason: any) => void;
    timer?: any;
}

export type EventListener = (data: any) => void;

/**
 * Thin JS↔native transport built on `JsbBridgeWrapper` — the **multi**-listener
 * bridge API. This is a deliberate choice: `JsbBridge`/`native.bridge` only
 * supports a single global callback slot, which would silently break if any
 * other Cocos extension in the project (Firebase, IAP, Share, ...) also uses
 * it. `JsbBridgeWrapper` lets every extension register its own named channel
 * without stepping on the others.
 *
 * Two message shapes travel over the same channel:
 * - `{kind:"response", id, success, data|error}` — reply to a JS-initiated
 *   `call()`, routed back to the matching pending Promise by numeric `id`.
 * - `{kind:"event", name, data}` — native-initiated push (ad loaded, reward
 *   earned, consent info updated, ...), fanned out to listeners registered
 *   via `on()`/`off()`.
 */
class Bridge {
    private _inited = false;
    private _nextId = 1;
    private _pending: Map<number, PendingCall> = new Map();
    private _listeners: Map<string, Set<EventListener>> = new Map();

    init(): void {
        if (this._inited || !NATIVE) {
            return;
        }
        this._inited = true;
        native.jsbBridgeWrapper.addNativeEventListener(CHANNEL, (arg: string) => {
            this._onNativeMessage(arg);
        });
    }

    /** True when a native bridge is actually available (i.e. not web preview/editor). */
    get isNative(): boolean {
        return NATIVE;
    }

    /**
     * Invoke a native method and await its response. Resolves/rejects
     * predictably even off-native, and never leaves the returned Promise
     * unsettled.
     */
    call<T = any>(method: string, args: any = {}, timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<T> {
        if (!NATIVE) {
            return Promise.reject(this._notSupportedError(method));
        }
        this.init();

        const id = this._nextId++;
        const envelope: RequestEnvelope = { id, method, args };

        return new Promise<T>((resolve, reject) => {
            const pending: PendingCall = { resolve, reject };
            if (timeoutMs > 0) {
                pending.timer = setTimeout(() => {
                    if (this._pending.delete(id)) {
                        reject(this._timeoutError(method));
                    }
                }, timeoutMs);
            }
            this._pending.set(id, pending);
            native.jsbBridgeWrapper.dispatchEventToNative(CHANNEL, JSON.stringify(envelope));
        });
    }

    /** Subscribe to a native-initiated event (ad lifecycle, reward, consent, ...). */
    on(event: string, listener: EventListener): void {
        this.init();
        let set = this._listeners.get(event);
        if (!set) {
            set = new Set();
            this._listeners.set(event, set);
        }
        set.add(listener);
    }

    off(event: string, listener: EventListener): void {
        const set = this._listeners.get(event);
        if (set) {
            set.delete(listener);
        }
    }

    private _onNativeMessage(raw: string): void {
        let msg: IncomingEnvelope;
        try {
            msg = JSON.parse(raw);
        } catch (e) {
            return;
        }
        if (!msg || typeof msg !== 'object') {
            return;
        }

        if (msg.kind === 'response') {
            const pending = this._pending.get(msg.id);
            if (!pending) {
                return;
            }
            this._pending.delete(msg.id);
            if (pending.timer) {
                clearTimeout(pending.timer);
            }
            if (msg.success) {
                pending.resolve(msg.data);
            } else {
                pending.reject(msg.error ?? { code: 'E_UNKNOWN', message: 'Unknown native error' });
            }
            return;
        }

        if (msg.kind === 'event') {
            const set = this._listeners.get(msg.name);
            if (set) {
                for (const listener of Array.from(set)) {
                    listener(msg.data);
                }
            }
        }
    }

    private _notSupportedError(method: string): NativeErrorPayload {
        return {
            code: 'E_NOT_SUPPORTED',
            message: `[AdMob] "${method}" is not available in this environment (native bridge not present, e.g. web preview/editor).`,
        };
    }

    private _timeoutError(method: string): NativeErrorPayload {
        return {
            code: 'E_TIMEOUT',
            message: `[AdMob] "${method}" timed out waiting for a native response.`,
        };
    }
}

export const bridge = new Bridge();
