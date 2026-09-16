import { Task } from '@/api/entities';
import { toast } from 'sonner';
import transitionTaskStatus, {
  completedKanbanColumnForTask,
} from '@/lib/taskStatusTransition';

function normalizeStatus(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

export function isTaskCompletedStatus(status) {
  return ['completed', 'done'].includes(normalizeStatus(status));
}

export function toastTaskCompleted(
  task,
  { alreadyCompleted = false, warning = null } = {}
) {
  const title = String(task?.title || '').trim();
  if (alreadyCompleted) {
    toast.message('Esta tarefa já estava concluída', {
      description: title || undefined,
      duration: 2000,
    });
    return;
  }
  toast.success('Tarefa concluída', {
    description: title || undefined,
    duration: 2200,
  });
  if (warning) {
    toast.warning(warning, { duration: 4500 });
  }
}

export function toastTaskCompleteError(message) {
  toast.error(message || 'Não foi possível concluir a tarefa', {
    duration: 4000,
  });
}

/**
 * Conclui tarefa de forma idempotente e verifica persistência.
 * Usado pelo dashboard, drawer e kanban da campanha.
 */
export async function completeTask(task, { agencyId, user, reason } = {}) {
  if (!task?.id) {
    return { success: false, message: 'Tarefa inválida' };
  }

  if (isTaskCompletedStatus(task.status)) {
    return { success: true, task, alreadyCompleted: true };
  }

  const result = await transitionTaskStatus(task, 'completed', {
    agencyId: agencyId || task.agencyId,
    user,
    reason,
  });

  if (!result.success) {
    return result;
  }

  let saved = result.task;
  let status = normalizeStatus(saved?.status);

  // Se o update não devolveu status confiável, confirma no servidor.
  if (!isTaskCompletedStatus(status)) {
    saved = await Task.get(task.id).catch(() => null);
    status = normalizeStatus(saved?.status);
  }

  // Fallback mínimo: só a coluna tipada status (evita falha por payload).
  if (!isTaskCompletedStatus(status)) {
    saved = await Task.update(task.id, {
      status: 'completed',
      kanbanColumn: completedKanbanColumnForTask(task),
      completedAt: new Date().toISOString(),
      progress: 100,
    }).catch(() => null);
    status = normalizeStatus(saved?.status);

    if (!isTaskCompletedStatus(status)) {
      const again = await Task.get(task.id).catch(() => null);
      saved = again || saved;
      status = normalizeStatus(saved?.status);
    }
  }

  if (!isTaskCompletedStatus(status)) {
    return {
      success: false,
      message: 'A tarefa não foi marcada como concluída. Tente de novo.',
      task: saved || result.task,
    };
  }

  return {
    success: true,
    warning: result.warning || null,
    blocking: result.blocking || null,
    task: {
      ...(saved || result.task || task),
      status: 'completed',
      kanbanColumn:
        saved?.kanbanColumn ||
        result.task?.kanbanColumn ||
        completedKanbanColumnForTask(task),
    },
  };
}

export function notifyTaskCompleted(taskId, extra = {}) {
  if (!taskId || typeof window === 'undefined') return;
  // Só task:updated com status — evita task:refresh imediato sobrescrever
  // a UI com leitura ainda desatualizada.
  window.dispatchEvent(
    new CustomEvent('task:updated', {
      detail: {
        taskId,
        status: 'completed',
        kanbanColumn: extra.kanbanColumn || 'completed',
        ...extra,
      },
    })
  );
}

export default completeTask;
