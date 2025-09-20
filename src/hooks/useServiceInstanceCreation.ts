/**
 * 🔧 Hook Centralizado para Criação de Instâncias de Serviço
 * 
 * Centraliza toda a lógica de criação de instâncias de serviço com tratamento robusto de erros
 */

import { useState, useCallback } from 'react';
import { Service, ProjectTeam } from '@/api/entities';
import { generateTasksFromService } from '@/api/functions';
import { useSession } from '@/components/auth/SessionManager';
import { toast } from 'sonner';
import { useMandatoryBriefing } from './useMandatoryBriefing';

// Tipos para criação de instância
export interface ServiceInstanceData {
  templateId: string;
  clientId: string;
  name: string;
  description: string;
  startDate: string;
  endDate?: string;
  contractValue?: number;
  contractTerms?: any;
  customizations?: any;
  teamAssignments?: {
    consultor_lider?: string;
    consultor_apoio?: string[];
    cliente_gestor?: string;
    cliente_aprovador?: string;
  };
}

export interface ServiceInstanceResult {
  success: boolean;
  serviceInstance?: any;
  serviceId?: string;
  error?: string;
  warnings?: string[];
}

export interface ServiceInstanceCreationState {
  isCreating: boolean;
  error: string | null;
  warnings: string[];
  lastCreatedId: string | null;
}

export function useServiceInstanceCreation() {
  const { user } = useSession();
  const { createMandatoryBriefingTask } = useMandatoryBriefing();
  const [state, setState] = useState<ServiceInstanceCreationState>({
    isCreating: false,
    error: null,
    warnings: [],
    lastCreatedId: null
  });

  // Verificar permissões do usuário
  const validatePermissions = useCallback(async (data: ServiceInstanceData): Promise<{ hasPermission: boolean; error?: string }> => {
    try {
      // Verificar se usuário tem agência
      if (!user?.data?.agencyId) {
        return { hasPermission: false, error: 'Usuário não tem agência associada' };
      }

      // Verificar se usuário pode criar serviços
      if (!user?.data?.permissions?.includes('service:create')) {
        return { hasPermission: false, error: 'Sem permissão para criar serviços' };
      }

      // Verificar se template existe e é válido
      const template = await Service.get(data.templateId);
      if (!template) {
        return { hasPermission: false, error: 'Template não encontrado' };
      }

      if (!template.is_template) {
        return { hasPermission: false, error: 'Serviço selecionado não é um template' };
      }

      // Verificar se template pertence à agência do usuário
      if (template.agencyId !== user.data.agencyId) {
        return { hasPermission: false, error: 'Template não pertence à sua agência' };
      }

      // Verificar se cliente existe e pertence à agência
      const { Client } = await import('@/api/entities');
      const client = await Client.get(data.clientId);
      if (!client) {
        return { hasPermission: false, error: 'Cliente não encontrado' };
      }

      if (client.agencyId !== user.data.agencyId) {
        return { hasPermission: false, error: 'Cliente não pertence à sua agência' };
      }

      return { hasPermission: true };
    } catch (error) {
      console.error('[ServiceInstanceCreation] Erro ao validar permissões:', error);
      return { hasPermission: false, error: 'Erro ao validar permissões' };
    }
  }, [user]);

  // Sanitizar dados de entrada
  const sanitizeInstanceData = useCallback((data: ServiceInstanceData): ServiceInstanceData => {
    const sanitizeString = (str: string | undefined): string => {
      if (!str) return '';
      return str.trim().replace(/[<>]/g, '').substring(0, 1000); // Limitar tamanho
    };

    const sanitizeNumber = (num: number | undefined): number | undefined => {
      if (num === undefined || num === null) return undefined;
      if (typeof num !== 'number' || isNaN(num)) return undefined;
      return Math.max(0, Math.min(num, 10000000)); // Limitar entre 0 e 10M
    };

    return {
      ...data,
      templateId: sanitizeString(data.templateId),
      clientId: sanitizeString(data.clientId),
      name: sanitizeString(data.name),
      description: sanitizeString(data.description),
      startDate: data.startDate,
      endDate: data.endDate,
      contractValue: sanitizeNumber(data.contractValue),
      contractTerms: data.contractTerms,
      customizations: data.customizations,
      teamAssignments: data.teamAssignments ? {
        ...data.teamAssignments,
        consultor_lider: sanitizeString(data.teamAssignments.consultor_lider),
        consultor_apoio: data.teamAssignments.consultor_apoio?.map(id => sanitizeString(id)).filter(Boolean),
        cliente_gestor: sanitizeString(data.teamAssignments.cliente_gestor),
        cliente_aprovador: sanitizeString(data.teamAssignments.cliente_aprovador)
      } : undefined
    };
  }, []);

  // Validar dados de entrada com validação robusta
  const validateInstanceData = useCallback((data: ServiceInstanceData): string[] => {
    const errors: string[] = [];

    // Validações obrigatórias
    if (!data.templateId?.trim()) {
      errors.push('Template é obrigatório');
    }

    if (!data.clientId?.trim()) {
      errors.push('Cliente é obrigatório');
    }

    if (!data.name?.trim()) {
      errors.push('Nome do serviço é obrigatório');
    } else if (data.name.trim().length < 3) {
      errors.push('Nome do serviço deve ter pelo menos 3 caracteres');
    } else if (data.name.trim().length > 150) {
      errors.push('Nome do serviço deve ter no máximo 150 caracteres');
    }

    if (!data.description?.trim()) {
      errors.push('Descrição do serviço é obrigatória');
    } else if (data.description.trim().length < 10) {
      errors.push('Descrição deve ter pelo menos 10 caracteres');
    } else if (data.description.trim().length > 500) {
      errors.push('Descrição deve ter no máximo 500 caracteres');
    }

    if (!data.startDate) {
      errors.push('Data de início é obrigatória');
    } else {
      const startDate = new Date(data.startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (isNaN(startDate.getTime())) {
        errors.push('Data de início inválida');
      } else if (startDate < today) {
        errors.push('Data de início não pode ser no passado');
      }
    }

    // Validações condicionais
    if (data.endDate) {
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);
      
      if (isNaN(endDate.getTime())) {
        errors.push('Data de fim inválida');
      } else if (endDate <= startDate) {
        errors.push('Data de fim deve ser posterior à data de início');
      }
    }

    if (data.contractValue !== undefined) {
      if (typeof data.contractValue !== 'number' || isNaN(data.contractValue)) {
        errors.push('Valor do contrato deve ser um número válido');
      } else if (data.contractValue < 0) {
        errors.push('Valor do contrato deve ser positivo');
      } else if (data.contractValue > 10000000) {
        errors.push('Valor do contrato muito alto (máximo R$ 10.000.000)');
      }
    }

    // Validação de atribuições de equipe
    if (data.teamAssignments) {
      const { consultor_lider, consultor_apoio } = data.teamAssignments;
      
      if (consultor_apoio && Array.isArray(consultor_apoio)) {
        if (consultor_apoio.length > 5) {
          errors.push('Máximo 5 consultores de apoio');
        }
        
        const invalidIds = consultor_apoio.filter(id => !id || typeof id !== 'string');
        if (invalidIds.length > 0) {
          errors.push('IDs de consultores de apoio inválidos');
        }
      }
    }

    return errors;
  }, []);

  // Extrair ID do serviço de forma padronizada
  const extractServiceId = useCallback((response: any): string | null => {
    // Estrutura padronizada da API Base44
    const serviceId = response?.data?.id || response?.id;
    
    if (serviceId && typeof serviceId === 'string') {
      return serviceId;
    }

    // Log para debug em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.warn('[ServiceInstanceCreation] Estrutura de resposta inesperada:', {
        response,
        possibleId: serviceId,
        type: typeof serviceId
      });
    }

    return null;
  }, []);

  // Criar instância de serviço
  const createServiceInstance = useCallback(async (data: ServiceInstanceData): Promise<ServiceInstanceResult> => {
    // 1. Sanitizar dados de entrada
    const sanitizedData = sanitizeInstanceData(data);
    
    // 2. Validar dados sanitizados
    const validationErrors = validateInstanceData(sanitizedData);
    if (validationErrors.length > 0) {
      return {
        success: false,
        error: validationErrors.join('; ')
      };
    }

    // 3. Verificar permissões
    const permissionCheck = await validatePermissions(sanitizedData);
    if (!permissionCheck.hasPermission) {
      return {
        success: false,
        error: permissionCheck.error || 'Sem permissão para criar serviço'
      };
    }

    setState(prev => ({
      ...prev,
      isCreating: true,
      error: null,
      warnings: []
    }));

    try {
      // 4. Buscar template (já validado em validatePermissions)
      const template = await Service.get(sanitizedData.templateId);

      // 5. Criar instância do serviço com dados sanitizados
      const serviceInstanceData = {
        agencyId: user!.data.agencyId,
        clientId: sanitizedData.clientId,
        name: sanitizedData.name,
        description: sanitizedData.description,
        category: template.category,
        version: template.version,
        deliverables: template.deliverables || [],
        pricing: template.pricing,
        cycle_frequency: template.cycle_frequency,
        approval_policy: template.approval_policy,
        is_active: true,
        is_template: false, // Esta é uma instância
        base_service_id: sanitizedData.templateId,
        template_version_used: template.version,
        service_status: 'active',
        start_date: sanitizedData.startDate,
        end_date: sanitizedData.endDate || null,
        contract_value: sanitizedData.contractValue || null,
        contract_terms: sanitizedData.contractTerms || null,
        customizations: sanitizedData.customizations || {},
        instance_metadata: {
          created_from_template: sanitizedData.templateId,
          customizations_applied: [],
          client_specific_notes: '',
          account_manager: sanitizedData.teamAssignments?.consultor_lider || '',
          project_code: `${sanitizedData.name.substring(0, 3).toUpperCase()}-${template.name.substring(0, 3).toUpperCase()}-${new Date().getFullYear()}`,
          created_by: user!.data.id,
          created_at: new Date().toISOString()
        }
      };

      const serviceInstance = await Service.create(serviceInstanceData);
      const serviceId = extractServiceId(serviceInstance);

      if (!serviceId) {
        throw new Error('Falha ao obter ID da instância criada');
      }

      // 6. Criar atribuições de equipe com tratamento de erro melhorado
      const teamAssignments = sanitizedData.teamAssignments || {};
      const teamAssignmentResults = [];
      const teamAssignmentErrors = [];

      for (const [role, userId] of Object.entries(teamAssignments)) {
        if (Array.isArray(userId)) {
          // Múltiplas atribuições (ex: consultor_apoio)
          for (const id of userId) {
            if (id) {
              try {
                const assignment = await ProjectTeam.create({
                  agencyId: user!.data.agencyId,
                  service_instance_id: serviceId,
                  user_id: id,
                  role: role,
                  is_active: true,
                  start_date: sanitizedData.startDate
                });
                teamAssignmentResults.push(assignment);
              } catch (assignmentError) {
                teamAssignmentErrors.push(`Erro ao atribuir ${role}: ${assignmentError.message}`);
                console.warn(`Erro ao criar atribuição de equipe para ${role}:`, assignmentError);
              }
            }
          }
        } else if (userId) {
          // Atribuição única
          try {
            const assignment = await ProjectTeam.create({
              agencyId: user!.data.agencyId,
              service_instance_id: serviceId,
              user_id: userId,
              role: role,
              is_active: true,
              start_date: sanitizedData.startDate
            });
            teamAssignmentResults.push(assignment);
          } catch (assignmentError) {
            teamAssignmentErrors.push(`Erro ao atribuir ${role}: ${assignmentError.message}`);
            console.warn(`Erro ao criar atribuição de equipe para ${role}:`, assignmentError);
          }
        }
      }

      // 7. Gerar tarefas automaticamente com tratamento melhorado
      let taskGenerationResult = null;
      let taskGenerationError = null;
      
      try {
        taskGenerationResult = await generateTasksFromService({
          serviceId: serviceId,
          autoAssign: true,
          startDate: sanitizedData.startDate
        });
      } catch (taskError) {
        taskGenerationError = taskError.message;
        console.warn('Erro ao gerar tarefas automaticamente:', taskError);
      }

      // 8. Criar briefing obrigatório como primeira tarefa
      let briefingError = null;
      try {
        await createMandatoryBriefingTask(serviceId, sanitizedData.clientId);
        console.log('✅ Briefing obrigatório criado automaticamente');
      } catch (briefingError) {
        briefingError = briefingError.message;
        console.warn('⚠️ Falha ao criar briefing obrigatório:', briefingError);
      }

      // 9. Preparar resultado com warnings detalhados
      const warnings: string[] = [];
      
      if (teamAssignmentResults.length === 0 && Object.keys(teamAssignments).length > 0) {
        warnings.push('Nenhuma atribuição de equipe foi criada');
      }
      
      if (teamAssignmentErrors.length > 0) {
        warnings.push(`Erros em atribuições de equipe: ${teamAssignmentErrors.join('; ')}`);
      }
      
      if (!taskGenerationResult) {
        warnings.push('Tarefas não foram geradas automaticamente - gere manualmente se necessário');
      }
      
      if (taskGenerationError) {
        warnings.push(`Erro na geração de tarefas: ${taskGenerationError}`);
      }

      if (briefingError) {
        warnings.push('Briefing obrigatório não foi criado automaticamente');
      }

      setState(prev => ({
        ...prev,
        isCreating: false,
        lastCreatedId: serviceId,
        warnings
      }));

      return {
        success: true,
        serviceInstance,
        serviceId,
        warnings: warnings.length > 0 ? warnings : undefined
      };

    } catch (error: any) {
      let errorMessage = 'Erro desconhecido ao criar instância de serviço';
      let errorCode = 'UNKNOWN_ERROR';
      
      // Tratamento específico por tipo de erro
      if (error.response?.status === 404) {
        if (error.response?.data?.message?.includes('template')) {
          errorMessage = 'Template não encontrado';
          errorCode = 'TEMPLATE_NOT_FOUND';
        } else if (error.response?.data?.message?.includes('client')) {
          errorMessage = 'Cliente não encontrado';
          errorCode = 'CLIENT_NOT_FOUND';
        } else {
          errorMessage = 'Recurso não encontrado';
          errorCode = 'RESOURCE_NOT_FOUND';
        }
      } else if (error.response?.status === 403) {
        errorMessage = 'Sem permissão para criar serviço para este cliente';
        errorCode = 'PERMISSION_DENIED';
      } else if (error.response?.status === 400) {
        errorMessage = error.response?.data?.message || 'Dados inválidos';
        errorCode = 'VALIDATION_ERROR';
      } else if (error.response?.status === 409) {
        errorMessage = 'Já existe um serviço com este nome para este cliente';
        errorCode = 'DUPLICATE_SERVICE';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Erro interno do servidor. Tente novamente em alguns minutos';
        errorCode = 'SERVER_ERROR';
      } else if (error.code === 'NETWORK_ERROR' || !navigator.onLine) {
        errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente';
        errorCode = 'NETWORK_ERROR';
      } else if (error.message) {
        errorMessage = error.message;
        errorCode = 'API_ERROR';
      }

      // Log detalhado para debug
      console.error('[ServiceInstanceCreation] Erro ao criar instância:', {
        errorCode,
        errorMessage,
        originalError: error,
        data: data,
        timestamp: new Date().toISOString()
      });
      
      setState(prev => ({
        ...prev,
        isCreating: false,
        error: errorMessage
      }));

      return {
        success: false,
        error: errorMessage,
        errorCode
      };
    }
  }, [user, validateInstanceData, extractServiceId]);

  // Criar instância com feedback visual
  const createServiceInstanceWithFeedback = useCallback(async (data: ServiceInstanceData): Promise<ServiceInstanceResult> => {
    const result = await createServiceInstance(data);

    if (result.success) {
      toast.success('Instância de serviço criada com sucesso!');
      
      if (result.warnings && result.warnings.length > 0) {
        toast.warning('Atenção:', {
          description: result.warnings.join('; ')
        });
      }
    } else {
      toast.error('Erro ao criar instância:', {
        description: result.error
      });
    }

    return result;
  }, [createServiceInstance]);

  // Limpar estado
  const clearState = useCallback(() => {
    setState({
      isCreating: false,
      error: null,
      warnings: [],
      lastCreatedId: null
    });
  }, []);

  // Obter estatísticas
  const getStats = useCallback(() => {
    return {
      isCreating: state.isCreating,
      hasError: !!state.error,
      hasWarnings: state.warnings.length > 0,
      lastCreatedId: state.lastCreatedId
    };
  }, [state]);

  return {
    // Estado
    ...state,
    
    // Ações
    createServiceInstance,
    createServiceInstanceWithFeedback,
    clearState,
    
    // Utilitários
    validateInstanceData,
    sanitizeInstanceData,
    validatePermissions,
    extractServiceId,
    getStats
  };
}
