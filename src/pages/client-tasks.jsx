import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '@/components/auth/SessionManager';
import { Client } from '@/api/entities';
import { Service } from '@/api/entities';
import { Task } from '@/api/entities';
import { CyclePlan } from '@/api/entities';
import { Brief } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  CheckSquare,
  ArrowRight,
  Plus,
  Target,
  AlertCircle,
  Clock,
  CheckCircle,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import LoadingState from '@/components/shared/LoadingStates';
import EmptyState from '@/components/shared/EmptyState';
import TaskManager from '@/components/tasks/TaskManager';
import TaskForm from '@/components/tasks/TaskForm';
import { useTaskGeneration } from '@/hooks/useTaskGeneration';
import { useErrorHandling } from '@/hooks/useErrorHandling';
import { getCardPastel } from '@/lib/modulePastels';
import { createPageUrl, getUrlSearchParam } from '@/utils';
import {
  buildClientTasksHref,
  filterTasksByScope,
} from '@/lib/taskScope';

const TaskStats = React.memo(function TaskStats({ tasks }) {
  const stats = {
    total: tasks.length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    inProgress: tasks.filter((t) => t.status === 'in_progress').length,
    overdue: tasks.filter(
      (t) =>
        t.dueDate &&
        new Date(t.dueDate) < new Date() &&
        t.status !== 'completed'
    ).length,
  };

  const statItems = [
    { icon: Target, label: 'Total', value: stats.total, idx: 0 },
    { icon: CheckCircle, label: 'Concluídas', value: stats.completed, idx: 2 },
    { icon: Clock, label: 'Em Progresso', value: stats.inProgress, idx: 1 },
    { icon: AlertCircle, label: 'Atrasadas', value: stats.overdue, idx: 4 },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {statItems.map(({ icon: Icon, label, value, idx }) => {
        const pastel = getCardPastel(idx);
        return (
          <Card
            key={label}
            className={`rounded-2xl border-transparent shadow-sm ${pastel.bg}`}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${pastel.tag}`}
                >
                  <Icon className={`w-4 h-4 ${pastel.text}`} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#18162A]">{value}</div>
                  <div className="text-sm text-[#7A7595]">{label}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
});

function readTasksUrlContext() {
  const urlParams = new URLSearchParams(window.location.search);
  return {
    clientId: getUrlSearchParam(urlParams, 'clientId', 'id'),
    serviceId: urlParams.get('serviceId') || null,
    cycleId: urlParams.get('cycleId') || urlParams.get('cyclePlanId') || null,
    briefingId:
      urlParams.get('briefingId') ||
      urlParams.get('campanhaId') ||
      urlParams.get('campaignId') ||
      null,
  };
}

function syncTasksUrl({ clientId, serviceId, cycleId, briefingId }) {
  if (!clientId || typeof window === 'undefined') return;
  const next = createPageUrl(
    buildClientTasksHref({ clientId, serviceId, cycleId, briefingId })
  );
  const current = `${window.location.pathname}${window.location.search}`;
  if (current !== next) {
    window.history.replaceState({}, '', next);
  }
}

export default function ClientTasksPage() {
  const { user, agencyId } = useSession();
  const initialUrl = useMemo(() => readTasksUrlContext(), []);
  const [clientId, setClientId] = useState(initialUrl.clientId);
  const [urlServiceId] = useState(initialUrl.serviceId);
  const [cycleId, setCycleId] = useState(initialUrl.cycleId);
  const [briefingId, setBriefingId] = useState(initialUrl.briefingId);
  const [client, setClient] = useState(null);
  const [services, setServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [cycle, setCycle] = useState(null);
  const [campaign, setCampaign] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [scopeMeta, setScopeMeta] = useState({
    scope: 'none',
    sharedCycleFallback: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const { generateTasksWithFeedback } = useTaskGeneration();
  const { handleError } = useErrorHandling();

  const overviewHref = createPageUrl(`client-detail?clientId=${clientId || ''}`);
  const clearScopeHref = createPageUrl(
    buildClientTasksHref({ clientId, serviceId: selectedServiceId })
  );

  useEffect(() => {
    if (!initialUrl.clientId) {
      setError('ID do cliente não encontrado na URL.');
    } else {
      setClientId(initialUrl.clientId);
    }
  }, [initialUrl.clientId]);

  const loadTasksForService = useCallback(
    async (serviceId) => {
      if (!serviceId || !clientId || !agencyId) return [];
      const tasksData = await Task.filter(
        {
          clientId,
          serviceId,
          agencyId,
        },
        '-created_date'
      );
      const scoped = filterTasksByScope(tasksData, { cycleId, briefingId });
      setTasks(scoped.tasks);
      setScopeMeta({
        scope: scoped.scope,
        sharedCycleFallback: scoped.sharedCycleFallback,
      });
      return scoped.tasks;
    },
    [clientId, agencyId, cycleId, briefingId]
  );

  useEffect(() => {
    const loadData = async () => {
      if (!clientId || !agencyId) return;

      try {
        setLoading(true);
        setError(null);

        const [clientData, servicesData, cycleData, briefData] = await Promise.all([
          Client.get(clientId),
          Service.filter({ clientId, agencyId, is_active: true }),
          cycleId ? CyclePlan.get(cycleId).catch(() => null) : Promise.resolve(null),
          briefingId ? Brief.get(briefingId).catch(() => null) : Promise.resolve(null),
        ]);

        if (!clientData || clientData.agencyId !== agencyId) {
          throw new Error(
            'Cliente não encontrado ou não pertence à sua agência.'
          );
        }

        setClient(clientData);
        setServices(servicesData);
        setCycle(cycleData);
        setCampaign(briefData);

        const preferredServiceId =
          urlServiceId || cycleData?.serviceId || briefData?.serviceId || null;

        const matched =
          (preferredServiceId &&
            servicesData.find((s) => String(s.id) === String(preferredServiceId))) ||
          servicesData[0] ||
          null;

        setSelectedServiceId(matched?.id || null);
        setSelectedService(matched);

        syncTasksUrl({
          clientId,
          serviceId: matched?.id || preferredServiceId,
          cycleId,
          briefingId,
        });
      } catch (err) {
        console.error('[ClientTasks] Error loading data:', err);
        setError(`Erro ao carregar dados: ${err.message}`);
        toast.error('Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };

    if (clientId && agencyId) {
      loadData();
    }
  }, [clientId, agencyId, cycleId, briefingId, urlServiceId]);

  useEffect(() => {
    if (selectedServiceId && services.length > 0) {
      const service = services.find((s) => s.id === selectedServiceId);
      setSelectedService(service || null);
    } else {
      setSelectedService(null);
    }
  }, [selectedServiceId, services]);

  useEffect(() => {
    if (selectedServiceId) {
      loadTasksForService(selectedServiceId).catch((err) => {
        console.error('[ClientTasks] Error loading tasks:', err);
        toast.error('Erro ao carregar tarefas');
      });
    }
  }, [selectedServiceId, loadTasksForService]);

  const handleSelectService = (serviceId) => {
    setSelectedServiceId(serviceId);
    syncTasksUrl({ clientId, serviceId, cycleId, briefingId });
  };

  const clearScope = () => {
    setCycleId(null);
    setBriefingId(null);
    setCycle(null);
    setCampaign(null);
    syncTasksUrl({ clientId, serviceId: selectedServiceId });
  };

  const tasksByPhase = useMemo(() => {
    if (!selectedService?.deliverables) return {};

    const phases = {};
    selectedService.deliverables.forEach((deliverable) => {
      phases[deliverable.phase] = {
        ...deliverable,
        tasks: tasks.filter(
          (t) =>
            t.serviceId === selectedService.id &&
            t.tags?.includes(`fase-${deliverable.phase}`)
        ),
      };
    });

    return phases;
  }, [selectedService, tasks]);

  const handleGenerateTasks = async () => {
    if (!selectedServiceId || !clientId) {
      toast.error('Serviço não selecionado');
      return;
    }

    try {
      setLoading(true);

      const result = await generateTasksWithFeedback({
        serviceId: selectedServiceId,
        autoAssign: true,
        startDate: new Date().toISOString(),
      });

      if (result.success) {
        await loadTasksForService(selectedServiceId);
      } else {
        throw new Error(result.errors.join('; '));
      }
    } catch (err) {
      handleError(err, {
        action: 'generate_tasks_from_service',
        serviceId: selectedServiceId,
        clientId,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = () => {
    setEditingTask(null);
    setShowTaskForm(true);
  };

  const handleTaskSaved = async () => {
    setShowTaskForm(false);
    setEditingTask(null);

    if (selectedServiceId) {
      await loadTasksForService(selectedServiceId);
    }
  };

  const contextLabel = [
    campaign?.nome_campanha || campaign?.title,
    cycle?.title || cycle?.cyclePeriod,
  ]
    .filter(Boolean)
    .join(' · ');

  if (loading) {
    return <LoadingState message="Carregando quadro de tarefas..." />;
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <EmptyState
          icon="alert-circle"
          title="Erro ao carregar tarefas"
          description={error}
          primaryAction={{
            label: 'Voltar para Visão Geral',
            onClick: () => {
              window.location.href = overviewHref;
            },
          }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-full mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#18162A] flex items-center gap-2 sm:gap-3">
            <CheckSquare className="w-6 h-6 sm:w-8 sm:h-8 text-[#6C47D8] flex-shrink-0" />
            <span className="truncate">Quadro de Tarefas</span>
          </h1>
          <p className="text-[#7A7595] mt-1 text-sm sm:text-base">
            <span className="truncate">{client?.name}</span>
            {contextLabel
              ? ` · ${contextLabel}`
              : ' · Gestão das atividades do projeto'}
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <Button asChild variant="outline" size="sm" className="hidden sm:flex">
            <Link to={overviewHref}>
              <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
              Voltar
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateTasks}
            className="flex-1 sm:flex-none"
          >
            <Target className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Gerar Tarefas</span>
            <span className="sm:hidden">Gerar</span>
          </Button>
          <Button
            size="sm"
            onClick={handleCreateTask}
            className="flex-1 sm:flex-none"
          >
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Nova Tarefa</span>
            <span className="sm:hidden">Nova</span>
          </Button>
        </div>
      </div>

      {(cycleId || briefingId) && (
        <Card
          className={`mb-6 rounded-2xl border shadow-sm ${
            scopeMeta.sharedCycleFallback
              ? 'border-amber-200 bg-amber-50'
              : 'border-[#D4CBF5] bg-[#F5F2FC]'
          }`}
        >
          <CardContent className="p-4 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                {campaign && (
                  <Badge variant="secondary">
                    {campaign.nome_campanha || campaign.title || 'Campanha'}
                  </Badge>
                )}
                {cycle && (
                  <Badge variant="outline">
                    {cycle.title || cycle.cyclePeriod || 'Ciclo'}
                  </Badge>
                )}
                {scopeMeta.sharedCycleFallback && (
                  <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                    Ciclo compartilhado
                  </Badge>
                )}
              </div>
              <p className="text-sm text-[#7A7595]">
                {scopeMeta.sharedCycleFallback
                  ? 'Ainda não há tarefas marcadas nesta campanha — listando o ciclo. Novas tarefas criadas daqui ficam vinculadas à campanha.'
                  : scopeMeta.scope === 'campaign'
                    ? 'Filtro ativo: tarefas desta campanha.'
                    : 'Filtro ativo: tarefas deste ciclo.'}
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to={clearScopeHref} onClick={clearScope}>
                <X className="w-4 h-4 mr-1" />
                Limpar filtro
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {services.length > 1 && (
        <Card className="mb-6 rounded-2xl border-transparent shadow-sm">
          <CardHeader>
            <CardTitle>Selecionar Serviço</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 flex-wrap">
              {services.map((service) => (
                <Button
                  key={service.id}
                  variant={
                    selectedServiceId === service.id ? 'default' : 'outline'
                  }
                  onClick={() => handleSelectService(service.id)}
                >
                  {service.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <TaskStats tasks={tasks} />

      {Object.keys(tasksByPhase).length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-[#18162A] mb-4">
            Progresso por Fase
          </h2>
          <div className="grid gap-4">
            {Object.entries(tasksByPhase).map(([phase, phaseData]) => {
              const totalTasks = phaseData.tasks.length;
              const completedTasks = phaseData.tasks.filter(
                (t) => t.status === 'completed'
              ).length;
              const progress =
                totalTasks > 0
                  ? Math.round((completedTasks / totalTasks) * 100)
                  : 0;
              const isActive = phaseData.tasks.some((t) =>
                ['todo', 'in_progress'].includes(t.status)
              );

              return (
                <Card
                  key={phase}
                  className={`rounded-2xl border-transparent shadow-sm transition-all ${
                    isActive ? 'ring-2 ring-[#D4CBF5] bg-[#F5F2FC]' : ''
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                            progress === 100
                              ? 'bg-green-100 text-green-700'
                              : isActive
                                ? 'bg-[#EDE9FB] text-[#4A2FA3]'
                                : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {phase}
                        </div>
                        <div>
                          <h3 className="font-semibold text-[#18162A]">
                            {phaseData.name}
                          </h3>
                          <p className="text-sm text-[#7A7595]">
                            {phaseData.description}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-lg font-bold text-[#6C47D8]">
                          {progress}%
                        </div>
                        <div className="text-xs text-gray-500">
                          {completedTasks}/{totalTasks} tarefas
                        </div>
                      </div>
                    </div>

                    <Progress value={progress} className="mb-4" />

                    <div className="space-y-2">
                      {phaseData.tasks.slice(0, 3).map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center justify-between p-2 bg-white rounded border"
                        >
                          <div className="flex items-center gap-2">
                            {task.status === 'completed' ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <Clock className="w-4 h-4 text-yellow-600" />
                            )}
                            <span
                              className={`text-sm ${
                                task.status === 'completed'
                                  ? 'line-through text-gray-500'
                                  : 'text-[#18162A]'
                              }`}
                            >
                              {task.title}
                            </span>
                          </div>
                          <Badge
                            variant={
                              task.status === 'completed'
                                ? 'default'
                                : task.status === 'in_progress'
                                  ? 'secondary'
                                  : 'outline'
                            }
                            className={
                              task.status === 'completed'
                                ? 'bg-green-100 text-green-700'
                                : task.status === 'in_progress'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-gray-100 text-gray-700'
                            }
                          >
                            {task.status === 'completed'
                              ? 'Concluída'
                              : task.status === 'in_progress'
                                ? 'Em progresso'
                                : 'Pendente'}
                          </Badge>
                        </div>
                      ))}

                      {phaseData.tasks.length > 3 && (
                        <p className="text-xs text-gray-500 text-center">
                          +{phaseData.tasks.length - 3} tarefas adicionais
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {selectedServiceId ? (
        <TaskManager
          clientId={clientId}
          serviceId={selectedServiceId}
          cycleId={cycleId}
          briefingId={briefingId}
          userRole={user?.role || 'consultor'}
        />
      ) : (
        <EmptyState
          icon="target"
          title="Nenhum serviço ativo"
          description="Este cliente não possui serviços ativos para gerenciar tarefas."
          primaryAction={{
            label: 'Configurar Serviços',
            onClick: () => {
              window.location.href = createPageUrl(
                `services?clientId=${clientId}`
              );
            },
          }}
        />
      )}

      {showTaskForm && (
        <TaskForm
          task={editingTask}
          isOpen={showTaskForm}
          onClose={() => setShowTaskForm(false)}
          onSave={handleTaskSaved}
          clientId={clientId}
          serviceId={selectedServiceId}
          cycleId={cycleId}
          briefingId={briefingId}
          defaultStatus="todo"
        />
      )}
    </div>
  );
}
