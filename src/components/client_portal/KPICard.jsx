import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Target,
  DollarSign,
  Percent,
  Calendar,
  Package
} from 'lucide-react';

/**
 * Card individual de KPI com status e tendência
 */
export default function KPICard({ 
  kpi, 
  series, 
  formatCurrency, 
  formatPercentage 
}) {
  // Calcular variação se houver série histórica
  const calculateVariation = () => {
    if (!series || series.length < 2) return null;
    
    const current = series[series.length - 1]?.value;
    const previous = series[series.length - 2]?.value;
    
    if (!current || !previous || previous === 0) return null;
    
    return ((current - previous) / previous) * 100;
  };

  // Determinar status baseado na meta
  const getStatus = () => {
    if (!kpi.target) return 'neutral';
    
    const percentage = (kpi.value / kpi.target) * 100;
    
    if (percentage >= 95) return 'success';
    if (percentage >= 80) return 'warning';
    return 'danger';
  };

  // Obter ícone baseado no tipo de KPI
  const getKPIIcon = (key) => {
    if (key.includes('receita') || key.includes('fluxo') || key.includes('endividamento')) {
      return DollarSign;
    }
    if (key.includes('margem') || key.includes('inadimplencia') || key.includes('percent')) {
      return Percent;
    }
    if (key.includes('ciclo') || key.includes('dias')) {
      return Calendar;
    }
    if (key.includes('giro') || key.includes('estoque')) {
      return Package;
    }
    return Target;
  };

  // Obter cor do status
  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-100 border-green-200';
      case 'warning': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'danger': return 'text-red-600 bg-red-100 border-red-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  // Obter texto do status
  const getStatusText = (status) => {
    switch (status) {
      case 'success': return 'Meta atingida';
      case 'warning': return 'Próximo da meta';
      case 'danger': return 'Abaixo da meta';
      default: return 'Sem meta definida';
    }
  };

  // Formatar valor baseado na unidade
  const formatValue = (value, unit) => {
    if (value === null || value === undefined) return 'N/A';
    
    if (unit === 'BRL') {
      return formatCurrency(value);
    }
    if (unit === '%') {
      return formatPercentage(value);
    }
    if (unit === 'dias') {
      return `${value} dias`;
    }
    if (unit === 'vezes') {
      return `${value.toFixed(1)}x`;
    }
    
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  const variation = calculateVariation();
  const status = getStatus();
  const KPIIcon = getKPIIcon(kpi.key);
  const statusColor = getStatusColor(status);
  const statusText = getStatusText(status);

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <KPIIcon className="w-4 h-4 text-blue-600" />
            </div>
            <CardTitle className="text-sm font-medium text-gray-700">
              {kpi.label}
            </CardTitle>
          </div>
          <Badge className={statusColor}>
            {statusText}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Valor principal */}
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">
              {formatValue(kpi.value, kpi.unit)}
            </span>
            {kpi.target && (
              <span className="text-sm text-gray-500">
                / {formatValue(kpi.target, kpi.unit)}
              </span>
            )}
          </div>

          {/* Variação e tendência */}
          {variation !== null && (
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1 text-sm ${
                variation > 0 ? 'text-green-600' : 
                variation < 0 ? 'text-red-600' : 'text-gray-500'
              }`}>
                {variation > 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : variation < 0 ? (
                  <TrendingDown className="w-4 h-4" />
                ) : (
                  <Minus className="w-4 h-4" />
                )}
                <span className="font-medium">
                  {Math.abs(variation).toFixed(1)}%
                </span>
              </div>
              <span className="text-xs text-gray-500">
                vs período anterior
              </span>
            </div>
          )}

          {/* Meta se disponível */}
          {kpi.target && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>Progresso da meta</span>
                <span>
                  {((kpi.value / kpi.target) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  className={`h-2 rounded-full ${
                    status === 'success' ? 'bg-green-500' :
                    status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((kpi.value / kpi.target) * 100, 100)}%` }}
                  transition={{ duration: 1, delay: 0.2 }}
                />
              </div>
            </div>
          )}

          {/* Informação adicional se não houver variação */}
          {variation === null && (
            <div className="text-xs text-gray-500">
              {series && series.length > 0 
                ? 'Dados históricos disponíveis'
                : 'Sem dados históricos suficientes'
              }
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

