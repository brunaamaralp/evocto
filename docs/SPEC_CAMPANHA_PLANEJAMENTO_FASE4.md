# Spec Fase 4 — Planejamento = porta única de criação

Status: **implementado**.

## Mudanças

1. **Landing pós-criar** → Workspace `section=tasks` (form/texto/brainstorm/`launchCampanhaFromBrief`).
2. **Plano anual** — mês sem campanha → **Brainstorm do mês**; mês materializado → **Abrir workspace**.
3. `buildClientCampaignHref` com `serviceId` → path do Workspace.
4. CTAs de sucesso em `/briefing-campanha` priorizam Workspace (auto-redirect quando há serviceId).

## Portas de criação (A2)

| Mantém | Remove / não usa |
|--------|------------------|
| Planejamento & briefs → Nova campanha | Hub create (Fase 3) |
| Plano anual → Brainstorm do mês | Materializar inline que landava fora do Workspace |
| Fluxos form/texto/brainstorm a partir do Planejamento | |

## Aceite

- [x] Create → Workspace tasks quando `serviceId` resolvido
- [x] Plano anual: não materializado → Brainstorm; materializado → Workspace
