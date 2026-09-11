import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from '@/components/auth/SessionManager';
import { Client, CyclePlan, Service, Task } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createPageUrl, getUrlSearchParam } from '@/utils';
import OperationBreadcrumb from '@/components/client/hub/OperationBreadcrumb';
import TaskAttachments from '@/components/tasks/TaskAttachments';
import { buildClientOperationBreadcrumbs } from '@/lib/clientOperationBreadcrumb';
import {
  formatPeriodLabel,
  getServiceDisplayName,
  getServiceOperationProfile,
  PERIOD_MODES,
} from '@/lib/serviceOperationProfile';
import { summarizeChecklistProgress } from '@/lib/deriveServiceLens';

const STATUS_LABELS = {
  backlog: 'Backlog',
  todo: 'A fazer',
  in_progress: 'Em andamento',
  in_review: 'Em revisão',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  blocked: 'Bloqueado',
};

function capitalizeLabel(label) {
  const s = String(label || '').trim();
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDate(value) {
  if (!value) return null;
  try {
    return new Date(value).toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return null;
  }
}

/**
 * Detalhe da unidade semântica (Task técnica).
 * Etapas = checklist existente — sem novo modelo de dados.
 */
export default function ClientUnitPage() {
  const { agencyId, isAuthenticated } = useSession();
  const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const clientId = getUrlSearchParam(urlParams, 'clientId', 'id');
  const serviceId = urlParams.get('serviceId') || null;
  const taskId = urlParams.get('taskId') || null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [client, setClient] = useState(null);
  const [service, setService] = useState(null);
  const [cycle, setCycle] = useState(null);
  const [task, setTask] = useState(null);
  const [savingStepId, setSavingStepId] = useState(null);

  const load = useCallback(async () => {
    if (!agencyId || !clientId || !taskId) {
      setError('clientId e taskId são obrigatórios');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [clientData, taskData] = await Promise.all([
        Client.get(clientId),
        Task.get(taskId),
      ]);

      if (!clientData || clientData.agencyId !== agencyId) {
        throw new Error('Cliente não encontrado');
      }
      if (!taskData || String(taskData.clientId || '') !== String(clientId)) {
        throw new Error('Unidade não encontrada neste cliente');
      }

      const resolvedServiceId = serviceId || taskData.serviceId || null;
      const serviceData = resolvedServiceId
        ? await Service.get(resolvedServiceId).catch(() => null)
        : null;

      const cycleId =
        taskData.cyclePlanId || taskData.cycleId || taskData.ciclo_id || null;
      const cycleData = cycleId
        ? await CyclePlan.get(cycleId).catch(() => null)
        : null;

      setClient(clientData);
      setTask(taskData);
      setService(serviceData);
      setCycle(cycleData);
    } catch (err) {
      console.error('[client-unit]', err);
      setError(err?.message || 'Erro ao carregar unidade');
    } finally {
      setLoading(false);
    }
  }, [agencyId, clientId, serviceId, taskId]);

  useEffect(() => {
    if (isAuthenticated) load();
  }, [isAuthenticated, load]);

  const profile = useMemo(
    () => getServiceOperationProfile(service),
    [service]
  );

  const progress = useMemo(
    () => summarizeChecklistProgress(task),
    [task]
  );

  const checklist = Array.isArray(task?.checklist) ? task.checklist : [];
  const firstOpenIndex = checklist.findIndex((item) => !item.completed);

  const crumbs = useMemo(() => {
    const periodLabel =
      profile.periodMode === PERIOD_MODES.MONTHLY
        ? formatPeriodLabel(cycle)
        : null;
    return buildClientOperationBreadcrumbs({
      client,
      service,
      profile,
      cycle,
      periodLabel,
      unitTitle: task?.title || capitalizeLabel(profile.itemLabel) || 'Unidade',
    });
  }, [client, service, profile, cycle, task]);

  const hubHref = createPageUrl(
    service?.id
      ? `client-detail?clientId=${clientId}&serviceId=${encodeURIComponent(String(service.id))}`
      : `client-detail?clientId=${clientId || ''}`
  );

  const toggleStep = async (itemId) => {
    if (!task?.id || !itemId) return;
    const list = Array.isArray(task.checklist) ? [...task.checklist] : [];
    const idx = list.findIndex((item) => String(item.id) === String(itemId));
    if (idx < 0) return;

    const next = [...list];
    next[idx] = {
      ...next[idx],
      completed: !next[idx].completed,
      completed_at: !next[idx].completed ? new Date().toISOString() : null,
    };

    setSavingStepId(itemId);
    const prev = task;
    setTask({ ...task, checklist: next });
    try {
      const updated = await Task.update(task.id, { checklist: next });
      setTask(updated || { ...task, checklist: next });
    } catch (err) {
      console.error('[client-unit] toggleStep', err);
      setTask(prev);
      toast.error('Não foi possível atualizar a etapa');
    } finally {
      setSavingStepId(null);
    }
  };

  if (!isAuthenticated || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-6">
        <div className="text-center">
          <Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin text-[#007bff]" aria-hidden />
          <p className="text-sm text-[#555]">Carregando…</p>
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <AlertCircle className="mx-auto mb-3 h-10 w-10 text-[#c0392b]" aria-hidden />
        <h1 className="mb-2 text-lg font-semibold text-[#111]">
          Não foi possível abrir a unidade
        </h1>
        <p className="mb-5 text-sm text-[#555]">{error || 'Unidade não encontrada'}</p>
        <Button asChild variant="outline">
          <Link to={hubHref}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao cliente
          </Link>
        </Button>
      </div>
    );
  }

  const noun = capitalizeLabel(profile.itemLabel) || 'Unidade';
  const statusText =
    STATUS_LABELS[task.status] ||
    (task.status ? String(task.status) : 'Sem status');
  const assignee =
    task.assigneeName ||
    task.assignedToName ||
    null;
  const dueLabel = formatDate(task.dueDate || task.due_date);
  const progressLine =
    progress.total > 0
      ? `${progress.completed} de ${progress.total} etapas · ${progress.percentComplete}%`
      : null;

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-1 pb-10 sm:px-0">
      <div className="space-y-2">
        <OperationBreadcrumb crumbs={crumbs} />
        <p className="text-xs text-[#888]">{noun}</p>
        <h1 className="truncate text-xl font-semibold tracking-tight text-[#111] sm:text-2xl">
          {task.title || noun}
        </h1>
        <p className="text-sm text-[#666]">
          {[statusText, assignee, dueLabel && `Prazo ${dueLabel}`]
            .filter(Boolean)
            .join(' · ')}
        </p>
        {progressLine ? (
          <p className="text-sm text-[#555]">{progressLine}</p>
        ) : null}
      </div>

      <Tabs defaultValue="etapas" className="space-y-4">
        <TabsList className="h-auto w-full justify-start gap-1 bg-transparent p-0">
          <TabsTrigger
            value="etapas"
            className="rounded-md px-3 py-1.5 text-sm data-[state=active]:bg-[#f3f3f3] data-[state=active]:text-[#111]"
          >
            Etapas
          </TabsTrigger>
          <TabsTrigger
            value="visao"
            className="rounded-md px-3 py-1.5 text-sm data-[state=active]:bg-[#f3f3f3] data-[state=active]:text-[#111]"
          >
            Visão geral
          </TabsTrigger>
          <TabsTrigger
            value="arquivos"
            className="rounded-md px-3 py-1.5 text-sm data-[state=active]:bg-[#f3f3f3] data-[state=active]:text-[#111]"
          >
            Arquivos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="etapas" className="mt-0">
          {checklist.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm font-medium text-[#111]">Nenhuma etapa ainda</p>
              <p className="mt-1 text-sm text-[#666]">
                As etapas vêm do template do serviço.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-[#f0f0f0] rounded-lg border border-[#eee] bg-white">
              {checklist.map((item, index) => {
                const id = item.id || `step-${index}`;
                const title = item.text || item.title || `Etapa ${index + 1}`;
                const done = Boolean(item.completed);
                const isCurrent = !done && index === firstOpenIndex;
                const busy = String(savingStepId) === String(id);
                return (
                  <li key={id}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => toggleStep(id)}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#fafafa] disabled:opacity-60 ${
                        isCurrent ? 'bg-[#f7faff]' : ''
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center text-sm ${
                          done
                            ? 'text-[#27ae60]'
                            : isCurrent
                              ? 'text-[#007bff]'
                              : 'text-[#ccc]'
                        }`}
                        aria-hidden
                      >
                        {done ? '✓' : isCurrent ? '●' : '○'}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block text-sm ${
                            done
                              ? 'text-[#888] line-through'
                              : isCurrent
                                ? 'font-medium text-[#111]'
                                : 'text-[#111]'
                          }`}
                        >
                          {title}
                        </span>
                        {isCurrent ? (
                          <span className="text-xs text-[#007bff]">Em andamento</span>
                        ) : null}
                      </span>
                      <span className="sr-only">
                        {done ? 'Concluída' : isCurrent ? 'Em andamento' : 'Pendente'}.
                        Ativar para alternar.
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="visao" className="mt-0 space-y-4 rounded-lg border border-[#eee] bg-white p-4">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-[#888]">Serviço</dt>
              <dd className="mt-0.5 text-[#111]">
                {service ? getServiceDisplayName(service) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[#888]">Status</dt>
              <dd className="mt-0.5 text-[#111]">{statusText}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#888]">Responsável</dt>
              <dd className="mt-0.5 text-[#111]">{assignee || 'Não atribuído'}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#888]">Progresso</dt>
              <dd className="mt-0.5 text-[#111]">
                {progressLine || 'Sem etapas ainda'}
              </dd>
            </div>
          </dl>
          {task.description ? (
            <div>
              <p className="text-xs text-[#888]">Descrição</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-[#333]">
                {task.description}
              </p>
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="arquivos" className="mt-0 rounded-lg border border-[#eee] bg-white p-4">
          <TaskAttachments task={task} onUpdate={(next) => setTask(next)} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
