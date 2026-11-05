/**
 * Move uma tarefa para uma coluna personalizada do quadro.
 * Reaproveita as regras existentes de status (conclusão, dependências,
 * histórico) e depois grava a coluna escolhida em `boardColumnId`.
 */

import { Task } from '@/api/entities';
import { completeTask, isTaskCompletedStatus } from '@/lib/completeTask';
import { transitionTaskStatus } from '@/lib/taskStatusTransition';

/**
 * @param {object} task
 * @param {{ id: string, status: string }} column
 * @param {{ agencyId?: string, user?: object }} [ctx]
 * @returns {Promise<{ success: boolean, message?: string, warning?: string|null }>}
 */
export async function moveTaskToColumn(task, column, { agencyId, user } = {}) {
  if (!task?.id || !column?.id) return { success: false, message: 'Movimento inválido' };

  const wasDone = isTaskCompletedStatus(task.status);
  const toDone = column.status === 'completed';
  let warning = null;

  if (toDone && !wasDone) {
    const result = await completeTask(task, { agencyId: agencyId || task.agencyId, user });
    if (!result.success) return result;
    warning = result.warning || null;
  } else if (!toDone && String(task.status || '') !== column.status) {
    const result = await transitionTaskStatus(task, column.status, {
      agencyId: agencyId || task.agencyId,
      user,
    });
    if (!result.success) return result;
    warning = result.warning || null;
  }

  // Task.update mescla com a linha atual — não perde o status gravado acima.
  await Task.update(task.id, { boardColumnId: column.id });
  return { success: true, warning };
}

/** Patch otimista para a UI enquanto o servidor responde. */
export function optimisticColumnPatch(column) {
  return {
    boardColumnId: column.id,
    status: column.status,
  };
}
