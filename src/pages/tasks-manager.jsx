
import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Task } from '@/api/entities';
import { Client } from '@/api/entities';
import { User } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  Search, 
  Users, 
  Building2, 
  Plus,
  Clock,
  Flag,
  Kanban,
  CalendarDays,
  Rows3,
  CheckSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import TaskCreateModal from '@/components/tasks/TaskCreateModal';
import TaskCalendarView from '@/components/tasks/TaskCalendarView';
import LoadingState from '@/components/shared/LoadingState';
import ErrorState from '@/components/shared/ErrorState';
import EmptyState from '@/components/shared/EmptyState';
import {
  EMPTY_TASK_FILTERS,
  applyTaskFilters,
  getTaskAssigneeId,
  isTaskOverdue,
  resolvePresetFromQuery,
} from '@/lib/taskFilterPresets';
import { transitionTaskStatus, completedKanbanColumnForTask, opsKanbanColumnForTask } from '@/lib/taskStatusTransition';
import { completeTask } from '@/lib/completeTask';
import { assigneeColorStyle } from '@/lib/assigneeColors';
import { priorityLabelPt, shouldShowPriorityBadge } from '@/lib/taskPriority';
import { getKanbanBoardColumns } from '@/lib/taskStatusCanonical';
import { getStagePastel } from '@/lib/modulePastels';
import { createManualTask } from '@/lib/createManualTask';
import { openTaskDrawer } from '@/lib/openTaskDrawer';
import {
  clearTaskManagerFilterParams,
  readTaskManagerUrlState,
  taskMatchesClientFilter,
  writeTaskManagerFilterParams,
} from '@/lib/taskManagerUrlState';
import { TASK_SCOPE_LABELS } from '@/lib/taskScopeLabels';

const DENSITY_STORAGE_KEY = 'evocto:tasks-manager-density';

// Soft pastel kanban columns (mapa canônico)
const KANBAN_COLUMNS = getKanbanBoardColumns();

function QuickAddTask({
  columnId,
  agencyId,
  userId,
  users = [],
  disabled,
}) {
  const [title, setTitle] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [showMore, setShowMore] = React.useState(false);
  const [assignee, setAssignee] = React.useState('me');
  const [dueDate, setDueDate] = React.useState('');

  const submit = async ({ openDrawer = false } = {}) => {
    const trimmed = title.trim();
    if (!trimmed || saving || !agencyId || disabled) return;
    setSaving(true);
    try {
      const status =
        columnId && !['completed', 'blocked', 'cancelled'].includes(columnId)
          ? columnId
          : 'todo';
      let assignedTo = null;
      if (showMore) {
        if (assignee === 'me') assignedTo = userId || null;
        else if (assignee && assignee !== 'unassigned') assignedTo = assignee;
      }
      const created = await createManualTask({
        title: trimmed,
        agencyId,
        userId: userId || null,
        status,
        quickAdd: true,
        assignedTo,
        dueDate: showMore && dueDate ? dueDate : null,
      });
      setTitle('');
      setDueDate('');
      setAssignee('me');
      setShowMore(false);
      toast.success(
        openDrawer
          ? 'Tarefa criada — complete os detalhes'
          : 'Tarefa criada'
      );
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('task:refresh'));
      }
      if (openDrawer && created?.id) openTaskDrawer(created.id);
    } catch (err) {
      console.error('Quick-add falhou:', err);
      toast.error(err?.message || 'Não foi possível criar a tarefa');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-2 space-y-1.5">
      <Input
        value={title}
        disabled={saving || disabled || !agencyId}
        placeholder="Adicionar tarefa…"
        className="h-8 bg-white/90 text-sm"
        aria-label="Criar tarefa rapidamente"
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            submit({ openDrawer: e.shiftKey });
          }
        }}
      />
      {showMore ? (
        <div className="grid grid-cols-1 gap-1.5">
          <Select
            value={assignee}
            onValueChange={setAssignee}
            disabled={saving || disabled}
          >
            <SelectTrigger className="h-8 bg-white/90 text-xs">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="me">Eu</SelectItem>
              <SelectItem value="unassigned">Sem responsável</SelectItem>
              {(users || []).map((u) => (
                <SelectItem key={u.id} value={String(u.id)}>
                  {u.full_name || u.name || u.email || u.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={dueDate}
            disabled={saving || disabled}
            className="h-8 bg-white/90 text-xs"
            aria-label="Prazo"
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="text-[10px] text-[#7A7595] underline-offset-2 hover:underline"
          onClick={() => setShowMore((v) => !v)}
        >
          {showMore ? 'Menos' : 'Responsável / prazo'}
        </button>
        {saving ? (
          <p className="text-[10px] text-[#7A7595]">Salvando…</p>
        ) : (
          <p className="text-[10px] text-[#7A7595]">
            Enter · Shift+Enter abre
          </p>
        )}
      </div>
    </div>
  );
}

// Componente simples para card de tarefa
function TaskCard({ task, users, clients, density = 'comfortable' }) {
  const compact = density === 'compact';
  const getAssignedUser = (userId) => {
    return users.find(u => u.id === userId);
  };

  const getClient = (clientId) => {
    return clients.find(c => c.id === clientId);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return getStagePastel('blocked').badge;
      case 'high':
        return getStagePastel('in_progress').badge;
      case 'medium':
        return getStagePastel('waiting_client').badge;
      default:
        return getStagePastel('backlog').badge;
    }
  };

  const assigneeId = getTaskAssigneeId(task);
  const assignedUser = getAssignedUser(assigneeId);
  const client = getClient(task.clientId);
  const colorStyle = assigneeColorStyle(assigneeId);
  const overdue = isTaskOverdue(task);

  return (
    <Card
      className={`${compact ? 'mb-1.5' : 'mb-3'} cursor-pointer hover:shadow-[var(--shadow-elevated)] transition-shadow overflow-hidden rounded-2xl border-transparent ${
        overdue ? 'ring-1 ring-red-300/80' : ''
      }`}
      style={colorStyle}
    >
      <CardContent className={compact ? 'p-2' : 'p-3'}>
        <div className={compact ? 'space-y-1' : 'space-y-2'}>
          <h4 className={`font-medium ${compact ? 'text-xs line-clamp-1' : 'text-sm line-clamp-2'}`}>
            {task.title}
          </h4>
          
          {!compact && task.description ? (
            <p className="text-xs text-gray-600 line-clamp-2">{task.description}</p>
          ) : null}
          
          <div className="flex flex-wrap gap-1">
            {shouldShowPriorityBadge(task.priority) && (
              <Badge className={`text-xs ${getPriorityColor(task.priority)}`}>
                {!compact ? <Flag className="w-3 h-3 mr-1" /> : null}
                {compact
                  ? priorityLabelPt(task.priority).charAt(0)
                  : priorityLabelPt(task.priority)}
              </Badge>
            )}
            
            {task.dueDate && (
              <Badge
                variant="outline"
                className={`text-xs ${
                  overdue
                    ? 'border-red-300 bg-red-50 text-red-700'
                    : ''
                }`}
              >
                <Clock className="w-3 h-3 mr-1" />
                {compact
                  ? new Date(task.dueDate).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                    })
                  : new Date(task.dueDate).toLocaleDateString()}
                {!compact && overdue ? ' · Atrasada' : null}
              </Badge>
            )}
          </div>
          
          {!compact ? (
            <div className="flex items-center justify-between text-xs gap-2">
              <div className="flex items-center gap-1 min-w-0">
                <Users className="w-3 h-3 shrink-0" />
                <span
                  className={`truncate max-w-24 ${
                    assignedUser ? '' : 'text-amber-700 font-medium'
                  }`}
                >
                  {assignedUser
                    ? assignedUser.full_name || assignedUser.email
                    : 'Sem responsável'}
                </span>
              </div>
              
              <div className="flex items-center gap-1 text-gray-500 shrink-0">
                <Building2 className="w-3 h-3" />
                <span className="truncate max-w-20">
                  {client?.name || 'Interno'}
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

// Componente para coluna do Kanban
function TaskColumn({
  column,
  tasks,
  users,
  clients,
  droppableId,
  agencyId,
  userId,
  density = 'comfortable',
}) {
  const compact = density === 'compact';
  return (
    <div className={`flex-shrink-0 ${compact ? 'w-64 min-w-64' : 'w-80 min-w-80'}`}>
      <div className={`h-full rounded-2xl ${compact ? 'p-2.5' : 'p-4'} ${column.color}`}>
        <div className={compact ? 'pb-2' : 'pb-3'}>
          <div className="flex items-center justify-between mb-1">
            <span className={`${compact ? 'text-xs' : 'text-sm'} font-semibold text-[#18162A]`}>
              {column.title}
            </span>
            <Badge variant="secondary" className="text-xs rounded-full bg-white/70">
              {tasks.length}
            </Badge>
          </div>
          {!compact ? (
            <p className="text-xs text-[#7A7595]">{column.description}</p>
          ) : null}
        </div>
        
        <div className="pt-1">
          <Droppable droppableId={droppableId}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`min-h-[200px] ${compact ? 'space-y-1' : 'space-y-2'} p-2 rounded-xl transition-colors ${
                  snapshot.isDraggingOver ? 'bg-white/60' : ''
                }`}
              >
                {tasks.map((task, index) => (
                  <Draggable
                    key={task.id}
                    draggableId={task.id}
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={snapshot.isDragging ? 'rotate-2 shadow-lg' : ''}
                        onClick={() => {
                          openTaskDrawer(task.id);
                        }}
                      >
                        <TaskCard
                          task={task}
                          users={users}
                          clients={clients}
                          density={density}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
                
                {tasks.length === 0 && (
                  <div className={`text-center ${compact ? 'py-3' : 'py-6'} text-[#7A7595]`}>
                    <p className="text-sm">Nenhuma tarefa aqui</p>
                    {!compact ? (
                      <p className="text-xs mt-1">Arraste um card ou use o quick-add</p>
                    ) : null}
                  </div>
                )}
                <QuickAddTask
                  columnId={column.id}
                  agencyId={agencyId}
                  userId={userId}
                  users={users}
                />
              </div>
            )}
          </Droppable>
        </div>
      </div>
    </div>
  );
}

export default function TasksManagerPage() {
  const { user, agencyId } = useSession();
  const currentUserId = user?.id || user?.data?.id || null;
  const [tasks, setTasks] = useState([]);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [density, setDensity] = useState(() => {
    try {
      const saved = localStorage.getItem(DENSITY_STORAGE_KEY);
      return saved === 'compact' ? 'compact' : 'comfortable';
    } catch {
      return 'comfortable';
    }
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const urlStateInit = readTaskManagerUrlState(searchParams);
  // Estados de filtros (hidratados da URL para sobreviver refresh/navegação)
  const [selectedClient, setSelectedClient] = useState(
    () => urlStateInit.client
  );
  const [selectedUser, setSelectedUser] = useState(() => urlStateInit.assignee);
  const [searchTerm, setSearchTerm] = useState(() => urlStateInit.q);
  const [selectedStatus, setSelectedStatus] = useState(
    () => urlStateInit.status
  );
  const [selectedDueRange, setSelectedDueRange] = useState(
    () => urlStateInit.dueRange || 'all'
  );
  const [presetFilters, setPresetFilters] = useState({ ...EMPTY_TASK_FILTERS });
  const [createOpen, setCreateOpen] = useState(false);
  const [createKind, setCreateKind] = useState('task');
  const viewFromUrl = urlStateInit.view;
  const [viewMode, setViewMode] = useState(viewFromUrl); // 'kanban' | 'week'
  const activePresetId = presetFilters.preset || null;

  const writeFilterParams = useCallback(
    (patch, { clearPreset = false } = {}) => {
      const next = writeTaskManagerFilterParams(searchParams, patch, {
        clearPreset,
      });
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const viewFromSearch =
    readTaskManagerUrlState(searchParams).view === 'week' ? 'week' : 'kanban';

  useEffect(() => {
    setViewMode(viewFromSearch);
  }, [viewFromSearch]);

  // Ação rápida do header: ?create=1 abre o modal e limpa o param
  useEffect(() => {
    if (searchParams.get('create') !== '1') return;
    setCreateKind('task');
    setCreateOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete('create');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  // Sync preset da URL (?preset=) — ids inválidos são removidos
  useEffect(() => {
    const raw = searchParams.get('preset');
    if (!raw) {
      if (presetFilters.preset) {
        setPresetFilters({ ...EMPTY_TASK_FILTERS });
      }
      return;
    }
    const fromUrl = resolvePresetFromQuery(raw);
    if (!fromUrl) {
      const next = new URLSearchParams(searchParams);
      next.delete('preset');
      setSearchParams(next, { replace: true });
      return;
    }
    if (presetFilters.preset === fromUrl.id) return;
    const nextFilters = fromUrl.apply({ userId: currentUserId });
    setPresetFilters(nextFilters);
    if (nextFilters.assignee && nextFilters.assignee !== 'all') {
      setSelectedUser(String(nextFilters.assignee));
    } else if (nextFilters.myAction || nextFilters.waitingOn === 'client') {
      setSelectedUser('all');
    }
    if (nextFilters.status && nextFilters.status !== 'all') {
      setSelectedStatus(String(nextFilters.status));
    }
    if (nextFilters.dueRange && nextFilters.dueRange !== 'all') {
      setSelectedDueRange(String(nextFilters.dueRange));
    } else if (
      nextFilters.preset === 'agency_blocked' ||
      nextFilters.preset === 'awaiting_review'
    ) {
      setSelectedDueRange('all');
    }
  }, [searchParams, currentUserId, setSearchParams, presetFilters.preset]);

  // Sync dueRange solto da URL (sem preset)
  useEffect(() => {
    const fromUrl = readTaskManagerUrlState(searchParams).dueRange || 'all';
    if (!searchParams.get('preset') && fromUrl !== selectedDueRange) {
      setSelectedDueRange(fromUrl);
    }
  }, [searchParams, selectedDueRange]);

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    const next = new URLSearchParams(searchParams);
    if (mode === 'week') {
      next.set('view', 'week');
    } else {
      next.delete('view');
    }
    setSearchParams(next, { replace: true });
  };

  // Carregar dados
  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!agencyId) return;
    
    if (!silent) {
      setLoading(true);
      setError('');
    }
    
    try {
      console.log('📊 Carregando dados do servidor');
      const [tasksData, clientsData, usersData] = await Promise.all([
        Task.filter({ agencyId }, '-updated_date'),
        Client.filter({ agencyId }, '-updated_date'),
        User.filter({ agencyId }, '-updated_date')
      ]);

      setTasks(tasksData || []);
      setClients(clientsData || []);
      setUsers(usersData || []);
      
      console.log('📊 Dados carregados:', {
        tasks: tasksData?.length || 0,
        clients: clientsData?.length || 0,
        users: usersData?.length || 0
      });

    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      if (!silent) {
        setError('Erro ao carregar dados. Tente novamente.');
        toast.error('Erro ao carregar tarefas');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Drawer / dashboard / outras telas: refletir conclusão sem reload completo
  useEffect(() => {
    const onUpdated = (event) => {
      const { taskId, status, deleted, kanbanColumn } = event?.detail || {};
      if (!taskId) {
        loadData({ silent: true });
        return;
      }
      if (deleted) {
        setTasks((prev) => prev.filter((t) => String(t.id) !== String(taskId)));
        return;
      }
      if (status) {
        setTasks((prev) =>
          prev.map((t) => {
            if (String(t.id) !== String(taskId)) return t;
            const normalized = String(status).toLowerCase();
            const isDone = normalized === 'completed' || normalized === 'done';
            const nextColumn = isDone
              ? kanbanColumn || completedKanbanColumnForTask({ ...t, status: normalized })
              : kanbanColumn || status;
            return {
              ...t,
              status: isDone ? 'completed' : status,
              kanbanColumn: nextColumn,
            };
          })
        );
        // Confirma no servidor com atraso — evita reverter UI otimista
        window.setTimeout(() => loadData({ silent: true }), 900);
        return;
      }
      loadData({ silent: true });
    };
    const onRefresh = () => loadData({ silent: true });
    window.addEventListener('task:updated', onUpdated);
    window.addEventListener('task:refresh', onRefresh);
    return () => {
      window.removeEventListener('task:updated', onUpdated);
      window.removeEventListener('task:refresh', onRefresh);
    };
  }, [loadData]);

  // Aplicar filtros (selects + preset da URL / chips)
  const filteredTasks = React.useMemo(() => {
    const merged = {
      ...EMPTY_TASK_FILTERS,
      ...presetFilters,
      // Selects locais têm precedência sobre o preset (compatibilidade)
      assignee:
        selectedUser !== 'all' ? selectedUser : presetFilters.assignee || 'all',
      status:
        selectedStatus !== 'all'
          ? selectedStatus
          : presetFilters.status || 'all',
      dueRange:
        selectedDueRange !== 'all'
          ? selectedDueRange
          : presetFilters.dueRange || 'all',
      search: searchTerm || presetFilters.search || '',
    };

    return tasks.filter((task) => {
      if (!taskMatchesClientFilter(task, selectedClient)) return false;
      return applyTaskFilters(task, merged, { userId: currentUserId });
    });
  }, [
    tasks,
    selectedClient,
    selectedUser,
    selectedStatus,
    selectedDueRange,
    searchTerm,
    presetFilters,
    currentUserId,
  ]);

  // Organizar tarefas por coluna (status canônico + aliases de campanha)
  const tasksByStatus = React.useMemo(() => {
    const organized = {};
    KANBAN_COLUMNS.forEach((column) => {
      organized[column.id] = filteredTasks.filter(
        (task) => opsKanbanColumnForTask(task) === column.id
      );
    });
    return organized;
  }, [filteredTasks]);

  // Drag and drop handler
  const handleDragEnd = useCallback(async (result) => {
    const { destination, source, draggableId } = result;
    
    if (!destination) return;
    
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    const taskId = draggableId;
    const newStatus = destination.droppableId;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const previousStatus = task.status;
    
    try {
      // Optimistic UI
      setTasks(prevTasks => 
        prevTasks.map(t => 
          t.id === taskId
            ? {
                ...t,
                status: newStatus,
                kanbanColumn:
                  newStatus === 'completed'
                    ? completedKanbanColumnForTask({ ...t, status: newStatus })
                    : newStatus,
              }
            : t
        )
      );

      const transition =
        newStatus === 'completed'
          ? await completeTask(task, {
              agencyId: task.agencyId || agencyId,
              user,
            })
          : await transitionTaskStatus(task, newStatus, {
              agencyId: task.agencyId || agencyId,
              user,
            });

      if (!transition.success) {
        setTasks(prevTasks =>
          prevTasks.map((t) =>
            t.id === taskId ? { ...t, status: previousStatus } : t
          )
        );
        toast.error(transition.message || 'Não é possível mover a tarefa');
        return;
      }

      const statusLabel = KANBAN_COLUMNS.find(col => col.id === newStatus)?.title || newStatus;
      toast.success(`Tarefa movida para "${statusLabel}"`);
      if (transition.warning) {
        toast.warning(transition.warning, { duration: 4500 });
      }
      
      window.dispatchEvent(new CustomEvent('task:updated', { 
        detail: {
          taskId,
          status: newStatus === 'completed' ? 'completed' : newStatus,
          kanbanColumn:
            newStatus === 'completed'
              ? completedKanbanColumnForTask(task)
              : newStatus,
        },
      }));

    } catch (error) {
      console.error('Erro ao mover tarefa:', error);
      toast.error('Erro ao mover tarefa');
      loadData({ silent: true });
    }
  }, [tasks, agencyId, loadData, user]);

  // Limpar filtros
  const clearFilters = useCallback(() => {
    setSelectedClient('all');
    setSelectedUser('all');
    setSelectedStatus('all');
    setSelectedDueRange('all');
    setSearchTerm('');
    setPresetFilters({ ...EMPTY_TASK_FILTERS });
    setSearchParams(clearTaskManagerFilterParams(searchParams), {
      replace: true,
    });
  }, [searchParams, setSearchParams]);

  const toggleDensity = () => {
    setDensity((prev) => {
      const next = prev === 'compact' ? 'comfortable' : 'compact';
      try {
        localStorage.setItem(DENSITY_STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  if (loading) {
    return (
      <LoadingState
        variant="skeleton"
        size="page"
        message="Carregando tarefas…"
        className="min-h-[400px]"
      />
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Não foi possível carregar as tarefas"
        message={error}
        onRetry={() => loadData()}
        showHomeButton={false}
      />
    );
  }

  const totalTasks = filteredTasks.length;
  const hasFilters =
    selectedClient !== 'all' ||
    selectedUser !== 'all' ||
    selectedStatus !== 'all' ||
    selectedDueRange !== 'all' ||
    Boolean(searchTerm) ||
    Boolean(activePresetId);

  return (
    <div className="max-w-full space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#18162A]">
            {TASK_SCOPE_LABELS.agency.pageTitle}
          </h1>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="flex rounded-xl border border-[#E8E5F5] bg-white p-0.5">
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              className="gap-2 flex-1 sm:flex-none"
              onClick={() => handleViewModeChange('kanban')}
            >
              <Kanban className="w-4 h-4" />
              Kanban
            </Button>
            <Button
              variant={viewMode === 'week' ? 'default' : 'ghost'}
              size="sm"
              className="gap-2 flex-1 sm:flex-none"
              onClick={() => handleViewModeChange('week')}
            >
              <CalendarDays className="w-4 h-4" />
              Semana
            </Button>
          </div>
          {viewMode === 'kanban' ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 w-full sm:w-auto"
              onClick={toggleDensity}
              aria-pressed={density === 'compact'}
              title={
                density === 'compact'
                  ? 'Densidade confortável'
                  : 'Densidade compacta'
              }
            >
              <Rows3 className="w-4 h-4" />
              {density === 'compact' ? 'Compacto' : 'Confortável'}
            </Button>
          ) : null}
          <Button
            variant="outline"
            onClick={() => {
              setCreateKind('meeting');
              setCreateOpen(true);
            }}
            className="gap-2 w-full sm:w-auto shrink-0"
          >
            <CalendarDays className="w-4 h-4" />
            Agendar reunião
          </Button>
          <Button
            onClick={() => {
              setCreateKind('task');
              setCreateOpen(true);
            }}
            className="gap-2 w-full sm:w-auto shrink-0"
          >
            <Plus className="w-4 h-4" />
            Nova Tarefa
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-end">
          {totalTasks > 0 ? (
            <span className="text-xs text-[#7A7595] tabular-nums">
              {totalTasks} tarefa{totalTasks !== 1 ? 's' : ''}
            </span>
          ) : null}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
            {/* Busca textual */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar por título ou descrição..."
                  value={searchTerm}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSearchTerm(value);
                    writeFilterParams(
                      { q: value },
                      { clearPreset: Boolean(activePresetId) }
                    );
                    if (activePresetId) {
                      setPresetFilters((prev) => ({ ...prev, preset: null }));
                    }
                  }}
                  className="pl-10 bg-white"
                />
              </div>
            </div>

            {/* Filtro por cliente */}
            <Select
              value={selectedClient}
              onValueChange={(value) => {
                setSelectedClient(value);
                writeFilterParams(
                  { client: value },
                  { clearPreset: Boolean(activePresetId) }
                );
                if (activePresetId) {
                  setPresetFilters((prev) => ({ ...prev, preset: null }));
                }
              }}
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Todos os clientes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clientes</SelectItem>
                <SelectItem value="internal">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Internas (sem cliente)
                  </div>
                </SelectItem>
                {clients.map(client => (
                  <SelectItem key={client.id} value={client.id}>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      {client.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filtro por responsável */}
            <Select
              value={selectedUser}
              onValueChange={(value) => {
                setSelectedUser(value);
                setPresetFilters((prev) => ({
                  ...prev,
                  assignee: value,
                  preset: null,
                  myAction: false,
                }));
                writeFilterParams(
                  { assignee: value },
                  { clearPreset: true }
                );
              }}
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Todos os responsáveis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os responsáveis</SelectItem>
                <SelectItem value="unassigned">Sem responsável</SelectItem>
                {users
                  .filter(u => ['owner', 'admin', 'team'].includes(u.role))
                  .map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        {user.full_name || user.email}
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            {/* Filtro por prazo */}
            <Select
              value={selectedDueRange}
              onValueChange={(value) => {
                setSelectedDueRange(value);
                setPresetFilters((prev) => ({
                  ...prev,
                  dueRange: value,
                  preset: null,
                }));
                writeFilterParams(
                  { dueRange: value },
                  { clearPreset: true }
                );
              }}
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Prazo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Qualquer prazo</SelectItem>
                <SelectItem value="overdue">Atrasadas</SelectItem>
                <SelectItem value="next_48h">Próximas 48h</SelectItem>
                <SelectItem value="this_week">Esta semana</SelectItem>
              </SelectContent>
            </Select>

            {/* Filtro por status */}
            <Select
              value={selectedStatus}
              onValueChange={(value) => {
                setSelectedStatus(value);
                writeFilterParams(
                  { status: value },
                  { clearPreset: Boolean(activePresetId) }
                );
                if (activePresetId) {
                  setPresetFilters((prev) => ({ ...prev, preset: null }));
                }
              }}
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {KANBAN_COLUMNS.map(column => (
                  <SelectItem key={column.id} value={column.id}>
                    {column.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasFilters && (
            <div className="flex justify-end">
              <Button variant="ghost" onClick={clearFilters} size="sm">
                Limpar filtros
              </Button>
            </div>
          )}
      </div>

      {totalTasks === 0 ? (
        <EmptyState
          variant="default"
          icon={CheckSquare}
          title={
            hasFilters
              ? 'Nenhuma tarefa com estes filtros'
              : 'Nenhuma tarefa na agência'
          }
          description={
            hasFilters
              ? 'Ajuste ou limpe os filtros para ver o quadro completo.'
              : 'Crie a primeira tarefa ou use o quick-add em qualquer coluna.'
          }
          primaryAction={
            hasFilters
              ? { label: 'Limpar filtros', onClick: clearFilters }
              : {
                  label: 'Nova tarefa',
                  onClick: () => {
                    setCreateKind('task');
                    setCreateOpen(true);
                  },
                }
          }
          secondaryAction={
            hasFilters
              ? {
                  label: 'Nova tarefa',
                  onClick: () => {
                    setCreateKind('task');
                    setCreateOpen(true);
                  },
                }
              : undefined
          }
        />
      ) : null}

      {/* Quadro Kanban ou Calendário semanal */}
      {viewMode === 'week' ? (
        <div className="rounded-2xl p-4 bg-[#EEF4FA]/50">
          <TaskCalendarView
            tasks={filteredTasks.map((task) => {
              const assigneeId = getTaskAssigneeId(task);
              const assignee = users.find((u) => String(u.id) === String(assigneeId));
              return {
                ...task,
                assigneeName:
                  task.assigneeName ||
                  assignee?.full_name ||
                  assignee?.email ||
                  undefined,
              };
            })}
            loading={false}
            defaultView="week"
            allowedViews={['week']}
            onEditTask={(task) => {
              if (!task?.id) return;
              window.dispatchEvent(new CustomEvent('task:open', {
                detail: { taskId: task.id },
              }));
            }}
          />
        </div>
      ) : (
      <div className="rounded-2xl p-4 bg-[#EEF4FA]/50">
        <DragDropContext onDragEnd={handleDragEnd}>
          {/* Container principal com scroll horizontal */}
          <div className="kanban-scroll-container overflow-x-auto">
            <div 
              className="flex gap-4 pb-4"
              style={{ 
                width: `${KANBAN_COLUMNS.length * (density === 'compact' ? 256 : 320) + (KANBAN_COLUMNS.length - 1) * 16}px`,
                minHeight: '600px'
              }}
            >
              {KANBAN_COLUMNS.map(column => (
                <TaskColumn
                  key={column.id}
                  column={column}
                  tasks={tasksByStatus[column.id] || []}
                  users={users}
                  clients={clients}
                  droppableId={column.id}
                  agencyId={agencyId}
                  userId={currentUserId}
                  density={density}
                />
              ))}
            </div>
          </div>
        </DragDropContext>
      </div>
      )}

      {/* Estatísticas resumidas */}
      {viewMode === 'kanban' && totalTasks > 0 && (
        <Card className="mt-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 text-center">
              {KANBAN_COLUMNS.map(column => {
                const count = tasksByStatus[column.id]?.length || 0;
                const percentage = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;
                
                return (
                  <div key={column.id}>
                    <div className="text-2xl font-bold text-gray-900">{count}</div>
                    <div className="text-sm text-gray-600">{column.title}</div>
                    <div className="text-xs text-gray-500">{percentage}%</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <TaskCreateModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultKind={createKind}
        onSuccess={() => {
          setCreateOpen(false);
          loadData({ silent: true });
        }}
      />
    </div>
  );
}
