/**
 * Public briefing API (token-gated, admin Appwrite).
 * Routes: ?route=validate|save|apply-client
 *
 * Guests never need Role.any() on tables — all reads/writes go through API key.
 * Do not log raw tokens.
 */
import { ID, Query } from 'node-appwrite';
import { getAdminTables, parsePayload } from './materialAppwrite.js';

const BRIEF_KIND_INICIAL = 'briefing_inicial';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function json(res, status, body) {
  return res.status(status).json(body);
}

function readBody(req) {
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body || '{}');
    } catch {
      return {};
    }
  }
  return req.body || {};
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

function normalizeFormato(formato = {}) {
  return {
    num_videos: Number(formato?.num_videos) || 0,
    num_designs: Number(formato?.num_designs) || 0,
    duracao_videos: String(formato?.duracao_videos || '').trim() || '30-45s',
  };
}

function normalizeInicialForm(raw = {}, clientName = '') {
  const empresaRaw = raw.empresa || raw || {};
  const produtos = Array.isArray(empresaRaw.produtos_linhas)
    ? empresaRaw.produtos_linhas
    : [];
  return {
    empresa: {
      nome: String(empresaRaw.nome || clientName || '').trim(),
      publico_alvo: String(empresaRaw.publico_alvo || '').trim(),
      formato_padrao: normalizeFormato(
        empresaRaw.formato_padrao || empresaRaw.formato || {}
      ),
      orcamento_padrao_mensal:
        empresaRaw.orcamento_padrao_mensal ?? empresaRaw.orcamento ?? '',
      tom_brand: String(empresaRaw.tom_brand || '').trim(),
      restricoes_criativas: String(empresaRaw.restricoes_criativas || '').trim(),
      produtos_linhas: produtos,
      brand_guidelines: empresaRaw.brand_guidelines || null,
    },
  };
}

function validateInicialForm(form) {
  const n = normalizeInicialForm(form);
  const errors = {};
  if (!n.empresa.nome) errors.nome = 'Nome obrigatório';
  if (!n.empresa.publico_alvo) errors.publico_alvo = 'Público-alvo obrigatório';
  if (!n.empresa.tom_brand) errors.tom_brand = 'Tom de marca obrigatório';
  if (!(n.empresa.produtos_linhas || []).some((p) => String(p?.nome || '').trim())) {
    errors.produtos_linhas = 'Cadastre ao menos uma linha/produto';
  }
  return { valid: Object.keys(errors).length === 0, errors, value: n };
}

function countProgress(form) {
  const n = normalizeInicialForm(form);
  let done = 0;
  const total = 5;
  if (n.empresa.nome) done += 1;
  if (n.empresa.publico_alvo) done += 1;
  if (n.empresa.tom_brand) done += 1;
  if (Number(n.empresa.orcamento_padrao_mensal) > 0) done += 1;
  if ((n.empresa.produtos_linhas || []).some((p) => p?.nome)) done += 1;
  return { done, total };
}

async function getRow(tables, databaseId, tableId, rowId) {
  const row = await tables.getRow({ databaseId, tableId, rowId });
  return parsePayload(row);
}

async function updateMergedRow(tables, databaseId, tableId, rowId, typedKeys, patch) {
  let existing = {};
  try {
    existing = await getRow(tables, databaseId, tableId, rowId);
  } catch {
    existing = {};
  }
  const merged = { ...stripSystem(existing), ...patch };
  const data = {};
  for (const key of typedKeys) {
    if (merged[key] !== undefined) data[key] = merged[key];
  }
  const extra = { ...merged };
  for (const key of typedKeys) delete extra[key];
  for (const k of ['id', 'created_date', 'updated_date']) delete extra[k];
  data.payload = JSON.stringify(extra);
  await tables.updateRow({ databaseId, tableId, rowId, data });
  return { id: rowId, ...merged };
}

async function findEmpresa(tables, databaseId, clientId, agencyId) {
  try {
    const result = await tables.listRows({
      databaseId,
      tableId: 'empresas',
      queries: [
        Query.equal('clientId', clientId),
        Query.equal('agencyId', agencyId),
        Query.limit(1),
      ],
    });
    const row = result.rows?.[0] || result.documents?.[0];
    return row ? parsePayload(row) : null;
  } catch {
    return null;
  }
}

async function upsertEmpresa(tables, databaseId, { agencyId, clientId, empresaForm, existing }) {
  const form = empresaForm || {};
  const empresaExtra = {
    ...(existing ? stripSystem(existing) : {}),
    agencyId,
    clientId,
    nome: String(form.nome || '').trim(),
    publico_alvo: String(form.publico_alvo || '').trim(),
    formato_padrao: form.formato_padrao || existing?.formato_padrao || null,
    orcamento_padrao_mensal: Number(form.orcamento_padrao_mensal) || 0,
    tom_brand: String(form.tom_brand || '').trim(),
    restricoes_criativas: String(form.restricoes_criativas || '').trim(),
    produtos_linhas: Array.isArray(form.produtos_linhas) ? form.produtos_linhas : [],
    brand_guidelines: form.brand_guidelines || null,
    editado_em: new Date().toISOString(),
  };

  const typed = {
    agencyId,
    clientId,
    nome: empresaExtra.nome,
    payload: JSON.stringify(empresaExtra),
  };

  if (existing?.id) {
    await tables.updateRow({
      databaseId,
      tableId: 'empresas',
      rowId: existing.id,
      data: typed,
    });
    return { id: existing.id, ...empresaExtra };
  }

  const rowId = ID.unique();
  await tables.createRow({
    databaseId,
    tableId: 'empresas',
    rowId,
    data: typed,
  });
  return { id: rowId, ...empresaExtra };
}

async function loadTokenContext(tables, databaseId, token) {
  const record = await getRow(tables, databaseId, 'public_briefing_tokens', token);
  if (!record || String(record.token || record.id) !== token) {
    const err = new Error('Token não encontrado');
    err.status = 404;
    throw err;
  }
  if (record.status === 'revoked') {
    const err = new Error('Este link foi revogado');
    err.status = 410;
    throw err;
  }
  if (record.status === 'expired' || (record.expiresAt && new Date(record.expiresAt) < new Date())) {
    try {
      await updateMergedRow(
        tables,
        databaseId,
        'public_briefing_tokens',
        token,
        ['agencyId', 'clientId', 'serviceId', 'token', 'status', 'expiresAt'],
        { status: 'expired' }
      );
    } catch {
      /* ignore */
    }
    const err = new Error('Este link expirou');
    err.status = 410;
    throw err;
  }

  let response = null;
  let brief = null;
  try {
    if (record.responseId) {
      response = await getRow(tables, databaseId, 'public_briefing_responses', record.responseId);
    }
  } catch {
    response = null;
  }
  try {
    if (record.briefId) {
      brief = await getRow(tables, databaseId, 'briefs', record.briefId);
    }
  } catch {
    brief = null;
  }

  const briefKind =
    record.metadata?.briefKind ||
    response?.metadata?.briefKind ||
    BRIEF_KIND_INICIAL;

  const alreadySubmitted =
    Boolean(record.last_submission) ||
    response?.status === 'submitted' ||
    response?.status === 'completed' ||
    (brief?.status === 'READY' && brief?.origem_briefing_inicial);

  return { record, response, brief, briefKind, alreadySubmitted };
}

async function handleValidate(req, res) {
  const body = readBody(req);
  const token = String(req.query?.token || body.token || '').trim();
  if (!token) return json(res, 400, { error: 'token obrigatório' });

  const { tables, databaseId } = getAdminTables();
  let ctx;
  try {
    ctx = await loadTokenContext(tables, databaseId, token);
  } catch (err) {
    return json(res, err.status || 500, { error: err.message || 'Erro ao validar' });
  }

  const { record, response, briefKind, alreadySubmitted } = ctx;
  const clientName = record.clientSnapshot?.name || 'Cliente';
  const fromResponse = response?.responses || {};
  const draftForm = normalizeInicialForm(fromResponse, clientName);

  try {
    await updateMergedRow(
      tables,
      databaseId,
      'public_briefing_tokens',
      token,
      ['agencyId', 'clientId', 'serviceId', 'token', 'status', 'expiresAt'],
      {
        accessCount: Number(record.accessCount || 0) + 1,
        lastAccessedAt: new Date().toISOString(),
      }
    );
  } catch {
    /* ignore */
  }

  return json(res, 200, {
    success: true,
    status: 200,
    data: {
      token: record.token || token,
      clientId: record.clientId,
      agencyId: record.agencyId,
      briefId: record.briefId,
      responseId: record.responseId,
      expiresAt: record.expiresAt,
      alreadySubmitted,
      clientName,
      empresaConfig: record.empresaSnapshot || null,
      empresaId: record.empresaId || null,
      briefKind,
      draftForm,
      responseStatus: response?.status || 'draft',
    },
  });
}

async function applyInicialFromContext(tables, databaseId, token, tokenData, response, form) {
  const empresaForm = form?.empresa || form || {};
  let existingEmp = null;
  if (tokenData.empresaId) {
    try {
      existingEmp = await getRow(tables, databaseId, 'empresas', tokenData.empresaId);
    } catch {
      existingEmp = null;
    }
  }
  if (!existingEmp) {
    existingEmp = await findEmpresa(
      tables,
      databaseId,
      tokenData.clientId,
      tokenData.agencyId
    );
  }

  const empresa = await upsertEmpresa(tables, databaseId, {
    agencyId: tokenData.agencyId,
    clientId: tokenData.clientId,
    empresaForm,
    existing: existingEmp,
  });

  const briefExisting = await getRow(tables, databaseId, 'briefs', tokenData.briefId);
  const submitted =
    response?.status === 'submitted' || response?.status === 'completed';
  const legacyRest = stripSystem(briefExisting);
  delete legacyRest.status_anual;
  delete legacyRest.ciclos_comerciais;
  delete legacyRest.briefings_mes;
  delete legacyRest.mes_inicio;
  delete legacyRest.ano;
  delete legacyRest.campanhas;

  const briefExtra = {
    ...legacyRest,
    agencyId: tokenData.agencyId,
    clientId: tokenData.clientId,
    projectId: tokenData.clientId,
    empresaId: empresa.id,
    brief_kind: BRIEF_KIND_INICIAL,
    title: `Briefing inicial — ${empresa.nome || 'Cliente'}`,
    status: submitted ? 'READY' : 'DRAFT',
    produtos_snapshot: empresa.produtos_linhas || [],
    empresa_snapshot: {
      nome: empresa.nome,
      publico_alvo: empresa.publico_alvo,
      tom_brand: empresa.tom_brand,
      orcamento_padrao_mensal: empresa.orcamento_padrao_mensal,
      formato_padrao: empresa.formato_padrao,
      restricoes_criativas: empresa.restricoes_criativas,
      produtos_linhas: empresa.produtos_linhas,
    },
    is_public_briefing: true,
    origem_briefing_inicial: true,
    public_token: token,
    public_submitted_at: submitted ? new Date().toISOString() : null,
    completion_score: submitted ? 100 : 30,
    objectives: 'Briefing inicial da empresa',
    business_context:
      'DNA da marca — análise prévia antes do planejamento mês a mês',
    company_profile: empresa.publico_alvo || '',
    budget_expectations: String(empresa.orcamento_padrao_mensal || ''),
    communication_preferences: empresa.tom_brand || '',
    editado_em: new Date().toISOString(),
  };

  await tables.updateRow({
    databaseId,
    tableId: 'briefs',
    rowId: tokenData.briefId,
    data: {
      agencyId: tokenData.agencyId,
      clientId: tokenData.clientId,
      projectId: tokenData.clientId,
      empresaId: empresa.id,
      status: briefExtra.status,
      title: briefExtra.title,
      payload: JSON.stringify(briefExtra),
    },
  });

  const client = await getRow(tables, databaseId, 'clients', tokenData.clientId);
  const clientExtra = {
    ...stripSystem(client),
    ultimo_briefing_id: tokenData.briefId,
    ultimo_briefing_campanha: `Briefing inicial — ${empresa.nome || ''}`,
    ultimo_briefing_em: new Date().toISOString(),
    ultimo_briefing_objetivo: 'Briefing inicial da empresa',
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
    empresaId: empresa.id,
    empresaSnapshot: {
      publico_alvo: empresa.publico_alvo,
      formato: empresa.formato_padrao,
      orcamento: empresa.orcamento_padrao_mensal,
      tom_brand: empresa.tom_brand,
      produtos_linhas: empresa.produtos_linhas,
    },
    last_submission: submitted
      ? {
          tipo: BRIEF_KIND_INICIAL,
          empresa_nome: empresa.nome,
          briefId: tokenData.briefId,
          responseId: tokenData.responseId,
          at: new Date().toISOString(),
        }
      : tokenData.last_submission,
    metadata: {
      ...(tokenData.metadata || {}),
      briefKind: BRIEF_KIND_INICIAL,
      submittedAt: submitted ? new Date().toISOString() : tokenData.metadata?.submittedAt,
    },
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
      token: tokenData.token || token,
      status: tokenData.status,
      expiresAt: tokenData.expiresAt,
      payload: JSON.stringify(tokenExtra),
    },
  });

  return {
    empresa,
    brief: { id: tokenData.briefId, ...briefExtra },
  };
}

async function handleSave(req, res) {
  const body = readBody(req);
  const token = String(body.token || '').trim();
  const draft = Boolean(body.draft);
  if (!token) return json(res, 400, { error: 'token obrigatório' });

  const { tables, databaseId } = getAdminTables();
  let ctx;
  try {
    ctx = await loadTokenContext(tables, databaseId, token);
  } catch (err) {
    return json(res, err.status || 500, { error: err.message || 'Erro ao validar' });
  }

  if (ctx.alreadySubmitted && !draft) {
    return json(res, 409, { error: 'Briefing já foi enviado' });
  }

  if (body.campanhaForm && !body.inicialForm && ctx.briefKind === BRIEF_KIND_INICIAL) {
    return json(res, 400, {
      error: 'Este link é do briefing inicial. Envie os dados da empresa.',
    });
  }

  const form = normalizeInicialForm(
    body.inicialForm || body.campanhaForm || {},
    ctx.record.clientSnapshot?.name || 'Cliente'
  );

  if (!draft) {
    const { valid, errors } = validateInicialForm(form);
    if (!valid) {
      return json(res, 400, { error: 'Preencha todos os campos obrigatórios', errors });
    }
  }

  const progress = countProgress(form);
  if (!ctx.record.responseId) {
    return json(res, 400, { error: 'Token incompleto (responseId)' });
  }

  const response = await updateMergedRow(
    tables,
    databaseId,
    'public_briefing_responses',
    ctx.record.responseId,
    ['agencyId', 'clientId', 'tokenId', 'briefId', 'status'],
    {
      agencyId: ctx.record.agencyId,
      clientId: ctx.record.clientId,
      tokenId: token,
      briefId: ctx.record.briefId,
      status: draft ? 'in_progress' : 'submitted',
      responses: form,
      progressData: {
        totalSteps: progress.total,
        completedCount: progress.done,
      },
      lastSavedAt: new Date().toISOString(),
      submittedAt: draft ? null : new Date().toISOString(),
      metadata: { briefKind: BRIEF_KIND_INICIAL },
    }
  );

  let empresa = null;
  let brief = null;
  let briefUpdated = false;
  let empresaUpdated = false;
  let clientUpdated = false;

  if (!draft) {
    const applied = await applyInicialFromContext(
      tables,
      databaseId,
      token,
      { ...ctx.record, responseId: ctx.record.responseId },
      response,
      form
    );
    empresa = applied.empresa;
    brief = applied.brief;
    briefUpdated = true;
    empresaUpdated = true;
    clientUpdated = true;
  } else {
    try {
      brief = await updateMergedRow(
        tables,
        databaseId,
        'briefs',
        ctx.record.briefId,
        ['agencyId', 'clientId', 'projectId', 'empresaId', 'status', 'title', 'clientVisible'],
        {
          agencyId: ctx.record.agencyId,
          clientId: ctx.record.clientId,
          projectId: ctx.record.clientId,
          brief_kind: BRIEF_KIND_INICIAL,
          title: `Briefing inicial — ${form.empresa.nome || 'Cliente'}`,
          status: 'DRAFT',
          produtos_snapshot: form.empresa.produtos_linhas,
          empresa_snapshot: form.empresa,
          is_public_briefing: true,
          origem_briefing_inicial: true,
          completion_score: 30,
          editado_em: new Date().toISOString(),
          _empresa_form: form.empresa,
        }
      );
      briefUpdated = true;
    } catch (err) {
      console.warn('[public-briefing] draft brief patch:', err?.message || err);
    }

    await updateMergedRow(
      tables,
      databaseId,
      'public_briefing_tokens',
      token,
      ['agencyId', 'clientId', 'serviceId', 'token', 'status', 'expiresAt'],
      {
        pending_brief_sync: !briefUpdated,
        pending_client_sync: true,
        empresaSnapshot: {
          publico_alvo: form.empresa.publico_alvo,
          formato: normalizeFormato(form.empresa.formato_padrao),
          orcamento: Number(form.empresa.orcamento_padrao_mensal) || 0,
          tom_brand: form.empresa.tom_brand,
          restricoes_criativas: form.empresa.restricoes_criativas,
          produtos_linhas: form.empresa.produtos_linhas,
        },
        metadata: {
          ...(ctx.record.metadata || {}),
          briefKind: BRIEF_KIND_INICIAL,
        },
      }
    );
  }

  return json(res, 200, {
    success: true,
    data: {
      brief,
      response,
      empresa,
      clientUpdated,
      briefUpdated,
      empresaUpdated,
      draft,
    },
  });
}

async function handleApplyClient(req, res) {
  const body = readBody(req);
  const token = String(body.token || '').trim();
  if (!token) return json(res, 400, { error: 'token obrigatório' });

  const { tables, databaseId } = getAdminTables();
  let tokenData;
  try {
    tokenData = await getRow(tables, databaseId, 'public_briefing_tokens', token);
  } catch {
    return json(res, 404, { error: 'Token não encontrado' });
  }

  if (tokenData.status === 'revoked') {
    return json(res, 410, { error: 'Token revogado' });
  }
  if (!tokenData.briefId || !tokenData.clientId || !tokenData.responseId) {
    return json(res, 400, { error: 'Token incompleto' });
  }

  const response = await getRow(
    tables,
    databaseId,
    'public_briefing_responses',
    tokenData.responseId
  );
  const answers = response.responses || {};
  const briefKind =
    tokenData.metadata?.briefKind ||
    response.metadata?.briefKind ||
    BRIEF_KIND_INICIAL;

  if (briefKind === BRIEF_KIND_INICIAL || answers.empresa || answers.ciclos_comerciais) {
    const form = normalizeInicialForm(answers.empresa || answers, '');
    const applied = await applyInicialFromContext(
      tables,
      databaseId,
      token,
      tokenData,
      response,
      form
    );
    return json(res, 200, {
      success: true,
      clientId: tokenData.clientId,
      briefId: tokenData.briefId,
      briefKind: BRIEF_KIND_INICIAL,
      empresa: applied.empresa,
      brief: applied.brief,
    });
  }

  // Legacy campanha_mensal tokens
  const briefExisting = await getRow(tables, databaseId, 'briefs', tokenData.briefId);
  const empresaSnap = tokenData.empresaSnapshot || {};
  const briefExtra = {
    ...stripSystem(briefExisting),
    agencyId: tokenData.agencyId,
    clientId: tokenData.clientId,
    projectId: tokenData.clientId,
    empresaId: tokenData.empresaId || null,
    title: answers.nome_campanha || briefExisting.title || 'Briefing campanha',
    status:
      response.status === 'submitted' || response.status === 'completed' ? 'READY' : 'DRAFT',
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
    brief_kind: 'campanha_mensal',
    is_public_briefing: true,
    public_token: token,
    public_submitted_at:
      response.status === 'submitted' ? new Date().toISOString() : null,
    editado_em: new Date().toISOString(),
  };

  await tables.updateRow({
    databaseId,
    tableId: 'briefs',
    rowId: tokenData.briefId,
    data: {
      agencyId: tokenData.agencyId,
      clientId: tokenData.clientId,
      projectId: tokenData.clientId,
      empresaId: tokenData.empresaId || null,
      status: briefExtra.status,
      title: briefExtra.title,
      payload: JSON.stringify(briefExtra),
    },
  });

  return json(res, 200, {
    success: true,
    clientId: tokenData.clientId,
    briefId: tokenData.briefId,
    campanha: answers.nome_campanha || null,
    brief: { id: tokenData.briefId, ...briefExtra },
  });
}

export default async function publicBriefingHandler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const route = String(req.query?.route || '').trim();
  try {
    if (route === 'validate' && (req.method === 'GET' || req.method === 'POST')) {
      return await handleValidate(req, res);
    }
    if (route === 'save' && req.method === 'POST') {
      return await handleSave(req, res);
    }
    if (route === 'apply-client' && req.method === 'POST') {
      return await handleApplyClient(req, res);
    }
    return json(res, 404, { error: `Rota desconhecida: ${route || '(vazia)'}` });
  } catch (err) {
    console.error('[public-briefing]', err?.message || err);
    return json(res, 500, { error: 'Erro interno' });
  }
}
