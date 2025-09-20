import { advancedSystemConfig } from './AdvancedSystemConfig';
import { serviceCatalog } from '../marketplace/ServiceCatalog';
import { paymentSystem } from '../marketplace/PaymentSystem';
import { publicAPI } from '../api/PublicAPI';
import { pwaManager } from '../pwa/PWAManager';
import { integrationSystem } from '../integrations/IntegrationSystem';

/**
 * Configuração da Fase 3: Expansão e Integração
 * Integra funcionalidades de marketplace, API pública, mobile e integrações
 */
export class Phase3Config {
  constructor() {
    this.config = {
      // Configurações do Marketplace
      marketplace: {
        enabled: true,
        serviceCatalog: {
          enabled: true,
          defaultCurrency: 'BRL',
          supportedCurrencies: ['BRL', 'USD', 'EUR'],
          categories: ['financial', 'technology', 'marketing', 'pricing', 'management'],
          pricingRules: {
            volumeDiscount: { enabled: true, priority: 'high' },
            loyaltyDiscount: { enabled: true, priority: 'medium' },
            seasonalPricing: { enabled: true, priority: 'low' },
            urgencyPricing: { enabled: true, priority: 'high' }
          }
        },
        paymentSystem: {
          enabled: true,
          providers: {
            stripe: { enabled: true, priority: 'high' },
            paypal: { enabled: true, priority: 'medium' },
            pix: { enabled: true, priority: 'high' },
            boleto: { enabled: true, priority: 'medium' }
          },
          commissionRules: {
            standard: { rate: 15, priority: 'high' },
            premium: { rate: 20, priority: 'medium' },
            volume: { enabled: true, priority: 'high' }
          }
        }
      },

      // Configurações da API Pública
      publicAPI: {
        enabled: true,
        version: 'v1',
        baseURL: 'https://api.evocto.com',
        rateLimiting: {
          default: { requests: 100, window: 3600 },
          premium: { requests: 1000, window: 3600 },
          enterprise: { requests: 10000, window: 3600 }
        },
        authentication: {
          type: 'API Key',
          location: 'header',
          name: 'X-API-Key'
        },
        endpoints: {
          services: { enabled: true, priority: 'high' },
          orders: { enabled: true, priority: 'high' },
          reviews: { enabled: true, priority: 'medium' },
          categories: { enabled: true, priority: 'medium' },
          stats: { enabled: true, priority: 'low' }
        }
      },

      // Configurações de Mobile e PWA
      mobile: {
        enabled: true,
        pwa: {
          enabled: true,
          cacheName: 'evocto-pwa-v1',
          cacheStrategy: 'cache-first',
          offlinePage: '/offline.html',
          manifest: {
            name: 'Evocto Marketplace',
            shortName: 'Evocto',
            description: 'Marketplace de serviços de consultoria',
            themeColor: '#3b82f6',
            backgroundColor: '#ffffff',
            display: 'standalone',
            orientation: 'portrait',
            startUrl: '/',
            icons: [
              { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
              { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' }
            ]
          }
        },
        responsive: {
          enabled: true,
          breakpoints: {
            mobile: '768px',
            tablet: '1024px',
            desktop: '1280px'
          }
        },
        notifications: {
          enabled: true,
          permissionRequired: true,
          types: ['order', 'payment', 'review', 'system']
        }
      },

      // Configurações de Integrações
      integrations: {
        enabled: true,
        crm: {
          salesforce: { enabled: true, priority: 'high' },
          hubspot: { enabled: true, priority: 'medium' },
          dynamics: { enabled: true, priority: 'medium' }
        },
        erp: {
          sap: { enabled: true, priority: 'high' },
          dynamics: { enabled: true, priority: 'medium' }
        },
        communication: {
          slack: { enabled: true, priority: 'medium' },
          teams: { enabled: true, priority: 'low' }
        },
        automation: {
          zapier: { enabled: true, priority: 'high' },
          ifttt: { enabled: true, priority: 'low' }
        },
        syncInterval: 300000, // 5 minutos
        webhooks: {
          enabled: true,
          maxRetries: 3,
          retryDelay: 5000
        }
      },

      // Configurações de Performance
      performance: {
        enabled: true,
        caching: {
          enabled: true,
          strategies: {
            'service_catalog': { ttl: 3600000 }, // 1 hora
            'payment_data': { ttl: 300000 }, // 5 minutos
            'api_responses': { ttl: 600000 }, // 10 minutos
            'integration_data': { ttl: 1800000 }, // 30 minutos
            'pwa_assets': { ttl: 86400000 } // 24 horas
          }
        },
        optimization: {
          enabled: true,
          lazyLoading: true,
          codeSplitting: true,
          imageOptimization: true,
          bundleOptimization: true,
          cdnEnabled: true
        }
      },

      // Configurações de Segurança
      security: {
        enabled: true,
        apiSecurity: {
          rateLimiting: true,
          cors: true,
          csrf: true,
          xssProtection: true
        },
        dataProtection: {
          encryption: true,
          piiMasking: true,
          auditLogging: true
        },
        authentication: {
          mfa: true,
          sessionTimeout: 3600000, // 1 hora
          passwordPolicy: {
            minLength: 8,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSymbols: true
          }
        }
      }
    };

    this.initialize();
  }

  /**
   * Inicializa a Fase 3
   */
  initialize() {
    console.log('[Phase3Config] Inicializando Fase 3: Expansão e Integração...');

    // Inicializar Marketplace
    if (this.config.marketplace.enabled) {
      this.initializeMarketplace();
    }

    // Inicializar API Pública
    if (this.config.publicAPI.enabled) {
      this.initializePublicAPI();
    }

    // Inicializar Mobile e PWA
    if (this.config.mobile.enabled) {
      this.initializeMobile();
    }

    // Inicializar Integrações
    if (this.config.integrations.enabled) {
      this.initializeIntegrations();
    }

    // Inicializar Performance
    if (this.config.performance.enabled) {
      this.initializePerformance();
    }

    // Inicializar Segurança
    if (this.config.security.enabled) {
      this.initializeSecurity();
    }

    console.log('[Phase3Config] Fase 3 inicializada com sucesso');
  }

  /**
   * Inicializa Marketplace
   */
  initializeMarketplace() {
    console.log('[Phase3Config] Inicializando Marketplace...');
    
    // Configurar Service Catalog
    if (this.config.marketplace.serviceCatalog.enabled) {
      console.log(`[Phase3Config] Service Catalog habilitado com ${this.config.marketplace.serviceCatalog.categories.length} categorias`);
      
      // Configurar listeners de eventos
      serviceCatalog.on('service_created', (data) => {
        console.log(`[ServiceCatalog] Serviço criado: ${data.serviceId}`);
      });

      serviceCatalog.on('order_created', (data) => {
        console.log(`[ServiceCatalog] Pedido criado: ${data.orderId}`);
      });

      serviceCatalog.on('review_added', (data) => {
        console.log(`[ServiceCatalog] Avaliação adicionada: ${data.reviewId}`);
      });
    }

    // Configurar Payment System
    if (this.config.marketplace.paymentSystem.enabled) {
      console.log(`[Phase3Config] Payment System habilitado com ${Object.keys(this.config.marketplace.paymentSystem.providers).length} provedores`);
      
      // Configurar listeners de eventos
      paymentSystem.on('payment_completed', (data) => {
        console.log(`[PaymentSystem] Pagamento concluído: ${data.payment.id}`);
      });

      paymentSystem.on('payment_failed', (data) => {
        console.error(`[PaymentSystem] Pagamento falhou: ${data.payment.id} - ${data.error}`);
      });

      paymentSystem.on('refund_completed', (data) => {
        console.log(`[PaymentSystem] Reembolso concluído: ${data.refund.id}`);
      });
    }
  }

  /**
   * Inicializa API Pública
   */
  initializePublicAPI() {
    console.log('[Phase3Config] Inicializando API Pública...');
    
    console.log(`[Phase3Config] API ${this.config.publicAPI.version} habilitada em ${this.config.publicAPI.baseURL}`);
    
    // Configurar listeners de eventos
    publicAPI.on('request_processed', (data) => {
      console.log(`[PublicAPI] Requisição processada: ${data.requestId}`);
    });

    publicAPI.on('api_key_generated', (data) => {
      console.log(`[PublicAPI] Chave de API gerada: ${data.apiKey.key}`);
    });

    publicAPI.on('rate_limit_exceeded', (data) => {
      console.warn(`[PublicAPI] Rate limit excedido: ${data.apiKey}`);
    });
  }

  /**
   * Inicializa Mobile e PWA
   */
  initializeMobile() {
    console.log('[Phase3Config] Inicializando Mobile e PWA...');
    
    // Configurar PWA
    if (this.config.mobile.pwa.enabled) {
      console.log(`[Phase3Config] PWA habilitado com cache: ${this.config.mobile.pwa.cacheName}`);
      
      // Configurar listeners de eventos
      pwaManager.on('serviceWorkerRegistered', (data) => {
        console.log(`[PWAManager] Service Worker registrado: ${data.registration.scope}`);
      });

      pwaManager.on('appInstalled', () => {
        console.log('[PWAManager] App instalado com sucesso');
      });

      pwaManager.on('updateAvailable', () => {
        console.log('[PWAManager] Atualização disponível');
      });

      pwaManager.on('offline', () => {
        console.log('[PWAManager] App offline');
      });

      pwaManager.on('online', () => {
        console.log('[PWAManager] App online');
      });
    }

    // Configurar Notificações
    if (this.config.mobile.notifications.enabled) {
      console.log(`[Phase3Config] Notificações habilitadas para ${this.config.mobile.notifications.types.length} tipos`);
    }
  }

  /**
   * Inicializa Integrações
   */
  initializeIntegrations() {
    console.log('[Phase3Config] Inicializando Integrações...');
    
    const integrations = integrationSystem.getAvailableIntegrations();
    console.log(`[Phase3Config] ${integrations.length} integrações disponíveis`);
    
    // Configurar listeners de eventos
    integrationSystem.on('integration_connected', (data) => {
      console.log(`[IntegrationSystem] Integração conectada: ${data.connection.integrationName}`);
    });

    integrationSystem.on('sync_completed', (data) => {
      console.log(`[IntegrationSystem] Sincronização concluída: ${data.syncJob.id}`);
    });

    integrationSystem.on('sync_failed', (data) => {
      console.error(`[IntegrationSystem] Sincronização falhou: ${data.syncJob.id} - ${data.error}`);
    });

    integrationSystem.on('webhook_triggered', (data) => {
      console.log(`[IntegrationSystem] Webhook disparado: ${data.webhookId}`);
    });
  }

  /**
   * Inicializa Performance
   */
  initializePerformance() {
    console.log('[Phase3Config] Inicializando Performance...');
    
    // Configurar Cache
    if (this.config.performance.caching.enabled) {
      const strategies = Object.keys(this.config.performance.caching.strategies);
      console.log(`[Phase3Config] Cache habilitado com ${strategies.length} estratégias`);
    }

    // Configurar Otimizações
    if (this.config.performance.optimization.enabled) {
      const optimizations = Object.entries(this.config.performance.optimization)
        .filter(([key, value]) => key !== 'enabled' && value)
        .map(([key]) => key);
      
      console.log(`[Phase3Config] Otimizações habilitadas: ${optimizations.join(', ')}`);
    }
  }

  /**
   * Inicializa Segurança
   */
  initializeSecurity() {
    console.log('[Phase3Config] Inicializando Segurança...');
    
    // Configurar Segurança da API
    if (this.config.security.apiSecurity.enabled) {
      const securityFeatures = Object.entries(this.config.security.apiSecurity)
        .filter(([key, value]) => key !== 'enabled' && value)
        .map(([key]) => key);
      
      console.log(`[Phase3Config] Recursos de segurança da API: ${securityFeatures.join(', ')}`);
    }

    // Configurar Proteção de Dados
    if (this.config.security.dataProtection.enabled) {
      const protectionFeatures = Object.entries(this.config.security.dataProtection)
        .filter(([key, value]) => key !== 'enabled' && value)
        .map(([key]) => key);
      
      console.log(`[Phase3Config] Recursos de proteção de dados: ${protectionFeatures.join(', ')}`);
    }
  }

  /**
   * Obtém configuração
   */
  getConfig(path = null) {
    if (path) {
      return this.getNestedValue(this.config, path);
    }
    return this.config;
  }

  /**
   * Define configuração
   */
  setConfig(path, value) {
    this.setNestedValue(this.config, path, value);
  }

  /**
   * Obtém valor aninhado
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Define valor aninhado
   */
  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  /**
   * Obtém estatísticas da Fase 3
   */
  getPhase3Stats() {
    const baseStats = advancedSystemConfig.getAdvancedStats();
    
    return {
      ...baseStats,
      marketplace: {
        serviceCatalog: {
          enabled: this.config.marketplace.serviceCatalog.enabled,
          stats: serviceCatalog.getMarketplaceStats()
        },
        paymentSystem: {
          enabled: this.config.marketplace.paymentSystem.enabled,
          stats: paymentSystem.getPaymentStats()
        }
      },
      publicAPI: {
        enabled: this.config.publicAPI.enabled,
        stats: publicAPI.getAPIStats()
      },
      mobile: {
        pwa: {
          enabled: this.config.mobile.pwa.enabled,
          status: pwaManager.getPWAStatus()
        }
      },
      integrations: {
        enabled: this.config.integrations.enabled,
        stats: integrationSystem.getIntegrationStats()
      },
      performance: {
        caching: this.config.performance.caching.enabled,
        optimization: this.config.performance.optimization.enabled
      },
      security: {
        apiSecurity: this.config.security.apiSecurity.enabled,
        dataProtection: this.config.security.dataProtection.enabled,
        authentication: this.config.security.authentication.enabled
      }
    };
  }

  /**
   * Valida configuração da Fase 3
   */
  validatePhase3Config() {
    const errors = [];
    
    // Validar Marketplace
    if (this.config.marketplace.enabled) {
      if (!this.config.marketplace.serviceCatalog.enabled) {
        errors.push('Service Catalog deve estar habilitado quando Marketplace está ativo');
      }
      if (!this.config.marketplace.paymentSystem.enabled) {
        errors.push('Payment System deve estar habilitado quando Marketplace está ativo');
      }
    }
    
    // Validar API Pública
    if (this.config.publicAPI.enabled) {
      if (!this.config.publicAPI.baseURL) {
        errors.push('Base URL da API Pública não definida');
      }
      if (!this.config.publicAPI.version) {
        errors.push('Versão da API Pública não definida');
      }
    }
    
    // Validar Mobile
    if (this.config.mobile.enabled) {
      if (this.config.mobile.pwa.enabled && !this.config.mobile.pwa.cacheName) {
        errors.push('Nome do cache PWA não definido');
      }
    }
    
    // Validar Integrações
    if (this.config.integrations.enabled) {
      if (!this.config.integrations.syncInterval) {
        errors.push('Intervalo de sincronização não definido');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Reinicializa a Fase 3
   */
  reinitialize() {
    console.log('[Phase3Config] Reinicializando Fase 3...');
    this.initialize();
  }

  /**
   * Para a Fase 3
   */
  shutdown() {
    console.log('[Phase3Config] Parando Fase 3...');
    
    // Parar serviços do Marketplace
    if (this.config.marketplace.enabled) {
      // serviceCatalog e paymentSystem não têm métodos de parada específicos
    }
    
    // Parar API Pública
    if (this.config.publicAPI.enabled) {
      // publicAPI não tem método de parada específico
    }
    
    // Parar PWA
    if (this.config.mobile.pwa.enabled) {
      // pwaManager não tem método de parada específico
    }
    
    // Parar Integrações
    if (this.config.integrations.enabled) {
      // integrationSystem não tem método de parada específico
    }
    
    console.log('[Phase3Config] Fase 3 parada');
  }
}

// Instância singleton
export const phase3Config = new Phase3Config();

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.phase3Config = phase3Config;
}

