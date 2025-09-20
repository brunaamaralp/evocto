/**
 * 🌐 API de Logging de Erros
 * 
 * Endpoints para receber, armazenar e consultar logs de erro
 */

import { serverLogger, LogEntry, LogFilter, LogStats } from '@/utils/serverLogger';

// Simulação de banco de dados para logs (em produção, usar MongoDB/PostgreSQL)
class LogDatabase {
  private logs: LogEntry[] = [];
  private indexes: Map<string, Set<string>> = new Map();

  async save(log: LogEntry): Promise<void> {
    this.logs.push(log);
    this.updateIndexes(log);
    
    // Em produção, salvar no banco de dados real
    console.log(`[LOG_DB] Salvando log: ${log.id} - ${log.level}:${log.category}`);
  }

  async find(filter: LogFilter): Promise<LogEntry[]> {
    let results = [...this.logs];

    // Aplicar filtros
    if (filter.level && filter.level.length > 0) {
      results = results.filter(log => filter.level!.includes(log.level));
    }

    if (filter.category && filter.category.length > 0) {
      results = results.filter(log => filter.category!.includes(log.category));
    }

    if (filter.severity && filter.severity.length > 0) {
      results = results.filter(log => filter.severity!.includes(log.severity));
    }

    if (filter.userId) {
      results = results.filter(log => log.context.userId === filter.userId);
    }

    if (filter.agencyId) {
      results = results.filter(log => log.context.agencyId === filter.agencyId);
    }

    if (filter.startDate) {
      const startTime = new Date(filter.startDate).getTime();
      results = results.filter(log => log.timestamp >= startTime);
    }

    if (filter.endDate) {
      const endTime = new Date(filter.endDate).getTime();
      results = results.filter(log => log.timestamp <= endTime);
    }

    // Ordenar por timestamp (mais recente primeiro)
    results.sort((a, b) => b.timestamp - a.timestamp);

    // Aplicar paginação
    if (filter.offset) {
      results = results.slice(filter.offset);
    }

    if (filter.limit) {
      results = results.slice(0, filter.limit);
    }

    return results;
  }

  async getStats(): Promise<LogStats> {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    const oneDayAgo = now - (24 * 60 * 60 * 1000);

    const stats: LogStats = {
      total: this.logs.length,
      byLevel: {},
      byCategory: {},
      bySeverity: {},
      recent: this.logs.filter(log => log.timestamp >= oneHourAgo).length,
      critical: this.logs.filter(log => log.severity === 'critical').length,
      trends: {
        hourly: {},
        daily: {}
      }
    };

    // Contar por nível
    this.logs.forEach(log => {
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
      stats.byCategory[log.category] = (stats.byCategory[log.category] || 0) + 1;
      stats.bySeverity[log.severity] = (stats.bySeverity[log.severity] || 0) + 1;
    });

    // Calcular tendências
    this.logs.forEach(log => {
      const hour = new Date(log.timestamp).toISOString().slice(0, 13);
      const day = new Date(log.timestamp).toISOString().slice(0, 10);
      
      stats.trends.hourly[hour] = (stats.trends.hourly[hour] || 0) + 1;
      stats.trends.daily[day] = (stats.trends.daily[day] || 0) + 1;
    });

    return stats;
  }

  async getCriticalLogs(limit: number = 10): Promise<LogEntry[]> {
    return this.logs
      .filter(log => log.severity === 'critical')
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  async getRecentErrors(hours: number = 24, limit: number = 50): Promise<LogEntry[]> {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return this.logs
      .filter(log => log.timestamp >= cutoff && (log.level === 'error' || log.level === 'critical'))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  private updateIndexes(log: LogEntry): void {
    // Indexar por nível
    const levelKey = `level:${log.level}`;
    if (!this.indexes.has(levelKey)) {
      this.indexes.set(levelKey, new Set());
    }
    this.indexes.get(levelKey)!.add(log.id);

    // Indexar por categoria
    const categoryKey = `category:${log.category}`;
    if (!this.indexes.has(categoryKey)) {
      this.indexes.set(categoryKey, new Set());
    }
    this.indexes.get(categoryKey)!.add(log.id);

    // Indexar por severidade
    const severityKey = `severity:${log.severity}`;
    if (!this.indexes.has(severityKey)) {
      this.indexes.set(severityKey, new Set());
    }
    this.indexes.get(severityKey)!.add(log.id);

    // Indexar por usuário
    if (log.context.userId) {
      const userKey = `user:${log.context.userId}`;
      if (!this.indexes.has(userKey)) {
        this.indexes.set(userKey, new Set());
      }
      this.indexes.get(userKey)!.add(log.id);
    }

    // Indexar por agência
    if (log.context.agencyId) {
      const agencyKey = `agency:${log.context.agencyId}`;
      if (!this.indexes.has(agencyKey)) {
        this.indexes.set(agencyKey, new Set());
      }
      this.indexes.get(agencyKey)!.add(log.id);
    }
  }
}

const logDatabase = new LogDatabase();

// Endpoints da API
export const loggingAPI = {
  // POST /api/logs - Receber novo log
  async createLog(logData: LogEntry): Promise<{ success: boolean; id: string; error?: string }> {
    try {
      // Validar dados do log
      if (!logData.id || !logData.level || !logData.message) {
        return {
          success: false,
          id: '',
          error: 'Dados do log inválidos'
        };
      }

      // Adicionar timestamp se não fornecido
      if (!logData.timestamp) {
        logData.timestamp = Date.now();
      }

      // Salvar no banco de dados
      await logDatabase.save(logData);

      // Verificar se é erro crítico para alertas
      if (logData.severity === 'critical') {
        await sendCriticalAlert(logData);
      }

      return {
        success: true,
        id: logData.id
      };
    } catch (error) {
      console.error('Erro ao salvar log:', error);
      return {
        success: false,
        id: '',
        error: 'Erro interno do servidor'
      };
    }
  },

  // GET /api/logs - Buscar logs
  async getLogs(filter: LogFilter = {}): Promise<{ success: boolean; logs: LogEntry[]; error?: string }> {
    try {
      const logs = await logDatabase.find(filter);
      return {
        success: true,
        logs
      };
    } catch (error) {
      console.error('Erro ao buscar logs:', error);
      return {
        success: false,
        logs: [],
        error: 'Erro interno do servidor'
      };
    }
  },

  // GET /api/logs/stats - Obter estatísticas
  async getStats(): Promise<{ success: boolean; stats: LogStats; error?: string }> {
    try {
      const stats = await logDatabase.getStats();
      return {
        success: true,
        stats
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      return {
        success: false,
        stats: {
          total: 0,
          byLevel: {},
          byCategory: {},
          bySeverity: {},
          recent: 0,
          critical: 0,
          trends: { hourly: {}, daily: {} }
        },
        error: 'Erro interno do servidor'
      };
    }
  },

  // GET /api/logs/critical - Obter logs críticos
  async getCriticalLogs(limit: number = 10): Promise<{ success: boolean; logs: LogEntry[]; error?: string }> {
    try {
      const logs = await logDatabase.getCriticalLogs(limit);
      return {
        success: true,
        logs
      };
    } catch (error) {
      console.error('Erro ao buscar logs críticos:', error);
      return {
        success: false,
        logs: [],
        error: 'Erro interno do servidor'
      };
    }
  },

  // GET /api/logs/recent-errors - Obter erros recentes
  async getRecentErrors(hours: number = 24, limit: number = 50): Promise<{ success: boolean; logs: LogEntry[]; error?: string }> {
    try {
      const logs = await logDatabase.getRecentErrors(hours, limit);
      return {
        success: true,
        logs
      };
    } catch (error) {
      console.error('Erro ao buscar erros recentes:', error);
      return {
        success: false,
        logs: [],
        error: 'Erro interno do servidor'
      };
    }
  }
};

// Sistema de alertas para erros críticos
async function sendCriticalAlert(log: LogEntry): Promise<void> {
  try {
    // Em produção, integrar com serviços de alerta (Slack, Discord, Email, etc.)
    console.error(`🚨 ALERTA CRÍTICO: ${log.message}`, {
      id: log.id,
      timestamp: new Date(log.timestamp).toISOString(),
      context: log.context,
      error: log.error
    });

    // Exemplo de integração com Slack (descomente em produção)
    /*
    const slackWebhook = process.env.SLACK_WEBHOOK_URL;
    if (slackWebhook) {
      await fetch(slackWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 Erro Crítico Detectado`,
          attachments: [{
            color: 'danger',
            fields: [
              { title: 'Mensagem', value: log.message, short: false },
              { title: 'Categoria', value: log.category, short: true },
              { title: 'Usuário', value: log.context.userId || 'N/A', short: true },
              { title: 'Agência', value: log.context.agencyId || 'N/A', short: true },
              { title: 'Timestamp', value: new Date(log.timestamp).toISOString(), short: true }
            ]
          }]
        })
      });
    }
    */
  } catch (error) {
    console.error('Erro ao enviar alerta crítico:', error);
  }
}

// Middleware para interceptar requisições e logs automáticos
export function loggingMiddleware(req: any, res: any, next: any) {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Adicionar requestId ao contexto
  req.requestId = requestId;

  // Interceptar resposta para logar erros
  const originalSend = res.send;
  res.send = function(data: any) {
    const duration = Date.now() - startTime;
    
    // Log de requisições com erro
    if (res.statusCode >= 400) {
      serverLogger.error(
        `HTTP ${res.statusCode}: ${req.method} ${req.path}`,
        new Error(`HTTP Error ${res.statusCode}`),
        {
          category: 'server',
          severity: res.statusCode >= 500 ? 'high' : 'medium',
          action: 'http_request',
          requestId,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          userAgent: req.headers['user-agent'],
          ip: req.ip || req.connection.remoteAddress
        },
        {
          duration,
          requestBody: req.body,
          responseBody: data
        }
      );
    }

    originalSend.call(this, data);
  };

  next();
}

export default loggingAPI;

