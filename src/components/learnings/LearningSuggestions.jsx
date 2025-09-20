import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Lightbulb, 
  Sparkles, 
  TrendingUp, 
  Users, 
  Briefcase, 
  CheckSquare,
  ArrowRight,
  Star,
  Target,
  Zap
} from 'lucide-react';
import { useLearningSuggestions } from '@/hooks/useLearningSuggestions';
import LearningCard from './LearningCard';

/**
 * Componente para exibir sugestões de aprendizados baseadas no contexto
 */
export default function LearningSuggestions({ 
  context, 
  onLearningSelect,
  showTitle = true,
  limit = 3
}) {
  const {
    suggestions,
    loading,
    error,
    getSuggestions,
    clearSuggestions
  } = useLearningSuggestions();

  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (context) {
      getSuggestions({ ...context, limit: isExpanded ? 10 : limit });
    }
  }, [context, isExpanded, limit, getSuggestions]);

  const handleLearningClick = (learning) => {
    if (onLearningSelect) {
      onLearningSelect(learning);
    }
  };

  const getContextIcon = () => {
    if (context?.clientId) return Users;
    if (context?.serviceId) return Briefcase;
    if (context?.taskId) return CheckSquare;
    return Lightbulb;
  };

  const getContextTitle = () => {
    if (context?.clientId) return 'Sugestões para este Cliente';
    if (context?.serviceId) return 'Sugestões para este Serviço';
    if (context?.taskId) return 'Sugestões para esta Tarefa';
    if (context?.tags?.length > 0) return `Sugestões para: ${context.tags.join(', ')}`;
    if (context?.niche) return `Sugestões para ${context.niche}`;
    return 'Sugestões de Aprendizados';
  };

  const ContextIcon = getContextIcon();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <span className="ml-3 text-slate-600">Buscando sugestões...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center text-red-600">
            <Target className="w-5 h-5 mr-2" />
            <span>Erro ao carregar sugestões: {error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return (
      <Card className="border-slate-200 bg-slate-50">
        <CardContent className="p-6">
          <div className="text-center text-slate-600">
            <Lightbulb className="w-8 h-8 mx-auto mb-2 text-slate-400" />
            <p>Nenhuma sugestão disponível para este contexto.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-purple-200 bg-purple-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-purple-900 flex items-center gap-2">
            <ContextIcon className="w-5 h-5" />
            {showTitle ? getContextTitle() : 'Sugestões'}
          </CardTitle>
          {suggestions.length > limit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-purple-700 hover:text-purple-800"
            >
              {isExpanded ? 'Ver menos' : `Ver todas (${suggestions.length})`}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Lista de sugestões */}
        <div className="space-y-3">
          {suggestions.slice(0, isExpanded ? suggestions.length : limit).map((learning, index) => (
            <motion.div
              key={learning.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card 
                className="cursor-pointer hover:shadow-md transition-all duration-200 border-purple-100 hover:border-purple-300"
                onClick={() => handleLearningClick(learning)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-900 mb-1">{learning.title}</h4>
                      <p className="text-sm text-slate-600 mb-2 line-clamp-2">{learning.description}</p>
                      
                      <div className="flex flex-wrap gap-1 mb-2">
                        {learning.niche && (
                          <Badge variant="outline" className="text-xs">{learning.niche}</Badge>
                        )}
                        {learning.format && (
                          <Badge variant="outline" className="text-xs">{learning.format}</Badge>
                        )}
                        {learning.trigger && (
                          <Badge variant="secondary" className="text-xs">{learning.trigger}</Badge>
                        )}
                      </div>

                      {/* Score de relevância */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-500" />
                          <span className="text-xs text-slate-500">
                            Relevância: {Math.round(learning.relevanceScore || 0)}%
                          </span>
                        </div>
                        {learning.confidence_score && (
                          <div className="flex items-center gap-1">
                            <Target className="w-3 h-3 text-green-500" />
                            <span className="text-xs text-slate-500">
                              Confiança: {learning.confidence_score}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="ml-3 flex items-center">
                      <ArrowRight className="w-4 h-4 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Ações */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={clearSuggestions}
            className="flex-1 text-purple-700 border-purple-300 hover:bg-purple-100"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Atualizar Sugestões
          </Button>
          <Button
            size="sm"
            onClick={() => getSuggestions({ ...context, limit: 10 })}
            className="flex-1 bg-purple-600 hover:bg-purple-700"
          >
            <Zap className="w-4 h-4 mr-2" />
            Buscar Mais
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

