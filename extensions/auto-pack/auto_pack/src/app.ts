#!/usr/bin/env node
import { program } from "commander";
import PackManager from "./pack/PackManager";

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = '1';
program
    .option("-o, --onebyone", "是否一个一个的打默认false 一个打完再打下一个true", false)
    .option("-p, --packs <value>", "要打包的工程")

program.parse(process.argv);
let options = program.opts();

PackManager.ins.oneByOne = options.onebyone;
if (options.packs && options.packs !== '') {
    // 避免双引号在命令行中被吃掉，在发送端时进行了base64编码，所以这里要解码一下
    let jsonStr = Buffer.from(options.packs, 'base64').toString('utf-8');
    options.packs = JSON.parse(jsonStr);
    PackManager.ins.packs = options.packs.packs;
}
PackManager.ins.logHelper.log(options);
PackManager.ins.packIndex = 0;