import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Package, 
  Clock, 
  Users, 
  Target,
  ChevronDown,
  ChevronUp,
  Edit2,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';

const DeliverablesCustomizationPanel = ({ 
  templateDeliverables = [], 
  onDeliverablesChange,
  teamMembers = [],
  className = '' 
}) => {
  const [customizedDeliverables, setCustomizedDeliverables] = useState([]);
  const [expandedDeliverable, setExpandedDeliverable] = useState(null);
  const [editingTask, setEditingTask] = useState(null);

  // Inicializar entregáveis customizados baseados no template
  useEffect(() => {
    if (templateDeliverables.length > 0) {
      const initialDeliverables = templateDeliverables.map(deliverable => ({
        ...deliverable,
        // Campos customizáveis
        customDurationDays: deliverable.duration_days || 5,
        customPriority: deliverable.priority || 'medium',
        customDescription: deliverable.description || '',
        customExpectedOutcome: deliverable.expected_outcome || '',
        isCustomized: false,
        
        // Tarefas customizáveis
        customTasks: (deliverable.tasks || []).map(task => ({
          ...task,
          customTitle: task.title || '',
          customDescription: task.description || '',
          customEstimatedHours: task.estimated_hours || 1,
          customType: task.type || 'analise_dados',
          customPriority: task.priority || 'medium',
          assignedTeamMember: null, // Para atribuição durante criação
          isCustomized: false,
          isEnabled: true,
          originalValues: {
            title: task.title,
            description: task.description,
            estimated_hours: task.estimated_hours,
            type: task.type,
            priority: task.priority
          }
        })),
        
        // Valores originais para comparação
        originalValues: {
          duration_days: deliverable.duration_days,
          priority: deliverable.priority,
          description: deliverable.description,
          expected_outcome: deliverable.expected_outcome
        }
      }));
      
      setCustomizedDeliverables(initialDeliverables);
      onDeliverablesChange?.(initialDeliverables);
    }
  }, [templateDeliverables, onDeliverablesChange]);

  const handleDeliverableChange = useCallback((deliverableIndex, field, value) => {
    const updatedDeliverables = [...customizedDeliverables];
    const deliverable = updatedDeliverables[deliverableIndex];
    
    // Atualizar campo
    deliverable[field] = value;
    
    // Verificar se foi customizado
    const originalField = field.replace('custom', '').toLowerCase();
    if (originalField === 'durationdays') originalField = 'duration_days';
    if (originalField === 'expectedoutcome') originalField = 'expected_outcome';
    
    const hasChanged = deliverable.originalValues[originalField] !== value;
    deliverable.isCustomized = hasChanged || 
      deliverable.originalValues.duration_days !== deliverable.customDurationDays ||
      deliverable.originalValues.priority !== deliverable.customPriority ||
      deliverable.originalValues.description !== deliverable.customDescription ||
      deliverable.originalValues.expected_outcome !== deliverable.customExpectedOutcome;
    
    setCustomizedDeliverables(updatedDeliverables);
    onDeliverablesChange?.(updatedDeliverables);
  }, [customizedDeliverables, onDeliverablesChange]);

  const handleTaskChange = useCallback((deliverableIndex, taskIndex, field, value) => {
    const updatedDeliverables = [...customizedDeliverables];
    const task = updatedDeliverables[deliverableIndex].customTasks[taskIndex];
    
    // Atualizar campo da tarefa
    task[field] = value;
    
    // Verificar se foi customizado
    const originalField = field.replace('custom', '').toLowerCase();
    if (originalField === 'estimatedhours') originalField = 'estimated_hours';
    
    const hasChanged = task.originalValues[originalField] !== value;
    task.isCustomized = hasChanged ||
      task.originalValues.title !== task.customTitle ||
      task.originalValues.description !== task.customDescription ||
      task.originalValues.estimated_hours !== task.customEstimatedHours ||
      task.originalValues.type !== task.customType ||
      task.originalValues.priority !== task.customPriority;
    
    setCustomizedDeliverables(updatedDeliverables);
    onDeliverablesChange?.(updatedDeliverables);
  }, [customizedDeliverables, onDeliverablesChange]);

  const addCustomTask = useCallback((deliverableIndex) => {
    const updatedDeliverables = [...customizedDeliverables];
    const newTask = {
      id: `custom_task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      customTitle: 'Nova Tarefa',
      customDescription: 'Descrição da tarefa personalizada',
      customEstimatedHours: 2,
      customType: 'analise_dados',
      customPriority: 'medium',
      assignedTeamMember: null,
      isCustomized: true,
      isEnabled: true,
      isNewTask: true,
      originalValues: {}
    };
    
    updatedDeliverables[deliverableIndex].customTasks.push(newTask);
    setCustomizedDeliverables(updatedDeliverables);
    onDeliverablesChange?.(updatedDeliverables);
  }, [customizedDeliverables, onDeliverablesChange]);

  const removeCustomTask = useCallback((deliverableIndex, taskIndex) => {
    const updatedDeliverables = [...customizedDeliverables];
    updatedDeliverables[deliverableIndex].customTasks.splice(taskIndex, 1);
    
    setCustomizedDeliverables(updatedDeliverables);
    onDeliverablesChange?.(updatedDeliverables);
  }, [customizedDeliverables, onDeliverablesChange]);

  const toggleTaskEnabled = useCallback((deliverableIndex, taskIndex) => {
    const updatedDeliverables = [...customizedDeliverables];
    const task = updatedDeliverables[deliverableIndex].customTasks[taskIndex];
    
    task.isEnabled = !task.isEnabled;
    
    setCustomizedDeliverables(updatedDeliverables);
    onDeliverablesChange?.(updatedDeliverables);
  }, [customizedDeliverables, onDeliverablesChange]);

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800'
    };
    return colors[priority] || colors.medium;
  };

  const getTaskTypeIcon = (type) => {
    const icons = {
      coleta_dados: '📋',
      analise_dados: '📊',
      analise_financeira: '💰',
      reuniao_alinhamento: '🤝',
      consultoria: '💡',
      auditoria: '🔍'
    };
    return icons[type] || '📝';
  };

  const getTotalEstimatedHours = (deliverable) => {
    return deliverable.customTasks?.reduce((total, task) => {
      return task.isEnabled ? total + (task.customEstimatedHours || 0) : total;
    }, 0) || 0;
  };

  const getTotalEnabledTasks = (deliverable) => {
    return deliverable.customTasks?.filter(task => task.isEnabled).length || 0;
  };

  if (templateDeliverables.length === 0) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Este template não possui entregáveis pré-definidos. Você pode configurar entregáveis manualmente após criar a instância.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Package className="h-5 w-5" />
            Personalizar Entregáveis
          </h3>
          <p className="text-sm text-gray-600">
            Ajuste os entregáveis e tarefas que serão herdados do template
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium">
            {customizedDeliverables.length} entregáveis
          </p>
          <p className="text-xs text-gray-500">
            {customizedDeliverables.reduce((total, d) => total + getTotalEnabledTasks(d), 0)} tarefas ativas
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {customizedDeliverables.map((deliverable, deliverableIndex) => (
          <Card key={deliverable.id || deliverableIndex} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      Fase {deliverable.phase}
                    </Badge>
                    <Badge className={getPriorityColor(deliverable.customPriority)}>
                      {deliverable.customPriority}
                    </Badge>
                    {deliverable.isCustomized && (
                      <Badge variant="secondary" className="text-xs">
                        Customizado
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="text-right text-xs text-gray-500">
                    <p>{getTotalEnabledTasks(deliverable)} tarefas • {getTotalEstimatedHours(deliverable)}h</p>
                    <p>{deliverable.customDurationDays} dias</p>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedDeliverable(
                      expandedDeliverable === deliverableIndex ? null : deliverableIndex
                    )}
                  >
                    {expandedDeliverable === deliverableIndex ? 
                      <ChevronUp className="h-4 w-4" /> : 
                      <ChevronDown className="h-4 w-4" />
                    }
                  </Button>
                </div>
              </div>

              <div>
                <CardTitle className="text-base">{deliverable.name}</CardTitle>
                {expandedDeliverable !== deliverableIndex && (
                  <p className="text-sm text-gray-600 mt-1">
                    {deliverable.customDescription || deliverable.description}
                  </p>
                )}
              </div>
            </CardHeader>

            {expandedDeliverable === deliverableIndex && (
              <CardContent className="pt-0">
                <div className="space-y-4">
                  {/* Campos editáveis do entregável */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`desc-${deliverableIndex}`}>Descrição</Label>
                      <Textarea
                        id={`desc-${deliverableIndex}`}
                        value={deliverable.customDescription}
                        onChange={(e) => handleDeliverableChange(deliverableIndex, 'customDescription', e.target.value)}
                        rows={2}
                        className="mt-1"
                      />
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor={`duration-${deliverableIndex}`}>Duração (dias)</Label>
                        <Input
                          id={`duration-${deliverableIndex}`}
                          type="number"
                          min="1"
                          value={deliverable.customDurationDays}
                          onChange={(e) => handleDeliverableChange(deliverableIndex, 'customDurationDays', parseInt(e.target.value) || 1)}
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor={`priority-${deliverableIndex}`}>Prioridade</Label>
                        <Select
                          value={deliverable.customPriority}
                          onValueChange={(value) => handleDeliverableChange(deliverableIndex, 'customPriority', value)}
                        >
                          <SelectTrigger className="mt-1">
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
                  </div>

                  <div>
                    <Label htmlFor={`outcome-${deliverableIndex}`}>Resultado Esperado</Label>
                    <Textarea
                      id={`outcome-${deliverableIndex}`}
                      value={deliverable.customExpectedOutcome}
                      onChange={(e) => handleDeliverableChange(deliverableIndex, 'customExpectedOutcome', e.target.value)}
                      rows={2}
                      className="mt-1"
                      placeholder="Descreva o resultado esperado ao final desta fase"
                    />
                  </div>

                  <Separator />

                  {/* Tarefas do entregável */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Tarefas da Fase
                      </h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addCustomTask(deliverableIndex)}
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Adicionar Tarefa
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {deliverable.customTasks?.map((task, taskIndex) => (
                        <Card key={task.id || taskIndex} className={`${task.isEnabled ? '' : 'opacity-50'}`}>
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-sm">{getTaskTypeIcon(task.customType)}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {task.customType.replace('_', ' ')}
                                  </Badge>
                                  <Badge className={getPriorityColor(task.customPriority)}>
                                    {task.customPriority}
                                  </Badge>
                                  {task.isCustomized && (
                                    <Badge variant="secondary" className="text-xs">
                                      Editado
                                    </Badge>
                                  )}
                                  {task.isNewTask && (
                                    <Badge variant="default" className="text-xs">
                                      Nova
                                    </Badge>
                                  )}
                                </div>

                                {editingTask === `${deliverableIndex}-${taskIndex}` ? (
                                  <div className="space-y-3">
                                    <div>
                                      <Input
                                        value={task.customTitle}
                                        onChange={(e) => handleTaskChange(deliverableIndex, taskIndex, 'customTitle', e.target.value)}
                                        placeholder="Título da tarefa"
                                        className="font-medium"
                                      />
                                    </div>
                                    
                                    <div>
                                      <Textarea
                                        value={task.customDescription}
                                        onChange={(e) => handleTaskChange(deliverableIndex, taskIndex, 'customDescription', e.target.value)}
                                        placeholder="Descrição detalhada da tarefa"
                                        rows={2}
                                      />
                                    </div>
                                    
                                    <div className="grid grid-cols-3 gap-2">
                                      <div>
                                        <Label className="text-xs">Horas</Label>
                                        <Input
                                          type="number"
                                          min="0.5"
                                          step="0.5"
                                          value={task.customEstimatedHours}
                                          onChange={(e) => handleTaskChange(deliverableIndex, taskIndex, 'customEstimatedHours', parseFloat(e.target.value) || 0.5)}
                                          className="text-xs"
                                        />
                                      </div>
                                      
                                      <div>
                                        <Label className="text-xs">Tipo</Label>
                                        <Select
                                          value={task.customType}
                                          onValueChange={(value) => handleTaskChange(deliverableIndex, taskIndex, 'customType', value)}
                                        >
                                          <SelectTrigger className="text-xs h-8">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="coleta_dados">Coleta de Dados</SelectItem>
                                            <SelectItem value="analise_dados">Análise de Dados</SelectItem>
                                            <SelectItem value="analise_financeira">Análise Financeira</SelectItem>
                                            <SelectItem value="reuniao_alinhamento">Reunião</SelectItem>
                                            <SelectItem value="consultoria">Consultoria</SelectItem>
                                            <SelectItem value="auditoria">Auditoria</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      
                                      <div>
                                        <Label className="text-xs">Prioridade</Label>
                                        <Select
                                          value={task.customPriority}
                                          onValueChange={(value) => handleTaskChange(deliverableIndex, taskIndex, 'customPriority', value)}
                                        >
                                          <SelectTrigger className="text-xs h-8">
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

                                    {teamMembers.length > 0 && (
                                      <div>
                                        <Label className="text-xs">Responsável</Label>
                                        <Select
                                          value={task.assignedTeamMember || ''}
                                          onValueChange={(value) => handleTaskChange(deliverableIndex, taskIndex, 'assignedTeamMember', value || null)}
                                        >
                                          <SelectTrigger className="text-xs">
                                            <SelectValue placeholder="Selecionar membro da equipe" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value={null}>Não atribuído</SelectItem>
                                            {teamMembers.map(member => (
                                              <SelectItem key={member.id} value={member.id}>
                                                {member.full_name}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    )}

                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        onClick={() => setEditingTask(null)}
                                        className="flex items-center gap-1"
                                      >
                                        <CheckCircle className="h-3 w-3" />
                                        Salvar
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setEditingTask(null)}
                                      >
                                        Cancelar
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <h5 className="font-medium text-sm">{task.customTitle}</h5>
                                    <p className="text-xs text-gray-600 mt-1">{task.customDescription}</p>
                                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {task.customEstimatedHours}h
                                      </span>
                                      {task.assignedTeamMember && (
                                        <span className="flex items-center gap-1">
                                          <Users className="h-3 w-3" />
                                          {teamMembers.find(m => m.id === task.assignedTeamMember)?.full_name || 'Membro'}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleTaskEnabled(deliverableIndex, taskIndex)}
                                  className="h-8 w-8 p-0"
                                >
                                  {task.isEnabled ? 
                                    <CheckCircle className="h-4 w-4 text-green-600" /> : 
                                    <AlertTriangle className="h-4 w-4 text-gray-400" />
                                  }
                                </Button>
                                
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingTask(`${deliverableIndex}-${taskIndex}`)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                
                                {task.isNewTask && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeCustomTask(deliverableIndex, taskIndex)}
                                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DeliverablesCustomizationPanel;