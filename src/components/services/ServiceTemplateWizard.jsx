import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  Plus, 
  Trash2,
  FileText,
  BarChart3,
  Settings,
  Target,
  Loader2
} from 'lucide-react';
import { Service } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';
import { SERVICE_CATEGORIES, DEFAULT_SERVICE_CATEGORY } from '@/constants/serviceCategories';

const WIZARD_STEPS = [
  { id: 'basic', title: 'Informações Básicas', icon: FileText },
  { id: 'deliverables', title: 'Entregáveis & Etapas', icon: Target },
  { id: 'kpis', title: 'KPIs Padrão', icon: BarChart3 },
  { id: 'settings', title: 'Configurações', icon: Settings },
];

const KPI_CATEGORIES = {
  performance: 'Performance',
  demanda: 'Demanda',
  marca: 'Marca',
  operacao: 'Operação',
  engajamento: 'Engajamento',
  crescimento: 'Crescimento',
};

const TASK_TYPES = {
  analise_documentos: 'Análise de Documentos',
  coleta_dados: 'Coleta de Dados',
  analise_dados: 'Análise de Dados',
  analise_financeira: 'Análise Financeira',
  relatorio_financeiro: 'Relatório de Performance',
  reuniao_alinhamento: 'Reunião de Alinhamento',
  planejamento_estrategico: 'Planejamento Estratégico',
  implementacao: 'Implementação',
  treinamento: 'Treinamento',
  administrativo: 'Administrativo',
  auditoria: 'Auditoria',
  consultoria: 'Consultoria'
};

export default function ServiceTemplateWizard({ isOpen, onClose, onTemplateCreated, editingTemplate = null }) {
  const { user, agencyId } = useSession();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Estado do template sendo criado/editado
  const [templateData, setTemplateData] = useState(() => ({
    // Básico
    name: editingTemplate?.name || '',
    description: editingTemplate?.description || '',
    category: editingTemplate?.category || DEFAULT_SERVICE_CATEGORY,
    
    // Pricing
    pricing: editingTemplate?.pricing || {
      type: 'fixed',
      base_price: 5000,
      currency: 'BRL',
      billing_cycle: 'one_time'
    },
    
    // Deliverables
    deliverables: editingTemplate?.deliverables || [],
    
    // KPIs
    default_kpis: editingTemplate?.default_kpis || [],
    
    // Settings
    cycle_frequency: editingTemplate?.cycle_frequency || 'monthly',
    approval_policy: editingTemplate?.approval_policy || 'manual_approve',
    template_category: editingTemplate?.template_category || 'standard'
  }));

  const updateTemplateData = useCallback((updates) => {
    setTemplateData(prev => ({ ...prev, ...updates }));
  }, []);

  const canProceedToNextStep = useCallback(() => {
    switch (currentStep) {
      case 0: // Basic Info
        return templateData.name.trim() && templateData.description.trim();
      case 1: // Deliverables
        return templateData.deliverables.length > 0;
      case 2: // KPIs
        return true; // KPIs são opcionais
      case 3: // Settings
        return true; // Já tem defaults
      default:
        return false;
    }
  }, [currentStep, templateData]);

  const handleSave = async () => {
    if (!canProceedToNextStep()) {
      setError('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const serviceData = {
        agencyId,
        ...templateData,
        is_template: true,
        is_active: true,
        version: editingTemplate?.version || '1.0'
      };

      let savedService;
      if (editingTemplate) {
        savedService = await Service.update(editingTemplate.id, serviceData);
      } else {
        savedService = await Service.create(serviceData);
      }

      onTemplateCreated && onTemplateCreated(savedService);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar template:', error);
      setError(`Erro ao salvar template: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return <BasicInfoStep 
          data={templateData} 
          onChange={updateTemplateData}
        />;
      case 1:
        return <DeliverablesStep 
          data={templateData} 
          onChange={updateTemplateData}
        />;
      case 2:
        return <KPIsStep 
          data={templateData} 
          onChange={updateTemplateData}
        />;
      case 3:
        return <SettingsStep 
          data={templateData} 
          onChange={updateTemplateData}
        />;
      default:
        return null;
    }
  };

  const progress = ((currentStep + 1) / WIZARD_STEPS.length) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {editingTemplate ? 'Editar Template' : 'Criar Novo Template'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress & Steps */}
          <div className="space-y-4">
            <Progress value={progress} className="w-full" />
            <div className="flex justify-between">
              {WIZARD_STEPS.map((step, index) => {
                const Icon = step.icon;
                const isActive = index === currentStep;
                const isCompleted = index < currentStep;
                
                return (
                  <div
                    key={step.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : isCompleted
                        ? 'bg-green-50 text-green-700'
                        : 'text-gray-500'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                    <span className="text-sm font-medium">{step.title}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Step Content */}
          <div className="min-h-[400px]">
            {renderStepContent()}
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>

            <div className="flex gap-2">
              {currentStep < WIZARD_STEPS.length - 1 ? (
                <Button
                  onClick={() => setCurrentStep(prev => prev + 1)}
                  disabled={!canProceedToNextStep()}
                >
                  Próximo
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSave}
                  disabled={loading || !canProceedToNextStep()}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  {editingTemplate ? 'Salvar Alterações' : 'Criar Template'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Step Components
function BasicInfoStep({ data, onChange }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="name">Nome do Template *</Label>
          <Input
            id="name"
            value={data.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Ex: Diagnóstico de Comunicação e Marca"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Categoria *</Label>
          <Select 
            value={data.category} 
            onValueChange={(value) => onChange({ category: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SERVICE_CATEGORIES).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição *</Label>
        <Textarea
          id="description"
          value={data.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Descreva o objetivo e escopo deste template de serviço..."
          rows={4}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Precificação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select 
                value={data.pricing.type} 
                onValueChange={(value) => onChange({ 
                  pricing: { ...data.pricing, type: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Preço Fixo</SelectItem>
                  <SelectItem value="hourly">Por Hora</SelectItem>
                  <SelectItem value="retainer">Retainer Mensal</SelectItem>
                  <SelectItem value="success_fee">Taxa de Sucesso</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Valor Base (R$)</Label>
              <Input
                type="number"
                value={data.pricing.base_price}
                onChange={(e) => onChange({ 
                  pricing: { ...data.pricing, base_price: Number(e.target.value) }
                })}
              />
            </div>

            <div className="space-y-2">
              <Label>Ciclo de Cobrança</Label>
              <Select 
                value={data.pricing.billing_cycle} 
                onValueChange={(value) => onChange({ 
                  pricing: { ...data.pricing, billing_cycle: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_time">Uma vez</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="quarterly">Trimestral</SelectItem>
                  <SelectItem value="yearly">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DeliverablesStep({ data, onChange }) {
  const addDeliverable = () => {
    const newDeliverable = {
      id: `deliverable_${Date.now()}`,
      name: '',
      description: '',
      phase: (data.deliverables.length || 0) + 1,
      duration_days: 7,
      category: 'analise_financeira',
      estimated_hours: 8,
      priority: 'medium',
      tasks: []
    };

    onChange({ 
      deliverables: [...data.deliverables, newDeliverable] 
    });
  };

  const updateDeliverable = (index, updates) => {
    const updatedDeliverables = [...data.deliverables];
    updatedDeliverables[index] = { ...updatedDeliverables[index], ...updates };
    onChange({ deliverables: updatedDeliverables });
  };

  const removeDeliverable = (index) => {
    const updatedDeliverables = data.deliverables.filter((_, i) => i !== index);
    onChange({ deliverables: updatedDeliverables });
  };

  const addTaskToDeliverable = (deliverableIndex) => {
    const newTask = {
      id: `task_${Date.now()}`,
      title: '',
      description: '',
      estimated_hours: 2,
      type: 'analise_documentos',
      priority: 'medium'
    };

    const updatedDeliverables = [...data.deliverables];
    updatedDeliverables[deliverableIndex].tasks = [
      ...(updatedDeliverables[deliverableIndex].tasks || []),
      newTask
    ];
    onChange({ deliverables: updatedDeliverables });
  };

  const updateTask = (deliverableIndex, taskIndex, updates) => {
    const updatedDeliverables = [...data.deliverables];
    updatedDeliverables[deliverableIndex].tasks[taskIndex] = {
      ...updatedDeliverables[deliverableIndex].tasks[taskIndex],
      ...updates
    };
    onChange({ deliverables: updatedDeliverables });
  };

  const removeTask = (deliverableIndex, taskIndex) => {
    const updatedDeliverables = [...data.deliverables];
    updatedDeliverables[deliverableIndex].tasks = 
      updatedDeliverables[deliverableIndex].tasks.filter((_, i) => i !== taskIndex);
    onChange({ deliverables: updatedDeliverables });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Entregáveis do Template</h3>
        <Button onClick={addDeliverable} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Entregável
        </Button>
      </div>

      <div className="space-y-4">
        {data.deliverables.map((deliverable, index) => (
          <Card key={deliverable.id}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Fase {deliverable.phase}</Badge>
                  <CardTitle className="text-base">{deliverable.name || 'Novo Entregável'}</CardTitle>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => removeDeliverable(index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Entregável</Label>
                  <Input
                    value={deliverable.name}
                    onChange={(e) => updateDeliverable(index, { name: e.target.value })}
                    placeholder="Ex: Análise de Demonstrações Financeiras"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duração (dias)</Label>
                  <Input
                    type="number"
                    value={deliverable.duration_days}
                    onChange={(e) => updateDeliverable(index, { duration_days: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={deliverable.description}
                  onChange={(e) => updateDeliverable(index, { description: e.target.value })}
                  placeholder="Descreva o que será entregue nesta fase..."
                  rows={2}
                />
              </div>

              {/* Tasks do Entregável */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-3">
                  <Label className="text-sm font-medium">Tarefas ({deliverable.tasks?.length || 0})</Label>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => addTaskToDeliverable(index)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Adicionar Tarefa
                  </Button>
                </div>

                <div className="space-y-2">
                  {(deliverable.tasks || []).map((task, taskIndex) => (
                    <div key={task.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <Input
                        value={task.title}
                        onChange={(e) => updateTask(index, taskIndex, { title: e.target.value })}
                        placeholder="Nome da tarefa..."
                        className="flex-1"
                        size="sm"
                      />
                      <Select
                        value={task.type}
                        onValueChange={(value) => updateTask(index, taskIndex, { type: value })}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(TASK_TYPES).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        value={task.estimated_hours}
                        onChange={(e) => updateTask(index, taskIndex, { estimated_hours: Number(e.target.value) })}
                        placeholder="Horas"
                        className="w-20"
                        size="sm"
                      />
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => removeTask(index, taskIndex)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {data.deliverables.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Target className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhum entregável definido
            </h3>
            <p className="text-gray-600 mb-4">
              Adicione entregáveis para estruturar as etapas do seu template
            </p>
            <Button onClick={addDeliverable}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Primeiro Entregável
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KPIsStep({ data, onChange }) {
  const addKPI = () => {
    const newKPI = {
      name: '',
      formula_id: '',
      category: 'performance',
      target_value: 0,
      frequency: 'monthly',
      priority: 'medium',
      unit: 'number',
      description: '',
      is_mandatory: false
    };

    onChange({ 
      default_kpis: [...data.default_kpis, newKPI] 
    });
  };

  const updateKPI = (index, updates) => {
    const updatedKPIs = [...data.default_kpis];
    updatedKPIs[index] = { ...updatedKPIs[index], ...updates };
    onChange({ default_kpis: updatedKPIs });
  };

  const removeKPI = (index) => {
    const updatedKPIs = data.default_kpis.filter((_, i) => i !== index);
    onChange({ default_kpis: updatedKPIs });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">KPIs Padrão do Template</h3>
          <p className="text-sm text-gray-600">
            Estes KPIs serão automaticamente criados para cada nova instância
          </p>
        </div>
        <Button onClick={addKPI} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Adicionar KPI
        </Button>
      </div>

      <div className="space-y-4">
        {data.default_kpis.map((kpi, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start mb-4">
                <h4 className="font-medium">{kpi.name || 'Novo KPI'}</h4>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => removeKPI(index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do KPI</Label>
                  <Input
                    value={kpi.name}
                    onChange={(e) => updateKPI(index, { name: e.target.value })}
                    placeholder="Ex: ROAS"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select
                    value={kpi.category}
                    onValueChange={(value) => updateKPI(index, { category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(KPI_CATEGORIES).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Meta Padrão</Label>
                  <Input
                    type="number"
                    value={kpi.target_value}
                    onChange={(e) => updateKPI(index, { target_value: Number(e.target.value) })}
                    placeholder="Valor meta"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Unidade</Label>
                  <Select
                    value={kpi.unit}
                    onValueChange={(value) => updateKPI(index, { unit: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentual (%)</SelectItem>
                      <SelectItem value="currency">Moeda (R$)</SelectItem>
                      <SelectItem value="ratio">Proporção</SelectItem>
                      <SelectItem value="days">Dias</SelectItem>
                      <SelectItem value="number">Número</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2 mt-4">
                <Label>Descrição</Label>
                <Textarea
                  value={kpi.description}
                  onChange={(e) => updateKPI(index, { description: e.target.value })}
                  placeholder="Descreva o que este KPI mede..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {data.default_kpis.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <BarChart3 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhum KPI definido
            </h3>
            <p className="text-gray-600 mb-4">
              Adicione KPIs que serão automaticamente configurados para cada cliente
            </p>
            <Button onClick={addKPI}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Primeiro KPI
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SettingsStep({ data, onChange }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Configurações de Execução</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Frequência de Ciclos</Label>
              <Select 
                value={data.cycle_frequency} 
                onValueChange={(value) => onChange({ cycle_frequency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="quarterly">Trimestral</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Política de Aprovação</Label>
              <Select 
                value={data.approval_policy} 
                onValueChange={(value) => onChange({ approval_policy: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto_approve">Aprovação Automática</SelectItem>
                  <SelectItem value="manual_approve">Aprovação Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Classificação do Template</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Categoria do Template</Label>
              <Select 
                value={data.template_category} 
                onValueChange={(value) => onChange({ template_category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Padrão</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumo do Template</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{data.deliverables.length}</div>
              <div className="text-sm text-gray-600">Entregáveis</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {data.deliverables.reduce((acc, d) => acc + (d.tasks?.length || 0), 0)}
              </div>
              <div className="text-sm text-gray-600">Tarefas</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">{data.default_kpis.length}</div>
              <div className="text-sm text-gray-600">KPIs</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-600">
                {data.deliverables.reduce((acc, d) => acc + (d.estimated_hours || 0), 0)}h
              </div>
              <div className="text-sm text-gray-600">Horas Estimadas</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}