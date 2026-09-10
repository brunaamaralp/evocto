/**
 * Provisiona schema do módulo Entregas e Aprovações (material deliveries).
 *
 * Cria / idempotente:
 * - material_deliveries
 * - material_delivery_versions
 * - agency_drive_connections (server-only — sem permissões de users)
 * - notifications, audit_logs (se ainda ausentes)
 * - colunas extras em approval_requests (contentType, contentId, serviceId, expiresAt)
 *
 * Uso: npm run appwrite:setup-material-deliveries
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

const ENDPOINT = process.env.VITE_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.VITE_APPWRITE_PROJECT_ID;
const API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.VITE_APPWRITE_DATABASE_ID;

if (!ENDPOINT || !PROJECT_ID || !API_KEY || !DATABASE_ID) {
  console.error('Defina VITE_APPWRITE_ENDPOINT, VITE_APPWRITE_PROJECT_ID, VITE_APPWRITE_DATABASE_ID e APPWRITE_API_KEY');
  process.exit(1);
}

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
const tables = new TablesDB(client);

/** Autenticados podem criar rows; RLS por row. */
const usersCreatePerms = [Permission.create(Role.users())];

/**
 * Sem permissões de client SDK — somente API key / Functions.
 * Usado em agency_drive_connections (refresh tokens).
 */
const serverOnlyPerms = [];

const TABLES = [
  {
    id: 'material_deliveries',
    name: 'Material Deliveries',
    permissions: usersCreatePerms,
    columns: [
      { key: 'agencyId', type: 'varchar', size: 36 },
      { key: 'clientId', type: 'varchar', size: 36 },
      { key: 'serviceId', type: 'varchar', size: 36 },
      { key: 'deliverableId', type: 'varchar', size: 64 },
      { key: 'taskId', type: 'varchar', size: 36 },
      { key: 'title', type: 'varchar', size: 255 },
      { key: 'description', type: 'mediumtext' },
      { key: 'status', type: 'varchar', size: 32 },
      { key: 'latestVersionNumber', type: 'integer' },
      { key: 'currentVersionId', type: 'varchar', size: 36 },
      { key: 'approvedVersionId', type: 'varchar', size: 36 },
      { key: 'approvalRequestId', type: 'varchar', size: 36 },
      { key: 'driveFolderId', type: 'varchar', size: 128 },
      { key: 'createdBy', type: 'varchar', size: 64 },
      { key: 'archivedAt', type: 'datetime' },
      { key: 'payload', type: 'mediumtext' },
    ],
    indexes: [
      { key: 'idx_agencyId', columns: ['agencyId'], type: 'key' },
      { key: 'idx_agency_client', columns: ['agencyId', 'clientId'], type: 'key' },
      { key: 'idx_serviceId', columns: ['serviceId'], type: 'key' },
      { key: 'idx_agency_status', columns: ['agencyId', 'status'], type: 'key' },
      { key: 'idx_approvalRequestId', columns: ['approvalRequestId'], type: 'key' },
    ],
  },
  {
    id: 'material_delivery_versions',
    name: 'Material Delivery Versions',
    permissions: usersCreatePerms,
    columns: [
      { key: 'agencyId', type: 'varchar', size: 36 },
      { key: 'deliveryId', type: 'varchar', size: 36 },
      { key: 'versionNumber', type: 'integer' },
      { key: 'driveFileId', type: 'varchar', size: 128 },
      { key: 'driveFolderId', type: 'varchar', size: 128 },
      { key: 'fileName', type: 'varchar', size: 255 },
      { key: 'mimeType', type: 'varchar', size: 128 },
      { key: 'fileSize', type: 'integer' },
      { key: 'checksumSha256', type: 'varchar', size: 64 },
      { key: 'driveModifiedTime', type: 'datetime' },
      { key: 'reviewStatus', type: 'varchar', size: 32 },
      { key: 'feedback', type: 'mediumtext' },
      { key: 'createdBy', type: 'varchar', size: 64 },
      { key: 'submittedAt', type: 'datetime' },
      { key: 'decidedAt', type: 'datetime' },
      { key: 'reviewerName', type: 'varchar', size: 255 },
      { key: 'reviewerEmail', type: 'varchar', size: 320 },
      { key: 'decision', type: 'varchar', size: 32 },
      { key: 'idempotencyKey', type: 'varchar', size: 64 },
      { key: 'payload', type: 'mediumtext' },
    ],
    indexes: [
      { key: 'idx_agencyId', columns: ['agencyId'], type: 'key' },
      { key: 'idx_deliveryId', columns: ['deliveryId'], type: 'key' },
      {
        key: 'uniq_delivery_version',
        columns: ['deliveryId', 'versionNumber'],
        type: 'unique',
      },
      { key: 'idx_delivery_review', columns: ['deliveryId', 'reviewStatus'], type: 'key' },
      { key: 'idx_driveFileId', columns: ['driveFileId'], type: 'key' },
      { key: 'uniq_idempotencyKey', columns: ['idempotencyKey'], type: 'unique' },
    ],
  },
  {
    id: 'agency_drive_connections',
    name: 'Agency Drive Connections',
    permissions: serverOnlyPerms,
    columns: [
      { key: 'agencyId', type: 'varchar', size: 36 },
      { key: 'googleAccountId', type: 'varchar', size: 128 },
      { key: 'googleEmail', type: 'varchar', size: 320 },
      { key: 'encryptedRefreshToken', type: 'mediumtext' },
      { key: 'rootFolderId', type: 'varchar', size: 128 },
      { key: 'status', type: 'varchar', size: 32 },
      { key: 'scopes', type: 'varchar', size: 512 },
      { key: 'connectedBy', type: 'varchar', size: 64 },
      { key: 'connectedAt', type: 'datetime' },
      { key: 'lastRefreshAt', type: 'datetime' },
      { key: 'revokedAt', type: 'datetime' },
      { key: 'lastError', type: 'varchar', size: 512 },
      { key: 'payload', type: 'mediumtext' },
    ],
    indexes: [
      { key: 'uniq_agencyId', columns: ['agencyId'], type: 'unique' },
      { key: 'idx_status', columns: ['status'], type: 'key' },
    ],
  },
  {
    id: 'notifications',
    name: 'Notifications',
    permissions: usersCreatePerms,
    columns: [
      { key: 'agencyId', type: 'varchar', size: 36 },
      { key: 'userId', type: 'varchar', size: 64 },
      { key: 'type', type: 'varchar', size: 64 },
      { key: 'subject', type: 'varchar', size: 255 },
      { key: 'title', type: 'varchar', size: 255 },
      { key: 'payload', type: 'mediumtext' },
    ],
    indexes: [
      { key: 'idx_agencyId', columns: ['agencyId'], type: 'key' },
      { key: 'idx_userId', columns: ['userId'], type: 'key' },
      { key: 'idx_type', columns: ['type'], type: 'key' },
    ],
  },
  {
    id: 'audit_logs',
    name: 'Audit Logs',
    permissions: usersCreatePerms,
    columns: [
      { key: 'agencyId', type: 'varchar', size: 36 },
      { key: 'entity_type', type: 'varchar', size: 64 },
      { key: 'entity_id', type: 'varchar', size: 36 },
      { key: 'action', type: 'varchar', size: 64 },
      { key: 'actor_id', type: 'varchar', size: 64 },
      { key: 'payload', type: 'mediumtext' },
    ],
    indexes: [
      { key: 'idx_agencyId', columns: ['agencyId'], type: 'key' },
      { key: 'idx_entity_type', columns: ['entity_type'], type: 'key' },
      { key: 'idx_entity_id', columns: ['entity_id'], type: 'key' },
      { key: 'idx_action', columns: ['action'], type: 'key' },
      { key: 'idx_actor_id', columns: ['actor_id'], type: 'key' },
    ],
  },
];

/** Colunas a adicionar em approval_requests existente (idempotente). */
const APPROVAL_REQUEST_EXTRAS = {
  tableId: 'approval_requests',
  columns: [
    { key: 'contentType', type: 'varchar', size: 64 },
    { key: 'contentId', type: 'varchar', size: 36 },
    { key: 'serviceId', type: 'varchar', size: 36 },
    { key: 'expiresAt', type: 'datetime' },
  ],
  indexes: [
    { key: 'idx_contentType', columns: ['contentType'], type: 'key' },
    { key: 'idx_contentId', columns: ['contentId'], type: 'key' },
    { key: 'idx_serviceId', columns: ['serviceId'], type: 'key' },
  ],
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
  console.warn(`  coluna ${tableId}.${key} ainda processando`);
}

async function waitIndex(tableId, key) {
  for (let i = 0; i < 40; i++) {
    const table = await tables.getTable({ databaseId: DATABASE_ID, tableId });
    const idx = (table.indexes || []).find((x) => x.key === key);
    if (idx && (!idx.status || idx.status === 'available')) return;
    await sleep(400);
  }
  console.warn(`  índice ${tableId}.${key} ainda processando`);
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
    } else if (col.type === 'integer') {
      await tables.createIntegerColumn({
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

async function createIndex(tableId, index) {
  const type =
    index.type === 'unique' ? TablesDBIndexType.Unique : TablesDBIndexType.Key;
  try {
    await tables.createIndex({
      databaseId: DATABASE_ID,
      tableId,
      key: index.key.slice(0, 36),
      type,
      columns: index.columns,
    });
    await waitIndex(tableId, index.key.slice(0, 36));
    console.log(`  índice ${index.key} (${index.type || 'key'})`);
  } catch (error) {
    if (isConflict(error)) {
      console.log(`  índice ${index.key} (já existe)`);
      return;
    }
    console.warn(`  índice ${index.key} falhou:`, error.message);
  }
}

async function ensureTable(table) {
  try {
    await tables.createTable({
      databaseId: DATABASE_ID,
      tableId: table.id,
      name: table.name,
      permissions: table.permissions,
      rowSecurity: true,
    });
    console.log(`\nTabela ${table.id} criada`);
  } catch (error) {
    if (!isConflict(error)) throw error;
    console.log(`\nTabela ${table.id} já existe`);
    try {
      await tables.updateTable({
        databaseId: DATABASE_ID,
        tableId: table.id,
        name: table.name,
        permissions: table.permissions,
        rowSecurity: true,
      });
      console.log(
        `  permissões sincronizadas (${table.permissions.length === 0 ? 'server-only' : 'users create'})`
      );
    } catch (updErr) {
      console.warn(`  não atualizou permissões:`, updErr.message);
    }
  }

  for (const col of table.columns) {
    await createColumn(table.id, col);
  }
  for (const idx of table.indexes) {
    await createIndex(table.id, idx);
  }
}

async function patchApprovalRequests() {
  console.log(`\nPatch approval_requests…`);
  try {
    await tables.getTable({
      databaseId: DATABASE_ID,
      tableId: APPROVAL_REQUEST_EXTRAS.tableId,
    });
  } catch (error) {
    console.warn(`  approval_requests não encontrada — pulando patch:`, error.message);
    return;
  }

  for (const col of APPROVAL_REQUEST_EXTRAS.columns) {
    await createColumn(APPROVAL_REQUEST_EXTRAS.tableId, col);
  }
  for (const idx of APPROVAL_REQUEST_EXTRAS.indexes) {
    await createIndex(APPROVAL_REQUEST_EXTRAS.tableId, idx);
  }
}

async function main() {
  console.log(`Material deliveries → ${ENDPOINT} / ${PROJECT_ID} / db=${DATABASE_ID}`);

  for (const table of TABLES) {
    await ensureTable(table);
  }
  await patchApprovalRequests();

  console.log('\n── Resumo ──');
  console.log('Criadas/atualizadas: material_deliveries, material_delivery_versions,');
  console.log('  agency_drive_connections (server-only), notifications, audit_logs');
  console.log('Patcheadas: approval_requests (+ contentType, contentId, serviceId, expiresAt)');
  console.log('\nSetup material deliveries concluído.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
