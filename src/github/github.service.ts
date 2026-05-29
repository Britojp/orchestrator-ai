import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { execa } from 'execa';
import { ENV_CONFIG } from '../config/config.tokens';
import { EnvConfig } from '../config/env.schema';
import { TaskRecord } from '../supabase/task.types';
import {
  assertBranchAllowedForPush,
  assertPrBaseAllowed,
  WORKFLOW_BRANCH_BASE,
} from '../workflow/workflow-rules';

export interface PullRequestResult {
  prUrl: string;
  prNumber: number | null;
}

@Injectable()
export class GithubService implements OnModuleInit {
  private readonly logger = new Logger(GithubService.name);
  private ghCommand = 'gh';

  constructor(@Inject(ENV_CONFIG) private readonly env: EnvConfig) {}

  async onModuleInit(): Promise<void> {
    this.ghCommand = this.env.GH_CLI_PATH?.trim() || 'gh';
    try {
      const { stdout } = await execa(this.ghCommand, ['--version'], {
        env: this.ghEnv(),
      });
      this.logger.log(`GitHub CLI OK: ${stdout.trim().split('\n')[0]}`);
    } catch {
      throw new Error(
        'GitHub CLI (gh) não encontrado. Instale com: brew install gh && gh auth login. Ou defina GH_CLI_PATH no .env.',
      );
    }
    await this.assertCanCreatePullRequests();
  }

  async createPullRequest(
    task: TaskRecord,
    branchName: string,
    implementationSummary: string,
  ): Promise<PullRequestResult> {
    const existing = await this.findExistingPr(branchName);
    if (existing) {
      this.logger.log(`PR existente: ${existing.prUrl}`);
      return existing;
    }

    assertBranchAllowedForPush(branchName);

    const title = `[auto-ai] ${task.title}`;
    const body = this.buildPrBody(task, implementationSummary);
    const base = WORKFLOW_BRANCH_BASE;
    assertPrBaseAllowed(base);

    if (branchName === base) {
      throw new Error('Head do PR não pode ser develop. Use a branch agent/task-{id}.');
    }

    try {
      const { stdout } = await execa(
        this.ghCommand,
        [
          'pr',
          'create',
          '--repo',
          this.env.TARGET_REPO,
          '--base',
          base,
          '--head',
          branchName,
          '--title',
          title,
          '--body',
          body,
        ],
        {
          cwd: this.env.REPO_PATH,
          env: this.ghEnv(),
        },
      );

      const prUrl = stdout.trim();
      const prNumber = this.parsePrNumber(prUrl);
      return { prUrl, prNumber };
    } catch (error) {
      throw this.wrapPrCreateError(error);
    }
  }

  private buildPrBody(task: TaskRecord, summary: string): string {
    return [
      '## Resumo',
      summary,
      '',
      '## Critérios de aceite',
      task.acceptance_criteria,
      '',
      '## Tarefa',
      `- ID: \`${task.id}\``,
      `- Gerado por: auto-ai`,
    ].join('\n');
  }

  private async findExistingPr(
    branchName: string,
  ): Promise<PullRequestResult | null> {
    try {
      const { stdout } = await execa(
        this.ghCommand,
        [
          'pr',
          'list',
          '--repo',
          this.env.TARGET_REPO,
          '--head',
          branchName,
          '--json',
          'url,number',
          '--limit',
          '1',
        ],
        { env: this.ghEnv() },
      );
      const items = JSON.parse(stdout) as { url: string; number: number }[];
      if (!items.length) {
        return null;
      }
      return { prUrl: items[0].url, prNumber: items[0].number };
    } catch {
      return null;
    }
  }

  private parsePrNumber(prUrl: string): number | null {
    const match = prUrl.match(/\/pull\/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  private async assertCanCreatePullRequests(): Promise<void> {
    const repo = this.env.TARGET_REPO;
    const base = WORKFLOW_BRANCH_BASE;

    try {
      await execa(
        this.ghCommand,
        [
          'api',
          '-X',
          'POST',
          `repos/${repo}/pulls`,
          '-f',
          'title=auto-ai-permission-probe',
          '-f',
          'head=__auto_ai_permission_probe__',
          '-f',
          `base=${base}`,
        ],
        { env: this.ghEnv() },
      );
    } catch (error) {
      const detail = this.extractExecErrorText(error);
      if (this.isHeadNotFoundProbeResponse(detail)) {
        this.logger.log(`GitHub: permissão para abrir PRs em ${repo} — OK`);
        return;
      }
      if (this.isTokenPermissionError(detail)) {
        throw new Error(this.tokenPermissionHelpMessage(repo));
      }
      throw error;
    }
  }

  private wrapPrCreateError(error: unknown): Error {
    const detail = this.extractExecErrorText(error);
    if (this.isTokenPermissionError(detail)) {
      return new Error(this.tokenPermissionHelpMessage(this.env.TARGET_REPO));
    }
    if (error instanceof Error) {
      return error;
    }
    return new Error(String(error));
  }

  private isTokenPermissionError(text: string): boolean {
    return (
      text.includes('Resource not accessible by personal access token') ||
      text.includes('repository.defaultBranchRef')
    );
  }

  private isHeadNotFoundProbeResponse(text: string): boolean {
    return (
      text.includes('Validation Failed') ||
      text.includes('"status":422') ||
      text.includes('No commits between') ||
      text.includes('not found')
    );
  }

  private tokenPermissionHelpMessage(repo: string): string {
    return [
      `GITHUB_TOKEN sem permissão para abrir PRs em ${repo}.`,
      'O agente e o push podem concluir, mas o PR falha no final.',
      '',
      'Corrija de uma destas formas:',
      '1) Fine-grained PAT (github.com/settings/tokens?type=beta): repositório ' +
        `${repo}, permissões Contents (Read and write) e Pull requests (Read and write).`,
      '2) Classic PAT: escopo repo.',
      '3) Remova GITHUB_TOKEN do .env e rode: gh auth login -s repo',
      'Depois atualize GITHUB_TOKEN no .env e reinicie o orquestrador.',
    ].join('\n');
  }

  private extractExecErrorText(error: unknown): string {
    if (!error || typeof error !== 'object') {
      return String(error);
    }
    const execaError = error as {
      stderr?: string;
      stdout?: string;
      message?: string;
    };
    return [execaError.stderr, execaError.stdout, execaError.message]
      .filter(Boolean)
      .join('\n');
  }

  private ghEnv(): NodeJS.ProcessEnv {
    return {
      ...process.env,
      ...(this.env.GITHUB_TOKEN
        ? { GH_TOKEN: this.env.GITHUB_TOKEN, GITHUB_TOKEN: this.env.GITHUB_TOKEN }
        : {}),
    };
  }
}
