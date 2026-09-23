# AdMob extension — iOS post-build hook.
#
# BuildTaskiOS.ts copies this file to native/engine/ios/Post-admob.cmake and
# the whole admob/ payload (headers, .mm sources, xcframeworks) alongside it
# at native/engine/ios/admob/. CMAKE_CURRENT_LIST_DIR at inclusion time is
# therefore native/engine/ios/, so the payload's own admob.cmake lives at
# ${CMAKE_CURRENT_LIST_DIR}/admob/admob.cmake.
if(EXISTS ${CMAKE_CURRENT_LIST_DIR}/admob/admob.cmake)
    include(${CMAKE_CURRENT_LIST_DIR}/admob/admob.cmake)
endif()
