import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Building, 
  Plus, 
  Settings, 
  Calendar,
  DollarSign,
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  ArrowRight,
  Eye,
  Edit,
  Play,
  Pause,
  TrendingUp
} from 'lucide-react';
import { Service } from '@/api/entities';
import { Client } from '@/api/entities';
import { Task } from '@/api/entities';
import { createPageUrl } from '@/utils';
import { Link, useNavigate } from 'react-router-dom';
import LoadingState from '@/components/shared/LoadingState';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import Breadcrumbs from '@/components/navigation/Breadcrumbs';
import ContextHeader from '@/components/navigation/ContextHeader';
import ServiceCard from '@/components/services/ServiceCard';

/**
 * Página de serviços de um cliente específico
 * Mostra todos os serviços/contratos ativos e histórico
 */
export default function ClientServicesPage() {
  const { user, agencyId } = useSession();
  const navigate = useNavigate();
  
  const urlParams = new URLSearchParams(window.location.search);
  const clientId = urlParams.get('clientId');
  
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState(null);
  const [services, setServices] = useState([]);
  const [serviceTemplates, setServiceTemplates] = useState([]);
  const [stats, setStats] = useState({});
  const [error, setError] = useState(null);

  const loadClientServices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!clientId) {
        throw new Error('ID do cliente não fornecido');
      }

      // Carregar cliente
      const clientData = await Client.get(clientId);
      if (!clientData || clientData.agencyId !== agencyId) {
        throw new Error('Cliente não encontrado ou sem permissão');
      }
      setClient(clientData);

      // Carregar serviços do cliente (instâncias)
      const clientServices = await Service.filter({
        agencyId,
        clientId,
        is_template: false
      });
      setServices(clientServices);

      // Carregar templates disponíveis
      const templates = await Service.filter({
        agencyId,
        is_template: true,
        is_active: true
      });
      setServiceTemplates(templates);

      // Calcular estatísticas
      const activeServices = clientServices.filter(s => s.is_active);
      const completedServices = clientServices.filter(s => s.service_status === 'completed');
      const inProgressServices = clientServices.filter(s => 
        ['in_execution', 'kpis_setup', 'briefing_pending'].includes(s.service_status)
      );

      // Calcular progresso geral
      let totalProgress = 0;
      let servicesWithProgress = 0;
      
      for (const service of clientServices) {
        if (service.deliverables && service.deliverables.length > 0) {
          const completedDeliverables = service.deliverables.filter(d => d.status === 'completed').length;
          const progress = (completedDeliverables / service.deliverables.length) * 100;
          totalProgress += progress;
          servicesWithProgress++;
        }
      }

      const averageProgress = servicesWithProgress > 0 ? totalProgress / servicesWithProgress : 0;

      setStats({
        totalServices: clientServices.length,
        activeServices: activeServices.length,
        completedServices: completedServices.length,
        inProgressServices: inProgressServices.length,
        averageProgress: Math.round(averageProgress),
        availableTemplates: templates.length
      });

    } catch (err) {
      console.error('Erro ao carregar serviços:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [clientId, agencyId]);

  useEffect(() => {
    loadClientServices();
  }, [loadClientServices]);

  const getServiceStatusBadge = (service) => {
    const statusConfig = {
      setup: { color: 'bg-gray-100 text-gray-800', icon: Clock, label: 'Configuração' },
      briefing_pending: { color: 'bg-yellow-100 text-yellow-800', icon: FileText, label: 'Aguardando Briefing' },
      kpis_setup: { color: 'bg-blue-100 text-blue-800', icon: TrendingUp, label: 'Configurando KPIs' },
      in_execution: { color: 'bg-green-100 text-green-800', icon: Play, label: 'Em Execução' },
      closing: { color: 'bg-orange-100 text-orange-800', icon: Clock, label: 'Finalizando' },
      completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Concluído' },
      cancelled: { color: 'bg-red-100 text-red-800', icon: Pause, label: 'Cancelado' },
      archived: { color: 'bg-gray-100 text-gray-600', icon: FileText, label: 'Arquivado' }
    };

    const config = statusConfig[service.service_status] || statusConfig.setup;
    const StatusIcon = config.icon;

    return (
      <Badge className={config.color}>
        <StatusIcon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getServiceProgress = (service) => {
    if (!service.deliverables || service.deliverables.length === 0) {
      return 0;
    }

    const completedDeliverables = service.deliverables.filter(d => d.status === 'completed').length;
    return Math.round((completedDeliverables / service.deliverables.length) * 100);
  };

  const handleCreateService = (templateId) => {
    navigate(`${createPageUrl('service-instance-editor')}?clientId=${clientId}&templateId=${templateId}`);
  };

  const handleViewService = (serviceId) => {
    navigate(`${createPageUrl('service-detail')}?serviceId=${serviceId}&clientId=${clientId}`);
  };

  const breadcrumbItems = [
    { label: 'Clientes', href: createPageUrl('clients'), icon: Building },
    ...(client ? [{ 
      label: client.name || client.legal_name, 
      href: createPageUrl('client') + `?clientId=${client.id}` 
    }] : []),
    { label: 'Serviços' }
  ];

  if (loading) {
    return <LoadingState message="Carregando serviços..." />;
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <ContextHeader
          title="Serviços do Cliente"
          subtitle={client ? `${client.name} • ${stats.totalServices} serviços` : 'Cliente'}
          backButton={{
            href: client ? `${createPageUrl('client')}?clientId=${client.id}` : createPageUrl('clients')
          }}
          entity={{
            type: 'services',
            metadata: [
              {
                icon: CheckCircle,
                label: 'Ativos',
                value: stats.activeServices
              },
              {
                icon: TrendingUp,
                label: 'Progresso Médio',
                value: `${stats.averageProgress}%`
              }
            ]
          }}
          actions={[
            {
              label: 'Novo Serviço',
              icon: Plus,
              onClick: () => {
                // Scroll to templates section
                document.getElementById('service-templates')?.scrollIntoView({ behavior: 'smooth' });
              }
            }
          ]}
        />

        <div className="p-6">
          <Breadcrumbs items={breadcrumbItems} />

          <div className="max-w-7xl mx-auto space-y-6">
            {/* Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <FileText className="h-8 w-8 text-blue-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalServices}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Play className="h-8 w-8 text-green-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Em Progresso</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.inProgressServices}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <CheckCircle className="h-8 w-8 text-emerald-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Concluídos</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.completedServices}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <TrendingUp className="h-8 w-8 text-purple-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Progresso</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.averageProgress}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Serviços Ativos */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Serviços Ativos</h2>
              
              {services.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum serviço ativo</h3>
                    <p className="text-gray-600 mb-4">
                      Este cliente ainda não possui serviços contratados.
                    </p>
                    <Button onClick={() => document.getElementById('service-templates')?.scrollIntoView({ behavior: 'smooth' })}>
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Primeiro Serviço
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {services.map((service) => (
                    <Card key={service.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{service.name}</CardTitle>
                            <p className="text-sm text-gray-600 mt-1">
                              {service.category} • v{service.version}
                            </p>
                          </div>
                          {getServiceStatusBadge(service)}
                        </div>
                      </CardHeader>
                      
                      <CardContent>
                        <div className="space-y-4">
                          {/* Progresso */}
                          <div>
                            <div className="flex justify-between text-sm mb-2">
                              <span>Progresso</span>
                              <span>{getServiceProgress(service)}%</span>
                            </div>
                            <Progress value={getServiceProgress(service)} className="h-2" />
                          </div>

                          {/* Informações */}
                          <div className="flex justify-between text-sm text-gray-600">
                            <span>Início:</span>
                            <span>
                              {service.start_date 
                                ? new Date(service.start_date).toLocaleDateString('pt-BR')
                                : 'Não definido'
                              }
                            </span>
                          </div>

                          {service.end_date && (
                            <div className="flex justify-between text-sm text-gray-600">
                              <span>Término:</span>
                              <span>{new Date(service.end_date).toLocaleDateString('pt-BR')}</span>
                            </div>
                          )}

                          {/* Deliverables */}
                          {service.deliverables && service.deliverables.length > 0 && (
                            <div>
                              <p className="text-sm text-gray-600 mb-2">
                                {service.deliverables.filter(d => d.status === 'completed').length}/
                                {service.deliverables.length} fases concluídas
                              </p>
                            </div>
                          )}

                          {/* Ações */}
                          <div className="flex gap-2 pt-4 border-t">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewService(service.id)}
                              className="flex-1"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Ver Detalhes
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`${createPageUrl('service-instance-editor')}?serviceId=${service.id}`)}
                            >
                              <Settings className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Templates Disponíveis */}
            <div id="service-templates">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Adicionar Novo Serviço</h2>
              
              {serviceTemplates.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <AlertTriangle className="h-12 w-12 text-amber-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum template disponível</h3>
                    <p className="text-gray-600 mb-4">
                      Não há templates de serviços configurados.
                    </p>
                    <Button asChild>
                      <Link to={createPageUrl('service-editor')}>
                        <Plus className="w-4 h-4 mr-2" />
                        Criar Template
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {serviceTemplates.map((template) => (
                    <Card 
                      key={template.id} 
                      className="hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-blue-200"
                      onClick={() => handleCreateService(template.id)}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{template.name}</CardTitle>
                            <p className="text-sm text-gray-600 mt-1">{template.category}</p>
                          </div>
                          <Badge className="bg-blue-100 text-blue-800">Template</Badge>
                        </div>
                      </CardHeader>
                      
                      <CardContent>
                        <div className="space-y-3">
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {template.description}
                          </p>

                          {/* Informações do template */}
                          {template.deliverables && (
                            <div className="text-sm text-gray-500">
                              <span>{template.deliverables.length} fases</span>
                            </div>
                          )}

                          {template.default_kpis && template.default_kpis.length > 0 && (
                            <div className="text-sm text-gray-500">
                              <span>{template.default_kpis.length} KPIs padrão</span>
                            </div>
                          )}

                          {template.pricing && (
                            <div className="text-sm font-medium text-gray-900">
                              {template.pricing.type === 'fixed' && template.pricing.base_price && (
                                <span>R$ {template.pricing.base_price.toLocaleString('pt-BR')}</span>
                              )}
                            </div>
                          )}

                          <Button className="w-full mt-4">
                            <Plus className="w-4 h-4 mr-2" />
                            Contratar Serviço
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}