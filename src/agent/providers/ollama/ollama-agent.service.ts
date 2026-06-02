import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { EnvConfig } from '../../../config/env.schema';
import { TaskRecord } from '../../../supabase/task.types';
import { AgentRunResult, IAgentProvider } from '../../agent-provider.interface';
import { CLAUDE_TOOLS, executeToolCall } from '../../tools/agent-tools';

const MAX_ITERATIONS = 50;

interface OllamaToolCall {
  function?: {
    name?: string;
    arguments?: Record<string, string> | string;
  };
}

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: OllamaToolCall[];
}

interface OllamaResponse {
  message?: {
    content?: string;
    tool_calls?: OllamaToolCall[];
  };
}

export class OllamaAgentService implements IAgentProvider {
  private readonly logger = new Logger(OllamaAgentService.name);

  constructor(private readonly env: EnvConfig) {}

  async init(): Promise<void> {
    const response = await fetch(`${this.env.OLLAMA_BASE_URL}/api/tags`);
    if (!response.ok) {
      throw new Error(
        `Não foi possível conectar no Ollama (${this.env.OLLAMA_BASE_URL}): HTTP ${response.status}`,
      );
    }
  }

  async runTask(task: TaskRecord, branchName: string): Promise<AgentRunResult> {
    const runId = randomUUID();
    this.logger.log(`[${runId}] iniciando — modelo: ${this.env.OLLAMA_MODEL}  repo: ${this.env.REPO_PATH}  task: ${task.id}`);

    const messages: OllamaMessage[] = [
      { role: 'system', content: this.buildSystemPrompt() },
      { role: 'user', content: this.buildUserMessage(task, branchName) },
    ];

    let summary = 'Implementação realizada pelo agente orchestrator-ai.';

    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      const iterationNumber = iteration + 1;
      this.logger.log(`[${runId}] ── iteração ${iterationNumber}/${MAX_ITERATIONS} ──`);

      const response = await this.callOllama(messages);
      const assistantMessage = response.message;
      const assistantText = assistantMessage?.content?.trim() ?? '';
      const toolCalls = this.extractToolCalls(
        assistantMessage?.tool_calls ?? [],
        assistantText,
      );

      if (assistantText) {
        summary = assistantText;
        this.logger.log(`[${runId}] pensamento: ${assistantText.slice(0, 300)}${assistantText.length > 300 ? '…' : ''}`);
      }

      messages.push({
        role: 'assistant',
        content: assistantText,
        ...(toolCalls.length ? { tool_calls: toolCalls } : {}),
      });

      if (!toolCalls.length) {
        this.logger.log(`[${runId}] concluído na iteração ${iterationNumber} (sem chamadas de ferramenta)`);
        return {
          summary: summary.slice(0, 2000),
          runId,
          agentId: `ollama:${this.env.OLLAMA_MODEL}`,
        };
      }

      for (const toolCall of toolCalls) {
        const toolName = toolCall.function?.name ?? '';
        const toolInput = this.parseToolInput(toolCall.function?.arguments);
        const inputPreview = JSON.stringify(toolInput).slice(0, 200);
        this.logger.log(`[${runId}] → ferramenta: ${toolName}  args: ${inputPreview}`);

        const toolResult = await executeToolCall(
          toolName,
          toolInput,
          this.env.REPO_PATH,
          this.logger,
        );

        const resultPreview = toolResult.slice(0, 400);
        this.logger.log(`[${runId}] ← resultado (${toolResult.length} chars): ${resultPreview}${toolResult.length > 400 ? '…' : ''}`);

        messages.push({
          role: 'tool',
          content: toolResult,
        });
      }
    }

    this.logger.error(`[${runId}] limite de ${MAX_ITERATIONS} iterações atingido sem conclusão`);
    throw new Error(
      `Ollama atingiu o limite de ${MAX_ITERATIONS} iterações sem concluir.`,
    );
  }

  private buildSystemPrompt(): string {
    return [
      'You are an autonomous coding agent that implements development tasks in a git repository.',
      '',
      'Rules:',
      '- Never ask questions.',
      '- Read and understand the existing codebase before changing files.',
      '- Change only what the task requires.',
      '- Never commit or push to develop/main/master/production/staging.',
      '- Never run git push.',
      '- Run tests or lint when available.',
      '- End with a concise implementation summary.',
    ].join('\n');
  }

  private buildUserMessage(task: TaskRecord, branchName: string): string {
    return [
      `Task: ${task.id} | Repo: ${this.env.TARGET_REPO}`,
      `Branch: ${branchName} (PR base: ${this.env.BRANCH_BASE})`,
      '',
      `## ${task.title}`,
      '',
      task.description,
      '',
      '## Acceptance criteria',
      task.acceptance_criteria,
    ].join('\n');
  }

  private parseToolInput(
    rawInput?: Record<string, string> | string,
  ): Record<string, string> {
    if (!rawInput) {
      return {};
    }
    if (typeof rawInput === 'string') {
      try {
        const parsed = JSON.parse(rawInput);
        return this.normalizeRecord(parsed);
      } catch {
        return {};
      }
    }
    return this.normalizeRecord(rawInput);
  }

  private extractToolCalls(
    directToolCalls: OllamaToolCall[],
    assistantText: string,
  ): OllamaToolCall[] {
    if (directToolCalls.length) {
      return directToolCalls;
    }
    const parsed = this.parseToolCallFromText(assistantText);
    return parsed ? [parsed] : [];
  }

  private parseToolCallFromText(text: string): OllamaToolCall | null {
    const candidate = text.trim();
    if (!candidate.startsWith('{') || !candidate.endsWith('}')) {
      return null;
    }
    try {
      const parsed = JSON.parse(candidate) as {
        name?: string;
        arguments?: Record<string, unknown> | string;
      };
      if (!parsed.name?.trim()) {
        return null;
      }
      return {
        function: {
          name: parsed.name.trim(),
          arguments:
            typeof parsed.arguments === 'string'
              ? parsed.arguments
              : this.normalizeRecord(parsed.arguments),
        },
      };
    } catch {
      return null;
    }
  }

  private normalizeRecord(value: unknown): Record<string, string> {
    if (!value || typeof value !== 'object') {
      return {};
    }
    const entries = Object.entries(value as Record<string, unknown>).map(
      ([key, item]) => [key, String(item)] as const,
    );
    return Object.fromEntries(entries);
  }

  private async callOllama(messages: OllamaMessage[]): Promise<OllamaResponse> {
    const tools = CLAUDE_TOOLS.map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.input_schema,
      },
    }));

    const response = await fetch(`${this.env.OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: this.env.OLLAMA_MODEL,
        stream: false,
        messages,
        tools,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Erro no Ollama (${response.status}): ${body.slice(0, 500)}`,
      );
    }

    return (await response.json()) as OllamaResponse;
  }
}
