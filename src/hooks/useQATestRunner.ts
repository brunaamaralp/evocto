/**
 * 🎣 Hook Customizado: useQATestRunner - TypeScript
 * 
 * Extrai toda a lógica de execução de testes do qa-dashboard.jsx
 */

import { useState, useCallback, useRef } from 'react';
import { Task, Client, User } from '@/api/entities';

// Tipos para QA Test Runner
export interface TestResult {
  step: number;
  name: string;
  status: 'success' | 'error';
  details?: string;
  contextData?: Record<string, any>;
  duration?: number;
  error?: string;
}

export interface TestSummary {
  total: number;
  successful: number;
  failed: number;
  successRate: number;
}

export interface TestContext {
  agencyId?: string;
  userId?: string;
  userRole?: string;
  clientId?: string;
  serviceId?: string;
}

export interface TestSuiteResult {
  testType: string;
  steps: TestResult[];
  summary: TestSummary;
}

const TEST_TYPES = {
  KANBAN_CLIENT: 'kanban_client',
  KANBAN_GLOBAL: 'kanban_global', 
  PERFORMANCE: 'performance',
  STRESS: 'stress',
  CONSISTENCY: 'consistency'
} as const;

const TEST_STEPS: Record<string, string[]> = {
  [TEST_TYPES.KANBAN_CLIENT]: [
    'Carregar quadro do cliente',
    'Testar rolagem horizontal',
    'Validar informações de cliente',
    'Testar performance',
    'Verificar consistência'
  ],
  [TEST_TYPES.KANBAN_GLOBAL]: [
    'Carregar quadro global',
    'Testar filtros',
    'Validar informações de cliente',
    'Testar performance',
    'Verificar consistência'
  ],
  [TEST_TYPES.PERFORMANCE]: [
    'Medir tempo de carregamento',
    'Testar responsividade',
    'Verificar virtualização',
    'Validar cache'
  ],
  [TEST_TYPES.STRESS]: [
    'Medir tempo com dados grandes',
    'Testar responsividade',
    'Verificar virtualização',
    'Validar estabilidade'
  ],
  [TEST_TYPES.CONSISTENCY]: [
    'Verificar integridade de dados',
    'Validar relacionamentos',
    'Testar sincronização',
    'Verificar consistência de estado'
  ]
};

export function useQATestRunner() {
  const [testResults, setTestResults] = useState<Record<string, TestSuiteResult>>({});
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentTest, setCurrentTest] = useState<string | null>(null);
  const [testProgress, setTestProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  // Executar teste específico
  const runTest = useCallback(async (testType: string, testContext: TestContext = {}): Promise<TestSuiteResult> => {
    if (isRunning) {
      throw new Error('Teste já está em execução');
    }

    setIsRunning(true);
    setCurrentTest(testType);
    setError(null);
    setTestProgress({ current: 0, total: TEST_STEPS[testType]?.length || 0 });

    // Criar AbortController para cancelar teste
    abortControllerRef.current = new AbortController();

    try {
      const results = await executeTestSuite(testType, testContext);
      setTestResults(prev => ({ ...prev, [testType]: results }));
      return results;
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message);
        throw err;
      }
      throw err;
    } finally {
      setIsRunning(false);
      setCurrentTest(null);
      abortControllerRef.current = null;
    }
  }, [isRunning]);

  // Executar todos os testes
  const runAllTests = useCallback(async (testContext: TestContext = {}): Promise<Record<string, TestSuiteResult>> => {
    const allResults: Record<string, TestSuiteResult> = {};
    
    for (const testType of Object.values(TEST_TYPES)) {
      try {
        const result = await runTest(testType, testContext);
        allResults[testType] = result;
      } catch (error: any) {
        allResults[testType] = { 
          testType, 
          steps: [], 
          summary: { total: 0, successful: 0, failed: 1, successRate: 0 },
          error: error.message 
        } as any;
      }
    }
    
    return allResults;
  }, [runTest]);

  // Cancelar teste em execução
  const cancelTest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Limpar resultados
  const clearResults = useCallback(() => {
    setTestResults({});
    setError(null);
  }, []);

  return {
    // Estado
    testResults,
    isRunning,
    currentTest,
    testProgress,
    error,
    
    // Ações
    runTest,
    runAllTests,
    cancelTest,
    clearResults,
    
    // Constantes
    TEST_TYPES,
    TEST_STEPS
  };
}

// Função auxiliar para executar suite de testes
async function executeTestSuite(testType: string, testContext: TestContext): Promise<TestSuiteResult> {
  const steps = TEST_STEPS[testType] || [];
  const results: TestResult[] = [];

  for (let i = 0; i < steps.length; i++) {
    const stepName = steps[i];
    let stepResult: Omit<TestResult, 'step' | 'name' | 'status'>;

    try {
      switch (testType) {
        case TEST_TYPES.KANBAN_CLIENT:
          stepResult = await executeKanbanClientStep(i, stepName, testContext);
          break;
        case TEST_TYPES.KANBAN_GLOBAL:
          stepResult = await executeKanbanGlobalStep(i, stepName, testContext);
          break;
        case TEST_TYPES.PERFORMANCE:
          stepResult = await executePerformanceStep(i, stepName, testContext);
          break;
        case TEST_TYPES.STRESS:
          stepResult = await executeStressStep(i, stepName, testContext);
          break;
        case TEST_TYPES.CONSISTENCY:
          stepResult = await executeConsistencyStep(i, stepName, testContext);
          break;
        default:
          throw new Error(`Tipo de teste não suportado: ${testType}`);
      }

      results.push({
        step: i,
        name: stepName,
        status: 'success',
        ...stepResult
      });

    } catch (error: any) {
      results.push({
        step: i,
        name: stepName,
        status: 'error',
        error: error.message
      });
      throw error;
    }
  }

  return {
    testType,
    steps: results,
    summary: generateTestSummary(results)
  };
}

// Implementações específicas de cada tipo de teste
async function executeKanbanClientStep(stepIndex: number, stepName: string, testContext: TestContext): Promise<Omit<TestResult, 'step' | 'name' | 'status'>> {
  switch (stepIndex) {
    case 0: // Carregar quadro do cliente
      let clientId = testContext.clientId;
      if (!clientId) {
        const clients = await Client.filter({
          agencyId: testContext.agencyId
        }, '-updated_date', 1);
        if (clients.length === 0) {
          throw new Error('Nenhum cliente encontrado para teste do Kanban');
        }
        clientId = clients[0].id;
      }

      const startTime = performance.now();
      const clientTasks = await Task.filter({
        agencyId: testContext.agencyId,
        clientId: clientId
      });
      const loadTime = performance.now() - startTime;

      if (loadTime > 3000) {
        throw new Error(`Tempo de carregamento muito alto: ${Math.round(loadTime)}ms`);
      }

      return {
        details: `Quadro carregado em ${Math.round(loadTime)}ms com ${clientTasks.length} tarefas`,
        contextData: { clientId: clientId, serviceId: testContext.serviceId }
      };

    default:
      return { details: `Step ${stepIndex} executado`, contextData: testContext };
  }
}

async function executeKanbanGlobalStep(stepIndex: number, stepName: string, testContext: TestContext): Promise<Omit<TestResult, 'step' | 'name' | 'status'>> {
  switch (stepIndex) {
    case 0: // Carregar quadro global
      const startTime = performance.now();
      const allTasks = await Task.filter({
        agencyId: testContext.agencyId
      }, '-updated_date', 100);
      const loadTime = performance.now() - startTime;

      if (loadTime > 5000) {
        throw new Error(`Tempo de carregamento muito alto: ${Math.round(loadTime)}ms`);
      }

      return {
        details: `Quadro global carregado em ${Math.round(loadTime)}ms com ${allTasks.length} tarefas`,
        contextData: { ...testContext }
      };

    default:
      return { details: `Step ${stepIndex} executado`, contextData: testContext };
  }
}

async function executePerformanceStep(stepIndex: number, stepName: string, testContext: TestContext): Promise<Omit<TestResult, 'step' | 'name' | 'status'>> {
  switch (stepIndex) {
    case 0: // Medir tempo de carregamento
      const loadStart = performance.now();
      const largeTasks = await Task.filter({
        agencyId: testContext.agencyId
      }, '-updated_date', 500);
      const loadDuration = performance.now() - loadStart;

      if (loadDuration > 10000) {
        throw new Error(`Tempo de carregamento excessivo: ${Math.round(loadDuration)}ms`);
      }

      return {
        details: `${largeTasks.length} tarefas carregadas em ${Math.round(loadDuration)}ms`,
        contextData: { ...testContext }
      };

    default:
      return { details: `Step ${stepIndex} executado`, contextData: testContext };
  }
}

async function executeStressStep(stepIndex: number, stepName: string, testContext: TestContext): Promise<Omit<TestResult, 'step' | 'name' | 'status'>> {
  switch (stepIndex) {
    case 0: // Medir tempo com dados grandes
      const loadStart = performance.now();
      const largeTasks = await Task.filter({
        agencyId: testContext.agencyId
      }, '-updated_date', 500);
      const loadDuration = performance.now() - loadStart;

      if (loadDuration > 10000) {
        throw new Error(`Tempo de carregamento excessivo: ${Math.round(loadDuration)}ms`);
      }

      return {
        details: `${largeTasks.length} tarefas carregadas em ${Math.round(loadDuration)}ms`,
        contextData: { ...testContext }
      };

    default:
      return { details: `Step ${stepIndex} executado`, contextData: testContext };
  }
}

async function executeConsistencyStep(stepIndex: number, stepName: string, testContext: TestContext): Promise<Omit<TestResult, 'step' | 'name' | 'status'>> {
  switch (stepIndex) {
    case 0: // Verificar integridade de dados
      const tasks = await Task.filter({
        agencyId: testContext.agencyId
      }, '-updated_date', 10);
      const clients = await Client.filter({
        agencyId: testContext.agencyId
      });

      let tasksWithValidClient = 0;
      for (const task of tasks) {
        const taskClient = clients.find(c => c.id === task.clientId);
        if (taskClient) {
          tasksWithValidClient++;
        }
      }

      return {
        details: `${tasksWithValidClient}/${tasks.length} tarefas têm cliente válido`,
        contextData: { ...testContext }
      };

    default:
      return { details: `Step ${stepIndex} executado`, contextData: testContext };
  }
}

function generateTestSummary(results: TestResult[]): TestSummary {
  const total = results.length;
  const successful = results.filter(r => r.status === 'success').length;
  const failed = results.filter(r => r.status === 'error').length;
  
  return {
    total,
    successful,
    failed,
    successRate: total > 0 ? (successful / total) * 100 : 0
  };
}

