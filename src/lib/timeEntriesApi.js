import { TimeEntry, Task } from '@/api/entities';
import {
  TIME_ENTRY_STATUS,
  TIME_ENTRY_CHANGED_EVENT,
  computeDurationSeconds,
  isRunningEntry,
  normalizeTimeEntry,
} from '@/lib/timeEntriesCore';

const RUNNING_CACHE_MS = 1500;

/** @type {Map<string, { entry: object|null, configured: boolean, fetchedAt: number }>} */
const runningCache = new Map();
/** @type {Map<string, Promise<{ entry: object|null, configured: boolean }>>} */
const runningInflight = new Map();

export function invalidateRunningTimeEntryCache(agencyId) {
  runningCache.delete(String(agencyId || '').trim());
  runningInflight.delete(String(agencyId || '').trim());
}

export function notifyTimeEntryChanged(detail = {}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(TIME_ENTRY_CHANGED_EVENT, { detail }));
}

function nowIso() {
  return new Date().toISOString();
}

function toCreatePayload(entry) {
  return {
    agencyId: entry.agencyId,
    userId: entry.userId,
    taskId: entry.taskId || '',
    serviceId: entry.serviceId || '',
    deliverableId: entry.deliverableId || '',
    status: entry.status,
    startedAt: entry.startedAt,
    endedAt: entry.endedAt || '',
    durationSeconds: entry.durationSeconds || 0,
    note: entry.note || '',
    billable: entry.billable === true,
  };
}

async function syncTaskLoggedSeconds(taskId, agencyId) {
  if (!taskId) return;
  try {
    const entries = await TimeEntry.filter({
      agencyId,
      taskId,
      status: TIME_ENTRY_STATUS.COMPLETED,
    });
    const totalSeconds = (entries || []).reduce(
      (sum, e) => sum + Math.max(0, Math.trunc(Number(e.durationSeconds || e.duration_seconds) || 0)),
      0
    );
    const hours = Math.round((totalSeconds / 3600) * 100) / 100;
    await Task.update(taskId, {
      time_logged_seconds: totalSeconds,
      actualHours: hours,
    });
  } catch (err) {
    console.warn('[timer] syncTaskLoggedSeconds failed', err);
  }
}

async function pauseActiveForUser(agencyId, userId, endedAt = nowIso()) {
  const running = await TimeEntry.filter({
    agencyId,
    userId,
    status: TIME_ENTRY_STATUS.RUNNING,
  }).catch(() => []);

  let paused = null;
  for (const raw of running || []) {
    const entry = normalizeTimeEntry(raw);
    const duration = computeDurationSeconds(entry.startedAt, endedAt);
    const updated = await TimeEntry.update(entry.id, {
      status: TIME_ENTRY_STATUS.PAUSED,
      endedAt,
      durationSeconds: duration,
    });
    paused = normalizeTimeEntry(updated);
    if (paused.taskId) {
      await syncTaskLoggedSeconds(paused.taskId, agencyId);
    }
  }
  return paused;
}

export async function fetchRunningTimeEntry(agencyId, { force = false, userId } = {}) {
  const agency = String(agencyId || '').trim();
  if (!agency) return { entry: null, configured: true };

  const cacheKey = `${agency}:${userId || 'self'}`;
  if (!force) {
    const cached = runningCache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < RUNNING_CACHE_MS) {
      return { entry: cached.entry, configured: cached.configured };
    }
    const inflight = runningInflight.get(cacheKey);
    if (inflight) return inflight;
  }

  const promise = (async () => {
    try {
      const filters = { agencyId: agency, status: TIME_ENTRY_STATUS.RUNNING };
      if (userId) filters.userId = userId;
      const rows = await TimeEntry.filter(filters, '-startedAt', 10);
      const entry = rows?.[0] ? normalizeTimeEntry(rows[0]) : null;
      // If userId not passed, prefer matching current user's entries client-side is already filtered if we pass userId from caller
      const result = { entry, configured: true, fetchedAt: Date.now() };
      runningCache.set(cacheKey, result);
      return { entry: result.entry, configured: true };
    } catch (err) {
      console.warn('[timer] fetchRunningTimeEntry', err);
      const result = { entry: null, configured: false, fetchedAt: Date.now() };
      runningCache.set(cacheKey, result);
      return { entry: null, configured: false };
    } finally {
      runningInflight.delete(cacheKey);
    }
  })();

  runningInflight.set(cacheKey, promise);
  return promise;
}

/**
 * @param {string} agencyId
 * @param {{ userId: string, taskId?: string, serviceId?: string, deliverableId?: string, startedAt?: string }} opts
 */
export async function startTimeEntry(agencyId, opts = {}) {
  const agency = String(agencyId || '').trim();
  const userId = String(opts.userId || '').trim();
  if (!agency) throw new Error('agency_required');
  if (!userId) throw new Error('user_required');

  const startedAt = opts.startedAt || nowIso();
  const paused_entry = await pauseActiveForUser(agency, userId, startedAt);

  const created = await TimeEntry.create(
    toCreatePayload({
      agencyId: agency,
      userId,
      taskId: opts.taskId || '',
      serviceId: opts.serviceId || '',
      deliverableId: opts.deliverableId || '',
      status: TIME_ENTRY_STATUS.RUNNING,
      startedAt,
      endedAt: '',
      durationSeconds: 0,
      note: opts.note || '',
    })
  );

  const entry = normalizeTimeEntry(created);
  invalidateRunningTimeEntryCache(agency);
  notifyTimeEntryChanged({ entry, paused_entry });
  return { entry, paused_entry, sucesso: true };
}

export async function startFloatingTimeEntry(agencyId, userId) {
  return startTimeEntry(agencyId, { userId });
}

export async function pauseTimeEntry(agencyId, entryId, { endedAt, note } = {}) {
  const end = endedAt || nowIso();
  const current = normalizeTimeEntry(await TimeEntry.get(entryId));
  if (!current?.id) throw new Error('entry_not_found');
  if (!isRunningEntry(current)) throw new Error('entry_not_running');

  const duration = computeDurationSeconds(current.startedAt, end);
  const updated = await TimeEntry.update(entryId, {
    status: TIME_ENTRY_STATUS.PAUSED,
    endedAt: end,
    durationSeconds: duration,
    ...(note != null ? { note: String(note).slice(0, 512) } : {}),
  });
  const entry = normalizeTimeEntry(updated);
  if (entry.taskId) await syncTaskLoggedSeconds(entry.taskId, agencyId);
  invalidateRunningTimeEntryCache(agencyId);
  notifyTimeEntryChanged({ entry });
  return entry;
}

export async function stopTimeEntry(agencyId, entryId, { endedAt, note } = {}) {
  const end = endedAt || nowIso();
  const current = normalizeTimeEntry(await TimeEntry.get(entryId));
  if (!current?.id) throw new Error('entry_not_found');

  const duration = isRunningEntry(current)
    ? computeDurationSeconds(current.startedAt, end)
    : Math.max(0, Math.trunc(Number(current.durationSeconds) || 0));

  const updated = await TimeEntry.update(entryId, {
    status: TIME_ENTRY_STATUS.COMPLETED,
    endedAt: isRunningEntry(current) ? end : current.endedAt || end,
    durationSeconds: duration,
    ...(note != null ? { note: String(note).slice(0, 512) } : {}),
  });
  const entry = normalizeTimeEntry(updated);
  if (entry.taskId) await syncTaskLoggedSeconds(entry.taskId, agencyId);
  invalidateRunningTimeEntryCache(agencyId);
  notifyTimeEntryChanged({ entry: null, stopped: entry });
  return entry;
}

/** Resume = pausa current se running e cria novo running (mesmo alvo). */
export async function resumeTimeEntry(agencyId, { userId, taskId, serviceId, deliverableId } = {}) {
  return startTimeEntry(agencyId, { userId, taskId, serviceId, deliverableId });
}

export async function assignTimeEntry(agencyId, entryId, { taskId, serviceId, deliverableId } = {}) {
  const updated = await TimeEntry.update(entryId, {
    taskId: taskId || '',
    serviceId: serviceId || '',
    deliverableId: deliverableId || '',
  });
  const entry = normalizeTimeEntry(updated);
  if (entry.taskId && entry.status === TIME_ENTRY_STATUS.COMPLETED) {
    await syncTaskLoggedSeconds(entry.taskId, agencyId);
  }
  notifyTimeEntryChanged({ entry });
  return entry;
}

export async function listTimeEntries(agencyId, filters = {}) {
  const query = { agencyId, ...filters };
  const rows = await TimeEntry.filter(query, '-startedAt', filters.limit || 100);
  return (rows || []).map(normalizeTimeEntry);
}

export async function deleteTimeEntry(agencyId, entryId) {
  const current = normalizeTimeEntry(await TimeEntry.get(entryId));
  await TimeEntry.delete(entryId);
  if (current.taskId) await syncTaskLoggedSeconds(current.taskId, agencyId);
  invalidateRunningTimeEntryCache(agencyId);
  notifyTimeEntryChanged({});
  return { sucesso: true };
}

export async function sumCompletedSecondsForTask(agencyId, taskId) {
  const rows = await listTimeEntries(agencyId, {
    taskId,
    status: TIME_ENTRY_STATUS.COMPLETED,
    limit: 200,
  });
  return rows.reduce((s, e) => s + (e.durationSeconds || 0), 0);
}
