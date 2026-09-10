import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { createPageUrl } from '@/components/utils/index';
import { Link } from 'react-router-dom';

const Breadcrumbs = ({ items = [], currentPage = '', className = '' }) => {
  // Fallback seguro para casos onde items não está definido
  const safeItems = Array.isArray(items) ? items : [];
  
  // Função segura para navegação
  const safeCreatePageUrl = (page) => {
    try {
      if (typeof createPageUrl === 'function') {
        return createPageUrl(page);
      } else {
        console.warn('[Breadcrumbs] createPageUrl não é uma função, usando fallback');
        return `/${page}`;
      }
    } catch (error) {
      console.error('[Breadcrumbs] Erro ao criar URL:', error);
      return `/${page}`;
    }
  };

  return (
    <nav
      className={`flex items-center gap-2 text-sm overflow-x-auto whitespace-nowrap max-w-full pb-0.5 ${className}`}
      aria-label="Breadcrumb"
    >
      {/* Home sempre presente */}
      <Link 
        to={safeCreatePageUrl('dashboard')} 
        className="text-gray-500 hover:text-gray-700 flex items-center shrink-0"
        aria-label="Início"
      >
        <Home className="w-4 h-4" />
      </Link>

      {safeItems.length > 0 && (
        <>
          <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
          
          {safeItems.map((item, index) => {
            const isLast = index === safeItems.length - 1;
            const itemHref = item.href || (item.page ? safeCreatePageUrl(item.page) : '#');
            
            return (
              <React.Fragment key={index}>
                {!isLast ? (
                  <>
                    <Link 
                      to={itemHref}
                      className="text-gray-500 hover:text-gray-700 shrink-0 max-w-[40vw] truncate"
                    >
                      {item.label || item.title || 'Página'}
                    </Link>
                    <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                  </>
                ) : (
                  <span className="text-gray-900 font-medium truncate max-w-[50vw]">
                    {item.label || item.title || 'Página Atual'}
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </>
      )}
      
      {/* Página atual se não estiver nos items */}
      {currentPage && safeItems.length === 0 && (
        <>
          <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="text-gray-900 font-medium truncate max-w-[70vw]">{currentPage}</span>
        </>
      )}
    </nav>
  );
};

export default Breadcrumbs;