import {
  BRIEF_KIND_ANUAL,
  calendarYearForPlanMonth,
  normalizeCampanhaAnualPayload,
  planMonthWindow,
} from '@/lib/campanhaAnualSchema';
import { createPageUrl } from '@/utils';

const MES_NOMES = [
  '',
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

/**
 * Extrai o plano anual mais recente dos briefs já carregados no hub.
 */
export function deriveAnnualPlanFromBriefs(briefs = [], ano = new Date().getFullYear()) {
  const anuais = (briefs || [])
    .filter((b) => b?.brief_kind === BRIEF_KIND_ANUAL || b?.brief_kind === 'campanha_anual')
    .map((b) => ({ ...b, ...normalizeCampanhaAnualPayload(b) }))
    .filter((b) => !b.ano || Number(b.ano) === Number(ano))
    .sort((a, b) =>
      String(b.updated_date || b.$updatedAt || '').localeCompare(
        String(a.updated_date || a.$updatedAt || '')
      )
    );

  return anuais[0] || null;
}

export function getPlanMonth(plan, mes = new Date().getMonth() + 1) {
  if (!plan) return null;
  const mesNum = Number(mes);
  const campanha = (plan.campanhas || []).find((c) => Number(c?.mes) === mesNum) || null;
  const tema = (plan.temas_sugeridos || []).find((t) => Number(t?.mes) === mesNum) || null;
  const seed = (plan.briefings_mes || []).find((s) => Number(s?.mes) === mesNum) || null;
  if (!campanha && !tema && !seed) return null;

  const status = campanha?.status_mes || (tema?.titulo ? 'tema' : 'vazio');
  const mesInicio = plan.mes_inicio || 1;
  const calYear = calendarYearForPlanMonth(mesNum, mesInicio, plan.ano);
  return {
    mes: mesNum,
    ano: calYear,
    mesLabel: MES_NOMES[mesNum] || String(mesNum),
    mesShort: (MES_NOMES[mesNum] || '').slice(0, 3) || String(mesNum),
    campanha,
    tema,
    seed,
    status_mes: status,
    actionable:
      Boolean(campanha) &&
      campanha.status_mes !== 'materializado' &&
      campanha.status_mes !== 'rejeitado',
    materializado: campanha?.status_mes === 'materializado',
    brief_mensal_id: campanha?.brief_mensal_id || null,
    ciclo_entrega_id: campanha?.ciclo_entrega_id || null,
  };
}

/** Lista os 12 meses na ordem do plano (mes_inicio). */
export function listPlanMonths(plan) {
  if (!plan) return [];
  const mesInicio = plan.mes_inicio || 1;
  return planMonthWindow(mesInicio).map((mes) => {
    const info = getPlanMonth(plan, mes);
    if (info) return info;
    const calYear = calendarYearForPlanMonth(mes, mesInicio, plan.ano);
    return {
      mes,
      ano: calYear,
      mesLabel: MES_NOMES[mes],
      mesShort: MES_NOMES[mes].slice(0, 3),
      campanha: null,
      tema: null,
      seed: null,
      status_mes: 'vazio',
      actionable: false,
      materializado: false,
      brief_mensal_id: null,
      ciclo_entrega_id: null,
    };
  });
}

export function planMonthStatusTone(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'materializado') return 'done';
  if (s === 'aprovado' || s === 'editado' || s === 'gerado') return 'ready';
  if (s === 'tema') return 'tema';
  if (s === 'rejeitado') return 'reject';
  return 'empty';
}

export function buildAnnualPlanHref(clientId, planId = null) {
  const base = `briefing-campanha-anual?clientId=${clientId}`;
  return createPageUrl(planId ? `${base}&briefingId=${planId}` : base);
}

export function buildBrainstormHref(
  clientId,
  { mes, ano, planId, modo = 'avulso', serviceId = null } = {}
) {
  const m = Number(mes) || new Date().getMonth() + 1;
  const y = Number(ano) || new Date().getFullYear();
  const mode = modo === 'plano' ? 'plano' : 'avulso';
  let path = `client-brainstorm?clientId=${clientId}&modo=${mode}&mes=${m}&ano=${y}`;
  if (planId && mode === 'plano') path += `&planId=${planId}`;
  if (serviceId) path += `&serviceId=${encodeURIComponent(serviceId)}`;
  return createPageUrl(path);
}

/** @deprecated use buildBrainstormHref */
export function buildBrainstormPlanHref(clientId, opts = {}) {
  return buildBrainstormHref(clientId, { ...opts, modo: 'plano' });
}

export function buildBriefingCampanhaHref(clientId, mode = null, serviceId = null) {
  let path = `briefing-campanha?clientId=${clientId}`;
  if (mode) path += `&mode=${mode}`;
  if (serviceId) path += `&serviceId=${encodeURIComponent(serviceId)}`;
  return createPageUrl(path);
}

export { MES_NOMES };
