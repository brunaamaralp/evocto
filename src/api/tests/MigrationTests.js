/**
 * 🧪 Testes de Verificação - Migração Base44
 * 
 * Scripts para testar se a migração está funcionando corretamente
 */

import { localClient } from './localClient.js';

// Configuração de teste
const testConfig = {
  database: { type: 'memory' },
  auth: { type: 'mock' },
  llm: { type: 'mock' },
  email: { type: 'mock' },
  storage: { type: 'local' },
  cache: { type: 'memory' }
};

// Inicializar cliente de teste
const testClient = new localClient.constructor(testConfig);

// Testes de verificação
export class MigrationTests {
  constructor() {
    this.results = [];
    this.passed = 0;
    this.failed = 0;
  }

  async runAllTests() {
    console.log('🧪 Iniciando testes de migração...\n');

    await this.testDatabase();
    await this.testAuth();
    await this.testLLM();
    await this.testEmail();
    await this.testEntities();
    await this.testFunctions();

    this.printResults();
    return this.getResults();
  }

  async testDatabase() {
    console.log('📊 Testando banco de dados...');
    
    try {
      // Teste de criação
      const client = await testClient.entities.create('clients', {
        name: 'Cliente Teste',
        email: 'teste@cliente.com',
        phone: '11999999999'
      });
      
      if (client && client.id) {
        this.addResult('✅ Banco de dados - Criação', true);
        
        // Teste de busca
        const found = await testClient.entities.get('clients', client.id);
        if (found && found.name === 'Cliente Teste') {
          this.addResult('✅ Banco de dados - Busca', true);
        } else {
          this.addResult('❌ Banco de dados - Busca', false);
        }
        
        // Teste de atualização
        const updated = await testClient.entities.update('clients', client.id, {
          name: 'Cliente Atualizado'
        });
        if (updated && updated.name === 'Cliente Atualizado') {
          this.addResult('✅ Banco de dados - Atualização', true);
        } else {
          this.addResult('❌ Banco de dados - Atualização', false);
        }
        
        // Teste de exclusão
        await testClient.entities.delete('clients', client.id);
        const deleted = await testClient.entities.get('clients', client.id);
        if (!deleted) {
          this.addResult('✅ Banco de dados - Exclusão', true);
        } else {
          this.addResult('❌ Banco de dados - Exclusão', false);
        }
      } else {
        this.addResult('❌ Banco de dados - Criação', false);
      }
    } catch (error) {
      this.addResult('❌ Banco de dados - Erro geral', false, error.message);
    }
  }

  async testAuth() {
    console.log('🔐 Testando autenticação...');
    
    try {
      // Teste de login
      const user = await testClient.auth.login('admin@evocto.com');
      if (user && user.email === 'admin@evocto.com') {
        this.addResult('✅ Autenticação - Login', true);
        
        // Teste de me()
        const me = await testClient.auth.me();
        if (me && me.id === user.id) {
          this.addResult('✅ Autenticação - Me', true);
        } else {
          this.addResult('❌ Autenticação - Me', false);
        }
        
        // Teste de logout
        await testClient.auth.logout();
        const loggedOut = await testClient.auth.me();
        if (!loggedOut) {
          this.addResult('✅ Autenticação - Logout', true);
        } else {
          this.addResult('❌ Autenticação - Logout', false);
        }
      } else {
        this.addResult('❌ Autenticação - Login', false);
      }
    } catch (error) {
      this.addResult('❌ Autenticação - Erro geral', false, error.message);
    }
  }

  async testLLM() {
    console.log('🤖 Testando LLM...');
    
    try {
      // Teste básico
      const response = await testClient.integrations.Core.InvokeLLM('Teste de LLM');
      if (response && response.includes('Mock response')) {
        this.addResult('✅ LLM - Invocação básica', true);
      } else {
        this.addResult('❌ LLM - Invocação básica', false);
      }
      
      // Teste de geração de JSON
      const jsonResponse = await testClient.integrations.Core.InvokeLLM(
        'gerar tarefas para briefing',
        { response_json_schema: { type: 'object' } }
      );
      if (jsonResponse) {
        this.addResult('✅ LLM - Geração de JSON', true);
      } else {
        this.addResult('❌ LLM - Geração de JSON', false);
      }
    } catch (error) {
      this.addResult('❌ LLM - Erro geral', false, error.message);
    }
  }

  async testEmail() {
    console.log('📧 Testando email...');
    
    try {
      // Teste de envio
      const result = await testClient.integrations.Core.SendEmail(
        'teste@example.com',
        'Teste de Email',
        '<h1>Teste</h1><p>Este é um email de teste.</p>'
      );
      
      if (result && result.success) {
        this.addResult('✅ Email - Envio', true);
      } else {
        this.addResult('❌ Email - Envio', false);
      }
    } catch (error) {
      this.addResult('❌ Email - Erro geral', false, error.message);
    }
  }

  async testEntities() {
    console.log('📋 Testando entidades...');
    
    try {
      // Teste de múltiplas entidades
      const service = await testClient.entities.create('services', {
        name: 'Serviço Teste',
        description: 'Descrição do serviço',
        is_template: false
      });
      
      if (service && service.id) {
        this.addResult('✅ Entidades - Criação de serviço', true);
        
        // Teste de filtro
        const services = await testClient.entities.filter('services', {
          is_template: false
        });
        
        if (services && services.length > 0) {
          this.addResult('✅ Entidades - Filtro', true);
        } else {
          this.addResult('❌ Entidades - Filtro', false);
        }
        
        // Limpar dados de teste
        await testClient.entities.delete('services', service.id);
      } else {
        this.addResult('❌ Entidades - Criação de serviço', false);
      }
    } catch (error) {
      this.addResult('❌ Entidades - Erro geral', false, error.message);
    }
  }

  async testFunctions() {
    console.log('⚙️ Testando funções...');
    
    try {
      // Criar dados de teste
      const client = await testClient.entities.create('clients', {
        name: 'Cliente para Teste',
        email: 'cliente@teste.com'
      });
      
      const service = await testClient.entities.create('services', {
        name: 'Serviço para Teste',
        clientId: client.id,
        deliverables: [
          {
            id: 'deliverable-1',
            name: 'Análise Financeira',
            task_templates: [
              {
                id: 'task-1',
                title: 'Coletar Dados',
                description: 'Coletar documentos financeiros',
                type: 'analise',
                priority: 'high',
                estimated_hours: 4
              }
            ]
          }
        ]
      });
      
      // Teste de geração de tarefas
      const taskResult = await testClient.functions.generateTasksFromService({
        serviceId: service.id,
        autoAssign: false
      });
      
      if (taskResult && taskResult.success && taskResult.tasksCreated > 0) {
        this.addResult('✅ Funções - Geração de tarefas', true);
      } else {
        this.addResult('❌ Funções - Geração de tarefas', false);
      }
      
      // Teste de criação de instância
      const instanceResult = await testClient.functions.createServiceInstance({
        templateId: service.id,
        clientId: client.id,
        name: 'Instância Teste',
        description: 'Descrição da instância'
      });
      
      if (instanceResult && instanceResult.id) {
        this.addResult('✅ Funções - Criação de instância', true);
      } else {
        this.addResult('❌ Funções - Criação de instância', false);
      }
      
      // Teste de relatório
      const reportResult = await testClient.functions.generateClientReport({
        clientId: client.id
      });
      
      if (reportResult && reportResult.client && reportResult.summary) {
        this.addResult('✅ Funções - Geração de relatório', true);
      } else {
        this.addResult('❌ Funções - Geração de relatório', false);
      }
      
      // Limpar dados de teste
      await testClient.entities.delete('clients', client.id);
      await testClient.entities.delete('services', service.id);
      
    } catch (error) {
      this.addResult('❌ Funções - Erro geral', false, error.message);
    }
  }

  addResult(test, passed, error = null) {
    this.results.push({ test, passed, error });
    if (passed) {
      this.passed++;
    } else {
      this.failed++;
    }
  }

  printResults() {
    console.log('\n📊 RESULTADOS DOS TESTES:');
    console.log('='.repeat(50));
    
    this.results.forEach(result => {
      console.log(`${result.test}`);
      if (result.error) {
        console.log(`   Erro: ${result.error}`);
      }
    });
    
    console.log('='.repeat(50));
    console.log(`✅ Passou: ${this.passed}`);
    console.log(`❌ Falhou: ${this.failed}`);
    console.log(`📊 Total: ${this.results.length}`);
    
    const successRate = (this.passed / this.results.length) * 100;
    console.log(`🎯 Taxa de sucesso: ${successRate.toFixed(1)}%`);
    
    if (successRate >= 90) {
      console.log('🎉 MIGRAÇÃO APROVADA! Sistema pronto para produção.');
    } else if (successRate >= 70) {
      console.log('⚠️ MIGRAÇÃO PARCIALMENTE APROVADA. Revisar falhas.');
    } else {
      console.log('🚫 MIGRAÇÃO REJEITADA. Corrigir problemas antes de prosseguir.');
    }
  }

  getResults() {
    return {
      passed: this.passed,
      failed: this.failed,
      total: this.results.length,
      successRate: (this.passed / this.results.length) * 100,
      results: this.results
    };
  }
}

// Função para executar testes rapidamente
export async function runQuickTests() {
  const tests = new MigrationTests();
  return await tests.runAllTests();
}

// Função para teste específico
export async function testSpecific(component) {
  const tests = new MigrationTests();
  
  switch (component) {
    case 'database':
      await tests.testDatabase();
      break;
    case 'auth':
      await tests.testAuth();
      break;
    case 'llm':
      await tests.testLLM();
      break;
    case 'email':
      await tests.testEmail();
      break;
    case 'entities':
      await tests.testEntities();
      break;
    case 'functions':
      await tests.testFunctions();
      break;
    default:
      console.log('Componente não reconhecido. Use: database, auth, llm, email, entities, functions');
      return;
  }
  
  tests.printResults();
}

// Executar testes se chamado diretamente
if (typeof window !== 'undefined' && window.location.pathname.includes('test')) {
  runQuickTests();
}

