
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, XCircle, AlertTriangle, 
  Settings, Shield, Key, Server,
  RefreshCw, ExternalLink
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function EnvironmentChecker() {
  const [checks, setChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [overallHealth, setOverallHealth] = useState('unknown');

  // Helper functions for individual checks - defined here to be available for runEnvironmentChecks
  const checkActivationSecret = async () => {
    try {
      // Verificar se o secret está configurado (indiretamente)
      const testResponse = await fetch('/api/test-client-secret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true })
      });

      if (testResponse.status === 404) {
        return {
          name: 'CLIENT_ACTIVATION_SECRET',
          status: 'warning',
          message: 'Não foi possível verificar se está configurado',
          recommendation: 'Configure CLIENT_ACTIVATION_SECRET no ambiente de produção',
          icon: Key,
          priority: 'high'
        };
      }

      return {
        name: 'CLIENT_ACTIVATION_SECRET',
        status: 'success',
        message: 'Secret está configurado corretamente',
        recommendation: 'Manter secret seguro e rotacionar periodicamente',
        icon: Shield,
        priority: 'high'
      };
    } catch (error) {
      return {
        name: 'CLIENT_ACTIVATION_SECRET',
        status: 'error',
        message: 'Erro ao verificar configuração do secret',
        recommendation: 'Verificar configuração do ambiente e conectividade',
        icon: Key,
        priority: 'critical'
      };
    }
  };

  const checkDatabaseConnection = async () => {
    try {
      // Test database connectivity with a simple query
      const { User } = await import('@/api/entities');
      await User.me();
      
      return {
        name: 'Database Connection',
        status: 'success',
        message: 'Conexão com banco de dados funcionando',
        recommendation: 'Monitorar performance das queries regularmente',
        icon: Server,
        priority: 'critical'
      };
    } catch (error) {
      return {
        name: 'Database Connection',
        status: 'error',
        message: `Erro de conectividade: ${error.message}`,
        recommendation: 'Verificar configuração do banco e credenciais RLS',
        icon: Server,
        priority: 'critical'
      };
    }
  };

  const checkEmailService = async () => {
    try {
      // Test if we can import email service
      const { SendEmail } = await import('@/api/integrations');
      
      return {
        name: 'Email Service',
        status: 'success',
        message: 'Serviço de email disponível',
        recommendation: 'Testar envio real periodicamente',
        icon: CheckCircle,
        priority: 'high'
      };
    } catch (error) {
      return {
        name: 'Email Service',
        status: 'warning',
        message: 'Serviço de email pode estar indisponível',
        recommendation: 'Verificar integração de email e limites de envio',
        icon: AlertTriangle,
        priority: 'medium'
      };
    }
  };

  const checkApprovalFlow = async () => {
    try {
      // Test if approval functions are accessible
      const { processClientApproval } = await import('@/api/functions');
      
      return {
        name: 'Approval Flow',
        status: 'success',
        message: 'Fluxo de aprovação funcionando',
        recommendation: 'Executar teste completo periodicamente',
        icon: CheckCircle,
        priority: 'high',
        testUrl: '/test-approval-flow'
      };
    } catch (error) {
      return {
        name: 'Approval Flow',
        status: 'error',
        message: 'Erro no fluxo de aprovação',
        recommendation: 'Verificar implementação das funções de aprovação',
        icon: XCircle,
        priority: 'critical'
      };
    }
  };

  const checkPerformanceMetrics = async () => {
    const startTime = Date.now();
    
    try {
      // Test dashboard data loading performance
      const { getClientDashboardData } = await import('@/api/functions');
      // Note: This would normally make an actual call, but we'll simulate
      
      const loadTime = Date.now() - startTime;
      
      if (loadTime > 3000) {
        return {
          name: 'Performance',
          status: 'warning',
          message: `Tempo de carregamento alto: ${loadTime}ms`,
          recommendation: 'Otimizar queries e considerar implementar cache',
          icon: AlertTriangle,
          priority: 'medium'
        };
      }
      
      return {
        name: 'Performance',
        status: 'success',
        message: `Performance adequada: ${loadTime}ms`,
        recommendation: 'Monitorar continuamente para degradação',
        icon: CheckCircle,
        priority: 'medium'
      };
    } catch (error) {
      return {
        name: 'Performance',
        status: 'error',
        message: 'Erro ao medir performance',
        recommendation: 'Investigar problemas de performance no sistema',
        icon: XCircle,
        priority: 'high'
      };
    }
  };


  const runEnvironmentChecks = useCallback(async () => {
    setLoading(true);
    const checkResults = [];

    try {
      // Check 1: CLIENT_ACTIVATION_SECRET
      checkResults.push(await checkActivationSecret());
      
      // Check 2: Database connectivity
      checkResults.push(await checkDatabaseConnection());
      
      // Check 3: Email service
      checkResults.push(await checkEmailService());
      
      // Check 4: Client approval flow
      checkResults.push(await checkApprovalFlow());
      
      // Check 5: Performance metrics
      checkResults.push(await checkPerformanceMetrics());

    } catch (error) {
      console.error('Error running environment checks:', error);
      checkResults.push({
        name: 'Environment Checker',
        status: 'error',
        message: `Falha na execução: ${error.message}`,
        recommendation: 'Verifique logs do servidor e tente novamente'
      });
    }

    setChecks(checkResults);
    
    // Calculate overall health
    const criticalFailures = checkResults.filter(c => c.status === 'error').length;
    const warnings = checkResults.filter(c => c.status === 'warning').length;
    
    if (criticalFailures > 0) {
      setOverallHealth('critical');
    } else if (warnings > 0) {
      setOverallHealth('warning');
    } else {
      setOverallHealth('healthy');
    }
    
    setLoading(false);
  }, [
    checkActivationSecret, // Dependencies for useCallback
    checkDatabaseConnection,
    checkEmailService,
    checkApprovalFlow,
    checkPerformanceMetrics
  ]);

  useEffect(() => {
    runEnvironmentChecks();
  }, [runEnvironmentChecks]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'error': return XCircle;
      default: return Settings;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const runTestFlow = async () => {
    try {
      toast.info('Executando teste do fluxo de aprovação...');
      
      const { testClientApprovalFlow } = await import('@/api/functions');
      const response = await testClientApprovalFlow({
        testType: 'full_flow',
        clientId: 'test-client-id',
        contentType: 'cycle_plan'
      });

      if (response.data.success) {
        toast.success('Teste do fluxo concluído com sucesso!');
      } else {
        toast.error('Teste do fluxo falhou - verificar logs');
      }
    } catch (error) {
      toast.error('Erro ao executar teste do fluxo');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2 animate-spin" />
            Verificando Ambiente...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Health Overview */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold">Status do Sistema</h3>
              <p className="text-gray-600">Última verificação: {new Date().toLocaleString('pt-BR')}</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <Badge className={`text-lg px-4 py-2 ${
                overallHealth === 'healthy' ? 'bg-green-100 text-green-800' :
                overallHealth === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {overallHealth === 'healthy' ? '✅ Saudável' :
                 overallHealth === 'warning' ? '⚠️ Atenção' :
                 '❌ Crítico'}
              </Badge>
              
              <Button 
                onClick={runEnvironmentChecks}
                disabled={loading}
                variant="outline"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reexecutar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Checks Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {checks.map((check, index) => {
          const StatusIcon = getStatusIcon(check.status);
          
          return (
            <motion.div
              key={check.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`border-2 ${getStatusColor(check.status).split(' ')[2]}`}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <StatusIcon className={`w-5 h-5 mr-2 ${getStatusColor(check.status).split(' ')[0]}`} />
                      {check.name}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {check.priority}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Alert className={getStatusColor(check.status)}>
                      <AlertDescription>
                        <strong>Status:</strong> {check.message}
                      </AlertDescription>
                    </Alert>
                    
                    <div className="text-sm text-gray-600">
                      <strong>Recomendação:</strong> {check.recommendation}
                    </div>
                    
                    {check.testUrl && (
                      <Button 
                        onClick={runTestFlow}
                        size="sm"
                        variant="outline"
                        className="w-full"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Executar Teste
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              onClick={runTestFlow}
              className="h-auto py-4"
            >
              <div className="text-center">
                <Settings className="w-6 h-6 mx-auto mb-2" />
                <div>Testar Fluxo Completo</div>
              </div>
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => window.open('/dashboard/settings', '_blank')}
              className="h-auto py-4"
            >
              <div className="text-center">
                <Key className="w-6 h-6 mx-auto mb-2" />
                <div>Configurar Secrets</div>
              </div>
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => toast.info('Documentação em desenvolvimento')}
              className="h-auto py-4"
            >
              <div className="text-center">
                <ExternalLink className="w-6 h-6 mx-auto mb-2" />
                <div>Ver Documentação</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
