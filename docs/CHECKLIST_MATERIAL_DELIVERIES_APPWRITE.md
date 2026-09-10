# Checklist — Provisionamento Appwrite (Entregas e Aprovações)

**Status:** provisionado em 2026-09-10 via `npm run appwrite:setup-material-deliveries`  
**Projeto:** `6a7f84d80020372c33db` · **Database:** `6a8ceeb000349382bf83`

## Pré-requisitos

- [x] `.env.local` com endpoint / project / database / API key
- [x] Database `evocto` existente

## Executar

```bash
npm run appwrite:setup-material-deliveries
```

Script idempotente: `scripts/appwrite-setup-material-deliveries.mjs`

## Tables novas

- [x] `material_deliveries` — colunas + índices
- [x] `material_delivery_versions` — colunas + unique(deliveryId, versionNumber) + unique(idempotencyKey)
- [x] `agency_drive_connections` — OAuth Drive (**server-only**, sem perms de `users`)

## Tables de suporte

- [x] `notifications` (já existia; permissões sincronizadas)
- [x] `audit_logs` (já existia; permissões sincronizadas)

## Alterações em `approval_requests`

- [x] `contentType`, `contentId`, `serviceId`, `expiresAt`
- [x] Índices `idx_contentType`, `idx_contentId`, `idx_serviceId`
- [ ] Contrato de app: coluna `token` guarda **hash** do token público (implementação backend — fase seguinte)

## Código do app

- [x] `TABLE_MAP` / `TABLE_COLUMNS` / `INTEGER_COLUMNS` / datetimes
- [x] Entities: `MaterialDelivery`, `MaterialDeliveryVersion`, `AgencyDriveConnection`
- [x] `entityAdapter` coerce integers
- [x] npm script `appwrite:setup-material-deliveries`

## Validação manual sugerida (Console)

- [ ] Abrir as 3 tables novas no Console e conferir colunas
- [ ] Confirmar `agency_drive_connections` sem `create/read("users")`
- [ ] Smoke: criar e apagar 1 row de teste em `material_deliveries`

## Próximas fases (não feito)

- [ ] OAuth Google Drive + `DRIVE_TOKEN_ENCRYPTION_KEY`
- [ ] Endpoints `/api/review/{token}` (+ file/approve/changes)
- [ ] UI delivery workspace + página pública
- [ ] Soft-delete / reopen / regenerate token no produto
