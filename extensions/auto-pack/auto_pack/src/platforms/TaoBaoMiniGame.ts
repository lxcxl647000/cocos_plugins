import { BasePlatform } from "./BasePlatform";
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import path, { join } from "path";
import PackManager, { PackProject, SaveData } from "../pack/PackManager";
import fs from 'fs';
import PackUtil from "../utils/PackUtil";
import { existsSync, readFileSync, writeFileSync } from "fs-extra";
export class TaoBaoMiniGame extends BasePlatform {
    static count = 0;
    static gameArr: TaoBaoMiniGame[] = [];
    public async afterBuildFinish() {
        if (this.project.upload || this.project.preview) {
            TaoBaoMiniGame.gameArr.push(this);
        }
        if (TaoBaoMiniGame.gameArr.length === TaoBaoMiniGame.count) {
            TaoBaoMiniGame.checkDoCli();
        }
        await super.afterBuildFinish();
    }

    public static clearData() {
        TaoBaoMiniGame.count = 0;
    }

    static checkDoCli() {
        let game = TaoBaoMiniGame.gameArr.shift();
        if (game) {
            game.doTaobaoCli();
        }
    }

    public init(project: PackProject): void {
        super.init(project);
        if (this.project.upload || this.project.preview) {
            TaoBaoMiniGame.count++;
        }
    }

    public doTaobaoCli() {
        this.debugUrl = '';
        if (this.project.tb_cli_token && (this.project.upload || this.project.preview)) {
            let uploadFunc = () => {
                let outPath = path.join(this.outputPath, this.isEngine3 ? this.project.channel : 'taobao-minigame');
                let uploadSuccess = (version: string) => {
                    if (version) {
                        this.debugUrl = `https://m.duanqu.com?_ariver_appid=${this.project.appId}&nbsv=${version}&nbsource=debug&nbsn=TRIAL&_mp_code=tb&_container_type=gm&vconsole=true`
                        this.postToDingTalk('成功', true, version);
                        this.logHelper.log(`upload Debug Url is :${this.debugUrl}`);
                        this.logHelper.saveLog();
                    }
                    else {
                        this.logHelper.log(`upload success :获取版本号失败`);
                        this.logHelper.saveLog();
                    }
                    TaoBaoMiniGame.checkDoCli();
                    PackManager.ins.addSuccessed(this);
                };
                let uploadFail = () => {
                    TaoBaoMiniGame.checkDoCli();
                    PackManager.ins.addFailed(this);
                    this.postToDingTalk('失败，查看日志失败详情', true);
                    this.logHelper.saveLog();
                };

                try {
                    // 上传小游戏
                    this.logHelper.log(`start upload`);
                    this._spawn(["upload", "--input", outPath, "--appId", this.project.appId, "--type", "minigame", "--renderMode", "highPerformance"],
                        (data: { version: string }) => {
                            uploadSuccess(data.version);
                        },
                        () => {
                            uploadFail();
                        }
                    );
                } catch (error) {
                    this.logHelper.log(`upload failed :${error}`);
                    uploadFail();
                }
            };

            let previewFunc = () => {
                let outPath = path.join(this.outputPath, this.isEngine3 ? this.project.channel : 'taobao-minigame');
                this.logHelper.log('start preview');

                let previewSuccess = (previewUrl: string) => {
                    const savePath = join(__dirname, '../../../../static/packconfigs/save.json');
                    let saveData: SaveData = existsSync(savePath) ? JSON.parse(readFileSync(savePath, 'utf-8')) :
                        {
                            ding_talk: {
                                dingTalkWebHook: '',
                                dingTalkCustomContent_pack: '',
                                dingTalkCustomContent_upload: ''
                            },
                            taobao_cli_token: [],
                            qrCodeUrls: []
                        };
                    saveData.qrCodeUrls.push({ appid: this.project.appId, url: previewUrl });
                    let saveDataStr = JSON.stringify(saveData, null, "\t");
                    writeFileSync(savePath, saveDataStr, 'utf-8');

                    this.debugUrl = previewUrl;
                    TaoBaoMiniGame.checkDoCli();
                    PackManager.ins.addSuccessed(this);
                    this.postToDingTalk('成功', true);
                    this.logHelper.log(`preview Debug Url is :${this.debugUrl}`);
                    this.logHelper.saveLog();
                };
                let previewFail = () => {
                    TaoBaoMiniGame.checkDoCli();
                    PackManager.ins.addFailed(this);
                    this.postToDingTalk('失败，查看日志失败详情', true);
                    this.logHelper.saveLog();
                };

                try {
                    // 预览小游戏
                    this._spawn(["preview", "-i", outPath, "-a", this.project.appId, "-t", "minigame", "--copy", "true", "--renderMode", "highPerformance"],
                        (data: { previewUrl: string }) => {
                            previewSuccess(data.previewUrl);
                        },
                        () => {
                            previewFail();
                        }
                    );
                } catch (error) {
                    this.logHelper.log(`preview failed :${error}`);
                    previewFail();
                }
            };
            // 上传游戏之前设置game.json文件
            this._setGameJson();
            this._spawn(['config', 'set', 'token', this.project.tb_cli_token],
                () => {
                    if (this.project.upload) {
                        uploadFunc();
                    }
                    else if (this.project.preview) {
                        previewFunc();
                    }
                    else {
                        this.logHelper.log(`not need to upload or preview`);
                        this.logHelper.saveLog();
                    }
                },
                () => {
                    this.logHelper.saveLog();
                }
            );
        }
    }

    private _spawn(args: string[], success: Function, fail: Function) {
        if (!args || args.length === 0) {
            return;
        }
        let cliTokenFailed = false;
        let uploadFailed = false;
        let version = '';
        let previewUrl = '';
        let sp: ChildProcessWithoutNullStreams = spawn("tbgame", args, { shell: true });
        sp.stdout.setEncoding('utf8');
        let commondStr = sp.spawnargs[4].replace(/"/g, '');
        let nextDataIsQrCode = false;
        sp.stdout.on('data', (data) => {
            if (nextDataIsQrCode) {
                nextDataIsQrCode = false;
            }
            else {
                this.logHelper.log(`${commondStr} stdout ${data.toString()}`);
            }
            if (data.indexOf('预览二维码地址：') > -1) {
                let str: string = data.trim();
                let arr = str.split('预览二维码地址：');
                previewUrl = arr[1].trim();
            }
            if (data.indexOf('已复制预览码到剪贴板') > -1) {
                nextDataIsQrCode = true;
            }
            // 上传成功
            if (data.indexOf('upload done') > -1) {
                let str: string = PackUtil.stripAnsi(data).trim();
                let index = str.indexOf('upload done');
                str = str.substring(index, str.length);
                let jsonData = PackUtil.extractJsonObject(str);
                if (jsonData) {
                    this.logHelper.log(`upload done str ${str}`);
                    this.logHelper.log(`upload done jsonData ${JSON.stringify(jsonData)}`);
                    if (jsonData.version) {
                        version = jsonData.version;
                    }
                }
                else {
                    this.logHelper.log(`upload done str JSON 解析失败: ${str}`);
                }
            }
        });
        sp.stderr.on('data', (data) => {
            this.logHelper.log(`${commondStr} stderr ${data.toString()}`);
            if (data.indexOf('CLI auth failed') > -1) {
                cliTokenFailed = true;
            }
            if (data.indexOf('upload 命令执行失败') > -1) {
                uploadFailed = true;
            }
        })
        sp.on('exit', (code) => {
            if (code === 0) {
                if (cliTokenFailed || uploadFailed) {
                    this.logHelper.log(`${this.project.name} ${commondStr} failed : ${cliTokenFailed ? '设置调用凭证Token错误' : '上传失败'}`);
                    fail && fail();
                }
                else {
                    this.logHelper.log(`${commondStr} success`);
                    success && success({ version, previewUrl });
                }
            }
            else {
                this.logHelper.log(`${this.project.name} ${commondStr} failed`);
                fail && fail();
            }
        });
    }

    private _setGameJson() {
        let gameJsonPath = path.join(this.outputPath, `${this.isEngine3 ? this.project.channel : 'taobao-minigame'}/game.json`);
        this.logHelper.log(`set game.json output  gameJsonPath ${gameJsonPath}`);
        if (!fs.existsSync(gameJsonPath)) {
            this.logHelper.log('game.json is not exist', gameJsonPath);
            return;
        }
        this.logHelper.log('game.json  exist', gameJsonPath);
        let content = fs.readFileSync(gameJsonPath, 'utf-8');
        if (!content) {
            this.logHelper.log('can not get game.json content ');
            return;
        }

        this.logHelper.log(`get game.json content ${content}`);
        let newContent = content;
        let data = JSON.parse(content);

        data = this._setNavigationBarTextStyle(data);

        newContent = JSON.stringify(data);
        this.logHelper.log(`get game.json newContent ${newContent}`);
        fs.writeFileSync(gameJsonPath, newContent, 'utf-8');
    }

    private _setNavigationBarTextStyle(data: any) {
        this.logHelper.log(`set game.json navigationBarTextStyle ${this.project.navigationBarTextStyle}`);
        if (data.window) {
            data.window = { ...data.window, navigationBarTextStyle: this.project.navigationBarTextStyle };
        }
        return data;
    }

    private _setHighPerformanceMode(data: any) {
        this.logHelper.log('set game.json high performance mode');
        return { ...data, highPerformanceMode: true };
    }

    public async beforeStartBuild() {
        await super.beforeStartBuild();
    }
}