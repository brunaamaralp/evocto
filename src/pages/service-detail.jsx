import React from 'react';
import { useDeepLink } from '@/components/hooks/useDeepLink';
import { createPageUrl } from '@/utils';
import LoadingState from '@/components/shared/LoadingState';
import ErrorState from '@/components/shared/ErrorState';
import ServiceOverview from '@/components/services/ServiceOverview';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/shared/StatusBadge';
import { 
  ArrowLeft, Settings, Users, Calendar, Clock,
  Target, DollarSign, FileText, MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { getCategoryLabel } from '@/constants/serviceCategories';

export default function ServiceDetailPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const serviceId = urlParams.get('serviceId');

  const { loading, error, data: service, context } = useDeepLink('service', serviceId, {
    prefetchRelations: true,
    validatePermissions: true,
    onError: (err) => {
      console.error('Failed to load service details:', err);
    }
  });

  const getBreadcrumbs = () => {
    const breadcrumbs = [
      { label: 'Início', href: createPageUrl('today') },
      { label: 'Serviços', href: createPageUrl('services-overview') }
    ];

    if (service) {
      breadcrumbs.push({ label: service.name });
    } else {
      breadcrumbs.push({ label: 'Detalhes do Serviço' });
    }

    return breadcrumbs;
  };

  const getServiceTypeLabel = (service) => {
    if (!service) return '';
    
    if (service.is_template) {
      return 'Template de Serviço';
    }
    return 'Serviço Ativo';
  };

  const handleEditService = () => {
    if (service?.is_template) {
      window.location.href = createPageUrl('service-template-editor') + `?templateId=${service.id}`;
    } else {
      window.location.href = createPageUrl('service-instance-editor') + `?serviceId=${service.id}`;
    }
  };

  const handleViewClient = () => {
    if (context.client) {
      window.location.href = createPageUrl('client-detail') + `?clientId=${context.client.id}`;
    }
  };

  const handleBackToServices = () => {
    window.location.href = createPageUrl('services-overview');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <LoadingState 
            variant="skeleton" 
            size="page"
            message="Carregando detalhes do serviço..."
          />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto p-6">
          <ErrorState
            type={error.type}
            title={error.type === '404' ? 'Serviço Não Encontrado' : 'Erro ao Carregar Serviço'}
            message={
              error.type === '404' ? 
                'O serviço solicitado não existe ou foi removido.' :
              error.type === '403' ?
                'Você não tem permissão para acessar este serviço.' :
                error.message
            }
            backUrl={createPageUrl('services-overview')}
            onAction={() => window.location.reload()}
          />
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto p-6">
          <ErrorState
            type="404"
            title="Serviço Não Encontrado"
            message="O serviço solicitado não foi encontrado."
            backUrl={createPageUrl('services-overview')}
          />
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        
        {/* Header fixo */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 py-4">
            
            {/* Breadcrumbs */}
            <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
              {getBreadcrumbs().map((crumb, index) => (
                <React.Fragment key={index}>
                  {crumb.href ? (
                    <button 
                      onClick={() => window.location.href = crumb.href}
                      className="hover:text-gray-900 transition-colors"
                    >
                      {crumb.label}
                    </button>
                  ) : (
                    <span className="text-gray-900 font-medium">{crumb.label}</span>
                  )}
                  {index < getBreadcrumbs().length - 1 && (
                    <span className="text-gray-400">/</span>
                  )}
                </React.Fragment>
              ))}
            </nav>

            {/* Header principal */}
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={handleBackToServices}
                  className="mt-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>

                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl font-bold text-gray-900">
                      {service.name}
                    </h1>
                    
                    <Badge 
                      variant={service.is_template ? "secondary" : "default"}
                      className={service.is_template ? 
                        "bg-purple-100 text-purple-800 border-purple-300" : 
                        "bg-blue-100 text-blue-800 border-blue-300"
                      }
                    >
                      {getServiceTypeLabel(service)}
                    </Badge>

                    {service.service_status && !service.is_template && (
                      <StatusBadge 
                        status={service.service_status} 
                        type="service"
                        size="default" 
                      />
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    
                    <div className="flex items-center gap-1">
                      <Target className="w-4 h-4" />
                      <span>{getCategoryLabel(service.category)}</span>
                    </div>

                    {context.client && (
                      <button
                        onClick={handleViewClient}
                        className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                      >
                        <Users className="w-4 h-4" />
                        <span>{context.client.name}</span>
                      </button>
                    )}

                    {service.version && (
                      <div className="flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        <span>v{service.version}</span>
                      </div>
                    )}

                    {service.start_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>
                          Iniciado em {new Date(service.start_date).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Ações */}
              <div className="flex items-center gap-2">
                <Button onClick={handleEditService} className="gap-2">
                  <Settings className="w-4 h-4" />
                  Editar Serviço
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {context.client && (
                      <DropdownMenuItem onClick={handleViewClient}>
                        <Users className="w-4 h-4 mr-2" />
                        Ver Cliente
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => window.print()}>
                      <FileText className="w-4 h-4 mr-2" />
                      Imprimir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>

        {/* Conteúdo principal */}
        <div className="max-w-7xl mx-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Coluna principal - 2/3 */}
            <div className="lg:col-span-2 space-y-6">
              <ServiceOverview 
                service={service} 
                client={context.client}
                prefetchedData={service._prefetched}
                onUpdate={() => {
                  // Refetch service data
                  window.location.reload();
                }}
              />
            </div>

            {/* Sidebar - 1/3 */}
            <div className="space-y-6">
              
              {/* Card de resumo */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Resumo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  
                  {service.pricing && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Valor Base</span>
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        <span className="font-medium">
                          R$ {service.pricing.base_price?.toLocaleString('pt-BR') || '0'}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Entregáveis</span>
                    <span className="font-medium">
                      {service.deliverables?.length || 0}
                    </span>
                  </div>

                  {service.cycle_frequency && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Frequência</span>
                      <Badge variant="outline">
                        {service.cycle_frequency === 'monthly' ? 'Mensal' :
                         service.cycle_frequency === 'weekly' ? 'Semanal' :
                         service.cycle_frequency === 'quarterly' ? 'Trimestral' : 
                         service.cycle_frequency}
                      </Badge>
                    </div>
                  )}

                  {service.created_date && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Criado em</span>
                      <span className="text-sm">
                        {new Date(service.created_date).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Estatísticas do template (se aplicável) */}
              {service.is_template && service.template_metadata && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Estatísticas do Template</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Uso Total</span>
                      <span className="font-medium">
                        {service.template_metadata.usage_count || 0}x
                      </span>
                    </div>

                    {service.template_metadata.success_rate && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Taxa de Sucesso</span>
                        <span className="font-medium text-green-600">
                          {Math.round(service.template_metadata.success_rate * 100)}%
                        </span>
                      </div>
                    )}

                    {service.template_metadata.last_used && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Último Uso</span>
                        <span className="text-sm">
                          {new Date(service.template_metadata.last_used).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Ações rápidas */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Ações Rápidas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {service.is_template ? (
                    <Button variant="outline" className="w-full justify-start">
                      <Users className="w-4 h-4 mr-2" />
                      Criar Serviço para Cliente
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" className="w-full justify-start">
                        <Calendar className="w-4 h-4 mr-2" />
                        Ver Cronograma
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <FileText className="w-4 h-4 mr-2" />
                        Gerar Relatório
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}