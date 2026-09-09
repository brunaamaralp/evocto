import { Task, Notification } from '@/api/entities';
import { differenceInHours } from 'date-fns';
import { getTaskAssigneeId } from '@/lib/taskFilterPresets';

/**
 * Escaneia tarefas do usuário e cria notificações in-app de due soon / overdue.
 * Idempotente via dedupKey no payload.
 */
export async function scanTaskDeadlineNotifications({
  agencyId,
  userId,
  tasks: providedTasks,
} = {}) {
  if (!agencyId || !userId) return { created: 0 };

  const tasks =
    providedTasks ||
    (await Task.filter({ agencyId }).catch(() => []));

  const mine = (Array.isArray(tasks) ? tasks : []).filter((t) => {
    if (['completed', 'cancelled'].includes(t.status)) return false;
    const assignee = getTaskAssigneeId(t);
    return assignee && String(assignee) === String(userId);
  });

  let existing = [];
  try {
    existing = await Notification.filter({ agencyId, userId }, '-created_date', 50);
  } catch {
    existing = [];
  }
  const existingKeys = new Set(
    (existing || []).map((n) => n.dedupKey).filter(Boolean)
  );

  let created = 0;
  const now = new Date();

  for (const task of mine) {
    if (!task.dueDate) continue;
    const due = new Date(task.dueDate);
    const hours = differenceInHours(due, now);
    const dayKey = String(task.dueDate).slice(0, 10);

    if (hours < 0) {
      const dedupKey = `task_overdue_${task.id}_${userId}_${dayKey}`;
      if (existingKeys.has(dedupKey)) continue;
      const isMeeting =
        task.template_id === 'reuniao_mensal_relatorio' ||
        /reunião mensal|gerar relatório/i.test(task.title || '');
      try {
        await Notification.create({
          agencyId,
          userId,
          type: isMeeting ? 'meeting_reminder' : 'task_overdue',
          subject: `task:${task.id}`,
          title: isMeeting
            ? 'Reunião/relatório atrasado — gere o relatório'
            : 'Tarefa atrasada',
          context: task.title,
          href: isMeeting ? `/cycle-report` : `/tasks-manager?task=${task.id}`,
          severity: 'critical',
          dedupKey,
          metadata: { taskId: task.id, dueDate: task.dueDate },
        });
        existingKeys.add(dedupKey);
        created += 1;
      } catch (err) {
        console.warn('[scanTaskDeadlineNotifications] overdue', err);
      }
    } else if (hours <= 48) {
      const isMeeting =
        task.template_id === 'reuniao_mensal_relatorio' ||
        /reunião mensal|gerar relatório/i.test(task.title || '');
      // Reunião: avisar com 48h; demais tarefas: 24h
      if (!isMeeting && hours > 24) continue;

      const dedupKey = isMeeting
        ? `meeting_reminder_${task.id}_${userId}_${dayKey}`
        : `task_due_soon_${task.id}_${userId}_${dayKey}`;
      if (existingKeys.has(dedupKey)) continue;
      try {
        await Notification.create({
          agencyId,
          userId,
          type: isMeeting ? 'meeting_reminder' : 'task_due_soon',
          subject: `task:${task.id}`,
          title: isMeeting
            ? 'Reunião com cliente em breve — gere o relatório'
            : hours <= 8
              ? 'Tarefa vence hoje'
              : 'Tarefa vence em breve',
          context: task.title,
          href: isMeeting ? `/cycle-report` : `/tasks-manager?task=${task.id}`,
          severity: hours <= 8 || isMeeting ? 'warn' : 'info',
          dedupKey,
          metadata: { taskId: task.id, dueDate: task.dueDate },
        });
        existingKeys.add(dedupKey);
        created += 1;
      } catch (err) {
        console.warn('[scanTaskDeadlineNotifications] due soon', err);
      }
    }
  }

  return { created };
}

export default scanTaskDeadlineNotifications;
