import { Notification } from '@/api/entities';
import { User } from '@/api/entities';
import { Client } from '@/api/entities';
import { format, differenceInHours, differenceInDays, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Serviço para criar notificações automáticas relacionadas a tarefas
 */
export class TaskNotificationService {
  
  /**
   * Criar notificação quando tarefa é atribuída
   */
  static async createTaskAssignedNotification(task, assignedByUser) {
    if (!task.assignedTo || task.assignedTo === assignedByUser.id) return;

    try {
      const client = await Client.get(task.clientId);
      
      await Notification.create({
        agencyId: task.agencyId,
        userId: task.assignedTo,
        type: 'task_assigned',
        subject: {
          type: 'task',
          id: task.id
        },
        title: 'Nova tarefa atribuída',
        context: `${task.title} - ${client?.name || 'Cliente'}`,
        href: `/tasks-manager?task=${task.id}`,
        severity: task.priority === 'urgent' ? 'critical' : task.priority === 'high' ? 'warn' : 'info',
        dedupKey: `task_assigned_${task.id}_${task.assignedTo}`,
        metadata: {
          taskId: task.id,
          taskTitle: task.title,
          clientName: client?.name,
          priority: task.priority,
          dueDate: task.dueDate,
          assignedBy: assignedByUser.full_name
        }
      });

      console.log(`✅ Notificação de tarefa atribuída criada para ${task.assignedTo}`);
    } catch (error) {
      console.error('Erro ao criar notificação de tarefa atribuída:', error);
    }
  }

  /**
   * Criar notificação quando tarefa está próxima do prazo
   */
  static async createTaskDueSoonNotification(task) {
    if (!task.dueDate || task.status === 'completed') return;

    const dueDate = new Date(task.dueDate);
    const now = new Date();
    const hoursUntilDue = differenceInHours(dueDate, now);
    
    // Só notificar se estiver dentro das próximas 24h
    if (hoursUntilDue > 24 || hoursUntilDue < 0) return;

    try {
      const [client, assignee] = await Promise.all([
        Client.get(task.clientId),
        task.assignedTo ? User.get(task.assignedTo) : null
      ]);

      let title, severity;
      if (hoursUntilDue <= 2) {
        title = '🚨 Tarefa vence em breve!';
        severity = 'critical';
      } else if (hoursUntilDue <= 8) {
        title = '⚠️ Tarefa vence hoje';
        severity = 'warn';
      } else {
        title = '📅 Tarefa vence amanhã';
        severity = 'info';
      }

      const recipients = [];
      if (task.assignedTo) recipients.push(task.assignedTo);
      if (task.assignedBy && task.assignedBy !== task.assignedTo) recipients.push(task.assignedBy);

      for (const userId of recipients) {
        await Notification.create({
          agencyId: task.agencyId,
          userId,
          type: 'task_due_soon',
          subject: {
            type: 'task',
            id: task.id
          },
          title,
          context: `${task.title} - ${client?.name || 'Cliente'}`,
          href: `/tasks-manager?task=${task.id}`,
          severity,
          dedupKey: `task_due_soon_${task.id}_${userId}_${format(dueDate, 'yyyy-MM-dd')}`,
          metadata: {
            taskId: task.id,
            taskTitle: task.title,
            clientName: client?.name,
            priority: task.priority,
            dueDate: task.dueDate,
            hoursUntilDue: Math.max(0, hoursUntilDue)
          }
        });
      }

      console.log(`✅ Notificações de prazo próximo criadas para tarefa ${task.id}`);
    } catch (error) {
      console.error('Erro ao criar notificação de prazo próximo:', error);
    }
  }

  /**
   * Criar notificação quando tarefa está atrasada
   */
  static async createTaskOverdueNotification(task) {
    if (!task.dueDate || task.status === 'completed') return;

    const dueDate = new Date(task.dueDate);
    const now = new Date();
    const daysOverdue = differenceInDays(now, dueDate);
    
    if (daysOverdue <= 0) return;

    try {
      const [client, assignee] = await Promise.all([
        Client.get(task.clientId),
        task.assignedTo ? User.get(task.assignedTo) : null
      ]);

      const title = `🔴 Tarefa atrasada há ${daysOverdue} dia(s)`;
      
      const recipients = [];
      if (task.assignedTo) recipients.push(task.assignedTo);
      if (task.assignedBy && task.assignedBy !== task.assignedTo) recipients.push(task.assignedBy);

      for (const userId of recipients) {
        await Notification.create({
          agencyId: task.agencyId,
          userId,
          type: 'task_overdue',
          subject: {
            type: 'task',
            id: task.id
          },
          title,
          context: `${task.title} - ${client?.name || 'Cliente'}`,
          href: `/tasks-manager?task=${task.id}`,
          severity: 'critical',
          dedupKey: `task_overdue_${task.id}_${userId}_${format(now, 'yyyy-MM-dd')}`,
          metadata: {
            taskId: task.id,
            taskTitle: task.title,
            clientName: client?.name,
            priority: task.priority,
            dueDate: task.dueDate,
            daysOverdue
          }
        });
      }

      console.log(`✅ Notificações de atraso criadas para tarefa ${task.id}`);
    } catch (error) {
      console.error('Erro ao criar notificação de atraso:', error);
    }
  }

  /**
   * Criar notificação quando tarefa é concluída
   */
  static async createTaskCompletedNotification(task, completedByUser) {
    if (task.status !== 'completed') return;

    try {
      const client = await Client.get(task.clientId);
      
      const recipients = [];
      if (task.assignedBy && task.assignedBy !== completedByUser.id) {
        recipients.push(task.assignedBy);
      }
      
      // Notificar revisores se existirem
      if (task.reviewerIds && task.reviewerIds.length > 0) {
        task.reviewerIds.forEach(reviewerId => {
          if (reviewerId !== completedByUser.id) {
            recipients.push(reviewerId);
          }
        });
      }

      for (const userId of recipients) {
        await Notification.create({
          agencyId: task.agencyId,
          userId,
          type: 'task_completed',
          subject: {
            type: 'task',
            id: task.id
          },
          title: '✅ Tarefa concluída',
          context: `${task.title} - ${client?.name || 'Cliente'}`,
          href: `/tasks-manager?task=${task.id}`,
          severity: 'info',
          dedupKey: `task_completed_${task.id}_${userId}`,
          metadata: {
            taskId: task.id,
            taskTitle: task.title,
            clientName: client?.name,
            completedBy: completedByUser.full_name,
            completedAt: task.completedAt
          }
        });
      }

      console.log(`✅ Notificações de conclusão criadas para tarefa ${task.id}`);
    } catch (error) {
      console.error('Erro ao criar notificação de conclusão:', error);
    }
  }

  /**
   * Criar notificação quando tarefa muda de status
   */
  static async createTaskStatusChangedNotification(task, previousStatus, changedByUser) {
    if (!previousStatus || task.status === previousStatus) return;

    try {
      const client = await Client.get(task.clientId);
      
      const statusLabels = {
        backlog: 'Backlog',
        todo: 'A Fazer',
        in_progress: 'Em Progresso',
        in_review: 'Em Revisão',
        completed: 'Concluída',
        cancelled: 'Cancelada',
        blocked: 'Bloqueada'
      };

      const recipients = [];
      if (task.assignedTo && task.assignedTo !== changedByUser.id) {
        recipients.push(task.assignedTo);
      }
      if (task.assignedBy && task.assignedBy !== changedByUser.id) {
        recipients.push(task.assignedBy);
      }

      const title = `📊 Status alterado: ${statusLabels[task.status]}`;
      const severity = task.status === 'blocked' ? 'warn' : 'info';

      for (const userId of recipients) {
        await Notification.create({
          agencyId: task.agencyId,
          userId,
          type: 'task_status_changed',
          subject: {
            type: 'task',
            id: task.id
          },
          title,
          context: `${task.title} - ${client?.name || 'Cliente'}`,
          href: `/tasks-manager?task=${task.id}`,
          severity,
          dedupKey: `task_status_${task.id}_${userId}_${task.status}`,
          metadata: {
            taskId: task.id,
            taskTitle: task.title,
            clientName: client?.name,
            previousStatus,
            newStatus: task.status,
            changedBy: changedByUser.full_name
          }
        });
      }

      console.log(`✅ Notificações de mudança de status criadas para tarefa ${task.id}`);
    } catch (error) {
      console.error('Erro ao criar notificação de mudança de status:', error);
    }
  }

  /**
   * Verificar e criar notificações para tarefas próximas do prazo (executar periodicamente)
   */
  static async checkUpcomingDeadlines(agencyId) {
    try {
      const { Task } = await import('@/api/entities');
      
      // Buscar tarefas que vencem nas próximas 24h
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const upcomingTasks = await Task.filter({
        agencyId,
        status: { $nin: ['completed', 'cancelled'] },
        dueDate: { $lte: tomorrow.toISOString() }
      });

      for (const task of upcomingTasks) {
        await this.createTaskDueSoonNotification(task);
      }

      console.log(`✅ Verificação de prazos concluída: ${upcomingTasks.length} tarefas analisadas`);
    } catch (error) {
      console.error('Erro ao verificar prazos:', error);
    }
  }

  /**
   * Verificar e criar notificações para tarefas atrasadas (executar periodicamente)
   */
  static async checkOverdueTasks(agencyId) {
    try {
      const { Task } = await import('@/api/entities');
      
      const now = new Date();
      const overdueTasks = await Task.filter({
        agencyId,
        status: { $nin: ['completed', 'cancelled'] },
        dueDate: { $lt: now.toISOString() }
      });

      for (const task of overdueTasks) {
        await this.createTaskOverdueNotification(task);
      }

      console.log(`✅ Verificação de atrasos concluída: ${overdueTasks.length} tarefas em atraso`);
    } catch (error) {
      console.error('Erro ao verificar tarefas atrasadas:', error);
    }
  }
}

export default TaskNotificationService;