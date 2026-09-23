"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.buildTaskiOS = exports.BuildTaskiOS = void 0;
const fse = __importStar(require("fs-extra"));
const path_1 = require("path");
const plist = __importStar(require("plist"));
/** Google's public test AdMob App ID for iOS (safe to ship as a fallback default). */
const TEST_IOS_APP_ID = 'ca-app-pub-3940256099942544~1458002511';
/**
 * SKAdNetwork identifiers Google publishes for AdMob/Google-served demand and
 * participating third-party ad networks used by AdMob mediation. Source:
 * Google's public "Prepare for the iOS 14 SKAdNetwork" documentation
 * (developers.google.com/admob/ios/ios14). This is Apple/Google's own
 * published configuration data, not implementation code, and is required for
 * ad attribution to work correctly on iOS 14+.
 */
const SKADNETWORK_IDS = [
    'cstr6suwn9.skadnetwork', '4fzdc2evr5.skadnetwork', '2fnua5tdw4.skadnetwork',
    'ydx93a7ass.skadnetwork', 'p78axxw29g.skadnetwork', 'v72qych5uu.skadnetwork',
    'ludvb6z3bs.skadnetwork', 'cp8zw746q7.skadnetwork', '3sh42y64q3.skadnetwork',
    'c6k4g5qg8m.skadnetwork', 's39g8k73mm.skadnetwork', 'wg4vff78zm.skadnetwork',
    '3qy4746246.skadnetwork', 'f38h382jlk.skadnetwork', 'hs6bdukanm.skadnetwork',
    'mlmmfzh3r3.skadnetwork', 'v4nxqhlyqp.skadnetwork', 'wzmmz9fp6w.skadnetwork',
    'su67r6k2v3.skadnetwork', 'yclnxrl5pm.skadnetwork', 't38b2kh725.skadnetwork',
    '7ug5zh24hu.skadnetwork', 'gta9lk7p23.skadnetwork', 'vutu7akeur.skadnetwork',
    'y5ghdn5j9k.skadnetwork', 'v9wttpbfk9.skadnetwork', 'n38lu8286q.skadnetwork',
    '47vhws6wlr.skadnetwork', 'kbd757ywx3.skadnetwork', '9t245vhmpl.skadnetwork',
    'a2p9lx4jpn.skadnetwork', '22mmun2rn5.skadnetwork', '44jx6755aq.skadnetwork',
    'k674qkevps.skadnetwork', '4468km3ulz.skadnetwork', '2u9pt9hc89.skadnetwork',
    '8s468mfl3y.skadnetwork', 'klf5c3l5u5.skadnetwork', 'ppxm28t8ap.skadnetwork',
    'kbmxgpxpgc.skadnetwork', 'uw77j35x4d.skadnetwork', '578prtvx9j.skadnetwork',
    '4dzt52r2t5.skadnetwork', 'tl55sbb4fm.skadnetwork', 'c3frkrj4fj.skadnetwork',
    'e5fvkxwrpn.skadnetwork', '8c4e2ghe7u.skadnetwork', '3rd42ekr43.skadnetwork',
    '97r2b46745.skadnetwork', '3qcr597p9d.skadnetwork',
];
/** xcframework bundles that `scripts/fetch-admob-ios-sdk.sh` must have already fetched. */
const REQUIRED_XCFRAMEWORKS = ['GoogleMobileAds', 'UserMessagingPlatform'];
function templateIOSDir() {
    return (0, path_1.join)(__dirname, '..', 'template', 'ios');
}
function templateAdMobDir() {
    return (0, path_1.join)(templateIOSDir(), 'admob');
}
function projectIOSDir() {
    return (0, path_1.join)(Editor.Project.path, 'native', 'engine', 'ios');
}
/**
 * Handles every iOS-side native project modification: verifying the Google
 * SDK has been fetched, copying the AdMob payload (headers, `.mm` sources,
 * `.xcframework` bundles) into the native iOS project, and merging the
 * required Info.plist keys.
 */
class BuildTaskiOS {
    run(opts, result) {
        return __awaiter(this, void 0, void 0, function* () {
            this.assertFrameworksPresent();
            this.copyResources();
            this.mergeInfoPlist(opts);
        });
    }
    /**
     * The Google Mobile Ads / UMP `.xcframework` bundles are ~37MB and are
     * deliberately NOT vendored in this git repository (see
     * `scripts/fetch-admob-ios-sdk.sh` and `THIRD_PARTY_NOTICES.md`). Fail
     * loudly and early, rather than letting Xcode fail obscurely later, if
     * the developer has not run the fetch script yet.
     */
    assertFrameworksPresent() {
        const missing = REQUIRED_XCFRAMEWORKS.filter((name) => !fse.existsSync((0, path_1.join)(templateAdMobDir(), `${name}.xcframework`)));
        if (missing.length === 0) {
            return;
        }
        throw new Error(`[AdMob] Missing iOS SDK framework(s): ${missing.join(', ')}.\n` +
            `Run 'extensions/AdMob/scripts/fetch-admob-ios-sdk.sh' once before building for iOS. ` +
            `This downloads Google's official Google Mobile Ads SDK and User Messaging Platform SDK ` +
            `release archives (verified against a pinned SHA-256) into 'extensions/AdMob/template/ios/admob/'. ` +
            `These SDKs are not committed to this repository because of their size (~37MB).`);
    }
    copyResources() {
        fse.copySync((0, path_1.join)(templateIOSDir(), 'Pre-admob.cmake'), (0, path_1.join)(projectIOSDir(), 'Pre-admob.cmake'), { overwrite: true });
        fse.copySync((0, path_1.join)(templateIOSDir(), 'Post-admob.cmake'), (0, path_1.join)(projectIOSDir(), 'Post-admob.cmake'), { overwrite: true });
        fse.copySync(templateAdMobDir(), (0, path_1.join)(projectIOSDir(), 'admob'), { overwrite: true });
    }
    mergeInfoPlist(opts) {
        const plistPath = (0, path_1.join)(projectIOSDir(), 'Info.plist');
        if (!fse.existsSync(plistPath)) {
            return;
        }
        const raw = fse.readFileSync(plistPath, 'utf-8');
        const parsed = plist.parse(raw);
        parsed.GADApplicationIdentifier = (opts.iosAppId && opts.iosAppId.trim()) || TEST_IOS_APP_ID;
        const existingItems = Array.isArray(parsed.SKAdNetworkItems)
            ? parsed.SKAdNetworkItems
            : [];
        const existingIds = new Set(existingItems.map((item) => item.SKAdNetworkIdentifier));
        const merged = [...existingItems];
        for (const id of SKADNETWORK_IDS) {
            if (!existingIds.has(id)) {
                merged.push({ SKAdNetworkIdentifier: id });
                existingIds.add(id);
            }
        }
        parsed.SKAdNetworkItems = merged;
        // Deliberately NOT adding NSUserTrackingUsageDescription: this
        // extension does not implement an App Tracking Transparency (ATT)
        // prompt in v1.0.0 (see doc/en/index.md "Known limitations"). Adding
        // the key without ever calling ATTrackingManager would be misleading
        // and could itself trigger App Store review questions.
        fse.writeFileSync(plistPath, plist.build(parsed), 'utf-8');
    }
}
exports.BuildTaskiOS = BuildTaskiOS;
exports.buildTaskiOS = { ios: new BuildTaskiOS() };
