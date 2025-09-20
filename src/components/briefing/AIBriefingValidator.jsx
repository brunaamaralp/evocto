import React, { useState, useCallback } from 'react';
import { useTranslation } from '@/components/i18n/I18nProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Bot, 
  CheckCircle, 
  AlertTriangle, 
  Loader2, 
  MessageCircle, 
  Lightbulb,
  ThumbsUp,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

/**
 * Lógica de análise da resposta (simulada) - movida para fora do componente
 */
const analyzeResponse = (answer, question, sensitivity, t) => {
  const wordCount = answer.trim().split(/\s+/).length;
  const hasSpecificTerms = /\b(específico|detalhado|exemplo|processo|estratégia)\b/i.test(answer);
  const isVague = /\b(talvez|pode ser|não sei|mais ou menos|depende)\b/i.test(answer);
  const isTooShort = wordCount < 10;
  
  let confidence = 0.7;
  let triggers = [];
  let reasoning = '';
  
  if (isTooShort) {
    triggers.push('menos_10_palavras');
    confidence += 0.1;
    reasoning = t('briefing.validation.incompleteResponse');
  }
  
  if (isVague) {
    triggers.push('resposta_vaga');
    confidence += 0.15;
    reasoning = t('briefing.validation.vagueness');
  }
  
  if (!hasSpecificTerms && wordCount < 30) {
    triggers.push('falta_detalhes');
    confidence += 0.1;
    reasoning = t('briefing.validation.missingDetails');
  }
  
  const shouldTriggerFollowUp = triggers.length > 0 && question.followUpTriggers?.some(t => triggers.includes(t));
  const shouldSuggestFreeQuestion = !shouldTriggerFollowUp && confidence > 0.75 && wordCount < 25;
  
  return {
    confidence,
    triggers,
    reasoning,
    shouldTriggerFollowUp,
    shouldSuggestFreeQuestion,
    wordCount,
    analysisDate: new Date().toISOString()
  };
};

/**
 * Gerar sugestões de perguntas baseadas no contexto
 */
const generateSuggestedQuestion = (question, language) => {
  if (question.id.includes('emp')) {
    return language === 'pt' 
      ? "Pode compartilhar um exemplo específico de como isso se aplica ao seu negócio?"
      : "Can you share a specific example of how this applies to your business?";
  } else if (question.id.includes('pub')) {
    return language === 'pt'
      ? "Que comportamentos específicos você observa nesse público?"
      : "What specific behaviors do you observe in this audience?";
  } else {
    return language === 'pt'
      ? "Pode fornecer mais detalhes ou exemplos práticos?"
      : "Can you provide more details or practical examples?";
  }
};

/**
 * Componente que valida respostas do briefing usando IA
 * Detecta respostas vagas e sugere follow-ups
 */
export default function AIBriefingValidator({ 
  question, 
  answer, 
  onFollowUpTriggered, 
  onAISuggestion,
  agencySettings = {},
  language = 'pt'
}) {
  const { t } = useTranslation();
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [suggestedQuestion, setSuggestedQuestion] = useState(null);
  const [showSuggestionForm, setShowSuggestionForm] = useState(false);
  
  // Configurações da agência
  const aiValidationEnabled = agencySettings.enableAISuggestions !== false;
  const validationSensitivity = agencySettings.validationSensitivity || 'medium';

  /**
   * Analisa a resposta e determina se precisa de follow-ups
   */
  const validateResponse = useCallback(async () => {
    if (!answer || answer.trim().length === 0) return;
    
    setValidating(true);
    setValidationResult(null);
    
    try {
      // Simular análise da IA (em produção, seria uma chamada real)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const analysis = analyzeResponse(answer, question, validationSensitivity, t);
      setValidationResult(analysis);
      
      // Disparar follow-ups programados se necessário
      if (analysis.shouldTriggerFollowUp && question.followUps) {
        const triggeredFollowUps = question.followUps.filter(fuId => 
          analysis.triggers.some(trigger => 
            question.followUpTriggers?.includes(trigger)
          )
        );
        
        if (triggeredFollowUps.length > 0) {
          onFollowUpTriggered(triggeredFollowUps);
          toast.success(t('briefing.validation.followUpTriggered'));
        }
      }
      
      // Sugerir pergunta livre se habilitado e necessário
      if (aiValidationEnabled && analysis.shouldSuggestFreeQuestion && !analysis.shouldTriggerFollowUp) {
        const suggestedQuestionText = generateSuggestedQuestion(question, language);
        
        setSuggestedQuestion({
          id: `ai_${Date.now()}`,
          text: suggestedQuestionText,
          type: 'long_text',
          source: 'ai',
          reasoning: analysis.reasoning,
          confidence: analysis.confidence
        });
        setShowSuggestionForm(true);
      }
      
    } catch (error) {
      console.error('Erro na validação IA:', error);
      toast.error(t('errors.general'));
    } finally {
      setValidating(false);
    }
  }, [answer, question, validationSensitivity, aiValidationEnabled, onFollowUpTriggered, t, language]);

  /**
   * Aceitar sugestão da IA
   */
  const handleAcceptSuggestion = () => {
    onAISuggestion(suggestedQuestion);
    setShowSuggestionForm(false);
    setSuggestedQuestion(null);
    toast.success(t('briefing.validation.suggestionAccepted'));
  };

  /**
   * Recusar sugestão da IA
   */
  const handleSkipSuggestion = () => {
    setShowSuggestionForm(false);
    setSuggestedQuestion(null);
    toast.info(t('briefing.validation.suggestionSkipped'));
  };

  // Auto-validar quando a resposta muda
  React.useEffect(() => {
    if (answer && answer.trim().length > 5) {
      const timer = setTimeout(validateResponse, 2000);
      return () => clearTimeout(timer);
    }
  }, [answer, validateResponse]);

  return (
    <div className="space-y-4">
      {/* Status de Validação */}
      <AnimatePresence>
        {validating && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Alert className="border-blue-200 bg-blue-50">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <AlertDescription className="text-blue-800">
                {t('briefing.validation.analyzing')}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resultado da Validação */}
      <AnimatePresence>
        {validationResult && !validating && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Alert className={`border-green-200 bg-green-50`}>
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {validationResult.shouldTriggerFollowUp ? (
                  t('briefing.validation.followUpTriggered')
                ) : validationResult.shouldSuggestFreeQuestion ? (
                  t('briefing.validation.aiSuggestedQuestion')
                ) : (
                  t('briefing.validation.validationComplete')
                )}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sugestão de Pergunta Livre da IA */}
      <AnimatePresence>
        {showSuggestionForm && suggestedQuestion && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="border-2 border-purple-200 bg-purple-50/30">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-purple-900">
                  <Lightbulb className="w-5 h-5" />
                  {t('briefing.validation.aiSuggestion')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-white/60 p-4 rounded-lg">
                  <Label className="text-sm font-medium text-purple-800">
                    {t('briefing.form.aiSuggestedQuestion')}
                  </Label>
                  <p className="text-slate-700 mt-2">
                    {suggestedQuestion.text}
                  </p>
                </div>
                
                {suggestedQuestion.reasoning && (
                  <div className="text-xs text-purple-700 bg-purple-100/50 p-3 rounded">
                    <strong>{t('common.reasoning')}:</strong> {suggestedQuestion.reasoning}
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={handleSkipSuggestion}
                    className="text-slate-600"
                  >
                    <X className="w-4 h-4 mr-2" />
                    {t('briefing.validation.skipSuggestion')}
                  </Button>
                  <Button
                    onClick={handleAcceptSuggestion}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <ThumbsUp className="w-4 h-4 mr-2" />
                    {t('briefing.validation.acceptSuggestion')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}