import { describe, it, expect } from 'vitest';
import {
  statusFromCampaignBrief,
  buildPanoramaMonths,
  summarizeCicloDistribution,
  buildPlanejamentoHref,
  findNextEmptyMonth,
  extractPanoramaTrends,
  extractRecentCampaignFeedback,
  buildPanoramaSuggestion,
} from '../panoramaAnual.js';

describe('statusFromCampaignBrief', () => {
  it('empty sem brief', () => {
    expect(statusFromCampaignBrief(null)).toBe('empty');
  });

  it('done por status', () => {
    expect(statusFromCampaignBrief({ status_campanha: 'completed' })).toBe('done');
    expect(statusFromCampaignBrief({ status: 'publicado' })).toBe('done');
  });

  it('active por ciclo ou status execução', () => {
    expect(statusFromCampaignBrief({ ciclo_id: 'c1', title: 'X' })).toBe('active');
    expect(statusFromCampaignBrief({ status: 'em_execucao' })).toBe('active');
  });

  it('planned com ideia/título', () => {
    expect(statusFromCampaignBrief({ nome_campanha: 'Black Friday' })).toBe(
      'planned'
    );
  });
});

describe('buildPanoramaMonths', () => {
  it('preenche 12 meses e mapeia campanhas do ano', () => {
    const months = buildPanoramaMonths(
      [
        {
          id: 'b1',
          brief_kind: 'campanha_mensal',
          mes: 3,
          ano: 2026,
          nome_campanha: 'Março',
          status_campanha: 'em_execucao',
          serviceId: 's1',
          ciclo_final: 'atração',
        },
        {
          id: 'b2',
          brief_kind: 'campanha_mensal',
          mes: 3,
          ano: 2025,
          nome_campanha: 'outro ano',
        },
      ],
      2026
    );
    expect(months).toHaveLength(12);
    expect(months[2]).toMatchObject({
      mes: 3,
      status: 'active',
      campaignId: 'b1',
      title: 'Março',
      ciclo: 'atração',
      serviceId: 's1',
    });
    expect(months[0].status).toBe('empty');
  });
});

describe('summarizeCicloDistribution', () => {
  it('conta ciclos e vazios', () => {
    const dist = summarizeCicloDistribution([
      { status: 'empty' },
      { status: 'planned', ciclo: 'atração' },
      { status: 'active', ciclo: 'atração' },
      { status: 'done', ciclo: 'conversão' },
    ]);
    expect(dist.empty).toBe(1);
    expect(dist.withCampaign).toBe(3);
    expect(dist.bars.find((b) => b.ciclo === 'atração')?.count).toBe(2);
  });
});

describe('buildPlanejamentoHref', () => {
  it('monta URL com clientId e ano opcional', () => {
    expect(buildPlanejamentoHref('cli1')).toBe('/planejamento?clientId=cli1');
    expect(buildPlanejamentoHref('cli1', { ano: 2026 })).toBe(
      '/planejamento?clientId=cli1&ano=2026'
    );
    expect(buildPlanejamentoHref('')).toBe('/clients');
  });
});

describe('findNextEmptyMonth / trends / suggestion', () => {
  const baseMonths = Array.from({ length: 12 }, (_, i) => ({
    mes: i + 1,
    label: `M${i + 1}`,
    status: 'empty',
    campaignId: null,
    title: null,
    ciclo: null,
    brief: null,
  }));

  it('findNextEmptyMonth encontra a partir do mês atual', () => {
    const months = baseMonths.map((m) =>
      m.mes <= 2
        ? { ...m, status: 'planned', campaignId: `c${m.mes}` }
        : m
    );
    expect(findNextEmptyMonth(months, 1)?.mes).toBe(3);
    expect(findNextEmptyMonth(months, 3)?.mes).toBe(3);
  });

  it('extractPanoramaTrends lê aprendizado das campanhas', () => {
    const months = baseMonths.map((m) =>
      m.mes === 4
        ? {
            ...m,
            status: 'done',
            title: 'Abr',
            brief: { aprendizado: 'Reels performou melhor' },
          }
        : m
    );
    const trends = extractPanoramaTrends(months);
    expect(trends).toHaveLength(1);
    expect(trends[0].text).toContain('Reels');
  });

  it('buildPanoramaSuggestion sugere rebalanceio quando um ciclo domina', () => {
    const months = baseMonths.map((m, i) =>
      i < 5
        ? { ...m, status: 'done', ciclo: 'atração' }
        : m.mes === 6
          ? { ...m, status: 'empty' }
          : m
    );
    const suggestion = buildPanoramaSuggestion({ months, fromMes: 1 });
    expect(suggestion.kind).toBe('rebalance');
    expect(suggestion.nextMes).toBe(6);
  });
});

describe('extractRecentCampaignFeedback', () => {
  it('retorna até 3 campanhas com aprendizado/feedback', () => {
    const items = extractRecentCampaignFeedback(
      [
        {
          id: 'a',
          brief_kind: 'campanha_mensal',
          mes: 1,
          ano: 2026,
          status_campanha: 'completed',
          nome_campanha: 'Jan',
          aprendizado: 'A',
        },
        {
          id: 'b',
          brief_kind: 'campanha_mensal',
          mes: 2,
          ano: 2026,
          status_campanha: 'completed',
          nome_campanha: 'Fev',
          feedbackCliente: 'B',
        },
        {
          id: 'c',
          brief_kind: 'campanha_mensal',
          mes: 3,
          ano: 2026,
          nome_campanha: 'Mar',
          resultado: { nota_geral: 8 },
        },
        {
          id: 'd',
          brief_kind: 'campanha_mensal',
          mes: 4,
          ano: 2026,
          nome_campanha: 'sem feedback',
        },
      ],
      { limit: 3 }
    );
    expect(items).toHaveLength(3);
    expect(items.map((i) => i.id).sort()).toEqual(['a', 'b', 'c']);
    expect(items[0].id).toBe('b'); // mesmo status done → mês mais recente
  });
});
