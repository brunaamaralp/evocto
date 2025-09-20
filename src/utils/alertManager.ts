/**
 * 🔔 Sistema de Alertas Automáticos
 * 
 * Monitora erros e envia alertas baseados em regras configuráveis
 */

import { serverLogger } from '@/utils/serverLogger';
import { loggingAPI } from '@/api/loggingAPI';

// Tipos para alertas
export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: {
    level?: string[];
    category?: string[];
    severity?: string[];
    userId?: string;
    agencyId?: string;
    timeWindow?: number; // minutos
    threshold?: number; // número de ocorrências
    messagePattern?: string; // regex para filtrar mensagens
  };
  actions: {
    email?: {
      enabled: boolean;
      recipients: string[];
      template: string;
    };
    slack?: {
      enabled: boolean;
      webhook: string;
      channel: string;
    };
    webhook?: {
      enabled: boolean;
      url: string;
      headers?: Record<string, string>;
    };
    dashboard?: {
      enabled: boolean;
      showNotification: boolean;
    };
  };
  cooldown: number; // minutos entre alertas
  lastTriggered?: number;
}

export interface AlertInstance {
  id: string;
  ruleId: string;
  triggeredAt: number;
  logs: any[];
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
  resolvedAt?: number;
}

// Regras de alerta padrão
const DEFAULT_ALERT_RULES: AlertRule[] = [
  {
    id: 'critical_errors',
    name: 'Erros Críticos',
    description: 'Alerta imediato para erros críticos',
    enabled: true,
    conditions: {
      severity: ['critical'],
      threshold: 1,
      timeWindow: 1
    },
    actions: {
      email: {
        enabled: true,
        recipients: ['admin@empresa.com'],
        template: 'critical_error'
      },
      slack: {
        enabled: true,
        webhook: process.env.SLACK_WEBHOOK_URL || '',
        channel: '#alerts'
      },
      dashboard: {
        enabled: true,
        showNotification: true
      }
    },
    cooldown: 0
  },
  {
    id: 'high_error_rate',
    name: 'Taxa Alta de Erros',
    description: 'Alerta quando há muitos erros em pouco tempo',
    enabled: true,
    conditions: {
      severity: ['high', 'critical'],
      threshold: 10,
      timeWindow: 15
    },
    actions: {
      email: {
        enabled: true,
        recipients: ['dev-team@empresa.com'],
        template: 'high_error_rate'
      },
      dashboard: {
        enabled: true,
        showNotification: true
      }
    },
    cooldown: 30
  },
  {
    id: 'authentication_failures',
    name: 'Falhas de Autenticação',
    description: 'Múltiplas falhas de autenticação',
    enabled: true,
    conditions: {
      category: ['authentication'],
      threshold: 5,
      timeWindow: 10
    },
    actions: {
      email: {
        enabled: true,
        recipients: ['security@empresa.com'],
        template: 'auth_failures'
      },
      webhook: {
        enabled: true,
        url: process.env.SECURITY_WEBHOOK_URL || '',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SECURITY_API_KEY}`
        }
      }
    },
    cooldown: 15
  },
  {
    id: 'server_errors',
    name: 'Erros de Servidor',
    description: 'Erros 5xx do servidor',
    enabled: true,
    conditions: {
      category: ['server'],
      threshold: 3,
      timeWindow: 5
    },
    actions: {
      email: {
        enabled: true,
        recipients: ['ops@empresa.com'],
        template: 'server_errors'
      },
      slack: {
        enabled: true,
        webhook: process.env.SLACK_WEBHOOK_URL || '',
        channel: '#ops'
      }
    },
    cooldown: 10
  }
];

class AlertManager {
  private rules: AlertRule[] = [...DEFAULT_ALERT_RULES];
  private instances: AlertInstance[] = [];
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;

  // Iniciar monitoramento
  startMonitoring(intervalMs: number = 60000): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.checkAlerts();
    }, intervalMs);

    console.log('🔔 Sistema de alertas iniciado');
  }

  // Parar monitoramento
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log('🔔 Sistema de alertas parado');
  }

  // Verificar alertas
  private async checkAlerts(): Promise<void> {
    try {
      for (const rule of this.rules) {
        if (!rule.enabled) continue;

        // Verificar cooldown
        if (rule.lastTriggered && Date.now() - rule.lastTriggered < rule.cooldown * 60000) {
          continue;
        }

        const shouldTrigger = await this.evaluateRule(rule);
        if (shouldTrigger) {
          await this.triggerAlert(rule);
        }
      }
    } catch (error) {
      console.error('Erro ao verificar alertas:', error);
    }
  }

  // Avaliar regra de alerta
  private async evaluateRule(rule: AlertRule): Promise<boolean> {
    try {
      const { conditions } = rule;
      const timeWindow = conditions.timeWindow || 5;
      const threshold = conditions.threshold || 1;

      // Buscar logs recentes
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - timeWindow * 60000);

      const logs = await loggingAPI.getLogs({
        level: conditions.level,
        category: conditions.category,
        severity: conditions.severity,
        userId: conditions.userId,
        agencyId: conditions.agencyId,
        startDate: startTime.toISOString(),
        endDate: endTime.toISOString(),
        limit: 1000
      });

      if (!logs.success) return false;

      let matchingLogs = logs.logs;

      // Aplicar filtro de padrão de mensagem
      if (conditions.messagePattern) {
        const regex = new RegExp(conditions.messagePattern, 'i');
        matchingLogs = matchingLogs.filter(log => regex.test(log.message));
      }

      return matchingLogs.length >= threshold;
    } catch (error) {
      console.error('Erro ao avaliar regra:', error);
      return false;
    }
  }

  // Disparar alerta
  private async triggerAlert(rule: AlertRule): Promise<void> {
    try {
      const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Buscar logs que causaram o alerta
      const timeWindow = rule.conditions.timeWindow || 5;
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - timeWindow * 60000);

      const logs = await loggingAPI.getLogs({
        level: rule.conditions.level,
        category: rule.conditions.category,
        severity: rule.conditions.severity,
        userId: rule.conditions.userId,
        agencyId: rule.conditions.agencyId,
        startDate: startTime.toISOString(),
        endDate: endTime.toISOString(),
        limit: 100
      });

      const alertInstance: AlertInstance = {
        id: alertId,
        ruleId: rule.id,
        triggeredAt: Date.now(),
        logs: logs.success ? logs.logs : [],
        message: this.generateAlertMessage(rule, logs.success ? logs.logs : []),
        severity: this.determineAlertSeverity(rule, logs.success ? logs.logs : []),
        resolved: false
      };

      this.instances.push(alertInstance);
      rule.lastTriggered = Date.now();

      // Executar ações
      await this.executeActions(rule, alertInstance);

      console.log(`🚨 Alerta disparado: ${rule.name} (${alertId})`);
    } catch (error) {
      console.error('Erro ao disparar alerta:', error);
    }
  }

  // Executar ações do alerta
  private async executeActions(rule: AlertRule, alert: AlertInstance): Promise<void> {
    const { actions } = rule;

    // Email
    if (actions.email?.enabled && actions.email.recipients.length > 0) {
      await this.sendEmailAlert(actions.email, alert);
    }

    // Slack
    if (actions.slack?.enabled && actions.slack.webhook) {
      await this.sendSlackAlert(actions.slack, alert);
    }

    // Webhook
    if (actions.webhook?.enabled && actions.webhook.url) {
      await this.sendWebhookAlert(actions.webhook, alert);
    }

    // Dashboard
    if (actions.dashboard?.enabled) {
      await this.showDashboardNotification(alert);
    }
  }

  // Enviar alerta por email
  private async sendEmailAlert(emailConfig: AlertRule['actions']['email'], alert: AlertInstance): Promise<void> {
    try {
      const template = this.getEmailTemplate(emailConfig.template!, alert);
      
      // Em produção, usar serviço de email real (SendGrid, AWS SES, etc.)
      console.log(`📧 Email enviado para: ${emailConfig.recipients.join(', ')}`);
      console.log(`Assunto: ${template.subject}`);
      console.log(`Corpo: ${template.body}`);

      // Exemplo de integração com SendGrid (descomente em produção)
      /*
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      
      await sgMail.send({
        to: emailConfig.recipients,
        from: 'alerts@empresa.com',
        subject: template.subject,
        html: template.body
      });
      */
    } catch (error) {
      console.error('Erro ao enviar email:', error);
    }
  }

  // Enviar alerta para Slack
  private async sendSlackAlert(slackConfig: AlertRule['actions']['slack'], alert: AlertInstance): Promise<void> {
    try {
      const message = this.generateSlackMessage(alert);
      
      await fetch(slackConfig.webhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel: slackConfig.channel,
          text: message.text,
          attachments: message.attachments
        })
      });

      console.log(`💬 Slack alert enviado para: ${slackConfig.channel}`);
    } catch (error) {
      console.error('Erro ao enviar alerta para Slack:', error);
    }
  }

  // Enviar webhook
  private async sendWebhookAlert(webhookConfig: AlertRule['actions']['webhook'], alert: AlertInstance): Promise<void> {
    try {
      await fetch(webhookConfig.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...webhookConfig.headers
        },
        body: JSON.stringify({
          alert: alert,
          timestamp: new Date().toISOString(),
          source: 'error-monitoring-system'
        })
      });

      console.log(`🔗 Webhook enviado para: ${webhookConfig.url}`);
    } catch (error) {
      console.error('Erro ao enviar webhook:', error);
    }
  }

  // Mostrar notificação no dashboard
  private async showDashboardNotification(alert: AlertInstance): Promise<void> {
    try {
      // Em produção, usar sistema de notificações em tempo real (WebSocket, Server-Sent Events)
      console.log(`📊 Notificação do dashboard: ${alert.message}`);
      
      // Exemplo de integração com Socket.IO (descomente em produção)
      /*
      const io = require('socket.io')(server);
      io.emit('alert', {
        id: alert.id,
        message: alert.message,
        severity: alert.severity,
        timestamp: alert.triggeredAt
      });
      */
    } catch (error) {
      console.error('Erro ao mostrar notificação no dashboard:', error);
    }
  }

  // Gerar mensagem do alerta
  private generateAlertMessage(rule: AlertRule, logs: any[]): string {
    const logCount = logs.length;
    const timeWindow = rule.conditions.timeWindow || 5;
    
    return `${rule.name}: ${logCount} ocorrência(s) detectada(s) nos últimos ${timeWindow} minutos`;
  }

  // Determinar severidade do alerta
  private determineAlertSeverity(rule: AlertRule, logs: any[]): AlertInstance['severity'] {
    const hasCritical = logs.some(log => log.severity === 'critical');
    const hasHigh = logs.some(log => log.severity === 'high');
    
    if (hasCritical) return 'critical';
    if (hasHigh) return 'high';
    if (logs.length > 10) return 'medium';
    return 'low';
  }

  // Obter template de email
  private getEmailTemplate(templateName: string, alert: AlertInstance): { subject: string; body: string } {
    const templates = {
      critical_error: {
        subject: `🚨 ERRO CRÍTICO DETECTADO - ${alert.id}`,
        body: `
          <h2>Erro Crítico Detectado</h2>
          <p><strong>Alerta ID:</strong> ${alert.id}</p>
          <p><strong>Timestamp:</strong> ${new Date(alert.triggeredAt).toLocaleString('pt-BR')}</p>
          <p><strong>Mensagem:</strong> ${alert.message}</p>
          <p><strong>Severidade:</strong> ${alert.severity}</p>
          <p><strong>Logs Envolvidos:</strong> ${alert.logs.length}</p>
          
          <h3>Logs Recentes:</h3>
          <ul>
            ${alert.logs.slice(0, 5).map(log => `
              <li>
                <strong>${log.level.toUpperCase()}</strong> - ${log.message}<br>
                <small>${new Date(log.timestamp).toLocaleString('pt-BR')}</small>
              </li>
            `).join('')}
          </ul>
        `
      },
      high_error_rate: {
        subject: `⚠️ Taxa Alta de Erros - ${alert.id}`,
        body: `
          <h2>Taxa Alta de Erros Detectada</h2>
          <p><strong>Alerta ID:</strong> ${alert.id}</p>
          <p><strong>Mensagem:</strong> ${alert.message}</p>
          <p><strong>Total de Erros:</strong> ${alert.logs.length}</p>
        `
      },
      auth_failures: {
        subject: `🔒 Múltiplas Falhas de Autenticação - ${alert.id}`,
        body: `
          <h2>Falhas de Autenticação Detectadas</h2>
          <p><strong>Alerta ID:</strong> ${alert.id}</p>
          <p><strong>Mensagem:</strong> ${alert.message}</p>
          <p><strong>Possível Ataque:</strong> Verifique imediatamente</p>
        `
      },
      server_errors: {
        subject: `🖥️ Erros de Servidor - ${alert.id}`,
        body: `
          <h2>Erros de Servidor Detectados</h2>
          <p><strong>Alerta ID:</strong> ${alert.id}</p>
          <p><strong>Mensagem:</strong> ${alert.message}</p>
          <p><strong>Ação:</strong> Verificar logs do servidor</p>
        `
      }
    };

    return templates[templateName as keyof typeof templates] || templates.critical_error;
  }

  // Gerar mensagem para Slack
  private generateSlackMessage(alert: AlertInstance): { text: string; attachments: any[] } {
    const color = {
      low: '#36a64f',
      medium: '#ff9500',
      high: '#ff0000',
      critical: '#8b0000'
    }[alert.severity];

    return {
      text: `🚨 ${alert.message}`,
      attachments: [{
        color: color,
        fields: [
          { title: 'Alerta ID', value: alert.id, short: true },
          { title: 'Severidade', value: alert.severity.toUpperCase(), short: true },
          { title: 'Timestamp', value: new Date(alert.triggeredAt).toLocaleString('pt-BR'), short: true },
          { title: 'Logs Envolvidos', value: alert.logs.length.toString(), short: true },
          { title: 'Mensagem', value: alert.message, short: false }
        ],
        footer: 'Sistema de Monitoramento de Erros',
        ts: Math.floor(alert.triggeredAt / 1000)
      }]
    };
  }

  // Gerenciar regras
  addRule(rule: AlertRule): void {
    this.rules.push(rule);
  }

  updateRule(ruleId: string, updates: Partial<AlertRule>): void {
    const index = this.rules.findIndex(rule => rule.id === ruleId);
    if (index !== -1) {
      this.rules[index] = { ...this.rules[index], ...updates };
    }
  }

  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(rule => rule.id !== ruleId);
  }

  getRules(): AlertRule[] {
    return [...this.rules];
  }

  getInstances(): AlertInstance[] {
    return [...this.instances];
  }

  // Resolver alerta
  resolveAlert(alertId: string): void {
    const alert = this.instances.find(instance => instance.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = Date.now();
    }
  }
}

// Instância singleton
export const alertManager = new AlertManager();

// Hook para usar o sistema de alertas
export function useAlertManager() {
  return {
    startMonitoring: alertManager.startMonitoring.bind(alertManager),
    stopMonitoring: alertManager.stopMonitoring.bind(alertManager),
    addRule: alertManager.addRule.bind(alertManager),
    updateRule: alertManager.updateRule.bind(alertManager),
    removeRule: alertManager.removeRule.bind(alertManager),
    getRules: alertManager.getRules.bind(alertManager),
    getInstances: alertManager.getInstances.bind(alertManager),
    resolveAlert: alertManager.resolveAlert.bind(alertManager)
  };
}

export default alertManager;

