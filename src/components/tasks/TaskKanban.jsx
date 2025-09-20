import React, { useState, useEffect, useCallback } from 'react';
import { Task } from '@/api/entities';
import { User } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Calendar, 
  Clock, 
  User as UserIcon, 
  Flag,
  Plus,
  Filter,
  Search,
  MessageCircle,
  Paperclip,
  MoreVertical,
  Eye,
  CheckSquare,
  AlertCircle
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TaskCreateModal from './TaskCreateModal';

const KANBAN_COLUMNS = [
  { id: 'backlog', title: 'Backlog', status: 'backlog', color: 'bg-gray-100' },
  { id: 'todo', title: 'A Fazer', status: 'todo', color: 'bg-blue-100' },
  { id: 'in_progress', title: 'Em Progresso', status: 'in_progress', color: 'bg-yellow-100' },
  { id: 'in_review', title: 'Em Revisão', status: 'in_review', color: 'bg-purple-100' },
  { id: 'completed', title: 'Concluído', status: 'completed', color: 'bg-green-100' },
  { id: 'cancelled', title: 'Cancelado', status: 'cancelled', color: 'bg-red-100' },
  { id: 'blocked', title: 'Bloqueado', status: 'blocked', color: 'bg-orange-100' }
];

const PRIORITY_COLORS = {
  low: 'bg-blue-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500'
};

const TYPE_ICONS = {
  analise_documentos: '📄',
  coleta_dados: '📊',
  analise_dados: '📈',
  analise_financeira: '💰',
  relatorio_financeiro: '📋',
  reuniao_alinhamento: '🤝',
  planejamento_estrategico: '🎯',
  implementacao: '⚙️',
  treinamento: '🎓',
  administrativo: '📝',
  auditoria: '🔍',
  consultoria: '💡'
};

function CompactTaskCard({ task, index, users, isMobile = false }) {
  const assignedUser = users.find(u => u.id === task.assignedTo);
  
  const handleCardClick = (e) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('task:open', { 
      detail: { taskId: task.id } 
    }));
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit'
      });
    } catch {
      return null;
    }
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
  const hasComments = task.comments?.length > 0;
  const hasAttachments = task.attachments?.length > 0;
  const hasChecklist = task.checklist?.length > 0;
  const checklistProgress = hasChecklist ? 
    (task.checklist.filter(c => c.completed).length / task.checklist.length) * 100 : 0;

  // Indicador de atividade recente (últimas 24h)
  const hasRecentActivity = task.comments?.some(c => 
    new Date(c.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)
  );

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`
            mb-2 cursor-pointer transition-all hover:shadow-md border-l-4
            ${snapshot.isDragging ? 'shadow-lg rotate-1 scale-105' : ''}
            ${isOverdue ? 'border-l-red-500 bg-red-50' : `border-l-${PRIORITY_COLORS[task.priority]?.replace('bg-', '') || 'gray-300'}`}
            ${hasRecentActivity ? 'ring-2 ring-blue-200 ring-opacity-50' : ''}
            ${isMobile ? 'mx-2' : ''}
          `}
          onClick={handleCardClick}
        >
          {/* Header ultra-compacto */}
          <CardHeader className="p-2 pb-1">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-xs font-medium line-clamp-2 leading-tight flex-1">
                {TYPE_ICONS[task.type] || '📋'} {task.title}
              </CardTitle>
              <div className="flex items-center gap-1 flex-shrink-0">
                {/* Indicadores compactos */}
                {hasComments && (
                  <div className="flex items-center text-xs text-blue-600">
                    <MessageCircle className="w-3 h-3" />
                    <span className="ml-0.5">{task.comments.length}</span>
                  </div>
                )}
                {hasAttachments && (
                  <Paperclip className="w-3 h-3 text-gray-500" />
                )}
                {hasRecentActivity && (
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                )}
              </div>
            </div>
          </CardHeader>

          {/* Content super-compacto */}
          <CardContent className="p-2 pt-0 space-y-2">
            {/* Checklist progress bar (se existir) */}
            {hasChecklist && (
              <div className="flex items-center gap-2 text-xs">
                <CheckSquare className="w-3 h-3 text-gray-500" />
                <div className="flex-1 bg-gray-200 rounded-full h-1">
                  <div 
                    className={`h-1 rounded-full transition-all ${
                      checklistProgress === 100 ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${checklistProgress}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 min-w-fit">
                  {task.checklist.filter(c => c.completed).length}/{task.checklist.length}
                </span>
              </div>
            )}

            {/* Bottom row - metadados essenciais */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                {/* Prioridade como dot */}
                <div 
                  className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[task.priority] || 'bg-gray-400'}`}
                  title={`Prioridade: ${task.priority || 'medium'}`}
                />

                {/* Data de vencimento */}
                {task.dueDate && (
                  <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(task.dueDate)}</span>
                  </div>
                )}

                {/* Estimativa */}
                {task.estimatedHours && (
                  <div className="flex items-center gap-1 text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>{task.estimatedHours}h</span>
                  </div>
                )}
              </div>

              {/* Responsável */}
              {assignedUser && (
                <Avatar className="w-5 h-5">
                  <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                    {assignedUser.full_name?.charAt(0) || assignedUser.email?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </Draggable>
  );
}

function ResponsiveKanbanColumn({ column, tasks, users, isMobile = false }) {
  return (
    <div className={`
      ${isMobile ? 'w-full' : 'flex-shrink-0 w-72 min-w-72'} 
      ${column.color} rounded-lg p-3 
      ${isMobile ? 'mb-4' : ''}
    `}>
      {/* Header da coluna */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-gray-900 text-sm">{column.title}</h3>
          <Badge variant="secondary" className="text-xs h-5">
            {tasks.length}
          </Badge>
        </div>
        {!isMobile && (
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <MoreVertical className="w-3 h-3" />
          </Button>
        )}
      </div>

      {/* Lista de tarefas responsiva */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`
              min-h-20 
              ${isMobile ? 'max-h-none' : 'max-h-[70vh] overflow-y-auto custom-scrollbar'} 
              ${snapshot.isDraggingOver ? 'bg-blue-50 border-2 border-dashed border-blue-300 rounded' : ''}
            `}
          >
            {tasks.map((task, index) => (
              <CompactTaskCard
                key={task.id}
                task={task}
                index={index}
                users={users}
                isMobile={isMobile}
              />
            ))}
            {provided.placeholder}
            
            {/* Empty state */}
            {tasks.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">Nenhuma tarefa</p>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}

function MobileKanbanTabs({ columns, filteredTasks, users, activeTab, setActiveTab, onDragEnd }) {
  return (
    <div className="lg:hidden">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-4">
          {columns.slice(0, 4).map(column => {
            const columnTasks = filteredTasks.filter(task => task.status === column.status);
            return (
              <TabsTrigger key={column.id} value={column.id} className="text-xs">
                {column.title.split(' ')[0]} ({columnTasks.length})
              </TabsTrigger>
            );
          })}
        </TabsList>
        
        <DragDropContext onDragEnd={onDragEnd}>
          {columns.map(column => {
            if (column.id !== activeTab) return null;
            const columnTasks = filteredTasks.filter(task => task.status === column.status);
            return (
              <ResponsiveKanbanColumn
                key={column.id}
                column={column}
                tasks={columnTasks}
                users={users}
                isMobile={true}
              />
            );
          })}
        </DragDropContext>
      </Tabs>
      
      {/* Navegação entre todas as colunas */}
      <div className="flex gap-1 mt-4 overflow-x-auto pb-2">
        {columns.map(column => {
          const columnTasks = filteredTasks.filter(task => task.status === column.status);
          return (
            <Button
              key={column.id}
              variant={activeTab === column.id ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab(column.id)}
              className="flex-shrink-0 text-xs"
            >
              {column.title} ({columnTasks.length})
            </Button>
          );
        })}
      </div>
    </div>
  );
}

export default function TaskKanban({ clientId, serviceId, filters = {} }) {
  const { user, agencyId } = useSession();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState('todo'); // Para mobile
  const [viewMode, setViewMode] = useState('board'); // board, list, compact

  // Responsive breakpoint detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load tasks with useCallback
  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      const filterObj = { agencyId };
      
      if (clientId) filterObj.clientId = clientId;
      if (serviceId) filterObj.serviceId = serviceId;
      
      Object.assign(filterObj, filters);

      const tasksData = await Task.filter(filterObj, '-updated_date', 200);
      setTasks(tasksData || []);
    } catch (err) {
      console.error('Error loading tasks:', err);
      setError('Erro ao carregar tarefas');
    } finally {
      setLoading(false);
    }
  }, [agencyId, clientId, serviceId, filters]);

  // Load users with useCallback
  const loadUsers = useCallback(async () => {
    try {
      const usersData = await User.filter({ agencyId }, '-updated_date', 50);
      setUsers(usersData || []);
    } catch (err) {
      console.error('Error loading users:', err);
    }
  }, [agencyId]);

  // Load data
  useEffect(() => {
    loadTasks();
    loadUsers();
  }, [loadTasks, loadUsers]);

  // Enhanced drag and drop handler com feedback visual
  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    try {
      const task = tasks.find(t => t.id === draggableId);
      if (!task) return;

      const newStatus = destination.droppableId;
      const updates = {
        status: newStatus,
        kanbanColumn: newStatus,
        kanbanPosition: destination.index
      };

      if (newStatus === 'completed' && task.status !== 'completed') {
        updates.completedAt = new Date().toISOString();
        updates.progress = 100;
      }

      if (newStatus !== 'completed' && task.status === 'completed') {
        updates.completedAt = null;
        updates.progress = task.progress < 100 ? task.progress : 90;
      }

      // Adicionar comentário de sistema sobre mudança de status
      const statusComment = {
        id: `status_${Date.now()}`,
        userId: user.id,
        userEmail: user.email,
        userName: user.full_name || user.email,
        content: `Status alterado de "${task.status}" para "${newStatus}"`,
        type: 'status_change',
        createdAt: new Date().toISOString()
      };
      
      updates.comments = [...(task.comments || []), statusComment];

      await Task.update(task.id, updates);
      loadTasks();

    } catch (err) {
      console.error('Error updating task:', err);
      setError('Erro ao mover tarefa');
    }
  };

  // Enhanced filtering
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = !searchTerm || 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    const matchesAssignee = assigneeFilter === 'all' || task.assignedTo === assigneeFilter;

    return matchesSearch && matchesStatus && matchesPriority && matchesAssignee;
  });

  // Task statistics for dashboard view
  const taskStats = {
    total: filteredTasks.length,
    completed: filteredTasks.filter(t => t.status === 'completed').length,
    inProgress: filteredTasks.filter(t => t.status === 'in_progress').length,
    overdue: filteredTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed').length,
    unassigned: filteredTasks.filter(t => !t.assignedTo).length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Carregando tarefas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-6 bg-red-50 rounded-lg border border-red-200">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-600 mb-3">{error}</p>
        <Button onClick={loadTasks} variant="outline">
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Enhanced Toolbar */}
      <div className="bg-white rounded-lg border p-4 space-y-4">
        {/* Top row - Search and primary actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar tarefas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={() => setShowCreateModal(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nova Tarefa</span>
            </Button>
          </div>
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Status</SelectItem>
              {KANBAN_COLUMNS.map(col => (
                <SelectItem key={col.id} value={col.status}>
                  {col.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="low">Baixa</SelectItem>
              <SelectItem value="medium">Média</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="urgent">Urgente</SelectItem>
            </SelectContent>
          </Select>

          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value={null}>Sem responsável</SelectItem>
              {users.filter(u => ["owner", "admin", "team"].includes(u.role)).map(u => (
                <SelectItem key={u.id} value={u.id}>
                  {u.full_name || u.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Task stats */}
          <div className="flex items-center gap-4 ml-auto text-xs text-gray-600">
            <span>Total: {taskStats.total}</span>
            <span>Concluídas: {taskStats.completed}</span>
            {taskStats.overdue > 0 && (
              <span className="text-red-600 font-medium">Atrasadas: {taskStats.overdue}</span>
            )}
          </div>
        </div>
      </div>

      {/* Responsive Board */}
      <div className="bg-white rounded-lg border p-4">
        {/* Mobile View */}
        <MobileKanbanTabs
          columns={KANBAN_COLUMNS}
          filteredTasks={filteredTasks}
          users={users}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onDragEnd={handleDragEnd}
        />

        {/* Desktop View */}
        <div className="hidden lg:block">
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex overflow-x-auto gap-4 pb-4 min-h-[500px] custom-scrollbar">
              {KANBAN_COLUMNS.map(column => {
                const columnTasks = filteredTasks.filter(task => task.status === column.status);
                return (
                  <ResponsiveKanbanColumn
                    key={column.id}
                    column={column}
                    tasks={columnTasks}
                    users={users}
                    isMobile={false}
                  />
                );
              })}
            </div>
          </DragDropContext>
        </div>
      </div>

      {/* Task Create Modal */}
      <TaskCreateModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={() => {
          setShowCreateModal(false);
          loadTasks();
        }}
      />
    </div>
  );
}