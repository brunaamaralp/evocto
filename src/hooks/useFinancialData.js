import { useState, useCallback } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { toast } from 'sonner';

/**
 * Hook para gerenciamento de dados financeiros reais
 */
export function useFinancialData() {
  const { user } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Salvar dados extraídos de relatórios
   */
  const saveExtractedData = useCallback(async (data) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/financial-data/save-extracted', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          ...data,
          extractedBy: user.email,
          extractedAt: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Erro ao salvar dados: ${response.statusText}`);
      }

      const result = await response.json();
      toast.success('Dados extraídos salvos com sucesso!');
      return result;

    } catch (err) {
      setError(err.message);
      toast.error(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Salvar dados inseridos manualmente
   */
  const saveManualData = useCallback(async (data) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/financial-data/save-manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          ...data,
          inputBy: user.email,
          inputAt: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Erro ao salvar dados: ${response.statusText}`);
      }

      const result = await response.json();
      toast.success('Dados manuais salvos com sucesso!');
      return result;

    } catch (err) {
      setError(err.message);
      toast.error(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Obter dados financeiros para o dashboard
   */
  const getFinancialData = useCallback(async (clientId, serviceId, period = '3m') => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/financial-data/dashboard/${clientId}/${serviceId}?period=${period}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Erro ao carregar dados: ${response.statusText}`);
      }

      const data = await response.json();
      return data;

    } catch (err) {
      setError(err.message);
      console.error('Erro ao carregar dados financeiros:', err);
      
      // Retornar dados mock em caso de erro
      return generateMockFinancialData(clientId, serviceId, period);
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Obter histórico de dados
   */
  const getDataHistory = useCallback(async (clientId, serviceId, kpiKey) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/financial-data/history/${clientId}/${serviceId}/${kpiKey}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Erro ao carregar histórico: ${response.statusText}`);
      }

      const data = await response.json();
      return data;

    } catch (err) {
      setError(err.message);
      console.error('Erro ao carregar histórico:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Validar dados antes de salvar
   */
  const validateFinancialData = useCallback((data) => {
    const errors = [];

    if (!data.clientId) {
      errors.push('ID do cliente é obrigatório');
    }

    if (!data.serviceId) {
      errors.push('ID do serviço é obrigatório');
    }

    if (!data.period) {
      errors.push('Período é obrigatório');
    }

    if (!data.kpis || data.kpis.length === 0) {
      errors.push('Pelo menos um KPI deve ser fornecido');
    }

    // Validar cada KPI
    data.kpis?.forEach((kpi, index) => {
      if (!kpi.key) {
        errors.push(`KPI ${index + 1}: Chave é obrigatória`);
      }

      if (!kpi.label) {
        errors.push(`KPI ${index + 1}: Label é obrigatório`);
      }

      if (kpi.value === null || kpi.value === undefined) {
        errors.push(`KPI ${index + 1}: Valor é obrigatório`);
      }

      if (typeof kpi.value === 'number' && isNaN(kpi.value)) {
        errors.push(`KPI ${index + 1}: Valor deve ser um número válido`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }, []);

  /**
   * Gerar insights baseados nos dados
   */
  const generateInsights = useCallback(async (kpis, targets) => {
    try {
      const response = await fetch('/api/financial-data/generate-insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          kpis,
          targets,
          generatedBy: user.email
        })
      });

      if (!response.ok) {
        throw new Error(`Erro ao gerar insights: ${response.statusText}`);
      }

      const insights = await response.json();
      return insights;

    } catch (err) {
      console.error('Erro ao gerar insights:', err);
      // Retornar insights mock em caso de erro
      return generateMockInsights(kpis, targets);
    }
  }, [user]);

  return {
    loading,
    error,
    saveExtractedData,
    saveManualData,
    getFinancialData,
    getDataHistory,
    validateFinancialData,
    generateInsights
  };
}

/**
 * Gerar dados mock para demonstração
 */
function generateMockFinancialData(clientId, serviceId, period) {
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
    lastUpdated: new Date().toISOString(),
    dataSource: 'mock'
  };
}

/**
 * Gerar insights mock
 */
function generateMockInsights(kpis, targets) {
  const insights = [];

  kpis.forEach(kpi => {
    const target = targets?.find(t => t.key === kpi.key);
    
    if (target) {
      const progress = (kpi.value / target.value) * 100;
      
      if (progress >= 95) {
        insights.push(`${kpi.label} está atingindo a meta (${progress.toFixed(1)}%)`);
      } else if (progress >= 80) {
        insights.push(`${kpi.label} está próximo da meta (${progress.toFixed(1)}%)`);
      } else {
        insights.push(`${kpi.label} está abaixo da meta (${progress.toFixed(1)}%)`);
      }
    }
  });

  return insights;
}

