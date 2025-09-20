
import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { useNavigate } from 'react-router-dom';
import { Service } from '@/api/entities';
import { Task } from '@/api/entities';
import { Brief } from '@/api/entities';
import { PublicBriefingResponse } from '@/api/entities';
import ServiceCard from '../../services/ServiceCard';
import ClientSetupGuide from '../ClientSetupGuide';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Loader2,
  Briefcase,
  FileText,
  CheckSquare,
  FolderOpen,
  Clock,
  TrendingUp,
  AlertCircle,
  Calendar,
  Users,
  Target,
  ArrowRight,
  CheckCircle,
  CheckCircle2, // New import
  Building2 // New import
} from 'lucide-react';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';
import { format, isToday, isTomorrow, isThisWeek, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { isBriefingCompleted, getBriefingCompletionDetails } from '@/components/utils/briefingUtils';

export default function OverviewTab({ client, services, onUpdate }) {
  const { agency, user } = useSession();
  const navigate = useNavigate();

  // Original states for dashboard data
  const [loading, setLoading] = useState(true);
  const [briefings, setBriefings] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [projectStats, setProjectStats] = useState({});
  const [publicBriefings, setPublicBriefings] = useState([]);

  // New states for the status cards
  const [briefingStatus, setBriefingStatus] = useState(null);
  const [servicesStatus, setServicesStatus] = useState(null);

  // CORREÇÃO: Função unificada para verificar qualquer briefing
  const checkAnyBriefingExists = useCallback(async (clientId) => {
    try {
      // 1. Verificar Brief interno
      // No need for dynamic import if Brief is already imported at the top
      const internalBriefs = await Brief.filter({ projectId: clientId });

      if (internalBriefs && internalBriefs.length > 0) {
        console.log(`✅ Cliente ${clientId} tem ${internalBriefs.length} briefing(s) interno(s)`);
        return true;
      }

      // 2. Verificar PublicBriefingResponse
      // No need for dynamic import if PublicBriefingResponse is already imported at the top
      const publicResponses = await PublicBriefingResponse.filter({
        clientId,
        status: { $in: ['submitted', 'completed'] }
      });

      if (publicResponses && publicResponses.length > 0) {
        console.log(`✅ Cliente ${clientId} tem ${publicResponses.length} briefing(s) público(s)`);
        return true;
      }

      console.log(`❌ Cliente ${clientId} não possui briefing`);
      return false;

    } catch (error) {
      console.warn(`Erro ao verificar briefings para cliente ${clientId}:`, error);
      return false;
    }
  }, []);

  // Carregar dados do projeto e novos status
  const loadProjectData = useCallback(async () => {
    if (!client?.id || !agency?.id) return;

    setLoading(true);
    try {
      const [briefingData, publicResponses, taskData, fetchedServices] = await Promise.all([
        Brief.filter({ agencyId: agency.id, projectId: client.id }),
        PublicBriefingResponse.filter({ agencyId: agency.id, clientId: client.id }),
        Task.filter({ agencyId: agency.id, clientId: client.id }, '-created_date', 100),
        Service.filter({ clientId: client.id, is_template: false }) // Fetch services for status calculation
      ]);

      setBriefings(briefingData);
      setPublicBriefings(publicResponses);
      setTasks(taskData);

      // Populate new briefingStatus
      const hasAnyBriefing = await checkAnyBriefingExists(client.id);
      setBriefingStatus({
        exists: hasAnyBriefing,
        count: hasAnyBriefing ? 1 : 0
      });

      // Populate new servicesStatus
      const totalClientServices = fetchedServices.length;
      const activeClientServices = fetchedServices.filter(s => s.is_active).length;
      setServicesStatus({
        total: totalClientServices,
        active: activeClientServices
      });

      // Calcular estatísticas do projeto (using fetchedServices for consistency)
      const activeServicesForStats = fetchedServices.filter(s => s.is_active && !s.is_template).length;
      const activeTasks = taskData.filter(t => ['todo', 'in_progress'].includes(t.status)).length;
      const overdueTasks = taskData.filter(t =>
        t.dueDate &&
        new Date(t.dueDate) < new Date() &&
        !['completed', 'cancelled'].includes(t.status)
      ).length;
      const completedTasks = taskData.filter(t => t.status === 'completed').length;

      setProjectStats({
        activeServices: activeServicesForStats,
        activeTasks,
        overdueTasks,
        completedTasks,
        totalTasks: taskData.length
      });

    } catch (error) {
      console.error('Erro ao carregar dados do projeto:', error);
      toast.error('Erro ao carregar dados do projeto');
    } finally {
      setLoading(false);
    }
  }, [client?.id, agency?.id, checkAnyBriefingExists]); // Added checkAnyBriefingExists to dependencies

  useEffect(() => {
    loadProjectData();
  }, [loadProjectData]);

  // Handler para concluir briefing rapidamente quando >=50%
  const handleConcludeBriefing = async () => {
    const info = getBriefingCompletionDetails(briefings, publicBriefings);
    // Se já concluído, apenas recarrega
    if (info.completed) {
      toast.info('O briefing já está completo!');
      await loadProjectData();
      return;
    }

    try {
      // Preferir atualizar um Brief existente; senão criar um mínimo com READY
      if (briefings.length > 0) {
        await Brief.update(briefings[0].id, { status: 'READY', completion_score: Math.max(60, briefings[0].completion_score || 0) });
      } else {
        await Brief.create({
          agencyId: agency.id,
          projectId: client.id,
          status: 'READY',
          completion_score: Math.max(60, Math.round(info.bestPercentage)),
          business_context: '',
          company_profile: ''
        });
      }
      toast.success('Briefing concluído com sucesso!');
    } catch (error) {
      console.error('Erro ao concluir briefing:', error);
      toast.error('Erro ao concluir briefing.');
    }
    await loadProjectData();
  };

  // 🎯 VERIFICAÇÃO UNIFICADA
  const hasServices = (services || []).length > 0;
  const hasDeliverables = (services || []).some(s => Array.isArray(s?.deliverables) && s.deliverables.length > 0);
  const briefingOk = isBriefingCompleted(briefings, publicBriefings);
  const setupComplete = hasServices && hasDeliverables && briefingOk;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Carregando dados do projeto...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Cards - ALWAYS RENDERED AT THE TOP */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Briefing Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Status do Briefing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                {briefingStatus?.exists ? (
                  <div className="flex items-center text-green-600">
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    <span className="font-medium">Briefing Preenchido</span>
                  </div>
                ) : (
                  <div className="flex items-center text-amber-600">
                    <Clock className="h-5 w-5 mr-2" />
                    <span className="font-medium">Aguardando Briefing</span>
                  </div>
                )}
                <p className="text-sm text-gray-600 mt-1">
                  {briefingStatus?.exists
                    ? 'O cliente já preencheu o briefing inicial'
                    : 'Briefing ainda não foi preenchido'
                  }
                </p>
              </div>

              {!briefingStatus?.exists && (
                <div className="flex gap-2">
                  {/* These buttons need to be implemented to perform actions like opening a form or sending a link */}
                  <Button size="sm" variant="outline" onClick={() => navigate(createPageUrl('client-briefing') + `?clientId=${client.id}`)}>
                    Preencher Briefing
                  </Button>
                  <Button size="sm" onClick={() => toast.info('Funcionalidade de enviar link em breve!')}>
                    Enviar Link
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Services Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building2 className="h-5 w-5 mr-2" />
              Serviços
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center">
                  <span className="text-2xl font-bold text-gray-900">
                    {servicesStatus?.active || 0}
                  </span>
                  <span className="text-sm text-gray-600 ml-1">
                    de {servicesStatus?.total || 0} ativos
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {servicesStatus?.active > 0
                    ? `${servicesStatus.active} serviço(s) em execução`
                    : 'Nenhum serviço ativo'
                  }
                </p>
              </div>

              <Button size="sm" onClick={() => navigate(createPageUrl('client-services') + `?clientId=${client.id}`)}>
                {servicesStatus?.total > 0 ? 'Gerenciar' : 'Criar Serviço'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conditional Rendering for Setup Guide or Dashboard */}
      {!setupComplete ? (
        <div className="space-y-6">
          {/* Guia legado que você já vê com a barra de progresso */}
          <ClientSetupGuide
            client={client}
            services={services}
            briefings={briefings}
            publicResponses={publicBriefings}
            onConcludeBriefing={handleConcludeBriefing}
          />

          {/* Cartão adicional: Conclusão rápida do briefing (não depende do layout do guia) */}
          {(() => {
            const info = getBriefingCompletionDetails(briefings, publicBriefings);
            const canConclude = !info.completed && info.bestPercentage >= 50;
            return canConclude && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-blue-900 text-base">
                    Conclusão rápida do Briefing
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-4">
                  <div className="text-sm text-blue-900">
                    Detectamos {Math.round(info.bestPercentage)}% de preenchimento. Você pode concluir o briefing agora.
                  </div>
                  <Button onClick={handleConcludeBriefing} className="bg-blue-600 hover:bg-blue-700">
                    Concluir Briefing
                  </Button>
                </CardContent>
              </Card>
            );
          })()}
        </div>
      ) : (
        // ============ DASHBOARD PÓS-SETUP ============

        <div className="space-y-6">
          {/* Header do Projeto */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Projeto em Andamento
                </h2>
                <p className="text-gray-600">
                  Acompanhe o progresso e próximas atividades
                </p>
              </div>
              <Badge className="bg-green-100 text-green-800 border-green-200">
                ✅ Configuração Completa
              </Badge>
            </div>
          </div>

          {/* Summary and Project Info */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              {/* SummaryPanel relies on projectStats calculated in loadProjectData */}
              <SummaryPanel />
            </div>
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Estatísticas do Projeto - Retaining some key stats that might not be in SummaryPanel */}
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Target className="w-5 h-5 text-purple-600 mr-2" />
                    <span className="text-2xl font-bold text-purple-600">{projectStats.completedTasks}</span>
                  </div>
                  <p className="text-sm text-gray-600">Tarefas Concluídas</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Users className="w-5 h-5 text-indigo-600 mr-2" />
                    <span className="text-2xl font-bold text-indigo-600">{projectStats.totalTasks}</span>
                  </div>
                  <p className="text-sm text-gray-600">Tarefas Totais</p>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Próximos Passos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="w-5 h-5 mr-2" />
                  Próximos Passos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* nextSteps relies on tasks and projectStats */}
                {(() => {
                  const upcoming = tasks
                    .filter(t => t.dueDate && ['todo', 'in_progress'].includes(t.status))
                    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
                    .slice(0, 5);

                  const getNextSteps = () => {
                    const steps = [];

                    if (projectStats.overdueTasks > 0) {
                      steps.push({
                        icon: AlertCircle,
                        title: `${projectStats.overdueTasks} tarefa(s) em atraso`,
                        description: 'Revisar e atualizar tarefas atrasadas',
                        urgency: 'high',
                        action: () => navigate(createPageUrl('client-tasks') + `?clientId=${client.id}`)
                      });
                    }

                    const currentUrgentTasks = tasks.filter(t =>
                      t.priority === 'urgent' &&
                      ['todo', 'in_progress'].includes(t.status)
                    ).length;

                    if (currentUrgentTasks > 0) {
                      steps.push({
                        icon: Target,
                        title: `${currentUrgentTasks} tarefa(s) urgente(s)`,
                        description: 'Priorizar tarefas marcadas como urgentes',
                        urgency: 'medium',
                        action: () => navigate(createPageUrl('client-tasks') + `?clientId=${client.id}`)
                      });
                    }

                    if (upcoming.length > 0) {
                      steps.push({
                        icon: Calendar,
                        title: 'Tarefas próximas do prazo',
                        description: `${upcoming.length} tarefa(s) precisam de atenção`,
                        urgency: 'low',
                        action: () => navigate(createPageUrl('client-tasks') + `?clientId=${client.id}`)
                      });
                    }

                    if (steps.length === 0) {
                      steps.push({
                        icon: CheckCircle,
                        title: 'Projeto em dia!',
                        description: 'Todas as tarefas estão organizadas',
                        urgency: 'none',
                        action: () => navigate(createPageUrl('client-tasks') + `?clientId=${client.id}`)
                      });
                    }

                    return steps.slice(0, 3); // Max 3 próximos passos
                  };

                  const nextSteps = getNextSteps();

                  return nextSteps.map((step, index) => {
                    const StepIcon = step.icon;
                    const urgencyColors = {
                      high: 'bg-red-50 border-red-200 text-red-700',
                      medium: 'bg-yellow-50 border-yellow-200 text-yellow-700',
                      low: 'bg-blue-50 border-blue-200 text-blue-700',
                      none: 'bg-green-50 border-green-200 text-green-700'
                    };

                    return (
                      <div
                        key={index}
                        onClick={step.action}
                        className={`p-4 rounded-lg border cursor-pointer hover:shadow-md transition-all ${urgencyColors[step.urgency]}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <StepIcon className="w-5 h-5 mt-0.5" />
                            <div>
                              <h3 className="font-medium">{step.title}</h3>
                              <p className="text-sm opacity-75">{step.description}</p>
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 opacity-50" />
                        </div>
                      </div>
                    );
                  });
                })()}
              </CardContent>
            </Card>

            {/* Próximas Tarefas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  Próximas Tarefas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* upcoming relies on tasks */}
                {(() => {
                  const upcoming = tasks
                    .filter(t => t.dueDate && ['todo', 'in_progress'].includes(t.status))
                    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
                    .slice(0, 5);

                  const formatDueDate = (dueDateString) => {
                    try {
                      const dueDate = parseISO(dueDateString);

                      if (isToday(dueDate)) return 'Hoje';
                      if (isTomorrow(dueDate)) return 'Amanhã';
                      if (isThisWeek(dueDate)) return format(dueDate, 'eeee', { locale: ptBR });
                      return format(dueDate, 'dd/MM', { locale: ptBR });
                    } catch {
                      return 'Data inválida';
                    }
                  };

                  return upcoming.length > 0 ? (
                    <div className="space-y-3">
                      {upcoming.map((task) => (
                        <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{task.title}</p>
                            <p className="text-sm text-gray-600">
                              Prazo: {formatDueDate(task.dueDate)}
                            </p>
                          </div>
                          <Badge
                            variant={task.priority === 'urgent' ? 'destructive' :
                              task.priority === 'high' ? 'default' : 'secondary'}
                          >
                            {task.priority === 'urgent' ? 'Urgente' :
                              task.priority === 'high' ? 'Alta' :
                                task.priority === 'medium' ? 'Média' : 'Baixa'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Nenhuma tarefa próxima do prazo</p>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>

          {/* Ações Rápidas */}
          <Card>
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* quickActions static data */}
                {(() => {
                  const quickActions = [
                    {
                      title: 'Criar Tarefa',
                      description: 'Nova atividade para o projeto',
                      icon: Plus,
                      href: createPageUrl('client-tasks') + `?clientId=${client.id}`,
                      color: 'bg-blue-50 text-blue-600 border-blue-200'
                    },
                    {
                      title: 'Ver Documentos',
                      description: 'Arquivos e relatórios',
                      icon: FolderOpen,
                      href: createPageUrl('client-documents') + `?clientId=${client.id}`,
                      color: 'bg-green-50 text-green-600 border-green-200'
                    },
                    {
                      title: 'Gerar Relatório',
                      description: 'Relatório de progresso',
                      icon: TrendingUp,
                      href: createPageUrl('custom-reports') + `?clientId=${client.id}`,
                      color: 'bg-purple-50 text-purple-600 border-purple-200'
                    },
                    {
                      title: 'Editar Briefing',
                      description: 'Atualizar informações',
                      icon: FileText,
                      href: createPageUrl('client-briefing') + `?clientId=${client.id}`,
                      color: 'bg-orange-50 text-orange-600 border-orange-200'
                    }
                  ];
                  return quickActions.map((action, index) => {
                    const ActionIcon = action.icon;
                    return (
                      <div
                        key={index}
                        onClick={() => navigate(action.href)}
                        className={`p-4 rounded-lg border-2 cursor-pointer hover:shadow-md transition-all ${action.color}`}
                      >
                        <div className="text-center">
                          <ActionIcon className="w-6 h-6 mx-auto mb-2" />
                          <h3 className="font-medium">{action.title}</h3>
                          <p className="text-sm opacity-75">{action.description}</p>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </CardContent>
          </Card>

          {/* Lista de Serviços */}
          {services.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Serviços do Cliente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {services.map((service) => (
                    <ServiceCard
                      key={service.id}
                      service={service}
                      client={client}
                      onUpdate={onUpdate}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );

  // SummaryPanel component definition moved here to avoid re-creation on every render
  const SummaryPanel = () => {
    const upcoming = tasks
      .filter(t => t.dueDate && ['todo', 'in_progress'].includes(t.status))
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 5);

    return (
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-base">Resumo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-600">
              <Briefcase className="w-4 h-4 text-blue-600" />
              <span>Serviços Ativos</span>
            </div>
            <Badge variant="secondary">{projectStats.activeServices || 0}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-600">
              <CheckSquare className="w-4 h-4 text-emerald-600" />
              <span>Tarefas Pendentes</span>
            </div>
            <Badge variant="secondary">{projectStats.activeTasks || 0}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-600">
              <AlertCircle className="w-4 h-4 text-orange-600" />
              <span>Tarefas Atrasadas</span>
            </div>
            <Badge variant="secondary">{projectStats.overdueTasks || 0}</Badge>
          </div>
          <div className="text-sm text-gray-600 pt-2">
            Próxima entrega: {upcoming.length ? new Date(upcoming[0].dueDate).toLocaleDateString('pt-BR') : '—'}
          </div>
        </CardContent>
      </Card>
    );
  };
}
