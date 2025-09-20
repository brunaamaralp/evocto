import { AuditLog } from '@/api/entities';
import { User } from '@/api/entities';

/**
 * Sistema de auditoria automática para rastrear mutações
 */
class AuditLogger {
  constructor() {
    this.requestId = this.generateRequestId();
    this.sessionId = this.getSessionId();
  }

  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getSessionId() {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('session_id') || this.generateRequestId();
    }
    return 'server_session';
  }

  async getCurrentUser() {
    try {
      return await User.me();
    } catch (error) {
      return null;
    }
  }

  extractChanges(before, after) {
    const changes = [];
    const beforeData = before || {};
    const afterData = after || {};
    
    // Campos que são considerados sensíveis e devem ser mascarados
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'hash'];
    
    const allFields = new Set([...Object.keys(beforeData), ...Object.keys(afterData)]);
    
    allFields.forEach(field => {
      const oldValue = beforeData[field];
      const newValue = afterData[field];
      
      // Skip campos que não mudaram
      if (JSON.stringify(oldValue) === JSON.stringify(newValue)) return;
      
      // Mascarar campos sensíveis
      const isSensitive = sensitiveFields.some(sensitive => 
        field.toLowerCase().includes(sensitive.toLowerCase())
      );
      
      changes.push({
        field,
        old_value: isSensitive ? '[MASKED]' : oldValue,
        new_value: isSensitive ? '[MASKED]' : newValue,
        field_type: typeof newValue || typeof oldValue,
        is_sensitive: isSensitive
      });
    });
    
    return changes;
  }

  async logAction(params) {
    try {
      const user = await this.getCurrentUser();
      const {
        entity_type,
        entity_id,
        action,
        before_data = null,
        after_data = null,
        meta_json = {},
        severity = 'medium',
        category = 'user_action',
        tags = [],
        compliance_flags = [],
        related_entities = []
      } = params;

      if (!user?.data?.agencyId) {
        console.warn('Audit log skipped: no agency context');
        return null;
      }

      const changes = this.extractChanges(before_data, after_data);
      
      // Determinar severidade baseada na ação
      let autoSeverity = severity;
      if (['DELETED', 'EXPORT_PERMISSION_DENIED', 'AUTH_FAILED'].includes(action)) {
        autoSeverity = 'high';
      } else if (['APPROVED', 'REJECTED', 'CREATED'].includes(action)) {
        autoSeverity = 'medium';
      }

      const auditData = {
        agencyId: user.data.agencyId,
        entity_type,
        entity_id: String(entity_id),
        action,
        actor_id: user.email || user.id,
        actor_ip: this.getClientIP(),
        user_agent: this.getUserAgent(),
        request_id: this.requestId,
        session_id: this.sessionId,
        before_data: before_data ? this.sanitizeData(before_data) : null,
        after_data: after_data ? this.sanitizeData(after_data) : null,
        changes,
        meta_json: {
          ...meta_json,
          user_role: user.role,
          timestamp: new Date().toISOString(),
          change_count: changes.length
        },
        severity: autoSeverity,
        category,
        tags: [...tags, entity_type.toLowerCase(), action.toLowerCase()],
        compliance_flags,
        related_entities
      };

      const logEntry = await AuditLog.create(auditData);
      console.log(`📊 Audit logged: ${action} on ${entity_type}:${entity_id}`);
      
      return logEntry;
    } catch (error) {
      console.error('Failed to create audit log:', error);
      // Não falhar a operação principal por causa do audit
      return null;
    }
  }

  sanitizeData(data) {
    // Remove campos muito grandes ou sensíveis dos logs
    const sanitized = { ...data };
    const maxFieldSize = 1000; // caracteres
    
    Object.keys(sanitized).forEach(key => {
      const value = sanitized[key];
      
      // Remove campos sensíveis
      if (key.toLowerCase().includes('password') || 
          key.toLowerCase().includes('token') || 
          key.toLowerCase().includes('secret')) {
        sanitized[key] = '[REDACTED]';
      }
      // Trunca campos muito grandes
      else if (typeof value === 'string' && value.length > maxFieldSize) {
        sanitized[key] = value.substring(0, maxFieldSize) + '... [TRUNCATED]';
      }
      // Remove objetos muito complexos
      else if (typeof value === 'object' && value !== null) {
        try {
          const jsonString = JSON.stringify(value);
          if (jsonString.length > maxFieldSize) {
            sanitized[key] = '[OBJECT_TOO_LARGE]';
          }
        } catch (error) {
          sanitized[key] = '[CIRCULAR_REFERENCE]';
        }
      }
    });
    
    return sanitized;
  }

  getClientIP() {
    if (typeof window === 'undefined') return 'server';
    // No lado cliente, não temos acesso direto ao IP
    return 'client';
  }

  getUserAgent() {
    if (typeof window !== 'undefined') {
      return navigator.userAgent;
    }
    return 'server';
  }

  // Métodos de conveniência para ações específicas
  async logCreate(entity_type, entity_id, after_data, meta = {}) {
    return this.logAction({
      entity_type,
      entity_id,
      action: 'CREATED',
      after_data,
      meta_json: meta,
      severity: 'medium',
      category: 'user_action'
    });
  }

  async logUpdate(entity_type, entity_id, before_data, after_data, meta = {}) {
    return this.logAction({
      entity_type,
      entity_id,
      action: 'UPDATED',
      before_data,
      after_data,
      meta_json: meta,
      severity: 'medium',
      category: 'user_action'
    });
  }

  async logDelete(entity_type, entity_id, before_data, meta = {}) {
    return this.logAction({
      entity_type,
      entity_id,
      action: 'DELETED',
      before_data,
      meta_json: meta,
      severity: 'high',
      category: 'user_action'
    });
  }

  async logExport(entity_type, entity_id, export_type, meta = {}) {
    return this.logAction({
      entity_type,
      entity_id,
      action: 'PDF_EXPORTED',
      meta_json: {
        ...meta,
        export_type,
        file_size: meta.file_size || null
      },
      severity: 'medium',
      category: 'export',
      tags: ['export', export_type]
    });
  }

  async logPermissionDenied(entity_type, entity_id, attempted_action, meta = {}) {
    return this.logAction({
      entity_type,
      entity_id,
      action: 'PERMISSION_DENIED',
      meta_json: {
        ...meta,
        attempted_action,
        user_role: meta.user_role
      },
      severity: 'high',
      category: 'security',
      tags: ['security', 'permission_denied']
    });
  }

  // Helper para logging em batch
  async logBatch(operations) {
    const promises = operations.map(op => this.logAction(op));
    return Promise.allSettled(promises);
  }
}

// Instância singleton
const auditLogger = new AuditLogger();

// Hook para integração com React
export const useAuditLogger = () => {
  return auditLogger;
};

// Export da instância e classe
export { auditLogger, AuditLogger };
export default auditLogger;