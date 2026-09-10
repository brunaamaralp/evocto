/**
 * Lógica pura: iniciar etapa (deliverable) e materializar tarefas do template.
 * Separado do timer — lifecycle ≠ rastreamento de horas.
 */

const TERMINAL_STATUSES = new Set(['completed', 'approved', 'cancelled']);

/**
 * @param {object} deliverable
 * @returns {boolean}
 */
export function canStartDeliverable(deliverable) {
  if (!deliverable) return false;
  const status = String(deliverable.status || 'not_started').toLowerCase();
  if (TERMINAL_STATUSES.has(status)) return false;
  const templates = deliverable.task_templates || [];
  return templates.length > 0 || status === 'not_started' || status === 'pending';
}

/**
 * Atualiza o array de deliverables marcando a etapa como in_progress.
 * @param {Array} deliverables
 * @param {string} deliverableId
 * @param {string} [nowIso]
 */
export function markDeliverableStarted(deliverables, deliverableId, nowIso = new Date().toISOString()) {
  const list = Array.isArray(deliverables) ? deliverables : [];
  return list.map((d) => {
    if (String(d.id) !== String(deliverableId)) return d;
    const status = String(d.status || 'not_started').toLowerCase();
    if (TERMINAL_STATUSES.has(status) || status === 'in_progress') {
      return {
        ...d,
        status: status === 'in_progress' ? 'in_progress' : d.status,
        started_at: d.started_at || nowIso,
      };
    }
    return {
      ...d,
      status: 'in_progress',
      started_at: d.started_at || nowIso,
    };
  });
}

/**
 * @param {object} taskTemplate
 * @param {object} deliverable
 * @param {object} service
 * @param {{ agencyId: string, startDate?: string, cyclePlanId?: string }} ctx
 */
export function buildTaskPayloadFromTemplate(taskTemplate, deliverable, service, ctx) {
  const startDate = ctx.startDate || new Date().toISOString().slice(0, 10);
  const checklist = (taskTemplate.checklist || []).map((item, index) => ({
    id: item.id || `cl_${Date.now()}_${index}`,
    text: item.text,
    completed: false,
    required: item.required !== undefined ? item.required : true,
    order: item.order ?? index,
    assignedTo: null,
    dueDate: item.relativeDueDays
      ? new Date(
          new Date(startDate).getTime() + item.relativeDueDays * 24 * 60 * 60 * 1000
        ).toISOString()
      : null,
  }));

  return {
    agencyId: ctx.agencyId,
    clientId: service.clientId,
    serviceId: service.id,
    deliverableId: deliverable.id,
    cyclePlanId: ctx.cyclePlanId || null,
    briefingId: ctx.briefId || ctx.briefingId || null,
    briefId: ctx.briefId || ctx.briefingId || null,
    title: taskTemplate.title,
    description: taskTemplate.description || '',
    type: taskTemplate.type || 'deliverable',
    priority: taskTemplate.priority || 'medium',
    estimatedHours: taskTemplate.estimated_hours || taskTemplate.estimatedHours || 4,
    status: 'todo',
    checklist,
    template_id: taskTemplate.id || null,
    created_from_template: true,
    template_metadata: {
      deliverable_name: deliverable.name,
      template_id: taskTemplate.id || null,
      generated_at: new Date().toISOString(),
      source: 'start_deliverable',
    },
  };
}

/**
 * Resolve impacto/prioridade de uma prioridade do plano de ciclo.
 * @param {string|object} prioridade
 */
export function normalizeCyclePriority(prioridade) {
  if (typeof prioridade === 'string') {
    return { title: prioridade, priority: 'medium', description: '' };
  }
  const title =
    prioridade?.tarefa || prioridade?.title || prioridade?.name || 'Tarefa do ciclo';
  const impact = String(prioridade?.impacto || prioridade?.priority || 'Médio');
  let priority = 'medium';
  if (/alto|high/i.test(impact)) priority = 'high';
  if (/baixo|low/i.test(impact)) priority = 'low';
  return {
    title,
    priority,
    description: prioridade?.descricao || prioridade?.description || '',
    estimatedHours: prioridade?.estimated_hours || prioridade?.estimatedHours || 4,
  };
}

/**
 * Monta payloads de tarefas a partir de um CyclePlan aprovado.
 * @param {object} cyclePlan
 * @param {{ agencyId: string }} ctx
 */
export function buildTasksFromCyclePlan(cyclePlan, ctx) {
  const planData = cyclePlan?.planData || cyclePlan?.snapshot_data || {};
  const priorities = Array.isArray(planData.prioridades) ? planData.prioridades : [];
  const period = cyclePlan.cyclePeriod || cyclePlan.period || '';
  const baseDate = cyclePlan.start_date || cyclePlan.startDate || new Date().toISOString();
  const tasks = [];

  priorities.forEach((p, index) => {
    const norm = normalizeCyclePriority(p);
    tasks.push({
      agencyId: ctx.agencyId,
      clientId: cyclePlan.clientId,
      serviceId: cyclePlan.serviceId,
      cyclePlanId: cyclePlan.id,
      title: norm.title,
      description: norm.description,
      type: 'cycle_priority',
      priority: norm.priority,
      estimatedHours: norm.estimatedHours,
      status: 'todo',
      dueDate: new Date(
        new Date(baseDate).getTime() + (index + 1) * 7 * 24 * 60 * 60 * 1000
      ).toISOString(),
      created_from_template: true,
      template_metadata: {
        source: 'cycle_plan',
        cycle_period: period,
        generated_at: new Date().toISOString(),
      },
    });
  });

  // Milestones padrão do ciclo
  const milestones = [
    {
      title: `Kick-off do ciclo ${period}`.trim(),
      type: 'milestone_kickoff',
      priority: 'high',
      offsetDays: 0,
    },
    {
      title: `Review semanal — ${period}`.trim(),
      type: 'milestone_review',
      priority: 'medium',
      offsetDays: 7,
    },
    {
      title: `Fechamento do ciclo ${period}`.trim(),
      type: 'milestone_close',
      priority: 'high',
      offsetDays: 28,
    },
  ];

  milestones.forEach((m) => {
    tasks.push({
      agencyId: ctx.agencyId,
      clientId: cyclePlan.clientId,
      serviceId: cyclePlan.serviceId,
      cyclePlanId: cyclePlan.id,
      title: m.title,
      description: '',
      type: m.type,
      priority: m.priority,
      estimatedHours: 2,
      status: 'todo',
      dueDate: new Date(
        new Date(baseDate).getTime() + m.offsetDays * 24 * 60 * 60 * 1000
      ).toISOString(),
      created_from_template: true,
      template_metadata: {
        source: 'cycle_plan_milestone',
        cycle_period: period,
        generated_at: new Date().toISOString(),
      },
    });
  });

  return tasks;
}
