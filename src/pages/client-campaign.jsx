import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/components/auth/SessionManager';
import { Brief, CyclePlan, Service } from '@/api/entities';
import LoadingState from '@/components/shared/LoadingState';
import { getUrlSearchParam } from '@/utils';
import {
  buildCampaignWorkspaceIdeiaPath,
  resolveServiceIdForCampaign,
} from '@/lib/campaignWorkspaceHref';

/**
 * Fase 5 / R2 — `/client-campaign` redireciona para Workspace aba Ideia.
 */
export default function ClientCampaignPage() {
  const { agencyId, isAuthenticated } = useSession();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;

    (async () => {
      const params = new URLSearchParams(window.location.search);
      const clientId = getUrlSearchParam(params, 'clientId', 'id');
      const campaignId = getUrlSearchParam(
        params,
        'campaignId',
        'briefingId',
        'campanhaId'
      );
      const fallbackServiceId = params.get('serviceId');

      if (!clientId || !campaignId) {
        setError('clientId e campaignId são obrigatórios');
        return;
      }

      try {
        const brief = await Brief.get(campaignId);
        if (cancelled) return;
        if (!brief || (brief.agencyId && agencyId && brief.agencyId !== agencyId)) {
          setError('Campanha não encontrada');
          return;
        }

        const serviceId = await resolveServiceIdForCampaign({
          brief,
          agencyId,
          clientId: clientId || brief.clientId,
          fallbackServiceId,
          loadCycle: (id) => CyclePlan.get(id),
          listServices: (filter) => Service.filter(filter),
        });

        if (cancelled) return;

        if (serviceId) {
          navigate(
            buildCampaignWorkspaceIdeiaPath({
              serviceId,
              clientId: clientId || brief.clientId,
              campaignId: brief.id || campaignId,
            }),
            { replace: true }
          );
          return;
        }

        navigate(`/client-detail?clientId=${encodeURIComponent(clientId)}`, {
          replace: true,
        });
      } catch (err) {
        console.error('[client-campaign redirect]', err);
        if (!cancelled) setError(err?.message || 'Falha ao redirecionar');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [agencyId, isAuthenticated, navigate]);

  if (error) {
    return (
      <div className="p-6 text-sm text-red-700">
        {error}
      </div>
    );
  }

  return <LoadingState message="Abrindo workspace da campanha…" />;
}
