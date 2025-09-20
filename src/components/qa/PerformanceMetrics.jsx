/**
 * 📊 Componente: PerformanceMetrics
 * 
 * Exibe métricas de performance dos testes
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, TrendingUp, TrendingDown, Clock, 
  Download, RefreshCw, AlertTriangle, CheckCircle 
} from 'lucide-react';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';

export default function PerformanceMetrics() {
  const {
    metrics,
    history,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    clearMetrics,
    getStats,
    exportData,
    PERFORMANCE_THRESHOLDS
  } = usePerformanceMonitor();

  const stats = getStats();

  const getMetricStatus = (metricName, value) => {
    const threshold = PERFORMANCE_THRESHOLDS[metricName];
    if (!threshold) return { status: 'unknown', color: 'gray' };
    
    if (value <= threshold) {
      return { status: 'good', color: 'green' };
    } else {
      return { status: 'warning', color: 'orange' };
    }
  };

  const formatDuration = (ms) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'good':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Métricas de Performance
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Controles */}
        <div className="flex gap-2 flex-wrap">
          <Button 
            onClick={isMonitoring ? stopMonitoring : startMonitoring}
            variant={isMonitoring ? "destructive" : "default"}
            className="flex items-center gap-2"
          >
            {isMonitoring ? (
              <>
                <Square className="w-4 h-4" />
                Parar Monitoramento
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Iniciar Monitoramento
              </>
            )}
          </Button>
          
          <Button 
            onClick={clearMetrics}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Limpar
          </Button>
          
          <Button 
            onClick={() => {
              const data = exportData();
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `performance-metrics-${new Date().toISOString().split('T')[0]}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Exportar
          </Button>
        </div>

        {/* Estatísticas gerais */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-blue-800">Total de Métricas</div>
          </div>
          
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{formatDuration(stats.average)}</div>
            <div className="text-sm text-green-800">Tempo Médio</div>
          </div>
          
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{stats.warnings}</div>
            <div className="text-sm text-orange-800">Avisos</div>
          </div>
          
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
            <div className="text-sm text-red-800">Erros</div>
          </div>
        </div>

        {/* Métricas detalhadas */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Métricas Detalhadas</h3>
          
          {Object.entries(metrics).length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Nenhuma métrica registrada ainda</p>
              <p className="text-sm">Inicie o monitoramento para ver as métricas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(metrics).map(([name, metric]) => {
                const status = getMetricStatus(name, metric.value || metric.duration);
                
                return (
                  <div key={name} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(status.status)}
                        <span className="font-medium">{name}</span>
                        <Badge className={`bg-${status.color}-100 text-${status.color}-800`}>
                          {status.status}
                        </Badge>
                      </div>
                      
                      <div className="text-right">
                        <div className="font-bold">
                          {formatDuration(metric.value || metric.duration)}
                        </div>
                        {PERFORMANCE_THRESHOLDS[name] && (
                          <div className="text-sm text-gray-500">
                            Limite: {formatDuration(PERFORMANCE_THRESHOLDS[name])}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {PERFORMANCE_THRESHOLDS[name] && (
                      <Progress 
                        value={((metric.value || metric.duration) / PERFORMANCE_THRESHOLDS[name]) * 100}
                        className="w-full"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Histórico recente */}
        {history.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Histórico Recente</h3>
            <div className="max-h-40 overflow-y-auto space-y-2">
              {history.slice(-10).reverse().map((entry, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                  <span className="font-medium">{entry.name}</span>
                  <span className="text-gray-600">{formatDuration(entry.value || entry.duration)}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

