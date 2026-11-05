/**
 * Move uma tarefa para uma coluna personalizada do quadro.
 * Reaproveita as regras existentes de status (conclusão, dependências,
 * histórico) e depois grava a coluna escolhida em `boardColumnId`.
 */

import { Task } from '@/api/entities';
import { completeTask, isTaskCompletedStatus } from '@/lib/completeTask';
import { transitionTaskStatus } from '@/lib/taskStatusTransition';
import { planColumnDrop } from '@/lib/boardColumns';

/**
 * @param {object} task
 * @param {{ id: string, status: string }} column
 * @param {{ agencyId?: string, user?: object }} [ctx]
 * @param {{ boardPosition?: number }} [extra] campos gravados junto com a coluna
 * @returns {Promise<{ success: boolean, message?: string, warning?: string|null }>}
 */
export async function moveTaskToColumn(task, column, { agencyId, user } = {}, extra = {}) {
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
  await Task.update(task.id, { boardColumnId: column.id, ...extra });
  return { success: true, warning };
}

/**
 * Solta um card numa coluna, numa posição (também serve para reordenar na mesma coluna).
 * @param {{
 *   task: object,
 *   column: { id: string, status: string },
 *   columnTasks: object[],   // tarefas da coluna de destino, na ordem exibida
 *   destIndex: number,
 *   ctx?: { agencyId?: string, user?: object },
 * }} input
 * @returns {Promise<{ success: boolean, message?: string, warning?: string|null, updates?: object[] }>}
 */
export async function dropTaskInColumn({ task, column, columnTasks = [], destIndex = 0, ctx = {} }) {
  const updates = planColumnDrop({ columnTasks, taskId: task.id, destIndex });
  const own = updates.find((u) => String(u.id) === String(task.id));
  const result = await moveTaskToColumn(task, column, ctx, own ? { boardPosition: own.boardPosition } : {});
  if (!result.success) return result;
  await Promise.all(
    updates
      .filter((u) => String(u.id) !== String(task.id))
      .map((u) => Task.update(u.id, { boardPosition: u.boardPosition }))
  );
  return { ...result, updates };
}

/** Aplica movimento + posições numa lista local (UI otimista). */
export function applyDropLocally(tasks, { taskId, column, updates = [] }) {
  const byId = new Map(updates.map((u) => [String(u.id), u.boardPosition]));
  return tasks.map((t) => {
    const id = String(t.id);
    let next = t;
    if (id === String(taskId)) next = { ...next, ...optimisticColumnPatch(column) };
    if (byId.has(id)) next = { ...next, boardPosition: byId.get(id) };
    return next;
  });
}

/** Patch otimista para a UI enquanto o servidor responde. */
export function optimisticColumnPatch(column) {
  return {
    boardColumnId: column.id,
    status: column.status,
  };
}
