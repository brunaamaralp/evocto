/**
 * 🎯 Hook para Gerenciar Briefing Obrigatório
 * 
 * Centraliza a lógica de briefing como primeira tarefa obrigatória
 */

import { useState, useCallback } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { Task, Brief, Service } from '@/api/entities';
import { toast } from 'sonner';
import { useTriggerSystem } from './useTriggerSystem';

// Tipos para briefing obrigatório
export interface BriefingTask {
  id: string;
  serviceId: string;
  clientId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  briefingId?: string;
  publicBriefingSent: boolean;
  clientResponsesReceived: boolean;
  internalReviewCompleted: boolean;
  meetingScheduled: boolean;
  completionScore: number;
  blocksProgress: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BriefingProgress {
  step: 'creation' | 'public_sent' | 'responses_received' | 'review_completed' | 'meeting_scheduled' | 'completed';
  progress: number; // 0-100
  canProceed: boolean;
  nextAction: string;
  clientActionRequired: boolean;
}

export interface BriefingValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  canActivateService: boolean;
}

export function useMandatoryBriefing() {
  const { user } = useSession();
  const { registerEvent } = useTriggerSystem();
  const [briefingTask, setBriefingTask] = useState<BriefingTask | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Criar tarefa de briefing obrigatória
  const createMandatoryBriefingTask = useCallback(async (
    serviceId: string,
    clientId: string
  ): Promise<BriefingTask> => {
    try {
      setLoading(true);
      setError(null);

      // Verificar se já existe briefing para este serviço
      const existingBriefing = await Task.filter({
        agencyId: user?.data?.agencyId,
        serviceId,
        type: 'mandatory_briefing'
      });

      if (existingBriefing.length > 0) {
        throw new Error('Briefing obrigatório já existe para este serviço');
      }

      // Criar tarefa de briefing obrigatória
      const briefingTaskData = {
        agencyId: user?.data?.agencyId,
        clientId,
        serviceId,
        title: 'Briefing Estratégico Obrigatório',
        description: 'Coleta de informações essenciais do cliente para início do projeto',
        type: 'mandatory_briefing',
        priority: 'critical',
        status: 'todo',
        is_required: true,
        blocks_progress: true, // Impede avanço do serviço
        estimatedHours: 8,
        checklist: [
          {
            id: 'send_public_briefing',
            text: 'Enviar briefing público para cliente',
            required: true,
            completed: false,
            order: 1,
            assignedRole: 'consultor_lider'
          },
          {
            id: 'review_client_responses',
            text: 'Revisar respostas do cliente',
            required: true,
            completed: false,
            order: 2,
            assignedRole: 'consultor_lider'
          },
          {
            id: 'schedule_alignment_meeting',
            text: 'Agendar reunião de alinhamento',
            required: true,
            completed: false,
            order: 3,
            assignedRole: 'consultor_lider'
          },
          {
            id: 'complete_internal_review',
            text: 'Completar revisão interna do briefing',
            required: true,
            completed: false,
            order: 4,
            assignedRole: 'consultor_lider'
          }
        ],
        metadata: {
          is_mandatory_briefing: true,
          blocks_service_activation: true,
          requires_client_interaction: true,
          completion_threshold: 100 // Deve estar 100% completo
        }
      };

      const createdTask = await Task.create(briefingTaskData);
      
      const briefingTask: BriefingTask = {
        id: createdTask.id,
        serviceId,
        clientId,
        status: 'pending',
        publicBriefingSent: false,
        clientResponsesReceived: false,
        internalReviewCompleted: false,
        meetingScheduled: false,
        completionScore: 0,
        blocksProgress: true,
        createdAt: createdTask.created_date,
        updatedAt: createdTask.updated_date
      };

      setBriefingTask(briefingTask);
      
      toast.success('Briefing obrigatório criado com sucesso');
      return briefingTask;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar briefing obrigatório';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user?.data?.agencyId]);

  // Atualizar progresso do briefing
  const updateBriefingProgress = useCallback(async (
    taskId: string,
    updates: Partial<BriefingTask>
  ): Promise<BriefingTask> => {
    try {
      setLoading(true);
      setError(null);

      // Atualizar tarefa
      const taskUpdates: any = {
        updated_date: new Date().toISOString()
      };

      // Mapear atualizações específicas
      if (updates.publicBriefingSent !== undefined) {
        taskUpdates.checklist = await updateChecklistItem(taskId, 'send_public_briefing', updates.publicBriefingSent);
      }
      if (updates.clientResponsesReceived !== undefined) {
        taskUpdates.checklist = await updateChecklistItem(taskId, 'review_client_responses', updates.clientResponsesReceived);
      }
      if (updates.meetingScheduled !== undefined) {
        taskUpdates.checklist = await updateChecklistItem(taskId, 'schedule_alignment_meeting', updates.meetingScheduled);
      }
      if (updates.internalReviewCompleted !== undefined) {
        taskUpdates.checklist = await updateChecklistItem(taskId, 'complete_internal_review', updates.internalReviewCompleted);
      }

      // Calcular score de conclusão
      const completionScore = calculateCompletionScore(updates);
      taskUpdates.completion_score = completionScore;

      // Atualizar status baseado no progresso
      if (completionScore === 100) {
        taskUpdates.status = 'completed';
        taskUpdates.blocks_progress = false;
        updates.status = 'completed';
        updates.blocksProgress = false;

        // Disparar trigger de briefing completado
        try {
          await registerEvent(
            'briefing_completed',
            'Brief',
            briefingTask.briefingId || taskId,
            briefingTask.serviceId,
            briefingTask.clientId,
            {
              completionScore: 100,
              briefingTask: briefingTask.id,
              status: 'completed'
            }
          );
        } catch (triggerError) {
          console.warn('Falha ao registrar trigger de briefing completado:', triggerError);
        }
      } else if (completionScore > 0) {
        taskUpdates.status = 'in_progress';
        updates.status = 'in_progress';
      }

      await Task.update(taskId, taskUpdates);

      // Atualizar estado local
      const updatedBriefing = {
        ...briefingTask,
        ...updates,
        completionScore,
        updatedAt: new Date().toISOString()
      };

      setBriefingTask(updatedBriefing);
      
      toast.success('Progresso do briefing atualizado');
      return updatedBriefing;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar briefing';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [briefingTask]);

  // Obter progresso atual do briefing
  const getBriefingProgress = useCallback((): BriefingProgress => {
    if (!briefingTask) {
      return {
        step: 'creation',
        progress: 0,
        canProceed: false,
        nextAction: 'Criar briefing obrigatório',
        clientActionRequired: false
      };
    }

    const { completionScore } = briefingTask;
    
    if (completionScore === 0) {
      return {
        step: 'creation',
        progress: 0,
        canProceed: false,
        nextAction: 'Enviar briefing público para cliente',
        clientActionRequired: false
      };
    } else if (completionScore < 25) {
      return {
        step: 'public_sent',
        progress: 25,
        canProceed: false,
        nextAction: 'Aguardar respostas do cliente',
        clientActionRequired: true
      };
    } else if (completionScore < 50) {
      return {
        step: 'responses_received',
        progress: 50,
        canProceed: false,
        nextAction: 'Revisar respostas e agendar reunião',
        clientActionRequired: false
      };
    } else if (completionScore < 75) {
      return {
        step: 'review_completed',
        progress: 75,
        canProceed: false,
        nextAction: 'Agendar reunião de alinhamento',
        clientActionRequired: false
      };
    } else if (completionScore < 100) {
      return {
        step: 'meeting_scheduled',
        progress: 90,
        canProceed: false,
        nextAction: 'Completar revisão interna',
        clientActionRequired: false
      };
    } else {
      return {
        step: 'completed',
        progress: 100,
        canProceed: true,
        nextAction: 'Briefing concluído - Serviço pode ser ativado',
        clientActionRequired: false
      };
    }
  }, [briefingTask]);

  // Validar se briefing está completo
  const validateBriefingCompletion = useCallback((): BriefingValidation => {
    if (!briefingTask) {
      return {
        isValid: false,
        errors: ['Briefing obrigatório não foi criado'],
        warnings: [],
        canActivateService: false
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    if (!briefingTask.publicBriefingSent) {
      errors.push('Briefing público não foi enviado para o cliente');
    }

    if (!briefingTask.clientResponsesReceived) {
      errors.push('Cliente ainda não respondeu ao briefing');
    }

    if (!briefingTask.internalReviewCompleted) {
      errors.push('Revisão interna do briefing não foi completada');
    }

    if (!briefingTask.meetingScheduled) {
      warnings.push('Reunião de alinhamento não foi agendada');
    }

    if (briefingTask.completionScore < 100) {
      errors.push(`Briefing incompleto (${briefingTask.completionScore}%)`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      canActivateService: briefingTask.completionScore === 100 && briefingTask.status === 'completed'
    };
  }, [briefingTask]);

  // Verificar se serviço pode ser ativado
  const canActivateService = useCallback((serviceId: string): boolean => {
    if (!briefingTask || briefingTask.serviceId !== serviceId) {
      return false;
    }

    const validation = validateBriefingCompletion();
    return validation.canActivateService;
  }, [briefingTask, validateBriefingCompletion]);

  // Utilitários auxiliares
  const updateChecklistItem = async (taskId: string, itemId: string, completed: boolean) => {
    const task = await Task.get(taskId);
    const updatedChecklist = task.checklist.map(item => 
      item.id === itemId ? { ...item, completed } : item
    );
    return updatedChecklist;
  };

  const calculateCompletionScore = (updates: Partial<BriefingTask>): number => {
    const current = briefingTask || {
      publicBriefingSent: false,
      clientResponsesReceived: false,
      internalReviewCompleted: false,
      meetingScheduled: false
    };

    const updated = { ...current, ...updates };
    
    let score = 0;
    if (updated.publicBriefingSent) score += 25;
    if (updated.clientResponsesReceived) score += 25;
    if (updated.internalReviewCompleted) score += 25;
    if (updated.meetingScheduled) score += 25;

    return score;
  };

  return {
    // Estado
    briefingTask,
    loading,
    error,
    
    // Ações principais
    createMandatoryBriefingTask,
    updateBriefingProgress,
    
    // Utilitários
    getBriefingProgress,
    validateBriefingCompletion,
    canActivateService,
    
    // Helpers
    setError
  };
}

export default useMandatoryBriefing;
