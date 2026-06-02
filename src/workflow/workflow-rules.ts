export const WORKFLOW_BRANCH_BASE = 'develop';

export const BRANCHES_FORBIDDEN_FOR_PUSH = [
  'develop',
  'main',
  'master',
  'production',
  'prod',
  'release',
  'staging',
] as const;

export const FORBIDDEN_ENVIRONMENT_VALUES = ['production', 'prod'] as const;

export function assertBranchAllowedForPush(branchName: string): void {
  const normalized = branchName.trim().toLowerCase();
  if (BRANCHES_FORBIDDEN_FOR_PUSH.includes(normalized as (typeof BRANCHES_FORBIDDEN_FOR_PUSH)[number])) {
    throw new Error(
      `Push proibido na branch "${branchName}". Use apenas branches agent/task-{id} ou feature/task-{id}.`,
    );
  }
  const workPrefix = (process.env.BRANCH_PREFIX ?? 'agent/task').toLowerCase();
  if (
    !normalized.startsWith(workPrefix) &&
    !normalized.startsWith('agent/') &&
    !normalized.startsWith('feature/task-')
  ) {
    throw new Error(
      `Push permitido apenas em branches de trabalho do agente (prefixo: ${workPrefix} ou feature/task-).`,
    );
  }
}

export function assertPrBaseAllowed(baseBranch: string): void {
  const expected = process.env.BRANCH_BASE ?? WORKFLOW_BRANCH_BASE;
  if (baseBranch !== expected && !baseBranch.startsWith('feature/task-')) {
    throw new Error(
      `Base do PR inválida: "${baseBranch}". Use "${expected}" ou feature/task-{id}.`,
    );
  }
}

export function buildAgentPromptSections(params: {
  taskId: string;
  targetRepo: string;
  branchName: string;
  branchBase: string;
  title: string;
  description: string;
  acceptanceCriteria: string;
  projectMcpEnabled: boolean;
}): string {
  const {
    taskId,
    targetRepo,
    branchName,
    branchBase,
    title,
    description,
    acceptanceCriteria,
    projectMcpEnabled,
  } = params;

  const mcpSection = projectMcpEnabled
    ? [
        '',
        '## MCP Supabase do projeto (somente leitura)',
        '- Ferramenta disponível: `project-supabase` (MCP oficial Supabase em modo read_only).',
        '- Use APENAS para consultar schema, tabelas e dados de desenvolvimento (SELECT / list_tables / search_docs).',
        '- PROIBIDO: apply_migration, INSERT, UPDATE, DELETE, DDL, branches, deploy de Edge Functions, pausar projeto.',
        '- Se precisar de mudança no banco, descreva no resumo final — migrations são feitas fora deste fluxo.',
        '- Nunca use MCP contra ambiente de produção.',
      ]
    : [];

  return [
    `Você executa a tarefa ${taskId} no repositório ${targetRepo}.`,
    '',
    '## Fluxo obrigatório (não desvie)',
    `1. Você já está na branch de trabalho: ${branchName}`,
    `2. Ela foi criada a partir de: ${branchBase}`,
    '3. Faça todas as alterações e commits APENAS nesta branch',
    '4. NÃO faça push, NÃO abra PR, NÃO faça merge — o orquestrador fará push e abrirá PR para develop',
    '',
    '## Proibições absolutas',
    '- NUNCA rode deploy, release ou qualquer ação em PRODUÇÃO',
    '- NUNCA altere secrets, variáveis de ambiente ou infra de produção',
    '- NUNCA faça checkout/commit em develop, main, master ou production',
    '- NUNCA faça push (nem local para origin) — o orquestrador faz o push',
    '- NUNCA adicione ao git: node_modules, dist, build, coverage, .cache, arquivos .env, arquivos .log ou qualquer artefato gerado — faça git add apenas em arquivos de código-fonte ou verifique o .gitignore antes de usar git add -A',
    '- NUNCA merge para develop localmente',
    '- NUNCA abra ou merge Pull Request — o orquestrador abre PR com base develop',
    '- NUNCA conecte ou execute migrações no banco de dados de produção do app',
    ...mcpSection,
    '',
    `Branch atual (não renomeie): ${branchName}`,
    `Branch base do PR (somente referência): ${branchBase}`,
    '',
    '## Título',
    title,
    '',
    '## Descrição',
    description,
    '',
    '## Critérios de aceite',
    acceptanceCriteria,
    '',
    '## Ao concluir',
    '- Rode testes e lint do projeto localmente, se existirem',
    '- Faça commits atômicos com mensagens claras',
    '- Responda com resumo em markdown do que foi implementado (vai na descrição do PR para develop)',
  ].join('\n');
}
