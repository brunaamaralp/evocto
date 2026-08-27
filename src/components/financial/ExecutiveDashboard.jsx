
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  AlertTriangle,
  DollarSign,
  Percent,
  BarChart3,
  LineChart,
  PieChart,
  Calendar,
  Download,
  RefreshCw,
  Zap,
  CheckCircle2
} from 'lucide-react';
import { FinancialKPI } from '@/api/entities';
import { Service } from '@/api/entities';
import { Client } from '@/api/entities';
import KPIChart from './KPIChart';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';

const SERVICE_DASHBOARD_CONFIGS = {
  'Diagnóstico de Comunicação e Marca': {
    title: 'Diagnóstico de Comunicação',
    subtitle: 'Visão de Clareza — 1 Mês',
    color: 'blue',
    keyMetrics: ['clareza_posicionamento', 'consistencia_canais', 'engajamento_medio', 'share_of_voice'],
    insights: [
      'Situação atual da marca e da mensagem',
      'Gaps de comunicação que pedem atenção',
      'Oportunidades priorizadas de posicionamento'
    ]
  },
  'Estratégia de Conteúdo e Posicionamento': {
    title: 'Estratégia de Conteúdo',
    subtitle: 'Narrativa, pilares e calendário',
    color: 'green',
    keyMetrics: ['taxa_publicacao', 'engajamento_medio', 'leads_qualificados', 'trafego_organico'],
    insights: [
      'Evolução dos pilares editoriais',
      'Impacto do conteúdo em demanda e autoridade',
      'Ajustes de tom e formato que performaram'
    ]
  },
  'Marketing Operacional 360': {
    title: 'Marketing Operacional 360',
    subtitle: 'Retainer completo — operação mensal',
    color: 'purple',
    keyMetrics: ['roas', 'cac', 'leads_qualificados', 'taxa_aprovacao_ciclo'],
    insights: [
      'Performance do ciclo mês a mês',
      'Eficiência de mídia e aquisição',
      'Saúde operacional de aprovações e entregas'
    ]
  },
  // legado (dados antigos)
  'Diagnóstico Financeiro Avulso': {
    title: 'Diagnóstico de Comunicação',
    subtitle: 'Visão de Clareza — 1 Mês',
    color: 'blue',
    keyMetrics: ['clareza_posicionamento', 'consistencia_canais', 'engajamento_medio', 'share_of_voice'],
    insights: [
      'Situação atual da marca e da mensagem',
      'Gaps de comunicação que pedem atenção',
      'Oportunidades priorizadas de posicionamento'
    ]
  },
  'Mentoria em Aumento de Margem': {
    title: 'Estratégia de Conteúdo',
    subtitle: 'Narrativa, pilares e calendário',
    color: 'green',
    keyMetrics: ['taxa_publicacao', 'engajamento_medio', 'leads_qualificados', 'trafego_organico'],
    insights: [
      'Evolução dos pilares editoriais',
      'Impacto do conteúdo em demanda e autoridade',
      'Ajustes de tom e formato que performaram'
    ]
  },
  'Gestão Financeira 360': {
    title: 'Marketing Operacional 360',
    subtitle: 'Retainer completo — operação mensal',
    color: 'purple',
    keyMetrics: ['roas', 'cac', 'leads_qualificados', 'taxa_aprovacao_ciclo'],
    insights: [
      'Performance do ciclo mês a mês',
      'Eficiência de mídia e aquisição',
      'Saúde operacional de aprovações e entregas'
    ]
  }
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function ExecutiveDashboard({ 
  clientId, 
  serviceId,
  timeRange = '6m',
  className = "" 
}) {
  const [client, setClient] = useState(null);
  const [service, setService] = useState(null);
  const [kpis, setKpis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(timeRange);
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState(null);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Carregar dados básicos
      const [clientData, serviceData] = await Promise.all([
        Client.get(clientId),
        serviceId ? Service.get(serviceId) : null
      ]);

      setClient(clientData);
      setService(serviceData);

      // Carregar KPIs
      const filters = { clientId, is_current: true };
      if (serviceId) filters.service_instance_id = serviceId;

      const kpiData = await FinancialKPI.filter(filters, '-priority', 100);
      setKpis(kpiData);

      // Processar dados do dashboard
      const processedData = processDashboardData(kpiData, serviceData);
      setDashboardData(processedData);

    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
      setError('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  }, [clientId, serviceId, selectedPeriod]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const processDashboardData = (kpiData, serviceData) => {
    // Configuração baseada no tipo de serviço
    const serviceConfig = serviceData 
      ? SERVICE_DASHBOARD_CONFIGS[serviceData.name] || SERVICE_DASHBOARD_CONFIGS['Marketing Operacional 360']
      : SERVICE_DASHBOARD_CONFIGS['Marketing Operacional 360'];

    // Métricas principais
    const keyKPIs = kpiData.filter(kpi => 
      serviceConfig.keyMetrics.some(metric => 
        kpi.name.toLowerCase().includes(metric.toLowerCase()) ||
        kpi.category === metric
      )
    ).slice(0, 4);

    // Dados para gráficos
    const timeSeriesData = generateTimeSeriesData(kpiData, selectedPeriod);
    const categoryDistribution = generateCategoryDistribution(kpiData);
    const performanceData = generatePerformanceData(kpiData);

    // Insights automáticos
    const insights = generateInsights(kpiData, serviceConfig);

    return {
      serviceConfig,
      keyKPIs,
      timeSeriesData,
      categoryDistribution,
      performanceData,
      insights,
      summary: generateSummary(kpiData)
    };
  };

  const generateTimeSeriesData = (kpiData, period) => {
    // Simular dados de série temporal baseado no período
    const months = period === '3m' ? 3 : period === '6m' ? 6 : 12;
    const data = [];

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      
      const monthData = {
        month: date.toLocaleString('pt-BR', { month: 'short', year: '2-digit' }),
        date: date.toISOString()
      };

      // Adicionar dados dos KPIs principais
      kpiData.forEach(kpi => {
        if (kpi.historical_values && kpi.historical_values.length > 0) {
          // Usar dados históricos reais se disponíveis
          const historicalValue = kpi.historical_values[Math.min(i, kpi.historical_values.length - 1)];
          monthData[kpi.name] = historicalValue?.value || kpi.current_value || 0;
        } else {
          // Simular variação baseada no valor atual
          const baseValue = kpi.current_value || 0;
          const variation = (Math.random() - 0.5) * 0.2; // ±10% variação
          monthData[kpi.name] = baseValue * (1 + variation);
        }
      });

      data.push(monthData);
    }

    return data;
  };

  const generateCategoryDistribution = (kpiData) => {
    const distribution = {};
    
    kpiData.forEach(kpi => {
      const category = kpi.category || 'outros';
      if (!distribution[category]) {
        distribution[category] = { count: 0, value: 0 };
      }
      distribution[category].count++;
      distribution[category].value += kpi.current_value || 0;
    });

    return Object.entries(distribution).map(([name, data], index) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value: data.count,
      totalValue: data.value,
      color: COLORS[index % COLORS.length]
    }));
  };

  const generatePerformanceData = (kpiData) => {
    return kpiData.map(kpi => {
      const current = kpi.current_value || 0;
      const target = kpi.target_value || current;
      const performance = target > 0 ? (current / target) * 100 : 100;
      
      return {
        name: kpi.name,
        current,
        target,
        performance: Math.min(performance, 150), // Cap at 150%
        status: performance >= 100 ? 'success' : performance >= 80 ? 'warning' : 'danger'
      };
    });
  };

  const generateInsights = (kpiData, serviceConfig) => {
    const insights = [];

    // Insights baseados no tipo de serviço
    serviceConfig.insights.forEach(insight => {
      insights.push({
        type: 'service',
        title: insight,
        description: 'Baseado na análise dos KPIs configurados para este serviço',
        priority: 'medium'
      });
    });

    // Insights baseados nos dados
    const criticalKPIs = kpiData.filter(kpi => {
      const current = kpi.current_value || 0;
      const target = kpi.target_value || 0;
      return target > 0 && (current / target) < 0.8;
    });

    if (criticalKPIs.length > 0) {
      insights.push({
        type: 'alert',
        title: `${criticalKPIs.length} KPIs abaixo da meta`,
        description: `KPIs que precisam de atenção: ${criticalKPIs.map(k => k.name).join(', ')}`,
        priority: 'high'
      });
    }

    const excellentKPIs = kpiData.filter(kpi => {
      const current = kpi.current_value || 0;
      const target = kpi.target_value || 0;
      return target > 0 && (current / target) >= 1.2;
    });

    if (excellentKPIs.length > 0) {
      insights.push({
        type: 'success',
        title: `${excellentKPIs.length} KPIs superando metas`,
        description: `Excelente performance em: ${excellentKPIs.map(k => k.name).join(', ')}`,
        priority: 'low'
      });
    }

    return insights;
  };

  const generateSummary = (kpiData) => {
    const total = kpiData.length;
    const withTargets = kpiData.filter(kpi => kpi.target_value).length;
    const onTarget = kpiData.filter(kpi => {
      const current = kpi.current_value || 0;
      const target = kpi.target_value || 0;
      return target > 0 && Math.abs(current - target) / target <= 0.1;
    }).length;

    return {
      totalKPIs: total,
      kpisWithTargets: withTargets,
      kpisOnTarget: onTarget,
      overallHealth: total > 0 ? (onTarget / total) * 100 : 0
    };
  };

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 ${className}`}>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-red-500">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className={`p-6 ${className}`}>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-500">Nenhum dado disponível</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { serviceConfig, keyKPIs, timeSeriesData, categoryDistribution, performanceData, insights, summary } = dashboardData;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {serviceConfig.title}
          </h1>
          <p className="text-gray-600 mt-1">{serviceConfig.subtitle}</p>
          {client && (
            <Badge variant="outline" className="mt-2">
              {client.name}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3m">3 meses</SelectItem>
              <SelectItem value="6m">6 meses</SelectItem>
              <SelectItem value="12m">12 meses</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={loadDashboardData}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Resumo Executivo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de KPIs</p>
                <p className="text-2xl font-bold">{summary.totalKPIs}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">KPIs na Meta</p>
                <p className="text-2xl font-bold text-green-600">{summary.kpisOnTarget}</p>
              </div>
              <Target className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Saúde Geral</p>
                <p className="text-2xl font-bold text-purple-600">
                  {Math.round(summary.overallHealth)}%
                </p>
              </div>
              <Zap className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Alertas</p>
                <p className="text-2xl font-bold text-red-600">
                  {insights.filter(i => i.priority === 'high').length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {keyKPIs.map((kpi) => {
          const current = kpi.current_value || 0;
          const target = kpi.target_value || 0;
          const performance = target > 0 ? (current / target) * 100 : 100;
          const trend = current > target ? 'up' : 'down'; // Simplified trend logic

          return (
            <Card key={kpi.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900">{kpi.name}</h3>
                  {trend === 'up' ? (
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold">
                      {kpi.unit === 'currency' && 'R$ '}
                      {current.toLocaleString('pt-BR')}
                      {kpi.unit === 'percentage' && '%'}
                    </span>
                    <Badge 
                      variant={performance >= 100 ? 'success' : performance >= 80 ? 'warning' : 'destructive'}
                    >
                      {Math.round(performance)}%
                    </Badge>
                  </div>
                  
                  {target > 0 && (
                    <p className="text-sm text-gray-600">
                      Meta: {kpi.unit === 'currency' && 'R$ '}
                      {target.toLocaleString('pt-BR')}
                      {kpi.unit === 'percentage' && '%'}
                    </p>
                  )}
                  
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        performance >= 100 ? 'bg-green-600' : 
                        performance >= 80 ? 'bg-yellow-600' : 'bg-red-600'
                      }`}
                      style={{ width: `${Math.min(performance, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Gráficos e Análises */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evolução Temporal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="w-5 h-5" />
              Evolução dos KPIs Principais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  {keyKPIs.slice(0, 3).map((kpi, index) => (
                    <Line 
                      key={kpi.id}
                      type="monotone" 
                      dataKey={kpi.name} 
                      stroke={COLORS[index]} 
                      strokeWidth={2}
                    />
                  ))}
                </RechartsLineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Performance vs Meta */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Performance vs Meta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceData.slice(0, 6)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="performance" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights e Distribuição */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Insights Automáticos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Insights Automáticos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.map((insight, index) => (
                <div 
                  key={index}
                  className={`p-4 rounded-lg border ${
                    insight.priority === 'high' ? 'border-red-200 bg-red-50' :
                    insight.priority === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                    'border-green-200 bg-green-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {insight.type === 'alert' && <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />}
                    {insight.type === 'success' && <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />}
                    {insight.type === 'service' && <Zap className="w-5 h-5 text-blue-600 mt-0.5" />}
                    
                    <div>
                      <h4 className="font-medium">{insight.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Distribuição por Categoria */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Distribuição por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={categoryDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-4 space-y-2">
              {categoryDistribution.map((category) => (
                <div key={category.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: category.color }}
                    ></div>
                    <span className="text-sm font-medium">{category.name}</span>
                  </div>
                  <span className="text-sm text-gray-600">{category.value} KPIs</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
