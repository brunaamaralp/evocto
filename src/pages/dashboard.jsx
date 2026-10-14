import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  Check,
  Loader2,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { useSession } from '@/components/auth/SessionManager';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Client } from '@/api/entities';
import { Service } from '@/api/entities';
import { Task } from '@/api/entities';
import { Brief } from '@/api/entities';
import { CyclePlan } from '@/api/entities';
import { deriveActiveCampaigns } from '@/hooks/useClientHubData';
import { buildGreetingLine, formatTodayHeroDate } from '@/lib/dashboardDayBriefing';
import {
  getOperationalCycleConfigFromAgency,
  resolveAgencyOperationalCycle,
} from '@/lib/agencyOperationalCycle';
import { resolveOperationalPhaseWork } from '@/lib/resolveOperationalPhaseWork';
import {
  buildPhaseFocusAttentionItems,
  mergePhaseFocusIntoAttentionQueue,
} from '@/lib/prioritizeDashboardPhaseFocus';
import AgencyOperationalPhaseIndicator from '@/components/dashboard/AgencyOperationalPhaseIndicator';
import TaskCreateModal from '@/components/tasks/TaskCreateModal';
import { completeTask, notifyTaskCompleted, toastTaskCompleted, toastTaskCompleteError } from '@/lib/completeTask';

function firstNameFromFullName(fullName) {
  const first = String(fullName || '')
    .trim()
    .split(/\s+/)[0];
  if (!first || first === 'Usuário') return '';
  return first;
}

const OPEN_TASK_STATUSES = new Set([
  'todo',
  'in_progress',
  'pending',
  'blocked',
  'in_review',
]);

const DONE_GATE = new Set(['aprovado', 'approved', 'skipped', 'done']);

async function safeFilter(entity, filters) {
  try {
    const result = await entity.filter(filters);
    return Array.isArray(result) ? result : [];
  } catch (err) {
    console.warn('[dashboard] filter failed:', err?.message || err);
    return [];
  }
}

function startOfLocalDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addLocalDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function parseDueDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isOpenTask(task) {
  const status = String(task?.status || '').toLowerCase();
  return OPEN_TASK_STATUSES.has(status);
}

function isWaitingOnClient(task) {
  const gatekeeper = String(task?.gatekeeper || '').toLowerCase();
  if (gatekeeper !== 'cliente' && gatekeeper !== 'client') return false;
  const gate = String(task?.gate_status || 'pendente').toLowerCase();
  return !DONE_GATE.has(gate);
}

function formatDueLabel(due, todayStart) {
  if (!due) return null;
  const dueDay = startOfLocalDay(due);
  const diffDays = Math.round((dueDay - todayStart) / 86400000);
  if (diffDays < 0) {
    const n = Math.abs(diffDays);
    return n === 1 ? 'Atrasada 1 dia' : `Atrasada ${n} dias`;
  }
  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Amanhã';
  return due.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function resolveClientName(clients, clientId) {
  if (!clientId) return 'Interno';
  const client = clients.find((c) => String(c.id) === String(clientId));
  return client?.name || 'Interno';
}

function openTaskDrawer(taskId) {
  if (!taskId) return;
  window.dispatchEvent(new CustomEvent('task:open', { detail: { taskId } }));
}

function groupCampaignsByClient(clients, briefs, cycles, tasks, services) {
  const groups = [];

  for (const client of clients) {
    const clientId = client.id;
    const clientBriefs = briefs.filter(
      (b) =>
        String(b.clientId || '') === String(clientId) ||
        String(b.projectId || '') === String(clientId)
    );
    const clientCycles = cycles.filter((c) => String(c.clientId || '') === String(clientId));
    const clientTasks = tasks.filter((t) => String(t.clientId || '') === String(clientId));
    const clientServices = services.filter((s) => String(s.clientId || '') === String(clientId));

    const campaigns = deriveActiveCampaigns({
      briefs: clientBriefs,
      cycles: clientCycles,
      tasks: clientTasks,
      services: clientServices,
      clientId,
    });

    if (campaigns.length === 0) continue;

    groups.push({
      clientId,
      clientName: client.name || 'Cliente',
      clientStatus: client.status,
      href: createPageUrl(`client-detail?clientId=${clientId}`),
      campaigns,
    });
  }

  return groups.sort((a, b) => a.clientName.localeCompare(b.clientName));
}

function buildTaskItem(task, clients, todayStart, kind) {
  const due = parseDueDate(task.dueDate);
  return {
    id: `task:${task.id}`,
    taskId: task.id,
    task,
    kind,
    title: task.title || 'Tarefa',
    clientName: resolveClientName(clients, task.clientId),
    dueLabel: formatDueLabel(due, todayStart),
    priority: String(task.priority || 'medium').toLowerCase(),
    sortAt: due ? due.getTime() : Number.MAX_SAFE_INTEGER,
  };
}

/**
 * Fila de atenção base: atrasadas, bloqueadas, aguardando cliente, aprovações.
 * O foco da fase é mesclado depois via mergePhaseFocusIntoAttentionQueue.
 */
function buildAttentionQueue(tasks, clients, cycles, todayStart) {
  const items = [];
  const seen = new Set();

  const pushUnique = (item) => {
    if (seen.has(item.id)) return;
    seen.add(item.id);
    items.push(item);
  };

  for (const task of tasks) {
    if (!isOpenTask(task)) continue;
    const due = parseDueDate(task.dueDate);
    const status = String(task.status || '').toLowerCase();
    const overdue = due && startOfLocalDay(due) < todayStart;

    if (overdue) {
      pushUnique(buildTaskItem(task, clients, todayStart, 'overdue'));
      continue;
    }
    if (status === 'blocked') {
      pushUnique(buildTaskItem(task, clients, todayStart, 'blocked'));
      continue;
    }
    if (isWaitingOnClient(task)) {
      pushUnique(buildTaskItem(task, clients, todayStart, 'waiting_client'));
    }
  }

  for (const cycle of cycles) {
    if (String(cycle.status || '') !== 'pending_approval') continue;
    const clientName = resolveClientName(clients, cycle.clientId) || cycle.clientName || null;
    const title =
      cycle.cyclePeriod ||
      cycle.title ||
      cycle.planData?.title ||
      'Plano aguardando aprovação';
    pushUnique({
      id: `cycle:${cycle.id}`,
      kind: 'approval',
      title,
      clientName,
      dueLabel: 'Aprovação',
      priority: 'high',
      href: createPageUrl(`cycle-approval?id=${cycle.id}`),
      sortAt: 0,
    });
  }

  const kindRank = {
    overdue: 0,
    blocked: 1,
    waiting_client: 2,
    approval: 3,
  };

  return items
    .sort((a, b) => {
      const rank = (kindRank[a.kind] ?? 9) - (kindRank[b.kind] ?? 9);
      if (rank !== 0) return rank;
      return a.sortAt - b.sortAt;
    })
    .slice(0, 6);
}

/**
 * Agenda das próximas 48h (hoje + amanhã), sem atrasadas.
 */
function buildAgenda(tasks, clients, todayStart) {
  const horizonEnd = addLocalDays(todayStart, 2);

  return tasks
    .filter((task) => {
      if (!isOpenTask(task)) return false;
      if (String(task.status || '').toLowerCase() === 'blocked') return false;
      const due = parseDueDate(task.dueDate);
      if (!due) return false;
      const dueDay = startOfLocalDay(due);
      return dueDay >= todayStart && dueDay < horizonEnd;
    })
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 8)
    .map((task) => buildTaskItem(task, clients, todayStart, 'agenda'));
}

function buildSetupSteps({ clients, campaignGroups, tasks, services = [] }) {
  const hasClients = clients.length > 0;
  const activeServices = (Array.isArray(services) ? services : []).filter(
    (s) => s?.is_template !== true && s?.is_active !== false
  );
  const hasService = activeServices.length > 0;
  const hasCampaigns = campaignGroups.length > 0;
  const hasOpenTasks = tasks.some(isOpenTask);
  const clientsWithoutService = clients.filter(
    (c) => !activeServices.some((s) => String(s.clientId) === String(c.id))
  );
  const clientsWithoutCampaigns = clients.filter(
    (c) => !campaignGroups.some((g) => String(g.clientId) === String(c.id))
  );

  return [
    {
      id: 'client',
      done: hasClients,
      title: 'Adicionar seu primeiro cliente',
      description: 'Cadastre a empresa ou marca com quem você trabalha.',
      href: createPageUrl('clients'),
      cta: 'Adicionar cliente',
    },
    {
      id: 'service',
      done: hasService,
      title: 'Registrar o que você entrega',
      description: hasClients
        ? clientsWithoutService.length > 0
          ? `${clientsWithoutService.length} cliente${clientsWithoutService.length === 1 ? '' : 's'} ainda sem entrega definida.`
          : 'Entregas já registradas.'
        : 'Primeiro adicione um cliente.',
      href: clientsWithoutService[0]?.id
        ? createPageUrl(
            `client-detail?clientId=${clientsWithoutService[0].id}&setup=service`
          )
        : clients[0]?.id
          ? createPageUrl(`client-detail?clientId=${clients[0].id}&setup=service`)
          : createPageUrl('clients'),
      cta: hasClients ? 'Definir entrega' : 'Começar pelos clientes',
    },
    {
      id: 'campaign',
      done: hasCampaigns,
      title: 'Abrir o trabalho do cliente',
      description: hasService
        ? clientsWithoutCampaigns.length > 0
          ? `${clientsWithoutCampaigns.length} cliente${clientsWithoutCampaigns.length === 1 ? '' : 's'} ainda sem trabalho ativo.`
          : 'Abra o cliente e continue pelo que foi contratado.'
        : 'Defina a entrega antes.',
      href: hasService
        ? clientsWithoutCampaigns[0]?.id
          ? createPageUrl(
              `client-detail?clientId=${clientsWithoutCampaigns[0].id}#operacao`
            )
          : createPageUrl('clients')
        : clientsWithoutService[0]?.id
          ? createPageUrl(
              `client-detail?clientId=${clientsWithoutService[0].id}&setup=service`
            )
          : createPageUrl('clients'),
      cta: hasService ? 'Abrir cliente' : 'Definir entrega',
    },
    {
      id: 'tasks',
      done: hasOpenTasks,
      title: 'Criar as primeiras tarefas',
      description: 'Prazos e entregas alimentam a agenda da home.',
      href: hasCampaigns
        ? createPageUrl('tasks-manager')
        : hasService && clientsWithoutCampaigns[0]?.id
          ? createPageUrl(
              `client-detail?clientId=${clientsWithoutCampaigns[0].id}#operacao`
            )
          : clientsWithoutService[0]?.id
            ? createPageUrl(
                `client-detail?clientId=${clientsWithoutService[0].id}&setup=service`
              )
            : createPageUrl('clients'),
      cta: hasCampaigns ? 'Ver tarefas' : hasService ? 'Depois do trabalho' : 'Depois da entrega',
    },
  ];
}

function kindBadge(kind) {
  switch (kind) {
    case 'overdue':
      return { label: 'Atrasada', className: 'text-[#c0392b]' };
    case 'phase_focus':
      return { label: 'Fase', className: 'text-[#6C47D8]' };
    case 'blocked':
      return { label: 'Bloqueada', className: 'text-[#b45309]' };
    case 'waiting_client':
      return { label: 'Aguardando cliente', className: 'text-[#7A7595]' };
    case 'approval':
      return { label: 'Aprovar', className: 'text-[#b45309]' };
    default:
      return null;
  }
}

function ItemRow({ item, showKindBadge = false, onComplete, completingId, variant = 'default' }) {
  const badge = showKindBadge ? kindBadge(item.kind) : null;
  const isTask = Boolean(item.taskId);
  const isCompleting = completingId === item.taskId;
  const canComplete = isTask && onComplete && item.completable !== false;
  const isOverdue = item.kind === 'overdue';
  const isAgenda = variant === 'agenda';

  const secondaryLine = [
    item.clientName,
    isAgenda ? null : item.dueLabel,
    item.kind === 'phase_focus' ? item.activityKindLabel : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const meta = (
    <>
      <div className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-medium text-[#18162A]">{item.title}</p>
        {secondaryLine ? (
          <p className="text-xs text-[#7A7595]">{secondaryLine}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {isAgenda && item.dueLabel ? (
          <span
            className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
              item.dueLabel === 'Hoje'
                ? 'bg-[#F5F2FC] text-[#6C47D8]'
                : item.dueLabel === 'Amanhã'
                  ? 'bg-[#F8F7FB] text-[#7A7595]'
                  : 'bg-[#F8F7FB] text-[#7A7595]'
            }`}
          >
            {item.dueLabel}
          </span>
        ) : null}
        {item.priority === 'high' && item.kind !== 'overdue' ? (
          <span className="text-xs font-semibold text-[#c0392b]">Alta</span>
        ) : null}
        {badge ? (
          <span className={`text-xs font-semibold ${badge.className}`}>{badge.label}</span>
        ) : null}
      </div>
    </>
  );

  const rowClassName = [
    'flex min-w-0 flex-1 items-center justify-between gap-3 rounded-lg px-2.5 py-2.5 transition-colors',
    isAgenda ? 'hover:bg-[#F8F7FB]' : 'hover:bg-white/70',
    variant === 'attention' && isOverdue ? 'border-l-[3px] border-l-[#c0392b] pl-2' : '',
    variant === 'attention' && !isOverdue ? 'border-l-[3px] border-l-[#6C47D8] pl-2' : '',
    isAgenda ? 'border-l-[3px] border-l-[#C9C0E8] pl-2' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <li className="flex items-center gap-0.5">
      {isTask ? (
        <button type="button" onClick={() => openTaskDrawer(item.taskId)} className={rowClassName}>
          {meta}
        </button>
      ) : (
        <Link to={item.href} className={rowClassName}>
          {meta}
        </Link>
      )}
      {canComplete ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-[#7A7595] hover:bg-[#eef7ee] hover:text-[#1a7f37]"
          disabled={isCompleting}
          title="Marcar como concluída"
          aria-label={`Marcar "${item.title}" como concluída`}
          onClick={() => onComplete(item)}
        >
          {isCompleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
        </Button>
      ) : null}
    </li>
  );
}

function CampaignProgressBar({ completed, total }) {
  if (!(total > 0)) return null;
  const pct = Math.min(100, Math.round((completed / total) * 100));
  return (
    <div className="mt-3 space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-xs text-[#7A7595]">
        <span>
          {completed}/{total} tarefas
        </span>
        <span className="tabular-nums font-medium text-[#18162A]">{pct}%</span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-[#EDEAF7]"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progresso da campanha: ${pct}%`}
      >
        <div
          className="h-full rounded-full bg-[#6C47D8] transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Home operacional — campanhas + agenda + fila de atenção.
 */
export default function DashboardPage() {
  const { agencyId, userName, user, agency, loading: sessionLoading } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [completingId, setCompletingId] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);

  const loadDashboardData = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setLoading(true);
        setError(null);
      }

      if (!agencyId) {
        setError('ID da organização não encontrado.');
        if (!silent) setLoading(false);
        return;
      }

      const [clients, services, tasks, briefs, cycles] = await Promise.all([
        safeFilter(Client, { agencyId }),
        safeFilter(Service, { agencyId, is_template: false }),
        safeFilter(Task, { agencyId }),
        safeFilter(Brief, { agencyId }),
        safeFilter(CyclePlan, { agencyId }),
      ]);

      const activeClients = clients.filter((c) => c.status === 'ativo');
      const clientsForCampaigns = activeClients.length > 0 ? activeClients : clients;
      const todayStart = startOfLocalDay();

      const campaignGroups = groupCampaignsByClient(
        clientsForCampaigns,
        briefs,
        cycles,
        tasks,
        services
      );

      const cycleConfig = getOperationalCycleConfigFromAgency(agency);
      const operationalCycle = resolveAgencyOperationalCycle(new Date(), cycleConfig);
      const phaseWorkForQueue = resolveOperationalPhaseWork(tasks, {
        agencyId,
        currentPhase: operationalCycle?.currentPhase || null,
        maxItems: 16,
      });
      const phaseFocusItems = buildPhaseFocusAttentionItems(phaseWorkForQueue, {
        tasks,
        clients,
        todayStart,
        resolveClientName,
        formatDueLabel,
        parseDueDate,
      });
      const attentionQueue = mergePhaseFocusIntoAttentionQueue(
        buildAttentionQueue(tasks, clients, cycles, todayStart),
        phaseFocusItems,
        { max: 8 }
      );
      const agenda = buildAgenda(tasks, clients, todayStart);
      const setupSteps = buildSetupSteps({
        clients: clientsForCampaigns,
        campaignGroups,
        tasks,
        services,
      });
      const clientsWithoutCampaigns = clientsForCampaigns
        .filter((c) => !campaignGroups.some((g) => String(g.clientId) === String(c.id)))
        .slice(0, 4)
        .map((c) => ({
          id: c.id,
          name: c.name || 'Cliente',
          href: createPageUrl(
            `client-detail?clientId=${c.id}#operacao`
          ),
        }));
      const clientsWithoutService = clientsForCampaigns
        .filter(
          (c) =>
            !(Array.isArray(services) ? services : []).some(
              (s) =>
                String(s.clientId) === String(c.id) &&
                s.is_template !== true &&
                s.is_active !== false
            )
        )
        .slice(0, 4)
        .map((c) => ({
          id: c.id,
          name: c.name || 'Cliente',
          href: createPageUrl(`client-detail?clientId=${c.id}&setup=service`),
        }));

      setDashboardData({
        campaignGroups,
        attentionQueue,
        agenda,
        setupSteps,
        clientsWithoutCampaigns,
        clientsWithoutService,
        tasks,
      });
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
      if (!silent) {
        setError(`Erro ao carregar dados: ${err.message}`);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [agencyId, agency]);

  useEffect(() => {
    if (sessionLoading) return;
    if (!agencyId) {
      setLoading(false);
      setError(null);
      setDashboardData(null);
      return;
    }
    loadDashboardData();
  }, [sessionLoading, agencyId, loadDashboardData]);

  useEffect(() => {
    const onTaskUpdated = (event) => {
      if (!agencyId || sessionLoading) return;
      const { taskId, status, deleted } = event?.detail || {};

      // Conclusão / exclusão: ajusta filas na hora; evita reload imediato
      // trazer a tarefa de volta antes da leitura consistente.
      if (taskId && (deleted || status === 'completed' || status === 'done')) {
        const removeId = `task:${taskId}`;
        setDashboardData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            attentionQueue: (prev.attentionQueue || []).filter(
              (i) => i.id !== removeId && i.taskId !== taskId
            ),
            agenda: (prev.agenda || []).filter(
              (i) => i.id !== removeId && i.taskId !== taskId
            ),
          };
        });
        window.setTimeout(() => {
          loadDashboardData({ silent: true });
        }, 800);
        return;
      }

      loadDashboardData({ silent: true });
    };
    window.addEventListener('task:updated', onTaskUpdated);
    return () => window.removeEventListener('task:updated', onTaskUpdated);
  }, [agencyId, sessionLoading, loadDashboardData]);

  const handleCompleteTask = useCallback(
    async (item) => {
      const task = item?.task;
      if (!task?.id || completingId) return;
      if (item?.completable === false) return;

      setCompletingId(task.id);
      try {
        const result = await completeTask(task, {
          agencyId: agencyId || task.agencyId,
          user,
        });
        if (!result.success) {
          toastTaskCompleteError(result.message || 'Não é possível concluir esta tarefa');
          return;
        }

        const removeId = `task:${task.id}`;
        setDashboardData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            attentionQueue: (prev.attentionQueue || []).filter(
              (i) => i.id !== removeId && i.taskId !== task.id
            ),
            agenda: (prev.agenda || []).filter(
              (i) => i.id !== removeId && i.taskId !== task.id
            ),
          };
        });

        toastTaskCompleted(task, {
          alreadyCompleted: result.alreadyCompleted,
          warning: result.warning,
        });
        notifyTaskCompleted(task.id);
      } catch (err) {
        console.error('[dashboard] complete task failed:', err);
        toastTaskCompleteError(err?.message || 'Erro ao concluir tarefa');
      } finally {
        setCompletingId(null);
      }
    },
    [agencyId, completingId, user]
  );

  if (sessionLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-7 w-7 animate-spin text-[#6C47D8]" aria-hidden />
          <p className="text-sm text-[#7A7595]">Carregando…</p>
        </div>
      </div>
    );
  }

  if (!agencyId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6">
        <div className="max-w-md text-center">
          <AlertCircle className="mx-auto mb-4 h-10 w-10 text-[#c0392b]" aria-hidden />
          <h2 className="mb-2 text-xl font-semibold text-[#18162A]">Organização não encontrada</h2>
          <p className="mb-5 text-sm text-[#7A7595]">
            Sua conta não está vinculada a uma agência. Crie uma conta de agência ou peça um convite ao administrador.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild className="bg-[#6C47D8] hover:bg-[#5A3BC0]">
              <Link to="/create-account">Criar agência</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/">Voltar ao início</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6">
        <div className="max-w-md text-center">
          <AlertCircle className="mx-auto mb-4 h-10 w-10 text-[#c0392b]" aria-hidden />
          <h2 className="mb-2 text-xl font-semibold text-[#18162A]">Erro ao carregar</h2>
          <p className="mb-5 text-sm text-[#7A7595]">{error}</p>
          <Button onClick={loadDashboardData} className="bg-[#6C47D8] hover:bg-[#5A3BC0]">
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  const {
    campaignGroups,
    attentionQueue,
    agenda,
    setupSteps,
    clientsWithoutCampaigns,
    clientsWithoutService = [],
  } = dashboardData;
  const hasCampaigns = campaignGroups.length > 0;
  const nextSetupStep = setupSteps.find((s) => !s.done) || null;
  const greeting = buildGreetingLine(firstNameFromFullName(userName));
  const todayLabel = formatTodayHeroDate();
  const cycleConfig = getOperationalCycleConfigFromAgency(agency);
  const operationalCycle = resolveAgencyOperationalCycle(new Date(), cycleConfig);
  const phaseWork = resolveOperationalPhaseWork(dashboardData?.tasks || [], {
    agencyId,
    currentPhase: operationalCycle?.currentPhase || null,
    maxItems: 5,
  });

  return (
    <div className="-mx-4 min-h-[calc(100vh-4rem)] bg-gradient-to-b from-[#F5F2FC]/80 via-[#F8F7FB] to-transparent px-4 pb-8 pt-1 sm:-mx-6 sm:px-6">
    <div className="mx-auto max-w-4xl space-y-10 px-1 sm:px-0">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <h1 className="text-[1.375rem] font-bold tracking-tight text-[#18162A] sm:text-[1.5rem]">
            {greeting}
          </h1>
          <p className="text-sm text-[#7A7595]">{todayLabel}</p>
          <AgencyOperationalPhaseIndicator
            cycle={operationalCycle}
            phaseWork={phaseWork}
            compact
          />
        </div>
        {hasCampaigns ? (
          <Button
            type="button"
            className="w-full shrink-0 bg-[#6C47D8] hover:bg-[#5A3BC0] sm:w-auto"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Nova tarefa
          </Button>
        ) : (
          <Button asChild className="w-full shrink-0 bg-[#6C47D8] hover:bg-[#5A3BC0] sm:w-auto">
            <Link to={nextSetupStep?.href || createPageUrl('clients')}>
              <Plus className="mr-1.5 h-4 w-4" />
              {nextSetupStep?.cta || 'Começar'}
            </Link>
          </Button>
        )}
      </header>

      {attentionQueue.length > 0 ? (
        <section aria-labelledby="attention-heading">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <div className="min-w-0">
              <h2
                id="attention-heading"
                className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[#18162A]"
              >
                <AlertCircle className="h-4 w-4 text-[#c0392b]" aria-hidden />
                Precisa de atenção
              </h2>
              <p className="mt-0.5 text-xs text-[#7A7595]">
                Atrasos, bloqueios e o que não pode esperar.
              </p>
            </div>
            <Link
              to={createPageUrl('tasks-manager')}
              className="shrink-0 text-sm font-medium text-[#6C47D8] hover:underline"
            >
              Ver tarefas
            </Link>
          </div>
          <ul className="space-y-0.5 rounded-xl border border-[#F0B8BC] bg-[#FFF5F5] px-1.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
            {attentionQueue.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                showKindBadge
                variant="attention"
                onComplete={handleCompleteTask}
                completingId={completingId}
              />
            ))}
          </ul>
        </section>
      ) : hasCampaigns ? (
        <section
          aria-labelledby="attention-empty-heading"
          className="rounded-xl border border-dashed border-[#D9D4EC] bg-[#F5F2FC]/40 px-4 py-3"
        >
          <h2 id="attention-empty-heading" className="sr-only">
            Atenção
          </h2>
          <p className="text-sm text-[#7A7595]">
            {agenda[0]?.dueLabel
              ? `Nada urgente no momento — próximo prazo: ${agenda[0].dueLabel}${agenda[0].title ? ` · ${agenda[0].title}` : ''}.`
              : 'Nada urgente no momento. Quando houver atrasos ou bloqueios, eles aparecem aqui.'}
          </p>
        </section>
      ) : null}

      {(agenda.length > 0 || hasCampaigns) && (
        <section aria-labelledby="agenda-heading">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <div className="min-w-0">
              <h2
                id="agenda-heading"
                className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[#18162A]"
              >
                <CalendarDays className="h-4 w-4 text-[#6C47D8]" aria-hidden />
                Próximas 48h
              </h2>
              <p className="mt-0.5 text-xs text-[#7A7595]">
                Prazos de hoje e amanhã — inclusive internos.
              </p>
            </div>
            <Link
              to={createPageUrl('tasks-manager')}
              className="shrink-0 text-sm font-medium text-[#6C47D8] hover:underline"
            >
              Ver tarefas
            </Link>
          </div>
          {agenda.length > 0 ? (
            <ul className="space-y-0.5 rounded-xl border border-[#E8E5F5] bg-white px-1.5 py-1.5">
              {agenda.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  variant="agenda"
                  onComplete={handleCompleteTask}
                  completingId={completingId}
                />
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-[#E8E5F5] bg-white/60 px-4 py-3 text-sm text-[#7A7595]">
              Nada com prazo para hoje ou amanhã. Quando houver entregas, elas aparecem aqui.
            </p>
          )}
        </section>
      )}

      <section aria-labelledby="campaigns-heading" className="border-t border-[#E8E5F5] pt-8">
        <div className="mb-5 flex items-baseline justify-between gap-3">
          <h2 id="campaigns-heading" className="text-sm font-semibold uppercase tracking-wide text-[#7A7595]">
            {hasCampaigns ? 'Em andamento' : 'Clientes'}
          </h2>
          {hasCampaigns ? (
            <Link
              to={createPageUrl('clients')}
              className="text-sm font-medium text-[#6C47D8] hover:underline"
            >
              Todos os clientes
            </Link>
          ) : null}
        </div>

        {!hasCampaigns ? (
          <div className="space-y-8">
            <div className="mx-auto max-w-lg text-center sm:text-left">
              <h3 className="mb-2 text-lg font-semibold text-[#18162A]">
                Comece pelo seu primeiro cliente
              </h3>
              <p className="text-sm leading-relaxed text-[#7A7595]">
                Siga os passos abaixo. Em poucos minutos você já tem cliente, entrega e tarefas na home.
              </p>
            </div>

            <ol className="space-y-3">
              {setupSteps.map((step, index) => (
                <li
                  key={step.id}
                  className="flex gap-4 rounded-xl border border-[#E8E5F5] bg-white p-4"
                >
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      step.done
                        ? 'bg-[#e8f5e9] text-[#2e7d32]'
                        : 'bg-[#F5F2FC] text-[#7A7595]'
                    }`}
                    aria-hidden
                  >
                    {step.done ? <Check className="h-3.5 w-3.5" /> : index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-semibold ${
                        step.done ? 'text-[#7A7595] line-through' : 'text-[#18162A]'
                      }`}
                    >
                      {step.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-[#7A7595]">
                      {step.description}
                    </p>
                    {!step.done ? (
                      <Link
                        to={step.href}
                        className="mt-2 inline-flex items-center text-sm font-medium text-[#6C47D8] hover:underline"
                      >
                        {step.cta}
                        <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Link>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>

            {clientsWithoutService.length > 0 ? (
              <div>
                <p className="mb-3 text-sm font-medium text-[#18162A]">
                  Clientes sem entrega definida
                </p>
                <ul className="space-y-1">
                  {clientsWithoutService.map((client) => (
                    <li key={client.id}>
                      <Link
                        to={client.href}
                        className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-[#F5F2FC]/80"
                      >
                        <span className="truncate text-sm font-medium text-[#18162A]">
                          {client.name}
                        </span>
                        <span className="shrink-0 text-sm font-medium text-[#6C47D8]">
                          Definir entrega
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : clientsWithoutCampaigns.length > 0 ? (
              <div>
                <p className="mb-3 text-sm font-medium text-[#18162A]">
                  Clientes prontos para campanha
                </p>
                <ul className="space-y-1">
                  {clientsWithoutCampaigns.map((client) => (
                    <li key={client.id}>
                      <Link
                        to={client.href}
                        className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-[#F5F2FC]/80"
                      >
                        <span className="truncate text-sm font-medium text-[#18162A]">
                          {client.name}
                        </span>
                        <span className="shrink-0 text-sm font-medium text-[#6C47D8]">
                          Criar campanha
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-10">
            {campaignGroups.map((group) => (
              <section key={group.clientId} className="space-y-4">
                <div className="border-b border-[#E8E5F5] pb-2">
                  <Link
                    to={group.href}
                    className="text-[15px] font-semibold text-[#18162A] hover:text-[#6C47D8]"
                  >
                    {group.clientName}
                  </Link>
                </div>

                <ul className="space-y-3">
                  {group.campaigns.map((campaign) => {
                    const period = campaign.cyclePeriod || campaign.cycleTitle || null;
                    const progress = campaign.progress || { completed: 0, total: 0 };
                    return (
                      <li key={campaign.id}>
                        <Link
                          to={campaign.href}
                          className="block rounded-xl border border-[#E8E5F5] bg-white p-5 transition-colors hover:border-[#c9c0e8] hover:bg-[#FCFBFE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C47D8]/40"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-base font-semibold text-[#18162A]">
                                {campaign.name}
                              </p>
                              {period ? (
                                <p className="mt-1 text-sm text-[#7A7595]">{period}</p>
                              ) : null}
                            </div>
                            <span className="inline-flex shrink-0 items-center text-sm font-medium text-[#6C47D8]">
                              Abrir
                              <ArrowRight className="ml-1 h-3.5 w-3.5" />
                            </span>
                          </div>
                          <CampaignProgressBar
                            completed={progress.completed || 0}
                            total={progress.total || 0}
                          />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </section>

      <TaskCreateModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => {
          setCreateOpen(false);
          loadDashboardData({ silent: true });
        }}
      />
    </div>
    </div>
  );
}
