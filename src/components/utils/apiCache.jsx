/**
 * Sistema de cache inteligente para APIs com rate limiting
 */
class ApiCache {
  constructor() {
    this.cache = new Map();
    this.pendingRequests = new Map();
    this.lastRequestTimes = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutos
    this.minInterval = 1000; // 1 segundo entre requisições da mesma API
  }

  // Gerar chave única para a requisição - CORRIGIDO para incluir query corretamente
  generateKey(entity, method, id = '', params = {}) {
    // Serializar params de forma consistente, incluindo query aninhada
    let paramStr = '';
    if (Object.keys(params).length > 0) {
      // Ordenar as chaves e serializar de forma consistente
      const sortedParams = Object.keys(params).sort().reduce((obj, key) => {
        obj[key] = params[key];
        return obj;
      }, {});
      paramStr = JSON.stringify(sortedParams);
    }
    
    const key = `${entity}:${method}:${id}:${paramStr}`;
    console.log(`[ApiCache] Generated cache key: ${key}`);
    return key;
  }

  // Verificar se dados estão no cache e são válidos
  get(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now > cached.expires) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  // Armazenar dados no cache
  set(key, data, ttl = this.defaultTTL) {
    const expires = Date.now() + ttl;
    this.cache.set(key, { data, expires });
  }

  // Verificar se podemos fazer uma nova requisição (throttling)
  canRequest(key) {
    const lastTime = this.lastRequestTimes.get(key);
    if (!lastTime) return true;

    return (Date.now() - lastTime) >= this.minInterval;
  }

  // Registrar que uma requisição foi feita
  recordRequest(key) {
    this.lastRequestTimes.set(key, Date.now());
  }

  // Verificar se já há uma requisição pendente
  hasPendingRequest(key) {
    return this.pendingRequests.has(key);
  }

  // Registrar requisição pendente
  setPendingRequest(key, promise) {
    this.pendingRequests.set(key, promise);
    
    // Remover quando completar
    promise.finally(() => {
      this.pendingRequests.delete(key);
    });

    return promise;
  }

  // Obter requisição pendente
  getPendingRequest(key) {
    return this.pendingRequests.get(key);
  }

  // Limpar cache
  clear() {
    this.cache.clear();
    this.pendingRequests.clear();
    this.lastRequestTimes.clear();
  }
}

// Instância global do cache
export const apiCache = new ApiCache();

/**
 * Wrapper para chamadas de API com cache e throttling
 */
export async function cachedApiCall(entity, method, id = '', params = {}, options = {}) {
  const { 
    ttl = 5 * 60 * 1000, // 5 minutos por padrão
    forceRefresh = false,
    maxRetries = 3,
    retryDelay = 1000
  } = options;

  const key = apiCache.generateKey(entity, method, id, params);

  // Verificar cache primeiro (se não forçar refresh)
  if (!forceRefresh) {
    const cached = apiCache.get(key);
    if (cached) {
      console.log(`[ApiCache] Cache hit for ${key}`);
      return cached;
    }
  }

  // Verificar se há requisição pendente
  if (apiCache.hasPendingRequest(key)) {
    console.log(`[ApiCache] Waiting for pending request: ${key}`);
    return apiCache.getPendingRequest(key);
  }

  // Verificar throttling
  if (!apiCache.canRequest(key)) {
    const waitTime = apiCache.minInterval - (Date.now() - apiCache.lastRequestTimes.get(key));
    console.log(`[ApiCache] Throttling request ${key}, waiting ${waitTime}ms`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  // Fazer a requisição
  const requestPromise = executeApiCall(entity, method, id, params, maxRetries, retryDelay);
  
  apiCache.setPendingRequest(key, requestPromise);
  apiCache.recordRequest(key);

  try {
    const result = await requestPromise;
    
    // Cachear resultado
    apiCache.set(key, result, ttl);
    console.log(`[ApiCache] Cached result for ${key}`);
    
    return result;
  } catch (error) {
    console.error(`[ApiCache] Request failed for ${key}:`, error);
    throw error;
  }
}

async function executeApiCall(entity, method, id, params, maxRetries, retryDelay) {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Importar a entidade dinamicamente
      const entityModule = await import(`@/api/entities/${entity}.js`);
      const Entity = entityModule[entity];

      let result;
      switch (method) {
        case 'get':
          result = await Entity.get(id);
          break;
        case 'list':
          result = await Entity.list(params.sort, params.limit);
          break;
        case 'filter':
          // CORRIGIDO: passar parâmetros corretos para filter
          result = await Entity.filter(params.query || {}, params.sort, params.limit);
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }

      return result;

    } catch (error) {
      lastError = error;
      
      // Se é rate limit, aumentar o delay exponencialmente
      if (error.message?.includes('429') || error.message?.includes('Rate limit')) {
        const backoffDelay = retryDelay * Math.pow(2, attempt);
        console.log(`[ApiCache] Rate limit hit, attempt ${attempt + 1}/${maxRetries}, waiting ${backoffDelay}ms`);
        
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
          continue;
        }
      }
      
      // Para outros erros, não tentar novamente
      break;
    }
  }

  throw lastError;
}

export default apiCache;