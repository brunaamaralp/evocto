import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Zap, Settings, Users, Clock, Target, AlertCircle, 
  Play, Pause, Plus, Trash2, Edit, Save, RefreshCw 
} from 'lucide-react';

export default function TaskAutomations({ settings, onSettingsChange, tasks, users }) {
  const [automationRules, setAutomationRules] = useState([]);
  const [editingRule, setEditingRule] = useState(null);
  const [newRule, setNewRule] = useState({
    name: '',
    trigger: 'status_change',
    condition: '',
    action: 'auto_assign',
    isActive: true
  });

  // Built-in automation suggestions based on current task data
  const automationInsights = React.useMemo(() => {
    const insights = [];
    
    // Workload balancing suggestion
    const userWorkloads = users.map(user => ({
      ...user,
      activeTasksCount: tasks.filter(t => 
        t.assignedTo === user.id && !['completed', 'cancelled'].includes(t.status)
      ).length
    }));
    
    const maxWorkload = Math.max(...userWorkloads.map(u => u.activeTasksCount));
    const minWorkload = Math.min(...userWorkloads.map(u => u.activeTasksCount));
    
    if (maxWorkload - minWorkload > 3) {
      insights.push({
        type: 'workload_imbalance',
        title: 'Desequilíbrio de Carga Detectado',
        description: `Diferença de ${maxWorkload - minWorkload} tarefas entre membros da equipe`,
        suggestion: 'Ativar balanceamento automático de carga',
        action: () => onSettingsChange({...settings, workloadBalancing: true})
      });
    }

    // Overdue tasks suggestion
    const overdueTasks = tasks.filter(t => 
      t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed'
    );
    
    if (overdueTasks.length > 5) {
      insights.push({
        type: 'overdue_tasks',
        title: 'Muitas Tarefas Atrasadas',
        description: `${overdueTasks.length} tarefas estão atrasadas`,
        suggestion: 'Criar regra de escalação automática para tarefas atrasadas',
        action: () => {}
      });
    }

    // Stalled tasks suggestion
    const stalledTasks = tasks.filter(t => {
      if (t.status !== 'in_progress') return false;
      const lastUpdate = new Date(t.updated_date);
      const daysSinceUpdate = (Date.now() - lastUpdate) / (1000 * 60 * 60 * 24);
      return daysSinceUpdate > 7;
    });

    if (stalledTasks.length > 2) {
      insights.push({
        type: 'stalled_tasks',
        title: 'Tarefas Paradas Detectadas',
        description: `${stalledTasks.length} tarefas sem atualização há mais de 7 dias`,
        suggestion: 'Ativar notificações inteligentes para tarefas paradas',
        action: () => onSettingsChange({...settings, smartNotifications: true})
      });
    }

    return insights;
  }, [tasks, users, settings, onSettingsChange]);

  // Predefined automation templates
  const automationTemplates = [
    {
      name: 'Auto-atribuição por Expertise',
      description: 'Atribui automaticamente tarefas com base no tipo e expertise do usuário',
      trigger: 'task_created',
      condition: 'task.type === "analise_financeira"',
      action: 'assign_to_expert',
      config: { expertiseField: 'specialization' }
    },
    {
      name: 'Escalação de Tarefas Atrasadas',
      description: 'Notifica supervisores quando tarefas ficam atrasadas por mais de 2 dias',
      trigger: 'task_overdue',
      condition: 'days_overdue > 2',
      action: 'notify_supervisor',
      config: { escalationLevel: 1 }
    },
    {
      name: 'Transição Automática de Dependências',
      description: 'Move tarefas dependentes para "A Fazer" quando dependências são concluídas',
      trigger: 'task_completed',
      condition: 'has_dependent_tasks',
      action: 'auto_transition_dependents',
      config: { targetStatus: 'todo' }
    },
    {
      name: 'Balanceamento de Carga',
      description: 'Redistribui tarefas quando um usuário fica sobrecarregado',
      trigger: 'workload_exceeded',
      condition: 'user.active_tasks > 8',
      action: 'rebalance_workload',
      config: { maxTasksPerUser: 8 }
    }
  ];

  const createRuleFromTemplate = (template) => {
    setNewRule({
      ...template,
      id: Date.now(),
      isActive: true
    });
  };

  const saveRule = () => {
    if (!newRule.name || !newRule.trigger || !newRule.action) return;
    
    const rule = {
      ...newRule,
      id: Date.now(),
      createdAt: new Date().toISOString()
    };
    
    setAutomationRules(prev => [...prev, rule]);
    setNewRule({
      name: '',
      trigger: 'status_change',
      condition: '',
      action: 'auto_assign',
      isActive: true
    });
  };

  const toggleRule = (ruleId) => {
    setAutomationRules(prev => 
      prev.map(rule => 
        rule.id === ruleId 
          ? { ...rule, isActive: !rule.isActive }
          : rule
      )
    );
  };

  const deleteRule = (ruleId) => {
    setAutomationRules(prev => prev.filter(rule => rule.id !== ruleId));
  };

  return (
    <div className="space-y-6">
      {/* Automation Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Auto-atribuição</p>
                <div className="flex items-center gap-2 mt-1">
                  <Switch
                    checked={settings.autoAssign}
                    onCheckedChange={(checked) => 
                      onSettingsChange({...settings, autoAssign: checked})
                    }
                  />
                  <span className="text-sm">
                    {settings.autoAssign ? 'Ativado' : 'Desativado'}
                  </span>
                </div>
              </div>
              <Users className="w-5 h-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Transições Automáticas</p>
                <div className="flex items-center gap-2 mt-1">
                  <Switch
                    checked={settings.autoTransition}
                    onCheckedChange={(checked) => 
                      onSettingsChange({...settings, autoTransition: checked})
                    }
                  />
                  <span className="text-sm">
                    {settings.autoTransition ? 'Ativado' : 'Desativado'}
                  </span>
                </div>
              </div>
              <RefreshCw className="w-5 h-5 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Notificações Inteligentes</p>
                <div className="flex items-center gap-2 mt-1">
                  <Switch
                    checked={settings.smartNotifications}
                    onCheckedChange={(checked) => 
                      onSettingsChange({...settings, smartNotifications: checked})
                    }
                  />
                  <span className="text-sm">
                    {settings.smartNotifications ? 'Ativado' : 'Desativado'}
                  </span>
                </div>
              </div>
              <AlertCircle className="w-5 h-5 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Balanceamento</p>
                <div className="flex items-center gap-2 mt-1">
                  <Switch
                    checked={settings.workloadBalancing}
                    onCheckedChange={(checked) => 
                      onSettingsChange({...settings, workloadBalancing: checked})
                    }
                  />
                  <span className="text-sm">
                    {settings.workloadBalancing ? 'Ativado' : 'Desativado'}
                  </span>
                </div>
              </div>
              <Target className="w-5 h-5 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Automation Insights */}
      {automationInsights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Sugestões de Automação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {automationInsights.map((insight, index) => (
              <div key={index} className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-blue-900">{insight.title}</h4>
                  <p className="text-sm text-blue-700 mt-1">{insight.description}</p>
                  <p className="text-sm text-blue-600 mt-2">{insight.suggestion}</p>
                </div>
                <Button
                  size="sm"
                  onClick={insight.action}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Aplicar
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Automation Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Templates de Automação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {automationTemplates.map((template, index) => (
              <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-medium">{template.name}</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => createRuleFromTemplate(template)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Usar
                  </Button>
                </div>
                <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs">
                    Trigger: {template.trigger}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Action: {template.action}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Regras Personalizadas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Create New Rule */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <h4 className="font-medium mb-4">Criar Nova Regra</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                placeholder="Nome da regra"
                value={newRule.name}
                onChange={(e) => setNewRule({...newRule, name: e.target.value})}
              />
              
              <Select
                value={newRule.trigger}
                onValueChange={(value) => setNewRule({...newRule, trigger: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Trigger" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="task_created">Tarefa Criada</SelectItem>
                  <SelectItem value="status_change">Mudança de Status</SelectItem>
                  <SelectItem value="task_overdue">Tarefa Atrasada</SelectItem>
                  <SelectItem value="task_completed">Tarefa Concluída</SelectItem>
                  <SelectItem value="workload_exceeded">Carga Excedida</SelectItem>
                </SelectContent>
              </Select>

              <Textarea
                placeholder="Condição (opcional)"
                value={newRule.condition}
                onChange={(e) => setNewRule({...newRule, condition: e.target.value})}
                rows={2}
              />

              <Select
                value={newRule.action}
                onValueChange={(value) => setNewRule({...newRule, action: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Ação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto_assign">Auto-atribuir</SelectItem>
                  <SelectItem value="notify_supervisor">Notificar Supervisor</SelectItem>
                  <SelectItem value="auto_transition">Transição Automática</SelectItem>
                  <SelectItem value="rebalance_workload">Rebalancear Carga</SelectItem>
                  <SelectItem value="send_reminder">Enviar Lembrete</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={newRule.isActive}
                  onCheckedChange={(checked) => setNewRule({...newRule, isActive: checked})}
                />
                <span className="text-sm">Ativar regra</span>
              </div>
              <Button onClick={saveRule} disabled={!newRule.name}>
                <Save className="w-4 h-4 mr-2" />
                Salvar Regra
              </Button>
            </div>
          </div>

          {/* Existing Rules */}
          <div className="space-y-3">
            {automationRules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-medium">{rule.name}</h4>
                    <Badge variant={rule.isActive ? "default" : "secondary"}>
                      {rule.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>Trigger: {rule.trigger}</span>
                    <span>Action: {rule.action}</span>
                    {rule.condition && (
                      <span>Condition: {rule.condition}</span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleRule(rule.id)}
                  >
                    {rule.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingRule(rule)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteRule(rule.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            {automationRules.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Zap className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nenhuma regra personalizada criada</p>
                <p className="text-sm">Use os templates acima para começar</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}