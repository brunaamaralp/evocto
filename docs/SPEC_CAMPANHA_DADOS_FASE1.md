# Spec Fase 1 — Modelo de dados (Ideia / Campanha)

Status: **implementado como camada de normalização** (`src/lib/campanhaIdeia.js`).  
Sem migração destrutiva de Appwrite. Sem UI nova (Fase 2+).

Complementa: `docs/SPEC_CAMPANHA_ROTAS_FASE0.md`

---

## 1. Decisão de storage

| Camada | Valor |
|--------|--------|
| Documento | Continua sendo `Brief` |
| `brief_kind` (DB) | **`campanha_mensal`** (legado estável) |
| `ux_kind` (produto) | **`campanha`** — label UI: **Ideia** / campanha do mês |
| Proibido na UX | “Briefing mensal”, “ficha” como home |

**Não** removemos `campanha_mensal` nesta fase. Remoção/renomeação de kind = migração futura (pós Fase 2–5), com script dedicado.

`campaignId` (Fase 0) ≡ `Brief.id` desse documento.

---

## 2. O que é a **Ideia** (aba Workspace)

Campos de produto (canônicos):

| Campo Ideia | Significado | Fonte legada (leitura) |
|-------------|-------------|-------------------------|
| `titulo` | Nome na lista / Hub | `nome_campanha` → `title` → `02_conceito.nome` |
| `conceito` | Ideia narrativa | `objetivo` / `objectives` → `02_conceito.ideia_central` |
| `mecanismo` | Como a campanha opera | `acoes_comerciais` / `business_context` |
| `foco` | Produto / linha focal | `linha_focal` / `produto_focal` |
| `ciclo` | Ciclo comercial | `ciclo_final` → `ciclo_comercial` → `ciclo_plano` |

Escrita (`briefPatchFromIdeia`): grava **nested `ideia`** + **flat legado** (mesmos campos) para leitores antigos (`client-campaign`, materialize, launch).

---

## 3. O que NÃO é Ideia (mesmo documento)

Slice **`operacao`** — ainda no Brief, uso operacional / produção:

- `talento_locacao`, `data_gravacao_inicio`, `data_gravacao_fim`
- `tipo_campanha`, `publico_alvo`, `tom_brand`, `orcamento`, `formato`

CyclePlan / Tasks:

- `ciclo_id` / `cycleId` / `cyclePlanId` → execução e kanban
- Tasks com `briefingId` / `campaignId` = este Brief.id

Briefing do **Serviço** (aba Contexto):

- **Não** mora neste documento; referência via `clientId` + Planejamento (`briefing_inicial` / empresa).

Histórico:

- Array `historico` no Brief (já existente) → aba Histórico na Fase 2.

---

## 4. API da camada (`campanhaIdeia.js`)

| Função | Uso |
|--------|-----|
| `isCampanhaUnitBrief(brief)` | Detecta unidade de campanha |
| `ideiaFromBrief(brief)` | Lê Ideia (nested ou flat) |
| `operacaoFromBrief(brief)` | Lê slice operacional |
| `normalizeCampanhaUnit(brief)` | View Hub/Workspace |
| `briefPatchFromIdeia(ideia)` | Patch de update |
| `mergeIdeiaIntoCampanhaForm(form, ideia)` | Create path legado |
| `attachIdeiaToCampanhaPayload(payload)` | Enrich create payload |
| `getCampanhaCycleId(brief)` | Link CyclePlan |

Create path: `buildCampanhaBriefPayload` passa a anexar `ideia` + `ux_kind` via `attachIdeiaToCampanhaPayload`.

---

## 5. Compatibilidade / migração

| Caso | Comportamento |
|------|----------------|
| Brief antigo só flat | `ideiaFromBrief` preenche Ideia; UI nova funciona |
| Brief novo | Flat + `ideia` nested + `ux_kind` |
| Update pela aba Ideia (Fase 2) | `briefPatchFromIdeia` mantém flat sincronizado |
| `campanha_anual` / `briefing_inicial` | Fora deste módulo (`brief_kind` distinto) |

**Não há** job de rewrite em massa na Fase 1. Normalização é **lazy** na leitura.

---

## 6. Critério de aceite Fase 1

- [x] Spec deste arquivo
- [x] Helpers + testes (`campanhaIdeia.test.js`)
- [x] Create path grava `ideia` nested sem quebrar validate/form legado
- [ ] (Fase 2) Workspace lê `normalizeCampanhaUnit` na aba Ideia
- [ ] (Futuro) Migração opcional renomeando kind / dropar label mensal no DB

---

## 7. Diagrama

```
Brief (campanha_mensal)
├─ ideia { titulo, conceito, mecanismo, foco, ciclo }  ← aba Ideia
├─ operacao (talento, datas, tipo, …)                  ← apoio produção
├─ ciclo_id → CyclePlan + Tasks                        ← aba Tarefas
├─ historico[]                                         ← aba Histórico
└─ clientId → Briefing do Serviço                      ← aba Contexto (ref)
```
