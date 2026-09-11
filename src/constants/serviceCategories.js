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
 * Cores visuais por categoria — separa templates na UI sem novo campo no banco.
 * Usado em cards de template (borda/fundo + badge de categoria).
 */
export const SERVICE_CATEGORY_COLORS = {
  marketing_digital: {
    card: 'border-l-4 border-l-sky-500 bg-sky-50/50',
    badge: 'bg-sky-100 text-sky-800 border-sky-200',
    icon: 'bg-sky-100 text-sky-700',
  },
  branding: {
    card: 'border-l-4 border-l-amber-500 bg-amber-50/50',
    badge: 'bg-amber-100 text-amber-900 border-amber-200',
    icon: 'bg-amber-100 text-amber-800',
  },
  comunicacao: {
    card: 'border-l-4 border-l-teal-500 bg-teal-50/50',
    badge: 'bg-teal-100 text-teal-800 border-teal-200',
    icon: 'bg-teal-100 text-teal-700',
  },
  midia_paga: {
    card: 'border-l-4 border-l-orange-500 bg-orange-50/50',
    badge: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: 'bg-orange-100 text-orange-700',
  },
  organico: {
    card: 'border-l-4 border-l-lime-500 bg-lime-50/50',
    badge: 'bg-lime-100 text-lime-900 border-lime-200',
    icon: 'bg-lime-100 text-lime-800',
  },
  conteudo: {
    card: 'border-l-4 border-l-emerald-500 bg-emerald-50/50',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: 'bg-emerald-100 text-emerald-700',
  },
  copywriting: {
    card: 'border-l-4 border-l-cyan-500 bg-cyan-50/50',
    badge: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    icon: 'bg-cyan-100 text-cyan-700',
  },
  design: {
    card: 'border-l-4 border-l-rose-500 bg-rose-50/50',
    badge: 'bg-rose-100 text-rose-800 border-rose-200',
    icon: 'bg-rose-100 text-rose-700',
  },
  email_marketing: {
    card: 'border-l-4 border-l-indigo-500 bg-indigo-50/40',
    badge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    icon: 'bg-indigo-100 text-indigo-700',
  },
  analytics: {
    card: 'border-l-4 border-l-slate-500 bg-slate-50',
    badge: 'bg-slate-100 text-slate-800 border-slate-200',
    icon: 'bg-slate-100 text-slate-700',
  },
  automacao: {
    card: 'border-l-4 border-l-violet-500 bg-violet-50/40',
    badge: 'bg-violet-100 text-violet-800 border-violet-200',
    icon: 'bg-violet-100 text-violet-700',
  },
  produto: {
    card: 'border-l-4 border-l-fuchsia-500 bg-fuchsia-50/40',
    badge: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
    icon: 'bg-fuchsia-100 text-fuchsia-700',
  },
  desenvolvimento: {
    card: 'border-l-4 border-l-zinc-500 bg-zinc-50',
    badge: 'bg-zinc-100 text-zinc-800 border-zinc-200',
    icon: 'bg-zinc-100 text-zinc-700',
  },
  consultoria_estrategica: {
    card: 'border-l-4 border-l-stone-500 bg-stone-50',
    badge: 'bg-stone-100 text-stone-800 border-stone-200',
    icon: 'bg-stone-100 text-stone-700',
  },
};

const DEFAULT_CATEGORY_COLOR = {
  card: 'border-l-4 border-l-gray-300 bg-gray-50/50',
  badge: 'bg-gray-100 text-gray-700 border-gray-200',
  icon: 'bg-gray-100 text-gray-600',
};

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
  ciclo_mensal_4_semanas: {
    key: 'ciclo_mensal_4_semanas',
    label: 'Ciclo Mensal de Campanhas',
    category: 'marketing_digital',
    legacyKeys: [],
  },
  producao_conteudo: {
    key: 'producao_conteudo',
    label: 'Produção de Conteúdo',
    category: 'conteudo',
    legacyKeys: [],
  },
  sessao_fotos: {
    key: 'sessao_fotos',
    label: 'Sessão de Fotos',
    category: 'conteudo',
    legacyKeys: [],
  },
  campanha_pontual: {
    key: 'campanha_pontual',
    label: 'Campanha Pontual',
    category: 'marketing_digital',
    legacyKeys: [],
  },
  producao_video: {
    key: 'producao_video',
    label: 'Produção de Vídeo',
    category: 'conteudo',
    legacyKeys: [],
  },
  cobertura_evento: {
    key: 'cobertura_evento',
    label: 'Cobertura de Evento',
    category: 'conteudo',
    legacyKeys: [],
  },
  storymaker: {
    key: 'storymaker',
    label: 'Storymaker',
    category: 'conteudo',
    legacyKeys: [],
  },
  posicionamento_marca: {
    key: 'posicionamento_marca',
    label: 'Posicionamento de Marca',
    category: 'branding',
    legacyKeys: [],
  },
  identidade_papelaria_eventos: {
    key: 'identidade_papelaria_eventos',
    label: 'Identidade / Papelaria para Eventos',
    category: 'design',
    legacyKeys: [],
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

export function getCategoryColor(categoryKey) {
  const resolved = resolveServiceCategory(categoryKey);
  return SERVICE_CATEGORY_COLORS[resolved] || DEFAULT_CATEGORY_COLOR;
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
