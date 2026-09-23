# AdMob extension — iOS pre-build hook.
#
# Nothing needs to run before the Xcode target is configured: the bridge is
# pure ObjC++ (CCEAdMobServiceHub.h/.mm) with no .xib/.storyboard resources
# and no generated headers. This file exists only so Cocos's native project
# generator, which unconditionally includes any Pre-*.cmake it finds next to
# Post-*.cmake, has something valid to include.
