#!/usr/bin/env node

/**
 * Scripts de Teste Avançados - Fase 2
 * Testa funcionalidades avançadas de IA, automação e analytics
 */

import { advancedSystemConfig } from './config/AdvancedSystemConfig.js';
import { predictiveAnalytics } from '../ai/PredictiveAnalytics.js';
import { recommendationEngine } from '../ai/RecommendationEngine.js';
import { workflowEngine } from '../automation/WorkflowEngine.js';
import { benchmarkingSystem } from '../analytics/BenchmarkingSystem.js';

const testResults = [];

/**
 * Executa um teste
 */
async function runTest(name, testFunction) {
  console.log(`\n--- Executando Teste Avançado: ${name} ---`);
  try {
    await testFunction();
    console.log(`✅ Teste Passou: ${name}`);
    testResults.push({ name, status: 'PASSED' });
  } catch (error) {
    console.error(`❌ Teste Falhou: ${name}`);
    console.error(error);
    testResults.push({ name, status: 'FAILED', error: error.message });
  }
}

/**
 * Testa Análise Preditiva
 */
async function testPredictiveAnalytics() {
  // Teste 1: Verificar se modelos estão inicializados
  const stats = predictiveAnalytics.getAllStats();
  if (!stats || Object.keys(stats).length === 0) {
    throw new Error('Nenhum modelo de análise preditiva encontrado');
  }

  // Teste 2: Adicionar dados de treinamento
  const testData = {
    revenue: 100000,
    expenses: 75000,
    profit_margin: 25,
    cash_flow: 15000,
    debt_ratio: 0.3,
    current_ratio: 2.5,
    roi: 15,
    ebitda: 30000
  };

  predictiveAnalytics.addTrainingData('financial_kpis', testData);
  const trainingData = predictiveAnalytics.getTrainingData('financial_kpis');
  if (trainingData.length === 0) {
    throw new Error('Dados de treinamento não foram adicionados');
  }

  // Teste 3: Gerar predição
  const prediction = await predictiveAnalytics.generatePrediction('financial_kpis', testData);
  if (!prediction || !prediction.prediction) {
    throw new Error('Predição não foi gerada');
  }

  // Teste 4: Gerar forecast
  const forecast = await predictiveAnalytics.generateForecast('financial_kpis', testData, 12);
  if (!forecast || forecast.length !== 12) {
    throw new Error('Forecast não foi gerado corretamente');
  }

  // Teste 5: Gerar insights
  const insights = predictiveAnalytics.generateInsights('financial_kpis', [prediction]);
  if (!Array.isArray(insights)) {
    throw new Error('Insights não foram gerados');
  }

  console.log('✅ Análise Preditiva funcionando corretamente');
}

/**
 * Testa Engine de Recomendações
 */
async function testRecommendationEngine() {
  // Teste 1: Verificar se regras estão inicializadas
  const stats = recommendationEngine.getStats();
  if (!stats || stats.totalRules === 0) {
    throw new Error('Nenhuma regra de recomendação encontrada');
  }

  // Teste 2: Registrar interação
  recommendationEngine.recordInteraction('user123', 'item456', 4, { category: 'financial' });
  const interactions = recommendationEngine.interactions.get('user123');
  if (!interactions || interactions.length === 0) {
    throw new Error('Interação não foi registrada');
  }

  // Teste 3: Gerar recomendações
  const context = {
    profit_margin: 20,
    cash_flow: 10000,
    debt_ratio: 0.5,
    satisfaction_score: 4.2,
    response_time: 48,
    complaint_rate: 0.05
  };

  const recommendations = await recommendationEngine.generateRecommendations('user123', context);
  if (!recommendations || recommendations.length === 0) {
    throw new Error('Recomendações não foram geradas');
  }

  // Teste 4: Verificar personalização
  const personalizedRec = recommendations.find(rec => rec.personalized);
  if (!personalizedRec) {
    throw new Error('Recomendações não foram personalizadas');
  }

  // Teste 5: Verificar ordenação
  const sortedRecs = recommendations.sort((a, b) => {
    const scoreA = recommendationEngine.calculateRelevanceScore(a, context);
    const scoreB = recommendationEngine.calculateRelevanceScore(b, context);
    return scoreB - scoreA;
  });

  if (sortedRecs.length !== recommendations.length) {
    throw new Error('Recomendações não foram ordenadas corretamente');
  }

  console.log('✅ Engine de Recomendações funcionando corretamente');
}

/**
 * Testa Workflow Engine
 */
async function testWorkflowEngine() {
  // Teste 1: Verificar se workflows estão inicializados
  const workflows = workflowEngine.getAllWorkflows();
  if (!workflows || workflows.length === 0) {
    throw new Error('Nenhum workflow encontrado');
  }

  // Teste 2: Executar workflow
  const context = {
    value: 500,
    category: 'standard',
    risk_level: 'low',
    priority: 'normal',
    deadline: '7d',
    user_preference: 'weekly_reminders'
  };

  const execution = await workflowEngine.executeWorkflow('auto_approval', context);
  if (!execution || execution.status !== 'completed') {
    throw new Error('Workflow não foi executado com sucesso');
  }

  // Teste 3: Verificar ações executadas
  if (execution.executedActions.length === 0) {
    throw new Error('Nenhuma ação foi executada');
  }

  // Teste 4: Disparar evento
  workflowEngine.triggerEvent('item_created', { itemId: 'test123', value: 1000 });
  
  // Aguardar um pouco para o evento ser processado
  await new Promise(resolve => setTimeout(resolve, 100));

  // Teste 5: Verificar execuções
  const executions = workflowEngine.getAllExecutions();
  if (executions.length === 0) {
    throw new Error('Nenhuma execução foi registrada');
  }

  // Teste 6: Criar novo workflow
  const newWorkflowId = workflowEngine.createWorkflow({
    name: 'Test Workflow',
    description: 'Workflow de teste',
    status: 'active',
    triggers: ['test_event'],
    conditions: [],
    fallbackActions: ['test_action']
  });

  if (!newWorkflowId) {
    throw new Error('Novo workflow não foi criado');
  }

  console.log('✅ Workflow Engine funcionando corretamente');
}

/**
 * Testa Sistema de Benchmarking
 */
async function testBenchmarkingSystem() {
  // Teste 1: Verificar se padrões da indústria estão inicializados
  const stats = benchmarkingSystem.getStats();
  if (!stats || stats.industries.length === 0) {
    throw new Error('Nenhum padrão da indústria encontrado');
  }

  // Teste 2: Adicionar dados de cliente
  const clientData = {
    name: 'Test Client',
    industry: 'technology',
    size: 'medium',
    kpis: {
      revenue_growth: 25,
      profit_margin: 28,
      customer_satisfaction: 4.5,
      employee_turnover: 10,
      innovation_index: 85
    },
    metrics: {
      revenue: 1000000,
      employees: 50,
      projects: 15
    }
  };

  benchmarkingSystem.addClientData('client123', clientData);
  const client = benchmarkingSystem.clientData.get('client123');
  if (!client) {
    throw new Error('Dados do cliente não foram adicionados');
  }

  // Teste 3: Calcular benchmark
  const benchmark = benchmarkingSystem.getClientBenchmark('client123');
  if (!benchmark || !benchmark.kpis) {
    throw new Error('Benchmark não foi calculado');
  }

  // Teste 4: Verificar score geral
  if (benchmark.overallScore === undefined || benchmark.overallScore < 0 || benchmark.overallScore > 100) {
    throw new Error('Score geral inválido');
  }

  // Teste 5: Comparar clientes
  benchmarkingSystem.addClientData('client456', {
    ...clientData,
    name: 'Test Client 2',
    kpis: {
      revenue_growth: 15,
      profit_margin: 22,
      customer_satisfaction: 4.2,
      employee_turnover: 15,
      innovation_index: 75
    }
  });

  const comparison = benchmarkingSystem.compareClients(['client123', 'client456']);
  if (!comparison || !comparison.results) {
    throw new Error('Comparação não foi criada');
  }

  // Teste 6: Gerar relatório
  const report = benchmarkingSystem.generateReport('client123');
  if (!report || !report.summary) {
    throw new Error('Relatório não foi gerado');
  }

  console.log('✅ Sistema de Benchmarking funcionando corretamente');
}

/**
 * Testa Configuração Avançada
 */
async function testAdvancedSystemConfig() {
  // Teste 1: Verificar se configuração foi carregada
  const config = advancedSystemConfig.getConfig();
  if (!config || !config.ai || !config.automation || !config.analytics) {
    throw new Error('Configuração avançada não foi carregada');
  }

  // Teste 2: Verificar se IA está habilitada
  if (!config.ai.enabled) {
    throw new Error('IA não está habilitada na configuração');
  }

  // Teste 3: Verificar se automação está habilitada
  if (!config.automation.enabled) {
    throw new Error('Automação não está habilitada na configuração');
  }

  // Teste 4: Verificar se analytics está habilitada
  if (!config.analytics.enabled) {
    throw new Error('Analytics não está habilitada na configuração');
  }

  // Teste 5: Verificar se integrações estão habilitadas
  if (!config.integration.enabled) {
    throw new Error('Integrações não estão habilitadas na configuração');
  }

  // Teste 6: Verificar se performance está habilitada
  if (!config.performance.enabled) {
    throw new Error('Performance não está habilitada na configuração');
  }

  // Teste 7: Verificar estatísticas avançadas
  const advancedStats = advancedSystemConfig.getAdvancedStats();
  if (!advancedStats || !advancedStats.ai || !advancedStats.automation) {
    throw new Error('Estatísticas avançadas não estão sendo geradas');
  }

  // Teste 8: Validar configuração
  const validation = advancedSystemConfig.validateConfig();
  if (!validation.isValid) {
    throw new Error(`Configuração inválida: ${validation.errors.join(', ')}`);
  }

  console.log('✅ Configuração Avançada funcionando corretamente');
}

/**
 * Testa Integração entre Sistemas Avançados
 */
async function testAdvancedSystemIntegration() {
  // Teste 1: Verificar se todos os sistemas estão inicializados
  const advancedStats = advancedSystemConfig.getAdvancedStats();
  
  if (!advancedStats.ai.predictiveAnalytics.enabled) {
    throw new Error('Sistema de análise preditiva não está integrado');
  }
  
  if (!advancedStats.ai.recommendationEngine.enabled) {
    throw new Error('Sistema de recomendações não está integrado');
  }
  
  if (!advancedStats.automation.workflowEngine.enabled) {
    throw new Error('Sistema de workflows não está integrado');
  }
  
  if (!advancedStats.analytics.benchmarkingSystem.enabled) {
    throw new Error('Sistema de benchmarking não está integrado');
  }

  // Teste 2: Verificar se eventos estão sendo propagados
  let eventReceived = false;
  
  predictiveAnalytics.on('prediction_generated', () => {
    eventReceived = true;
  });
  
  const testData = {
    revenue: 100000,
    expenses: 75000,
    profit_margin: 25,
    cash_flow: 15000,
    debt_ratio: 0.3,
    current_ratio: 2.5,
    roi: 15,
    ebitda: 30000
  };
  
  await predictiveAnalytics.generatePrediction('financial_kpis', testData);
  
  // Aguardar um pouco para o evento ser processado
  await new Promise(resolve => setTimeout(resolve, 100));
  
  if (!eventReceived) {
    throw new Error('Eventos não estão sendo propagados entre sistemas avançados');
  }

  // Teste 3: Verificar integração de dados
  const prediction = await predictiveAnalytics.generatePrediction('financial_kpis', testData);
  const recommendations = await recommendationEngine.generateRecommendations('user123', testData);
  
  if (!prediction || !recommendations) {
    throw new Error('Integração de dados entre sistemas não está funcionando');
  }

  console.log('✅ Integração entre Sistemas Avançados funcionando corretamente');
}

/**
 * Testa Performance dos Sistemas Avançados
 */
async function testAdvancedSystemPerformance() {
  // Teste 1: Medir tempo de resposta da análise preditiva
  const startTime = Date.now();
  const testData = {
    revenue: 100000,
    expenses: 75000,
    profit_margin: 25,
    cash_flow: 15000,
    debt_ratio: 0.3,
    current_ratio: 2.5,
    roi: 15,
    ebitda: 30000
  };
  
  await predictiveAnalytics.generatePrediction('financial_kpis', testData);
  const predictionTime = Date.now() - startTime;
  
  if (predictionTime > 5000) { // 5 segundos
    throw new Error(`Análise preditiva muito lenta: ${predictionTime}ms`);
  }

  // Teste 2: Medir tempo de resposta das recomendações
  const startTime2 = Date.now();
  await recommendationEngine.generateRecommendations('user123', testData);
  const recommendationTime = Date.now() - startTime2;
  
  if (recommendationTime > 3000) { // 3 segundos
    throw new Error(`Recomendações muito lentas: ${recommendationTime}ms`);
  }

  // Teste 3: Medir tempo de execução de workflow
  const startTime3 = Date.now();
  await workflowEngine.executeWorkflow('auto_approval', testData);
  const workflowTime = Date.now() - startTime3;
  
  if (workflowTime > 2000) { // 2 segundos
    throw new Error(`Workflow muito lento: ${workflowTime}ms`);
  }

  // Teste 4: Medir tempo de cálculo de benchmark
  const startTime4 = Date.now();
  benchmarkingSystem.calculateClientBenchmark('client123');
  const benchmarkTime = Date.now() - startTime4;
  
  if (benchmarkTime > 1000) { // 1 segundo
    throw new Error(`Benchmark muito lento: ${benchmarkTime}ms`);
  }

  console.log(`✅ Performance dos Sistemas Avançados: Predição ${predictionTime}ms, Recomendações ${recommendationTime}ms, Workflow ${workflowTime}ms, Benchmark ${benchmarkTime}ms`);
}

/**
 * Executa todos os testes avançados
 */
async function runAllAdvancedTests() {
  console.log('\n🚀 Iniciando Testes Avançados - Fase 2');
  console.log('==========================================');

  await runTest('Análise Preditiva', testPredictiveAnalytics);
  await runTest('Engine de Recomendações', testRecommendationEngine);
  await runTest('Workflow Engine', testWorkflowEngine);
  await runTest('Sistema de Benchmarking', testBenchmarkingSystem);
  await runTest('Configuração Avançada', testAdvancedSystemConfig);
  await runTest('Integração Avançada', testAdvancedSystemIntegration);
  await runTest('Performance Avançada', testAdvancedSystemPerformance);

  console.log('\n📊 Resultados dos Testes Avançados');
  console.log('===================================');
  
  const passedTests = testResults.filter(r => r.status === 'PASSED').length;
  const failedTests = testResults.filter(r => r.status === 'FAILED').length;
  const totalTests = testResults.length;

  console.log(`Total de Testes: ${totalTests}`);
  console.log(`✅ Passou: ${passedTests}`);
  console.log(`❌ Falhou: ${failedTests}`);
  console.log(`📈 Taxa de Sucesso: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  if (failedTests > 0) {
    console.log('\n❌ Testes que Falharam:');
    testResults
      .filter(r => r.status === 'FAILED')
      .forEach(r => console.log(`  - ${r.name}: ${r.error}`));
  }

  if (passedTests === totalTests) {
    console.log('\n🎉 Todos os testes avançados passaram! Sistema funcionando perfeitamente.');
  } else {
    console.log('\n⚠️ Alguns testes avançados falharam. Verifique os logs acima.');
  }

  return passedTests === totalTests;
}

/**
 * Executa teste específico avançado
 */
async function runSpecificAdvancedTest(testName) {
  const tests = {
    'predictive': testPredictiveAnalytics,
    'recommendations': testRecommendationEngine,
    'workflows': testWorkflowEngine,
    'benchmarking': testBenchmarkingSystem,
    'config': testAdvancedSystemConfig,
    'integration': testAdvancedSystemIntegration,
    'performance': testAdvancedSystemPerformance
  };

  if (tests[testName]) {
    await runTest(testName, tests[testName]);
  } else {
    console.error(`Teste avançado não encontrado: ${testName}`);
    console.log('Testes avançados disponíveis:', Object.keys(tests).join(', '));
  }
}

// Executar testes se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const testName = process.argv[2];
  
  if (testName) {
    runSpecificAdvancedTest(testName);
  } else {
    runAllAdvancedTests();
  }
}

export { runAllAdvancedTests, runSpecificAdvancedTest };

