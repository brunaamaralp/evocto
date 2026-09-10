import { useState, useEffect, useCallback, useMemo } from 'react';
import { Client } from '@/api/entities';
import { Service } from '@/api/entities';
import { CyclePlan } from '@/api/entities';
import { ApprovalRequest } from '@/api/entities';
import { Brief } from '@/api/entities';
import { Task } from '@/api/entities';
import { ClientDocument } from '@/api/entities';
import { LearningEntry } from '@/api/entities';
import { EvolutionEvent } from '@/api/entities';
import { FinancialKPI } from '@/api/entities';
import { createPageUrl } from '@/utils';
import {
  buildClientTasksHref,
  getTaskBriefIds,
  getTaskCycleIds,
} from '@/lib/taskScope';
import { buildClientCampaignHref } from '@/lib/campaignHref';

const DONE_TASK_STATUSES = new Set(['completed', 'done']);
const CANCELLED_TASK_STATUSES = new Set(['cancelled', 'canceled']);
const CLOSED_TASK_STATUSES = new Set([...DONE_TASK_STATUSES, ...CANCELLED_TASK_STATUSES]);
const ACTIVE_CYCLE_STATUSES = new Set(['approved', 'in_execution']);
const INCOMPLETE_BRIEF_STATUSES = new Set(['DRAFT', 'IN_REVIEW', 'draft', 'in_review']);
const ACTIVE_CAMPAIGN_BRIEF_STATUSES = new Set([
  'READY',
  'APPROVED',
  'IN_REVIEW',
  'in_review',
  'ready',
  'approved',
]);
const URGENT_PRIORITIES = new Set(['high', 'urgent', 'critical', 'alta', 'urgente']);
const PENDING_TASK_STATUSES = new Set(['todo', 'in_progress', 'pending', 'in_review', 'blocked']);

function briefCycleId(brief) {
  return brief?.ciclo_id || brief?.cycleId || brief?.cyclePlanId || null;
}

function isCampaignBrief(brief) {
  if (!brief) return false;
  if (brief.brief_kind === 'campanha_anual') return false;
  if (brief.brief_kind === 'campanha_mensal') return true;
  return Boolean(brief.nome_campanha);
}

export function summarizeTasks(tasks = [], now = new Date()) {
  const actionable = tasks.filter(
    (t) => t?.id && !CANCELLED_TASK_STATUSES.has(String(t.status || ''))
  );
  const completed = actionable.filter((t) => DONE_TASK_STATUSES.has(String(t.status || '')));
  const pending = actionable.filter((t) => !DONE_TASK_STATUSES.has(String(t.status || '')));
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

/**
 * Campanhas em andamento (várias por ciclo). Progresso por briefing quando as
 * tarefas têm briefingId; senão, progresso compartilhado do ciclo.
 */
export function deriveActiveCampaigns({
  briefs = [],
  cycles = [],
  tasks = [],
  services = [],
  clientId,
  now = new Date(),
}) {
  const activeCycles = cycles.filter((c) => ACTIVE_CYCLE_STATUSES.has(c?.status));
  const activeCycleById = new Map(activeCycles.map((c) => [String(c.id), c]));
  const serviceById = new Map(services.map((s) => [String(s.id), s]));

  const tasksByCycle = new Map();
  for (const task of tasks) {
    for (const cycleId of getTaskCycleIds(task)) {
      if (!tasksByCycle.has(cycleId)) tasksByCycle.set(cycleId, []);
      tasksByCycle.get(cycleId).push(task);
    }
  }

  const campaignBriefs = briefs.filter((brief) => {
    if (!isCampaignBrief(brief)) return false;
    if (INCOMPLETE_BRIEF_STATUSES.has(brief?.status) && brief.brief_kind !== 'campanha_mensal') {
      return false;
    }
    const cicloId = briefCycleId(brief);
    if (cicloId) return activeCycleById.has(String(cicloId));
    return ACTIVE_CAMPAIGN_BRIEF_STATUSES.has(brief?.status);
  });

  return campaignBriefs
    .map((brief) => {
      const cicloId = briefCycleId(brief);
      const cycle = cicloId ? activeCycleById.get(String(cicloId)) : null;
      const cycleTasks = cicloId ? tasksByCycle.get(String(cicloId)) || [] : [];
      const campaignTasks = tasks.filter((task) =>
        getTaskBriefIds(task).includes(String(brief.id))
      );
      const hasCampaignScopedTasks = campaignTasks.length > 0;
      const scopedTasks = hasCampaignScopedTasks
        ? campaignTasks
        : cycleTasks.length > 0
          ? cycleTasks
          : brief.serviceId
            ? tasks.filter((t) => String(t.serviceId || '') === String(brief.serviceId))
            : [];
      const progress = summarizeTasks(scopedTasks, now);
      const service =
        (cycle?.serviceId && serviceById.get(String(cycle.serviceId))) ||
        (brief.serviceId && serviceById.get(String(brief.serviceId))) ||
        null;
      const resolvedCycleId = cycle?.id || cicloId || null;
      const resolvedServiceId = service?.id || cycle?.serviceId || brief.serviceId || null;

      return {
        id: brief.id,
        name: brief.nome_campanha || brief.title || 'Campanha',
        status: brief.status || brief.status_campanha || null,
        briefKind: brief.brief_kind || 'campanha_mensal',
        cycleId: resolvedCycleId,
        cycleTitle: cycle?.title || cycle?.cyclePeriod || null,
        cycleStatus: cycle?.status || null,
        cyclePeriod: cycle?.cyclePeriod || null,
        serviceId: resolvedServiceId,
        serviceName: service?.name || null,
        progress,
        progressScope: hasCampaignScopedTasks
          ? 'campaign'
          : cycleTasks.length > 0
            ? 'cycle'
            : brief.serviceId
              ? 'service'
              : 'none',
        href: createPageUrl(
          buildClientCampaignHref({
            clientId,
            briefingId: brief.id,
          })
        ),
        briefingHref: createPageUrl(
          `client-briefing?clientId=${clientId}&briefingId=${brief.id}`
        ),
        tasksHref: createPageUrl(
          buildClientTasksHref({
            clientId,
            cycleId: resolvedCycleId,
            briefingId: brief.id,
            serviceId: resolvedServiceId,
          })
        ),
        cycleHref: createPageUrl(
          cycle?.serviceId
            ? `delivery-workspace?serviceId=${cycle.serviceId}&section=tasks`
            : `client-services?clientId=${clientId}`
        ),
      };
    })
    .sort((a, b) => {
      const cycleCmp = String(a.cycleTitle || '').localeCompare(String(b.cycleTitle || ''));
      if (cycleCmp !== 0) return cycleCmp;
      return String(a.name).localeCompare(String(b.name));
    });
}

async function safeFilter(entity, filters, order) {
  try {
    const result = order != null
      ? await entity.filter(filters, order)
      : await entity.filter(filters);
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.warn('[useClientHubData] filter failed:', error?.message || error);
    return [];
  }
}

function dedupeById(items = []) {
  const map = new Map();
  for (const item of items) {
    if (item?.id) map.set(item.id, item);
  }
  return Array.from(map.values());
}

export function buildAttentionItems({
  tasks = [],
  cycles = [],
  approvals = [],
  briefs = [],
  clientId,
}) {
  const items = [];
  const now = new Date();

  for (const task of tasks) {
    if (!task?.id || CLOSED_TASK_STATUSES.has(String(task.status || ''))) continue;
    const overdue = task.dueDate && new Date(task.dueDate) < now;
    const urgent = URGENT_PRIORITIES.has(String(task.priority || '').toLowerCase());

    if (overdue) {
      items.push({
        id: `task-overdue-${task.id}`,
        type: 'task_overdue',
        label: 'Tarefa atrasada',
        title: task.title || 'Tarefa sem título',
        href: createPageUrl(`client-tasks?clientId=${clientId}`),
        priority: 1,
      });
    } else if (urgent && PENDING_TASK_STATUSES.has(String(task.status || ''))) {
      items.push({
        id: `task-urgent-${task.id}`,
        type: 'task_urgent',
        label: 'Tarefa urgente',
        title: task.title || 'Tarefa sem título',
        href: createPageUrl(`client-tasks?clientId=${clientId}`),
        priority: 2,
      });
    }
  }

  for (const approval of approvals) {
    if (approval?.status !== 'pending') continue;
    items.push({
      id: `approval-${approval.id}`,
      type: 'approval_pending',
      label: 'Aprovação pendente',
      title: approval.title || approval.subject || 'Solicitação de aprovação',
      href: createPageUrl(`approval-dashboard?clientId=${clientId}`),
      priority: 1,
    });
  }

  for (const cycle of cycles) {
    if (cycle?.status !== 'pending_approval') continue;
    items.push({
      id: `cycle-pending-${cycle.id}`,
      type: 'cycle_pending',
      label: 'Ciclo aguardando aprovação',
      title: cycle.title || 'Ciclo sem título',
      href: createPageUrl(`client-services?clientId=${clientId}`),
      priority: 2,
    });
  }

  for (const brief of briefs) {
    if (!INCOMPLETE_BRIEF_STATUSES.has(brief?.status)) continue;
    items.push({
      id: `brief-${brief.id}`,
      type: 'brief_incomplete',
      label: 'Briefing incompleto',
      title: brief.title || 'Briefing',
      href: createPageUrl(
        `client-briefing?clientId=${clientId}&briefingId=${brief.id}`
      ),
      priority: 3,
    });
  }

  return items
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 7);
}

export function deriveHubMetrics({
  services = [],
  cycles = [],
  approvals = [],
  briefs = [],
  tasks = [],
  documents = [],
  learnings = [],
  evolutionEvents = [],
  kpis = [],
  clientId,
}) {
  const activeServices = services.filter((s) => s.is_active !== false && !s.is_template);
  const activeCycles = cycles.filter((c) => ACTIVE_CYCLE_STATUSES.has(c.status));
  const pendingApprovals = approvals.filter((a) => a.status === 'pending');
  const attentionItems = buildAttentionItems({
    tasks,
    cycles,
    approvals,
    briefs,
    clientId,
  });
  const taskStats = summarizeTasks(tasks);
  const activeCampaigns = deriveActiveCampaigns({
    briefs,
    cycles,
    tasks,
    services,
    clientId,
  });

  return {
    activeServices,
    activeCycles,
    activeCampaigns,
    pendingApprovals,
    attentionItems,
    taskStats,
    counts: {
      services: activeServices.length,
      cyclesActive: activeCycles.length,
      campaignsActive: activeCampaigns.length,
      approvalsPending: pendingApprovals.length,
      attention: attentionItems.length,
      tasksPending: taskStats.pending,
      tasksOverdue: taskStats.overdue,
      tasksInProgress: taskStats.inProgress,
      tasksCompleted: taskStats.completed,
      percentComplete: taskStats.percentComplete,
      briefs: briefs.length,
      documents: documents.length,
      learnings: learnings.length,
      evolution: evolutionEvents.length,
      kpis: kpis.length,
    },
  };
}

/**
 * Loader único do hub do cliente (operação + conhecimento).
 * Entidades ainda sem tabela retornam [] com segurança.
 */
export default function useClientHubData(clientId, agencyId) {
  const [client, setClient] = useState(null);
  const [services, setServices] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [briefs, setBriefs] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [learnings, setLearnings] = useState([]);
  const [evolutionEvents, setEvolutionEvents] = useState([]);
  const [kpis, setKpis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    if (!clientId || !agencyId) {
      setLoading(false);
      setError(!clientId ? 'ID do cliente não encontrado na URL' : 'Agency ID não encontrado');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const clientData = await Client.get(clientId);
      if (!clientData) {
        setClient(null);
        setError('Cliente não encontrado');
        return;
      }
      if (clientData.agencyId !== agencyId) {
        setClient(null);
        setError('Cliente não encontrado ou sem permissão de acesso');
        return;
      }

      const [
        servicesData,
        cyclesData,
        approvalsData,
        briefsByClient,
        briefsByProject,
        tasksData,
        documentsData,
        learningsByProject,
        learningsByClient,
        evolutionData,
        kpisData,
      ] = await Promise.all([
        safeFilter(Service, { agencyId, clientId, is_template: false }),
        safeFilter(CyclePlan, { agencyId, clientId }),
        safeFilter(ApprovalRequest, { agencyId, clientId }),
        safeFilter(Brief, { agencyId, clientId }),
        safeFilter(Brief, { agencyId, projectId: clientId }),
        safeFilter(Task, { agencyId, clientId }),
        safeFilter(ClientDocument, { agencyId, clientId }, '-created_date'),
        // Aprendizados: legado usa projectId === clientId; schema novo também indexa clientId
        safeFilter(LearningEntry, { agencyId, projectId: clientId }, '-created_date'),
        safeFilter(LearningEntry, { agencyId, clientId }, '-created_date'),
        safeFilter(EvolutionEvent, { agencyId, clientId }, '-date'),
        safeFilter(FinancialKPI, { agencyId, clientId }),
      ]);

      setClient(clientData);
      setServices(servicesData);
      setCycles(cyclesData);
      setApprovals(approvalsData);
      setBriefs(dedupeById([...briefsByClient, ...briefsByProject]));
      setTasks(tasksData);
      setDocuments(documentsData);
      setLearnings(dedupeById([...learningsByProject, ...learningsByClient]));
      setEvolutionEvents(evolutionData);
      setKpis(kpisData);
    } catch (err) {
      console.error('[useClientHubData]', err);
      setError(err.message || 'Erro ao carregar cliente');
      setClient(null);
    } finally {
      setLoading(false);
    }
  }, [clientId, agencyId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const metrics = useMemo(
    () =>
      deriveHubMetrics({
        services,
        cycles,
        approvals,
        briefs,
        tasks,
        documents,
        learnings,
        evolutionEvents,
        kpis,
        clientId,
      }),
    [
      services,
      cycles,
      approvals,
      briefs,
      tasks,
      documents,
      learnings,
      evolutionEvents,
      kpis,
      clientId,
    ]
  );

  return {
    client,
    services,
    cycles,
    approvals,
    briefs,
    tasks,
    documents,
    learnings,
    evolutionEvents,
    kpis,
    loading,
    error,
    reload,
    ...metrics,
  };
}
