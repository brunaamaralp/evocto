import { CyclePlan, Service, Task } from '@/api/entities';
import { scheduleDeliverablesFs } from '@/lib/deliverableScheduleCore';
import { buildTaskPayloadFromTemplate } from '@/lib/startDeliverableStage';
import { normalizeDeliverableTaskShapes } from '@/templates/cicloMensal4SemanasTemplate';
import { wirePhaseFinishToStartDependencies } from '@/lib/wirePhaseDependencies';
import { dueDateForTaskTemplate } from '@/lib/taskDueFromTemplate';

function formatCyclePeriod(startDate) {
  try {
    const d = new Date(`${String(startDate).slice(0, 10)}T12:00:00`);
    return d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
  } catch {
    return String(startDate || '').slice(0, 7);
  }
}

function addCalendarDays(ymd, days) {
  const d = new Date(`${String(ymd).slice(0, 10)}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Duplica um CyclePlan para um novo mês no mesmo serviço/cliente.
 *
 * @param {{
 *   sourceCyclePlanId: string,
 *   startDate: string,
 *   cyclePeriod?: string,
 *   generateTasks?: boolean,
 *   ownerId?: string,
 * }} opts
 */
export async function duplicateCycleForMonth(opts = {}) {
  const {
    sourceCyclePlanId,
    startDate,
    cyclePeriod: cyclePeriodOverride,
    generateTasks = true,
    ownerId,
  } = opts;

  if (!sourceCyclePlanId) throw new Error('sourceCyclePlanId é obrigatório');
  if (!startDate) throw new Error('startDate é obrigatório');

  const source = await CyclePlan.get(sourceCyclePlanId);
  if (!source) throw new Error('Ciclo de origem não encontrado');

  const agencyId = source.agencyId;
  const clientId = source.clientId || source.customerId;
  const serviceId = source.serviceId;

  if (!agencyId || !clientId || !serviceId) {
    throw new Error('Ciclo de origem incompleto (agency/client/service)');
  }

  let service = await Service.get(serviceId);
  if (!service) throw new Error('Serviço do ciclo não encontrado');

  const rawDeliverables = normalizeDeliverableTaskShapes(service.deliverables || []);
  if (rawDeliverables.length === 0) {
    throw new Error('Serviço sem deliverables para duplicar');
  }

  const scheduled = scheduleDeliverablesFs({
    startDate: String(startDate).slice(0, 10),
    deliverables: rawDeliverables.map((d) => ({
      ...d,
      status: 'not_started',
      started_at: null,
      completed_at: null,
      planned_start: undefined,
      planned_end: undefined,
    })),
  });

  const lastEnd = scheduled[scheduled.length - 1]?.planned_end;
  const endDate = lastEnd || addCalendarDays(startDate, 27);

  service = await Service.update(service.id, {
    deliverables: scheduled,
    start_date: String(startDate).slice(0, 10),
    end_date: endDate,
  });

  const sourcePlanData = source.planData || source.snapshot_data || {};
  const cyclePeriod = cyclePeriodOverride || formatCyclePeriod(startDate);

  const cyclePlan = await CyclePlan.create({
    agencyId,
    clientId,
    customerId: clientId,
    serviceId,
    cyclePeriod,
    status: 'approved',
    start_date: String(startDate).slice(0, 10),
    startDate: String(startDate).slice(0, 10),
    end_date: endDate,
    ownerId: ownerId || source.ownerId || null,
    planData: {
      ...sourcePlanData,
      prioridades: Array.isArray(sourcePlanData.prioridades)
        ? sourcePlanData.prioridades
        : [],
      entregaveisPrevistos: scheduled.map((d) => ({
        id: d.id,
        name: d.name,
        planned_start: d.planned_start,
        planned_end: d.planned_end,
        status: 'planned',
      })),
    },
    version: 'v1.0',
    source: 'duplicate_cycle_wizard',
    duplicated_from: source.id,
  });

  let tasks = [];
  let tasksCreated = 0;

  if (generateTasks) {
    for (const deliverable of scheduled) {
      const templates = deliverable.task_templates || [];
      for (const taskTemplate of templates) {
        const payload = buildTaskPayloadFromTemplate(taskTemplate, deliverable, service, {
          agencyId,
          startDate: deliverable.planned_start || startDate,
          cyclePlanId: cyclePlan.id,
        });
        payload.dueDate =
          dueDateForTaskTemplate(taskTemplate, deliverable) || payload.dueDate;
        payload.deliverableName = deliverable.name;
        const assignee = ownerId || source.ownerId;
        if (assignee) {
          payload.assignedTo = assignee;
          payload.assigneeId = assignee;
        }
        const created = await Task.create(payload);
        tasks.push(created);
        tasksCreated += 1;
      }
    }

    await wirePhaseFinishToStartDependencies(tasks, scheduled).catch(() => {});

    await CyclePlan.update(cyclePlan.id, { status: 'in_execution' }).catch(() => {});
  }

  return {
    success: true,
    service,
    cyclePlan: { ...cyclePlan, status: generateTasks ? 'in_execution' : cyclePlan.status },
    sourceCyclePlan: source,
    tasks,
    tasksCreated,
    startDate: String(startDate).slice(0, 10),
    endDate,
  };
}

export default duplicateCycleForMonth;
