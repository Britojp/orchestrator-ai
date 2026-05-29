# orchestrator-ai

Orquestrador que lê tarefas no Supabase, executa mudanças via Cursor SDK em um repositório fixo e abre Pull Request para `develop`.

**Regras obrigatórias:** [REGRAS-DESENVOLVIMENTO.md](./REGRAS-DESENVOLVIMENTO.md) — nunca produção; fluxo fixo: `develop` → branch `agent/*` → commits → push → PR para `develop`.

## Pré-requisitos

- Node.js 20+
- Docker (Redis)
- Supabase (projeto + migration aplicada)
- `git` e **`gh`** (GitHub CLI) no PATH — `brew install gh && gh auth login`
- Clone do repo alvo em `REPO_PATH`
- `CURSOR_API_KEY`, `SUPABASE_*`, `GITHUB_TOKEN` (ou `gh auth login`)
- **Cursor Agent CLI** no PATH (`agent --version` ou `cursor agent`). No macOS o app adiciona `~/.local/bin` após o primeiro `cursor agent`.

## Subir Redis (Docker)

```bash
docker compose up -d redis
```

Ou:

```bash
npm run redis:up
```

Verificar:

```bash
docker compose ps
docker compose exec redis redis-cli ping
```

Deve retornar `PONG`. O `.env` já usa `REDIS_URL=redis://localhost:6379`.

Parar:

```bash
npm run redis:down
```

Logs:

```bash
npm run redis:logs
```

## Migration Supabase

No SQL Editor ou via CLI, execute:

`supabase/migrations/20250528120000_tasks.sql`

## Configuração

```bash
cp .env.example .env
```

Preencha todas as variáveis obrigatórias.

### Dois Supabase distintos

| Variável | Uso |
|----------|-----|
| `SUPABASE_*` | Fila de tarefas do **orchestrator-ai** |
| `PROJECT_SUPABASE_*` | MCP **somente leitura** no projeto do app que o agente altera |

Gere o PAT em [Supabase → Access Tokens](https://supabase.com/dashboard/account/tokens). Use projeto de **desenvolvimento**, não produção.

`PROJECT_SUPABASE_MCP_ENABLED=false` desliga o MCP no agente.

## Instalar e rodar

```bash
npm install
npm run build
npm run start:dev
```

### Bull Board (dashboard das filas)

Com o app rodando e o Redis ativo:

**http://localhost:3000/queues**

Mostra a fila `task-execution`: jobs aguardando, ativos, concluídos e falhos.

Requer `npm run redis:up` antes do worker.

## Criar uma tarefa

```sql
INSERT INTO tasks (title, description, acceptance_criteria)
VALUES (
  'Exemplo: adicionar healthcheck',
  'Criar endpoint GET /health retornando { "status": "ok" }.',
  '- Retorna 200\n- JSON com campo status'
);
```

Em até `POLL_INTERVAL_MS` o worker faz claim, enfileira o job e executa:

1. `develop` → branch `agent/task-{id}`
2. Cursor SDK no `REPO_PATH`
3. Push + `gh pr create`
4. `tasks.status = done` e `pr_url` preenchido

## Estrutura

```
src/
  config/       # env (Zod)
  supabase/     # claim, status
  queue/        # BullMQ processor
  scheduler/    # poll Supabase
  git/          # branch e push
  cursor/       # Cursor SDK
  github/       # PR via gh
```

## Troubleshooting

| Problema | Ação |
|----------|------|
| `REPO_PATH inválido` | Caminho absoluto do clone |
| `claim_next_task` não existe | Aplicar migration |
| Sem commits / PR | Ver logs do processor; critérios muito vagos |
| `gh` / `defaultBranchRef` / `Resource not accessible` | O `GITHUB_TOKEN` não pode **criar PRs**. Fine-grained: em `Britojp/auto-zap` ative **Contents** e **Pull requests** (Read and write). Classic: escopo `repo`. Ou `gh auth login -s repo` e atualize o `.env` |

Documentação completa: [ESPECIFICACOES.md](./ESPECIFICACOES.md) · Backlog: [TAREFAS.md](./TAREFAS.md)
