import { Task } from '@/api/entities';

function isReminderTask(task) {
  const title = String(task?.title || '').toLowerCase();
  const type = String(task?.type || '').toLowerCase();
  return type === 'administrativo' || title.includes('lembrete segunda');
}

/**
 * Liga FS entre a última tarefa "principal" de cada fase e a primeira da próxima.
 * @param {object[]} tasks - tarefas já criadas (com id, deliverableId, title, type)
 * @param {object[]} deliverablesOrdered - deliverables na ordem das fases
 */
export async function wirePhaseFinishToStartDependencies(tasks, deliverablesOrdered) {
  const list = Array.isArray(tasks) ? tasks : [];
  const phases = Array.isArray(deliverablesOrdered) ? deliverablesOrdered : [];
  if (list.length === 0 || phases.length < 2) return { linked: 0 };

  let linked = 0;

  for (let i = 1; i < phases.length; i++) {
    const prevPhase = phases[i - 1];
    const nextPhase = phases[i];
    const prevTasks = list.filter(
      (t) => String(t.deliverableId) === String(prevPhase.id) && !isReminderTask(t)
    );
    const nextTasks = list.filter(
      (t) => String(t.deliverableId) === String(nextPhase.id) && !isReminderTask(t)
    );

    const upstream = prevTasks[prevTasks.length - 1];
    const downstream = nextTasks[0];
    if (!upstream?.id || !downstream?.id) continue;

    const existing = Array.isArray(downstream.dependencies) ? downstream.dependencies : [];
    if (existing.some((d) => String(d.taskId) === String(upstream.id))) continue;

    const dependencies = [
      ...existing,
      {
        taskId: upstream.id,
        type: 'finish_to_start',
        description: `${prevPhase.name} → ${nextPhase.name}`,
        isResolved: false,
      },
    ];

    await Task.update(downstream.id, { dependencies });
    downstream.dependencies = dependencies;
    linked += 1;
  }

  return { linked };
}

export default wirePhaseFinishToStartDependencies;
