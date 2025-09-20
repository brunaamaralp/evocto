/**
 * SDK para Desenvolvedores - Evocto Marketplace API
 * Biblioteca JavaScript para integração com a API pública
 */
export class EvoctoSDK {
  constructor(options = {}) {
    this.apiKey = options.apiKey;
    this.baseURL = options.baseURL || 'https://api.evocto.com';
    this.version = options.version || 'v1';
    this.timeout = options.timeout || 30000;
    this.retries = options.retries || 3;
    this.retryDelay = options.retryDelay || 1000;
    
    this.requestQueue = [];
    this.isProcessingQueue = false;
    this.rateLimitInfo = {
      remaining: null,
      resetTime: null
    };
  }

  /**
   * Configura a chave de API
   */
  setAPIKey(apiKey) {
    this.apiKey = apiKey;
    return this;
  }

  /**
   * Configura a URL base
   */
  setBaseURL(baseURL) {
    this.baseURL = baseURL;
    return this;
  }

  /**
   * Configura timeout
   */
  setTimeout(timeout) {
    this.timeout = timeout;
    return this;
  }

  /**
   * Lista todos os serviços
   */
  async getServices(options = {}) {
    const params = new URLSearchParams();
    
    if (options.category) params.append('category', options.category);
    if (options.minPrice) params.append('minPrice', options.minPrice);
    if (options.maxPrice) params.append('maxPrice', options.maxPrice);
    if (options.rating) params.append('rating', options.rating);
    if (options.limit) params.append('limit', options.limit);
    if (options.offset) params.append('offset', options.offset);

    return this.request('GET', `/api/${this.version}/services?${params.toString()}`);
  }

  /**
   * Obtém detalhes de um serviço
   */
  async getService(serviceId) {
    return this.request('GET', `/api/${this.version}/services/${serviceId}`);
  }

  /**
   * Calcula preço dinâmico para um serviço
   */
  async calculatePrice(serviceId, context = {}) {
    return this.request('POST', `/api/${this.version}/services/${serviceId}/price`, context);
  }

  /**
   * Cria um novo pedido
   */
  async createOrder(orderData) {
    return this.request('POST', `/api/${this.version}/orders`, orderData);
  }

  /**
   * Obtém detalhes de um pedido
   */
  async getOrder(orderId) {
    return this.request('GET', `/api/${this.version}/orders/${orderId}`);
  }

  /**
   * Lista avaliações de um serviço
   */
  async getReviews(serviceId, options = {}) {
    const params = new URLSearchParams();
    
    if (options.limit) params.append('limit', options.limit);
    if (options.offset) params.append('offset', options.offset);

    return this.request('GET', `/api/${this.version}/services/${serviceId}/reviews?${params.toString()}`);
  }

  /**
   * Adiciona uma avaliação a um serviço
   */
  async createReview(serviceId, reviewData) {
    return this.request('POST', `/api/${this.version}/services/${serviceId}/reviews`, reviewData);
  }

  /**
   * Lista todas as categorias
   */
  async getCategories() {
    return this.request('GET', `/api/${this.version}/categories`);
  }

  /**
   * Obtém estatísticas do marketplace
   */
  async getStats() {
    return this.request('GET', `/api/${this.version}/stats`);
  }

  /**
   * Executa requisição HTTP
   */
  async request(method, path, data = null) {
    const url = `${this.baseURL}${path}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'EvoctoSDK/1.0.0'
      },
      timeout: this.timeout
    };

    // Adicionar chave de API se disponível
    if (this.apiKey) {
      options.headers['X-API-Key'] = this.apiKey;
    }

    // Adicionar dados para POST/PUT
    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    // Executar requisição com retry
    return this.executeWithRetry(url, options);
  }

  /**
   * Executa requisição com retry automático
   */
  async executeWithRetry(url, options, attempt = 1) {
    try {
      const response = await this.fetchWithTimeout(url, options);
      
      // Atualizar informações de rate limit
      if (response.headers.get('X-RateLimit-Remaining')) {
        this.rateLimitInfo.remaining = parseInt(response.headers.get('X-RateLimit-Remaining'));
      }
      if (response.headers.get('X-RateLimit-Reset')) {
        this.rateLimitInfo.resetTime = parseInt(response.headers.get('X-RateLimit-Reset'));
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new EvoctoAPIError(
          response.status,
          errorData.error?.message || response.statusText,
          errorData.error?.requestId
        );
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      if (error instanceof EvoctoAPIError) {
        throw error;
      }

      // Retry em caso de erro de rede
      if (attempt < this.retries && this.isRetryableError(error)) {
        await this.delay(this.retryDelay * attempt);
        return this.executeWithRetry(url, options, attempt + 1);
      }

      throw new EvoctoAPIError(0, error.message);
    }
  }

  /**
   * Executa fetch com timeout
   */
  async fetchWithTimeout(url, options) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Verifica se erro é retryable
   */
  isRetryableError(error) {
    if (error.name === 'AbortError') return true;
    if (error.message.includes('network')) return true;
    if (error.message.includes('timeout')) return true;
    return false;
  }

  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Obtém informações de rate limit
   */
  getRateLimitInfo() {
    return { ...this.rateLimitInfo };
  }

  /**
   * Verifica se há rate limit disponível
   */
  hasRateLimitAvailable() {
    return this.rateLimitInfo.remaining === null || this.rateLimitInfo.remaining > 0;
  }

  /**
   * Obtém tempo até reset do rate limit
   */
  getRateLimitResetTime() {
    if (!this.rateLimitInfo.resetTime) return null;
    return this.rateLimitInfo.resetTime - Date.now();
  }
}

/**
 * Classe de erro personalizada
 */
export class EvoctoAPIError extends Error {
  constructor(status, message, requestId = null) {
    super(message);
    this.name = 'EvoctoAPIError';
    this.status = status;
    this.requestId = requestId;
  }
}

/**
 * Utilitários para o SDK
 */
export class EvoctoUtils {
  /**
   * Valida chave de API
   */
  static validateAPIKey(apiKey) {
    if (!apiKey) return false;
    if (typeof apiKey !== 'string') return false;
    if (!apiKey.startsWith('evocto_')) return false;
    if (apiKey.length < 20) return false;
    return true;
  }

  /**
   * Formata preço
   */
  static formatPrice(amount, currency = 'BRL') {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  /**
   * Formata data
   */
  static formatDate(timestamp) {
    return new Date(timestamp).toLocaleString('pt-BR');
  }

  /**
   * Calcula desconto percentual
   */
  static calculateDiscountPercentage(originalPrice, finalPrice) {
    if (originalPrice <= 0) return 0;
    return Math.round(((originalPrice - finalPrice) / originalPrice) * 100);
  }

  /**
   * Gera ID único
   */
  static generateId() {
    return 'evocto_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Valida dados de pedido
   */
  static validateOrderData(orderData) {
    const errors = [];

    if (!orderData.serviceId) {
      errors.push('serviceId é obrigatório');
    }

    if (!orderData.clientInfo) {
      errors.push('clientInfo é obrigatório');
    } else {
      if (!orderData.clientInfo.name) {
        errors.push('clientInfo.name é obrigatório');
      }
      if (!orderData.clientInfo.email) {
        errors.push('clientInfo.email é obrigatório');
      }
    }

    if (orderData.quantity && orderData.quantity < 1) {
      errors.push('quantity deve ser maior que 0');
    }

    if (orderData.urgency && !['low', 'normal', 'high', 'critical'].includes(orderData.urgency)) {
      errors.push('urgency deve ser low, normal, high ou critical');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Valida dados de avaliação
   */
  static validateReviewData(reviewData) {
    const errors = [];

    if (!reviewData.rating || reviewData.rating < 1 || reviewData.rating > 5) {
      errors.push('rating deve ser entre 1 e 5');
    }

    if (!reviewData.title || reviewData.title.trim().length < 3) {
      errors.push('title deve ter pelo menos 3 caracteres');
    }

    if (!reviewData.comment || reviewData.comment.trim().length < 10) {
      errors.push('comment deve ter pelo menos 10 caracteres');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * Exemplos de uso do SDK
 */
export class EvoctoExamples {
  /**
   * Exemplo básico de uso
   */
  static async basicExample() {
    const sdk = new EvoctoSDK({
      apiKey: 'evocto_your_api_key_here',
      baseURL: 'https://api.evocto.com'
    });

    try {
      // Listar serviços
      const services = await sdk.getServices({ category: 'financial' });
      console.log('Serviços:', services);

      // Obter detalhes de um serviço
      const service = await sdk.getService('financial_diagnosis');
      console.log('Serviço:', service);

      // Calcular preço
      const pricing = await sdk.calculatePrice('financial_diagnosis', {
        quantity: 1,
        urgency: 'normal'
      });
      console.log('Preço:', pricing);

    } catch (error) {
      console.error('Erro:', error.message);
    }
  }

  /**
   * Exemplo de criação de pedido
   */
  static async orderExample() {
    const sdk = new EvoctoSDK({
      apiKey: 'evocto_your_api_key_here'
    });

    try {
      const order = await sdk.createOrder({
        serviceId: 'financial_diagnosis',
        quantity: 1,
        urgency: 'normal',
        clientInfo: {
          name: 'João Silva',
          email: 'joao@empresa.com',
          company: 'Empresa ABC'
        }
      });

      console.log('Pedido criado:', order);
    } catch (error) {
      console.error('Erro ao criar pedido:', error.message);
    }
  }

  /**
   * Exemplo de avaliação
   */
  static async reviewExample() {
    const sdk = new EvoctoSDK({
      apiKey: 'evocto_your_api_key_here'
    });

    try {
      const review = await sdk.createReview('financial_diagnosis', {
        rating: 5,
        title: 'Excelente serviço',
        comment: 'Muito satisfeito com o diagnóstico financeiro',
        pros: ['Análise detalhada', 'Recomendações práticas'],
        cons: ['Demorou um pouco'],
        wouldRecommend: true
      });

      console.log('Avaliação criada:', review);
    } catch (error) {
      console.error('Erro ao criar avaliação:', error.message);
    }
  }
}

// Exportar classes principais
export { EvoctoSDK as default, EvoctoAPIError, EvoctoUtils, EvoctoExamples };

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.EvoctoSDK = EvoctoSDK;
  window.EvoctoAPIError = EvoctoAPIError;
  window.EvoctoUtils = EvoctoUtils;
  window.EvoctoExamples = EvoctoExamples;
}

