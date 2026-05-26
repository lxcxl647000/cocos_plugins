const fs = require('fs');
const path = require('path');

// 1. 定义源目录和目标目录
// __dirname 指向当前脚本所在目录 (即项目根目录下的 scripts 文件夹)
const sourceDir = path.resolve(__dirname, '../build');
// 将下面的路径替换为你想拷贝到的目标路径
const targetDir = path.resolve(__dirname, '../../static/auto-pack/build');

// 2. 编写递归拷贝函数
function copyFolder(source, target) {
    // 如果目标目录不存在，则创建它
    if (!fs.existsSync(target)) {
        fs.mkdirSync(target, { recursive: true });
    }

    // 读取源目录下的所有文件和子目录
    const items = fs.readdirSync(source);
    items.forEach(item => {
        const sourcePath = path.join(source, item);
        const targetPath = path.join(target, item);
        const stats = fs.statSync(sourcePath);

        if (stats.isDirectory()) {
            // 如果是目录，则递归调用
            copyFolder(sourcePath, targetPath);
        } else {
            // 如果是文件，则执行拷贝
            fs.copyFileSync(sourcePath, targetPath);
            // console.log(`已拷贝: ${sourcePath} -> ${targetPath}`);
        }
    });
}

// 3. 执行拷贝
try {
    copyFolder(sourceDir, targetDir);
    console.log(' 拷贝完成！');
    // 向 shell 返回成功状态码
    process.exit(0);
} catch (err) {
    console.error(' 拷贝失败:', err);
    // 向 shell 返回错误状态码
    process.exit(1);
}