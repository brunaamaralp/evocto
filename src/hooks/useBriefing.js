/**
 * 🎣 Hook para Gerenciar Briefing
 * 
 * Hook principal para gerenciar briefing por instância de serviço
 * Integra com serviço de briefing e aplicação de regras de IA
 */

import { useState, useCallback, useEffect } from 'react';
import { briefingService } from '@/services/briefingService';
import { useSession } from '@/components/auth/SessionManager';
import { toast } from 'sonner';

export function useBriefing(servicoInstanciaId) {
  const { user } = useSession();
  const [state, setState] = useState({
    briefing: null,
    briefings: [],
    adjustments: [],
    stats: null,
    isLoading: false,
    isSubmitting: false,
    error: null
  });

  // Carregar briefing ativo mais recente
  const loadLatestBriefing = useCallback(async () => {
    if (!servicoInstanciaId) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const briefing = await briefingService.getLatestActiveBriefing(servicoInstanciaId);
      setState(prev => ({ ...prev, briefing, isLoading: false }));
    } catch (error) {
      console.error('[useBriefing] Erro ao carregar briefing:', error);
      setState(prev => ({ 
        ...prev, 
        error: error.message, 
        isLoading: false 
      }));
    }
  }, [servicoInstanciaId]);

  // Carregar todos os briefings do serviço
  const loadBriefings = useCallback(async () => {
    if (!servicoInstanciaId) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const briefings = await briefingService.getBriefingsByService(servicoInstanciaId);
      setState(prev => ({ ...prev, briefings, isLoading: false }));
    } catch (error) {
      console.error('[useBriefing] Erro ao carregar briefings:', error);
      setState(prev => ({ 
        ...prev, 
        error: error.message, 
        isLoading: false 
      }));
    }
  }, [servicoInstanciaId]);

  // Carregar ajustes ativos
  const loadAdjustments = useCallback(async () => {
    if (!servicoInstanciaId) return;

    try {
      const adjustments = await briefingService.getActiveAdjustmentsByService(servicoInstanciaId);
      setState(prev => ({ ...prev, adjustments }));
    } catch (error) {
      console.error('[useBriefing] Erro ao carregar ajustes:', error);
    }
  }, [servicoInstanciaId]);

  // Carregar estatísticas
  const loadStats = useCallback(async () => {
    if (!servicoInstanciaId) return;

    try {
      const stats = await briefingService.getBriefingStats(servicoInstanciaId);
      setState(prev => ({ ...prev, stats }));
    } catch (error) {
      console.error('[useBriefing] Erro ao carregar estatísticas:', error);
    }
  }, [servicoInstanciaId]);

  // Criar novo briefing
  const createBriefing = useCallback(async (data) => {
    if (!servicoInstanciaId || !user?.data?.id) {
      throw new Error('Dados obrigatórios não fornecidos');
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const briefing = await briefingService.createBriefing({
        servico_instancia_id: servicoInstanciaId,
        cliente_id: data.cliente_id,
        servico_tipo: data.servico_tipo,
        itens: data.itens,
        preenchido_por_user_id: user.data.id
      });

      setState(prev => ({ 
        ...prev, 
        briefing, 
        isLoading: false 
      }));

      toast.success('Briefing criado com sucesso!');
      return briefing;

    } catch (error) {
      console.error('[useBriefing] Erro ao criar briefing:', error);
      setState(prev => ({ 
        ...prev, 
        error: error.message, 
        isLoading: false 
      }));
      toast.error(`Erro ao criar briefing: ${error.message}`);
      throw error;
    }
  }, [servicoInstanciaId, user?.data?.id]);

  // Atualizar briefing
  const updateBriefing = useCallback(async (briefingId, data) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const briefing = await briefingService.updateBriefing(briefingId, data);
      
      setState(prev => ({ 
        ...prev, 
        briefing, 
        isLoading: false 
      }));

      toast.success('Briefing atualizado com sucesso!');
      return briefing;

    } catch (error) {
      console.error('[useBriefing] Erro ao atualizar briefing:', error);
      setState(prev => ({ 
        ...prev, 
        error: error.message, 
        isLoading: false 
      }));
      toast.error(`Erro ao atualizar briefing: ${error.message}`);
      throw error;
    }
  }, []);

  // Enviar briefing e aplicar regras de IA
  const submitBriefing = useCallback(async (briefingId) => {
    setState(prev => ({ ...prev, isSubmitting: true, error: null }));

    try {
      const result = await briefingService.submitBriefing(briefingId);
      
      setState(prev => ({ 
        ...prev, 
        briefing: result.briefing,
        adjustments: result.adjustments,
        isSubmitting: false 
      }));

      toast.success(`Briefing enviado! ${result.adjustments.length} ajustes aplicados.`);
      return result;

    } catch (error) {
      console.error('[useBriefing] Erro ao enviar briefing:', error);
      setState(prev => ({ 
        ...prev, 
        error: error.message, 
        isSubmitting: false 
      }));
      toast.error(`Erro ao enviar briefing: ${error.message}`);
      throw error;
    }
  }, []);

  // Criar nova versão do briefing
  const createNewVersion = useCallback(async (briefingId) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const newBriefing = await briefingService.createNewVersion(briefingId);
      
      setState(prev => ({ 
        ...prev, 
        briefing: newBriefing,
        isLoading: false 
      }));

      toast.success('Nova versão do briefing criada!');
      return newBriefing;

    } catch (error) {
      console.error('[useBriefing] Erro ao criar nova versão:', error);
      setState(prev => ({ 
        ...prev, 
        error: error.message, 
        isLoading: false 
      }));
      toast.error(`Erro ao criar nova versão: ${error.message}`);
      throw error;
    }
  }, []);

  // Aplicar ajustes a lista de tarefas
  const applyAdjustmentsToTasks = useCallback(async (tasks) => {
    if (!servicoInstanciaId) return { adjustedTasks: tasks, newTasks: [] };

    try {
      const result = await briefingService.applyAdjustmentsToTasks(tasks, servicoInstanciaId);
      return result;
    } catch (error) {
      console.error('[useBriefing] Erro ao aplicar ajustes:', error);
      return { adjustedTasks: tasks, newTasks: [] };
    }
  }, [servicoInstanciaId]);

  // Recarregar dados
  const refresh = useCallback(async () => {
    await Promise.all([
      loadLatestBriefing(),
      loadBriefings(),
      loadAdjustments(),
      loadStats()
    ]);
  }, [loadLatestBriefing, loadBriefings, loadAdjustments, loadStats]);

  // Carregar dados iniciais
  useEffect(() => {
    if (servicoInstanciaId) {
      refresh();
    }
  }, [servicoInstanciaId, refresh]);

  return {
    // Estado
    briefing: state.briefing,
    briefings: state.briefings,
    adjustments: state.adjustments,
    stats: state.stats,
    isLoading: state.isLoading,
    isSubmitting: state.isSubmitting,
    error: state.error,

    // Ações
    createBriefing,
    updateBriefing,
    submitBriefing,
    createNewVersion,
    applyAdjustmentsToTasks,
    refresh,

    // Utilitários
    hasActiveBriefing: !!state.briefing && state.briefing.status === 'ativo',
    hasDraftBriefing: !!state.briefing && state.briefing.status === 'rascunho',
    canSubmit: !!state.briefing && state.briefing.status === 'rascunho',
    adjustmentsCount: state.adjustments.length
  };
}

export default useBriefing;

