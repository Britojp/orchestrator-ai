import { config as loadDotenv } from 'dotenv';
import { ensureCliPathsOnPath } from './cursor-cli-path';
import { existsSync } from 'fs';
import { resolve } from 'path';
import {
  assertNonProductionEnvironment,
  envSchema,
  EnvConfig,
} from './env.schema';

function ensureEnvFileLoaded(): void {
  const candidates = [
    resolve(process.cwd(), '.env.local'),
    resolve(process.cwd(), '.env'),
  ];
  const envPath = candidates.find((p) => existsSync(p));
  if (envPath) {
    loadDotenv({ path: envPath });
  }
}

export function loadConfiguration(): EnvConfig {
  ensureEnvFileLoaded();
  ensureCliPathsOnPath();
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const messages = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Configuração inválida:\n${messages}`);
  }
  assertNonProductionEnvironment(parsed.data);
  return parsed.data;
}
