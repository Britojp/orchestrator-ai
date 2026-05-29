# Regras de desenvolvimento — auto-ai

Regras **obrigatórias** para o orquestrador, o agente (Cursor) e quem opera o sistema. Violações devem falhar a tarefa, não ser ignoradas.

---

## 1. Ambiente: nunca produção

| Proibido | Permitido |
|----------|-----------|
| Executar contra ambiente de **produção** | `development`, `staging`, clone local |
| `NODE_ENV=production` no worker | `NODE_ENV=development` (padrão do worker) |
| Deploy, release, promote, rollback em prod | Apenas código no Git + PR |
| Alterar secrets/vars de produção | Secrets só no `.env` do worker (fora do repo alvo) |
| Conectar ao banco/API **de produção** do app alvo | Apenas Supabase do **auto-ai** (fila de tarefas) |
| `kubectl apply`, Terraform apply em prod, `vercel --prod`, etc. | Nada que publique em prod |

O `REPO_PATH` deve ser um **clone de desenvolvimento** do repositório, nunca o servidor de produção.

---

## 2. Fluxo Git e PR (ordem fixa)

Este é o **único** fluxo válido. Não há atalhos.

```
develop (atualizada)
    │
    ▼
branch agent/task-{id}   ← criada A PARTIR de develop
    │
    ▼
commits na branch agent   ← apenas aqui o agente edita
    │
    ▼
push da branch agent      ← nunca push em develop/main/production
    │
    ▼
Pull Request              ← base = develop, head = branch agent
```

### 2.1 O que o orquestrador faz (sempre nesta ordem)

1. `git fetch origin`
2. `git checkout develop` (ou `BRANCH_BASE`)
3. `git pull origin develop`
4. `git checkout -b agent/task-{id}` (prefixo configurável)
5. Invocar o agente (somente na branch agent)
6. `git push -u origin agent/task-{id}`
7. `gh pr create --base develop --head agent/task-{id}`

### 2.2 O que o agente (IA) faz

- Edita código **somente** na branch `agent/task-{id}` já checked out.
- Cria commits nessa branch.
- Roda testes/lint **localmente** no clone (não em servidor remoto de prod).

### 2.3 O que o agente **nunca** faz

- `git push` (quem faz push é o orquestrador).
- Abrir ou mergear PR (quem abre PR é o orquestrador).
- `git checkout develop` / `main` / `master` / `production` para commitar.
- `git push origin develop` ou push em qualquer branch protegida.
- Merge local em `develop` (`git merge`, `git rebase` onto develop no clone).
- Deploy, migração em produção, alteração de infra de prod.

### 2.4 Pull Request

- **Base (destino do merge):** sempre `develop` (`BRANCH_BASE`).
- **Head (origem):** sempre `agent/task-{id}`.
- O PR é a **única** forma de levar mudanças para `develop`.
- **Não** fazer merge automático no PR; revisão humana recomendada.

---

## 3. Branches proibidas para push e commit do agente

Push direto **bloqueado** pelo orquestrador nestas branches:

- `develop`
- `main`
- `master`
- `production`
- `prod`
- `release`
- `staging` (push; PR para staging só se explicitamente configurado no futuro)

Trabalho sempre em `agent/*` criada a partir de `develop`.

---

## 4. Supabase

### 4.1 Fila auto-ai (orquestrador)

- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`: tabela `tasks` apenas.
- Service role só no worker; nunca no frontend.

### 4.2 MCP do projeto alvo (agente — somente leitura)

O agente pode consultar o **Supabase do app que está desenvolvendo** via MCP oficial:

| Config | Valor |
|--------|--------|
| `PROJECT_SUPABASE_MCP_ENABLED` | `true` (padrão) |
| `PROJECT_SUPABASE_PROJECT_REF` | ref do projeto (dashboard Supabase) |
| `PROJECT_SUPABASE_ACCESS_TOKEN` | PAT Supabase (CI), não service role |

Configuração técnica (forçada no código):

- URL: `https://mcp.supabase.com/mcp?project_ref=...&read_only=true&features=database,docs`
- `read_only=true`: SQL apenas como usuário Postgres read-only; sem `apply_migration`
- `features=database,docs`: sem branching, deploy, pause project, storage

**Proibido para o agente via MCP:**

- INSERT, UPDATE, DELETE, DDL, migrations, branches, deploy
- Qualquer operação em projeto/banco de **produção**

Use projeto de **desenvolvimento** ou branch de preview do Supabase, nunca produção.

Para desativar MCP: `PROJECT_SUPABASE_MCP_ENABLED=false`.

---

## 5. Critérios de falha da tarefa

A tarefa deve ir para `failed` (ou retry) se:

- Não houver commits na branch agent em relação a `develop`.
- Push ou PR apontar para branch proibida.
- `ENVIRONMENT=production` no worker.
- Agente tentar executar comando de deploy em produção (quando detectável no log).

---

## 6. Resumo em uma frase

> Atualiza `develop`, cria branch de trabalho, implementa só nela, sobe a branch e abre PR **para** `develop` — **nunca** commita, faz push ou deploy em produção.

---

## 7. Onde as regras são aplicadas no código

| Camada | Arquivo |
|--------|---------|
| Constantes e texto do prompt | `src/workflow/workflow-rules.ts` |
| Validação na subida | `src/config/env.schema.ts` |
| Git (base, push) | `src/git/git.service.ts` |
| PR (`gh`) | `src/github/github.service.ts` |
| Prompt Cursor | `src/cursor/cursor.service.ts` |
| MCP read-only do projeto | `src/cursor/project-supabase-mcp.factory.ts` |
| Regra Cursor IDE | `.cursor/rules/auto-ai-workflow.mdc` |

---

*Versão 1.0 — alinhado a [ESPECIFICACOES.md](./ESPECIFICACOES.md).*
