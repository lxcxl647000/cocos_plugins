// CCEAdMobServiceHub.mm
//
// See CCEAdMobServiceHub.h for the design rationale (single hub class,
// mirrors the Android AdMobBridge+AdMobServiceHub pair's method/event
// contract but follows this family's existing iOS convention of one class).
//
// Wire protocol (must match assets/core/Bridge.ts and AdMobBridge.java
// byte-for-byte):
//   JS -> native (request):  {"id": number, "method": string, "args": object}
//   native -> JS (response): {"kind":"response","id":number,"success":bool,"data"?:any,"error"?:{"code":string,"message":string}}
//   native -> JS (event):    {"kind":"event","name":string,"data"?:any}

#import "CCEAdMobServiceHub.h"

#import <GoogleMobileAds/GoogleMobileAds.h>
#import <UserMessagingPlatform/UserMessagingPlatform.h>
#import <UIKit/UIKit.h>
#import <objc/runtime.h>

// Cocos JSB bridge — same header path used by this extension family's other
// iOS hubs (see ShareServiceHub.mm).
#import "platform/apple/JsbBridgeWrapper.h"

static NSString *const kAdMobChannel = @"admob";

// Google's public test ad unit IDs (safe defaults; used whenever the build
// panel's "Use test ads" option is on, or no production ID was configured).
static NSString *const kTestAppId = @"ca-app-pub-3940256099942544~1458002511";
static NSString *const kTestBannerUnitId = @"ca-app-pub-3940256099942544/2435281174";
static NSString *const kTestInterstitialUnitId = @"ca-app-pub-3940256099942544/4411468910";
static NSString *const kTestRewardedUnitId = @"ca-app-pub-3940256099942544/1712485313";
static NSString *const kTestRewardedInterstitialUnitId = @"ca-app-pub-3940256099942544/6978759866";
static NSString *const kTestAppOpenUnitId = @"ca-app-pub-3940256099942544/5662855259";
static NSString *const kTestNativeUnitId = @"ca-app-pub-3940256099942544/3986624511";

@interface CCEAdMobServiceHub () <GADFullScreenContentDelegate, GADBannerViewDelegate, GADNativeAdLoaderDelegate, GADNativeAdDelegate>
@property(nonatomic, strong) GADInterstitialAd *interstitialAd;
@property(nonatomic, strong) GADRewardedAd *rewardedAd;
@property(nonatomic, strong) GADRewardedInterstitialAd *rewardedInterstitialAd;
@property(nonatomic, strong) GADAppOpenAd *appOpenAd;
@property(nonatomic, strong) GADBannerView *bannerView;
@property(nonatomic, strong) UIView *bannerContainer;
@property(nonatomic, strong) NSString *bannerPosition;

@property(nonatomic, strong) GADAdLoader *nativeAdLoader;
@property(nonatomic, strong) GADNativeAd *nativeAd;
@property(nonatomic, strong) GADNativeAdView *nativeAdView;
@property(nonatomic, strong) UIView *nativeAdContainer;
@property(nonatomic, strong) NSString *nativePosition;
@property(nonatomic, assign) CGFloat nativeWidth;
@property(nonatomic, assign) CGFloat nativeHeight;
@property(nonatomic, assign) NSInteger nativeLoadRequestId;

// Pending JS request ids for the in-flight show() call of each full-screen
// format, so the shared GADFullScreenContentDelegate callbacks know which
// promise to resolve/reject.
@property(nonatomic, assign) NSInteger interstitialShowId;
@property(nonatomic, assign) NSInteger rewardedShowId;
@property(nonatomic, assign) NSInteger rewardedInterstitialShowId;
@property(nonatomic, assign) NSInteger appOpenShowId;
@property(nonatomic, strong) GADAdReward *pendingRewardedReward;
@property(nonatomic, strong) GADAdReward *pendingRewardedInterstitialReward;

@property(nonatomic, assign) BOOL useTestAds;
@property(nonatomic, copy) NSArray<NSString *> *testDeviceIdentifiers;
@property(nonatomic, assign) BOOL initialized;
@end

@implementation CCEAdMobServiceHub

+ (instancetype)sharedInstance {
    static CCEAdMobServiceHub *instance = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        instance = [[CCEAdMobServiceHub alloc] init];
    });
    return instance;
}

- (instancetype)init {
    self = [super init];
    if (self) {
        _useTestAds = YES;
        _testDeviceIdentifiers = @[];
        _interstitialShowId = -1;
        _rewardedShowId = -1;
        _rewardedInterstitialShowId = -1;
        _appOpenShowId = -1;
        _nativeLoadRequestId = -1;
    }
    return self;
}

- (void)initAdMobService {
    if (self.initialized) { return; }
    self.initialized = YES;

    // JsbBridgeWrapper's listener block type is OnScriptEventListener =
    // void (^)(NSString *payload) (verified against ShareServiceHub.mm, the
    // established precedent in this extension family). JsbBridgeWrapper does
    // not retain the block strongly, so — mirroring ShareServiceHub.mm's
    // documented fix for a real use-after-free bug found in this family's
    // history — we keep a strong `static` reference to it for the process
    // lifetime, and capture `self` weakly inside it.
    __weak typeof(self) weakSelf = self;
    static OnScriptEventListener sAdMobListener = nil;
    sAdMobListener = ^(NSString *payload) {
        [weakSelf handleIncomingMessage:payload];
    };
    [[JsbBridgeWrapper sharedInstance] addScriptEventListener:kAdMobChannel listener:sAdMobListener];

    // These are also read from Info.plist by BuildTaskiOS.ts (GADApplicationIdentifier),
    // but "use test ads"/"test device IDs" are runtime-only on iOS: they are
    // passed at `initialize()` call time from JS (see AdMobClient.ts's
    // InitializeOptions), mirroring the *default* of the Android build-panel
    // options but always overridable per launch.
}

#pragma mark - Wire protocol

- (void)handleIncomingMessage:(NSString *)message {
    NSError *error = nil;
    NSData *data = [message dataUsingEncoding:NSUTF8StringEncoding];
    NSDictionary *json = [NSJSONSerialization JSONObjectWithData:data options:0 error:&error];
    if (error != nil || ![json isKindOfClass:[NSDictionary class]]) {
        return;
    }
    NSInteger requestId = [json[@"id"] integerValue];
    NSString *method = json[@"method"];
    NSDictionary *args = [json[@"args"] isKindOfClass:[NSDictionary class]] ? json[@"args"] : @{};
    if (method == nil) {
        return;
    }

    dispatch_async(dispatch_get_main_queue(), ^{
        @try {
            [self dispatchMethod:method requestId:requestId args:args];
        } @catch (NSException *exception) {
            [self respondErr:requestId code:@"E_INTERNAL" message:exception.reason ?: @"Unknown native error"];
        }
    });
}

- (void)dispatchMethod:(NSString *)method requestId:(NSInteger)requestId args:(NSDictionary *)args {
    if ([method isEqualToString:@"initialize"]) { [self handleInitialize:requestId args:args]; return; }

    if ([method isEqualToString:@"banner.load"]) { [self handleBannerLoad:requestId args:args]; return; }
    if ([method isEqualToString:@"banner.show"]) { [self handleBannerShow:requestId]; return; }
    if ([method isEqualToString:@"banner.hide"]) { [self handleBannerHide:requestId]; return; }
    if ([method isEqualToString:@"banner.destroy"]) { [self handleBannerDestroy:requestId]; return; }

    if ([method isEqualToString:@"interstitial.load"]) { [self handleInterstitialLoad:requestId args:args]; return; }
    if ([method isEqualToString:@"interstitial.isReady"]) { [self respondOk:requestId data:@(self.interstitialAd != nil)]; return; }
    if ([method isEqualToString:@"interstitial.show"]) { [self handleInterstitialShow:requestId]; return; }

    if ([method isEqualToString:@"rewarded.load"]) { [self handleRewardedLoad:requestId args:args]; return; }
    if ([method isEqualToString:@"rewarded.isReady"]) { [self respondOk:requestId data:@(self.rewardedAd != nil)]; return; }
    if ([method isEqualToString:@"rewarded.show"]) { [self handleRewardedShow:requestId]; return; }

    if ([method isEqualToString:@"rewardedInterstitial.load"]) { [self handleRewardedInterstitialLoad:requestId args:args]; return; }
    if ([method isEqualToString:@"rewardedInterstitial.isReady"]) { [self respondOk:requestId data:@(self.rewardedInterstitialAd != nil)]; return; }
    if ([method isEqualToString:@"rewardedInterstitial.show"]) { [self handleRewardedInterstitialShow:requestId]; return; }

    if ([method isEqualToString:@"appOpen.load"]) { [self handleAppOpenLoad:requestId args:args]; return; }
    if ([method isEqualToString:@"appOpen.isReady"]) { [self respondOk:requestId data:@(self.appOpenAd != nil)]; return; }
    if ([method isEqualToString:@"appOpen.show"]) { [self handleAppOpenShow:requestId]; return; }

    if ([method isEqualToString:@"native.load"]) { [self handleNativeLoad:requestId args:args]; return; }
    if ([method isEqualToString:@"native.show"]) { [self handleNativeShow:requestId]; return; }
    if ([method isEqualToString:@"native.hide"]) { [self handleNativeHide:requestId]; return; }
    if ([method isEqualToString:@"native.destroy"]) { [self handleNativeDestroy:requestId]; return; }

    if ([method isEqualToString:@"consent.request"]) { [self handleConsentRequest:requestId]; return; }
    if ([method isEqualToString:@"consent.showFormIfRequired"]) { [self handleConsentShowFormIfRequired:requestId]; return; }
    if ([method isEqualToString:@"consent.canRequestAds"]) {
        [self respondOk:requestId data:@([UMPConsentInformation sharedInstance].canRequestAds)];
        return;
    }
    if ([method isEqualToString:@"consent.reset"]) {
        [[UMPConsentInformation sharedInstance] reset];
        [self respondOk:requestId data:nil];
        return;
    }

    [self respondErr:requestId code:@"E_UNKNOWN_METHOD" message:[NSString stringWithFormat:@"Unknown AdMob bridge method: %@", method]];
}

- (void)sendJson:(NSDictionary *)envelope {
    NSError *error = nil;
    NSData *data = [NSJSONSerialization dataWithJSONObject:envelope options:0 error:&error];
    if (error != nil) {
        return;
    }
    NSString *json = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
    dispatch_async(dispatch_get_main_queue(), ^{
        [[JsbBridgeWrapper sharedInstance] dispatchEventToScript:kAdMobChannel arg:json];
    });
}

- (void)respondOk:(NSInteger)requestId data:(nullable id)data {
    if (requestId < 0) return;
    NSMutableDictionary *envelope = [@{@"kind": @"response", @"id": @(requestId), @"success": @YES} mutableCopy];
    if (data != nil) {
        envelope[@"data"] = data;
    }
    [self sendJson:envelope];
}

- (void)respondErr:(NSInteger)requestId code:(NSString *)code message:(NSString *)message {
    if (requestId < 0) return;
    [self sendJson:@{
        @"kind": @"response",
        @"id": @(requestId),
        @"success": @NO,
        @"error": @{@"code": code, @"message": message ?: @""},
    }];
}

- (void)sendEvent:(NSString *)name data:(nullable id)data {
    NSMutableDictionary *envelope = [@{@"kind": @"event", @"name": name} mutableCopy];
    if (data != nil) {
        envelope[@"data"] = data;
    }
    [self sendJson:envelope];
}

#pragma mark - Helpers

- (nullable UIViewController *)rootViewController {
    UIWindow *keyWindow = nil;
    if (@available(iOS 13.0, *)) {
        for (UIScene *scene in UIApplication.sharedApplication.connectedScenes) {
            if ([scene isKindOfClass:[UIWindowScene class]] && scene.activationState == UISceneActivationStateForegroundActive) {
                for (UIWindow *window in ((UIWindowScene *)scene).windows) {
                    if (window.isKeyWindow) {
                        keyWindow = window;
                        break;
                    }
                }
            }
        }
    }
    if (keyWindow == nil) {
        keyWindow = UIApplication.sharedApplication.keyWindow;
    }
    return keyWindow.rootViewController;
}

- (GADRequest *)buildRequest {
    return [GADRequest request];
}

#pragma mark - initialize

- (void)handleInitialize:(NSInteger)requestId args:(NSDictionary *)args {
    NSArray *testDeviceIds = [args[@"testDeviceIds"] isKindOfClass:[NSArray class]] ? args[@"testDeviceIds"] : @[];
    self.testDeviceIdentifiers = testDeviceIds;

    GADMobileAdsRequestConfiguration *config = GADMobileAds.sharedInstance.requestConfiguration;
    if (testDeviceIds.count > 0) {
        [config setTestDeviceIdentifiers:testDeviceIds];
    }

    [GADMobileAds.sharedInstance startWithCompletionHandler:^(GADInitializationStatus *status) {
        [self respondOk:requestId data:nil];
    }];
}

#pragma mark - Banner

- (void)handleBannerLoad:(NSInteger)requestId args:(NSDictionary *)args {
    UIViewController *rootVC = [self rootViewController];
    if (rootVC == nil) {
        [self respondErr:requestId code:@"E_NO_ACTIVITY" message:@"No root view controller available to attach the banner to."];
        return;
    }
    [self destroyBannerInternal];

    NSString *adUnitId = self.useTestAds ? kTestBannerUnitId : (args[@"adUnitId"] ?: kTestBannerUnitId);
    self.bannerPosition = args[@"position"] ?: @"bottom";

    CGFloat viewWidth = rootVC.view.frame.size.width;
    // GADCurrentOrientationAnchoredAdaptiveBannerAdSizeWithWidth is deprecated as of GMA iOS
    // SDK 13.x in favor of GADLargeAnchoredAdaptiveBannerAdSizeWithWidth (verified against the
    // real GoogleMobileAds.xcframework headers fetched by scripts/fetch-admob-ios-sdk.sh).
    GADAdSize adSize = GADLargeAnchoredAdaptiveBannerAdSizeWithWidth(viewWidth);

    GADBannerView *bannerView = [[GADBannerView alloc] initWithAdSize:adSize];
    bannerView.adUnitID = adUnitId;
    bannerView.rootViewController = rootVC;
    bannerView.delegate = self;
    self.bannerView = bannerView;

    UIView *container = [[UIView alloc] initWithFrame:CGRectZero];
    container.hidden = YES;
    self.bannerContainer = container;
    [rootVC.view addSubview:container];
    [container addSubview:bannerView];
    [self layoutBannerContainer];

    objc_setAssociatedObject(bannerView, @selector(handleBannerLoad:args:), @(requestId), OBJC_ASSOCIATION_RETAIN);
    [bannerView loadRequest:[self buildRequest]];
}

- (void)layoutBannerContainer {
    UIViewController *rootVC = [self rootViewController];
    if (rootVC == nil || self.bannerContainer == nil || self.bannerView == nil) return;
    // GADAdSize is documented as opaque — use CGSizeFromGADAdSize() rather than
    // reaching into the struct directly.
    CGSize adSize = CGSizeFromGADAdSize(self.bannerView.adSize);
    CGFloat width = rootVC.view.frame.size.width;
    CGFloat y = [self.bannerPosition isEqualToString:@"top"] ? 0 : (rootVC.view.frame.size.height - adSize.height);
    self.bannerContainer.frame = CGRectMake(0, y, width, adSize.height);
    self.bannerView.frame = CGRectMake(0, 0, width, adSize.height);
}

- (void)handleBannerShow:(NSInteger)requestId {
    if (self.bannerContainer == nil) {
        [self respondErr:requestId code:@"E_NOT_LOADED" message:@"Call banner.load() before banner.show()."];
        return;
    }
    self.bannerContainer.hidden = NO;
    [self respondOk:requestId data:nil];
}

- (void)handleBannerHide:(NSInteger)requestId {
    self.bannerContainer.hidden = YES;
    [self respondOk:requestId data:nil];
}

- (void)handleBannerDestroy:(NSInteger)requestId {
    [self destroyBannerInternal];
    [self respondOk:requestId data:nil];
}

- (void)destroyBannerInternal {
    [self.bannerView removeFromSuperview];
    [self.bannerContainer removeFromSuperview];
    self.bannerView = nil;
    self.bannerContainer = nil;
}

#pragma mark GADBannerViewDelegate

- (void)bannerViewDidReceiveAd:(GADBannerView *)bannerView {
    NSNumber *requestId = objc_getAssociatedObject(bannerView, @selector(handleBannerLoad:args:));
    [self layoutBannerContainer];
    [self respondOk:requestId.integerValue data:nil];
    [self sendEvent:@"banner.loaded" data:nil];
}

- (void)bannerView:(GADBannerView *)bannerView didFailToReceiveAdWithError:(NSError *)error {
    NSNumber *requestId = objc_getAssociatedObject(bannerView, @selector(handleBannerLoad:args:));
    [self respondErr:requestId.integerValue code:@"E_LOAD_FAILED" message:error.localizedDescription];
    [self sendEvent:@"banner.failedToLoad" data:@{@"code": @(error.code).stringValue, @"message": error.localizedDescription ?: @""}];
}

- (void)bannerViewWillPresentScreen:(GADBannerView *)bannerView {
    [self sendEvent:@"banner.opened" data:nil];
}

- (void)bannerViewDidDismissScreen:(GADBannerView *)bannerView {
    [self sendEvent:@"banner.closed" data:nil];
}

#pragma mark - Interstitial

- (void)handleInterstitialLoad:(NSInteger)requestId args:(NSDictionary *)args {
    NSString *adUnitId = self.useTestAds ? kTestInterstitialUnitId : (args[@"adUnitId"] ?: kTestInterstitialUnitId);
    [GADInterstitialAd loadWithAdUnitID:adUnitId
                                 request:[self buildRequest]
                       completionHandler:^(GADInterstitialAd *ad, NSError *error) {
        if (error != nil) {
            self.interstitialAd = nil;
            [self respondErr:requestId code:@"E_LOAD_FAILED" message:error.localizedDescription];
            [self sendEvent:@"interstitial.failedToLoad" data:@{@"code": @(error.code).stringValue, @"message": error.localizedDescription ?: @""}];
            return;
        }
        ad.fullScreenContentDelegate = self;
        self.interstitialAd = ad;
        [self respondOk:requestId data:nil];
        [self sendEvent:@"interstitial.loaded" data:nil];
    }];
}

- (void)handleInterstitialShow:(NSInteger)requestId {
    if (self.interstitialAd == nil) {
        [self respondErr:requestId code:@"E_NOT_READY" message:@"Call interstitial.load() and wait for it to resolve before show()."];
        return;
    }
    UIViewController *rootVC = [self rootViewController];
    if (rootVC == nil) {
        [self respondErr:requestId code:@"E_NO_ACTIVITY" message:@"No root view controller available to show the interstitial."];
        return;
    }
    self.interstitialShowId = requestId;
    [self.interstitialAd presentFromRootViewController:rootVC];
}

#pragma mark - Rewarded

- (void)handleRewardedLoad:(NSInteger)requestId args:(NSDictionary *)args {
    NSString *adUnitId = self.useTestAds ? kTestRewardedUnitId : (args[@"adUnitId"] ?: kTestRewardedUnitId);
    [GADRewardedAd loadWithAdUnitID:adUnitId
                             request:[self buildRequest]
                   completionHandler:^(GADRewardedAd *ad, NSError *error) {
        if (error != nil) {
            self.rewardedAd = nil;
            [self respondErr:requestId code:@"E_LOAD_FAILED" message:error.localizedDescription];
            [self sendEvent:@"rewarded.failedToLoad" data:@{@"code": @(error.code).stringValue, @"message": error.localizedDescription ?: @""}];
            return;
        }
        ad.fullScreenContentDelegate = self;
        self.rewardedAd = ad;
        [self respondOk:requestId data:nil];
        [self sendEvent:@"rewarded.loaded" data:nil];
    }];
}

- (void)handleRewardedShow:(NSInteger)requestId {
    if (self.rewardedAd == nil) {
        [self respondErr:requestId code:@"E_NOT_READY" message:@"Call rewarded.load() and wait for it to resolve before show()."];
        return;
    }
    UIViewController *rootVC = [self rootViewController];
    if (rootVC == nil) {
        [self respondErr:requestId code:@"E_NO_ACTIVITY" message:@"No root view controller available to show the rewarded ad."];
        return;
    }
    self.rewardedShowId = requestId;
    self.pendingRewardedReward = nil;
    [self.rewardedAd presentFromRootViewController:rootVC userDidEarnRewardHandler:^{
        GADAdReward *reward = self.rewardedAd.adReward;
        self.pendingRewardedReward = reward;
        [self sendEvent:@"rewarded.earnedReward" data:@{@"type": reward.type ?: @"", @"amount": reward.amount ?: @0}];
    }];
}

#pragma mark - Rewarded interstitial

- (void)handleRewardedInterstitialLoad:(NSInteger)requestId args:(NSDictionary *)args {
    NSString *adUnitId = self.useTestAds ? kTestRewardedInterstitialUnitId : (args[@"adUnitId"] ?: kTestRewardedInterstitialUnitId);
    [GADRewardedInterstitialAd loadWithAdUnitID:adUnitId
                                         request:[self buildRequest]
                               completionHandler:^(GADRewardedInterstitialAd *ad, NSError *error) {
        if (error != nil) {
            self.rewardedInterstitialAd = nil;
            [self respondErr:requestId code:@"E_LOAD_FAILED" message:error.localizedDescription];
            [self sendEvent:@"rewardedInterstitial.failedToLoad" data:@{@"code": @(error.code).stringValue, @"message": error.localizedDescription ?: @""}];
            return;
        }
        ad.fullScreenContentDelegate = self;
        self.rewardedInterstitialAd = ad;
        [self respondOk:requestId data:nil];
        [self sendEvent:@"rewardedInterstitial.loaded" data:nil];
    }];
}

- (void)handleRewardedInterstitialShow:(NSInteger)requestId {
    if (self.rewardedInterstitialAd == nil) {
        [self respondErr:requestId code:@"E_NOT_READY" message:@"Call rewardedInterstitial.load() and wait for it to resolve before show()."];
        return;
    }
    UIViewController *rootVC = [self rootViewController];
    if (rootVC == nil) {
        [self respondErr:requestId code:@"E_NO_ACTIVITY" message:@"No root view controller available to show the rewarded interstitial ad."];
        return;
    }
    self.rewardedInterstitialShowId = requestId;
    self.pendingRewardedInterstitialReward = nil;
    [self.rewardedInterstitialAd presentFromRootViewController:rootVC userDidEarnRewardHandler:^{
        GADAdReward *reward = self.rewardedInterstitialAd.adReward;
        self.pendingRewardedInterstitialReward = reward;
        [self sendEvent:@"rewardedInterstitial.earnedReward" data:@{@"type": reward.type ?: @"", @"amount": reward.amount ?: @0}];
    }];
}

#pragma mark - App open

- (void)handleAppOpenLoad:(NSInteger)requestId args:(NSDictionary *)args {
    NSString *adUnitId = self.useTestAds ? kTestAppOpenUnitId : (args[@"adUnitId"] ?: kTestAppOpenUnitId);
    [GADAppOpenAd loadWithAdUnitID:adUnitId
                            request:[self buildRequest]
                  completionHandler:^(GADAppOpenAd *ad, NSError *error) {
        if (error != nil) {
            self.appOpenAd = nil;
            [self respondErr:requestId code:@"E_LOAD_FAILED" message:error.localizedDescription];
            [self sendEvent:@"appOpen.failedToLoad" data:@{@"code": @(error.code).stringValue, @"message": error.localizedDescription ?: @""}];
            return;
        }
        ad.fullScreenContentDelegate = self;
        self.appOpenAd = ad;
        [self respondOk:requestId data:nil];
        [self sendEvent:@"appOpen.loaded" data:nil];
    }];
}

- (void)handleAppOpenShow:(NSInteger)requestId {
    if (self.appOpenAd == nil) {
        [self respondErr:requestId code:@"E_NOT_READY" message:@"Call appOpen.load() and wait for it to resolve before show()."];
        return;
    }
    UIViewController *rootVC = [self rootViewController];
    if (rootVC == nil) {
        [self respondErr:requestId code:@"E_NO_ACTIVITY" message:@"No root view controller available to show the app open ad."];
        return;
    }
    self.appOpenShowId = requestId;
    [self.appOpenAd presentFromRootViewController:rootVC];
}

#pragma mark - Native

// Unlike the full-screen formats above, a native ad is a persistent view
// (load -> show -> hide -> destroy), like the banner. It is rendered from
// ad-supplied assets into a GADNativeAdView built entirely in code here (no
// nib/xib), following this project's own hand-written template — not any
// third-party sample layout (see ADMOB-CLEANROOM-SPEC.md §2).
//
// Two Google policy requirements this section must satisfy:
//   - The "Ad" attribution badge is built by hand below; Google does not
//     auto-generate it.
//   - The AdChoices overlay IS auto-added by the SDK on top of the
//     GADNativeAdView as long as `adChoicesView` is never set here, so this
//     code deliberately leaves that property untouched.
//   - Every asset view actually used must be registered on the
//     GADNativeAdView and `nativeAd` must be assigned last, or
//     impressions/clicks are not counted.

- (void)handleNativeLoad:(NSInteger)requestId args:(NSDictionary *)args {
    UIViewController *rootVC = [self rootViewController];
    if (rootVC == nil) {
        [self respondErr:requestId code:@"E_NO_ACTIVITY" message:@"No root view controller available to load the native ad."];
        return;
    }
    [self destroyNativeAdInternal];

    NSString *adUnitId = self.useTestAds ? kTestNativeUnitId : (args[@"adUnitId"] ?: kTestNativeUnitId);
    self.nativePosition = args[@"position"] ?: @"bottom";
    self.nativeWidth = [args[@"width"] isKindOfClass:[NSNumber class]] ? [args[@"width"] doubleValue] : 0;
    self.nativeHeight = [args[@"height"] isKindOfClass:[NSNumber class]] ? [args[@"height"] doubleValue] : 0;
    self.nativeLoadRequestId = requestId;

    GADAdLoader *adLoader = [[GADAdLoader alloc] initWithAdUnitID:adUnitId
                                                rootViewController:rootVC
                                                            adTypes:@[ GADAdLoaderAdTypeNative ]
                                                            options:nil];
    adLoader.delegate = self;
    self.nativeAdLoader = adLoader;
    [adLoader loadRequest:[self buildRequest]];
}

- (void)handleNativeShow:(NSInteger)requestId {
    if (self.nativeAdContainer == nil) {
        [self respondErr:requestId code:@"E_NOT_LOADED" message:@"Call native.load() before native.show()."];
        return;
    }
    self.nativeAdContainer.hidden = NO;
    [self respondOk:requestId data:nil];
}

- (void)handleNativeHide:(NSInteger)requestId {
    self.nativeAdContainer.hidden = YES;
    [self respondOk:requestId data:nil];
}

- (void)handleNativeDestroy:(NSInteger)requestId {
    [self destroyNativeAdInternal];
    [self respondOk:requestId data:nil];
}

- (void)destroyNativeAdInternal {
    self.nativeAdLoader = nil;
    self.nativeAd = nil;
    [self.nativeAdView removeFromSuperview];
    self.nativeAdView = nil;
    [self.nativeAdContainer removeFromSuperview];
    self.nativeAdContainer = nil;
}

/**
 * Builds a GADNativeAdView entirely in code (no nib/xib), binds the loaded
 * ad's assets into hand-laid-out subviews, and registers everything with the
 * SDK. Must run on the main thread (guaranteed here: called from
 * `adLoader:didReceiveNativeAd:`, itself dispatched onto the main queue by
 * `handleIncomingMessage:`).
 */
- (void)renderNativeAd:(GADNativeAd *)nativeAd {
    UIViewController *rootVC = [self rootViewController];
    if (rootVC == nil) {
        [self respondErr:self.nativeLoadRequestId code:@"E_NO_ACTIVITY" message:@"No root view controller available to render the native ad."];
        return;
    }

    CGFloat width = self.nativeWidth > 0 ? self.nativeWidth : rootVC.view.frame.size.width;
    CGFloat height = self.nativeHeight > 0 ? self.nativeHeight : 250;
    CGFloat padding = 8;
    CGFloat contentWidth = width - padding * 2;

    GADNativeAdView *adView = [[GADNativeAdView alloc] initWithFrame:CGRectMake(0, 0, width, height)];
    adView.backgroundColor = [UIColor whiteColor];

    UILabel *attribution = [[UILabel alloc] initWithFrame:CGRectMake(padding, padding, 28, 14)];
    attribution.text = @"Ad";
    attribution.font = [UIFont boldSystemFontOfSize:10];
    attribution.textColor = [UIColor whiteColor];
    attribution.backgroundColor = [UIColor orangeColor];
    attribution.textAlignment = NSTextAlignmentCenter;
    [adView addSubview:attribution];

    CGFloat rowY = padding + 14 + 4;
    UIImageView *iconView = [[UIImageView alloc] initWithFrame:CGRectMake(padding, rowY, 40, 40)];
    iconView.contentMode = UIViewContentModeScaleAspectFit;
    [adView addSubview:iconView];
    adView.iconView = iconView;

    UILabel *headlineView = [[UILabel alloc] initWithFrame:CGRectMake(padding + 40 + 8, rowY, contentWidth - 40 - 8, 40)];
    headlineView.font = [UIFont boldSystemFontOfSize:15];
    headlineView.numberOfLines = 2;
    [adView addSubview:headlineView];
    adView.headlineView = headlineView;

    CGFloat ctaHeight = 36;
    CGFloat bodyHeight = 32;
    CGFloat mediaY = rowY + 40 + 6;
    CGFloat mediaHeight = fmax(60, height - mediaY - bodyHeight - ctaHeight - padding * 3);
    GADMediaView *mediaView = [[GADMediaView alloc] initWithFrame:CGRectMake(padding, mediaY, contentWidth, mediaHeight)];
    [adView addSubview:mediaView];
    adView.mediaView = mediaView;

    CGFloat bodyY = mediaY + mediaHeight + 6;
    UILabel *bodyView = [[UILabel alloc] initWithFrame:CGRectMake(padding, bodyY, contentWidth, bodyHeight)];
    bodyView.font = [UIFont systemFontOfSize:13];
    bodyView.textColor = [UIColor darkGrayColor];
    bodyView.numberOfLines = 2;
    [adView addSubview:bodyView];
    adView.bodyView = bodyView;

    CGFloat ctaY = bodyY + bodyHeight + 6;
    UIButton *callToActionView = [UIButton buttonWithType:UIButtonTypeSystem];
    callToActionView.frame = CGRectMake(padding, ctaY, contentWidth, ctaHeight);
    [callToActionView setTitleColor:[UIColor whiteColor] forState:UIControlStateNormal];
    callToActionView.backgroundColor = [UIColor systemBlueColor];
    // Per Google's guidance: the call-to-action view's taps are handled by
    // the GADNativeAdView itself once `nativeAd` is assigned, not by the
    // button's own target/action.
    callToActionView.userInteractionEnabled = NO;
    [adView addSubview:callToActionView];
    adView.callToActionView = callToActionView;

    headlineView.text = nativeAd.headline;

    if (nativeAd.body != nil) {
        bodyView.text = nativeAd.body;
        bodyView.hidden = NO;
    } else {
        bodyView.hidden = YES;
    }

    if (nativeAd.icon != nil) {
        iconView.image = nativeAd.icon.image;
        iconView.hidden = NO;
    } else {
        iconView.hidden = YES;
    }

    mediaView.mediaContent = nativeAd.mediaContent;

    if (nativeAd.callToAction != nil) {
        [callToActionView setTitle:nativeAd.callToAction forState:UIControlStateNormal];
        callToActionView.hidden = NO;
    } else {
        callToActionView.hidden = YES;
    }

    // Google policy: the loaded GADNativeAd must be registered with the view
    // that renders it, or impressions/clicks are not recorded. Must run
    // after every asset view above has been assigned.
    adView.nativeAd = nativeAd;

    self.nativeAdView = adView;

    UIView *container = [[UIView alloc] initWithFrame:CGRectZero];
    container.hidden = YES;
    self.nativeAdContainer = container;
    [rootVC.view addSubview:container];
    [container addSubview:adView];
    [self layoutNativeAdContainer];

    [self respondOk:self.nativeLoadRequestId data:nil];
    [self sendEvent:@"native.loaded" data:nil];
}

- (void)layoutNativeAdContainer {
    UIViewController *rootVC = [self rootViewController];
    if (rootVC == nil || self.nativeAdContainer == nil || self.nativeAdView == nil) return;
    CGFloat width = self.nativeAdView.frame.size.width;
    CGFloat height = self.nativeAdView.frame.size.height;
    CGFloat x = (rootVC.view.frame.size.width - width) / 2;
    CGFloat y;
    if ([self.nativePosition isEqualToString:@"top"]) {
        y = 0;
    } else if ([self.nativePosition isEqualToString:@"center"]) {
        y = (rootVC.view.frame.size.height - height) / 2;
    } else {
        y = rootVC.view.frame.size.height - height;
    }
    self.nativeAdContainer.frame = CGRectMake(x, y, width, height);
    self.nativeAdView.frame = CGRectMake(0, 0, width, height);
}

#pragma mark GADNativeAdLoaderDelegate / GADAdLoaderDelegate (native)

- (void)adLoader:(GADAdLoader *)adLoader didFailToReceiveAdWithError:(NSError *)error {
    [self respondErr:self.nativeLoadRequestId code:@"E_LOAD_FAILED" message:error.localizedDescription];
    [self sendEvent:@"native.failedToLoad" data:@{@"code": @(error.code).stringValue, @"message": error.localizedDescription ?: @""}];
}

- (void)adLoader:(GADAdLoader *)adLoader didReceiveNativeAd:(GADNativeAd *)nativeAd {
    nativeAd.delegate = self;
    self.nativeAd = nativeAd;
    [self renderNativeAd:nativeAd];
}

#pragma mark GADNativeAdDelegate

- (void)nativeAdDidRecordClick:(GADNativeAd *)nativeAd {
    [self sendEvent:@"native.clicked" data:nil];
}

- (void)nativeAdDidRecordImpression:(GADNativeAd *)nativeAd {
    [self sendEvent:@"native.impression" data:nil];
}

- (void)nativeAdWillPresentScreen:(GADNativeAd *)nativeAd {
    [self sendEvent:@"native.opened" data:nil];
}

- (void)nativeAdDidDismissScreen:(GADNativeAd *)nativeAd {
    [self sendEvent:@"native.closed" data:nil];
}

#pragma mark GADFullScreenContentDelegate (shared by interstitial / rewarded / rewardedInterstitial / appOpen)

- (void)adDidRecordImpression:(id<GADFullScreenPresentingAd>)ad {
    if (ad == self.interstitialAd) { [self sendEvent:@"interstitial.showed" data:nil]; }
    else if (ad == self.rewardedAd) { [self sendEvent:@"rewarded.showed" data:nil]; }
    else if (ad == self.rewardedInterstitialAd) { [self sendEvent:@"rewardedInterstitial.showed" data:nil]; }
    else if (ad == self.appOpenAd) { [self sendEvent:@"appOpen.showed" data:nil]; }
}

- (void)ad:(id<GADFullScreenPresentingAd>)ad didFailToPresentFullScreenContentWithError:(NSError *)error {
    NSDictionary *payload = @{@"code": @(error.code).stringValue, @"message": error.localizedDescription ?: @""};
    if (ad == self.interstitialAd) {
        self.interstitialAd = nil;
        [self respondErr:self.interstitialShowId code:@"E_SHOW_FAILED" message:error.localizedDescription];
        [self sendEvent:@"interstitial.failedToShow" data:payload];
    } else if (ad == self.rewardedAd) {
        self.rewardedAd = nil;
        [self respondErr:self.rewardedShowId code:@"E_SHOW_FAILED" message:error.localizedDescription];
        [self sendEvent:@"rewarded.failedToShow" data:payload];
    } else if (ad == self.rewardedInterstitialAd) {
        self.rewardedInterstitialAd = nil;
        [self respondErr:self.rewardedInterstitialShowId code:@"E_SHOW_FAILED" message:error.localizedDescription];
        [self sendEvent:@"rewardedInterstitial.failedToShow" data:payload];
    } else if (ad == self.appOpenAd) {
        self.appOpenAd = nil;
        [self respondErr:self.appOpenShowId code:@"E_SHOW_FAILED" message:error.localizedDescription];
        [self sendEvent:@"appOpen.failedToShow" data:payload];
    }
}

- (void)adDidDismissFullScreenContent:(id<GADFullScreenPresentingAd>)ad {
    if (ad == self.interstitialAd) {
        self.interstitialAd = nil;
        [self respondOk:self.interstitialShowId data:nil];
        [self sendEvent:@"interstitial.dismissed" data:nil];
    } else if (ad == self.rewardedAd) {
        self.rewardedAd = nil;
        [self sendEvent:@"rewarded.dismissed" data:nil];
        if (self.pendingRewardedReward != nil) {
            [self respondOk:self.rewardedShowId data:@{@"type": self.pendingRewardedReward.type ?: @"", @"amount": self.pendingRewardedReward.amount ?: @0}];
        } else {
            [self respondErr:self.rewardedShowId code:@"E_DISMISSED_WITHOUT_REWARD" message:@"User closed the ad before earning a reward."];
        }
    } else if (ad == self.rewardedInterstitialAd) {
        self.rewardedInterstitialAd = nil;
        [self sendEvent:@"rewardedInterstitial.dismissed" data:nil];
        if (self.pendingRewardedInterstitialReward != nil) {
            [self respondOk:self.rewardedInterstitialShowId data:@{@"type": self.pendingRewardedInterstitialReward.type ?: @"", @"amount": self.pendingRewardedInterstitialReward.amount ?: @0}];
        } else {
            [self respondErr:self.rewardedInterstitialShowId code:@"E_DISMISSED_WITHOUT_REWARD" message:@"User closed the ad before earning a reward."];
        }
    } else if (ad == self.appOpenAd) {
        self.appOpenAd = nil;
        [self respondOk:self.appOpenShowId data:nil];
        [self sendEvent:@"appOpen.dismissed" data:nil];
    }
}

#pragma mark - Consent (UMP)

- (void)handleConsentRequest:(NSInteger)requestId {
    UMPRequestParameters *params = [[UMPRequestParameters alloc] init];
    params.tagForUnderAgeOfConsent = NO;

    if (self.useTestAds) {
        UMPDebugSettings *debugSettings = [[UMPDebugSettings alloc] init];
        debugSettings.geography = UMPDebugGeographyEEA;
        params.debugSettings = debugSettings;
    }

    [[UMPConsentInformation sharedInstance] requestConsentInfoUpdateWithParameters:params
                                                                   completionHandler:^(NSError *error) {
        if (error != nil) {
            [self respondErr:requestId code:@"E_CONSENT_UPDATE_FAILED" message:error.localizedDescription];
            return;
        }
        [self sendEvent:@"consent.infoUpdated" data:[self consentInfoPayload]];
        [self respondOk:requestId data:[self consentInfoPayload]];
    }];
}

- (void)handleConsentShowFormIfRequired:(NSInteger)requestId {
    UIViewController *rootVC = [self rootViewController];
    if (rootVC == nil) {
        [self respondErr:requestId code:@"E_NO_ACTIVITY" message:@"No root view controller available to show the consent form."];
        return;
    }
    [UMPConsentForm loadAndPresentIfRequiredFromViewController:rootVC completionHandler:^(NSError *error) {
        if (error != nil) {
            [self respondErr:requestId code:@"E_CONSENT_FORM_FAILED" message:error.localizedDescription];
            return;
        }
        [self sendEvent:@"consent.formDismissed" data:nil];
        [self respondOk:requestId data:[self consentInfoPayload]];
    }];
}

- (NSDictionary *)consentInfoPayload {
    UMPConsentInformation *info = [UMPConsentInformation sharedInstance];
    NSString *statusName;
    switch (info.consentStatus) {
        case UMPConsentStatusRequired: statusName = @"REQUIRED"; break;
        case UMPConsentStatusNotRequired: statusName = @"NOT_REQUIRED"; break;
        case UMPConsentStatusObtained: statusName = @"OBTAINED"; break;
        case UMPConsentStatusUnknown:
        default: statusName = @"UNKNOWN"; break;
    }
    return @{
        @"status": statusName,
        @"isConsentFormAvailable": @(info.formStatus == UMPFormStatusAvailable),
        @"canRequestAds": @(info.canRequestAds),
    };
}

@end
