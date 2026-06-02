import Anthropic from '@anthropic-ai/sdk';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { EnvConfig } from '../../../config/env.schema';
import { TaskRecord } from '../../../supabase/task.types';
import { AgentRunResult, IAgentProvider } from '../../agent-provider.interface';
import { CLAUDE_TOOLS, executeToolCall } from './claude-tools';

const MAX_ITERATIONS = 50;

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheWriteTokens: number;
  cacheReadTokens: number;
}

// Preços por milhão de tokens (USD). Fonte: console.anthropic.com/settings/billing
const MODEL_PRICING: Record<string, { input: number; output: number; cacheWrite: number; cacheRead: number }> = {
  opus:   { input: 15.00, output: 75.00, cacheWrite: 18.75, cacheRead: 1.50 },
  sonnet: { input:  3.00, output: 15.00, cacheWrite:  3.75, cacheRead: 0.30 },
  haiku:  { input:  0.80, output:  4.00, cacheWrite:  1.00, cacheRead: 0.08 },
};

// Static content → cached system prompt (charged at 10% after first call in session).
// Task-specific data (branch, title, description) → user message only.
const SYSTEM_PROMPT = `You are an autonomous coding agent that implements development tasks in a git repository.

## Rules
- Never ask questions. Make your best judgment from the task description and acceptance criteria.
- If something is ambiguous, make the most reasonable interpretation and proceed.
- If you cannot complete the task, commit what was done with a message explaining the blocker.
- Read and understand the existing codebase before making changes.
- Follow the code conventions already present in the repository.
- Change only what the task requires — no extra refactors or unsolicited cleanup.

## Absolute prohibitions
- NEVER deploy, release, or take any action in production environments
- NEVER modify secrets, environment variables, or production infrastructure
- NEVER checkout or commit to: develop, main, master, production, staging
- NEVER run git push (the orchestrator handles push)
- NEVER open or merge a Pull Request (the orchestrator opens the PR)
- NEVER run database migrations against production

## Workflow
1. You are already on the correct work branch — do NOT switch branches
2. Start by reading the repository structure and relevant files
3. Implement the task following existing conventions
4. Run tests and lint if they exist (e.g. npm test, npm run lint)
5. Create atomic git commits with clear messages
6. End your final response with a markdown summary of what was implemented`;

export class ClaudeAgentService implements IAgentProvider {
  private readonly logger = new Logger(ClaudeAgentService.name);
  private readonly client: Anthropic;

  constructor(private readonly env: EnvConfig) {
    this.client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }

  async runTask(task: TaskRecord, branchName: string): Promise<AgentRunResult> {
    const userMessage = this.buildUserMessage(task, branchName);
    const runId = randomUUID();
    this.logger.log(
      `Iniciando Claude em ${this.env.REPO_PATH} (modelo ${this.env.CLAUDE_MODEL}), runId=${runId}`,
    );

    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: userMessage },
    ];

    let summary = 'Implementação realizada pelo agente orchestrator-ai.';
    let iterations = 0;
    const totalUsage: TokenUsage = { inputTokens: 0, outputTokens: 0, cacheWriteTokens: 0, cacheReadTokens: 0 };

    while (iterations < MAX_ITERATIONS) {
      const response = await this.client.messages.create({
        model: this.env.CLAUDE_MODEL,
        max_tokens: 8096,
        system: [
          {
            type: 'text',
            text: SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' },
          },
        ],
        tools: CLAUDE_TOOLS,
        messages: this.compactOldToolResults(messages),
      });

      totalUsage.inputTokens      += response.usage.input_tokens;
      totalUsage.outputTokens     += response.usage.output_tokens;
      totalUsage.cacheWriteTokens += (response.usage as any).cache_creation_input_tokens ?? 0;
      totalUsage.cacheReadTokens  += (response.usage as any).cache_read_input_tokens ?? 0;

      this.logger.log(
        `Iteração ${iterations + 1}: stop_reason=${response.stop_reason} | ` +
        `tokens in=${response.usage.input_tokens} out=${response.usage.output_tokens}`,
      );

      messages.push({ role: 'assistant', content: response.content });

      const textBlock = response.content.find((b) => b.type === 'text');
      if (textBlock && textBlock.type === 'text' && textBlock.text.trim()) {
        summary = textBlock.text.trim();
      }

      if (response.stop_reason === 'end_turn') {
        this.logUsageSummary(runId, totalUsage, iterations + 1);
        break;
      }

      if (response.stop_reason === 'max_tokens') {
        throw new Error(
          `Claude atingiu max_tokens na iteração ${iterations + 1}. Aumente CLAUDE_MAX_TOKENS ou simplifique a tarefa.`,
        );
      }

      if (response.stop_reason === 'tool_use') {
        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const block of response.content) {
          if (block.type !== 'tool_use') continue;
          const result = await executeToolCall(
            block.name,
            block.input as Record<string, string>,
            this.env.REPO_PATH,
            this.logger,
          );
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: result,
          });
        }

        messages.push({ role: 'user', content: toolResults });
      }

      iterations++;
    }

    if (iterations >= MAX_ITERATIONS) {
      throw new Error(
        `Claude atingiu o limite de ${MAX_ITERATIONS} iterações sem concluir.`,
      );
    }

    return {
      summary: summary.slice(0, 2000),
      runId,
      agentId: this.env.CLAUDE_MODEL,
    };
  }

  private getPricing(model: string) {
    if (model.includes('opus'))   return MODEL_PRICING.opus;
    if (model.includes('haiku'))  return MODEL_PRICING.haiku;
    return MODEL_PRICING.sonnet;
  }

  private logUsageSummary(runId: string, usage: TokenUsage, iterations: number): void {
    const p = this.getPricing(this.env.CLAUDE_MODEL);
    const costUsd =
      (usage.inputTokens      / 1_000_000) * p.input +
      (usage.outputTokens     / 1_000_000) * p.output +
      (usage.cacheWriteTokens / 1_000_000) * p.cacheWrite +
      (usage.cacheReadTokens  / 1_000_000) * p.cacheRead;

    this.logger.log(
      JSON.stringify({
        event: 'claude_run_completed',
        runId,
        model: this.env.CLAUDE_MODEL,
        iterations,
        tokens: {
          input:       usage.inputTokens,
          output:      usage.outputTokens,
          cacheWrite:  usage.cacheWriteTokens,
          cacheRead:   usage.cacheReadTokens,
          total:       usage.inputTokens + usage.outputTokens,
        },
        estimatedCostUsd: parseFloat(costUsd.toFixed(6)),
      }),
    );
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

  // Keep only the last KEEP_RECENT tool-result messages at full size.
  // Older ones are compacted to a 1-line preview so they stop inflating the context.
  private compactOldToolResults(
    messages: Anthropic.MessageParam[],
  ): Anthropic.MessageParam[] {
    const KEEP_RECENT = 3;

    const toolResultIndices: number[] = [];
    for (let i = 0; i < messages.length; i++) {
      const content = Array.isArray(messages[i].content)
        ? messages[i].content
        : [];
      if (
        messages[i].role === 'user' &&
        (content as { type?: string }[]).some((b) => b?.type === 'tool_result')
      ) {
        toolResultIndices.push(i);
      }
    }

    if (toolResultIndices.length <= KEEP_RECENT) return messages;

    const toCompact = new Set(toolResultIndices.slice(0, -KEEP_RECENT));

    return messages.map((msg, idx) => {
      if (!toCompact.has(idx)) return msg;
      const compacted = (msg.content as Anthropic.ToolResultBlockParam[]).map(
        (b) => {
          if (b.type !== 'tool_result') return b;
          const preview =
            typeof b.content === 'string'
              ? b.content.slice(0, 80).replace(/\n/g, ' ')
              : '';
          return { ...b, content: `[omitted — ${preview}…]` };
        },
      );
      return { ...msg, content: compacted };
    });
  }
}
