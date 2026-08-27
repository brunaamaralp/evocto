import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { FinancialKPI } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  BarChart3, Target, DollarSign, Percent, Hash, Calendar,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import {
  PERFORMANCE_KPI_CATEGORIES,
  resolveKPICategory,
  DEFAULT_KPI_CATEGORY,
} from '@/constants/performanceKPIs';

const CATEGORY_ICONS = {
  performance: TrendingUp,
  demanda: Target,
  marca: BarChart3,
  operacao: AlertTriangle,
  engajamento: Percent,
  crescimento: DollarSign,
};

const KPI_CATEGORIES = Object.fromEntries(
  PERFORMANCE_KPI_CATEGORIES.map((c) => [
    c.id,
    { label: c.label, color: c.color, icon: CATEGORY_ICONS[c.id] || BarChart3 },
  ])
);

const UNIT_LABELS = {
  percentage: { label: '%', icon: Percent },
  currency: { label: 'R$', icon: DollarSign },
  ratio: { label: 'x', icon: Hash },
  days: { label: 'dias', icon: Calendar },
  number: { label: 'un', icon: Hash }
};

export default function FinancialDashboard({ clientId, serviceId }) {
  const { user } = useSession();
  const [kpis, setKPIs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadKPIs = useCallback(async () => {
    if (!clientId) return;

    try {
      const agencyId = user?.data?.agencyId || user?.data?.clientId; // Cliente pode ter acesso via clientId
      
      const kpiData = await FinancialKPI.filter({
        clientId,
        is_active: true,
        ...(serviceId && { serviceId })
      });

      setKPIs(kpiData || []);
    } catch (error) {
      console.error('Erro ao carregar KPIs:', error);
      toast.error('Erro ao carregar KPIs de performance');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clientId, serviceId, user]);

  useEffect(() => {
    loadKPIs();
  }, [loadKPIs]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadKPIs();
  };

  const formatKPIValue = (value, unit) => {
    if (value === null || value === undefined) return '--';
    
    switch (unit) {
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'currency':
        return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
      case 'ratio':
        return `${value.toFixed(2)}x`;
      case 'days':
        return `${Math.round(value)} dias`;
      default:
        return `${value.toLocaleString('pt-BR')}`;
    }
  };

  const getKPIStatus = (kpi) => {
    if (!kpi.current_value || !kpi.target_value) {
      return { 
        status: 'no_data', 
        color: 'bg-gray-100 text-gray-700 border-gray-300', 
        icon: AlertTriangle,
        label: 'Sem Dados'
      };
    }

    const current = kpi.current_value;
    const thresholds = kpi.alert_thresholds;

    if (!thresholds) {
      return { 
        status: 'unknown', 
        color: 'bg-gray-100 text-gray-700 border-gray-300', 
        icon: AlertTriangle,
        label: 'Sem Limites'
      };
    }

    if (current <= thresholds.critical_low || current >= thresholds.critical_high) {
      return { 
        status: 'critical', 
        color: 'bg-red-100 text-red-700 border-red-300', 
        icon: AlertTriangle,
        label: 'Crítico'
      };
    }
    
    if (current <= thresholds.warning_low || current >= thresholds.warning_high) {
      return { 
        status: 'warning', 
        color: 'bg-yellow-100 text-yellow-700 border-yellow-300', 
        icon: TrendingDown,
        label: 'Atenção'
      };
    }
    
    return { 
      status: 'good', 
      color: 'bg-green-100 text-green-700 border-green-300', 
      icon: CheckCircle,
      label: 'Dentro da Meta'
    };
  };

  const calculateDeviation = (current, target) => {
    if (!current || !target) return null;
    return ((current - target) / target) * 100;
  };

  const calculateProgress = (current, target, min = 0) => {
    if (!current || !target) return 0;
    
    // Normalizar para progressão de 0 a 100%
    const range = target - min;
    const progress = ((current - min) / range) * 100;
    
    return Math.max(0, Math.min(100, progress));
  };

  const groupKPIsByCategory = () => {
    return kpis.reduce((groups, kpi) => {
      const category = resolveKPICategory(kpi.category) || DEFAULT_KPI_CATEGORY;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(kpi);
      return groups;
    }, {});
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">KPIs de Performance</h2>
          <div className="h-10 w-24 bg-gray-200 animate-pulse rounded"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 animate-pulse rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 animate-pulse rounded w-1/2"></div>
                  <div className="h-2 bg-gray-200 animate-pulse rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (kpis.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum KPI configurado</h3>
            <p className="text-gray-600">
              Os KPIs aparecerão aqui quando forem configurados pela sua agência
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const groupedKPIs = groupKPIsByCategory();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">KPIs de Performance</h2>
          <p className="text-gray-600">Acompanhe seus indicadores de marketing</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* KPIs por Categoria */}
      {Object.entries(groupedKPIs).map(([categoryKey, categoryKPIs]) => {
        const categoryConfig = KPI_CATEGORIES[categoryKey] || KPI_CATEGORIES[DEFAULT_KPI_CATEGORY];
        const CategoryIcon = categoryConfig.icon;

        return (
          <div key={categoryKey} className="space-y-4">
            {/* Category Header */}
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded ${categoryConfig.color}`}>
                <CategoryIcon className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{categoryConfig.label}</h3>
              <Badge variant="secondary" className="ml-auto">
                {categoryKPIs.length} KPI{categoryKPIs.length !== 1 ? 's' : ''}
              </Badge>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryKPIs.map((kpi) => {
                const status = getKPIStatus(kpi);
                const deviation = calculateDeviation(kpi.current_value, kpi.target_value);
                const progress = calculateProgress(
                  kpi.current_value, 
                  kpi.target_value, 
                  kpi.min_acceptable || 0
                );
                const StatusIcon = status.icon;

                return (
                  <Card key={kpi.id} className={`border-l-4 ${status.color.replace('bg-', 'border-').replace('text-', '').replace('-100', '-500').replace('-700', '')}`}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-sm font-medium text-gray-900">
                          {kpi.name}
                        </CardTitle>
                        <Badge className={status.color} variant="outline">
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status.label}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        {/* Valores */}
                        <div>
                          <div className="flex justify-between items-end">
                            <div>
                              <div className="text-2xl font-bold text-gray-900">
                                {formatKPIValue(kpi.current_value, kpi.unit)}
                              </div>
                              <div className="text-sm text-gray-500">
                                Atual
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-semibold text-gray-700">
                                {formatKPIValue(kpi.target_value, kpi.unit)}
                              </div>
                              <div className="text-sm text-gray-500">
                                Meta
                              </div>
                            </div>
                          </div>

                          {/* Desvio */}
                          {deviation !== null && (
                            <div className={`text-sm font-medium mt-1 ${
                              deviation >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {deviation >= 0 ? '+' : ''}{deviation.toFixed(1)}% da meta
                              {Math.abs(deviation) <= 5 && (
                                <span className="text-gray-500 ml-1">(próximo)</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Progress Bar */}
                        {kpi.current_value && kpi.target_value && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>Progresso</span>
                              <span>{Math.round(progress)}%</span>
                            </div>
                            <Progress 
                              value={progress} 
                              className={`h-2 ${
                                status.status === 'good' ? '[&>div]:bg-green-500' :
                                status.status === 'warning' ? '[&>div]:bg-yellow-500' :
                                '[&>div]:bg-red-500'
                              }`}
                            />
                          </div>
                        )}

                        {/* Metadados */}
                        <div className="flex justify-between text-xs text-gray-500 pt-2 border-t">
                          <span>
                            Frequência: {
                              kpi.frequency === 'daily' ? 'Diário' :
                              kpi.frequency === 'weekly' ? 'Semanal' :
                              kpi.frequency === 'monthly' ? 'Mensal' :
                              kpi.frequency === 'quarterly' ? 'Trimestral' :
                              kpi.frequency === 'yearly' ? 'Anual' :
                              kpi.frequency
                            }
                          </span>
                          {kpi.last_calculated_at && (
                            <span>
                              Atualizado: {new Date(kpi.last_calculated_at).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>

                        {/* Description */}
                        {kpi.description && (
                          <p className="text-xs text-gray-600 pt-1 border-t">
                            {kpi.description}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Summary */}
      <Card className="bg-gray-50">
        <CardContent className="py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">
                {kpis.filter(kpi => getKPIStatus(kpi).status === 'good').length}
              </div>
              <div className="text-sm text-gray-600">Dentro da Meta</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">
                {kpis.filter(kpi => getKPIStatus(kpi).status === 'warning').length}
              </div>
              <div className="text-sm text-gray-600">Atenção</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {kpis.filter(kpi => getKPIStatus(kpi).status === 'critical').length}
              </div>
              <div className="text-sm text-gray-600">Críticos</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-400">
                {kpis.filter(kpi => getKPIStatus(kpi).status === 'no_data').length}
              </div>
              <div className="text-sm text-gray-600">Sem Dados</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}