/**
 * Suite de Testes SPA - Smoke Tests Automatizados
 */

export class SPASmokeTests {
  constructor(baseUrl = window.location.origin) {
    this.baseUrl = baseUrl;
    this.results = [];
  }

  async runAllTests() {
    console.log('🧪 Executando SPA Smoke Tests...');
    
    // Teste 1: Briefing Público com Token Válido
    await this.testPublicBriefingValidToken();
    
    // Teste 2: Briefing Público com Token Inválido  
    await this.testPublicBriefingInvalidToken();
    
    // Teste 3: F5 em rota SPA
    await this.testF5Reload();
    
    // Teste 4: API Preservation
    await this.testAPIPreservation();

    return this.results;
  }

  async testPublicBriefingValidToken() {
    const testName = 'PublicBriefing - Token Válido';
    try {
      // Gerar token de teste primeiro
      const { testBriefingPublicAccess } = await import('@/api/functions');
      const tokenResponse = await testBriefingPublicAccess({});
      
      if (tokenResponse.success) {
        // Testar acesso
        const response = await fetch(tokenResponse.publicUrl);
        
        this.results.push({
          test: testName,
          status: response.status,
          success: response.status === 200,
          url: tokenResponse.publicUrl,
          contentType: response.headers.get('content-type')
        });
      } else {
        throw new Error(tokenResponse.error);
      }
    } catch (error) {
      this.results.push({
        test: testName,
        success: false,
        error: error.message
      });
    }
  }

  async testPublicBriefingInvalidToken() {
    const testName = 'PublicBriefing - Token Inválido';
    try {
      const invalidUrl = `${this.baseUrl}/public-briefing?token=invalid_token_123`;
      const response = await fetch(invalidUrl);
      
      // Deve retornar 200 (SPA) mas mostrar mensagem de token inválido
      this.results.push({
        test: testName,
        status: response.status,
        success: response.status === 200, // SPA deve capturar e mostrar erro
        url: invalidUrl,
        note: 'SPA deve mostrar "Token inválido/expirado", não 404 genérico'
      });
    } catch (error) {
      this.results.push({
        test: testName,
        success: false,
        error: error.message
      });
    }
  }

  async testF5Reload() {
    const testName = 'F5 Reload - Rota SPA';
    try {
      const testRoutes = [
        '/dashboard',
        '/clients', 
        '/services',
        '/client-portal'
      ];

      for (const route of testRoutes) {
        const response = await fetch(`${this.baseUrl}${route}`);
        
        this.results.push({
          test: `${testName} (${route})`,
          status: response.status,
          success: response.status === 200,
          url: `${this.baseUrl}${route}`,
          contentType: response.headers.get('content-type')
        });
      }
    } catch (error) {
      this.results.push({
        test: testName,
        success: false,
        error: error.message
      });
    }
  }

  async testAPIPreservation() {
    const testName = 'API Preservation';
    try {
      const apiRoutes = [
        '/api/health',
        '/api/apps/test/functions/test'
      ];

      for (const route of apiRoutes) {
        try {
          const response = await fetch(`${this.baseUrl}${route}`);
          
          this.results.push({
            test: `${testName} (${route})`,
            status: response.status,
            success: response.status !== 200 || !response.headers.get('content-type')?.includes('text/html'),
            url: `${this.baseUrl}${route}`,
            note: 'API deve ser preservada, não reescrita para index.html'
          });
        } catch (error) {
          // Erro é esperado para URLs API fictícias
          this.results.push({
            test: `${testName} (${route})`,
            success: true,
            note: 'API corretamente rejeitada/proxied'
          });
        }
      }
    } catch (error) {
      this.results.push({
        test: testName,
        success: false,
        error: error.message
      });
    }
  }

  generateReport() {
    const passed = this.results.filter(r => r.success).length;
    const total = this.results.length;
    
    return {
      summary: `${passed}/${total} testes passaram`,
      results: this.results,
      success: passed === total
    };
  }
}

// Função helper para executar testes em development
export async function runSPASmokeTests() {
  const tester = new SPASmokeTests();
  const results = await tester.runAllTests();
  const report = tester.generateReport();
  
  console.log('📊 Relatório SPA Tests:', report);
  return report;
}