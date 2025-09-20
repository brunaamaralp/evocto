/**
 * 📊 Dashboard de Monitoramento de Erros
 * 
 * Interface para visualizar e monitorar logs de erro em tempo real
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertTriangle,
  Bug,
  Clock,
  Filter,
  RefreshCw,
  Search,
  TrendingUp,
  TrendingDown,
  Activity,
  Eye,
  Download,
  Bell,
  BellOff,
  Settings,
  BarChart3,
  PieChart,
  LineChart
} from 'lucide-react';
import { useErrorHandling } from '@/hooks/useErrorHandling';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Tipos para o dashboard
interface LogEntry {
  id: string;
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  context: {
    userId?: string;
    agencyId?: string;
    action?: string;
    serviceId?: string;
    clientId?: string;
    [key: string]: any;
  };
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

interface LogStats {
  total: number;
  byLevel: Record<string, number>;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
  recent: number;
  critical: number;
  trends: {
    hourly: Record<string, number>;
    daily: Record<string, number>;
  };
}

const LEVEL_COLORS = {
  debug: 'bg-gray-100 text-gray-800',
  info: 'bg-blue-100 text-blue-800',
  warn: 'bg-yellow-100 text-yellow-800',
  error: 'bg-red-100 text-red-800',
  critical: 'bg-red-200 text-red-900'
};

const SEVERITY_COLORS = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800'
};

export default function ErrorMonitoringDashboard() {
  const {
    getServerLogs,
    getLogStats,
    getCriticalLogs,
    getRecentErrors
  } = useErrorHandling();

  // Estado do dashboard
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [criticalLogs, setCriticalLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  // Filtros
  const [filters, setFilters] = useState({
    level: [] as string[],
    category: [] as string[],
    severity: [] as string[],
    search: '',
    startDate: '',
    endDate: '',
    limit: 50
  });

  // Carregar dados
  const loadData = useCallback(async () => {
    try {
      setRefreshing(true);
      
      const [logsData, statsData, criticalData] = await Promise.all([
        getServerLogs(filters),
        getLogStats(),
        getCriticalLogs(10)
      ]);

      setLogs(logsData);
      setStats(statsData);
      setCriticalLogs(criticalData);
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters, getServerLogs, getLogStats, getCriticalLogs]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(loadData, 30000); // 30 segundos
      return () => clearInterval(interval);
    }
  }, [autoRefresh, loadData]);

  // Carregar dados iniciais
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Aplicar filtros
  const applyFilters = useCallback((newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Exportar logs
  const exportLogs = useCallback(() => {
    const dataStr = JSON.stringify(logs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `error-logs-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [logs]);

  // Renderizar estatísticas
  const renderStats = () => {
    if (!stats) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-sm text-gray-600">Total de Logs</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.critical}</div>
                <div className="text-sm text-gray-600">Críticos</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-600" />
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.recent}</div>
                <div className="text-sm text-gray-600">Última Hora</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {Object.keys(stats.trends.hourly).length}
                </div>
                <div className="text-sm text-gray-600">Horas Ativas</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Renderizar gráficos de distribuição
  const renderCharts = () => {
    if (!stats) return null;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Distribuição por Nível
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.byLevel).map(([level, count]) => (
                <div key={level} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={LEVEL_COLORS[level as keyof typeof LEVEL_COLORS]}>
                      {level}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${(count / stats.total) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Distribuição por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.byCategory).map(([category, count]) => (
                <div key={category} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium capitalize">{category}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${(count / stats.total) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Renderizar logs críticos
  const renderCriticalLogs = () => {
    if (criticalLogs.length === 0) return null;

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Logs Críticos Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {criticalLogs.map(log => (
              <Alert key={log.id} className="border-red-200 bg-red-50">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-red-800">{log.message}</p>
                      <p className="text-sm text-red-600">
                        {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedLog(log)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Renderizar filtros
  const renderFilters = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="w-5 h-5" />
          Filtros
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="search">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                id="search"
                placeholder="Buscar em logs..."
                value={filters.search}
                onChange={(e) => applyFilters({ search: e.target.value })}
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="level">Nível</Label>
            <Select
              value={filters.level[0] || ''}
              onValueChange={(value) => applyFilters({ level: value ? [value] : [] })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar nível" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="debug">Debug</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warn">Warn</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="severity">Severidade</Label>
            <Select
              value={filters.severity[0] || ''}
              onValueChange={(value) => applyFilters({ severity: value ? [value] : [] })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar severidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas</SelectItem>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="critical">Crítica</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="limit">Limite</Label>
            <Select
              value={filters.limit.toString()}
              onValueChange={(value) => applyFilters({ limit: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="200">200</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Renderizar tabela de logs
  const renderLogsTable = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bug className="w-5 h-5" />
            Logs de Erro
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setAutoRefresh(!autoRefresh)}
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
            >
              {autoRefresh ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            </Button>
            <Button
              onClick={loadData}
              disabled={refreshing}
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              onClick={exportLogs}
              variant="outline"
              size="sm"
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Nível</TableHead>
              <TableHead>Severidade</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Mensagem</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map(log => (
              <TableRow key={log.id}>
                <TableCell className="text-sm">
                  {format(new Date(log.timestamp), 'dd/MM HH:mm:ss', { locale: ptBR })}
                </TableCell>
                <TableCell>
                  <Badge className={LEVEL_COLORS[log.level]}>
                    {log.level}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={SEVERITY_COLORS[log.severity]}>
                    {log.severity}
                  </Badge>
                </TableCell>
                <TableCell className="capitalize">{log.category}</TableCell>
                <TableCell className="max-w-xs truncate">{log.message}</TableCell>
                <TableCell className="text-sm">{log.context.userId || 'N/A'}</TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedLog(log)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  // Renderizar detalhes do log
  const renderLogDetails = () => {
    if (!selectedLog) return null;

    return (
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bug className="w-5 h-5" />
              Detalhes do Log
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-500">ID</Label>
                <p className="text-sm">{selectedLog.id}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Timestamp</Label>
                <p className="text-sm">
                  {format(new Date(selectedLog.timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Nível</Label>
                <Badge className={LEVEL_COLORS[selectedLog.level]}>
                  {selectedLog.level}
                </Badge>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Severidade</Label>
                <Badge className={SEVERITY_COLORS[selectedLog.severity]}>
                  {selectedLog.severity}
                </Badge>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-500">Mensagem</Label>
              <p className="text-sm bg-gray-50 p-3 rounded-md">{selectedLog.message}</p>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-500">Contexto</Label>
              <pre className="text-xs bg-gray-50 p-3 rounded-md overflow-auto">
                {JSON.stringify(selectedLog.context, null, 2)}
              </pre>
            </div>

            {selectedLog.error && (
              <div>
                <Label className="text-sm font-medium text-gray-500">Erro</Label>
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs font-medium text-gray-400">Nome</Label>
                    <p className="text-sm">{selectedLog.error.name}</p>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-400">Mensagem</Label>
                    <p className="text-sm">{selectedLog.error.message}</p>
                  </div>
                  {selectedLog.error.stack && (
                    <div>
                      <Label className="text-xs font-medium text-gray-400">Stack Trace</Label>
                      <pre className="text-xs bg-gray-50 p-3 rounded-md overflow-auto">
                        {selectedLog.error.stack}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Carregando dashboard de erros...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Monitoramento de Erros</h1>
        <div className="flex items-center gap-2">
          <Badge variant={autoRefresh ? "default" : "outline"}>
            {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
          </Badge>
          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant="outline"
            size="sm"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {renderStats()}
      {renderCharts()}
      {renderCriticalLogs()}
      {renderFilters()}
      {renderLogsTable()}
      {renderLogDetails()}
    </div>
  );
}

