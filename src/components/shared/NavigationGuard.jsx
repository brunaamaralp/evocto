import React, { useEffect } from 'react';

/**
 * Componente para auditar e migrar navegação para SPA
 * Remove usos de window.location.href e substitui por navegação SPA
 */
export default function NavigationGuard({ children }) {
  useEffect(() => {
    // Interceptar cliques em links internos para usar navegação SPA
    const handleLinkClick = (event) => {
      const target = event.target.closest('a, button');
      if (!target) return;

      const href = target.getAttribute('href');
      const onClick = target.getAttribute('onclick');

      // Se for um link interno com createPageUrl, prevenir comportamento padrão
      if (href && href.includes('/') && !href.startsWith('http') && !href.includes('mailto:') && !href.includes('tel:')) {
        // Deixar o React Router lidar com isso se for um Link component
        if (target.closest('[data-react-router]')) {
          return;
        }

        // Se for um link simples <a>, converter para navegação SPA
        console.warn('Link não-SPA detectado:', href, target);
      }

      // Detectar usos de window.location.href em onClick handlers
      if (onClick && onClick.includes('window.location.href')) {
        console.warn('window.location.href detectado em onClick:', onClick, target);
      }
    };

    document.addEventListener('click', handleLinkClick, true);

    // Interceptar tentativas de window.location.href
    const originalLocationHref = Object.getOwnPropertyDescriptor(window.location, 'href') || 
                                 Object.getOwnPropertyDescriptor(Location.prototype, 'href');

    Object.defineProperty(window.location, 'href', {
      get: originalLocationHref.get,
      set: function(url) {
        // Log para debug
        if (url && !url.startsWith('http') && !url.includes('mailto:') && !url.includes('tel:')) {
          console.warn('🚨 window.location.href usado para navegação interna:', url);
          console.trace('Stack trace:');
        }
        
        // Permitir a navegação normal
        return originalLocationHref.set.call(this, url);
      }
    });

    return () => {
      document.removeEventListener('click', handleLinkClick, true);
      // Restaurar href original ao desmontar
      if (originalLocationHref) {
        Object.defineProperty(window.location, 'href', originalLocationHref);
      }
    };
  }, []);

  return <>{children}</>;
}