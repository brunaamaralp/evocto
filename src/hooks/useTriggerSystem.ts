/**
 * 🔗 Sistema de Triggers Automáticos
 * 
 * Centraliza a conectividade entre módulos com triggers automáticos
 */

import { useState, useCallback, useEffect } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { Task, Service, Brief, FinancialKPI, LearningEntry, AuditLog } from '@/api/entities';
import { toast } from 'sonner';

// Tipos para triggers
export interface TriggerEvent {
  id: string;
  type: 'task_completed' | 'briefing_completed' | 'kpi_updated' | 'learning_created' | 'service_activated';
  entityType: 'Task' | 'Brief' | 'FinancialKPI' | 'LearningEntry' | 'Service';
  entityId: string;
  serviceId: string;
  clientId: string;
  userId: string;
  timestamp: number;
  data: any;
  processed: boolean;
  retryCount: number;
  lastError?: string;
}

export interface TriggerRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  sourceEvent: string;
  targetAction: string;
  conditions: {
    entityType?: string;
    serviceId?: string;
    clientId?: string;
    customConditions?: any;
  };
  actions: {
    updateKPIs?: boolean;
    generateTasks?: boolean;
    createLearning?: boolean;
    updateService?: boolean;
    notifyUsers?: string[];
  };
  delay?: number; // ms
  retryPolicy?: {
    maxRetries: number;
    retryDelay: number;
  };
}

export interface TriggerResult {
  success: boolean;
  triggerId: string;
  actionsExecuted: string[];
  errors: string[];
  warnings: string[];
  dataUpdated: any;
}

// Regras de trigger padrão
const DEFAULT_TRIGGER_RULES: TriggerRule[] = [
  {
    id: 'briefing_to_tasks',
    name: 'Briefing → Tarefas Personalizadas',
    description: 'Gera tarefas personalizadas quando briefing é completado',
    enabled: true,
    sourceEvent: 'briefing_completed',
    targetAction: 'generate_tasks',
    conditions: {
      entityType: 'Brief',
      customConditions: { status: 'READY' }
    },
    actions: {
      generateTasks: true,
      updateService: true
    },
    delay: 1000,
    retryPolicy: {
      maxRetries: 3,
      retryDelay: 5000
    }
  },
  {
    id: 'task_to_kpis',
    name: 'Tarefa → Atualização de KPIs',
    description: 'Atualiza KPIs quando tarefas específicas são completadas',
    enabled: true,
    sourceEvent: 'task_completed',
    targetAction: 'update_kpis',
    conditions: {
      entityType: 'Task',
      customConditions: { 
        types: ['financial_analysis', 'deliverable_completion', 'kpi_calculation'] 
      }
    },
    actions: {
      updateKPIs: true
    },
    delay: 2000,
    retryPolicy: {
      maxRetries: 2,
      retryDelay: 3000
    }
  },
  {
    id: 'kpi_to_learning',
    name: 'KPI → Aprendizado Automático',
    description: 'Cria aprendizado quando KPIs críticos são atualizados',
    enabled: true,
    sourceEvent: 'kpi_updated',
    targetAction: 'create_learning',
    conditions: {
      entityType: 'FinancialKPI',
      customConditions: { 
        thresholdExceeded: true,
        severity: ['high', 'critical']
      }
    },
    actions: {
      createLearning: true,
      notifyUsers: ['consultor_lider']
    },
    delay: 3000,
    retryPolicy: {
      maxRetries: 2,
      retryDelay: 5000
    }
  },
  {
    id: 'learning_to_template',
    name: 'Aprendizado → Melhoria de Template',
    description: 'Sugere melhorias no template baseado em aprendizados',
    enabled: true,
    sourceEvent: 'learning_created',
    targetAction: 'improve_template',
    conditions: {
      entityType: 'LearningEntry',
      customConditions: { 
        status: 'ready',
        tags: ['template_improvement', 'process_optimization']
      }
    },
    actions: {
      updateService: true,
      notifyUsers: ['admin']
    },
    delay: 5000,
    retryPolicy: {
      maxRetries: 1,
      retryDelay: 10000
    }
  },
  {
    id: 'service_activation',
    name: 'Ativação de Serviço',
    description: 'Executa ações quando serviço é ativado',
    enabled: true,
    sourceEvent: 'service_activated',
    targetAction: 'post_activation',
    conditions: {
      entityType: 'Service',
      customConditions: { is_active: true }
    },
    actions: {
      generateTasks: true,
      updateKPIs: true,
      notifyUsers: ['consultor_lider', 'cliente']
    },
    delay: 0,
    retryPolicy: {
      maxRetries: 3,
      retryDelay: 2000
    }
  }
];

class TriggerManager {
  private rules: TriggerRule[] = [...DEFAULT_TRIGGER_RULES];
  private eventQueue: TriggerEvent[] = [];
  private processing = false;
  private processingInterval: NodeJS.Timeout | null = null;

  // Registrar evento para processamento
  async registerEvent(event: Omit<TriggerEvent, 'id' | 'timestamp' | 'processed' | 'retryCount'>): Promise<string> {
    const triggerEvent: TriggerEvent = {
      ...event,
      id: `trigger_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      processed: false,
      retryCount: 0
    };

    this.eventQueue.push(triggerEvent);
    
    // Processar imediatamente se não estiver processando
    if (!this.processing) {
      this.processEvents();
    }

    return triggerEvent.id;
  }

  // Processar eventos na fila
  private async processEvents(): Promise<void> {
    if (this.processing || this.eventQueue.length === 0) return;

    this.processing = true;

    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      if (!event) continue;

      try {
        await this.processEvent(event);
      } catch (error) {
        console.error('Erro ao processar evento:', error);
        await this.handleEventError(event, error);
      }
    }

    this.processing = false;
  }

  // Processar evento individual
  private async processEvent(event: TriggerEvent): Promise<void> {
    const applicableRules = this.rules.filter(rule => 
      rule.enabled && 
      rule.sourceEvent === event.type &&
      this.matchesConditions(rule.conditions, event)
    );

    for (const rule of applicableRules) {
      try {
        // Aplicar delay se configurado
        if (rule.delay && rule.delay > 0) {
          await new Promise(resolve => setTimeout(resolve, rule.delay));
        }

        const result = await this.executeRule(rule, event);
        
        // Log do resultado
        await AuditLog.create({
          agencyId: event.data?.agencyId,
          entity_type: 'Trigger',
          entity_id: event.id,
          action: 'TRIGGER_EXECUTED',
          actor_id: event.userId,
          meta_json: {
            ruleId: rule.id,
            ruleName: rule.name,
            eventType: event.type,
            result: result
          }
        });

        console.log(`✅ Trigger executado: ${rule.name}`, result);
      } catch (error) {
        console.error(`❌ Erro ao executar regra ${rule.name}:`, error);
        await this.handleRuleError(rule, event, error);
      }
    }

    // Marcar evento como processado
    event.processed = true;
  }

  // Executar regra específica
  private async executeRule(rule: TriggerRule, event: TriggerEvent): Promise<TriggerResult> {
    const result: TriggerResult = {
      success: true,
      triggerId: event.id,
      actionsExecuted: [],
      errors: [],
      warnings: [],
      dataUpdated: {}
    };

    try {
      // Executar ações da regra
      if (rule.actions.generateTasks) {
        await this.executeGenerateTasks(event, result);
      }

      if (rule.actions.updateKPIs) {
        await this.executeUpdateKPIs(event, result);
      }

      if (rule.actions.createLearning) {
        await this.executeCreateLearning(event, result);
      }

      if (rule.actions.updateService) {
        await this.executeUpdateService(event, result);
      }

      if (rule.actions.notifyUsers) {
        await this.executeNotifyUsers(event, rule.actions.notifyUsers, result);
      }

    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Erro desconhecido');
    }

    return result;
  }

  // Executar geração de tarefas
  private async executeGenerateTasks(event: TriggerEvent, result: TriggerResult): Promise<void> {
    if (event.type === 'briefing_completed') {
      // Importar hook de geração de tarefas
      const { generateTasksFromBriefing } = await import('@/hooks/useTaskGeneration');
      
      // Buscar briefing
      const briefing = await Brief.get(event.entityId);
      if (briefing) {
        const taskResult = await generateTasksFromBriefing(event.serviceId, event.entityId);
        
        if (taskResult.success) {
          result.actionsExecuted.push('generateTasks');
          result.dataUpdated.tasksCreated = taskResult.tasksCreated;
        } else {
          result.errors.push('Falha ao gerar tarefas do briefing');
        }
      }
    }
  }

  // Executar atualização de KPIs
  private async executeUpdateKPIs(event: TriggerEvent, result: TriggerResult): Promise<void> {
    if (event.type === 'task_completed') {
      const task = await Task.get(event.entityId);
      if (task && task.type === 'financial_analysis') {
        // Recalcular KPIs financeiros
        const kpis = await FinancialKPI.filter({
          serviceId: event.serviceId,
          is_current: true
        });

        for (const kpi of kpis) {
          // Simular recálculo (em produção, usar função específica)
          await FinancialKPI.update(kpi.id, {
            last_calculated_at: new Date().toISOString(),
            calculation_source: 'task_completion',
            calculation_metadata: {
              taskId: event.entityId,
              taskType: task.type
            }
          });
        }

        result.actionsExecuted.push('updateKPIs');
        result.dataUpdated.kpisUpdated = kpis.length;
      }
    }
  }

  // Executar criação de aprendizado
  private async executeCreateLearning(event: TriggerEvent, result: TriggerResult): Promise<void> {
    if (event.type === 'kpi_updated') {
      const kpi = await FinancialKPI.get(event.entityId);
      if (kpi && kpi.alert_thresholds) {
        // Verificar se KPI excedeu threshold
        const thresholdExceeded = kpi.current_value > (kpi.alert_thresholds.high || 0);
        
        if (thresholdExceeded) {
          await LearningEntry.create({
            agencyId: event.data?.agencyId,
            projectId: event.clientId,
            sourceType: 'kpi_analysis',
            sourceRef: event.entityId,
            title: `Insight de KPI: ${kpi.name}`,
            description: `KPI ${kpi.name} atingiu valor de ${kpi.current_value}, excedendo threshold de ${kpi.alert_thresholds.high}`,
            niche: 'financial_analysis',
            format: 'kpi_alert',
            trigger: 'threshold_exceeded',
            promise: 'Ação corretiva necessária',
            rationale: `Monitoramento automático detectou anomalia em ${kpi.name}`,
            tags: ['kpi', 'alert', 'automated'],
            status: 'ready'
          });

          result.actionsExecuted.push('createLearning');
          result.dataUpdated.learningCreated = true;
        }
      }
    }
  }

  // Executar atualização de serviço
  private async executeUpdateService(event: TriggerEvent, result: TriggerResult): Promise<void> {
    if (event.type === 'briefing_completed') {
      await Service.update(event.serviceId, {
        briefing_completed: true,
        briefing_completed_at: new Date().toISOString(),
        status: 'ready_for_activation'
      });

      result.actionsExecuted.push('updateService');
      result.dataUpdated.serviceUpdated = true;
    }
  }

  // Executar notificação de usuários
  private async executeNotifyUsers(event: TriggerEvent, userIds: string[], result: TriggerResult): Promise<void> {
    // Em produção, integrar com sistema de notificações
    console.log(`📢 Notificando usuários: ${userIds.join(', ')}`);
    
    result.actionsExecuted.push('notifyUsers');
    result.dataUpdated.usersNotified = userIds;
  }

  // Verificar se evento corresponde às condições
  private matchesConditions(conditions: TriggerRule['conditions'], event: TriggerEvent): boolean {
    if (conditions.entityType && conditions.entityType !== event.entityType) {
      return false;
    }

    if (conditions.serviceId && conditions.serviceId !== event.serviceId) {
      return false;
    }

    if (conditions.clientId && conditions.clientId !== event.clientId) {
      return false;
    }

    // Verificar condições customizadas
    if (conditions.customConditions) {
      return this.checkCustomConditions(conditions.customConditions, event);
    }

    return true;
  }

  // Verificar condições customizadas
  private checkCustomConditions(customConditions: any, event: TriggerEvent): boolean {
    // Implementar lógica específica para cada tipo de condição
    if (customConditions.status) {
      return event.data?.status === customConditions.status;
    }

    if (customConditions.types) {
      return customConditions.types.includes(event.data?.type);
    }

    if (customConditions.thresholdExceeded) {
      return event.data?.thresholdExceeded === true;
    }

    if (customConditions.severity) {
      return customConditions.severity.includes(event.data?.severity);
    }

    if (customConditions.tags) {
      return customConditions.tags.some((tag: string) => 
        event.data?.tags?.includes(tag)
      );
    }

    if (customConditions.is_active !== undefined) {
      return event.data?.is_active === customConditions.is_active;
    }

    return true;
  }

  // Tratar erro de evento
  private async handleEventError(event: TriggerEvent, error: any): Promise<void> {
    event.retryCount++;
    
    if (event.retryCount < 3) {
      // Recolocar na fila para retry
      setTimeout(() => {
        this.eventQueue.push(event);
      }, 5000 * event.retryCount);
    } else {
      // Marcar como falha permanente
      event.lastError = error.message;
      console.error(`❌ Evento falhou permanentemente: ${event.id}`, error);
    }
  }

  // Tratar erro de regra
  private async handleRuleError(rule: TriggerRule, event: TriggerEvent, error: any): Promise<void> {
    console.error(`❌ Regra ${rule.name} falhou para evento ${event.id}:`, error);
    
    // Log do erro
    await AuditLog.create({
      agencyId: event.data?.agencyId,
      entity_type: 'Trigger',
      entity_id: event.id,
      action: 'TRIGGER_ERROR',
      actor_id: event.userId,
      meta_json: {
        ruleId: rule.id,
        ruleName: rule.name,
        error: error.message,
        retryCount: event.retryCount
      }
    });
  }

  // Gerenciar regras
  addRule(rule: TriggerRule): void {
    this.rules.push(rule);
  }

  updateRule(ruleId: string, updates: Partial<TriggerRule>): void {
    const index = this.rules.findIndex(rule => rule.id === ruleId);
    if (index !== -1) {
      this.rules[index] = { ...this.rules[index], ...updates };
    }
  }

  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(rule => rule.id !== ruleId);
  }

  getRules(): TriggerRule[] {
    return [...this.rules];
  }

  getEventQueue(): TriggerEvent[] {
    return [...this.eventQueue];
  }

  // Iniciar processamento automático
  startAutoProcessing(intervalMs: number = 5000): void {
    if (this.processingInterval) return;

    this.processingInterval = setInterval(() => {
      this.processEvents();
    }, intervalMs);

    console.log('🔄 Processamento automático de triggers iniciado');
  }

  // Parar processamento automático
  stopAutoProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    console.log('⏹️ Processamento automático de triggers parado');
  }
}

// Instância singleton
export const triggerManager = new TriggerManager();

// Hook para usar o sistema de triggers
export function useTriggerSystem() {
  const { user } = useSession();
  const [isProcessing, setIsProcessing] = useState(false);

  // Registrar evento
  const registerEvent = useCallback(async (
    type: TriggerEvent['type'],
    entityType: TriggerEvent['entityType'],
    entityId: string,
    serviceId: string,
    clientId: string,
    data: any
  ): Promise<string> => {
    return triggerManager.registerEvent({
      type,
      entityType,
      entityId,
      serviceId,
      clientId,
      userId: user?.email || 'system',
      data: {
        ...data,
        agencyId: user?.data?.agencyId
      }
    });
  }, [user]);

  // Gerenciar regras
  const addRule = useCallback((rule: TriggerRule) => {
    triggerManager.addRule(rule);
  }, []);

  const updateRule = useCallback((ruleId: string, updates: Partial<TriggerRule>) => {
    triggerManager.updateRule(ruleId, updates);
  }, []);

  const removeRule = useCallback((ruleId: string) => {
    triggerManager.removeRule(ruleId);
  }, []);

  const getRules = useCallback(() => {
    return triggerManager.getRules();
  }, []);

  // Controle de processamento
  const startProcessing = useCallback(() => {
    triggerManager.startAutoProcessing();
    setIsProcessing(true);
  }, []);

  const stopProcessing = useCallback(() => {
    triggerManager.stopAutoProcessing();
    setIsProcessing(false);
  }, []);

  // Iniciar processamento automaticamente
  useEffect(() => {
    startProcessing();
    return () => stopProcessing();
  }, [startProcessing, stopProcessing]);

  return {
    // Estado
    isProcessing,
    
    // Ações
    registerEvent,
    addRule,
    updateRule,
    removeRule,
    getRules,
    startProcessing,
    stopProcessing,
    
    // Utilitários
    triggerManager
  };
}

export default triggerManager;
