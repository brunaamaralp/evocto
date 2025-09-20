/**
 * 🧠 Serviço de Insights Automáticos com IA
 * 
 * Gera insights automáticos baseados em dados do cliente
 */

import { getBestAIProvider } from '@/config/aiConfig';

export class AutomaticInsightsService {
  constructor() {
    this.llm = null;
    this.initializeLLM();
  }

  async initializeLLM() {
    try {
      this.llm = await getBestAIProvider();
      console.log('✅ AutomaticInsightsService inicializado com:', this.llm.constructor.name);
    } catch (error) {
      console.error('❌ Erro ao inicializar AutomaticInsightsService:', error);
      const { MockLLM } = await import('@/api/integrations/LocalLLM');
      this.llm = new MockLLM();
    }
  }

  /**
   * Gera insights automáticos baseados em dados do cliente
   */
  async generateInsights(clientData, serviceType) {
    try {
      console.log('[AutomaticInsights] Gerando insights para cliente:', clientData.id);

      // Preparar dados para análise
      const analysisData = this.prepareAnalysisData(clientData, serviceType);
      
      // Gerar insights com IA
      const insights = await this.generateWithAI(analysisData, serviceType);
      
      // Processar e validar insights
      const processedInsights = await this.processInsights(insights, clientData);
      
      console.log(`[AutomaticInsights] ${processedInsights.length} insights gerados`);
      
      return {
        success: true,
        insights: processedInsights,
        metadata: {
          clientId: clientData.id,
          serviceType,
          generatedAt: new Date().toISOString(),
          aiProvider: this.llm.constructor.name
        }
      };

    } catch (error) {
      console.error('[AutomaticInsights] Erro ao gerar insights:', error);
      
      return {
        success: false,
        error: error.message,
        insights: [],
        metadata: {
          clientId: clientData.id,
          serviceType,
          generatedAt: new Date().toISOString(),
          aiProvider: 'error'
        }
      };
    }
  }

  /**
   * Prepara dados para análise
   */
  prepareAnalysisData(clientData, serviceType) {
    return {
      client: {
        id: clientData.id,
        name: clientData.name,
        industry: clientData.industry || 'Não especificado',
        size: clientData.size || 'Não especificado'
      },
      service: {
        type: serviceType,
        startDate: clientData.serviceStartDate,
        duration: clientData.serviceDuration
      },
      kpis: clientData.kpis || [],
      tasks: clientData.tasks || [],
      learnings: clientData.learnings || [],
      briefings: clientData.briefings || []
    };
  }

  /**
   * Gera insights com IA
   */
  async generateWithAI(analysisData, serviceType) {
    const prompt = this.buildInsightsPrompt(analysisData, serviceType);
    
    const insights = await this.llm.generateJSON(prompt, this.getInsightsSchema());
    
    return insights;
  }

  /**
   * Constrói prompt para geração de insights
   */
  buildInsightsPrompt(analysisData, serviceType) {
    return `Você é um consultor especialista em ${serviceType}. Analise os dados abaixo e gere insights acionáveis para o cliente.

DADOS DO CLIENTE:
${JSON.stringify(analysisData, null, 2)}

TIPO DE SERVIÇO: ${serviceType}

Gere insights que sejam:
1. Específicos e acionáveis
2. Baseados em dados concretos
3. Orientados a resultados
4. Práticos e implementáveis
5. Alinhados com os objetivos do serviço

Para cada insight, forneça:
- Título claro e conciso
- Descrição detalhada
- Impacto esperado
- Prioridade (alta/média/baixa)
- Prazo sugerido
- Dificuldade de implementação

Retorne insights estruturados em JSON seguindo o schema fornecido.`;
  }

  /**
   * Schema para insights
   */
  getInsightsSchema() {
    return {
      type: 'object',
      properties: {
        insights: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string', minLength: 10, maxLength: 100 },
              description: { type: 'string', minLength: 50, maxLength: 500 },
              impact: { type: 'string', enum: ['high', 'medium', 'low'] },
              priority: { type: 'string', enum: ['high', 'medium', 'low'] },
              timeframe: { type: 'string', enum: ['immediate', 'short', 'medium', 'long'] },
              difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
              category: { type: 'string', enum: ['performance', 'process', 'strategy', 'risk'] },
              kpiAffected: { type: 'array', items: { type: 'string' } },
              confidence: { type: 'number', minimum: 0, maximum: 100 }
            },
            required: ['title', 'description', 'impact', 'priority']
          }
        },
        summary: {
          type: 'object',
          properties: {
            overallPerformance: { type: 'string' },
            keyOpportunities: { type: 'array', items: { type: 'string' } },
            mainRisks: { type: 'array', items: { type: 'string' } },
            recommendedActions: { type: 'array', items: { type: 'string' } }
          }
        }
      },
      required: ['insights']
    };
  }

  /**
   * Processa insights gerados
   */
  async processInsights(insights, clientData) {
    const processedInsights = [];
    
    if (insights.insights && Array.isArray(insights.insights)) {
      for (const insight of insights.insights) {
        const processedInsight = await this.processInsight(insight, clientData);
        if (processedInsight) {
          processedInsights.push(processedInsight);
        }
      }
    }

    return processedInsights;
  }

  /**
   * Processa insight individual
   */
  async processInsight(insight, clientData) {
    try {
      return {
        id: this.generateInsightId(),
        title: insight.title,
        description: insight.description,
        impact: insight.impact || 'medium',
        priority: insight.priority || 'medium',
        timeframe: insight.timeframe || 'medium',
        difficulty: insight.difficulty || 'medium',
        category: insight.category || 'process',
        kpiAffected: insight.kpiAffected || [],
        confidence: insight.confidence || 80,
        
        // Metadados
        clientId: clientData.id,
        generatedAt: new Date().toISOString(),
        aiGenerated: true,
        aiProvider: this.llm.constructor.name,
        
        // Status
        status: 'new',
        applied: false,
        appliedAt: null,
        appliedBy: null
      };
    } catch (error) {
      console.warn('[AutomaticInsights] Erro ao processar insight:', error);
      return null;
    }
  }

  /**
   * Gera ID único para insight
   */
  generateInsightId() {
    return `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Analisa performance e detecta anomalias
   */
  async analyzePerformance(clientData, serviceType) {
    try {
      console.log('[AutomaticInsights] Analisando performance do cliente:', clientData.id);

      const analysisData = this.prepareAnalysisData(clientData, serviceType);
      const prompt = this.buildPerformanceAnalysisPrompt(analysisData, serviceType);
      
      const analysis = await this.llm.generateJSON(prompt, this.getPerformanceAnalysisSchema());
      
      return {
        success: true,
        analysis,
        metadata: {
          clientId: clientData.id,
          serviceType,
          analyzedAt: new Date().toISOString(),
          aiProvider: this.llm.constructor.name
        }
      };

    } catch (error) {
      console.error('[AutomaticInsights] Erro ao analisar performance:', error);
      
      return {
        success: false,
        error: error.message,
        analysis: null
      };
    }
  }

  /**
   * Constrói prompt para análise de performance
   */
  buildPerformanceAnalysisPrompt(analysisData, serviceType) {
    return `Analise a performance do cliente abaixo e identifique:

1. Tendências nos KPIs
2. Anomalias ou padrões incomuns
3. Oportunidades de melhoria
4. Riscos potenciais
5. Comparação com benchmarks do setor

DADOS:
${JSON.stringify(analysisData, null, 2)}

TIPO DE SERVIÇO: ${serviceType}

Forneça uma análise estruturada em JSON.`;
  }

  /**
   * Schema para análise de performance
   */
  getPerformanceAnalysisSchema() {
    return {
      type: 'object',
      properties: {
        trends: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              kpi: { type: 'string' },
              trend: { type: 'string', enum: ['up', 'down', 'stable', 'volatile'] },
              description: { type: 'string' },
              significance: { type: 'string', enum: ['high', 'medium', 'low'] }
            }
          }
        },
        anomalies: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              description: { type: 'string' },
              severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
              recommendation: { type: 'string' }
            }
          }
        },
        opportunities: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              area: { type: 'string' },
              description: { type: 'string' },
              potentialImpact: { type: 'string', enum: ['high', 'medium', 'low'] },
              effort: { type: 'string', enum: ['low', 'medium', 'high'] }
            }
          }
        },
        risks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              risk: { type: 'string' },
              description: { type: 'string' },
              probability: { type: 'string', enum: ['high', 'medium', 'low'] },
              impact: { type: 'string', enum: ['high', 'medium', 'low'] },
              mitigation: { type: 'string' }
            }
          }
        },
        overallScore: {
          type: 'number',
          minimum: 0,
          maximum: 100
        }
      }
    };
  }

  /**
   * Gera recomendações personalizadas
   */
  async generateRecommendations(clientData, serviceType) {
    try {
      console.log('[AutomaticInsights] Gerando recomendações para cliente:', clientData.id);

      const analysisData = this.prepareAnalysisData(clientData, serviceType);
      const prompt = this.buildRecommendationsPrompt(analysisData, serviceType);
      
      const recommendations = await this.llm.generateJSON(prompt, this.getRecommendationsSchema());
      
      return {
        success: true,
        recommendations,
        metadata: {
          clientId: clientData.id,
          serviceType,
          generatedAt: new Date().toISOString(),
          aiProvider: this.llm.constructor.name
        }
      };

    } catch (error) {
      console.error('[AutomaticInsights] Erro ao gerar recomendações:', error);
      
      return {
        success: false,
        error: error.message,
        recommendations: null
      };
    }
  }

  /**
   * Constrói prompt para recomendações
   */
  buildRecommendationsPrompt(analysisData, serviceType) {
    return `Com base nos dados abaixo, gere recomendações específicas e acionáveis para o cliente:

DADOS:
${JSON.stringify(analysisData, null, 2)}

TIPO DE SERVIÇO: ${serviceType}

Para cada recomendação, forneça:
- Título claro
- Descrição detalhada
- Justificativa baseada em dados
- Impacto esperado
- Esforço necessário
- Prazo de implementação
- Recursos necessários

Retorne recomendações estruturadas em JSON.`;
  }

  /**
   * Schema para recomendações
   */
  getRecommendationsSchema() {
    return {
      type: 'object',
      properties: {
        recommendations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              justification: { type: 'string' },
              expectedImpact: { type: 'string', enum: ['high', 'medium', 'low'] },
              effort: { type: 'string', enum: ['low', 'medium', 'high'] },
              timeframe: { type: 'string', enum: ['immediate', 'short', 'medium', 'long'] },
              resources: { type: 'array', items: { type: 'string' } },
              priority: { type: 'string', enum: ['high', 'medium', 'low'] }
            },
            required: ['title', 'description', 'justification']
          }
        }
      },
      required: ['recommendations']
    };
  }
}

// Instância singleton
export const automaticInsightsService = new AutomaticInsightsService();
