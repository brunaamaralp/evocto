import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Building,
  FileText,
  BarChart3,
  CheckSquare,
  Settings,
  BookOpen,
  FolderOpen,
  Target,
  Lightbulb,
  Wallet,
  Megaphone,
  TrendingUp,
  Sparkles,
  CalendarDays,
} from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Client } from '@/api/entities';
import { Service } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';
import { CLIENT_CONTEXT } from '@/lib/clientContextTheme';
import { buildClientCampaignHref } from '@/lib/campaignHref';
import { buildClientTasksHref } from '@/lib/taskScope';
import { buildAnnualPlanHref } from '@/lib/planoAnualHub';
import AnnualPlanSidebarBlock from '@/components/layout/AnnualPlanSidebarBlock';

/**
 * Navegação de contexto do cliente (nav única do hub).
 * Hierarquia: Operação (campanha) → Cliente → Backstage.
 */
export default function ClientContextSidebar({
  clientId,
  client: clientProp,
  serviceCount,
}) {
  const { agencyId } = useSession();
  const location = useLocation();
  const [client, setClient] = useState(clientProp || null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(!clientProp);

  const urlParams = new URLSearchParams(location.search);
  const briefingId =
    urlParams.get('briefingId') ||
    urlParams.get('campanhaId') ||
    urlParams.get('campaignId') ||
    null;
  const currentPage =
    location.pathname.split('/').pop() || location.pathname.substring(1);
  const hash = location.hash || '';

  const loadClientData = useCallback(async () => {
    if (!clientId || !agencyId) return;
    if (clientProp && typeof serviceCount === 'number') {
      setClient(clientProp);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [clientData, servicesData] = await Promise.all([
        clientProp ? Promise.resolve(clientProp) : Client.get(clientId),
        Service.filter({
          agencyId,
          clientId,
          is_template: false,
        }),
      ]);
      setClient(clientData);
      setServices(servicesData || []);
    } catch (error) {
      console.error('Erro ao carregar dados do cliente:', error);
    } finally {
      setLoading(false);
    }
  }, [clientId, agencyId, clientProp, serviceCount]);

  useEffect(() => {
    loadClientData();
  }, [loadClientData]);

  useEffect(() => {
    if (clientProp) setClient(clientProp);
  }, [clientProp]);

  const resolvedServiceCount =
    typeof serviceCount === 'number' ? serviceCount : services.length;

  const inCampaign =
    Boolean(briefingId) &&
    (currentPage === 'client-campaign' ||
      currentPage === 'client-tasks' ||
      currentPage === 'client-briefing' ||
      currentPage === 'briefing-campanha' ||
      currentPage === 'briefing-editor');

  const menuItems = [
    { type: 'section', label: 'Operação' },
    {
      type: 'link',
      label: 'Visão Geral',
      icon: BarChart3,
      href: createPageUrl(`client-detail?clientId=${clientId}`),
      active:
        location.pathname.includes('client-detail') && hash !== '#campanhas',
    },
    {
      type: 'link',
      label: 'Campanhas',
      icon: Megaphone,
      href: createPageUrl(`client-detail?clientId=${clientId}#campanhas`),
      active:
        hash === '#campanhas' ||
        location.pathname.includes('briefing-campanha') ||
        location.pathname.includes('client-campaign') ||
        (location.pathname.includes('client-tasks') && Boolean(briefingId)) ||
        (location.pathname.includes('client-briefing') && Boolean(briefingId)),
    },
  ];

  if (inCampaign && briefingId) {
    menuItems.push(
      {
        type: 'link',
        label: 'Visão da campanha',
        icon: Megaphone,
        href: createPageUrl(buildClientCampaignHref({ clientId, briefingId })),
        nested: true,
        active: location.pathname.includes('client-campaign'),
      },
      {
        type: 'link',
        label: 'Tarefas',
        icon: CheckSquare,
        href: createPageUrl(buildClientTasksHref({ clientId, briefingId })),
        nested: true,
        active: location.pathname.includes('client-tasks'),
      },
      {
        type: 'link',
        label: 'Ficha',
        icon: FileText,
        href: createPageUrl(buildClientCampaignHref({ clientId, briefingId })) + '#ficha',
        nested: true,
        active: location.pathname.includes('client-campaign'),
      }
    );
  }

  menuItems.push(
    { type: 'section', label: 'Cliente' },
    {
      type: 'link',
      label: 'Campanhas & plano',
      icon: FileText,
      href: createPageUrl(`client-briefing?clientId=${clientId}`),
      active:
        location.pathname.includes('client-briefing') && !briefingId,
    },
    {
      type: 'link',
      label: 'Brainstorm',
      icon: Sparkles,
      href: createPageUrl(`client-brainstorm?clientId=${clientId}`),
      active:
        location.pathname.includes('client-brainstorm') ||
        location.pathname.includes('/brainstorm'),
    },
    {
      type: 'link',
      label: 'Plano anual',
      icon: CalendarDays,
      href: buildAnnualPlanHref(clientId),
      active: location.pathname.includes('briefing-campanha-anual'),
    },
    {
      type: 'custom',
      id: 'annual-plan-months',
      render: () => (
        <AnnualPlanSidebarBlock clientId={clientId} agencyId={agencyId} />
      ),
    },
    {
      type: 'link',
      label: 'Documentos',
      icon: FolderOpen,
      href: createPageUrl(`client-documents?clientId=${clientId}`),
      active: location.pathname.includes('client-documents'),
    },
    {
      type: 'link',
      label: 'Financeiro',
      icon: Wallet,
      href: createPageUrl(`client-financeiro?clientId=${clientId}`),
      active: location.pathname.includes('client-financeiro'),
    },
    {
      type: 'link',
      label: 'Aprendizados',
      icon: Lightbulb,
      href: createPageUrl(`client-learnings?clientId=${clientId}`),
      active: location.pathname.includes('client-learnings'),
    },
    {
      type: 'link',
      label: 'Evolução',
      icon: BookOpen,
      href: createPageUrl(`client-evolution?clientId=${clientId}`),
      active: location.pathname.includes('client-evolution'),
    },
    {
      type: 'link',
      label: 'Relatórios',
      icon: TrendingUp,
      href: createPageUrl(`custom-reports?clientId=${clientId}`),
      active: location.pathname.includes('custom-reports'),
    },
    { type: 'section', label: 'Backstage' },
    {
      type: 'link',
      label: 'Serviços',
      icon: Target,
      href: createPageUrl(`client-services?clientId=${clientId}`),
      active: location.pathname.includes('client-services'),
    },
    {
      type: 'link',
      label: 'Configurações',
      icon: Settings,
      href: createPageUrl(`client-settings?clientId=${clientId}`),
      active: location.pathname.includes('client-settings'),
    }
  );

  return (
    <div
      className={`w-64 ${CLIENT_CONTEXT.sidebarBg} border-r ${CLIENT_CONTEXT.sidebarBorder} flex flex-col h-screen sticky top-0 shrink-0`}
    >
      <div className={`p-4 border-b ${CLIENT_CONTEXT.sidebarBorder}`}>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className={`w-full justify-start mb-3 ${CLIENT_CONTEXT.sidebarMuted} ${CLIENT_CONTEXT.sidebarHover}`}
        >
          <Link to={createPageUrl('clients')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Clientes
          </Link>
        </Button>

        {loading ? (
          <div className="animate-pulse">
            <div className="h-4 bg-teal-800 rounded w-3/4 mb-2" />
            <div className="h-3 bg-teal-800 rounded w-1/2" />
          </div>
        ) : client ? (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building className={`w-4 h-4 ${CLIENT_CONTEXT.sidebarMuted}`} />
              <h2 className={`font-semibold truncate ${CLIENT_CONTEXT.sidebarText}`}>
                {client.name}
              </h2>
            </div>
            {client.sector && (
              <p className={`text-xs truncate ${CLIENT_CONTEXT.sidebarMuted}`}>
                {client.sector}
              </p>
            )}
            <Badge
              variant="outline"
              className="mt-2 text-xs border-teal-500 text-teal-100 bg-teal-900/50"
            >
              {client.status === 'ativo'
                ? 'Cliente Ativo'
                : client.status === 'prospecto'
                  ? 'Prospecto'
                  : client.status || 'Status'}
            </Badge>
          </div>
        ) : (
          <div className="text-sm text-red-300">Cliente não encontrado</div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {menuItems.map((item, index) => {
            if (item.type === 'section') {
              return (
                <div
                  key={`section-${item.label}-${index}`}
                  className={`px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider ${CLIENT_CONTEXT.sidebarMuted}`}
                >
                  {item.label}
                </div>
              );
            }

            if (item.type === 'custom') {
              return (
                <div key={item.id || `custom-${index}`}>
                  {typeof item.render === 'function' ? item.render() : null}
                </div>
              );
            }

            const Icon = item.icon;
            return (
              <Link
                key={`${item.href}-${index}`}
                to={item.href}
                className={`
                  flex items-center justify-between rounded-lg text-sm font-medium transition-colors
                  ${item.nested ? 'pl-8 pr-3 py-1.5' : 'px-3 py-2'}
                  ${
                    item.active
                      ? CLIENT_CONTEXT.sidebarActive
                      : `${CLIENT_CONTEXT.sidebarMuted} ${CLIENT_CONTEXT.sidebarHover}`
                  }
                `}
              >
                <div className="flex items-center">
                  <Icon className={`mr-3 ${item.nested ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
                  <span className={item.nested ? 'text-xs font-normal' : ''}>
                    {item.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>

      {client && !loading && (
        <div className={`p-4 border-t ${CLIENT_CONTEXT.sidebarFooter}`}>
          <div className={`text-xs space-y-1 ${CLIENT_CONTEXT.sidebarMuted}`}>
            {resolvedServiceCount > 0 && (
              <div>
                {resolvedServiceCount} serviço
                {resolvedServiceCount !== 1 ? 's' : ''} · backstage
              </div>
            )}
            {client.email && <div className="truncate">{client.email}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
