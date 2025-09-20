import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Target, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';

/**
 * Seção de metas e objetivos com barras de progresso
 */
export default function GoalsSection({ metas, formatCurrency, formatPercentage }) {
  // Calcular status da meta
  const getGoalStatus = (progress) => {
    if (progress >= 1.0) return 'achieved';
    if (progress >= 0.8) return 'on_track';
    if (progress >= 0.6) return 'at_risk';
    return 'behind';
  };

  // Obter cor do status
  const getStatusColor = (status) => {
    switch (status) {
      case 'achieved': return 'text-green-600 bg-green-100 border-green-200';
      case 'on_track': return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'at_risk': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'behind': return 'text-red-600 bg-red-100 border-red-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  // Obter texto do status
  const getStatusText = (status) => {
    switch (status) {
      case 'achieved': return 'Meta atingida';
      case 'on_track': return 'No caminho certo';
      case 'at_risk': return 'Atenção necessária';
      case 'behind': return 'Abaixo do esperado';
      default: return 'Sem status';
    }
  };

  // Obter ícone do status
  const getStatusIcon = (status) => {
    switch (status) {
      case 'achieved': return CheckCircle;
      case 'on_track': return TrendingUp;
      case 'at_risk': return AlertCircle;
      case 'behind': return TrendingDown;
      default: return Clock;
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

  // Calcular tendência (simulado)
  const getTrend = (current, target) => {
    const progress = current / target;
    if (progress >= 1.0) return { direction: 'up', value: 0 };
    if (progress >= 0.8) return { direction: 'up', value: 5 };
    if (progress >= 0.6) return { direction: 'stable', value: 0 };
    return { direction: 'down', value: -3 };
  };

  if (!metas || metas.length === 0) {
    return (
      <Card className="border-dashed border-gray-300">
        <CardContent className="p-8 text-center">
          <Target className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma meta definida</h3>
          <p className="text-gray-600">
            Metas serão definidas conforme o progresso do serviço
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {metas.map((meta, index) => {
        const status = getGoalStatus(meta.progress);
        const statusColor = getStatusColor(status);
        const statusText = getStatusText(status);
        const StatusIcon = getStatusIcon(status);
        const trend = getTrend(meta.current, meta.target);

        return (
          <motion.div
            key={meta.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card className="hover:shadow-md transition-shadow duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Target className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{meta.label}</CardTitle>
                      <p className="text-sm text-gray-600">
                        Meta: {formatValue(meta.target, meta.unit)}
                      </p>
                    </div>
                  </div>
                  <Badge className={statusColor}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {statusText}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Valores atuais */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Valor Atual</p>
                    <p className="text-xl font-bold text-gray-900">
                      {formatValue(meta.current, meta.unit)}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Meta</p>
                    <p className="text-xl font-bold text-gray-900">
                      {formatValue(meta.target, meta.unit)}
                    </p>
                  </div>
                </div>

                {/* Barra de progresso */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Progresso</span>
                    <span className="text-sm text-gray-600">
                      {(meta.progress * 100).toFixed(1)}%
                    </span>
                  </div>
                  
                  <div className="relative">
                    <Progress 
                      value={meta.progress * 100} 
                      className="h-3"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-medium text-white drop-shadow-sm">
                        {(meta.progress * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tendência e informações adicionais */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    {trend.direction === 'up' && (
                      <div className="flex items-center gap-1 text-green-600">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-sm">+{trend.value}% este mês</span>
                      </div>
                    )}
                    {trend.direction === 'down' && (
                      <div className="flex items-center gap-1 text-red-600">
                        <TrendingDown className="w-4 h-4" />
                        <span className="text-sm">{trend.value}% este mês</span>
                      </div>
                    )}
                    {trend.direction === 'stable' && (
                      <div className="flex items-center gap-1 text-gray-600">
                        <Minus className="w-4 h-4" />
                        <span className="text-sm">Estável</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    {meta.progress >= 1.0 
                      ? 'Meta atingida! 🎉'
                      : meta.progress >= 0.8
                      ? 'Quase lá! 💪'
                      : meta.progress >= 0.6
                      ? 'Continue focado 📈'
                      : 'Foco na meta 🎯'
                    }
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}

      {/* Resumo das metas */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <Target className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-blue-900">Resumo das Metas</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-900">
                {metas.filter(m => m.progress >= 1.0).length}
              </div>
              <div className="text-sm text-blue-700">Atingidas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-900">
                {metas.filter(m => m.progress >= 0.8 && m.progress < 1.0).length}
              </div>
              <div className="text-sm text-green-700">No caminho</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-900">
                {metas.filter(m => m.progress >= 0.6 && m.progress < 0.8).length}
              </div>
              <div className="text-sm text-yellow-700">Atenção</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-900">
                {metas.filter(m => m.progress < 0.6).length}
              </div>
              <div className="text-sm text-red-700">Abaixo</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

