import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { healthMonitor } from './HealthAuditor';
import { RenderHealthCheck, useLoadingHealthCheck } from './ComponentHealthWrapper';

/**
 * Componente para monitorar saúde de páginas específicas
 */
export default function PageHealthChecker({ children, pageName }) {
  const location = useLocation();
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [pageErrors, setPageErrors] = useState([]);

  // Monitorar loading da página
  useLoadingHealthCheck(isPageLoading, `page_${pageName}`, 15000);

  useEffect(() => {
    // Marcar página como carregada após timeout
    const timer = setTimeout(() => {
      setIsPageLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  useEffect(() => {
    // Reset ao mudar de página
    setIsPageLoading(true);
    setPageErrors([]);
    
    // Reportar navegação da página
    healthMonitor.reportIssue({
      type: 'page_navigation',
      message: `Navigated to ${pageName}`,
      page: pageName,
      path: location.pathname,
      severity: 'info'
    });
  }, [location.pathname, pageName]);

  return (
    <RenderHealthCheck identifier={`page_${pageName}`}>
      {children}
    </RenderHealthCheck>
  );
}

/**
 * Hook para páginas reportarem seus próprios problemas
 */
export function usePageHealth(pageName) {
  const reportPageError = (error, context = {}) => {
    healthMonitor.reportError({
      type: 'page_error',
      message: error.message || 'Page error',
      page: pageName,
      stack: error.stack,
      context,
      severity: 'high'
    });
  };

  const reportPageWarning = (message, context = {}) => {
    healthMonitor.reportIssue({
      type: 'page_warning',
      message,
      page: pageName,
      context,
      severity: 'medium'
    });
  };

  const reportPageInfo = (message, context = {}) => {
    healthMonitor.reportIssue({
      type: 'page_info',
      message,
      page: pageName,
      context,
      severity: 'low'
    });
  };

  return {
    reportPageError,
    reportPageWarning,
    reportPageInfo
  };
}