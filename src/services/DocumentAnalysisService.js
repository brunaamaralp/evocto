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
        DEMONSTRAÇÃO DO RESULTADO DO EXERCÍCIO
        Período: Janeiro a Dezembro de 2024
        
        RECEITA BRUTA: R$ 1.200.000,00
        (-) Impostos sobre Vendas: R$ 180.000,00
        RECEITA LÍQUIDA: R$ 1.020.000,00
        
        (-) Custo dos Produtos Vendidos: R$ 720.000,00
        LUCRO BRUTO: R$ 300.000,00
        
        (-) Despesas Operacionais: R$ 180.000,00
        LUCRO OPERACIONAL: R$ 120.000,00
        
        Margem Bruta: 29,4%
        Margem Operacional: 11,8%
      `,
      'balanco.xlsx': `
        BALANÇO PATRIMONIAL
        Em 31 de Dezembro de 2024
        
        ATIVO CIRCULANTE: R$ 450.000,00
        - Caixa: R$ 50.000,00
        - Contas a Receber: R$ 200.000,00
        - Estoque: R$ 200.000,00
        
        ATIVO NÃO CIRCULANTE: R$ 800.000,00
        - Imobilizado: R$ 800.000,00
        
        TOTAL DO ATIVO: R$ 1.250.000,00
        
        PASSIVO CIRCULANTE: R$ 300.000,00
        - Fornecedores: R$ 150.000,00
        - Empréstimos: R$ 150.000,00
        
        PATRIMÔNIO LÍQUIDO: R$ 950.000,00
        
        Liquidez Corrente: 1,5
        Endividamento: 31,6%
      `,
      'fluxo_caixa.csv': `
        FLUXO DE CAIXA
        Período: Janeiro a Dezembro de 2024
        
        Saldo Inicial: R$ 30.000,00
        
        Entradas:
        - Vendas: R$ 1.020.000,00
        - Outras Receitas: R$ 50.000,00
        
        Saídas:
        - Compras: R$ 720.000,00
        - Despesas Operacionais: R$ 180.000,00
        - Investimentos: R$ 100.000,00
        
        Saldo Final: R$ 100.000,00
        
        Ciclo de Caixa: 45 dias
      `
    };

    return mockTexts[fileName] || `
      DOCUMENTO FINANCEIRO
      ${fileName}
      
      Este é um documento de exemplo contendo informações financeiras.
      Receita: R$ 1.000.000,00
      Custos: R$ 700.000,00
      Margem: 30%
      Lucro: R$ 300.000,00
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
    return `Você é um especialista em análise financeira. Analise o documento abaixo e extraia informações relevantes para o serviço "${serviceType}".

DOCUMENTO:
${extractedText}

TIPO DE SERVIÇO: ${serviceType}

Extraia e analise:
1. KPIs financeiros principais (receita, margem, lucro, etc.)
2. Indicadores de performance
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
      'diagnostico_financeiro': {
        'receita': { key: 'receita_mensal', label: 'Receita Mensal', description: 'Receita mensal da empresa' },
        'margem': { key: 'margem_percent', label: 'Margem de Lucro', description: 'Percentual de margem sobre a receita' },
        'lucro': { key: 'lucro_operacional', label: 'Lucro Operacional', description: 'Lucro operacional mensal' },
        'fluxo': { key: 'fluxo_saldo', label: 'Fluxo de Caixa', description: 'Saldo do fluxo de caixa' }
      },
      'mentoria_margem': {
        'margem': { key: 'margem_percent', label: 'Margem de Lucro', description: 'Margem atual da empresa' },
        'receita': { key: 'receita_mensal', label: 'Receita Mensal', description: 'Receita mensal' },
        'custos': { key: 'custos_variaveis', label: 'Custos Variáveis', description: 'Custos variáveis mensais' },
        'inadimplencia': { key: 'inadimplencia_percent', label: 'Inadimplência', description: 'Percentual de inadimplência' }
      },
      'gestao_financeira_360': {
        'fluxo': { key: 'fluxo_saldo', label: 'Fluxo de Caixa', description: 'Saldo do fluxo de caixa' },
        'inadimplencia': { key: 'inadimplencia_percent', label: 'Inadimplência', description: 'Percentual de inadimplência' },
        'ciclo': { key: 'ciclo_caixa_dias', label: 'Ciclo de Caixa', description: 'Ciclo de caixa em dias' },
        'estoque': { key: 'estoque_valor', label: 'Valor do Estoque', description: 'Valor atual do estoque' }
      }
    };

    return mappings[serviceType] || mappings['diagnostico_financeiro'];
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
