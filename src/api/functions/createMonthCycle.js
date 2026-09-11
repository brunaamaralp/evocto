import { CyclePlan, Service, Task, Client, Profile } from '@/api/entities';
import { createServiceInstance } from '@/api/functions';
import { scheduleDeliverablesFs } from '@/lib/deliverableScheduleCore';
import { buildTaskPayloadFromTemplate } from '@/lib/startDeliverableStage';
import { normalizeDeliverableTaskShapes } from '@/templates/cicloMensal4SemanasTemplate';
import { flattenTaskTemplates } from '@/templates/cicloNarrativa7FasesTemplate';
import {
  formatItemCycleTitle,
  getItemCycleOption,
  isItemCyclePipelineKey,
  isItemCycleService,
  resolveItemCycleDisplayName,
  resolveItemCyclePipeline,
} from '@/templates/itemCycleTemplateHelpers';
import { wirePhaseFinishToStartDependencies } from '@/lib/wirePhaseDependencies';
import { dueDateForTaskTemplate } from '@/lib/taskDueFromTemplate';
import { wireTaskTemplateDependencies } from '@/lib/wireTaskTemplateDependencies';
import { resolveResponsavelAssignee } from '@/lib/resolveResponsavelAssignee';
import { generateNarrativaCycleTasks } from '@/lib/pipelineNarrativa';
import {
  applyCicloComercialSla,
  buildNarrativaDeliverablesByTipo,
  normalizeCicloComercialOps,
  normalizeTipoCampanha,
} from '@/lib/tipoCampanhaPipeline';
import { ensureCicloMensalTemplate } from './ensureCicloMensalTemplate';
import { ensureCicloNarrativaTemplate } from './ensureCicloNarrativaTemplate';
import { ensureItemCycleTemplates } from './ensureItemCycleTemplates';

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
 *   title?: string,
 *   generateTasks?: boolean,
 *   ownerId?: string,
 *   pipeline?: 'legado' | 'narrativa' | 'conteudo' | 'producao_conteudo' | 'sessao_fotos' | 'item_cycle',
 *   tipo_campanha?: '5_videos' | 'ugc' | 'influenciador' | 'so_posts',
 *   ciclo_comercial?: string,
 *   linha_focal?: string,
 *   briefId?: string,
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
    title: cycleTitleOpt,
    generateTasks = true,
    ownerId,
    pipeline = 'narrativa',
    tipo_campanha: tipoRaw = '5_videos',
    ciclo_comercial: cicloRaw = '',
    linha_focal = '',
    briefId = null,
  } = opts;

  if (!agencyId) throw new Error('agencyId é obrigatório');
  if (!clientId) throw new Error('clientId é obrigatório');
  if (!startDate) throw new Error('startDate é obrigatório');

  const tipo_campanha = normalizeTipoCampanha(tipoRaw);
  const ciclo_comercial = normalizeCicloComercialOps(cicloRaw);

  const client = await Client.get(clientId).catch(() => null);
  if (!client) throw new Error('Cliente não encontrado');

  const profiles = await Profile.filter({ agencyId }).catch(() => []);
  const useItemCycle = isItemCyclePipelineKey(pipeline);
  const useNarrativa = pipeline === 'narrativa' && !useItemCycle;
  const itemCycleOption = getItemCycleOption(pipeline);

  let templateServiceId = templateId;
  if (!templateServiceId && !serviceId) {
    if (useItemCycle) {
      const seededMap = await ensureItemCycleTemplates(agencyId);
      const key = itemCycleOption?.key || 'producao_conteudo';
      const seeded = seededMap[key];
      if (!seeded?.id) throw new Error(`Template operacional não encontrado: ${key}`);
      templateServiceId = seeded.id;
    } else {
      const seeded = useNarrativa
        ? await ensureCicloNarrativaTemplate(agencyId)
        : await ensureCicloMensalTemplate(agencyId);
      templateServiceId = seeded.id;
    }
  }

  let service;
  if (serviceId) {
    service = await Service.get(serviceId);
    if (!service) throw new Error('Serviço não encontrado');
    if (service.is_template) throw new Error('Selecione uma instância de serviço, não um template');
  } else {
    const itemLabel = itemCycleOption?.label || resolveItemCycleDisplayName({ offering_key: pipeline });
    const defaultName = useItemCycle
      ? `${client.name || client.company_name || 'Cliente'} — ${itemLabel}`
      : useNarrativa
        ? `${client.name || client.company_name || 'Cliente'} — Pipeline Narrativa`
        : `${client.name || client.company_name || 'Cliente'} — Ciclo Mensal de Campanhas`;
    const result = await createServiceInstance({
      templateId: templateServiceId,
      clientId,
      customizations: {
        name: serviceName || defaultName,
        start_date: String(startDate).slice(0, 10),
      },
    });
    service = result.serviceInstance || result.data?.serviceInstance || result.data;
    if (!service?.id) throw new Error('Falha ao criar instância do serviço');
  }

  const isItemCycle = useItemCycle || isItemCycleService(service);

  const rawDeliverables = normalizeDeliverableTaskShapes(
    useNarrativa && !serviceId && !isItemCycle
      ? buildNarrativaDeliverablesByTipo(tipo_campanha)
      : service.deliverables || []
  );
  const withCicloSla =
    useNarrativa && !isItemCycle
      ? applyCicloComercialSla(rawDeliverables, ciclo_comercial)
      : rawDeliverables;

  const isNarrativaService =
    !isItemCycle &&
    (useNarrativa ||
      service.pipeline === 'narrativa' ||
      service.offering_key === 'ciclo_narrativa_7_fases' ||
      withCicloSla.some((d) => d.phase === 'foto_e_video' || d.phase === 'calendario_cliente'));

  const scheduled = scheduleDeliverablesFs({
    startDate: String(startDate).slice(0, 10),
    deliverables: withCicloSla,
  }).map((d, idx) =>
    (isNarrativaService || isItemCycle) && idx === 0
      ? {
          ...d,
          status: 'in_progress',
          started_at: new Date().toISOString(),
        }
      : d
  );

  const lastEnd = scheduled[scheduled.length - 1]?.planned_end;
  const endDate = lastEnd || addCalendarDays(startDate, isNarrativaService ? 20 : 27);

  const itemPipeline = isItemCycle
    ? resolveItemCyclePipeline(service, pipeline)
    : null;

  service = await Service.update(service.id, {
    deliverables: scheduled,
    start_date: String(startDate).slice(0, 10),
    end_date: endDate,
    ...(isItemCycle
      ? {
          pipeline: itemPipeline,
          offering_key: service.offering_key || itemCycleOption?.key || itemPipeline,
          ...(service.content_item_template
            ? { content_item_template: service.content_item_template }
            : {}),
        }
      : isNarrativaService
        ? {
            pipeline: 'narrativa',
            tipo_campanha,
            ciclo_comercial: ciclo_comercial || null,
            linha_focal: linha_focal || null,
            briefId: briefId || null,
          }
        : {}),
  });

  const embeddedTasks = isNarrativaService
    ? generateNarrativaCycleTasks({}, String(startDate).slice(0, 10), {
        deliverables: scheduled,
      })
    : [];

  const cyclePeriod = formatCyclePeriod(startDate);
  const cycleTitle =
    String(cycleTitleOpt || '').trim() ||
    (isItemCycle
      ? formatItemCycleTitle(resolveItemCycleDisplayName(service), startDate)
      : cyclePeriod);
  const cyclePipeline = isItemCycle
    ? itemPipeline
    : isNarrativaService
      ? 'narrativa'
      : 'legado';
  const cyclePlan = await CyclePlan.create({
    agencyId,
    clientId,
    customerId: clientId,
    serviceId: service.id,
    title: cycleTitle,
    cyclePeriod,
    status: 'approved',
    start_date: String(startDate).slice(0, 10),
    startDate: String(startDate).slice(0, 10),
    end_date: endDate,
    ownerId: ownerId || null,
    pipeline: cyclePipeline,
    tipo_campanha: isNarrativaService ? tipo_campanha : null,
    ciclo_comercial: isNarrativaService ? ciclo_comercial || null : null,
    linha_focal: isNarrativaService ? linha_focal || null : null,
    briefId: briefId || null,
    planData: {
      prioridades: [],
      ajustesEstrategicos: {},
      pendenciasCliente: [],
      pipeline: cyclePipeline,
      tipo_campanha: isNarrativaService ? tipo_campanha : null,
      ciclo_comercial: isNarrativaService ? ciclo_comercial || null : null,
      linha_focal: isNarrativaService ? linha_focal || null : null,
      briefId: briefId || null,
      tarefas: embeddedTasks,
      feedback: null,
      entregaveisPrevistos: scheduled.map((d) => ({
        id: d.id,
        name: d.name,
        phase: d.phase || null,
        gatekeeper: d.gatekeeper ?? null,
        sla_dias: d.sla_dias ?? null,
        planned_start: d.planned_start,
        planned_end: d.planned_end,
        status: d.status || 'planned',
      })),
    },
    version: isItemCycle
      ? 'item-cycle-1.0'
      : isNarrativaService
        ? 'narrativa-1.0'
        : 'v1.0',
    source: 'new_month_cycle_wizard',
  });

  let tasks = [];
  let tasksCreated = 0;

  // Ciclo operacional (item): começa vazio — itens são criados sob demanda.
  const shouldGenerateTasks = generateTasks && !isItemCycle;

  if (shouldGenerateTasks) {
    if (isNarrativaService) {
      const flat = flattenTaskTemplates(scheduled);
      const byTemplateId = new Map();
      const deliverableById = new Map(scheduled.map((d) => [String(d.id), d]));

      for (const taskTemplate of flat) {
        if (taskTemplate.parent_template_id) continue;

        const deliverable = deliverableById.get(String(taskTemplate.deliverableId));
        if (!deliverable) continue;

        const payload = buildTaskPayloadFromTemplate(taskTemplate, deliverable, service, {
          agencyId,
          startDate: deliverable.planned_start || startDate,
          cyclePlanId: cyclePlan.id,
          briefId: briefId || null,
        });
        payload.dueDate =
          dueDateForTaskTemplate(taskTemplate, deliverable) || payload.dueDate;
        payload.deliverableName = deliverable.name;
        payload.gatekeeper = taskTemplate.gatekeeper || deliverable.gatekeeper || null;
        payload.gate_status = taskTemplate.gate_status || (payload.gatekeeper ? 'pendente' : null);
        payload.pipeline = 'narrativa';
        payload.parentTaskId = null;
        applyAssignee(payload, profiles, taskTemplate, ownerId);

        const created = await Task.create(payload);
        tasks.push(created);
        byTemplateId.set(String(taskTemplate.id), created);
        tasksCreated += 1;

        const subtarefas = Array.isArray(taskTemplate.subtarefas) ? taskTemplate.subtarefas : [];
        for (const sub of subtarefas) {
          const subPayload = buildTaskPayloadFromTemplate(sub, deliverable, service, {
            agencyId,
            startDate: deliverable.planned_start || startDate,
            cyclePlanId: cyclePlan.id,
            briefId: briefId || null,
          });
          subPayload.dueDate =
            dueDateForTaskTemplate(sub, deliverable) || subPayload.dueDate;
          subPayload.deliverableName = deliverable.name;
          subPayload.parentTaskId = created.id;
          subPayload.pipeline = 'narrativa';
          subPayload.gatekeeper = null;
          applyAssignee(subPayload, profiles, sub, ownerId);

          const subCreated = await Task.create(subPayload);
          tasks.push(subCreated);
          byTemplateId.set(String(sub.id), subCreated);
          tasksCreated += 1;
        }
      }

      // Dependências entre templates (pais e subtarefas) via bloqueador
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
    } else {
      for (const deliverable of scheduled) {
        const templates = deliverable.task_templates || [];
        for (const taskTemplate of templates) {
          const payload = buildTaskPayloadFromTemplate(taskTemplate, deliverable, service, {
            agencyId,
            startDate: deliverable.planned_start || startDate,
            cyclePlanId: cyclePlan.id,
            briefId: briefId || null,
          });
          payload.dueDate =
            dueDateForTaskTemplate(taskTemplate, deliverable) || payload.dueDate;
          payload.deliverableName = deliverable.name;
          applyAssignee(payload, profiles, taskTemplate, ownerId);

          const created = await Task.create(payload);
          tasks.push(created);
          tasksCreated += 1;
        }
      }

      await wirePhaseFinishToStartDependencies(tasks, scheduled).catch(() => {});
      await wireTaskTemplateDependencies(tasks, scheduled).catch(() => {});
    }

    await CyclePlan.update(cyclePlan.id, { status: 'in_execution' }).catch(() => {});
  } else if (isItemCycle) {
    // Ciclo pronto para receber itens manuais (conteúdos / sessões / …)
    await CyclePlan.update(cyclePlan.id, { status: 'in_execution' }).catch(() => {});
  }

  return {
    success: true,
    service,
    cyclePlan: {
      ...cyclePlan,
      status: shouldGenerateTasks || isItemCycle ? 'in_execution' : cyclePlan.status,
    },
    tasks,
    tasksCreated,
    pipeline: cyclePipeline,
    tipo_campanha: isNarrativaService ? tipo_campanha : null,
    ciclo_comercial: isNarrativaService ? ciclo_comercial || null : null,
    linha_focal: isNarrativaService ? linha_focal || null : null,
    startDate: String(startDate).slice(0, 10),
    endDate,
  };
}

export default createMonthCycle;
