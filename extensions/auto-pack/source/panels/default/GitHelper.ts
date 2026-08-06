import simpleGit, { SimpleGit, SimpleGitOptions } from 'simple-git';
import * as path from 'path';
import * as fs from 'fs';

/** 更新结果 */
export interface GitUpdateResult {
    success: boolean;
    message: string;
    /** 更新前的 commit hash */
    previousHash?: string;
    /** 更新后的 commit hash */
    currentHash?: string;
    /** 更新前后的提交差异数 */
    commitsBehind?: number;
    projectPath?: string;
}

/** 更新配置 */
export interface GitUpdateOptions {
    /** 项目本地路径 */
    projectPath: string;
    /** Git 远程仓库地址 */
    gitUrl: string;
    /** 目标分支，默认 main */
    branch?: string;
    /** 是否强制更新（丢弃本地修改），默认 false */
    force?: boolean;
    /** 日志回调，方便对接 Cocos 插件面板输出 */
    onLog?: (msg: string) => void;
}

export class GitHelper {
    private _git: SimpleGit;
    private _log: (msg: string) => void;

    constructor(options: GitUpdateOptions) {
        const gitOptions: Partial<SimpleGitOptions> = {
            baseDir: options.projectPath,
            binary: 'git',
            maxConcurrentProcesses: 1,
        };
        this._git = simpleGit(gitOptions);
        this._log = options.onLog ?? console.log;
    }

    public updateGit(baseDir: string) {
        this._git = simpleGit({ baseDir, binary: 'git', maxConcurrentProcesses: 1 });
    }

    /**
     * 执行更新到最新代码
     */
    public async updateToLatest(options: GitUpdateOptions): Promise<GitUpdateResult> {
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
        } catch (error: unknown) {
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
    private async isGitRepo(dir: string): Promise<boolean> {
        if (!fs.existsSync(dir)) {
            return false;
        }
        try {
            const isRepo = await simpleGit(dir).checkIsRepo();
            return isRepo;
        } catch {
            return false;
        }
    }

    /**
     * 拉取最新代码
     */
    private async pullLatest(
        projectPath: string,
        branch: string,
        force: boolean
    ): Promise<GitUpdateResult> {
        const git = simpleGit(projectPath);

        // 获取更新前的 commit
        const prevLog = await git.log({ maxCount: 1 });
        const previousHash = prevLog.latest?.hash ?? 'unknown';
        this._log(`📌 更新前版本: ${previousHash.substring(0, 7)}`);

        // 如果有本地修改且开启了 force，先重置
        const status = await git.status();
        if (!status.isClean()) {
            if (force) {
                this._log(`⚠️ 检测到本地修改，强制模式：重置中...`);
                await git.reset(['--hard', 'HEAD']);
                await git.clean('f', ['-d']);
            } else {
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
        const currentHash = currentLog.latest?.hash ?? 'unknown';
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
    private async cloneRepo(
        projectPath: string,
        gitUrl: string,
        branch: string
    ): Promise<GitUpdateResult> {
        // 确保父目录存在
        const parentDir = path.dirname(projectPath);
        if (!fs.existsSync(parentDir)) {
            fs.mkdirSync(parentDir, { recursive: true });
        }

        this._log(`📥 正在克隆 ${gitUrl} (分支: ${branch})...`);
        await simpleGit().clone(gitUrl, projectPath, ['--branch', branch, '--single-branch']);

        // 获取最新 commit 信息
        const git = simpleGit(projectPath);
        const log = await git.log({ maxCount: 1 });
        const currentHash = log.latest?.hash ?? 'unknown';

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
    private async countCommitsBehind(git: SimpleGit, branch: string): Promise<number> {
        try {
            const result = await git.raw([
                'rev-list', '--count', `HEAD..origin/${branch}`,
            ]);
            return parseInt(result.trim(), 10) || 0;
        } catch {
            return 0;
        }
    }

    /**
     * 获取当前仓库信息（可在插件面板展示）
     */
    public async getRepoInfo(): Promise<{
        branch: string;
        latestCommit: string;
        latestMessage: string;
        isClean: boolean;
    } | null> {
        try {
            const branch = await this._git.revparse(['--abbrev-ref', 'HEAD']);
            const log = await this._git.log({ maxCount: 1 });
            const status = await this._git.status();

            return {
                branch: branch.trim(),
                latestCommit: log.latest?.hash?.substring(0, 7) ?? 'unknown',
                latestMessage: log.latest?.message ?? '',
                isClean: status.isClean(),
            };
        } catch {
            return null;
        }
    }

    /**
    * 【新增】检查本地代码是否与远程最新一致（不执行更新）
    *  适用于构建前的版本校验
    */
    public async checkVersionSync(): Promise<{ isSynced: boolean; message: string }> {
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
            } else {
                // 计算落后了多少个提交
                const behindCount = await this.countCommitsBehind(this._git, currentBranch);
                const msg = `⚠️ 版本不一致！本地落后远程 ${behindCount} 个提交。\n` +
                    `本地: ${localHash.substring(0, 7)} | 远程: ${remoteHash.substring(0, 7)}\n` +
                    `请先更新代码再进行构建！`;
                this._log(msg);
                return { isSynced: false, message: msg };
            }
        } catch (error: unknown) {
            const errMsg = error instanceof Error ? error.message : String(error);
            const msg = `❌ 版本检查失败: ${errMsg}`;
            this._log(msg);
            return { isSynced: false, message: msg };
        }
    }
}