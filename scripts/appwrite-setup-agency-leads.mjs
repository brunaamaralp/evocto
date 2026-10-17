/**
 * Provisiona tabela agency_leads (CRM leve — SPEC_CONTROLE_AGENCIA P2.1).
 * Uso: node scripts/appwrite-setup-agency-leads.mjs
 *      npm run appwrite:setup-agency-leads
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  Client,
  TablesDB,
  Permission,
  Role,
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
  console.error('Defina VITE_APPWRITE_* e APPWRITE_API_KEY em .env.local');
  process.exit(1);
}

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
const tables = new TablesDB(client);
const tablePerms = [Permission.create(Role.users())];

const TABLE = {
  id: 'agency_leads',
  name: 'Agency Leads',
  columns: [
    { key: 'agencyId', type: 'varchar', size: 64 },
    { key: 'name', type: 'varchar', size: 255 },
    { key: 'email', type: 'varchar', size: 320 },
    { key: 'phone', type: 'varchar', size: 64 },
    { key: 'status', type: 'varchar', size: 32 },
    { key: 'convertedClientId', type: 'varchar', size: 64 },
    { key: 'payload', type: 'mediumtext' },
  ],
  indexes: ['agencyId', 'status', 'convertedClientId', 'email'],
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

async function createIndex(tableId, column) {
  try {
    await tables.createIndex({
      databaseId: DATABASE_ID,
      tableId,
      key: `idx_${column}`.slice(0, 36),
      type: TablesDBIndexType.Key,
      columns: [column],
    });
    console.log(`  índice ${column}`);
  } catch (error) {
    if (isConflict(error)) {
      console.log(`  índice ${column} (já existe)`);
      return;
    }
    console.warn(`  índice ${column} falhou:`, error.message);
  }
}

async function main() {
  console.log(`Agency leads → ${DATABASE_ID}`);
  try {
    await tables.createTable({
      databaseId: DATABASE_ID,
      tableId: TABLE.id,
      name: TABLE.name,
      permissions: tablePerms,
      rowSecurity: true,
    });
    console.log(`\nTabela ${TABLE.id} criada`);
  } catch (error) {
    if (!isConflict(error)) throw error;
    console.log(`\nTabela ${TABLE.id} já existe`);
  }

  for (const col of TABLE.columns) await createColumn(TABLE.id, col);
  for (const idx of TABLE.indexes) await createIndex(TABLE.id, idx);

  console.log('\nSetup agency_leads concluído.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
