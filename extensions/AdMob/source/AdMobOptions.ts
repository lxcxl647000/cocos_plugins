/**
 * Shape of the per-platform options object handed to the build hooks by the
 * Cocos Creator build panel. Every field mirrors an option declared in
 * `builder.ts`.
 */
export interface AdMobOption {
    /** Master switch. When false, no native AdMob code is added to the build at all. */
    enableAdMob?: boolean;

    /** `ca-app-pub-xxxxxxxxxxxxxxxx~yyyyyyyyyy` App ID, Android build only. */
    androidAppId?: string;

    /** `ca-app-pub-xxxxxxxxxxxxxxxx~yyyyyyyyyy` App ID, iOS build only. */
    iosAppId?: string;

    /**
     * When true (the default), the extension forces Google's public test ad
     * unit IDs and ignores whatever unit IDs the game code requests. This
     * keeps a fresh checkout safe to run out of the box; production builds
     * MUST turn this off deliberately.
     */
    useTestAds?: boolean;

    /** Comma-separated list of AdMob test device hashed IDs. */
    testDeviceIds?: string;

    /** Overwrite the native library directory on every build (family convention). */
    overwriteLibrary?: boolean;
}
