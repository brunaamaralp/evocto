import { describe, expect, it } from 'vitest';
import {
  DEFAULT_OPERATIONAL_CYCLE_CONFIG,
  addDaysToYmd,
  daysRemainingInOperationalWeek,
  formatOperationalDaysRemaining,
  formatOperationalWeekContext,
  formatOperationalWeekPeriod,
  getOperationalPhasesForActivityKind,
  listMondaysInMonth,
  operationalWeekStartMondayYmd,
  phaseIncludesActivityKind,
  resolveAgencyOperationalCycle,
  resolveAgencyOperationalPhase,
  resolveOperationalCycleConfig,
  slotFromMondayIndex,
  slotsForMondayCount,
  weekdayFromYmd,
} from '../agencyOperationalCycle.js';

describe('weekdayFromYmd / operationalWeekStartMondayYmd', () => {
  it('segunda = 1; domingo = 0', () => {
    expect(weekdayFromYmd('2026-09-07')).toBe(1); // Mon
    expect(weekdayFromYmd('2026-09-13')).toBe(0); // Sun
  });

  it('domingo anterior à próxima segunda mapeia para a segunda da semana atual', () => {
    // Dom 13/set → segunda 07/set
    expect(operationalWeekStartMondayYmd('2026-09-13')).toBe('2026-09-07');
  });

  it('virada domingo → segunda', () => {
    expect(operationalWeekStartMondayYmd('2026-09-13')).toBe('2026-09-07');
    expect(operationalWeekStartMondayYmd('2026-09-14')).toBe('2026-09-14');
  });
});

describe('listMondaysInMonth', () => {
  it('mês com 4 segundas (setembro 2026)', () => {
    // Set/2026: segundas em 7, 14, 21, 28
    expect(listMondaysInMonth('2026-09')).toEqual([
      '2026-09-07',
      '2026-09-14',
      '2026-09-21',
      '2026-09-28',
    ]);
  });

  it('mês com 5 segundas (março 2026)', () => {
    // Mar/2026 começa no domingo; segundas: 2, 9, 16, 23, 30
    expect(listMondaysInMonth('2026-03')).toEqual([
      '2026-03-02',
      '2026-03-09',
      '2026-03-16',
      '2026-03-23',
      '2026-03-30',
    ]);
  });

  it('mês começando numa segunda (junho 2026)', () => {
    expect(listMondaysInMonth('2026-06')[0]).toBe('2026-06-01');
  });

  it('mês começando numa terça (setembro 2026)', () => {
    // 1/set/2026 = terça → primeira segunda = 7
    expect(listMondaysInMonth('2026-09')[0]).toBe('2026-09-07');
  });

  it('mês começando numa quinta (outubro 2026)', () => {
    // 1/out/2026 = quinta → primeira segunda = 5
    expect(listMondaysInMonth('2026-10')[0]).toBe('2026-10-05');
  });

  it('mês começando num domingo (fevereiro 2026)', () => {
    // 1/fev/2026 = domingo → primeira segunda = 2
    expect(listMondaysInMonth('2026-02')[0]).toBe('2026-02-02');
  });

  it('fevereiro bissexto com 5 segundas (2024)', () => {
    // 2024 bissexto; 1/fev = quinta; segundas: 5,12,19,26 — só 4
    // Fevereiro 2016: 1=seg → 1,8,15,22,29 (5)
    expect(listMondaysInMonth('2016-02')).toEqual([
      '2016-02-01',
      '2016-02-08',
      '2016-02-15',
      '2016-02-22',
      '2016-02-29',
    ]);
  });
});

describe('slotFromMondayIndex', () => {
  it('4 segundas: first/second/third/last', () => {
    expect(slotFromMondayIndex(0, 4)).toBe('first');
    expect(slotFromMondayIndex(1, 4)).toBe('second');
    expect(slotFromMondayIndex(2, 4)).toBe('third');
    expect(slotFromMondayIndex(3, 4)).toBe('last');
  });

  it('5 segundas: intermediate na 4ª', () => {
    expect(slotFromMondayIndex(3, 5)).toBe('intermediate');
    expect(slotFromMondayIndex(4, 5)).toBe('last');
  });
});

describe('resolveAgencyOperationalPhase — mês com 4 segundas (set/2026)', () => {
  const config = DEFAULT_OPERATIONAL_CYCLE_CONFIG;

  it('primeira segunda-feira → Roteiros', () => {
    const r = resolveAgencyOperationalPhase('2026-09-07', config);
    expect(r).toMatchObject({
      slot: 'first',
      phaseKey: 'roteiros',
      label: 'Roteiros',
      weekOrdinal: 1,
      isLastWeek: false,
      operationalMonth: '2026-09',
      operationalWeekStartYmd: '2026-09-07',
      operationalWeekEndYmd: '2026-09-13',
    });
  });

  it('segunda segunda-feira → Gravações & Fotos', () => {
    const r = resolveAgencyOperationalPhase('2026-09-14', config);
    expect(r).toMatchObject({
      slot: 'second',
      phaseKey: 'gravacoes_fotos',
      weekOrdinal: 2,
    });
  });

  it('terceira segunda-feira → Edição & Calendários', () => {
    const r = resolveAgencyOperationalPhase('2026-09-21', config);
    expect(r).toMatchObject({
      slot: 'third',
      phaseKey: 'edicao_calendarios',
      weekOrdinal: 3,
      isLastWeek: false,
    });
  });

  it('última segunda-feira → Reuniões', () => {
    const r = resolveAgencyOperationalPhase('2026-09-28', config);
    expect(r).toMatchObject({
      slot: 'last',
      phaseKey: 'reunioes',
      weekOrdinal: 4,
      isLastWeek: true,
    });
  });

  it('quarta no meio da 3ª semana operacional', () => {
    const r = resolveAgencyOperationalPhase('2026-09-23', config);
    expect(r.slot).toBe('third');
    expect(r.operationalWeekStartYmd).toBe('2026-09-21');
  });

  it('domingo da última semana ainda é Reuniões', () => {
    const r = resolveAgencyOperationalPhase('2026-10-04', config);
    // Dom 4/out ainda na semana da segunda 28/set
    expect(r).toMatchObject({
      slot: 'last',
      phaseKey: 'reunioes',
      operationalMonth: '2026-09',
      operationalWeekStartYmd: '2026-09-28',
    });
  });
});

describe('resolveAgencyOperationalPhase — mês com 5 segundas (mar/2026)', () => {
  const config = DEFAULT_OPERATIONAL_CYCLE_CONFIG;

  it('semana intermediária (4ª segunda)', () => {
    const r = resolveAgencyOperationalPhase('2026-03-23', config);
    expect(r).toMatchObject({
      slot: 'intermediate',
      phaseKey: 'finalizacoes_ajustes',
      weekOrdinal: 4,
      isLastWeek: false,
      operationalMonth: '2026-03',
    });
  });

  it('última segunda → Reuniões', () => {
    const r = resolveAgencyOperationalPhase('2026-03-30', config);
    expect(r).toMatchObject({
      slot: 'last',
      phaseKey: 'reunioes',
      weekOrdinal: 5,
      isLastWeek: true,
    });
  });
});

describe('transição entre meses (dias antes da 1ª segunda)', () => {
  const config = DEFAULT_OPERATIONAL_CYCLE_CONFIG;

  it('outubro 2026 começa quinta: dias 1–4 ainda são última semana de setembro', () => {
    // 1/out = quinta; segunda da semana = 28/set
    for (const day of ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']) {
      const r = resolveAgencyOperationalPhase(day, config);
      expect(r, day).toMatchObject({
        slot: 'last',
        phaseKey: 'reunioes',
        operationalMonth: '2026-09',
        operationalWeekStartYmd: '2026-09-28',
      });
    }
  });

  it('primeira semana de outubro começa na 1ª segunda (05/10)', () => {
    const r = resolveAgencyOperationalPhase('2026-10-05', config);
    expect(r).toMatchObject({
      slot: 'first',
      phaseKey: 'roteiros',
      operationalMonth: '2026-10',
      operationalWeekStartYmd: '2026-10-05',
    });
  });

  it('mês começando numa terça: 1º ainda pertence ao mês da segunda anterior', () => {
    // 1/set/2026 = terça; segunda da semana = 31/ago
    const r = resolveAgencyOperationalPhase('2026-09-01', config);
    expect(r).toMatchObject({
      operationalMonth: '2026-08',
      operationalWeekStartYmd: '2026-08-31',
      slot: 'last',
      phaseKey: 'reunioes',
    });
  });

  it('mês começando num domingo: o domingo 1º ainda é última semana do mês anterior', () => {
    // 1/fev/2026 = domingo; segunda = 26/jan
    const r = resolveAgencyOperationalPhase('2026-02-01', config);
    expect(r).toMatchObject({
      operationalMonth: '2026-01',
      operationalWeekStartYmd: '2026-01-26',
      slot: 'last',
    });
  });

  it('mês começando numa segunda: dia 1 já é first', () => {
    const r = resolveAgencyOperationalPhase('2026-06-01', config);
    expect(r).toMatchObject({
      slot: 'first',
      phaseKey: 'roteiros',
      operationalMonth: '2026-06',
      operationalWeekStartYmd: '2026-06-01',
    });
  });
});

describe('transição dezembro → janeiro', () => {
  it('dias de janeiro ainda na semana da última segunda de dezembro', () => {
    // Dez/2025: última segunda = 29/dez; 1/jan/2026 = quinta
    const r = resolveAgencyOperationalPhase('2026-01-01', DEFAULT_OPERATIONAL_CYCLE_CONFIG);
    expect(r).toMatchObject({
      operationalMonth: '2025-12',
      operationalWeekStartYmd: '2025-12-29',
      slot: 'last',
      phaseKey: 'reunioes',
    });
  });

  it('primeira segunda de janeiro inicia o mês operacional', () => {
    // Jan/2026: primeira segunda = 5
    const r = resolveAgencyOperationalPhase('2026-01-05', DEFAULT_OPERATIONAL_CYCLE_CONFIG);
    expect(r).toMatchObject({
      operationalMonth: '2026-01',
      slot: 'first',
      phaseKey: 'roteiros',
    });
  });
});

describe('config / fallback / enabled', () => {
  it('sem config usa DEFAULT', () => {
    const r = resolveAgencyOperationalPhase('2026-09-21');
    expect(r.phaseKey).toBe('edicao_calendarios');
    expect(r.label).toBe('Edição & Calendários');
  });

  it('config inválida faz merge seguro com default', () => {
    const cfg = resolveOperationalCycleConfig({
      enabled: true,
      phases: { first: { label: 'Só label' } },
    });
    expect(cfg.phases.first.key).toBe('roteiros');
    expect(cfg.phases.first.label).toBe('Só label');
    expect(cfg.phases.first.description).toContain('roteiros');
  });

  it('enabled === false → null (não mostra indicador)', () => {
    expect(
      resolveAgencyOperationalPhase('2026-09-21', { enabled: false })
    ).toBeNull();
  });

  it('null/undefined config → enabled true com defaults', () => {
    const cfg = resolveOperationalCycleConfig(null);
    expect(cfg.enabled).toBe(true);
    expect(cfg.phases.last.key).toBe('reunioes');
  });
});

describe('formatOperationalWeekContext', () => {
  it('ordinal e última semana', () => {
    const third = resolveAgencyOperationalPhase('2026-09-21');
    expect(formatOperationalWeekContext(third)).toBe('3ª semana do ciclo');
    const last = resolveAgencyOperationalPhase('2026-09-28');
    expect(formatOperationalWeekContext(last)).toBe('Última semana do ciclo');
  });
});

describe('addDaysToYmd sanity', () => {
  it('atravessa meses', () => {
    expect(addDaysToYmd('2026-09-28', 6)).toBe('2026-10-04');
  });
});

describe('resolveAgencyOperationalCycle — timeline', () => {
  it('mês com 4 segundas → 4 fases; intermediate ausente', () => {
    const cycle = resolveAgencyOperationalCycle('2026-09-23');
    expect(cycle.mondayCount).toBe(4);
    expect(cycle.phases).toHaveLength(4);
    expect(cycle.phases.map((p) => p.slot)).toEqual([
      'first',
      'second',
      'third',
      'last',
    ]);
    expect(cycle.phases.some((p) => p.slot === 'intermediate')).toBe(false);
  });

  it('mês com 5 segundas → 5 fases; intermediate presente', () => {
    const cycle = resolveAgencyOperationalCycle('2026-03-16');
    expect(cycle.mondayCount).toBe(5);
    expect(cycle.phases).toHaveLength(5);
    expect(cycle.phases.map((p) => p.slot)).toEqual([
      'first',
      'second',
      'third',
      'intermediate',
      'last',
    ]);
  });

  it('estados completed/current/upcoming com third atual', () => {
    const cycle = resolveAgencyOperationalCycle('2026-09-23');
    expect(cycle.phases.map((p) => p.state)).toEqual([
      'completed',
      'completed',
      'current',
      'upcoming',
    ]);
    expect(cycle.currentPhase.slot).toBe('third');
    expect(cycle.currentPhase.phaseKey).toBe('edicao_calendarios');
  });

  it('primeira fase atual', () => {
    const cycle = resolveAgencyOperationalCycle('2026-09-09');
    expect(cycle.currentPhase.slot).toBe('first');
    expect(cycle.phases.map((p) => p.state)).toEqual([
      'current',
      'upcoming',
      'upcoming',
      'upcoming',
    ]);
  });

  it('última fase atual', () => {
    const cycle = resolveAgencyOperationalCycle('2026-09-30');
    expect(cycle.currentPhase.slot).toBe('last');
    expect(cycle.phases.map((p) => p.state)).toEqual([
      'completed',
      'completed',
      'completed',
      'current',
    ]);
  });

  it('transição entre meses: 1/out ainda no ciclo de setembro', () => {
    const cycle = resolveAgencyOperationalCycle('2026-10-01');
    expect(cycle.operationalMonth).toBe('2026-09');
    expect(cycle.currentPhase.slot).toBe('last');
    expect(cycle.phases).toHaveLength(4);
  });

  it('config customizada reflete labels na timeline', () => {
    const cycle = resolveAgencyOperationalCycle('2026-09-23', {
      enabled: true,
      phases: {
        third: { label: 'Edição custom' },
        last: { label: 'Fechamento custom' },
      },
    });
    expect(cycle.phases.find((p) => p.slot === 'third').label).toBe('Edição custom');
    expect(cycle.phases.find((p) => p.slot === 'last').label).toBe('Fechamento custom');
    expect(cycle.currentPhase.label).toBe('Edição custom');
  });

  it('config inválida → fallback nos labels', () => {
    const cycle = resolveAgencyOperationalCycle('2026-09-23', {
      enabled: true,
      phases: { third: {} },
    });
    expect(cycle.currentPhase.label).toBe('Edição & Calendários');
  });

  it('enabled false → null', () => {
    expect(
      resolveAgencyOperationalCycle('2026-09-23', { enabled: false })
    ).toBeNull();
  });
});

describe('formatOperationalWeekPeriod / dias restantes', () => {
  it('período dentro do mesmo mês', () => {
    expect(formatOperationalWeekPeriod('2026-09-21', '2026-09-27')).toBe(
      '21–27 de setembro'
    );
  });

  it('período atravessando dois meses', () => {
    expect(formatOperationalWeekPeriod('2026-09-28', '2026-10-04')).toBe(
      '28 de setembro–4 de outubro'
    );
  });

  it('quarta → 4 dias restantes até domingo', () => {
    // 23/set/2026 = quarta; fim = 27
    expect(daysRemainingInOperationalWeek('2026-09-23', '2026-09-27')).toBe(4);
    expect(formatOperationalDaysRemaining(4)).toBe('4 dias restantes');
  });

  it('domingo / último dia', () => {
    expect(daysRemainingInOperationalWeek('2026-09-27', '2026-09-27')).toBe(0);
    expect(formatOperationalDaysRemaining(0)).toBe('Último dia desta fase');
  });

  it('1 dia restante', () => {
    expect(daysRemainingInOperationalWeek('2026-09-26', '2026-09-27')).toBe(1);
    expect(formatOperationalDaysRemaining(1)).toBe('1 dia restante');
  });

  it('currentPhase inclui daysRemaining', () => {
    const cycle = resolveAgencyOperationalCycle('2026-09-23');
    expect(cycle.currentPhase.daysRemaining).toBe(4);
  });
});

describe('slotsForMondayCount', () => {
  it('4 e 5', () => {
    expect(slotsForMondayCount(4)).toEqual(['first', 'second', 'third', 'last']);
    expect(slotsForMondayCount(5)).toEqual([
      'first',
      'second',
      'third',
      'intermediate',
      'last',
    ]);
  });
});

describe('V2.5 — activityKinds no ciclo operacional', () => {
  it('default Narrativa por fase', () => {
    const cfg = resolveOperationalCycleConfig(null);
    expect(cfg.phases.first.activityKinds).toEqual(['script', 'briefing']);
    expect(cfg.phases.second.activityKinds).toEqual([
      'capture',
      'photography',
      'curation',
    ]);
    expect(cfg.phases.third.activityKinds).toEqual(['editing', 'calendar']);
    expect(cfg.phases.intermediate.activityKinds).toEqual(['revision', 'approval']);
    expect(cfg.phases.last.activityKinds).toEqual(['meeting']);
  });

  it('currentPhase e phases[] expõem activityKinds', () => {
    const cycle = resolveAgencyOperationalCycle('2026-09-23');
    expect(cycle.currentPhase.activityKinds).toEqual(['editing', 'calendar']);
    expect(cycle.phases.find((p) => p.slot === 'third').activityKinds).toEqual([
      'editing',
      'calendar',
    ]);
    expect(cycle.phases.find((p) => p.slot === 'first').activityKinds).toEqual([
      'script',
      'briefing',
    ]);
  });

  it('mês com 5 Mondays: intermediate traz revision+approval', () => {
    const cycle = resolveAgencyOperationalCycle('2026-03-23');
    const mid = cycle.phases.find((p) => p.slot === 'intermediate');
    expect(mid).toBeTruthy();
    expect(mid.activityKinds).toEqual(['revision', 'approval']);
  });

  it('mês com 4 Mondays: intermediate ausente (calendário intacto)', () => {
    const cycle = resolveAgencyOperationalCycle('2026-09-23');
    expect(cycle.phases.some((p) => p.slot === 'intermediate')).toBe(false);
  });

  it('config custom sobrescreve activityKinds da fase', () => {
    const cycle = resolveAgencyOperationalCycle('2026-09-23', {
      enabled: true,
      phases: {
        third: {
          activityKinds: ['editing', 'calendar', 'approval'],
        },
      },
    });
    expect(cycle.currentPhase.activityKinds).toEqual([
      'editing',
      'calendar',
      'approval',
    ]);
  });

  it('N:N — mesmo kind em duas fases; dedupe só dentro da fase', () => {
    const cfg = resolveOperationalCycleConfig({
      enabled: true,
      phases: {
        third: { activityKinds: ['editing', 'approval'] },
        intermediate: { activityKinds: ['revision', 'approval'] },
      },
    });
    expect(cfg.phases.third.activityKinds).toEqual(['editing', 'approval']);
    expect(cfg.phases.intermediate.activityKinds).toEqual(['revision', 'approval']);
    const phases = getOperationalPhasesForActivityKind(cfg, 'approval');
    expect(phases.map((p) => p.slot)).toEqual(['third', 'intermediate']);
  });

  it('[] é override explícito — não aplica default', () => {
    const cfg = resolveOperationalCycleConfig({
      enabled: true,
      phases: { third: { activityKinds: [] } },
    });
    expect(cfg.phases.third.activityKinds).toEqual([]);
    expect(cfg.phases.third.label).toBe('Edição & Calendários');
  });

  it('ausente → fallback default (config antiga)', () => {
    const cfg = resolveOperationalCycleConfig({
      enabled: true,
      phases: {
        third: {
          key: 'edicao_calendarios',
          label: 'Edição & Calendários',
          description: 'legado sem kinds',
        },
      },
    });
    expect(cfg.phases.third.activityKinds).toEqual(['editing', 'calendar']);
    expect(cfg.phases.third.description).toBe('legado sem kinds');
  });

  it('inválidos filtrados; duplicados deduplicados; sem throw', () => {
    const cfg = resolveOperationalCycleConfig({
      enabled: true,
      phases: {
        third: {
          activityKinds: ['editing', 'video_edit', 'calendar', 'editing'],
        },
      },
    });
    expect(cfg.phases.third.activityKinds).toEqual(['editing', 'calendar']);
  });

  it('não-array → fallback default', () => {
    const cfg = resolveOperationalCycleConfig({
      enabled: true,
      phases: {
        third: { activityKinds: /** @type {any} */ ('editing') },
      },
    });
    expect(cfg.phases.third.activityKinds).toEqual(['editing', 'calendar']);
  });

  it('array totalmente inválido → []', () => {
    const cfg = resolveOperationalCycleConfig({
      enabled: true,
      phases: {
        third: { activityKinds: ['video_edit', 'foo'] },
      },
    });
    expect(cfg.phases.third.activityKinds).toEqual([]);
  });

  it('não muta DEFAULT nem config de entrada', () => {
    const input = {
      enabled: true,
      phases: {
        third: { activityKinds: ['editing', 'calendar'] },
      },
    };
    const before = JSON.stringify(DEFAULT_OPERATIONAL_CYCLE_CONFIG);
    const cfg = resolveOperationalCycleConfig(input);
    cfg.phases.third.activityKinds.push('approval');
    expect(input.phases.third.activityKinds).toEqual(['editing', 'calendar']);
    expect(JSON.stringify(DEFAULT_OPERATIONAL_CYCLE_CONFIG)).toBe(before);
    expect(DEFAULT_OPERATIONAL_CYCLE_CONFIG.phases.third.activityKinds).toEqual([
      'editing',
      'calendar',
    ]);
  });

  it('phaseIncludesActivityKind', () => {
    const phase = resolveAgencyOperationalPhase('2026-09-23');
    expect(phaseIncludesActivityKind(phase, 'editing')).toBe(true);
    expect(phaseIncludesActivityKind(phase, 'meeting')).toBe(false);
    expect(phaseIncludesActivityKind(phase, 'video_edit')).toBe(false);
  });

  it('enabled false continua null (kinds não reativam o ciclo)', () => {
    expect(
      resolveAgencyOperationalCycle('2026-09-23', {
        enabled: false,
        phases: { third: { activityKinds: ['editing'] } },
      })
    ).toBeNull();
  });

  it('kinds fora do mapa default não aparecem nas fases', () => {
    const cfg = resolveOperationalCycleConfig(null);
    const all = SLOT_ORDER_FOR_TEST.flatMap(
      (slot) => cfg.phases[slot].activityKinds
    );
    for (const kind of [
      'planning',
      'scheduling',
      'publishing',
      'reporting',
      'admin',
      'delivery',
      'research',
      'analysis',
      'strategy',
    ]) {
      expect(all).not.toContain(kind);
    }
  });
});

const SLOT_ORDER_FOR_TEST = [
  'first',
  'second',
  'third',
  'intermediate',
  'last',
];
