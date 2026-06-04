import { existsSync, readFileSync, writeFileSync } from 'fs-extra';
import { BasePlatform } from '../platforms/BasePlatform';
export function beforeStartBuild(options: {
    platform: BasePlatform,//平台对象
}, callback: Function) {
    let { platform } = options;
    //构建前工作

    // 检测是否需要修改游戏中平台配置文件
    let { path, isTest } = platform.platformFile;
    if (path && existsSync(path)) {
        let baseUrl = isTest ? 'https://quchuangtest.yundps.com' : 'https://quchuang.yundps.com';
        let domain = isTest ? 'https://mobiletest.yundps.com' : 'https://mobile.yundps.com';
        try {
            let fileContent = readFileSync(path, 'utf-8');
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
                    writeFileSync(path, fileContent, 'utf-8');
                    platform.logHelper.log(`修改${path}成功, ${newBaseUrl} , ${newDomain}`);
                }
                else {
                    platform.logHelper.log(`修改${path}失败,未匹配到baseUrl或domain`);
                }
            }
            else {
                platform.logHelper.log(`修改${path}失败,文件不存在`);
            }
        } catch (error) {
            platform.logHelper.log(`修改${path}失败,${error}`);
        }
    }

    callback();
    if (platform.configData.hookPath) {
        const hook = require(options.platform.configData.hookPath);
        if (hook.beforeStartBuild) {
            hook.beforeStartBuild(options);
        }
    }
}

export function afterBuildFinish(options: {
    platform: BasePlatform
}, callback: Function) {
    let { platform } = options;
    if (platform.configData.hookPath) {
        const hook = require(platform.configData.hookPath);
        if (hook.afterBuildFinish) {
            hook.afterBuildFinish(options);
        }
    }

    if (!platform.skipBuild) {
        platform.postToDingTalk("完成", false);
    }

    //构建完成后工作
    callback();
}