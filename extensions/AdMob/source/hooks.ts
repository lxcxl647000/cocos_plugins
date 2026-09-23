import { AdMobOption } from './AdMobOptions';
import { buildTaskAndroid } from './BuildTaskAndroid';
import { buildTaskiOS } from './BuildTaskiOS';

declare const console: any;

export interface ITaskOptions extends AdMobOption {
    packageName: string;
    platform: string;
}

/**
 * Build-panel lifecycle hooks. Cocos Creator calls these at well-defined
 * points of the build pipeline; every hook below is optional and this
 * extension only implements the ones it actually needs.
 *
 * Native project files (the Android app under `native/engine/android`, the
 * iOS Xcode project under `native/engine/ios`) only exist once the build's
 * native scaffolding step has run, so all patching happens in the
 * *after*-build hooks, not before.
 */
export const throwError = true;

export function load() {
    // Nothing to initialize at extension-load time.
}

export function unload() {
    // Nothing to tear down at extension-unload time.
}

export async function onAfterBuild(options: any, result: any) {
    const opts: ITaskOptions = options?.packages?.admob ?? {};
    if (opts.enableAdMob === false) {
        return;
    }
    if (options.platform === 'android') {
        await buildTaskAndroid.android.run(opts, result);
    }
}

export async function onAfterCompressSettings(options: any, result: any) {
    const opts: ITaskOptions = options?.packages?.admob ?? {};
    if (opts.enableAdMob === false) {
        return;
    }
    if (options.platform === 'ios') {
        await buildTaskiOS.ios.run(opts, result);
    }
}

export function onError(options: any, result: any) {
    console.error('[AdMob] build failed:', result?.error ?? '(no error detail)');
}

export function onBeforeMake(root: string, options: any) {
    // No make-phase (Xcode/Gradle project generation) work required.
}

export function onAfterMake(root: string, options: any) {
    // No make-phase (Xcode/Gradle project generation) work required.
}
