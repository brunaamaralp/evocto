import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

/**
 * Sistema de Auditoria Completa
 * Registra todas as ações do usuário e eventos do sistema
 */
export class AuditLogger extends EventEmitter {
  constructor(options = {}) {
    super();
    this.logs = new Map();
    this.sessions = new Map();
    this.retentionDays = options.retentionDays || 90;
    this.maxLogsPerUser = options.maxLogsPerUser || 10000;
    this.sensitiveFields = options.sensitiveFields || ['password', 'token', 'secret'];
    this.isCleanupRunning = false;
    
    this.startCleanup();
  }

  /**
   * Inicia limpeza automática de logs antigos
   */
  startCleanup() {
    if (this.isCleanupRunning) return;
    
    this.isCleanupRunning = true;
    setInterval(() => {
      this.cleanup();
    }, 24 * 60 * 60 * 1000); // Limpeza diária
  }

  /**
   * Para limpeza automática
   */
  stopCleanup() {
    this.isCleanupRunning = false;
  }

  /**
   * Registra evento de auditoria
   */
  log(event) {
    const {
      userId,
      action,
      resource,
      resourceId,
      details = {},
      ipAddress,
      userAgent,
      sessionId,
      timestamp = Date.now()
    } = event;

    // Validar dados obrigatórios
    if (!userId || !action || !resource) {
      throw new Error('Dados obrigatórios não fornecidos para auditoria');
    }

    // Sanitizar dados sensíveis
    const sanitizedDetails = this.sanitizeData(details);

    const auditEntry = {
      id: uuidv4(),
      userId,
      action,
      resource,
      resourceId,
      details: sanitizedDetails,
      ipAddress,
      userAgent,
      sessionId,
      timestamp,
      createdAt: new Date().toISOString()
    };

    // Armazenar log
    if (!this.logs.has(userId)) {
      this.logs.set(userId, []);
    }

    const userLogs = this.logs.get(userId);
    userLogs.push(auditEntry);

    // Manter limite de logs por usuário
    if (userLogs.length > this.maxLogsPerUser) {
      userLogs.splice(0, userLogs.length - this.maxLogsPerUser);
    }

    // Emitir evento
    this.emit('audit_log', auditEntry);

    return auditEntry;
  }

  /**
   * Sanitiza dados sensíveis
   */
  sanitizeData(data) {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sanitized = { ...data };

    for (const field of this.sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    // Sanitizar objetos aninhados
    for (const key in sanitized) {
      if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeData(sanitized[key]);
      }
    }

    return sanitized;
  }

  /**
   * Registra início de sessão
   */
  logSessionStart(userId, sessionData) {
    const sessionId = uuidv4();
    const session = {
      id: sessionId,
      userId,
      startTime: Date.now(),
      endTime: null,
      ipAddress: sessionData.ipAddress,
      userAgent: sessionData.userAgent,
      location: sessionData.location,
      deviceInfo: sessionData.deviceInfo,
      isActive: true
    };

    this.sessions.set(sessionId, session);

    // Log de auditoria
    this.log({
      userId,
      action: 'SESSION_START',
      resource: 'SESSION',
      resourceId: sessionId,
      details: {
        ipAddress: sessionData.ipAddress,
        userAgent: sessionData.userAgent,
        location: sessionData.location,
        deviceInfo: sessionData.deviceInfo
      },
      ipAddress: sessionData.ipAddress,
      userAgent: sessionData.userAgent,
      sessionId
    });

    this.emit('session_start', session);
    return sessionId;
  }

  /**
   * Registra fim de sessão
   */
  logSessionEnd(sessionId, reason = 'LOGOUT') {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    session.endTime = Date.now();
    session.isActive = false;
    session.endReason = reason;

    // Log de auditoria
    this.log({
      userId: session.userId,
      action: 'SESSION_END',
      resource: 'SESSION',
      resourceId: sessionId,
      details: {
        duration: session.endTime - session.startTime,
        reason
      },
      sessionId
    });

    this.emit('session_end', session);
  }

  /**
   * Registra ação de CRUD
   */
  logCRUDAction(userId, action, resource, resourceId, data = {}, sessionId = null) {
    const validActions = ['CREATE', 'READ', 'UPDATE', 'DELETE'];
    if (!validActions.includes(action)) {
      throw new Error(`Ação inválida: ${action}. Use: ${validActions.join(', ')}`);
    }

    return this.log({
      userId,
      action,
      resource,
      resourceId,
      details: {
        operation: action,
        data: action === 'DELETE' ? null : data,
        timestamp: Date.now()
      },
      sessionId
    });
  }

  /**
   * Registra tentativa de acesso negado
   */
  logAccessDenied(userId, resource, resourceId, reason, sessionId = null) {
    return this.log({
      userId,
      action: 'ACCESS_DENIED',
      resource,
      resourceId,
      details: {
        reason,
        severity: 'HIGH',
        timestamp: Date.now()
      },
      sessionId
    });
  }

  /**
   * Registra evento de segurança
   */
  logSecurityEvent(userId, eventType, details = {}, sessionId = null) {
    const validEventTypes = [
      'LOGIN_SUCCESS',
      'LOGIN_FAILED',
      'PASSWORD_CHANGE',
      'PASSWORD_RESET',
      '2FA_ENABLED',
      '2FA_DISABLED',
      'ACCOUNT_LOCKED',
      'ACCOUNT_UNLOCKED',
      'SUSPICIOUS_ACTIVITY',
      'DATA_EXPORT',
      'DATA_IMPORT',
      'PERMISSION_CHANGE',
      'ROLE_CHANGE'
    ];

    if (!validEventTypes.includes(eventType)) {
      throw new Error(`Tipo de evento inválido: ${eventType}`);
    }

    return this.log({
      userId,
      action: eventType,
      resource: 'SECURITY',
      resourceId: userId,
      details: {
        eventType,
        severity: this.getEventSeverity(eventType),
        ...details,
        timestamp: Date.now()
      },
      sessionId
    });
  }

  /**
   * Obtém severidade do evento
   */
  getEventSeverity(eventType) {
    const severityMap = {
      'LOGIN_SUCCESS': 'LOW',
      'LOGIN_FAILED': 'MEDIUM',
      'PASSWORD_CHANGE': 'HIGH',
      'PASSWORD_RESET': 'HIGH',
      '2FA_ENABLED': 'HIGH',
      '2FA_DISABLED': 'HIGH',
      'ACCOUNT_LOCKED': 'HIGH',
      'ACCOUNT_UNLOCKED': 'HIGH',
      'SUSPICIOUS_ACTIVITY': 'CRITICAL',
      'DATA_EXPORT': 'HIGH',
      'DATA_IMPORT': 'HIGH',
      'PERMISSION_CHANGE': 'HIGH',
      'ROLE_CHANGE': 'HIGH'
    };

    return severityMap[eventType] || 'MEDIUM';
  }

  /**
   * Registra evento de sistema
   */
  logSystemEvent(eventType, details = {}) {
    return this.log({
      userId: 'SYSTEM',
      action: eventType,
      resource: 'SYSTEM',
      resourceId: 'SYSTEM',
      details: {
        eventType,
        severity: 'MEDIUM',
        ...details,
        timestamp: Date.now()
      }
    });
  }

  /**
   * Obtém logs de usuário
   */
  getUserLogs(userId, options = {}) {
    const {
      startDate,
      endDate,
      action,
      resource,
      limit = 100,
      offset = 0
    } = options;

    const userLogs = this.logs.get(userId) || [];
    let filteredLogs = userLogs;

    // Filtrar por data
    if (startDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= startDate);
    }
    if (endDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp <= endDate);
    }

    // Filtrar por ação
    if (action) {
      filteredLogs = filteredLogs.filter(log => log.action === action);
    }

    // Filtrar por recurso
    if (resource) {
      filteredLogs = filteredLogs.filter(log => log.resource === resource);
    }

    // Ordenar por timestamp (mais recente primeiro)
    filteredLogs.sort((a, b) => b.timestamp - a.timestamp);

    // Aplicar paginação
    const paginatedLogs = filteredLogs.slice(offset, offset + limit);

    return {
      logs: paginatedLogs,
      total: filteredLogs.length,
      hasMore: offset + limit < filteredLogs.length
    };
  }

  /**
   * Obtém logs por recurso
   */
  getResourceLogs(resource, resourceId, options = {}) {
    const {
      startDate,
      endDate,
      action,
      limit = 100,
      offset = 0
    } = options;

    let allLogs = [];
    for (const userLogs of this.logs.values()) {
      allLogs = allLogs.concat(userLogs);
    }

    let filteredLogs = allLogs.filter(log => 
      log.resource === resource && log.resourceId === resourceId
    );

    // Aplicar filtros
    if (startDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= startDate);
    }
    if (endDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp <= endDate);
    }
    if (action) {
      filteredLogs = filteredLogs.filter(log => log.action === action);
    }

    // Ordenar por timestamp
    filteredLogs.sort((a, b) => b.timestamp - a.timestamp);

    // Aplicar paginação
    const paginatedLogs = filteredLogs.slice(offset, offset + limit);

    return {
      logs: paginatedLogs,
      total: filteredLogs.length,
      hasMore: offset + limit < filteredLogs.length
    };
  }

  /**
   * Obtém estatísticas de auditoria
   */
  getAuditStats(options = {}) {
    const {
      startDate,
      endDate,
      userId
    } = options;

    let allLogs = [];
    if (userId) {
      allLogs = this.logs.get(userId) || [];
    } else {
      for (const userLogs of this.logs.values()) {
        allLogs = allLogs.concat(userLogs);
      }
    }

    // Aplicar filtros de data
    if (startDate) {
      allLogs = allLogs.filter(log => log.timestamp >= startDate);
    }
    if (endDate) {
      allLogs = allLogs.filter(log => log.timestamp <= endDate);
    }

    const stats = {
      totalLogs: allLogs.length,
      uniqueUsers: new Set(allLogs.map(log => log.userId)).size,
      actions: {},
      resources: {},
      severity: {
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
        CRITICAL: 0
      },
      timeRange: {
        start: allLogs.length > 0 ? Math.min(...allLogs.map(log => log.timestamp)) : null,
        end: allLogs.length > 0 ? Math.max(...allLogs.map(log => log.timestamp)) : null
      }
    };

    // Contar ações
    for (const log of allLogs) {
      stats.actions[log.action] = (stats.actions[log.action] || 0) + 1;
      stats.resources[log.resource] = (stats.resources[log.resource] || 0) + 1;
      
      if (log.details.severity) {
        stats.severity[log.details.severity] = (stats.severity[log.details.severity] || 0) + 1;
      }
    }

    return stats;
  }

  /**
   * Exporta logs para CSV
   */
  exportLogsToCSV(userId, options = {}) {
    const { logs } = this.getUserLogs(userId, options);
    
    const headers = [
      'ID',
      'User ID',
      'Action',
      'Resource',
      'Resource ID',
      'Timestamp',
      'IP Address',
      'User Agent',
      'Session ID',
      'Details'
    ];

    const csvRows = [headers.join(',')];

    for (const log of logs) {
      const row = [
        log.id,
        log.userId,
        log.action,
        log.resource,
        log.resourceId,
        new Date(log.timestamp).toISOString(),
        log.ipAddress || '',
        log.userAgent || '',
        log.sessionId || '',
        JSON.stringify(log.details)
      ];
      csvRows.push(row.map(field => `"${field}"`).join(','));
    }

    return csvRows.join('\n');
  }

  /**
   * Limpa logs antigos
   */
  cleanup() {
    const cutoffTime = Date.now() - (this.retentionDays * 24 * 60 * 60 * 1000);
    let totalRemoved = 0;

    for (const [userId, userLogs] of this.logs) {
      const originalLength = userLogs.length;
      const filteredLogs = userLogs.filter(log => log.timestamp > cutoffTime);
      
      if (filteredLogs.length !== originalLength) {
        this.logs.set(userId, filteredLogs);
        totalRemoved += originalLength - filteredLogs.length;
      }
    }

    // Limpar sessões antigas
    for (const [sessionId, session] of this.sessions) {
      if (session.endTime && session.endTime < cutoffTime) {
        this.sessions.delete(sessionId);
      }
    }

    if (totalRemoved > 0) {
      this.emit('cleanup', { removedLogs: totalRemoved });
    }
  }

  /**
   * Obtém todas as sessões ativas
   */
  getActiveSessions() {
    const activeSessions = [];
    for (const [sessionId, session] of this.sessions) {
      if (session.isActive) {
        activeSessions.push(session);
      }
    }
    return activeSessions;
  }

  /**
   * Obtém estatísticas de sessão
   */
  getSessionStats() {
    const stats = {
      totalSessions: this.sessions.size,
      activeSessions: 0,
      averageSessionDuration: 0,
      longestSession: 0,
      shortestSession: Infinity
    };

    let totalDuration = 0;
    let sessionCount = 0;

    for (const session of this.sessions.values()) {
      if (session.isActive) {
        stats.activeSessions++;
      }

      if (session.endTime) {
        const duration = session.endTime - session.startTime;
        totalDuration += duration;
        sessionCount++;
        
        stats.longestSession = Math.max(stats.longestSession, duration);
        stats.shortestSession = Math.min(stats.shortestSession, duration);
      }
    }

    if (sessionCount > 0) {
      stats.averageSessionDuration = totalDuration / sessionCount;
    }

    if (stats.shortestSession === Infinity) {
      stats.shortestSession = 0;
    }

    return stats;
  }
}

// Instância singleton
export const auditLogger = new AuditLogger({
  retentionDays: 90,
  maxLogsPerUser: 10000,
  sensitiveFields: ['password', 'token', 'secret', 'apiKey', 'privateKey']
});

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.auditLogger = auditLogger;
}

