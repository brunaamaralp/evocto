import React, { useState, useEffect, useCallback } from 'react';
import { Service } from '@/api/entities';
import { User } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  Save, ArrowLeft, Plus, Trash2, GripVertical, Edit3, CheckSquare,
  Users, Calendar, Clock, Flag, FileText, Zap, Eye, Settings,
  AlertCircle, Check, X, User as UserIcon, Building2, Loader2,
  MoreVertical, Edit, Move3D, Sparkles, Wifi, WifiOff, CheckCircle2
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';
import { SERVICE_CATEGORIES, DEFAULT_SERVICE_CATEGORY } from '@/constants/serviceCategories';

const CATEGORY_ICONS = {
  marketing_digital: '📣',
  branding: '✨',
  comunicacao: '💬',
  midia_paga: '📢',
  organico: '🌱',
  conteudo: '📝',
  copywriting: '✍️',
  design: '🎨',
  email_marketing: '📧',
  analytics: '📊',
  automacao: '⚙️',
  produto: '📦',
  desenvolvimento: '💻',
  consultoria_estrategica: '🎯',
};

const CATEGORIES = Object.entries(SERVICE_CATEGORIES).map(([value, label]) => ({
  value,
  label,
  icon: CATEGORY_ICONS[value] || '📁',
}));

const TEMPLATE_CATEGORIES = [
  { value: 'standard', label: 'Padrão' },
  { value: 'premium', label: 'Premium' },
  { value: 'custom', label: 'Personalizado' }
];

const TASK_TYPES = [
  { value: 'analise_documentos', label: 'Análise de Documentos' },
  { value: 'coleta_dados', label: 'Coleta de Dados' },
  { value: 'analise_dados', label: 'Análise de Dados' },
  { value: 'analise_financeira', label: 'Análise Financeira' },
  { value: 'relatorio_financeiro', label: 'Relatório Financeiro' },
  { value: 'reuniao_alinhamento', label: 'Reunião de Alinhamento' },
  { value: 'planejamento_estrategico', label: 'Planejamento Estratégico' },
  { value: 'implementacao', label: 'Implementação' },
  { value: 'treinamento', label: 'Treinamento' },
  { value: 'administrativo', label: 'Administrativo' },
  { value: 'auditoria', label: 'Auditoria' },
  { value: 'consultoria', label: 'Consultoria' }
];

const PRIORITIES = [
  { value: 'low', label: 'Baixa', color: 'bg-blue-100 text-blue-800' },
  { value: 'medium', label: 'Média', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'high', label: 'Alta', color: 'bg-orange-100 text-orange-800' },
  { value: 'urgent', label: 'Urgente', color: 'bg-red-100 text-red-800' }
];

const ROLES = [
  { value: 'consultor_lider', label: 'Consultor Líder' },
  { value: 'consultor_apoio', label: 'Consultor de Apoio' },
  { value: 'cliente_gestor', label: 'Cliente (Gestor)' },
  { value: 'cliente_aprovador', label: 'Cliente (Aprovador)' }
];

// Auto-save hook
function useAutoSave(data, onSave, delay = 3000) {
  const [lastSaved, setLastSaved] = React.useState(Date.now());
  const [isSaving, setIsSaving] = React.useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);
  
  const saveTimer = React.useRef(null);
  const lastDataRef = React.useRef(data);

  React.useEffect(() => {
    const dataChanged = JSON.stringify(data) !== JSON.stringify(lastDataRef.current);
    
    if (dataChanged) {
      setHasUnsavedChanges(true);
      
      // Clear existing timer
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
      
      // Set new timer
      saveTimer.current = setTimeout(async () => {
        setIsSaving(true);
        try {
          await onSave(data, true); // silent save
          setLastSaved(Date.now());
          setHasUnsavedChanges(false);
          lastDataRef.current = data;
        } catch (error) {
          console.error('Auto-save failed:', error);
        } finally {
          setIsSaving(false);
        }
      }, delay);
    }

    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
    };
  }, [data, onSave, delay]);

  const forceSave = async () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
    }
    
    setIsSaving(true);
    try {
      await onSave(data, false); // not silent
      setLastSaved(Date.now());
      setHasUnsavedChanges(false);
      lastDataRef.current = data;
    } catch (error) {
      console.error('Manual save failed:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  return { isSaving, hasUnsavedChanges, lastSaved, forceSave };
}

// Componente para editar checklist avançado com drag & drop
function AdvancedChecklistEditor({ checklist, onChange }) {
  const [items, setItems] = useState(checklist || []);
  const [newItemText, setNewItemText] = useState('');
  const [newItemRole, setNewItemRole] = useState('');
  const [newItemDays, setNewItemDays] = useState('');
  const [editingItemId, setEditingItemId] = useState(null);

  React.useEffect(() => {
    onChange(items);
  }, [items, onChange]);

  const addItem = () => {
    if (!newItemText.trim()) return;

    const newItem = {
      id: `checklist_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      text: newItemText.trim(),
      completed: false,
      required: true,
      order: items.length,
      assignedRole: newItemRole || null,
      relativeDueDays: newItemDays ? parseInt(newItemDays) : null
    };

    setItems([...items, newItem]);
    setNewItemText('');
    setNewItemRole('');
    setNewItemDays('');
  };

  const removeItem = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id, updates) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addItem();
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const newItems = Array.from(items);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, reorderedItem);
    
    // Update order
    const updatedItems = newItems.map((item, index) => ({
      ...item,
      order: index
    }));
    
    setItems(updatedItems);
  };

  const startEditing = (itemId) => {
    setEditingItemId(itemId);
  };

  const stopEditing = () => {
    setEditingItemId(null);
  };

  return (
    <div className="space-y-4">
      {/* Lista de itens existentes com drag & drop */}
      {items.length > 0 && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="checklist-items">
            {(provided, snapshot) => (
              <div 
                {...provided.droppableProps} 
                ref={provided.innerRef}
                className={`space-y-2 ${snapshot.isDraggingOver ? 'bg-blue-50 rounded-lg p-2' : ''}`}
              >
                {items.map((item, index) => (
                  <Draggable key={item.id} draggableId={item.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`flex items-start gap-3 p-3 border rounded-lg bg-white transition-all ${
                          snapshot.isDragging ? 'shadow-lg rotate-2 scale-105' : 'hover:shadow-md'
                        }`}
                      >
                        <div 
                          {...provided.dragHandleProps}
                          className="flex items-center text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing mt-1"
                        >
                          <GripVertical className="w-4 h-4" />
                        </div>
                        
                        <div className="flex-1 space-y-2">
                          {editingItemId === item.id ? (
                            // Edit mode
                            <div className="space-y-2">
                              <Input
                                value={item.text}
                                onChange={(e) => updateItem(item.id, { text: e.target.value })}
                                className="font-medium"
                                onBlur={stopEditing}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') stopEditing();
                                  if (e.key === 'Escape') stopEditing();
                                }}
                                autoFocus
                              />
                              <div className="flex items-center gap-4 text-xs">
                                <div className="flex items-center gap-1">
                                  <UserIcon className="w-3 h-3 text-gray-400" />
                                  <Select
                                    value={item.assignedRole || ''}
                                    onValueChange={(value) => updateItem(item.id, { assignedRole: value || null })}
                                  >
                                    <SelectTrigger className="h-7 w-32 text-xs">
                                      <SelectValue placeholder="Papel" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value={null}>Nenhum</SelectItem>
                                      {ROLES.map(role => (
                                        <SelectItem key={role.value} value={role.value}>
                                          {role.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-gray-400" />
                                  <Input
                                    type="number"
                                    value={item.relativeDueDays || ''}
                                    onChange={(e) => updateItem(item.id, { 
                                      relativeDueDays: e.target.value ? parseInt(e.target.value) : null 
                                    })}
                                    className="h-7 w-16 text-xs"
                                    placeholder="0"
                                    min="0"
                                    max="365"
                                  />
                                  <span className="text-gray-500">dias</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            // View mode
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <CheckSquare className="w-4 h-4 text-gray-400" />
                                <span 
                                  className="font-medium cursor-pointer hover:text-blue-600"
                                  onClick={() => startEditing(item.id)}
                                >
                                  {item.text}
                                </span>
                              </div>
                              
                              {/* Detalhes do item */}
                              <div className="flex items-center gap-3 ml-6 text-xs text-gray-500">
                                {item.assignedRole && (
                                  <div className="flex items-center gap-1">
                                    <UserIcon className="w-3 h-3" />
                                    <span>{ROLES.find(r => r.value === item.assignedRole)?.label}</span>
                                  </div>
                                )}
                                
                                {item.relativeDueDays !== null && item.relativeDueDays !== undefined && (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    <span>+{item.relativeDueDays} dias</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {/* Adicionar novo item */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 space-y-3 hover:border-blue-300 transition-colors">
        <div className="flex items-center gap-2">
          <Plus className="w-4 h-4 text-gray-400" />
          <Input
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Adicionar item ao checklist..."
            className="flex-1"
          />
        </div>
        
        {/* Opções para o novo item */}
        <div className="flex items-center gap-4 ml-6">
          <div className="flex items-center gap-2">
            <UserIcon className="w-3 h-3 text-gray-400" />
            <Select value={newItemRole} onValueChange={setNewItemRole}>
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue placeholder="Responsável..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Nenhum</SelectItem>
                {ROLES.map(role => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <Calendar className="w-3 h-3 text-gray-400" />
            <div className="flex items-center gap-1">
              <Input
                type="number"
                value={newItemDays}
                onChange={(e) => setNewItemDays(e.target.value)}
                className="h-8 w-16 text-xs"
                placeholder="0"
                min="0"
                max="365"
              />
              <span className="text-xs text-gray-500">dias</span>
            </div>
          </div>
          
          <Button onClick={addItem} size="sm" disabled={!newItemText.trim()}>
            Adicionar
          </Button>
        </div>
      </div>

      {items.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Nenhum item no checklist ainda</p>
          <p className="text-sm">Adicione itens para detalhar os passos desta tarefa</p>
        </div>
      )}
    </div>
  );
}

// Componente para editar uma tarefa com drag handle
function TaskEditor({ task, index, onUpdate, onDelete, dragHandleProps }) {
  const [expanded, setExpanded] = useState(false);
  const [taskData, setTaskData] = useState({
    title: task.title || '',
    description: task.description || '',
    estimated_hours: task.estimated_hours || 1,
    priority: task.priority || 'medium',
    type: task.type || 'analise_documentos',
    checklist: task.checklist || []
  });

  const updateTask = (updates) => {
    const newData = { ...taskData, ...updates };
    setTaskData(newData);
    onUpdate(index, newData);
  };

  const handleChecklistChange = (newChecklist) => {
    updateTask({ checklist: newChecklist });
  };

  return (
    <Card className="mb-4 group hover:shadow-md transition-all">
      <CardHeader 
        className="cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              {...dragHandleProps}
              className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-medium">{taskData.title || 'Nova Tarefa'}</h4>
                <Badge className={PRIORITIES.find(p => p.value === taskData.priority)?.color}>
                  {PRIORITIES.find(p => p.value === taskData.priority)?.label}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {taskData.estimated_hours}h
                </span>
                <span className="flex items-center gap-1">
                  <CheckSquare className="w-3 h-3" />
                  {taskData.checklist?.length || 0} itens
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={(e) => { e.stopPropagation(); onDelete(index); }}
              className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              {expanded ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {expanded && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor={`task-title-${index}`}>Título da Tarefa</Label>
              <Input
                id={`task-title-${index}`}
                value={taskData.title}
                onChange={(e) => updateTask({ title: e.target.value })}
                placeholder="Ex: Analisar demonstrações financeiras"
              />
            </div>
            
            <div>
              <Label htmlFor={`task-type-${index}`}>Tipo</Label>
              <Select
                value={taskData.type}
                onValueChange={(value) => updateTask({ type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
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
            
            <div>
              <Label htmlFor={`task-hours-${index}`}>Horas Estimadas</Label>
              <Input
                id={`task-hours-${index}`}
                type="number"
                value={taskData.estimated_hours}
                onChange={(e) => updateTask({ estimated_hours: parseInt(e.target.value) || 1 })}
                min="0.5"
                step="0.5"
              />
            </div>
            
            <div>
              <Label htmlFor={`task-priority-${index}`}>Prioridade</Label>
              <Select
                value={taskData.priority}
                onValueChange={(value) => updateTask({ priority: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a prioridade" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(priority => (
                    <SelectItem key={priority.value} value={priority.value}>
                      {priority.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label htmlFor={`task-description-${index}`}>Descrição</Label>
            <Textarea
              id={`task-description-${index}`}
              value={taskData.description}
              onChange={(e) => updateTask({ description: e.target.value })}
              placeholder="Descreva os detalhes desta tarefa..."
              rows={3}
            />
          </div>
          
          <div>
            <Label>Checklist Avançado</Label>
            <div className="mt-2">
              <AdvancedChecklistEditor
                checklist={taskData.checklist}
                onChange={handleChecklistChange}
              />
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// Componente para editar um entregável com drag & drop de tarefas
function DeliverableEditor({ deliverable, index, onUpdate, onDelete, dragHandleProps }) {
  const [expanded, setExpanded] = useState(false);
  const [data, setData] = useState({
    name: deliverable.name || '',
    description: deliverable.description || '',
    phase: deliverable.phase || index + 1,
    duration_days: deliverable.duration_days || 7,
    category: deliverable.category || 'analise_financeira',
    estimated_hours: deliverable.estimated_hours || 8,
    priority: deliverable.priority || 'medium',
    tasks: deliverable.tasks || []
  });

  const updateData = (updates) => {
    const newData = { ...data, ...updates };
    setData(newData);
    onUpdate(index, newData);
  };

  const addTask = () => {
    const newTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      title: 'Nova Tarefa',
      description: '',
      estimated_hours: 2,
      priority: 'medium',
      type: 'analise_documentos',
      checklist: []
    };
    
    updateData({ tasks: [...data.tasks, newTask] });
  };

  const updateTask = (taskIndex, taskData) => {
    const newTasks = [...data.tasks];
    newTasks[taskIndex] = { ...newTasks[taskIndex], ...taskData };
    updateData({ tasks: newTasks });
  };

  const deleteTask = (taskIndex) => {
    const newTasks = data.tasks.filter((_, i) => i !== taskIndex);
    updateData({ tasks: newTasks });
  };

  const handleTaskDragEnd = (result) => {
    if (!result.destination) return;

    const newTasks = Array.from(data.tasks);
    const [reorderedTask] = newTasks.splice(result.source.index, 1);
    newTasks.splice(result.destination.index, 0, reorderedTask);
    
    updateData({ tasks: newTasks });
  };

  const totalTaskHours = data.tasks.reduce((sum, task) => sum + (task.estimated_hours || 0), 0);

  return (
    <Card className="mb-4 group hover:shadow-lg transition-all">
      <CardHeader 
        className="cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              {...dragHandleProps}
              className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  Fase {data.phase}
                </Badge>
                <h3 className="font-semibold text-lg">{data.name || 'Novo Entregável'}</h3>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {data.duration_days} dias
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {totalTaskHours}h estimadas
                </span>
                <span className="flex items-center gap-1">
                  <CheckSquare className="w-3 h-3" />
                  {data.tasks.length} tarefas
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={(e) => { e.stopPropagation(); onDelete(index); }}
              className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              {expanded ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {expanded && (
        <CardContent className="space-y-6">
          {/* Informações básicas do entregável */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor={`deliverable-name-${index}`}>Nome do Entregável</Label>
              <Input
                id={`deliverable-name-${index}`}
                value={data.name}
                onChange={(e) => updateData({ name: e.target.value })}
                placeholder="Ex: Diagnóstico Inicial"
              />
            </div>
            
            <div>
              <Label htmlFor={`deliverable-phase-${index}`}>Número da Fase</Label>
              <Input
                id={`deliverable-phase-${index}`}
                type="number"
                value={data.phase}
                onChange={(e) => updateData({ phase: parseInt(e.target.value) || 1 })}
                min="1"
              />
            </div>
            
            <div>
              <Label htmlFor={`deliverable-duration-${index}`}>Duração (dias)</Label>
              <Input
                id={`deliverable-duration-${index}`}
                type="number"
                value={data.duration_days}
                onChange={(e) => updateData({ duration_days: parseInt(e.target.value) || 1 })}
                min="1"
              />
            </div>
            
            <div>
              <Label htmlFor={`deliverable-priority-${index}`}>Prioridade</Label>
              <Select
                value={data.priority}
                onValueChange={(value) => updateData({ priority: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a prioridade" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(priority => (
                    <SelectItem key={priority.value} value={priority.value}>
                      {priority.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label htmlFor={`deliverable-description-${index}`}>Descrição</Label>
            <Textarea
              id={`deliverable-description-${index}`}
              value={data.description}
              onChange={(e) => updateData({ description: e.target.value })}
              placeholder="Descreva o que será entregue nesta fase..."
              rows={3}
            />
          </div>
          
          {/* Tarefas do entregável com drag & drop */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <Label className="text-base font-medium">Tarefas desta Fase</Label>
              <Button onClick={addTask} size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Adicionar Tarefa
              </Button>
            </div>
            
            <div className="space-y-4">
              {data.tasks.length > 0 ? (
                <DragDropContext onDragEnd={handleTaskDragEnd}>
                  <Droppable droppableId={`deliverable-${index}-tasks`}>
                    {(provided, snapshot) => (
                      <div 
                        {...provided.droppableProps} 
                        ref={provided.innerRef}
                        className={`space-y-4 ${snapshot.isDraggingOver ? 'bg-blue-50 rounded-lg p-2' : ''}`}
                      >
                        {data.tasks.map((task, taskIndex) => (
                          <Draggable key={task.id} draggableId={task.id} index={taskIndex}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={snapshot.isDragging ? 'z-50' : ''}
                              >
                                <TaskEditor
                                  task={task}
                                  index={taskIndex}
                                  onUpdate={updateTask}
                                  onDelete={deleteTask}
                                  dragHandleProps={provided.dragHandleProps}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              ) : (
                <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                  <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma tarefa adicionada ainda</p>
                  <Button onClick={addTask} size="sm" className="mt-2">
                    Adicionar Primeira Tarefa
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// Auto-save status indicator
function AutoSaveStatus({ isSaving, hasUnsavedChanges, lastSaved }) {
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (isSaving) {
    return (
      <div className="flex items-center gap-2 text-sm text-blue-600">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Salvando automaticamente...</span>
      </div>
    );
  }

  if (hasUnsavedChanges) {
    return (
      <div className="flex items-center gap-2 text-sm text-yellow-600">
        <AlertCircle className="w-4 h-4" />
        <span>Alterações não salvas</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-green-600">
      <CheckCircle2 className="w-4 h-4" />
      <span>Salvo às {formatTime(lastSaved)}</span>
    </div>
  );
}

export default function ServiceTemplateEditor() {
  const { user, agencyId } = useSession();
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  // Estado do template
  const [templateData, setTemplateData] = useState({
    name: '',
    description: '',
    category: DEFAULT_SERVICE_CATEGORY,
    template_category: 'standard',
    is_active: true,
    deliverables: []
  });

  const templateId = React.useMemo(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('id');
    }
    return null;
  }, []);

  const isEditing = Boolean(templateId);

  const loadTemplate = useCallback(async () => {
    if (!templateId || !agencyId) return;
    
    setLoading(true);
    setError('');
    
    try {
      const t = await Service.get(templateId);
      
      if (t.agencyId !== agencyId) {
        throw new Error('Template não encontrado ou sem permissão');
      }
      
      setTemplate(t);
      setTemplateData({
        name: t.name || '',
        description: t.description || '',
        category: t.category || DEFAULT_SERVICE_CATEGORY,
        template_category: t.template_category || 'standard',
        is_active: t.is_active ?? true,
        deliverables: t.deliverables || []
      });
    } catch (e) {
      console.error('Erro ao carregar template:', e);
      setError('Erro ao carregar template. Verifique se ele existe e você tem permissão.');
    } finally {
      setLoading(false);
    }
  }, [templateId, agencyId]);

  useEffect(() => {
    if (isEditing) {
      loadTemplate();
    } else {
      setLoading(false);
    }
  }, [isEditing, loadTemplate]);

  const saveTemplate = useCallback(async (data, silent = false) => {
    if (!agencyId) {
      !silent && toast.error('Erro: ID da agência não encontrado');
      return false;
    }
    
    if (!data.name.trim()) {
      !silent && toast.error('Nome do template é obrigatório');
      return false;
    }

    if (!silent) setSaving(true);
    
    try {
      const saveData = {
        ...data,
        agencyId,
        is_template: true,
        template_metadata: {
          ...template?.template_metadata,
          last_modified_by: user.email,
          last_modified_at: new Date().toISOString()
        }
      };

      if (isEditing) {
        await Service.update(templateId, saveData);
        !silent && toast.success('Template atualizado com sucesso!');
      } else {
        const created = await Service.create(saveData);
        !silent && toast.success('Template criado com sucesso!');
        // Redirecionar para edição do template criado
        window.history.replaceState(null, '', createPageUrl(`service-template-editor?id=${created.id}`));
      }
      
      if (!silent) {
        await loadTemplate(); // Recarregar dados
      }
      
      return true;
    } catch (e) {
      console.error('Erro ao salvar template:', e);
      !silent && toast.error('Erro ao salvar template: ' + e.message);
      return false;
    } finally {
      if (!silent) setSaving(false);
    }
  }, [agencyId, template, user, isEditing, templateId, loadTemplate]);

  // Auto-save integration
  const { isSaving: isAutoSaving, hasUnsavedChanges, lastSaved, forceSave } = useAutoSave(
    templateData, 
    saveTemplate,
    3000 // 3 seconds delay
  );

  const updateTemplateData = (updates) => {
    setTemplateData(prev => ({ ...prev, ...updates }));
  };

  const handleDeliverableDragEnd = (result) => {
    if (!result.destination) return;

    const newDeliverables = Array.from(templateData.deliverables);
    const [reorderedItem] = newDeliverables.splice(result.source.index, 1);
    newDeliverables.splice(result.destination.index, 0, reorderedItem);
    
    // Update phase numbers based on new order
    const updatedDeliverables = newDeliverables.map((deliverable, index) => ({
      ...deliverable,
      phase: index + 1
    }));
    
    updateTemplateData({ deliverables: updatedDeliverables });
  };

  const addDeliverable = () => {
    const newDeliverable = {
      id: `deliverable_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      name: 'Novo Entregável',
      description: '',
      phase: templateData.deliverables.length + 1,
      duration_days: 7,
      category: 'analise_financeira',
      estimated_hours: 8,
      priority: 'medium',
      tasks: []
    };
    
    updateTemplateData({
      deliverables: [...templateData.deliverables, newDeliverable]
    });
  };

  const updateDeliverable = (index, deliverableData) => {
    const newDeliverables = [...templateData.deliverables];
    newDeliverables[index] = { ...newDeliverables[index], ...deliverableData };
    updateTemplateData({ deliverables: newDeliverables });
  };

  const deleteDeliverable = (index) => {
    if (confirm('Tem certeza que deseja excluir este entregável e todas as suas tarefas?')) {
      const newDeliverables = templateData.deliverables.filter((_, i) => i !== index);
      // Reorder phases
      const reorderedDeliverables = newDeliverables.map((deliverable, i) => ({
        ...deliverable,
        phase: i + 1
      }));
      updateTemplateData({ deliverables: reorderedDeliverables });
    }
  };

  const handleBack = () => {
    if (hasUnsavedChanges) {
      if (confirm('Você tem alterações não salvas. Deseja sair mesmo assim?')) {
        window.location.href = createPageUrl('service-templates');
      }
    } else {
      window.location.href = createPageUrl('service-templates');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Building2 className="w-8 h-8 animate-pulse mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando editor...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center max-w-md">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Erro ao carregar</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={handleBack}>
              Voltar para Templates
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const categoryConfig = CATEGORIES.find(c => c.value === templateData.category);
  const totalHours = templateData.deliverables.reduce((sum, d) => 
    sum + d.tasks.reduce((taskSum, t) => taskSum + (t.estimated_hours || 0), 0), 0
  );
  const totalTasks = templateData.deliverables.reduce((sum, d) => sum + (d.tasks?.length || 0), 0);

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              {categoryConfig?.icon} {isEditing ? 'Editar Template' : 'Novo Template'}
            </h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              <span>{templateData.deliverables.length} entregáveis</span>
              <span>{totalTasks} tarefas</span>
              <span>{totalHours}h estimadas</span>
              <AutoSaveStatus 
                isSaving={isAutoSaving} 
                hasUnsavedChanges={hasUnsavedChanges} 
                lastSaved={lastSaved} 
              />
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            onClick={forceSave} 
            disabled={saving || isAutoSaving}
            className="gap-2"
          >
            {(saving || isAutoSaving) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {(saving || isAutoSaving) ? 'Salvando...' : 'Salvar Agora'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">Informações Gerais</TabsTrigger>
          <TabsTrigger value="structure">Estrutura do Serviço</TabsTrigger>
          <TabsTrigger value="preview">Pré-visualização</TabsTrigger>
        </TabsList>
        
        {/* Tab: Informações Gerais */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Template</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="template-name">Nome do Template</Label>
                  <Input
                    id="template-name"
                    value={templateData.name}
                    onChange={(e) => updateTemplateData({ name: e.target.value })}
                    placeholder="Ex: Diagnóstico de Comunicação e Marca"
                  />
                </div>
                
                <div>
                  <Label htmlFor="template-category">Categoria</Label>
                  <Select
                    value={templateData.category}
                    onValueChange={(value) => updateTemplateData({ category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(category => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.icon} {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="template-type">Tipo de Template</Label>
                  <Select
                    value={templateData.template_category}
                    onValueChange={(value) => updateTemplateData({ template_category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {TEMPLATE_CATEGORIES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="template-active"
                    checked={templateData.is_active}
                    onChange={(e) => updateTemplateData({ is_active: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="template-active">Template ativo</Label>
                </div>
              </div>
              
              <div>
                <Label htmlFor="template-description">Descrição</Label>
                <Textarea
                  id="template-description"
                  value={templateData.description}
                  onChange={(e) => updateTemplateData({ description: e.target.value })}
                  placeholder="Descreva o que este template de serviço oferece..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Tab: Estrutura do Serviço com Drag & Drop */}
        <TabsContent value="structure">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Move3D className="w-5 h-5" />
                    Estrutura de Entregáveis
                  </CardTitle>
                  <p className="text-muted-foreground mt-1">
                    Defina as fases do serviço e suas respectivas tarefas. Arraste para reordenar.
                  </p>
                </div>
                <Button onClick={addDeliverable} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Adicionar Entregável
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {templateData.deliverables.length > 0 ? (
                  <DragDropContext onDragEnd={handleDeliverableDragEnd}>
                    <Droppable droppableId="deliverables">
                      {(provided, snapshot) => (
                        <div 
                          {...provided.droppableProps} 
                          ref={provided.innerRef}
                          className={`space-y-4 ${snapshot.isDraggingOver ? 'bg-blue-50 rounded-lg p-4' : ''}`}
                        >
                          {templateData.deliverables.map((deliverable, index) => (
                            <Draggable key={deliverable.id} draggableId={deliverable.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={snapshot.isDragging ? 'z-50 rotate-2 scale-105' : ''}
                                >
                                  <DeliverableEditor
                                    deliverable={deliverable}
                                    index={index}
                                    onUpdate={updateDeliverable}
                                    onDelete={deleteDeliverable}
                                    dragHandleProps={provided.dragHandleProps}
                                  />
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                ) : (
                  <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <h3 className="font-medium mb-2">Nenhum entregável definido</h3>
                    <p className="mb-4">Comece adicionando o primeiro entregável do seu serviço</p>
                    <Button onClick={addDeliverable} className="gap-2">
                      <Sparkles className="w-4 h-4" />
                      Adicionar Primeiro Entregável
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Tab: Pré-visualização */}
        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>Pré-visualização do Template</CardTitle>
              <p className="text-muted-foreground">
                Como este template aparecerá quando usado para criar um serviço
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Resumo */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                  <div className="flex items-start gap-3 mb-4">
                    <span className="text-2xl">{categoryConfig?.icon}</span>
                    <div>
                      <h3 className="font-semibold text-xl text-blue-900 mb-1">{templateData.name}</h3>
                      <p className="text-blue-700 mb-3">{templateData.description}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="bg-white rounded-lg p-3 border border-blue-200">
                      <div className="text-blue-600 font-medium">Entregáveis</div>
                      <div className="text-2xl font-bold text-blue-900">{templateData.deliverables.length}</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-blue-200">
                      <div className="text-blue-600 font-medium">Total de Tarefas</div>
                      <div className="text-2xl font-bold text-blue-900">{totalTasks}</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-blue-200">
                      <div className="text-blue-600 font-medium">Horas Estimadas</div>
                      <div className="text-2xl font-bold text-blue-900">{totalHours}h</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-blue-200">
                      <div className="text-blue-600 font-medium">Categoria</div>
                      <div className="text-sm font-medium text-blue-900">{categoryConfig?.label}</div>
                    </div>
                  </div>
                </div>
                
                {/* Estrutura */}
                <div className="space-y-4">
                  {templateData.deliverables.map((deliverable, index) => (
                    <div key={deliverable.id || index} className="border rounded-lg p-6 bg-gradient-to-r from-gray-50 to-slate-50">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                              Fase {deliverable.phase}
                            </Badge>
                            <h4 className="font-semibold text-lg">{deliverable.name}</h4>
                          </div>
                          <p className="text-gray-600 mb-2">{deliverable.description}</p>
                        </div>
                        <div className="text-right text-sm text-gray-500 bg-white rounded-lg p-3 border">
                          <div className="font-medium">{deliverable.duration_days} dias</div>
                          <div>{deliverable.tasks?.length || 0} tarefas</div>
                        </div>
                      </div>
                      
                      {/* Tarefas */}
                      {deliverable.tasks && deliverable.tasks.length > 0 && (
                        <div className="space-y-3 ml-4">
                          {deliverable.tasks.map((task, taskIndex) => (
                            <div key={task.id || taskIndex} className="flex items-start justify-between p-4 bg-white rounded-lg border shadow-sm">
                              <div className="flex-1">
                                <div className="font-medium text-gray-900 mb-1">{task.title}</div>
                                {task.description && (
                                  <div className="text-sm text-gray-600 mb-2">{task.description}</div>
                                )}
                                {task.checklist && task.checklist.length > 0 && (
                                  <div className="mt-2">
                                    <div className="text-xs text-gray-500 font-medium mb-1">
                                      Checklist ({task.checklist.length} itens):
                                    </div>
                                    <div className="space-y-1">
                                      {task.checklist.slice(0, 3).map((item, itemIndex) => (
                                        <div key={itemIndex} className="flex items-center gap-2 text-xs text-gray-600">
                                          <div className="w-3 h-3 border border-gray-300 rounded"></div>
                                          <span>{item.text}</span>
                                          {item.assignedRole && (
                                            <Badge variant="outline" className="text-xs h-4 px-1">
                                              {ROLES.find(r => r.value === item.assignedRole)?.label}
                                            </Badge>
                                          )}
                                          {item.relativeDueDays !== null && (
                                            <span className="text-gray-400">+{item.relativeDueDays}d</span>
                                          )}
                                        </div>
                                      ))}
                                      {task.checklist.length > 3 && (
                                        <div className="text-xs text-gray-400">
                                          ... e mais {task.checklist.length - 3} itens
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 ml-4 text-right">
                                <div>{task.estimated_hours}h</div>
                                <Badge className={PRIORITIES.find(p => p.value === task.priority)?.color}>
                                  {PRIORITIES.find(p => p.value === task.priority)?.label}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {templateData.deliverables.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Adicione entregáveis para ver a pré-visualização</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}