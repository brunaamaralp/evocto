import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/components/i18n/I18nProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Loader2, 
  Sparkles,
  FileText,
  Clock,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import AIBriefingValidator from './AIBriefingValidator';

const AUTO_SAVE_DELAY = 2000; // 2 seconds

export default function BriefingWizard({ 
  template, 
  initialResponses = {}, 
  onSubmit,
  onAutoSave,
  language = 'en'
}) {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState(initialResponses);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState('saved'); // 'saving', 'saved', 'error'
  
  // Build flat questions list
  const allQuestions = template.categories?.reduce((acc, category) => {
    const categoryQuestions = (category.questions || []).map(q => ({
      ...q,
      categoryId: category.id,
      categoryName: category.name,
      categoryDescription: category.description
    }));
    return [...acc, ...categoryQuestions];
  }, []) || [];

  const [dynamicQuestions, setDynamicQuestions] = useState([]);
  const totalQuestions = allQuestions.length + dynamicQuestions.length;

  // Auto-save functionality
  const [autoSaveTimeout, setAutoSaveTimeout] = useState(null);

  const triggerAutoSave = useCallback(() => {
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }

    setAutoSaveStatus('saving');
    
    const timeout = setTimeout(async () => {
      try {
        if (onAutoSave) {
          await onAutoSave(responses);
        }
        setAutoSaveStatus('saved');
      } catch (error) {
        console.error('Auto-save failed:', error);
        setAutoSaveStatus('error');
        setTimeout(() => setAutoSaveStatus('saved'), 3000);
      }
    }, AUTO_SAVE_DELAY);

    setAutoSaveTimeout(timeout);
  }, [responses, onAutoSave, autoSaveTimeout]);

  useEffect(() => {
    if (Object.keys(responses).length > 0) {
      triggerAutoSave();
    }
  }, [responses, triggerAutoSave]);

  const currentQuestion = currentStep < allQuestions.length 
    ? allQuestions[currentStep]
    : dynamicQuestions[currentStep - allQuestions.length];

  const handleAnswer = (answer) => {
    const questionId = currentQuestion.id;
    setResponses(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleNext = () => {
    if (currentStep < totalQuestions - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  const handleFollowUpTriggered = (followUpIds) => {
    // Add follow-up questions to dynamic questions
    const newFollowUps = followUpIds.map(id => {
      const followUp = template.followUpQuestions?.find(f => f.id === id);
      return followUp ? {
        ...followUp,
        isDynamic: true,
        parentQuestionId: currentQuestion.id
      } : null;
    }).filter(Boolean);

    setDynamicQuestions(prev => [...prev, ...newFollowUps]);
  };

  const handleAISuggestion = (suggestion) => {
    if (suggestion.accepted) {
      const aiQuestion = {
        id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        text: suggestion.suggestedQuestion,
        type: 'long_text',
        required: false,
        explanation: suggestion.reasoning,
        isDynamic: true,
        isAISuggested: true,
        parentQuestionId: currentQuestion.id
      };

      setDynamicQuestions(prev => [...prev, aiQuestion]);
      toast.success(t('briefing.wizard.aiSuggestion.added'));
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        responses,
        dynamicQuestions,
        completedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Submission failed:', error);
      toast.error(t('briefing.wizard.errors.submitFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLastQuestion = currentStep >= totalQuestions - 1;
  const canProceed = responses[currentQuestion?.id] || !currentQuestion?.required;
  const progressPercentage = ((currentStep + 1) / totalQuestions) * 100;

  if (!currentQuestion) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-8 text-center">
          <Check className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">{t('briefing.wizard.completion.title')}</h2>
          <p className="text-slate-600 mb-6">{t('briefing.wizard.completion.subtitle')}</p>
          
          <div className="space-y-4">
            <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700">
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              {t('briefing.wizard.completion.submit')}
            </Button>
            
            <Button variant="outline" onClick={() => setCurrentStep(0)} className="w-full">
              {t('briefing.wizard.completion.review')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <FileText className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h1 className="font-semibold text-slate-900">
                  {template.name}
                </h1>
                <p className="text-sm text-slate-600">
                  {t('briefing.wizard.progress.step', { 
                    current: currentStep + 1, 
                    total: totalQuestions 
                  })}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              {autoSaveStatus === 'saving' && (
                <div className="flex items-center gap-1 text-slate-500">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {t('briefing.wizard.autoSave.saving')}
                </div>
              )}
              {autoSaveStatus === 'saved' && (
                <div className="flex items-center gap-1 text-green-600">
                  <Check className="w-3 h-3" />
                  {t('briefing.wizard.autoSave.saved')}
                </div>
              )}
              {autoSaveStatus === 'error' && (
                <div className="flex items-center gap-1 text-red-600">
                  <AlertCircle className="w-3 h-3" />
                  {t('briefing.wizard.autoSave.error')}
                </div>
              )}
            </div>
          </div>
          
          <Progress value={progressPercentage} className="h-2" />
          
          {currentQuestion.categoryName && (
            <div className="mt-3">
              <Badge variant="outline">
                {t('briefing.wizard.progress.category', { category: currentQuestion.categoryName })}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardContent className="p-8">
              {/* Question Header */}
              <div className="mb-6">
                {currentQuestion.isAISuggested && (
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                      {t('briefing.wizard.aiSuggestion.label')}
                    </Badge>
                  </div>
                )}
                
                <h2 className="text-xl font-semibold text-slate-900 mb-3">
                  {currentQuestion.text}
                  {currentQuestion.required && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </h2>
                
                {currentQuestion.explanation && (
                  <Alert className="mb-4">
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription>{currentQuestion.explanation}</AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Question Input */}
              <QuestionInput
                question={currentQuestion}
                value={responses[currentQuestion.id] || ''}
                onChange={handleAnswer}
                language={language}
              />

              {/* AI Validation */}
              {responses[currentQuestion.id] && template.aiSettings?.enableAISuggestions && (
                <div className="mt-4">
                  <AIBriefingValidator
                    question={currentQuestion}
                    answer={responses[currentQuestion.id]}
                    onFollowUpTriggered={handleFollowUpTriggered}
                    onAISuggestion={handleAISuggestion}
                    agencySettings={template.aiSettings}
                    language={language}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('briefing.wizard.navigation.previous')}
            </Button>

            <div className="flex gap-2">
              {!currentQuestion.required && (
                <Button variant="ghost" onClick={handleSkip}>
                  {t('briefing.wizard.navigation.skip')}
                </Button>
              )}
              
              <Button
                onClick={isLastQuestion ? handleSubmit : handleNext}
                disabled={!canProceed || isSubmitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : isLastQuestion ? (
                  <Check className="w-4 h-4 mr-2" />
                ) : (
                  <ArrowRight className="w-4 h-4 mr-2" />
                )}
                {isLastQuestion ? t('briefing.wizard.navigation.finish') : t('briefing.wizard.navigation.next')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Question Input Component
function QuestionInput({ question, value, onChange, language }) {
  const { t } = useTranslation();

  const handleInputChange = (newValue) => {
    onChange(newValue);
  };

  const inputProps = {
    value: value || '',
    onChange: (e) => handleInputChange(e.target.value),
    placeholder: question.placeholder || '',
    className: "w-full"
  };

  switch (question.type) {
    case 'long_text':
      return (
        <Textarea
          {...inputProps}
          rows={6}
          onChange={(e) => handleInputChange(e.target.value)}
        />
      );

    case 'short_text':
    case 'email':
    case 'url':
      return (
        <Input
          {...inputProps}
          type={question.type === 'email' ? 'email' : question.type === 'url' ? 'url' : 'text'}
        />
      );

    case 'number':
      return (
        <Input
          {...inputProps}
          type="number"
          onChange={(e) => handleInputChange(e.target.value)}
        />
      );

    case 'multiple_choice':
      return (
        <div className="space-y-2">
          {(question.options || []).map((option, index) => (
            <label key={index} className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
              <input
                type="radio"
                name={question.id}
                value={option}
                checked={value === option}
                onChange={(e) => handleInputChange(e.target.value)}
                className="w-4 h-4 text-blue-600"
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      );

    case 'multiple_choice_multiple':
      const selectedOptions = Array.isArray(value) ? value : [];
      
      return (
        <div className="space-y-2">
          {(question.options || []).map((option, index) => (
            <label key={index} className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
              <input
                type="checkbox"
                value={option}
                checked={selectedOptions.includes(option)}
                onChange={(e) => {
                  const newSelected = e.target.checked
                    ? [...selectedOptions, option]
                    : selectedOptions.filter(o => o !== option);
                  handleInputChange(newSelected);
                }}
                className="w-4 h-4 text-blue-600"
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      );

    default:
      return <Input {...inputProps} />;
  }
}