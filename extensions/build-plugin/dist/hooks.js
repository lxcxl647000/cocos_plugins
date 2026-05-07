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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG9va3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zb3VyY2UvaG9va3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsdUNBQXlCO0FBRVosUUFBQSxVQUFVLEdBQXlCLElBQUksQ0FBQztBQUU5QyxNQUFNLElBQUksR0FBbUIsS0FBSztBQUV6QyxDQUFDLENBQUM7QUFGVyxRQUFBLElBQUksUUFFZjtBQUVLLE1BQU0sYUFBYSxHQUE0QixLQUFLLFdBQVcsT0FBcUIsRUFBRSxNQUFvQjtJQUM3RyxrQkFBa0I7SUFDbEIseURBQXlEO0FBQzdELENBQUMsQ0FBQztBQUhXLFFBQUEsYUFBYSxpQkFHeEI7QUFFSyxNQUFNLHdCQUF3QixHQUF1QyxLQUFLLFdBQVcsT0FBcUIsRUFBRSxNQUFvQjtJQUNuSSxrQkFBa0I7SUFDbEIsT0FBTyxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDeEQsQ0FBQyxDQUFDO0FBSFcsUUFBQSx3QkFBd0IsNEJBR25DO0FBRUssTUFBTSx1QkFBdUIsR0FBc0MsS0FBSyxXQUFXLE9BQXFCLEVBQUUsTUFBb0I7SUFDakksa0JBQWtCO0lBQ2xCLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxFQUFFLHlCQUF5QixDQUFDLENBQUM7QUFDNUQsQ0FBQyxDQUFDO0FBSFcsUUFBQSx1QkFBdUIsMkJBR2xDO0FBRUssTUFBTSxZQUFZLEdBQTJCLEtBQUssV0FBVyxPQUFxQixFQUFFLE1BQW9CO0lBQzNHLE9BQU8sQ0FBQyxHQUFHLENBQUMsdUJBQXVCLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDOUMsSUFBSSxPQUFPLENBQUMsUUFBUSxLQUFLLGtCQUFrQixFQUFFLENBQUM7UUFDMUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsRUFBRSxPQUFPLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxDQUFD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T0FBTyxFQUFFLENBQUMsQ0FBQztBQUNuRSxDQUFDLENBQUM7QUFGVyxRQUFBLFdBQVcsZUFFdEIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBCdWlsZEhvb2ssIElCdWlsZFJlc3VsdCwgSVRhc2tPcHRpb25zIH0gZnJvbSAnLi4vQHR5cGVzJztcclxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xyXG5cclxuZXhwb3J0IGNvbnN0IHRocm93RXJyb3I6IEJ1aWxkSG9vay50aHJvd0Vycm9yID0gdHJ1ZTtcclxuXHJcbmV4cG9ydCBjb25zdCBsb2FkOiBCdWlsZEhvb2subG9hZCA9IGFzeW5jIGZ1bmN0aW9uICgpIHtcclxuXHJcbn07XHJcblxyXG5leHBvcnQgY29uc3Qgb25CZWZvcmVCdWlsZDogQnVpbGRIb29rLm9uQmVmb3JlQnVpbGQgPSBhc3luYyBmdW5jdGlvbiAob3B0aW9uczogSVRhc2tPcHRpb25zLCByZXN1bHQ6IElCdWlsZFJlc3VsdCkge1xyXG4gICAgLy8gVE9ETyBzb21lIHRoaW5nXHJcbiAgICAvLyBsb2coYCR7UEFDS0FHRV9OQU1FfS53ZWJUZXN0T3B0aW9uYCwgJ29uQmVmb3JlQnVpbGQnKTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBvbkJlZm9yZUNvbXByZXNzU2V0dGluZ3M6IEJ1aWxkSG9vay5vbkJlZm9yZUNvbXByZXNzU2V0dGluZ3MgPSBhc3luYyBmdW5jdGlvbiAob3B0aW9uczogSVRhc2tPcHRpb25zLCByZXN1bHQ6IElCdWlsZFJlc3VsdCkge1xyXG4gICAgLy8gVG9kbyBzb21lIHRoaW5nXHJcbiAgICBjb25zb2xlLmRlYnVnKCdnZXQgc2V0dGluZ3MgdGVzdCcsIHJlc3VsdC5zZXR0aW5ncyk7XHJcbn07XHJcblxyXG5leHBvcnQgY29uc3Qgb25BZnRlckNvbXByZXNzU2V0dGluZ3M6IEJ1aWxkSG9vay5vbkFmdGVyQ29tcHJlc3NTZXR0aW5ncyA9IGFzeW5jIGZ1bmN0aW9uIChvcHRpb25zOiBJVGFza09wdGlvbnMsIHJlc3VsdDogSUJ1aWxkUmVzdWx0KSB7XHJcbiAgICAvLyBUb2RvIHNvbWUgdGhpbmdcclxuICAgIGNvbnNvbGUubG9nKCd3ZWJUZXN0T3B0aW9uJywgJ29uQWZ0ZXJDb21wcmVzc1NldHRpbmdzJyk7XHJcbn07XHJcblxyXG5leHBvcnQgY29uc3Qgb25BZnRlckJ1aWxkOiBCdWlsZEhvb2sub25BZnRlckJ1aWxkID0gYXN5bmMgZnVuY3Rpb24gKG9wdGlvbnM6IElUYXNrT3B0aW9ucywgcmVzdWx0OiBJQnVpbGRSZXN1bHQpIHtcclxuICAgIGNvbnNvbGUubG9nKCdvbkFmdGVyQnVpbGQgb3B0aW9ucyAnLCBvcHRpb25zKTtcclxuICAgIGlmIChvcHRpb25zLnBsYXRmb3JtID09PSAndGFvYmFvLW1pbmktZ2FtZScpIHtcclxuICAgICAgICBjb25zb2xlLmxvZygnYnVpbGQgb3B0aW9ucyA6ID09ICcsIG9wdGlvbnMucGFja2FnZXNbJ2J1aWxkLXBsdWdpbiddKTtcclxuICAgICAgICBsZXQgeyBpbmplY3RDb2RlLCBpbmplY3RGaWxlUGF0aCwgc2VhcmNoUGF0dGVybiwgaW5qZWN0QXRUb3AsIG5hdmlnYXRpb25CYXJUZXh0U3R5bGUgfSA9IG9wdGlvbnMucGFja2FnZXNbJ2J1aWxkLXBsdWdpbiddO1xyXG4gICAgICAgIGlmIChpbmplY3RDb2RlICE9PSAnJyAmJiBpbmplY3RGaWxlUGF0aCAhPT0gJycpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coYCR7b3B0aW9ucy5wbGF0Zm9ybX0gOiBzdGFydCBjb2RlIGluamVjdC0tLS0tLWAsIEVkaXRvci5Qcm9qZWN0LnBhdGgpO1xyXG4gICAgICAgICAgICBsZXQgZ2FtZUpzUGF0aCA9IEVkaXRvci5VdGlscy5QYXRoLm5vcm1hbGl6ZShgJHtFZGl0b3IuUHJvamVjdC5wYXRofS9idWlsZC8ke29wdGlvbnMub3V0cHV0TmFtZX0vJHtpbmplY3RGaWxlUGF0aH1gKTtcclxuICAgICAgICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKGdhbWVKc1BhdGgpKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnZ2FtZUpzUGF0aCBpcyBub3QgZXhpc3QnLCBnYW1lSnNQYXRoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdnYW1lSnNQYXRoICBleGlzdCcsIGdhbWVKc1BhdGgpO1xyXG4gICAgICAgICAgICAgICAgbGV0IGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMoZ2FtZUpzUGF0aCwgJ3V0Zi04Jyk7XHJcbiAgICAgICAgICAgICAgICBpZiAoY29udGVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdnZXQgZ2FtZUpzIGNvbnRlbnQgJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGlzSW5qZWN0ZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgbmV3Q29udGVudCA9IGNvbnRlbnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluamVjdEF0VG9wKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld0NvbnRlbnQgPSBpbmplY3RDb2RlICsgY29udGVudDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXNJbmplY3RlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKHNlYXJjaFBhdHRlcm4gIT09ICcnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzZWFyY2hQYXR0ZXJuLnN0YXJ0c1dpdGgoJy8nKSAmJiBzZWFyY2hQYXR0ZXJuLmVuZHNXaXRoKCcvJykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOaIquWPluS4remXtOmDqOWIhu+8mihnbG9iYWxUaGlzXFxzKj1cXHMqXFwkZ2xvYmFsXFxzKjspXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWFyY2hQYXR0ZXJuID0gc2VhcmNoUGF0dGVybi5zbGljZSgxLCAtMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgU0VBUkNIX1BBVFRFUk4gPSBuZXcgUmVnRXhwKHNlYXJjaFBhdHRlcm4pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoU0VBUkNIX1BBVFRFUk4udGVzdChjb250ZW50KSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3Q29udGVudCA9IGNvbnRlbnQucmVwbGFjZShTRUFSQ0hfUEFUVEVSTiwgYCQxJHtpbmplY3RDb2RlfWApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNJbmplY3RlZCA9IG5ld0NvbnRlbnQgIT09IGNvbnRlbnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgY2FudCBmaW5kICR7U0VBUkNIX1BBVFRFUk59YCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzSW5qZWN0ZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZnMud3JpdGVGaWxlU3luYyhnYW1lSnNQYXRoLCBuZXdDb250ZW50LCAndXRmLTgnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2NvZGUgaW5qZWN0IHN1Y2Nlc3MtLS0tLS0tLS0tLS0tJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnY29kZSBpbmplY3QgZmFpbC0tLS0tLS0tLS0tLS0nKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnY2FudCBnZXQgZ2FtZUpzIGNvbnRlbnQgJyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAvLyDorr7nva5nYW1lLmpzb27mlofku7bkuK3lr7zoiKrmoI/moIfpopjpopzoibJcclxuICAgICAgICBsZXQgZ2FtZUpzb25QYXRoID0gRWRpdG9yLlV0aWxzLlBhdGgubm9ybWFsaXplKGAke0VkaXRvci5Qcm9qZWN0LnBhdGh9L2J1aWxkLyR7b3B0aW9ucy5vdXRwdXROYW1lfS9nYW1lLmpzb25gKTtcclxuICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoZ2FtZUpzb25QYXRoKSkge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZ2FtZS5qc29uIGlzIG5vdCBleGlzdCcsIGdhbWVKc29uUGF0aCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZ2FtZS5qc29uICBleGlzdCcsIGdhbWVKc29uUGF0aCk7XHJcbiAgICAgICAgICAgIGxldCBjb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKGdhbWVKc29uUGF0aCwgJ3V0Zi04Jyk7XHJcbiAgICAgICAgICAgIGlmIChjb250ZW50KSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnZ2V0IGdhbWUuanNvbiBjb250ZW50ICcpO1xyXG4gICAgICAgICAgICAgICAgbGV0IGlzSW5qZWN0ZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIGxldCBuZXdDb250ZW50ID0gY29udGVudDtcclxuICAgICAgICAgICAgICAgIC8vIDEuIOWumuS5ieato+WImeihqOi+vuW8j1xyXG4gICAgICAgICAgICAgICAgLy8g6Kej6YeK77yaXHJcbiAgICAgICAgICAgICAgICAvLyAoXCJ3aW5kb3dcIlxccyo6XFxzKlxceykgIC0+IOesrDHnu4TvvJrljLnphY0gXCJ3aW5kb3dcIjp7XHJcbiAgICAgICAgICAgICAgICAvLyAoW159XSopICAgICAgICAgICAgICAtPiDnrKwy57uE77ya5Yy56YWN5aSn5ous5Y+35YaF55qE5omA5pyJ5YaF5a6577yI6Z2e6LSq5amq77yM55u05Yiw6YGH5Yiw56ys5LiA5LiqIH3vvIlcclxuICAgICAgICAgICAgICAgIC8vIChcXH0pICAgICAgICAgICAgICAgICAtPiDnrKwz57uE77ya5Yy56YWN57uT5p2f55qEIH1cclxuICAgICAgICAgICAgICAgIGxldCByZWdleCA9IGAvKFwid2luZG93XCJcXHMqOlxccypcXHspKFtefV0qKShcXH0pL2A7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gMi4g5a6a5LmJ5pu/5o2i5a2X56ym5LiyXHJcbiAgICAgICAgICAgICAgICAvLyDkvb/nlKggJDEsICQyLCAkMyDlvJXnlKjmjZXojrfnu4TvvIzlubblnKjkuK3pl7Tmj5LlhaXmlrDlrZfmrrXvvIjms6jmhI/liY3pnaLnmoTpgJflj7fvvIlcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlcGxhY2VtZW50ID0gYCQxJDIsXCJuYXZpZ2F0aW9uQmFyVGV4dFN0eWxlXCI6XCIke25hdmlnYXRpb25CYXJUZXh0U3R5bGV9XCIkM2A7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHJlZ2V4LnN0YXJ0c1dpdGgoJy8nKSAmJiByZWdleC5lbmRzV2l0aCgnLycpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVnZXggPSByZWdleC5zbGljZSgxLCAtMSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjb25zdCBTRUFSQ0hfUEFUVEVSTiA9IG5ldyBSZWdFeHAocmVnZXgpO1xyXG4gICAgICAgICAgICAgICAgaWYgKFNFQVJDSF9QQVRURVJOLnRlc3QoY29udGVudCkpIHtcclxuICAgICAgICAgICAgICAgICAgICBuZXdDb250ZW50ID0gY29udGVudC5yZXBsYWNlKFNFQVJDSF9QQVRURVJOLCByZXBsYWNlbWVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaXNJbmplY3RlZCA9IG5ld0NvbnRlbnQgIT09IGNvbnRlbnQ7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgY2FudCBmaW5kIGdhbWUuanNvbiAke1NFQVJDSF9QQVRURVJOfWApO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKGlzSW5qZWN0ZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBmcy53cml0ZUZpbGVTeW5jKGdhbWVKc29uUGF0aCwgbmV3Q29udGVudCwgJ3V0Zi04Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2dhbWUuanNvbiBpbmplY3Qgc3VjY2Vzcy0tLS0tLS0tLS0tLS0nKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdnYW1lLmpzb24gaW5qZWN0IGZhaWwtLS0tLS0tLS0tLS0tJyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnY2FudCBnZXQgZ2FtZS5qc29uIGNvbnRlbnQgJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbn07XHJcblxyXG5leHBvcnQgY29uc3QgdW5sb2FkOiBCdWlsZEhvb2sudW5sb2FkID0gYXN5bmMgZnVuY3Rpb24gKCkge1xyXG5cclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBvbkVycm9yOiBCdWlsZEhvb2sub25FcnJvciA9IGFzeW5jIGZ1bmN0aW9uIChvcHRpb25zLCByZXN1bHQpIHtcclxuICAgIC8vIFRvZG8gc29tZSB0aGluZ1xyXG5cclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBvbkJlZm9yZU1ha2U6IEJ1aWxkSG9vay5vbkJlZm9yZU1ha2UgPSBhc3luYyBmdW5jdGlvbiAocm9vdCwgb3B0aW9ucykge1xyXG4gICAgY29uc29sZS5sb2coYG9uQmVmb3JlTWFrZTogcm9vdDogJHtyb290fSwgb3B0aW9uczogJHtvcHRpb25zfWApO1xyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IG9uQWZ0ZXJNYWtlOiBCdWlsZEhvb2sub25BZnRlck1ha2UgPSBhc3luYyBmdW5jdGlvbiAocm9vdCwgb3B0aW9ucykge1xyXG4gICAgY29uc29sZS5sb2coYG9uQWZ0ZXJNYWtlOiByb290OiAke3Jvb3R9LCBvcHRpb25zOiAke29wdGlvbnN9YCk7XHJcbn07XHJcbiJdfQ==