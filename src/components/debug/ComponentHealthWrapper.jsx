import React, { useEffect, useRef, useState } from 'react';
import { useHealthMonitor } from './HealthAuditor';

/**
 * HOC para monitorar performance e loops infinitos de componentes
 */
export function withHealthMonitoring(WrappedComponent, componentName) {
  return function HealthMonitoredComponent(props) {
    const { reportRender, reportLoop } = useHealthMonitor();
    const renderCountRef = useRef(0);
    const lastRenderTime = useRef(Date.now());
    const renderTimesRef = useRef([]);

    useEffect(() => {
      const now = Date.now();
      renderCountRef.current += 1;
      
      // Calcular tempo de render
      const renderTime = now - lastRenderTime.current;
      lastRenderTime.current = now;
      
      // Adicionar tempo à lista (manter últimos 10)
      renderTimesRef.current.push(renderTime);
      if (renderTimesRef.current.length > 10) {
        renderTimesRef.current.shift();
      }
      
      // Reportar render lento
      if (renderTime > 16) { // Mais que 1 frame (60fps)
        reportRender(componentName, renderTime);
      }
      
      // Detectar possível loop infinito (muitos renders em pouco tempo)
      const recentRenders = renderTimesRef.current.filter(time => 
        now - time < 1000 // Últimos 1 segundo
      );
      
      if (recentRenders.length > 10) {
        reportLoop(componentName, recentRenders.length);
      }
    });

    return <WrappedComponent {...props} />;
  };
}

/**
 * Hook para monitorar loading states que podem estar travados
 */
export function useLoadingHealthCheck(isLoading, identifier, timeout = 30000) {
  const loadingStartRef = useRef(null);
  const { reportRender } = useHealthMonitor();

  useEffect(() => {
    if (isLoading && !loadingStartRef.current) {
      loadingStartRef.current = Date.now();
    } else if (!isLoading && loadingStartRef.current) {
      loadingStartRef.current = null;
    }
  }, [isLoading]);

  useEffect(() => {
    if (isLoading && loadingStartRef.current) {
      const timer = setTimeout(() => {
        const loadingTime = Date.now() - loadingStartRef.current;
        reportRender(`${identifier}_stuck_loading`, loadingTime);
      }, timeout);

      return () => clearTimeout(timer);
    }
  }, [isLoading, identifier, timeout, reportRender]);
}

/**
 * Hook para detectar vazamentos de memória em effects
 */
export function useMemoryLeakDetector(identifier) {
  const mountTimeRef = useRef(Date.now());
  const effectCountRef = useRef(0);
  const { reportLoop } = useHealthMonitor();

  useEffect(() => {
    effectCountRef.current += 1;
    
    // Se muitos effects rodaram, pode ser vazamento
    if (effectCountRef.current > 100) {
      reportLoop(`${identifier}_potential_memory_leak`, effectCountRef.current);
    }
  });

  useEffect(() => {
    // Capturar valores no momento da criação do effect
    const mountTime = mountTimeRef.current;
    const initialEffectCount = effectCountRef.current;
    
    return () => {
      const lifeTime = Date.now() - mountTime;
      const finalEffectCount = effectCountRef.current;
      
      if (lifeTime > 300000 && finalEffectCount > 1000) { // 5min + 1000 effects
        reportLoop(`${identifier}_confirmed_memory_leak`, finalEffectCount);
      }
    };
  }, [identifier, reportLoop]);
}

/**
 * Componente para detectar componentes que não renderizam
 */
export function RenderHealthCheck({ children, identifier }) {
  const [hasRendered, setHasRendered] = useState(false);
  const { reportRender } = useHealthMonitor();
  const timeoutRef = useRef();

  useEffect(() => {
    // Marcar como renderizado após primeiro effect
    setHasRendered(true);
    
    // Limpar timeout se renderizou
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  useEffect(() => {
    if (!hasRendered) {
      // Timeout para detectar componentes que não renderizam
      timeoutRef.current = setTimeout(() => {
        reportRender(`${identifier}_failed_to_render`, 10000);
      }, 10000);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [hasRendered, identifier, reportRender]);

  return children;
}

/**
 * Hook para detectar estados inconsistentes
 */
export function useStateConsistencyCheck(state, identifier) {
  const previousStateRef = useRef(state);
  const changeCountRef = useRef(0);
  const { reportLoop } = useHealthMonitor();

  useEffect(() => {
    if (JSON.stringify(previousStateRef.current) !== JSON.stringify(state)) {
      changeCountRef.current += 1;
      previousStateRef.current = state;

      // Muitas mudanças de estado podem indicar problema
      if (changeCountRef.current > 50) {
        reportLoop(`${identifier}_state_thrashing`, changeCountRef.current);
      }
    }
  }, [state, identifier, reportLoop]);
}