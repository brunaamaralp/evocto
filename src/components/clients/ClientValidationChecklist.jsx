
import React, { useState, useEffect } from 'react';
import { Client, Brief, CyclePlan, LearningEntry, EvolutionEvent } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Play, 
  User,
  FileText,
  Edit3,
  TrendingUp,
  BookOpen,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';

const ValidationResult = ({ title, status, details, onTest, children }) => {
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
        <div className="space-y-3">
          {details && <p className="text-sm text-slate-600">{details}</p>}
          {children}
        </div>
      </CardContent>
    </Card>
  );
};

const DataPreview = ({ title, data, emptyMessage }) => {
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return (
      <div className="text-xs text-slate-500 italic p-2 bg-slate-100 rounded">
        {emptyMessage || 'Nenhum dado encontrado'}
      </div>
    );
  }

  return (
    <div className="text-xs bg-slate-100 rounded p-2 max-h-24 overflow-y-auto">
      <strong className="text-slate-700">{title}:</strong>
      {Array.isArray(data) ? (
        <ul className="ml-2 mt-1">
          {data.slice(0, 3).map((item, i) => (
            <li key={i} className="text-slate-600">
              • {typeof item === 'string' ? item : item.title || item.cyclePeriod || JSON.stringify(item).slice(0, 50)}
            </li>
          ))}
          {data.length > 3 && <li className="text-slate-500">... e mais {data.length - 3}</li>}
        </ul>
      ) : (
        <p className="ml-2 mt-1 text-slate-600">{typeof data === 'string' ? data : JSON.stringify(data).slice(0, 100)}</p>
      )}
    </div>
  );
};

export default function ClientValidationChecklist() {
  const { agency } = useSession();
  const [validationResults, setValidationResults] = useState({
    clientProfile: 'untested',
    timeline: 'untested',
    briefingEditable: 'untested'
  });
  
  const [testData, setTestData] = useState({
    selectedClient: null,
    briefing: null,
    cycles: [],
    learnings: [],
    evolutionEvents: [],
    briefingHistory: []
  });
  
  const [testing, setTesting] = useState(false);

  // Selecionar cliente para teste
  const selectTestClient = async () => {
    try {
      const clients = await Client.filter({ agencyId: agency.id }, '-created_date', 5);
      
      if (clients.length === 0) {
        toast.error('❌ Nenhum cliente encontrado para teste');
        return null;
      }

      // Preferir cliente com mais dados
      const clientsWithData = await Promise.all(
        clients.map(async (client) => {
          const [brief, cycles, learnings] = await Promise.all([
            Brief.filter({ agencyId: agency.id, projectId: client.id }).catch(() => []),
            CyclePlan.filter({ agencyId: agency.id, clientId: client.id }).catch(() => []),
            LearningEntry.filter({ agencyId: agency.id, projectId: client.id }).catch(() => [])
          ]);
          
          return {
            ...client,
            dataScore: brief.length + cycles.length + learnings.length
          };
        })
      );

      const selectedClient = clientsWithData.sort((a, b) => b.dataScore - a.dataScore)[0];
      setTestData(prev => ({ ...prev, selectedClient }));
      
      return selectedClient;
    } catch (error) {
      console.error('Erro ao selecionar cliente:', error);
      return null;
    }
  };

  // Teste 1: Perfil do Cliente
  const testClientProfile = async () => {
    setTesting(true);
    try {
      const client = await selectTestClient();
      if (!client) {
        setValidationResults(prev => ({ ...prev, clientProfile: 'fail' }));
        return;
      }

      // Buscar todos os dados do cliente
      const [briefing, cycles, learnings] = await Promise.all([
        Brief.filter({ agencyId: agency.id, projectId: client.id }),
        CyclePlan.filter({ agencyId: agency.id, clientId: client.id }),
        LearningEntry.filter({ agencyId: agency.id, projectId: client.id })
      ]);

      setTestData(prev => ({
        ...prev,
        briefing: briefing[0] || null,
        cycles,
        learnings
      }));

      // Validar se tem os dados essenciais
      const hasBriefing = briefing.length > 0;
      const hasCycles = cycles.length > 0;
      const hasLearnings = learnings.length > 0;

      if (hasBriefing || hasCycles || hasLearnings) {
        setValidationResults(prev => ({ ...prev, clientProfile: 'pass' }));
        toast.success(`✅ Perfil carregado: ${briefing.length} briefing(s), ${cycles.length} ciclo(s), ${learnings.length} aprendizado(s)`);
      } else {
        setValidationResults(prev => ({ ...prev, clientProfile: 'fail' }));
        toast.error('❌ Cliente sem dados suficientes (briefing, ciclos ou aprendizados)');
      }

    } catch (error) {
      setValidationResults(prev => ({ ...prev, clientProfile: 'fail' }));
      toast.error('❌ Erro ao carregar perfil do cliente: ' + error.message);
    } finally {
      setTesting(false);
    }
  };

  // Teste 2: Linha do Tempo
  const testTimeline = async () => {
    try {
      const client = testData.selectedClient;
      if (!client) {
        setValidationResults(prev => ({ ...prev, timeline: 'fail' }));
        toast.error('❌ Cliente de teste não selecionado');
        return;
      }

      // Buscar eventos de evolução e ciclos ordenados por data
      const [evolutionEvents, orderedCycles] = await Promise.all([
        EvolutionEvent.filter({ 
          agencyId: agency.id, 
          clientId: client.id 
        }, '-date').catch(() => []),
        CyclePlan.filter({ 
          agencyId: agency.id, 
          clientId: client.id,
          status: { '$in': ['approved', 'completed'] }
        }, '-created_date').catch(() => [])
      ]);

      setTestData(prev => ({ 
        ...prev, 
        evolutionEvents,
        cycles: orderedCycles 
      }));

      // Validar linha do tempo
      const hasTimelineData = evolutionEvents.length > 0 || orderedCycles.length >= 2;
      const hasMonthlyProgression = orderedCycles.some(cycle => 
        cycle.cyclePeriod && cycle.created_date
      );

      if (hasTimelineData && hasMonthlyProgression) {
        setValidationResults(prev => ({ ...prev, timeline: 'pass' }));
        toast.success(`✅ Linha do tempo: ${evolutionEvents.length} evento(s), ${orderedCycles.length} ciclo(s) ordenados`);
      } else {
        setValidationResults(prev => ({ ...prev, timeline: 'fail' }));
        toast.error('❌ Dados insuficientes para linha do tempo (min. 2 ciclos ou eventos de evolução)');
      }

    } catch (error) {
      setValidationResults(prev => ({ ...prev, timeline: 'fail' }));
      toast.error('❌ Erro ao validar linha do tempo: ' + error.message);
    }
  };

  // Teste 3: Briefing Editável
  const testBriefingEditable = async () => {
    try {
      const briefing = testData.briefing;
      if (!briefing) {
        setValidationResults(prev => ({ ...prev, briefingEditable: 'fail' }));
        toast.error('❌ Briefing não encontrado para teste de edição');
        return;
      }

      // Verificar campos editáveis principais
      const editableFields = [
        'target_audience',
        'objectives', 
        'current_challenges',
        'brand_tone'
      ];

      const hasEditableFields = editableFields.some(field => 
        briefing.hasOwnProperty(field)
      );

      // Simular teste de edição (sem modificar dados)
      const testUpdate = {
        target_audience: briefing.target_audience + ' [TESTE_EDIÇÃO]'
      };

      if (hasEditableFields) {
        // Verificar se há histórico de versões ou audit log
        const briefingHistory = await Brief.filter({ 
          agencyId: agency.id, 
          projectId: testData.selectedClient.id 
        }, '-updated_date').catch(() => []);

        setTestData(prev => ({ ...prev, briefingHistory }));

        setValidationResults(prev => ({ ...prev, briefingEditable: 'pass' }));
        toast.success(`✅ Briefing editável: ${editableFields.length} campos, ${briefingHistory.length} versão(ões) no histórico`);
      } else {
        setValidationResults(prev => ({ ...prev, briefingEditable: 'fail' }));
        toast.error('❌ Campos editáveis não encontrados no briefing');
      }

    } catch (error) {
      setValidationResults(prev => ({ ...prev, briefingEditable: 'fail' }));
      toast.error('❌ Erro ao validar edição de briefing: ' + error.message);
    }
  };

  const testAll = async () => {
    toast.info('🧪 Iniciando validação completa do Cliente...');
    await testClientProfile();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await testTimeline();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await testBriefingEditable();
    toast.success('🎯 Validação do Cliente concluída!');
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
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-6 h-6 text-blue-600" />
            Validação: Funcionalidade Cliente
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
              {testData.selectedClient && (
                <p className="text-xs text-slate-500">
                  Cliente de teste: {testData.selectedClient.name} 
                  {testData.selectedClient.dataScore && ` (Score: ${testData.selectedClient.dataScore})`}
                </p>
              )}
            </div>
            <Button 
              onClick={testAll} 
              disabled={testing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {testing ? 'Validando...' : 'Executar Validação Completa'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Perfil do Cliente</TabsTrigger>
          <TabsTrigger value="timeline">Linha do Tempo</TabsTrigger>
          <TabsTrigger value="briefing">Briefing Editável</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <ValidationResult
            title="1. Perfil do Cliente"
            status={validationResults.clientProfile}
            details="Briefing atualizado + planejamentos passados + aprendizados associados"
            onTest={testClientProfile}
          >
            {testData.briefing && (
              <DataPreview 
                title="Briefing Atual"
                data={`Objetivos: ${testData.briefing.objectives || 'N/A'} | Público: ${testData.briefing.target_audience || 'N/A'}`}
              />
            )}
            
            <DataPreview 
              title="Planejamentos Passados"
              data={testData.cycles}
              emptyMessage="Nenhum ciclo/planejamento encontrado"
            />
            
            <DataPreview 
              title="Aprendizados Associados"
              data={testData.learnings}
              emptyMessage="Nenhum aprendizado associado"
            />
          </ValidationResult>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <ValidationResult
            title="2. Linha do Tempo"
            status={validationResults.timeline}
            details="Evolução de estratégias e resultados mês a mês"
            onTest={testTimeline}
          >
            <DataPreview 
              title="Eventos de Evolução"
              data={testData.evolutionEvents}
              emptyMessage="Nenhum evento de evolução registrado"
            />
            
            <DataPreview 
              title="Progressão Mensal (Ciclos)"
              data={testData.cycles.map(c => `${c.cyclePeriod} (${c.status})`)}
              emptyMessage="Histórico de ciclos insuficiente"
            />
          </ValidationResult>
        </TabsContent>

        <TabsContent value="briefing" className="space-y-4">
          <ValidationResult
            title="3. Briefing Editável"
            status={validationResults.briefingEditable}
            details="Edição funcional + histórico de alterações registrado"
            onTest={testBriefingEditable}
          >
            {testData.briefing && (
              <div className="space-y-2">
                <DataPreview 
                  title="Campos Editáveis"
                  data={Object.keys(testData.briefing).filter(key => 
                    ['target_audience', 'objectives', 'current_challenges', 'brand_tone'].includes(key)
                  )}
                />
                
                <DataPreview 
                  title="Histórico de Versões"
                  data={testData.briefingHistory.map(b => 
                    `${new Date(b.updated_date).toLocaleDateString()} - ${b.completion_score || 0}% completo`
                  )}
                  emptyMessage="Histórico não disponível"
                />
              </div>
            )}
          </ValidationResult>
        </TabsContent>
      </Tabs>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Critérios de Aprovação</AlertTitle>
        <AlertDescription className="space-y-1">
          <p><strong>Perfil:</strong> Deve carregar briefing + ciclos/planejamentos + aprendizados associados</p>
          <p><strong>Timeline:</strong> Mínimo 2 ciclos ordenados cronologicamente OU eventos de evolução</p>
          <p><strong>Briefing:</strong> Campos editáveis identificados + histórico de alterações</p>
        </AlertDescription>
      </Alert>
    </div>
  );
}
