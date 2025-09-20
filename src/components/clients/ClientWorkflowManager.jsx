import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  PlayCircle,
  StopCircle,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Settings
} from 'lucide-react';
import { workflowOrchestrator } from '@/api/functions';
import WorkflowStatusWidget from '@/components/dashboard/WorkflowStatusWidget';

export default function ClientWorkflowManager({ client, onWorkflowUpdate }) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [lastAction, setLastAction] = useState(null);

  const processTransition = useCallback(async (phase, forceTransition = false) => {
    if (!client?.id) return;

    try {
      setProcessing(true);
      setError('');

      const result = await workflowOrchestrator({
        action: 'process_transition',
        entityType: 'Client',
        entityId: client.id,
        currentPhase: phase,
        triggerData: {
          agencyId: client.agencyId,
          clientName: client.name,
          manualTrigger: true
        },
        forceTransition
      });

      if (result.data?.success) {
        setLastAction({
          phase,
          timestamp: new Date().toISOString(),
          transition: result.data.transition
        });
        
        onWorkflowUpdate && onWorkflowUpdate(result.data.transition);
      } else {
        setError(`Erro na transição: ${result.data?.error || 'Erro desconhecido'}`);
      }

    } catch (error) {
      console.error('Erro ao processar transição:', error);
      setError(`Erro: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  }, [client?.id, client?.agencyId, client?.name, onWorkflowUpdate]);

  const retryFailedActions = useCallback(async () => {
    if (!client?.id) return;

    try {
      setProcessing(true);
      setError('');

      const result = await workflowOrchestrator({
        action: 'retry_failed_actions',
        entityType: 'Client',
        entityId: client.id
      });

      if (result.data?.success) {
        setLastAction({
          action: 'retry',
          timestamp: new Date().toISOString(),
          retriedActions: result.data.retriedActions
        });
      }

    } catch (error) {
      console.error('Erro ao tentar novamente:', error);
      setError(`Erro no retry: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  }, [client?.id]);

  // Ações rápidas baseadas no status do cliente
  const getQuickActions = () => {
    const actions = [];

    // Sempre disponível: iniciar onboarding
    actions.push({
      id: 'start_onboarding',
      label: 'Iniciar Onboarding',
      phase: 'client_created',
      icon: PlayCircle,
      variant: 'default',
      description: 'Iniciar o fluxo de onboarding do cliente'
    });

    // Se já tem serviço: enviar briefing
    actions.push({
      id: 'send_briefing',
      label: 'Enviar Briefing',
      phase: 'service_selected', 
      icon: Clock,
      variant: 'outline',
      description: 'Gerar e enviar link do briefing ao cliente'
    });

    // Configurar KPIs
    actions.push({
      id: 'setup_kpis',
      label: 'Configurar KPIs',
      phase: 'briefing_completed',
      icon: Settings,
      variant: 'outline',
      description: 'Configurar indicadores baseados no template'
    });

    // Iniciar execução
    actions.push({
      id: 'start_execution',
      label: 'Iniciar Execução',
      phase: 'kpis_configured',
      icon: PlayCircle,
      variant: 'default',
      description: 'Ativar o serviço e gerar tarefas'
    });

    return actions;
  };

  return (
    <div className="space-y-6">
      {/* Status Widget */}
      <WorkflowStatusWidget clientId={client?.id} />

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Ações do Workflow
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {getQuickActions().map((action) => (
              <Card key={action.id} className="border-dashed hover:border-solid transition-all cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <action.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-sm">{action.label}</h3>
                      <p className="text-xs text-gray-600 mt-1">{action.description}</p>
                      <Button
                        size="sm"
                        variant={action.variant}
                        onClick={() => processTransition(action.phase)}
                        disabled={processing}
                        className="mt-3 w-full"
                      >
                        {processing ? (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                          <action.icon className="w-3 h-3 mr-1" />
                        )}
                        {processing ? 'Processando...' : 'Executar'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Advanced Actions */}
          <div className="border-t pt-4">
            <h4 className="font-medium text-sm mb-3">Ações Avançadas</h4>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={retryFailedActions}
                disabled={processing}
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Tentar Ações Falhadas
              </Button>
            </div>
          </div>

          {/* Last Action Summary */}
          {lastAction && (
            <div className="border-t pt-4">
              <h4 className="font-medium text-sm mb-2">Última Ação:</h4>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium">
                    {lastAction.transition ? 
                      `Transição: ${lastAction.transition.previousPhase} → ${lastAction.transition.nextPhase}` :
                      'Ações reprocessadas'
                    }
                  </span>
                  <Badge size="sm" variant="secondary">
                    {new Date(lastAction.timestamp).toLocaleTimeString()}
                  </Badge>
                </div>
                
                {lastAction.transition && (
                  <div className="text-xs text-gray-600 space-y-1">
                    {lastAction.transition.actionsExecuted?.length > 0 && (
                      <div>
                        <strong>Ações:</strong> {lastAction.transition.actionsExecuted.map(a => a.action).join(', ')}
                      </div>
                    )}
                    {lastAction.transition.notificationsSent?.length > 0 && (
                      <div>
                        <strong>Notificações:</strong> {lastAction.transition.notificationsSent.length} enviada(s)
                      </div>
                    )}
                    <div>
                      <strong>Duração:</strong> {lastAction.transition.duration}ms
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}