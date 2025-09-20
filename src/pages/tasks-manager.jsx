
import React, { useState, useEffect, useCallback } from 'react';
import { Task } from '@/api/entities';
import { Client } from '@/api/entities';
import { User } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Flag
} from 'lucide-react';
import { toast } from 'sonner';

// Configurações das colunas do Kanban
const KANBAN_COLUMNS = [
  { 
    id: 'backlog', 
    title: 'Backlog', 
    color: 'bg-gray-100',
    description: 'Tarefas em espera'
  },
  { 
    id: 'todo', 
    title: 'A Fazer', 
    color: 'bg-blue-100',
    description: 'Prontas para iniciar'
  },
  { 
    id: 'in_progress', 
    title: 'Em Andamento', 
    color: 'bg-yellow-100',
    description: 'Sendo executadas'
  },
  { 
    id: 'in_review', 
    title: 'Em Revisão', 
    color: 'bg-purple-100',
    description: 'Aguardando revisão'
  },
  { 
    id: 'completed', 
    title: 'Concluído', 
    color: 'bg-green-100',
    description: 'Finalizadas'
  },
  { 
    id: 'blocked', 
    title: 'Bloqueado', 
    color: 'bg-red-100',
    description: 'Com impedimentos'
  }
];

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
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const assignedUser = getAssignedUser(task.assignedTo);
  const client = getClient(task.clientId);

  return (
    <Card className="mb-3 cursor-pointer hover:shadow-md transition-shadow">
      <CardContent className="p-3">
        <div className="space-y-2">
          <h4 className="font-medium text-sm line-clamp-2">{task.title}</h4>
          
          {task.description && (
            <p className="text-xs text-gray-600 line-clamp-2">{task.description}</p>
          )}
          
          <div className="flex flex-wrap gap-1">
            {task.priority && (
              <Badge className={`text-xs ${getPriorityColor(task.priority)}`}>
                <Flag className="w-3 h-3 mr-1" />
                {task.priority}
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
            
            {client && (
              <div className="flex items-center gap-1 text-gray-500">
                <Building2 className="w-3 h-3" />
                <span className="truncate max-w-20">{client.name}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Componente para coluna do Kanban
function TaskColumn({ column, tasks, users, clients, droppableId }) {
  return (
    <div className="flex-shrink-0 w-80 min-w-80">
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${column.color.replace('bg-', 'bg-')}`} />
              <span className="text-sm font-medium">{column.title}</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {tasks.length}
            </Badge>
          </CardTitle>
          <p className="text-xs text-gray-500">{column.description}</p>
        </CardHeader>
        
        <CardContent className="pt-0">
          <Droppable droppableId={droppableId}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`min-h-[200px] space-y-2 p-2 rounded-md transition-colors ${
                  snapshot.isDraggingOver ? 'bg-blue-50' : ''
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
                          // Abrir drawer de tarefa
                          window.dispatchEvent(new CustomEvent('task:open', {
                            detail: { taskId: task.id }
                          }));
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
                  <div className="text-center py-8 text-gray-400">
                    <p className="text-sm">Nenhuma tarefa</p>
                  </div>
                )}
              </div>
            )}
          </Droppable>
        </CardContent>
      </Card>
    </div>
  );
}

export default function TasksManagerPage() {
  const { user, agencyId } = useSession();
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

  // Carregar dados
  const loadData = useCallback(async (useCache = true) => {
    if (!agencyId) return;
    
    setLoading(true);
    setError('');
    
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
      setError('Erro ao carregar dados. Tente novamente.');
      toast.error('Erro ao carregar tarefas');
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Aplicar filtros
  const filteredTasks = React.useMemo(() => {
    return tasks.filter(task => {
      // Filtro por cliente
      if (selectedClient !== 'all' && task.clientId !== selectedClient) {
        return false;
      }

      // Filtro por responsável
      if (selectedUser !== 'all' && task.assignedTo !== selectedUser) {
        return false;
      }

      // Filtro por status
      if (selectedStatus !== 'all' && task.status !== selectedStatus) {
        return false;
      }

      // Filtro por busca textual
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          task.title?.toLowerCase().includes(searchLower) ||
          task.description?.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });
  }, [tasks, selectedClient, selectedUser, selectedStatus, searchTerm]);

  // Organizar tarefas por coluna
  const tasksByStatus = React.useMemo(() => {
    const organized = {};
    
    KANBAN_COLUMNS.forEach(column => {
      organized[column.id] = filteredTasks.filter(task => task.status === column.id);
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
    
    try {
      // Atualizar localmente primeiro para responsividade
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId ? { ...task, status: newStatus } : task
        )
      );

      // Atualizar no backend
      await Task.update(taskId, { 
        status: newStatus,
        kanbanColumn: newStatus
      });

      const statusLabel = KANBAN_COLUMNS.find(col => col.id === newStatus)?.title || newStatus;
      toast.success(`Tarefa movida para "${statusLabel}"`);
      
      // Disparar evento para atualizar outros componentes
      window.dispatchEvent(new CustomEvent('task:updated', { 
        detail: { taskId, status: newStatus } 
      }));

    } catch (error) {
      console.error('Erro ao mover tarefa:', error);
      toast.error('Erro ao mover tarefa');
      
      // Revert change local
      loadData(false);
    }
  }, [loadData]);

  // Limpar filtros
  const clearFilters = useCallback(() => {
    setSelectedClient('all');
    setSelectedUser('all');
    setSelectedStatus('all');
    setSearchTerm('');
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
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
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center max-w-md">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Erro ao carregar</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => loadData(false)} className="gap-2">
              <RefreshCcw className="w-4 h-4" />
              Tentar novamente
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const totalTasks = filteredTasks.length;
  const hasFilters = selectedClient !== 'all' || selectedUser !== 'all' || selectedStatus !== 'all' || searchTerm;

  return (
    <div className="container mx-auto p-6 max-w-full">
      {/* Cabeçalho */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-3xl font-bold text-gray-900">Gerenciador de Tarefas</h1>
          <Button
            onClick={() => {
              // Abrir modal de criação de tarefa
              window.dispatchEvent(new CustomEvent('task:create'));
            }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Nova Tarefa
          </Button>
        </div>
        <p className="text-gray-600">
          Visualize e gerencie todas as tarefas da organização
        </p>
      </div>

      {/* Barra de Filtros */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
            {totalTasks > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {totalTasks} tarefa{totalTasks !== 1 ? 's' : ''}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Busca textual */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar por título ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filtro por cliente */}
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os clientes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clientes</SelectItem>
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
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
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
              <SelectTrigger>
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

          {/* Ações dos filtros */}
          {hasFilters && (
            <div className="mt-4 flex justify-end">
              <Button variant="outline" onClick={clearFilters} size="sm">
                Limpar filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quadro Kanban com Barra de Rolagem Horizontal Melhorada */}
      <div className="bg-gray-50 rounded-lg p-4">
        <DragDropContext onDragEnd={handleDragEnd}>
          {/* Container principal com scroll horizontal */}
          <div className="kanban-scroll-container overflow-x-auto"> {/* Added overflow-x-auto here */}
            <div 
              className="flex gap-4 pb-4" // Removed overflow-x-auto and custom-scrollbar
              style={{ 
                width: `${KANBAN_COLUMNS.length * 320 + (KANBAN_COLUMNS.length - 1) * 16}px`, // Column width (320px) + gap (16px)
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
                />
              ))}
            </div>
          </div>
        </DragDropContext>
      </div>

      {/* Estatísticas resumidas */}
      {totalTasks > 0 && (
        <Card className="mt-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
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
    </div>
  );
}
