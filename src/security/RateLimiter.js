import { EventEmitter } from 'events';

/**
 * Sistema de Rate Limiting
 * Implementa controle de taxa de requisições para prevenir abuso
 */
export class RateLimiter extends EventEmitter {
  constructor(options = {}) {
    super();
    this.windows = new Map();
    this.defaultWindow = options.defaultWindow || 60000; // 1 minuto
    this.defaultLimit = options.defaultLimit || 100; // 100 requests por minuto
    this.cleanupInterval = options.cleanupInterval || 300000; // 5 minutos
    this.isCleanupRunning = false;
    
    this.startCleanup();
  }

  /**
   * Inicia limpeza automática de janelas expiradas
   */
  startCleanup() {
    if (this.isCleanupRunning) return;
    
    this.isCleanupRunning = true;
    setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * Para limpeza automática
   */
  stopCleanup() {
    this.isCleanupRunning = false;
  }

  /**
   * Verifica se uma requisição é permitida
   */
  isAllowed(identifier, options = {}) {
    const {
      window = this.defaultWindow,
      limit = this.defaultLimit,
      skipIncrement = false
    } = options;

    const key = `${identifier}_${window}_${limit}`;
    const now = Date.now();
    const windowStart = now - window;

    // Obter ou criar janela
    if (!this.windows.has(key)) {
      this.windows.set(key, {
        requests: [],
        limit,
        window,
        createdAt: now
      });
    }

    const windowData = this.windows.get(key);
    
    // Limpar requisições antigas
    windowData.requests = windowData.requests.filter(
      timestamp => timestamp > windowStart
    );

    // Verificar se limite foi excedido
    const isAllowed = windowData.requests.length < limit;
    
    if (isAllowed && !skipIncrement) {
      windowData.requests.push(now);
    }

    // Emitir eventos
    if (isAllowed) {
      this.emit('allowed', { identifier, window, limit, remaining: limit - windowData.requests.length });
    } else {
      this.emit('blocked', { identifier, window, limit, count: windowData.requests.length });
    }

    return {
      allowed: isAllowed,
      remaining: Math.max(0, limit - windowData.requests.length),
      resetTime: windowData.requests.length > 0 ? windowData.requests[0] + window : now + window,
      count: windowData.requests.length
    };
  }

  /**
   * Obtém informações sobre uma janela
   */
  getWindowInfo(identifier, options = {}) {
    const {
      window = this.defaultWindow,
      limit = this.defaultLimit
    } = options;

    const key = `${identifier}_${window}_${limit}`;
    const windowData = this.windows.get(key);
    
    if (!windowData) {
      return {
        count: 0,
        remaining: limit,
        resetTime: Date.now() + window,
        limit
      };
    }

    const now = Date.now();
    const windowStart = now - window;
    const validRequests = windowData.requests.filter(
      timestamp => timestamp > windowStart
    );

    return {
      count: validRequests.length,
      remaining: Math.max(0, limit - validRequests.length),
      resetTime: validRequests.length > 0 ? validRequests[0] + window : now + window,
      limit
    };
  }

  /**
   * Limpa janelas expiradas
   */
  cleanup() {
    const now = Date.now();
    const expiredKeys = [];

    for (const [key, windowData] of this.windows) {
      const isExpired = now - windowData.createdAt > windowData.window * 2;
      if (isExpired) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => {
      this.windows.delete(key);
    });

    if (expiredKeys.length > 0) {
      this.emit('cleanup', { expiredCount: expiredKeys.length });
    }
  }

  /**
   * Reseta janela para um identificador
   */
  reset(identifier, options = {}) {
    const {
      window = this.defaultWindow,
      limit = this.defaultLimit
    } = options;

    const key = `${identifier}_${window}_${limit}`;
    this.windows.delete(key);
    
    this.emit('reset', { identifier, window, limit });
  }

  /**
   * Obtém estatísticas do rate limiter
   */
  getStats() {
    const stats = {
      totalWindows: this.windows.size,
      activeWindows: 0,
      totalRequests: 0,
      blockedRequests: 0
    };

    for (const [key, windowData] of this.windows) {
      const now = Date.now();
      const windowStart = now - windowData.window;
      const validRequests = windowData.requests.filter(
        timestamp => timestamp > windowStart
      );

      if (validRequests.length > 0) {
        stats.activeWindows++;
      }

      stats.totalRequests += validRequests.length;
      
      if (validRequests.length >= windowData.limit) {
        stats.blockedRequests++;
      }
    }

    return stats;
  }

  /**
   * Obtém todas as janelas ativas
   */
  getActiveWindows() {
    const activeWindows = [];
    const now = Date.now();

    for (const [key, windowData] of this.windows) {
      const windowStart = now - windowData.window;
      const validRequests = windowData.requests.filter(
        timestamp => timestamp > windowStart
      );

      if (validRequests.length > 0) {
        activeWindows.push({
          key,
          identifier: key.split('_')[0],
          window: windowData.window,
          limit: windowData.limit,
          count: validRequests.length,
          remaining: Math.max(0, windowData.limit - validRequests.length),
          resetTime: validRequests.length > 0 ? validRequests[0] + windowData.window : now + windowData.window
        });
      }
    }

    return activeWindows;
  }
}

/**
 * Middleware de Rate Limiting para Express
 */
export function createRateLimitMiddleware(rateLimiter, options = {}) {
  const {
    window = 60000, // 1 minuto
    limit = 100, // 100 requests por minuto
    keyGenerator = (req) => req.ip,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    onLimitReached = null
  } = options;

  return (req, res, next) => {
    const identifier = keyGenerator(req);
    const result = rateLimiter.isAllowed(identifier, { window, limit });

    // Adicionar headers de rate limit
    res.set({
      'X-RateLimit-Limit': limit,
      'X-RateLimit-Remaining': result.remaining,
      'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000)
    });

    if (!result.allowed) {
      if (onLimitReached) {
        onLimitReached(req, res, result);
      } else {
        res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded',
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
        });
      }
      return;
    }

    // Callback para decrementar contador em caso de erro
    if (skipFailedRequests) {
      const originalSend = res.send;
      res.send = function(data) {
        if (res.statusCode >= 400) {
          rateLimiter.isAllowed(identifier, { window, limit, skipIncrement: true });
        }
        return originalSend.call(this, data);
      };
    }

    next();
  };
}

/**
 * Hook de Rate Limiting para React
 */
export function useRateLimit(identifier, options = {}) {
  const {
    window = 60000,
    limit = 100,
    onLimitReached = null
  } = options;

  const [isAllowed, setIsAllowed] = useState(true);
  const [remaining, setRemaining] = useState(limit);
  const [resetTime, setResetTime] = useState(Date.now() + window);

  const checkLimit = useCallback(() => {
    const result = rateLimiter.isAllowed(identifier, { window, limit });
    
    setIsAllowed(result.allowed);
    setRemaining(result.remaining);
    setResetTime(result.resetTime);

    if (!result.allowed && onLimitReached) {
      onLimitReached(result);
    }

    return result.allowed;
  }, [identifier, window, limit, onLimitReached]);

  const reset = useCallback(() => {
    rateLimiter.reset(identifier, { window, limit });
    setIsAllowed(true);
    setRemaining(limit);
    setResetTime(Date.now() + window);
  }, [identifier, window, limit]);

  return {
    isAllowed,
    remaining,
    resetTime,
    checkLimit,
    reset
  };
}

// Instância singleton
export const rateLimiter = new RateLimiter({
  defaultWindow: 60000, // 1 minuto
  defaultLimit: 100, // 100 requests por minuto
  cleanupInterval: 300000 // 5 minutos
});

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.rateLimiter = rateLimiter;
}

