import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, ChevronDown } from 'lucide-react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import InfiniteLoader from 'react-window-infinite-loader';

// Componente TaskCard otimizado com React.memo
const MemoizedTaskCard = React.memo(function MemoizedTaskCard({ 
  task, 
  users, 
  clients, 
  showClientInfo, 
  onClick,
  dragHandleProps,
  isDragging 
}) {
  const client = clients.find(c => c.id === task.clientId);
  const assignedUser = users.find(u => u.id === task.assignedTo);
  
  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-blue-100 text-blue-800 border-blue-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      urgent: 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[priority] || colors.medium;
  };

  const checklistProgress = useMemo(() => {
    const checklist = task.checklist || [];
    if (checklist.length === 0) return null;
    const completed = checklist.filter(item => item.completed).length;
    return { 
      completed, 
      total: checklist.length, 
      percentage: Math.round((completed / checklist.length) * 100) 
    };
  }, [task.checklist]);

  return (
    <Card 
      className={`group hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 border-l-blue-500 bg-white mb-2 ${
        isDragging ? 'rotate-1 scale-105 shadow-xl' : ''
      }`}
      onClick={() => onClick?.(task)}
      {...dragHandleProps}
    >
      <CardContent className="p-3">
        {/* Cliente info */}
        {showClientInfo && client && (
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-xs text-gray-600 font-medium truncate">
              {client.name}
            </span>
          </div>
        )}

        {/* Título */}
        <h4 className="font-semibold text-sm mb-2 leading-tight group-hover:text-blue-600 transition-colors line-clamp-2">
          {task.title}
        </h4>

        {/* Badges */}
        <div className="flex items-center gap-1 mb-2 flex-wrap">
          <Badge className={`text-xs px-1.5 py-0.5 ${getPriorityColor(task.priority)}`}>
            {task.priority}
          </Badge>
          
          {task.status === 'in_progress' && (
            <Badge className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-800">
              ativo
            </Badge>
          )}
        </div>

        {/* Progresso checklist */}
        {checklistProgress && (
          <div className="mb-2">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>Checklist</span>
              <span>{checklistProgress.completed}/{checklistProgress.total}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1">
              <div 
                className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                style={{ width: `${checklistProgress.percentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Meta info */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          {assignedUser ? (
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-xs font-medium text-blue-700">
                  {assignedUser.full_name?.charAt(0) || assignedUser.email?.charAt(0) || '?'}
                </span>
              </div>
              <span className="truncate max-w-16">{assignedUser.full_name?.split(' ')[0] || 'User'}</span>
            </div>
          ) : (
            <span className="text-gray-400 text-xs">Sem responsável</span>
          )}

          {task.dueDate && (
            <span className="text-xs">
              {new Date(task.dueDate).toLocaleDateString('pt-BR', { 
                day: '2-digit', 
                month: '2-digit' 
              })}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

// Hook para virtualização com paginação
function useVirtualizedTasks(initialTasks, pageSize = 50) {
  const [visibleTasks, setVisibleTasks] = useState([]);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);

  const allTasks = useMemo(() => initialTasks || [], [initialTasks]);

  const loadNextPage = useCallback(async () => {
    if (isLoading || !hasNextPage) return;

    setIsLoading(true);
    
    // Simular delay de rede para grandes datasets
    await new Promise(resolve => setTimeout(resolve, 100));

    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const nextBatch = allTasks.slice(startIndex, endIndex);

    if (nextBatch.length === 0) {
      setHasNextPage(false);
    } else {
      setVisibleTasks(prev => [...prev, ...nextBatch]);
      setPage(prev => prev + 1);
      
      // Verificar se há mais páginas
      if (endIndex >= allTasks.length) {
        setHasNextPage(false);
      }
    }

    setIsLoading(false);
  }, [allTasks, page, pageSize, isLoading, hasNextPage]);

  // Reset quando tasks mudam
  useEffect(() => {
    const initialBatch = allTasks.slice(0, pageSize);
    setVisibleTasks(initialBatch);
    setPage(2);
    setHasNextPage(allTasks.length > pageSize);
  }, [allTasks, pageSize]);

  return {
    tasks: visibleTasks,
    hasNextPage,
    isLoading,
    loadNextPage,
    totalCount: allTasks.length,
    visibleCount: visibleTasks.length
  };
}

// Componente principal da coluna virtualizada
export default function VirtualizedTaskColumn({
  column,
  tasks = [],
  users = [],
  clients = [],
  showClientInfo = false,
  onTaskClick,
  onDragEnd,
  droppableId,
  isDragDisabled = false
}) {
  const {
    tasks: virtualizedTasks,
    hasNextPage,
    isLoading,
    loadNextPage,
    totalCount,
    visibleCount
  } = useVirtualizedTasks(tasks, 30); // Páginas de 30 tarefas

  const [showVirtualization, setShowVirtualization] = useState(tasks.length > 100);

  // Auto-load próxima página quando próximo do final
  const handleScroll = useCallback((event) => {
    const { target } = event;
    const { scrollTop, scrollHeight, clientHeight } = target;
    
    // Carregar quando estiver a 200px do final
    if (scrollHeight - scrollTop - clientHeight < 200 && hasNextPage && !isLoading) {
      loadNextPage();
    }
  }, [hasNextPage, isLoading, loadNextPage]);

  // Renderer para item da lista virtualizada
  const Row = useCallback(({ index, style }) => {
    const task = virtualizedTasks[index];
    if (!task) return null;

    return (
      <Draggable 
        key={task.id} 
        draggableId={task.id} 
        index={index}
        isDragDisabled={isDragDisabled}
      >
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            style={style}
            {...provided.draggableProps}
          >
            <div {...provided.dragHandleProps}>
              <MemoizedTaskCard
                task={task}
                users={users}
                clients={clients}
                showClientInfo={showClientInfo}
                onClick={onTaskClick}
                isDragging={snapshot.isDragging}
              />
            </div>
          </div>
        )}
      </Draggable>
    );
  }, [virtualizedTasks, users, clients, showClientInfo, onTaskClick, isDragDisabled]);

  // Renderização não-virtualizada para listas pequenas
  if (!showVirtualization) {
    return (
      <Droppable droppableId={droppableId}>
        {(provided, snapshot) => (
          <Card className="h-full flex flex-col">
            <CardHeader className={`${column.color} rounded-t-lg pb-3`}>
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span>{column.title}</span>
                  </div>
                  <div className="text-xs font-normal text-gray-600 mt-1">
                    {column.description}
                  </div>
                </div>
                <Badge variant="secondary" className="bg-white/80">
                  {tasks.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            
            <CardContent
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`flex-1 p-3 min-h-96 overflow-y-auto custom-scrollbar ${
                snapshot.isDraggingOver ? 'bg-blue-50' : ''
              }`}
            >
              <div className="space-y-2">
                {tasks.map((task, index) => (
                  <Draggable
                    key={task.id}
                    draggableId={task.id}
                    index={index}
                    isDragDisabled={isDragDisabled}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                      >
                        <MemoizedTaskCard
                          task={task}
                          users={users}
                          clients={clients}
                          showClientInfo={showClientInfo}
                          onClick={onTaskClick}
                          isDragging={snapshot.isDragging}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
              </div>
              
              {provided.placeholder}
              
              {tasks.length === 0 && (
                <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
                  Nenhuma tarefa
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </Droppable>
    );
  }

  // Renderização virtualizada para listas grandes
  return (
    <Droppable droppableId={droppableId}>
      {(provided, snapshot) => (
        <Card className="h-full flex flex-col">
          <CardHeader className={`${column.color} rounded-t-lg pb-3`}>
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span>{column.title}</span>
                  {showVirtualization && (
                    <Badge variant="outline" className="text-xs px-1">
                      Virtual
                    </Badge>
                  )}
                </div>
                <div className="text-xs font-normal text-gray-600 mt-1">
                  {column.description}
                </div>
              </div>
              <Badge variant="secondary" className="bg-white/80">
                {visibleCount}/{totalCount}
              </Badge>
            </CardTitle>
          </CardHeader>
          
          <CardContent
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 p-0 ${snapshot.isDraggingOver ? 'bg-blue-50' : ''}`}
          >
            {virtualizedTasks.length > 0 ? (
              <div className="h-full">
                <List
                  height={500} // Altura fixa da lista
                  itemCount={virtualizedTasks.length}
                  itemSize={120} // Altura estimada de cada TaskCard
                  onScroll={handleScroll}
                  className="custom-scrollbar"
                >
                  {Row}
                </List>
                
                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    <span className="text-sm text-gray-600">Carregando mais tarefas...</span>
                  </div>
                )}
                
                {/* Load more button para casos onde scroll automático falha */}
                {hasNextPage && !isLoading && (
                  <div className="p-3 border-t">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={loadNextPage}
                      className="w-full text-xs"
                    >
                      <ChevronDown className="w-4 h-4 mr-1" />
                      Carregar mais ({totalCount - visibleCount} restantes)
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
                <div className="text-center">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma tarefa</p>
                </div>
              </div>
            )}
            
            {provided.placeholder}
          </CardContent>
        </Card>
      )}
    </Droppable>
  );
}