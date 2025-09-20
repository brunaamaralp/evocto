
import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { SmartRecommendation } from '@/api/entities';
import { generateSmartRecommendations } from '@/api/functions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Lightbulb, TrendingUp, Target, Zap, CheckCircle, X,
  ThumbsUp, ThumbsDown, Clock, ArrowRight, Sparkles,
  BarChart3, Users, MessageCircle, Settings, Eye, Brain
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Tipos de recomendações
const RECOMMENDATION_TYPES = {
  strategy: {
    icon: Target,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    title: 'Estratégia'
  },
  performance: {
    icon: TrendingUp,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    title: 'Performance'
  },
  audience: {
    icon: Users,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    title: 'Audiência'
  },
  optimization: {
    icon: Zap,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    title: 'Otimização'
  },
  content: {
    icon: MessageCircle,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    title: 'Conteúdo'
  }
};

// Status das recomendações
const STATUS_COLORS = {
  active: 'bg-blue-100 text-blue-700',
  applied: 'bg-green-100 text-green-700',
  dismissed: 'bg-gray-100 text-gray-700',
  expired: 'bg-red-100 text-red-700'
};

// Card de recomendação
const RecommendationCard = ({ recommendation, onApply, onDismiss, onViewDetails }) => {
  const typeConfig = RECOMMENDATION_TYPES[recommendation.type] || RECOMMENDATION_TYPES.strategy;
  const TypeIcon = typeConfig.icon;
  const [showTimeline, setShowTimeline] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`bg-white rounded-xl border-2 ${typeConfig.borderColor} p-6 hover:shadow-lg transition-all`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div className={`w-12 h-12 rounded-xl ${typeConfig.bgColor} flex items-center justify-center`}>
            <TypeIcon className={`w-6 h-6 ${typeConfig.color}`} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">{recommendation.title}</h3>
            <p className="text-sm text-gray-600 mb-2">{recommendation.summary}</p>
            <div className="flex items-center gap-2">
              <Badge className={typeConfig.bgColor + ' ' + typeConfig.color + ' border-0'}>
                {typeConfig.title}
              </Badge>
              <Badge className={STATUS_COLORS[recommendation.status]}>
                {recommendation.status === 'active' ? 'Ativa' : 
                 recommendation.status === 'applied' ? 'Aplicada' :
                 recommendation.status === 'dismissed' ? 'Dispensada' : 'Expirada'}
              </Badge>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 mb-1">
            <Sparkles className="w-4 h-4 text-yellow-500" />
            <span className="font-semibold text-gray-900">{recommendation.confidence}%</span>
          </div>
          <div className="text-xs text-gray-500">Confiança</div>
        </div>
      </div>

      {/* Impact & Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="font-bold text-2xl text-green-600">+{recommendation.impact}%</div>
          <div className="text-xs text-gray-600">Impacto Estimado</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="font-bold text-2xl text-blue-600">
            {recommendation.basedOn?.length || 0}
          </div>
          <div className="text-xs text-gray-600">Evidências</div>
        </div>
      </div>

      {/* Implementation Preview */}
      <div className="mb-4">
        <h4 className="font-medium text-gray-900 mb-2">Como implementar:</h4>
        <p className="text-sm text-gray-600 line-clamp-2">{recommendation.implementation}</p>
      </div>

      {/* Timeline */}
      {recommendation.timeline && recommendation.timeline.length > 0 && (
        <div className="mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTimeline(!showTimeline)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 p-0"
          >
            <Clock className="w-4 h-4" />
            Timeline ({recommendation.timeline.length} passos)
            <ArrowRight className={`w-4 h-4 transition-transform ${showTimeline ? 'rotate-90' : ''}`} />
          </Button>
          
          <AnimatePresence>
            {showTimeline && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-3 space-y-2"
              >
                {recommendation.timeline.map((step, index) => (
                  <div key={index} className="flex items-start gap-3 text-sm">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-xs">
                      {index + 1}
                    </div>
                    <span className="text-gray-700">{step}</span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Risks */}
      {recommendation.risks && recommendation.risks.length > 0 && (
        <div className="mb-4">
          <h4 className="font-medium text-gray-900 mb-2 text-sm">Considerações:</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            {recommendation.risks.slice(0, 2).map((risk, index) => (
              <li key={index} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 flex-shrink-0" />
                <span>{risk}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Clock className="w-3 h-3" />
          <span>
            {format(new Date(recommendation.generatedAt), 'dd/MM HH:mm', { locale: ptBR })}
          </span>
        </div>
        
        {recommendation.status === 'active' && (
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewDetails(recommendation)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Ver detalhes</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDismiss(recommendation.id)}
              className="text-gray-600 hover:text-red-600"
            >
              <X className="w-4 h-4" />
            </Button>
            
            <Button
              size="sm"
              onClick={() => onApply(recommendation.id)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Aplicar
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Componente principal de Recomendações Inteligentes
export const SmartRecommendations = ({ clientId, serviceId, context = 'general', maxRecommendations = 5 }) => {
  const { user } = useSession();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [feedback, setFeedback] = useState('');

  const loadRecommendations = useCallback(async () => {
    try {
      setLoading(true);
      const filters = { 
        agencyId: user.agencyId,
        status: 'active'
      };
      
      if (clientId) filters.clientId = clientId;
      if (serviceId) filters.serviceId = serviceId;

      const data = await SmartRecommendation.filter(filters, '-generatedAt', maxRecommendations);
      setRecommendations(data);
    } catch (error) {
      console.error('Erro ao carregar recomendações:', error);
      toast.error('Erro ao carregar recomendações');
    } finally {
      setLoading(false);
    }
  }, [user, clientId, serviceId, maxRecommendations]);

  // Carregar recomendações existentes
  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  // Gerar novas recomendações
  const generateRecommendations = async () => {
    try {
      setGenerating(true);
      toast.loading('Gerando recomendações inteligentes...');
      
      const result = await generateSmartRecommendations({
        clientId,
        serviceId,
        context,
        maxRecommendations
      });

      if (result.data?.success) {
        toast.success(`${result.data.recommendations.length} recomendações geradas!`);
        await loadRecommendations();
      } else {
        throw new Error(result.data?.error || 'Erro na geração');
      }
    } catch (error) {
      console.error('Erro ao gerar recomendações:', error);
      toast.error(`Erro ao gerar recomendações: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  // Aplicar recomendação
  const applyRecommendation = async (recommendationId) => {
    try {
      await SmartRecommendation.update(recommendationId, {
        status: 'applied',
        appliedAt: new Date().toISOString(),
        appliedBy: user.email
      });
      
      toast.success('Recomendação aplicada com sucesso!');
      await loadRecommendations();
    } catch (error) {
      console.error('Erro ao aplicar recomendação:', error);
      toast.error('Erro ao aplicar recomendação');
    }
  };

  // Dispensar recomendação
  const dismissRecommendation = async (recommendationId) => {
    try {
      await SmartRecommendation.update(recommendationId, {
        status: 'dismissed'
      });
      
      toast.success('Recomendação dispensada');
      await loadRecommendations();
    } catch (error) {
      console.error('Erro ao dispensar recomendação:', error);
      toast.error('Erro ao dispensar recomendação');
    }
  };

  // Ver detalhes da recomendação
  const viewRecommendationDetails = (recommendation) => {
    setSelectedRecommendation(recommendation);
    setShowDetails(true);
  };

  // Enviar feedback
  const submitFeedback = async (rating) => {
    if (!selectedRecommendation) return;

    try {
      await SmartRecommendation.update(selectedRecommendation.id, {
        feedback: {
          rating,
          comment: feedback,
          providedBy: user.email,
          providedAt: new Date().toISOString()
        }
      });

      toast.success('Feedback enviado com sucesso!');
      setShowDetails(false);
      setFeedback('');
      await loadRecommendations();
    } catch (error) {
      console.error('Erro ao enviar feedback:', error);
      toast.error('Erro ao enviar feedback');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <Brain className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-pulse" />
        <p className="text-gray-600">Carregando recomendações inteligentes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Lightbulb className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Recomendações Inteligentes</h2>
            <p className="text-sm text-gray-600">Sugestões baseadas em dados e aprendizados</p>
          </div>
        </div>
        
        <Button 
          onClick={generateRecommendations}
          disabled={generating}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {generating ? (
            <>
              <Sparkles className="w-4 h-4 mr-2 animate-spin" />
              Gerando...
            </>
          ) : (
            <>
              <Brain className="w-4 h-4 mr-2" />
              Gerar Recomendações
            </>
          )}
        </Button>
      </div>

      {/* Recommendations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnimatePresence>
          {recommendations.map((recommendation) => (
            <RecommendationCard
              key={recommendation.id}
              recommendation={recommendation}
              onApply={applyRecommendation}
              onDismiss={dismissRecommendation}
              onViewDetails={viewRecommendationDetails}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {recommendations.length === 0 && !generating && (
        <div className="text-center py-12">
          <Lightbulb className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma recomendação ativa</h3>
          <p className="text-gray-600 mb-4">Gere recomendações inteligentes baseadas nos seus dados</p>
          <Button onClick={generateRecommendations} disabled={generating}>
            <Brain className="w-4 h-4 mr-2" />
            Gerar Primeira Recomendação
          </Button>
        </div>
      )}

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedRecommendation && (
                <>
                  <div className={`w-8 h-8 rounded-lg ${RECOMMENDATION_TYPES[selectedRecommendation.type]?.bgColor} flex items-center justify-center`}>
                    {React.createElement(RECOMMENDATION_TYPES[selectedRecommendation.type]?.icon, {
                      className: `w-4 h-4 ${RECOMMENDATION_TYPES[selectedRecommendation.type]?.color}`
                    })}
                  </div>
                  {selectedRecommendation.title}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedRecommendation?.summary}
            </DialogDescription>
          </DialogHeader>

          {selectedRecommendation && (
            <div className="space-y-6">
              {/* Implementation */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Como implementar:</h3>
                <p className="text-gray-700 leading-relaxed">{selectedRecommendation.implementation}</p>
              </div>

              {/* Timeline */}
              {selectedRecommendation.timeline && selectedRecommendation.timeline.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Timeline de implementação:</h3>
                  <div className="space-y-3">
                    {selectedRecommendation.timeline.map((step, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-sm">
                          {index + 1}
                        </div>
                        <div className="flex-1 pt-1">
                          <p className="text-gray-700">{step}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Evidence Sources */}
              {selectedRecommendation.evidenceSources && selectedRecommendation.evidenceSources.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Baseado em:</h3>
                  <div className="space-y-2">
                    {selectedRecommendation.evidenceSources.map((source, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                        <div>
                          <p className="font-medium text-sm text-gray-900">{source.type}</p>
                          <p className="text-sm text-gray-600">{source.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Metrics */}
              {selectedRecommendation.metrics && Object.keys(selectedRecommendation.metrics).length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Métricas esperadas:</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {selectedRecommendation.metrics.current && (
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="font-semibold text-gray-900">{selectedRecommendation.metrics.current}</div>
                        <div className="text-xs text-gray-600">Atual</div>
                      </div>
                    )}
                    {selectedRecommendation.metrics.projected && (
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="font-semibold text-blue-900">{selectedRecommendation.metrics.projected}</div>
                        <div className="text-xs text-blue-600">Projetado</div>
                      </div>
                    )}
                    {selectedRecommendation.metrics.improvement && (
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="font-semibold text-green-900">{selectedRecommendation.metrics.improvement}</div>
                        <div className="text-xs text-green-600">Melhoria</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Risks */}
              {selectedRecommendation.risks && selectedRecommendation.risks.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Considerações importantes:</h3>
                  <ul className="space-y-2">
                    {selectedRecommendation.risks.map((risk, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-orange-500 mt-2" />
                        <span className="text-gray-700">{risk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Feedback Section */}
              <div className="border-t pt-6">
                <h3 className="font-semibold text-gray-900 mb-3">Avalie esta recomendação:</h3>
                <Textarea
                  placeholder="Deixe um comentário sobre esta recomendação..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="mb-4"
                />
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => submitFeedback('positive')}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <ThumbsUp className="w-4 h-4 mr-2" />
                    Útil
                  </Button>
                  <Button
                    onClick={() => submitFeedback('negative')}
                    variant="outline"
                    className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                  >
                    <ThumbsDown className="w-4 h-4 mr-2" />
                    Não útil
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SmartRecommendations;
