import { Agent, CursorAgentError, Run, RunResult } from '@cursor/sdk';
import type { SDKMessage } from '@cursor/sdk';
import { Logger } from '@nestjs/common';
import { getExeca } from '../../../common/execa-loader';
import { EnvConfig } from '../../../config/env.schema';
import { TaskRecord } from '../../../supabase/task.types';
import { buildAgentPromptSections } from '../../../workflow/workflow-rules';
import { AgentRunResult, IAgentProvider } from '../../agent-provider.interface';
import { buildProjectSupabaseMcpConfig } from './project-supabase-mcp.factory';

export class CursorAgentService implements IAgentProvider {
  private readonly logger = new Logger(CursorAgentService.name);

  constructor(private readonly env: EnvConfig) {}

  async init(): Promise<void> {
    await this.verifyCursorCli();
  }

  async runTask(task: TaskRecord, branchName: string, workDir: string): Promise<AgentRunResult> {
    const prompt = this.buildPrompt(task, branchName);
    const mcpServers = buildProjectSupabaseMcpConfig(this.env);

    if (mcpServers) {
      this.logger.log(
        `MCP Supabase do projeto (read_only): ref=${this.env.PROJECT_SUPABASE_PROJECT_REF}`,
      );
    }

    this.logger.log(
      `Iniciando Cursor em ${workDir} (modelo ${this.env.CURSOR_MODEL})`,
    );

    const streamLog: string[] = [];

    try {
      await using agent = await Agent.create({
        apiKey: this.env.CURSOR_API_KEY!,
        model: { id: this.env.CURSOR_MODEL },
        local: { cwd: workDir, settingSources: [] },
        ...(mcpServers ? { mcpServers } : {}),
      });

      const run = await agent.send(prompt);
      await this.consumeStream(run, streamLog);
      const result = await run.wait();

      if (result.status === 'error') {
        const detail = await this.describeRunFailure(run, result, streamLog);
        this.logger.error(detail);
        throw new Error(`Run Cursor falhou: ${result.id}. ${detail}`);
      }

      if (result.status === 'cancelled') {
        throw new Error(`Run Cursor cancelado: ${result.id}`);
      }

      const summary = await this.extractSummary(run, result);
      this.logger.log(`Cursor run concluído: ${result.id}`);

      return {
        summary,
        runId: result.id,
        agentId: agent.agentId,
      };
    } catch (error) {
      if (error instanceof CursorAgentError) {
        throw new Error(`Cursor startup: ${error.message}`);
      }
      throw error;
    }
  }

  private buildPrompt(task: TaskRecord, branchName: string): string {
    return buildAgentPromptSections({
      taskId: task.id,
      targetRepo: this.env.TARGET_REPO,
      branchName,
      branchBase: this.env.BRANCH_BASE,
      title: task.title,
      description: task.description,
      acceptanceCriteria: task.acceptance_criteria,
      projectMcpEnabled: this.env.PROJECT_SUPABASE_MCP_ENABLED,
    });
  }

  private async consumeStream(run: Run, streamLog: string[]): Promise<void> {
    if (!run.supports('stream')) {
      return;
    }
    try {
      for await (const event of run.stream()) {
        this.appendStreamEvent(streamLog, event);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      streamLog.push(`stream_error: ${message}`);
    }
  }

  private appendStreamEvent(streamLog: string[], event: SDKMessage): void {
    const chunk = JSON.stringify(event);
    if (chunk.length > 400) {
      streamLog.push(chunk.slice(0, 400));
      return;
    }
    streamLog.push(chunk);

    if (event.type === 'assistant') {
      for (const block of event.message.content) {
        if (block.type === 'text' && block.text.trim()) {
          streamLog.push(block.text.trim().slice(0, 500));
        }
      }
    }
  }

  private async verifyCursorCli(): Promise<void> {
    const execa = await getExeca();
    for (const cmd of ['agent', 'cursor']) {
      try {
        const { stdout } = await execa(cmd, ['--version'], {
          env: process.env,
        });
        this.logger.log(`CLI ${cmd} OK: ${stdout.trim().split('\n')[0]}`);
        return;
      } catch {
        continue;
      }
    }
    throw new Error(
      'Cursor Agent CLI não encontrado no PATH. Instale o Cursor, rode `cursor agent` uma vez, ou adicione ~/.local/bin ao PATH.',
    );
  }

  private async describeRunFailure(
    run: Run,
    result: RunResult,
    streamLog: string[],
  ): Promise<string> {
    const parts: string[] = [];

    const usageHint = this.findUsageLimitHint(streamLog, result.result);
    if (usageHint) {
      return usageHint;
    }

    if (result.result?.trim()) {
      parts.push(result.result.trim());
    }

    if (streamLog.length) {
      parts.push(streamLog.slice(-5).join(' | '));
    }

    try {
      if (run.supports('conversation')) {
        const turns = await run.conversation();
        const snippet = JSON.stringify(turns).slice(-800);
        if (snippet.length > 2) {
          parts.push(snippet);
        }
      }
    } catch {
      this.logger.warn('Não foi possível ler conversation() do run com erro');
    }

    if (!parts.length) {
      parts.push(
        'Sem detalhe do Cursor. Verifique CURSOR_API_KEY e cota da conta.',
      );
    }

    return parts.join(' | ');
  }

  private findUsageLimitHint(
    streamLog: string[],
    resultText?: string,
  ): string | null {
    const blob = [resultText ?? '', ...streamLog].join(' ').toLowerCase();
    if (
      blob.includes('out of usage') ||
      blob.includes('usage limit') ||
      blob.includes('increase your limit')
    ) {
      return 'Cota do Cursor esgotada. Aumente o limite no dashboard ou troque o modelo.';
    }
    return null;
  }

  private async extractSummary(run: Run, result: RunResult): Promise<string> {
    if (result.result?.trim()) {
      return result.result.trim();
    }
    void run;
    return 'Implementação realizada pelo agente orchestrator-ai.';
  }
}
