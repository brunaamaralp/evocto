import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from '@/components/auth/SessionManager';
import { Brief, Client } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { createPageUrl, getUrlSearchParam } from '@/utils';
import AnnualPanorama from '@/components/planejamento/AnnualPanorama';
import PlanejarMultiplosDialog from '@/components/planejamento/PlanejarMultiplosDialog';
import { buildPanoramaMonths } from '@/lib/panoramaAnual';

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
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!clientId) {
    return (
      <div className="mx-auto max-w-lg p-6 text-center space-y-3">
        <AlertCircle className="mx-auto h-10 w-10 text-red-500" />
        <p className="text-sm text-slate-700">clientId obrigatório na URL.</p>
        <Button asChild variant="outline">
          <Link to={createPageUrl('clients')}>Voltar aos clientes</Link>
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="mx-auto max-w-lg p-6 text-center space-y-3">
        <AlertCircle className="mx-auto h-10 w-10 text-red-500" />
        <p className="text-sm text-red-700">{error || 'Cliente não encontrado'}</p>
        <Button type="button" variant="outline" onClick={load}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-1 pb-10 sm:px-0">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8 -ml-1.5">
          <Link
            to={createPageUrl(`client-detail?clientId=${clientId}`)}
            aria-label="Voltar ao hub"
          >
            <ArrowLeft className="h-4 w-4 text-slate-500" />
          </Link>
        </Button>
        <p className="text-sm text-slate-500 truncate">{client.name}</p>
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
