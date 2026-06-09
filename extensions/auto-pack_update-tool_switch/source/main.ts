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
    updateToolSwitch() {
        let autoPackPackageJson = join(__dirname, '../../auto-pack/package.json');
        console.log(autoPackPackageJson);
        if (existsSync(autoPackPackageJson)) {
            let content = readFileSync(autoPackPackageJson, 'utf-8');
            let data = JSON.parse(content);
            // { path: 'auto-pack', label: '更新自动化工具', message: 'update-tool' }
            let menuData: { path: string, label: string, message: string }[] = data.contributions.menu;
            let isUpdateToolOn = false;
            for (let menu of menuData) {
                if (menu.message === 'update-tool') {
                    isUpdateToolOn = true;
                    break;
                }
            }
            if (isUpdateToolOn) {
                data.contributions.menu = data.contributions.menu.filter((menu: { path: string, label: string, message: string }) => menu.message !== 'update-tool');
            } else {
                menuData.push({ path: 'auto-pack', label: '更新自动化工具', message: 'update-tool' });
                data.contributions.menu = menuData;
            }
            content = JSON.stringify(data, null, 4);
            writeFileSync(autoPackPackageJson, content, 'utf-8');
        }
        else {
            Editor.Dialog.warn('package.json文件不存在', { title: '提示' });
        }
    },
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
