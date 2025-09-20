import React, { memo, useMemo, useCallback, useRef, useEffect } from 'react';
import { debounce } from 'lodash';

/**
 * Componentes otimizados com memoização inteligente
 * Reduz renders desnecessários significativamente
 */

/**
 * HOC para memoização inteligente com comparação custom
 */
export const withSmartMemo = (Component, compareProps = null) => {
  const defaultCompare = (prevProps, nextProps) => {
    // Comparação superficial otimizada
    const prevKeys = Object.keys(prevProps);
    const nextKeys = Object.keys(nextProps);
    
    if (prevKeys.length !== nextKeys.length) return false;
    
    for (const key of prevKeys) {
      if (prevProps[key] !== nextProps[key]) {
        // Comparação especial para arrays e objetos simples
        if (Array.isArray(prevProps[key]) && Array.isArray(nextProps[key])) {
          if (prevProps[key].length !== nextProps[key].length) return false;
          for (let i = 0; i < prevProps[key].length; i++) {
            if (prevProps[key][i] !== nextProps[key][i]) return false;
          }
          continue;
        }
        return false;
      }
    }
    return true;
  };
  
  return memo(Component, compareProps || defaultCompare);
};

/**
 * Lista otimizada para grandes volumes de dados
 */
export const OptimizedList = memo(({ 
  items = [], 
  renderItem, 
  keyExtractor,
  windowSize = 20,
  itemHeight = 60,
  className = ""
}) => {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = React.useState(0);
  const [containerHeight, setContainerHeight] = React.useState(600);
  
  // Debounced scroll handler - corrigido
  const handleScroll = useMemo(() => {
    return debounce((e) => {
      setScrollTop(e.target.scrollTop);
    }, 16); // ~60fps
  }, []);
  
  // Calculate visible range
  const { startIndex, endIndex, totalHeight } = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 5);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const endIndex = Math.min(items.length, startIndex + visibleCount + 10);
    const totalHeight = items.length * itemHeight;
    
    return { startIndex, endIndex, totalHeight };
  }, [scrollTop, containerHeight, items.length, itemHeight]);
  
  // Visible items
  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex).map((item, index) => ({
      item,
      index: startIndex + index
    }));
  }, [items, startIndex, endIndex]);
  
  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);
  
  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      onScroll={handleScroll}
      style={{ height: '100%' }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${startIndex * itemHeight}px)` }}>
          {visibleItems.map(({ item, index }) => (
            <div
              key={keyExtractor ? keyExtractor(item, index) : index}
              style={{ height: itemHeight }}
            >
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison para evitar re-renders desnecessários
  return (
    prevProps.items === nextProps.items &&
    prevProps.renderItem === nextProps.renderItem &&
    prevProps.keyExtractor === nextProps.keyExtractor
  );
});

/**
 * Hook otimizado para debounce de inputs
 */
export const useOptimizedDebounce = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = React.useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => clearTimeout(handler);
  }, [value, delay]);
  
  return debouncedValue;
};

/**
 * Hook para callbacks estáveis que não mudam a menos que dependencies mudem
 */
export const useStableCallback = (callback, deps = []) => {
  const callbackRef = useRef(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  });
  
  return useCallback((...args) => {
    return callbackRef.current(...args);
  }, deps);
};

/**
 * Componente de imagem otimizada com lazy loading
 */
export const OptimizedImage = memo(({ 
  src, 
  alt, 
  width, 
  height, 
  className = "",
  placeholder = null,
  ...props 
}) => {
  const imgRef = useRef(null);
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState(false);
  const [inView, setInView] = React.useState(false);
  
  // Intersection Observer para lazy loading
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    
    observer.observe(img);
    return () => observer.disconnect();
  }, []);
  
  const handleLoad = useCallback(() => {
    setLoaded(true);
    setError(false);
  }, []);
  
  const handleError = useCallback(() => {
    setError(true);
    setLoaded(false);
  }, []);
  
  return (
    <div ref={imgRef} className={`relative ${className}`} style={{ width, height }}>
      {/* Placeholder enquanto carrega */}
      {!loaded && !error && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          {placeholder || <div className="text-gray-400 text-sm">Carregando...</div>}
        </div>
      )}
      
      {/* Imagem real */}
      {inView && (
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          onLoad={handleLoad}
          onError={handleError}
          className={`${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
          style={{ width, height }}
          {...props}
        />
      )}
      
      {/* Estado de erro */}
      {error && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-gray-500 text-sm">Erro ao carregar imagem</div>
        </div>
      )}
    </div>
  );
});

/**
 * Hook para memoização de expensive computations
 */
export const useExpensiveMemo = (computeFn, deps = [], debugName = 'computation') => {
  const previousDeps = useRef(deps);
  const previousResult = useRef(null);
  const computeCount = useRef(0);
  const stableComputeFn = useRef(computeFn);
  const stableDebugName = useRef(debugName);
  
  // Update refs
  useEffect(() => {
    stableComputeFn.current = computeFn;
    stableDebugName.current = debugName;
  });
  
  return useMemo(() => {
    // Verificar se deps mudaram
    const depsChanged = !deps.every((dep, index) => 
      Object.is(dep, previousDeps.current[index])
    );
    
    if (!depsChanged && previousResult.current !== null) {
      return previousResult.current;
    }
    
    // Medir performance em development
    const isDevelopment = typeof window !== 'undefined' && window.location.hostname === 'localhost';
    
    if (isDevelopment) {
      const startTime = performance.now();
      const result = stableComputeFn.current();
      const endTime = performance.now();
      
      computeCount.current++;
      console.log(`[${stableDebugName.current}] Computation #${computeCount.current} took ${endTime - startTime}ms`);
      
      previousDeps.current = deps;
      previousResult.current = result;
      return result;
    }
    
    const result = stableComputeFn.current();
    previousDeps.current = deps;
    previousResult.current = result;
    return result;
  }, [deps.length, ...deps]); // Spread deps array
};