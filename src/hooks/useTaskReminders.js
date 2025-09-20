import { useState, useCallback, useEffect } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { toast } from 'sonner';

/**
 * Hook para gerenciamento de lembretes de tarefas
 */
export function useTaskReminders() {
  const { user } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Verificar tarefas próximas do prazo
   */
  const checkUpcomingTasks = useCallback(async (clientId, serviceId) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/task-reminders/check-upcoming/${clientId}/${serviceId}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Erro ao verificar tarefas: ${response.statusText}`);
      }

      const data = await response.json();
      return data;

    } catch (err) {
      setError(err.message);
      console.error('Erro ao verificar tarefas próximas:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Enviar lembretes de tarefas
   */
  const sendTaskReminders = useCallback(async (taskIds, reminderType) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/task-reminders/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          taskIds,
          reminderType,
          sentBy: user.email,
          sentAt: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Erro ao enviar lembretes: ${response.statusText}`);
      }

      const result = await response.json();
      toast.success(`${result.sentCount} lembretes enviados com sucesso!`);
      return result;

    } catch (err) {
      setError(err.message);
      toast.error(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Obter configuração de lembretes
   */
  const getReminderConfig = useCallback(async (clientId, serviceId) => {
    try {
      const response = await fetch(`/api/task-reminders/config/${clientId}/${serviceId}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Erro ao carregar configuração: ${response.statusText}`);
      }

      const config = await response.json();
      return config;

    } catch (err) {
      console.error('Erro ao carregar configuração de lembretes:', err);
      return null;
    }
  }, [user]);

  /**
   * Processar tarefas para lembretes
   */
  const processTasksForReminders = useCallback((tasks) => {
    const now = new Date();
    const reminders = {
      '1_day': [],
      '3_days': [],
      '7_days': [],
      'overdue': []
    };

    tasks.forEach(task => {
      if (!task.dueDate || task.status === 'completed') return;

      const dueDate = new Date(task.dueDate);
      const diffDays = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        // Tarefa atrasada
        reminders.overdue.push(task);
      } else if (diffDays <= 1) {
        // 1 dia ou menos
        reminders['1_day'].push(task);
      } else if (diffDays <= 3) {
        // 3 dias ou menos
        reminders['3_days'].push(task);
      } else if (diffDays <= 7) {
        // 7 dias ou menos
        reminders['7_days'].push(task);
      }
    });

    return reminders;
  }, []);

  /**
   * Gerar conteúdo do lembrete
   */
  const generateReminderContent = useCallback((task, reminderType) => {
    const dueDate = new Date(task.dueDate);
    const diffDays = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));

    let urgency = '';
    let emoji = '';
    let message = '';

    if (diffDays < 0) {
      urgency = 'CRÍTICO';
      emoji = '🚨';
      message = `A tarefa "${task.title}" está ATRASADA há ${Math.abs(diffDays)} dia(s)!`;
    } else if (diffDays === 0) {
      urgency = 'URGENTE';
      emoji = '⏰';
      message = `A tarefa "${task.title}" vence HOJE!`;
    } else if (diffDays === 1) {
      urgency = 'ALTA';
      emoji = '⚠️';
      message = `A tarefa "${task.title}" vence AMANHÃ!`;
    } else {
      urgency = 'MÉDIA';
      emoji = '📅';
      message = `A tarefa "${task.title}" vence em ${diffDays} dias.`;
    }

    return {
      urgency,
      emoji,
      message,
      taskTitle: task.title,
      dueDate: dueDate.toLocaleDateString('pt-BR'),
      serviceName: task.serviceName,
      clientName: task.clientName,
      priority: task.priority,
      assignee: task.assignee
    };
  }, []);

  return {
    loading,
    error,
    checkUpcomingTasks,
    sendTaskReminders,
    getReminderConfig,
    processTasksForReminders,
    generateReminderContent
  };
}

/**
 * Serviço de lembretes automáticos
 */
export class TaskReminderService {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
  }

  /**
   * Iniciar verificação automática
   */
  start(intervalMinutes = 60) {
    if (this.isRunning) return;

    this.isRunning = true;
    this.intervalId = setInterval(() => {
      this.checkAndSendReminders();
    }, intervalMinutes * 60 * 1000);

    console.log(`Serviço de lembretes iniciado (verificação a cada ${intervalMinutes} minutos)`);
  }

  /**
   * Parar verificação automática
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('Serviço de lembretes parado');
  }

  /**
   * Verificar e enviar lembretes
   */
  async checkAndSendReminders() {
    try {
      console.log('Verificando tarefas para lembretes...');

      // Obter todas as configurações ativas
      const configs = await this.getActiveConfigurations();
      
      for (const config of configs) {
        await this.processClientReminders(config);
      }

      console.log('Verificação de lembretes concluída');
    } catch (error) {
      console.error('Erro na verificação de lembretes:', error);
    }
  }

  /**
   * Obter configurações ativas
   */
  async getActiveConfigurations() {
    try {
      const response = await fetch('/api/task-reminders/active-configs');
      if (!response.ok) throw new Error('Erro ao obter configurações');
      return await response.json();
    } catch (error) {
      console.error('Erro ao obter configurações ativas:', error);
      return [];
    }
  }

  /**
   * Processar lembretes para um cliente
   */
  async processClientReminders(config) {
    try {
      const { clientId, serviceId, frequencies, channels, recipients } = config;

      // Obter tarefas do cliente/serviço
      const tasks = await this.getClientTasks(clientId, serviceId);
      
      // Processar tarefas para lembretes
      const reminders = this.processTasksForReminders(tasks);

      // Enviar lembretes conforme configuração
      for (const [frequency, enabled] of Object.entries(frequencies)) {
        if (enabled && reminders[frequency].length > 0) {
          await this.sendRemindersForFrequency(
            reminders[frequency],
            frequency,
            channels,
            recipients,
            config
          );
        }
      }
    } catch (error) {
      console.error(`Erro ao processar lembretes para cliente ${config.clientId}:`, error);
    }
  }

  /**
   * Obter tarefas do cliente
   */
  async getClientTasks(clientId, serviceId) {
    try {
      const response = await fetch(`/api/tasks/client/${clientId}/service/${serviceId}`);
      if (!response.ok) throw new Error('Erro ao obter tarefas');
      return await response.json();
    } catch (error) {
      console.error('Erro ao obter tarefas do cliente:', error);
      return [];
    }
  }

  /**
   * Processar tarefas para lembretes
   */
  processTasksForReminders(tasks) {
    const now = new Date();
    const reminders = {
      '1_day': [],
      '3_days': [],
      '7_days': [],
      'overdue': []
    };

    tasks.forEach(task => {
      if (!task.dueDate || task.status === 'completed') return;

      const dueDate = new Date(task.dueDate);
      const diffDays = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        reminders.overdue.push(task);
      } else if (diffDays <= 1) {
        reminders['1_day'].push(task);
      } else if (diffDays <= 3) {
        reminders['3_days'].push(task);
      } else if (diffDays <= 7) {
        reminders['7_days'].push(task);
      }
    });

    return reminders;
  }

  /**
   * Enviar lembretes para uma frequência específica
   */
  async sendRemindersForFrequency(tasks, frequency, channels, recipients, config) {
    for (const task of tasks) {
      try {
        const reminderContent = this.generateReminderContent(task, frequency);
        
        // Enviar para cada canal configurado
        for (const channel of channels) {
          await this.sendReminderToChannel(
            reminderContent,
            channel,
            recipients,
            config
          );
        }

        // Registrar envio
        await this.logReminderSent(task.id, frequency, channels, recipients);
      } catch (error) {
        console.error(`Erro ao enviar lembrete para tarefa ${task.id}:`, error);
      }
    }
  }

  /**
   * Gerar conteúdo do lembrete
   */
  generateReminderContent(task, reminderType) {
    const dueDate = new Date(task.dueDate);
    const diffDays = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));

    let urgency = '';
    let emoji = '';
    let message = '';

    if (diffDays < 0) {
      urgency = 'CRÍTICO';
      emoji = '🚨';
      message = `A tarefa "${task.title}" está ATRASADA há ${Math.abs(diffDays)} dia(s)!`;
    } else if (diffDays === 0) {
      urgency = 'URGENTE';
      emoji = '⏰';
      message = `A tarefa "${task.title}" vence HOJE!`;
    } else if (diffDays === 1) {
      urgency = 'ALTA';
      emoji = '⚠️';
      message = `A tarefa "${task.title}" vence AMANHÃ!`;
    } else {
      urgency = 'MÉDIA';
      emoji = '📅';
      message = `A tarefa "${task.title}" vence em ${diffDays} dias.`;
    }

    return {
      urgency,
      emoji,
      message,
      taskTitle: task.title,
      dueDate: dueDate.toLocaleDateString('pt-BR'),
      serviceName: task.serviceName,
      clientName: task.clientName,
      priority: task.priority,
      assignee: task.assignee,
      taskUrl: `${window.location.origin}/tasks/${task.id}`
    };
  }

  /**
   * Enviar lembrete para canal específico
   */
  async sendReminderToChannel(content, channel, recipients, config) {
    const payload = {
      ...content,
      channel,
      recipients,
      clientId: config.clientId,
      serviceId: config.serviceId,
      configId: config.id
    };

    try {
      const response = await fetch(`/api/notifications/send/${channel}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Erro ao enviar para ${channel}: ${response.statusText}`);
      }

      console.log(`Lembrete enviado via ${channel} para ${recipients.join(', ')}`);
    } catch (error) {
      console.error(`Erro ao enviar lembrete via ${channel}:`, error);
    }
  }

  /**
   * Registrar envio de lembrete
   */
  async logReminderSent(taskId, frequency, channels, recipients) {
    try {
      await fetch('/api/task-reminders/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          taskId,
          frequency,
          channels,
          recipients,
          sentAt: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Erro ao registrar envio de lembrete:', error);
    }
  }
}

// Instância global do serviço
export const taskReminderService = new TaskReminderService();

