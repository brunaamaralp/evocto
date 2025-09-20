import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  Target, 
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  PieChart,
  LineChart,
  Activity,
  RefreshCw,
  Download,
  Filter
} from 'lucide-react';
import { 
  LineChart as RechartsLineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Cell,
  AreaChart,
  Area
} from 'recharts';

/**
 * Dashboard Executivo
 * Exibe métricas de negócio, KPIs e análises estratégicas
 */
export function ExecutiveDashboard() {
  const [metrics, setMetrics] = useState({});
  const [kpis, setKpis] = useState({});
  const [trends, setTrends] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [selectedTab, setSelectedTab] = useState('overview');

  useEffect(() => {
    loadDashboardData();
  }, [selectedPeriod]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Simular carregamento de dados
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockData = generateMockData(selectedPeriod);
      setMetrics(mockData.metrics);
      setKpis(mockData.kpis);
      setTrends(mockData.trends);
      setAlerts(mockData.alerts);
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateMockData = (period) => {
    const baseDate = new Date();
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    
    return {
      metrics: {
        totalRevenue: 1250000,
        totalClients: 45,
        activeProjects: 23,
        teamMembers: 12,
        revenueGrowth: 15.2,
        clientGrowth: 8.5,
        projectSuccessRate: 94.2,
        teamEfficiency: 87.5
      },
      kpis: {
        financial: {
          revenue: 1250000,
          profit: 312500,
          margin: 25.0,
          cashFlow: 187500,
          roi: 18.5
        },
        operational: {
          projectCompletion: 94.2,
          clientSatisfaction: 4.6,
          teamUtilization: 87.5,
          responseTime: 2.3,
          qualityScore: 92.1
        },
        strategic: {
          marketShare: 12.5,
          brandRecognition: 78.3,
          innovationIndex: 85.2,
          competitiveAdvantage: 82.7,
          growthPotential: 91.4
        }
      },
      trends: {
        revenue: generateTrendData(days, 100000, 150000),
        clients: generateTrendData(days, 40, 50),
        projects: generateTrendData(days, 20, 25),
        satisfaction: generateTrendData(days, 4.0, 5.0)
      },
      alerts: [
        {
          id: 1,
          type: 'warning',
          title: 'Margem de Lucro Abaixo do Target',
          description: 'Margem atual: 25% | Target: 30%',
          severity: 'medium',
          timestamp: Date.now() - 3600000
        },
        {
          id: 2,
          type: 'info',
          title: 'Novo Cliente Potencial',
          description: 'Lead qualificado aguardando proposta',
          severity: 'low',
          timestamp: Date.now() - 7200000
        },
        {
          id: 3,
          type: 'success',
          title: 'Projeto Entregue com Sucesso',
          description: 'Projeto Alpha concluído 2 dias antes do prazo',
          severity: 'low',
          timestamp: Date.now() - 10800000
        }
      ]
    };
  };

  const generateTrendData = (days, min, max) => {
    const data = [];
    const baseDate = new Date();
    
    for (let i = days; i >= 0; i--) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() - i);
      
      data.push({
        date: date.toISOString().split('T')[0],
        value: Math.random() * (max - min) + min,
        target: max * 0.9
      });
    }
    
    return data;
  };

  const getTrendIcon = (value, target) => {
    if (value > target) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (value < target * 0.9) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Activity className="h-4 w-4 text-yellow-500" />;
  };

  const getTrendColor = (value, target) => {
    if (value > target) return 'text-green-500';
    if (value < target * 0.9) return 'text-red-500';
    return 'text-yellow-500';
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercentage = (value) => {
    return `${value.toFixed(1)}%`;
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  const MetricCard = ({ title, value, target, icon: Icon, color = 'blue', format = 'number' }) => {
    const formattedValue = format === 'currency' ? formatCurrency(value) : 
                          format === 'percentage' ? formatPercentage(value) : 
                          formatNumber(value);
    
    const trendIcon = getTrendIcon(value, target);
    const trendColor = getTrendColor(value, target);
    
    return (
      <Card className="relative">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className={`h-4 w-4 text-${color}-500`} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formattedValue}</div>
          <div className={`text-xs ${trendColor} flex items-center gap-1`}>
            {trendIcon}
            {value > target ? 'Acima do target' : value < target * 0.9 ? 'Abaixo do target' : 'No target'}
          </div>
        </CardContent>
      </Card>
    );
  };

  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Receita Total" 
          value={metrics.totalRevenue} 
          target={1200000}
          icon={DollarSign} 
          color="green"
          format="currency"
        />
        <MetricCard 
          title="Total de Clientes" 
          value={metrics.totalClients} 
          target={50}
          icon={Users} 
          color="blue"
        />
        <MetricCard 
          title="Projetos Ativos" 
          value={metrics.activeProjects} 
          target={25}
          icon={Target} 
          color="purple"
        />
        <MetricCard 
          title="Taxa de Sucesso" 
          value={metrics.projectSuccessRate} 
          target={90}
          icon={CheckCircle} 
          color="green"
          format="percentage"
        />
      </div>

      {/* Gráficos de Tendências */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Evolução da Receita</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trends.revenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Area type="monotone" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                <Area type="monotone" dataKey="target" stroke="#6b7280" fill="#6b7280" fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Satisfação dos Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trends.satisfaction}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 5]} />
                <Tooltip formatter={(value) => value.toFixed(1)} />
                <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="target" stroke="#6b7280" strokeWidth={1} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      <Card>
        <CardHeader>
          <CardTitle>Alertas e Notificações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div 
                key={alert.id} 
                className={`p-3 rounded-lg border ${
                  alert.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                  alert.type === 'success' ? 'bg-green-50 border-green-200' :
                  'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium">{alert.title}</div>
                    <div className="text-sm opacity-80">{alert.description}</div>
                    <div className="text-xs opacity-60 mt-1">
                      {new Date(alert.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <Badge variant={alert.severity === 'high' ? 'destructive' : 'secondary'}>
                    {alert.severity}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const KPIsTab = () => (
    <div className="space-y-6">
      {/* KPIs Financeiros */}
      <Card>
        <CardHeader>
          <CardTitle>KPIs Financeiros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{formatCurrency(kpis.financial?.revenue || 0)}</div>
              <div className="text-sm text-gray-600">Receita Total</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{formatPercentage(kpis.financial?.margin || 0)}</div>
              <div className="text-sm text-gray-600">Margem de Lucro</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">{formatPercentage(kpis.financial?.roi || 0)}</div>
              <div className="text-sm text-gray-600">ROI</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs Operacionais */}
      <Card>
        <CardHeader>
          <CardTitle>KPIs Operacionais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{formatPercentage(kpis.operational?.projectCompletion || 0)}</div>
              <div className="text-sm text-gray-600">Taxa de Conclusão</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{(kpis.operational?.clientSatisfaction || 0).toFixed(1)}/5</div>
              <div className="text-sm text-gray-600">Satisfação do Cliente</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">{formatPercentage(kpis.operational?.teamUtilization || 0)}</div>
              <div className="text-sm text-gray-600">Utilização da Equipe</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Barras - KPIs */}
      <Card>
        <CardHeader>
          <CardTitle>Comparação de KPIs</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={[
              { name: 'Receita', value: kpis.financial?.revenue || 0, target: 1200000 },
              { name: 'Margem', value: kpis.financial?.margin || 0, target: 30 },
              { name: 'ROI', value: kpis.financial?.roi || 0, target: 20 },
              { name: 'Conclusão', value: kpis.operational?.projectCompletion || 0, target: 90 },
              { name: 'Satisfação', value: (kpis.operational?.clientSatisfaction || 0) * 20, target: 80 },
              { name: 'Utilização', value: kpis.operational?.teamUtilization || 0, target: 85 }
            ]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" />
              <Bar dataKey="target" fill="#6b7280" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );

  const TrendsTab = () => (
    <div className="space-y-6">
      {/* Gráficos de Tendências */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Crescimento de Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trends.clients}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} />
                <Line type="monotone" dataKey="target" stroke="#6b7280" strokeWidth={1} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Projetos Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trends.projects}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                <Area type="monotone" dataKey="target" stroke="#6b7280" fill="#6b7280" fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Análise de Tendências */}
      <Card>
        <CardHeader>
          <CardTitle>Análise de Tendências</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-600">+15.2%</div>
              <div className="text-sm text-gray-600">Crescimento da Receita</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-600">+8.5%</div>
              <div className="text-sm text-gray-600">Crescimento de Clientes</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Target className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-600">+4.2%</div>
              <div className="text-sm text-gray-600">Taxa de Sucesso</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Executivo</h1>
          <p className="text-gray-600">Visão estratégica do negócio</p>
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={selectedPeriod} 
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
          </select>
          <Button 
            variant="outline" 
            onClick={loadDashboardData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="kpis">KPIs</TabsTrigger>
          <TabsTrigger value="trends">Tendências</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab />
        </TabsContent>

        <TabsContent value="kpis">
          <KPIsTab />
        </TabsContent>

        <TabsContent value="trends">
          <TrendsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

