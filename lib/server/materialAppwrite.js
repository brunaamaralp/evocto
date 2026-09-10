/**
 * Appwrite admin helpers for material deliveries APIs.
 */
import { Client, TablesDB, Storage, Account, ID, Query, Permission, Role } from 'node-appwrite';

export { ID, Query, Permission, Role };

export function getEnvConfig() {
  const endpoint = process.env.VITE_APPWRITE_ENDPOINT || process.env.APPWRITE_ENDPOINT;
  const projectId = process.env.VITE_APPWRITE_PROJECT_ID || process.env.APPWRITE_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY;
  const databaseId =
    process.env.VITE_APPWRITE_DATABASE_ID || process.env.APPWRITE_DATABASE_ID || 'evocto';
  const bucketId = process.env.VITE_APPWRITE_BUCKET_ID || process.env.APPWRITE_BUCKET_ID || 'files';
  const publicAppUrl = String(
    process.env.APP_PUBLIC_URL || process.env.VITE_APP_PUBLIC_URL || ''
  ).replace(/\/+$/, '');
  return { endpoint, projectId, apiKey, databaseId, bucketId, publicAppUrl };
}

export function getAdminClient() {
  const { endpoint, projectId, apiKey } = getEnvConfig();
  if (!endpoint || !projectId || !apiKey) {
    throw new Error('Appwrite admin não configurado (ENDPOINT/PROJECT/API_KEY)');
  }
  return new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
}

export function getAdminTables() {
  const client = getAdminClient();
  const { databaseId } = getEnvConfig();
  return { tables: new TablesDB(client), databaseId, client };
}

export function getAdminStorage() {
  const client = getAdminClient();
  const { bucketId } = getEnvConfig();
  return { storage: new Storage(client), bucketId };
}

export function parsePayload(row) {
  let extra = {};
  if (row?.payload) {
    try {
      extra = JSON.parse(row.payload);
    } catch {
      extra = {};
    }
  }
  const { payload, $id, $createdAt, $updatedAt, ...rest } = row || {};
  return {
    ...extra,
    ...rest,
    id: $id,
    created_date: $createdAt,
    updated_date: $updatedAt,
  };
}

export function splitTyped(tableColumns, data = {}) {
  const known = new Set(tableColumns);
  const row = {};
  const extra = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    if (
      [
        'id',
        '$id',
        '$createdAt',
        '$updatedAt',
        '$permissions',
        'created_date',
        'updated_date',
        'payload',
      ].includes(key)
    ) {
      continue;
    }
    if (known.has(key)) {
      if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
        extra[key] = value;
      } else {
        row[key] = value;
      }
    } else {
      extra[key] = value;
    }
  }
  if (Object.keys(extra).length > 0) {
    row.payload = JSON.stringify(extra);
  }
  return row;
}

export const MATERIAL_DELIVERY_COLUMNS = [
  'agencyId',
  'clientId',
  'serviceId',
  'deliverableId',
  'taskId',
  'title',
  'description',
  'status',
  'latestVersionNumber',
  'currentVersionId',
  'approvedVersionId',
  'approvalRequestId',
  'driveFolderId',
  'createdBy',
  'archivedAt',
];

export const MATERIAL_VERSION_COLUMNS = [
  'agencyId',
  'deliveryId',
  'versionNumber',
  'driveFileId',
  'driveFolderId',
  'fileName',
  'mimeType',
  'fileSize',
  'checksumSha256',
  'driveModifiedTime',
  'reviewStatus',
  'feedback',
  'createdBy',
  'submittedAt',
  'decidedAt',
  'reviewerName',
  'reviewerEmail',
  'decision',
  'idempotencyKey',
];

export const DRIVE_CONNECTION_COLUMNS = [
  'agencyId',
  'googleAccountId',
  'googleEmail',
  'encryptedRefreshToken',
  'rootFolderId',
  'status',
  'scopes',
  'connectedBy',
  'connectedAt',
  'lastRefreshAt',
  'revokedAt',
  'lastError',
];

export const APPROVAL_REQUEST_COLUMNS = [
  'agencyId',
  'clientId',
  'status',
  'token',
  'contentType',
  'contentId',
  'serviceId',
  'expiresAt',
];

export const AUDIT_LOG_COLUMNS = [
  'agencyId',
  'entity_type',
  'entity_id',
  'action',
  'actor_id',
];

export const NOTIFICATION_COLUMNS = [
  'agencyId',
  'userId',
  'type',
  'subject',
  'title',
];

export async function ensureAppwriteUser(req, res) {
  const header = String(req.headers.authorization || '');
  const jwt = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!jwt) {
    res.status(401).json({ error: 'unauthorized', message: 'Faça login novamente' });
    return null;
  }
  const { endpoint, projectId } = getEnvConfig();
  if (!endpoint || !projectId) {
    res.status(500).json({ error: 'appwrite_not_configured' });
    return null;
  }
  try {
    const client = new Client().setEndpoint(endpoint).setProject(projectId).setJWT(jwt);
    const account = new Account(client);
    return await account.get();
  } catch (err) {
    console.warn('[materialDeliveries] JWT inválido:', err?.message || err);
    res.status(401).json({ error: 'invalid_session', message: 'Sessão inválida' });
    return null;
  }
}

export async function getProfileForUser(tables, databaseId, userId) {
  try {
    const row = await tables.getRow({
      databaseId,
      tableId: 'profiles',
      rowId: userId,
    });
    return parsePayload(row);
  } catch {
    return null;
  }
}

export async function requireAgencyStaff(req, res) {
  const user = await ensureAppwriteUser(req, res);
  if (!user) return null;
  const { tables, databaseId } = getAdminTables();
  const profile = await getProfileForUser(tables, databaseId, user.$id);
  if (!profile?.agencyId) {
    res.status(403).json({ error: 'no_agency', message: 'Usuário sem agência' });
    return null;
  }
  const role = String(profile.role || '').toLowerCase();
  if (role === 'client') {
    res.status(403).json({ error: 'forbidden', message: 'Acesso restrito à equipe da agência' });
    return null;
  }
  return {
    user,
    profile,
    agencyId: profile.agencyId,
    role,
    tables,
    databaseId,
  };
}

export async function writeAudit(tables, databaseId, {
  agencyId,
  entityType,
  entityId,
  action,
  actorId,
  meta = {},
}) {
  try {
    await tables.createRow({
      databaseId,
      tableId: 'audit_logs',
      rowId: ID.unique(),
      data: splitTyped(AUDIT_LOG_COLUMNS, {
        agencyId,
        entity_type: entityType,
        entity_id: entityId,
        action,
        actor_id: actorId,
        ...meta,
      }),
    });
  } catch (err) {
    console.warn('[materialDeliveries] audit failed:', err?.message || err);
  }
}

export async function notifyAgencyUsers(tables, databaseId, {
  agencyId,
  type,
  title,
  subject,
  meta = {},
}) {
  try {
    // Notify owners/admins via profiles list (best-effort)
    const result = await tables.listRows({
      databaseId,
      tableId: 'profiles',
      queries: [
        Query.equal('agencyId', agencyId),
        Query.equal('role', ['owner', 'admin', 'team']),
        Query.limit(25),
      ],
    });
    const rows = result.rows || result.documents || [];
    for (const row of rows) {
      const profile = parsePayload(row);
      if (!profile.id) continue;
      await tables.createRow({
        databaseId,
        tableId: 'notifications',
        rowId: ID.unique(),
        data: splitTyped(NOTIFICATION_COLUMNS, {
          agencyId,
          userId: profile.id,
          type,
          title,
          subject,
          ...meta,
        }),
      });
    }
  } catch (err) {
    console.warn('[materialDeliveries] notify failed:', err?.message || err);
  }
}
