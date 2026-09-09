/**
 * Escopo operacional de tarefas: ciclo + campanha/briefing.
 * Alinha Visão Geral (hub) e página de Tarefas.
 */

export function getTaskCycleIds(task) {
  return [task?.cyclePlanId, task?.cycleId, task?.ciclo_id]
    .filter(Boolean)
    .map(String);
}

export function getTaskBriefIds(task) {
  return [task?.briefingId, task?.briefId, task?.campanhaId, task?.campaignId]
    .filter(Boolean)
    .map(String);
}

export function taskMatchesCycle(task, cycleId) {
  if (!cycleId) return true;
  return getTaskCycleIds(task).includes(String(cycleId));
}

export function taskMatchesBriefing(task, briefingId) {
  if (!briefingId) return true;
  return getTaskBriefIds(task).includes(String(briefingId));
}

/**
 * Filtra tarefas no mesmo espírito do hub:
 * 1) se briefingId e há tarefas da campanha → só elas
 * 2) senão, se cycleId → tarefas do ciclo (compartilhado)
 * 3) senão → lista original
 *
 * @returns {{ tasks: object[], scope: 'campaign'|'cycle'|'none', sharedCycleFallback: boolean }}
 */
export function filterTasksByScope(tasks = [], { cycleId = null, briefingId = null } = {}) {
  const list = Array.isArray(tasks) ? tasks : [];

  if (briefingId) {
    const campaignTasks = list.filter((t) => taskMatchesBriefing(t, briefingId));
    if (campaignTasks.length > 0) {
      return { tasks: campaignTasks, scope: 'campaign', sharedCycleFallback: false };
    }
    if (cycleId) {
      const cycleTasks = list.filter((t) => taskMatchesCycle(t, cycleId));
      return { tasks: cycleTasks, scope: 'cycle', sharedCycleFallback: true };
    }
    return { tasks: [], scope: 'campaign', sharedCycleFallback: false };
  }

  if (cycleId) {
    return {
      tasks: list.filter((t) => taskMatchesCycle(t, cycleId)),
      scope: 'cycle',
      sharedCycleFallback: false,
    };
  }

  return { tasks: list, scope: 'none', sharedCycleFallback: false };
}

export function buildClientTasksHref({
  clientId,
  cycleId = null,
  briefingId = null,
  serviceId = null,
}) {
  if (!clientId) return 'client-tasks';
  const params = new URLSearchParams();
  params.set('clientId', clientId);
  if (serviceId) params.set('serviceId', serviceId);
  if (cycleId) params.set('cycleId', cycleId);
  if (briefingId) params.set('briefingId', briefingId);
  return `client-tasks?${params.toString()}`;
}

/** Campos a gravar em tarefas novas a partir do contexto da URL/página. */
export function buildTaskScopeFields({ cycleId = null, briefingId = null } = {}) {
  const fields = {};
  if (cycleId) {
    fields.cyclePlanId = cycleId;
    fields.cycleId = cycleId;
  }
  if (briefingId) {
    fields.briefingId = briefingId;
    fields.briefId = briefingId;
  }
  return fields;
}
