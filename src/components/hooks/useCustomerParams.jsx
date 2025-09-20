/**
 * Hook personalizado para extrair parâmetros de URL relacionados a clientes
 * Substitui useParams() para evitar problemas com roteamento dinâmico
 */
import { useState, useEffect } from 'react';

export function useCustomerParams() {
  const [params, setParams] = useState({});

  useEffect(() => {
    let cancelled = false;

    const updateParams = () => {
      if (cancelled) return;
      
      const urlParams = new URLSearchParams(window.location.search);
      const pathname = window.location.pathname;
      
      setParams({
        customerId: urlParams.get('id') || urlParams.get('customerId'),
        serviceId: urlParams.get('serviceId'),
        cycleId: urlParams.get('cycleId'),
        pathname,
        search: window.location.search
      });
    };

    // Atualizar na montagem
    updateParams();

    // Escutar mudanças na URL
    const handlePopstate = () => updateParams();
    const handleUrlChange = () => updateParams();
    
    window.addEventListener('popstate', handlePopstate);
    
    // Interceptar mudanças programáticas
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      setTimeout(updateParams, 0);
    };
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      setTimeout(updateParams, 0);
    };

    return () => {
      cancelled = true;
      window.removeEventListener('popstate', handlePopstate);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, []);

  return params;
}