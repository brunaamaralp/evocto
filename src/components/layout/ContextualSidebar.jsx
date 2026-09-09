import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { Client } from '@/api/entities';
import { CLIENT_CONTEXT } from '@/lib/clientContextTheme';

/**
 * Sidebar do layout: global (azul/branco) vs cliente (teal escuro).
 */
export default function ContextualSidebar({ 
  currentPage, 
  clientId, 
  serviceId, 
  isOpen,
  onClose 
}) {
  useTranslation();
  const [client, setClient] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const isClientMode = Boolean(clientId && !serviceId);

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
          isBack: true
        },
        {
          label: 'Visão Geral',
          icon: LayoutDashboard,
          href: `/client-detail?clientId=${clientId}`,
          isActive: currentPage === 'client' || currentPage === 'client-detail'
        },
        {
          label: 'Serviços & Ciclos',
          icon: Target,
          href: `/client-services?clientId=${clientId}`,
          isActive: currentPage === 'client-services'
        },
        {
          label: 'Briefing',
          icon: FileText,
          href: `/client-briefing?clientId=${clientId}`,
          isActive: currentPage === 'client-briefing' || currentPage === 'briefing-editor'
        },
        {
          label: 'Tarefas',
          icon: CheckSquare,
          href: `/client-tasks?clientId=${clientId}`,
          isActive: currentPage === 'client-tasks'
        },
        {
          label: 'Documentos',
          icon: FolderOpen,
          href: `/client-documents?clientId=${clientId}`,
          isActive: currentPage === 'client-documents'
        },
        {
          label: 'Aprendizados',
          icon: Lightbulb,
          href: `/client-learnings?clientId=${clientId}`,
          isActive: currentPage === 'client-learnings'
        },
        {
          label: 'Evolução',
          icon: BookOpen,
          href: `/client-evolution?clientId=${clientId}`,
          isActive: currentPage === 'client-evolution'
        },
        {
          label: 'Relatórios',
          icon: TrendingUp,
          href: `/custom-reports?clientId=${clientId}`,
          isActive: currentPage === 'custom-reports'
        }
      ];
    }

    if (serviceId) {
      return [
        {
          label: 'Voltar para Cliente',
          icon: ArrowLeft,
          href: clientId ? `/client-detail?clientId=${clientId}` : '/clients',
          isBack: true
        },
        {
          label: 'Visão Geral',
          icon: LayoutDashboard,
          href: `/service-detail?serviceId=${serviceId}`,
          isActive: currentPage === 'service-detail'
        },
        {
          label: 'Deliverables',
          icon: Package,
          href: `/service-deliverables?serviceId=${serviceId}`,
          isActive: currentPage === 'service-deliverables'
        },
        {
          label: 'Tarefas',
          icon: CheckSquare,
          href: `/client-tasks?serviceId=${serviceId}`,
          isActive: currentPage === 'client-tasks'
        },
        {
          label: 'Documentos',
          icon: FolderOpen,
          href: `/client-documents?serviceId=${serviceId}`,
          isActive: currentPage === 'client-documents'
        }
      ];
    }

    return [
      {
        label: 'Dashboard',
        icon: LayoutDashboard,
        href: '/dashboard',
        isActive: currentPage === 'dashboard'
      },
      {
        label: 'Clientes',
        icon: Users,
        href: '/clients',
        isActive: currentPage === 'clients'
      },
      {
        label: 'Templates de Serviço',
        icon: Briefcase,
        href: '/services',
        isActive: currentPage === 'services'
      },
      {
        label: 'Tarefas',
        icon: CheckSquare,
        href: '/tasks-manager',
        isActive: currentPage === 'tasks-manager'
      },
      {
        label: 'Biblioteca',
        icon: BookOpen,
        href: '/library',
        isActive: currentPage === 'library'
      },
      {
        label: 'Relatórios',
        icon: TrendingUp,
        href: '/custom-reports',
        isActive: currentPage === 'custom-reports'
      },
      {
        label: 'Financeiro',
        icon: Wallet,
        href: '/financeiro',
        isActive: currentPage === 'financeiro' || currentPage === 'caixa'
      }
    ];
  };

  const navigationItems = getNavigationItems();

  return (
    <div
      className={`border-r flex flex-col transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      } ${isOpen ? 'fixed inset-y-0 left-0 z-50 lg:relative' : 'hidden lg:flex'} ${
        isClientMode
          ? `${CLIENT_CONTEXT.sidebarBg} ${CLIENT_CONTEXT.sidebarBorder}`
          : 'bg-white border-gray-200'
      }`}
    >
      <div className={`p-4 border-b ${isClientMode ? CLIENT_CONTEXT.sidebarBorder : 'border-gray-200'}`}>
        {!collapsed && (
          <div className="flex items-center space-x-3">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isClientMode ? 'bg-teal-600' : 'bg-blue-600'
              }`}
            >
              <span className="text-white font-bold text-sm">
                {isClientMode ? 'C' : 'E'}
              </span>
            </div>
            <div className="min-w-0">
              {isClientMode && (
                <p className={`text-[10px] uppercase tracking-wider font-semibold ${CLIENT_CONTEXT.sidebarMuted}`}>
                  {CLIENT_CONTEXT.label}
                </p>
              )}
              <h2 className={`font-semibold truncate ${isClientMode ? CLIENT_CONTEXT.sidebarText : 'text-gray-900'}`}>
                {client ? client.name : 'Evocto'}
              </h2>
              {client && (
                <p className={`text-xs truncate ${isClientMode ? CLIENT_CONTEXT.sidebarMuted : 'text-gray-500'}`}>
                  {client.sector || 'Cliente'}
                </p>
              )}
              {!isClientMode && !client && (
                <p className="text-xs text-gray-500">Sistema</p>
              )}
            </div>
          </div>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navigationItems.map((item, index) => {
          const ItemIcon = item.icon;
          const isBack = item.isBack;

          return (
            <Link
              key={index}
              to={item.href}
              onClick={onClose}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                item.isActive
                  ? (isClientMode
                      ? CLIENT_CONTEXT.sidebarActive
                      : 'bg-blue-50 text-blue-700 font-medium')
                  : isBack
                  ? (isClientMode
                      ? `${CLIENT_CONTEXT.sidebarMuted} ${CLIENT_CONTEXT.sidebarHover}`
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50')
                  : (isClientMode
                      ? `${CLIENT_CONTEXT.sidebarMuted} ${CLIENT_CONTEXT.sidebarHover}`
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50')
              }`}
            >
              <ItemIcon className={`w-5 h-5 ${collapsed ? 'mx-auto' : ''}`} />
              {!collapsed && (
                <span className={isBack ? 'text-xs' : ''}>{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className={`p-4 border-t ${isClientMode ? CLIENT_CONTEXT.sidebarBorder : 'border-gray-200'}`}>
        <Link
          to={isClientMode && clientId ? `/client-settings?clientId=${clientId}` : '/settings'}
          className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors ${
            isClientMode
              ? `${CLIENT_CONTEXT.sidebarMuted} ${CLIENT_CONTEXT.sidebarHover}`
              : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Settings className={`w-5 h-5 ${collapsed ? 'mx-auto' : ''}`} />
          {!collapsed && <span>Configurações</span>}
        </Link>
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className={`hidden lg:block p-2 m-2 rounded-lg transition-colors ${
          isClientMode ? CLIENT_CONTEXT.sidebarHover : 'hover:bg-gray-100'
        }`}
      >
        <ChevronLeft
          className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''} ${
            isClientMode ? CLIENT_CONTEXT.sidebarMuted : ''
          }`}
        />
      </button>
    </div>
  );
}
