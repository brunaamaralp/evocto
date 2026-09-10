/**
 * Google Drive OAuth + file helpers (server-only).
 */
import { encryptSecret, decryptSecret } from './materialCrypto.js';
import {
  getAdminTables,
  parsePayload,
  splitTyped,
  DRIVE_CONNECTION_COLUMNS,
  ID,
  Query,
} from './materialAppwrite.js';

const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
  'openid',
].join(' ');

function googleConfig() {
  const clientId = String(process.env.GOOGLE_CLIENT_ID || '').trim();
  const clientSecret = String(process.env.GOOGLE_CLIENT_SECRET || '').trim();
  const redirectUri = String(process.env.GOOGLE_OAUTH_REDIRECT_URI || '').trim();
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Google OAuth não configurado (GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI)');
  }
  return { clientId, clientSecret, redirectUri };
}

export function buildGoogleAuthUrl(state) {
  const { clientId, redirectUri } = googleConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: DRIVE_SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeCodeForTokens(code) {
  const { clientId, clientSecret, redirectUri } = googleConfig();
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error_description || data?.error || 'token_exchange_failed');
  }
  return data;
}

async function refreshAccessToken(refreshToken) {
  const { clientId, clientSecret } = googleConfig();
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error_description || data?.error || 'refresh_failed');
    err.code = data?.error || 'refresh_failed';
    throw err;
  }
  return data;
}

export async function fetchGoogleUserInfo(accessToken) {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || 'userinfo_failed');
  return data;
}

async function driveFetch(accessToken, path, options = {}) {
  const url = path.startsWith('http')
    ? path
    : `https://www.googleapis.com/drive/v3${path}`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    ...(options.headers || {}),
  };
  const res = await fetch(url, { ...options, headers });
  return res;
}

export async function ensureRootFolder(accessToken) {
  const q = encodeURIComponent(
    "name='Evocto' and mimeType='application/vnd.google-apps.folder' and trashed=false"
  );
  const listRes = await driveFetch(
    accessToken,
    `/files?q=${q}&spaces=drive&fields=files(id,name)&pageSize=1`
  );
  const listData = await listRes.json().catch(() => ({}));
  if (listRes.ok && listData.files?.[0]?.id) {
    return listData.files[0].id;
  }

  const createRes = await driveFetch(accessToken, '/files?fields=id,name', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Evocto',
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });
  const created = await createRes.json().catch(() => ({}));
  if (!createRes.ok) {
    throw new Error(created?.error?.message || 'create_root_folder_failed');
  }
  return created.id;
}

export async function ensureChildFolder(accessToken, parentId, name) {
  const safeName = String(name || 'Sem nome').replace(/'/g, "\\'").slice(0, 200);
  const q = encodeURIComponent(
    `name='${safeName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
  );
  const listRes = await driveFetch(
    accessToken,
    `/files?q=${q}&spaces=drive&fields=files(id,name)&pageSize=1`
  );
  const listData = await listRes.json().catch(() => ({}));
  if (listRes.ok && listData.files?.[0]?.id) {
    return listData.files[0].id;
  }

  const createRes = await driveFetch(accessToken, '/files?fields=id,name', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: String(name || 'Sem nome').slice(0, 200),
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    }),
  });
  const created = await createRes.json().catch(() => ({}));
  if (!createRes.ok) {
    throw new Error(created?.error?.message || 'create_folder_failed');
  }
  return created.id;
}

export async function uploadBufferToDrive(accessToken, {
  parentFolderId,
  fileName,
  mimeType,
  buffer,
}) {
  const metadata = {
    name: fileName,
    parents: parentFolderId ? [parentFolderId] : undefined,
  };
  const boundary = `evocto_${Date.now()}`;
  const metaPart = JSON.stringify(metadata);
  const preamble = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metaPart}\r\n` +
      `--${boundary}\r\nContent-Type: ${mimeType || 'application/octet-stream'}\r\n\r\n`,
    'utf8'
  );
  const closing = Buffer.from(`\r\n--${boundary}--`, 'utf8');
  const body = Buffer.concat([preamble, Buffer.from(buffer), closing]);

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,md5Checksum,modifiedTime',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || 'drive_upload_failed');
  }
  return data;
}

export async function getDriveFileMetadata(accessToken, fileId) {
  const res = await driveFetch(
    accessToken,
    `/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,size,md5Checksum,modifiedTime,trashed`
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error?.message || 'file_metadata_failed');
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function initiateResumableUpload(accessToken, {
  parentFolderId,
  fileName,
  mimeType,
  fileSize,
}) {
  const metadata = {
    name: fileName,
    parents: parentFolderId ? [parentFolderId] : undefined,
  };
  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,mimeType,size,md5Checksum,modifiedTime',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': mimeType || 'application/octet-stream',
        'X-Upload-Content-Length': String(fileSize),
      },
      body: JSON.stringify(metadata),
    }
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error?.message || 'resumable_init_failed');
  }
  const uploadUrl = res.headers.get('location') || res.headers.get('Location');
  if (!uploadUrl) throw new Error('resumable_url_missing');
  return { uploadUrl };
}

export async function putResumableChunk(uploadUrl, {
  buffer,
  offset,
  total,
  mimeType,
}) {
  const end = offset + buffer.length - 1;
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': mimeType || 'application/octet-stream',
      'Content-Length': String(buffer.length),
      'Content-Range': `bytes ${offset}-${end}/${total}`,
    },
    body: buffer,
  });

  // 308 Resume Incomplete — chunk accepted, not finished
  if (res.status === 308) {
    const range = res.headers.get('range') || res.headers.get('Range') || '';
    return { done: false, range, status: 308 };
  }

  if (res.status === 200 || res.status === 201) {
    const data = await res.json().catch(() => ({}));
    return { done: true, file: data, status: res.status };
  }

  const errText = await res.text().catch(() => '');
  throw new Error(`resumable_put_failed_${res.status}: ${errText.slice(0, 200)}`);
}

export async function downloadDriveFileRange(accessToken, fileId, rangeHeader) {
  const headers = { Authorization: `Bearer ${accessToken}` };
  if (rangeHeader) headers.Range = rangeHeader;
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
    { headers }
  );
  if (!res.ok && res.status !== 206) {
    const data = await res.json().catch(() => ({}));
    const err = new Error(data?.error?.message || 'file_download_failed');
    err.status = res.status;
    throw err;
  }
  const arrayBuffer = await res.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    status: res.status,
    contentType: res.headers.get('content-type') || 'application/octet-stream',
    contentRange: res.headers.get('content-range') || null,
    contentLength: res.headers.get('content-length') || null,
    acceptRanges: res.headers.get('accept-ranges') || 'bytes',
  };
}

export async function downloadDriveFile(accessToken, fileId) {
  const result = await downloadDriveFileRange(accessToken, fileId, null);
  return { buffer: result.buffer, contentType: result.contentType };
}

export async function getAgencyDriveConnection(tables, databaseId, agencyId) {
  const result = await tables.listRows({
    databaseId,
    tableId: 'agency_drive_connections',
    queries: [Query.equal('agencyId', agencyId), Query.limit(1)],
  });
  const row = result.rows?.[0] || result.documents?.[0];
  return row ? parsePayload(row) : null;
}

export function publicDriveStatus(conn) {
  if (!conn) {
    return { connected: false, status: 'disconnected' };
  }
  return {
    connected: conn.status === 'active',
    status: conn.status || 'unknown',
    googleEmail: conn.googleEmail || null,
    connectedAt: conn.connectedAt || null,
    lastError: conn.lastError || null,
  };
}

/**
 * Returns a usable access token for the agency Drive connection.
 * Marks needs_reauth on refresh failure.
 */
export async function getAgencyAccessToken(agencyId) {
  const { tables, databaseId } = getAdminTables();
  const conn = await getAgencyDriveConnection(tables, databaseId, agencyId);
  if (!conn || conn.status === 'revoked') {
    const err = new Error('drive_not_connected');
    err.code = 'drive_not_connected';
    throw err;
  }
  if (!conn.encryptedRefreshToken) {
    const err = new Error('drive_missing_refresh');
    err.code = 'drive_needs_reauth';
    throw err;
  }

  let refreshToken;
  try {
    refreshToken = decryptSecret(conn.encryptedRefreshToken);
  } catch {
    const err = new Error('drive_decrypt_failed');
    err.code = 'drive_needs_reauth';
    throw err;
  }

  try {
    const tokens = await refreshAccessToken(refreshToken);
    await tables.updateRow({
      databaseId,
      tableId: 'agency_drive_connections',
      rowId: conn.id,
      data: splitTyped(DRIVE_CONNECTION_COLUMNS, {
        lastRefreshAt: new Date().toISOString(),
        lastError: null,
        status: 'active',
      }),
    });
    return {
      accessToken: tokens.access_token,
      connection: conn,
      tables,
      databaseId,
    };
  } catch (err) {
    await tables.updateRow({
      databaseId,
      tableId: 'agency_drive_connections',
      rowId: conn.id,
      data: splitTyped(DRIVE_CONNECTION_COLUMNS, {
        status: 'needs_reauth',
        lastError: String(err.message || 'refresh_failed').slice(0, 500),
      }),
    });
    const e = new Error('drive_needs_reauth');
    e.code = 'drive_needs_reauth';
    throw e;
  }
}

export async function upsertDriveConnection({
  agencyId,
  userId,
  googleAccountId,
  googleEmail,
  refreshToken,
  rootFolderId,
  scopes,
}) {
  const { tables, databaseId } = getAdminTables();
  const existing = await getAgencyDriveConnection(tables, databaseId, agencyId);
  const encryptedRefreshToken = encryptSecret(refreshToken);
  const data = splitTyped(DRIVE_CONNECTION_COLUMNS, {
    agencyId,
    googleAccountId,
    googleEmail,
    encryptedRefreshToken,
    rootFolderId,
    status: 'active',
    scopes: scopes || DRIVE_SCOPES,
    connectedBy: userId,
    connectedAt: new Date().toISOString(),
    lastRefreshAt: new Date().toISOString(),
    revokedAt: null,
    lastError: null,
  });

  if (existing?.id) {
    await tables.updateRow({
      databaseId,
      tableId: 'agency_drive_connections',
      rowId: existing.id,
      data,
    });
    return existing.id;
  }

  const rowId = ID.unique();
  await tables.createRow({
    databaseId,
    tableId: 'agency_drive_connections',
    rowId,
    data,
  });
  return rowId;
}

export async function revokeDriveConnection(agencyId) {
  const { tables, databaseId } = getAdminTables();
  const conn = await getAgencyDriveConnection(tables, databaseId, agencyId);
  if (!conn) return false;
  await tables.updateRow({
    databaseId,
    tableId: 'agency_drive_connections',
    rowId: conn.id,
    data: splitTyped(DRIVE_CONNECTION_COLUMNS, {
      status: 'revoked',
      revokedAt: new Date().toISOString(),
      encryptedRefreshToken: '',
      lastError: null,
    }),
  });
  return true;
}

export { DRIVE_SCOPES };
