/**
 * Categorias e tipos de serviço — Comunicação & Marketing
 * Fonte única de verdade para enums, labels e defaults da agência.
 */

export const SERVICE_CATEGORIES = {
  marketing_digital: 'Marketing Digital',
  branding: 'Branding',
  comunicacao: 'Comunicação',
  midia_paga: 'Mídia Paga',
  organico: 'Orgânico / Social',
  conteudo: 'Conteúdo',
  copywriting: 'Copywriting',
  design: 'Design',
  email_marketing: 'E-mail Marketing',
  analytics: 'Analytics',
  automacao: 'Automação',
  produto: 'Produto',
  desenvolvimento: 'Desenvolvimento',
  consultoria_estrategica: 'Estratégia & Posicionamento',
};

/** Keys canônicas (ordem de exibição em selects) */
export const SERVICE_CATEGORY_KEYS = Object.keys(SERVICE_CATEGORIES);

/** Default ao criar template / serviço */
export const DEFAULT_SERVICE_CATEGORY = 'marketing_digital';

/**
 * Tipos principais de oferta (os 3 produtos padrão da agência)
 * Substitui o trio financeiro: diagnostico / mentoria margem / gestão 360
 */
export const SERVICE_OFFERING_TYPES = {
  diagnostico_comunicacao: {
    key: 'diagnostico_comunicacao',
    label: 'Diagnóstico de Comunicação e Marca',
    category: 'comunicacao',
    legacyKeys: ['diagnostico_avulso', 'diagnostico_financeiro'],
  },
  estrategia_conteudo: {
    key: 'estrategia_conteudo',
    label: 'Estratégia de Conteúdo e Posicionamento',
    category: 'conteudo',
    legacyKeys: ['mentoria_margem', 'mentoria_precificacao'],
  },
  marketing_360: {
    key: 'marketing_360',
    label: 'Marketing Operacional 360',
    category: 'marketing_digital',
    legacyKeys: ['gestao_360', 'gestao_financeira_360'],
  },
};

export const SERVICE_OFFERING_KEYS = Object.keys(SERVICE_OFFERING_TYPES);

/** Mapa legado → canônico (dados antigos ainda renderizam) */
export const LEGACY_SERVICE_TYPE_MAP = {
  diagnostico_avulso: 'diagnostico_comunicacao',
  diagnostico_financeiro: 'diagnostico_comunicacao',
  mentoria_margem: 'estrategia_conteudo',
  mentoria_precificacao: 'estrategia_conteudo',
  gestao_360: 'marketing_360',
  gestao_financeira_360: 'marketing_360',
  gestao_financeira: 'marketing_digital',
  consultoria_tributaria: 'consultoria_estrategica',
  valuation: 'analytics',
  planejamento_financeiro: 'estrategia_conteudo',
  fusao_aquisicao: 'consultoria_estrategica',
  reestruturacao: 'consultoria_estrategica',
};

export function resolveServiceCategory(key) {
  if (!key) return DEFAULT_SERVICE_CATEGORY;
  if (SERVICE_CATEGORIES[key]) return key;
  return LEGACY_SERVICE_TYPE_MAP[key] || key;
}

export function getCategoryLabel(key) {
  const resolved = resolveServiceCategory(key);
  return SERVICE_CATEGORIES[resolved] || String(key || '').replace(/_/g, ' ');
}

export function resolveOfferingType(key) {
  if (!key) return null;
  if (SERVICE_OFFERING_TYPES[key]) return key;
  return LEGACY_SERVICE_TYPE_MAP[key] || key;
}

export function getOfferingLabel(key) {
  const resolved = resolveOfferingType(key);
  return SERVICE_OFFERING_TYPES[resolved]?.label || getCategoryLabel(key);
}
