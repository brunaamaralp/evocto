
import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CyclePlan } from '@/api/entities';
import { Service } from '@/api/entities';
import { generateCyclePlan } from '@/api/functions';
import { showToast } from '@/components/feedback/EnhancedFeedback';
import { 
  Sparkles, Calendar, TrendingUp, Target, 
  CheckCircle, AlertTriangle, RefreshCw, 
  FileText, Users, BarChart3, Lightbulb
} from 'lucide-react';

const PlanSection = ({ icon: Icon, title, content, confidence }) => (
  <Card className="mb-4">
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-2 text-base">
        <Icon className="w-5 h-5 text-blue-600" />
        {title}
        {confidence && (
          <Badge variant="outline" className="ml-auto">
            {confidence}% confiança
          </Badge>
        )}
      </CardTitle>
    </CardHeader>
    <CardContent className="pt-0">
      {Array.isArray(content) ? (
        <ul className="space-y-2">
          {content.map((item, index) => (
            <li key={index} className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-slate-700">{typeof item === 'string' ? item : item.tarefa || item.hipotese || item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-700 leading-relaxed">{content}</p>
      )}
    </CardContent>
  </Card>
);

const CyclePlanGenerator = ({ service, client, targetPeriod, onPlanGenerated, onCancel }) => {
  const { agencyId } = useSession();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [error, setError] = useState(null);

  const steps = [
    'Analisando histórico do cliente...',
    'Coletando aprendizados relevantes...',
    'Identificando padrões sazonais...',
    'Gerando estratégias personalizadas...',
    'Aplicando guardrails de segurança...',
    'Finalizando plano otimizado...'
  ];

  const simulateProgress = () => {
    let currentProgress = 0;
    let stepIndex = 0;

    const progressInterval = setInterval(() => {
      currentProgress += Math.random() * 15 + 5;
      
      if (stepIndex < steps.length - 1 && currentProgress > (stepIndex + 1) * (100 / steps.length)) {
        stepIndex++;
      }
      
      setCurrentStep(steps[stepIndex]);
      setProgress(Math.min(currentProgress, 95));
      
      if (currentProgress >= 95) {
        clearInterval(progressInterval);
      }
    }, 800);

    return progressInterval;
  };

  // 🔧 CORREÇÃO: useCallback para handleGeneratePlan
  const handleGeneratePlan = useCallback(async () => {
    setLoading(true);
    setError(null);
    setProgress(0);

    // Simular progresso
    const progressInterval = simulateProgress();

    try {
      const response = await generateCyclePlan({
        serviceId: service.id,
        targetPeriod,
        mode: 'generate'
      });

      clearInterval(progressInterval);
      setProgress(100);
      setCurrentStep('Plano gerado com sucesso!');

      if (response.success) {
        setGeneratedPlan({
          ...response.plan,
          confidence: response.confidence,
          metadata: response.metadata,
          guardrails: response.guardrails
        });

        showToast.success(`Plano para ${targetPeriod} gerado com ${response.confidence}% de confiança!`);
        
        if (onPlanGenerated) {
          onPlanGenerated({
            plan: response.plan,
            cyclePlanId: response.cyclePlanId,
            confidence: response.confidence
          });
        }
      } else {
        throw new Error(response.error || 'Falha na geração do plano');
      }

    } catch (error) {
      clearInterval(progressInterval);
      console.error('Erro na geração:', error);
      setError(error.message);
      showToast.error('Erro ao gerar plano. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [service.id, targetPeriod, onPlanGenerated]);

  // 🔧 CORREÇÃO: Auto-gerar se não houver plano ainda - incluir todas as dependências
  useEffect(() => {
    if (!generatedPlan && !loading && !error) {
      handleGeneratePlan();
    }
  }, [generatedPlan, loading, error, handleGeneratePlan]);

  if (error) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Erro na Geração</h3>
          <p className="text-slate-600 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={onCancel}>
              Voltar
            </Button>
            <Button onClick={handleGeneratePlan} className="bg-blue-600 hover:bg-blue-700">
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar Novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading || !generatedPlan) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-white animate-pulse" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              Gerando Plano Estratégico
            </h3>
            <p className="text-slate-600 mb-4">
              Nossa IA está analisando dados e criando um plano personalizado para {targetPeriod}
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-700 font-medium">{currentStep}</span>
              <span className="text-slate-500">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="mt-6 bg-slate-50 rounded-lg p-4">
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <Users className="w-4 h-4" />
              <span><strong>Cliente:</strong> {client.company}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-600 mt-2">
              <FileText className="w-4 h-4" />
              <span><strong>Serviço:</strong> {service.name}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-600 mt-2">
              <Calendar className="w-4 h-4" />
              <span><strong>Período:</strong> {targetPeriod}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Plano Estratégico - {targetPeriod}
              </h2>
              <p className="text-slate-600">
                {client.company} • {service.name}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="w-4 h-4 mr-1" />
                {generatedPlan.confidence}% Confiança
              </Badge>
              {generatedPlan.guardrails?.applied && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  Guardrails Aplicados
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Guardrails Warnings */}
      {generatedPlan.guardrails?.warnings?.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Ajustes Aplicados:</strong>
            <ul className="mt-2 space-y-1">
              {generatedPlan.guardrails.warnings.map((warning, index) => (
                <li key={index} className="text-sm">• {warning.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Strategy */}
      <PlanSection
        icon={Target}
        title="Mudança Estratégica Principal"
        content={generatedPlan.mudancaChave}
        confidence={generatedPlan.confidence}
      />

      {/* Priorities */}
      <PlanSection
        icon={TrendingUp}
        title="Prioridades do Ciclo"
        content={generatedPlan.prioridades || []}
      />

      {/* Strategic Adjustments */}
      {generatedPlan.ajustesEstrategicos && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Ajustes Estratégicos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {generatedPlan.ajustesEstrategicos.frequencia && (
              <div>
                <span className="font-medium text-slate-900">Frequência: </span>
                <span className="text-slate-700">{generatedPlan.ajustesEstrategicos.frequencia}</span>
              </div>
            )}
            {generatedPlan.ajustesEstrategicos.investimento && (
              <div>
                <span className="font-medium text-slate-900">Investimento: </span>
                <span className="text-slate-700">{generatedPlan.ajustesEstrategicos.investimento}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI Suggestions */}
      {generatedPlan.sugestoesIA?.length > 0 && (
        <PlanSection
          icon={Lightbulb}
          title="Sugestões de Testes e Experimentos"
          content={generatedPlan.sugestoesIA}
        />
      )}

      {/* Client Dependencies */}
      {generatedPlan.pendenciasCliente?.length > 0 && (
        <PlanSection
          icon={Users}
          title="Pendências do Cliente"
          content={generatedPlan.pendenciasCliente}
        />
      )}

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onCancel}>
          Voltar
        </Button>
        <Button onClick={() => handleGeneratePlan()} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Regenerar
        </Button>
        <Button className="bg-green-600 hover:bg-green-700">
          <CheckCircle className="w-4 h-4 mr-2" />
          Aprovar Plano
        </Button>
      </div>
    </div>
  );
};

export default CyclePlanGenerator;
