/**
 * Taxonomia de produto: como cada serviço aparece no hub do cliente.
 * Fonte de verdade no front (não exige campos novos no Appwrite).
 *
 * operationPattern:
 *   recurring      → Serviço → Mês → várias unidades
 *   on_demand      → Serviço → lista de unidades
 *   single_project → Serviço → etapas (1 operação)
 *
 * periodMode: monthly | none  (só relevante em recurring; nunca heurística por contagem)
 * unitKind: task | campaign_brief | service_steps
 */

import { formatClientMonthCycleTitle, monthKeyFromYmd } from '@/lib/clientMonthCycle';
import { isItemCyclePipelineKey } from '@/templates/itemCycleTemplateHelpers';

export const OPERATION_PATTERNS = Object.freeze({
  RECURRING: 'recurring',
  ON_DEMAND: 'on_demand',
  SINGLE_PROJECT: 'single_project',
});

export const PERIOD_MODES = Object.freeze({
  MONTHLY: 'monthly',
  NONE: 'none',
});

export const UNIT_KINDS = Object.freeze({
  TASK: 'task',
  CAMPAIGN_BRIEF: 'campaign_brief',
  SERVICE_STEPS: 'service_steps',
});

/** @typedef {'recurring'|'on_demand'|'single_project'} OperationPattern */
/** @typedef {'monthly'|'none'} PeriodMode */
/** @typedef {'task'|'campaign_brief'|'service_steps'} UnitKind */

/**
 * @typedef {object} ServiceOperationProfile
 * @property {string} offeringKey
 * @property {string} itemLabel
 * @property {string} itemLabelPlural
 * @property {string} createCta
 * @property {OperationPattern} operationPattern
 * @property {PeriodMode} periodMode
 * @property {boolean} showCreateCta
 * @property {UnitKind} unitKind
 */

/** @type {Record<string, Omit<ServiceOperationProfile, 'offeringKey'>>} */
const PROFILES_BY_KEY = {
  producao_conteudo: {
    itemLabel: 'conteúdo',
    itemLabelPlural: 'conteúdos',
    createCta: '+ Novo conteúdo',
    operationPattern: OPERATION_PATTERNS.RECURRING,
    periodMode: PERIOD_MODES.MONTHLY,
    showCreateCta: true,
    unitKind: UNIT_KINDS.TASK,
  },
  ciclo_mensal_4_semanas: {
    itemLabel: 'campanha',
    itemLabelPlural: 'campanhas',
    createCta: '+ Nova campanha',
    operationPattern: OPERATION_PATTERNS.RECURRING,
    periodMode: PERIOD_MODES.MONTHLY,
    showCreateCta: true,
    unitKind: UNIT_KINDS.CAMPAIGN_BRIEF,
  },
  ciclo_narrativa_7_fases: {
    itemLabel: 'campanha',
    itemLabelPlural: 'campanhas',
    createCta: '+ Nova campanha',
    operationPattern: OPERATION_PATTERNS.RECURRING,
    periodMode: PERIOD_MODES.MONTHLY,
    showCreateCta: true,
    unitKind: UNIT_KINDS.CAMPAIGN_BRIEF,
  },
  campanha_pontual: {
    itemLabel: 'campanha',
    itemLabelPlural: 'campanhas',
    createCta: '+ Nova campanha',
    operationPattern: OPERATION_PATTERNS.ON_DEMAND,
    periodMode: PERIOD_MODES.NONE,
    showCreateCta: true,
    unitKind: UNIT_KINDS.TASK,
  },
  sessao_fotos: {
    itemLabel: 'sessão',
    itemLabelPlural: 'sessões',
    createCta: '+ Nova sessão',
    operationPattern: OPERATION_PATTERNS.ON_DEMAND,
    periodMode: PERIOD_MODES.NONE,
    showCreateCta: true,
    unitKind: UNIT_KINDS.TASK,
  },
  producao_video: {
    itemLabel: 'vídeo',
    itemLabelPlural: 'vídeos',
    createCta: '+ Novo vídeo',
    operationPattern: OPERATION_PATTERNS.ON_DEMAND,
    periodMode: PERIOD_MODES.NONE,
    showCreateCta: true,
    unitKind: UNIT_KINDS.TASK,
  },
  cobertura_evento: {
    itemLabel: 'cobertura',
    itemLabelPlural: 'coberturas',
    createCta: '+ Nova cobertura',
    operationPattern: OPERATION_PATTERNS.ON_DEMAND,
    periodMode: PERIOD_MODES.NONE,
    showCreateCta: true,
    unitKind: UNIT_KINDS.TASK,
  },
  storymaker: {
    itemLabel: 'ação',
    itemLabelPlural: 'ações',
    createCta: '+ Nova ação',
    operationPattern: OPERATION_PATTERNS.ON_DEMAND,
    periodMode: PERIOD_MODES.NONE,
    showCreateCta: true,
    unitKind: UNIT_KINDS.TASK,
  },
  posicionamento_marca: {
    itemLabel: 'projeto',
    itemLabelPlural: 'projetos',
    createCta: '+ Novo projeto',
    operationPattern: OPERATION_PATTERNS.SINGLE_PROJECT,
    periodMode: PERIOD_MODES.NONE,
    showCreateCta: false,
    unitKind: UNIT_KINDS.SERVICE_STEPS,
  },
  identidade_papelaria_eventos: {
    itemLabel: 'projeto',
    itemLabelPlural: 'projetos',
    createCta: '+ Novo projeto',
    operationPattern: OPERATION_PATTERNS.ON_DEMAND,
    periodMode: PERIOD_MODES.NONE,
    showCreateCta: true,
    unitKind: UNIT_KINDS.TASK,
  },
};

/** Aliases de offering_key / pipeline / slug → chave canônica do registry */
const KEY_ALIASES = Object.freeze({
  conteudo: 'producao_conteudo',
  producao_conteudo: 'producao_conteudo',
  ciclo_mensal_4_semanas: 'ciclo_mensal_4_semanas',
  ciclo_mensal: 'ciclo_mensal_4_semanas',
  ciclo_narrativa_7_fases: 'ciclo_narrativa_7_fases',
  narrativa: 'ciclo_narrativa_7_fases',
  campanha_pontual: 'campanha_pontual',
  sessao_fotos: 'sessao_fotos',
  producao_video: 'producao_video',
  cobertura_evento: 'cobertura_evento',
  storymaker: 'storymaker',
  posicionamento_marca: 'posicionamento_marca',
  identidade_papelaria_eventos: 'identidade_papelaria_eventos',
});

function normalizeKey(raw) {
  const k = String(raw || '')
    .trim()
    .toLowerCase();
  if (!k) return null;
  return KEY_ALIASES[k] || (PROFILES_BY_KEY[k] ? k : null);
}

function buildProfile(offeringKey, base) {
  return {
    offeringKey,
    itemLabel: base.itemLabel,
    itemLabelPlural: base.itemLabelPlural,
    createCta: base.createCta,
    operationPattern: base.operationPattern,
    periodMode: base.periodMode,
    showCreateCta: base.showCreateCta,
    unitKind: base.unitKind,
  };
}

function fallbackProfile(service) {
  const name = String(service?.name || 'item').trim();
  const short =
    name.includes(' — ') ? name.split(' — ').slice(1).join(' — ').trim() || 'item' : name || 'item';
  const label = short.toLowerCase();
  return buildProfile('unknown', {
    itemLabel: label === 'item' ? 'item' : label,
    itemLabelPlural: label === 'item' ? 'itens' : label,
    createCta: '+ Novo item',
    operationPattern: OPERATION_PATTERNS.ON_DEMAND,
    periodMode: PERIOD_MODES.NONE,
    showCreateCta: true,
    unitKind: service?.content_item_template
      ? UNIT_KINDS.TASK
      : UNIT_KINDS.TASK,
  });
}

/**
 * Resolve a chave do registry a partir de um service/template.
 * @param {object|null|undefined} service
 * @returns {string|null}
 */
export function resolveOfferingKey(service) {
  if (!service) return null;

  const fromFields = [
    service.offering_key,
    service.slug,
    service.pipeline,
  ];
  for (const field of fromFields) {
    const key = normalizeKey(field);
    if (key) return key;
  }

  if (isItemCyclePipelineKey(service.pipeline)) {
    const key = normalizeKey(service.pipeline);
    if (key) return key;
  }
  if (isItemCyclePipelineKey(service.offering_key)) {
    const key = normalizeKey(service.offering_key);
    if (key) return key;
  }

  const name = String(service.name || '').toLowerCase();
  if (name.includes('produção de conteúdo') || name.includes('producao de conteudo')) {
    return 'producao_conteudo';
  }
  if (name.includes('ciclo mensal')) return 'ciclo_mensal_4_semanas';
  if (name.includes('narrativa')) return 'ciclo_narrativa_7_fases';
  if (name.includes('sessão de fotos') || name.includes('sessao de fotos')) {
    return 'sessao_fotos';
  }
  if (name.includes('produção de vídeo') || name.includes('producao de video')) {
    return 'producao_video';
  }
  if (name.includes('campanha pontual')) return 'campanha_pontual';
  if (name.includes('posicionamento')) return 'posicionamento_marca';

  return null;
}

/**
 * @param {object|null|undefined} service
 * @returns {ServiceOperationProfile}
 */
export function getServiceOperationProfile(service) {
  const key = resolveOfferingKey(service);
  if (key && PROFILES_BY_KEY[key]) {
    return buildProfile(key, PROFILES_BY_KEY[key]);
  }
  return fallbackProfile(service);
}

export function shouldShowCreateCta(profile) {
  if (!profile?.showCreateCta) return false;
  // Evita “+ Novo item” quando o offering não está no registry
  if (!profile.offeringKey || profile.offeringKey === 'unknown') return false;
  return true;
}

export function getCreateCtaLabel(profile) {
  if (!shouldShowCreateCta(profile)) return null;
  return profile?.createCta || null;
}

export function isKnownServiceProfile(profile) {
  return Boolean(profile?.offeringKey && profile.offeringKey !== 'unknown');
}

/**
 * Rótulo de período para o hub — nunca prefixa "Ciclo".
 * Aceita CyclePlan, YYYY-MM-DD ou YYYY-MM.
 * @param {object|string|null|undefined} cycleOrYmd
 * @returns {string|null}
 */
export function formatPeriodLabel(cycleOrYmd) {
  if (!cycleOrYmd) return null;

  if (typeof cycleOrYmd === 'string') {
    const raw = cycleOrYmd.trim();
    if (/^\d{4}-\d{2}$/.test(raw)) {
      return formatClientMonthCycleTitle(`${raw}-01`);
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
      return formatClientMonthCycleTitle(raw.slice(0, 10));
    }
    return raw || null;
  }

  const start = cycleOrYmd.startDate || cycleOrYmd.start_date;
  if (start) return formatClientMonthCycleTitle(String(start).slice(0, 10));

  const period = cycleOrYmd.cyclePeriod || cycleOrYmd.title;
  if (!period) return null;

  const text = String(period).trim();
  // Remove prefixo "Ciclo" se algum dado legado trouxer
  return text.replace(/^ciclo\s+(de\s+)?/i, '').trim() || text;
}

/**
 * Chave de mês YYYY-MM a partir de ciclo ou data.
 * @param {object|string|null|undefined} cycleOrYmd
 * @returns {string|null}
 */
export function resolvePeriodKey(cycleOrYmd) {
  if (!cycleOrYmd) return null;
  if (typeof cycleOrYmd === 'string') {
    const raw = cycleOrYmd.trim();
    if (/^\d{4}-\d{2}/.test(raw)) return raw.slice(0, 7);
    return monthKeyFromYmd(raw) || null;
  }
  const start = cycleOrYmd.startDate || cycleOrYmd.start_date;
  if (start) return monthKeyFromYmd(start);
  return null;
}

export function listRegisteredOfferingKeys() {
  return Object.keys(PROFILES_BY_KEY);
}

/** Nome curto do serviço para o hub (sem prefixo "Cliente — "). */
const DISPLAY_NAMES = Object.freeze({
  producao_conteudo: 'Produção de Conteúdo',
  ciclo_mensal_4_semanas: 'Ciclo Mensal de Campanhas',
  ciclo_narrativa_7_fases: 'Ciclo Mensal de Campanhas',
  campanha_pontual: 'Campanha Pontual',
  sessao_fotos: 'Sessão de Fotos',
  producao_video: 'Produção de Vídeo',
  cobertura_evento: 'Cobertura de Evento',
  storymaker: 'Storymaker',
  posicionamento_marca: 'Posicionamento de Marca',
  identidade_papelaria_eventos: 'Identidade / Papelaria para Eventos',
});

export function getServiceDisplayName(service) {
  const key = resolveOfferingKey(service);
  if (key && DISPLAY_NAMES[key]) return DISPLAY_NAMES[key];
  const name = String(service?.name || 'Serviço').trim();
  if (name.includes(' — ')) {
    return name.split(' — ').slice(1).join(' — ').trim() || name;
  }
  return name || 'Serviço';
}

export default getServiceOperationProfile;
