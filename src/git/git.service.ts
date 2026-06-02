import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { access, mkdir } from 'fs/promises';
import { join } from 'path';
import { ENV_CONFIG } from '../config/config.tokens';
import { EnvConfig } from '../config/env.schema';
import { getExeca } from '../common/execa-loader';
import {
  assertBranchAllowedForPush,
  WORKFLOW_BRANCH_BASE,
} from '../workflow/workflow-rules';

@Injectable()
export class GitService implements OnModuleInit {
  private readonly logger = new Logger(GitService.name);

  constructor(@Inject(ENV_CONFIG) private readonly env: EnvConfig) {}

  async onModuleInit(): Promise<void> {
    try {
      await access(this.env.REPO_PATH);
    } catch {
      throw new Error(`REPO_PATH inválido: ${this.env.REPO_PATH}`);
    }
    if (this.env.BRANCH_BASE !== WORKFLOW_BRANCH_BASE) {
      throw new Error(
        `BRANCH_BASE deve ser "${WORKFLOW_BRANCH_BASE}" no MVP`,
      );
    }
    await mkdir(this.env.WORKTREE_BASE_PATH, { recursive: true });
    this.logger.log(
      `Repositório: ${this.env.REPO_PATH} | worktrees: ${this.env.WORKTREE_BASE_PATH} | fluxo: ${WORKFLOW_BRANCH_BASE} → agent/* → PR → ${WORKFLOW_BRANCH_BASE}`,
    );
  }

  buildBranchName(taskId: string): string {
    return `${this.env.BRANCH_PREFIX}-${taskId}`;
  }

  buildFeatureBranchName(parentTaskId: string): string {
    return `feature/task-${parentTaskId}`;
  }

  // ── Feature branch (parent tasks, runs in main repo) ──────────────────────

  async prepareFeatureBranch(parentTaskId: string): Promise<string> {
    const featureBranch = this.buildFeatureBranchName(parentTaskId);
    const base = this.env.BRANCH_BASE;

    await this.runGit(['fetch', 'origin']);

    if (await this.branchExistsLocal(featureBranch)) {
      this.logger.log(`Reutilizando feature branch local: ${featureBranch}`);
      await this.runGit(['checkout', featureBranch]);
      return featureBranch;
    }

    await this.runGit(['checkout', base]);
    await this.runGit(['pull', 'origin', base]);

    if (await this.branchExistsRemote(featureBranch)) {
      await this.runGit(['checkout', '--track', `origin/${featureBranch}`]);
    } else {
      await this.runGit(['checkout', '-b', featureBranch]);
    }

    return featureBranch;
  }

  // ── Worktrees (agent tasks, each in its own isolated directory) ───────────

  worktreePath(taskId: string): string {
    return join(this.env.WORKTREE_BASE_PATH, taskId);
  }

  async prepareWorktree(taskId: string, branchName: string, base?: string): Promise<string> {
    const resolvedBase = base ?? this.env.BRANCH_BASE;
    const wtPath = this.worktreePath(taskId);

    await this.runGit(['fetch', 'origin']);
    await this.runGit(['worktree', 'prune']);

    const remoteExists = await this.branchExistsRemote(branchName);
    const localExists = await this.branchExistsLocal(branchName);

    if (remoteExists) {
      if (localExists) {
        await this.runGit(['branch', '-f', branchName, `origin/${branchName}`]);
      } else {
        await this.runGit(['branch', branchName, `origin/${branchName}`]);
      }
      await this.runGit(['worktree', 'add', wtPath, branchName]);
    } else if (localExists) {
      await this.runGit(['worktree', 'add', wtPath, branchName]);
    } else {
      await this.runGit(['worktree', 'add', '-b', branchName, wtPath, resolvedBase]);
    }

    this.logger.log(`Worktree criada: ${wtPath} (branch: ${branchName})`);
    return wtPath;
  }

  async removeWorktree(taskId: string): Promise<void> {
    const wtPath = this.worktreePath(taskId);
    try {
      await this.runGit(['worktree', 'remove', '--force', wtPath]);
      await this.runGit(['worktree', 'prune']);
    } catch (err) {
      this.logger.warn(`Falha ao remover worktree ${wtPath}: ${err instanceof Error ? err.message : err}`);
    }
  }

  // ── Commit / push ─────────────────────────────────────────────────────────

  async hasCommitsAheadOfBase(branchName: string, base?: string): Promise<boolean> {
    const resolvedBase = base ?? this.env.BRANCH_BASE;
    const { stdout } = await this.runGit([
      'rev-list',
      '--count',
      `${resolvedBase}..${branchName}`,
    ]);
    return parseInt(stdout.trim(), 10) > 0;
  }

  async commitPendingChanges(taskId: string, summary: string, worktreeDir: string): Promise<boolean> {
    const { stdout: changes } = await this.runGit(['status', '--porcelain'], worktreeDir);
    if (!changes.trim()) {
      return false;
    }
    await this.runGit([
      'add', '-A', '--',
      ':!node_modules', ':!**/node_modules',
      ':!dist', ':!**/dist',
      ':!build', ':!**/build',
      ':!.env', ':!.env.*',
      ':!**/.env', ':!**/.env.*',
      ':!*.log', ':!**/*.log',
      ':!coverage', ':!**/coverage',
      ':!.cache', ':!**/.cache',
    ], worktreeDir);
    await this.runGit(['commit', '-m', this.buildCommitMessage(taskId, summary)], worktreeDir);
    return true;
  }

  async push(branchName: string): Promise<void> {
    assertBranchAllowedForPush(branchName);
    if (branchName === this.env.BRANCH_BASE) {
      throw new Error(
        'Push em develop proibido. O merge em develop ocorre apenas via Pull Request.',
      );
    }
    await this.runGit(['push', '-u', 'origin', branchName]);
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private async branchExistsLocal(branchName: string): Promise<boolean> {
    try {
      await this.runGit(['show-ref', '--verify', `refs/heads/${branchName}`]);
      return true;
    } catch {
      return false;
    }
  }

  private async branchExistsRemote(branchName: string): Promise<boolean> {
    try {
      await this.runGit(['rev-parse', '--verify', `origin/${branchName}`]);
      return true;
    } catch {
      return false;
    }
  }

  private buildCommitMessage(taskId: string, summary: string): string {
    const firstLine = summary
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.length > 0);
    if (!firstLine) {
      return `chore(agent): implementar tarefa ${taskId}`;
    }
    const normalized = firstLine.replace(/\s+/g, ' ');
    return `chore(agent): ${normalized}`.slice(0, 120);
  }

  private async runGit(args: string[], cwd?: string) {
    const execa = await getExeca();
    return execa('git', args, {
      cwd: cwd ?? this.env.REPO_PATH,
      env: process.env,
    });
  }
}
