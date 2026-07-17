import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import packageJSON from '../package.json';
import { join } from 'path';
/**
 * @en Registration method for the main process of Extension
 * @zh 为扩展的主进程的注册方法
 */
export const methods: { [key: string]: (...any: any) => any } = {
    /**
     * @en A method that can be triggered by message
     * @zh 通过 message 触发的方法
     */
    openPanel() {
        Editor.Panel.open(packageJSON.name);
    },
    updateTool() {
        let autoPackDir = join(__dirname, '../auto_pack');
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
                autoPackDir = join(__dirname, '../');
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
                        Editor.Dialog.info('工具更新成功!', { title: '提示' });
                    }
                    else {
                        console.log(`exit build fail ${data}`);
                        Editor.Dialog.error('工具更新失败!', { title: '错误' });
                    }
                });
            }
            else {
                console.log(`exit build&copy fail ${data}`);
            }
        });
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
