import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

/**
 * Sistema de Benchmarking
 * Implementa comparação de performance entre clientes e métricas de mercado
 */
export class BenchmarkingSystem extends EventEmitter {
  constructor(options = {}) {
    super();
    this.benchmarks = new Map();
    this.clientData = new Map();
    this.marketData = new Map();
    this.industryStandards = new Map();
    this.comparisons = new Map();
    this.reports = new Map();
    this.updateInterval = options.updateInterval || 86400000; // 24 horas
    
    this.initializeIndustryStandards();
    this.initializeMarketData();
    this.startDataUpdates();
  }

  /**
   * Inicializa padrões da indústria
   */
  initializeIndustryStandards() {
    // Padrões para diferentes setores
    this.industryStandards.set('technology', {
      name: 'Tecnologia',
      kpis: {
        revenue_growth: { min: 10, max: 50, average: 25 },
        profit_margin: { min: 15, max: 35, average: 22 },
        customer_satisfaction: { min: 4.0, max: 5.0, average: 4.3 },
        employee_turnover: { min: 5, max: 20, average: 12 },
        innovation_index: { min: 70, max: 95, average: 82 }
      }
    });

    this.industryStandards.set('consulting', {
      name: 'Consultoria',
      kpis: {
        revenue_growth: { min: 5, max: 30, average: 15 },
        profit_margin: { min: 20, max: 40, average: 28 },
        customer_satisfaction: { min: 4.2, max: 5.0, average: 4.5 },
        employee_turnover: { min: 8, max: 25, average: 15 },
        project_success_rate: { min: 85, max: 98, average: 92 }
      }
    });

    this.industryStandards.set('finance', {
      name: 'Finanças',
      kpis: {
        revenue_growth: { min: 3, max: 20, average: 10 },
        profit_margin: { min: 25, max: 45, average: 32 },
        customer_satisfaction: { min: 3.8, max: 4.8, average: 4.2 },
        employee_turnover: { min: 10, max: 30, average: 18 },
        risk_score: { min: 1, max: 5, average: 2.5 }
      }
    });

    this.industryStandards.set('healthcare', {
      name: 'Saúde',
      kpis: {
        revenue_growth: { min: 2, max: 15, average: 8 },
        profit_margin: { min: 10, max: 25, average: 18 },
        customer_satisfaction: { min: 4.0, max: 5.0, average: 4.4 },
        employee_turnover: { min: 15, max: 35, average: 22 },
        quality_score: { min: 85, max: 98, average: 92 }
      }
    });
  }

  /**
   * Inicializa dados de mercado
   */
  initializeMarketData() {
    // Dados de mercado simulados
    this.marketData.set('global', {
      name: 'Mercado Global',
      size: 50000000000, // 50 bilhões
      growth_rate: 8.5,
      competition_level: 'high',
      trends: [
        { name: 'Digitalização', impact: 'high', trend: 'up' },
        { name: 'Sustentabilidade', impact: 'medium', trend: 'up' },
        { name: 'IA e Automação', impact: 'high', trend: 'up' },
        { name: 'Regulamentação', impact: 'medium', trend: 'up' }
      ]
    });

    this.marketData.set('regional', {
      name: 'Mercado Regional',
      size: 5000000000, // 5 bilhões
      growth_rate: 12.3,
      competition_level: 'medium',
      trends: [
        { name: 'Crescimento Local', impact: 'high', trend: 'up' },
        { name: 'Parcerias Estratégicas', impact: 'medium', trend: 'up' },
        { name: 'Inovação Regional', impact: 'medium', trend: 'up' }
      ]
    });
  }

  /**
   * Inicia atualizações de dados
   */
  startDataUpdates() {
    setInterval(() => {
      this.updateMarketData();
      this.updateBenchmarks();
    }, this.updateInterval);
  }

  /**
   * Atualiza dados de mercado
   */
  updateMarketData() {
    // Simular atualização de dados de mercado
    for (const [key, data] of this.marketData) {
      data.lastUpdated = Date.now();
      data.growth_rate += (Math.random() - 0.5) * 0.5; // Variação de ±0.25%
    }
    
    this.emit('market_data_updated', { timestamp: Date.now() });
  }

  /**
   * Atualiza benchmarks
   */
  updateBenchmarks() {
    // Simular atualização de benchmarks
    for (const [clientId, clientData] of this.clientData) {
      this.calculateClientBenchmark(clientId);
    }
    
    this.emit('benchmarks_updated', { timestamp: Date.now() });
  }

  /**
   * Adiciona dados de cliente
   */
  addClientData(clientId, data) {
    const clientData = {
      id: clientId,
      name: data.name,
      industry: data.industry,
      size: data.size, // 'small', 'medium', 'large'
      kpis: data.kpis,
      metrics: data.metrics,
      addedAt: Date.now(),
      lastUpdated: Date.now()
    };

    this.clientData.set(clientId, clientData);
    this.calculateClientBenchmark(clientId);
    
    this.emit('client_data_added', { clientId, clientData });
  }

  /**
   * Calcula benchmark para cliente
   */
  calculateClientBenchmark(clientId) {
    const clientData = this.clientData.get(clientId);
    if (!clientData) return;

    const industryStandards = this.industryStandards.get(clientData.industry);
    if (!industryStandards) return;

    const benchmark = {
      clientId,
      industry: clientData.industry,
      calculatedAt: Date.now(),
      kpis: {},
      overallScore: 0,
      percentile: 0,
      recommendations: []
    };

    let totalScore = 0;
    let kpiCount = 0;

    // Calcular score para cada KPI
    for (const [kpiName, kpiValue] of Object.entries(clientData.kpis)) {
      const standard = industryStandards.kpis[kpiName];
      if (!standard) continue;

      const score = this.calculateKPIScore(kpiValue, standard);
      const percentile = this.calculatePercentile(kpiValue, standard);
      
      benchmark.kpis[kpiName] = {
        value: kpiValue,
        standard: standard,
        score: score,
        percentile: percentile,
        status: this.getKPIStatus(score),
        recommendation: this.getKPIRecommendation(kpiName, score, standard)
      };

      totalScore += score;
      kpiCount++;
    }

    benchmark.overallScore = kpiCount > 0 ? totalScore / kpiCount : 0;
    benchmark.percentile = this.calculateOverallPercentile(benchmark.overallScore);
    benchmark.recommendations = this.generateRecommendations(benchmark);

    this.benchmarks.set(clientId, benchmark);
    
    this.emit('benchmark_calculated', { clientId, benchmark });
  }

  /**
   * Calcula score de KPI
   */
  calculateKPIScore(value, standard) {
    const { min, max, average } = standard;
    
    if (value >= max) return 100;
    if (value <= min) return 0;
    
    // Score baseado na posição entre min e max
    const position = (value - min) / (max - min);
    return Math.round(position * 100);
  }

  /**
   * Calcula percentil
   */
  calculatePercentile(value, standard) {
    const { min, max, average } = standard;
    
    if (value >= max) return 100;
    if (value <= min) return 0;
    
    // Percentil baseado na distribuição normal
    const zScore = (value - average) / ((max - min) / 4); // Aproximação
    const percentile = 50 + (zScore * 20); // Aproximação
    
    return Math.max(0, Math.min(100, Math.round(percentile)));
  }

  /**
   * Calcula percentil geral
   */
  calculateOverallPercentile(overallScore) {
    // Simulação de percentil geral
    if (overallScore >= 90) return 95;
    if (overallScore >= 80) return 85;
    if (overallScore >= 70) return 75;
    if (overallScore >= 60) return 65;
    if (overallScore >= 50) return 55;
    if (overallScore >= 40) return 45;
    if (overallScore >= 30) return 35;
    if (overallScore >= 20) return 25;
    if (overallScore >= 10) return 15;
    return 5;
  }

  /**
   * Obtém status do KPI
   */
  getKPIStatus(score) {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'average';
    if (score >= 20) return 'below_average';
    return 'poor';
  }

  /**
   * Obtém recomendação para KPI
   */
  getKPIRecommendation(kpiName, score, standard) {
    if (score >= 80) {
      return `Excelente performance em ${kpiName}. Continue mantendo este nível.`;
    }
    
    if (score >= 60) {
      return `Boa performance em ${kpiName}. Considere melhorias para atingir o topo do mercado.`;
    }
    
    if (score >= 40) {
      return `Performance média em ${kpiName}. Implemente estratégias para melhorar.`;
    }
    
    if (score >= 20) {
      return `Performance abaixo da média em ${kpiName}. Ação imediata necessária.`;
    }
    
    return `Performance crítica em ${kpiName}. Revisão completa necessária.`;
  }

  /**
   * Gera recomendações gerais
   */
  generateRecommendations(benchmark) {
    const recommendations = [];
    
    // Recomendações baseadas no score geral
    if (benchmark.overallScore < 50) {
      recommendations.push({
        type: 'critical',
        title: 'Melhoria Urgente Necessária',
        description: 'Score geral abaixo de 50%. Implemente melhorias imediatas.',
        priority: 'high',
        impact: 'high'
      });
    }
    
    // Recomendações baseadas em KPIs específicos
    for (const [kpiName, kpiData] of Object.entries(benchmark.kpis)) {
      if (kpiData.score < 40) {
        recommendations.push({
          type: 'improvement',
          title: `Melhorar ${kpiName}`,
          description: kpiData.recommendation,
          priority: 'medium',
          impact: 'medium',
          kpi: kpiName
        });
      }
    }
    
    // Recomendações baseadas no percentil
    if (benchmark.percentile < 25) {
      recommendations.push({
        type: 'competitive',
        title: 'Posição Competitiva',
        description: 'Você está no quartil inferior. Foque em diferenciação.',
        priority: 'high',
        impact: 'high'
      });
    }
    
    return recommendations;
  }

  /**
   * Compara clientes
   */
  compareClients(clientIds) {
    const comparison = {
      id: uuidv4(),
      clientIds,
      comparedAt: Date.now(),
      results: {}
    };

    // Obter benchmarks dos clientes
    const benchmarks = clientIds.map(id => this.benchmarks.get(id)).filter(Boolean);
    
    if (benchmarks.length < 2) {
      throw new Error('Pelo menos 2 clientes são necessários para comparação');
    }

    // Comparar KPIs
    const allKPIs = new Set();
    benchmarks.forEach(benchmark => {
      Object.keys(benchmark.kpis).forEach(kpi => allKPIs.add(kpi));
    });

    for (const kpi of allKPIs) {
      const kpiComparison = {
        kpi,
        clients: {},
        best: null,
        worst: null,
        average: 0
      };

      let totalScore = 0;
      let clientCount = 0;

      benchmarks.forEach(benchmark => {
        const kpiData = benchmark.kpis[kpi];
        if (kpiData) {
          kpiComparison.clients[benchmark.clientId] = {
            value: kpiData.value,
            score: kpiData.score,
            percentile: kpiData.percentile
          };
          
          totalScore += kpiData.score;
          clientCount++;
        }
      });

      kpiComparison.average = clientCount > 0 ? totalScore / clientCount : 0;
      
      // Encontrar melhor e pior
      const scores = Object.values(kpiComparison.clients).map(c => c.score);
      if (scores.length > 0) {
        const maxScore = Math.max(...scores);
        const minScore = Math.min(...scores);
        
        kpiComparison.best = Object.keys(kpiComparison.clients).find(
          clientId => kpiComparison.clients[clientId].score === maxScore
        );
        kpiComparison.worst = Object.keys(kpiComparison.clients).find(
          clientId => kpiComparison.clients[clientId].score === minScore
        );
      }

      comparison.results[kpi] = kpiComparison;
    }

    this.comparisons.set(comparison.id, comparison);
    
    this.emit('comparison_created', { comparison });
    
    return comparison;
  }

  /**
   * Gera relatório de benchmarking
   */
  generateReport(clientId, options = {}) {
    const benchmark = this.benchmarks.get(clientId);
    if (!benchmark) {
      throw new Error(`Benchmark não encontrado para cliente: ${clientId}`);
    }

    const report = {
      id: uuidv4(),
      clientId,
      generatedAt: Date.now(),
      benchmark,
      summary: this.generateSummary(benchmark),
      insights: this.generateInsights(benchmark),
      recommendations: benchmark.recommendations,
      marketContext: this.getMarketContext(benchmark.industry),
      options
    };

    this.reports.set(report.id, report);
    
    this.emit('report_generated', { report });
    
    return report;
  }

  /**
   * Gera resumo do benchmark
   */
  generateSummary(benchmark) {
    const kpiCount = Object.keys(benchmark.kpis).length;
    const excellentKPIs = Object.values(benchmark.kpis).filter(kpi => kpi.score >= 80).length;
    const goodKPIs = Object.values(benchmark.kpis).filter(kpi => kpi.score >= 60).length;
    const poorKPIs = Object.values(benchmark.kpis).filter(kpi => kpi.score < 40).length;

    return {
      overallScore: benchmark.overallScore,
      percentile: benchmark.percentile,
      kpiCount,
      excellentKPIs,
      goodKPIs,
      poorKPIs,
      performanceLevel: this.getPerformanceLevel(benchmark.overallScore),
      competitivePosition: this.getCompetitivePosition(benchmark.percentile)
    };
  }

  /**
   * Gera insights
   */
  generateInsights(benchmark) {
    const insights = [];
    
    // Insight sobre performance geral
    if (benchmark.overallScore >= 80) {
      insights.push({
        type: 'positive',
        title: 'Performance Excepcional',
        description: `Score geral de ${benchmark.overallScore.toFixed(1)} coloca você no topo do mercado.`,
        impact: 'high'
      });
    } else if (benchmark.overallScore < 40) {
      insights.push({
        type: 'negative',
        title: 'Necessidade de Melhoria',
        description: `Score geral de ${benchmark.overallScore.toFixed(1)} indica necessidade de melhorias significativas.`,
        impact: 'high'
      });
    }

    // Insight sobre percentil
    if (benchmark.percentile >= 75) {
      insights.push({
        type: 'positive',
        title: 'Posição Competitiva Forte',
        description: `Você está no percentil ${benchmark.percentile}, acima da maioria dos concorrentes.`,
        impact: 'medium'
      });
    } else if (benchmark.percentile < 25) {
      insights.push({
        type: 'negative',
        title: 'Posição Competitiva Fraca',
        description: `Percentil ${benchmark.percentile} indica necessidade de melhorias para competir.`,
        impact: 'high'
      });
    }

    return insights;
  }

  /**
   * Obtém contexto de mercado
   */
  getMarketContext(industry) {
    const industryStandards = this.industryStandards.get(industry);
    const marketData = this.marketData.get('global');
    
    return {
      industry: industryStandards?.name || industry,
      marketSize: marketData?.size || 0,
      growthRate: marketData?.growth_rate || 0,
      competitionLevel: marketData?.competition_level || 'unknown',
      trends: marketData?.trends || []
    };
  }

  /**
   * Obtém nível de performance
   */
  getPerformanceLevel(score) {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'very_good';
    if (score >= 70) return 'good';
    if (score >= 60) return 'above_average';
    if (score >= 50) return 'average';
    if (score >= 40) return 'below_average';
    if (score >= 30) return 'poor';
    return 'very_poor';
  }

  /**
   * Obtém posição competitiva
   */
  getCompetitivePosition(percentile) {
    if (percentile >= 90) return 'market_leader';
    if (percentile >= 75) return 'strong_competitor';
    if (percentile >= 50) return 'average_competitor';
    if (percentile >= 25) return 'weak_competitor';
    return 'struggling_competitor';
  }

  /**
   * Obtém benchmark de cliente
   */
  getClientBenchmark(clientId) {
    return this.benchmarks.get(clientId);
  }

  /**
   * Obtém todos os benchmarks
   */
  getAllBenchmarks() {
    return Array.from(this.benchmarks.values());
  }

  /**
   * Obtém comparação
   */
  getComparison(comparisonId) {
    return this.comparisons.get(comparisonId);
  }

  /**
   * Obtém relatório
   */
  getReport(reportId) {
    return this.reports.get(reportId);
  }

  /**
   * Obtém estatísticas do sistema
   */
  getStats() {
    return {
      totalClients: this.clientData.size,
      totalBenchmarks: this.benchmarks.size,
      totalComparisons: this.comparisons.size,
      totalReports: this.reports.size,
      industries: Array.from(this.industryStandards.keys()),
      lastUpdate: Date.now()
    };
  }
}

// Instância singleton
export const benchmarkingSystem = new BenchmarkingSystem({
  updateInterval: 86400000 // 24 horas
});

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.benchmarkingSystem = benchmarkingSystem;
}

