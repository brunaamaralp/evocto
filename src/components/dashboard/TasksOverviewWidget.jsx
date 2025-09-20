import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { Task, Client } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckSquare, Clock, AlertTriangle, TrendingUp,
  Calendar, User, ArrowRight, Plus, Filter
} from 'lucide-react';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

// Status colors
const STATUS_COLORS = {
  todo: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  in_review: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  blocked: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-200 text-gray-600'
};

const PRIORITY_COLORS = {
  low: 'text-gray-500',
  medium: 'text-yellow-500',
  high: 'text-orange-500',
  urgent: 'text-red-500'
};

// Card resumido de tarefa
const TaskQuickCard = ({ task, client }) => {
  const getDueDateStatus = () => {
    if (!task.dueDate) return null;
    
    const dueDate = new Date(task.dueDate);
    if (isPast(dueDate) && task.status !== 'completed') {
      return { label: 'Atrasada', color: 'text-red-600', urgent: true };
    }
    if (isToday(dueDate)) {
      return { label: 'Hoje', color: 'text-orange-600', urgent: true };
    }
    if (isTomorrow(dueDate)) {
      return { label: 'Amanhã', color: 'text-yellow-600', urgent: false };
    }
    return { 
      label: format(dueDate, 'dd/MM', { locale: ptBR }), 
      color: 'text-gray-600', 
      urgent: false 
    };
  };

  const dueDateStatus = getDueDateStatus();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-3 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="font-medium text-sm text-gray-900 line-clamp-1">
            {task.title}
          </h4>
          <p className="text-xs text-gray-600 mt-1">
            {client?.name || 'Cliente não definido'}
          </p>
        </div>
        <Badge className={`text-xs ${STATUS_COLORS[task.status]} border-0 ml-2`}>
          {task.status === 'todo' ? 'A fazer' :
           task.status === 'in_progress' ? 'Em progresso' :
           task.status === 'in_review' ? 'Em revisão' :
           task.status === 'completed' ? 'Concluída' :
           task.status === 'blocked' ? 'Bloqueada' : 'Cancelada'}
        </Badge>
      </div>

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {task.priority && (
            <span className={`${PRIORITY_COLORS[task.priority]} font-medium`}>
              {task.priority === 'low' ? 'Baixa' :
               task.priority === 'medium' ? 'Média' :
               task.priority === 'high' ? 'Alta' : 'Urgente'}
            </span>
          )}
          {task.estimatedHours && (
            <span className="text-gray-500">
              {task.estimatedHours}h
            </span>
          )}
        </div>
        
        {dueDateStatus && (
          <div className={`flex items-center gap-1 ${dueDateStatus.color}`}>
            <Calendar className="w-3 h-3" />
            <span className={dueDateStatus.urgent ? 'font-medium' : ''}>
              {dueDateStatus.label}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Widget principal de overview de tarefas
export const TasksOverviewWidget = ({ 
  clientId = null, 
  limit = 5,
  showMetrics = true,
  showQuickActions = true 
}) => {
  const { user } = useSession();
  const [tasks, setTasks] = useState([]);
  const [clients, setClients] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('urgent'); // 'urgent', 'my_tasks', 'all'

  const loadTasksOverview = useCallback(async () => {
    try {
      setLoading(true);
      
      const taskFilters = { agencyId: user.agencyId };
      if (clientId) taskFilters.clientId = clientId;

      const [tasksData, clientsData] = await Promise.all([
        Task.filter(taskFilters, '-updated_date'),
        Client.filter({ agencyId: user.agencyId })
      ]);

      // Criar mapa de clientes para lookup rápido
      const clientsMap = clientsData.reduce((acc, client) => {
        acc[client.id] = client;
        return acc;
      }, {});

      setClients(clientsMap);
      
      // Filtrar tarefas baseado no filtro selecionado
      let filteredTasks = tasksData;
      
      switch (filter) {
        case 'urgent':
          filteredTasks = tasksData.filter(task => {
            if (task.status === 'completed' || task.status === 'cancelled') return false;
            if (task.priority === 'urgent') return true;
            if (task.dueDate) {
              const dueDate = new Date(task.dueDate);
              return isPast(dueDate) || isToday(dueDate) || isTomorrow(dueDate);
            }
            return false;
          });
          break;
        case 'my_tasks':
          filteredTasks = tasksData.filter(task => 
            task.assignedTo === user.id && 
            task.status !== 'completed' && 
            task.status !== 'cancelled'
          );
          break;
        case 'all':
          filteredTasks = tasksData.filter(task => 
            task.status !== 'completed' && task.status !== 'cancelled'
          );
          break;
      }

      // Ordenar por prioridade e data
      filteredTasks.sort((a, b) => {
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority] || 0;
        const bPriority = priorityOrder[b.priority] || 0;
        
        if (aPriority !== bPriority) return bPriority - aPriority;
        
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate) - new Date(b.dueDate);
        }
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        
        return new Date(b.updated_date) - new Date(a.updated_date);
      });

      setTasks(filteredTasks.slice(0, limit));

      // Calcular métricas
      if (showMetrics) {
        const totalTasks = tasksData.length;
        const completedTasks = tasksData.filter(t => t.status === 'completed').length;
        const inProgressTasks = tasksData.filter(t => t.status === 'in_progress').length;
        const overdueTasks = tasksData.filter(t => 
          t.dueDate && isPast(new Date(t.dueDate)) && t.status !== 'completed'
        ).length;
        const dueTodayTasks = tasksData.filter(t => 
          t.dueDate && isToday(new Date(t.dueDate)) && t.status !== 'completed'
        ).length;

        setMetrics({
          totalTasks,
          completedTasks,
          inProgressTasks,
          overdueTasks,
          dueTodayTasks,
          completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
        });
      }

    } catch (error) {
      console.error('Erro ao carregar overview de tarefas:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.agencyId, clientId, limit, filter, showMetrics, user?.id]);

  useEffect(() => {
    if (user?.agencyId) {
      loadTasksOverview();
    }
  }, [loadTasksOverview, user?.agencyId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="ml-3 text-gray-600">Carregando tarefas...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5" />
            Tarefas
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* Filtros */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded px-2 py-1"
            >
              <option value="urgent">Urgentes</option>
              <option value="my_tasks">Minhas Tarefas</option>
              <option value="all">Todas</option>
            </select>
            
            {showQuickActions && (
              <Button asChild size="sm" variant="outline">
                <Link to={createPageUrl('tasks-manager')}>
                  Ver Todas
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Métricas rápidas */}
        {showMetrics && (
          <div className="grid grid-cols-4 gap-3 pb-4 border-b border-gray-100">
            <div className="text-center">
              <p className="text-lg font-bold text-blue-600">{metrics.inProgressTasks || 0}</p>
              <p className="text-xs text-gray-600">Em progresso</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-orange-600">{metrics.dueTodayTasks || 0}</p>
              <p className="text-xs text-gray-600">Para hoje</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-red-600">{metrics.overdueTasks || 0}</p>
              <p className="text-xs text-gray-600">Atrasadas</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-green-600">{metrics.completionRate || 0}%</p>
              <p className="text-xs text-gray-600">Concluídas</p>
            </div>
          </div>
        )}

        {/* Lista de tarefas */}
        <div className="space-y-3">
          {tasks.length > 0 ? (
            tasks.map(task => (
              <TaskQuickCard 
                key={task.id} 
                task={task} 
                client={clients[task.clientId]} 
              />
            ))
          ) : (
            <div className="text-center py-8">
              <CheckSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">
                {filter === 'urgent' ? 'Nenhuma tarefa urgente' :
                 filter === 'my_tasks' ? 'Você não tem tarefas pendentes' :
                 'Nenhuma tarefa encontrada'}
              </p>
              {showQuickActions && (
                <Button asChild size="sm" className="mt-3">
                  <Link to={createPageUrl('tasks-manager')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Tarefa
                  </Link>
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Quick actions */}
        {showQuickActions && tasks.length > 0 && (
          <div className="pt-4 border-t border-gray-100">
            <Button asChild size="sm" className="w-full">
              <Link to={createPageUrl('tasks-manager')}>
                <CheckSquare className="w-4 h-4 mr-2" />
                Gerenciar Todas as Tarefas
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TasksOverviewWidget;