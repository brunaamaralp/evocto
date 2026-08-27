
import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Save, Loader2, Target } from 'lucide-react';
import { toast } from 'sonner';
import { Service } from '@/api/entities';
import { Agency } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';
import { DEFAULT_SERVICE_CATEGORY } from '@/constants/serviceCategories';

const KPI_CATEGORIES = {
  performance: 'Performance',
  demanda: 'Demanda',
  marca: 'Marca',
  operacao: 'Operação',
  engajamento: 'Engajamento',
  crescimento: 'Crescimento',
};

export default function ServiceTemplateForm({ 
  isOpen, 
  onClose, 
  onSuccess, 
  template = null 
}) {
  const { agencyId } = useSession();
  const [loading, setLoading] = useState(false);
  const [agencyCategories, setAgencyCategories] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '', // Campo oculto mas ainda necessário internamente
    deliverables: [],
    default_kpis: [],
    is_active: true
  });

  console.log('🔍 ServiceTemplateForm renderizado:', { isOpen, template });

  // Carregar categorias da agência
  useEffect(() => {
    const loadAgencyCategories = async () => {
      try {
        const agency = await Agency.get(agencyId);
        setAgencyCategories(agency.service_categories || []);
        
        // Se não há categoria selecionada e há categorias disponíveis, usar a primeira
        if (!formData.category && agency.service_categories?.length > 0) {
          setFormData(prev => ({ 
            ...prev, 
            category: agency.service_categories[0].id 
          }));
        }
      } catch (error) {
        console.error('Erro ao carregar categorias da agência:', error);
      }
    };

    if (agencyId && isOpen) {
      loadAgencyCategories();
    }
  }, [agencyId, isOpen, formData.category]);

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
      console.log('📋 ServiceTemplateForm opened, resetting form');
      if (template) {
        setFormData({
          name: template.name || '',
          description: template.description || '',
          category: template.category || (agencyCategories[0]?.id || DEFAULT_SERVICE_CATEGORY),
          deliverables: template.deliverables || [],
          default_kpis: template.default_kpis || [],
          is_active: template.is_active !== undefined ? template.is_active : true
        });
      } else {
        setFormData({
          name: '',
          description: '',
          category: agencyCategories[0]?.id || DEFAULT_SERVICE_CATEGORY,
          deliverables: [],
          default_kpis: [],
          is_active: true
        });
      }
    }
  }, [isOpen, template, agencyCategories]);

  const handleClose = useCallback(() => {
    console.log('🔴 Fechando ServiceTemplateForm');
    setLoading(false);
    
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  // Handler para ESC key
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && isOpen) {
        console.log('🔴 ESC pressionado - fechando ServiceTemplateForm');
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      return () => document.removeEventListener('keydown', handleEscKey);
    }
  }, [isOpen, handleClose]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addDeliverable = () => {
    const newDeliverable = {
      id: `deliverable_${Date.now()}`,
      name: 'Nova Etapa',
      description: '',
      phase: formData.deliverables.length + 1,
      duration_days: 5,
      category: 'analise_financeira',
      estimated_hours: 8,
      priority: 'medium',
      tasks: [],
      expected_outcome: '',
      completion_criteria: []
    };

    setFormData(prev => ({
      ...prev,
      deliverables: [...prev.deliverables, newDeliverable]
    }));
  };

  const updateDeliverable = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      deliverables: prev.deliverables.map((deliverable, i) => 
        i === index ? { ...deliverable, [field]: value } : deliverable
      )
    }));
  };

  const removeDeliverable = (index) => {
    setFormData(prev => ({
      ...prev,
      deliverables: prev.deliverables.filter((_, i) => i !== index)
    }));
  };

  const addTaskToDeliverable = (deliverableIndex) => {
    const deliverableId = formData.deliverables[deliverableIndex].id;
    const newTask = {
      id: `task_${deliverableId}_${Date.now()}`,
      title: 'Nova Tarefa',
      description: '',
      estimated_hours: 4,
      type: 'analise_documentos',
      priority: 'medium',
      checklist: [
        {
          id: `checklist_${Date.now()}_1`,
          text: 'Item de checklist 1',
          completed: false,
          required: true,
          order: 1
        }
      ]
    };

    setFormData(prev => ({
      ...prev,
      deliverables: prev.deliverables.map((deliverable, i) => 
        i === deliverableIndex 
          ? { ...deliverable, tasks: [...deliverable.tasks, newTask] }
          : deliverable
      )
    }));
  };

  const updateTask = (deliverableIndex, taskIndex, field, value) => {
    setFormData(prev => ({
      ...prev,
      deliverables: prev.deliverables.map((deliverable, i) => 
        i === deliverableIndex 
          ? {
              ...deliverable,
              tasks: deliverable.tasks.map((task, j) =>
                j === taskIndex ? { ...task, [field]: value } : task
              )
            }
          : deliverable
      )
    }));
  };

  const removeTask = (deliverableIndex, taskIndex) => {
    setFormData(prev => ({
      ...prev,
      deliverables: prev.deliverables.map((deliverable, i) => 
        i === deliverableIndex 
          ? {
              ...deliverable,
              tasks: deliverable.tasks.filter((_, j) => j !== taskIndex)
            }
          : deliverable
      )
    }));
  };

  const addChecklistItem = (deliverableIndex, taskIndex) => {
    const newChecklistItem = {
      id: `checklist_${Date.now()}`,
      text: 'Novo item de checklist',
      completed: false,
      required: false,
      order: formData.deliverables[deliverableIndex].tasks[taskIndex].checklist?.length + 1 || 1
    };

    setFormData(prev => ({
      ...prev,
      deliverables: prev.deliverables.map((deliverable, i) => 
        i === deliverableIndex 
          ? {
              ...deliverable,
              tasks: deliverable.tasks.map((task, j) =>
                j === taskIndex 
                  ? { ...task, checklist: [...(task.checklist || []), newChecklistItem] }
                  : task
              )
            }
          : deliverable
      )
    }));
  };

  const updateChecklistItem = (deliverableIndex, taskIndex, checklistIndex, field, value) => {
    setFormData(prev => ({
      ...prev,
      deliverables: prev.deliverables.map((deliverable, i) => 
        i === deliverableIndex 
          ? {
              ...deliverable,
              tasks: deliverable.tasks.map((task, j) =>
                j === taskIndex 
                  ? {
                      ...task,
                      checklist: task.checklist?.map((item, k) =>
                        k === checklistIndex ? { ...item, [field]: value } : item
                      ) || []
                    }
                  : task
              )
            }
          : deliverable
      )
    }));
  };

  const removeChecklistItem = (deliverableIndex, taskIndex, checklistIndex) => {
    setFormData(prev => ({
      ...prev,
      deliverables: prev.deliverables.map((deliverable, i) => 
        i === deliverableIndex 
          ? {
              ...deliverable,
              tasks: deliverable.tasks.map((task, j) =>
                j === taskIndex 
                  ? {
                      ...task,
                      checklist: task.checklist?.filter((_, k) => k !== checklistIndex) || []
                    }
                  : task
              )
            }
          : deliverable
      )
    }));
  };

  const addKPI = () => {
    const newKPI = {
      name: 'Novo KPI',
      formula_id: `kpi_${Date.now()}`,
      category: 'performance',
      target_value: null,
      frequency: 'monthly',
      unit: 'percentage',
      priority: 'medium',
      description: '',
      is_mandatory: false
    };

    setFormData(prev => ({
      ...prev,
      default_kpis: [...prev.default_kpis, newKPI]
    }));
  };

  const updateKPI = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      default_kpis: prev.default_kpis.map((kpi, i) => 
        i === index ? { ...kpi, [field]: value } : kpi
      )
    }));
  };

  const removeKPI = (index) => {
    setFormData(prev => ({
      ...prev,
      default_kpis: prev.default_kpis.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Nome do template é obrigatório');
      return;
    }

    setLoading(true);

    try {
      const templateData = {
        ...formData,
        agencyId,
        is_template: true,
        name: formData.name.trim(),
        description: formData.description.trim()
      };

      if (template) {
        await Service.update(template.id, templateData);
        toast.success('Template atualizado com sucesso!');
      } else {
        await Service.create(templateData);
        toast.success('Template criado com sucesso!');
      }

      if (onSuccess) {
        onSuccess();
      }

    } catch (error) {
      console.error('Erro ao salvar template:', error);
      toast.error('Erro ao salvar template');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? 'Editar Template' : 'Criar Novo Template'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList>
              <TabsTrigger value="basic">Informações Básicas</TabsTrigger>
              <TabsTrigger value="deliverables">Etapas & Entregáveis</TabsTrigger>
              <TabsTrigger value="kpis">KPIs Padrão</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="name">Nome do Template *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Ex: Diagnóstico de Comunicação e Marca"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Descreva o que este template de serviço oferece..."
                    rows={4}
                  />
                </div>

                {/* CATEGORIA OCULTA - mas ainda usada internamente */}
                <input 
                  type="hidden" 
                  value={formData.category}
                />
              </div>
            </TabsContent>

            <TabsContent value="deliverables" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Etapas do Serviço</h3>
                <Button type="button" onClick={addDeliverable} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Etapa
                </Button>
              </div>

              {formData.deliverables.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                  <p className="text-gray-500">
                    Nenhuma etapa criada ainda. Clique em "Adicionar Etapa" para começar.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.deliverables.map((deliverable, index) => (
                    <Card key={deliverable.id} className="border-l-4 border-l-blue-500">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">Etapa {deliverable.phase}</Badge>
                              <Input
                                value={deliverable.name}
                                onChange={(e) => updateDeliverable(index, 'name', e.target.value)}
                                className="font-medium"
                                placeholder="Nome da etapa"
                              />
                            </div>
                            <Textarea
                              value={deliverable.description}
                              onChange={(e) => updateDeliverable(index, 'description', e.target.value)}
                              placeholder="Descrição da etapa..."
                              rows={2}
                            />
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Duração (dias)</Label>
                                <Input
                                  type="number"
                                  value={deliverable.duration_days}
                                  onChange={(e) => updateDeliverable(index, 'duration_days', parseInt(e.target.value))}
                                  min="1"
                                />
                              </div>
                              <div>
                                <Label>Horas Estimadas</Label>
                                <Input
                                  type="number"
                                  value={deliverable.estimated_hours}
                                  onChange={(e) => updateDeliverable(index, 'estimated_hours', parseInt(e.target.value))}
                                  min="1"
                                />
                              </div>
                            </div>
                          </div>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm"
                            onClick={() => removeDeliverable(index)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        {/* Tarefas */}
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <Label>Tarefas</Label>
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm"
                              onClick={() => addTaskToDeliverable(index)}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Tarefa
                            </Button>
                          </div>

                          {deliverable.tasks?.map((task, taskIndex) => (
                            <Card key={task.id} className="mb-3">
                              <CardContent className="pt-4">
                                <div className="flex justify-between items-start mb-3">
                                  <div className="flex-1 space-y-2">
                                    <Input
                                      value={task.title}
                                      onChange={(e) => updateTask(index, taskIndex, 'title', e.target.value)}
                                      placeholder="Nome da tarefa"
                                    />
                                    <Textarea
                                      value={task.description}
                                      onChange={(e) => updateTask(index, taskIndex, 'description', e.target.value)}
                                      placeholder="Descrição da tarefa..."
                                      rows={2}
                                    />
                                  </div>
                                  <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => removeTask(index, taskIndex)}
                                  >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </Button>
                                </div>

                                {/* Checklist */}
                                <div>
                                  <div className="flex justify-between items-center mb-2">
                                    <Label className="text-sm">Checklist</Label>
                                    <Button 
                                      type="button" 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => addChecklistItem(index, taskIndex)}
                                    >
                                      <Plus className="w-3 h-3 mr-1" />
                                      Item
                                    </Button>
                                  </div>

                                  <div className="space-y-2">
                                    {task.checklist?.map((item, checklistIndex) => (
                                      <div key={item.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                                        <Input
                                          value={item.text}
                                          onChange={(e) => updateChecklistItem(index, taskIndex, checklistIndex, 'text', e.target.value)}
                                          placeholder="Item do checklist..."
                                          size="sm"
                                        />
                                        <label className="flex items-center text-sm">
                                          <input
                                            type="checkbox"
                                            checked={item.required}
                                            onChange={(e) => updateChecklistItem(index, taskIndex, checklistIndex, 'required', e.target.checked)}
                                            className="mr-1"
                                          />
                                          Obrigatório
                                        </label>
                                        <Button 
                                          type="button" 
                                          variant="ghost" 
                                          size="sm"
                                          onClick={() => removeChecklistItem(index, taskIndex, checklistIndex)}
                                        >
                                          <Trash2 className="w-3 h-3 text-red-500" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="kpis" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">KPIs Padrão do Serviço</h3>
                <Button type="button" onClick={addKPI} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar KPI
                </Button>
              </div>

              {formData.default_kpis.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                  <Target className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">
                    Nenhum KPI definido. Adicione indicadores que devem ser monitorados neste serviço.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.default_kpis.map((kpi, index) => (
                    <Card key={index}>
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1 grid grid-cols-2 gap-4">
                            <div>
                              <Label>Nome do KPI</Label>
                              <Input
                                value={kpi.name}
                                onChange={(e) => updateKPI(index, 'name', e.target.value)}
                                placeholder="Ex: Margem de Lucro"
                              />
                            </div>
                            <div>
                              <Label>ID da Fórmula</Label>
                              <Input
                                value={kpi.formula_id}
                                onChange={(e) => updateKPI(index, 'formula_id', e.target.value)}
                                placeholder="Ex: margem_lucro_v1"
                              />
                            </div>
                            <div>
                              <Label>Categoria</Label>
                              <select 
                                value={kpi.category}
                                onChange={(e) => updateKPI(index, 'category', e.target.value)}
                                className="w-full p-2 border rounded-md"
                              >
                                {Object.entries(KPI_CATEGORIES).map(([key, label]) => (
                                  <option key={key} value={key}>{label}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <Label>Unidade</Label>
                              <select 
                                value={kpi.unit}
                                onChange={(e) => updateKPI(index, 'unit', e.target.value)}
                                className="w-full p-2 border rounded-md"
                              >
                                <option value="percentage">Porcentagem</option>
                                <option value="currency">Moeda</option>
                                <option value="ratio">Proporção</option>
                                <option value="days">Dias</option>
                                <option value="number">Número</option>
                              </select>
                            </div>
                          </div>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm"
                            onClick={() => removeKPI(index)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                        
                        <Textarea
                          value={kpi.description}
                          onChange={(e) => updateKPI(index, 'description', e.target.value)}
                          placeholder="Descrição do que este KPI mede..."
                          rows={2}
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex justify-end space-x-3 border-t pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Save className="w-4 h-4 mr-2" />
              {template ? 'Atualizar Template' : 'Criar Template'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
