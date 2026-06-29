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
    console.log('onBeforeBuild options ', options);
    if (options.platform === 'taobao-mini-game') {
        console.log('before build options : == ', options.packages['build-plugin']);
        let { server, serverFile } = options.packages['build-plugin'];
        if (!serverFile) {
            console.log('before build serverFile is empty');
            return;
        }
        if (!fs.existsSync(serverFile)) {
            console.log('before build serverFile is not exist');
            return;
        }
        let isTest = server === 'test';
        let baseUrl = isTest ? 'https://quchuangtest.yundps.com' : 'https://quchuang.yundps.com';
        let domain = isTest ? 'https://mobiletest.yundps.com' : 'https://mobile.yundps.com';
        try {
            let fileContent = fs.readFileSync(serverFile, 'utf-8');
            if (fileContent) {
                let newBaseUrl = '';
                let newDomain = '';
                fileContent = fileContent.replace(/(baseUrl|domain)\s*:\s*["'][^"']*["']/g, (match, p1) => {
                    const newValue = p1 === 'baseUrl' ? baseUrl : domain;
                    if (p1 === 'baseUrl') {
                        newBaseUrl = newValue;
                    }
                    if (p1 === 'domain') {
                        newDomain = newValue;
                    }
                    return `${p1}: "${newValue}"`;
                });
                if (newBaseUrl && newDomain) {
                    fs.writeFileSync(serverFile, fileContent, 'utf-8');
                    console.log('before build serverFile edit success');
                }
                else {
                    console.log('before build serverFile edit fail not match baseUrl or domain');
                }
            }
            else {
                console.log('before build serverFile edit fail file is not exist');
            }
        }
        catch (error) {
            console.log('before build serverFile edit fail', error);
        }
    }
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
        let { injectCode, injectFilePath, searchPattern, injectAtTop, navigationBarTextStyle } = options.packages['build-plugin'];
        if (injectCode !== '' && injectFilePath !== '') {
            console.log(`${options.platform} : start code inject------`, Editor.Project.path);
            let gameJsPath = Editor.Utils.Path.normalize(`${Editor.Project.path}/build/${options.outputName}/${injectFilePath}`);
            if (!fs.existsSync(gameJsPath)) {
                console.log('gameJsPath is not exist', gameJsPath);
            }
            else {
                console.log('gameJsPath  exist', gameJsPath);
                let content = fs.readFileSync(gameJsPath, 'utf-8');
                if (content) {
                    console.log('get gameJs content ');
                    let isInjected = false;
                    let newContent = content;
                    if (injectAtTop) {
                        newContent = injectCode + content;
                        isInjected = true;
                    }
                    else if (searchPattern !== '') {
                        if (searchPattern.startsWith('/') && searchPattern.endsWith('/')) {
                            // 截取中间部分：(globalThis\s*=\s*\$global\s*;)
                            searchPattern = searchPattern.slice(1, -1);
                        }
                        const SEARCH_PATTERN = new RegExp(searchPattern);
                        if (SEARCH_PATTERN.test(content)) {
                            newContent = content.replace(SEARCH_PATTERN, `$1${injectCode}`);
                            isInjected = newContent !== content;
                        }
                        else {
                            console.log(`cant find ${SEARCH_PATTERN}`);
                        }
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
        // 设置game.json文件中导航栏标题颜色
        let gameJsonPath = Editor.Utils.Path.normalize(`${Editor.Project.path}/build/${options.outputName}/game.json`);
        if (!fs.existsSync(gameJsonPath)) {
            console.log('game.json is not exist', gameJsonPath);
        }
        else {
            console.log('game.json  exist', gameJsonPath);
            let content = fs.readFileSync(gameJsonPath, 'utf-8');
            if (content) {
                console.log('get game.json content ');
                let isInjected = false;
                let newContent = content;
                // 1. 定义正则表达式
                // 解释：
                // ("window"\s*:\s*\{)  -> 第1组：匹配 "window":{
                // ([^}]*)              -> 第2组：匹配大括号内的所有内容（非贪婪，直到遇到第一个 }）
                // (\})                 -> 第3组：匹配结束的 }
                let regex = `/("window"\s*:\s*\{)([^}]*)(\})/`;
                // 2. 定义替换字符串
                // 使用 $1, $2, $3 引用捕获组，并在中间插入新字段（注意前面的逗号）
                const replacement = `$1$2,"navigationBarTextStyle":"${navigationBarTextStyle}"$3`;
                if (regex.startsWith('/') && regex.endsWith('/')) {
                    regex = regex.slice(1, -1);
                }
                const SEARCH_PATTERN = new RegExp(regex);
                if (SEARCH_PATTERN.test(content)) {
                    newContent = content.replace(SEARCH_PATTERN, replacement);
                    isInjected = newContent !== content;
                }
                else {
                    console.log(`cant find game.json ${SEARCH_PATTERN}`);
                }
                if (isInjected) {
                    fs.writeFileSync(gameJsonPath, newContent, 'utf-8');
                    console.log('game.json inject success-------------');
                }
                else {
                    console.log('game.json inject fail-------------');
                }
            }
            else {
                console.log('cant get game.json content ');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG9va3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zb3VyY2UvaG9va3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsdUNBQXlCO0FBRVosUUFBQSxVQUFVLEdBQXlCLElBQUksQ0FBQztBQUU5QyxNQUFNLElBQUksR0FBbUIsS0FBSztBQUV6QyxDQUFDLENBQUM7QUFGVyxRQUFBLElBQUksUUFFZjtBQUVLLE1BQU0sYUFBYSxHQUE0QixLQUFLLFdBQVcsT0FBcUIsRUFBRSxNQUFvQjtJQUM3RyxPQUFPLENBQUMsR0FBRyxDQUFDLHdCQUF3QixFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQy9DLElBQUksT0FBTyxDQUFDLFFBQVEsS0FBSyxrQkFBa0IsRUFBRSxDQUFDO1FBQzFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsNEJBQTRCLEVBQUUsT0FBTyxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO1FBQzVFLElBQUksRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUM5RCxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDZCxPQUFPLENBQUMsR0FBRyxDQUFDLGtDQUFrQyxDQUFDLENBQUM7WUFDaEQsT0FBTztRQUNYLENBQUM7UUFDRCxJQUFJLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO1lBQzdCLE9BQU8sQ0FBQyxHQUFHLENBQUMsc0NBQXNDLENBQUMsQ0FBQztZQUNwRCxPQUFPO1FBQ1gsQ0FBQztRQUNELElBQUksTUFBTSxHQUFHLE1BQU0sS0FBSyxNQUFNLENBQUM7UUFDL0IsSUFBSSxPQUFPLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDLENBQUMsNkJBQTZCLENBQUM7UUFDekYsSUFBSSxNQUFNLEdBQUcsTUFB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RUFBRSxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQUM7b0JBQ3BELE9BQU8sQ0FBQyxHQUFHLENBQUMsdUNBQXVDLENBQUMsQ0FBQztnQkFDekQsQ0FBQztxQkFDSSxDQUFDO29CQUNGLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0NBQW9DLENBQUMsQ0FBQztnQkFDdEQsQ0FBQztZQUNMLENBQUM7aUJBQ0ksQ0FBQztnQkFDRixPQUFPLENBQUMsR0FBRyxDQUFDLDZCQUE2QixDQUFDLENBQUM7WUFDL0MsQ0FBQztRQUNMLENBQUM7SUFDTCxDQUFDO0FBQ0wsQ0FBQyxDQUFDO0FBbEdXLFFBQUEsWUFBWSxnQkFrR3ZCO0FBRUssTUFBTSxNQUFNLEdBQXFCLEtBQUs7QUFFN0MsQ0FBQyxDQUFDO0FBRlcsUUFBQSxNQUFNLFVBRWpCO0FBRUssTUFBTSxPQUFPLEdBQXNCLEtBQUssV0FBVyxPQUFPLEVBQUUsTUFBTTtJQUNyRSxrQkFBa0I7QUFFdEIsQ0FBQyxDQUFDO0FBSFcsUUFBQSxPQUFPLFdBR2xCO0FBRUssTUFBTSxZQUFZLEdBQTJCLEtBQUssV0FBVyxJQUFJLEVBQUUsT0FBTztJQUM3RSxPQUFPLENBQUMsR0FBRyxDQUFDLHVCQUF1QixJQUFJLGNBQWMsT0FBTyxFQUFFLENBQUMsQ0FBQztBQUNwRSxDQUFDLENBQUM7QUFGVyxRQUFBLFlBQVksZ0JBRXZCO0FBRUssTUFBTSxXQUFXLEdBQTBCLEtBQUssV0FBVyxJQUFJLEVBQUUsT0FBTztJQUMzRSxPQUFPLENBQUMsR0FBRyxDQUFDLHNCQUFzQixJQUFJLGNBQWMsT0FBTyxFQUFFLENBQUMsQ0FBQztBQUNuRSxDQUFDLENBQUM7QUFGVyxRQUFBLFdBQVcsZUFFdEIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBCdWlsZEhvb2ssIElCdWlsZFJlc3VsdCwgSVRhc2tPcHRpb25zIH0gZnJvbSAnLi4vQHR5cGVzJztcclxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xyXG5cclxuZXhwb3J0IGNvbnN0IHRocm93RXJyb3I6IEJ1aWxkSG9vay50aHJvd0Vycm9yID0gdHJ1ZTtcclxuXHJcbmV4cG9ydCBjb25zdCBsb2FkOiBCdWlsZEhvb2subG9hZCA9IGFzeW5jIGZ1bmN0aW9uICgpIHtcclxuXHJcbn07XHJcblxyXG5leHBvcnQgY29uc3Qgb25CZWZvcmVCdWlsZDogQnVpbGRIb29rLm9uQmVmb3JlQnVpbGQgPSBhc3luYyBmdW5jdGlvbiAob3B0aW9uczogSVRhc2tPcHRpb25zLCByZXN1bHQ6IElCdWlsZFJlc3VsdCkge1xyXG4gICAgY29uc29sZS5sb2coJ29uQmVmb3JlQnVpbGQgb3B0aW9ucyAnLCBvcHRpb25zKTtcclxuICAgIGlmIChvcHRpb25zLnBsYXRmb3JtID09PSAndGFvYmFvLW1pbmktZ2FtZScpIHtcclxuICAgICAgICBjb25zb2xlLmxvZygnYmVmb3JlIGJ1aWxkIG9wdGlvbnMgOiA9PSAnLCBvcHRpb25zLnBhY2thZ2VzWydidWlsZC1wbHVnaW4nXSk7XHJcbiAgICAgICAgbGV0IHsgc2VydmVyLCBzZXJ2ZXJGaWxlIH0gPSBvcHRpb25zLnBhY2thZ2VzWydidWlsZC1wbHVnaW4nXTtcclxuICAgICAgICBpZiAoIXNlcnZlckZpbGUpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ2JlZm9yZSBidWlsZCBzZXJ2ZXJGaWxlIGlzIGVtcHR5Jyk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKHNlcnZlckZpbGUpKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdiZWZvcmUgYnVpbGQgc2VydmVyRmlsZSBpcyBub3QgZXhpc3QnKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBsZXQgaXNUZXN0ID0gc2VydmVyID09PSAndGVzdCc7XHJcbiAgICAgICAgbGV0IGJhc2VVcmwgPSBpc1Rlc3QgPyAnaHR0cHM6Ly9xdWNodWFuZ3Rlc3QueXVuZHBzLmNvbScgOiAnaHR0cHM6Ly9xdWNodWFuZy55dW5kcHMuY29tJztcclxuICAgICAgICBsZXQgZG9tYWluID0gaXNUZXN0ID8gJ2h0dHBzOi8vbW9iaWxldGVzdC55dW5kcHMuY29tJyA6ICdodHRwczovL21vYmlsZS55dW5kcHMuY29tJztcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBsZXQgZmlsZUNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMoc2VydmVyRmlsZSwgJ3V0Zi04Jyk7XHJcbiAgICAgICAgICAgIGlmIChmaWxlQ29udGVudCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IG5ld0Jhc2VVcmwgPSAnJztcclxuICAgICAgICAgICAgICAgIGxldCBuZXdEb21haW4gPSAnJztcclxuICAgICAgICAgICAgICAgIGZpbGVDb250ZW50ID0gZmlsZUNvbnRlbnQucmVwbGFjZSgvKGJhc2VVcmx8ZG9tYWluKVxccyo6XFxzKltcIiddW15cIiddKltcIiddL2csIChtYXRjaCwgcDEpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdWYWx1ZSA9IHAxID09PSAnYmFzZVVybCcgPyBiYXNlVXJsIDogZG9tYWluO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChwMSA9PT0gJ2Jhc2VVcmwnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld0Jhc2VVcmwgPSBuZXdWYWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHAxID09PSAnZG9tYWluJykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdEb21haW4gPSBuZXdWYWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGAke3AxfTogXCIke25ld1ZhbHVlfVwiYDtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgaWYgKG5ld0Jhc2VVcmwgJiYgbmV3RG9tYWluKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZnMud3JpdGVGaWxlU3luYyhzZXJ2ZXJGaWxlLCBmaWxlQ29udGVudCwgJ3V0Zi04Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2JlZm9yZSBidWlsZCBzZXJ2ZXJGaWxlIGVkaXQgc3VjY2VzcycpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2JlZm9yZSBidWlsZCBzZXJ2ZXJGaWxlIGVkaXQgZmFpbCBub3QgbWF0Y2ggYmFzZVVybCBvciBkb21haW4nKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdiZWZvcmUgYnVpbGQgc2VydmVyRmlsZSBlZGl0IGZhaWwgZmlsZSBpcyBub3QgZXhpc3QnKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdiZWZvcmUgYnVpbGQgc2VydmVyRmlsZSBlZGl0IGZhaWwnLCBlcnJvcik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IG9uQmVmb3JlQ29tcHJlc3NTZXR0aW5nczogQnVpbGRIb29rLm9uQmVmb3JlQ29tcHJlc3NTZXR0aW5ncyA9IGFzeW5jIGZ1bmN0aW9uIChvcHRpb25zOiBJVGFza09wdGlvbnMsIHJlc3VsdDogSUJ1aWxkUmVzdWx0KSB7XHJcbiAgICAvLyBUb2RvIHNvbWUgdGhpbmdcclxuICAgIGNvbnNvbGUuZGVidWcoJ2dldCBzZXR0aW5ncyB0ZXN0JywgcmVzdWx0LnNldHRpbmdzKTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBvbkFmdGVyQ29tcHJlc3NTZXR0aW5nczogQnVpbGRIb29rLm9uQWZ0ZXJDb21wcmVzc1NldHRpbmdzID0gYXN5bmMgZnVuY3Rpb24gKG9wdGlvbnM6IElUYXNrT3B0aW9ucywgcmVzdWx0OiBJQnVpbGRSZXN1bHQpIHtcclxuICAgIC8vIFRvZG8gc29tZSB0aGluZ1xyXG4gICAgY29uc29sZS5sb2coJ3dlYlRlc3RPcHRpb24nLCAnb25BZnRlckNvbXByZXNzU2V0dGluZ3MnKTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBvbkFmdGVyQnVpbGQ6IEJ1aWxkSG9vay5vbkFmdGVyQnVpbGQgPSBhc3luYyBmdW5jdGlvbiAob3B0aW9uczogSVRhc2tPcHRpb25zLCByZXN1bHQ6IElCdWlsZFJlc3VsdCkge1xyXG4gICAgY29uc29sZS5sb2coJ29uQWZ0ZXJCdWlsZCBvcHRpb25zICcsIG9wdGlvbnMpO1xyXG4gICAgaWYgKG9wdGlvbnMucGxhdGZvcm0gPT09ICd0YW9iYW8tbWluaS1nYW1lJykge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdidWlsZCBvcHRpb25zIDogPT0gJywgb3B0aW9ucy5wYWNrYWdlc1snYnVpbGQtcGx1Z2luJ10pO1xyXG4gICAgICAgIGxldCB7IGluamVjdENvZGUsIGluamVjdEZpbGVQYXRoLCBzZWFyY2hQYXR0ZXJuLCBpbmplY3RBdFRvcCwgbmF2aWdhdGlvbkJhclRleHRTdHlsZSB9ID0gb3B0aW9ucy5wYWNrYWdlc1snYnVpbGQtcGx1Z2luJ107XHJcbiAgICAgICAgaWYgKGluamVjdENvZGUgIT09ICcnICYmIGluamVjdEZpbGVQYXRoICE9PSAnJykge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgJHtvcHRpb25zLnBsYXRmb3JtfSA6IHN0YXJ0IGNvZGUgaW5qZWN0LS0tLS0tYCwgRWRpdG9yLlByb2plY3QucGF0aCk7XHJcbiAgICAgICAgICAgIGxldCBnYW1lSnNQYXRoID0gRWRpdG9yLlV0aWxzLlBhdGgubm9ybWFsaXplKGAke0VkaXRvci5Qcm9qZWN0LnBhdGh9L2J1aWxkLyR7b3B0aW9ucy5vdXRwdXROYW1lfS8ke2luamVjdEZpbGVQYXRofWApO1xyXG4gICAgICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoZ2FtZUpzUGF0aCkpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdnYW1lSnNQYXRoIGlzIG5vdCBleGlzdCcsIGdhbWVKc1BhdGgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2dhbWVKc1BhdGggIGV4aXN0JywgZ2FtZUpzUGF0aCk7XHJcbiAgICAgICAgICAgICAgICBsZXQgY29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhnYW1lSnNQYXRoLCAndXRmLTgnKTtcclxuICAgICAgICAgICAgICAgIGlmIChjb250ZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2dldCBnYW1lSnMgY29udGVudCAnKTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgaXNJbmplY3RlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBuZXdDb250ZW50ID0gY29udGVudDtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaW5qZWN0QXRUb3ApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3Q29udGVudCA9IGluamVjdENvZGUgKyBjb250ZW50O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpc0luamVjdGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoc2VhcmNoUGF0dGVybiAhPT0gJycpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNlYXJjaFBhdHRlcm4uc3RhcnRzV2l0aCgnLycpICYmIHNlYXJjaFBhdHRlcm4uZW5kc1dpdGgoJy8nKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5oiq5Y+W5Lit6Ze06YOo5YiG77yaKGdsb2JhbFRoaXNcXHMqPVxccypcXCRnbG9iYWxcXHMqOylcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlYXJjaFBhdHRlcm4gPSBzZWFyY2hQYXR0ZXJuLnNsaWNlKDEsIC0xKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBTRUFSQ0hfUEFUVEVSTiA9IG5ldyBSZWdFeHAoc2VhcmNoUGF0dGVybik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChTRUFSQ0hfUEFUVEVSTi50ZXN0KGNvbnRlbnQpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdDb250ZW50ID0gY29udGVudC5yZXBsYWNlKFNFQVJDSF9QQVRURVJOLCBgJDEke2luamVjdENvZGV9YCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc0luamVjdGVkID0gbmV3Q29udGVudCAhPT0gY29udGVudDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBjYW50IGZpbmQgJHtTRUFSQ0hfUEFUVEVSTn1gKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAoaXNJbmplY3RlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmcy53cml0ZUZpbGVTeW5jKGdhbWVKc1BhdGgsIG5ld0NvbnRlbnQsICd1dGYtOCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnY29kZSBpbmplY3Qgc3VjY2Vzcy0tLS0tLS0tLS0tLS0nKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdjb2RlIGluamVjdCBmYWlsLS0tLS0tLS0tLS0tLScpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdjYW50IGdldCBnYW1lSnMgY29udGVudCAnKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIC8vIOiuvue9rmdhbWUuanNvbuaWh+S7tuS4reWvvOiIquagj+agh+mimOminOiJslxyXG4gICAgICAgIGxldCBnYW1lSnNvblBhdGggPSBFZGl0b3IuVXRpbHMuUGF0aC5ub3JtYWxpemUoYCR7RWRpdG9yLlByb2plY3QucGF0aH0vYnVpbGQvJHtvcHRpb25zLm91dHB1dE5hbWV9L2dhbWUuanNvbmApO1xyXG4gICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhnYW1lSnNvblBhdGgpKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdnYW1lLmpzb24gaXMgbm90IGV4aXN0JywgZ2FtZUpzb25QYXRoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdnYW1lLmpzb24gIGV4aXN0JywgZ2FtZUpzb25QYXRoKTtcclxuICAgICAgICAgICAgbGV0IGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMoZ2FtZUpzb25QYXRoLCAndXRmLTgnKTtcclxuICAgICAgICAgICAgaWYgKGNvbnRlbnQpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdnZXQgZ2FtZS5qc29uIGNvbnRlbnQgJyk7XHJcbiAgICAgICAgICAgICAgICBsZXQgaXNJbmplY3RlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgbGV0IG5ld0NvbnRlbnQgPSBjb250ZW50O1xyXG4gICAgICAgICAgICAgICAgLy8gMS4g5a6a5LmJ5q2j5YiZ6KGo6L6+5byPXHJcbiAgICAgICAgICAgICAgICAvLyDop6Pph4rvvJpcclxuICAgICAgICAgICAgICAgIC8vIChcIndpbmRvd1wiXFxzKjpcXHMqXFx7KSAgLT4g56ysMee7hO+8muWMuemFjSBcIndpbmRvd1wiOntcclxuICAgICAgICAgICAgICAgIC8vIChbXn1dKikgICAgICAgICAgICAgIC0+IOesrDLnu4TvvJrljLnphY3lpKfmi6zlj7flhoXnmoTmiYDmnInlhoXlrrnvvIjpnZ7otKrlqarvvIznm7TliLDpgYfliLDnrKzkuIDkuKogfe+8iVxyXG4gICAgICAgICAgICAgICAgLy8gKFxcfSkgICAgICAgICAgICAgICAgIC0+IOesrDPnu4TvvJrljLnphY3nu5PmnZ/nmoQgfVxyXG4gICAgICAgICAgICAgICAgbGV0IHJlZ2V4ID0gYC8oXCJ3aW5kb3dcIlxccyo6XFxzKlxceykoW159XSopKFxcfSkvYDtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyAyLiDlrprkuYnmm7/mjaLlrZfnrKbkuLJcclxuICAgICAgICAgICAgICAgIC8vIOS9v+eUqCAkMSwgJDIsICQzIOW8leeUqOaNleiOt+e7hO+8jOW5tuWcqOS4remXtOaPkuWFpeaWsOWtl+aute+8iOazqOaEj+WJjemdoueahOmAl+WPt++8iVxyXG4gICAgICAgICAgICAgICAgY29uc3QgcmVwbGFjZW1lbnQgPSBgJDEkMixcIm5hdmlnYXRpb25CYXJUZXh0U3R5bGVcIjpcIiR7bmF2aWdhdGlvbkJhclRleHRTdHlsZX1cIiQzYDtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAocmVnZXguc3RhcnRzV2l0aCgnLycpICYmIHJlZ2V4LmVuZHNXaXRoKCcvJykpIHtcclxuICAgICAgICAgICAgICAgICAgICByZWdleCA9IHJlZ2V4LnNsaWNlKDEsIC0xKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNvbnN0IFNFQVJDSF9QQVRURVJOID0gbmV3IFJlZ0V4cChyZWdleCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoU0VBUkNIX1BBVFRFUk4udGVzdChjb250ZW50KSkge1xyXG4gICAgICAgICAgICAgICAgICAgIG5ld0NvbnRlbnQgPSBjb250ZW50LnJlcGxhY2UoU0VBUkNIX1BBVFRFUk4sIHJlcGxhY2VtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICBpc0luamVjdGVkID0gbmV3Q29udGVudCAhPT0gY29udGVudDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBjYW50IGZpbmQgZ2FtZS5qc29uICR7U0VBUkNIX1BBVFRFUk59YCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAoaXNJbmplY3RlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGZzLndyaXRlRmlsZVN5bmMoZ2FtZUpzb25QYXRoLCBuZXdDb250ZW50LCAndXRmLTgnKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnZ2FtZS5qc29uIGluamVjdCBzdWNjZXNzLS0tLS0tLS0tLS0tLScpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2dhbWUuanNvbiBpbmplY3QgZmFpbC0tLS0tLS0tLS0tLS0nKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdjYW50IGdldCBnYW1lLmpzb24gY29udGVudCAnKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCB1bmxvYWQ6IEJ1aWxkSG9vay51bmxvYWQgPSBhc3luYyBmdW5jdGlvbiAoKSB7XHJcblxyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IG9uRXJyb3I6IEJ1aWxkSG9vay5vbkVycm9yID0gYXN5bmMgZnVuY3Rpb24gKG9wdGlvbnMsIHJlc3VsdCkge1xyXG4gICAgLy8gVG9kbyBzb21lIHRoaW5nXHJcblxyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IG9uQmVmb3JlTWFrZTogQnVpbGRIb29rLm9uQmVmb3JlTWFrZSA9IGFzeW5jIGZ1bmN0aW9uIChyb290LCBvcHRpb25zKSB7XHJcbiAgICBjb25zb2xlLmxvZyhgb25CZWZvcmVNYWtlOiByb290OiAke3Jvb3R9LCBvcHRpb25zOiAke29wdGlvbnN9YCk7XHJcbn07XHJcblxyXG5leHBvcnQgY29uc3Qgb25BZnRlck1ha2U6IEJ1aWxkSG9vay5vbkFmdGVyTWFrZSA9IGFzeW5jIGZ1bmN0aW9uIChyb290LCBvcHRpb25zKSB7XHJcbiAgICBjb25zb2xlLmxvZyhgb25BZnRlck1ha2U6IHJvb3Q6ICR7cm9vdH0sIG9wdGlvbnM6ICR7b3B0aW9uc31gKTtcclxufTtcclxuIl19