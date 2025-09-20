import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from '@/components/i18n/I18nProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Building,
  ChevronLeft,
  Home,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { Client } from '@/api/entities';
import { createPageUrl } from '@/utils';

/**
 * SIDEBAR LIMPO - Apenas conceitos necessários
 */
export default function ContextualSidebar({ 
  user, 
  currentPage, 
  clientId, 
  serviceId, 
  context,
  isOpen,
  onClose 
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  // Carregar dados do cliente se necessário
  useEffect(() => {
    if (clientId && !client) {
      Client.get(clientId).then(setClient).catch(console.error);
    }
  }, [clientId, client]);

  const getNavigationItems = () => {
    // 🎯 CONTEXTO CLIENTE: Navegação focada no cliente
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
          href: `/client?clientId=${clientId}`,
          isActive: currentPage === 'client'
        },
        {
          label: 'Serviços',
          icon: Briefcase,
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
          label: 'Relatórios',
          icon: TrendingUp,
          href: `/custom-reports?clientId=${clientId}`,
          isActive: currentPage === 'custom-reports'
        }
      ];
    }

    // 🎯 CONTEXTO SERVIÇO: Navegação focada no serviço
    if (serviceId) {
      return [
        {
          label: 'Voltar para Cliente',
          icon: ArrowLeft,
          href: clientId ? `/client?clientId=${clientId}` : '/clients',
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

    // 🎯 NAVEGAÇÃO GLOBAL: Conceitos principais apenas
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
      }
    ];
  };

  const navigationItems = getNavigationItems();

  return (
    <div className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${
      collapsed ? 'w-16' : 'w-64'
    } ${isOpen ? 'fixed inset-y-0 left-0 z-50 lg:relative' : 'hidden lg:flex'}`}>
      
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        {!collapsed && (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">E</span>
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">
                {client ? client.name : 'Evocto'}
              </h2>
              {client && (
                <p className="text-xs text-gray-500">
                  {client.sector || 'Cliente'}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
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
                  ? 'bg-blue-50 text-blue-700 font-medium' 
                  : isBack
                  ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
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

      {/* Settings */}
      <div className="p-4 border-t border-gray-200">
        <Link
          to="/settings"
          className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-colors"
        >
          <Settings className={`w-5 h-5 ${collapsed ? 'mx-auto' : ''}`} />
          {!collapsed && <span>Configurações</span>}
        </Link>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden lg:block p-2 m-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
      </button>
    </div>
  );
}