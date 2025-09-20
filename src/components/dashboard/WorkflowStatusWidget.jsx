import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  User,
  FileText,
  BarChart3,
  PlayCircle,
  Target,
  Trophy,
  Loader2
} from 'lucide-react';
import { workflowOrchestrator } from '@/api/functions';

const PHASE_CONFIG = {
  client_created: {
    icon: User,
    label: 'Cliente Criado',
    description: 'Cliente foi cadastrado no sistema',
    color: 'bg-blue-500'
  },
  service_selected: {
    icon: Target,
    label: 'Serviço Selecionado',
    description: 'Template de serviço foi configurado',
    color: 'bg-purple-500'
  },
  briefing_sent: {
    icon: FileText,
    label: 'Briefing Enviado',
    description: 'Link do briefing foi enviado ao cliente',
    color: 'bg-orange-500'
  },
  briefing_completed: {
    icon: CheckCircle2,
    label: 'Briefing Concluído',
    description: 'Cliente preencheu o briefing inicial',
    color: 'bg-green-500'
  },
  kpis_configured: {
    icon: BarChart3,
    label: 'KPIs Configurados',
    description: 'Indicadores foram definidos e configurados',
    color: 'bg-indigo-500'
  },
  execution_started: {
    icon: PlayCircle,
    label: 'Execução Iniciada',
    description: 'Projeto foi iniciado com tarefas ativas',
    color: 'bg-cyan-500'
  },
  deliverable_completed: {
    icon: Trophy,
    label: 'Entregáveis Concluídos',
    description: 'Fases do projeto foram finalizadas',
    color: 'bg-emerald-500'
  },
  project_completed: {
    icon: Trophy,
    label: 'Projeto Finalizado',
    description: 'Projeto foi concluído com sucesso',
    color: 'bg-yellow-500'
  }
};

const PHASE_ORDER = [
  'client_created',
  'service_selected', 
  'briefing_sent',
  'briefing_completed',
  'kpis_configured',
  'execution_started',
  'deliverable_completed',
  'project_completed'
];

export default function WorkflowStatusWidget({ clientId, compact = false }) {
  const [workflowStatus, setWorkflowStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  const loadWorkflowStatus = useCallback(async () => {
    if (!clientId) return;

    try {
      setLoading(true);
      setError('');

      const result = await workflowOrchestrator({
        action: 'get_workflow_status',
        entityType: 'Client',
        entityId: clientId
      });

      if (result.data?.success) {
        setWorkflowStatus(result.data.workflow);
      } else {
        setError('Erro ao carregar status do workflow');
      }
    } catch (error) {
      console.error('Erro ao buscar workflow:', error);
      setError(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  const processNextTransition = useCallback(async () => {
    if (!workflowStatus?.currentPhase) return;

    try {
      setProcessing(true);
      setError('');

      const result = await workflowOrchestrator({
        action: 'process_transition',
        entityType: 'Client',
        entityId: clientId,
        currentPhase: workflowStatus.currentPhase,
        triggerData: {
          agencyId: 'current', // Seria passado pelo contexto
          manualTrigger: true
        }
      });

      if (result.data?.success) {
        // Recarregar status após transição
        await loadWorkflowStatus();
      } else {
        setError('Erro ao processar transição');
      }
    } catch (error) {
      console.error('Erro ao processar transição:', error);
      setError(`Erro na transição: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  }, [workflowStatus?.currentPhase, clientId, loadWorkflowStatus]);

  useEffect(() => {
    loadWorkflowStatus();
  }, [loadWorkflowStatus]);

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>Carregando workflow...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!workflowStatus) {
    return null;
  }

  const currentPhaseIndex = PHASE_ORDER.indexOf(workflowStatus.currentPhase);
  const progressPercentage = ((currentPhaseIndex + 1) / PHASE_ORDER.length) * 100;

  if (compact) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Status do Projeto</h3>
            <Badge variant="outline" className="text-xs">
              {Math.round(progressPercentage)}%
            </Badge>
          </div>
          
          <Progress value={progressPercentage} className="mb-3" />
          
          <div className="flex items-center gap-2 text-sm">
            {React.createElement(PHASE_CONFIG[workflowStatus.currentPhase]?.icon || Clock, {
              className: "w-4 h-4 text-blue-600"
            })}
            <span className="font-medium">
              {PHASE_CONFIG[workflowStatus.currentPhase]?.label || 'Fase Desconhecida'}
            </span>
          </div>
          
          {workflowStatus.blockers?.length > 0 && (
            <div className="mt-2">
              <Badge variant="destructive" className="text-xs">
                {workflowStatus.blockers.length} pendência(s)
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Fluxo do Projeto</span>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{Math.round(progressPercentage)}% Completo</Badge>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={loadWorkflowStatus}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress value={progressPercentage} className="h-2" />
          <div className="flex justify-between text-xs text-gray-600">
            <span>Início</span>
            <span>Finalização</span>
          </div>
        </div>

        {/* Current Phase */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-full ${PHASE_CONFIG[workflowStatus.currentPhase]?.color || 'bg-gray-500'} text-white`}>
              {React.createElement(PHASE_CONFIG[workflowStatus.currentPhase]?.icon || Clock, {
                className: "w-4 h-4"
              })}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">
                {PHASE_CONFIG[workflowStatus.currentPhase]?.label || 'Fase Desconhecida'}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {PHASE_CONFIG[workflowStatus.currentPhase]?.description || 'Processando...'}
              </p>
            </div>
          </div>
        </div>

        {/* Next Actions */}
        {workflowStatus.nextActions && workflowStatus.nextActions.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Próximas Ações:</h4>
            <div className="space-y-2">
              {workflowStatus.nextActions.map((action, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                  <ArrowRight className="w-3 h-3" />
                  <span>{action}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Blockers */}
        {workflowStatus.blockers && workflowStatus.blockers.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium mb-1">Pendências que impedem o avanço:</div>
              <ul className="list-disc list-inside space-y-1">
                {workflowStatus.blockers.map((blocker, index) => (
                  <li key={index} className="text-sm">{blocker}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Action Button */}
        {workflowStatus.nextActions && workflowStatus.nextActions.length > 0 && (
          <Button 
            onClick={processNextTransition}
            disabled={processing || workflowStatus.blockers?.length > 0}
            className="w-full"
          >
            {processing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <PlayCircle className="w-4 h-4 mr-2" />
            )}
            {processing ? 'Processando...' : 'Avançar Fluxo'}
          </Button>
        )}

        {/* Phase Timeline */}
        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-900 mb-3">Cronograma das Fases:</h4>
          <div className="space-y-2">
            {PHASE_ORDER.map((phase, index) => {
              const isCompleted = index < currentPhaseIndex;
              const isCurrent = index === currentPhaseIndex;
              const phaseConfig = PHASE_CONFIG[phase];
              
              return (
                <div 
                  key={phase}
                  className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                    isCurrent ? 'bg-blue-50 border border-blue-200' : 
                    isCompleted ? 'bg-green-50' : 'bg-gray-50'
                  }`}
                >
                  <div className={`p-1 rounded-full ${
                    isCompleted ? 'bg-green-500 text-white' :
                    isCurrent ? phaseConfig?.color + ' text-white' : 'bg-gray-300 text-gray-600'
                  }`}>
                    {React.createElement(
                      isCompleted ? CheckCircle2 : phaseConfig?.icon || Clock,
                      { className: "w-3 h-3" }
                    )}
                  </div>
                  <div className="flex-1">
                    <span className={`text-sm font-medium ${
                      isCurrent ? 'text-blue-900' : 
                      isCompleted ? 'text-green-900' : 'text-gray-600'
                    }`}>
                      {phaseConfig?.label || phase}
                    </span>
                  </div>
                  {isCurrent && (
                    <Badge size="sm" className="bg-blue-600">Atual</Badge>
                  )}
                  {isCompleted && (
                    <Badge size="sm" variant="secondary" className="bg-green-100 text-green-800">
                      Concluído
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}