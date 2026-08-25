# Evocto

Plataforma para times e agências de marketing (clientes, serviços, ciclos, tarefas e portal).

A Fase 1 usa **Appwrite Cloud** como backend (auth, TablesDB e Storage), com a mesma API de entidades do app (`create/get/update/delete/filter`).

## Setup

```bash
npm install
copy .env.example .env.local
```

1. Crie um projeto em [cloud.appwrite.io](https://cloud.appwrite.io).
2. Em **Settings → API credentials**, copie o Endpoint e o Project ID.
3. Crie uma API Key com escopos: `databases`, `tables`, `users`, `teams`, `storage`.
4. Em **Platforms**, adicione Web com hostname `localhost`.
5. Preencha `.env.local`:

```bash
VITE_BACKEND=appwrite
VITE_APPWRITE_ENDPOINT=https://<REGION>.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=
VITE_APPWRITE_DATABASE_ID=evocto
VITE_APPWRITE_BUCKET_ID=files
APPWRITE_API_KEY=
```

6. Provisionar database, tabelas e bucket:

```bash
npm run appwrite:setup
```

7. Rodar o app:

```bash
npm run dev
```

Abra `http://127.0.0.1:5173/welcome`, crie uma conta e entre em `/login`.

## Fase 1 — o que está no Appwrite

- Auth email/senha
- Tabelas: agencies, profiles, clients, services, tasks, cycle_plans, briefs, briefing_templates, approval_requests, invites
- Upload de arquivos (Storage)
- `createAgency` e `createServiceInstance`

Entidades e functions ainda não migradas falham de forma explícita (`not migrated yet`) ou devolvem lista vazia.

O client Base44 permanece em `src/api/base44Client.js` apenas como referência; o app usa Appwrite.

## Build

```bash
npm run build
```
