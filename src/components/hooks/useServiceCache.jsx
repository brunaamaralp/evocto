import { useState, useCallback, useRef } from 'react';

/**
 * P2: Hook para cache inteligente de serviços
 */
export function useServiceCache(agencyId) {
  const cacheRef = useRef({
    templates: new Map(),
    instances: new Map(),
    lastFetch: { templates: null, instances: null },
    TTL: 5 * 60 * 1000 // 5 minutos
  });

  const [loading, setLoading] = useState({
    templates: false,
    instances: false
  });

  const shouldRefresh = useCallback((type) => {
    const lastFetch = cacheRef.current.lastFetch[type];
    return !lastFetch || (Date.now() - lastFetch) > cacheRef.current.TTL;
  }, []);

  const getCachedServices = useCallback((type) => {
    const cache = cacheRef.current[type];
    return Array.from(cache.values());
  }, []);

  const setCachedServices = useCallback((type, services) => {
    const cache = cacheRef.current[type];
    cache.clear();
    
    services.forEach(service => {
      cache.set(service.id, service);
    });
    
    cacheRef.current.lastFetch[type] = Date.now();
  }, []);

  const updateCachedService = useCallback((service) => {
    const type = service.is_template ? 'templates' : 'instances';
    cacheRef.current[type].set(service.id, service);
  }, []);

  const removeCachedService = useCallback((serviceId, isTemplate) => {
    const type = isTemplate ? 'templates' : 'instances';
    cacheRef.current[type].delete(serviceId);
  }, []);

  const clearCache = useCallback((type = null) => {
    if (type) {
      cacheRef.current[type].clear();
      cacheRef.current.lastFetch[type] = null;
    } else {
      cacheRef.current.templates.clear();
      cacheRef.current.instances.clear();
      cacheRef.current.lastFetch = { templates: null, instances: null };
    }
  }, []);

  // Métricas de cache
  const getCacheStats = useCallback(() => {
    return {
      templates: {
        size: cacheRef.current.templates.size,
        lastFetch: cacheRef.current.lastFetch.templates,
        age: cacheRef.current.lastFetch.templates ? Date.now() - cacheRef.current.lastFetch.templates : null
      },
      instances: {
        size: cacheRef.current.instances.size,
        lastFetch: cacheRef.current.lastFetch.instances,
        age: cacheRef.current.lastFetch.instances ? Date.now() - cacheRef.current.lastFetch.instances : null
      }
    };
  }, []);

  return {
    // Estado
    loading,
    setLoading,
    
    // Cache operations
    shouldRefresh,
    getCachedServices,
    setCachedServices,
    updateCachedService,
    removeCachedService,
    clearCache,
    
    // Metrics
    getCacheStats
  };
}