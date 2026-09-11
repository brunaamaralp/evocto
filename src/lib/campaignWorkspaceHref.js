/**
 * Fase 0 — Contrato de URL/abas do Workspace da campanha.
 * Spec: docs/SPEC_CAMPANHA_ROTAS_FASE0.md
 *
 * Sem wiring de UI: builders + resolve puros para fases seguintes.
 */

export const CAMPAIGN_WORKSPACE_TABS = Object.freeze([
  { id: 'contexto', label: 'Contexto' },
  { id: 'ideia', label: 'Ideia' },
  { id: 'tasks', label: 'Tarefas' },
  { id: 'historico', label: 'Histórico' },
]);

export const CAMPAIGN_WORKSPACE_DEFAULT_TAB = 'tasks';

const TAB_ID_SET = new Set(CAMPAIGN_WORKSPACE_TABS.map((t) => t.id));

/** Aliases de ?section= / ?tab= → id canônico (modo campanha). */
export const CAMPAIGN_WORKSPACE_TAB_ALIASES = Object.freeze({
  contexto: 'contexto',
  context: 'contexto',
  servico: 'contexto',
  briefing_servico: 'contexto',
  ideia: 'ideia',
  ficha: 'ideia',
  brief: 'ideia',
  briefing: 'ideia',
  campaign: 'ideia',
  tasks: 'tasks',
  tarefas: 'tasks',
  historico: 'historico',
  history: 'historico',
});

/**
 * @param {URLSearchParams | { get: (k: string) => string | null } | null | undefined} params
 * @returns {string | null}
 */
export function getCampaignIdFromSearchParams(params) {
  if (!params?.get) return null;
  const id =
    params.get('campaignId') ||
    params.get('briefingId') ||
    params.get('campanhaId') ||
    '';
  const trimmed = String(id).trim();
  return trimmed || null;
}

/**
 * Resolve aba do Workspace em modo campanha.
 * Sem campaignId na URL → `null` (usar nav legada de serviço).
 *
 * @param {URLSearchParams | { get: (k: string) => string | null } | null | undefined} params
 * @returns {string | null}
 */
export function resolveCampaignWorkspaceTab(params) {
  const campaignId = getCampaignIdFromSearchParams(params);
  if (!campaignId) return null;

  const rawSection = String(params?.get?.('section') || '')
    .trim()
    .toLowerCase();
  const rawTab = String(params?.get?.('tab') || '')
    .trim()
    .toLowerCase();
  const raw = rawSection || rawTab;

  if (!raw) return CAMPAIGN_WORKSPACE_DEFAULT_TAB;

  const aliased = CAMPAIGN_WORKSPACE_TAB_ALIASES[raw] || raw;
  if (TAB_ID_SET.has(aliased)) return aliased;
  return CAMPAIGN_WORKSPACE_DEFAULT_TAB;
}

/**
 * Path canônico do Workspace da campanha (com leading `/`, pronto para <Link to>).
 *
 * @param {{
 *   serviceId: string,
 *   clientId?: string,
 *   campaignId?: string,
 *   briefingId?: string,
 *   tab?: string,
 * }} opts
 * @returns {string}
 */
export function buildCampaignWorkspacePath(opts = {}) {
  const serviceId = String(opts.serviceId || '').trim();
  const clientId = String(opts.clientId || '').trim();
  const campaignId = String(opts.campaignId || opts.briefingId || '').trim();

  if (!serviceId || !campaignId) {
    return '/clients';
  }

  const rawTab = String(opts.tab || CAMPAIGN_WORKSPACE_DEFAULT_TAB)
    .trim()
    .toLowerCase();
  const tab =
    CAMPAIGN_WORKSPACE_TAB_ALIASES[rawTab] ||
    (TAB_ID_SET.has(rawTab) ? rawTab : CAMPAIGN_WORKSPACE_DEFAULT_TAB);

  const params = new URLSearchParams();
  params.set('serviceId', serviceId);
  if (clientId) params.set('clientId', clientId);
  params.set('campaignId', campaignId);
  params.set('briefingId', campaignId);
  params.set('section', tab);

  return `/delivery-workspace?${params.toString()}`;
}

/**
 * Landing pós-criar / materializar / click no Hub (D1).
 */
export function buildCampaignWorkspaceTasksPath(opts) {
  return buildCampaignWorkspacePath({ ...opts, tab: 'tasks' });
}

/**
 * Destino R2 da ficha legada (/client-campaign).
 */
export function buildCampaignWorkspaceIdeiaPath(opts) {
  return buildCampaignWorkspacePath({ ...opts, tab: 'ideia' });
}

/**
 * @param {string} pageName - ex. 'client-campaign', 'ClientCampaign', 'client-tasks'
 * @returns {string}
 */
function normalizePageName(pageName) {
  return String(pageName || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/^\//, '');
}

/**
 * Resolve redirect legado → Workspace (contrato Fase 0).
 * Retorna `null` quando a rota deve permanecer (ex. inbox T2).
 *
 * Requer `serviceId` nos params (ou em `fallbackServiceId`) para montar o path.
 * Sem serviceId: retorna `{ needsServiceId: true, campaignId, tab }` para a página resolver.
 *
 * @param {{
 *   pageName: string,
 *   params?: URLSearchParams | { get: (k: string) => string | null },
 *   fallbackServiceId?: string,
 *   hash?: string,
 * }} input
 * @returns {{
 *   path: string,
 *   tab: string,
 *   campaignId: string,
 *   clientId: string | null,
 *   serviceId: string | null,
 * } | {
 *   needsServiceId: true,
 *   tab: string,
 *   campaignId: string,
 *   clientId: string | null,
 * } | null}
 */
export function resolveLegacyCampaignRedirect({
  pageName,
  params = null,
  fallbackServiceId = '',
  hash = '',
} = {}) {
  const page = normalizePageName(pageName);
  const campaignId = getCampaignIdFromSearchParams(params);
  const clientIdRaw = params?.get?.('clientId');
  const clientId = clientIdRaw ? String(clientIdRaw).trim() || null : null;
  const serviceId =
    String(params?.get?.('serviceId') || fallbackServiceId || '').trim() || null;

  const hashNorm = String(hash || '')
    .trim()
    .toLowerCase()
    .replace(/^#/, '');

  // Inbox transversal — não redireciona
  if (page === 'client-tasks' && !campaignId) {
    return null;
  }

  let tab = null;

  if (page === 'client-campaign' || page === 'campaign') {
    tab = hashNorm === 'ficha' || hashNorm === 'ideia' ? 'ideia' : 'ideia';
  } else if (page === 'client-tasks' && campaignId) {
    tab = 'tasks';
  } else if (hashNorm === 'ficha') {
    tab = 'ideia';
  }

  if (!tab || !campaignId) return null;

  if (!serviceId) {
    return {
      needsServiceId: true,
      tab,
      campaignId,
      clientId: clientId ? String(clientId) : null,
    };
  }

  const path = buildCampaignWorkspacePath({
    serviceId,
    clientId: clientId || undefined,
    campaignId,
    tab,
  });

  return {
    path,
    tab,
    campaignId,
    clientId: clientId ? String(clientId) : null,
    serviceId,
  };
}

/**
 * Destinos de “não cria no Hub” — empty state / CTA legado.
 */
export function buildPlanningCreateCampaignPath(clientId, { serviceId = null } = {}) {
  const id = String(clientId || '').trim();
  if (!id) return '/clients';
  const params = new URLSearchParams();
  params.set('clientId', id);
  if (serviceId) params.set('serviceId', String(serviceId));
  return `/client-briefing?${params.toString()}`;
}

/**
 * Resolve serviceId para redirects (Brief → CyclePlan → fallback).
 * @param {{
 *   brief?: object | null,
 *   agencyId?: string | null,
 *   clientId?: string | null,
 *   fallbackServiceId?: string | null,
 *   loadCycle?: (id: string) => Promise<object | null>,
 *   listServices?: (filter: object) => Promise<object[]>,
 * }} opts
 */
export async function resolveServiceIdForCampaign({
  brief = null,
  agencyId = null,
  clientId = null,
  fallbackServiceId = null,
  loadCycle = null,
  listServices = null,
} = {}) {
  const fromFallback = String(fallbackServiceId || '').trim();
  if (fromFallback) return fromFallback;

  const fromBrief = String(brief?.serviceId || '').trim();
  if (fromBrief) return fromBrief;

  const cycleId = String(
    brief?.ciclo_id || brief?.cycleId || brief?.cyclePlanId || ''
  ).trim();
  if (cycleId && typeof loadCycle === 'function') {
    const cycle = await loadCycle(cycleId).catch(() => null);
    const fromCycle = String(cycle?.serviceId || '').trim();
    if (fromCycle) return fromCycle;
  }

  const cid = String(clientId || brief?.clientId || brief?.projectId || '').trim();
  if (agencyId && cid && typeof listServices === 'function') {
    const list = await listServices({
      agencyId,
      clientId: cid,
      is_template: false,
    }).catch(() => []);
    const active = (Array.isArray(list) ? list : []).find(
      (s) => s?.is_active !== false && s?.id
    );
    if (active?.id) return String(active.id);
  }

  return null;
}
