# Spec Fase 0 — Contrato de rotas e abas (Campanha / Hub / Workspace)

Status: **implementado como contrato** (doc + helpers em `src/lib/campaignWorkspaceHref.js`).  
Sem wiring de UI/redirects nas páginas — isso é Fase 2+.

Referência de produto: `.cursor/rules/campanhas-hub-workspace.mdc`

---

## 1. Princípios

| # | Regra |
|---|--------|
| P1 | Operação em 1º; Planejamento depois |
| P2 | Criar campanha só no Planejamento (nunca no Hub) |
| P3 | Casa operacional da campanha = **Workspace** com escopo de campanha |
| P4 | Inbox de tarefas do cliente ≠ casa da campanha |
| P5 | Sem “briefing mensal” como superfície de UX |

---

## 2. URL canônica — Workspace da campanha

```
/delivery-workspace?serviceId={serviceId}&clientId={clientId}&campaignId={id}&briefingId={id}&section={tab}
```

| Param | Obrigatório | Notas |
|--------|-------------|--------|
| `serviceId` | sim | Serviço contratado (lente) |
| `clientId` | sim* | Cliente; *recomendado sempre para shell/nav |
| `campaignId` | sim (modo campanha) | ID da unidade/mês (= Brief legado `campanha_mensal`) |
| `briefingId` | espelho | Sempre igual a `campaignId` na Fase 0–1 (compat) |
| `section` | não | Aba; default = `tasks` |

**Sem `campaignId`:** Workspace permanece no modo serviço (nav legada `deliveryWorkspaceTabs.js`) até fases seguintes decidirem unificar.

Alias de ID aceitos na leitura: `campaignId` \| `briefingId` \| `campanhaId`.

Helpers:

- `buildCampaignWorkspacePath({ serviceId, clientId, campaignId, briefingId, tab })`
- `getCampaignIdFromSearchParams(params)`
- `resolveCampaignWorkspaceTab(params)` → tab canônica ou default

---

## 3. Abas do Workspace (modo campanha)

| `section` | Label UI | Papel | Default? |
|-----------|----------|--------|----------|
| `contexto` | Contexto | Briefing do **Serviço** (referência / link para casa no Planejamento) | não |
| `ideia` | Ideia | Conceito + ciclo + mecanismo (substitui ficha/briefing mensal) | não |
| `tasks` | Tarefas | Kanban operacional | **sim (D1)** |
| `historico` | Histórico | Versões + feedback | não |

### Aliases de `section` / `tab` → canônico

| Entrada | Resolve para |
|---------|----------------|
| `tasks`, `tarefas` | `tasks` |
| `ideia`, `ficha`, `brief`, `briefing`, `campaign` | `ideia` |
| `contexto`, `context`, `servico`, `briefing_servico` | `contexto` |
| `historico`, `history` | `historico` |
| vazio / desconhecido (com `campaignId`) | `tasks` |

Constante: `CAMPAIGN_WORKSPACE_TABS` / `CAMPAIGN_WORKSPACE_DEFAULT_TAB` em `campaignWorkspaceHref.js`.

---

## 4. Matriz de redirects (contrato — wiring na Fase 5 / parcial 2–3)

| Origem | Destino | `section` |
|--------|---------|-----------|
| Hub — click na unidade/mês | Workspace campanha | `tasks` |
| Pós-criar campanha (briefs / form / texto / brainstorm) | Workspace campanha | `tasks` |
| Materializar mês (após fluxo Brainstorm → Ideia) | Workspace campanha | `tasks` |
| `/client-campaign` (ficha legada) | Workspace campanha | **`ideia`** (R2) |
| `/campaign` (alias) | idem | `ideia` |
| `/client-tasks?clientId=&briefingId=` (ou `campaignId`) | Workspace campanha | `tasks` |
| `/client-tasks?clientId=` **sem** briefing/campaign | **permanece** (inbox T2) | — |
| Deep link “abrir ficha” / `#ficha` | Workspace campanha | `ideia` |
| Empty state Hub “criar” | **não cria** → Planejamento (`client-briefing` ou anual) | — |

Resolver puro (sem navegar): `resolveLegacyCampaignRedirect({ pageName, params })` → `{ path, tab } \| null`.

---

## 5. Rotas de Planejamento (criação — A2)

| Rota | Papel |
|------|--------|
| `/client-briefing?clientId=` | Planejamento & briefs; **Nova campanha** |
| `/briefing-campanha-anual?clientId=` | Plano anual; **Materializar mês** → Brainstorm |
| `/client-brainstorm?…` | Entrada do fluxo de criação (não é casa operacional) |
| `/briefing-campanha?…` | Fluxo interno form/texto (só a partir do Planejamento) |

**Não são portas de criação:** Hub, `NewCampaignLauncher` como entrada solta, setup “criar primeira campanha” como create.

Landing após create/materialize (contrato): sempre `buildCampaignWorkspacePath(…, tab: 'tasks')`.

---

## 6. Sidebar Operação (S1) — contrato de labels

Com cliente (e opcionalmente unidade):

| Item | Destino |
|------|---------|
| Visão Geral | Hub `/client-detail?clientId=` |
| Workspace | Workspace da unidade atual (se `campaignId` na URL) ou Workspace do serviço |
| Tarefas | Inbox `/client-tasks?clientId=` **sem** briefingId |

**Remover da nav (contrato):** “Unidade atual”, “Tarefas da unidade”, “Ficha” como itens separados.

---

## 7. O que Fase 0 NÃO faz

- Não altera páginas, sidebar, launcher nem redirects no router.
- Não migra dados nem remove `brief_kind: campanha_mensal`.
- Não implementa Kanban / Ideia / Histórico UI.

Próximo: **Fase 1 (dados)** ✅ `docs/SPEC_CAMPANHA_DADOS_FASE1.md` → **Fase 2 (Workspace UI)**.

---

## 8. Checklist de aceite Fase 0

- [x] Documento de rotas/abas/redirects neste arquivo
- [x] Helpers + aliases + resolver legado em `src/lib/campaignWorkspaceHref.js`
- [x] Testes em `src/lib/__tests__/campaignWorkspaceHref.test.js`
- [ ] (Fase 2+) Wiring real nas páginas
