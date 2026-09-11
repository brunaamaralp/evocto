/**
 * Breadcrumb operacional: Cliente › Serviço › [Período] › Unidade
 * Gerado por contexto + profile — sem hardcode de offering_key na UI.
 */

import { createPageUrl } from '@/utils';
import {
  formatPeriodLabel,
  getServiceDisplayName,
  PERIOD_MODES,
} from '@/lib/serviceOperationProfile';

/**
 * @param {{
 *   client?: { id?: string, name?: string } | null,
 *   service?: object | null,
 *   profile?: object | null,
 *   cycle?: object | string | null,
 *   periodLabel?: string | null,
 *   unitTitle?: string | null,
 *   unitHref?: string | null,
 * }} args
 * @returns {{ label: string, href?: string | null }[]}
 */
export function buildClientOperationBreadcrumbs({
  client = null,
  service = null,
  profile = null,
  cycle = null,
  periodLabel = null,
  unitTitle = null,
  unitHref = null,
} = {}) {
  const crumbs = [];
  const clientId = client?.id || null;
  const serviceId = service?.id || null;

  if (client?.name && clientId) {
    const hub =
      serviceId != null
        ? `client-detail?clientId=${clientId}&serviceId=${encodeURIComponent(String(serviceId))}`
        : `client-detail?clientId=${clientId}`;
    crumbs.push({
      label: client.name,
      href: createPageUrl(hub),
    });
  }

  if (service) {
    crumbs.push({
      label: getServiceDisplayName(service),
      href: clientId
        ? createPageUrl(
            `client-detail?clientId=${clientId}&serviceId=${encodeURIComponent(String(service.id))}`
          )
        : null,
    });
  }

  const period =
    periodLabel ||
    (profile?.periodMode === PERIOD_MODES.MONTHLY
      ? formatPeriodLabel(cycle)
      : null);

  if (period) {
    crumbs.push({
      label: period,
      href: clientId && serviceId
        ? createPageUrl(
            `client-detail?clientId=${clientId}&serviceId=${encodeURIComponent(String(serviceId))}#operacao`
          )
        : null,
    });
  }

  if (unitTitle) {
    crumbs.push({
      label: unitTitle,
      href: unitHref || null,
    });
  }

  return crumbs;
}
