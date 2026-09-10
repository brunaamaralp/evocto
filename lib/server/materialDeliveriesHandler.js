/**
 * Material deliveries API handler (Drive OAuth + deliverables + public review).
 * Entry: api/material-deliveries.js?route=...
 */
import {
  requireAgencyStaff,
  getAdminTables,
  getAdminStorage,
  getEnvConfig,
  parsePayload,
  splitTyped,
  writeAudit,
  notifyAgencyUsers,
  MATERIAL_DELIVERY_COLUMNS,
  MATERIAL_VERSION_COLUMNS,
  APPROVAL_REQUEST_COLUMNS,
  ID,
  Query,
} from './materialAppwrite.js';
import {
  generatePublicToken,
  hashToken,
  signOAuthState,
  verifyOAuthState,
  sha256Buffer,
} from './materialCrypto.js';
import {
  buildGoogleAuthUrl,
  exchangeCodeForTokens,
  fetchGoogleUserInfo,
  ensureRootFolder,
  ensureChildFolder,
  uploadBufferToDrive,
  getDriveFileMetadata,
  downloadDriveFile,
  getAgencyDriveConnection,
  publicDriveStatus,
  getAgencyAccessToken,
  upsertDriveConnection,
  revokeDriveConnection,
} from './googleDrive.js';

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'application/pdf',
]);

const MAX_FILE_BYTES = Number(process.env.MATERIAL_MAX_FILE_BYTES || 50 * 1024 * 1024);

function json(res, status, body) {
  res.status(status).json(body);
}

function readBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body || '{}');
    } catch {
      return {};
    }
  }
  return req.body;
}

function publicOrigin(req) {
  const cfg = getEnvConfig();
  if (cfg.publicAppUrl) return cfg.publicAppUrl;
  const proto = String(req.headers['x-forwarded-proto'] || 'https');
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '');
  return host ? `${proto}://${host}` : '';
}

function buildReviewUrl(req, rawToken) {
  return `${publicOrigin(req)}/review/${encodeURIComponent(rawToken)}`;
}

function isOwnerOrAdmin(role) {
  return role === 'owner' || role === 'admin';
}

async function getDelivery(tables, databaseId, deliveryId) {
  const row = await tables.getRow({
    databaseId,
    tableId: 'material_deliveries',
    rowId: deliveryId,
  });
  return parsePayload(row);
}

async function getVersion(tables, databaseId, versionId) {
  const row = await tables.getRow({
    databaseId,
    tableId: 'material_delivery_versions',
    rowId: versionId,
  });
  return parsePayload(row);
}

async function findApprovalByTokenHash(tables, databaseId, tokenHash) {
  const result = await tables.listRows({
    databaseId,
    tableId: 'approval_requests',
    queries: [
      Query.equal('token', tokenHash),
      Query.equal('contentType', 'material_delivery'),
      Query.limit(1),
    ],
  });
  const row = result.rows?.[0] || result.documents?.[0];
  return row ? parsePayload(row) : null;
}

async function resolvePublicReview(tables, databaseId, rawToken) {
  const tokenHash = hashToken(rawToken);
  const approval = await findApprovalByTokenHash(tables, databaseId, tokenHash);
  if (!approval) return { error: 'not_found', status: 404 };
  if (approval.status === 'revoked') return { error: 'revoked', status: 410 };
  if (approval.expiresAt && new Date(approval.expiresAt) < new Date()) {
    return { error: 'expired', status: 410 };
  }
  if (approval.status !== 'active') return { error: 'inactive', status: 410 };

  const deliveryId = approval.contentId;
  if (!deliveryId) return { error: 'invalid_link', status: 400 };
  const delivery = await getDelivery(tables, databaseId, deliveryId);
  if (!delivery || delivery.archivedAt) return { error: 'not_found', status: 404 };

  let version = null;
  if (delivery.currentVersionId) {
    version = await getVersion(tables, databaseId, delivery.currentVersionId);
  }
  return { approval, delivery, version };
}

async function handleDriveStatus(req, res) {
  const ctx = await requireAgencyStaff(req, res);
  if (!ctx) return;
  const conn = await getAgencyDriveConnection(ctx.tables, ctx.databaseId, ctx.agencyId);
  return json(res, 200, { ok: true, ...publicDriveStatus(conn) });
}

async function handleDriveConnect(req, res) {
  const ctx = await requireAgencyStaff(req, res);
  if (!ctx) return;
  if (!isOwnerOrAdmin(ctx.role)) {
    return json(res, 403, { error: 'forbidden', message: 'Somente owner/admin conecta o Drive' });
  }
  try {
    const state = signOAuthState({
      agencyId: ctx.agencyId,
      userId: ctx.user.$id,
      exp: Date.now() + 15 * 60 * 1000,
    });
    const url = buildGoogleAuthUrl(state);
    return json(res, 200, { ok: true, url });
  } catch (err) {
    return json(res, 500, { error: 'oauth_config', message: err.message });
  }
}

async function handleDriveCallback(req, res) {
  const code = String(req.query.code || '').trim();
  const state = String(req.query.state || '').trim();
  const oauthError = String(req.query.error || '').trim();
  const origin = publicOrigin(req);
  const settingsUrl = `${origin}/settings?tab=integrations`;

  if (oauthError) {
    res.writeHead(302, { Location: `${settingsUrl}&drive=error` });
    return res.end();
  }

  try {
    const payload = verifyOAuthState(state);
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.refresh_token) {
      // May happen if previously granted — keep existing if present
      console.warn('[materialDeliveries] OAuth sem refresh_token');
    }
    const info = await fetchGoogleUserInfo(tokens.access_token);
    const rootFolderId = await ensureRootFolder(tokens.access_token);

    const { tables, databaseId } = getAdminTables();
    const existing = await getAgencyDriveConnection(tables, databaseId, payload.agencyId);
    let refreshToken = tokens.refresh_token;
    if (!refreshToken && existing?.encryptedRefreshToken) {
      // keep previous — upsertDriveConnection requires refresh; skip overwrite of token
      const { decryptSecret } = await import('./materialCrypto.js');
      refreshToken = decryptSecret(existing.encryptedRefreshToken);
    }
    if (!refreshToken) {
      throw new Error('refresh_token_missing');
    }

    await upsertDriveConnection({
      agencyId: payload.agencyId,
      userId: payload.userId,
      googleAccountId: String(info.id || info.sub || ''),
      googleEmail: String(info.email || ''),
      refreshToken,
      rootFolderId,
    });

    await writeAudit(tables, databaseId, {
      agencyId: payload.agencyId,
      entityType: 'agency_drive_connections',
      entityId: payload.agencyId,
      action: 'DRIVE_CONNECTED',
      actorId: payload.userId,
      meta: { googleEmail: info.email },
    });

    res.writeHead(302, { Location: `${settingsUrl}&drive=connected` });
    return res.end();
  } catch (err) {
    console.error('[materialDeliveries] drive-callback', err);
    res.writeHead(302, { Location: `${settingsUrl}&drive=error` });
    return res.end();
  }
}

async function handleDriveDisconnect(req, res) {
  const ctx = await requireAgencyStaff(req, res);
  if (!ctx) return;
  if (!isOwnerOrAdmin(ctx.role)) {
    return json(res, 403, { error: 'forbidden' });
  }
  await revokeDriveConnection(ctx.agencyId);
  await writeAudit(ctx.tables, ctx.databaseId, {
    agencyId: ctx.agencyId,
    entityType: 'agency_drive_connections',
    entityId: ctx.agencyId,
    action: 'DRIVE_DISCONNECTED',
    actorId: ctx.user.$id,
  });
  return json(res, 200, { ok: true });
}

async function createApprovalLink(tables, databaseId, {
  agencyId,
  clientId,
  serviceId,
  deliveryId,
  createdBy,
}) {
  const rawToken = generatePublicToken();
  const tokenHash = hashToken(rawToken);
  const approvalId = ID.unique();
  await tables.createRow({
    databaseId,
    tableId: 'approval_requests',
    rowId: approvalId,
    data: splitTyped(APPROVAL_REQUEST_COLUMNS, {
      agencyId,
      clientId,
      status: 'active',
      token: tokenHash,
      contentType: 'material_delivery',
      contentId: deliveryId,
      serviceId,
      expiresAt: null,
      createdBy,
    }),
  });
  return { approvalId, rawToken, tokenHash };
}

async function handleCreateDelivery(req, res) {
  const ctx = await requireAgencyStaff(req, res);
  if (!ctx) return;
  const body = readBody(req);
  const title = String(body.title || '').trim();
  const serviceId = String(body.serviceId || '').trim();
  if (!title || !serviceId) {
    return json(res, 400, { error: 'invalid', message: 'title e serviceId obrigatórios' });
  }

  const serviceRow = await ctx.tables.getRow({
    databaseId: ctx.databaseId,
    tableId: 'services',
    rowId: serviceId,
  });
  const service = parsePayload(serviceRow);
  if (!service || service.agencyId !== ctx.agencyId) {
    return json(res, 404, { error: 'service_not_found' });
  }
  if (!service.clientId) {
    return json(res, 400, { error: 'service_without_client' });
  }

  const deliveryId = ID.unique();
  const { approvalId, rawToken } = await createApprovalLink(ctx.tables, ctx.databaseId, {
    agencyId: ctx.agencyId,
    clientId: service.clientId,
    serviceId,
    deliveryId,
    createdBy: ctx.user.$id,
  });

  await ctx.tables.createRow({
    databaseId: ctx.databaseId,
    tableId: 'material_deliveries',
    rowId: deliveryId,
    data: splitTyped(MATERIAL_DELIVERY_COLUMNS, {
      agencyId: ctx.agencyId,
      clientId: service.clientId,
      serviceId,
      deliverableId: body.deliverableId || null,
      taskId: body.taskId || null,
      title,
      description: body.description || null,
      status: 'draft',
      latestVersionNumber: 0,
      currentVersionId: null,
      approvedVersionId: null,
      approvalRequestId: approvalId,
      createdBy: ctx.user.$id,
    }),
  });

  await writeAudit(ctx.tables, ctx.databaseId, {
    agencyId: ctx.agencyId,
    entityType: 'material_deliveries',
    entityId: deliveryId,
    action: 'MATERIAL_DELIVERY_CREATED',
    actorId: ctx.user.$id,
    meta: { title, serviceId },
  });

  return json(res, 201, {
    ok: true,
    delivery: {
      id: deliveryId,
      title,
      status: 'draft',
      serviceId,
      clientId: service.clientId,
      approvalRequestId: approvalId,
    },
    reviewUrl: buildReviewUrl(req, rawToken),
    // raw token only once — for copy link; stored hashed
    token: rawToken,
  });
}

async function handleListDeliveries(req, res) {
  const ctx = await requireAgencyStaff(req, res);
  if (!ctx) return;
  const serviceId = String(req.query.serviceId || '').trim();
  if (!serviceId) return json(res, 400, { error: 'serviceId_required' });

  const result = await ctx.tables.listRows({
    databaseId: ctx.databaseId,
    tableId: 'material_deliveries',
    queries: [
      Query.equal('agencyId', ctx.agencyId),
      Query.equal('serviceId', serviceId),
      Query.orderDesc('$createdAt'),
      Query.limit(100),
    ],
  });
  const deliveries = (result.rows || result.documents || [])
    .map(parsePayload)
    .filter((d) => !d.archivedAt);

  return json(res, 200, { ok: true, deliveries });
}

async function handleGetDelivery(req, res) {
  const ctx = await requireAgencyStaff(req, res);
  if (!ctx) return;
  const deliveryId = String(req.query.deliveryId || readBody(req).deliveryId || '').trim();
  if (!deliveryId) return json(res, 400, { error: 'deliveryId_required' });

  const delivery = await getDelivery(ctx.tables, ctx.databaseId, deliveryId);
  if (!delivery || delivery.agencyId !== ctx.agencyId) {
    return json(res, 404, { error: 'not_found' });
  }

  const versionsResult = await ctx.tables.listRows({
    databaseId: ctx.databaseId,
    tableId: 'material_delivery_versions',
    queries: [
      Query.equal('deliveryId', deliveryId),
      Query.orderAsc('versionNumber'),
      Query.limit(100),
    ],
  });
  const versions = (versionsResult.rows || versionsResult.documents || []).map(parsePayload);

  return json(res, 200, { ok: true, delivery, versions });
}

async function reserveVersionNumber(tables, databaseId, delivery, maxAttempts = 5) {
  for (let i = 0; i < maxAttempts; i++) {
    const fresh = await getDelivery(tables, databaseId, delivery.id);
    const current = Number(fresh.latestVersionNumber || 0);
    const next = current + 1;
    try {
      await tables.updateRow({
        databaseId,
        tableId: 'material_deliveries',
        rowId: fresh.id,
        data: splitTyped(MATERIAL_DELIVERY_COLUMNS, {
          latestVersionNumber: next,
        }),
      });
      // Verify no concurrent overwrite of counter incorrectly — unique index on versions protects
      return { next, delivery: { ...fresh, latestVersionNumber: next } };
    } catch (err) {
      if (i === maxAttempts - 1) throw err;
    }
  }
  throw new Error('version_reserve_failed');
}

async function handleUploadFromStorage(req, res) {
  const ctx = await requireAgencyStaff(req, res);
  if (!ctx) return;
  const body = readBody(req);
  const deliveryId = String(body.deliveryId || '').trim();
  const storageFileId = String(body.storageFileId || '').trim();
  const fileName = String(body.fileName || 'arquivo').trim();
  const mimeType = String(body.mimeType || 'application/octet-stream').trim().toLowerCase();
  const idempotencyKey = String(body.idempotencyKey || '').trim() || null;
  const submit = Boolean(body.submit);

  if (!deliveryId || !storageFileId) {
    return json(res, 400, { error: 'invalid', message: 'deliveryId e storageFileId obrigatórios' });
  }
  if (!ALLOWED_MIME.has(mimeType) && mimeType !== 'image/jpg') {
    return json(res, 400, {
      error: 'unsupported_type',
      message: 'Tipos permitidos: JPG, PNG, WEBP, MP4, MOV, PDF',
    });
  }

  const delivery = await getDelivery(ctx.tables, ctx.databaseId, deliveryId);
  if (!delivery || delivery.agencyId !== ctx.agencyId) {
    return json(res, 404, { error: 'not_found' });
  }
  if (delivery.status === 'cancelled' || delivery.archivedAt) {
    return json(res, 409, { error: 'delivery_closed' });
  }

  if (idempotencyKey) {
    const existing = await ctx.tables.listRows({
      databaseId: ctx.databaseId,
      tableId: 'material_delivery_versions',
      queries: [Query.equal('idempotencyKey', idempotencyKey), Query.limit(1)],
    });
    const row = existing.rows?.[0] || existing.documents?.[0];
    if (row) {
      return json(res, 200, { ok: true, version: parsePayload(row), idempotent: true });
    }
  }

  let access;
  try {
    access = await getAgencyAccessToken(ctx.agencyId);
  } catch (err) {
    return json(res, 409, {
      error: err.code || 'drive_error',
      message: 'Conecte o Google Drive da agência em Configurações',
    });
  }

  const { storage, bucketId } = getAdminStorage();
  let fileBuffer;
  try {
    const downloaded = await storage.getFileDownload({ bucketId, fileId: storageFileId });
    fileBuffer = Buffer.isBuffer(downloaded)
      ? downloaded
      : Buffer.from(downloaded);
  } catch (err) {
    return json(res, 400, { error: 'storage_file_missing', message: err.message });
  }

  if (fileBuffer.length > MAX_FILE_BYTES) {
    return json(res, 400, {
      error: 'file_too_large',
      message: `Arquivo excede ${Math.round(MAX_FILE_BYTES / (1024 * 1024))}MB`,
    });
  }

  const { next: versionNumber } = await reserveVersionNumber(
    ctx.tables,
    ctx.databaseId,
    delivery
  );
  const versionId = ID.unique();

  await ctx.tables.createRow({
    databaseId: ctx.databaseId,
    tableId: 'material_delivery_versions',
    rowId: versionId,
    data: splitTyped(MATERIAL_VERSION_COLUMNS, {
      agencyId: ctx.agencyId,
      deliveryId,
      versionNumber,
      reviewStatus: 'uploading',
      fileName,
      mimeType,
      fileSize: fileBuffer.length,
      createdBy: ctx.user.$id,
      idempotencyKey,
    }),
  });

  try {
    // Ensure folder tree: Evocto / Client / Service / Delivery
    let clientName = delivery.clientId;
    let serviceName = delivery.serviceId;
    try {
      const client = parsePayload(
        await ctx.tables.getRow({
          databaseId: ctx.databaseId,
          tableId: 'clients',
          rowId: delivery.clientId,
        })
      );
      clientName = client.name || clientName;
    } catch {
      /* ignore */
    }
    try {
      const service = parsePayload(
        await ctx.tables.getRow({
          databaseId: ctx.databaseId,
          tableId: 'services',
          rowId: delivery.serviceId,
        })
      );
      serviceName = service.name || serviceName;
    } catch {
      /* ignore */
    }

    const rootId = access.connection.rootFolderId || (await ensureRootFolder(access.accessToken));
    const clientFolderId = await ensureChildFolder(access.accessToken, rootId, clientName);
    const serviceFolderId = await ensureChildFolder(access.accessToken, clientFolderId, serviceName);
    const deliveryFolderId =
      delivery.driveFolderId ||
      (await ensureChildFolder(access.accessToken, serviceFolderId, delivery.title));

    if (!delivery.driveFolderId) {
      await ctx.tables.updateRow({
        databaseId: ctx.databaseId,
        tableId: 'material_deliveries',
        rowId: deliveryId,
        data: splitTyped(MATERIAL_DELIVERY_COLUMNS, { driveFolderId: deliveryFolderId }),
      });
    }

    const versionLabel = `v${versionNumber}-${fileName}`.slice(0, 200);
    const driveFile = await uploadBufferToDrive(access.accessToken, {
      parentFolderId: deliveryFolderId,
      fileName: versionLabel,
      mimeType,
      buffer: fileBuffer,
    });

    const checksum = sha256Buffer(fileBuffer);
    const now = new Date().toISOString();
    const reviewStatus = submit ? 'submitted' : 'draft';

    await ctx.tables.updateRow({
      databaseId: ctx.databaseId,
      tableId: 'material_delivery_versions',
      rowId: versionId,
      data: splitTyped(MATERIAL_VERSION_COLUMNS, {
        driveFileId: driveFile.id,
        driveFolderId: deliveryFolderId,
        fileName,
        mimeType: driveFile.mimeType || mimeType,
        fileSize: Number(driveFile.size || fileBuffer.length),
        checksumSha256: checksum,
        driveModifiedTime: driveFile.modifiedTime || now,
        reviewStatus,
        submittedAt: submit ? now : null,
      }),
    });

    const deliveryPatch = {
      driveFolderId: deliveryFolderId,
    };
    if (submit) {
      deliveryPatch.currentVersionId = versionId;
      deliveryPatch.status = 'awaiting_approval';
    }

    await ctx.tables.updateRow({
      databaseId: ctx.databaseId,
      tableId: 'material_deliveries',
      rowId: deliveryId,
      data: splitTyped(MATERIAL_DELIVERY_COLUMNS, deliveryPatch),
    });

    // Best-effort cleanup of staging file
    try {
      await storage.deleteFile({ bucketId, fileId: storageFileId });
    } catch {
      /* ignore */
    }

    await writeAudit(ctx.tables, ctx.databaseId, {
      agencyId: ctx.agencyId,
      entityType: 'material_delivery_versions',
      entityId: versionId,
      action: submit ? 'MATERIAL_SUBMITTED_FOR_APPROVAL' : 'MATERIAL_VERSION_UPLOADED',
      actorId: ctx.user.$id,
      meta: { deliveryId, versionNumber, driveFileId: driveFile.id },
    });

    const version = await getVersion(ctx.tables, ctx.databaseId, versionId);
    return json(res, 201, { ok: true, version });
  } catch (err) {
    console.error('[materialDeliveries] upload', err);
    await ctx.tables.updateRow({
      databaseId: ctx.databaseId,
      tableId: 'material_delivery_versions',
      rowId: versionId,
      data: splitTyped(MATERIAL_VERSION_COLUMNS, {
        reviewStatus: 'failed',
        feedback: String(err.message || 'upload_failed').slice(0, 500),
      }),
    });
    await writeAudit(ctx.tables, ctx.databaseId, {
      agencyId: ctx.agencyId,
      entityType: 'material_delivery_versions',
      entityId: versionId,
      action: 'DRIVE_UPLOAD_FAILED',
      actorId: ctx.user.$id,
      meta: { deliveryId, message: err.message },
    });
    return json(res, 500, { error: 'upload_failed', message: err.message });
  }
}

async function handleSubmitVersion(req, res) {
  const ctx = await requireAgencyStaff(req, res);
  if (!ctx) return;
  const body = readBody(req);
  const versionId = String(body.versionId || '').trim();
  if (!versionId) return json(res, 400, { error: 'versionId_required' });

  const version = await getVersion(ctx.tables, ctx.databaseId, versionId);
  if (!version || version.agencyId !== ctx.agencyId) {
    return json(res, 404, { error: 'not_found' });
  }
  if (!version.driveFileId || !['draft', 'failed'].includes(version.reviewStatus)) {
    if (version.reviewStatus !== 'draft') {
      return json(res, 409, { error: 'invalid_status', message: 'Versão não pode ser enviada' });
    }
  }
  if (!version.driveFileId) {
    return json(res, 409, { error: 'missing_file' });
  }

  const delivery = await getDelivery(ctx.tables, ctx.databaseId, version.deliveryId);
  const now = new Date().toISOString();

  await ctx.tables.updateRow({
    databaseId: ctx.databaseId,
    tableId: 'material_delivery_versions',
    rowId: versionId,
    data: splitTyped(MATERIAL_VERSION_COLUMNS, {
      reviewStatus: 'submitted',
      submittedAt: now,
    }),
  });

  await ctx.tables.updateRow({
    databaseId: ctx.databaseId,
    tableId: 'material_deliveries',
    rowId: delivery.id,
    data: splitTyped(MATERIAL_DELIVERY_COLUMNS, {
      currentVersionId: versionId,
      status: 'awaiting_approval',
    }),
  });

  await writeAudit(ctx.tables, ctx.databaseId, {
    agencyId: ctx.agencyId,
    entityType: 'material_deliveries',
    entityId: delivery.id,
    action: 'MATERIAL_SUBMITTED_FOR_APPROVAL',
    actorId: ctx.user.$id,
    meta: { versionId, versionNumber: version.versionNumber },
  });

  return json(res, 200, { ok: true });
}

async function handleRegenerateToken(req, res) {
  const ctx = await requireAgencyStaff(req, res);
  if (!ctx) return;
  if (!isOwnerOrAdmin(ctx.role)) {
    return json(res, 403, { error: 'forbidden' });
  }
  const body = readBody(req);
  const deliveryId = String(body.deliveryId || '').trim();
  const delivery = await getDelivery(ctx.tables, ctx.databaseId, deliveryId);
  if (!delivery || delivery.agencyId !== ctx.agencyId) {
    return json(res, 404, { error: 'not_found' });
  }
  if (!delivery.approvalRequestId) {
    return json(res, 400, { error: 'no_approval_request' });
  }

  const rawToken = generatePublicToken();
  const tokenHash = hashToken(rawToken);
  await ctx.tables.updateRow({
    databaseId: ctx.databaseId,
    tableId: 'approval_requests',
    rowId: delivery.approvalRequestId,
    data: splitTyped(APPROVAL_REQUEST_COLUMNS, {
      token: tokenHash,
      status: 'active',
    }),
  });

  await writeAudit(ctx.tables, ctx.databaseId, {
    agencyId: ctx.agencyId,
    entityType: 'material_deliveries',
    entityId: deliveryId,
    action: 'MATERIAL_TOKEN_REGENERATED',
    actorId: ctx.user.$id,
  });

  return json(res, 200, {
    ok: true,
    token: rawToken,
    reviewUrl: buildReviewUrl(req, rawToken),
  });
}

async function handleReopen(req, res) {
  const ctx = await requireAgencyStaff(req, res);
  if (!ctx) return;
  if (!isOwnerOrAdmin(ctx.role)) {
    return json(res, 403, { error: 'forbidden' });
  }
  const body = readBody(req);
  const deliveryId = String(body.deliveryId || '').trim();
  const delivery = await getDelivery(ctx.tables, ctx.databaseId, deliveryId);
  if (!delivery || delivery.agencyId !== ctx.agencyId) {
    return json(res, 404, { error: 'not_found' });
  }
  if (delivery.status !== 'approved') {
    return json(res, 409, { error: 'not_approved' });
  }

  await ctx.tables.updateRow({
    databaseId: ctx.databaseId,
    tableId: 'material_deliveries',
    rowId: deliveryId,
    data: splitTyped(MATERIAL_DELIVERY_COLUMNS, {
      status: 'awaiting_approval',
    }),
  });

  await writeAudit(ctx.tables, ctx.databaseId, {
    agencyId: ctx.agencyId,
    entityType: 'material_deliveries',
    entityId: deliveryId,
    action: 'MATERIAL_APPROVAL_REOPENED',
    actorId: ctx.user.$id,
    meta: { approvedVersionId: delivery.approvedVersionId },
  });

  return json(res, 200, { ok: true });
}

async function handlePublicReview(req, res) {
  const rawToken = String(req.query.token || readBody(req).token || '').trim();
  if (!rawToken) return json(res, 400, { error: 'token_required' });
  const { tables, databaseId } = getAdminTables();
  const resolved = await resolvePublicReview(tables, databaseId, rawToken);
  if (resolved.error) return json(res, resolved.status, { error: resolved.error });

  const { delivery, version } = resolved;
  const previewable =
    version?.mimeType &&
    (version.mimeType.startsWith('image/') ||
      version.mimeType === 'application/pdf' ||
      version.mimeType.startsWith('video/'));

  return json(res, 200, {
    ok: true,
    delivery: {
      id: delivery.id,
      title: delivery.title,
      description: delivery.description || null,
      status: delivery.status,
    },
    version: version
      ? {
          id: version.id,
          versionNumber: version.versionNumber,
          fileName: version.fileName,
          mimeType: version.mimeType,
          fileSize: version.fileSize,
          reviewStatus: version.reviewStatus,
          feedback: version.feedback || null,
          submittedAt: version.submittedAt || null,
        }
      : null,
    canDecide: delivery.status === 'awaiting_approval' && version?.reviewStatus === 'submitted',
    previewable: Boolean(previewable && version?.driveFileId),
  });
}

async function handlePublicFile(req, res) {
  const rawToken = String(req.query.token || '').trim();
  if (!rawToken) return json(res, 400, { error: 'token_required' });
  const { tables, databaseId } = getAdminTables();
  const resolved = await resolvePublicReview(tables, databaseId, rawToken);
  if (resolved.error) return json(res, resolved.status, { error: resolved.error });
  const { delivery, version } = resolved;
  if (!version?.driveFileId) return json(res, 404, { error: 'file_missing' });

  let access;
  try {
    access = await getAgencyAccessToken(delivery.agencyId);
  } catch {
    return json(res, 503, { error: 'drive_unavailable' });
  }

  try {
    const meta = await getDriveFileMetadata(access.accessToken, version.driveFileId);
    if (meta.trashed) return json(res, 404, { error: 'file_missing' });
    if (
      version.driveModifiedTime &&
      meta.modifiedTime &&
      meta.modifiedTime !== version.driveModifiedTime
    ) {
      // Integrity warning — still stream for viewing, but clients shouldn't approve if blocked server-side
      res.setHeader('X-Evocto-Integrity', 'modified');
    }

    const { buffer, contentType } = await downloadDriveFile(
      access.accessToken,
      version.driveFileId
    );
    const mime = version.mimeType || contentType || 'application/octet-stream';
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Length', String(buffer.length));
    res.setHeader('Cache-Control', 'private, max-age=60');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(version.fileName || 'arquivo')}"`
    );
    res.status(200);
    return res.end(buffer);
  } catch (err) {
    console.error('[materialDeliveries] review-file', err);
    return json(res, err.status === 404 ? 404 : 502, {
      error: 'file_unavailable',
      message: err.message,
    });
  }
}

async function handleApprove(req, res) {
  const body = readBody(req);
  const rawToken = String(body.token || '').trim();
  const reviewerName = String(body.reviewerName || '').trim();
  const reviewerEmail = String(body.reviewerEmail || '').trim();
  if (!rawToken || !reviewerName) {
    return json(res, 400, { error: 'invalid', message: 'token e reviewerName obrigatórios' });
  }

  const { tables, databaseId } = getAdminTables();
  const resolved = await resolvePublicReview(tables, databaseId, rawToken);
  if (resolved.error) return json(res, resolved.status, { error: resolved.error });
  const { delivery, version } = resolved;

  if (delivery.status !== 'awaiting_approval' || version?.reviewStatus !== 'submitted') {
    return json(res, 409, { error: 'not_awaiting_approval' });
  }

  // Integrity check
  try {
    const access = await getAgencyAccessToken(delivery.agencyId);
    const meta = await getDriveFileMetadata(access.accessToken, version.driveFileId);
    if (
      version.driveModifiedTime &&
      meta.modifiedTime &&
      meta.modifiedTime !== version.driveModifiedTime
    ) {
      return json(res, 409, {
        error: 'integrity_warning',
        message: 'Arquivo foi alterado no Drive após o envio. Solicite nova versão à agência.',
      });
    }
  } catch {
    return json(res, 503, { error: 'drive_unavailable' });
  }

  const now = new Date().toISOString();
  await tables.updateRow({
    databaseId,
    tableId: 'material_delivery_versions',
    rowId: version.id,
    data: splitTyped(MATERIAL_VERSION_COLUMNS, {
      reviewStatus: 'approved',
      decision: 'approved',
      reviewerName,
      reviewerEmail: reviewerEmail || null,
      decidedAt: now,
    }),
  });
  await tables.updateRow({
    databaseId,
    tableId: 'material_deliveries',
    rowId: delivery.id,
    data: splitTyped(MATERIAL_DELIVERY_COLUMNS, {
      status: 'approved',
      approvedVersionId: version.id,
    }),
  });

  await writeAudit(tables, databaseId, {
    agencyId: delivery.agencyId,
    entityType: 'material_deliveries',
    entityId: delivery.id,
    action: 'MATERIAL_APPROVED',
    actorId: `public:${reviewerEmail || reviewerName}`,
    meta: { versionId: version.id, versionNumber: version.versionNumber, reviewerName },
  });
  await notifyAgencyUsers(tables, databaseId, {
    agencyId: delivery.agencyId,
    type: 'material_approved',
    title: 'Entrega aprovada',
    subject: `${delivery.title} — V${version.versionNumber}`,
    meta: { deliveryId: delivery.id, versionId: version.id },
  });

  return json(res, 200, { ok: true, status: 'approved' });
}

async function handleRequestChanges(req, res) {
  const body = readBody(req);
  const rawToken = String(body.token || '').trim();
  const reviewerName = String(body.reviewerName || '').trim();
  const reviewerEmail = String(body.reviewerEmail || '').trim();
  const feedback = String(body.feedback || body.comment || '').trim();
  if (!rawToken || !reviewerName || !feedback) {
    return json(res, 400, {
      error: 'invalid',
      message: 'token, reviewerName e comentário obrigatórios',
    });
  }

  const { tables, databaseId } = getAdminTables();
  const resolved = await resolvePublicReview(tables, databaseId, rawToken);
  if (resolved.error) return json(res, resolved.status, { error: resolved.error });
  const { delivery, version } = resolved;

  if (delivery.status !== 'awaiting_approval' || version?.reviewStatus !== 'submitted') {
    return json(res, 409, { error: 'not_awaiting_approval' });
  }

  const now = new Date().toISOString();
  await tables.updateRow({
    databaseId,
    tableId: 'material_delivery_versions',
    rowId: version.id,
    data: splitTyped(MATERIAL_VERSION_COLUMNS, {
      reviewStatus: 'changes_requested',
      decision: 'changes_requested',
      feedback,
      reviewerName,
      reviewerEmail: reviewerEmail || null,
      decidedAt: now,
    }),
  });
  await tables.updateRow({
    databaseId,
    tableId: 'material_deliveries',
    rowId: delivery.id,
    data: splitTyped(MATERIAL_DELIVERY_COLUMNS, {
      status: 'changes_requested',
    }),
  });

  await writeAudit(tables, databaseId, {
    agencyId: delivery.agencyId,
    entityType: 'material_deliveries',
    entityId: delivery.id,
    action: 'MATERIAL_CHANGES_REQUESTED',
    actorId: `public:${reviewerEmail || reviewerName}`,
    meta: { versionId: version.id, versionNumber: version.versionNumber, feedback },
  });
  await notifyAgencyUsers(tables, databaseId, {
    agencyId: delivery.agencyId,
    type: 'material_changes_requested',
    title: 'Alterações solicitadas',
    subject: `${delivery.title} — V${version.versionNumber}`,
    meta: { deliveryId: delivery.id, versionId: version.id },
  });

  return json(res, 200, { ok: true, status: 'changes_requested' });
}

export default async function materialDeliveriesHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const route = String(req.query.route || req.query.action || '').trim();

  try {
    if (route === 'drive-status' && req.method === 'GET') return handleDriveStatus(req, res);
    if (route === 'drive-connect' && (req.method === 'GET' || req.method === 'POST')) {
      return handleDriveConnect(req, res);
    }
    if (route === 'drive-callback' && req.method === 'GET') return handleDriveCallback(req, res);
    if (route === 'drive-disconnect' && req.method === 'POST') return handleDriveDisconnect(req, res);

    if (route === 'create' && req.method === 'POST') return handleCreateDelivery(req, res);
    if (route === 'list' && req.method === 'GET') return handleListDeliveries(req, res);
    if (route === 'get' && req.method === 'GET') return handleGetDelivery(req, res);
    if (route === 'upload-from-storage' && req.method === 'POST') {
      return handleUploadFromStorage(req, res);
    }
    if (route === 'submit' && req.method === 'POST') return handleSubmitVersion(req, res);
    if (route === 'regenerate-token' && req.method === 'POST') return handleRegenerateToken(req, res);
    if (route === 'reopen' && req.method === 'POST') return handleReopen(req, res);

    if (route === 'review' && req.method === 'GET') return handlePublicReview(req, res);
    if (route === 'review-file' && req.method === 'GET') return handlePublicFile(req, res);
    if (route === 'approve' && req.method === 'POST') return handleApprove(req, res);
    if (route === 'request-changes' && req.method === 'POST') return handleRequestChanges(req, res);

    return json(res, 404, { ok: false, error: 'route_not_found', route });
  } catch (err) {
    console.error('[materialDeliveries]', err);
    return json(res, 500, { ok: false, error: 'internal', message: err.message });
  }
}
