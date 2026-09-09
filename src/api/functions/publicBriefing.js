import {
  getTablesDB,
  getAccount,
  DATABASE_ID,
  ID,
  Permission,
  Role,
} from '@/api/appwriteClient';
import { TABLE_COLUMNS, BOOLEAN_COLUMNS, DATETIME_COLUMNS } from '@/api/appwrite/tableMap';
import { Client, Brief, PublicBriefingToken, PublicBriefingResponse } from '@/api/entities';
import { getEmpresaByClientId, configFromEmpresa } from '@/lib/empresaConfig';
import {
  buildCampanhaBriefPayload,
  EMPTY_CAMPANHA_FORM,
  validateCampanhaForm,
} from '@/lib/campanhaBriefing';

const SYSTEM_KEYS = new Set([
  'id',
  '$id',
  '$createdAt',
  '$updatedAt',
  '$permissions',
  '$databaseId',
  '$tableId',
  '$collectionId',
  'created_date',
  'updated_date',
  'payload',
  '_permissions',
]);

function coerceValue(key, value) {
  if (value === undefined) return undefined;
  if (BOOLEAN_COLUMNS.has(key)) return Boolean(value);
  if (DATETIME_COLUMNS.has(key)) {
    if (!value) return undefined;
    return typeof value === 'string' ? value : new Date(value).toISOString();
  }
  if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
    return undefined;
  }
  return value;
}

function splitPayload(tableId, data = {}) {
  const known = new Set(TABLE_COLUMNS[tableId] || []);
  const row = {};
  const extra = {};
  for (const [key, value] of Object.entries(data)) {
    if (SYSTEM_KEYS.has(key) || value === undefined) continue;
    if (known.has(key)) {
      const coerced = coerceValue(key, value);
      if (coerced !== undefined) row[key] = coerced;
      else extra[key] = value;
    } else {
      extra[key] = value;
    }
  }
  if (Object.keys(extra).length > 0) {
    row.payload = JSON.stringify(extra);
  }
  return row;
}

function mergeRow(row) {
  if (!row) return null;
  let extra = {};
  if (row.payload) {
    try {
      extra = JSON.parse(row.payload);
    } catch {
      extra = {};
    }
  }
  const { payload, $id, $createdAt, $updatedAt, ...rest } = row;
  return {
    ...extra,
    ...rest,
    id: $id,
    created_date: $createdAt,
    updated_date: $updatedAt,
  };
}

async function createPublicRow(tableId, data, permissions) {
  const tables = getTablesDB();
  const rowId = data.id || ID.unique();
  const row = splitPayload(tableId, { ...data, id: undefined });
  const created = await tables.createRow({
    databaseId: DATABASE_ID,
    tableId,
    rowId,
    data: row,
    permissions,
  });
  return mergeRow(created);
}

async function getPublicRow(tableId, rowId) {
  const tables = getTablesDB();
  const row = await tables.getRow({
    databaseId: DATABASE_ID,
    tableId,
    rowId,
  });
  return mergeRow(row);
}

async function updatePublicRow(tableId, rowId, data) {
  const tables = getTablesDB();
  let existing = {};
  try {
    existing = mergeRow(
      await tables.getRow({ databaseId: DATABASE_ID, tableId, rowId })
    ) || {};
  } catch {
    existing = {};
  }
  const row = splitPayload(tableId, { ...existing, ...data, id: rowId });
  const updated = await tables.updateRow({
    databaseId: DATABASE_ID,
    tableId,
    rowId,
    data: row,
  });
  return mergeRow(updated);
}

function teamAndPublicPerms(agencyId, { allowPublicUpdate = false } = {}) {
  const perms = [
    Permission.read(Role.any()),
    Permission.read(Role.team(agencyId)),
    Permission.update(Role.team(agencyId)),
    Permission.delete(Role.team(agencyId)),
  ];
  if (allowPublicUpdate) {
    perms.push(Permission.update(Role.any()));
  }
  return perms;
}

function publicUrlForToken(token) {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/public-briefing?token=${token}`;
  }
  return `/public-briefing?token=${token}`;
}

function hoursFromArgs({ expiresInHours, expiryDays } = {}) {
  if (Number.isFinite(Number(expiresInHours)) && Number(expiresInHours) > 0) {
    return Number(expiresInHours);
  }
  if (Number.isFinite(Number(expiryDays)) && Number(expiryDays) > 0) {
    return Number(expiryDays) * 24;
  }
  return 168; // 7 dias
}

/**
 * Gera link público do briefing de campanha.
 * Pré-cria draft do Brief + Response com update público (Role.any).
 */
export async function generatePublicBriefingToken({
  clientId,
  serviceId = null,
  language = 'pt',
  expiresInHours,
  expiryDays,
  reuseIfActiveExists = true,
  agencyId: agencyIdArg = null,
} = {}) {
  if (!clientId) throw new Error('clientId é obrigatório');

  const account = getAccount();
  const user = await account.get();
  const client = await Client.get(clientId);
  if (!client) throw new Error('Cliente não encontrado');

  const agencyId = agencyIdArg || client.agencyId;
  if (!agencyId) throw new Error('agencyId ausente');

  if (reuseIfActiveExists) {
    const existing = await PublicBriefingToken.filter({
      agencyId,
      clientId,
      status: 'active',
    }).catch(() => []);
    const alive = (existing || []).find(
      (t) =>
        t.metadata?.briefKind === 'campanha_mensal' &&
        t.expiresAt &&
        new Date(t.expiresAt) > new Date()
    );
    if (alive?.token) {
      return {
        success: true,
        reused: true,
        token: alive.token,
        publicUrl: alive.publicUrl || publicUrlForToken(alive.token),
        data: {
          success: true,
          token: alive.token,
          publicUrl: alive.publicUrl || publicUrlForToken(alive.token),
          reused: true,
          tokenRecord: alive,
        },
      };
    }
  }

  const empresa = await getEmpresaByClientId(clientId, agencyId);
  const empresaConfig = configFromEmpresa(empresa);
  const hours = hoursFromArgs({ expiresInHours, expiryDays });
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  const token = ID.unique();
  const briefId = ID.unique();
  const responseId = ID.unique();

  const draftPayload = buildCampanhaBriefPayload({
    agencyId,
    clientId,
    empresa,
    campanhaForm: { ...EMPTY_CAMPANHA_FORM },
    modo_criacao: 'formulario',
    userId: user.$id,
  });

  await createPublicRow(
    'briefs',
    {
      ...draftPayload,
      id: briefId,
      status: 'DRAFT',
      title: 'Briefing (aguardando cliente)',
      nome_campanha: '',
      completion_score: 0,
      status_campanha: 'rápido',
      is_public_briefing: true,
      public_token: token,
    },
    teamAndPublicPerms(agencyId, { allowPublicUpdate: true })
  );

  await createPublicRow(
    'public_briefing_responses',
    {
      id: responseId,
      agencyId,
      clientId,
      tokenId: token,
      briefId,
      status: 'draft',
      responses: {},
      progressData: { totalSteps: 5, completedCount: 0 },
      lastSavedAt: new Date().toISOString(),
      metadata: { language, briefKind: 'campanha_mensal' },
    },
    teamAndPublicPerms(agencyId, { allowPublicUpdate: true })
  );

  const tokenRecord = await createPublicRow(
    'public_briefing_tokens',
    {
      id: token,
      agencyId,
      clientId,
      serviceId: serviceId || null,
      token,
      status: 'active',
      expiresAt,
      accessCount: 0,
      publicUrl: publicUrlForToken(token),
      briefId,
      responseId,
      empresaId: empresa?.id || null,
      empresaSnapshot: empresaConfig,
      clientSnapshot: {
        name: client.name,
        legal_name: client.legal_name || null,
      },
      metadata: {
        language,
        briefKind: 'campanha_mensal',
        createdBy: user.$id,
      },
    },
    teamAndPublicPerms(agencyId, { allowPublicUpdate: true })
  );

  const publicUrl = publicUrlForToken(token);
  return {
    success: true,
    reused: false,
    token,
    publicUrl,
    data: {
      success: true,
      token,
      publicUrl,
      reused: false,
      tokenRecord,
      briefId,
      responseId,
    },
  };
}

/**
 * Valida token público (sem login).
 */
export async function validatePublicBriefingToken({ token } = {}) {
  if (!token) {
    const err = new Error('Token obrigatório');
    err.status = 400;
    throw err;
  }

  let record;
  try {
    record = await getPublicRow('public_briefing_tokens', token);
  } catch {
    const err = new Error('Token não encontrado');
    err.status = 404;
    throw err;
  }

  if (!record || record.token !== token) {
    const err = new Error('Token não encontrado');
    err.status = 404;
    throw err;
  }

  if (record.status === 'revoked') {
    const err = new Error('Este link foi revogado');
    err.status = 410;
    throw err;
  }

  if (record.status === 'expired' || new Date(record.expiresAt) < new Date()) {
    try {
      await updatePublicRow('public_briefing_tokens', token, { status: 'expired' });
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
      response = await getPublicRow('public_briefing_responses', record.responseId);
    }
  } catch {
    response = null;
  }
  try {
    if (record.briefId) {
      brief = await getPublicRow('briefs', record.briefId);
    }
  } catch {
    brief = null;
  }

  const alreadySubmitted =
    response?.status === 'submitted' ||
    response?.status === 'completed' ||
    brief?.status === 'READY';

  // bump access (best-effort)
  try {
    await updatePublicRow('public_briefing_tokens', token, {
      accessCount: Number(record.accessCount || 0) + 1,
      lastAccessedAt: new Date().toISOString(),
    });
  } catch {
    /* ignore */
  }

  const fromResponse = response?.responses || {};
  const draftForm = {
    nome_campanha: fromResponse.nome_campanha || brief?.nome_campanha || '',
    objetivo: fromResponse.objetivo || brief?.objetivo || '',
    acoes_comerciais: fromResponse.acoes_comerciais || brief?.acoes_comerciais || '',
    talento_locacao: fromResponse.talento_locacao || brief?.talento_locacao || '',
    data_gravacao_inicio:
      fromResponse.data_gravacao_inicio || brief?.data_gravacao_inicio || '',
    data_gravacao_fim: fromResponse.data_gravacao_fim || brief?.data_gravacao_fim || '',
  };

  return {
    success: true,
    status: 200,
    data: {
      token: record.token,
      clientId: record.clientId,
      agencyId: record.agencyId,
      briefId: record.briefId,
      responseId: record.responseId,
      expiresAt: record.expiresAt,
      alreadySubmitted,
      clientName: record.clientSnapshot?.name || 'Cliente',
      empresaConfig: record.empresaSnapshot || null,
      empresaId: record.empresaId || null,
      briefKind: record.metadata?.briefKind || 'campanha_mensal',
      draftForm,
      responseStatus: response?.status || 'draft',
    },
  };
}

/**
 * Salva respostas do cliente no Response (público) e tenta atualizar Brief/Client.
 */
export async function savePublicBriefingResponse({
  token,
  campanhaForm,
  draft = false,
} = {}) {
  if (!token) throw new Error('Token obrigatório');

  const validation = await validatePublicBriefingToken({ token });
  const ctx = validation.data;

  if (ctx.alreadySubmitted && !draft) {
    const err = new Error('Briefing já foi enviado');
    err.status = 409;
    throw err;
  }

  const form = { ...EMPTY_CAMPANHA_FORM, ...(campanhaForm || {}) };
  if (!draft) {
    const { valid, errors } = validateCampanhaForm(form);
    if (!valid) {
      const err = new Error('Preencha todos os campos obrigatórios');
      err.errors = errors;
      err.status = 400;
      throw err;
    }
  }

  const response = await updatePublicRow('public_briefing_responses', ctx.responseId, {
    status: draft ? 'in_progress' : 'submitted',
    responses: {
      nome_campanha: form.nome_campanha,
      objetivo: form.objetivo,
      acoes_comerciais: form.acoes_comerciais,
      talento_locacao: form.talento_locacao,
      data_gravacao_inicio: form.data_gravacao_inicio,
      data_gravacao_fim: form.data_gravacao_fim,
    },
    progressData: {
      totalSteps: 5,
      completedCount: Object.values(form).filter((v) => String(v || '').trim()).length,
    },
    lastSavedAt: new Date().toISOString(),
    submittedAt: draft ? null : new Date().toISOString(),
  });

  const empresaLike = {
    id: ctx.empresaId,
    publico_alvo: ctx.empresaConfig?.publico_alvo,
    formato_padrao: ctx.empresaConfig?.formato,
    orcamento_padrao_mensal: ctx.empresaConfig?.orcamento,
    tom_brand: ctx.empresaConfig?.tom_brand,
  };

  const briefPatch = buildCampanhaBriefPayload({
    agencyId: ctx.agencyId,
    clientId: ctx.clientId,
    empresa: empresaLike,
    campanhaForm: form,
    modo_criacao: 'formulario',
    userId: null,
  });
  briefPatch.status = draft ? 'DRAFT' : 'READY';
  briefPatch.completion_score = draft ? 40 : 100;
  briefPatch.title = form.nome_campanha || briefPatch.title || 'Briefing campanha';
  briefPatch.is_public_briefing = true;
  briefPatch.public_submitted_at = draft ? null : new Date().toISOString();
  briefPatch.editado_em = new Date().toISOString();
  briefPatch.public_token = token;

  let brief = null;
  let briefUpdated = false;
  try {
    brief = await updatePublicRow('briefs', ctx.briefId, briefPatch);
    briefUpdated = true;
  } catch (err) {
    console.warn('Guest não atualizou brief (ok):', err?.message || err);
  }

  let clientUpdated = false;
  try {
    await getAccount().get();
    if (!briefUpdated) {
      brief = await Brief.update(ctx.briefId, briefPatch);
      briefUpdated = true;
    }
    await Client.update(ctx.clientId, {
      ultimo_briefing_id: ctx.briefId,
      ultimo_briefing_campanha: form.nome_campanha || null,
      ultimo_briefing_em: new Date().toISOString(),
      ultimo_briefing_objetivo: form.objetivo || null,
    });
    clientUpdated = true;
  } catch {
    /* guest / sem sessão */
  }

  await updatePublicRow('public_briefing_tokens', token, {
    pending_brief_sync: !briefUpdated,
    pending_client_sync: !draft && !clientUpdated,
    last_submission: draft
      ? undefined
      : {
          nome_campanha: form.nome_campanha,
          objetivo: form.objetivo,
          briefId: ctx.briefId,
          responseId: ctx.responseId,
          at: new Date().toISOString(),
        },
  });

  // Produção: aplica Brief + Client com API key
  if (!draft && typeof fetch !== 'undefined') {
    try {
      const res = await fetch('/api/public-briefing?route=apply-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        briefUpdated = true;
        clientUpdated = true;
        if (json.brief) brief = json.brief;
      }
    } catch {
      /* vite local sem /api */
    }
  }

  return {
    success: true,
    data: {
      brief,
      response,
      clientUpdated,
      briefUpdated,
      draft,
    },
  };
}

export async function revokePublicBriefingToken({
  tokenId,
  clientId,
  reason = 'revoked_by_user',
} = {}) {
  const account = getAccount();
  const user = await account.get();

  let targetId = tokenId;
  if (!targetId && clientId) {
    const rows = await PublicBriefingToken.filter({ clientId, status: 'active' });
    targetId = rows?.[0]?.id || rows?.[0]?.token;
  }
  if (!targetId) throw new Error('tokenId não encontrado');

  const updated = await PublicBriefingToken.update(targetId, {
    status: 'revoked',
    revokedAt: new Date().toISOString(),
    revokedBy: user.$id,
    revokeReason: reason,
  });

  return { success: true, data: updated };
}

/**
 * Sincroniza Brief + Client a partir da resposta pública (chamado pela agência).
 */
export async function syncClientFromPublicBriefing(briefId, tokenHint = null) {
  if (!briefId && !tokenHint) return null;

  let tokenRecord = null;
  if (tokenHint) {
    tokenRecord =
      (await PublicBriefingToken.get(tokenHint).catch(() => null)) ||
      tokenHint;
    if (tokenRecord && !tokenRecord.briefId && typeof tokenHint === 'object') {
      tokenRecord = tokenHint;
    }
  }

  const resolvedBriefId = briefId || tokenRecord?.briefId;
  if (!resolvedBriefId) return null;

  let brief = await Brief.get(resolvedBriefId);
  if (!brief?.clientId) return null;

  if (!tokenRecord) {
    const tokens = await PublicBriefingToken.filter({
      agencyId: brief.agencyId,
      clientId: brief.clientId,
    }).catch(() => []);
    tokenRecord = (tokens || []).find((t) => t.briefId === resolvedBriefId) || null;
  }

  const responseId = tokenRecord?.responseId;
  let form = { ...EMPTY_CAMPANHA_FORM };
  if (responseId) {
    const response = await PublicBriefingResponse.get(responseId).catch(() => null);
    if (response?.responses) {
      form = { ...form, ...response.responses };
    }
  }

  const empresa = await getEmpresaByClientId(brief.clientId, brief.agencyId);
  const hasAnswers = Object.values(form).some((v) => String(v || '').trim());
  if (hasAnswers) {
    const patch = buildCampanhaBriefPayload({
      agencyId: brief.agencyId,
      clientId: brief.clientId,
      empresa,
      campanhaForm: form,
      modo_criacao: 'formulario',
      userId: null,
    });
    patch.status = 'READY';
    patch.completion_score = 100;
    patch.is_public_briefing = true;
    patch.public_submitted_at = new Date().toISOString();
    brief = await Brief.update(resolvedBriefId, patch);
  }

  await Client.update(brief.clientId, {
    ultimo_briefing_id: resolvedBriefId,
    ultimo_briefing_campanha: form.nome_campanha || brief.nome_campanha || brief.title || null,
    ultimo_briefing_em: new Date().toISOString(),
    ultimo_briefing_objetivo: form.objetivo || brief.objetivo || null,
  });

  if (tokenRecord?.id || tokenRecord?.token) {
    try {
      await PublicBriefingToken.update(tokenRecord.id || tokenRecord.token, {
        pending_client_sync: false,
        pending_brief_sync: false,
      });
    } catch {
      /* ignore */
    }
  }

  return brief;
}
