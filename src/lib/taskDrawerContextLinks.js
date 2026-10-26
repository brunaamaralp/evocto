/**
 * Links de contexto do TaskDrawer (cliente › serviço › campanha › documentos).
 * Usa builders existentes — não inventa rotas.
 */

import { createPageUrl } from '@/utils';
import { buildClientHubHref } from '@/lib/shellNavigation';
import { buildCampaignWorkspaceTasksPath } from '@/lib/campaignWorkspaceHref';

/**
 * @param {object|null|undefined} task
 * @returns {{
 *   client: { href: string, label: string } | null,
 *   service: { href: string, label: string } | null,
 *   campaign: { href: string, label: string } | null,
 *   documents: { href: string, label: string } | null,
 * }}
 */
export function buildTaskDrawerContextLinks(task) {
  const clientId = task?.clientId ? String(task.clientId) : '';
  const serviceId = task?.serviceId ? String(task.serviceId) : '';
  const campaignId = String(
    task?.briefingId || task?.briefId || task?.campaignId || task?.campanhaId || ''
  ).trim();
  const cycleId = String(
    task?.cyclePlanId || task?.cycleId || task?.ciclo_id || ''
  ).trim();

  const client = clientId
    ? {
        href: buildClientHubHref(clientId, serviceId || null),
        label: 'Cliente',
      }
    : null;

  const service =
    clientId && serviceId
      ? {
          href: createPageUrl(
            `client-detail?clientId=${encodeURIComponent(clientId)}&serviceId=${encodeURIComponent(serviceId)}`
          ),
          label: 'Serviço',
        }
      : null;

  let campaign = null;
  if (clientId && campaignId) {
    const path = buildCampaignWorkspaceTasksPath({
      clientId,
      serviceId: serviceId || undefined,
      campaignId,
      cycleId: cycleId || undefined,
    });
    if (path && path !== '/clients') {
      campaign = {
        href: path.startsWith('/') ? path : createPageUrl(path),
        label: 'Campanha',
      };
    }
  }

  const documents = clientId
    ? {
        href: createPageUrl(
          `client-documents?clientId=${encodeURIComponent(clientId)}`
        ),
        label: 'Documentos',
      }
    : null;

  return { client, service, campaign, documents };
}

/**
 * Lista plana para render (só links presentes).
 * @param {object|null|undefined} task
 */
export function listTaskDrawerContextLinks(task) {
  const map = buildTaskDrawerContextLinks(task);
  return [map.client, map.service, map.campaign, map.documents].filter(Boolean);
}
