/**
 * Provisiona database, tabelas, índices e bucket no Appwrite Cloud.
 * Uso: node scripts/appwrite-setup.mjs
 * Requer APPWRITE_API_KEY + VITE_APPWRITE_* em .env.local
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  Client,
  TablesDB,
  Storage,
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
const DATABASE_ID = process.env.VITE_APPWRITE_DATABASE_ID || 'evocto';
const BUCKET_ID = process.env.VITE_APPWRITE_BUCKET_ID || 'files';

if (!ENDPOINT || !PROJECT_ID || !API_KEY) {
  console.error('Defina VITE_APPWRITE_ENDPOINT, VITE_APPWRITE_PROJECT_ID e APPWRITE_API_KEY em .env.local');
  process.exit(1);
}

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
const tables = new TablesDB(client);
const storage = new Storage(client);

const tablePerms = [Permission.create(Role.users())];

const TABLES = [
  {
    id: 'profiles',
    name: 'Profiles',
    columns: [
      { key: 'agencyId', type: 'varchar', size: 36 },
      { key: 'role', type: 'varchar', size: 32 },
      { key: 'clientId', type: 'varchar', size: 36 },
      { key: 'name', type: 'varchar', size: 255 },
      { key: 'email', type: 'varchar', size: 320 },
      { key: 'full_name', type: 'varchar', size: 255 },
      { key: 'status', type: 'varchar', size: 32 },
      { key: 'payload', type: 'mediumtext' },
    ],
    indexes: ['agencyId', 'email', 'role', 'clientId'],
  },
  {
    id: 'agencies',
    name: 'Agencies',
    columns: [
      { key: 'agencyName', type: 'varchar', size: 255 },
      { key: 'name', type: 'varchar', size: 255 },
      { key: 'contactPhone', type: 'varchar', size: 64 },
      { key: 'ownerEmail', type: 'varchar', size: 320 },
      { key: 'status', type: 'varchar', size: 32 },
      { key: 'payload', type: 'mediumtext' },
    ],
    indexes: ['ownerEmail', 'status'],
  },
  {
    id: 'clients',
    name: 'Clients',
    columns: [
      { key: 'agencyId', type: 'varchar', size: 36 },
      { key: 'name', type: 'varchar', size: 255 },
      { key: 'status', type: 'varchar', size: 32 },
      { key: 'email', type: 'varchar', size: 320 },
      { key: 'phone', type: 'varchar', size: 64 },
      { key: 'payload', type: 'mediumtext' },
    ],
    indexes: ['agencyId', 'status'],
  },
  {
    id: 'services',
    name: 'Services',
    columns: [
      { key: 'agencyId', type: 'varchar', size: 36 },
      { key: 'clientId', type: 'varchar', size: 36 },
      { key: 'name', type: 'varchar', size: 255 },
      { key: 'status', type: 'varchar', size: 64 },
      { key: 'is_template', type: 'boolean' },
      { key: 'is_active', type: 'boolean' },
      { key: 'category', type: 'varchar', size: 128 },
      { key: 'payload', type: 'mediumtext' },
    ],
    indexes: ['agencyId', 'clientId', 'is_template', 'is_active', 'status'],
  },
  {
    id: 'tasks',
    name: 'Tasks',
    columns: [
      { key: 'agencyId', type: 'varchar', size: 36 },
      { key: 'clientId', type: 'varchar', size: 36 },
      { key: 'serviceId', type: 'varchar', size: 36 },
      { key: 'title', type: 'varchar', size: 255 },
      { key: 'status', type: 'varchar', size: 32 },
      { key: 'priority', type: 'varchar', size: 32 },
      { key: 'dueDate', type: 'datetime' },
      { key: 'assigneeId', type: 'varchar', size: 36 },
      { key: 'payload', type: 'mediumtext' },
    ],
    indexes: ['agencyId', 'clientId', 'serviceId', 'status'],
  },
  {
    id: 'cycle_plans',
    name: 'Cycle Plans',
    columns: [
      { key: 'agencyId', type: 'varchar', size: 36 },
      { key: 'clientId', type: 'varchar', size: 36 },
      { key: 'serviceId', type: 'varchar', size: 36 },
      { key: 'status', type: 'varchar', size: 32 },
      { key: 'title', type: 'varchar', size: 255 },
      { key: 'payload', type: 'mediumtext' },
    ],
    indexes: ['agencyId', 'clientId', 'serviceId', 'status'],
  },
  {
    id: 'briefs',
    name: 'Briefs',
    columns: [
      { key: 'agencyId', type: 'varchar', size: 36 },
      { key: 'clientId', type: 'varchar', size: 36 },
      { key: 'projectId', type: 'varchar', size: 36 },
      { key: 'status', type: 'varchar', size: 32 },
      { key: 'title', type: 'varchar', size: 255 },
      { key: 'payload', type: 'mediumtext' },
    ],
    indexes: ['agencyId', 'clientId', 'status'],
  },
  {
    id: 'briefing_templates',
    name: 'Briefing Templates',
    columns: [
      { key: 'agencyId', type: 'varchar', size: 36 },
      { key: 'name', type: 'varchar', size: 255 },
      { key: 'isActive', type: 'boolean' },
      { key: 'payload', type: 'mediumtext' },
    ],
    indexes: ['agencyId', 'isActive'],
  },
  {
    id: 'approval_requests',
    name: 'Approval Requests',
    columns: [
      { key: 'agencyId', type: 'varchar', size: 36 },
      { key: 'clientId', type: 'varchar', size: 36 },
      { key: 'status', type: 'varchar', size: 32 },
      { key: 'token', type: 'varchar', size: 128 },
      { key: 'payload', type: 'mediumtext' },
    ],
    indexes: ['agencyId', 'clientId', 'status', 'token'],
  },
  {
    id: 'invites',
    name: 'Invites',
    columns: [
      { key: 'agencyId', type: 'varchar', size: 36 },
      { key: 'email', type: 'varchar', size: 320 },
      { key: 'role', type: 'varchar', size: 32 },
      { key: 'status', type: 'varchar', size: 32 },
      { key: 'payload', type: 'mediumtext' },
    ],
    indexes: ['agencyId', 'email', 'status'],
  },
];

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
      key: `idx_${column}`,
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
  console.log(`Provisionando Appwrite em ${ENDPOINT} / projeto ${PROJECT_ID}`);

  try {
    await tables.create({ databaseId: DATABASE_ID, name: 'Evocto' });
    console.log(`Database ${DATABASE_ID} criada`);
  } catch (error) {
    if (!isConflict(error)) throw error;
    console.log(`Database ${DATABASE_ID} já existe`);
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
      console.log(`Tabela ${table.id} criada`);
    } catch (error) {
      if (!isConflict(error)) throw error;
      console.log(`Tabela ${table.id} já existe`);
    }

    for (const col of table.columns) {
      await createColumn(table.id, col);
    }
    for (const idx of table.indexes) {
      await createIndex(table.id, idx);
    }
  }

  try {
    await storage.createBucket({
      bucketId: BUCKET_ID,
      name: 'Evocto Files',
      permissions: [
        Permission.create(Role.users()),
        Permission.read(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users()),
      ],
      fileSecurity: true,
    });
    console.log(`Bucket ${BUCKET_ID} criado`);
  } catch (error) {
    if (!isConflict(error)) throw error;
    console.log(`Bucket ${BUCKET_ID} já existe`);
  }

  console.log('\nSetup concluído. Adicione uma plataforma Web no console Appwrite (localhost).');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
