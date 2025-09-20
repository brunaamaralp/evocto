import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Task } from '@/api/entities';
import { User } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
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
  AlertCircle,
  TrendingUp,
  BarChart3,
  Zap,
  Settings,
  RefreshCw,
  Wifi,
  WifiOff,
  Timer
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { FixedSizeList as List } from 'react-window';
import TaskCreateModal from './TaskCreateModal';
import TaskAnalytics from './TaskAnalytics';
import TaskAutomations from './TaskAutomations';

// Enhanced cache management
class TaskCache {
  constructor() {
    this.cache = new Map();
    this.timestamps = new Map();
    this.offline = false;
    this.pendingChanges = [];
    this.init();
  }

  init() {
    // Load from localStorage
    try {
      const cached = localStorage.getItem('task-cache');
      if (cached) {
        const { data, timestamps } = JSON.parse(cached);
        this.cache = new Map(data);
        this.timestamps = new Map(timestamps);
      }
    } catch (e) {
      console.warn('Failed to load cache:', e);
    }

    // Online/offline detection
    window.addEventListener('online', () => {
      this.offline = false;
      this.syncPendingChanges();
    });
    
    window.addEventListener('offline', () => {
      this.offline = true;
    });
  }

  set(key, data, ttl = 300000) { // 5 min default TTL
    this.cache.set(key, data);
    this.timestamps.set(key, Date.now() + ttl);
    this.persist();
  }

  get(key) {
    const timestamp = this.timestamps.get(key);
    if (!timestamp || Date.now() > timestamp) {
      this.cache.delete(key);
      this.timestamps.delete(key);
      return null;
    }
    return this.cache.get(key);
  }

  persist() {
    try {
      localStorage.setItem('task-cache', JSON.stringify({
        data: Array.from(this.cache.entries()),
        timestamps: Array.from(this.timestamps.entries())
      }));
    } catch (e) {
      console.warn('Failed to persist cache:', e);
    }
  }

  addPendingChange(change) {
    this.pendingChanges.push({ ...change, timestamp: Date.now() });
    this.persist();
  }

  async syncPendingChanges() {
    if (this.pendingChanges.length === 0) return;
    
    for (const change of this.pendingChanges) {
      try {
        await change.execute();
      } catch (e) {
        console.error('Failed to sync change:', e);
        continue;
      }
    }
    
    this.pendingChanges = [];
    this.persist();
  }
}

const taskCache = new TaskCache();

// Enhanced drag placeholder component
function DragPlaceholder({ column, isDraggingOver, draggedItem }) {
  if (!isDraggingOver) return null;

  return (
    <div className="bg-blue-100 border-2 border-dashed border-blue-300 rounded-lg p-4 mb-3 animate-pulse">
      <div className="flex items-center gap-2 text-blue-600">
        <div className="w-4 h-4 bg-blue-300 rounded animate-bounce" />
        <span className="text-sm font-medium">
          Solte aqui em "{column.title}"
        </span>
      </div>
      {draggedItem && (
        <div className="mt-2 text-xs text-blue-500">
          Movendo: {draggedItem.title}
        </div>
      )}
    </div>
  );
}

// Virtualized task list for performance
function VirtualizedTaskList({ tasks, users, columnId, onCardClick }) {
  const itemHeight = 120; // Height of each task card
  const maxHeight = 600; // Maximum height of the list

  const Row = ({ index, style }) => {
    const task = tasks[index];
    return (
      <div style={style}>
        <EnhancedTaskCard
          task={task}
          index={index}
          users={users}
          onClick={() => onCardClick(task)}
        />
      </div>
    );
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-xs">Nenhuma tarefa</p>
      </div>
    );
  }

  const listHeight = Math.min(tasks.length * itemHeight, maxHeight);

  return (
    <List
      height={listHeight}
      itemCount={tasks.length}
      itemSize={itemHeight}
      className="custom-scrollbar"
    >
      {Row}
    </List>
  );
}

// Enhanced task card with more visual indicators
function EnhancedTaskCard({ task, index, users, onClick, isDragging = false }) {
  const assignedUser = users.find(u => u.id === task.assignedTo);
  
  // Enhanced calculations
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
  const isDueSoon = task.dueDate && 
    new Date(task.dueDate) < new Date(Date.now() + 24 * 60 * 60 * 1000) && 
    task.status !== 'completed';
  
  const hasComments = task.comments?.length > 0;
  const hasAttachments = task.attachments?.length > 0;
  const hasChecklist = task.checklist?.length > 0;
  const hasBlockers = task.blockedBy?.some(b => !b.resolvedAt);
  const hasDependencies = task.dependencies?.length > 0;
  
  const checklistProgress = hasChecklist ? 
    (task.checklist.filter(c => c.completed).length / task.checklist.length) * 100 : 0;

  const hasRecentActivity = task.comments?.some(c => 
    new Date(c.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)
  );

  const unreadComments = task.comments?.filter(c => 
    c.userId !== task.assignedTo && 
    new Date(c.createdAt) > new Date(task.lastViewedAt || 0)
  ).length || 0;

  // Time tracking
  const timeSpent = task.timeEntries?.reduce((sum, entry) => sum + (entry.duration || 0), 0) || 0;
  const timeRemaining = (task.estimatedHours || 0) - timeSpent;
  const isOverBudget = timeSpent > (task.estimatedHours || 0);

  const priorityColors = {
    low: 'border-l-blue-500 bg-blue-50',
    medium: 'border-l-yellow-500 bg-yellow-50', 
    high: 'border-l-orange-500 bg-orange-50',
    urgent: 'border-l-red-500 bg-red-50'
  };

  const statusIcons = {
    backlog: '📋',
    todo: '📝',
    in_progress: '⚡',
    in_review: '👀',
    completed: '✅',
    cancelled: '❌',
    blocked: '🚫'
  };

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`
            mb-3 cursor-pointer transition-all duration-300 border-l-4 hover:shadow-lg
            ${snapshot.isDragging ? 'shadow-2xl rotate-2 scale-105 z-50' : ''}
            ${priorityColors[task.priority] || 'border-l-gray-300 bg-gray-50'}
            ${isOverdue ? 'ring-2 ring-red-300 ring-opacity-75' : ''}
            ${isDueSoon ? 'ring-2 ring-yellow-300 ring-opacity-75' : ''}
            ${hasRecentActivity ? 'ring-2 ring-blue-200 ring-opacity-50' : ''}
            ${hasBlockers ? 'opacity-75' : ''}
          `}
          onClick={onClick}
        >
          {/* Enhanced Header */}
          <CardHeader className="p-3 pb-2">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-sm font-medium line-clamp-2 leading-tight flex items-center gap-2">
                <span>{statusIcons[task.status] || '📋'}</span>
                <span className="flex-1">{task.title}</span>
                {hasBlockers && (
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" title="Bloqueada" />
                )}
              </CardTitle>
              
              {/* Status indicators */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {unreadComments > 0 && (
                  <Badge variant="destructive" className="text-xs h-4 px-1">
                    {unreadComments}
                  </Badge>
                )}
                {hasComments && (
                  <div className="flex items-center text-xs text-blue-600">
                    <MessageCircle className="w-3 h-3" />
                    <span className="ml-0.5">{task.comments.length}</span>
                  </div>
                )}
                {hasAttachments && (
                  <Paperclip className="w-3 h-3 text-gray-500" />
                )}
              </div>
            </div>
            
            {/* Progress indicators */}
            {hasChecklist && (
              <div className="mt-2">
                <div className="flex items-center gap-2 text-xs mb-1">
                  <CheckSquare className="w-3 h-3 text-gray-500" />
                  <span className="text-gray-600">
                    {task.checklist.filter(c => c.completed).length}/{task.checklist.length}
                  </span>
                </div>
                <Progress value={checklistProgress} className="h-1" />
              </div>
            )}
          </CardHeader>

          {/* Enhanced Content */}
          <CardContent className="p-3 pt-0 space-y-2">
            {/* Dependencies warning */}
            {hasDependencies && (
              <div className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 rounded px-2 py-1">
                <AlertCircle className="w-3 h-3" />
                <span>Depende de {task.dependencies.length} tarefa(s)</span>
              </div>
            )}

            {/* Time tracking */}
            {task.estimatedHours > 0 && (
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <Timer className="w-3 h-3 text-gray-500" />
                  <span className={isOverBudget ? 'text-red-600' : 'text-gray-600'}>
                    {timeSpent.toFixed(1)}h / {task.estimatedHours}h
                  </span>
                </div>
                {timeRemaining !== 0 && (
                  <span className={`text-xs ${timeRemaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {timeRemaining > 0 ? '+' : ''}{timeRemaining.toFixed(1)}h
                  </span>
                )}
              </div>
            )}

            {/* Bottom metadata */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                {/* Priority dot */}
                <div 
                  className={`w-2 h-2 rounded-full ${
                    task.priority === 'urgent' ? 'bg-red-500' :
                    task.priority === 'high' ? 'bg-orange-500' :
                    task.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}
                  title={`Prioridade: ${task.priority || 'medium'}`}
                />

                {/* Due date */}
                {task.dueDate && (
                  <div className={`flex items-center gap-1 ${
                    isOverdue ? 'text-red-600 font-medium' : 
                    isDueSoon ? 'text-yellow-600 font-medium' : 'text-gray-500'
                  }`}>
                    <Calendar className="w-3 h-3" />
                    <span>
                      {new Date(task.dueDate).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit'
                      })}
                    </span>
                  </div>
                )}
              </div>

              {/* Assignee with activity indicator */}
              {assignedUser && (
                <div className="relative">
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                      {assignedUser.full_name?.charAt(0) || assignedUser.email?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  {hasRecentActivity && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse" />
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </Draggable>
  );
}

// Enhanced Kanban Column with virtualization
function EnhancedKanbanColumn({ column, tasks, users, onCardClick, isDraggingOver, draggedItem }) {
  const [collapsed, setCollapsed] = useState(false);
  const useVirtualization = tasks.length > 50; // Virtualize when many tasks

  return (
    <div className="flex-shrink-0 w-80 min-w-80 bg-gray-50 rounded-lg p-4">
      {/* Enhanced Column Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="h-6 w-6 p-0"
          >
            <MoreVertical className={`w-3 h-3 transition-transform ${collapsed ? 'rotate-90' : ''}`} />
          </Button>
          <h3 className="font-medium text-gray-900 text-sm">{column.title}</h3>
          <Badge variant="secondary" className="text-xs h-5">
            {tasks.length}
          </Badge>
        </div>
        
        {/* Column actions */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" title="Adicionar tarefa">
            <Plus className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" title="Configurações">
            <Settings className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {!collapsed && (
        <Droppable droppableId={column.id}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`
                min-h-20 max-h-[70vh] overflow-hidden
                ${snapshot.isDraggingOver ? 'bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg p-2' : ''}
              `}
            >
              <DragPlaceholder 
                column={column}
                isDraggingOver={snapshot.isDraggingOver}
                draggedItem={draggedItem}
              />
              
              {useVirtualization ? (
                <VirtualizedTaskList
                  tasks={tasks}
                  users={users}
                  columnId={column.id}
                  onCardClick={onCardClick}
                />
              ) : (
                <div className="space-y-3 overflow-y-auto custom-scrollbar max-h-[60vh]">
                  {tasks.map((task, index) => (
                    <EnhancedTaskCard
                      key={task.id}
                      task={task}
                      index={index}
                      users={users}
                      onClick={() => onCardClick(task)}
                    />
                  ))}
                  {tasks.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">Nenhuma tarefa</p>
                    </div>
                  )}
                </div>
              )}
              
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      )}
    </div>
  );
}

// Main Enhanced Kanban Board
export default function EnhancedTaskKanban({ clientId, serviceId, filters = {} }) {
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
  const [activeTab, setActiveTab] = useState('board');
  const [draggedItem, setDraggedItem] = useState(null);
  const [syncStatus, setSyncStatus] = useState('synced'); // synced, syncing, offline
  
  // Automation settings
  const [automationSettings, setAutomationSettings] = useState({
    autoAssign: false,
    autoTransition: false,
    smartNotifications: true,
    workloadBalancing: false
  });

  // Performance settings
  const [performanceSettings, setPerformanceSettings] = useState({
    virtualization: true,
    cacheEnabled: true,
    realTimeSync: true,
    animationsEnabled: true
  });

  // Columns configuration
  const KANBAN_COLUMNS = [
    { id: 'backlog', title: 'Backlog', status: 'backlog', color: 'bg-gray-100', limit: null },
    { id: 'todo', title: 'A Fazer', status: 'todo', color: 'bg-blue-100', limit: 10 },
    { id: 'in_progress', title: 'Em Progresso', status: 'in_progress', color: 'bg-yellow-100', limit: 5 },
    { id: 'in_review', title: 'Em Revisão', status: 'in_review', color: 'bg-purple-100', limit: 3 },
    { id: 'completed', title: 'Concluído', status: 'completed', color: 'bg-green-100', limit: null },
    { id: 'cancelled', title: 'Cancelado', status: 'cancelled', color: 'bg-red-100', limit: null },
    { id: 'blocked', title: 'Bloqueado', status: 'blocked', color: 'bg-orange-100', limit: null }
  ];

  // Enhanced load tasks with caching
  const loadTasks = useCallback(async (useCache = true) => {
    const cacheKey = `tasks-${agencyId}-${clientId || 'all'}-${serviceId || 'all'}`;
    
    // Try cache first
    if (useCache && performanceSettings.cacheEnabled) {
      const cached = taskCache.get(cacheKey);
      if (cached) {
        setTasks(cached);
        setLoading(false);
        return;
      }
    }

    try {
      setSyncStatus('syncing');
      setLoading(true);
      
      const filterObj = { agencyId };
      if (clientId) filterObj.clientId = clientId;
      if (serviceId) filterObj.serviceId = serviceId;
      Object.assign(filterObj, filters);

      const tasksData = await Task.filter(filterObj, '-updated_date', 500);
      const enhancedTasks = tasksData?.map(task => ({
        ...task,
        lastViewedAt: task.lastViewedAt || new Date().toISOString()
      })) || [];

      setTasks(enhancedTasks);
      
      // Cache the results
      if (performanceSettings.cacheEnabled) {
        taskCache.set(cacheKey, enhancedTasks);
      }
      
      setSyncStatus('synced');
    } catch (err) {
      console.error('Error loading tasks:', err);
      setError('Erro ao carregar tarefas');
      setSyncStatus('offline');
    } finally {
      setLoading(false);
    }
  }, [agencyId, clientId, serviceId, filters, performanceSettings.cacheEnabled]);

  const loadUsers = useCallback(async () => {
    try {
      const usersData = await User.filter({ agencyId }, '-updated_date', 100);
      setUsers(usersData || []);
    } catch (err) {
      console.error('Error loading users:', err);
    }
  }, [agencyId]);

  // Auto-refresh with intelligent intervals
  useEffect(() => {
    if (!performanceSettings.realTimeSync) return;
    
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && syncStatus !== 'syncing') {
        loadTasks(true);
      }
    }, 30000); // 30 seconds when tab is active

    return () => clearInterval(interval);
  }, [loadTasks, performanceSettings.realTimeSync, syncStatus]);

  // Load initial data
  useEffect(() => {
    loadTasks();
    loadUsers();
  }, [loadTasks, loadUsers]);

  // Enhanced drag and drop with automations
  const handleDragStart = (result) => {
    const task = tasks.find(t => t.id === result.draggableId);
    setDraggedItem(task);
    
    // Haptic feedback on mobile
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  const handleDragEnd = async (result) => {
    setDraggedItem(null);
    
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    try {
      setSyncStatus('syncing');
      const task = tasks.find(t => t.id === draggableId);
      if (!task) return;

      const newStatus = destination.droppableId;
      const column = KANBAN_COLUMNS.find(c => c.id === newStatus);
      
      // Check WIP limits
      if (column?.limit) {
        const columnTasks = tasks.filter(t => t.status === newStatus);
        if (columnTasks.length >= column.limit) {
          alert(`Limite de ${column.limit} tarefas atingido em "${column.title}"`);
          return;
        }
      }

      const updates = {
        status: newStatus,
        kanbanColumn: newStatus,
        kanbanPosition: destination.index
      };

      // Auto-completion logic
      if (newStatus === 'completed' && task.status !== 'completed') {
        updates.completedAt = new Date().toISOString();
        updates.progress = 100;
        
        // Auto-assign next task if enabled
        if (automationSettings.autoAssign && task.assignedTo) {
          await autoAssignNextTask(task.assignedTo);
        }
      }

      if (newStatus !== 'completed' && task.status === 'completed') {
        updates.completedAt = null;
        updates.progress = task.progress < 100 ? task.progress : 90;
      }

      // Auto-transition dependent tasks
      if (automationSettings.autoTransition && newStatus === 'completed') {
        await autoTransitionDependentTasks(task.id);
      }

      // Add system comment
      const statusComment = {
        id: `status_${Date.now()}`,
        userId: user.id,
        userEmail: user.email,
        userName: user.full_name || user.email,
        content: `Status alterado de "${task.status}" para "${newStatus}"`,
        type: 'system',
        createdAt: new Date().toISOString()
      };
      
      updates.comments = [...(task.comments || []), statusComment];

      // Handle offline scenarios
      if (taskCache.offline) {
        taskCache.addPendingChange({
          type: 'update',
          taskId: task.id,
          updates,
          execute: () => Task.update(task.id, updates)
        });
        
        // Update local state immediately for offline experience
        setTasks(prev => prev.map(t => 
          t.id === task.id ? { ...t, ...updates } : t
        ));
      } else {
        await Task.update(task.id, updates);
        loadTasks(false); // Reload without cache
      }

      setSyncStatus('synced');

    } catch (err) {
      console.error('Error updating task:', err);
      setError('Erro ao mover tarefa');
      setSyncStatus('offline');
    }
  };

  // Auto-assign next task based on workload
  const autoAssignNextTask = async (userId) => {
    if (!automationSettings.workloadBalancing) return;
    
    const userTasks = tasks.filter(t => t.assignedTo === userId && t.status !== 'completed');
    if (userTasks.length >= 5) return; // Don't overload users

    const unassignedTasks = tasks
      .filter(t => !t.assignedTo && ['backlog', 'todo'].includes(t.status))
      .sort((a, b) => {
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        return (priorityOrder[b.priority] || 2) - (priorityOrder[a.priority] || 2);
      });

    if (unassignedTasks.length > 0) {
      const nextTask = unassignedTasks[0];
      await Task.update(nextTask.id, { assignedTo: userId });
      loadTasks(false);
    }
  };

  // Auto-transition dependent tasks
  const autoTransitionDependentTasks = async (completedTaskId) => {
    const dependentTasks = tasks.filter(t => 
      t.dependencies?.some(dep => dep.taskId === completedTaskId)
    );

    for (const task of dependentTasks) {
      const allDependenciesCompleted = task.dependencies.every(dep => {
        const depTask = tasks.find(t => t.id === dep.taskId);
        return depTask?.status === 'completed';
      });

      if (allDependenciesCompleted && task.status === 'backlog') {
        await Task.update(task.id, { 
          status: 'todo',
          kanbanColumn: 'todo'
        });
      }
    }
  };

  // Enhanced filtering with smart suggestions
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = !searchTerm || 
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
      const matchesAssignee = assigneeFilter === 'all' || task.assignedTo === assigneeFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesAssignee;
    });
  }, [tasks, searchTerm, statusFilter, priorityFilter, assigneeFilter]);

  // Task analytics
  const taskAnalytics = useMemo(() => {
    const total = filteredTasks.length;
    const completed = filteredTasks.filter(t => t.status === 'completed').length;
    const inProgress = filteredTasks.filter(t => t.status === 'in_progress').length;
    const overdue = filteredTasks.filter(t => 
      t.dueDate && 
      new Date(t.dueDate) < new Date() && 
      t.status !== 'completed'
    ).length;
    const blockedTasks = filteredTasks.filter(t => t.status === 'blocked').length;
    
    // Productivity metrics
    const avgCompletionTime = filteredTasks
      .filter(t => t.status === 'completed' && t.completedAt && t.created_date)
      .reduce((sum, t) => {
        const start = new Date(t.created_date);
        const end = new Date(t.completedAt);
        return sum + (end - start) / (1000 * 60 * 60 * 24); // days
      }, 0) / Math.max(completed, 1);

    const velocityThisWeek = filteredTasks.filter(t => {
      if (!t.completedAt) return false;
      const completedDate = new Date(t.completedAt);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return completedDate >= weekAgo;
    }).length;

    return {
      total,
      completed,
      inProgress,
      overdue,
      blocked: blockedTasks,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      avgCompletionTime: Math.round(avgCompletionTime * 10) / 10,
      velocityThisWeek,
      productivity: velocityThisWeek > 0 ? 'high' : overdue > 3 ? 'low' : 'medium'
    };
  }, [filteredTasks]);

  const handleCardClick = (task) => {
    // Update last viewed timestamp
    Task.update(task.id, { 
      lastViewedAt: new Date().toISOString() 
    });
    
    // Open task drawer
    window.dispatchEvent(new CustomEvent('task:open', { 
      detail: { taskId: task.id } 
    }));
  };

  if (loading && tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Carregando tarefas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Toolbar */}
      <div className="bg-white rounded-lg border p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList className="grid w-fit grid-cols-4">
              <TabsTrigger value="board" className="gap-2">
                <Eye className="w-4 h-4" />
                Board
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-2">
                <BarChart3 className="w-4 h-4" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="automations" className="gap-2">
                <Zap className="w-4 h-4" />
                Automações
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2">
                <Settings className="w-4 h-4" />
                Config
              </TabsTrigger>
            </TabsList>

            {/* Sync status and actions */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                {syncStatus === 'synced' && <Wifi className="w-4 h-4 text-green-600" />}
                {syncStatus === 'syncing' && <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />}
                {syncStatus === 'offline' && <WifiOff className="w-4 h-4 text-red-600" />}
                <span className={`
                  ${syncStatus === 'synced' ? 'text-green-600' : ''}
                  ${syncStatus === 'syncing' ? 'text-blue-600' : ''}
                  ${syncStatus === 'offline' ? 'text-red-600' : ''}
                `}>
                  {syncStatus === 'synced' && 'Sincronizado'}
                  {syncStatus === 'syncing' && 'Sincronizando...'}
                  {syncStatus === 'offline' && 'Offline'}
                </span>
              </div>

              <Button onClick={() => setShowCreateModal(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Nova Tarefa
              </Button>
            </div>
          </div>

          {/* Board Tab */}
          <TabsContent value="board" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar tarefas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

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
            </div>

            {/* Quick Stats */}
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full" />
                <span>Total: {taskAnalytics.total}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <span>Concluídas: {taskAnalytics.completed}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                <span>Em Progresso: {taskAnalytics.inProgress}</span>
              </div>
              {taskAnalytics.overdue > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-red-600 font-medium">Atrasadas: {taskAnalytics.overdue}</span>
                </div>
              )}
              <div className="ml-auto flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span>Velocidade: {taskAnalytics.velocityThisWeek} tarefas/semana</span>
              </div>
            </div>

            {/* Enhanced Kanban Board */}
            <div className="bg-gray-50 rounded-lg p-4">
              <DragDropContext 
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <div className="flex overflow-x-auto gap-6 pb-4 min-h-[600px] custom-scrollbar">
                  {KANBAN_COLUMNS.map(column => {
                    const columnTasks = filteredTasks
                      .filter(task => task.status === column.status)
                      .sort((a, b) => (a.kanbanPosition || 0) - (b.kanbanPosition || 0));
                    
                    return (
                      <EnhancedKanbanColumn
                        key={column.id}
                        column={column}
                        tasks={columnTasks}
                        users={users}
                        onCardClick={handleCardClick}
                        draggedItem={draggedItem}
                      />
                    );
                  })}
                </div>
              </DragDropContext>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <TaskAnalytics 
              tasks={filteredTasks} 
              users={users} 
              analytics={taskAnalytics}
            />
          </TabsContent>

          {/* Automations Tab */}
          <TabsContent value="automations">
            <TaskAutomations
              settings={automationSettings}
              onSettingsChange={setAutomationSettings}
              tasks={filteredTasks}
              users={users}
            />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm">Virtualização</label>
                    <Switch
                      checked={performanceSettings.virtualization}
                      onCheckedChange={(checked) => 
                        setPerformanceSettings(prev => ({ ...prev, virtualization: checked }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm">Cache Habilitado</label>
                    <Switch
                      checked={performanceSettings.cacheEnabled}
                      onCheckedChange={(checked) => 
                        setPerformanceSettings(prev => ({ ...prev, cacheEnabled: checked }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm">Sincronização em Tempo Real</label>
                    <Switch
                      checked={performanceSettings.realTimeSync}
                      onCheckedChange={(checked) => 
                        setPerformanceSettings(prev => ({ ...prev, realTimeSync: checked }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm">Animações</label>
                    <Switch
                      checked={performanceSettings.animationsEnabled}
                      onCheckedChange={(checked) => 
                        setPerformanceSettings(prev => ({ ...prev, animationsEnabled: checked }))
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Cache & Storage</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      taskCache.cache.clear();
                      taskCache.timestamps.clear();
                      taskCache.persist();
                      loadTasks(false);
                    }}
                  >
                    Limpar Cache
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => taskCache.syncPendingChanges()}
                  >
                    Sincronizar Pendências ({taskCache.pendingChanges.length})
                  </Button>
                  <div className="text-sm text-gray-600">
                    Cache: {taskCache.cache.size} itens<br />
                    Pendências: {taskCache.pendingChanges.length} alterações
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-4 h-4" />
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Task Create Modal */}
      <TaskCreateModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={() => {
          setShowCreateModal(false);
          loadTasks(false);
        }}
      />
    </div>
  );
}