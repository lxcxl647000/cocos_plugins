import * as fse from 'fs-extra';
import { AndroidConstants } from './AndroidConstants';
import { ITaskOptions } from './hooks';
import { appendContentToFileIfNo, insertContentBehindKey, upsertMarkerBlock } from './Util';

/** Google's public test AdMob App ID for Android (safe to ship as a fallback default). */
const TEST_ANDROID_APP_ID = 'ca-app-pub-3940256099942544~3347511713';

const DEPENDENCIES_ANCHOR = "dependencies {";

const MANIFEST_PLACEHOLDER_BEGIN = '    // ADMOB-BEGIN:manifestPlaceholders';
const MANIFEST_PLACEHOLDER_END = '    // ADMOB-END:manifestPlaceholders';
const ANDROID_BLOCK_ANCHOR = 'android {';

/**
 * Handles every Android-side native project modification: copying the
 * `libadmob` Android library module into the built project and wiring it
 * into Gradle. All operations are idempotent — safe to run on every build.
 */
export class BuildTaskAndroid {
    async run(opts: ITaskOptions, result: any): Promise<void> {
        this.copyLibraryDirectory(opts);
        this.patchLibraryBuildGradle(opts);
        this.patchSettingsGradle();
        this.patchAppBuildGradle();
        this.patchMinSdkVersion();
        this.patchProguardRules();
    }

    private copyLibraryDirectory(opts: ITaskOptions): void {
        const dest = AndroidConstants.ProjectLibAdMobDir;
        const overwrite = opts.overwriteLibrary !== false;
        if (fse.existsSync(dest) && !overwrite) {
            return;
        }
        fse.copySync(AndroidConstants.TemplateLibAdMobDir, dest, { overwrite: true });
    }

    /**
     * Fix AGP 8.x compatibility issues in libadmob/build.gradle:
     * 1. Ensure `namespace` is set (required by AGP 8 for library modules)
     * 2. Ensure `manifestPlaceholders` is inside `defaultConfig {}` block (not at android {} top level)
     * 3. Ensure `minSdkVersion` is at least 23 (required by play-services-ads 25.x)
     */
    private patchLibraryBuildGradle(opts: ITaskOptions): void {
        const buildGradlePath = `${AndroidConstants.ProjectLibAdMobDir}/build.gradle`;
        if (!fse.existsSync(buildGradlePath)) {
            return;
        }

        let content = fse.readFileSync(buildGradlePath, 'utf-8');

        // 1. Ensure namespace is set (AGP 8 requirement for library modules)
        if (!content.includes("namespace ")) {
            // Insert namespace right after the apply plugin line
            content = content.replace(
                /apply plugin: ['"]com\.android\.library['"]/i,
                'apply plugin: \'com.android.library\'\n\n    namespace \'com.cocosext.admob\''
            );
        }

        // 2. Fix manifestPlaceholders position:
        //    Move it from android {} top level into defaultConfig {} block
        //    First, remove any existing manifestPlaceholders block at android {} level
        //    (i.e., between "android {" and "defaultConfig {")
        content = content.replace(
            /manifestPlaceholders\s*=\s*\[[\s\S]*?\]\s*(?=\s*\}\s*$|\s*defaultConfig)/g,
            ''
        );

        // Now ensure the ADMOB marker block is inside defaultConfig {}
        // Read the file again to check current state
        content = fse.readFileSync(buildGradlePath, 'utf-8');

        // Check if manifestPlaceholders is already inside defaultConfig
        const defaultConfigMatch = content.match(/defaultConfig\s*\{[\s\S]*?\}/);
        if (defaultConfigMatch) {
            const defaultConfigBlock = defaultConfigMatch[0];
            if (!defaultConfigBlock.includes('manifestPlaceholders')) {
                // Insert manifestPlaceholders before the closing brace of defaultConfig
                const appId = (opts.androidAppId && opts.androidAppId.trim()) || TEST_ANDROID_APP_ID;
                const useTestAds = opts.useTestAds !== false;
                const testDeviceIds = (opts.testDeviceIds ?? '').replace(/"/g, '\\\"');
                const placeholderBlock = `
        manifestPlaceholders = [
            admobAppId: "${appId}",
            admobUseTestAds: "${useTestAds}",
            admobTestDeviceIds: "${testDeviceIds}",
        ]`;

                content = content.replace(
                    /(defaultConfig\s*\{[\s\S]*?)\n(\s*\})/,
                    `$1${placeholderBlock}\n$2`
                );

                // Also remove any manifestPlaceholders that might be at android {} top level
                // (between android { and defaultConfig {)
                content = content.replace(
                    /(android\s*\{[\s\S]*?)manifestPlaceholders\s*=\s*\[[\s\S]*?\]\s*(?=\s*defaultConfig)/,
                    '$1'
                );
            }
        } else {
            // If no defaultConfig block found, use the original marker-based approach as fallback
            const appId = (opts.androidAppId && opts.androidAppId.trim()) || TEST_ANDROID_APP_ID;
            const useTestAds = opts.useTestAds !== false;
            const testDeviceIds = (opts.testDeviceIds ?? '').replace(/"/g, '\\\"');
            const body =
                `        manifestPlaceholders = [\n` +
                `            admobAppId: "${appId}",\n` +
                `            admobUseTestAds: "${useTestAds}",\n` +
                `            admobTestDeviceIds: "${testDeviceIds}",\n` +
                `        ]`;
            upsertMarkerBlock(
                buildGradlePath,
                MANIFEST_PLACEHOLDER_BEGIN,
                MANIFEST_PLACEHOLDER_END,
                body,
                ANDROID_BLOCK_ANCHOR,
            );
        }

        // 3. Ensure minSdkVersion is at least 23 in libadmob/build.gradle
        content = content.replace(/minSdkVersion\s*\d+/g, 'minSdkVersion 23');

        fse.writeFileSync(buildGradlePath, content, 'utf-8');
    }

    /**
     * Patch settings.gradle to include the libadmob module.
     *
     * Cocos Creator generates settings.gradle in the build output directory
     * (build/android/proj/settings.gradle), NOT in the template directory.
     * We try multiple paths to find it.
     */
    private patchSettingsGradle(): void {
        // Try to find settings.gradle in possible locations
        const possiblePaths = [
            AndroidConstants.ProjectBuildSettingsGradle,  // build/android/proj/settings.gradle
            AndroidConstants.ProjectSettingsGradle,        // native/engine/android/settings.gradle
        ];

        let settingsPath: string | null = null;
        for (const p of possiblePaths) {
            if (fse.existsSync(p)) {
                settingsPath = p;
                break;
            }
        }

        if (!settingsPath) {
            console.warn('[AdMob] settings.gradle not found in any known location. Skipping patch.');
            return;
        }

        let content = fse.readFileSync(settingsPath, 'utf-8');

        // 1. Add :libadmob to the existing include line
        //    Match lines like: include ':libcocos',':libservice',':app'
        //    and add ':libadmob' to them
        if (!content.includes("'libadmob'") && !content.includes('"libadmob"')) {
            // Try to find the main include line
            const includeLineRegex = /include\s*\(.*?\)/;
            const includeLines = content.match(includeLineRegex);

            if (includeLines) {
                // Found include line(s), add :libadmob to the last one before rootProject.name
                const lines = content.split('\n');
                let lastIncludeIdx = -1;
                for (let i = lines.length - 1; i >= 0; i--) {
                    if (lines[i].trim().startsWith('rootProject.name')) {
                        // Insert before rootProject.name
                        lines.splice(i, 0, "include ':libadmob'");
                        lines.splice(i + 1, 0, "project(':libadmob').projectDir = new File(NATIVE_DIR, 'libadmob')");
                        content = lines.join('\n');
                        lastIncludeIdx = i;
                        break;
                    }
                    if (includeLineRegex.test(lines[i])) {
                        lastIncludeIdx = i;
                    }
                }

                if (lastIncludeIdx === -1) {
                    // No rootProject.name found, append at end
                    content = `${content}\ninclude ':libadmob'\nproject(':libadmob').projectDir = new File(NATIVE_DIR, 'libadmob')\n`;
                }
            } else {
                // No include line found, append at end (before rootProject.name if present)
                if (content.includes('rootProject.name')) {
                    content = content.replace(
                        /(rootProject\.name\s*=)/,
                        `include ':libadmob'\nproject(':libadmob').projectDir = new File(NATIVE_DIR, 'libadmob')\n\n$1`
                    );
                } else {
                    content = `${content}\ninclude ':libadmob'\nproject(':libadmob').projectDir = new File(NATIVE_DIR, 'libadmob')\n`;
                }
            }
        } else {
            // libadmob is already included, but still ensure projectDir is set
            if (!content.includes("project(':libadmob').projectDir")) {
                if (content.includes('rootProject.name')) {
                    content = content.replace(
                        /(rootProject\.name\s*=)/,
                        "project(':libadmob').projectDir = new File(NATIVE_DIR, 'libadmob')\n\n$1"
                    );
                } else {
                    content = `${content}\nproject(':libadmob').projectDir = new File(NATIVE_DIR, 'libadmob')\n`;
                }
            }
        }

        fse.writeFileSync(settingsPath, content, 'utf-8');
        console.log(`[AdMob] Patched settings.gradle: ${settingsPath}`);
    }

    private patchAppBuildGradle(): void {
        const snippet = fse.readFileSync(AndroidConstants.TemplateProjectBuildGradle, 'utf-8').trimEnd();
        insertContentBehindKey(AndroidConstants.ProjectAppBuildGradle, DEPENDENCIES_ANCHOR, snippet);
    }

    /**
     * Fix minSdkVersion by patching gradle.properties in the build output directory.
     * Cocos Creator generates this file during the build, so we must patch the
     * generated copy, not a template file.
     */
    private patchMinSdkVersion(): void {
        const propsPath = AndroidConstants.ProjectBuildGradleProperties;
        if (!fse.existsSync(propsPath)) {
            console.warn('[AdMob] gradle.properties not found at build output path. Trying alternative...');
            // Fallback: try to find gradle.properties in native directory
            const fallbackPath = `${AndroidConstants.ProjectNativeAndroidDir}/gradle.properties`;
            if (fse.existsSync(fallbackPath)) {
                this.fixMinSdkInFile(fallbackPath);
            } else {
                console.warn('[AdMob] gradle.properties not found anywhere. Skipping minSdkVersion fix.');
            }
            return;
        }
        this.fixMinSdkInFile(propsPath);

        // Also patch app/build.gradle as a fallback (override the variable directly)
        this.patchMinSdkInBuildGradle();
    }

    private fixMinSdkInFile(filePath: string): void {
        let content = fse.readFileSync(filePath, 'utf-8');
        if (content.includes('PROP_MIN_SDK_VERSION=21') || content.includes('PROP_MIN_SDK_VERSION=23')) {
            content = content.replace(/PROP_MIN_SDK_VERSION=\d+/g, 'PROP_MIN_SDK_VERSION=23');
            fse.writeFileSync(filePath, content, 'utf-8');
            console.log(`[AdMob] Updated PROP_MIN_SDK_VERSION=23 in ${filePath}`);
        } else if (!content.includes('PROP_MIN_SDK_VERSION')) {
            // Property not found, append it
            content = `${content}\nPROP_MIN_SDK_VERSION=23\n`;
            fse.writeFileSync(filePath, content, 'utf-8');
            console.log(`[AdMob] Added PROP_MIN_SDK_VERSION=23 to ${filePath}`);
        }
    }

    /**
     * As a fallback, directly set minSdkVersion in app/build.gradle by overriding
     * the PROP_MIN_SDK_VERSION variable at the top of the file.
     */
    private patchMinSdkInBuildGradle(): void {
        const appBuildGradle = AndroidConstants.ProjectAppBuildGradle;
        if (!fse.existsSync(appBuildGradle)) {
            return;
        }

        let content = fse.readFileSync(appBuildGradle, 'utf-8');

        // Check if PROP_MIN_SDK_VERSION is already overridden at the top
        if (!content.includes('PROP_MIN_SDK_VERSION = "23"') && !content.includes("PROP_MIN_SDK_VERSION = '23'")) {
            // Insert override right after the first import line
            content = content.replace(
                /^(import\s+.*\n)/m,
                '$1\nPROP_MIN_SDK_VERSION = "23" // AdMob: override to 23 (play-services-ads 25.x requires minSdk 23)\n'
            );
            fse.writeFileSync(appBuildGradle, content, 'utf-8');
            console.log(`[AdMob] Added PROP_MIN_SDK_VERSION override in ${appBuildGradle}`);
        }
    }

    /**
     * Add R8/ProGuard rules to suppress warnings about AdMob SDK classes
     * that reference APIs not available at the compile SDK level.
     */
    private patchProguardRules(): void {
        const rulesPath = AndroidConstants.ProjectAppProguardRules;
        if (!fse.existsSync(rulesPath)) {
            // Try build output path
            const buildRulesPath = AndroidConstants.ProjectBuildAppProguardRules;
            if (fse.existsSync(buildRulesPath)) {
                this.appendProguardRules(buildRulesPath);
            } else {
                // Create the file in the template directory
                fse.ensureFileSync(rulesPath);
                this.appendProguardRules(rulesPath);
            }
            return;
        }
        this.appendProguardRules(rulesPath);
    }

    private appendProguardRules(filePath: string): void {
        let content = fse.readFileSync(filePath, 'utf-8');

        const rules = [
            '',
            '# === AdMob SDK ProGuard rules (auto-generated by AdMob plugin) ===',
            '# Suppress warnings for classes referenced by AdMob SDK but not available at compile SDK level',
            '-dontwarn android.media.LoudnessCodecController',
            '-dontwarn android.media.LoudnessCodecController$OnLoudnessCodecUpdateListener',
            '',
            '# Keep AdMob and Google Mobile Ads classes from being obfuscated',
            '-keep class com.google.android.gms.ads.** { *; }',
            '-keep class com.google.android.gms.internal.ads.** { *; }',
            '-keep class com.cocosext.admob.** { *; }',
            '# === End AdMob SDK ProGuard rules ===',
            '',
        ];

        const ruleBlock = rules.join('\n');

        // Check if we already added these rules (idempotent)
        if (!content.includes('AdMob SDK ProGuard rules')) {
            content = `${content}${ruleBlock}`;
            fse.writeFileSync(filePath, content, 'utf-8');
            console.log(`[AdMob] Added ProGuard rules to ${filePath}`);
        } else {
            console.log(`[AdMob] ProGuard rules already present in ${filePath}`);
        }
    }
}

export const buildTaskAndroid = { android: new BuildTaskAndroid() };
