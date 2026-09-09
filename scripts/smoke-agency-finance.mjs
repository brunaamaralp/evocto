/**
 * Smoke Agency Finance: create/list/delete on af_charges, af_payables, af_cash.
 * Uso: node scripts/smoke-agency-finance.mjs
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
const CHARGES = process.env.VITE_APPWRITE_AF_CHARGES_COLLECTION_ID || 'af_charges';
const PAYABLES = process.env.VITE_APPWRITE_AF_PAYABLES_COLLECTION_ID || 'af_payables';
const CASH = process.env.VITE_APPWRITE_AF_CASH_COLLECTION_ID || 'af_cash';

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

const agencyId = 'smoke-agency-af';
const today = new Date().toISOString().slice(0, 10);
const month = today.slice(0, 7);

async function main() {
  console.log('Smoke agency finance →', DATABASE_ID);

  const charge = await tables.createRow({
    databaseId: DATABASE_ID,
    tableId: CHARGES,
    rowId: ID.unique(),
    data: {
      agencyId,
      clientId: 'smoke-client',
      clientName: 'Smoke Cliente',
      type: 'retainer',
      description: 'Smoke cobrança',
      amount: 100,
      status: 'open',
      dueDate: today,
      competenceMonth: month,
    },
    permissions: perms,
  });
  console.log('OK create af_charges', charge.$id);

  const payable = await tables.createRow({
    databaseId: DATABASE_ID,
    tableId: PAYABLES,
    rowId: ID.unique(),
    data: {
      agencyId,
      vendorName: 'Smoke Freela',
      category: 'freela',
      description: 'Smoke payable',
      amount: 50,
      status: 'open',
      dueDate: today,
      competenceMonth: month,
    },
    permissions: perms,
  });
  console.log('OK create af_payables', payable.$id);

  const cash = await tables.createRow({
    databaseId: DATABASE_ID,
    tableId: CASH,
    rowId: ID.unique(),
    data: {
      agencyId,
      direction: 'in',
      amount: 100,
      date: today,
      competenceMonth: month,
      category: 'servicos',
      description: 'Smoke cash',
      method: 'pix',
      account: 'caixa',
      status: 'settled',
      refType: 'manual',
    },
    permissions: perms,
  });
  console.log('OK create af_cash', cash.$id);

  const listed = await tables.listRows({
    databaseId: DATABASE_ID,
    tableId: CHARGES,
    queries: [Query.equal('agencyId', agencyId), Query.limit(5)],
  });
  console.log('OK list af_charges', listed.total);

  await tables.deleteRow({ databaseId: DATABASE_ID, tableId: CHARGES, rowId: charge.$id });
  await tables.deleteRow({ databaseId: DATABASE_ID, tableId: PAYABLES, rowId: payable.$id });
  await tables.deleteRow({ databaseId: DATABASE_ID, tableId: CASH, rowId: cash.$id });
  console.log('OK cleanup');
  console.log('Smoke agency finance passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
