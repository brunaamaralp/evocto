import React, { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Client } from '@/api/entities';
import { Service } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';
import { CLIENT_CONTEXT } from '@/lib/clientContextTheme';

/**
 * Navegação de contexto do cliente (nav única do hub).
 * Visual teal — distinto do menu global azul/branco.
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

  const menuItems = [
    {
      label: 'Visão Geral',
      icon: BarChart3,
      href: createPageUrl(`client-detail?clientId=${clientId}`),
      active: location.pathname.includes('client-detail'),
    },
    {
      label: 'Briefing',
      icon: FileText,
      href: createPageUrl(`client-briefing?clientId=${clientId}`),
      active: location.pathname.includes('client-briefing'),
    },
    {
      label: 'Serviços & Ciclos',
      icon: Target,
      href: createPageUrl(`client-services?clientId=${clientId}`),
      active: location.pathname.includes('client-services'),
      badge: resolvedServiceCount || null,
    },
    {
      label: 'Tarefas',
      icon: CheckSquare,
      href: createPageUrl(`client-tasks?clientId=${clientId}`),
      active: location.pathname.includes('client-tasks'),
    },
    {
      label: 'Documentos',
      icon: FolderOpen,
      href: createPageUrl(`client-documents?clientId=${clientId}`),
      active: location.pathname.includes('client-documents'),
    },
    {
      label: 'Aprendizados',
      icon: Lightbulb,
      href: createPageUrl(`client-learnings?clientId=${clientId}`),
      active: location.pathname.includes('client-learnings'),
    },
    {
      label: 'Evolução',
      icon: BookOpen,
      href: createPageUrl(`client-evolution?clientId=${clientId}`),
      active: location.pathname.includes('client-evolution'),
    },
    {
      label: 'Configurações',
      icon: Settings,
      href: createPageUrl(`client-settings?clientId=${clientId}`),
      active: location.pathname.includes('client-settings'),
    },
  ];

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
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`
                  flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${
                    item.active
                      ? CLIENT_CONTEXT.sidebarActive
                      : `${CLIENT_CONTEXT.sidebarMuted} ${CLIENT_CONTEXT.sidebarHover}`
                  }
                `}
              >
                <div className="flex items-center">
                  <Icon className="w-4 h-4 mr-3" />
                  {item.label}
                </div>
                {item.badge ? (
                  <Badge className="ml-2 text-xs bg-teal-600 text-white hover:bg-teal-600">
                    {item.badge}
                  </Badge>
                ) : null}
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
                {resolvedServiceCount !== 1 ? 's' : ''}
              </div>
            )}
            {client.email && <div className="truncate">{client.email}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
