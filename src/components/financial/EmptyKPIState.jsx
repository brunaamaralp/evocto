import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Plus, 
  BookOpen, 
  Target, 
  Lightbulb,
  ArrowRight,
  BarChart3,
  Calculator,
  Zap
} from "lucide-react";

const SUGGESTED_KPIS = {
  liquidez: [
    { name: "Liquidez Corrente", description: "Ativo Circulante ÷ Passivo Circulante", target: 1.5 },
    { name: "Liquidez Seca", description: "Sem considerar estoques", target: 1.0 },
    { name: "Liquidez Imediata", description: "Disponibilidades ÷ Passivo Circulante", target: 0.3 }
  ],
  rentabilidade: [
    { name: "Margem Líquida", description: "Lucro Líquido ÷ Receita", target: 0.1 },
    { name: "ROE", description: "Retorno sobre Patrimônio Líquido", target: 0.15 },
    { name: "ROA", description: "Retorno sobre Ativo Total", target: 0.08 }
  ],
  endividamento: [
    { name: "Endividamento Geral", description: "Passivo Total ÷ Ativo Total", target: 0.6 },
    { name: "Composição do Endividamento", description: "PC ÷ Passivo Total", target: 0.4 }
  ],
  atividade: [
    { name: "Giro do Ativo", description: "Receita ÷ Ativo Médio", target: 1.2 },
    { name: "Prazo Médio de Recebimento", description: "Dias para receber vendas", target: 30 },
    { name: "Giro de Estoque", description: "CMV ÷ Estoque Médio", target: 6 }
  ]
};

export default function EmptyKPIState({ 
  clientId, 
  serviceId, 
  onKPICreated, 
  showCreateButton = true,
  compact = false 
}) {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [creatingKPIs, setCreatingKPIs] = useState(false);

  const handleCreateSuggestedKPIs = async (category) => {
    setCreatingKPIs(true);
    try {
      // Simular criação de KPIs sugeridos
      // Em implementação real, chamaria função backend
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      onKPICreated?.();
    } catch (error) {
      console.error('Erro ao criar KPIs:', error);
    } finally {
      setCreatingKPIs(false);
      setSelectedCategory(null);
    }
  };

  if (compact) {
    return (
      <Card className="border-dashed border-2 border-gray-200">
        <CardContent className="p-6 text-center">
          <BarChart3 className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500 mb-3">Nenhum KPI configurado</p>
          {showCreateButton && (
            <Button size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar KPIs
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estado vazio principal */}
      <Card className="border-dashed border-2 border-gray-200">
        <CardContent className="p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="mb-6">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Configure seus KPIs Financeiros
              </h3>
              <p className="text-gray-500">
                Monitore a saúde financeira do seu negócio com indicadores personalizados
              </p>
            </div>

            {showCreateButton && (
              <div className="space-y-3">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-5 h-5 mr-2" />
                  Criar KPI Personalizado
                </Button>
                <p className="text-xs text-gray-400">
                  ou escolha KPIs prontos abaixo
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KPIs Sugeridos por Categoria */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(SUGGESTED_KPIS).map(([category, kpis]) => (
          <Card 
            key={category}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedCategory === category ? 'ring-2 ring-blue-500 bg-blue-50' : ''
            }`}
            onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getCategoryIcon(category)}
                  <span className="capitalize">{category}</span>
                </div>
                <Badge variant="secondary">{kpis.length} KPIs</Badge>
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="space-y-3">
                {kpis.map((kpi, index) => (
                  <div key={index} className="flex items-start gap-3 p-2 rounded bg-white">
                    <Target className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{kpi.name}</div>
                      <div className="text-xs text-gray-500">{kpi.description}</div>
                      <div className="text-xs text-blue-600 mt-1">
                        Meta sugerida: {formatTargetValue(kpi.target)}
                      </div>
                    </div>
                  </div>
                ))}

                {selectedCategory === category && showCreateButton && (
                  <div className="pt-3 border-t">
                    <Button 
                      size="sm" 
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCreateSuggestedKPIs(category);
                      }}
                      disabled={creatingKPIs}
                    >
                      {creatingKPIs ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Criando KPIs...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 mr-2" />
                          Adicionar todos ({kpis.length})
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recursos educativos */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-2">
                Precisa de ajuda com KPIs financeiros?
              </h4>
              <p className="text-sm text-gray-600 mb-4">
                Acesse nossa biblioteca com explicações detalhadas sobre cada indicador, 
                como calcular e como interpretar os resultados.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Guia de KPIs
                </Button>
                <Button variant="outline" size="sm">
                  <Calculator className="w-4 h-4 mr-2" />
                  Calculadora
                </Button>
                <Button variant="outline" size="sm">
                  <Lightbulb className="w-4 h-4 mr-2" />
                  Exemplos
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getCategoryIcon(category) {
  const icons = {
    liquidez: <BarChart3 className="w-5 h-5 text-blue-600" />,
    rentabilidade: <TrendingUp className="w-5 h-5 text-green-600" />,
    endividamento: <Target className="w-5 h-5 text-red-600" />,
    atividade: <Zap className="w-5 h-5 text-purple-600" />
  };
  return icons[category] || <Calculator className="w-5 h-5 text-gray-600" />;
}

function formatTargetValue(value) {
  if (value >= 1) {
    return value.toFixed(1);
  } else if (value >= 0.01) {
    return `${(value * 100).toFixed(0)}%`;
  } else {
    return value.toFixed(3);
  }
}