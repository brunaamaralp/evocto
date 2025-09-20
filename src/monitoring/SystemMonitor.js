import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

/**
 * Sistema de Monitoramento Central
 * Monitora performance, erros, métricas de negócio e gera alertas automáticos
 */
export class SystemMonitor extends EventEmitter {
  constructor() {
    super();
    this.metrics = new Map();
    this.alerts = new Map();
    this.logs = [];
    this.performanceData = new Map();
    this.businessMetrics = new Map();
    this.alertRules = new Map();
    this.isMonitoring = false;
    this.monitoringInterval = null;
    
    this.initializeDefaultAlertRules();
    this.startMonitoring();
  }

  /**
   * Inicializa regras de alerta padrão
   */
  initializeDefaultAlertRules() {
    // Regras de performance
    this.alertRules.set('high_latency', {
      name: 'Alta Latência',
      condition: (metric) => metric.value > 1000, // > 1s
      severity: 'warning',
      message: 'Latência alta detectada: {value}ms'
    });

    this.alertRules.set('high_error_rate', {
      name: 'Taxa de Erro Alta',
      condition: (metric) => metric.value > 5, // > 5%
      severity: 'critical',
      message: 'Taxa de erro alta: {value}%'
    });

    this.alertRules.set('low_uptime', {
      name: 'Uptime Baixo',
      condition: (metric) => metric.value < 99, // < 99%
      severity: 'critical',
      message: 'Uptime baixo: {value}%'
    });

    // Regras de negócio
    this.alertRules.set('low_conversion', {
      name: 'Conversão Baixa',
      condition: (metric) => metric.value < 70, // < 70%
      severity: 'warning',
      message: 'Taxa de conversão baixa: {value}%'
    });

    this.alertRules.set('high_bounce_rate', {
      name: 'Taxa de Rejeição Alta',
      condition: (metric) => metric.value > 30, // > 30%
      severity: 'warning',
      message: 'Taxa de rejeição alta: {value}%'
    });
  }

  /**
   * Inicia o monitoramento automático
   */
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
      this.checkAlerts();
      this.cleanupOldData();
    }, 5000); // Coleta métricas a cada 5 segundos

    console.log('[SystemMonitor] Monitoramento iniciado');
  }

  /**
   * Para o monitoramento
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log('[SystemMonitor] Monitoramento parado');
  }

  /**
   * Coleta métricas do sistema
   */
  collectMetrics() {
    const timestamp = Date.now();
    
    // Métricas de performance
    this.collectPerformanceMetrics(timestamp);
    
    // Métricas de negócio
    this.collectBusinessMetrics(timestamp);
    
    // Métricas de sistema
    this.collectSystemMetrics(timestamp);
  }

  /**
   * Coleta métricas de performance
   */
  collectPerformanceMetrics(timestamp) {
    // Latência média
    const avgLatency = this.calculateAverageLatency();
    this.recordMetric('latency', avgLatency, timestamp);

    // Throughput
    const throughput = this.calculateThroughput();
    this.recordMetric('throughput', throughput, timestamp);

    // Taxa de erro
    const errorRate = this.calculateErrorRate();
    this.recordMetric('error_rate', errorRate, timestamp);

    // Uptime
    const uptime = this.calculateUptime();
    this.recordMetric('uptime', uptime, timestamp);
  }

  /**
   * Coleta métricas de negócio
   */
  collectBusinessMetrics(timestamp) {
    // Taxa de conversão
    const conversionRate = this.calculateConversionRate();
    this.recordMetric('conversion_rate', conversionRate, timestamp);

    // Taxa de rejeição
    const bounceRate = this.calculateBounceRate();
    this.recordMetric('bounce_rate', bounceRate, timestamp);

    // Satisfação do cliente
    const satisfaction = this.calculateSatisfaction();
    this.recordMetric('satisfaction', satisfaction, timestamp);

    // Tempo de resposta
    const responseTime = this.calculateResponseTime();
    this.recordMetric('response_time', responseTime, timestamp);
  }

  /**
   * Coleta métricas de sistema
   */
  collectSystemMetrics(timestamp) {
    // Uso de memória
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memUsage = process.memoryUsage();
      this.recordMetric('memory_usage', memUsage.heapUsed / 1024 / 1024, timestamp); // MB
    }

    // CPU (simulado)
    const cpuUsage = Math.random() * 100; // Simulado
    this.recordMetric('cpu_usage', cpuUsage, timestamp);

    // Conexões ativas
    const activeConnections = this.calculateActiveConnections();
    this.recordMetric('active_connections', activeConnections, timestamp);
  }

  /**
   * Registra uma métrica
   */
  recordMetric(name, value, timestamp = Date.now()) {
    const metric = {
      id: uuidv4(),
      name,
      value,
      timestamp,
      tags: {}
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    this.metrics.get(name).push(metric);
    
    // Manter apenas os últimos 1000 registros por métrica
    const metrics = this.metrics.get(name);
    if (metrics.length > 1000) {
      metrics.splice(0, metrics.length - 1000);
    }

    // Emitir evento para componentes interessados
    this.emit('metric', metric);
  }

  /**
   * Verifica alertas baseados nas métricas
   */
  checkAlerts() {
    for (const [ruleName, rule] of this.alertRules) {
      for (const [metricName, metrics] of this.metrics) {
        if (metrics.length === 0) continue;

        const latestMetric = metrics[metrics.length - 1];
        if (rule.condition(latestMetric)) {
          this.triggerAlert(ruleName, rule, latestMetric);
        }
      }
    }
  }

  /**
   * Dispara um alerta
   */
  triggerAlert(ruleName, rule, metric) {
    const alertId = `${ruleName}_${metric.timestamp}`;
    
    if (this.alerts.has(alertId)) return; // Evitar alertas duplicados

    const alert = {
      id: alertId,
      ruleName,
      rule,
      metric,
      timestamp: Date.now(),
      status: 'active',
      acknowledged: false
    };

    this.alerts.set(alertId, alert);
    
    // Emitir evento de alerta
    this.emit('alert', alert);
    
    // Log do alerta
    this.log('alert', `Alerta ${rule.severity}: ${rule.message.replace('{value}', metric.value)}`, {
      ruleName,
      metricName: metric.name,
      value: metric.value,
      severity: rule.severity
    });

    console.warn(`[SystemMonitor] ${rule.severity.toUpperCase()}: ${rule.message.replace('{value}', metric.value)}`);
  }

  /**
   * Registra um log estruturado
   */
  log(level, message, data = {}) {
    const logEntry = {
      id: uuidv4(),
      timestamp: Date.now(),
      level,
      message,
      data,
      source: 'SystemMonitor'
    };

    this.logs.push(logEntry);
    
    // Manter apenas os últimos 5000 logs
    if (this.logs.length > 5000) {
      this.logs.splice(0, this.logs.length - 5000);
    }

    // Emitir evento de log
    this.emit('log', logEntry);
  }

  /**
   * Calcula latência média
   */
  calculateAverageLatency() {
    // Simulado - em produção seria baseado em dados reais
    return Math.random() * 500 + 100; // 100-600ms
  }

  /**
   * Calcula throughput
   */
  calculateThroughput() {
    // Simulado - em produção seria baseado em requests/s
    return Math.random() * 1000 + 500; // 500-1500 req/s
  }

  /**
   * Calcula taxa de erro
   */
  calculateErrorRate() {
    // Simulado - em produção seria baseado em erros reais
    return Math.random() * 2; // 0-2%
  }

  /**
   * Calcula uptime
   */
  calculateUptime() {
    // Simulado - em produção seria baseado em dados reais
    return 99.5 + Math.random() * 0.5; // 99.5-100%
  }

  /**
   * Calcula taxa de conversão
   */
  calculateConversionRate() {
    // Simulado - em produção seria baseado em dados reais
    return 75 + Math.random() * 20; // 75-95%
  }

  /**
   * Calcula taxa de rejeição
   */
  calculateBounceRate() {
    // Simulado - em produção seria baseado em dados reais
    return Math.random() * 20; // 0-20%
  }

  /**
   * Calcula satisfação do cliente
   */
  calculateSatisfaction() {
    // Simulado - em produção seria baseado em feedback real
    return 4 + Math.random(); // 4-5
  }

  /**
   * Calcula tempo de resposta
   */
  calculateResponseTime() {
    // Simulado - em produção seria baseado em dados reais
    return Math.random() * 24 + 1; // 1-25 horas
  }

  /**
   * Calcula conexões ativas
   */
  calculateActiveConnections() {
    // Simulado - em produção seria baseado em dados reais
    return Math.floor(Math.random() * 100) + 50; // 50-150
  }

  /**
   * Limpa dados antigos
   */
  cleanupOldData() {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 horas

    // Limpar métricas antigas
    for (const [name, metrics] of this.metrics) {
      const filtered = metrics.filter(m => m.timestamp > cutoffTime);
      this.metrics.set(name, filtered);
    }

    // Limpar logs antigos
    this.logs = this.logs.filter(log => log.timestamp > cutoffTime);

    // Limpar alertas antigos
    for (const [id, alert] of this.alerts) {
      if (alert.timestamp < cutoffTime) {
        this.alerts.delete(id);
      }
    }
  }

  /**
   * Obtém métricas por nome
   */
  getMetrics(name) {
    return this.metrics.get(name) || [];
  }

  /**
   * Obtém todas as métricas
   */
  getAllMetrics() {
    const result = {};
    for (const [name, metrics] of this.metrics) {
      result[name] = metrics;
    }
    return result;
  }

  /**
   * Obtém alertas ativos
   */
  getActiveAlerts() {
    return Array.from(this.alerts.values()).filter(alert => alert.status === 'active');
  }

  /**
   * Obtém logs por nível
   */
  getLogs(level = null) {
    if (level) {
      return this.logs.filter(log => log.level === level);
    }
    return this.logs;
  }

  /**
   * Obtém resumo das métricas
   */
  getMetricsSummary() {
    const summary = {};
    
    for (const [name, metrics] of this.metrics) {
      if (metrics.length === 0) continue;

      const values = metrics.map(m => m.value);
      summary[name] = {
        current: values[values.length - 1],
        average: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        count: values.length
      };
    }

    return summary;
  }

  /**
   * Adiciona regra de alerta personalizada
   */
  addAlertRule(name, rule) {
    this.alertRules.set(name, rule);
    this.log('info', `Regra de alerta adicionada: ${name}`, { rule });
  }

  /**
   * Remove regra de alerta
   */
  removeAlertRule(name) {
    this.alertRules.delete(name);
    this.log('info', `Regra de alerta removida: ${name}`);
  }

  /**
   * Reconhece um alerta
   */
  acknowledgeAlert(alertId) {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = Date.now();
      this.emit('alert_acknowledged', alert);
    }
  }

  /**
   * Resolve um alerta
   */
  resolveAlert(alertId) {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.status = 'resolved';
      alert.resolvedAt = Date.now();
      this.emit('alert_resolved', alert);
    }
  }
}

// Instância singleton
export const systemMonitor = new SystemMonitor();

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.systemMonitor = systemMonitor;
}

