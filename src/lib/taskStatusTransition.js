import { Task } from '@/api/entities';
import { appendStatusHistoryEntry } from '@/lib/taskActivityHistory';

const TERMINAL = new Set(['completed', 'cancelled']);
const ACTIVE_STATUSES = new Set(['in_progress', 'in_review', 'completed']);

/**
 * Verifica se as dependências FS permitem mover a tarefa para nextStatus.
 * @returns {{ allowed: boolean, message?: string, blocking?: object[] }}
 */
export async function canTransitionTaskStatus(task, nextStatus) {
  if (!task) return { allowed: false, message: 'Tarefa inválida' };
  if (!nextStatus || nextStatus === task.status) return { allowed: true };

  const deps = Array.isArray(task.dependencies) ? task.dependencies : [];
  if (deps.length === 0) return { allowed: true };

  // Só bloqueia ao avançar para progresso / conclusão
  if (!ACTIVE_STATUSES.has(nextStatus)) return { allowed: true };

  const blocking = [];

  for (const dep of deps) {
    const type = dep.type || 'finish_to_start';
    if (type !== 'finish_to_start' && type !== 'FS') continue;

    if (dep.isResolved) continue;

    try {
      const upstream = await Task.get(dep.taskId);
      if (!upstream) {
        blocking.push({ taskId: dep.taskId, title: dep.taskId, status: 'missing' });
        continue;
      }
      if (!TERMINAL.has(upstream.status)) {
        blocking.push({
          taskId: upstream.id,
          title: upstream.title || upstream.id,
          status: upstream.status,
        });
      }
    } catch {
      blocking.push({ taskId: dep.taskId, title: dep.taskId, status: 'error' });
    }
  }

  if (blocking.length > 0) {
    const names = blocking.map((b) => `"${b.title}" (${b.status})`).join(', ');
    return {
      allowed: false,
      message: `Dependências não resolvidas: ${names}`,
      blocking,
    };
  }

  return { allowed: true };
}

/**
 * Ao concluir uma tarefa, marca dependências que apontam para ela como resolvidas.
 */
export async function resolveDownstreamDependencies(completedTask, agencyId) {
  if (!completedTask?.id) return { updated: 0 };

  const filter = agencyId
    ? { agencyId, clientId: completedTask.clientId }
    : { clientId: completedTask.clientId };

  const siblings = await Task.filter(filter).catch(() => []);
  let updated = 0;

  for (const sibling of Array.isArray(siblings) ? siblings : []) {
    const deps = Array.isArray(sibling.dependencies) ? sibling.dependencies : [];
    if (deps.length === 0) continue;

    let changed = false;
    const nextDeps = deps.map((dep) => {
      if (String(dep.taskId) !== String(completedTask.id)) return dep;
      if (dep.isResolved) return dep;
      changed = true;
      return {
        ...dep,
        isResolved: true,
        resolvedAt: new Date().toISOString(),
      };
    });

    if (changed) {
      await Task.update(sibling.id, { dependencies: nextDeps });
      updated += 1;
    }
  }

  return { updated };
}

/**
 * Transiciona status com guards de dependência + statusHistory.
 * @returns {{ success: boolean, task?: object, message?: string }}
 */
export async function transitionTaskStatus(task, nextStatus, { agencyId, user, reason } = {}) {
  const gate = await canTransitionTaskStatus(task, nextStatus);
  if (!gate.allowed) {
    return { success: false, message: gate.message, blocking: gate.blocking };
  }

  const previousStatus = task.status;
  const payload = {
    status: nextStatus,
    kanbanColumn: nextStatus,
    statusHistory: appendStatusHistoryEntry(task, {
      status: nextStatus,
      previousStatus,
      user,
      reason,
    }),
  };

  if (nextStatus === 'completed') {
    payload.completedAt = new Date().toISOString();
    payload.progress = 100;
    if (payload.actualHours == null) {
      payload.actualHours = task.actualHours || task.estimatedHours || 0;
    }
  } else if (task.status === 'completed' && nextStatus !== 'completed') {
    payload.completedAt = null;
    payload.progress = 0;
  }

  const updated = await Task.update(task.id, payload);

  if (nextStatus === 'completed') {
    await resolveDownstreamDependencies(updated || task, agencyId || task.agencyId).catch(
      () => {}
    );
  }

  return { success: true, task: updated };
}

export default transitionTaskStatus;
