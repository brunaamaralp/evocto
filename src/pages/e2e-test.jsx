import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Upload,
  FileText,
  Users,
  Settings
} from 'lucide-react';
import { useSession } from '@/components/auth/SessionManager';
import { e2eSmokeTest } from '@/api/functions';
import { runE2EScenario } from '@/api/functions';
import { runApprovalE2E } from '@/api/functions';
import { createIngestEnvelope } from '@/api/functions';
import { processIngestEnvelope } from '@/api/functions';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function E2ETestPage() {
  const { user } = useSession();
  const [testResults, setTestResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState('');
  const [progress, setProgress] = useState(0);

  const testSuites = [
    {
      id: 'smoke_test',
      name: 'Smoke Test Geral',
      description: 'Testa componentes básicos do sistema',
      icon: <Settings className="w-5 h-5" />,
      color: 'blue'
    },
    {
      id: 'upload_flow',
      name: 'Fluxo de Upload',
      description: 'Testa upload → processamento → revisão',
      icon: <Upload className="w-5 h-5" />,
      color: 'green'
    },
    {
      id: 'approval_flow',
      name: 'Fluxo de Aprovação',
      description: 'Testa criação e processamento de aprovações',
      icon: <FileText className="w-5 h-5" />,
      color: 'purple'
    },
    {
      id: 'full_scenario',
      name: 'Cenário Completo',
      description: 'Testa ciclo completo de cliente → serviço → plano',
      icon: <Users className="w-5 h-5" />,
      color: 'orange'
    }
  ];

  const runSmokeTest = async () => {
    setCurrentTest('Executando smoke test...');
    setProgress(25);
    
    try {
      const result = await e2eSmokeTest();
      return {
        name: 'Smoke Test',
        success: result.data.success,
        duration: result.data.duration || 'N/A',
        details: result.data.checks || [],
        summary: `${result.data.checks?.filter(c => c.status === 'ok').length || 0} componentes OK`
      };
    } catch (error) {
      return {
        name: 'Smoke Test',
        success: false,
        error: error.message,
        summary: 'Falha na execução'
      };
    }
  };

  const runUploadFlow = async () => {
    setCurrentTest('Testando fluxo de upload...');
    setProgress(50);

    try {
      // Simular upload de arquivo CSV de clientes
      const csvContent = `nome,email,cnpj,setor
Empresa Teste E2E,teste@e2e.com,12345678000199,Tecnologia
Cliente Demo,demo@cliente.com,98765432000188,Varejo`;
      
      const file = new File([csvContent], 'clientes-teste.csv', { type: 'text/csv' });
      const formData = new FormData();
      formData.append('file', file);

      // 1. Criar envelope
      const envelopeResult = await createIngestEnvelope(formData);
      if (!envelopeResult.data.success) {
        throw new Error('Falha ao criar envelope');
      }

      // 2. Processar envelope
      const processResult = await processIngestEnvelope({
        envelopeId: envelopeResult.data.envelope_database_id,
        targetEntity: 'Client'
      });

      return {
        name: 'Fluxo de Upload',
        success: processResult.data.success,
        details: {
          envelope_id: envelopeResult.data.envelope_id,
          records_extracted: processResult.data.extraction_results?.extracted_records_count || 0,
          quality_score: processResult.data.validation_results?.data_quality_score || 0
        },
        summary: `${processResult.data.extraction_results?.extracted_records_count || 0} registros extraídos`
      };
    } catch (error) {
      return {
        name: 'Fluxo de Upload',
        success: false,
        error: error.message,
        summary: 'Falha no upload/processamento'
      };
    }
  };

  const runApprovalFlowTest = async () => {
    setCurrentTest('Testando fluxo de aprovação...');
    setProgress(75);

    try {
      const result = await runApprovalE2E();
      return {
        name: 'Fluxo de Aprovação',
        success: result.data.success,
        details: result.data.approval || {},
        summary: `Aprovação ${result.data.cyclePlan?.status || 'processada'}`
      };
    } catch (error) {
      return {
        name: 'Fluxo de Aprovação',
        success: false,
        error: error.message,
        summary: 'Falha na aprovação'
      };
    }
  };

  const runFullScenario = async () => {
    setCurrentTest('Executando cenário completo...');
    setProgress(90);

    try {
      const result = await runE2EScenario();
      return {
        name: 'Cenário Completo',
        success: result.data.success,
        details: {
          client: result.data.client,
          service: result.data.service,
          tasks: result.data.tasks
        },
        summary: `${result.data.tasks?.createdNow || 0} tarefas criadas`
      };
    } catch (error) {
      return {
        name: 'Cenário Completo',
        success: false,
        error: error.message,
        summary: 'Falha no cenário'
      };
    }
  };

  const runAllTests = async () => {
    if (isRunning) return;

    setIsRunning(true);
    setTestResults([]);
    setProgress(0);

    const tests = [
      runSmokeTest,
      runUploadFlow,
      runApprovalFlowTest,
      runFullScenario
    ];

    const results = [];
    for (let i = 0; i < tests.length; i++) {
      try {
        const result = await tests[i]();
        results.push(result);
        setTestResults([...results]);
      } catch (error) {
        results.push({
          name: `Teste ${i + 1}`,
          success: false,
          error: error.message,
          summary: 'Erro inesperado'
        });
      }
    }

    setProgress(100);
    setCurrentTest('Testes concluídos');
    setIsRunning(false);
  };

  const runSingleTest = async (testId) => {
    if (isRunning) return;

    setIsRunning(true);
    setTestResults([]);
    setProgress(0);

    let result;
    switch (testId) {
      case 'smoke_test':
        result = await runSmokeTest();
        break;
      case 'upload_flow':
        result = await runUploadFlow();
        break;
      case 'approval_flow':
        result = await runApprovalFlowTest();
        break;
      case 'full_scenario':
        result = await runFullScenario();
        break;
      default:
        result = { name: 'Teste', success: false, error: 'Teste não encontrado' };
    }

    setTestResults([result]);
    setProgress(100);
    setCurrentTest('Teste concluído');
    setIsRunning(false);
  };

  const getStatusIcon = (success) => {
    if (success) return <CheckCircle className="w-5 h-5 text-green-600" />;
    return <XCircle className="w-5 h-5 text-red-600" />;
  };

  const getStatusBadge = (success) => {
    if (success) return <Badge className="bg-green-100 text-green-800">Passou</Badge>;
    return <Badge className="bg-red-100 text-red-800">Falhou</Badge>;
  };

  return (
    <div className="container-page py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Testes E2E</h1>
          <p className="text-gray-600 mt-1">
            Validação do fluxo completo Upload → Mapeamento → Revisão
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={runAllTests}
            disabled={isRunning}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Play className="w-4 h-4 mr-2" />
            {isRunning ? 'Executando...' : 'Executar Todos'}
          </Button>
        </div>
      </div>

      {/* Progress */}
      {isRunning && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{currentTest}</span>
                <span className="text-sm text-gray-500">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Suites */}
      <div className="grid md:grid-cols-2 gap-4">
        {testSuites.map((suite) => (
          <Card key={suite.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className={`p-2 rounded-lg bg-${suite.color}-100`}>
                  {suite.icon}
                </div>
                {suite.name}
              </CardTitle>
              <p className="text-gray-600">{suite.description}</p>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => runSingleTest(suite.id)}
                disabled={isRunning}
                variant="outline"
                className="w-full"
              >
                <Play className="w-4 h-4 mr-2" />
                Executar Teste
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Results */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados dos Testes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {testResults.map((result, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result.success)}
                      <h3 className="font-medium">{result.name}</h3>
                    </div>
                    {getStatusBadge(result.success)}
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">{result.summary}</p>
                  
                  {result.duration && (
                    <p className="text-xs text-gray-500">Duração: {result.duration}</p>
                  )}

                  {result.error && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertDescription>{result.error}</AlertDescription>
                    </Alert>
                  )}

                  {result.details && (
                    <details className="mt-2">
                      <summary className="text-sm text-blue-600 cursor-pointer hover:underline">
                        Ver detalhes
                      </summary>
                      <pre className="text-xs bg-gray-50 p-2 mt-2 rounded overflow-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Links Úteis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <Button asChild variant="outline">
              <Link to={createPageUrl('upload-center')}>
                <Upload className="w-4 h-4 mr-2" />
                Central de Upload
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={createPageUrl('data-review')}>
                <FileText className="w-4 h-4 mr-2" />
                Revisão de Dados
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={createPageUrl('mapping-wizard')}>
                <Settings className="w-4 h-4 mr-2" />
                Assistente de Mapeamento
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}