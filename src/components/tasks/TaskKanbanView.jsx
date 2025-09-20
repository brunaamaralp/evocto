import React, { useState, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  Clock, 
  User as UserIcon, 
  Flag,
  Plus,
  MoreVertical,
  Eye,
  Edit,
  Target,
  Lightbulb,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const KANBAN_COLUMNS = [
  { id: 'backlog', title: 'Backlog', status: 'backlog', color: 'bg-gray-100', textColor: 'text-gray-700' },
  { id: 'todo', title: 'A Fazer', status: 'todo', color: 'bg-blue-100', textColor: 'text-blue-700' },
  { id: 'in_progress', title: 'Em Progresso', status: 'in_progress', color: 'bg-yellow-100', textColor: 'text-yellow-700' },
  { id: 'completed', title: 'Concluído', status: 'completed', color: 'bg-green-100', textColor: 'text-green-700' }
];

const PRIORITY_COLORS = {
  low: 'bg-blue-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500'
};

/**
 * Visualização Kanban com drag & drop
 */
export default function TaskKanbanView({ tasks, onTaskUpdate, onEditTask, loading }) {
  const [draggedTask, setDraggedTask] = useState(null);

  // Agrupar tarefas por status
  const tasksByStatus = tasks.reduce((acc, task) => {
    const status = task.status || 'backlog';
    if (!acc[status]) acc[status] = [];
    acc[status].push(task);
    return acc;
  }, {});

  // Drag & Drop handlers
  const handleDragStart = (result) => {
    setDraggedTask(result.draggableId);
  };

  const handleDragEnd = async (result) => {
    setDraggedTask(null);

    if (!result.destination) return;

    const taskId = result.draggableId;
    const newStatus = result.destination.droppableId;
    const oldStatus = result.source.droppableId;

    if (newStatus === oldStatus) return;

    try {
      await onTaskUpdate(taskId, { status: newStatus });
    } catch (error) {
      console.error('Erro ao atualizar status da tarefa:', error);
    }
  };

  // Renderizar tarefa
  const renderTask = (task) => {
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
    const hasSpecialFlags = task.impactsKPI || task.generatesLearning || task.requiresApproval;

    return (
      <Draggable key={task.id} draggableId={task.id} index={tasksByStatus[task.status]?.indexOf(task) || 0}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`mb-3 ${snapshot.isDragging ? 'opacity-50' : ''}`}
          >
            <Card className={`hover:shadow-md transition-all cursor-pointer ${
              isOverdue ? 'border-red-200 bg-red-50' : ''
            } ${hasSpecialFlags ? 'ring-2 ring-blue-200' : ''}`}>
              <CardContent className="p-4">
                {/* Header da Tarefa */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 text-sm mb-1 line-clamp-2">
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

                    {/* Prioridade */}
                    {task.priority && (
                      <div className="flex items-center gap-1 mb-2">
                        <div className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[task.priority]}`}></div>
                        <span className="text-xs text-gray-600 capitalize">
                          {getPriorityLabel(task.priority)}
                        </span>
                      </div>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditTask(task);
                    }}
                    className="h-6 w-6 p-0"
                  >
                    <MoreVertical className="w-3 h-3" />
                  </Button>
                </div>

                {/* Informações da Tarefa */}
                <div className="space-y-2">
                  {/* Responsável */}
                  {task.assigneeName && (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {task.assigneeName.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-gray-600">{task.assigneeName}</span>
                    </div>
                  )}

                  {/* Data de Entrega */}
                  {task.dueDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      <span className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                        {format(new Date(task.dueDate), 'dd/MM', { locale: ptBR })}
                      </span>
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

                  {/* Fase/Entregável */}
                  {task.deliverableName && (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      <span className="text-xs text-gray-600">{task.deliverableName}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </Draggable>
    );
  };

  // Renderizar coluna
  const renderColumn = (column) => {
    const columnTasks = tasksByStatus[column.status] || [];
    const isOverdue = column.status !== 'completed' && columnTasks.some(t => 
      t.dueDate && new Date(t.dueDate) < new Date()
    );

    return (
      <div key={column.id} className="flex-1 min-w-[240px] sm:min-w-[280px]">
        <Card className="h-full">
          <CardHeader className={`${column.color} ${column.textColor} pb-2 sm:pb-3`}>
            <CardTitle className="flex items-center justify-between text-xs sm:text-sm font-medium">
              <span className="truncate">{column.title}</span>
              <Badge variant="secondary" className="bg-white/50 text-gray-700 text-xs">
                {columnTasks.length}
              </Badge>
            </CardTitle>
            {isOverdue && (
              <div className="flex items-center gap-1 text-xs text-red-600 mt-1">
                <AlertCircle className="w-3 h-3" />
                <span className="hidden sm:inline">Tarefas atrasadas</span>
                <span className="sm:hidden">Atrasadas</span>
              </div>
            )}
          </CardHeader>
          
          <CardContent className="p-2 sm:p-4">
            <Droppable droppableId={column.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`min-h-[150px] sm:min-h-[200px] transition-colors ${
                    snapshot.isDraggingOver ? 'bg-blue-50' : ''
                  }`}
                >
                  {columnTasks.length === 0 ? (
                    <div className="text-center py-4 sm:py-8 text-gray-400">
                      <div className="text-xs sm:text-sm">Nenhuma tarefa</div>
                      <div className="text-xs mt-1 hidden sm:block">Arraste tarefas aqui</div>
                    </div>
                  ) : (
                    columnTasks.map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`mb-3 ${snapshot.isDragging ? 'opacity-50' : ''}`}
                          >
                            {renderTask(task)}
                          </div>
                        )}
                      </Draggable>
                    ))
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (loading) {
    return <KanbanLoadingSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Instruções */}
      <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-blue-600" />
          <span>
            <strong>Dica:</strong> Arraste as tarefas entre as colunas para alterar o status. 
            Tarefas com bordas coloridas têm características especiais (KPI, Aprendizado, Aprovação).
          </span>
        </div>
      </div>

      {/* Kanban Board - Mobile Optimized */}
      <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-2 sm:gap-4 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
          {KANBAN_COLUMNS.map(renderColumn)}
        </div>
      </DragDropContext>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {KANBAN_COLUMNS.map(column => {
          const count = tasksByStatus[column.status]?.length || 0;
          return (
            <Card key={column.id} className="text-center">
              <CardContent className="p-3">
                <div className={`text-2xl font-bold ${column.textColor}`}>{count}</div>
                <div className="text-sm text-gray-600">{column.title}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// Funções auxiliares
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
function KanbanLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex-1 min-w-[280px]">
            <Card className="h-full">
              <CardHeader className="bg-gray-100 pb-3">
                <div className="h-6 bg-gray-300 rounded w-1/2"></div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {[1, 2, 3].map(j => (
                    <div key={j} className="h-24 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
