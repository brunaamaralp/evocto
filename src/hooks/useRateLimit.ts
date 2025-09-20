/**
 * ⏱️ Hook para Rate Limiting
 * 
 * Implementa rate limiting para prevenir spam e abuso
 */

import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  key?: string;
  onLimitReached?: () => void;
}

export interface RateLimitState {
  isLimited: boolean;
  remainingRequests: number;
  resetTime: number;
}

// Store global para rate limiting
const rateLimitStore = new Map<string, { requests: number[]; config: RateLimitConfig }>();

export function useRateLimit(config: RateLimitConfig) {
  const {
    maxRequests = 10,
    windowMs = 60000, // 1 minuto
    key = 'default',
    onLimitReached
  } = config;

  const [state, setState] = useState<RateLimitState>({
    isLimited: false,
    remainingRequests: maxRequests,
    resetTime: Date.now() + windowMs
  });

  const timeoutRef = useRef<NodeJS.Timeout>();

  // Verificar se pode fazer requisição
  const canMakeRequest = useCallback((): boolean => {
    const now = Date.now();
    const store = rateLimitStore.get(key) || { requests: [], config };
    
    // Limpar requisições antigas
    const validRequests = store.requests.filter(time => now - time < windowMs);
    
    // Verificar limite
    const isLimited = validRequests.length >= maxRequests;
    
    if (isLimited) {
      setState(prev => ({
        ...prev,
        isLimited: true,
        remainingRequests: 0,
        resetTime: Math.min(...validRequests) + windowMs
      }));
      
      onLimitReached?.();
      return false;
    }
    
    setState(prev => ({
      ...prev,
      isLimited: false,
      remainingRequests: maxRequests - validRequests.length,
      resetTime: now + windowMs
    }));
    
    return true;
  }, [maxRequests, windowMs, key, onLimitReached]);

  // Registrar requisição
  const recordRequest = useCallback((): boolean => {
    if (!canMakeRequest()) {
      return false;
    }
    
    const now = Date.now();
    const store = rateLimitStore.get(key) || { requests: [], config };
    
    store.requests.push(now);
    rateLimitStore.set(key, store);
    
    // Atualizar estado
    setState(prev => ({
      ...prev,
      remainingRequests: prev.remainingRequests - 1
    }));
    
    return true;
  }, [canMakeRequest, key]);

  // Resetar rate limit
  const reset = useCallback(() => {
    rateLimitStore.delete(key);
    setState({
      isLimited: false,
      remainingRequests: maxRequests,
      resetTime: Date.now() + windowMs
    });
  }, [key, maxRequests, windowMs]);

  // Executar função com rate limiting
  const executeWithRateLimit = useCallback(async <T>(
    fn: () => Promise<T>,
    options: {
      showToast?: boolean;
      toastMessage?: string;
    } = {}
  ): Promise<T | null> => {
    const { showToast = true, toastMessage = 'Muitas requisições. Tente novamente em alguns segundos.' } = options;
    
    if (!recordRequest()) {
      if (showToast) {
        toast.error(toastMessage);
      }
      return null;
    }
    
    try {
      return await fn();
    } catch (error) {
      throw error;
    }
  }, [recordRequest]);

  // Debounce com rate limiting
  const debounceWithRateLimit = useCallback(<T extends (...args: any[]) => any>(
    fn: T,
    delay: number = 300
  ): T => {
    let timeoutId: NodeJS.Timeout;
    
    return ((...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      
      timeoutId = setTimeout(() => {
        if (canMakeRequest()) {
          recordRequest();
          fn(...args);
        }
      }, delay);
    }) as T;
  }, [canMakeRequest, recordRequest]);

  return {
    state,
    canMakeRequest,
    recordRequest,
    reset,
    executeWithRateLimit,
    debounceWithRateLimit
  };
}

// Hook específico para formulários
export function useFormRateLimit(config: Partial<RateLimitConfig> = {}) {
  const rateLimit = useRateLimit({
    maxRequests: 5,
    windowMs: 30000, // 30 segundos
    key: 'form_submission',
    onLimitReached: () => {
      toast.error('Muitas tentativas de envio. Aguarde 30 segundos antes de tentar novamente.');
    },
    ...config
  });

  const submitWithRateLimit = useCallback(async <T>(
    submitFn: () => Promise<T>
  ): Promise<T | null> => {
    return rateLimit.executeWithRateLimit(submitFn, {
      showToast: true,
      toastMessage: 'Muitas tentativas de envio. Aguarde antes de tentar novamente.'
    });
  }, [rateLimit]);

  return {
    ...rateLimit,
    submitWithRateLimit
  };
}

// Hook específico para API calls
export function useAPIRateLimit(config: Partial<RateLimitConfig> = {}) {
  const rateLimit = useRateLimit({
    maxRequests: 20,
    windowMs: 60000, // 1 minuto
    key: 'api_calls',
    onLimitReached: () => {
      toast.error('Muitas requisições à API. Aguarde um minuto antes de tentar novamente.');
    },
    ...config
  });

  const callWithRateLimit = useCallback(async <T>(
    apiCall: () => Promise<T>
  ): Promise<T | null> => {
    return rateLimit.executeWithRateLimit(apiCall, {
      showToast: true,
      toastMessage: 'Muitas requisições à API. Aguarde antes de tentar novamente.'
    });
  }, [rateLimit]);

  return {
    ...rateLimit,
    callWithRateLimit
  };
}

// Hook específico para validação em tempo real
export function useValidationRateLimit(config: Partial<RateLimitConfig> = {}) {
  const rateLimit = useRateLimit({
    maxRequests: 30,
    windowMs: 10000, // 10 segundos
    key: 'validation',
    ...config
  });

  const validateWithRateLimit = useCallback(
    rateLimit.debounceWithRateLimit((validationFn: () => void) => {
      if (rateLimit.canMakeRequest()) {
        rateLimit.recordRequest();
        validationFn();
      }
    }, 300),
    [rateLimit]
  );

  return {
    ...rateLimit,
    validateWithRateLimit
  };
}

