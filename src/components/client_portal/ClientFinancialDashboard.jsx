import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Building, 
  TrendingUp, 
  Download, 
  RefreshCw, 
  Clock,
  AlertCircle,
  CheckCircle,
  Target,
  BarChart3
} from 'lucide-react';
import { useClientDashboard } from '@/hooks/useClientDashboard';
import { useFinancialData } from '@/hooks/useFinancialData';
import KPICard from './KPICard';
import FinancialCharts from './FinancialCharts';
import GoalsSection from './GoalsSection';
import InsightsSection from './InsightsSection';
import LoadingSkeleton from './LoadingSkeleton';
import DataSourceManager from './DataSourceManager';

/**
 * Dashboard de performance principal para clientes
 */
export default function ClientFinancialDashboard({ clientId, serviceId }) {
  const {
    dashboardData,
    loading,
    error,
    lastUpdated,
    selectedPeriod,
    loadDashboardData,
    updatePeriod,
    exportToPDF,
    formatCurrency,
    formatPercentage
  } = useClientDashboard();

  const { getFinancialData } = useFinancialData();
  const [showDataSourceManager, setShowDataSourceManager] = useState(false);

  useEffect(() => {
    if (clientId && serviceId) {
      loadDashboardData(clientId, serviceId, selectedPeriod);
    }
  }, [clientId, serviceId, loadDashboardData, selectedPeriod]);

  const handlePeriodChange = (newPeriod) => {
    updatePeriod(clientId, serviceId, newPeriod);
  };

  const handleDataUpdated = async (newData) => {
    // Recarregar dados do dashboard após atualização
    await loadDashboardData(clientId, serviceId, selectedPeriod);
    setShowDataSourceManager(false);
  };

  if (loading && !dashboardData) {
    return <LoadingSkeleton />;
  }

  if (error && !dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-red-900 mb-2">Erro ao carregar dashboard</h2>
              <p className="text-red-700 mb-4">{error}</p>
              <Button onClick={handleRefresh} variant="outline" className="border-red-300 text-red-700">
                <RefreshCw className="w-4 h-4 mr-2" />
                Tentar Novamente
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return null;
  }

  const visibleKPIs = dashboardData.kpis.filter(kpi => kpi.visible);
  const mainKPIs = visibleKPIs.slice(0, 4);

  return (
    <div className="min-h-screen bg-gray-50" id="client-dashboard">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {dashboardData.cliente.nome}
                  </h1>
                  <p className="text-gray-600">{dashboardData.servico.nome}</p>
                </div>
              </div>
              
              {/* Status de atualização */}
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                <span>
                  Última atualização: {lastUpdated ? lastUpdated.toLocaleString('pt-BR') : 'N/A'}
                </span>
                <Badge variant="outline" className="text-xs">
                  Dados não são em tempo real
                </Badge>
              </div>
            </div>

            {/* Controles */}
            <div className="flex items-center gap-3">
              <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3m">3 meses</SelectItem>
                  <SelectItem value="6m">6 meses</SelectItem>
                  <SelectItem value="12m">12 meses</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={() => setShowDataSourceManager(true)}
                variant="outline"
                size="sm"
              >
                <Database className="w-4 h-4 mr-2" />
                Inserir Dados
              </Button>

              <Button
                onClick={() => loadDashboardData(clientId, serviceId, selectedPeriod)}
                variant="outline"
                size="sm"
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>

              <Button
                onClick={exportToPDF}
                className="bg-blue-600 hover:bg-blue-700"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar PDF
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Cards de KPIs Principais */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">Visão Geral</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {mainKPIs.map((kpi, index) => (
              <motion.div
                key={kpi.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
              >
                <KPICard 
                  kpi={kpi} 
                  series={dashboardData.series[kpi.key]}
                  formatCurrency={formatCurrency}
                  formatPercentage={formatPercentage}
                />
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Gráficos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">Evolução dos Indicadores</h2>
          </div>
          
          <FinancialCharts 
            series={dashboardData.series}
            kpis={visibleKPIs}
            formatCurrency={formatCurrency}
            formatPercentage={formatPercentage}
          />
        </motion.div>

        {/* Metas */}
        {dashboardData.metas && dashboardData.metas.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-gray-700" />
              <h2 className="text-lg font-semibold text-gray-900">Metas e Objetivos</h2>
            </div>
            
            <GoalsSection 
              metas={dashboardData.metas}
              formatCurrency={formatCurrency}
              formatPercentage={formatPercentage}
            />
          </motion.div>
        )}

        {/* Insights da IA */}
        {dashboardData.insights && dashboardData.insights.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-gray-700" />
              <h2 className="text-lg font-semibold text-gray-900">Insights e Recomendações</h2>
            </div>
            
            <InsightsSection insights={dashboardData.insights} />
          </motion.div>
        )}

        {/* Footer com informações adicionais */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-12 pt-8 border-t border-gray-200"
        >
          <div className="text-center text-sm text-gray-500">
            <p>
              Dashboard de performance gerado automaticamente • 
              Dados atualizados conforme disponibilidade • 
              Para dúvidas, entre em contato com sua agência
            </p>
          </div>
        </motion.div>
      </div>

      {/* Modal de Gerenciamento de Dados */}
      <Dialog open={showDataSourceManager} onOpenChange={setShowDataSourceManager}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">
              Gerenciar Fontes de Dados
            </DialogTitle>
            <DialogDescription>
              Escolha como inserir os dados de marketing e performance no dashboard
            </DialogDescription>
          </DialogHeader>
          
          <DataSourceManager
            clientId={clientId}
            serviceId={serviceId}
            serviceType={dashboardData?.servico?.tipo || 'estrategia_conteudo'}
            onDataUpdated={handleDataUpdated}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
