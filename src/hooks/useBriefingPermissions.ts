/**
 * 🔐 Hook para Validação de Permissões do Briefing
 * 
 * Centraliza validação de permissões para operações de briefing
 */

import { useCallback } from 'react';
import { useSession } from '@/components/auth/SessionManager';

export interface PermissionValidationResult {
  hasPermission: boolean;
  error?: string;
  warnings?: string[];
}

export interface BriefingPermissionOptions {
  serviceId: string;
  clientId: string;
  operation: 'create' | 'read' | 'update' | 'delete' | 'submit';
}

export function useBriefingPermissions() {
  const { user } = useSession();

  // Validar permissões básicas do usuário
  const validateUserPermissions = useCallback((): PermissionValidationResult => {
    if (!user) {
      return {
        hasPermission: false,
        error: 'Usuário não autenticado'
      };
    }

    if (!user.data?.agencyId) {
      return {
        hasPermission: false,
        error: 'Usuário não tem agência associada'
      };
    }

    if (!user.data?.id) {
      return {
        hasPermission: false,
        error: 'ID do usuário não encontrado'
      };
    }

    return {
      hasPermission: true
    };
  }, [user]);

  // Validar permissões para operação específica
  const validateOperationPermission = useCallback(async (
    options: BriefingPermissionOptions
  ): Promise<PermissionValidationResult> => {
    const { serviceId, clientId, operation } = options;
    const warnings: string[] = [];

    // 1. Validar permissões básicas do usuário
    const userValidation = validateUserPermissions();
    if (!userValidation.hasPermission) {
      return userValidation;
    }

    try {
      // 2. Validar propriedade do serviço
      const { Service } = await import('@/api/entities');
      const service = await Service.get(serviceId);
      
      if (!service) {
        return {
          hasPermission: false,
          error: 'Serviço não encontrado'
        };
      }

      if (service.agencyId !== user.data.agencyId) {
        return {
          hasPermission: false,
          error: 'Serviço não pertence à sua agência'
        };
      }

      // 3. Validar propriedade do cliente
      const { Client } = await import('@/api/entities');
      const client = await Client.get(clientId);
      
      if (!client) {
        return {
          hasPermission: false,
          error: 'Cliente não encontrado'
        };
      }

      if (client.agencyId !== user.data.agencyId) {
        return {
          hasPermission: false,
          error: 'Cliente não pertence à sua agência'
        };
      }

      // 4. Validar permissões específicas por operação
      const operationValidation = await validateSpecificOperation(operation, service, client);
      if (!operationValidation.hasPermission) {
        return operationValidation;
      }

      // 5. Verificar permissões do usuário
      const userPermissions = user.data.permissions || [];
      const requiredPermissions = getRequiredPermissions(operation);
      
      const missingPermissions = requiredPermissions.filter(permission => 
        !userPermissions.includes(permission)
      );

      if (missingPermissions.length > 0) {
        return {
          hasPermission: false,
          error: `Permissões insuficientes: ${missingPermissions.join(', ')}`
        };
      }

      // 6. Verificar status do serviço
      if (service.is_template) {
        return {
          hasPermission: false,
          error: 'Não é possível criar briefing para um template'
        };
      }

      if (!service.is_active && operation === 'submit') {
        warnings.push('Serviço não está ativo - briefing pode não ser processado');
      }

      return {
        hasPermission: true,
        warnings: warnings.length > 0 ? warnings : undefined
      };

    } catch (error) {
      console.error('[BriefingPermissions] Erro na validação:', error);
      return {
        hasPermission: false,
        error: 'Erro ao validar permissões'
      };
    }
  }, [user, validateUserPermissions]);

  // Validar operação específica
  const validateSpecificOperation = useCallback(async (
    operation: string,
    service: any,
    client: any
  ): Promise<PermissionValidationResult> => {
    switch (operation) {
      case 'create':
        // Verificar se já existe briefing ativo
        try {
          const { briefingService } = await import('@/services/briefingService');
          const existingBriefings = await briefingService.getBriefingsByService(service.id);
          const activeBriefings = existingBriefings.filter(b => b.status === 'ativo');
          
          if (activeBriefings.length > 0) {
            return {
              hasPermission: false,
              error: 'Já existe um briefing ativo para este serviço'
            };
          }
        } catch (error) {
          // Se não conseguir verificar, permitir criação
          console.warn('[BriefingPermissions] Não foi possível verificar briefings existentes');
        }
        break;

      case 'submit':
        // Verificar se briefing está pronto para submissão
        if (service.status === 'archived') {
          return {
            hasPermission: false,
            error: 'Serviço arquivado - não é possível submeter briefing'
          };
        }
        break;

      case 'delete':
        // Verificar se briefing pode ser deletado
        if (service.status === 'in_execution') {
          return {
            hasPermission: false,
            error: 'Serviço em execução - briefing não pode ser deletado'
          };
        }
        break;
    }

    return {
      hasPermission: true
    };
  }, []);

  // Obter permissões necessárias por operação
  const getRequiredPermissions = useCallback((operation: string): string[] => {
    const permissions = {
      create: ['briefing:create'],
      read: ['briefing:read'],
      update: ['briefing:update'],
      delete: ['briefing:delete'],
      submit: ['briefing:submit', 'service:manage']
    };

    return permissions[operation] || [];
  }, []);

  // Validar permissões para múltiplas operações
  const validateMultipleOperations = useCallback(async (
    operations: BriefingPermissionOptions[]
  ): Promise<Record<string, PermissionValidationResult>> => {
    const results: Record<string, PermissionValidationResult> = {};

    for (const operation of operations) {
      const key = `${operation.operation}_${operation.serviceId}`;
      results[key] = await validateOperationPermission(operation);
    }

    return results;
  }, [validateOperationPermission]);

  // Verificar se usuário pode gerenciar briefings
  const canManageBriefings = useCallback((): boolean => {
    const userPermissions = user?.data?.permissions || [];
    return userPermissions.includes('briefing:manage') || 
           userPermissions.includes('admin');
  }, [user]);

  // Verificar se usuário pode submeter briefings
  const canSubmitBriefings = useCallback((): boolean => {
    const userPermissions = user?.data?.permissions || [];
    return userPermissions.includes('briefing:submit') || 
           userPermissions.includes('briefing:manage') ||
           userPermissions.includes('admin');
  }, [user]);

  // Obter estatísticas de permissões
  const getPermissionStats = useCallback(() => {
    const userPermissions = user?.data?.permissions || [];
    
    return {
      totalPermissions: userPermissions.length,
      briefingPermissions: userPermissions.filter(p => p.startsWith('briefing:')).length,
      canManage: canManageBriefings(),
      canSubmit: canSubmitBriefings(),
      isAdmin: userPermissions.includes('admin'),
      agencyId: user?.data?.agencyId
    };
  }, [user, canManageBriefings, canSubmitBriefings]);

  return {
    validateUserPermissions,
    validateOperationPermission,
    validateMultipleOperations,
    canManageBriefings,
    canSubmitBriefings,
    getPermissionStats,
    getRequiredPermissions
  };
}

