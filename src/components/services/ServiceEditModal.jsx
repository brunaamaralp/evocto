
import React, { useState, useEffect } from 'react';
import { Service } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus, Trash2, GripVertical, Clock, Target, 
  FileText, Calendar, DollarSign, LayoutTemplate
} from 'lucide-react';
import { toast } from 'sonner';
import { SERVICE_CATEGORIES, getCategoryLabel } from '@/constants/serviceCategories';

export default function ServiceEditModal({ 
  isOpen, 
  service, 
  onClose, 
  onServiceUpdated 
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    version: '1.0',
    pricing: {
      type: 'fixed',
      base_price: 0,
      currency: 'BRL',
      billing_cycle: 'one_time'
    },
    deliverables: [],
    is_active: true,
    is_template: false
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (service && isOpen) {
      setFormData({
        name: service.name || '',
        description: service.description || '',
        category: service.category || '',
        version: service.version || '1.0',
        pricing: service.pricing || {
          type: 'fixed',
          base_price: 0,
          currency: 'BRL',
          billing_cycle: 'one_time'
        },
        deliverables: service.deliverables || [],
        is_active: service.is_active !== false,
        is_template: service.is_template || false
      });
    }
  }, [service, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!service) return;

    setLoading(true);
    try {
      await Service.update(service.id, formData);
      toast.success('Serviço atualizado com sucesso!');
      onServiceUpdated();
      onClose();
    } catch (error) {
      console.error('Erro ao atualizar serviço:', error);
      toast.error('Erro ao atualizar serviço');
    } finally {
      setLoading(false);
    }
  };

  const addDeliverable = () => {
    const newDeliverable = {
      id: `deliverable_${Date.now()}`,
      name: '',
      description: '',
      phase: (formData.deliverables.length + 1),
      duration_days: 7,
      category: 'analise_financeira',
      estimated_hours: 8,
      priority: 'medium',
      depends_on: [],
      expected_outcome: '',
      completion_criteria: '',
      tasks: []
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

  const addTask = (deliverableIndex) => {
    const newTask = {
      title: '',
      description: '',
      estimated_hours: 2,
      type: 'analise_documentos',
      priority: 'medium'
    };

    setFormData(prev => ({
      ...prev,
      deliverables: prev.deliverables.map((deliverable, i) => 
        i === deliverableIndex 
          ? { ...deliverable, tasks: [...(deliverable.tasks || []), newTask] }
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

  const getTaskTypeLabel = (type) => {
    const labels = {
      'analise_documentos': 'Análise de Documentos',
      'coleta_dados': 'Coleta de Dados',
      'analise_dados': 'Análise de Dados',
      'analise_financeira': 'Análise Financeira',
      'relatorio_financeiro': 'Relatório Financeiro',
      'reuniao_alinhamento': 'Reunião de Alinhamento',
      'planejamento_estrategico': 'Planejamento Estratégico',
      'implementacao': 'Implementação',
      'treinamento': 'Treinamento',
      'administrativo': 'Administrativo',
      'auditoria': 'Auditoria',
      'consultoria': 'Consultoria'
    };
    return labels[type] || type;
  };

  if (!service) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Editar Serviço: {service.name}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-name">Nome do Serviço</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-version">
                    Versão
                    {service?.is_template && (
                      <span className="text-xs text-gray-500 ml-1">(ex: v1.0, v1.1)</span>
                    )}
                  </Label>
                  <Input
                    id="edit-version"
                    value={formData.version}
                    onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
                    disabled={!service?.is_template}
                    placeholder="v1.0"
                  />
                  {!service?.is_template && (
                    <p className="text-xs text-gray-500 mt-1">
                      Versão da instância (não editável)
                    </p>
                  )}
                </div>
              </div>

              {/* Template reference for instances */}
              {!service?.is_template && service?.base_service_id && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <LayoutTemplate className="w-4 h-4 text-blue-600" />
                    <span className="text-blue-900">
                      Baseado no template v{service.template_version_used || 'unknown'}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="edit-description">Descrição</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Categoria</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => setFormData({...formData, category: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SERVICE_CATEGORIES).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-4 pt-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">Serviço Ativo</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_template}
                      onChange={(e) => setFormData({...formData, is_template: e.target.checked})}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">É Template</span>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Precificação */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Precificação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Tipo</Label>
                  <Select 
                    value={formData.pricing.type} 
                    onValueChange={(value) => setFormData({
                      ...formData, 
                      pricing: {...formData.pricing, type: value}
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Preço Fixo</SelectItem>
                      <SelectItem value="hourly">Por Hora</SelectItem>
                      <SelectItem value="retainer">Mensalidade</SelectItem>
                      <SelectItem value="success_fee">Taxa de Sucesso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Valor Base (R$)</Label>
                  <Input
                    type="number"
                    value={formData.pricing.base_price}
                    onChange={(e) => setFormData({
                      ...formData, 
                      pricing: {...formData.pricing, base_price: parseFloat(e.target.value) || 0}
                    })}
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <Label>Ciclo de Cobrança</Label>
                  <Select 
                    value={formData.pricing.billing_cycle} 
                    onValueChange={(value) => setFormData({
                      ...formData, 
                      pricing: {...formData.pricing, billing_cycle: value}
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one_time">Único</SelectItem>
                      <SelectItem value="monthly">Mensal</SelectItem>
                      <SelectItem value="quarterly">Trimestral</SelectItem>
                      <SelectItem value="yearly">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Entregáveis e Fases */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Entregáveis e Fases ({formData.deliverables.length})
                </CardTitle>
                <Button type="button" onClick={addDeliverable} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Fase
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {formData.deliverables.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Target className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma fase configurada</p>
                  <p className="text-sm">Clique em "Adicionar Fase" para começar</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.deliverables.map((deliverable, deliverableIndex) => (
                    <Card key={deliverable.id} className="border-l-4 border-l-blue-500">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">Fase {deliverable.phase}</Badge>
                            <Input
                              value={deliverable.name}
                              onChange={(e) => updateDeliverable(deliverableIndex, 'name', e.target.value)}
                              placeholder="Nome da fase"
                              className="font-semibold"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeDeliverable(deliverableIndex)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-4">
                        <Textarea
                          value={deliverable.description}
                          onChange={(e) => updateDeliverable(deliverableIndex, 'description', e.target.value)}
                          placeholder="Descrição da fase..."
                          rows={2}
                        />

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div>
                            <Label className="text-xs">Duração (dias)</Label>
                            <Input
                              type="number"
                              value={deliverable.duration_days}
                              onChange={(e) => updateDeliverable(deliverableIndex, 'duration_days', parseInt(e.target.value) || 0)}
                              min="1"
                            />
                          </div>

                          <div>
                            <Label className="text-xs">Horas Estimadas</Label>
                            <Input
                              type="number"
                              value={deliverable.estimated_hours}
                              onChange={(e) => updateDeliverable(deliverableIndex, 'estimated_hours', parseInt(e.target.value) || 0)}
                              min="1"
                            />
                          </div>

                          <div>
                            <Label className="text-xs">Categoria</Label>
                            <Select 
                              value={deliverable.category} 
                              onValueChange={(value) => updateDeliverable(deliverableIndex, 'category', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="analise_financeira">Análise Financeira</SelectItem>
                                <SelectItem value="analise_operacional">Análise Operacional</SelectItem>
                                <SelectItem value="analise_dados">Análise de Dados</SelectItem>
                                <SelectItem value="relatorio_financeiro">Relatório Financeiro</SelectItem>
                                <SelectItem value="planejamento_estrategico">Planejamento Estratégico</SelectItem>
                                <SelectItem value="implementacao_sistema">Implementação de Sistema</SelectItem>
                                <SelectItem value="treinamento">Treinamento</SelectItem>
                                <SelectItem value="auditoria">Auditoria</SelectItem>
                                <SelectItem value="consultoria">Consultoria</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-xs">Prioridade</Label>
                            <Select 
                              value={deliverable.priority} 
                              onValueChange={(value) => updateDeliverable(deliverableIndex, 'priority', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Baixa</SelectItem>
                                <SelectItem value="medium">Média</SelectItem>
                                <SelectItem value="high">Alta</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Resultado Esperado</Label>
                            <Textarea
                              value={deliverable.expected_outcome || ''}
                              onChange={(e) => updateDeliverable(deliverableIndex, 'expected_outcome', e.target.value)}
                              placeholder="Qual o resultado esperado desta fase?"
                              rows={2}
                            />
                          </div>

                          <div>
                            <Label className="text-xs">Critérios de Conclusão</Label>
                            <Textarea
                              value={deliverable.completion_criteria || ''}
                              onChange={(e) => updateDeliverable(deliverableIndex, 'completion_criteria', e.target.value)}
                              placeholder="Como saber que a fase foi concluída?"
                              rows={2}
                            />
                          </div>
                        </div>

                        {/* Tarefas da Fase */}
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <Label className="text-sm">Tarefas da Fase ({deliverable.tasks?.length || 0})</Label>
                            <Button 
                              type="button" 
                              onClick={() => addTask(deliverableIndex)} 
                              size="sm" 
                              variant="outline"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Tarefa
                            </Button>
                          </div>
                          
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {deliverable.tasks?.map((task, taskIndex) => (
                              <div key={taskIndex} className="border rounded p-2 bg-gray-50">
                                <div className="flex justify-between items-start gap-2">
                                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                                    <Input
                                      value={task.title}
                                      onChange={(e) => updateTask(deliverableIndex, taskIndex, 'title', e.target.value)}
                                      placeholder="Título da tarefa"
                                      className="text-sm"
                                    />
                                    
                                    <Select 
                                      value={task.type} 
                                      onValueChange={(value) => updateTask(deliverableIndex, taskIndex, 'type', value)}
                                    >
                                      <SelectTrigger className="text-sm">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="analise_documentos">Análise de Documentos</SelectItem>
                                        <SelectItem value="coleta_dados">Coleta de Dados</SelectItem>
                                        <SelectItem value="analise_dados">Análise de Dados</SelectItem>
                                        <SelectItem value="analise_financeira">Análise Financeira</SelectItem>
                                        <SelectItem value="relatorio_financeiro">Relatório Financeiro</SelectItem>
                                        <SelectItem value="reuniao_alinhamento">Reunião</SelectItem>
                                        <SelectItem value="planejamento_estrategico">Planejamento</SelectItem>
                                        <SelectItem value="implementacao">Implementação</SelectItem>
                                        <SelectItem value="treinamento">Treinamento</SelectItem>
                                        <SelectItem value="administrativo">Administrativo</SelectItem>
                                        <SelectItem value="auditoria">Auditoria</SelectItem>
                                        <SelectItem value="consultoria">Consultoria</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    
                                    <div className="flex items-center gap-1">
                                      <Input
                                        type="number"
                                        value={task.estimated_hours}
                                        onChange={(e) => updateTask(deliverableIndex, taskIndex, 'estimated_hours', parseInt(e.target.value) || 0)}
                                        placeholder="Horas"
                                        className="text-sm"
                                        min="0.5"
                                        step="0.5"
                                      />
                                      <span className="text-xs text-gray-500">h</span>
                                    </div>
                                  </div>
                                  
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeTask(deliverableIndex, taskIndex)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                                
                                <Textarea
                                  value={task.description}
                                  onChange={(e) => updateTask(deliverableIndex, taskIndex, 'description', e.target.value)}
                                  placeholder="Descrição da tarefa..."
                                  rows={1}
                                  className="text-sm mt-2"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ações */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
