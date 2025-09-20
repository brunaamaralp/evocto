import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, AlertTriangle, XCircle, RefreshCw,
  Activity, FileText, Package 
} from 'lucide-react';
import { getSystemHealth } from '@/components/utils/buildChecker';

/**
 * Componente para verificar e exibir saúde do sistema
 * Substitui a necessidade de scripts externos
 */
export default function SystemHealthChecker({ 
  showDetails = false,
  autoRun = true 
}) {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(false);

  const runHealthCheck = async () => {
    setLoading(true);
    try {
      const healthReport = await getSystemHealth();
      setHealth(healthReport);
    } catch (error) {
      setHealth({
        timestamp: new Date().toISOString(),
        buildStatus: 'error',
        totalIssues: 1,
        issues: [error.message],
        recommendations: ['Contate o suporte técnico']
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoRun) {
      runHealthCheck();
    }
  }, [autoRun]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'issues':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Activity className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800';
      case 'issues':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Saúde do Sistema
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={runHealthCheck}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Verificar
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {loading && (
          <div className="text-center py-4">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-600">Verificando sistema...</p>
          </div>
        )}

        {health && !loading && (
          <div className="space-y-4">
            {/* Status Geral */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusIcon(health.buildStatus)}
                <div>
                  <p className="font-medium">
                    Status Geral
                  </p>
                  <p className="text-sm text-gray-600">
                    Última verificação: {new Date(health.timestamp).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
              <Badge className={getStatusColor(health.buildStatus)}>
                {health.buildStatus === 'healthy' ? 'Saudável' : 
                 health.buildStatus === 'issues' ? 'Com Issues' : 'Erro'}
              </Badge>
            </div>

            {/* Resumo */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{health.totalIssues}</p>
                <p className="text-sm text-gray-600">Issues Encontrados</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {health.buildStatus === 'healthy' ? '100%' : '0%'}
                </p>
                <p className="text-sm text-gray-600">Sistema OK</p>
              </div>
            </div>

            {/* Detalhes */}
            {showDetails && health.totalIssues > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Issues Detectados
                </h4>
                
                <div className="space-y-2">
                  {health.issues.map((issue, index) => (
                    <div key={index} className="p-3 bg-red-50 rounded-lg text-sm">
                      <p className="text-red-800">{issue}</p>
                    </div>
                  ))}
                </div>

                {health.recommendations.length > 0 && (
                  <>
                    <h4 className="font-medium flex items-center gap-2 mt-4">
                      <Package className="w-4 h-4" />
                      Recomendações
                    </h4>
                    
                    <div className="space-y-2">
                      {health.recommendations.map((rec, index) => (
                        <div key={index} className="p-3 bg-blue-50 rounded-lg text-sm">
                          <p className="text-blue-800">{rec}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}