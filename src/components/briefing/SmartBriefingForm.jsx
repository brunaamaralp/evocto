import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/components/i18n/I18nProvider';
import { useSession } from '@/components/auth/SessionManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Bot, CheckCircle2, MessageCircle, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import AIBriefingValidator from './AIBriefingValidator';

/**
 * Formulário inteligente de briefing com validação IA
 */
export default function SmartBriefingForm({ 
  briefingTemplate, 
  initialAnswers = {},
  onSave,
  onAutoSave,
  clientId,
  serviceId 
}) {
  const { t } = useTranslation();
  const { agency } = useSession();
  const [answers, setAnswers] = useState(initialAnswers);
  const [activeFollowUps, setActiveFollowUps] = useState({});
  const [aiSuggestedQuestions, setAiSuggestedQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [validationHistory, setValidationHistory] = useState([]);

  // Configurações da agência para IA
  const agencyAISettings = agency?.ai_personality || {
    enableAISuggestions: true,
    validationSensitivity: 'medium',
    alwaysShowFollowUps: false
  };

  // Todas as perguntas (originais + follow-ups + sugestões IA)
  const allQuestions = React.useMemo(() => {
    let questions = [];
    
    // Adicionar perguntas originais do template
    briefingTemplate?.categories?.forEach(category => {
      category.questions?.forEach(question => {
        questions.push({
          ...question,
          categoryId: category.id,
          categoryName: category.name,
          source: 'template'
        });
      });
    });

    // Adicionar follow-ups ativos
    Object.entries(activeFollowUps).forEach(([questionId, followUpIds]) => {
      const originalQuestion = questions.find(q => q.id === questionId);
      if (originalQuestion && followUpIds.length > 0) {
        followUpIds.forEach(followUpId => {
          const category = briefingTemplate.categories.find(c => 
            c.followUpQuestions?.[followUpId]
          );
          if (category?.followUpQuestions[followUpId]) {
            questions.push({
              ...category.followUpQuestions[followUpId],
              id: followUpId,
              categoryId: originalQuestion.categoryId,
              categoryName: originalQuestion.categoryName,
              source: 'followup',
              parentQuestionId: questionId
            });
          }
        });
      }
    });

    // Adicionar sugestões da IA
    aiSuggestedQuestions.forEach(question => {
      questions.push({
        ...question,
        source: 'ai',
        categoryId: 'ai_suggestions',
        categoryName: t('briefing.validation.aiSuggestion')
      });
    });

    return questions;
  }, [briefingTemplate, activeFollowUps, aiSuggestedQuestions, t]);

  // Calcular progresso
  const progress = React.useMemo(() => {
    const totalQuestions = allQuestions.length;
    const answeredQuestions = allQuestions.filter(q => 
      answers[q.id] && answers[q.id].trim().length > 0
    ).length;
    return totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;
  }, [allQuestions, answers]);

  /**
   * Atualizar resposta de uma pergunta
   */
  const handleAnswerChange = useCallback((questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));

    // Auto-save após 2 segundos de inatividade
    if (onAutoSave) {
      const timer = setTimeout(() => {
        onAutoSave({ ...answers, [questionId]: value });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [answers, onAutoSave]);

  /**
   * Handle follow-up triggered pela IA
   */
  const handleFollowUpTriggered = useCallback((followUpIds, questionId) => {
    setActiveFollowUps(prev => ({
      ...prev,
      [questionId]: [...(prev[questionId] || []), ...followUpIds]
    }));
    
    // Registrar no histórico
    setValidationHistory(prev => [...prev, {
      type: 'followup_triggered',
      questionId,
      followUpIds,
      timestamp: new Date().toISOString()
    }]);
  }, []);

  /**
   * Handle sugestão da IA
   */
  const handleAISuggestion = useCallback((suggestedQuestion) => {
    setAiSuggestedQuestions(prev => [...prev, suggestedQuestion]);
    
    // Registrar no histórico
    setValidationHistory(prev => [...prev, {
      type: 'ai_suggestion',
      question: suggestedQuestion,
      timestamp: new Date().toISOString()
    }]);
  }, []);

  /**
   * Renderizar pergunta individual
   */
  const renderQuestion = (question, index) => {
    const isActive = index === currentQuestionIndex;
    const isAnswered = answers[question.id] && answers[question.id].trim().length > 0;
    
    return (
      <motion.div
        key={question.id}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: isActive ? 1 : 0.7, x: 0 }}
        className={`space-y-4 ${!isActive && 'pointer-events-none'}`}
      >
        <Card className={`border-2 transition-all ${
          isActive ? 'border-blue-300 shadow-md' : 'border-slate-200'
        }`}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {question.source === 'ai' && (
                    <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                      <Lightbulb className="w-3 h-3 mr-1" />
                      {t('briefing.validation.aiSuggestion')}
                    </Badge>
                  )}
                  {question.source === 'followup' && (
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                      <MessageCircle className="w-3 h-3 mr-1" />
                      {t('briefing.form.followUpQuestion')}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {question.categoryName}
                  </Badge>
                </div>
                <CardTitle className="text-lg">
                  {question.text}
                  {question.required && <span className="text-red-500 ml-1">*</span>}
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">{index + 1}/{allQuestions.length}</span>
                {isAnswered && <CheckCircle2 className="w-5 h-5 text-green-500" />}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Campo de resposta */}
            {question.type === 'long_text' && (
              <Textarea
                value={answers[question.id] || ''}
                onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                placeholder={question.placeholder || t('briefing.form.placeholder')}
                className="min-h-[120px]"
              />
            )}
            
            {question.type === 'short_text' && (
              <Input
                value={answers[question.id] || ''}
                onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                placeholder={question.placeholder || t('briefing.form.placeholder')}
              />
            )}
            
            {question.type === 'multiple_choice' && (
              <Select
                value={answers[question.id] || ''}
                onValueChange={(value) => handleAnswerChange(question.id, value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('common.select')} />
                </SelectTrigger>
                <SelectContent>
                  {question.options?.map((option, idx) => (
                    <SelectItem key={idx} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Validação IA */}
            {isActive && answers[question.id] && question.source !== 'ai' && (
              <AIBriefingValidator
                question={question}
                answer={answers[question.id]}
                onFollowUpTriggered={(followUpIds) => handleFollowUpTriggered(followUpIds, question.id)}
                onAISuggestion={handleAISuggestion}
                agencySettings={agencyAISettings}
                language={t('common.language')}
              />
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header com Progresso */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-semibold">{briefingTemplate?.service}</h2>
              <p className="text-slate-600">{briefingTemplate?.description}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">{Math.round(progress)}%</div>
              <div className="text-sm text-slate-500">{t('common.complete')}</div>
            </div>
          </div>
          <Progress value={progress} className="h-3" />
        </CardContent>
      </Card>

      {/* Perguntas */}
      <div className="space-y-6">
        <AnimatePresence mode="wait">
          {allQuestions.map((question, index) => 
            renderQuestion(question, index)
          )}
        </AnimatePresence>
      </div>

      {/* Navegação */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
              disabled={currentQuestionIndex === 0}
            >
              {t('cta.previous')}
            </Button>
            
            <div className="flex gap-2">
              {currentQuestionIndex < allQuestions.length - 1 ? (
                <Button
                  onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                >
                  {t('cta.next')}
                </Button>
              ) : (
                <Button
                  onClick={() => onSave(answers, validationHistory)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {t('cta.completeBriefing')}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}