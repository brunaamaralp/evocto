import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildRealtimeCacheInvalidateEvent,
  processClientArchivedEvent,
  scheduleClientNotificationJob,
  cancelScheduledJobsForClient,
  isClientNotificationsMuted,
  getGlobalNotificationState,
  __resetClientArchivedSyncForTests,
  REALTIME_CACHE_INVALIDATE_EVENT,
  TARGET_QUERIES_TO_INVALIDATE,
} from '../clientArchivedSync.js';

describe('clientArchivedSync', () => {
  beforeEach(() => {
    __resetClientArchivedSyncForTests();
  });

  it('builds canonical REALTIME_CACHE_INVALIDATE JSON', () => {
    const event = buildRealtimeCacheInvalidateEvent({
      clientId: 'client-42',
      timestamp: '2026-10-28T21:50:00Z',
    });

    expect(event).toEqual({
      event: REALTIME_CACHE_INVALIDATE_EVENT,
      timestamp: '2026-10-28T21:50:00Z',
      payload: {
        action: 'PURGE_CLIENT_DATA',
        clientId: 'client-42',
        targetQueriesToInvalidate: [
          'clients.active',
          'deliverables.board',
          'tasks.my_daily_tasks',
          'notifications.unread',
        ],
        uiDirectives: {
          forceRemoveFromDOM: true,
          mutePushChannels: true,
          toastAlert: {
            show: true,
            type: 'info',
            message:
              'Operação do cliente arquivada. Interface e notificações atualizadas.',
          },
        },
        notificationsEnabled: false,
        sourceEvent: 'CLIENT_ARCHIVED',
      },
    });
    expect(TARGET_QUERIES_TO_INVALIDATE).toHaveLength(4);
  });

  it('cancels scheduled jobs and mutes notifications for client', () => {
    let cancelled = false;
    scheduleClientNotificationJob('client-42', () => {
      cancelled = true;
    });

    const sync = processClientArchivedEvent({ clientId: 'client-42' });
    expect(sync.event).toBe(REALTIME_CACHE_INVALIDATE_EVENT);
    expect(cancelled).toBe(true);
    expect(cancelScheduledJobsForClient('client-42')).toBe(0);
    expect(isClientNotificationsMuted('client-42')).toBe(true);
    expect(getGlobalNotificationState().notificationsEnabled).toBe(false);
  });

  it('broadcasts REALTIME_CACHE_INVALIDATE and CLIENT_ARCHIVED', () => {
    const sent = [];
    processClientArchivedEvent({
      clientId: 'c1',
      timestamp: '2026-10-28T21:50:00Z',
      broadcast: (msg) => sent.push(msg),
    });
    expect(sent.map((m) => m.type || m.event)).toEqual([
      REALTIME_CACHE_INVALIDATE_EVENT,
      'CLIENT_ARCHIVED',
    ]);
    expect(sent[0].payload.clientId).toBe('c1');
  });
});
