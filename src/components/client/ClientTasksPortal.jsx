import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { Task, CyclePlan, Client, Service } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, Clock, Play, Pause, FileText, 
  Calendar, User, Target, Eye, ThumbsUp, ThumbsDown,
  MessageCircle, Download, ExternalLink, AlertCircle,
  Activity, BarChart3, TrendingUp, Award, Sparkles
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

// Status badges para tarefas
const getStatusBadge = (status) => {
  const statusConfig = {
    'todo': { color: 'bg-gray-100 text-gray-700', label: 'A Fazer', icon: Clock },
    'in_progress': { color: 'bg-blue-100 text-blue-700', label: 'Em Andamento', icon: Play },
    'in_review': { color: 'bg-yellow-100 text-yellow-700', label: 'Em Revisão', icon: Eye },
    'completed': { color: 'bg-green-100 text-green-700', label: 'Concluído', icon: CheckCircle },
    'blocked': { color: 'bg-red-100 text-red-700', label: 'Bloqueado', icon: AlertCircle }
  };

  const config = statusConfig[status] || statusConfig.todo;
  const Icon = config.icon;

  return (
    <Badge className={`${config.color} flex items-center gap-1 px-3 py-1`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
};

// Prioridade badges
const getPriorityBadge = (priority) => {
  const priorityConfig = {
    'low': { color: 'bg-gray-100 text-gray-600', label: 'Baixa' },
    'medium': { color: 'bg-blue-100 text-blue-600', label: 'Média' },
    'high': { color: 'bg-orange-100 text-orange-600', label: 'Alta' },
    'urgent': { color: 'bg-red-100 text-red-600', label: 'Urgente' }
  };

  const config = priorityConfig[priority] || priorityConfig.medium;
  
  return (
    <Badge className={`${config.color} text-xs`}>
      {config.label}
    </Badge>
  );
};

// Card de tarefa para o cliente
const ClientTaskCard = ({ task, onApprove, onRequestChanges, showActions = false }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const handleApprove = async () => {
    if (onApprove) {
      setSubmittingFeedback(true);
      try {
        await onApprove(task.id, feedback);
        toast.success('Tarefa aprovada com sucesso!');
        setFeedback('');
      } catch (error) {
        toast.error('Erro ao aprovar tarefa');
      } finally {
        setSubmittingFeedback(false);
      }
    }
  };

  const handleRequestChanges = async () => {
    if (!feedback.trim()) {
      toast.error('Por favor, descreva as mudanças necessárias');
      return;
    }

    if (onRequestChanges) {
      setSubmittingFeedback(true);
      try {
        await onRequestChanges(task.id, feedback);
        toast.success('Feedback enviado com sucesso!');
        setFeedback('');
      } catch (error) {
        toast.error('Erro ao enviar feedback');
      } finally {
        setSubmittingFeedback(false);
      }
    }
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
  const canApprove = task.status === 'in_review' && showActions;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-all duration-300"
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-gray-900 mb-2">
              {task.title}
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              {getStatusBadge(task.status)}
              {getPriorityBadge(task.priority)}
              {isOverdue && (
                <Badge className="bg-red-100 text-red-600 text-xs">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Atrasado
                </Badge>
              )}
            </div>
          </div>
          <div className="text-right text-sm text-gray-500">
            {task.dueDate && (
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {format(new Date(task.dueDate), 'dd MMM', { locale: ptBR })}
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Descrição */}
        {task.description && (
          <p className="text-gray-600 text-sm mb-4">{task.description}</p>
        )}

        {/* Progresso */}
        {task.progress > 0 && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Progresso</span>
              <span className="text-sm font-medium text-gray-900">{task.progress}%</span>
            </div>
            <Progress value={task.progress} className="h-2" />
          </div>
        )}

        {/* Checklist */}
        {task.checklist && task.checklist.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Itens de Verificação</h4>
            <ul className="space-y-1">
              {task.checklist.map((item, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  {item.completed ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <Clock className="w-4 h-4 text-gray-400" />
                  )}
                  <span className={item.completed ? 'text-gray-600 line-through' : 'text-gray-700'}>
                    {item.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Anexos */}
        {task.attachments && task.attachments.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Anexos</h4>
            <div className="flex flex-wrap gap-2">
              {task.attachments.map((attachment, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => window.open(attachment.url, '_blank')}
                >
                  <FileText className="w-3 h-3 mr-1" />
                  {attachment.name}
                  <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Ações de aprovação */}
        {canApprove && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">
              Esta tarefa está pronta para aprovação
            </h4>
            
            <textarea
              placeholder="Comentários ou feedback (opcional)"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="w-full p-3 text-sm border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
            />
            
            <div className="flex gap-2 mt-3">
              <Button
                onClick={handleApprove}
                disabled={submittingFeedback}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <ThumbsUp className="w-4 h-4 mr-2" />
                Aprovar
              </Button>
              <Button
                variant="outline"
                onClick={handleRequestChanges}
                disabled={submittingFeedback}
                className="border-orange-300 text-orange-600 hover:bg-orange-50"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Solicitar Ajustes
              </Button>
            </div>
          </div>
        )}

        {/* Timeline de atividades */}
        {task.comments && task.comments.length > 0 && (
          <div className="mt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="text-gray-600 p-0 h-auto"
            >
              <MessageCircle className="w-4 h-4 mr-1" />
              Ver atividades ({task.comments.length})
            </Button>
            
            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 space-y-2"
                >
                  {task.comments.slice(-3).map((comment, index) => (
                    <div key={index} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                      <Activity className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-700">{comment.content}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDistanceToNow(new Date(comment.createdAt), { 
                            addSuffix: true, 
                            locale: ptBR 
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </motion.div>
  );
};

// Resumo de progresso
const ProgressSummary = ({ tasks, cyclePlan }) => {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  const pendingApproval = tasks.filter(t => t.status === 'in_review').length;
  
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          Progresso do Projeto
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{totalTasks}</div>
            <div className="text-sm text-gray-600">Total de Tarefas</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{completedTasks}</div>
            <div className="text-sm text-gray-600">Concluídas</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{inProgressTasks}</div>
            <div className="text-sm text-gray-600">Em Andamento</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{pendingApproval}</div>
            <div className="text-sm text-gray-600">Aguardando Aprovação</div>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Progresso Geral</span>
            <span className="text-sm font-bold text-gray-900">{completionRate}%</span>
          </div>
          <Progress value={completionRate} className="h-3" />
        </div>

        {cyclePlan && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Target className="w-4 h-4" />
            <span>Ciclo: {cyclePlan.cyclePeriod}</span>
            {cyclePlan.status === 'in_execution' && (
              <Badge className="bg-green-100 text-green-700 ml-2">
                <Sparkles className="w-3 h-3 mr-1" />
                Ativo
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Componente principal do portal
export const ClientTasksPortal = ({ clientId, cycleId, showApprovalActions = true }) => {
  const { user } = useSession();
  const [tasks, setTasks] = useState([]);
  const [cyclePlan, setCyclePlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'pending_approval', 'in_progress', 'completed'

  // Carregar dados do portal
  const loadPortalData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Filtros para tarefas
      const taskFilters = { agencyId: user.agencyId };
      if (clientId) taskFilters.clientId = clientId;
      if (cycleId) taskFilters.cycleId = cycleId;

      const [tasksData, cyclePlanData] = await Promise.all([
        Task.filter(taskFilters, '-created_date'),
        cycleId ? CyclePlan.get(cycleId) : Promise.resolve(null)
      ]);

      setTasks(tasksData);
      setCyclePlan(cyclePlanData);

    } catch (error) {
      console.error('Erro ao carregar dados do portal:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [user?.agencyId, clientId, cycleId]);

  useEffect(() => {
    if (user?.agencyId) {
      loadPortalData();
    }
  }, [loadPortalData, user?.agencyId]);

  // Aprovar tarefa
  const handleApproveTask = async (taskId, feedback) => {
    try {
      await Task.update(taskId, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        progress: 100,
        comments: [
          ...(tasks.find(t => t.id === taskId)?.comments || []),
          {
            id: Date.now().toString(),
            userId: user.id,
            content: `Tarefa aprovada pelo cliente${feedback ? `: ${feedback}` : ''}`,
            createdAt: new Date().toISOString()
          }
        ]
      });

      // Recarregar dados
      await loadPortalData();
    } catch (error) {
      console.error('Erro ao aprovar tarefa:', error);
      throw error;
    }
  };

  // Solicitar mudanças
  const handleRequestChanges = async (taskId, feedback) => {
    try {
      await Task.update(taskId, {
        status: 'todo',
        comments: [
          ...(tasks.find(t => t.id === taskId)?.comments || []),
          {
            id: Date.now().toString(),
            userId: user.id,
            content: `Cliente solicitou ajustes: ${feedback}`,
            createdAt: new Date().toISOString()
          }
        ]
      });

      // Recarregar dados
      await loadPortalData();
    } catch (error) {
      console.error('Erro ao solicitar mudanças:', error);
      throw error;
    }
  };

  // Filtrar tarefas
  const filteredTasks = tasks.filter(task => {
    switch (filter) {
      case 'pending_approval':
        return task.status === 'in_review';
      case 'in_progress':
        return ['todo', 'in_progress'].includes(task.status);
      case 'completed':
        return task.status === 'completed';
      default:
        return true;
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumo de progresso */}
      <ProgressSummary tasks={tasks} cyclePlan={cyclePlan} />

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Tarefas e Entregáveis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-6">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              Todas ({tasks.length})
            </Button>
            <Button
              variant={filter === 'pending_approval' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('pending_approval')}
            >
              Aguardando Aprovação ({tasks.filter(t => t.status === 'in_review').length})
            </Button>
            <Button
              variant={filter === 'in_progress' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('in_progress')}
            >
              Em Progresso ({tasks.filter(t => ['todo', 'in_progress'].includes(t.status)).length})
            </Button>
            <Button
              variant={filter === 'completed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('completed')}
            >
              Concluídas ({tasks.filter(t => t.status === 'completed').length})
            </Button>
          </div>

          {/* Lista de tarefas */}
          <div className="space-y-4">
            <AnimatePresence>
              {filteredTasks.map(task => (
                <ClientTaskCard
                  key={task.id}
                  task={task}
                  onApprove={handleApproveTask}
                  onRequestChanges={handleRequestChanges}
                  showActions={showApprovalActions}
                />
              ))}
            </AnimatePresence>
            
            {filteredTasks.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Target className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Nenhuma tarefa encontrada para este filtro.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientTasksPortal;