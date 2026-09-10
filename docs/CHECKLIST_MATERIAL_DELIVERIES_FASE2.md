# Checklist — Fase 2 (Drive + Review API + UI)

## Já feito (Fase 1)

- [x] Script Appwrite rodado (`npm run appwrite:setup-material-deliveries`)
- [x] Tables `material_deliveries`, `material_delivery_versions`, `agency_drive_connections`
- [x] Patch `approval_requests` + `notifications`/`audit_logs`

## Configuração necessária (manual)

- [ ] Criar OAuth Client no Google Cloud (Drive API enabled)
- [ ] Preencher em `.env.local` / Vercel:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `GOOGLE_OAUTH_REDIRECT_URI` = `{API_ORIGIN}/api/material-deliveries?route=drive-callback`
  - `DRIVE_TOKEN_ENCRYPTION_KEY` (string forte ou 64 hex)
  - `APP_PUBLIC_URL` (ex. `http://localhost:5173`)
  - `APPWRITE_API_KEY` (já usado)
- [ ] No Google Console, adicionar o redirect URI autorizado
- [ ] Dev: `npx vercel dev --listen 3000` + `npm run dev` (Vite proxy `/api` → 3000)

## Smoke test

1. [ ] Configurações → Integrações → Conectar Google Drive
2. [ ] Delivery workspace → aba **Entregas** → Nova entrega
3. [ ] Copiar link `/review/{token}`
4. [ ] Enviar versão (JPG/PNG/PDF/MP4 ≤ 50MB)
5. [ ] Abrir link público → preview → solicitar alteração
6. [ ] Enviar V2 → mesmo link → aprovar
7. [ ] (Owner) Regenerar link / Reabrir aprovação

## Entregáveis de código

- [x] `api/material-deliveries.js`
- [x] `lib/server/material*.js` + `googleDrive.js`
- [x] UI settings Drive + workspace Entregas + `/review/:token`
