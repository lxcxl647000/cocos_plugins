# AdMob extension — iOS CMake build rules.
#
# Builds CCEAdMobServiceHub.mm/.h as a static library ("admob"), links the
# two vendored Google SDK .xcframework bundles (fetched by
# scripts/fetch-admob-ios-sdk.sh — NOT committed to this repo, see
# THIRD_PARTY_NOTICES.md), links the system frameworks/libraries the Google
# Mobile Ads SDK and UMP SDK podspecs declare, and wires everything into the
# final app executable.
#
# Minimum iOS deployment target: 12.0 (verified against the official
# Google-Mobile-Ads-SDK 13.7.0 / GoogleUserMessagingPlatform 3.1.0 CocoaPods
# podspecs' "platforms" field). The Cocos project's
# CMAKE_OSX_DEPLOYMENT_TARGET should be >= 12.0.

set(ADMOB_XCFRAMEWORK_DIR ${CMAKE_CURRENT_LIST_DIR})
set(ADMOB_GMA_XCFRAMEWORK ${ADMOB_XCFRAMEWORK_DIR}/GoogleMobileAds.xcframework)
set(ADMOB_UMP_XCFRAMEWORK ${ADMOB_XCFRAMEWORK_DIR}/UserMessagingPlatform.xcframework)

if(NOT EXISTS ${ADMOB_GMA_XCFRAMEWORK} OR NOT EXISTS ${ADMOB_UMP_XCFRAMEWORK})
    message(FATAL_ERROR
        "[admob] Missing GoogleMobileAds.xcframework and/or UserMessagingPlatform.xcframework "
        "under ${ADMOB_XCFRAMEWORK_DIR}. Run "
        "'extensions/AdMob/scripts/fetch-admob-ios-sdk.sh' before building for iOS.")
endif()

# ---------------------------------------------------------------------------
# 1. Collect the ObjC++ bridge sources
# ---------------------------------------------------------------------------

set(ADMOB_PROJ_SOURCES
    ${CMAKE_CURRENT_LIST_DIR}/CCEAdMobServiceHub.h
    ${CMAKE_CURRENT_LIST_DIR}/CCEAdMobServiceHub.mm
)

source_group(TREE ${CMAKE_CURRENT_LIST_DIR} PREFIX "Source Files" FILES ${ADMOB_PROJ_SOURCES})

# Enable ARC on every source file (this extension family's established
# per-file approach — see cocos-share's share.cmake).
foreach(file ${ADMOB_PROJ_SOURCES})
    set_source_files_properties(${file} PROPERTIES COMPILE_OPTIONS "-fobjc-arc")
endforeach()

# ---------------------------------------------------------------------------
# 2. Build the bridge as a static library
# ---------------------------------------------------------------------------

add_library(admob ${ADMOB_PROJ_SOURCES})

target_include_directories(admob PRIVATE ${CMAKE_CURRENT_LIST_DIR})

# Framework header search paths for both xcframework slices, so
# `#import <GoogleMobileAds/GoogleMobileAds.h>` and
# `#import <UserMessagingPlatform/UserMessagingPlatform.h>` resolve
# regardless of which slice the active build targets (device vs
# simulator). Harmless to list both — only the slice matching the active
# SDK is actually compiled against.
target_compile_options(admob PRIVATE
    "-F${ADMOB_GMA_XCFRAMEWORK}/ios-arm64"
    "-F${ADMOB_GMA_XCFRAMEWORK}/ios-arm64_x86_64-simulator"
    "-F${ADMOB_UMP_XCFRAMEWORK}/ios-arm64"
    "-F${ADMOB_UMP_XCFRAMEWORK}/ios-arm64_x86_64-simulator"
)

# Link the xcframeworks by path directly. When CMake generates an Xcode
# project (the standard Cocos native iOS toolchain), passing an .xcframework
# path straight to target_link_libraries adds it as a "Link Binary With
# Libraries" entry and Xcode itself resolves the correct per-arch slice at
# its own build time — no manual per-slice glob/substitution needed.
target_link_libraries(admob ${ADMOB_GMA_XCFRAMEWORK})
target_link_libraries(admob ${ADMOB_UMP_XCFRAMEWORK})

# ---------------------------------------------------------------------------
# 3. System frameworks/libraries required by the Google Mobile Ads SDK and
#    the User Messaging Platform SDK.
#
#    Source: the official CocoaPods trunk podspecs for
#    Google-Mobile-Ads-SDK 13.7.0 and GoogleUserMessagingPlatform 3.1.0
#    ("frameworks" / "weak_frameworks" / "libraries" fields), fetched and
#    checked directly against those podspecs — not guessed.
# ---------------------------------------------------------------------------

set(ADMOB_LINKED_FRAMEWORKS
    # Google Mobile Ads SDK
    AudioToolbox AVFoundation CFNetwork CoreGraphics CoreMedia CoreTelephony
    CoreVideo JavaScriptCore MediaPlayer MessageUI MobileCoreServices Network
    QuartzCore Security StoreKit SystemConfiguration
    AdSupport SafariServices WebKit
    # User Messaging Platform SDK (WebKit/AdSupport already listed above)
)

foreach(_fw ${ADMOB_LINKED_FRAMEWORKS})
    target_link_libraries(admob "-framework ${_fw}")
endforeach()

target_link_libraries(admob "-lz" "-lsqlite3")

# ---------------------------------------------------------------------------
# 4. Link engine and wire admob into the final executable
# ---------------------------------------------------------------------------

target_link_libraries(admob ${ENGINE_NAME})
target_include_directories(${EXECUTABLE_NAME} PUBLIC ${CMAKE_CURRENT_LIST_DIR})
target_link_libraries(${EXECUTABLE_NAME} admob)

# Force-load: both the Google SDKs and this bridge lib are static archives.
# Without -ObjC, categories/classes not directly referenced by name from
# other translation units are stripped by the linker.
target_link_options(${EXECUTABLE_NAME} PRIVATE -ObjC)
