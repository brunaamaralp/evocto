import { createPageUrl } from '@/utils';
import {
  buildCampaignWorkspaceIdeiaPath,
  buildCampaignWorkspacePath,
  buildCampaignWorkspaceTasksPath,
} from '@/lib/campaignWorkspaceHref';

/**
 * Home operacional da campanha.
 * Com `serviceId` → Workspace canônico (Fase 0–5).
 * Sem `serviceId` → rota legada `/client-campaign` (página redireciona).
 *
 * `campaignId` é o alias amigável; `briefingId` permanece por compatibilidade.
 *
 * @param {{ clientId?: string, briefingId?: string, campaignId?: string, serviceId?: string, tab?: string }} opts
 */
export function buildClientCampaignHref({
  clientId,
  briefingId,
  campaignId,
  serviceId = null,
  tab = 'tasks',
} = {}) {
  const id = campaignId || briefingId;
  if (serviceId && id) {
    const path = buildCampaignWorkspacePath({
      serviceId,
      clientId,
      campaignId: id,
      tab,
    });
    return String(path).replace(/^\//, '');
  }
  if (!clientId || !id) return 'clients';
  const params = new URLSearchParams();
  params.set('clientId', clientId);
  params.set('campaignId', id);
  params.set('briefingId', id);
  return `client-campaign?${params.toString()}`;
}

export function clientCampaignPageUrl(opts) {
  return createPageUrl(buildClientCampaignHref(opts));
}

/** Landing pós-criar / Hub (D1). */
export function clientCampaignTasksPageUrl(opts) {
  const { serviceId, clientId, campaignId, briefingId } = opts || {};
  const id = campaignId || briefingId;
  if (serviceId && id) {
    return buildCampaignWorkspaceTasksPath({
      serviceId,
      clientId,
      campaignId: id,
    });
  }
  return clientCampaignPageUrl(opts);
}

/** R2 — ficha legada → aba Ideia. */
export function clientCampaignIdeiaPageUrl(opts) {
  const { serviceId, clientId, campaignId, briefingId } = opts || {};
  const id = campaignId || briefingId;
  if (serviceId && id) {
    return buildCampaignWorkspaceIdeiaPath({
      serviceId,
      clientId,
      campaignId: id,
    });
  }
  return clientCampaignPageUrl({ ...opts, tab: 'ideia' });
}
