import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

/**
 * Hook customizado para navegação programática
 * Padroniza navegação SPA em todo o sistema
 */
export function useAppNavigate() {
  const navigate = useNavigate();

  const navigateTo = (page, params = {}, options = {}) => {
    // Se for URL completa, usar diretamente
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
  };

  const navigateToClient = (clientId, tab = null) => {
    const params = { clientId };
    if (tab) params.tab = tab;
    navigateTo('client-detail', params);
  };

  const navigateToService = (serviceId, tab = null) => {
    const params = { serviceId };
    if (tab) params.tab = tab;
    navigateTo('service-detail', params);
  };

  const navigateToTask = (taskId) => {
    navigateTo('tasks-manager', { taskId });
  };

  const goBack = () => {
    navigate(-1);
  };

  const replace = (page, params = {}) => {
    navigateTo(page, params, { replace: true });
  };

  return {
    navigateTo,
    navigateToClient,
    navigateToService,
    navigateToTask,
    goBack,
    replace
  };
}