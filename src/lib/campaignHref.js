import { createPageUrl } from '@/utils';

/**
 * Home operacional da campanha (contexto unificado).
 * `campaignId` é o alias amigável; `briefingId` permanece por compatibilidade (mesmo documento).
 */
export function buildClientCampaignHref({ clientId, briefingId, campaignId }) {
  const id = campaignId || briefingId;
  if (!clientId || !id) return 'clients';
  const params = new URLSearchParams();
  params.set('clientId', clientId);
  params.set('campaignId', id);
  params.set('briefingId', id);
  return `client-campaign?${params.toString()}`;
}

export function clientCampaignPageUrl({ clientId, briefingId, campaignId }) {
  return createPageUrl(
    buildClientCampaignHref({ clientId, briefingId, campaignId })
  );
}
