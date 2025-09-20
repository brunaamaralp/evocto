import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Play, 
  RefreshCw,
  Bug 
} from 'lucide-react';

// Exemplos de teste para cada endpoint
const API_TEST_EXAMPLES = [
  {
    endpoint: 'generatePublicBriefingToken',
    title: 'Gerar Token de Briefing',
    examples: [
      {
        name: 'Token válido',
        data: { clientId: '68c18331e1f40bf00051f69d', expiresInHours: 24 },
        expectedStatus: 200,
        expectedType: 'success'
      },
      {
        name: 'ClientId inválido',
        data: { clientId: '', expiresInHours: 24 },
        expectedStatus: 400,
        expectedType: 'ValidationError'
      },
      {
        name: 'Sem autenticação',
        data: { clientId: '68c18331e1f40bf00051f69d' },
        expectedStatus: 401,
        expectedType: 'AuthenticationError',
        mockAuth: false
      }
    ]
  },
  {
    endpoint: 'validatePublicBriefingToken',
    title: 'Validar Token de Briefing',
    examples: [
      {
        name: 'Token válido',
        data: { token: 'valid_token_123' },
        expectedStatus: 200,
        expectedType: 'success'
      },
      {
        name: 'Token não encontrado',
        data: { token: 'invalid_token_xyz' },
        expectedStatus: 404,
        expectedType: 'NotFoundError'
      },
      {
        name: 'Token expirado',
        data: { token: 'expired_token_456' },
        expectedStatus: 410,
        expectedType: 'ExpiredError'
      }
    ]
  },
  {
    endpoint: 'calculateKPIs',
    title: 'Calcular KPIs Financeiros',
    examples: [
      {
        name: 'Cálculo por clientId',
        data: { clientId: '68c18331e1f40bf00051f69d', forceRecalculate: true },
        expectedStatus: 200,
        expectedType: 'success'
      },
      {
        name: 'KPI não encontrado',
        data: { kpiIds: ['non_existing_kpi'] },
        expectedStatus: 404,
        expectedType: 'NotFoundError'
      },
      {
        name: 'Parâmetros inválidos',
        data: {},
        expectedStatus: 400,
        expectedType: 'ValidationError'
      }
    ]
  }
];

export default function SPATestDashboard() {
  const [testResults, setTestResults] = useState({});
  const [runningTests, setRunningTests] = useState(new Set());

  const executeTest = async (endpoint, example) => {
    const testKey = `${endpoint}_${example.name}`;
    setRunningTests(prev => new Set([...prev, testKey]));

    try {
      // Import da função dinamicamente
      const { [endpoint]: testFunction } = await import(`@/api/functions/${endpoint}.js`);
      
      let response;
      try {
        response = await testFunction(example.data);
      } catch (error) {
        // Capturar erros estruturados do ErrorHandler
        response = {
          success: false,
          status: error.status || 500,
          error: {
            type: error.type || 'InternalError',
            message: error.message,
            request_id: error.request_id
          }
        };
      }

      // Analisar resultado
      const result = {
        success: response.success || false,
        status: response.status || (response.success ? 200 : 500),
        errorType: response.error?.type,
        message: response.error?.message || response.message,
        requestId: response.error?.request_id,
        passed: false,
        timestamp: new Date().toISOString()
      };

      // Verificar se resultado atende expectativa
      if (example.expectedStatus === result.status) {
        if (example.expectedType === 'success' && result.success) {
          result.passed = true;
        } else if (example.expectedType === result.errorType) {
          result.passed = true;
        }
      }

      setTestResults(prev => ({
        ...prev,
        [testKey]: result
      }));

    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [testKey]: {
          success: false,
          status: 500,
          errorType: 'TestError',
          message: error.message,
          passed: false,
          timestamp: new Date().toISOString()
        }
      }));
    }

    setRunningTests(prev => {
      const newSet = new Set(prev);
      newSet.delete(testKey);
      return newSet;
    });
  };

  const runAllTests = async () => {
    for (const { endpoint, examples } of API_TEST_EXAMPLES) {
      for (const example of examples) {
        await executeTest(endpoint, example);
        // Pequeno delay para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  };

  const getStatusIcon = (result) => {
    if (!result) return <RefreshCw className="w-4 h-4 text-gray-400" />;
    
    if (result.passed) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    } else {
      return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusBadge = (result) => {
    if (!result) return <Badge variant="outline">Não testado</Badge>;
    
    const variant = result.passed ? 'default' : 'destructive';
    const color = result.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
    
    return (
      <Badge variant={variant} className={color}>
        {result.status} - {result.errorType || 'Success'}
      </Badge>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bug className="w-6 h-6" />
          API Error Handler - Test Dashboard
        </h1>
        <Button onClick={runAllTests} className="flex items-center gap-2">
          <Play className="w-4 h-4" />
          Executar Todos os Testes
        </Button>
      </div>

      <Alert>
        <AlertTriangle className="w-4 h-4" />
        <AlertDescription>
          Este dashboard testa o comportamento do Error Handler para diferentes cenários de erro.
          Cada teste verifica se os códigos de status HTTP e tipos de erro estão corretos.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6">
        {API_TEST_EXAMPLES.map(({ endpoint, title, examples }) => (
          <Card key={endpoint}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {title}
                <Badge variant="outline">{endpoint}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {examples.map((example) => {
                  const testKey = `${endpoint}_${example.name}`;
                  const result = testResults[testKey];
                  const isRunning = runningTests.has(testKey);

                  return (
                    <div 
                      key={testKey}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getStatusIcon(result)}
                          <h4 className="font-medium">{example.name}</h4>
                          {getStatusBadge(result)}
                        </div>
                        
                        <div className="text-sm text-gray-600 space-y-1">
                          <p><strong>Entrada:</strong> {JSON.stringify(example.data)}</p>
                          <p><strong>Esperado:</strong> {example.expectedStatus} - {example.expectedType}</p>
                          {result && (
                            <p><strong>Resultado:</strong> {result.message} (ID: {result.requestId})</p>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => executeTest(endpoint, example)}
                        disabled={isRunning}
                        className="ml-4"
                      >
                        {isRunning ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                        {isRunning ? 'Testando...' : 'Testar'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Resumo dos Resultados */}
      {Object.keys(testResults).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>📊 Resumo dos Testes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-700">
                  {Object.values(testResults).filter(r => r.passed).length}
                </div>
                <div className="text-sm text-green-600">Testes Passou</div>
              </div>
              
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-700">
                  {Object.values(testResults).filter(r => !r.passed).length}
                </div>
                <div className="text-sm text-red-600">Testes Falharam</div>
              </div>
              
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-700">
                  {Object.values(testResults).length}
                </div>
                <div className="text-sm text-blue-600">Total Executados</div>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-700">
                  {Math.round(
                    (Object.values(testResults).filter(r => r.passed).length / 
                     Object.values(testResults).length) * 100
                  )}%
                </div>
                <div className="text-sm text-gray-600">Taxa Sucesso</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}