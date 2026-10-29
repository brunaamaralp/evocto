import { useEffect } from 'react';
import { toast } from 'sonner';
import {
  CLIENT_ARCHIVED_EVENT,
  isClientNotificationsMuted,
} from '@/lib/clientArchivedSync';

/**
 * Consome purge local (CustomEvent) disparado após CLIENT_ARCHIVED:
 * toast, mute e remoção imediata de nós com data-client-id.
 * Não depende de WebSocket/RealtimeProvider — funciona na sessão atual.
 */
export function useClientArchivedRealtimeSync() {
  useEffect(() => {
    const onPurge = (ev) => {
      const detail = ev?.detail || {};
      const clientId = String(detail.clientId || '');
      if (!clientId) return;

      if (detail.forceRemoveFromDOM && typeof document !== 'undefined') {
        const escape =
          typeof CSS !== 'undefined' && CSS.escape
            ? CSS.escape
            : (s) => String(s).replace(/"/g, '\\"');
        document
          .querySelectorAll(`[data-client-id="${escape(clientId)}"]`)
          .forEach((node) => {
            node.setAttribute('data-archived', 'true');
            node.setAttribute('hidden', 'true');
            node.classList.add('client-archived-purged');
          });
      }

      const alert = detail.toastAlert;
      if (alert?.show) {
        const msg =
          alert.message ||
          'Operação do cliente arquivada. Interface e notificações atualizadas.';
        if (alert.type === 'error') toast.error(msg);
        else if (alert.type === 'success') toast.success(msg);
        else toast.info(msg);
      }
    };

    const onArchived = (ev) => {
      const sync = ev?.detail?.sync;
      if (sync?.payload) {
        window.dispatchEvent(
          new CustomEvent('client-archived-purge', {
            detail: {
              clientId: sync.payload.clientId,
              forceRemoveFromDOM: sync.payload.uiDirectives?.forceRemoveFromDOM,
              mutePushChannels: sync.payload.uiDirectives?.mutePushChannels,
              toastAlert: sync.payload.uiDirectives?.toastAlert,
            },
          })
        );
      }
    };

    window.addEventListener('client-archived-purge', onPurge);
    window.addEventListener(CLIENT_ARCHIVED_EVENT, onArchived);
    return () => {
      window.removeEventListener('client-archived-purge', onPurge);
      window.removeEventListener(CLIENT_ARCHIVED_EVENT, onArchived);
    };
  }, []);

  return { isClientNotificationsMuted };
}

export default useClientArchivedRealtimeSync;
