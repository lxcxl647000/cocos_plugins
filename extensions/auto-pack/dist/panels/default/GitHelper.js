"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHelper = void 0;
const simple_git_1 = __importDefault(require("simple-git"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
class GitHelper {
    constructor(options) {
        var _a;
        const gitOptions = {
            baseDir: options.projectPath,
            binary: 'git',
            maxConcurrentProcesses: 1,
        };
        this._git = (0, simple_git_1.default)(gitOptions);
        this._log = (_a = options.onLog) !== null && _a !== void 0 ? _a : console.log;
    }
    updateGit(baseDir) {
        this._git = (0, simple_git_1.default)({ baseDir, binary: 'git', maxConcurrentProcesses: 1 });
    }
    /**
     * 执行更新到最新代码
     */
    async updateToLatest(options) {
        const { projectPath, gitUrl, branch = 'main', force = false } = options;
        try {
            // 场景一：本地已有 Git 仓库 → pull
            if (await this.isGitRepo(projectPath)) {
                this._log(`📂 检测到本地仓库: ${projectPath}`);
                return await this.pullLatest(projectPath, branch, force);
            }
            // 场景二：本地无仓库 → clone
            this._log(`📥 本地未检测到仓库，开始克隆...`);
            return await this.cloneRepo(projectPath, gitUrl, branch);
        }
        catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            this._log(`❌ Git 更新失败: ${errMsg}`);
            return {
                success: false,
                message: `更新失败: ${errMsg}`,
                projectPath,
            };
        }
    }
    /**
     * 判断目录是否为 Git 仓库
     */
    async isGitRepo(dir) {
        if (!fs.existsSync(dir)) {
            return false;
        }
        try {
            const isRepo = await (0, simple_git_1.default)(dir).checkIsRepo();
            return isRepo;
        }
        catch (_a) {
            return false;
        }
    }
    /**
     * 拉取最新代码
     */
    async pullLatest(projectPath, branch, force) {
        var _a, _b, _c, _d;
        const git = (0, simple_git_1.default)(projectPath);
        // 获取更新前的 commit
        const prevLog = await git.log({ maxCount: 1 });
        const previousHash = (_b = (_a = prevLog.latest) === null || _a === void 0 ? void 0 : _a.hash) !== null && _b !== void 0 ? _b : 'unknown';
        this._log(`📌 更新前版本: ${previousHash.substring(0, 7)}`);
        // 如果有本地修改且开启了 force，先重置
        const status = await git.status();
        if (!status.isClean()) {
            if (force) {
                this._log(`⚠️ 检测到本地修改，强制模式：重置中...`);
                await git.reset(['--hard', 'HEAD']);
                await git.clean('f', ['-d']);
            }
            else {
                this._log(`⚠️ 检测到本地未提交的修改，尝试暂存...`);
                await git.stash();
            }
        }
        // fetch + pull
        this._log(`🔄 正在拉取分支 [${branch}] 的最新代码...`);
        await git.fetch('origin', branch);
        await git.pull('origin', branch);
        // 获取更新后的 commit
        const currentLog = await git.log({ maxCount: 1 });
        const currentHash = (_d = (_c = currentLog.latest) === null || _c === void 0 ? void 0 : _c.hash) !== null && _d !== void 0 ? _d : 'unknown';
        this._log(`📌 更新后版本: ${currentHash.substring(0, 7)}`);
        // 统计更新了多少个提交
        const commitsBehind = await this.countCommitsBehind(git, branch);
        const isUpdated = previousHash !== currentHash;
        const message = isUpdated
            ? `✅ 更新成功！已从 ${previousHash.substring(0, 7)} 更新到 ${currentHash.substring(0, 7)}，共 ${commitsBehind} 个新提交`
            : `✅ 已是最新代码，无需更新`;
        this._log(message);
        return {
            success: true,
            message,
            previousHash,
            currentHash,
            commitsBehind,
            projectPath
        };
    }
    /**
     * 克隆仓库
     */
    async cloneRepo(projectPath, gitUrl, branch) {
        var _a, _b;
        // 确保父目录存在
        const parentDir = path.dirname(projectPath);
        if (!fs.existsSync(parentDir)) {
            fs.mkdirSync(parentDir, { recursive: true });
        }
        this._log(`📥 正在克隆 ${gitUrl} (分支: ${branch})...`);
        await (0, simple_git_1.default)().clone(gitUrl, projectPath, ['--branch', branch, '--single-branch']);
        // 获取最新 commit 信息
        const git = (0, simple_git_1.default)(projectPath);
        const log = await git.log({ maxCount: 1 });
        const currentHash = (_b = (_a = log.latest) === null || _a === void 0 ? void 0 : _a.hash) !== null && _b !== void 0 ? _b : 'unknown';
        const message = `✅ 克隆成功！最新版本: ${currentHash.substring(0, 7)}`;
        this._log(message);
        return {
            success: true,
            message,
            currentHash,
            projectPath
        };
    }
    /**
     * 计算本地落后远程多少个提交
     */
    async countCommitsBehind(git, branch) {
        try {
            const result = await git.raw([
                'rev-list', '--count', `HEAD..origin/${branch}`,
            ]);
            return parseInt(result.trim(), 10) || 0;
        }
        catch (_a) {
            return 0;
        }
    }
    /**
     * 获取当前仓库信息（可在插件面板展示）
     */
    async getRepoInfo() {
        var _a, _b, _c, _d, _e;
        try {
            const branch = await this._git.revparse(['--abbrev-ref', 'HEAD']);
            const log = await this._git.log({ maxCount: 1 });
            const status = await this._git.status();
            return {
                branch: branch.trim(),
                latestCommit: (_c = (_b = (_a = log.latest) === null || _a === void 0 ? void 0 : _a.hash) === null || _b === void 0 ? void 0 : _b.substring(0, 7)) !== null && _c !== void 0 ? _c : 'unknown',
                latestMessage: (_e = (_d = log.latest) === null || _d === void 0 ? void 0 : _d.message) !== null && _e !== void 0 ? _e : '',
                isClean: status.isClean(),
            };
        }
        catch (_f) {
            return null;
        }
    }
}
exports.GitHelper = GitHelper;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiR2l0SGVscGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc291cmNlL3BhbmVscy9kZWZhdWx0L0dpdEhlbHBlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSw0REFBb0U7QUFDcEUsMkNBQTZCO0FBQzdCLHVDQUF5QjtBQTZCekIsTUFBYSxTQUFTO0lBSWxCLFlBQVksT0FBeUI7O1FBQ2pDLE1BQU0sVUFBVSxHQUE4QjtZQUMxQyxPQUFPLEVBQUUsT0FBTyxDQUFDLFdBQVc7WUFDNUIsTUFBTSxFQUFFLEtBQUs7WUFDYixzQkFBc0IsRUFBRSxDQUFDO1NBQzVCLENBQUM7UUFDRixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUEsb0JBQVMsRUFBQyxVQUFVLENBQUMsQ0FBQztRQUNsQyxJQUFJLENBQUMsSUFBSSxHQUFHLE1BQUEsT0FBTyxDQUFDLEtBQUssbUNBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQztJQUM3QyxDQUFDO0lBRU0sU0FBUyxDQUFDLE9BQWU7UUFDNUIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFBLG9CQUFTLEVBQUMsRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxzQkFBc0IsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ2pGLENBQUM7SUFFRDs7T0FFRztJQUNJLEtBQUssQ0FBQyxjQUFjLENBQUMsT0FBeUI7UUFDakQsTUFBTSxFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQUUsTUFBTSxHQUFHLE1BQU0sRUFBRSxLQUFLLEdBQUcsS0FBSyxFQUFFLEdBQUcsT0FBTyxDQUFDO1FBRXhFLElBQUksQ0FBQztZQUNELHlCQUF5QjtZQUN6QixJQUFJLE1BQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO2dCQUNwQyxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsV0FBVyxFQUFFLENBQUMsQ0FBQztn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QUFDO1lBQ0wsT0FBTyxDQUFDLENBQUM7UUFDYixDQUFDO0lBQ0wsQ0FBQztJQUVEOztPQUVHO0lBQ0ksS0FBSyxDQUFDLFdBQVc7O1FBTXBCLElBQUksQ0FBQztZQUNELE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxjQUFjLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUNsRSxNQUFNLEdBQUcsR0FBRyxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDakQsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBRXhDLE9BQU87Z0JBQ0gsTUFBTSxFQUFFLE1BQU0sQ0FBQyxJQUFJLEVBQUU7Z0JBQ3JCLFlBQVksRUFBRSxNQUFBLE1BQUEsTUFBQSxHQUFHLENBQUMsTUFBTSwwQ0FBRSxJQUFJLDBDQUFFLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLG1DQUFJLFNBQVM7Z0JBQzVELGFBQWEsRUFBRSxNQUFBLE1BQUEsR0FBRyxDQUFDLE1BQU0sMENBQUUsT0FBTyxtQ0FBSSxFQUFFO2dCQUN4QyxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sRUFBRTthQUM1QixDQUFDO1FBQ04sQ0FBQztRQUFDLFdBQU0sQ0FBQztZQUNMLE9BQU8sSUFBSSxDQUFDO1FBQ2hCLENBQUM7SUFDTCxDQUFDO0NBQ0o7QUE3TEQsOEJBNkxDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHNpbXBsZUdpdCwgeyBTaW1wbGVHaXQsIFNpbXBsZUdpdE9wdGlvbnMgfSBmcm9tICdzaW1wbGUtZ2l0JztcclxuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcclxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xyXG5cclxuLyoqIOabtOaWsOe7k+aenCAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIEdpdFVwZGF0ZVJlc3VsdCB7XHJcbiAgICBzdWNjZXNzOiBib29sZWFuO1xyXG4gICAgbWVzc2FnZTogc3RyaW5nO1xyXG4gICAgLyoqIOabtOaWsOWJjeeahCBjb21taXQgaGFzaCAqL1xyXG4gICAgcHJldmlvdXNIYXNoPzogc3RyaW5nO1xyXG4gICAgLyoqIOabtOaWsOWQjueahCBjb21taXQgaGFzaCAqL1xyXG4gICAgY3VycmVudEhhc2g/OiBzdHJpbmc7XHJcbiAgICAvKiog5pu05paw5YmN5ZCO55qE5o+Q5Lqk5beu5byC5pWwICovXHJcbiAgICBjb21taXRzQmVoaW5kPzogbnVtYmVyO1xyXG4gICAgcHJvamVjdFBhdGg/OiBzdHJpbmc7XHJcbn1cclxuXHJcbi8qKiDmm7TmlrDphY3nva4gKi9cclxuZXhwb3J0IGludGVyZmFjZSBHaXRVcGRhdGVPcHRpb25zIHtcclxuICAgIC8qKiDpobnnm67mnKzlnLDot6/lvoQgKi9cclxuICAgIHByb2plY3RQYXRoOiBzdHJpbmc7XHJcbiAgICAvKiogR2l0IOi/nOeoi+S7k+W6k+WcsOWdgCAqL1xyXG4gICAgZ2l0VXJsOiBzdHJpbmc7XHJcbiAgICAvKiog55uu5qCH5YiG5pSv77yM6buY6K6kIG1haW4gKi9cclxuICAgIGJyYW5jaD86IHN0cmluZztcclxuICAgIC8qKiDmmK/lkKblvLrliLbmm7TmlrDvvIjkuKLlvIPmnKzlnLDkv67mlLnvvInvvIzpu5jorqQgZmFsc2UgKi9cclxuICAgIGZvcmNlPzogYm9vbGVhbjtcclxuICAgIC8qKiDml6Xlv5flm57osIPvvIzmlrnkvr/lr7nmjqUgQ29jb3Mg5o+S5Lu26Z2i5p2/6L6T5Ye6ICovXHJcbiAgICBvbkxvZz86IChtc2c6IHN0cmluZykgPT4gdm9pZDtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEdpdEhlbHBlciB7XHJcbiAgICBwcml2YXRlIF9naXQ6IFNpbXBsZUdpdDtcclxuICAgIHByaXZhdGUgX2xvZzogKG1zZzogc3RyaW5nKSA9PiB2b2lkO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnM6IEdpdFVwZGF0ZU9wdGlvbnMpIHtcclxuICAgICAgICBjb25zdCBnaXRPcHRpb25zOiBQYXJ0aWFsPFNpbXBsZUdpdE9wdGlvbnM+ID0ge1xyXG4gICAgICAgICAgICBiYXNlRGlyOiBvcHRpb25zLnByb2plY3RQYXRoLFxyXG4gICAgICAgICAgICBiaW5hcnk6ICdnaXQnLFxyXG4gICAgICAgICAgICBtYXhDb25jdXJyZW50UHJvY2Vzc2VzOiAxLFxyXG4gICAgICAgIH07XHJcbiAgICAgICAgdGhpcy5fZ2l0ID0gc2ltcGxlR2l0KGdpdE9wdGlvbnMpO1xyXG4gICAgICAgIHRoaXMuX2xvZyA9IG9wdGlvbnMub25Mb2cgPz8gY29uc29sZS5sb2c7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHVwZGF0ZUdpdChiYXNlRGlyOiBzdHJpbmcpIHtcclxuICAgICAgICB0aGlzLl9naXQgPSBzaW1wbGVHaXQoeyBiYXNlRGlyLCBiaW5hcnk6ICdnaXQnLCBtYXhDb25jdXJyZW50UHJvY2Vzc2VzOiAxIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICog5omn6KGM5pu05paw5Yiw5pyA5paw5Luj56CBXHJcbiAgICAgKi9cclxuICAgIHB1YmxpYyBhc3luYyB1cGRhdGVUb0xhdGVzdChvcHRpb25zOiBHaXRVcGRhdGVPcHRpb25zKTogUHJvbWlzZTxHaXRVcGRhdGVSZXN1bHQ+IHtcclxuICAgICAgICBjb25zdCB7IHByb2plY3RQYXRoLCBnaXRVcmwsIGJyYW5jaCA9ICdtYWluJywgZm9yY2UgPSBmYWxzZSB9ID0gb3B0aW9ucztcclxuXHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgLy8g5Zy65pmv5LiA77ya5pys5Zyw5bey5pyJIEdpdCDku5PlupMg4oaSIHB1bGxcclxuICAgICAgICAgICAgaWYgKGF3YWl0IHRoaXMuaXNHaXRSZXBvKHByb2plY3RQYXRoKSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fbG9nKGDwn5OCIOajgOa1i+WIsOacrOWcsOS7k+W6kzogJHtwcm9qZWN0UGF0aH1gKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnB1bGxMYXRlc3QocHJvamVjdFBhdGgsIGJyYW5jaCwgZm9yY2UpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyDlnLrmma/kuozvvJrmnKzlnLDml6Dku5PlupMg4oaSIGNsb25lXHJcbiAgICAgICAgICAgIHRoaXMuX2xvZyhg8J+TpSDmnKzlnLDmnKrmo4DmtYvliLDku5PlupPvvIzlvIDlp4vlhYvpmoYuLi5gKTtcclxuICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuY2xvbmVSZXBvKHByb2plY3RQYXRoLCBnaXRVcmwsIGJyYW5jaCk7XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcclxuICAgICAgICAgICAgY29uc3QgZXJyTXNnID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpO1xyXG4gICAgICAgICAgICB0aGlzLl9sb2coYOKdjCBHaXQg5pu05paw5aSx6LSlOiAke2Vyck1zZ31gKTtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogYOabtOaWsOWksei0pTogJHtlcnJNc2d9YCxcclxuICAgICAgICAgICAgICAgIHByb2plY3RQYXRoLFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIOWIpOaWreebruW9leaYr+WQpuS4uiBHaXQg5LuT5bqTXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgYXN5bmMgaXNHaXRSZXBvKGRpcjogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XHJcbiAgICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKGRpcikpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBpc1JlcG8gPSBhd2FpdCBzaW1wbGVHaXQoZGlyKS5jaGVja0lzUmVwbygpO1xyXG4gICAgICAgICAgICByZXR1cm4gaXNSZXBvO1xyXG4gICAgICAgIH0gY2F0Y2gge1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICog5ouJ5Y+W5pyA5paw5Luj56CBXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgYXN5bmMgcHVsbExhdGVzdChcclxuICAgICAgICBwcm9qZWN0UGF0aDogc3RyaW5nLFxyXG4gICAgICAgIGJyYW5jaDogc3RyaW5nLFxyXG4gICAgICAgIGZvcmNlOiBib29sZWFuXHJcbiAgICApOiBQcm9taXNlPEdpdFVwZGF0ZVJlc3VsdD4ge1xyXG4gICAgICAgIGNvbnN0IGdpdCA9IHNpbXBsZUdpdChwcm9qZWN0UGF0aCk7XHJcblxyXG4gICAgICAgIC8vIOiOt+WPluabtOaWsOWJjeeahCBjb21taXRcclxuICAgICAgICBjb25zdCBwcmV2TG9nID0gYXdhaXQgZ2l0LmxvZyh7IG1heENvdW50OiAxIH0pO1xyXG4gICAgICAgIGNvbnN0IHByZXZpb3VzSGFzaCA9IHByZXZMb2cubGF0ZXN0Py5oYXNoID8/ICd1bmtub3duJztcclxuICAgICAgICB0aGlzLl9sb2coYPCfk4wg5pu05paw5YmN54mI5pysOiAke3ByZXZpb3VzSGFzaC5zdWJzdHJpbmcoMCwgNyl9YCk7XHJcblxyXG4gICAgICAgIC8vIOWmguaenOacieacrOWcsOS/ruaUueS4lOW8gOWQr+S6hiBmb3JjZe+8jOWFiOmHjee9rlxyXG4gICAgICAgIGNvbnN0IHN0YXR1cyA9IGF3YWl0IGdpdC5zdGF0dXMoKTtcclxuICAgICAgICBpZiAoIXN0YXR1cy5pc0NsZWFuKCkpIHtcclxuICAgICAgICAgICAgaWYgKGZvcmNlKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9sb2coYOKaoO+4jyDmo4DmtYvliLDmnKzlnLDkv67mlLnvvIzlvLrliLbmqKHlvI/vvJrph43nva7kuK0uLi5gKTtcclxuICAgICAgICAgICAgICAgIGF3YWl0IGdpdC5yZXNldChbJy0taGFyZCcsICdIRUFEJ10pO1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgZ2l0LmNsZWFuKCdmJywgWyctZCddKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuX2xvZyhg4pqg77iPIOajgOa1i+WIsOacrOWcsOacquaPkOS6pOeahOS/ruaUue+8jOWwneivleaaguWtmC4uLmApO1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgZ2l0LnN0YXNoKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGZldGNoICsgcHVsbFxyXG4gICAgICAgIHRoaXMuX2xvZyhg8J+UhCDmraPlnKjmi4nlj5bliIbmlK8gWyR7YnJhbmNofV0g55qE5pyA5paw5Luj56CBLi4uYCk7XHJcbiAgICAgICAgYXdhaXQgZ2l0LmZldGNoKCdvcmlnaW4nLCBicmFuY2gpO1xyXG4gICAgICAgIGF3YWl0IGdpdC5wdWxsKCdvcmlnaW4nLCBicmFuY2gpO1xyXG5cclxuICAgICAgICAvLyDojrflj5bmm7TmlrDlkI7nmoQgY29tbWl0XHJcbiAgICAgICAgY29uc3QgY3VycmVudExvZyA9IGF3YWl0IGdpdC5sb2coeyBtYXhDb3VudDogMSB9KTtcclxuICAgICAgICBjb25zdCBjdXJyZW50SGFzaCA9IGN1cnJlbnRMb2cubGF0ZXN0Py5oYXNoID8/ICd1bmtub3duJztcclxuICAgICAgICB0aGlzLl9sb2coYPCfk4wg5pu05paw5ZCO54mI5pysOiAke2N1cnJlbnRIYXNoLnN1YnN0cmluZygwLCA3KX1gKTtcclxuXHJcbiAgICAgICAgLy8g57uf6K6h5pu05paw5LqG5aSa5bCR5Liq5o+Q5LqkXHJcbiAgICAgICAgY29uc3QgY29tbWl0c0JlaGluZCA9IGF3YWl0IHRoaXMuY291bnRDb21taXRzQmVoaW5kKGdpdCwgYnJhbmNoKTtcclxuXHJcbiAgICAgICAgY29uc3QgaXNVcGRhdGVkID0gcHJldmlvdXNIYXNoICE9PSBjdXJyZW50SGFzaDtcclxuICAgICAgICBjb25zdCBtZXNzYWdlID0gaXNVcGRhdGVkXHJcbiAgICAgICAgICAgID8gYOKchSDmm7TmlrDmiJDlip/vvIHlt7Lku44gJHtwcmV2aW91c0hhc2guc3Vic3RyaW5nKDAsIDcpfSDmm7TmlrDliLAgJHtjdXJyZW50SGFzaC5zdWJzdHJpbmcoMCwgNyl977yM5YWxICR7Y29tbWl0c0JlaGluZH0g5Liq5paw5o+Q5LqkYFxyXG4gICAgICAgICAgICA6IGDinIUg5bey5piv5pyA5paw5Luj56CB77yM5peg6ZyA5pu05pawYDtcclxuXHJcbiAgICAgICAgdGhpcy5fbG9nKG1lc3NhZ2UpO1xyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICBtZXNzYWdlLFxyXG4gICAgICAgICAgICBwcmV2aW91c0hhc2gsXHJcbiAgICAgICAgICAgIGN1cnJlbnRIYXNoLFxyXG4gICAgICAgICAgICBjb21taXRzQmVoaW5kLFxyXG4gICAgICAgICAgICBwcm9qZWN0UGF0aFxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiDlhYvpmobku5PlupNcclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBhc3luYyBjbG9uZVJlcG8oXHJcbiAgICAgICAgcHJvamVjdFBhdGg6IHN0cmluZyxcclxuICAgICAgICBnaXRVcmw6IHN0cmluZyxcclxuICAgICAgICBicmFuY2g6IHN0cmluZ1xyXG4gICAgKTogUHJvbWlzZTxHaXRVcGRhdGVSZXN1bHQ+IHtcclxuICAgICAgICAvLyDnoa7kv53niLbnm67lvZXlrZjlnKhcclxuICAgICAgICBjb25zdCBwYXJlbnREaXIgPSBwYXRoLmRpcm5hbWUocHJvamVjdFBhdGgpO1xyXG4gICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhwYXJlbnREaXIpKSB7XHJcbiAgICAgICAgICAgIGZzLm1rZGlyU3luYyhwYXJlbnREaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5fbG9nKGDwn5OlIOato+WcqOWFi+mahiAke2dpdFVybH0gKOWIhuaUrzogJHticmFuY2h9KS4uLmApO1xyXG4gICAgICAgIGF3YWl0IHNpbXBsZUdpdCgpLmNsb25lKGdpdFVybCwgcHJvamVjdFBhdGgsIFsnLS1icmFuY2gnLCBicmFuY2gsICctLXNpbmdsZS1icmFuY2gnXSk7XHJcblxyXG4gICAgICAgIC8vIOiOt+WPluacgOaWsCBjb21taXQg5L+h5oGvXHJcbiAgICAgICAgY29uc3QgZ2l0ID0gc2ltcGxlR2l0KHByb2plY3RQYXRoKTtcclxuICAgICAgICBjb25zdCBsb2cgPSBhd2FpdCBnaXQubG9nKHsgbWF4Q291bnQ6IDEgfSk7XHJcbiAgICAgICAgY29uc3QgY3VycmVudEhhc2ggPSBsb2cubGF0ZXN0Py5oYXNoID8/ICd1bmtub3duJztcclxuXHJcbiAgICAgICAgY29uc3QgbWVzc2FnZSA9IGDinIUg5YWL6ZqG5oiQ5Yqf77yB5pyA5paw54mI5pysOiAke2N1cnJlbnRIYXNoLnN1YnN0cmluZygwLCA3KX1gO1xyXG4gICAgICAgIHRoaXMuX2xvZyhtZXNzYWdlKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgbWVzc2FnZSxcclxuICAgICAgICAgICAgY3VycmVudEhhc2gsXHJcbiAgICAgICAgICAgIHByb2plY3RQYXRoXHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIOiuoeeul+acrOWcsOiQveWQjui/nOeoi+WkmuWwkeS4quaPkOS6pFxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIGFzeW5jIGNvdW50Q29tbWl0c0JlaGluZChnaXQ6IFNpbXBsZUdpdCwgYnJhbmNoOiBzdHJpbmcpOiBQcm9taXNlPG51bWJlcj4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGdpdC5yYXcoW1xyXG4gICAgICAgICAgICAgICAgJ3Jldi1saXN0JywgJy0tY291bnQnLCBgSEVBRC4ub3JpZ2luLyR7YnJhbmNofWAsXHJcbiAgICAgICAgICAgIF0pO1xyXG4gICAgICAgICAgICByZXR1cm4gcGFyc2VJbnQocmVzdWx0LnRyaW0oKSwgMTApIHx8IDA7XHJcbiAgICAgICAgfSBjYXRjaCB7XHJcbiAgICAgICAgICAgIHJldHVybiAwO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIOiOt+WPluW9k+WJjeS7k+W6k+S/oeaBr++8iOWPr+WcqOaPkuS7tumdouadv+Wxleekuu+8iVxyXG4gICAgICovXHJcbiAgICBwdWJsaWMgYXN5bmMgZ2V0UmVwb0luZm8oKTogUHJvbWlzZTx7XHJcbiAgICAgICAgYnJhbmNoOiBzdHJpbmc7XHJcbiAgICAgICAgbGF0ZXN0Q29tbWl0OiBzdHJpbmc7XHJcbiAgICAgICAgbGF0ZXN0TWVzc2FnZTogc3RyaW5nO1xyXG4gICAgICAgIGlzQ2xlYW46IGJvb2xlYW47XHJcbiAgICB9IHwgbnVsbD4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGJyYW5jaCA9IGF3YWl0IHRoaXMuX2dpdC5yZXZwYXJzZShbJy0tYWJicmV2LXJlZicsICdIRUFEJ10pO1xyXG4gICAgICAgICAgICBjb25zdCBsb2cgPSBhd2FpdCB0aGlzLl9naXQubG9nKHsgbWF4Q291bnQ6IDEgfSk7XHJcbiAgICAgICAgICAgIGNvbnN0IHN0YXR1cyA9IGF3YWl0IHRoaXMuX2dpdC5zdGF0dXMoKTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBicmFuY2g6IGJyYW5jaC50cmltKCksXHJcbiAgICAgICAgICAgICAgICBsYXRlc3RDb21taXQ6IGxvZy5sYXRlc3Q/Lmhhc2g/LnN1YnN0cmluZygwLCA3KSA/PyAndW5rbm93bicsXHJcbiAgICAgICAgICAgICAgICBsYXRlc3RNZXNzYWdlOiBsb2cubGF0ZXN0Py5tZXNzYWdlID8/ICcnLFxyXG4gICAgICAgICAgICAgICAgaXNDbGVhbjogc3RhdHVzLmlzQ2xlYW4oKSxcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9IGNhdGNoIHtcclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59Il19