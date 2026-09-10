import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import ContextualSidebar from './ContextualSidebar';
import ModernHeader from './ModernHeader';
import ClientContextBanner from './ClientContextBanner';
import { Brief, Client } from '@/api/entities';
import { CLIENT_CONTEXT } from '@/lib/clientContextTheme';

/**
 * Layout contextual que adapta a navegação baseado na página atual.
 * Soft UI: canvas tintado + painel principal arredondado.
 */
export default function ContextualLayout({ user, children }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [contextClient, setContextClient] = useState(null);
  const [contextCampaign, setContextCampaign] = useState(null);

  const urlParams = new URLSearchParams(location.search);
  const clientId = urlParams.get('clientId');
  const serviceId = urlParams.get('serviceId');
  const briefingId =
    urlParams.get('briefingId') ||
    urlParams.get('campanhaId') ||
    urlParams.get('campaignId') ||
    null;

  const getCurrentContext = () => {
    const pathname = location.pathname;

    if (clientId) {
      return {
        type: 'client',
        clientId,
        serviceId: serviceId || null,
        briefingId,
      };
    }

    if (serviceId) {
      return {
        type: 'service',
        serviceId,
        clientId: null,
        briefingId: null,
      };
    }

    const clientContextPages = [
      'briefing-editor',
      'client-briefing',
      'client-campaign',
      'client-services',
      'client-tasks',
      'client-documents',
      'client-financeiro',
      'client-detail',
      'client-learnings',
      'client-evolution',
      'client-settings',
      'insights-editor',
      'scope-editor',
      'briefing-campanha',
    ];

    const currentPage = pathname.split('/').pop() || pathname.substring(1);

    if (clientContextPages.includes(currentPage) && clientId) {
      return {
        type: 'client',
        clientId,
        serviceId: serviceId || null,
        briefingId,
      };
    }

    return {
      type: 'global',
      clientId: null,
      serviceId: null,
      briefingId: null,
    };
  };

  const context = getCurrentContext();
  const currentPage = location.pathname.split('/').pop() || location.pathname.substring(1);
  const isClientShell = context.type === 'client' && Boolean(context.clientId);
  const hasCampaignContext = Boolean(context.briefingId);

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

  useEffect(() => {
    let cancelled = false;
    if (!hasCampaignContext || !context.briefingId) {
      setContextCampaign(null);
      return undefined;
    }
    Brief.get(context.briefingId)
      .then((data) => {
        if (!cancelled) {
          setContextCampaign({
            id: data?.id,
            name: data?.nome_campanha || data?.title || 'Campanha',
          });
        }
      })
      .catch(() => {
        if (!cancelled) setContextCampaign(null);
      });
    return () => {
      cancelled = true;
    };
  }, [hasCampaignContext, context.briefingId]);

  return (
    <div className={`evocto-shell ${isClientShell ? CLIENT_CONTEXT.shellBg : ''}`}>
      <ContextualSidebar
        user={user}
        currentPage={currentPage}
        clientId={context.clientId}
        serviceId={context.serviceId}
        briefingId={context.briefingId}
        context={context}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <motion.div
        className="evocto-main-panel"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      >
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
          contextCampaign={contextCampaign}
        />

        <main
          className={`flex-1 overflow-auto p-4 sm:p-6 lg:p-8 pb-28 ${
            isClientShell ? CLIENT_CONTEXT.contentAccent : ''
          }`}
        >
          {children}
        </main>
      </motion.div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-[2px]"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}
    </div>
  );
}
