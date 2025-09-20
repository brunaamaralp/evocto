import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { 
  Bell, 
  Clock, 
  Target, 
  User, 
  Settings,
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  Calendar,
  Mail,
  Smartphone,
  Slack,
  Filter,
  Search,
  Eye,
  EyeOff,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { useSession } from '@/components/auth/SessionManager';
import { useTaskReminders } from '@/hooks/useTaskReminders';
import { useKPIAlerts } from '@/hooks/useKPIAlerts';
import AlertConfigurationModal from './AlertConfigurationModal';
import { toast } from 'sonner';

/**
 * Dashboard de alertas e lembretes
 */
export default function AlertsDashboard({ clientId, serviceId }) {
  const { user } = useSession();
  const { checkUpcomingTasks, processTasksForReminders, generateReminderContent } = useTaskReminders();
  const { checkKPIAlerts, analyzeKPIs, generateAlertContent } = useKPIAlerts();
  
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [filteredAlerts, setFilteredAlerts] = useState([]);
  const [filters, setFilters] = useState({
    type: 'all',
    level: 'all',
    status: 'all'
  });
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [expandedAlerts, setExpandedAlerts] = useState(new Set());

  useEffect(() => {
    if (clientId && serviceId) {
      loadAlerts();
    }
  }, [clientId, serviceId]);

  useEffect(() => {
    applyFilters();
  }, [alerts, filters]);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      // Carregar alertas de tarefas
      const taskAlerts = await loadTaskAlerts();
      
      // Carregar alertas de KPIs
      const kpiAlerts = await loadKPIAlerts();
      
      // Combinar todos os alertas
      const allAlerts = [...taskAlerts, ...kpiAlerts];
      
      // Ordenar por prioridade e data
      allAlerts.sort((a, b) => {
        const priorityOrder = { critical: 3, warning: 2, info: 1 };
        const aPriority = priorityOrder[a.level] || 0;
        const bPriority = priorityOrder[b.level] || 0;
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }
        
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      
      setAlerts(allAlerts);
    } catch (error) {
      console.error('Erro ao carregar alertas:', error);
      toast.error('Erro ao carregar alertas');
    } finally {
      setLoading(false);
    }
  };

  const loadTaskAlerts = async () => {
    try {
      const tasks = await checkUpcomingTasks(clientId, serviceId);
      const reminders = processTasksForReminders(tasks);
      
      const taskAlerts = [];
      
      // Processar lembretes por frequência
      Object.entries(reminders).forEach(([frequency, taskList]) => {
        taskList.forEach(task => {
          const content = generateReminderContent(task, frequency);
          taskAlerts.push({
            id: `task-${task.id}-${frequency}`,
            type: 'task',
            level: frequency === 'overdue' ? 'critical' : 'warning',
            title: content.message,
            description: `Tarefa: ${content.taskTitle}`,
            emoji: content.emoji,
            urgency: content.urgency,
            dueDate: content.dueDate,
            assignee: content.assignee,
            priority: content.priority,
            createdAt: new Date().toISOString(),
            status: 'active',
            actions: [
              { label: 'Ver Tarefa', action: 'view_task', url: `/tasks/${task.id}` },
              { label: 'Marcar como Lida', action: 'mark_read' }
            ]
          });
        });
      });
      
      return taskAlerts;
    } catch (error) {
      console.error('Erro ao carregar alertas de tarefas:', error);
      return [];
    }
  };

  const loadKPIAlerts = async () => {
    try {
      const kpiData = await checkKPIAlerts(clientId, serviceId);
      
      if (!kpiData.kpis || !kpiData.targets) return [];
      
      const alerts = analyzeKPIs(kpiData.kpis, kpiData.targets, {
        critical: 80,
        warning: 90,
        success: 95
      });
      
      return alerts.map(alert => {
        const content = generateAlertContent(alert);
        return {
          id: `kpi-${alert.kpiKey}`,
          type: 'kpi',
          level: alert.alertLevel,
          title: content.message,
          description: content.recommendation,
          emoji: content.emoji,
          urgency: content.urgency,
          kpiLabel: content.kpiLabel,
          currentValue: content.currentValue,
          targetValue: content.targetValue,
          progress: content.progress,
          trend: content.trend,
          trendPercentage: content.trendPercentage,
          createdAt: new Date().toISOString(),
          status: 'active',
          actions: [
            { label: 'Ver Dashboard', action: 'view_dashboard', url: `/cliente/${clientId}/servicos/${serviceId}/dashboard` },
            { label: 'Marcar como Lida', action: 'mark_read' }
          ]
        };
      });
    } catch (error) {
      console.error('Erro ao carregar alertas de KPIs:', error);
      return [];
    }
  };

  const applyFilters = () => {
    let filtered = [...alerts];
    
    if (filters.type !== 'all') {
      filtered = filtered.filter(alert => alert.type === filters.type);
    }
    
    if (filters.level !== 'all') {
      filtered = filtered.filter(alert => alert.level === filters.level);
    }
    
    if (filters.status !== 'all') {
      filtered = filtered.filter(alert => alert.status === filters.status);
    }
    
    setFilteredAlerts(filtered);
  };

  const handleAlertAction = async (alertId, action) => {
    try {
      if (action === 'mark_read') {
        await markAlertAsRead(alertId);
        setAlerts(prev => prev.map(alert => 
          alert.id === alertId 
            ? { ...alert, status: 'read' }
            : alert
        ));
        toast.success('Alerta marcado como lido');
      } else if (action === 'view_task' || action === 'view_dashboard') {
        // Navegação será tratada pelo componente pai
        toast.info('Redirecionando...');
      }
    } catch (error) {
      console.error('Erro ao executar ação do alerta:', error);
      toast.error('Erro ao executar ação');
    }
  };

  const markAlertAsRead = async (alertId) => {
    // Simular chamada da API
    await fetch(`/api/alerts/${alertId}/mark-read`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${user.token}`
      }
    });
  };

  const toggleAlertExpansion = (alertId) => {
    const newExpanded = new Set(expandedAlerts);
    if (newExpanded.has(alertId)) {
      newExpanded.delete(alertId);
    } else {
      newExpanded.add(alertId);
    }
    setExpandedAlerts(newExpanded);
  };

  const getAlertLevelColor = (level) => {
    switch (level) {
      case 'critical': return 'text-red-600 bg-red-100 border-red-200';
      case 'warning': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'success': return 'text-green-600 bg-green-100 border-green-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getAlertTypeIcon = (type) => {
    switch (type) {
      case 'task': return Clock;
      case 'kpi': return Target;
      case 'client': return User;
      default: return Bell;
    }
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-600" />;
      default: return <Minus className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Alertas e Lembretes</h2>
          <p className="text-gray-600">
            {filteredAlerts.length} alertas encontrados
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowConfigModal(true)}
            variant="outline"
            size="sm"
          >
            <Settings className="w-4 h-4 mr-2" />
            Configurar
          </Button>
          
          <Button
            onClick={loadAlerts}
            disabled={loading}
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium">Filtros:</span>
            </div>
            
            <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="task">Tarefas</SelectItem>
                <SelectItem value="kpi">KPIs</SelectItem>
                <SelectItem value="client">Cliente</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filters.level} onValueChange={(value) => setFilters(prev => ({ ...prev, level: value }))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="critical">Crítico</SelectItem>
                <SelectItem value="warning">Atenção</SelectItem>
                <SelectItem value="success">Sucesso</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="read">Lidos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Alertas */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-2">Carregando alertas...</span>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Bell className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum alerta encontrado</h3>
              <p className="text-gray-600">
                Não há alertas que correspondam aos filtros selecionados
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredAlerts.map((alert, index) => {
            const AlertTypeIcon = getAlertTypeIcon(alert.type);
            const isExpanded = expandedAlerts.has(alert.id);
            
            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card className={`hover:shadow-md transition-shadow duration-200 ${
                  alert.status === 'read' ? 'opacity-60' : ''
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Ícone e Emoji */}
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          <AlertTypeIcon className="w-5 h-5 text-gray-600" />
                        </div>
                        <div className="text-2xl">{alert.emoji}</div>
                      </div>
                      
                      {/* Conteúdo */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={getAlertLevelColor(alert.level)}>
                                {alert.urgency}
                              </Badge>
                              <Badge variant="outline">
                                {alert.type === 'task' ? 'Tarefa' : 
                                 alert.type === 'kpi' ? 'KPI' : 'Cliente'}
                              </Badge>
                              {alert.status === 'read' && (
                                <Badge variant="outline" className="text-gray-500">
                                  Lido
                                </Badge>
                              )}
                            </div>
                            
                            <h3 className="font-semibold text-gray-900 mb-1">
                              {alert.title}
                            </h3>
                            
                            <p className="text-sm text-gray-600 mb-2">
                              {alert.description}
                            </p>
                            
                            {/* Detalhes específicos */}
                            {alert.type === 'task' && (
                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                <span>Prazo: {alert.dueDate}</span>
                                {alert.assignee && <span>Responsável: {alert.assignee}</span>}
                                {alert.priority && <span>Prioridade: {alert.priority}</span>}
                              </div>
                            )}
                            
                            {alert.type === 'kpi' && (
                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                <span>{alert.kpiLabel}: {alert.currentValue} / {alert.targetValue}</span>
                                <span>Progresso: {alert.progress}%</span>
                                <div className="flex items-center gap-1">
                                  {getTrendIcon(alert.trend)}
                                  <span>{alert.trendPercentage}%</span>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Ações */}
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleAlertExpansion(alert.id)}
                            >
                              {isExpanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                            
                            <div className="flex gap-1">
                              {alert.actions.map((action, actionIndex) => (
                                <Button
                                  key={actionIndex}
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAlertAction(alert.id, action.action)}
                                >
                                  {action.label}
                                </Button>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        {/* Conteúdo expandido */}
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="mt-4 pt-4 border-t border-gray-200"
                          >
                            <div className="text-sm text-gray-600">
                              <p><strong>Criado em:</strong> {new Date(alert.createdAt).toLocaleString('pt-BR')}</p>
                              {alert.type === 'kpi' && (
                                <div className="mt-2">
                                  <p><strong>Recomendação:</strong> {alert.description}</p>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Modal de Configuração */}
      <AlertConfigurationModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        clientId={clientId}
        serviceId={serviceId}
        onConfigurationSaved={() => {
          setShowConfigModal(false);
          loadAlerts(); // Recarregar alertas após configuração
        }}
      />
    </div>
  );
}

