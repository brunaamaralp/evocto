import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { Client } from '@/api/entities';
import { BriefingTemplate } from '@/api/entities';
import { PublicBriefingResponse } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, CheckCircle, Clock, AlertCircle, 
  Building, User, ArrowRight, Download, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import LoadingState from '@/components/shared/LoadingStates';
import EmptyState from '@/components/shared/EmptyState';
import BriefingWizard from '@/components/briefing/BriefingWizard';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ClientDiagnosticPage() {
  const { user, agencyId } = useSession();
  const [clientId, setClientId] = useState(null);
  const [client, setClient] = useState(null);
  const [diagnosticTemplate, setDiagnosticTemplate] = useState(null);
  const [existingResponse, setExistingResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showWizard, setShowWizard] = useState(false);
  const [diagnosticStatus, setDiagnosticStatus] = useState('pending'); // 'pending', 'in_progress', 'completed'

  // Extrair clientId da URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('clientId');
    if (id) {
      setClientId(id);
    } else {
      setError('ID do cliente não encontrado na URL.');
    }
  }, []);

  // Carregar dados do diagnóstico
  useEffect(() => {
    const loadDiagnosticData = async () => {
      if (!clientId || !agencyId) return;

      try {
        setLoading(true);
        setError(null);

        console.log(`[ClientDiagnostic] Loading diagnostic data for client ${clientId}`);

        // Carregar dados em paralelo
        const [
          clientData,
          templateData,
          existingResponses
        ] = await Promise.all([
          Client.get(clientId),
          // Buscar template específico para diagnóstico financeiro
          BriefingTemplate.filter({ 
            agencyId, 
            serviceType: 'consultoria', 
            isActive: true 
          }),
          // Buscar respostas existentes para este cliente
          PublicBriefingResponse.filter({ 
            agencyId,
            clientId 
          }, '-submittedAt')
        ]);

        if (!clientData || clientData.agencyId !== agencyId) {
          throw new Error('Cliente não encontrado ou não pertence à sua agência.');
        }

        setClient(clientData);

        // Usar o primeiro template encontrado ou criar um padrão
        const template = templateData[0] || createDefaultDiagnosticTemplate();
        setDiagnosticTemplate(template);

        // Verificar se existe uma resposta recente
        const recentResponse = existingResponses[0];
        if (recentResponse) {
          setExistingResponse(recentResponse);
          setDiagnosticStatus(
            recentResponse.status === 'submitted' ? 'completed' : 'in_progress'
          );
        }

        console.log(`[ClientDiagnostic] Data loaded successfully`, {
          hasTemplate: !!template,
          hasResponse: !!recentResponse,
          status: recentResponse?.status
        });

      } catch (err) {
        console.error('[ClientDiagnostic] Error loading diagnostic data:', err);
        setError(`Erro ao carregar dados: ${err.message}`);
        toast.error('Erro ao carregar diagnóstico');
      } finally {
        setLoading(false);
      }
    };

    if (clientId && agencyId) {
      loadDiagnosticData();
    }
  }, [clientId, agencyId]);

  // Template padrão para diagnóstico financeiro
  const createDefaultDiagnosticTemplate = () => ({
    id: 'default_diagnostic',
    name: 'Diagnóstico Financeiro Empresarial',
    serviceType: 'consultoria',
    language: 'pt',
    categories: [
      {
        id: 'info_empresa',
        name: 'Informações da Empresa',
        description: 'Dados gerais sobre a organização',
        order: 1,
        questions: [
          {
            id: 'estrutura_societaria',
            text: 'Descreva a estrutura societária da empresa (sócios, participações, etc.)',
            type: 'long_text',
            required: true,
            order: 1
          },
          {
            id: 'principais_atividades',
            text: 'Quais são as principais atividades/produtos/serviços da empresa?',
            type: 'long_text',
            required: true,
            order: 2
          },
          {
            id: 'mercado_atuacao',
            text: 'Como é o mercado de atuação da empresa? (concorrência, sazonalidade, tendências)',
            type: 'long_text',
            required: true,
            order: 3
          }
        ]
      },
      {
        id: 'saude_financeira',
        name: 'Saúde Financeira Atual',
        description: 'Situação financeira e operacional',
        order: 2,
        questions: [
          {
            id: 'faturamento_medio',
            text: 'Qual o faturamento médio mensal da empresa?',
            type: 'number',
            required: true,
            order: 1
          },
          {
            id: 'principais_custos',
            text: 'Quais são os principais custos e despesas da empresa?',
            type: 'long_text',
            required: true,
            order: 2
          },
          {
            id: 'fluxo_caixa_atual',
            text: 'Como está o fluxo de caixa atual? Há necessidade de capital de giro?',
            type: 'long_text',
            required: true,
            order: 3
          },
          {
            id: 'endividamento',
            text: 'A empresa possui dívidas? Se sim, descreva os principais compromissos.',
            type: 'long_text',
            required: false,
            order: 4
          }
        ]
      },
      {
        id: 'processos_controles',
        name: 'Processos e Controles',
        description: 'Organização financeira e operacional',
        order: 3,
        questions: [
          {
            id: 'sistemas_utilizados',
            text: 'Quais sistemas/softwares a empresa utiliza para gestão financeira?',
            type: 'short_text',
            required: true,
            order: 1
          },
          {
            id: 'controles_existentes',
            text: 'Que controles financeiros a empresa já possui? (DRE, DFC, conciliações, etc.)',
            type: 'long_text',
            required: true,
            order: 2
          },
          {
            id: 'periodicidade_analises',
            text: 'Com que frequência são feitas análises financeiras?',
            type: 'multiple_choice',
            options: ['Diária', 'Semanal', 'Mensal', 'Trimestral', 'Não há periodicidade definida'],
            required: true,
            order: 3
          }
        ]
      },
      {
        id: 'objetivos_expectativas',
        name: 'Objetivos e Expectativas',
        description: 'Metas e necessidades da consultoria',
        order: 4,
        questions: [
          {
            id: 'principais_dificuldades',
            text: 'Quais são as principais dificuldades financeiras da empresa hoje?',
            type: 'long_text',
            required: true,
            order: 1
          },
          {
            id: 'objetivos_consultoria',
            text: 'O que espera alcançar com a consultoria financeira?',
            type: 'long_text',
            required: true,
            order: 2
          },
          {
            id: 'prazo_resultados',
            text: 'Em que prazo espera ver os primeiros resultados?',
            type: 'multiple_choice',
            options: ['1 mês', '3 meses', '6 meses', '1 ano', 'Não tenho prazo definido'],
            required: true,
            order: 3
          }
        ]
      }
    ]
  });

  const handleStartDiagnostic = () => {
    setShowWizard(true);
  };

  const handleDiagnosticComplete = (responses) => {
    console.log('[ClientDiagnostic] Diagnostic completed:', responses);
    setDiagnosticStatus('completed');
    setShowWizard(false);
    
    // Recarregar dados para pegar a resposta salva
    setTimeout(() => {
      window.location.reload();
    }, 1000);
    
    toast.success('Diagnóstico concluído com sucesso!');
  };

  const handleDownloadPDF = () => {
    // Implementar download do PDF do diagnóstico
    toast.info('Funcionalidade em desenvolvimento');
  };

  if (loading) {
    return <LoadingState message="Carregando diagnóstico..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <EmptyState
            icon="alert-circle"
            title="Erro ao carregar diagnóstico"
            description={error}
            primaryAction={{ 
              label: 'Voltar para Visão Geral', 
              onClick: () => window.location.href = `/client-overview?clientId=${clientId}` 
            }}
          />
        </div>
      </div>
    );
  }

  // Calcular progresso se houver resposta em andamento
  const calculateProgress = () => {
    if (!existingResponse || !diagnosticTemplate) return 0;
    
    const totalQuestions = diagnosticTemplate.categories.reduce(
      (total, cat) => total + cat.questions.length, 0
    );
    const answeredQuestions = Object.keys(existingResponse.responses || {}).length;
    
    return Math.round((answeredQuestions / totalQuestions) * 100);
  };

  const progress = calculateProgress();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-600" />
              Diagnóstico Financeiro
            </h1>
            <p className="text-gray-600 mt-1">
              {client?.name} • Avaliação completa da situação financeira
            </p>
          </div>
          <Button 
            variant="outline"
            onClick={() => window.location.href = `/client-overview?clientId=${clientId}`}
          >
            <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
            Voltar
          </Button>
        </div>

        {/* Status Card */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${
                  diagnosticStatus === 'completed' ? 'bg-green-100' :
                  diagnosticStatus === 'in_progress' ? 'bg-yellow-100' : 'bg-gray-100'
                }`}>
                  {diagnosticStatus === 'completed' ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : diagnosticStatus === 'in_progress' ? (
                    <Clock className="w-6 h-6 text-yellow-600" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-gray-600" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {diagnosticStatus === 'completed' ? 'Diagnóstico Concluído' :
                     diagnosticStatus === 'in_progress' ? 'Diagnóstico em Andamento' : 'Diagnóstico Pendente'}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {diagnosticStatus === 'completed' ? (
                      `Concluído em ${existingResponse?.submittedAt ? format(new Date(existingResponse.submittedAt), 'dd/MM/yyyy', { locale: ptBR }) : 'data indisponível'}`
                    ) : diagnosticStatus === 'in_progress' ? (
                      `${progress}% concluído • ${Object.keys(existingResponse?.responses || {}).length} respostas`
                    ) : (
                      'Inicie o preenchimento do diagnóstico financeiro'
                    )}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {diagnosticStatus === 'completed' && (
                  <Button variant="outline" onClick={handleDownloadPDF}>
                    <Download className="w-4 h-4 mr-2" />
                    Baixar PDF
                  </Button>
                )}
                
                <Button onClick={handleStartDiagnostic}>
                  {diagnosticStatus === 'completed' ? 'Revisar Respostas' :
                   diagnosticStatus === 'in_progress' ? 'Continuar Preenchimento' : 'Iniciar Diagnóstico'}
                </Button>
              </div>
            </div>
            
            {/* Progress Bar */}
            {diagnosticStatus === 'in_progress' && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Progresso</span>
                  <span className="text-sm font-medium text-gray-900">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Template Overview */}
        {diagnosticTemplate && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Estrutura do Diagnóstico</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {diagnosticTemplate.categories.map((category, index) => (
                  <div key={category.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{category.name}</h4>
                      <Badge variant="secondary" className="text-xs">
                        {category.questions.length} perguntas
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{category.description}</p>
                    
                    {/* Mostrar progresso desta categoria se houver resposta em andamento */}
                    {existingResponse && (
                      <div className="flex items-center gap-2 text-xs">
                        <div className={`w-2 h-2 rounded-full ${
                          category.questions.every(q => existingResponse.responses[q.id]) ? 'bg-green-500' :
                          category.questions.some(q => existingResponse.responses[q.id]) ? 'bg-yellow-500' : 'bg-gray-300'
                        }`} />
                        <span className="text-gray-500">
                          {category.questions.filter(q => existingResponse.responses[q.id]).length}/{category.questions.length} respondidas
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Briefing Wizard Modal */}
        {showWizard && diagnosticTemplate && (
          <BriefingWizard
            template={diagnosticTemplate}
            clientId={clientId}
            existingResponses={existingResponse?.responses}
            onComplete={handleDiagnosticComplete}
            onClose={() => setShowWizard(false)}
            title={`Diagnóstico Financeiro - ${client?.name}`}
          />
        )}
      </div>
    </div>
  );
}