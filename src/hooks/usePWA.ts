/**
 * 📱 Hook para gerenciar PWA
 * 
 * Funcionalidades de instalação, atualização e estado offline
 */

import { useState, useEffect, useCallback } from 'react';

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  isUpdateAvailable: boolean;
  cacheSize: number;
  installPrompt: any;
}

interface PWAActions {
  install: () => Promise<void>;
  update: () => Promise<void>;
  clearCache: () => Promise<void>;
  getCacheSize: () => Promise<number>;
}

export function usePWA(): PWAState & PWAActions {
  const [state, setState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    isOnline: navigator.onLine,
    isUpdateAvailable: false,
    cacheSize: 0,
    installPrompt: null
  });

  // Verificar se está instalado
  useEffect(() => {
    const checkInstalled = () => {
      const isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                          (window.navigator as any).standalone ||
                          document.referrer.includes('android-app://');
      
      setState(prev => ({ ...prev, isInstalled }));
    };

    checkInstalled();
    window.addEventListener('resize', checkInstalled);
    
    return () => window.removeEventListener('resize', checkInstalled);
  }, []);

  // Monitorar conectividade
  useEffect(() => {
    const handleOnline = () => setState(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setState(prev => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Registrar Service Worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      if (import.meta.env.PROD) {
        // Registrar apenas em produção
        navigator.serviceWorker.register('/sw.js')
          .then(registration => {
            console.log('✅ Service Worker registrado:', registration);

            // Verificar atualizações
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    setState(prev => ({ ...prev, isUpdateAvailable: true }));
                  }
                });
              }
            });

            // Obter tamanho do cache
            getCacheSize();
          })
          .catch(error => {
            console.error('❌ Erro ao registrar Service Worker:', error);
          });
      } else {
        // Em desenvolvimento: limpar registros e cache
        console.log('🔧 Modo desenvolvimento - limpando Service Workers');
        navigator.serviceWorker.getRegistrations()
          .then(registrations => {
            return Promise.all(registrations.map(registration => registration.unregister()));
          })
          .then(() => {
            if (window.caches && window.caches.keys) {
              return caches.keys().then(cacheNames => {
                return Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
              });
            }
          })
          .then(() => {
            console.log('✅ Service Workers e cache limpos em desenvolvimento');
          })
          .catch(error => {
            console.warn('⚠️ Erro ao limpar Service Workers em desenvolvimento:', error);
          });
      }
    }
  }, []);

  // Interceptar prompt de instalação
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setState(prev => ({ 
        ...prev, 
        isInstallable: true, 
        installPrompt: e 
      }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Instalar PWA
  const install = useCallback(async (): Promise<void> => {
    if (!state.installPrompt) {
      throw new Error('PWA não pode ser instalada');
    }

    try {
      const result = await state.installPrompt.prompt();
      console.log('📱 Resultado do prompt de instalação:', result);
      
      setState(prev => ({ 
        ...prev, 
        isInstallable: false, 
        installPrompt: null 
      }));
    } catch (error) {
      console.error('❌ Erro na instalação:', error);
      throw error;
    }
  }, [state.installPrompt]);

  // Atualizar PWA
  const update = useCallback(async (): Promise<void> => {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        
        // Recarregar página após atualização
        window.location.reload();
      }
    }
  }, []);

  // Limpar cache
  const clearCache = useCallback(async (): Promise<void> => {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.unregister();
        
        // Limpar todos os caches
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
        
        // Recarregar página
        window.location.reload();
      }
    }
  }, []);

  // Obter tamanho do cache
  const getCacheSize = useCallback(async (): Promise<number> => {
    if ('serviceWorker' in navigator) {
      return new Promise((resolve) => {
        const messageChannel = new MessageChannel();
        
        messageChannel.port1.onmessage = (event) => {
          if (event.data.type === 'CACHE_SIZE') {
            setState(prev => ({ ...prev, cacheSize: event.data.size }));
            resolve(event.data.size);
          }
        };

        navigator.serviceWorker.controller?.postMessage(
          { type: 'GET_CACHE_SIZE' },
          [messageChannel.port2]
        );
      });
    }
    
    return 0;
  }, []);

  return {
    ...state,
    install,
    update,
    clearCache,
    getCacheSize
  };
}

// Hook para notificações push
export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    setIsSupported('Notification' in window && 'serviceWorker' in navigator);
    setPermission(Notification.permission);
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    const result = await Notification.requestPermission();
    setPermission(result);
    return result === 'granted';
  }, [isSupported]);

  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (permission === 'granted') {
      new Notification(title, options);
    }
  }, [permission]);

  return {
    isSupported,
    permission,
    requestPermission,
    showNotification
  };
}

// Hook para funcionalidades offline
export function useOfflineCapabilities() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineData, setOfflineData] = useState<any[]>([]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const saveOfflineData = useCallback((data: any) => {
    const newData = [...offlineData, { ...data, timestamp: Date.now() }];
    setOfflineData(newData);
    localStorage.setItem('offlineData', JSON.stringify(newData));
  }, [offlineData]);

  const syncOfflineData = useCallback(async () => {
    if (isOnline && offlineData.length > 0) {
      try {
        // Implementar lógica de sincronização
        console.log('📤 Sincronizando dados offline:', offlineData.length, 'itens');
        
        // Limpar dados após sincronização
        setOfflineData([]);
        localStorage.removeItem('offlineData');
      } catch (error) {
        console.error('❌ Erro na sincronização:', error);
      }
    }
  }, [isOnline, offlineData]);

  const loadOfflineData = useCallback(() => {
    const saved = localStorage.getItem('offlineData');
    if (saved) {
      setOfflineData(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    loadOfflineData();
  }, [loadOfflineData]);

  return {
    isOnline,
    offlineData,
    saveOfflineData,
    syncOfflineData,
    loadOfflineData
  };
}

