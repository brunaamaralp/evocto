/**
 * 🏢 Hook Centralizado de Validação de Agência
 * 
 * Centraliza a validação de agência em todos os componentes
 */

import { useCallback } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { toast } from 'sonner';

export interface AgencyValidationResult {
  isValid: boolean;
  agencyId: string | null;
  error: string | null;
}

export function useAgencyValidation() {
  const { user, agencyId } = useSession();

  // Validar se usuário tem agência válida
  const validateAgency = useCallback((): AgencyValidationResult => {
    // Verificar se usuário está logado
    if (!user?.data) {
      return {
        isValid: false,
        agencyId: null,
        error: 'Usuário não está logado'
      };
    }

    // Verificar se usuário tem agência
    if (!user.data.agencyId) {
      return {
        isValid: false,
        agencyId: null,
        error: 'Usuário não tem agência associada'
      };
    }

    // Verificar se agencyId do contexto está disponível
    if (!agencyId) {
      return {
        isValid: false,
        agencyId: null,
        error: 'ID da agência não encontrado no contexto'
      };
    }

    // Verificar se os IDs são consistentes
    if (user.data.agencyId !== agencyId) {
      return {
        isValid: false,
        agencyId: null,
        error: 'Inconsistência entre agência do usuário e contexto'
      };
    }

    return {
      isValid: true,
      agencyId: agencyId,
      error: null
    };
  }, [user, agencyId]);

  // Validar agência com feedback visual
  const validateAgencyWithFeedback = useCallback((): boolean => {
    const result = validateAgency();
    
    if (!result.isValid) {
      toast.error('Erro de configuração:', {
        description: result.error
      });
      return false;
    }
    
    return true;
  }, [validateAgency]);

  // Obter agência válida ou lançar erro
  const getValidAgencyId = useCallback((): string => {
    const result = validateAgency();
    
    if (!result.isValid) {
      throw new Error(result.error || 'Agência inválida');
    }
    
    return result.agencyId!;
  }, [validateAgency]);

  // Verificar se pode criar entidades
  const canCreateEntities = useCallback((): boolean => {
    return validateAgency().isValid;
  }, [validateAgency]);

  // Verificar se pode editar entidades
  const canEditEntities = useCallback((entityAgencyId?: string): boolean => {
    const agencyResult = validateAgency();
    
    if (!agencyResult.isValid) {
      return false;
    }

    // Se não especificou agência da entidade, assumir que pode editar
    if (!entityAgencyId) {
      return true;
    }

    // Verificar se a entidade pertence à mesma agência
    return entityAgencyId === agencyResult.agencyId;
  }, [validateAgency]);

  // Verificar se pode deletar entidades
  const canDeleteEntities = useCallback((entityAgencyId?: string): boolean => {
    return canEditEntities(entityAgencyId);
  }, [canEditEntities]);

  // Obter informações da agência para logs
  const getAgencyInfo = useCallback(() => {
    return {
      agencyId: agencyId,
      userId: user?.data?.id,
      userEmail: user?.email,
      isValid: validateAgency().isValid
    };
  }, [agencyId, user, validateAgency]);

  return {
    // Validações
    validateAgency,
    validateAgencyWithFeedback,
    getValidAgencyId,
    
    // Permissões
    canCreateEntities,
    canEditEntities,
    canDeleteEntities,
    
    // Informações
    getAgencyInfo,
    
    // Estado atual
    agencyId,
    isAgencyValid: validateAgency().isValid
  };
}

