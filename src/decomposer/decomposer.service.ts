import Anthropic from '@anthropic-ai/sdk';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ENV_CONFIG } from '../config/config.tokens';
import { EnvConfig } from '../config/env.schema';
import { TaskRecord } from '../supabase/task.types';

export interface SubTaskDef {
  title: string;
  description: string;
  acceptance_criteria: string;
  /** Índices (0-based) das outras subtasks das quais esta depende. */
  depends_on: number[];
}

export interface DecompositionResult {
  shouldDecompose: boolean;
  subtasks: SubTaskDef[];
}

interface DecomposeInput {
  should_decompose: boolean;
  subtasks?: Array<{
    title?: string;
    description?: string;
    acceptance_criteria?: string;
    depends_on?: number[];
  }>;
}

const DECOMPOSE_TOOL: Anthropic.Tool = {
  name: 'decompose_task',
  description: 'Decide whether to split the task and, if so, return the sub-tasks.',
  input_schema: {
    type: 'object' as const,
    properties: {
      should_decompose: {
        type: 'boolean',
        description: 'true only when the task genuinely requires 3+ independent modules and 4+ distinct acceptance criteria',
      },
      subtasks: {
        type: 'array',
        description: 'Sub-tasks (2–6). Required when should_decompose=true.',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            acceptance_criteria: { type: 'string' },
            depends_on: {
              type: 'array',
              description:
                '0-based indices of other subtasks in this list that must complete before this one starts. Omit or use [] for tasks that can run immediately.',
              items: { type: 'number' },
            },
          },
          required: ['title', 'description', 'acceptance_criteria'],
        },
      },
    },
    required: ['should_decompose'],
  },
};

const SYSTEM_PROMPT = [
  'You are a task analyst. Decide whether a development task is too large for a single coding agent.',
  '',
  'Decompose ONLY when ALL of the following are true:',
  '- The task touches 3+ independent modules or domains',
  '- It has 4+ distinct acceptance criteria requiring separate implementations',
  '- A single agent would need many unrelated changes across the codebase',
  '',
  'When decomposing, produce 2–6 sub-tasks and model their dependencies:',
  '- Sub-tasks that can run in parallel must have depends_on: []',
  '- A sub-task that requires another to finish first must list its 0-based index in depends_on',
  '- Keep the dependency graph as shallow as possible — prefer parallel over sequential',
  '- Example: subtasks 0 and 1 are independent; subtask 2 needs both → depends_on: [0, 1]',
  '',
  'Default to NOT decomposing — only split when clearly necessary.',
].join('\n');

@Injectable()
export class DecomposerService {
  private readonly logger = new Logger(DecomposerService.name);

  constructor(@Inject(ENV_CONFIG) private readonly env: EnvConfig) {}

  async decompose(task: TaskRecord): Promise<DecompositionResult> {
    try {
      if (this.env.ANTHROPIC_API_KEY) {
        return await this.decomposeWithClaude(task);
      }
      if (this.env.AI_PROVIDER === 'ollama') {
        return await this.decomposeWithOllama(task);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Decomposer falhou, seguindo sem decompor: ${msg}`);
    }
    return { shouldDecompose: false, subtasks: [] };
  }

  private async decomposeWithClaude(task: TaskRecord): Promise<DecompositionResult> {
    const client = new Anthropic({ apiKey: this.env.ANTHROPIC_API_KEY! });
    const response = await client.messages.create({
      model: this.env.CLAUDE_MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      tools: [DECOMPOSE_TOOL],
      tool_choice: { type: 'auto' },
      messages: [{ role: 'user', content: this.buildPrompt(task) }],
    });

    for (const block of response.content) {
      if (block.type === 'tool_use' && block.name === 'decompose_task') {
        return this.parseResult(block.input as DecomposeInput, task.id);
      }
    }
    return { shouldDecompose: false, subtasks: [] };
  }

  private async decomposeWithOllama(task: TaskRecord): Promise<DecompositionResult> {
    const response = await fetch(`${this.env.OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: this.env.OLLAMA_MODEL,
        stream: false,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: this.buildPrompt(task) },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: DECOMPOSE_TOOL.name,
              description: DECOMPOSE_TOOL.description,
              parameters: DECOMPOSE_TOOL.input_schema,
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama decompose HTTP ${response.status}`);
    }

    const data = (await response.json()) as {
      message?: {
        tool_calls?: Array<{ function?: { name?: string; arguments?: unknown } }>;
      };
    };

    const call = data.message?.tool_calls?.find(
      (tc) => tc.function?.name === 'decompose_task',
    );
    if (!call) {
      return { shouldDecompose: false, subtasks: [] };
    }

    const args =
      typeof call.function?.arguments === 'string'
        ? (JSON.parse(call.function.arguments) as DecomposeInput)
        : (call.function?.arguments as DecomposeInput);

    return this.parseResult(args, task.id);
  }

  private parseResult(input: DecomposeInput, taskId: string): DecompositionResult {
    if (!input.should_decompose || !input.subtasks?.length) {
      this.logger.log(`[decomposer] task ${taskId} → simples, sem decomposição`);
      return { shouldDecompose: false, subtasks: [] };
    }

    const subtasks: SubTaskDef[] = input.subtasks
      .filter((s) => s.title?.trim() && s.description?.trim())
      .map((s) => ({
        title: s.title!.trim(),
        description: s.description!.trim(),
        acceptance_criteria: s.acceptance_criteria?.trim() ?? '',
        depends_on: Array.isArray(s.depends_on) ? s.depends_on.filter(Number.isInteger) : [],
      }));

    if (!subtasks.length) {
      return { shouldDecompose: false, subtasks: [] };
    }

    this.logger.log(
      `[decomposer] task ${taskId} → decomposta em ${subtasks.length} sub-tasks: ${subtasks.map((s) => s.title).join(' | ')}`,
    );
    return { shouldDecompose: true, subtasks };
  }

  private buildPrompt(task: TaskRecord): string {
    return [
      `## Título`,
      task.title,
      '',
      `## Descrição`,
      task.description,
      '',
      `## Critérios de aceite`,
      task.acceptance_criteria,
    ].join('\n');
  }
}
