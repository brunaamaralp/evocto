import React, { useEffect, useCallback, useRef } from 'react';
import { debounce } from 'lodash';

/**
 * Sistema de monitoramento de performance em tempo real
 * Coleta métricas críticas e Core Web Vitals
 */

class PerformanceTracker {
  constructor() {
    this.metrics = new Map();
    this.observers = [];
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized || typeof window === 'undefined') return;
    
    this.setupObservers();
    this.trackCoreWebVitals();
    this.trackCustomMetrics();
    this.isInitialized = true;
  }

  setupObservers() {
    // Performance Observer para navigation timing
    if ('PerformanceObserver' in window) {
      try {
        const navObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'navigation') {
              this.recordMetric('navigation', {
                domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
                loadComplete: entry.loadEventEnd - entry.loadEventStart,
                totalTime: entry.loadEventEnd - entry.navigationStart
              });
            }
          }
        });
        
        navObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navObserver);
      } catch (e) {
        console.warn('Navigation timing observer not supported');
      }

      // Paint timing observer
      try {
        const paintObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordMetric('paint', {
              [entry.name]: entry.startTime
            });
          }
        });
        
        paintObserver.observe({ entryTypes: ['paint'] });
        this.observers.push(paintObserver);
      } catch (e) {
        console.warn('Paint timing observer not supported');
      }
    }
  }

  trackCoreWebVitals() {
    // Largest Contentful Paint (LCP)
    this.observeLCP();
    
    // First Input Delay (FID)
    this.observeFID();
    
    // Cumulative Layout Shift (CLS)
    this.observeCLS();
  }

  observeLCP() {
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          
          this.recordMetric('lcp', {
            value: lastEntry.startTime,
            rating: this.getLCPRating(lastEntry.startTime)
          });
        });
        
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);
      } catch (e) {
        console.warn('LCP observer not supported');
      }
    }
  }

  observeFID() {
    if ('PerformanceObserver' in window) {
      try {
        const fidObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordMetric('fid', {
              value: entry.processingStart - entry.startTime,
              rating: this.getFIDRating(entry.processingStart - entry.startTime)
            });
          }
        });
        
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.push(fidObserver);
      } catch (e) {
        console.warn('FID observer not supported');
      }
    }
  }

  observeCLS() {
    if ('PerformanceObserver' in window) {
      try {
        let clsValue = 0;
        let sessionValue = 0;
        let sessionEntries = [];

        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              sessionValue += entry.value;
              sessionEntries.push(entry);
              
              if (sessionValue > clsValue) {
                clsValue = sessionValue;
              }
            }
          }
          
          this.recordMetric('cls', {
            value: clsValue,
            rating: this.getCLSRating(clsValue)
          });
        });
        
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(clsObserver);
      } catch (e) {
        console.warn('CLS observer not supported');
      }
    }
  }

  trackCustomMetrics() {
    // React render time
    this.trackReactPerformance();
    
    // Memory usage
    this.trackMemoryUsage();
    
    // Network conditions
    this.trackNetworkConditions();
  }

  trackReactPerformance() {
    // Hook into React DevTools se disponível
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      const originalOnCommit = window.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot;
      
      window.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot = (id, root, ...args) => {
        const startTime = performance.now();
        
        if (originalOnCommit) {
          originalOnCommit(id, root, ...args);
        }
        
        const endTime = performance.now();
        this.recordMetric('react_render', {
          duration: endTime - startTime,
          timestamp: Date.now()
        });
      };
    }
  }

  trackMemoryUsage() {
    if ('memory' in performance) {
      const measureMemory = () => {
        const memory = performance.memory;
        this.recordMetric('memory', {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit,
          timestamp: Date.now()
        });
      };

      // Medir a cada 30 segundos
      setInterval(measureMemory, 30000);
      measureMemory(); // Medição inicial
    }
  }

  trackNetworkConditions() {
    if ('connection' in navigator) {
      const connection = navigator.connection;
      
      this.recordMetric('network', {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      });
      
      // Listener para mudanças na conexão
      connection.addEventListener('change', () => {
        this.recordMetric('network', {
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          saveData: connection.saveData,
          timestamp: Date.now()
        });
      });
    }
  }

  recordMetric(name, data) {
    const existing = this.metrics.get(name) || [];
    existing.push({ ...data, timestamp: Date.now() });
    
    // Manter apenas os últimos 100 registros por métrica
    if (existing.length > 100) {
      existing.shift();
    }
    
    this.metrics.set(name, existing);
    
    // Dispatch custom event para outras partes da app
    window.dispatchEvent(new CustomEvent('performance-metric', {
      detail: { name, data }
    }));
  }

  getLCPRating(value) {
    if (value <= 2500) return 'good';
    if (value <= 4000) return 'needs-improvement';
    return 'poor';
  }

  getFIDRating(value) {
    if (value <= 100) return 'good';
    if (value <= 300) return 'needs-improvement';
    return 'poor';
  }

  getCLSRating(value) {
    if (value <= 0.1) return 'good';
    if (value <= 0.25) return 'needs-improvement';
    return 'poor';
  }

  getMetrics() {
    return Object.fromEntries(this.metrics);
  }

  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics.clear();
    this.isInitialized = false;
  }
}

// Singleton instance
const performanceTracker = new PerformanceTracker();

/**
 * Hook para acessar métricas de performance
 */
export const usePerformanceMetrics = () => {
  const [metrics, setMetrics] = React.useState({});
  
  useEffect(() => {
    const updateMetrics = () => {
      setMetrics(performanceTracker.getMetrics());
    };
    
    const handleMetricUpdate = () => {
      updateMetrics();
    };
    
    window.addEventListener('performance-metric', handleMetricUpdate);
    updateMetrics(); // Initial load
    
    return () => {
      window.removeEventListener('performance-metric', handleMetricUpdate);
    };
  }, []);
  
  return metrics;
};

/**
 * Componente para monitoramento de performance de componentes específicos
 */
export const PerformanceMonitor = React.memo(({ 
  name, 
  children, 
  trackRender = true,
  trackMount = true 
}) => {
  const renderCount = useRef(0);
  const mountTime = useRef(null);
  
  useEffect(() => {
    if (trackMount) {
      mountTime.current = performance.now();
      
      return () => {
        if (mountTime.current) {
          const unmountTime = performance.now();
          performanceTracker.recordMetric(`component_lifecycle_${name}`, {
            mountDuration: unmountTime - mountTime.current,
            renderCount: renderCount.current
          });
        }
      };
    }
  }, [name, trackMount]);
  
  if (trackRender) {
    renderCount.current++;
    
    useEffect(() => {
      performanceTracker.recordMetric(`component_render_${name}`, {
        renderNumber: renderCount.current,
        timestamp: Date.now()
      });
    });
  }
  
  return children;
});

/**
 * HOC para monitoramento automático de performance
 */
export const withPerformanceMonitoring = (Component, name) => {
  const MonitoredComponent = React.memo((props) => (
    <PerformanceMonitor name={name || Component.displayName || Component.name}>
      <Component {...props} />
    </PerformanceMonitor>
  ));
  
  MonitoredComponent.displayName = `withPerformanceMonitoring(${name || Component.displayName || Component.name})`;
  return MonitoredComponent;
};

/**
 * Inicializar o tracker
 */
if (typeof window !== 'undefined') {
  // Aguardar DOMContentLoaded para iniciar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      performanceTracker.init();
    });
  } else {
    performanceTracker.init();
  }
}

export { performanceTracker };
export default PerformanceMonitor;