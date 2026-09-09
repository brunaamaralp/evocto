/**
 * Append helpers for task decision / activity history (payload JSON).
 */

export function appendStatusHistoryEntry(task, { status, previousStatus, user, reason } = {}) {
  const history = Array.isArray(task?.statusHistory) ? [...task.statusHistory] : [];
  history.push({
    status,
    previousStatus: previousStatus ?? task?.status ?? null,
    changedAt: new Date().toISOString(),
    changedBy: user?.id || user?.data?.id || null,
    changedByName: user?.full_name || user?.name || user?.email || 'Sistema',
    reason: reason || null,
  });
  return history;
}

export function appendAssignmentHistoryEntry(task, { assigneeId, previousAssigneeId, user } = {}) {
  const history = Array.isArray(task?.statusHistory) ? [...task.statusHistory] : [];
  history.push({
    status: task?.status,
    previousStatus: task?.status,
    type: 'assignment',
    changedAt: new Date().toISOString(),
    changedBy: user?.id || user?.data?.id || null,
    changedByName: user?.full_name || user?.name || user?.email || 'Sistema',
    reason: `Responsável: ${previousAssigneeId || 'nenhum'} → ${assigneeId || 'nenhum'}`,
    assigneeId: assigneeId || null,
    previousAssigneeId: previousAssigneeId || null,
  });
  return history;
}
