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
exports.compressTextures = compressTextures;
/**
 * Cocos Creator's build pipeline probes every builder extension for optional
 * asset-processing hooks. AdMob does not process any project assets (it only
 * touches native project files), so this is an intentional no-op — its only
 * purpose is to satisfy the expected export shape.
 */
function compressTextures() {
    return __awaiter(this, void 0, void 0, function* () {
        // No-op: AdMob ships no texture assets of its own.
    });
}
