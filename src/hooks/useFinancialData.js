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

  const serviceType = serviceTypes['mentoria_margem']; // Default
  
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

