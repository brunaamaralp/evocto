/**
 * 🤖 Serviço de Geração de Tarefas com IA
 * 
 * Gera tarefas personalizadas baseadas no briefing usando IA real
 */

import { getBestAIProvider } from '@/config/aiConfig';
import { Task } from '@/api/entities';

export class AITaskGenerator {
  constructor() {
    this.llm = null;
    this.initializeLLM();
  }

  async initializeLLM() {
    try {
      this.llm = await getBestAIProvider();
      console.log('✅ AITaskGenerator inicializado com:', this.llm.constructor.name);
    } catch (error) {
      console.error('❌ Erro ao inicializar AITaskGenerator:', error);
      // Fallback para MockLLM
      const { MockLLM } = await import('@/api/integrations/LocalLLM');
      this.llm = new MockLLM();
    }
  }

  /**
   * Gera tarefas personalizadas baseadas no briefing
   */
  async generateTasksFromBriefing(briefingData) {
    try {
      console.log('[AITaskGenerator] Gerando tarefas para briefing:', briefingData.id);

      // Validar dados do briefing
      if (!briefingData || !briefingData.itens) {
        throw new Error('Briefing inválido: dados insuficientes');
      }

      // Preparar prompt para IA
      const prompt = this.buildTaskGenerationPrompt(briefingData);
      
      // Chamar IA para gerar tarefas
      const aiResponse = await this.llm.generateJSON(prompt, this.getTaskSchema());
      
      // Processar resposta da IA
      const tasks = await this.processAIResponse(aiResponse, briefingData);
      
      console.log(`[AITaskGenerator] ${tasks.length} tarefas geradas com sucesso`);
      
      return {
        success: true,
        tasks,
        metadata: {
          briefingId: briefingData.id,
          serviceType: briefingData.servico_tipo,
          generatedAt: new Date().toISOString(),
          aiProvider: this.llm.constructor.name
        }
      };

    } catch (error) {
      console.error('[AITaskGenerator] Erro ao gerar tarefas:', error);
      
      // Fallback para tarefas padrão
      const fallbackTasks = await this.generateFallbackTasks(briefingData);
      
      return {
        success: false,
        tasks: fallbackTasks,
        error: error.message,
        metadata: {
          briefingId: briefingData.id,
          serviceType: briefingData.servico_tipo,
          generatedAt: new Date().toISOString(),
          aiProvider: 'fallback',
          fallbackReason: error.message
        }
      };
    }
  }

  /**
   * Constrói prompt otimizado para geração de tarefas
   */
  buildTaskGenerationPrompt(briefingData) {
    const serviceType = briefingData.servico_tipo;
    const briefingItems = briefingData.itens;
    
    return `Você é um especialista em marketing e comunicação. Analise o briefing abaixo e gere tarefas personalizadas para o serviço "${serviceType}".

BRIEFING:
${JSON.stringify(briefingItems, null, 2)}

REQUISITOS:
1. Gere 5-15 tarefas específicas e acionáveis
2. Cada tarefa deve ter título claro, descrição detalhada e prioridade
3. Considere o contexto do briefing para personalizar as tarefas
4. Inclua tarefas de diferentes fases do projeto
5. Priorize tarefas que geram valor imediato para o cliente

TIPO DE SERVIÇO: ${serviceType}

Gere tarefas que sejam:
- Específicas e mensuráveis
- Alinhadas com os objetivos do briefing
- Práticas e executáveis
- Organizadas por prioridade e fase

Retorne um JSON com as tarefas geradas seguindo o schema fornecido.`;
  }

  /**
   * Schema para validação das tarefas geradas pela IA
   */
  getTaskSchema() {
    return {
      type: 'object',
      properties: {
        tasks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string', minLength: 5, maxLength: 100 },
              description: { type: 'string', minLength: 20, maxLength: 500 },
              priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
              phase: { type: 'string', minLength: 3, maxLength: 50 },
              estimatedHours: { type: 'number', minimum: 1, maximum: 40 },
              dependencies: { type: 'array', items: { type: 'string' } },
              kpiImpact: { type: 'string', enum: ['low', 'medium', 'high'] },
              learningPotential: { type: 'boolean' },
              clientApprovalRequired: { type: 'boolean' }
            },
            required: ['title', 'description', 'priority', 'phase']
          }
        },
        insights: {
          type: 'array',
          items: { type: 'string' }
        },
        recommendations: {
          type: 'array',
          items: { type: 'string' }
        }
      },
      required: ['tasks']
    };
  }

  /**
   * Processa resposta da IA e converte para formato do sistema
   */
  async processAIResponse(aiResponse, briefingData) {
    if (!aiResponse.tasks || !Array.isArray(aiResponse.tasks)) {
      throw new Error('Resposta da IA inválida: tarefas não encontradas');
    }

    const tasks = [];
    
    for (let i = 0; i < aiResponse.tasks.length; i++) {
      const aiTask = aiResponse.tasks[i];
      
      try {
        const task = await this.createTaskFromAI(aiTask, briefingData, i);
        tasks.push(task);
      } catch (error) {
        console.warn(`[AITaskGenerator] Erro ao processar tarefa ${i}:`, error);
        // Continuar com outras tarefas
      }
    }

    return tasks;
  }

  /**
   * Cria tarefa do sistema baseada na resposta da IA
   */
  async createTaskFromAI(aiTask, briefingData, index) {
    const taskData = {
      title: aiTask.title,
      description: aiTask.description,
      priority: aiTask.priority || 'medium',
      status: 'todo',
      phase: aiTask.phase || 'Execução',
      estimatedHours: aiTask.estimatedHours || 4,
      dependencies: aiTask.dependencies || [],
      kpiImpact: aiTask.kpiImpact || 'medium',
      learningPotential: aiTask.learningPotential || false,
      clientApprovalRequired: aiTask.clientApprovalRequired || false,
      
      // Metadados do briefing
      briefingId: briefingData.id,
      serviceId: briefingData.servico_instancia_id,
      clientId: briefingData.cliente_id,
      agencyId: briefingData.agencyId,
      
      // Metadados da IA
      aiGenerated: true,
      aiProvider: this.llm.constructor.name,
      generatedAt: new Date().toISOString(),
      aiConfidence: this.calculateConfidence(aiTask)
    };

    return taskData;
  }

  /**
   * Calcula confiança da IA baseada na qualidade da tarefa
   */
  calculateConfidence(aiTask) {
    let confidence = 50; // Base
    
    // Título claro e específico
    if (aiTask.title && aiTask.title.length > 10) confidence += 10;
    
    // Descrição detalhada
    if (aiTask.description && aiTask.description.length > 50) confidence += 15;
    
    // Prioridade definida
    if (aiTask.priority) confidence += 10;
    
    // Fase definida
    if (aiTask.phase) confidence += 10;
    
    // Estimativa de horas
    if (aiTask.estimatedHours && aiTask.estimatedHours > 0) confidence += 5;
    
    return Math.min(confidence, 100);
  }

  /**
   * Gera tarefas de fallback quando a IA falha
   */
  async generateFallbackTasks(briefingData) {
    const serviceType = briefingData.servico_tipo;
    
    // Tarefas padrão baseadas no tipo de serviço
    const fallbackTemplates = {
      'diagnostico_comunicacao': [
        {
          title: 'Auditoria de Marca e Comunicação',
          description: 'Mapear presença de marca, mensagem e canais de comunicação atuais',
          priority: 'high',
          phase: 'Diagnóstico',
          estimatedHours: 8,
          kpiImpact: 'high',
          learningPotential: true
        },
        {
          title: 'Análise de Posicionamento e Concorrência',
          description: 'Identificar oportunidades de diferenciação e gaps de mensagem',
          priority: 'medium',
          phase: 'Análise',
          estimatedHours: 6,
          kpiImpact: 'medium',
          learningPotential: true
        }
      ],
      'estrategia_conteudo': [
        {
          title: 'Diagnóstico de Conteúdo Atual',
          description: 'Avaliar conteúdo existente, performance e alinhamento com marca',
          priority: 'high',
          phase: 'Análise',
          estimatedHours: 4,
          kpiImpact: 'high',
          learningPotential: false
        },
        {
          title: 'Plano Editorial e Calendário',
          description: 'Desenvolver estratégia editorial e calendário de conteúdo',
          priority: 'high',
          phase: 'Planejamento',
          estimatedHours: 6,
          kpiImpact: 'high',
          learningPotential: true
        }
      ],
      'marketing_360': [
        {
          title: 'Diagnóstico Completo de Marketing',
          description: 'Avaliar todos os aspectos da operação de marketing atual',
          priority: 'high',
          phase: 'Diagnóstico',
          estimatedHours: 12,
          kpiImpact: 'high',
          learningPotential: true
        },
        {
          title: 'Implementação de Operação de Marketing',
          description: 'Estabelecer processos, calendários e rotinas de marketing',
          priority: 'medium',
          phase: 'Implementação',
          estimatedHours: 8,
          kpiImpact: 'medium',
          learningPotential: true
        }
      ],
      // legacy aliases
      'diagnostico_financeiro': [
        {
          title: 'Auditoria de Marca e Comunicação',
          description: 'Mapear presença de marca, mensagem e canais de comunicação atuais',
          priority: 'high',
          phase: 'Diagnóstico',
          estimatedHours: 8,
          kpiImpact: 'high',
          learningPotential: true
        }
      ],
      'mentoria_margem': [
        {
          title: 'Diagnóstico de Conteúdo Atual',
          description: 'Avaliar conteúdo existente, performance e alinhamento com marca',
          priority: 'high',
          phase: 'Análise',
          estimatedHours: 4,
          kpiImpact: 'high',
          learningPotential: false
        }
      ],
      'gestao_financeira_360': [
        {
          title: 'Diagnóstico Completo de Marketing',
          description: 'Avaliar todos os aspectos da operação de marketing atual',
          priority: 'high',
          phase: 'Diagnóstico',
          estimatedHours: 12,
          kpiImpact: 'high',
          learningPotential: true
        }
      ]
    };

    const templates = fallbackTemplates[serviceType] || fallbackTemplates['diagnostico_comunicacao'];
    
    return templates.map((template, index) => ({
      ...template,
      briefingId: briefingData.id,
      serviceId: briefingData.servico_instancia_id,
      clientId: briefingData.cliente_id,
      agencyId: briefingData.agencyId,
      aiGenerated: false,
      fallbackReason: 'IA indisponível',
      generatedAt: new Date().toISOString()
    }));
  }

  /**
   * Analisa briefing e sugere melhorias
   */
  async analyzeBriefing(briefingData) {
    try {
      const prompt = `Analise o briefing abaixo e forneça insights sobre:
1. Qualidade das respostas
2. Informações faltantes
3. Oportunidades de melhoria
4. Riscos identificados

BRIEFING: ${JSON.stringify(briefingData.itens, null, 2)}

Forneça uma análise estruturada em JSON.`;

      const analysis = await this.llm.generateJSON(prompt, {
        type: 'object',
        properties: {
          quality: { type: 'string' },
          missingInfo: { type: 'array', items: { type: 'string' } },
          improvements: { type: 'array', items: { type: 'string' } },
          risks: { type: 'array', items: { type: 'string' } },
          score: { type: 'number', minimum: 0, maximum: 100 }
        }
      });

      return analysis;
    } catch (error) {
      console.error('[AITaskGenerator] Erro ao analisar briefing:', error);
      return {
        quality: 'Análise indisponível',
        missingInfo: [],
        improvements: [],
        risks: [],
        score: 50
      };
    }
  }
}

// Instância singleton
export const aiTaskGenerator = new AITaskGenerator();
