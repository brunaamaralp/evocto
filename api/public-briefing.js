/**
 * API pública de briefing (Vercel).
 * Rotas: ?route=apply-client
 * Usa APPWRITE_API_KEY para atualizar o cadastro do cliente após envio público.
 */
import { Client, TablesDB } from 'node-appwrite';

export const config = {
  maxDuration: 30,
};

function loadEnvFallback() {
  // Em Vercel as env já existem; local pode vir de process se o CLI carregou .env
}

function getAdminTables() {
  loadEnvFallback();
  const endpoint = process.env.VITE_APPWRITE_ENDPOINT || process.env.APPWRITE_ENDPOINT;
  const projectId = process.env.VITE_APPWRITE_PROJECT_ID || process.env.APPWRITE_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY;
  const databaseId = process.env.VITE_APPWRITE_DATABASE_ID || process.env.APPWRITE_DATABASE_ID || 'evocto';

  if (!endpoint || !projectId || !apiKey) {
    throw new Error('Appwrite admin não configurado (ENDPOINT/PROJECT/API_KEY)');
  }

  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  return { tables: new TablesDB(client), databaseId };
}

function parsePayload(row) {
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

async function applyClientFromToken(req, res) {
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const token = String(body.token || '').trim();
  if (!token) {
    return res.status(400).json({ error: 'token obrigatório' });
  }

  const { tables, databaseId } = getAdminTables();
  const tokenRow = await tables.getRow({
    databaseId,
    tableId: 'public_briefing_tokens',
    rowId: token,
  });
  const tokenData = parsePayload(tokenRow);

  if (tokenData.status === 'revoked') {
    return res.status(410).json({ error: 'Token revogado' });
  }
  if (!tokenData.briefId || !tokenData.clientId) {
    return res.status(400).json({ error: 'Token incompleto' });
  }

  const briefRow = await tables.getRow({
    databaseId,
    tableId: 'briefs',
    rowId: tokenData.briefId,
  });
  const brief = parsePayload(briefRow);

  const clientRow = await tables.getRow({
    databaseId,
    tableId: 'clients',
    rowId: tokenData.clientId,
  });
  const client = parsePayload(clientRow);

  const patchExtra = {
    ultimo_briefing_id: brief.id,
    ultimo_briefing_campanha: brief.nome_campanha || brief.title || null,
    ultimo_briefing_em:
      brief.public_submitted_at || brief.editado_em || new Date().toISOString(),
    ultimo_briefing_objetivo: brief.objetivo || null,
  };

  // Preserve existing payload keys
  const known = new Set(['agencyId', 'name', 'status', 'email', 'phone']);
  const nextExtra = { ...client };
  for (const k of ['id', 'created_date', 'updated_date', '$id', '$createdAt', '$updatedAt', '$permissions', '$databaseId', '$tableId', '$collectionId', 'agencyId', 'name', 'status', 'email', 'phone', 'payload']) {
    delete nextExtra[k];
  }
  Object.assign(nextExtra, patchExtra);

  const rowData = {
    agencyId: client.agencyId,
    name: client.name,
    status: client.status,
    email: client.email,
    phone: client.phone,
    payload: JSON.stringify(nextExtra),
  };

  await tables.updateRow({
    databaseId,
    tableId: 'clients',
    rowId: tokenData.clientId,
    data: rowData,
  });

  // clear pending flag on token
  const tokenExtra = { ...tokenData };
  for (const k of [
    'id',
    'created_date',
    'updated_date',
    'agencyId',
    'clientId',
    'serviceId',
    'token',
    'status',
    'expiresAt',
    'payload',
  ]) {
    delete tokenExtra[k];
  }
  tokenExtra.pending_client_sync = false;

  await tables.updateRow({
    databaseId,
    tableId: 'public_briefing_tokens',
    rowId: token,
    data: {
      agencyId: tokenData.agencyId,
      clientId: tokenData.clientId,
      serviceId: tokenData.serviceId || null,
      token: tokenData.token,
      status: tokenData.status,
      expiresAt: tokenData.expiresAt,
      payload: JSON.stringify(tokenExtra),
    },
  });

  return res.status(200).json({
    success: true,
    clientId: tokenData.clientId,
    briefId: brief.id,
    campanha: patchExtra.ultimo_briefing_campanha,
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const route = String(req.query.route || '').trim();
  try {
    if (route === 'apply-client' && req.method === 'POST') {
      return await applyClientFromToken(req, res);
    }
    return res.status(404).json({ error: `Rota desconhecida: ${route || '(vazia)'}` });
  } catch (err) {
    console.error('[public-briefing]', err);
    return res.status(500).json({ error: err.message || 'Erro interno' });
  }
}
