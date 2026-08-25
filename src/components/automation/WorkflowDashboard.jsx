import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Play, Pause, RefreshCw, Settings, AlertTriangle,
  CheckCircle, Clock, Zap, BarChart3, Users,
  FileText, Target, ArrowRight, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import LoadingState from '@/components/shared/LoadingStates';
import { workflowAutomation } from '@/api/functions';

// Componente para Card de Workflow
const WorkflowCard = ({ workflow, onAction }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'in_progress': return <Clock className="w-4 h-4" />;
      case 'failed': return <AlertTriangle className="w-4 h-4" />;
      case 'pending': return <Play className="w-4 h-4" />;
      default: return <RefreshCw className="w-4 h-4" />;
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{workflow.clientName}</h3>
            <p className="text-sm text-gray-600">{workflow.workflowType}</p>
          </div>
          <Badge className={getStatusColor(workflow.status)}>
            {getStatusIcon(workflow.status)}
            <span className="ml-1">{workflow.status}</span>
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Progresso</span>
            <span className="font-medium">{workflow.progress}%</span>
          </div>
          <Progress value={workflow.progress} className="h-2" />
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="text-xs text-gray-500">
            Atualizado há {workflow.lastUpdate}
          </div>
          <div className="flex gap-1">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onAction('view', workflow)}
            >
              <Eye className="w-3 h-3" />
            </Button>
            {workflow.status === 'pending' && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onAction('start', workflow)}
              >
                <Play className="w-3 h-3" />
              </Button>
            )}
            {workflow.status === 'failed' && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onAction('retry', workflow)}
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        {workflow.currentStep && (
          <div className="mt-3 p-2 bg-blue-50 rounded text-xs">
            <span className="text-blue-700 font-medium">Próximo passo:</span>
            <span className="text-blue-600 ml-1">{workflow.currentStep}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Componente para Estatísticas de Automação
const AutomationStats = ({ stats }) => (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center">
          <Zap className="h-8 w-8 text-blue-600" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Workflows Ativos</p>
            <p className="text-2xl font-bold text-gray-900">{stats.activeWorkflows}</p>
          </div>
        </div>
      </CardContent>
    </Card>
    
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center">
          <CheckCircle className="h-8 w-8 text-green-600" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Concluídos (Mês)</p>
            <p className="text-2xl font-bold text-gray-900">{stats.completedThisMonth}</p>
          </div>
        </div>
      </CardContent>
    </Card>
    
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center">
          <Clock className="h-8 w-8 text-yellow-600" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Tempo Médio</p>
            <p className="text-2xl font-bold text-gray-900">{stats.avgCompletionTime}</p>
          </div>
        </div>
      </CardContent>
    </Card>
    
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center">
          <Target className="h-8 w-8 text-purple-600" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Taxa de Sucesso</p>
            <p className="text-2xl font-bold text-gray-900">{stats.successRate}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

// Componente Principal
export default function WorkflowDashboard() {
  const { user } = useSession();
  const [loading, setLoading] = useState(true);
  const [workflows, setWorkflows] = useState([]);
  const [stats, setStats] = useState({
    activeWorkflows: 0,
    completedThisMonth: 0,
    avgCompletionTime: '0h',
    successRate: 0
  });

  const loadData = useCallback(async () => {
    if (!user?.agencyId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Por enquanto usando dados mock - em produção buscaria da API
      const mockWorkflows = [
        {
          id: 'wf_001',
          clientName: 'Inovatech Soluções Ltda',
          workflowType: 'Diagnóstico Completo → Plano → Execução',
          status: 'in_progress',
          progress: 75,
          lastUpdate: '2 horas',
          currentStep: 'Aguardando aprovação do plano pelo cliente'
        },
        {
          id: 'wf_002', 
          clientName: 'TechStart Inovação',
          workflowType: 'Geração de Relatório Automático',
          status: 'completed',
          progress: 100,
          lastUpdate: '1 dia',
          currentStep: null
        },
        {
          id: 'wf_003',
          clientName: 'Crescer Negócios LTDA',
          workflowType: 'Diagnóstico → Análise IA → Recommendations',
          status: 'pending',
          progress: 0,
          lastUpdate: '3 horas',
          currentStep: 'Aguardando preenchimento do diagnóstico'
        }
      ];

      const mockStats = {
        activeWorkflows: 8,
        completedThisMonth: 12,
        avgCompletionTime: '3.2h',
        successRate: 94
      };

      setWorkflows(mockWorkflows);
      setStats(mockStats);
      
    } catch (error) {
      console.error('Erro ao carregar dados de automação:', error);
      toast.error('Erro ao carregar dashboard de automação');
    } finally {
      setLoading(false);
    }
  }, [user?.agencyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleWorkflowAction = async (action, workflow) => {
    try {
      switch (action) {
        case 'start':
          toast.info(`Iniciando workflow para ${workflow.clientName}...`);
          // Aqui chamaria a API de automação
          break;
        case 'retry':
          toast.info(`Reexecutando workflow para ${workflow.clientName}...`);
          // Aqui chamaria a API para retry
          break;
        case 'view':
          toast.info(`Visualizando detalhes do workflow...`);
          // Aqui abriria modal ou navegaria para detalhes
          break;
        default:
          console.warn(`Ação não implementada: ${action}`);
      }
    } catch (error) {
      toast.error(`Erro ao executar ação: ${error.message}`);
    }
  };

  if (loading) {
    return <LoadingState message="Carregando dashboard de automação..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Dashboard de Automação
              </h1>
              <p className="text-gray-600">
                Monitore e controle todos os processos automatizados da agência
              </p>
            </div>
            <Button onClick={() => toast.info('Configurações em desenvolvimento')}>
              <Settings className="w-4 h-4 mr-2" />
              Configurações
            </Button>
          </div>
        </div>

        {/* Estatísticas */}
        <AutomationStats stats={stats} />

        {/* Workflows Ativos */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Workflows em Execução</h2>
            <Button variant="outline" onClick={loadData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </div>
          
          {workflows.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workflows.map(workflow => (
                <WorkflowCard
                  key={workflow.id}
                  workflow={workflow}
                  onAction={handleWorkflowAction}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Zap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="font-medium text-gray-900 mb-2">Nenhum workflow ativo</h3>
                <p className="text-gray-600">Os workflows aparecerão aqui quando houver processos em execução.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Fluxo de Processo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-600" />
              Fluxo de Processo Padrão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="bg-blue-100 p-2 rounded-full">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Diagnóstico</h4>
                  <p className="text-sm text-gray-600">Cliente preenche formulário</p>
                </div>
              </div>
              
              <ArrowRight className="w-5 h-5 text-gray-400" />
              
              <div className="flex items-center gap-4">
                <div className="bg-green-100 p-2 rounded-full">
                  <BarChart3 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Análise IA</h4>
                  <p className="text-sm text-gray-600">Processamento automático</p>
                </div>
              </div>
              
              <ArrowRight className="w-5 h-5 text-gray-400" />
              
              <div className="flex items-center gap-4">
                <div className="bg-purple-100 p-2 rounded-full">
                  <Target className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Plano de Ação</h4>
                  <p className="text-sm text-gray-600">Geração automática</p>
                </div>
              </div>
              
              <ArrowRight className="w-5 h-5 text-gray-400" />
              
              <div className="flex items-center gap-4">
                <div className="bg-yellow-100 p-2 rounded-full">
                  <Users className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Execução</h4>
                  <p className="text-sm text-gray-600">Tarefas e acompanhamento</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}