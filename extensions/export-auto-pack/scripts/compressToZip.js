const { ZipArchive } = require("archiver");
const { createWriteStream, existsSync, statSync, readFileSync, mkdirSync } = require("fs");
const path = require("path");
const { join } = path;

/**
 * 将指定的文件或文件夹打包为 ZIP
 * @param {string[]} paths - 需要打包的文件或文件夹路径数组（绝对路径）
 * @param {string} outputFileName - 输出的 zip 文件路径（例如 './output.zip'）
 */
async function compressToZip(paths, outputFileName, filter) {
    return new Promise((resolve, reject) => {
        const output = createWriteStream(outputFileName);

        const archive = new ZipArchive({ zlib: { level: 9 } });

        output.on('close', () => {
            console.log(`✅ 压缩完成: ${outputFileName} (${archive.pointer()} bytes)`);
            resolve();
        });

        archive.on('error', (err) => {
            reject(err);
        });

        archive.pipe(output);

        for (const targetPath of paths) {
            if (!existsSync(targetPath)) {
                console.warn(`⚠️ 警告: 路径不存在，已跳过 -> ${targetPath}`);
                continue;
            }

            const stats = statSync(targetPath);
            if (stats.isDirectory()) {
                archive.directory(targetPath, path.basename(targetPath), (entry) => {
                    if (!filter || filter(entry.name)) {
                        return entry;
                    }
                    else {
                        return false;
                    }
                });
            } else {
                archive.file(targetPath, { name: path.basename(targetPath) });
            }
        }

        archive.finalize();
    });
}

try {
    let autoPackDir = join(__dirname, '../../auto-pack');
    // 选取导出插件需要的文件，并压缩成zip包导出
    let paths = [
        join(autoPackDir, 'dist'),
        join(autoPackDir, 'package.json'),
        join(autoPackDir, 'i18n'),
        join(autoPackDir, 'node_modules'),
        join(autoPackDir, 'static')
    ];
    let exportPath = join(__dirname, '../exportZip');
    if (!existsSync(exportPath)) {
        mkdirSync(exportPath);
    }
    exportPath = join(exportPath, 'auto_pack.zip');
    compressToZip(paths, exportPath, (name) => !name.endsWith('Packs.json'));
} catch (error) {
    console.log(`zip 失败`, error);
}