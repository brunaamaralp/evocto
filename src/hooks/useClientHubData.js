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

const DONE_TASK_STATUSES = new Set(['completed', 'done', 'cancelled', 'canceled']);
const ACTIVE_CYCLE_STATUSES = new Set(['approved', 'in_execution']);
const INCOMPLETE_BRIEF_STATUSES = new Set(['DRAFT', 'IN_REVIEW', 'draft', 'in_review']);
const URGENT_PRIORITIES = new Set(['high', 'urgent', 'critical', 'alta', 'urgente']);

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
    if (!task?.id || DONE_TASK_STATUSES.has(task.status)) continue;
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
    } else if (urgent && ['todo', 'in_progress', 'pending'].includes(task.status)) {
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

  return {
    activeServices,
    activeCycles,
    pendingApprovals,
    attentionItems,
    counts: {
      services: activeServices.length,
      cyclesActive: activeCycles.length,
      approvalsPending: pendingApprovals.length,
      attention: attentionItems.length,
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
