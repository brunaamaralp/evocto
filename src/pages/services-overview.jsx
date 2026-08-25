
import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { useT } from '@/components/i18n/I18nProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, Search, Filter, Briefcase, Calendar, Users, 
  Settings, Eye, MoreVertical, Activity, RefreshCw,
  TrendingUp, Clock, CheckCircle, AlertCircle, LayoutTemplate,
  Target, DollarSign, Copy, X
} from 'lucide-react';
import { Service } from '@/api/entities';
import { Client } from '@/api/entities';
import { CyclePlan } from '@/api/entities';
import EmptyState from '@/components/shared/EmptyState';
import StatusBadge from '@/components/shared/StatusBadge';
import LoadingState from '@/components/shared/LoadingState';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import ServiceTemplateEditor from '@/components/services/ServiceTemplateEditor';
import ServiceInstanceEditor from '@/components/services/ServiceInstanceEditor';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';

// Componente para card de serviço
const ServiceCard = ({ service, client, cycles, onServiceClick }) => {
  const activeCycles = cycles.filter(c => ['approved', 'in_execution'].includes(c.status)).length;
  const completedCycles = cycles.filter(c => c.status === 'completed').length;
  
  const getServiceIcon = (category) => {
    const icons = {
      gestao_financeira: Activity,
      consultoria_tributaria: TrendingUp,
      valuation: Settings,
      planejamento_financeiro: Users,
      fusao_aquisicao: RefreshCw,
      reestruturacao: Briefcase
    };
    return icons[category] || Briefcase;
  };

  const ServiceIcon = getServiceIcon(service.category);

  return (
    <Card className="border-0 shadow-sm hover:shadow-lg transition-all duration-200 group cursor-pointer"
          onClick={() => onServiceClick(service)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
              <ServiceIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                {service.name}
              </h3>
              <p className="text-sm text-slate-600">{client?.name || client?.company}</p>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onServiceClick(service)}>
                <Eye className="w-4 h-4 mr-2" />
                Ver Detalhes
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => window.location.href = createPageUrl('service-editor') + `?serviceId=${service.id}`}>
                <Settings className="w-4 h-4 mr-2" />
                Editar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Categoria</span>
            <Badge className="bg-blue-100 text-blue-700 border-blue-300">
              {service.category?.replace('_', ' ') || 'Não definida'}
            </Badge>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Status</span>
            <StatusBadge status={service.is_active ? 'ativo' : 'inativo'} size="sm" />
          </div>

          {cycles.length > 0 && (
            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
              <div className="text-center">
                <div className="text-lg font-semibold text-emerald-600">{completedCycles}</div>
                <div className="text-xs text-slate-500">Completos</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-blue-600">{activeCycles}</div>
                <div className="text-xs text-slate-500">Ativos</div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Componente para card de template
const TemplateCard = ({ template, onEdit, onDuplicate, onUse }) => {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getTotalHours = () => {
    return template.deliverables?.reduce((total, deliverable) => 
      total + (deliverable.estimated_hours || 0), 0
    ) || 0;
  };

  const getCategoryLabel = (category) => {
    const labels = {
      'gestao_financeira': 'Gestão Financeira',
      'consultoria_tributaria': 'Consultoria Tributária',
      'valuation': 'Valuation',
      'planejamento_financeiro': 'Planejamento Financeiro',
      'fusao_aquisicao': 'Fusão & Aquisição',
      'reestruturacao': 'Reestruturação'
    };
    return labels[category] || category;
  };

  return (
    <Card className="border-0 shadow-sm hover:shadow-lg transition-all duration-200 group">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg flex items-center justify-center">
              <LayoutTemplate className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">{template.name}</h3>
              <Badge variant="outline" className="mt-1 text-xs">
                {getCategoryLabel(template.category)}
              </Badge>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(template)}>
                <Settings className="w-4 h-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(template)}>
                <Copy className="w-4 h-4 mr-2" />
                Duplicar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onUse(template)}>
                <Plus className="w-4 h-4 mr-2" />
                Usar Template
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <p className="text-sm text-gray-600 line-clamp-2 mb-4">
          {template.description}
        </p>

        <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-600">
              {template.deliverables?.length || 0}
            </div>
            <div className="text-xs text-gray-500">Fases</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">
              {getTotalHours()}h
            </div>
            <div className="text-xs text-gray-500">Estimadas</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-purple-600">
              v{template.version}
            </div>
            <div className="text-xs text-gray-500">Versão</div>
          </div>
        </div>

        {template.pricing?.base_price && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Valor base:</span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(template.pricing.base_price)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

function ServicesOverviewPage() {
  const { agencyId } = useSession();
  const t = useT();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [services, setServices] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [clients, setClients] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Estados para modais
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [showServiceEditor, setShowServiceEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [editingService, setEditingService] = useState(null);
  
  // Aba ativa
  const [activeTab, setActiveTab] = useState('services');

  const loadData = useCallback(async () => {
    if (!agencyId) return;

    try {
      setLoading(true);
      setError(null);

      const [servicesData, templatesData, clientsData, cyclesData] = await Promise.all([
        Service.filter({ agencyId, is_template: false }),
        Service.filter({ agencyId, is_template: true }),
        Client.filter({ agencyId }),
        CyclePlan.filter({ agencyId })
      ]);

      setServices(servicesData || []);
      setTemplates(templatesData || []);
      setClients(clientsData || []);
      setCycles(cyclesData || []);

    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError('Não foi possível carregar os dados');
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handlers para serviços
  const handleServiceClick = (service) => {
    window.location.href = createPageUrl('service-detail') + `?serviceId=${service.id}`;
  };

  const handleCreateService = () => {
    setEditingService(null);
    setShowServiceEditor(true);
  };

  const handleEditService = (service) => {
    setEditingService(service);
    setShowServiceEditor(true);
  };

  // Handlers para templates
  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setShowTemplateEditor(true);
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setShowTemplateEditor(true);
  };

  const handleDuplicateTemplate = async (template) => {
    try {
      const newTemplate = {
        ...template,
        name: `${template.name} (Cópia)`,
        version: '1.0',
        id: undefined,
        created_date: undefined,
        updated_date: undefined
      };
      
      const duplicated = await Service.create(newTemplate);
      toast.success('Template duplicado com sucesso!');
      loadData();
    } catch (error) {
      console.error('Erro ao duplicar template:', error);
      toast.error('Erro ao duplicar template');
    }
  };

  const handleUseTemplate = (template) => {
    // Redirecionar para criar serviço baseado no template
    window.location.href = createPageUrl('service-editor') + `?templateId=${template.id}`;
  };

  const handleTemplateSaved = () => {
    setShowTemplateEditor(false);
    setEditingTemplate(null);
    loadData();
  };

  const handleServiceSaved = () => {
    setShowServiceEditor(false);
    setEditingService(null);
    loadData();
  };

  // Filtros
  const filteredServices = services.filter(service => {
    const matchesSearch = service.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.category?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && service.is_active) ||
                         (statusFilter === 'inactive' && !service.is_active);
    
    return matchesSearch && matchesStatus;
  });

  const filteredTemplates = templates.filter(template => {
    return template.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           template.category?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return <LoadingState message="Carregando serviços..." />;
  }

  if (error) {
    return (
      <ErrorBoundary>
        <div className="p-6">
          <EmptyState
            icon={AlertCircle}
            title="Erro ao carregar serviços"
            description={error}
            action={loadData}
            actionText="Tentar Novamente"
            variant="warning"
          />
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Serviços</h1>
            <p className="text-slate-600 mt-1">
              Gerencie serviços e templates da sua agência
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="services">
              Serviços ({services.length})
            </TabsTrigger>
            <TabsTrigger value="templates">
              Templates ({templates.length})
            </TabsTrigger>
          </TabsList>

          {/* Aba de Serviços */}
          <TabsContent value="services" className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex-1">
                {/* Filters para Serviços */}
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                          <Input
                            placeholder="Buscar serviços..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant={statusFilter === 'all' ? 'default' : 'outline'}
                          onClick={() => setStatusFilter('all')}
                          size="sm"
                        >
                          Todos ({services.length})
                        </Button>
                        <Button
                          variant={statusFilter === 'active' ? 'default' : 'outline'}
                          onClick={() => setStatusFilter('active')}
                          size="sm"
                        >
                          Ativos ({services.filter(s => s.is_active).length})
                        </Button>
                        <Button
                          variant={statusFilter === 'inactive' ? 'default' : 'outline'}
                          onClick={() => setStatusFilter('inactive')}
                          size="sm"
                        >
                          Inativos ({services.filter(s => !s.is_active).length})
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Button onClick={handleCreateService} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Novo Serviço
              </Button>
            </div>

            {/* Lista de Serviços */}
            {filteredServices.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredServices.map((service) => {
                  const client = clients.find(c => c.id === service.clientId);
                  const serviceCycles = cycles.filter(c => c.serviceId === service.id);
                  
                  return (
                    <ServiceCard
                      key={service.id}
                      service={service}
                      client={client}
                      cycles={serviceCycles}
                      onServiceClick={handleServiceClick}
                    />
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={Briefcase}
                title={searchTerm || statusFilter !== 'all' ? 'Nenhum serviço encontrado' : 'Nenhum serviço criado ainda'}
                description={
                  searchTerm || statusFilter !== 'all' 
                    ? 'Tente ajustar os filtros para encontrar seus serviços.'
                    : 'Crie seu primeiro serviço para começar a organizar o trabalho com seus clientes.'
                }
                action={handleCreateService}
                actionText="Criar Primeiro Serviço"
                variant="info"
              />
            )}
          </TabsContent>

          {/* Aba de Templates */}
          <TabsContent value="templates" className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex-1">
                {/* Filters para Templates */}
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                          <Input
                            placeholder="Buscar templates..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Button onClick={handleCreateTemplate} className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white">
                <LayoutTemplate className="w-4 h-4 mr-2" />
                Novo Template
              </Button>
            </div>

            {/* Lista de Templates */}
            {filteredTemplates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onEdit={handleEditTemplate}
                    onDuplicate={handleDuplicateTemplate}
                    onUse={handleUseTemplate}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={LayoutTemplate}
                title={searchTerm ? 'Nenhum template encontrado' : 'Nenhum template criado ainda'}
                description={
                  searchTerm 
                    ? 'Tente ajustar o termo de busca para encontrar seus templates.'
                    : 'Crie seu primeiro template para padronizar e agilizar a criação de novos serviços.'
                }
                action={handleCreateTemplate}
                actionText="Criar Primeiro Template"
                variant="info"
              />
            )}
          </TabsContent>
        </Tabs>

        {/* Modais */}
        <ServiceTemplateEditor
          isOpen={showTemplateEditor}
          onClose={() => setShowTemplateEditor(false)}
          template={editingTemplate}
          onSaved={handleTemplateSaved}
        />

        {showServiceEditor && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold">
                    {editingService ? 'Editar Serviço' : 'Novo Serviço'}
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowServiceEditor(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <ServiceInstanceEditor
                  serviceInstance={editingService}
                  clients={clients}
                  onSave={handleServiceSaved}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

export default ServicesOverviewPage;
