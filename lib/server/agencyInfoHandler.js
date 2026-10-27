/**
 * CRUD de itens da Central de Informações da Agência (não-secretos).
 *
 * GET  /api/agency-info?route=list
 * GET  /api/agency-info?route=get&itemId=
 * POST /api/agency-info?route=create
 * POST /api/agency-info?route=update
 * POST /api/agency-info?route=delete   (soft → status=archived)
 *
 * Auth: Bearer JWT Appwrite — somente equipe da agência (requireAgencyStaff).
 */
import {
  requireAgencyStaff,
  parsePayload,
  splitTyped,
  writeAudit,
  ID,
  Query,
} from './materialAppwrite.js';
import {
  AGENCY_INFO_ITEMS_TABLE,
  ITEM_COLUMNS,
  ITEM_TYPES,
  matchesSearchQuery,
  redactSecrets,
  toItemDto,
  validateItemWrite,
} from './agencyInfoSchema.js';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function parseBody(req) {
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body || '{}');
    } catch {
      const err = new Error('invalid_json');
      err.status = 400;
      throw err;
    }
  }
  return body && typeof body === 'object' ? body : {};
}

function resolveRoute(req) {
  return String(req.query?.route || req.query?.action || '').trim() || 'list';
}

function safeError(res, err, fallbackMessage = 'Erro interno') {
  const status = Number(err?.status) || 500;
  const code = err?.code || (status >= 500 ? 'internal' : 'error');
  const message = err?.publicMessage || (status < 500 ? err?.message : fallbackMessage);
  if (status >= 500) {
    console.error('[agency-info]', err?.code || err?.message || err);
  }
  res.status(status).json({ error: code, message });
}

function parseBoolQuery(value) {
  if (value == null || value === '') return null;
  const s = String(value).trim().toLowerCase();
  if (s === 'true' || s === '1') return true;
  if (s === 'false' || s === '0') return false;
  return null;
}

function clampLimit(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 50;
  return Math.min(100, Math.floor(n));
}

async function loadItemForAgency(tables, databaseId, itemId, agencyId) {
  let row;
  try {
    row = await tables.getRow({
      databaseId,
      tableId: AGENCY_INFO_ITEMS_TABLE,
      rowId: itemId,
    });
  } catch {
    const err = new Error('Item não encontrado');
    err.status = 404;
    err.code = 'item_not_found';
    throw err;
  }
  const item = parsePayload(row);
  if (item.agencyId !== agencyId) {
    const err = new Error('Item não encontrado');
    err.status = 404;
    err.code = 'item_not_found';
    throw err;
  }
  return item;
}

function assertDocumentHasSource(merged) {
  if (merged.type !== 'document') return;
  const has =
    String(merged.fileId || '').trim() ||
    String(merged.fileUrl || '').trim() ||
    String(merged.externalUrl || '').trim();
  if (!has) {
    const err = new Error('Documento precisa de fileId, fileUrl ou externalUrl');
    err.status = 400;
    err.code = 'validation_error';
    err.publicMessage = 'Documento precisa de fileId, fileUrl ou externalUrl';
    throw err;
  }
}

function assertLinkHasUrl(merged) {
  if (merged.type !== 'link') return;
  const url = String(merged.externalUrl || '').trim();
  if (!url) {
    const err = new Error('Link precisa de externalUrl');
    err.status = 400;
    err.code = 'validation_error';
    err.publicMessage = 'Link precisa de externalUrl';
    throw err;
  }
}

function buildRowData(fields) {
  return splitTyped(ITEM_COLUMNS, {
    agencyId: fields.agencyId,
    type: fields.type,
    title: fields.title,
    category: fields.category || '',
    status: fields.status || 'active',
    pinned: Boolean(fields.pinned),
    favorite: Boolean(fields.favorite),
    externalUrl: fields.externalUrl || '',
    fileId: fields.fileId || '',
    createdBy: fields.createdBy || '',
    updatedBy: fields.updatedBy || '',
    body: fields.body || '',
    tags: Array.isArray(fields.tags) ? fields.tags : [],
    fileUrl: fields.fileUrl || '',
    fileName: fields.fileName || '',
    fileMimeType: fields.fileMimeType || '',
    fileSize: fields.fileSize == null ? null : fields.fileSize,
    summary: fields.summary || '',
  });
}

async function handleList(auth, req, res) {
  const type = String(req.query?.type || '').trim();
  const category = String(req.query?.category || '').trim();
  const statusRaw = String(req.query?.status || 'active').trim() || 'active';
  const q = String(req.query?.q || '').trim();
  const pinned = parseBoolQuery(req.query?.pinned);
  const favorite = parseBoolQuery(req.query?.favorite);
  const limit = clampLimit(req.query?.limit);

  if (type && !ITEM_TYPES.includes(type)) {
    res.status(400).json({ error: 'invalid_type', message: 'type inválido' });
    return;
  }

  const queries = [Query.equal('agencyId', auth.agencyId), Query.limit(limit), Query.orderDesc('$updatedAt')];

  if (statusRaw !== 'all') {
    queries.push(Query.equal('status', statusRaw));
  }
  if (type) queries.push(Query.equal('type', type));
  if (category) queries.push(Query.equal('category', category));
  if (pinned === true) queries.push(Query.equal('pinned', true));
  if (favorite === true) queries.push(Query.equal('favorite', true));

  const result = await auth.tables.listRows({
    databaseId: auth.databaseId,
    tableId: AGENCY_INFO_ITEMS_TABLE,
    queries,
  });

  let rows = (result.rows || result.documents || []).map(parsePayload);
  if (q) {
    rows = rows.filter((row) => matchesSearchQuery(row, q));
  }

  res.status(200).json({
    items: rows.map(toItemDto),
    meta: { count: rows.length, limit },
  });
}

async function handleGet(auth, req, res) {
  const itemId = String(req.query?.itemId || req.query?.id || '').trim();
  if (!itemId) {
    res.status(400).json({ error: 'invalid_request', message: 'itemId é obrigatório' });
    return;
  }
  const item = await loadItemForAgency(auth.tables, auth.databaseId, itemId, auth.agencyId);
  res.status(200).json({ item: toItemDto(item) });
}

async function handleCreate(auth, req, res) {
  const body = parseBody(req);
  const validated = validateItemWrite(body, { partial: false });
  if (!validated.valid) {
    res.status(400).json({
      error: 'validation_error',
      message: 'Dados inválidos',
      errors: validated.errors,
    });
    return;
  }

  const v = validated.value;
  const rowId = ID.unique();
  const data = buildRowData({
    ...v,
    agencyId: auth.agencyId,
    createdBy: auth.user.$id,
    updatedBy: auth.user.$id,
  });

  await auth.tables.createRow({
    databaseId: auth.databaseId,
    tableId: AGENCY_INFO_ITEMS_TABLE,
    rowId,
    data,
  });

  await writeAudit(auth.tables, auth.databaseId, {
    agencyId: auth.agencyId,
    entityType: 'agency_info_item',
    entityId: rowId,
    action: 'create',
    actorId: auth.user.$id,
    meta: { type: v.type, title: v.title },
  });

  const created = await loadItemForAgency(auth.tables, auth.databaseId, rowId, auth.agencyId);
  res.status(201).json({ item: toItemDto(created) });
}

async function handleUpdate(auth, req, res) {
  const body = parseBody(req);
  const itemId = String(body.itemId || body.id || '').trim();
  if (!itemId) {
    res.status(400).json({ error: 'invalid_request', message: 'itemId é obrigatório' });
    return;
  }

  const validated = validateItemWrite(body, { partial: true });
  if (!validated.valid) {
    res.status(400).json({
      error: 'validation_error',
      message: 'Dados inválidos',
      errors: validated.errors,
    });
    return;
  }

  const existing = await loadItemForAgency(auth.tables, auth.databaseId, itemId, auth.agencyId);
  const merged = {
    ...existing,
    ...validated.value,
    agencyId: auth.agencyId,
    createdBy: existing.createdBy || auth.user.$id,
    updatedBy: auth.user.$id,
  };

  assertLinkHasUrl(merged);
  assertDocumentHasSource(merged);

  const data = buildRowData(merged);

  await auth.tables.updateRow({
    databaseId: auth.databaseId,
    tableId: AGENCY_INFO_ITEMS_TABLE,
    rowId: itemId,
    data,
  });

  await writeAudit(auth.tables, auth.databaseId, {
    agencyId: auth.agencyId,
    entityType: 'agency_info_item',
    entityId: itemId,
    action: 'update',
    actorId: auth.user.$id,
    meta: { type: merged.type, title: merged.title },
  });

  const updated = await loadItemForAgency(auth.tables, auth.databaseId, itemId, auth.agencyId);
  res.status(200).json({ item: toItemDto(updated) });
}

async function handleDelete(auth, req, res) {
  const body = parseBody(req);
  const itemId = String(body.itemId || body.id || '').trim();
  if (!itemId) {
    res.status(400).json({ error: 'invalid_request', message: 'itemId é obrigatório' });
    return;
  }

  const existing = await loadItemForAgency(auth.tables, auth.databaseId, itemId, auth.agencyId);
  const merged = {
    ...existing,
    status: 'archived',
    agencyId: auth.agencyId,
    createdBy: existing.createdBy || auth.user.$id,
    updatedBy: auth.user.$id,
  };

  const data = buildRowData(merged);

  await auth.tables.updateRow({
    databaseId: auth.databaseId,
    tableId: AGENCY_INFO_ITEMS_TABLE,
    rowId: itemId,
    data,
  });

  await writeAudit(auth.tables, auth.databaseId, {
    agencyId: auth.agencyId,
    entityType: 'agency_info_item',
    entityId: itemId,
    action: 'archive',
    actorId: auth.user.$id,
    meta: { type: existing.type || '', title: existing.title || '' },
  });

  const archived = await loadItemForAgency(auth.tables, auth.databaseId, itemId, auth.agencyId);
  res.status(200).json({ ok: true, item: toItemDto(archived) });
}

export default async function agencyInfoHandler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const route = resolveRoute(req);
  const auth = await requireAgencyStaff(req, res);
  if (!auth) return;

  try {
    if (req.method === 'GET') {
      if (route === 'list') {
        await handleList(auth, req, res);
        return;
      }
      if (route === 'get') {
        await handleGet(auth, req, res);
        return;
      }
      res.status(400).json({ error: 'unknown_route', message: `Rota GET desconhecida: ${route}` });
      return;
    }

    if (req.method === 'POST') {
      if (route === 'create') {
        await handleCreate(auth, req, res);
        return;
      }
      if (route === 'update') {
        await handleUpdate(auth, req, res);
        return;
      }
      if (route === 'delete') {
        await handleDelete(auth, req, res);
        return;
      }
      res.status(400).json({ error: 'unknown_route', message: `Rota POST desconhecida: ${route}` });
      return;
    }

    res.status(405).json({ error: 'method_not_allowed', message: 'Método não permitido' });
  } catch (err) {
    if (err?.status && err.status < 500) {
      if (err.code === 'validation_error') {
        res.status(400).json({
          error: 'validation_error',
          message: err.publicMessage || err.message || 'Dados inválidos',
        });
        return;
      }
      safeError(res, err);
      return;
    }
    console.error(
      '[agency-info] unexpected',
      redactSecrets({ message: err?.message, code: err?.code })
    );
    safeError(res, err);
  }
}
