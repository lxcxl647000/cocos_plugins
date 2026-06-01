/* eslint-disable vue/one-component-per-file */

import { ChildProcessWithoutNullStreams, spawn, exec } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs-extra';
import { join } from 'path';
import { createApp, App, defineComponent } from 'vue';
import os from 'os';
import { checkTaobaoLogin, loginForTaobao } from '../../main';
const panelDataMap = new WeakMap<any, App>();
/**
 * @zh 如果希望兼容 3.3 之前的版本可以使用下方的代码
 * @en You can add the code below if you want compatibility with versions prior to 3.3
 */
// Editor.Panel.define = Editor.Panel.define || function(options: any) { return options }

interface PackProject {
    appId: string,
    name: string,
    path: string,// Cocos项目根目录
    channel: string,// 指定打包对应渠道名称
    skip?: boolean,// 是否跳过cocos构建工程，直接使用导出工程
    upload?: boolean// 是否需要上传
    needAutoPack?: boolean// 是否需要进行自动构建上传
}

const packsPath = join(__dirname, '../../../static/packconfigs/Packs.json');
let taskList: PackProject[] = existsSync(packsPath) ? JSON.parse(readFileSync(packsPath, 'utf-8')).packs : [];

const modifyPackageJson = () => {
    let data = { packs: taskList };
    let dataStr = JSON.stringify(data, null, "\t");
    writeFileSync(join(__dirname, '../../../static/packconfigs/Packs.json'), dataStr, 'utf-8');
};

export const openDilog = async (type: string, title: string, message: string, btnMap?: Map<string, Function>, cancel?: number) => {
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
                        if (!this.taskList || this.taskList.length === 0) {
                            let btnMap = new Map<string, Function>();
                            btnMap.set('add', () => {
                                this.addProject();
                            });
                            btnMap.set('cancel', null);
                            openDilog('warn', 'warn', '请先添加自动化项目配置！', btnMap);
                            return;
                        }
                        for (let task of this.taskList) {
                            if (!task.path || !task.channel) {
                                let str = '';
                                if (!task.appId) {
                                    str += '未配置appId ';
                                }
                                if (!task.path) {
                                    str += '未配置项目路径 ';
                                }
                                if (!task.channel) {
                                    str += '未配置渠道 ';
                                }
                                openDilog('warn', 'warn', `appId:${task.appId}${task.name}${str}请检查配置！`);
                                return;
                            }
                        }
                        if (this.isAutoPack) {
                            openDilog('warn', 'warn', '正在自动化，请稍后再试!');
                            return;
                        }

                        const checkTaobao = (func: Function) => {
                            let check = false;
                            for (let task of this.taskList) {
                                if (task.channel === 'taobao-mini-game') {
                                    check = true;
                                    break;
                                }
                            }
                            if (check) {
                                this.isAutoPack = true;
                                checkTaobaoLogin(
                                    () => {
                                        this.isAutoPack = false;
                                        func && func();
                                    },
                                    () => {
                                        this.isAutoPack = false;
                                        openDilog('warn', 'warn', '淘宝登录态过期，请重新登录!');
                                    }
                                );
                            }
                            else {
                                func && func();
                            }
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
                                console.log(`autoPack stdout ${data.toString()}`);
                            });
                            sp.stderr.on('data', (data) => {
                                console.log(`autoPack stderr ${data.toString()}`);
                            })
                            sp.on('exit', (code, data) => {
                                if (code === 0) {
                                    console.log(`autoPack exit suscess ${data}`);
                                    openDilog('info', '完成', '自动化完成!');
                                }
                                else {
                                    console.log(`autoPack exit fail ${data}`);
                                    openDilog('error', '失败', '自动化失败!');
                                }
                                this.isAutoPack = false;
                            });
                        }
                        let msg = '';
                        let uploadCount = 0;
                        let packCount = 0;
                        let autoCount = 0;
                        for (let task of this.taskList) {
                            if (task.needAutoPack) {
                                autoCount++;
                                if (task.upload) {
                                    uploadCount++;
                                }
                                if (!task.skip) {
                                    packCount++;
                                }
                                msg += `${task.appId}：${task.name}，构建：${(task.skip ? '✕' : '✓')}，上传：${(task.upload ? '✓' : '✕')}\n`;
                            }
                        }
                        msg += `自动化：${autoCount}个，构建：${packCount}个，上传：${uploadCount}个\n`;
                        let btnMap = new Map<string, Function>();
                        btnMap.set('ok', () => {
                            checkTaobao(() => { autoPack(); });
                        });
                        openDilog('warn', 'warn', `${msg}开始自动化?`, btnMap, 1);
                    },
                    addProject() {
                        this.taskList.push({
                            appId: '',
                            name: '',
                            path: '',
                            channel: 'taobao-mini-game',
                            upload: false,
                            skip: false,
                            needAutoPack: false,
                        });
                        openDilog('info', 'add', '添加成功');
                    },
                    delProject(item: PackProject) {
                        let btnMap = new Map<string, Function>();
                        btnMap.set('delete', () => {
                            this.taskList = this.taskList.filter((task: PackProject) => task.appId !== item.appId);
                            taskList = this.taskList;
                        });
                        openDilog('warn', 'delete', '是否删除配置?', btnMap, 1);
                    },
                    importPacksConfig() {
                        const importFunc = () => {
                            // 1. 动态创建一个隐藏的 input 标签
                            const input = document.createElement('input');
                            input.type = 'file';
                            // 限制只能选择 json 文件，如果导入 Excel 可以改为 '.xlsx, .xls'
                            input.accept = '.json';
                            input.style.display = 'none';

                            // 2. 监听文件选择的变化
                            input.onchange = (e) => {
                                const file = (e.target as HTMLInputElement).files?.[0];
                                if (!file) return;

                                // 3. 使用 FileReader 读取文件内容
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                    try {
                                        // 获取文件里的文本内容并解析为 JSON
                                        const result = event.target?.result as string;
                                        const importedData = JSON.parse(result);

                                        // 假设导入的 JSON 格式也是 { packs: [...] }
                                        if (importedData.packs && Array.isArray(importedData.packs)) {
                                            // 将导入的数据替换到当前的 taskList 中
                                            this.taskList = importedData.packs;
                                            taskList = this.taskList;

                                            // 4. 触发保存，将新数据写入本地 Packs.json
                                            modifyPackageJson();

                                            // 如果有 Editor.Dialog，可以弹个成功提示
                                            openDilog('info', '提示', '导入成功！');
                                        } else {
                                            openDilog('warn', '警告', '导入的文件格式不正确！');
                                        }
                                    } catch (error) {
                                        console.error(error);
                                        openDilog('error', '错误', '文件解析失败，请检查文件格式！');
                                    }

                                    // 5. 清理：将临时创建的 input 标签从页面中移除
                                    document.body.removeChild(input);
                                };
                                reader.readAsText(file); // 以文本形式读取文件
                            };

                            // 6. 将 input 挂载到页面并触发点击，弹出文件选择框
                            document.body.appendChild(input);
                            input.click();
                        };
                        // 说明静态文件中有 Packs.json了，询问是否替换
                        if (this.taskList && this.taskList.length > 0) {
                            let btnMap = new Map<string, Function>();
                            btnMap.set('replace', () => {
                                importFunc();
                            });
                            btnMap.set('cancel', null);
                            openDilog('warn', 'replace', 'Packs.json 已存在，是否替换?', btnMap);
                        }
                        else {
                            importFunc();
                        }
                    },
                    exportPacksConfig() {
                        // 说明没有配置
                        if (!this.taskList || this.taskList.length === 0) {
                            openDilog('warn', '警告', '没有配置，无法导出');
                            return;
                        }
                        try {
                            // 1. 组装需要导出的数据
                            const exportData = {
                                packs: this.taskList
                            };
                            const dataStr = JSON.stringify(exportData, null, "\t");

                            // 2. 获取当前系统的桌面路径
                            const desktopPath = os.homedir() + '/Desktop';

                            // 3. 拼接完整的保存路径
                            const savePath = join(desktopPath, `Packs.json`);

                            // 4. 使用 Node.js 原生 fs 模块同步写入文件到桌面
                            writeFileSync(savePath, dataStr, 'utf-8');

                            // 5. 弹出成功提示
                            openDilog('info', '提示', `配置已成功导出到桌面！\n文件名：${`Packs.json`}`);

                        } catch (error) {
                            console.error('导出失败:', error);
                            openDilog('error', '错误', '导出配置文件失败，请检查权限！');
                        }
                    },
                    onekeyOperateAutoPack(flag: boolean) {
                        for (let i = 0; i < this.taskList.length; i++) {
                            this.taskList[i].needAutoPack = flag;
                        }
                    },
                    onekeyOperateUpload(flag: boolean) {
                        for (let i = 0; i < this.taskList.length; i++) {
                            this.taskList[i].upload = flag;
                        }
                    },
                    onekeyOperateSkipPack(flag: boolean) {
                        for (let i = 0; i < this.taskList.length; i++) {
                            this.taskList[i].skip = flag;
                        }
                    },
                    getAutoCount() {
                        let count = 0;
                        for (let i = 0; i < this.taskList.length; i++) {
                            if (this.taskList[i].needAutoPack) {
                                count++;
                            }
                        }
                        return count;
                    },
                    getUploadCount() {
                        let count = 0;
                        for (let i = 0; i < this.taskList.length; i++) {
                            if (this.taskList[i].upload) {
                                count++;
                            }
                        }
                        return count;
                    },
                    getPackCount() {
                        let count = 0;
                        for (let i = 0; i < this.taskList.length; i++) {
                            if (!this.taskList[i].skip && this.taskList[i].needAutoPack) {
                                count++;
                            }
                        }
                        return count;
                    },
                    openLogDir(path: string) {
                        if (!existsSync(path)) {
                            openDilog('warn', 'warn', '日志文件夹不存在！');
                            return;
                        }
                        try {
                            exec(`start "" "${path}"`, (error) => {
                                if (error) {
                                    console.error('执行命令出错:', error);
                                    openDilog('error', '错误', '无法打开目录，请检查路径或权限！');
                                }
                            });
                        } catch (error) {
                            console.error('打开目录异常:', error);
                            openDilog('error', '错误', '发生未知错误，无法打开目录！');
                        }
                    },
                    openToolLog() {
                        this.openLogDir(join(__dirname, '../../../toolLog'));
                    },
                    taobaoLogin() {
                        loginForTaobao();
                    }
                },
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
