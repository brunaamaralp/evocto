import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Cpu, 
  Database, 
  MemoryStick, 
  Network, 
  TrendingUp, 
  Users,
  Zap,
  RefreshCw
} from 'lucide-react';
import { systemMonitor } from './SystemMonitor';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

/**
 * Dashboard de Monitoramento em Tempo Real
 * Exibe métricas de performance, alertas e logs do sistema
 */
export function MonitoringDashboard() {
  const [metrics, setMetrics] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState('overview');

  useEffect(() => {
    // Configurar listeners do SystemMonitor
    const handleMetric = (metric) => {
      setMetrics(prev => ({
        ...prev,
        [metric.name]: [...(prev[metric.name] || []), metric]
      }));
    };

    const handleAlert = (alert) => {
      setAlerts(prev => [alert, ...prev]);
    };

    const handleLog = (log) => {
      setLogs(prev => [log, ...prev]);
    };

    systemMonitor.on('metric', handleMetric);
    systemMonitor.on('alert', handleAlert);
    systemMonitor.on('log', handleLog);

    // Carregar dados iniciais
    loadInitialData();

    return () => {
      systemMonitor.off('metric', handleMetric);
      systemMonitor.off('alert', handleAlert);
      systemMonitor.off('log', handleLog);
    };
  }, []);

  const loadInitialData = async () => {
    setIsRefreshing(true);
    try {
      const allMetrics = systemMonitor.getAllMetrics();
      const activeAlerts = systemMonitor.getActiveAlerts();
      const recentLogs = systemMonitor.getLogs().slice(-100);

      setMetrics(allMetrics);
      setAlerts(activeAlerts);
      setLogs(recentLogs);
    } catch (error) {
      console.error('Erro ao carregar dados de monitoramento:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'warning': return 'secondary';
      case 'info': return 'default';
      default: return 'outline';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info': return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const formatValue = (name, value) => {
    switch (name) {
      case 'latency': return `${value.toFixed(0)}ms`;
      case 'throughput': return `${value.toFixed(0)} req/s`;
      case 'error_rate': return `${value.toFixed(2)}%`;
      case 'uptime': return `${value.toFixed(2)}%`;
      case 'conversion_rate': return `${value.toFixed(1)}%`;
      case 'bounce_rate': return `${value.toFixed(1)}%`;
      case 'satisfaction': return `${value.toFixed(1)}/5`;
      case 'response_time': return `${value.toFixed(1)}h`;
      case 'memory_usage': return `${value.toFixed(1)}MB`;
      case 'cpu_usage': return `${value.toFixed(1)}%`;
      case 'active_connections': return `${value.toFixed(0)}`;
      default: return value.toString();
    }
  };

  const getMetricStatus = (name, value) => {
    switch (name) {
      case 'latency': return value > 1000 ? 'warning' : 'good';
      case 'error_rate': return value > 5 ? 'critical' : 'good';
      case 'uptime': return value < 99 ? 'critical' : 'good';
      case 'conversion_rate': return value < 70 ? 'warning' : 'good';
      case 'bounce_rate': return value > 30 ? 'warning' : 'good';
      default: return 'good';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'good': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const prepareChartData = (metricData) => {
    if (!metricData || metricData.length === 0) return [];
    
    return metricData.slice(-20).map(metric => ({
      time: new Date(metric.timestamp).toLocaleTimeString(),
      value: metric.value
    }));
  };

  const MetricCard = ({ name, value, icon: Icon, color = 'blue' }) => {
    const status = getMetricStatus(name, value);
    const statusColor = getStatusColor(status);
    
    return (
      <Card className="relative">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{name.replace('_', ' ').toUpperCase()}</CardTitle>
          <Icon className={`h-4 w-4 text-${color}-500`} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatValue(name, value)}</div>
          <div className={`text-xs ${statusColor} flex items-center gap-1`}>
            {status === 'good' && <CheckCircle className="h-3 w-3" />}
            {status === 'warning' && <AlertTriangle className="h-3 w-3" />}
            {status === 'critical' && <AlertTriangle className="h-3 w-3" />}
            {status === 'good' ? 'Normal' : status === 'warning' ? 'Atenção' : 'Crítico'}
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
          name="latency" 
          value={metrics.latency?.[metrics.latency.length - 1]?.value || 0} 
          icon={Clock} 
          color="blue" 
        />
        <MetricCard 
          name="throughput" 
          value={metrics.throughput?.[metrics.throughput.length - 1]?.value || 0} 
          icon={Zap} 
          color="green" 
        />
        <MetricCard 
          name="error_rate" 
          value={metrics.error_rate?.[metrics.error_rate.length - 1]?.value || 0} 
          icon={AlertTriangle} 
          color="red" 
        />
        <MetricCard 
          name="uptime" 
          value={metrics.uptime?.[metrics.uptime.length - 1]?.value || 0} 
          icon={CheckCircle} 
          color="green" 
        />
      </div>

      {/* Métricas de Negócio */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          name="conversion_rate" 
          value={metrics.conversion_rate?.[metrics.conversion_rate.length - 1]?.value || 0} 
          icon={TrendingUp} 
          color="purple" 
        />
        <MetricCard 
          name="satisfaction" 
          value={metrics.satisfaction?.[metrics.satisfaction.length - 1]?.value || 0} 
          icon={Users} 
          color="orange" 
        />
        <MetricCard 
          name="response_time" 
          value={metrics.response_time?.[metrics.response_time.length - 1]?.value || 0} 
          icon={Clock} 
          color="blue" 
        />
        <MetricCard 
          name="bounce_rate" 
          value={metrics.bounce_rate?.[metrics.bounce_rate.length - 1]?.value || 0} 
          icon={AlertTriangle} 
          color="yellow" 
        />
      </div>

      {/* Gráficos de Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Latência em Tempo Real</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={prepareChartData(metrics.latency)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Throughput em Tempo Real</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={prepareChartData(metrics.throughput)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const AlertsTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Alertas Ativos</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={loadInitialData}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {alerts.length === 0 ? (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Nenhum alerta ativo no momento. Sistema funcionando normalmente.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-3">
          {alerts.slice(0, 10).map((alert) => (
            <Alert key={alert.id} variant={getSeverityColor(alert.rule.severity)}>
              {getSeverityIcon(alert.rule.severity)}
              <AlertDescription className="flex justify-between items-center">
                <div>
                  <div className="font-medium">{alert.rule.name}</div>
                  <div className="text-sm opacity-80">
                    {alert.rule.message.replace('{value}', alert.metric.value)}
                  </div>
                  <div className="text-xs opacity-60">
                    {new Date(alert.timestamp).toLocaleString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => systemMonitor.acknowledgeAlert(alert.id)}
                  >
                    Reconhecer
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => systemMonitor.resolveAlert(alert.id)}
                  >
                    Resolver
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}
    </div>
  );

  const LogsTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Logs do Sistema</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={loadInitialData}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {logs.slice(0, 50).map((log) => (
          <div 
            key={log.id} 
            className={`p-3 rounded-lg border text-sm ${
              log.level === 'error' ? 'bg-red-50 border-red-200' :
              log.level === 'warning' ? 'bg-yellow-50 border-yellow-200' :
              log.level === 'info' ? 'bg-blue-50 border-blue-200' :
              'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="font-medium">{log.message}</div>
                {log.data && Object.keys(log.data).length > 0 && (
                  <div className="text-xs opacity-70 mt-1">
                    {JSON.stringify(log.data, null, 2)}
                  </div>
                )}
              </div>
              <div className="text-xs opacity-60 ml-4">
                {new Date(log.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard de Monitoramento</h1>
          <p className="text-gray-600">Monitoramento em tempo real do sistema</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            Online
          </Badge>
          <Button 
            variant="outline" 
            onClick={loadInitialData}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab />
        </TabsContent>

        <TabsContent value="alerts">
          <AlertsTab />
        </TabsContent>

        <TabsContent value="logs">
          <LogsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

