# Spec Fase 3 — Hub só operação

Status: **implementado**.  
Depende de A2 (criar só no Planejamento) + Fases 0–2.

## O que mudou

1. **`NewCampaignLauncher` removido do Hub** (`client-detail`) — zero create de campanha no Hub.
2. CTAs de lente `campaign_brief` → navegam para `/client-briefing?clientId=&serviceId=` (`buildPlanningCreateCampaignPath`).
3. Deep link `?open=nova-campanha` → Planejamento (não abre launcher).
4. Setup “criar primeira campanha” → **Ir ao Planejamento**.
5. Empty state campanha: copy “Crie no Planejamento…”.
6. Labels de perfil `ciclo_mensal_4_semanas` / `ciclo_narrativa_7_fases`: `Criar no Planejamento`.

## Mantido no Hub (não é create de campanha Brief)

- Criar unidade `unitKind: task` (`CreateServiceUnitModal`)
- Iniciar single_project
- Definir serviço / convite portal
- Banner do plano anual com links Brainstorm / Plano anual (entrada de Planejamento)

## Aceite

- [x] Nenhum `NewCampaignLauncher` montado em `client-detail`
- [x] Click “Criar no Planejamento” / empty / setup → `client-briefing`
- [x] Lista de unidades continua abrindo Workspace (Fase 2)
