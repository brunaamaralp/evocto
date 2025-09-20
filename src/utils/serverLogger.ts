/**
 * 📊 Sistema de Logging de Erros no Servidor
 * 
 * Centraliza o logging de erros com categorização, severidade e contexto
 */

// Tipos para logging
export interface LogEntry {
  id: string;
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  category: 'validation' | 'network' | 'authentication' | 'authorization' | 'not_found' | 'conflict' | 'server' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  context: {
    userId?: string;
    agencyId?: string;
    action?: string;
    serviceId?: string;
    clientId?: string;
    userAgent?: string;
    ip?: string;
    sessionId?: string;
    [key: string]: any;
  };
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
    status?: number;
  };
  metadata?: {
    requestId?: string;
    duration?: number;
    retryCount?: number;
    tags?: string[];
    [key: string]: any;
  };
}

export interface LogFilter {
  level?: string[];
  category?: string[];
  severity?: string[];
  userId?: string;
  agencyId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface LogStats {
  total: number;
  byLevel: Record<string, number>;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
  recent: number;
  critical: number;
  trends: {
    hourly: Record<string, number>;
    daily: Record<string, number>;
  };
}

// Configurações de logging
const LOG_CONFIG = {
  // Níveis de log por ambiente
  levels: {
    development: ['debug', 'info', 'warn', 'error', 'critical'],
    staging: ['info', 'warn', 'error', 'critical'],
    production: ['warn', 'error', 'critical']
  },
  
  // Categorias que devem ser logadas no servidor
  serverLogCategories: ['critical', 'high'],
  
  // Rate limiting para evitar spam
  rateLimits: {
    perMinute: 100,
    perHour: 1000,
    perDay: 10000
  },
  
  // Retenção de logs
  retention: {
    debug: 7, // dias
    info: 30,
    warn: 90,
    error: 365,
    critical: 365
  }
};

class ServerLogger {
  private logs: LogEntry[] = [];
  private rateLimitCounts: Map<string, number> = new Map();
  private environment: string;

  constructor() {
    this.environment = process.env.NODE_ENV || 'development';
  }

  // Gerar ID único para log
  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Verificar rate limiting
  private checkRateLimit(key: string): boolean {
    const now = Date.now();
    const minuteKey = `${key}_${Math.floor(now / 60000)}`;
    const hourKey = `${key}_${Math.floor(now / 3600000)}`;
    const dayKey = `${key}_${Math.floor(now / 86400000)}`;

    const minuteCount = this.rateLimitCounts.get(minuteKey) || 0;
    const hourCount = this.rateLimitCounts.get(hourKey) || 0;
    const dayCount = this.rateLimitCounts.get(dayKey) || 0;

    if (minuteCount >= LOG_CONFIG.rateLimits.perMinute ||
        hourCount >= LOG_CONFIG.rateLimits.perHour ||
        dayCount >= LOG_CONFIG.rateLimits.perDay) {
      return false;
    }

    // Incrementar contadores
    this.rateLimitCounts.set(minuteKey, minuteCount + 1);
    this.rateLimitCounts.set(hourKey, hourCount + 1);
    this.rateLimitCounts.set(dayKey, dayCount + 1);

    return true;
  }

  // Determinar se deve logar no servidor
  private shouldLogToServer(entry: LogEntry): boolean {
    const allowedLevels = LOG_CONFIG.levels[this.environment as keyof typeof LOG_CONFIG.levels];
    
    return allowedLevels.includes(entry.level) && 
           LOG_CONFIG.serverLogCategories.includes(entry.severity);
  }

  // Enviar log para servidor
  private async sendToServer(entry: LogEntry): Promise<void> {
    try {
      const response = await fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry)
      });

      if (!response.ok) {
        console.warn('Falha ao enviar log para servidor:', response.status);
      }
    } catch (error) {
      console.warn('Erro ao enviar log para servidor:', error);
    }
  }

  // Log principal
  async log(
    level: LogEntry['level'],
    message: string,
    context: LogEntry['context'] = {},
    error?: Error,
    metadata: LogEntry['metadata'] = {}
  ): Promise<string> {
    const logId = this.generateLogId();
    
    const entry: LogEntry = {
      id: logId,
      timestamp: Date.now(),
      level,
      category: context.category || 'unknown',
      severity: context.severity || 'medium',
      message,
      context: {
        ...context,
        userAgent: typeof window !== 'undefined' ? navigator.userAgent : undefined,
        sessionId: this.getSessionId(),
        ...this.extractErrorContext(error)
      },
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
        status: (error as any).status
      } : undefined,
      metadata: {
        requestId: this.generateRequestId(),
        ...metadata
      }
    };

    // Adicionar ao cache local
    this.logs.push(entry);

    // Verificar rate limiting
    const rateLimitKey = `${context.userId || 'anonymous'}_${context.agencyId || 'none'}`;
    if (!this.checkRateLimit(rateLimitKey)) {
      console.warn('Rate limit excedido para logging');
      return logId;
    }

    // Enviar para servidor se necessário
    if (this.shouldLogToServer(entry)) {
      await this.sendToServer(entry);
    }

    // Log local para desenvolvimento
    if (this.environment === 'development') {
      console.log(`[${level.toUpperCase()}] ${message}`, {
        context: entry.context,
        error: entry.error,
        metadata: entry.metadata
      });
    }

    return logId;
  }

  // Métodos de conveniência
  async debug(message: string, context?: LogEntry['context'], metadata?: LogEntry['metadata']): Promise<string> {
    return this.log('debug', message, context, undefined, metadata);
  }

  async info(message: string, context?: LogEntry['context'], metadata?: LogEntry['metadata']): Promise<string> {
    return this.log('info', message, context, undefined, metadata);
  }

  async warn(message: string, context?: LogEntry['context'], metadata?: LogEntry['metadata']): Promise<string> {
    return this.log('warn', message, context, undefined, metadata);
  }

  async error(message: string, error?: Error, context?: LogEntry['context'], metadata?: LogEntry['metadata']): Promise<string> {
    return this.log('error', message, context, error, metadata);
  }

  async critical(message: string, error?: Error, context?: LogEntry['context'], metadata?: LogEntry['metadata']): Promise<string> {
    return this.log('critical', message, context, error, metadata);
  }

  // Utilitários
  private getSessionId(): string {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('sessionId') || 'anonymous';
    }
    return 'server';
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private extractErrorContext(error?: Error): Partial<LogEntry['context']> {
    if (!error) return {};

    const context: Partial<LogEntry['context']> = {};

    // Extrair informações específicas de erros conhecidos
    if (error.name === 'ValidationError') {
      context.category = 'validation';
    } else if (error.name === 'NetworkError' || error.message.includes('fetch')) {
      context.category = 'network';
    } else if (error.name === 'AuthenticationError' || error.message.includes('unauthorized')) {
      context.category = 'authentication';
    } else if (error.name === 'AuthorizationError' || error.message.includes('forbidden')) {
      context.category = 'authorization';
    }

    return context;
  }

  // Buscar logs locais
  getLogs(filter: LogFilter = {}): LogEntry[] {
    let filteredLogs = [...this.logs];

    if (filter.level && filter.level.length > 0) {
      filteredLogs = filteredLogs.filter(log => filter.level!.includes(log.level));
    }

    if (filter.category && filter.category.length > 0) {
      filteredLogs = filteredLogs.filter(log => filter.category!.includes(log.category));
    }

    if (filter.severity && filter.severity.length > 0) {
      filteredLogs = filteredLogs.filter(log => filter.severity!.includes(log.severity));
    }

    if (filter.userId) {
      filteredLogs = filteredLogs.filter(log => log.context.userId === filter.userId);
    }

    if (filter.agencyId) {
      filteredLogs = filteredLogs.filter(log => log.context.agencyId === filter.agencyId);
    }

    if (filter.startDate) {
      const startTime = new Date(filter.startDate).getTime();
      filteredLogs = filteredLogs.filter(log => log.timestamp >= startTime);
    }

    if (filter.endDate) {
      const endTime = new Date(filter.endDate).getTime();
      filteredLogs = filteredLogs.filter(log => log.timestamp <= endTime);
    }

    // Ordenar por timestamp (mais recente primeiro)
    filteredLogs.sort((a, b) => b.timestamp - a.timestamp);

    // Aplicar paginação
    if (filter.offset) {
      filteredLogs = filteredLogs.slice(filter.offset);
    }

    if (filter.limit) {
      filteredLogs = filteredLogs.slice(0, filter.limit);
    }

    return filteredLogs;
  }

  // Obter estatísticas
  getStats(): LogStats {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    const oneDayAgo = now - (24 * 60 * 60 * 1000);

    const stats: LogStats = {
      total: this.logs.length,
      byLevel: {},
      byCategory: {},
      bySeverity: {},
      recent: this.logs.filter(log => log.timestamp >= oneHourAgo).length,
      critical: this.logs.filter(log => log.severity === 'critical').length,
      trends: {
        hourly: {},
        daily: {}
      }
    };

    // Contar por nível
    this.logs.forEach(log => {
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
      stats.byCategory[log.category] = (stats.byCategory[log.category] || 0) + 1;
      stats.bySeverity[log.severity] = (stats.bySeverity[log.severity] || 0) + 1;
    });

    // Calcular tendências
    this.logs.forEach(log => {
      const hour = new Date(log.timestamp).toISOString().slice(0, 13);
      const day = new Date(log.timestamp).toISOString().slice(0, 10);
      
      stats.trends.hourly[hour] = (stats.trends.hourly[hour] || 0) + 1;
      stats.trends.daily[day] = (stats.trends.daily[day] || 0) + 1;
    });

    return stats;
  }

  // Limpar logs antigos
  cleanup(): void {
    const now = Date.now();
    const retentionMs = {
      debug: LOG_CONFIG.retention.debug * 24 * 60 * 60 * 1000,
      info: LOG_CONFIG.retention.info * 24 * 60 * 60 * 1000,
      warn: LOG_CONFIG.retention.warn * 24 * 60 * 60 * 1000,
      error: LOG_CONFIG.retention.error * 24 * 60 * 60 * 1000,
      critical: LOG_CONFIG.retention.critical * 24 * 60 * 60 * 1000
    };

    this.logs = this.logs.filter(log => {
      const age = now - log.timestamp;
      const retention = retentionMs[log.level];
      return age < retention;
    });
  }

  // Exportar logs para análise
  exportLogs(filter: LogFilter = {}): string {
    const logs = this.getLogs(filter);
    return JSON.stringify(logs, null, 2);
  }
}

// Instância singleton
export const serverLogger = new ServerLogger();

// Hook para usar o logger
export function useServerLogger() {
  return {
    debug: serverLogger.debug.bind(serverLogger),
    info: serverLogger.info.bind(serverLogger),
    warn: serverLogger.warn.bind(serverLogger),
    error: serverLogger.error.bind(serverLogger),
    critical: serverLogger.critical.bind(serverLogger),
    getLogs: serverLogger.getLogs.bind(serverLogger),
    getStats: serverLogger.getStats.bind(serverLogger),
    cleanup: serverLogger.cleanup.bind(serverLogger),
    exportLogs: serverLogger.exportLogs.bind(serverLogger)
  };
}

export default serverLogger;

