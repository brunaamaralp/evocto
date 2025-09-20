import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Filter,
  Calendar,
  Eye,
  MousePointer,
  Zap,
  Shield,
  Database,
  Server,
  Globe
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
  Area,
  ScatterChart,
  Scatter
} from 'recharts';

/**
 * Dashboard de Métricas Avançado
 * Exibe métricas detalhadas de performance, negócio e sistema
 */
export function AdvancedMetricsDashboard() {
  const [metrics, setMetrics] = useState({});
  const [realTimeData, setRealTimeData] = useState({});
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [selectedTab, setSelectedTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadMetrics();
    
    if (autoRefresh) {
      const interval = setInterval(loadRealTimeMetrics, 30000); // 30 segundos
      return () => clearInterval(interval);
    }
  }, [selectedPeriod, autoRefresh]);

  const loadMetrics = async () => {
    setIsLoading(true);
    try {
      // Simular carregamento de métricas
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockMetrics = generateMockMetrics(selectedPeriod);
      setMetrics(mockMetrics);
    } catch (error) {
      console.error('Erro ao carregar métricas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRealTimeMetrics = async () => {
    try {
      const realTime = generateRealTimeData();
      setRealTimeData(realTime);
    } catch (error) {
      console.error('Erro ao carregar métricas em tempo real:', error);
    }
  };

  const generateMockMetrics = (period) => {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    
    return {
      business: {
        revenue: 1250000,
        profit: 312500,
        margin: 25.0,
        clients: 45,
        projects: 23,
        growth: {
          revenue: 15.2,
          clients: 8.5,
          projects: 12.3
        }
      },
      performance: {
        pageLoadTime: 1.2,
        apiResponseTime: 0.3,
        errorRate: 0.1,
        uptime: 99.9,
        cacheHitRate: 85.2,
        cdnHitRate: 92.1
      },
      user: {
        activeUsers: 156,
        newUsers: 23,
        returningUsers: 133,
        sessionDuration: 8.5,
        bounceRate: 12.3,
        conversionRate: 4.2
      },
      system: {
        cpuUsage: 45.2,
        memoryUsage: 67.8,
        diskUsage: 34.5,
        networkLatency: 12.3,
        databaseConnections: 45,
        queueSize: 12
      },
      security: {
        failedLogins: 23,
        blockedIPs: 5,
        securityAlerts: 2,
        twoFactorUsage: 78.5,
        passwordStrength: 92.1,
        auditLogs: 1247
      },
      trends: {
        revenue: generateTrendData(days, 100000, 150000),
        users: generateTrendData(days, 100, 200),
        performance: generateTrendData(days, 0.5, 2.0),
        errors: generateTrendData(days, 0, 10)
      }
    };
  };

  const generateRealTimeData = () => {
    return {
      activeUsers: Math.floor(Math.random() * 50) + 100,
      requestsPerSecond: Math.floor(Math.random() * 100) + 50,
      errorRate: Math.random() * 2,
      responseTime: Math.random() * 0.5 + 0.1,
      cpuUsage: Math.random() * 30 + 40,
      memoryUsage: Math.random() * 20 + 60,
      timestamp: Date.now()
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

  const formatTime = (value) => {
    return `${value.toFixed(1)}s`;
  };

  const MetricCard = ({ title, value, target, icon: Icon, color = 'blue', format = 'number', trend = null, subtitle = null }) => {
    const formattedValue = format === 'currency' ? formatCurrency(value) : 
                          format === 'percentage' ? formatPercentage(value) : 
                          format === 'time' ? formatTime(value) :
                          formatNumber(value);
    
    const getTrendIcon = () => {
      if (!trend) return null;
      if (trend > 0) return <TrendingUp className="h-3 w-3 text-green-500" />;
      if (trend < 0) return <TrendingDown className="h-3 w-3 text-red-500" />;
      return null;
    };
    
    const getTrendColor = () => {
      if (!trend) return 'text-gray-600';
      if (trend > 0) return 'text-green-600';
      if (trend < 0) return 'text-red-600';
      return 'text-gray-600';
    };
    
    return (
      <Card className="relative">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className={`h-4 w-4 text-${color}-500`} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formattedValue}</div>
          {subtitle && (
            <div className="text-xs text-gray-600">{subtitle}</div>
          )}
          {trend && (
            <div className={`text-xs flex items-center gap-1 ${getTrendColor()}`}>
              {getTrendIcon()}
              {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Métricas de Negócio */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Métricas de Negócio</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard 
            title="Receita Total" 
            value={metrics.business?.revenue || 0} 
            icon={DollarSign} 
            color="green"
            format="currency"
            trend={metrics.business?.growth?.revenue}
          />
          <MetricCard 
            title="Margem de Lucro" 
            value={metrics.business?.margin || 0} 
            icon={Target} 
            color="blue"
            format="percentage"
          />
          <MetricCard 
            title="Total de Clientes" 
            value={metrics.business?.clients || 0} 
            icon={Users} 
            color="purple"
            trend={metrics.business?.growth?.clients}
          />
          <MetricCard 
            title="Projetos Ativos" 
            value={metrics.business?.projects || 0} 
            icon={CheckCircle} 
            color="green"
            trend={metrics.business?.growth?.projects}
          />
        </div>
      </div>

      {/* Métricas de Performance */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Métricas de Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard 
            title="Tempo de Carregamento" 
            value={metrics.performance?.pageLoadTime || 0} 
            icon={Clock} 
            color="blue"
            format="time"
            subtitle="Página média"
          />
          <MetricCard 
            title="Taxa de Erro" 
            value={metrics.performance?.errorRate || 0} 
            icon={AlertTriangle} 
            color="red"
            format="percentage"
            subtitle="Últimas 24h"
          />
          <MetricCard 
            title="Uptime" 
            value={metrics.performance?.uptime || 0} 
            icon={CheckCircle} 
            color="green"
            format="percentage"
            subtitle="Últimos 30 dias"
          />
        </div>
      </div>

      {/* Gráficos de Tendências */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Evolução da Receita</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={metrics.trends?.revenue || []}>
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
            <CardTitle>Crescimento de Usuários</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={metrics.trends?.users || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="target" stroke="#6b7280" strokeWidth={1} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const PerformanceTab = () => (
    <div className="space-y-6">
      {/* Métricas de Performance em Tempo Real */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Performance em Tempo Real</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard 
            title="Usuários Ativos" 
            value={realTimeData.activeUsers || 0} 
            icon={Users} 
            color="blue"
            subtitle="Agora"
          />
          <MetricCard 
            title="Requests/seg" 
            value={realTimeData.requestsPerSecond || 0} 
            icon={Zap} 
            color="green"
            subtitle="Último minuto"
          />
          <MetricCard 
            title="Tempo de Resposta" 
            value={realTimeData.responseTime || 0} 
            icon={Clock} 
            color="orange"
            format="time"
            subtitle="API média"
          />
          <MetricCard 
            title="Taxa de Erro" 
            value={realTimeData.errorRate || 0} 
            icon={AlertTriangle} 
            color="red"
            format="percentage"
            subtitle="Últimos 5 min"
          />
        </div>
      </div>

      {/* Métricas de Sistema */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Métricas de Sistema</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard 
            title="Uso de CPU" 
            value={realTimeData.cpuUsage || 0} 
            icon={Activity} 
            color="blue"
            format="percentage"
            subtitle="Servidor principal"
          />
          <MetricCard 
            title="Uso de Memória" 
            value={realTimeData.memoryUsage || 0} 
            icon={Database} 
            color="purple"
            format="percentage"
            subtitle="RAM disponível"
          />
          <MetricCard 
            title="Cache Hit Rate" 
            value={metrics.performance?.cacheHitRate || 0} 
            icon={Zap} 
            color="green"
            format="percentage"
            subtitle="Última hora"
          />
        </div>
      </div>

      {/* Gráficos de Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Tempo de Carregamento</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={metrics.trends?.performance || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => formatTime(value)} />
                <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2} />
                <Line type="monotone" dataKey="target" stroke="#6b7280" strokeWidth={1} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Taxa de Erro</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={metrics.trends?.errors || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const SecurityTab = () => (
    <div className="space-y-6">
      {/* Métricas de Segurança */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Métricas de Segurança</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard 
            title="Tentativas de Login Falhadas" 
            value={metrics.security?.failedLogins || 0} 
            icon={Shield} 
            color="red"
            subtitle="Últimas 24h"
          />
          <MetricCard 
            title="IPs Bloqueados" 
            value={metrics.security?.blockedIPs || 0} 
            icon={Globe} 
            color="orange"
            subtitle="Ativos"
          />
          <MetricCard 
            title="Alertas de Segurança" 
            value={metrics.security?.securityAlerts || 0} 
            icon={AlertTriangle} 
            color="red"
            subtitle="Não resolvidos"
          />
        </div>
      </div>

      {/* Métricas de Autenticação */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Autenticação</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard 
            title="Uso de 2FA" 
            value={metrics.security?.twoFactorUsage || 0} 
            icon={Shield} 
            color="green"
            format="percentage"
            subtitle="Usuários ativos"
          />
          <MetricCard 
            title="Força das Senhas" 
            value={metrics.security?.passwordStrength || 0} 
            icon={Shield} 
            color="blue"
            format="percentage"
            subtitle="Score médio"
          />
          <MetricCard 
            title="Logs de Auditoria" 
            value={metrics.security?.auditLogs || 0} 
            icon={Database} 
            color="purple"
            subtitle="Últimos 7 dias"
          />
        </div>
      </div>

      {/* Gráfico de Segurança */}
      <Card>
        <CardHeader>
          <CardTitle>Atividade de Segurança</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={[
              { name: 'Logins Falhados', value: metrics.security?.failedLogins || 0, color: '#ef4444' },
              { name: 'IPs Bloqueados', value: metrics.security?.blockedIPs || 0, color: '#f59e0b' },
              { name: 'Alertas', value: metrics.security?.securityAlerts || 0, color: '#dc2626' },
              { name: '2FA Ativado', value: Math.round((metrics.security?.twoFactorUsage || 0) * 45 / 100), color: '#10b981' }
            ]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard de Métricas Avançado</h1>
          <p className="text-gray-600">Métricas detalhadas de performance, negócio e sistema</p>
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
            onClick={loadMetrics}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button 
            variant={autoRefresh ? "default" : "outline"}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className="h-4 w-4 mr-2" />
            {autoRefresh ? 'Auto' : 'Manual'}
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
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab />
        </TabsContent>

        <TabsContent value="performance">
          <PerformanceTab />
        </TabsContent>

        <TabsContent value="security">
          <SecurityTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

