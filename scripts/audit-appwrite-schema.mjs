/**
 * Read-only dump of Appwrite databases/tables/columns/indexes/buckets.
 * Does NOT create or modify anything.
 */
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

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
const PROJECT = process.env.VITE_APPWRITE_PROJECT_ID;
const KEY = process.env.APPWRITE_API_KEY;
const DB = process.env.VITE_APPWRITE_DATABASE_ID;

if (!ENDPOINT || !PROJECT || !KEY || !DB) {
  console.error('Missing env: VITE_APPWRITE_ENDPOINT/PROJECT_ID/DATABASE_ID or APPWRITE_API_KEY');
  process.exit(1);
}

const headers = {
  'X-Appwrite-Project': PROJECT,
  'X-Appwrite-Key': KEY,
  'Content-Type': 'application/json',
};

async function get(path) {
  const r = await fetch(`${ENDPOINT}${path}`, { headers });
  const text = await r.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!r.ok) {
    const err = new Error(`${path} ${r.status} ${text.slice(0, 400)}`);
    err.status = r.status;
    err.body = json;
    throw err;
  }
  return json;
}

const out = {
  fetchedAt: new Date().toISOString(),
  endpoint: ENDPOINT,
  project: PROJECT,
  databaseIdFromEnv: DB,
  env: {},
  databases: [],
  buckets: [],
  tablesApi: null,
  tables: [],
  errors: [],
};

for (const [k, v] of Object.entries(process.env)) {
  if (k.includes('APPWRITE') || k.startsWith('VITE_')) {
    out.env[k] = /KEY|SECRET|TOKEN|PASSWORD/i.test(k) ? '***' : v;
  }
}

try {
  out.databases = (await get('/databases')).databases || [];
} catch (e) {
  out.errors.push(`databases: ${e.message}`);
}

try {
  out.buckets = (await get('/storage/buckets')).buckets || [];
} catch (e) {
  out.errors.push(`buckets: ${e.message}`);
}

let tablesList;
try {
  tablesList = await get(`/tablesdb/${DB}/tables`);
  out.tablesApi = 'tablesdb';
} catch (e1) {
  try {
    tablesList = await get(`/databases/${DB}/collections`);
    out.tablesApi = 'collections';
  } catch (e2) {
    out.errors.push(`tables: ${e1.message} | ${e2.message}`);
  }
}

const items = tablesList?.tables || tablesList?.collections || [];

for (const t of items) {
  const id = t.$id;
  const entry = {
    id,
    name: t.name,
    enabled: t.enabled,
    rowSecurity: t.rowSecurity ?? t.documentSecurity,
    permissions: t.$permissions,
    columns: [],
    indexes: [],
    error: null,
  };

  try {
    if (out.tablesApi === 'tablesdb') {
      // Prefer getTable — list /columns may paginate and omit attrs
      const full = await get(`/tablesdb/${DB}/tables/${id}`);
      const cols = full.columns || [];
      entry.columns = cols.map((c) => ({
        key: c.key,
        type: c.type,
        status: c.status,
        required: c.required,
        array: c.array,
        size: c.size,
        default: c.default,
        elements: c.elements,
        format: c.format,
      }));
      const idxs = await get(`/tablesdb/${DB}/tables/${id}/indexes`);
      entry.indexes = (idxs.indexes || []).map((i) => ({
        key: i.key,
        type: i.type,
        status: i.status,
        columns: i.columns || i.attributes,
        orders: i.orders,
      }));
    } else {
      const attrs = await get(`/databases/${DB}/collections/${id}/attributes`);
      entry.columns = (attrs.attributes || []).map((c) => ({
        key: c.key,
        type: c.type,
        status: c.status,
        required: c.required,
        array: c.array,
        size: c.size,
        default: c.default,
        elements: c.elements,
        format: c.format,
      }));
      const idxs = await get(`/databases/${DB}/collections/${id}/indexes`);
      entry.indexes = (idxs.indexes || []).map((i) => ({
        key: i.key,
        type: i.type,
        status: i.status,
        columns: i.columns || i.attributes,
        orders: i.orders,
      }));
    }
  } catch (e) {
    entry.error = e.message;
  }

  out.tables.push(entry);
}

const outPath = resolve(process.cwd(), 'audit-appwrite-schema.json');
writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(
  JSON.stringify(
    {
      tablesApi: out.tablesApi,
      databases: out.databases.map((d) => ({ id: d.$id, name: d.name })),
      buckets: out.buckets.map((b) => ({
        id: b.$id,
        name: b.name,
        fileSecurity: b.fileSecurity,
        permissions: b.$permissions,
      })),
      tableCount: out.tables.length,
      tables: out.tables.map((t) => ({
        id: t.id,
        cols: t.columns.map((c) => c.key),
        indexes: t.indexes.map((i) => ({ key: i.key, cols: i.columns, type: i.type })),
        perms: t.permissions,
        rowSecurity: t.rowSecurity,
      })),
      errors: out.errors,
      wrote: outPath,
    },
    null,
    2
  )
);
