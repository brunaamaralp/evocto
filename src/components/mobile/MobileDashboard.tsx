import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Menu, 
  Bell, 
  Search, 
  Filter,
  Download,
  Share,
  Star,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Users,
  DollarSign,
  BarChart3,
  PieChart,
  LineChart,
  Activity,
  Wifi,
  WifiOff,
  Battery,
  Signal
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
  Cell
} from 'recharts';

/**
 * Dashboard Mobile
 * Interface otimizada para dispositivos móveis
 */
export function MobileDashboard() {
  const [isOnline, setIsOnline] = useState(true);
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [signalStrength, setSignalStrength] = useState(4);
  const [notifications, setNotifications] = useState([]);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Monitorar conectividade
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Simular nível de bateria
    const updateBatteryLevel = () => {
      setBatteryLevel(Math.max(20, Math.random() * 100));
    };
    
    // Simular força do sinal
    const updateSignalStrength = () => {
      setSignalStrength(Math.floor(Math.random() * 5) + 1);
    };
    
    const batteryInterval = setInterval(updateBatteryLevel, 30000);
    const signalInterval = setInterval(updateSignalStrength, 15000);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(batteryInterval);
      clearInterval(signalInterval);
    };
  }, []);

  const mockData = {
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
      }
    },
    trends: {
      revenue: generateTrendData(7, 100000, 150000),
      clients: generateTrendData(7, 40, 50),
      projects: generateTrendData(7, 20, 25),
      satisfaction: generateTrendData(7, 4.0, 5.0)
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

  function generateTrendData(days, min, max) {
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
  }

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

  const MetricCard = ({ title, value, target, icon: Icon, color = 'blue', format = 'number', trend = null }) => {
    const formattedValue = format === 'currency' ? formatCurrency(value) : 
                          format === 'percentage' ? formatPercentage(value) : 
                          formatNumber(value);
    
    const getTrendIcon = () => {
      if (!trend) return null;
      if (trend > 0) return <TrendingUp className="h-3 w-3 text-green-500" />;
      if (trend < 0) return <TrendingUp className="h-3 w-3 text-red-500 rotate-180" />;
      return null;
    };
    
    return (
      <Card className="relative">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className={`h-4 w-4 text-${color}-500`} />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold">{formattedValue}</div>
          {trend && (
            <div className="text-xs text-gray-600 flex items-center gap-1">
              {getTrendIcon()}
              {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const StatusBar = () => (
    <div className="flex justify-between items-center p-2 bg-gray-100">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Signal className={`h-3 w-3 ${signalStrength >= 3 ? 'text-green-500' : 'text-yellow-500'}`} />
          <span className="text-xs">{signalStrength}/5</span>
        </div>
        <div className="flex items-center gap-1">
          <Wifi className={`h-3 w-3 ${isOnline ? 'text-green-500' : 'text-red-500'}`} />
          <span className="text-xs">{isOnline ? 'Online' : 'Offline'}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Battery className="h-3 w-3" />
          <span className="text-xs">{Math.round(batteryLevel)}%</span>
        </div>
        <span className="text-xs">{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </div>
  );

  const Header = () => (
    <div className="flex justify-between items-center p-4 bg-white border-b">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold">Evocto</h1>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsSearchOpen(!isSearchOpen)}
        >
          <Search className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="sm">
          <Bell className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );

  const SearchBar = () => (
    isSearchOpen && (
      <div className="p-4 bg-white border-b">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 p-2 border rounded-md"
          />
          <Button variant="ghost" size="sm" onClick={() => setIsSearchOpen(false)}>
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  );

  const OverviewTab = () => (
    <div className="space-y-4 p-4">
      {/* Métricas Principais */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard 
          title="Receita" 
          value={mockData.metrics.totalRevenue} 
          icon={DollarSign} 
          color="green"
          format="currency"
          trend={mockData.metrics.revenueGrowth}
        />
        <MetricCard 
          title="Clientes" 
          value={mockData.metrics.totalClients} 
          icon={Users} 
          color="blue"
          trend={mockData.metrics.clientGrowth}
        />
        <MetricCard 
          title="Projetos" 
          value={mockData.metrics.activeProjects} 
          icon={CheckCircle} 
          color="purple"
        />
        <MetricCard 
          title="Sucesso" 
          value={mockData.metrics.projectSuccessRate} 
          icon={Star} 
          color="green"
          format="percentage"
        />
      </div>

      {/* Gráfico de Tendências */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evolução da Receita</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={mockData.trends.revenue}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" hide />
              <YAxis hide />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Alertas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alertas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockData.alerts.map((alert) => (
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
                    <div className="font-medium text-sm">{alert.title}</div>
                    <div className="text-xs opacity-80">{alert.description}</div>
                  </div>
                  <Badge variant={alert.severity === 'high' ? 'destructive' : 'secondary'} className="text-xs">
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
    <div className="space-y-4 p-4">
      {/* KPIs Financeiros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">KPIs Financeiros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{formatCurrency(mockData.kpis.financial.revenue)}</div>
              <div className="text-xs text-gray-600">Receita Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{formatPercentage(mockData.kpis.financial.margin)}</div>
              <div className="text-xs text-gray-600">Margem de Lucro</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{formatPercentage(mockData.kpis.financial.roi)}</div>
              <div className="text-xs text-gray-600">ROI</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{formatCurrency(mockData.kpis.financial.cashFlow)}</div>
              <div className="text-xs text-gray-600">Fluxo de Caixa</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs Operacionais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">KPIs Operacionais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{formatPercentage(mockData.kpis.operational.projectCompletion)}</div>
              <div className="text-xs text-gray-600">Taxa de Conclusão</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{(mockData.kpis.operational.clientSatisfaction).toFixed(1)}/5</div>
              <div className="text-xs text-gray-600">Satisfação do Cliente</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{formatPercentage(mockData.kpis.operational.teamUtilization)}</div>
              <div className="text-xs text-gray-600">Utilização da Equipe</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{mockData.kpis.operational.responseTime}h</div>
              <div className="text-xs text-gray-600">Tempo de Resposta</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Barras */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comparação de KPIs</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={[
              { name: 'Receita', value: mockData.kpis.financial.revenue / 1000, target: 1200 },
              { name: 'Margem', value: mockData.kpis.financial.margin, target: 30 },
              { name: 'ROI', value: mockData.kpis.financial.roi, target: 20 },
              { name: 'Conclusão', value: mockData.kpis.operational.projectCompletion, target: 90 },
              { name: 'Satisfação', value: mockData.kpis.operational.clientSatisfaction * 20, target: 80 },
              { name: 'Utilização', value: mockData.kpis.operational.teamUtilization, target: 85 }
            ]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" hide />
              <YAxis hide />
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
    <div className="space-y-4 p-4">
      {/* Gráficos de Tendências */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Crescimento de Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={mockData.trends.clients}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" hide />
                <YAxis hide />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} />
                <Line type="monotone" dataKey="target" stroke="#6b7280" strokeWidth={1} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Projetos Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={mockData.trends.projects}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" hide />
                <YAxis hide />
                <Tooltip />
                <Bar dataKey="value" fill="#8b5cf6" />
                <Bar dataKey="target" fill="#6b7280" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Análise de Tendências */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Análise de Tendências</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium">Crescimento da Receita</span>
              </div>
              <span className="text-lg font-bold text-green-600">+15.2%</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium">Crescimento de Clientes</span>
              </div>
              <span className="text-lg font-bold text-blue-600">+8.5%</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-medium">Taxa de Sucesso</span>
              </div>
              <span className="text-lg font-bold text-purple-600">+4.2%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <StatusBar />
      <Header />
      <SearchBar />
      
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3 sticky top-0 z-10">
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

