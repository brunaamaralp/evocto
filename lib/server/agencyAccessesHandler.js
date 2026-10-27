/**
 * CRUD de acessos/credenciais da agência (vault interno).
 *
 * GET  /api/agency-accesses?route=list
 * GET  /api/agency-accesses?route=reveal&accessId=
 * POST /api/agency-accesses?route=create
 * POST /api/agency-accesses?route=update
 * POST /api/agency-accesses?route=delete
 *
 * Auth: Bearer JWT Appwrite — somente equipe da agência (requireAgencyStaff).
 * Senhas: AES-256-GCM via materialCrypto; list nunca devolve plaintext.
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
  encryptSecret,
  decryptSecret,
  isMaterialEncryptionConfigured,
  MaterialCryptoConfigError,
} from './materialCrypto.js';
import {
  AGENCY_ACCESSES_TABLE,
  ACCESS_COLUMNS,
  redactSecrets,
  toAgencyAccessDto,
  validateAgencyAccessWrite,
} from './agencyAccessesSchema.js';

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
    console.error('[agency-accesses]', err?.code || err?.message || err);
  }
  res.status(status).json({ error: code, message });
}

function requireCrypto() {
  if (!isMaterialEncryptionConfigured()) {
    const err = new MaterialCryptoConfigError();
    err.status = 503;
    err.publicMessage = 'Criptografia de credenciais não configurada no servidor';
    throw err;
  }
}

async function loadAccessForAgency(tables, databaseId, accessId, agencyId) {
  let row;
  try {
    row = await tables.getRow({
      databaseId,
      tableId: AGENCY_ACCESSES_TABLE,
      rowId: accessId,
    });
  } catch {
    const err = new Error('Acesso não encontrado');
    err.status = 404;
    err.code = 'access_not_found';
    throw err;
  }
  const access = parsePayload(row);
  if (access.agencyId !== agencyId) {
    const err = new Error('Acesso não encontrado');
    err.status = 404;
    err.code = 'access_not_found';
    throw err;
  }
  return access;
}

async function handleList(auth, req, res) {
  const result = await auth.tables.listRows({
    databaseId: auth.databaseId,
    tableId: AGENCY_ACCESSES_TABLE,
    queries: [
      Query.equal('agencyId', auth.agencyId),
      Query.limit(100),
      Query.orderDesc('$updatedAt'),
    ],
  });
  const rows = (result.rows || result.documents || []).map(parsePayload);
  res.status(200).json({
    accesses: rows.map(toAgencyAccessDto),
    meta: { count: rows.length },
  });
}

async function handleReveal(auth, req, res) {
  requireCrypto();
  const accessId = String(req.query?.accessId || req.query?.id || '').trim();
  if (!accessId) {
    res.status(400).json({
      error: 'invalid_request',
      message: 'accessId é obrigatório',
    });
    return;
  }

  const access = await loadAccessForAgency(
    auth.tables,
    auth.databaseId,
    accessId,
    auth.agencyId
  );

  if (!access.encryptedPassword) {
    res.status(404).json({ error: 'no_password', message: 'Este acesso não tem senha cadastrada' });
    return;
  }

  let password;
  try {
    password = decryptSecret(access.encryptedPassword);
  } catch {
    const err = new Error('Não foi possível descriptografar a senha');
    err.status = 500;
    err.code = 'decrypt_failed';
    throw err;
  }

  await writeAudit(auth.tables, auth.databaseId, {
    agencyId: auth.agencyId,
    entityType: 'agency_access',
    entityId: accessId,
    action: 'reveal_password',
    actorId: auth.user.$id,
    meta: { platform: access.platform || '' },
  });

  res.status(200).json({
    accessId,
    password,
  });
}

async function handleCreate(auth, req, res) {
  requireCrypto();
  const body = parseBody(req);
  const validated = validateAgencyAccessWrite(body, {
    requirePassword: Boolean(body.password),
  });
  if (!validated.valid) {
    res.status(400).json({
      error: 'validation_error',
      message: 'Dados inválidos',
      errors: validated.errors,
    });
    return;
  }

  const { platform, url, username, notes, password } = validated.value;
  const encryptedPassword = password ? encryptSecret(password) : '';
  const rowId = ID.unique();
  const data = splitTyped(ACCESS_COLUMNS, {
    agencyId: auth.agencyId,
    platform,
    url,
    username,
    encryptedPassword,
    notes,
    createdBy: auth.user.$id,
  });

  await auth.tables.createRow({
    databaseId: auth.databaseId,
    tableId: AGENCY_ACCESSES_TABLE,
    rowId,
    data,
  });

  await writeAudit(auth.tables, auth.databaseId, {
    agencyId: auth.agencyId,
    entityType: 'agency_access',
    entityId: rowId,
    action: 'create',
    actorId: auth.user.$id,
    meta: { platform },
  });

  const created = await loadAccessForAgency(
    auth.tables,
    auth.databaseId,
    rowId,
    auth.agencyId
  );
  res.status(201).json({ access: toAgencyAccessDto(created) });
}

async function handleUpdate(auth, req, res) {
  requireCrypto();
  const body = parseBody(req);
  const accessId = String(body.accessId || body.id || '').trim();
  if (!accessId) {
    res.status(400).json({ error: 'invalid_access', message: 'accessId é obrigatório' });
    return;
  }

  const validated = validateAgencyAccessWrite(body, { requirePassword: false });
  if (!validated.valid) {
    res.status(400).json({
      error: 'validation_error',
      message: 'Dados inválidos',
      errors: validated.errors,
    });
    return;
  }

  const { platform, url, username, notes, password, clearPassword } = validated.value;
  const existing = await loadAccessForAgency(
    auth.tables,
    auth.databaseId,
    accessId,
    auth.agencyId
  );

  let encryptedPassword = existing.encryptedPassword || '';
  if (clearPassword) {
    encryptedPassword = '';
  } else if (password) {
    encryptedPassword = encryptSecret(password);
  }

  const data = splitTyped(ACCESS_COLUMNS, {
    agencyId: auth.agencyId,
    platform,
    url,
    username,
    encryptedPassword,
    notes,
    createdBy: existing.createdBy || auth.user.$id,
  });

  await auth.tables.updateRow({
    databaseId: auth.databaseId,
    tableId: AGENCY_ACCESSES_TABLE,
    rowId: accessId,
    data,
  });

  await writeAudit(auth.tables, auth.databaseId, {
    agencyId: auth.agencyId,
    entityType: 'agency_access',
    entityId: accessId,
    action: 'update',
    actorId: auth.user.$id,
    meta: {
      platform,
      passwordChanged: Boolean(password) || clearPassword,
    },
  });

  const updated = await loadAccessForAgency(
    auth.tables,
    auth.databaseId,
    accessId,
    auth.agencyId
  );
  res.status(200).json({ access: toAgencyAccessDto(updated) });
}

async function handleDelete(auth, req, res) {
  const body = parseBody(req);
  const accessId = String(body.accessId || body.id || '').trim();
  if (!accessId) {
    res.status(400).json({
      error: 'invalid_request',
      message: 'accessId é obrigatório',
    });
    return;
  }

  const existing = await loadAccessForAgency(
    auth.tables,
    auth.databaseId,
    accessId,
    auth.agencyId
  );

  await auth.tables.deleteRow({
    databaseId: auth.databaseId,
    tableId: AGENCY_ACCESSES_TABLE,
    rowId: accessId,
  });

  await writeAudit(auth.tables, auth.databaseId, {
    agencyId: auth.agencyId,
    entityType: 'agency_access',
    entityId: accessId,
    action: 'delete',
    actorId: auth.user.$id,
    meta: { platform: existing.platform || '' },
  });

  res.status(200).json({ ok: true, accessId });
}

export default async function agencyAccessesHandler(req, res) {
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
      if (route === 'reveal') {
        await handleReveal(auth, req, res);
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
      safeError(res, err);
      return;
    }
    console.error(
      '[agency-accesses] unexpected',
      redactSecrets({ message: err?.message, code: err?.code })
    );
    safeError(res, err);
  }
}
