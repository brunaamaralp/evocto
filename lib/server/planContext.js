/**
 * Contexto do plano anual (Brief campanha_anual) para hub / brainstorm / agent.
 * Schema real: brief_kind = campanha_anual, array campanhas[] (não "meses").
 */
import { Query } from 'node-appwrite';
import { getDatabases, getDatabaseId } from './appwrite.js';

const BRIEFS_COL = 'briefs';

function mergeDoc(doc) {
  if (!doc) return null;
  let extra = {};
  if (doc.payload) {
    try {
      extra = typeof doc.payload === 'string' ? JSON.parse(doc.payload) : doc.payload || {};
    } catch {
      extra = {};
    }
  }
  const { payload, $id, $createdAt, $updatedAt, ...rest } = doc;
  return {
    ...extra,
    ...rest,
    $id,
    id: $id,
    created_date: $createdAt,
    updated_date: $updatedAt,
  };
}

function summarizeAnualProgress(campanhas = []) {
  const byStatus = {
    gerado: 0,
    editado: 0,
    aprovado: 0,
    materializado: 0,
    rejeitado: 0,
  };
  for (const c of campanhas) {
    const s = c?.status_mes || 'gerado';
    if (byStatus[s] != null) byStatus[s] += 1;
  }
  return {
    total_meses: campanhas.length,
    ...byStatus,
    com_brief_mensal: campanhas.filter((c) => c?.brief_mensal_id).length,
  };
}

function pickTema(plan, mes) {
  const temas = Array.isArray(plan?.temas_sugeridos) ? plan.temas_sugeridos : [];
  const tema = temas.find((t) => Number(t?.mes) === Number(mes));
  if (!tema) return null;
  return {
    titulo: tema.titulo || '',
    ideia_central: tema.ideia_central || '',
    produto_focal: tema.produto_focal || '',
    ciclo: tema.ciclo || '',
    selecionado: tema.selecionado !== false,
  };
}

function pickSeed(plan, mes) {
  const seeds = Array.isArray(plan?.briefings_mes) ? plan.briefings_mes : [];
  const seed = seeds.find((s) => Number(s?.mes) === Number(mes));
  if (!seed) return null;
  return {
    nome_campanha_sugerido: seed.nome_campanha_sugerido || '',
    ciclo_comercial: seed?.['01_estrategia']?.ciclo_comercial || '',
    objetivo: seed?.['01_estrategia']?.objetivo || '',
    conceito: seed?.['02_conceito']?.conceito || seed?.['02_conceito']?.nome || '',
  };
}

function pickCampanha(plan, mes) {
  const list = Array.isArray(plan?.campanhas) ? plan.campanhas : [];
  const c = list.find((item) => Number(item?.mes) === Number(mes));
  if (!c) return null;
  return {
    mes: Number(c.mes),
    nome_campanha: c.nome_campanha || '',
    ciclo_comercial: c.ciclo_comercial || '',
    produto_focal: c.produto_focal || '',
    resumo_executivo: c.resumo_executivo || '',
    status_mes: c.status_mes || 'gerado',
    brief_mensal_id: c.brief_mensal_id || null,
    ciclo_entrega_id: c.ciclo_entrega_id || null,
  };
}

/**
 * Carrega o Brief anual mais recente da empresa/cliente para o ano.
 */
export async function findAnnualPlan(opts = {}) {
  const {
    databases = getDatabases(),
    empresaId = null,
    clientId = null,
    ano = new Date().getFullYear(),
  } = opts;

  if (!empresaId && !clientId) return null;

  const queries = [Query.limit(50)];
  if (empresaId) queries.unshift(Query.equal('empresaId', empresaId));
  else if (clientId) queries.unshift(Query.equal('clientId', clientId));

  const res = await databases.listDocuments(getDatabaseId(), BRIEFS_COL, queries);
  const anuais = (res.documents || [])
    .map(mergeDoc)
    .filter((b) => b.brief_kind === 'campanha_anual')
    .filter((b) => !b.ano || Number(b.ano) === Number(ano))
    .sort((a, b) =>
      String(b.updated_date || b.$updatedAt || '').localeCompare(
        String(a.updated_date || a.$updatedAt || '')
      )
    );

  return anuais[0] || null;
}

/**
 * Fatia do plano para um mês — usado no agent e no hub.
 */
export function slicePlanMonth(plan, mes) {
  if (!plan) return null;
  const mesNum = Number(mes);
  if (!Number.isFinite(mesNum) || mesNum < 1 || mesNum > 12) return null;

  const campanha = pickCampanha(plan, mesNum);
  const tema = pickTema(plan, mesNum);
  const seed = pickSeed(plan, mesNum);
  const progress = summarizeAnualProgress(plan.campanhas || []);

  return {
    plan_id: plan.id || plan.$id || null,
    ano: Number(plan.ano) || null,
    status_anual: plan.status_anual || null,
    mes: mesNum,
    tema,
    seed,
    campanha,
    progress,
    actionable:
      Boolean(campanha) &&
      campanha.status_mes !== 'materializado' &&
      campanha.status_mes !== 'rejeitado',
    materializado: campanha?.status_mes === 'materializado',
  };
}

/**
 * GET-like: load-plan-context
 */
export async function loadPlanContext({
  databases = getDatabases(),
  empresaId = null,
  clientId = null,
  ano = new Date().getFullYear(),
  mes = null,
} = {}) {
  const plan = await findAnnualPlan({ databases, empresaId, clientId, ano });
  if (!plan) {
    return {
      success: true,
      has_plan: false,
      plan: null,
      mes_contexto: null,
    };
  }

  const campanhas = Array.isArray(plan.campanhas) ? plan.campanhas : [];
  const progress = summarizeAnualProgress(campanhas);
  const mesNum = mes != null ? Number(mes) : new Date().getMonth() + 1;

  const monthsSummary = campanhas.map((c) => ({
    mes: Number(c.mes),
    nome_campanha: c.nome_campanha || '',
    status_mes: c.status_mes || 'gerado',
    ciclo_comercial: c.ciclo_comercial || '',
    brief_mensal_id: c.brief_mensal_id || null,
    ciclo_entrega_id: c.ciclo_entrega_id || null,
  }));

  return {
    success: true,
    has_plan: true,
    plan: {
      id: plan.id || plan.$id,
      ano: Number(plan.ano) || Number(ano),
      status_anual: plan.status_anual || null,
      empresaId: plan.empresaId || empresaId || null,
      clientId: plan.clientId || clientId || null,
      progress,
      months: monthsSummary,
    },
    mes_contexto: slicePlanMonth(plan, mesNum),
  };
}

/**
 * PATCH-like: update-plan-month — vincula brief/ciclo criados ao mês do plano.
 */
export async function updatePlanMonth({
  databases = getDatabases(),
  planId = null,
  empresaId = null,
  clientId = null,
  ano = new Date().getFullYear(),
  mes,
  brief_mensal_id = null,
  ciclo_entrega_id = null,
  status_mes = 'materializado',
  nome_campanha = null,
} = {}) {
  const mesNum = Number(mes);
  if (!Number.isFinite(mesNum) || mesNum < 1 || mesNum > 12) {
    throw Object.assign(new Error('mes_invalido'), { code: 'mes_invalido', status: 400 });
  }

  let plan = null;
  if (planId) {
    try {
      plan = mergeDoc(
        await databases.getDocument(getDatabaseId(), BRIEFS_COL, planId)
      );
    } catch {
      plan = null;
    }
  }
  if (!plan) {
    plan = await findAnnualPlan({ databases, empresaId, clientId, ano });
  }
  if (!plan?.id) {
    return { success: false, updated: false, reason: 'plan_not_found' };
  }

  const campanhas = Array.isArray(plan.campanhas) ? [...plan.campanhas] : [];
  const idx = campanhas.findIndex((c) => Number(c?.mes) === mesNum);
  const base =
    idx >= 0
      ? { ...campanhas[idx] }
      : {
          mes: mesNum,
          nome_campanha: '',
          ciclo_comercial: '',
          produto_focal: '',
          resumo_executivo: '',
          status_mes: 'gerado',
          brief_mensal_id: null,
          ciclo_entrega_id: null,
        };

  const next = {
    ...base,
    status_mes: status_mes || base.status_mes || 'materializado',
    brief_mensal_id: brief_mensal_id || base.brief_mensal_id || null,
    ciclo_entrega_id: ciclo_entrega_id || base.ciclo_entrega_id || null,
  };
  if (nome_campanha) next.nome_campanha = nome_campanha;

  if (idx >= 0) campanhas[idx] = next;
  else campanhas.push(next);

  campanhas.sort((a, b) => Number(a.mes) - Number(b.mes));

  const progress = summarizeAnualProgress(campanhas);
  const status_anual =
    progress.materializado >= 12
      ? 'aprovado'
      : progress.materializado > 0
        ? 'aprovado_parcial'
        : plan.status_anual || 'ia_gerou';

  const payload = {
    ...plan,
    campanhas,
    status_anual,
    brief_kind: 'campanha_anual',
    editado_em: new Date().toISOString(),
  };

  // Remove Appwrite meta before re-serializing into payload
  const {
    $id,
    id,
    $createdAt,
    $updatedAt,
    created_date,
    updated_date,
    payload: _oldPayload,
    ...persistable
  } = payload;

  const row = {
    payload: JSON.stringify(persistable),
  };
  if (status_anual) {
    // keep typed status if collection has it — ignore errors by only sending payload
  }

  await databases.updateDocument(getDatabaseId(), BRIEFS_COL, plan.id, row);

  return {
    success: true,
    updated: true,
    plan_id: plan.id,
    mes: mesNum,
    status_mes: next.status_mes,
    status_anual,
    brief_mensal_id: next.brief_mensal_id,
    ciclo_entrega_id: next.ciclo_entrega_id,
  };
}

export default {
  findAnnualPlan,
  slicePlanMonth,
  loadPlanContext,
  updatePlanMonth,
};
