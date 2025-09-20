import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { Task } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckSquare, 
  Plus, 
  Filter, 
  Download,
  Calendar,
  List,
  Kanban,
  Layers,
  RefreshCw,
  Settings,
  Eye,
  AlertCircle,
  Target,
  Lightbulb,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import TaskKanbanView from './TaskKanbanView';
import TaskListView from './TaskListView';
import TaskPhaseView from './TaskPhaseView';
import TaskCalendarView from './TaskCalendarView';
import TaskFilters from './TaskFilters';
import TaskForm from './TaskForm';

/**
 * Componente principal de tarefas com 4 visualizações
 */
export default function TaskManager({ clientId, serviceId, userRole = 'consultor' }) {
  const { user } = useSession();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState(getDefaultView(userRole));
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    assignee: 'all',
    phase: 'all',
    priority: 'all',
    search: ''
  });

  // Definir visão padrão por perfil
  function getDefaultView(role) {
    switch (role) {
      case 'consultor': return 'kanban';
      case 'client': return 'phase';
      case 'admin':
      case 'owner': return 'list';
      default: return 'kanban';
    }
  }

  // Carregar tarefas
  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const taskFilters = { clientId };
      if (serviceId) taskFilters.serviceId = serviceId;

      const tasksData = await Task.filter(taskFilters, '-created_date');
      setTasks(tasksData);
    } catch (err) {
      console.error('Erro ao carregar tarefas:', err);
      setError('Erro ao carregar tarefas');
      toast.error('Erro ao carregar tarefas');
    } finally {
      setLoading(false);
    }
  }, [clientId, serviceId]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Aplicar filtros
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Filtro de status
      if (filters.status !== 'all' && task.status !== filters.status) {
        return false;
      }

      // Filtro de responsável
      if (filters.assignee !== 'all' && task.assigneeId !== filters.assignee) {
        return false;
      }

      // Filtro de fase/entregável
      if (filters.phase !== 'all' && task.deliverableId !== filters.phase) {
        return false;
      }

      // Filtro de prioridade
      if (filters.priority !== 'all' && task.priority !== filters.priority) {
        return false;
      }

      // Filtro de busca
      if (filters.search && !task.title.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [tasks, filters]);

  // Estatísticas das tarefas
  const taskStats = useMemo(() => {
    const total = filteredTasks.length;
    const completed = filteredTasks.filter(t => t.status === 'completed').length;
    const inProgress = filteredTasks.filter(t => t.status === 'in_progress').length;
    const overdue = filteredTasks.filter(t => {
      if (!t.dueDate) return false;
      return new Date(t.dueDate) < new Date() && t.status !== 'completed';
    }).length;

    return { total, completed, inProgress, overdue };
  }, [filteredTasks]);

  // Handlers
  const handleCreateTask = () => {
    setEditingTask(null);
    setShowTaskForm(true);
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setShowTaskForm(true);
  };

  const handleTaskSaved = async (taskData) => {
    try {
      if (editingTask) {
        await Task.update(editingTask.id, taskData);
        toast.success('Tarefa atualizada com sucesso!');
      } else {
        await Task.create({
          ...taskData,
          clientId,
          serviceId,
          createdBy: user.id
        });
        toast.success('Tarefa criada com sucesso!');
      }
      
      await loadTasks();
      setShowTaskForm(false);
      setEditingTask(null);
    } catch (err) {
      console.error('Erro ao salvar tarefa:', err);
      toast.error('Erro ao salvar tarefa');
    }
  };

  const handleTaskUpdate = async (taskId, updates) => {
    try {
      await Task.update(taskId, updates);
      await loadTasks();
      toast.success('Tarefa atualizada!');
    } catch (err) {
      console.error('Erro ao atualizar tarefa:', err);
      toast.error('Erro ao atualizar tarefa');
    }
  };

  const handleExportTasks = () => {
    const csvContent = generateCSV(filteredTasks);
    downloadCSV(csvContent, `tarefas-${clientId}-${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('Tarefas exportadas com sucesso!');
  };

  // Gerar CSV
  const generateCSV = (tasks) => {
    const headers = ['Título', 'Responsável', 'Fase', 'Data de Entrega', 'Status', 'Prioridade', 'Progresso'];
    const rows = tasks.map(task => [
      task.title,
      task.assigneeName || 'Não atribuído',
      task.deliverableName || 'Sem fase',
      task.dueDate ? new Date(task.dueDate).toLocaleDateString('pt-BR') : 'Sem data',
      getStatusLabel(task.status),
      getPriorityLabel(task.priority),
      `${task.progress || 0}%`
    ]);

    return [headers, ...rows].map(row => 
      row.map(field => `"${field}"`).join(',')
    ).join('\n');
  };

  // Download CSV
  const downloadCSV = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Labels
  const getStatusLabel = (status) => {
    const labels = {
      'backlog': 'Backlog',
      'todo': 'A Fazer',
      'in_progress': 'Em Progresso',
      'in_review': 'Em Revisão',
      'completed': 'Concluído',
      'cancelled': 'Cancelado',
      'blocked': 'Bloqueado'
    };
    return labels[status] || status;
  };

  const getPriorityLabel = (priority) => {
    const labels = {
      'low': 'Baixa',
      'medium': 'Média',
      'high': 'Alta',
      'urgent': 'Urgente'
    };
    return labels[priority] || priority;
  };

  if (loading) {
    return <TaskLoadingSkeleton />;
  }

  if (error) {
    return <TaskErrorState error={error} onRetry={loadTasks} />;
  }

  return (
    <div className="space-y-4 px-4 py-6 max-w-7xl mx-auto">
      {/* Header com Estatísticas - Mobile Optimized */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0" />
            <span className="truncate">Tarefas do Projeto</span>
          </h2>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1">
            <p className="text-sm text-gray-600">
              {taskStats.total} tarefas
            </p>
            <div className="hidden sm:block text-gray-400">•</div>
            <p className="text-sm text-gray-600">
              {taskStats.completed} concluídas
            </p>
            <div className="hidden sm:block text-gray-400">•</div>
            <p className="text-sm text-gray-600">
              {taskStats.inProgress} em progresso
            </p>
            {taskStats.overdue > 0 && (
              <>
                <div className="hidden sm:block text-gray-400">•</div>
                <p className="text-sm text-red-600 font-medium">
                  {taskStats.overdue} atrasadas
                </p>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleExportTasks} 
            disabled={filteredTasks.length === 0}
            className="hidden sm:flex"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button 
            size="sm"
            onClick={handleCreateTask}
            className="flex-1 sm:flex-none"
          >
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Nova Tarefa</span>
            <span className="sm:hidden">Nova</span>
          </Button>
        </div>
      </div>

      {/* Filtros Unificados */}
      <TaskFilters 
        filters={filters}
        onFiltersChange={setFilters}
        tasks={tasks}
      />

      {/* Abas de Visualização - Mobile Optimized */}
      <Tabs value={activeView} onValueChange={setActiveView} className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="grid w-full grid-cols-4 min-w-[320px] sm:min-w-0">
            <TabsTrigger 
              value="kanban" 
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 text-xs sm:text-sm"
            >
              <Kanban className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="hidden xs:inline sm:inline">Kanban</span>
            </TabsTrigger>
            <TabsTrigger 
              value="list" 
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 text-xs sm:text-sm"
            >
              <List className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="hidden xs:inline sm:inline">Lista</span>
            </TabsTrigger>
            <TabsTrigger 
              value="phase" 
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 text-xs sm:text-sm"
            >
              <Layers className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="hidden xs:inline sm:inline">Por Fase</span>
            </TabsTrigger>
            <TabsTrigger 
              value="calendar" 
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 text-xs sm:text-sm"
            >
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="hidden xs:inline sm:inline">Calendário</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Conteúdo das Abas */}
        <TabsContent value="kanban">
          <TaskKanbanView
            tasks={filteredTasks}
            onTaskUpdate={handleTaskUpdate}
            onEditTask={handleEditTask}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="list">
          <TaskListView
            tasks={filteredTasks}
            onTaskUpdate={handleTaskUpdate}
            onEditTask={handleEditTask}
            onExport={handleExportTasks}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="phase">
          <TaskPhaseView
            tasks={filteredTasks}
            onTaskUpdate={handleTaskUpdate}
            onEditTask={handleEditTask}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="calendar">
          <TaskCalendarView
            tasks={filteredTasks}
            onTaskUpdate={handleTaskUpdate}
            onEditTask={handleEditTask}
            loading={loading}
          />
        </TabsContent>
      </Tabs>

      {/* Modal de Formulário */}
      {showTaskForm && (
        <TaskForm
          task={editingTask}
          isOpen={showTaskForm}
          onClose={() => {
            setShowTaskForm(false);
            setEditingTask(null);
          }}
          onSave={handleTaskSaved}
          clientId={clientId}
          serviceId={serviceId}
        />
      )}
    </div>
  );
}

/**
 * Skeleton de Loading
 */
function TaskLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-300 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-300 rounded w-1/2 mb-6"></div>
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-10 bg-gray-300 rounded"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-64 bg-gray-300 rounded"></div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Estado de Erro
 */
function TaskErrorState({ error, onRetry }) {
  return (
    <Card className="border-red-200 bg-red-50">
      <CardContent className="p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-900 mb-2">
          Erro ao Carregar Tarefas
        </h3>
        <p className="text-red-700 mb-4">{error}</p>
        <Button onClick={onRetry} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Tentar Novamente
        </Button>
      </CardContent>
    </Card>
  );
}
