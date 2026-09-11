# Spec Fase 2 — Workspace como casa da campanha

Status: **implementado (UI mínima)**.  
Depende de Fase 0 (rotas) + Fase 1 (Ideia).

## O que entrou

1. **Modo campanha** em `/delivery-workspace` quando há `campaignId` / `briefingId`:
   - Nav: Contexto · Ideia · Tarefas · Histórico
   - Default: Tarefas (D1)
2. **Abas**
   - **Contexto** — referência + links para Planejamento / briefing do serviço
   - **Ideia** — edição completa (`briefPatchFromIdeia`)
   - **Tarefas** — Kanban (Planejamento → Roteiros → Produção → Revisão → Publicação), escopo `filterTasksByScope`
   - **Histórico** — array `historico` do Brief
3. **Hub** — click na unidade de campanha → `buildCampaignWorkspaceTasksPath` (`deriveServiceLens`)
4. Modo **serviço** (sem campaignId) mantém nav legada de entrega

## Arquivos principais

- `src/pages/delivery-workspace.jsx`
- `src/components/deliveryWorkspace/CampaignWorkspace*.jsx`
- `src/lib/deriveServiceLens.js` (href das unidades)

## Fora desta fase (3–5)

- Remover “Nova campanha” do Hub
- Redirects de `/client-campaign` e `client-tasks?briefingId=`
- Sidebar S1 completa
- Criação só no Planejamento / landings pós-create
- Drag-and-drop no Kanban / criar tarefa inline no Workspace

## Aceite

- [x] Abrir Workspace com `?serviceId&campaignId&section=tasks` mostra Kanban da campanha
- [x] Aba Ideia salva nested + flat
- [x] Hub unit.href aponta para Workspace (tasks)
- [x] Sem campaignId, Workspace serviço inalterado
