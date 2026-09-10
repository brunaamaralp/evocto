/**
 * Cria a table/collection feedback_ciclos no Appwrite.
 *
 * Uso: node scripts/create-feedback-collection.js
 * Requer APPWRITE_API_KEY + VITE_APPWRITE_* em .env.local
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
  process.env.VITE_APPWRITE_DATABASE_ID || process.env.APPWRITE_DATABASE_ID || 'evocto';

if (!ENDPOINT || !PROJECT_ID || !API_KEY) {
  console.error(
    'Defina VITE_APPWRITE_ENDPOINT, VITE_APPWRITE_PROJECT_ID e APPWRITE_API_KEY em .env.local'
  );
  process.exit(1);
}

const TABLE_ID = 'feedback_ciclos';
const TABLE_NAME = 'Feedback Ciclos';

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
const tables = new TablesDB(client);

const COLUMNS = [
  { key: 'cycle_id', type: 'varchar', size: 36, required: true },
  { key: 'empresa_id', type: 'varchar', size: 36, required: true },
  { key: 'mes', type: 'integer', required: true, min: 1, max: 12 },
  { key: 'ano', type: 'integer', required: true },

  { key: 'vendas_realizado', type: 'float', required: false },
  { key: 'engajamento_realizado', type: 'float', required: false },
  { key: 'conversoes', type: 'float', required: false },
  { key: 'alcance', type: 'float', required: false },

  { key: 'o_que_funcionou', type: 'mediumtext', required: false },
  { key: 'o_que_nao_funcionou', type: 'mediumtext', required: false },
  { key: 'aprendizados', type: 'mediumtext', required: false },
  { key: 'nota_geral', type: 'integer', required: false, min: 1, max: 10 },

  { key: 'notas_criativas', type: 'mediumtext', required: false },
  { key: 'notas_producao', type: 'mediumtext', required: false },
  { key: 'recomendacoes_proxima', type: 'mediumtext', required: false },

  { key: 'criado_em', type: 'datetime', required: false },
  { key: 'atualizado_em', type: 'datetime', required: false },
];

const INDEXES = [
  { key: 'idx_cycle_id', columns: ['cycle_id'], type: 'unique' },
  { key: 'idx_empresa_id', columns: ['empresa_id'], type: 'key' },
  { key: 'idx_empresa_mes', columns: ['empresa_id', 'mes'], type: 'key' },
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
  console.warn(`  coluna ${TABLE_ID}.${key} ainda processando`);
}

async function waitIndex(key) {
  for (let i = 0; i < 40; i++) {
    const table = await tables.getTable({ databaseId: DATABASE_ID, tableId: TABLE_ID });
    const idx = (table.indexes || []).find((x) => x.key === key);
    if (idx && (!idx.status || idx.status === 'available')) return;
    await sleep(400);
  }
  console.warn(`  índice ${TABLE_ID}.${key} ainda processando`);
}

async function createColumn(col) {
  const base = {
    databaseId: DATABASE_ID,
    tableId: TABLE_ID,
    key: col.key,
    required: Boolean(col.required),
  };

  try {
    if (col.type === 'boolean') {
      await tables.createBooleanColumn(base);
    } else if (col.type === 'datetime') {
      await tables.createDatetimeColumn(base);
    } else if (col.type === 'integer') {
      await tables.createIntegerColumn({
        ...base,
        min: col.min,
        max: col.max,
      });
    } else if (col.type === 'float') {
      await tables.createFloatColumn(base);
    } else if (col.type === 'mediumtext') {
      await tables.createMediumtextColumn(base);
    } else {
      await tables.createVarcharColumn({
        ...base,
        size: col.size || 255,
      });
    }
    await waitColumn(col.key);
    console.log(`  ✓ coluna ${col.key} (${col.type}${col.required ? ', required' : ''})`);
  } catch (error) {
    if (isConflict(error)) {
      console.log(`  · coluna ${col.key} (já existe)`);
      return;
    }
    throw error;
  }
}

async function createIndex(index) {
  const key = index.key.slice(0, 36);
  const type =
    index.type === 'unique' ? TablesDBIndexType.Unique : TablesDBIndexType.Key;
  try {
    await tables.createIndex({
      databaseId: DATABASE_ID,
      tableId: TABLE_ID,
      key,
      type,
      columns: index.columns,
    });
    await waitIndex(key);
    console.log(`  ✓ índice ${index.key} (${index.type})`);
  } catch (error) {
    if (isConflict(error)) {
      console.log(`  · índice ${index.key} (já existe)`);
      return;
    }
    throw error;
  }
}

async function main() {
  console.log(`\nfeedback_ciclos → ${ENDPOINT}`);
  console.log(`project=${PROJECT_ID} db=${DATABASE_ID}\n`);

  try {
    await tables.createTable({
      databaseId: DATABASE_ID,
      tableId: TABLE_ID,
      name: TABLE_NAME,
      permissions: [Permission.create(Role.users())],
      rowSecurity: true,
    });
    console.log(`Tabela ${TABLE_ID} criada`);
  } catch (error) {
    if (!isConflict(error)) throw error;
    console.log(`Tabela ${TABLE_ID} já existe — sincronizando atributos`);
  }

  console.log('\nAtributos:');
  for (const col of COLUMNS) {
    await createColumn(col);
  }

  console.log('\nÍndices:');
  for (const idx of INDEXES) {
    await createIndex(idx);
  }

  console.log('\n✅ Sucesso: collection/table feedback_ciclos pronta.');
  console.log('   Índices: cycle_id (unique), empresa_id, empresa_id+mes\n');
}

main().catch((error) => {
  console.error('\n❌ Falha ao criar feedback_ciclos:', error?.message || error);
  process.exit(1);
});
