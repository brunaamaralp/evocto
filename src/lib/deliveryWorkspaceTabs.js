/**
 * Navegação contextual do workspace de entrega (Serviço = projeto operacional).
 * Espelha o padrão ProjectProfile do ArqTask: sidebar + ?section=.
 */

export const DELIVERY_WORKSPACE_NAV_ITEMS = Object.freeze([
  { id: 'overview', label: 'Visão geral' },
  { id: 'tasks', label: 'Tarefas' },
  { id: 'entregas', label: 'Entregas' },
  { id: 'atividade', label: 'Atividade' },
  { id: 'cronograma', label: 'Cronograma' },
  { id: 'files', label: 'Arquivos' },
  { id: 'finance', label: 'Financeiro' },
  { id: 'notes', label: 'Notas' },
]);

export const DELIVERY_WORKSPACE_DEFAULT_SECTION = 'tasks';

const NAV_ID_SET = new Set(DELIVERY_WORKSPACE_NAV_ITEMS.map((i) => i.id));

export const DELIVERY_WORKSPACE_SECTION_ALIASES = Object.freeze({
  detalhes: 'overview',
  details: 'overview',
  timer: 'atividade',
  schedule: 'cronograma',
  arquivos: 'files',
  financeiro: 'finance',
  notas: 'notes',
  deliveries: 'entregas',
  material: 'entregas',
});

/**
 * @param {URLSearchParams | { get: (k: string) => string | null }} params
 */
export function resolveDeliverySection(params) {
  const rawSection = String(params?.get?.('section') || '')
    .trim()
    .toLowerCase();
  const rawTab = String(params?.get?.('tab') || '')
    .trim()
    .toLowerCase();
  const raw = rawSection || rawTab;

  if (!raw) return DELIVERY_WORKSPACE_DEFAULT_SECTION;

  const aliased = DELIVERY_WORKSPACE_SECTION_ALIASES[raw] || raw;
  if (NAV_ID_SET.has(aliased)) return aliased;
  return DELIVERY_WORKSPACE_DEFAULT_SECTION;
}

/**
 * @param {string} serviceId
 * @param {string} [section]
 * @param {{ clientId?: string, stage?: string }} [extra]
 */
export function buildDeliveryWorkspacePath(serviceId, section, extra = {}) {
  const id = encodeURIComponent(String(serviceId || '').trim());
  const params = new URLSearchParams();
  if (section) params.set('section', section);
  if (extra.clientId) params.set('clientId', String(extra.clientId));
  if (extra.stage) params.set('stage', String(extra.stage));
  const qs = params.toString();
  return `/delivery-workspace?serviceId=${id}${qs ? `&${qs}` : ''}`;
}

/**
 * @param {string} serviceId
 * @param {string} deliverableId
 * @param {{ clientId?: string }} [extra]
 */
export function buildDeliveryTasksStagePath(serviceId, deliverableId, extra = {}) {
  return buildDeliveryWorkspacePath(serviceId, 'tasks', {
    ...extra,
    stage: deliverableId,
  });
}
