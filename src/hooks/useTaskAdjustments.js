/**
 * 🎣 Hook para Gerenciar Ajustes de Tarefas
 * 
 * Hook específico para gerenciar ajustes aplicados às tarefas
 * Visualização e aplicação de ajustes baseados no briefing
 */

import { useState, useCallback, useEffect } from 'react';
import { briefingService } from '@/services/briefingService';
import { TaskAdjustment } from '@/models/TaskAdjustment';
import { toast } from 'sonner';

export function useTaskAdjustments(servicoInstanciaId) {
  const [state, setState] = useState({
    adjustments: [],
    isLoading: false,
    error: null,
    stats: null
  });

  // Carregar ajustes ativos
  const loadAdjustments = useCallback(async () => {
    if (!servicoInstanciaId) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const adjustments = await briefingService.getActiveAdjustmentsByService(servicoInstanciaId);
      setState(prev => ({ ...prev, adjustments, isLoading: false }));
    } catch (error) {
      console.error('[useTaskAdjustments] Erro ao carregar ajustes:', error);
      setState(prev => ({ 
        ...prev, 
        error: error.message, 
        isLoading: false 
      }));
    }
  }, [servicoInstanciaId]);

  // Carregar ajustes por briefing
  const loadAdjustmentsByBriefing = useCallback(async (briefingId) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const adjustments = await briefingService.getAdjustmentsByBriefing(briefingId);
      setState(prev => ({ ...prev, adjustments, isLoading: false }));
    } catch (error) {
      console.error('[useTaskAdjustments] Erro ao carregar ajustes do briefing:', error);
      setState(prev => ({ 
        ...prev, 
        error: error.message, 
        isLoading: false 
      }));
    }
  }, []);

  // Aplicar ajustes a lista de tarefas
  const applyAdjustmentsToTasks = useCallback(async (tasks) => {
    if (!servicoInstanciaId) return { adjustedTasks: tasks, newTasks: [] };

    try {
      const result = await briefingService.applyAdjustmentsToTasks(tasks, servicoInstanciaId);
      return result;
    } catch (error) {
      console.error('[useTaskAdjustments] Erro ao aplicar ajustes:', error);
      return { adjustedTasks: tasks, newTasks: [] };
    }
  }, [servicoInstanciaId]);

  // Obter estatísticas dos ajustes
  const getAdjustmentStats = useCallback(() => {
    const adjustments = state.adjustments;
    
    const stats = {
      total: adjustments.length,
      by_action: {},
      by_reason: {},
      by_status: {},
      by_created_by: {}
    };

    adjustments.forEach(adjustment => {
      // Contar por ação
      stats.by_action[adjustment.action] = (stats.by_action[adjustment.action] || 0) + 1;
      
      // Contar por motivo
      stats.by_reason[adjustment.reason] = (stats.by_reason[adjustment.reason] || 0) + 1;
      
      // Contar por status
      stats.by_status[adjustment.status] = (stats.by_status[adjustment.status] || 0) + 1;
      
      // Contar por criador
      stats.by_created_by[adjustment.created_by] = (stats.by_created_by[adjustment.created_by] || 0) + 1;
    });

    return stats;
  }, [state.adjustments]);

  // Filtrar ajustes por ação
  const getAdjustmentsByAction = useCallback((action) => {
    return state.adjustments.filter(adjustment => adjustment.action === action);
  }, [state.adjustments]);

  // Filtrar ajustes por motivo
  const getAdjustmentsByReason = useCallback((reason) => {
    return state.adjustments.filter(adjustment => 
      adjustment.reason.toLowerCase().includes(reason.toLowerCase())
    );
  }, [state.adjustments]);

  // Obter ajustes que afetam uma tarefa específica
  const getAdjustmentsForTask = useCallback((taskId, taskTemplateKey) => {
    return state.adjustments.filter(adjustment => 
      adjustment.task_id === taskId || adjustment.task_template_key === taskTemplateKey
    );
  }, [state.adjustments]);

  // Verificar se uma tarefa tem ajustes
  const hasAdjustments = useCallback((taskId, taskTemplateKey) => {
    return state.adjustments.some(adjustment => 
      adjustment.task_id === taskId || adjustment.task_template_key === taskTemplateKey
    );
  }, [state.adjustments]);

  // Obter tipo de ajuste mais comum
  const getMostCommonAction = useCallback(() => {
    const stats = getAdjustmentStats();
    const actions = Object.entries(stats.by_action);
    
    if (actions.length === 0) return null;
    
    return actions.reduce((max, [action, count]) => 
      count > max.count ? { action, count } : max, 
      { action: actions[0][0], count: actions[0][1] }
    );
  }, [getAdjustmentStats]);

  // Obter motivo mais comum
  const getMostCommonReason = useCallback(() => {
    const stats = getAdjustmentStats();
    const reasons = Object.entries(stats.by_reason);
    
    if (reasons.length === 0) return null;
    
    return reasons.reduce((max, [reason, count]) => 
      count > max.count ? { reason, count } : max, 
      { reason: reasons[0][0], count: reasons[0][1] }
    );
  }, [getAdjustmentStats]);

  // Recarregar ajustes
  const refresh = useCallback(async () => {
    await loadAdjustments();
  }, [loadAdjustments]);

  // Carregar dados iniciais
  useEffect(() => {
    if (servicoInstanciaId) {
      loadAdjustments();
    }
  }, [servicoInstanciaId, loadAdjustments]);

  // Calcular estatísticas quando ajustes mudam
  useEffect(() => {
    const stats = getAdjustmentStats();
    setState(prev => ({ ...prev, stats }));
  }, [state.adjustments, getAdjustmentStats]);

  return {
    // Estado
    adjustments: state.adjustments,
    isLoading: state.isLoading,
    error: state.error,
    stats: state.stats,

    // Ações
    loadAdjustments,
    loadAdjustmentsByBriefing,
    applyAdjustmentsToTasks,
    refresh,

    // Utilitários
    getAdjustmentStats,
    getAdjustmentsByAction,
    getAdjustmentsByReason,
    getAdjustmentsForTask,
    hasAdjustments,
    getMostCommonAction,
    getMostCommonReason,

    // Contadores
    totalAdjustments: state.adjustments.length,
    prioritizeCount: getAdjustmentsByAction('PRIORITIZE').length,
    deferCount: getAdjustmentsByAction('DEFER').length,
    hideCount: getAdjustmentsByAction('HIDE').length,
    addTaskCount: getAdjustmentsByAction('ADD_TASK').length,
    addSubtaskCount: getAdjustmentsByAction('ADD_SUBTASK').length,
    addNoteCount: getAdjustmentsByAction('ADD_NOTE').length,
    setMilestoneCount: getAdjustmentsByAction('SET_MILESTONE').length
  };
}

export default useTaskAdjustments;

