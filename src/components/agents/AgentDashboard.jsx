import React, { useState, useEffect } from 'react';
import { AgentExecution, AuditLog } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import AgentAlert from './AgentAlert';
import { 
  Bot, 
  Activity, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw,
  TrendingUp,
  Calendar,
  Zap,
  BarChart3
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const AgentStatusBadge = ({ status, size = 'default' }) => {
  const config = {
    running: { color: 'bg-blue-100 text-blue-800', icon: Activity, label: 'Executando' },
    completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Concluído' },
    failed: { color: 'bg-red-100 text-red-800', icon: AlertTriangle, label: 'Erro' },
    cancelled: { color: 'bg-gray-100 text-gray-800', icon: Clock, label: 'Cancelado' }
  };
  
  const { color, icon: Icon, label } = config[status] || config.completed;
  const sizeClass = size === 'sm' ? 'text-xs' : '';
  
  return (
    <Badge className={`${color} ${sizeClass} flex items-center gap-1`}>
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  );
};

const ExecutionCard = ({ execution, isLatest = false }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className={`p-4 rounded-lg border ${
      isLatest ? 'border-purple-200 bg-purple-50' : 'border-slate-200 bg-white'
    }`}
  >
    <div className="flex items-start justify-between mb-3">
      <div>
        <h4 className="font-medium text-sm text-slate-900">
          Execução {execution.executionId?.slice(-8) || 'N/A'}
        </h4>
        <p className="text-xs text-slate-500">
          {execution.startedAt && formatDistanceToNow(new Date(execution.startedAt), { 
            addSuffix: true, 
            locale: ptBR 
          })}
        </p>
      </div>
      <AgentStatusBadge status={execution.status} size="sm" />
    </div>

    {execution.summary && (
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center p-1 bg-slate-50 rounded">
            <div className="font-medium text-slate-900">{execution.summary.total_entities_analyzed || 0}</div>
            <div className="text-slate-500">Analisados</div>
          </div>
          <div className="text-center p-1 bg-slate-50 rounded">
            <div className="font-medium text-slate-900">{execution.summary.risks_detected || 0}</div>
            <div className="text-slate-500">Riscos</div>
          </div>
          <div className="text-center p-1 bg-slate-50 rounded">
            <div className="font-medium text-slate-900">{execution.summary.notifications_sent || 0}</div>
            <div className="text-slate-500">Alertas</div>
          </div>
        </div>
        
        {execution.summary.execution_notes && (
          <p className="text-xs text-slate-600 italic bg-slate-50 p-2 rounded">
            {execution.summary.execution_notes}
          </p>
        )}
      </div>
    )}

    {execution.error && (
      <Alert variant="destructive" className="mt-3">
        <AlertTriangle className="h-3 w-3" />
        <AlertDescription className="text-xs">
          {execution.error.message}
        </AlertDescription>
      </Alert>
    )}
  </motion.div>
);

export default function AgentDashboard() {
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeRisks, setActiveRisks] = useState([]);
  const { agency } = useSession();

  useEffect(() => {
    if (agency?.id) {
      loadAgentData();
    }
  }, [agency?.id]);

  const loadAgentData = async () => {
    setLoading(true);
    try {
      // Load recent agent executions
      const executionsData = await AgentExecution.filter(
        { agencyId: agency.id },
        '-startedAt',
        10
      );
      setExecutions(executionsData);

      // Extract active risks from latest execution
      const latestExecution = executionsData[0];
      if (latestExecution && latestExecution.risks_detected) {
        setActiveRisks(latestExecution.risks_detected);
      }

    } catch (error) {
      console.error("Erro ao carregar dados dos agentes:", error);
      toast.error("Falha ao carregar dashboard dos agentes.");
    } finally {
      setLoading(false);
    }
  };

  const handleDismissRisk = async (risk) => {
    try {
      // Remove risk from active list
      setActiveRisks(prev => prev.filter(r => r.id !== risk.id));
      
      // Log dismissal
      await AuditLog.create({
        agencyId: agency.id,
        entity_type: 'AgentExecution',
        entity_id: executions[0]?.id || 'unknown',
        action: 'AGENT_RISK_DISMISSED',
        actor_id: 'current_user',
        meta_json: {
          risk_type: risk.type,
          risk_id: risk.id,
          entity_type: risk.entity?.type,
          entity_id: risk.entity?.id
        }
      });
      
      toast.success("Alerta dispensado");
    } catch (error) {
      console.error("Erro ao dispensar alerta:", error);
      toast.error("Falha ao dispensar alerta");
    }
  };

  const handleRiskAction = async (risk, actionType) => {
    // Log action taken
    await AuditLog.create({
      agencyId: agency.id,
      entity_type: 'AgentExecution',
      entity_id: executions[0]?.id || 'unknown',
      action: 'AGENT_RISK_ACTION_TAKEN',
      actor_id: 'current_user',
      meta_json: {
        risk_type: risk.type,
        risk_id: risk.id,
        action_type: actionType,
        entity_type: risk.entity?.type,
        entity_id: risk.entity?.id
      }
    });
  };

  const stats = {
    totalExecutions: executions.length,
    successfulExecutions: executions.filter(e => e.status === 'completed').length,
    activeRisks: activeRisks.length,
    criticalRisks: activeRisks.filter(r => r.severity === 'critical').length
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-slate-200 rounded w-1/2 animate-pulse"></div>
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
        <div className="h-64 bg-slate-200 rounded-lg animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Bot className="w-6 h-6 text-purple-600" />
            Agentes IA
          </h1>
          <p className="text-slate-600 text-sm">
            Monitores inteligentes cuidando da saúde da sua operação
          </p>
        </div>
        <Button variant="outline" onClick={() => loadAgentData()} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-xl font-bold text-slate-900">{stats.totalExecutions}</div>
                <div className="text-xs text-slate-500">Execuções</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <div className="text-xl font-bold text-slate-900">{stats.successfulExecutions}</div>
                <div className="text-xs text-slate-500">Sucessos</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <div>
                <div className="text-xl font-bold text-slate-900">{stats.activeRisks}</div>
                <div className="text-xs text-slate-500">Alertas Ativos</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-red-600" />
              <div>
                <div className="text-xl font-bold text-slate-900">{stats.criticalRisks}</div>
                <div className="text-xs text-slate-500">Críticos</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="alerts" className="space-y-6">
        <TabsList>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Alertas Ativos ({activeRisks.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-4">
          {activeRisks.length > 0 ? (
            <div className="space-y-3">
              <AnimatePresence>
                {activeRisks
                  .sort((a, b) => {
                    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
                    return severityOrder[b.severity] - severityOrder[a.severity];
                  })
                  .map((risk) => (
                    <AgentAlert
                      key={risk.id}
                      risk={risk}
                      onDismiss={handleDismissRisk}
                      onAction={handleRiskAction}
                    />
                  ))}
              </AnimatePresence>
            </div>
          ) : (
            <Card className="text-center p-12">
              <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Tudo em Ordem!</h3>
              <p className="text-slate-500">
                Nenhum alerta ativo. Os agentes estão monitorando continuamente.
              </p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Histórico de Execuções
              </CardTitle>
              <CardDescription>
                Últimas execuções dos agentes de monitoramento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {executions.map((execution, index) => (
                  <ExecutionCard
                    key={execution.id}
                    execution={execution}
                    isLatest={index === 0}
                  />
                ))}
                
                {executions.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <Bot className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>Nenhuma execução registrada ainda.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}