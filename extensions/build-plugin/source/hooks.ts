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
        let { injectCode, injectFilePath, searchPattern, injectAtTop } = options.packages['build-plugin'];
        if (injectCode === '' || injectFilePath === '') {
            return;
        }
        if (!injectAtTop && searchPattern === '') {
            return;
        }
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
                else {
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
