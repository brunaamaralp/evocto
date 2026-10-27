import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from '@/components/auth/SessionManager';
import { Brief, Client } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { createPageUrl, getUrlSearchParam } from '@/utils';
import AnnualPanorama from '@/components/planejamento/AnnualPanorama';
import PlanejarMultiplosDialog from '@/components/planejamento/PlanejarMultiplosDialog';
import { buildPanoramaMonths } from '@/lib/panoramaAnual';
import LoadingState from '@/components/shared/LoadingState';
import ErrorState from '@/components/shared/ErrorState';
import EmptyState from '@/components/shared/EmptyState';

/**
 * HOME de Planejamento — Panorama Anual (PI-0–4).
 * /planejamento?clientId=&ano=
 */
export default function PlanejamentoPage() {
  const { agencyId, userId, isAuthenticated } = useSession();
  const [searchParams] = useSearchParams();
  const clientId = getUrlSearchParam(searchParams, 'clientId', 'id');
  const ano = Number(searchParams.get('ano')) || new Date().getFullYear();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [client, setClient] = useState(null);
  const [briefs, setBriefs] = useState([]);
  const [multiplosOpen, setMultiplosOpen] = useState(false);

  const load = useCallback(async () => {
    if (!clientId || !agencyId) return;
    setLoading(true);
    setError(null);
    try {
      const [clientData, briefList] = await Promise.all([
        Client.get(clientId),
        Brief.filter({ clientId, agencyId }).catch(() => []),
      ]);
      if (!clientData || clientData.agencyId !== agencyId) {
        throw new Error('Cliente não encontrado');
      }
      setClient(clientData);
      setBriefs(Array.isArray(briefList) ? briefList : []);
    } catch (err) {
      console.error('[planejamento]', err);
      setError(err?.message || 'Falha ao carregar planejamento');
    } finally {
      setLoading(false);
    }
  }, [clientId, agencyId]);

  useEffect(() => {
    if (isAuthenticated) load();
  }, [isAuthenticated, load]);

  const months = useMemo(
    () => buildPanoramaMonths(briefs, ano),
    [briefs, ano]
  );

  if (!isAuthenticated) {
    return <LoadingState message="Verificando autenticação…" className="min-h-[40vh]" />;
  }

  if (!clientId) {
    return (
      <EmptyState
        variant="default"
        icon={AlertCircle}
        title="Cliente não informado"
        description="Abra o Panorama a partir do hub do cliente."
        primaryAction={{
          label: 'Voltar aos clientes',
          href: createPageUrl('clients'),
        }}
      />
    );
  }

  if (loading) {
    return (
      <LoadingState
        variant="skeleton"
        size="page"
        message="Carregando planejamento…"
        className="min-h-[40vh]"
      />
    );
  }

  if (error || !client) {
    return (
      <ErrorState
        title="Erro ao carregar planejamento"
        message={error || 'Cliente não encontrado'}
        onRetry={load}
        showHomeButton={false}
      />
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-1 pb-10 sm:px-0">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" className="page-back-btn h-8 w-8 -ml-1.5">
          <Link
            to={createPageUrl(`client-detail?clientId=${clientId}`)}
            aria-label="Voltar ao hub"
          >
            <ArrowLeft className="h-4 w-4 text-slate-500" />
          </Link>
        </Button>
      </div>

      <AnnualPanorama
        clientId={clientId}
        clientName={client.name || 'Cliente'}
        ano={ano}
        months={months}
        onPlanMultiple={() => setMultiplosOpen(true)}
      />

      <PlanejarMultiplosDialog
        open={multiplosOpen}
        onOpenChange={setMultiplosOpen}
        clientId={clientId}
        agencyId={agencyId}
        userId={userId}
        ano={ano}
        months={months}
        onSaved={(result) => {
          toast.success(
            `${result.created?.length || 0} campanhas planejadas no batch`
          );
          load();
        }}
      />
    </div>
  );
}
