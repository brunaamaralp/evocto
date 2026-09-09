import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ContextualSidebar from './ContextualSidebar';
import ModernHeader from './ModernHeader';
import ClientContextBanner from './ClientContextBanner';
import { Client } from '@/api/entities';
import { CLIENT_CONTEXT } from '@/lib/clientContextTheme';

/**
 * Layout contextual que adapta a navegação baseado na página atual
 */
export default function ContextualLayout({ user, children }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [contextClient, setContextClient] = useState(null);

  const urlParams = new URLSearchParams(location.search);
  const clientId = urlParams.get('clientId');
  const serviceId = urlParams.get('serviceId');

  const getCurrentContext = () => {
    const pathname = location.pathname;

    if (clientId) {
      return {
        type: 'client',
        clientId,
        serviceId: serviceId || null,
      };
    }

    if (serviceId) {
      return {
        type: 'service',
        serviceId,
        clientId: null,
      };
    }

    if (pathname.includes('/client') && clientId) {
      return {
        type: 'client',
        clientId,
        serviceId: serviceId || null,
      };
    }

    if (pathname.includes('/service') && serviceId) {
      return {
        type: 'service',
        serviceId,
        clientId: clientId || null,
      };
    }

    const clientContextPages = [
      'briefing-editor',
      'client-briefing',
      'client-services',
      'client-tasks',
      'client-documents',
      'client-detail',
      'client-learnings',
      'client-evolution',
      'client-settings',
      'insights-editor',
      'scope-editor',
    ];

    const currentPage = pathname.split('/').pop() || pathname.substring(1);

    if (clientContextPages.includes(currentPage) && clientId) {
      return {
        type: 'client',
        clientId,
        serviceId: serviceId || null,
      };
    }

    return {
      type: 'global',
      clientId: null,
      serviceId: null,
    };
  };

  const context = getCurrentContext();
  const currentPage = location.pathname.split('/').pop() || location.pathname.substring(1);
  const isClientShell = context.type === 'client' && Boolean(context.clientId);

  useEffect(() => {
    let cancelled = false;
    if (!isClientShell) {
      setContextClient(null);
      return undefined;
    }
    Client.get(context.clientId)
      .then((data) => {
        if (!cancelled) setContextClient(data);
      })
      .catch(() => {
        if (!cancelled) setContextClient(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isClientShell, context.clientId]);

  return (
    <div
      className={`min-h-screen flex ${
        isClientShell ? CLIENT_CONTEXT.shellBg : 'bg-gray-50'
      }`}
    >
      <ContextualSidebar
        user={user}
        currentPage={currentPage}
        clientId={context.clientId}
        serviceId={context.serviceId}
        context={context}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {isClientShell && (
          <ClientContextBanner
            clientId={context.clientId}
            clientName={contextClient?.name}
          />
        )}

        <ModernHeader
          user={user}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          context={context}
          contextClient={contextClient}
        />

        <main
          className={`flex-1 overflow-auto ${
            isClientShell ? CLIENT_CONTEXT.contentAccent : ''
          }`}
        >
          {children}
        </main>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
