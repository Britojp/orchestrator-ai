import type { McpServerConfig } from '@cursor/sdk';
import { EnvConfig } from '../../../config/env.schema';

const MCP_HOSTED_URL = 'https://mcp.supabase.com/mcp';

export function buildProjectSupabaseMcpConfig(
  env: EnvConfig,
): Record<string, McpServerConfig> | undefined {
  if (!env.PROJECT_SUPABASE_MCP_ENABLED) {
    return undefined;
  }

  const params = new URLSearchParams({
    project_ref: env.PROJECT_SUPABASE_PROJECT_REF!,
    read_only: 'true',
    features: 'database,docs',
  });

  return {
    'project-supabase': {
      type: 'http',
      url: `${MCP_HOSTED_URL}?${params.toString()}`,
      headers: {
        Authorization: `Bearer ${env.PROJECT_SUPABASE_ACCESS_TOKEN}`,
      },
    },
  };
}
