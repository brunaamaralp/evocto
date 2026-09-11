import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Client } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Plus } from 'lucide-react';
import LoadingState from '@/components/shared/LoadingState';
import EmptyState from '@/components/shared/EmptyState';
import ClientLearningsPanel from '@/components/client/learnings/ClientLearningsPanel';
import ClientEvolutionPanel from '@/components/client/evolution/ClientEvolutionPanel';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

const TAB_APRENDIZADOS = 'aprendizados';
const TAB_EVOLUCAO = 'evolucao';

function normalizeTab(value) {
  if (value === TAB_EVOLUCAO || value === 'evolution') return TAB_EVOLUCAO;
  return TAB_APRENDIZADOS;
}

export default function ClientLearningsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const clientId = searchParams.get('clientId');
  const serviceId = searchParams.get('serviceId');
  const activeTab = normalizeTab(searchParams.get('tab'));

  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState(null);
  const [learningCreateOpen, setLearningCreateOpen] = useState(false);
  const [evolutionCreateOpen, setEvolutionCreateOpen] = useState(false);
  const [learningCount, setLearningCount] = useState(0);
  const [evolutionCount, setEvolutionCount] = useState(0);

  const loadClient = useCallback(async () => {
    if (!clientId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const clientData = await Client.get(clientId);
      setClient(clientData);
    } catch (error) {
      console.error('Erro ao carregar cliente:', error);
      toast.error('Erro ao carregar dados do cliente');
      setClient(null);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadClient();
  }, [loadClient]);

  const handleTabChange = (nextTab) => {
    const tab = normalizeTab(nextTab);
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    if (clientId) next.set('clientId', clientId);
    if (serviceId) next.set('serviceId', serviceId);
    setSearchParams(next, { replace: true });
  };

  if (loading) {
    return <LoadingState message="Carregando..." />;
  }

  if (!clientId || !client) {
    return (
      <EmptyState
        icon="usuarios"
        title="Cliente não encontrado"
        description="O cliente solicitado não existe."
        primaryAction={{
          label: 'Voltar aos Clientes',
          onClick: () => {
            navigate(createPageUrl('clients'));
          },
        }}
      />
    );
  }

  const subtitle =
    activeTab === TAB_EVOLUCAO
      ? `${evolutionCount} evento${evolutionCount === 1 ? '' : 's'}`
      : `${learningCount} registro${learningCount === 1 ? '' : 's'}`;

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 -ml-1.5"
            onClick={() =>
              navigate(createPageUrl('client-detail') + `?clientId=${clientId}`)
            }
            aria-label="Voltar ao cliente"
          >
            <ArrowLeft className="w-4 h-4 text-[#7A7595]" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-[#18162A] leading-tight">
              Aprendizados
            </h1>
            <p className="text-xs text-[#7A7595]">{subtitle}</p>
          </div>
        </div>

        {activeTab === TAB_EVOLUCAO ? (
          <Button size="sm" onClick={() => setEvolutionCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Registrar
          </Button>
        ) : (
          <Button size="sm" onClick={() => setLearningCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Novo Aprendizado
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList>
          <TabsTrigger value={TAB_APRENDIZADOS}>Aprendizados</TabsTrigger>
          <TabsTrigger value={TAB_EVOLUCAO}>Evolução</TabsTrigger>
        </TabsList>

        <TabsContent value={TAB_APRENDIZADOS} className="mt-0">
          <ClientLearningsPanel
            clientId={clientId}
            client={client}
            createOpen={learningCreateOpen}
            onCreateOpenChange={setLearningCreateOpen}
            onCountChange={setLearningCount}
          />
        </TabsContent>

        <TabsContent value={TAB_EVOLUCAO} className="mt-0">
          <ClientEvolutionPanel
            clientId={clientId}
            serviceId={serviceId}
            client={client}
            createOpen={evolutionCreateOpen}
            onCreateOpenChange={setEvolutionCreateOpen}
            onCountChange={setEvolutionCount}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
