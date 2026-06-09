import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

/**
 * @en Registration method for the main process of Extension
 * @zh 为扩展的主进程的注册方法
 */
export const methods: { [key: string]: (...any: any) => any } = {
    /**
     * @en A method that can be triggered by message
     * @zh 通过 message 触发的方法
     */

    // 导出自动化工具，导出前需要把自动化工程中的package.json中的更新自动化工具按钮的配置删掉，导出的插件不需要更新功能
    exportAutoPack() {
        // 修改auto-pack的package.json
        let autoPackPackageJson = join(__dirname, '../../auto-pack/package.json');
        if (existsSync(autoPackPackageJson)) {
            console.log('开始修改auto-pack的package.json，删除更新自动化工具按钮');
            let fixPackageJson = (path: string, isDelete: boolean) => {
                let content = readFileSync(path, 'utf-8');
                let data = JSON.parse(content);
                // { path: 'auto-pack', label: '更新自动化工具', message: 'update-tool' }
                if (isDelete) {
                    data.contributions.menu = data.contributions.menu.filter((menu: { path: string, label: string, message: string }) => menu.message !== 'update-tool');
                }
                else {
                    data.contributions.menu.push({ path: 'auto-pack', label: '更新自动化工具', message: 'update-tool' });
                }
                content = JSON.stringify(data, null, 4);
                writeFileSync(autoPackPackageJson, content, 'utf-8');
            };
            fixPackageJson(autoPackPackageJson, true);

            // 更新一次插件
            let autoPackDir = join(__dirname, '../../auto-pack/auto_pack');
            if (existsSync(autoPackDir)) {
                console.log('开始更新自动化代码，并拷贝到静态文件路径下');
                // 更新自动化代码，并拷贝到静态文件路径下
                let sp: ChildProcessWithoutNullStreams = spawn("npm", ['run', 'bc'], { shell: true, cwd: autoPackDir });
                sp.stdout.setEncoding('utf8');
                sp.stdout.on('data', (data) => {
                    console.log(`stdout build&copy: ${data}`);
                });
                sp.stderr.on('data', (data) => {
                    console.log(`stderr build&copy: ${data}`);
                })
                sp.on('exit', (code, data) => {
                    if (code === 0) {
                        console.log(`exit build&copy suscess ${data}`);
                        autoPackDir = join(__dirname, '../../auto-pack');
                        if (existsSync(autoPackDir)) {
                            console.log('开始更新自动化插件');
                            // 更新自动化插件
                            let sp2: ChildProcessWithoutNullStreams = spawn("npm", ['run', 'build'], { shell: true, cwd: autoPackDir });
                            sp2.stdout.setEncoding('utf8');
                            sp2.stdout.on('data', (data) => {
                                console.log(`stdout build: ${data}`);
                            });
                            sp2.stderr.on('data', (data) => {
                                console.log(`stderr build: ${data}`);
                            })
                            sp2.on('exit', (code, data) => {
                                if (code === 0) {
                                    console.log(`exit build suscess ${data}`);
                                    console.log('开始将自动化插件打包zip，并导出');
                                    // 压缩成zip包导出
                                    let sp3: ChildProcessWithoutNullStreams = spawn("npm", ['run', 'zip'], { shell: true, cwd: join(__dirname, '../') });
                                    sp3.stdout.setEncoding('utf8');
                                    sp3.stdout.on('data', (data) => {
                                        console.log(`stdout build: ${data}`);
                                    });
                                    sp3.stderr.on('data', (data) => {
                                        console.log(`stderr build: ${data}`);
                                    })
                                    sp3.on('exit', (code, data) => {
                                        fixPackageJson(autoPackPackageJson, false);
                                        if (code === 0) {
                                            console.log(`exit zip suscess ${data}`);
                                            Editor.Dialog.info('自动化插件导出成功!', { title: '提示' });
                                        }
                                        else {
                                            console.log(`exit zip fail ${data}`);
                                            Editor.Dialog.error('自动化插件导出失败!', { title: '错误' });
                                        }
                                    });
                                }
                                else {
                                    console.log(`exit build fail ${data}`);
                                    Editor.Dialog.error('自动化插件更新失败!', { title: '错误' });
                                }
                            });
                        }
                        else {
                            Editor.Dialog.warn(`${autoPackDir}不存在`, { title: '提示' })
                        }
                    }
                    else {
                        console.log(`exit build&copy fail ${data}`);
                        Editor.Dialog.warn('exit build&copy fail', { title: '提示' });
                    }
                });
            }
            else {
                Editor.Dialog.warn(`${autoPackDir}不存在`, { title: '提示' });
            }
        }
        else {
            Editor.Dialog.warn(`${autoPackPackageJson}文件不存在`, { title: '提示' });
        }
    }
};

/**
 * @en Method Triggered on Extension Startup
 * @zh 扩展启动时触发的方法
 */
export function load() { }

/**
 * @en Method triggered when uninstalling the extension
 * @zh 卸载扩展时触发的方法
 */
export function unload() { }
