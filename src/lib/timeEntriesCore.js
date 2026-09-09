/**
 * Domínio time_entries — timer por tarefa / entrega / colaborador (estilo ArqTask).
 */

export const TIME_ENTRY_STATUS = Object.freeze({
  RUNNING: 'running',
  PAUSED: 'paused',
  COMPLETED: 'completed',
});

export const TIMER_STALE_REVIEW_HOURS = 8;
export const TIME_ENTRY_CHANGED_EVENT = 'evocto:time-entry-changed';

export function computeDurationSeconds(startedAt, endedAt) {
  const start = Date.parse(String(startedAt || ''));
  const end = Date.parse(String(endedAt || ''));
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return Math.max(0, Math.round((end - start) / 1000));
}

export function normalizeTimeEntry(input = {}) {
  const startedAt = String(input.startedAt || input.started_at || '').trim();
  const endedAt = String(input.endedAt || input.ended_at || '').trim();
  const duration =
    input.durationSeconds != null || input.duration_seconds != null
      ? Math.max(0, Math.trunc(Number(input.durationSeconds ?? input.duration_seconds) || 0))
      : endedAt
        ? computeDurationSeconds(startedAt, endedAt)
        : 0;

  const statusRaw = String(input.status || '').trim().toLowerCase();
  let status = statusRaw;
  if (!status) {
    status = endedAt ? TIME_ENTRY_STATUS.COMPLETED : TIME_ENTRY_STATUS.RUNNING;
  }

  return {
    id: input.id || input.$id || null,
    agencyId: String(input.agencyId || input.agency_id || '').trim(),
    taskId: String(input.taskId || input.task_id || '').trim(),
    serviceId: String(input.serviceId || input.service_id || input.project_id || '').trim(),
    deliverableId: String(input.deliverableId || input.deliverable_id || input.stage_id || '').trim(),
    userId: String(input.userId || input.user_id || '').trim(),
    startedAt,
    endedAt,
    durationSeconds: duration,
    status,
    note: String(input.note || '').trim().slice(0, 512),
    billable: input.billable === true || input.billable === 'true',
    // aliases snake for UI parity with ArqTask widgets
    started_at: startedAt,
    ended_at: endedAt,
    duration_seconds: duration,
    task_id: String(input.taskId || input.task_id || '').trim(),
    service_id: String(input.serviceId || input.service_id || '').trim(),
    deliverable_id: String(input.deliverableId || input.deliverable_id || '').trim(),
    user_id: String(input.userId || input.user_id || '').trim(),
  };
}

export function isRunningEntry(entry) {
  const status = String(entry?.status || '').trim().toLowerCase();
  if (status === TIME_ENTRY_STATUS.RUNNING) return true;
  if (status === TIME_ENTRY_STATUS.PAUSED || status === TIME_ENTRY_STATUS.COMPLETED) return false;
  const ended = String(entry?.endedAt || entry?.ended_at || '').trim();
  return !ended;
}

export function isPausedEntry(entry) {
  return String(entry?.status || '').trim().toLowerCase() === TIME_ENTRY_STATUS.PAUSED;
}

export function canMutateTimeEntry(entry) {
  if (!entry || typeof entry !== 'object') return false;
  if (isRunningEntry(entry)) return false;
  return Boolean(String(entry.endedAt || entry.ended_at || '').trim());
}

export function isTimerStale(startedAt, now = new Date(), maxHours = TIMER_STALE_REVIEW_HOURS) {
  const start = Date.parse(String(startedAt || ''));
  if (!Number.isFinite(start)) return false;
  const maxMs = Math.max(1, Number(maxHours) || 8) * 60 * 60 * 1000;
  return now.getTime() - start >= maxMs;
}

export function formatDurationHms(totalSeconds) {
  const secs = Math.max(0, Math.trunc(Number(totalSeconds) || 0));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function liveElapsedSeconds(startedAt) {
  const start = Date.parse(String(startedAt || ''));
  if (!Number.isFinite(start)) return 0;
  return Math.max(0, Math.floor((Date.now() - start) / 1000));
}

export function entryNeedsTaskAssignment(entry) {
  if (!entry) return false;
  return !String(entry.taskId || entry.task_id || '').trim();
}

export function buildTimerStartedToast(pausedEntry) {
  if (pausedEntry) {
    return {
      title: 'Timer trocado',
      message: 'O timer anterior foi pausado e um novo foi iniciado.',
    };
  }
  return { title: '', message: 'Timer iniciado.' };
}
