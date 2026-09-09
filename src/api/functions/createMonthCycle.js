import { CyclePlan, Service, Task, Client, Profile } from '@/api/entities';
import { createServiceInstance } from '@/api/functions';
import { scheduleDeliverablesFs } from '@/lib/deliverableScheduleCore';
import { buildTaskPayloadFromTemplate } from '@/lib/startDeliverableStage';
import { normalizeDeliverableTaskShapes } from '@/templates/cicloMensal4SemanasTemplate';
import { wirePhaseFinishToStartDependencies } from '@/lib/wirePhaseDependencies';
import { dueDateForTaskTemplate } from '@/lib/taskDueFromTemplate';
import { wireTaskTemplateDependencies } from '@/lib/wireTaskTemplateDependencies';
import { resolveResponsavelAssignee } from '@/lib/resolveResponsavelAssignee';
import { ensureCicloMensalTemplate } from './ensureCicloMensalTemplate';

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
 * Cria um ciclo mensal a partir do template canônico editável (ou templateId informado).
 * O ciclo operacional é sempre uma instância de serviço derivada do template.
 *
 * @param {{
 *   agencyId: string,
 *   clientId: string,
 *   startDate: string, // YYYY-MM-DD
 *   templateId?: string,
 *   serviceId?: string, // reutilizar serviço existente
 *   serviceName?: string,
 *   generateTasks?: boolean,
 *   ownerId?: string,
 * }} opts
 */
export async function createMonthCycle(opts = {}) {
  const {
    agencyId,
    clientId,
    startDate,
    templateId,
    serviceId,
    serviceName,
    generateTasks = true,
    ownerId,
  } = opts;

  if (!agencyId) throw new Error('agencyId é obrigatório');
  if (!clientId) throw new Error('clientId é obrigatório');
  if (!startDate) throw new Error('startDate é obrigatório');

  const client = await Client.get(clientId).catch(() => null);
  if (!client) throw new Error('Cliente não encontrado');

  const profiles = await Profile.filter({ agencyId }).catch(() => []);

  let templateServiceId = templateId;
  if (!templateServiceId && !serviceId) {
    const seeded = await ensureCicloMensalTemplate(agencyId);
    templateServiceId = seeded.id;
  }

  let service;
  if (serviceId) {
    service = await Service.get(serviceId);
    if (!service) throw new Error('Serviço não encontrado');
    if (service.is_template) throw new Error('Selecione uma instância de serviço, não um template');
  } else {
    const result = await createServiceInstance({
      templateId: templateServiceId,
      clientId,
      customizations: {
        name:
          serviceName ||
          `${client.name || client.company_name || 'Cliente'} — Ciclo Mensal de Campanhas`,
        start_date: String(startDate).slice(0, 10),
      },
    });
    service = result.serviceInstance || result.data;
    if (!service?.id) throw new Error('Falha ao criar instância do serviço');
  }

  const rawDeliverables = normalizeDeliverableTaskShapes(service.deliverables || []);
  const scheduled = scheduleDeliverablesFs({
    startDate: String(startDate).slice(0, 10),
    deliverables: rawDeliverables,
  });

  const lastEnd = scheduled[scheduled.length - 1]?.planned_end;
  const endDate = lastEnd || addCalendarDays(startDate, 27);

  service = await Service.update(service.id, {
    deliverables: scheduled,
    start_date: String(startDate).slice(0, 10),
    end_date: endDate,
  });

  const cyclePeriod = formatCyclePeriod(startDate);
  const cyclePlan = await CyclePlan.create({
    agencyId,
    clientId,
    customerId: clientId,
    serviceId: service.id,
    cyclePeriod,
    status: 'approved',
    start_date: String(startDate).slice(0, 10),
    startDate: String(startDate).slice(0, 10),
    end_date: endDate,
    ownerId: ownerId || null,
    planData: {
      prioridades: [],
      ajustesEstrategicos: {},
      pendenciasCliente: [],
      entregaveisPrevistos: scheduled.map((d) => ({
        id: d.id,
        name: d.name,
        planned_start: d.planned_start,
        planned_end: d.planned_end,
        status: 'planned',
      })),
    },
    version: 'v1.0',
    source: 'new_month_cycle_wizard',
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

        // Responsável do template -> assignee na tarefa
        const resolved = resolveResponsavelAssignee(
          profiles,
          taskTemplate?.responsavel || taskTemplate?.assignee_role || ''
        );
        if (resolved) {
          payload.assigneeId = resolved.assigneeId;
          payload.assignedTo = resolved.assigneeId;
          payload.assigneeName = resolved.assigneeName;
        } else if (ownerId) {
          // Fallback: se não resolveu responsavel, atribui ao ownerId do ciclo (se existir)
          payload.assignedTo = ownerId;
          payload.assigneeId = ownerId;
        }

        const created = await Task.create(payload);
        tasks.push(created);
        tasksCreated += 1;
      }
    }

    await wirePhaseFinishToStartDependencies(tasks, scheduled).catch(() => {});
    await wireTaskTemplateDependencies(tasks, scheduled).catch(() => {});

    await CyclePlan.update(cyclePlan.id, { status: 'in_execution' }).catch(() => {});
  }

  return {
    success: true,
    service,
    cyclePlan: { ...cyclePlan, status: generateTasks ? 'in_execution' : cyclePlan.status },
    tasks,
    tasksCreated,
    startDate: String(startDate).slice(0, 10),
    endDate,
  };
}

export default createMonthCycle;
