/**
 * Derivações do hub por lente de serviço.
 * Puro / testável — sem I/O.
 *
 * UI ainda não consome (PR2); PR1 valida a taxonomia com dados.
 */

import { createPageUrl } from '@/utils';
import { buildClientCampaignHref } from '@/lib/campaignHref';
import { buildClientTasksHref, getTaskBriefIds, getTaskCycleIds } from '@/lib/taskScope';
import {
  formatPeriodLabel,
  getServiceOperationProfile,
  OPERATION_PATTERNS,
  PERIOD_MODES,
  resolvePeriodKey,
  UNIT_KINDS,
} from '@/lib/serviceOperationProfile';

const DONE_TASK_STATUSES = new Set(['completed', 'done']);
const CANCELLED_TASK_STATUSES = new Set(['cancelled', 'canceled']);
const ACTIVE_CYCLE_STATUSES = new Set(['approved', 'in_execution']);
const INCOMPLETE_BRIEF_STATUSES = new Set(['DRAFT', 'IN_REVIEW', 'draft', 'in_review']);

function summarizeTaskList(tasks = [], now = new Date()) {
  const actionable = (Array.isArray(tasks) ? tasks : []).filter(
    (t) => t?.id && !CANCELLED_TASK_STATUSES.has(String(t.status || ''))
  );
  const completed = actionable.filter((t) =>
    DONE_TASK_STATUSES.has(String(t.status || ''))
  );
  const pending = actionable.filter(
    (t) => !DONE_TASK_STATUSES.has(String(t.status || ''))
  );
  const inProgress = pending.filter((t) => String(t.status || '') === 'in_progress');
  const overdue = pending.filter((t) => t.dueDate && new Date(t.dueDate) < now);
  const total = actionable.length;
  const percentComplete = total > 0 ? Math.round((completed.length / total) * 100) : 0;
  return {
    total,
    completed: completed.length,
    pending: pending.length,
    inProgress: inProgress.length,
    overdue: overdue.length,
    percentComplete,
  };
}

function briefCycleId(brief) {
  return brief?.ciclo_id || brief?.cycleId || brief?.cyclePlanId || null;
}

function cycleBriefId(cycle) {
  return (
    cycle?.briefId ||
    cycle?.briefingId ||
    cycle?.planData?.briefId ||
    cycle?.planData?.briefingId ||
    null
  );
}

function isCampaignBrief(brief) {
  if (!brief) return false;
  if (brief.brief_kind === 'campanha_anual') return false;
  if (brief.brief_kind === 'campanha_mensal') return true;
  return Boolean(brief.nome_campanha);
}

export function isActiveContractedService(service) {
  if (!service?.id || service.is_template) return false;
  if (service.is_active === false) return false;
  const status = String(service.service_status || '').toLowerCase();
  return !['cancelled', 'archived', 'completed'].includes(status);
}

export function getActiveContractedServices(services = []) {
  return (Array.isArray(services) ? services : []).filter(isActiveContractedService);
}

export function isRootServiceTask(task) {
  if (!task?.id) return false;
  if (task.parentTaskId || task.parent_task_id || task.parentId) return false;
  if (CANCELLED_TASK_STATUSES.has(String(task.status || ''))) return false;
  return true;
}

/**
 * Progresso de etapas (checklist) de uma task-unidade.
 */
export function summarizeChecklistProgress(task) {
  const checklist = Array.isArray(task?.checklist) ? task.checklist : [];
  if (checklist.length > 0) {
    const completed = checklist.filter((c) => c?.completed).length;
    const total = checklist.length;
    return {
      kind: 'steps',
      total,
      completed,
      pending: total - completed,
      percentComplete: Math.round((completed / total) * 100),
      overdue: 0,
      inProgress: 0,
    };
  }
  const done = DONE_TASK_STATUSES.has(String(task?.status || ''));
  return {
    kind: 'status',
    total: 1,
    completed: done ? 1 : 0,
    pending: done ? 0 : 1,
    percentComplete: done ? 100 : 0,
    overdue: 0,
    inProgress: String(task?.status || '') === 'in_progress' ? 1 : 0,
  };
}

export function statusLabelFromTask(task, progress) {
  if (DONE_TASK_STATUSES.has(String(task?.status || ''))) return 'Entregue';
  if (progress?.kind === 'steps' && progress.total > 0) {
    if (progress.completed >= progress.total) return 'Entregue';
    if (progress.completed > 0) return 'Em andamento';
    return 'A iniciar';
  }
  const status = String(task?.status || '').toLowerCase();
  if (status === 'in_progress') return 'Em andamento';
  if (status === 'in_review' || status === 'pending_approval') return 'Aguardando aprovação';
  if (status === 'blocked') return 'Bloqueada';
  return 'Pendente';
}

/**
 * Resolve serviceId de uma task via task → cycle → brief.
 */
export function resolveEntityServiceId(entity, { cyclesById, briefsById } = {}) {
  if (!entity) return null;
  if (entity.serviceId) return String(entity.serviceId);

  for (const cycleId of getTaskCycleIds(entity)) {
    const cycle = cyclesById?.get?.(String(cycleId));
    if (cycle?.serviceId) return String(cycle.serviceId);
  }

  const briefIds = typeof getTaskBriefIds === 'function' ? getTaskBriefIds(entity) : [];
  for (const briefId of briefIds) {
    const brief = briefsById?.get?.(String(briefId));
    if (brief?.serviceId) return String(brief.serviceId);
    const linkedCycleId = briefCycleId(brief);
    if (linkedCycleId) {
      const cycle = cyclesById?.get?.(String(linkedCycleId));
      if (cycle?.serviceId) return String(cycle.serviceId);
    }
  }

  // Brief-like entity
  if (entity.brief_kind || entity.nome_campanha) {
    const linkedCycleId = briefCycleId(entity);
    if (linkedCycleId) {
      const cycle = cyclesById?.get?.(String(linkedCycleId));
      if (cycle?.serviceId) return String(cycle.serviceId);
    }
  }

  return null;
}

function buildCycleIndex(cycles = []) {
  const cyclesById = new Map();
  for (const cycle of cycles) {
    if (cycle?.id) cyclesById.set(String(cycle.id), cycle);
  }
  return cyclesById;
}

function buildBriefIndex(briefs = []) {
  const briefsById = new Map();
  for (const brief of briefs) {
    if (brief?.id) briefsById.set(String(brief.id), brief);
  }
  return briefsById;
}

function tasksForService(tasks, serviceId) {
  const sid = String(serviceId);
  return (Array.isArray(tasks) ? tasks : []).filter(
    (t) => t?.id && String(t.serviceId || '') === sid
  );
}

function cyclesForService(cycles, serviceId) {
  const sid = String(serviceId);
  return (Array.isArray(cycles) ? cycles : []).filter(
    (c) => c?.id && String(c.serviceId || '') === sid
  );
}

/**
 * Tasks-raiz do serviço que representam unidades (não fases de campanha).
 * Exclui tarefas vinculadas a briefing — essas pertencem a campaign_brief.
 */
export function selectServiceUnitTasks(tasks, serviceId) {
  return tasksForService(tasks, serviceId).filter((task) => {
    if (!isRootServiceTask(task)) return false;
    if (getTaskBriefIds(task).length > 0) return false;
    return true;
  });
}

function buildTaskUnit({ task, serviceId, clientId, cycleId }) {
  const progress = summarizeChecklistProgress(task);
  return {
    id: task.id,
    kind: UNIT_KINDS.TASK,
    title: task.title || 'Sem título',
    status: task.status || null,
    statusLabel: statusLabelFromTask(task, progress),
    progress,
    serviceId: String(serviceId),
    cycleId: cycleId || getTaskCycleIds(task)[0] || null,
    href: createPageUrl(
      buildClientTasksHref({
        clientId,
        serviceId,
        cycleId: cycleId || getTaskCycleIds(task)[0] || null,
        briefingId: null,
      })
    ),
    tasksHref: createPageUrl(
      buildClientTasksHref({
        clientId,
        serviceId,
        cycleId: cycleId || getTaskCycleIds(task)[0] || null,
      })
    ),
    source: task,
  };
}

function buildCampaignUnit({
  brief,
  cycle,
  tasks,
  serviceId,
  clientId,
  now,
}) {
  const cycleId = cycle?.id || briefCycleId(brief);
  const campaignTasks = (Array.isArray(tasks) ? tasks : []).filter((task) =>
    getTaskBriefIds(task).includes(String(brief.id))
  );
  const cycleTasks =
    cycleId && campaignTasks.length === 0
      ? (Array.isArray(tasks) ? tasks : []).filter((task) =>
          getTaskCycleIds(task).includes(String(cycleId))
        )
      : [];
  const scoped = campaignTasks.length > 0 ? campaignTasks : cycleTasks;
  const progress = summarizeTaskList(scoped, now || new Date());
  const progressScope =
    campaignTasks.length > 0 ? 'campaign' : cycleTasks.length > 0 ? 'cycle' : 'none';

  return {
    id: brief.id,
    kind: UNIT_KINDS.CAMPAIGN_BRIEF,
    title: brief.nome_campanha || brief.title || 'Campanha',
    status: brief.status_campanha || brief.status || null,
    statusLabel: null,
    progress: {
      kind: 'tasks',
      total: progress.total,
      completed: progress.completed,
      pending: progress.pending,
      inProgress: progress.inProgress,
      overdue: progress.overdue,
      percentComplete: progress.percentComplete,
    },
    progressScope,
    serviceId: String(serviceId),
    cycleId: cycleId ? String(cycleId) : null,
    href: createPageUrl(
      buildClientCampaignHref({
        clientId,
        briefingId: brief.id,
      })
    ),
    tasksHref: createPageUrl(
      buildClientTasksHref({
        clientId,
        serviceId,
        cycleId,
        briefingId: brief.id,
      })
    ),
    source: brief,
  };
}

function emptyLensResult(service, profile) {
  return {
    profile,
    serviceId: service?.id ? String(service.id) : null,
    operationPattern: profile.operationPattern,
    periodMode: profile.periodMode,
    unitKind: profile.unitKind,
    groups: [],
    singleProject: null,
    unitsCount: 0,
  };
}

function groupTaskUnitsByPeriod(units, cyclesById, periodMode) {
  if (periodMode !== PERIOD_MODES.MONTHLY) {
    return [
      {
        periodKey: null,
        periodLabel: null,
        cycleId: null,
        units,
      },
    ];
  }

  const groups = new Map();

  for (const unit of units) {
    const cycle = unit.cycleId ? cyclesById.get(String(unit.cycleId)) : null;
    const periodKey =
      resolvePeriodKey(cycle) ||
      resolvePeriodKey(unit.source?.startDate || unit.source?.dueDate) ||
      'sem-periodo';
    const periodLabel =
      periodKey === 'sem-periodo'
        ? 'Sem período'
        : formatPeriodLabel(cycle) || formatPeriodLabel(periodKey);

    if (!groups.has(periodKey)) {
      groups.set(periodKey, {
        periodKey: periodKey === 'sem-periodo' ? null : periodKey,
        periodLabel: periodKey === 'sem-periodo' ? null : periodLabel,
        cycleId: unit.cycleId || cycle?.id || null,
        units: [],
      });
    }
    groups.get(periodKey).units.push(unit);
  }

  return Array.from(groups.values()).sort((a, b) => {
    const ak = a.periodKey || '';
    const bk = b.periodKey || '';
    return bk.localeCompare(ak);
  });
}

function deriveTaskUnits({ service, profile, cycles, tasks, clientId }) {
  const serviceId = service.id;
  const unitTasks = selectServiceUnitTasks(tasks, serviceId);
  const cyclesById = buildCycleIndex(cyclesForService(cycles, serviceId));
  const units = unitTasks.map((task) =>
    buildTaskUnit({
      task,
      serviceId,
      clientId,
      cycleId: getTaskCycleIds(task)[0] || null,
    })
  );

  const groups = groupTaskUnitsByPeriod(units, cyclesById, profile.periodMode);

  return {
    profile,
    serviceId: String(serviceId),
    operationPattern: profile.operationPattern,
    periodMode: profile.periodMode,
    unitKind: profile.unitKind,
    groups,
    singleProject: null,
    unitsCount: units.length,
  };
}

function deriveCampaignUnits({
  service,
  profile,
  cycles,
  briefs,
  tasks,
  clientId,
  now,
}) {
  const serviceId = String(service.id);
  const serviceCycles = cyclesForService(cycles, serviceId);
  const activeCycles = serviceCycles.filter((c) =>
    ACTIVE_CYCLE_STATUSES.has(String(c?.status || ''))
  );
  const activeCycleById = new Map(activeCycles.map((c) => [String(c.id), c]));
  const cyclesByBriefId = new Map();
  for (const cycle of activeCycles) {
    const bid = cycleBriefId(cycle);
    if (bid) cyclesByBriefId.set(String(bid), cycle);
  }

  const campaignBriefs = (Array.isArray(briefs) ? briefs : []).filter((brief) => {
    if (!isCampaignBrief(brief)) return false;
    if (
      INCOMPLETE_BRIEF_STATUSES.has(brief?.status) &&
      brief.brief_kind !== 'campanha_mensal'
    ) {
      return false;
    }
    const linkedCycleId = briefCycleId(brief);
    const cycle =
      (linkedCycleId && activeCycleById.get(String(linkedCycleId))) ||
      cyclesByBriefId.get(String(brief.id)) ||
      null;

    const briefServiceId = brief.serviceId
      ? String(brief.serviceId)
      : cycle?.serviceId
        ? String(cycle.serviceId)
        : null;

    if (briefServiceId !== serviceId) return false;
    // Em andamento: precisa de ciclo ativo (mesmo critério do hub atual)
    return Boolean(cycle);
  });

  const units = campaignBriefs.map((brief) => {
    const linkedCycleId = briefCycleId(brief);
    const cycle =
      (linkedCycleId && activeCycleById.get(String(linkedCycleId))) ||
      cyclesByBriefId.get(String(brief.id)) ||
      null;
    return buildCampaignUnit({
      brief,
      cycle,
      tasks,
      serviceId,
      clientId,
      now,
    });
  });

  const groupsMap = new Map();
  for (const unit of units) {
    const cycle = unit.cycleId ? activeCycleById.get(String(unit.cycleId)) : null;
    const periodKey = resolvePeriodKey(cycle) || 'sem-periodo';
    const periodLabel =
      periodKey === 'sem-periodo'
        ? null
        : formatPeriodLabel(cycle) || formatPeriodLabel(periodKey);

    if (!groupsMap.has(periodKey)) {
      groupsMap.set(periodKey, {
        periodKey: periodKey === 'sem-periodo' ? null : periodKey,
        periodLabel,
        cycleId: unit.cycleId || null,
        units: [],
      });
    }
    groupsMap.get(periodKey).units.push(unit);
  }

  const groups =
    profile.periodMode === PERIOD_MODES.MONTHLY
      ? Array.from(groupsMap.values()).sort((a, b) =>
          String(b.periodKey || '').localeCompare(String(a.periodKey || ''))
        )
      : [
          {
            periodKey: null,
            periodLabel: null,
            cycleId: null,
            units,
          },
        ];

  return {
    profile,
    serviceId,
    operationPattern: profile.operationPattern,
    periodMode: profile.periodMode,
    unitKind: profile.unitKind,
    groups,
    singleProject: null,
    unitsCount: units.length,
  };
}

function checklistStepsFromTask(task) {
  const checklist = Array.isArray(task?.checklist) ? task.checklist : [];
  return checklist.map((item, index) => ({
    id: item.id || `step-${index}`,
    title: item.text || item.title || `Etapa ${index + 1}`,
    completed: Boolean(item.completed),
    order: item.order ?? index,
  }));
}

function deriveSingleProject({ service, profile, tasks, clientId }) {
  const serviceId = String(service.id);
  const candidates = selectServiceUnitTasks(tasks, serviceId).sort((a, b) => {
    const ad = new Date(a.created_date || a.createdAt || 0).getTime();
    const bd = new Date(b.created_date || b.createdAt || 0).getTime();
    return ad - bd;
  });
  const mainTask = candidates[0] || null;

  if (!mainTask) {
    return {
      profile,
      serviceId,
      operationPattern: profile.operationPattern,
      periodMode: profile.periodMode,
      unitKind: profile.unitKind,
      groups: [],
      singleProject: {
        ready: false,
        title: service.name || 'Projeto',
        taskId: null,
        statusLabel: 'Não iniciado',
        progress: {
          kind: 'steps',
          total: 0,
          completed: 0,
          pending: 0,
          percentComplete: 0,
        },
        steps: [],
        href: createPageUrl(
          buildClientTasksHref({ clientId, serviceId })
        ),
      },
      unitsCount: 0,
    };
  }

  const progress = summarizeChecklistProgress(mainTask);
  const steps = checklistStepsFromTask(mainTask);

  return {
    profile,
    serviceId,
    operationPattern: profile.operationPattern,
    periodMode: profile.periodMode,
    unitKind: profile.unitKind,
    groups: [],
    singleProject: {
      ready: true,
      title: mainTask.title || service.name || 'Projeto',
      taskId: mainTask.id,
      statusLabel: statusLabelFromTask(mainTask, progress),
      progress,
      steps,
      href: createPageUrl(
        buildClientTasksHref({
          clientId,
          serviceId,
          cycleId: getTaskCycleIds(mainTask)[0] || null,
        })
      ),
      source: mainTask,
    },
    unitsCount: 1,
  };
}

/**
 * Unidade operacional visível na lente de um serviço.
 *
 * @param {{
 *   service: object,
 *   cycles?: object[],
 *   briefs?: object[],
 *   tasks?: object[],
 *   clientId?: string,
 *   now?: Date,
 * }} args
 */
export function deriveServiceLensUnits({
  service,
  cycles = [],
  briefs = [],
  tasks = [],
  clientId = null,
  now = new Date(),
} = {}) {
  if (!service?.id) {
    return emptyLensResult(service, getServiceOperationProfile(service));
  }

  const profile = getServiceOperationProfile(service);

  if (profile.operationPattern === OPERATION_PATTERNS.SINGLE_PROJECT) {
    return deriveSingleProject({ service, profile, tasks, clientId });
  }

  if (profile.unitKind === UNIT_KINDS.CAMPAIGN_BRIEF) {
    return deriveCampaignUnits({
      service,
      profile,
      cycles,
      briefs,
      tasks,
      clientId,
      now,
    });
  }

  return deriveTaskUnits({
    service,
    profile,
    cycles,
    tasks,
    clientId,
  });
}

/**
 * Anexa serviceId resolvido a itens de atenção.
 */
export function attachAttentionServiceIds(
  attentionItems = [],
  { tasks = [], cycles = [], briefs = [], approvals = [] } = {}
) {
  const cyclesById = buildCycleIndex(cycles);
  const briefsById = buildBriefIndex(briefs);
  const taskById = new Map(
    (Array.isArray(tasks) ? tasks : []).filter((t) => t?.id).map((t) => [String(t.id), t])
  );
  const approvalById = new Map(
    (Array.isArray(approvals) ? approvals : [])
      .filter((a) => a?.id)
      .map((a) => [String(a.id), a])
  );

  return attentionItems.map((item) => {
    if (item?.serviceId) return { ...item, serviceId: String(item.serviceId) };

    let serviceId = null;

    if (item?.type?.startsWith('task_')) {
      const taskId = String(item.id || '').replace(/^task-(overdue|urgent)-/, '');
      const task = taskById.get(taskId);
      serviceId = resolveEntityServiceId(task, { cyclesById, briefsById });
    } else if (item?.type === 'cycle_pending') {
      const cycleId = String(item.id || '').replace(/^cycle-pending-/, '');
      const cycle = cyclesById.get(cycleId);
      serviceId = cycle?.serviceId ? String(cycle.serviceId) : null;
    } else if (item?.type === 'brief_incomplete') {
      const briefId = String(item.id || '').replace(/^brief-/, '');
      const brief = briefsById.get(briefId);
      serviceId = resolveEntityServiceId(brief, { cyclesById, briefsById });
    } else if (item?.type === 'approval_pending') {
      const approvalId = String(item.id || '').replace(/^approval-/, '');
      const approval = approvalById.get(approvalId);
      serviceId = approval?.serviceId
        ? String(approval.serviceId)
        : resolveEntityServiceId(approval, { cyclesById, briefsById });
    }

    return { ...item, serviceId: serviceId || null };
  });
}

/**
 * Filtra atenção pela lente ativa.
 * Itens sem serviceId não entram na lente (evitam poluir badges).
 */
export function filterAttentionForService(attentionItems = [], serviceId) {
  if (!serviceId) return attentionItems;
  const sid = String(serviceId);
  return attentionItems.filter((item) => item?.serviceId && String(item.serviceId) === sid);
}

/**
 * Contagem de pendências por serviço (para badges nos segmentos).
 * @returns {Record<string, number>}
 */
export function deriveAttentionCountsByService(attentionItems = [], serviceIds = []) {
  const counts = {};
  for (const id of serviceIds) {
    counts[String(id)] = 0;
  }
  for (const item of attentionItems) {
    if (!item?.serviceId) continue;
    const sid = String(item.serviceId);
    if (Object.prototype.hasOwnProperty.call(counts, sid)) {
      counts[sid] += 1;
    } else {
      counts[sid] = (counts[sid] || 0) + 1;
    }
  }
  return counts;
}

/**
 * Escolhe a lente inicial.
 */
export function resolveSelectedServiceId(services = [], preferredServiceId = null) {
  const active = getActiveContractedServices(services);
  if (!active.length) return null;
  if (preferredServiceId) {
    const match = active.find((s) => String(s.id) === String(preferredServiceId));
    if (match) return String(match.id);
  }
  return String(active[0].id);
}

export default deriveServiceLensUnits;
