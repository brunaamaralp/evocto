import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Flag,
  Target,
  Lightbulb,
  CheckCircle,
  AlertCircle,
  Plus
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const PRIORITY_COLORS = {
  low: 'bg-blue-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500'
};

const STATUS_COLORS = {
  backlog: 'bg-gray-100 text-gray-700',
  todo: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  in_review: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  blocked: 'bg-orange-100 text-orange-700'
};

/**
 * Visualização Calendário com grid mensal
 */
export default function TaskCalendarView({ tasks, onTaskUpdate, onEditTask, loading }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // 'month' ou 'week'

  // Calcular dias do mês
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Adicionar dias do mês anterior para completar a primeira semana
  const firstDayOfWeek = monthStart.getDay();
  const daysFromPrevMonth = [];
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const prevDay = new Date(monthStart);
    prevDay.setDate(prevDay.getDate() - (i + 1));
    daysFromPrevMonth.push(prevDay);
  }

  // Adicionar dias do próximo mês para completar a última semana
  const lastDayOfWeek = monthEnd.getDay();
  const daysFromNextMonth = [];
  for (let i = 1; i <= (6 - lastDayOfWeek); i++) {
    const nextDay = new Date(monthEnd);
    nextDay.setDate(nextDay.getDate() + i);
    daysFromNextMonth.push(nextDay);
  }

  const allDays = [...daysFromPrevMonth, ...monthDays, ...daysFromNextMonth];

  // Agrupar tarefas por data
  const tasksByDate = useMemo(() => {
    return tasks.reduce((acc, task) => {
      if (!task.dueDate) return acc;
      
      const dateKey = format(new Date(task.dueDate), 'yyyy-MM-dd');
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(task);
      return acc;
    }, {});
  }, [tasks]);

  // Navegação do calendário
  const goToPreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Renderizar tarefa no calendário
  const renderTask = (task, isCompact = true) => {
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
    const hasSpecialFlags = task.impactsKPI || task.generatesLearning || task.requiresApproval;

    if (isCompact) {
      return (
        <div
          key={task.id}
          className={`text-xs p-1 rounded cursor-pointer hover:bg-gray-100 transition-colors ${
            isOverdue ? 'bg-red-100 text-red-800' : 'bg-blue-50 text-blue-800'
          } ${hasSpecialFlags ? 'ring-1 ring-blue-300' : ''}`}
          onClick={() => onEditTask(task)}
          title={`${task.title} - ${task.assigneeName || 'Não atribuído'}`}
        >
          <div className="flex items-center gap-1">
            {hasSpecialFlags && (
              <div className="flex items-center gap-1">
                {task.impactsKPI && <Target className="w-2 h-2" />}
                {task.generatesLearning && <Lightbulb className="w-2 h-2" />}
                {task.requiresApproval && <CheckCircle className="w-2 h-2" />}
              </div>
            )}
            <span className="truncate">{task.title}</span>
          </div>
        </div>
      );
    }

    return (
      <Card 
        key={task.id} 
        className={`hover:shadow-md transition-all cursor-pointer ${
          isOverdue ? 'border-red-200 bg-red-50' : ''
        } ${hasSpecialFlags ? 'ring-2 ring-blue-200' : ''}`}
        onClick={() => onEditTask(task)}
      >
        <CardContent className="p-3">
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-medium text-gray-900 text-sm line-clamp-2">
              {task.title}
            </h4>
            <Badge className={`${STATUS_COLORS[task.status]} text-xs`}>
              {getStatusLabel(task.status)}
            </Badge>
          </div>

          {/* Flags Especiais */}
          {hasSpecialFlags && (
            <div className="flex items-center gap-1 mb-2">
              {task.impactsKPI && (
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                  <Target className="w-3 h-3 mr-1" />
                  KPI
                </Badge>
              )}
              {task.generatesLearning && (
                <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                  <Lightbulb className="w-3 h-3 mr-1" />
                  Aprendizado
                </Badge>
              )}
              {task.requiresApproval && (
                <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Aprovação
                </Badge>
              )}
            </div>
          )}

          <div className="space-y-1">
            {/* Responsável */}
            {task.assigneeName && (
              <div className="flex items-center gap-1">
                <User className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-600">{task.assigneeName}</span>
              </div>
            )}

            {/* Prioridade */}
            {task.priority && (
              <div className="flex items-center gap-1">
                <Flag className="w-3 h-3 text-gray-400" />
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[task.priority]}`}></div>
                  <span className="text-xs text-gray-600 capitalize">
                    {getPriorityLabel(task.priority)}
                  </span>
                </div>
              </div>
            )}

            {/* Progresso */}
            {task.progress !== undefined && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Progresso</span>
                  <span>{task.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1">
                  <div 
                    className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                    style={{ width: `${task.progress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Renderizar dia do calendário
  const renderDay = (day) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const dayTasks = tasksByDate[dateKey] || [];
    const isCurrentMonth = isSameMonth(day, currentDate);
    const isToday = isSameDay(day, new Date());
    const isOverdue = dayTasks.some(task => 
      task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed'
    );

    return (
      <div
        key={dateKey}
        className={`min-h-[80px] sm:min-h-[120px] p-1 sm:p-2 border border-gray-200 ${
          isCurrentMonth ? 'bg-white' : 'bg-gray-50'
        } ${isToday ? 'bg-blue-50 border-blue-300' : ''}`}
      >
        {/* Cabeçalho do Dia */}
        <div className="flex items-center justify-between mb-1 sm:mb-2">
          <span className={`text-xs sm:text-sm font-medium ${
            isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
          } ${isToday ? 'text-blue-600' : ''}`}>
            {format(day, 'd')}
          </span>
          
          {dayTasks.length > 0 && (
            <Badge variant="secondary" className="text-xs px-1 py-0">
              {dayTasks.length}
            </Badge>
          )}
        </div>

        {/* Tarefas do Dia */}
        <div className="space-y-1">
          {dayTasks.length === 0 ? (
            <div className="text-xs text-gray-400 text-center py-1 sm:py-2">
              Sem tarefas
            </div>
          ) : (
            dayTasks.slice(0, 2).map(task => renderTask(task, true))
          )}
          
          {dayTasks.length > 2 && (
            <div className="text-xs text-gray-500 text-center">
              +{dayTasks.length - 2} mais
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return <CalendarLoadingSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Header do Calendário - Mobile Optimized */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <span className="truncate">Calendário de Tarefas</span>
          </h3>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1">
            <p className="text-sm text-gray-600">
              {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
            </p>
            <div className="hidden sm:block text-gray-400">•</div>
            <p className="text-sm text-gray-600">
              Clique nas tarefas para editar
            </p>
            <div className="hidden sm:block text-gray-400">•</div>
            <p className="text-sm text-gray-600">
              Arraste para alterar datas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Button 
            variant="outline" 
            size="sm"
            onClick={goToToday}
            className="hidden sm:flex"
          >
            Hoje
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={goToPreviousMonth}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={goToNextMonth}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Calendário - Mobile Responsive */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {/* Cabeçalho dos Dias da Semana */}
          <div className="grid grid-cols-7 border-b">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
              <div key={day} className="p-2 sm:p-3 text-center font-medium text-gray-600 bg-gray-50 text-xs sm:text-sm">
                {day}
              </div>
            ))}
          </div>

          {/* Grid do Calendário */}
          <div className="grid grid-cols-7">
            {allDays.map(renderDay)}
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas do Mês */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-gray-900">
              {Object.values(tasksByDate).flat().length}
            </div>
            <div className="text-sm text-gray-600">Tarefas no Mês</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-green-600">
              {Object.values(tasksByDate).flat().filter(t => t.status === 'completed').length}
            </div>
            <div className="text-sm text-gray-600">Concluídas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-red-600">
              {Object.values(tasksByDate).flat().filter(t => 
                t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed'
              ).length}
            </div>
            <div className="text-sm text-gray-600">Atrasadas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {Object.keys(tasksByDate).length}
            </div>
            <div className="text-sm text-gray-600">Dias com Tarefas</div>
          </CardContent>
        </Card>
      </div>

      {/* Instruções */}
      <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span>
            <strong>Dica:</strong> Clique nas tarefas para editar. 
            Tarefas com ícones especiais têm características importantes (KPI, Aprendizado, Aprovação).
          </span>
        </div>
      </div>
    </div>
  );
}

// Funções auxiliares
function getStatusLabel(status) {
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
}

function getPriorityLabel(priority) {
  const labels = {
    'low': 'Baixa',
    'medium': 'Média',
    'high': 'Alta',
    'urgent': 'Urgente'
  };
  return labels[priority] || priority;
}

// Skeleton de Loading
function CalendarLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-8 bg-gray-300 rounded w-1/3"></div>
        <div className="flex gap-2">
          <div className="h-8 w-16 bg-gray-300 rounded"></div>
          <div className="h-8 w-8 bg-gray-300 rounded"></div>
          <div className="h-8 w-8 bg-gray-300 rounded"></div>
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-7 border-b">
            {[1, 2, 3, 4, 5, 6, 7].map(i => (
              <div key={i} className="p-3 h-12 bg-gray-200"></div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-100 border border-gray-200"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
