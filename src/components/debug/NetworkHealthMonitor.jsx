import React, { useEffect, useState } from 'react';

/**
 * Monitor de saúde de rede para detectar padrões problemáticos
 */
export default function NetworkHealthMonitor() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionType, setConnectionType] = useState('unknown');

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Optional: report online status
    };

    const handleOffline = () => {
      setIsOnline(false);
      // Optional: report offline status
    };

    // Detectar tipo de conexão
    if ('connection' in navigator) {
      const connection = navigator.connection;
      setConnectionType(connection.effectiveType || 'unknown');
      
      const handleConnectionChange = () => {
        const newType = connection.effectiveType;
        if (newType !== connectionType) {
          setConnectionType(newType);
        }
      };

      connection.addEventListener('change', handleConnectionChange);
      
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        connection.removeEventListener('change', handleConnectionChange);
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    } else {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, [connectionType]);

  // Componente não renderiza nada, apenas monitora
  return null;
}

/**
 * Hook para monitorar requisições específicas
 */
export function useRequestHealthMonitor(requestName) {
  const reportRequestStart = () => {
    return Date.now(); // Retorna timestamp de início
  };

  const reportRequestEnd = (startTime, success = true, error = null) => {
    const duration = Date.now() - startTime;
    
    if (!success && error) {
      console.warn(`Request ${requestName} failed:`, error.message, `Duration: ${duration}ms`);
    } else if (duration > 5000) {
      console.warn(`Request ${requestName} took ${duration}ms`);
    }
  };

  return { reportRequestStart, reportRequestEnd };
}