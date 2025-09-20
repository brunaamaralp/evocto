import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { Task } from '@/api/entities';
import { Client } from '@/api/entities';
import { Service } from '@/api/entities';
import { User } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  Plus, X, Save, Calendar, Clock, User as UserIcon, 
  Target, AlertTriangle, CheckSquare, Trash2
} from 'lucide-react';
import { toast } from 'sonner';

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

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Baixa', color: 'bg-gray-100 text-gray-700' },
  { value: 'medium', label: 'Média', color: 'bg-blue-100 text-blue-700' },
  { value: 'high', label: 'Alta', color: 'bg-orange-100 text-orange-700' },
  { value: 'urgent', label: 'Urgente', color: 'bg-red-100 text-red-700' }
];

const STATUS_OPTIONS = [
  { value: 'todo', label: 'A Fazer' },
  { value: 'in_progress', label: 'Em Andamento' },
  { value: 'in_review', label: 'Em Revisão' },
  { value: 'completed', label: 'Concluída' },
  { value: 'blocked', label: 'Bloqueada' },
  { value: 'cancelled', label: 'Cancelada' }
];

/**
 * Modal para criação e edição de tarefas
 */
export default function TaskModal({ 
  isOpen, 
  onClose, 
  task = null, 
  onTaskSaved,
  preSelectedClientId = null 
}) {
  const { user, agencyId } = useSession();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [checklist, setChecklist] = useState([]);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    clientId: preSelectedClientId || '',
    serviceId: '',
    type: 'analise_dados',
    priority: 'medium',
    status: 'todo',
    assignedTo: '',
    dueDate: '',
    startDate: '',
    estimatedHours: 2,
    tags: []
  });

  // Carregar dados iniciais
  useEffect(() => {
    const loadData = async () => {
      if (!isOpen || !agencyId) return;
      
      try {
        const [clientsData, servicesData, teamData] = await Promise.all([
          Client.filter({ agencyId }),
          Service.filter({ agencyId, is_template: false }),
          User.filter({ agencyId, role: { $in: ['owner', 'admin', 'team'] } })
        ]);
        
        setClients(clientsData || []);
        setServices(servicesData || []);
        setTeamMembers(teamData || []);
        
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast.error('Erro ao carregar dados necessários');
      }
    };

    loadData();
  }, [isOpen, agencyId]);

  // Preencher form com dados da tarefa existente
  useEffect(() => {
    if (task && isOpen) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        clientId: task.clientId || preSelectedClientId || '',
        serviceId: task.serviceId || '',
        type: task.type || 'analise_dados',
        priority: task.priority || 'medium',
        status: task.status || 'todo',
        assignedTo: task.assignedTo || '',
        dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
        startDate: task.startDate ? task.startDate.split('T')[0] : '',
        estimatedHours: task.estimatedHours || 2,
        tags: task.tags || []
      });
      
      setChecklist(task.checklist || []);
    } else if (!task && isOpen) {
      // Reset para nova tarefa
      setFormData({
        title: '',
        description: '',
        clientId: preSelectedClientId || '',
        serviceId: '',
        type: 'analise_dados',
        priority: 'medium',
        status: 'todo',
        assignedTo: '',
        dueDate: '',
        startDate: '',
        estimatedHours: 2,
        tags: []
      });
      setChecklist([]);
    }
  }, [task, isOpen, preSelectedClientId]);

  // Filtrar serviços pelo cliente selecionado
  const filteredServices = formData.clientId 
    ? services.filter(s => s.clientId === formData.clientId)
    : services;

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addChecklistItem = () => {
    const newItem = {
      id: `checklist_${Date.now()}`,
      text: '',
      completed: false,
      required: false
    };
    setChecklist(prev => [...prev, newItem]);
  };

  const updateChecklistItem = (index, field, value) => {
    setChecklist(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const removeChecklistItem = (index) => {
    setChecklist(prev => prev.filter((_, i) => i !== index));
  };

  const addTag = (tagText) => {
    if (tagText && !formData.tags.includes(tagText)) {
      updateFormData('tags', [...formData.tags, tagText]);
    }
  };

  const removeTag = (tagToRemove) => {
    updateFormData('tags', formData.tags.filter(tag => tag !== tagToRemove));
  };

  const validateTask = () => {
    const errors = [];
    
    if (!formData.title.trim()) {
      errors.push('Título da tarefa é obrigatório');
    }
    
    if (!formData.clientId) {
      errors.push('Cliente deve ser selecionado');
    }
    
    if (!formData.type) {
      errors.push('Tipo da tarefa é obrigatório');
    }
    
    if (formData.dueDate && formData.startDate) {
      if (new Date(formData.dueDate) < new Date(formData.startDate)) {
        errors.push('Data limite não pode ser anterior à data de início');
      }
    }
    
    return errors;
  };

  const handleSave = async () => {
    const validationErrors = validateTask();
    
    if (validationErrors.length > 0) {
      toast.error('Corrija os erros:', {
        description: validationErrors.join('; ')
      });
      return;
    }

    setLoading(true);
    
    try {
      const taskData = {
        ...formData,
        agencyId,
        assignedBy: user?.id,
        checklist: checklist.filter(item => item.text.trim()),
        // Converter datas para formato ISO se fornecidas
        dueDate: formData.dueDate ? new Date(formData.dueDate + 'T23:59:59').toISOString() : null,
        startDate: formData.startDate ? new Date(formData.startDate + 'T00:00:00').toISOString() : null,
        kanbanColumn: formData.status,
        kanbanPosition: 0,
        progress: formData.status === 'completed' ? 100 : 0
      };

      let savedTask;
      
      if (task) {
        savedTask = await Task.update(task.id, taskData);
        toast.success('Tarefa atualizada com sucesso!');
      } else {
        savedTask = await Task.create(taskData);
        toast.success('Tarefa criada com sucesso!');
      }

      if (onTaskSaved) {
        onTaskSaved(savedTask);
      }

      onClose();
      
    } catch (error) {
      console.error('Erro ao salvar tarefa:', error);
      toast.error('Erro ao salvar tarefa: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || '';
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        
        {/* Header */}
        <DialogHeader className="sticky top-0 bg-white border-b p-6 z-10">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">
                {task ? 'Editar Tarefa' : 'Nova Tarefa'}
              </DialogTitle>
              {formData.clientId && (
                <p className="text-sm text-gray-600 mt-1">
                  Cliente: <strong>{getClientName(formData.clientId)}</strong>
                </p>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6">
          
          {/* Informações básicas */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => updateFormData('title', e.target.value)}
                placeholder="Ex: Analisar relatórios financeiros do Q4"
                className="text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => updateFormData('description', e.target.value)}
                placeholder="Descreva os detalhes da tarefa..."
                rows={3}
              />
            </div>
          </div>

          {/* Seleção de cliente e serviço */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client">Cliente *</Label>
              <Select
                value={formData.clientId}
                onValueChange={(value) => {
                  updateFormData('clientId', value);
                  updateFormData('serviceId', ''); // Reset service quando cliente muda
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="service">Serviço (Opcional)</Label>
              <Select
                value={formData.serviceId}
                onValueChange={(value) => updateFormData('serviceId', value)}
                disabled={!formData.clientId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o serviço" />
                </SelectTrigger>
                <SelectContent>
                  {filteredServices.map(service => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tipo e prioridade */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => updateFormData('type', value)}
              >
                <SelectTrigger>
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

            <div className="space-y-2">
              <Label htmlFor="priority">Prioridade</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => updateFormData('priority', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map(priority => (
                    <SelectItem key={priority.value} value={priority.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${priority.color.split(' ')[0]}`}></div>
                        {priority.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => updateFormData('status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Responsável e horas estimadas */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="assignedTo">Responsável</Label>
              <Select
                value={formData.assignedTo}
                onValueChange={(value) => updateFormData('assignedTo', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o responsável" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map(member => (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex items-center gap-2">
                        <UserIcon className="w-4 h-4" />
                        {member.full_name || member.email}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimatedHours">Horas Estimadas</Label>
              <Input
                id="estimatedHours"
                type="number"
                min="0"
                step="0.5"
                value={formData.estimatedHours}
                onChange={(e) => updateFormData('estimatedHours', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Datas */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Data de Início</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => updateFormData('startDate', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Data Limite</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => updateFormData('dueDate', e.target.value)}
              />
            </div>
          </div>

          <Separator />

          {/* Checklist */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Lista de Verificação</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addChecklistItem}
              >
                <Plus className="w-4 h-4 mr-1" />
                Adicionar Item
              </Button>
            </div>

            {checklist.length > 0 && (
              <div className="space-y-2">
                {checklist.map((item, index) => (
                  <div key={item.id || index} className="flex items-center gap-2 p-2 border rounded-lg">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={(e) => updateChecklistItem(index, 'completed', e.target.checked)}
                      className="rounded"
                    />
                    <Input
                      value={item.text}
                      onChange={(e) => updateChecklistItem(index, 'text', e.target.value)}
                      placeholder="Item da lista..."
                      className="flex-1 h-8"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeChecklistItem(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Tags */}
          <div className="space-y-3">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags.map(tag => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => removeTag(tag)}
                >
                  {tag}
                  <X className="w-3 h-3 ml-1" />
                </Badge>
              ))}
            </div>
            <Input
              placeholder="Adicionar tag... (pressione Enter)"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  addTag(e.target.value.trim());
                  e.target.value = '';
                }
              }}
            />
          </div>
        </div>

        {/* Footer com ações */}
        <div className="sticky bottom-0 bg-white border-t p-6">
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {task ? 'Atualizar' : 'Criar'} Tarefa
                </>
              )}
            </Button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}