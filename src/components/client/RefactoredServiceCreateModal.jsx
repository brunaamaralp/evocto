/**
 * 🔧 ServiceCreateModal Refatorado
 * 
 * Usa o novo hook useServiceInstanceCreation para criação robusta de instâncias
 */

import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { Service } from '@/api/entities';
import { User } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  LayoutTemplate, Loader2, Info, Lock
} from 'lucide-react';
import { toast } from 'sonner';
import { useServiceInstanceCreation } from '@/hooks/useServiceInstanceCreation';
import { useServiceFormValidation } from '@/hooks/useServiceFormValidation';
import { useExitConfirmation, ExitConfirmationModal } from '@/hooks/useExitConfirmation';
import { ServiceCreationProgress, ServiceCreationSummary } from '@/components/services/ServiceCreationFeedback';
import BriefingValidation from '@/components/briefing/BriefingValidation';
import { SERVICE_CATEGORIES, getCategoryLabel } from '@/constants/serviceCategories';

const CATEGORY_OPTIONS = Object.entries(SERVICE_CATEGORIES).map(([value, label]) => ({ value, label }));

const WIZARD_STEPS = {
  SELECT_TEMPLATE: 1,
  CONFIGURE_SERVICE: 2,
  PREVIEW_PHASES: 3,
  BRIEFING_REQUIREMENT: 4
};

const STEP_TITLES = {
  [WIZARD_STEPS.SELECT_TEMPLATE]: 'Selecionar Template',
  [WIZARD_STEPS.CONFIGURE_SERVICE]: 'Configurar Serviço',
  [WIZARD_STEPS.PREVIEW_PHASES]: 'Preview e Confirmação',
  [WIZARD_STEPS.BRIEFING_REQUIREMENT]: 'Briefing Obrigatório'
};

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

export default function RefactoredServiceCreateModal({ 
  isOpen, 
  onClose, 
  client, 
  onSave 
}) {
  const { user } = useSession();
  
  // Hooks centralizados
  const {
    createServiceInstanceWithFeedback,
    validateInstanceData,
    isCreating,
    error: creationError,
    warnings: creationWarnings
  } = useServiceInstanceCreation();

  const {
    fieldErrors,
    validateForm,
    validateFieldRealTime,
    canProceed,
    clearAllErrors,
    showValidationErrors
  } = useServiceFormValidation();

  // Detectar alterações não salvas
  const hasUnsavedChanges = currentStep > WIZARD_STEPS.SELECT_TEMPLATE && 
    (serviceConfig.name || serviceConfig.description || serviceConfig.start_date);

  const {
    isConfirming,
    handleExitAttempt,
    confirmExit,
    cancelExit
  } = useExitConfirmation(hasUnsavedChanges);
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState(WIZARD_STEPS.SELECT_TEMPLATE);
  const [loading, setLoading] = useState(false);
  const [createdServiceId, setCreatedServiceId] = useState(null);

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

  // Carregar templates
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
      handleError(error, { action: 'load_templates' });
    } finally {
      setLoading(false);
    }
  }, [user?.data?.agencyId, handleError]);

  // Carregar membros da equipe
  const loadTeamMembers = React.useCallback(async () => {
    if (!user?.data?.agencyId) return;

    try {
      const membersData = await User.filter({
        agencyId: user.data.agencyId
      }, '-created_date');

      setTeamMembers(membersData || []);
    } catch (error) {
      handleError(error, { action: 'load_team_members' });
    }
  }, [user?.data?.agencyId, handleError]);

  // Efeitos
  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      loadTeamMembers();
    }
  }, [isOpen, loadTemplates, loadTeamMembers]);

  // Filtrar templates
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Validar etapa atual
  const canProceedToNextStep = () => {
    switch (currentStep) {
      case WIZARD_STEPS.SELECT_TEMPLATE:
        return selectedTemplate !== null;
      case WIZARD_STEPS.CONFIGURE_SERVICE:
        return serviceConfig.name.trim() && 
               serviceConfig.description.trim() && 
               serviceConfig.start_date;
      case WIZARD_STEPS.PREVIEW_PHASES:
        return true;
      default:
        return false;
    }
  };

  // Criar instância de serviço usando o novo hook
  const handleCreateService = async () => {
    if (!selectedTemplate || !client) {
      toast.error('Dados insuficientes para criar o serviço');
      return;
    }

    // Validar formulário antes de criar
    const formData = {
      name: serviceConfig.name,
      description: serviceConfig.description,
      startDate: serviceConfig.start_date,
      endDate: serviceConfig.end_date,
      contractValue: serviceConfig.contract_value,
      contractTerms: serviceConfig.contract_terms,
      teamAssignments: serviceConfig.team_assignments
    };

    const validationResult = validateForm(formData);
    if (!validationResult.isValid) {
      showValidationErrors(validationResult);
      return;
    }

    const instanceData = {
      templateId: selectedTemplate.id,
      clientId: client.id,
      name: serviceConfig.name,
      description: serviceConfig.description,
      startDate: serviceConfig.start_date,
      endDate: serviceConfig.end_date,
      contractValue: serviceConfig.contract_value,
      contractTerms: serviceConfig.contract_terms,
      customizations: serviceConfig.customizations,
      teamAssignments: serviceConfig.team_assignments
    };

    const result = await createServiceInstanceWithFeedback(instanceData);

    if (result.success) {
      setCreatedServiceId(result.serviceId);
      setCurrentStep(WIZARD_STEPS.BRIEFING_REQUIREMENT);
      toast.success('Serviço criado com sucesso! Briefing obrigatório será criado automaticamente.');
    }
  };

  // Renderizar seleção de template
  const renderSelectTemplate = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {CATEGORY_OPTIONS.map(category => (
              <SelectItem key={category.value} value={category.value}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
        {filteredTemplates.map(template => (
          <Card 
            key={template.id} 
            className={`cursor-pointer transition-all ${
              selectedTemplate?.id === template.id 
                ? 'ring-2 ring-blue-500 bg-blue-50' 
                : 'hover:shadow-md'
            }`}
            onClick={() => setSelectedTemplate(template)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{template.name}</CardTitle>
                {selectedTemplate?.id === template.id && (
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                )}
              </div>
              <Badge variant="outline">
                {getCategoryLabel(template.category)}
              </Badge>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-3">{template.description}</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="w-4 h-4" />
                  <span>{template.cycle_frequency || 'Não definido'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Target className="w-4 h-4" />
                  <span>{template.deliverables?.length || 0} entregáveis</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>Nenhum template encontrado</p>
          <p className="text-sm">Tente ajustar os filtros de busca</p>
        </div>
      )}
    </div>
  );

  // Renderizar configuração do serviço
  const renderConfigureService = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="service_name">Nome do Serviço *</Label>
          <Input
            id="service_name"
            value={serviceConfig.name}
            onChange={(e) => setServiceConfig(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Ex: Marketing Digital Q1 2024"
          />
        </div>
        <div>
          <Label htmlFor="service_status">Status</Label>
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
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="service_description">Descrição *</Label>
        <Textarea
          id="service_description"
          value={serviceConfig.description}
          onChange={(e) => setServiceConfig(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Descreva os objetivos e escopo do serviço..."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="start_date">Data de Início *</Label>
          <Input
            id="start_date"
            type="date"
            value={serviceConfig.start_date}
            onChange={(e) => setServiceConfig(prev => ({ ...prev, start_date: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="end_date">Data de Fim</Label>
          <Input
            id="end_date"
            type="date"
            value={serviceConfig.end_date}
            onChange={(e) => setServiceConfig(prev => ({ ...prev, end_date: e.target.value }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="contract_value">Valor do Contrato</Label>
          <Input
            id="contract_value"
            type="number"
            value={serviceConfig.contract_value}
            onChange={(e) => setServiceConfig(prev => ({ ...prev, contract_value: parseFloat(e.target.value) || 0 }))}
            placeholder="0.00"
          />
        </div>
        <div>
          <Label htmlFor="billing_cycle">Ciclo de Cobrança</Label>
          <Select
            value={serviceConfig.billing_cycle}
            onValueChange={(value) => setServiceConfig(prev => ({ ...prev, billing_cycle: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BILLING_CYCLE_OPTIONS.map(cycle => (
                <SelectItem key={cycle.value} value={cycle.value}>
                  {cycle.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Configuração da equipe */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Users className="w-5 h-5" />
          Configuração da Equipe
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="consultor_lider">Consultor Líder</Label>
            <Select
              value={serviceConfig.team_assignments.consultor_lider}
              onValueChange={(value) => setServiceConfig(prev => ({
                ...prev,
                team_assignments: { ...prev.team_assignments, consultor_lider: value }
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar consultor líder" />
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
            <Label htmlFor="cliente_gestor">Gestor do Cliente</Label>
            <Input
              id="cliente_gestor"
              value={serviceConfig.team_assignments.cliente_gestor}
              onChange={(e) => setServiceConfig(prev => ({
                ...prev,
                team_assignments: { ...prev.team_assignments, cliente_gestor: e.target.value }
              }))}
              placeholder="Nome do gestor do cliente"
            />
          </div>
        </div>
      </div>
    </div>
  );

  // Renderizar preview
  const renderPreviewPhases = () => (
    <div className="space-y-6">
      <Alert>
        <Info className="w-4 h-4" />
        <AlertDescription>
          Revise as configurações antes de criar o serviço. As tarefas serão geradas automaticamente.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informações do Serviço</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-sm font-medium text-gray-500">Nome</Label>
              <p>{serviceConfig.name}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">Descrição</Label>
              <p className="text-sm">{serviceConfig.description}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">Período</Label>
              <p>{serviceConfig.start_date} {serviceConfig.end_date && `- ${serviceConfig.end_date}`}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">Valor</Label>
              <p>R$ {serviceConfig.contract_value.toLocaleString('pt-BR')}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Template Selecionado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-sm font-medium text-gray-500">Nome</Label>
              <p>{selectedTemplate?.name}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">Categoria</Label>
              <p>{getCategoryLabel(selectedTemplate?.category)}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">Entregáveis</Label>
              <p>{selectedTemplate?.deliverables?.length || 0} entregáveis</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">Frequência</Label>
              <p>{selectedTemplate?.cycle_frequency}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {creationWarnings.length > 0 && (
        <Alert>
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium">Atenção:</p>
              {creationWarnings.map((warning, index) => (
                <p key={index} className="text-sm">• {warning}</p>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );

  // Renderizar briefing obrigatório
  const renderBriefingRequirement = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Lock className="w-16 h-16 text-blue-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">Briefing Obrigatório</h3>
        <p className="text-gray-600 mb-6">
          O briefing estratégico é obrigatório antes de ativar o serviço
        </p>
      </div>

      {createdServiceId && (
        <BriefingValidation 
          serviceId={createdServiceId}
          clientId={client.id}
          onBriefingComplete={() => {
            toast.success('Briefing concluído! Serviço pode ser ativado.');
            onSave && onSave({ id: createdServiceId });
            onClose();
          }}
          showDetails={true}
        />
      )}

      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Importante:</strong> O briefing é a primeira tarefa obrigatória do projeto. 
          Ele deve ser completado antes que outras tarefas possam ser executadas.
        </AlertDescription>
      </Alert>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep(WIZARD_STEPS.PREVIEW_PHASES)}>
          Voltar
        </Button>
        <Button onClick={() => {
          onSave && onSave({ id: createdServiceId });
          onClose();
        }}>
          <CheckCircle className="w-4 h-4 mr-2" />
          Continuar para Serviço
        </Button>
      </div>
    </div>
  );

  // Renderizar conteúdo da etapa atual
  const renderStepContent = () => {
    switch (currentStep) {
      case WIZARD_STEPS.SELECT_TEMPLATE:
        return renderSelectTemplate();
      case WIZARD_STEPS.CONFIGURE_SERVICE:
        return renderConfigureService();
      case WIZARD_STEPS.PREVIEW_PHASES:
        return renderPreviewPhases();
      case WIZARD_STEPS.BRIEFING_REQUIREMENT:
        return renderBriefingRequirement();
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  const progress = ((currentStep - WIZARD_STEPS.SELECT_TEMPLATE + 1) / Object.keys(WIZARD_STEPS).length) * 100;
  const canProceed = canProceedToNextStep();
  const canGoBack = currentStep > WIZARD_STEPS.SELECT_TEMPLATE;
  const isLastStep = currentStep === WIZARD_STEPS.BRIEFING_REQUIREMENT;

  return (
    <Dialog open={isOpen} onOpenChange={handleExitAttempt}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-blue-600" />
            Criar Instância de Serviço
            <Badge variant="outline" className="text-xs">
              {client?.name}
            </Badge>
          </DialogTitle>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>{STEP_TITLES[currentStep]}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[60vh] pr-2">
          {creationError && (
            <Alert className="mb-4">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>{creationError}</AlertDescription>
            </Alert>
          )}

          {creationWarnings && creationWarnings.length > 0 && (
            <Alert className="mb-4 border-yellow-200 bg-yellow-50">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <AlertDescription>
                <strong>Atenção:</strong> {creationWarnings.join('; ')}
              </AlertDescription>
            </Alert>
          )}

          {renderStepContent()}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            {canGoBack && (
              <Button
                onClick={() => setCurrentStep(prev => prev - 1)}
                variant="outline"
                disabled={isCreating}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Anterior
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isLastStep ? (
              <Button
                onClick={handleCreateService}
                disabled={!canProceed || isCreating}
                className="bg-green-600 hover:bg-green-700"
              >
                {isCreating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                {isCreating ? 'Criando...' : 'Criar Serviço'}
              </Button>
            ) : (
              <Button
                onClick={() => setCurrentStep(prev => prev + 1)}
                disabled={!canProceed || isCreating}
              >
                Próximo
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
      
      {/* Modal de confirmação de saída */}
      <ExitConfirmationModal
        isOpen={isConfirming}
        message="Você tem alterações não salvas. Deseja realmente sair?"
        onConfirm={confirmExit}
        onCancel={cancelExit}
      />
    </Dialog>
  );
}
