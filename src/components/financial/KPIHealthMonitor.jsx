
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Eye,
  Settings,
  Zap
} from 'lucide-react';
import { kpiAutomationEngine } from '@/api/functions';

const HEALTH_LEVELS = {
  excellent: { min: 90, color: 'bg-green-500', text: 'Excelente' },
  good: { min: 70, color: 'bg-blue-500', text: 'Bom' },
  warning: { min: 50, color: 'bg-yellow-500', text: 'Atenção' },
  critical: { min: 0, color: 'bg-red-500', text: 'Crítico' }
};

export default function KPIHealthMonitor({ 
  clientId, 
  serviceId,
  autoRefresh = true,
  className = "" 
}) {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(autoRefresh);
  const [refreshInterval, setRefreshInterval] = useState(null);

  const runHealthCheck = useCallback(async () => {
    try {
      setLoading(true);

      // Executar análise completa
      const response = await kpiAutomationEngine({
        clientId,
        serviceId,
        automationType: 'full_analysis'
      });

      if (response.success) {
        setHealthData(response);
        setLastCheck(new Date());
      }

    } catch (error) {
      console.error('Erro no health check:', error);
    } finally {
      setLoading(false);
    }
  }, [clientId, serviceId]);

  useEffect(() => {
    runHealthCheck();
  }, [runHealthCheck]);

  useEffect(() => {
    if (autoRefreshEnabled) {
      const interval = setInterval(runHealthCheck, 5 * 60 * 1000); // 5 minutos
      setRefreshInterval(interval);
      return () => clearInterval(interval);
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  }, [autoRefreshEnabled, runHealthCheck, refreshInterval]);

  const getHealthLevel = (score) => {
    if (score >= 90) return HEALTH_LEVELS.excellent;
    if (score >= 70) return HEALTH_LEVELS.good;
    if (score >= 50) return HEALTH_LEVELS.warning;
    return HEALTH_LEVELS.critical;
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'high': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'medium': return <Clock className="w-4 h-4 text-yellow-500" />;
      default: return <CheckCircle2 className="w-4 h-4 text-blue-500" />;
    }
  };

  if (loading && !healthData) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent" />
            <span className="ml-2 text-sm text-gray-600">Analisando saúde dos KPIs...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const healthScore = healthData?.results?.health_score || 0;
  const healthLevel = getHealthLevel(healthScore);
  const alerts = healthData?.results?.alerts || [];
  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  const recommendations = healthData?.results?.recommendations || [];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header com score geral */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="w-6 h-6 text-blue-600" />
              <div>
                <CardTitle>Monitor de Saúde dos KPIs</CardTitle>
                <p className="text-sm text-gray-600">
                  Última verificação: {lastCheck ? lastCheck.toLocaleTimeString('pt-BR') : 'Nunca'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={runHealthCheck}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Verificar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
              >
                <Zap className={`w-4 h-4 ${autoRefreshEnabled ? 'text-green-600' : 'text-gray-400'}`} />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Score de saúde */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl font-bold">{healthScore}%</span>
                <Badge className={`${healthLevel.color} text-white`}>
                  {healthLevel.text}
                </Badge>
              </div>
              <Progress value={healthScore} className="h-2" />
            </div>
            
            <div className="ml-6 text-right">
              <div className="text-sm text-gray-600">
                {healthData?.metrics?.kpis_analyzed || 0} KPIs analisados
              </div>
              <div className="text-xs text-gray-500">
                {healthData?.metrics?.execution_duration_ms || 0}ms
              </div>
            </div>
          </div>

          {/* Resumo rápido */}
          <div className="grid grid-cols-3 gap-4 pt-3 border-t">
            <div className="text-center">
              <div className="text-lg font-semibold text-red-600">
                {criticalAlerts.length}
              </div>
              <div className="text-xs text-gray-600">Críticos</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-yellow-600">
                {alerts.filter(a => a.severity === 'warning' || a.severity === 'medium').length}
              </div>
              <div className="text-xs text-gray-600">Avisos</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-600">
                {recommendations.length}
              </div>
              <div className="text-xs text-gray-600">Recomendações</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alertas críticos */}
      {criticalAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              Alertas Críticos ({criticalAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {criticalAlerts.map((alert, index) => (
              <Alert key={index} variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium">{alert.kpi_name}</div>
                      <div className="text-sm mt-1">{alert.message}</div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Tendências e insights */}
      {healthData?.results?.insights && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Insights e Tendências
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {healthData.results.insights.map((insight, index) => (
              <div key={index} className="p-3 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{insight.title || 'Insight Geral'}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {insight.summary || insight.description}
                    </div>
                    {insight.concern_level && insight.concern_level > 2 && (
                      <Badge variant="outline" className="mt-2">
                        Nível de preocupação: {insight.concern_level}/5
                      </Badge>
                    )}
                  </div>
                  
                  {insight.direction && (
                    <div className="flex items-center gap-1 text-sm">
                      {insight.direction === 'up' ? (
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      ) : insight.direction === 'down' ? (
                        <TrendingDown className="w-4 h-4 text-red-600" />
                      ) : (
                        <Activity className="w-4 h-4 text-gray-400" />
                      )}
                      <span className="text-gray-600">
                        {Math.round(insight.strength * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recomendações */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Recomendações de Melhoria ({recommendations.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recommendations.slice(0, 5).map((rec, index) => (
              <div key={index} className="p-3 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-medium">{rec.title}</div>
                      <Badge variant={rec.priority === 'high' ? 'destructive' : 'secondary'}>
                        {rec.priority}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {rec.description}
                    </div>
                    {rec.actions && rec.actions.length > 0 && (
                      <ul className="text-xs text-gray-500 mt-2 space-y-1">
                        {rec.actions.slice(0, 2).map((action, i) => (
                          <li key={i}>• {action}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Ações executadas */}
      {healthData?.actions_executed && healthData.actions_executed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Ações Automáticas Executadas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {healthData.actions_executed.map((action, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-green-50 rounded">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-sm">{action.message}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
