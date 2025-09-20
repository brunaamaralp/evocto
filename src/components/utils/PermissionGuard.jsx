import React from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { Button } from '@/components/ui/button';
import { AlertCircle, Lock } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * Componente para controlar acesso e exibir botões desabilitados com explicação
 */
export function PermissionGuard({ 
  requiredRoles = [], 
  requiredPermissions = [], 
  resource = null,
  children,
  fallback = null,
  showDisabled = true,
  disabledMessage = "Você não tem permissão para esta ação"
}) {
  const { user, hasRole, hasAnyRole } = useSession();

  const hasRequiredRole = requiredRoles.length === 0 || hasAnyRole(requiredRoles);
  
  // TODO: Implementar sistema de permissões granulares quando necessário
  const hasRequiredPermissions = requiredPermissions.length === 0; // Por enquanto, sempre true
  
  const hasAccess = hasRequiredRole && hasRequiredPermissions;

  // Se tem acesso, renderizar normalmente
  if (hasAccess) {
    return children;
  }

  // Se não deve mostrar versão desabilitada, renderizar fallback
  if (!showDisabled) {
    return fallback;
  }

  // Determinar mensagem específica baseada no contexto
  const getSpecificMessage = () => {
    if (!user) return "Faça login para acessar esta funcionalidade";
    
    if (requiredRoles.length > 0) {
      const roleNames = {
        'owner': 'Proprietário',
        'admin': 'Administrador',
        'team': 'Membro da Equipe',
        'client': 'Cliente'
      };
      
      const roleLabels = requiredRoles.map(role => roleNames[role] || role).join(', ');
      return `Esta ação requer papel: ${roleLabels}`;
    }

    return disabledMessage;
  };

  // Se children é um Button, clonar com propriedades desabilitadas
  if (React.isValidElement(children) && children.type === Button) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {React.cloneElement(children, {
              disabled: true,
              variant: 'outline',
              className: `${children.props.className || ''} opacity-50 cursor-not-allowed`,
              onClick: (e) => {
                e.preventDefault();
                e.stopPropagation();
              }
            })}
          </TooltipTrigger>
          <TooltipContent>
            <div className="flex items-center gap-2 max-w-64">
              <Lock className="w-4 h-4" />
              <span className="text-sm">{getSpecificMessage()}</span>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Para outros elementos, envolver com tooltip
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="opacity-50 cursor-not-allowed pointer-events-none">
            {children}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="flex items-center gap-2 max-w-64">
            <Lock className="w-4 h-4" />
            <span className="text-sm">{getSpecificMessage()}</span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Hook para verificar permissões programaticamente
 */
export function usePermissions() {
  const { user, hasRole, hasAnyRole } = useSession();

  const canApproveDeliverables = () => {
    return hasAnyRole(['owner', 'admin', 'team']);
  };

  const canEditServices = () => {
    return hasAnyRole(['owner', 'admin', 'team']);
  };

  const canDeleteServices = () => {
    return hasAnyRole(['owner', 'admin']);
  };

  const canManageTeam = () => {
    return hasAnyRole(['owner', 'admin']);
  };

  const canViewFinancials = () => {
    return hasAnyRole(['owner', 'admin', 'team']);
  };

  const canExportData = () => {
    return hasAnyRole(['owner', 'admin', 'team']);
  };

  const canAccessAdminFeatures = () => {
    return hasAnyRole(['owner', 'admin']);
  };

  const canModifyAgencySettings = () => {
    return hasRole('owner');
  };

  const canInviteUsers = () => {
    return hasAnyRole(['owner', 'admin']);
  };

  const canArchiveProjects = () => {
    return hasAnyRole(['owner', 'admin']);
  };

  return {
    canApproveDeliverables,
    canEditServices,
    canDeleteServices,
    canManageTeam,
    canViewFinancials,
    canExportData,
    canAccessAdminFeatures,
    canModifyAgencySettings,
    canInviteUsers,
    canArchiveProjects,
    user,
    hasRole,
    hasAnyRole
  };
}

export default PermissionGuard;