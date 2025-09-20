import { useState, useCallback } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { toast } from 'sonner';

/**
 * Hook para gerenciamento de templates de notificação
 */
export function useNotificationTemplates() {
  const { user } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Obter templates disponíveis
   */
  const getTemplates = useCallback(async (type = 'all') => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/notification-templates?type=${type}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Erro ao carregar templates: ${response.statusText}`);
      }

      const templates = await response.json();
      return templates;

    } catch (err) {
      setError(err.message);
      console.error('Erro ao carregar templates:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Criar novo template
   */
  const createTemplate = useCallback(async (templateData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/notification-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          ...templateData,
          createdBy: user.email,
          createdAt: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Erro ao criar template: ${response.statusText}`);
      }

      const template = await response.json();
      toast.success('Template criado com sucesso!');
      return template;

    } catch (err) {
      setError(err.message);
      toast.error(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Atualizar template existente
   */
  const updateTemplate = useCallback(async (templateId, templateData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/notification-templates/${templateId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          ...templateData,
          updatedBy: user.email,
          updatedAt: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Erro ao atualizar template: ${response.statusText}`);
      }

      const template = await response.json();
      toast.success('Template atualizado com sucesso!');
      return template;

    } catch (err) {
      setError(err.message);
      toast.error(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Deletar template
   */
  const deleteTemplate = useCallback(async (templateId) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/notification-templates/${templateId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Erro ao deletar template: ${response.statusText}`);
      }

      toast.success('Template deletado com sucesso!');
      return true;

    } catch (err) {
      setError(err.message);
      toast.error(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Processar template com variáveis
   */
  const processTemplate = useCallback((template, variables) => {
    let processedContent = { ...template };

    // Processar título
    if (processedContent.title) {
      processedContent.title = replaceVariables(processedContent.title, variables);
    }

    // Processar conteúdo
    if (processedContent.content) {
      processedContent.content = replaceVariables(processedContent.content, variables);
    }

    // Processar conteúdo específico por canal
    if (processedContent.channels) {
      Object.keys(processedContent.channels).forEach(channel => {
        if (processedContent.channels[channel].content) {
          processedContent.channels[channel].content = replaceVariables(
            processedContent.channels[channel].content, 
            variables
          );
        }
      });
    }

    return processedContent;
  }, []);

  return {
    loading,
    error,
    getTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    processTemplate
  };
}

/**
 * Função para substituir variáveis em templates
 */
function replaceVariables(text, variables) {
  if (!text || !variables) return text;

  let processedText = text;

  // Substituir variáveis no formato {{variable}}
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    processedText = processedText.replace(regex, variables[key] || '');
  });

  // Substituir variáveis no formato {variable}
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`{${key}}`, 'g');
    processedText = processedText.replace(regex, variables[key] || '');
  });

  return processedText;
}

/**
 * Templates padrão do sistema
 */
export const defaultTemplates = {
  task_reminder: {
    id: 'task_reminder_default',
    name: 'Lembrete de Tarefa',
    type: 'task',
    category: 'reminder',
    title: '{{urgency}} - {{taskTitle}}',
    content: 'A tarefa "{{taskTitle}}" vence em {{dueDate}}. {{message}}',
    channels: {
      email: {
        subject: '{{urgency}} - {{taskTitle}}',
        content: `
          <h2>{{urgency}} - {{taskTitle}}</h2>
          <p>{{message}}</p>
          <p><strong>Prazo:</strong> {{dueDate}}</p>
          <p><strong>Responsável:</strong> {{assignee}}</p>
          <p><strong>Prioridade:</strong> {{priority}}</p>
          <p><strong>Serviço:</strong> {{serviceName}}</p>
          <p><strong>Cliente:</strong> {{clientName}}</p>
          <hr>
          <p><a href="{{taskUrl}}">Ver Tarefa</a></p>
        `,
        isHtml: true
      },
      sms: {
        content: '{{urgency}} - {{taskTitle}} vence em {{dueDate}}. {{message}}'
      },
      slack: {
        content: '{{emoji}} *{{urgency}} - {{taskTitle}}*\n{{message}}\n📅 Prazo: {{dueDate}}\n👤 Responsável: {{assignee}}\n🔗 <{{taskUrl}}|Ver Tarefa>'
      },
      in_app: {
        title: '{{urgency}} - {{taskTitle}}',
        content: '{{message}}',
        action: 'view_task',
        actionUrl: '{{taskUrl}}'
      }
    },
    variables: [
      'urgency', 'taskTitle', 'message', 'dueDate', 'assignee', 
      'priority', 'serviceName', 'clientName', 'taskUrl', 'emoji'
    ],
    isDefault: true
  },

  kpi_alert: {
    id: 'kpi_alert_default',
    name: 'Alerta de KPI',
    type: 'kpi',
    category: 'alert',
    title: '{{urgency}} - {{kpiLabel}}',
    content: '{{message}} {{recommendation}}',
    channels: {
      email: {
        subject: '{{urgency}} - {{kpiLabel}}',
        content: `
          <h2>{{urgency}} - {{kpiLabel}}</h2>
          <p>{{message}}</p>
          <p><strong>Valor Atual:</strong> {{currentValue}}</p>
          <p><strong>Meta:</strong> {{targetValue}}</p>
          <p><strong>Progresso:</strong> {{progress}}%</p>
          <p><strong>Tendência:</strong> {{trend}} {{trendPercentage}}%</p>
          <hr>
          <h3>Recomendação:</h3>
          <p>{{recommendation}}</p>
          <hr>
          <p><a href="{{dashboardUrl}}">Ver Dashboard</a></p>
        `,
        isHtml: true
      },
      sms: {
        content: '{{urgency}} - {{kpiLabel}}: {{currentValue}}/{{targetValue}} ({{progress}}%)'
      },
      slack: {
        content: '{{emoji}} *{{urgency}} - {{kpiLabel}}*\n{{message}}\n📊 Atual: {{currentValue}} | Meta: {{targetValue}} | Progresso: {{progress}}%\n📈 Tendência: {{trend}} {{trendPercentage}}%\n💡 {{recommendation}}\n🔗 <{{dashboardUrl}}|Ver Dashboard>'
      },
      in_app: {
        title: '{{urgency}} - {{kpiLabel}}',
        content: '{{message}}',
        action: 'view_dashboard',
        actionUrl: '{{dashboardUrl}}'
      }
    },
    variables: [
      'urgency', 'kpiLabel', 'message', 'currentValue', 'targetValue',
      'progress', 'trend', 'trendPercentage', 'recommendation', 'dashboardUrl', 'emoji'
    ],
    isDefault: true
  },

  client_notification: {
    id: 'client_notification_default',
    name: 'Notificação de Cliente',
    type: 'client',
    category: 'notification',
    title: 'Cliente {{action}} - {{clientName}}',
    content: 'O cliente {{clientName}} {{action}} no serviço {{serviceName}}.',
    channels: {
      email: {
        subject: 'Cliente {{action}} - {{clientName}}',
        content: `
          <h2>Cliente {{action}} - {{clientName}}</h2>
          <p>O cliente <strong>{{clientName}}</strong> {{action}} no serviço <strong>{{serviceName}}</strong>.</p>
          <p><strong>Data:</strong> {{date}}</p>
          <p><strong>Hora:</strong> {{time}}</p>
          {{#if details}}
          <hr>
          <h3>Detalhes:</h3>
          <p>{{details}}</p>
          {{/if}}
          <hr>
          <p><a href="{{serviceUrl}}">Ver Serviço</a></p>
        `,
        isHtml: true
      },
      sms: {
        content: 'Cliente {{clientName}} {{action}} no serviço {{serviceName}}.'
      },
      slack: {
        content: '👤 *Cliente {{action}} - {{clientName}}*\nServiço: {{serviceName}}\n📅 {{date}} às {{time}}\n🔗 <{{serviceUrl}}|Ver Serviço>'
      },
      in_app: {
        title: 'Cliente {{action}} - {{clientName}}',
        content: '{{clientName}} {{action}} no serviço {{serviceName}}.',
        action: 'view_service',
        actionUrl: '{{serviceUrl}}'
      }
    },
    variables: [
      'action', 'clientName', 'serviceName', 'date', 'time', 'details', 'serviceUrl'
    ],
    isDefault: true
  },

  system_alert: {
    id: 'system_alert_default',
    name: 'Alerta de Sistema',
    type: 'system',
    category: 'alert',
    title: '{{urgency}} - {{systemEvent}}',
    content: '{{message}} {{recommendation}}',
    channels: {
      email: {
        subject: '{{urgency}} - {{systemEvent}}',
        content: `
          <h2>{{urgency}} - {{systemEvent}}</h2>
          <p>{{message}}</p>
          <p><strong>Data:</strong> {{date}}</p>
          <p><strong>Hora:</strong> {{time}}</p>
          {{#if recommendation}}
          <hr>
          <h3>Recomendação:</h3>
          <p>{{recommendation}}</p>
          {{/if}}
          {{#if actionUrl}}
          <hr>
          <p><a href="{{actionUrl}}">Ver Detalhes</a></p>
          {{/if}}
        `,
        isHtml: true
      },
      sms: {
        content: '{{urgency}} - {{systemEvent}}: {{message}}'
      },
      slack: {
        content: '{{emoji}} *{{urgency}} - {{systemEvent}}*\n{{message}}\n📅 {{date}} às {{time}}\n{{#if recommendation}}💡 {{recommendation}}{{/if}}'
      },
      in_app: {
        title: '{{urgency}} - {{systemEvent}}',
        content: '{{message}}',
        action: 'view_details',
        actionUrl: '{{actionUrl}}'
      }
    },
    variables: [
      'urgency', 'systemEvent', 'message', 'date', 'time', 'recommendation', 'actionUrl', 'emoji'
    ],
    isDefault: true
  }
};

/**
 * Serviço de templates de notificação
 */
export class NotificationTemplateService {
  constructor() {
    this.templates = new Map();
    this.loadDefaultTemplates();
  }

  /**
   * Carregar templates padrão
   */
  loadDefaultTemplates() {
    Object.values(defaultTemplates).forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  /**
   * Obter template por ID
   */
  getTemplate(templateId) {
    return this.templates.get(templateId);
  }

  /**
   * Obter templates por tipo
   */
  getTemplatesByType(type) {
    return Array.from(this.templates.values()).filter(template => 
      type === 'all' || template.type === type
    );
  }

  /**
   * Processar template com variáveis
   */
  processTemplate(templateId, variables) {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} não encontrado`);
    }

    return this.processTemplateContent(template, variables);
  }

  /**
   * Processar conteúdo do template
   */
  processTemplateContent(template, variables) {
    const processed = { ...template };

    // Processar título
    if (processed.title) {
      processed.title = replaceVariables(processed.title, variables);
    }

    // Processar conteúdo
    if (processed.content) {
      processed.content = replaceVariables(processed.content, variables);
    }

    // Processar canais
    if (processed.channels) {
      Object.keys(processed.channels).forEach(channel => {
        const channelContent = processed.channels[channel];
        
        if (channelContent.subject) {
          channelContent.subject = replaceVariables(channelContent.subject, variables);
        }
        
        if (channelContent.content) {
          channelContent.content = replaceVariables(channelContent.content, variables);
        }
        
        if (channelContent.title) {
          channelContent.title = replaceVariables(channelContent.title, variables);
        }
      });
    }

    return processed;
  }

  /**
   * Validar template
   */
  validateTemplate(template) {
    const errors = [];

    if (!template.name) {
      errors.push('Nome é obrigatório');
    }

    if (!template.type) {
      errors.push('Tipo é obrigatório');
    }

    if (!template.channels || Object.keys(template.channels).length === 0) {
      errors.push('Pelo menos um canal deve ser configurado');
    }

    // Validar variáveis obrigatórias
    if (template.variables && template.variables.length > 0) {
      template.variables.forEach(variable => {
        if (!template.content.includes(`{{${variable}}}`) && 
            !template.content.includes(`{${variable}}`)) {
          errors.push(`Variável ${variable} não está sendo usada no conteúdo`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Criar template personalizado
   */
  createCustomTemplate(templateData) {
    const validation = this.validateTemplate(templateData);
    if (!validation.isValid) {
      throw new Error(`Template inválido: ${validation.errors.join(', ')}`);
    }

    const template = {
      ...templateData,
      id: `custom_${Date.now()}`,
      isDefault: false,
      createdAt: new Date().toISOString()
    };

    this.templates.set(template.id, template);
    return template;
  }

  /**
   * Atualizar template
   */
  updateTemplate(templateId, templateData) {
    const existingTemplate = this.getTemplate(templateId);
    if (!existingTemplate) {
      throw new Error(`Template ${templateId} não encontrado`);
    }

    const validation = this.validateTemplate(templateData);
    if (!validation.isValid) {
      throw new Error(`Template inválido: ${validation.errors.join(', ')}`);
    }

    const updatedTemplate = {
      ...existingTemplate,
      ...templateData,
      id: templateId,
      updatedAt: new Date().toISOString()
    };

    this.templates.set(templateId, updatedTemplate);
    return updatedTemplate;
  }

  /**
   * Deletar template
   */
  deleteTemplate(templateId) {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} não encontrado`);
    }

    if (template.isDefault) {
      throw new Error('Não é possível deletar templates padrão');
    }

    this.templates.delete(templateId);
    return true;
  }
}

// Instância global do serviço
export const notificationTemplateService = new NotificationTemplateService();

