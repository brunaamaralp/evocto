/**
 * Métricas e filas da home orientada à ação.
 * Fonte: arrays já carregados com filtro { agencyId } — sem inventar contagens.
 *
 * Definições canônicas (espelham taskFilterPresets + pendingApprovals):
 * - Atribuídas a mim: status aberto + assigneeId/assignedTo === userId
 * - Atrasadas: abertas com dueDate < início do dia local
 * - Hoje: abertas com dueDate no dia de hoje (não atrasadas)
 * - Próximas 48h: hoje + amanhã (dueDay ∈ [today, today+2))
 * - Minha ação: isAwaitingMyAction (responsável ou revisor; exclui waiting_client)
 * - Aguardando terceiros: isWaitingOnOthers
 * - Bloqueadas: status === blocked
 * - Aguardando cliente: isWaitingOnClient
 * - Aprovações: CyclePlan.pending_approval + ApprovalRequest.pending
 * - Campanhas ativas: deriveActiveCampaigns (ciclo approved|in_execution)
 * - Progresso: completed / total (exclui cancelled) via summarizeTasks
 */

import { createPageUrl } from '@/utils';
import {
  buildTasksManagerHref,
  getTaskAssigneeId,
  isAwaitingMyAction,
  isOpenTaskStatus,
  isTaskOverdue,
  isWaitingOnClient,
  isWaitingOnOthers,
  startOfLocalDay,
} from '@/lib/taskFilterPresets';

export function addLocalDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function parseDueDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Contagens da visão geral (totais reais, não fatias de UI).
 * @param {{ tasks: object[], userId?: string|null, todayStart?: Date, pendingApprovalCount?: number, activeCampaignCount?: number }}
 */
export function buildOverviewCounts({
  tasks = [],
  userId = null,
  todayStart = startOfLocalDay(),
  pendingApprovalCount = 0,
  activeCampaignCount = 0,
} = {}) {
  const open = tasks.filter(isOpenTaskStatus);
  const horizonEnd = addLocalDays(todayStart, 2);

  let myAssigned = 0;
  let myOverdue = 0;
  let myToday = 0;
  let myUpcoming48h = 0;
  let myAction = 0;
  let waitingOthers = 0;
  let agencyOverdue = 0;
  let agencyBlocked = 0;
  let waitingClient = 0;
  let agencyUpcoming48h = 0;

  for (const task of open) {
    const due = parseDueDate(task.dueDate);
    const dueDay = due ? startOfLocalDay(due) : null;
    const overdue = isTaskOverdue(task, todayStart);
    const in48h =
      dueDay && dueDay >= todayStart && dueDay < horizonEnd;
    const isToday = dueDay && dueDay.getTime() === todayStart.getTime();
    const status = String(task.status || '').toLowerCase();
    const assignedToMe =
      userId && String(getTaskAssigneeId(task) || '') === String(userId);

    if (overdue) agencyOverdue += 1;
    if (status === 'blocked') agencyBlocked += 1;
    if (isWaitingOnClient(task)) waitingClient += 1;
    if (in48h) agencyUpcoming48h += 1;

    if (assignedToMe) {
      myAssigned += 1;
      if (overdue) myOverdue += 1;
      if (isToday && !overdue) myToday += 1;
      if (in48h && !overdue) myUpcoming48h += 1;
    }

    if (userId && isAwaitingMyAction(task, userId)) myAction += 1;
    if (userId && isWaitingOnOthers(task, userId)) waitingOthers += 1;
  }

  return {
    myAssigned,
    myOverdue,
    myToday,
    myUpcoming48h,
    myAction,
    waitingOthers,
    agencyOverdue,
    agencyBlocked,
    waitingClient,
    agencyUpcoming48h,
    pendingApprovals: Number(pendingApprovalCount) || 0,
    activeCampaigns: Number(activeCampaignCount) || 0,
  };
}

/**
 * Cards da visão geral — só inclui métricas com ação útil.
 * Prioridade: o que exige ação (atrasadas, minha ação, aprovações) primeiro.
 */
export function buildOverviewActionCards(counts, { userId = null, lens = 'agency' } = {}) {
  const cards = [];

  if (lens === 'me' && userId) {
    if (counts.myOverdue > 0) {
      cards.push({
        id: 'my_overdue',
        label: 'Atrasadas',
        definition: 'Atribuídas a você com prazo anterior a hoje.',
        count: counts.myOverdue,
        tone: 'danger',
        href: buildTasksManagerHref({ preset: 'my_overdue' }),
      });
    }
    if (counts.myAction > 0) {
      cards.push({
        id: 'my_action',
        label: 'Sua ação',
        definition: 'Você é responsável ou revisor — sem espera de cliente.',
        count: counts.myAction,
        tone: 'primary',
        href: buildTasksManagerHref({ preset: 'my_action' }),
      });
    }
    if (counts.myToday > 0) {
      cards.push({
        id: 'my_today',
        label: 'Para hoje',
        definition: 'Prazo hoje, ainda abertas.',
        count: counts.myToday,
        tone: 'neutral',
        href: buildTasksManagerHref({ preset: 'my_open' }),
      });
    }
    if (counts.waitingOthers > 0) {
      cards.push({
        id: 'waiting_others',
        label: 'Dependem de terceiros',
        definition: 'Suas tarefas em espera de cliente, revisão ou desbloqueio.',
        count: counts.waitingOthers,
        tone: 'warning',
        href: buildTasksManagerHref({ preset: 'waiting_others' }),
      });
    }
    if (counts.myAssigned > 0 && cards.length < 2) {
      cards.push({
        id: 'my_assigned',
        label: 'Atribuídas a mim',
        definition: 'Tarefas abertas com você como responsável.',
        count: counts.myAssigned,
        tone: 'neutral',
        href: buildTasksManagerHref({ preset: 'my_open' }),
      });
    }
  } else {
    if (counts.agencyOverdue > 0) {
      cards.push({
        id: 'agency_overdue',
        label: 'Atrasadas',
        definition: 'Tarefas abertas da agência com prazo anterior a hoje.',
        count: counts.agencyOverdue,
        tone: 'danger',
        href: buildTasksManagerHref({}),
      });
    }
    if (counts.pendingApprovals > 0) {
      cards.push({
        id: 'approvals',
        label: 'Aguardando aprovação',
        definition: 'Planos de ciclo e solicitações com status pending.',
        count: counts.pendingApprovals,
        tone: 'warning',
        href: createPageUrl('approval-dashboard'),
      });
    }
    if (counts.agencyBlocked > 0) {
      cards.push({
        id: 'blocked',
        label: 'Bloqueadas',
        definition: 'Status blocked na agência.',
        count: counts.agencyBlocked,
        tone: 'danger',
        href: buildTasksManagerHref({}),
      });
    }
    if (counts.waitingClient > 0) {
      cards.push({
        id: 'waiting_client',
        label: 'Aguardando cliente',
        definition: 'Status waiting_client ou gatekeeper cliente pendente.',
        count: counts.waitingClient,
        tone: 'warning',
        href: buildTasksManagerHref({ preset: 'waiting_client' }),
      });
    }
    if (counts.agencyUpcoming48h > 0) {
      cards.push({
        id: 'upcoming',
        label: 'Próximas 48h',
        definition: 'Prazos de hoje e amanhã (agência).',
        count: counts.agencyUpcoming48h,
        tone: 'neutral',
        href: buildTasksManagerHref({}),
      });
    }
    if (counts.activeCampaigns > 0) {
      cards.push({
        id: 'campaigns',
        label: 'Campanhas ativas',
        definition: 'Campanhas com ciclo approved ou in_execution.',
        count: counts.activeCampaigns,
        tone: 'neutral',
        href: createPageUrl('clients'),
      });
    }
  }

  return cards.slice(0, 5);
}

/**
 * Agenda: hoje vs próximas (amanhã → +7 dias), sem atrasadas.
 */
export function buildAgendaBuckets(tasks, clients, todayStart, {
  userId = null,
  personalOnly = false,
  maxToday = 8,
  maxUpcoming = 8,
  upcomingDays = 7,
} = {}) {
  const todayItems = [];
  const upcomingItems = [];
  const horizonEnd = addLocalDays(todayStart, Math.max(2, upcomingDays));

  const resolveClientName = (clientId) => {
    if (!clientId) return 'Interno';
    const client = (clients || []).find((c) => String(c.id) === String(clientId));
    return client?.name || 'Interno';
  };

  for (const task of tasks) {
    if (!isOpenTaskStatus(task)) continue;
    if (String(task.status || '').toLowerCase() === 'blocked') continue;
    if (personalOnly && userId) {
      if (String(getTaskAssigneeId(task) || '') !== String(userId)) continue;
    }
    if (isTaskOverdue(task, todayStart)) continue;

    const due = parseDueDate(task.dueDate);
    if (!due) continue;
    const dueDay = startOfLocalDay(due);
    if (dueDay < todayStart || dueDay >= horizonEnd) continue;

    const diffDays = Math.round((dueDay - todayStart) / 86400000);
    let dueLabel = due.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    if (diffDays === 0) dueLabel = 'Hoje';
    else if (diffDays === 1) dueLabel = 'Amanhã';

    const item = {
      id: `task:${task.id}`,
      taskId: task.id,
      task,
      kind: 'agenda',
      title: task.title || 'Tarefa',
      clientName: resolveClientName(task.clientId),
      dueLabel,
      priority: String(task.priority || 'medium').toLowerCase(),
      sortAt: due.getTime(),
      dueDay,
    };

    if (dueDay.getTime() === todayStart.getTime()) {
      todayItems.push(item);
    } else {
      upcomingItems.push(item);
    }
  }

  const byDue = (a, b) => a.sortAt - b.sortAt;
  return {
    today: todayItems.sort(byDue).slice(0, maxToday),
    todayTotal: todayItems.length,
    upcoming: upcomingItems.sort(byDue).slice(0, maxUpcoming),
    upcomingTotal: upcomingItems.length,
  };
}

/**
 * Itens bloqueados / aguardando terceiros nas campanhas ativas.
 */
export function collectCampaignBlockers(campaignGroups = [], { max = 6 } = {}) {
  const items = [];
  for (const group of campaignGroups) {
    for (const campaign of group.campaigns || []) {
      const progress = campaign.progress || {};
      const overdue = Number(progress.overdue) || 0;
      if (overdue <= 0) continue;
      items.push({
        id: `blocker:${group.clientId}:${campaign.id}`,
        title: campaign.name || 'Campanha',
        clientName: group.clientName,
        href: campaign.href,
        overdue,
        definition: 'Tarefas abertas da campanha com prazo vencido.',
      });
    }
  }
  return items
    .sort((a, b) => b.overdue - a.overdue)
    .slice(0, max);
}

/**
 * Lente padrão: equipe começa em “Eu”; admin/owner em “Agência”.
 */
export function defaultWorkLensForRole(role) {
  const r = String(role || '').toLowerCase();
  if (r === 'owner' || r === 'admin') return 'agency';
  if (r === 'team') return 'me';
  return 'agency';
}
