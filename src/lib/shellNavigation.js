/**
 * Labels e hrefs do shell de navegação (sidebar + header).
 * Mantém nomenclatura amigável; não inventa rotas novas.
 */

import { createPageUrl } from '@/utils';
import { buildTasksManagerHref } from '@/lib/taskFilterPresets';
import { buildClientTasksHref } from '@/lib/taskScope';
import { buildNovaCampanhaHref, buildAnnualPlanHref } from '@/lib/planoAnualHub';

const SIDEBAR_COLLAPSED_KEY = 'evocto:sidebar-collapsed';

/** Rótulos curtos para breadcrumb do header (página atual). */
export const SHELL_PAGE_LABELS = {
  dashboard: 'Dashboard',
  clients: 'Clientes',
  'tasks-manager': 'Tarefas',
  'approval-dashboard': 'Aprovações',
  'hours-hub': 'Horas',
  comercial: 'Comercial',
  financeiro: 'Financeiro',
  'minha-empresa': 'Minha empresa',
  library: 'Biblioteca',
  'custom-reports': 'Relatórios',
  services: 'Templates',
  settings: 'Configurações',
  'my-account': 'Minha conta',
  'client-detail': 'Visão geral',
  client: 'Visão geral',
  'client-tasks': 'Tarefas',
  'client-documents': 'Documentos',
  'client-financeiro': 'Financeiro',
  'client-learnings': 'Aprendizados',
  'client-evolution': 'Aprendizados',
  'client-services': 'Serviços',
  'client-settings': 'Configurações',
  planejamento: 'Panorama',
  'briefing-campanha-anual': 'Panorama',
  brainstorm: 'Brainstorm',
  'client-brainstorm': 'Brainstorm',
  'client-campaign': 'Campanha',
  'delivery-workspace': 'Workspace',
  'briefing-inicial': 'Briefing inicial',
  'briefing-campanha': 'Campanha',
  'client-unit': 'Unidade',
};

export function getShellPageLabel(pageKey) {
  if (!pageKey) return null;
  return SHELL_PAGE_LABELS[pageKey] || null;
}

export function readSidebarCollapsed() {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeSidebarCollapsed(collapsed) {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0');
  } catch {
    /* ignore */
  }
}

/** Nova tarefa: inbox do cliente ou quadro da agência, abrindo o formulário. */
export function buildQuickCreateTaskHref({ clientId = null, serviceId = null } = {}) {
  if (clientId) {
    const base = buildClientTasksHref({
      clientId,
      serviceId: serviceId || null,
    });
    const sep = base.includes('?') ? '&' : '?';
    return createPageUrl(`${base}${sep}create=1`);
  }
  return createPageUrl('tasks-manager?create=1');
}

export function buildQuickCreateClientHref() {
  return createPageUrl('clients?create=1');
}

export function buildQuickCreateCampaignHref(clientId, opts = {}) {
  if (!clientId) return null;
  return buildNovaCampanhaHref(clientId, opts);
}

export function buildMyTasksHref() {
  return buildTasksManagerHref({ preset: 'my_tasks' });
}

export function buildClientPanoramaHref(clientId) {
  if (!clientId) return null;
  return buildAnnualPlanHref(clientId);
}

export function buildClientHubHref(clientId, serviceId = null) {
  if (!clientId) return createPageUrl('clients');
  let path = `client-detail?clientId=${clientId}`;
  if (serviceId) path += `&serviceId=${encodeURIComponent(serviceId)}`;
  return createPageUrl(path);
}

/**
 * Itens da bottom nav mobile (máx. 5: 4 destinos + Mais).
 * `action: 'more'` abre a sidebar completa.
 */
export function getMobileBottomNavItems({
  mode = 'global',
  clientId = null,
  serviceId = null,
  currentPage = '',
  taskPreset = null,
} = {}) {
  if (mode === 'client' && clientId) {
    return [
      {
        id: 'hub',
        label: 'Hub',
        href: buildClientHubHref(clientId, serviceId),
        isActive: currentPage === 'client-detail' || currentPage === 'client',
      },
      {
        id: 'tasks',
        label: 'Tarefas',
        href: createPageUrl(
          buildClientTasksHref({
            clientId,
            serviceId: serviceId || null,
          })
        ),
        isActive: currentPage === 'client-tasks',
      },
      {
        id: 'plan',
        label: 'Plano',
        href: buildClientPanoramaHref(clientId),
        isActive:
          currentPage === 'planejamento' ||
          currentPage === 'briefing-campanha-anual',
      },
      {
        id: 'more',
        label: 'Mais',
        action: 'more',
        isActive: false,
      },
    ];
  }

  return [
    {
      id: 'home',
      label: 'Início',
      href: createPageUrl('dashboard'),
      isActive: currentPage === 'dashboard',
    },
    {
      id: 'clients',
      label: 'Clientes',
      href: createPageUrl('clients'),
      isActive: currentPage === 'clients',
    },
    {
      id: 'my-tasks',
      label: 'Tarefas',
      href: buildMyTasksHref(),
      isActive: currentPage === 'tasks-manager' && taskPreset === 'my_tasks',
    },
    {
      id: 'approvals',
      label: 'Aprovações',
      href: createPageUrl('approval-dashboard'),
      isActive:
        currentPage === 'approval-dashboard' ||
        currentPage === 'cycle-approval' ||
        currentPage === 'cycle-approval-manager',
    },
    {
      id: 'more',
      label: 'Mais',
      action: 'more',
      isActive: false,
    },
  ];
}

/**
 * Trail do header no shell de cliente.
 * Clientes › {Cliente} › [{Campanha}|{página}]
 */
export function buildShellClientBreadcrumbs({
  clientId,
  clientName,
  campaignName = null,
  campaignHref = null,
  pageKey = null,
  pageLabel = null,
} = {}) {
  if (!clientId) return [];

  const crumbs = [
    { label: 'Clientes', href: createPageUrl('clients') },
    {
      label: clientName || 'Cliente',
      href: createPageUrl(`client-detail?clientId=${clientId}`),
    },
  ];

  if (campaignName) {
    crumbs.push({
      label: campaignName,
      href: campaignHref || null,
    });
    return crumbs;
  }

  const label = pageLabel || getShellPageLabel(pageKey);
  if (label && pageKey !== 'client-detail' && pageKey !== 'client') {
    crumbs.push({ label, href: null });
  }

  return crumbs;
}
