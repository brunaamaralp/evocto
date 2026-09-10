/**
 * Carrega contexto da empresa + histórico enriquecido das últimas campanhas
 * (briefs mensais + feedback de ciclo) para geração / recomendação de IA.
 */
import { Client, Databases, Query } from 'node-appwrite';
import { DEFAULT_CICLOS_COMERCIAIS } from '../../src/lib/campanhaAnualSchema.js';

const ENDPOINT =
  process.env.APPWRITE_ENDPOINT || process.env.VITE_APPWRITE_ENDPOINT || '';
const PROJECT_ID =
  process.env.APPWRITE_PROJECT_ID ||
  process.env.VITE_APPWRITE_PROJECT_ID ||
  process.env.APPWRITE_PROJECT ||
  process.env.VITE_APPWRITE_PROJECT ||
  '';
const API_KEY = process.env.APPWRITE_API_KEY || '';
const DB_ID =
  process.env.APPWRITE_DATABASE_ID || process.env.VITE_APPWRITE_DATABASE_ID || '';

const EMPRESAS_COL = 'empresas';
const BRIEFS_COL = 'briefs';
const CYCLES_COL = 'cycle_plans';
const FEEDBACK_COL = 'feedback_ciclos';

function getDatabases() {
  if (!ENDPOINT || !PROJECT_ID || !API_KEY) {
    throw new Error('Appwrite server client não configurado (endpoint/project/api key)');
  }
  if (!DB_ID) {
    throw new Error('APPWRITE_DATABASE_ID não configurado');
  }
  const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
  return new Databases(client);
}

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
  const {
    payload,
    $id,
    $createdAt,
    $updatedAt,
    $permissions,
    $databaseId,
    $tableId,
    $collectionId,
    ...rest
  } = doc;
  return {
    ...extra,
    ...rest,
    $id,
    id: $id,
    created_date: $createdAt,
    updated_date: $updatedAt,
  };
}

function monthFromDoc(doc) {
  if (!doc) return null;
  const direct = Number(doc.mes);
  if (Number.isFinite(direct) && direct >= 1 && direct <= 12) return direct;
  const fromPlan = Number(doc.planData?.mes);
  if (Number.isFinite(fromPlan) && fromPlan >= 1 && fromPlan <= 12) return fromPlan;
  const dateStr = doc.start_date || doc.startDate || doc.planData?.start_date;
  if (dateStr) {
    const d = new Date(dateStr);
    if (!Number.isNaN(d.getTime())) return d.getMonth() + 1;
  }
  const period = String(doc.cyclePeriod || '');
  const m = period.match(/\b(1[0-2]|[1-9])\b/);
  if (m) return Number(m[1]);
  return null;
}

function yearFromDoc(doc, fallbackYear) {
  const y = Number(doc?.ano);
  if (Number.isFinite(y) && y > 2000) return y;
  const dateStr = doc?.start_date || doc?.startDate || doc?.created_date;
  if (dateStr) {
    const d = new Date(dateStr);
    if (!Number.isNaN(d.getTime())) return d.getFullYear();
  }
  return fallbackYear;
}

/**
 * Agrega médias de vendas/engajamento por ciclo comercial.
 * @param {Array} campanhas
 */
export function extrairPadroes(campanhas) {
  if (!campanhas?.length) return null;

  const por_ciclo = {};

  campanhas.forEach((c) => {
    if (!c.resultado) return;
    const cicloKey = c.ciclo_comercial || '—';

    if (!por_ciclo[cicloKey]) {
      por_ciclo[cicloKey] = {
        campanhas: 0,
        vendas_avg: 0,
        engajamento_avg: 0,
        notas: [],
      };
    }

    por_ciclo[cicloKey].campanhas += 1;
    por_ciclo[cicloKey].vendas_avg += Number(c.resultado.vendas_realizado) || 0;
    por_ciclo[cicloKey].engajamento_avg += Number(c.resultado.engajamento_realizado) || 0;
    if (c.resultado.aprendizados) {
      por_ciclo[cicloKey].notas.push(c.resultado.aprendizados);
    }
  });

  Object.keys(por_ciclo).forEach((ciclo) => {
    const data = por_ciclo[ciclo];
    data.vendas_avg = data.vendas_avg / data.campanhas;
    data.engajamento_avg = data.engajamento_avg / data.campanhas;
  });

  const entries = Object.entries(por_ciclo);
  if (!entries.length) return null;

  return {
    ciclos: por_ciclo,
    melhor_ciclo_vendas: entries
      .slice()
      .sort((a, b) => b[1].vendas_avg - a[1].vendas_avg)[0]?.[0],
    melhor_ciclo_engajamento: entries
      .slice()
      .sort((a, b) => b[1].engajamento_avg - a[1].engajamento_avg)[0]?.[0],
  };
}

/**
 * @param {Record<string, number[]>} ciclos
 * @param {number} mesAtual
 * @returns {string}
 */
export function identificarCicloProximo(ciclos, mesAtual) {
  const mes = Number(mesAtual);
  for (const [ciclo, meses] of Object.entries(ciclos || {})) {
    if (Array.isArray(meses) && meses.map(Number).includes(mes)) {
      return ciclo;
    }
  }
  return 'vendas';
}

async function loadCiclosPlanejados(databases, empresaId, anoAtual) {
  try {
    const res = await databases.listDocuments(DB_ID, BRIEFS_COL, [
      Query.equal('empresaId', empresaId),
      Query.limit(50),
    ]);
    const anuais = (res.documents || [])
      .map(mergeDoc)
      .filter((b) => b.brief_kind === 'campanha_anual')
      .filter((b) => !b.ano || Number(b.ano) === Number(anoAtual))
      .sort((a, b) => String(b.updated_date || '').localeCompare(String(a.updated_date || '')));

    const ciclos = anuais[0]?.ciclos_comerciais;
    if (ciclos && typeof ciclos === 'object') return ciclos;
  } catch (err) {
    console.warn('[loadContext] falha ao carregar ciclos planejados:', err?.message || err);
  }
  return { ...DEFAULT_CICLOS_COMERCIAIS };
}

async function loadFeedbackForCampanha(databases, campanha) {
  const cycleId = campanha.ciclo_id || campanha.cicloId || campanha.cyclePlanId;

  // Preferência: collection feedback_ciclos
  if (cycleId) {
    try {
      const fb = await databases.listDocuments(DB_ID, FEEDBACK_COL, [
        Query.equal('cycle_id', cycleId),
        Query.limit(1),
      ]);
      if (fb.documents?.[0]) {
        return mergeDoc(fb.documents[0]);
      }
    } catch (err) {
      console.warn('[loadContext] feedback_ciclos:', err?.message || err);
    }
  }

  // Fallback: feedback embutido no cycle plan
  if (cycleId) {
    try {
      const cycle = mergeDoc(await databases.getDocument(DB_ID, CYCLES_COL, cycleId));
      const embedded = cycle?.planData?.feedback || cycle?.feedback || null;
      if (embedded) return embedded;
    } catch {
      // fall through
    }
  }

  const mes = monthFromDoc(campanha);
  const clientId = campanha.clientId;
  if (!clientId || mes == null) return null;

  try {
    const cycles = await databases.listDocuments(DB_ID, CYCLES_COL, [
      Query.equal('clientId', clientId),
      Query.limit(50),
    ]);
    const match = (cycles.documents || [])
      .map(mergeDoc)
      .find((c) => monthFromDoc(c) === mes);
    if (!match) return null;

    try {
      const fb = await databases.listDocuments(DB_ID, FEEDBACK_COL, [
        Query.equal('cycle_id', match.id || match.$id),
        Query.limit(1),
      ]);
      if (fb.documents?.[0]) return mergeDoc(fb.documents[0]);
    } catch {
      // ignore
    }

    return match?.planData?.feedback || match?.feedback || null;
  } catch (err) {
    console.warn('[loadContext] falha ao buscar cycle/feedback:', err?.message || err);
    return null;
  }
}

function mapFeedbackResultado(feedback) {
  if (!feedback) return null;
  return {
    vendas_realizado: feedback.vendas_realizado,
    engajamento_realizado:
      feedback.engajamento_realizado ?? feedback.engagement_realizado ?? null,
    o_que_funcionou: feedback.o_que_funcionou,
    o_que_nao_funcionou: feedback.o_que_nao_funcionou,
    aprendizados: feedback.aprendizados,
    nota_geral: feedback.nota_geral ?? null,
  };
}

/**
 * @param {string} empresaId
 * @param {number} mesAtual
 * @param {{ databases?: import('node-appwrite').Databases, anoAtual?: number }} [opts]
 */
export async function loadContext(empresaId, mesAtual, opts = {}) {
  if (!empresaId) {
    throw new Error('empresaId obrigatório');
  }
  const mes = Number(mesAtual);
  if (!Number.isFinite(mes) || mes < 1 || mes > 12) {
    throw new Error('mesAtual deve ser 1–12');
  }

  const databases = opts.databases || getDatabases();
  const anoAtual = opts.anoAtual || new Date().getFullYear();

  const empresaRaw = mergeDoc(await databases.getDocument(DB_ID, EMPRESAS_COL, empresaId));
  const empresa = {
    id: empresaRaw.id || empresaId,
    nome: empresaRaw.nome || '',
    tipo: empresaRaw.tipo || empresaRaw.tipo_negocio || null,
    produtos: empresaRaw.produtos_linhas || empresaRaw.produtos || [],
  };

  const ciclos_comerciais_planejados = await loadCiclosPlanejados(
    databases,
    empresaId,
    anoAtual
  );

  // Últimas campanhas mensais (empresaId indexado; brief_kind/mes no payload)
  const briefsRes = await databases.listDocuments(DB_ID, BRIEFS_COL, [
    Query.equal('empresaId', empresaId),
    Query.limit(100),
  ]);

  const campanhasAnteriores = (briefsRes.documents || [])
    .map(mergeDoc)
    .filter((b) => b.brief_kind === 'campanha_mensal')
    .sort((a, b) => {
      const ya = yearFromDoc(a, 0);
      const yb = yearFromDoc(b, 0);
      if (yb !== ya) return yb - ya;
      return (monthFromDoc(b) || 0) - (monthFromDoc(a) || 0);
    })
    .slice(0, 6);

  const campanhasComFeedback = await Promise.all(
    campanhasAnteriores.map(async (campanha) => {
      const feedback = await loadFeedbackForCampanha(databases, campanha);
      return {
        mes: monthFromDoc(campanha),
        ano: yearFromDoc(campanha, anoAtual),
        nome_campanha: campanha.nome_campanha || campanha.title || null,
        ciclo_comercial: campanha.ciclo_comercial || null,
        linha_focal: campanha.linha_focal || null,
        resultado: mapFeedbackResultado(feedback),
        notas_criativas: feedback?.notas_criativas ?? null,
        recomendacoes_proxima: feedback?.recomendacoes_proxima ?? null,
      };
    })
  );

  return {
    empresa,
    mesAtual: mes,
    anoAtual,
    campanhas_anteriores: campanhasComFeedback,
    ultima_campanha: campanhasComFeedback[0] || null,
    padroes_performance: extrairPadroes(campanhasComFeedback),
    ciclos_comerciais_planejados,
    ciclo_proximo: identificarCicloProximo(ciclos_comerciais_planejados, mes),
  };
}

export default loadContext;
