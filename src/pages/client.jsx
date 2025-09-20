
import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { useT } from '@/components/i18n/I18nProvider';
import { Service } from '@/api/entities';
import { CyclePlan } from '@/api/entities';
import { ApprovalRequest } from '@/api/entities';
import { Brief } from '@/api/entities'; // Added import for Brief
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  User, Building, Mail, Phone, Calendar, Activity, TrendingUp,
  FileText, BookOpen, MessageCircle, Settings, Eye, Star,
  BarChart3, Target, Lightbulb, Users, CheckCircle, Clock,
  AlertCircle, Zap, ArrowRight, Plus, Search, Filter,
  Menu, X, ChevronRight, Home, Briefcase, Award, ChevronLeft,
  Edit, UserPlus, MoreVertical, Sparkles, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import EmptyState from '@/components/shared/EmptyState';
import StatusBadge from '@/components/shared/StatusBadge';
import LoadingState from '@/components/shared/LoadingState';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import Breadcrumbs from '@/components/navigation/Breadcrumbs';
import ContextHeader from '@/components/navigation/ContextHeader';
import ClientEditModal from '@/components/client/ClientEditModal';
import ServiceCreateModal from '@/components/client/ServiceCreateModal';
import InviteClientModal from '@/components/client/InviteClientModal';
import ClientSetupGuide from '@/components/client/ClientSetupGuide';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';

export default function ClientPage() {
  const { user, isAuthenticated, agencyId } = useSession();
  const t = useT();

  const [clientId, setClientId] = useState(null);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [services, setServices] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [briefings, setBriefings] = useState([]); // New state for briefings

  // Estados dos modais
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('clientId');

    console.log('[Client] Extracting client ID from URL:', { id, currentUrl: window.location.href });

    if (id) {
      setClientId(id);
    } else {
      setError('ID do cliente não encontrado na URL. Verifique se o link está correto.');
      setLoading(false);
    }
  }, []);

  const reloadAllData = useCallback(async () => {
    if (!isAuthenticated || !user || !agencyId || !clientId) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { Client } = await import('@/api/entities');
      const { Brief } = await import('@/api/entities'); // Imported Brief here

      const [clientData, servicesData, cyclesData, approvalsData, briefingsData] = await Promise.all([
        Client.get(clientId),
        Service.filter({ agencyId, clientId }),
        CyclePlan.filter({ agencyId, clientId }),
        ApprovalRequest.filter({ agencyId, clientId }),
        Brief.filter({ agencyId, clientId }) // Fetch briefings
      ]);

      if (!clientData || clientData.agencyId !== agencyId) {
        throw new Error('Cliente não encontrado ou sem permissão de acesso');
      }

      setClient(clientData);
      setServices(servicesData || []);
      setCycles(cyclesData || []);
      setApprovals(approvalsData || []);
      setBriefings(briefingsData || []); // Set briefings

    } catch (err) {
      console.error('Erro ao recarregar cliente:', err);
      setError(err.message || 'Erro ao recarregar dados do cliente');
      toast.error('Erro ao recarregar cliente');
    } finally {
      setLoading(false);
    }
  }, [clientId, agencyId, isAuthenticated, user]);

  useEffect(() => {
    const loadAllClientData = async () => {
      if (!isAuthenticated) {
        setError('Você precisa estar logado para visualizar este cliente.');
        setLoading(false);
        return;
      }

      if (!user) {
        setError('Dados do usuário não encontrados.');
        setLoading(false);
        return;
      }

      if (!agencyId) {
        console.error('[Client] Missing agencyId:', { user, agencyId });
        setError('ID da agência não encontrado. Sua conta pode não estar configurada corretamente.');
        setLoading(false);
        return;
      }

      if (!clientId) {
        return;
      }

      if (!['owner', 'admin', 'team'].includes(user.role)) {
        setError(`Acesso negado. Seu papel '${user.role}' não tem permissão para visualizar clientes.`);
        setLoading(false);
        return;
      }

      reloadAllData();
    };

    loadAllClientData();
  }, [clientId, isAuthenticated, user, agencyId, reloadAllData]);

  useEffect(() => {
    const currentUrlParams = new URLSearchParams(window.location.search);
    const open = currentUrlParams.get('open');
    if (open === 'invite' && !inviteModalOpen) {
      setInviteModalOpen(true);
    }
    if (open === 'service' && !serviceModalOpen) {
      setServiceModalOpen(true);
    }
  }, [inviteModalOpen, serviceModalOpen]); // Added dependencies

  const clearOpenParam = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('open');
    window.history.replaceState({}, '', url.toString());
  };

  const handleClientSavedWithReload = (updatedClient) => {
    setClient(updatedClient);
    reloadAllData();
  };

  const handleServiceCreated = (newService) => {
    reloadAllData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Carregando dados do cliente...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-red-200">
            <CardHeader>
              <div className="flex items-center">
                <AlertCircle className="w-6 h-6 text-red-600 mr-2" />
                <CardTitle className="text-red-800">Erro ao Carregar Cliente</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-red-700 mb-4">{error}</p>

              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                  Mostrar informações técnicas
                </summary>
                <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono break-all">
                  <div><strong>URL atual:</strong> {window.location.href}</div>
                  <div><strong>Client ID:</strong> {clientId || 'Não encontrado'}</div>
                  <div><strong>Agency ID:</strong> {agencyId || 'Não encontrado'}</div>
                  <div><strong>User Role:</strong> {user?.role || 'Não encontrado'}</div>
                  <div><strong>Authenticated:</strong> {isAuthenticated ? 'Sim' : 'Não'}</div>
                  <div><strong>User Email:</strong> {user?.email || 'Não encontrado'}</div>
                </div>
              </details>

              <div className="flex gap-4 mt-6">
                <Button onClick={() => window.location.href = createPageUrl('clients')}>
                  Voltar para Lista de Clientes
                </Button>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Recarregar Página
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <ErrorBoundary>
        <div className="p-6">
          <EmptyState
            icon={Users}
            title="Cliente não encontrado"
            description="O cliente que você está procurando não existe ou foi removido."
            action={() => window.location.href = createPageUrl('clients')}
            actionText="Voltar aos Clientes"
            variant="info"
          />
        </div>
      </ErrorBoundary>
    );
  }

  const breadcrumbItems = [
    { label: 'Clientes', href: createPageUrl('clients'), icon: Users },
    { label: client.company || client.name, icon: User }
  ];

  const contextHeaderProps = {
    title: client.company || client.name,
    subtitle: client.name && client.company ? client.name : client.email,
    backButton: {
      href: createPageUrl('clients')
    },
    entity: {
      type: 'client',
      status: client.status,
      metadata: [
        { icon: Mail, label: 'Email', value: client.email },
        { icon: Building, label: 'Setor', value: client.industry || 'Não informado' },
        { icon: Calendar, label: 'Cliente desde', value: new Date(client.created_date).toLocaleDateString('pt-BR') }
      ]
    },
    quickActions: [
      {
        icon: Edit,
        label: 'Editar Cliente',
        onClick: () => setEditModalOpen(true)
      },
      {
        icon: Plus,
        label: 'Adicionar Serviço',
        onClick: () => setServiceModalOpen(true)
      },
      {
        icon: UserPlus,
        label: 'Convidar Cliente',
        onClick: () => setInviteModalOpen(true)
      },
      {
        icon: CheckCircle,
        label: 'Ver Tarefas',
        onClick: () => {
          window.location.href = createPageUrl('tasks-manager') + `?clientId=${client.id}`;
        }
      },
      // New quick action for briefing
      {
        icon: BookOpen,
        label: 'Criar Briefing',
        onClick: () => {
          window.location.href = createPageUrl('client-briefing') + `?clientId=${client.id}`;
        }
      }
    ]
  };

  const activeServices = services.filter(s => s.is_active);
  const activeCycles = cycles.filter(c => ['approved', 'in_execution'].includes(c.status));
  const pendingApprovals = approvals.filter(a => a.status === 'pending');

  const stats = [
    {
      label: 'Serviços Ativos',
      value: activeServices.length,
      icon: Briefcase,
      color: 'blue'
    },
    {
      label: 'Ciclos em Andamento',
      value: activeCycles.length,
      icon: Activity,
      color: 'green'
    },
    {
      label: 'Aprovações Pendentes',
      value: pendingApprovals.length,
      icon: Clock,
      color: 'amber'
    },
    // New stat for briefings
    {
      label: 'Briefings Iniciados',
      value: briefings.length,
      icon: BookOpen,
      color: 'purple' // Using a distinct color
    },
    {
      label: 'Taxa de Aprovação',
      value: approvals.length > 0 ? `${Math.round((approvals.filter(a => a.status === 'approved').length / approvals.length) * 100)}%` : '0%',
      icon: CheckCircle,
      color: 'emerald'
    }
  ];

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50">
        <div className="p-6 space-y-6">
          <Breadcrumbs items={breadcrumbItems} />
          <ContextHeader {...contextHeaderProps} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            <div className="lg:col-span-2 space-y-6">
              {/* 🔧 CORREÇÃO: Passar briefings para ClientSetupGuide */}
              {client && (
                <ClientSetupGuide
                  client={client}
                  services={services}
                  briefings={briefings} // Pass briefings here
                />
              )}
            </div>

            <div className="space-y-6">

              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BarChart3 className="w-5 h-5" />
                    Resumo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {stats.map((stat, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
                        <span className="text-sm text-slate-600">{stat.label}</span>
                      </div>
                      <span className="font-bold text-slate-900">{stat.value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Zap className="w-5 h-5" />
                    Ações Rápidas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button onClick={() => setEditModalOpen(true)} variant="outline" className="w-full justify-start gap-3">
                    <Edit className="w-4 h-4" />
                    Editar Cliente
                  </Button>
                  <Button onClick={() => setServiceModalOpen(true)} variant="outline" className="w-full justify-start gap-3">
                    <Plus className="w-4 h-4" />
                    Adicionar Serviço
                  </Button>
                  <Button onClick={() => setInviteModalOpen(true)} variant="outline" className="w-full justify-start gap-3">
                    <UserPlus className="w-4 h-4" />
                    Convidar Cliente
                  </Button>
                  {/* New button for Briefing */}
                  <Button onClick={() => { window.location.href = createPageUrl('client-briefing') + `?clientId=${client.id}`; }} variant="outline" className="w-full justify-start gap-3">
                    <BookOpen className="w-4 h-4" />
                    Criar Briefing
                  </Button>
                </CardContent>
              </Card>

              {services.length > 0 && (
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Briefcase className="w-5 h-5" />
                      Serviços
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {services.slice(0, 3).map((service) => (
                      <div key={service.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                        <div>
                          <h4 className="font-medium text-slate-900 text-sm">{service.name}</h4>
                          <p className="text-xs text-slate-600">{service.category?.replace('_', ' ')}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={service.is_active ? 'ativo' : 'inativo'} size="sm" />
                          <Button size="sm" variant="ghost" asChild>
                            <Link to={createPageUrl('service-detail') + `?serviceId=${service.id}`}>
                              <Eye className="w-3 h-3" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                    {services.length > 3 && (
                      <Button variant="outline" size="sm" className="w-full" asChild>
                        <Link to={createPageUrl('client-services') + `?clientId=${client.id}`}>
                          Ver Todos ({services.length})
                        </Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

        <ClientEditModal
          client={client}
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSave={handleClientSavedWithReload}
        />

        <ServiceCreateModal
          client={client}
          isOpen={serviceModalOpen}
          onClose={() => {
            setServiceModalOpen(false);
            clearOpenParam();
          }}
          onSave={handleServiceCreated}
        />

        <InviteClientModal
          client={client}
          isOpen={inviteModalOpen}
          onClose={() => {
            setInviteModalOpen(false);
            clearOpenParam();
          }}
          onSuccess={() => {
            toast.success('Cliente convidado com sucesso!');
            reloadAllData();
          }}
        />
      </div>
    </ErrorBoundary>
  );
}
