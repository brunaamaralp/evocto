import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

/**
 * Sistema de Workflows Condicionais
 * Implementa automação de processos baseada em regras e condições
 */
export class WorkflowEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    this.workflows = new Map();
    this.executions = new Map();
    this.triggers = new Map();
    this.conditions = new Map();
    this.actions = new Map();
    this.isRunning = false;
    this.executionQueue = [];
    this.maxConcurrentExecutions = options.maxConcurrentExecutions || 10;
    this.executionTimeout = options.executionTimeout || 300000; // 5 minutos
    
    this.initializeDefaultWorkflows();
    this.initializeTriggers();
    this.initializeActions();
  }

  /**
   * Inicializa workflows padrão
   */
  initializeDefaultWorkflows() {
    // Workflow de Aprovação Automática
    this.workflows.set('auto_approval', {
      id: 'auto_approval',
      name: 'Aprovação Automática',
      description: 'Aprova automaticamente itens que atendem critérios específicos',
      version: '1.0',
      status: 'active',
      triggers: ['item_created', 'item_updated'],
      conditions: [
        {
          id: 'low_value_approval',
          name: 'Aprovação de Baixo Valor',
          description: 'Aprova automaticamente itens com valor baixo',
          rules: [
            { field: 'value', operator: '<=', value: 1000 },
            { field: 'category', operator: '==', value: 'standard' },
            { field: 'risk_level', operator: '==', value: 'low' }
          ],
          actions: ['approve_item', 'send_notification', 'log_approval']
        },
        {
          id: 'urgent_approval',
          name: 'Aprovação Urgente',
          description: 'Aprova automaticamente itens urgentes',
          rules: [
            { field: 'priority', operator: '==', value: 'urgent' },
            { field: 'value', operator: '<=', value: 5000 },
            { field: 'approver_available', operator: '==', value: false }
          ],
          actions: ['approve_item', 'send_urgent_notification', 'log_urgent_approval']
        }
      ],
      fallbackActions: ['send_for_manual_approval'],
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    // Workflow de Notificação Inteligente
    this.workflows.set('smart_notification', {
      id: 'smart_notification',
      name: 'Notificação Inteligente',
      description: 'Envia notificações baseadas no contexto e preferências',
      version: '1.0',
      status: 'active',
      triggers: ['task_assigned', 'deadline_approaching', 'milestone_reached'],
      conditions: [
        {
          id: 'urgent_task_notification',
          name: 'Notificação de Tarefa Urgente',
          description: 'Notifica imediatamente sobre tarefas urgentes',
          rules: [
            { field: 'priority', operator: '==', value: 'urgent' },
            { field: 'deadline', operator: '<=', value: '24h' }
          ],
          actions: ['send_immediate_notification', 'escalate_to_manager']
        },
        {
          id: 'deadline_reminder',
          name: 'Lembrete de Prazo',
          description: 'Envia lembretes de prazo baseados nas preferências',
          rules: [
            { field: 'deadline', operator: '<=', value: '7d' },
            { field: 'user_preference', operator: '==', value: 'weekly_reminders' }
          ],
          actions: ['send_reminder_notification', 'schedule_follow_up']
        }
      ],
      fallbackActions: ['send_default_notification'],
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    // Workflow de Escalação Automática
    this.workflows.set('auto_escalation', {
      id: 'auto_escalation',
      name: 'Escalação Automática',
      description: 'Escala automaticamente itens baseados em critérios',
      version: '1.0',
      status: 'active',
      triggers: ['task_overdue', 'issue_created', 'approval_timeout'],
      conditions: [
        {
          id: 'overdue_escalation',
          name: 'Escalação por Atraso',
          description: 'Escala tarefas atrasadas',
          rules: [
            { field: 'status', operator: '==', value: 'overdue' },
            { field: 'overdue_days', operator: '>=', value: 3 }
          ],
          actions: ['escalate_to_manager', 'send_overdue_notification', 'update_priority']
        },
        {
          id: 'approval_timeout_escalation',
          name: 'Escalação por Timeout de Aprovação',
          description: 'Escala aprovações que estão demorando',
          rules: [
            { field: 'approval_status', operator: '==', value: 'pending' },
            { field: 'pending_days', operator: '>=', value: 5 }
          ],
          actions: ['escalate_to_supervisor', 'send_timeout_notification']
        }
      ],
      fallbackActions: ['send_manual_escalation_request'],
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }

  /**
   * Inicializa triggers
   */
  initializeTriggers() {
    this.triggers.set('item_created', {
      name: 'Item Criado',
      description: 'Disparado quando um novo item é criado',
      event: 'item_created',
      conditions: []
    });

    this.triggers.set('item_updated', {
      name: 'Item Atualizado',
      description: 'Disparado quando um item é atualizado',
      event: 'item_updated',
      conditions: []
    });

    this.triggers.set('task_assigned', {
      name: 'Tarefa Atribuída',
      description: 'Disparado quando uma tarefa é atribuída',
      event: 'task_assigned',
      conditions: []
    });

    this.triggers.set('deadline_approaching', {
      name: 'Prazo Aproximando',
      description: 'Disparado quando um prazo está se aproximando',
      event: 'deadline_approaching',
      conditions: []
    });

    this.triggers.set('milestone_reached', {
      name: 'Marco Atingido',
      description: 'Disparado quando um marco é atingido',
      event: 'milestone_reached',
      conditions: []
    });

    this.triggers.set('task_overdue', {
      name: 'Tarefa Atrasada',
      description: 'Disparado quando uma tarefa está atrasada',
      event: 'task_overdue',
      conditions: []
    });

    this.triggers.set('issue_created', {
      name: 'Problema Criado',
      description: 'Disparado quando um problema é criado',
      event: 'issue_created',
      conditions: []
    });

    this.triggers.set('approval_timeout', {
      name: 'Timeout de Aprovação',
      description: 'Disparado quando uma aprovação está demorando',
      event: 'approval_timeout',
      conditions: []
    });
  }

  /**
   * Inicializa ações
   */
  initializeActions() {
    this.actions.set('approve_item', {
      name: 'Aprovar Item',
      description: 'Aprova automaticamente um item',
      type: 'system',
      execute: async (context) => {
        console.log(`[WorkflowEngine] Aprovando item: ${context.itemId}`);
        return { success: true, action: 'approved', itemId: context.itemId };
      }
    });

    this.actions.set('send_notification', {
      name: 'Enviar Notificação',
      description: 'Envia notificação para usuário',
      type: 'notification',
      execute: async (context) => {
        console.log(`[WorkflowEngine] Enviando notificação para: ${context.userId}`);
        return { success: true, action: 'notification_sent', userId: context.userId };
      }
    });

    this.actions.set('log_approval', {
      name: 'Registrar Aprovação',
      description: 'Registra aprovação no log de auditoria',
      type: 'audit',
      execute: async (context) => {
        console.log(`[WorkflowEngine] Registrando aprovação: ${context.itemId}`);
        return { success: true, action: 'logged', itemId: context.itemId };
      }
    });

    this.actions.set('send_urgent_notification', {
      name: 'Enviar Notificação Urgente',
      description: 'Envia notificação urgente',
      type: 'notification',
      execute: async (context) => {
        console.log(`[WorkflowEngine] Enviando notificação urgente para: ${context.userId}`);
        return { success: true, action: 'urgent_notification_sent', userId: context.userId };
      }
    });

    this.actions.set('log_urgent_approval', {
      name: 'Registrar Aprovação Urgente',
      description: 'Registra aprovação urgente no log',
      type: 'audit',
      execute: async (context) => {
        console.log(`[WorkflowEngine] Registrando aprovação urgente: ${context.itemId}`);
        return { success: true, action: 'urgent_logged', itemId: context.itemId };
      }
    });

    this.actions.set('send_for_manual_approval', {
      name: 'Enviar para Aprovação Manual',
      description: 'Envia item para aprovação manual',
      type: 'system',
      execute: async (context) => {
        console.log(`[WorkflowEngine] Enviando para aprovação manual: ${context.itemId}`);
        return { success: true, action: 'sent_for_manual_approval', itemId: context.itemId };
      }
    });

    this.actions.set('send_immediate_notification', {
      name: 'Enviar Notificação Imediata',
      description: 'Envia notificação imediatamente',
      type: 'notification',
      execute: async (context) => {
        console.log(`[WorkflowEngine] Enviando notificação imediata para: ${context.userId}`);
        return { success: true, action: 'immediate_notification_sent', userId: context.userId };
      }
    });

    this.actions.set('escalate_to_manager', {
      name: 'Escalar para Gerente',
      description: 'Escala item para gerente',
      type: 'escalation',
      execute: async (context) => {
        console.log(`[WorkflowEngine] Escalando para gerente: ${context.itemId}`);
        return { success: true, action: 'escalated_to_manager', itemId: context.itemId };
      }
    });

    this.actions.set('send_reminder_notification', {
      name: 'Enviar Lembrete',
      description: 'Envia lembrete para usuário',
      type: 'notification',
      execute: async (context) => {
        console.log(`[WorkflowEngine] Enviando lembrete para: ${context.userId}`);
        return { success: true, action: 'reminder_sent', userId: context.userId };
      }
    });

    this.actions.set('schedule_follow_up', {
      name: 'Agendar Acompanhamento',
      description: 'Agenda acompanhamento futuro',
      type: 'scheduling',
      execute: async (context) => {
        console.log(`[WorkflowEngine] Agendando acompanhamento para: ${context.itemId}`);
        return { success: true, action: 'follow_up_scheduled', itemId: context.itemId };
      }
    });

    this.actions.set('send_default_notification', {
      name: 'Enviar Notificação Padrão',
      description: 'Envia notificação padrão',
      type: 'notification',
      execute: async (context) => {
        console.log(`[WorkflowEngine] Enviando notificação padrão para: ${context.userId}`);
        return { success: true, action: 'default_notification_sent', userId: context.userId };
      }
    });

    this.actions.set('send_overdue_notification', {
      name: 'Enviar Notificação de Atraso',
      description: 'Envia notificação sobre item atrasado',
      type: 'notification',
      execute: async (context) => {
        console.log(`[WorkflowEngine] Enviando notificação de atraso para: ${context.userId}`);
        return { success: true, action: 'overdue_notification_sent', userId: context.userId };
      }
    });

    this.actions.set('update_priority', {
      name: 'Atualizar Prioridade',
      description: 'Atualiza prioridade do item',
      type: 'system',
      execute: async (context) => {
        console.log(`[WorkflowEngine] Atualizando prioridade: ${context.itemId}`);
        return { success: true, action: 'priority_updated', itemId: context.itemId };
      }
    });

    this.actions.set('escalate_to_supervisor', {
      name: 'Escalar para Supervisor',
      description: 'Escala item para supervisor',
      type: 'escalation',
      execute: async (context) => {
        console.log(`[WorkflowEngine] Escalando para supervisor: ${context.itemId}`);
        return { success: true, action: 'escalated_to_supervisor', itemId: context.itemId };
      }
    });

    this.actions.set('send_timeout_notification', {
      name: 'Enviar Notificação de Timeout',
      description: 'Envia notificação sobre timeout',
      type: 'notification',
      execute: async (context) => {
        console.log(`[WorkflowEngine] Enviando notificação de timeout para: ${context.userId}`);
        return { success: true, action: 'timeout_notification_sent', userId: context.userId };
      }
    });

    this.actions.set('send_manual_escalation_request', {
      name: 'Enviar Solicitação de Escalação Manual',
      description: 'Envia solicitação para escalação manual',
      type: 'escalation',
      execute: async (context) => {
        console.log(`[WorkflowEngine] Enviando solicitação de escalação manual: ${context.itemId}`);
        return { success: true, action: 'manual_escalation_requested', itemId: context.itemId };
      }
    });
  }

  /**
   * Executa workflow
   */
  async executeWorkflow(workflowId, context) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow não encontrado: ${workflowId}`);
    }

    if (workflow.status !== 'active') {
      throw new Error(`Workflow não está ativo: ${workflowId}`);
    }

    const executionId = uuidv4();
    const execution = {
      id: executionId,
      workflowId,
      workflowName: workflow.name,
      context,
      status: 'running',
      startTime: Date.now(),
      endTime: null,
      executedConditions: [],
      executedActions: [],
      errors: []
    };

    this.executions.set(executionId, execution);
    this.emit('workflow_started', { executionId, workflowId, context });

    try {
      // Executar condições
      for (const condition of workflow.conditions) {
        if (await this.evaluateCondition(condition, context)) {
          execution.executedConditions.push(condition.id);
          
          // Executar ações da condição
          for (const actionId of condition.actions) {
            const action = this.actions.get(actionId);
            if (action) {
              try {
                const result = await action.execute(context);
                execution.executedActions.push({
                  actionId,
                  actionName: action.name,
                  result,
                  executedAt: Date.now()
                });
              } catch (error) {
                execution.errors.push({
                  actionId,
                  error: error.message,
                  executedAt: Date.now()
                });
              }
            }
          }
        }
      }

      // Se nenhuma condição foi executada, executar ações de fallback
      if (execution.executedConditions.length === 0) {
        for (const actionId of workflow.fallbackActions) {
          const action = this.actions.get(actionId);
          if (action) {
            try {
              const result = await action.execute(context);
              execution.executedActions.push({
                actionId,
                actionName: action.name,
                result,
                executedAt: Date.now()
              });
            } catch (error) {
              execution.errors.push({
                actionId,
                error: error.message,
                executedAt: Date.now()
              });
            }
          }
        }
      }

      execution.status = 'completed';
      execution.endTime = Date.now();

      this.emit('workflow_completed', { executionId, execution });

      return execution;
    } catch (error) {
      execution.status = 'failed';
      execution.endTime = Date.now();
      execution.errors.push({
        type: 'workflow_error',
        error: error.message,
        executedAt: Date.now()
      });

      this.emit('workflow_failed', { executionId, error: error.message });

      throw error;
    }
  }

  /**
   * Avalia condição
   */
  async evaluateCondition(condition, context) {
    return condition.rules.every(rule => {
      const value = context[rule.field];
      if (value === undefined) return false;

      switch (rule.operator) {
        case '<': return value < rule.value;
        case '>': return value > rule.value;
        case '<=': return value <= rule.value;
        case '>=': return value >= rule.value;
        case '==': return value === rule.value;
        case '!=': return value !== rule.value;
        case 'contains': return value.includes(rule.value);
        case 'not_contains': return !value.includes(rule.value);
        case 'in': return rule.value.includes(value);
        case 'not_in': return !rule.value.includes(value);
        default: return false;
      }
    });
  }

  /**
   * Dispara evento
   */
  triggerEvent(eventType, context) {
    console.log(`[WorkflowEngine] Evento disparado: ${eventType}`, context);
    
    // Encontrar workflows que respondem a este evento
    const relevantWorkflows = Array.from(this.workflows.values())
      .filter(workflow => workflow.triggers.includes(eventType));

    // Executar workflows relevantes
    for (const workflow of relevantWorkflows) {
      this.executeWorkflow(workflow.id, context);
    }

    this.emit('event_triggered', { eventType, context });
  }

  /**
   * Cria novo workflow
   */
  createWorkflow(workflowData) {
    const workflowId = uuidv4();
    const workflow = {
      id: workflowId,
      ...workflowData,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.workflows.set(workflowId, workflow);
    this.emit('workflow_created', { workflowId, workflow });

    return workflowId;
  }

  /**
   * Atualiza workflow
   */
  updateWorkflow(workflowId, updates) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow não encontrado: ${workflowId}`);
    }

    const updatedWorkflow = {
      ...workflow,
      ...updates,
      updatedAt: Date.now()
    };

    this.workflows.set(workflowId, updatedWorkflow);
    this.emit('workflow_updated', { workflowId, workflow: updatedWorkflow });

    return updatedWorkflow;
  }

  /**
   * Remove workflow
   */
  deleteWorkflow(workflowId) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow não encontrado: ${workflowId}`);
    }

    this.workflows.delete(workflowId);
    this.emit('workflow_deleted', { workflowId });

    return true;
  }

  /**
   * Obtém workflow
   */
  getWorkflow(workflowId) {
    return this.workflows.get(workflowId);
  }

  /**
   * Obtém todos os workflows
   */
  getAllWorkflows() {
    return Array.from(this.workflows.values());
  }

  /**
   * Obtém execução
   */
  getExecution(executionId) {
    return this.executions.get(executionId);
  }

  /**
   * Obtém todas as execuções
   */
  getAllExecutions() {
    return Array.from(this.executions.values());
  }

  /**
   * Obtém estatísticas
   */
  getStats() {
    const totalWorkflows = this.workflows.size;
    const activeWorkflows = Array.from(this.workflows.values())
      .filter(w => w.status === 'active').length;
    const totalExecutions = this.executions.size;
    const successfulExecutions = Array.from(this.executions.values())
      .filter(e => e.status === 'completed').length;
    const failedExecutions = Array.from(this.executions.values())
      .filter(e => e.status === 'failed').length;

    return {
      totalWorkflows,
      activeWorkflows,
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      successRate: totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0
    };
  }

  /**
   * Adiciona nova ação
   */
  addAction(actionId, action) {
    this.actions.set(actionId, action);
    this.emit('action_added', { actionId, action });
  }

  /**
   * Remove ação
   */
  removeAction(actionId) {
    this.actions.delete(actionId);
    this.emit('action_removed', { actionId });
  }

  /**
   * Adiciona novo trigger
   */
  addTrigger(triggerId, trigger) {
    this.triggers.set(triggerId, trigger);
    this.emit('trigger_added', { triggerId, trigger });
  }

  /**
   * Remove trigger
   */
  removeTrigger(triggerId) {
    this.triggers.delete(triggerId);
    this.emit('trigger_removed', { triggerId });
  }
}

// Instância singleton
export const workflowEngine = new WorkflowEngine({
  maxConcurrentExecutions: 10,
  executionTimeout: 300000 // 5 minutos
});

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.workflowEngine = workflowEngine;
}

