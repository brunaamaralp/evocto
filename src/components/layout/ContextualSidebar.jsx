import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
} from 'lucide-react';
import { Client } from '@/api/entities';
import { CLIENT_CONTEXT, GLOBAL_SHELL } from '@/lib/clientContextTheme';
import NaviBrandLockup from '@/components/NaviBrandLockup';
import { BRAND } from '@/lib/brandAssets';
import { createPageUrl } from '@/utils';

/**
 * Soft UI rail: dark brand (global) vs teal (cliente).
 */
export default function ContextualSidebar({
  currentPage,
  clientId,
  serviceId,
  isOpen,
  onClose,
}) {
  useTranslation();
  const [client, setClient] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const isClientMode = Boolean(clientId && !serviceId);
  const theme = isClientMode ? CLIENT_CONTEXT : GLOBAL_SHELL;

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
      return [
        {
          label: 'Voltar para Clientes',
          icon: ArrowLeft,
          href: '/clients',
          isBack: true,
        },
        {
          label: 'Visão Geral',
          icon: LayoutDashboard,
          href: `/client-detail?clientId=${clientId}`,
          isActive: currentPage === 'client' || currentPage === 'client-detail',
        },
        {
          label: 'Serviços & Ciclos',
          icon: Target,
          href: `/client-services?clientId=${clientId}`,
          isActive: currentPage === 'client-services',
        },
        {
          label: 'Briefing',
          icon: FileText,
          href: `/client-briefing?clientId=${clientId}`,
          isActive: currentPage === 'client-briefing' || currentPage === 'briefing-editor',
        },
        {
          label: 'Tarefas',
          icon: CheckSquare,
          href: `/client-tasks?clientId=${clientId}`,
          isActive: currentPage === 'client-tasks',
        },
        {
          label: 'Documentos',
          icon: FolderOpen,
          href: `/client-documents?clientId=${clientId}`,
          isActive: currentPage === 'client-documents',
        },
        {
          label: 'Financeiro',
          icon: Wallet,
          href: `/client-financeiro?clientId=${clientId}`,
          isActive: currentPage === 'client-financeiro',
        },
        {
          label: 'Aprendizados',
          icon: Lightbulb,
          href: `/client-learnings?clientId=${clientId}`,
          isActive: currentPage === 'client-learnings',
        },
        {
          label: 'Evolução',
          icon: BookOpen,
          href: `/client-evolution?clientId=${clientId}`,
          isActive: currentPage === 'client-evolution',
        },
        {
          label: 'Relatórios',
          icon: TrendingUp,
          href: `/custom-reports?clientId=${clientId}`,
          isActive: currentPage === 'custom-reports',
        },
      ];
    }

    if (serviceId) {
      return [
        {
          label: 'Voltar para Cliente',
          icon: ArrowLeft,
          href: clientId ? `/client-detail?clientId=${clientId}` : '/clients',
          isBack: true,
        },
        {
          label: 'Visão Geral',
          icon: LayoutDashboard,
          href: `/service-detail?serviceId=${serviceId}`,
          isActive: currentPage === 'service-detail',
        },
        {
          label: 'Deliverables',
          icon: Package,
          href: `/service-deliverables?serviceId=${serviceId}`,
          isActive: currentPage === 'service-deliverables',
        },
        {
          label: 'Tarefas',
          icon: CheckSquare,
          href: `/client-tasks?serviceId=${serviceId}`,
          isActive: currentPage === 'client-tasks',
        },
        {
          label: 'Documentos',
          icon: FolderOpen,
          href: `/client-documents?serviceId=${serviceId}`,
          isActive: currentPage === 'client-documents',
        },
      ];
    }

    return [
      {
        label: 'Dashboard',
        icon: LayoutDashboard,
        href: '/dashboard',
        isActive: currentPage === 'dashboard',
      },
      {
        label: 'Clientes',
        icon: Users,
        href: '/clients',
        isActive: currentPage === 'clients',
      },
      {
        label: 'Templates de Serviço',
        icon: Briefcase,
        href: '/services',
        isActive: currentPage === 'services',
      },
      {
        label: 'Tarefas',
        icon: CheckSquare,
        href: '/tasks-manager',
        isActive: currentPage === 'tasks-manager',
      },
      {
        label: 'Biblioteca',
        icon: BookOpen,
        href: '/library',
        isActive: currentPage === 'library',
      },
      {
        label: 'Relatórios',
        icon: TrendingUp,
        href: '/custom-reports',
        isActive: currentPage === 'custom-reports',
      },
      {
        label: 'Financeiro',
        icon: Wallet,
        href: '/financeiro',
        isActive: currentPage === 'financeiro',
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
          const ItemIcon = item.icon;
          const isBack = item.isBack;

          return (
            <Link
              key={index}
              to={item.href}
              onClick={onClose}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors duration-200 ${
                collapsed ? 'justify-center' : ''
              } ${
                item.isActive
                  ? theme.sidebarActive
                  : isBack
                    ? `${theme.sidebarMuted} ${theme.sidebarHover}`
                    : `${theme.sidebarMuted} ${theme.sidebarHover}`
              }`}
            >
              <ItemIcon
                className={`w-[18px] h-[18px] stroke-[1.5] shrink-0 ${
                  item.isActive && !isClientMode ? GLOBAL_SHELL.sidebarIconActive : ''
                }`}
              />
              {!collapsed && (
                <span className={isBack ? 'text-xs' : 'font-medium'}>{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className={`p-3 border-t ${theme.sidebarBorder} space-y-1`}>
        <Link
          to={isClientMode && clientId ? `/client-settings?clientId=${clientId}` : '/settings'}
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
