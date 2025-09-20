
import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { Task, User } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  CheckSquare, Clock, TrendingUp, Users, 
  ArrowRight, Calendar, AlertTriangle, Target,
  BarChart3, Zap, Timer, Plus
} from 'lucide-react';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';

// Componente de tarefa em destaque
const TaskQuickCard = ({ task, onClick }) => {
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const isOverdue = dueDate && isPast(dueDate) && task.status !== 'completed';
  const isDueToday = dueDate && isToday(dueDate);
  const isDueTomorrow = dueDate && isTomorrow(dueDate);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'in_progress': return 'text-blue-600';
      case 'in_review': return 'text-purple-600';
      case 'blocked': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all cursor-pointer"
      onClick={() => onClick(task)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 text-sm line-clamp-2">
            {task.title}
          </h4>
          <p className="text-xs text-gray-500 mt-1">
            {task.client?.name || 'Cliente não especificado'}
          </p>
        </div>
        <Badge className={`text-xs ${getPriorityColor(task.priority)}`}>
          {task.priority}
        </Badge>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span className={getStatusColor(task.status)}>
          {task.status.replace('_', ' ')}
        </span>
        {dueDate && (
          <span className={
            isOverdue ? 'text-red-600 font-medium' :
            isDueToday ? 'text-orange-600 font-medium' :
            isDueTomorrow ? 'text-yellow-600' :
            'text-gray-500'
          }>
            {isOverdue ? 'Atrasada' :
             isDueToday ? 'Hoje' :
             isDueTomorrow ? 'Amanhã' :
             format(dueDate, 'dd/MM', { locale: ptBR })}
          </span>
        )}
      </div>

      {task.progress > 0 && (
        <div className="mt-3">
          <Progress value={task.progress} className="h-1" />
        </div>
      )}
    </motion.div>
  );
};

// Widget principal de tarefas
export const TasksWidget = ({ clientId = null, cycleId = null }) => {
  const { user } = useSession();
  const [tasks, setTasks] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('week'); // 'today', 'week', 'month'

  // Carregar dados de tarefas com useCallback
  const loadTasksData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Filtros base
      const filters = { agencyId: user?.agencyId }; // Use optional chaining for user
      if (clientId) filters.clientId = clientId;
      if (cycleId) filters.cycleId = cycleId;

      // Carregar tarefas
      const allTasks = await Task.filter(filters, '-updated_date');
      
      // Filtrar por período se necessário
      let filteredTasks = allTasks;
      if (timeRange !== 'all') {
        const now = new Date(); // Unused, can be removed if not needed elsewhere
        const filterDate = new Date();
        
        switch (timeRange) {
          case 'today':
            filterDate.setHours(0, 0, 0, 0);
            filteredTasks = allTasks.filter(task => 
              task.dueDate && new Date(task.dueDate) >= filterDate && 
              new Date(task.dueDate) < new Date(filterDate.getTime() + 24 * 60 * 60 * 1000)
            );
            break;
          case 'week':
            filterDate.setDate(filterDate.getDate() - 7);
            filteredTasks = allTasks.filter(task => 
              !task.dueDate || new Date(task.dueDate) >= filterDate
            );
            break;
          case 'month':
            filterDate.setMonth(filterDate.getMonth() - 1);
            filteredTasks = allTasks.filter(task => 
              !task.dueDate || new Date(task.dueDate) >= filterDate
            );
            break;
        }
      }

      setTasks(filteredTasks);

      // Calcular métricas
      const totalTasks = filteredTasks.length;
      const completedTasks = filteredTasks.filter(t => t.status === 'completed').length;
      const inProgressTasks = filteredTasks.filter(t => t.status === 'in_progress').length;
      const overdueTasks = filteredTasks.filter(t => 
        t.dueDate && isPast(new Date(t.dueDate)) && t.status !== 'completed'
      ).length;
      const dueTodayTasks = filteredTasks.filter(t => 
        t.dueDate && isToday(new Date(t.dueDate)) && t.status !== 'completed'
      ).length;

      const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
      
      // Calcular tempo médio de conclusão
      const completedWithTime = filteredTasks.filter(t => 
        t.status === 'completed' && t.startDate && t.completedAt
      );
      const avgCompletionTime = completedWithTime.length > 0 
        ? completedWithTime.reduce((sum, task) => {
            const start = new Date(task.startDate);
            const end = new Date(task.completedAt);
            return sum + (end - start) / (1000 * 60 * 60 * 24); // dias
          }, 0) / completedWithTime.length
        : 0;

      setMetrics({
        totalTasks,
        completedTasks,
        inProgressTasks,
        overdueTasks,
        dueTodayTasks,
        completionRate: Math.round(completionRate),
        avgCompletionTime: Math.round(avgCompletionTime * 10) / 10
      });

    } catch (error) {
      console.error('Erro ao carregar dados de tarefas:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.agencyId, clientId, cycleId, timeRange]);

  // useEffect com dependência correta
  useEffect(() => {
    if (user?.agencyId) { // Ensure user.agencyId is available before fetching data
      loadTasksData();
    }
  }, [loadTasksData, user?.agencyId]); // Add user?.agencyId to deps if loadTasksData depends on it directly for initial check


  const handleTaskClick = (task) => {
    // Navegar para a tarefa ou abrir modal
    window.open(`/tasks-manager?task=${task.id}`, '_blank');
  };

  const priorityTasks = tasks
    .filter(t => t.status !== 'completed' && (t.priority === 'urgent' || t.priority === 'high'))
    .slice(0, 3);

  const dueTodayTasks = tasks
    .filter(t => t.dueDate && isToday(new Date(t.dueDate)) && t.status !== 'completed')
    .slice(0, 3);

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="h-8 bg-gray-200 rounded"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Métricas principais */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-lg">
            <span className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5" />
              Resumo de Tarefas
            </span>
            <Button variant="ghost" size="sm" onClick={() => window.open('/tasks-manager', '_blank')}>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Estatísticas em grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{metrics.totalTasks}</div>
              <div className="text-xs text-gray-500">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{metrics.completedTasks}</div>
              <div className="text-xs text-gray-500">Concluídas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{metrics.inProgressTasks}</div>
              <div className="text-xs text-gray-500">Em Andamento</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{metrics.overdueTasks}</div>
              <div className="text-xs text-gray-500">Atrasadas</div>
            </div>
          </div>

          {/* Barra de progresso */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Taxa de Conclusão</span>
              <span className="font-medium">{metrics.completionRate}%</span>
            </div>
            <Progress value={metrics.completionRate} className="h-2" />
          </div>

          {/* Métricas adicionais */}
          <div className="flex justify-between text-sm text-gray-600 pt-2 border-t border-gray-100">
            <div className="flex items-center gap-1">
              <Timer className="w-4 h-4" />
              <span>Tempo médio: {metrics.avgCompletionTime} dias</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              <span>{metrics.dueTodayTasks} para hoje</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tarefas prioritárias */}
      {priorityTasks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="w-4 h-4 text-red-500" />
              Tarefas Prioritárias
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {priorityTasks.map((task) => (
              <TaskQuickCard
                key={task.id}
                task={task}
                onClick={handleTaskClick}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Tarefas para hoje */}
      {dueTodayTasks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="w-4 h-4 text-orange-500" />
              Para Hoje
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dueTodayTasks.map((task) => (
              <TaskQuickCard
                key={task.id}
                task={task}
                onClick={handleTaskClick}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Estado vazio */}
      {tasks.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <CheckSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="font-medium text-gray-900 mb-2">Nenhuma tarefa encontrada</h3>
            <p className="text-gray-500 text-sm mb-4">
              {clientId || cycleId ? 'Não há tarefas para este contexto' : 'Comece criando sua primeira tarefa'}
            </p>
            <Button onClick={() => window.open('/tasks-manager', '_blank')}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Tarefa
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TasksWidget;
