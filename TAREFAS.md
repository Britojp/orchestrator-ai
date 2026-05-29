# Backlog — auto-ai (MVP)

Tarefas derivadas de [ESPECIFICACOES.md](./ESPECIFICACOES.md).  
Escopo: **um repositório**, **NestJS + BullMQ**, **Cursor SDK local**, fila via **Supabase**.

Legenda de status: `todo` | `doing` | `done`

> **Implementação código:** épicos 1–11 concluídos no repositório. Épicos 0 e 2.6 exigem ação manual (Supabase remoto + credenciais).

---

## Épico 0 — Pré-requisitos (manual)

| ID | Tarefa | Critério de pronto |
|----|--------|-------------------|
| 0.1 | Criar projeto no Supabase | URL e keys disponíveis |
| 0.2 | Gerar `CURSOR_API_KEY` | Key válida no dashboard Cursor |
| 0.3 | Configurar acesso GitHub ao repo | `gh auth` ou `GITHUB_TOKEN` com PR + push |
| 0.4 | Clonar repo alvo em `REPO_PATH` | `git pull` em `develop` funciona |
| 0.5 | Definir valores MVP | `TARGET_REPO`, `REPO_PATH`, `BRANCH_BASE=develop` anotados |

**Dependências:** nenhuma (bloqueia todo o resto).

---

## Épico 1 — Infra local

| ID | Tarefa | Depende de | Critério de pronto |
|----|--------|------------|-------------------|
| 1.1 | Adicionar `docker-compose.yml` com Redis 7 | 0.* | `redis-cli ping` → `PONG` | done |
| 1.2 | Documentar subida da stack em README | 1.1 | Comando único documentado | done |

---

## Épico 2 — Banco (Supabase)

| ID | Tarefa | Depende de | Critério de pronto |
|----|--------|------------|-------------------|
| 2.1 | Migration: enum `task_status` | 0.1 | `pending`, `in_progress`, `done`, `failed`, `cancelled` | done |
| 2.2 | Migration: tabela `tasks` | 2.1 | Colunas conforme spec (incl. `acceptance_criteria`) | done |
| 2.3 | Trigger `updated_at` em `tasks` | 2.2 | Update altera `updated_at` | done |
| 2.4 | Índices de fila e stale lock | 2.2 | Índices em `(status, created_at)` e `(status, claimed_at)` | done |
| 2.5 | Habilitar RLS em `tasks` | 2.2 | Sem políticas públicas; service role no worker | done |
| 2.6 | Aplicar migrations no projeto remoto | 2.5 | Tabela visível no dashboard | todo |

---

## Épico 3 — Projeto Nest (bootstrap)

| ID | Tarefa | Depende de | Critério de pronto |
|----|--------|------------|-------------------|
| 3.1 | Inicializar NestJS (TypeScript, strict) | 1.* | `npm run build` ok | done |
| 3.2 | ConfigModule + validação de env (Zod ou schema) | 3.1 | Falha na subida se env obrigatória ausente | done |
| 3.3 | `.env.example` com todas as variáveis do MVP | 3.2 | Documentado sem valores reais | done |
| 3.4 | `.gitignore` (`.env`, `node_modules`, dist) | 3.1 | Segredos não versionados | done |
| 3.5 | Estrutura de pastas (`config`, `supabase`, `queue`, `scheduler`, `git`, `cursor`, `github`) | 3.1 | Pastas criadas conforme spec | done |

---

## Épico 4 — Módulo Supabase

| ID | Tarefa | Depende de | Critério de pronto |
|----|--------|------------|-------------------|
| 4.1 | `SupabaseModule` + client com service role | 2.6, 3.2 | Client injetável |
| 4.2 | `TasksRepository.claimNext(workerId)` | 4.1 | SQL com `FOR UPDATE SKIP LOCKED`; retorna 1 tarefa ou null |
| 4.3 | `TasksRepository.markInProgress` (se claim separado) | 4.2 | Integrado ao claim |
| 4.4 | `TasksRepository.markDone(taskId, prUrl, branch, runIds)` | 4.1 | Status `done` + campos preenchidos |
| 4.5 | `TasksRepository.markFailed(taskId, error, retry?)` | 4.1 | `error_message` + `retry_count` |
| 4.6 | `TasksRepository.saveBranchName(taskId, branch)` | 4.1 | Branch persistida após criar no Git |
| 4.7 | Teste manual: insert `pending` + claim via script/repl | 4.2 | Uma linha vira `in_progress` |

---

## Épico 5 — Fila (BullMQ)

| ID | Tarefa | Depende de | Critério de pronto |
|----|--------|------------|-------------------|
| 5.1 | `QueueModule` + conexão Redis | 1.1, 3.2 | Fila `task-execution` registrada |
| 5.2 | `TaskProducer.addExecuteJob(taskId)` | 5.1 | `jobId = taskId` (idempotência) |
| 5.3 | Opções de job: attempts, backoff, timeout | 5.2 | Alinhado a `MAX_RETRIES` e `TASK_TIMEOUT_MS` |
| 5.4 | `TaskProcessor` esqueleto (`@Processor`) | 5.1 | Job recebido e logado |

---

## Épico 6 — Scheduler (poll)

| ID | Tarefa | Depende de | Critério de pronto |
|----|--------|------------|-------------------|
| 6.1 | `TaskPollerService` com `@Cron` | 4.2, 5.2 | Intervalo = `POLL_INTERVAL_MS` |
| 6.2 | Fluxo: claim → enqueue (sem processar no cron) | 6.1 | Tarefa claimed só uma vez |
| 6.3 | Ignorar enqueue se job já existe (`jobId`) | 6.2 | Sem jobs duplicados na fila |
| 6.4 | `WORKER_ID` no claim (`claimed_by`) | 6.1 | Identificador da instância gravado |

---

## Épico 7 — Git

| ID | Tarefa | Depende de | Critério de pronto |
|----|--------|------------|-------------------|
| 7.1 | `GitService` — validar `REPO_PATH` na subida | 3.2 | Erro claro se path inválido |
| 7.2 | `fetch` + checkout `BRANCH_BASE` + pull | 7.1 | Working tree em `develop` atualizado |
| 7.3 | `createBranch(agent/task-{id})` | 7.2 | Branch criada e checked out |
| 7.4 | `hasCommitsAheadOfBase()` | 7.3 | Detecta se agente commitou |
| 7.5 | `push(branchName)` | 7.3 | Push para `origin` |
| 7.6 | Integrar no processor (antes/depois do agente) | 5.4, 7.* | Branch name salvo em `tasks` |

---

## Épico 8 — Cursor (IA)

| ID | Tarefa | Depende de | Critério de pronto |
|----|--------|------------|-------------------|
| 8.1 | `CursorService` — config `local: { cwd: REPO_PATH }` | 3.2, 0.2 | Runtime explicitamente local |
| 8.2 | Template de prompt (title, description, acceptance_criteria, branch) | 8.1 | Prompt montado a partir da tarefa |
| 8.3 | `runAgent(task)` → `Agent.create` + `send` + `wait()` | 8.2 | Retorna `runId`, trata `CursorAgentError` |
| 8.4 | Persistir `agent_run_id` / `started_at` na tarefa | 4.1, 8.3 | Campos atualizados no início do run |
| 8.5 | Falha se `result.status === 'error'` | 8.3 | Propaga para `markFailed` |
| 8.6 | Extrair resumo para PR (texto final do assistant) | 8.3 | String usada no corpo do PR |

---

## Épico 9 — GitHub (PR)

| ID | Tarefa | Depende de | Critério de pronto |
|----|--------|------------|-------------------|
| 9.1 | `GithubService.createPullRequest(...)` via `gh` | 0.3 | PR criado com `--base develop` |
| 9.2 | Título: `[auto-ai] {title}` | 9.1 | Formato padronizado |
| 9.3 | Corpo: resumo IA + critérios de aceite + `taskId` | 9.1, 8.6 | Markdown legível |
| 9.4 | Retornar `pr_url` e `pr_number` | 9.1 | Parse da saída do `gh` |
| 9.5 | Idempotência: se PR já existe para branch, reutilizar URL | 9.1 | Não falha em re-run |

---

## Épico 10 — Pipeline do processor (integração)

| ID | Tarefa | Depende de | Critério de pronto |
|----|--------|------------|-------------------|
| 10.1 | Orquestrar passos no `TaskProcessor` | 5.4, 7.*, 8.*, 9.* | Ordem: git prep → cursor → push → pr → done |
| 10.2 | Sem commits → `failed` (sem PR) | 7.4, 10.1 | Mensagem clara em `error_message` |
| 10.3 | Sucesso → `markDone` com `pr_url` | 4.4, 10.1 | Status `done` |
| 10.4 | Erro → `markFailed` + retry Bull | 4.5, 5.3, 10.1 | `retry_count` incrementado |
| 10.5 | Logs estruturados (`taskId`, evento, `duration_ms`) | 10.1 | JSON no logger Nest |
| 10.6 | Teste e2e manual: insert tarefa → PR aberto | 10.* | Critérios da spec §11 atendidos |

---

## Épico 11 — Documentação e operação

| ID | Tarefa | Depende de | Critério de pronto |
|----|--------|------------|-------------------|
| 11.1 | README: arquitetura + fluxo | 10.6 | Diagrama ou lista de passos |
| 11.2 | README: como criar tarefa (SQL de exemplo) | 2.2 | Insert copy-paste |
| 11.3 | README: variáveis de ambiente | 3.3 | Tabela completa |
| 11.4 | README: troubleshooting (develop, token, sem commits) | 10.6 | Casos da spec §9 |

---

## Fase 1.1 (pós-MVP)

| ID | Tarefa | Depende de | Critério de pronto |
|----|--------|------------|-------------------|
| 11.5 | Stale lock: reclaim `in_progress` antigo | 4.* | Tarefas travadas voltam ou falham |
| 11.6 | Webhook Supabase → endpoint Nest enqueue | 5.2 | Menor latência que só poll |
| 11.7 | Métricas: contagem por `status` (endpoint ou log periódico) | 4.1 | Visibilidade básica |

---

## Fase 2 (futuro)

| ID | Tarefa |
|----|--------|
| 12.1 | Coluna `repository` + multi-repo |
| 12.2 | Cursor runtime cloud |
| 12.3 | Adapter Claude Code |
| 12.4 | MCP Supabase no agente |
| 12.5 | Dashboard de tarefas |
| 12.6 | Integração issue tracker |

---

## Ordem sugerida de execução

```
0.* → 1.* → 2.* → 3.* → 4.* → 5.* → 6.* → 7.* → 8.* → 9.* → 10.* → 11.*
```

Paralelizável após Épico 3:

- **2.*** (Supabase) em paralelo com **1.*** (Redis)
- **7.***, **8.***, **9.*** em paralelo (serviços isolados), convergindo em **10.1**

---

## Definition of Done (MVP completo)

- [x] Código do orquestrador implementado
- [ ] Tarefa `pending` na tabela é processada sem intervenção manual (requer `.env` + migration remota)
- [x] Branch `agent/task-{id}` criada a partir de `develop`
- [x] Código alterado via Cursor SDK no `REPO_PATH`
- [x] PR aberto para `develop` com descrição do trabalho
- [x] `tasks.pr_url` preenchido e `status = done`
- [x] Falhas com `error_message` e retry limitado
- [x] README e `.env.example` permitem reproduzir o setup

---

## Estimativa grossa (referência)

| Épico | Tamanho |
|-------|---------|
| 0 | 0.5 dia (manual) |
| 1 | 0.5 dia |
| 2 | 0.5 dia |
| 3 | 1 dia |
| 4 | 1 dia |
| 5–6 | 1 dia |
| 7–9 | 2 dias |
| 10 | 1 dia |
| 11 | 0.5 dia |
| **Total MVP** | **~8 dias** (1 dev, dependendo de familiaridade com Nest/Cursor) |

---

*Atualizado com escopo MVP: repositório único. Ver [ESPECIFICACOES.md](./ESPECIFICACOES.md).*
