/**
 * 🔗 Dashboard de Conectividade de Sistemas
 * 
 * Visualiza e monitora a conectividade entre módulos
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Activity,
  Zap,
  Database,
  Link,
  Shield,
  TrendingUp,
  Clock,
  Users,
  Settings
} from 'lucide-react';
import { useTriggerSystem } from '@/hooks/useTriggerSystem';
import { useDataSync } from '@/hooks/useDataSync';
import { useIntegrityCheck } from '@/hooks/useIntegrityCheck';
import { toast } from 'sonner';

export default function ConnectivityDashboard() {
  const { 
    isProcessing: triggersProcessing, 
    getRules: getTriggerRules,
    triggerManager 
  } = useTriggerSystem();
  
  const { 
    isProcessing: syncProcessing, 
    getRules: getSyncRules,
    dataSyncManager 
  } = useDataSync();
  
  const { 
    isMonitoring, 
    checks, 
    runSystemCheck,
    integrityManager 
  } = useIntegrityCheck();

  const [triggerRules, setTriggerRules] = useState([]);
  const [syncRules, setSyncRules] = useState([]);
  const [systemHealth, setSystemHealth] = useState({
    triggers: 'healthy',
    sync: 'healthy',
    integrity: 'healthy',
    overall: 'healthy'
  });
  const [stats, setStats] = useState({
    triggersExecuted: 0,
    syncEventsProcessed: 0,
    integrityIssuesFound: 0,
    autoFixesApplied: 0
  });

  // Carregar dados iniciais
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const triggerRulesData = getTriggerRules();
      const syncRulesData = getSyncRules();
      
      setTriggerRules(triggerRulesData);
      setSyncRules(syncRulesData);
      
      // Calcular estatísticas
      const triggerQueue = triggerManager.getEventQueue();
      const syncQueue = dataSyncManager.getSyncQueue();
      const integrityChecks = integrityManager.getChecks();
      
      setStats({
        triggersExecuted: triggerQueue.filter(e => e.processed).length,
        syncEventsProcessed: syncQueue.filter(e => e.syncStatus === 'completed').length,
        integrityIssuesFound: integrityChecks.reduce((sum, check) => sum + check.issues.length, 0),
        autoFixesApplied: integrityChecks.reduce((sum, check) => sum + check.fixes.filter(f => f.applied).length, 0)
      });
      
      // Calcular saúde do sistema
      updateSystemHealth(triggerQueue, syncQueue, integrityChecks);
      
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    }
  };

  const updateSystemHealth = (triggerQueue: any[], syncQueue: any[], integrityChecks: any[]) => {
    const triggerHealth = triggerQueue.filter(e => !e.processed && e.retryCount > 2).length > 0 ? 'warning' : 'healthy';
    const syncHealth = syncQueue.filter(e => e.syncStatus === 'failed').length > 0 ? 'warning' : 'healthy';
    const integrityHealth = integrityChecks.some(check => check.severity === 'critical') ? 'critical' : 
                           integrityChecks.some(check => check.severity === 'high') ? 'warning' : 'healthy';
    
    const overallHealth = integrityHealth === 'critical' ? 'critical' :
                         integrityHealth === 'warning' || triggerHealth === 'warning' || syncHealth === 'warning' ? 'warning' : 'healthy';
    
    setSystemHealth({
      triggers: triggerHealth,
      sync: syncHealth,
      integrity: integrityHealth,
      overall: overallHealth
    });
  };

  const handleRunSystemCheck = async () => {
    try {
      await runSystemCheck();
      toast.success('Verificação de integridade executada');
      loadDashboardData();
    } catch (error) {
      toast.error('Erro ao executar verificação');
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Activity className="w-5 h-5 text-gray-600" />;
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy':
        return 'border-green-200 bg-green-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'critical':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Conectividade de Sistemas</h1>
          <p className="text-gray-600 mt-2">
            Monitoramento e controle da conectividade entre módulos
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={loadDashboardData} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          <Button onClick={handleRunSystemCheck}>
            <Shield className="w-4 h-4 mr-2" />
            Verificar Integridade
          </Button>
        </div>
      </div>

      {/* Status Geral */}
      <Card className={getHealthColor(systemHealth.overall)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getHealthIcon(systemHealth.overall)}
            Status Geral do Sistema
            <Badge variant={systemHealth.overall === 'healthy' ? 'default' : 'destructive'}>
              {systemHealth.overall === 'healthy' ? 'Saudável' : 
               systemHealth.overall === 'warning' ? 'Atenção' : 'Crítico'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                {getHealthIcon(systemHealth.triggers)}
              </div>
              <p className="text-sm font-medium">Triggers</p>
              <p className="text-xs text-gray-600">
                {triggersProcessing ? 'Processando' : 'Ativo'}
              </p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                {getHealthIcon(systemHealth.sync)}
              </div>
              <p className="text-sm font-medium">Sincronização</p>
              <p className="text-xs text-gray-600">
                {syncProcessing ? 'Processando' : 'Ativo'}
              </p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                {getHealthIcon(systemHealth.integrity)}
              </div>
              <p className="text-sm font-medium">Integridade</p>
              <p className="text-xs text-gray-600">
                {isMonitoring ? 'Monitorando' : 'Inativo'}
              </p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Database className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-sm font-medium">Conectividade</p>
              <p className="text-xs text-gray-600">100%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Zap className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Triggers Executados</p>
                <p className="text-2xl font-bold">{stats.triggersExecuted}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Link className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Eventos Sincronizados</p>
                <p className="text-2xl font-bold">{stats.syncEventsProcessed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Shield className="w-8 h-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Problemas Encontrados</p>
                <p className="text-2xl font-bold">{stats.integrityIssuesFound}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Correções Aplicadas</p>
                <p className="text-2xl font-bold">{stats.autoFixesApplied}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Regras de Trigger */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Regras de Trigger
            <Badge variant="outline">{triggerRules.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {triggerRules.map((rule: any) => (
              <div key={rule.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${rule.enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <div>
                    <p className="font-medium">{rule.name}</p>
                    <p className="text-sm text-gray-600">{rule.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{rule.sourceEvent}</Badge>
                  <Badge variant="secondary">{rule.targetAction}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Regras de Sincronização */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="w-5 h-5" />
            Regras de Sincronização
            <Badge variant="outline">{syncRules.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {syncRules.map((rule: any) => (
              <div key={rule.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${rule.enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <div>
                    <p className="font-medium">{rule.name}</p>
                    <p className="text-sm text-gray-600">{rule.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{rule.sourceEntity}</Badge>
                  <Badge variant="secondary">{rule.targetEntity}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Verificações de Integridade Recentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Verificações de Integridade
            <Badge variant="outline">{checks.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {checks.slice(-5).map((check: any) => (
              <div key={check.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getHealthIcon(check.status === 'passed' ? 'healthy' : 'warning')}
                  <div>
                    <p className="font-medium">{check.entityType} - {check.entityId}</p>
                    <p className="text-sm text-gray-600">
                      {check.issues.length} problemas encontrados
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={check.severity === 'critical' ? 'destructive' : 'outline'}>
                    {check.severity}
                  </Badge>
                  <Badge variant="secondary">
                    {new Date(check.timestamp).toLocaleString()}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Alertas */}
      {systemHealth.overall !== 'healthy' && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Atenção:</strong> O sistema detectou problemas de conectividade. 
            Verifique as verificações de integridade e execute correções se necessário.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

