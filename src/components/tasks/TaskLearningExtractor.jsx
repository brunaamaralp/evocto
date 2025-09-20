import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, Lightbulb, TrendingUp, Clock, Target,
  CheckCircle, AlertTriangle, Zap, BarChart3,
  FileText, Play, Pause, Download
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { extractLearningsFromTasks } from '@/api/functions';

// Card de insight gerado
const InsightCard = ({ insight, index }) => {
  const getInsightIcon = (tags) => {
    if (tags.includes('sucesso')) return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (tags.includes('gargalo')) return <AlertTriangle className="w-5 h-5 text-orange-500" />;
    if (tags.includes('tempo')) return <Clock className="w-5 h-5 text-blue-500" />;
    return <Lightbulb className="w-5 h-5 text-purple-500" />;
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 85) return 'bg-green-100 text-green-700';
    if (confidence >= 70) return 'bg-yellow-100 text-yellow-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {getInsightIcon(insight.tags)}
              <div>
                <CardTitle className="text-base font-semibold text-gray-900">
                  {insight.title}
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  {insight.description}
                </p>
              </div>
            </div>
            <Badge className={`${getConfidenceColor(insight.confidence)} text-xs`}>
              {insight.confidence}% confiança
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2 mb-3">
            {insight.tags.map((tag, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
          
          {/* Métricas específicas */}
          {insight.resultJSON && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                {insight.resultJSON.avgTime && (
                  <div>
                    <span className="text-gray-600">Tempo médio:</span>
                    <span className="font-medium ml-2">{Math.round(insight.resultJSON.avgTime * 10) / 10} dias</span>
                  </div>
                )}
                {insight.resultJSON.onTimeRate && (
                  <div>
                    <span className="text-gray-600">Taxa no prazo:</span>
                    <span className="font-medium ml-2">{Math.round(insight.resultJSON.onTimeRate)}%</span>
                  </div>
                )}
                {insight.resultJSON.sampleSize && (
                  <div>
                    <span className="text-gray-600">Tarefas analisadas:</span>
                    <span className="font-medium ml-2">{insight.resultJSON.sampleSize}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Componente principal
export const TaskLearningExtractor = ({ 
  clientId = null, 
  cycleId = null, 
  onLearningsExtracted 
}) => {
  const [extracting, setExtracting] = useState(false);
  const [results, setResults] = useState(null);
  const [showResults, setShowResults] = useState(false);

  const handleExtractLearnings = async () => {
    try {
      setExtracting(true);
      
      const response = await extractLearningsFromTasks({
        clientId,
        cycleId,
        timeRange: 30,
        minTasksRequired: 3
      });

      if (response.data.success) {
        setResults(response.data);
        setShowResults(true);
        
        toast.success(
          `${response.data.learningsCreated} aprendizados extraídos de ${response.data.tasksAnalyzed} tarefas!`
        );

        if (onLearningsExtracted) {
          onLearningsExtracted(response.data);
        }
      } else {
        toast.info(response.data.message || 'Nenhum aprendizado novo identificado');
      }

    } catch (error) {
      console.error('Erro ao extrair aprendizados:', error);
      toast.error('Erro ao extrair aprendizados das tarefas');
    } finally {
      setExtracting(false);
    }
  };

  const handleExportResults = () => {
    if (!results) return;
    
    const data = {
      extraction: {
        date: new Date().toISOString(),
        clientId,
        cycleId,
        correlationId: results.correlationId
      },
      summary: {
        tasksAnalyzed: results.tasksAnalyzed,
        learningsCreated: results.learningsCreated,
        duration: results.duration
      },
      insights: results.insights,
      analysis: results.analysis
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `task-learnings-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Relatório de aprendizados exportado!');
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-gray-900">
                  Extração de Aprendizados
                </CardTitle>
                <p className="text-gray-600 text-sm">
                  Analise tarefas concluídas para identificar padrões e otimizações
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {results && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportResults}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Exportar
                </Button>
              )}
              
              <Button
                onClick={handleExtractLearnings}
                disabled={extracting}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 gap-2"
              >
                {extracting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Extrair Aprendizados
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {extracting && (
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Brain className="w-4 h-4 animate-pulse" />
                <span>Analisando padrões em tarefas concluídas...</span>
              </div>
              <Progress value={undefined} className="h-2" />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Resultados */}
      <AnimatePresence>
        {showResults && results && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-6"
          >
            {/* Resumo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  Resumo da Análise
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{results.tasksAnalyzed}</div>
                    <div className="text-sm text-gray-600">Tarefas Analisadas</div>
                  </div>
                  
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{results.learningsCreated}</div>
                    <div className="text-sm text-gray-600">Aprendizados Gerados</div>
                  </div>
                  
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{results.analysis?.timePatterns || 0}</div>
                    <div className="text-sm text-gray-600">Padrões de Tempo</div>
                  </div>
                  
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{results.analysis?.bottlenecks || 0}</div>
                    <div className="text-sm text-gray-600">Gargalos Identificados</div>
                  </div>
                </div>
                
                <div className="mt-4 text-sm text-gray-500">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Análise concluída em {Math.round(results.duration || 0)}ms
                </div>
              </CardContent>
            </Card>

            {/* Insights gerados */}
            {results.insights && results.insights.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-yellow-500" />
                    Insights Identificados ({results.insights.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {results.insights.map((insight, index) => (
                      <InsightCard key={insight.id} insight={insight} index={index} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Ações */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>
                      Aprendizados adicionados à biblioteca e disponíveis para uso em futuros planejamentos
                    </span>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowResults(false)}
                  >
                    Ocultar Resultados
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TaskLearningExtractor;