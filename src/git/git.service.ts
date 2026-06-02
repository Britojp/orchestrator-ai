import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { access } from 'fs/promises';
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
    this.logger.log(
      `Repositório: ${this.env.REPO_PATH} | fluxo: ${WORKFLOW_BRANCH_BASE} → agent/* → PR → ${WORKFLOW_BRANCH_BASE}`,
    );
  }

  buildBranchName(taskId: string): string {
    return `${this.env.BRANCH_PREFIX}-${taskId}`;
  }

  async prepareBranch(taskId: string): Promise<string> {
    const branchName = this.buildBranchName(taskId);
    const base = this.env.BRANCH_BASE;

    await this.runGit(['fetch', 'origin']);

    if (await this.branchExistsLocal(branchName)) {
      this.logger.log(`Reutilizando branch local: ${branchName}`);
      await this.runGit(['checkout', branchName]);
      if (await this.branchExistsRemote(branchName)) {
        await this.syncBranchToRemote(branchName);
      } else {
        await this.discardUncommittedChanges(branchName);
      }
      return branchName;
    }

    await this.runGit(['checkout', base]);
    await this.runGit(['pull', 'origin', base]);

    if (await this.branchExistsRemote(branchName)) {
      this.logger.log(`Checkout branch remota: ${branchName}`);
      await this.runGit(['checkout', '--track', `origin/${branchName}`]);
    } else {
      await this.runGit(['checkout', '-b', branchName]);
    }

    return branchName;
  }

  async hasCommitsAheadOfBase(branchName: string): Promise<boolean> {
    const base = this.env.BRANCH_BASE;
    const { stdout } = await this.runGit([
      'rev-list',
      '--count',
      `${base}..${branchName}`,
    ]);
    return parseInt(stdout.trim(), 10) > 0;
  }

  async commitPendingChanges(taskId: string, summary: string): Promise<boolean> {
    const { stdout: changes } = await this.runGit(['status', '--porcelain']);
    if (!changes.trim()) {
      return false;
    }
    await this.runGit(['add', '-A']);
    await this.runGit(['commit', '-m', this.buildCommitMessage(taskId, summary)]);
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

  private async syncBranchToRemote(branchName: string): Promise<void> {
    await this.discardUncommittedChanges(branchName);
    const { stdout: behind } = await this.runGit([
      'rev-list',
      '--count',
      `HEAD..origin/${branchName}`,
    ]);
    if (parseInt(behind.trim(), 10) > 0) {
      this.logger.log(`Sincronizando ${branchName} com origin/${branchName}`);
      await this.runGit(['reset', '--hard', `origin/${branchName}`]);
    }
  }

  private async discardUncommittedChanges(branchName: string): Promise<void> {
    const { stdout } = await this.runGit(['status', '--porcelain']);
    if (!stdout.trim()) {
      return;
    }
    this.logger.warn(
      `Alterações locais descartadas em ${branchName} antes de continuar a tarefa`,
    );
    await this.runGit(['reset', '--hard', 'HEAD']);
  }

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

  private async runGit(args: string[]) {
    const execa = await getExeca();
    return execa('git', args, {
      cwd: this.env.REPO_PATH,
      env: process.env,
    });
  }
}
