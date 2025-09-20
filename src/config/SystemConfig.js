import { systemMonitor } from './monitoring/SystemMonitor';
import { distributedCache } from './cache/DistributedCache';
import { rateLimiter } from './security/RateLimiter';
import { twoFactorAuth } from './security/TwoFactorAuth';
import { auditLogger } from './security/AuditLogger';

/**
 * Configuração Principal do Sistema
 * Centraliza todas as configurações e inicializações
 */
export class SystemConfig {
  constructor() {
    this.config = {
      // Configurações de Monitoramento
      monitoring: {
        enabled: true,
        metricsInterval: 5000, // 5 segundos
        alertRules: {
          highLatency: { threshold: 1000, severity: 'warning' },
          highErrorRate: { threshold: 5, severity: 'critical' },
          lowUptime: { threshold: 99, severity: 'critical' }
        },
        retentionDays: 7
      },

      // Configurações de Cache
      cache: {
        enabled: true,
        maxSize: 10000,
        defaultTTL: 300000, // 5 minutos
        cleanupInterval: 60000, // 1 minuto
        strategies: {
          'user_data': { ttl: 600000 }, // 10 minutos
          'service_templates': { ttl: 1800000 }, // 30 minutos
          'client_data': { ttl: 900000 }, // 15 minutos
          'kpi_data': { ttl: 300000 } // 5 minutos
        }
      },

      // Configurações de Rate Limiting
      rateLimiting: {
        enabled: true,
        defaultWindow: 60000, // 1 minuto
        defaultLimit: 100, // 100 requests por minuto
        rules: {
          'login': { window: 300000, limit: 5 }, // 5 tentativas em 5 minutos
          'api': { window: 60000, limit: 1000 }, // 1000 requests por minuto
          'upload': { window: 300000, limit: 10 }, // 10 uploads em 5 minutos
          'export': { window: 3600000, limit: 5 } // 5 exports por hora
        }
      },

      // Configurações de 2FA
      twoFactorAuth: {
        enabled: true,
        maxAttempts: 5,
        attemptWindow: 300000, // 5 minutos
        totpWindow: 30000, // 30 segundos
        backupCodeCount: 10,
        requiredRoles: ['admin', 'consultant']
      },

      // Configurações de Auditoria
      audit: {
        enabled: true,
        retentionDays: 90,
        maxLogsPerUser: 10000,
        sensitiveFields: ['password', 'token', 'secret', 'apiKey', 'privateKey'],
        logLevels: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
      },

      // Configurações de Performance
      performance: {
        enabled: true,
        slowRenderThreshold: 16, // 16ms = 60fps
        lazyLoadingThreshold: 100, // 100 itens
        imageOptimization: {
          enabled: true,
          quality: 80,
          format: 'webp',
          lazy: true
        }
      },

      // Configurações de Segurança
      security: {
        enabled: true,
        passwordPolicy: {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: true,
          maxAge: 90 // dias
        },
        sessionPolicy: {
          maxAge: 3600000, // 1 hora
          refreshThreshold: 300000, // 5 minutos
          maxConcurrentSessions: 3
        }
      }
    };

    this.initialize();
  }

  /**
   * Inicializa o sistema
   */
  initialize() {
    console.log('[SystemConfig] Inicializando sistema...');

    // Inicializar monitoramento
    if (this.config.monitoring.enabled) {
      this.initializeMonitoring();
    }

    // Inicializar cache
    if (this.config.cache.enabled) {
      this.initializeCache();
    }

    // Inicializar rate limiting
    if (this.config.rateLimiting.enabled) {
      this.initializeRateLimiting();
    }

    // Inicializar 2FA
    if (this.config.twoFactorAuth.enabled) {
      this.initialize2FA();
    }

    // Inicializar auditoria
    if (this.config.audit.enabled) {
      this.initializeAudit();
    }

    console.log('[SystemConfig] Sistema inicializado com sucesso');
  }

  /**
   * Inicializa monitoramento
   */
  initializeMonitoring() {
    console.log('[SystemConfig] Inicializando monitoramento...');
    
    // Configurar regras de alerta personalizadas
    for (const [ruleName, rule] of Object.entries(this.config.monitoring.alertRules)) {
      systemMonitor.addAlertRule(ruleName, {
        name: ruleName,
        condition: (metric) => metric.value > rule.threshold,
        severity: rule.severity,
        message: `Limite excedido: {value} > ${rule.threshold}`
      });
    }

    // Configurar listeners de eventos
    systemMonitor.on('alert', (alert) => {
      console.warn(`[SystemMonitor] Alerta ${alert.rule.severity}: ${alert.rule.message}`);
    });

    systemMonitor.on('metric', (metric) => {
      // Em produção, enviar para serviço de métricas
      console.log(`[SystemMonitor] Métrica: ${metric.name} = ${metric.value}`);
    });
  }

  /**
   * Inicializa cache
   */
  initializeCache() {
    console.log('[SystemConfig] Inicializando cache...');
    
    // Configurar estratégias de cache
    for (const [strategy, config] of Object.entries(this.config.cache.strategies)) {
      distributedCache.set(`__strategy_${strategy}`, config, 0); // Sem expiração
    }

    // Configurar listeners de eventos
    distributedCache.on('hit', (data) => {
      console.log(`[DistributedCache] Cache hit: ${data.key}`);
    });

    distributedCache.on('miss', (data) => {
      console.log(`[DistributedCache] Cache miss: ${data.key}`);
    });

    distributedCache.on('evicted', (data) => {
      console.log(`[DistributedCache] Item evicted: ${data.key}`);
    });
  }

  /**
   * Inicializa rate limiting
   */
  initializeRateLimiting() {
    console.log('[SystemConfig] Inicializando rate limiting...');
    
    // Configurar regras personalizadas
    for (const [ruleName, rule] of Object.entries(this.config.rateLimiting.rules)) {
      rateLimiter.addAlertRule(ruleName, {
        name: ruleName,
        condition: (metric) => metric.value > rule.limit,
        severity: 'warning',
        message: `Rate limit excedido para ${ruleName}: {value} > ${rule.limit}`
      });
    }

    // Configurar listeners de eventos
    rateLimiter.on('blocked', (data) => {
      console.warn(`[RateLimiter] Requisição bloqueada: ${data.identifier}`);
    });

    rateLimiter.on('allowed', (data) => {
      console.log(`[RateLimiter] Requisição permitida: ${data.identifier}`);
    });
  }

  /**
   * Inicializa 2FA
   */
  initialize2FA() {
    console.log('[SystemConfig] Inicializando 2FA...');
    
    // Configurar listeners de eventos
    twoFactorAuth.on('2fa_enabled', (data) => {
      console.log(`[TwoFactorAuth] 2FA habilitado para usuário: ${data.userId}`);
    });

    twoFactorAuth.on('2fa_disabled', (data) => {
      console.log(`[TwoFactorAuth] 2FA desabilitado para usuário: ${data.userId}`);
    });

    twoFactorAuth.on('auth_success', (data) => {
      console.log(`[TwoFactorAuth] Autenticação bem-sucedida: ${data.userId}`);
    });

    twoFactorAuth.on('auth_failed', (data) => {
      console.warn(`[TwoFactorAuth] Autenticação falhada: ${data.userId}`);
    });
  }

  /**
   * Inicializa auditoria
   */
  initializeAudit() {
    console.log('[SystemConfig] Inicializando auditoria...');
    
    // Configurar listeners de eventos
    auditLogger.on('audit_log', (log) => {
      console.log(`[AuditLogger] Log de auditoria: ${log.action} em ${log.resource}`);
    });

    auditLogger.on('session_start', (session) => {
      console.log(`[AuditLogger] Sessão iniciada: ${session.userId}`);
    });

    auditLogger.on('session_end', (session) => {
      console.log(`[AuditLogger] Sessão finalizada: ${session.userId}`);
    });

    auditLogger.on('cleanup', (data) => {
      console.log(`[AuditLogger] Limpeza realizada: ${data.removedLogs} logs removidos`);
    });
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
   * Obtém estatísticas do sistema
   */
  getSystemStats() {
    return {
      monitoring: {
        isEnabled: this.config.monitoring.enabled,
        metricsCount: systemMonitor.getAllMetrics(),
        activeAlerts: systemMonitor.getActiveAlerts().length,
        uptime: systemMonitor.getMetrics('uptime')?.[0]?.value || 0
      },
      cache: {
        isEnabled: this.config.cache.enabled,
        stats: distributedCache.getStats(),
        utilization: distributedCache.getStats().utilization
      },
      rateLimiting: {
        isEnabled: this.config.rateLimiting.enabled,
        stats: rateLimiter.getStats(),
        activeWindows: rateLimiter.getActiveWindows().length
      },
      twoFactorAuth: {
        isEnabled: this.config.twoFactorAuth.enabled,
        stats: twoFactorAuth.getStats(),
        enabledUsers: twoFactorAuth.getStats().enabledUsers
      },
      audit: {
        isEnabled: this.config.audit.enabled,
        stats: auditLogger.getAuditStats(),
        activeSessions: auditLogger.getActiveSessions().length
      }
    };
  }

  /**
   * Reinicializa o sistema
   */
  reinitialize() {
    console.log('[SystemConfig] Reinicializando sistema...');
    this.initialize();
  }

  /**
   * Para o sistema
   */
  shutdown() {
    console.log('[SystemConfig] Parando sistema...');
    
    systemMonitor.stopMonitoring();
    distributedCache.stopCleanup();
    rateLimiter.stopCleanup();
    twoFactorAuth.stopCleanup();
    auditLogger.stopCleanup();
    
    console.log('[SystemConfig] Sistema parado');
  }
}

// Instância singleton
export const systemConfig = new SystemConfig();

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.systemConfig = systemConfig;
}

