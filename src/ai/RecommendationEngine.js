import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

/**
 * Sistema de Recomendações Automáticas
 * Implementa engine de recomendações baseado em regras e ML
 */
export class RecommendationEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    this.recommendations = new Map();
    this.rules = new Map();
    this.userProfiles = new Map();
    this.itemProfiles = new Map();
    this.interactions = new Map();
    this.collaborativeFilter = new Map();
    this.contentBasedFilter = new Map();
    this.hybridWeights = {
      collaborative: 0.4,
      contentBased: 0.3,
      ruleBased: 0.3
    };
    
    this.initializeRules();
    this.initializeProfiles();
  }

  /**
   * Inicializa regras de recomendação
   */
  initializeRules() {
    // Regras para KPIs Financeiros
    this.rules.set('financial_improvement', {
      name: 'Melhoria Financeira',
      category: 'financial',
      conditions: [
        { field: 'profit_margin', operator: '<', value: 15 },
        { field: 'cash_flow', operator: '<', value: 0 },
        { field: 'debt_ratio', operator: '>', value: 0.6 }
      ],
      recommendations: [
        {
          type: 'action',
          title: 'Otimizar Margem de Lucro',
          description: 'Implementar estratégias para aumentar a margem de lucro',
          priority: 'high',
          impact: 'high',
          effort: 'medium',
          actions: [
            'Revisar precificação de produtos/serviços',
            'Identificar e reduzir custos desnecessários',
            'Implementar controle de estoque mais eficiente'
          ]
        },
        {
          type: 'kpi',
          title: 'Monitorar Fluxo de Caixa',
          description: 'Acompanhar fluxo de caixa semanalmente',
          priority: 'critical',
          impact: 'high',
          effort: 'low',
          actions: [
            'Configurar alertas de fluxo de caixa',
            'Implementar projeções de caixa',
            'Estabelecer reserva de emergência'
          ]
        }
      ]
    });

    // Regras para Satisfação do Cliente
    this.rules.set('customer_satisfaction', {
      name: 'Satisfação do Cliente',
      category: 'customer',
      conditions: [
        { field: 'satisfaction_score', operator: '<', value: 4.0 },
        { field: 'response_time', operator: '>', value: 24 },
        { field: 'complaint_rate', operator: '>', value: 0.1 }
      ],
      recommendations: [
        {
          type: 'process',
          title: 'Melhorar Tempo de Resposta',
          description: 'Reduzir tempo de resposta para clientes',
          priority: 'high',
          impact: 'high',
          effort: 'medium',
          actions: [
            'Implementar SLA mais rigoroso',
            'Automatizar respostas frequentes',
            'Treinar equipe em comunicação eficiente'
          ]
        },
        {
          type: 'training',
          title: 'Treinamento em Atendimento',
          description: 'Capacitar equipe em atendimento ao cliente',
          priority: 'medium',
          impact: 'medium',
          effort: 'high',
          actions: [
            'Curso de comunicação assertiva',
            'Workshop de resolução de conflitos',
            'Simulação de cenários difíceis'
          ]
        }
      ]
    });

    // Regras para Performance de Equipe
    this.rules.set('team_performance', {
      name: 'Performance de Equipe',
      category: 'team',
      conditions: [
        { field: 'task_completion_rate', operator: '<', value: 0.8 },
        { field: 'quality_score', operator: '<', value: 0.85 },
        { field: 'collaboration_index', operator: '<', value: 0.7 }
      ],
      recommendations: [
        {
          type: 'process',
          title: 'Otimizar Fluxo de Trabalho',
          description: 'Melhorar eficiência do fluxo de trabalho',
          priority: 'high',
          impact: 'high',
          effort: 'medium',
          actions: [
            'Mapear processos atuais',
            'Identificar gargalos',
            'Implementar automações'
          ]
        },
        {
          type: 'training',
          title: 'Desenvolvimento de Habilidades',
          description: 'Investir no desenvolvimento da equipe',
          priority: 'medium',
          impact: 'medium',
          effort: 'high',
          actions: [
            'Plano de desenvolvimento individual',
            'Mentoria entre pares',
            'Certificações técnicas'
          ]
        }
      ]
    });

    // Regras para Risco de Projeto
    this.rules.set('project_risk', {
      name: 'Risco de Projeto',
      category: 'risk',
      conditions: [
        { field: 'budget_variance', operator: '>', value: 0.1 },
        { field: 'schedule_variance', operator: '>', value: 0.15 },
        { field: 'scope_changes', operator: '>', value: 3 }
      ],
      recommendations: [
        {
          type: 'action',
          title: 'Controle de Orçamento',
          description: 'Implementar controles rigorosos de orçamento',
          priority: 'critical',
          impact: 'high',
          effort: 'medium',
          actions: [
            'Revisão semanal de gastos',
            'Aprovação para gastos extras',
            'Reserva para contingências'
          ]
        },
        {
          type: 'process',
          title: 'Gestão de Escopo',
          description: 'Controlar mudanças de escopo',
          priority: 'high',
          impact: 'high',
          effort: 'low',
          actions: [
            'Processo formal de mudanças',
            'Impacto em prazo e custo',
            'Aprovação do cliente'
          ]
        }
      ]
    });
  }

  /**
   * Inicializa perfis de usuário e itens
   */
  initializeProfiles() {
    // Perfis de usuário baseados em roles
    this.userProfiles.set('admin', {
      role: 'admin',
      interests: ['financial', 'strategic', 'risk', 'team'],
      preferences: {
        detail_level: 'high',
        notification_frequency: 'immediate',
        recommendation_types: ['action', 'process', 'training', 'kpi']
      }
    });

    this.userProfiles.set('consultant', {
      role: 'consultant',
      interests: ['customer', 'team', 'process'],
      preferences: {
        detail_level: 'medium',
        notification_frequency: 'daily',
        recommendation_types: ['action', 'process', 'training']
      }
    });

    this.userProfiles.set('client', {
      role: 'client',
      interests: ['financial', 'customer'],
      preferences: {
        detail_level: 'low',
        notification_frequency: 'weekly',
        recommendation_types: ['action', 'kpi']
      }
    });

    // Perfis de itens (serviços, processos, etc.)
    this.itemProfiles.set('financial_consulting', {
      type: 'service',
      category: 'financial',
      tags: ['profit', 'cash_flow', 'budget', 'investment'],
      complexity: 'high',
      duration: 'long',
      impact: 'high'
    });

    this.itemProfiles.set('process_optimization', {
      type: 'service',
      category: 'operational',
      tags: ['efficiency', 'automation', 'workflow'],
      complexity: 'medium',
      duration: 'medium',
      impact: 'medium'
    });

    this.itemProfiles.set('team_training', {
      type: 'service',
      category: 'human_resources',
      tags: ['skills', 'development', 'collaboration'],
      complexity: 'low',
      duration: 'short',
      impact: 'medium'
    });
  }

  /**
   * Gera recomendações para um usuário
   */
  async generateRecommendations(userId, context = {}) {
    const userProfile = this.getUserProfile(userId);
    const recommendations = [];

    // 1. Recomendações baseadas em regras
    const ruleBasedRecs = await this.generateRuleBasedRecommendations(context);
    recommendations.push(...ruleBasedRecs);

    // 2. Recomendações colaborativas
    const collaborativeRecs = await this.generateCollaborativeRecommendations(userId, context);
    recommendations.push(...collaborativeRecs);

    // 3. Recomendações baseadas em conteúdo
    const contentBasedRecs = await this.generateContentBasedRecommendations(userId, context);
    recommendations.push(...contentBasedRecs);

    // 4. Filtrar e personalizar recomendações
    const filteredRecs = this.filterRecommendations(recommendations, userProfile);
    const personalizedRecs = this.personalizeRecommendations(filteredRecs, userProfile);

    // 5. Ordenar por relevância
    const sortedRecs = this.sortRecommendations(personalizedRecs, context);

    // 6. Armazenar recomendações
    this.storeRecommendations(userId, sortedRecs);

    this.emit('recommendations_generated', { userId, count: sortedRecs.length });

    return sortedRecs;
  }

  /**
   * Gera recomendações baseadas em regras
   */
  async generateRuleBasedRecommendations(context) {
    const recommendations = [];

    for (const [ruleId, rule] of this.rules) {
      if (this.evaluateRuleConditions(rule.conditions, context)) {
        for (const rec of rule.recommendations) {
          recommendations.push({
            id: uuidv4(),
            type: 'rule_based',
            ruleId,
            ruleName: rule.name,
            category: rule.category,
            ...rec,
            confidence: this.calculateRuleConfidence(rule, context),
            source: 'rule_engine'
          });
        }
      }
    }

    return recommendations;
  }

  /**
   * Avalia condições de uma regra
   */
  evaluateRuleConditions(conditions, context) {
    return conditions.every(condition => {
      const value = context[condition.field];
      if (value === undefined) return false;

      switch (condition.operator) {
        case '<': return value < condition.value;
        case '>': return value > condition.value;
        case '<=': return value <= condition.value;
        case '>=': return value >= condition.value;
        case '==': return value === condition.value;
        case '!=': return value !== condition.value;
        default: return false;
      }
    });
  }

  /**
   * Calcula confiança da regra
   */
  calculateRuleConfidence(rule, context) {
    const conditionsMet = rule.conditions.filter(condition => {
      const value = context[condition.field];
      if (value === undefined) return false;
      
      switch (condition.operator) {
        case '<': return value < condition.value;
        case '>': return value > condition.value;
        case '<=': return value <= condition.value;
        case '>=': return value >= condition.value;
        case '==': return value === condition.value;
        case '!=': return value !== condition.value;
        default: return false;
      }
    }).length;

    return conditionsMet / rule.conditions.length;
  }

  /**
   * Gera recomendações colaborativas
   */
  async generateCollaborativeRecommendations(userId, context) {
    const recommendations = [];
    
    // Simular filtro colaborativo
    const similarUsers = this.findSimilarUsers(userId);
    
    for (const similarUser of similarUsers) {
      const userInteractions = this.interactions.get(similarUser.id) || [];
      const userRecommendations = userInteractions
        .filter(interaction => interaction.rating > 3)
        .map(interaction => ({
          id: uuidv4(),
          type: 'collaborative',
          title: `Recomendado por usuários similares: ${interaction.item}`,
          description: `Usuários com perfil similar tiveram sucesso com esta ação`,
          priority: 'medium',
          impact: 'medium',
          effort: 'medium',
          confidence: similarUser.similarity,
          source: 'collaborative_filter',
          similarUser: similarUser.id
        }));
      
      recommendations.push(...userRecommendations);
    }

    return recommendations;
  }

  /**
   * Encontra usuários similares
   */
  findSimilarUsers(userId) {
    // Simulação de usuários similares
    return [
      { id: 'user_123', similarity: 0.85 },
      { id: 'user_456', similarity: 0.78 },
      { id: 'user_789', similarity: 0.72 }
    ];
  }

  /**
   * Gera recomendações baseadas em conteúdo
   */
  async generateContentBasedRecommendations(userId, context) {
    const recommendations = [];
    const userProfile = this.getUserProfile(userId);
    
    // Simular recomendações baseadas em conteúdo
    const contentRecommendations = [
      {
        id: uuidv4(),
        type: 'content_based',
        title: 'Otimização de Processos',
        description: 'Baseado no seu perfil e histórico, recomendamos focar em otimização de processos',
        priority: 'medium',
        impact: 'medium',
        effort: 'medium',
        confidence: 0.75,
        source: 'content_based',
        reasoning: 'Perfil indica interesse em eficiência operacional'
      },
      {
        id: uuidv4(),
        type: 'content_based',
        title: 'Desenvolvimento de Equipe',
        description: 'Sua equipe se beneficiaria de programas de desenvolvimento',
        priority: 'low',
        impact: 'high',
        effort: 'high',
        confidence: 0.68,
        source: 'content_based',
        reasoning: 'Histórico mostra necessidade de capacitação'
      }
    ];

    return contentRecommendations;
  }

  /**
   * Filtra recomendações baseado no perfil do usuário
   */
  filterRecommendations(recommendations, userProfile) {
    return recommendations.filter(rec => {
      // Filtrar por tipo de recomendação preferido
      if (!userProfile.preferences.recommendation_types.includes(rec.type)) {
        return false;
      }

      // Filtrar por nível de detalhe
      if (userProfile.preferences.detail_level === 'low' && rec.effort === 'high') {
        return false;
      }

      return true;
    });
  }

  /**
   * Personaliza recomendações
   */
  personalizeRecommendations(recommendations, userProfile) {
    return recommendations.map(rec => ({
      ...rec,
      personalized: true,
      userRole: userProfile.role,
      detailLevel: userProfile.preferences.detail_level,
      notificationFrequency: userProfile.preferences.notification_frequency
    }));
  }

  /**
   * Ordena recomendações por relevância
   */
  sortRecommendations(recommendations, context) {
    return recommendations.sort((a, b) => {
      // Calcular score de relevância
      const scoreA = this.calculateRelevanceScore(a, context);
      const scoreB = this.calculateRelevanceScore(b, context);
      
      return scoreB - scoreA;
    });
  }

  /**
   * Calcula score de relevância
   */
  calculateRelevanceScore(recommendation, context) {
    let score = 0;
    
    // Score baseado na confiança
    score += recommendation.confidence * 0.4;
    
    // Score baseado na prioridade
    const priorityScores = { critical: 1.0, high: 0.8, medium: 0.6, low: 0.4 };
    score += priorityScores[recommendation.priority] * 0.3;
    
    // Score baseado no impacto
    const impactScores = { high: 1.0, medium: 0.6, low: 0.3 };
    score += impactScores[recommendation.impact] * 0.2;
    
    // Score baseado no esforço (menor esforço = maior score)
    const effortScores = { low: 1.0, medium: 0.6, high: 0.3 };
    score += effortScores[recommendation.effort] * 0.1;
    
    return score;
  }

  /**
   * Armazena recomendações
   */
  storeRecommendations(userId, recommendations) {
    this.recommendations.set(userId, {
      userId,
      recommendations,
      generatedAt: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 horas
    });
  }

  /**
   * Registra interação do usuário
   */
  recordInteraction(userId, itemId, rating, context = {}) {
    if (!this.interactions.has(userId)) {
      this.interactions.set(userId, []);
    }
    
    const interactions = this.interactions.get(userId);
    interactions.push({
      id: uuidv4(),
      userId,
      itemId,
      rating,
      context,
      timestamp: Date.now()
    });
    
    // Manter apenas as últimas 100 interações
    if (interactions.length > 100) {
      interactions.splice(0, interactions.length - 100);
    }
    
    this.emit('interaction_recorded', { userId, itemId, rating });
  }

  /**
   * Obtém perfil do usuário
   */
  getUserProfile(userId) {
    // Simular obtenção de perfil do usuário
    const role = this.getUserRole(userId);
    return this.userProfiles.get(role) || this.userProfiles.get('client');
  }

  /**
   * Obtém role do usuário
   */
  getUserRole(userId) {
    // Simulação - em produção, obter do sistema de autenticação
    const roles = ['admin', 'consultant', 'client'];
    return roles[Math.floor(Math.random() * roles.length)];
  }

  /**
   * Obtém recomendações para usuário
   */
  getRecommendations(userId) {
    const userRecs = this.recommendations.get(userId);
    if (!userRecs) return [];
    
    // Verificar se as recomendações não expiraram
    if (Date.now() > userRecs.expiresAt) {
      this.recommendations.delete(userId);
      return [];
    }
    
    return userRecs.recommendations;
  }

  /**
   * Obtém estatísticas do engine
   */
  getStats() {
    return {
      totalRules: this.rules.size,
      totalUsers: this.userProfiles.size,
      totalItems: this.itemProfiles.size,
      totalInteractions: Array.from(this.interactions.values())
        .reduce((sum, interactions) => sum + interactions.length, 0),
      totalRecommendations: Array.from(this.recommendations.values())
        .reduce((sum, recs) => sum + recs.recommendations.length, 0)
    };
  }

  /**
   * Adiciona nova regra
   */
  addRule(ruleId, rule) {
    this.rules.set(ruleId, rule);
    this.emit('rule_added', { ruleId, rule });
  }

  /**
   * Remove regra
   */
  removeRule(ruleId) {
    this.rules.delete(ruleId);
    this.emit('rule_removed', { ruleId });
  }

  /**
   * Atualiza pesos híbridos
   */
  updateHybridWeights(weights) {
    this.hybridWeights = { ...this.hybridWeights, ...weights };
    this.emit('weights_updated', { weights: this.hybridWeights });
  }
}

// Instância singleton
export const recommendationEngine = new RecommendationEngine();

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.recommendationEngine = recommendationEngine;
}

