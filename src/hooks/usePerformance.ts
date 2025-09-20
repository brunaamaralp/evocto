import { useEffect, useRef, useState, useCallback } from 'react';
import { systemMonitor } from '../monitoring/SystemMonitor';
import { distributedCache } from '../cache/DistributedCache';

/**
 * Hook para monitoramento de performance de componentes
 * Mede renderização, re-renders e otimizações
 */
export function usePerformanceMonitor(componentName, options = {}) {
  const [metrics, setMetrics] = useState({
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
    totalRenderTime: 0,
    isSlowRender: false
  });

  const renderStartTime = useRef(0);
  const renderTimes = useRef([]);
  const isFirstRender = useRef(true);

  const startRender = useCallback(() => {
    renderStartTime.current = performance.now();
  }, []);

  const endRender = useCallback(() => {
    const renderTime = performance.now() - renderStartTime.current;
    const isSlow = renderTime > (options.slowRenderThreshold || 16); // 16ms = 60fps

    setMetrics(prev => {
      const newRenderCount = prev.renderCount + 1;
      const newTotalRenderTime = prev.totalRenderTime + renderTime;
      const newAverageRenderTime = newTotalRenderTime / newRenderCount;

      return {
        renderCount: newRenderCount,
        lastRenderTime: renderTime,
        averageRenderTime: newAverageRenderTime,
        totalRenderTime: newTotalRenderTime,
        isSlowRender: isSlow
      };
    });

    // Registrar métrica no SystemMonitor
    systemMonitor.recordMetric(`component_${componentName}_render_time`, renderTime);
    
    if (isSlow) {
      systemMonitor.recordMetric(`component_${componentName}_slow_renders`, 1);
    }

    // Armazenar tempos de renderização para análise
    renderTimes.current.push(renderTime);
    if (renderTimes.current.length > 100) {
      renderTimes.current.shift();
    }

    isFirstRender.current = false;
  }, [componentName, options.slowRenderThreshold]);

  useEffect(() => {
    startRender();
    return () => {
      endRender();
    };
  });

  return {
    ...metrics,
    startRender,
    endRender,
    renderTimes: renderTimes.current
  };
}

/**
 * Hook para otimização de queries com cache
 */
export function useOptimizedQuery(queryKey, queryFn, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isStale, setIsStale] = useState(false);

  const {
    ttl = 300000, // 5 minutos
    staleTime = 60000, // 1 minuto
    refetchOnWindowFocus = true,
    retryCount = 3
  } = options;

  const executeQuery = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      // Verificar cache primeiro
      if (!forceRefresh) {
        const cachedData = distributedCache.get(queryKey);
        if (cachedData) {
          setData(cachedData);
          setIsStale(false);
          setLoading(false);
          return cachedData;
        }
      }

      // Executar query
      const result = await queryFn();
      
      // Armazenar no cache
      distributedCache.set(queryKey, result, ttl);
      
      setData(result);
      setIsStale(false);
      setLoading(false);
      
      return result;
    } catch (err) {
      setError(err);
      setLoading(false);
      throw err;
    }
  }, [queryKey, queryFn, ttl]);

  const refetch = useCallback(() => {
    return executeQuery(true);
  }, [executeQuery]);

  const invalidate = useCallback(() => {
    distributedCache.delete(queryKey);
    setIsStale(true);
  }, [queryKey]);

  useEffect(() => {
    executeQuery();
  }, [executeQuery]);

  useEffect(() => {
    if (!refetchOnWindowFocus) return;

    const handleFocus = () => {
      if (isStale) {
        executeQuery();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnWindowFocus, isStale, executeQuery]);

  return {
    data,
    loading,
    error,
    isStale,
    refetch,
    invalidate
  };
}

/**
 * Hook para lazy loading de componentes
 */
export function useLazyComponent(importFn, options = {}) {
  const [Component, setComponent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadComponent = useCallback(async () => {
    if (Component) return Component;

    try {
      setLoading(true);
      setError(null);

      const module = await importFn();
      const component = module.default || module;
      
      setComponent(() => component);
      setLoading(false);
      
      return component;
    } catch (err) {
      setError(err);
      setLoading(false);
      throw err;
    }
  }, [Component, importFn]);

  useEffect(() => {
    if (options.autoLoad) {
      loadComponent();
    }
  }, [loadComponent, options.autoLoad]);

  return {
    Component,
    loading,
    error,
    loadComponent
  };
}

/**
 * Hook para debounce de valores
 */
export function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook para throttle de funções
 */
export function useThrottle(callback, delay) {
  const lastRun = useRef(Date.now());

  return useCallback((...args) => {
    if (Date.now() - lastRun.current >= delay) {
      callback(...args);
      lastRun.current = Date.now();
    }
  }, [callback, delay]);
}

/**
 * Hook para memoização de cálculos pesados
 */
export function useMemoizedCalculation(calculationFn, dependencies) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const executeCalculation = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const cacheKey = `calc_${JSON.stringify(dependencies)}`;
      const cachedResult = distributedCache.get(cacheKey);
      
      if (cachedResult) {
        setResult(cachedResult);
        setLoading(false);
        return cachedResult;
      }

      const calculationResult = await calculationFn();
      
      distributedCache.set(cacheKey, calculationResult, 600000); // 10 minutos
      setResult(calculationResult);
      setLoading(false);
      
      return calculationResult;
    } catch (err) {
      setError(err);
      setLoading(false);
      throw err;
    }
  }, [calculationFn, dependencies]);

  useEffect(() => {
    executeCalculation();
  }, [executeCalculation]);

  return {
    result,
    loading,
    error,
    recalculate: executeCalculation
  };
}

/**
 * Hook para otimização de listas grandes
 */
export function useVirtualizedList(items, options = {}) {
  const {
    itemHeight = 50,
    containerHeight = 400,
    overscan = 5
  } = options;

  const [scrollTop, setScrollTop] = useState(0);
  const [containerRef, setContainerRef] = useState(null);

  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight),
    items.length
  );

  const startIndex = Math.max(0, visibleStart - overscan);
  const endIndex = Math.min(items.length, visibleEnd + overscan);

  const visibleItems = items.slice(startIndex, endIndex);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    containerRef: setContainerRef,
    handleScroll,
    startIndex,
    endIndex
  };
}

/**
 * Hook para otimização de imagens
 */
export function useOptimizedImage(src, options = {}) {
  const [imageState, setImageState] = useState({
    src: null,
    loading: true,
    error: null,
    loaded: false
  });

  const {
    lazy = true,
    placeholder = null,
    fallback = null,
    quality = 80,
    format = 'webp'
  } = options;

  useEffect(() => {
    if (!src) return;

    const loadImage = async () => {
      try {
        setImageState(prev => ({ ...prev, loading: true, error: null }));

        // Verificar cache
        const cacheKey = `img_${src}_${quality}_${format}`;
        const cachedSrc = distributedCache.get(cacheKey);
        
        if (cachedSrc) {
          setImageState({
            src: cachedSrc,
            loading: false,
            error: null,
            loaded: true
          });
          return;
        }

        // Carregar imagem
        const img = new Image();
        img.onload = () => {
          distributedCache.set(cacheKey, src, 3600000); // 1 hora
          setImageState({
            src,
            loading: false,
            error: null,
            loaded: true
          });
        };
        
        img.onerror = () => {
          setImageState({
            src: fallback,
            loading: false,
            error: 'Failed to load image',
            loaded: false
          });
        };

        img.src = src;
      } catch (err) {
        setImageState({
          src: fallback,
          loading: false,
          error: err.message,
          loaded: false
        });
      }
    };

    if (lazy) {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            loadImage();
            observer.disconnect();
          }
        },
        { threshold: 0.1 }
      );

      if (containerRef.current) {
        observer.observe(containerRef.current);
      }

      return () => observer.disconnect();
    } else {
      loadImage();
    }
  }, [src, quality, format, lazy, fallback]);

  return {
    ...imageState,
    containerRef: lazy ? setContainerRef : null
  };
}

