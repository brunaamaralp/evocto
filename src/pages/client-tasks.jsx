import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '@/components/auth/SessionManager';
import { Client } from '@/api/entities';
import { Service } from '@/api/entities';
import { Task } from '@/api/entities';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CheckSquare,
  ArrowLeft,
  Plus,
  Target,
} from 'lucide-react';
import { toast } from 'sonner';
import LoadingState from '@/components/shared/LoadingStates';
import EmptyState from '@/components/shared/EmptyState';
import TaskManager from '@/components/tasks/TaskManager';
import TaskCreateModal from '@/components/tasks/TaskCreateModal';
import { useTaskGeneration } from '@/hooks/useTaskGeneration';
import { useErrorHandling } from '@/hooks/useErrorHandling';
import { createPageUrl, getUrlSearchParam } from '@/utils';
import { buildClientTasksHref } from '@/lib/taskScope';

function readTasksUrlContext() {
  const urlParams = new URLSearchParams(window.location.search);
  return {
    clientId: getUrlSearchParam(urlParams, 'clientId', 'id'),
    serviceId: urlParams.get('serviceId') || null,
  };
}

function syncTasksUrl({ clientId, serviceId }) {
  if (!clientId || typeof window === 'undefined') return;
  const next = createPageUrl(
    buildClientTasksHref({ clientId, serviceId })
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
  const [, setClient] = useState(null);
  const [services, setServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('create') === '1';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('create') !== '1') return;
    setShowCreateModal(true);
    params.delete('create');
    const qs = params.toString();
    const next = `${window.location.pathname}${qs ? `?${qs}` : ''}`;
    window.history.replaceState({}, '', next);
  }, []);
  const [listRefreshKey, setListRefreshKey] = useState(0);

  const { generateTasksWithFeedback } = useTaskGeneration();
  const { handleError } = useErrorHandling();

  const overviewHref = createPageUrl(`client-detail?clientId=${clientId || ''}`);

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
      return Array.isArray(tasksData) ? tasksData : [];
    },
    [clientId, agencyId]
  );

  useEffect(() => {
    const loadData = async () => {
      if (!clientId || !agencyId) return;

      try {
        setLoading(true);
        setError(null);

        const [clientData, servicesData] = await Promise.all([
          Client.get(clientId),
          Service.filter({ clientId, agencyId, is_active: true }),
        ]);

        if (!clientData || clientData.agencyId !== agencyId) {
          throw new Error(
            'Cliente não encontrado ou não pertence à sua agência.'
          );
        }

        setClient(clientData);
        setServices(servicesData);

        const preferredServiceId = urlServiceId || null;

        const matched =
          (preferredServiceId &&
            servicesData.find((s) => String(s.id) === String(preferredServiceId))) ||
          servicesData[0] ||
          null;

        setSelectedServiceId(matched?.id || null);

        syncTasksUrl({
          clientId,
          serviceId: matched?.id || preferredServiceId,
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
  }, [clientId, agencyId, urlServiceId]);

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
    syncTasksUrl({ clientId, serviceId });
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
    setShowCreateModal(true);
  };

  const handleTaskCreated = async () => {
    setShowCreateModal(false);

    if (selectedServiceId) {
      await loadTasksForService(selectedServiceId);
    }
    setListRefreshKey((k) => k + 1);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('task:refresh'));
    }
  };

  if (loading) {
    return <LoadingState message="Carregando tarefas..." />;
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <EmptyState
          icon="alert-circle"
          title="Não foi possível carregar as tarefas"
          description={error}
          primaryAction={{
            label: 'Voltar',
            onClick: () => {
              window.location.href = overviewHref;
            },
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1210] flex items-center gap-2 sm:gap-3">
              <CheckSquare className="w-6 h-6 sm:w-8 sm:h-8 text-[#B80015] flex-shrink-0" />
              <span className="truncate">Tarefas</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <Button asChild variant="outline" size="sm" className="hidden sm:flex">
              <Link to={overviewHref}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Cliente
              </Link>
            </Button>
            <Button
              size="sm"
              onClick={handleCreateTask}
              className="flex-1 sm:flex-none"
            >
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Nova tarefa</span>
              <span className="sm:hidden">Nova</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGenerateTasks}
              className="hidden sm:flex text-[#6B635C]"
              title="Gerar tarefas a partir do serviço"
            >
              <Target className="w-4 h-4 mr-2" />
              Gerar do serviço
            </Button>
          </div>
        </div>

      {services.length > 1 && (
        <Card className="rounded-2xl border-transparent shadow-none bg-[#FAFAFC]">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-[#6B635C] mb-3">Serviço</p>
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

      {selectedServiceId ? (
        <TaskManager
          clientId={clientId}
          serviceId={selectedServiceId}
          userRole={user?.role || 'consultor'}
          embedded
          hideCreate
          refreshKey={listRefreshKey}
        />
      ) : (
        <EmptyState
          icon="target"
          title="Nenhum serviço ativo"
          description="Este cliente não possui serviços ativos para gerenciar tarefas."
          primaryAction={{
            label: 'Ver cliente',
            onClick: () => {
              window.location.href = overviewHref;
            },
          }}
        />
      )}

      <TaskCreateModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={handleTaskCreated}
        defaultClientId={clientId}
        defaultServiceId={selectedServiceId}
      />
    </div>
  );
}
