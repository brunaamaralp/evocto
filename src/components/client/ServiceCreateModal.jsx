import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { Service } from '@/api/entities';
import { ProjectTeam } from '@/api/entities';
import { User } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Search, Settings, Clock, Target, Users, Calendar, 
  DollarSign, ArrowRight, ArrowLeft, CheckCircle,
  AlertTriangle, FileText, BookOpen, Package,
  Play, Eye, UserPlus, Briefcase, GitBranch,
  LayoutTemplate, Loader2, Info
} from 'lucide-react';
import { toast } from 'sonner';
import ServiceSLAValidator from '@/components/services/ServiceSLAValidator';
import { generateTasksFromService } from '@/api/functions';

const WIZARD_STEPS = {
  SELECT_TEMPLATE: 1,
  CONFIGURE_SERVICE: 2,
  PREVIEW_PHASES: 3
};

const STEP_TITLES = {
  [WIZARD_STEPS.SELECT_TEMPLATE]: 'Selecionar Template',
  [WIZARD_STEPS.CONFIGURE_SERVICE]: 'Configurar Serviço',
  [WIZARD_STEPS.PREVIEW_PHASES]: 'Preview e Confirmação'
};

const CATEGORY_OPTIONS = [
  { value: 'gestao_financeira', label: 'Gestão Financeira' },
  { value: 'consultoria_tributaria', label: 'Consultoria Tributária' },
  { value: 'valuation', label: 'Valuation' },
  { value: 'planejamento_financeiro', label: 'Planejamento Financeiro' },
  { value: 'fusao_aquisicao', label: 'Fusão & Aquisição' },
  { value: 'reestruturacao', label: 'Reestruturação' }
];

const SERVICE_STATUS_OPTIONS = [
  { value: 'draft', label: 'Rascunho', color: 'bg-gray-100 text-gray-800' },
  { value: 'active', label: 'Ativo', color: 'bg-green-100 text-green-800' },
  { value: 'on_hold', label: 'Em Espera', color: 'bg-yellow-100 text-yellow-800' }
];

const BILLING_CYCLE_OPTIONS = [
  { value: 'one_time', label: 'Pagamento Único' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'yearly', label: 'Anual' }
];

export default function ServiceCreateModal({ 
  isOpen, 
  onClose, 
  client, 
  onSave 
}) {
  const { user } = useSession();
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState(WIZARD_STEPS.SELECT_TEMPLATE);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  // Templates state
  const [templates, setTemplates] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Team members state
  const [teamMembers, setTeamMembers] = useState([]);

  // Service configuration state
  const [serviceConfig, setServiceConfig] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    contract_value: 0,
    contract_terms: {
      payment_schedule: [],
      sla_terms: {},
      cancellation_policy: '',
      custom_clauses: []
    },
    billing_cycle: 'monthly',
    service_status: 'active',
    customizations: {},
    team_assignments: {
      consultor_lider: '',
      consultor_apoio: [],
      cliente_gestor: '',
      cliente_aprovador: ''
    }
  });

  const loadTemplates = React.useCallback(async () => {
    if (!user?.data?.agencyId) return;

    try {
      setLoading(true);
      const templatesData = await Service.filter({
        agencyId: user.data.agencyId,
        is_template: true,
        is_active: true
      }, '-created_date');

      setTemplates(templatesData || []);
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
      toast.error('Erro ao carregar templates');
    } finally {
      setLoading(false);
    }
  }, [user?.data?.agencyId]);

  const loadTeamMembers = React.useCallback(async () => {
    if (!user?.data?.agencyId) return;

    try {
      const members = await User.filter({
        'data.agencyId': user.data.agencyId,
        'data.role': { $in: ['owner', 'admin', 'team'] }
      });

      setTeamMembers(members || []);
    } catch (error) {
      console.error('Erro ao carregar equipe:', error);
    }
  }, [user?.data?.agencyId]);

  // Load templates on modal open
  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      loadTeamMembers();
    }
  }, [isOpen, loadTemplates, loadTeamMembers]);

  // Auto-fill service name when template is selected
  useEffect(() => {
    if (selectedTemplate && client) {
      setServiceConfig(prev => ({
        ...prev,
        name: `${selectedTemplate.name} — ${client.name}`,
        description: selectedTemplate.description || ''
      }));
    }
  }, [selectedTemplate, client]);

  // Reset modal state when closed
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(WIZARD_STEPS.SELECT_TEMPLATE);
      setSelectedTemplate(null);
      setSearchTerm('');
      setCategoryFilter('all');
      setServiceConfig({
        name: '',
        description: '',
        start_date: '',
        end_date: '',
        contract_value: 0,
        contract_terms: {
          payment_schedule: [],
          sla_terms: {},
          cancellation_policy: '',
          custom_clauses: []
        },
        billing_cycle: 'monthly',
        service_status: 'active',
        customizations: {},
        team_assignments: {
          consultor_lider: '',
          consultor_apoio: [],
          cliente_gestor: '',
          cliente_aprovador: ''
        }
      });
    }
  }, [isOpen]);

  // Filter templates based on search and category
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleNextStep = () => {
    if (currentStep === WIZARD_STEPS.SELECT_TEMPLATE) {
      if (!selectedTemplate) {
        toast.error('Selecione um template para continuar');
        return;
      }
    }
    
    if (currentStep === WIZARD_STEPS.CONFIGURE_SERVICE) {
      if (!serviceConfig.name || !serviceConfig.start_date) {
        toast.error('Nome e data de início são obrigatórios');
        return;
      }
    }

    setCurrentStep(prev => Math.min(prev + 1, WIZARD_STEPS.PREVIEW_PHASES));
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, WIZARD_STEPS.SELECT_TEMPLATE));
  };

  const handleCreateService = async () => {
    if (!selectedTemplate || !client) {
      toast.error('Dados insuficientes para criar o serviço');
      return;
    }

    try {
      setCreating(true);

      // Create service instance
      const serviceInstance = await Service.create({
        agencyId: user.data.agencyId,
        clientId: client.id,
        name: serviceConfig.name,
        description: serviceConfig.description,
        category: selectedTemplate.category,
        version: selectedTemplate.version,
        deliverables: selectedTemplate.deliverables || [],
        pricing: selectedTemplate.pricing,
        cycle_frequency: selectedTemplate.cycle_frequency,
        approval_policy: selectedTemplate.approval_policy,
        is_active: true,
        is_template: false, // This is an instance
        base_service_id: selectedTemplate.id,
        template_version_used: selectedTemplate.version,
        service_status: serviceConfig.service_status,
        start_date: serviceConfig.start_date,
        end_date: serviceConfig.end_date || null,
        contract_value: serviceConfig.contract_value || null,
        contract_terms: serviceConfig.contract_terms,
        customizations: serviceConfig.customizations,
        instance_metadata: {
          created_from_template: selectedTemplate.id,
          customizations_applied: [],
          client_specific_notes: '',
          account_manager: serviceConfig.team_assignments.consultor_lider,
          project_code: `${client.name.substring(0, 3).toUpperCase()}-${selectedTemplate.name.substring(0, 3).toUpperCase()}-${new Date().getFullYear()}`
        }
      });

      // Create project team assignments
      const teamAssignments = Object.entries(serviceConfig.team_assignments).filter(([role, userId]) => userId);
      
      for (const [role, userId] of teamAssignments) {
        if (Array.isArray(userId)) {
          // Handle multiple assignments (consultor_apoio)
          for (const id of userId) {
            await ProjectTeam.create({
              agencyId: user.data.agencyId,
              service_instance_id: serviceInstance.id,
              user_id: id,
              role: role,
              is_active: true,
              start_date: serviceConfig.start_date
            });
          }
        } else {
          await ProjectTeam.create({
            agencyId: user.data.agencyId,
            service_instance_id: serviceInstance.id,
            user_id: userId,
            role: role,
            is_active: true,
            start_date: serviceConfig.start_date
          });
        }
      }

      // Generate tasks from service deliverables
      try {
        await generateTasksFromService({
          serviceId: serviceInstance.id,
          autoAssign: true,
          startDate: serviceConfig.start_date
        });
      } catch (taskError) {
        console.warn('Erro ao gerar tarefas:', taskError);
        // Continue even if task generation fails
      }

      toast.success('Serviço criado com sucesso!');
      onSave && onSave(serviceInstance);
      onClose();

    } catch (error) {
      console.error('Erro ao criar serviço:', error);
      toast.error('Erro ao criar serviço');
    } finally {
      setCreating(false);
    }
  };

  const calculateTotalHours = (deliverables) => {
    if (!deliverables || deliverables.length === 0) return 0;
    return deliverables.reduce((total, d) => total + (d.estimated_hours || 0), 0);
  };

  const calculateTotalDuration = (deliverables) => {
    if (!deliverables || deliverables.length === 0) return 0;
    return deliverables.reduce((total, d) => total + (d.duration_days || 0), 0);
  };

  const renderSelectTemplate = () => (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Buscar templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Filtrar por categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Categorias</SelectItem>
            {CATEGORY_OPTIONS.map(cat => (
              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Templates List */}
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            <p className="text-gray-500">Carregando templates...</p>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-8">
            <LayoutTemplate className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="font-medium text-gray-900 mb-2">Nenhum template encontrado</h3>
            <p className="text-gray-500">Tente ajustar os filtros ou criar um novo template</p>
          </div>
        ) : (
          filteredTemplates.map(template => (
            <Card 
              key={template.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                selectedTemplate?.id === template.id 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedTemplate(template)}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900">{template.name}</h3>
                      <Badge variant="outline" className="text-xs">
                        v{template.version}
                      </Badge>
                      {selectedTemplate?.id === template.id && (
                        <CheckCircle className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        <span>{template.deliverables?.length || 0} fases</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{calculateTotalHours(template.deliverables)}h</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{calculateTotalDuration(template.deliverables)} dias</span>
                      </div>
                    </div>
                  </div>
                  
                  <Badge className="bg-blue-100 text-blue-800">
                    {CATEGORY_OPTIONS.find(c => c.value === template.category)?.label || template.category}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );

  const renderConfigureService = () => (
    <div className="space-y-6">
      {/* Template Info (Read-only) */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <LayoutTemplate className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">Template Selecionado</h3>
          </div>
          <div className="text-sm text-blue-800">
            <p><strong>{selectedTemplate?.name}</strong> v{selectedTemplate?.version}</p>
            <p>{selectedTemplate?.description}</p>
          </div>
        </CardContent>
      </Card>

      {/* Service Configuration */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="service-name">Nome do Serviço *</Label>
            <Input
              id="service-name"
              value={serviceConfig.name}
              onChange={(e) => setServiceConfig(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Nome do serviço para este cliente"
            />
          </div>

          <div>
            <Label htmlFor="service-status">Status</Label>
            <Select 
              value={serviceConfig.service_status} 
              onValueChange={(value) => setServiceConfig(prev => ({ ...prev, service_status: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_STATUS_OPTIONS.map(status => (
                  <SelectItem key={status.value} value={status.value}>
                    <div className="flex items-center gap-2">
                      <Badge className={status.color}>{status.label}</Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="service-description">Descrição</Label>
          <Textarea
            id="service-description"
            value={serviceConfig.description}
            onChange={(e) => setServiceConfig(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
            placeholder="Descrição específica para este cliente..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="start-date">Data de Início *</Label>
            <Input
              id="start-date"
              type="date"
              value={serviceConfig.start_date}
              onChange={(e) => setServiceConfig(prev => ({ ...prev, start_date: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="end-date">Data de Término (Prevista)</Label>
            <Input
              id="end-date"
              type="date"
              value={serviceConfig.end_date}
              onChange={(e) => setServiceConfig(prev => ({ ...prev, end_date: e.target.value }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="contract-value">Valor do Contrato (R$)</Label>
            <Input
              id="contract-value"
              type="number"
              min="0"
              value={serviceConfig.contract_value}
              onChange={(e) => setServiceConfig(prev => ({ ...prev, contract_value: parseFloat(e.target.value) || 0 }))}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label htmlFor="billing-cycle">Ciclo de Cobrança</Label>
            <Select 
              value={serviceConfig.billing_cycle} 
              onValueChange={(value) => setServiceConfig(prev => ({ ...prev, billing_cycle: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BILLING_CYCLE_OPTIONS.map(cycle => (
                  <SelectItem key={cycle.value} value={cycle.value}>{cycle.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Team Assignments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              Equipe do Projeto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="consultor-lider">Consultor Líder</Label>
                <Select 
                  value={serviceConfig.team_assignments.consultor_lider}
                  onValueChange={(value) => setServiceConfig(prev => ({
                    ...prev,
                    team_assignments: { ...prev.team_assignments, consultor_lider: value }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar líder" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.map(member => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.full_name || member.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="cliente-gestor">Gestor do Cliente</Label>
                <Select 
                  value={serviceConfig.team_assignments.cliente_gestor}
                  onValueChange={(value) => setServiceConfig(prev => ({
                    ...prev,
                    team_assignments: { ...prev.team_assignments, cliente_gestor: value }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar gestor" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.map(member => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.full_name || member.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderPreviewPhases = () => (
    <div className="space-y-6">
      {/* Template and Service Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <LayoutTemplate className="w-4 h-4 text-blue-600" />
              <h3 className="font-semibold text-blue-900">Template Base</h3>
            </div>
            <p className="text-sm text-blue-800">
              <strong>{selectedTemplate?.name}</strong> v{selectedTemplate?.version}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="w-4 h-4 text-green-600" />
              <h3 className="font-semibold text-green-900">Nova Instância</h3>
            </div>
            <p className="text-sm text-green-800">
              <strong>{serviceConfig.name}</strong>
            </p>
            <p className="text-xs text-green-700">
              Cliente: {client?.name}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Warning */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Importante:</strong> Esta instância será criada com base no template atual. 
          Mudanças futuras no template não afetarão automaticamente esta instância.
        </AlertDescription>
      </Alert>

      {/* Deliverables Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Fases e Entregáveis ({selectedTemplate?.deliverables?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedTemplate?.deliverables?.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Nenhuma fase configurada neste template</p>
            </div>
          ) : (
            <div className="space-y-4">
              {selectedTemplate?.deliverables?.map((deliverable, index) => (
                <div key={deliverable.id || index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Fase {deliverable.phase}</Badge>
                      <h4 className="font-semibold">{deliverable.name}</h4>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      <span>{deliverable.duration_days || 0} dias</span>
                      <span>•</span>
                      <span>{deliverable.estimated_hours || 0}h</span>
                    </div>
                  </div>
                  
                  {deliverable.description && (
                    <p className="text-sm text-gray-600 mb-2">{deliverable.description}</p>
                  )}
                  
                  {deliverable.requires_approval && (
                    <Badge className="bg-purple-100 text-purple-800 text-xs">
                      Requer Aprovação
                    </Badge>
                  )}
                  
                  {deliverable.tasks && deliverable.tasks.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-gray-500 mb-2">
                        {deliverable.tasks.length} tarefa(s) serão geradas:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {deliverable.tasks.slice(0, 3).map((task, taskIndex) => (
                          <Badge key={taskIndex} variant="outline" className="text-xs">
                            {task.title}
                          </Badge>
                        ))}
                        {deliverable.tasks.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{deliverable.tasks.length - 3} mais
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SLA Validation */}
      {selectedTemplate && (
        <ServiceSLAValidator
          service={selectedTemplate}
          deliverables={selectedTemplate.deliverables || []}
          showDetailed={true}
        />
      )}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <UserPlus className="w-5 h-5" />
            Adicionar Serviço ao Cliente
            {client && (
              <Badge variant="outline" className="ml-2">
                {client.name}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-6 px-6">
          {Object.values(WIZARD_STEPS).map(step => (
            <div
              key={step}
              className={`flex items-center ${step < Object.keys(WIZARD_STEPS).length ? 'flex-1' : ''}`}
            >
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                ${currentStep >= step 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-600'
                }
              `}>
                {step}
              </div>
              <div className="ml-2">
                <p className={`text-sm font-medium ${
                  currentStep >= step ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  {STEP_TITLES[step]}
                </p>
              </div>
              {step < Object.keys(WIZARD_STEPS).length && (
                <div className="flex-1 h-px bg-gray-200 mx-4" />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="overflow-y-auto max-h-96 px-6">
          {currentStep === WIZARD_STEPS.SELECT_TEMPLATE && renderSelectTemplate()}
          {currentStep === WIZARD_STEPS.CONFIGURE_SERVICE && renderConfigureService()}
          {currentStep === WIZARD_STEPS.PREVIEW_PHASES && renderPreviewPhases()}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between p-6 border-t">
          <Button
            variant="outline"
            onClick={handlePrevStep}
            disabled={currentStep === WIZARD_STEPS.SELECT_TEMPLATE}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Anterior
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>

            {currentStep < WIZARD_STEPS.PREVIEW_PHASES ? (
              <Button onClick={handleNextStep}>
                Próximo
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={handleCreateService} 
                disabled={creating}
                className="bg-green-600 hover:bg-green-700"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Criar Serviço
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}