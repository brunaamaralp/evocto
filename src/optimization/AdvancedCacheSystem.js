import { EventEmitter } from 'events';

/**
 * Sistema de Cache Avançado
 * Implementa cache inteligente com invalidação automática e otimizações
 */
export class AdvancedCacheSystem extends EventEmitter {
  constructor(options = {}) {
    super();
    this.cache = new Map();
    this.metadata = new Map();
    this.accessCount = new Map();
    this.lastAccess = new Map();
    this.maxSize = options.maxSize || 1000;
    this.defaultTTL = options.defaultTTL || 3600000; // 1 hora
    this.cleanupInterval = options.cleanupInterval || 300000; // 5 minutos
    this.compressionEnabled = options.compressionEnabled || true;
    this.persistentCache = options.persistentCache || false;
    
    this.initializeCache();
    this.startCleanup();
  }

  /**
   * Inicializa o sistema de cache
   */
  initializeCache() {
    // Carregar cache persistente se habilitado
    if (this.persistentCache && typeof localStorage !== 'undefined') {
      this.loadPersistentCache();
    }

    // Configurar estratégias de cache
    this.strategies = {
      'cache-first': this.cacheFirstStrategy.bind(this),
      'network-first': this.networkFirstStrategy.bind(this),
      'stale-while-revalidate': this.staleWhileRevalidateStrategy.bind(this),
      'cache-only': this.cacheOnlyStrategy.bind(this),
      'network-only': this.networkOnlyStrategy.bind(this)
    };

    console.log('[AdvancedCacheSystem] Sistema de cache inicializado');
  }

  /**
   * Carrega cache persistente
   */
  loadPersistentCache() {
    try {
      const cachedData = localStorage.getItem('advanced_cache');
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        this.cache = new Map(parsed.cache);
        this.metadata = new Map(parsed.metadata);
        this.accessCount = new Map(parsed.accessCount);
        this.lastAccess = new Map(parsed.lastAccess);
        console.log('[AdvancedCacheSystem] Cache persistente carregado');
      }
    } catch (error) {
      console.error('[AdvancedCacheSystem] Erro ao carregar cache persistente:', error);
    }
  }

  /**
   * Salva cache persistente
   */
  savePersistentCache() {
    if (!this.persistentCache || typeof localStorage === 'undefined') return;

    try {
      const cacheData = {
        cache: Array.from(this.cache.entries()),
        metadata: Array.from(this.metadata.entries()),
        accessCount: Array.from(this.accessCount.entries()),
        lastAccess: Array.from(this.lastAccess.entries())
      };
      localStorage.setItem('advanced_cache', JSON.stringify(cacheData));
    } catch (error) {
      console.error('[AdvancedCacheSystem] Erro ao salvar cache persistente:', error);
    }
  }

  /**
   * Define valor no cache
   */
  set(key, value, options = {}) {
    const ttl = options.ttl || this.defaultTTL;
    const strategy = options.strategy || 'cache-first';
    const tags = options.tags || [];
    const priority = options.priority || 'normal';
    const compress = options.compress !== false && this.compressionEnabled;

    const now = Date.now();
    const expiresAt = now + ttl;

    // Comprimir dados se necessário
    const processedValue = compress ? this.compress(value) : value;

    // Armazenar no cache
    this.cache.set(key, processedValue);
    this.metadata.set(key, {
      ttl,
      strategy,
      tags,
      priority,
      compress,
      createdAt: now,
      expiresAt,
      size: this.calculateSize(processedValue)
    });

    // Atualizar estatísticas de acesso
    this.accessCount.set(key, 0);
    this.lastAccess.set(key, now);

    // Verificar se precisa remover itens antigos
    this.evictIfNeeded();

    // Salvar cache persistente
    this.savePersistentCache();

    this.emit('cache_set', { key, value, options });
  }

  /**
   * Obtém valor do cache
   */
  get(key, options = {}) {
    const now = Date.now();
    const metadata = this.metadata.get(key);

    if (!metadata) {
      this.emit('cache_miss', { key });
      return null;
    }

    // Verificar se expirou
    if (now > metadata.expiresAt) {
      this.delete(key);
      this.emit('cache_expired', { key });
      return null;
    }

    // Atualizar estatísticas de acesso
    this.accessCount.set(key, (this.accessCount.get(key) || 0) + 1);
    this.lastAccess.set(key, now);

    const value = this.cache.get(key);
    const processedValue = metadata.compress ? this.decompress(value) : value;

    this.emit('cache_hit', { key, metadata });
    return processedValue;
  }

  /**
   * Obtém valor com estratégia
   */
  async getWithStrategy(key, fetchFunction, options = {}) {
    const strategy = options.strategy || 'cache-first';
    const strategyFunction = this.strategies[strategy];

    if (!strategyFunction) {
      throw new Error(`Estratégia de cache não encontrada: ${strategy}`);
    }

    return strategyFunction(key, fetchFunction, options);
  }

  /**
   * Estratégia Cache First
   */
  async cacheFirstStrategy(key, fetchFunction, options) {
    const cachedValue = this.get(key);
    if (cachedValue !== null) {
      return cachedValue;
    }

    try {
      const freshValue = await fetchFunction();
      this.set(key, freshValue, options);
      return freshValue;
    } catch (error) {
      this.emit('cache_strategy_error', { key, strategy: 'cache-first', error });
      throw error;
    }
  }

  /**
   * Estratégia Network First
   */
  async networkFirstStrategy(key, fetchFunction, options) {
    try {
      const freshValue = await fetchFunction();
      this.set(key, freshValue, options);
      return freshValue;
    } catch (error) {
      const cachedValue = this.get(key);
      if (cachedValue !== null) {
        this.emit('cache_fallback', { key, error });
        return cachedValue;
      }
      throw error;
    }
  }

  /**
   * Estratégia Stale While Revalidate
   */
  async staleWhileRevalidateStrategy(key, fetchFunction, options) {
    const cachedValue = this.get(key);
    
    // Retornar valor em cache imediatamente se disponível
    if (cachedValue !== null) {
      // Atualizar em background
      fetchFunction()
        .then(freshValue => {
          this.set(key, freshValue, options);
          this.emit('cache_revalidated', { key, freshValue });
        })
        .catch(error => {
          this.emit('cache_revalidation_error', { key, error });
        });
      
      return cachedValue;
    }

    // Se não há cache, buscar normalmente
    try {
      const freshValue = await fetchFunction();
      this.set(key, freshValue, options);
      return freshValue;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Estratégia Cache Only
   */
  async cacheOnlyStrategy(key, fetchFunction, options) {
    const cachedValue = this.get(key);
    if (cachedValue === null) {
      throw new Error('Valor não encontrado no cache');
    }
    return cachedValue;
  }

  /**
   * Estratégia Network Only
   */
  async networkOnlyStrategy(key, fetchFunction, options) {
    try {
      const freshValue = await fetchFunction();
      this.set(key, freshValue, options);
      return freshValue;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Remove item do cache
   */
  delete(key) {
    const deleted = this.cache.delete(key);
    this.metadata.delete(key);
    this.accessCount.delete(key);
    this.lastAccess.delete(key);
    
    if (deleted) {
      this.savePersistentCache();
      this.emit('cache_deleted', { key });
    }
    
    return deleted;
  }

  /**
   * Invalida cache por tags
   */
  invalidateByTags(tags) {
    const keysToDelete = [];
    
    for (const [key, metadata] of this.metadata) {
      if (tags.some(tag => metadata.tags.includes(tag))) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.delete(key));
    
    this.emit('cache_invalidated_by_tags', { tags, count: keysToDelete.length });
  }

  /**
   * Limpa cache expirado
   */
  cleanup() {
    const now = Date.now();
    const expiredKeys = [];
    
    for (const [key, metadata] of this.metadata) {
      if (now > metadata.expiresAt) {
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => this.delete(key));
    
    this.emit('cache_cleanup', { expiredCount: expiredKeys.length });
  }

  /**
   * Remove itens se necessário
   */
  evictIfNeeded() {
    if (this.cache.size <= this.maxSize) return;
    
    // Ordenar por prioridade e último acesso
    const sortedKeys = Array.from(this.cache.keys()).sort((a, b) => {
      const metadataA = this.metadata.get(a);
      const metadataB = this.metadata.get(b);
      const lastAccessA = this.lastAccess.get(a) || 0;
      const lastAccessB = this.lastAccess.get(b) || 0;
      
      // Prioridade: low < normal < high < critical
      const priorityOrder = { low: 0, normal: 1, high: 2, critical: 3 };
      const priorityA = priorityOrder[metadataA.priority] || 1;
      const priorityB = priorityOrder[metadataB.priority] || 1;
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      return lastAccessA - lastAccessB;
    });
    
    // Remover itens menos importantes
    const toRemove = sortedKeys.slice(0, this.cache.size - this.maxSize);
    toRemove.forEach(key => this.delete(key));
    
    this.emit('cache_evicted', { count: toRemove.length });
  }

  /**
   * Inicia limpeza automática
   */
  startCleanup() {
    setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * Comprime dados
   */
  compress(data) {
    try {
      const jsonString = JSON.stringify(data);
      // Simulação de compressão (em produção, usar biblioteca real)
      return btoa(jsonString);
    } catch (error) {
      console.error('[AdvancedCacheSystem] Erro na compressão:', error);
      return data;
    }
  }

  /**
   * Descomprime dados
   */
  decompress(data) {
    try {
      const jsonString = atob(data);
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('[AdvancedCacheSystem] Erro na descompressão:', error);
      return data;
    }
  }

  /**
   * Calcula tamanho dos dados
   */
  calculateSize(data) {
    try {
      return JSON.stringify(data).length;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Obtém estatísticas do cache
   */
  getStats() {
    const totalSize = Array.from(this.metadata.values())
      .reduce((sum, meta) => sum + meta.size, 0);
    
    const hitCount = Array.from(this.accessCount.values())
      .reduce((sum, count) => sum + count, 0);
    
    const missCount = this.emit.listenerCount('cache_miss');
    
    return {
      totalItems: this.cache.size,
      totalSize,
      hitCount,
      missCount,
      hitRate: hitCount + missCount > 0 ? hitCount / (hitCount + missCount) : 0,
      maxSize: this.maxSize,
      compressionEnabled: this.compressionEnabled,
      persistentCache: this.persistentCache
    };
  }

  /**
   * Limpa todo o cache
   */
  clear() {
    this.cache.clear();
    this.metadata.clear();
    this.accessCount.clear();
    this.lastAccess.clear();
    
    if (this.persistentCache) {
      localStorage.removeItem('advanced_cache');
    }
    
    this.emit('cache_cleared');
  }
}

// Instância singleton
export const advancedCacheSystem = new AdvancedCacheSystem({
  maxSize: 1000,
  defaultTTL: 3600000, // 1 hora
  cleanupInterval: 300000, // 5 minutos
  compressionEnabled: true,
  persistentCache: true
});

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.advancedCacheSystem = advancedCacheSystem;
}

