import { useState, useEffect, useCallback } from 'react';

/**
 * Hook customizado para fetching seguro com tratamento de estados
 */
export function useSafeFetcher(fetcherFn, dependencies = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const executeFetch = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    
    try {
      const result = await fetcherFn();
      setData(result || []);
      setError(null);
    } catch (err) {
      console.error('Erro no fetcher:', err);
      setError({
        message: err.message || 'Erro inesperado ao carregar dados',
        code: err.code || 'FETCH_ERROR'
      });
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [fetcherFn]);

  const retry = useCallback(() => {
    setRetryCount(prev => prev + 1);
    executeFetch(true);
  }, [executeFetch]);

  const refresh = useCallback(() => {
    executeFetch(false);
  }, [executeFetch]);

  useEffect(() => {
    executeFetch();
  }, [executeFetch, retryCount, ...dependencies]);

  return {
    data,
    loading,
    error,
    retry,
    refresh,
    isEmpty: !loading && (!data || (Array.isArray(data) && data.length === 0))
  };
}

/**
 * Hook para fazer chamadas de função com fallback seguro
 */
export function useSafeFunction(functionRef, fallback = () => {}) {
  const safeFunction = useCallback((...args) => {
    try {
      if (typeof functionRef === 'function') {
        return functionRef(...args);
      } else if (functionRef && typeof functionRef.call === 'function') {
        return functionRef(...args);
      } else {
        console.warn('[useSafeFunction] Function reference is invalid:', functionRef);
        return fallback(...args);
      }
    } catch (error) {
      console.error('[useSafeFunction] Error executing function:', error);
      return fallback(...args);
    }
  }, [functionRef, fallback]);

  return safeFunction;
}

/**
 * Hook para operações de escrita (create, update, delete) com proteção contra cliques duplos
 */
export function useSafeAction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const executeAction = useCallback(async (actionFn, options = {}) => {
    if (loading) {
      console.warn('Ação já está em execução, ignorando clique duplo');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await actionFn();
      
      if (options.onSuccess) {
        options.onSuccess(result);
      }
      
      return result;
    } catch (err) {
      console.error('Erro na ação:', err);
      const errorMessage = err.message || 'Erro inesperado ao executar ação';
      setError({
        message: errorMessage,
        code: err.code || 'ACTION_ERROR'
      });
      
      if (options.onError) {
        options.onError(err);
      }
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    executeAction,
    clearError
  };
}