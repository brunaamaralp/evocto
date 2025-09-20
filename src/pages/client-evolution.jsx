import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { EvolutionEvent } from '@/api/entities';
import { Client } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, Calendar, ArrowLeft, Eye,
  CheckCircle, AlertTriangle, Users, Target
} from 'lucide-react';
import LoadingState from '@/components/shared/LoadingState';
import EmptyState from '@/components/shared/EmptyState';
import TimelineView from '@/components/evolution/TimelineView';
import MetricsView from '@/components/evolution/MetricsView';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

export default function ClientEvolutionPage() {
  const { user, agencyId } = useSession();
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

  const getImpactColor = (impact) => {
    switch (impact) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'plan_approved': return <CheckCircle className="w-4 h-4" />;
      case 'learning_applied': return <TrendingUp className="w-4 h-4" />;
      case 'milestone_achieved': return <Target className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => window.location.href = createPageUrl('client-detail') + `?clientId=${clientId}`}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">
              Evolução - {client.name}
            </h1>
            <p className="text-gray-600">
              Timeline de transformações e marcos importantes
            </p>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{evolutionEvents.length}</p>
                  <p className="text-sm text-gray-600">Total de Eventos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {evolutionEvents.filter(e => e.impact === 'high').length}
                  </p>
                  <p className="text-sm text-gray-600">Alto Impacto</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {evolutionEvents.filter(e => e.type === 'milestone_achieved').length}
                  </p>
                  <p className="text-sm text-gray-600">Marcos Alcançados</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {evolutionEvents.filter(e => e.type === 'learning_applied').length}
                  </p>
                  <p className="text-sm text-gray-600">Aprendizados Aplicados</p>
                </div>
              </div>
            </CardContent>
          </Card>
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
    </div>
  );
}