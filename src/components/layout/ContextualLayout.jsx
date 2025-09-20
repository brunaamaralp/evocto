import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ContextualSidebar from './ContextualSidebar';
import ModernHeader from './ModernHeader';

/**
 * Layout contextual que adapta a navegação baseado na página atual
 * CORRIGIDO: Detecta contexto do cliente no briefing-editor
 */
export default function ContextualLayout({ user, children }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Extrair parâmetros da URL
  const urlParams = new URLSearchParams(location.search);
  const clientId = urlParams.get('clientId');
  const serviceId = urlParams.get('serviceId');
  
  // 🔧 CORREÇÃO: Detectar contexto baseado na página E parâmetros da URL
  const getCurrentContext = () => {
    const pathname = location.pathname;
    
    // Se temos clientId na URL, estamos no contexto do cliente
    if (clientId) {
      return {
        type: 'client',
        clientId,
        serviceId: serviceId || null
      };
    }
    
    // Se temos serviceId na URL, estamos no contexto do serviço
    if (serviceId) {
      return {
        type: 'service', 
        serviceId,
        clientId: null
      };
    }
    
    // Páginas que sempre são contextuais por natureza
    if (pathname.includes('/client') && clientId) {
      return {
        type: 'client',
        clientId,
        serviceId: serviceId || null
      };
    }
    
    if (pathname.includes('/service') && serviceId) {
      return {
        type: 'service',
        serviceId,
        clientId: clientId || null
      };
    }
    
    // 🔧 CORREÇÃO PRINCIPAL: Páginas que devem usar contexto do cliente
    const clientContextPages = [
      'briefing-editor',
      'client-briefing', 
      'client-services',
      'client-tasks',
      'client-documents',
      'insights-editor',
      'scope-editor'
    ];
    
    const currentPage = pathname.split('/').pop() || pathname.substring(1);
    
    if (clientContextPages.includes(currentPage) && clientId) {
      return {
        type: 'client',
        clientId,
        serviceId: serviceId || null
      };
    }
    
    // Contexto global por padrão
    return {
      type: 'global',
      clientId: null,
      serviceId: null
    };
  };

  const context = getCurrentContext();
  const currentPage = location.pathname.split('/').pop() || location.pathname.substring(1);

  // Debug log para verificar contexto
  console.log('🎯 ContextualLayout Debug:', {
    pathname: location.pathname,
    search: location.search,
    clientId,
    serviceId,
    currentPage,
    detectedContext: context
  });

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar Contextual */}
      <ContextualSidebar 
        user={user}
        currentPage={currentPage}
        clientId={context.clientId}
        serviceId={context.serviceId}
        context={context}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <ModernHeader 
          user={user}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          context={context}
        />
        
        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}