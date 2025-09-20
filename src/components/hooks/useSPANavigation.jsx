import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

/**
 * Hook para navegação SPA padronizada
 * Substitui todos os usos de window.location.href
 */
export function useSPANavigation() {
  const navigate = useNavigate();

  // Navegação básica
  const navigateTo = useCallback((page, params = {}, options = {}) => {
    // Se for URL completa externa
    if (page.startsWith('http') || page.startsWith('mailto:') || page.startsWith('tel:')) {
      window.location.href = page;
      return;
    }

    // Se for URL interna completa
    if (page.startsWith('/')) {
      const searchParams = Object.keys(params).length > 0 
        ? '?' + new URLSearchParams(params).toString()
        : '';
      navigate(page + searchParams, options);
      return;
    }

    // Se for nome de página, usar createPageUrl
    const url = createPageUrl(page);
    const searchParams = Object.keys(params).length > 0 
      ? '?' + new URLSearchParams(params).toString()
      : '';
    
    navigate(url + searchParams, options);
  }, [navigate]);

  // Navegações específicas para entidades principais
  const navigateToClient = useCallback((clientId, tab = null) => {
    const params = { clientId };
    if (tab) params.tab = tab;
    navigateTo('client-detail', params);
  }, [navigateTo]);

  const navigateToService = useCallback((serviceId, tab = null) => {
    const params = { serviceId };
    if (tab) params.tab = tab;
    navigateTo('service-detail', params);
  }, [navigateTo]);

  const navigateToTask = useCallback((taskId) => {
    navigateTo('tasks-manager', { taskId });
  }, [navigateTo]);

  const navigateToCycle = useCallback((cycleId) => {
    navigateTo('cycle-plan', { cycleId });
  }, [navigateTo]);

  // Navegações de ações
  const openNewClient = useCallback(() => {
    navigateTo('clients', { new: 'true' });
  }, [navigateTo]);

  const openNewService = useCallback((clientId = null) => {
    const params = clientId ? { clientId, new: 'true' } : { new: 'true' };
    navigateTo('services-overview', params);
  }, [navigateTo]);

  // Navegação com substituição (replace: true)
  const replaceTo = useCallback((page, params = {}) => {
    navigateTo(page, params, { replace: true });
  }, [navigateTo]);

  // Voltar na história
  const goBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  // Navegação externa segura
  const openExternal = useCallback((url) => {
    if (url.startsWith('http')) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = url;
    }
  }, []);

  return {
    navigateTo,
    navigateToClient,
    navigateToService, 
    navigateToTask,
    navigateToCycle,
    openNewClient,
    openNewService,
    replaceTo,
    goBack,
    openExternal
  };
}