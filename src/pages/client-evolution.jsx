import { useState, useEffect } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { EvolutionEvent } from '@/api/entities';
import { Client } from '@/api/entities';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, Calendar, ArrowLeft,
  CheckCircle, Users, Target
} from 'lucide-react';
import LoadingState from '@/components/shared/LoadingState';
import EmptyState from '@/components/shared/EmptyState';
import TimelineView from '@/components/evolution/TimelineView';
import MetricsView from '@/components/evolution/MetricsView';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { getCardPastel } from '@/lib/modulePastels';

export default function ClientEvolutionPage() {
  const { _user, agencyId } = useSession();
  const urlParams = new URLSearchParams(window.location.search);
  const clientId = urlParams.get('clientId');
  
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState(null);
  const [evolutionEvents, setEvolutionEvents] = useState([]);
  const [viewMode, setViewMode] = useState('timeline'); // 'timeline' | 'metrics'

  useEffect(() => {
    const loadData = async () => {
      if (!clientId || !agencyId) return;

      try {
        setLoading(true);
        
        const [clientData, eventsData] = await Promise.all([
          Client.get(clientId),
          EvolutionEvent.filter({ agencyId, clientId }, '-date')
        ]);

        setClient(clientData);
        setEvolutionEvents(eventsData || []);
        
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast.error('Erro ao carregar evolução do cliente');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [clientId, agencyId]);

  if (loading) {
    return <LoadingState message="Carregando evolução do cliente..." />;
  }

  if (!client) {
    return (
      <EmptyState
        icon="usuarios"
        title="Cliente não encontrado"
        description="O cliente solicitado não existe."
        primaryAction={{
          label: 'Voltar aos Clientes',
          onClick: () => window.location.href = createPageUrl('clients')
        }}
      />
    );
  }

  const _getImpactColor = (impact) => {
    switch (impact) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const _getTypeIcon = (type) => {
    switch (type) {
      case 'plan_approved': return <CheckCircle className="w-4 h-4" />;
      case 'learning_applied': return <TrendingUp className="w-4 h-4" />;
      case 'milestone_achieved': return <Target className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 -ml-1.5"
              onClick={() =>
                (window.location.href =
                  createPageUrl('client-detail') + `?clientId=${clientId}`)
              }
              aria-label="Voltar ao cliente"
            >
              <ArrowLeft className="w-4 h-4 text-[#7A7595]" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-[#18162A] leading-tight">
                Evolução
              </h1>
              <p className="text-xs text-[#7A7595]">
                {evolutionEvents.length} evento
                {evolutionEvents.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'timeline' ? 'default' : 'outline'}
              onClick={() => setViewMode('timeline')}
              size="sm"
            >
              Timeline
            </Button>
            <Button
              variant={viewMode === 'metrics' ? 'default' : 'outline'}
              onClick={() => setViewMode('metrics')}
              size="sm"
            >
              Métricas
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { icon: Calendar, label: 'Total de Eventos', value: evolutionEvents.length, idx: 1 },
            { icon: TrendingUp, label: 'Alto Impacto', value: evolutionEvents.filter(e => e.impact === 'high').length, idx: 4 },
            { icon: CheckCircle, label: 'Marcos Alcançados', value: evolutionEvents.filter(e => e.type === 'milestone_achieved').length, idx: 2 },
            { icon: Users, label: 'Aprendizados Aplicados', value: evolutionEvents.filter(e => e.type === 'learning_applied').length, idx: 3 },
          ].map(({ icon: Icon, label, value, idx }) => {
            const pastel = getCardPastel(idx);
            return (
              <Card key={label} className={`rounded-2xl border-transparent shadow-sm ${pastel.bg}`}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${pastel.tag}`}>
                      <Icon className={`w-5 h-5 ${pastel.text}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-[#18162A]">{value}</p>
                      <p className="text-sm text-[#7A7595]">{label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Content */}
        {evolutionEvents.length === 0 ? (
          <EmptyState
            icon="usuarios"
            title="Nenhuma evolução registrada"
            description="Este cliente ainda não possui eventos de evolução registrados."
          />
        ) : (
          <div className="space-y-6">
            {viewMode === 'timeline' ? (
              <TimelineView 
                events={evolutionEvents} 
                client={client}
              />
            ) : (
              <MetricsView 
                events={evolutionEvents} 
                client={client}
              />
            )}
          </div>
        )}
    </div>
  );
}