/**
 * 📋 Wizard Simplificado para Criação de Templates
 * 
 * Wizard em 2 etapas: Informações Básicas + Deliverables
 */

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, 
  ArrowRight, 
  Plus, 
  Trash2, 
  Save,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useServiceTemplateValidation } from '@/hooks/useServiceTemplateValidation';
import { useErrorHandling } from '@/hooks/useErrorHandling';
import { useAgencyValidation } from '@/hooks/useAgencyValidation';
import { SERVICE_CATEGORIES, DEFAULT_SERVICE_CATEGORY } from '@/constants/serviceCategories';

// Tipos simplificados
interface TemplateData {
  name: string;
  description: string;
  category: string;
  cycle_frequency: string;
  deliverables: DeliverableData[];
  version: string;
}

interface DeliverableData {
  id: string;
  name: string;
  description: string;
  estimated_hours: number;
  duration_days: number;
  task_templates: TaskTemplateData[];
}

interface TaskTemplateData {
  id: string;
  title: string;
  description: string;
  type: string;
  priority: 'low' | 'medium' | 'high';
  estimated_hours: number;
  checklist: ChecklistItemData[];
}

interface ChecklistItemData {
  id: string;
  text: string;
  required: boolean;
  order: number;
  assignedRole?: string;
  relativeDueDays?: number;
}

const CATEGORIES = Object.entries(SERVICE_CATEGORIES).map(([value, label]) => ({ value, label }));

const CYCLE_FREQUENCIES = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'semiannual', label: 'Semestral' },
  { value: 'annual', label: 'Anual' },
  { value: 'one_time', label: 'Única vez' }
];

const TASK_TYPES = [
  { value: 'analise_documentos', label: 'Análise de Documentos' },
  { value: 'reuniao', label: 'Reunião' },
  { value: 'relatorio', label: 'Relatório' },
  { value: 'apresentacao', label: 'Apresentação' },
  { value: 'desenvolvimento', label: 'Desenvolvimento' },
  { value: 'design', label: 'Design' }
];

interface SimplifiedTemplateWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplateCreated?: (template: any) => void;
  editingTemplate?: any;
}

export default function SimplifiedTemplateWizard({
  isOpen,
  onClose,
  onTemplateCreated,
  editingTemplate
}: SimplifiedTemplateWizardProps) {
  const { user } = useSession();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [templateData, setTemplateData] = useState<TemplateData>({
    name: editingTemplate?.name || '',
    description: editingTemplate?.description || '',
    category: editingTemplate?.category || DEFAULT_SERVICE_CATEGORY,
    cycle_frequency: editingTemplate?.cycle_frequency || 'monthly',
    deliverables: editingTemplate?.deliverables || [],
    version: editingTemplate?.version || '1.0'
  });

  const STEPS = [
    { title: 'Informações Básicas', description: 'Nome, descrição e configurações do template' },
    { title: 'Deliverables', description: 'Defina os entregáveis e suas tarefas' }
  ];

  // Hooks centralizados
  const {
    validateForm,
    validateStep: validateStepCentralized,
    sanitizeData,
    handleSpecificError,
    showValidationErrors
  } = useServiceTemplateValidation();

  const { handleError } = useErrorHandling();
  const { validateAgencyWithFeedback, getValidAgencyId } = useAgencyValidation();

  // Validação por etapa
  const validateStep = useCallback((step: number): boolean => {
    return validateStepCentralized(step, templateData);
  }, [templateData, validateStepCentralized]);

  // Adicionar deliverable
  const addDeliverable = useCallback(() => {
    const newDeliverable: DeliverableData = {
      id: `deliverable_${Date.now()}`,
      name: '',
      description: '',
      estimated_hours: 8,
      duration_days: 1,
      task_templates: []
    };

    setTemplateData(prev => ({
      ...prev,
      deliverables: [...prev.deliverables, newDeliverable]
    }));
  }, []);

  // Remover deliverable
  const removeDeliverable = useCallback((deliverableId: string) => {
    setTemplateData(prev => ({
      ...prev,
      deliverables: prev.deliverables.filter(d => d.id !== deliverableId)
    }));
  }, []);

  // Atualizar deliverable
  const updateDeliverable = useCallback((deliverableId: string, updates: Partial<DeliverableData>) => {
    setTemplateData(prev => ({
      ...prev,
      deliverables: prev.deliverables.map(d => 
        d.id === deliverableId ? { ...d, ...updates } : d
      )
    }));
  }, []);

  // Adicionar template de tarefa
  const addTaskTemplate = useCallback((deliverableId: string) => {
    const newTaskTemplate: TaskTemplateData = {
      id: `task_${Date.now()}`,
      title: '',
      description: '',
      type: 'analise_documentos',
      priority: 'medium',
      estimated_hours: 4,
      checklist: []
    };

    updateDeliverable(deliverableId, {
      task_templates: [...templateData.deliverables.find(d => d.id === deliverableId)?.task_templates || [], newTaskTemplate]
    });
  }, [templateData.deliverables, updateDeliverable]);

  // Remover template de tarefa
  const removeTaskTemplate = useCallback((deliverableId: string, taskTemplateId: string) => {
    updateDeliverable(deliverableId, {
      task_templates: templateData.deliverables
        .find(d => d.id === deliverableId)
        ?.task_templates.filter(t => t.id !== taskTemplateId) || []
    });
  }, [templateData.deliverables, updateDeliverable]);

  // Atualizar template de tarefa
  const updateTaskTemplate = useCallback((deliverableId: string, taskTemplateId: string, updates: Partial<TaskTemplateData>) => {
    updateDeliverable(deliverableId, {
      task_templates: templateData.deliverables
        .find(d => d.id === deliverableId)
        ?.task_templates.map(t => 
          t.id === taskTemplateId ? { ...t, ...updates } : t
        ) || []
    });
  }, [templateData.deliverables, updateDeliverable]);

  // Adicionar item de checklist
  const addChecklistItem = useCallback((deliverableId: string, taskTemplateId: string) => {
    const newItem: ChecklistItemData = {
      id: `checklist_${Date.now()}`,
      text: '',
      required: true,
      order: 0,
      assignedRole: '',
      relativeDueDays: 1
    };

    const deliverable = templateData.deliverables.find(d => d.id === deliverableId);
    const taskTemplate = deliverable?.task_templates.find(t => t.id === taskTemplateId);
    
    if (taskTemplate) {
      updateTaskTemplate(deliverableId, taskTemplateId, {
        checklist: [...taskTemplate.checklist, newItem]
      });
    }
  }, [templateData.deliverables, updateTaskTemplate]);

  // Remover item de checklist
  const removeChecklistItem = useCallback((deliverableId: string, taskTemplateId: string, itemId: string) => {
    const deliverable = templateData.deliverables.find(d => d.id === deliverableId);
    const taskTemplate = deliverable?.task_templates.find(t => t.id === taskTemplateId);
    
    if (taskTemplate) {
      updateTaskTemplate(deliverableId, taskTemplateId, {
        checklist: taskTemplate.checklist.filter(item => item.id !== itemId)
      });
    }
  }, [templateData.deliverables, updateTaskTemplate]);

  // Atualizar item de checklist
  const updateChecklistItem = useCallback((deliverableId: string, taskTemplateId: string, itemId: string, updates: Partial<ChecklistItemData>) => {
    const deliverable = templateData.deliverables.find(d => d.id === deliverableId);
    const taskTemplate = deliverable?.task_templates.find(t => t.id === taskTemplateId);
    
    if (taskTemplate) {
      updateTaskTemplate(deliverableId, taskTemplateId, {
        checklist: taskTemplate.checklist.map(item => 
          item.id === itemId ? { ...item, ...updates } : item
        )
      });
    }
  }, [templateData.deliverables, updateTaskTemplate]);

  // Salvar template
  const handleSave = useCallback(async () => {
    // Sanitizar dados antes de validar
    const sanitizedData = sanitizeData(templateData);
    
    // Validar formulário completo
    const validationResult = validateForm(sanitizedData);
    
    if (!validationResult.isValid) {
      showValidationErrors(validationResult);
      return;
    }

    if (!user?.data?.agencyId) {
      setError('Usuário não tem agência associada');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Verificar agência antes de salvar
      if (!validateAgencyWithFeedback()) {
        setLoading(false);
        return;
      }

      const serviceData = {
        agencyId: getValidAgencyId(),
        ...sanitizedData,
        is_template: true,
        is_active: true,
        template_metadata: {
          created_by: user.email,
          created_at: new Date().toISOString(),
          version: sanitizedData.version
        }
      };

      let savedTemplate;
      if (editingTemplate) {
        savedTemplate = await Service.update(editingTemplate.id, serviceData);
        toast.success('Template atualizado com sucesso!');
      } else {
        savedTemplate = await Service.create(serviceData);
        toast.success('Template criado com sucesso!');
      }

      onTemplateCreated?.(savedTemplate);
      onClose();
    } catch (error: any) {
      console.error('Erro ao salvar template:', error);
      
      // Usar tratamento específico de erro
      const errorMessage = handleSpecificError(error);
      handleError(error, {
        action: 'save_template',
        userId: user?.email,
        templateData: sanitizedData
      });
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [templateData, user, validateForm, sanitizeData, showValidationErrors, handleSpecificError, handleError, editingTemplate, onTemplateCreated, onClose]);

  // Renderizar etapa atual
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nome do Template *</Label>
                <Input
                  id="name"
                  value={templateData.name}
                  onChange={(e) => setTemplateData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Marketing Digital Completo"
                />
              </div>
              <div>
                <Label htmlFor="category">Categoria *</Label>
                <Select
                  value={templateData.category}
                  onValueChange={(value) => setTemplateData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(category => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Descrição *</Label>
              <Textarea
                id="description"
                value={templateData.description}
                onChange={(e) => setTemplateData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descreva o que este template oferece..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cycle_frequency">Frequência do Ciclo</Label>
                <Select
                  value={templateData.cycle_frequency}
                  onValueChange={(value) => setTemplateData(prev => ({ ...prev, cycle_frequency: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a frequência" />
                  </SelectTrigger>
                  <SelectContent>
                    {CYCLE_FREQUENCIES.map(freq => (
                      <SelectItem key={freq.value} value={freq.value}>
                        {freq.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="version">Versão</Label>
                <Input
                  id="version"
                  value={templateData.version}
                  onChange={(e) => setTemplateData(prev => ({ ...prev, version: e.target.value }))}
                  placeholder="1.0"
                />
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Deliverables</h3>
              <Button onClick={addDeliverable} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Deliverable
              </Button>
            </div>

            {templateData.deliverables.map((deliverable, index) => (
              <Card key={deliverable.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      Deliverable {index + 1}
                    </CardTitle>
                    <Button
                      onClick={() => removeDeliverable(deliverable.id)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Nome do Deliverable *</Label>
                      <Input
                        value={deliverable.name}
                        onChange={(e) => updateDeliverable(deliverable.id, { name: e.target.value })}
                        placeholder="Ex: Relatório de Diagnóstico"
                      />
                    </div>
                    <div>
                      <Label>Horas Estimadas</Label>
                      <Input
                        type="number"
                        value={deliverable.estimated_hours}
                        onChange={(e) => updateDeliverable(deliverable.id, { estimated_hours: parseInt(e.target.value) || 0 })}
                        min="0"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Descrição</Label>
                    <Textarea
                      value={deliverable.description}
                      onChange={(e) => updateDeliverable(deliverable.id, { description: e.target.value })}
                      placeholder="Descreva o que será entregue..."
                      rows={2}
                    />
                  </div>

                  {/* Templates de Tarefas */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Templates de Tarefas</Label>
                      <Button
                        onClick={() => addTaskTemplate(deliverable.id)}
                        size="sm"
                        variant="outline"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Adicionar Tarefa
                      </Button>
                    </div>

                    {deliverable.task_templates.map((taskTemplate, taskIndex) => (
                      <div key={taskTemplate.id} className="border rounded-lg p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">Tarefa {taskIndex + 1}</Badge>
                          <Button
                            onClick={() => removeTaskTemplate(deliverable.id, taskTemplate.id)}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Título da Tarefa *</Label>
                            <Input
                              value={taskTemplate.title}
                              onChange={(e) => updateTaskTemplate(deliverable.id, taskTemplate.id, { title: e.target.value })}
                              placeholder="Ex: Análise de Documentos"
                              size="sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Tipo</Label>
                            <Select
                              value={taskTemplate.type}
                              onValueChange={(value) => updateTaskTemplate(deliverable.id, taskTemplate.id, { type: value })}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {TASK_TYPES.map(type => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div>
                          <Label className="text-xs">Descrição</Label>
                          <Textarea
                            value={taskTemplate.description}
                            onChange={(e) => updateTaskTemplate(deliverable.id, taskTemplate.id, { description: e.target.value })}
                            placeholder="Descreva a tarefa..."
                            rows={2}
                            className="text-sm"
                          />
                        </div>

                        {/* Checklist simplificado */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Checklist</Label>
                            <Button
                              onClick={() => addChecklistItem(deliverable.id, taskTemplate.id)}
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Item
                            </Button>
                          </div>

                          {taskTemplate.checklist.map((item, itemIndex) => (
                            <div key={item.id} className="flex items-center gap-2">
                              <Input
                                value={item.text}
                                onChange={(e) => updateChecklistItem(deliverable.id, taskTemplate.id, item.id, { text: e.target.value })}
                                placeholder={`Item ${itemIndex + 1} do checklist`}
                                className="h-7 text-xs"
                              />
                              <Button
                                onClick={() => removeChecklistItem(deliverable.id, taskTemplate.id, item.id)}
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-red-600"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}

            {templateData.deliverables.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Nenhum deliverable adicionado</p>
                <p className="text-sm">Adicione pelo menos um deliverable para continuar</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  const progress = ((currentStep + 1) / STEPS.length) * 100;
  const canProceed = validateStep(currentStep);
  const canGoBack = currentStep > 0;
  const isLastStep = currentStep === STEPS.length - 1;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">
                {editingTemplate ? 'Editar Template' : 'Novo Template'}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {STEPS[currentStep].title} - {STEPS[currentStep].description}
              </p>
            </div>
            <Button onClick={onClose} variant="ghost" size="sm">
              ✕
            </Button>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Etapa {currentStep + 1} de {STEPS.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>

        <CardContent className="overflow-y-auto max-h-[60vh]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {renderCurrentStep()}
        </CardContent>

        <div className="flex items-center justify-between p-6 border-t">
          <div className="flex items-center gap-2">
            {canGoBack && (
              <Button
                onClick={() => setCurrentStep(prev => prev - 1)}
                variant="outline"
                disabled={loading}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Anterior
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isLastStep ? (
              <Button
                onClick={handleSave}
                disabled={!canProceed || loading}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? (
                  <div className="w-4 h-4 mr-2 animate-spin border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {editingTemplate ? 'Atualizar Template' : 'Criar Template'}
              </Button>
            ) : (
              <Button
                onClick={() => setCurrentStep(prev => prev + 1)}
                disabled={!canProceed || loading}
              >
                Próximo
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
