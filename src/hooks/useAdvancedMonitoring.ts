/**
 * 📊 Sistema de Monitoring Avançado
 * 
 * Monitora performance, erros, métricas de negócio e saúde da aplicação
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// Tipos para métricas
export interface Metric {
  id: string;
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  category: 'performance' | 'business' | 'error' | 'user';
  tags?: Record<string, string>;
}

export interface ErrorReport {
  id: string;
  message: string;
  stack?: string;
  url: string;
  userAgent: string;
  timestamp: number;
  userId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
}

export interface PerformanceReport {
  id: string;
  metric: string;
  value: number;
  threshold: number;
  status: 'good' | 'warning' | 'error';
  timestamp: number;
  context?: Record<string, any>;
}

export interface BusinessMetric {
  id: string;
  name: string;
  value: number;
  target?: number;
  period: 'daily' | 'weekly' | 'monthly';
  timestamp: number;
  trend: 'up' | 'down' | 'stable';
}

// Configurações de thresholds
const PERFORMANCE_THRESHOLDS = {
  pageLoadTime: { warning: 2000, error: 5000 },
  apiResponseTime: { warning: 1000, error: 3000 },
  memoryUsage: { warning: 50, error: 100 }, // MB
  bundleSize: { warning: 1000, error: 2000 }, // KB
  errorRate: { warning: 5, error: 10 }, // %
  userSatisfaction: { warning: 3, error: 2 } // rating
};

export function useAdvancedMonitoring() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [errors, setErrors] = useState<ErrorReport[]>([]);
  const [performanceReports, setPerformanceReports] = useState<PerformanceReport[]>([]);
  const [businessMetrics, setBusinessMetrics] = useState<BusinessMetric[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  
  const metricsBuffer = useRef<Metric[]>([]);
  const errorsBuffer = useRef<ErrorReport[]>([]);

  // Inicializar monitoring
  useEffect(() => {
    initializeMonitoring();
    return () => cleanupMonitoring();
  }, []);

  // Coletar métricas automaticamente
  useEffect(() => {
    if (isMonitoring) {
      const interval = setInterval(collectMetrics, 5000); // A cada 5 segundos
      return () => clearInterval(interval);
    }
  }, [isMonitoring]);

  const initializeMonitoring = () => {
    // Monitorar erros JavaScript
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    // Monitorar performance
    if ('PerformanceObserver' in window) {
      observePerformance();
    }
    
    // Monitorar mudanças de conectividade
    window.addEventListener('online', () => recordMetric('connectivity', 1, 'status'));
    window.addEventListener('offline', () => recordMetric('connectivity', 0, 'status'));
    
    setIsMonitoring(true);
  };

  const cleanupMonitoring = () => {
    window.removeEventListener('error', handleGlobalError);
    window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    setIsMonitoring(false);
  };

  // Registrar métrica
  const recordMetric = useCallback((
    name: string, 
    value: number, 
    unit: string = '', 
    category: Metric['category'] = 'performance',
    tags?: Record<string, string>
  ) => {
    const metric: Metric = {
      id: `${name}_${Date.now()}`,
      name,
      value,
      unit,
      timestamp: Date.now(),
      category,
      tags
    };

    metricsBuffer.current.push(metric);
    setMetrics(prev => [...prev, metric]);

    // Verificar thresholds
    checkPerformanceThreshold(name, value);
  }, []);

  // Registrar erro
  const recordError = useCallback((
    message: string,
    stack?: string,
    severity: ErrorReport['severity'] = 'medium',
    userId?: string
  ) => {
    const error: ErrorReport = {
      id: `error_${Date.now()}`,
      message,
      stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      userId,
      severity,
      resolved: false
    };

    errorsBuffer.current.push(error);
    setErrors(prev => [...prev, error]);

    // Alertar para erros críticos
    if (severity === 'critical') {
      showCriticalErrorAlert(error);
    }
  }, []);

  // Registrar métrica de negócio
  const recordBusinessMetric = useCallback((
    name: string,
    value: number,
    target?: number,
    period: BusinessMetric['period'] = 'daily'
  ) => {
    const businessMetric: BusinessMetric = {
      id: `business_${name}_${Date.now()}`,
      name,
      value,
      target,
      period,
      timestamp: Date.now(),
      trend: calculateTrend(name, value)
    };

    setBusinessMetrics(prev => [...prev, businessMetric]);
  }, []);

  // Coletar métricas do sistema
  const collectMetrics = useCallback(() => {
    // Performance da página
    if (performance.timing) {
      const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
      recordMetric('pageLoadTime', loadTime, 'ms');
    }

    // Uso de memória
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      recordMetric('memoryUsage', memory.usedJSHeapSize / 1024 / 1024, 'MB');
    }

    // Tamanho do bundle (estimativa)
    const scripts = document.querySelectorAll('script[src]');
    let totalSize = 0;
    scripts.forEach(script => {
      const src = script.getAttribute('src');
      if (src && src.includes('/src/')) {
        totalSize += 50; // Estimativa por script
      }
    });
    recordMetric('bundleSize', totalSize, 'KB');

    // Conectividade
    recordMetric('isOnline', navigator.onLine ? 1 : 0, 'boolean');
  }, [recordMetric]);

  // Observar performance
  const observePerformance = () => {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'navigation') {
          recordMetric('navigationTime', entry.duration, 'ms');
        } else if (entry.entryType === 'resource') {
          recordMetric('resourceLoadTime', entry.duration, 'ms', 'performance', {
            resource: entry.name
          });
        }
      });
    });

    observer.observe({ entryTypes: ['navigation', 'resource'] });
  };

  // Verificar thresholds de performance
  const checkPerformanceThreshold = (metricName: string, value: number) => {
    const threshold = PERFORMANCE_THRESHOLDS[metricName as keyof typeof PERFORMANCE_THRESHOLDS];
    if (!threshold) return;

    let status: PerformanceReport['status'] = 'good';
    if (value > threshold.error) {
      status = 'error';
    } else if (value > threshold.warning) {
      status = 'warning';
    }

    if (status !== 'good') {
      const report: PerformanceReport = {
        id: `perf_${metricName}_${Date.now()}`,
        metric: metricName,
        value,
        threshold: threshold.warning,
        status,
        timestamp: Date.now()
      };

      setPerformanceReports(prev => [...prev, report]);
    }
  };

  // Calcular tendência
  const calculateTrend = (metricName: string, currentValue: number): BusinessMetric['trend'] => {
    const recentMetrics = businessMetrics
      .filter(m => m.name === metricName)
      .slice(-5); // Últimos 5 valores

    if (recentMetrics.length < 2) return 'stable';

    const previousValue = recentMetrics[recentMetrics.length - 1].value;
    const change = ((currentValue - previousValue) / previousValue) * 100;

    if (change > 5) return 'up';
    if (change < -5) return 'down';
    return 'stable';
  };

  // Handlers de erro
  const handleGlobalError = (event: ErrorEvent) => {
    recordError(
      event.message,
      event.error?.stack,
      'high'
    );
  };

  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    recordError(
      `Unhandled Promise Rejection: ${event.reason}`,
      event.reason?.stack,
      'medium'
    );
  };

  // Mostrar alerta para erros críticos
  const showCriticalErrorAlert = (error: ErrorReport) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Erro Crítico Detectado', {
        body: error.message,
        icon: '/icons/icon-192x192.png'
      });
    }
  };

  // Obter estatísticas
  const getStats = useCallback(() => {
    const totalMetrics = metrics.length;
    const totalErrors = errors.length;
    const criticalErrors = errors.filter(e => e.severity === 'critical').length;
    const avgPerformance = metrics
      .filter(m => m.category === 'performance')
      .reduce((sum, m) => sum + m.value, 0) / totalMetrics || 0;

    return {
      totalMetrics,
      totalErrors,
      criticalErrors,
      avgPerformance,
      errorRate: totalErrors > 0 ? (criticalErrors / totalErrors) * 100 : 0
    };
  }, [metrics, errors]);

  // Exportar dados
  const exportData = useCallback(() => {
    return {
      metrics: metricsBuffer.current,
      errors: errorsBuffer.current,
      performanceReports,
      businessMetrics,
      stats: getStats(),
      timestamp: Date.now()
    };
  }, [metricsBuffer, errorsBuffer, performanceReports, businessMetrics, getStats]);

  // Limpar dados antigos
  const cleanupOldData = useCallback(() => {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    
    setMetrics(prev => prev.filter(m => m.timestamp > oneDayAgo));
    setErrors(prev => prev.filter(e => e.timestamp > oneDayAgo));
    setPerformanceReports(prev => prev.filter(p => p.timestamp > oneDayAgo));
    setBusinessMetrics(prev => prev.filter(b => b.timestamp > oneDayAgo));
  }, []);

  return {
    // Estado
    metrics,
    errors,
    performanceReports,
    businessMetrics,
    isMonitoring,
    
    // Ações
    recordMetric,
    recordError,
    recordBusinessMetric,
    getStats,
    exportData,
    cleanupOldData,
    
    // Configurações
    PERFORMANCE_THRESHOLDS
  };
}

