import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Target, 
  BarChart3,
  Plus,
  Settings,
  RefreshCw,
  Calendar
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { FinancialKPI } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';
import { resolveKPICategory } from '@/constants/performanceKPIs';

const KPI_CATEGORIES = {
  performance: { name: 'Performance', color: 'bg-blue-500', icon: '🎯' },
  demanda: { name: 'Demanda', color: 'bg-green-500', icon: '📊' },
  marca: { name: 'Marca', color: 'bg-purple-500', icon: '🏷️' },
  operacao: { name: 'Operação', color: 'bg-amber-500', icon: '⚙️' },
  engajamento: { name: 'Engajamento', color: 'bg-pink-500', icon: '💬' },
  crescimento: { name: 'Crescimento', color: 'bg-indigo-500', icon: '📈' },
  // aliases legados
  liquidez: { name: 'Performance', color: 'bg-blue-500', icon: '🎯' },
  rentabilidade: { name: 'Demanda', color: 'bg-green-500', icon: '📊' },
  endividamento: { name: 'Operação', color: 'bg-amber-500', icon: '⚙️' },
  atividade: { name: 'Engajamento', color: 'bg-pink-500', icon: '💬' }
};

function KPICard({ kpi, onEdit }) {
  const category = KPI_CATEGORIES[resolveKPICategory(kpi.category)] || KPI_CATEGORIES.performance;
  const currentValue = kpi.current_value || 0;
  const targetValue = kpi.target_value || 0;
  const variance = targetValue ? ((currentValue - targetValue) / targetValue) * 100 : 0;
  const isPositive = variance >= 0;
  
  const status = Math.abs(variance) <= 5 ? 'on_target' : 
                isPositive ? 'above_target' : 'below_target';
  
  const statusConfig = {
    on_target: { color: 'text-green-600', bg: 'bg-green-50', icon: Target },
    above_target: { color: 'text-blue-600', bg: 'bg-blue-50', icon: TrendingUp },
    below_target: { color: 'text-red-600', bg: 'bg-red-50', icon: TrendingDown }
  };
  
  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full ${category.color} flex items-center justify-center text-white text-xs font-bold`}>
            {category.icon}
          </div>
          <div>
            <CardTitle className="text-sm font-medium">{kpi.name}</CardTitle>
            <p className="text-xs text-muted-foreground">{category.name}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => onEdit(kpi)}>
          <Settings className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <StatusIcon className={`w-4 h-4 ${config.color}`} />
            <span className="text-2xl font-bold">{formatKPIValue(currentValue, kpi.unit)}</span>
          </div>
          {targetValue > 0 && (
            <Badge variant="outline" className="text-xs">
              Meta: {formatKPIValue(targetValue, kpi.unit)}
            </Badge>
          )}
        </div>
        
        {targetValue > 0 && (
          <div className={`text-sm p-2 rounded ${config.bg} ${config.color}`}>
            {variance >= 0 ? '▲' : '▼'} {Math.abs(variance).toFixed(1)}% da meta
          </div>
        )}
        
        {kpi.last_calculated_at && (
          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            Atualizado em {new Date(kpi.last_calculated_at).toLocaleDateString('pt-BR')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function KPIChart({ kpis, category }) {
  const categoryKPIs = kpis.filter(kpi => resolveKPICategory(kpi.category) === category);
  
  if (categoryKPIs.length === 0) {
    return (
      <Card className="h-64 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Nenhum KPI encontrado para {KPI_CATEGORIES[category]?.name}</p>
        </div>
      </Card>
    );
  }

  // Preparar dados para gráfico
  const chartData = categoryKPIs.map(kpi => ({
    name: kpi.name.substring(0, 15) + (kpi.name.length > 15 ? '...' : ''),
    atual: kpi.current_value || 0,
    meta: kpi.target_value || 0,
    fullName: kpi.name
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>{KPI_CATEGORIES[category]?.icon}</span>
          {KPI_CATEGORIES[category]?.name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip 
              formatter={(value, name, props) => [
                formatKPIValue(value, 'number'),
                name === 'atual' ? 'Valor Atual' : 'Meta'
              ]}
              labelFormatter={(label) => {
                const item = chartData.find(d => d.name === label);
                return item?.fullName || label;
              }}
            />
            <Bar dataKey="atual" fill="#3b82f6" name="Atual" />
            <Bar dataKey="meta" fill="#e5e7eb" name="Meta" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export default function KPIDashboard({ clientId, serviceId }) {
  const { user, agencyId } = useSession();
  const [kpis, setKpis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const loadKPIs = useCallback(async () => {
    if (!agencyId) return;

    try {
      setLoading(true);
      const filters = { agencyId, is_current: true };
      
      if (clientId) filters.clientId = clientId;
      if (serviceId) filters.serviceId = serviceId;

      const kpisData = await FinancialKPI.filter(filters);
      setKpis(kpisData);
    } catch (error) {
      console.error('Erro ao carregar KPIs:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [agencyId, clientId, serviceId]);

  useEffect(() => {
    loadKPIs();
  }, [loadKPIs]);

  const handleRefresh = async () => {
    await loadKPIs();
  };

  const handleEditKPI = (kpi) => {
    // TODO: Abrir modal de edição de KPI
    console.log('Editar KPI:', kpi);
  };

  const kpisByCategory = kpis.reduce((acc, kpi) => {
    const category = resolveKPICategory(kpi.category);
    if (!acc[category]) acc[category] = [];
    acc[category].push(kpi);
    return acc;
  }, {});

  const criticalKPIs = kpis.filter(kpi => {
    if (!kpi.target_value) return false;
    const variance = Math.abs((kpi.current_value - kpi.target_value) / kpi.target_value * 100);
    return variance > 20; // Desvio maior que 20%
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        Carregando KPIs...
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="flex items-center gap-2 p-4">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <span className="text-red-700">Erro: {error}</span>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard de KPIs</h2>
          <p className="text-muted-foreground">
            Acompanhe os indicadores de performance do projeto
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Novo KPI
          </Button>
        </div>
      </div>

      {/* Alertas críticos */}
      {criticalKPIs.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="w-5 h-5" />
              KPIs que Precisam de Atenção ({criticalKPIs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {criticalKPIs.map(kpi => (
                <div key={kpi.id} className="flex items-center justify-between p-2 bg-white rounded">
                  <span className="font-medium">{kpi.name}</span>
                  <Badge variant="outline" className="text-amber-700">
                    {Math.abs((kpi.current_value - kpi.target_value) / kpi.target_value * 100).toFixed(1)}% off target
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="performance">🎯 Performance</TabsTrigger>
          <TabsTrigger value="demanda">📊 Demanda</TabsTrigger>
          <TabsTrigger value="marca">🏷️ Marca</TabsTrigger>
          <TabsTrigger value="operacao">⚙️ Operação</TabsTrigger>
          <TabsTrigger value="engajamento">💬 Engajamento</TabsTrigger>
          <TabsTrigger value="crescimento">📈 Crescimento</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {kpis.map(kpi => (
              <KPICard key={kpi.id} kpi={kpi} onEdit={handleEditKPI} />
            ))}
          </div>
          
          {kpis.length === 0 && (
            <Card className="h-64 flex items-center justify-center">
              <div className="text-center">
                <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-semibold mb-2">Nenhum KPI Configurado</h3>
                <p className="text-muted-foreground mb-4">
                  Configure os indicadores de performance do seu projeto
                </p>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeiro KPI
                </Button>
              </div>
            </Card>
          )}
        </TabsContent>

        {['performance', 'demanda', 'marca', 'operacao', 'engajamento', 'crescimento'].map(category => (
          <TabsContent key={category} value={category}>
            <KPIChart kpis={kpis} category={category} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function formatKPIValue(value, unit) {
  if (value === null || value === undefined) return 'N/A';
  
  switch (unit) {
    case 'percentage':
      return `${value.toFixed(1)}%`;
    case 'currency':
      return new Intl.NumberFormat('pt-BR', { 
        style: 'currency', 
        currency: 'BRL' 
      }).format(value);
    case 'ratio':
      return value.toFixed(2);
    case 'days':
      return `${Math.round(value)} dias`;
    default:
      return value.toLocaleString('pt-BR');
  }
}