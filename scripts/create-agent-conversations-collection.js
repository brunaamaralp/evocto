/**
 * Cria a table agentConversations no Appwrite.
 * Uso: node scripts/create-agent-conversations-collection.js
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

const ENDPOINT = process.env.VITE_APPWRITE_ENDPOINT || process.env.APPWRITE_ENDPOINT;
const PROJECT_ID =
  process.env.VITE_APPWRITE_PROJECT_ID || process.env.APPWRITE_PROJECT_ID;
const API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID =
  process.env.VITE_APPWRITE_DATABASE_ID || process.env.APPWRITE_DATABASE_ID;

if (!ENDPOINT || !PROJECT_ID || !API_KEY || !DATABASE_ID) {
  console.error('Defina VITE_APPWRITE_* e APPWRITE_API_KEY em .env.local');
  process.exit(1);
}

const TABLE_ID = 'agentConversations';
const tables = new TablesDB(
  new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY)
);

const COLUMNS = [
  { key: 'empresa_id', type: 'varchar', size: 36, required: true },
  { key: 'empresa_nome', type: 'varchar', size: 255, required: false },
  { key: 'mes', type: 'integer', required: true, min: 1, max: 12 },
  { key: 'ano', type: 'integer', required: true },
  { key: 'status', type: 'varchar', size: 32, required: false },
  { key: 'titulo', type: 'varchar', size: 255, required: false },
  { key: 'ciclo_comercial', type: 'varchar', size: 64, required: false },
  { key: 'historico_mensagens', type: 'mediumtext', required: false },
  { key: 'contexto_carregado', type: 'mediumtext', required: false },
  { key: 'brief_id', type: 'varchar', size: 36, required: false },
  { key: 'cycle_id', type: 'varchar', size: 36, required: false },
  { key: 'criado_em', type: 'datetime', required: false },
  { key: 'atualizado_em', type: 'datetime', required: false },
  { key: 'finalizado_em', type: 'datetime', required: false },
];

const INDEXES = [
  { key: 'idx_empresa_id', columns: ['empresa_id'], type: 'key' },
  { key: 'idx_empresa_nome', columns: ['empresa_nome'], type: 'key' },
  { key: 'idx_status', columns: ['status'], type: 'key' },
  { key: 'idx_empresa_status', columns: ['empresa_id', 'status'], type: 'key' },
];

function isConflict(error) {
  return (
    error?.code === 409 ||
    String(error?.message || '')
      .toLowerCase()
      .includes('already exists')
  );
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitColumn(key) {
  for (let i = 0; i < 40; i++) {
    const table = await tables.getTable({ databaseId: DATABASE_ID, tableId: TABLE_ID });
    const col = (table.columns || []).find((c) => c.key === key);
    if (col && (!col.status || col.status === 'available')) return;
    await sleep(400);
  }
}

async function waitIndex(key) {
  for (let i = 0; i < 40; i++) {
    const table = await tables.getTable({ databaseId: DATABASE_ID, tableId: TABLE_ID });
    const idx = (table.indexes || []).find((x) => x.key === key);
    if (idx && (!idx.status || idx.status === 'available')) return;
    await sleep(400);
  }
}

async function createColumn(col) {
  const base = {
    databaseId: DATABASE_ID,
    tableId: TABLE_ID,
    key: col.key,
    required: Boolean(col.required),
  };
  try {
    if (col.type === 'integer') {
      await tables.createIntegerColumn({ ...base, min: col.min, max: col.max });
    } else if (col.type === 'datetime') {
      await tables.createDatetimeColumn(base);
    } else if (col.type === 'mediumtext') {
      await tables.createMediumtextColumn(base);
    } else {
      await tables.createVarcharColumn({ ...base, size: col.size || 255 });
    }
    await waitColumn(col.key);
    console.log(`  ✓ ${col.key}`);
  } catch (error) {
    if (isConflict(error)) {
      console.log(`  · ${col.key} (já existe)`);
      return;
    }
    throw error;
  }
}

async function createIndex(index) {
  const key = index.key.slice(0, 36);
  try {
    await tables.createIndex({
      databaseId: DATABASE_ID,
      tableId: TABLE_ID,
      key,
      type: index.type === 'unique' ? TablesDBIndexType.Unique : TablesDBIndexType.Key,
      columns: index.columns,
    });
    await waitIndex(key);
    console.log(`  ✓ índice ${index.key}`);
  } catch (error) {
    if (isConflict(error)) {
      console.log(`  · índice ${index.key} (já existe)`);
      return;
    }
    throw error;
  }
}

async function main() {
  console.log(`\nagentConversations → ${ENDPOINT} / ${DATABASE_ID}\n`);
  try {
    await tables.createTable({
      databaseId: DATABASE_ID,
      tableId: TABLE_ID,
      name: 'Agent Conversations',
      permissions: [Permission.create(Role.users())],
      rowSecurity: true,
    });
    console.log(`Tabela ${TABLE_ID} criada`);
  } catch (error) {
    if (!isConflict(error)) throw error;
    console.log(`Tabela ${TABLE_ID} já existe`);
  }

  console.log('\nColunas:');
  for (const col of COLUMNS) await createColumn(col);
  console.log('\nÍndices:');
  for (const idx of INDEXES) await createIndex(idx);

  console.log('\n✅ Sucesso: agentConversations pronta.\n');
}

main().catch((err) => {
  console.error('❌', err?.message || err);
  process.exit(1);
});
