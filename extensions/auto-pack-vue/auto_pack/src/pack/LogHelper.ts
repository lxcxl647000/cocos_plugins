import path from "path";
import fs from 'fs';

enum LogType {
    LOG = 'log',
    ERROR = 'error',
    WARN = 'warn'
}
export default class LogHelper {
    static readonly TAG = '--LOG--';
    private _logArr: { time: string, log: string }[] = [];
    public subTag: string = '';
    private _outputPath: string = '';

    constructor(outputPath: string, subTag?: string) {
        if (subTag) {
            this.subTag = subTag;
        }
        this._outputPath = outputPath;
    }

    public log(...data: any[]) {
        this._log(LogType.LOG, ...data);
    }

    public error(...data: any[]) {
        this._log(LogType.ERROR, ...data);
    }

    public warn(...data: any[]) {
        this._log(LogType.WARN, ...data);
    }

    private _log(type: LogType, ...data: any[]) {
        let str = '';
        data.forEach((item, index) => {
            if (typeof item === 'string') {
                str += item + '\n';
            }
            else if (typeof item === 'object' && item !== null) {
                try {
                    str += JSON.stringify(item, null, 2) + '\n';
                } catch (e) {
                    str += String(item) + '\n';
                }
            }
            else {
                str += String(item) + '\n';
            }
        });

        let timeStr = new Date().toLocaleString();
        let tag = ` [${type}] `;
        str = LogHelper.TAG + this.subTag + tag + ' ' + str;
        this._logArr.push({ time: timeStr, log: str });
        if (type === LogType.LOG) {
            console.log(str, timeStr);
        }
        else if (type === LogType.ERROR) {
            console.error(str, timeStr);
        }
        else if (type === LogType.WARN) {
            console.warn(str, timeStr);
        }
        else {
            console.log(str, timeStr);
        }
    }

    public saveLog() {
        let str = '';
        this._logArr.forEach((log: { time: string, log: string }) => {
            str += `${log.time} : ${log.log}`;
        });
        if (this._outputPath) {
            if (!fs.existsSync(this._outputPath)) {
                fs.mkdirSync(this._outputPath, { recursive: true });
            }
            const now = new Date();
            const timeStr = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}_${now.getMinutes().toString().padStart(2, '0')}_${now.getSeconds().toString().padStart(2, '0')}`;
            const logPath = path.join(this._outputPath, `log-${timeStr}.txt`);
            fs.writeFileSync(logPath, str, { encoding: 'utf8' });
        }
    }
}