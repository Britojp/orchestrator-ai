import { z } from 'zod';
import { FORBIDDEN_ENVIRONMENT_VALUES } from '../workflow/workflow-rules';

export const envSchema = z.object({
  ENVIRONMENT: z
    .enum(['development', 'staging'])
    .default('development'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1)
    .refine((k) => !k.includes('publishable'), {
      message:
        'Use a chave service_role (Settings → API), não a publishable/anon',
    }),
  AI_PROVIDER: z.enum(['cursor', 'claude', 'ollama']).default('cursor'),
  CURSOR_API_KEY: z.string().optional(),
  CURSOR_MODEL: z.string().default('composer-2.5'),
  ANTHROPIC_API_KEY: z.string().optional(),
  CLAUDE_MODEL: z.string().default('claude-sonnet-4-6'),
  OLLAMA_BASE_URL: z.string().url().default('http://127.0.0.1:11434'),
  OLLAMA_MODEL: z.string().default('qwen2.5-coder:7b'),
  TARGET_REPO: z.string().regex(/^[\w.-]+\/[\w.-]+$/),
  REPO_PATH: z.string().min(1),
  WORKTREE_BASE_PATH: z.string().default('/tmp/orchestrator-worktrees'),
  AGENT_CONCURRENCY: z.coerce.number().int().min(1).max(10).default(3),
  BRANCH_BASE: z
    .string()
    .default('develop')
    .refine((v) => v === 'develop', {
      message: 'MVP exige BRANCH_BASE=develop (PR sempre para develop)',
    }),
  GITHUB_TOKEN: z.string().optional(),
  GH_CLI_PATH: z.string().optional(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  POLL_INTERVAL_MS: z.coerce.number().int().positive().default(60000),
  TASK_TIMEOUT_MS: z.coerce.number().int().positive().default(5400000),
  STALE_LOCK_MINUTES: z.coerce.number().int().positive().default(120),
  MAX_RETRIES: z.coerce.number().int().min(0).default(2),
  BRANCH_PREFIX: z.string().default('agent/task'),
  WORKER_ID: z.string().default('worker-1'),
  PORT: z.coerce.number().int().positive().default(3000),
  PROJECT_SUPABASE_MCP_ENABLED: z
    .string()
    .default('true')
    .transform((v) => v.toLowerCase() !== 'false' && v !== '0'),
  PROJECT_SUPABASE_PROJECT_REF: z.string().min(1).optional(),
  PROJECT_SUPABASE_ACCESS_TOKEN: z.string().min(1).optional(),
})
  .superRefine((data, ctx) => {
    if (data.AI_PROVIDER === 'cursor' && !data.CURSOR_API_KEY?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['CURSOR_API_KEY'],
        message: 'Obrigatório quando AI_PROVIDER=cursor',
      });
    }
    if (data.AI_PROVIDER === 'claude' && !data.ANTHROPIC_API_KEY?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ANTHROPIC_API_KEY'],
        message: 'Obrigatório quando AI_PROVIDER=claude',
      });
    }
    if (data.AI_PROVIDER === 'ollama' && !data.OLLAMA_MODEL.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['OLLAMA_MODEL'],
        message: 'Obrigatório quando AI_PROVIDER=ollama',
      });
    }
    if (!data.PROJECT_SUPABASE_MCP_ENABLED) {
      return;
    }
    if (!data.PROJECT_SUPABASE_PROJECT_REF?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['PROJECT_SUPABASE_PROJECT_REF'],
        message:
          'Obrigatório quando PROJECT_SUPABASE_MCP_ENABLED=true (ref do projeto Supabase do app)',
      });
    }
    if (!data.PROJECT_SUPABASE_ACCESS_TOKEN?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['PROJECT_SUPABASE_ACCESS_TOKEN'],
        message:
          'Obrigatório quando PROJECT_SUPABASE_MCP_ENABLED=true (PAT Supabase, escopo somente leitura)',
      });
    }
  });

export type EnvConfig = z.infer<typeof envSchema>;

export function assertNonProductionEnvironment(env: EnvConfig): void {
  const value = env.ENVIRONMENT.toLowerCase();
  if (
    FORBIDDEN_ENVIRONMENT_VALUES.includes(
      value as (typeof FORBIDDEN_ENVIRONMENT_VALUES)[number],
    )
  ) {
    throw new Error(
      `ENVIRONMENT="${env.ENVIRONMENT}" proibido. O orchestrator-ai nunca roda em produção.`,
    );
  }
}
