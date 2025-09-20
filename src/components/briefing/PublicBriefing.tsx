/**
 * 📋 Componente de Briefing Público para Cliente
 * 
 * Interface para o cliente responder ao briefing obrigatório
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  Send, 
  CheckCircle, 
  Clock, 
  User, 
  Building,
  Calendar,
  Target,
  Lightbulb,
  Save,
  ArrowRight
} from 'lucide-react';
import { Brief, Task } from '@/api/entities';
import { toast } from 'sonner';

interface PublicBriefingProps {
  serviceId: string;
  clientId: string;
  onComplete?: () => void;
}

interface BriefingResponse {
  business_description: string;
  main_products: string;
  target_market: string;
  main_objectives: string;
  success_metrics: string;
  current_challenges: string;
  budget_range: string;
  timeline: string;
  additional_info: string;
}

const BRIEFING_QUESTIONS = [
  {
    id: 'business_description',
    title: 'Descrição do Negócio',
    description: 'Conte-nos sobre sua empresa e o que ela faz',
    placeholder: 'Descreva sua empresa, produtos/serviços principais e mercado de atuação...',
    required: true,
    icon: Building
  },
  {
    id: 'main_products',
    title: 'Produtos/Serviços Principais',
    description: 'Quais são seus principais produtos ou serviços?',
    placeholder: 'Liste seus produtos ou serviços mais importantes...',
    required: true,
    icon: Target
  },
  {
    id: 'target_market',
    title: 'Público-Alvo',
    description: 'Quem são seus clientes ideais?',
    placeholder: 'Descreva seu público-alvo, personas e segmentos de mercado...',
    required: true,
    icon: User
  },
  {
    id: 'main_objectives',
    title: 'Objetivos Principais',
    description: 'Quais são os principais objetivos desta consultoria?',
    placeholder: 'Descreva os objetivos específicos que você espera alcançar...',
    required: true,
    icon: Target
  },
  {
    id: 'success_metrics',
    title: 'Métricas de Sucesso',
    description: 'Como você medirá o sucesso do projeto?',
    placeholder: 'Defina KPIs, indicadores ou resultados esperados...',
    required: true,
    icon: CheckCircle
  },
  {
    id: 'current_challenges',
    title: 'Desafios Atuais',
    description: 'Quais são os principais desafios que você enfrenta?',
    placeholder: 'Descreva os problemas ou dificuldades atuais...',
    required: true,
    icon: Lightbulb
  },
  {
    id: 'budget_range',
    title: 'Faixa de Investimento',
    description: 'Qual é a faixa de investimento disponível?',
    placeholder: 'Informe a faixa de investimento (opcional)...',
    required: false,
    icon: Target
  },
  {
    id: 'timeline',
    title: 'Cronograma',
    description: 'Qual é o prazo esperado para o projeto?',
    placeholder: 'Descreva o cronograma desejado (opcional)...',
    required: false,
    icon: Calendar
  },
  {
    id: 'additional_info',
    title: 'Informações Adicionais',
    description: 'Alguma informação adicional que gostaria de compartilhar?',
    placeholder: 'Compartilhe qualquer informação adicional relevante...',
    required: false,
    icon: FileText
  }
];

export default function PublicBriefing({ serviceId, clientId, onComplete }: PublicBriefingProps) {
  const [responses, setResponses] = useState<BriefingResponse>({
    business_description: '',
    main_products: '',
    target_market: '',
    main_objectives: '',
    success_metrics: '',
    current_challenges: '',
    budget_range: '',
    timeline: '',
    additional_info: ''
  });
  
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [briefingTask, setBriefingTask] = useState(null);
  const [completionScore, setCompletionScore] = useState(0);

  // Carregar briefing task
  const loadBriefingTask = useCallback(async () => {
    try {
      const tasks = await Task.filter({
        serviceId,
        type: 'mandatory_briefing'
      });

      if (tasks.length > 0) {
        setBriefingTask(tasks[0]);
      }
    } catch (error) {
      console.error('Erro ao carregar briefing task:', error);
    }
  }, [serviceId]);

  useEffect(() => {
    loadBriefingTask();
  }, [loadBriefingTask]);

  // Calcular score de conclusão
  const calculateCompletionScore = useCallback(() => {
    const requiredQuestions = BRIEFING_QUESTIONS.filter(q => q.required);
    const completedRequired = requiredQuestions.filter(q => 
      responses[q.id as keyof BriefingResponse]?.trim().length > 0
    ).length;
    
    return Math.round((completedRequired / requiredQuestions.length) * 100);
  }, [responses]);

  // Atualizar score quando respostas mudarem
  useEffect(() => {
    setCompletionScore(calculateCompletionScore());
  }, [responses, calculateCompletionScore]);

  // Salvar respostas automaticamente
  const saveResponses = useCallback(async (autoSave = false) => {
    try {
      setSaving(true);

      // Criar ou atualizar briefing
      const briefingData = {
        agencyId: briefingTask?.agencyId,
        projectId: clientId,
        serviceId,
        business_context: responses.business_description,
        objectives: responses.main_objectives,
        success_metrics: responses.success_metrics,
        current_challenges: responses.current_challenges,
        status: completionScore === 100 ? 'READY' : 'DRAFT',
        completion_score: completionScore,
        responses: responses,
        metadata: {
          is_public_briefing: true,
          client_responses: true,
          auto_saved: autoSave
        }
      };

      if (briefingTask?.briefingId) {
        await Brief.update(briefingTask.briefingId, briefingData);
      } else {
        const newBrief = await Brief.create(briefingData);
        // Atualizar briefing task com o ID do briefing
        if (briefingTask) {
          await Task.update(briefingTask.id, {
            briefingId: newBrief.id,
            metadata: {
              ...briefingTask.metadata,
              briefingId: newBrief.id
            }
          });
        }
      }

      if (!autoSave) {
        toast.success('Respostas salvas com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao salvar briefing:', error);
      if (!autoSave) {
        toast.error('Erro ao salvar respostas');
      }
    } finally {
      setSaving(false);
    }
  }, [responses, completionScore, briefingTask, clientId, serviceId]);

  // Auto-save a cada 30 segundos
  useEffect(() => {
    if (completionScore > 0) {
      const interval = setInterval(() => {
        saveResponses(true);
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [saveResponses, completionScore]);

  // Enviar briefing completo
  const submitBriefing = async () => {
    if (completionScore < 100) {
      toast.error('Por favor, complete todas as perguntas obrigatórias');
      return;
    }

    try {
      setLoading(true);
      
      await saveResponses(false);
      
      // Atualizar tarefa de briefing
      if (briefingTask) {
        await Task.update(briefingTask.id, {
          status: 'completed',
          completion_score: 100,
          checklist: briefingTask.checklist?.map(item => 
            item.id === 'review_client_responses' 
              ? { ...item, completed: true }
              : item
          )
        });
      }

      toast.success('Briefing enviado com sucesso!');
      onComplete?.();
    } catch (error) {
      console.error('Erro ao enviar briefing:', error);
      toast.error('Erro ao enviar briefing');
    } finally {
      setLoading(false);
    }
  };

  const handleResponseChange = (questionId: string, value: string) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const nextQuestion = () => {
    if (currentQuestion < BRIEFING_QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const goToQuestion = (index: number) => {
    setCurrentQuestion(index);
  };

  const currentQ = BRIEFING_QUESTIONS[currentQuestion];
  const IconComponent = currentQ.icon;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <FileText className="w-16 h-16 text-blue-600 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Briefing Estratégico
        </h1>
        <p className="text-gray-600">
          Ajude-nos a entender melhor seu negócio para oferecer a melhor consultoria
        </p>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium">Progresso</span>
            <span className="text-sm text-gray-600">{completionScore}%</span>
          </div>
          <Progress value={completionScore} className="h-2 mb-4" />
          
          <div className="flex flex-wrap gap-2">
            {BRIEFING_QUESTIONS.map((question, index) => {
              const isAnswered = responses[question.id as keyof BriefingResponse]?.trim().length > 0;
              const isCurrent = index === currentQuestion;
              
              return (
                <button
                  key={question.id}
                  onClick={() => goToQuestion(index)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    isCurrent 
                      ? 'bg-blue-600 text-white' 
                      : isAnswered 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Question */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconComponent className="w-5 h-5" />
            {currentQ.title}
            {currentQ.required && <Badge variant="destructive">Obrigatório</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">{currentQ.description}</p>
          
          <div>
            <Label htmlFor={currentQ.id} className="sr-only">
              {currentQ.title}
            </Label>
            <Textarea
              id={currentQ.id}
              value={responses[currentQ.id as keyof BriefingResponse]}
              onChange={(e) => handleResponseChange(currentQ.id, e.target.value)}
              placeholder={currentQ.placeholder}
              rows={6}
              className="resize-none"
            />
          </div>

          {/* Auto-save indicator */}
          {saving && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Save className="w-4 h-4 animate-pulse" />
              Salvando automaticamente...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={prevQuestion}
          disabled={currentQuestion === 0}
        >
          Anterior
        </Button>
        
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={saveResponses}
            disabled={saving}
          >
            <Save className="w-4 h-4 mr-2" />
            Salvar Rascunho
          </Button>
          
          {currentQuestion === BRIEFING_QUESTIONS.length - 1 ? (
            <Button 
              onClick={submitBriefing}
              disabled={completionScore < 100 || loading}
            >
              {loading ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Briefing
                </>
              )}
            </Button>
          ) : (
            <Button onClick={nextQuestion}>
              Próxima
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>

      {/* Completion Alert */}
      {completionScore === 100 && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Parabéns!</strong> Todas as perguntas obrigatórias foram respondidas. 
            Você pode enviar o briefing ou continuar editando.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

