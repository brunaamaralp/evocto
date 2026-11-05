/**
 * Idempotente: cria a tabela `projects` e adiciona a coluna `projectId`
 * (+ índice) em tasks, services e cycle_plans. briefs já tem a coluna;
 * só garante o índice.
 *
 * Rode ANTES de publicar o front que grava projectId como coluna tipada.
 * Depois rode a migração de dados: npm run appwrite:migrate-projects
 *
 * Uso: node scripts/appwrite-setup-projects.mjs
 * Requer APPWRITE_API_KEY + VITE_APPWRITE_* em .env.local
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Client, TablesDB, TablesDBIndexType, Permission, Role } from 'node-appwrite';

function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    const path = resolve(process.cwd(), file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

loadEnv();

const ENDPOINT = process.env.VITE_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.VITE_APPWRITE_PROJECT_ID;
const API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.VITE_APPWRITE_DATABASE_ID || 'evocto';

if (!ENDPOINT || !PROJECT_ID || !API_KEY) {
  console.error('Defina VITE_APPWRITE_ENDPOINT, VITE_APPWRITE_PROJECT_ID e APPWRITE_API_KEY');
  process.exit(1);
}

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
const tables = new TablesDB(client);

function isConflict(error) {
  return error?.code === 409 || String(error?.message || '').toLowerCase().includes('already exists');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitColumn(tableId, key) {
  for (let i = 0; i < 40; i++) {
    const table = await tables.getTable({ databaseId: DATABASE_ID, tableId });
    const col = (table.columns || []).find((c) => c.key === key);
    if (col && (!col.status || col.status === 'available')) return;
    await sleep(400);
  }
  console.warn(`  coluna ${tableId}.${key} ainda processando`);
}

async function ensureColumn(tableId, col) {
  try {
    if (col.type === 'boolean') {
      await tables.createBooleanColumn({
        databaseId: DATABASE_ID,
        tableId,
        key: col.key,
        required: false,
        default: col.default ?? null,
      });
    } else if (col.type === 'mediumtext') {
      await tables.createMediumtextColumn({
        databaseId: DATABASE_ID,
        tableId,
        key: col.key,
        required: false,
      });
    } else {
      await tables.createVarcharColumn({
        databaseId: DATABASE_ID,
        tableId,
        key: col.key,
        size: col.size || 255,
        required: false,
      });
    }
    await waitColumn(tableId, col.key);
    console.log(`  coluna ${tableId}.${col.key} criada`);
  } catch (error) {
    if (isConflict(error)) console.log(`  coluna ${tableId}.${col.key} já existe`);
    else throw error;
  }
}

async function ensureIndex(tableId, column) {
  try {
    await tables.createIndex({
      databaseId: DATABASE_ID,
      tableId,
      key: `idx_${column}`,
      type: TablesDBIndexType.Key,
      columns: [column],
    });
    console.log(`  índice ${tableId}.${column} criado`);
  } catch (error) {
    if (isConflict(error)) console.log(`  índice ${tableId}.${column} já existe`);
    else console.warn(`  índice ${tableId}.${column} falhou:`, error.message);
  }
}

const PROJECT_COLUMNS = [
  { key: 'agencyId', type: 'varchar', size: 36 },
  { key: 'clientId', type: 'varchar', size: 36 },
  { key: 'name', type: 'varchar', size: 255 },
  { key: 'status', type: 'varchar', size: 32 },
  { key: 'kind', type: 'varchar', size: 32 },
  { key: 'serviceId', type: 'varchar', size: 36 },
  { key: 'isDefault', type: 'boolean', default: false },
  { key: 'payload', type: 'mediumtext' },
];

async function main() {
  console.log(`Setup projects em ${DATABASE_ID}`);

  try {
    await tables.createTable({
      databaseId: DATABASE_ID,
      tableId: 'projects',
      name: 'Projects',
      permissions: [Permission.create(Role.users())],
      rowSecurity: true,
    });
    console.log('Tabela projects criada');
  } catch (error) {
    if (!isConflict(error)) throw error;
    console.log('Tabela projects já existe');
  }

  for (const col of PROJECT_COLUMNS) await ensureColumn('projects', col);
  for (const idx of ['agencyId', 'clientId', 'status', 'serviceId', 'isDefault']) {
    await ensureIndex('projects', idx);
  }

  for (const tableId of ['tasks', 'services', 'cycle_plans']) {
    await ensureColumn(tableId, { key: 'projectId', type: 'varchar', size: 36 });
    await ensureIndex(tableId, 'projectId');
  }
  await ensureIndex('briefs', 'projectId');

  console.log('OK — agora rode: npm run appwrite:migrate-projects (dry-run) e depois com -- --apply');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
