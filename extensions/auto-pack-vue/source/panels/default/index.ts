/* eslint-disable vue/one-component-per-file */

import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { readFileSync, writeFileSync } from 'fs-extra';
import { join } from 'path';
import { createApp, App, defineComponent } from 'vue';
const panelDataMap = new WeakMap<any, App>();
/**
 * @zh 如果希望兼容 3.3 之前的版本可以使用下方的代码
 * @en You can add the code below if you want compatibility with versions prior to 3.3
 */
// Editor.Panel.define = Editor.Panel.define || function(options: any) { return options }

let taskList: any[] = JSON.parse(readFileSync(join(__dirname, '../../../static/packconfigs/Packs.json'), 'utf-8')).packs;

const modifyPackageJson = () => {
    let data = { packs: taskList };
    let dataStr = JSON.stringify(data, null, "\t");
    writeFileSync(join(__dirname, '../../../static/packconfigs/Packs.json'), dataStr, 'utf-8');
};

const openDilog = async (type: string, title: string, message: string, btnMap?: Map<string, Function>, cancel?: number) => {
    let option: Editor.Dialog.MessageDialogOptions = {
        title
    };
    if (btnMap) {
        option.buttons = [];
        btnMap.forEach((value, key) => {
            option.buttons.push(key);
        });
    }
    if (cancel !== undefined) {
        option.cancel = cancel;
    }
    let code: { response: 0, checkboxChecked: false } = await Editor.Dialog[type](message, option);
    if (btnMap) {
        let key = option.buttons[code.response];
        if (btnMap.has(key)) {
            let func = btnMap.get(key);
            if (func) {
                func();
            }
        }
    }
}

module.exports = Editor.Panel.define({
    listeners: {
        show() { console.log('show'); },
        hide() { console.log('hide'); },
    },
    template: readFileSync(join(__dirname, '../../../static/template/default/index.html'), 'utf-8'),
    style: readFileSync(join(__dirname, '../../../static/style/default/index.css'), 'utf-8'),
    $: {
        app: '#app',
    },
    methods: {

    },
    ready() {
        if (this.$.app) {
            const app = createApp({});
            app.config.compilerOptions.isCustomElement = (tag) => tag.startsWith('ui-');

            app.component('MyProject', defineComponent({
                data() {
                    return {
                        taskList: taskList,
                        isAutoPack: false
                    };
                },
                methods: {
                    startAutoPack() {
                        if (this.isAutoPack) {
                            openDilog('warn', 'warn', '正在自动化，请稍后再试!');
                            return;
                        }
                        const autoPack = () => {
                            openDilog('info', 'start', '开始自动化');
                            this.isAutoPack = true;
                            modifyPackageJson();
                            let data = { packs: this.taskList };
                            let dataStr = JSON.stringify(data);
                            // 将 JSON 字符串转为 Base64 编码 避免双引号在命令行中被吃掉
                            let base64Str = Buffer.from(dataStr).toString('base64');

                            let path = join(__dirname, '../../../static/auto-pack/build/app.js');
                            let args = [path, '--packs', base64Str];

                            let sp: ChildProcessWithoutNullStreams = spawn("node", args, { shell: true });
                            sp.stdout.setEncoding('utf8');
                            sp.stdout.on('data', (data) => {
                                console.log(`stdout ${data.toString()}`);
                            });
                            sp.stderr.on('data', (data) => {
                                console.log(`stderr ${data.toString()}`);
                            })
                            sp.on('exit', (code, data) => {
                                if (code === 0) {
                                    openDilog('info', 'suscess', '自动化成功!');
                                }
                                else {
                                    openDilog('error', 'fail', '自动化失败!');
                                }
                                this.isAutoPack = false;
                            });
                        }
                        let hasUpload = false;
                        for (let task of this.taskList) {
                            if (task.needAutoPack && task.upload) {
                                hasUpload = true;
                                break;
                            }
                        }
                        if (hasUpload) {
                            let btnMap = new Map<string, Function>();
                            btnMap.set('ok', () => {
                                autoPack();
                            });
                            openDilog('warn', 'warn', '有游戏需要上传，是否继续', btnMap, 1);
                        }
                        else {
                            autoPack();
                        }
                    }
                },
                expose: ['taskList'],
                template: readFileSync(join(__dirname, '../../../static/template/vue/project.html'), 'utf-8'),
            }));
            app.mount(this.$.app);
            panelDataMap.set(this, app);
        }
    },
    beforeClose() {
    },
    close() {
        const app = panelDataMap.get(this);
        if (app) {
            modifyPackageJson();

            app.unmount();
        }
    },
});
