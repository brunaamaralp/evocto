import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Brain, Sparkles, TrendingUp, AlertCircle, CheckCircle,
  Lightbulb, Target, Clock, ArrowRight, Zap, MessageCircle,
  BarChart3, Users, FileText, Settings, X, Send, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

// Tipos de sugestões da IA
const SUGGESTION_TYPES = {
  plan_optimization: {
    icon: Target,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    title: 'Otimização de Planejamento'
  },
  learning_application: {
    icon: Lightbulb,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    title: 'Aplicação de Aprendizados'
  },
  performance_insight: {
    icon: TrendingUp,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    title: 'Insight de Performance'
  },
  risk_detection: {
    icon: AlertCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    title: 'Detecção de Risco'
  },
  automation_opportunity: {
    icon: Zap,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    title: 'Oportunidade de Automação'
  }
};

// Componente de sugestão da IA
const AISuggestionCard = ({ suggestion, onApply, onDismiss }) => {
  const config = SUGGESTION_TYPES[suggestion.type] || SUGGESTION_TYPES.plan_optimization;
  const IconComponent = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${config.bgColor} flex items-center justify-center`}>
            <IconComponent className={`w-5 h-5 ${config.color}`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{suggestion.title}</h3>
            <p className="text-sm text-gray-500">{config.title}</p>
          </div>
        </div>
        <Badge className={`${config.bgColor} ${config.color} border-0`}>
          {suggestion.confidence}% confiança
        </Badge>
      </div>

      <p className="text-gray-700 mb-4 leading-relaxed">
        {suggestion.description}
      </p>

      {suggestion.evidence && (
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <h4 className="font-medium text-gray-900 mb-2">Evidências:</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            {suggestion.evidence.map((item, index) => (
              <li key={index} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-2 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock className="w-4 h-4" />
          <span>Sugerido há {suggestion.timeAgo}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDismiss(suggestion.id)}
          >
            Dispensar
          </Button>
          <Button
            size="sm"
            onClick={() => onApply(suggestion)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Aplicar Sugestão
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

// Componente principal do Assistente de IA
export const AIAssistant = ({ clientId, serviceId, context = 'general' }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);

  // Simular carregamento de sugestões da IA
  useEffect(() => {
    loadAISuggestions();
  }, [clientId, serviceId]);

  const loadAISuggestions = async () => {
    setLoading(true);
    
    // Simular delay da IA
    setTimeout(() => {
      const mockSuggestions = [
        {
          id: '1',
          type: 'learning_application',
          title: 'Aplicar segmentação que aumentou conversões em 23%',
          description: 'Com base no aprendizado "Segmentação por faixa etária 25-45 anos", recomendo aplicar essa estratégia ao próximo ciclo deste cliente.',
          confidence: 87,
          evidence: [
            'Cliente similar no setor de e-commerce teve 23% mais conversões',
            'Público-alvo tem características demográficas similares',
            'Budget disponível suporta segmentação avançada'
          ],
          timeAgo: '2 horas',
          actionable: true
        },
        {
          id: '2',
          type: 'performance_insight',
          title: 'Otimizar horário de postagens',
          description: 'Análise dos dados mostra que posts entre 19h-21h têm 34% mais engajamento para este cliente.',
          confidence: 92,
          evidence: [
            'Análise de 3 meses de dados de engajamento',
            'Padrão consistente em todas as redes sociais',
            'Audiência mais ativa neste horário'
          ],
          timeAgo: '1 dia',
          actionable: true
        },
        {
          id: '3',
          type: 'risk_detection',
          title: 'Risco de churn detectado',
          description: 'Cliente não interage com aprovações há 15 dias. Recomendo contato proativo.',
          confidence: 78,
          evidence: [
            'Última interação há 15 dias',
            'Padrão similar em clientes que cancelaram',
            'NPS em declínio nos últimos 2 meses'
          ],
          timeAgo: '4 horas',
          actionable: true
        }
      ];
      
      setSuggestions(mockSuggestions);
      setLoading(false);
    }, 1500);
  };

  const handleApplySuggestion = async (suggestion) => {
    toast.success(`Aplicando sugestão: ${suggestion.title}`);
    
    // Remover da lista
    setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
    
    // Aqui integraria com o backend para aplicar a sugestão
    console.log('Aplicando sugestão:', suggestion);
  };

  const handleDismissSuggestion = (suggestionId) => {
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
    toast.info('Sugestão dispensada');
  };

  const handleSendChatMessage = async () => {
    if (!chatMessage.trim()) return;

    const userMessage = { role: 'user', content: chatMessage, timestamp: new Date() };
    setChatHistory(prev => [...prev, userMessage]);
    setChatMessage('');

    // Simular resposta da IA
    setTimeout(() => {
      const aiResponse = {
        role: 'assistant',
        content: 'Com base nos dados disponíveis, posso sugerir algumas otimizações para este cliente. Você gostaria de ver análises específicas de performance ou recomendações estratégicas?',
        timestamp: new Date()
      };
      setChatHistory(prev => [...prev, aiResponse]);
    }, 1000);
  };

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    toast.info('IA analisando dados do cliente...');
    
    setTimeout(() => {
      setIsAnalyzing(false);
      loadAISuggestions();
      toast.success('Análise concluída! Novas sugestões disponíveis.');
    }, 3000);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <CardTitle>Assistente de IA</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">IA analisando dados e gerando sugestões...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com ações */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <div>
                <CardTitle>Assistente de IA</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  {suggestions.length} sugestões ativas
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowChat(true)}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Chat com IA
              </Button>
              <Button
                size="sm"
                onClick={runAnalysis}
                disabled={isAnalyzing}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Nova Análise
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Lista de sugestões */}
      <div className="space-y-4">
        <AnimatePresence>
          {suggestions.map(suggestion => (
            <AISuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              onApply={handleApplySuggestion}
              onDismiss={handleDismissSuggestion}
            />
          ))}
        </AnimatePresence>

        {suggestions.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">Nenhuma sugestão no momento</h3>
              <p className="text-gray-600 mb-4">A IA está monitorando e gerará sugestões conforme identifica oportunidades.</p>
              <Button onClick={runAnalysis}>
                <Brain className="w-4 h-4 mr-2" />
                Executar Análise
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog do Chat com IA */}
      <Dialog open={showChat} onOpenChange={setShowChat}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Chat com Assistente de IA
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col h-96">
            <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-gray-50 rounded-lg">
              {chatHistory.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <Brain className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p>Faça uma pergunta sobre estratégias, performance ou otimizações!</p>
                </div>
              ) : (
                chatHistory.map((message, index) => (
                  <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-lg ${
                      message.role === 'user' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white border border-gray-200'
                    }`}>
                      <p className="text-sm">{message.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="flex items-center gap-2 mt-4">
              <Textarea
                placeholder="Pergunte algo sobre este cliente ou estratégias em geral..."
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                className="flex-1"
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendChatMessage();
                  }
                }}
              />
              <Button onClick={handleSendChatMessage} disabled={!chatMessage.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AIAssistant;