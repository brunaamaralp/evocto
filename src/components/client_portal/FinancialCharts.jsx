import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, 
  BarChart3, 
  PieChart as PieChartIcon,
  Calendar,
  DollarSign,
  Percent
} from 'lucide-react';

/**
 * Componente de gráficos financeiros interativos
 */
export default function FinancialCharts({ 
  series, 
  kpis, 
  formatCurrency, 
  formatPercentage 
}) {
  const [activeChart, setActiveChart] = useState('line');

  // Preparar dados para gráficos
  const chartData = useMemo(() => {
    if (!series || Object.keys(series).length === 0) return [];

    // Encontrar todos os períodos únicos
    const allPeriods = new Set();
    Object.values(series).forEach(serie => {
      serie.forEach(point => allPeriods.add(point.period));
    });

    // Converter para array e ordenar
    const periods = Array.from(allPeriods).sort();

    // Criar estrutura de dados combinada
    return periods.map(period => {
      const dataPoint = { period };
      
      Object.entries(series).forEach(([key, serie]) => {
        const point = serie.find(p => p.period === period);
        dataPoint[key] = point ? point.value : null;
      });
      
      return dataPoint;
    });
  }, [series]);

  // Configurações de cores para gráficos
  const colors = [
    '#3B82F6', // blue-500
    '#10B981', // emerald-500
    '#F59E0B', // amber-500
    '#EF4444', // red-500
    '#8B5CF6', // violet-500
    '#06B6D4', // cyan-500
    '#84CC16', // lime-500
    '#F97316'  // orange-500
  ];

  // Obter KPIs com séries disponíveis
  const kpisWithSeries = kpis.filter(kpi => series[kpi.key] && series[kpi.key].length > 0);

  // Preparar dados para gráfico de pizza (mix de custos)
  const pieChartData = useMemo(() => {
    const costKPIs = kpisWithSeries.filter(kpi => 
      kpi.key.includes('custo') || 
      kpi.key.includes('despesa') ||
      kpi.key.includes('investimento')
    );

    if (costKPIs.length === 0) return [];

    return costKPIs.map((kpi, index) => ({
      name: kpi.label,
      value: kpi.value,
      color: colors[index % colors.length]
    }));
  }, [kpisWithSeries]);

  // Formatar tooltip
  const formatTooltipValue = (value, unit) => {
    if (value === null || value === undefined) return 'N/A';
    
    if (unit === 'BRL') {
      return formatCurrency(value);
    }
    if (unit === '%') {
      return formatPercentage(value);
    }
    
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          {payload.map((entry, index) => {
            const kpi = kpis.find(k => k.key === entry.dataKey);
            return (
              <div key={index} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-gray-600">{kpi?.label}:</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatTooltipValue(entry.value, kpi?.unit)}
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  // Renderizar gráfico de linha
  const renderLineChart = () => {
    if (chartData.length === 0) {
      return (
        <div className="h-64 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <TrendingUp className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>Sem dados suficientes para exibir gráfico de linha</p>
          </div>
        </div>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="period" 
            stroke="#666"
            fontSize={12}
            tickFormatter={(value) => {
              const date = new Date(value);
              return date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
            }}
          />
          <YAxis stroke="#666" fontSize={12} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {kpisWithSeries.map((kpi, index) => (
            <Line
              key={kpi.key}
              type="monotone"
              dataKey={kpi.key}
              stroke={colors[index % colors.length]}
              strokeWidth={2}
              dot={{ fill: colors[index % colors.length], strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: colors[index % colors.length], strokeWidth: 2 }}
              name={kpi.label}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  };

  // Renderizar gráfico de barras
  const renderBarChart = () => {
    if (chartData.length === 0) {
      return (
        <div className="h-64 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>Sem dados suficientes para exibir gráfico de barras</p>
          </div>
        </div>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="period" 
            stroke="#666"
            fontSize={12}
            tickFormatter={(value) => {
              const date = new Date(value);
              return date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
            }}
          />
          <YAxis stroke="#666" fontSize={12} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {kpisWithSeries.map((kpi, index) => (
            <Bar
              key={kpi.key}
              dataKey={kpi.key}
              fill={colors[index % colors.length]}
              name={kpi.label}
              radius={[2, 2, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  // Renderizar gráfico de pizza
  const renderPieChart = () => {
    if (pieChartData.length === 0) {
      return (
        <div className="h-64 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <PieChartIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>Sem dados de composição disponíveis</p>
          </div>
        </div>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={pieChartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {pieChartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value) => formatCurrency(value)}
            labelStyle={{ color: '#374151' }}
          />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="space-y-6">
      {/* Controles de visualização */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-600" />
          <span className="text-sm text-gray-600">
            {chartData.length} períodos de dados
          </span>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={activeChart === 'line' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveChart('line')}
          >
            <TrendingUp className="w-4 h-4 mr-1" />
            Linha
          </Button>
          <Button
            variant={activeChart === 'bar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveChart('bar')}
          >
            <BarChart3 className="w-4 h-4 mr-1" />
            Barras
          </Button>
          {pieChartData.length > 0 && (
            <Button
              variant={activeChart === 'pie' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveChart('pie')}
            >
              <PieChartIcon className="w-4 h-4 mr-1" />
              Composição
            </Button>
          )}
        </div>
      </div>

      {/* Gráfico principal */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            {activeChart === 'line' && <TrendingUp className="w-5 h-5" />}
            {activeChart === 'bar' && <BarChart3 className="w-5 h-5" />}
            {activeChart === 'pie' && <PieChartIcon className="w-5 h-5" />}
            {activeChart === 'line' && 'Evolução Temporal'}
            {activeChart === 'bar' && 'Comparação por Período'}
            {activeChart === 'pie' && 'Composição de Custos'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <motion.div
            key={activeChart}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {activeChart === 'line' && renderLineChart()}
            {activeChart === 'bar' && renderBarChart()}
            {activeChart === 'pie' && renderPieChart()}
          </motion.div>
        </CardContent>
      </Card>

      {/* Informações adicionais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Indicadores Monetários</span>
            </div>
            <p className="text-xs text-blue-700 mt-1">
              Valores em reais (BRL) com formatação brasileira
            </p>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-900">Indicadores Percentuais</span>
            </div>
            <p className="text-xs text-green-700 mt-1">
              Percentuais com uma casa decimal
            </p>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">Períodos</span>
            </div>
            <p className="text-xs text-purple-700 mt-1">
              Dados organizados por mês/ano
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

