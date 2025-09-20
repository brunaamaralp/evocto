
import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { Client } from '@/api/entities';
import { Service } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckSquare, ArrowRight, RefreshCw, Plus, Target,
  Calendar, User, AlertCircle, Clock, CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import LoadingState from '@/components/shared/LoadingStates';
import EmptyState from '@/components/shared/EmptyState';
import TaskManager from '@/components/tasks/TaskManager';
import { generateTasksFromCyclePlan } from '@/api/functions/generateTasksFromCyclePlan';
import { useTaskGeneration } from '@/hooks/useTaskGeneration';
import { useErrorHandling } from '@/hooks/useErrorHandling';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Componente de estatísticas das tarefas
const TaskStats = React.memo(({ tasks }) => {
  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed').length
  };

  const completionRate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-600" />
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.completed}</div>
              <div className="text-sm text-gray-600">Concluídas</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-600" />
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.inProgress}</div>
              <div className="text-sm text-gray-600">Em Progresso</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.overdue}</div>
              <div className="text-sm text-gray-600">Atrasadas</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

export default function ClientTasksPage() {
  const { user, agencyId } = useSession();
  const [clientId, setClientId] = useState(null);
  const [client, setClient] = useState(null);
  const [services, setServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState(null);
  const [selectedService, setSelectedService] = useState(null); // Added state for selected service object
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Hooks centralizados
  const {
    generateTasksWithFeedback,
    isGenerating,
    error: taskGenerationError
  } = useTaskGeneration();

  const { handleError } = useErrorHandling();

  // Extrair clientId da URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('clientId');
    if (id) {
      setClientId(id);
    } else {
      setError('ID do cliente não encontrado na URL.');
    }
  }, []);

  // Carregar dados do cliente e serviços
  useEffect(() => {
    const loadData = async () => {
      if (!clientId || !agencyId) return;

      try {
        setLoading(true);
        setError(null);

        console.log(`[ClientTasks] Loading data for client ${clientId}`);

        const [clientData, servicesData] = await Promise.all([
          Client.get(clientId),
          Service.filter({ clientId, agencyId, is_active: true })
        ]);

        if (!clientData || clientData.agencyId !== agencyId) {
          throw new Error('Cliente não encontrado ou não pertence à sua agência.');
        }

        setClient(clientData);
        setServices(servicesData);

        // Selecionar o primeiro serviço automaticamente e setar o objeto completo
        if (servicesData.length > 0) {
          setSelectedServiceId(servicesData[0].id);
          setSelectedService(servicesData[0]); // Set the full service object
        } else {
          setSelectedServiceId(null); // Ensure null if no services
          setSelectedService(null);
        }

        console.log(`[ClientTasks] Data loaded successfully`);

      } catch (err) {
        console.error('[ClientTasks] Error loading data:', err);
        setError(`Erro ao carregar dados: ${err.message}`);
        toast.error('Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };

    if (clientId && agencyId) {
      loadData();
    }
  }, [clientId, agencyId]);

  // Update selectedService object when selectedServiceId changes or services array updates
  useEffect(() => {
    if (selectedServiceId && services.length > 0) {
      const service = services.find(s => s.id === selectedServiceId);
      setSelectedService(service || null);
    } else {
      setSelectedService(null);
    }
  }, [selectedServiceId, services]); // Depend on selectedServiceId AND services

  // Carregar tarefas quando o serviço for selecionado
  useEffect(() => {
    const loadTasks = async () => {
      if (!selectedServiceId || !clientId) return;

      try {
        console.log(`[ClientTasks] Loading tasks for service ${selectedServiceId}`);
        
        const tasksData = await Task.filter({
          clientId,
          serviceId: selectedServiceId,
          agencyId
        }, '-created_date');

        setTasks(tasksData);
        console.log(`[ClientTasks] Loaded ${tasksData.length} tasks`);

      } catch (err) {
        console.error('[ClientTasks] Error loading tasks:', err);
        toast.error('Erro ao carregar tarefas');
      }
    };

    if (selectedServiceId) {
      loadTasks();
    }
  }, [selectedServiceId, clientId, agencyId]);

  // Separar tarefas por fase
  const tasksByPhase = useMemo(() => {
    if (!selectedService?.deliverables) return {};
    
    const phases = {};
    selectedService.deliverables.forEach(deliverable => {
      phases[deliverable.phase] = {
        ...deliverable,
        tasks: tasks.filter(t => 
          t.serviceId === selectedService.id && 
          t.tags?.includes(`fase-${deliverable.phase}`)
        )
      };
    });
    
    return phases;
  }, [selectedService, tasks]);

  const handleGenerateTasks = async () => {
    if (!selectedServiceId || !clientId) {
      toast.error('Serviço não selecionado');
      return;
    }

    try {
      setLoading(true);
      
      // Usar o novo hook para gerar tarefas
      const result = await generateTasksWithFeedback({
        serviceId: selectedServiceId,
        autoAssign: true,
        startDate: new Date().toISOString()
      });

      if (result.success) {
        // Recarregar tarefas após geração
        const tasksData = await Task.filter({
          clientId,
          serviceId: selectedServiceId,
          agencyId
        }, '-created_date');
        setTasks(tasksData);
      } else {
        throw new Error(result.errors.join('; '));
      }

    } catch (err) {
      handleError(err, {
        action: 'generate_tasks_from_service',
        serviceId: selectedServiceId,
        clientId
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = () => {
    setEditingTask(null);
    setShowTaskForm(true);
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setShowTaskForm(true);
  };

  const handleTaskSaved = async () => {
    setShowTaskForm(false);
    setEditingTask(null);
    
    // Recarregar tarefas
    if (selectedServiceId) {
      const tasksData = await Task.filter({
        clientId,
        serviceId: selectedServiceId,
        agencyId
      }, '-created_date');
      setTasks(tasksData);
    }
  };

  if (loading) {
    return <LoadingState message="Carregando quadro de tarefas..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <EmptyState
            icon="alert-circle"
            title="Erro ao carregar tarefas"
            description={error}
            primaryAction={{ 
              label: 'Voltar para Visão Geral', 
              onClick: () => window.location.href = `/client-overview?clientId=${clientId}` 
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-full mx-auto">
        {/* Header - Mobile Optimized */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
              <CheckSquare className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 flex-shrink-0" />
              <span className="truncate">Quadro de Tarefas</span>
            </h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">
              <span className="truncate">{client?.name}</span> • Gestão das atividades do projeto
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <Button 
              variant="outline"
              size="sm"
              onClick={() => window.location.href = `/client-overview?clientId=${clientId}`}
              className="hidden sm:flex"
            >
              <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
              Voltar
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleGenerateTasks}
              className="flex-1 sm:flex-none"
            >
              <Target className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Gerar Tarefas</span>
              <span className="sm:hidden">Gerar</span>
            </Button>
            <Button 
              size="sm"
              onClick={handleCreateTask}
              className="flex-1 sm:flex-none"
            >
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Nova Tarefa</span>
              <span className="sm:hidden">Nova</span>
            </Button>
          </div>
        </div>

        {/* Service Selector */}
        {services.length > 1 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Selecionar Serviço</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 flex-wrap">
                {services.map((service) => (
                  <Button
                    key={service.id}
                    variant={selectedServiceId === service.id ? "default" : "outline"}
                    onClick={() => setSelectedServiceId(service.id)}
                  >
                    {service.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <TaskStats tasks={tasks} />

        {/* Progresso por Fases */}
        {Object.keys(tasksByPhase).length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Progresso por Fase</h2>
            <div className="grid gap-4">
              {Object.entries(tasksByPhase).map(([phase, phaseData]) => {
                const totalTasks = phaseData.tasks.length;
                const completedTasks = phaseData.tasks.filter(t => t.status === 'completed').length;
                const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
                const isActive = phaseData.tasks.some(t => ['todo', 'in_progress'].includes(t.status));
                
                return (
                  <Card key={phase} className={`transition-all ${isActive ? 'ring-2 ring-blue-200 bg-blue-50/30' : ''}`}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                            progress === 100 ? 'bg-green-100 text-green-700' :
                            isActive ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {phase}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{phaseData.name}</h3>
                            <p className="text-sm text-gray-600">{phaseData.description}</p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-lg font-bold text-blue-600">{progress}%</div>
                          <div className="text-xs text-gray-500">{completedTasks}/{totalTasks} tarefas</div>
                        </div>
                      </div>
                      
                      <Progress value={progress} className="mb-4" />
                      
                      {/* Lista de tarefas da fase */}
                      <div className="space-y-2">
                        {phaseData.tasks.slice(0, 3).map((task) => (
                          <div key={task.id} className="flex items-center justify-between p-2 bg-white rounded border">
                            <div className="flex items-center gap-2">
                              {task.status === 'completed' ? (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              ) : (
                                <Clock className="w-4 h-4 text-yellow-600" />
                              )}
                              <span className={`text-sm ${task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                {task.title}
                              </span>
                            </div>
                            <Badge 
                              variant={
                                task.status === 'completed' ? 'default' : // 'default' as a base, then use className for color
                                task.status === 'in_progress' ? 'secondary' :
                                'outline'
                              }
                              className={
                                task.status === 'completed' ? 'bg-green-100 text-green-700' :
                                task.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-700'
                              }
                            >
                              {task.status === 'completed' ? 'Concluída' :
                               task.status === 'in_progress' ? 'Em progresso' :
                               'Pendente'}
                            </Badge>
                          </div>
                        ))}
                        
                        {phaseData.tasks.length > 3 && (
                          <p className="text-xs text-gray-500 text-center">
                            +{phaseData.tasks.length - 3} tarefas adicionais
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Task Manager com 4 Visualizações */}
        {selectedServiceId ? (
          <TaskManager
            clientId={clientId}
            serviceId={selectedServiceId}
            userRole={user?.role || 'consultor'}
          />
        ) : (
          <EmptyState
            icon="target"
            title="Nenhum serviço ativo"
            description="Este cliente não possui serviços ativos para gerenciar tarefas."
            primaryAction={{
              label: 'Configurar Serviços',
              onClick: () => window.location.href = `/services?clientId=${clientId}`
            }}
          />
        )}

        {/* Task Form Modal */}
        {showTaskForm && (
          <TaskForm
            task={editingTask}
            isOpen={showTaskForm}
            onClose={() => setShowTaskForm(false)}
            onSave={handleTaskSaved}
            clientId={clientId}
            serviceId={selectedServiceId}
            defaultStatus="todo"
          />
        )}
      </div>
    </div>
  );
}
