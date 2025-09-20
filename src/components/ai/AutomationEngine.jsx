import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Zap, Clock, CheckCircle, AlertTriangle, Play, Pause,
  Settings, BarChart3, Target, Mail, MessageSquare,
  Calendar, FileText, TrendingUp, Users, Brain
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

// Tipos de automação disponíveis
const AUTOMATION_TYPES = {
  cycle_planning: {
    icon: Target,
    title: 'Planejamento Automático de Ciclos',
    description: 'Gera automaticamente planos mensais baseados em aprendizados e performance',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  learning_extraction: {
    icon: Brain,
    title: 'Extração de Aprendizados',
    description: 'Identifica e cataloga automaticamente insights de campanhas e resultados',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50'
  },
  performance_monitoring: {
    icon: BarChart3,
    title: 'Monitoramento de Performance',
    description: 'Acompanha KPIs e alerta sobre desvios significativos',
    color: 'text-green-600',
    bgColor: 'bg-green-50'
  },
  client_communication: {
    icon: Mail,
    title: 'Comunicação com Cliente',
    description: 'Envia updates automáticos sobre progresso e resultados',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50'
  },
  task_generation: {
    icon: CheckCircle,
    title: 'Geração de Tarefas',
    description: 'Cria automaticamente tarefas baseadas em planos aprovados',
    color: 'text-teal-600',
    bgColor: 'bg-teal-50'
  },
  risk_detection: {
    icon: AlertTriangle,
    title: 'Detecção de Riscos',
    description: 'Identifica potenciais problemas antes que se tornem críticos',
    color: 'text-red-600',
    bgColor: 'bg-red-50'
  }
};

// Status das automações
const AUTOMATION_STATUS = {
  active: { label: 'Ativo', color: 'text-green-700', bgColor: 'bg-green-100' },
  paused: { label: 'Pausado', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  error: { label: 'Erro', color: 'text-red-700', bgColor: 'bg-red-100' },
  inactive: { label: 'Inativo', color: 'text-gray-700', bgColor: 'bg-gray-100' }
};

// Card de automação individual
const AutomationCard = ({ automation, onToggle, onConfigure, onViewResults }) => {
  const config = AUTOMATION_TYPES[automation.type];
  const status = AUTOMATION_STATUS[automation.status];
  const IconComponent = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${config.bgColor} flex items-center justify-center`}>
            <IconComponent className={`w-5 h-5 ${config.color}`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{config.title}</h3>
            <p className="text-sm text-gray-600">{config.description}</p>
          </div>
        </div>
        <Switch
          checked={automation.status === 'active'}
          onCheckedChange={(checked) => onToggle(automation.id, checked)}
        />
      </div>

      <div className="flex items-center justify-between mb-4">
        <Badge className={`${status.bgColor} ${status.color} border-0`}>
          {status.label}
        </Badge>
        <div className="text-sm text-gray-500">
          Última execução: {automation.lastRun || 'Nunca'}
        </div>
      </div>

      {automation.metrics && (
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">{automation.metrics.executions}</div>
              <div className="text-xs text-gray-600">Execuções</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{automation.metrics.successes}</div>
              <div className="text-xs text-gray-600">Sucessos</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{automation.metrics.savings}</div>
              <div className="text-xs text-gray-600">Horas Poupadas</div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onConfigure(automation)}
        >
          <Settings className="w-4 h-4 mr-2" />
          Configurar
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onViewResults(automation)}
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          Resultados
        </Button>
      </div>
    </motion.div>
  );
};

// Componente principal do Motor de Automação
export const AutomationEngine = ({ agencyId }) => {
  const [automations, setAutomations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfig, setShowConfig] = useState(false);
  const [selectedAutomation, setSelectedAutomation] = useState(null);
  const [executionHistory, setExecutionHistory] = useState([]);

  // Simular carregamento das automações
  useEffect(() => {
    loadAutomations();
  }, [agencyId]);

  const loadAutomations = async () => {
    setLoading(true);
    
    setTimeout(() => {
      const mockAutomations = [
        {
          id: '1',
          type: 'cycle_planning',
          status: 'active',
          lastRun: '2 horas atrás',
          metrics: {
            executions: 45,
            successes: 42,
            savings: '18h'
          },
          config: {
            frequency: 'monthly',
            triggerDay: 25,
            includeWeekends: false
          }
        },
        {
          id: '2',
          type: 'learning_extraction',
          status: 'active',
          lastRun: '1 dia atrás',
          metrics: {
            executions: 89,
            successes: 87,
            savings: '32h'
          },
          config: {
            sources: ['campaign_results', 'client_feedback', 'metrics'],
            confidenceThreshold: 75
          }
        },
        {
          id: '3',
          type: 'performance_monitoring',
          status: 'active',
          lastRun: '30 min atrás',
          metrics: {
            executions: 234,
            successes: 230,
            savings: '12h'
          },
          config: {
            checkInterval: 'hourly',
            alertThresholds: {
              performance_drop: 15,
              budget_deviation: 20
            }
          }
        },
        {
          id: '4',
          type: 'client_communication',
          status: 'paused',
          lastRun: '3 dias atrás',
          metrics: {
            executions: 67,
            successes: 65,
            savings: '28h'
          },
          config: {
            frequency: 'weekly',
            reportTypes: ['progress', 'metrics', 'next_steps']
          }
        },
        {
          id: '5',
          type: 'task_generation',
          status: 'active',
          lastRun: '4 horas atrás',
          metrics: {
            executions: 156,
            successes: 154,
            savings: '45h'
          },
          config: {
            autoAssign: true,
            defaultDueDays: 7,
            includeClientTasks: false
          }
        },
        {
          id: '6',
          type: 'risk_detection',
          status: 'active',
          lastRun: '1 hora atrás',
          metrics: {
            executions: 345,
            successes: 340,
            savings: '15h'
          },
          config: {
            checkFrequency: 'hourly',
            riskFactors: ['approval_delays', 'performance_drops', 'communication_gaps']
          }
        }
      ];
      
      setAutomations(mockAutomations);
      setLoading(false);
    }, 1000);
  };

  const handleToggleAutomation = async (automationId, enabled) => {
    const newStatus = enabled ? 'active' : 'inactive';
    
    setAutomations(prev => prev.map(automation => 
      automation.id === automationId 
        ? { ...automation, status: newStatus }
        : automation
    ));

    toast.success(
      enabled 
        ? 'Automação ativada com sucesso!' 
        : 'Automação pausada com sucesso!'
    );
  };

  const handleConfigureAutomation = (automation) => {
    setSelectedAutomation(automation);
    setShowConfig(true);
  };

  const handleViewResults = (automation) => {
    // Simular histórico de execução
    const mockHistory = [
      {
        id: '1',
        timestamp: '2024-01-15 14:30:00',
        status: 'success',
        duration: '2.3s',
        result: 'Gerou 3 planos de ciclo',
        details: 'Clientes: A, B, C'
      },
      {
        id: '2',
        timestamp: '2024-01-15 14:00:00',
        status: 'success',
        duration: '1.8s',
        result: 'Extraiu 5 aprendizados',
        details: 'Campanhas do último mês'
      },
      {
        id: '3',
        timestamp: '2024-01-15 13:30:00',
        status: 'error',
        duration: '0.5s',
        result: 'Falha na conexão',
        details: 'API externa indisponível'
      }
    ];
    
    setExecutionHistory(mockHistory);
    setSelectedAutomation(automation);
    setShowConfig(true);
  };

  // Calcular estatísticas gerais
  const totalSavings = automations.reduce((sum, auto) => {
    const hours = parseInt(auto.metrics?.savings?.replace('h', '') || '0');
    return sum + hours;
  }, 0);

  const activeAutomations = automations.filter(auto => auto.status === 'active').length;
  const totalExecutions = automations.reduce((sum, auto) => sum + (auto.metrics?.executions || 0), 0);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Zap className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Carregando automações...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estatísticas gerais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Automações Ativas</p>
                <p className="text-3xl font-bold text-gray-900">{activeAutomations}</p>
              </div>
              <Zap className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Horas Poupadas</p>
                <p className="text-3xl font-bold text-green-600">{totalSavings}h</p>
              </div>
              <Clock className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Execuções</p>
                <p className="text-3xl font-bold text-purple-600">{totalExecutions}</p>
              </div>
              <Play className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Taxa de Sucesso</p>
                <p className="text-3xl font-bold text-teal-600">97%</p>
              </div>
              <CheckCircle className="w-8 h-8 text-teal-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de automações */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {automations.map(automation => (
          <AutomationCard
            key={automation.id}
            automation={automation}
            onToggle={handleToggleAutomation}
            onConfigure={handleConfigureAutomation}
            onViewResults={handleViewResults}
          />
        ))}
      </div>

      {/* Dialog de configuração */}
      <Dialog open={showConfig} onOpenChange={setShowConfig}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedAutomation && AUTOMATION_TYPES[selectedAutomation.type]?.title}
            </DialogTitle>
          </DialogHeader>
          
          {selectedAutomation && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Status Atual</h4>
                <div className="flex items-center gap-4">
                  <Badge className={`${AUTOMATION_STATUS[selectedAutomation.status].bgColor} ${AUTOMATION_STATUS[selectedAutomation.status].color} border-0`}>
                    {AUTOMATION_STATUS[selectedAutomation.status].label}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    Última execução: {selectedAutomation.lastRun}
                  </span>
                </div>
              </div>

              {selectedAutomation.metrics && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Métricas de Performance</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">{selectedAutomation.metrics.executions}</div>
                      <div className="text-sm text-gray-600">Total de Execuções</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">{selectedAutomation.metrics.successes}</div>
                      <div className="text-sm text-gray-600">Sucessos</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-purple-600">{selectedAutomation.metrics.savings}</div>
                      <div className="text-sm text-gray-600">Tempo Poupado</div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-medium text-gray-900 mb-4">Configurações</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                    {JSON.stringify(selectedAutomation.config, null, 2)}
                  </pre>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowConfig(false)}>
                  Fechar
                </Button>
                <Button>
                  <Settings className="w-4 h-4 mr-2" />
                  Editar Configurações
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AutomationEngine;