#!/usr/bin/env node
import { program } from "commander";
import PackManager from "./pack/PackManager";

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = '1';
program
    .option("-o, --onebyone", "是否一个一个的打默认false 一个打完再打下一个true", false)
    .option("-p, --packs <value>", "要打包的工程")

program.parse(process.argv);
const options = program.opts();
console.log(options);
PackManager.ins.oneByOne = options.onebyone;

if (options.packs && options.packs !== '') {
    // 避免双引号在命令行中被吃掉，在发送端时进行了base64编码，所以这里要解码一下
    let jsonStr = Buffer.from(options.packs, 'base64').toString('utf-8');
    PackManager.ins.packs = JSON.parse(jsonStr).packs;
}

// 从第一个工程开始打包
if (PackManager.ins.oneByOne) {
    PackManager.ins.packIndex = 0;
}
else {
    let packs = PackManager.ins.packs;
    for (let i = 0; i < packs.length; i++) {
        PackManager.ins.doPack(i);
    }
}

/*e:
set batcommond=-d
if %ISSKIP%==true set batcommond=%batcommond% -s
if %ISNONOTIFY%==true set batcommond=%batcommond% -no
if %ISCOMPRESS%==true set batcommond=%batcommond% -cp
if %ISOBFUS%==true set batcommond=%batcommond% -oc
if %LOCAL%==true set batcommond=%batcommond% -l
creatorpacker -p %WORKSPACE% -c web_desktop -v 1.0.0 -t test -bn %BMS_NAME% -bv %BMS_VERSION% -rc %remoteConfig% %batcommond%
/*
# 初始化参数数组
batcommond="-d"

# 根据环境变量构建参数
if [ "$ISSKIP" = "true" ]; then
    batcommond="$batcommond -s"
fi

if [ "$ISNONOTIFY" = "true" ]; then
    batcommond="$batcommond -no"
fi

if [ "$ISCOMPRESS" = "true" ]; then
    batcommond="$batcommond -cp"
fi

if [ "$ISOBFUS" = "true" ]; then
    batcommond="$batcommond -oc"
fi

if [ "$LOCAL" = "true" ]; then
    batcommond="$batcommond -l"
fi

# 执行命令
creatorpacker -p "$WORKSPACE" -c "$PLATFORMS" -v 1.0.0 -t "$UPLOAD_DESC" -bn "$BMS_NAME" -bv "$BMS_VERSION" -rc "$remoteConfig" $batcommond

*/