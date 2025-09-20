/**
 * ⚙️ Página de Configuração de Alertas
 * 
 * Interface para gerenciar regras de alerta e monitoramento
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import {
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  Settings,
  Bell,
  BellOff,
  Save,
  X,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { useAlertManager } from '@/utils/alertManager';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Tipos
interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: {
    level?: string[];
    category?: string[];
    severity?: string[];
    userId?: string;
    agencyId?: string;
    timeWindow?: number;
    threshold?: number;
    messagePattern?: string;
  };
  actions: {
    email?: {
      enabled: boolean;
      recipients: string[];
      template: string;
    };
    slack?: {
      enabled: boolean;
      webhook: string;
      channel: string;
    };
    webhook?: {
      enabled: boolean;
      url: string;
      headers?: Record<string, string>;
    };
    dashboard?: {
      enabled: boolean;
      showNotification: boolean;
    };
  };
  cooldown: number;
  lastTriggered?: number;
}

interface AlertInstance {
  id: string;
  ruleId: string;
  triggeredAt: number;
  logs: any[];
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
  resolvedAt?: number;
}

const SEVERITY_COLORS = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800'
};

export default function AlertConfigurationPage() {
  const {
    startMonitoring,
    stopMonitoring,
    addRule,
    updateRule,
    removeRule,
    getRules,
    getInstances,
    resolveAlert
  } = useAlertManager();

  // Estado
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [instances, setInstances] = useState<AlertInstance[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [loading, setLoading] = useState(false);

  // Formulário de nova regra
  const [newRule, setNewRule] = useState<Partial<AlertRule>>({
    name: '',
    description: '',
    enabled: true,
    conditions: {
      level: [],
      category: [],
      severity: [],
      timeWindow: 5,
      threshold: 1
    },
    actions: {
      email: {
        enabled: false,
        recipients: [],
        template: 'critical_error'
      },
      slack: {
        enabled: false,
        webhook: '',
        channel: '#alerts'
      },
      webhook: {
        enabled: false,
        url: ''
      },
      dashboard: {
        enabled: true,
        showNotification: true
      }
    },
    cooldown: 15
  });

  // Carregar dados
  const loadData = () => {
    setRules(getRules());
    setInstances(getInstances());
  };

  useEffect(() => {
    loadData();
  }, []);

  // Toggle monitoramento
  const toggleMonitoring = () => {
    if (isMonitoring) {
      stopMonitoring();
      setIsMonitoring(false);
    } else {
      startMonitoring(60000); // 1 minuto
      setIsMonitoring(true);
    }
  };

  // Criar nova regra
  const handleCreateRule = () => {
    if (!newRule.name || !newRule.description) return;

    const rule: AlertRule = {
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: newRule.name!,
      description: newRule.description!,
      enabled: newRule.enabled!,
      conditions: newRule.conditions!,
      actions: newRule.actions!,
      cooldown: newRule.cooldown!
    };

    addRule(rule);
    loadData();
    setShowCreateDialog(false);
    resetForm();
  };

  // Atualizar regra
  const handleUpdateRule = (ruleId: string, updates: Partial<AlertRule>) => {
    updateRule(ruleId, updates);
    loadData();
  };

  // Remover regra
  const handleRemoveRule = (ruleId: string) => {
    if (confirm('Tem certeza que deseja remover esta regra?')) {
      removeRule(ruleId);
      loadData();
    }
  };

  // Resolver alerta
  const handleResolveAlert = (alertId: string) => {
    resolveAlert(alertId);
    loadData();
  };

  // Resetar formulário
  const resetForm = () => {
    setNewRule({
      name: '',
      description: '',
      enabled: true,
      conditions: {
        level: [],
        category: [],
        severity: [],
        timeWindow: 5,
        threshold: 1
      },
      actions: {
        email: {
          enabled: false,
          recipients: [],
          template: 'critical_error'
        },
        slack: {
          enabled: false,
          webhook: '',
          channel: '#alerts'
        },
        webhook: {
          enabled: false,
          url: ''
        },
        dashboard: {
          enabled: true,
          showNotification: true
        }
      },
      cooldown: 15
    });
  };

  // Renderizar formulário de regra
  const renderRuleForm = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Nome da Regra *</Label>
          <Input
            id="name"
            value={newRule.name || ''}
            onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Ex: Erros Críticos"
          />
        </div>
        <div>
          <Label htmlFor="cooldown">Cooldown (minutos)</Label>
          <Input
            id="cooldown"
            type="number"
            value={newRule.cooldown || 15}
            onChange={(e) => setNewRule(prev => ({ ...prev, cooldown: parseInt(e.target.value) }))}
            min="0"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="description">Descrição *</Label>
        <Textarea
          id="description"
          value={newRule.description || ''}
          onChange={(e) => setNewRule(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Descreva quando esta regra deve ser acionada..."
          rows={3}
        />
      </div>

      {/* Condições */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Condições</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="severity">Severidade</Label>
            <Select
              value={newRule.conditions?.severity?.[0] || ''}
              onValueChange={(value) => setNewRule(prev => ({
                ...prev,
                conditions: {
                  ...prev.conditions,
                  severity: value ? [value] : []
                }
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar severidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas</SelectItem>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="critical">Crítica</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="category">Categoria</Label>
            <Select
              value={newRule.conditions?.category?.[0] || ''}
              onValueChange={(value) => setNewRule(prev => ({
                ...prev,
                conditions: {
                  ...prev.conditions,
                  category: value ? [value] : []
                }
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas</SelectItem>
                <SelectItem value="validation">Validação</SelectItem>
                <SelectItem value="network">Rede</SelectItem>
                <SelectItem value="authentication">Autenticação</SelectItem>
                <SelectItem value="authorization">Autorização</SelectItem>
                <SelectItem value="server">Servidor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="threshold">Limite de Ocorrências</Label>
            <Input
              id="threshold"
              type="number"
              value={newRule.conditions?.threshold || 1}
              onChange={(e) => setNewRule(prev => ({
                ...prev,
                conditions: {
                  ...prev.conditions,
                  threshold: parseInt(e.target.value)
                }
              }))}
              min="1"
            />
          </div>
          <div>
            <Label htmlFor="timeWindow">Janela de Tempo (minutos)</Label>
            <Input
              id="timeWindow"
              type="number"
              value={newRule.conditions?.timeWindow || 5}
              onChange={(e) => setNewRule(prev => ({
                ...prev,
                conditions: {
                  ...prev.conditions,
                  timeWindow: parseInt(e.target.value)
                }
              }))}
              min="1"
            />
          </div>
        </div>
      </div>

      {/* Ações */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Ações</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label className="text-base font-medium">Email</Label>
              <p className="text-sm text-gray-600">Enviar alertas por email</p>
            </div>
            <Switch
              checked={newRule.actions?.email?.enabled || false}
              onCheckedChange={(checked) => setNewRule(prev => ({
                ...prev,
                actions: {
                  ...prev.actions,
                  email: {
                    ...prev.actions?.email,
                    enabled: checked
                  }
                }
              }))}
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label className="text-base font-medium">Slack</Label>
              <p className="text-sm text-gray-600">Enviar alertas para Slack</p>
            </div>
            <Switch
              checked={newRule.actions?.slack?.enabled || false}
              onCheckedChange={(checked) => setNewRule(prev => ({
                ...prev,
                actions: {
                  ...prev.actions,
                  slack: {
                    ...prev.actions?.slack,
                    enabled: checked
                  }
                }
              }))}
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label className="text-base font-medium">Webhook</Label>
              <p className="text-sm text-gray-600">Enviar para webhook personalizado</p>
            </div>
            <Switch
              checked={newRule.actions?.webhook?.enabled || false}
              onCheckedChange={(checked) => setNewRule(prev => ({
                ...prev,
                actions: {
                  ...prev.actions,
                  webhook: {
                    ...prev.actions?.webhook,
                    enabled: checked
                  }
                }
              }))}
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label className="text-base font-medium">Dashboard</Label>
              <p className="text-sm text-gray-600">Mostrar notificação no dashboard</p>
            </div>
            <Switch
              checked={newRule.actions?.dashboard?.enabled || true}
              onCheckedChange={(checked) => setNewRule(prev => ({
                ...prev,
                actions: {
                  ...prev.actions,
                  dashboard: {
                    ...prev.actions?.dashboard,
                    enabled: checked
                  }
                }
              }))}
            />
          </div>
        </div>
      </div>
    </div>
  );

  // Renderizar tabela de regras
  const renderRulesTable = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Regras de Alerta
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Condições</TableHead>
              <TableHead>Ações</TableHead>
              <TableHead>Último Disparo</TableHead>
              <TableHead>Operações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map(rule => (
              <TableRow key={rule.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{rule.name}</div>
                    <div className="text-sm text-gray-600">{rule.description}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={rule.enabled ? "default" : "secondary"}>
                    {rule.enabled ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div>Severidade: {rule.conditions.severity?.join(', ') || 'Todas'}</div>
                    <div>Limite: {rule.conditions.threshold} em {rule.conditions.timeWindow}min</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {rule.actions.email?.enabled && <Badge variant="outline" className="mr-1">Email</Badge>}
                    {rule.actions.slack?.enabled && <Badge variant="outline" className="mr-1">Slack</Badge>}
                    {rule.actions.webhook?.enabled && <Badge variant="outline" className="mr-1">Webhook</Badge>}
                    {rule.actions.dashboard?.enabled && <Badge variant="outline">Dashboard</Badge>}
                  </div>
                </TableCell>
                <TableCell>
                  {rule.lastTriggered ? (
                    <div className="text-sm">
                      {format(new Date(rule.lastTriggered), 'dd/MM HH:mm', { locale: ptBR })}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">Nunca</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUpdateRule(rule.id, { enabled: !rule.enabled })}
                    >
                      {rule.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
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
                      variant="outline"
                      onClick={() => handleRemoveRule(rule.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  // Renderizar alertas recentes
  const renderRecentAlerts = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Alertas Recentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {instances.slice(0, 10).map(alert => (
            <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Badge className={SEVERITY_COLORS[alert.severity]}>
                  {alert.severity}
                </Badge>
                <div>
                  <div className="font-medium">{alert.message}</div>
                  <div className="text-sm text-gray-600">
                    {format(new Date(alert.triggeredAt), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!alert.resolved && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleResolveAlert(alert.id)}
                  >
                    <CheckCircle className="w-4 h-4" />
                  </Button>
                )}
                {alert.resolved && (
                  <Badge variant="secondary">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Resolvido
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Configuração de Alertas</h1>
        <div className="flex items-center gap-2">
          <Badge variant={isMonitoring ? "default" : "secondary"}>
            {isMonitoring ? "Monitorando" : "Pausado"}
          </Badge>
          <Button
            onClick={toggleMonitoring}
            variant={isMonitoring ? "destructive" : "default"}
          >
            {isMonitoring ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            {isMonitoring ? "Parar" : "Iniciar"} Monitoramento
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderRulesTable()}
        {renderRecentAlerts()}
      </div>

      {/* Dialog para criar nova regra */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogTrigger asChild>
          <Button className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg">
            <Plus className="w-6 h-6" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Nova Regra de Alerta
            </DialogTitle>
          </DialogHeader>
          
          {renderRuleForm()}
          
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={handleCreateRule}
              disabled={!newRule.name || !newRule.description}
            >
              <Save className="w-4 h-4 mr-2" />
              Criar Regra
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

