import React from 'react';

/**
 * SPA Routing Test Utilities
 * Testes de smoke para verificar se as rotas SPA estão funcionando
 */

export const SPA_ROUTES_TESTS = {
  // Rotas que devem retornar 200 e renderizar o React app
  spa_routes: [
    '/dashboard',
    '/clients', 
    '/public-briefing/test_token_123',
    '/client-portal',
    '/services',
    '/not-found-page'
  ],
  
  // Rotas API que devem ser preservadas (não reescritas)
  api_routes: [
    '/api/health',
    '/api/apps/*/functions/*'
  ]
};

/**
 * Função de teste para verificar se SPA routing está funcionando
 */
export async function testSPARouting() {
  const results = {
    spa_fallback: [],
    api_preservation: [],
    errors: []
  };

  // Teste 1: Verificar se rotas SPA fazem fallback para index.html
  for (const route of SPA_ROUTES_TESTS.spa_routes) {
    try {
      const response = await fetch(route, { 
        method: 'GET',
        headers: { 'Accept': 'text/html' }
      });
      
      results.spa_fallback.push({
        route,
        status: response.status,
        content_type: response.headers.get('content-type'),
        success: response.status === 200 && response.headers.get('content-type')?.includes('text/html')
      });
    } catch (error) {
      results.errors.push({ route, error: error.message });
    }
  }

  return results;
}

/**
 * Componente para testar routing em desenvolvimento
 */
export function SPARoutingTester() {
  const [testResults, setTestResults] = React.useState(null);
  const [testing, setTesting] = React.useState(false);

  const runTests = async () => {
    setTesting(true);
    try {
      const results = await testSPARouting();
      setTestResults(results);
    } catch (error) {
      console.error('Erro nos testes SPA:', error);
    }
    setTesting(false);
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="font-bold mb-2">🧪 SPA Routing Tests</h3>
      
      <button 
        onClick={runTests}
        disabled={testing}
        className="px-3 py-1 bg-blue-500 text-white rounded mb-4"
      >
        {testing ? 'Testando...' : 'Executar Testes'}
      </button>

      {testResults && (
        <div className="space-y-2">
          <h4>Resultados:</h4>
          <pre className="text-xs bg-white p-2 rounded overflow-auto">
            {JSON.stringify(testResults, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}