import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { Service, Client, Task, Brief } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';
import LoadingState from '@/components/shared/LoadingState';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import {
  resolveDeliverySection,
  DELIVERY_WORKSPACE_DEFAULT_SECTION,
} from '@/lib/deliveryWorkspaceTabs';
import {
  CAMPAIGN_WORKSPACE_DEFAULT_TAB,
  getCampaignIdFromSearchParams,
  resolveCampaignWorkspaceTab,
} from '@/lib/campaignWorkspaceHref';
import { normalizeCampanhaUnit } from '@/lib/campanhaIdeia';
import { filterTasksByScope } from '@/lib/taskScope';
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
import CampaignWorkspaceIdeia from '@/components/deliveryWorkspace/CampaignWorkspaceIdeia';
import CampaignWorkspaceContexto from '@/components/deliveryWorkspace/CampaignWorkspaceContexto';
import CampaignWorkspaceHistorico from '@/components/deliveryWorkspace/CampaignWorkspaceHistorico';
import CampaignWorkspaceTasks from '@/components/deliveryWorkspace/CampaignWorkspaceTasks';
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
  const campaignId = getCampaignIdFromSearchParams(searchParams);
  const campaignMode = Boolean(campaignId);
  const activeSection = campaignMode
    ? resolveCampaignWorkspaceTab(searchParams) || CAMPAIGN_WORKSPACE_DEFAULT_TAB
    : resolveDeliverySection(searchParams);
  const activeStageId = searchParams.get('stage') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [service, setService] = useState(null);
  const [client, setClient] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [brief, setBrief] = useState(null);
  const [navOpen, setNavOpen] = useState(false);

  const campaignUnit = useMemo(
    () => (brief ? normalizeCampanhaUnit(brief) : null),
    [brief]
  );

  const scopedTasks = useMemo(() => {
    if (!campaignMode || !campaignUnit) {
      return { tasks, scope: 'none', sharedCycleFallback: false };
    }
    return filterTasksByScope(tasks, {
      briefingId: campaignUnit.id,
      cycleId: campaignUnit.cycleId,
    });
  }, [campaignMode, campaignUnit, tasks]);

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

      if (campaignId) {
        const briefData = await Brief.get(campaignId);
        if (!briefData || (briefData.agencyId && briefData.agencyId !== agencyId)) {
          throw new Error('Campanha não encontrada ou sem permissão');
        }
        setBrief(briefData);
      } else {
        setBrief(null);
      }
    } catch (err) {
      console.error('[DeliveryWorkspace]', err);
      setError(err?.message || 'Falha ao carregar workspace');
      setService(null);
      setBrief(null);
    } finally {
      setLoading(false);
    }
  }, [serviceId, agencyId, campaignId]);

  useEffect(() => {
    load();
  }, [load]);

  // Garante section canônica em modo campanha (ex. aliases / default)
  useEffect(() => {
    if (!campaignMode) return;
    const resolved = resolveCampaignWorkspaceTab(searchParams);
    const current = String(searchParams.get('section') || searchParams.get('tab') || '');
    if (resolved && current !== resolved) {
      const next = new URLSearchParams(searchParams);
      next.set('section', resolved);
      next.delete('tab');
      if (!next.get('campaignId') && campaignId) next.set('campaignId', campaignId);
      if (!next.get('briefingId') && campaignId) next.set('briefingId', campaignId);
      setSearchParams(next, { replace: true });
    }
  }, [campaignMode, campaignId, searchParams, setSearchParams]);

  const setSection = useCallback(
    (sectionId) => {
      const next = new URLSearchParams(searchParams);
      const fallback = campaignMode
        ? CAMPAIGN_WORKSPACE_DEFAULT_TAB
        : DELIVERY_WORKSPACE_DEFAULT_SECTION;
      next.set('section', sectionId || fallback);
      if (sectionId !== 'tasks') next.delete('stage');
      if (campaignMode && campaignId) {
        next.set('campaignId', campaignId);
        next.set('briefingId', campaignId);
      }
      setSearchParams(next, { replace: true });
      setNavOpen(false);
    },
    [searchParams, setSearchParams, campaignMode, campaignId]
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

  const handleBriefSaved = useCallback((updated) => {
    if (updated) setBrief(updated);
  }, []);

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
    return (
      <LoadingState
        message={
          campaignMode
            ? 'Carregando workspace da campanha...'
            : 'Carregando workspace de entrega...'
        }
      />
    );
  }

  if (error || !service || (campaignMode && !brief)) {
    return (
      <div className="p-6 max-w-lg mx-auto">
        <p className="text-red-700 text-sm mb-3">
          {error || (campaignMode ? 'Campanha não encontrada' : 'Serviço não encontrado')}
        </p>
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

  if (campaignMode) {
    switch (activeSection) {
      case 'contexto':
        sectionNode = (
          <CampaignWorkspaceContexto
            clientId={client?.id || service.clientId || campaignUnit?.clientId}
            clientName={client?.name || client?.legal_name || service.clientName}
            serviceName={service.name}
          />
        );
        break;
      case 'ideia':
        sectionNode = (
          <CampaignWorkspaceIdeia brief={brief} onSaved={handleBriefSaved} />
        );
        break;
      case 'historico':
        sectionNode = (
          <CampaignWorkspaceHistorico historico={campaignUnit?.historico || []} />
        );
        break;
      case 'tasks':
      default:
        sectionNode = (
          <CampaignWorkspaceTasks
            tasks={scopedTasks.tasks}
            scopeLabel={
              scopedTasks.scope === 'campaign'
                ? 'escopo campanha'
                : scopedTasks.scope === 'cycle'
                  ? 'escopo ciclo'
                  : null
            }
            sharedCycleFallback={scopedTasks.sharedCycleFallback}
          />
        );
        break;
    }
  } else {
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
        sectionNode = <DeliveryWorkspaceDeliveries service={service} tasks={tasks} />;
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
              mode={campaignMode ? 'campaign' : 'service'}
              activeSection={activeSection}
              onSectionChange={setSection}
            />
          </aside>
          <main className="delivery-workspace__main">
            <DeliveryWorkspaceHeader
              service={service}
              client={client}
              campaignUnit={campaignMode ? campaignUnit : null}
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
