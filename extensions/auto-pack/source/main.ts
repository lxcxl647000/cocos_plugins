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
    },
    taobaoLogin() {
        loginForTaobao();
    }
};

/**
 * 用已有的一个游戏的appid去检测是否能拿到版本号，如果能拿到说明已登录，不能则登录态过期
 * @param success 
 * @param fail 
 */
export function checkTaobaoLogin(success: Function, fail: Function) {
    let needLogin = false;
    let args = ["app", "--appId", '3000000141704164'];
    let sp: ChildProcessWithoutNullStreams = spawn("tbopen", args, { shell: true });
    sp.stdout.setEncoding('utf8');
    sp.stdout.on('data', (data) => {
        console.log(`checklogin stdout ${data.toString()}`);
    });
    sp.stderr.on('data', (data) => {
        console.log(`checklogin stderr ${data.toString()}`);
        if (data.indexOf('登录态过期，可使用指令 tbopen login 刷新登录态') > -1 || data.indexOf('need login') > -1) {
            needLogin = true;
        }
    })
    sp.on('exit', (code) => {
        if (code === 0) {
            if (needLogin) {
                fail && fail();
            }
            else {
                success && success();
            }
        }
        else {
            fail && fail();
        }
    });
}

export function loginForTaobao() {
    checkTaobaoLogin(
        () => {
            Editor.Dialog.warn('已登录，请继续自动化!', { title: '提示' });
        },
        () => {
            let sp: ChildProcessWithoutNullStreams = spawn("tbopen", ['login'], { shell: true });
            sp.stdout.setEncoding('utf8');
            sp.stdout.on('data', (data) => {
                console.log(`taobaoLogin stdout ${data.toString()}`);
            });
            sp.stderr.on('data', (data) => {
                console.log(`taobaoLogin stderr ${data.toString()}`);
            })
            sp.on('exit', (code) => {
                console.log(`taobaoLogin exit ${code}`);
                if (code === 0) {
                    checkTaobaoLogin(
                        () => {
                            Editor.Dialog.warn('登录成功，请继续自动化!', { title: '提示' });
                        },
                        () => {
                            Editor.Dialog.warn('登录失败，请重新扫码!', { title: '提示' });
                        }
                    );
                }
            });
        }
    );
}

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
