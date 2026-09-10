import { useCallback, useEffect, useState } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { Service, Client, Task } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';
import LoadingState from '@/components/shared/LoadingState';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import {
  resolveDeliverySection,
  DELIVERY_WORKSPACE_DEFAULT_SECTION,
} from '@/lib/deliveryWorkspaceTabs';
import DeliveryWorkspaceNav from '@/components/deliveryWorkspace/DeliveryWorkspaceNav';
import DeliveryWorkspaceHeader from '@/components/deliveryWorkspace/DeliveryWorkspaceHeader';
import DeliveryWorkspaceOverview from '@/components/deliveryWorkspace/DeliveryWorkspaceOverview';
import DeliveryWorkspaceTasks from '@/components/deliveryWorkspace/DeliveryWorkspaceTasks';
import DeliveryWorkspaceActivity from '@/components/deliveryWorkspace/DeliveryWorkspaceActivity';
import DeliveryWorkspaceSchedule from '@/components/deliveryWorkspace/DeliveryWorkspaceSchedule';
import DeliveryWorkspaceFiles from '@/components/deliveryWorkspace/DeliveryWorkspaceFiles';
import DeliveryWorkspaceFinance from '@/components/deliveryWorkspace/DeliveryWorkspaceFinance';
import DeliveryWorkspaceNotes from '@/components/deliveryWorkspace/DeliveryWorkspaceNotes';
import DeliveryWorkspaceDeliveries from '@/components/deliveryWorkspace/DeliveryWorkspaceDeliveries';
import '@/components/deliveryWorkspace/delivery-workspace.css';

export default function DeliveryWorkspacePage() {
  const { agencyId, isAuthenticated } = useSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const params = useParams();
  const navigate = useNavigate();

  const serviceId =
    params.serviceId ||
    searchParams.get('serviceId') ||
    searchParams.get('id') ||
    '';
  const activeSection = resolveDeliverySection(searchParams);
  const activeStageId = searchParams.get('stage') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [service, setService] = useState(null);
  const [client, setClient] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [navOpen, setNavOpen] = useState(false);

  const load = useCallback(async () => {
    if (!serviceId) {
      setError('Informe ?serviceId= na URL.');
      setLoading(false);
      return;
    }
    if (!agencyId) return;

    setLoading(true);
    setError(null);
    try {
      const serviceData = await Service.get(serviceId);
      if (!serviceData || serviceData.agencyId !== agencyId) {
        throw new Error('Serviço não encontrado ou sem permissão');
      }
      if (serviceData.is_template) {
        throw new Error('Workspace é para instâncias de serviço, não templates');
      }
      setService(serviceData);

      if (serviceData.clientId) {
        const clientData = await Client.get(serviceData.clientId).catch(() => null);
        setClient(clientData);
      } else {
        setClient(null);
      }

      const taskList = await Task.filter({
        agencyId,
        serviceId,
      }).catch(() => []);
      setTasks(Array.isArray(taskList) ? taskList : []);
    } catch (err) {
      console.error('[DeliveryWorkspace]', err);
      setError(err?.message || 'Falha ao carregar workspace');
      setService(null);
    } finally {
      setLoading(false);
    }
  }, [serviceId, agencyId]);

  useEffect(() => {
    load();
  }, [load]);

  const setSection = useCallback(
    (sectionId) => {
      const next = new URLSearchParams(searchParams);
      next.set('section', sectionId || DELIVERY_WORKSPACE_DEFAULT_SECTION);
      if (sectionId !== 'tasks') next.delete('stage');
      setSearchParams(next, { replace: true });
      setNavOpen(false);
    },
    [searchParams, setSearchParams]
  );

  const setStageFocus = useCallback(
    (stageId) => {
      const next = new URLSearchParams(searchParams);
      next.set('section', 'tasks');
      if (stageId) next.set('stage', stageId);
      else next.delete('stage');
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const refreshTasks = useCallback(async () => {
    if (!agencyId || !serviceId) return;
    const taskList = await Task.filter({ agencyId, serviceId }).catch(() => []);
    setTasks(Array.isArray(taskList) ? taskList : []);
  }, [agencyId, serviceId]);

  const handleServiceUpdated = useCallback(
    async (updated) => {
      if (updated) setService(updated);
      else await load();
      await refreshTasks();
    },
    [load, refreshTasks]
  );

  useEffect(() => {
    const onPipeline = (ev) => {
      if (String(ev?.detail?.serviceId || '') === String(serviceId)) {
        handleServiceUpdated();
      }
    };
    window.addEventListener('pipeline:updated', onPipeline);
    return () => window.removeEventListener('pipeline:updated', onPipeline);
  }, [serviceId, handleServiceUpdated]);

  if (!isAuthenticated) {
    return (
      <div className="p-6 text-slate-600 text-sm">Faça login para acessar o workspace de entrega.</div>
    );
  }

  if (loading) {
    return <LoadingState message="Carregando workspace de entrega..." />;
  }

  if (error || !service) {
    return (
      <div className="p-6 max-w-lg mx-auto">
        <p className="text-red-700 text-sm mb-3">{error || 'Serviço não encontrado'}</p>
        <button
          type="button"
          className="text-sm underline text-slate-700"
          onClick={() => navigate(-1)}
        >
          Voltar
        </button>
      </div>
    );
  }

  let sectionNode = null;
  switch (activeSection) {
    case 'overview':
      sectionNode = (
        <DeliveryWorkspaceOverview
          service={service}
          client={client}
          tasks={tasks}
          onGoSection={setSection}
          onCycleCreated={handleServiceUpdated}
          onServiceUpdated={handleServiceUpdated}
          onTasksNeedReload={refreshTasks}
        />
      );
      break;
    case 'atividade':
      sectionNode = <DeliveryWorkspaceActivity service={service} tasks={tasks} />;
      break;
    case 'cronograma':
      sectionNode = (
        <DeliveryWorkspaceSchedule
          service={service}
          tasks={tasks}
          onServiceUpdated={handleServiceUpdated}
        />
      );
      break;
    case 'entregas':
      sectionNode = <DeliveryWorkspaceDeliveries service={service} />;
      break;
    case 'files':
      sectionNode = (
        <DeliveryWorkspaceFiles clientId={service.clientId} serviceId={service.id} />
      );
      break;
    case 'finance':
      sectionNode = <DeliveryWorkspaceFinance service={service} />;
      break;
    case 'notes':
      sectionNode = (
        <DeliveryWorkspaceNotes service={service} onServiceUpdated={handleServiceUpdated} />
      );
      break;
    case 'tasks':
    default:
      sectionNode = (
        <DeliveryWorkspaceTasks
          service={service}
          tasks={tasks}
          activeStageId={activeStageId}
          onStageFocus={setStageFocus}
          onServiceUpdated={handleServiceUpdated}
        />
      );
      break;
  }

  return (
    <ErrorBoundary>
      <div className="delivery-workspace">
        <div
          className={`delivery-workspace__drawer-backdrop${navOpen ? ' is-open' : ''}`}
          onClick={() => setNavOpen(false)}
          aria-hidden={!navOpen}
        />
        <div className="delivery-workspace__shell">
          <aside
            id="delivery-workspace-nav"
            className={`delivery-workspace__aside${navOpen ? ' is-open' : ''}`}
          >
            <DeliveryWorkspaceNav
              activeSection={activeSection}
              onSectionChange={setSection}
            />
          </aside>
          <main className="delivery-workspace__main">
            <DeliveryWorkspaceHeader
              service={service}
              client={client}
              onOpenNav={() => setNavOpen(true)}
              navOpen={navOpen}
            />
            {sectionNode}
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
}
