/**
 * Idempotent: adiciona clientVisible (boolean, default false) + índice em
 * tasks e briefs.
 * Uso: node scripts/appwrite-setup-client-visible.mjs
 * Requer APPWRITE_API_KEY + VITE_APPWRITE_* em .env.local
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Client, TablesDB, TablesDBIndexType } from 'node-appwrite';

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

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitColumn(tableId, key) {
  for (let i = 0; i < 40; i++) {
    const table = await tables.getTable({ databaseId: DATABASE_ID, tableId });
    const cols = table.columns || [];
    const col = cols.find((c) => c.key === key);
    if (col && (!col.status || col.status === 'available')) return;
    await sleep(400);
  }
  console.warn(`  coluna ${tableId}.${key} ainda processando`);
}

async function ensureClientVisible(tableId) {
  console.log(`Setup clientVisible em ${DATABASE_ID}.${tableId}`);

  try {
    await tables.createBooleanColumn({
      databaseId: DATABASE_ID,
      tableId,
      key: 'clientVisible',
      required: false,
      default: false,
    });
    await waitColumn(tableId, 'clientVisible');
    console.log('  coluna clientVisible criada (default false)');
  } catch (error) {
    if (isConflict(error)) {
      console.log('  coluna clientVisible já existe');
    } else {
      throw error;
    }
  }

  try {
    await tables.createIndex({
      databaseId: DATABASE_ID,
      tableId,
      key: 'idx_clientVisible',
      type: TablesDBIndexType.Key,
      columns: ['clientVisible'],
    });
    console.log('  índice idx_clientVisible criado');
  } catch (error) {
    if (isConflict(error)) {
      console.log('  índice idx_clientVisible já existe');
    } else {
      console.warn('  índice falhou:', error.message);
    }
  }
}

async function main() {
  await ensureClientVisible('tasks');
  await ensureClientVisible('briefs');
  console.log('OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
