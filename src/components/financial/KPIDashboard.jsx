
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Filter, 
  Plus, 
  Search,
  Calendar,
  Download,
  RefreshCw
} from "lucide-react";
import { FinancialKPI } from "@/api/entities";
import { useLoadingState } from "@/components/state/ReactiveStateManager";
import KPICard from "./KPICard";
import KPIChart from "./KPIChart";
import EmptyKPIState from "./EmptyKPIState";
import { KPIDashboardSkeleton } from "@/components/shared/LoadingSkeletons";
import { PERFORMANCE_KPI_CATEGORIES, resolveKPICategory } from "@/constants/performanceKPIs";

const KPI_CATEGORIES = [
  { id: 'all', name: 'Todos os KPIs', color: 'bg-gray-100' },
  ...PERFORMANCE_KPI_CATEGORIES.map((c) => ({ id: c.id, name: c.label, color: c.color })),
];

const TIME_PERIODS = [
  { id: '3m', name: 'Últimos 3 meses' },
  { id: '6m', name: 'Últimos 6 meses' },
  { id: '12m', name: 'Último ano' },
  { id: 'ytd', name: 'Ano atual' },
  { id: 'all', name: 'Todo período' }
];

export default function KPIDashboard({ 
  clientId, 
  serviceId, 
  compact = false, 
  showControls = true,
  initialCategory = 'all',
  onKPIUpdate,
  className = ""
}) {
  const [kpis, setKpis] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedPeriod, setSelectedPeriod] = useState('6m');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // cards | chart | table
  const [sortBy, setSortBy] = useState('priority'); // priority | name | value | trend
  const [error, setError] = useState(null);

  const { isLoading, setLoading, clearLoading } = useLoadingState('kpi-dashboard');

  // Carregar KPIs com useCallback para estabilizar a função
  const loadKPIs = useCallback(async () => {
    if (!clientId) return;
    
    try {
      setLoading();
      setError(null);

      const filters = { clientId };
      if (serviceId) filters.service_instance_id = serviceId;

      const kpiData = await FinancialKPI.filter(filters, '-priority', 50);
      
      // Enriquecer com dados calculados
      const enrichedKPIs = await Promise.all(
        kpiData.map(async (kpi) => {
          // Simular cálculo de trend (seria feito por função backend)
          const trend = calculateTrend(kpi.historical_values || []);
          const status = calculateStatus(kpi.current_value, kpi.target_value, kpi.alert_thresholds);
          
          return {
            ...kpi,
            trend,
            status,
            lastUpdated: kpi.last_calculated_at || kpi.updated_date
          };
        })
      );

      setKpis(enrichedKPIs);
    } catch (err) {
      console.error('[KPIDashboard] Erro ao carregar KPIs:', err);
      setError('Erro ao carregar indicadores de performance');
    } finally {
      clearLoading();
    }
  }, [clientId, serviceId, setLoading, clearLoading]);

  // Carregar KPIs
  useEffect(() => {
    loadKPIs();
  }, [loadKPIs]);

  // Filtrar e ordenar KPIs
  const filteredKPIs = useMemo(() => {
    let filtered = kpis;

    // Filtro por categoria
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(kpi => resolveKPICategory(kpi.category) === selectedCategory);
    }

    // Filtro por busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(kpi => 
        kpi.name.toLowerCase().includes(term) ||
        kpi.description?.toLowerCase().includes(term)
      );
    }

    // Ordenação
    switch (sortBy) {
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'value':
        filtered.sort((a, b) => (b.current_value || 0) - (a.current_value || 0));
        break;
      case 'trend':
        filtered.sort((a, b) => (b.trend?.direction || 0) - (a.trend?.direction || 0));
        break;
      default: // priority
        filtered.sort((a, b) => {
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
        });
    }

    return filtered;
  }, [kpis, selectedCategory, searchTerm, sortBy]);

  // Estatísticas do dashboard
  const stats = useMemo(() => {
    const total = filteredKPIs.length;
    const withData = filteredKPIs.filter(kpi => kpi.current_value !== null && kpi.current_value !== undefined).length;
    const onTarget = filteredKPIs.filter(kpi => kpi.status === 'good').length;
    const needsAttention = filteredKPIs.filter(kpi => kpi.status === 'warning' || kpi.status === 'critical').length;
    
    return {
      total,
      withData,
      onTarget,
      needsAttention,
      dataCompleteness: total > 0 ? Math.round((withData / total) * 100) : 0
    };
  }, [filteredKPIs]);

  const handleRefresh = () => {
    loadKPIs();
  };

  const handleKPIChange = (updatedKPI) => {
    setKpis(prev => prev.map(kpi => 
      kpi.id === updatedKPI.id ? { ...kpi, ...updatedKPI } : kpi
    ));
    onKPIUpdate?.(updatedKPI);
  };

  if (error && !isLoading) {
    return (
      <Card className="border-red-200">
        <CardContent className="p-6 text-center">
          <div className="text-red-600 mb-2">❌ Erro ao carregar KPIs</div>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return <KPIDashboardSkeleton />;
  }

  if (kpis.length === 0) {
    return (
      <EmptyKPIState 
        clientId={clientId}
        serviceId={serviceId}
        onKPICreated={loadKPIs}
        showCreateButton={showControls}
      />
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header com Estatísticas */}
      {!compact && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-gray-600">KPIs Total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{stats.onTarget}</div>
              <div className="text-sm text-gray-600">No Alvo</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{stats.needsAttention}</div>
              <div className="text-sm text-gray-600">Atenção</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">{stats.dataCompleteness}%</div>
              <div className="text-sm text-gray-600">Dados Completos</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Controles de Filtro */}
      {showControls && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              {/* Filtros por categoria */}
              <div className="flex gap-2 flex-wrap">
                {KPI_CATEGORIES.map(category => (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(category.id)}
                    className={selectedCategory === category.id ? category.color : ""}
                  >
                    {category.name}
                    {category.id !== 'all' && (
                      <Badge variant="secondary" className="ml-2">
                        {filteredKPIs.filter(kpi => kpi.category === category.id).length}
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>

              <div className="flex gap-2 items-center ml-auto">
                {/* Busca */}
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Buscar KPIs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-48"
                  />
                </div>

                {/* Período */}
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-40">
                    <Calendar className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_PERIODS.map(period => (
                      <SelectItem key={period.id} value={period.id}>
                        {period.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Ordenação */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="priority">Prioridade</SelectItem>
                    <SelectItem value="name">Nome</SelectItem>
                    <SelectItem value="value">Valor</SelectItem>
                    <SelectItem value="trend">Tendência</SelectItem>
                  </SelectContent>
                </Select>

                {/* Refresh */}
                <Button variant="outline" size="sm" onClick={handleRefresh}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs de Visualização */}
      <Tabs value={viewMode} onValueChange={setViewMode}>
        <TabsList>
          <TabsTrigger value="cards">Cards</TabsTrigger>
          <TabsTrigger value="chart">Gráfico</TabsTrigger>
        </TabsList>

        <TabsContent value="cards">
          {filteredKPIs.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-gray-500 mb-2">🔍 Nenhum KPI encontrado</div>
                <p className="text-sm text-gray-400">
                  Tente ajustar os filtros ou criar um novo KPI
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredKPIs.map(kpi => (
                <KPICard
                  key={kpi.id}
                  kpi={kpi}
                  period={selectedPeriod}
                  onUpdate={handleKPIChange}
                  compact={compact}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="chart">
          <KPIChart
            kpis={filteredKPIs}
            period={selectedPeriod}
            category={selectedCategory}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Funções auxiliares
function calculateTrend(historicalValues) {
  if (!historicalValues || historicalValues.length < 2) {
    return { direction: 0, percentage: 0, status: 'neutral' };
  }

  const sorted = [...historicalValues].sort((a, b) => new Date(a.calculated_at) - new Date(b.calculated_at));
  const latest = sorted[sorted.length - 1];
  const previous = sorted[sorted.length - 2];

  if (!latest?.value || !previous?.value) {
    return { direction: 0, percentage: 0, status: 'neutral' };
  }

  const change = latest.value - previous.value;
  const percentage = Math.abs((change / previous.value) * 100);
  
  return {
    direction: change > 0 ? 1 : change < 0 ? -1 : 0,
    percentage: Math.round(percentage * 100) / 100,
    status: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
    previousValue: previous.value,
    currentValue: latest.value
  };
}

function calculateStatus(currentValue, targetValue, thresholds) {
  if (currentValue === null || currentValue === undefined) {
    return 'no-data';
  }

  if (!targetValue) {
    return 'neutral';
  }

  const ratio = currentValue / targetValue;

  if (thresholds?.critical_low && ratio <= thresholds.critical_low) return 'critical';
  if (thresholds?.critical_high && ratio >= thresholds.critical_high) return 'critical';
  if (thresholds?.warning_low && ratio <= thresholds.warning_low) return 'warning';
  if (thresholds?.warning_high && ratio >= thresholds.warning_high) return 'warning';

  // Consideramos "bom" se está entre 90% e 110% da meta
  if (ratio >= 0.9 && ratio <= 1.1) return 'good';
  
  return ratio < 0.9 ? 'below' : 'above';
}
