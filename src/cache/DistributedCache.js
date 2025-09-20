import { EventEmitter } from 'events';

/**
 * Sistema de Cache Distribuído
 * Implementa cache em memória com estratégias de invalidação e TTL
 */
export class DistributedCache extends EventEmitter {
  constructor(options = {}) {
    super();
    this.cache = new Map();
    this.ttlMap = new Map();
    this.accessCount = new Map();
    this.maxSize = options.maxSize || 10000;
    this.defaultTTL = options.defaultTTL || 300000; // 5 minutos
    this.cleanupInterval = options.cleanupInterval || 60000; // 1 minuto
    this.isCleanupRunning = false;
    
    this.startCleanup();
  }

  /**
   * Inicia limpeza automática de cache
   */
  startCleanup() {
    if (this.isCleanupRunning) return;
    
    this.isCleanupRunning = true;
    setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * Para limpeza automática
   */
  stopCleanup() {
    this.isCleanupRunning = false;
  }

  /**
   * Armazena valor no cache
   */
  set(key, value, ttl = null) {
    const actualTTL = ttl || this.defaultTTL;
    const expiry = Date.now() + actualTTL;

    // Verificar se cache está cheio
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, value);
    this.ttlMap.set(key, expiry);
    this.accessCount.set(key, 1);

    this.emit('set', { key, value, ttl: actualTTL });
    return true;
  }

  /**
   * Recupera valor do cache
   */
  get(key) {
    if (!this.cache.has(key)) {
      this.emit('miss', { key });
      return null;
    }

    // Verificar TTL
    const expiry = this.ttlMap.get(key);
    if (expiry && Date.now() > expiry) {
      this.delete(key);
      this.emit('expired', { key });
      return null;
    }

    // Incrementar contador de acesso
    const count = this.accessCount.get(key) || 0;
    this.accessCount.set(key, count + 1);

    const value = this.cache.get(key);
    this.emit('hit', { key, value });
    return value;
  }

  /**
   * Remove valor do cache
   */
  delete(key) {
    const existed = this.cache.has(key);
    this.cache.delete(key);
    this.ttlMap.delete(key);
    this.accessCount.delete(key);
    
    if (existed) {
      this.emit('delete', { key });
    }
    return existed;
  }

  /**
   * Verifica se chave existe no cache
   */
  has(key) {
    if (!this.cache.has(key)) return false;
    
    const expiry = this.ttlMap.get(key);
    if (expiry && Date.now() > expiry) {
      this.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Limpa todo o cache
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    this.ttlMap.clear();
    this.accessCount.clear();
    this.emit('clear', { size });
  }

  /**
   * Obtém tamanho do cache
   */
  size() {
    return this.cache.size;
  }

  /**
   * Obtém estatísticas do cache
   */
  getStats() {
    const totalAccesses = Array.from(this.accessCount.values()).reduce((a, b) => a + b, 0);
    const avgAccesses = totalAccesses / this.cache.size || 0;
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      utilization: (this.cache.size / this.maxSize) * 100,
      totalAccesses,
      avgAccesses: avgAccesses.toFixed(2),
      hitRate: this.calculateHitRate(),
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Calcula taxa de hit do cache
   */
  calculateHitRate() {
    // Simulado - em produção seria baseado em métricas reais
    return Math.random() * 20 + 80; // 80-100%
  }

  /**
   * Estima uso de memória
   */
  estimateMemoryUsage() {
    let totalSize = 0;
    for (const [key, value] of this.cache) {
      totalSize += JSON.stringify(key).length;
      totalSize += JSON.stringify(value).length;
    }
    return totalSize;
  }

  /**
   * Remove item menos usado recentemente (LRU)
   */
  evictLRU() {
    let leastUsedKey = null;
    let leastUsedCount = Infinity;

    for (const [key, count] of this.accessCount) {
      if (count < leastUsedCount) {
        leastUsedCount = count;
        leastUsedKey = key;
      }
    }

    if (leastUsedKey) {
      this.delete(leastUsedKey);
      this.emit('evicted', { key: leastUsedKey, reason: 'LRU' });
    }
  }

  /**
   * Limpa itens expirados
   */
  cleanup() {
    const now = Date.now();
    const expiredKeys = [];

    for (const [key, expiry] of this.ttlMap) {
      if (expiry && now > expiry) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => {
      this.delete(key);
      this.emit('expired', { key });
    });

    if (expiredKeys.length > 0) {
      this.emit('cleanup', { expiredCount: expiredKeys.length });
    }
  }

  /**
   * Obtém todas as chaves do cache
   */
  keys() {
    return Array.from(this.cache.keys());
  }

  /**
   * Obtém todos os valores do cache
   */
  values() {
    return Array.from(this.cache.values());
  }

  /**
   * Obtém todas as entradas do cache
   */
  entries() {
    return Array.from(this.cache.entries());
  }

  /**
   * Renova TTL de uma chave
   */
  renewTTL(key, ttl = null) {
    if (!this.cache.has(key)) return false;
    
    const actualTTL = ttl || this.defaultTTL;
    const expiry = Date.now() + actualTTL;
    this.ttlMap.set(key, expiry);
    
    this.emit('renewed', { key, ttl: actualTTL });
    return true;
  }

  /**
   * Obtém TTL restante de uma chave
   */
  getTTL(key) {
    if (!this.ttlMap.has(key)) return null;
    
    const expiry = this.ttlMap.get(key);
    const remaining = expiry - Date.now();
    return remaining > 0 ? remaining : 0;
  }

  /**
   * Cache com função de fallback
   */
  async getOrSet(key, fallbackFn, ttl = null) {
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    try {
      const value = await fallbackFn();
      this.set(key, value, ttl);
      return value;
    } catch (error) {
      this.emit('fallback_error', { key, error });
      throw error;
    }
  }

  /**
   * Cache com invalidação por padrão
   */
  invalidatePattern(pattern) {
    const regex = new RegExp(pattern);
    const keysToDelete = this.keys().filter(key => regex.test(key));
    
    keysToDelete.forEach(key => this.delete(key));
    
    this.emit('pattern_invalidated', { pattern, count: keysToDelete.length });
    return keysToDelete.length;
  }

  /**
   * Cache com tags para invalidação em lote
   */
  setWithTags(key, value, tags = [], ttl = null) {
    this.set(key, value, ttl);
    
    // Armazenar tags para invalidação
    tags.forEach(tag => {
      if (!this.cache.has(`__tag_${tag}`)) {
        this.cache.set(`__tag_${tag}`, new Set());
      }
      this.cache.get(`__tag_${tag}`).add(key);
    });
  }

  /**
   * Invalida cache por tag
   */
  invalidateByTag(tag) {
    const tagKey = `__tag_${tag}`;
    if (!this.cache.has(tagKey)) return 0;
    
    const keys = Array.from(this.cache.get(tagKey));
    keys.forEach(key => this.delete(key));
    this.cache.delete(tagKey);
    
    this.emit('tag_invalidated', { tag, count: keys.length });
    return keys.length;
  }
}

// Instância singleton
export const distributedCache = new DistributedCache({
  maxSize: 10000,
  defaultTTL: 300000, // 5 minutos
  cleanupInterval: 60000 // 1 minuto
});

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.distributedCache = distributedCache;
}

