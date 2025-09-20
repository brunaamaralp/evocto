import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { Task } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ArrowRight, Plus, X, AlertTriangle, CheckCircle,
  Clock, Link2, Unlink, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

const DEPENDENCY_TYPES = {
  finish_to_start: {
    label: 'Terminar para Iniciar',
    description: 'Esta tarefa só pode começar quando a dependência terminar',
    icon: ArrowRight,
    color: 'bg-blue-100 text-blue-700'
  },
  start_to_start: {
    label: 'Iniciar para Iniciar',
    description: 'Esta tarefa pode começar quando a dependência iniciar',
    icon: Link2,
    color: 'bg-green-100 text-green-700'
  },
  finish_to_finish: {
    label: 'Terminar para Terminar',
    description: 'Esta tarefa deve terminar junto com a dependência',
    icon: Link2,
    color: 'bg-orange-100 text-orange-700'
  },
  start_to_finish: {
    label: 'Iniciar para Terminar',
    description: 'Esta tarefa deve terminar quando a dependência iniciar',
    icon: ArrowRight,
    color: 'bg-purple-100 text-purple-700'
  }
};

const STATUS_INFO = {
  todo: { color: 'bg-gray-100 text-gray-700', canStart: false },
  in_progress: { color: 'bg-blue-100 text-blue-700', canStart: true },
  in_review: { color: 'bg-purple-100 text-purple-700', canStart: true },
  completed: { color: 'bg-green-100 text-green-700', canStart: true },
  cancelled: { color: 'bg-red-100 text-red-700', canStart: false },
  blocked: { color: 'bg-orange-100 text-orange-700', canStart: false }
};

export default function TaskDependencies({ 
  task, 
  onUpdate, 
  dependencyStatus, 
  onDependencyChange 
}) {
  const { user } = useSession();
  const [availableTasks, setAvailableTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDependency, setNewDependency] = useState({
    taskId: '',
    type: 'finish_to_start',
    description: ''
  });

  const loadAvailableTasks = useCallback(async () => {
    try {
      // Buscar tarefas do mesmo cliente, excluindo a atual e suas dependências existentes
      const allTasks = await Task.filter({
        agencyId: user.data?.agencyId,
        clientId: task.clientId
      });

      const existingDeps = task.dependencies?.map(dep => dep.taskId) || [];
      const available = allTasks.filter(t => 
        t.id !== task.id && 
        !existingDeps.includes(t.id) &&
        t.status !== 'cancelled'
      );

      setAvailableTasks(available);
    } catch (error) {
      console.error('Erro ao carregar tarefas:', error);
    }
  }, [task.id, task.clientId, task.dependencies, user.data?.agencyId]);

  useEffect(() => {
    loadAvailableTasks();
  }, [loadAvailableTasks]);

  const addDependency = async () => {
    if (!newDependency.taskId) {
      toast.error('Selecione uma tarefa');
      return;
    }

    setLoading(true);
    try {
      const dependencies = task.dependencies || [];
      
      // Verificar se já existe
      if (dependencies.some(dep => dep.taskId === newDependency.taskId)) {
        toast.error('Dependência já existe');
        return;
      }

      const dependency = {
        taskId: newDependency.taskId,
        type: newDependency.type,
        description: newDependency.description.trim(),
        isResolved: false
      };

      const updatedDependencies = [...dependencies, dependency];
      
      await Task.update(task.id, { 
        dependencies: updatedDependencies 
      });

      // Adicionar comentário automático
      const dependentTask = availableTasks.find(t => t.id === newDependency.taskId);
      const comments = task.comments || [];
      comments.push({
        id: `comment_${Date.now()}`,
        userId: user.id,
        userEmail: user.email,
        userName: user.full_name || user.email,
        content: `Adicionou dependência: ${dependentTask?.title || 'Tarefa'} (${DEPENDENCY_TYPES[newDependency.type].label})`,
        type: 'system',
        createdAt: new Date().toISOString(),
        isEdited: false
      });

      const updatedTask = { 
        ...task, 
        dependencies: updatedDependencies,
        comments
      };
      
      onUpdate(updatedTask);
      
      // Recarregar tarefas disponíveis e status de dependências
      await loadAvailableTasks();
      if (onDependencyChange) {
        await onDependencyChange(updatedTask);
      }
      
      setNewDependency({ taskId: '', type: 'finish_to_start', description: '' });
      setShowAddForm(false);
      toast.success('Dependência adicionada!');

    } catch (error) {
      console.error('Erro ao adicionar dependência:', error);
      toast.error('Erro ao adicionar dependência');
    } finally {
      setLoading(false);
    }
  };

  const removeDependency = async (taskId) => {
    if (!confirm('Tem certeza que deseja remover esta dependência?')) return;

    setLoading(true);
    try {
      const dependencies = task.dependencies || [];
      const dependency = dependencies.find(dep => dep.taskId === taskId);
      const updatedDependencies = dependencies.filter(dep => dep.taskId !== taskId);

      await Task.update(task.id, { 
        dependencies: updatedDependencies 
      });

      // Adicionar comentário automático
      const comments = task.comments || [];
      comments.push({
        id: `comment_${Date.now()}`,
        userId: user.id,
        userEmail: user.email,
        userName: user.full_name || user.email,
        content: `Removeu dependência: ${dependency?.description || 'Tarefa'}`,
        type: 'system',
        createdAt: new Date().toISOString(),
        isEdited: false
      });

      const updatedTask = { 
        ...task, 
        dependencies: updatedDependencies,
        comments
      };
      
      onUpdate(updatedTask);
      
      // Recarregar tarefas disponíveis e status de dependências
      await loadAvailableTasks();
      if (onDependencyChange) {
        await onDependencyChange(updatedTask);
      }
      
      toast.success('Dependência removida!');

    } catch (error) {
      console.error('Erro ao remover dependência:', error);
      toast.error('Erro ao remover dependência');
    } finally {
      setLoading(false);
    }
  };

  const checkDependencyStatus = (dependency, depTask) => {
    if (!depTask) return { isResolved: false, reason: 'Tarefa não encontrada' };

    switch (dependency.type) {
      case 'finish_to_start':
        return { 
          isResolved: depTask.status === 'completed',
          reason: depTask.status === 'completed' ? 'Tarefa concluída' : `Aguardando conclusão (${depTask.status})`
        };
      case 'start_to_start':
        return { 
          isResolved: ['in_progress', 'in_review', 'completed'].includes(depTask.status),
          reason: ['in_progress', 'in_review', 'completed'].includes(depTask.status) ? 
            'Tarefa iniciada' : `Aguardando início (${depTask.status})`
        };
      case 'finish_to_finish':
        return { 
          isResolved: depTask.status === 'completed',
          reason: depTask.status === 'completed' ? 'Tarefa concluída' : `Aguardando conclusão (${depTask.status})`
        };
      case 'start_to_finish':
        return { 
          isResolved: ['in_progress', 'in_review', 'completed'].includes(depTask.status),
          reason: ['in_progress', 'in_review', 'completed'].includes(depTask.status) ? 
            'Tarefa iniciada' : `Aguardando início (${depTask.status})`
        };
      default:
        return { isResolved: false, reason: 'Tipo de dependência desconhecido' };
    }
  };

  const dependencies = task.dependencies || [];

  return (
    <div className="space-y-4">
      {/* Status Geral */}
      <Card className={!dependencyStatus.canStart ? 'border-orange-200 bg-orange-50' : 'border-green-200 bg-green-50'}>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {dependencyStatus.canStart ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              )}
              <span className={`font-medium ${dependencyStatus.canStart ? 'text-green-800' : 'text-orange-800'}`}>
                {dependencyStatus.canStart ? 'Pode iniciar' : 'Bloqueada por dependências'}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDependencyChange && onDependencyChange(task)}
                disabled={loading}
                className="flex items-center gap-1"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              
              {availableTasks.length > 0 && (
                <Button
                  size="sm"
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar
                </Button>
              )}
            </div>
          </div>

          {!dependencyStatus.canStart && dependencyStatus.blockedBy.length > 0 && (
            <div className="mt-3 text-sm text-orange-700">
              <p className="font-medium">Tarefas pendentes:</p>
              <ul className="mt-1 space-y-1">
                {dependencyStatus.blockedBy.map(({ task: depTask, dependency }) => (
                  <li key={dependency.taskId} className="flex items-center gap-2">
                    <ArrowRight className="w-3 h-3" />
                    <span>{depTask?.title || 'Tarefa não encontrada'}</span>
                    <Badge className={STATUS_INFO[depTask?.status]?.color || 'bg-gray-100 text-gray-700'} variant="secondary">
                      {depTask?.status || 'desconhecido'}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Formulário de Adição */}
      {showAddForm && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Adicionar Dependência
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Tarefa Dependente
              </label>
              <Select
                value={newDependency.taskId}
                onValueChange={(value) => setNewDependency(prev => ({ ...prev, taskId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma tarefa" />
                </SelectTrigger>
                <SelectContent>
                  {availableTasks.map((availableTask) => (
                    <SelectItem key={availableTask.id} value={availableTask.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{availableTask.title}</span>
                        <Badge 
                          className={STATUS_INFO[availableTask.status]?.color || 'bg-gray-100 text-gray-700'} 
                          variant="secondary"
                        >
                          {availableTask.status}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Tipo de Dependência
              </label>
              <Select
                value={newDependency.type}
                onValueChange={(value) => setNewDependency(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DEPENDENCY_TYPES).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="space-y-1">
                        <div className="font-medium">{config.label}</div>
                        <div className="text-xs text-gray-600">{config.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Descrição (opcional)
              </label>
              <input
                type="text"
                value={newDependency.description}
                onChange={(e) => setNewDependency(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descreva o motivo da dependência..."
                className="w-full p-2 border rounded-md"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={addDependency}
                disabled={loading || !newDependency.taskId}
                className="flex items-center gap-1"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Adicionar
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowAddForm(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Dependências */}
      {dependencies.length > 0 ? (
        <div className="space-y-3">
          {dependencies.map((dependency) => {
            const depTask = dependencyStatus.blockedBy.find(b => b.dependency.taskId === dependency.taskId)?.task ||
                            availableTasks.find(t => t.id === dependency.taskId);
            
            const depConfig = DEPENDENCY_TYPES[dependency.type] || DEPENDENCY_TYPES.finish_to_start;
            const depStatus = checkDependencyStatus(dependency, depTask);
            const IconComponent = depConfig.icon;

            return (
              <Card key={dependency.taskId} className="border-l-4" style={{borderLeftColor: depStatus.isResolved ? '#10b981' : '#f59e0b'}}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded ${depConfig.color}`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      
                      <div>
                        <p className="font-medium text-sm">
                          {depTask?.title || 'Tarefa não encontrada'}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                          <Badge className={depConfig.color} variant="secondary">
                            {depConfig.label}
                          </Badge>
                          {depTask && (
                            <Badge className={STATUS_INFO[depTask.status]?.color || 'bg-gray-100 text-gray-700'} variant="secondary">
                              {depTask.status}
                            </Badge>
                          )}
                          <span className={depStatus.isResolved ? 'text-green-600' : 'text-orange-600'}>
                            {depStatus.isResolved ? (
                              <CheckCircle className="w-3 h-3 inline mr-1" />
                            ) : (
                              <Clock className="w-3 h-3 inline mr-1" />
                            )}
                            {depStatus.reason}
                          </span>
                        </div>
                        {dependency.description && (
                          <p className="text-xs text-gray-600 mt-1">{dependency.description}</p>
                        )}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeDependency(dependency.taskId)}
                      disabled={loading}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-gray-500">
              <Link2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Nenhuma dependência configurada</p>
              <p className="text-sm">Esta tarefa pode ser iniciada a qualquer momento</p>
              {availableTasks.length > 0 && (
                <Button
                  size="sm"
                  onClick={() => setShowAddForm(true)}
                  className="mt-3 flex items-center gap-1 mx-auto"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Dependência
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informações sobre Dependências */}
      {dependencies.length > 0 && (
        <Card className="bg-gray-50">
          <CardContent className="pt-4">
            <h4 className="font-medium mb-2">Como funcionam as dependências:</h4>
            <div className="space-y-2 text-sm text-gray-600">
              {Object.entries(DEPENDENCY_TYPES).map(([key, config]) => (
                <div key={key} className="flex items-start gap-2">
                  <config.icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium">{config.label}:</span> {config.description}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}