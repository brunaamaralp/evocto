import { EventEmitter } from 'events';

/**
 * Sistema de Configuração Avançado
 * Gerencia configurações centralizadas com validação e versionamento
 */
export class AdvancedSystemConfig extends EventEmitter {
  constructor(options = {}) {
    super();
    this.configs = new Map();
    this.schemas = new Map();
    this.history = new Map();
    this.environment = options.environment || 'development';
    this.storage = options.storage || 'localStorage';
    this.versioning = options.versioning || true;
    
    this.initializeConfig();
  }

  /**
   * Inicializa configurações
   */
  initializeConfig() {
    this.setDefaultConfigs();
    this.loadSavedConfigs();
    console.log('[AdvancedSystemConfig] Sistema de configuração inicializado');
  }

  /**
   * Define configurações padrão
   */
  setDefaultConfigs() {
    // Configurações de Performance
    this.setConfig('performance', {
      cache: {
        enabled: true,
        ttl: 3600000,
        maxSize: 1000,
        compression: true
      },
      lazyLoading: {
        enabled: true,
        preloadThreshold: 0.1,
        maxConcurrentLoads: 3
      }
    });

    // Configurações de Segurança
    this.setConfig('security', {
      authentication: {
        sessionTimeout: 3600000,
        maxFailedAttempts: 5,
        lockoutDuration: 900000,
        require2FA: false
      },
      audit: {
        enabled: true,
        retention: 2592000000,
        realTime: true
      }
    });

    // Configurações de Monitoramento
    this.setConfig('monitoring', {
      metrics: {
        collectionInterval: 30000,
        retention: 604800000,
        realTime: true
      },
      alerts: {
        enabled: true,
        channels: ['email', 'slack'],
        thresholds: {
          cpuHigh: 80,
          memoryHigh: 85,
          errorRateHigh: 5
        }
      }
    });
  }

  /**
   * Define configuração
   */
  setConfig(key, value, options = {}) {
    const config = {
      value,
      timestamp: Date.now(),
      version: this.versioning ? this.generateVersion() : null,
      environment: this.environment,
      metadata: {
        source: options.source || 'manual',
        user: options.user || 'system',
        description: options.description || ''
      }
    };

    // Validar configuração se schema existir
    if (this.schemas.has(key)) {
      const validation = this.validateConfig(key, value);
      if (!validation.valid) {
        throw new Error(`Configuração inválida para ${key}: ${validation.errors.join(', ')}`);
      }
    }

    // Armazenar histórico se versionamento habilitado
    if (this.versioning) {
      this.storeHistory(key, config);
    }

    // Armazenar configuração
    this.configs.set(key, config);

    // Salvar configuração
    this.saveConfig(key, config);

    // Emitir evento
    this.emit('config_changed', { key, value, config });

    return config;
  }

  /**
   * Obtém configuração
   */
  getConfig(key, defaultValue = null) {
    const config = this.configs.get(key);
    if (!config) {
      return defaultValue;
    }

    return config.value;
  }

  /**
   * Obtém todas as configurações
   */
  getAllConfigs() {
    const result = {};
    for (const [key, config] of this.configs) {
      result[key] = config.value;
    }
    return result;
  }

  /**
   * Define schema de validação
   */
  setSchema(key, schema) {
    this.schemas.set(key, schema);
    this.emit('schema_set', { key, schema });
  }

  /**
   * Valida configuração
   */
  validateConfig(key, value) {
    const schema = this.schemas.get(key);
    if (!schema) {
      return { valid: true, errors: [] };
    }

    const errors = [];
    
    // Validar tipo
    if (schema.type && typeof value !== schema.type) {
      errors.push(`Tipo esperado: ${schema.type}, recebido: ${typeof value}`);
    }

    // Validar propriedades obrigatórias
    if (schema.required) {
      for (const prop of schema.required) {
        if (!(prop in value)) {
          errors.push(`Propriedade obrigatória ausente: ${prop}`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Armazena histórico
   */
  storeHistory(key, config) {
    if (!this.history.has(key)) {
      this.history.set(key, []);
    }
    
    const history = this.history.get(key);
    history.push(config);
    
    // Manter apenas últimas 10 versões
    if (history.length > 10) {
      history.shift();
    }
  }

  /**
   * Obtém histórico
   */
  getHistory(key) {
    return this.history.get(key) || [];
  }

  /**
   * Salva configuração
   */
  saveConfig(key, config) {
    try {
      const data = JSON.stringify(config);
      
      if (this.storage === 'localStorage' && typeof localStorage !== 'undefined') {
        localStorage.setItem(`config_${key}`, data);
      } else if (this.storage === 'sessionStorage' && typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(`config_${key}`, data);
      }
    } catch (error) {
      console.error(`Erro ao salvar configuração ${key}:`, error);
    }
  }

  /**
   * Carrega configurações salvas
   */
  loadSavedConfigs() {
    try {
      const storage = this.storage === 'localStorage' ? localStorage : sessionStorage;
      
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && key.startsWith('config_')) {
          const configKey = key.replace('config_', '');
          const data = storage.getItem(key);
          
          if (data) {
            const config = JSON.parse(data);
            this.configs.set(configKey, config);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configurações salvas:', error);
    }
  }

  /**
   * Remove configuração
   */
  deleteConfig(key) {
    this.configs.delete(key);
    
    // Remover do storage
    if (this.storage === 'localStorage' && typeof localStorage !== 'undefined') {
      localStorage.removeItem(`config_${key}`);
    } else if (this.storage === 'sessionStorage' && typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(`config_${key}`);
    }
    
    this.emit('config_deleted', { key });
  }

  /**
   * Gera versão
   */
  generateVersion() {
    return Date.now().toString(36);
  }

  /**
   * Exporta configurações
   */
  exportConfigs(format = 'json') {
    const configs = this.getAllConfigs();
    
    if (format === 'json') {
      return JSON.stringify(configs, null, 2);
    }
    
    throw new Error(`Formato não suportado: ${format}`);
  }

  /**
   * Importa configurações
   */
  importConfigs(data, format = 'json') {
    let configs;
    
    if (format === 'json') {
      configs = JSON.parse(data);
    } else {
      throw new Error(`Formato não suportado: ${format}`);
    }
    
    for (const [key, value] of Object.entries(configs)) {
      this.setConfig(key, value, { source: 'import' });
    }
    
    this.emit('configs_imported', { count: Object.keys(configs).length });
  }

  /**
   * Obtém estatísticas
   */
  getStats() {
    return {
      totalConfigs: this.configs.size,
      totalSchemas: this.schemas.size,
      totalHistory: Array.from(this.history.values()).reduce((sum, h) => sum + h.length, 0),
      environment: this.environment,
      storage: this.storage,
      versioning: this.versioning
    };
  }
}

// Instância singleton
export const advancedSystemConfig = new AdvancedSystemConfig({
  environment: process.env.NODE_ENV || 'development',
  storage: 'localStorage',
  versioning: true
});

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.advancedSystemConfig = advancedSystemConfig;
}