/**
 * 🧩 Componente: TestRunner
 * 
 * Interface para executar testes QA
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Play, Square, RotateCcw, Download, 
  CheckCircle, XCircle, Clock, AlertTriangle 
} from 'lucide-react';
import { useQATestRunner } from './hooks/useQATestRunner';

export default function TestRunner({ testContext = {} }) {
  const {
    testResults,
    isRunning,
    currentTest,
    testProgress,
    error,
    runTest,
    runAllTests,
    cancelTest,
    clearResults,
    TEST_TYPES,
    TEST_STEPS
  } = useQATestRunner();

  const handleRunTest = async (testType) => {
    try {
      await runTest(testType, testContext);
    } catch (error) {
      console.error('Erro ao executar teste:', error);
    }
  };

  const handleRunAllTests = async () => {
    try {
      await runAllTests(testContext);
    } catch (error) {
      console.error('Erro ao executar todos os testes:', error);
    }
  };

  const getTestStatus = (testType) => {
    const result = testResults[testType];
    if (!result) return 'pending';
    
    const hasErrors = result.steps?.some(step => step.status === 'error');
    return hasErrors ? 'error' : 'success';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running':
        return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      success: 'bg-green-100 text-green-800',
      error: 'bg-red-100 text-red-800',
      running: 'bg-blue-100 text-blue-800',
      pending: 'bg-gray-100 text-gray-800'
    };

    const labels = {
      success: 'Sucesso',
      error: 'Erro',
      running: 'Executando',
      pending: 'Pendente'
    };

    return (
      <Badge className={variants[status]}>
        {labels[status]}
      </Badge>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="w-5 h-5" />
          Executor de Testes QA
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Controles principais */}
        <div className="flex gap-2 flex-wrap">
          <Button 
            onClick={handleRunAllTests}
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            Executar Todos
          </Button>
          
          {isRunning && (
            <Button 
              onClick={cancelTest}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <Square className="w-4 h-4" />
              Cancelar
            </Button>
          )}
          
          <Button 
            onClick={clearResults}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Limpar
          </Button>
        </div>

        {/* Progresso atual */}
        {isRunning && currentTest && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Executando: {currentTest}
              </span>
              <span className="text-sm text-gray-500">
                {testProgress.current}/{testProgress.total}
              </span>
            </div>
            <Progress 
              value={(testProgress.current / testProgress.total) * 100} 
              className="w-full"
            />
          </div>
        )}

        {/* Erro */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {/* Lista de testes */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Testes Disponíveis</h3>
          
          {Object.entries(TEST_TYPES).map(([key, testType]) => {
            const status = getTestStatus(testType);
            const result = testResults[testType];
            const steps = TEST_STEPS[testType];
            
            return (
              <div 
                key={testType}
                className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(status)}
                    <span className="font-medium capitalize">
                      {testType.replace('_', ' ')}
                    </span>
                    {getStatusBadge(status)}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleRunTest(testType)}
                      disabled={isRunning}
                    >
                      Executar
                    </Button>
                    
                    {result && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {/* Implementar visualização de resultados */}}
                      >
                        Ver Resultados
                      </Button>
                    )}
                  </div>
                </div>

                {/* Steps do teste */}
                <div className="space-y-1">
                  {steps.map((step, index) => {
                    const stepResult = result?.steps?.[index];
                    const stepStatus = stepResult?.status || 'pending';
                    
                    return (
                      <div 
                        key={index}
                        className="flex items-center gap-2 text-sm text-gray-600"
                      >
                        <div className="w-4 h-4 flex items-center justify-center">
                          {stepStatus === 'success' && <CheckCircle className="w-3 h-3 text-green-500" />}
                          {stepStatus === 'error' && <XCircle className="w-3 h-3 text-red-500" />}
                          {stepStatus === 'pending' && <div className="w-2 h-2 bg-gray-300 rounded-full" />}
                        </div>
                        <span>{step}</span>
                        {stepResult?.duration && (
                          <span className="text-xs text-gray-400">
                            ({Math.round(stepResult.duration)}ms)
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Resumo do resultado */}
                {result && (
                  <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                    <div className="flex justify-between">
                      <span>Total: {result.summary?.total || 0}</span>
                      <span>Sucessos: {result.summary?.successful || 0}</span>
                      <span>Falhas: {result.summary?.failed || 0}</span>
                      <span>Taxa: {Math.round(result.summary?.successRate || 0)}%</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

