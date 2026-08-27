import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar,
  PieChart, 
  Pie, 
  Cell,
  Legend,
  ReferenceLine
} from 'recharts';
import { TrendingUp, BarChart3, PieChart as PieChartIcon } from "lucide-react";

const CHART_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
];

export default function KPIChart({ 
  kpis, 
  period = '6m', 
  category = 'all',
  height = 400 
}) {
  const [chartType, setChartType] = useState('trend'); // trend | comparison | distribution
  const [selectedKPI, setSelectedKPI] = useState('all');

  // Processar dados para gráfico de tendência
  const trendData = useMemo(() => {
    if (!kpis || kpis.length === 0) return [];

    const kpiData = selectedKPI === 'all' ? kpis : kpis.filter(kpi => kpi.id === selectedKPI);
    
    // Coletar todos os pontos temporais únicos
    const allTimestamps = new Set();
    kpiData.forEach(kpi => {
      (kpi.historical_values || []).forEach(point => {
        allTimestamps.add(point.calculated_at || point.period);
      });
    });

    const sortedTimestamps = Array.from(allTimestamps).sort();

    // Construir série temporal
    return sortedTimestamps.map(timestamp => {
      const dataPoint = { 
        date: new Date(timestamp).toLocaleDateString('pt-BR', { 
          month: 'short', 
          day: 'numeric' 
        }),
        fullDate: timestamp
      };

      kpiData.forEach((kpi, index) => {
        const point = kpi.historical_values?.find(
          p => (p.calculated_at || p.period) === timestamp
        );
        dataPoint[kpi.name] = point?.value || null;
        
        // Adicionar linha de meta se disponível
        if (kpi.target_value && selectedKPI !== 'all') {
          dataPoint[`${kpi.name}_target`] = kpi.target_value;
        }
      });

      return dataPoint;
    });
  }, [kpis, selectedKPI]);

  // Dados para comparação atual vs meta
  const comparisonData = useMemo(() => {
    return kpis
      .filter(kpi => kpi.current_value !== null && kpi.target_value !== null)
      .map(kpi => ({
        name: kpi.name.length > 20 ? `${kpi.name.substring(0, 20)}...` : kpi.name,
        fullName: kpi.name,
        current: kpi.current_value,
        target: kpi.target_value,
        unit: kpi.unit,
        status: kpi.status,
        achievement: kpi.target_value ? (kpi.current_value / kpi.target_value) * 100 : 0
      }));
  }, [kpis]);

  // Dados para distribuição por categoria
  const distributionData = useMemo(() => {
    const categoryGroups = kpis.reduce((acc, kpi) => {
      const cat = kpi.category || 'outros';
      if (!acc[cat]) {
        acc[cat] = { count: 0, avgValue: 0, onTarget: 0 };
      }
      acc[cat].count++;
      if (kpi.current_value) {
        acc[cat].avgValue += kpi.current_value;
      }
      if (kpi.status === 'good') {
        acc[cat].onTarget++;
      }
      return acc;
    }, {});

    return Object.entries(categoryGroups).map(([category, data]) => ({
      name: getCategoryDisplayName(category),
      count: data.count,
      onTarget: data.onTarget,
      offTarget: data.count - data.onTarget,
      successRate: data.count > 0 ? (data.onTarget / data.count) * 100 : 0
    }));
  }, [kpis]);

  // Custom tooltip para gráficos
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-white p-3 border rounded shadow-lg">
        <p className="font-medium">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }} className="text-sm">
            {entry.dataKey}: {formatTooltipValue(entry.value, entry.payload?.unit)}
          </p>
        ))}
      </div>
    );
  };

  const formatTooltipValue = (value, unit) => {
    if (value === null || value === undefined) return 'N/A';
    
    switch (unit) {
      case 'currency':
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(value);
      case 'percentage':
        return `${(value * 100).toFixed(1)}%`;
      case 'ratio':
        return value.toFixed(2);
      case 'days':
        return `${value} dias`;
      default:
        return typeof value === 'number' ? value.toLocaleString('pt-BR') : value;
    }
  };

  if (!kpis || kpis.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">Nenhum KPI para exibir</p>
          <p className="text-sm text-gray-400">
            Adicione KPIs para ver visualizações aqui
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Análise Visual dos KPIs
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {chartType === 'trend' && (
              <Select value={selectedKPI} onValueChange={setSelectedKPI}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os KPIs</SelectItem>
                  {kpis.map(kpi => (
                    <SelectItem key={kpi.id} value={kpi.id}>
                      {kpi.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={chartType} onValueChange={setChartType}>
          <TabsList className="mb-4">
            <TabsTrigger value="trend" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Tendências
            </TabsTrigger>
            <TabsTrigger value="comparison" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Atual vs Meta
            </TabsTrigger>
            <TabsTrigger value="distribution" className="flex items-center gap-2">
              <PieChartIcon className="w-4 h-4" />
              Por Categoria
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trend">
            <div style={{ height }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    stroke="#666"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    stroke="#666"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  
                  {(selectedKPI === 'all' ? kpis : kpis.filter(k => k.id === selectedKPI))
                    .map((kpi, index) => (
                      <Line
                        key={kpi.id}
                        type="monotone"
                        dataKey={kpi.name}
                        stroke={CHART_COLORS[index % CHART_COLORS.length]}
                        strokeWidth={2}
                        dot={{ fill: CHART_COLORS[index % CHART_COLORS.length], r: 3 }}
                        connectNulls={false}
                      />
                    ))}
                  
                  {/* Linha de meta (só para KPI único) */}
                  {selectedKPI !== 'all' && (
                    <ReferenceLine 
                      y={kpis.find(k => k.id === selectedKPI)?.target_value} 
                      stroke="#ef4444" 
                      strokeDasharray="5 5"
                      label="Meta"
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="comparison">
            <div style={{ height }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData} margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="current" fill="#3b82f6" name="Valor Atual" />
                  <Bar dataKey="target" fill="#ef4444" name="Meta" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Resumo do desempenho */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {comparisonData.filter(d => d.achievement >= 100).length}
                </div>
                <div className="text-sm text-gray-600">No Alvo</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">
                  {comparisonData.filter(d => d.achievement >= 80 && d.achievement < 100).length}
                </div>
                <div className="text-sm text-gray-600">Próximo</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {comparisonData.filter(d => d.achievement < 80).length}
                </div>
                <div className="text-sm text-gray-600">Abaixo</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {comparisonData.length > 0 ? 
                    Math.round(comparisonData.reduce((acc, d) => acc + d.achievement, 0) / comparisonData.length) : 0
                  }%
                </div>
                <div className="text-sm text-gray-600">Média Geral</div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="distribution">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div style={{ height: height - 100 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={distributionData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="count"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {distributionData.map((entry, index) => (
                        <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold">Taxa de Sucesso por Categoria</h4>
                {distributionData.map((category, index) => (
                  <div key={category.name} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{category.name}</span>
                      <Badge 
                        className={
                          category.successRate >= 80 ? 'bg-green-100 text-green-800' :
                          category.successRate >= 60 ? 'bg-amber-100 text-amber-800' :
                          'bg-red-100 text-red-800'
                        }
                      >
                        {category.successRate.toFixed(0)}%
                      </Badge>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          category.successRate >= 80 ? 'bg-green-500' :
                          category.successRate >= 60 ? 'bg-amber-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${category.successRate}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-600">
                      {category.onTarget} de {category.count} KPIs no alvo
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function getCategoryDisplayName(category) {
  const names = {
    performance: 'Performance',
    demanda: 'Demanda',
    marca: 'Marca',
    operacao: 'Operação',
    engajamento: 'Engajamento',
    crescimento: 'Crescimento',
    outros: 'Outros',
    // aliases legados
    liquidez: 'Performance',
    rentabilidade: 'Demanda',
    endividamento: 'Operação',
    atividade: 'Engajamento'
  };
  return names[category] || category;
}