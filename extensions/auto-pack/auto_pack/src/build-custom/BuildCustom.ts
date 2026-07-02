import { existsSync, mkdirSync, moveSync, readFileSync, writeFileSync } from 'fs-extra';
import { BasePlatform } from '../platforms/BasePlatform';
import { join } from 'path';
import { rmdirSync } from 'fs';
export function beforeStartBuild(platform: BasePlatform, callback: Function) {
    // 构建前工作
    // 检测目标工程里是否使用了build-plugin打包插件，影响打包结果，打包结束后再还原回去
    let buildPluginPath = join(platform.project.path, 'extensions/build-plugin');
    if (existsSync(buildPluginPath)) {
        mkdirSync(join(platform.project.path, 'extensions/tmp'));
        moveSync(buildPluginPath, join(platform.project.path, 'extensions/tmp/build-plugin'));
    }

    // 检测是否需要修改游戏中平台配置文件
    platform.modifyServer = false;
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
                    platform.modifyServer = true;
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
}

export function afterBuildFinish(platform: BasePlatform, callback: Function) {
    if (!platform.project.skip) {
        platform.postToDingTalk("完成", false);
    }
    //构建完成后工作
    callback();
    // 检测是否需要恢复build-plugin
    let buildPluginPath = join(platform.project.path, 'extensions/tmp/build-plugin');
    if (existsSync(buildPluginPath)) {
        moveSync(buildPluginPath, join(platform.project.path, 'extensions/build-plugin'));
        rmdirSync(join(platform.project.path, 'extensions/tmp'));
    }
}