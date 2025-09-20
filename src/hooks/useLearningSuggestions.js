import { useState, useCallback, useEffect } from 'react';
import { LearningEntry } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';

/**
 * Hook para gerenciar sugestões automáticas de aprendizados
 * Baseado em contexto, tags, cliente, serviço ou tarefa
 */
export function useLearningSuggestions() {
  const { agency } = useSession();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Busca sugestões baseadas no contexto
   */
  const getSuggestions = useCallback(async (context) => {
    setLoading(true);
    setError(null);

    try {
      const {
        clientId,
        serviceId,
        taskId,
        tags = [],
        niche,
        format,
        limit = 5
      } = context;

      // Construir filtros de busca
      const filters = {
        agencyId: agency.id,
        reviewed: true,
        isShared: true
      };

      // Adicionar filtros baseados no contexto
      const orConditions = [];

      if (tags.length > 0) {
        orConditions.push({ tags: { $in: tags } });
      }

      if (niche) {
        orConditions.push({ niche: niche });
      }

      if (format) {
        orConditions.push({ format: format });
      }

      if (clientId) {
        orConditions.push({ 'metadata.linkedClients': clientId });
      }

      if (serviceId) {
        orConditions.push({ 'metadata.linkedServices': serviceId });
      }

      if (taskId) {
        orConditions.push({ 'metadata.linkedTasks': taskId });
      }

      if (orConditions.length > 0) {
        filters.$or = orConditions;
      }

      // Buscar aprendizados
      const learnings = await LearningEntry.filter(filters, '-created_date');

      // Ordenar por relevância
      const scoredLearnings = learnings.map(learning => ({
        ...learning,
        relevanceScore: calculateRelevanceScore(learning, context)
      }));

      // Ordenar por score de relevância
      scoredLearnings.sort((a, b) => b.relevanceScore - a.relevanceScore);

      // Retornar apenas o limite especificado
      const finalSuggestions = scoredLearnings.slice(0, limit);

      setSuggestions(finalSuggestions);
      return finalSuggestions;

    } catch (err) {
      setError(err.message);
      console.error('Erro ao buscar sugestões de aprendizados:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [agency]);

  /**
   * Calcula score de relevância para um aprendizado
   */
  const calculateRelevanceScore = (learning, context) => {
    let score = 0;
    const { tags = [], niche, format, clientId, serviceId, taskId } = context;

    // Score base por confiança
    score += (learning.confidence_score || 0) * 0.3;

    // Score por tags em comum
    if (tags.length > 0 && learning.tags) {
      const commonTags = tags.filter(tag => learning.tags.includes(tag));
      score += (commonTags.length / tags.length) * 40;
    }

    // Score por nicho
    if (niche && learning.niche === niche) {
      score += 20;
    }

    // Score por formato
    if (format && learning.format === format) {
      score += 15;
    }

    // Score por vinculação com cliente
    if (clientId && learning.metadata?.linkedClients?.includes(clientId)) {
      score += 25;
    }

    // Score por vinculação com serviço
    if (serviceId && learning.metadata?.linkedServices?.includes(serviceId)) {
      score += 20;
    }

    // Score por vinculação com tarefa
    if (taskId && learning.metadata?.linkedTasks?.includes(taskId)) {
      score += 15;
    }

    // Score por aplicações anteriores
    if (learning.metadata?.appliedToBriefings?.length > 0) {
      score += 10;
    }

    if (learning.metadata?.appliedToCycles?.length > 0) {
      score += 10;
    }

    // Score por promoção para playbook
    if (learning.isShared) {
      score += 5;
    }

    return Math.min(score, 100); // Cap em 100
  };

  /**
   * Busca sugestões para um cliente específico
   */
  const getClientSuggestions = useCallback(async (clientId, limit = 5) => {
    return getSuggestions({ clientId, limit });
  }, [getSuggestions]);

  /**
   * Busca sugestões para um serviço específico
   */
  const getServiceSuggestions = useCallback(async (serviceId, limit = 5) => {
    return getSuggestions({ serviceId, limit });
  }, [getSuggestions]);

  /**
   * Busca sugestões para uma tarefa específica
   */
  const getTaskSuggestions = useCallback(async (taskId, limit = 5) => {
    return getSuggestions({ taskId, limit });
  }, [getSuggestions]);

  /**
   * Busca sugestões baseadas em tags
   */
  const getTagSuggestions = useCallback(async (tags, limit = 5) => {
    return getSuggestions({ tags, limit });
  }, [getSuggestions]);

  /**
   * Busca sugestões baseadas em nicho e formato
   */
  const getContextSuggestions = useCallback(async (niche, format, limit = 5) => {
    return getSuggestions({ niche, format, limit });
  }, [getSuggestions]);

  /**
   * Limpa sugestões
   */
  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setError(null);
  }, []);

  return {
    suggestions,
    loading,
    error,
    getSuggestions,
    getClientSuggestions,
    getServiceSuggestions,
    getTaskSuggestions,
    getTagSuggestions,
    getContextSuggestions,
    clearSuggestions
  };
}

