/**
 * Cria apenas origin_id e billing_id em financial_tx se faltarem.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Client, TablesDB } from 'node-appwrite';

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

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
const tables = new TablesDB(client);
const tableId = 'financial_tx';

const table = await tables.getTable({ databaseId: DATABASE_ID, tableId });
const keys = (table.columns || []).map((c) => c.key);
console.log('columns count', keys.length);
console.log('has origin_id', keys.includes('origin_id'));
console.log('has billing_id', keys.includes('billing_id'));

for (const key of ['origin_id', 'billing_id']) {
  if (keys.includes(key)) {
    console.log(key, 'already present');
    continue;
  }
  try {
    const res = await tables.createVarcharColumn({
      databaseId: DATABASE_ID,
      tableId,
      key,
      size: 64,
      required: false,
    });
    console.log('created', key, res?.status || 'ok');
  } catch (e) {
    console.error('FAIL', key, e.code, e.type, e.message);
  }
}

await new Promise((r) => setTimeout(r, 2000));
const after = await tables.getTable({ databaseId: DATABASE_ID, tableId });
const afterKeys = (after.columns || []).map((c) => ({ key: c.key, status: c.status, type: c.type }));
console.log(
  'after:',
  afterKeys.filter((c) => c.key.includes('origin') || c.key.includes('billing'))
);
