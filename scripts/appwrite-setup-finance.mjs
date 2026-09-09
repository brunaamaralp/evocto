/**
 * Provisiona tabelas financeiras no Appwrite (TablesDB).
 * Uso: node scripts/appwrite-setup-finance.mjs
 * Requer APPWRITE_API_KEY + VITE_APPWRITE_* em .env.local
 *
 * Tabelas:
 * - financial_tx      → lançamentos / caixa
 * - client_billings   → cobranças de serviço (ex-student_payments)
 * - finance_accounts  → plano de contas
 * - finance_journal   → razão / diário
 * - bank_statements / bank_statement_items → conciliação
 * - financial_audit_log
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
let DATABASE_ID = process.env.VITE_APPWRITE_DATABASE_ID || 'evocto';

if (!ENDPOINT || !PROJECT_ID || !API_KEY) {
  console.error('Defina VITE_APPWRITE_ENDPOINT, VITE_APPWRITE_PROJECT_ID e APPWRITE_API_KEY em .env.local');
  process.exit(1);
}

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
const tables = new TablesDB(client);
const tablePerms = [Permission.create(Role.users())];

const TABLES = [
  {
    id: 'financial_tx',
    name: 'Financial Transactions',
    columns: [
      { key: 'academyId', type: 'varchar', size: 64 },
      { key: 'agencyId', type: 'varchar', size: 64 },
      { key: 'saleId', type: 'varchar', size: 64 },
      { key: 'lead_id', type: 'varchar', size: 64 },
      { key: 'client_id', type: 'varchar', size: 64 },
      { key: 'method', type: 'varchar', size: 32 },
      { key: 'installments', type: 'integer' },
      { key: 'type', type: 'varchar', size: 16 },
      { key: 'planName', type: 'varchar', size: 128 },
      { key: 'gross', type: 'float' },
      { key: 'fee', type: 'float' },
      { key: 'net', type: 'float' },
      { key: 'amount', type: 'float' },
      { key: 'status', type: 'varchar', size: 32 },
      { key: 'settledAt', type: 'datetime' },
      { key: 'date', type: 'varchar', size: 10 },
      { key: 'competence_month', type: 'varchar', size: 7 },
      { key: 'direction', type: 'varchar', size: 8 },
      { key: 'category', type: 'varchar', size: 128 },
      { key: 'account', type: 'varchar', size: 128 },
      { key: 'bank_account', type: 'varchar', size: 128 },
      { key: 'description', type: 'varchar', size: 512 },
      { key: 'note', type: 'mediumtext' },
      { key: 'origin', type: 'varchar', size: 64 },
      { key: 'origin_type', type: 'varchar', size: 64 },
      { key: 'origin_id', type: 'varchar', size: 64 },
      { key: 'reverses_id', type: 'varchar', size: 64 },
      { key: 'billing_id', type: 'varchar', size: 64 },
      { key: 'created_by', type: 'varchar', size: 64 },
      { key: 'updated_by', type: 'varchar', size: 64 },
      { key: 'updated_at', type: 'datetime' },
      { key: 'recurrence_origin_id', type: 'varchar', size: 64 },
      { key: 'recurrence_type', type: 'varchar', size: 16 },
      { key: 'recurrence_day', type: 'integer' },
      { key: 'recurrence_end', type: 'varchar', size: 7 },
      { key: 'is_recurrence_template', type: 'boolean' },
      { key: 'reconciled', type: 'boolean' },
      { key: 'reconciled_at', type: 'datetime' },
      { key: 'reconciled_by', type: 'varchar', size: 64 },
      { key: 'bank_statement_id', type: 'varchar', size: 64 },
      { key: 'due_date', type: 'varchar', size: 10 },
      { key: 'expected_settlement_at', type: 'datetime' },
      { key: 'ledger_regime', type: 'varchar', size: 16 },
      { key: 'gateway_provider', type: 'varchar', size: 32 },
      { key: 'gateway_charge_id', type: 'varchar', size: 128 },
      { key: 'payload', type: 'mediumtext' },
    ],
    indexes: ['academyId', 'agencyId', 'lead_id', 'client_id', 'status', 'competence_month', 'direction', 'category', 'date', 'origin_id', 'billing_id'],
  },
  {
    id: 'client_billings',
    name: 'Client Billings',
    columns: [
      { key: 'academy_id', type: 'varchar', size: 64 },
      { key: 'agencyId', type: 'varchar', size: 64 },
      { key: 'lead_id', type: 'varchar', size: 64 },
      { key: 'client_id', type: 'varchar', size: 64 },
      { key: 'amount', type: 'float' },
      { key: 'paid_amount', type: 'float' },
      { key: 'expected_amount', type: 'float' },
      { key: 'method', type: 'varchar', size: 32 },
      { key: 'account', type: 'varchar', size: 128 },
      { key: 'plan_name', type: 'varchar', size: 128 },
      { key: 'status', type: 'varchar', size: 32 },
      { key: 'reference_month', type: 'varchar', size: 7 },
      { key: 'due_date', type: 'varchar', size: 10 },
      { key: 'paid_at', type: 'datetime' },
      { key: 'issued_at', type: 'datetime' },
      { key: 'registered_by', type: 'varchar', size: 64 },
      { key: 'registered_by_name', type: 'varchar', size: 128 },
      { key: 'note', type: 'mediumtext' },
      { key: 'payment_category', type: 'varchar', size: 32 },
      { key: 'bundle_months', type: 'integer' },
      { key: 'bundle_origin_id', type: 'varchar', size: 64 },
      { key: 'financial_tx_id', type: 'varchar', size: 64 },
      { key: 'financial_tx_sync_pending', type: 'boolean' },
      { key: 'installments', type: 'integer' },
      { key: 'troco', type: 'float' },
      { key: 'forma_troco', type: 'varchar', size: 32 },
      { key: 'troco_account', type: 'varchar', size: 128 },
      { key: 'covered_reason', type: 'varchar', size: 64 },
      { key: 'billing_reference_id', type: 'varchar', size: 64 },
      { key: 'capture_method_id', type: 'varchar', size: 64 },
      { key: 'description', type: 'varchar', size: 512 },
      { key: 'payload', type: 'mediumtext' },
    ],
    indexes: ['academy_id', 'agencyId', 'lead_id', 'client_id', 'status', 'reference_month', 'financial_tx_id'],
  },
  {
    id: 'finance_accounts',
    name: 'Finance Accounts',
    columns: [
      // UI AccountsTab grava academyId + is_active (+ natureza/DRE/DFC)
      { key: 'academyId', type: 'varchar', size: 64 },
      { key: 'academy_id', type: 'varchar', size: 64 },
      { key: 'agencyId', type: 'varchar', size: 64 },
      { key: 'code', type: 'varchar', size: 32 },
      { key: 'name', type: 'varchar', size: 255 },
      { key: 'type', type: 'varchar', size: 32 },
      { key: 'nature', type: 'varchar', size: 32 },
      { key: 'dreGrupo', type: 'varchar', size: 64 },
      { key: 'dfcClasse', type: 'varchar', size: 64 },
      { key: 'dfcSubclasse', type: 'varchar', size: 64 },
      { key: 'cashFlowClass', type: 'varchar', size: 64 },
      { key: 'cash', type: 'boolean' },
      { key: 'is_active', type: 'boolean' },
      { key: 'active', type: 'boolean' },
      { key: 'parent_code', type: 'varchar', size: 32 },
      { key: 'payload', type: 'mediumtext' },
    ],
    indexes: ['academyId', 'academy_id', 'agencyId', 'code', 'type', 'is_active'],
  },
  {
    id: 'finance_journal',
    name: 'Finance Journal',
    // financeJournal.js: academyId, date, memo, lines(JSON), financial_tx_id, competence_month
    columns: [
      { key: 'academyId', type: 'varchar', size: 64 },
      { key: 'academy_id', type: 'varchar', size: 64 },
      { key: 'agencyId', type: 'varchar', size: 64 },
      { key: 'date', type: 'varchar', size: 10 },
      { key: 'memo', type: 'mediumtext' },
      { key: 'lines', type: 'mediumtext' },
      { key: 'financial_tx_id', type: 'varchar', size: 64 },
      { key: 'competence_month', type: 'varchar', size: 7 },
      { key: 'tx_id', type: 'varchar', size: 64 },
      { key: 'debit_account', type: 'varchar', size: 32 },
      { key: 'credit_account', type: 'varchar', size: 32 },
      { key: 'amount', type: 'float' },
      { key: 'payload', type: 'mediumtext' },
    ],
    indexes: ['academyId', 'academy_id', 'agencyId', 'date', 'financial_tx_id', 'tx_id'],
  },
  {
    id: 'bank_statements',
    name: 'Bank Statements',
    columns: [
      { key: 'academy_id', type: 'varchar', size: 64 },
      { key: 'agencyId', type: 'varchar', size: 64 },
      { key: 'filename', type: 'varchar', size: 256 },
      { key: 'bank_account', type: 'varchar', size: 128 },
      { key: 'period_from', type: 'varchar', size: 10 },
      { key: 'period_to', type: 'varchar', size: 10 },
      { key: 'status', type: 'varchar', size: 32 },
      { key: 'imported_at', type: 'datetime' },
      { key: 'payload', type: 'mediumtext' },
    ],
    indexes: ['academy_id', 'agencyId', 'bank_account', 'status'],
  },
  {
    id: 'bank_statement_items',
    name: 'Bank Statement Items',
    columns: [
      { key: 'academy_id', type: 'varchar', size: 64 },
      { key: 'agencyId', type: 'varchar', size: 64 },
      { key: 'statement_id', type: 'varchar', size: 64 },
      { key: 'posted_at', type: 'varchar', size: 10 },
      { key: 'amount', type: 'float' },
      { key: 'direction', type: 'varchar', size: 8 },
      { key: 'description', type: 'varchar', size: 512 },
      { key: 'fitid', type: 'varchar', size: 128 },
      { key: 'matched_tx_id', type: 'varchar', size: 64 },
      { key: 'status', type: 'varchar', size: 32 },
      { key: 'payload', type: 'mediumtext' },
    ],
    indexes: ['academy_id', 'agencyId', 'statement_id', 'matched_tx_id', 'status', 'fitid'],
  },
  {
    id: 'financial_audit_log',
    name: 'Financial Audit Log',
    columns: [
      { key: 'academy_id', type: 'varchar', size: 64 },
      { key: 'agencyId', type: 'varchar', size: 64 },
      { key: 'actor_id', type: 'varchar', size: 64 },
      { key: 'action', type: 'varchar', size: 64 },
      { key: 'entity_type', type: 'varchar', size: 64 },
      { key: 'entity_id', type: 'varchar', size: 64 },
      { key: 'payload', type: 'mediumtext' },
    ],
    indexes: ['academy_id', 'agencyId', 'entity_id', 'action'],
  },
];

const ENV_MAP = {
  financial_tx: 'VITE_APPWRITE_FINANCIAL_TX_COLLECTION_ID',
  client_billings: 'VITE_APPWRITE_STUDENT_PAYMENTS_COLLECTION_ID',
  finance_accounts: 'VITE_APPWRITE_ACCOUNTS_COLLECTION_ID',
  finance_journal: 'VITE_APPWRITE_JOURNAL_COLLECTION_ID',
  bank_statements: 'VITE_APPWRITE_BANK_STATEMENTS_COLLECTION_ID',
  bank_statement_items: 'VITE_APPWRITE_BANK_STATEMENT_ITEMS_COLLECTION_ID',
  financial_audit_log: 'VITE_APPWRITE_FINANCIAL_AUDIT_LOG_COLLECTION_ID',
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
    const cols = table.columns || [];
    const col = cols.find((c) => c.key === key);
    if (col && (!col.status || col.status === 'available')) return;
    await sleep(400);
  }
  console.warn(`  coluna ${tableId}.${key} ainda processando`);
}

async function createColumn(tableId, col) {
  try {
    if (col.type === 'boolean') {
      await tables.createBooleanColumn({
        databaseId: DATABASE_ID,
        tableId,
        key: col.key,
        required: false,
      });
    } else if (col.type === 'datetime') {
      await tables.createDatetimeColumn({
        databaseId: DATABASE_ID,
        tableId,
        key: col.key,
        required: false,
      });
    } else if (col.type === 'float') {
      await tables.createFloatColumn({
        databaseId: DATABASE_ID,
        tableId,
        key: col.key,
        required: false,
      });
    } else if (col.type === 'integer') {
      await tables.createIntegerColumn({
        databaseId: DATABASE_ID,
        tableId,
        key: col.key,
        required: false,
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
  const keys = Object.keys(vars);

  for (const key of keys) {
    const value = vars[key];
    const idx = lines.findIndex((l) => l.trim().startsWith(`${key}=`));
    const next = `${key}=${value}`;
    if (idx >= 0) lines[idx] = next;
    else lines.push(next);
  }

  // keep trailing newline
  const out = `${lines.filter((l, i) => !(i === lines.length - 1 && l === '')).join('\n')}\n`;
  writeFileSync(path, out, 'utf8');
  console.log(`\nAtualizado .env.local com ${keys.length} variáveis de coleção.`);
}

async function main() {
  console.log(`Provisionando financeiro em ${ENDPOINT} / projeto ${PROJECT_ID}`);
  console.log(`Database: ${DATABASE_ID}`);

  try {
    await tables.get({ databaseId: DATABASE_ID });
  } catch (error) {
    console.error(`Database ${DATABASE_ID} não encontrada. Rode npm run appwrite:setup primeiro.`);
    throw error;
  }

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

    for (const col of table.columns) {
      await createColumn(table.id, col);
    }
    for (const idx of table.indexes) {
      await createIndex(table.id, idx);
    }
  }

  const envVars = Object.fromEntries(
    Object.entries(ENV_MAP).map(([tableId, envKey]) => [envKey, tableId])
  );
  // Alias legado usado em alguns módulos
  envVars.VITE_APPWRITE_STUDENT_PAYMENTS_COL_ID = 'client_billings';
  upsertEnvLocal(envVars);

  console.log('\nSetup financeiro concluído.');
  console.log('Coleções:', TABLES.map((t) => t.id).join(', '));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
