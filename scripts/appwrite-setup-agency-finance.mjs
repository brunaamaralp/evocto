/**
 * Provisiona tabelas do Financeiro Agência (opção B — billing enxuto).
 * Uso: node scripts/appwrite-setup-agency-finance.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
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

const TABLES = [
  {
    id: 'af_charges',
    name: 'Agency Charges',
    columns: [
      { key: 'agencyId', type: 'varchar', size: 64 },
      { key: 'clientId', type: 'varchar', size: 64 },
      { key: 'clientName', type: 'varchar', size: 255 },
      { key: 'serviceId', type: 'varchar', size: 64 },
      { key: 'type', type: 'varchar', size: 32 },
      { key: 'description', type: 'varchar', size: 512 },
      { key: 'amount', type: 'float' },
      { key: 'status', type: 'varchar', size: 32 },
      { key: 'dueDate', type: 'varchar', size: 10 },
      { key: 'competenceMonth', type: 'varchar', size: 7 },
      { key: 'paidAt', type: 'datetime' },
      { key: 'method', type: 'varchar', size: 32 },
      { key: 'cashId', type: 'varchar', size: 64 },
      { key: 'note', type: 'mediumtext' },
      { key: 'payload', type: 'mediumtext' },
    ],
    indexes: ['agencyId', 'clientId', 'status', 'competenceMonth', 'dueDate', 'type'],
  },
  {
    id: 'af_payables',
    name: 'Agency Payables',
    columns: [
      { key: 'agencyId', type: 'varchar', size: 64 },
      { key: 'vendorName', type: 'varchar', size: 255 },
      { key: 'category', type: 'varchar', size: 64 },
      { key: 'description', type: 'varchar', size: 512 },
      { key: 'amount', type: 'float' },
      { key: 'status', type: 'varchar', size: 32 },
      { key: 'dueDate', type: 'varchar', size: 10 },
      { key: 'competenceMonth', type: 'varchar', size: 7 },
      { key: 'paidAt', type: 'datetime' },
      { key: 'method', type: 'varchar', size: 32 },
      { key: 'cashId', type: 'varchar', size: 64 },
      { key: 'note', type: 'mediumtext' },
      { key: 'payload', type: 'mediumtext' },
    ],
    indexes: ['agencyId', 'status', 'competenceMonth', 'dueDate', 'category'],
  },
  {
    id: 'af_cash',
    name: 'Agency Cash',
    columns: [
      { key: 'agencyId', type: 'varchar', size: 64 },
      { key: 'direction', type: 'varchar', size: 8 },
      { key: 'amount', type: 'float' },
      { key: 'date', type: 'varchar', size: 10 },
      { key: 'competenceMonth', type: 'varchar', size: 7 },
      { key: 'category', type: 'varchar', size: 64 },
      { key: 'description', type: 'varchar', size: 512 },
      { key: 'method', type: 'varchar', size: 32 },
      { key: 'account', type: 'varchar', size: 64 },
      { key: 'status', type: 'varchar', size: 32 },
      { key: 'refType', type: 'varchar', size: 32 },
      { key: 'refId', type: 'varchar', size: 64 },
      { key: 'clientId', type: 'varchar', size: 64 },
      { key: 'note', type: 'mediumtext' },
      { key: 'payload', type: 'mediumtext' },
    ],
    indexes: ['agencyId', 'direction', 'status', 'competenceMonth', 'date', 'refType', 'clientId', 'category'],
  },
  {
    id: 'af_recurring',
    name: 'Agency Recurring Charges',
    columns: [
      { key: 'agencyId', type: 'varchar', size: 64 },
      { key: 'clientId', type: 'varchar', size: 64 },
      { key: 'clientName', type: 'varchar', size: 255 },
      { key: 'description', type: 'varchar', size: 512 },
      { key: 'amount', type: 'float' },
      { key: 'dueDay', type: 'integer' },
      { key: 'startMonth', type: 'varchar', size: 7 },
      { key: 'endMonth', type: 'varchar', size: 7 },
      { key: 'status', type: 'varchar', size: 32 },
      { key: 'type', type: 'varchar', size: 32 },
      { key: 'note', type: 'mediumtext' },
      { key: 'payload', type: 'mediumtext' },
    ],
    indexes: ['agencyId', 'clientId', 'status', 'startMonth'],
  },
];

const ENV_MAP = {
  af_charges: 'VITE_APPWRITE_AF_CHARGES_COLLECTION_ID',
  af_payables: 'VITE_APPWRITE_AF_PAYABLES_COLLECTION_ID',
  af_cash: 'VITE_APPWRITE_AF_CASH_COLLECTION_ID',
  af_recurring: 'VITE_APPWRITE_AF_RECURRING_COLLECTION_ID',
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
    if (col.type === 'boolean') {
      await tables.createBooleanColumn({ databaseId: DATABASE_ID, tableId, key: col.key, required: false });
    } else if (col.type === 'datetime') {
      await tables.createDatetimeColumn({ databaseId: DATABASE_ID, tableId, key: col.key, required: false });
    } else if (col.type === 'float') {
      await tables.createFloatColumn({ databaseId: DATABASE_ID, tableId, key: col.key, required: false });
    } else if (col.type === 'integer') {
      await tables.createIntegerColumn({ databaseId: DATABASE_ID, tableId, key: col.key, required: false });
    } else if (col.type === 'mediumtext') {
      await tables.createMediumtextColumn({ databaseId: DATABASE_ID, tableId, key: col.key, required: false });
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

function upsertEnvLocal(vars) {
  const path = resolve(process.cwd(), '.env.local');
  let text = existsSync(path) ? readFileSync(path, 'utf8') : '';
  const lines = text.split(/\r?\n/);
  for (const [key, value] of Object.entries(vars)) {
    const idx = lines.findIndex((l) => l.trim().startsWith(`${key}=`));
    const next = `${key}=${value}`;
    if (idx >= 0) lines[idx] = next;
    else lines.push(next);
  }
  writeFileSync(path, `${lines.filter((l, i) => !(i === lines.length - 1 && l === '')).join('\n')}\n`, 'utf8');
}

async function main() {
  console.log(`Agency finance → ${DATABASE_ID}`);
  for (const table of TABLES) {
    try {
      await tables.createTable({
        databaseId: DATABASE_ID,
        tableId: table.id,
        name: table.name,
        permissions: tablePerms,
        rowSecurity: true,
      });
      console.log(`\nTabela ${table.id} criada`);
    } catch (error) {
      if (!isConflict(error)) throw error;
      console.log(`\nTabela ${table.id} já existe`);
    }
    for (const col of table.columns) await createColumn(table.id, col);
    for (const idx of table.indexes) await createIndex(table.id, idx);
  }

  upsertEnvLocal(
    Object.fromEntries(Object.entries(ENV_MAP).map(([tableId, envKey]) => [envKey, tableId]))
  );
  console.log('\nSetup agency finance concluído.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
