import { useState, useCallback, useEffect } from 'react';
import { LearningEntry, Client, Service, Task } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';

/**
 * Hook para analytics e relatórios de aprendizados
 */
export function useLearningAnalytics() {
  const { agency } = useSession();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Carrega analytics gerais
   */
  const loadAnalytics = useCallback(async (period = '30d') => {
    setLoading(true);
    setError(null);

    try {
      const cutoffDate = getCutoffDate(period);
      
      // Buscar todos os aprendizados
      const allLearnings = await LearningEntry.filter({ agencyId: agency.id });
      const recentLearnings = allLearnings.filter(l => 
        new Date(l.created_date) >= cutoffDate
      );

      // Calcular métricas
      const metrics = calculateMetrics(allLearnings, recentLearnings, period);
      
      setAnalytics(metrics);
      return metrics;

    } catch (err) {
      setError(err.message);
      console.error('Erro ao carregar analytics:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [agency]);

  /**
   * Calcula métricas dos aprendizados
   */
  const calculateMetrics = (allLearnings, recentLearnings, period) => {
    const total = allLearnings.length;
    const recent = recentLearnings.length;
    
    // Métricas básicas
    const reviewed = allLearnings.filter(l => l.reviewed).length;
    const shared = allLearnings.filter(l => l.isShared).length;
    const applied = allLearnings.filter(l => 
      l.tags?.includes('applied_to_briefing') || 
      l.tags?.includes('in_current_plan')
    ).length;

    // Métricas por fonte
    const bySource = allLearnings.reduce((acc, learning) => {
      const source = learning.sourceType || 'unknown';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});

    // Métricas por nicho
    const byNiche = allLearnings.reduce((acc, learning) => {
      const niche = learning.niche || 'Não especificado';
      acc[niche] = (acc[niche] || 0) + 1;
      return acc;
    }, {});

    // Métricas por formato
    const byFormat = allLearnings.reduce((acc, learning) => {
      const format = learning.format || 'Não especificado';
      acc[format] = (acc[format] || 0) + 1;
      return acc;
    }, {});

    // Métricas por confiança
    const byConfidence = allLearnings.reduce((acc, learning) => {
      const score = learning.confidence_score || 0;
      let level = 'Baixa';
      if (score >= 80) level = 'Alta';
      else if (score >= 60) level = 'Média';
      
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {});

    // Métricas de aplicação
    const appliedToBriefings = allLearnings.filter(l => 
      l.tags?.includes('applied_to_briefing')
    ).length;
    
    const appliedToCycles = allLearnings.filter(l => 
      l.tags?.includes('in_current_plan')
    ).length;

    // Métricas de vinculação
    const linkedToClients = allLearnings.filter(l => 
      l.metadata?.linkedClients?.length > 0
    ).length;
    
    const linkedToServices = allLearnings.filter(l => 
      l.metadata?.linkedServices?.length > 0
    ).length;
    
    const linkedToTasks = allLearnings.filter(l => 
      l.metadata?.linkedTasks?.length > 0
    ).length;

    // Tendências
    const trends = calculateTrends(allLearnings, period);

    return {
      overview: {
        total,
        recent,
        reviewed,
        shared,
        applied,
        reviewRate: total > 0 ? (reviewed / total) * 100 : 0,
        shareRate: total > 0 ? (shared / total) * 100 : 0,
        applicationRate: total > 0 ? (applied / total) * 100 : 0
      },
      bySource,
      byNiche,
      byFormat,
      byConfidence,
      applications: {
        appliedToBriefings,
        appliedToCycles,
        totalApplications: appliedToBriefings + appliedToCycles
      },
      linkages: {
        linkedToClients,
        linkedToServices,
        linkedToTasks,
        totalLinked: linkedToClients + linkedToServices + linkedToTasks
      },
      trends,
      period
    };
  };

  /**
   * Calcula tendências
   */
  const calculateTrends = (learnings, period) => {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const trends = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));
      
      const dayLearnings = learnings.filter(l => {
        const createdDate = new Date(l.created_date);
        return createdDate >= dayStart && createdDate <= dayEnd;
      });
      
      trends.push({
        date: dayStart.toISOString().split('T')[0],
        count: dayLearnings.length,
        reviewed: dayLearnings.filter(l => l.reviewed).length,
        shared: dayLearnings.filter(l => l.isShared).length
      });
    }
    
    return trends;
  };

  /**
   * Obtém data de corte baseada no período
   */
  const getCutoffDate = (period) => {
    const now = new Date();
    switch (period) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  };

  /**
   * Gera relatório de aprendizados
   */
  const generateReport = useCallback(async (period = '30d', format = 'json') => {
    try {
      const analytics = await loadAnalytics(period);
      if (!analytics) return null;

      const report = {
        generatedAt: new Date().toISOString(),
        period,
        agency: agency.name,
        ...analytics
      };

      if (format === 'csv') {
        return convertToCSV(report);
      }

      return report;
    } catch (err) {
      console.error('Erro ao gerar relatório:', err);
      return null;
    }
  }, [loadAnalytics, agency]);

  /**
   * Converte relatório para CSV
   */
  const convertToCSV = (report) => {
    const csv = [];
    
    // Header
    csv.push('Métrica,Valor,Período');
    
    // Overview
    csv.push(`Total de Aprendizados,${report.overview.total},${report.period}`);
    csv.push(`Aprendizados Recentes,${report.overview.recent},${report.period}`);
    csv.push(`Taxa de Revisão,${report.overview.reviewRate.toFixed(1)}%,${report.period}`);
    csv.push(`Taxa de Compartilhamento,${report.overview.shareRate.toFixed(1)}%,${report.period}`);
    csv.push(`Taxa de Aplicação,${report.overview.applicationRate.toFixed(1)}%,${report.period}`);
    
    // Por fonte
    csv.push('--- Por Fonte ---');
    Object.entries(report.bySource).forEach(([source, count]) => {
      csv.push(`${source},${count},${report.period}`);
    });
    
    // Por nicho
    csv.push('--- Por Nicho ---');
    Object.entries(report.byNiche).forEach(([niche, count]) => {
      csv.push(`${niche},${count},${report.period}`);
    });
    
    return csv.join('\n');
  };

  /**
   * Exporta relatório
   */
  const exportReport = useCallback(async (period = '30d', format = 'json') => {
    try {
      const report = await generateReport(period, format);
      if (!report) return;

      const filename = `aprendizados_report_${period}_${new Date().toISOString().split('T')[0]}.${format}`;
      
      if (format === 'json') {
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      } else if (format === 'csv') {
        const blob = new Blob([report], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Erro ao exportar relatório:', err);
    }
  }, [generateReport]);

  return {
    analytics,
    loading,
    error,
    loadAnalytics,
    generateReport,
    exportReport
  };
}

