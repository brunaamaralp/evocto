import React from 'react';
import { Service } from '@/api/entities';
import { Task } from '@/api/entities';
import { ClientDocument } from '@/api/entities';
import { ApprovalRequest } from '@/api/entities';
import { AuditLog } from '@/api/entities';
import { Notification } from '@/api/entities';
import { User } from '@/api/entities';
import { approvalWorkflow } from '@/api/functions';
import { toast } from 'sonner';

/**
 * Deliverable State Machine
 * Estados: not_started → in_progress → ready_for_review → ready_for_approval → approved → completed
 * Transições dirigidas por eventos objetivos e ApprovalRequest
 */
export class DeliverableStateMachine {
  constructor(service, deliverable, user) {
    this.service = service;
    this.deliverable = deliverable;
    this.user = user;
    this.agencyId = user?.data?.agencyId;
  }

  // ====== VALIDATORS (Sinais Objetivos) ======

  async validateTasksCompleted() {
    if (!this.deliverable.completion_criteria?.all_tasks_completed) {
      return { valid: true, message: 'Validação de tarefas não obrigatória' };
    }

    try {
      const deliverableTasks = await Task.filter({
        agencyId: this.agencyId,
        serviceId: this.service.id,
        deliverableId: this.deliverable.id,
        status: { $ne: 'cancelled' }
      });

      const incompleteTasks = deliverableTasks.filter(task => 
        task.status !== 'completed'
      );

      if (incompleteTasks.length > 0) {
        const taskNames = incompleteTasks.map(t => t.title).join(', ');
        return {
          valid: false,
          message: `${incompleteTasks.length} tarefa(s) pendente(s): ${taskNames}`
        };
      }

      return {
        valid: true,
        message: `Todas as ${deliverableTasks.length} tarefas foram concluídas`
      };

    } catch (error) {
      console.error('Erro ao validar tarefas:', error);
      return {
        valid: false,
        message: 'Erro ao verificar tarefas: ' + error.message
      };
    }
  }

  async validateRequiredDocuments() {
    const requiredDocs = this.deliverable.completion_criteria?.required_documents_present || [];
    
    if (requiredDocs.length === 0) {
      return { valid: true, message: 'Nenhum documento obrigatório' };
    }

    try {
      const clientDocuments = await ClientDocument.filter({
        agencyId: this.agencyId,
        clientId: this.service.clientId,
        deliverable_id: this.deliverable.id,
        status: { $in: ['approved', 'review'] }
      });

      const documentNames = clientDocuments.map(doc => 
        doc.title || doc.fileName
      );

      const missingDocs = requiredDocs.filter(reqDoc => 
        !documentNames.some(docName => 
          docName.toLowerCase().includes(reqDoc.toLowerCase())
        )
      );

      if (missingDocs.length > 0) {
        return {
          valid: false,
          message: `Documentos ausentes: ${missingDocs.join(', ')}`
        };
      }

      return {
        valid: true,
        message: `Todos os ${requiredDocs.length} documentos obrigatórios estão presentes`
      };

    } catch (error) {
      console.error('Erro ao validar documentos:', error);
      return {
        valid: false,
        message: 'Erro ao verificar documentos: ' + error.message
      };
    }
  }

  async validateNoBlockers() {
    if (!this.deliverable.completion_criteria?.no_blockers) {
      return { valid: true, message: 'Validação de bloqueadores não obrigatória' };
    }

    try {
      const blockedTasks = await Task.filter({
        agencyId: this.agencyId,
        serviceId: this.service.id,
        deliverableId: this.deliverable.id,
        status: 'blocked'
      });

      if (blockedTasks.length > 0) {
        const blockerReasons = blockedTasks
          .map(task => task.blocked_by?.[0]?.reason || 'Motivo não especificado')
          .join(', ');

        return {
          valid: false,
          message: `${blockedTasks.length} tarefa(s) bloqueada(s): ${blockerReasons}`
        };
      }

      // Verificar dependências não resolvidas
      const dependentTasks = await Task.filter({
        agencyId: this.agencyId,
        serviceId: this.service.id,
        deliverableId: this.deliverable.id
      });

      const unresolvedDependencies = [];
      for (const task of dependentTasks) {
        const dependencies = task.dependencies || [];
        for (const dep of dependencies) {
          if (!dep.isResolved) {
            const depTask = await Task.get(dep.taskId);
            if (depTask && depTask.status !== 'completed') {
              unresolvedDependencies.push({
                task: task.title,
                blockedBy: depTask.title
              });
            }
          }
        }
      }

      if (unresolvedDependencies.length > 0) {
        const depMessages = unresolvedDependencies
          .map(dep => `${dep.task} aguarda ${dep.blockedBy}`)
          .join(', ');

        return {
          valid: false,
          message: `Dependências não resolvidas: ${depMessages}`
        };
      }

      return {
        valid: true,
        message: 'Nenhum bloqueador identificado'
      };

    } catch (error) {
      console.error('Erro ao validar bloqueadores:', error);
      return {
        valid: false,
        message: 'Erro ao verificar bloqueadores: ' + error.message
      };
    }
  }

  async validateAllCompletionCriteria() {
    const validations = await Promise.all([
      this.validateTasksCompleted(),
      this.validateRequiredDocuments(),
      this.validateNoBlockers()
    ]);

    const failedValidations = validations.filter(v => !v.valid);
    
    if (failedValidations.length > 0) {
      return {
        valid: false,
        errors: failedValidations.map(v => v.message),
        message: failedValidations.map(v => v.message).join('; ')
      };
    }

    return {
      valid: true,
      validations: validations.map(v => v.message),
      message: 'Todos os critérios de conclusão foram atendidos'
    };
  }

  // ====== GUARDS (Condições de Transição) ======

  async validateMarkReadyForReviewGuards() {
    return await this.validateAllCompletionCriteria();
  }

  async validateRequestApprovalGuards() {
    // 1. Deve estar em ready_for_review
    if (this.deliverable.status !== 'ready_for_review') {
      return {
        valid: false,
        errors: [`Deliverable deve estar em "ready_for_review" para solicitar aprovação. Status atual: ${this.deliverable.status}`]
      };
    }

    // 2. Deve ter requires_approval=true
    if (!this.deliverable.requires_approval) {
      return {
        valid: false,
        errors: ['Este deliverable não requer aprovação externa']
      };
    }

    // 3. Verificar se não há aprovação pendente
    try {
      const existingApproval = await ApprovalRequest.filter({
        agencyId: this.agencyId,
        contentType: 'deliverable',
        contentId: this.deliverable.id,
        status: 'pending'
      });

      if (existingApproval.length > 0) {
        return {
          valid: false,
          errors: ['Já existe uma solicitação de aprovação pendente para este deliverable']
        };
      }
    } catch (error) {
      console.error('Erro ao verificar aprovação existente:', error);
    }

    return { valid: true, errors: [] };
  }

  // ====== ACTIONS (Efeitos das Transições) ======

  async executeStartActions() {
    try {
      // Atualizar deliverable
      const updatedDeliverables = this.service.deliverables.map(d =>
        d.id === this.deliverable.id 
          ? { 
              ...d, 
              status: 'in_progress',
              actual_start_date: new Date().toISOString(),
              started_by: this.user.email
            }
          : d
      );

      await Service.update(this.service.id, {
        deliverables: updatedDeliverables
      });

      // Audit log
      await AuditLog.create({
        agencyId: this.agencyId,
        entity_type: 'Service',
        entity_id: this.service.id,
        action: 'DELIVERABLE_STARTED',
        actor_id: this.user.email,
        meta_json: {
          deliverable_id: this.deliverable.id,
          deliverable_name: this.deliverable.name,
          phase: this.deliverable.phase,
          timestamp: new Date().toISOString()
        }
      });

      return { success: true, actions: ['Status alterado para in_progress'] };

    } catch (error) {
      console.error('Erro ao iniciar deliverable:', error);
      throw new Error('Falha ao iniciar deliverable: ' + error.message);
    }
  }

  async executeMarkReadyForReviewActions() {
    try {
      const validationResult = await this.validateAllCompletionCriteria();
      
      // Atualizar deliverable
      const updatedDeliverables = this.service.deliverables.map(d =>
        d.id === this.deliverable.id 
          ? { 
              ...d, 
              status: 'ready_for_review',
              ready_for_review_at: new Date().toISOString(),
              marked_ready_by: this.user.email,
              completion_validation: {
                validated_at: new Date().toISOString(),
                validated_by: this.user.email,
                validation_results: validationResult.validations || [],
                criteria_met: true
              }
            }
          : d
      );

      await Service.update(this.service.id, {
        deliverables: updatedDeliverables
      });

      // Audit log
      await AuditLog.create({
        agencyId: this.agencyId,
        entity_type: 'Service',
        entity_id: this.service.id,
        action: 'DELIVERABLE_READY_FOR_REVIEW',
        actor_id: this.user.email,
        meta_json: {
          deliverable_id: this.deliverable.id,
          deliverable_name: this.deliverable.name,
          validation_results: validationResult.validations,
          criteria_validated: true,
          timestamp: new Date().toISOString()
        }
      });

      return { 
        success: true, 
        actions: [
          'Status alterado para ready_for_review',
          'Critérios de conclusão validados',
          ...validationResult.validations
        ]
      };

    } catch (error) {
      console.error('Erro ao marcar deliverable como pronto:', error);
      throw new Error('Falha ao marcar deliverable: ' + error.message);
    }
  }

  async executeRequestApprovalActions() {
    try {
      const client = await Service.getClient ? 
        await Service.getClient(this.service.clientId) : 
        { email: 'client@example.com', name: 'Cliente' }; // Fallback

      // 1. Criar ApprovalRequest
      const approvalResult = await approvalWorkflow({
        action: 'create',
        contentType: 'deliverable',
        contentId: this.deliverable.id,
        approverEmail: client.email,
        approverName: client.name,
        message: `A fase "${this.deliverable.name}" foi concluída e está aguardando sua aprovação.`,
        expiryDays: 7,
        requiresSignature: false
      });

      if (!approvalResult.success) {
        throw new Error('Falha ao criar solicitação de aprovação: ' + approvalResult.error);
      }

      // 2. Atualizar deliverable para ready_for_approval + congelar edição
      const updatedDeliverables = this.service.deliverables.map(d =>
        d.id === this.deliverable.id 
          ? { 
              ...d, 
              status: 'ready_for_approval',
              approval_requested_at: new Date().toISOString(),
              approval_requested_by: this.user.email,
              approval_request_id: approvalResult.approval.id,
              approval_expires_at: approvalResult.approval.expiresAt,
              // Congelar edição estrutural
              structural_edit_locked: true,
              locked_fields: ['name', 'completion_criteria', 'expected_outcome'],
              locked_at: new Date().toISOString(),
              locked_by: this.user.email
            }
          : d
      );

      await Service.update(this.service.id, {
        deliverables: updatedDeliverables
      });

      // 3. Audit log
      await AuditLog.create({
        agencyId: this.agencyId,
        entity_type: 'Service',
        entity_id: this.service.id,
        action: 'DELIVERABLE_APPROVAL_REQUESTED',
        actor_id: this.user.email,
        meta_json: {
          deliverable_id: this.deliverable.id,
          deliverable_name: this.deliverable.name,
          approval_request_id: approvalResult.approval.id,
          approver_email: client.email,
          expires_at: approvalResult.approval.expiresAt,
          structural_edit_locked: true,
          timestamp: new Date().toISOString()
        }
      });

      return { 
        success: true, 
        actions: [
          'Status alterado para ready_for_approval',
          'Solicitação de aprovação enviada',
          'Edição estrutural bloqueada até decisão',
          `Expira em: ${new Date(approvalResult.approval.expiresAt).toLocaleDateString()}`
        ],
        approval_request_id: approvalResult.approval.id
      };

    } catch (error) {
      console.error('Erro ao solicitar aprovação:', error);
      throw new Error('Falha ao solicitar aprovação: ' + error.message);
    }
  }

  async executeApprovalGrantedActions(approvalData) {
    try {
      // 1. Atualizar deliverable: approved → completed
      const updatedDeliverables = this.service.deliverables.map(d =>
        d.id === this.deliverable.id 
          ? { 
              ...d, 
              status: 'completed',
              approved_at: approvalData.approved_at || new Date().toISOString(),
              approved_by_email: approvalData.approved_by_email,
              approved_by_name: approvalData.approved_by_name,
              approval_comment: approvalData.comment || '',
              actual_completion_date: new Date().toISOString(),
              // Desbloquear edição estrutural
              structural_edit_locked: false,
              locked_fields: [],
              unlocked_at: new Date().toISOString()
            }
          : d
      );

      await Service.update(this.service.id, {
        deliverables: updatedDeliverables
      });

      // 2. Iniciar próximo deliverable se existir
      const nextDeliverable = this.service.deliverables.find(d => 
        d.phase === (this.deliverable.phase + 1) && 
        d.status === 'not_started'
      );

      if (nextDeliverable) {
        const nextStateMachine = new DeliverableStateMachine(
          this.service, 
          nextDeliverable, 
          this.user
        );
        await nextStateMachine.start();
      }

      // 3. Audit log
      await AuditLog.create({
        agencyId: this.agencyId,
        entity_type: 'Service',
        entity_id: this.service.id,
        action: 'DELIVERABLE_APPROVED',
        actor_id: approvalData.approved_by_email || 'system',
        meta_json: {
          deliverable_id: this.deliverable.id,
          deliverable_name: this.deliverable.name,
          approved_by: approvalData.approved_by_name,
          comment: approvalData.comment,
          auto_transitioned: true,
          next_deliverable_started: !!nextDeliverable,
          timestamp: new Date().toISOString()
        }
      });

      return { 
        success: true, 
        actions: [
          'Status alterado para completed',
          'Aprovação registrada',
          'Edição estrutural desbloqueada',
          ...(nextDeliverable ? [`Próxima fase "${nextDeliverable.name}" iniciada`] : [])
        ]
      };

    } catch (error) {
      console.error('Erro ao processar aprovação concedida:', error);
      throw new Error('Falha ao processar aprovação: ' + error.message);
    }
  }

  async executeApprovalDeniedActions(approvalData) {
    try {
      // 1. Atualizar deliverable para rejected
      const updatedDeliverables = this.service.deliverables.map(d =>
        d.id === this.deliverable.id 
          ? { 
              ...d, 
              status: 'rejected',
              rejected_at: approvalData.rejected_at || new Date().toISOString(),
              rejected_by_email: approvalData.rejected_by_email,
              rejected_by_name: approvalData.rejected_by_name,
              rejection_reason: approvalData.comment || '',
              // Desbloquear edição para correção
              structural_edit_locked: false,
              locked_fields: [],
              unlocked_at: new Date().toISOString()
            }
          : d
      );

      await Service.update(this.service.id, {
        deliverables: updatedDeliverables
      });

      // 2. Reabrir tarefas necessárias para correção
      const deliverableTasks = await Task.filter({
        agencyId: this.agencyId,
        serviceId: this.service.id,
        deliverableId: this.deliverable.id,
        status: 'completed'
      });

      for (const task of deliverableTasks) {
        await Task.update(task.id, {
          status: 'in_progress',
          reopened_at: new Date().toISOString(),
          reopened_by: this.user.email,
          reopened_reason: `Deliverable rejeitado: ${approvalData.comment}`
        });
      }

      // 3. Audit log
      await AuditLog.create({
        agencyId: this.agencyId,
        entity_type: 'Service',
        entity_id: this.service.id,
        action: 'DELIVERABLE_REJECTED',
        actor_id: approvalData.rejected_by_email || 'system',
        meta_json: {
          deliverable_id: this.deliverable.id,
          deliverable_name: this.deliverable.name,
          rejected_by: approvalData.rejected_by_name,
          rejection_reason: approvalData.comment,
          tasks_reopened: deliverableTasks.length,
          timestamp: new Date().toISOString()
        }
      });

      return { 
        success: true, 
        actions: [
          'Status alterado para rejected',
          'Rejeição registrada',
          `${deliverableTasks.length} tarefa(s) reaberta(s) para correção`,
          'Edição estrutural desbloqueada para ajustes'
        ]
      };

    } catch (error) {
      console.error('Erro ao processar aprovação negada:', error);
      throw new Error('Falha ao processar rejeição: ' + error.message);
    }
  }

  async executeApprovalExpiredActions() {
    try {
      // 1. Atualizar deliverable para in_progress
      const expiredComment = `Aprovação expirou em ${new Date(this.deliverable.approval_expires_at).toLocaleDateString()}. Retornando para revisão.`;
      
      const updatedDeliverables = this.service.deliverables.map(d =>
        d.id === this.deliverable.id 
          ? { 
              ...d, 
              status: 'in_progress',
              approval_expired_at: new Date().toISOString(),
              approval_expiry_comment: expiredComment,
              // Desbloquear edição
              structural_edit_locked: false,
              locked_fields: [],
              unlocked_at: new Date().toISOString(),
              // Limpar dados de aprovação
              approval_request_id: null,
              approval_expires_at: null
            }
          : d
      );

      await Service.update(this.service.id, {
        deliverables: updatedDeliverables
      });

      // 2. Notificar equipe sobre expiração
      const teamMembers = await User.filter({
        agencyId: this.agencyId,
        'data.role': { $in: ['owner', 'admin', 'team'] }
      });

      for (const member of teamMembers) {
        try {
          await Notification.create({
            agencyId: this.agencyId,
            userId: member.id,
            type: 'approval_expired',
            subject: {
              type: 'deliverable',
              id: this.deliverable.id
            },
            title: '⏰ Aprovação Expirada',
            context: `A aprovação da fase "${this.deliverable.name}" expirou e retornou para revisão.`,
            href: `/service-detail?serviceId=${this.service.id}`,
            severity: 'warn',
            metadata: {
              deliverable_id: this.deliverable.id,
              deliverable_name: this.deliverable.name,
              expired_at: this.deliverable.approval_expires_at
            }
          });
        } catch (notificationError) {
          console.error('Erro ao enviar notificação de expiração:', notificationError);
        }
      }

      // 3. Audit log
      await AuditLog.create({
        agencyId: this.agencyId,
        entity_type: 'Service',
        entity_id: this.service.id,
        action: 'DELIVERABLE_APPROVAL_EXPIRED',
        actor_id: 'system',
        meta_json: {
          deliverable_id: this.deliverable.id,
          deliverable_name: this.deliverable.name,
          expired_at: this.deliverable.approval_expires_at,
          auto_comment: expiredComment,
          notifications_sent: teamMembers.length,
          timestamp: new Date().toISOString()
        }
      });

      return { 
        success: true, 
        actions: [
          'Status alterado para in_progress',
          'Aprovação expirada registrada',
          'Edição estrutural desbloqueada',
          `${teamMembers.length} notificação(ões) enviada(s)`
        ]
      };

    } catch (error) {
      console.error('Erro ao processar expiração de aprovação:', error);
      throw new Error('Falha ao processar expiração: ' + error.message);
    }
  }

  // ====== PUBLIC METHODS (Interface da State Machine) ======

  async start() {
    if (this.deliverable.status !== 'not_started') {
      toast.error('Deliverable já foi iniciado');
      return { success: false, errors: ['Deliverable já foi iniciado'] };
    }

    return await this.executeStartActions();
  }

  async markReadyForReview() {
    const validation = await this.validateMarkReadyForReviewGuards();
    
    if (!validation.valid) {
      toast.error(`Critérios não atendidos: ${validation.message}`);
      return { success: false, errors: validation.errors };
    }

    return await this.executeMarkReadyForReviewActions();
  }

  async requestApproval() {
    const validation = await this.validateRequestApprovalGuards();
    
    if (!validation.valid) {
      toast.error(validation.errors.join('; '));
      return { success: false, errors: validation.errors };
    }

    return await this.executeRequestApprovalActions();
  }

  // Métodos para eventos do ApprovalRequest (chamados externamente)
  async processApprovalGranted(approvalData) {
    return await this.executeApprovalGrantedActions(approvalData);
  }

  async processApprovalDenied(approvalData) {
    return await this.executeApprovalDeniedActions(approvalData);
  }

  async processApprovalExpired() {
    return await this.executeApprovalExpiredActions();
  }

  // ====== UTILITY METHODS ======

  getAvailableTransitions() {
    const currentStatus = this.deliverable.status;
    
    switch (currentStatus) {
      case 'not_started':
        return ['START'];
      case 'in_progress':
        return ['MARK_READY_FOR_REVIEW'];
      case 'ready_for_review':
        return this.deliverable.requires_approval ? 
          ['REQUEST_APPROVAL'] : 
          ['MARK_COMPLETED_NO_APPROVAL'];
      case 'ready_for_approval':
        return []; // Aguardando evento externo do ApprovalRequest
      case 'approved':
        return []; // Transição automática para completed
      case 'rejected':
        return ['MARK_READY_FOR_REVIEW']; // Retrabalho
      case 'completed':
        return ['REOPEN']; // Se necessário
      default:
        return [];
    }
  }

  canTransition(event) {
    return this.getAvailableTransitions().includes(event);
  }

  isStructuralEditLocked() {
    return this.deliverable.structural_edit_locked === true;
  }

  getLockedFields() {
    return this.deliverable.locked_fields || [];
  }
}

export default DeliverableStateMachine;