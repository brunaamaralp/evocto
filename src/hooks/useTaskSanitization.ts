/**
 * 🧹 Hook para Sanitização de Dados de Tarefas
 * 
 * Centraliza sanitização de dados antes de criar/atualizar tarefas
 */

import { useCallback } from 'react';

export interface TaskSanitizationOptions {
  removeHtml?: boolean;
  maxLength?: {
    title?: number;
    description?: number;
    checklistItem?: number;
  };
  allowedTags?: string[];
}

export function useTaskSanitization(options: TaskSanitizationOptions = {}) {
  const {
    removeHtml = true,
    maxLength = {
      title: 200,
      description: 1000,
      checklistItem: 500
    },
    allowedTags = ['b', 'i', 'em', 'strong']
  } = options;

  // Sanitizar string removendo HTML e limitando tamanho
  const sanitizeString = useCallback((str: string, maxLen?: number): string => {
    if (!str) return '';

    let sanitized = str.trim();

    // Remover HTML se configurado
    if (removeHtml) {
      // Permitir apenas tags específicas se definidas
      if (allowedTags.length > 0) {
        const allowedTagsRegex = new RegExp(`<(?!/?(?:${allowedTags.join('|')})(?:\\s|>))[^>]*>`, 'gi');
        sanitized = sanitized.replace(allowedTagsRegex, '');
      } else {
        // Remover todas as tags HTML
        sanitized = sanitized.replace(/<[^>]*>/g, '');
      }
    }

    // Limitar tamanho
    const maxLengthToUse = maxLen || maxLength.title;
    if (sanitized.length > maxLengthToUse) {
      sanitized = sanitized.substring(0, maxLengthToUse).trim();
    }

    return sanitized;
  }, [removeHtml, allowedTags, maxLength.title]);

  // Sanitizar número
  const sanitizeNumber = useCallback((num: any, min: number = 0, max: number = 1000): number => {
    if (num === null || num === undefined || num === '') return min;
    
    const parsed = parseFloat(num);
    if (isNaN(parsed)) return min;
    
    return Math.max(min, Math.min(max, parsed));
  }, []);

  // Sanitizar prioridade
  const sanitizePriority = useCallback((priority: any): 'low' | 'medium' | 'high' => {
    if (!priority) return 'medium';
    
    const normalized = priority.toLowerCase().trim();
    if (['high', 'alta', 'urgente'].includes(normalized)) return 'high';
    if (['low', 'baixa', 'baixo'].includes(normalized)) return 'low';
    
    return 'medium';
  }, []);

  // Sanitizar tipo de tarefa
  const sanitizeTaskType = useCallback((type: any): string => {
    if (!type) return 'deliverable';
    
    const normalized = type.toLowerCase().trim();
    const validTypes = [
      'deliverable', 'analise_documentos', 'reuniao', 'desenvolvimento',
      'teste', 'revisao', 'aprovacao', 'entrega', 'follow_up'
    ];
    
    if (validTypes.includes(normalized)) return normalized;
    
    return 'deliverable';
  }, []);

  // Sanitizar status
  const sanitizeStatus = useCallback((status: any): string => {
    if (!status) return 'todo';
    
    const normalized = status.toLowerCase().trim();
    const validStatuses = [
      'todo', 'in_progress', 'in_review', 'completed', 'cancelled', 'blocked'
    ];
    
    if (validStatuses.includes(normalized)) return normalized;
    
    return 'todo';
  }, []);

  // Sanitizar checklist
  const sanitizeChecklist = useCallback((checklist: any[]): any[] => {
    if (!Array.isArray(checklist)) return [];

    return checklist
      .filter(item => item && typeof item === 'object')
      .map(item => ({
        ...item,
        text: sanitizeString(item.text || '', maxLength.checklistItem),
        required: Boolean(item.required),
        order: sanitizeNumber(item.order, 0, 1000),
        completed: Boolean(item.completed)
      }))
      .filter(item => item.text.length > 0); // Remover itens vazios
  }, [sanitizeString, sanitizeNumber, maxLength.checklistItem]);

  // Sanitizar dados completos da tarefa
  const sanitizeTaskData = useCallback((taskData: any): any => {
    if (!taskData || typeof taskData !== 'object') return {};

    return {
      ...taskData,
      title: sanitizeString(taskData.title || '', maxLength.title),
      description: sanitizeString(taskData.description || '', maxLength.description),
      priority: sanitizePriority(taskData.priority),
      type: sanitizeTaskType(taskData.type),
      status: sanitizeStatus(taskData.status),
      estimatedHours: sanitizeNumber(taskData.estimatedHours, 0, 1000),
      progress: sanitizeNumber(taskData.progress, 0, 100),
      checklist: sanitizeChecklist(taskData.checklist || []),
      // Manter campos não sanitizáveis
      id: taskData.id,
      agencyId: taskData.agencyId,
      clientId: taskData.clientId,
      serviceId: taskData.serviceId,
      deliverableId: taskData.deliverableId,
      assignedTo: taskData.assignedTo,
      assignedBy: taskData.assignedBy,
      dueDate: taskData.dueDate,
      startDate: taskData.startDate,
      createdAt: taskData.createdAt,
      updatedAt: taskData.updatedAt
    };
  }, [
    sanitizeString,
    sanitizePriority,
    sanitizeTaskType,
    sanitizeStatus,
    sanitizeNumber,
    sanitizeChecklist,
    maxLength
  ]);

  // Validar dados sanitizados
  const validateSanitizedData = useCallback((taskData: any): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!taskData.title || taskData.title.trim().length === 0) {
      errors.push('Título da tarefa é obrigatório');
    }

    if (taskData.title && taskData.title.length < 3) {
      errors.push('Título deve ter pelo menos 3 caracteres');
    }

    if (taskData.description && taskData.description.length > maxLength.description) {
      errors.push(`Descrição deve ter no máximo ${maxLength.description} caracteres`);
    }

    if (taskData.estimatedHours < 0 || taskData.estimatedHours > 1000) {
      errors.push('Horas estimadas devem estar entre 0 e 1000');
    }

    if (taskData.progress < 0 || taskData.progress > 100) {
      errors.push('Progresso deve estar entre 0 e 100%');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, [maxLength.description]);

  return {
    sanitizeString,
    sanitizeNumber,
    sanitizePriority,
    sanitizeTaskType,
    sanitizeStatus,
    sanitizeChecklist,
    sanitizeTaskData,
    validateSanitizedData
  };
}

