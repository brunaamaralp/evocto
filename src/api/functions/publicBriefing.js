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
import {
  getEmpresaByClientId,
  configFromEmpresa,
  saveEmpresa,
  normalizeFormato,
} from '@/lib/empresaConfig';
import {
  BRIEF_KIND_INICIAL,
  buildAnualPayloadFromInicial,
  emptyBriefingInicialForm,
  normalizeBriefingInicialForm,
  validateBriefingInicialForm,
  countInicialProgress,
} from '@/lib/briefingInicial';
import {
  BRIEF_KIND_ANUAL,
  normalizeCampanhaAnualPayload,
} from '@/lib/campanhaAnualSchema';

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
  return 168;
}

function isInicialToken(t) {
  const kind = t?.metadata?.briefKind;
  return !kind || kind === BRIEF_KIND_INICIAL;
}

/**
 * Gera link público do briefing inicial (Empresa + insumos do plano anual).
 * Máximo 1 token ativo de briefing_inicial por cliente.
 */
export async function generatePublicBriefingToken({
  clientId,
  serviceId = null,
  language = 'pt',
  expiresInHours,
  expiryDays,
  reuseIfActiveExists = true,
  agencyId: agencyIdArg = null,
  briefKind = BRIEF_KIND_INICIAL,
} = {}) {
  if (!clientId) throw new Error('clientId é obrigatório');

  const kind = briefKind || BRIEF_KIND_INICIAL;
  if (kind !== BRIEF_KIND_INICIAL) {
    throw new Error(
      'Links públicos só são permitidos para o briefing inicial da empresa'
    );
  }

  const account = getAccount();
  const user = await account.get();
  const client = await Client.get(clientId);
  if (!client) throw new Error('Cliente não encontrado');

  const agencyId = agencyIdArg || client.agencyId;
  if (!agencyId) throw new Error('agencyId ausente');

  const existing = await PublicBriefingToken.filter({
    agencyId,
    clientId,
    status: 'active',
  }).catch(() => []);

  const aliveInicial = (existing || []).find(
    (t) =>
      isInicialToken(t) &&
      t.expiresAt &&
      new Date(t.expiresAt) > new Date() &&
      !t.last_submission
  );

  if (reuseIfActiveExists && aliveInicial?.token) {
    return {
      success: true,
      reused: true,
      token: aliveInicial.token,
      publicUrl: aliveInicial.publicUrl || publicUrlForToken(aliveInicial.token),
      data: {
        success: true,
        token: aliveInicial.token,
        publicUrl: aliveInicial.publicUrl || publicUrlForToken(aliveInicial.token),
        reused: true,
        tokenRecord: aliveInicial,
      },
    };
  }

  // Revoga outros tokens iniciais ativos ao regenerar
  for (const t of existing || []) {
    if (isInicialToken(t) && t.status === 'active' && (t.id || t.token)) {
      try {
        await PublicBriefingToken.update(t.id || t.token, {
          status: 'revoked',
          revokedAt: new Date().toISOString(),
          revokeReason: 'replaced_by_new_inicial',
        });
      } catch {
        /* ignore */
      }
    }
  }

  const empresa = await getEmpresaByClientId(clientId, agencyId).catch(() => null);
  const empresaConfig = configFromEmpresa(empresa);
  const hours = hoursFromArgs({ expiresInHours, expiryDays });
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  const token = ID.unique();
  const briefId = ID.unique();
  const responseId = ID.unique();

  const emptyForm = emptyBriefingInicialForm(client.name || '');
  if (empresa) {
    emptyForm.empresa = {
      ...emptyForm.empresa,
      nome: empresa.nome || client.name || '',
      publico_alvo: empresa.publico_alvo || '',
      formato_padrao: normalizeFormato(empresa.formato_padrao),
      orcamento_padrao_mensal: empresa.orcamento_padrao_mensal ?? '',
      tom_brand: empresa.tom_brand || '',
      restricoes_criativas: empresa.restricoes_criativas || '',
      produtos_linhas: empresa.produtos_linhas || [],
      brand_guidelines: empresa.brand_guidelines || null,
    };
  }

  const draftAnual = {
    agencyId,
    clientId,
    projectId: clientId,
    empresaId: empresa?.id || null,
    brief_kind: BRIEF_KIND_ANUAL,
    title: `Plano anual ${emptyForm.ano} — aguardando cliente`,
    status: 'DRAFT',
    status_anual: 'rascunho',
    ano: emptyForm.ano,
    ciclos_comerciais: emptyForm.ciclos_comerciais,
    briefings_mes: emptyForm.briefings_mes,
    campanhas: [],
    completion_score: 0,
    is_public_briefing: true,
    origem_briefing_inicial: true,
    public_token: token,
  };

  await createPublicRow(
    'briefs',
    { ...draftAnual, id: briefId },
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
      responses: emptyForm,
      progressData: { totalSteps: 6, completedCount: 0 },
      lastSavedAt: new Date().toISOString(),
      metadata: { language, briefKind: BRIEF_KIND_INICIAL },
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
        briefKind: BRIEF_KIND_INICIAL,
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

  const briefKind =
    record.metadata?.briefKind ||
    response?.metadata?.briefKind ||
    BRIEF_KIND_INICIAL;

  const alreadySubmitted =
    Boolean(record.last_submission) ||
    response?.status === 'submitted' ||
    response?.status === 'completed' ||
    (brief?.status === 'READY' && brief?.origem_briefing_inicial);

  try {
    await updatePublicRow('public_briefing_tokens', token, {
      accessCount: Number(record.accessCount || 0) + 1,
      lastAccessedAt: new Date().toISOString(),
    });
  } catch {
    /* ignore */
  }

  const fromResponse = response?.responses || {};
  const draftForm = normalizeBriefingInicialForm(
    fromResponse.empresa || fromResponse.ciclos_comerciais
      ? fromResponse
      : {
          empresa: fromResponse,
          ano: brief?.ano,
          ciclos_comerciais: brief?.ciclos_comerciais,
          briefings_mes: brief?.briefings_mes,
        },
    record.clientSnapshot?.name || ''
  );

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
      briefKind,
      draftForm,
      responseStatus: response?.status || 'draft',
    },
  };
}

/**
 * Salva respostas do briefing inicial (Empresa + ciclos/seeds → plano anual).
 */
export async function savePublicBriefingResponse({
  token,
  inicialForm,
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

  // Legacy callers passing campanhaForm are rejected for new tokens
  if (campanhaForm && !inicialForm && ctx.briefKind === BRIEF_KIND_INICIAL) {
    const err = new Error(
      'Este link é do briefing inicial. Envie empresa + insumos do plano anual.'
    );
    err.status = 400;
    throw err;
  }

  const form = normalizeBriefingInicialForm(
    inicialForm || campanhaForm || {},
    ctx.clientName
  );

  if (!draft) {
    const { valid, errors } = validateBriefingInicialForm(form);
    if (!valid) {
      const err = new Error('Preencha todos os campos obrigatórios');
      err.errors = errors;
      err.status = 400;
      throw err;
    }
  }

  const progress = countInicialProgress(form);

  const response = await updatePublicRow('public_briefing_responses', ctx.responseId, {
    status: draft ? 'in_progress' : 'submitted',
    responses: form,
    progressData: {
      totalSteps: progress.total,
      completedCount: progress.done,
    },
    lastSavedAt: new Date().toISOString(),
    submittedAt: draft ? null : new Date().toISOString(),
    metadata: { briefKind: BRIEF_KIND_INICIAL },
  });

  let empresa = null;
  let brief = null;
  let briefUpdated = false;
  let empresaUpdated = false;
  let clientUpdated = false;

  // Com sessão (agência): grava Empresa + Brief direto
  try {
    await getAccount().get();
    empresa = await saveEmpresa({
      empresaId: ctx.empresaId || null,
      agencyId: ctx.agencyId,
      clientId: ctx.clientId,
      form: form.empresa,
      userId: null,
    });
    empresaUpdated = true;

    const existingBrief = await Brief.get(ctx.briefId).catch(() => null);
    const anualPayload = buildAnualPayloadFromInicial({
      agencyId: ctx.agencyId,
      clientId: ctx.clientId,
      empresa,
      form,
      existing: existingBrief,
    });
    anualPayload.is_public_briefing = true;
    anualPayload.origem_briefing_inicial = true;
    anualPayload.public_token = token;
    anualPayload.public_submitted_at = draft ? null : new Date().toISOString();
    anualPayload.status = draft ? 'DRAFT' : anualPayload.status;
    anualPayload.completion_score = draft ? 30 : anualPayload.completion_score;

    brief = await Brief.update(ctx.briefId, anualPayload);
    briefUpdated = true;

    if (!draft) {
      await Client.update(ctx.clientId, {
        ultimo_briefing_id: ctx.briefId,
        ultimo_briefing_campanha: `Plano anual ${form.ano}`,
        ultimo_briefing_em: new Date().toISOString(),
        ultimo_briefing_objetivo: 'Briefing inicial da empresa',
      });
      clientUpdated = true;
    }
  } catch {
    // Guest: tenta patch público do brief + API admin
    try {
      const patch = {
        brief_kind: BRIEF_KIND_ANUAL,
        title: `Plano anual ${form.ano} — ${form.empresa.nome || 'Campanhas'}`,
        status: draft ? 'DRAFT' : 'DRAFT',
        status_anual: draft ? 'rascunho' : 'input_pronto',
        ano: form.ano,
        ciclos_comerciais: form.ciclos_comerciais,
        briefings_mes: form.briefings_mes,
        produtos_snapshot: form.empresa.produtos_linhas,
        is_public_briefing: true,
        origem_briefing_inicial: true,
        public_token: token,
        public_submitted_at: draft ? null : new Date().toISOString(),
        completion_score: draft ? 30 : 60,
        editado_em: new Date().toISOString(),
        // snapshot empresa no brief até apply-client criar Empresa
        _empresa_form: form.empresa,
      };
      brief = await updatePublicRow('briefs', ctx.briefId, patch);
      briefUpdated = true;
    } catch (err) {
      console.warn('Guest não atualizou brief (ok):', err?.message || err);
    }
  }

  await updatePublicRow('public_briefing_tokens', token, {
    pending_brief_sync: !briefUpdated,
    pending_client_sync: !draft && !clientUpdated,
    empresaId: empresa?.id || ctx.empresaId || null,
    empresaSnapshot: empresa ? configFromEmpresa(empresa) : {
      publico_alvo: form.empresa.publico_alvo,
      formato: normalizeFormato(form.empresa.formato_padrao),
      orcamento: Number(form.empresa.orcamento_padrao_mensal) || 0,
      tom_brand: form.empresa.tom_brand,
      restricoes_criativas: form.empresa.restricoes_criativas,
      produtos_linhas: form.empresa.produtos_linhas,
    },
    last_submission: draft
      ? undefined
      : {
          tipo: BRIEF_KIND_INICIAL,
          ano: form.ano,
          empresa_nome: form.empresa.nome,
          briefId: ctx.briefId,
          responseId: ctx.responseId,
          at: new Date().toISOString(),
        },
    metadata: {
      ...(typeof ctx === 'object' ? {} : {}),
      briefKind: BRIEF_KIND_INICIAL,
      submittedAt: draft ? undefined : new Date().toISOString(),
    },
  });

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
        empresaUpdated = true;
        if (json.brief) brief = json.brief;
        if (json.empresa) empresa = json.empresa;
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
      empresa,
      clientUpdated,
      briefUpdated,
      empresaUpdated,
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
    const inicial = (rows || []).find((t) => isInicialToken(t));
    targetId = inicial?.id || inicial?.token || rows?.[0]?.id || rows?.[0]?.token;
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
 * Sincroniza Empresa + plano anual a partir da resposta pública (agência).
 */
export async function syncClientFromPublicBriefing(briefId, tokenHint = null) {
  if (!briefId && !tokenHint) return null;

  let tokenRecord = null;
  if (tokenHint) {
    tokenRecord =
      (await PublicBriefingToken.get(
        typeof tokenHint === 'string' ? tokenHint : tokenHint.id || tokenHint.token
      ).catch(() => null)) || tokenHint;
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
  let form = emptyBriefingInicialForm();
  if (responseId) {
    const response = await PublicBriefingResponse.get(responseId).catch(() => null);
    if (response?.responses) {
      form = normalizeBriefingInicialForm(response.responses);
    }
  }

  const { valid } = validateBriefingInicialForm(form);
  if (!valid && !brief._empresa_form) {
    return brief;
  }

  let empresa = await getEmpresaByClientId(brief.clientId, brief.agencyId);
  if (valid) {
    empresa = await saveEmpresa({
      empresaId: empresa?.id || brief.empresaId || null,
      agencyId: brief.agencyId,
      clientId: brief.clientId,
      form: form.empresa,
      userId: null,
    });
  }

  if (empresa) {
    const payload = buildAnualPayloadFromInicial({
      agencyId: brief.agencyId,
      clientId: brief.clientId,
      empresa,
      form,
      existing: normalizeCampanhaAnualPayload(brief),
    });
    payload.is_public_briefing = true;
    payload.origem_briefing_inicial = true;
    payload.public_submitted_at = new Date().toISOString();
    brief = await Brief.update(resolvedBriefId, payload);
  }

  await Client.update(brief.clientId, {
    ultimo_briefing_id: resolvedBriefId,
    ultimo_briefing_campanha: `Plano anual ${form.ano || brief.ano || ''}`,
    ultimo_briefing_em: new Date().toISOString(),
    ultimo_briefing_objetivo: 'Briefing inicial da empresa',
  });

  if (tokenRecord?.id || tokenRecord?.token) {
    try {
      await PublicBriefingToken.update(tokenRecord.id || tokenRecord.token, {
        pending_client_sync: false,
        pending_brief_sync: false,
        empresaId: empresa?.id || null,
      });
    } catch {
      /* ignore */
    }
  }

  return brief;
}
