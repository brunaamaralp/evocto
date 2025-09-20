import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { AgentExecution } from '@/api/entities';
import { Notification } from '@/api/entities';
import { simulateHealthAgent } from '@/api/functions';
import { generateCyclePlan } from '@/api/functions';
import { proposeBriefingUpdates } from '@/api/functions';
import { toast } from 'sonner';

// Configuração dos agentes disponíveis
const AGENTS_CONFIG = {
  health_monitor: {
    name: 'Health Monitor',
    description: 'Monitora saúde dos serviços e detecta riscos',
    function: simulateHealthAgent,
    schedule: { frequency: 'hourly', interval: 1 },
    enabled: true,
    icon: '🏥',
    priority: 'high'
  },
  cycle_planner: {
    name: 'Cycle Planner', 
    description: 'Gera planos de ciclo automaticamente',
    function: generateCyclePlan,
    schedule: { frequency: 'daily', time: '09:00' },
    enabled: true,
    icon: '📋',
    priority: 'medium'
  },
  briefing_evolution: {
    name: 'Briefing Evolution',
    description: 'Propõe atualizações estratégicas no briefing',
    function: proposeBriefingUpdates,
    schedule: { frequency: 'weekly', day: 'monday', time: '10:00' },
    enabled: true,
    icon: '📝',
    priority: 'low'
  },
  smart_recommendations: {
    name: 'Smart Recommendations',
    description: 'Gera recomendações inteligentes baseadas em dados',
    function: null, // Será implementada
    schedule: { frequency: 'daily', time: '08:00' },
    enabled: false,
    icon: '💡',
    priority: 'medium'
  }
};

// Status de execução dos agentes
const EXECUTION_STATUS = {
  idle: { label: 'Inativo', color: 'gray', bgColor: 'bg-gray-100' },
  running: { label: 'Executando', color: 'blue', bgColor: 'bg-blue-100' },
  completed: { label: 'Concluído', color: 'green', bgColor: 'bg-green-100' },
  failed: { label: 'Falhou', color: 'red', bgColor: 'bg-red-100' },
  scheduled: { label: 'Agendado', color: 'yellow', bgColor: 'bg-yellow-100' }
};

// Classe principal do Executor de Agentes
class AgentExecutor {
  constructor() {
    this.runningAgents = new Map();
    this.scheduledJobs = new Map();
    this.executionHistory = [];
    this.listeners = [];
  }

  // Inicializar o sistema
  async initialize(agencyId) {
    this.agencyId = agencyId;
    console.log(`🤖 Inicializando sistema de agentes para agência ${agencyId}`);
    
    // Carregar histórico de execuções
    await this.loadExecutionHistory();
    
    // Configurar agendamentos
    this.setupSchedules();
    
    // Verificar agentes que precisam ser executados
    this.checkPendingExecutions();
    
    return true;
  }

  // Carregar histórico de execuções do banco
  async loadExecutionHistory() {
    try {
      const executions = await AgentExecution.filter(
        { agencyId: this.agencyId },
        '-startedAt',
        50
      );
      this.executionHistory = executions;
    } catch (error) {
      console.error('Erro ao carregar histórico de execuções:', error);
    }
  }

  // Configurar agendamentos baseados na configuração
  setupSchedules() {
    Object.entries(AGENTS_CONFIG).forEach(([agentId, config]) => {
      if (config.enabled && config.schedule) {
        this.scheduleAgent(agentId, config);
      }
    });
  }

  // Agendar um agente específico
  scheduleAgent(agentId, config) {
    const { schedule } = config;
    let intervalMs;

    switch (schedule.frequency) {
      case 'hourly':
        intervalMs = (schedule.interval || 1) * 60 * 60 * 1000;
        break;
      case 'daily':
        intervalMs = 24 * 60 * 60 * 1000;
        break;
      case 'weekly':
        intervalMs = 7 * 24 * 60 * 60 * 1000;
        break;
      default:
        intervalMs = 60 * 60 * 1000; // Default: 1 hora
    }

    // Cancelar agendamento anterior se existir
    if (this.scheduledJobs.has(agentId)) {
      clearInterval(this.scheduledJobs.get(agentId));
    }

    // Criar novo agendamento
    const jobId = setInterval(() => {
      this.executeAgent(agentId);
    }, intervalMs);

    this.scheduledJobs.set(agentId, jobId);
    
    console.log(`📅 Agente ${agentId} agendado para executar a cada ${intervalMs}ms`);
  }

  // Executar um agente específico
  async executeAgent(agentId, parameters = {}) {
    const config = AGENTS_CONFIG[agentId];
    if (!config) {
      console.error(`Agente ${agentId} não encontrado`);
      return null;
    }

    if (this.runningAgents.has(agentId)) {
      console.warn(`Agente ${agentId} já está em execução`);
      return null;
    }

    const executionId = `${agentId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = new Date();

    // Marcar como executando
    this.runningAgents.set(agentId, {
      executionId,
      startTime,
      status: 'running'
    });

    // Notificar listeners
    this.notifyListeners('agent_started', { agentId, executionId });

    try {
      console.log(`🚀 Executando agente ${config.name} (${executionId})`);

      let result;
      
      // Executar função específica do agente
      if (config.function) {
        result = await config.function(parameters);
      } else {
        // Agente sem implementação
        result = {
          success: false,
          error: 'Agente não implementado'
        };
      }

      const endTime = new Date();
      const duration = endTime - startTime;

      // Registrar execução no banco
      await this.recordExecution(agentId, executionId, startTime, endTime, duration, result);

      // Processar resultado
      await this.processAgentResult(agentId, result);

      // Remover da lista de execução
      this.runningAgents.delete(agentId);

      // Notificar listeners
      this.notifyListeners('agent_completed', { 
        agentId, 
        executionId, 
        result, 
        duration 
      });

      console.log(`✅ Agente ${config.name} concluído em ${duration}ms`);
      return result;

    } catch (error) {
      console.error(`❌ Erro na execução do agente ${config.name}:`, error);
      
      const endTime = new Date();
      const duration = endTime - startTime;

      // Registrar falha no banco
      await this.recordExecution(agentId, executionId, startTime, endTime, duration, {
        success: false,
        error: error.message
      });

      // Remover da lista de execução
      this.runningAgents.delete(agentId);

      // Notificar listeners
      this.notifyListeners('agent_failed', { 
        agentId, 
        executionId, 
        error: error.message 
      });

      return { success: false, error: error.message };
    }
  }

  // Registrar execução no banco de dados
  async recordExecution(agentId, executionId, startTime, endTime, duration, result) {
    try {
      const execution = await AgentExecution.create({
        agencyId: this.agencyId,
        agentName: agentId,
        executionId,
        status: result.success ? 'completed' : 'failed',
        startedAt: startTime.toISOString(),
        completedAt: endTime.toISOString(),
        duration,
        actions_taken: result.actions_taken || [],
        risks_detected: result.risks || [],
        summary: result.summary || {},
        error: result.success ? null : { 
          message: result.error || 'Unknown error',
          code: 'EXECUTION_ERROR'
        }
      });

      // Adicionar ao histórico local
      this.executionHistory.unshift(execution);
      
      // Manter apenas os últimos 100 registros
      if (this.executionHistory.length > 100) {
        this.executionHistory = this.executionHistory.slice(0, 100);
      }

    } catch (error) {
      console.error('Erro ao registrar execução:', error);
    }
  }

  // Processar resultado do agente (criar notificações, etc.)
  async processAgentResult(agentId, result) {
    if (!result.success) return;

    const config = AGENTS_CONFIG[agentId];

    // Criar notificações para riscos detectados
    if (result.risks && result.risks.length > 0) {
      for (const risk of result.risks) {
        await this.createRiskNotification(risk, config);
      }
    }

    // Processar outras ações específicas por tipo de agente
    switch (agentId) {
      case 'health_monitor':
        await this.processHealthMonitorResult(result);
        break;
      case 'cycle_planner':
        await this.processCyclePlannerResult(result);
        break;
      case 'briefing_evolution':
        await this.processBriefingEvolutionResult(result);
        break;
    }
  }

  // Criar notificação de risco
  async createRiskNotification(risk, agentConfig) {
    try {
      await Notification.create({
        agencyId: this.agencyId,
        userId: 'system', // Será ajustado baseado no contexto
        type: 'health_alert',
        subject: {
          type: risk.entity?.type || 'system',
          id: risk.entity?.id || 'unknown'
        },
        title: risk.title,
        context: risk.description,
        href: `/dashboard?risk=${risk.id}`,
        severity: risk.severity === 'critical' ? 'critical' : 'warn',
        metadata: {
          agentId: agentConfig.name,
          riskType: risk.type,
          suggestedActions: risk.suggested_actions || []
        }
      });
    } catch (error) {
      console.error('Erro ao criar notificação de risco:', error);
    }
  }

  // Processar resultado do Health Monitor
  async processHealthMonitorResult(result) {
    // Implementar lógica específica para health monitor
    console.log('📊 Processando resultado do Health Monitor:', result);
  }

  // Processar resultado do Cycle Planner
  async processCyclePlannerResult(result) {
    // Implementar lógica específica para cycle planner
    console.log('📋 Processando resultado do Cycle Planner:', result);
  }

  // Processar resultado do Briefing Evolution
  async processBriefingEvolutionResult(result) {
    // Implementar lógica específica para briefing evolution
    console.log('📝 Processando resultado do Briefing Evolution:', result);
  }

  // Verificar execuções pendentes
  checkPendingExecutions() {
    console.log('🔍 Verificando execuções pendentes...');
    
    // Implementar lógica para verificar se algum agente deveria ter executado
    // baseado no schedule e última execução
  }

  // Adicionar listener para eventos
  addListener(callback) {
    this.listeners.push(callback);
  }

  // Remover listener
  removeListener(callback) {
    this.listeners = this.listeners.filter(l => l !== callback);
  }

  // Notificar todos os listeners
  notifyListeners(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Erro ao notificar listener:', error);
      }
    });
  }

  // Obter status atual dos agentes
  getAgentsStatus() {
    const status = {};
    
    Object.entries(AGENTS_CONFIG).forEach(([agentId, config]) => {
      const isRunning = this.runningAgents.has(agentId);
      const lastExecution = this.executionHistory.find(e => e.agentName === agentId);
      
      status[agentId] = {
        ...config,
        isRunning,
        lastExecution: lastExecution ? {
          id: lastExecution.executionId,
          startedAt: lastExecution.startedAt,
          status: lastExecution.status,
          duration: lastExecution.duration
        } : null,
        nextExecution: this.getNextExecutionTime(agentId, config)
      };
    });
    
    return status;
  }

  // Calcular próxima execução
  getNextExecutionTime(agentId, config) {
    // Implementar cálculo baseado no schedule
    return new Date(Date.now() + 60 * 60 * 1000); // 1 hora para exemplo
  }

  // Parar todos os agentes
  shutdown() {
    console.log('🛑 Parando sistema de agentes...');
    
    // Cancelar todos os agendamentos
    this.scheduledJobs.forEach((jobId, agentId) => {
      clearInterval(jobId);
      console.log(`📅 Agendamento cancelado para ${agentId}`);
    });
    
    this.scheduledJobs.clear();
    this.runningAgents.clear();
    this.listeners = [];
    
    console.log('✅ Sistema de agentes parado');
  }
}

// Instância global do executor
let globalAgentExecutor = null;

// Hook para usar o sistema de agentes
export const useAgentExecutor = () => {
  const { agencyId } = useSession();
  const [agentExecutor, setAgentExecutor] = useState(globalAgentExecutor);
  const [agentsStatus, setAgentsStatus] = useState({});
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!agencyId) return;

    const initializeExecutor = async () => {
      if (!globalAgentExecutor) {
        globalAgentExecutor = new AgentExecutor();
        await globalAgentExecutor.initialize(agencyId);
        
        // Adicionar listener para atualizar status
        globalAgentExecutor.addListener((event, data) => {
          setAgentsStatus(globalAgentExecutor.getAgentsStatus());
          
          // Mostrar toast para eventos importantes
          switch (event) {
            case 'agent_completed':
              if (data.result.risks && data.result.risks.length > 0) {
                toast.warning(`Agente detectou ${data.result.risks.length} risco(s)`);
              }
              break;
            case 'agent_failed':
              toast.error(`Agente falhou: ${data.error}`);
              break;
          }
        });
      }
      
      setAgentExecutor(globalAgentExecutor);
      setAgentsStatus(globalAgentExecutor.getAgentsStatus());
      setIsInitialized(true);
    };

    initializeExecutor();

    // Cleanup
    return () => {
      if (globalAgentExecutor) {
        globalAgentExecutor.shutdown();
        globalAgentExecutor = null;
      }
    };
  }, [agencyId]);

  // Executar agente manualmente
  const executeAgent = async (agentId, parameters = {}) => {
    if (!agentExecutor) return null;
    return await agentExecutor.executeAgent(agentId, parameters);
  };

  // Obter histórico de execuções
  const getExecutionHistory = () => {
    return agentExecutor ? agentExecutor.executionHistory : [];
  };

  return {
    agentExecutor,
    agentsStatus,
    isInitialized,
    executeAgent,
    getExecutionHistory,
    AGENTS_CONFIG,
    EXECUTION_STATUS
  };
};

export default AgentExecutor;