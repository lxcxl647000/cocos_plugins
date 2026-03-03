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
Object.defineProperty(exports, "__esModule", { value: true });
exports.onAfterMake = exports.onBeforeMake = exports.onError = exports.unload = exports.onAfterBuild = exports.onAfterCompressSettings = exports.onBeforeCompressSettings = exports.onBeforeBuild = exports.load = exports.throwError = void 0;
const fs = __importStar(require("fs"));
exports.throwError = true;
const load = async function () {
};
exports.load = load;
const onBeforeBuild = async function (options, result) {
    // TODO some thing
    // log(`${PACKAGE_NAME}.webTestOption`, 'onBeforeBuild');
};
exports.onBeforeBuild = onBeforeBuild;
const onBeforeCompressSettings = async function (options, result) {
    // Todo some thing
    console.debug('get settings test', result.settings);
};
exports.onBeforeCompressSettings = onBeforeCompressSettings;
const onAfterCompressSettings = async function (options, result) {
    // Todo some thing
    console.log('webTestOption', 'onAfterCompressSettings');
};
exports.onAfterCompressSettings = onAfterCompressSettings;
const onAfterBuild = async function (options, result) {
    console.log('onAfterBuild options ', options);
    if (options.platform === 'taobao-mini-game') {
        console.log('build options : == ', options.packages['build-plugin']);
        let { injectCode, injectFilePath, searchPattern } = options.packages['build-plugin'];
        if (injectCode === '' || injectFilePath === '' || searchPattern === '') {
            return;
        }
        console.log(`${options.platform} : start code inject------`, Editor.Project.path);
        if (searchPattern.startsWith('/') && searchPattern.endsWith('/')) {
            // 截取中间部分：(globalThis\s*=\s*\$global\s*;)
            searchPattern = searchPattern.slice(1, -1);
        }
        const SEARCH_PATTERN = new RegExp(searchPattern);
        let gameJsPath = Editor.Utils.Path.normalize(`${Editor.Project.path}/build/${options.outputName}/${injectFilePath}`);
        if (!fs.existsSync(gameJsPath)) {
            console.log('gameJsPath is not exist', gameJsPath);
        }
        else {
            console.log('gameJsPath  exist', gameJsPath);
            let content = fs.readFileSync(gameJsPath, 'utf-8');
            if (content) {
                console.log('get gameJs content ');
                let newContent = content;
                let isInjected = false;
                if (SEARCH_PATTERN.test(content)) {
                    newContent = content.replace(SEARCH_PATTERN, `$1${injectCode}`);
                    isInjected = newContent !== content;
                }
                else {
                    console.log(`cant find ${SEARCH_PATTERN}`);
                }
                if (isInjected) {
                    fs.writeFileSync(gameJsPath, newContent, 'utf-8');
                    console.log('code inject success-------------');
                }
                else {
                    console.log('code inject fail-------------');
                }
            }
            else {
                console.log('cant get gameJs content ');
            }
        }
    }
};
exports.onAfterBuild = onAfterBuild;
const unload = async function () {
};
exports.unload = unload;
const onError = async function (options, result) {
    // Todo some thing
};
exports.onError = onError;
const onBeforeMake = async function (root, options) {
    console.log(`onBeforeMake: root: ${root}, options: ${options}`);
};
exports.onBeforeMake = onBeforeMake;
const onAfterMake = async function (root, options) {
    console.log(`onAfterMake: root: ${root}, options: ${options}`);
};
exports.onAfterMake = onAfterMake;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG9va3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zb3VyY2UvaG9va3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsdUNBQXlCO0FBRVosUUFBQSxVQUFVLEdBQXlCLElBQUksQ0FBQztBQUU5QyxNQUFNLElBQUksR0FBbUIsS0FBSztBQUV6QyxDQUFDLENBQUM7QUFGVyxRQUFBLElBQUksUUFFZjtBQUVLLE1BQU0sYUFBYSxHQUE0QixLQUFLLFdBQVcsT0FBcUIsRUFBRSxNQUFvQjtJQUM3RyxrQkFBa0I7SUFDbEIseURBQXlEO0FBQzdELENBQUMsQ0FBQztBQUhXLFFBQUEsYUFBYSxpQkFHeEI7QUFFSyxNQUFNLHdCQUF3QixHQUF1QyxLQUFLLFdBQVcsT0FBcUIsRUFBRSxNQUFvQjtJQUNuSSxrQkFBa0I7SUFDbEIsT0FBTyxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDeEQsQ0FBQyxDQUFDO0FBSFcsUUFBQSx3QkFBd0IsNEJBR25DO0FBRUssTUFBTSx1QkFBdUIsR0FBc0MsS0FBSyxXQUFXLE9BQXFCLEVBQUUsTUFBb0I7SUFDakksa0JBQWtCO0lBQ2xCLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxFQUFFLHlCQUF5QixDQUFDLENBQUM7QUFDNUQsQ0FBQyxDQUFDO0FBSFcsUUFBQSx1QkFBdUIsMkJBR2xDO0FBRUssTUFBTSxZQUFZLEdBQTJCLEtBQUssV0FBVyxPQUFxQixFQUFFLE1BQW9CO0lBQzNHLE9BQU8sQ0FBQyxHQUFHLENBQUMsdUJBQXVCLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDOUMsSUFBSSxPQUFPLENBQUMsUUFBUSxLQUFLLGtCQUFrQixFQUFFLENBQUM7UUFDMUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsRUFBRSxPQUFPLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxDQUFD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QUFXLElBQUksRUFBRSxPQUFPO0lBQzdFLE9BQU8sQ0FBQyxHQUFHLENBQUMsdUJBQXVCLElBQUksY0FBYyxPQUFPLEVBQUUsQ0FBQyxDQUFDO0FBQ3BFLENBQUMsQ0FBQztBQUZXLFFBQUEsWUFBWSxnQkFFdkI7QUFFSyxNQUFNLFdBQVcsR0FBMEIsS0FBSyxXQUFXLElBQUksRUFBRSxPQUFPO0lBQzNFLE9BQU8sQ0FBQyxHQUFHLENBQUMsc0JBQXNCLElBQUksY0FBYyxPQUFPLEVBQUUsQ0FBQyxDQUFDO0FBQ25FLENBQUMsQ0FBQztBQUZXLFFBQUEsV0FBVyxlQUV0QiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEJ1aWxkSG9vaywgSUJ1aWxkUmVzdWx0LCBJVGFza09wdGlvbnMgfSBmcm9tICcuLi9AdHlwZXMnO1xyXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XHJcblxyXG5leHBvcnQgY29uc3QgdGhyb3dFcnJvcjogQnVpbGRIb29rLnRocm93RXJyb3IgPSB0cnVlO1xyXG5cclxuZXhwb3J0IGNvbnN0IGxvYWQ6IEJ1aWxkSG9vay5sb2FkID0gYXN5bmMgZnVuY3Rpb24gKCkge1xyXG5cclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBvbkJlZm9yZUJ1aWxkOiBCdWlsZEhvb2sub25CZWZvcmVCdWlsZCA9IGFzeW5jIGZ1bmN0aW9uIChvcHRpb25zOiBJVGFza09wdGlvbnMsIHJlc3VsdDogSUJ1aWxkUmVzdWx0KSB7XHJcbiAgICAvLyBUT0RPIHNvbWUgdGhpbmdcclxuICAgIC8vIGxvZyhgJHtQQUNLQUdFX05BTUV9LndlYlRlc3RPcHRpb25gLCAnb25CZWZvcmVCdWlsZCcpO1xyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IG9uQmVmb3JlQ29tcHJlc3NTZXR0aW5nczogQnVpbGRIb29rLm9uQmVmb3JlQ29tcHJlc3NTZXR0aW5ncyA9IGFzeW5jIGZ1bmN0aW9uIChvcHRpb25zOiBJVGFza09wdGlvbnMsIHJlc3VsdDogSUJ1aWxkUmVzdWx0KSB7XHJcbiAgICAvLyBUb2RvIHNvbWUgdGhpbmdcclxuICAgIGNvbnNvbGUuZGVidWcoJ2dldCBzZXR0aW5ncyB0ZXN0JywgcmVzdWx0LnNldHRpbmdzKTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBvbkFmdGVyQ29tcHJlc3NTZXR0aW5nczogQnVpbGRIb29rLm9uQWZ0ZXJDb21wcmVzc1NldHRpbmdzID0gYXN5bmMgZnVuY3Rpb24gKG9wdGlvbnM6IElUYXNrT3B0aW9ucywgcmVzdWx0OiBJQnVpbGRSZXN1bHQpIHtcclxuICAgIC8vIFRvZG8gc29tZSB0aGluZ1xyXG4gICAgY29uc29sZS5sb2coJ3dlYlRlc3RPcHRpb24nLCAnb25BZnRlckNvbXByZXNzU2V0dGluZ3MnKTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBvbkFmdGVyQnVpbGQ6IEJ1aWxkSG9vay5vbkFmdGVyQnVpbGQgPSBhc3luYyBmdW5jdGlvbiAob3B0aW9uczogSVRhc2tPcHRpb25zLCByZXN1bHQ6IElCdWlsZFJlc3VsdCkge1xyXG4gICAgY29uc29sZS5sb2coJ29uQWZ0ZXJCdWlsZCBvcHRpb25zICcsIG9wdGlvbnMpO1xyXG4gICAgaWYgKG9wdGlvbnMucGxhdGZvcm0gPT09ICd0YW9iYW8tbWluaS1nYW1lJykge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdidWlsZCBvcHRpb25zIDogPT0gJywgb3B0aW9ucy5wYWNrYWdlc1snYnVpbGQtcGx1Z2luJ10pO1xyXG4gICAgICAgIGxldCB7IGluamVjdENvZGUsIGluamVjdEZpbGVQYXRoLCBzZWFyY2hQYXR0ZXJuIH0gPSBvcHRpb25zLnBhY2thZ2VzWydidWlsZC1wbHVnaW4nXTtcclxuICAgICAgICBpZiAoaW5qZWN0Q29kZSA9PT0gJycgfHwgaW5qZWN0RmlsZVBhdGggPT09ICcnIHx8IHNlYXJjaFBhdHRlcm4gPT09ICcnKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc29sZS5sb2coYCR7b3B0aW9ucy5wbGF0Zm9ybX0gOiBzdGFydCBjb2RlIGluamVjdC0tLS0tLWAsIEVkaXRvci5Qcm9qZWN0LnBhdGgpO1xyXG4gICAgICAgIGlmIChzZWFyY2hQYXR0ZXJuLnN0YXJ0c1dpdGgoJy8nKSAmJiBzZWFyY2hQYXR0ZXJuLmVuZHNXaXRoKCcvJykpIHtcclxuICAgICAgICAgICAgLy8g5oiq5Y+W5Lit6Ze06YOo5YiG77yaKGdsb2JhbFRoaXNcXHMqPVxccypcXCRnbG9iYWxcXHMqOylcclxuICAgICAgICAgICAgc2VhcmNoUGF0dGVybiA9IHNlYXJjaFBhdHRlcm4uc2xpY2UoMSwgLTEpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zdCBTRUFSQ0hfUEFUVEVSTiA9IG5ldyBSZWdFeHAoc2VhcmNoUGF0dGVybik7XHJcbiAgICAgICAgbGV0IGdhbWVKc1BhdGggPSBFZGl0b3IuVXRpbHMuUGF0aC5ub3JtYWxpemUoYCR7RWRpdG9yLlByb2plY3QucGF0aH0vYnVpbGQvJHtvcHRpb25zLm91dHB1dE5hbWV9LyR7aW5qZWN0RmlsZVBhdGh9YCk7XHJcbiAgICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKGdhbWVKc1BhdGgpKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdnYW1lSnNQYXRoIGlzIG5vdCBleGlzdCcsIGdhbWVKc1BhdGgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ2dhbWVKc1BhdGggIGV4aXN0JywgZ2FtZUpzUGF0aCk7XHJcbiAgICAgICAgICAgIGxldCBjb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKGdhbWVKc1BhdGgsICd1dGYtOCcpO1xyXG4gICAgICAgICAgICBpZiAoY29udGVudCkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2dldCBnYW1lSnMgY29udGVudCAnKTtcclxuICAgICAgICAgICAgICAgIGxldCBuZXdDb250ZW50ID0gY29udGVudDtcclxuICAgICAgICAgICAgICAgIGxldCBpc0luamVjdGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICBpZiAoU0VBUkNIX1BBVFRFUk4udGVzdChjb250ZW50KSkge1xyXG4gICAgICAgICAgICAgICAgICAgIG5ld0NvbnRlbnQgPSBjb250ZW50LnJlcGxhY2UoU0VBUkNIX1BBVFRFUk4sIGAkMSR7aW5qZWN0Q29kZX1gKTtcclxuICAgICAgICAgICAgICAgICAgICBpc0luamVjdGVkID0gbmV3Q29udGVudCAhPT0gY29udGVudDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBjYW50IGZpbmQgJHtTRUFSQ0hfUEFUVEVSTn1gKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoaXNJbmplY3RlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGZzLndyaXRlRmlsZVN5bmMoZ2FtZUpzUGF0aCwgbmV3Q29udGVudCwgJ3V0Zi04Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2NvZGUgaW5qZWN0IHN1Y2Nlc3MtLS0tLS0tLS0tLS0tJyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnY29kZSBpbmplY3QgZmFpbC0tLS0tLS0tLS0tLS0nKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdjYW50IGdldCBnYW1lSnMgY29udGVudCAnKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCB1bmxvYWQ6IEJ1aWxkSG9vay51bmxvYWQgPSBhc3luYyBmdW5jdGlvbiAoKSB7XHJcblxyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IG9uRXJyb3I6IEJ1aWxkSG9vay5vbkVycm9yID0gYXN5bmMgZnVuY3Rpb24gKG9wdGlvbnMsIHJlc3VsdCkge1xyXG4gICAgLy8gVG9kbyBzb21lIHRoaW5nXHJcblxyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IG9uQmVmb3JlTWFrZTogQnVpbGRIb29rLm9uQmVmb3JlTWFrZSA9IGFzeW5jIGZ1bmN0aW9uIChyb290LCBvcHRpb25zKSB7XHJcbiAgICBjb25zb2xlLmxvZyhgb25CZWZvcmVNYWtlOiByb290OiAke3Jvb3R9LCBvcHRpb25zOiAke29wdGlvbnN9YCk7XHJcbn07XHJcblxyXG5leHBvcnQgY29uc3Qgb25BZnRlck1ha2U6IEJ1aWxkSG9vay5vbkFmdGVyTWFrZSA9IGFzeW5jIGZ1bmN0aW9uIChyb290LCBvcHRpb25zKSB7XHJcbiAgICBjb25zb2xlLmxvZyhgb25BZnRlck1ha2U6IHJvb3Q6ICR7cm9vdH0sIG9wdGlvbnM6ICR7b3B0aW9uc31gKTtcclxufTtcclxuIl19