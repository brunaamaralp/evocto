
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft,
  Building,
  User,
  FileText,
  BarChart3,
  Calendar,
  CheckSquare,
  Settings,
  BookOpen,
  TrendingUp,
  FolderOpen,
  Users,
  Target
} from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Client } from '@/api/entities';
import { Service } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';

export default function ClientContextSidebar({ clientId }) {
  const { agencyId } = useSession();
  const location = useLocation();
  const [client, setClient] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadClientData = useCallback(async () => {
    if (!clientId || !agencyId) return;
    
    try {
      setLoading(true);
      
      const [clientData, servicesData] = await Promise.all([
        Client.get(clientId),
        Service.filter({ 
          agencyId, 
          clientId, 
          is_template: false 
        })
      ]);

      setClient(clientData);
      setServices(servicesData);
    } catch (error) {
      console.error('Erro ao carregar dados do cliente:', error);
    } finally {
      setLoading(false);
    }
  }, [clientId, agencyId]);

  useEffect(() => {
    loadClientData();
  }, [loadClientData]);

  const menuItems = [
    {
      label: 'Visão Geral',
      icon: BarChart3,
      href: createPageUrl(`client-detail?clientId=${clientId}`),
      active: location.pathname.includes('client-detail')
    },
    {
      label: 'Briefing Principal',
      icon: FileText,
      href: createPageUrl(`client-briefing?clientId=${clientId}`),
      active: location.pathname.includes('client-briefing')
    },
    {
      label: 'Serviços',
      icon: Target,
      href: createPageUrl(`client-services?clientId=${clientId}`),
      active: location.pathname.includes('client-services'),
      badge: services.length || null
    },
    {
      label: 'Tarefas',
      icon: CheckSquare,
      href: createPageUrl(`client-tasks?clientId=${clientId}`),
      active: location.pathname.includes('client-tasks')
    },
    {
      label: 'Ciclos & Planos',
      icon: Calendar,
      href: createPageUrl(`client-cycles?clientId=${clientId}`),
      active: location.pathname.includes('client-cycles')
    },
    {
      label: 'Documentos',
      icon: FolderOpen,
      href: createPageUrl(`client-documents?clientId=${clientId}`),
      active: location.pathname.includes('client-documents')
    },
    {
      label: 'Relatórios',
      icon: TrendingUp,
      href: createPageUrl(`client-reports?clientId=${clientId}`),
      active: location.pathname.includes('client-reports')
    },
    {
      label: 'Evolução',
      icon: BookOpen,
      href: createPageUrl(`client-evolution?clientId=${clientId}`),
      active: location.pathname.includes('client-evolution')
    },
    {
      label: 'Equipe',
      icon: Users,
      href: createPageUrl(`client-team?clientId=${clientId}`),
      active: location.pathname.includes('client-team')
    },
    {
      label: 'Configurações',
      icon: Settings,
      href: createPageUrl(`client-settings?clientId=${clientId}`),
      active: location.pathname.includes('client-settings')
    }
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen">
      {/* Header do contexto do cliente */}
      <div className="p-4 border-b border-gray-200">
        <Button 
          asChild 
          variant="ghost" 
          size="sm" 
          className="w-full justify-start mb-3"
        >
          <Link to={createPageUrl('clients')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Clientes
          </Link>
        </Button>
        
        {loading ? (
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        ) : client ? (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building className="w-4 h-4 text-gray-500" />
              <h2 className="font-semibold text-gray-900 truncate">{client.name}</h2>
            </div>
            {client.sector && (
              <p className="text-xs text-gray-500 truncate">{client.sector}</p>
            )}
            <Badge 
              variant="outline" 
              className="mt-2 text-xs"
            >
              {client.status === 'ativo' ? 'Cliente Ativo' : 
               client.status === 'prospecto' ? 'Prospecto' : 'Inativo'}
            </Badge>
          </div>
        ) : (
          <div className="text-sm text-red-600">
            Cliente não encontrado
          </div>
        )}
      </div>

      {/* Menu de navegação do cliente */}
      <nav className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`
                  flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${item.active 
                    ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
              >
                <div className="flex items-center">
                  <Icon className="w-4 h-4 mr-3" />
                  {item.label}
                </div>
                {item.badge && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {item.badge}
                  </Badge>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer com info rápida */}
      {client && !loading && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-600 space-y-1">
            {services.length > 0 && (
              <div>📊 {services.length} serviço{services.length !== 1 ? 's' : ''} ativo{services.length !== 1 ? 's' : ''}</div>
            )}
            {client.email && (
              <div className="truncate">📧 {client.email}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
