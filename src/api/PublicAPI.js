import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

/**
 * Sistema de API RESTful
 * Implementa API pública com autenticação, rate limiting e documentação
 */
export class PublicAPI extends EventEmitter {
  constructor(options = {}) {
    super();
    this.endpoints = new Map();
    this.apiKeys = new Map();
    this.rateLimits = new Map();
    this.requests = new Map();
    this.documentation = new Map();
    this.webhooks = new Map();
    this.versions = new Map();
    
    this.initializeEndpoints();
    this.initializeRateLimits();
    this.initializeDocumentation();
  }

  /**
   * Inicializa endpoints da API
   */
  initializeEndpoints() {
    // Endpoints de Serviços
    this.endpoints.set('GET /api/v1/services', {
      method: 'GET',
      path: '/api/v1/services',
      description: 'Lista todos os serviços disponíveis',
      parameters: {
        query: {
          category: { type: 'string', description: 'Filtrar por categoria' },
          minPrice: { type: 'number', description: 'Preço mínimo' },
          maxPrice: { type: 'number', description: 'Preço máximo' },
          rating: { type: 'number', description: 'Rating mínimo' },
          limit: { type: 'number', description: 'Limite de resultados', default: 20 },
          offset: { type: 'number', description: 'Offset para paginação', default: 0 }
        }
      },
      response: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
            basePrice: { type: 'number' },
            currency: { type: 'string' },
            rating: { type: 'number' },
            reviewCount: { type: 'number' }
          }
        }
      },
      rateLimit: { requests: 100, window: 3600 }, // 100 requests por hora
      authentication: 'optional'
    });

    this.endpoints.set('GET /api/v1/services/:id', {
      method: 'GET',
      path: '/api/v1/services/:id',
      description: 'Obtém detalhes de um serviço específico',
      parameters: {
        path: {
          id: { type: 'string', description: 'ID do serviço', required: true }
        }
      },
      response: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          category: { type: 'string' },
          basePrice: { type: 'number' },
          currency: { type: 'string' },
          duration: { type: 'string' },
          deliverables: { type: 'array' },
          requirements: { type: 'array' },
          rating: { type: 'number' },
          reviewCount: { type: 'number' },
          orderCount: { type: 'number' }
        }
      },
      rateLimit: { requests: 200, window: 3600 },
      authentication: 'optional'
    });

    this.endpoints.set('POST /api/v1/services/:id/price', {
      method: 'POST',
      path: '/api/v1/services/:id/price',
      description: 'Calcula preço dinâmico para um serviço',
      parameters: {
        path: {
          id: { type: 'string', description: 'ID do serviço', required: true }
        },
        body: {
          quantity: { type: 'number', description: 'Quantidade', default: 1 },
          urgency: { type: 'string', description: 'Urgência', enum: ['low', 'normal', 'high', 'critical'] },
          clientType: { type: 'string', description: 'Tipo de cliente', enum: ['standard', 'premium', 'enterprise'] }
        }
      },
      response: {
        type: 'object',
        properties: {
          serviceId: { type: 'string' },
          basePrice: { type: 'number' },
          finalPrice: { type: 'number' },
          currency: { type: 'string' },
          appliedRules: { type: 'array' },
          calculatedAt: { type: 'number' }
        }
      },
      rateLimit: { requests: 50, window: 3600 },
      authentication: 'required'
    });

    // Endpoints de Pedidos
    this.endpoints.set('POST /api/v1/orders', {
      method: 'POST',
      path: '/api/v1/orders',
      description: 'Cria um novo pedido',
      parameters: {
        body: {
          serviceId: { type: 'string', description: 'ID do serviço', required: true },
          quantity: { type: 'number', description: 'Quantidade', default: 1 },
          urgency: { type: 'string', description: 'Urgência', enum: ['low', 'normal', 'high', 'critical'] },
          clientInfo: { type: 'object', description: 'Informações do cliente', required: true }
        }
      },
      response: {
        type: 'object',
        properties: {
          orderId: { type: 'string' },
          status: { type: 'string' },
          totalAmount: { type: 'number' },
          currency: { type: 'string' },
          createdAt: { type: 'number' }
        }
      },
      rateLimit: { requests: 20, window: 3600 },
      authentication: 'required'
    });

    this.endpoints.set('GET /api/v1/orders/:id', {
      method: 'GET',
      path: '/api/v1/orders/:id',
      description: 'Obtém detalhes de um pedido',
      parameters: {
        path: {
          id: { type: 'string', description: 'ID do pedido', required: true }
        }
      },
      response: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          serviceId: { type: 'string' },
          status: { type: 'string' },
          totalAmount: { type: 'number' },
          currency: { type: 'string' },
          createdAt: { type: 'number' },
          updatedAt: { type: 'number' }
        }
      },
      rateLimit: { requests: 100, window: 3600 },
      authentication: 'required'
    });

    // Endpoints de Avaliações
    this.endpoints.set('GET /api/v1/services/:id/reviews', {
      method: 'GET',
      path: '/api/v1/services/:id/reviews',
      description: 'Obtém avaliações de um serviço',
      parameters: {
        path: {
          id: { type: 'string', description: 'ID do serviço', required: true }
        },
        query: {
          limit: { type: 'number', description: 'Limite de resultados', default: 10 },
          offset: { type: 'number', description: 'Offset para paginação', default: 0 }
        }
      },
      response: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            rating: { type: 'number' },
            title: { type: 'string' },
            comment: { type: 'string' },
            createdAt: { type: 'number' }
          }
        }
      },
      rateLimit: { requests: 200, window: 3600 },
      authentication: 'optional'
    });

    this.endpoints.set('POST /api/v1/services/:id/reviews', {
      method: 'POST',
      path: '/api/v1/services/:id/reviews',
      description: 'Adiciona uma avaliação a um serviço',
      parameters: {
        path: {
          id: { type: 'string', description: 'ID do serviço', required: true }
        },
        body: {
          rating: { type: 'number', description: 'Rating de 1 a 5', required: true, minimum: 1, maximum: 5 },
          title: { type: 'string', description: 'Título da avaliação', required: true },
          comment: { type: 'string', description: 'Comentário da avaliação', required: true },
          pros: { type: 'array', description: 'Pontos positivos' },
          cons: { type: 'array', description: 'Pontos negativos' },
          wouldRecommend: { type: 'boolean', description: 'Recomendaria o serviço' }
        }
      },
      response: {
        type: 'object',
        properties: {
          reviewId: { type: 'string' },
          status: { type: 'string' },
          message: { type: 'string' }
        }
      },
      rateLimit: { requests: 10, window: 3600 },
      authentication: 'required'
    });

    // Endpoints de Categorias
    this.endpoints.set('GET /api/v1/categories', {
      method: 'GET',
      path: '/api/v1/categories',
      description: 'Lista todas as categorias de serviços',
      response: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            icon: { type: 'string' },
            color: { type: 'string' },
            serviceCount: { type: 'number' }
          }
        }
      },
      rateLimit: { requests: 200, window: 3600 },
      authentication: 'optional'
    });

    // Endpoints de Estatísticas
    this.endpoints.set('GET /api/v1/stats', {
      method: 'GET',
      path: '/api/v1/stats',
      description: 'Obtém estatísticas do marketplace',
      response: {
        type: 'object',
        properties: {
          totalServices: { type: 'number' },
          activeServices: { type: 'number' },
          totalOrders: { type: 'number' },
          totalReviews: { type: 'number' },
          averageRating: { type: 'number' },
          categories: { type: 'number' },
          providers: { type: 'number' }
        }
      },
      rateLimit: { requests: 100, window: 3600 },
      authentication: 'optional'
    });
  }

  /**
   * Inicializa limites de taxa
   */
  initializeRateLimits() {
    this.rateLimits.set('default', {
      requests: 100,
      window: 3600, // 1 hora
      burst: 10 // requests em burst
    });

    this.rateLimits.set('premium', {
      requests: 1000,
      window: 3600,
      burst: 50
    });

    this.rateLimits.set('enterprise', {
      requests: 10000,
      window: 3600,
      burst: 100
    });
  }

  /**
   * Inicializa documentação
   */
  initializeDocumentation() {
    this.documentation.set('v1', {
      version: 'v1',
      title: 'Evocto Marketplace API',
      description: 'API pública para acesso aos serviços do marketplace Evocto',
      baseUrl: 'https://api.evocto.com',
      contact: {
        name: 'Evocto Support',
        email: 'api@evocto.com',
        url: 'https://evocto.com/support'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      },
      endpoints: Array.from(this.endpoints.values()),
      authentication: {
        type: 'API Key',
        location: 'header',
        name: 'X-API-Key',
        description: 'Chave de API para autenticação'
      },
      rateLimiting: {
        description: 'Rate limiting baseado em chave de API',
        limits: Array.from(this.rateLimits.values())
      }
    });
  }

  /**
   * Gera chave de API
   */
  generateAPIKey(clientData) {
    const apiKey = {
      id: uuidv4(),
      key: `evocto_${uuidv4().replace(/-/g, '')}`,
      clientId: clientData.clientId,
      clientName: clientData.clientName,
      tier: clientData.tier || 'default',
      permissions: clientData.permissions || ['read'],
      rateLimit: this.rateLimits.get(clientData.tier || 'default'),
      status: 'active',
      createdAt: Date.now(),
      lastUsed: null,
      usageCount: 0
    };

    this.apiKeys.set(apiKey.key, apiKey);
    this.emit('api_key_generated', { apiKey });
    
    return apiKey;
  }

  /**
   * Valida chave de API
   */
  validateAPIKey(apiKey) {
    const keyData = this.apiKeys.get(apiKey);
    if (!keyData) {
      return { valid: false, error: 'Invalid API key' };
    }

    if (keyData.status !== 'active') {
      return { valid: false, error: 'API key is inactive' };
    }

    // Atualizar estatísticas de uso
    keyData.lastUsed = Date.now();
    keyData.usageCount++;
    this.apiKeys.set(apiKey, keyData);

    return { valid: true, keyData };
  }

  /**
   * Verifica rate limit
   */
  checkRateLimit(apiKey, endpoint) {
    const keyData = this.apiKeys.get(apiKey);
    if (!keyData) {
      return { allowed: false, error: 'Invalid API key' };
    }

    const endpointLimit = endpoint.rateLimit || keyData.rateLimit;
    const now = Date.now();
    const windowStart = now - (endpointLimit.window * 1000);

    // Obter ou criar registro de rate limit
    const rateLimitKey = `${apiKey}_${endpoint.path}`;
    if (!this.rateLimits.has(rateLimitKey)) {
      this.rateLimits.set(rateLimitKey, {
        requests: [],
        window: endpointLimit.window,
        limit: endpointLimit.requests
      });
    }

    const rateLimitData = this.rateLimits.get(rateLimitKey);
    
    // Limpar requests antigos
    rateLimitData.requests = rateLimitData.requests.filter(
      timestamp => timestamp > windowStart
    );

    // Verificar se limite foi excedido
    if (rateLimitData.requests.length >= endpointLimit.requests) {
      return {
        allowed: false,
        error: 'Rate limit exceeded',
        resetTime: rateLimitData.requests[0] + (endpointLimit.window * 1000),
        remaining: 0
      };
    }

    // Adicionar request atual
    rateLimitData.requests.push(now);
    this.rateLimits.set(rateLimitKey, rateLimitData);

    return {
      allowed: true,
      remaining: endpointLimit.requests - rateLimitData.requests.length,
      resetTime: now + (endpointLimit.window * 1000)
    };
  }

  /**
   * Processa requisição da API
   */
  async processRequest(method, path, headers, body, query) {
    const requestId = uuidv4();
    const startTime = Date.now();

    // Encontrar endpoint
    const endpoint = this.findEndpoint(method, path);
    if (!endpoint) {
      return this.createErrorResponse(404, 'Endpoint not found', requestId);
    }

    // Validar autenticação se necessária
    if (endpoint.authentication === 'required') {
      const apiKey = headers['x-api-key'];
      if (!apiKey) {
        return this.createErrorResponse(401, 'API key required', requestId);
      }

      const validation = this.validateAPIKey(apiKey);
      if (!validation.valid) {
        return this.createErrorResponse(401, validation.error, requestId);
      }

      // Verificar permissões
      if (!this.checkPermissions(validation.keyData, endpoint)) {
        return this.createErrorResponse(403, 'Insufficient permissions', requestId);
      }
    }

    // Verificar rate limit
    const rateLimitCheck = this.checkRateLimit(
      headers['x-api-key'] || 'anonymous',
      endpoint
    );
    
    if (!rateLimitCheck.allowed) {
      return this.createErrorResponse(429, rateLimitCheck.error, requestId, {
        'X-RateLimit-Remaining': rateLimitCheck.remaining || 0,
        'X-RateLimit-Reset': rateLimitCheck.resetTime || 0
      });
    }

    // Validar parâmetros
    const validation = this.validateParameters(endpoint, { path, query, body });
    if (!validation.valid) {
      return this.createErrorResponse(400, validation.error, requestId);
    }

    // Processar requisição
    try {
      const result = await this.executeEndpoint(endpoint, { path, query, body, headers });
      
      const response = {
        success: true,
        data: result,
        requestId,
        timestamp: Date.now(),
        processingTime: Date.now() - startTime
      };

      // Registrar requisição
      this.requests.set(requestId, {
        id: requestId,
        method,
        path,
        status: 200,
        processingTime: Date.now() - startTime,
        timestamp: Date.now()
      });

      this.emit('request_processed', { requestId, endpoint, result });

      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': rateLimitCheck.remaining,
          'X-RateLimit-Reset': rateLimitCheck.resetTime
        },
        body: JSON.stringify(response)
      };
    } catch (error) {
      return this.createErrorResponse(500, error.message, requestId);
    }
  }

  /**
   * Encontra endpoint
   */
  findEndpoint(method, path) {
    for (const [key, endpoint] of this.endpoints) {
      if (endpoint.method === method && this.matchPath(endpoint.path, path)) {
        return endpoint;
      }
    }
    return null;
  }

  /**
   * Verifica se path corresponde ao endpoint
   */
  matchPath(endpointPath, requestPath) {
    const endpointParts = endpointPath.split('/');
    const requestParts = requestPath.split('/');

    if (endpointParts.length !== requestParts.length) {
      return false;
    }

    for (let i = 0; i < endpointParts.length; i++) {
      if (endpointParts[i].startsWith(':')) {
        continue; // Parâmetro dinâmico
      }
      if (endpointParts[i] !== requestParts[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Verifica permissões
   */
  checkPermissions(keyData, endpoint) {
    // Implementar lógica de permissões baseada no endpoint
    if (endpoint.method === 'GET') {
      return keyData.permissions.includes('read');
    }
    if (endpoint.method === 'POST' || endpoint.method === 'PUT' || endpoint.method === 'DELETE') {
      return keyData.permissions.includes('write');
    }
    return true;
  }

  /**
   * Valida parâmetros
   */
  validateParameters(endpoint, params) {
    // Implementar validação de parâmetros
    return { valid: true };
  }

  /**
   * Executa endpoint
   */
  async executeEndpoint(endpoint, params) {
    // Simular execução do endpoint
    await new Promise(resolve => setTimeout(resolve, 100));

    switch (endpoint.path) {
      case '/api/v1/services':
        return this.getServices(params.query);
      case '/api/v1/services/:id':
        return this.getService(params.path.id);
      case '/api/v1/services/:id/price':
        return this.calculatePrice(params.path.id, params.body);
      case '/api/v1/orders':
        return this.createOrder(params.body);
      case '/api/v1/orders/:id':
        return this.getOrder(params.path.id);
      case '/api/v1/services/:id/reviews':
        if (params.method === 'GET') {
          return this.getReviews(params.path.id, params.query);
        } else {
          return this.createReview(params.path.id, params.body);
        }
      case '/api/v1/categories':
        return this.getCategories();
      case '/api/v1/stats':
        return this.getStats();
      default:
        throw new Error('Endpoint not implemented');
    }
  }

  /**
   * Implementações dos endpoints
   */
  async getServices(query) {
    // Simular busca de serviços
    return [
      {
        id: 'financial_diagnosis',
        name: 'Diagnóstico Financeiro Completo',
        description: 'Análise completa da saúde financeira da empresa',
        category: 'financial',
        basePrice: 5000,
        currency: 'BRL',
        rating: 4.8,
        reviewCount: 45
      }
    ];
  }

  async getService(id) {
    // Simular obtenção de serviço
    return {
      id,
      name: 'Serviço Exemplo',
      description: 'Descrição do serviço',
      category: 'financial',
      basePrice: 5000,
      currency: 'BRL',
      duration: '2-3 semanas',
      deliverables: ['Relatório', 'Análise'],
      requirements: ['Documentos'],
      rating: 4.8,
      reviewCount: 45,
      orderCount: 120
    };
  }

  async calculatePrice(serviceId, context) {
    // Simular cálculo de preço
    return {
      serviceId,
      basePrice: 5000,
      finalPrice: 5000,
      currency: 'BRL',
      appliedRules: [],
      calculatedAt: Date.now()
    };
  }

  async createOrder(orderData) {
    // Simular criação de pedido
    return {
      orderId: uuidv4(),
      status: 'pending',
      totalAmount: 5000,
      currency: 'BRL',
      createdAt: Date.now()
    };
  }

  async getOrder(id) {
    // Simular obtenção de pedido
    return {
      id,
      serviceId: 'financial_diagnosis',
      status: 'pending',
      totalAmount: 5000,
      currency: 'BRL',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  async getReviews(serviceId, query) {
    // Simular obtenção de avaliações
    return [
      {
        id: uuidv4(),
        rating: 5,
        title: 'Excelente serviço',
        comment: 'Muito satisfeito com o resultado',
        createdAt: Date.now()
      }
    ];
  }

  async createReview(serviceId, reviewData) {
    // Simular criação de avaliação
    return {
      reviewId: uuidv4(),
      status: 'created',
      message: 'Avaliação criada com sucesso'
    };
  }

  async getCategories() {
    // Simular obtenção de categorias
    return [
      {
        id: 'financial',
        name: 'Consultoria Financeira',
        description: 'Serviços especializados em gestão financeira',
        icon: 'dollar-sign',
        color: '#10b981',
        serviceCount: 3
      }
    ];
  }

  async getStats() {
    // Simular obtenção de estatísticas
    return {
      totalServices: 5,
      activeServices: 5,
      totalOrders: 320,
      totalReviews: 150,
      averageRating: 4.7,
      categories: 5,
      providers: 3
    };
  }

  /**
   * Cria resposta de erro
   */
  createErrorResponse(status, message, requestId, headers = {}) {
    const response = {
      success: false,
      error: {
        code: status,
        message,
        requestId,
        timestamp: Date.now()
      }
    };

    return {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(response)
    };
  }

  /**
   * Obtém documentação da API
   */
  getDocumentation(version = 'v1') {
    return this.documentation.get(version);
  }

  /**
   * Obtém estatísticas da API
   */
  getAPIStats() {
    const requests = Array.from(this.requests.values());
    const apiKeys = Array.from(this.apiKeys.values());
    
    const totalRequests = requests.length;
    const successfulRequests = requests.filter(r => r.status < 400).length;
    const averageProcessingTime = requests.reduce((sum, r) => sum + r.processingTime, 0) / totalRequests;

    return {
      totalRequests,
      successfulRequests,
      successRate: totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0,
      averageProcessingTime,
      activeAPIKeys: apiKeys.filter(k => k.status === 'active').length,
      totalAPIKeys: apiKeys.length
    };
  }
}

// Instância singleton
export const publicAPI = new PublicAPI();

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.publicAPI = publicAPI;
}

