import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '@/components/auth/SessionManager';
import { Client } from '@/api/entities';
import { Service } from '@/api/entities';
import { Task } from '@/api/entities';
import { CyclePlan } from '@/api/entities';
import { Brief } from '@/api/entities';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  CheckSquare,
  ArrowLeft,
  Plus,
  Target,
  AlertCircle,
  Clock,
  CheckCircle,
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
import { buildClientCampaignHref } from '@/lib/campaignHref';

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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statItems.map(({ icon: Icon, label, value, idx }) => {
        const pastel = getCardPastel(idx);
        return (
          <Card
            key={label}
            className={`rounded-2xl border-transparent shadow-none ${pastel.bg}`}
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
  const [cycleId] = useState(initialUrl.cycleId);
  const [briefingId] = useState(initialUrl.briefingId);
  const [client, setClient] = useState(null);
  const [services, setServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState(null);
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
  const isCampaignScope = Boolean(briefingId);

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

  const campaignName = campaign?.nome_campanha || campaign?.title || 'Campanha';
  const campaignHref = briefingId
    ? createPageUrl(buildClientCampaignHref({ clientId, briefingId }))
    : overviewHref;

  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const progressPct =
    tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  if (loading) {
    return <LoadingState message="Carregando tarefas..." />;
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <EmptyState
          icon="alert-circle"
          title="Erro ao carregar tarefas"
          description={error}
          primaryAction={{
            label: 'Voltar',
            onClick: () => {
              window.location.href = isCampaignScope ? campaignHref : overviewHref;
            },
          }}
        />
      </div>
    );
  }

  const cycleLabel = cycle?.cyclePeriod || cycle?.title || null;
  const showCycleLabel =
    cycleLabel &&
    String(cycleLabel).trim().toLowerCase() !==
      String(campaignName).trim().toLowerCase();

  return (
    <div className={isCampaignScope ? 'space-y-4' : 'space-y-6'}>
      {isCampaignScope ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Button asChild variant="ghost" size="icon" className="h-8 w-8 shrink-0 -ml-1.5">
                <Link to={campaignHref} aria-label="Voltar à campanha">
                  <ArrowLeft className="w-4 h-4 text-[#7A7595]" />
                </Link>
              </Button>
              <div className="min-w-0">
                <h1 className="text-xl font-bold tracking-tight text-[#18162A] leading-tight">
                  Tarefas
                </h1>
                <p className="text-xs text-[#7A7595] truncate">
                  <Link
                    to={campaignHref}
                    className="hover:text-[#6C47D8] hover:underline"
                  >
                    {campaignName}
                  </Link>
                  {showCycleLabel ? ` · ${cycleLabel}` : ''}
                  <span className="mx-1.5">·</span>
                  {tasks.length} tarefa{tasks.length === 1 ? '' : 's'}
                  {tasks.length > 0 ? ` · ${progressPct}%` : ''}
                  {scopeMeta.sharedCycleFallback ? ' · ciclo compartilhado' : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" onClick={handleGenerateTasks}>
                <Target className="w-4 h-4 mr-1" />
                Gerar
              </Button>
              <Button size="sm" onClick={handleCreateTask}>
                <Plus className="w-4 h-4 mr-1" />
                Nova tarefa
              </Button>
            </div>
          </div>
          {tasks.length > 0 && <Progress value={progressPct} className="h-1" />}
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#18162A] flex items-center gap-2 sm:gap-3">
              <CheckSquare className="w-6 h-6 sm:w-8 sm:h-8 text-[#6C47D8] flex-shrink-0" />
              <span className="truncate">Tarefas</span>
            </h1>
            <p className="text-[#7A7595] mt-1 text-sm sm:text-base truncate">
              {client?.name || 'Cliente'} · Atividades do cliente
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <Button asChild variant="outline" size="sm" className="hidden sm:flex">
              <Link to={overviewHref}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Cliente
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
      )}

      {!isCampaignScope && services.length > 1 && (
        <Card className="rounded-2xl border-transparent shadow-none bg-[#FAFAFC]">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-[#7A7595] mb-3">Serviço</p>
            <div className="flex gap-2 flex-wrap">
              {services.map((service) => (
                <Button
                  key={service.id}
                  size="sm"
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

      {!isCampaignScope && <TaskStats tasks={tasks} />}

      {selectedServiceId ? (
        <TaskManager
          clientId={clientId}
          serviceId={selectedServiceId}
          cycleId={cycleId}
          briefingId={briefingId}
          userRole={user?.role || 'consultor'}
          embedded={isCampaignScope}
          hideCreate={isCampaignScope}
        />
      ) : (
        <EmptyState
          icon="target"
          title="Nenhum serviço ativo"
          description="Este cliente não possui serviços ativos para gerenciar tarefas."
          primaryAction={{
            label: isCampaignScope ? 'Voltar à campanha' : 'Ver cliente',
            onClick: () => {
              window.location.href = isCampaignScope ? campaignHref : overviewHref;
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
