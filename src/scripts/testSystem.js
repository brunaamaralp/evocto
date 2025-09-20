#!/usr/bin/env node

/**
 * Scripts de Teste e Verificação
 * Testa todas as funcionalidades implementadas
 */

import { systemConfig } from './config/SystemConfig.js';
import { systemMonitor } from './monitoring/SystemMonitor.js';
import { distributedCache } from './cache/DistributedCache.js';
import { rateLimiter } from './security/RateLimiter.js';
import { twoFactorAuth } from './security/TwoFactorAuth.js';
import { auditLogger } from './security/AuditLogger.js';

const testResults = [];

/**
 * Executa um teste
 */
async function runTest(name, testFunction) {
  console.log(`\n--- Executando Teste: ${name} ---`);
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
 * Testa Sistema de Monitoramento
 */
async function testSystemMonitoring() {
  // Teste 1: Verificar se monitoramento está ativo
  if (!systemMonitor.isMonitoring) {
    throw new Error('Monitoramento não está ativo');
  }

  // Teste 2: Registrar métrica personalizada
  systemMonitor.recordMetric('test_metric', 42);
  const metrics = systemMonitor.getMetrics('test_metric');
  if (metrics.length === 0) {
    throw new Error('Métrica não foi registrada');
  }

  // Teste 3: Verificar estatísticas
  const stats = systemMonitor.getMetricsSummary();
  if (!stats || Object.keys(stats).length === 0) {
    throw new Error('Estatísticas não estão sendo geradas');
  }

  // Teste 4: Verificar alertas
  const alerts = systemMonitor.getActiveAlerts();
  if (!Array.isArray(alerts)) {
    throw new Error('Alertas não estão sendo retornados como array');
  }

  console.log('✅ Sistema de Monitoramento funcionando corretamente');
}

/**
 * Testa Sistema de Cache
 */
async function testDistributedCache() {
  // Teste 1: Armazenar e recuperar valor
  const testKey = 'test_key';
  const testValue = { data: 'test', timestamp: Date.now() };
  
  distributedCache.set(testKey, testValue);
  const retrievedValue = distributedCache.get(testKey);
  
  if (!retrievedValue || retrievedValue.data !== 'test') {
    throw new Error('Cache não está armazenando/recuperando valores corretamente');
  }

  // Teste 2: Verificar TTL
  const ttl = distributedCache.getTTL(testKey);
  if (ttl === null || ttl <= 0) {
    throw new Error('TTL não está sendo calculado corretamente');
  }

  // Teste 3: Verificar estatísticas
  const stats = distributedCache.getStats();
  if (!stats || stats.size === 0) {
    throw new Error('Estatísticas do cache não estão sendo geradas');
  }

  // Teste 4: Testar invalidação por padrão
  distributedCache.set('test_pattern_1', 'value1');
  distributedCache.set('test_pattern_2', 'value2');
  const invalidatedCount = distributedCache.invalidatePattern('test_pattern');
  if (invalidatedCount !== 2) {
    throw new Error('Invalidação por padrão não está funcionando');
  }

  // Teste 5: Testar cache com tags
  distributedCache.setWithTags('tagged_item', 'value', ['tag1', 'tag2']);
  const tagInvalidatedCount = distributedCache.invalidateByTag('tag1');
  if (tagInvalidatedCount !== 1) {
    throw new Error('Invalidação por tag não está funcionando');
  }

  console.log('✅ Sistema de Cache funcionando corretamente');
}

/**
 * Testa Sistema de Rate Limiting
 */
async function testRateLimiting() {
  const testIdentifier = 'test_user_123';

  // Teste 1: Verificar se requisições são permitidas inicialmente
  const result1 = rateLimiter.isAllowed(testIdentifier, { limit: 5 });
  if (!result1.allowed) {
    throw new Error('Primeira requisição deveria ser permitida');
  }

  // Teste 2: Exceder limite
  for (let i = 0; i < 5; i++) {
    rateLimiter.isAllowed(testIdentifier, { limit: 5 });
  }
  
  const result2 = rateLimiter.isAllowed(testIdentifier, { limit: 5 });
  if (result2.allowed) {
    throw new Error('Requisição após exceder limite deveria ser bloqueada');
  }

  // Teste 3: Verificar informações da janela
  const windowInfo = rateLimiter.getWindowInfo(testIdentifier, { limit: 5 });
  if (windowInfo.remaining !== 0) {
    throw new Error('Informações da janela não estão corretas');
  }

  // Teste 4: Resetar janela
  rateLimiter.reset(testIdentifier, { limit: 5 });
  const result3 = rateLimiter.isAllowed(testIdentifier, { limit: 5 });
  if (!result3.allowed) {
    throw new Error('Requisição após reset deveria ser permitida');
  }

  // Teste 5: Verificar estatísticas
  const stats = rateLimiter.getStats();
  if (!stats || stats.totalWindows === 0) {
    throw new Error('Estatísticas do rate limiter não estão sendo geradas');
  }

  console.log('✅ Sistema de Rate Limiting funcionando corretamente');
}

/**
 * Testa Sistema de 2FA
 */
async function testTwoFactorAuth() {
  const testUserId = 'test_user_456';

  // Teste 1: Gerar secret
  const secretData = twoFactorAuth.generateSecret(testUserId);
  if (!secretData.secret || !secretData.backupCodes) {
    throw new Error('Secret e códigos de backup não foram gerados');
  }

  // Teste 2: Verificar status antes de habilitar
  const statusBefore = twoFactorAuth.get2FAStatus(testUserId);
  if (statusBefore.isEnabled) {
    throw new Error('2FA não deveria estar habilitado antes da configuração');
  }

  // Teste 3: Habilitar 2FA (simulado)
  try {
    twoFactorAuth.enable2FA(testUserId, '123456'); // Código simulado
  } catch (error) {
    // Esperado, pois o código é inválido
    if (!error.message.includes('Código TOTP inválido')) {
      throw new Error('Erro inesperado ao habilitar 2FA');
    }
  }

  // Teste 4: Verificar códigos de backup
  const backupData = twoFactorAuth.backupCodes.get(testUserId);
  if (!backupData || backupData.codes.length !== 10) {
    throw new Error('Códigos de backup não foram gerados corretamente');
  }

  // Teste 5: Verificar estatísticas
  const stats = twoFactorAuth.getStats();
  if (!stats || stats.totalUsers === 0) {
    throw new Error('Estatísticas do 2FA não estão sendo geradas');
  }

  console.log('✅ Sistema de 2FA funcionando corretamente');
}

/**
 * Testa Sistema de Auditoria
 */
async function testAuditLogger() {
  const testUserId = 'test_user_789';

  // Teste 1: Registrar log de auditoria
  const auditEntry = auditLogger.log({
    userId: testUserId,
    action: 'TEST_ACTION',
    resource: 'TEST_RESOURCE',
    resourceId: 'test_123',
    details: { test: true },
    ipAddress: '127.0.0.1',
    userAgent: 'Test Agent'
  });

  if (!auditEntry || !auditEntry.id) {
    throw new Error('Log de auditoria não foi criado');
  }

  // Teste 2: Registrar início de sessão
  const sessionId = auditLogger.logSessionStart(testUserId, {
    ipAddress: '127.0.0.1',
    userAgent: 'Test Agent',
    location: 'Test Location'
  });

  if (!sessionId) {
    throw new Error('Sessão não foi iniciada');
  }

  // Teste 3: Registrar fim de sessão
  auditLogger.logSessionEnd(sessionId, 'LOGOUT');

  // Teste 4: Verificar logs do usuário
  const userLogs = auditLogger.getUserLogs(testUserId);
  if (!userLogs.logs || userLogs.logs.length === 0) {
    throw new Error('Logs do usuário não estão sendo retornados');
  }

  // Teste 5: Verificar estatísticas
  const stats = auditLogger.getAuditStats();
  if (!stats || stats.totalLogs === 0) {
    throw new Error('Estatísticas de auditoria não estão sendo geradas');
  }

  // Teste 6: Verificar sessões ativas
  const activeSessions = auditLogger.getActiveSessions();
  if (!Array.isArray(activeSessions)) {
    throw new Error('Sessões ativas não estão sendo retornadas como array');
  }

  console.log('✅ Sistema de Auditoria funcionando corretamente');
}

/**
 * Testa Configuração do Sistema
 */
async function testSystemConfig() {
  // Teste 1: Verificar se configuração foi carregada
  const config = systemConfig.getConfig();
  if (!config || !config.monitoring || !config.cache) {
    throw new Error('Configuração do sistema não foi carregada');
  }

  // Teste 2: Verificar se monitoramento está habilitado
  if (!config.monitoring.enabled) {
    throw new Error('Monitoramento não está habilitado na configuração');
  }

  // Teste 3: Verificar se cache está habilitado
  if (!config.cache.enabled) {
    throw new Error('Cache não está habilitado na configuração');
  }

  // Teste 4: Verificar se rate limiting está habilitado
  if (!config.rateLimiting.enabled) {
    throw new Error('Rate limiting não está habilitado na configuração');
  }

  // Teste 5: Verificar se 2FA está habilitado
  if (!config.twoFactorAuth.enabled) {
    throw new Error('2FA não está habilitado na configuração');
  }

  // Teste 6: Verificar se auditoria está habilitada
  if (!config.audit.enabled) {
    throw new Error('Auditoria não está habilitada na configuração');
  }

  // Teste 7: Verificar estatísticas do sistema
  const systemStats = systemConfig.getSystemStats();
  if (!systemStats || !systemStats.monitoring) {
    throw new Error('Estatísticas do sistema não estão sendo geradas');
  }

  console.log('✅ Configuração do Sistema funcionando corretamente');
}

/**
 * Testa Integração entre Sistemas
 */
async function testSystemIntegration() {
  // Teste 1: Verificar se todos os sistemas estão inicializados
  const systemStats = systemConfig.getSystemStats();
  
  if (!systemStats.monitoring.isEnabled) {
    throw new Error('Sistema de monitoramento não está integrado');
  }
  
  if (!systemStats.cache.isEnabled) {
    throw new Error('Sistema de cache não está integrado');
  }
  
  if (!systemStats.rateLimiting.isEnabled) {
    throw new Error('Sistema de rate limiting não está integrado');
  }
  
  if (!systemStats.twoFactorAuth.isEnabled) {
    throw new Error('Sistema de 2FA não está integrado');
  }
  
  if (!systemStats.audit.isEnabled) {
    throw new Error('Sistema de auditoria não está integrado');
  }

  // Teste 2: Verificar se eventos estão sendo propagados
  let eventReceived = false;
  
  systemMonitor.on('metric', () => {
    eventReceived = true;
  });
  
  systemMonitor.recordMetric('integration_test', 1);
  
  // Aguardar um pouco para o evento ser processado
  await new Promise(resolve => setTimeout(resolve, 100));
  
  if (!eventReceived) {
    throw new Error('Eventos não estão sendo propagados entre sistemas');
  }

  console.log('✅ Integração entre Sistemas funcionando corretamente');
}

/**
 * Executa todos os testes
 */
async function runAllTests() {
  console.log('\n🚀 Iniciando Testes de Verificação do Sistema');
  console.log('===============================================');

  await runTest('Sistema de Monitoramento', testSystemMonitoring);
  await runTest('Sistema de Cache', testDistributedCache);
  await runTest('Sistema de Rate Limiting', testRateLimiting);
  await runTest('Sistema de 2FA', testTwoFactorAuth);
  await runTest('Sistema de Auditoria', testAuditLogger);
  await runTest('Configuração do Sistema', testSystemConfig);
  await runTest('Integração entre Sistemas', testSystemIntegration);

  console.log('\n📊 Resultados dos Testes');
  console.log('========================');
  
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
    console.log('\n🎉 Todos os testes passaram! Sistema funcionando perfeitamente.');
  } else {
    console.log('\n⚠️ Alguns testes falharam. Verifique os logs acima.');
  }

  return passedTests === totalTests;
}

/**
 * Executa teste específico
 */
async function runSpecificTest(testName) {
  const tests = {
    'monitoring': testSystemMonitoring,
    'cache': testDistributedCache,
    'rate-limiting': testRateLimiting,
    '2fa': testTwoFactorAuth,
    'audit': testAuditLogger,
    'config': testSystemConfig,
    'integration': testSystemIntegration
  };

  if (tests[testName]) {
    await runTest(testName, tests[testName]);
  } else {
    console.error(`Teste não encontrado: ${testName}`);
    console.log('Testes disponíveis:', Object.keys(tests).join(', '));
  }
}

// Executar testes se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const testName = process.argv[2];
  
  if (testName) {
    runSpecificTest(testName);
  } else {
    runAllTests();
  }
}

export { runAllTests, runSpecificTest };

