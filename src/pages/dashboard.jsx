import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  Check,
  FolderOpen,
  Loader2,
  Plus,
  Search,
  ClipboardList,
} from 'lucide-react';
import { useSession } from '@/components/auth/SessionManager';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import LoadingState from '@/components/shared/LoadingState';
import ErrorState from '@/components/shared/ErrorState';
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
import { buildAgencyPortfolioRows } from '@/lib/buildAgencyPortfolioRows';
import { listCharges } from '@/lib/agencyFinance/api';
import { ymNow } from '@/lib/agencyFinance/constants';
import { getTaskStatusConfig } from '@/lib/taskStatusCanonical';
import {
  fetchPendingApprovals,
  mapPendingApprovalsForDashboard,
} from '@/lib/pendingApprovals';
import {
  buildAgendaBuckets,
  collectCampaignBlockers,
} from '@/lib/dashboardActionMetrics';
import { openGlobalSearch } from '@/components/search/GlobalSearch';
import {
  buildTasksManagerHref,
  isWaitingOnClient,
  isOpenTaskStatus,
} from '@/lib/taskFilterPresets';

function firstNameFromFullName(fullName) {
  const first = String(fullName || '')
    .trim()
    .split(/\s+/)[0];
  if (!first || first === 'Usuário') return '';
  return first;
}

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

function parseDueDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// isOpenTaskStatus / isWaitingOnClient — taskFilterPresets (fonte única)

function formatTimeLabel(due) {
  if (!due) return null;
  if (due.getHours() === 0 && due.getMinutes() === 0) return null;
  return due.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatDueLabel(due, todayStart, { withTime = false } = {}) {
  if (!due) return null;
  const dueDay = startOfLocalDay(due);
  const diffDays = Math.round((dueDay - todayStart) / 86400000);
  let base;
  if (diffDays < 0) {
    const n = Math.abs(diffDays);
    base = n === 1 ? 'Atrasada 1 dia' : `Atrasada ${n} dias`;
  } else if (diffDays === 0) {
    base = 'Hoje';
  } else if (diffDays === 1) {
    base = 'Amanhã';
  } else {
    base = due.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }
  if (!withTime) return base;
  const time = formatTimeLabel(due);
  return time ? `${base} · ${time}` : base;
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

function isMeetingTask(task) {
  return (
    task?.activityKind === 'meeting' ||
    task?.type === 'reuniao' ||
    task?.type === 'reuniao_alinhamento' ||
    (Array.isArray(task?.tags) && task.tags.includes('reuniao'))
  );
}

function buildTaskItem(task, clients, todayStart, kind) {
  const due = parseDueDate(task.dueDate);
  const meeting = isMeetingTask(task);
  return {
    id: `task:${task.id}`,
    taskId: task.id,
    task,
    kind,
    title: task.title || (meeting ? 'Reunião' : 'Tarefa'),
    clientName: resolveClientName(clients, task.clientId),
    dueLabel: formatDueLabel(due, todayStart, { withTime: meeting }),
    priority: String(task.priority || 'medium').toLowerCase(),
    sortAt: due ? due.getTime() : Number.MAX_SAFE_INTEGER,
  };
}

/**
 * Fila de atenção base: atrasadas, bloqueadas, aguardando cliente, aprovações.
 * Aprovações: CyclePlan + ApprovalRequest via mapPendingApprovalsForDashboard.
 * O foco da fase é mesclado depois via mergePhaseFocusIntoAttentionQueue.
 */
function buildAttentionQueue(tasks, clients, todayStart, approvalItems = []) {
  const items = [];
  const seen = new Set();

  const pushUnique = (item) => {
    if (seen.has(item.id)) return;
    seen.add(item.id);
    items.push(item);
  };

  for (const task of tasks) {
    if (!isOpenTaskStatus(task)) continue;
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

  for (const approval of approvalItems) {
    pushUnique({
      id: `approval:${approval.source}:${approval.id}`,
      kind: 'approval',
      title: approval.title,
      clientName: approval.approverName || null,
      dueLabel: 'Aprovação',
      priority: 'high',
      href: approval.href,
      sortAt: 0,
      completable: false,
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

function removeTaskFromDashboardData(prev, taskId) {
  if (!prev || !taskId) return prev;
  const removeId = `task:${taskId}`;
  const drop = (list) =>
    (list || []).filter((i) => i.id !== removeId && i.taskId !== taskId);
  const buckets = prev.agendaBuckets || { today: [], upcoming: [] };
  return {
    ...prev,
    attentionQueue: drop(prev.attentionQueue),
    agendaBuckets: {
      ...buckets,
      today: drop(buckets.today),
      upcoming: drop(buckets.upcoming),
    },
  };
}

function buildSetupSteps({ clients, campaignGroups, tasks, services = [] }) {
  const hasClients = clients.length > 0;
  const activeServices = (Array.isArray(services) ? services : []).filter(
    (s) => s?.is_template !== true && s?.is_active !== false
  );
  const hasService = activeServices.length > 0;
  const hasCampaigns = campaignGroups.length > 0;
  const hasOpenTasks = tasks.some(isOpenTaskStatus);
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
      return { label: 'Atrasada', className: 'text-[var(--color-danger)]' };
    case 'phase_focus':
      return { label: 'Fase', className: 'text-[var(--color-primary)]' };
    case 'blocked':
      return {
        label: getTaskStatusConfig('blocked').label,
        className: 'text-[var(--color-danger)]',
      };
    case 'waiting_client':
      return {
        label: getTaskStatusConfig('waiting_client').label,
        className: 'text-[var(--color-warning)]',
      };
    case 'waiting_others':
      return { label: 'Depende de terceiros', className: 'text-[var(--color-warning)]' };
    case 'my_action':
      return { label: 'Sua ação', className: 'text-[var(--color-primary)]' };
    case 'approval':
      return { label: 'Aprovar', className: 'text-[var(--color-warning)]' };
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
        <p className="truncate text-sm font-medium text-[#1A1210]">{item.title}</p>
        {secondaryLine ? (
          <p className="mt-0.5 truncate text-xs text-[#6B635C]">{secondaryLine}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {isAgenda && item.dueLabel ? (
          <span
            className={`text-[11px] font-medium tabular-nums ${
              item.dueLabel === 'Hoje' ? 'text-[#B80015]' : 'text-[#6B635C]'
            }`}
          >
            {item.dueLabel}
          </span>
        ) : null}
        {item.priority === 'high' && item.kind !== 'overdue' ? (
          <span className="text-xs font-medium text-[#c0392b]">Alta</span>
        ) : null}
        {badge ? (
          <span className={`text-xs font-medium ${badge.className}`}>{badge.label}</span>
        ) : null}
      </div>
    </>
  );

  const accent =
    variant === 'attention' && isOverdue
      ? 'border-l-[#c0392b]'
      : variant === 'attention'
        ? 'border-l-[#B80015]'
        : isAgenda
          ? 'border-l-transparent'
          : 'border-l-transparent';

  const rowClassName = [
    'flex min-w-0 flex-1 items-center justify-between gap-3 border-l-2 px-3 py-2.5 transition-colors hover:bg-[#FAFAFB]',
    accent,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <li className="flex items-center gap-0.5 border-b border-[#F0EEF7] last:border-b-0">
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
          className="mr-1 h-8 w-8 shrink-0 text-[#6B635C] hover:bg-[#eef7ee] hover:text-[#1a7f37]"
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
    <div className="mt-3 flex items-center gap-3">
      <div
        className="h-1 flex-1 overflow-hidden rounded-full bg-[#F0EEF7]"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progresso: ${pct}%`}
      >
        <div
          className="h-full rounded-full bg-[#B80015] transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="shrink-0 text-xs tabular-nums text-[#6B635C]">
        {completed}/{total}
      </span>
    </div>
  );
}

function financeToneClass(tone) {
  if (tone === 'danger') return 'text-[#c0392b]';
  if (tone === 'warning') return 'text-[#b45309]';
  if (tone === 'ok') return 'text-[#2e7d32]';
  return 'text-[#6B635C]';
}

function PortfolioSection({ portfolio }) {
  const rows = portfolio?.rows || [];
  if (rows.length === 0) return null;

  return (
    <section aria-labelledby="portfolio-heading">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2
          id="portfolio-heading"
          className="text-sm font-semibold tracking-tight text-[#1A1210]"
        >
          Carteira
          {portfolio.totalClients ? (
            <span className="ml-1.5 font-normal text-[#6B635C]">
              {portfolio.totalClients}
            </span>
          ) : null}
        </h2>
        <Link
          to={createPageUrl('clients')}
          className="shrink-0 text-sm font-medium text-[#B80015] hover:underline"
        >
          {portfolio.truncated ? 'Ver todos' : 'Clientes'}
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#E4DDD4]">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead>
            <tr className="border-b border-[#F0EEF7] bg-[#FAFAFB] text-xs text-[#6B635C]">
              <th className="px-3.5 py-2.5 font-medium">Cliente</th>
              <th className="px-3.5 py-2.5 font-medium">Campanhas</th>
              <th className="px-3.5 py-2.5 font-medium">Tarefas</th>
              <th className="px-3.5 py-2.5 font-medium">Financeiro</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-[#F0EEF7] last:border-0 hover:bg-[#FAFAFB]"
              >
                <td className="px-3.5 py-2.5">
                  <Link
                    to={row.href}
                    className="font-medium text-[#1A1210] hover:text-[#B80015]"
                  >
                    {row.name}
                  </Link>
                </td>
                <td className="px-3.5 py-2.5 tabular-nums text-[#6B635C]">
                  {row.campaignsActive > 0 ? row.campaignsActive : '—'}
                </td>
                <td className="px-3.5 py-2.5 text-[#6B635C]">
                  {row.openTasks > 0 ? (
                    <span className="tabular-nums">
                      {row.openTasks}
                      {row.overdueTasks > 0 ? (
                        <span className="ml-1.5 font-medium text-[#c0392b]">
                          {row.overdueTasks} atras.
                        </span>
                      ) : null}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className={`px-3.5 py-2.5 tabular-nums ${financeToneClass(row.financeTone)}`}>
                  {row.financeLabel}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
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
  const [createKind, setCreateKind] = useState('task');

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

      const [clients, services, tasks, briefs, cycles, chargesResult, pendingApprovals] =
        await Promise.all([
          safeFilter(Client, { agencyId }),
          safeFilter(Service, { agencyId, is_template: false }),
          safeFilter(Task, { agencyId }),
          safeFilter(Brief, { agencyId }),
          safeFilter(CyclePlan, { agencyId }),
          listCharges({ agencyId, month: ymNow(), limit: 500 }).catch((err) => {
            console.warn('[dashboard] charges failed:', err?.message || err);
            return [];
          }),
          fetchPendingApprovals(agencyId),
        ]);

      const charges = Array.isArray(chargesResult) ? chargesResult : [];
      const activeClients = clients.filter((c) => c.status === 'ativo');
      const clientsForCampaigns = activeClients.length > 0 ? activeClients : clients;
      const todayStart = startOfLocalDay();
      const approvalItems = mapPendingApprovalsForDashboard(pendingApprovals);

      const campaignGroups = groupCampaignsByClient(
        clientsForCampaigns,
        briefs,
        cycles,
        tasks,
        services
      );

      const portfolio = buildAgencyPortfolioRows({
        clients: clientsForCampaigns,
        campaignGroups,
        tasks,
        charges,
        todayStart,
        maxRows: 12,
        createClientHref: (clientId) =>
          createPageUrl(`client-detail?clientId=${clientId}`),
      });

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
        buildAttentionQueue(tasks, clients, todayStart, approvalItems),
        phaseFocusItems,
        { max: 8 }
      );
      const agendaBuckets = buildAgendaBuckets(tasks, clientsForCampaigns, todayStart, {
        upcomingDays: 7,
      });
      const campaignBlockers = collectCampaignBlockers(campaignGroups, { max: 5 });
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
        agendaBuckets,
        campaignBlockers,
        setupSteps,
        clientsWithoutCampaigns,
        clientsWithoutService,
        portfolio,
        tasks,
        pendingApprovalsReliable: Boolean(pendingApprovals?.reliable),
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
        setDashboardData((prev) => removeTaskFromDashboardData(prev, taskId));
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

        setDashboardData((prev) => removeTaskFromDashboardData(prev, task.id));

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
      <LoadingState
        variant="skeleton"
        size="page"
        message="Carregando dashboard…"
        className="min-h-[60vh]"
      />
    );
  }

  if (!agencyId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6">
        <div className="max-w-md text-center">
          <AlertCircle className="mx-auto mb-4 h-10 w-10 text-[#c0392b]" aria-hidden />
          <h2 className="mb-2 text-xl font-semibold text-[#1A1210]">Organização não encontrada</h2>
          <p className="mb-5 text-sm text-[#6B635C]">
            Sua conta não está vinculada a uma agência. Crie uma conta de agência ou peça um convite ao administrador.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild className="bg-[#B80015] hover:bg-[#8A0010]">
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
      <ErrorState
        title="Erro ao carregar"
        message={error}
        onRetry={loadDashboardData}
        showHomeButton={false}
      />
    );
  }

  const {
    campaignGroups,
    attentionQueue,
    agendaBuckets = { today: [], upcoming: [], todayTotal: 0, upcomingTotal: 0 },
    campaignBlockers = [],
    setupSteps,
    clientsWithoutCampaigns,
    clientsWithoutService = [],
    portfolio = { rows: [], totalClients: 0, truncated: false },
  } = dashboardData;
  const hasCampaigns = campaignGroups.length > 0;
  const portfolioRows = portfolio.rows || [];
  const FOCUS_CAMPAIGN_LIMIT = 6;
  const focusCampaigns = (() => {
    const flat = [];
    for (const group of campaignGroups) {
      for (const campaign of group.campaigns || []) {
        flat.push({
          ...campaign,
          clientName: group.clientName,
          clientHref: group.href,
          clientId: group.clientId,
        });
      }
    }
    return {
      items: flat.slice(0, FOCUS_CAMPAIGN_LIMIT),
      total: flat.length,
      truncated: flat.length > FOCUS_CAMPAIGN_LIMIT,
    };
  })();
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
  const agendaToday = agendaBuckets.today || [];
  const agendaUpcoming = agendaBuckets.upcoming || [];
  const agendaTodayTotal = agendaBuckets.todayTotal || 0;
  const agendaUpcomingTotal = agendaBuckets.upcomingTotal || 0;
  const attentionCount = attentionQueue.length;

  const hasWorkColumns =
    attentionCount > 0 || agendaToday.length > 0 || agendaUpcoming.length > 0;

  return (
    <div className="-mx-4 min-h-[calc(100vh-4rem)] bg-white px-4 pb-10 pt-2 sm:-mx-6 sm:px-6">
    <div className="mx-auto max-w-5xl space-y-8 sm:space-y-10">
      <header className="flex flex-col gap-4 border-b border-[#F0EEF7] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-[#1A1210] sm:text-[1.65rem]">
            {greeting}
          </h1>
          <p className="text-sm text-[#6B635C]">{todayLabel}</p>
          <div className="pt-1">
            <AgencyOperationalPhaseIndicator
              cycle={operationalCycle}
              phaseWork={phaseWork}
              compact
            />
          </div>
        </div>
        {hasCampaigns ? (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="w-full shrink-0 border-[#E4DDD4] sm:w-auto"
              onClick={() => {
                setCreateKind('meeting');
                setCreateOpen(true);
              }}
            >
              <CalendarDays className="mr-1.5 h-4 w-4" />
              Agendar reunião
            </Button>
            <Button
              type="button"
              className="w-full shrink-0 bg-[#B80015] hover:bg-[#8A0010] sm:w-auto"
              onClick={() => {
                setCreateKind('task');
                setCreateOpen(true);
              }}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Nova tarefa
            </Button>
          </div>
        ) : (
          <Button asChild className="w-full shrink-0 bg-[#B80015] hover:bg-[#8A0010] sm:w-auto">
            <Link to={nextSetupStep?.href || createPageUrl('clients')}>
              <Plus className="mr-1.5 h-4 w-4" />
              {nextSetupStep?.cta || 'Começar'}
            </Link>
          </Button>
        )}
      </header>

      {hasWorkColumns ? (
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-6">
          {attentionCount > 0 ? (
            <section aria-labelledby="attention-heading" className="min-w-0">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2
                  id="attention-heading"
                  className="flex items-center gap-2 text-sm font-semibold tracking-tight text-[#1A1210]"
                >
                  <AlertCircle className="h-4 w-4 text-[#c0392b]" aria-hidden />
                  Precisa de atenção
                  <span className="font-medium tabular-nums text-[#6B635C]">
                    · {attentionCount}
                  </span>
                </h2>
                <Link
                  to={buildTasksManagerHref({ preset: 'agency_overdue' })}
                  className="shrink-0 text-sm font-medium text-[#B80015] hover:underline"
                >
                  Ver todas
                </Link>
              </div>
              <ul className="overflow-hidden rounded-xl border border-[#E4DDD4]">
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
          ) : null}

          {(agendaToday.length > 0 || agendaUpcoming.length > 0) && (
            <section aria-labelledby="work-agenda-heading" className="min-w-0 space-y-4">
              <div className="flex items-baseline justify-between gap-3">
                <h2
                  id="work-agenda-heading"
                  className="flex items-center gap-2 text-sm font-semibold tracking-tight text-[#1A1210]"
                >
                  <CalendarDays className="h-4 w-4 text-[#B80015]" aria-hidden />
                  Agenda
                  {agendaTodayTotal > 0 ? (
                    <span className="font-medium tabular-nums text-[#6B635C]">
                      · hoje {agendaTodayTotal}
                    </span>
                  ) : agendaUpcomingTotal > 0 ? (
                    <span className="font-medium tabular-nums text-[#6B635C]">
                      · {agendaUpcomingTotal}
                    </span>
                  ) : null}
                </h2>
                <Link
                  to={buildTasksManagerHref({ preset: 'this_week' })}
                  className="shrink-0 text-sm font-medium text-[#B80015] hover:underline"
                >
                  Ver todas
                </Link>
              </div>

              {agendaToday.length > 0 ? (
                <div>
                  <h3 className="mb-2 text-xs font-medium text-[#6B635C]">
                    Hoje
                    {agendaTodayTotal > agendaToday.length
                      ? ` · ${agendaTodayTotal}`
                      : ''}
                  </h3>
                  <ul className="overflow-hidden rounded-xl border border-[#E4DDD4]">
                    {agendaToday.map((item) => (
                      <ItemRow
                        key={item.id}
                        item={item}
                        variant="agenda"
                        onComplete={handleCompleteTask}
                        completingId={completingId}
                      />
                    ))}
                  </ul>
                </div>
              ) : null}

              {agendaUpcoming.length > 0 ? (
                <div>
                  <h3 className="mb-2 text-xs font-medium text-[#6B635C]">
                    Em seguida
                    {agendaUpcomingTotal > agendaUpcoming.length
                      ? ` · ${agendaUpcomingTotal}`
                      : ''}
                  </h3>
                  <ul className="overflow-hidden rounded-xl border border-[#E4DDD4]">
                    {agendaUpcoming.map((item) => (
                      <ItemRow
                        key={item.id}
                        item={item}
                        variant="agenda"
                        onComplete={handleCompleteTask}
                        completingId={completingId}
                      />
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          )}
        </div>
      ) : hasCampaigns ? (
        <section
          aria-labelledby="work-empty-heading"
          className="rounded-xl border border-[#E4DDD4] px-5 py-6 sm:px-6"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-1">
              <h2
                id="work-empty-heading"
                className="flex items-center gap-2 text-sm font-semibold tracking-tight text-[#1A1210]"
              >
                <ClipboardList className="h-4 w-4 text-[#6B635C]" aria-hidden />
                Nada urgente na operação
              </h2>
              <p className="text-sm text-[#6B635C]">
                Sem atrasadas, bloqueios ou prazos nesta semana. Crie uma tarefa ou revise a lista.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="w-full shrink-0 border-[#E4DDD4] sm:w-auto"
                onClick={() => {
                  setCreateKind('task');
                  setCreateOpen(true);
                }}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Nova tarefa
              </Button>
              <Button asChild className="w-full shrink-0 bg-[#B80015] hover:bg-[#8A0010] sm:w-auto">
                <Link to={buildTasksManagerHref({ preset: 'this_week' })}>
                  Ver tarefas
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      {portfolioRows.length > 0 ? <PortfolioSection portfolio={portfolio} /> : null}

      <section aria-labelledby="campaigns-heading">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2
            id="campaigns-heading"
            className="text-sm font-semibold tracking-tight text-[#1A1210]"
          >
            {hasCampaigns ? 'Em andamento' : 'Clientes'}
          </h2>
          {hasCampaigns ? (
            <Link
              to={createPageUrl('clients')}
              className="text-sm font-medium text-[#B80015] hover:underline"
            >
              {focusCampaigns.truncated ? 'Ver todas' : 'Clientes'}
            </Link>
          ) : null}
        </div>

        {!hasCampaigns ? (
          <div className="space-y-8">
            <div className="mx-auto max-w-lg text-center sm:text-left">
              <h3 className="mb-2 text-lg font-semibold text-[#1A1210]">
                Comece pelo seu primeiro cliente
              </h3>
              <p className="text-sm leading-relaxed text-[#6B635C]">
                Siga os passos abaixo. Em poucos minutos você já tem cliente, entrega e tarefas na home.
              </p>
            </div>

            <ol className="space-y-3">
              {setupSteps.map((step, index) => (
                <li
                  key={step.id}
                  className="flex gap-4 rounded-xl border border-[#E4DDD4] p-4"
                >
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      step.done
                        ? 'bg-[#e8f5e9] text-[#2e7d32]'
                        : 'bg-[#FAFAFB] text-[#6B635C] ring-1 ring-[#E4DDD4]'
                    }`}
                    aria-hidden
                  >
                    {step.done ? <Check className="h-3.5 w-3.5" /> : index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-semibold ${
                        step.done ? 'text-[#6B635C] line-through' : 'text-[#1A1210]'
                      }`}
                    >
                      {step.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-[#6B635C]">
                      {step.description}
                    </p>
                    {!step.done ? (
                      <Link
                        to={step.href}
                        className="mt-2 inline-flex items-center text-sm font-medium text-[#B80015] hover:underline"
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
                <p className="mb-3 text-sm font-medium text-[#1A1210]">
                  Clientes sem entrega definida
                </p>
                <ul className="space-y-1">
                  {clientsWithoutService.map((client) => (
                    <li key={client.id}>
                      <Link
                        to={client.href}
                        className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-[#FAFAFB]"
                      >
                        <span className="truncate text-sm font-medium text-[#1A1210]">
                          {client.name}
                        </span>
                        <span className="shrink-0 text-sm font-medium text-[#B80015]">
                          Definir entrega
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : clientsWithoutCampaigns.length > 0 ? (
              <div>
                <p className="mb-3 text-sm font-medium text-[#1A1210]">
                  Clientes prontos para campanha
                </p>
                <ul className="space-y-1">
                  {clientsWithoutCampaigns.map((client) => (
                    <li key={client.id}>
                      <Link
                        to={client.href}
                        className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-[#FAFAFB]"
                      >
                        <span className="truncate text-sm font-medium text-[#1A1210]">
                          {client.name}
                        </span>
                        <span className="shrink-0 text-sm font-medium text-[#B80015]">
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
          <div className="space-y-6">
            {campaignBlockers.length > 0 ? (
              <div>
                <h3 className="mb-2 text-xs font-medium text-[#c0392b]">
                  Entregas com atraso
                </h3>
                <ul className="overflow-hidden rounded-xl border border-[#E4DDD4]">
                  {campaignBlockers.map((item) => (
                    <li
                      key={item.id}
                      className="border-b border-[#F0EEF7] last:border-b-0"
                    >
                      <Link
                        to={item.href}
                        className="flex items-center justify-between gap-3 border-l-2 border-l-[#c0392b] px-3 py-2.5 transition-colors hover:bg-[#FAFAFB]"
                        title={item.definition}
                      >
                        <span className="min-w-0 truncate text-sm font-medium text-[#1A1210]">
                          {item.title}
                          {item.clientName ? (
                            <span className="font-normal text-[#6B635C]">
                              {' '}
                              · {item.clientName}
                            </span>
                          ) : null}
                        </span>
                        <span className="shrink-0 text-xs font-medium text-[#c0392b]">
                          {item.overdue} atras.
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {focusCampaigns.items.map((campaign) => {
                const period = campaign.cyclePeriod || campaign.cycleTitle || null;
                const progress = campaign.progress || { completed: 0, total: 0 };
                const subtitle = [campaign.clientName, period].filter(Boolean).join(' · ');
                const overdue = Number(progress.overdue) || 0;
                return (
                  <li key={`${campaign.clientId}-${campaign.id}`}>
                    <Link
                      to={campaign.href}
                      className="block h-full rounded-xl border border-[#E4DDD4] p-4 transition-colors hover:border-[#c9c0e8] hover:bg-[#FAFAFB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B80015]/35"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#1A1210]">
                            {campaign.name}
                          </p>
                          {subtitle ? (
                            <p className="mt-0.5 truncate text-xs text-[#6B635C]">{subtitle}</p>
                          ) : null}
                          {overdue > 0 ? (
                            <p className="mt-1 text-xs font-medium text-[#c0392b]">
                              {overdue} atrasada{overdue === 1 ? '' : 's'}
                            </p>
                          ) : null}
                        </div>
                        <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-[#C9C0E8]" aria-hidden />
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
          </div>
        )}
      </section>

      <nav
        aria-label="Acesso rápido"
        className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[#F0EEF7] pt-6 text-sm"
      >
        <button
          type="button"
          className="inline-flex items-center gap-1.5 font-medium text-[#B80015] hover:underline"
          onClick={() => {
            setCreateKind('task');
            setCreateOpen(true);
          }}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Criar tarefa
        </button>
        <Link
          to={createPageUrl('clients')}
          className="inline-flex items-center gap-1.5 font-medium text-[#B80015] hover:underline"
        >
          <FolderOpen className="h-3.5 w-3.5" aria-hidden />
          Clientes
        </Link>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 font-medium text-[#B80015] hover:underline"
          onClick={() => openGlobalSearch()}
        >
          <Search className="h-3.5 w-3.5" aria-hidden />
          Buscar
        </button>
        <Link
          to={createPageUrl('approval-dashboard')}
          className="inline-flex items-center gap-1.5 font-medium text-[#B80015] hover:underline"
        >
          <ClipboardList className="h-3.5 w-3.5" aria-hidden />
          Aprovações
        </Link>
      </nav>

      <TaskCreateModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultKind={createKind}
        onSuccess={() => {
          setCreateOpen(false);
          loadDashboardData({ silent: true });
        }}
      />
    </div>
    </div>
  );
}
