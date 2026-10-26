/**
 * CRUD de acessos/credenciais por cliente + informações gerais.
 *
 * GET  /api/client-accesses?route=list&clientId=
 * GET  /api/client-accesses?route=reveal&clientId=&accessId=
 * POST /api/client-accesses?route=create
 * POST /api/client-accesses?route=update
 * POST /api/client-accesses?route=delete
 * POST /api/client-accesses?route=update-notes
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
  ACCESS_COLUMNS,
  CLIENT_ACCESSES_TABLE,
  CLIENT_COLUMNS,
  CLIENTS_TABLE,
  GENERAL_NOTES_FIELD,
  redactSecrets,
  toAccessDto,
  validateAccessWrite,
  validateGeneralNotes,
} from './clientAccessesSchema.js';

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
    console.error('[client-accesses]', err?.code || err?.message || err);
  }
  res.status(status).json({ error: code, message });
}

async function loadClientForAgency(tables, databaseId, clientId, agencyId) {
  let row;
  try {
    row = await tables.getRow({
      databaseId,
      tableId: CLIENTS_TABLE,
      rowId: clientId,
    });
  } catch {
    const err = new Error('Cliente não encontrado');
    err.status = 404;
    err.code = 'client_not_found';
    throw err;
  }
  const client = parsePayload(row);
  if (client.agencyId && client.agencyId !== agencyId) {
    const err = new Error('Cliente não pertence à sua agência');
    err.status = 403;
    err.code = 'forbidden';
    throw err;
  }
  return client;
}

async function loadAccessForAgency(tables, databaseId, accessId, agencyId, clientId) {
  let row;
  try {
    row = await tables.getRow({
      databaseId,
      tableId: CLIENT_ACCESSES_TABLE,
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
    const err = new Error('Acesso não pertence à sua agência');
    err.status = 403;
    err.code = 'forbidden';
    throw err;
  }
  if (clientId && access.clientId !== clientId) {
    const err = new Error('Acesso não pertence a este cliente');
    err.status = 403;
    err.code = 'forbidden';
    throw err;
  }
  return access;
}

function requireCrypto() {
  if (!isMaterialEncryptionConfigured()) {
    const err = new MaterialCryptoConfigError();
    err.status = 503;
    err.publicMessage = 'Criptografia de credenciais não configurada no servidor';
    throw err;
  }
}

async function handleList(auth, req, res) {
  const clientId = String(req.query?.clientId || '').trim();
  if (!clientId) {
    res.status(400).json({ error: 'invalid_client', message: 'clientId é obrigatório' });
    return;
  }

  const client = await loadClientForAgency(auth.tables, auth.databaseId, clientId, auth.agencyId);
  const result = await auth.tables.listRows({
    databaseId: auth.databaseId,
    tableId: CLIENT_ACCESSES_TABLE,
    queries: [
      Query.equal('agencyId', auth.agencyId),
      Query.equal('clientId', clientId),
      Query.limit(100),
      Query.orderDesc('$updatedAt'),
    ],
  });
  const rows = (result.rows || result.documents || []).map(parsePayload);
  res.status(200).json({
    accesses: rows.map(toAccessDto),
    generalNotes: String(client[GENERAL_NOTES_FIELD] || ''),
    client: { id: client.id, name: client.name || '' },
  });
}

async function handleReveal(auth, req, res) {
  requireCrypto();
  const clientId = String(req.query?.clientId || '').trim();
  const accessId = String(req.query?.accessId || '').trim();
  if (!clientId || !accessId) {
    res.status(400).json({
      error: 'invalid_request',
      message: 'clientId e accessId são obrigatórios',
    });
    return;
  }

  await loadClientForAgency(auth.tables, auth.databaseId, clientId, auth.agencyId);
  const access = await loadAccessForAgency(
    auth.tables,
    auth.databaseId,
    accessId,
    auth.agencyId,
    clientId
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
    entityType: 'client_access',
    entityId: accessId,
    action: 'reveal_password',
    actorId: auth.user.$id,
    meta: { clientId },
  });

  res.status(200).json({
    accessId,
    password,
  });
}

async function handleCreate(auth, req, res) {
  requireCrypto();
  const body = parseBody(req);
  const validated = validateAccessWrite(body, { requirePassword: Boolean(body.password) });
  if (!validated.valid) {
    res.status(400).json({
      error: 'validation_error',
      message: 'Dados inválidos',
      errors: validated.errors,
    });
    return;
  }

  const { clientId, platform, url, username, notes, password } = validated.value;
  await loadClientForAgency(auth.tables, auth.databaseId, clientId, auth.agencyId);

  const encryptedPassword = password ? encryptSecret(password) : '';
  const rowId = ID.unique();
  const data = splitTyped(ACCESS_COLUMNS, {
    agencyId: auth.agencyId,
    clientId,
    platform,
    url,
    username,
    encryptedPassword,
    notes,
    createdBy: auth.user.$id,
  });

  await auth.tables.createRow({
    databaseId: auth.databaseId,
    tableId: CLIENT_ACCESSES_TABLE,
    rowId,
    data,
  });

  await writeAudit(auth.tables, auth.databaseId, {
    agencyId: auth.agencyId,
    entityType: 'client_access',
    entityId: rowId,
    action: 'create',
    actorId: auth.user.$id,
    meta: { clientId, platform },
  });

  const created = await loadAccessForAgency(
    auth.tables,
    auth.databaseId,
    rowId,
    auth.agencyId,
    clientId
  );
  res.status(201).json({ access: toAccessDto(created) });
}

async function handleUpdate(auth, req, res) {
  requireCrypto();
  const body = parseBody(req);
  const accessId = String(body.accessId || body.id || '').trim();
  if (!accessId) {
    res.status(400).json({ error: 'invalid_access', message: 'accessId é obrigatório' });
    return;
  }

  const validated = validateAccessWrite(body, { requirePassword: false });
  if (!validated.valid) {
    res.status(400).json({
      error: 'validation_error',
      message: 'Dados inválidos',
      errors: validated.errors,
    });
    return;
  }

  const { clientId, platform, url, username, notes, password, clearPassword } = validated.value;
  await loadClientForAgency(auth.tables, auth.databaseId, clientId, auth.agencyId);
  const existing = await loadAccessForAgency(
    auth.tables,
    auth.databaseId,
    accessId,
    auth.agencyId,
    clientId
  );

  let encryptedPassword = existing.encryptedPassword || '';
  if (clearPassword) {
    encryptedPassword = '';
  } else if (password) {
    encryptedPassword = encryptSecret(password);
  }

  const data = splitTyped(ACCESS_COLUMNS, {
    agencyId: auth.agencyId,
    clientId,
    platform,
    url,
    username,
    encryptedPassword,
    notes,
    createdBy: existing.createdBy || auth.user.$id,
  });

  await auth.tables.updateRow({
    databaseId: auth.databaseId,
    tableId: CLIENT_ACCESSES_TABLE,
    rowId: accessId,
    data,
  });

  await writeAudit(auth.tables, auth.databaseId, {
    agencyId: auth.agencyId,
    entityType: 'client_access',
    entityId: accessId,
    action: 'update',
    actorId: auth.user.$id,
    meta: {
      clientId,
      platform,
      passwordChanged: Boolean(password) || clearPassword,
    },
  });

  const updated = await loadAccessForAgency(
    auth.tables,
    auth.databaseId,
    accessId,
    auth.agencyId,
    clientId
  );
  res.status(200).json({ access: toAccessDto(updated) });
}

async function handleDelete(auth, req, res) {
  const body = parseBody(req);
  const accessId = String(body.accessId || body.id || '').trim();
  const clientId = String(body.clientId || '').trim();
  if (!accessId || !clientId) {
    res.status(400).json({
      error: 'invalid_request',
      message: 'clientId e accessId são obrigatórios',
    });
    return;
  }

  await loadClientForAgency(auth.tables, auth.databaseId, clientId, auth.agencyId);
  const existing = await loadAccessForAgency(
    auth.tables,
    auth.databaseId,
    accessId,
    auth.agencyId,
    clientId
  );

  await auth.tables.deleteRow({
    databaseId: auth.databaseId,
    tableId: CLIENT_ACCESSES_TABLE,
    rowId: accessId,
  });

  await writeAudit(auth.tables, auth.databaseId, {
    agencyId: auth.agencyId,
    entityType: 'client_access',
    entityId: accessId,
    action: 'delete',
    actorId: auth.user.$id,
    meta: { clientId, platform: existing.platform || '' },
  });

  res.status(200).json({ ok: true, accessId });
}

async function handleUpdateNotes(auth, req, res) {
  const body = parseBody(req);
  const validated = validateGeneralNotes(body);
  if (!validated.valid) {
    res.status(400).json({
      error: 'validation_error',
      message: 'Dados inválidos',
      errors: validated.errors,
    });
    return;
  }

  const { clientId, generalNotes } = validated.value;
  const client = await loadClientForAgency(
    auth.tables,
    auth.databaseId,
    clientId,
    auth.agencyId
  );

  const data = splitTyped(CLIENT_COLUMNS, {
    ...client,
    [GENERAL_NOTES_FIELD]: generalNotes,
  });

  await auth.tables.updateRow({
    databaseId: auth.databaseId,
    tableId: CLIENTS_TABLE,
    rowId: clientId,
    data,
  });

  await writeAudit(auth.tables, auth.databaseId, {
    agencyId: auth.agencyId,
    entityType: 'client',
    entityId: clientId,
    action: 'update_access_notes',
    actorId: auth.user.$id,
    meta: { notesLength: generalNotes.length },
  });

  res.status(200).json({ generalNotes });
}

export default async function clientAccessesHandler(req, res) {
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
      if (route === 'update-notes') {
        await handleUpdateNotes(auth, req, res);
        return;
      }
      res.status(400).json({ error: 'unknown_route', message: `Rota POST desconhecida: ${route}` });
      return;
    }

    res.status(405).json({ error: 'method_not_allowed', message: 'Método não permitido' });
  } catch (err) {
    // Nunca ecoar body com senha
    if (err?.status && err.status < 500) {
      safeError(res, err);
      return;
    }
    console.error('[client-accesses] unexpected', redactSecrets({ message: err?.message, code: err?.code }));
    safeError(res, err);
  }
}
