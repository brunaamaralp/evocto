import React from 'react';
import { NotificationTemplate } from '@/api/entities';
import { NotificationDelivery } from '@/api/entities';
import { Notification } from '@/api/entities';
import { User } from '@/api/entities';
import { SendEmail } from '@/api/integrations';

/**
 * Sistema centralizado de notificações orientadas a evento
 * Mapeia eventos para templates e gerencia entrega
 */
export class NotificationDispatcher {
  constructor(agencyId, user) {
    this.agencyId = agencyId;
    this.user = user;
    this.deliveryProviders = {
      email: new EmailDeliveryProvider(),
      in_app: new InAppDeliveryProvider(),
      sms: new SMSDeliveryProvider()
    };
  }

  /**
   * Dispatch principal - processa evento e envia notificações
   */
  async dispatch(eventType, eventData) {
    try {
      console.log(`📨 Processando evento: ${eventType}`, eventData);

      // 1. Buscar templates para o evento
      const templates = await this.getTemplatesForEvent(eventType, eventData);
      
      if (templates.length === 0) {
        console.log(`ℹ️ Nenhum template encontrado para evento: ${eventType}`);
        return { sent: 0, skipped: 1, templates: [] };
      }

      const results = [];

      // 2. Processar cada template
      for (const template of templates) {
        try {
          const result = await this.processTemplate(template, eventType, eventData);
          results.push(result);
        } catch (error) {
          console.error(`Erro ao processar template ${template.id}:`, error);
          results.push({ 
            templateId: template.id, 
            success: false, 
            error: error.message,
            recipients: 0 
          });
        }
      }

      const summary = {
        sent: results.reduce((sum, r) => sum + (r.recipients || 0), 0),
        templates: results.length,
        errors: results.filter(r => !r.success).length
      };

      console.log(`✅ Evento ${eventType} processado:`, summary);
      return summary;

    } catch (error) {
      console.error(`❌ Erro no dispatch de ${eventType}:`, error);
      throw error;
    }
  }

  /**
   * Buscar templates aplicáveis ao evento
   */
  async getTemplatesForEvent(eventType, eventData) {
    const filters = {
      agencyId: this.agencyId,
      event: eventType,
      is_enabled: true
    };

    // Filtrar por serviço específico se fornecido
    if (eventData.serviceId) {
      filters.$or = [
        { serviceId: eventData.serviceId },
        { serviceId: { $exists: false } } // Templates globais
      ];
    }

    const templates = await NotificationTemplate.filter(filters);

    // Aplicar filtros condicionais
    return templates.filter(template => 
      this.matchesConditions(template, eventData)
    );
  }

  /**
   * Verificar se template atende às condições do evento
   */
  matchesConditions(template, eventData) {
    if (!template.conditions) return true;

    const conditions = template.conditions;

    // Filtrar por categoria de serviço
    if (conditions.service_category && conditions.service_category.length > 0) {
      if (!eventData.service?.category || 
          !conditions.service_category.includes(eventData.service.category)) {
        return false;
      }
    }

    // Filtrar por segmento de cliente
    if (conditions.client_segment && conditions.client_segment.length > 0) {
      if (!eventData.client?.company_size || 
          !conditions.client_segment.includes(eventData.client.company_size)) {
        return false;
      }
    }

    // Filtrar por nível de prioridade
    if (conditions.priority_level && conditions.priority_level.length > 0) {
      const priority = eventData.task?.priority || eventData.deliverable?.priority || 'medium';
      if (!conditions.priority_level.includes(priority)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Processar template específico
   */
  async processTemplate(template, eventType, eventData) {
    // 1. Resolver destinatários
    const recipients = await this.resolveRecipients(template, eventData);
    
    if (recipients.length === 0) {
      return { 
        templateId: template.id, 
        success: true, 
        recipients: 0, 
        message: 'Nenhum destinatário encontrado' 
      };
    }

    // 2. Preparar variáveis do template
    const variables = await this.prepareTemplateVariables(eventData);

    // 3. Renderizar conteúdo
    const content = this.renderTemplate(template, variables);

    // 4. Enviar para cada destinatário
    let sent = 0;
    const deliveries = [];

    for (const recipient of recipients) {
      try {
        const delivery = await this.sendNotification(
          template, 
          recipient, 
          content, 
          eventType, 
          eventData
        );
        deliveries.push(delivery);
        sent++;
      } catch (error) {
        console.error(`Erro ao enviar para ${recipient.email}:`, error);
        deliveries.push({
          recipient: recipient.email,
          success: false,
          error: error.message
        });
      }
    }

    return {
      templateId: template.id,
      success: true,
      recipients: sent,
      deliveries
    };
  }

  /**
   * Resolver destinatários baseado no tipo
   */
  async resolveRecipients(template, eventData) {
    const recipients = [];

    switch (template.recipient_type) {
      case 'client':
        if (eventData.client) {
          recipients.push({
            id: eventData.client.user_id,
            email: eventData.client.email,
            name: eventData.client.name,
            type: 'client'
          });
        }
        break;

      case 'team':
        // Buscar membros da equipe do serviço/projeto
        if (eventData.serviceId) {
          const teamMembers = await this.getServiceTeamMembers(eventData.serviceId);
          recipients.push(...teamMembers);
        }
        break;

      case 'assignee':
        if (eventData.task?.assignedTo) {
          const assignee = await User.get(eventData.task.assignedTo);
          if (assignee) {
            recipients.push({
              id: assignee.id,
              email: assignee.email,
              name: assignee.full_name,
              type: 'assignee'
            });
          }
        }
        break;

      case 'admin':
        const admins = await User.filter({
          agencyId: this.agencyId,
          role: { $in: ['owner', 'admin'] }
        });
        recipients.push(...admins.map(user => ({
          id: user.id,
          email: user.email,
          name: user.full_name,
          type: 'admin'
        })));
        break;

      case 'custom':
        if (template.custom_recipients) {
          recipients.push(...template.custom_recipients.map(email => ({
            email,
            name: email,
            type: 'custom'
          })));
        }
        break;
    }

    return recipients;
  }

  /**
   * Preparar variáveis do template com dados do evento
   */
  async prepareTemplateVariables(eventData) {
    const variables = {
      // Data/hora
      now: new Date().toLocaleString('pt-BR'),
      today: new Date().toLocaleDateString('pt-BR'),
      
      // Usuário que disparou o evento
      actor_name: eventData.actor?.full_name || this.user?.full_name || 'Sistema',
      actor_email: eventData.actor?.email || this.user?.email || '',

      // Cliente
      client_name: eventData.client?.name || '',
      client_email: eventData.client?.email || '',
      client_company_size: eventData.client?.company_size || '',

      // Serviço
      service_name: eventData.service?.name || '',
      service_category: eventData.service?.category || '',
      service_status: eventData.service?.service_status || '',
      service_start_date: eventData.service?.start_date ? 
        new Date(eventData.service.start_date).toLocaleDateString('pt-BR') : '',

      // Deliverable
      deliverable_name: eventData.deliverable?.name || '',
      deliverable_phase: eventData.deliverable?.phase || '',
      deliverable_status: eventData.deliverable?.status || '',
      deliverable_due_date: eventData.deliverable?.sla_expires_at ? 
        new Date(eventData.deliverable.sla_expires_at).toLocaleDateString('pt-BR') : '',

      // Task
      task_title: eventData.task?.title || '',
      task_status: eventData.task?.status || '',
      task_priority: eventData.task?.priority || '',
      task_due_date: eventData.task?.dueDate ? 
        new Date(eventData.task.dueDate).toLocaleDateString('pt-BR') : '',

      // Aprovação
      approval_type: eventData.approval?.contentType || '',
      approval_status: eventData.approval?.status || '',
      approval_comment: eventData.approval?.approverComment || '',
      approval_expires_at: eventData.approval?.expiresAt ? 
        new Date(eventData.approval.expiresAt).toLocaleDateString('pt-BR') : '',

      // URLs para ações
      service_url: eventData.serviceId ? `/service-detail/${eventData.serviceId}` : '',
      client_url: eventData.client?.id ? `/client/${eventData.client.id}` : '',
      approval_url: eventData.approval?.token ? `/public-approval/${eventData.approval.token}` : '',
      task_url: eventData.task?.id ? `/tasks?taskId=${eventData.task.id}` : ''
    };

    // Variáveis customizadas por evento
    if (eventData.customVariables) {
      Object.assign(variables, eventData.customVariables);
    }

    return variables;
  }

  /**
   * Renderizar template substituindo placeholders
   */
  renderTemplate(template, variables) {
    let subject = template.subject || '';
    let body = template.body || '';

    // Substituir variáveis no formato {{variavel}}
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(placeholder, String(value || ''));
      body = body.replace(placeholder, String(value || ''));
    });

    return { subject, body };
  }

  /**
   * Enviar notificação via canal especificado
   */
  async sendNotification(template, recipient, content, eventType, eventData) {
    // Gerar chave de deduplicação
    const dedupeKey = this.generateDedupeKey(template, recipient, eventData);

    // Verificar se já foi enviada recentemente
    const existing = await NotificationDelivery.filter({
      agencyId: this.agencyId,
      template_id: template.id,
      recipient: recipient.email,
      event: eventType,
      created_date: { $gte: new Date(Date.now() - 3600000).toISOString() } // 1 hora
    });

    if (existing.length > 0 && existing[0].status === 'sent') {
      console.log(`⏭️ Notificação já enviada (dedupe): ${dedupeKey}`);
      return existing[0];
    }

    // Criar registro de entrega
    const delivery = await NotificationDelivery.create({
      agencyId: this.agencyId,
      notification_id: null, // Será preenchido após criar notificação
      template_id: template.id,
      event: eventType,
      channel: template.channel,
      recipient: recipient.email,
      status: 'queued',
      content: {
        subject: content.subject,
        body: content.body,
        variables: eventData.customVariables || {}
      },
      metadata: {
        dedupeKey,
        eventData: {
          serviceId: eventData.serviceId,
          clientId: eventData.client?.id,
          taskId: eventData.task?.id,
          deliverableId: eventData.deliverable?.id
        }
      }
    });

    try {
      // Enviar via canal específico
      const provider = this.deliveryProviders[template.channel];
      if (!provider) {
        throw new Error(`Canal não suportado: ${template.channel}`);
      }

      const result = await provider.send({
        template,
        recipient,
        content,
        priority: template.priority,
        schedule: template.schedule
      });

      // Atualizar status de entrega
      await NotificationDelivery.update(delivery.id, {
        status: 'sent',
        sent_at: new Date().toISOString(),
        provider: result.provider,
        provider_id: result.provider_id,
        provider_response: result.response
      });

      // Criar notificação in-app se necessário
      if (template.channel === 'in_app' || template.channel === 'email') {
        const notification = await Notification.create({
          agencyId: this.agencyId,
          userId: recipient.id,
          type: this.mapEventToNotificationType(eventType),
          subject: this.extractSubjectFromEventData(eventType, eventData),
          title: content.subject,
          context: content.body.substring(0, 200) + '...',
          href: this.generateNotificationHref(eventType, eventData),
          severity: this.mapEventToSeverity(eventType),
          dedupKey: dedupeKey,
          metadata: {
            event: eventType,
            templateId: template.id
          }
        });

        await NotificationDelivery.update(delivery.id, {
          notification_id: notification.id
        });
      }

      return delivery;

    } catch (error) {
      console.error(`Erro ao enviar notificação:`, error);

      // Atualizar status de falha
      await NotificationDelivery.update(delivery.id, {
        status: 'failed',
        failed_at: new Date().toISOString(),
        error_message: error.message,
        retry_count: delivery.retry_count + 1,
        next_retry_at: this.calculateNextRetry(delivery.retry_count)
      });

      throw error;
    }
  }

  /**
   * Gerar chave única para deduplicação
   */
  generateDedupeKey(template, recipient, eventData) {
    const parts = [
      template.id,
      recipient.email,
      eventData.serviceId || '',
      eventData.task?.id || '',
      eventData.deliverable?.id || '',
      Math.floor(Date.now() / (1000 * 60 * 10)) // 10 minutos de janela
    ];
    
    return `notif_${parts.join('_')}`;
  }

  /**
   * Utilitários para mapping de eventos
   */
  mapEventToNotificationType(eventType) {
    const mapping = {
      ServiceActivated: 'service_started',
      ServicePaused: 'service_paused', 
      ServiceCompleted: 'service_completed',
      DeliverableReadyForReview: 'deliverable_review',
      ApprovalRequested: 'approval_pending',
      ApprovalResolved: 'approval_resolved',
      ApprovalExpired: 'approval_expired',
      TaskBlocked: 'task_blocked',
      TaskCompleted: 'task_completed',
      TaskAssigned: 'task_assigned'
    };
    
    return mapping[eventType] || 'system_event';
  }

  mapEventToSeverity(eventType) {
    const mapping = {
      ApprovalExpired: 'critical',
      TaskBlocked: 'critical',
      ServicePaused: 'warn',
      ApprovalRequested: 'warn',
      ServiceActivated: 'info',
      TaskCompleted: 'info',
      ServiceCompleted: 'info'
    };
    
    return mapping[eventType] || 'info';
  }

  extractSubjectFromEventData(eventType, eventData) {
    const subjects = {
      service: {
        type: 'service',
        id: eventData.serviceId
      },
      task: {
        type: 'task', 
        id: eventData.task?.id
      },
      deliverable: {
        type: 'deliverable',
        id: eventData.deliverable?.id  
      }
    };

    if (eventData.serviceId) return subjects.service;
    if (eventData.task?.id) return subjects.task;
    if (eventData.deliverable?.id) return subjects.deliverable;
    
    return { type: 'system', id: 'notification' };
  }

  generateNotificationHref(eventType, eventData) {
    if (eventData.serviceId && eventData.client?.id) {
      return `/client/${eventData.client.id}?tab=services&serviceId=${eventData.serviceId}`;
    }
    
    if (eventData.task?.id) {
      return `/tasks?filter=assigned&taskId=${eventData.task.id}`;
    }
    
    if (eventData.approval?.token) {
      return `/public-approval/${eventData.approval.token}`;
    }

    return '/dashboard';
  }

  calculateNextRetry(currentRetryCount) {
    // Backoff exponencial: 5min, 15min, 1h, 4h
    const delays = [5, 15, 60, 240]; // minutos
    const delayIndex = Math.min(currentRetryCount, delays.length - 1);
    const delayMinutes = delays[delayIndex];
    
    return new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();
  }

  async getServiceTeamMembers(serviceId) {
    try {
      const { ProjectTeam } = await import('@/api/entities');
      const teamMembers = await ProjectTeam.filter({
        agencyId: this.agencyId,
        service_instance_id: serviceId,
        is_active: true
      });

      const users = [];
      for (const member of teamMembers) {
        const user = await User.get(member.user_id);
        if (user) {
          users.push({
            id: user.id,
            email: user.email,
            name: user.full_name,
            type: 'team',
            role: member.role
          });
        }
      }

      return users;
    } catch (error) {
      console.error('Erro ao buscar equipe do serviço:', error);
      return [];
    }
  }
}

/**
 * Provedores de entrega por canal
 */
class EmailDeliveryProvider {
  async send({ recipient, content, priority = 'medium' }) {
    try {
      const result = await SendEmail({
        to: recipient.email,
        subject: content.subject,
        body: content.body
      });

      return {
        provider: 'SendEmail',
        provider_id: `email_${Date.now()}`,
        response: result,
        success: true
      };
    } catch (error) {
      throw new Error(`Falha no envio de email: ${error.message}`);
    }
  }
}

class InAppDeliveryProvider {
  async send({ recipient, content }) {
    // Notificações in-app são criadas diretamente na função principal
    return {
      provider: 'InApp',
      provider_id: `inapp_${Date.now()}`,
      response: { delivered: true },
      success: true
    };
  }
}

class SMSDeliveryProvider {
  async send({ recipient, content }) {
    // TODO: Implementar envio de SMS via provider (Twilio, etc.)
    throw new Error('SMS provider não implementado');
  }
}

export default NotificationDispatcher;