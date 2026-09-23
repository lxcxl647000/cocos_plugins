import { join } from 'path';

/**
 * Centralized path constants for the Android build task. Keeping every path
 * in one place makes `BuildTaskAndroid.ts` easy to audit and keeps the
 * idempotent-patch helpers in `Util.ts` honest about what they touch.
 */
export class AndroidConstants {
    /** Source template directory shipped inside this extension (committed to git). */
    static readonly TemplateAndroidDir = join(__dirname, '..', 'template', 'android');

    static readonly TemplateProjectBuildGradle = join(AndroidConstants.TemplateAndroidDir, 'build.gradle');
    static readonly TemplateSettingsGradle = join(AndroidConstants.TemplateAndroidDir, 'settings.gradle');
    static readonly TemplateLibAdMobDir = join(AndroidConstants.TemplateAndroidDir, 'libadmob');

    /** Destination: the native Android project inside the user's Creator project. */
    static get ProjectNativeAndroidDir(): string {
        return join(Editor.Project.path, 'native', 'engine', 'android');
    }

    static get ProjectRootBuildGradle(): string {
        return join(AndroidConstants.ProjectNativeAndroidDir, 'build.gradle');
    }

    /** settings.gradle in the native Android project directory. */
    static get ProjectSettingsGradle(): string {
        return join(AndroidConstants.ProjectNativeAndroidDir, 'settings.gradle');
    }

    /**
     * settings.gradle in the Cocos-generated build output directory.
     * Cocos Creator generates this file during the build pipeline, so it lives
     * under `build/android/proj/` rather than in the template directory.
     */
    static get ProjectBuildSettingsGradle(): string {
        return join(Editor.Project.path, 'build', 'android', 'proj', 'settings.gradle');
    }

    static get ProjectAppBuildGradle(): string {
        return join(AndroidConstants.ProjectNativeAndroidDir, 'app', 'build.gradle');
    }

    static get ProjectAppManifest(): string {
        return join(AndroidConstants.ProjectNativeAndroidDir, 'app', 'AndroidManifest.xml');
    }

    static get ProjectLibAdMobDir(): string {
        return join(AndroidConstants.ProjectNativeAndroidDir, 'libadmob');
    }

    /**
     * gradle.properties in the Cocos-generated build output directory.
     * Cocos Creator generates this file during the build pipeline.
     */
    static get ProjectBuildGradleProperties(): string {
        return join(Editor.Project.path, 'build', 'android', 'proj', 'gradle.properties');
    }

    /** proguard-rules.pro in the app module directory (template side). */
    static get ProjectAppProguardRules(): string {
        return join(AndroidConstants.ProjectNativeAndroidDir, 'app', 'proguard-rules.pro');
    }

    /** proguard-rules.pro in the Cocos-generated build output directory. */
    static get ProjectBuildAppProguardRules(): string {
        return join(Editor.Project.path, 'build', 'android', 'proj', 'app', 'proguard-rules.pro');
    }

    /** Gradle dependency coordinates. Pinned; see THIRD_PARTY_NOTICES.md. */
    static readonly PlayServicesAdsVersion = '25.4.0';
    static readonly UserMessagingPlatformVersion = '4.0.0';
}
