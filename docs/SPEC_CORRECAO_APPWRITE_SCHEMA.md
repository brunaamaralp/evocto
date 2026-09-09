# SPEC — Correção do schema Appwrite × código Evocto

| Campo | Valor |
|---|---|
| Status | **Decisões aprovadas + Fases 1/2/3B aplicadas (2026-09-08)** |
| Escopo | Alinhar Appwrite Cloud (projeto reativado) com o que a versão atual do app exige |
| Base | Auditoria somente-leitura de 2026-09-08 (`appwrite-data-audit` canvas + `audit-appwrite-schema.json`) |
| Projeto Appwrite | `6a7f84d80020372c33db` · endpoint `https://fra.cloud.appwrite.io/v1` |
| Database | `6a8ceeb000349382bf83` (`evocto`) |
| Regra | **Nenhuma alteração no Appwrite ou no código até aprovação explícita desta spec** |

---

## 1. Objetivo

Deixar o backend utilizável de forma previsível após a reativação do projeto Appwrite, eliminando bloqueadores de schema e deixando explícito o destino de cada módulo financeiro (Appwrite vs localStorage).

### 1.1 Fora de escopo (nesta spec)

- Migrar entidades Base44 ainda stubadas (`Project`, `Notification`, `AuditLog`, etc.)
- Implementar Cloud Functions Appwrite
- Reescrever o hub financeiro Nave completo
- Apagar dados existentes de usuários/teams
- Mudanças de plano Appwrite / billing

---

## 2. Princípios

1. **Fase 1 primeiro** — o núcleo Evocto (`TABLE_MAP` + `appwrite-setup.mjs`) é a fonte da verdade.
2. **Sem surpresa financeira** — não ligar Caixa/Mensalidades ao Appwrite sem decisão de produto.
3. **Idempotente** — scripts de correção só criam o que falta; não renomeiam nem apagam sem gate separado.
4. **Um PR / uma aprovação por fase** — cada fase tem aceite testável.

---

## 3. Decisões de produto (aprovar antes de implementar)

Marque uma opção por decisão.

### D1 — Destino do hub financeiro (`/financeiro`, Caixa, Mensalidades)

| Opção | Descrição | Implicação |
|---|---|---|
| **A (recomendado agora)** | Manter **localStorage** como backend do hub | Appwrite: não exige `financial_tx`/`client_billings` para o hub; Settings accounts/journal devem falhar de forma controlada ou usar local |
| **B** | Migrar hub para Appwrite (`financial_tx` + `client_billings`) | Exige completar attrs, índices, permissões, env e trocar `financeLocalBackend` |
| **C** | Híbrido: leitura Appwrite + escrita local (não recomendado) | Complexidade alta; fora desta spec |

**Escolha:** ☐ A ☑ **B** ☐ C

### D2 — Settings → Plano de contas / Diário (`finance_accounts`, `finance_journal`)

| Opção | Descrição |
|---|---|
| **A** | Criar as duas tabelas no Appwrite com schema mínimo usado pela UI |
| **B** | Desligar/esconder as abas até a migração financeira |
| **C** | Redirecionar para store local (espelhar padrão do hub) |

**Escolha:** ☑ **A** ☐ B ☐ C

### D3 — Tabelas órfãs já existentes (`financial_tx`, `client_billings`)

| Opção | Descrição |
|---|---|
| **A** | Manter intactas (legado); documentar como não usadas pelo hub |
| **B** | Corrigir índices quebrados + attrs faltantes (preparar para D1=B) |
| **C** | Arquivar/remover depois de backup (fase futura; **não** nesta spec sem aprovação extra) |

**Escolha:** ☐ A ☑ **B** ☐ C

### D4 — Campo de responsável em tasks

| Opção | Descrição |
|---|---|
| **A (recomendado)** | UI e filtros passam a gravar/ler **`assigneeId`**; manter leitura de `assignedTo` do payload por compatibilidade |
| **B** | Remover coluna `assigneeId` do contrato e tratar só `assignedTo` no payload (pior para queries) |

**Escolha:** ☑ **A** ☐ B

---

## 4. Estado atual (resumo da auditoria)

### Compatível (não mexer)

- Database `evocto` + env `VITE_APPWRITE_DATABASE_ID`
- Bucket `files`
- Tabelas: `profiles`, `agencies`, `clients`, `services`, `tasks`, `cycle_plans`, `briefs`, `briefing_templates`, `approval_requests`, `invites`
- Colunas tipadas + `payload` + índices key do setup
- Permissões de tabela: `create("users")` + `rowSecurity: true`
- Auth / Teams (1 user, 1 team no momento da auditoria)

### Bloqueadores

| ID | Problema | Impacto |
|---|---|---|
| B1 | `time_entries` **ausente** | Timer / Hours Hub quebrados |
| B2 | `finance_accounts` **ausente** | `AccountsTab` falha se aberta |
| B3 | `finance_journal` **ausente** | `financeJournal.js` tenta `createDocument` no default |
| B4 | Funções `sendInvite` / `approvalWorkflow` stub | Fluxos de convite/aprovação quebrados (app, não schema) |
| B5 | Entidades Base44 stub | Telas listam vazio / create throw |

### Divergências relevantes

| ID | Problema |
|---|---|
| G1 | UI `assignedTo` vs coluna `assigneeId` |
| G2 | Índices `idx_origin_id` / `idx_billing_id` em `financial_tx` sem colunas |
| G3 | Env `VITE_APPWRITE_STUDENT_PAYMENTS_COL_ID` vs `…_COLLECTION_ID` |
| G4 | Hub financeiro em localStorage enquanto tabelas Appwrite existem |
| G5 | Sem índice `projectId` (briefs) / `assigneeId` (tasks) — performance |
| G6 | Filtros `serviceType` / `contentType` só em payload |

---

## 5. Fases de correção

### Fase 0 — Gates e inventário (0 alteração Appwrite)

**Entregáveis**

- [ ] Esta spec aprovada (D1–D4 preenchidas)
- [ ] Backup mental: anotar `DATABASE_ID`, project id, total de tables (12)
- [ ] Smoke pós-reativação: login + `npm run appwrite:smoke` (se existir) ou script de listagem

**Aceite:** decisões D1–D4 assinaladas; smoke Auth OK.

---

### Fase 1 — Desbloquear núcleo Evocto (obrigatória)

**Meta:** Hours Hub / timer funcionarem contra Appwrite.

#### 1.1 Appwrite — criar `time_entries`

Idempotente via extensão de `scripts/appwrite-setup.mjs` (já contém a definição) **ou** script dedicado `scripts/appwrite-fix-phase1.mjs` que só cria o que falta.

| Coluna | Tipo | Required | Índice |
|---|---|---|---|
| `agencyId` | varchar(36) | false | key |
| `userId` | varchar(64) | false | key |
| `taskId` | varchar(36) | false | key |
| `serviceId` | varchar(36) | false | key |
| `deliverableId` | varchar(64) | false | — |
| `status` | varchar(16) | false | key |
| `startedAt` | datetime | false | key |
| `payload` | mediumtext | false | — |

- Permissões tabela: `create("users")`
- `rowSecurity: true`
- ACL de linha: mesmo padrão do `entityAdapter` (`Role.team(agencyId)`)

#### 1.2 Código (mínimo)

- Confirmar `TABLE_MAP.TimeEntry` / `TABLE_COLUMNS.time_entries` (já presentes)
- Garantir que creates do timer usam `entityAdapter` / `TimeEntry` e não Collections API legada
- Remover/ajustar aviso “crie a tabela time_entries” após smoke verde

#### 1.3 Aceite

- [ ] Tabela listável na API TablesDB
- [ ] Criar / listar / atualizar / finalizar um time entry pelo UI (ou script)
- [ ] Query por `agencyId` + `userId` + `status` sem erro de índice

**Não inclui nesta fase:** D4 (assignee), financeiro, stubs Base44.

---

### Fase 2 — Alinhar tasks.assignee (recomendado após D4=A)

#### 2.1 Código

1. Em creates/updates de task (`TaskForm`, `TaskCreateModal`, `TaskQuickEdit`, etc.): gravar **`assigneeId`** (e opcionalmente espelhar `assignedTo` no payload só durante transição).
2. Em leituras/filtros: preferir `assigneeId`; fallback `assignedTo` do payload.
3. Opcional: backfill one-shot — para cada task com `assignedTo` no payload e `assigneeId` vazio, copiar valor (script com API key; **dry-run primeiro**).

#### 2.2 Appwrite (opcional)

- Criar índice `idx_assigneeId` em `tasks`

#### 2.3 Aceite

- [ ] Nova task com responsável tem `assigneeId` preenchido na row (não só payload)
- [ ] Filtro por responsável no board usa coluna tipada

---

### Fase 3 — Financeiro conforme D1/D2/D3

#### Caminho 3A — D1=A (localStorage) + D2=B ou C

**Appwrite:** não criar accounts/journal (se D2=B) **ou** criar store local (D2=C).

**Código**

- Se D2=B: esconder/desabilitar `FinanceiroConfigTab` / Accounts / Journal com mensagem clara
- Se D2=C: `ACCOUNTS_COL`/`JOURNAL_COL` vazios → path local; `financeJournal` já tem early-return `if (!JOURNAL_COL) return { ok: true, localOnly: true }` — garantir que env não use defaults inexistentes
- Documentar em README: hub financeiro = localStorage na Fase atual
- Se D3=A: não tocar `financial_tx` / `client_billings`

**Aceite**

- [ ] Abrir Settings não gera 404 de collection
- [ ] Caixa/Mensalidades continuam funcionando em localStorage
- [ ] Nenhum write silencioso para tabelas órfãs

#### Caminho 3B — D1=B (Appwrite) + D2=A + D3=B

**Appwrite — completar `financial_tx`**

Criar colunas faltantes referenciadas por índices/código (mínimo):

| Coluna | Tipo sugerido | Nota |
|---|---|---|
| `origin_id` | varchar(64) | índice já existe quebrado |
| `billing_id` | varchar(64) | índice já existe quebrado |

Attrs opcionais (segunda leva, só se server/Nave for ligado):  
`reverses_id`, `created_by`, `updated_by`, `updated_at`, `recurrence_*`, `reconciled*`, `bank_statement_id`, `due_date`, `expected_settlement_at`, `gateway_*`, `ledger_regime`, `description` (já existe), etc. — extrair lista canônica de `lib/server/financeTxFields.js`.

**Appwrite — completar `client_billings`**

| Coluna | Tipo sugerido |
|---|---|
| `forma_troco` | varchar(32) |
| `troco_account` | varchar(128) |
| `covered_reason` | varchar(64) |
| `billing_reference_id` | varchar(64) |

**Appwrite — criar `finance_accounts`**

Campos mínimos usados por `AccountsTab` / seed:

| Coluna | Tipo |
|---|---|
| `academyId` ou `agencyId` | varchar(64) — **padronizar um** (recomendado: ambos na transição, queries por `agencyId`) |
| `code` | varchar(64) |
| `name` | varchar(255) |
| `type` | varchar(32) |
| `nature` | varchar(32) |
| `dreGrupo` | varchar(64) |
| `dfcClasse` | varchar(64) |
| `dfcSubclasse` | varchar(64) |
| `cashFlowClass` | varchar(64) |
| `cash` | boolean |
| `is_active` / `isActive` | boolean — **padronizar com a UI** |
| `payload` | mediumtext (opcional) |

Índices: `agencyId`/`academyId`, `code`, `type`, `is_active`.

**Appwrite — criar `finance_journal`**

| Coluna | Tipo |
|---|---|
| `academyId` / `agencyId` | varchar(64) |
| `date` | varchar(10) ou datetime |
| `memo` | mediumtext |
| `lines` | mediumtext (JSON) |
| `financial_tx_id` | varchar(64) |

Índices: tenancy + `date` + `financial_tx_id`.

**Código**

- Unificar env: um único `VITE_APPWRITE_STUDENT_PAYMENTS_COLLECTION_ID` (= `client_billings`)
- Trocar `financeTxApi` / `studentPaymentsApi` de localStorage → Appwrite (shim `databases` já existe)
- Mapear `academyId` ↔ `agencyId` de forma explícita no adapter Evocto
- Remover defaults que apontam para collections inexistentes sem fallback

**Aceite**

- [ ] CRUD conta contábil na UI
- [ ] Lançamento de caixa persiste em `financial_tx` e reaparece após reload / outro browser
- [ ] Mensalidade grava `client_billings` e espelho opcional em `financial_tx`
- [ ] Índices `origin_id`/`billing_id` válidos (coluna existe)

---

### Fase 4 — Higiene de schema (não bloqueante)

| Item | Ação |
|---|---|
| G5 | Índice `idx_projectId` em `briefs` |
| G6 | Opcional: coluna `serviceType` em `briefing_templates`; `contentType`/`contentId` em `approval_requests` |
| Permissões | Revisar se `create("users")` + row ACL cobrem portal cliente (role `client`) |
| Unicidade | Avaliar unique em `profiles.email` / `invites` (hoje só key) — **só com análise de dados** |
| Scripts | `appwrite:fix` + `appwrite:audit` no `package.json`; não commitar dumps com secrets |

---

### Fase 5 — Fluxos stub (app, fora do schema) — backlog separado

Não são correção de Appwrite; listados para não misturar:

1. Implementar `sendInvite` / `acceptInvite` / `manageInvites` no client adapter
2. Implementar `approvalWorkflow` mínimo (create row + token)
3. Roadmap de entidades `TABLE_MAP` adicionais (fora desta spec)

**Aceite desta fase:** especificação própria + estimativa; não bloqueia Fases 1–3.

---

## 6. Ordem de execução recomendada

```
Fase 0 (aprovação D1–D4)
    → Fase 1 (time_entries)          [sempre]
    → Fase 2 (assigneeId)            [se D4=A]
    → Fase 3A ou 3B                  [conforme D1/D2/D3]
    → Fase 4 (higiene)               [opcional]
    → Fase 5 (stubs)                 [backlog]
```

---

## 7. Plano de implementação técnica (quando aprovado)

### 7.1 Scripts (somente após aprovação)

| Script | Função |
|---|---|
| `scripts/audit-appwrite-schema.mjs` | Já existe — dump read-only |
| `scripts/appwrite-fix-phase1.mjs` | Cria só recursos faltantes da Fase 1 (+ opcional Fase 4) |
| `scripts/appwrite-fix-finance.mjs` | Só se D1=B / D2=A — cria accounts/journal + cols faltantes |
| `scripts/backfill-task-assignee.mjs` | Dry-run + apply (Fase 2) |

Todos devem:

- Carregar `.env.local`
- Logar o que seria feito
- Suportar `--dry-run`
- Tratar 409 as “já existe”
- **Nunca** deletar table/column sem flag `--destructive` + confirmação textual

### 7.2 Critério de “não regressão”

Após cada fase:

1. `node scripts/audit-appwrite-schema.mjs` — diff esperado
2. Login + criar agência (se ambiente limpo) ou usar team existente
3. CRUD de Client / Service / Task
4. Teste específico da fase (timer / conta / mensalidade)

---

## 8. Matriz de risco

| Mudança | Risco | Mitigação |
|---|---|---|
| Criar `time_entries` | Baixo | Só create; setup já define schema |
| Backfill assignee | Médio | Dry-run; não sobrescrever `assigneeId` preenchido |
| Criar finance tables | Médio | Isolar em script; permissões iguais ao núcleo |
| Ligar hub ao Appwrite | Alto | Feature flag / env; manter localStorage até parity |
| Remover tabelas órfãs | Alto | Fora desta spec |
| Alterar required=true em cols existentes | Alto | **Proibido** nesta spec |

---

## 9. Definição de pronto (DoD) da correção “sistema utilizável”

Considera-se o backend **suficiente para uso normal do núcleo Evocto** quando:

1. Fase 1 concluída (`time_entries` OK)
2. Fase 3A **ou** 3B concluída conforme decisões (sem erros 404 de collection nas telas expostas)
3. Fase 2 feita **ou** explicitamente adiada com issue conhecida documentada
4. README atualizado: o que está no Appwrite vs localStorage
5. Auditoria reexecutada; cobertura Fase 1 ≥ **100% das tabelas do `TABLE_MAP`**

**Nota:** DoD acima **não** exige migração completa Base44 (B5) nem convites (B4).

---

## 10. Checklist de aprovação

- [x] D1 escolhida → **B** (migrar hub para Appwrite)
- [x] D2 escolhida → **A** (criar `finance_accounts` + `finance_journal`)
- [x] D3 escolhida → **B** (corrigir índices/attrs em `financial_tx` / `client_billings`)
- [x] D4 escolhida → **A** (`assigneeId` na UI + fallback `assignedTo`)
- [x] Autorizo Fase 1 (criar `time_entries`)
- [x] Autorizo Fase 2
- [x] Autorizo Fase **3B**
- [x] Autorizo execução de scripts no projeto Appwrite `6a7f84d80020372c33db`

**Aprovador:** usuário (chat)  
**Data:** 2026-09-08

---

## 11. Anexo — defaults de env relevantes

```bash
VITE_BACKEND=appwrite
VITE_APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=6a7f84d80020372c33db
VITE_APPWRITE_DATABASE_ID=6a8ceeb000349382bf83
VITE_APPWRITE_BUCKET_ID=files
APPWRITE_API_KEY=***   # só scripts; nunca VITE_

# Financeiro — só preencher se D1=B
# VITE_APPWRITE_FINANCIAL_TX_COLLECTION_ID=financial_tx
# VITE_APPWRITE_STUDENT_PAYMENTS_COLLECTION_ID=client_billings
# VITE_APPWRITE_STUDENT_PAYMENTS_COL_ID=client_billings   # unificar com o de cima
# VITE_APPWRITE_ACCOUNTS_COLLECTION_ID=finance_accounts
# VITE_APPWRITE_JOURNAL_COLLECTION_ID=finance_journal
```

Se D1=A e D2≠A: preferir **não** setar accounts/journal, ou setar string vazia de propósito nos pontos que hoje defaultam para nomes inexistentes.

---

## 12. Referências

- Canvas da auditoria: `canvases/appwrite-data-audit.canvas.tsx`
- Dump: `audit-appwrite-schema.json`
- Schema canônico Fase 1: `scripts/appwrite-setup.mjs`, `src/api/appwrite/tableMap.js`
- Adapter: `src/api/appwrite/entityAdapter.js`
- Hub local: `src/lib/financeLocalBackend.js`, `src/lib/financeTxApi.js`
