/**
 * 🔄 Sistema de Sincronização de Dados
 * 
 * Garante que informações fluam automaticamente entre módulos
 */

import { useState, useCallback, useEffect } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { Task, Service, Brief, FinancialKPI, LearningEntry } from '@/api/entities';
import { useTriggerSystem } from './useTriggerSystem';

// Tipos para sincronização
export interface SyncEvent {
  id: string;
  type: 'create' | 'update' | 'delete' | 'status_change';
  entityType: 'Task' | 'Service' | 'Brief' | 'FinancialKPI' | 'LearningEntry';
  entityId: string;
  serviceId: string;
  clientId: string;
  userId: string;
  timestamp: number;
  data: any;
  previousData?: any;
  syncStatus: 'pending' | 'processing' | 'completed' | 'failed';
  retryCount: number;
  lastError?: string;
}

export interface SyncRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  sourceEntity: string;
  targetEntity: string;
  triggerEvents: string[];
  conditions: {
    status?: string[];
    type?: string[];
    customConditions?: any;
  };
  actions: {
    create?: boolean;
    update?: boolean;
    notify?: string[];
    calculate?: string[];
  };
  mapping: {
    [key: string]: string; // sourceField -> targetField
  };
}

export interface SyncResult {
  success: boolean;
  syncId: string;
  actionsExecuted: string[];
  entitiesUpdated: string[];
  errors: string[];
  warnings: string[];
}

// Regras de sincronização padrão
const DEFAULT_SYNC_RULES: SyncRule[] = [
  {
    id: 'briefing_to_service',
    name: 'Briefing → Atualização de Serviço',
    description: 'Atualiza serviço quando briefing é completado',
    enabled: true,
    sourceEntity: 'Brief',
    targetEntity: 'Service',
    triggerEvents: ['update'],
    conditions: {
      status: ['READY'],
      customConditions: { completion_score: 100 }
    },
    actions: {
      update: true,
      notify: ['consultor_lider']
    },
    mapping: {
      'completion_score': 'briefing_completion_score',
      'status': 'briefing_status',
      'updated_date': 'briefing_completed_at'
    }
  },
  {
    id: 'task_to_kpi',
    name: 'Tarefa → Atualização de KPI',
    description: 'Atualiza KPIs quando tarefas específicas são completadas',
    enabled: true,
    sourceEntity: 'Task',
    targetEntity: 'FinancialKPI',
    triggerEvents: ['status_change'],
    conditions: {
      status: ['completed'],
      type: ['financial_analysis', 'deliverable_completion', 'kpi_calculation']
    },
    actions: {
      update: true,
      calculate: ['financial_metrics']
    },
    mapping: {
      'completion_score': 'last_task_completion_score',
      'completed_date': 'last_calculation_date',
      'type': 'calculation_source'
    }
  },
  {
    id: 'kpi_to_learning',
    name: 'KPI → Criação de Aprendizado',
    description: 'Cria aprendizado quando KPIs críticos são atualizados',
    enabled: true,
    sourceEntity: 'FinancialKPI',
    targetEntity: 'LearningEntry',
    triggerEvents: ['update'],
    conditions: {
      customConditions: { 
        thresholdExceeded: true,
        severity: ['high', 'critical']
      }
    },
    actions: {
      create: true,
      notify: ['consultor_lider']
    },
    mapping: {
      'name': 'title',
      'current_value': 'description',
      'alert_thresholds': 'metadata.thresholds'
    }
  },
  {
    id: 'learning_to_template',
    name: 'Aprendizado → Melhoria de Template',
    description: 'Sugere melhorias no template baseado em aprendizados',
    enabled: true,
    sourceEntity: 'LearningEntry',
    targetEntity: 'Service',
    triggerEvents: ['create'],
    conditions: {
      customConditions: { 
        status: 'ready',
        tags: ['template_improvement', 'process_optimization']
      }
    },
    actions: {
      update: true,
      notify: ['admin']
    },
    mapping: {
      'title': 'template_improvements.title',
      'description': 'template_improvements.description',
      'tags': 'template_improvements.tags'
    }
  }
];

class DataSyncManager {
  private rules: SyncRule[] = [...DEFAULT_SYNC_RULES];
  private syncQueue: SyncEvent[] = [];
  private processing = false;
  private processingInterval: NodeJS.Timeout | null = null;

  // Registrar evento de sincronização
  async registerSyncEvent(event: Omit<SyncEvent, 'id' | 'timestamp' | 'syncStatus' | 'retryCount'>): Promise<string> {
    const syncEvent: SyncEvent = {
      ...event,
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      syncStatus: 'pending',
      retryCount: 0
    };

    this.syncQueue.push(syncEvent);
    
    // Processar imediatamente se não estiver processando
    if (!this.processing) {
      this.processSyncEvents();
    }

    return syncEvent.id;
  }

  // Processar eventos de sincronização
  private async processSyncEvents(): Promise<void> {
    if (this.processing || this.syncQueue.length === 0) return;

    this.processing = true;

    while (this.syncQueue.length > 0) {
      const event = this.syncQueue.shift();
      if (!event) continue;

      try {
        await this.processSyncEvent(event);
      } catch (error) {
        console.error('Erro ao processar evento de sincronização:', error);
        await this.handleSyncError(event, error);
      }
    }

    this.processing = false;
  }

  // Processar evento individual
  private async processSyncEvent(event: SyncEvent): Promise<void> {
    event.syncStatus = 'processing';

    const applicableRules = this.rules.filter(rule => 
      rule.enabled && 
      rule.sourceEntity === event.entityType &&
      rule.triggerEvents.includes(event.type) &&
      this.matchesSyncConditions(rule.conditions, event)
    );

    for (const rule of applicableRules) {
      try {
        const result = await this.executeSyncRule(rule, event);
        console.log(`✅ Sincronização executada: ${rule.name}`, result);
      } catch (error) {
        console.error(`❌ Erro ao executar regra de sincronização ${rule.name}:`, error);
        await this.handleRuleError(rule, event, error);
      }
    }

    event.syncStatus = 'completed';
  }

  // Executar regra de sincronização
  private async executeSyncRule(rule: SyncRule, event: SyncEvent): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      syncId: event.id,
      actionsExecuted: [],
      entitiesUpdated: [],
      errors: [],
      warnings: []
    };

    try {
      // Executar ações da regra
      if (rule.actions.create) {
        await this.executeCreateAction(rule, event, result);
      }

      if (rule.actions.update) {
        await this.executeUpdateAction(rule, event, result);
      }

      if (rule.actions.notify) {
        await this.executeNotifyAction(rule, event, result);
      }

      if (rule.actions.calculate) {
        await this.executeCalculateAction(rule, event, result);
      }

    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Erro desconhecido');
    }

    return result;
  }

  // Executar ação de criação
  private async executeCreateAction(rule: SyncRule, event: SyncEvent, result: SyncResult): Promise<void> {
    if (rule.targetEntity === 'LearningEntry') {
      const sourceData = event.data;
      const mappedData = this.mapData(sourceData, rule.mapping);

      const learningData = {
        agencyId: event.data?.agencyId,
        projectId: event.clientId,
        serviceId: event.serviceId,
        sourceType: 'kpi_analysis',
        sourceRef: event.entityId,
        title: mappedData.title || `Insight de ${event.entityType}`,
        description: mappedData.description || `Aprendizado gerado automaticamente de ${event.entityType}`,
        niche: 'automated_learning',
        format: 'system_generated',
        trigger: 'threshold_exceeded',
        promise: 'Ação corretiva necessária',
        rationale: `Sistema detectou anomalia em ${event.entityType}`,
        tags: ['automated', 'system', 'sync'],
        status: 'ready',
        ...mappedData
      };

      const createdLearning = await LearningEntry.create(learningData);
      result.actionsExecuted.push('create');
      result.entitiesUpdated.push(createdLearning.id);
    }
  }

  // Executar ação de atualização
  private async executeUpdateAction(rule: SyncRule, event: SyncEvent, result: SyncResult): Promise<void> {
    const sourceData = event.data;
    const mappedData = this.mapData(sourceData, rule.mapping);

    if (rule.targetEntity === 'Service') {
      await Service.update(event.serviceId, {
        ...mappedData,
        last_sync_date: new Date().toISOString(),
        sync_source: event.entityType,
        sync_event_id: event.id
      });
    } else if (rule.targetEntity === 'FinancialKPI') {
      const kpis = await FinancialKPI.filter({
        serviceId: event.serviceId,
        is_current: true
      });

      for (const kpi of kpis) {
        await FinancialKPI.update(kpi.id, {
          ...mappedData,
          last_calculated_at: new Date().toISOString(),
          calculation_source: 'sync_update',
          calculation_metadata: {
            syncEventId: event.id,
            sourceEntity: event.entityType
          }
        });
      }
    }

    result.actionsExecuted.push('update');
    result.entitiesUpdated.push(event.serviceId);
  }

  // Executar ação de notificação
  private async executeNotifyAction(rule: SyncRule, event: SyncEvent, result: SyncResult): Promise<void> {
    // Em produção, integrar com sistema de notificações
    console.log(`📢 Notificando usuários: ${rule.actions.notify?.join(', ')}`);
    
    result.actionsExecuted.push('notify');
  }

  // Executar ação de cálculo
  private async executeCalculateAction(rule: SyncRule, event: SyncEvent, result: SyncResult): Promise<void> {
    if (rule.actions.calculate?.includes('financial_metrics')) {
      // Recalcular métricas financeiras
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
            taskType: event.data?.type
          }
        });
      }

      result.actionsExecuted.push('calculate');
      result.entitiesUpdated.push(...kpis.map(kpi => kpi.id));
    }
  }

  // Mapear dados entre entidades
  private mapData(sourceData: any, mapping: SyncRule['mapping']): any {
    const mappedData: any = {};

    for (const [sourceField, targetField] of Object.entries(mapping)) {
      const value = this.getNestedValue(sourceData, sourceField);
      if (value !== undefined) {
        this.setNestedValue(mappedData, targetField, value);
      }
    }

    return mappedData;
  }

  // Obter valor aninhado
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  // Definir valor aninhado
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    
    if (lastKey) {
      target[lastKey] = value;
    }
  }

  // Verificar se evento corresponde às condições
  private matchesSyncConditions(conditions: SyncRule['conditions'], event: SyncEvent): boolean {
    if (conditions.status && !conditions.status.includes(event.data?.status)) {
      return false;
    }

    if (conditions.type && !conditions.type.includes(event.data?.type)) {
      return false;
    }

    if (conditions.customConditions) {
      return this.checkCustomSyncConditions(conditions.customConditions, event);
    }

    return true;
  }

  // Verificar condições customizadas
  private checkCustomSyncConditions(customConditions: any, event: SyncEvent): boolean {
    if (customConditions.completion_score) {
      return event.data?.completion_score >= customConditions.completion_score;
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

    return true;
  }

  // Tratar erro de sincronização
  private async handleSyncError(event: SyncEvent, error: any): Promise<void> {
    event.retryCount++;
    
    if (event.retryCount < 3) {
      // Recolocar na fila para retry
      setTimeout(() => {
        this.syncQueue.push(event);
      }, 5000 * event.retryCount);
    } else {
      // Marcar como falha permanente
      event.syncStatus = 'failed';
      event.lastError = error.message;
      console.error(`❌ Sincronização falhou permanentemente: ${event.id}`, error);
    }
  }

  // Tratar erro de regra
  private async handleRuleError(rule: SyncRule, event: SyncEvent, error: any): Promise<void> {
    console.error(`❌ Regra de sincronização ${rule.name} falhou para evento ${event.id}:`, error);
  }

  // Gerenciar regras
  addRule(rule: SyncRule): void {
    this.rules.push(rule);
  }

  updateRule(ruleId: string, updates: Partial<SyncRule>): void {
    const index = this.rules.findIndex(rule => rule.id === ruleId);
    if (index !== -1) {
      this.rules[index] = { ...this.rules[index], ...updates };
    }
  }

  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(rule => rule.id !== ruleId);
  }

  getRules(): SyncRule[] {
    return [...this.rules];
  }

  getSyncQueue(): SyncEvent[] {
    return [...this.syncQueue];
  }

  // Iniciar processamento automático
  startAutoProcessing(intervalMs: number = 3000): void {
    if (this.processingInterval) return;

    this.processingInterval = setInterval(() => {
      this.processSyncEvents();
    }, intervalMs);

    console.log('🔄 Processamento automático de sincronização iniciado');
  }

  // Parar processamento automático
  stopAutoProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    console.log('⏹️ Processamento automático de sincronização parado');
  }
}

// Instância singleton
export const dataSyncManager = new DataSyncManager();

// Hook para usar o sistema de sincronização
export function useDataSync() {
  const { user } = useSession();
  const { registerEvent } = useTriggerSystem();
  const [isProcessing, setIsProcessing] = useState(false);

  // Registrar evento de sincronização
  const registerSyncEvent = useCallback(async (
    type: SyncEvent['type'],
    entityType: SyncEvent['entityType'],
    entityId: string,
    serviceId: string,
    clientId: string,
    data: any,
    previousData?: any
  ): Promise<string> => {
    // Registrar trigger primeiro
    await registerEvent(
      type === 'create' ? 'task_created' : 
      type === 'update' ? 'task_completed' :
      type === 'status_change' ? 'task_completed' : 'task_created',
      entityType,
      entityId,
      serviceId,
      clientId,
      data
    );

    // Registrar sincronização
    return dataSyncManager.registerSyncEvent({
      type,
      entityType,
      entityId,
      serviceId,
      clientId,
      userId: user?.email || 'system',
      data: {
        ...data,
        agencyId: user?.data?.agencyId
      },
      previousData
    });
  }, [user, registerEvent]);

  // Gerenciar regras
  const addRule = useCallback((rule: SyncRule) => {
    dataSyncManager.addRule(rule);
  }, []);

  const updateRule = useCallback((ruleId: string, updates: Partial<SyncRule>) => {
    dataSyncManager.updateRule(ruleId, updates);
  }, []);

  const removeRule = useCallback((ruleId: string) => {
    dataSyncManager.removeRule(ruleId);
  }, []);

  const getRules = useCallback(() => {
    return dataSyncManager.getRules();
  }, []);

  // Controle de processamento
  const startProcessing = useCallback(() => {
    dataSyncManager.startAutoProcessing();
    setIsProcessing(true);
  }, []);

  const stopProcessing = useCallback(() => {
    dataSyncManager.stopAutoProcessing();
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
    registerSyncEvent,
    addRule,
    updateRule,
    removeRule,
    getRules,
    startProcessing,
    stopProcessing,
    
    // Utilitários
    dataSyncManager
  };
}

export default dataSyncManager;

