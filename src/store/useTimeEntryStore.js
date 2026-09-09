import { create } from 'zustand';
import {
  fetchRunningTimeEntry,
  invalidateRunningTimeEntryCache,
  notifyTimeEntryChanged,
} from '@/lib/timeEntriesApi';
import {
  TIME_ENTRY_CHANGED_EVENT,
  TIMER_STALE_REVIEW_HOURS,
  isRunningEntry,
  isTimerStale,
} from '@/lib/timeEntriesCore';

export const useTimeEntryStore = create((set, get) => ({
  activeEntry: null,
  configured: true,
  loading: false,
  lastSyncedAt: 0,

  setActiveEntry: (entry) => set({ activeEntry: entry }),

  syncActive: async (agencyId, { force = false, userId } = {}) => {
    const agency = String(agencyId || '').trim();
    if (!agency) {
      set({ activeEntry: null, configured: true, loading: false });
      return null;
    }
    set({ loading: true });
    try {
      const data = await fetchRunningTimeEntry(agency, { force, userId });
      set({
        activeEntry: data.entry || null,
        configured: data.configured !== false,
        loading: false,
        lastSyncedAt: Date.now(),
      });
      return data.entry || null;
    } catch {
      set({ activeEntry: null, configured: false, loading: false });
      return null;
    }
  },

  clear: () =>
    set({
      activeEntry: null,
      configured: true,
      loading: false,
      lastSyncedAt: 0,
    }),

  isStale: () => {
    const entry = get().activeEntry;
    if (!entry || !isRunningEntry(entry)) return false;
    return isTimerStale(entry.startedAt || entry.started_at, new Date(), TIMER_STALE_REVIEW_HOURS);
  },
}));

if (typeof window !== 'undefined') {
  window.addEventListener(TIME_ENTRY_CHANGED_EVENT, (event) => {
    const detail = event?.detail || {};
    if (detail.entry !== undefined) {
      useTimeEntryStore.setState({
        activeEntry: detail.entry,
        lastSyncedAt: Date.now(),
      });
    }
  });
}

export function invalidateTimeEntryStore(agencyId) {
  invalidateRunningTimeEntryCache(agencyId);
}

export { notifyTimeEntryChanged };
