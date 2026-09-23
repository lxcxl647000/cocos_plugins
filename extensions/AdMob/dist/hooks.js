"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.throwError = void 0;
exports.load = load;
exports.unload = unload;
exports.onAfterBuild = onAfterBuild;
exports.onAfterCompressSettings = onAfterCompressSettings;
exports.onError = onError;
exports.onBeforeMake = onBeforeMake;
exports.onAfterMake = onAfterMake;
const BuildTaskAndroid_1 = require("./BuildTaskAndroid");
const BuildTaskiOS_1 = require("./BuildTaskiOS");
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
exports.throwError = true;
function load() {
    // Nothing to initialize at extension-load time.
}
function unload() {
    // Nothing to tear down at extension-unload time.
}
function onAfterBuild(options, result) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const opts = (_b = (_a = options === null || options === void 0 ? void 0 : options.packages) === null || _a === void 0 ? void 0 : _a.admob) !== null && _b !== void 0 ? _b : {};
        if (opts.enableAdMob === false) {
            return;
        }
        if (options.platform === 'android') {
            yield BuildTaskAndroid_1.buildTaskAndroid.android.run(opts, result);
        }
    });
}
function onAfterCompressSettings(options, result) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const opts = (_b = (_a = options === null || options === void 0 ? void 0 : options.packages) === null || _a === void 0 ? void 0 : _a.admob) !== null && _b !== void 0 ? _b : {};
        if (opts.enableAdMob === false) {
            return;
        }
        if (options.platform === 'ios') {
            yield BuildTaskiOS_1.buildTaskiOS.ios.run(opts, result);
        }
    });
}
function onError(options, result) {
    var _a;
    console.error('[AdMob] build failed:', (_a = result === null || result === void 0 ? void 0 : result.error) !== null && _a !== void 0 ? _a : '(no error detail)');
}
function onBeforeMake(root, options) {
    // No make-phase (Xcode/Gradle project generation) work required.
}
function onAfterMake(root, options) {
    // No make-phase (Xcode/Gradle project generation) work required.
}
