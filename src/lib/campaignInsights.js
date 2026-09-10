/**
 * Análise de padrões e recomendações a partir de feedbacks de ciclo (P3).
 * Heurísticas determinísticas — sem ML externo.
 */

import { isCycleFeedbackComplete, normalizeCycleFeedback } from '@/lib/cycleFeedback';
import { buildCampaignsPerformanceReport } from '@/lib/personaDashboard';
import { CICLOS_COMERCIAIS_OPS, TIPOS_CAMPANHA } from '@/lib/tipoCampanhaPipeline';

function parseMetric(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const s = String(value).trim().replace(',', '.').replace(/%/g, '');
  const m = s.match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

function scoreFeedback(feedback) {
  const f = normalizeCycleFeedback(feedback || {});
  const vendas = parseMetric(f.vendas_realizado);
  const eng = parseMetric(f.engagement_realizado);
  const metaV = parseMetric(f.vendas_meta);
  const metaE = parseMetric(f.engagement_esperado);

  let score = 50;
  if (vendas != null && metaV != null && metaV !== 0) {
    score += Math.max(-25, Math.min(25, ((vendas - metaV) / Math.abs(metaV)) * 25));
  } else if (vendas != null) {
    score += Math.min(15, vendas > 0 ? 10 : -5);
  }
  if (eng != null && metaE != null && metaE !== 0) {
    score += Math.max(-20, Math.min(20, ((eng - metaE) / Math.abs(metaE)) * 20));
  } else if (eng != null) {
    score += Math.min(10, eng > 0 ? 8 : -3);
  }
  if (String(f.o_que_funcionou || '').trim().length > 20) score += 5;
  if (String(f.o_que_nao_funcionou || '').trim().length > 40) score -= 3;
  return Math.round(Math.max(0, Math.min(100, score)));
}

function avg(nums) {
  const list = nums.filter((n) => n != null && Number.isFinite(n));
  if (!list.length) return null;
  return list.reduce((a, b) => a + b, 0) / list.length;
}

function groupStats(rows, keyFn) {
  const map = new Map();
  for (const row of rows) {
    const key = keyFn(row) || '—';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  const out = [];
  for (const [key, items] of map.entries()) {
    const scores = items.map((r) => r.score);
    const vendas = items.map((r) => parseMetric(r.vendas_realizado));
    const eng = items.map((r) => parseMetric(r.engagement_realizado));
    out.push({
      key,
      count: items.length,
      avgScore: avg(scores),
      avgVendas: avg(vendas),
      avgEngagement: avg(eng),
      withFeedback: items.filter((r) => r.hasFeedback).length,
    });
  }
  return out.sort((a, b) => (b.avgScore ?? -1) - (a.avgScore ?? -1));
}

/**
 * Analisa padrões nas últimas campanhas.
 */
export function analyzeCampaignPatterns(cyclePlans = [], limit = 12) {
  const report = buildCampaignsPerformanceReport(cyclePlans, limit);
  const rows = report.rows.map((r) => ({
    ...r,
    score: r.hasFeedback ? scoreFeedback(r.feedback) : null,
  }));
  const scored = rows.filter((r) => r.score != null);

  const byCiclo = groupStats(scored, (r) => r.ciclo_comercial);
  const byTipo = groupStats(scored, (r) => r.tipo_campanha);
  const byLinha = groupStats(scored, (r) => r.linha_focal);

  const learnings = scored
    .flatMap((r) => {
      const f = normalizeCycleFeedback(r.feedback);
      return [
        f.aprendizados && {
          cycleId: r.id,
          title: r.title,
          text: f.aprendizados,
          kind: 'aprendizado',
          score: r.score,
        },
        f.o_que_funcionou && {
          cycleId: r.id,
          title: r.title,
          text: f.o_que_funcionou,
          kind: 'funcionou',
          score: r.score,
        },
        f.o_que_nao_funcionou && {
          cycleId: r.id,
          title: r.title,
          text: f.o_que_nao_funcionou,
          kind: 'nao_funcionou',
          score: r.score,
        },
      ].filter(Boolean);
    })
    .slice(0, 20);

  return {
    sampleSize: rows.length,
    scoredCount: scored.length,
    overallAvgScore: avg(scored.map((r) => r.score)),
    byCiclo,
    byTipo,
    byLinha,
    topCiclo: byCiclo[0] || null,
    topTipo: byTipo[0] || null,
    topLinha: byLinha.filter((x) => x.key !== '—')[0] || byLinha[0] || null,
    learnings,
    rows,
  };
}

function labelCiclo(key) {
  return CICLOS_COMERCIAIS_OPS.find((c) => c.value === key)?.label || key;
}

function labelTipo(key) {
  return TIPOS_CAMPANHA.find((t) => t.value === key)?.label || key;
}

/**
 * Gera recomendações para a próxima campanha.
 * @param {object} analysis - retorno de analyzeCampaignPatterns
 * @param {{ nextCiclo?: string, clientName?: string }} ctx
 */
export function buildNextCampaignRecommendations(analysis, ctx = {}) {
  const recs = [];
  const scored = analysis?.scoredCount || 0;

  if (scored < 2) {
    recs.push({
      id: 'need_more_data',
      priority: 'medium',
      title: 'Registre mais resultados',
      description:
        'Com pelo menos 2–3 ciclos com feedback, dá para cruzar ciclo × tipo × linha com confiança.',
      actions: ['Preencher resultado ao fechar cada ciclo', 'Materializar meses do plano anual'],
    });
    return recs;
  }

  if (analysis.topCiclo?.key && analysis.topCiclo.key !== '—') {
    recs.push({
      id: 'best_ciclo',
      priority: 'high',
      title: `Ciclo que performa melhor: ${labelCiclo(analysis.topCiclo.key)}`,
      description: `Média de score ${Math.round(analysis.topCiclo.avgScore ?? 0)} em ${analysis.topCiclo.count} campanha(s).`,
      meta: { ciclo_comercial: analysis.topCiclo.key },
      actions: [
        ctx.nextCiclo && ctx.nextCiclo !== analysis.topCiclo.key
          ? `Próximo mês é ${labelCiclo(ctx.nextCiclo)} — adapte o tom, não force o formato de ${labelCiclo(analysis.topCiclo.key)}`
          : `Considere manter densidade de ${labelCiclo(analysis.topCiclo.key)} no calendário anual`,
      ].filter(Boolean),
    });
  }

  if (analysis.topTipo?.key && analysis.topTipo.key !== '—') {
    recs.push({
      id: 'best_tipo',
      priority: 'high',
      title: `Tipo com melhor retorno: ${labelTipo(analysis.topTipo.key)}`,
      description: `Score médio ${Math.round(analysis.topTipo.avgScore ?? 0)} · ${analysis.topTipo.count} ciclo(s).`,
      meta: { tipo_campanha: analysis.topTipo.key },
      actions: [
        `Na próxima VENDAS/ENGAJAMENTO, priorize pipeline ${labelTipo(analysis.topTipo.key)}`,
      ],
    });
  }

  if (analysis.topLinha?.key && analysis.topLinha.key !== '—') {
    recs.push({
      id: 'best_linha',
      priority: 'medium',
      title: `Linha focal em destaque: ${analysis.topLinha.key}`,
      description: `Score médio ${Math.round(analysis.topLinha.avgScore ?? 0)}.`,
      meta: { linha_focal: analysis.topLinha.key },
      actions: [
        `Próxima campanha de VENDAS: considere destacar ${analysis.topLinha.key}`,
      ],
    });
  }

  const weakCiclo = [...(analysis.byCiclo || [])]
    .filter((c) => c.key !== '—' && c.count >= 1)
    .sort((a, b) => (a.avgScore ?? 99) - (b.avgScore ?? 99))[0];
  if (weakCiclo && analysis.topCiclo && weakCiclo.key !== analysis.topCiclo.key) {
    recs.push({
      id: 'weak_ciclo',
      priority: 'medium',
      title: `Atenção ao ciclo ${labelCiclo(weakCiclo.key)}`,
      description: `Score médio ${Math.round(weakCiclo.avgScore ?? 0)} — abaixo dos demais.`,
      meta: { ciclo_comercial: weakCiclo.key },
      actions: [
        'Revise aprendizados dos meses fracos antes de repetir o formato',
        'Considere UGC ou só posts se produção pesada não pagou',
      ],
    });
  }

  const worked = (analysis.learnings || []).filter((l) => l.kind === 'funcionou').slice(0, 3);
  if (worked.length) {
    recs.push({
      id: 'reuse_what_worked',
      priority: 'low',
      title: 'Reaproveitar o que funcionou',
      description: worked.map((w) => w.text).join(' · ').slice(0, 280),
      actions: worked.map((w) => `${w.title}: ${String(w.text).slice(0, 80)}`),
    });
  }

  if (ctx.clientName) {
    recs.push({
      id: 'client_context',
      priority: 'low',
      title: `Próximo passo para ${ctx.clientName}`,
      description: 'Use o briefing anual + estes padrões ao materializar o próximo mês.',
      actions: ['Abrir plano anual', 'Materializar mês com tipo/ciclo sugeridos'],
    });
  }

  return recs;
}

export function formatRecommendationForPrompt(recs = []) {
  return recs
    .map(
      (r, i) =>
        `${i + 1}. [${r.priority}] ${r.title}\n   ${r.description}\n   Ações: ${(r.actions || []).join('; ')}`
    )
    .join('\n');
}

export default {
  analyzeCampaignPatterns,
  buildNextCampaignRecommendations,
  scoreFeedback,
  formatRecommendationForPrompt,
};
