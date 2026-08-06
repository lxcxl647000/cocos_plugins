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
    /**
    * 【新增】检查本地代码是否与远程最新一致（不执行更新）
    *  适用于构建前的版本校验
    */
    async checkVersionSync() {
        try {
            const status = await this._git.status();
            const currentBranch = status.current || 'unknown';
            this._log(`🔍 正在检查本地分支 [${currentBranch}] 与远程版本是否一致...`);
            // 1. 先 fetch 一下，确保本地的 remote 跟踪分支是最新的
            await this._git.fetch('origin', currentBranch);
            // 2. 获取本地最新的 commit hash
            const localHash = await this._git.revparse(['HEAD']);
            // 3. 获取远程跟踪分支的最新 commit hash
            const remoteHash = await this._git.revparse([`origin/${currentBranch}`]);
            // 4. 对比 hash
            if (localHash === remoteHash) {
                const msg = `✅ 版本一致！本地已是最新 (Hash: ${localHash.substring(0, 7)})，允许构建。`;
                this._log(msg);
                return { isSynced: true, message: msg };
            }
            else {
                // 计算落后了多少个提交
                const behindCount = await this.countCommitsBehind(this._git, currentBranch);
                const msg = `⚠️ 版本不一致！本地落后远程 ${behindCount} 个提交。\n` +
                    `本地: ${localHash.substring(0, 7)} | 远程: ${remoteHash.substring(0, 7)}\n` +
                    `请先更新代码再进行构建！`;
                this._log(msg);
                return { isSynced: false, message: msg };
            }
        }
        catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            const msg = `❌ 版本检查失败: ${errMsg}`;
            this._log(msg);
            return { isSynced: false, message: msg };
        }
    }
}
exports.GitHelper = GitHelper;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiR2l0SGVscGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc291cmNlL3BhbmVscy9kZWZhdWx0L0dpdEhlbHBlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSw0REFBb0U7QUFDcEUsMkNBQTZCO0FBQzdCLHVDQUF5QjtBQTZCekIsTUFBYSxTQUFTO0lBSWxCLFlBQVksT0FBeUI7O1FBQ2pDLE1BQU0sVUFBVSxHQUE4QjtZQUMxQyxPQUFPLEVBQUUsT0FBTyxDQUFDLFdBQVc7WUFDNUIsTUFBTSxFQUFFLEtBQUs7WUFDYixzQkFBc0IsRUFBRSxDQUFDO1NBQzVCLENBQUM7UUFDRixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUEsb0JBQVMsRUFBQyxVQUFVLENBQUMsQ0FBQztRQUNsQyxJQUFJLENBQUMsSUFBSSxHQUFHLE1BQUEsT0FBTyxDQUFDLEtBQUssbUNBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQztJQUM3QyxDQUFDO0lBRU0sU0FBUyxDQUFDLE9BQWU7UUFDNUIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFBLG9CQUFTLEVBQUMsRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxzQkFBc0IsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ2pGLENBQUM7SUFFRDs7T0FFRztJQUNJLEtBQUssQ0FBQyxjQUFjLENBQUMsT0FBeUI7UUFDakQsTUFBTSxFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQUUsTUFBTSxHQUFHLE1BQU0sRUFBRSxLQUFLLEdBQUcsS0FBSyxFQUFFLEdBQUcsT0FBTyxDQUFDO1FBRXhFLElBQUksQ0FBQztZQUNELHlCQUF5QjtZQUN6QixJQUFJLE1BQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO2dCQUNwQyxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsV0FBVyxFQUFFLENBQUMsQ0FBQztn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QUUsQ0FBQztZQUN0QixNQUFNLE1BQU0sR0FBRyxLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDdEUsTUFBTSxHQUFHLEdBQUcsYUFBYSxNQUFNLEVBQUUsQ0FBQztZQUNsQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2YsT0FBTyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxDQUFDO1FBQzdDLENBQUM7SUFDTCxDQUFDO0NBQ0o7QUF2T0QsOEJBdU9DIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHNpbXBsZUdpdCwgeyBTaW1wbGVHaXQsIFNpbXBsZUdpdE9wdGlvbnMgfSBmcm9tICdzaW1wbGUtZ2l0JztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5cbi8qKiDmm7TmlrDnu5PmnpwgKi9cbmV4cG9ydCBpbnRlcmZhY2UgR2l0VXBkYXRlUmVzdWx0IHtcbiAgICBzdWNjZXNzOiBib29sZWFuO1xuICAgIG1lc3NhZ2U6IHN0cmluZztcbiAgICAvKiog5pu05paw5YmN55qEIGNvbW1pdCBoYXNoICovXG4gICAgcHJldmlvdXNIYXNoPzogc3RyaW5nO1xuICAgIC8qKiDmm7TmlrDlkI7nmoQgY29tbWl0IGhhc2ggKi9cbiAgICBjdXJyZW50SGFzaD86IHN0cmluZztcbiAgICAvKiog5pu05paw5YmN5ZCO55qE5o+Q5Lqk5beu5byC5pWwICovXG4gICAgY29tbWl0c0JlaGluZD86IG51bWJlcjtcbiAgICBwcm9qZWN0UGF0aD86IHN0cmluZztcbn1cblxuLyoqIOabtOaWsOmFjee9riAqL1xuZXhwb3J0IGludGVyZmFjZSBHaXRVcGRhdGVPcHRpb25zIHtcbiAgICAvKiog6aG555uu5pys5Zyw6Lev5b6EICovXG4gICAgcHJvamVjdFBhdGg6IHN0cmluZztcbiAgICAvKiogR2l0IOi/nOeoi+S7k+W6k+WcsOWdgCAqL1xuICAgIGdpdFVybDogc3RyaW5nO1xuICAgIC8qKiDnm67moIfliIbmlK/vvIzpu5jorqQgbWFpbiAqL1xuICAgIGJyYW5jaD86IHN0cmluZztcbiAgICAvKiog5piv5ZCm5by65Yi25pu05paw77yI5Lii5byD5pys5Zyw5L+u5pS577yJ77yM6buY6K6kIGZhbHNlICovXG4gICAgZm9yY2U/OiBib29sZWFuO1xuICAgIC8qKiDml6Xlv5flm57osIPvvIzmlrnkvr/lr7nmjqUgQ29jb3Mg5o+S5Lu26Z2i5p2/6L6T5Ye6ICovXG4gICAgb25Mb2c/OiAobXNnOiBzdHJpbmcpID0+IHZvaWQ7XG59XG5cbmV4cG9ydCBjbGFzcyBHaXRIZWxwZXIge1xuICAgIHByaXZhdGUgX2dpdDogU2ltcGxlR2l0O1xuICAgIHByaXZhdGUgX2xvZzogKG1zZzogc3RyaW5nKSA9PiB2b2lkO1xuXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogR2l0VXBkYXRlT3B0aW9ucykge1xuICAgICAgICBjb25zdCBnaXRPcHRpb25zOiBQYXJ0aWFsPFNpbXBsZUdpdE9wdGlvbnM+ID0ge1xuICAgICAgICAgICAgYmFzZURpcjogb3B0aW9ucy5wcm9qZWN0UGF0aCxcbiAgICAgICAgICAgIGJpbmFyeTogJ2dpdCcsXG4gICAgICAgICAgICBtYXhDb25jdXJyZW50UHJvY2Vzc2VzOiAxLFxuICAgICAgICB9O1xuICAgICAgICB0aGlzLl9naXQgPSBzaW1wbGVHaXQoZ2l0T3B0aW9ucyk7XG4gICAgICAgIHRoaXMuX2xvZyA9IG9wdGlvbnMub25Mb2cgPz8gY29uc29sZS5sb2c7XG4gICAgfVxuXG4gICAgcHVibGljIHVwZGF0ZUdpdChiYXNlRGlyOiBzdHJpbmcpIHtcbiAgICAgICAgdGhpcy5fZ2l0ID0gc2ltcGxlR2l0KHsgYmFzZURpciwgYmluYXJ5OiAnZ2l0JywgbWF4Q29uY3VycmVudFByb2Nlc3NlczogMSB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDmiafooYzmm7TmlrDliLDmnIDmlrDku6PnoIFcbiAgICAgKi9cbiAgICBwdWJsaWMgYXN5bmMgdXBkYXRlVG9MYXRlc3Qob3B0aW9uczogR2l0VXBkYXRlT3B0aW9ucyk6IFByb21pc2U8R2l0VXBkYXRlUmVzdWx0PiB7XG4gICAgICAgIGNvbnN0IHsgcHJvamVjdFBhdGgsIGdpdFVybCwgYnJhbmNoID0gJ21haW4nLCBmb3JjZSA9IGZhbHNlIH0gPSBvcHRpb25zO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyDlnLrmma/kuIDvvJrmnKzlnLDlt7LmnIkgR2l0IOS7k+W6kyDihpIgcHVsbFxuICAgICAgICAgICAgaWYgKGF3YWl0IHRoaXMuaXNHaXRSZXBvKHByb2plY3RQYXRoKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2xvZyhg8J+TgiDmo4DmtYvliLDmnKzlnLDku5PlupM6ICR7cHJvamVjdFBhdGh9YCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucHVsbExhdGVzdChwcm9qZWN0UGF0aCwgYnJhbmNoLCBmb3JjZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIOWcuuaZr+S6jO+8muacrOWcsOaXoOS7k+W6kyDihpIgY2xvbmVcbiAgICAgICAgICAgIHRoaXMuX2xvZyhg8J+TpSDmnKzlnLDmnKrmo4DmtYvliLDku5PlupPvvIzlvIDlp4vlhYvpmoYuLi5gKTtcbiAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmNsb25lUmVwbyhwcm9qZWN0UGF0aCwgZ2l0VXJsLCBicmFuY2gpO1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgICAgICAgICAgY29uc3QgZXJyTXNnID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpO1xuICAgICAgICAgICAgdGhpcy5fbG9nKGDinYwgR2l0IOabtOaWsOWksei0pTogJHtlcnJNc2d9YCk7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGDmm7TmlrDlpLHotKU6ICR7ZXJyTXNnfWAsXG4gICAgICAgICAgICAgICAgcHJvamVjdFBhdGgsXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5Yik5pat55uu5b2V5piv5ZCm5Li6IEdpdCDku5PlupNcbiAgICAgKi9cbiAgICBwcml2YXRlIGFzeW5jIGlzR2l0UmVwbyhkaXI6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoZGlyKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBpc1JlcG8gPSBhd2FpdCBzaW1wbGVHaXQoZGlyKS5jaGVja0lzUmVwbygpO1xuICAgICAgICAgICAgcmV0dXJuIGlzUmVwbztcbiAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDmi4nlj5bmnIDmlrDku6PnoIFcbiAgICAgKi9cbiAgICBwcml2YXRlIGFzeW5jIHB1bGxMYXRlc3QoXG4gICAgICAgIHByb2plY3RQYXRoOiBzdHJpbmcsXG4gICAgICAgIGJyYW5jaDogc3RyaW5nLFxuICAgICAgICBmb3JjZTogYm9vbGVhblxuICAgICk6IFByb21pc2U8R2l0VXBkYXRlUmVzdWx0PiB7XG4gICAgICAgIGNvbnN0IGdpdCA9IHNpbXBsZUdpdChwcm9qZWN0UGF0aCk7XG5cbiAgICAgICAgLy8g6I635Y+W5pu05paw5YmN55qEIGNvbW1pdFxuICAgICAgICBjb25zdCBwcmV2TG9nID0gYXdhaXQgZ2l0LmxvZyh7IG1heENvdW50OiAxIH0pO1xuICAgICAgICBjb25zdCBwcmV2aW91c0hhc2ggPSBwcmV2TG9nLmxhdGVzdD8uaGFzaCA/PyAndW5rbm93bic7XG4gICAgICAgIHRoaXMuX2xvZyhg8J+TjCDmm7TmlrDliY3niYjmnKw6ICR7cHJldmlvdXNIYXNoLnN1YnN0cmluZygwLCA3KX1gKTtcblxuICAgICAgICAvLyDlpoLmnpzmnInmnKzlnLDkv67mlLnkuJTlvIDlkK/kuoYgZm9yY2XvvIzlhYjph43nva5cbiAgICAgICAgY29uc3Qgc3RhdHVzID0gYXdhaXQgZ2l0LnN0YXR1cygpO1xuICAgICAgICBpZiAoIXN0YXR1cy5pc0NsZWFuKCkpIHtcbiAgICAgICAgICAgIGlmIChmb3JjZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2xvZyhg4pqg77iPIOajgOa1i+WIsOacrOWcsOS/ruaUue+8jOW8uuWItuaooeW8j++8mumHjee9ruS4rS4uLmApO1xuICAgICAgICAgICAgICAgIGF3YWl0IGdpdC5yZXNldChbJy0taGFyZCcsICdIRUFEJ10pO1xuICAgICAgICAgICAgICAgIGF3YWl0IGdpdC5jbGVhbignZicsIFsnLWQnXSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuX2xvZyhg4pqg77iPIOajgOa1i+WIsOacrOWcsOacquaPkOS6pOeahOS/ruaUue+8jOWwneivleaaguWtmC4uLmApO1xuICAgICAgICAgICAgICAgIGF3YWl0IGdpdC5zdGFzaCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gZmV0Y2ggKyBwdWxsXG4gICAgICAgIHRoaXMuX2xvZyhg8J+UhCDmraPlnKjmi4nlj5bliIbmlK8gWyR7YnJhbmNofV0g55qE5pyA5paw5Luj56CBLi4uYCk7XG4gICAgICAgIGF3YWl0IGdpdC5mZXRjaCgnb3JpZ2luJywgYnJhbmNoKTtcbiAgICAgICAgYXdhaXQgZ2l0LnB1bGwoJ29yaWdpbicsIGJyYW5jaCk7XG5cbiAgICAgICAgLy8g6I635Y+W5pu05paw5ZCO55qEIGNvbW1pdFxuICAgICAgICBjb25zdCBjdXJyZW50TG9nID0gYXdhaXQgZ2l0LmxvZyh7IG1heENvdW50OiAxIH0pO1xuICAgICAgICBjb25zdCBjdXJyZW50SGFzaCA9IGN1cnJlbnRMb2cubGF0ZXN0Py5oYXNoID8/ICd1bmtub3duJztcbiAgICAgICAgdGhpcy5fbG9nKGDwn5OMIOabtOaWsOWQjueJiOacrDogJHtjdXJyZW50SGFzaC5zdWJzdHJpbmcoMCwgNyl9YCk7XG5cbiAgICAgICAgLy8g57uf6K6h5pu05paw5LqG5aSa5bCR5Liq5o+Q5LqkXG4gICAgICAgIGNvbnN0IGNvbW1pdHNCZWhpbmQgPSBhd2FpdCB0aGlzLmNvdW50Q29tbWl0c0JlaGluZChnaXQsIGJyYW5jaCk7XG5cbiAgICAgICAgY29uc3QgaXNVcGRhdGVkID0gcHJldmlvdXNIYXNoICE9PSBjdXJyZW50SGFzaDtcbiAgICAgICAgY29uc3QgbWVzc2FnZSA9IGlzVXBkYXRlZFxuICAgICAgICAgICAgPyBg4pyFIOabtOaWsOaIkOWKn++8geW3suS7jiAke3ByZXZpb3VzSGFzaC5zdWJzdHJpbmcoMCwgNyl9IOabtOaWsOWIsCAke2N1cnJlbnRIYXNoLnN1YnN0cmluZygwLCA3KX3vvIzlhbEgJHtjb21taXRzQmVoaW5kfSDkuKrmlrDmj5DkuqRgXG4gICAgICAgICAgICA6IGDinIUg5bey5piv5pyA5paw5Luj56CB77yM5peg6ZyA5pu05pawYDtcblxuICAgICAgICB0aGlzLl9sb2cobWVzc2FnZSk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICBtZXNzYWdlLFxuICAgICAgICAgICAgcHJldmlvdXNIYXNoLFxuICAgICAgICAgICAgY3VycmVudEhhc2gsXG4gICAgICAgICAgICBjb21taXRzQmVoaW5kLFxuICAgICAgICAgICAgcHJvamVjdFBhdGhcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDlhYvpmobku5PlupNcbiAgICAgKi9cbiAgICBwcml2YXRlIGFzeW5jIGNsb25lUmVwbyhcbiAgICAgICAgcHJvamVjdFBhdGg6IHN0cmluZyxcbiAgICAgICAgZ2l0VXJsOiBzdHJpbmcsXG4gICAgICAgIGJyYW5jaDogc3RyaW5nXG4gICAgKTogUHJvbWlzZTxHaXRVcGRhdGVSZXN1bHQ+IHtcbiAgICAgICAgLy8g56Gu5L+d54i255uu5b2V5a2Y5ZyoXG4gICAgICAgIGNvbnN0IHBhcmVudERpciA9IHBhdGguZGlybmFtZShwcm9qZWN0UGF0aCk7XG4gICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhwYXJlbnREaXIpKSB7XG4gICAgICAgICAgICBmcy5ta2RpclN5bmMocGFyZW50RGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX2xvZyhg8J+TpSDmraPlnKjlhYvpmoYgJHtnaXRVcmx9ICjliIbmlK86ICR7YnJhbmNofSkuLi5gKTtcbiAgICAgICAgYXdhaXQgc2ltcGxlR2l0KCkuY2xvbmUoZ2l0VXJsLCBwcm9qZWN0UGF0aCwgWyctLWJyYW5jaCcsIGJyYW5jaCwgJy0tc2luZ2xlLWJyYW5jaCddKTtcblxuICAgICAgICAvLyDojrflj5bmnIDmlrAgY29tbWl0IOS/oeaBr1xuICAgICAgICBjb25zdCBnaXQgPSBzaW1wbGVHaXQocHJvamVjdFBhdGgpO1xuICAgICAgICBjb25zdCBsb2cgPSBhd2FpdCBnaXQubG9nKHsgbWF4Q291bnQ6IDEgfSk7XG4gICAgICAgIGNvbnN0IGN1cnJlbnRIYXNoID0gbG9nLmxhdGVzdD8uaGFzaCA/PyAndW5rbm93bic7XG5cbiAgICAgICAgY29uc3QgbWVzc2FnZSA9IGDinIUg5YWL6ZqG5oiQ5Yqf77yB5pyA5paw54mI5pysOiAke2N1cnJlbnRIYXNoLnN1YnN0cmluZygwLCA3KX1gO1xuICAgICAgICB0aGlzLl9sb2cobWVzc2FnZSk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICBtZXNzYWdlLFxuICAgICAgICAgICAgY3VycmVudEhhc2gsXG4gICAgICAgICAgICBwcm9qZWN0UGF0aFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOiuoeeul+acrOWcsOiQveWQjui/nOeoi+WkmuWwkeS4quaPkOS6pFxuICAgICAqL1xuICAgIHByaXZhdGUgYXN5bmMgY291bnRDb21taXRzQmVoaW5kKGdpdDogU2ltcGxlR2l0LCBicmFuY2g6IHN0cmluZyk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBnaXQucmF3KFtcbiAgICAgICAgICAgICAgICAncmV2LWxpc3QnLCAnLS1jb3VudCcsIGBIRUFELi5vcmlnaW4vJHticmFuY2h9YCxcbiAgICAgICAgICAgIF0pO1xuICAgICAgICAgICAgcmV0dXJuIHBhcnNlSW50KHJlc3VsdC50cmltKCksIDEwKSB8fCAwO1xuICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog6I635Y+W5b2T5YmN5LuT5bqT5L+h5oGv77yI5Y+v5Zyo5o+S5Lu26Z2i5p2/5bGV56S677yJXG4gICAgICovXG4gICAgcHVibGljIGFzeW5jIGdldFJlcG9JbmZvKCk6IFByb21pc2U8e1xuICAgICAgICBicmFuY2g6IHN0cmluZztcbiAgICAgICAgbGF0ZXN0Q29tbWl0OiBzdHJpbmc7XG4gICAgICAgIGxhdGVzdE1lc3NhZ2U6IHN0cmluZztcbiAgICAgICAgaXNDbGVhbjogYm9vbGVhbjtcbiAgICB9IHwgbnVsbD4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgYnJhbmNoID0gYXdhaXQgdGhpcy5fZ2l0LnJldnBhcnNlKFsnLS1hYmJyZXYtcmVmJywgJ0hFQUQnXSk7XG4gICAgICAgICAgICBjb25zdCBsb2cgPSBhd2FpdCB0aGlzLl9naXQubG9nKHsgbWF4Q291bnQ6IDEgfSk7XG4gICAgICAgICAgICBjb25zdCBzdGF0dXMgPSBhd2FpdCB0aGlzLl9naXQuc3RhdHVzKCk7XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgYnJhbmNoOiBicmFuY2gudHJpbSgpLFxuICAgICAgICAgICAgICAgIGxhdGVzdENvbW1pdDogbG9nLmxhdGVzdD8uaGFzaD8uc3Vic3RyaW5nKDAsIDcpID8/ICd1bmtub3duJyxcbiAgICAgICAgICAgICAgICBsYXRlc3RNZXNzYWdlOiBsb2cubGF0ZXN0Py5tZXNzYWdlID8/ICcnLFxuICAgICAgICAgICAgICAgIGlzQ2xlYW46IHN0YXR1cy5pc0NsZWFuKCksXG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgKiDjgJDmlrDlop7jgJHmo4Dmn6XmnKzlnLDku6PnoIHmmK/lkKbkuI7ov5znqIvmnIDmlrDkuIDoh7TvvIjkuI3miafooYzmm7TmlrDvvIlcbiAgICAqICDpgILnlKjkuo7mnoTlu7rliY3nmoTniYjmnKzmoKHpqoxcbiAgICAqL1xuICAgIHB1YmxpYyBhc3luYyBjaGVja1ZlcnNpb25TeW5jKCk6IFByb21pc2U8eyBpc1N5bmNlZDogYm9vbGVhbjsgbWVzc2FnZTogc3RyaW5nIH0+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHN0YXR1cyA9IGF3YWl0IHRoaXMuX2dpdC5zdGF0dXMoKTtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRCcmFuY2ggPSBzdGF0dXMuY3VycmVudCB8fCAndW5rbm93bic7XG5cbiAgICAgICAgICAgIHRoaXMuX2xvZyhg8J+UjSDmraPlnKjmo4Dmn6XmnKzlnLDliIbmlK8gWyR7Y3VycmVudEJyYW5jaH1dIOS4jui/nOeoi+eJiOacrOaYr+WQpuS4gOiHtC4uLmApO1xuXG4gICAgICAgICAgICAvLyAxLiDlhYggZmV0Y2gg5LiA5LiL77yM56Gu5L+d5pys5Zyw55qEIHJlbW90ZSDot5/ouKrliIbmlK/mmK/mnIDmlrDnmoRcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuX2dpdC5mZXRjaCgnb3JpZ2luJywgY3VycmVudEJyYW5jaCk7XG5cbiAgICAgICAgICAgIC8vIDIuIOiOt+WPluacrOWcsOacgOaWsOeahCBjb21taXQgaGFzaFxuICAgICAgICAgICAgY29uc3QgbG9jYWxIYXNoID0gYXdhaXQgdGhpcy5fZ2l0LnJldnBhcnNlKFsnSEVBRCddKTtcblxuICAgICAgICAgICAgLy8gMy4g6I635Y+W6L+c56iL6Lef6Liq5YiG5pSv55qE5pyA5pawIGNvbW1pdCBoYXNoXG4gICAgICAgICAgICBjb25zdCByZW1vdGVIYXNoID0gYXdhaXQgdGhpcy5fZ2l0LnJldnBhcnNlKFtgb3JpZ2luLyR7Y3VycmVudEJyYW5jaH1gXSk7XG5cbiAgICAgICAgICAgIC8vIDQuIOWvueavlCBoYXNoXG4gICAgICAgICAgICBpZiAobG9jYWxIYXNoID09PSByZW1vdGVIYXNoKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbXNnID0gYOKchSDniYjmnKzkuIDoh7TvvIHmnKzlnLDlt7LmmK/mnIDmlrAgKEhhc2g6ICR7bG9jYWxIYXNoLnN1YnN0cmluZygwLCA3KX0p77yM5YWB6K645p6E5bu644CCYDtcbiAgICAgICAgICAgICAgICB0aGlzLl9sb2cobXNnKTtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBpc1N5bmNlZDogdHJ1ZSwgbWVzc2FnZTogbXNnIH07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIOiuoeeul+iQveWQjuS6huWkmuWwkeS4quaPkOS6pFxuICAgICAgICAgICAgICAgIGNvbnN0IGJlaGluZENvdW50ID0gYXdhaXQgdGhpcy5jb3VudENvbW1pdHNCZWhpbmQodGhpcy5fZ2l0LCBjdXJyZW50QnJhbmNoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBtc2cgPSBg4pqg77iPIOeJiOacrOS4jeS4gOiHtO+8geacrOWcsOiQveWQjui/nOeoiyAke2JlaGluZENvdW50fSDkuKrmj5DkuqTjgIJcXG5gICtcbiAgICAgICAgICAgICAgICAgICAgYOacrOWcsDogJHtsb2NhbEhhc2guc3Vic3RyaW5nKDAsIDcpfSB8IOi/nOeoizogJHtyZW1vdGVIYXNoLnN1YnN0cmluZygwLCA3KX1cXG5gICtcbiAgICAgICAgICAgICAgICAgICAgYOivt+WFiOabtOaWsOS7o+eggeWGjei/m+ihjOaehOW7uu+8gWA7XG4gICAgICAgICAgICAgICAgdGhpcy5fbG9nKG1zZyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgaXNTeW5jZWQ6IGZhbHNlLCBtZXNzYWdlOiBtc2cgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICAgICAgICAgIGNvbnN0IGVyck1zZyA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKTtcbiAgICAgICAgICAgIGNvbnN0IG1zZyA9IGDinYwg54mI5pys5qOA5p+l5aSx6LSlOiAke2Vyck1zZ31gO1xuICAgICAgICAgICAgdGhpcy5fbG9nKG1zZyk7XG4gICAgICAgICAgICByZXR1cm4geyBpc1N5bmNlZDogZmFsc2UsIG1lc3NhZ2U6IG1zZyB9O1xuICAgICAgICB9XG4gICAgfVxufSJdfQ==