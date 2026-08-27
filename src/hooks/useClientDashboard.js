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
  const diagnosticoKPIs = [
    { key: 'clareza_posicionamento', label: 'Clareza de Posicionamento', unit: 'score', value: 7.2, target: 8.0, visible: true },
    { key: 'consistencia_canais', label: 'Consistência entre Canais', unit: '%', value: 68, target: 80, visible: true },
    { key: 'engajamento_medio', label: 'Engajamento Médio', unit: '%', value: 3.4, target: 4.0, visible: true },
    { key: 'share_of_voice', label: 'Share of Voice', unit: '%', value: 14, target: 20, visible: true }
  ];

  const conteudoKPIs = [
    { key: 'taxa_publicacao', label: 'Taxa de Publicação no Prazo', unit: '%', value: 82, target: 90, visible: true },
    { key: 'engajamento_medio', label: 'Engajamento Médio', unit: '%', value: 3.8, target: 4.5, visible: true },
    { key: 'leads_qualificados', label: 'Leads Qualificados', unit: 'número', value: 42, target: 50, visible: true },
    { key: 'trafego_organico', label: 'Tráfego Orgânico', unit: 'número', value: 4800, target: 6000, visible: true }
  ];

  const marketing360KPIs = [
    { key: 'roas', label: 'ROAS', unit: 'ratio', value: 2.8, target: 3.5, visible: true },
    { key: 'cac', label: 'CAC', unit: 'BRL', value: 320, target: 250, visible: true },
    { key: 'leads_qualificados', label: 'Leads Qualificados', unit: 'número', value: 58, target: 70, visible: true },
    { key: 'taxa_aprovacao_ciclo', label: 'Taxa de Aprovação no Ciclo', unit: '%', value: 78, target: 85, visible: true }
  ];

  const serviceTypes = {
    diagnostico_comunicacao: { name: 'Diagnóstico de Comunicação e Marca', kpis: diagnosticoKPIs },
    diagnostico_avulso: { name: 'Diagnóstico de Comunicação e Marca', kpis: diagnosticoKPIs },
    estrategia_conteudo: { name: 'Estratégia de Conteúdo e Posicionamento', kpis: conteudoKPIs },
    mentoria_margem: { name: 'Estratégia de Conteúdo e Posicionamento', kpis: conteudoKPIs },
    marketing_360: { name: 'Marketing Operacional 360', kpis: marketing360KPIs },
    gestao_360: { name: 'Marketing Operacional 360', kpis: marketing360KPIs }
  };

  const serviceType = serviceTypes['estrategia_conteudo'] || serviceTypes['mentoria_margem'];
  
  return {
    cliente: { 
      id: clientId, 
      nome: 'Oficina Bom Torque' 
    },
    servico: {
      id: serviceId,
      tipo: 'estrategia_conteudo',
      nome: serviceType.name,
      template_version: 2
    },
    kpis: serviceType.kpis,
    series: {
      engajamento_medio: [
        { period: '2025-05', value: 2.8 },
        { period: '2025-06', value: 3.1 },
        { period: '2025-07', value: 3.4 },
        { period: '2025-08', value: 3.6 },
        { period: '2025-09', value: 3.8 }
      ],
      leads_qualificados: [
        { period: '2025-05', value: 28 },
        { period: '2025-06', value: 32 },
        { period: '2025-07', value: 36 },
        { period: '2025-08', value: 39 },
        { period: '2025-09', value: 42 }
      ]
    },
    insights: [
      'Engajamento médio subiu +0,4 pp no mês e está 0,7 pp abaixo da meta (4,5%).',
      'Leads qualificados abaixo do alvo: priorize CTAs e conteúdo de conversão.',
      'Tráfego orgânico cresceu 6,2% no período — mantenha a cadência de publicação.'
    ],
    metas: [
      { 
        key: 'engajamento_medio', 
        label: 'Engajamento alvo', 
        target: 4.5, 
        current: 3.8, 
        unit: '%', 
        progress: 0.84 
      },
      { 
        key: 'leads_qualificados', 
        label: 'Leads qualificados alvo', 
        target: 50, 
        current: 42, 
        unit: 'número', 
        progress: 0.84 
      }
    ],
    lastUpdated: new Date().toISOString()
  };
}
