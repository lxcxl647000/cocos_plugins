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
        let { injectCode, injectFileName, searchPattern } = options.packages['build-plugin'];
        if (injectCode === '' || injectFileName === '' || searchPattern === '') {
            return;
        }
        console.log(`${options.platform} : start code inject------`, Editor.Project.path);
        // const SEARCH_PATTERN = /(globalThis\s*=\s*\$global\s*;)/;
        if (searchPattern.startsWith('/') && searchPattern.endsWith('/')) {
            // 截取中间部分：(globalThis\s*=\s*\$global\s*;)
            searchPattern = searchPattern.slice(1, -1);
        }
        const SEARCH_PATTERN = new RegExp(searchPattern);
        let gameJsPath = Editor.Utils.Path.normalize(`${Editor.Project.path}/build/${options.outputName}/${injectFileName}`);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG9va3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zb3VyY2UvaG9va3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsdUNBQXlCO0FBRVosUUFBQSxVQUFVLEdBQXlCLElBQUksQ0FBQztBQUU5QyxNQUFNLElBQUksR0FBbUIsS0FBSztBQUV6QyxDQUFDLENBQUM7QUFGVyxRQUFBLElBQUksUUFFZjtBQUVLLE1BQU0sYUFBYSxHQUE0QixLQUFLLFdBQVcsT0FBcUIsRUFBRSxNQUFvQjtJQUM3RyxrQkFBa0I7SUFDbEIseURBQXlEO0FBQzdELENBQUMsQ0FBQztBQUhXLFFBQUEsYUFBYSxpQkFHeEI7QUFFSyxNQUFNLHdCQUF3QixHQUF1QyxLQUFLLFdBQVcsT0FBcUIsRUFBRSxNQUFvQjtJQUNuSSxrQkFBa0I7SUFDbEIsT0FBTyxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDeEQsQ0FBQyxDQUFDO0FBSFcsUUFBQSx3QkFBd0IsNEJBR25DO0FBRUssTUFBTSx1QkFBdUIsR0FBc0MsS0FBSyxXQUFXLE9BQXFCLEVBQUUsTUFBb0I7SUFDakksa0JBQWtCO0lBQ2xCLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxFQUFFLHlCQUF5QixDQUFDLENBQUM7QUFDNUQsQ0FBQyxDQUFDO0FBSFcsUUFBQSx1QkFBdUIsMkJBR2xDO0FBRUssTUFBTSxZQUFZLEdBQTJCLEtBQUssV0FBVyxPQUFxQixFQUFFLE1BQW9CO0lBQzNHLE9BQU8sQ0FBQyxHQUFHLENBQUMsdUJBQXVCLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDOUMsSUFBSSxPQUFPLENBQUMsUUFBUSxLQUFLLGtCQUFrQixFQUFFLENBQUM7UUFDMUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsRUFBRSxPQUFPLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxDQUFD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LEdBQTJCLEtBQUssV0FBVyxJQUFJLEVBQUUsT0FBTztJQUM3RSxPQUFPLENBQUMsR0FBRyxDQUFDLHVCQUF1QixJQUFJLGNBQWMsT0FBTyxFQUFFLENBQUMsQ0FBQztBQUNwRSxDQUFDLENBQUM7QUFGVyxRQUFBLFlBQVksZ0JBRXZCO0FBRUssTUFBTSxXQUFXLEdBQTBCLEtBQUssV0FBVyxJQUFJLEVBQUUsT0FBTztJQUMzRSxPQUFPLENBQUMsR0FBRyxDQUFDLHNCQUFzQixJQUFJLGNBQWMsT0FBTyxFQUFFLENBQUMsQ0FBQztBQUNuRSxDQUFDLENBQUM7QUFGVyxRQUFBLFdBQVcsZUFFdEIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBCdWlsZEhvb2ssIElCdWlsZFJlc3VsdCwgSVRhc2tPcHRpb25zIH0gZnJvbSAnLi4vQHR5cGVzJztcclxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xyXG5cclxuZXhwb3J0IGNvbnN0IHRocm93RXJyb3I6IEJ1aWxkSG9vay50aHJvd0Vycm9yID0gdHJ1ZTtcclxuXHJcbmV4cG9ydCBjb25zdCBsb2FkOiBCdWlsZEhvb2subG9hZCA9IGFzeW5jIGZ1bmN0aW9uICgpIHtcclxuXHJcbn07XHJcblxyXG5leHBvcnQgY29uc3Qgb25CZWZvcmVCdWlsZDogQnVpbGRIb29rLm9uQmVmb3JlQnVpbGQgPSBhc3luYyBmdW5jdGlvbiAob3B0aW9uczogSVRhc2tPcHRpb25zLCByZXN1bHQ6IElCdWlsZFJlc3VsdCkge1xyXG4gICAgLy8gVE9ETyBzb21lIHRoaW5nXHJcbiAgICAvLyBsb2coYCR7UEFDS0FHRV9OQU1FfS53ZWJUZXN0T3B0aW9uYCwgJ29uQmVmb3JlQnVpbGQnKTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBvbkJlZm9yZUNvbXByZXNzU2V0dGluZ3M6IEJ1aWxkSG9vay5vbkJlZm9yZUNvbXByZXNzU2V0dGluZ3MgPSBhc3luYyBmdW5jdGlvbiAob3B0aW9uczogSVRhc2tPcHRpb25zLCByZXN1bHQ6IElCdWlsZFJlc3VsdCkge1xyXG4gICAgLy8gVG9kbyBzb21lIHRoaW5nXHJcbiAgICBjb25zb2xlLmRlYnVnKCdnZXQgc2V0dGluZ3MgdGVzdCcsIHJlc3VsdC5zZXR0aW5ncyk7XHJcbn07XHJcblxyXG5leHBvcnQgY29uc3Qgb25BZnRlckNvbXByZXNzU2V0dGluZ3M6IEJ1aWxkSG9vay5vbkFmdGVyQ29tcHJlc3NTZXR0aW5ncyA9IGFzeW5jIGZ1bmN0aW9uIChvcHRpb25zOiBJVGFza09wdGlvbnMsIHJlc3VsdDogSUJ1aWxkUmVzdWx0KSB7XHJcbiAgICAvLyBUb2RvIHNvbWUgdGhpbmdcclxuICAgIGNvbnNvbGUubG9nKCd3ZWJUZXN0T3B0aW9uJywgJ29uQWZ0ZXJDb21wcmVzc1NldHRpbmdzJyk7XHJcbn07XHJcblxyXG5leHBvcnQgY29uc3Qgb25BZnRlckJ1aWxkOiBCdWlsZEhvb2sub25BZnRlckJ1aWxkID0gYXN5bmMgZnVuY3Rpb24gKG9wdGlvbnM6IElUYXNrT3B0aW9ucywgcmVzdWx0OiBJQnVpbGRSZXN1bHQpIHtcclxuICAgIGNvbnNvbGUubG9nKCdvbkFmdGVyQnVpbGQgb3B0aW9ucyAnLCBvcHRpb25zKTtcclxuICAgIGlmIChvcHRpb25zLnBsYXRmb3JtID09PSAndGFvYmFvLW1pbmktZ2FtZScpIHtcclxuICAgICAgICBjb25zb2xlLmxvZygnYnVpbGQgb3B0aW9ucyA6ID09ICcsIG9wdGlvbnMucGFja2FnZXNbJ2J1aWxkLXBsdWdpbiddKTtcclxuICAgICAgICBsZXQgeyBpbmplY3RDb2RlLCBpbmplY3RGaWxlTmFtZSwgc2VhcmNoUGF0dGVybiB9ID0gb3B0aW9ucy5wYWNrYWdlc1snYnVpbGQtcGx1Z2luJ107XHJcbiAgICAgICAgaWYgKGluamVjdENvZGUgPT09ICcnIHx8IGluamVjdEZpbGVOYW1lID09PSAnJyB8fCBzZWFyY2hQYXR0ZXJuID09PSAnJykge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnNvbGUubG9nKGAke29wdGlvbnMucGxhdGZvcm19IDogc3RhcnQgY29kZSBpbmplY3QtLS0tLS1gLCBFZGl0b3IuUHJvamVjdC5wYXRoKTtcclxuICAgICAgICAvLyBjb25zdCBTRUFSQ0hfUEFUVEVSTiA9IC8oZ2xvYmFsVGhpc1xccyo9XFxzKlxcJGdsb2JhbFxccyo7KS87XHJcbiAgICAgICAgaWYgKHNlYXJjaFBhdHRlcm4uc3RhcnRzV2l0aCgnLycpICYmIHNlYXJjaFBhdHRlcm4uZW5kc1dpdGgoJy8nKSkge1xyXG4gICAgICAgICAgICAvLyDmiKrlj5bkuK3pl7Tpg6jliIbvvJooZ2xvYmFsVGhpc1xccyo9XFxzKlxcJGdsb2JhbFxccyo7KVxyXG4gICAgICAgICAgICBzZWFyY2hQYXR0ZXJuID0gc2VhcmNoUGF0dGVybi5zbGljZSgxLCAtMSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnN0IFNFQVJDSF9QQVRURVJOID0gbmV3IFJlZ0V4cChzZWFyY2hQYXR0ZXJuKTtcclxuICAgICAgICBsZXQgZ2FtZUpzUGF0aCA9IEVkaXRvci5VdGlscy5QYXRoLm5vcm1hbGl6ZShgJHtFZGl0b3IuUHJvamVjdC5wYXRofS9idWlsZC8ke29wdGlvbnMub3V0cHV0TmFtZX0vJHtpbmplY3RGaWxlTmFtZX1gKTtcclxuICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoZ2FtZUpzUGF0aCkpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ2dhbWVKc1BhdGggaXMgbm90IGV4aXN0JywgZ2FtZUpzUGF0aCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZ2FtZUpzUGF0aCAgZXhpc3QnLCBnYW1lSnNQYXRoKTtcclxuICAgICAgICAgICAgbGV0IGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMoZ2FtZUpzUGF0aCwgJ3V0Zi04Jyk7XHJcbiAgICAgICAgICAgIGlmIChjb250ZW50KSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnZ2V0IGdhbWVKcyBjb250ZW50ICcpO1xyXG4gICAgICAgICAgICAgICAgbGV0IG5ld0NvbnRlbnQgPSBjb250ZW50O1xyXG4gICAgICAgICAgICAgICAgbGV0IGlzSW5qZWN0ZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIGlmIChTRUFSQ0hfUEFUVEVSTi50ZXN0KGNvbnRlbnQpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3Q29udGVudCA9IGNvbnRlbnQucmVwbGFjZShTRUFSQ0hfUEFUVEVSTiwgYCQxJHtpbmplY3RDb2RlfWApO1xyXG4gICAgICAgICAgICAgICAgICAgIGlzSW5qZWN0ZWQgPSBuZXdDb250ZW50ICE9PSBjb250ZW50O1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYGNhbnQgZmluZCAke1NFQVJDSF9QQVRURVJOfWApO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmIChpc0luamVjdGVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZnMud3JpdGVGaWxlU3luYyhnYW1lSnNQYXRoLCBuZXdDb250ZW50LCAndXRmLTgnKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnY29kZSBpbmplY3Qgc3VjY2Vzcy0tLS0tLS0tLS0tLS0nKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdjb2RlIGluamVjdCBmYWlsLS0tLS0tLS0tLS0tLScpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2NhbnQgZ2V0IGdhbWVKcyBjb250ZW50ICcpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IHVubG9hZDogQnVpbGRIb29rLnVubG9hZCA9IGFzeW5jIGZ1bmN0aW9uICgpIHtcclxuXHJcbn07XHJcblxyXG5leHBvcnQgY29uc3Qgb25FcnJvcjogQnVpbGRIb29rLm9uRXJyb3IgPSBhc3luYyBmdW5jdGlvbiAob3B0aW9ucywgcmVzdWx0KSB7XHJcbiAgICAvLyBUb2RvIHNvbWUgdGhpbmdcclxuXHJcbn07XHJcblxyXG5leHBvcnQgY29uc3Qgb25CZWZvcmVNYWtlOiBCdWlsZEhvb2sub25CZWZvcmVNYWtlID0gYXN5bmMgZnVuY3Rpb24gKHJvb3QsIG9wdGlvbnMpIHtcclxuICAgIGNvbnNvbGUubG9nKGBvbkJlZm9yZU1ha2U6IHJvb3Q6ICR7cm9vdH0sIG9wdGlvbnM6ICR7b3B0aW9uc31gKTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBvbkFmdGVyTWFrZTogQnVpbGRIb29rLm9uQWZ0ZXJNYWtlID0gYXN5bmMgZnVuY3Rpb24gKHJvb3QsIG9wdGlvbnMpIHtcclxuICAgIGNvbnNvbGUubG9nKGBvbkFmdGVyTWFrZTogcm9vdDogJHtyb290fSwgb3B0aW9uczogJHtvcHRpb25zfWApO1xyXG59O1xyXG4iXX0=