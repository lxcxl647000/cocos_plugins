import { execFileSync } from 'child_process';
import fs, { existsSync } from 'fs';
import os from "os";
import path from 'path';
export default class PackUtil {
    static findApkFiles(directory: string) {
        const apkFiles: string[] = [];

        if (!existsSync(directory)) {
            console.warn('目录不存在:', directory);
            return apkFiles;
        }

        const files = fs.readdirSync(directory);

        for (const file of files) {
            const filePath = path.join(directory, file);
            const stat = fs.statSync(filePath);

            if (stat.isFile() && file.toLowerCase().endsWith('.apk')) {
                apkFiles.push(filePath);
            } else if (stat.isDirectory()) {
                // 递归搜索子目录
                const subApkFiles = this.findApkFiles(filePath);
                apkFiles.push(...subApkFiles);
            }
        }

        return apkFiles;
    }
    /**
     * 把版本号上升 upnum个
     * @param version 当前版本
     * @param upnum 提升版本数值
     * @returns 提升版本号后的版本
     */
    public static versionUp(version: string, upnum: number = 1): string {
        let arr1 = version.split('.');
        arr1[arr1.length - 1] = `${Number(arr1[arr1.length - 1]) + upnum}`;
        return arr1.join('.');
    }

    /**
     * 比较两个版本号的大小
     * @param ver1 版本号1
     * @param ver2 版本号2
     * @returns >0 ver1 > ver2 0 ver1==ver2 <0 ver1 < ver2
     */
    public static compareVersion(ver1: string, ver2: string): number {
        let arr1 = ver1.split('.');
        let arr2 = ver2.split('.');
        let length = Math.min(arr1.length, arr2.length);
        for (let i = 0; i < length; i++) {
            if (arr1[i] == arr2[i]) {
                continue;
            }
            return Number(arr1[i]) - Number(arr2[i]);
        }
        return arr1.length - arr2.length;
    }

    /**
     * 递归创建目录
     * @param dirPath 目录路径
     * @returns 
     */
    public static mkdirSync(dirPath: string) {
        if (fs.existsSync(dirPath)) {
            return true;
        } else {
            if (PackUtil.mkdirSync(path.dirname(dirPath))) {
                fs.mkdirSync(dirPath);
                return true;
            }
        }
    }

    /**
     * 
     */
    public static copyFiles(originalUrl: string, targetUrl: string) {
        try {
            // 读取原路径
            const STATUS = fs.statSync(originalUrl);
            // 获得原路径的末尾部分
            // 此部分亦可通过path模块中的basename()方法提取
            const fileName = path.basename(originalUrl);
            // 如果原路径是文件
            if (STATUS.isFile()) {
                // 在新目录中创建同名文件，并将原文件内容追加到新文件中
                fs.writeFileSync(`${targetUrl}/${fileName}`, fs.readFileSync(originalUrl) as any);
                //如果原路径是目录
            } else if (STATUS.isDirectory()) {
                //在新路径中创建新文件夹
                if (!fs.existsSync(`${targetUrl}/${fileName}`))
                    fs.mkdirSync(`${targetUrl}/${fileName}`);
                //如果原路径是非空目录,遍历原路径
                //空目录时无法使用forEach
                fs.readdirSync(originalUrl).forEach(item => {
                    //更新参数，递归调用
                    this.copyFiles(`${originalUrl}/${item}`, `${targetUrl}/${fileName}`);
                });
            }
        } catch (error) {
            console.log("路径有误", error);
        };
    }


    /**
     * 定义移动函数(由复制函数与删除函数组成)
     * @param {原始路径} originalUrl 
     * @param {目标路径} targetUrl 
     */
    public static moveFiles(originalUrl: string, targetUrl: string) {
        //复制原路径中所有
        this.copyFiles(originalUrl, targetUrl);
        //删除原路径中所有
        this.removeFiles(originalUrl);
    };

    /**
     * @param {需删除的路径} url 
     */
    public static removeFiles(url: string) {
        // 读取原路径
        const STATUS = fs.statSync(url);
        // 如果原路径是文件
        if (STATUS.isFile()) {
            //删除原文件
            fs.unlinkSync(url);
            //如果原路径是目录
        } else if (STATUS.isDirectory()) {
            //如果原路径是非空目录,遍历原路径
            //空目录时无法使用forEach
            fs.readdirSync(url).forEach(item => {
                //递归调用函数，以子文件路径为新参数
                this.removeFiles(`${url}/${item}`);
            });
            //删除空文件夹
            fs.rmdirSync(url);
        };
    }

    /**
     * 上传cdn资源到服务器中
     * @param path1 对应路径名称
     */
    public static uploadCDNRes(path1: string) {
        let runpath = path.join(__dirname, "../../");
        let index = path1.indexOf(":");
        let root = path1.substring(0, index + 1);

        // 根据操作系统选择对应的脚本文件
        let scriptName = PackUtil.isWindow ? "uploadcdn.bat" : "uploadcdn.sh";
        let command = PackUtil.isWindow ? scriptName : `sh ${scriptName}`;
        if (PackUtil.isWindow) {
            execFileSync(command, [root, path1], { cwd: runpath, stdio: 'inherit', shell: true });
        } else {
            execFileSync(command, [path1], { cwd: runpath, stdio: 'inherit', shell: true });
        }
    }

    /**
     * 拉取远端cdn资源到本地服务器
     * @param path1 对应路径名称
     */
    public static pullCDNRes(path1: string) {
        let runpath = path.join(__dirname, "../../");
        let index = path1.indexOf(":");
        let root = path1.substring(0, index + 1);
        // 根据操作系统选择对应的脚本文件
        let scriptName = PackUtil.isWindow ? "pullcdn.bat" : "pullcdn.sh";
        let command = PackUtil.isWindow ? scriptName : `sh ${scriptName}`;
        if (PackUtil.isWindow) {
            execFileSync(command, [root, path1], { cwd: runpath, stdio: 'inherit', shell: true });
        } else {
            execFileSync(command, [path1], { cwd: runpath, stdio: 'inherit', shell: true });

        }
    }

    /**
     * 把版本号转换成整数的code
     * @param version 版本号类似 1.0.0
     */
    public static appVersionToCode(version: String): number {
        let splits = version.split(".");
        let num = 0;
        let versionratio = [1000000, 10000, 100, 1];
        versionratio = versionratio.slice(versionratio.length - splits.length);
        for (let i = 0, len = splits.length; i < len; i++) {
            let count = Number(splits[i]) * (versionratio[i] || 0);
            num += count;
        }
        // let num = version.replace(/\./g,"");
        return num;
    }

    public static get isIOS() {
        if (os.type() == "Darwin") {
            return true;
        }
        return false;
    }

    public static get isWindow() {
        if (os.type() == "Windows_NT") {
            return true;
        }
        return false;
    }

    public static getLastDirectoryName(filePath: string): string {
        // 先获取父目录，再获取父目录的basename
        return path.basename(filePath);
    }
}