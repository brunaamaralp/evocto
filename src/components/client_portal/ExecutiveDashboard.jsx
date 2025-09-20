import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  ArrowRight,
  Info,
  Lightbulb,
  Calendar,
  DollarSign,
  Percent,
  BarChart3,
  Users,
  FileText,
  Star
} from 'lucide-react';
import { useClientDashboard } from '@/hooks/useClientDashboard';
import { toast } from 'sonner';

/**
 * Dashboard Executivo Redesignado - Foco em Resultados
 */
export default function ExecutiveDashboard({ clientId, serviceId }) {
  const { dashboardData, loading, error } = useClientDashboard();
  const [selectedPeriod, setSelectedPeriod] = useState('3m');
  const [expandedKPIs, setExpandedKPIs] = useState(new Set());

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error || !dashboardData) {
    return <DashboardError error={error} />;
  }

  const { cliente, servico, kpis, metas, insights } = dashboardData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header Executivo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              {cliente.nome}
            </h1>
            <p className="text-xl text-gray-600 mb-4">
              {servico.nome}
            </p>
            <Badge variant="outline" className="text-lg px-4 py-2">
              <Calendar className="w-4 h-4 mr-2" />
              {new Date().toLocaleDateString('pt-BR', { 
                month: 'long', 
                year: 'numeric' 
              })}
            </Badge>
          </div>
        </motion.div>

        {/* Resumo Executivo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8"
        >
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Status Geral */}
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">No Prazo</h3>
                  <p className="text-gray-600">Projeto em andamento conforme planejado</p>
                </div>

                {/* Progresso Geral */}
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">68%</h3>
                  <p className="text-gray-600">Concluído até o momento</p>
                  <Progress value={68} className="mt-2" />
                </div>

                {/* Próximo Marco */}
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Target className="w-8 h-8 text-purple-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Relatório Mensal</h3>
                  <p className="text-gray-600">Próxima entrega em 5 dias</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* KPIs Principais - Visual Limpo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-8"
        >
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Seus Resultados Financeiros
            </h2>
            <p className="text-gray-600">
              Indicadores que mostram o progresso do seu negócio
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis.filter(kpi => kpi.visible).map((kpi, index) => (
              <KPICard 
                key={kpi.key} 
                kpi={kpi} 
                index={index}
                isExpanded={expandedKPIs.has(kpi.key)}
                onToggle={() => toggleKPIDetails(kpi.key)}
              />
            ))}
          </div>
        </motion.div>

        {/* Metas e Progresso */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-8"
        >
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-900 text-center">
                Suas Metas
              </CardTitle>
              <p className="text-gray-600 text-center">
                Acompanhe o progresso em direção aos seus objetivos
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {metas.map((meta, index) => (
                  <GoalProgressCard key={index} meta={meta} />
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Insights e Próximos Passos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
        >
          {/* Insights */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-600" />
                Insights Importantes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {insights.map((insight, index) => (
                  <div key={index} className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                    <p className="text-gray-800">{insight}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Próximos Passos */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <ArrowRight className="w-5 h-5 text-green-600" />
                Próximos Passos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {getNextSteps().map((step, index) => (
                  <NextStepCard key={index} step={step} index={index} />
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );

  function toggleKPIDetails(kpiKey) {
    const newExpanded = new Set(expandedKPIs);
    if (newExpanded.has(kpiKey)) {
      newExpanded.delete(kpiKey);
    } else {
      newExpanded.add(kpiKey);
    }
    setExpandedKPIs(newExpanded);
  }

  function getNextSteps() {
    return [
      {
        title: "Revisar Relatório Mensal",
        description: "Analisar os resultados do mês passado",
        dueDate: "Em 5 dias",
        priority: "alta",
        icon: FileText
      },
      {
        title: "Implementar Sugestões de Margem",
        description: "Aplicar as recomendações para aumentar margem",
        dueDate: "Em 10 dias",
        priority: "média",
        icon: TrendingUp
      },
      {
        title: "Reunião de Acompanhamento",
        description: "Conversar com seu consultor sobre o progresso",
        dueDate: "Em 15 dias",
        priority: "baixa",
        icon: Users
      }
    ];
  }
}

/**
 * Card de KPI com visual limpo e educativo
 */
function KPICard({ kpi, index, isExpanded, onToggle }) {
  const formatValue = (value, unit) => {
    if (value === null || value === undefined) return 'N/A';
    
    switch (unit) {
      case 'BRL':
        return new Intl.NumberFormat('pt-BR', { 
          style: 'currency', 
          currency: 'BRL',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(value);
      case '%':
        return `${value.toFixed(1)}%`;
      case 'dias':
        return `${Math.round(value)} dias`;
      case 'vezes':
        return `${value.toFixed(1)}x`;
      default:
        return value.toLocaleString('pt-BR');
    }
  };

  const getStatusColor = (kpi) => {
    if (kpi.target) {
      const progress = (kpi.value / kpi.target) * 100;
      if (progress >= 95) return 'text-green-600 bg-green-100';
      if (progress >= 80) return 'text-yellow-600 bg-yellow-100';
      return 'text-red-600 bg-red-100';
    }
    return 'text-blue-600 bg-blue-100';
  };

  const getStatusIcon = (kpi) => {
    if (kpi.target) {
      const progress = (kpi.value / kpi.target) * 100;
      if (progress >= 95) return <CheckCircle className="w-5 h-5" />;
      if (progress >= 80) return <AlertCircle className="w-5 h-5" />;
      return <AlertCircle className="w-5 h-5" />;
    }
    return <Info className="w-5 h-5" />;
  };

  const getKPIIcon = (kpiKey) => {
    if (kpiKey.includes('receita')) return DollarSign;
    if (kpiKey.includes('margem')) return Percent;
    if (kpiKey.includes('fluxo')) return TrendingUp;
    if (kpiKey.includes('inadimplencia')) return AlertCircle;
    return BarChart3;
  };

  const getKPIDescription = (kpiKey) => {
    const descriptions = {
      'receita_mensal': 'Total de vendas realizadas no mês',
      'margem_percent': 'Percentual de lucro sobre as vendas',
      'fluxo_saldo': 'Dinheiro disponível em caixa',
      'inadimplencia_percent': 'Percentual de clientes que não pagam',
      'custos_variaveis': 'Gastos que variam com as vendas',
      'endividamento_total': 'Total de dívidas da empresa',
      'ciclo_caixa_dias': 'Tempo para receber o dinheiro das vendas',
      'giro_estoque': 'Quantas vezes o estoque é renovado por ano'
    };
    return descriptions[kpiKey] || 'Indicador de performance do negócio';
  };

  const IconComponent = getKPIIcon(kpi.key);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
    >
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
            onClick={onToggle}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <IconComponent className="w-6 h-6 text-blue-600" />
            </div>
            <div className={`px-3 py-1 rounded-full flex items-center gap-1 ${getStatusColor(kpi)}`}>
              {getStatusIcon(kpi)}
              <span className="text-sm font-medium">
                {kpi.target ? 
                  `${Math.round((kpi.value / kpi.target) * 100)}% da meta` : 
                  'Sem meta definida'
                }
              </span>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {kpi.label}
          </h3>

          <div className="text-3xl font-bold text-gray-900 mb-2">
            {formatValue(kpi.value, kpi.unit)}
          </div>

          {kpi.target && (
            <div className="text-sm text-gray-600 mb-4">
              Meta: {formatValue(kpi.target, kpi.unit)}
            </div>
          )}

          {/* Microtexto Educativo */}
          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-3 h-3 mt-0.5 text-blue-500" />
              <span>{getKPIDescription(kpi.key)}</span>
            </div>
          </div>

          {/* Detalhes Expandidos */}
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-4 pt-4 border-t border-gray-200"
            >
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Valor atual:</span>
                  <span className="font-medium">{formatValue(kpi.value, kpi.unit)}</span>
                </div>
                {kpi.target && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Meta:</span>
                    <span className="font-medium">{formatValue(kpi.target, kpi.unit)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Período:</span>
                  <span className="font-medium">Último mês</span>
                </div>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

/**
 * Card de Progresso de Meta
 */
function GoalProgressCard({ meta }) {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'alta': return 'text-red-600 bg-red-100';
      case 'média': return 'text-yellow-600 bg-yellow-100';
      case 'baixa': return 'text-green-600 bg-green-100';
      default: return 'text-blue-600 bg-blue-100';
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-900">{meta.label}</h4>
        <Badge className={getPriorityColor('média')}>
          {Math.round(meta.progress * 100)}% concluído
        </Badge>
      </div>
      
      <div className="mb-3">
        <Progress value={meta.progress * 100} className="h-2" />
      </div>
      
      <div className="flex justify-between text-sm text-gray-600">
        <span>Atual: {meta.current}{meta.unit}</span>
        <span>Meta: {meta.target}{meta.unit}</span>
      </div>
    </div>
  );
}

/**
 * Card de Próximo Passo
 */
function NextStepCard({ step, index }) {
  const IconComponent = step.icon;
  
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'alta': return 'border-red-200 bg-red-50';
      case 'média': return 'border-yellow-200 bg-yellow-50';
      case 'baixa': return 'border-green-200 bg-green-50';
      default: return 'border-blue-200 bg-blue-50';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className={`p-4 rounded-lg border-l-4 ${getPriorityColor(step.priority)}`}
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm">
          <IconComponent className="w-4 h-4 text-gray-600" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 mb-1">{step.title}</h4>
          <p className="text-sm text-gray-600 mb-2">{step.description}</p>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            <span>{step.dueDate}</span>
            <Badge variant="outline" className="text-xs">
              {step.priority}
            </Badge>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Skeleton de Loading
 */
function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/3 mx-auto mb-4"></div>
          <div className="h-4 bg-gray-300 rounded w-1/4 mx-auto mb-8"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-300 rounded-lg"></div>
            ))}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-48 bg-gray-300 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Componente de Erro
 */
function DashboardError({ error }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <Card className="max-w-md mx-auto">
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Erro ao Carregar Dashboard
          </h2>
          <p className="text-gray-600 mb-4">
            Não foi possível carregar os dados do dashboard.
          </p>
          <Button onClick={() => window.location.reload()}>
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

