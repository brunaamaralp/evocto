export const PERFORMANCE_KPI_CATEGORIES = [
  { id: 'performance', value: 'performance', name: 'Performance', label: 'Performance', color: 'bg-blue-100 text-blue-800' },
  { id: 'demanda', value: 'demanda', name: 'Demanda', label: 'Demanda', color: 'bg-green-100 text-green-800' },
  { id: 'marca', value: 'marca', name: 'Marca', label: 'Marca', color: 'bg-purple-100 text-purple-800' },
  { id: 'operacao', value: 'operacao', name: 'Operação', label: 'Operação', color: 'bg-amber-100 text-amber-800' },
  { id: 'engajamento', value: 'engajamento', name: 'Engajamento', label: 'Engajamento', color: 'bg-pink-100 text-pink-800' },
  { id: 'crescimento', value: 'crescimento', name: 'Crescimento', label: 'Crescimento', color: 'bg-indigo-100 text-indigo-800' },
];

export const SUGGESTED_PERFORMANCE_KPIS = {
  performance: [
    { name: 'ROAS', description: 'Receita atribuída ÷ Investimento em mídia', target: 3, unit: 'ratio' },
    { name: 'CPA', description: 'Custo por aquisição / conversão', target: 0, unit: 'currency' },
    { name: 'CTR', description: 'Cliques ÷ Impressões × 100', target: 2, unit: 'percentage' },
  ],
  demanda: [
    { name: 'Leads Qualificados', description: 'Volume de leads que atendem critérios', target: 50, unit: 'number' },
    { name: 'CAC', description: 'Investimento de marketing ÷ Novos clientes', target: 0, unit: 'currency' },
    { name: 'Taxa de Conversão', description: 'Conversões ÷ Visitantes × 100', target: 3, unit: 'percentage' },
  ],
  marca: [
    { name: 'Share of Voice', description: 'Menções da marca ÷ Menções da categoria', target: 20, unit: 'percentage' },
    { name: 'Clareza de Posicionamento', description: 'Score qualitativo 1–10', target: 8, unit: 'number' },
    { name: 'Consistência entre Canais', description: '% de canais alinhados ao tom', target: 80, unit: 'percentage' },
  ],
  engajamento: [
    { name: 'Engajamento Médio', description: 'Interações ÷ Alcance × 100', target: 3, unit: 'percentage' },
    { name: 'Alcance Orgânico', description: 'Pessoas alcançadas sem mídia paga', target: 10000, unit: 'number' },
    { name: 'Taxa de Abertura de E-mail', description: 'Aberturas ÷ Enviados × 100', target: 25, unit: 'percentage' },
  ],
  operacao: [
    { name: 'Taxa de Aprovação no Ciclo', description: 'Peças aprovadas em até 2 rodadas ÷ Total', target: 85, unit: 'percentage' },
    { name: 'Taxa de Publicação no Prazo', description: 'Publicadas no prazo ÷ Planejadas', target: 90, unit: 'percentage' },
    { name: 'SLA de Aprovação (dias)', description: 'Tempo médio até aprovação do cliente', target: 3, unit: 'days' },
  ],
  crescimento: [
    { name: 'Crescimento de Seguidores', description: 'Variação % de audiência no período', target: 5, unit: 'percentage' },
    { name: 'Tráfego Qualificado', description: 'Sessões de canais prioritários', target: 5000, unit: 'number' },
    { name: 'Pipeline Influenciado', description: 'Oportunidades atribuídas a marketing', target: 0, unit: 'currency' },
  ],
};

export const LEGACY_KPI_CATEGORY_MAP = {
  liquidez: 'performance',
  rentabilidade: 'demanda',
  endividamento: 'operacao',
  atividade: 'engajamento',
};

export const DEFAULT_KPI_CATEGORY = 'performance';

export function resolveKPICategory(key) {
  if (!key) return DEFAULT_KPI_CATEGORY;
  if (SUGGESTED_PERFORMANCE_KPIS[key] || PERFORMANCE_KPI_CATEGORIES.some(c => c.id === key || c.value === key)) return key;
  return LEGACY_KPI_CATEGORY_MAP[key] || key;
}

export function getKPICategoryLabel(key) {
  const resolved = resolveKPICategory(key);
  const cat = PERFORMANCE_KPI_CATEGORIES.find(c => c.id === resolved || c.value === resolved);
  return cat?.label || cat?.name || key;
}
