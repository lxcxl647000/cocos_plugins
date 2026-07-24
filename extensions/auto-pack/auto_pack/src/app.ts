#!/usr/bin/env node
import { program } from "commander";
import PackManager, { PackProject, SaveData } from "./pack/PackManager";
import { join } from "path";
import { existsSync, readFileSync } from "fs-extra";

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = '1';
program
    .option("-o, --onebyone", "是否一个一个的打默认false 一个打完再打下一个true", false)

program.parse(process.argv);
let options = program.opts();
PackManager.ins.oneByOne = options.onebyone;

const packsPath = join(__dirname, '../../../static/packconfigs/Packs.json');
const savePath = join(__dirname, '../../../static/packconfigs/save.json');
let taskList: PackProject[] = existsSync(packsPath) ? JSON.parse(readFileSync(packsPath, 'utf-8')).packs : [];
let saveData: SaveData = existsSync(savePath) ? JSON.parse(readFileSync(savePath, 'utf-8')) : null;
PackManager.ins.packs = taskList;
if (saveData) {
    for (let i = 0; i < PackManager.ins.packs.length; i++) {
        if (saveData.ding_talk) {
            PackManager.ins.packs[i].dingTalk = saveData.ding_talk;
        }
        if (saveData.taobao_cli_token) {
            for (let j = 0; j < saveData.taobao_cli_token.length; j++) {
                if (PackManager.ins.packs[i].appId === saveData.taobao_cli_token[j].appid) {
                    PackManager.ins.packs[i].tb_cli_token = saveData.taobao_cli_token[j].token;
                    break;
                }
            }
        }
        if (saveData.apiVersions) {
            console.log(saveData.apiVersions);
            for (let j = 0; j < saveData.apiVersions.length; j++) {
                console.log(PackManager.ins.packs[i].appId, '  ', saveData.apiVersions[j].appid);
                if (PackManager.ins.packs[i].appId === saveData.apiVersions[j].appid) {
                    PackManager.ins.packs[i].platformFiles[PackManager.ins.packs[i].channel].apiVersion = saveData.apiVersions[j].apiVersion;
                    break;
                }
            }
        }
    }
}

PackManager.ins.logHelper.log(options);
PackManager.ins.packIndex = 0;