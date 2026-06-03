
import { BasePlatform } from '../platforms/BasePlatform';
export function beforeStartBuild(options: {
    platform: BasePlatform,//平台对象
}, callback: Function) {
    //构建前工作

    callback();
    if (options.platform.configData.hookPath) {
        const hook = require(options.platform.configData.hookPath);
        if (hook.beforeStartBuild) {
            hook.beforeStartBuild(options);
        }
    }
}

export function afterBuildFinish(options: {
    platform: BasePlatform
}, callback: Function) {
    if (options.platform.configData.hookPath) {
        const hook = require(options.platform.configData.hookPath);
        if (hook.afterBuildFinish) {
            hook.afterBuildFinish(options);
        }
    }

    if (!options.platform.skipBuild) {
        options.platform.postToDingTalk("完成", false);
    }

    //构建完成后工作
    callback();
}