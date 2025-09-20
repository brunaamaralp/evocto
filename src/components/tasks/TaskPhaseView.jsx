import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  ChevronDown,
  ChevronRight,
  Calendar,
  User,
  Flag,
  Target,
  Lightbulb,
  CheckCircle,
  AlertCircle,
  Layers,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
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
 * Visualização Por Fase com agrupamento e progresso
 */
export default function TaskPhaseView({ tasks, onTaskUpdate, onEditTask, loading }) {
  const [expandedPhases, setExpandedPhases] = useState(new Set());

  // Agrupar tarefas por fase/entregável
  const tasksByPhase = useMemo(() => {
    const grouped = tasks.reduce((acc, task) => {
      const phaseKey = task.deliverableName || 'Sem Fase';
      if (!acc[phaseKey]) {
        acc[phaseKey] = {
          name: phaseKey,
          tasks: [],
          totalTasks: 0,
          completedTasks: 0,
          inProgressTasks: 0,
          overdueTasks: 0
        };
      }
      
      acc[phaseKey].tasks.push(task);
      acc[phaseKey].totalTasks++;
      
      if (task.status === 'completed') {
        acc[phaseKey].completedTasks++;
      } else if (task.status === 'in_progress') {
        acc[phaseKey].inProgressTasks++;
      }
      
      if (task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed') {
        acc[phaseKey].overdueTasks++;
      }
      
      return acc;
    }, {});

    // Calcular progresso de cada fase
    Object.values(grouped).forEach(phase => {
      phase.progress = phase.totalTasks > 0 ? 
        Math.round((phase.completedTasks / phase.totalTasks) * 100) : 0;
    });

    return grouped;
  }, [tasks]);

  // Toggle expansão de fase
  const togglePhase = (phaseName) => {
    const newExpanded = new Set(expandedPhases);
    if (newExpanded.has(phaseName)) {
      newExpanded.delete(phaseName);
    } else {
      newExpanded.add(phaseName);
    }
    setExpandedPhases(newExpanded);
  };

  // Renderizar tarefa
  const renderTask = (task) => {
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
    const hasSpecialFlags = task.impactsKPI || task.generatesLearning || task.requiresApproval;

    return (
      <Card 
        key={task.id} 
        className={`hover:shadow-md transition-all cursor-pointer ${
          isOverdue ? 'border-red-200 bg-red-50' : ''
        } ${hasSpecialFlags ? 'ring-2 ring-blue-200' : ''}`}
        onClick={() => onEditTask(task)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 text-sm mb-1">
                {task.title}
              </h4>
              
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
            </div>

            <div className="flex items-center gap-2">
              <Badge className={`${STATUS_COLORS[task.status]} text-xs`}>
                {getStatusLabel(task.status)}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            {/* Responsável */}
            {task.assigneeName && (
              <div className="flex items-center gap-2">
                <User className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-600">{task.assigneeName}</span>
              </div>
            )}

            {/* Data de Entrega */}
            {task.dueDate && (
              <div className="flex items-center gap-2">
                <Calendar className="w-3 h-3 text-gray-400" />
                <span className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                  {format(new Date(task.dueDate), 'dd/MM/yyyy', { locale: ptBR })}
                </span>
                {isOverdue && <AlertCircle className="w-3 h-3 text-red-600" />}
              </div>
            )}

            {/* Prioridade */}
            {task.priority && (
              <div className="flex items-center gap-2">
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

  // Renderizar fase
  const renderPhase = (phaseName, phaseData) => {
    const isExpanded = expandedPhases.has(phaseName);
    const progressColor = phaseData.progress === 100 ? 'bg-green-500' : 
                         phaseData.progress >= 75 ? 'bg-blue-500' : 
                         phaseData.progress >= 50 ? 'bg-yellow-500' : 'bg-red-500';

    return (
      <Card key={phaseName} className="mb-4">
        <CardHeader 
          className="cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => togglePhase(phaseName)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isExpanded ? 
                <ChevronDown className="w-5 h-5 text-gray-500" /> : 
                <ChevronRight className="w-5 h-5 text-gray-500" />
              }
              <Layers className="w-5 h-5 text-blue-600" />
              <div>
                <CardTitle className="text-lg">{phaseName}</CardTitle>
                <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                  <span>{phaseData.totalTasks} tarefas</span>
                  <span className="text-green-600">{phaseData.completedTasks} concluídas</span>
                  <span className="text-yellow-600">{phaseData.inProgressTasks} em progresso</span>
                  {phaseData.overdueTasks > 0 && (
                    <span className="text-red-600">{phaseData.overdueTasks} atrasadas</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Progresso da Fase */}
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">{phaseData.progress}%</div>
                <div className="text-sm text-gray-600">Concluído</div>
              </div>
              
              {/* Barra de Progresso */}
              <div className="w-32">
                <Progress value={phaseData.progress} className="h-2" />
              </div>
            </div>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="pt-0">
            {phaseData.tasks.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <div className="text-sm">Nenhuma tarefa nesta fase</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {phaseData.tasks.map(renderTask)}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    );
  };

  if (loading) {
    return <PhaseLoadingSkeleton />;
  }

  const phaseNames = Object.keys(tasksByPhase);

  return (
    <div className="space-y-4">
      {/* Header - Mobile Optimized */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Layers className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <span className="truncate">Tarefas por Fase</span>
        </h3>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1">
          <p className="text-sm text-gray-600">
            {phaseNames.length} fases
          </p>
          <div className="hidden sm:block text-gray-400">•</div>
          <p className="text-sm text-gray-600">
            {tasks.length} tarefas
          </p>
          <div className="hidden sm:block text-gray-400">•</div>
          <p className="text-sm text-gray-600">
            Clique nas fases para expandir/recolher
          </p>
        </div>
      </div>

      {/* Resumo Geral */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-gray-900">{tasks.length}</div>
            <div className="text-sm text-gray-600">Total de Tarefas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-green-600">
              {tasks.filter(t => t.status === 'completed').length}
            </div>
            <div className="text-sm text-gray-600">Concluídas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">{phaseNames.length}</div>
            <div className="text-sm text-gray-600">Fases</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {Math.round(tasks.filter(t => t.status === 'completed').length / tasks.length * 100) || 0}%
            </div>
            <div className="text-sm text-gray-600">Progresso Geral</div>
          </CardContent>
        </Card>
      </div>

      {/* Fases */}
      {phaseNames.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Layers className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma fase encontrada
            </h3>
            <p className="text-gray-600">
              Crie tarefas com entregáveis/fases para ver o agrupamento por fase.
            </p>
          </CardContent>
        </Card>
      ) : (
        phaseNames.map(phaseName => renderPhase(phaseName, tasksByPhase[phaseName]))
      )}

      {/* Instruções */}
      <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-600" />
          <span>
            <strong>Dica:</strong> Clique nas fases para expandir/recolher as tarefas. 
            Tarefas com bordas coloridas têm características especiais (KPI, Aprendizado, Aprovação).
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
function PhaseLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 bg-gray-300 rounded w-1/3 mb-6"></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-20 bg-gray-300 rounded"></div>
        ))}
      </div>
      {[1, 2, 3].map(i => (
        <div key={i} className="h-32 bg-gray-300 rounded"></div>
      ))}
    </div>
  );
}
