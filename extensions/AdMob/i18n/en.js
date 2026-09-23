module.exports = {
    title: 'AdMob',
    description: 'Google AdMob (Google Mobile Ads SDK) integration: banner, interstitial, rewarded, rewarded interstitial, app open, native ads, and UMP consent.',
    enableAdMob: {
        title: 'Enable AdMob',
        tip: 'Master switch. When off, no AdMob native code is added to the build.',
    },
    androidAppId: {
        title: 'Android App ID',
        tip: 'Your AdMob Android App ID, in the form "ca-app-pub-xxxxxxxxxxxxxxxx~yyyyyyyyyy". Leave blank to use Google\'s public test App ID.',
    },
    iosAppId: {
        title: 'iOS App ID',
        tip: 'Your AdMob iOS App ID, in the form "ca-app-pub-xxxxxxxxxxxxxxxx~yyyyyyyyyy". Leave blank to use Google\'s public test App ID.',
    },
    useTestAds: {
        title: 'Use test ads',
        tip: 'Force Google\'s public test ad unit IDs and register this device as a test device. Keep this ON until your app is ready for release — clicking your own live ads can get your AdMob account suspended.',
    },
    testDeviceIds: {
        title: 'Test device IDs',
        tip: 'Comma-separated list of AdMob test device hashed IDs, used when "Use test ads" is off but you still want to see test ads on your own device(s).',
    },
    overwriteLibrary: {
        title: 'Overwrite native library',
        tip: 'Overwrite the native AdMob library folder on every build. Turn off only if you intend to hand-edit the copied native files.',
    },
};
