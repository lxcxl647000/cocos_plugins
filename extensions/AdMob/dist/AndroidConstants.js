"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AndroidConstants = void 0;
const path_1 = require("path");
/**
 * Centralized path constants for the Android build task. Keeping every path
 * in one place makes `BuildTaskAndroid.ts` easy to audit and keeps the
 * idempotent-patch helpers in `Util.ts` honest about what they touch.
 */
class AndroidConstants {
    /** Destination: the native Android project inside the user's Creator project. */
    static get ProjectNativeAndroidDir() {
        return (0, path_1.join)(Editor.Project.path, 'native', 'engine', 'android');
    }
    static get ProjectRootBuildGradle() {
        return (0, path_1.join)(AndroidConstants.ProjectNativeAndroidDir, 'build.gradle');
    }
    /** settings.gradle in the native Android project directory. */
    static get ProjectSettingsGradle() {
        return (0, path_1.join)(AndroidConstants.ProjectNativeAndroidDir, 'settings.gradle');
    }
    /**
     * settings.gradle in the Cocos-generated build output directory.
     * Cocos Creator generates this file during the build pipeline, so it lives
     * under `build/android/proj/` rather than in the template directory.
     */
    static get ProjectBuildSettingsGradle() {
        return (0, path_1.join)(Editor.Project.path, 'build', 'android', 'proj', 'settings.gradle');
    }
    static get ProjectAppBuildGradle() {
        return (0, path_1.join)(AndroidConstants.ProjectNativeAndroidDir, 'app', 'build.gradle');
    }
    static get ProjectAppManifest() {
        return (0, path_1.join)(AndroidConstants.ProjectNativeAndroidDir, 'app', 'AndroidManifest.xml');
    }
    static get ProjectLibAdMobDir() {
        return (0, path_1.join)(AndroidConstants.ProjectNativeAndroidDir, 'libadmob');
    }
    /**
     * gradle.properties in the Cocos-generated build output directory.
     * Cocos Creator generates this file during the build pipeline.
     */
    static get ProjectBuildGradleProperties() {
        return (0, path_1.join)(Editor.Project.path, 'build', 'android', 'proj', 'gradle.properties');
    }
    /** proguard-rules.pro in the app module directory (template side). */
    static get ProjectAppProguardRules() {
        return (0, path_1.join)(AndroidConstants.ProjectNativeAndroidDir, 'app', 'proguard-rules.pro');
    }
    /** proguard-rules.pro in the Cocos-generated build output directory. */
    static get ProjectBuildAppProguardRules() {
        return (0, path_1.join)(Editor.Project.path, 'build', 'android', 'proj', 'app', 'proguard-rules.pro');
    }
}
exports.AndroidConstants = AndroidConstants;
/** Source template directory shipped inside this extension (committed to git). */
AndroidConstants.TemplateAndroidDir = (0, path_1.join)(__dirname, '..', 'template', 'android');
AndroidConstants.TemplateProjectBuildGradle = (0, path_1.join)(AndroidConstants.TemplateAndroidDir, 'build.gradle');
AndroidConstants.TemplateSettingsGradle = (0, path_1.join)(AndroidConstants.TemplateAndroidDir, 'settings.gradle');
AndroidConstants.TemplateLibAdMobDir = (0, path_1.join)(AndroidConstants.TemplateAndroidDir, 'libadmob');
/** Gradle dependency coordinates. Pinned; see THIRD_PARTY_NOTICES.md. */
AndroidConstants.PlayServicesAdsVersion = '25.4.0';
AndroidConstants.UserMessagingPlatformVersion = '4.0.0';
