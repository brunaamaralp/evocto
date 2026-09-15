/**
 * Panorama Anual — visão viva dos 12 meses (Planejamento HOME).
 * Spec: docs/SPEC_PLANEJAMENTO_ITERATIVO.md (PI-0+)
 */

import { BRIEF_KIND_CAMPANHA_MENSAL, isCampanhaUnitBrief } from '@/lib/campanhaIdeia';

export const MES_LABELS_CURTOS = Object.freeze([
  '',
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
]);

/** @typedef {'empty' | 'planned' | 'active' | 'done'} PanoramaMonthStatus */

/**
 * @param {object | null | undefined} brief
 * @returns {PanoramaMonthStatus}
 */
export function statusFromCampaignBrief(brief) {
  if (!brief) return 'empty';
  const raw = String(
    brief.status_campanha || brief.status || ''
  ).toLowerCase();
  if (
    ['completed', 'done', 'concluida', 'concluído', 'publicado', 'published'].includes(
      raw
    )
  ) {
    return 'done';
  }
  if (
    ['planejada', 'planejado', 'planned', 'rascunho', 'draft'].includes(raw)
  ) {
    return 'planned';
  }
  if (
    ['em_execucao', 'in_execution', 'in_progress', 'active', 'rápido', 'rapido'].includes(
      raw
    ) ||
    brief.ciclo_id ||
    brief.cycleId
  ) {
    return 'active';
  }
  // Ideia salva sem ciclo ainda
  if (brief.ideia || brief.nome_campanha || brief.title) return 'planned';
  return 'empty';
}

/**
 * Monta os 12 meses a partir das campanhas mensais do ano.
 * @param {object[]} briefs
 * @param {number} ano
 */
export function buildPanoramaMonths(briefs = [], ano = new Date().getFullYear()) {
  const year = Number(ano) || new Date().getFullYear();
  const byMes = new Map();

  for (const brief of Array.isArray(briefs) ? briefs : []) {
    if (!isCampanhaUnitBrief(brief) && brief?.brief_kind !== BRIEF_KIND_CAMPANHA_MENSAL) {
      continue;
    }
    const briefAno =
      brief.ano != null
        ? Number(brief.ano)
        : brief.data_gravacao_inicio
          ? new Date(brief.data_gravacao_inicio).getFullYear()
          : null;
    if (briefAno && briefAno !== year) continue;

    let mes = brief.mes != null ? Number(brief.mes) : null;
    if (!mes && brief.data_gravacao_inicio) {
      mes = new Date(brief.data_gravacao_inicio).getMonth() + 1;
    }
    if (!mes || mes < 1 || mes > 12) continue;

    const prev = byMes.get(mes);
    // Prefere a mais recente / em execução
    if (!prev || statusRank(statusFromCampaignBrief(brief)) >= statusRank(prev.status)) {
      byMes.set(mes, {
        mes,
        label: MES_LABELS_CURTOS[mes],
        status: statusFromCampaignBrief(brief),
        campaignId: brief.id || null,
        title: brief.nome_campanha || brief.title || brief.ideia?.titulo || null,
        ciclo: brief.ciclo_final || brief.ciclo_comercial || brief.ideia?.ciclo || null,
        serviceId: brief.serviceId || null,
        brief,
      });
    }
  }

  return Array.from({ length: 12 }, (_, i) => {
    const mes = i + 1;
    return (
      byMes.get(mes) || {
        mes,
        label: MES_LABELS_CURTOS[mes],
        status: 'empty',
        campaignId: null,
        title: null,
        ciclo: null,
        serviceId: null,
        brief: null,
      }
    );
  });
}

function statusRank(status) {
  if (status === 'done') return 3;
  if (status === 'active') return 2;
  if (status === 'planned') return 1;
  return 0;
}

export function panoramaStatusIcon(status) {
  if (status === 'done') return '✅';
  if (status === 'active') return '🔄';
  if (status === 'planned') return '📝';
  return '⭕';
}

export function panoramaStatusLabel(status) {
  if (status === 'done') return 'Concluído';
  if (status === 'active') return 'Em execução';
  if (status === 'planned') return 'Planejado';
  return 'A planejar';
}

/**
 * Contagem simples de ciclos (para bloco visual PI-0/1).
 * @param {ReturnType<typeof buildPanoramaMonths>} months
 */
export function summarizeCicloDistribution(months = []) {
  const counts = {};
  let withCampaign = 0;
  let empty = 0;
  for (const m of months) {
    if (m.status === 'empty') {
      empty += 1;
      continue;
    }
    withCampaign += 1;
    const key = String(m.ciclo || 'sem_ciclo').trim() || 'sem_ciclo';
    counts[key] = (counts[key] || 0) + 1;
  }
  const total = withCampaign || 1;
  const bars = Object.entries(counts)
    .map(([ciclo, n]) => ({
      ciclo,
      count: n,
      percent: Math.round((n / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
  return {
    bars,
    withCampaign,
    empty,
    plannedEmptyLabel: empty,
  };
}

/**
 * Próximo mês vazio a partir de `fromMes` (1–12), com wrap no ano.
 * @param {ReturnType<typeof buildPanoramaMonths>} months
 * @param {number} [fromMes]
 */
export function findNextEmptyMonth(months = [], fromMes = new Date().getMonth() + 1) {
  const start = Math.min(12, Math.max(1, Number(fromMes) || 1));
  for (let i = 0; i < 12; i += 1) {
    const mes = ((start - 1 + i) % 12) + 1;
    const row = months.find((m) => m.mes === mes);
    if (row?.status === 'empty') return row;
  }
  return null;
}

/**
 * Tendências a partir de aprendizados já gravados nas campanhas (PI-1 placeholder).
 * @param {ReturnType<typeof buildPanoramaMonths>} months
 * @param {{ limit?: number }} [opts]
 */
export function extractPanoramaTrends(months = [], { limit = 3 } = {}) {
  const items = [];
  for (const m of months) {
    if (!m?.brief) continue;
    const text =
      m.brief.aprendizado ||
      m.brief.feedbackCliente ||
      m.brief.ideia?.aprendizado ||
      null;
    if (!text || !String(text).trim()) continue;
    items.push({
      mes: m.mes,
      label: m.label,
      title: m.title,
      text: String(text).trim(),
      status: m.status,
    });
  }
  // Prefer concluídas / em execução; mais recentes por mês
  items.sort((a, b) => {
    const rank = (s) => (s === 'done' ? 2 : s === 'active' ? 1 : 0);
    return rank(b.status) - rank(a.status) || b.mes - a.mes;
  });
  return items.slice(0, limit);
}

/**
 * PI-3 — últimas campanhas com feedback/aprendizado para FeedbackSidebar.
 * @param {object[]} briefs
 * @param {{ limit?: number, preferDone?: boolean }} [opts]
 */
export function extractRecentCampaignFeedback(briefs = [], { limit = 3, preferDone = true } = {}) {
  const rows = [];
  for (const brief of Array.isArray(briefs) ? briefs : []) {
    if (!isCampanhaUnitBrief(brief) && brief?.brief_kind !== BRIEF_KIND_CAMPANHA_MENSAL) {
      continue;
    }
    const aprendizado = brief.aprendizado ? String(brief.aprendizado).trim() : '';
    const feedbackCliente = brief.feedbackCliente
      ? String(brief.feedbackCliente).trim()
      : '';
    const resultado =
      brief.resultado && typeof brief.resultado === 'object' ? brief.resultado : null;
    const hasResultadoSignal = Boolean(
      resultado &&
        (resultado.nota_geral != null ||
          resultado.o_que_funcionou ||
          resultado.o_que_nao_funcionou ||
          resultado.vendas_realizado != null)
    );
    if (!aprendizado && !feedbackCliente && !hasResultadoSignal) continue;

    const status = statusFromCampaignBrief(brief);
    const mes =
      brief.mes != null
        ? Number(brief.mes)
        : brief.data_gravacao_inicio
          ? new Date(brief.data_gravacao_inicio).getMonth() + 1
          : null;
    const ano =
      brief.ano != null
        ? Number(brief.ano)
        : brief.data_gravacao_inicio
          ? new Date(brief.data_gravacao_inicio).getFullYear()
          : null;

    rows.push({
      id: brief.id || null,
      mes,
      ano,
      label: mes && MES_LABELS_CURTOS[mes] ? MES_LABELS_CURTOS[mes] : '—',
      title: brief.nome_campanha || brief.title || brief.ideia?.titulo || 'Campanha',
      status,
      aprendizado,
      feedbackCliente,
      resultado,
      ciclo: brief.ciclo_final || brief.ciclo_comercial || brief.ideia?.ciclo || null,
    });
  }

  rows.sort((a, b) => {
    if (preferDone) {
      const rank = (s) => (s === 'done' ? 2 : s === 'active' ? 1 : 0);
      const byStatus = rank(b.status) - rank(a.status);
      if (byStatus) return byStatus;
    }
    const ya = a.ano || 0;
    const yb = b.ano || 0;
    if (yb !== ya) return yb - ya;
    return (b.mes || 0) - (a.mes || 0);
  });

  return rows.slice(0, limit);
}

/**
 * Sugestão heurística de rebalanceio / próximo mês (sem IA — PI-1).
 * @param {{ months?: ReturnType<typeof buildPanoramaMonths>, dist?: ReturnType<typeof summarizeCicloDistribution>, fromMes?: number }} args
 */
export function buildPanoramaSuggestion({
  months = [],
  dist = null,
  fromMes = new Date().getMonth() + 1,
} = {}) {
  const distribution = dist || summarizeCicloDistribution(months);
  const nextEmpty = findNextEmptyMonth(months, fromMes);
  const dominant = distribution.bars[0];

  if (distribution.withCampaign === 0) {
    return {
      kind: 'start',
      headline: 'Comece pelo próximo mês',
      body: nextEmpty
        ? `Ainda não há campanhas em ${nextEmpty.label}. Planeje esse mês primeiro.`
        : 'Crie a primeira campanha do ano pelo botão Nova Campanha.',
      nextMes: nextEmpty?.mes || null,
    };
  }

  if (dominant && dominant.percent >= 60 && distribution.bars.length >= 1) {
    const cicloLabel = String(dominant.ciclo).replace(/_/g, ' ');
    return {
      kind: 'rebalance',
      headline: 'Rebalancear ciclos',
      body: nextEmpty
        ? `${dominant.percent}% das campanhas estão em “${cicloLabel}”. Em ${nextEmpty.label}, teste outro ciclo.`
        : `${dominant.percent}% das campanhas estão em “${cicloLabel}”. Diversifique no próximo planejamento.`,
      nextMes: nextEmpty?.mes || null,
    };
  }

  if (nextEmpty) {
    return {
      kind: 'continue',
      headline: `Planejar ${nextEmpty.label}`,
      body: `${distribution.empty} mês(es) ainda vazios. O próximo natural é ${nextEmpty.label}.`,
      nextMes: nextEmpty.mes,
    };
  }

  return {
    kind: 'full',
    headline: 'Ano coberto',
    body: 'Todos os meses têm campanha. Revise status ou abra um mês para ajustar a ideia.',
    nextMes: null,
  };
}

/**
 * @param {string} clientId
 * @param {{ ano?: number }} [opts]
 */
export function buildPlanejamentoHref(clientId, { ano = null } = {}) {
  const id = String(clientId || '').trim();
  if (!id) return '/clients';
  const params = new URLSearchParams();
  params.set('clientId', id);
  if (ano) params.set('ano', String(ano));
  return `/planejamento?${params.toString()}`;
}
