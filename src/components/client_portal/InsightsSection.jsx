import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Lightbulb, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';

/**
 * Seção de insights da IA em linguagem simples
 */
export default function InsightsSection({ insights }) {
  const [expandedInsights, setExpandedInsights] = useState(new Set());

  // Categorizar insights por tipo
  const categorizeInsights = (insights) => {
    const categories = {
      positive: [],
      warning: [],
      neutral: [],
      action: []
    };

    insights.forEach(insight => {
      const text = insight.toLowerCase();
      
      if (text.includes('subiu') || text.includes('cresceu') || text.includes('melhorou') || 
          text.includes('aumentou') || text.includes('positivo') || text.includes('bom')) {
        categories.positive.push(insight);
      } else if (text.includes('atenção') || text.includes('cuidado') || text.includes('problema') || 
                 text.includes('acima') || text.includes('abaixo') || text.includes('declínio')) {
        categories.warning.push(insight);
      } else if (text.includes('priorize') || text.includes('foco') || text.includes('recomendo') || 
                 text.includes('sugiro') || text.includes('considere') || text.includes('implemente')) {
        categories.action.push(insight);
      } else {
        categories.neutral.push(insight);
      }
    });

    return categories;
  };

  // Obter ícone baseado no tipo
  const getInsightIcon = (type) => {
    switch (type) {
      case 'positive': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'action': return TrendingUp;
      default: return Info;
    }
  };

  // Obter cor baseada no tipo
  const getInsightColor = (type) => {
    switch (type) {
      case 'positive': return 'text-green-600 bg-green-100 border-green-200';
      case 'warning': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'action': return 'text-blue-600 bg-blue-100 border-blue-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  // Obter texto do tipo
  const getInsightTypeText = (type) => {
    switch (type) {
      case 'positive': return 'Positivo';
      case 'warning': return 'Atenção';
      case 'action': return 'Ação';
      default: return 'Informação';
    }
  };

  // Extrair palavras-chave do insight
  const extractKeywords = (insight) => {
    const keywords = [];
    const text = insight.toLowerCase();
    
    if (text.includes('margem')) keywords.push('Margem');
    if (text.includes('receita')) keywords.push('Receita');
    if (text.includes('inadimplência')) keywords.push('Inadimplência');
    if (text.includes('fluxo')) keywords.push('Fluxo de Caixa');
    if (text.includes('custo')) keywords.push('Custos');
    if (text.includes('meta')) keywords.push('Meta');
    if (text.includes('crescimento')) keywords.push('Crescimento');
    
    return keywords;
  };

  // Alternar expansão do insight
  const toggleInsight = (index) => {
    const newExpanded = new Set(expandedInsights);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedInsights(newExpanded);
  };

  if (!insights || insights.length === 0) {
    return (
      <Card className="border-dashed border-gray-300">
        <CardContent className="p-8 text-center">
          <Lightbulb className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum insight disponível</h3>
          <p className="text-gray-600">
            Insights serão gerados conforme os dados forem analisados
          </p>
        </CardContent>
      </Card>
    );
  }

  const categorizedInsights = categorizeInsights(insights);

  return (
    <div className="space-y-6">
      {/* Header com resumo */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <span className="text-sm text-gray-600">
            {insights.length} insights gerados pela IA
          </span>
        </div>
        <Badge variant="outline" className="text-xs">
          Linguagem simples
        </Badge>
      </div>

      {/* Insights por categoria */}
      {Object.entries(categorizedInsights).map(([type, typeInsights]) => {
        if (typeInsights.length === 0) return null;

        const InsightIcon = getInsightIcon(type);
        const insightColor = getInsightColor(type);
        const typeText = getInsightTypeText(type);

        return (
          <motion.div
            key={type}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className={`border-l-4 ${insightColor.split(' ')[2]}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <InsightIcon className="w-5 h-5" />
                  {typeText} ({typeInsights.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {typeInsights.map((insight, index) => {
                  const globalIndex = insights.indexOf(insight);
                  const isExpanded = expandedInsights.has(globalIndex);
                  const keywords = extractKeywords(insight);

                  return (
                    <motion.div
                      key={globalIndex}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      <Card className="hover:shadow-sm transition-shadow duration-200">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            {/* Insight principal */}
                            <div className="flex items-start gap-3">
                              <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center mt-0.5">
                                <Lightbulb className="w-3 h-3 text-purple-600" />
                              </div>
                              <div className="flex-1">
                                <p className="text-gray-900 leading-relaxed">
                                  {insight}
                                </p>
                                
                                {/* Palavras-chave */}
                                {keywords.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {keywords.map((keyword, keyIndex) => (
                                      <Badge 
                                        key={keyIndex} 
                                        variant="outline" 
                                        className="text-xs"
                                      >
                                        {keyword}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                              
                              {/* Botão de expansão */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleInsight(globalIndex)}
                                className="p-1 h-auto"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </Button>
                            </div>

                            {/* Conteúdo expandido */}
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3 }}
                                className="pl-9 pt-2 border-t border-gray-100"
                              >
                                <div className="space-y-2">
                                  <div className="text-sm text-gray-600">
                                    <strong>Contexto:</strong> Este insight foi gerado com base na análise dos seus dados financeiros mais recentes.
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    <strong>Relevância:</strong> Informação importante para o acompanhamento do seu negócio.
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    <strong>Fonte:</strong> Análise automática de KPIs e tendências.
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}

      {/* Resumo dos insights */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-purple-900">Resumo dos Insights</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-900">
                {categorizedInsights.positive.length}
              </div>
              <div className="text-sm text-green-700">Positivos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-900">
                {categorizedInsights.warning.length}
              </div>
              <div className="text-sm text-yellow-700">Atenção</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-900">
                {categorizedInsights.action.length}
              </div>
              <div className="text-sm text-blue-700">Ações</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {categorizedInsights.neutral.length}
              </div>
              <div className="text-sm text-gray-700">Informações</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informações sobre a IA */}
      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-gray-600 mt-0.5" />
            <div className="text-sm text-gray-700">
              <p className="font-medium mb-1">Sobre os Insights da IA</p>
              <p>
                Estes insights são gerados automaticamente pela nossa inteligência artificial, 
                analisando seus dados financeiros e identificando padrões, tendências e oportunidades. 
                Eles são apresentados em linguagem simples para facilitar o entendimento e a tomada de decisões.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

