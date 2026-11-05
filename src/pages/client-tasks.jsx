import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '@/components/auth/SessionManager';
import { Client, Service } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { CheckSquare, ArrowLeft, Plus, Target } from 'lucide-react';
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
  const next = createPageUrl(buildClientTasksHref({ clientId, serviceId }));
  const current = `${window.location.pathname}${window.location.search}`;
  if (current !== next) {
    window.history.replaceState({}, '', next);
  }
}

/**
 * Quadro de tarefas do cliente.
 * Padrão: "Todas" — todas as tarefas do cliente, com ou sem serviço.
 * Se o cliente tiver serviços, dá para filtrar por um deles.
 */
export default function ClientTasksPage() {
  const { user, agencyId } = useSession();
  const initialUrl = useMemo(() => readTasksUrlContext(), []);
  const clientId = initialUrl.clientId;
  const [services, setServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState(initialUrl.serviceId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(
    clientId ? null : 'ID do cliente não encontrado na URL.'
  );
  const [listRefreshKey, setListRefreshKey] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(
    () => new URLSearchParams(window.location.search).get('create') === '1'
  );

  const { generateTasksWithFeedback } = useTaskGeneration();
  const { handleError } = useErrorHandling();
  const overviewHref = createPageUrl(`client-detail?clientId=${clientId || ''}`);

  // Remove ?create=1 da URL depois de abrir o formulário
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('create') !== '1') return;
    params.delete('create');
    const qs = params.toString();
    window.history.replaceState({}, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
  }, []);

  useEffect(() => {
    if (!clientId || !agencyId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [clientData, servicesData] = await Promise.all([
          Client.get(clientId),
          Service.filter({ clientId, agencyId, is_active: true }),
        ]);
        if (cancelled) return;
        if (!clientData || clientData.agencyId !== agencyId) {
          throw new Error('Cliente não encontrado ou não pertence à sua agência.');
        }
        const list = Array.isArray(servicesData) ? servicesData : [];
        setServices(list);
        // Serviço da URL que não existe (ou não está ativo) → volta para "Todas"
        setSelectedServiceId((current) =>
          current && list.some((s) => String(s.id) === String(current)) ? current : null
        );
      } catch (err) {
        if (cancelled) return;
        console.error('[ClientTasks] Error loading data:', err);
        setError(`Erro ao carregar dados: ${err.message}`);
        toast.error('Erro ao carregar dados');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId, agencyId]);

  useEffect(() => {
    if (!loading && !error) syncTasksUrl({ clientId, serviceId: selectedServiceId });
  }, [loading, error, clientId, selectedServiceId]);

  const handleGenerateTasks = async () => {
    if (!selectedServiceId) return;
    setGenerating(true);
    try {
      const result = await generateTasksWithFeedback({
        serviceId: selectedServiceId,
        autoAssign: true,
        startDate: new Date().toISOString(),
      });
      if (!result.success) throw new Error(result.errors.join('; '));
      setListRefreshKey((k) => k + 1);
    } catch (err) {
      handleError(err, {
        action: 'generate_tasks_from_service',
        serviceId: selectedServiceId,
        clientId,
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleTaskCreated = () => {
    setShowCreateModal(false);
    setListRefreshKey((k) => k + 1);
    window.dispatchEvent(new Event('task:refresh'));
  };

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
              window.location.href = clientId ? overviewHref : createPageUrl('clients');
            },
          }}
        />
      </div>
    );
  }

  if (loading) {
    return <LoadingState message="Carregando tarefas..." />;
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
          <Button size="sm" onClick={() => setShowCreateModal(true)} className="flex-1 sm:flex-none">
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Nova tarefa</span>
            <span className="sm:hidden">Nova</span>
          </Button>
          {selectedServiceId ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGenerateTasks}
              disabled={generating}
              className="hidden sm:flex text-[#6B635C]"
              title="Gerar tarefas a partir do serviço"
            >
              <Target className="w-4 h-4 mr-2" />
              Gerar do serviço
            </Button>
          ) : null}
        </div>
      </div>

      {services.length > 0 ? (
        <div role="tablist" aria-label="Filtrar por serviço" className="flex flex-wrap gap-2">
          {[{ id: null, name: 'Todas' }, ...services].map((service) => {
            const active = String(selectedServiceId ?? '') === String(service.id ?? '');
            return (
              <Button
                key={service.id ?? 'all'}
                role="tab"
                aria-selected={active}
                size="sm"
                variant={active ? 'default' : 'outline'}
                onClick={() => setSelectedServiceId(service.id)}
              >
                {service.name || 'Serviço'}
              </Button>
            );
          })}
        </div>
      ) : null}

      <TaskManager
        clientId={clientId}
        serviceId={selectedServiceId || null}
        userRole={user?.role || 'consultor'}
        embedded
        hideCreate
        refreshKey={listRefreshKey}
      />

      <TaskCreateModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={handleTaskCreated}
        defaultClientId={clientId}
        defaultServiceId={selectedServiceId || null}
      />
    </div>
  );
}
