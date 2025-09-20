/**
 * 🔧 Modelo de Ajustes de Tarefa (Diffs)
 * 
 * Representa ajustes aplicados às tarefas baseadas no briefing
 * Sistema de diffs para personalização sem quebrar templates
 */

import { randomUUID } from '@/components/debug/CryptoShim';

export class TaskAdjustment {
  constructor(data = {}) {
    this.id = data.id || randomUUID();
    this.servico_instancia_id = data.servico_instancia_id;
    this.briefing_id = data.briefing_id;
    this.action = data.action; // 'PRIORITIZE' | 'DEFER' | 'HIDE' | 'ADD_SUBTASK' | 'ADD_TASK' | 'ADD_NOTE' | 'SET_MILESTONE'
    this.task_id = data.task_id || null; // ID da tarefa existente (se aplicável)
    this.task_template_key = data.task_template_key || null; // Chave da tarefa no template (se aplicável)
    this.payload = data.payload || {}; // Dados específicos da ação
    this.reason = data.reason || ''; // Motivo do ajuste (explicação)
    this.created_at = data.created_at || new Date().toISOString();
    this.created_by = data.created_by || 'ai_system'; // 'ai_system' | 'user_id'
    this.status = data.status || 'active'; // 'active' | 'superseded' | 'cancelled'
  }

  // Validação do ajuste
  validate() {
    const errors = [];

    if (!this.servico_instancia_id) {
      errors.push('ID da instância do serviço é obrigatório');
    }

    if (!this.briefing_id) {
      errors.push('ID do briefing é obrigatório');
    }

    if (!this.action) {
      errors.push('Ação é obrigatória');
    }

    const validActions = [
      'PRIORITIZE', 'DEFER', 'HIDE', 'ADD_SUBTASK', 
      'ADD_TASK', 'ADD_NOTE', 'SET_MILESTONE'
    ];

    if (!validActions.includes(this.action)) {
      errors.push(`Ação deve ser uma das seguintes: ${validActions.join(', ')}`);
    }

    // Validações específicas por ação
    const actionValidation = this.validateAction();
    if (!actionValidation.isValid) {
      errors.push(...actionValidation.errors);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validação específica por tipo de ação
  validateAction() {
    const errors = [];

    switch (this.action) {
      case 'PRIORITIZE':
        if (!this.task_id && !this.task_template_key) {
          errors.push('PRIORITIZE requer task_id ou task_template_key');
        }
        if (!this.payload.priority) {
          errors.push('PRIORITIZE requer payload.priority');
        }
        break;

      case 'DEFER':
        if (!this.task_id && !this.task_template_key) {
          errors.push('DEFER requer task_id ou task_template_key');
        }
        if (!this.payload.defer_until) {
          errors.push('DEFER requer payload.defer_until');
        }
        break;

      case 'HIDE':
        if (!this.task_id && !this.task_template_key) {
          errors.push('HIDE requer task_id ou task_template_key');
        }
        break;

      case 'ADD_SUBTASK':
        if (!this.task_id && !this.task_template_key) {
          errors.push('ADD_SUBTASK requer task_id ou task_template_key');
        }
        if (!this.payload.subtask) {
          errors.push('ADD_SUBTASK requer payload.subtask');
        }
        break;

      case 'ADD_TASK':
        if (!this.payload.task) {
          errors.push('ADD_TASK requer payload.task');
        }
        break;

      case 'ADD_NOTE':
        if (!this.task_id && !this.task_template_key) {
          errors.push('ADD_NOTE requer task_id ou task_template_key');
        }
        if (!this.payload.note) {
          errors.push('ADD_NOTE requer payload.note');
        }
        break;

      case 'SET_MILESTONE':
        if (!this.task_id && !this.task_template_key) {
          errors.push('SET_MILESTONE requer task_id ou task_template_key');
        }
        if (!this.payload.milestone) {
          errors.push('SET_MILESTONE requer payload.milestone');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Aplicar ajuste a uma tarefa
  applyToTask(task) {
    if (!task) {
      throw new Error('Tarefa é obrigatória para aplicar ajuste');
    }

    const adjustedTask = { ...task };

    switch (this.action) {
      case 'PRIORITIZE':
        adjustedTask.priority = this.payload.priority;
        adjustedTask.adjustments = adjustedTask.adjustments || [];
        adjustedTask.adjustments.push({
          type: 'priority',
          value: this.payload.priority,
          reason: this.reason,
          applied_at: this.created_at
        });
        break;

      case 'DEFER':
        adjustedTask.deferred_until = this.payload.defer_until;
        adjustedTask.status = 'deferred';
        adjustedTask.adjustments = adjustedTask.adjustments || [];
        adjustedTask.adjustments.push({
          type: 'defer',
          value: this.payload.defer_until,
          reason: this.reason,
          applied_at: this.created_at
        });
        break;

      case 'HIDE':
        adjustedTask.hidden = true;
        adjustedTask.hidden_reason = this.reason;
        adjustedTask.hidden_at = this.created_at;
        break;

      case 'ADD_SUBTASK':
        adjustedTask.subtasks = adjustedTask.subtasks || [];
        adjustedTask.subtasks.push({
          id: randomUUID(),
          ...this.payload.subtask,
          created_by: 'ai_system',
          created_at: this.created_at,
          reason: this.reason
        });
        break;

      case 'ADD_NOTE':
        adjustedTask.notes = adjustedTask.notes || [];
        adjustedTask.notes.push({
          id: randomUUID(),
          content: this.payload.note,
          created_by: 'ai_system',
          created_at: this.created_at,
          reason: this.reason
        });
        break;

      case 'SET_MILESTONE':
        adjustedTask.milestone = this.payload.milestone;
        adjustedTask.adjustments = adjustedTask.adjustments || [];
        adjustedTask.adjustments.push({
          type: 'milestone',
          value: this.payload.milestone,
          reason: this.reason,
          applied_at: this.created_at
        });
        break;
    }

    return adjustedTask;
  }

  // Criar nova tarefa (para ação ADD_TASK)
  createNewTask() {
    if (this.action !== 'ADD_TASK') {
      throw new Error('createNewTask só pode ser chamado para ação ADD_TASK');
    }

    return {
      id: randomUUID(),
      ...this.payload.task,
      created_by: 'ai_system',
      created_at: this.created_at,
      adjustment_reason: this.reason,
      is_adjustment: true
    };
  }

  // Marcar como supersedido
  supersede() {
    this.status = 'superseded';
  }

  // Marcar como cancelado
  cancel() {
    this.status = 'cancelled';
  }

  // Serializar para JSON
  toJSON() {
    return {
      id: this.id,
      servico_instancia_id: this.servico_instancia_id,
      briefing_id: this.briefing_id,
      action: this.action,
      task_id: this.task_id,
      task_template_key: this.task_template_key,
      payload: this.payload,
      reason: this.reason,
      created_at: this.created_at,
      created_by: this.created_by,
      status: this.status
    };
  }

  // Criar a partir de JSON
  static fromJSON(data) {
    return new TaskAdjustment(data);
  }

  // Métodos estáticos para operações CRUD (simulando API)
  static async create(data) {
    const adjustment = new TaskAdjustment(data);
    const validation = adjustment.validate();
    
    if (!validation.isValid) {
      throw new Error(`Ajuste inválido: ${validation.errors.join(', ')}`);
    }

    // Simular persistência
    console.log('[TaskAdjustment] Criando ajuste:', adjustment.toJSON());
    return adjustment;
  }

  static async get(id) {
    // Simular busca
    console.log('[TaskAdjustment] Buscando ajuste:', id);
    return null; // Implementar busca real
  }

  static async findByService(servico_instancia_id) {
    // Simular busca por serviço
    console.log('[TaskAdjustment] Buscando ajustes do serviço:', servico_instancia_id);
    return []; // Implementar busca real
  }

  static async findByBriefing(briefing_id) {
    // Simular busca por briefing
    console.log('[TaskAdjustment] Buscando ajustes do briefing:', briefing_id);
    return []; // Implementar busca real
  }

  static async getActiveByService(servico_instancia_id) {
    // Simular busca de ajustes ativos por serviço
    console.log('[TaskAdjustment] Buscando ajustes ativos do serviço:', servico_instancia_id);
    return []; // Implementar busca real
  }

  static async delete(id) {
    // Simular exclusão
    console.log('[TaskAdjustment] Excluindo ajuste:', id);
    return true; // Implementar exclusão real
  }

  // Aplicar múltiplos ajustes a uma lista de tarefas
  static applyAdjustmentsToTasks(tasks, adjustments) {
    const adjustedTasks = [...tasks];
    const newTasks = [];

    // Aplicar ajustes às tarefas existentes
    adjustments.forEach(adjustment => {
      if (adjustment.action === 'ADD_TASK') {
        // Criar nova tarefa
        const newTask = adjustment.createNewTask();
        newTasks.push(newTask);
      } else {
        // Aplicar ajuste à tarefa existente
        const taskIndex = adjustedTasks.findIndex(
          task => task.id === adjustment.task_id || 
                  task.template_key === adjustment.task_template_key
        );

        if (taskIndex !== -1) {
          adjustedTasks[taskIndex] = adjustment.applyToTask(adjustedTasks[taskIndex]);
        }
      }
    });

    return {
      adjustedTasks: adjustedTasks.filter(task => !task.hidden),
      newTasks
    };
  }
}

export default TaskAdjustment;

