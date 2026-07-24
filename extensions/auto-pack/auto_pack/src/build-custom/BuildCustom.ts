import { existsSync, mkdirSync, moveSync, readFileSync, writeFileSync } from 'fs-extra';
import { BasePlatform } from '../platforms/BasePlatform';
import { join } from 'path';
import { rmdirSync } from 'fs';
export function beforeStartBuild(platform: BasePlatform, callback: Function) {
    // 构建前工作
    // 检测是否需要修改游戏中平台配置文件
    platform.modifyServer = false;
    if (!platform.project.skip) {
        // 检测目标工程里是否使用了build-plugin打包插件，影响打包结果，打包结束后再还原回去
        checkBuildPluginMoveOrRecover(platform.project.path, true);

        let { path, isTest, apiVersion } = platform.platformFile;

        if (path && existsSync(path)) {
            let baseUrl = isTest ? 'https://quchuangtest.yundps.com' : 'https://quchuang.yundps.com';
            let domain = isTest ? 'https://mobiletest.yundps.com' : 'https://mobile.yundps.com';
            try {
                let fileContent = readFileSync(path, 'utf-8');
                if (fileContent) {
                    let newBaseUrl = '';
                    let newDomain = '';
                    let newApiVersion = '';

                    fileContent = fileContent.replace(/(baseUrl|domain)\s*:\s*(["'])[^"']*\2/g, (match, p1, p2) => {
                        let newValue = '';
                        if (p1 === 'baseUrl') {
                            newValue = baseUrl;
                            newBaseUrl = newValue;
                        }
                        else if (p1 === 'domain') {
                            newValue = domain;
                            newDomain = newValue;
                        }
                        return `${p1}: ${p2}${newValue}${p2}`;
                    });

                    if (apiVersion) {
                        fileContent = fileContent.replace(/(apiVersion)\s*:\s*(["'])[^"']*\2/g, (match, p1, p2) => {
                            let newValue = '';
                            if (p1 === 'apiVersion') {
                                newValue = apiVersion;
                                newApiVersion = newValue;
                            }
                            return `${p1}: ${p2}${newValue}${p2}`;
                        });
                    }

                    writeFileSync(path, fileContent, 'utf-8');
                    if (newBaseUrl && newDomain) {
                        platform.modifyServer = true;
                        platform.logHelper.log(`修改服务器成功${path}, ${newBaseUrl} , ${newDomain}`);
                    }
                    if (newApiVersion) {
                        platform.logHelper.log(`修改API版本号成功${path}, ${newApiVersion}`);
                    }
                }
                else {
                    platform.logHelper.log(`修改${path}失败,文件不存在`);
                }
            } catch (error) {
                platform.logHelper.log(`修改${path}失败,${error}`);
            }
        }
    }

    callback && callback();
}

export function afterBuildFinish(platform: BasePlatform, callback: Function) {
    if (!platform.project.skip) {
        platform.postToDingTalk("完成", false);
        // 检测是否需要恢复build-plugin
        checkBuildPluginMoveOrRecover(platform.project.path, false);
    }
    //构建完成后工作
    callback && callback();
}

function checkBuildPluginMoveOrRecover(path: string, isMove: boolean) {
    let pluginRootDirName = ''
    if (existsSync(join(path, 'extensions'))) {
        pluginRootDirName = 'extensions';
    }
    else if (existsSync(join(path, 'packages'))) {
        pluginRootDirName = 'packages';
    }
    if (pluginRootDirName) {
        let buildPluginPath = isMove ? join(path, `${pluginRootDirName}/build-plugin`) : join(path, `${pluginRootDirName}/tmp/build-plugin`);
        if (existsSync(buildPluginPath)) {
            if (isMove) {
                mkdirSync(join(path, `${pluginRootDirName}/tmp`));
                moveSync(buildPluginPath, join(path, `${pluginRootDirName}/tmp/build-plugin`));
            }
            else {
                moveSync(buildPluginPath, join(path, `${pluginRootDirName}/build-plugin`));
                rmdirSync(join(path, `${pluginRootDirName}/tmp`));
            }
        }
    }
}