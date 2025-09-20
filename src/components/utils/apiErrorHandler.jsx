/**
 * API Error Handler Utilitário
 * Intercepta erros genéricos e padroniza respostas
 */

import { createHash } from 'node:crypto';

// Tipos de erro mapeados
export const ERROR_TYPES = {
  VALIDATION_ERROR: 'ValidationError',
  AUTH_ERROR: 'AuthenticationError', 
  AUTHZ_ERROR: 'AuthorizationError',
  NOT_FOUND: 'NotFoundError',
  EXPIRED: 'ExpiredError',
  REVOKED: 'RevokedError',
  RATE_LIMIT: 'RateLimitError',
  CONFLICT: 'ConflictError',
  INTERNAL: 'InternalError'
};

// Mapeamento de tipos para códigos HTTP
const ERROR_STATUS_MAP = {
  [ERROR_TYPES.VALIDATION_ERROR]: 400,
  [ERROR_TYPES.AUTH_ERROR]: 401,
  [ERROR_TYPES.AUTHZ_ERROR]: 403,
  [ERROR_TYPES.NOT_FOUND]: 404,
  [ERROR_TYPES.CONFLICT]: 409,
  [ERROR_TYPES.EXPIRED]: 410,
  [ERROR_TYPES.REVOKED]: 410,
  [ERROR_TYPES.RATE_LIMIT]: 429,
  [ERROR_TYPES.INTERNAL]: 500
};

/**
 * Cria um Request ID único para rastreamento
 */
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
}

/**
 * Remove informações sensíveis dos dados de log
 */
function sanitizeForLog(data) {
  if (!data || typeof data !== 'object') return data;
  
  const sanitized = { ...data };
  const sensitiveFields = [
    'password', 'token', 'secret', 'key', 'hash',
    'email', 'phone', 'cpf', 'cnpj', 'ip'
  ];
  
  sensitiveFields.forEach(field => {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  return sanitized;
}

/**
 * Detecta tipo de erro baseado na mensagem/stack
 */
function detectErrorType(error) {
  const message = error.message?.toLowerCase() || '';
  const name = error.name?.toLowerCase() || '';
  
  // Validação
  if (message.includes('validation') || message.includes('invalid') || 
      message.includes('required') || message.includes('missing')) {
    return ERROR_TYPES.VALIDATION_ERROR;
  }
  
  // Autenticação
  if (message.includes('unauthorized') || message.includes('authentication') ||
      message.includes('login') || name.includes('auth')) {
    return ERROR_TYPES.AUTH_ERROR;
  }
  
  // Autorização  
  if (message.includes('forbidden') || message.includes('permission') ||
      message.includes('access denied')) {
    return ERROR_TYPES.AUTHZ_ERROR;
  }
  
  // Not Found
  if (message.includes('not found') || message.includes('does not exist') ||
      name.includes('notfound')) {
    return ERROR_TYPES.NOT_FOUND;
  }
  
  // Expirado
  if (message.includes('expired') || message.includes('timeout')) {
    return ERROR_TYPES.EXPIRED;
  }
  
  // Revogado
  if (message.includes('revoked') || message.includes('cancelled')) {
    return ERROR_TYPES.REVOKED;
  }
  
  // Rate Limit
  if (message.includes('rate limit') || message.includes('too many')) {
    return ERROR_TYPES.RATE_LIMIT;
  }
  
  // Conflict
  if (message.includes('conflict') || message.includes('already exists')) {
    return ERROR_TYPES.CONFLICT;
  }
  
  return ERROR_TYPES.INTERNAL;
}

/**
 * Gera mensagem segura para o usuário (sem expor detalhes internos)
 */
function generateSafeMessage(errorType, originalMessage) {
  const safeMessages = {
    [ERROR_TYPES.VALIDATION_ERROR]: 'Dados inválidos fornecidos',
    [ERROR_TYPES.AUTH_ERROR]: 'Falha na autenticação',
    [ERROR_TYPES.AUTHZ_ERROR]: 'Acesso negado',
    [ERROR_TYPES.NOT_FOUND]: 'Recurso não encontrado',
    [ERROR_TYPES.EXPIRED]: 'Recurso expirado',
    [ERROR_TYPES.REVOKED]: 'Acesso revogado',
    [ERROR_TYPES.RATE_LIMIT]: 'Muitas tentativas. Tente novamente mais tarde',
    [ERROR_TYPES.CONFLICT]: 'Conflito de dados',
    [ERROR_TYPES.INTERNAL]: 'Erro interno do servidor'
  };
  
  // Para erros de validação, podemos ser mais específicos
  if (errorType === ERROR_TYPES.VALIDATION_ERROR && 
      originalMessage && !originalMessage.includes('internal')) {
    return originalMessage;
  }
  
  return safeMessages[errorType] || safeMessages[ERROR_TYPES.INTERNAL];
}

/**
 * ErrorHandler principal - intercepta e padroniza erros
 */
export class APIErrorHandler {
  constructor(context = {}) {
    this.requestId = generateRequestId();
    this.context = sanitizeForLog(context);
  }
  
  /**
   * Processa um erro e retorna resposta padronizada
   */
  handle(error, customContext = {}) {
    const errorType = error.type || detectErrorType(error);
    const status = ERROR_STATUS_MAP[errorType] || 500;
    const safeMessage = generateSafeMessage(errorType, error.message);
    
    // Log estruturado
    const logLevel = status >= 500 ? 'ERROR' : status >= 400 ? 'WARN' : 'INFO';
    const logData = {
      timestamp: new Date().toISOString(),
      level: logLevel,
      request_id: this.requestId,
      error_type: errorType,
      status_code: status,
      message: error.message,
      stack: error.stack?.split('\n')[0], // Só primeira linha
      context: { ...this.context, ...sanitizeForLog(customContext) }
    };
    
    // Log sem PII
    console.log(JSON.stringify(logData));
    
    // Resposta padronizada
    const response = {
      success: false,
      error: {
        type: errorType,
        message: safeMessage,
        request_id: this.requestId
      }
    };
    
    // Adicionar detalhes extras para alguns tipos
    if (errorType === ERROR_TYPES.RATE_LIMIT && error.retryAfter) {
      response.error.retry_after = error.retryAfter;
    }
    
    if (errorType === ERROR_TYPES.VALIDATION_ERROR && error.details) {
      response.error.details = sanitizeForLog(error.details);
    }
    
    return new Response(JSON.stringify(response), {
      status,
      headers: { 
        'Content-Type': 'application/json',
        'X-Request-ID': this.requestId
      }
    });
  }
  
  /**
   * Wrapper para funções async - captura erros automaticamente
   */
  async wrap(fn, context = {}) {
    try {
      return await fn();
    } catch (error) {
      throw this.handle(error, context);
    }
  }
}

/**
 * Factory function para criar handler com contexto
 */
export function createErrorHandler(req, additionalContext = {}) {
  const context = {
    method: req.method,
    url: req.url,
    user_agent: req.headers.get('user-agent'),
    ...additionalContext
  };
  
  return new APIErrorHandler(context);
}

/**
 * Decorator para endpoints - aplica error handling automaticamente
 */
export function withErrorHandler(handler) {
  return async (req) => {
    const errorHandler = createErrorHandler(req);
    
    try {
      return await handler(req, errorHandler);
    } catch (error) {
      return errorHandler.handle(error);
    }
  };
}

// Tipos de erro personalizados para throw mais limpo
export class ValidationError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = 'ValidationError';
    this.type = ERROR_TYPES.VALIDATION_ERROR;
    this.details = details;
  }
}

export class NotFoundError extends Error {
  constructor(resource = 'Resource') {
    super(`${resource} not found`);
    this.name = 'NotFoundError'; 
    this.type = ERROR_TYPES.NOT_FOUND;
  }
}

export class ExpiredError extends Error {
  constructor(resource = 'Resource') {
    super(`${resource} has expired`);
    this.name = 'ExpiredError';
    this.type = ERROR_TYPES.EXPIRED;
  }
}

export class AuthorizationError extends Error {
  constructor(message = 'Access denied') {
    super(message);
    this.name = 'AuthorizationError';
    this.type = ERROR_TYPES.AUTHZ_ERROR;
  }
}