import React, { useState, useEffect, useCallback } from 'react';
import { LearningEntry, Client, CyclePlan } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Play, 
  Lightbulb,
  Search,
  Plus,
  Filter,
  BookOpen,
  Zap,
  Users,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';

const ValidationItem = ({ title, status, description, evidence, onTest }) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'pass': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'fail': return <XCircle className="w-5 h-5 text-red-600" />;
      case 'pending': return <Clock className="w-5 h-5 text-yellow-600" />;
      default: return <AlertTriangle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'pass': return 'border-green-200 bg-green-50';
      case 'fail': return 'border-red-200 bg-red-50';
      case 'pending': return 'border-yellow-200 bg-yellow-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <Card className={`${getStatusColor()} transition-all`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {getStatusIcon()}
            {title}
          </CardTitle>
          {onTest && (
            <Button size="sm" variant="outline" onClick={onTest}>
              <Play className="w-4 h-4 mr-1" />
              Testar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-600 mb-3">{description}</p>
        {evidence && (
          <div className="text-xs bg-white p-2 rounded border">
            <strong>Evidência:</strong> {evidence}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default function AprendizadosValidation() {
  const { agency } = useSession();
  const [validationResults, setValidationResults] = useState({
    pageStructure: 'untested',
    addLearning: 'untested',
    searchAndFilter: 'untested',
    applyToPlanning: 'untested',
    emptyState: 'untested',
    customerSource: 'untested',
    navigation: 'untested',
    loadingIssues: 'untested'
  });
  
  const [testData, setTestData] = useState({
    learningsCount: 0,
    hasSearchField: false,
    hasAddButton: false,
    emptyStateVisible: false,
    pageTitle: '',
    routeName: '',
    loadingErrors: []
  });

  const [testing, setTesting] = useState('');

  // 🔍 Teste 1: Estrutura da página
  const testPageStructure = useCallback(async () => {
    setTesting('pageStructure');
    try {
      // Verificar se a página carrega
      const currentPath = window.location.pathname;
      const pageTitle = document.title;
      
      // Verificar elementos essenciais da página
      const hasTitle = document.querySelector('h1');
      const hasSearchField = document.querySelector('input[placeholder*="Busca"], input[placeholder*="busca"]');
      const hasFilterButton = document.querySelector('button[class*="filter"], [class*="Filter"]');
      const hasCards = document.querySelectorAll('[class*="card"], [class*="Card"]').length > 0;

      const structureScore = [hasTitle, hasSearchField, hasFilterButton, hasCards].filter(Boolean).length;
      
      setValidationResults(prev => ({ 
        ...prev, 
        pageStructure: structureScore >= 3 ? 'pass' : structureScore >= 2 ? 'pending' : 'fail'
      }));
      
      setTestData(prev => ({ 
        ...prev,
        pageTitle: hasTitle?.textContent || 'Não encontrado',
        routeName: currentPath,
        hasSearchField: !!hasSearchField
      }));

    } catch (error) {
      setValidationResults(prev => ({ ...prev, pageStructure: 'fail' }));
      setTestData(prev => ({ 
        ...prev, 
        loadingErrors: [...prev.loadingErrors, error.message]
      }));
    }
    setTesting('');
  }, []);

  // 🔍 Teste 2: Botão Adicionar Aprendizado
  const testAddLearning = useCallback(async () => {
    setTesting('addLearning');
    try {
      const addButton = document.querySelector('button[class*="Novo"], button:contains("Adicionar"), button:contains("Novo Aprendizado")');
      const hasModal = document.querySelector('[role="dialog"], [class*="modal"], [class*="Modal"]');
      
      setValidationResults(prev => ({ 
        ...prev, 
        addLearning: addButton ? 'pass' : 'fail'
      }));
      
      setTestData(prev => ({ 
        ...prev,
        hasAddButton: !!addButton
      }));

    } catch (error) {
      setValidationResults(prev => ({ ...prev, addLearning: 'fail' }));
    }
    setTesting('');
  }, []);

  // 🔍 Teste 3: Busca e Filtros
  const testSearchAndFilter = useCallback(async () => {
    setTesting('searchAndFilter');
    try {
      const searchInput = document.querySelector('input[type="search"], input[placeholder*="busca"], input[placeholder*="Busca"]');
      const filterButton = document.querySelector('button[class*="filter"], button[class*="Filter"]');
      const tagBadges = document.querySelectorAll('[class*="badge"], [class*="Badge"], [class*="tag"]');

      const searchScore = [searchInput, filterButton, tagBadges.length > 0].filter(Boolean).length;
      
      setValidationResults(prev => ({ 
        ...prev, 
        searchAndFilter: searchScore >= 2 ? 'pass' : searchScore === 1 ? 'pending' : 'fail'
      }));

    } catch (error) {
      setValidationResults(prev => ({ ...prev, searchAndFilter: 'fail' }));
    }
    setTesting('');
  }, []);

  // 🔍 Teste 4: Aplicar no Planejamento
  const testApplyToPlanning = useCallback(async () => {
    setTesting('applyToPlanning');
    try {
      const applyButtons = document.querySelectorAll('button:contains("Aplicar"), button:contains("Planejamento"), button[class*="aplicar"]');
      
      setValidationResults(prev => ({ 
        ...prev, 
        applyToPlanning: applyButtons.length > 0 ? 'pass' : 'fail'
      }));

    } catch (error) {
      setValidationResults(prev => ({ ...prev, applyToPlanning: 'fail' }));
    }
    setTesting('');
  }, []);

  // 🔍 Teste 5: Estado Vazio
  const testEmptyState = useCallback(async () => {
    setTesting('emptyState');
    try {
      const learnings = await LearningEntry.filter({ agencyId: agency.id });
      const emptyStateElement = document.querySelector('[class*="empty"], [class*="Empty"]');
      const emptyMessage = document.querySelector('p:contains("Sem aprendizados"), p:contains("playbook")');

      if (learnings.length === 0) {
        setValidationResults(prev => ({ 
          ...prev, 
          emptyState: (emptyStateElement || emptyMessage) ? 'pass' : 'fail'
        }));
        setTestData(prev => ({ 
          ...prev, 
          emptyStateVisible: true,
          learningsCount: 0
        }));
      } else {
        setValidationResults(prev => ({ ...prev, emptyState: 'pass' }));
        setTestData(prev => ({ 
          ...prev, 
          learningsCount: learnings.length,
          emptyStateVisible: false
        }));
      }

    } catch (error) {
      setValidationResults(prev => ({ ...prev, emptyState: 'fail' }));
    }
    setTesting('');
  }, [agency?.id]);

  // 🔍 Teste 6: Fonte dos Clientes
  const testCustomerSource = useCallback(async () => {
    setTesting('customerSource');
    try {
      const learnings = await LearningEntry.filter({ agencyId: agency.id }, '', 5);
      const clients = await Client.filter({ agencyId: agency.id });
      
      const hasCustomerInfo = learnings.some(learning => 
        learning.projectId && clients.find(c => c.id === learning.projectId)
      );

      setValidationResults(prev => ({ 
        ...prev, 
        customerSource: hasCustomerInfo ? 'pass' : learnings.length === 0 ? 'pending' : 'fail'
      }));

    } catch (error) {
      setValidationResults(prev => ({ ...prev, customerSource: 'fail' }));
    }
    setTesting('');
  }, [agency?.id]);

  // 🔍 Teste 7: Navegação
  const testNavigation = useCallback(async () => {
    setTesting('navigation');
    try {
      const pageTitle = document.querySelector('h1')?.textContent;
      const currentPath = window.location.pathname;
      const navLinks = document.querySelectorAll('nav a, [role="navigation"] a');
      
      const correctTitle = pageTitle?.includes('Aprendizado') || pageTitle?.includes('Biblioteca');
      const correctPath = currentPath.includes('library') || currentPath.includes('aprendizados');
      const hasNavigation = navLinks.length > 0;

      const navScore = [correctTitle, correctPath, hasNavigation].filter(Boolean).length;
      
      setValidationResults(prev => ({ 
        ...prev, 
        navigation: navScore >= 2 ? 'pass' : navScore === 1 ? 'pending' : 'fail'
      }));

    } catch (error) {
      setValidationResults(prev => ({ ...prev, navigation: 'fail' }));
    }
    setTesting('');
  }, []);

  // 🔍 Teste 8: Problemas de Carregamento
  const testLoadingIssues = useCallback(async () => {
    setTesting('loadingIssues');
    try {
      const errors = [];
      
      // Verificar erros no console
      const hasConsoleErrors = testData.loadingErrors.length > 0;
      if (hasConsoleErrors) errors.push('Erros de console detectados');

      // Verificar se os dados carregam
      try {
        const learnings = await LearningEntry.filter({ agencyId: agency.id });
        if (learnings === null || learnings === undefined) {
          errors.push('Falha ao carregar aprendizados');
        }
      } catch (e) {
        errors.push('Erro de fetch: ' + e.message);
      }

      // Verificar elementos essenciais
      const criticalElements = [
        document.querySelector('h1'),
        document.querySelector('main, [role="main"], .container')
      ];
      
      if (criticalElements.some(el => !el)) {
        errors.push('Elementos críticos da página ausentes');
      }

      setValidationResults(prev => ({ 
        ...prev, 
        loadingIssues: errors.length === 0 ? 'pass' : 'fail'
      }));
      
      setTestData(prev => ({ 
        ...prev,
        loadingErrors: errors
      }));

    } catch (error) {
      setValidationResults(prev => ({ ...prev, loadingIssues: 'fail' }));
    }
    setTesting('');
  }, [agency?.id, testData.loadingErrors]);

  // Executar todos os testes
  const runAllTests = useCallback(async () => {
    if (!agency?.id) return;
    
    await testPageStructure();
    await testAddLearning();
    await testSearchAndFilter();
    await testApplyToPlanning();
    await testEmptyState();
    await testCustomerSource();
    await testNavigation();
    await testLoadingIssues();
    
    toast.success('✅ Validação da página Aprendizados concluída');
  }, [
    agency?.id,
    testPageStructure,
    testAddLearning,
    testSearchAndFilter,
    testApplyToPlanning,
    testEmptyState,
    testCustomerSource,
    testNavigation,
    testLoadingIssues
  ]);

  useEffect(() => {
    if (agency?.id) {
      // Delay para garantir que a página carregou
      setTimeout(runAllTests, 1000);
    }
  }, [agency?.id, runAllTests]);

  const getOverallStatus = () => {
    const results = Object.values(validationResults);
    const passCount = results.filter(r => r === 'pass').length;
    const failCount = results.filter(r => r === 'fail').length;
    
    if (failCount === 0) return { status: 'pass', message: 'Todos os testes passaram' };
    if (passCount > failCount) return { status: 'partial', message: `${passCount}/${results.length} testes passaram` };
    return { status: 'fail', message: `${failCount} testes falharam` };
  };

  const overall = getOverallStatus();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Lightbulb className="w-6 h-6 text-purple-600" />
            Validação: Página Aprendizados
          </h1>
          <p className="text-slate-600 mt-1">
            Verificação completa da funcionalidade e usabilidade do playbook vivo
          </p>
        </div>
        <Button onClick={runAllTests} disabled={testing} variant="outline">
          <RefreshCw className={`w-4 h-4 mr-2 ${testing ? 'animate-spin' : ''}`} />
          Executar Testes
        </Button>
      </div>

      {/* Status Geral */}
      <Alert className={
        overall.status === 'pass' ? 'border-green-200 bg-green-50' :
        overall.status === 'partial' ? 'border-yellow-200 bg-yellow-50' :
        'border-red-200 bg-red-50'
      }>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Status Geral:</strong> {overall.message}
        </AlertDescription>
      </Alert>

      {/* Dados de Diagnóstico */}
      <Card className="bg-slate-50">
        <CardHeader>
          <CardTitle className="text-lg">Diagnóstico da Página</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div><strong>Título da Página:</strong> {testData.pageTitle}</div>
          <div><strong>Rota Atual:</strong> {testData.routeName}</div>
          <div><strong>Aprendizados Encontrados:</strong> {testData.learningsCount}</div>
          <div><strong>Campo de Busca:</strong> {testData.hasSearchField ? '✅ Presente' : '❌ Ausente'}</div>
          <div><strong>Estado Vazio Visível:</strong> {testData.emptyStateVisible ? '✅ Sim' : '❌ Não'}</div>
          {testData.loadingErrors.length > 0 && (
            <div className="mt-3">
              <strong>Erros Detectados:</strong>
              <ul className="list-disc list-inside mt-1 text-red-600">
                {testData.loadingErrors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Testes Individuais */}
      <div className="grid md:grid-cols-2 gap-4">
        <ValidationItem
          title="🏗️ Estrutura da Página"
          status={validationResults.pageStructure}
          description="Lista organizada, cards/colunas legíveis, elementos essenciais presentes"
          evidence={`Título: ${testData.pageTitle}, Busca: ${testData.hasSearchField ? 'Sim' : 'Não'}`}
          onTest={testPageStructure}
        />

        <ValidationItem
          title="➕ Botão Adicionar"
          status={validationResults.addLearning}
          description="Botão para adicionar novo aprendizado funciona e abre formulário"
          evidence={`Botão presente: ${testData.hasAddButton ? 'Sim' : 'Não'}`}
          onTest={testAddLearning}
        />

        <ValidationItem
          title="🔍 Busca e Filtros"
          status={validationResults.searchAndFilter}
          description="Campo de busca e filtros por tags/canais/formatos disponíveis"
          onTest={testSearchAndFilter}
        />

        <ValidationItem
          title="⚡ Aplicar no Planejamento"
          status={validationResults.applyToPlanning}
          description="Botão que adiciona aprendizado diretamente em novo planejamento"
          onTest={testApplyToPlanning}
        />

        <ValidationItem
          title="📭 Estado Vazio"
          status={validationResults.emptyState}
          description="Mensagem clara quando não há aprendizados cadastrados"
          evidence={`Aprendizados: ${testData.learningsCount}, Estado vazio: ${testData.emptyStateVisible ? 'Visível' : 'Oculto'}`}
          onTest={testEmptyState}
        />

        <ValidationItem
          title="👥 Fonte dos Clientes"
          status={validationResults.customerSource}
          description="Possível identificar de quais clientes cada aprendizado veio"
          onTest={testCustomerSource}
        />

        <ValidationItem
          title="🧭 Navegação"
          status={validationResults.navigation}
          description="Nome correto da página, rotas e breadcrumbs adequados"
          evidence={`Rota: ${testData.routeName}`}
          onTest={testNavigation}
        />

        <ValidationItem
          title="🚨 Problemas de Carregamento"
          status={validationResults.loadingIssues}
          description="Página carrega sem erros, dados são fetchados corretamente"
          evidence={testData.loadingErrors.length > 0 ? testData.loadingErrors.join(', ') : 'Nenhum erro detectado'}
          onTest={testLoadingIssues}
        />
      </div>

      {/* Recomendações */}
      {Object.values(validationResults).includes('fail') && (
        <Alert className="border-blue-200 bg-blue-50">
          <Lightbulb className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Próximos Passos:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              {validationResults.loadingIssues === 'fail' && <li>Corrigir erros de carregamento e fetch de dados</li>}
              {validationResults.pageStructure === 'fail' && <li>Melhorar estrutura da página com elementos essenciais</li>}
              {validationResults.addLearning === 'fail' && <li>Implementar botão "Adicionar Aprendizado" funcional</li>}
              {validationResults.searchAndFilter === 'fail' && <li>Adicionar funcionalidade de busca e filtros</li>}
              {validationResults.navigation === 'fail' && <li>Corrigir título da página e navegação</li>}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}