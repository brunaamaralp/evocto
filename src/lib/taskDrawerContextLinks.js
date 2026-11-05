/**
 * Links de contexto do TaskDrawer (cliente › serviço › documentos).
 * Usa builders existentes — não inventa rotas.
 */

import { createPageUrl } from '@/utils';
import { buildClientHubHref } from '@/lib/shellNavigation';
import { buildDeliveryWorkspacePath } from '@/lib/deliveryWorkspaceTabs';

/**
 * @param {object|null|undefined} task
 * @returns {{
 *   client: { href: string, label: string } | null,
 *   service: { href: string, label: string } | null,
 *   documents: { href: string, label: string } | null,
 * }}
 */
export function buildTaskDrawerContextLinks(task) {
  const clientId = task?.clientId ? String(task.clientId) : '';
  const serviceId = task?.serviceId ? String(task.serviceId) : '';
  const client = clientId
    ? {
        href: buildClientHubHref(clientId, serviceId || null),
        label: 'Cliente',
      }
    : null;

  const service =
    clientId && serviceId
      ? {
          href: buildDeliveryWorkspacePath(serviceId, 'tasks', { clientId }),
          label: 'Serviço',
        }
      : null;

  const documents = clientId
    ? {
        href: createPageUrl(
          `client-documents?clientId=${encodeURIComponent(clientId)}`
        ),
        label: 'Documentos',
      }
    : null;

  return { client, service, documents };
}

/**
 * Lista plana para render (só links presentes).
 * @param {object|null|undefined} task
 */
export function listTaskDrawerContextLinks(task) {
  const map = buildTaskDrawerContextLinks(task);
  return [map.client, map.service, map.documents].filter(Boolean);
}
