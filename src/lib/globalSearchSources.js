/**
 * Fontes e atalhos da busca global / QuickSwitcher (Fase C).
 */

import { Client, Service, Brief, Task, CyclePlan } from '@/api/entities';
import { createPageUrl } from '@/utils';
import { buildCampaignWorkspaceIdeiaPath } from '@/lib/campaignWorkspaceHref';
import { openTaskDrawer } from '@/lib/openTaskDrawer';

function agencyFilter(agencyId) {
  return agencyId ? { agencyId } : {};
}

/**
 * Atalhos de navegação (não dependem de fetch).
 * Presets de filtro ficam nos selects do quadro — sem lista paralela na busca.
 * @param {{ userId?: string|null }} _ctx
 */
export function getGlobalSearchShortcuts(_ctx = {}) {
  const nav = [
    {
      id: 'nav-dashboard',
      title: 'Dashboard',
      subtitle: '',
      href: createPageUrl('dashboard'),
    },
    {
      id: 'nav-clients',
      title: 'Clientes',
      subtitle: '',
      href: createPageUrl('clients'),
    },
    {
      id: 'nav-tasks',
      title: 'Tarefas',
      subtitle: '',
      href: createPageUrl('tasks-manager'),
    },
    {
      id: 'nav-approvals',
      title: 'Aprovações',
      subtitle: '',
      href: createPageUrl('approval-dashboard'),
    },
  ];

  return { nav, presets: [] };
}

/**
 * Carrega entidades pesquisáveis respeitando agencyId.
 * @param {string} agencyId
 */
export async function fetchGlobalSearchEntities(agencyId) {
  if (!agencyId) {
    return {
      clients: [],
      services: [],
      campaigns: [],
      tasks: [],
      cycles: [],
      partialFailure: false,
      failedSources: [],
    };
  }

  const base = agencyFilter(agencyId);
  const failedSources = [];

  const safe = async (label, fn) => {
    try {
      const rows = await fn();
      return Array.isArray(rows) ? rows : [];
    } catch (err) {
      console.warn(`[globalSearch] ${label} failed:`, err?.message || err);
      failedSources.push(label);
      return [];
    }
  };

  const [clients, services, briefs, tasks, cycles] = await Promise.all([
    safe('clients', () => Client.filter(base, '-updated_date', 40)),
    safe('services', () =>
      Service.filter({ ...base, is_template: false }, '-updated_date', 30)
    ),
    safe('briefs', () => Brief.filter(base, '-updated_date', 30)),
    safe('tasks', () => Task.filter(base, '-updated_date', 40)),
    safe('cycles', () => CyclePlan.filter(base, '-updated_date', 20)),
  ]);

  return {
    clients: clients.map((c) => ({
      id: c.id,
      clientId: c.id,
      title: c.name || c.company || 'Cliente',
      subtitle: c.company && c.name !== c.company ? c.company : c.status || '',
      href: createPageUrl(`client-detail?clientId=${c.id}`),
      group: 'Clientes',
    })),
    services: services.map((s) => ({
      id: s.id,
      clientId: s.clientId || null,
      title: s.name || 'Serviço',
      subtitle: s.category || '',
      href: createPageUrl(
        `service-detail?serviceId=${s.id}${
          s.clientId ? `&clientId=${s.clientId}` : ''
        }`
      ),
      group: 'Serviços',
    })),
    campaigns: briefs.map((b) => {
      const clientId = b.clientId || b.projectId || null;
      const campaignId = b.id;
      const serviceId = b.serviceId || null;
      let href = createPageUrl(
        clientId
          ? `client-detail?clientId=${clientId}`
          : 'clients'
      );
      if (serviceId && campaignId) {
        href = buildCampaignWorkspaceIdeiaPath({
          serviceId,
          clientId,
          campaignId,
        });
      }
      return {
        id: b.id,
        clientId,
        title: b.title || b.name || 'Campanha',
        subtitle: b.clientName || (clientId ? `Cliente ${String(clientId).slice(0, 6)}` : ''),
        href,
        group: 'Campanhas',
      };
    }),
    tasks: tasks.map((t) => ({
      id: t.id,
      clientId: t.clientId || t.projectId || null,
      title: t.title || 'Tarefa',
      subtitle: t.status || '',
      href: createPageUrl(`tasks-manager?taskId=${encodeURIComponent(t.id)}`),
      openTaskId: t.id,
      group: 'Tarefas',
    })),
    cycles: cycles.map((c) => ({
      id: c.id,
      clientId: c.clientId || null,
      title: c.cyclePeriod || c.title || 'Ciclo',
      subtitle: c.status || '',
      href: createPageUrl(`cycle-approval?id=${c.id}`),
      group: 'Ciclos',
    })),
    partialFailure: failedSources.length > 0,
    failedSources,
  };
}

/**
 * Abre resultado: prefer drawer para tarefas quando possível.
 */
export function openGlobalSearchResult(item, navigate) {
  if (item?.openTaskId) {
    navigate(item.href);
    openTaskDrawer(item.openTaskId);
    return;
  }
  if (item?.href) navigate(item.href);
}
