"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.methods = void 0;
exports.load = load;
exports.unload = unload;
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path_1 = require("path");
/**
 * @en Registration method for the main process of Extension
 * @zh 为扩展的主进程的注册方法
 */
exports.methods = {
    /**
     * @en A method that can be triggered by message
     * @zh 通过 message 触发的方法
     */
    // 导出自动化工具，导出前需要把自动化工程中的package.json中的更新自动化工具按钮的配置删掉，导出的插件不需要更新功能
    exportAutoPack() {
        // 修改auto-pack的package.json
        let autoPackPackageJson = (0, path_1.join)(__dirname, '../../auto-pack/package.json');
        if ((0, fs_1.existsSync)(autoPackPackageJson)) {
            console.log('开始修改auto-pack的package.json，删除更新自动化工具按钮');
            let fixPackageJson = (path, isDelete) => {
                let content = (0, fs_1.readFileSync)(path, 'utf-8');
                let data = JSON.parse(content);
                // { path: 'auto-pack', label: '更新自动化工具', message: 'update-tool' }
                if (isDelete) {
                    data.contributions.menu = data.contributions.menu.filter((menu) => menu.message !== 'update-tool');
                }
                else {
                    data.contributions.menu.push({ path: 'auto-pack', label: '更新自动化工具', message: 'update-tool' });
                }
                content = JSON.stringify(data, null, 4);
                (0, fs_1.writeFileSync)(autoPackPackageJson, content, 'utf-8');
            };
            fixPackageJson(autoPackPackageJson, true);
            // 更新一次插件
            let autoPackDir = (0, path_1.join)(__dirname, '../../auto-pack/auto_pack');
            if ((0, fs_1.existsSync)(autoPackDir)) {
                console.log('开始更新自动化代码，并拷贝到静态文件路径下');
                // 更新自动化代码，并拷贝到静态文件路径下
                let sp = (0, child_process_1.spawn)("npm", ['run', 'bc'], { shell: true, cwd: autoPackDir });
                sp.stdout.setEncoding('utf8');
                sp.stdout.on('data', (data) => {
                    console.log(`stdout build&copy: ${data}`);
                });
                sp.stderr.on('data', (data) => {
                    console.log(`stderr build&copy: ${data}`);
                });
                sp.on('exit', (code, data) => {
                    if (code === 0) {
                        console.log(`exit build&copy suscess ${data}`);
                        autoPackDir = (0, path_1.join)(__dirname, '../../auto-pack');
                        if ((0, fs_1.existsSync)(autoPackDir)) {
                            console.log('开始更新自动化插件');
                            // 更新自动化插件
                            let sp2 = (0, child_process_1.spawn)("npm", ['run', 'build'], { shell: true, cwd: autoPackDir });
                            sp2.stdout.setEncoding('utf8');
                            sp2.stdout.on('data', (data) => {
                                console.log(`stdout build: ${data}`);
                            });
                            sp2.stderr.on('data', (data) => {
                                console.log(`stderr build: ${data}`);
                            });
                            sp2.on('exit', (code, data) => {
                                if (code === 0) {
                                    console.log(`exit build suscess ${data}`);
                                    console.log('开始将自动化插件打包zip，并导出');
                                    // 压缩成zip包导出
                                    let zipSuccess = false;
                                    let sp3 = (0, child_process_1.spawn)("npm", ['run', 'zip'], { shell: true, cwd: (0, path_1.join)(__dirname, '../') });
                                    sp3.stdout.setEncoding('utf8');
                                    sp3.stdout.on('data', (data) => {
                                        console.log(`stdout build: ${data}`);
                                        if (typeof data === 'string' && data.includes('压缩完成')) {
                                            zipSuccess = true;
                                        }
                                    });
                                    sp3.stderr.on('data', (data) => {
                                        console.log(`stderr build: ${data}`);
                                    });
                                    sp3.on('exit', (code, data) => {
                                        fixPackageJson(autoPackPackageJson, false);
                                        if (code === 0) {
                                            if (zipSuccess) {
                                                console.log(`exit zip suscess ${data}`);
                                                Editor.Dialog.info('自动化插件导出成功!', { title: '提示' });
                                                let exportPath = (0, path_1.join)(__dirname, '../exportZip');
                                                if (!(0, fs_1.existsSync)(exportPath)) {
                                                    Editor.Dialog.warn(`${exportPath}不存在`, { title: '提示' });
                                                    return;
                                                }
                                                try {
                                                    (0, child_process_1.exec)(`start "" "${exportPath}"`, (error) => {
                                                        if (error) {
                                                            console.error('执行命令出错:', error);
                                                            Editor.Dialog.error('无法打开目录，请检查路径或权限！', { title: '错误' });
                                                        }
                                                    });
                                                }
                                                catch (error) {
                                                    console.error('打开目录异常:', error);
                                                    Editor.Dialog.error('发生未知错误，无法打开目录！', { title: '错误' });
                                                }
                                            }
                                            else {
                                                console.log(`exit zip fail ${data}`);
                                                Editor.Dialog.error('自动化插件导出失败!', { title: '错误' });
                                            }
                                        }
                                        else {
                                            console.log(`exit zip fail---- ${data}`);
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
                            Editor.Dialog.warn(`${autoPackDir}不存在`, { title: '提示' });
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
function load() { }
/**
 * @en Method triggered when uninstalling the extension
 * @zh 卸载扩展时触发的方法
 */
function unload() { }
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQWdKQSxvQkFBMEI7QUFNMUIsd0JBQTRCO0FBdEo1QixpREFBNEU7QUFDNUUsMkJBQTZEO0FBQzdELCtCQUE0QjtBQUU1Qjs7O0dBR0c7QUFDVSxRQUFBLE9BQU8sR0FBNEM7SUFDNUQ7OztPQUdHO0lBRUgsaUVBQWlFO0lBQ2pFLGNBQWM7UUFDViwyQkFBMkI7UUFDM0IsSUFBSSxtQkFBbUIsR0FBRyxJQUFBLFdBQUksRUFBQyxTQUFTLEVBQUUsOEJBQThCLENBQUMsQ0FBQztRQUMxRSxJQUFJLElBQUEsZUFBVSxFQUFDLG1CQUFtQixDQUFDLEVBQUUsQ0FBQztZQUNsQyxPQUFPLENBQUMsR0FBRyxDQUFDLHdDQUF3QyxDQUFDLENBQUM7WUFDdEQsSUFBSSxjQUFjLEdBQUcsQ0FBQyxJQUFZLEVBQUUsUUFBaUIsRUFBRSxFQUFFO2dCQUNyRCxJQUFJLE9BQU8sR0FBRyxJQUFBLGlCQUFZLEVBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO2dCQUMxQyxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUMvQixrRUFBa0U7Z0JBQ2xFLElBQUksUUFBUSxFQUFFLENBQUM7b0JBQ1gsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBc0QsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sS0FBSyxhQUFhLENBQUMsQ0FBQztnQkFDekosQ0FBQztxQkFDSSxDQUFDO29CQUNGLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsYUFBYSxFQUFFLENBQUMsQ0FBQztnQkFDbEcsQ0FBQztnQkFDRCxPQUFPLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUN4QyxJQUFBLGtCQUFhLEVBQUMsbUJBQW1CLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ3pELENBQUMsQ0FBQztZQUNGLGNBQWMsQ0FBQyxtQkFBbUIsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUUxQyxTQUFTO1lBQ1QsSUFBSSxXQUFXLEdBQUcsSUFBQSxXQUFJLEVBQUMsU0FBUyxFQUFFLDJCQUEyQixDQUFDLENBQUM7WUFDL0QsSUFBSSxJQUFBLGVBQVUsRUFBQyxXQUFXLENBQUMsRUFBRSxDQUFDO2dCQUMxQixPQUFPLENBQUMsR0FBRyxDQUFDLHVCQUF1QixDQUFDLENBQUM7Z0JBQ3JDLHNCQUFzQjtnQkFDdEIsSUFBSSxFQUFFLEdBQW1DLElBQUEscUJBQUssRUFBQyxLQUFLLEVBQUUsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUFDO2dCQUN4RyxFQUFFLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDOUIsRUFBRSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUU7b0JBQzFCLE9BQU8sQ0FBQyxHQUFHLENBQUMsc0JBQXNCLElBQUksRUFBRSxDQUFDLENBQUM7Z0JBQzlDLENBQUMsQ0FBQyxDQUFDO2dCQUNILEVBQUUsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFO29CQUMxQixPQUFPLENBQUMsR0FBRyxDQUFDLHNCQUFzQixJQUFJLEVBQUUsQ0FBQyxDQUFDO2dCQUM5QyxDQUFDLENBQUMsQ0FBQTtnQkFDRixFQUFFLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsRUFBRTtvQkFDekIsSUFBSSxJQUFJLEtBQUssQ0FBQyxFQUFFLENBQUM7d0JBQ2IsT0FBTyxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsSUFBSSxFQUFFLENBQUMsQ0FBQzt3QkFDL0MsV0FBVyxHQUFHLElBQUEsV0FBSSxFQUFDLFNBQVMsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO3dCQUNqRCxJQUFJLElBQUEsZUFBVSxFQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7NEJBQzFCLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7NEJBQ3pCLFVBQVU7NEJBQ1YsSUFBSSxHQUFHLEdBQW1DLElBQUEscUJBQUssRUFBQyxLQUFLLEVBQUUsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUFDOzRCQUM1RyxHQUFHLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQzs0QkFDL0IsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUU7Z0NBQzNCLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLElBQUksRUFBRSxDQUFDLENBQUM7NEJBQ3pDLENBQUMsQ0FBQyxDQUFDOzRCQUNILEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFO2dDQUMzQixPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixJQUFJLEVBQUUsQ0FBQyxDQUFDOzRCQUN6QyxDQUFDLENBQUMsQ0FBQTs0QkFDRixHQUFHLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsRUFBRTtnQ0FDMUIsSUFBSSxJQUFJLEtBQUssQ0FBQyxFQUFFLENBQUM7b0NBQ2IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsSUFBSSxFQUFFLENBQUMsQ0FBQztvQ0FDMUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO29DQUNqQyxZQUFZO29DQUNaLElBQUksVUFBVSxHQUFHLEtBQUssQ0FBQztvQ0FDdkIsSUFBSSxHQUFHLEdBQW1DLElBQUEscUJBQUssRUFBQyxLQUFLLEVBQUUsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFBLFdBQUksRUFBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO29DQUNySCxHQUFHLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQztvQ0FDL0IsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUU7d0NBQzNCLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLElBQUksRUFBRSxDQUFDLENBQUM7d0NBQ3JDLElBQUksT0FBTyxJQUFJLEtBQUssUUFBUSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQzs0Q0FDcEQsVUFBVSxHQUFHLElBQUksQ0FBQzt3Q0FDdEIsQ0FBQztvQ0FDTCxDQUFDLENBQUMsQ0FBQztvQ0FDSCxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRTt3Q0FDM0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsSUFBSSxFQUFFLENBQUMsQ0FBQztvQ0FDekMsQ0FBQyxDQUFDLENBQUE7b0NBQ0YsR0FBRyxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQUU7d0NBQzFCLGNBQWMsQ0FBQyxtQkFBbUIsRUFBRSxLQUFLLENBQUMsQ0FBQzt3Q0FDM0MsSUFBSSxJQUFJLEtBQUssQ0FBQyxFQUFFLENBQUM7NENBQ2IsSUFBSSxVQUFVLEVBQUUsQ0FBQztnREFDYixPQUFPLENBQUMsR0FBRyxDQUFDLG9CQUFvQixJQUFJLEVBQUUsQ0FBQyxDQUFDO2dEQUN4QyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztnREFDbEQsSUFBSSxVQUFVLEdBQUcsSUFBQSxXQUFJLEVBQUMsU0FBUyxFQUFFLGNBQWMsQ0FBQyxDQUFDO2dEQUNqRCxJQUFJLENBQUMsSUFBQSxlQUFVLEVBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztvREFDMUIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxVQUFVLEtBQUssRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO29EQUN2RCxPQUFPO2dEQUNYLENBQUM7Z0RBQ0QsSUFBSSxDQUFDO29EQUNELElBQUEsb0JBQUksRUFBQyxhQUFhLFVBQVUsR0FBRyxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUU7d0RBQ3ZDLElBQUksS0FBSyxFQUFFLENBQUM7NERBQ1IsT0FBTyxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7NERBQ2hDLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLGtCQUFrQixFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7d0RBQzdELENBQUM7b0RBQ0wsQ0FBQyxDQUFDLENBQUM7Z0RBQ1AsQ0FBQztnREFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO29EQUNiLE9BQU8sQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO29EQUNoQyxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO2dEQUMzRCxDQUFDOzRDQUNMLENBQUM7aURBQ0ksQ0FBQztnREFDRixPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixJQUFJLEVBQUUsQ0FBQyxDQUFDO2dEQUNyQyxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQzs0Q0FDdkQsQ0FBQzt3Q0FDTCxDQUFDOzZDQUNJLENBQUM7NENBQ0YsT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsSUFBSSxFQUFFLENBQUMsQ0FBQzs0Q0FDekMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7d0NBQ3ZELENBQUM7b0NBQ0wsQ0FBQyxDQUFDLENBQUM7Z0NBQ1AsQ0FBQztxQ0FDSSxDQUFDO29DQUNGLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLElBQUksRUFBRSxDQUFDLENBQUM7b0NBQ3ZDLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO2dDQUN2RCxDQUFDOzRCQUNMLENBQUMsQ0FBQyxDQUFDO3dCQUNQLENBQUM7NkJBQ0ksQ0FBQzs0QkFDRixNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLFdBQVcsS0FBSyxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7d0JBQzVELENBQUM7b0JBQ0wsQ0FBQzt5QkFDSSxDQUFDO3dCQUNGLE9BQU8sQ0FBQyxHQUFHLENBQUMsd0JBQXdCLElBQUksRUFBRSxDQUFDLENBQUM7d0JBQzVDLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLHNCQUFzQixFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7b0JBQ2hFLENBQUM7Z0JBQ0wsQ0FBQyxDQUFDLENBQUM7WUFDUCxDQUFDO2lCQUNJLENBQUM7Z0JBQ0YsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxXQUFXLEtBQUssRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQzdELENBQUM7UUFDTCxDQUFDO2FBQ0ksQ0FBQztZQUNGLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsbUJBQW1CLE9BQU8sRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZFLENBQUM7SUFDTCxDQUFDO0NBQ0osQ0FBQztBQUVGOzs7R0FHRztBQUNILFNBQWdCLElBQUksS0FBSyxDQUFDO0FBRTFCOzs7R0FHRztBQUNILFNBQWdCLE1BQU0sS0FBSyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ2hpbGRQcm9jZXNzV2l0aG91dE51bGxTdHJlYW1zLCBleGVjLCBzcGF3biB9IGZyb20gXCJjaGlsZF9wcm9jZXNzXCI7XG5pbXBvcnQgeyBleGlzdHNTeW5jLCByZWFkRmlsZVN5bmMsIHdyaXRlRmlsZVN5bmMgfSBmcm9tIFwiZnNcIjtcbmltcG9ydCB7IGpvaW4gfSBmcm9tIFwicGF0aFwiO1xuXG4vKipcbiAqIEBlbiBSZWdpc3RyYXRpb24gbWV0aG9kIGZvciB0aGUgbWFpbiBwcm9jZXNzIG9mIEV4dGVuc2lvblxuICogQHpoIOS4uuaJqeWxleeahOS4u+i/m+eoi+eahOazqOWGjOaWueazlVxuICovXG5leHBvcnQgY29uc3QgbWV0aG9kczogeyBba2V5OiBzdHJpbmddOiAoLi4uYW55OiBhbnkpID0+IGFueSB9ID0ge1xuICAgIC8qKlxuICAgICAqIEBlbiBBIG1ldGhvZCB0aGF0IGNhbiBiZSB0cmlnZ2VyZWQgYnkgbWVzc2FnZVxuICAgICAqIEB6aCDpgJrov4cgbWVzc2FnZSDop6blj5HnmoTmlrnms5VcbiAgICAgKi9cblxuICAgIC8vIOWvvOWHuuiHquWKqOWMluW3peWFt++8jOWvvOWHuuWJjemcgOimgeaKiuiHquWKqOWMluW3peeoi+S4reeahHBhY2thZ2UuanNvbuS4reeahOabtOaWsOiHquWKqOWMluW3peWFt+aMiemSrueahOmFjee9ruWIoOaOie+8jOWvvOWHuueahOaPkuS7tuS4jemcgOimgeabtOaWsOWKn+iDvVxuICAgIGV4cG9ydEF1dG9QYWNrKCkge1xuICAgICAgICAvLyDkv67mlLlhdXRvLXBhY2vnmoRwYWNrYWdlLmpzb25cbiAgICAgICAgbGV0IGF1dG9QYWNrUGFja2FnZUpzb24gPSBqb2luKF9fZGlybmFtZSwgJy4uLy4uL2F1dG8tcGFjay9wYWNrYWdlLmpzb24nKTtcbiAgICAgICAgaWYgKGV4aXN0c1N5bmMoYXV0b1BhY2tQYWNrYWdlSnNvbikpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCflvIDlp4vkv67mlLlhdXRvLXBhY2vnmoRwYWNrYWdlLmpzb27vvIzliKDpmaTmm7TmlrDoh6rliqjljJblt6XlhbfmjInpkq4nKTtcbiAgICAgICAgICAgIGxldCBmaXhQYWNrYWdlSnNvbiA9IChwYXRoOiBzdHJpbmcsIGlzRGVsZXRlOiBib29sZWFuKSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IGNvbnRlbnQgPSByZWFkRmlsZVN5bmMocGF0aCwgJ3V0Zi04Jyk7XG4gICAgICAgICAgICAgICAgbGV0IGRhdGEgPSBKU09OLnBhcnNlKGNvbnRlbnQpO1xuICAgICAgICAgICAgICAgIC8vIHsgcGF0aDogJ2F1dG8tcGFjaycsIGxhYmVsOiAn5pu05paw6Ieq5Yqo5YyW5bel5YW3JywgbWVzc2FnZTogJ3VwZGF0ZS10b29sJyB9XG4gICAgICAgICAgICAgICAgaWYgKGlzRGVsZXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGEuY29udHJpYnV0aW9ucy5tZW51ID0gZGF0YS5jb250cmlidXRpb25zLm1lbnUuZmlsdGVyKChtZW51OiB7IHBhdGg6IHN0cmluZywgbGFiZWw6IHN0cmluZywgbWVzc2FnZTogc3RyaW5nIH0pID0+IG1lbnUubWVzc2FnZSAhPT0gJ3VwZGF0ZS10b29sJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBkYXRhLmNvbnRyaWJ1dGlvbnMubWVudS5wdXNoKHsgcGF0aDogJ2F1dG8tcGFjaycsIGxhYmVsOiAn5pu05paw6Ieq5Yqo5YyW5bel5YW3JywgbWVzc2FnZTogJ3VwZGF0ZS10b29sJyB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29udGVudCA9IEpTT04uc3RyaW5naWZ5KGRhdGEsIG51bGwsIDQpO1xuICAgICAgICAgICAgICAgIHdyaXRlRmlsZVN5bmMoYXV0b1BhY2tQYWNrYWdlSnNvbiwgY29udGVudCwgJ3V0Zi04Jyk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgZml4UGFja2FnZUpzb24oYXV0b1BhY2tQYWNrYWdlSnNvbiwgdHJ1ZSk7XG5cbiAgICAgICAgICAgIC8vIOabtOaWsOS4gOasoeaPkuS7tlxuICAgICAgICAgICAgbGV0IGF1dG9QYWNrRGlyID0gam9pbihfX2Rpcm5hbWUsICcuLi8uLi9hdXRvLXBhY2svYXV0b19wYWNrJyk7XG4gICAgICAgICAgICBpZiAoZXhpc3RzU3luYyhhdXRvUGFja0RpcikpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn5byA5aeL5pu05paw6Ieq5Yqo5YyW5Luj56CB77yM5bm25ou36LSd5Yiw6Z2Z5oCB5paH5Lu26Lev5b6E5LiLJyk7XG4gICAgICAgICAgICAgICAgLy8g5pu05paw6Ieq5Yqo5YyW5Luj56CB77yM5bm25ou36LSd5Yiw6Z2Z5oCB5paH5Lu26Lev5b6E5LiLXG4gICAgICAgICAgICAgICAgbGV0IHNwOiBDaGlsZFByb2Nlc3NXaXRob3V0TnVsbFN0cmVhbXMgPSBzcGF3bihcIm5wbVwiLCBbJ3J1bicsICdiYyddLCB7IHNoZWxsOiB0cnVlLCBjd2Q6IGF1dG9QYWNrRGlyIH0pO1xuICAgICAgICAgICAgICAgIHNwLnN0ZG91dC5zZXRFbmNvZGluZygndXRmOCcpO1xuICAgICAgICAgICAgICAgIHNwLnN0ZG91dC5vbignZGF0YScsIChkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBzdGRvdXQgYnVpbGQmY29weTogJHtkYXRhfWApO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHNwLnN0ZGVyci5vbignZGF0YScsIChkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBzdGRlcnIgYnVpbGQmY29weTogJHtkYXRhfWApO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgc3Aub24oJ2V4aXQnLCAoY29kZSwgZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoY29kZSA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYGV4aXQgYnVpbGQmY29weSBzdXNjZXNzICR7ZGF0YX1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF1dG9QYWNrRGlyID0gam9pbihfX2Rpcm5hbWUsICcuLi8uLi9hdXRvLXBhY2snKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChleGlzdHNTeW5jKGF1dG9QYWNrRGlyKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCflvIDlp4vmm7TmlrDoh6rliqjljJbmj5Lku7YnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDmm7TmlrDoh6rliqjljJbmj5Lku7ZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgc3AyOiBDaGlsZFByb2Nlc3NXaXRob3V0TnVsbFN0cmVhbXMgPSBzcGF3bihcIm5wbVwiLCBbJ3J1bicsICdidWlsZCddLCB7IHNoZWxsOiB0cnVlLCBjd2Q6IGF1dG9QYWNrRGlyIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNwMi5zdGRvdXQuc2V0RW5jb2RpbmcoJ3V0ZjgnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzcDIuc3Rkb3V0Lm9uKCdkYXRhJywgKGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYHN0ZG91dCBidWlsZDogJHtkYXRhfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNwMi5zdGRlcnIub24oJ2RhdGEnLCAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgc3RkZXJyIGJ1aWxkOiAke2RhdGF9YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzcDIub24oJ2V4aXQnLCAoY29kZSwgZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29kZSA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYGV4aXQgYnVpbGQgc3VzY2VzcyAke2RhdGF9YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn5byA5aeL5bCG6Ieq5Yqo5YyW5o+S5Lu25omT5YyFemlw77yM5bm25a+85Ye6Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDljovnvKnmiJB6aXDljIXlr7zlh7pcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCB6aXBTdWNjZXNzID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgc3AzOiBDaGlsZFByb2Nlc3NXaXRob3V0TnVsbFN0cmVhbXMgPSBzcGF3bihcIm5wbVwiLCBbJ3J1bicsICd6aXAnXSwgeyBzaGVsbDogdHJ1ZSwgY3dkOiBqb2luKF9fZGlybmFtZSwgJy4uLycpIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3AzLnN0ZG91dC5zZXRFbmNvZGluZygndXRmOCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3AzLnN0ZG91dC5vbignZGF0YScsIChkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYHN0ZG91dCBidWlsZDogJHtkYXRhfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgZGF0YSA9PT0gJ3N0cmluZycgJiYgZGF0YS5pbmNsdWRlcygn5Y6L57yp5a6M5oiQJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgemlwU3VjY2VzcyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzcDMuc3RkZXJyLm9uKCdkYXRhJywgKGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgc3RkZXJyIGJ1aWxkOiAke2RhdGF9YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3AzLm9uKCdleGl0JywgKGNvZGUsIGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaXhQYWNrYWdlSnNvbihhdXRvUGFja1BhY2thZ2VKc29uLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvZGUgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHppcFN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBleGl0IHppcCBzdXNjZXNzICR7ZGF0YX1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEVkaXRvci5EaWFsb2cuaW5mbygn6Ieq5Yqo5YyW5o+S5Lu25a+85Ye65oiQ5YqfIScsIHsgdGl0bGU6ICfmj5DnpLonIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGV4cG9ydFBhdGggPSBqb2luKF9fZGlybmFtZSwgJy4uL2V4cG9ydFppcCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFleGlzdHNTeW5jKGV4cG9ydFBhdGgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgRWRpdG9yLkRpYWxvZy53YXJuKGAke2V4cG9ydFBhdGh95LiN5a2Y5ZyoYCwgeyB0aXRsZTogJ+aPkOekuicgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4ZWMoYHN0YXJ0IFwiXCIgXCIke2V4cG9ydFBhdGh9XCJgLCAoZXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCfmiafooYzlkb3ku6Tlh7rplJk6JywgZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgRWRpdG9yLkRpYWxvZy5lcnJvcign5peg5rOV5omT5byA55uu5b2V77yM6K+35qOA5p+l6Lev5b6E5oiW5p2D6ZmQ77yBJywgeyB0aXRsZTogJ+mUmeivrycgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcign5omT5byA55uu5b2V5byC5bi4OicsIGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBFZGl0b3IuRGlhbG9nLmVycm9yKCflj5HnlJ/mnKrnn6XplJnor6/vvIzml6Dms5XmiZPlvIDnm67lvZXvvIEnLCB7IHRpdGxlOiAn6ZSZ6K+vJyB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBleGl0IHppcCBmYWlsICR7ZGF0YX1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEVkaXRvci5EaWFsb2cuZXJyb3IoJ+iHquWKqOWMluaPkuS7tuWvvOWHuuWksei0pSEnLCB7IHRpdGxlOiAn6ZSZ6K+vJyB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYGV4aXQgemlwIGZhaWwtLS0tICR7ZGF0YX1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgRWRpdG9yLkRpYWxvZy5lcnJvcign6Ieq5Yqo5YyW5o+S5Lu25a+85Ye65aSx6LSlIScsIHsgdGl0bGU6ICfplJnor68nIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYGV4aXQgYnVpbGQgZmFpbCAke2RhdGF9YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBFZGl0b3IuRGlhbG9nLmVycm9yKCfoh6rliqjljJbmj5Lku7bmm7TmlrDlpLHotKUhJywgeyB0aXRsZTogJ+mUmeivrycgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEVkaXRvci5EaWFsb2cud2FybihgJHthdXRvUGFja0Rpcn3kuI3lrZjlnKhgLCB7IHRpdGxlOiAn5o+Q56S6JyB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYGV4aXQgYnVpbGQmY29weSBmYWlsICR7ZGF0YX1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIEVkaXRvci5EaWFsb2cud2FybignZXhpdCBidWlsZCZjb3B5IGZhaWwnLCB7IHRpdGxlOiAn5o+Q56S6JyB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgRWRpdG9yLkRpYWxvZy53YXJuKGAke2F1dG9QYWNrRGlyfeS4jeWtmOWcqGAsIHsgdGl0bGU6ICfmj5DnpLonIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgRWRpdG9yLkRpYWxvZy53YXJuKGAke2F1dG9QYWNrUGFja2FnZUpzb2595paH5Lu25LiN5a2Y5ZyoYCwgeyB0aXRsZTogJ+aPkOekuicgfSk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vKipcbiAqIEBlbiBNZXRob2QgVHJpZ2dlcmVkIG9uIEV4dGVuc2lvbiBTdGFydHVwXG4gKiBAemgg5omp5bGV5ZCv5Yqo5pe26Kem5Y+R55qE5pa55rOVXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsb2FkKCkgeyB9XG5cbi8qKlxuICogQGVuIE1ldGhvZCB0cmlnZ2VyZWQgd2hlbiB1bmluc3RhbGxpbmcgdGhlIGV4dGVuc2lvblxuICogQHpoIOWNuOi9veaJqeWxleaXtuinpuWPkeeahOaWueazlVxuICovXG5leHBvcnQgZnVuY3Rpb24gdW5sb2FkKCkgeyB9XG4iXX0=