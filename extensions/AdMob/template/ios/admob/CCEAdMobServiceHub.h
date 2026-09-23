// CCEAdMobServiceHub.h
//
// Owns the Google Mobile Ads SDK lifecycle on iOS and bridges it to JS via
// JsbBridgeWrapper (the "admob" event channel). This is the iOS mirror of
// AdMobBridge.java + AdMobServiceHub.java on Android; both platforms must
// expose the identical set of bridge method names and event payload shapes
// (see assets/Types.ts).
//
// Class prefix: "CCE" (Cocos Community Extension) — deliberately NOT "GAD"
// (Google's own prefix) or "AdService" (the naming used by an earlier,
// unrelated AdMob integration plan for this codebase). This avoids ObjC
// namespace collisions if a project ever has both this extension and
// Cocos's own official AdMob extension installed side by side.
//
// Unlike the Android side (which splits wire-protocol marshalling into
// AdMobBridge and SDK ownership into AdMobServiceHub), this file follows the
// established convention already used elsewhere in this extension family on
// iOS (see ShareServiceHub.h/.mm): a single hub class owns both the
// JsbBridgeWrapper registration and the SDK lifecycle. Per-ad-format logic
// lives in private methods/categories inside the .mm, grouped with #pragma
// mark sections, rather than as separate classes — Objective-C's lack of a
// lightweight "package-private" file convention makes splitting one class
// per ad format into public headers more overhead than benefit here.

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface CCEAdMobServiceHub : NSObject

+ (instancetype)sharedInstance;

/// Registers the "admob" JsbBridgeWrapper channel. Call once, as early as
/// possible (from AppDelegate's didFinishLaunchingWithOptions:).
- (void)initAdMobService;

@end

NS_ASSUME_NONNULL_END
