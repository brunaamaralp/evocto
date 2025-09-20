import { useState, useCallback, useEffect } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { toast } from 'sonner';

/**
 * Hook para gerenciamento de alertas de KPIs
 */
export function useKPIAlerts() {
  const { user } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Verificar KPIs fora da meta
   */
  const checkKPIAlerts = useCallback(async (clientId, serviceId) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/kpi-alerts/check/${clientId}/${serviceId}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Erro ao verificar KPIs: ${response.statusText}`);
      }

      const data = await response.json();
      return data;

    } catch (err) {
      setError(err.message);
      console.error('Erro ao verificar alertas de KPIs:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Enviar alertas de KPIs
   */
  const sendKPIAlerts = useCallback(async (alertData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/kpi-alerts/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          ...alertData,
          sentBy: user.email,
          sentAt: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Erro ao enviar alertas: ${response.statusText}`);
      }

      const result = await response.json();
      toast.success(`${result.sentCount} alertas de KPIs enviados!`);
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
   * Analisar KPIs e gerar alertas
   */
  const analyzeKPIs = useCallback((kpis, targets, thresholds) => {
    const alerts = [];

    kpis.forEach(kpi => {
      const target = targets?.find(t => t.key === kpi.key);
      if (!target || !target.value) return;

      const currentValue = kpi.value;
      const targetValue = target.value;
      const progress = (currentValue / targetValue) * 100;

      let alertLevel = null;
      let alertType = null;

      if (progress < thresholds.critical) {
        alertLevel = 'critical';
        alertType = 'below_target';
      } else if (progress < thresholds.warning) {
        alertLevel = 'warning';
        alertType = 'at_risk';
      } else if (progress >= thresholds.success) {
        alertLevel = 'success';
        alertType = 'above_target';
      }

      if (alertLevel) {
        alerts.push({
          kpiKey: kpi.key,
          kpiLabel: kpi.label,
          kpiUnit: kpi.unit,
          currentValue,
          targetValue,
          progress,
          alertLevel,
          alertType,
          trend: this.calculateTrend(kpi),
          recommendation: this.generateRecommendation(kpi, alertLevel, progress)
        });
      }
    });

    return alerts;
  }, []);

  /**
   * Calcular tendência do KPI
   */
  const calculateTrend = useCallback((kpi) => {
    // Simular cálculo de tendência baseado em dados históricos
    // Em implementação real, usar dados históricos reais
    const trend = Math.random() > 0.5 ? 'up' : 'down';
    const percentage = Math.random() * 10; // 0-10%
    
    return {
      direction: trend,
      percentage: trend === 'up' ? percentage : -percentage,
      period: '30 dias'
    };
  }, []);

  /**
   * Gerar recomendação baseada no KPI
   */
  const generateRecommendation = useCallback((kpi, alertLevel, progress) => {
    const recommendations = {
      receita_mensal: {
        critical: 'Foque em estratégias de crescimento de receita. Considere novos produtos ou mercados.',
        warning: 'Receita próxima da meta. Mantenha o foco nas estratégias atuais.',
        success: 'Excelente! Receita acima da meta. Continue com as estratégias atuais.'
      },
      margem_percent: {
        critical: 'Margem crítica! Revise custos e preços. Considere otimização de processos.',
        warning: 'Margem em risco. Monitore custos e considere ajustes de preço.',
        success: 'Margem excelente! Continue otimizando processos e preços.'
      },
      inadimplencia_percent: {
        critical: 'Inadimplência alta! Implemente políticas de cobrança mais rigorosas.',
        warning: 'Inadimplência aumentando. Revise políticas de crédito.',
        success: 'Inadimplência controlada! Mantenha as políticas atuais.'
      },
      fluxo_saldo: {
        critical: 'Fluxo de caixa negativo! Priorize recebimentos e controle gastos.',
        warning: 'Fluxo de caixa baixo. Monitore recebimentos e pagamentos.',
        success: 'Fluxo de caixa saudável! Continue com o controle atual.'
      }
    };

    return recommendations[kpi.key]?.[alertLevel] || 'Monitore este indicador regularmente.';
  }, []);

  /**
   * Gerar conteúdo do alerta
   */
  const generateAlertContent = useCallback((alert) => {
    const { kpiLabel, currentValue, targetValue, progress, alertLevel, trend, recommendation } = alert;

    let emoji = '';
    let urgency = '';
    let message = '';

    switch (alertLevel) {
      case 'critical':
        emoji = '🚨';
        urgency = 'CRÍTICO';
        message = `${kpiLabel} está ${progress.toFixed(1)}% da meta (${targetValue}). Ação imediata necessária!`;
        break;
      case 'warning':
        emoji = '⚠️';
        urgency = 'ATENÇÃO';
        message = `${kpiLabel} está ${progress.toFixed(1)}% da meta (${targetValue}). Monitore de perto.`;
        break;
      case 'success':
        emoji = '🎉';
        urgency = 'SUCESSO';
        message = `${kpiLabel} está ${progress.toFixed(1)}% da meta (${targetValue}). Parabéns!`;
        break;
    }

    return {
      emoji,
      urgency,
      message,
      kpiLabel,
      currentValue,
      targetValue,
      progress: progress.toFixed(1),
      trend: trend.direction,
      trendPercentage: Math.abs(trend.percentage).toFixed(1),
      recommendation,
      alertLevel
    };
  }, []);

  return {
    loading,
    error,
    checkKPIAlerts,
    sendKPIAlerts,
    analyzeKPIs,
    calculateTrend,
    generateRecommendation,
    generateAlertContent
  };
}

/**
 * Serviço de alertas de KPIs
 */
export class KPIAlertService {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
  }

  /**
   * Iniciar verificação automática de KPIs
   */
  start(intervalHours = 24) {
    if (this.isRunning) return;

    this.isRunning = true;
    this.intervalId = setInterval(() => {
      this.checkAndSendKPIAlerts();
    }, intervalHours * 60 * 60 * 1000);

    console.log(`Serviço de alertas de KPIs iniciado (verificação a cada ${intervalHours} horas)`);
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
    console.log('Serviço de alertas de KPIs parado');
  }

  /**
   * Verificar e enviar alertas de KPIs
   */
  async checkAndSendKPIAlerts() {
    try {
      console.log('Verificando KPIs para alertas...');

      // Obter todas as configurações ativas de KPIs
      const configs = await this.getActiveKPIConfigurations();
      
      for (const config of configs) {
        await this.processClientKPIAlerts(config);
      }

      console.log('Verificação de alertas de KPIs concluída');
    } catch (error) {
      console.error('Erro na verificação de alertas de KPIs:', error);
    }
  }

  /**
   * Obter configurações ativas de KPIs
   */
  async getActiveKPIConfigurations() {
    try {
      const response = await fetch('/api/kpi-alerts/active-configs');
      if (!response.ok) throw new Error('Erro ao obter configurações de KPIs');
      return await response.json();
    } catch (error) {
      console.error('Erro ao obter configurações ativas de KPIs:', error);
      return [];
    }
  }

  /**
   * Processar alertas de KPIs para um cliente
   */
  async processClientKPIAlerts(config) {
    try {
      const { clientId, serviceId, thresholds, channels, recipients } = config;

      // Obter dados atuais dos KPIs
      const kpiData = await this.getClientKPIData(clientId, serviceId);
      
      if (!kpiData.kpis || !kpiData.targets) return;

      // Analisar KPIs e gerar alertas
      const alerts = this.analyzeKPIs(kpiData.kpis, kpiData.targets, thresholds);

      if (alerts.length > 0) {
        await this.sendKPIAlerts(alerts, channels, recipients, config);
      }
    } catch (error) {
      console.error(`Erro ao processar alertas de KPIs para cliente ${config.clientId}:`, error);
    }
  }

  /**
   * Obter dados de KPIs do cliente
   */
  async getClientKPIData(clientId, serviceId) {
    try {
      const response = await fetch(`/api/financial-data/dashboard/${clientId}/${serviceId}`);
      if (!response.ok) throw new Error('Erro ao obter dados de KPIs');
      return await response.json();
    } catch (error) {
      console.error('Erro ao obter dados de KPIs do cliente:', error);
      return { kpis: [], targets: [] };
    }
  }

  /**
   * Analisar KPIs e gerar alertas
   */
  analyzeKPIs(kpis, targets, thresholds) {
    const alerts = [];

    kpis.forEach(kpi => {
      const target = targets?.find(t => t.key === kpi.key);
      if (!target || !target.value) return;

      const currentValue = kpi.value;
      const targetValue = target.value;
      const progress = (currentValue / targetValue) * 100;

      let alertLevel = null;
      let alertType = null;

      if (progress < thresholds.critical) {
        alertLevel = 'critical';
        alertType = 'below_target';
      } else if (progress < thresholds.warning) {
        alertLevel = 'warning';
        alertType = 'at_risk';
      } else if (progress >= thresholds.success) {
        alertLevel = 'success';
        alertType = 'above_target';
      }

      if (alertLevel) {
        alerts.push({
          kpiKey: kpi.key,
          kpiLabel: kpi.label,
          kpiUnit: kpi.unit,
          currentValue,
          targetValue,
          progress,
          alertLevel,
          alertType,
          trend: this.calculateTrend(kpi),
          recommendation: this.generateRecommendation(kpi, alertLevel, progress)
        });
      }
    });

    return alerts;
  }

  /**
   * Calcular tendência do KPI
   */
  calculateTrend(kpi) {
    // Simular cálculo de tendência
    const trend = Math.random() > 0.5 ? 'up' : 'down';
    const percentage = Math.random() * 10;
    
    return {
      direction: trend,
      percentage: trend === 'up' ? percentage : -percentage,
      period: '30 dias'
    };
  }

  /**
   * Gerar recomendação
   */
  generateRecommendation(kpi, alertLevel, progress) {
    const recommendations = {
      receita_mensal: {
        critical: 'Foque em estratégias de crescimento de receita. Considere novos produtos ou mercados.',
        warning: 'Receita próxima da meta. Mantenha o foco nas estratégias atuais.',
        success: 'Excelente! Receita acima da meta. Continue com as estratégias atuais.'
      },
      margem_percent: {
        critical: 'Margem crítica! Revise custos e preços. Considere otimização de processos.',
        warning: 'Margem em risco. Monitore custos e considere ajustes de preço.',
        success: 'Margem excelente! Continue otimizando processos e preços.'
      },
      inadimplencia_percent: {
        critical: 'Inadimplência alta! Implemente políticas de cobrança mais rigorosas.',
        warning: 'Inadimplência aumentando. Revise políticas de crédito.',
        success: 'Inadimplência controlada! Mantenha as políticas atuais.'
      },
      fluxo_saldo: {
        critical: 'Fluxo de caixa negativo! Priorize recebimentos e controle gastos.',
        warning: 'Fluxo de caixa baixo. Monitore recebimentos e pagamentos.',
        success: 'Fluxo de caixa saudável! Continue com o controle atual.'
      }
    };

    return recommendations[kpi.key]?.[alertLevel] || 'Monitore este indicador regularmente.';
  }

  /**
   * Enviar alertas de KPIs
   */
  async sendKPIAlerts(alerts, channels, recipients, config) {
    for (const alert of alerts) {
      try {
        const alertContent = this.generateAlertContent(alert);
        
        // Enviar para cada canal configurado
        for (const channel of channels) {
          await this.sendAlertToChannel(
            alertContent,
            channel,
            recipients,
            config
          );
        }

        // Registrar envio
        await this.logKPIAlertSent(alert, channels, recipients);
      } catch (error) {
        console.error(`Erro ao enviar alerta de KPI ${alert.kpiKey}:`, error);
      }
    }
  }

  /**
   * Gerar conteúdo do alerta
   */
  generateAlertContent(alert) {
    const { kpiLabel, currentValue, targetValue, progress, alertLevel, trend, recommendation } = alert;

    let emoji = '';
    let urgency = '';
    let message = '';

    switch (alertLevel) {
      case 'critical':
        emoji = '🚨';
        urgency = 'CRÍTICO';
        message = `${kpiLabel} está ${progress.toFixed(1)}% da meta (${targetValue}). Ação imediata necessária!`;
        break;
      case 'warning':
        emoji = '⚠️';
        urgency = 'ATENÇÃO';
        message = `${kpiLabel} está ${progress.toFixed(1)}% da meta (${targetValue}). Monitore de perto.`;
        break;
      case 'success':
        emoji = '🎉';
        urgency = 'SUCESSO';
        message = `${kpiLabel} está ${progress.toFixed(1)}% da meta (${targetValue}). Parabéns!`;
        break;
    }

    return {
      emoji,
      urgency,
      message,
      kpiLabel,
      currentValue,
      targetValue,
      progress: progress.toFixed(1),
      trend: trend.direction,
      trendPercentage: Math.abs(trend.percentage).toFixed(1),
      recommendation,
      alertLevel,
      dashboardUrl: `${window.location.origin}/cliente/${config.clientId}/servicos/${config.serviceId}/dashboard`
    };
  }

  /**
   * Enviar alerta para canal específico
   */
  async sendAlertToChannel(content, channel, recipients, config) {
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

      console.log(`Alerta de KPI enviado via ${channel} para ${recipients.join(', ')}`);
    } catch (error) {
      console.error(`Erro ao enviar alerta via ${channel}:`, error);
    }
  }

  /**
   * Registrar envio de alerta de KPI
   */
  async logKPIAlertSent(alert, channels, recipients) {
    try {
      await fetch('/api/kpi-alerts/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          kpiKey: alert.kpiKey,
          alertLevel: alert.alertLevel,
          channels,
          recipients,
          sentAt: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Erro ao registrar envio de alerta de KPI:', error);
    }
  }
}

// Instância global do serviço
export const kpiAlertService = new KPIAlertService();

