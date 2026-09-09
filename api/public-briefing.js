/**
 * API pública de briefing (Vercel).
 * Rotas: ?route=apply-client
 * Usa APPWRITE_API_KEY para gravar Brief + cadastro do cliente após envio público.
 */
import { Client, TablesDB } from 'node-appwrite';

export const config = {
  maxDuration: 30,
};

function getAdminTables() {
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

function stripSystem(obj = {}) {
  const next = { ...obj };
  for (const k of [
    'id',
    'created_date',
    'updated_date',
    '$id',
    '$createdAt',
    '$updatedAt',
    '$permissions',
    '$databaseId',
    '$tableId',
    '$collectionId',
    'payload',
  ]) {
    delete next[k];
  }
  return next;
}

async function applyClientFromToken(req, res) {
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const token = String(body.token || '').trim();
  if (!token) {
    return res.status(400).json({ error: 'token obrigatório' });
  }

  const { tables, databaseId } = getAdminTables();
  const tokenData = parsePayload(
    await tables.getRow({
      databaseId,
      tableId: 'public_briefing_tokens',
      rowId: token,
    })
  );

  if (tokenData.status === 'revoked') {
    return res.status(410).json({ error: 'Token revogado' });
  }
  if (!tokenData.briefId || !tokenData.clientId || !tokenData.responseId) {
    return res.status(400).json({ error: 'Token incompleto' });
  }

  const response = parsePayload(
    await tables.getRow({
      databaseId,
      tableId: 'public_briefing_responses',
      rowId: tokenData.responseId,
    })
  );
  const answers = response.responses || {};

  const briefExisting = parsePayload(
    await tables.getRow({
      databaseId,
      tableId: 'briefs',
      rowId: tokenData.briefId,
    })
  );

  const empresaSnap = tokenData.empresaSnapshot || {};
  const briefExtra = {
    ...stripSystem(briefExisting),
    agencyId: tokenData.agencyId,
    clientId: tokenData.clientId,
    projectId: tokenData.clientId,
    empresaId: tokenData.empresaId || null,
    title: answers.nome_campanha || briefExisting.title || 'Briefing campanha',
    status: response.status === 'submitted' || response.status === 'completed' ? 'READY' : 'DRAFT',
    nome_campanha: answers.nome_campanha || '',
    objetivo: answers.objetivo || '',
    acoes_comerciais: answers.acoes_comerciais || '',
    talento_locacao: answers.talento_locacao || '',
    data_gravacao_inicio: answers.data_gravacao_inicio || null,
    data_gravacao_fim: answers.data_gravacao_fim || null,
    publico_alvo: empresaSnap.publico_alvo || briefExisting.publico_alvo || '',
    formato: empresaSnap.formato || briefExisting.formato || null,
    orcamento: empresaSnap.orcamento ?? briefExisting.orcamento ?? 0,
    tom_brand: empresaSnap.tom_brand || briefExisting.tom_brand || '',
    objectives: answers.objetivo || '',
    business_context: answers.acoes_comerciais || '',
    company_profile: empresaSnap.publico_alvo || '',
    budget_expectations: String(empresaSnap.orcamento ?? ''),
    communication_preferences: empresaSnap.tom_brand || '',
    timeline_expectations: `${answers.data_gravacao_inicio || ''} → ${answers.data_gravacao_fim || ''}`,
    completion_score: response.status === 'submitted' ? 100 : 40,
    brief_kind: 'campanha_mensal',
    is_public_briefing: true,
    public_token: token,
    public_submitted_at:
      response.status === 'submitted' ? new Date().toISOString() : null,
    editado_em: new Date().toISOString(),
  };

  const typedBrief = {
    agencyId: tokenData.agencyId,
    clientId: tokenData.clientId,
    projectId: tokenData.clientId,
    empresaId: tokenData.empresaId || null,
    status: briefExtra.status,
    title: briefExtra.title,
    payload: JSON.stringify(briefExtra),
  };

  await tables.updateRow({
    databaseId,
    tableId: 'briefs',
    rowId: tokenData.briefId,
    data: typedBrief,
  });

  const client = parsePayload(
    await tables.getRow({
      databaseId,
      tableId: 'clients',
      rowId: tokenData.clientId,
    })
  );
  const clientExtra = {
    ...stripSystem(client),
    ultimo_briefing_id: tokenData.briefId,
    ultimo_briefing_campanha: answers.nome_campanha || null,
    ultimo_briefing_em: new Date().toISOString(),
    ultimo_briefing_objetivo: answers.objetivo || null,
  };

  await tables.updateRow({
    databaseId,
    tableId: 'clients',
    rowId: tokenData.clientId,
    data: {
      agencyId: client.agencyId,
      name: client.name,
      status: client.status,
      email: client.email,
      phone: client.phone,
      payload: JSON.stringify(clientExtra),
    },
  });

  const tokenExtra = {
    ...stripSystem(tokenData),
    pending_client_sync: false,
    pending_brief_sync: false,
  };
  for (const k of ['agencyId', 'clientId', 'serviceId', 'token', 'status', 'expiresAt']) {
    delete tokenExtra[k];
  }

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
    briefId: tokenData.briefId,
    campanha: answers.nome_campanha || null,
    brief: { id: tokenData.briefId, ...briefExtra },
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
