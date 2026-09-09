/**
 * Smoke: cria e lista 1 lançamento + 1 cobrança via API key.
 * Uso: node scripts/smoke-finance-appwrite.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Client, TablesDB, ID, Query, Permission, Role } from 'node-appwrite';

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
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
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
const TX = process.env.VITE_APPWRITE_FINANCIAL_TX_COLLECTION_ID || 'financial_tx';
const BILL = process.env.VITE_APPWRITE_STUDENT_PAYMENTS_COLLECTION_ID || 'client_billings';

if (!ENDPOINT || !PROJECT_ID || !API_KEY || !DATABASE_ID) {
  console.error('Missing Appwrite env');
  process.exit(1);
}

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
const tables = new TablesDB(client);
const perms = [
  Permission.read(Role.users()),
  Permission.update(Role.users()),
  Permission.delete(Role.users()),
];

const academyId = 'smoke-agency';
const today = new Date().toISOString().slice(0, 10);
const month = today.slice(0, 7);

async function main() {
  console.log('Smoke finance →', DATABASE_ID);

  const tx = await tables.createRow({
    databaseId: DATABASE_ID,
    tableId: TX,
    rowId: ID.unique(),
    data: {
      academyId,
      agencyId: academyId,
      direction: 'in',
      status: 'settled',
      date: today,
      competence_month: month,
      description: 'Smoke lançamento',
      amount: 10,
      gross: 10,
      net: 10,
      fee: 0,
      category: 'smoke',
      account: 'caixa',
      origin: 'smoke',
    },
    permissions: perms,
  });
  console.log('OK create financial_tx', tx.$id);

  const bill = await tables.createRow({
    databaseId: DATABASE_ID,
    tableId: BILL,
    rowId: ID.unique(),
    data: {
      academy_id: academyId,
      agencyId: academyId,
      lead_id: 'smoke-client',
      client_id: 'smoke-client',
      amount: 10,
      status: 'paid',
      reference_month: month,
      method: 'pix',
      plan_name: 'Smoke',
      description: 'Smoke cobrança',
      financial_tx_id: tx.$id,
    },
    permissions: perms,
  });
  console.log('OK create client_billings', bill.$id);

  const listTx = await tables.listRows({
    databaseId: DATABASE_ID,
    tableId: TX,
    queries: [Query.equal('academyId', academyId), Query.limit(5)],
  });
  console.log('OK list financial_tx', (listTx.rows || []).length, 'rows');

  const listBill = await tables.listRows({
    databaseId: DATABASE_ID,
    tableId: BILL,
    queries: [Query.equal('academy_id', academyId), Query.limit(5)],
  });
  console.log('OK list client_billings', (listBill.rows || []).length, 'rows');

  await tables.deleteRow({ databaseId: DATABASE_ID, tableId: BILL, rowId: bill.$id });
  await tables.deleteRow({ databaseId: DATABASE_ID, tableId: TX, rowId: tx.$id });
  console.log('OK cleanup');
  console.log('Smoke finance passou.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
