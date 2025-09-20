
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Play,
  Pause,
  Square,
  RefreshCw,
  Settings,
  Zap,
  Clock,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  GitBranch,
  Database,
  Bell,
  FileText, // Added missing import
  Plus        // Added missing import
} from 'lucide-react';

const WORKFLOW_TRIGGERS = [
  {
    id: 'kpi_threshold_breach',
    name: 'Violação de Limites',
    description: 'Quando KPI excede limites críticos',
    icon: AlertTriangle,
    category: 'alerts'
  },
  {
    id: 'kpi_value_change',
    name: 'Mudança de Valor',
    description: 'Quando valor do KPI é atualizado',
    icon: TrendingUp,
    category: 'data'
  },
  {
    id: 'scheduled_calculation',
    name: 'Cálculo Programado',
    description: 'Executar em horários específicos',
    icon: Clock,
    category: 'schedule'
  },
  {
    id: 'data_quality_issue',
    name: 'Problema de Qualidade',
    description: 'Dados inconsistentes ou faltantes',
    icon: Database,
    category: 'quality'
  }
];

const WORKFLOW_ACTIONS = [
  {
    id: 'send_notification',
    name: 'Enviar Notificação',
    description: 'Alertar usuários por email/SMS',
    icon: Bell,
    params: ['recipients', 'message_template']
  },
  {
    id: 'recalculate_kpi',
    name: 'Recalcular KPI',
    description: 'Executar novo cálculo automático',
    icon: RefreshCw,
    params: ['kpi_ids', 'force_update']
  },
  {
    id: 'update_targets',
    name: 'Ajustar Metas',
    description: 'Modificar targets automaticamente',
    icon: Target,
    params: ['target_adjustment', 'reason']
  },
  {
    id: 'generate_report',
    name: 'Gerar Relatório',
    description: 'Criar relatório automático',
    icon: FileText,
    params: ['report_template', 'distribution_list']
  }
];

export default function KPIWorkflowEngine({ 
  clientId, 
  serviceId,
  onWorkflowUpdate,
  className = "" 
}) {
  const [workflows, setWorkflows] = useState([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [running, setRunning] = useState({});
  const [executionHistory, setExecutionHistory] = useState([]);

  const [newWorkflow, setNewWorkflow] = useState({
    name: '',
    description: '',
    enabled: true,
    trigger: {
      type: '',
      conditions: {},
      schedule: ''
    },
    actions: [],
    priority: 'medium'
  });

  const loadWorkflows = useCallback(async () => {
    try {
      // Mock de workflows para demonstração
      const mockWorkflows = [
        {
          id: 'workflow_001',
          name: 'Alerta de Margem Crítica',
          description: 'Notificar quando margem líquida cair abaixo de 10%',
          enabled: true,
          trigger: {
            type: 'kpi_threshold_breach',
            conditions: {
              kpi_name: 'Margem Líquida',
              operator: 'less_than',
              value: 10,
              unit: 'percentage'
            }
          },
          actions: [
            {
              type: 'send_notification',
              params: {
                recipients: ['admin@empresa.com'],
                message_template: 'urgent_margin_alert'
              }
            }
          ],
          priority: 'high',
          lastExecuted: new Date(Date.now() - 3600000).toISOString(),
          executionCount: 5,
          status: 'active'
        },
        {
          id: 'workflow_002',
          name: 'Recálculo Noturno de KPIs',
          description: 'Atualizar todos os KPIs diariamente às 23h',
          enabled: true,
          trigger: {
            type: 'scheduled_calculation',
            schedule: '0 23 * * *' // Cron expression
          },
          actions: [
            {
              type: 'recalculate_kpi',
              params: {
                kpi_ids: 'all',
                force_update: true
              }
            },
            {
              type: 'generate_report',
              params: {
                report_template: 'daily_kpi_summary',
                distribution_list: ['admin@empresa.com']
              }
            }
          ],
          priority: 'medium',
          lastExecuted: new Date(Date.now() - 86400000).toISOString(),
          executionCount: 30,
          status: 'active'
        }
      ];

      setWorkflows(mockWorkflows);

      // Mock de histórico de execução
      const mockHistory = [
        {
          id: 'exec_001',
          workflowId: 'workflow_001',
          workflowName: 'Alerta de Margem Crítica',
          triggeredAt: new Date(Date.now() - 3600000).toISOString(),
          status: 'completed',
          duration: 2500, // ms
          actionsExecuted: 1,
          result: 'success',
          message: 'Notificação enviada com sucesso'
        },
        {
          id: 'exec_002',
          workflowId: 'workflow_002',
          workflowName: 'Recálculo Noturno de KPIs',
          triggeredAt: new Date(Date.now() - 86400000).toISOString(),
          status: 'completed',
          duration: 45000, // ms
          actionsExecuted: 2,
          result: 'success',
          message: '15 KPIs recalculados, relatório enviado'
        }
      ];

      setExecutionHistory(mockHistory);

    } catch (err) {
      console.error('Erro ao carregar workflows:', err);
    }
  }, []); // Changed dependency array to empty

  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  const createWorkflow = async () => {
    try {
      if (!newWorkflow.name || !newWorkflow.trigger.type) {
        return;
      }

      const workflow = {
        id: `workflow_${Date.now()}`,
        ...newWorkflow,
        lastExecuted: null,
        executionCount: 0,
        status: 'inactive'
      };

      setWorkflows(prev => [...prev, workflow]);
      setNewWorkflow({
        name: '',
        description: '',
        enabled: true,
        trigger: { type: '', conditions: {}, schedule: '' },
        actions: [],
        priority: 'medium'
      });
      setCreating(false);

      if (onWorkflowUpdate) {
        onWorkflowUpdate(workflow);
      }

    } catch (err) {
      console.error('Erro ao criar workflow:', err);
    }
  };

  const toggleWorkflow = async (workflowId, enabled) => {
    setWorkflows(prev =>
      prev.map(w =>
        w.id === workflowId
          ? { ...w, enabled, status: enabled ? 'active' : 'inactive' }
          : w
      )
    );
  };

  const executeWorkflow = async (workflowId) => {
    try {
      setRunning(prev => ({ ...prev, [workflowId]: true }));

      // Simular execução
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Atualizar histórico
      const workflow = workflows.find(w => w.id === workflowId);
      const execution = {
        id: `exec_${Date.now()}`,
        workflowId,
        workflowName: workflow?.name || 'Workflow',
        triggeredAt: new Date().toISOString(),
        status: 'completed',
        duration: 2000,
        actionsExecuted: workflow?.actions.length || 0,
        result: 'success',
        message: 'Workflow executado manualmente'
      };

      setExecutionHistory(prev => [execution, ...prev]);

      // Atualizar contadores do workflow
      setWorkflows(prev =>
        prev.map(w =>
          w.id === workflowId
            ? {
                ...w,
                lastExecuted: new Date().toISOString(),
                executionCount: (w.executionCount || 0) + 1
              }
            : w
        )
      );

    } catch (err) {
      console.error('Erro na execução do workflow:', err);
    } finally {
      setRunning(prev => ({ ...prev, [workflowId]: false }));
    }
  };

  const getTriggerIcon = (triggerType) => {
    const trigger = WORKFLOW_TRIGGERS.find(t => t.id === triggerType);
    return trigger?.icon || Settings;
  };

  const getActionIcon = (actionType) => {
    const action = WORKFLOW_ACTIONS.find(a => a.id === actionType);
    return action?.icon || Zap;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getResultColor = (result) => {
    switch (result) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header com botão de criar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Workflows Automatizados</h2>
          <p className="text-gray-600">Automações inteligentes para seus KPIs</p>
        </div>
        <Button
          onClick={() => setCreating(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Criar Workflow
        </Button>
      </div>

      {/* Criar/Editar Workflow */}
      {creating && (
        <Card>
          <CardHeader>
            <CardTitle>Novo Workflow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nome do Workflow</Label>
                <Input
                  id="name"
                  value={newWorkflow.name}
                  onChange={(e) => setNewWorkflow(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Alerta de Margem Crítica"
                />
              </div>
              <div>
                <Label htmlFor="priority">Prioridade</Label>
                <Select
                  value={newWorkflow.priority}
                  onValueChange={(priority) => setNewWorkflow(prev => ({ ...prev, priority }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="critical">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={newWorkflow.description}
                onChange={(e) => setNewWorkflow(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descreva o que este workflow faz..."
              />
            </div>

            <div>
              <Label htmlFor="trigger">Gatilho</Label>
              <Select
                value={newWorkflow.trigger.type}
                onValueChange={(type) => 
                  setNewWorkflow(prev => ({ 
                    ...prev, 
                    trigger: { ...prev.trigger, type } 
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um gatilho" />
                </SelectTrigger>
                <SelectContent>
                  {WORKFLOW_TRIGGERS.map(trigger => (
                    <SelectItem key={trigger.id} value={trigger.id}>
                      <div className="flex items-center space-x-2">
                        <trigger.icon className="w-4 h-4" />
                        <div>
                          <div className="font-medium">{trigger.name}</div>
                          <div className="text-sm text-gray-500">{trigger.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3">
              <Button onClick={createWorkflow}>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Criar Workflow
              </Button>
              <Button variant="outline" onClick={() => setCreating(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Workflows */}
      <div className="grid gap-4">
        {workflows.map((workflow) => {
          const TriggerIcon = getTriggerIcon(workflow.trigger.type);
          const isRunning = running[workflow.id];

          return (
            <Card key={workflow.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <TriggerIcon className="w-5 h-5 text-blue-600" />
                      <h3 className="font-semibold text-lg">{workflow.name}</h3>
                      <Badge className={getStatusColor(workflow.status)}>
                        {workflow.enabled ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>

                    <p className="text-gray-600 mb-3">{workflow.description}</p>

                    <div className="flex items-center space-x-6 text-sm text-gray-500">
                      <span>Executado {workflow.executionCount || 0} vezes</span>
                      {workflow.lastExecuted && (
                        <span>
                          Última execução: {new Date(workflow.lastExecuted).toLocaleString('pt-BR')}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 mt-3">
                      {workflow.actions.map((action, index) => {
                        const ActionIcon = getActionIcon(action.type);
                        return (
                          <div
                            key={index}
                            className="flex items-center space-x-1 px-2 py-1 bg-gray-100 rounded-md"
                          >
                            <ActionIcon className="w-3 h-3" />
                            <span className="text-xs">
                              {WORKFLOW_ACTIONS.find(a => a.id === action.type)?.name || action.type}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={workflow.enabled}
                      onCheckedChange={(enabled) => toggleWorkflow(workflow.id, enabled)}
                    />

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => executeWorkflow(workflow.id)}
                      disabled={isRunning}
                    >
                      {isRunning ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedWorkflow(workflow)}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {workflows.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <GitBranch className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="font-semibold text-gray-900 mb-2">Nenhum workflow criado</h3>
              <p className="text-gray-500 mb-4">
                Crie workflows para automatizar tarefas recorrentes dos seus KPIs
              </p>
              <Button onClick={() => setCreating(true)}>
                Criar Primeiro Workflow
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Histórico de Execução */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Execuções</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {executionHistory.slice(0, 10).map((execution) => (
              <div
                key={execution.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <div className="font-medium">{execution.workflowName}</div>
                  <div className="text-sm text-gray-500">
                    {new Date(execution.triggeredAt).toLocaleString('pt-BR')} • 
                    {execution.actionsExecuted} ação(ões) • 
                    {execution.duration}ms
                  </div>
                  {execution.message && (
                    <div className="text-sm text-gray-600 mt-1">
                      {execution.message}
                    </div>
                  )}
                </div>

                <Badge className={getResultColor(execution.result)}>
                  {execution.result === 'success' ? 'Sucesso' : 
                   execution.result === 'warning' ? 'Aviso' : 'Erro'}
                </Badge>
              </div>
            ))}

            {executionHistory.length === 0 && (
              <div className="text-center py-6 text-gray-500">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Nenhuma execução ainda</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
