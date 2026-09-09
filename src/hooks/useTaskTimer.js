import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  formatDurationHms,
  isRunningEntry,
  liveElapsedSeconds,
} from '@/lib/timeEntriesCore';
import { useTimeEntryStore } from '@/store/useTimeEntryStore';

export function useLiveElapsedSeconds(startedAt, enabled = false) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!enabled || !startedAt) {
      setSeconds(0);
      return undefined;
    }
    const tick = () => setSeconds(liveElapsedSeconds(startedAt));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [enabled, startedAt]);

  return seconds;
}

export function isEntryRunningOnTask(entry, task) {
  if (!entry || !task || !isRunningEntry(entry)) return false;
  const taskId = String(task.id || '').trim();
  return String(entry.taskId || entry.task_id || '').trim() === taskId;
}

export function useTaskTimer({ agencyId, userId, task, baseLoggedSeconds = 0 }) {
  const activeEntry = useTimeEntryStore((s) => s.activeEntry);
  const syncActive = useTimeEntryStore((s) => s.syncActive);
  const configured = useTimeEntryStore((s) => s.configured);

  const isRunningHere = useMemo(
    () => isEntryRunningOnTask(activeEntry, task),
    [activeEntry, task]
  );

  const liveExtra = useLiveElapsedSeconds(
    activeEntry?.startedAt || activeEntry?.started_at,
    isRunningHere
  );

  useEffect(() => {
    if (!agencyId) return;
    void syncActive(agencyId, { userId });
  }, [agencyId, userId, syncActive]);

  const displaySeconds =
    Math.max(0, Math.trunc(Number(baseLoggedSeconds) || 0)) + (isRunningHere ? liveExtra : 0);
  const displayLabel = formatDurationHms(displaySeconds);

  const refresh = useCallback(
    () => syncActive(agencyId, { force: true, userId }),
    [agencyId, userId, syncActive]
  );

  return {
    activeEntry,
    configured,
    isRunningHere,
    displayLabel,
    displaySeconds,
    refresh,
  };
}

export function useTimeEntryChangeListener(callback) {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof callback !== 'function') return undefined;
    const handler = () => callback();
    window.addEventListener('evocto:time-entry-changed', handler);
    return () => window.removeEventListener('evocto:time-entry-changed', handler);
  }, [callback]);
}
