import { useState, useCallback } from 'react';
import { LearningEntry, Client, Service, Task } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';
import { briefingLearningIntegration } from '@/services/BriefingLearningIntegration';
import { cycleLearningIntegration } from '@/services/CycleLearningIntegration';
import { toast } from 'sonner';

/**
 * Hook para gerenciamento completo de aprendizados
 * Inclui CRUD, vinculação com outros módulos e aplicação
 */
export function useLearningManagement() {
  const { agency, user } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Configurar serviços de integração
  briefingLearningIntegration.setSession({ agency, user });
  cycleLearningIntegration.setSession({ agency, user });

  /**
   * Cria um novo aprendizado manual
   */
  const createLearning = useCallback(async (learningData, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const {
        title,
        description,
        niche,
        format,
        trigger,
        promise,
        rationale,
        tags = [],
        clientId,
        serviceId,
        taskId,
        sourceType = 'manual',
        sourceRef = null,
        isShared = false
      } = learningData;

      // Validar dados obrigatórios
      if (!title || !description || !niche || !format) {
        throw new Error('Título, descrição, nicho e formato são obrigatórios');
      }

      // Criar aprendizado
      const newLearning = await LearningEntry.create({
        agencyId: agency.id,
        title,
        description,
        niche,
        format,
        trigger: trigger || null,
        promise: promise || null,
        rationale: rationale || null,
        tags: Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim()).filter(Boolean),
        sourceType,
        sourceRef,
        isShared,
        reviewed: false,
        confidence_score: 85, // Score padrão para aprendizados manuais
        metadata: {
          createdBy: user.email,
          createdAt: new Date().toISOString(),
          source: 'manual_entry',
          ...options.metadata
        }
      });

      // Vincular com cliente se especificado
      if (clientId) {
        await linkLearningToClient(newLearning.id, clientId);
      }

      // Vincular com serviço se especificado
      if (serviceId) {
        await linkLearningToService(newLearning.id, serviceId);
      }

      // Vincular com tarefa se especificado
      if (taskId) {
        await linkLearningToTask(newLearning.id, taskId);
      }

      toast.success('Aprendizado criado com sucesso!');
      return newLearning;

    } catch (err) {
      const errorMessage = err.message || 'Erro ao criar aprendizado';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [agency, user]);

  /**
   * Atualiza um aprendizado existente
   */
  const updateLearning = useCallback(async (learningId, updates) => {
    setLoading(true);
    setError(null);

    try {
      const updatedLearning = await LearningEntry.update(learningId, {
        ...updates,
        metadata: {
          ...updates.metadata,
          updatedBy: user.email,
          updatedAt: new Date().toISOString()
        }
      });

      toast.success('Aprendizado atualizado com sucesso!');
      return updatedLearning;

    } catch (err) {
      const errorMessage = err.message || 'Erro ao atualizar aprendizado';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Vincula aprendizado a um cliente
   */
  const linkLearningToClient = useCallback(async (learningId, clientId) => {
    try {
      const learning = await LearningEntry.get(learningId);
      const client = await Client.get(clientId);

      // Atualizar aprendizado com referência ao cliente
      await LearningEntry.update(learningId, {
        projectId: client.name, // Mantém compatibilidade com código existente
        metadata: {
          ...learning.metadata,
          linkedClients: [...(learning.metadata?.linkedClients || []), clientId],
          lastLinkedAt: new Date().toISOString()
        }
      });

      // Atualizar cliente com referência ao aprendizado
      await Client.update(clientId, {
        metadata: {
          ...client.metadata,
          linkedLearnings: [...(client.metadata?.linkedLearnings || []), learningId],
          lastLearningLinkedAt: new Date().toISOString()
        }
      });

      return true;
    } catch (err) {
      console.error('Erro ao vincular aprendizado ao cliente:', err);
      throw err;
    }
  }, []);

  /**
   * Vincula aprendizado a um serviço
   */
  const linkLearningToService = useCallback(async (learningId, serviceId) => {
    try {
      const learning = await LearningEntry.get(learningId);
      const service = await Service.get(serviceId);

      // Atualizar aprendizado com referência ao serviço
      await LearningEntry.update(learningId, {
        metadata: {
          ...learning.metadata,
          linkedServices: [...(learning.metadata?.linkedServices || []), serviceId],
          lastLinkedAt: new Date().toISOString()
        }
      });

      // Atualizar serviço com referência ao aprendizado
      await Service.update(serviceId, {
        metadata: {
          ...service.metadata,
          linkedLearnings: [...(service.metadata?.linkedLearnings || []), learningId],
          lastLearningLinkedAt: new Date().toISOString()
        }
      });

      return true;
    } catch (err) {
      console.error('Erro ao vincular aprendizado ao serviço:', err);
      throw err;
    }
  }, []);

  /**
   * Vincula aprendizado a uma tarefa
   */
  const linkLearningToTask = useCallback(async (learningId, taskId) => {
    try {
      const learning = await LearningEntry.get(learningId);
      const task = await Task.get(taskId);

      // Atualizar aprendizado com referência à tarefa
      await LearningEntry.update(learningId, {
        metadata: {
          ...learning.metadata,
          linkedTasks: [...(learning.metadata?.linkedTasks || []), taskId],
          lastLinkedAt: new Date().toISOString()
        }
      });

      // Atualizar tarefa com referência ao aprendizado
      await Task.update(taskId, {
        metadata: {
          ...task.metadata,
          linkedLearnings: [...(task.metadata?.linkedLearnings || []), learningId],
          lastLearningLinkedAt: new Date().toISOString()
        }
      });

      return true;
    } catch (err) {
      console.error('Erro ao vincular aprendizado à tarefa:', err);
      throw err;
    }
  }, []);

  /**
   * Aplica aprendizado a um briefing
   */
  const applyLearningToBriefing = useCallback(async (learningId, briefingId, applicationNotes = '') => {
    setLoading(true);
    setError(null);

    try {
      // Usar serviço de integração real
      await briefingLearningIntegration.applyLearningToBriefing(learningId, briefingId, applicationNotes);
      
      toast.success('Aprendizado aplicado ao briefing com sucesso!');
      return true;

    } catch (err) {
      const errorMessage = err.message || 'Erro ao aplicar aprendizado ao briefing';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Aplica aprendizado a um ciclo de execução
   */
  const applyLearningToCycle = useCallback(async (learningId, cycleId, applicationNotes = '') => {
    setLoading(true);
    setError(null);

    try {
      // Usar serviço de integração real
      await cycleIntegration.applyLearningToCycle(learningId, cycleId, applicationNotes);
      
      toast.success('Aprendizado aplicado ao ciclo com sucesso!');
      return true;

    } catch (err) {
      const errorMessage = err.message || 'Erro ao aplicar aprendizado ao ciclo';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Promove aprendizado para playbook da agência
   */
  const promoteToPlaybook = useCallback(async (learningId, promotionData = {}) => {
    setLoading(true);
    setError(null);

    try {
      const learning = await LearningEntry.get(learningId);
      
      // Marcar como compartilhado e promovido
      await LearningEntry.update(learningId, {
        isShared: true,
        tags: [...(learning.tags || []), 'promoted_to_playbook'],
        metadata: {
          ...learning.metadata,
          promotedAt: new Date().toISOString(),
          promotedBy: user.email,
          promotionData
        }
      });

      toast.success('Aprendizado promovido para playbook da agência!');
      return true;

    } catch (err) {
      const errorMessage = err.message || 'Erro ao promover aprendizado';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Valida um aprendizado
   */
  const validateLearning = useCallback(async (learningId) => {
    setLoading(true);
    setError(null);

    try {
      await LearningEntry.update(learningId, {
        reviewed: true,
        reviewedBy: user.email,
        reviewedAt: new Date().toISOString()
      });

      toast.success('Aprendizado validado com sucesso!');
      return true;

    } catch (err) {
      const errorMessage = err.message || 'Erro ao validar aprendizado';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Arquivar um aprendizado
   */
  const archiveLearning = useCallback(async (learningId) => {
    setLoading(true);
    setError(null);

    try {
      const learning = await LearningEntry.get(learningId);
      
      await LearningEntry.update(learningId, {
        reviewed: true,
        tags: [...(learning.tags || []), 'archived'],
        metadata: {
          ...learning.metadata,
          archivedAt: new Date().toISOString(),
          archivedBy: user.email
        }
      });

      toast.success('Aprendizado arquivado com sucesso!');
      return true;

    } catch (err) {
      const errorMessage = err.message || 'Erro ao arquivar aprendizado';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Obtém sugestões de aprendizados baseadas no contexto
   */
  const getLearningSuggestions = useCallback(async (context) => {
    try {
      const { clientId, serviceId, taskId, tags = [] } = context;
      
      // Buscar aprendizados relacionados por tags, cliente ou serviço
      const suggestions = await LearningEntry.filter({
        agencyId: agency.id,
        $or: [
          { tags: { $in: tags } },
          { 'metadata.linkedClients': clientId },
          { 'metadata.linkedServices': serviceId },
          { 'metadata.linkedTasks': taskId }
        ],
        reviewed: true,
        isShared: true
      });

      return suggestions.slice(0, 5); // Retornar apenas 5 sugestões
    } catch (err) {
      console.error('Erro ao buscar sugestões de aprendizados:', err);
      return [];
    }
  }, [agency]);

  /**
   * Obtém sugestões de aprendizados para briefing
   */
  const getBriefingSuggestions = useCallback(async (briefingId, limit = 5) => {
    try {
      return await briefingLearningIntegration.getBriefingSuggestions(briefingId, limit);
    } catch (err) {
      console.error('Erro ao buscar sugestões para briefing:', err);
      return [];
    }
  }, []);

  /**
   * Obtém sugestões de aprendizados para ciclo
   */
  const getCycleSuggestions = useCallback(async (cycleId, limit = 5) => {
    try {
      return await cycleLearningIntegration.getCycleSuggestions(cycleId, limit);
    } catch (err) {
      console.error('Erro ao buscar sugestões para ciclo:', err);
      return [];
    }
  }, []);

  /**
   * Remove aplicação de aprendizado de briefing
   */
  const removeLearningFromBriefing = useCallback(async (learningId, briefingId) => {
    try {
      await briefingLearningIntegration.removeLearningFromBriefing(learningId, briefingId);
      toast.success('Aprendizado removido do briefing');
      return true;
    } catch (err) {
      const errorMessage = err.message || 'Erro ao remover aprendizado do briefing';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  }, []);

  /**
   * Remove aplicação de aprendizado de ciclo
   */
  const removeLearningFromCycle = useCallback(async (learningId, cycleId) => {
    try {
      await cycleLearningIntegration.removeLearningFromCycle(learningId, cycleId);
      toast.success('Aprendizado removido do ciclo');
      return true;
    } catch (err) {
      const errorMessage = err.message || 'Erro ao remover aprendizado do ciclo';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  }, []);

  return {
    // Estados
    loading,
    error,
    
    // Ações principais
    createLearning,
    updateLearning,
    validateLearning,
    archiveLearning,
    
    // Vinculação
    linkLearningToClient,
    linkLearningToService,
    linkLearningToTask,
    
    // Aplicação
    applyLearningToBriefing,
    applyLearningToCycle,
    promoteToPlaybook,
    
    // Sugestões
    getLearningSuggestions,
    getBriefingSuggestions,
    getCycleSuggestions,
    
    // Remoção
    removeLearningFromBriefing,
    removeLearningFromCycle
  };
}
