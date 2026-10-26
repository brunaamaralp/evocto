/**
 * Status de dependências para o drawer (sem TaskStateMachine).
 * Payload-only: task.dependencies[{ taskId, type, isResolved }].
 */

const DONE = new Set(['completed', 'done', 'approved', 'published']);
const STARTED = new Set(['in_progress', 'producao', 'production', 'doing', 'in_review', 'revisao', ...DONE]);

/**
 * @param {object} dependency
 * @param {object|null|undefined} depTask
 * @returns {{ isResolved: boolean, reason: string }}
 */
export function checkDependencyResolution(dependency, depTask) {
  if (!depTask) {
    return { isResolved: false, reason: 'Tarefa não encontrada' };
  }
  if (dependency?.isResolved === true) {
    return { isResolved: true, reason: 'Marcada como resolvida' };
  }

  const status = String(depTask.status || '').toLowerCase();
  const type = String(dependency?.type || 'finish_to_start');

  switch (type) {
    case 'finish_to_start':
      return {
        isResolved: DONE.has(status),
        reason: DONE.has(status)
          ? 'Tarefa concluída'
          : `Aguardando conclusão (${status || '—'})`,
      };
    case 'start_to_start':
      return {
        isResolved: STARTED.has(status),
        reason: STARTED.has(status)
          ? 'Tarefa iniciada'
          : `Aguardando início (${status || '—'})`,
      };
    case 'finish_to_finish':
      return {
        isResolved: DONE.has(status),
        reason: DONE.has(status)
          ? 'Tarefa concluída'
          : `Aguardando conclusão (${status || '—'})`,
      };
    case 'start_to_finish':
      return {
        isResolved: STARTED.has(status),
        reason: STARTED.has(status)
          ? 'Tarefa iniciada'
          : `Aguardando início (${status || '—'})`,
      };
    default:
      return { isResolved: false, reason: 'Tipo de dependência desconhecido' };
  }
}

/**
 * @param {object|null|undefined} task
 * @param {Record<string, object>|Map<string, object>|object[]} [depTasks]
 * @returns {{ canStart: boolean, blockedBy: Array<{ task: object|null, dependency: object }> }}
 */
export function buildDependencyStatus(task, depTasks = {}) {
  const deps = Array.isArray(task?.dependencies) ? task.dependencies : [];
  const byId =
    depTasks instanceof Map
      ? depTasks
      : Array.isArray(depTasks)
        ? new Map(depTasks.filter((t) => t?.id).map((t) => [String(t.id), t]))
        : new Map(
            Object.entries(depTasks || {}).map(([k, v]) => [String(k), v])
          );

  const blockedBy = [];
  for (const dependency of deps) {
    const id = dependency?.taskId != null ? String(dependency.taskId) : '';
    const depTask = id ? byId.get(id) || null : null;
    const resolution = checkDependencyResolution(dependency, depTask);
    if (!resolution.isResolved) {
      blockedBy.push({ task: depTask, dependency });
    }
  }

  return {
    canStart: blockedBy.length === 0,
    blockedBy,
  };
}

/**
 * Normaliza bloqueios manuais (TaskStateMachine / legado).
 * @param {object|null|undefined} task
 * @returns {Array<{ reason?: string, critical?: boolean, blockedBy?: string, createdAt?: string }>}
 */
export function listManualBlockers(task) {
  const raw = task?.blockedBy;
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((b) => {
        if (typeof b === 'string') return { reason: b };
        if (b && typeof b === 'object') return b;
        return null;
      })
      .filter(Boolean);
  }
  if (typeof raw === 'string') return [{ reason: raw }];
  if (typeof raw === 'object') return [raw];
  return [];
}
