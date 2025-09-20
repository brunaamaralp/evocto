import React, { createContext, useContext, useCallback } from 'react';
import { useSession } from './SessionManager';
import { auditLogger } from '@/components/utils/auditLogger';

const AuthorizationContext = createContext({});

// Matriz de permissões por role e ação
const PERMISSIONS_MATRIX = {
  // Permissões de exportação
  export: {
    owner: ['*'], // Pode exportar tudo
    admin: ['client_reports', 'audit_logs', 'service_reports', 'kpi_reports'],
    team: ['client_reports', 'service_reports'], // Limitado
    client: ['own_reports'] // Apenas seus próprios relatórios
  },
  
  // Permissões de documentos
  document: {
    owner: ['create', 'read', 'update', 'delete', 'download', 'share'],
    admin: ['create', 'read', 'update', 'delete', 'download', 'share'],
    team: ['create', 'read', 'update', 'download'],
    client: ['read', 'download'] // Apenas visualizar e baixar
  },
  
  // Permissões de auditoria
  audit: {
    owner: ['read', 'export', 'delete'],
    admin: ['read', 'export'],
    team: ['read'], // Apenas visualizar logs próprios
    client: [] // Sem acesso a logs de auditoria
  },
  
  // Permissões de KPIs
  kpi: {
    owner: ['create', 'read', 'update', 'delete', 'export'],
    admin: ['create', 'read', 'update', 'delete', 'export'],
    team: ['create', 'read', 'update'],
    client: ['read'] // Apenas visualizar
  }
};

export function AuthorizationProvider({ children }) {
  const { user } = useSession();

  const hasPermission = useCallback((resource, action, context = {}) => {
    if (!user || !user.role) return false;

    const userRole = user.role;
    const resourcePermissions = PERMISSIONS_MATRIX[resource];
    
    if (!resourcePermissions) {
      console.warn(`Resource '${resource}' not found in permissions matrix`);
      return false;
    }

    const rolePermissions = resourcePermissions[userRole] || [];
    
    // Wildcard permission
    if (rolePermissions.includes('*')) return true;
    
    // Exact permission match
    if (rolePermissions.includes(action)) return true;
    
    // Context-specific permissions
    if (userRole === 'client' && action === 'read' && context.ownResource) {
      return true;
    }
    
    if (userRole === 'team' && resource === 'audit' && context.ownActions) {
      return true;
    }
    
    return false;
  }, [user]);

  const requirePermission = useCallback(async (resource, action, context = {}) => {
    const hasAccess = hasPermission(resource, action, context);
    
    if (!hasAccess) {
      // Log da tentativa de acesso negado
      await auditLogger.logPermissionDenied(
        resource, 
        context.resourceId || 'unknown',
        action,
        {
          user_role: user?.role,
          resource,
          action,
          context,
          timestamp: new Date().toISOString()
        }
      );
      
      throw new Error(`Access denied: insufficient permissions for ${resource}:${action}`);
    }
    
    return true;
  }, [hasPermission, user]);

  const checkExportPermission = useCallback(async (exportType, resourceId = null) => {
    const context = { resourceId };
    
    try {
      await requirePermission('export', exportType, context);
      return true;
    } catch (error) {
      console.error('Export permission denied:', error);
      return false;
    }
  }, [requirePermission]);

  const value = {
    user,
    hasPermission,
    requirePermission,
    checkExportPermission,
    userRole: user?.role || null,
    agencyId: user?.data?.agencyId || null
  };

  return (
    <AuthorizationContext.Provider value={value}>
      {children}
    </AuthorizationContext.Provider>
  );
}

export const useAuthorization = () => {
  const context = useContext(AuthorizationContext);
  
  if (!context) {
    throw new Error('useAuthorization must be used within AuthorizationProvider');
  }
  
  return context;
};

// Hook específico para verificações de exportação
export const useExportPermissions = () => {
  const { checkExportPermission, hasPermission, user } = useAuthorization();
  
  const canExportReports = useCallback(() => {
    return hasPermission('export', 'client_reports') || 
           hasPermission('export', '*');
  }, [hasPermission]);

  const canExportAuditLogs = useCallback(() => {
    return hasPermission('export', 'audit_logs') || 
           hasPermission('export', '*');
  }, [hasPermission]);

  const canExportKPIs = useCallback(() => {
    return hasPermission('export', 'kpi_reports') || 
           hasPermission('export', '*');
  }, [hasPermission]);

  return {
    checkExportPermission,
    canExportReports,
    canExportAuditLogs,
    canExportKPIs,
    userRole: user?.role
  };
};

export default useAuthorization;