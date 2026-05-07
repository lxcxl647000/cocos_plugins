import { BuildHook, IBuildResult, ITaskOptions } from '../@types';
import * as fs from 'fs';

export const throwError: BuildHook.throwError = true;

export const load: BuildHook.load = async function () {

};

export const onBeforeBuild: BuildHook.onBeforeBuild = async function (options: ITaskOptions, result: IBuildResult) {
    // TODO some thing
    // log(`${PACKAGE_NAME}.webTestOption`, 'onBeforeBuild');
};

export const onBeforeCompressSettings: BuildHook.onBeforeCompressSettings = async function (options: ITaskOptions, result: IBuildResult) {
    // Todo some thing
    console.debug('get settings test', result.settings);
};

export const onAfterCompressSettings: BuildHook.onAfterCompressSettings = async function (options: ITaskOptions, result: IBuildResult) {
    // Todo some thing
    console.log('webTestOption', 'onAfterCompressSettings');
};

export const onAfterBuild: BuildHook.onAfterBuild = async function (options: ITaskOptions, result: IBuildResult) {
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

export const unload: BuildHook.unload = async function () {

};

export const onError: BuildHook.onError = async function (options, result) {
    // Todo some thing

};

export const onBeforeMake: BuildHook.onBeforeMake = async function (root, options) {
    console.log(`onBeforeMake: root: ${root}, options: ${options}`);
};

export const onAfterMake: BuildHook.onAfterMake = async function (root, options) {
    console.log(`onAfterMake: root: ${root}, options: ${options}`);
};
