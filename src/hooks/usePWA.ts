/**
 * Hook PWA: instalação, status online e atualização do service worker.
 * O registro do SW é feito em main.jsx via virtual:pwa-register.
 */

import { useState, useEffect, useCallback } from 'react';

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  isUpdateAvailable: boolean;
  cacheSize: number;
  installPrompt: BeforeInstallPromptEvent | null;
}

interface PWAActions {
  install: () => Promise<void>;
  update: () => Promise<void>;
  clearCache: () => Promise<void>;
  getCacheSize: () => Promise<number>;
  dismissInstall: () => void;
}

type UpdateSW = (reloadPage?: boolean) => Promise<void>;

let pendingUpdateSW: UpdateSW | null = null;

/** Chamado por main.jsx quando o SW detecta update. */
export function notifyPWAUpdateAvailable(updateSW: UpdateSW) {
  pendingUpdateSW = updateSW;
  window.dispatchEvent(new CustomEvent('pwa:update-available'));
}

function isStandaloneDisplay(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone) ||
    document.referrer.includes('android-app://')
  );
}

export function usePWA(): PWAState & PWAActions {
  const [state, setState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isUpdateAvailable: false,
    cacheSize: 0,
    installPrompt: null,
  });

  useEffect(() => {
    const syncInstalled = () => {
      setState((prev) => ({ ...prev, isInstalled: isStandaloneDisplay() }));
    };
    syncInstalled();
    const mq = window.matchMedia('(display-mode: standalone)');
    mq.addEventListener?.('change', syncInstalled);
    window.addEventListener('appinstalled', syncInstalled);
    return () => {
      mq.removeEventListener?.('change', syncInstalled);
      window.removeEventListener('appinstalled', syncInstalled);
    };
  }, []);

  useEffect(() => {
    const onOnline = () => setState((prev) => ({ ...prev, isOnline: true }));
    const onOffline = () => setState((prev) => ({ ...prev, isOnline: false }));
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    const onBeforeInstall = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setState((prev) => ({
        ...prev,
        isInstallable: true,
        installPrompt: e,
      }));
    };
    const onInstalled = () => {
      setState((prev) => ({
        ...prev,
        isInstalled: true,
        isInstallable: false,
        installPrompt: null,
      }));
    };
    const onUpdateAvailable = () => {
      setState((prev) => ({ ...prev, isUpdateAvailable: true }));
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener('pwa:update-available', onUpdateAvailable);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('pwa:update-available', onUpdateAvailable);
    };
  }, []);

  const getCacheSize = useCallback(async () => {
    if (!('caches' in window)) return 0;
    try {
      const names = await caches.keys();
      let total = 0;
      for (const name of names) {
        const cache = await caches.open(name);
        const keys = await cache.keys();
        for (const req of keys) {
          const res = await cache.match(req);
          if (res) {
            const blob = await res.blob();
            total += blob.size;
          }
        }
      }
      setState((prev) => ({ ...prev, cacheSize: total }));
      return total;
    } catch {
      return 0;
    }
  }, []);

  useEffect(() => {
    getCacheSize().catch(() => {});
  }, [getCacheSize]);

  const install = useCallback(async () => {
    const promptEvent = state.installPrompt;
    if (!promptEvent) {
      throw new Error('Prompt de instalação indisponível neste navegador');
    }
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    setState((prev) => ({
      ...prev,
      installPrompt: null,
      isInstallable: false,
      isInstalled: choice.outcome === 'accepted' ? true : prev.isInstalled,
    }));
    if (choice.outcome !== 'accepted') {
      throw new Error('Instalação cancelada');
    }
  }, [state.installPrompt]);

  const dismissInstall = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isInstallable: false,
      installPrompt: null,
    }));
    try {
      localStorage.setItem('pwa_install_dismissed_at', String(Date.now()));
    } catch {
      /* ignore */
    }
  }, []);

  const update = useCallback(async () => {
    if (pendingUpdateSW) {
      await pendingUpdateSW(true);
      return;
    }
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg?.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
      }
    }
  }, []);

  const clearCache = useCallback(async () => {
    if (!('caches' in window)) return;
    const names = await caches.keys();
    await Promise.all(names.map((n) => caches.delete(n)));
    await getCacheSize();
  }, [getCacheSize]);

  return {
    ...state,
    install,
    update,
    clearCache,
    getCacheSize,
    dismissInstall,
  };
}
