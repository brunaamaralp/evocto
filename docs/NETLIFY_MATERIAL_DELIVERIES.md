# Provisionamento Appwrite + Netlify (Entregas)

O schema Appwrite **não roda dentro da Netlify** — roda via script local apontando
para o mesmo Appwrite Cloud usado pelo site.

## 1. Provisionar schema (já feito / reexecutar)

```bash
npm run appwrite:setup-material-deliveries
```

Requer no `.env.local`:
- `VITE_APPWRITE_ENDPOINT`
- `VITE_APPWRITE_PROJECT_ID`
- `VITE_APPWRITE_DATABASE_ID`
- `APPWRITE_API_KEY`

## 2. Variáveis no painel Netlify (Site settings → Environment variables)

| Variável | Obrigatória |
|----------|-------------|
| `VITE_APPWRITE_ENDPOINT` | sim |
| `VITE_APPWRITE_PROJECT_ID` | sim |
| `VITE_APPWRITE_DATABASE_ID` | sim |
| `VITE_APPWRITE_BUCKET_ID` | sim (`files`) |
| `APPWRITE_API_KEY` | sim (Functions) |
| `APP_PUBLIC_URL` | sim (URL do site Netlify, ex. `https://seu-site.netlify.app`) |
| `GOOGLE_CLIENT_ID` | para Drive |
| `GOOGLE_CLIENT_SECRET` | para Drive |
| `GOOGLE_OAUTH_REDIRECT_URI` | `https://SEU-SITE.netlify.app/api/material-deliveries?route=drive-callback` |
| `DRIVE_TOKEN_ENCRYPTION_KEY` | para Drive |

## 3. Deploy

```bash
# com Netlify CLI (após netlify login + netlify link)
npx netlify-cli deploy --prod
```

Ou push na branch conectada ao site.

## 4. API na Netlify

- Function: `netlify/functions/material-deliveries.mjs`
- Redirect: `/api/material-deliveries` → function (ver `netlify.toml`)

## 5. Dev local

```bash
npx netlify-cli dev
```

Serve Vite + Functions juntos (em geral porta 8888).
