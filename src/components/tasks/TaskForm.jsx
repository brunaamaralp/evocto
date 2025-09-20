
import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { Task } from '@/api/entities';
import { User } from '@/api/entities';
import { Client } from '@/api/entities';
import { Service } from '@/api/entities'; // Added import
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
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
import { 
  Calendar, Clock, User as UserIcon, Tag, Plus, X, 
  Paperclip, CheckSquare, Square, Upload, Timer,
  Target, Flag, AlertCircle, MessageCircle, Play,
  Pause, RotateCcw, Save, Trash2, FileText, Lightbulb
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import TaskNotificationService from '@/components/notifications/TaskNotificationService';
import { InvokeLLM } from "@/api/integrations";

// Status das tarefas
const TASK_STATUSES = [
  { value: 'backlog', label: 'Backlog', color: 'bg-gray-100 text-gray-700' },
  { value: 'todo', label: 'A Fazer', color: 'bg-blue-100 text-blue-700' },
  { value: 'in_progress', label: 'Em Progresso', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'in_review', label: 'Em Revisão', color: 'bg-purple-100 text-purple-700' },
  { value: 'completed', label: 'Concluído', color: 'bg-green-100 text-green-700' },
  { value: 'cancelled', label: 'Cancelado', color: 'bg-red-100 text-red-700' },
  { value: 'blocked', label: 'Bloqueado', color: 'bg-orange-100 text-orange-700' }
];

// Prioridades
const TASK_PRIORITIES = [
  { value: 'low', label: 'Baixa', color: 'text-green-600' },
  { value: 'medium', label: 'Média', color: 'text-yellow-600' },
  { value: 'high', color: 'text-orange-600', label: 'Alta' },
  { value: 'urgent', label: 'Urgente', color: 'text-red-600' }
];

// Tipos de tarefa
const TASK_TYPES = [
  { value: 'deliverable', label: 'Entregável', icon: Target },
  { value: 'creative', label: 'Criativo', icon: Target },
  { value: 'review', label: 'Revisão', icon: CheckSquare },
  { value: 'meeting', label: 'Reunião', icon: Calendar },
  { value: 'administrative', label: 'Administrativo', icon: FileText },
  { value: 'planning', label: 'Planejamento', icon: Calendar }
];

// Componente de checklist
const ChecklistManager = ({ checklist = [], onChange }) => {
  const [newItem, setNewItem] = useState('');

  const addItem = () => {
    if (!newItem.trim()) return;
    
    const item = {
      id: Date.now().toString(),
      text: newItem.trim(),
      completed: false
    };
    
    onChange([...checklist, item]);
    setNewItem('');
  };

  const toggleItem = (itemId) => {
    onChange(checklist.map(item => 
      item.id === itemId 
        ? { ...item, completed: !item.completed, completedAt: !item.completed ? new Date().toISOString() : null }
        : item
    ));
  };

  const removeItem = (itemId) => {
    onChange(checklist.filter(item => item.id !== itemId));
  };

  const completedCount = checklist.filter(item => item.completed).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900">Lista de Verificação</h4>
        {checklist.length > 0 && (
          <Badge variant="secondary">
            {completedCount}/{checklist.length} concluídos
          </Badge>
        )}
      </div>

      {checklist.length > 0 && (
        <div className="mb-3">
          <Progress value={(completedCount / checklist.length) * 100} className="h-2" />
        </div>
      )}

      <div className="space-y-2">
        {checklist.map((item) => (
          <div key={item.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
            <button
              onClick={() => toggleItem(item.id)}
              className="flex-shrink-0"
            >
              {item.completed ? (
                <CheckSquare className="w-4 h-4 text-green-600" />
              ) : (
                <Square className="w-4 h-4 text-gray-400" />
              )}
            </button>
            <span className={`flex-1 text-sm ${item.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
              {item.text}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeItem(item.id)}
              className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Adicionar item à lista..."
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addItem()}
          className="flex-1"
        />
        <Button onClick={addItem} size="sm">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

// Componente de tracking de tempo
const TimeTracker = ({ timeEntries = [], onUpdate, isRunning, onToggleTimer }) => {
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState(null);

  const totalHours = timeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);

  const startTimer = () => {
    setStartTime(new Date());
    onToggleTimer(true);
  };

  const stopTimer = () => {
    if (!startTime) return;

    const endTime = new Date();
    const duration = (endTime - startTime) / (1000 * 60 * 60); // Convert to hours

    const newEntry = {
      userId: 'current-user', // Replace with actual user ID
      startTime: endTime.toISOString(), // Use endTime as startTime for display consistent with duration
      endTime: endTime.toISOString(),
      duration: duration,
      description: description || 'Trabalho na tarefa'
    };

    onUpdate([...timeEntries, newEntry]);
    setStartTime(null);
    setDescription('');
    onToggleTimer(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900">Controle de Tempo</h4>
        <Badge variant="secondary">
          {totalHours.toFixed(1)}h registradas
        </Badge>
      </div>

      {/* Timer controls */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center gap-3 mb-3">
          <Button
            onClick={isRunning ? stopTimer : startTimer}
            variant={isRunning ? "destructive" : "default"}
            size="sm"
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4 mr-2" />
                Parar
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Iniciar
              </>
            )}
          </Button>
          
          {isRunning && startTime && (
            <div className="text-sm text-gray-600">
              Iniciado às {format(startTime, 'HH:mm', { locale: ptBR })}
            </div>
          )}
        </div>

        {isRunning && (
          <Input
            placeholder="Descrição do que está fazendo..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="text-sm"
          />
        )}
      </div>

      {/* Time entries list */}
      {timeEntries.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-sm font-medium text-gray-700">Registros de Tempo</h5>
          {timeEntries.slice(-5).map((entry, index) => (
            <div key={index} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
              <div>
                <div className="font-medium">{entry.description}</div>
                <div className="text-gray-500">
                  {format(new Date(entry.startTime), 'dd/MM HH:mm', { locale: ptBR })}
                </div>
              </div>
              <div className="font-medium text-blue-600">
                {entry.duration.toFixed(1)}h
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Componente principal do formulário
export const TaskForm = ({ 
  task = null, 
  isOpen, 
  onClose, 
  onSave, 
  clientId, 
  cycleId,
  serviceId,
  defaultStatus = 'todo' 
}) => {
  const { user } = useSession();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: defaultStatus,
    priority: 'medium',
    type: 'deliverable',
    assignedTo: '',
    dueDate: '',
    startDate: '',
    estimatedHours: '',
    tags: [],
    checklist: [],
    timeEntries: [],
    progress: 0,
    ...task
  });
  
  const [loading, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [newTag, setNewTag] = useState('');
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Carregar usuários para atribuição com useCallback
  const loadUsers = useCallback(async () => {
    try {
      if (user?.agencyId) { // Ensure agencyId exists before fetching
        const agencyUsers = await User.filter({ agencyId: user.agencyId });
        setUsers(agencyUsers);
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  }, [user?.agencyId]);

  // useEffect com dependência correta
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Resetar form quando abrir/fechar
  useEffect(() => {
    if (isOpen && task) {
      setFormData({
        ...task,
        assignedTo: task.assignedTo === null ? "" : task.assignedTo // Normalize null to empty string for Select
      });
    } else if (isOpen && !task) {
      setFormData({
        title: '',
        description: '',
        status: defaultStatus,
        priority: 'medium',
        type: 'deliverable',
        assignedTo: '',
        dueDate: '',
        startDate: '',
        estimatedHours: '',
        tags: [],
        checklist: [],
        timeEntries: [],
        progress: 0,
        clientId,
        cycleId,
        serviceId,
        agencyId: user?.agencyId
      });
    }
  }, [isOpen, task, defaultStatus, clientId, cycleId, serviceId, user?.agencyId]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addTag = () => {
    if (!newTag.trim() || formData.tags.includes(newTag.trim())) return;
    
    setFormData(prev => ({
      ...prev,
      tags: [...prev.tags, newTag.trim()]
    }));
    setNewTag('');
  };

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const suggestWithAI = async () => {
    try {
      setAiLoading(true);
      // Carregar contexto básico
      let client = null;
      let service = null;
      if (formData.clientId) client = await Client.get(formData.clientId);
      if (formData.serviceId) service = await Service.get(formData.serviceId);

      const prompt = `
Você é um assistente de produtividade. Sugira um título curto e uma descrição objetiva para uma tarefa.
Contexto:
- Cliente: ${client?.name || 'N/D'} (${client?.industry || 'indústria N/D'})
- Serviço: ${service?.name || 'N/D'} [${service?.category || 'categoria N/D'}]
- Tipo de tarefa: ${formData.type}
- Prioridade: ${formData.priority}
- Status atual: ${formData.status}
- Tags: ${(formData.tags || []).join(', ') || 'sem tags'}

Responda em pt-BR com um título claro e uma descrição objetiva.
      `.trim();

      const schema = {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" }
        },
        required: ["title", "description"]
      };

      const res = await InvokeLLM({
        prompt,
        response_json_schema: schema
      });

      const { title, description } = res || {};
      if (title || description) {
        setFormData((prev) => ({
          ...prev,
          title: title || prev.title,
          description: description || prev.description
        }));
        toast.success("Sugestões aplicadas");
      } else {
        toast.message("Não foi possível gerar sugestões no momento");
      }
    } catch (error) {
      console.error("Erro ao sugerir com IA:", error);
      toast.error("Erro ao gerar sugestões de IA.");
    } finally {
      setAiLoading(false);
    }
  };

  // Salvar tarefa com notificações
  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('Título da tarefa é obrigatório');
      return;
    }

    try {
      setSaving(true);
      
      const taskData = {
        ...formData,
        agencyId: user.agencyId,
        clientId: clientId || formData.clientId,
        cycleId: cycleId || formData.cycleId,
        serviceId: serviceId || formData.serviceId,
        estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : null,
        // Ensure assignedTo is null or a valid ID, convert "" to null for backend if necessary
        assignedTo: formData.assignedTo === "" ? null : formData.assignedTo,
        checklist: formData.checklist.map(item => ({
          ...item,
          id: item.id || `checklist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }))
      };

      let savedTask;
      const isCreating = !task?.id;
      const previousStatus = task?.status;

      if (isCreating) {
        // Criar nova tarefa
        taskData.assignedBy = user.id;
        savedTask = await Task.create(taskData);
        
        // Notificação de tarefa atribuída
        if (savedTask.assignedTo && savedTask.assignedTo !== user.id) {
          await TaskNotificationService.createTaskAssignedNotification(savedTask, user);
        }
        
        toast.success('Tarefa criada com sucesso!');
      } else {
        // Atualizar tarefa existente
        savedTask = await Task.update(task.id, taskData);
        
        // Notificações baseadas nas mudanças
        if (previousStatus !== savedTask.status) {
          await TaskNotificationService.createTaskStatusChangedNotification(savedTask, previousStatus, user);
        }
        
        if (savedTask.status === 'completed' && previousStatus !== 'completed') {
          await TaskNotificationService.createTaskCompletedNotification(savedTask, user);
        }
        
        // Se a atribuição mudou
        if (task.assignedTo !== savedTask.assignedTo && savedTask.assignedTo) {
          await TaskNotificationService.createTaskAssignedNotification(savedTask, user);
        }
        
        toast.success('Tarefa atualizada com sucesso!');
      }

      onSave(savedTask);
      onClose();
      
    } catch (error) {
      console.error('Erro ao salvar tarefa:', error);
      toast.error('Erro ao salvar tarefa');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    
    if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
      try {
        await Task.delete(task.id);
        toast.success('Tarefa excluída com sucesso');
        onClose();
      } catch (error) {
        console.error('Erro ao excluir tarefa:', error);
        toast.error('Erro ao excluir tarefa');
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {task ? 'Editar Tarefa' : 'Nova Tarefa'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações básicas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Título *
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={suggestWithAI}
                  disabled={aiLoading}
                  className="gap-2"
                  title="Sugerir com IA"
                >
                  {aiLoading ? (
                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Lightbulb className="w-4 h-4" />
                  )}
                  Sugerir com IA
                </Button>
              </div>
              <Input
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Digite o título da tarefa..."
                className="w-full"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Descreva a tarefa..."
                rows={3}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleInputChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      <div className="flex items-center gap-2">
                        <Badge className={`${status.color} border-0 text-xs`}>
                          {status.label}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prioridade
              </label>
              <Select
                value={formData.priority}
                onValueChange={(value) => handleInputChange('priority', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((priority) => (
                    <SelectItem key={priority.value} value={priority.value}>
                      <span className={priority.color}>{priority.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo
              </label>
              <Select
                value={formData.type}
                onValueChange={(value) => handleInputChange('type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Responsável
              </label>
              <Select
                value={formData.assignedTo}
                onValueChange={(value) => handleInputChange('assignedTo', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar responsável..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={""}>Não atribuído</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data de Início
              </label>
              <Input
                type="datetime-local"
                value={formData.startDate ? formData.startDate.slice(0, 16) : ''}
                onChange={(e) => handleInputChange('startDate', e.target.value ? new Date(e.target.value).toISOString() : '')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Limite
              </label>
              <Input
                type="datetime-local"
                value={formData.dueDate ? formData.dueDate.slice(0, 16) : ''}
                onChange={(e) => handleInputChange('dueDate', e.target.value ? new Date(e.target.value).toISOString() : '')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Horas Estimadas
              </label>
              <Input
                type="number"
                step="0.5"
                min="0"
                value={formData.estimatedHours}
                onChange={(e) => handleInputChange('estimatedHours', e.target.value)}
                placeholder="Ex: 2.5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Progresso (%)
              </label>
              <div className="space-y-2">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.progress}
                  onChange={(e) => handleInputChange('progress', parseInt(e.target.value) || 0)}
                />
                <Progress value={formData.progress} className="h-2" />
              </div>
            </div>
          </div>

          <Separator />

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {formData.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <button onClick={() => removeTag(tag)} className="ml-1 hover:text-red-600">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Adicionar tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTag()}
                className="flex-1"
              />
              <Button onClick={addTag} size="sm" variant="outline">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Checklist */}
          <ChecklistManager
            checklist={formData.checklist}
            onChange={(checklist) => handleInputChange('checklist', checklist)}
          />

          <Separator />

          {/* Time Tracking */}
          <TimeTracker
            timeEntries={formData.timeEntries}
            isRunning={isTimerRunning}
            onUpdate={(timeEntries) => handleInputChange('timeEntries', timeEntries)}
            onToggleTimer={setIsTimerRunning}
          />

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div>
              {task && (
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  className="mr-2"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {task ? 'Atualizar' : 'Criar'} Tarefa
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaskForm;
