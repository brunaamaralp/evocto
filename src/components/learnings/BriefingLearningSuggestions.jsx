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
  Zap,
  Plus,
  X
} from 'lucide-react';
import { useLearningManagement } from '@/hooks/useLearningManagement';
import LearningApplicationModal from './LearningApplicationModal';

/**
 * Componente para exibir sugestões de aprendizados em briefings
 */
export default function BriefingLearningSuggestions({ 
  briefingId, 
  onLearningApplied,
  showTitle = true,
  limit = 3
}) {
  const {
    getBriefingSuggestions,
    loading
  } = useLearningManagement();

  const [suggestions, setSuggestions] = useState([]);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [selectedLearning, setSelectedLearning] = useState(null);

  useEffect(() => {
    if (briefingId) {
      loadSuggestions();
    }
  }, [briefingId]);

  const loadSuggestions = async () => {
    try {
      const suggestions = await getBriefingSuggestions(briefingId, limit);
      setSuggestions(suggestions);
    } catch (error) {
      console.error('Erro ao carregar sugestões:', error);
    }
  };

  const handleLearningClick = (learning) => {
    setSelectedLearning(learning);
    setShowApplicationModal(true);
  };

  const handleApplicationSuccess = () => {
    setShowApplicationModal(false);
    setSelectedLearning(null);
    if (onLearningApplied) {
      onLearningApplied();
    }
    // Recarregar sugestões
    loadSuggestions();
  };

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

  if (!suggestions || suggestions.length === 0) {
    return (
      <Card className="border-slate-200 bg-slate-50">
        <CardContent className="p-6">
          <div className="text-center text-slate-600">
            <Lightbulb className="w-8 h-8 mx-auto mb-2 text-slate-400" />
            <p>Nenhuma sugestão disponível para este briefing.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-purple-200 bg-purple-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-purple-900 flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            {showTitle ? 'Sugestões de Aprendizados' : 'Sugestões'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Lista de sugestões */}
          <div className="space-y-3">
            {suggestions.map((learning, index) => (
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
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-purple-700 border-purple-300 hover:bg-purple-100"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Aplicar
                        </Button>
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
              onClick={loadSuggestions}
              className="flex-1 text-purple-700 border-purple-300 hover:bg-purple-100"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Atualizar Sugestões
            </Button>
            <Button
              size="sm"
              onClick={() => getBriefingSuggestions(briefingId, 10)}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              <Zap className="w-4 h-4 mr-2" />
              Buscar Mais
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Aplicação */}
      {showApplicationModal && selectedLearning && (
        <LearningApplicationModal
          isOpen={showApplicationModal}
          onClose={() => setShowApplicationModal(false)}
          learning={selectedLearning}
          onSuccess={handleApplicationSuccess}
        />
      )}
    </>
  );
}

