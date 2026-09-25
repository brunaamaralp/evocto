/**
 * Registry canônico — natureza do trabalho (activityKind).
 *
 * Independente de:
 * - deliverable.phase (pipeline)
 * - Agency.operationalCycle (ritmo da agência)
 * - Task.type (legado misto)
 *
 * Não descreve quando o trabalho deve acontecer.
 */

/** @typedef {{ key: string, label: string }} ActivityKindDefinition */

/** @type {readonly ActivityKindDefinition[]} */
export const ACTIVITY_KIND_DEFINITIONS = Object.freeze([
  Object.freeze({ key: 'briefing', label: 'Briefing' }),
  Object.freeze({ key: 'script', label: 'Roteiro' }),
  Object.freeze({ key: 'capture', label: 'Captação' }),
  Object.freeze({ key: 'photography', label: 'Fotografia' }),
  Object.freeze({ key: 'editing', label: 'Edição' }),
  Object.freeze({ key: 'calendar', label: 'Calendário' }),
  Object.freeze({ key: 'approval', label: 'Aprovação' }),
  Object.freeze({ key: 'revision', label: 'Revisão / Ajustes' }),
  Object.freeze({ key: 'meeting', label: 'Reunião' }),
  Object.freeze({ key: 'planning', label: 'Planejamento' }),
  Object.freeze({ key: 'scheduling', label: 'Agendamento' }),
  Object.freeze({ key: 'publishing', label: 'Publicação' }),
  Object.freeze({ key: 'reporting', label: 'Relatório' }),
  Object.freeze({ key: 'admin', label: 'Administrativo' }),
  Object.freeze({ key: 'curation', label: 'Curadoria' }),
  Object.freeze({ key: 'delivery', label: 'Entrega' }),
  Object.freeze({ key: 'research', label: 'Pesquisa' }),
  Object.freeze({ key: 'analysis', label: 'Análise' }),
  Object.freeze({ key: 'strategy', label: 'Estratégia' }),
]);

/** Keys canônicas (ordem estável). */
export const ACTIVITY_KIND_KEYS = Object.freeze(
  ACTIVITY_KIND_DEFINITIONS.map((d) => d.key)
);

/** @type {Readonly<Record<string, ActivityKindDefinition>>} */
export const ACTIVITY_KINDS = Object.freeze(
  Object.fromEntries(ACTIVITY_KIND_DEFINITIONS.map((d) => [d.key, d]))
);

const KIND_SET = new Set(ACTIVITY_KIND_KEYS);

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function isValidActivityKind(value) {
  if (typeof value !== 'string') return false;
  return KIND_SET.has(value.trim());
}

/**
 * Normaliza para um kind canônico ou null.
 * Desconhecido / vazio → null (não quebra Tasks antigas).
 *
 * @param {unknown} value
 * @returns {string | null}
 */
export function normalizeActivityKind(value) {
  if (value == null) return null;
  if (typeof value !== 'string') return null;
  const key = value.trim();
  if (!key) return null;
  return KIND_SET.has(key) ? key : null;
}

/**
 * @param {unknown} value
 * @returns {ActivityKindDefinition | null}
 */
export function getActivityKindDefinition(value) {
  const key = normalizeActivityKind(value);
  if (!key) return null;
  return ACTIVITY_KINDS[key] || null;
}

/**
 * Label pt-BR ou string vazia se inválido.
 * @param {unknown} value
 */
export function getActivityKindLabel(value) {
  return getActivityKindDefinition(value)?.label || '';
}
