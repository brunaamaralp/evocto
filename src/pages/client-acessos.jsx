import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, KeyRound, Users } from 'lucide-react';
import { useSession } from '@/components/auth/SessionManager';
import { Client } from '@/api/entities';
import { Button } from '@/components/ui/button';
import LoadingState from '@/components/shared/LoadingState';
import EmptyState from '@/components/shared/EmptyState';
import ClientAccessesPanel from '@/components/client/ClientAccessesPanel';
import { createPageUrl } from '@/utils';

export default function ClientAcessosPage() {
  const { isAuthenticated, agencyId } = useSession();
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get('clientId');

  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState(null);
  const [error, setError] = useState(null);

  const loadClient = useCallback(async () => {
    if (!clientId || !isAuthenticated) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const clientData = await Client.get(clientId);
      if (!clientData) {
        throw new Error('Cliente não encontrado');
      }
      if (agencyId && clientData.agencyId && clientData.agencyId !== agencyId) {
        throw new Error('Este cliente não pertence à sua agência');
      }
      setClient(clientData);
    } catch (err) {
      console.error('[client-acessos]', err?.message || err);
      setError(err?.message || 'Erro ao carregar cliente');
      setClient(null);
    } finally {
      setLoading(false);
    }
  }, [clientId, isAuthenticated, agencyId]);

  useEffect(() => {
    loadClient();
  }, [loadClient]);

  if (loading) {
    return <LoadingState message="Carregando acessos e informações…" />;
  }

  if (!clientId || error || !client) {
    return (
      <EmptyState
        icon={Users}
        title="Cliente não encontrado"
        description={error || 'Informe um cliente válido para gerenciar acessos.'}
        primaryAction={{
          label: 'Voltar aos Clientes',
          href: createPageUrl('clients'),
        }}
      />
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 -ml-1.5"
            asChild
          >
            <Link
              to={createPageUrl(`client-detail?clientId=${clientId}`)}
              aria-label="Voltar ao cliente"
            >
              <ArrowLeft className="w-4 h-4 text-[#7A7595]" />
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-[#C02807] shrink-0" />
              <h1 className="text-xl font-bold tracking-tight text-[#18162A] leading-tight truncate">
                Acessos e informações
              </h1>
            </div>
            <p className="text-xs text-[#7A7595] truncate">{client.name}</p>
          </div>
        </div>
      </div>

      <ClientAccessesPanel clientId={clientId} />
    </div>
  );
}
