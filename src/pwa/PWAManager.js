import { EventEmitter } from 'events';

/**
 * Sistema de PWA (Progressive Web App)
 * Implementa funcionalidades de PWA como cache, notificações e instalação
 */
export class PWAManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.isInstalled = false;
    this.isOnline = true;
    this.cacheName = options.cacheName || 'evocto-pwa-v1';
    this.cacheStrategy = options.cacheStrategy || 'cache-first';
    this.notificationPermission = 'default';
    this.serviceWorker = null;
    this.installPrompt = null;
    this.updateAvailable = false;
    
    this.initializePWA();
  }

  /**
   * Inicializa PWA
   */
  async initializePWA() {
    // Verificar se está em ambiente de produção
    if (process.env.NODE_ENV !== 'production') {
      console.log('[PWA] PWA desabilitado em ambiente de desenvolvimento');
      return;
    }

    // Registrar service worker
    await this.registerServiceWorker();
    
    // Configurar cache
    await this.setupCache();
    
    // Configurar notificações
    await this.setupNotifications();
    
    // Configurar instalação
    this.setupInstallation();
    
    // Configurar atualizações
    this.setupUpdates();
    
    // Monitorar conectividade
    this.setupConnectivityMonitoring();
    
    console.log('[PWA] PWA inicializado com sucesso');
  }

  /**
   * Registra service worker
   */
  async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      console.warn('[PWA] Service Worker não suportado');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      this.serviceWorker = registration;
      
      console.log('[PWA] Service Worker registrado:', registration);
      
      // Verificar atualizações
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            this.updateAvailable = true;
            this.emit('updateAvailable');
          }
        });
      });
      
      this.emit('serviceWorkerRegistered', { registration });
    } catch (error) {
      console.error('[PWA] Erro ao registrar Service Worker:', error);
      this.emit('serviceWorkerError', { error });
    }
  }

  /**
   * Configura cache
   */
  async setupCache() {
    if (!('caches' in window)) {
      console.warn('[PWA] Cache API não suportada');
      return;
    }

    try {
      const cache = await caches.open(this.cacheName);
      
      // Cache de recursos estáticos
      const staticResources = [
        '/',
        '/static/js/bundle.js',
        '/static/css/main.css',
        '/manifest.json',
        '/favicon.ico'
      ];

      await cache.addAll(staticResources);
      console.log('[PWA] Cache configurado com sucesso');
      
      this.emit('cacheConfigured', { cacheName: this.cacheName });
    } catch (error) {
      console.error('[PWA] Erro ao configurar cache:', error);
      this.emit('cacheError', { error });
    }
  }

  /**
   * Configura notificações
   */
  async setupNotifications() {
    if (!('Notification' in window)) {
      console.warn('[PWA] Notificações não suportadas');
      return;
    }

    this.notificationPermission = Notification.permission;
    
    if (this.notificationPermission === 'default') {
      // Solicitar permissão quando necessário
      this.emit('notificationPermissionRequired');
    }
    
    console.log('[PWA] Notificações configuradas:', this.notificationPermission);
  }

  /**
   * Solicita permissão para notificações
   */
  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      throw new Error('Notificações não suportadas');
    }

    try {
      const permission = await Notification.requestPermission();
      this.notificationPermission = permission;
      
      if (permission === 'granted') {
        this.emit('notificationPermissionGranted');
        return true;
      } else {
        this.emit('notificationPermissionDenied');
        return false;
      }
    } catch (error) {
      console.error('[PWA] Erro ao solicitar permissão de notificação:', error);
      throw error;
    }
  }

  /**
   * Envia notificação
   */
  async sendNotification(title, options = {}) {
    if (this.notificationPermission !== 'granted') {
      throw new Error('Permissão de notificação não concedida');
    }

    try {
      const notification = new Notification(title, {
        icon: '/icon-192x192.png',
        badge: '/icon-72x72.png',
        ...options
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
        this.emit('notificationClicked', { notification });
      };

      this.emit('notificationSent', { notification });
      return notification;
    } catch (error) {
      console.error('[PWA] Erro ao enviar notificação:', error);
      throw error;
    }
  }

  /**
   * Configura instalação
   */
  setupInstallation() {
    // Escutar evento de instalação
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.installPrompt = e;
      this.emit('installPromptAvailable');
    });

    // Escutar evento de instalação concluída
    window.addEventListener('appinstalled', () => {
      this.isInstalled = true;
      this.installPrompt = null;
      this.emit('appInstalled');
    });
  }

  /**
   * Solicita instalação do app
   */
  async installApp() {
    if (!this.installPrompt) {
      throw new Error('Prompt de instalação não disponível');
    }

    try {
      const result = await this.installPrompt.prompt();
      const choiceResult = await result.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        this.emit('installAccepted');
      } else {
        this.emit('installDeclined');
      }
      
      this.installPrompt = null;
      return choiceResult.outcome === 'accepted';
    } catch (error) {
      console.error('[PWA] Erro ao instalar app:', error);
      throw error;
    }
  }

  /**
   * Configura atualizações
   */
  setupUpdates() {
    if (!this.serviceWorker) return;

    // Escutar mensagens do service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      const { type, data } = event.data;
      
      switch (type) {
        case 'CACHE_UPDATED':
          this.emit('cacheUpdated', data);
          break;
        case 'OFFLINE':
          this.isOnline = false;
          this.emit('offline');
          break;
        case 'ONLINE':
          this.isOnline = true;
          this.emit('online');
          break;
      }
    });
  }

  /**
   * Aplica atualização
   */
  async applyUpdate() {
    if (!this.updateAvailable) {
      throw new Error('Nenhuma atualização disponível');
    }

    try {
      if (this.serviceWorker && this.serviceWorker.waiting) {
        this.serviceWorker.waiting.postMessage({ type: 'SKIP_WAITING' });
        
        // Recarregar página após atualização
        window.location.reload();
        
        this.updateAvailable = false;
        this.emit('updateApplied');
      }
    } catch (error) {
      console.error('[PWA] Erro ao aplicar atualização:', error);
      throw error;
    }
  }

  /**
   * Configura monitoramento de conectividade
   */
  setupConnectivityMonitoring() {
    // Monitorar status de conectividade
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.emit('online');
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.emit('offline');
    });

    // Verificar conectividade periodicamente
    setInterval(() => {
      this.checkConnectivity();
    }, 30000); // A cada 30 segundos
  }

  /**
   * Verifica conectividade
   */
  async checkConnectivity() {
    try {
      const response = await fetch('/api/health', { 
        method: 'HEAD',
        cache: 'no-cache'
      });
      
      const wasOnline = this.isOnline;
      this.isOnline = response.ok;
      
      if (!wasOnline && this.isOnline) {
        this.emit('online');
      } else if (wasOnline && !this.isOnline) {
        this.emit('offline');
      }
    } catch (error) {
      const wasOnline = this.isOnline;
      this.isOnline = false;
      
      if (wasOnline) {
        this.emit('offline');
      }
    }
  }

  /**
   * Limpa cache
   */
  async clearCache() {
    if (!('caches' in window)) {
      throw new Error('Cache API não suportada');
    }

    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      
      console.log('[PWA] Cache limpo com sucesso');
      this.emit('cacheCleared');
    } catch (error) {
      console.error('[PWA] Erro ao limpar cache:', error);
      throw error;
    }
  }

  /**
   * Obtém informações do cache
   */
  async getCacheInfo() {
    if (!('caches' in window)) {
      return null;
    }

    try {
      const cacheNames = await caches.keys();
      const cacheInfo = {};

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        cacheInfo[cacheName] = {
          size: keys.length,
          keys: keys.map(key => key.url)
        };
      }

      return cacheInfo;
    } catch (error) {
      console.error('[PWA] Erro ao obter informações do cache:', error);
      return null;
    }
  }

  /**
   * Obtém status da PWA
   */
  getPWAStatus() {
    return {
      isInstalled: this.isInstalled,
      isOnline: this.isOnline,
      notificationPermission: this.notificationPermission,
      updateAvailable: this.updateAvailable,
      installPromptAvailable: !!this.installPrompt,
      serviceWorkerRegistered: !!this.serviceWorker,
      cacheName: this.cacheName
    };
  }

  /**
   * Obtém estatísticas de uso
   */
  async getUsageStats() {
    const stats = {
      cacheSize: 0,
      cacheEntries: 0,
      notificationsSent: 0,
      offlineTime: 0,
      onlineTime: 0
    };

    try {
      // Obter informações do cache
      const cacheInfo = await this.getCacheInfo();
      if (cacheInfo) {
        for (const cacheName in cacheInfo) {
          stats.cacheEntries += cacheInfo[cacheName].size;
        }
      }

      // Obter estatísticas do localStorage
      const storedStats = localStorage.getItem('pwa_stats');
      if (storedStats) {
        const parsedStats = JSON.parse(storedStats);
        stats.notificationsSent = parsedStats.notificationsSent || 0;
        stats.offlineTime = parsedStats.offlineTime || 0;
        stats.onlineTime = parsedStats.onlineTime || 0;
      }
    } catch (error) {
      console.error('[PWA] Erro ao obter estatísticas:', error);
    }

    return stats;
  }

  /**
   * Salva estatísticas
   */
  saveStats(stats) {
    try {
      localStorage.setItem('pwa_stats', JSON.stringify(stats));
    } catch (error) {
      console.error('[PWA] Erro ao salvar estatísticas:', error);
    }
  }
}

/**
 * Service Worker para PWA
 */
export class ServiceWorkerManager {
  constructor() {
    this.cacheName = 'evocto-pwa-v1';
    this.offlinePage = '/offline.html';
  }

  /**
   * Instala service worker
   */
  install() {
    self.addEventListener('install', (event) => {
      console.log('[SW] Service Worker instalado');
      
      event.waitUntil(
        caches.open(this.cacheName).then((cache) => {
          return cache.addAll([
            '/',
            '/offline.html',
            '/static/js/bundle.js',
            '/static/css/main.css',
            '/manifest.json'
          ]);
        })
      );
    });
  }

  /**
   * Ativa service worker
   */
  activate() {
    self.addEventListener('activate', (event) => {
      console.log('[SW] Service Worker ativado');
      
      event.waitUntil(
        caches.keys().then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cacheName) => {
              if (cacheName !== this.cacheName) {
                return caches.delete(cacheName);
              }
            })
          );
        })
      );
    });
  }

  /**
   * Intercepta requisições
   */
  fetch() {
    self.addEventListener('fetch', (event) => {
      // Estratégia de cache
      if (event.request.method === 'GET') {
        event.respondWith(
          caches.match(event.request).then((response) => {
            if (response) {
              return response;
            }
            
            return fetch(event.request).then((response) => {
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              
              const responseToCache = response.clone();
              caches.open(this.cacheName).then((cache) => {
                cache.put(event.request, responseToCache);
              });
              
              return response;
            }).catch(() => {
              // Retornar página offline para navegação
              if (event.request.destination === 'document') {
                return caches.match(this.offlinePage);
              }
            });
          })
        );
      }
    });
  }

  /**
   * Gerencia mensagens
   */
  message() {
    self.addEventListener('message', (event) => {
      const { type, data } = event.data;
      
      switch (type) {
        case 'SKIP_WAITING':
          self.skipWaiting();
          break;
        case 'CACHE_CLEAR':
          this.clearCache();
          break;
      }
    });
  }

  /**
   * Limpa cache
   */
  async clearCache() {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
  }
}

// Instância singleton
export const pwaManager = new PWAManager();

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.pwaManager = pwaManager;
}

