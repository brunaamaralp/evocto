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
  BarChart3,
  Calculator,
  Zap,
  Megaphone,
  Users,
  Settings
} from "lucide-react";
import {
  SUGGESTED_PERFORMANCE_KPIS,
  PERFORMANCE_KPI_CATEGORIES,
  getKPICategoryLabel,
} from "@/constants/performanceKPIs";

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
      <Card className="border-dashed border-2 border-gray-200">
        <CardContent className="p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="mb-6">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Configure seus KPIs de Performance
              </h3>
              <p className="text-gray-500">
                Monitore resultados de marketing e campanhas com indicadores personalizados
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

      <div className="flex flex-wrap gap-2 justify-center">
        {PERFORMANCE_KPI_CATEGORIES.map((cat) => (
          <Badge key={cat.id} variant="secondary" className={cat.color}>
            {cat.label}
          </Badge>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(SUGGESTED_PERFORMANCE_KPIS).map(([category, kpis]) => (
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
                  <span>{getKPICategoryLabel(category)}</span>
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
                        Meta sugerida: {formatTargetValue(kpi)}
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

      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-2">
                Precisa de ajuda com KPIs de performance?
              </h4>
              <p className="text-sm text-gray-600 mb-4">
                Acesse nossa biblioteca com explicações detalhadas sobre cada indicador de marketing, 
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
    performance: <TrendingUp className="w-5 h-5 text-blue-600" />,
    demanda: <Target className="w-5 h-5 text-green-600" />,
    marca: <Megaphone className="w-5 h-5 text-purple-600" />,
    operacao: <Settings className="w-5 h-5 text-amber-600" />,
    engajamento: <Users className="w-5 h-5 text-pink-600" />,
    crescimento: <BarChart3 className="w-5 h-5 text-indigo-600" />,
  };
  return icons[category] || <Calculator className="w-5 h-5 text-gray-600" />;
}

function formatTargetValue(kpi) {
  const { target, unit } = kpi;
  switch (unit) {
    case 'percentage':
      return `${target}%`;
    case 'currency':
      return target > 0 ? `R$ ${target.toLocaleString('pt-BR')}` : 'A definir';
    case 'ratio':
      return `${target}x`;
    case 'days':
      return `${target} dias`;
    default:
      return target >= 1000 ? target.toLocaleString('pt-BR') : String(target);
  }
}
