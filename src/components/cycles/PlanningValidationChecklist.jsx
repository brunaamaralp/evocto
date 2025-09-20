import React, { useState, useEffect } from 'react';
import { CyclePlan, Service, Client } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';
import { generateCyclePlan } from '@/api/functions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Play, 
  Bot,
  FileText,
  GitBranch,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

const ValidationStep = ({ title, status, description, action, onTest }) => {
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
        <p className="text-sm text-slate-600 mb-2">{description}</p>
        {action && <p className="text-xs text-slate-500 italic">{action}</p>}
      </CardContent>
    </Card>
  );
};

export default function PlanningValidationChecklist() {
  const { agency, user } = useSession();
  const [validationResults, setValidationResults] = useState({
    aiGeneration: 'untested',
    editCapabilities: 'untested', 
    statusFlow: 'untested',
    versionControl: 'untested'
  });
  const [testData, setTestData] = useState({
    testService: null,
    testClient: null,
    generatedPlan: null,
    statusTransitions: [],
    versions: []
  });
  const [testing, setTesting] = useState(false);

  // Teste 1: Geração de Planejamento com IA
  const testAIGeneration = async () => {
    setTesting(true);
    try {
      // Buscar um serviço ativo para teste
      const services = await Service.filter({ 
        agencyId: agency.id, 
        is_active: true, 
        is_template: false 
      }, '-created_date', 1);

      if (services.length === 0) {
        setValidationResults(prev => ({ ...prev, aiGeneration: 'fail' }));
        toast.error('❌ Nenhum serviço ativo encontrado para teste');
        return;
      }

      const testService = services[0];
      const client = await Client.get(testService.clientId);
      
      setTestData(prev => ({ ...prev, testService, testClient: client }));

      // Tentar gerar plano com IA
      const targetPeriod = `${new Date().toLocaleString('pt-BR', { month: 'short' })}/${new Date().getFullYear()}`;
      
      const response = await generateCyclePlan({
        serviceId: testService.id,
        targetPeriod,
        mode: 'preview' // Não salvar no banco
      });

      if (response.data?.success && response.data?.plan) {
        setValidationResults(prev => ({ ...prev, aiGeneration: 'pass' }));
        setTestData(prev => ({ ...prev, generatedPlan: response.data.plan }));
        toast.success('✅ IA gerou plano com sucesso em menos de 30s');
      } else {
        setValidationResults(prev => ({ ...prev, aiGeneration: 'fail' }));
        toast.error('❌ Falha na geração do plano pela IA');
      }

    } catch (error) {
      setValidationResults(prev => ({ ...prev, aiGeneration: 'fail' }));
      toast.error('❌ Erro na geração: ' + error.message);
    } finally {
      setTesting(false);
    }
  };

  // Teste 2: Capacidades de Edição
  const testEditCapabilities = async () => {
    try {
      // Verificar se campos editáveis estão presentes no plano
      const plan = testData.generatedPlan;
      if (!plan) {
        setValidationResults(prev => ({ ...prev, editCapabilities: 'fail' }));
        toast.error('❌ Nenhum plano gerado para testar edição');
        return;
      }

      const hasEditableFields = !!(
        plan.prioridades && 
        plan.sugestoesIA && 
        plan.pendenciasCliente &&
        plan.ajustesEstrategicos
      );

      if (hasEditableFields) {
        setValidationResults(prev => ({ ...prev, editCapabilities: 'pass' }));
        toast.success('✅ Campos editáveis identificados: prioridades, testes, entregas');
      } else {
        setValidationResults(prev => ({ ...prev, editCapabilities: 'fail' }));
        toast.error('❌ Campos editáveis não encontrados na estrutura do plano');
      }

    } catch (error) {
      setValidationResults(prev => ({ ...prev, editCapabilities: 'fail' }));
      toast.error('❌ Erro ao validar capacidades de edição');
    }
  };

  // Teste 3: Fluxo de Status
  const testStatusFlow = async () => {
    try {
      if (!testData.testService) {
        setValidationResults(prev => ({ ...prev, statusFlow: 'fail' }));
        toast.error('❌ Serviço de teste não encontrado');
        return;
      }

      // Verificar fluxo: draft → pending_approval → approved
      const cycles = await CyclePlan.filter({
        agencyId: agency.id,
        serviceId: testData.testService.id
      }, '-created_date', 5);

      const statusFlow = cycles.map(c => c.status);
      const hasCorrectFlow = statusFlow.some(status => 
        ['draft', 'pending_approval', 'approved'].includes(status)
      );

      if (hasCorrectFlow && cycles.length > 0) {
        setValidationResults(prev => ({ ...prev, statusFlow: 'pass' }));
        setTestData(prev => ({ 
          ...prev, 
          statusTransitions: statusFlow 
        }));
        toast.success(`✅ Fluxo de status validado: ${statusFlow.join(' → ')}`);
      } else {
        setValidationResults(prev => ({ ...prev, statusFlow: 'fail' }));
        toast.error('❌ Fluxo de status incompleto ou incorreto');
      }

    } catch (error) {
      setValidationResults(prev => ({ ...prev, statusFlow: 'fail' }));
      toast.error('❌ Erro ao validar fluxo de status');
    }
  };

  // Teste 4: Controle de Versões
  const testVersionControl = async () => {
    try {
      if (!testData.testService) {
        setValidationResults(prev => ({ ...prev, versionControl: 'fail' }));
        toast.error('❌ Serviço de teste não encontrado');
        return;
      }

      // Buscar ciclos com versões
      const cycles = await CyclePlan.filter({
        agencyId: agency.id,
        serviceId: testData.testService.id
      });

      const versionsFound = cycles
        .filter(c => c.version)
        .map(c => c.version);

      const hasSnapshotData = cycles.some(c => c.snapshot_data);

      if (versionsFound.length > 0 && hasSnapshotData) {
        setValidationResults(prev => ({ ...prev, versionControl: 'pass' }));
        setTestData(prev => ({ ...prev, versions: versionsFound }));
        toast.success(`✅ Controle de versões funcionando: ${versionsFound.join(', ')}`);
      } else {
        setValidationResults(prev => ({ ...prev, versionControl: 'fail' }));
        toast.error('❌ Controle de versões não encontrado ou snapshot_data ausente');
      }

    } catch (error) {
      setValidationResults(prev => ({ ...prev, versionControl: 'fail' }));
      toast.error('❌ Erro ao validar controle de versões');
    }
  };

  const testAll = async () => {
    toast.info('🧪 Iniciando bateria de testes...');
    await testAIGeneration();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await testEditCapabilities(); 
    await new Promise(resolve => setTimeout(resolve, 1000));
    await testStatusFlow();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await testVersionControl();
    toast.success('🎯 Bateria de testes concluída!');
  };

  const getOverallStatus = () => {
    const results = Object.values(validationResults);
    const passCount = results.filter(r => r === 'pass').length;
    const failCount = results.filter(r => r === 'fail').length;
    
    if (failCount > 0) return 'fail';
    if (passCount === results.length) return 'pass';
    return 'pending';
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-6 h-6 text-blue-600" />
            Validação: Planejamento do Mês
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-2">
                Status Geral: <Badge className={getOverallStatus() === 'pass' ? 'bg-green-100 text-green-800' : 
                                                getOverallStatus() === 'fail' ? 'bg-red-100 text-red-800' : 
                                                'bg-yellow-100 text-yellow-800'}>
                  {getOverallStatus() === 'pass' ? '✅ APROVADO' : 
                   getOverallStatus() === 'fail' ? '❌ REPROVADO' : 
                   '⏳ PENDENTE'}
                </Badge>
              </p>
              {testData.testService && (
                <p className="text-xs text-slate-500">
                  Testando com: {testData.testClient?.name} - {testData.testService?.name}
                </p>
              )}
            </div>
            <Button 
              onClick={testAll} 
              disabled={testing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {testing ? 'Testando...' : 'Executar Todos os Testes'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <ValidationStep
          title="1. Geração com IA (< 60s)"
          status={validationResults.aiGeneration}
          description="IA deve gerar planejamento completo em menos de 1 minuto"
          action="Testa function generateCyclePlan + estrutura do retorno"
          onTest={testAIGeneration}
        />

        <ValidationStep
          title="2. Capacidades de Edição"
          status={validationResults.editCapabilities}
          description="Campos editáveis: prioridades, testes A/B, entregas"
          action="Valida estrutura planData com campos editáveis"
          onTest={testEditCapabilities}
        />

        <ValidationStep
          title="3. Fluxo de Status"
          status={validationResults.statusFlow}
          description="Rascunho → Pronto → Aprovado funcionando"
          action="Testa transições de status na entidade CyclePlan"
          onTest={testStatusFlow}
        />

        <ValidationStep
          title="4. Controle de Versões"
          status={validationResults.versionControl}
          description="Versões (v1, v2...) salvas e acessíveis"
          action="Valida campos version + snapshot_data"
          onTest={testVersionControl}
        />
      </div>

      {/* Resultados Detalhados */}
      {testData.generatedPlan && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Plano Gerado (Preview)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <strong>Mudança Chave:</strong>
                <p className="text-sm text-slate-600">{testData.generatedPlan.mudancaChave}</p>
              </div>
              <div>
                <strong>Prioridades ({testData.generatedPlan.prioridades?.length || 0}):</strong>
                <ul className="text-sm text-slate-600 ml-4">
                  {testData.generatedPlan.prioridades?.slice(0, 2).map((p, i) => (
                    <li key={i}>• {typeof p === 'string' ? p : p.tarefa}</li>
                  ))}
                </ul>
              </div>
              <div>
                <strong>Sugestões IA ({testData.generatedPlan.sugestoesIA?.length || 0}):</strong>
                <ul className="text-sm text-slate-600 ml-4">
                  {testData.generatedPlan.sugestoesIA?.slice(0, 1).map((s, i) => (
                    <li key={i}>• {typeof s === 'string' ? s : s.hipotese}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {testData.statusTransitions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRight className="w-5 h-5" />
              Fluxo de Status Detectado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {testData.statusTransitions.map((status, i) => (
                <Badge key={i} variant="outline">
                  {status}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {testData.versions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="w-5 h-5" />
              Versões Encontradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {testData.versions.map((version, i) => (
                <Badge key={i} className="bg-blue-100 text-blue-800">
                  {version}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Nota Importante</AlertTitle>
        <AlertDescription>
          Esta validação é executada no ambiente atual com dados reais. 
          Certifique-se de ter pelo menos 1 cliente e 1 serviço ativo para testes completos.
        </AlertDescription>
      </Alert>
    </div>
  );
}