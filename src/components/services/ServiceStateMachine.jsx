import React from 'react';
import { Service } from '@/api/entities';
import { Task } from '@/api/entities';
import { AuditLog } from '@/api/entities';
import { generateTasksFromService } from '@/api/functions';
import { StateTransitionController, ConflictError } from '@/components/utils/StateTransitionController';
import { useSession } from '@/components/auth/SessionManager';
import { toast } from 'sonner';

/**
 * Service Instance State Machine com transições idempotentes e optimistic locking
 */
export class ServiceStateMachine {
  constructor(service, user) {
    this.service = service;
    this.user = user;
    this.agencyId = user?.data?.agencyId;
    this.transitionController = new StateTransitionController(user, this.agencyId);
  }

  // ====== TRANSIÇÕES IDEMPOTENTES ======

  async activate() {
    try {
      // 1. Validar guards
      const guardResult = await this.validateActivateGuards();
      if (!guardResult.valid) {
        throw new Error(guardResult.message);
      }

      // 2. Preparar transição
      const transitionData = {
        event: 'ACTIVATE',
        expected_version: this.service.transition_version,
        updates: {
          service_status: 'active',
          actual_start_date: new Date().toISOString()
        },
        effects: [
          {
            type: 'execute_async_job',
            jobType: 'generate_service_tasks',
            payload: { serviceId: this.service.id },
            customDedupeKey: `tasks_${this.service.id}_v${this.service.version}`
          },
          {
            type: 'send_notification',
            userId: this.service.clientId, // Notificar cliente
            notificationType: 'service_activated',
            title: 'Serviço Ativado',
            context: `O serviço "${this.service.name}" foi iniciado`,
            href: `/client/${this.service.clientId}`,
            severity: 'info'
          },
          {
            type: 'create_audit_log',
            entityType: 'Service',
            entityId: this.service.id,
            action: 'SERVICE_ACTIVATED',
            after_data: { 
              service_status: 'active',
              actual_start_date: new Date().toISOString()
            }
          }
        ]
      };

      // 3. Executar transição com optimistic locking
      const result = await this.transitionController.executeWithOptimisticLock(
        'Service', 
        this.service.id, 
        transitionData
      );

      toast.success(`Serviço "${this.service.name}" ativado com sucesso!`);
      return result;

    } catch (error) {
      if (error instanceof ConflictError) {
        toast.error(error.message);
        // Sugerir refresh para o usuário
        setTimeout(() => {
          toast.info('Recarregue a página para ver as alterações mais recentes.');
        }, 2000);
      } else {
        console.error('Erro ao ativar serviço:', error);
        toast.error('Erro ao ativar serviço: ' + error.message);
      }
      throw error;
    }
  }

  async pause(isAdministrative = false) {
    try {
      const pauseType = isAdministrative ? 'on_hold' : 'paused';
      const blockTasks = !isAdministrative;

      const transitionData = {
        event: isAdministrative ? 'PAUSE_ADMIN' : 'PAUSE',
        expected_version: this.service.transition_version,
        updates: {
          service_status: pauseType
        },
        effects: [
          {
            type: 'create_audit_log',
            entityType: 'Service',
            entityId: this.service.id,
            action: isAdministrative ? 'SERVICE_PUT_ON_HOLD' : 'SERVICE_PAUSED',
            after_data: { service_status: pauseType }
          }
        ]
      };

      // Adicionar efeito de bloquear tasks se pausa operacional
      if (blockTasks) {
        transitionData.effects.push({
          type: 'execute_async_job',
          jobType: 'block_service_tasks',
          payload: { 
            serviceId: this.service.id,
            reason: 'Serviço pausado operacionalmente'
          },
          customDedupeKey: `block_tasks_${this.service.id}_${Date.now()}`
        });
      }

      const result = await this.transitionController.executeWithOptimisticLock(
        'Service',
        this.service.id,
        transitionData
      );

      toast.success(`Serviço ${isAdministrative ? 'colocado em espera' : 'pausado'} com sucesso!`);
      return result;

    } catch (error) {
      this.handleTransitionError('pausar', error);
      throw error;
    }
  }

  async resume() {
    try {
      const transitionData = {
        event: this.service.service_status === 'on_hold' ? 'RESUME_ADMIN' : 'RESUME',
        expected_version: this.service.transition_version,
        updates: {
          service_status: 'active'
        },
        effects: [
          {
            type: 'execute_async_job',
            jobType: 'unblock_service_tasks',
            payload: { 
              serviceId: this.service.id,
              reason: 'Serviço retomado'
            },
            customDedupeKey: `unblock_tasks_${this.service.id}_${Date.now()}`
          },
          {
            type: 'create_audit_log',
            entityType: 'Service',
            entityId: this.service.id,
            action: 'SERVICE_RESUMED',
            after_data: { service_status: 'active' }
          }
        ]
      };

      const result = await this.transitionController.executeWithOptimisticLock(
        'Service',
        this.service.id,
        transitionData
      );

      toast.success('Serviço retomado com sucesso!');
      return result;

    } catch (error) {
      this.handleTransitionError('retomar', error);
      throw error;
    }
  }

  async complete() {
    try {
      // Validar guards primeiro
      const guardResult = await this.validateCompleteGuards();
      if (!guardResult.valid) {
        throw new Error(guardResult.message);
      }

      const transitionData = {
        event: 'COMPLETE',
        expected_version: this.service.transition_version,
        updates: {
          service_status: 'completed',
          actual_end_date: new Date().toISOString()
        },
        effects: [
          {
            type: 'execute_async_job',
            jobType: 'generate_completion_report',
            payload: { serviceId: this.service.id },
            customDedupeKey: `completion_report_${this.service.id}`
          },
          {
            type: 'send_notification',
            userId: this.service.clientId,
            notificationType: 'service_completed',
            title: 'Serviço Concluído',
            context: `O serviço "${this.service.name}" foi finalizado com sucesso`,
            href: `/client/${this.service.clientId}`,
            severity: 'info'
          },
          {
            type: 'create_audit_log',
            entityType: 'Service',
            entityId: this.service.id,
            action: 'SERVICE_COMPLETED',
            after_data: { 
              service_status: 'completed',
              actual_end_date: new Date().toISOString()
            }
          }
        ]
      };

      const result = await this.transitionController.executeWithOptimisticLock(
        'Service',
        this.service.id,
        transitionData
      );

      toast.success(`Serviço "${this.service.name}" concluído com sucesso!`);
      return result;

    } catch (error) {
      this.handleTransitionError('concluir', error);
      throw error;
    }
  }

  async reopen(reason) {
    try {
      // Validar guards
      const guardResult = await this.validateReopenGuards(reason);
      if (!guardResult.valid) {
        throw new Error(guardResult.message);
      }

      const transitionData = {
        event: 'REOPEN_SERVICE',
        expected_version: this.service.transition_version,
        reason, // Sempre obrigatório
        updates: {
          service_status: 'active',
          reopened_at: new Date().toISOString(),
          reopened_by: this.user.id,
          reopened_reason: reason
        },
        effects: [
          {
            type: 'create_audit_log',
            entityType: 'Service',
            entityId: this.service.id,
            action: 'SERVICE_REOPENED',
            after_data: { 
              service_status: 'active',
              reopened_reason: reason
            },
            severity: 'high' // Reabertura é evento importante
          },
          {
            type: 'send_notification',
            userId: this.service.clientId,
            notificationType: 'service_reopened',
            title: 'Serviço Reaberto',
            context: `O serviço "${this.service.name}" foi reaberto. Motivo: ${reason}`,
            href: `/client/${this.service.clientId}`,
            severity: 'warn'
          }
        ]
      };

      const result = await this.transitionController.executeWithOptimisticLock(
        'Service',
        this.service.id,
        transitionData
      );

      toast.success(`Serviço "${this.service.name}" reaberto!`);
      return result;

    } catch (error) {
      this.handleTransitionError('reabrir', error);
      throw error;
    }
  }

  async markOverdue() {
    try {
      // Esta transição é de sistema, não muda estado principal
      const transitionData = {
        event: 'MARK_OVERDUE',
        expected_version: this.service.transition_version,
        updates: {
          overdue: true,
          overdue_since: new Date().toISOString()
        },
        effects: [
          {
            type: 'send_notification',
            userId: this.service.assigned_team?.[0] || this.user.id, // Notificar líder da equipe
            notificationType: 'service_overdue',
            title: 'Serviço em Atraso',
            context: `O serviço "${this.service.name}" está atrasado`,
            href: `/service-detail/${this.service.id}`,
            severity: 'warn'
          },
          {
            type: 'create_audit_log',
            entityType: 'Service',
            entityId: this.service.id,
            action: 'SERVICE_MARKED_OVERDUE',
            after_data: { 
              overdue: true,
              overdue_since: new Date().toISOString()
            },
            severity: 'medium',
            category: 'system'
          }
        ]
      };

      const result = await this.transitionController.executeWithOptimisticLock(
        'Service',
        this.service.id,
        transitionData
      );

      console.log(`Serviço ${this.service.id} marcado como atrasado`);
      return result;

    } catch (error) {
      console.error('Erro ao marcar serviço como atrasado:', error);
      throw error;
    }
  }

  // ====== VALIDADORES (Guards) ======

  async validateActivateGuards() {
    const errors = [];

    if (!this.service.clientId) {
      errors.push('Cliente não foi selecionado para este serviço.');
    }

    if (!this.service.start_date) {
      errors.push('Data de início é obrigatória.');
    } else {
      const startDate = new Date(this.service.start_date);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      
      if (startDate > today) {
        errors.push('Data de início não pode ser no futuro.');
      }
    }

    const deliverables = this.service.deliverables || [];
    const notStartedDeliverables = deliverables.filter(d => 
      !d.status || d.status === 'not_started'
    );

    if (deliverables.length === 0) {
      errors.push('Serviço deve ter pelo menos uma fase/deliverable configurada.');
    } else if (notStartedDeliverables.length === 0) {
      errors.push('Todas as fases já foram iniciadas.');
    }

    return {
      valid: errors.length === 0,
      errors,
      message: errors.length === 0 ? 'Validação passou' : errors.join(' ')
    };
  }

  async validateCompleteGuards() {
    const errors = [];

    if (!['active', 'paused'].includes(this.service.service_status)) {
      errors.push(`Não é possível concluir serviço no estado "${this.service.service_status}".`);
    }

    const deliverables = this.service.deliverables || [];
    const incompleteDeliverables = deliverables.filter(d => d.status !== 'completed');

    if (incompleteDeliverables.length > 0) {
      const names = incompleteDeliverables.map(d => d.name).join(', ');
      errors.push(`Fases pendentes: ${names}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      message: errors.length === 0 ? 'Validação passou' : errors.join(' ')
    };
  }

  async validateReopenGuards(reason) {
    const errors = [];

    if (!['completed', 'cancelled'].includes(this.service.service_status)) {
      errors.push(`Não é possível reabrir serviço no estado "${this.service.service_status}".`);
    }

    if (!reason || reason.trim().length === 0) {
      errors.push('Motivo da reabertura é obrigatório.');
    }

    return {
      valid: errors.length === 0,
      errors,
      message: errors.length === 0 ? 'Validação passou' : errors.join(' ')
    };
  }

  handleTransitionError(action, error) {
    if (error instanceof ConflictError) {
      toast.error(`Conflito ao ${action} serviço: ${error.message}`);
      setTimeout(() => {
        toast.info('Recarregue a página para ver as alterações mais recentes.');
      }, 2000);
    } else {
      console.error(`Erro ao ${action} serviço:`, error);
      toast.error(`Erro ao ${action} serviço: ${error.message}`);
    }
  }
}

// Hook React para usar a Service State Machine
export function useServiceStateMachine(service) {
  const { user } = useSession();

  return React.useMemo(() => {
    if (!service || !user) {
      return null;
    }
    return new ServiceStateMachine(service, user);
  }, [service, user]);
}

export default ServiceStateMachine;