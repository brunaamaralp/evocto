/**
 * Ciclo operacional da agência (ritmo coletivo por calendário).
 *
 * Independente de CyclePlan / pipelines de cliente.
 * Semana operacional: segunda → domingo.
 * Fuso civil canônico: America/Sao_Paulo (padrão do sistema).
 */

import { isValidActivityKind } from '@/constants/activityKinds';
import { FINANCE_TIMEZONE, todayYmdFinance } from '@/lib/financeForecastCore';

export const OPERATIONAL_CYCLE_TIMEZONE = FINANCE_TIMEZONE;

/** @typedef {'first' | 'second' | 'third' | 'intermediate' | 'last'} OperationalPhaseSlot */

/**
 * @typedef {object} OperationalPhaseMeta
 * @property {string} key
 * @property {string} label
 * @property {string} description
 * @property {string[]} activityKinds natures em foco nesta fase (registry V2.1)
 */

/**
 * @typedef {object} OperationalCycleConfig
 * @property {boolean} [enabled]
 * @property {Partial<Record<OperationalPhaseSlot, Partial<OperationalPhaseMeta>>>} [phases]
 */

/**
 * @typedef {object} ResolvedOperationalPhase
 * @property {string} phaseKey
 * @property {string} label
 * @property {string} description
 * @property {string[]} activityKinds
 * @property {OperationalPhaseSlot} slot
 * @property {number} weekOrdinal
 * @property {boolean} isLastWeek
 * @property {string} operationalWeekStartYmd
 * @property {string} operationalWeekEndYmd
 * @property {string} operationalMonth
 * @property {number} [daysRemaining] dias civis depois de hoje até o fim da semana
 */

/** @typedef {'completed' | 'current' | 'upcoming'} OperationalPhaseState */

/**
 * @typedef {object} OperationalCyclePhaseItem
 * @property {OperationalPhaseSlot} slot
 * @property {string} phaseKey
 * @property {string} label
 * @property {string} description
 * @property {string[]} activityKinds
 * @property {OperationalPhaseState} state
 * @property {number} weekOrdinal
 * @property {string} weekStartYmd
 * @property {string} weekEndYmd
 */

/**
 * @typedef {object} ResolvedOperationalCycle
 * @property {ResolvedOperationalPhase} currentPhase
 * @property {OperationalCyclePhaseItem[]} phases
 * @property {string} operationalMonth
 * @property {number} mondayCount
 */

export const DEFAULT_OPERATIONAL_CYCLE_CONFIG = Object.freeze({
  enabled: true,
  phases: Object.freeze({
    first: Object.freeze({
      key: 'roteiros',
      label: 'Roteiros',
      description: 'Criação e aprovação dos roteiros para o mês.',
      activityKinds: Object.freeze(['script', 'briefing']),
    }),
    second: Object.freeze({
      key: 'gravacoes_fotos',
      label: 'Gravações & Fotos',
      description: 'Gravação de vídeos e produção de fotografias.',
      // curation: UGC / seleção de assets na mesma janela de produção
      activityKinds: Object.freeze(['capture', 'photography', 'curation']),
    }),
    third: Object.freeze({
      key: 'edicao_calendarios',
      label: 'Edição & Calendários',
      description: 'Edição dos conteúdos e montagem dos calendários.',
      activityKinds: Object.freeze(['editing', 'calendar']),
    }),
    intermediate: Object.freeze({
      key: 'finalizacoes_ajustes',
      label: 'Finalizações & Ajustes',
      description: 'Finalização de pendências, ajustes e preparação das entregas.',
      activityKinds: Object.freeze(['revision', 'approval']),
    }),
    last: Object.freeze({
      key: 'reunioes',
      label: 'Reuniões',
      description: 'Reuniões de planejamento e reuniões mensais com os clientes.',
      // planning / scheduling / publishing etc. ficam fora do foco default
      activityKinds: Object.freeze(['meeting']),
    }),
  }),
});

const SLOT_ORDER = /** @type {const} */ ([
  'first',
  'second',
  'third',
  'intermediate',
  'last',
]);

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Valida/deduplica activityKinds contra o registry.
 * Não muta o array de entrada. Strings inválidas são ignoradas.
 *
 * @param {unknown} value
 * @returns {string[]}
 */
export function normalizeOperationalActivityKinds(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  /** @type {string[]} */
  const out = [];
  for (const item of value) {
    if (!isValidActivityKind(item)) continue;
    const key = String(item).trim();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

/**
 * Semântica V2.5:
 * - propriedade ausente → fallback default da fase
 * - array (incl. []) → override explícito (após validação/dedupe)
 * - não-array → fallback default (não trata como [])
 *
 * @param {Partial<OperationalPhaseMeta> | null | undefined} phase
 * @param {readonly string[]} fallbackKinds
 * @returns {string[]}
 */
function resolvePhaseActivityKinds(phase, fallbackKinds) {
  const fallback = Array.isArray(fallbackKinds) ? [...fallbackKinds] : [];
  if (!phase || typeof phase !== 'object') return fallback;
  if (!Object.prototype.hasOwnProperty.call(phase, 'activityKinds')) {
    return fallback;
  }
  if (!Array.isArray(phase.activityKinds)) {
    return fallback;
  }
  return normalizeOperationalActivityKinds(phase.activityKinds);
}

/**
 * @param {Partial<OperationalPhaseMeta> | null | undefined} phase
 * @param {OperationalPhaseMeta} fallback
 * @returns {OperationalPhaseMeta}
 */
function normalizePhaseMeta(phase, fallback) {
  const base =
    !phase || typeof phase !== 'object'
      ? {
          key: fallback.key,
          label: fallback.label,
          description: fallback.description,
        }
      : {
          key: isNonEmptyString(phase.key) ? String(phase.key).trim() : fallback.key,
          label: isNonEmptyString(phase.label) ? String(phase.label).trim() : fallback.label,
          description: isNonEmptyString(phase.description)
            ? String(phase.description).trim()
            : fallback.description,
        };

  return {
    ...base,
    activityKinds: resolvePhaseActivityKinds(phase, fallback.activityKinds),
  };
}

/**
 * Cópia defensiva de uma fase resolvida (evita compartilhar arrays frozen/mutáveis).
 * @param {OperationalPhaseMeta} phase
 * @returns {OperationalPhaseMeta}
 */
function clonePhaseMeta(phase) {
  return {
    key: phase.key,
    label: phase.label,
    description: phase.description,
    activityKinds: [...(phase.activityKinds || [])],
  };
}

/**
 * Normaliza config da Agency (ou parcial) com fallback seguro.
 * Config inválida/incompleta → default. Nunca lança.
 * Não muta `raw` nem DEFAULT_OPERATIONAL_CYCLE_CONFIG.
 *
 * @param {OperationalCycleConfig | null | undefined} raw
 * @returns {{ enabled: boolean, phases: Record<OperationalPhaseSlot, OperationalPhaseMeta> }}
 */
export function resolveOperationalCycleConfig(raw) {
  const defaults = DEFAULT_OPERATIONAL_CYCLE_CONFIG;
  if (!raw || typeof raw !== 'object') {
    return {
      enabled: defaults.enabled,
      phases: {
        first: clonePhaseMeta(defaults.phases.first),
        second: clonePhaseMeta(defaults.phases.second),
        third: clonePhaseMeta(defaults.phases.third),
        intermediate: clonePhaseMeta(defaults.phases.intermediate),
        last: clonePhaseMeta(defaults.phases.last),
      },
    };
  }

  const enabled = raw.enabled === false ? false : true;
  const rawPhases = raw.phases && typeof raw.phases === 'object' ? raw.phases : {};

  return {
    enabled,
    phases: {
      first: normalizePhaseMeta(rawPhases.first, defaults.phases.first),
      second: normalizePhaseMeta(rawPhases.second, defaults.phases.second),
      third: normalizePhaseMeta(rawPhases.third, defaults.phases.third),
      intermediate: normalizePhaseMeta(rawPhases.intermediate, defaults.phases.intermediate),
      last: normalizePhaseMeta(rawPhases.last, defaults.phases.last),
    },
  };
}

/**
 * @param {{ activityKinds?: string[] } | null | undefined} phase
 * @param {unknown} activityKind
 * @returns {boolean}
 */
export function phaseIncludesActivityKind(phase, activityKind) {
  if (!phase || !isValidActivityKind(activityKind)) return false;
  const kinds = Array.isArray(phase.activityKinds) ? phase.activityKinds : [];
  return kinds.includes(String(activityKind).trim());
}

/**
 * Fases (slots) do ciclo/config que incluem o kind (relação N:N).
 * Aceita config bruta, config resolvida ou ciclo resolvido (`phases` array).
 *
 * @param {OperationalCycleConfig | ResolvedOperationalCycle | { phases: Record<string, OperationalPhaseMeta> } | null | undefined} cycleOrConfig
 * @param {unknown} activityKind
 * @returns {Array<{ slot: OperationalPhaseSlot, phaseKey: string, label: string, activityKinds: string[] }>}
 */
export function getOperationalPhasesForActivityKind(cycleOrConfig, activityKind) {
  if (!isValidActivityKind(activityKind)) return [];
  const kind = String(activityKind).trim();

  if (cycleOrConfig?.phases && Array.isArray(cycleOrConfig.phases)) {
    return cycleOrConfig.phases
      .filter((p) => phaseIncludesActivityKind(p, kind))
      .map((p) => ({
        slot: p.slot,
        phaseKey: p.phaseKey,
        label: p.label,
        activityKinds: [...(p.activityKinds || [])],
      }));
  }

  const resolved = resolveOperationalCycleConfig(
    /** @type {OperationalCycleConfig | null | undefined} */ (cycleOrConfig)
  );
  /** @type {Array<{ slot: OperationalPhaseSlot, phaseKey: string, label: string, activityKinds: string[] }>} */
  const out = [];
  for (const slot of SLOT_ORDER) {
    const meta = resolved.phases[slot];
    if (!phaseIncludesActivityKind(meta, kind)) continue;
    out.push({
      slot,
      phaseKey: meta.key,
      label: meta.label,
      activityKinds: [...meta.activityKinds],
    });
  }
  return out;
}

/**
 * Lê operationalCycle do documento Agency (payload mergeado).
 * @param {object | null | undefined} agency
 */
export function getOperationalCycleConfigFromAgency(agency) {
  return resolveOperationalCycleConfig(agency?.operationalCycle);
}

/** @param {string} ymd */
function parseYmdParts(ymd) {
  const m = String(ymd || '')
    .trim()
    .slice(0, 10)
    .match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

/** @param {number} year @param {number} month 1–12 @param {number} day */
function formatYmd(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Dia da semana civil (0=dom … 6=sáb) sem depender do TZ do browser.
 * Usa meio-dia UTC do YMD.
 * @param {string} ymd
 */
export function weekdayFromYmd(ymd) {
  const p = parseYmdParts(ymd);
  if (!p) return null;
  return new Date(Date.UTC(p.year, p.month - 1, p.day, 12, 0, 0)).getUTCDay();
}

/**
 * @param {string} ymd
 * @param {number} days
 */
export function addDaysToYmd(ymd, days) {
  const p = parseYmdParts(ymd);
  if (!p) return ymd;
  const dt = new Date(Date.UTC(p.year, p.month - 1, p.day, 12, 0, 0));
  dt.setUTCDate(dt.getUTCDate() + Number(days || 0));
  return formatYmd(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

/**
 * Segunda-feira (YMD) da semana operacional que contém `ymd`.
 * @param {string} ymd
 */
export function operationalWeekStartMondayYmd(ymd) {
  const dow = weekdayFromYmd(ymd);
  if (dow == null) return null;
  const diff = dow === 0 ? -6 : 1 - dow;
  return addDaysToYmd(ymd, diff);
}

/**
 * Todas as segundas-feiras civis do mês `YYYY-MM`.
 * @param {string} monthKey YYYY-MM
 * @returns {string[]}
 */
export function listMondaysInMonth(monthKey) {
  const m = String(monthKey || '').match(/^(\d{4})-(\d{2})$/);
  if (!m) return [];
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (!year || month < 1 || month > 12) return [];

  const firstYmd = formatYmd(year, month, 1);
  const firstDow = weekdayFromYmd(firstYmd);
  if (firstDow == null) return [];

  // Distância até a primeira segunda do mês (0 se dia 1 já é segunda).
  const toFirstMonday = firstDow === 1 ? 0 : (8 - firstDow) % 7;
  let cursor = addDaysToYmd(firstYmd, toFirstMonday);
  const mondays = [];

  while (cursor.startsWith(monthKey)) {
    mondays.push(cursor);
    cursor = addDaysToYmd(cursor, 7);
  }

  return mondays;
}

/**
 * Mapeia índice 0-based na lista de segundas do mês → slot temporal.
 * @param {number} index
 * @param {number} mondayCount
 * @returns {OperationalPhaseSlot | null}
 */
export function slotFromMondayIndex(index, mondayCount) {
  const n = Number(mondayCount);
  const i = Number(index);
  if (!Number.isFinite(i) || !Number.isFinite(n) || n < 1 || i < 0 || i >= n) {
    return null;
  }
  if (i === n - 1) return 'last';
  if (i === 0) return 'first';
  if (i === 1) return 'second';
  if (i === 2) return 'third';
  return 'intermediate';
}

/**
 * @param {Date | string | number | null | undefined} date
 * @param {string} [timeZone]
 * @returns {string | null} YYYY-MM-DD
 */
export function toOperationalYmd(date = new Date()) {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date.trim())) {
    return date.trim().slice(0, 10);
  }
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  // Civil day em America/Sao_Paulo (mesmo padrão de financeForecastCore).
  return todayYmdFinance(d);
}

/**
 * Resolve a fase operacional da agência para uma data.
 * Retorna null se o ciclo estiver desabilitado ou a data for inválida.
 *
 * @param {Date | string | number} [date]
 * @param {OperationalCycleConfig | null | undefined} [config]
 * @returns {ResolvedOperationalPhase | null}
 */
export function resolveAgencyOperationalPhase(date = new Date(), config) {
  const resolved = resolveOperationalCycleConfig(config);
  if (!resolved.enabled) return null;

  const ymd = toOperationalYmd(date);
  if (!ymd) return null;

  const weekStart = operationalWeekStartMondayYmd(ymd);
  if (!weekStart) return null;

  const operationalMonth = weekStart.slice(0, 7);
  const mondays = listMondaysInMonth(operationalMonth);
  if (mondays.length === 0) return null;

  const index = mondays.indexOf(weekStart);
  if (index < 0) return null;

  const slot = slotFromMondayIndex(index, mondays.length);
  if (!slot || !SLOT_ORDER.includes(slot)) return null;

  const meta = resolved.phases[slot];
  const weekEnd = addDaysToYmd(weekStart, 6);

  return {
    phaseKey: meta.key,
    label: meta.label,
    description: meta.description,
    activityKinds: [...(meta.activityKinds || [])],
    slot,
    weekOrdinal: index + 1,
    isLastWeek: slot === 'last',
    operationalWeekStartYmd: weekStart,
    operationalWeekEndYmd: weekEnd,
    operationalMonth,
  };
}

const ORDINAL_PT = {
  1: '1ª',
  2: '2ª',
  3: '3ª',
  4: '4ª',
  5: '5ª',
};

/**
 * Texto de contexto para o hero ("3ª SEMANA DO CICLO").
 * @param {ResolvedOperationalPhase | null | undefined} phase
 */
export function formatOperationalWeekContext(phase) {
  if (!phase) return '';
  if (phase.isLastWeek) {
    return 'Última semana do ciclo';
  }
  const ordinal = ORDINAL_PT[phase.weekOrdinal] || `${phase.weekOrdinal}ª`;
  return `${ordinal} semana do ciclo`;
}

/**
 * Slots temporais presentes para um mês com N segundas.
 * @param {number} mondayCount
 * @returns {OperationalPhaseSlot[]}
 */
export function slotsForMondayCount(mondayCount) {
  const n = Number(mondayCount);
  if (!Number.isFinite(n) || n < 1) return [];
  /** @type {OperationalPhaseSlot[]} */
  const slots = [];
  for (let i = 0; i < n; i += 1) {
    const slot = slotFromMondayIndex(i, n);
    if (slot) slots.push(slot);
  }
  return slots;
}

/**
 * Diferença em dias civis (to − from). Pode ser negativa.
 * @param {string} fromYmd
 * @param {string} toYmd
 * @returns {number | null}
 */
export function diffCivilDays(fromYmd, toYmd) {
  const a = parseYmdParts(fromYmd);
  const b = parseYmdParts(toYmd);
  if (!a || !b) return null;
  const ms =
    Date.UTC(b.year, b.month - 1, b.day, 12, 0, 0) -
    Date.UTC(a.year, a.month - 1, a.day, 12, 0, 0);
  return Math.round(ms / 86400000);
}

/**
 * Dias civis restantes DEPOIS de hoje até o fim da semana (inclusive o domingo).
 * Quarta → domingo = 4. Domingo = 0 (último dia).
 *
 * @param {string} todayYmd
 * @param {string} weekEndYmd
 * @returns {number}
 */
export function daysRemainingInOperationalWeek(todayYmd, weekEndYmd) {
  const diff = diffCivilDays(todayYmd, weekEndYmd);
  if (diff == null || diff < 0) return 0;
  return diff;
}

/**
 * @param {string} ymd
 * @returns {{ day: number, monthName: string, year: number } | null}
 */
function ymdLocaleParts(ymd) {
  const p = parseYmdParts(ymd);
  if (!p) return null;
  const dt = new Date(Date.UTC(p.year, p.month - 1, p.day, 12, 0, 0));
  const monthName = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    timeZone: 'UTC',
  }).format(dt);
  return { day: p.day, monthName, year: p.year };
}

/**
 * Formata o período da semana operacional.
 * Ex.: "21–27 de setembro" | "29 de setembro–5 de outubro"
 *
 * @param {string} startYmd
 * @param {string} endYmd
 */
export function formatOperationalWeekPeriod(startYmd, endYmd) {
  const start = ymdLocaleParts(startYmd);
  const end = ymdLocaleParts(endYmd);
  if (!start || !end) return '';

  if (start.year === end.year && start.monthName === end.monthName) {
    return `${start.day}–${end.day} de ${start.monthName}`;
  }
  if (start.year === end.year) {
    return `${start.day} de ${start.monthName}–${end.day} de ${end.monthName}`;
  }
  return `${start.day} de ${start.monthName} de ${start.year}–${end.day} de ${end.monthName} de ${end.year}`;
}

/**
 * Rótulo curto para dias restantes (não é prazo de tarefa).
 * @param {number} daysRemaining
 */
export function formatOperationalDaysRemaining(daysRemaining) {
  const n = Number(daysRemaining);
  if (!Number.isFinite(n) || n <= 0) return 'Último dia desta fase';
  if (n === 1) return '1 dia restante';
  return `${n} dias restantes`;
}

/**
 * Resolve o ciclo operacional completo do mês (timeline temporal).
 * Retorna null se desabilitado ou data inválida.
 *
 * @param {Date | string | number} [date]
 * @param {OperationalCycleConfig | null | undefined} [config]
 * @returns {ResolvedOperationalCycle | null}
 */
export function resolveAgencyOperationalCycle(date = new Date(), config) {
  const currentPhase = resolveAgencyOperationalPhase(date, config);
  if (!currentPhase) return null;

  const resolved = resolveOperationalCycleConfig(config);
  const mondays = listMondaysInMonth(currentPhase.operationalMonth);
  if (mondays.length === 0) return null;

  const slots = slotsForMondayCount(mondays.length);
  const currentIndex = mondays.indexOf(currentPhase.operationalWeekStartYmd);
  if (currentIndex < 0) return null;

  const todayYmd = toOperationalYmd(date);
  const daysRemaining = daysRemainingInOperationalWeek(
    todayYmd || currentPhase.operationalWeekStartYmd,
    currentPhase.operationalWeekEndYmd
  );

  /** @type {OperationalCyclePhaseItem[]} */
  const phases = slots.map((slot, i) => {
    const meta = resolved.phases[slot];
    /** @type {OperationalPhaseState} */
    let state = 'upcoming';
    if (i < currentIndex) state = 'completed';
    else if (i === currentIndex) state = 'current';

    return {
      slot,
      phaseKey: meta.key,
      label: meta.label,
      description: meta.description,
      activityKinds: [...(meta.activityKinds || [])],
      state,
      weekOrdinal: i + 1,
      weekStartYmd: mondays[i],
      weekEndYmd: addDaysToYmd(mondays[i], 6),
    };
  });

  return {
    currentPhase: {
      ...currentPhase,
      daysRemaining,
    },
    phases,
    operationalMonth: currentPhase.operationalMonth,
    mondayCount: mondays.length,
  };
}
