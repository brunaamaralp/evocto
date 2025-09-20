import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

/**
 * Sistema de Catálogo de Serviços
 * Implementa marketplace de serviços com precificação dinâmica e avaliações
 */
export class ServiceCatalog extends EventEmitter {
  constructor(options = {}) {
    super();
    this.services = new Map();
    this.categories = new Map();
    this.pricingRules = new Map();
    this.reviews = new Map();
    this.orders = new Map();
    this.providers = new Map();
    this.commissions = new Map();
    this.promotions = new Map();
    this.analytics = new Map();
    
    this.initializeDefaultServices();
    this.initializeCategories();
    this.initializePricingRules();
  }

  /**
   * Inicializa serviços padrão
   */
  initializeDefaultServices() {
    // Serviços de Consultoria Financeira
    this.services.set('financial_diagnosis', {
      id: 'financial_diagnosis',
      name: 'Diagnóstico Financeiro Completo',
      description: 'Análise completa da saúde financeira da empresa',
      category: 'financial',
      provider: 'evocto_consulting',
      basePrice: 5000,
      currency: 'BRL',
      duration: '2-3 semanas',
      deliverables: [
        'Relatório de diagnóstico financeiro',
        'Análise de fluxo de caixa',
        'Recomendações de melhoria',
        'Plano de ação personalizado'
      ],
      requirements: [
        'Demonstrativos financeiros dos últimos 12 meses',
        'Planejamento orçamentário',
        'Informações sobre dívidas e obrigações'
      ],
      tags: ['financeiro', 'diagnóstico', 'análise', 'consultoria'],
      status: 'active',
      rating: 4.8,
      reviewCount: 45,
      orderCount: 120,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    this.services.set('pricing_mentoring', {
      id: 'pricing_mentoring',
      name: 'Mentoria em Precificação e Margem',
      description: 'Orientação especializada para otimização de preços e margens',
      category: 'pricing',
      provider: 'evocto_consulting',
      basePrice: 3500,
      currency: 'BRL',
      duration: '4-6 semanas',
      deliverables: [
        'Análise de precificação atual',
        'Estratégias de otimização de margem',
        'Ferramentas de cálculo de preços',
        'Treinamento da equipe'
      ],
      requirements: [
        'Histórico de preços e vendas',
        'Estrutura de custos',
        'Análise da concorrência'
      ],
      tags: ['precificação', 'margem', 'mentoria', 'estratégia'],
      status: 'active',
      rating: 4.9,
      reviewCount: 32,
      orderCount: 85,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    this.services.set('financial_360', {
      id: 'financial_360',
      name: 'Gestão Financeira 360°',
      description: 'Implementação completa de gestão financeira empresarial',
      category: 'management',
      provider: 'evocto_consulting',
      basePrice: 15000,
      currency: 'BRL',
      duration: '8-12 semanas',
      deliverables: [
        'Sistema de gestão financeira',
        'Processos e procedimentos',
        'Treinamento completo da equipe',
        'Acompanhamento por 3 meses'
      ],
      requirements: [
        'Acesso completo aos sistemas financeiros',
        'Equipe dedicada para implementação',
        'Compromisso com mudanças organizacionais'
      ],
      tags: ['gestão', 'financeiro', '360', 'implementação'],
      status: 'active',
      rating: 4.7,
      reviewCount: 28,
      orderCount: 65,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    // Serviços de Tecnologia
    this.services.set('digital_transformation', {
      id: 'digital_transformation',
      name: 'Transformação Digital',
      description: 'Modernização de processos e implementação de tecnologias',
      category: 'technology',
      provider: 'tech_partner',
      basePrice: 25000,
      currency: 'BRL',
      duration: '12-16 semanas',
      deliverables: [
        'Auditoria de processos atuais',
        'Plano de transformação digital',
        'Implementação de soluções',
        'Treinamento e suporte'
      ],
      requirements: [
        'Mapeamento de processos atuais',
        'Orçamento para investimentos',
        'Equipe de mudança'
      ],
      tags: ['digital', 'transformação', 'tecnologia', 'processos'],
      status: 'active',
      rating: 4.6,
      reviewCount: 18,
      orderCount: 42,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    // Serviços de Marketing
    this.services.set('marketing_strategy', {
      id: 'marketing_strategy',
      name: 'Estratégia de Marketing Digital',
      description: 'Desenvolvimento de estratégia completa de marketing digital',
      category: 'marketing',
      provider: 'marketing_partner',
      basePrice: 8000,
      currency: 'BRL',
      duration: '6-8 semanas',
      deliverables: [
        'Análise de mercado e concorrência',
        'Estratégia de marketing digital',
        'Plano de conteúdo',
        'Cronograma de implementação'
      ],
      requirements: [
        'Informações sobre público-alvo',
        'Orçamento de marketing',
        'Equipe de marketing'
      ],
      tags: ['marketing', 'digital', 'estratégia', 'conteúdo'],
      status: 'active',
      rating: 4.5,
      reviewCount: 25,
      orderCount: 58,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }

  /**
   * Inicializa categorias
   */
  initializeCategories() {
    this.categories.set('financial', {
      id: 'financial',
      name: 'Consultoria Financeira',
      description: 'Serviços especializados em gestão financeira',
      icon: 'dollar-sign',
      color: '#10b981',
      services: ['financial_diagnosis', 'pricing_mentoring', 'financial_360']
    });

    this.categories.set('technology', {
      id: 'technology',
      name: 'Tecnologia',
      description: 'Serviços de tecnologia e transformação digital',
      icon: 'cpu',
      color: '#3b82f6',
      services: ['digital_transformation']
    });

    this.categories.set('marketing', {
      id: 'marketing',
      name: 'Marketing',
      description: 'Serviços de marketing e estratégia digital',
      icon: 'trending-up',
      color: '#f59e0b',
      services: ['marketing_strategy']
    });

    this.categories.set('pricing', {
      id: 'pricing',
      name: 'Precificação',
      description: 'Serviços especializados em precificação e margem',
      icon: 'calculator',
      color: '#8b5cf6',
      services: ['pricing_mentoring']
    });

    this.categories.set('management', {
      id: 'management',
      name: 'Gestão',
      description: 'Serviços de gestão empresarial',
      icon: 'users',
      color: '#ef4444',
      services: ['financial_360']
    });
  }

  /**
   * Inicializa regras de precificação
   */
  initializePricingRules() {
    this.pricingRules.set('volume_discount', {
      id: 'volume_discount',
      name: 'Desconto por Volume',
      description: 'Desconto baseado na quantidade de serviços contratados',
      type: 'percentage',
      conditions: [
        { minQuantity: 2, maxQuantity: 4, discount: 5 },
        { minQuantity: 5, maxQuantity: 9, discount: 10 },
        { minQuantity: 10, maxQuantity: null, discount: 15 }
      ]
    });

    this.pricingRules.set('loyalty_discount', {
      id: 'loyalty_discount',
      name: 'Desconto de Fidelidade',
      description: 'Desconto para clientes recorrentes',
      type: 'percentage',
      conditions: [
        { minOrders: 3, discount: 8 },
        { minOrders: 6, discount: 12 },
        { minOrders: 10, discount: 18 }
      ]
    });

    this.pricingRules.set('seasonal_pricing', {
      id: 'seasonal_pricing',
      name: 'Precificação Sazonal',
      description: 'Ajuste de preços baseado na sazonalidade',
      type: 'multiplier',
      conditions: [
        { month: 1, multiplier: 0.9 }, // Janeiro - desconto
        { month: 2, multiplier: 0.9 }, // Fevereiro - desconto
        { month: 12, multiplier: 1.1 }, // Dezembro - aumento
      ]
    });

    this.pricingRules.set('urgency_pricing', {
      id: 'urgency_pricing',
      name: 'Precificação por Urgência',
      description: 'Ajuste de preços baseado na urgência',
      type: 'multiplier',
      conditions: [
        { urgency: 'low', multiplier: 0.95 },
        { urgency: 'normal', multiplier: 1.0 },
        { urgency: 'high', multiplier: 1.15 },
        { urgency: 'critical', multiplier: 1.3 }
      ]
    });
  }

  /**
   * Calcula preço dinâmico
   */
  calculateDynamicPrice(serviceId, context = {}) {
    const service = this.services.get(serviceId);
    if (!service) {
      throw new Error(`Serviço não encontrado: ${serviceId}`);
    }

    let finalPrice = service.basePrice;
    const appliedRules = [];

    // Aplicar regras de precificação
    for (const [ruleId, rule] of this.pricingRules) {
      const adjustment = this.applyPricingRule(rule, context);
      if (adjustment !== 1.0) {
        finalPrice *= adjustment;
        appliedRules.push({
          ruleId,
          ruleName: rule.name,
          adjustment,
          type: rule.type
        });
      }
    }

    // Aplicar promoções ativas
    const activePromotions = this.getActivePromotions(serviceId, context);
    for (const promotion of activePromotions) {
      finalPrice = this.applyPromotion(finalPrice, promotion);
      appliedRules.push({
        ruleId: promotion.id,
        ruleName: promotion.name,
        adjustment: promotion.discount,
        type: 'promotion'
      });
    }

    return {
      serviceId,
      basePrice: service.basePrice,
      finalPrice: Math.round(finalPrice),
      currency: service.currency,
      appliedRules,
      calculatedAt: Date.now()
    };
  }

  /**
   * Aplica regra de precificação
   */
  applyPricingRule(rule, context) {
    switch (rule.id) {
      case 'volume_discount':
        return this.applyVolumeDiscount(rule, context);
      case 'loyalty_discount':
        return this.applyLoyaltyDiscount(rule, context);
      case 'seasonal_pricing':
        return this.applySeasonalPricing(rule, context);
      case 'urgency_pricing':
        return this.applyUrgencyPricing(rule, context);
      default:
        return 1.0;
    }
  }

  /**
   * Aplica desconto por volume
   */
  applyVolumeDiscount(rule, context) {
    const quantity = context.quantity || 1;
    for (const condition of rule.conditions) {
      if (quantity >= condition.minQuantity && 
          (condition.maxQuantity === null || quantity <= condition.maxQuantity)) {
        return 1 - (condition.discount / 100);
      }
    }
    return 1.0;
  }

  /**
   * Aplica desconto de fidelidade
   */
  applyLoyaltyDiscount(rule, context) {
    const orderCount = context.clientOrderCount || 0;
    for (const condition of rule.conditions) {
      if (orderCount >= condition.minOrders) {
        return 1 - (condition.discount / 100);
      }
    }
    return 1.0;
  }

  /**
   * Aplica precificação sazonal
   */
  applySeasonalPricing(rule, context) {
    const currentMonth = new Date().getMonth() + 1;
    for (const condition of rule.conditions) {
      if (condition.month === currentMonth) {
        return condition.multiplier;
      }
    }
    return 1.0;
  }

  /**
   * Aplica precificação por urgência
   */
  applyUrgencyPricing(rule, context) {
    const urgency = context.urgency || 'normal';
    for (const condition of rule.conditions) {
      if (condition.urgency === urgency) {
        return condition.multiplier;
      }
    }
    return 1.0;
  }

  /**
   * Obtém promoções ativas
   */
  getActivePromotions(serviceId, context) {
    const activePromotions = [];
    const now = Date.now();

    for (const [promotionId, promotion] of this.promotions) {
      if (promotion.status === 'active' &&
          promotion.startDate <= now &&
          promotion.endDate >= now &&
          (promotion.services.includes(serviceId) || promotion.services.includes('all'))) {
        
        // Verificar condições da promoção
        if (this.checkPromotionConditions(promotion, context)) {
          activePromotions.push(promotion);
        }
      }
    }

    return activePromotions;
  }

  /**
   * Verifica condições da promoção
   */
  checkPromotionConditions(promotion, context) {
    if (!promotion.conditions) return true;

    for (const condition of promotion.conditions) {
      switch (condition.type) {
        case 'min_value':
          if (context.orderValue < condition.value) return false;
          break;
        case 'client_type':
          if (context.clientType !== condition.value) return false;
          break;
        case 'first_time':
          if (condition.value && context.clientOrderCount > 0) return false;
          break;
      }
    }

    return true;
  }

  /**
   * Aplica promoção
   */
  applyPromotion(price, promotion) {
    switch (promotion.type) {
      case 'percentage':
        return price * (1 - promotion.discount / 100);
      case 'fixed':
        return Math.max(0, price - promotion.discount);
      case 'buy_one_get_one':
        // Implementar lógica BOGO
        return price;
      default:
        return price;
    }
  }

  /**
   * Cria nova promoção
   */
  createPromotion(promotionData) {
    const promotion = {
      id: uuidv4(),
      name: promotionData.name,
      description: promotionData.description,
      type: promotionData.type, // 'percentage', 'fixed', 'buy_one_get_one'
      discount: promotionData.discount,
      services: promotionData.services || ['all'],
      conditions: promotionData.conditions || [],
      startDate: promotionData.startDate,
      endDate: promotionData.endDate,
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.promotions.set(promotion.id, promotion);
    this.emit('promotion_created', { promotion });
    
    return promotion.id;
  }

  /**
   * Adiciona avaliação
   */
  addReview(serviceId, reviewData) {
    const review = {
      id: uuidv4(),
      serviceId,
      clientId: reviewData.clientId,
      rating: reviewData.rating,
      title: reviewData.title,
      comment: reviewData.comment,
      pros: reviewData.pros || [],
      cons: reviewData.cons || [],
      wouldRecommend: reviewData.wouldRecommend || false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    if (!this.reviews.has(serviceId)) {
      this.reviews.set(serviceId, []);
    }

    this.reviews.get(serviceId).push(review);
    
    // Atualizar estatísticas do serviço
    this.updateServiceStats(serviceId);
    
    this.emit('review_added', { review });
    
    return review.id;
  }

  /**
   * Atualiza estatísticas do serviço
   */
  updateServiceStats(serviceId) {
    const service = this.services.get(serviceId);
    if (!service) return;

    const serviceReviews = this.reviews.get(serviceId) || [];
    
    if (serviceReviews.length > 0) {
      const totalRating = serviceReviews.reduce((sum, review) => sum + review.rating, 0);
      service.rating = totalRating / serviceReviews.length;
      service.reviewCount = serviceReviews.length;
    }

    service.updatedAt = Date.now();
  }

  /**
   * Cria pedido
   */
  createOrder(orderData) {
    const order = {
      id: uuidv4(),
      clientId: orderData.clientId,
      serviceId: orderData.serviceId,
      quantity: orderData.quantity || 1,
      urgency: orderData.urgency || 'normal',
      pricing: this.calculateDynamicPrice(orderData.serviceId, {
        quantity: orderData.quantity || 1,
        urgency: orderData.urgency || 'normal',
        clientOrderCount: orderData.clientOrderCount || 0,
        clientType: orderData.clientType || 'standard'
      }),
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.orders.set(order.id, order);
    
    // Atualizar contador de pedidos do serviço
    const service = this.services.get(order.serviceId);
    if (service) {
      service.orderCount++;
      service.updatedAt = Date.now();
    }
    
    this.emit('order_created', { order });
    
    return order.id;
  }

  /**
   * Busca serviços
   */
  searchServices(query, filters = {}) {
    let results = Array.from(this.services.values());

    // Filtrar por status
    if (filters.status) {
      results = results.filter(service => service.status === filters.status);
    }

    // Filtrar por categoria
    if (filters.category) {
      results = results.filter(service => service.category === filters.category);
    }

    // Filtrar por preço
    if (filters.minPrice) {
      results = results.filter(service => service.basePrice >= filters.minPrice);
    }
    if (filters.maxPrice) {
      results = results.filter(service => service.basePrice <= filters.maxPrice);
    }

    // Filtrar por rating
    if (filters.minRating) {
      results = results.filter(service => service.rating >= filters.minRating);
    }

    // Buscar por texto
    if (query) {
      const searchTerm = query.toLowerCase();
      results = results.filter(service => 
        service.name.toLowerCase().includes(searchTerm) ||
        service.description.toLowerCase().includes(searchTerm) ||
        service.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }

    // Ordenar resultados
    const sortBy = filters.sortBy || 'rating';
    switch (sortBy) {
      case 'price_low':
        results.sort((a, b) => a.basePrice - b.basePrice);
        break;
      case 'price_high':
        results.sort((a, b) => b.basePrice - a.basePrice);
        break;
      case 'rating':
        results.sort((a, b) => b.rating - a.rating);
        break;
      case 'popularity':
        results.sort((a, b) => b.orderCount - a.orderCount);
        break;
      case 'newest':
        results.sort((a, b) => b.createdAt - a.createdAt);
        break;
    }

    return results;
  }

  /**
   * Obtém serviço
   */
  getService(serviceId) {
    return this.services.get(serviceId);
  }

  /**
   * Obtém todos os serviços
   */
  getAllServices() {
    return Array.from(this.services.values());
  }

  /**
   * Obtém categorias
   */
  getCategories() {
    return Array.from(this.categories.values());
  }

  /**
   * Obtém avaliações
   */
  getReviews(serviceId) {
    return this.reviews.get(serviceId) || [];
  }

  /**
   * Obtém pedidos
   */
  getOrders(clientId = null) {
    if (clientId) {
      return Array.from(this.orders.values()).filter(order => order.clientId === clientId);
    }
    return Array.from(this.orders.values());
  }

  /**
   * Obtém estatísticas do marketplace
   */
  getMarketplaceStats() {
    const totalServices = this.services.size;
    const activeServices = Array.from(this.services.values()).filter(s => s.status === 'active').length;
    const totalOrders = this.orders.size;
    const totalReviews = Array.from(this.reviews.values()).reduce((sum, reviews) => sum + reviews.length, 0);
    const averageRating = Array.from(this.services.values()).reduce((sum, service) => sum + service.rating, 0) / totalServices;

    return {
      totalServices,
      activeServices,
      totalOrders,
      totalReviews,
      averageRating: averageRating.toFixed(2),
      categories: this.categories.size,
      providers: this.providers.size
    };
  }
}

// Instância singleton
export const serviceCatalog = new ServiceCatalog();

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.serviceCatalog = serviceCatalog;
}

