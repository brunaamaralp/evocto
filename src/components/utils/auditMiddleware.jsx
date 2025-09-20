import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';
import { auditLogger } from '@/components/utils/auditLogger';

/**
 * Middleware para auditoria automática de mutações
 */
export class AuditMiddleware {
  static AUDITED_ENTITIES = [
    'Service', 'Task', 'ClientDocument', 'ApprovalRequest', 
    'FinancialKPI', 'Client', 'CyclePlan', 'LearningEntry'
  ];

  static async wrapEntityOperation(entityName, operation, operationFn, context = {}) {
    if (!this.AUDITED_ENTITIES.includes(entityName)) {
      return await operationFn();
    }

    const startTime = Date.now();
    let result = null;
    let error = null;
    let beforeData = null;
    let afterData = null;

    try {
      // Para updates e deletes, capturar estado anterior
      if (['update', 'delete'].includes(operation) && context.entityId) {
        try {
          const base44 = createClientFromRequest(context.request);
          beforeData = await base44.entities[entityName].get(context.entityId);
        } catch (e) {
          console.warn(`Could not fetch before data for ${entityName}:${context.entityId}`);
        }
      }

      // Executar operação
      result = await operationFn();
      
      // Capturar estado posterior
      if (operation === 'create' && result?.id) {
        afterData = result;
      } else if (operation === 'update' && result) {
        afterData = result;
      }

      // Log da operação bem-sucedida
      await this.logOperation({
        entityName,
        operation,
        success: true,
        entityId: context.entityId || result?.id,
        beforeData,
        afterData,
        context,
        duration: Date.now() - startTime
      });

      return result;

    } catch (e) {
      error = e;
      
      // Log da operação com erro
      await this.logOperation({
        entityName,
        operation,
        success: false,
        entityId: context.entityId,
        beforeData,
        afterData: null,
        error: e.message,
        context,
        duration: Date.now() - startTime
      });

      throw e;
    }
  }

  static async logOperation(params) {
    const {
      entityName,
      operation,
      success,
      entityId,
      beforeData,
      afterData,
      error,
      context,
      duration
    } = params;

    try {
      const actionMap = {
        create: 'CREATED',
        update: 'UPDATED',
        delete: 'DELETED'
      };

      const action = actionMap[operation] || operation.toUpperCase();
      
      await auditLogger.logAction({
        entity_type: entityName,
        entity_id: String(entityId || 'unknown'),
        action,
        before_data: beforeData,
        after_data: afterData,
        meta_json: {
          operation,
          success,
          error,
          duration_ms: duration,
          context: {
            ...context,
            // Remove dados sensíveis do contexto
            request: undefined,
            user: context.user ? { id: context.user.id, role: context.user.role } : undefined
          }
        },
        severity: error ? 'high' : success ? 'medium' : 'low',
        category: 'user_action',
        tags: [entityName.toLowerCase(), operation, success ? 'success' : 'error']
      });

    } catch (logError) {
      console.error('Failed to log audit trail:', logError);
      // Não falhar a operação principal por causa do audit
    }
  }

  // Wrapper específico para operações de exportação
  static async logExportOperation(params) {
    const {
      exportType,
      entityType,
      entityId,
      user,
      success,
      error,
      fileSize,
      fileName
    } = params;

    try {
      await auditLogger.logAction({
        entity_type: entityType,
        entity_id: String(entityId),
        action: 'EXPORT_REPORT_GENERATED',
        meta_json: {
          export_type: exportType,
          success,
          error,
          file_size: fileSize,
          file_name: fileName,
          user_role: user?.role,
          export_timestamp: new Date().toISOString()
        },
        severity: success ? 'medium' : 'high',
        category: 'export',
        tags: ['export', exportType, success ? 'success' : 'error']
      });

    } catch (logError) {
      console.error('Failed to log export operation:', logError);
    }
  }

  // Wrapper para operações de permissão negada
  static async logPermissionDenied(params) {
    const {
      resource,
      action,
      entityType,
      entityId,
      user,
      context
    } = params;

    try {
      await auditLogger.logAction({
        entity_type: entityType || 'System',
        entity_id: String(entityId || 'unknown'),
        action: 'PERMISSION_DENIED',
        meta_json: {
          resource,
          attempted_action: action,
          user_role: user?.role,
          user_id: user?.id,
          context,
          timestamp: new Date().toISOString()
        },
        severity: 'high',
        category: 'security',
        tags: ['security', 'permission_denied', resource]
      });

    } catch (logError) {
      console.error('Failed to log permission denied:', logError);
    }
  }
}

// Helper para uso em funções
export const withAudit = (entityName, operation, context = {}) => {
  return (operationFn) => {
    return AuditMiddleware.wrapEntityOperation(entityName, operation, operationFn, context);
  };
};

export default AuditMiddleware;