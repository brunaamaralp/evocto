import { toast } from 'sonner';

// Safe development detection
const isDevelopment = typeof window !== 'undefined' && window.location.hostname === 'localhost';

/**
 * Sistema centralizado de tratamento de erros específicos de IA
 * Production-ready error handling
 */

const AI_ERROR_TYPES = {
  EXTRACTION_FAILED: 'extraction_failed',
  PROMPT_TOO_LONG: 'prompt_too_long', 
  INVALID_RESPONSE: 'invalid_response',
  RATE_LIMIT: 'rate_limit',
  TIMEOUT: 'timeout',
  INSUFFICIENT_CONTEXT: 'insufficient_context',
  UNSUPPORTED_FORMAT: 'unsupported_format',
  NETWORK_ERROR: 'network_error',
  SERVER_ERROR: 'server_error',
  PROVIDER_UNAVAILABLE: 'provider_unavailable'
};

const AI_ERROR_MESSAGES = {
  [AI_ERROR_TYPES.TIMEOUT]: {
    title: 'Tempo Limite Excedido',
    message: 'O processamento demorou mais que o esperado. Tente novamente.',
    canRetry: true,
    fallbackAvailable: true
  },
  [AI_ERROR_TYPES.SERVER_ERROR]: {
    title: 'Serviço Temporariamente Indisponível',
    message: 'Nossos serviços estão temporariamente indisponíveis. Tente novamente em alguns minutos.',
    canRetry: true,
    fallbackAvailable: true
  },
  [AI_ERROR_TYPES.NETWORK_ERROR]: {
    title: 'Problema de Conectividade',
    message: 'Verifique sua conexão com a internet e tente novamente.',
    canRetry: true,
    fallbackAvailable: true
  },
  [AI_ERROR_TYPES.RATE_LIMIT]: {
    title: 'Muitas Solicitações',
    message: 'Aguarde alguns minutos antes de tentar novamente.',
    canRetry: false,
    fallbackAvailable: true
  }
};

/**
 * Classe para prevenção de duplicação (idempotência)
 */
class IdempotencyManager {
  constructor() {
    this.activeRequests = new Map();
    this.completedRequests = new Set();
  }

  generateKey(operation, params) {
    const sanitizedParams = {
      serviceId: params.serviceId,
      targetPeriod: params.targetPeriod,
      customerId: params.customerId,
      mode: params.mode
    };
    return `${operation}_${JSON.stringify(sanitizedParams)}`;
  }

  isRequestActive(key) {
    return this.activeRequests.has(key);
  }

  startRequest(key, abortController) {
    this.activeRequests.set(key, {
      controller: abortController,
      startTime: Date.now()
    });
  }

  finishRequest(key, success = true) {
    this.activeRequests.delete(key);
    if (success) {
      this.completedRequests.add(key);
      setTimeout(() => this.completedRequests.delete(key), 5 * 60 * 1000);
    }
  }

  wasRecentlyCompleted(key) {
    return this.completedRequests.has(key);
  }

  abortActiveRequest(key) {
    const request = this.activeRequests.get(key);
    if (request) {
      request.controller.abort();
      this.activeRequests.delete(key);
    }
  }

  cleanup() {
    const now = Date.now();
    for (const [key, request] of this.activeRequests.entries()) {
      if (now - request.startTime > 2 * 60 * 1000) {
        request.controller.abort();
        this.activeRequests.delete(key);
      }
    }
  }
}

const idempotencyManager = new IdempotencyManager();
setInterval(() => idempotencyManager.cleanup(), 60 * 1000);

export const withRobustAICall = async (
  operation,
  aiFunction,
  params = {},
  options = {}
) => {
  const {
    maxRetries = 3,
    timeoutMs = 45000,
    minBackoffMs = 1000,
    maxBackoffMs = 8000,
    enableIdempotency = true
  } = options;

  let idempotencyKey = null;
  let abortController = new AbortController();

  try {
    if (enableIdempotency) {
      idempotencyKey = idempotencyManager.generateKey(operation, params);
      
      if (idempotencyManager.isRequestActive(idempotencyKey)) {
        throw new Error('DUPLICATE_REQUEST: Operação já está sendo executada');
      }
      
      if (idempotencyManager.wasRecentlyCompleted(idempotencyKey)) {
        throw new Error('RECENTLY_COMPLETED: Operação foi completada recentemente');
      }

      idempotencyManager.startRequest(idempotencyKey, abortController);
    }

    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs)
        );
        
        const abortPromise = new Promise((_, reject) => {
          abortController.signal.addEventListener('abort', () => {
            reject(new Error('ABORTED'));
          });
        });

        // Only log attempts in development
        if (isDevelopment) {
          console.log(`[AI-Robust] Tentativa ${attempt}/${maxRetries} para ${operation}`);
        }
        
        const result = await Promise.race([
          aiFunction({ ...params, attempt }),
          timeoutPromise,
          abortPromise
        ]);

        if (enableIdempotency && idempotencyKey) {
          idempotencyManager.finishRequest(idempotencyKey, true);
        }

        if (isDevelopment) {
          console.log(`[AI-Robust] Sucesso na tentativa ${attempt} para ${operation}`);
        }
        
        return { success: true, result, attempt, totalTime: Date.now() };

      } catch (error) {
        lastError = error;
        
        // Only log detailed errors in development
        if (isDevelopment) {
          console.warn(`[AI-Robust] Falha na tentativa ${attempt}: ${error.message}`);
        }

        if (error.message === 'ABORTED') {
          break;
        }

        if (attempt === maxRetries) {
          break;
        }

        const backoffMs = Math.min(
          minBackoffMs * Math.pow(2, attempt - 1),
          maxBackoffMs
        );
        const jitterMs = Math.random() * 1000;
        
        await new Promise(resolve => setTimeout(resolve, backoffMs + jitterMs));
        abortController = new AbortController();
        if (enableIdempotency && idempotencyKey) {
          idempotencyManager.startRequest(idempotencyKey, abortController);
        }
      }
    }

    if (enableIdempotency && idempotencyKey) {
      idempotencyManager.finishRequest(idempotencyKey, false);
    }

    // Only log detailed errors in development
    if (isDevelopment) {
      console.error(`[AI-Robust] Todas as tentativas falharam para ${operation}`, lastError);
    }
    
    return { 
      success: false, 
      error: lastError, 
      attempts: maxRetries,
      fallbackRecommended: true 
    };

  } catch (error) {
    if (enableIdempotency && idempotencyKey) {
      idempotencyManager.finishRequest(idempotencyKey, false);
    }
    
    return { success: false, error, attempts: 0 };
  }
};

export const identifyAIErrorType = (error) => {
  if (!error) return null;
  
  const message = (error.message || '').toLowerCase();
  const status = error.status;
  
  if (message.includes('timeout') || message === 'timeout') {
    return AI_ERROR_TYPES.TIMEOUT;
  }
  
  if (status >= 500 && status < 600) {
    return AI_ERROR_TYPES.SERVER_ERROR;
  }
  
  if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
    return AI_ERROR_TYPES.NETWORK_ERROR;
  }
  
  if (status === 429 || message.includes('rate limit')) {
    return AI_ERROR_TYPES.RATE_LIMIT;
  }
  
  return null;
};

export const handleRobustAIError = (error, context = {}, options = {}) => {
  const errorType = identifyAIErrorType(error);
  const errorConfig = errorType ? AI_ERROR_MESSAGES[errorType] : null;
  
  if (errorConfig) {
    const actions = [];
    
    if (errorConfig.canRetry && options.onRetry) {
      actions.push({
        label: 'Tentar Novamente',
        onClick: options.onRetry
      });
    }
    
    if (errorConfig.fallbackAvailable && options.onFallback) {
      actions.push({
        label: 'Modo Manual',
        onClick: options.onFallback
      });
    }

    toast.error(errorConfig.title, {
      description: errorConfig.message,
      duration: 8000,
      action: actions.length > 0 ? actions[0] : undefined
    });

  } else {
    toast.error('Erro no processamento', {
      description: 'Ocorreu um problema inesperado. Nossa equipe foi notificada.',
      action: options.onRetry ? {
        label: 'Tentar Novamente',
        onClick: options.onRetry
      } : undefined
    });
  }
  
  return {
    type: errorType,
    config: errorConfig,
    canRetry: errorConfig?.canRetry ?? false,
    fallbackAvailable: errorConfig?.fallbackAvailable ?? false
  };
};

export { IdempotencyManager, idempotencyManager };