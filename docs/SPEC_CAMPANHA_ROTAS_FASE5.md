# Spec Fase 5 — Podar rotas e nav (S1 / R2)

Status: **implementado**.

## Redirects (R2)

| Origem | Destino |
|--------|---------|
| `/client-campaign` | Workspace aba **Ideia** (`resolveServiceIdForCampaign`) |
| `/client-tasks?briefingId=` | Workspace aba **Tarefas** |
| `/client-tasks?clientId=` sem briefing | **permanece** (inbox T2) |

Página `client-campaign.jsx` virou redirect puro.

## Sidebar (S1)

- Modo cliente: Operação = Visão Geral + **Tarefas (inbox)** — sem Ficha / Tarefas da unidade.
- Modo serviço/workspace: **Workspace** + **Tarefas (inbox)** — sem Deliverables/service-detail no rail operacional.

## Aceite

- [x] Links legados de ficha/tarefas da campanha não 404
- [x] Inbox transversal intacto
- [x] Nav sem “segunda casa” de campanha
