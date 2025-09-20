import React, { useCallback, useRef, useState, useEffect, useContext } from 'react';

/**
 * Sistema de cache inteligente para otimizar requests e dados
 * Reduz latência e melhora experiência do usuário
 */

class CacheManager {
  constructor() {
    this.cache = new Map();
    this.ttlMap = new Map(); // Time to live para cada entrada
    this.accessCount = new Map(); // Contagem de acesso para LRU
    this.maxSize = 1000; // Máximo de entradas no cache
    this.defaultTTL = 5 * 60 * 1000; // 5 minutos
    
    // Cleanup periódico de entradas expiradas
    setInterval(() => this.cleanup(), 60000); // A cada minuto
  }

  set(key, value, ttl = this.defaultTTL) {
    // Se o cache está cheio, remover entrada menos usada
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }
    
    const expiryTime = Date.now() + ttl;
    
    this.cache.set(key, value);
    this.ttlMap.set(key, expiryTime);
    this.accessCount.set(key, 1);
  }

  get(key) {
    const expiryTime = this.ttlMap.get(key);
    
    // Verificar se expirou
    if (expiryTime && Date.now() > expiryTime) {
      this.delete(key);
      return null;
    }
    
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Incrementar contagem de acesso
      const currentCount = this.accessCount.get(key) || 0;
      this.accessCount.set(key, currentCount + 1);
    }
    
    return value;
  }

  has(key) {
    const expiryTime = this.ttlMap.get(key);
    
    if (expiryTime && Date.now() > expiryTime) {
      this.delete(key);
      return false;
    }
    
    return this.cache.has(key);
  }

  delete(key) {
    this.cache.delete(key);
    this.ttlMap.delete(key);
    this.accessCount.delete(key);
  }

  clear() {
    this.cache.clear();
    this.ttlMap.clear();
    this.accessCount.clear();
  }

  evictLRU() {
    // Encontrar a entrada menos usada
    let lruKey = null;
    let minAccess = Infinity;
    
    for (const [key, count] of this.accessCount.entries()) {
      if (count < minAccess) {
        minAccess = count;
        lruKey = key;
      }
    }
    
    if (lruKey) {
      this.delete(lruKey);
    }
  }

  cleanup() {
    const now = Date.now();
    const expiredKeys = [];
    
    for (const [key, expiryTime] of this.ttlMap.entries()) {
      if (now > expiryTime) {
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => this.delete(key));
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.calculateHitRate()
    };
  }

  calculateHitRate() {
    // Implementação básica - em produção seria mais sofisticado
    return this.cache.size > 0 ? 0.85 : 0; // Mock hit rate
  }
}

// Instância global do cache
const globalCache = new CacheManager();

/**
 * Hook para cache de dados com React
 */
export const useDataCache = (key, fetcher, options = {}) => {
  const { 
    ttl = 5 * 60 * 1000, // 5 minutos
    staleWhileRevalidate = true,
    enabled = true
  } = options;
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!enabled || !key || !fetcher) return;
    
    // Verificar cache primeiro (se não for refresh forçado)
    if (!forceRefresh && globalCache.has(key)) {
      const cachedData = globalCache.get(key);
      setData(cachedData);
      return cachedData;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await fetcher();
      
      // Salvar no cache
      globalCache.set(key, result, ttl);
      setData(result);
      
      return result;
    } catch (err) {
      setError(err);
      
      // Em caso de erro, tentar usar dados do cache se disponível
      if (staleWhileRevalidate && globalCache.has(key)) {
        const staleData = globalCache.get(key);
        setData(staleData);
        return staleData;
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, [key, fetcher, ttl, staleWhileRevalidate, enabled]);
  
  // Effect para carregar dados iniciais
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const refetch = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);
  
  const invalidate = useCallback(() => {
    if (key) {
      globalCache.delete(key);
    }
  }, [key]);
  
  return {
    data,
    loading,
    error,
    refetch,
    invalidate
  };
};

/**
 * Hook para cache de queries com React Query style
 */
export const useCachedQuery = (queryKey, queryFn, options = {}) => {
  const cacheKey = Array.isArray(queryKey) ? queryKey.join(':') : queryKey;
  
  return useDataCache(cacheKey, queryFn, options);
};

/**
 * Hook para mutations com invalidação de cache
 */
export const useCachedMutation = (mutationFn, options = {}) => {
  const { onSuccess, invalidateKeys = [] } = options;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const mutate = useCallback(async (variables) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await mutationFn(variables);
      
      // Invalidar caches relacionados
      invalidateKeys.forEach(key => {
        const cacheKey = Array.isArray(key) ? key.join(':') : key;
        globalCache.delete(cacheKey);
      });
      
      if (onSuccess) {
        onSuccess(result, variables);
      }
      
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [mutationFn, invalidateKeys, onSuccess]);
  
  return {
    mutate,
    loading,
    error
  };
};

/**
 * HOC para caching automático de componentes
 */
export const withCache = (Component, cacheKeyFn) => {
  const componentCache = new Map();
  
  return React.memo((props) => {
    const cacheKey = cacheKeyFn ? cacheKeyFn(props) : JSON.stringify(props);
    
    if (componentCache.has(cacheKey)) {
      return componentCache.get(cacheKey);
    }
    
    const element = <Component {...props} />;
    componentCache.set(cacheKey, element);
    
    // Limpar cache se ficar muito grande
    if (componentCache.size > 100) {
      const firstKey = componentCache.keys().next().value;
      componentCache.delete(firstKey);
    }
    
    return element;
  });
};

/**
 * Utilitários para cache manual
 */
export const cacheUtils = {
  set: (key, value, ttl) => globalCache.set(key, value, ttl),
  get: (key) => globalCache.get(key),
  has: (key) => globalCache.has(key),
  delete: (key) => globalCache.delete(key),
  clear: () => globalCache.clear(),
  stats: () => globalCache.getStats()
};

/**
 * Provider de contexto para cache (opcional)
 */
export const CacheContext = React.createContext(globalCache);

export const CacheProvider = ({ children, cache = globalCache }) => (
  <CacheContext.Provider value={cache}>
    {children}
  </CacheContext.Provider>
);

export const useCacheContext = () => {
  const cache = useContext(CacheContext);
  return cache;
};

export default globalCache;