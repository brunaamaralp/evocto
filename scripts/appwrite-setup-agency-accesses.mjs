/**
 * Provisiona tabela agency_accesses (credenciais da agência, server-only).
 *
 * Uso: node scripts/appwrite-setup-agency-accesses.mjs
 * Requer APPWRITE_API_KEY + VITE_APPWRITE_* em .env.local
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  Client,
  TablesDB,
  TablesDBIndexType,
} from 'node-appwrite';

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
const DATABASE_ID = process.env.VITE_APPWRITE_DATABASE_ID;

if (!ENDPOINT || !PROJECT_ID || !API_KEY || !DATABASE_ID) {
  console.error(
    'Defina VITE_APPWRITE_ENDPOINT, VITE_APPWRITE_PROJECT_ID, VITE_APPWRITE_DATABASE_ID e APPWRITE_API_KEY'
  );
  process.exit(1);
}

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
const tables = new TablesDB(client);

const TABLE = {
  id: 'agency_accesses',
  name: 'Agency Accesses',
  permissions: [], // server-only via API key
  columns: [
    { key: 'agencyId', type: 'varchar', size: 36 },
    { key: 'platform', type: 'varchar', size: 255 },
    { key: 'url', type: 'varchar', size: 512 },
    { key: 'username', type: 'varchar', size: 255 },
    { key: 'encryptedPassword', type: 'mediumtext' },
    { key: 'notes', type: 'mediumtext' },
    { key: 'createdBy', type: 'varchar', size: 64 },
  ],
  indexes: [
    { key: 'idx_agencyId', columns: ['agencyId'], type: 'key' },
  ],
};

function isConflict(error) {
  return error?.code === 409 || String(error?.message || '').toLowerCase().includes('already exists');
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitColumn(tableId, key) {
  for (let i = 0; i < 40; i++) {
    const table = await tables.getTable({ databaseId: DATABASE_ID, tableId });
    const col = (table.columns || []).find((c) => c.key === key);
    if (col && (!col.status || col.status === 'available')) return;
    await sleep(400);
  }
  console.warn(`  coluna ${tableId}.${key} ainda processando`);
}

async function waitIndex(tableId, key) {
  for (let i = 0; i < 40; i++) {
    const table = await tables.getTable({ databaseId: DATABASE_ID, tableId });
    const idx = (table.indexes || []).find((x) => x.key === key);
    if (idx && (!idx.status || idx.status === 'available')) return;
    await sleep(400);
  }
  console.warn(`  índice ${tableId}.${key} ainda processando`);
}

async function createColumn(tableId, col) {
  try {
    if (col.type === 'mediumtext') {
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
    console.log(`  coluna ${col.key}`);
  } catch (error) {
    if (isConflict(error)) {
      console.log(`  coluna ${col.key} (já existe)`);
      return;
    }
    throw error;
  }
}

async function createIndex(tableId, index) {
  const type =
    index.type === 'unique' ? TablesDBIndexType.Unique : TablesDBIndexType.Key;
  try {
    await tables.createIndex({
      databaseId: DATABASE_ID,
      tableId,
      key: index.key.slice(0, 36),
      type,
      columns: index.columns,
    });
    await waitIndex(tableId, index.key.slice(0, 36));
    console.log(`  índice ${index.key}`);
  } catch (error) {
    if (isConflict(error)) {
      console.log(`  índice ${index.key} (já existe)`);
      return;
    }
    throw error;
  }
}

async function main() {
  console.log('→ agency_accesses');
  try {
    await tables.createTable({
      databaseId: DATABASE_ID,
      tableId: TABLE.id,
      name: TABLE.name,
      permissions: TABLE.permissions,
      rowSecurity: false,
    });
    console.log('  tabela criada');
  } catch (error) {
    if (isConflict(error)) {
      console.log('  tabela já existe');
    } else {
      throw error;
    }
  }

  for (const col of TABLE.columns) {
    await createColumn(TABLE.id, col);
  }
  for (const index of TABLE.indexes) {
    await createIndex(TABLE.id, index);
  }
  console.log('OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
