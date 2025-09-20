/**
 * 🚨 Sistema Unificado de Tratamento de Erros
 * 
 * Centraliza tratamento de erros com categorização e ações específicas
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useServerLogger } from '@/utils/serverLogger';
import { loggingAPI } from '@/api/loggingAPI';

// Tipos para categorização de erros
export type ErrorCategory = 
  | 'validation'
  | 'network'
  | 'authentication'
  | 'authorization'
  | 'not_found'
  | 'conflict'
  | 'server'
  | 'unknown';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ErrorInfo {
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  originalError?: any;
  context?: Record<string, any>;
  timestamp: number;
  userId?: string;
  action?: string;
}

export interface ErrorHandlingOptions {
  showToast?: boolean;
  logToConsole?: boolean;
  logToServer?: boolean;
  retryable?: boolean;
  fallbackAction?: () => void;
  customMessage?: string;
}

// Configurações de tratamento por categoria
const ERROR_CONFIGS: Record<ErrorCategory, {
  severity: ErrorSeverity;
  userMessage: string;
  retryable: boolean;
  showToast: boolean;
}> = {
  validation: {
    severity: 'medium',
    userMessage: 'Dados inválidos. Verifique as informações preenchidas.',
    retryable: false,
    showToast: true
  },
  network: {
    severity: 'high',
    userMessage: 'Erro de conexão. Verifique sua internet e tente novamente.',
    retryable: true,
    showToast: true
  },
  authentication: {
    severity: 'high',
    userMessage: 'Sessão expirada. Faça login novamente.',
    retryable: false,
    showToast: true
  },
  authorization: {
    severity: 'high',
    userMessage: 'Você não tem permissão para realizar esta ação.',
    retryable: false,
    showToast: true
  },
  not_found: {
    severity: 'medium',
    userMessage: 'Recurso não encontrado.',
    retryable: false,
    showToast: true
  },
  conflict: {
    severity: 'medium',
    userMessage: 'Conflito de dados. O recurso pode já existir.',
    retryable: false,
    showToast: true
  },
  server: {
    severity: 'critical',
    userMessage: 'Erro interno do servidor. Tente novamente em alguns minutos.',
    retryable: true,
    showToast: true
  },
  unknown: {
    severity: 'medium',
    userMessage: 'Erro inesperado. Tente novamente.',
    retryable: true,
    showToast: true
  }
};

export function useErrorHandling() {
  const [errors, setErrors] = useState<ErrorInfo[]>([]);
  const [isRetrying, setIsRetrying] = useState(false);
  const serverLogger = useServerLogger();

  // Categorizar erro automaticamente
  const categorizeError = useCallback((error: any): ErrorCategory => {
    if (!error) return 'unknown';

    const message = error.message?.toLowerCase() || '';
    const status = error.status || error.response?.status;

    // Categorização por status HTTP
    if (status) {
      switch (status) {
        case 400:
          return 'validation';
        case 401:
          return 'authentication';
        case 403:
          return 'authorization';
        case 404:
          return 'not_found';
        case 409:
          return 'conflict';
        case 500:
        case 502:
        case 503:
          return 'server';
        default:
          if (status >= 400 && status < 500) return 'validation';
          if (status >= 500) return 'server';
      }
    }

    // Categorização por mensagem
    if (message.includes('network') || message.includes('fetch')) {
      return 'network';
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return 'validation';
    }
    if (message.includes('unauthorized') || message.includes('token')) {
      return 'authentication';
    }
    if (message.includes('permission') || message.includes('forbidden')) {
      return 'authorization';
    }
    if (message.includes('not found') || message.includes('does not exist')) {
      return 'not_found';
    }
    if (message.includes('conflict') || message.includes('already exists')) {
      return 'conflict';
    }

    return 'unknown';
  }, []);

  // Determinar severidade baseada no contexto
  const determineSeverity = useCallback((category: ErrorCategory, context?: Record<string, any>): ErrorSeverity => {
    const baseSeverity = ERROR_CONFIGS[category].severity;

    // Ajustar severidade baseada no contexto
    if (context?.critical) return 'critical';
    if (context?.userAction === 'delete') return 'high';
    if (context?.userAction === 'create' && category === 'validation') return 'medium';
    if (context?.retryCount > 3) return 'critical';

    return baseSeverity;
  }, []);

  // Tratar erro principal com logging no servidor
  const handleError = useCallback(async (
    error: any,
    context?: Record<string, any>,
    options: ErrorHandlingOptions = {}
  ): Promise<ErrorInfo> => {
    const category = categorizeError(error);
    const severity = determineSeverity(category, context);
    const config = ERROR_CONFIGS[category];

    const errorInfo: ErrorInfo = {
      category,
      severity,
      message: options.customMessage || config.userMessage,
      originalError: error,
      context,
      timestamp: Date.now(),
      userId: context?.userId,
      action: context?.action
    };

    // Adicionar à lista de erros local
    setErrors(prev => [...prev.slice(-9), errorInfo]); // Manter apenas últimos 10 erros

    // Log no servidor se habilitado
    if (options.logToServer !== false && config.showToast) {
      try {
        const logLevel = severity === 'critical' ? 'critical' : 
                        severity === 'high' ? 'error' : 
                        severity === 'medium' ? 'warn' : 'info';

        await serverLogger[logLevel](
          errorInfo.message,
          error,
          {
            category: errorInfo.category,
            severity: errorInfo.severity,
            userId: errorInfo.userId,
            agencyId: context?.agencyId,
            action: errorInfo.action,
            serviceId: context?.serviceId,
            clientId: context?.clientId,
            ...context
          },
          {
            requestId: context?.requestId,
            retryCount: context?.retryCount,
            duration: context?.duration,
            tags: context?.tags
          }
        );
      } catch (loggingError) {
        console.warn('Falha ao logar erro no servidor:', loggingError);
      }
    }

    // Log no console se habilitado
    if (options.logToConsole !== false) {
      console.error(`[${category.toUpperCase()}] ${errorInfo.message}`, {
        error: error,
        context: context,
        severity: severity
      });
    }

    // Mostrar toast se habilitado
    if (options.showToast !== false && config.showToast) {
      const toastOptions: any = {
        description: errorInfo.message
      };

      // Adicionar ação de retry se aplicável
      if (config.retryable && options.retryable !== false) {
        toastOptions.action = {
          label: 'Tentar Novamente',
          onClick: () => {
            if (options.fallbackAction) {
              options.fallbackAction();
            }
          }
        };
      }

      // Escolher tipo de toast baseado na severidade
      switch (severity) {
        case 'critical':
          toast.error('Erro Crítico', toastOptions);
          break;
        case 'high':
          toast.error('Erro', toastOptions);
          break;
        case 'medium':
          toast.warning('Atenção', toastOptions);
          break;
        case 'low':
          toast.info('Informação', toastOptions);
          break;
      }
    }

    return errorInfo;
  }, [categorizeError, determineSeverity, serverLogger]);

  // Tratar erro com retry automático
  const handleErrorWithRetry = useCallback(async (
    error: any,
    retryFunction: () => Promise<any>,
    context?: Record<string, any>,
    maxRetries: number = 3
  ): Promise<any> => {
    const retryCount = context?.retryCount || 0;

    if (retryCount >= maxRetries) {
      return handleError(error, { ...context, retryCount }, {
        customMessage: `Falha após ${maxRetries} tentativas. Operação cancelada.`
      });
    }

    const errorInfo = handleError(error, { ...context, retryCount }, {
      showToast: retryCount === 0, // Mostrar toast apenas na primeira tentativa
      retryable: true,
      fallbackAction: async () => {
        setIsRetrying(true);
        try {
          await retryFunction();
        } catch (retryError) {
          await handleErrorWithRetry(retryError, retryFunction, { ...context, retryCount: retryCount + 1 }, maxRetries);
        } finally {
          setIsRetrying(false);
        }
      }
    });

    return errorInfo;
  }, [handleError]);

  // Tratar erro de validação específico
  const handleValidationError = useCallback((errors: string[], context?: Record<string, any>) => {
    const errorMessage = errors.join('; ');
    return handleError(
      new Error(errorMessage),
      { ...context, validationErrors: errors },
      {
        customMessage: 'Corrija os erros antes de continuar:',
        showToast: true
      }
    );
  }, [handleError]);

  // Tratar erro de rede específico
  const handleNetworkError = useCallback((error: any, context?: Record<string, any>) => {
    return handleError(error, { ...context, networkError: true }, {
      customMessage: 'Erro de conexão. Verifique sua internet e tente novamente.',
      retryable: true
    });
  }, [handleError]);

  // Limpar erros
  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  // Obter estatísticas de erros
  const getErrorStats = useCallback(() => {
    const stats = {
      total: errors.length,
      byCategory: {} as Record<ErrorCategory, number>,
      bySeverity: {} as Record<ErrorSeverity, number>,
      recent: errors.filter(e => Date.now() - e.timestamp < 60000).length, // Últimos 60 segundos
      critical: errors.filter(e => e.severity === 'critical').length
    };

    errors.forEach(error => {
      stats.byCategory[error.category] = (stats.byCategory[error.category] || 0) + 1;
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
    });

    return stats;
  }, [errors]);

  // Verificar se há erros críticos
  const hasCriticalErrors = useCallback(() => {
    return errors.some(error => error.severity === 'critical');
  }, [errors]);


  // Obter logs do servidor
  const getServerLogs = useCallback(async (filter: any = {}) => {
    try {
      const response = await loggingAPI.getLogs(filter);
      return response.success ? response.logs : [];
    } catch (error) {
      console.error('Erro ao buscar logs do servidor:', error);
      return [];
    }
  }, []);

  // Obter estatísticas de logs
  const getLogStats = useCallback(async () => {
    try {
      const response = await loggingAPI.getStats();
      return response.success ? response.stats : null;
    } catch (error) {
      console.error('Erro ao obter estatísticas de logs:', error);
      return null;
    }
  }, []);

  // Obter logs críticos
  const getCriticalLogs = useCallback(async (limit: number = 10) => {
    try {
      const response = await loggingAPI.getCriticalLogs(limit);
      return response.success ? response.logs : [];
    } catch (error) {
      console.error('Erro ao buscar logs críticos:', error);
      return [];
    }
  }, []);

  // Obter erros recentes
  const getRecentErrors = useCallback(async (hours: number = 24, limit: number = 50) => {
    try {
      const response = await loggingAPI.getRecentErrors(hours, limit);
      return response.success ? response.logs : [];
    } catch (error) {
      console.error('Erro ao buscar erros recentes:', error);
      return [];
    }
  }, []);

  return {
    // Estado
    errors,
    isRetrying,
    
    // Ações principais
    handleError,
    handleErrorWithRetry,
    handleValidationError,
    handleNetworkError,
    
    // Utilitários
    clearErrors,
    getErrorStats,
    hasCriticalErrors,
    getRecentErrors,
    
    // Logging no servidor
    getServerLogs,
    getLogStats,
    getCriticalLogs,
    
    // Constantes
    ERROR_CONFIGS
  };
}

// Hook para tratamento de erro específico de formulários
export function useFormErrorHandling() {
  const { handleValidationError, handleError } = useErrorHandling();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const setFieldError = useCallback((field: string, error: string) => {
    setFieldErrors(prev => ({ ...prev, [field]: error }));
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const clearAllFieldErrors = useCallback(() => {
    setFieldErrors({});
  }, []);

  const handleFormError = useCallback((error: any, context?: Record<string, any>) => {
    // Se for erro de validação com detalhes de campo
    if (error.fieldErrors) {
      setFieldErrors(error.fieldErrors);
      return handleValidationError(
        Object.values(error.fieldErrors),
        { ...context, fieldErrors: error.fieldErrors }
      );
    }

    // Erro geral do formulário
    return handleError(error, context);
  }, [handleValidationError, handleError]);

  return {
    fieldErrors,
    setFieldError,
    clearFieldError,
    clearAllFieldErrors,
    handleFormError
  };
}
