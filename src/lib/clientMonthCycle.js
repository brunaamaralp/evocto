import { CyclePlan, Service, Task, Profile } from '@/api/entities';
import { createMonthCycle } from '@/api/functions/createMonthCycle';
import { scheduleDeliverablesFs } from '@/lib/deliverableScheduleCore';
import { buildTaskPayloadFromTemplate } from '@/lib/startDeliverableStage';
import { normalizeDeliverableTaskShapes } from '@/templates/cicloMensal4SemanasTemplate';
import { flattenTaskTemplates } from '@/templates/cicloNarrativa7FasesTemplate';
import { wirePhaseFinishToStartDependencies } from '@/lib/wirePhaseDependencies';
import { dueDateForTaskTemplate } from '@/lib/taskDueFromTemplate';
import { wireTaskTemplateDependencies } from '@/lib/wireTaskTemplateDependencies';
import { resolveResponsavelAssignee } from '@/lib/resolveResponsavelAssignee';
import {
  applyCicloComercialSla,
  buildNarrativaDeliverablesByTipo,
  normalizeCicloComercialOps,
  normalizeTipoCampanha,
} from '@/lib/tipoCampanhaPipeline';

const ACTIVE_CYCLE_STATUSES = new Set(['approved', 'in_execution']);

export function monthKeyFromYmd(ymd) {
  return String(ymd || '').slice(0, 7);
}

export function formatClientMonthCycleTitle(ymd) {
  try {
    const d = new Date(`${String(ymd).slice(0, 10)}T12:00:00`);
    const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  } catch {
    return monthKeyFromYmd(ymd) || 'Ciclo do mês';
  }
}

export function cycleMonthKey(cycle) {
  const start = cycle?.startDate || cycle?.start_date;
  if (start) return monthKeyFromYmd(start);
  return null;
}

/**
 * Busca o ciclo operacional do cliente no mês (YYYY-MM).
 */
export async function findClientMonthCycle({ agencyId, clientId, monthKey }) {
  if (!agencyId || !clientId || !monthKey) return null;
  const list = await CyclePlan.filter({ agencyId, clientId }).catch(() => []);
  const cycles = Array.isArray(list) ? list : [];
  return (
    cycles.find(
      (c) =>
        ACTIVE_CYCLE_STATUSES.has(String(c?.status || '')) &&
        cycleMonthKey(c) === monthKey
    ) || null
  );
}

/**
 * Garante 1 ciclo por cliente/mês. Reutiliza se já existir.
 */
export async function ensureClientMonthCycle({
  agencyId,
  clientId,
  startDate,
  serviceId = null,
  serviceName = null,
  ownerId = null,
  empresaNome = null,
} = {}) {
  if (!agencyId) throw new Error('agencyId é obrigatório');
  if (!clientId) throw new Error('clientId é obrigatório');
  if (!startDate) throw new Error('startDate é obrigatório');

  const ymd = String(startDate).slice(0, 10);
  const monthKey = monthKeyFromYmd(ymd);
  const title = formatClientMonthCycleTitle(ymd);

  const existing = await findClientMonthCycle({ agencyId, clientId, monthKey });
  if (existing?.id) {
    let service = null;
    if (existing.serviceId) {
      service = await Service.get(existing.serviceId).catch(() => null);
    }
    // Normaliza título do ciclo para o mês (não o nome de uma campanha)
    let cyclePlan = existing;
    if (!existing.title || existing.title !== title) {
      cyclePlan =
        (await CyclePlan.update(existing.id, {
          title,
          cyclePeriod: existing.cyclePeriod || title,
        }).catch(() => existing)) || existing;
    }
    return {
      cyclePlan,
      service,
      created: false,
      monthKey,
      title: cyclePlan.title || cyclePlan.cyclePeriod || title,
    };
  }

  const result = await createMonthCycle({
    agencyId,
    clientId,
    startDate: ymd,
    serviceId: serviceId || undefined,
    serviceName:
      serviceName ||
      `${empresaNome || 'Cliente'} — ${title}`,
    title,
    generateTasks: false,
    ownerId,
    pipeline: 'narrativa',
    briefId: null,
  });

  const cyclePlan = result?.cyclePlan;
  if (!cyclePlan?.id) {
    throw new Error('Não foi possível criar o ciclo do mês');
  }

  // Título canônico do mês (não o nome de uma campanha)
  const normalized = await CyclePlan.update(cyclePlan.id, {
    title,
    cyclePeriod: cyclePlan.cyclePeriod || title,
    briefId: null,
  }).catch(() => cyclePlan);

  return {
    cyclePlan: normalized || cyclePlan,
    service: result?.service || null,
    created: true,
    monthKey,
    title,
  };
}

function applyAssignee(payload, profiles, taskTemplate, ownerId) {
  const resolved = resolveResponsavelAssignee(
    profiles,
    taskTemplate?.responsavel || taskTemplate?.assignee_role || ''
  );
  if (resolved) {
    payload.assigneeId = resolved.assigneeId;
    payload.assignedTo = resolved.assigneeId;
    payload.assigneeName = resolved.assigneeName;
  } else if (ownerId) {
    payload.assignedTo = ownerId;
    payload.assigneeId = ownerId;
  }
  return payload;
}

function prefixCampaignIds(scheduled, briefingId) {
  const prefix = String(briefingId || '').slice(-8) || 'camp';
  const rewriteId = (id) => (id ? `${prefix}__${id}` : id);

  return scheduled.map((d) => {
    const newDeliverableId = rewriteId(d.id);
    const templates = (d.task_templates || d.tasks || []).map((t) => ({
      ...t,
      id: rewriteId(t.id),
      deliverableId: newDeliverableId,
      bloqueador: t.bloqueador ? rewriteId(t.bloqueador) : null,
      subtarefas: (Array.isArray(t.subtarefas) ? t.subtarefas : []).map((s) => ({
        ...s,
        id: rewriteId(s.id),
        parent_template_id: rewriteId(t.id),
        bloqueador: s.bloqueador ? rewriteId(s.bloqueador) : null,
      })),
    }));
    return {
      ...d,
      id: newDeliverableId,
      task_templates: templates,
      tasks: templates,
    };
  });
}

/**
 * Gera tarefas de uma campanha dentro de um ciclo já existente (cliente/mês).
 */
export async function generateCampaignTasksOnCycle({
  agencyId,
  cyclePlan,
  service,
  briefing,
  startDate,
  ownerId = null,
  tipo_campanha: tipoRaw = '5_videos',
  ciclo_comercial: cicloRaw = '',
  linha_focal = '',
} = {}) {
  if (!agencyId) throw new Error('agencyId é obrigatório');
  if (!cyclePlan?.id) throw new Error('cyclePlan é obrigatório');
  if (!service?.id) throw new Error('service é obrigatório');
  if (!briefing?.id) throw new Error('briefing é obrigatório');

  const ymd = String(startDate || cyclePlan.startDate || cyclePlan.start_date || '')
    .slice(0, 10);
  if (!ymd) throw new Error('startDate é obrigatório');

  const tipo_campanha = normalizeTipoCampanha(tipoRaw);
  const ciclo_comercial = normalizeCicloComercialOps(cicloRaw);
  const profiles = await Profile.filter({ agencyId }).catch(() => []);

  const rawDeliverables = normalizeDeliverableTaskShapes(
    buildNarrativaDeliverablesByTipo(tipo_campanha)
  );
  const withCicloSla = applyCicloComercialSla(rawDeliverables, ciclo_comercial);
  const scheduledBase = scheduleDeliverablesFs({
    startDate: ymd,
    deliverables: withCicloSla,
  }).map((d, idx) =>
    idx === 0
      ? {
          ...d,
          status: 'in_progress',
          started_at: new Date().toISOString(),
        }
      : d
  );
  const scheduled = prefixCampaignIds(scheduledBase, briefing.id);

  const flat = flattenTaskTemplates(scheduled);
  const deliverableById = new Map(scheduled.map((d) => [String(d.id), d]));
  const tasks = [];
  let tasksCreated = 0;

  for (const taskTemplate of flat) {
    if (taskTemplate.parent_template_id) continue;
    const deliverable = deliverableById.get(String(taskTemplate.deliverableId));
    if (!deliverable) continue;

    const payload = buildTaskPayloadFromTemplate(taskTemplate, deliverable, service, {
      agencyId,
      startDate: deliverable.planned_start || ymd,
      cyclePlanId: cyclePlan.id,
      briefId: briefing.id,
    });
    payload.cycleId = cyclePlan.id;
    payload.dueDate =
      dueDateForTaskTemplate(taskTemplate, deliverable) || payload.dueDate;
    payload.deliverableName = deliverable.name;
    payload.campaignName = briefing.nome_campanha || briefing.title || null;
    payload.gatekeeper = taskTemplate.gatekeeper || deliverable.gatekeeper || null;
    payload.gate_status =
      taskTemplate.gate_status || (payload.gatekeeper ? 'pendente' : null);
    payload.pipeline = 'narrativa';
    payload.parentTaskId = null;
    applyAssignee(payload, profiles, taskTemplate, ownerId);

    const created = await Task.create(payload);
    tasks.push(created);
    tasksCreated += 1;

    const subtarefas = Array.isArray(taskTemplate.subtarefas)
      ? taskTemplate.subtarefas
      : [];
    for (const sub of subtarefas) {
      const subPayload = buildTaskPayloadFromTemplate(sub, deliverable, service, {
        agencyId,
        startDate: deliverable.planned_start || ymd,
        cyclePlanId: cyclePlan.id,
        briefId: briefing.id,
      });
      subPayload.cycleId = cyclePlan.id;
      subPayload.dueDate =
        dueDateForTaskTemplate(sub, deliverable) || subPayload.dueDate;
      subPayload.deliverableName = deliverable.name;
      subPayload.campaignName = briefing.nome_campanha || briefing.title || null;
      subPayload.pipeline = 'narrativa';
      subPayload.parentTaskId = created.id;
      applyAssignee(subPayload, profiles, sub, ownerId);
      const subCreated = await Task.create(subPayload);
      tasks.push(subCreated);
      tasksCreated += 1;
    }
  }

  const syntheticDeliverables = [
    {
      id: '__all__',
      task_templates: flat.map((t) => ({
        id: t.id,
        bloqueador: t.bloqueador,
        title: t.title,
      })),
    },
  ];
  await wireTaskTemplateDependencies(tasks, syntheticDeliverables).catch(() => {});
  await wirePhaseFinishToStartDependencies(
    tasks.filter((t) => !t.parentTaskId),
    scheduled
  ).catch(() => {});

  const prevPlan = cyclePlan.planData && typeof cyclePlan.planData === 'object'
    ? cyclePlan.planData
    : {};
  const prevCampaigns = Array.isArray(prevPlan.campaignBriefIds)
    ? prevPlan.campaignBriefIds.map(String)
    : [];
  if (!prevCampaigns.includes(String(briefing.id))) {
    prevCampaigns.push(String(briefing.id));
  }

  const updatedCycle = await CyclePlan.update(cyclePlan.id, {
    status: 'in_execution',
    planData: {
      ...prevPlan,
      campaignBriefIds: prevCampaigns,
      pipeline: 'narrativa',
    },
  }).catch(() => ({ ...cyclePlan, status: 'in_execution' }));

  return {
    tasks,
    tasksCreated,
    cyclePlan: updatedCycle,
    tipo_campanha,
    ciclo_comercial,
    linha_focal,
  };
}

export default {
  monthKeyFromYmd,
  formatClientMonthCycleTitle,
  findClientMonthCycle,
  ensureClientMonthCycle,
  generateCampaignTasksOnCycle,
};
