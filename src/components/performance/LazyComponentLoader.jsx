import React, { Suspense, lazy, memo } from 'react';
import LoadingState from '@/components/shared/LoadingState';
import ErrorBoundary from '@/components/shared/ErrorBoundary';

/**
 * Sistema de Lazy Loading otimizado para componentes
 * Reduz significativamente o bundle inicial
 */

// Cache de componentes lazy para evitar re-imports
const lazyCache = new Map();

/**
 * Função helper para criar lazy components com cache
 */
export const createLazyComponent = (importFn, displayName = 'LazyComponent') => {
  const cacheKey = importFn.toString();
  
  if (lazyCache.has(cacheKey)) {
    return lazyCache.get(cacheKey);
  }
  
  const LazyComponent = lazy(importFn);
  LazyComponent.displayName = displayName;
  
  lazyCache.set(cacheKey, LazyComponent);
  return LazyComponent;
};

/**
 * Wrapper otimizado para componentes lazy
 */
export const LazyWrapper = memo(({ 
  component: Component, 
  fallback = <LoadingState />,
  errorFallback = null,
  ...props 
}) => (
  <ErrorBoundary fallback={errorFallback}>
    <Suspense fallback={fallback}>
      <Component {...props} />
    </Suspense>
  </ErrorBoundary>
));

/**
 * HOC para transformar componentes em lazy
 */
export const withLazy = (importFn, options = {}) => {
  const { 
    fallback = <LoadingState />, 
    displayName = 'LazyComponent',
    errorBoundary = true 
  } = options;
  
  const LazyComponent = createLazyComponent(importFn, displayName);
  
  return memo((props) => {
    const content = (
      <Suspense fallback={fallback}>
        <LazyComponent {...props} />
      </Suspense>
    );
    
    if (errorBoundary) {
      return <ErrorBoundary>{content}</ErrorBoundary>;
    }
    
    return content;
  });
};

/**
 * Componentes lazy pré-configurados para páginas principais
 */
export const LazyComponents = {
  // Páginas principais
  DashboardPage: createLazyComponent(() => import('@/pages/dashboard'), 'DashboardPage'),
  ClientsPage: createLazyComponent(() => import('@/pages/clients'), 'ClientsPage'),
  ServicesPage: createLazyComponent(() => import('@/pages/services-overview'), 'ServicesPage'),
  TasksPage: createLazyComponent(() => import('@/pages/tasks-manager'), 'TasksPage'),
  LibraryPage: createLazyComponent(() => import('@/pages/library'), 'LibraryPage'),
  
  // Páginas de detalhe (carregamento sob demanda)
  ClientDetailPage: createLazyComponent(() => import('@/pages/client-detail'), 'ClientDetailPage'),
  ServiceDetailPage: createLazyComponent(() => import('@/pages/service-detail'), 'ServiceDetailPage'),
  
  // Modais pesados
  ServiceCreateModal: createLazyComponent(() => import('@/components/clients/ServiceCreateModal'), 'ServiceCreateModal'),
  BriefingEditor: createLazyComponent(() => import('@/pages/briefing-editor'), 'BriefingEditor'),
  
  // Componentes avançados
  TaskKanban: createLazyComponent(() => import('@/components/tasks/TaskKanban'), 'TaskKanban'),
  FinancialDashboard: createLazyComponent(() => import('@/components/client_portal/FinancialDashboard'), 'FinancialDashboard'),
  
  // Configurações e admin
  SettingsPage: createLazyComponent(() => import('@/pages/settings'), 'SettingsPage'),
  TeamManagementPage: createLazyComponent(() => import('@/pages/team-management'), 'TeamManagementPage'),
  SystemHealthPage: createLazyComponent(() => import('@/pages/system-health'), 'SystemHealthPage')
};

/**
 * Preloader para componentes críticos
 */
export const preloadCriticalComponents = () => {
  // Preload componentes mais usados após carregamento inicial
  const criticalComponents = [
    'DashboardPage',
    'ClientsPage',
    'ServicesPage'
  ];
  
  // Usar requestIdleCallback se disponível
  const schedulePreload = (callback) => {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(callback, { timeout: 5000 });
    } else {
      setTimeout(callback, 100);
    }
  };
  
  criticalComponents.forEach(componentName => {
    const component = LazyComponents[componentName];
    if (component) {
      schedulePreload(() => {
        // Triggar o lazy import sem renderizar
        component._payload._result.catch(() => {
          // Silenciar erros de preload
        });
      });
    }
  });
};

/**
 * Hook para controlar lazy loading baseado na visibilidade
 */
export const useLazyOnView = (ref, threshold = 0.1) => {
  const [shouldLoad, setShouldLoad] = React.useState(false);
  
  React.useEffect(() => {
    const element = ref.current;
    if (!element || shouldLoad) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    
    observer.observe(element);
    
    return () => observer.disconnect();
  }, [ref, threshold, shouldLoad]);
  
  return shouldLoad;
};