#!/usr/bin/env node

/**
 * Scripts de Teste da Fase 3: Expansão e Integração
 * Testa funcionalidades de marketplace, API pública, mobile e integrações
 */

import { phase3Config } from './config/Phase3Config.js';
import { serviceCatalog } from '../marketplace/ServiceCatalog.js';
import { paymentSystem } from '../marketplace/PaymentSystem.js';
import { publicAPI } from '../api/PublicAPI.js';
import { pwaManager } from '../pwa/PWAManager.js';
import { integrationSystem } from '../integrations/IntegrationSystem.js';

const testResults = [];

/**
 * Executa um teste
 */
async function runTest(name, testFunction) {
  console.log(`\n--- Executando Teste da Fase 3: ${name} ---`);
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
 * Testa Marketplace - Service Catalog
 */
async function testServiceCatalog() {
  // Teste 1: Verificar se serviços estão inicializados
  const services = serviceCatalog.getAllServices();
  if (!services || services.length === 0) {
    throw new Error('Nenhum serviço encontrado no catálogo');
  }

  // Teste 2: Buscar serviços
  const searchResults = serviceCatalog.searchServices('financeiro', {
    category: 'financial',
    minPrice: 1000,
    maxPrice: 10000
  });
  if (!searchResults || searchResults.length === 0) {
    throw new Error('Busca de serviços não retornou resultados');
  }

  // Teste 3: Calcular preço dinâmico
  const pricing = serviceCatalog.calculateDynamicPrice('financial_diagnosis', {
    quantity: 2,
    urgency: 'high',
    clientType: 'premium'
  });
  if (!pricing || !pricing.finalPrice) {
    throw new Error('Cálculo de preço dinâmico falhou');
  }

  // Teste 4: Criar pedido
  const orderId = serviceCatalog.createOrder({
    clientId: 'client123',
    serviceId: 'financial_diagnosis',
    quantity: 1,
    urgency: 'normal'
  });
  if (!orderId) {
    throw new Error('Criação de pedido falhou');
  }

  // Teste 5: Adicionar avaliação
  const reviewId = serviceCatalog.addReview('financial_diagnosis', {
    clientId: 'client123',
    rating: 5,
    title: 'Excelente serviço',
    comment: 'Muito satisfeito com o resultado',
    pros: ['Análise detalhada', 'Recomendações práticas'],
    cons: ['Demorou um pouco'],
    wouldRecommend: true
  });
  if (!reviewId) {
    throw new Error('Adição de avaliação falhou');
  }

  // Teste 6: Obter estatísticas
  const stats = serviceCatalog.getMarketplaceStats();
  if (!stats || stats.totalServices === 0) {
    throw new Error('Estatísticas do marketplace não estão sendo geradas');
  }

  console.log('✅ Service Catalog funcionando corretamente');
}

/**
 * Testa Marketplace - Payment System
 */
async function testPaymentSystem() {
  // Teste 1: Verificar se provedores estão inicializados
  const providers = paymentSystem.providers;
  if (!providers || providers.size === 0) {
    throw new Error('Nenhum provedor de pagamento encontrado');
  }

  // Teste 2: Processar pagamento
  const payment = await paymentSystem.processPayment({
    orderId: 'order123',
    clientId: 'client123',
    amount: 5000,
    currency: 'BRL',
    method: 'credit_card'
  });
  if (!payment || !payment.id) {
    throw new Error('Processamento de pagamento falhou');
  }

  // Teste 3: Verificar comissão
  const commission = paymentSystem.commissions.get(payment.id);
  if (!commission || !commission.amount) {
    throw new Error('Cálculo de comissão falhou');
  }

  // Teste 4: Processar reembolso
  const refund = await paymentSystem.processRefund(payment.id, {
    amount: 5000,
    reason: 'Cliente solicitou cancelamento'
  });
  if (!refund || !refund.id) {
    throw new Error('Processamento de reembolso falhou');
  }

  // Teste 5: Processar pagamento de comissão
  const payout = await paymentSystem.processCommissionPayout(commission.id, {
    method: 'bank_transfer',
    provider: 'stripe'
  });
  if (!payout || !payout.id) {
    throw new Error('Processamento de pagamento de comissão falhou');
  }

  // Teste 6: Obter estatísticas
  const stats = paymentSystem.getPaymentStats();
  if (!stats || stats.totalPayments === 0) {
    throw new Error('Estatísticas de pagamento não estão sendo geradas');
  }

  console.log('✅ Payment System funcionando corretamente');
}

/**
 * Testa API Pública
 */
async function testPublicAPI() {
  // Teste 1: Verificar se endpoints estão inicializados
  const endpoints = publicAPI.endpoints;
  if (!endpoints || endpoints.size === 0) {
    throw new Error('Nenhum endpoint da API encontrado');
  }

  // Teste 2: Gerar chave de API
  const apiKey = publicAPI.generateAPIKey({
    clientId: 'client123',
    clientName: 'Test Client',
    tier: 'premium',
    permissions: ['read', 'write']
  });
  if (!apiKey || !apiKey.key) {
    throw new Error('Geração de chave de API falhou');
  }

  // Teste 3: Validar chave de API
  const validation = publicAPI.validateAPIKey(apiKey.key);
  if (!validation.valid) {
    throw new Error('Validação de chave de API falhou');
  }

  // Teste 4: Verificar rate limit
  const rateLimitCheck = publicAPI.checkRateLimit(apiKey.key, endpoints.get('GET /api/v1/services'));
  if (!rateLimitCheck.allowed) {
    throw new Error('Rate limit não está funcionando corretamente');
  }

  // Teste 5: Processar requisição
  const response = await publicAPI.processRequest(
    'GET',
    '/api/v1/services',
    { 'x-api-key': apiKey.key },
    null,
    { category: 'financial' }
  );
  if (!response || response.status !== 200) {
    throw new Error('Processamento de requisição falhou');
  }

  // Teste 6: Obter documentação
  const documentation = publicAPI.getDocumentation('v1');
  if (!documentation || !documentation.endpoints) {
    throw new Error('Documentação da API não está sendo gerada');
  }

  console.log('✅ Public API funcionando corretamente');
}

/**
 * Testa PWA Manager
 */
async function testPWAManager() {
  // Teste 1: Verificar status da PWA
  const status = pwaManager.getPWAStatus();
  if (!status) {
    throw new Error('Status da PWA não está sendo obtido');
  }

  // Teste 2: Solicitar permissão de notificação
  try {
    const permissionGranted = await pwaManager.requestNotificationPermission();
    if (typeof permissionGranted !== 'boolean') {
      throw new Error('Solicitação de permissão de notificação falhou');
    }
  } catch (error) {
    // Pode falhar em ambiente de teste, não é crítico
    console.log('Permissão de notificação não disponível em ambiente de teste');
  }

  // Teste 3: Enviar notificação (se permissão concedida)
  if (pwaManager.notificationPermission === 'granted') {
    try {
      const notification = await pwaManager.sendNotification('Teste PWA', {
        body: 'Esta é uma notificação de teste',
        icon: '/icon-192x192.png'
      });
      if (!notification) {
        throw new Error('Envio de notificação falhou');
      }
    } catch (error) {
      console.log('Envio de notificação não disponível em ambiente de teste');
    }
  }

  // Teste 4: Obter informações do cache
  const cacheInfo = await pwaManager.getCacheInfo();
  if (cacheInfo === null) {
    console.log('Cache API não disponível em ambiente de teste');
  }

  // Teste 5: Obter estatísticas de uso
  const usageStats = await pwaManager.getUsageStats();
  if (!usageStats) {
    throw new Error('Estatísticas de uso da PWA não estão sendo geradas');
  }

  // Teste 6: Verificar conectividade
  await pwaManager.checkConnectivity();
  if (typeof pwaManager.isOnline !== 'boolean') {
    throw new Error('Verificação de conectividade falhou');
  }

  console.log('✅ PWA Manager funcionando corretamente');
}

/**
 * Testa Integration System
 */
async function testIntegrationSystem() {
  // Teste 1: Verificar se integrações estão inicializadas
  const integrations = integrationSystem.getAvailableIntegrations();
  if (!integrations || integrations.length === 0) {
    throw new Error('Nenhuma integração encontrada');
  }

  // Teste 2: Conectar integração
  const connectionId = await integrationSystem.connectIntegration('salesforce', {
    access_token: 'test_token',
    refresh_token: 'test_refresh_token',
    instance_url: 'https://test.salesforce.com'
  });
  if (!connectionId) {
    throw new Error('Conexão de integração falhou');
  }

  // Teste 3: Testar conexão
  await integrationSystem.testConnection(connectionId);
  const connection = integrationSystem.connections.get(connectionId);
  if (!connection || connection.status !== 'connected') {
    throw new Error('Teste de conexão falhou');
  }

  // Teste 4: Sincronizar dados
  const syncJob = await integrationSystem.syncData(connectionId, 'clients', {
    limit: 10,
    offset: 0
  });
  if (!syncJob || !syncJob.id) {
    throw new Error('Sincronização de dados falhou');
  }

  // Teste 5: Configurar webhook
  const webhookId = await integrationSystem.configureWebhook(connectionId, {
    url: 'https://example.com/webhook',
    events: ['client_created', 'client_updated'],
    secret: 'webhook_secret'
  });
  if (!webhookId) {
    throw new Error('Configuração de webhook falhou');
  }

  // Teste 6: Disparar webhook
  await integrationSystem.triggerWebhook(webhookId, {
    event: 'client_created',
    data: { clientId: 'client123', name: 'Test Client' }
  });

  // Teste 7: Obter estatísticas
  const stats = integrationSystem.getIntegrationStats();
  if (!stats || stats.totalIntegrations === 0) {
    throw new Error('Estatísticas de integração não estão sendo geradas');
  }

  console.log('✅ Integration System funcionando corretamente');
}

/**
 * Testa Configuração da Fase 3
 */
async function testPhase3Config() {
  // Teste 1: Verificar se configuração foi carregada
  const config = phase3Config.getConfig();
  if (!config || !config.marketplace || !config.publicAPI || !config.mobile || !config.integrations) {
    throw new Error('Configuração da Fase 3 não foi carregada');
  }

  // Teste 2: Verificar se Marketplace está habilitado
  if (!config.marketplace.enabled) {
    throw new Error('Marketplace não está habilitado na configuração');
  }

  // Teste 3: Verificar se API Pública está habilitada
  if (!config.publicAPI.enabled) {
    throw new Error('API Pública não está habilitada na configuração');
  }

  // Teste 4: Verificar se Mobile está habilitado
  if (!config.mobile.enabled) {
    throw new Error('Mobile não está habilitado na configuração');
  }

  // Teste 5: Verificar se Integrações estão habilitadas
  if (!config.integrations.enabled) {
    throw new Error('Integrações não estão habilitadas na configuração');
  }

  // Teste 6: Verificar se Performance está habilitada
  if (!config.performance.enabled) {
    throw new Error('Performance não está habilitada na configuração');
  }

  // Teste 7: Verificar se Segurança está habilitada
  if (!config.security.enabled) {
    throw new Error('Segurança não está habilitada na configuração');
  }

  // Teste 8: Verificar estatísticas da Fase 3
  const phase3Stats = phase3Config.getPhase3Stats();
  if (!phase3Stats || !phase3Stats.marketplace || !phase3Stats.publicAPI) {
    throw new Error('Estatísticas da Fase 3 não estão sendo geradas');
  }

  // Teste 9: Validar configuração
  const validation = phase3Config.validatePhase3Config();
  if (!validation.isValid) {
    throw new Error(`Configuração da Fase 3 inválida: ${validation.errors.join(', ')}`);
  }

  console.log('✅ Configuração da Fase 3 funcionando corretamente');
}

/**
 * Testa Integração entre Sistemas da Fase 3
 */
async function testPhase3Integration() {
  // Teste 1: Verificar se todos os sistemas estão inicializados
  const phase3Stats = phase3Config.getPhase3Stats();
  
  if (!phase3Stats.marketplace.serviceCatalog.enabled) {
    throw new Error('Service Catalog não está integrado');
  }
  
  if (!phase3Stats.marketplace.paymentSystem.enabled) {
    throw new Error('Payment System não está integrado');
  }
  
  if (!phase3Stats.publicAPI.enabled) {
    throw new Error('Public API não está integrada');
  }
  
  if (!phase3Stats.mobile.pwa.enabled) {
    throw new Error('PWA não está integrada');
  }
  
  if (!phase3Stats.integrations.enabled) {
    throw new Error('Integration System não está integrado');
  }

  // Teste 2: Verificar se eventos estão sendo propagados
  let eventReceived = false;
  
  serviceCatalog.on('order_created', () => {
    eventReceived = true;
  });
  
  const orderId = serviceCatalog.createOrder({
    clientId: 'client123',
    serviceId: 'financial_diagnosis',
    quantity: 1,
    urgency: 'normal'
  });
  
  // Aguardar um pouco para o evento ser processado
  await new Promise(resolve => setTimeout(resolve, 100));
  
  if (!eventReceived) {
    throw new Error('Eventos não estão sendo propagados entre sistemas da Fase 3');
  }

  // Teste 3: Verificar integração de dados
  const services = serviceCatalog.getAllServices();
  const apiKey = publicAPI.generateAPIKey({
    clientId: 'client123',
    clientName: 'Test Client',
    tier: 'premium'
  });
  
  if (!services || !apiKey) {
    throw new Error('Integração de dados entre sistemas da Fase 3 não está funcionando');
  }

  console.log('✅ Integração entre Sistemas da Fase 3 funcionando corretamente');
}

/**
 * Testa Performance da Fase 3
 */
async function testPhase3Performance() {
  // Teste 1: Medir tempo de resposta do Service Catalog
  const startTime = Date.now();
  const services = serviceCatalog.getAllServices();
  const serviceCatalogTime = Date.now() - startTime;
  
  if (serviceCatalogTime > 1000) { // 1 segundo
    throw new Error(`Service Catalog muito lento: ${serviceCatalogTime}ms`);
  }

  // Teste 2: Medir tempo de resposta do Payment System
  const startTime2 = Date.now();
  await paymentSystem.processPayment({
    orderId: 'order123',
    clientId: 'client123',
    amount: 5000,
    currency: 'BRL',
    method: 'credit_card'
  });
  const paymentTime = Date.now() - startTime2;
  
  if (paymentTime > 5000) { // 5 segundos
    throw new Error(`Payment System muito lento: ${paymentTime}ms`);
  }

  // Teste 3: Medir tempo de resposta da Public API
  const startTime3 = Date.now();
  const apiKey = publicAPI.generateAPIKey({
    clientId: 'client123',
    clientName: 'Test Client',
    tier: 'premium'
  });
  const apiTime = Date.now() - startTime3;
  
  if (apiTime > 500) { // 500ms
    throw new Error(`Public API muito lenta: ${apiTime}ms`);
  }

  // Teste 4: Medir tempo de resposta do Integration System
  const startTime4 = Date.now();
  await integrationSystem.connectIntegration('salesforce', {
    access_token: 'test_token',
    refresh_token: 'test_refresh_token',
    instance_url: 'https://test.salesforce.com'
  });
  const integrationTime = Date.now() - startTime4;
  
  if (integrationTime > 3000) { // 3 segundos
    throw new Error(`Integration System muito lento: ${integrationTime}ms`);
  }

  console.log(`✅ Performance da Fase 3: Service Catalog ${serviceCatalogTime}ms, Payment ${paymentTime}ms, API ${apiTime}ms, Integration ${integrationTime}ms`);
}

/**
 * Executa todos os testes da Fase 3
 */
async function runAllPhase3Tests() {
  console.log('\n🚀 Iniciando Testes da Fase 3: Expansão e Integração');
  console.log('====================================================');

  await runTest('Service Catalog', testServiceCatalog);
  await runTest('Payment System', testPaymentSystem);
  await runTest('Public API', testPublicAPI);
  await runTest('PWA Manager', testPWAManager);
  await runTest('Integration System', testIntegrationSystem);
  await runTest('Phase 3 Config', testPhase3Config);
  await runTest('Phase 3 Integration', testPhase3Integration);
  await runTest('Phase 3 Performance', testPhase3Performance);

  console.log('\n📊 Resultados dos Testes da Fase 3');
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
    console.log('\n🎉 Todos os testes da Fase 3 passaram! Sistema funcionando perfeitamente.');
  } else {
    console.log('\n⚠️ Alguns testes da Fase 3 falharam. Verifique os logs acima.');
  }

  return passedTests === totalTests;
}

/**
 * Executa teste específico da Fase 3
 */
async function runSpecificPhase3Test(testName) {
  const tests = {
    'service-catalog': testServiceCatalog,
    'payment-system': testPaymentSystem,
    'public-api': testPublicAPI,
    'pwa-manager': testPWAManager,
    'integration-system': testIntegrationSystem,
    'config': testPhase3Config,
    'integration': testPhase3Integration,
    'performance': testPhase3Performance
  };

  if (tests[testName]) {
    await runTest(testName, tests[testName]);
  } else {
    console.error(`Teste da Fase 3 não encontrado: ${testName}`);
    console.log('Testes da Fase 3 disponíveis:', Object.keys(tests).join(', '));
  }
}

// Executar testes se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const testName = process.argv[2];
  
  if (testName) {
    runSpecificPhase3Test(testName);
  } else {
    runAllPhase3Tests();
  }
}

export { runAllPhase3Tests, runSpecificPhase3Test };

