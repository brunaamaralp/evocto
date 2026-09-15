# Spec — Planejamento iterativo (Panorama Anual)

Status: **produto confirmado**. Substitui o fluxo de plano anual rígido / materializar.

Relaciona: fases Hub/Workspace (0–5) permanecem para **operação**; este doc redefine só **Planejamento**.

---

## 1. Filosofia

| Antes | Agora |
|--------|--------|
| Preencher 12 meses → materializar | Planejar mês a mês com feedback |
| Plano anual = documento Brief `campanha_anual` | Panorama = visão viva (calculada/cached) |
| Tema/seed imposto no brainstorm | Brainstorm sem tema imposto + aprendizados |

---

## 2. HOME `/planejamento?clientId=`

Sempre o **Panorama Anual** (nunca vazio):

1. Timeline 12 meses (clickável) — status ✅ 🔄 ⭕
2. Distribuição de ciclos (%)
3. Tendências (de aprendizados)
4. Sugestão próximo semestre/período (IA)
5. Ações: **[+ Nova Campanha]** · **[+ Planejar Múltiplos]** · Detalhes

Sidebar staff: label **Planejamento** → esta HOME (não mais `/briefing-campanha-anual`).

---

## 3. Modos

### Nova Campanha (padrão)
- Entrada: click mês ⭕ ou botão + seletor de mês
- UI: FeedbackSidebar (últimas 3) + Brainstorm
- Salva Ideia `{conceito, mecanismo, foco, ciclo_detectado, ciclo_final}`
- Landing: Workspace aba **Ideia** (PI-2; D1 tasks permanece como default geral do Workspace)

### Planejar Múltiplos (avançado)
- 3–5 meses, canvas, batch save, `linkedToBatch`
- Meses ficam “planejados” no Panorama

### Panorama
- Só leitura/reflexão + atalhos

---

## 4. Remover

- Rota `/briefing-campanha-anual`
- `brief_kind: campanha_anual` (migração/deprecação)
- Materializar mês / temas-seeds do plano anual como pré-requisito
- Create no Hub (já removido)

## 5. Manter

- Workspace, Brainstorm, Briefing do Serviço (`/client-briefing` ou equivalente), Hub, inbox

## 6. Schema

Em campanha (Brief mensal / unidade):

- `resultado` (objeto métricas)
- `aprendizado` (string)
- `feedbackCliente` (string)
- `linkedToBatch?`

Panorama: collection `panorama_anual` **ou** cálculo dinâmico a partir das campanhas do ano.

---

## 7. Fases de implementação (sugeridas)

| Fase | Entrega | Status |
|------|---------|--------|
| **PI-0** | Rota `/planejamento` + redirect legado anual → panorama; sidebar aponta para HOME | **feito** |
| **PI-1** | `AnnualPanorama` UI (timeline + placeholders ciclos/tendências/ações) | **feito** |
| **PI-2** | Nova Campanha a partir do mês (launcher + Brainstorm + landing Workspace) | **feito** |
| **PI-3** | FeedbackSidebar + campos finalize | **feito** |
| **PI-4** | Planejar Múltiplos | **feito** |
| **PI-5** | Remover schema/rota anual rígida e blocos legados | **feito** |

### PI-0 checklist

- [x] `/planejamento?clientId=&ano=`
- [x] `/briefing-campanha-anual` → redirect para panorama
- [x] `buildAnnualPlanHref` → `/planejamento`
- [x] Sidebar **Panorama** (Contextual + ClientContext)
- [x] Helpers `panoramaAnual.js` + UI `AnnualPanorama`

### PI-1 checklist

- [x] Timeline 12 meses com mês atual destacado + seletor de ano
- [x] Distribuição de ciclos (%)
- [x] Tendências (de `aprendizado` / `feedbackCliente` quando existirem)
- [x] Sugestão heurística (placeholder até IA)
- [x] Ações: Nova Campanha (próximo mês vazio) · Planejar Múltiplos (toast) · Briefing

### PI-2 checklist

- [x] Mês ⭕ / **Nova Campanha** → `buildNovaCampanhaHref` (Brainstorm `modo=avulso` + mês)
- [x] Brainstorm auto-inicia conversa quando URL traz `mes`
- [x] Pós-save → Workspace aba **Ideia** (`clientCampaignIdeiaPageUrl` / `section=ideia`)
- [x] Sem tema imposto; FeedbackSidebar fica para PI-3

Nota: sobrescreve o landing D1 (tasks) **só** no caminho Brainstorm/Nova Campanha. Form/texto podem manter tasks até alinhamento explícito.

### PI-3 checklist

- [x] Brief: `resultado`, `aprendizado`, `feedbackCliente` (`finalizeFromBrief` / `briefPatchFromFinalize`)
- [x] Workspace Ideia → seção **Fechamento** (salva + evento em `historico`)
- [x] `FeedbackSidebar` no Brainstorm (últimas 3 com feedback)
- [x] Panorama Tendências continua lendo esses campos

### PI-4 checklist

- [x] Dialog Planejar Múltiplos (3–5 meses vazios)
- [x] Canvas de rascunho (título + conceito/ciclo opcionais)
- [x] Batch `Brief.create` com `linkedToBatch` + `status_campanha: planejada`
- [x] Panorama marca meses como 📝 planejado após save

### PI-5 checklist

- [x] Removidos: `NewCampaignLauncher`, `CampanhasAnualReview`, `TemasAnualPicker`, `materializeAnualMesToCycle`, `campanhaAnualIa`, `AnnualPlanSidebarBlock`
- [x] Hub / client-briefing / sidebar: CTAs → Panorama / Nova Campanha (`avulso`)
- [x] `/briefing-campanha-anual` permanece só como redirect
- [x] Schema/compat `campanha_anual` + briefing inicial mantidos (arquivo; sem editor rígido)
- [x] APIs `api/campanha-anual*` sem UI (legado)

Planejamento iterativo PI-0–5 concluído neste doc.
