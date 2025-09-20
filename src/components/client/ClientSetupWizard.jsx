
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  Circle, 
  ArrowRight, 
  FileText, 
  Target, 
  Zap, 
  Users,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { Service } from '@/api/entities';
import { Task } from '@/api/entities';
import { FinancialKPI } from '@/api/entities';
import KPIDashboard from '@/components/dashboard/KPIDashboard';

const SETUP_STEPS = [
  {
    id: 'briefing',
    title: 'Briefing Inicial',
    description: 'Cliente preenche questionário detalhado',
    icon: FileText,
    required: true
  },
  {
    id: 'kpi_setup', 
    title: 'Configuração de KPIs',
    description: 'Definir indicadores de performance',
    icon: Target,
    required: true
  },
  {
    id: 'team_setup',
    title: 'Configuração da Equipe',
    description: 'Atribuir responsáveis e permissões',
    icon: Users,
    required: false
  },
  {
    id: 'service_activation',
    title: 'Ativação do Serviço',
    description: 'Iniciar execução dos entregáveis',
    icon: Zap,
    required: true
  }
];

export default function ClientSetupWizard({ clientId, serviceId, onComplete }) {
  const [service, setService] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [kpis, setKpis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const loadServiceData = useCallback(async () => {
    if (!serviceId) return;
    
    try {
      setLoading(true);
      
      const [serviceData, serviceTasks, serviceKPIs] = await Promise.all([
        Service.get(serviceId),
        Task.filter({ serviceId, clientId }),
        FinancialKPI.filter({ serviceId, clientId, is_current: true })
      ]);

      setService(serviceData);
      setTasks(serviceTasks);
      setKpis(serviceKPIs);
      
      // Determinar step atual baseado no workflow
      const phase = serviceData.workflow_state?.current_phase;
      const stepIndex = getStepIndexFromPhase(phase);
      setCurrentStep(stepIndex);

    } catch (error) {
      console.error('Erro ao carregar dados do serviço:', error);
    } finally {
      setLoading(false);
    }
  }, [serviceId, clientId]);

  useEffect(() => {
    loadServiceData();
  }, [loadServiceData]);

  const getStepIndexFromPhase = (phase) => {
    const phaseMapping = {
      'setup': 0,
      'briefing': 0,
      'kpi_configuration': 1,
      'execution': 3
    };
    return phaseMapping[phase] || 0;
  };

  const getStepStatus = (stepId) => {
    switch (stepId) {
      case 'briefing':
        const briefingTask = tasks.find(t => t.type === 'briefing');
        return briefingTask?.status === 'completed' ? 'completed' : 'pending';
      
      case 'kpi_setup':
        return kpis.length > 0 ? 'completed' : 'pending';
      
      case 'team_setup':
        return service?.instance_metadata?.team_configured ? 'completed' : 'optional';
      
      case 'service_activation':
        return service?.service_status === 'in_execution' ? 'completed' : 'pending';
      
      default:
        return 'pending';
    }
  };

  const handleStepAction = async (stepId) => {
    setProcessing(true);
    
    try {
      switch (stepId) {
        case 'briefing':
          // Gerar token de briefing se não existir
          await generateBriefingToken();
          break;
          
        case 'kpi_setup':
          // Navegar para configuração de KPIs
          window.location.href = `/financial-kpis?clientId=${clientId}&serviceId=${serviceId}`;
          break;
          
        case 'service_activation':
          // Ativar serviço via workflow
          await activateService();
          break;
      }
      
      await loadServiceData();
    } catch (error) {
      console.error('Erro na ação:', error);
    } finally {
      setProcessing(false);
    }
  };

  const generateBriefingToken = async () => {
    try {
      const { generatePublicBriefingToken } = await import('@/api/functions');
      const result = await generatePublicBriefingToken({
        clientId,
        serviceId,
        language: 'pt',
        expiryDays: 30
      });
      
      console.log('Token de briefing gerado:', result.data?.token?.publicUrl);
      
      // Aqui você pode mostrar o link para o cliente
      if (result.data?.token?.publicUrl) {
        const message = `Link do briefing gerado:\n${result.data.token.publicUrl}`;
        navigator.clipboard.writeText(result.data.token.publicUrl);
        alert(message + '\n\n(Link copiado para a área de transferência)');
      }
    } catch (error) {
      console.error('Erro ao gerar token de briefing:', error);
    }
  };

  const activateService = async () => {
    try {
      const { workflowEngine } = await import('@/api/functions');
      const result = await workflowEngine({
        action: 'process_transition',
        serviceId,
        trigger: 'manual_activation'
      });
      
      console.log('Serviço ativado:', result);
      
      if (result.data?.success) {
        onComplete && onComplete();
      }
    } catch (error) {
      console.error('Erro ao ativar serviço:', error);
    }
  };

  const completedSteps = SETUP_STEPS.filter(step => getStepStatus(step.id) === 'completed').length;
  const totalSteps = SETUP_STEPS.filter(step => step.required).length;
  const progress = (completedSteps / totalSteps) * 100;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Carregando configuração...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho com progresso */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Configuração do Projeto</CardTitle>
              <p className="text-muted-foreground mt-1">
                Configure seu projeto em {totalSteps} etapas simples
              </p>
            </div>
            <Badge variant={progress === 100 ? "default" : "secondary"}>
              {completedSteps}/{totalSteps} concluídas
            </Badge>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>Progresso</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>
      </Card>

      {/* Steps */}
      <div className="space-y-4">
        {SETUP_STEPS.map((step, index) => {
          const status = getStepStatus(step.id);
          const isCompleted = status === 'completed';
          const isPending = status === 'pending';
          const isOptional = status === 'optional';
          const IconComponent = step.icon;
          
          return (
            <Card key={step.id} className={`transition-all ${
              isCompleted ? 'border-green-200 bg-green-50' : 
              isPending ? 'border-amber-200 bg-amber-50' :
              'border-gray-200'
            }`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${
                      isCompleted ? 'bg-green-500 text-white' :
                      isPending ? 'bg-amber-500 text-white' :
                      'bg-gray-200 text-gray-600'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <IconComponent className="w-5 h-5" />
                      )}
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{step.title}</h3>
                        {step.required ? (
                          <Badge variant="outline" className="text-xs">Obrigatório</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Opcional</Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground text-sm">{step.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isCompleted && (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        ✓ Concluído
                      </Badge>
                    )}
                    
                    {isPending && (
                      <Button 
                        onClick={() => handleStepAction(step.id)}
                        disabled={processing}
                        size="sm"
                      >
                        {processing ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <ArrowRight className="w-4 h-4 mr-2" />
                        )}
                        {getActionLabel(step.id)}
                      </Button>
                    )}
                    
                    {isOptional && (
                      <Button 
                        variant="outline" 
                        onClick={() => handleStepAction(step.id)}
                        size="sm"
                      >
                        Configurar
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dashboard de KPIs se estiver configurado */}
      {kpis.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>KPIs Configurados</CardTitle>
          </CardHeader>
          <CardContent>
            <KPIDashboard clientId={clientId} serviceId={serviceId} />
          </CardContent>
        </Card>
      )}

      {/* Estado completo */}
      {progress === 100 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="flex items-center gap-3 p-6">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
            <div>
              <h3 className="font-semibold text-green-900">Projeto Configurado!</h3>
              <p className="text-green-700">
                Todas as configurações foram concluídas. O projeto está pronto para execução.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function getActionLabel(stepId) {
  const labels = {
    briefing: 'Enviar Briefing',
    kpi_setup: 'Configurar KPIs',
    team_setup: 'Configurar Equipe',
    service_activation: 'Ativar Serviço'
  };
  return labels[stepId] || 'Configurar';
}
