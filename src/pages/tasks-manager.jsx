
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
  Filter, 
  Users, 
  Building2, 
  Loader2, 
  AlertCircle,
  RefreshCcw,
  Plus,
  Clock,
  Flag,
  Kanban,
  CalendarDays
} from 'lucide-react';
import { toast } from 'sonner';
import TaskCreateModal from '@/components/tasks/TaskCreateModal';
import TaskCalendarView from '@/components/tasks/TaskCalendarView';
import {
  EMPTY_TASK_FILTERS,
  TASK_FILTER_PRESETS,
  TASKS_MANAGER_QUICK_PRESETS,
  applyTaskFilters,
  getTaskAssigneeId,
  getTaskFilterPreset,
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
import { TASK_SCOPE_LABELS } from '@/lib/taskScopeLabels';

// Soft pastel kanban columns (mapa canônico)
const KANBAN_COLUMNS = getKanbanBoardColumns();

const QUICK_PRESETS = TASKS_MANAGER_QUICK_PRESETS.map((id) =>
  getTaskFilterPreset(id)
).filter(Boolean);

function QuickAddTask({ columnId, agencyId, userId, disabled }) {
  const [title, setTitle] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const submit = async () => {
    const trimmed = title.trim();
    if (!trimmed || saving || !agencyId || disabled) return;
    setSaving(true);
    try {
      const status =
        columnId && !['completed', 'blocked', 'cancelled'].includes(columnId)
          ? columnId
          : 'todo';
      const created = await createManualTask({
        title: trimmed,
        agencyId,
        userId: userId || null,
        status,
        quickAdd: true,
      });
      setTitle('');
      toast.success('Tarefa criada — complete os detalhes');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('task:refresh'));
      }
      if (created?.id) openTaskDrawer(created.id);
    } catch (err) {
      console.error('Quick-add falhou:', err);
      toast.error(err?.message || 'Não foi possível criar a tarefa');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-2">
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
            submit();
          }
        }}
      />
      {saving ? (
        <p className="mt-1 text-[10px] text-[#7A7595]">Salvando…</p>
      ) : (
        <p className="mt-1 text-[10px] text-[#7A7595]">Enter para criar</p>
      )}
    </div>
  );
}

// Componente simples para card de tarefa
function TaskCard({ task, users, clients }) {
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

  const assignedUser = getAssignedUser(task.assignedTo || task.assigneeId);
  const client = getClient(task.clientId);
  const colorStyle = assigneeColorStyle(getTaskAssigneeId(task));

  return (
    <Card
      className="mb-3 cursor-pointer hover:shadow-[var(--shadow-elevated)] transition-shadow overflow-hidden rounded-2xl border-transparent"
      style={colorStyle}
    >
      <CardContent className="p-3">
        <div className="space-y-2">
          <h4 className="font-medium text-sm line-clamp-2">{task.title}</h4>
          
          {task.description && (
            <p className="text-xs text-gray-600 line-clamp-2">{task.description}</p>
          )}
          
          <div className="flex flex-wrap gap-1">
            {shouldShowPriorityBadge(task.priority) && (
              <Badge className={`text-xs ${getPriorityColor(task.priority)}`}>
                <Flag className="w-3 h-3 mr-1" />
                {priorityLabelPt(task.priority)}
              </Badge>
            )}
            
            {task.dueDate && (
              <Badge variant="outline" className="text-xs">
                <Clock className="w-3 h-3 mr-1" />
                {new Date(task.dueDate).toLocaleDateString()}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center justify-between text-xs">
            {assignedUser && (
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span className="truncate max-w-20">{assignedUser.full_name || assignedUser.email}</span>
              </div>
            )}
            
            <div className="flex items-center gap-1 text-gray-500">
              <Building2 className="w-3 h-3" />
              <span className="truncate max-w-20">
                {client?.name || 'Interno'}
              </span>
            </div>
          </div>
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
}) {
  return (
    <div className="flex-shrink-0 w-80 min-w-80">
      <div className={`h-full rounded-2xl p-4 ${column.color}`}>
        <div className="pb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold text-[#18162A]">{column.title}</span>
            <Badge variant="secondary" className="text-xs rounded-full bg-white/70">
              {tasks.length}
            </Badge>
          </div>
          <p className="text-xs text-[#7A7595]">{column.description}</p>
        </div>
        
        <div className="pt-1">
          <Droppable droppableId={droppableId}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`min-h-[200px] space-y-2 p-2 rounded-xl transition-colors ${
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
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
                
                {tasks.length === 0 && (
                  <div className="text-center py-6 text-[#7A7595]">
                    <p className="text-sm">Nenhuma tarefa aqui</p>
                    <p className="text-xs mt-1">Arraste um card ou use o quick-add</p>
                  </div>
                )}
                <QuickAddTask
                  columnId={column.id}
                  agencyId={agencyId}
                  userId={userId}
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

  // Estados de filtros
  const [selectedClient, setSelectedClient] = useState('all');
  const [selectedUser, setSelectedUser] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [presetFilters, setPresetFilters] = useState({ ...EMPTY_TASK_FILTERS });
  const [createOpen, setCreateOpen] = useState(false);
  const [createKind, setCreateKind] = useState('task');
  const [searchParams, setSearchParams] = useSearchParams();
  const viewFromUrl = searchParams.get('view') === 'week' ? 'week' : 'kanban';
  const [viewMode, setViewMode] = useState(viewFromUrl); // 'kanban' | 'week'
  const activePresetId = presetFilters.preset || null;

  useEffect(() => {
    setViewMode(viewFromUrl);
  }, [viewFromUrl]);

  // Sync preset da URL (?preset=) — ids inválidos são removidos
  useEffect(() => {
    const raw = searchParams.get('preset');
    if (!raw) return;
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
  }, [searchParams, currentUserId, setSearchParams, presetFilters.preset]);

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

  const applyPreset = useCallback(
    (presetId) => {
      const preset = getTaskFilterPreset(presetId);
      if (!preset) return;
      const nextFilters = preset.apply({ userId: currentUserId });
      setPresetFilters(nextFilters);
      if (nextFilters.assignee && nextFilters.assignee !== 'all') {
        setSelectedUser(String(nextFilters.assignee));
      } else {
        setSelectedUser('all');
      }
      if (nextFilters.status && nextFilters.status !== 'all') {
        setSelectedStatus(String(nextFilters.status));
      } else {
        setSelectedStatus('all');
      }
      const next = new URLSearchParams(searchParams);
      next.set('preset', preset.id);
      setSearchParams(next, { replace: true });
    },
    [currentUserId, searchParams, setSearchParams]
  );

  const clearPresetOnly = useCallback(() => {
    setPresetFilters({ ...EMPTY_TASK_FILTERS });
    const next = new URLSearchParams(searchParams);
    next.delete('preset');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

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
      search: searchTerm || presetFilters.search || '',
    };

    return tasks.filter((task) => {
      if (selectedClient === 'internal') {
        if (task.clientId) return false;
      } else if (selectedClient !== 'all' && task.clientId !== selectedClient) {
        return false;
      }

      return applyTaskFilters(task, merged, { userId: currentUserId });
    });
  }, [
    tasks,
    selectedClient,
    selectedUser,
    selectedStatus,
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
    setSearchTerm('');
    setPresetFilters({ ...EMPTY_TASK_FILTERS });
    const next = new URLSearchParams(searchParams);
    next.delete('preset');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  if (loading) {
    return (
      <div className="container mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando tarefas...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center max-w-md">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Não foi possível carregar as tarefas</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => loadData()} className="gap-2">
              <RefreshCcw className="w-4 h-4" />
              Tentar novamente
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const totalTasks = filteredTasks.length;
  const hasFilters =
    selectedClient !== 'all' ||
    selectedUser !== 'all' ||
    selectedStatus !== 'all' ||
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
          <p className="text-[#7A7595] mt-1">
            {TASK_SCOPE_LABELS.agency.pageSubtitle}
          </p>
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

      {/* Barra de Filtros */}
      <div className="rounded-2xl border border-[#E8E5F5] bg-[#F5F2FC]/70 px-4 py-3 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-[#18162A]">
          <Filter className="w-4 h-4 text-[#6C47D8]" />
          <span>Filtros</span>
          {totalTasks > 0 && (
            <Badge variant="secondary" className="ml-auto rounded-full">
              {totalTasks} tarefa{totalTasks !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {QUICK_PRESETS.map((preset) => {
            const needsUser = String(preset.id).startsWith('my_') || preset.id === 'waiting_others';
            const disabled = needsUser && !currentUserId;
            const active = activePresetId === preset.id;
            return (
              <Button
                key={preset.id}
                type="button"
                size="sm"
                variant={active ? 'default' : 'outline'}
                disabled={disabled}
                className="rounded-full h-8 text-xs"
                onClick={() => {
                  if (active) clearPresetOnly();
                  else applyPreset(preset.id);
                }}
              >
                {preset.label}
              </Button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Busca textual */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar por título ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white"
                />
              </div>
            </div>

            {/* Filtro por cliente */}
            <Select value={selectedClient} onValueChange={setSelectedClient}>
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
                const next = new URLSearchParams(searchParams);
                next.delete('preset');
                setSearchParams(next, { replace: true });
              }}
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Todos os responsáveis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os responsáveis</SelectItem>
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

            {/* Filtro por status */}
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
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

      {/* Quadro Kanban ou Calendário semanal */}
      {viewMode === 'week' ? (
        <div className="rounded-2xl p-4 bg-[#F5F2FC]/50">
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
      <div className="rounded-2xl p-4 bg-[#F5F2FC]/50">
        <DragDropContext onDragEnd={handleDragEnd}>
          {/* Container principal com scroll horizontal */}
          <div className="kanban-scroll-container overflow-x-auto">
            <div 
              className="flex gap-4 pb-4"
              style={{ 
                width: `${KANBAN_COLUMNS.length * 320 + (KANBAN_COLUMNS.length - 1) * 16}px`,
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
