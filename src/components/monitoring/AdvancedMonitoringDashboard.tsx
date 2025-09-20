/**
 * 📊 Dashboard de Monitoring Avançado
 * 
 * Interface para visualizar métricas, erros e performance
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  AlertCircle,
  CheckCircle,
  XCircle,
  Download,
  RefreshCw,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAdvancedMonitoring } from '@/hooks/useAdvancedMonitoring';
import { toast } from 'sonner';

export default function AdvancedMonitoringDashboard() {
  const {
    metrics,
    errors,
    performanceReports,
    businessMetrics,
    isMonitoring,
    recordMetric,
    recordError,
    recordBusinessMetric,
    getStats,
    exportData,
    cleanupOldData,
    PERFORMANCE_THRESHOLDS
  } = useAdvancedMonitoring();

  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '24h' | '7d'>('24h');
  const [showCriticalOnly, setShowCriticalOnly] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const stats = getStats();

  // Auto refresh
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        // Simular coleta de métricas
        recordMetric('activeUsers', Math.floor(Math.random() * 100), 'users', 'business');
        recordMetric('apiCalls', Math.floor(Math.random() * 1000), 'calls', 'performance');
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, recordMetric]);

  const handleExportData = () => {
    const data = exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monitoring-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('📊 Dados exportados com sucesso!');
  };

  const handleCleanupData = () => {
    cleanupOldData();
    toast.success('🗑️ Dados antigos removidos!');
  };

  const handleTestError = () => {
    recordError('Erro de teste gerado manualmente', undefined, 'low');
    toast.info('🧪 Erro de teste registrado');
  };

  const handleTestBusinessMetric = () => {
    recordBusinessMetric('testMetric', Math.floor(Math.random() * 100), 80);
    toast.info('📈 Métrica de negócio registrada');
  };

  const filteredErrors = showCriticalOnly 
    ? errors.filter(e => e.severity === 'critical')
    : errors;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">📊 Monitoring Avançado</h1>
          <p className="text-gray-600">Monitoramento em tempo real da aplicação</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isMonitoring ? 'default' : 'secondary'}>
            {isMonitoring ? 'Monitorando' : 'Pausado'}
          </Badge>
          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant="outline"
            size="sm"
          >
            {autoRefresh ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            Auto Refresh
          </Button>
        </div>
      </div>

      {/* Estatísticas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Activity className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total de Métricas</p>
                <p className="text-2xl font-bold">{stats.totalMetrics}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total de Erros</p>
                <p className="text-2xl font-bold">{stats.totalErrors}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertCircle className="w-8 h-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Erros Críticos</p>
                <p className="text-2xl font-bold">{stats.criticalErrors}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Performance Média</p>
                <p className="text-2xl font-bold">{Math.round(stats.avgPerformance)}ms</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Controles de Monitoring
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleTestError} variant="outline">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Testar Erro
            </Button>
            <Button onClick={handleTestBusinessMetric} variant="outline">
              <TrendingUp className="w-4 h-4 mr-2" />
              Testar Métrica
            </Button>
            <Button onClick={handleExportData} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Exportar Dados
            </Button>
            <Button onClick={handleCleanupData} variant="outline">
              <Trash2 className="w-4 h-4 mr-2" />
              Limpar Dados Antigos
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Relatórios de Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Relatórios de Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {performanceReports.slice(-10).map((report) => (
              <div key={report.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {report.status === 'good' && <CheckCircle className="w-5 h-5 text-green-600" />}
                  {report.status === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-600" />}
                  {report.status === 'error' && <XCircle className="w-5 h-5 text-red-600" />}
                  <div>
                    <p className="font-medium">{report.metric}</p>
                    <p className="text-sm text-gray-600">
                      {report.value} {report.metric.includes('Time') ? 'ms' : 'units'}
                    </p>
                  </div>
                </div>
                <Badge variant={report.status === 'good' ? 'default' : 'destructive'}>
                  {report.status}
                </Badge>
              </div>
            ))}
            {performanceReports.length === 0 && (
              <p className="text-gray-500 text-center py-4">Nenhum relatório de performance disponível</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Erros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Erros ({filteredErrors.length})
            </div>
            <Button
              onClick={() => setShowCriticalOnly(!showCriticalOnly)}
              variant="outline"
              size="sm"
            >
              {showCriticalOnly ? 'Mostrar Todos' : 'Apenas Críticos'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredErrors.slice(-10).map((error) => (
              <div key={error.id} className="p-3 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium">{error.message}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {new Date(error.timestamp).toLocaleString()}
                    </p>
                    {error.stack && (
                      <details className="mt-2">
                        <summary className="text-sm text-gray-500 cursor-pointer">
                          Ver stack trace
                        </summary>
                        <pre className="text-xs bg-gray-100 p-2 mt-2 rounded overflow-x-auto">
                          {error.stack}
                        </pre>
                      </details>
                    )}
                  </div>
                  <Badge className={getSeverityColor(error.severity)}>
                    {error.severity}
                  </Badge>
                </div>
              </div>
            ))}
            {filteredErrors.length === 0 && (
              <p className="text-gray-500 text-center py-4">Nenhum erro encontrado</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Métricas de Negócio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Métricas de Negócio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {businessMetrics.slice(-5).map((metric) => (
              <div key={metric.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{metric.name}</h3>
                  <div className="flex items-center gap-2">
                    {metric.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-600" />}
                    {metric.trend === 'down' && <TrendingDown className="w-4 h-4 text-red-600" />}
                    <Badge variant="outline">{metric.period}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-bold">{metric.value}</span>
                  {metric.target && (
                    <div className="flex-1">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Meta: {metric.target}</span>
                        <span>{Math.round((metric.value / metric.target) * 100)}%</span>
                      </div>
                      <Progress 
                        value={(metric.value / metric.target) * 100} 
                        className="h-2"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
            {businessMetrics.length === 0 && (
              <p className="text-gray-500 text-center py-4">Nenhuma métrica de negócio disponível</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Thresholds de Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Thresholds de Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(PERFORMANCE_THRESHOLDS).map(([metric, thresholds]) => (
              <div key={metric} className="p-3 border rounded-lg">
                <h3 className="font-medium mb-2">{metric}</h3>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-yellow-600">Warning:</span>
                    <span>{thresholds.warning}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-red-600">Error:</span>
                    <span>{thresholds.error}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

