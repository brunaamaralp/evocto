import { CyclePlan, Task } from '@/api/entities';
import { buildTasksFromCyclePlan } from '@/lib/startDeliverableStage';

/**
 * Gera tarefas reais a partir de um CyclePlan aprovado.
 * Aceita (cyclePlanId, options) ou ({ cyclePlanId, autoAssign }).
 * Retorna tanto o payload direto quanto `{ data }` para callers legados.
 */
export async function generateTasksFromCyclePlan(cyclePlanIdOrOpts, options = {}) {
  const opts =
    typeof cyclePlanIdOrOpts === 'object' && cyclePlanIdOrOpts !== null
      ? cyclePlanIdOrOpts
      : { cyclePlanId: cyclePlanIdOrOpts, ...options };

  const cyclePlanId = opts.cyclePlanId;
  const autoAssign = Boolean(opts.autoAssign);

  try {
    if (!cyclePlanId) {
      const failure = { success: false, tasks: [], tasksCreated: 0, error: 'cyclePlanId é obrigatório' };
      return { ...failure, data: failure };
    }

    const cyclePlan = await CyclePlan.get(cyclePlanId);
    if (!cyclePlan) {
      const failure = { success: false, tasks: [], tasksCreated: 0, error: 'Plano de ciclo não encontrado' };
      return { ...failure, data: failure };
    }

    if (cyclePlan.status !== 'approved' && cyclePlan.status !== 'in_execution') {
      const failure = {
        success: false,
        tasks: [],
        tasksCreated: 0,
        error: `Plano precisa estar aprovado (status atual: ${cyclePlan.status || '—'})`,
      };
      return { ...failure, data: failure };
    }

    const agencyId = cyclePlan.agencyId;
    if (!agencyId) {
      const failure = { success: false, tasks: [], tasksCreated: 0, error: 'Plano sem agencyId' };
      return { ...failure, data: failure };
    }

    // Evitar duplicar se já houver tarefas deste ciclo
    const existing = await Task.filter({
      agencyId,
      cyclePlanId: cyclePlan.id,
      status: { $ne: 'cancelled' },
    }).catch(() => []);

    if (Array.isArray(existing) && existing.length > 0) {
      const result = {
        success: true,
        tasks: existing,
        tasksCreated: 0,
        tasksSkipped: existing.length,
        message: `${existing.length} tarefas já existiam para este ciclo`,
      };
      return { ...result, data: result };
    }

    const payloads = buildTasksFromCyclePlan(cyclePlan, { agencyId });
    const created = [];

    for (const payload of payloads) {
      const taskData = { ...payload };
      if (autoAssign && cyclePlan.ownerId) {
        taskData.assignedTo = cyclePlan.ownerId;
      }
      const task = await Task.create(taskData);
      created.push(task);
    }

    if (cyclePlan.status === 'approved') {
      await CyclePlan.update(cyclePlan.id, { status: 'in_execution' }).catch(() => {});
    }

    const result = {
      success: true,
      tasks: created,
      tasksCreated: created.length,
      tasksSkipped: 0,
      message: `${created.length} tarefas geradas com sucesso`,
    };
    return { ...result, data: result };
  } catch (error) {
    console.error('Erro ao gerar tarefas do plano de ciclo:', error);
    const failure = {
      success: false,
      tasks: [],
      tasksCreated: 0,
      error: error?.message || 'Erro desconhecido',
    };
    return { ...failure, data: failure };
  }
}

export default generateTasksFromCyclePlan;
