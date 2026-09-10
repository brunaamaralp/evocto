# Roadmap: Evocto → Processo Real Estúdio Narrativa

**Data:** 2026-03-09  
**Fonte:** auditoria do código + processo operacional descrito (Bruna / Duda / Cliente)  
**Objetivo:** mapa de evolução — o que manter, o que falta, prioridades e sprints

---

## Correções vs. brief inicial

O brief de entrada descrevia bem as **dores operacionais**, mas alguns pontos do “estado atual” no código estão diferentes:

| Claim no brief | Realidade no código |
|----------------|---------------------|
| Frontend SvelteKit + Svelte stores | **Vite + React 18 + Zustand** (`src/store/`) |
| Notificações via Anthropic | **Appwrite Notification** + scan de deadlines; Anthropic = **campanha anual / finanças** |
| “Sem gates” | Existem **`bloqueador`** + dependências FS (`wirePhaseDependencies`, `unlockDependents`) — sem conceito nomeado **gatekeeper** |
| Ciclos comerciais / produtos faltam | **Já existem** no anual + Empresa (`produtos_linhas`, `ciclos_comerciais`) |
| Briefing anual + IA falta | **Já existe** de forma substancial (`briefing-campanha-anual`, `gerarCampanhaAnualHandler`) |
| Portal do cliente falta | **Existe** (`client-portal`) — falta foco no gate “calendário cliente” + share token de campanha |

Este documento usa o **estado real** e reordena o roadmap em cima disso.

---

## PARTE 1 — Situação atual (estado real)

### 1.1 O que funciona (Keep)

#### Arquitetura base — OK

| Camada | Stack real |
|--------|------------|
| Frontend | Vite + React + React Router + Radix/Tailwind |
| Backend | Vite API / handlers em `api/` + `lib/server/` |
| Database | Appwrite (collections + payload rico) |
| State | Zustand |

Sem necessidade de troca de stack.

#### Conceitos implementados — OK / extensíveis

| Conceito | Onde | Status |
|----------|------|--------|
| Empresas (contexto, config) | `empresaConfig.js`, `ConfigurarEmpresaModal` | Keep |
| Produtos / linhas | `Empresa.produtos_linhas[]` | Keep — já no anual |
| Briefs (`briefing_inicial`, `campanha_mensal`, `campanha_anual`) | `campanhaBriefing.js`, `campanhaAnualSchema.js` | Keep |
| Ciclos comerciais (estratégicos) | `CICLOS_COMERCIAIS` no anual | Keep — **≠** CyclePlan |
| CyclePlan (ciclo operacional) | `cycle_plans`, `createMonthCycle.js` | Keep — schema operacional a evoluir |
| Tarefas (status, responsável, bloqueador) | template + `tasks` | Keep — base para gates |
| Notificações in-app + due soon/overdue | `NotificationService`, `scanTaskDeadlineNotifications` | Keep — estender SLA |
| Campanha anual + Claude | `api/campanha-anual.js`, handlers | Keep — fechar materialização |

#### Fluxos que funcionam — OK

- Criar campanha mensal rápida (5 campos) — `BriefingFormSimples`
- Gerar tarefas automáticas (template 4 semanas) — `taskScheduler.js` + `generateTasksFromCyclePlan`
- Kanban de tarefas (status) — boards com 4–5 colunas (há inconsistência leve entre views)
- Lembretes de deadline / segunda-feira no template
- Movimento de tarefas (drag-drop)
- Dependências por `bloqueador` entre tarefas do ciclo

**Fases canônicas hoje** (`src/templates/cicloMensal4SemanasTemplate.js`):

```
PLANEJAMENTO → PRODUÇÃO → REVISÃO → PUBLICAÇÃO
```

Arquivos-chave:

- `src/templates/cicloMensal4SemanasTemplate.js`
- `src/lib/taskScheduler.js`
- `src/api/functions/createMonthCycle.js`
- `src/pages/briefing-campanha.jsx`
- `src/pages/briefing-campanha-anual.jsx`

---

### 1.2 O que não funciona / falta (Fix + Add)

Legenda: **Missing** = não existe · **Partial** = existe mas não cobre o processo Narrativa · **Misaligned** = existe sob outro nome/modelo

#### Pipeline operacional (4 fases genéricas) — Fix

| Hoje | Processo real |
|------|---------------|
| 4 fases genéricas | 7–9 fases específicas com gates |

Pipeline alvo (padrão 5 vídeos):

1. PLANEJAMENTO  
2. FOTO E VÍDEO (edição = subtarefa explícita)  
3. ROTEIROS (opcional por tipo)  
4. APROVAÇÃO INTERNA  
5. CALENDÁRIO CLIENTE (gatekeeper crítico)  
6. ALTERAÇÕES (condicional)  
7. AGENDAMENTO → CONCLUÍDO  

**Falta:** fases detalhadas, progress por subtarefa, transição automática em 100%, edição visível.

#### Variação por tipo de campanha — Add

| Tipo | Fases / comportamento |
|------|------------------------|
| `5_videos` | 7 fases (padrão) |
| `ugc` | ~6 (sem ROTEIROS / produção clássica) |
| `influenciador` | 7 + gate influencer |
| `so_posts` | ~5 (sem FOTO E VÍDEO / ROTEIROS) |

**Status:** `tipo_campanha` **não existe** como enum. UGC/influencer só em copy/prompts.

#### Aprovações e gatekeeper — Partial → Fix

Hoje: `responsavel` + `bloqueador` (id de tarefa).  
Falta: gatekeeper ≠ executor, `gate_status` (pendente/aprovado/rejeitado), bloqueio formal de transição de fase, notif direcionada, feedback de rejeição.

#### SLA e vencimentos realistas — Partial → Fix

Hoje: `dueDate` + `task_due_soon` / `task_overdue`.  
SLA “de verdade” (`slaDays`) está no **funil de leads**, não no ciclo de campanha.  
Falta: SLA por fase com buffer (prometido vs real), reminder/escalation (D3/D4/D5), cores por urgência, regra de ação.

#### Subtarefas (granularidade) — Missing (ops)

Hoje: 1 tarefa “Gravar vídeos”; `parentTaskId: null` em create; `ADD_SUBTASK` só em modelo de ajuste de IA.  
Falta: árvore operacional, `progress_pct`, ETA por item, reporte “2/5 vídeos prontos”.

#### Visibilidade multi-pessoa — Partial

Hoje: portal cliente + dashboards agência; roles no template (`bruna` / `duda` / `cliente`).  
Falta: dashboards por persona (fila Duda, orquestração Bruna, só calendário para cliente/influencer).

#### Feedback / resultado de ciclo — Partial

Hoje: `ClosingPanel` (notas/anexos), learning parcial, entidades soltas.  
Falta: form estruturado (vendas vs meta, engajamento, o que funcionou, aprendizados) + histórico usável pela IA.

#### Briefing anual + IA — Partial (já avançado)

Existe form, schema 9×12, ciclos, produtos, Claude.  
Falta endurecer: review timeline → aprovação 1× → **derivação automática confiável** de 12 ciclos mensais + tasks.

#### Produtos / linhas e ciclos comerciais — Keep + Wire

Já no Empresa/anual.  
Falta: `linha_focal` no brief **mensal** / CyclePlan e SLA/tom ligados ao ciclo no **pipeline operacional** (hoje o mensal é genérico).

---

### 1.3 Dores (mapeadas → gap)

#### Bruna

| Dor | Gap |
|-----|-----|
| Não vê de relance onde está cada campanha | Pipeline 4 fases + sem subtarefas |
| Cliente bloqueia sem aviso claro | SLA campanha + escalation |
| Não sabe o que Duda está fazendo (edição) | Fase/subtarefa de edição explícita |
| Planejar o ano em 1 reunião | Anual existe — fechar materialização |
| Não sabe se campanha funcionou | Feedback estruturado |

#### Duda

| Dor | Gap |
|-----|-----|
| Não sabe se roteiro foi aprovado | Gatekeeper + notif |
| 5 vídeos = 1 tarefa | Subtarefas |
| Edição invisível | Subtarefa explícita |
| Cliente atrasa sem aviso pra Bruna | Escalation |

#### Cliente

| Dor | Gap |
|-----|-----|
| Não sabe quando responder | SLA + notif + portal no gate certo |
| Não vê material pronto | Portal focado no calendário |
| Não vê meta/KPI esperado | Comunicação de meta no ciclo + feedback |

---

## PARTE 2 — O que precisa evoluir (roadmap)

### Priorização (ajustada ao código real)

```
P0 (crítico — semanas 1–2)
├─ Pipeline 7 fases (substituir/estender template 4 semanas)
├─ Subtarefas + edição explícita + progress_pct
├─ Gatekeeper formal (evoluir bloqueador → aprovação)
└─ SLA por fase + reminder/escalation (sobre deadlines existentes)

P1 (importante — semanas 3–6)
├─ tipo_campanha → pipelines variantes
├─ Wire ciclos comerciais + linha_focal no CyclePlan/mensal
├─ Fechar loop anual → 12 ciclos mensais
└─ Feedback/resultado estruturado ao fim do ciclo

P2 (mês 2–3)
├─ Dashboard por persona (Bruna / Duda / Cliente / Influencer)
├─ Portal cliente no gate CALENDÁRIO (share token de campanha)
├─ Relatório performance (últimas 12)
└─ Automações extras (e-mail / Slack / WhatsApp formal)

P3 (mês 3+)
├─ Análise de padrões por ciclo/tipo/linha
├─ Recomendações automáticas
└─ Integração Buffer / Later / Metricool
```

**Não reinventar:** produtos/linhas, ciclos comerciais no anual, Anthropic anual, portal base, sistema de notificação, dependências de tarefa.

---

### P0 — Pipeline base + subtarefas + gates + SLA

#### O que precisa

1. **Schema CyclePlan / template revisado**
   - Fases fixas (7) + subtarefas dinâmicas
   - Status de fase calculado das subtarefas
   - `progress_pct` = concluídas / total
   - Transição automática em 100% (+ gate se houver)

2. **Fases (7)** — ver lista acima; ROTEIROS / FOTO E VÍDEO / ALTERAÇÕES podem ser opcionais por tipo (P1)

3. **Conceitos novos**
   - Subtarefa (`titulo`, `status`, `duracao`, `responsavel`)
   - Gatekeeper + `gate_status`
   - Status de fase: `concluida | em_progresso | bloqueada`

4. **UI**
   - `PipelineTimeline` (7 fases)
   - `FaseCard` + `SubtarefaList`
   - Botão de transição (respeita gate)

5. **SLA**
   - `sla_dias` / `sla_buffer_dias` por fase
   - Cores verde/amarelo/vermelho
   - Jobs diários: reminder → escalation (estender `scanTaskDeadlineNotifications`)

#### Como implementar (orientação)

1. Estender template canônico (não só Appwrite typed cols — payload já é rico).
2. `taskScheduler` / gerador: criar subtarefas no materialize.
3. API cycle: PATCH subtarefa → recalcular progress → auto-avançar se gate OK.
4. Evoluir `bloqueador` → `gatekeeper` + status de aprovação (compat 1 sprint).
5. Testar com ciclo MALU (ex.: fevereiro).

#### Pronto quando

- [ ] Timeline 7 fases no lugar do modelo mental “4 colunas de fase”
- [ ] “2/5 vídeos prontos” visível
- [ ] `progress_pct` correto
- [ ] Transição automática / bloqueada por gate
- [ ] Bruna vê SLA colorido + escalation no calendário cliente

---

### P1 — Tipos + wire estratégico + anual + feedback

#### Tipo de campanha

- Campo `tipo_campanha`: `5_videos | ugc | influenciador | so_posts`
- `generateSubtarefasByType(tipo)`
- UI de criação com preview de fases

**Pronto quando:** UGC sem ROTEIROS; só posts sem produção; influencer com gate extra.

#### Ciclos + produtos no operacional

- `ciclo_comercial` e `linha_focal` no brief mensal / CyclePlan
- SLA/tom podem variar (ex.: VENDAS mais curto)
- IA anual já diferencia — mensal precisa herdar

#### Briefing anual → ciclos

- Fechar materialização: aprovado → 12 `campanha_mensal` + CyclePlans + tasks
- Bridge já esboçada em `mapAnualMesToCampanhaMensalForm`

#### Feedback

- POST `cycles/:id/feedback` (ou collection `feedback_ciclos` / payload no CyclePlan)
- Campos: vendas vs meta, engagement, o que funcionou / não, aprendizados
- Alimenta próxima geração IA

---

### P2 — Personas, portal, automações

- `/dashboard/:persona` ou home condicional por role
- Share link `/campaigns/:shareToken` focado em aprovação de calendário
- Notif formal ao cliente (e-mail/WhatsApp com link)
- Relatório 12 campanhas

---

### P3 — Inteligência ✅

- Padrões: ciclo × tipo × linha (via feedbacks) — `campaignInsights.js`
- Recomendações próxima campanha — `/campaign-insights`
- Agendamento externo: Buffer + Metricool via API server; Later experimental; CSV manual

---

## PARTE 3 — Plano de sprints (6 semanas + P2)

| Janela | Escopo | Go-live |
|--------|--------|---------|
| Semanas 1–2 | **P0** pipeline 7 + subtarefas + gate + SLA base | Bruna opera novo pipeline (5 vídeos) |
| Semana 3 | **P1** tipos + wire ciclo/linha no mensal | UGC/só posts corretos; MALU com 4 linhas no mensal |
| Semanas 4–5 | **P1** fechar anual → 12 ciclos | Planejamento anual 1 reunião → ciclos criados |
| Semana 6 | **P1** feedback estruturado | Registro de resultado por ciclo |
| P2 sem. 1 | Portal + escalation polida | Cliente no sistema via link |
| P2 sem. 2 | Dashboards persona | Duda só vê fila; Bruna orquestra |

### Riscos técnicos

| Nível | Risco | Mitigação |
|-------|-------|-----------|
| Alto | Mudança de template/schema CyclePlan + progress + auto-transição | Feature flag / template paralelo 1 semana; rollback |
| Médio | Materialização anual (12 ciclos) + timing de notifs | Dry-run MALU antes de live |
| Baixo | UI timeline / dashboards read-only | Iteração visual isolada |

### Regra de convivência

- Manter Kanban de **status de tarefa** (backlog/todo/…).
- Introduzir **Timeline de fase de campanha** como visão primária de orquestração.
- Não confundir `ciclo_comercial` (estratégia) com `CyclePlan` (entrega).

---

## Apêndice — Inventário rápido de arquivos

| Área | Paths |
|------|-------|
| Fases 4 semanas | `src/templates/cicloMensal4SemanasTemplate.js` |
| Scheduler | `src/lib/taskScheduler.js` |
| Criar mês | `src/api/functions/createMonthCycle.js` |
| Gerar tasks | `src/api/functions/generateTasksFromCyclePlan.js` |
| Dependências | `src/lib/wirePhaseDependencies.js`, `wireTaskTemplateDependencies.js` |
| Mensal 5 campos | `src/lib/campanhaBriefing.js`, `BriefingFormSimples.jsx` |
| Anual + ciclos + produtos | `src/lib/campanhaAnualSchema.js`, `pages/briefing-campanha-anual.jsx` |
| IA anual | `lib/server/gerarCampanhaAnualHandler.js`, `api/campanha-anual.js` |
| Deadlines | `src/lib/scanTaskDeadlineNotifications.js` |
| Portal | `src/pages/client-portal.jsx` |
| Closing parcial | `src/components/cycles/ClosingPanel.jsx` |

---

## P0 em andamento (2026-03-09)

Implementação inicial entregue em paralelo ao legado 4 semanas:

| Peça | Path |
|------|------|
| Template 7 fases + subtarefas `5_videos` | `src/templates/cicloNarrativa7FasesTemplate.js` |
| Progress / gates / SLA helpers | `src/lib/pipelineNarrativa.js` |
| Seed template Appwrite | `src/api/functions/ensureCicloNarrativaTemplate.js` |
| createMonthCycle `pipeline: narrativa\|legado` | `src/api/functions/createMonthCycle.js` |
| Wizard com seletor de pipeline | `src/components/cycles/NewMonthCycleWizard.jsx` |
| Timeline UI | `src/components/cycles/PipelineTimeline.jsx` |

Ordem das fases (ajustada aos gates): PLANEJAMENTO → ROTEIROS → FOTO E VÍDEO → APROVAÇÃO INTERNA → CALENDÁRIO CLIENTE → ALTERAÇÕES → AGENDAMENTO.

P0 restante entregue:
- `transitionPipelinePhase` — transition / skip / approve_gate / sync
- Auto-sync ao concluir tarefa (`syncPipelineAfterTaskComplete` no TaskDrawer)
- Escalation SLA D3/D4/D5 (`scanPipelineSlaEscalations` no ModernHeader)
- Botões ativos na `PipelineTimeline` (aprovar gate, passar, pular ALTERAÇÕES)

## P1 em andamento (2026-03-09)

| Peça | Path |
|------|------|
| Tipos + preview fases | `src/lib/tipoCampanhaPipeline.js` |
| createMonthCycle tipo/ciclo/linha | `src/api/functions/createMonthCycle.js` |
| Wizard + briefing mensal | `NewMonthCycleWizard`, `BriefingFormSimples` |
| Anual → brief + CyclePlan | `src/lib/materializeAnualMesToCycle.js` |
| Feedback estruturado | `src/lib/cycleFeedback.js`, `CycleFeedbackForm` |

Pronto quando (P1):
- [x] UGC sem ROTEIROS / só posts sem produção / influencer com gate
- [x] ciclo_comercial + linha_focal no mensal/ciclo
- [x] Materializar mês (e todos) cria briefing + ciclo
- [x] Form de resultado no overview/fechamento

## P2 entregue (2026-03-09)

| Peça | Path / rota |
|------|-------------|
| Dashboard persona | `/dashboard/:persona` · `persona-dashboard.jsx` |
| Portal share calendário | `/campaigns/:shareToken` · `campaign-share.jsx` |
| Gerar link + notif Bruna | `src/lib/campaignShare.js` · botão na PipelineTimeline |
| Performance 12 campanhas | `/campaigns-performance` |

## P3 entregue (2026-03-09)

| Peça | Path / rota |
|------|-------------|
| Padrões ciclo/tipo/linha | `src/lib/campaignInsights.js` |
| Recomendações próxima campanha | idem + UI |
| Insights UI | `/campaign-insights` |
| Scheduler Buffer/Later/Metricool | `lib/server/schedulers/*` + `/api/schedule-push` · CSV fallback |
| Env vars | `BUFFER_*`, `METRICOOL_*`, `LATER_*` em `.env.example` |
