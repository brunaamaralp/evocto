import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { NotificationTemplate, NotificationDelivery, Task, Service } from '@/api/entities';
import { notificationDispatcher } from '@/api/functions';

/**
 * Engine de notificações que monitora eventos e dispara notificações
 * baseadas nos templates configurados
 */
export default function NotificationEngine() {
  const { user } = useSession();
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!user?.data?.agencyId) return;

    // Inicializar engine de notificações
    setIsActive(true);
    
    return () => {
      setIsActive(false);
    };
  }, [user?.data?.agencyId]);

  // Engine funciona em background, não renderiza UI
  return null;
}

/**
 * Funções utilitárias para disparar notificações de eventos específicos
 */

export const NotificationTriggers = {
  /**
   * Disparar quando uma etapa/deliverable é iniciada
   */
  triggerStageStarted: async (serviceId, deliverableId, stageData) => {
    try {
      const result = await notificationDispatcher({
        event: 'StageStarted',
        serviceId,
        deliverableId,
        data: {
          stage_name: stageData.name,
          estimated_duration: stageData.duration_days,
          team_member: stageData.assigned_team?.[0] || 'Equipe',
          ...stageData
        }
      });
      return result;
    } catch (error) {
      console.error('Erro ao disparar StageStarted:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Disparar quando uma etapa/deliverable é concluída
   */
  triggerStageCompleted: async (serviceId, deliverableId, stageData) => {
    try {
      const result = await notificationDispatcher({
        event: 'StageCompleted',
        serviceId,
        deliverableId,
        data: {
          stage_name: stageData.name,
          completion_date: new Date().toLocaleDateString('pt-BR'),
          next_stage: stageData.nextStage || 'Próxima etapa será definida',
          ...stageData
        }
      });
      return result;
    } catch (error) {
      console.error('Erro ao disparar StageCompleted:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Disparar quando uma tarefa está próxima do prazo
   */
  triggerTaskDueSoon: async (taskId, taskData) => {
    try {
      const result = await notificationDispatcher({
        event: 'TaskDueSoon',
        taskId,
        data: {
          task_title: taskData.title,
          due_date: new Date(taskData.dueDate).toLocaleDateString('pt-BR'),
          assignee: taskData.assignedToName || 'Não atribuído',
          priority: taskData.priority,
          ...taskData
        }
      });
      return result;
    } catch (error) {
      console.error('Erro ao disparar TaskDueSoon:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Disparar quando aprovação é solicitada
   */
  triggerApprovalRequested: async (serviceId, deliverableId, approvalData) => {
    try {
      const result = await notificationDispatcher({
        event: 'ApprovalRequested',
        serviceId,
        deliverableId,
        data: {
          deliverable_name: approvalData.deliverable_name,
          approval_url: approvalData.approval_url,
          deadline: approvalData.deadline,
          description: approvalData.description,
          ...approvalData
        }
      });
      return result;
    } catch (error) {
      console.error('Erro ao disparar ApprovalRequested:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Disparar quando aprovação é resolvida (aprovada/rejeitada)
   */
  triggerApprovalResolved: async (serviceId, deliverableId, resolutionData) => {
    try {
      const result = await notificationDispatcher({
        event: 'ApprovalResolved',
        serviceId,
        deliverableId,
        data: {
          deliverable_name: resolutionData.deliverable_name,
          status: resolutionData.status === 'approved' ? 'aprovada' : 'rejeitada',
          comment: resolutionData.comment || 'Sem comentários',
          resolved_by: resolutionData.resolved_by,
          ...resolutionData
        }
      });
      return result;
    } catch (error) {
      console.error('Erro ao disparar ApprovalResolved:', error);
      return { success: false, error: error.message };
    }
  }
};

/**
 * Hook para usar os triggers de notificação em componentes
 */
export const useNotificationTriggers = () => {
  return NotificationTriggers;
};