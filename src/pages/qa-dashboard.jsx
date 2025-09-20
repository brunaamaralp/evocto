/**
 * 🧪 QA Dashboard - Versão Refatorada
 * 
 * Dashboard para execução de testes de qualidade e performance
 * Refatorado para usar componentes menores e hooks customizados
 */

import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  TestTube,
  Database,
  Activity,
  AlertTriangle,
  FileText,
  Zap,
  Users,
  Building2,
  PlayCircle,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';

// Componentes refatorados
import TestRunner from '@/components/qa/TestRunner';
import PerformanceMetrics from '@/components/qa/PerformanceMetrics';

export default function QADashboard() {
  const { user } = useSession();
  const [activeTab, setActiveTab] = useState('tests');
  const [testContext, setTestContext] = useState({});
  const [systemHealth, setSystemHealth] = useState('healthy');
  const [lastRun, setLastRun] = useState(null);

  // Inicializar contexto de teste
  useEffect(() => {
    if (user) {
      setTestContext({
        agencyId: user.agencyId,
        userId: user.id,
        userRole: user.role
      });
    }
  }, [user]);

  // Verificar saúde do sistema
  useEffect(() => {
    const checkSystemHealth = async () => {
      try {
        // Simular verificação de saúde do sistema
        const healthChecks = [
          { name: 'Database', status: 'healthy' },
          { name: 'API', status: 'healthy' },
          { name: 'Auth', status: 'healthy' },
          { name: 'Storage', status: 'healthy' }
        ];

        const unhealthyServices = healthChecks.filter(check => check.status !== 'healthy');
        setSystemHealth(unhealthyServices.length === 0 ? 'healthy' : 'degraded');
      } catch (error) {
        setSystemHealth('unhealthy');
        console.error('Erro ao verificar saúde do sistema:', error);
      }
    };

    checkSystemHealth();
    const interval = setInterval(checkSystemHealth, 30000); // Verificar a cada 30s
    return () => clearInterval(interval);
  }, []);

  // Executar todos os testes
  const runAllTests = async () => {
    try {
      setLastRun(new Date());
      toast.success('Execução de testes iniciada');
    } catch (error) {
      toast.error('Erro ao executar testes');
      console.error('Erro:', error);
    }
  };

  // Obter status do sistema
  const getSystemStatusColor = () => {
    switch (systemHealth) {
      case 'healthy': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'unhealthy': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getSystemStatusIcon = () => {
    switch (systemHealth) {
      case 'healthy': return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'degraded': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'unhealthy': return <XCircle className="w-5 h-5 text-red-600" />;
      default: return <Activity className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard de QA</h1>
            <p className="text-gray-600 mt-1">
              Testes automatizados e monitoramento de qualidade
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {getSystemStatusIcon()}
              <span className={`text-sm font-medium ${getSystemStatusColor()}`}>
                Sistema {systemHealth === 'healthy' ? 'Saudável' : 
                        systemHealth === 'degraded' ? 'Degradado' : 'Instável'}
              </span>
            </div>
            <Button onClick={runAllTests} className="bg-blue-600 hover:bg-blue-700">
              <PlayCircle className="w-4 h-4 mr-2" />
              Executar Todos os Testes
            </Button>
          </div>
        </div>

        {/* Alertas do Sistema */}
        {systemHealth !== 'healthy' && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {systemHealth === 'degraded' 
                ? 'Sistema funcionando com limitações. Alguns testes podem falhar.'
                : 'Sistema instável. Recomendamos não executar testes até a resolução dos problemas.'
              }
            </AlertDescription>
          </Alert>
        )}

        {/* Cards de Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Testes Executados</CardTitle>
              <TestTube className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                +0% desde a última execução
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0%</div>
              <p className="text-xs text-muted-foreground">
                Meta: 95%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Performance</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">N/A</div>
              <p className="text-xs text-muted-foreground">
                Tempo médio de resposta
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Última Execução</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {lastRun ? lastRun.toLocaleTimeString() : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                {lastRun ? lastRun.toLocaleDateString() : 'Nunca executado'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Principais */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="tests">Testes</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="coverage">Cobertura</TabsTrigger>
            <TabsTrigger value="reports">Relatórios</TabsTrigger>
          </TabsList>

          <TabsContent value="tests" className="space-y-6">
            <TestRunner context={testContext} />
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <PerformanceMetrics />
          </TabsContent>

          <TabsContent value="coverage" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Cobertura de Testes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Análise de cobertura em desenvolvimento</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Relatórios de Teste</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Relatórios detalhados em desenvolvimento</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}




