#!/usr/bin/env node
import { program } from "commander";
import PackManager, { PackProject } from "./pack/PackManager";
import { join } from "path";
import { existsSync, readFileSync } from "fs-extra";

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = '1';
program
    .option("-o, --onebyone", "是否一个一个的打默认false 一个打完再打下一个true", false)

program.parse(process.argv);
let options = program.opts();
PackManager.ins.oneByOne = options.onebyone;

const packsPath = join(__dirname, '../../../static/packconfigs/Packs.json');
let taskList: PackProject[] = existsSync(packsPath) ? JSON.parse(readFileSync(packsPath, 'utf-8')).packs : [];
PackManager.ins.packs = taskList;

PackManager.ins.logHelper.log(options);
PackManager.ins.packIndex = 0;