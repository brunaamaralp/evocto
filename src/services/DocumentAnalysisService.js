/**
 * 📄 Serviço de Análise de Documentos com IA
 * 
 * Analisa documentos financeiros e extrai KPIs automaticamente
 */

import { getBestAIProvider } from '@/config/aiConfig';

export class DocumentAnalysisService {
  constructor() {
    this.llm = null;
    this.supportedFormats = ['pdf', 'docx', 'xlsx', 'csv', 'txt'];
    this.initializeLLM();
  }

  async initializeLLM() {
    try {
      this.llm = await getBestAIProvider();
      console.log('✅ DocumentAnalysisService inicializado com:', this.llm.constructor.name);
    } catch (error) {
      console.error('❌ Erro ao inicializar DocumentAnalysisService:', error);
      const { MockLLM } = await import('@/api/integrations/LocalLLM');
      this.llm = new MockLLM();
    }
  }

  /**
   * Analisa documento e extrai informações financeiras
   */
  async analyzeDocument(file, serviceType) {
    try {
      console.log('[DocumentAnalysis] Analisando documento:', file.name);

      // Validar formato do arquivo
      if (!this.isSupportedFormat(file)) {
        throw new Error(`Formato não suportado: ${file.type}`);
      }

      // Extrair texto do documento
      const extractedText = await this.extractTextFromFile(file);
      
      // Analisar com IA
      const analysis = await this.analyzeWithAI(extractedText, serviceType);
      
      // Processar resultados
      const processedData = await this.processAnalysisResults(analysis, serviceType);
      
      console.log('[DocumentAnalysis] Análise concluída:', processedData);
      
      return {
        success: true,
        data: processedData,
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          serviceType,
          analyzedAt: new Date().toISOString(),
          aiProvider: this.llm.constructor.name
        }
      };

    } catch (error) {
      console.error('[DocumentAnalysis] Erro ao analisar documento:', error);
      
      return {
        success: false,
        error: error.message,
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          serviceType,
          analyzedAt: new Date().toISOString(),
          aiProvider: 'error'
        }
      };
    }
  }

  /**
   * Verifica se o formato do arquivo é suportado
   */
  isSupportedFormat(file) {
    const extension = file.name.split('.').pop().toLowerCase();
    return this.supportedFormats.includes(extension);
  }

  /**
   * Extrai texto do arquivo (simulação - em produção usaria bibliotecas específicas)
   */
  async extractTextFromFile(file) {
    // Simulação de extração de texto
    // Em produção, usaria bibliotecas como:
    // - pdf-parse para PDFs
    // - mammoth para DOCX
    // - xlsx para planilhas
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        // Simular texto extraído
        const mockText = this.generateMockDocumentText(file.name);
        resolve(mockText);
      };
      reader.readAsText(file);
    });
  }

  /**
   * Gera texto mock para demonstração
   */
  generateMockDocumentText(fileName) {
    const mockTexts = {
      'dre.pdf': `
        RELATÓRIO DE PERFORMANCE DE MÍDIA
        Período: Janeiro a Dezembro de 2024
        
        Investimento em mídia: R$ 48.000,00
        Receita atribuída: R$ 156.000,00
        ROAS: 3,25
        
        Impressões: 2.400.000
        Cliques: 72.000
        CTR: 3,0%
        CPA médio: R$ 42,00
      `,
      'balanco.xlsx': `
        DASHBOARD DE MARCA E CANAIS
        Em 31 de Dezembro de 2024
        
        Share of Voice: 18%
        Clareza de Posicionamento (score): 7/10
        Consistência entre Canais: 72%
        
        Canais ativos:
        - Instagram: 24.500 seguidores
        - LinkedIn: 8.200 seguidores
        - Site: 12.000 sessões/mês
        - E-mail: taxa de abertura 27%
      `,
      'fluxo_caixa.csv': `
        FUNIL E DEMANDA
        Período: Janeiro a Dezembro de 2024
        
        Visitantes: 145.000
        Leads: 3.200
        Leads qualificados: 980
        Taxa de conversão: 2,2%
        
        CAC: R$ 185,00
        Pipeline influenciado: R$ 420.000,00
        Taxa de aprovação de peças no ciclo: 88%
      `
    };

    return mockTexts[fileName] || `
      RELATÓRIO DE MARKETING
      ${fileName}
      
      Documento de exemplo com indicadores de performance.
      ROAS: 3,1
      Engajamento médio: 2,8%
      Leads qualificados: 120
      Taxa de conversão: 2,5%
    `;
  }

  /**
   * Analisa texto extraído com IA
   */
  async analyzeWithAI(extractedText, serviceType) {
    const prompt = this.buildAnalysisPrompt(extractedText, serviceType);
    
    const analysis = await this.llm.generateJSON(prompt, this.getAnalysisSchema());
    
    return analysis;
  }

  /**
   * Constrói prompt para análise de documento
   */
  buildAnalysisPrompt(extractedText, serviceType) {
    return `Você é um especialista em marketing e comunicação. Analise o documento abaixo e extraia informações relevantes para o serviço "${serviceType}".

DOCUMENTO:
${extractedText}

TIPO DE SERVIÇO: ${serviceType}

Extraia e analise:
1. KPIs de marketing e performance (alcance, engajamento, conversão, ROI, etc.)
2. Indicadores de presença de marca e comunicação
3. Tendências e padrões
4. Oportunidades de melhoria
5. Riscos identificados
6. Metas sugeridas

Para cada KPI encontrado, forneça:
- Valor atual
- Período de referência
- Comparação com metas (se disponível)
- Tendência (crescimento/declínio)

Retorne uma análise estruturada em JSON seguindo o schema fornecido.`;
  }

  /**
   * Schema para análise de documentos
   */
  getAnalysisSchema() {
    return {
      type: 'object',
      properties: {
        kpis: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              value: { type: 'number' },
              unit: { type: 'string' },
              period: { type: 'string' },
              trend: { type: 'string', enum: ['up', 'down', 'stable'] },
              target: { type: 'number' },
              confidence: { type: 'number', minimum: 0, maximum: 100 }
            },
            required: ['name', 'value', 'unit']
          }
        },
        insights: {
          type: 'array',
          items: { type: 'string' }
        },
        opportunities: {
          type: 'array',
          items: { type: 'string' }
        },
        risks: {
          type: 'array',
          items: { type: 'string' }
        },
        recommendations: {
          type: 'array',
          items: { type: 'string' }
        },
        overallScore: {
          type: 'number',
          minimum: 0,
          maximum: 100
        }
      },
      required: ['kpis', 'insights']
    };
  }

  /**
   * Processa resultados da análise
   */
  async processAnalysisResults(analysis, serviceType) {
    const processedData = {
      kpis: [],
      insights: analysis.insights || [],
      opportunities: analysis.opportunities || [],
      risks: analysis.risks || [],
      recommendations: analysis.recommendations || [],
      overallScore: analysis.overallScore || 50
    };

    // Processar KPIs
    if (analysis.kpis && Array.isArray(analysis.kpis)) {
      for (const kpi of analysis.kpis) {
        const processedKPI = await this.processKPI(kpi, serviceType);
        if (processedKPI) {
          processedData.kpis.push(processedKPI);
        }
      }
    }

    return processedData;
  }

  /**
   * Processa KPI individual
   */
  async processKPI(kpi, serviceType) {
    try {
      // Mapear KPIs para tipos de serviço
      const kpiMapping = this.getKPIMapping(serviceType);
      
      const mappedKPI = kpiMapping[kpi.name.toLowerCase()] || {
        key: kpi.name.toLowerCase().replace(/\s+/g, '_'),
        label: kpi.name,
        description: 'KPI extraído do documento'
      };

      return {
        key: mappedKPI.key,
        label: mappedKPI.label,
        description: mappedKPI.description,
        value: kpi.value,
        unit: kpi.unit || 'BRL',
        period: kpi.period || 'anual',
        trend: kpi.trend || 'stable',
        target: kpi.target || null,
        confidence: kpi.confidence || 80,
        source: 'document_analysis',
        extractedAt: new Date().toISOString()
      };
    } catch (error) {
      console.warn('[DocumentAnalysis] Erro ao processar KPI:', error);
      return null;
    }
  }

  /**
   * Mapeia KPIs para tipos de serviço
   */
  getKPIMapping(serviceType) {
    const mappings = {
      'diagnostico_comunicacao': {
        'alcance': { key: 'alcance_total', label: 'Alcance Total', description: 'Alcance total nos canais digitais' },
        'engajamento': { key: 'taxa_engajamento', label: 'Taxa de Engajamento', description: 'Percentual de engajamento' },
        'conversao': { key: 'taxa_conversao', label: 'Taxa de Conversão', description: 'Taxa de conversão de leads' },
        'roi': { key: 'roi_midia', label: 'ROI de Mídia', description: 'Retorno sobre investimento em mídia' }
      },
      'estrategia_conteudo': {
        'engajamento': { key: 'taxa_engajamento', label: 'Taxa de Engajamento', description: 'Engajamento médio do conteúdo' },
        'alcance': { key: 'alcance_conteudo', label: 'Alcance de Conteúdo', description: 'Alcance médio das publicações' },
        'leads': { key: 'leads_gerados', label: 'Leads Gerados', description: 'Leads gerados por conteúdo' }
      },
      'marketing_360': {
        'roi': { key: 'roi_midia', label: 'ROI de Mídia', description: 'Retorno sobre investimento' },
        'cac': { key: 'cac', label: 'CAC', description: 'Custo de aquisição de cliente' },
        'conversao': { key: 'taxa_conversao', label: 'Taxa de Conversão', description: 'Taxa de conversão geral' }
      },
      // legacy aliases
      'diagnostico_financeiro': {
        'alcance': { key: 'alcance_total', label: 'Alcance Total', description: 'Alcance total nos canais digitais' },
        'engajamento': { key: 'taxa_engajamento', label: 'Taxa de Engajamento', description: 'Percentual de engajamento' }
      },
      'mentoria_margem': {
        'engajamento': { key: 'taxa_engajamento', label: 'Taxa de Engajamento', description: 'Engajamento médio do conteúdo' }
      },
      'gestao_financeira_360': {
        'roi': { key: 'roi_midia', label: 'ROI de Mídia', description: 'Retorno sobre investimento' }
      }
    };

    return mappings[serviceType] || mappings['diagnostico_comunicacao'];
  }

  /**
   * Valida qualidade da análise
   */
  validateAnalysis(analysis) {
    const errors = [];
    
    if (!analysis.kpis || !Array.isArray(analysis.kpis)) {
      errors.push('KPIs não encontrados na análise');
    }
    
    if (!analysis.insights || !Array.isArray(analysis.insights)) {
      errors.push('Insights não encontrados na análise');
    }
    
    if (analysis.overallScore < 0 || analysis.overallScore > 100) {
      errors.push('Score geral inválido');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Instância singleton
export const documentAnalysisService = new DocumentAnalysisService();
