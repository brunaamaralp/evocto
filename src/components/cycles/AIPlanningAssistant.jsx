
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import ConfidenceIndicator from '@/components/ai/ConfidenceIndicator';
import {
  Bot,
  Lightbulb,
  TrendingUp,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Clock,
  Target,
  Zap,
  Database,
  BarChart3,
  BookOpen,
  AlertCircle,
  ChevronDown,
  Shield,
  Info,
  Search,
  ListChecks,
  FlaskConical,
  Sparkles, // Added as per outline
  Wand2,    // Added as per outline
  FileText  // Added as per outline
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { generateCyclePlan } from '@/api/functions';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useSession } from '@/components/auth/SessionManager';
import ContentHelper from './ContentHelper';
// import Link from 'next/link'; // Removido - não é Next.js
import { withRobustAICall, handleRobustAIError } from '@/components/ai/AIErrorHandler'; // New import

// Helper function mock - in a real application, this would likely be imported from a utility file
// and generate dynamic URLs based on the 'pageName'.
const createPageUrl = (pageName) => {
  switch (pageName) {
    case 'library': return '/app/library'; // Example path for a library page
    // Add other cases as needed
    default: return '#';
  }
};

const PlanSection = ({ title, icon: Icon, children, confidence }) => (
  <Card className="mb-4">
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="w-4 h-4 text-purple-600" />
          {title}
        </CardTitle>
        {confidence && (
          <ConfidenceIndicator
            score={confidence}
            compact={true}
            context={`seção ${title}`}
          />
        )}
      </div>
    </CardHeader>
    <CardContent>
      {children}
    </CardContent>
  </Card>
);

// The original SuggestionItem component is no longer used directly in the ReviewStep's UI
// as individual suggestions are not interactively accepted/rejected in this updated flow.

// Moved GuardrailsWarnings outside AIPlanningAssistant to be reusable by ReviewStep
const GuardrailsWarnings = ({ guardrailsWarnings }) => {
  if (!guardrailsWarnings || guardrailsWarnings.length === 0) return null;

  const getAlertVariant = (type) => {
    switch (type) {
      case 'error': return 'destructive';
      case 'warning': return 'default';
      case 'info': return 'default';
      default: return 'default';
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'error': return <Shield className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'info': return <Info className="w-4 h-4 text-blue-500" />;
      default: return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    }
  };

  return (
    <div className="space-y-3 mb-6">
      <div className="flex items-center gap-2">
        <Shield className="w-5 h-5 text-blue-600" />
        <h3 className="text-sm font-medium text-slate-700">Guardrails Aplicados</h3>
        <Badge variant="outline" className="text-xs">
          {guardrailsWarnings.length} ajuste{guardrailsWarnings.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {guardrailsWarnings.map((warning, index) => (
        <Alert key={index} variant={getAlertVariant(warning.type)} className="border-l-4">
          <div className="flex gap-3">
            {getIcon(warning.type)}
            <div className="flex-1">
              <div className="font-medium text-sm">{warning.title}</div>
              <AlertDescription className="text-xs mt-1">
                {warning.message}
              </AlertDescription>
            </div>
          </div>
        </Alert>
      ))}

      <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <strong>Sobre os Guardrails:</strong> Nosso sistema monitora e ajusta automaticamente
            o conteúdo para garantir promessas realistas, linguagem apropriada e conformidade.
            Os ajustes são transparentes e reversíveis durante a revisão.
          </div>
        </div>
      </div>
    </div>
  );
};

// Moved RAGAuditSummary outside AIPlanningAssistant to be reusable by ReviewStep
const RAGAuditSummary = ({ aiPlan }) => {
  if (!aiPlan?.metadata?.ragAudit) return null;

  const audit = aiPlan.metadata.ragAudit;

  return (
    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Search className="w-4 h-4 text-slate-600" />
        <h4 className="text-sm font-medium text-slate-700">Contexto Utilizado (RAG)</h4>
      </div>

      <div className="grid grid-cols-2 gap-4 text-xs">
        <div>
          <p className="text-slate-500">Total encontrado:</p>
          <p className="font-semibold">{audit.totalLearningsFound} aprendizados</p>
        </div>
        <div>
          <p className="text-slate-500">Utilizados:</p>
          <p className="font-semibold text-green-600">{audit.usedInContext} selecionados</p>
        </div>
        <div>
          <p className="text-slate-500">Cliente específico:</p>
          <p className="font-semibold text-blue-600">{audit.clientSpecificLearnings} itens</p>
        </div>
        <div>
          <p className="text-slate-500">Globais da agência:</p>
          <p className="font-semibold text-purple-600">{audit.globalLearnings} itens</p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-200">
        <p className="text-xs text-slate-600">
          <strong>🔒 Escopo:</strong> Agência {audit.agencyScope} | Cliente: {audit.searchQuery?.clientName}
        </p>
      </div>
    </div>
  );
};

function ReviewStep({
  planResult,
  onAccept, // This maps to handleApplyPlan in parent
  onRegenerate, // This maps to handleGeneratePlan in parent
  onDiscard, // This maps to setGeneratedPlanResult(null) in parent
  targetPeriod,
  loading,
  guardrailsWarnings
}) {
  const [showExplanations, setShowExplanations] = useState(false); // State for collapsible explanation

  const planDetails = planResult.plan;
  const planConfidence = planResult.confidence || 0;
  const planContext = planResult.context;

  const renderPrioridades = (prioridades) => (
    <ul className="space-y-3">
      {prioridades.map((p, idx) => (
        <li key={idx} className="flex items-start gap-3 p-3 bg-white rounded-lg border">
          <Badge variant={p.impacto === 'Alto' ? 'destructive' : p.impacto === 'Médio' ? 'secondary' : 'outline'} className="mt-1">{p.impacto}</Badge>
          <div>
            <p className="font-medium text-slate-800">{p.tarefa}</p>
            <p className="text-xs text-slate-500">{p.racional}</p>
          </div>
        </li>
      ))}
    </ul>
  );

  const renderSugestoes = (sugestoes) => (
    <div className="space-y-4">
      {sugestoes.map((s, idx) => (
        <div key={idx} className="p-3 bg-white rounded-lg border border-dashed border-purple-300">
          <p className="text-sm font-semibold text-purple-800 mb-2">{s.hipotese}</p>
          <p className="text-xs mb-1"><strong className="text-slate-600">Teste:</strong> {s.teste}</p>
          <p className="text-xs"><strong className="text-slate-600">Sucesso se:</strong> {s.metrica_sucesso}</p>
        </div>
      ))}
    </div>
  );

  const renderJustificativas = (justificativas) => (
    <div className="space-y-3 text-sm">
      <div className="bg-white p-3 rounded-lg border">
        <strong className="text-slate-600 block mb-1">Baseado em:</strong>
        <div className="flex flex-wrap gap-2">
          {justificativas.baseadoEm.map((item, idx) => (
            <Badge key={idx} variant="outline">{item.tipo}: {item.descricao}</Badge>
          ))}
        </div>
      </div>
      <div className="bg-white p-3 rounded-lg border">
        <strong className="text-slate-600 block mb-1">Expectativas:</strong>
        <p className="text-slate-700">{justificativas.expectativas}</p>
      </div>
      <div className="bg-white p-3 rounded-lg border">
        <strong className="text-slate-600 block mb-1">Riscos:</strong>
        <ul className="list-disc list-inside text-slate-700">
          {justificativas.riscos.map((risco, idx) => <li key={idx}>{risco}</li>)}
        </ul>
      </div>
    </div>
  );

  return (
    <Card className="w-full bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900 mb-1">
              Plano IA para {targetPeriod}
            </h3>
            <p className="text-slate-600 text-sm">
              {planContext && `Baseado em ${planContext.cyclesAnalyzed} ciclos anteriores e ${planContext.learningsConsidered} aprendizados`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <ConfidenceIndicator
              score={planConfidence}
              context="plano gerado"
              compact={false}
            />
            {planResult.guardrails?.requires_review && (
              <Badge variant="destructive" className="text-xs">
                Revisão Obrigatória
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onRegenerate}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Regenerar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Guardrails Warnings */}
        <GuardrailsWarnings guardrailsWarnings={guardrailsWarnings} />

        {/* NEW: RAG Audit Summary */}
        <RAGAuditSummary aiPlan={planResult} />

        {/* Mudança Chave */}
        <PlanSection title="Mudança Chave do Ciclo" icon={Target}>
          <p className="font-medium text-slate-800">{planDetails.mudancaChave}</p>
        </PlanSection>

        {/* Prioridades */}
        <PlanSection title="Prioridades" icon={ListChecks}>
          {renderPrioridades(planDetails.prioridades)}
        </PlanSection>

        {/* Sugestões de Testes (IA) */}
        <PlanSection title="Sugestões de Testes (IA)" icon={FlaskConical}>
          {renderSugestoes(planDetails.sugestoesIA)}
        </PlanSection>

        {/* Justificativas */}
        <PlanSection title="Justificativas" icon={BookOpen}>
          {renderJustificativas(planDetails.justificativas)}
        </PlanSection>

        {/* Detailed Explanation Section */}
        {planDetails.explicabilidade && (
          <div className="mt-6 border-t pt-6">
            <Collapsible open={showExplanations} onOpenChange={setShowExplanations}>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900">
                <BookOpen className="w-4 h-4" />
                Por que a IA sugeriu essas estratégias?
                <ChevronDown className={`w-4 h-4 transition-transform ${showExplanations ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 space-y-4">
                <h3 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Explicação & Referências
                </h3>

                {planDetails.explicabilidade.evidencias?.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-xs font-medium text-slate-600 mb-2">Evidências utilizadas:</h4>
                    <div className="space-y-2">
                      {planDetails.explicabilidade.evidencias.map((evidencia, idx) => (
                        <div key={idx} className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">
                              {evidencia.tipo}
                            </Badge>
                            <Badge
                              variant={evidencia.fonte_id.includes('client') ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {evidencia.fonte_id.includes('client') ? '📋 Cliente Específico' : '🌐 Global'}
                            </Badge>
                            <a
                              href={createPageUrl('library')}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              ID: {evidencia.fonte_id}
                            </a>
                          </div>
                          <p className="text-sm text-slate-700 font-medium">{evidencia.descricao}</p>
                          {evidencia.valor && (
                            <p className="text-xs text-slate-600 mt-1">Valor: {evidencia.valor}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {planDetails.explicabilidade.raciocinios && planDetails.explicabilidade.raciocinios.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-800 mb-3">Raciocínio da IA</h4>
                    <div className="space-y-3">
                      {planDetails.explicabilidade.raciocinios.map((raciocinio, idx) => (
                        <div key={idx} className="p-3 border-l-4 border-blue-200 bg-blue-50">
                          <p className="text-sm font-medium text-slate-800">{raciocinio.decisao}</p>
                          <p className="text-sm text-slate-600 mt-1">{raciocinio.porque}</p>
                          {raciocinio.evidencia_referencia && (
                            <p className="text-xs text-blue-600 mt-2">
                              Baseado em: {raciocinio.evidencia_referencia}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        {/* Ações */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onDiscard}
            disabled={loading}
          >
            Descartar
          </Button>
          <Button
            onClick={onAccept}
            disabled={loading}
            className={planResult.guardrails?.requires_review ? 'bg-amber-600 hover:bg-amber-700' : 'bg-purple-600 hover:bg-purple-700'}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Aplicando...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {planResult.guardrails?.requires_review ? 'Salvar para Revisão' : 'Aplicar Plano'}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}


export default function AIPlanningAssistant({ serviceId, clientId, visible = false }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlanResult, setGeneratedPlanResult] = useState(null); // Holds the full planResult object
  const [error, setError] = useState(null);
  const [guardrailWarnings, setGuardrailWarnings] = useState([]);
  const [fallbackMode, setFallbackMode] = useState(false);

  const { data: session } = useSession();
  const agency = session?.user?.agency;

  const showContentHelper = agency?.feature_flags?.contentHelper || false;

  // Placeholder for currentPeriod calculation
  const currentPeriod = new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

  const handleGeneratePlan = async () => {
    if (!serviceId) {
      toast.error('Serviço não identificado para geração do plano.');
      return;
    }

    const params = {
      serviceId,
      targetPeriod: currentPeriod,
      mode: 'preview'
    };

    try {
      const result = await withRobustAICall(
        'generate_cycle_plan',
        async ({ attempt }) => {
          setIsGenerating(true);
          setError(null);

          console.log(`[AI Planning] Tentativa ${attempt} - Gerando plano para ${currentPeriod}`);

          const response = await generateCyclePlan(params);

          if (!response.data?.success) {
            throw new Error(response.data?.error || 'Falha na geração do plano');
          }

          return response.data; // This is the full planResult object
        },
        params, // Pass params to be used in context for idempotency check
        {
          maxRetries: 3,
          timeoutMs: 60000, // 60 segundos para geração de planos
          enableIdempotency: true
        }
      );

      if (result.success) {
        const planData = result.result; // This is the full planResult object
        setGeneratedPlanResult(planData);
        setGuardrailWarnings(planData.guardrails?.warnings || []);
        setFallbackMode(false);

        toast.success('Plano gerado com sucesso!', {
          description: `Confiança: ${planData.confidence}% • Baseado em ${planData.context?.cyclesAnalyzed || 0} ciclos anteriores`
        });

        if (planData.confidence < 60) { // Keep existing logic from previous file
          toast.warning('Plano gerado com baixa confiança', {
            description: 'Recomendamos revisão cuidadosa antes de aprovar.'
          });
        }

        if (planData.guardrails?.requires_review) { // Keep existing logic from previous file
          toast.warning('Revisão manual requerida', {
            description: 'Este plano foi significativamente moderado e requer revisão humana.'
          });
        }

        // Removed onPlanGenerated callback as it's not in the new prop signature
      } else {
        throw result.error;
      }

    } catch (err) {
      console.error('Erro na geração do plano:', err);

      // If it was a duplication, just warn
      if (err.message?.includes('DUPLICATE_REQUEST')) {
        toast.warning('Plano já está sendo gerado', {
          description: 'Aguarde a conclusão da operação atual.'
        });
        return;
      }

      if (err.message?.includes('RECENTLY_COMPLETED')) {
        toast.info('Plano recém gerado', {
          description: 'Um plano foi gerado recentemente. Aguarde alguns minutos para gerar novamente.'
        });
        return;
      }

      // Treat error with retry and fallback options
      handleRobustAIError(err, { serviceId, targetPeriod: currentPeriod }, {
        onRetry: handleGeneratePlan,
        onFallback: () => {
          setFallbackMode(true);
          toast.info('Modo manual ativado', {
            description: 'Você pode criar o plano manualmente enquanto a IA está indisponível.'
          });
        }
      });

      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyPlan = async () => {
    if (!generatedPlanResult || isGenerating) return;

    setIsGenerating(true); // Re-use isGenerating for applying
    try {
      const response = await generateCyclePlan({
        serviceId,
        targetPeriod: currentPeriod, // Ensure currentPeriod is passed
        mode: 'generate' // Create the CyclePlan in DB
      });

      if (response.data.success) {
        toast.success('Plano aplicado com sucesso!');
        setGeneratedPlanResult(null); // Clear the review plan after applying
        setGuardrailWarnings([]);
        // Removed onPlanGenerated callback as it's not in the new prop signature
      } else {
        throw new Error(response.data.error || 'Falha ao aplicar plano');
      }
    } catch (err) {
      console.error('Erro ao aplicar plano:', err);
      toast.error('Falha ao aplicar plano: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateFallbackPlan = () => {
    // Criar plano mínimo manual
    const fallbackPlanData = {
      plan: { // Wrap in 'plan' key to match ReviewStep's expectation for planResult.plan
        mudancaChave: "Continuidade das estratégias estabelecidas com otimizações manuais.",
        prioridades: [
          { tarefa: "Manter frequência de postagem atual", racional: "Estabilidade durante problemas técnicos", impacto: "Médio" },
          { tarefa: "Revisar performance das últimas campanhas", racional: "Análise manual dos dados", impacto: "Alto" }
        ],
        sugestoesIA: [], // No AI suggestions in manual mode
        justificativas: {
          baseadoEm: [{ tipo: "Input Manual", descricao: "Decisão do usuário" }],
          expectativas: "Manter performance atual durante indisponibilidade da IA",
          riscos: ["Performance pode ser subótima sem otimizações da IA"]
        },
        explicabilidade: { evidencias: [], raciocinios: [] } // No explanations for manual
      },
      confidence: 50, // Confidence baixo para plano manual
      context: { cyclesAnalyzed: 0, learningsConsidered: 0 },
      guardrails: { applied: true, requires_review: true, warnings: [] } // Mark as requiring review
    };

    setGeneratedPlanResult(fallbackPlanData);
    setGuardrailWarnings([{
      type: 'info',
      title: 'Plano Manual',
      message: 'Este plano foi criado manualmente devido à indisponibilidade da IA. Recomendamos regenerar quando o serviço estiver disponível.'
    }]);
    setFallbackMode(false);
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Assistente de Planejamento IA
            </CardTitle>
            <p className="text-sm text-slate-600 mt-1">
              Gera sugestões baseadas no histórico e aprendizados do cliente
            </p>
          </div>
          {!isGenerating && !generatedPlanResult && (
            <Button onClick={handleGeneratePlan} className="bg-purple-600 hover:bg-purple-700">
              <Wand2 className="w-4 h-4 mr-2" />
              Gerar Sugestão
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Loading State */}
        {isGenerating && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-purple-600" />
              <h3 className="font-medium text-slate-900">Gerando plano inteligente...</h3>
              <p className="text-sm text-slate-600 mt-2">
                Analisando histórico, aprendizados e contexto do cliente
              </p>
              <div className="mt-4 bg-slate-100 rounded-lg p-3 text-xs text-slate-600 max-w-md mx-auto">
                ⏱️ Esta operação pode levar até 60 segundos<br/>
                🔄 Tentativas automáticas em caso de falha<br/>
                🛡️ Proteção contra duplicação ativa
              </div>
            </div>
          </div>
        )}

        {/* Fallback Mode */}
        {fallbackMode && !generatedPlanResult && !isGenerating && (
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-amber-500" />
            <h3 className="font-medium text-slate-900 mb-2">IA Temporariamente Indisponível</h3>
            <p className="text-sm text-slate-600 mb-6">
              Você pode criar um plano básico manualmente ou aguardar a IA voltar ao ar.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={handleGeneratePlan} disabled={isGenerating}>
                <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                Tentar IA Novamente
              </Button>
              <Button onClick={handleCreateFallbackPlan} className="bg-amber-600 hover:bg-amber-700">
                <FileText className="w-4 h-4 mr-2" />
                Criar Manualmente
              </Button>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isGenerating && !fallbackMode && !generatedPlanResult && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error}
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="outline" onClick={handleGeneratePlan} disabled={isGenerating}>
                  Tentar Novamente
                </Button>
                <Button size="sm" variant="outline" onClick={() => setFallbackMode(true)}>
                  Modo Manual
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Render Generated Plan */}
        {generatedPlanResult && (
          <div className="space-y-6">
            <ReviewStep
              planResult={generatedPlanResult}
              onAccept={handleApplyPlan}
              onRegenerate={handleGeneratePlan}
              onDiscard={() => {
                setGeneratedPlanResult(null);
                setGuardrailWarnings([]);
                setError(null);
                setFallbackMode(false);
              }}
              targetPeriod={currentPeriod}
              loading={isGenerating}
              guardrailsWarnings={guardrailWarnings}
            />

            {/* Content Helper - only appears with feature flag and if plan exists */}
            {showContentHelper && (
              <ContentHelper
                planData={generatedPlanResult.plan} // Pass only the nested plan object to ContentHelper
                visible={showContentHelper}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
