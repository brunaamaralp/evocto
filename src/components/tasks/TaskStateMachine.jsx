import React from 'react';
import { Task } from '@/api/entities';
import { Service } from '@/api/entities';
import { User } from '@/api/entities';
import { AuditLog } from '@/api/entities';
import { Notification } from '@/api/entities';
import { toast } from 'sonner';

/**
 * Task State Machine
 * Estados: backlog → todo → in_progress → in_review → completed | blocked | cancelled
 * Guards rigorosos para conclusão e propagação de bloqueios críticos
 */
export class TaskStateMachine {
  constructor(task, user) {
    this.task = task;
    this.user = user;
    this.agencyId = user?.data?.agencyId;
  }

  // ====== VALIDATORS (Guards de Transição) ======

  async validateCompleteGuards() {
    const errors = [];

    // 1. Validar checklist 100% concluído (se existir)
    if (this.task.checklist && this.task.checklist.length > 0) {
      const incompleteTasks = this.task.checklist.filter(item => !item.completed);
      
      if (incompleteTasks.length > 0) {
        const incompleteItems = incompleteTasks.map(item => item.text).join(', ');
        errors.push(`Checklist pendente: ${incompleteTasks.length} item(ns) não concluído(s): ${incompleteItems}`);
      }

      // Validar evidências obrigatórias
      const evidenceRequired = this.task.checklist.filter(item => 
        item.completed && item.evidenceRequired && (!item.evidenceUrls || item.evidenceUrls.length === 0)
      );

      if (evidenceRequired.length > 0) {
        const evidenceItems = evidenceRequired.map(item => item.text).join(', ');
        errors.push(`Evidências obrigatórias ausentes: ${evidenceItems}`);
      }
    }

    // 2. Validar dependências (nenhuma deve estar in_progress ou blocked)
    if (this.task.dependencies && this.task.dependencies.length > 0) {
      const unresolvedDependencies = [];

      for (const dependency of this.task.dependencies) {
        if (!dependency.isResolved) {
          try {
            const dependentTask = await Task.get(dependency.taskId);
            
            if (dependentTask && !['completed', 'cancelled'].includes(dependentTask.status)) {
              unresolvedDependencies.push({
                task: dependentTask.title,
                status: dependentTask.status,
                type: dependency.type || 'finish_to_start'
              });
            }
          } catch (error) {
            console.error('Erro ao validar dependência:', error);
            errors.push(`Erro ao verificar dependência: ${dependency.taskId}`);
          }
        }
      }

      if (unresolvedDependencies.length > 0) {
        const depMessages = unresolvedDependencies.map(dep => 
          `"${dep.task}" (${dep.status})`
        ).join(', ');
        errors.push(`Dependências não resolvidas: ${depMessages}`);
      }
    }

    // 3. Validar se task não está bloqueada
    if (this.task.status === 'blocked') {
      errors.push('Tarefa bloqueada não pode ser concluída. Remova o bloqueio primeiro.');
    }

    // 4. Validar progresso mínimo (se configurado)
    if (this.task.progress !== undefined && this.task.progress < 100) {
      errors.push(`Progresso insuficiente: ${this.task.progress}% (esperado: 100%)`);
    }

    return {
      valid: errors.length === 0,
      errors,
      message: errors.length === 0 ? 'Todos os critérios atendidos' : errors.join('; ')
    };
  }

  async validateBlockGuards(blockData) {
    const errors = [];

    // 1. Reason ou blocked_by_task_id obrigatório
    if (!blockData.reason && !blockData.blocked_by_task_id) {
      errors.push('Motivo do bloqueio ou tarefa bloqueadora deve ser informado');
    }

    // 2. Se reason está vazio mas tem blocked_by_task_id, validar se a task existe
    if (blockData.blocked_by_task_id) {
      try {
        const blockerTask = await Task.get(blockData.blocked_by_task_id);
        if (!blockerTask) {
          errors.push('Tarefa bloqueadora não encontrada');
        } else if (blockerTask.status === 'completed') {
          errors.push('Tarefa bloqueadora já está concluída');
        }
      } catch (error) {
        errors.push('Erro ao validar tarefa bloqueadora');
      }
    }

    // 3. Validar se não está já bloqueada
    if (this.task.status === 'blocked') {
      errors.push('Tarefa já está bloqueada');
    }

    // 4. Validar se não está concluída
    if (this.task.status === 'completed') {
      errors.push('Tarefa concluída não pode ser bloqueada');
    }

    return {
      valid: errors.length === 0,
      errors,
      message: errors.length === 0 ? 'Bloqueio pode ser aplicado' : errors.join('; ')
    };
  }

  async validateReopenGuards(reopenData) {
    const errors = [];

    // 1. Reason obrigatório
    if (!reopenData.reason || reopenData.reason.trim().length === 0) {
      errors.push('Motivo da reabertura é obrigatório');
    }

    // 2. Só pode reabrir tasks completed
    if (this.task.status !== 'completed') {
      errors.push(`Apenas tarefas concluídas podem ser reabertas. Status atual: ${this.task.status}`);
    }

    // 3. Validar se o usuário tem permissão
    if (this.task.assignedTo && this.task.assignedTo !== this.user.id) {
      const user = this.user;
      if (!['owner', 'admin'].includes(user.data?.role)) {
        errors.push('Apenas o responsável ou administradores podem reabrir esta tarefa');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      message: errors.length === 0 ? 'Reabertura pode ser realizada' : errors.join('; ')
    };
  }

  // ====== ACTIONS (Efeitos das Transições) ======

  async executeStartActions() {
    try {
      const now = new Date().toISOString();

      // Atualizar task
      await Task.update(this.task.id, {
        status: 'in_progress',
        actualStartDate: now,
        progress: this.task.progress || 0
      });

      // Audit log
      await AuditLog.create({
        agencyId: this.agencyId,
        entity_type: 'Task',
        entity_id: this.task.id,
        action: 'TASK_STARTED',
        actor_id: this.user.email,
        meta_json: {
          task_title: this.task.title,
          deliverable_id: this.task.deliverableId,
          started_at: now,
          previous_status: this.task.status
        }
      });

      return { 
        success: true, 
        actions: ['Status alterado para in_progress', 'Data de início registrada'] 
      };

    } catch (error) {
      console.error('Erro ao iniciar tarefa:', error);
      throw new Error('Falha ao iniciar tarefa: ' + error.message);
    }
  }

  async executeCompleteActions() {
    try {
      const validation = await this.validateCompleteGuards();
      
      if (!validation.valid) {
        throw new Error(`Critérios não atendidos: ${validation.message}`);
      }

      const now = new Date().toISOString();
      const updates = {
        status: 'completed',
        completedAt: now,
        progress: 100,
        actualHours: this.task.actualHours || this.task.estimatedHours || 0
      };

      // Marcar checklist como finalizado
      if (this.task.checklist && this.task.checklist.length > 0) {
        updates.checklist = this.task.checklist.map(item => ({
          ...item,
          completed: true,
          completedAt: item.completedAt || now,
          completedBy: item.completedBy || this.user.id,
          completedByName: item.completedByName || this.user.full_name
        }));
      }

      await Task.update(this.task.id, updates);

      // Resolver dependências em outras tasks
      await this.resolveDependencies();

      // Audit log
      await AuditLog.create({
        agencyId: this.agencyId,
        entity_type: 'Task',
        entity_id: this.task.id,
        action: 'TASK_COMPLETED',
        actor_id: this.user.email,
        meta_json: {
          task_title: this.task.title,
          deliverable_id: this.task.deliverableId,
          completed_at: now,
          checklist_items: this.task.checklist?.length || 0,
          dependencies_resolved: this.task.dependencies?.length || 0,
          actual_hours: updates.actualHours
        }
      });

      // Notificar revisores (se existirem)
      if (this.task.reviewerIds && this.task.reviewerIds.length > 0) {
        await this.notifyReviewers();
      }

      return { 
        success: true, 
        actions: [
          'Status alterado para completed', 
          'Data de conclusão registrada',
          'Dependências resolvidas',
          ...(this.task.checklist?.length ? ['Checklist finalizado'] : [])
        ] 
      };

    } catch (error) {
      console.error('Erro ao concluir tarefa:', error);
      throw new Error('Falha ao concluir tarefa: ' + error.message);
    }
  }

  async executeBlockActions(blockData) {
    try {
      const validation = await this.validateBlockGuards(blockData);
      
      if (!validation.valid) {
        throw new Error(`Bloqueio inválido: ${validation.message}`);
      }

      const now = new Date().toISOString();
      const blockInfo = {
        taskId: blockData.blocked_by_task_id || null,
        reason: blockData.reason || 'Dependência de outra tarefa',
        blockedAt: now,
        blockedBy: this.user.id,
        critical: blockData.critical || false
      };

      // Atualizar task
      const updates = {
        status: 'blocked',
        blockedBy: [blockInfo], // Array para suportar múltiplos bloqueios
        progress: this.task.progress || 0 // Manter progresso atual
      };

      await Task.update(this.task.id, updates);

      // Se bloqueio crítico, marcar deliverable
      if (blockData.critical && this.task.deliverableId) {
        await this.propagateCriticalBlock(blockInfo);
      }

      // Audit log
      await AuditLog.create({
        agencyId: this.agencyId,
        entity_type: 'Task',
        entity_id: this.task.id,
        action: 'TASK_BLOCKED',
        actor_id: this.user.email,
        meta_json: {
          task_title: this.task.title,
          deliverable_id: this.task.deliverableId,
          block_reason: blockInfo.reason,
          blocked_by_task: blockData.blocked_by_task_id,
          critical: blockData.critical,
          blocked_at: now
        }
      });

      // Notificar responsável e revisores
      await this.notifyTaskBlocked(blockInfo);

      return { 
        success: true, 
        actions: [
          'Status alterado para blocked',
          'Motivo do bloqueio registrado',
          ...(blockData.critical ? ['Deliverable sinalizado como bloqueado'] : []),
          'Notificações enviadas'
        ] 
      };

    } catch (error) {
      console.error('Erro ao bloquear tarefa:', error);
      throw new Error('Falha ao bloquear tarefa: ' + error.message);
    }
  }

  async executeUnblockActions(unblockReason) {
    try {
      const now = new Date().toISOString();

      // Atualizar task
      const updates = {
        status: 'in_progress',
        blockedBy: [], // Limpar bloqueios
        unblockedAt: now,
        unblockedBy: this.user.id,
        unblockedReason: unblockReason || 'Bloqueio removido'
      };

      await Task.update(this.task.id, updates);

      // Remover sinalização crítica do deliverable (se era o único bloqueio crítico)
      if (this.task.deliverableId) {
        await this.removeCriticalBlockFromDeliverable();
      }

      // Audit log
      await AuditLog.create({
        agencyId: this.agencyId,
        entity_type: 'Task',
        entity_id: this.task.id,
        action: 'TASK_UNBLOCKED',
        actor_id: this.user.email,
        meta_json: {
          task_title: this.task.title,
          deliverable_id: this.task.deliverableId,
          unblock_reason: unblockReason,
          unblocked_at: now,
          previous_blockers: this.task.blockedBy || []
        }
      });

      return { 
        success: true, 
        actions: [
          'Status alterado para in_progress',
          'Bloqueio removido',
          'Deliverable desbloqueado'
        ] 
      };

    } catch (error) {
      console.error('Erro ao desbloquear tarefa:', error);
      throw new Error('Falha ao desbloquear tarefa: ' + error.message);
    }
  }

  async executeReopenActions(reopenData) {
    try {
      const validation = await this.validateReopenGuards(reopenData);
      
      if (!validation.valid) {
        throw new Error(`Reabertura inválida: ${validation.message}`);
      }

      const now = new Date().toISOString();

      // Atualizar task
      const updates = {
        status: 'in_progress',
        completedAt: null, // Limpar data de conclusão
        reopenedAt: now,
        reopenedBy: this.user.id,
        reopenedReason: reopenData.reason,
        progress: reopenData.resetProgress ? 0 : this.task.progress || 0
      };

      // Reabrir checklist se necessário
      if (reopenData.reopenChecklist && this.task.checklist) {
        updates.checklist = this.task.checklist.map(item => ({
          ...item,
          completed: false,
          completedAt: null,
          completedBy: null,
          completedByName: null
        }));
      }

      await Task.update(this.task.id, updates);

      // Audit log
      await AuditLog.create({
        agencyId: this.agencyId,
        entity_type: 'Task',
        entity_id: this.task.id,
        action: 'TASK_REOPENED',
        actor_id: this.user.email,
        meta_json: {
          task_title: this.task.title,
          deliverable_id: this.task.deliverableId,
          reopen_reason: reopenData.reason,
          reopened_at: now,
          progress_reset: reopenData.resetProgress || false,
          checklist_reopened: reopenData.reopenChecklist || false
        }
      });

      // Notificar responsável
      await this.notifyTaskReopened(reopenData.reason);

      return { 
        success: true, 
        actions: [
          'Status alterado para in_progress',
          'Data de conclusão removida',
          'Motivo registrado',
          'Responsável notificado',
          ...(reopenData.reopenChecklist ? ['Checklist reaberto'] : [])
        ] 
      };

    } catch (error) {
      console.error('Erro ao reabrir tarefa:', error);
      throw new Error('Falha ao reabrir tarefa: ' + error.message);
    }
  }

  // ====== HELPER METHODS ======

  async resolveDependencies() {
    try {
      // Buscar tasks que dependem desta
      const dependentTasks = await Task.filter({
        agencyId: this.agencyId,
        'dependencies.taskId': this.task.id
      });

      for (const depTask of dependentTasks) {
        const updatedDependencies = depTask.dependencies.map(dep =>
          dep.taskId === this.task.id 
            ? { ...dep, isResolved: true, resolvedAt: new Date().toISOString() }
            : dep
        );

        await Task.update(depTask.id, {
          dependencies: updatedDependencies
        });
      }

    } catch (error) {
      console.error('Erro ao resolver dependências:', error);
    }
  }

  async propagateCriticalBlock(blockInfo) {
    try {
      // Buscar serviço e atualizar deliverable
      const services = await Service.filter({
        agencyId: this.agencyId,
        'deliverables.id': this.task.deliverableId
      });

      if (services.length > 0) {
        const service = services[0];
        const updatedDeliverables = service.deliverables.map(d =>
          d.id === this.task.deliverableId
            ? { 
                ...d, 
                has_blockers: true,
                critical_blockers: [...(d.critical_blockers || []), {
                  task_id: this.task.id,
                  task_title: this.task.title,
                  reason: blockInfo.reason,
                  blocked_at: blockInfo.blockedAt
                }]
              }
            : d
        );

        await Service.update(service.id, {
          deliverables: updatedDeliverables
        });
      }

    } catch (error) {
      console.error('Erro ao propagar bloqueio crítico:', error);
    }
  }

  async removeCriticalBlockFromDeliverable() {
    try {
      // Verificar se ainda há outras tasks bloqueadas criticamente
      const otherBlockedTasks = await Task.filter({
        agencyId: this.agencyId,
        deliverableId: this.task.deliverableId,
        status: 'blocked',
        id: { $ne: this.task.id }
      });

      const hasCriticalBlocks = otherBlockedTasks.some(t => 
        t.blockedBy?.some(b => b.critical)
      );

      if (!hasCriticalBlocks) {
        // Remover sinalização do deliverable
        const services = await Service.filter({
          agencyId: this.agencyId,
          'deliverables.id': this.task.deliverableId
        });

        if (services.length > 0) {
          const service = services[0];
          const updatedDeliverables = service.deliverables.map(d =>
            d.id === this.task.deliverableId
              ? { 
                  ...d, 
                  has_blockers: false,
                  critical_blockers: (d.critical_blockers || []).filter(b => 
                    b.task_id !== this.task.id
                  )
                }
              : d
          );

          await Service.update(service.id, {
            deliverables: updatedDeliverables
          });
        }
      }

    } catch (error) {
      console.error('Erro ao remover bloqueio crítico do deliverable:', error);
    }
  }

  async notifyTaskBlocked(blockInfo) {
    try {
      const recipients = [];
      
      // Responsável
      if (this.task.assignedTo && this.task.assignedTo !== this.user.id) {
        recipients.push(this.task.assignedTo);
      }

      // Revisores
      if (this.task.reviewerIds) {
        recipients.push(...this.task.reviewerIds.filter(id => id !== this.user.id));
      }

      for (const userId of recipients) {
        await Notification.create({
          agencyId: this.agencyId,
          userId,
          type: 'task_blocked',
          subject: {
            type: 'task',
            id: this.task.id
          },
          title: `🚫 Tarefa Bloqueada${blockInfo.critical ? ' (Crítico)' : ''}`,
          context: `"${this.task.title}" foi bloqueada: ${blockInfo.reason}`,
          href: `/tasks-manager?task=${this.task.id}`,
          severity: blockInfo.critical ? 'critical' : 'warn',
          metadata: {
            task_id: this.task.id,
            task_title: this.task.title,
            block_reason: blockInfo.reason,
            critical: blockInfo.critical
          }
        });
      }

    } catch (error) {
      console.error('Erro ao notificar bloqueio:', error);
    }
  }

  async notifyTaskReopened(reason) {
    try {
      if (this.task.assignedTo && this.task.assignedTo !== this.user.id) {
        await Notification.create({
          agencyId: this.agencyId,
          userId: this.task.assignedTo,
          type: 'task_reopened',
          subject: {
            type: 'task',
            id: this.task.id
          },
          title: '🔄 Tarefa Reaberta',
          context: `"${this.task.title}" foi reaberta: ${reason}`,
          href: `/tasks-manager?task=${this.task.id}`,
          severity: 'info',
          metadata: {
            task_id: this.task.id,
            task_title: this.task.title,
            reopen_reason: reason
          }
        });
      }

    } catch (error) {
      console.error('Erro ao notificar reabertura:', error);
    }
  }

  async notifyReviewers() {
    try {
      if (!this.task.reviewerIds || this.task.reviewerIds.length === 0) return;

      for (const reviewerId of this.task.reviewerIds) {
        if (reviewerId !== this.user.id) {
          await Notification.create({
            agencyId: this.agencyId,
            userId: reviewerId,
            type: 'task_ready_for_review',
            subject: {
              type: 'task',
              id: this.task.id
            },
            title: '👀 Tarefa Pronta para Revisão',
            context: `"${this.task.title}" foi concluída e está aguardando sua revisão`,
            href: `/tasks-manager?task=${this.task.id}`,
            severity: 'info',
            metadata: {
              task_id: this.task.id,
              task_title: this.task.title
            }
          });
        }
      }

    } catch (error) {
      console.error('Erro ao notificar revisores:', error);
    }
  }

  // ====== PUBLIC INTERFACE ======

  async start() {
    if (!['backlog', 'todo'].includes(this.task.status)) {
      throw new Error('Tarefa já foi iniciada');
    }

    return await this.executeStartActions();
  }

  async complete() {
    if (!['in_progress', 'in_review'].includes(this.task.status)) {
      throw new Error(`Tarefa não pode ser concluída no status "${this.task.status}"`);
    }

    return await this.executeCompleteActions();
  }

  async block(blockData) {
    return await this.executeBlockActions(blockData);
  }

  async unblock(reason = 'Bloqueio removido') {
    if (this.task.status !== 'blocked') {
      throw new Error('Tarefa não está bloqueada');
    }

    return await this.executeUnblockActions(reason);
  }

  async reopen(reopenData) {
    return await this.executeReopenActions(reopenData);
  }

  // Verificação de transições disponíveis
  getAvailableTransitions() {
    const status = this.task.status;
    
    switch (status) {
      case 'backlog':
      case 'todo':
        return ['START'];
      case 'in_progress':
        return ['COMPLETE', 'BLOCK', 'REVIEW'];
      case 'in_review':
        return ['COMPLETE', 'BLOCK', 'RETURN_TO_PROGRESS'];
      case 'blocked':
        return ['UNBLOCK'];
      case 'completed':
        return ['REOPEN'];
      default:
        return [];
    }
  }

  canTransition(event) {
    return this.getAvailableTransitions().includes(event);
  }

  // Validação rápida sem executar
  async canComplete() {
    const validation = await this.validateCompleteGuards();
    return validation.valid;
  }

  async getCompletionBlockers() {
    const validation = await this.validateCompleteGuards();
    return validation.errors || [];
  }
}

export default TaskStateMachine;