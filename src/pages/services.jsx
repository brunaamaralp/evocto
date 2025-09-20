
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Plus,
  Search,
  Filter,
  FileText,
  Building,
  Loader2,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { Service } from '@/api/entities';
import { Client } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';
import ServiceCard from '@/components/services/ServiceCard';
import ServiceModal from '@/components/services/ServiceModal';
import ServiceTemplateWizard from '@/components/services/ServiceTemplateWizard';
import { useDebounce } from '@/components/hooks/useDebounce';

// P2: Cache manager para templates
class ServiceCache {
  constructor() {
    this.templates = new Map();
    this.instances = new Map();
    this.lastFetch = {
      templates: null,
      instances: null
    };
    this.CACHE_TTL = 5 * 60 * 1000; // 5 minutos
  }

  shouldRefresh(type) {
    const lastFetch = this.lastFetch[type];
    return !lastFetch || (Date.now() - lastFetch) > this.CACHE_TTL;
  }

  setTemplates(templates) {
    this.templates.clear();
    templates.forEach(template => {
      this.templates.set(template.id, template);
    });
    this.lastFetch.templates = Date.now();
  }

  setInstances(instances) {
    this.instances.clear();
    instances.forEach(instance => {
      this.instances.set(instance.id, instance);
    });
    this.lastFetch.instances = Date.now();
  }

  getTemplates() {
    return Array.from(this.templates.values());
  }

  getInstances() {
    return Array.from(this.instances.values());
  }

  updateService(service) {
    if (service.is_template) {
      this.templates.set(service.id, service);
    } else {
      this.instances.set(service.id, service);
    }
  }

  removeService(serviceId, isTemplate) {
    if (isTemplate) {
      this.templates.delete(serviceId);
    } else {
      this.instances.delete(serviceId);
    }
  }

  clear() {
    this.templates.clear();
    this.instances.clear();
    this.lastFetch = { templates: null, instances: null };
  }
}

// P2: Instância global do cache
const serviceCache = new ServiceCache();

export default function ServicesPage() {
  const { user, agencyId } = useSession();
  const [activeTab, setActiveTab] = useState('templates');

  // P2: Estados separados para templates e instâncias
  const [templates, setTemplates] = useState([]);
  const [instances, setInstances] = useState([]);
  const [clients, setClients] = useState([]);

  // P2: Loading states separados
  const [loadingState, setLoadingState] = useState({
    templates: false,
    instances: false,
    clients: false,
    initialLoad: true
  });

  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // CORREÇÃO: Controle correto dos modais - NÃO ABRIR AUTOMATICAMENTE
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);

  // P2: Debounce para search otimizado
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // P2: Função otimizada para carregar templates
  const loadTemplates = useCallback(async (forceRefresh = false) => {
    if (!agencyId) return;

    // Verificar cache antes de fazer query
    if (!forceRefresh && !serviceCache.shouldRefresh('templates')) {
      console.log('📦 Templates carregados do cache');
      setTemplates(serviceCache.getTemplates());
      return;
    }

    setLoadingState(prev => ({ ...prev, templates: true }));

    try {
      console.log('🔍 Buscando templates no banco...');

      // P2: Query otimizada - APENAS templates
      const templatesData = await Service.filter(
        {
          agencyId,
          is_template: true
        },
        '-updated_date', // Mais recentes primeiro
        50, // Limite para performance
        ['id', 'name', 'description', 'category', 'deliverables', 'default_kpis', 'template_metadata', 'pricing'] // Campos específicos
      );

      console.log(`✅ ${templatesData.length} templates carregados`);

      serviceCache.setTemplates(templatesData);
      setTemplates(templatesData);

    } catch (error) {
      console.error('Erro ao carregar templates:', error);
      setError(`Erro ao carregar templates: ${error.message}`);
    } finally {
      setLoadingState(prev => ({ ...prev, templates: false }));
    }
  }, [agencyId]);

  // P2: Função otimizada para carregar instâncias
  const loadInstances = useCallback(async (forceRefresh = false) => {
    if (!agencyId) return;

    // Verificar cache antes de fazer query
    if (!forceRefresh && !serviceCache.shouldRefresh('instances')) {
      console.log('📦 Instâncias carregadas do cache');
      setInstances(serviceCache.getInstances());
      return;
    }

    setLoadingState(prev => ({ ...prev, instances: true }));

    try {
      console.log('🔍 Buscando instâncias no banco...');

      // P2: Query otimizada - APENAS instâncias
      const instancesData = await Service.filter(
        {
          agencyId,
          is_template: false
        },
        '-updated_date',
        100, // Mais instâncias que templates
        ['id', 'name', 'clientId', 'service_status', 'base_service_id', 'template_version_used', 'deliverables', 'pricing']
      );

      console.log(`✅ ${instancesData.length} instâncias carregadas`);

      serviceCache.setInstances(instancesData);
      setInstances(instancesData);

    } catch (error) {
      console.error('Erro ao carregar instâncias:', error);
      setError(`Erro ao carregar instâncias: ${error.message}`);
    } finally {
      setLoadingState(prev => ({ ...prev, instances: false }));
    }
  }, [agencyId]);

  // P2: Carregar clientes com cache
  const loadClients = useCallback(async () => {
    if (!agencyId) return;

    setLoadingState(prev => ({ ...prev, clients: true }));

    try {
      const clientsData = await Client.filter(
        { agencyId },
        'name', // Ordenar por nome
        undefined,
        ['id', 'name', 'email', 'company'] // Campos essenciais
      );

      setClients(clientsData);

    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    } finally {
      setLoadingState(prev => ({ ...prev, clients: false }));
    }
  }, [agencyId]);

  // P2: Load inteligente baseado na aba ativa
  useEffect(() => {
    if (!agencyId) return;

    const loadInitialData = async () => {
      setLoadingState(prev => ({ ...prev, initialLoad: true }));

      // Sempre carregar clientes
      await loadClients();

      // Carregar dados baseado na aba ativa
      if (activeTab === 'templates') {
        await loadTemplates();
      } else {
        await loadInstances();
      }

      setLoadingState(prev => ({ ...prev, initialLoad: false }));
    };

    loadInitialData();
  }, [agencyId, activeTab, loadTemplates, loadInstances, loadClients]);

  // P2: Lazy loading quando muda de aba
  useEffect(() => {
    if (activeTab === 'templates' && templates.length === 0) {
      loadTemplates();
    } else if (activeTab === 'instances' && instances.length === 0) {
      loadInstances();
    }
  }, [activeTab, templates.length, instances.length, loadTemplates, loadInstances]);

  // P2: Refresh forçado
  const handleRefresh = useCallback(async () => {
    serviceCache.clear();
    // Refresh all data
    await loadClients();
    await loadTemplates(true);
    await loadInstances(true);
  }, [loadTemplates, loadInstances, loadClients]);

  // P2: Callback otimizado para atualização de UM serviço (usado por ServiceCard para edições)
  const handleServiceUpdate = useCallback(async (updatedService) => {
    console.log('🔄 Atualizando serviço no estado local e cache:', updatedService);

    // Atualizar cache
    serviceCache.updateService(updatedService);

    // Atualizar estado local
    if (updatedService.is_template) {
      setTemplates(prev => {
        const index = prev.findIndex(s => s.id === updatedService.id);
        if (index >= 0) {
          const newTemplates = [...prev];
          newTemplates[index] = updatedService;
          return newTemplates;
        } else {
          // This case could happen if a new service is created and this handler is also used for immediate add
          return [...prev, updatedService];
        }
      });
    } else {
      setInstances(prev => {
        const index = prev.findIndex(s => s.id === updatedService.id);
        if (index >= 0) {
          const newInstances = [...prev];
          newInstances[index] = updatedService;
          return newInstances;
        } else {
          // This case could happen if a new service is created and this handler is also used for immediate add
          return [...prev, updatedService];
        }
      });
    }
    // IMPORTANT: Modal closing logic removed from here, as modals (or a general success handler) should manage their own visibility.
  }, []);

  // CORREÇÃO: Handlers CONTROLADOS - só abrir quando usuário clica
  const handleCreateService = useCallback(() => {
    console.log('➕ Usuário clicou para abrir modal de criar serviço (instância)');
    setShowCreateModal(true);
  }, []);

  const handleCreateTemplate = useCallback(() => {
    console.log('➕ Usuário clicou para abrir formulário de template');
    setShowTemplateForm(true);
  }, []);

  // CORREÇÃO: Handlers de close com logs
  const handleCloseCreateModal = useCallback(() => {
    console.log('🔴 Fechando modal de criar serviço (instância)');
    setShowCreateModal(false);
  }, []);

  const handleCloseTemplateForm = useCallback(() => {
    console.log('🔴 Fechando formulário de template');
    setShowTemplateForm(false);
  }, []);

  // Handler para sucesso de criação (chamado pelos modais quando a operação é concluída)
  const handleCreateSuccess = useCallback(() => {
    console.log('✅ Serviço/Template criado com sucesso. Recarregando todos os dados.');
    setShowCreateModal(false);
    setShowTemplateForm(false);
    handleRefresh(); // Trigger a full refresh after creation
  }, [handleRefresh]);

  // P2: Filtros otimizados com debounce
  const filteredTemplates = React.useMemo(() => {
    return templates.filter(template => {
      const searchLower = debouncedSearchTerm.toLowerCase();
      return !debouncedSearchTerm ||
        template.name.toLowerCase().includes(searchLower) ||
        template.description?.toLowerCase().includes(searchLower) ||
        template.category?.toLowerCase().includes(searchLower);
    });
  }, [templates, debouncedSearchTerm]);

  const filteredInstances = React.useMemo(() => {
    return instances.filter(instance => {
      const searchLower = debouncedSearchTerm.toLowerCase();
      const client = clients.find(c => c.id === instance.clientId);
      return !debouncedSearchTerm ||
        instance.name.toLowerCase().includes(searchLower) ||
        client?.name.toLowerCase().includes(searchLower) ||
        instance.service_status?.toLowerCase().includes(searchLower);
    });
  }, [instances, clients, debouncedSearchTerm]);

  // P2: Loading state inteligente
  const isLoading = loadingState.initialLoad ||
    (activeTab === 'templates' && loadingState.templates) ||
    (activeTab === 'instances' && loadingState.instances);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestão de Serviços</h1>
            <p className="text-gray-600 mt-1">
              Templates reutilizáveis e instâncias específicas por cliente
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            {/* CORREÇÃO: Usando o handler correto para abrir o wizard */}
            <Button onClick={handleCreateTemplate}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Template
            </Button>
            {/* CORREÇÃO: Usando o handler correto para abrir o modal de instância */}
            <Button variant="outline" onClick={handleCreateService}>
              <Building className="w-4 h-4 mr-2" />
              Nova Instância
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Search and Filters */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar por nome, categoria ou cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Tabs com Loading States */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Templates
              <Badge variant="secondary">{templates.length}</Badge>
              {loadingState.templates && (
                <Loader2 className="w-3 h-3 animate-spin ml-1" />
              )}
            </TabsTrigger>
            <TabsTrigger value="instances" className="flex items-center gap-2">
              <Building className="w-4 h-4" />
              Instâncias
              <Badge variant="secondary">{instances.length}</Badge>
              {loadingState.instances && (
                <Loader2 className="w-3 h-3 animate-spin ml-1" />
              )}
            </TabsTrigger>
          </TabsList>

          {/* Templates Tab */}
          <TabsContent value="templates">
            {isLoading ? (
              <ServicesLoadingSkeleton count={6} />
            ) : filteredTemplates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTemplates.map((template) => (
                  <ServiceCard
                    key={template.id}
                    service={template}
                    clients={clients}
                    onServiceUpdate={handleServiceUpdate} // Still used for *editing* services
                    showKPICount={true}
                  />
                ))}
              </div>
            ) : (
              <EmptyServicesState
                type="templates"
                onCreateTemplate={handleCreateTemplate} // CORREÇÃO: Usando o handler correto
                hasSearchTerm={!!debouncedSearchTerm}
              />
            )}
          </TabsContent>

          {/* Instances Tab */}
          <TabsContent value="instances">
            {isLoading ? (
              <ServicesLoadingSkeleton count={8} />
            ) : filteredInstances.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredInstances.map((instance) => (
                  <ServiceCard
                    key={instance.id}
                    service={instance}
                    clients={clients}
                    onServiceUpdate={handleServiceUpdate} // Still used for *editing* services
                    showInheritedInfo={true}
                  />
                ))}
              </div>
            ) : (
              <EmptyServicesState
                type="instances"
                onCreateInstance={handleCreateService} // CORREÇÃO: Usando o handler correto
                hasSearchTerm={!!debouncedSearchTerm}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Modais - CORREÇÃO: Renderizar APENAS quando showCreateModal/showTemplateForm for true */}
      {showCreateModal && (
        <ServiceModal
          isOpen={showCreateModal}
          onClose={handleCloseCreateModal}
          onServiceCreated={handleCreateSuccess}
          clients={clients}
          templates={templates}
        />
      )}

      {showTemplateForm && (
        <ServiceTemplateWizard
          isOpen={showTemplateForm}
          onClose={handleCloseTemplateForm}
          onTemplateCreated={handleCreateSuccess}
        />
      )}
    </div>
  );
}

// P2: Loading skeleton component
function ServicesLoadingSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-6 bg-gray-200 rounded w-32"></div>
              </div>
              <div className="h-8 w-8 bg-gray-200 rounded"></div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// P2: Empty states component
function EmptyServicesState({ type, onCreateTemplate, onCreateInstance, hasSearchTerm }) {
  if (hasSearchTerm) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center">
          <Search className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Nenhum resultado encontrado
          </h3>
          <p className="text-gray-600">
            Tente ajustar os termos de busca
          </p>
        </CardContent>
      </Card>
    );
  }

  if (type === 'templates') {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center">
          <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Nenhum template encontrado
          </h3>
          <p className="text-gray-600 mb-4">
            Crie templates reutilizáveis para padronizar seus serviços
          </p>
          <Button onClick={onCreateTemplate}>
            <Plus className="w-4 h-4 mr-2" />
            Criar Primeiro Template
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-dashed">
      <CardContent className="p-8 text-center">
        <Building className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Nenhuma instância encontrada
        </h3>
        <p className="text-gray-600 mb-4">
          Crie instâncias de serviços para clientes específicos
        </p>
        <Button onClick={onCreateInstance}>
          <Plus className="w-4 h-4 mr-2" />
          Criar Primeira Instância
        </Button>
      </CardContent>
    </Card>
  );
}
