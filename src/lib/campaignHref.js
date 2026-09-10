import { createPageUrl } from '@/utils';

/**
 * Home operacional da campanha (contexto unificado).
 */
export function buildClientCampaignHref({ clientId, briefingId }) {
  if (!clientId || !briefingId) return 'clients';
  const params = new URLSearchParams();
  params.set('clientId', clientId);
  params.set('briefingId', briefingId);
  return `client-campaign?${params.toString()}`;
}

export function clientCampaignPageUrl({ clientId, briefingId }) {
  return createPageUrl(buildClientCampaignHref({ clientId, briefingId }));
}
