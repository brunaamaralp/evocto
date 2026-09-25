/**
 * Lacunas deliberadas do contrato activityKind (V2.2 / V2.3).
 *
 * Não são inferidas por título — apenas IDs canônicos de template/passo
 * já documentados como null intencional / ambíguo conhecido.
 *
 * Usado só pela observabilidade V2.4 para rotular `known_gap`
 * (não conta como "erro de template novo", mas entra no denominador).
 */

/** Leafs de template com null deliberado (dívida / ambiguidade). */
export const KNOWN_INTENTIONAL_NULL_TEMPLATE_IDS = Object.freeze(
  new Set([
    'gravar_conteudo',
    'producao_conteudo',
    'atualizar_playbooks',
  ])
);

/**
 * Passos de checklist (templateStepId) com null deliberado.
 * Ex.: "Produção" mista no item-cycle de conteúdo.
 */
export const KNOWN_INTENTIONAL_NULL_STEP_IDS = Object.freeze(
  new Set(['producao'])
);

/**
 * Template IDs de parents/containers heterogêneos (activityKind null no template).
 * Fallback estrutural quando children não estão no universo carregado.
 */
export const KNOWN_CONTAINER_TEMPLATE_IDS = Object.freeze(
  new Set([
    'roteiros_5_videos',
    'producao_foto_video',
    'producao_ugc',
    'producao_influencer',
  ])
);

/**
 * @param {string | null | undefined} templateId
 * @returns {boolean}
 */
export function isKnownIntentionalNullTemplateId(templateId) {
  if (!templateId) return false;
  return KNOWN_INTENTIONAL_NULL_TEMPLATE_IDS.has(String(templateId));
}

/**
 * @param {string | null | undefined} stepId
 * @returns {boolean}
 */
export function isKnownIntentionalNullStepId(stepId) {
  if (!stepId) return false;
  return KNOWN_INTENTIONAL_NULL_STEP_IDS.has(String(stepId));
}

/**
 * @param {string | null | undefined} templateId
 * @returns {boolean}
 */
export function isKnownContainerTemplateId(templateId) {
  if (!templateId) return false;
  return KNOWN_CONTAINER_TEMPLATE_IDS.has(String(templateId));
}
