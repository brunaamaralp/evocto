import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  CheckCircle, 
  AlertTriangle, 
  Loader2, 
  FileText,
  ArrowRight,
  ArrowLeft,
  Send,
  User,
  Building,
  Save,
  Eye
} from 'lucide-react';

/**
 * Formulário unificado de briefing
 * CORRIGIDO: inputs funcionando em modo interno
 */
export default function UnifiedBriefingForm({ 
  mode = 'public', // 'public' | 'internal'
  tokenData = null,
  clientData = null,
  onSave = null,
  onSubmit = null,
  initialResponses = {},
  showProgress = true,
  allowSave = false
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [responses, setResponses] = useState(initialResponses || {});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isPublicMode = mode === 'public';
  const isInternalMode = mode === 'internal';
  
  // Dados do cliente (vem do token público ou props)
  const client = tokenData?.client || clientData;

  // Sincronizar com initialResponses quando mudarem
  useEffect(() => {
    if (initialResponses && Object.keys(initialResponses).length > 0) {
      setResponses(prev => ({...initialResponses, ...prev}));
    }
  }, [initialResponses]);

  // Template de perguntas do briefing
  const briefingQuestions = [
    {
      id: 'company_context',
      title: 'Contexto da Empresa',
      description: 'Informações básicas sobre o negócio',
      questions: [
        {
          id: 'business_description',
          text: 'Descreva brevemente o negócio da sua empresa',
          type: 'long_text',
          required: true,
          placeholder: 'Ex: Somos uma empresa de e-commerce que vende produtos sustentáveis...'
        },
        {
          id: 'main_products',
          text: 'Quais são os principais produtos/serviços oferecidos?',
          type: 'long_text',
          required: true,
          placeholder: 'Liste os principais produtos ou serviços...'
        },
        {
          id: 'company_size',
          text: 'Qual o porte da empresa?',
          type: 'select',
          required: true,
          options: [
            { value: 'micro', label: 'Microempresa (até 9 funcionários)' },
            { value: 'pequena', label: 'Pequena (10-49 funcionários)' },
            { value: 'media', label: 'Média (50-249 funcionários)' },
            { value: 'grande', label: 'Grande (250+ funcionários)' }
          ]
        },
        {
          id: 'target_market',
          text: 'Qual é o seu mercado-alvo?',
          type: 'long_text',
          required: true,
          placeholder: 'Descreva seu público-alvo, nicho de mercado...'
        }
      ]
    },
    {
      id: 'financial_situation',
      title: 'Situação Financeira',
      description: 'Panorama financeiro atual da empresa',
      questions: [
        {
          id: 'annual_revenue',
          text: 'Qual a faixa de faturamento anual?',
          type: 'select',
          required: true,
          options: [
            { value: 'ate_100k', label: 'Até R$ 100.000' },
            { value: '100k_500k', label: 'R$ 100.000 - R$ 500.000' },
            { value: '500k_2m', label: 'R$ 500.000 - R$ 2.000.000' },
            { value: '2m_10m', label: 'R$ 2.000.000 - R$ 10.000.000' },
            { value: 'acima_10m', label: 'Acima de R$ 10.000.000' }
          ]
        },
        {
          id: 'financial_controls',
          text: 'Como são feitos os controles financeiros atualmente?',
          type: 'long_text',
          required: true,
          placeholder: 'Planilhas Excel, sistema ERP, controle manual...'
        },
        {
          id: 'main_financial_challenges',
          text: 'Quais os principais desafios financeiros?',
          type: 'long_text',
          required: true,
          placeholder: 'Ex: fluxo de caixa, controle de custos, planejamento...'
        }
      ]
    },
    {
      id: 'objectives_expectations',
      title: 'Objetivos e Expectativas',
      description: 'O que esperam alcançar com a consultoria',
      questions: [
        {
          id: 'main_objectives',
          text: 'Quais são os principais objetivos com nossa consultoria?',
          type: 'long_text',
          required: true,
          placeholder: 'Ex: melhorar fluxo de caixa, reduzir custos, crescer com saúde financeira...'
        },
        {
          id: 'success_metrics',
          text: 'Como vocês medirão o sucesso dos nossos trabalhos?',
          type: 'long_text',
          required: true,
          placeholder: 'Ex: aumento de margem, redução de custos em X%, melhor fluxo...'
        },
        {
          id: 'project_timeline',
          text: 'Qual o prazo esperado para ver resultados?',
          type: 'select',
          required: true,
          options: [
            { value: '1_3_months', label: '1 a 3 meses' },
            { value: '3_6_months', label: '3 a 6 meses' },
            { value: '6_12_months', label: '6 a 12 meses' },
            { value: 'acima_12_months', label: 'Acima de 12 meses' }
          ]
        },
        {
          id: 'current_challenges',
          text: 'Quais os principais obstáculos enfrentados hoje?',
          type: 'long_text',
          required: true,
          placeholder: 'Descreva os maiores desafios atuais...'
        }
      ]
    }
  ];

  // Calcular progresso
  const totalQuestions = briefingQuestions.reduce((acc, section) => 
    acc + section.questions.length, 0
  );
  
  const answeredQuestions = Object.keys(responses).filter(key => 
    responses[key] && responses[key].toString().trim().length > 0
  ).length;
  
  const progressPercentage = Math.round((answeredQuestions / totalQuestions) * 100);

  // CORRIGIDO: Função para atualizar respostas
  const updateResponse = useCallback((questionId, value) => {
    console.log('📝 Atualizando resposta:', questionId, value);
    
    setResponses(prev => {
      const updated = {
        ...prev,
        [questionId]: value
      };
      
      // Auto-save para modo interno
      if (isInternalMode && onSave) {
        // Debounce the save
        clearTimeout(window.briefingAutoSave);
        window.briefingAutoSave = setTimeout(() => {
          onSave(updated).catch(error => {
            console.error('Erro no auto-save:', error);
            setError('Erro ao salvar automaticamente');
          });
        }, 1000);
      }
      
      return updated;
    });
  }, [isInternalMode, onSave]);

  // CORRIGIDO: Renderizar campo de input
  const renderQuestion = (question) => {
    const value = responses[question.id] || '';
    
    return (
      <div key={question.id} className="space-y-3 p-4 border rounded-lg bg-white">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Label htmlFor={question.id} className="text-sm font-medium text-gray-900">
              {question.text}
              {question.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {question.description && (
              <p className="text-xs text-gray-600 mt-1">{question.description}</p>
            )}
          </div>
          {value && (
            <CheckCircle className="w-4 h-4 text-green-500 mt-1" />
          )}
        </div>

        {question.type === 'long_text' && (
          <Textarea
            id={question.id}
            value={value}
            onChange={(e) => updateResponse(question.id, e.target.value)}
            placeholder={question.placeholder}
            rows={4}
            className="w-full resize-none"
            disabled={loading}
          />
        )}

        {question.type === 'short_text' && (
          <Input
            id={question.id}
            type="text"
            value={value}
            onChange={(e) => updateResponse(question.id, e.target.value)}
            placeholder={question.placeholder}
            className="w-full"
            disabled={loading}
          />
        )}

        {question.type === 'select' && (
          <Select
            value={value}
            onValueChange={(newValue) => updateResponse(question.id, newValue)}
            disabled={loading}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione uma opção..." />
            </SelectTrigger>
            <SelectContent>
              {question.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {question.type === 'email' && (
          <Input
            id={question.id}
            type="email"
            value={value}
            onChange={(e) => updateResponse(question.id, e.target.value)}
            placeholder={question.placeholder || 'seu@email.com'}
            className="w-full"
            disabled={loading}
          />
        )}

        {question.type === 'number' && (
          <Input
            id={question.id}
            type="number"
            value={value}
            onChange={(e) => updateResponse(question.id, e.target.value)}
            placeholder={question.placeholder}
            className="w-full"
            disabled={loading}
          />
        )}
      </div>
    );
  };

  const currentSection = briefingQuestions[currentStep - 1];
  const totalSteps = briefingQuestions.length;

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    setError('');
    
    try {
      if (onSubmit) {
        await onSubmit({
          responses,
          completionScore: progressPercentage,
          mode
        });
        setSuccess(isInternalMode ? 'Briefing salvo com sucesso!' : 'Briefing enviado com sucesso!');
      }
    } catch (submitError) {
      console.error('Erro ao finalizar briefing:', submitError);
      setError('Erro ao enviar briefing. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    
    try {
      if (onSave) {
        await onSave(responses);
        setSuccess('Rascunho salvo!');
        setTimeout(() => setSuccess(''), 2000);
      }
    } catch (saveError) {
      console.error('Erro ao salvar:', saveError);
      setError('Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header com informações do cliente */}
      {client && (
        <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                <Building className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900">{client.name}</h2>
                <p className="text-sm text-gray-600">
                  {client.legal_name && client.legal_name !== client.name && (
                    <span>{client.legal_name} • </span>
                  )}
                  {client.industry || 'Empresa'}
                </p>
              </div>
              {showProgress && (
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">{progressPercentage}%</div>
                  <div className="text-xs text-gray-600">completo</div>
                </div>
              )}
            </div>
            
            {showProgress && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Progresso do Briefing</span>
                  <span className="text-sm text-gray-600">{answeredQuestions}/{totalQuestions} respondidas</span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Alertas */}
      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Seção atual */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-600" />
                {currentSection?.title}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {currentSection?.description}
              </p>
            </div>
            <Badge variant="outline">
              Etapa {currentStep} de {totalSteps}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {currentSection?.questions?.map(renderQuestion)}
        </CardContent>
      </Card>

      {/* Navegação */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 1 || loading}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Anterior
        </Button>

        <div className="flex items-center gap-2">
          {/* Salvar rascunho (apenas modo interno) */}
          {isInternalMode && allowSave && (
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={saving || loading}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {saving ? 'Salvando...' : 'Salvar Rascunho'}
            </Button>
          )}

          {/* Próximo ou Finalizar */}
          {currentStep < totalSteps ? (
            <Button onClick={handleNext} disabled={loading}>
              Próximo
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={handleFinish}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              {loading ? 'Enviando...' : (isInternalMode ? 'Finalizar Briefing' : 'Enviar Briefing')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}