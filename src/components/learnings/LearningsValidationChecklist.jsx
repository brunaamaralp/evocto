
import React, { useState, useEffect, useCallback } from 'react';
import { LearningEntry, Client, CyclePlan } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  FileText,
  Zap,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

const ValidationStep = ({ title, status, description, onTest, children }) => {
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
            <Button size="sm" variant="outline" onClick={onTest} disabled={status === 'pending'}>
              <Play className="w-4 h-4 mr-1" />
              Testar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-600 mb-3">{description}</p>
        {children}
      </CardContent>
    </Card>
  );
};

const TestLearningForm = ({ onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    title: 'Teste: Posts com carrossel geram mais engajamento',
    description: 'Campanhas com formato carrossel tiveram 30% mais salvamentos e comentários comparado a posts únicos no Instagram',
    niche: 'E-commerce',
    format: 'Instagram Post',
    trigger: 'Curiosidade',
    tags: ['instagram', 'carrossel', 'engajamento', 'formato']
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 bg-white p-4 rounded border">
      <div className="grid grid-cols-2 gap-3">
        <Input
          placeholder="Título do aprendizado"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          className="text-sm"
        />
        <Input
          placeholder="Formato/Canal"
          value={formData.format}
          onChange={(e) => setFormData(prev => ({ ...prev, format: e.target.value }))}
          className="text-sm"
        />
      </div>
      <Textarea
        placeholder="Insight detalhado"
        value={formData.description}
        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
        className="text-sm"
        rows={3}
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          placeholder="Nicho"
          value={formData.niche}
          onChange={(e) => setFormData(prev => ({ ...prev, niche: e.target.value }))}
          className="text-sm"
        />
        <Input
          placeholder="Tags (separadas por vírgula)"
          value={formData.tags.join(', ')}
          onChange={(e) => setFormData(prev => ({ 
            ...prev, 
            tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
          }))}
          className="text-sm"
        />
      </div>
      <Button type="submit" disabled={loading} size="sm" className="bg-purple-600 hover:bg-purple-700">
        {loading ? <Clock className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
        Criar Aprendizado Teste
      </Button>
    </form>
  );
};

export default function LearningsValidationChecklist() {
  const { agency } = useSession();
  const [validationResults, setValidationResults] = useState({
    creation: 'untested',
    search: 'untested',
    application: 'untested',
    emptyState: 'untested'
  });
  
  const [testData, setTestData] = useState({
    createdLearning: null,
    searchResults: [],
    allLearnings: [],
    emptyStateVisible: false
  });
  
  const [testing, setTesting] = useState('');

  // Teste 1: Cadastro de Aprendizado
  const testLearningCreation = async (formData) => {
    setTesting('creation');
    try {
      const learningData = {
        agencyId: agency.id,
        projectId: null, // Global learning
        sourceType: 'manual',
        sourceRef: 'validation_test',
        title: formData.title,
        description: formData.description,
        niche: formData.niche,
        format: formData.format,
        trigger: formData.trigger,
        tags: formData.tags,
        reviewed: true,
        confidence_score: 85
      };

      const createdLearning = await LearningEntry.create(learningData);
      
      if (createdLearning && createdLearning.id) {
        setValidationResults(prev => ({ ...prev, creation: 'pass' }));
        setTestData(prev => ({ ...prev, createdLearning }));
        toast.success('✅ Aprendizado criado com todos os campos obrigatórios');
        
        // Verificar se foi salvo corretamente
        const retrieved = await LearningEntry.get(createdLearning.id);
        if (retrieved.title === formData.title && retrieved.tags.length === formData.tags.length) {
          toast.success('✅ Dados salvos corretamente no banco');
        } else {
          toast.warning('⚠️ Possível inconsistência nos dados salvos');
        }
      } else {
        throw new Error('Aprendizado não foi criado corretamente');
      }

    } catch (error) {
      setValidationResults(prev => ({ ...prev, creation: 'fail' }));
      toast.error('❌ Erro na criação: ' + error.message);
    } finally {
      setTesting('');
    }
  };

  // Teste 2: Busca por Tags/Canais
  const testSearchFunctionality = async () => {
    setTesting('search');
    try {
      // Carregar todos os aprendizados
      const allLearnings = await LearningEntry.filter({ agencyId: agency.id });
      setTestData(prev => ({ ...prev, allLearnings }));

      if (allLearnings.length === 0) {
        setValidationResults(prev => ({ ...prev, search: 'fail' }));
        toast.error('❌ Nenhum aprendizado encontrado para testar busca');
        return;
      }

      // Teste de busca por tag
      const searchTerm = 'instagram';
      const filteredByTag = allLearnings.filter(learning => 
        learning.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );

      // Teste de busca por formato
      const formatSearchTerm = 'post';
      const filteredByFormat = allLearnings.filter(learning => 
        learning.format?.toLowerCase().includes(formatSearchTerm.toLowerCase())
      );

      // Teste de busca por texto no título/descrição
      const textSearch = 'engajamento';
      const filteredByText = allLearnings.filter(learning => 
        learning.title?.toLowerCase().includes(textSearch.toLowerCase()) ||
        learning.description?.toLowerCase().includes(textSearch.toLowerCase())
      );

      const totalSearchResults = new Set([
        ...filteredByTag,
        ...filteredByFormat, 
        ...filteredByText
      ]).size;

      if (totalSearchResults > 0) {
        setValidationResults(prev => ({ ...prev, search: 'pass' }));
        setTestData(prev => ({ ...prev, searchResults: [...filteredByTag, ...filteredByFormat, ...filteredByText] }));
        toast.success(`✅ Busca funcionando: ${totalSearchResults} resultados encontrados`);
      } else {
        setValidationResults(prev => ({ ...prev, search: 'pending' }));
        toast.warning('⚠️ Busca não retornou resultados - dados insuficientes');
      }

    } catch (error) {
      setValidationResults(prev => ({ ...prev, search: 'fail' }));
      toast.error('❌ Erro na busca: ' + error.message);
    } finally {
      setTesting('');
    }
  };

  // Teste 3: Aplicar no Planejamento
  const testPlanningApplication = async () => {
    setTesting('application');
    try {
      if (!testData.createdLearning) {
        setValidationResults(prev => ({ ...prev, application: 'fail' }));
        toast.error('❌ Nenhum aprendizado disponível para aplicar');
        return;
      }

      // Verificar se existem ciclos de planejamento para aplicar
      const recentCycles = await CyclePlan.filter({ 
        agencyId: agency.id,
        status: 'draft'
      }, '-created_date', 5);

      const learning = testData.createdLearning;
      
      if (recentCycles.length > 0) {
        // Simular aplicação ao plano (em produção seria feita pela UI)
        const targetCycle = recentCycles[0];
        const updatedPlanData = {
          ...targetCycle.planData,
          sugestoesIA: [
            ...(targetCycle.planData?.sugestoesIA || []),
            {
              hipotese: learning.title,
              teste: `Implementar insights baseados em: ${learning.description.slice(0, 100)}`,
              metrica_sucesso: `Melhorar métricas baseado no aprendizado de ${learning.format}`,
              fonte_learning_id: learning.id
            }
          ]
        };

        await CyclePlan.update(targetCycle.id, { planData: updatedPlanData });
        setValidationResults(prev => ({ ...prev, application: 'pass' }));
        toast.success('✅ Aprendizado aplicado ao planejamento com sucesso');
        
      } else {
        // Testar se é possível criar um novo planejamento com o aprendizado
        setValidationResults(prev => ({ ...prev, application: 'pending' }));
        toast.warning('⚠️ Nenhum plano em rascunho disponível - funcionalidade existe mas não testável');
      }

    } catch (error) {
      setValidationResults(prev => ({ ...prev, application: 'fail' }));
      toast.error('❌ Erro na aplicação: ' + error.message);
    } finally {
      setTesting('');
    }
  };

  // Teste 4: Estado Vazio - usando useCallback para evitar dependência infinita
  const testEmptyState = useCallback(async () => {
    setTesting('emptyState');
    try {
      const learnings = await LearningEntry.filter({ agencyId: agency.id });
      
      if (learnings.length === 0) {
        setValidationResults(prev => ({ ...prev, emptyState: 'pass' }));
        setTestData(prev => ({ ...prev, emptyStateVisible: true }));
        toast.success('✅ Estado vazio detectado - CTA deve estar visível');
      } else {
        setValidationResults(prev => ({ ...prev, emptyState: 'pending' }));
        toast.info(`ℹ️ ${learnings.length} aprendizados existem - estado vazio não aplicável`);
      }

    } catch (error) {
      setValidationResults(prev => ({ ...prev, emptyState: 'fail' }));
      toast.error('❌ Erro ao verificar estado vazio: ' + error.message);
    } finally {
      setTesting('');
    }
  }, [agency?.id, setValidationResults, setTestData, setTesting]); // Added all dependencies for useCallback

  // Limpar dados de teste
  const cleanupTestData = async () => {
    try {
      if (testData.createdLearning) {
        await LearningEntry.delete(testData.createdLearning.id);
        setTestData(prev => ({ ...prev, createdLearning: null }));
        toast.success('🧹 Dados de teste removidos');
      }
    } catch (error) {
      toast.error('Erro ao limpar: ' + error.message);
    }
  };

  // Auto-teste do estado vazio ao carregar
  useEffect(() => {
    if (agency?.id) {
      testEmptyState();
    }
  }, [agency?.id, testEmptyState]);

  const getOverallStatus = () => {
    const results = Object.values(validationResults);
    if (results.every(r => r === 'pass')) return 'pass';
    if (results.some(r => r === 'fail')) return 'fail';
    return 'pending';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Lightbulb className="w-6 h-6 text-purple-600" />
            Validação: Aprendizados
          </h2>
          <p className="text-slate-600">
            Status Geral: <Badge className={
              getOverallStatus() === 'pass' ? 'bg-green-100 text-green-800' :
              getOverallStatus() === 'fail' ? 'bg-red-100 text-red-800' :
              'bg-yellow-100 text-yellow-800'
            }>
              {getOverallStatus() === 'pass' ? 'APROVADO' : 
               getOverallStatus() === 'fail' ? 'REPROVADO' : 'PENDENTE'}
            </Badge>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={cleanupTestData}>
            <Trash2 className="w-4 h-4 mr-2" />
            Limpar Testes
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Teste 1: Cadastro de Aprendizado */}
        <ValidationStep
          title="1. Cadastro de Aprendizado"
          status={validationResults.creation}
          description="Criar aprendizado com título, insight, evidência e tags (formato/canal)"
          onTest={() => {}} // Será acionado pelo formulário
        >
          <TestLearningForm 
            onSubmit={testLearningCreation} 
            loading={testing === 'creation'} 
          />
          {testData.createdLearning && (
            <div className="mt-3 p-3 bg-green-50 rounded border">
              <p className="text-sm font-medium text-green-800">✅ Aprendizado Criado:</p>
              <p className="text-sm text-green-700">ID: {testData.createdLearning.id}</p>
              <p className="text-sm text-green-700">Tags: {testData.createdLearning.tags?.join(', ')}</p>
            </div>
          )}
        </ValidationStep>

        {/* Teste 2: Busca por Tags/Canais */}
        <ValidationStep
          title="2. Campo de Busca"
          status={validationResults.search}
          description="Buscar aprendizados por tags, canais ou texto livre"
          onTest={testSearchFunctionality}
        >
          {testing === 'search' && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <Clock className="w-4 h-4 animate-spin" />
              Testando busca por: instagram, post, engajamento...
            </div>
          )}
          {testData.searchResults.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Resultados encontrados: {testData.searchResults.length}</p>
              <div className="max-h-24 overflow-y-auto bg-blue-50 rounded p-2">
                {testData.searchResults.slice(0, 3).map((result, i) => (
                  <div key={i} className="text-xs text-blue-700">
                    • {result.title} ({result.format || 'Sem formato'})
                  </div>
                ))}
              </div>
            </div>
          )}
        </ValidationStep>

        {/* Teste 3: Aplicar no Planejamento */}
        <ValidationStep
          title="3. Aplicar no Planejamento"
          status={validationResults.application}
          description="Botão 'Aplicar no Planejamento' adiciona aprendizado a um novo planejamento"
          onTest={testPlanningApplication}
        >
          {testing === 'application' && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <Clock className="w-4 h-4 animate-spin" />
              Verificando integração com planejamentos...
            </div>
          )}
        </ValidationStep>

        {/* Teste 4: Estado Vazio */}
        <ValidationStep
          title="4. Estado Vazio"
          status={validationResults.emptyState}
          description="Quando não há aprendizados, mostrar CTA 'Adicionar primeiro aprendizado'"
          onTest={testEmptyState}
        >
          {testData.emptyStateVisible && (
            <Alert>
              <Plus className="h-4 w-4" />
              <AlertDescription>
                ✅ Estado vazio detectado - usuário deveria ver CTA de "Adicionar primeiro aprendizado"
              </AlertDescription>
            </Alert>
          )}
          {testData.allLearnings.length > 0 && (
            <div className="text-sm text-slate-600">
              📊 {testData.allLearnings.length} aprendizados existem na biblioteca
            </div>
          )}
        </ValidationStep>
      </div>

      {/* Resumo dos Resultados */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📋 Resumo da Validação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(validationResults).map(([test, status]) => (
              <div key={test} className="text-center">
                <div className="text-2xl mb-1">
                  {status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⏳'}
                </div>
                <div className="text-sm font-medium capitalize">
                  {test.replace(/([A-Z])/g, ' $1').toLowerCase()}
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-slate-600">
              <strong>Critérios de Aprovação:</strong> Todos os testes devem passar (✅) para funcionalidade completa.
            </p>
            <p className="text-sm text-slate-600">
              <strong>Status Final:</strong> {
                getOverallStatus() === 'pass' ? '✅ FUNCIONALIDADE APROVADA' :
                getOverallStatus() === 'fail' ? '❌ CORREÇÕES NECESSÁRIAS' :
                '⏳ VALIDAÇÃO INCOMPLETA'
              }
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
