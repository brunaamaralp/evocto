import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from '@/components/i18n/I18nProvider';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  CheckSquare,
  BookOpen,
  Settings,
  FileText,
  FolderOpen,
  Package,
  ArrowLeft,
  ChevronLeft,
  TrendingUp,
  Wallet,
  Lightbulb,
  Target,
  Menu,
  Megaphone,
} from 'lucide-react';
import { Client } from '@/api/entities';
import { CLIENT_CONTEXT, GLOBAL_SHELL } from '@/lib/clientContextTheme';
import NaviBrandLockup from '@/components/NaviBrandLockup';
import { BRAND } from '@/lib/brandAssets';
import { createPageUrl } from '@/utils';
import { buildClientCampaignHref } from '@/lib/campaignHref';
import { buildClientTasksHref } from '@/lib/taskScope';

/**
 * Soft UI rail: dark brand (global) vs teal (cliente).
 * Hierarquia cliente: Operação (campanha) → Cliente → Backstage.
 */
export default function ContextualSidebar({
  currentPage,
  clientId,
  serviceId,
  briefingId = null,
  isOpen,
  onClose,
}) {
  useTranslation();
  const location = useLocation();
  const [client, setClient] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const isClientMode = Boolean(clientId && !serviceId);
  const theme = isClientMode ? CLIENT_CONTEXT : GLOBAL_SHELL;
  const hash = location.hash || '';

  useEffect(() => {
    if (!clientId) {
      setClient(null);
      return;
    }
    let cancelled = false;
    Client.get(clientId)
      .then((data) => {
        if (!cancelled) setClient(data);
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const getNavigationItems = () => {
    if (clientId && !serviceId) {
      const inCampaign =
        Boolean(briefingId) &&
        (currentPage === 'client-campaign' ||
          currentPage === 'client-tasks' ||
          currentPage === 'client-briefing' ||
          currentPage === 'briefing-campanha' ||
          currentPage === 'briefing-editor');

      const campaignHref = briefingId
        ? createPageUrl(buildClientCampaignHref({ clientId, briefingId }))
        : createPageUrl(`client-detail?clientId=${clientId}#campanhas`);

      const tasksHref = briefingId
        ? createPageUrl(
            buildClientTasksHref({ clientId, briefingId })
          )
        : createPageUrl(`client-tasks?clientId=${clientId}`);

      const briefingHref = briefingId
        ? createPageUrl(
            `client-briefing?clientId=${clientId}&briefingId=${briefingId}`
          )
        : createPageUrl(`client-briefing?clientId=${clientId}`);

      const items = [
        {
          type: 'link',
          label: 'Voltar para Clientes',
          icon: ArrowLeft,
          href: createPageUrl('clients'),
          isBack: true,
        },
        { type: 'section', label: 'Operação' },
        {
          type: 'link',
          label: 'Visão Geral',
          icon: LayoutDashboard,
          href: createPageUrl(`client-detail?clientId=${clientId}`),
          isActive:
            (currentPage === 'client' || currentPage === 'client-detail') &&
            hash !== '#campanhas',
        },
        {
          type: 'link',
          label: 'Campanhas',
          icon: Megaphone,
          href: createPageUrl(`client-detail?clientId=${clientId}#campanhas`),
          isActive:
            hash === '#campanhas' ||
            currentPage === 'client-campaign' ||
            currentPage === 'briefing-campanha' ||
            (currentPage === 'client-tasks' && Boolean(briefingId)) ||
            (currentPage === 'client-briefing' && Boolean(briefingId)),
        },
      ];

      if (inCampaign && briefingId) {
        items.push(
          {
            type: 'link',
            label: 'Visão da campanha',
            icon: Megaphone,
            href: campaignHref,
            nested: true,
            isActive: currentPage === 'client-campaign',
          },
          {
            type: 'link',
            label: 'Tarefas',
            icon: CheckSquare,
            href: tasksHref,
            nested: true,
            isActive: currentPage === 'client-tasks',
          },
          {
            type: 'link',
            label: 'Briefing',
            icon: FileText,
            href: briefingHref,
            nested: true,
            isActive:
              currentPage === 'client-briefing' ||
              currentPage === 'briefing-campanha' ||
              currentPage === 'briefing-editor',
          }
        );
      }

      items.push(
        { type: 'section', label: 'Cliente' },
        {
          type: 'link',
          label: 'Documentos',
          icon: FolderOpen,
          href: createPageUrl(`client-documents?clientId=${clientId}`),
          isActive: currentPage === 'client-documents',
        },
        {
          type: 'link',
          label: 'Financeiro',
          icon: Wallet,
          href: createPageUrl(`client-financeiro?clientId=${clientId}`),
          isActive: currentPage === 'client-financeiro',
        },
        {
          type: 'link',
          label: 'Aprendizados',
          icon: Lightbulb,
          href: createPageUrl(`client-learnings?clientId=${clientId}`),
          isActive: currentPage === 'client-learnings',
        },
        {
          type: 'link',
          label: 'Evolução',
          icon: BookOpen,
          href: createPageUrl(`client-evolution?clientId=${clientId}`),
          isActive: currentPage === 'client-evolution',
        },
        {
          type: 'link',
          label: 'Relatórios',
          icon: TrendingUp,
          href: createPageUrl(`custom-reports?clientId=${clientId}`),
          isActive: currentPage === 'custom-reports',
        },
        { type: 'section', label: 'Backstage' },
        {
          type: 'link',
          label: 'Serviços',
          icon: Target,
          href: createPageUrl(`client-services?clientId=${clientId}`),
          isActive: currentPage === 'client-services',
        }
      );

      return items;
    }

    if (serviceId) {
      return [
        {
          type: 'link',
          label: 'Voltar para Cliente',
          icon: ArrowLeft,
          href: clientId
            ? createPageUrl(`client-detail?clientId=${clientId}`)
            : createPageUrl('clients'),
          isBack: true,
        },
        {
          type: 'link',
          label: 'Visão Geral',
          icon: LayoutDashboard,
          href: createPageUrl(`service-detail?serviceId=${serviceId}`),
          isActive: currentPage === 'service-detail',
        },
        {
          type: 'link',
          label: 'Deliverables',
          icon: Package,
          href: createPageUrl(`service-deliverables?serviceId=${serviceId}`),
          isActive: currentPage === 'service-deliverables',
        },
        {
          type: 'link',
          label: 'Tarefas',
          icon: CheckSquare,
          href: createPageUrl(`client-tasks?serviceId=${serviceId}`),
          isActive: currentPage === 'client-tasks',
        },
        {
          type: 'link',
          label: 'Documentos',
          icon: FolderOpen,
          href: createPageUrl(`client-documents?serviceId=${serviceId}`),
          isActive: currentPage === 'client-documents',
        },
      ];
    }

    return [
      {
        type: 'link',
        label: 'Dashboard',
        icon: LayoutDashboard,
        href: createPageUrl('dashboard'),
        isActive: currentPage === 'dashboard',
      },
      {
        type: 'link',
        label: 'Clientes',
        icon: Users,
        href: createPageUrl('clients'),
        isActive: currentPage === 'clients',
      },
      {
        type: 'link',
        label: 'Tarefas',
        icon: CheckSquare,
        href: createPageUrl('tasks-manager'),
        isActive: currentPage === 'tasks-manager',
      },
      {
        type: 'link',
        label: 'Biblioteca',
        icon: BookOpen,
        href: createPageUrl('library'),
        isActive: currentPage === 'library',
      },
      {
        type: 'link',
        label: 'Relatórios',
        icon: TrendingUp,
        href: createPageUrl('custom-reports'),
        isActive: currentPage === 'custom-reports',
      },
      {
        type: 'link',
        label: 'Financeiro',
        icon: Wallet,
        href: createPageUrl('financeiro'),
        isActive: currentPage === 'financeiro',
      },
      {
        type: 'link',
        label: 'Templates',
        icon: Briefcase,
        href: createPageUrl('services'),
        isActive: currentPage === 'services',
      },
    ];
  };

  const navigationItems = getNavigationItems();
  const widthClass = collapsed ? 'w-[72px]' : 'w-[240px]';

  return (
    <aside
      className={`flex flex-col transition-all duration-300 m-3 mr-0 rounded-[20px] overflow-hidden ${widthClass} ${
        isOpen ? 'fixed inset-y-3 left-3 z-50 lg:relative lg:inset-auto' : 'hidden lg:flex'
      } ${theme.sidebarBg} border ${theme.sidebarBorder}`}
    >
      <div className={`p-4 border-b ${theme.sidebarBorder}`}>
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'space-x-3'}`}>
          {isClientMode ? (
            <>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-teal-600">
                <span className="text-white font-bold text-sm">
                  {client?.name?.[0] || 'C'}
                </span>
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <h2 className={`font-semibold truncate text-sm ${theme.sidebarText}`}>
                    {client?.name || 'Cliente'}
                  </h2>
                  <p className={`text-xs truncate ${theme.sidebarMuted}`}>
                    {client?.sector || 'Cliente'}
                  </p>
                </div>
              )}
            </>
          ) : (
            <Link
              to={createPageUrl('dashboard')}
              className={`flex items-center min-w-0 ${collapsed ? '' : 'w-full'}`}
              aria-label={BRAND.name}
              onClick={onClose}
            >
              {collapsed ? (
                <NaviBrandLockup variant="mark" height={32} />
              ) : (
                <NaviBrandLockup height={26} className="max-w-[168px]" />
              )}
            </Link>
          )}
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navigationItems.map((item, index) => {
          if (item.type === 'section') {
            if (collapsed) {
              return (
                <div
                  key={`section-${item.label}-${index}`}
                  className={`my-2 mx-2 border-t ${theme.sidebarBorder}`}
                  aria-hidden
                />
              );
            }
            return (
              <div
                key={`section-${item.label}-${index}`}
                className={`px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider ${theme.sidebarMuted}`}
              >
                {item.label}
              </div>
            );
          }

          const ItemIcon = item.icon;
          const isBack = item.isBack;
          const nested = Boolean(item.nested);

          return (
            <Link
              key={`${item.href}-${index}`}
              to={item.href}
              onClick={onClose}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 rounded-xl text-sm transition-colors duration-200 ${
                nested && !collapsed ? 'pl-8 pr-3 py-2' : 'px-3 py-2.5'
              } ${collapsed ? 'justify-center' : ''} ${
                item.isActive
                  ? theme.sidebarActive
                  : `${theme.sidebarMuted} ${theme.sidebarHover}`
              }`}
            >
              <ItemIcon
                className={`stroke-[1.5] shrink-0 ${
                  nested ? 'w-4 h-4' : 'w-[18px] h-[18px]'
                } ${
                  item.isActive && !isClientMode ? GLOBAL_SHELL.sidebarIconActive : ''
                }`}
              />
              {!collapsed && (
                <span className={isBack || nested ? 'text-xs' : 'font-medium'}>
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className={`p-3 border-t ${theme.sidebarBorder} space-y-1`}>
        <Link
          to={
            isClientMode && clientId
              ? createPageUrl(`client-settings?clientId=${clientId}`)
              : createPageUrl('settings')
          }
          title={collapsed ? 'Configurações' : undefined}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
            collapsed ? 'justify-center' : ''
          } ${theme.sidebarMuted} ${theme.sidebarHover}`}
        >
          <Settings className="w-[18px] h-[18px] stroke-[1.5]" />
          {!collapsed && <span className="font-medium">Configurações</span>}
        </Link>

        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className={`hidden lg:flex w-full items-center gap-3 px-3 py-2 rounded-xl transition-colors ${
            collapsed ? 'justify-center' : ''
          } ${theme.sidebarHover} ${theme.sidebarMuted}`}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          <ChevronLeft
            className={`w-4 h-4 stroke-[1.5] transition-transform ${collapsed ? 'rotate-180' : ''}`}
          />
          {!collapsed && <span className="text-xs">Recolher</span>}
        </button>

        <button
          type="button"
          className={`lg:hidden flex w-full items-center gap-3 px-3 py-2 rounded-xl ${theme.sidebarHover} ${theme.sidebarMuted}`}
          onClick={onClose}
        >
          <Menu className="w-4 h-4" />
          {!collapsed && <span className="text-xs">Fechar</span>}
        </button>
      </div>
    </aside>
  );
}
