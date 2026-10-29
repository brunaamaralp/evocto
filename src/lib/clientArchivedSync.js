/**
 * Motor de sincronização em tempo real — evento CLIENT_ARCHIVED.
 * Gera REALTIME_CACHE_INVALIDATE e aplica limpeza de cache / mute de notificações.
 */

export const CLIENT_ARCHIVED_EVENT = 'CLIENT_ARCHIVED';
export const REALTIME_CACHE_INVALIDATE_EVENT = 'REALTIME_CACHE_INVALIDATE';
export const PURGE_CLIENT_DATA_ACTION = 'PURGE_CLIENT_DATA';

/** Chaves canônicas consumidas pelo frontend (web/mobile). */
export const TARGET_QUERIES_TO_INVALIDATE = [
  'clients.active',
  'deliverables.board',
  'tasks.my_daily_tasks',
  'notifications.unread',
];

/** Equivalentes em array (React Query style). */
export const TARGET_QUERY_KEY_ARRAYS = [
  ['clients', 'active'],
  ['deliverables', 'board'],
  ['tasks', 'my_daily_tasks'],
  ['notifications', 'unread'],
];

const DEFAULT_TOAST = {
  show: true,
  type: 'info',
  message:
    'Operação do cliente arquivada. Interface e notificações atualizadas.',
};

/** Timers/jobs locais agendados por clientId (push/cron em memória). */
const scheduledJobsByClient = new Map();

/** Estado global mínimo de mute para a sessão atual. */
let globalAppState = {
  notificationsEnabled: true,
  mutedClientIds: new Set(),
};

export function getGlobalNotificationState() {
  return {
    notificationsEnabled: globalAppState.notificationsEnabled,
    mutedClientIds: Array.from(globalAppState.mutedClientIds),
  };
}

export function isClientNotificationsMuted(clientId) {
  if (!globalAppState.notificationsEnabled) return true;
  if (!clientId) return false;
  return globalAppState.mutedClientIds.has(String(clientId));
}

/**
 * Registra um timer/job cancelável vinculado a um clientId.
 * Usado por lembretes/push locais; cancelado no CLIENT_ARCHIVED.
 */
export function scheduleClientNotificationJob(clientId, handle, meta = {}) {
  const id = String(clientId || '');
  if (!id || handle == null) return () => {};
  if (!scheduledJobsByClient.has(id)) scheduledJobsByClient.set(id, new Set());
  const entry = { handle, meta, createdAt: Date.now() };
  scheduledJobsByClient.get(id).add(entry);
  return () => {
    const set = scheduledJobsByClient.get(id);
    if (!set) return;
    set.delete(entry);
    if (set.size === 0) scheduledJobsByClient.delete(id);
  };
}

export function cancelScheduledJobsForClient(clientId) {
  const id = String(clientId || '');
  const set = scheduledJobsByClient.get(id);
  if (!set) return 0;
  let cancelled = 0;
  for (const entry of set) {
    try {
      const h = entry.handle;
      if (typeof h === 'number') {
        clearTimeout(h);
        clearInterval(h);
      } else if (typeof h === 'function') {
        h();
      } else if (h && typeof h.abort === 'function') {
        h.abort();
      } else if (h && typeof h.cancel === 'function') {
        h.cancel();
      }
      cancelled += 1;
    } catch (err) {
      console.warn('[clientArchivedSync] cancel job failed', err?.message || err);
    }
  }
  scheduledJobsByClient.delete(id);
  return cancelled;
}

function toIsoZ(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date || Date.now());
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/**
 * Payload obrigatório REALTIME_CACHE_INVALIDATE.
 */
export function buildRealtimeCacheInvalidateEvent({
  clientId,
  timestamp,
  toastAlert = DEFAULT_TOAST,
} = {}) {
  return {
    event: REALTIME_CACHE_INVALIDATE_EVENT,
    timestamp: timestamp || toIsoZ(),
    payload: {
      action: PURGE_CLIENT_DATA_ACTION,
      clientId: String(clientId || ''),
      targetQueriesToInvalidate: [...TARGET_QUERIES_TO_INVALIDATE],
      uiDirectives: {
        forceRemoveFromDOM: true,
        mutePushChannels: true,
        toastAlert: {
          show: Boolean(toastAlert?.show !== false),
          type: toastAlert?.type || 'info',
          message:
            toastAlert?.message || DEFAULT_TOAST.message,
        },
      },
      // Campos auxiliares de mute global (consumidos pelo apply local)
      notificationsEnabled: false,
      sourceEvent: CLIENT_ARCHIVED_EVENT,
    },
  };
}

/**
 * Invalida caches locais (CacheManager + React Query, quando disponíveis).
 * Imports dinâmicos evitam quebrar testes/build se a dep não estiver no grafo.
 */
export function invalidateClientUiCaches(clientId) {
  const id = String(clientId || '');

  const deleteKeys = (cacheUtils) => {
    if (!cacheUtils?.delete) return;
    for (const key of TARGET_QUERIES_TO_INVALIDATE) {
      cacheUtils.delete(key);
      cacheUtils.delete(`${key}:${id}`);
    }
    [
      `clients:list`,
      `clients:${id}`,
      `tasks:client:${id}`,
      `tasks:list`,
      `notifications:unread`,
      `notifications:unread:${id}`,
      `deliverables:board`,
      `deliverables:board:${id}`,
    ].forEach((k) => cacheUtils.delete(k));
  };

  void import('@/components/performance/CacheManager')
    .then((mod) => deleteKeys(mod.cacheUtils))
    .catch(() => {});

  void import('@/lib/queryClient')
    .then((mod) => {
      const queryClient = mod.queryClient;
      if (!queryClient?.invalidateQueries) return;
      for (const queryKey of TARGET_QUERY_KEY_ARRAYS) {
        queryClient.invalidateQueries({ queryKey });
        if (id) {
          queryClient.invalidateQueries({ queryKey: [...queryKey, id] });
          queryClient.removeQueries?.({
            predicate: (q) => {
              const k = q.queryKey;
              if (!Array.isArray(k)) return false;
              return k.includes(id) && queryKey[0] === k[0];
            },
          });
        }
      }
    })
    .catch(() => {});
}

/**
 * Aplica o evento no cliente atual: cache, mute, DOM, jobs.
 */
export function applyRealtimeCacheInvalidate(syncEvent) {
  const payload = syncEvent?.payload || {};
  const clientId = String(payload.clientId || '');
  const directives = payload.uiDirectives || {};

  if (payload.action !== PURGE_CLIENT_DATA_ACTION && !clientId) {
    return { applied: false, jobsCancelled: 0 };
  }

  invalidateClientUiCaches(clientId);

  const jobsCancelled = cancelScheduledJobsForClient(clientId);

  if (directives.mutePushChannels || payload.notificationsEnabled === false) {
    globalAppState = {
      ...globalAppState,
      notificationsEnabled: false,
      mutedClientIds: new Set(globalAppState.mutedClientIds).add(clientId),
    };
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('realtime-cache-invalidate', {
        detail: syncEvent,
      })
    );
    window.dispatchEvent(
      new CustomEvent('client-archived-purge', {
        detail: {
          clientId,
          forceRemoveFromDOM: Boolean(directives.forceRemoveFromDOM),
          mutePushChannels: Boolean(directives.mutePushChannels),
          toastAlert: directives.toastAlert,
        },
      })
    );
  }

  return {
    applied: true,
    jobsCancelled,
    notificationsEnabled: globalAppState.notificationsEnabled,
    clientId,
  };
}

/**
 * Processa CLIENT_ARCHIVED: monta o evento de sync, aplica localmente e opcionalmente emite via WS/SSE.
 *
 * @param {object} opts
 * @param {string} opts.clientId
 * @param {(msg: object) => void} [opts.broadcast] — ex.: realtimeManager.send
 * @param {string|Date} [opts.timestamp]
 */
export function processClientArchivedEvent({
  clientId,
  broadcast,
  timestamp,
} = {}) {
  if (!clientId) {
    throw new Error('clientId_required');
  }

  const syncEvent = buildRealtimeCacheInvalidateEvent({
    clientId,
    timestamp,
  });

  // Emitir para colaboradores conectados (WebSocket / SSE bridge)
  if (typeof broadcast === 'function') {
    try {
      broadcast({
        type: REALTIME_CACHE_INVALIDATE_EVENT,
        event: REALTIME_CACHE_INVALIDATE_EVENT,
        payload: syncEvent.payload,
        timestamp: syncEvent.timestamp,
      });
      broadcast({
        type: CLIENT_ARCHIVED_EVENT,
        event: CLIENT_ARCHIVED_EVENT,
        payload: { clientId: String(clientId), sync: syncEvent },
        timestamp: syncEvent.timestamp,
      });
    } catch (err) {
      console.warn('[clientArchivedSync] broadcast failed', err?.message || err);
    }
  }

  const local = applyRealtimeCacheInvalidate(syncEvent);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(CLIENT_ARCHIVED_EVENT, {
        detail: { clientId: String(clientId), sync: syncEvent, local },
      })
    );
  }

  return syncEvent;
}

/** Test helper — reseta mute/jobs em memória. */
export function __resetClientArchivedSyncForTests() {
  scheduledJobsByClient.clear();
  globalAppState = {
    notificationsEnabled: true,
    mutedClientIds: new Set(),
  };
}
