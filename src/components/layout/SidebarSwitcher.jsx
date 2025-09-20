import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { useAppContext } from '@/components/context/AppContextProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Users, Building, Briefcase, ChevronDown,
  ArrowLeft, Settings, FileText, Clock,
  Target, Mail, Phone, Calendar
} from 'lucide-react';
import AppLink from '@/components/navigation/AppLink';
import { useAppNavigate } from '@/components/navigation/useAppNavigate';
import StatusBadge from '@/components/shared/StatusBadge';

/**
 * Sidebar dinâmica que muda baseada no contexto atual
 * CORRIGIDO: Remove dependência desnecessária e usa contexto global
 */
export default function SidebarSwitcher() {
  const { user, agencyId } = useSession();
  const { 
    currentClient, 
    currentService, 
    isClientContext, 
    isServiceContext,
    loading 
  } = useAppContext();
  const { goBack } = useAppNavigate();

  const [isCollapsed, setIsCollapsed] = useState(false);

  // Se não há contexto específico, mostrar navegação geral
  if (!isClientContext && !isServiceContext) {
    return <GeneralSidebar isCollapsed={isCollapsed} onToggle={setIsCollapsed} />;
  }

  // Se há contexto de cliente, mostrar sidebar do cliente
  if (isClientContext) {
    return (
      <ClientSidebar 
        client={currentClient}
        service={currentService}
        loading={loading}
        isCollapsed={isCollapsed}
        onToggle={setIsCollapsed}
        onBack={goBack}
      />
    );
  }

  // Se há contexto de serviço (mas não de cliente), mostrar sidebar do serviço
  if (isServiceContext) {
    return (
      <ServiceSidebar 
        service={currentService}
        loading={loading}
        isCollapsed={isCollapsed}
        onToggle={setIsCollapsed}
        onBack={goBack}
      />
    );
  }

  return null;
}

// Sidebar geral (navegação principal)
function GeneralSidebar({ isCollapsed, onToggle }) {
  const menuItems = [
    { icon: Users, label: 'Clientes', path: 'clients' },
    { icon: Briefcase, label: 'Serviços', path: 'services-overview' },
    { icon: FileText, label: 'Tarefas', path: 'tasks-manager' },
    { icon: Building, label: 'Biblioteca', path: 'library' }
  ];

  return (
    <aside className={`bg-white border-r border-gray-200 transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    } flex-shrink-0`}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-6">
          {!isCollapsed && (
            <h2 className="font-semibold text-gray-900">Menu Principal</h2>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="h-8 w-8"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${
              isCollapsed ? 'rotate-90' : 'rotate-0'
            }`} />
          </Button>
        </div>

        <nav className="space-y-2">
          {menuItems.map((item) => (
            <AppLink
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors ${
                isCollapsed ? 'justify-center' : ''
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span>{item.label}</span>}
            </AppLink>
          ))}
        </nav>
      </div>
    </aside>
  );
}

// Sidebar específica do cliente
function ClientSidebar({ client, service, loading, isCollapsed, onToggle, onBack }) {
  if (loading || !client) {
    return (
      <aside className={`bg-white border-r border-gray-200 ${
        isCollapsed ? 'w-16' : 'w-64'
      } flex-shrink-0`}>
        <div className="p-4">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  const clientTabs = [
    { icon: Building, label: 'Visão Geral', path: `client-detail?clientId=${client.id}` },
    { icon: Briefcase, label: 'Serviços', path: `client-detail?clientId=${client.id}&tab=services` },
    { icon: FileText, label: 'Tarefas', path: `client-detail?clientId=${client.id}&tab=tasks` },
    { icon: Clock, label: 'Evolução', path: `client-detail?clientId=${client.id}&tab=evolution` },
    { icon: Settings, label: 'Configurações', path: `client-detail?clientId=${client.id}&tab=settings` }
  ];

  return (
    <aside className={`bg-white border-r border-gray-200 transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    } flex-shrink-0`}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          {!isCollapsed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="h-8 w-8"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${
              isCollapsed ? 'rotate-90' : 'rotate-0'
            }`} />
          </Button>
        </div>

        {/* Info do Cliente */}
        {!isCollapsed && (
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900 truncate">{client.name}</h3>
                <StatusBadge status={client.status} size="sm" />
              </div>
              
              <div className="space-y-1 text-sm text-gray-600">
                {client.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    <span className="truncate">{client.email}</span>
                  </div>
                )}
                
                {client.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    <span>{client.phone}</span>
                  </div>
                )}

                {client.sector && (
                  <div className="flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    <span className="truncate">{client.sector}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Serviço Ativo (se houver) */}
        {!isCollapsed && service && (
          <Card className="mb-4 border-blue-200 bg-blue-50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Briefcase className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Serviço Ativo</span>
              </div>
              <p className="text-sm text-blue-800 truncate">{service.name}</p>
              <AppLink 
                to={`service-detail?serviceId=${service.id}`}
                className="text-xs text-blue-600 hover:text-blue-700 mt-1 inline-block"
              >
                Ver detalhes →
              </AppLink>
            </CardContent>
          </Card>
        )}

        <Separator className="my-4" />

        {/* Navegação */}
        <nav className="space-y-1">
          {clientTabs.map((tab) => (
            <AppLink
              key={tab.path}
              to={tab.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors ${
                isCollapsed ? 'justify-center' : ''
              }`}
            >
              <tab.icon className="w-4 h-4 flex-shrink-0" />
              {!isCollapsed && <span className="text-sm">{tab.label}</span>}
            </AppLink>
          ))}
        </nav>
      </div>
    </aside>
  );
}

// Sidebar específica do serviço
function ServiceSidebar({ service, loading, isCollapsed, onToggle, onBack }) {
  if (loading || !service) {
    return (
      <aside className={`bg-white border-r border-gray-200 ${
        isCollapsed ? 'w-16' : 'w-64'
      } flex-shrink-0`}>
        <div className="p-4">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  const serviceTabs = [
    { icon: Building, label: 'Visão Geral', path: `service-detail?serviceId=${service.id}` },
    { icon: FileText, label: 'Entregáveis', path: `service-detail?serviceId=${service.id}&tab=deliverables` },
    { icon: Calendar, label: 'Cronograma', path: `service-detail?serviceId=${service.id}&tab=timeline` },
    { icon: Settings, label: 'Configurações', path: `service-detail?serviceId=${service.id}&tab=settings` }
  ];

  return (
    <aside className={`bg-white border-r border-gray-200 transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    } flex-shrink-0`}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          {!isCollapsed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="h-8 w-8"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${
              isCollapsed ? 'rotate-90' : 'rotate-0'
            }`} />
          </Button>
        </div>

        {/* Info do Serviço */}
        {!isCollapsed && (
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900 truncate">{service.name}</h3>
                <Badge variant={service.is_template ? 'secondary' : 'default'}>
                  {service.is_template ? 'Template' : 'Ativo'}
                </Badge>
              </div>
              
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  <span className="truncate">
                    {service.category?.replace('_', ' ') || 'Categoria não definida'}
                  </span>
                </div>
                
                {service.version && (
                  <div className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    <span>Versão {service.version}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Separator className="my-4" />

        {/* Navegação */}
        <nav className="space-y-1">
          {serviceTabs.map((tab) => (
            <AppLink
              key={tab.path}
              to={tab.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors ${
                isCollapsed ? 'justify-center' : ''
              }`}
            >
              <tab.icon className="w-4 h-4 flex-shrink-0" />
              {!isCollapsed && <span className="text-sm">{tab.label}</span>}
            </AppLink>
          ))}
        </nav>
      </div>
    </aside>
  );
}