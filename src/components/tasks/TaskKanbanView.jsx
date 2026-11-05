import { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  Calendar,
  MoreVertical,
  Target,
  Lightbulb,
  CheckCircle,
  AlertCircle,
  Columns3,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { assigneeColorStyle } from '@/lib/assigneeColors';
import { getTaskAssigneeId } from '@/lib/taskFilterPresets';
import { priorityLabelPt, shouldShowPriorityBadge } from '@/lib/taskPriority';
import { groupTasksByColumn, DEFAULT_BOARD_COLUMNS } from '@/lib/boardColumns';

/** Cor do cabeçalho pelo tipo da coluna. */
const STATUS_COLORS = {
  backlog: { color: 'bg-gray-100', textColor: 'text-gray-700' },
  todo: { color: 'bg-blue-100', textColor: 'text-blue-700' },
  in_progress: { color: 'bg-yellow-100', textColor: 'text-yellow-700' },
  in_review: { color: 'bg-purple-100', textColor: 'text-purple-700' },
  blocked: { color: 'bg-red-100', textColor: 'text-red-700' },
  completed: { color: 'bg-green-100', textColor: 'text-green-700' },
};

const PRIORITY_COLORS = {
  low: 'bg-blue-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500'
};

/**
 * Visualização Kanban com drag & drop
 */
export default function TaskKanbanView({
  tasks,
  columns = DEFAULT_BOARD_COLUMNS,
  onMoveTask,
  onEditTask,
  onEditColumns,
  loading,
}) {
  const [_draggedTask, setDraggedTask] = useState(null);

  const tasksByColumn = groupTasksByColumn(tasks, columns);

  // Drag & Drop handlers
  const handleDragStart = (result) => {
    setDraggedTask(result.draggableId);
  };

  const handleDragEnd = async (result) => {
    setDraggedTask(null);

    if (!result.destination) return;

    const taskId = result.draggableId;
    const toColumnId = result.destination.droppableId;
    const sameColumn = toColumnId === result.source.droppableId;
    if (sameColumn && result.destination.index === result.source.index) return;

    const task = tasks.find((t) => String(t.id) === String(taskId));
    const column = columns.find((c) => c.id === toColumnId);
    if (!task || !column) return;

    try {
      await onMoveTask?.(task, column, {
        destIndex: result.destination.index,
        columnTasks: tasksByColumn[toColumnId] || [],
      });
    } catch (error) {
      console.error('Erro ao atualizar status da tarefa:', error);
    }
  };

  // Renderizar tarefa (um único Draggable por card — index da coluna mapeada)
  const renderTask = (task, index) => {
    const isOverdue =
      task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
    const hasSpecialFlags = task.impactsKPI || task.generatesLearning || task.requiresApproval;
    const assigneeStyle = assigneeColorStyle(getTaskAssigneeId(task));

    return (
      <Draggable key={task.id} draggableId={String(task.id)} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`mb-3 ${snapshot.isDragging ? 'opacity-50' : ''}`}
          >
            <Card
              className={`hover:shadow-md transition-all cursor-pointer overflow-hidden ${
              isOverdue ? 'border-red-200 bg-red-50' : ''
            } ${hasSpecialFlags ? 'ring-2 ring-blue-200' : ''}`}
              style={isOverdue ? undefined : assigneeStyle}
              onClick={() => onEditTask?.(task)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onEditTask?.(task);
                }
              }}
            >
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
                    {shouldShowPriorityBadge(task.priority) && (
                      <div className="flex items-center gap-1 mb-2">
                        <div className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[task.priority]}`}></div>
                        <span className="text-xs text-gray-600 capitalize">
                          {priorityLabelPt(task.priority)}
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
    const columnTasks = tasksByColumn[column.id] || [];
    const tone = STATUS_COLORS[column.status] || STATUS_COLORS.todo;
    const isOverdue = column.status !== 'completed' && columnTasks.some(t => 
      t.dueDate && new Date(t.dueDate) < new Date()
    );

    return (
      <div key={column.id} className="flex-1 min-w-[240px] sm:min-w-[280px]">
        <Card className="h-full">
          <CardHeader className={`${tone.color} ${tone.textColor} pb-2 sm:pb-3`}>
            <CardTitle className="flex items-center justify-between text-xs sm:text-sm font-medium">
              <span className="truncate">{column.name}</span>
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
                    columnTasks.map((task, index) => renderTask(task, index))
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
      {onEditColumns ? (
        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={onEditColumns}>
            <Columns3 className="mr-1.5 h-4 w-4" />
            Editar colunas
          </Button>
        </div>
      ) : null}
      {/* Kanban Board - Mobile Optimized */}
      <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-2 sm:gap-4 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
          {columns.map(renderColumn)}
        </div>
      </DragDropContext>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {columns.map(column => {
          const count = tasksByColumn[column.id]?.length || 0;
          const tone = STATUS_COLORS[column.status] || STATUS_COLORS.todo;
          return (
            <Card key={column.id} className="text-center">
              <CardContent className="p-3">
                <div className={`text-2xl font-bold ${tone.textColor}`}>{count}</div>
                <div className="text-sm text-gray-600 truncate">{column.name}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// Skeleton de Loading
function KanbanLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
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
