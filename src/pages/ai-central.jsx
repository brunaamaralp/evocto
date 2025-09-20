
import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { useT } from '@/components/i18n/I18nProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, Zap, TrendingUp, AlertCircle, CheckCircle, Clock,
  Settings, Activity, BarChart3, Lightbulb, Target, RefreshCw,
  Play, Pause, Eye, MoreVertical, Plus, Search, Filter, AlertTriangle
} from 'lucide-react';
import { SmartRecommendation } from '@/api/entities';
import { AgentExecution } from '@/api/entities';
import { Job } from '@/api/entities';
import EmptyState from '@/components/shared/EmptyState';
import StatusBadge from '@/components/shared/StatusBadge';
import LoadingState from '@/components/shared/LoadingState';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import AgentRunPanel from "@/components/agents/AgentRunPanel";

const RecommendationCard = ({ recommendation }) => {
  const getImpactColor = (impact) => {
    if (impact >= 80) return 'text-emerald-600 bg-emerald-100';
    if (impact >= 50) return 'text-amber-600 bg-amber-100';
    return 'text-red-600 bg-red-100';
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return 'text-blue-600';
    if (confidence >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <Card className="border-0 shadow-sm hover:shadow-lg transition-all duration-200 group">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-purple-100 text-purple-700 text-xs">
                {recommendation.type?.replace('_', ' ') || 'Estratégia'}
              </Badge>
              <StatusBadge status={recommendation.status} size="sm" />
            </div>
            
            <h3 className="font-semibold text-slate-900 group-hover:text-purple-600 transition-colors mb-2">
              {recommendation.title}
            </h3>
            
            <p className="text-sm text-slate-600 line-clamp-2 mb-3">
              {recommendation.summary}
            </p>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Eye className="w-4 h-4 mr-2" />
                Ver Detalhes
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CheckCircle className="w-4 h-4 mr-2" />
                Aplicar Recomendação
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="w-4 h-4 mr-2" />
                Configurar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Impacto Estimado</span>
            <Badge className={`${getImpactColor(recommendation.impact)} text-xs`}>
              +{recommendation.impact}%
            </Badge>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Confiança</span>
            <div className="flex items-center gap-2">
              <div className="w-12 h-1 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${getConfidenceColor(recommendation.confidence)} bg-current rounded-full transition-all`}
                  style={{ width: `${recommendation.confidence}%` }}
                />
              </div>
              <span className={`text-xs ${getConfidenceColor(recommendation.confidence)}`}>
                {recommendation.confidence}%
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Gerado em</span>
            <span className="text-xs text-slate-500">
              {new Date(recommendation.generatedAt).toLocaleDateString('pt-BR')}
            </span>
          </div>
        </div>

        {recommendation.basedOn && recommendation.basedOn.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-100">
            <p className="text-xs text-slate-500 mb-2">Baseado em:</p>
            <div className="flex flex-wrap gap-1">
              {recommendation.basedOn.slice(0, 3).map((source, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {source}
                </Badge>
              ))}
              {recommendation.basedOn.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{recommendation.basedOn.length - 3} mais
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const AgentExecutionCard = ({ execution }) => {
  const getStatusIcon = (status) => {
    const icons = {
      running: RefreshCw,
      completed: CheckCircle,
      failed: AlertCircle,
      cancelled: Pause
    };
    return icons[status] || Activity;
  };

  const StatusIcon = getStatusIcon(execution.status);

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              execution.status === 'running' ? 'bg-blue-100' :
              execution.status === 'completed' ? 'bg-emerald-100' :
              execution.status === 'failed' ? 'bg-red-100' : 'bg-slate-100'
            }`}>
              <StatusIcon className={`w-5 h-5 ${
                execution.status === 'running' ? 'text-blue-600 animate-spin' :
                execution.status === 'completed' ? 'text-emerald-600' :
                execution.status === 'failed' ? 'text-red-600' : 'text-slate-600'
              }`} />
            </div>
            <div>
              <h4 className="font-medium text-slate-900">{execution.agentName}</h4>
              <p className="text-sm text-slate-600">Execução #{execution.executionId.slice(0, 8)}</p>
            </div>
          </div>
          <StatusBadge status={execution.status} size="sm" />
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600">Iniciado:</span>
            <span className="text-slate-900">
              {new Date(execution.startedAt).toLocaleString('pt-BR')}
            </span>
          </div>
          
          {execution.completedAt && (
            <div className="flex justify-between">
              <span className="text-slate-600">Duração:</span>
              <span className="text-slate-900">
                {Math.round((new Date(execution.completedAt) - new Date(execution.startedAt)) / 1000)}s
              </span>
            </div>
          )}

          {execution.summary && (
            <div className="flex justify-between">
              <span className="text-slate-600">Ações:</span>
              <span className="text-slate-900">{execution.summary.total_entities_analyzed || 0}</span>
            </div>
          )}
        </div>

        {execution.risks_detected && execution.risks_detected.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-100">
            <p className="text-xs text-slate-600 mb-2">Riscos Detectados:</p>
            <div className="space-y-1">
              {execution.risks_detected.slice(0, 2).map((risk, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    risk.severity === 'critical' ? 'bg-red-500' :
                    risk.severity === 'high' ? 'bg-amber-500' :
                    risk.severity === 'medium' ? 'bg-blue-500' : 'bg-slate-400'
                  }`} />
                  <span className="text-xs text-slate-700">{risk.title}</span>
                </div>
              ))}
              {execution.risks_detected.length > 2 && (
                <p className="text-xs text-slate-500">+{execution.risks_detected.length - 2} mais</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

function AICentralPage() {
  const { agencyId } = useSession();
  const t = useT();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [activeTab, setActiveTab] = useState('recommendations');

  const loadData = useCallback(async () => {
    if (!agencyId) return;

    try {
      setLoading(true);
      setError(null);

      const [recommendationsData, executionsData, jobsData] = await Promise.all([
        SmartRecommendation.filter({ agencyId, status: 'active' }, '-generatedAt'),
        AgentExecution.filter({ agencyId }, '-startedAt', 10),
        Job.filter({ agencyId }, '-created_date', 10)
      ]);

      setRecommendations(recommendationsData || []);
      setExecutions(executionsData || []);
      setJobs(jobsData || []);

    } catch (err) {
      console.error('Erro ao carregar dados de IA:', err);
      setError('Não foi possível carregar os dados de IA');
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Estatísticas
  const stats = {
    activeRecommendations: recommendations.filter(r => r.status === 'active').length,
    appliedRecommendations: recommendations.filter(r => r.status === 'applied').length,
    runningAgents: executions.filter(e => e.status === 'running').length,
    completedJobs: jobs.filter(j => j.status === 'completed').length,
    failedJobs: jobs.filter(j => j.status === 'failed').length
  };

  if (loading) {
    return <LoadingState message="Carregando central de IA..." />;
  }

  if (error) {
    return (
      <ErrorBoundary>
        <div className="p-6">
          <EmptyState
            icon={AlertTriangle}
            title="Erro ao carregar central de IA"
            description={error}
            action={loadData}
            actionText="Tentar Novamente"
            variant="warning"
          />
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Central de IA</h1>
            <p className="text-slate-600 mt-1">
              Acompanhe recomendações inteligentes e automações da sua agência
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => window.location.href = '/ai-configuration'}
            >
              <Settings className="w-4 h-4 mr-2" />
              Configurar IA
            </Button>
            <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white">
              <Brain className="w-4 h-4 mr-2" />
              Gerar Recomendações
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700">Recomendações Ativas</p>
                  <p className="text-2xl font-bold text-purple-900">{stats.activeRecommendations}</p>
                </div>
                <Lightbulb className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-700">Aplicadas</p>
                  <p className="text-2xl font-bold text-emerald-900">{stats.appliedRecommendations}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">Agentes Ativos</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.runningAgents}</p>
                </div>
                <RefreshCw className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-700">Jobs Completos</p>
                  <p className="text-2xl font-bold text-amber-900">{stats.completedJobs}</p>
                </div>
                <Target className="w-8 h-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 to-red-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-700">Jobs com Erro</p>
                  <p className="text-2xl font-bold text-red-900">{stats.failedJobs}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-fit">
            <TabsTrigger value="recommendations" className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Recomendações ({stats.activeRecommendations})
            </TabsTrigger>
            <TabsTrigger value="agents" className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Agentes ({executions.length})
            </TabsTrigger>
            <TabsTrigger value="jobs" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Jobs ({jobs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recommendations">
            {recommendations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recommendations.map((recommendation) => (
                  <RecommendationCard key={recommendation.id} recommendation={recommendation} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Lightbulb}
                title="Nenhuma recomendação ativa"
                description="A IA ainda não gerou recomendações para sua agência. Execute uma análise para obter insights personalizados."
                action={() => {}}
                actionText="Gerar Recomendações"
                variant="info"
              />
            )}
          </TabsContent>

          <TabsContent value="agents">
            {/* Painel de execução imediata */}
            <AgentRunPanel onAfterRun={loadData} />
            {/* Lista de execuções */}
            {executions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                {executions.map((execution) => (
                  <AgentExecutionCard key={execution.id} execution={execution} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Brain}
                title="Nenhum agente executado ainda"
                description="Use o botão 'Rodar agora' para executar um agente e acompanhar o resultado."
                action={() => {}}
                actionText="Configurar Agentes"
                variant="info"
              />
            )}
          </TabsContent>

          <TabsContent value="jobs">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Jobs de Processamento</CardTitle>
              </CardHeader>
              <CardContent>
                {jobs.length > 0 ? (
                  <div className="space-y-3">
                    {jobs.map((job) => (
                      <div key={job.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                          <p className="font-medium text-slate-900">{job.type?.replace('_', ' ')}</p>
                          <p className="text-sm text-slate-600">
                            {new Date(job.created_date).toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <StatusBadge status={job.status} size="sm" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Activity}
                    title="Nenhum job de processamento"
                    description="Os jobs aparecem aqui quando a IA está processando dados em segundo plano."
                    variant="info"
                    size="sm"
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ErrorBoundary>
  );
}

export default AICentralPage;
