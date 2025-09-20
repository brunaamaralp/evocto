/**
 * 🎣 Hook Customizado: usePerformanceMonitor
 * 
 * Gerencia métricas de performance dos testes
 */

import { useState, useCallback, useRef, useEffect } from 'react';

const PERFORMANCE_THRESHOLDS = {
  clientKanbanLoadTime: 3000,    // 3 segundos
  globalKanbanLoadTime: 5000,   // 5 segundos
  largeDataLoadTime: 10000,      // 10 segundos
  globalKanbanPerfTime: 8000,    // 8 segundos
  stressTestTime: 15000          // 15 segundos
};

export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState({});
  const [history, setHistory] = useState([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  
  const performanceObserverRef = useRef(null);

  // Iniciar monitoramento
  const startMonitoring = useCallback(() => {
    setIsMonitoring(true);
    
    // Configurar PerformanceObserver se disponível
    if (typeof window !== 'undefined' && window.PerformanceObserver) {
      try {
        performanceObserverRef.current = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.entryType === 'measure' || entry.entryType === 'navigation') {
              updateMetrics(entry);
            }
          });
        });
        
        performanceObserverRef.current.observe({ 
          entryTypes: ['measure', 'navigation'] 
        });
      } catch (error) {
        console.warn('PerformanceObserver não suportado:', error);
      }
    }
  }, []);

  // Parar monitoramento
  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    
    if (performanceObserverRef.current) {
      performanceObserverRef.current.disconnect();
      performanceObserverRef.current = null;
    }
  }, []);

  // Atualizar métricas
  const updateMetrics = useCallback((entry) => {
    const metricData = {
      name: entry.name,
      duration: entry.duration,
      startTime: entry.startTime,
      timestamp: Date.now()
    };

    setMetrics(prev => ({
      ...prev,
      [entry.name]: metricData
    }));

    setHistory(prev => [...prev.slice(-99), metricData]); // Manter últimas 100 entradas
  }, []);

  // Registrar métrica manual
  const recordMetric = useCallback((name, value, threshold = null) => {
    const metricData = {
      name,
      value,
      threshold,
      timestamp: Date.now(),
      status: threshold ? (value <= threshold ? 'good' : 'warning') : 'info'
    };

    setMetrics(prev => ({
      ...prev,
      [name]: metricData
    }));

    setHistory(prev => [...prev.slice(-99), metricData]);
  }, []);

  // Medir tempo de execução
  const measureExecution = useCallback(async (name, fn, threshold = null) => {
    const startTime = performance.now();
    
    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      
      recordMetric(name, duration, threshold);
      
      return {
        result,
        duration,
        status: threshold ? (duration <= threshold ? 'good' : 'warning') : 'info'
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      recordMetric(`${name}_error`, duration, threshold);
      throw error;
    }
  }, [recordMetric]);

  // Obter estatísticas
  const getStats = useCallback(() => {
    const entries = Object.values(metrics);
    
    if (entries.length === 0) {
      return {
        total: 0,
        average: 0,
        min: 0,
        max: 0,
        warnings: 0,
        errors: 0
      };
    }

    const durations = entries.map(e => e.value || e.duration).filter(Boolean);
    const warnings = entries.filter(e => e.status === 'warning').length;
    const errors = entries.filter(e => e.status === 'error').length;

    return {
      total: entries.length,
      average: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
      min: durations.length > 0 ? Math.min(...durations) : 0,
      max: durations.length > 0 ? Math.max(...durations) : 0,
      warnings,
      errors
    };
  }, [metrics]);

  // Verificar se métrica está dentro do threshold
  const checkThreshold = useCallback((metricName, value) => {
    const threshold = PERFORMANCE_THRESHOLDS[metricName];
    if (!threshold) return { status: 'unknown', threshold: null };
    
    return {
      status: value <= threshold ? 'good' : 'warning',
      threshold,
      difference: value - threshold
    };
  }, []);

  // Limpar métricas
  const clearMetrics = useCallback(() => {
    setMetrics({});
    setHistory([]);
  }, []);

  // Exportar dados
  const exportData = useCallback(() => {
    return {
      metrics,
      history,
      stats: getStats(),
      timestamp: new Date().toISOString()
    };
  }, [metrics, history, getStats]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (performanceObserverRef.current) {
        performanceObserverRef.current.disconnect();
      }
    };
  }, []);

  return {
    // Estado
    metrics,
    history,
    isMonitoring,
    
    // Controles
    startMonitoring,
    stopMonitoring,
    clearMetrics,
    
    // Métricas
    recordMetric,
    measureExecution,
    checkThreshold,
    
    // Estatísticas
    getStats,
    exportData,
    
    // Constantes
    PERFORMANCE_THRESHOLDS
  };
}

