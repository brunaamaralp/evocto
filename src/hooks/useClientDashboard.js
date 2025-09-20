import { useState, useCallback, useEffect } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { toast } from 'sonner';
import { mockClientDashboardAPI } from '@/api/mockAPIs';

/**
 * Hook para gerenciamento do dashboard financeiro do cliente
 */
export function useClientDashboard() {
  const { user } = useSession();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('3m');

  /**
   * Carrega dados do dashboard
   */
  const loadDashboardData = useCallback(async (clientId, serviceId, period = '3m') => {
    setLoading(true);
    setError(null);

    try {
      // Validar permissões
      if (user?.role !== 'client' || user?.clientId !== clientId) {
        throw new Error('Acesso negado: você não tem permissão para visualizar este dashboard');
      }

      // Usar API mock por enquanto
      const data = await mockClientDashboardAPI.getDashboardData(clientId, serviceId, period);
      
      // Validar dados recebidos
      if (!data.cliente || !data.servico || !data.kpis) {
        throw new Error('Dados do dashboard inválidos');
      }

      setDashboardData(data);
      setLastUpdated(new Date());
      
      return data;
    } catch (err) {
      const errorMessage = err.message || 'Erro ao carregar dados do dashboard';
      setError(errorMessage);
      console.error('Erro ao carregar dashboard:', err);
      
      // Em caso de erro, usar dados mock para demonstração
      const mockData = generateMockDashboardData(clientId, serviceId, period);
      setDashboardData(mockData);
      setLastUpdated(new Date());
      
      toast.warning('Usando dados de demonstração. Conecte-se à internet para dados em tempo real.');
      return mockData;
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Atualiza período do dashboard
   */
  const updatePeriod = useCallback(async (clientId, serviceId, newPeriod) => {
    setSelectedPeriod(newPeriod);
    await loadDashboardData(clientId, serviceId, newPeriod);
  }, [loadDashboardData]);

  /**
   * Exporta dashboard para PDF
   */
  const exportToPDF = useCallback(async () => {
    try {
      // Implementar exportação PDF - bibliotecas não instaladas
      // const { jsPDF } = await import('jspdf');
      // const { html2canvas } = await import('html2canvas');
      
      // const dashboardElement = document.getElementById('client-dashboard');
      // if (!dashboardElement) {
      //   throw new Error('Elemento do dashboard não encontrado');
      // }
      
      // const canvas = await html2canvas(dashboardElement);
      // const imgData = canvas.toDataURL('image/png');
      
      // const pdf = new jsPDF();
      // pdf.addImage(imgData, 'PNG', 0, 0);
      // pdf.save('dashboard-cliente.pdf');
      
      throw new Error('Exportação PDF não implementada - bibliotecas não instaladas');
    } catch (err) {
      console.error('Erro ao exportar PDF:', err);
      toast.error('Erro ao exportar PDF. Tente novamente.');
    }
  }, [dashboardData]);

  /**
   * Formata valores monetários
   */
  const formatCurrency = useCallback((value, unit = 'BRL') => {
    if (value === null || value === undefined) return 'N/A';
    
    if (unit === 'BRL') {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    }
    
    return new Intl.NumberFormat('pt-BR').format(value);
  }, []);

  /**
   * Formata percentuais
   */
  const formatPercentage = useCallback((value, decimals = 1) => {
    if (value === null || value === undefined) return 'N/A';
    return `${value.toFixed(decimals)}%`;
  }, []);

  /**
   * Calcula variação percentual
   */
  const calculateVariation = useCallback((current, previous) => {
    if (!current || !previous || previous === 0) return null;
    return ((current - previous) / previous) * 100;
  }, []);

  /**
   * Determina status do KPI baseado na meta
   */
  const getKPIStatus = useCallback((value, target) => {
    if (!target) return 'neutral';
    
    const percentage = (value / target) * 100;
    
    if (percentage >= 95) return 'success';
    if (percentage >= 80) return 'warning';
    return 'danger';
  }, []);

  /**
   * Obtém cor do status
   */
  const getStatusColor = useCallback((status) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'danger': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  }, []);

  /**
   * Obtém ícone de tendência
   */
  const getTrendIcon = useCallback((variation) => {
    if (variation === null) return null;
    return variation > 0 ? '↗️' : variation < 0 ? '↘️' : '→';
  }, []);

  /**
   * Obtém cor da tendência
   */
  const getTrendColor = useCallback((variation) => {
    if (variation === null) return 'text-gray-500';
    return variation > 0 ? 'text-green-600' : variation < 0 ? 'text-red-600' : 'text-gray-500';
  }, []);

  return {
    dashboardData,
    loading,
    error,
    lastUpdated,
    selectedPeriod,
    loadDashboardData,
    updatePeriod,
    exportToPDF,
    formatCurrency,
    formatPercentage,
    calculateVariation,
    getKPIStatus,
    getStatusColor,
    getTrendIcon,
    getTrendColor
  };
}

/**
 * Gera dados mock para demonstração
 */
function generateMockDashboardData(clientId, serviceId, period) {
  const serviceTypes = {
    'diagnostico_avulso': {
      name: 'Diagnóstico Financeiro Avulso',
      kpis: [
        { key: 'receita_mensal', label: 'Receita mensal', unit: 'BRL', value: 128000, target: null, visible: true },
        { key: 'margem_percent', label: 'Margem (%)', unit: '%', value: 15.2, target: 18.0, visible: true },
        { key: 'fluxo_saldo', label: 'Fluxo de caixa (saldo)', unit: 'BRL', value: 24500, target: null, visible: true },
        { key: 'endividamento_total', label: 'Endividamento total', unit: 'BRL', value: 85000, target: 100000, visible: true }
      ]
    },
    'mentoria_margem': {
      name: 'Mentoria em Aumento de Margem',
      kpis: [
        { key: 'margem_percent', label: 'Margem (%)', unit: '%', value: 15.2, target: 18.0, visible: true },
        { key: 'receita_mensal', label: 'Receita mensal', unit: 'BRL', value: 128000, target: null, visible: true },
        { key: 'custos_variaveis', label: 'Custos variáveis', unit: 'BRL', value: 45000, target: 40000, visible: true },
        { key: 'inadimplencia_percent', label: 'Inadimplência (%)', unit: '%', value: 11.0, target: 8.0, visible: true }
      ]
    },
    'gestao_360': {
      name: 'Gestão Financeira 360',
      kpis: [
        { key: 'fluxo_saldo', label: 'Fluxo de caixa (saldo)', unit: 'BRL', value: 24500, target: null, visible: true },
        { key: 'inadimplencia_percent', label: 'Inadimplência (%)', unit: '%', value: 11.0, target: 8.0, visible: true },
        { key: 'ciclo_caixa_dias', label: 'Ciclo de caixa (dias)', unit: 'dias', value: 45, target: 30, visible: true },
        { key: 'giro_estoque', label: 'Giro de estoque', unit: 'vezes', value: 6.2, target: 8.0, visible: true }
      ]
    }
  };

  const serviceType = serviceTypes['mentoria_margem']; // Default para demonstração
  
  return {
    cliente: { 
      id: clientId, 
      nome: 'Oficina Bom Torque' 
    },
    servico: {
      id: serviceId,
      tipo: 'mentoria_margem',
      nome: serviceType.name,
      template_version: 2
    },
    kpis: serviceType.kpis,
    series: {
      margem_percent: [
        { period: '2025-05', value: 12.1 },
        { period: '2025-06', value: 13.4 },
        { period: '2025-07', value: 14.6 },
        { period: '2025-08', value: 14.9 },
        { period: '2025-09', value: 15.2 }
      ],
      receita_mensal: [
        { period: '2025-05', value: 98000 },
        { period: '2025-06', value: 110000 },
        { period: '2025-07', value: 120500 },
        { period: '2025-08', value: 123000 },
        { period: '2025-09', value: 128000 }
      ]
    },
    insights: [
      'Sua margem subiu +0,3 pp no mês e está 2,8 pp abaixo da meta (18%).',
      'Inadimplência acima do alvo: priorize cobrança e revisão de crédito.',
      'Receita cresceu 4,1% no período - mantenha o foco na qualidade.'
    ],
    metas: [
      { 
        key: 'margem_percent', 
        label: 'Margem alvo', 
        target: 18.0, 
        current: 15.2, 
        unit: '%', 
        progress: 0.84 
      },
      { 
        key: 'inadimplencia_percent', 
        label: 'Inadimplência alvo', 
        target: 8.0, 
        current: 11.0, 
        unit: '%', 
        progress: 0.73 
      }
    ],
    lastUpdated: new Date().toISOString()
  };
}
