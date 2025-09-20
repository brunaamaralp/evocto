import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard,
  Users,
  Building,
  Calendar,
  CheckSquare,
  BookOpen,
  BarChart3,
  Settings,
  Zap,
  FileText,
  Target,
  TrendingUp,
  Bell
} from 'lucide-react';
import { createPageUrl } from '@/utils';
import { useSession } from '@/components/auth/SessionManager';

export default function ModernSidebar({ user }) {
  const { isAdmin, isOwner } = useSession();
  const location = useLocation();

  // NÃO RENDERIZAR se estivermos em contexto de cliente
  const urlParams = new URLSearchParams(location.search);
  const clientId = urlParams.get('clientId') || urlParams.get('id');
  const isClientContext = Boolean(clientId) && (
    location.pathname.includes('client-detail') ||
    location.pathname.includes('client-') ||
    urlParams.has('clientId')
  );

  // Se estiver em contexto de cliente, não renderizar este sidebar
  if (isClientContext) {
    return null;
  }

  const menuItems = [
    {
      label: 'Dashboard',
      icon: LayoutDashboard,
      href: createPageUrl('dashboard'),
      active: location.pathname === '/dashboard' || location.pathname === '/'
    },
    {
      label: 'Clientes',
      icon: Users,
      href: createPageUrl('clients'),
      active: location.pathname.includes('/clients') && !isClientContext
    },
    {
      label: 'Serviços',
      icon: Target,
      href: createPageUrl('services'),
      active: location.pathname.includes('/services')
    },
    {
      label: 'Tarefas',
      icon: CheckSquare,
      href: createPageUrl('tasks'),
      active: location.pathname.includes('/tasks')
    },
    {
      label: 'Ciclos Ativos',
      icon: Calendar,
      href: createPageUrl('active-cycles'),
      active: location.pathname.includes('/active-cycles')
    },
    {
      label: 'Biblioteca',
      icon: BookOpen,
      href: createPageUrl('library'),
      active: location.pathname.includes('/library')
    },
    {
      label: 'Relatórios',
      icon: BarChart3,
      href: createPageUrl('custom-reports'),
      active: location.pathname.includes('/custom-reports')
    }
  ];

  const adminItems = [
    {
      label: 'Automação',
      icon: Zap,
      href: createPageUrl('automation-dashboard'),
      active: location.pathname.includes('/automation')
    },
    {
      label: 'Agentes IA',
      icon: TrendingUp,
      href: createPageUrl('agents-dashboard'),
      active: location.pathname.includes('/agents')
    },
    {
      label: 'Equipe',
      icon: Building,
      href: createPageUrl('team-management'),
      active: location.pathname.includes('/team')
    },
    {
      label: 'Configurações',
      icon: Settings,
      href: createPageUrl('settings'),
      active: location.pathname.includes('/settings')
    }
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen">
      {/* Logo/Header */}
      <div className="p-4 border-b border-gray-200">
        <Link to={createPageUrl('dashboard')} className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">E</span>
          </div>
          <span className="font-bold text-gray-900">Evocto</span>
        </Link>
      </div>

      {/* Menu principal */}
      <nav className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`
                  flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${item.active 
                    ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
              >
                <Icon className="w-4 h-4 mr-3" />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Separador e menu admin */}
        {(isAdmin || isOwner) && (
          <>
            <div className="my-4 border-t border-gray-200"></div>
            <div className="space-y-1">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Administração
              </div>
              {adminItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`
                      flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
                      ${item.active 
                        ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4 mr-3" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-600">
          {user?.full_name || 'Usuário'}<br/>
          <span className="text-gray-500">{user?.email}</span>
        </div>
      </div>
    </div>
  );
}