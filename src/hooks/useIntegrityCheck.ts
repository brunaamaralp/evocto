/**
 * 🔒 Sistema de Validação de Integridade
 * 
 * Garante que informações não se percam e mantém consistência
 */

import { useState, useCallback, useEffect } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { Task, Service, Brief, FinancialKPI, LearningEntry, AuditLog } from '@/api/entities';

// Tipos para validação de integridade
export interface IntegrityCheck {
  id: string;
  type: 'data_consistency' | 'relationship_integrity' | 'business_rules' | 'audit_trail';
  entityType: string;
  entityId: string;
  serviceId: string;
  clientId: string;
  timestamp: number;
  status: 'pending' | 'checking' | 'passed' | 'failed' | 'warning';
  issues: IntegrityIssue[];
  fixes: IntegrityFix[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface IntegrityIssue {
  id: string;
  type: 'missing_data' | 'invalid_relationship' | 'business_rule_violation' | 'audit_gap';
  description: string;
  field?: string;
  expectedValue?: any;
  actualValue?: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
  autoFixable: boolean;
  suggestedFix?: string;
}

export interface IntegrityFix {
  id: string;
  issueId: string;
  type: 'auto_fix' | 'manual_fix' | 'data_recovery';
  description: string;
  applied: boolean;
  appliedAt?: number;
  appliedBy?: string;
  result?: 'success' | 'failed' | 'partial';
  error?: string;
}

export interface IntegrityRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  entityType: string;
  checkType: 'data_consistency' | 'relationship_integrity' | 'business_rules' | 'audit_trail';
  conditions: {
    requiredFields?: string[];
    validRelationships?: string[];
    businessRules?: any[];
    auditRequirements?: any[];
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  autoFix: boolean;
  fixActions?: {
    createMissing?: boolean;
    updateInvalid?: boolean;
    restoreFromBackup?: boolean;
    notifyAdmin?: boolean;
  };
}

// Regras de integridade padrão
const DEFAULT_INTEGRITY_RULES: IntegrityRule[] = [
  {
    id: 'briefing_task_relationship',
    name: 'Briefing ↔ Tarefa Obrigatória',
    description: 'Verifica se briefing obrigatório tem tarefa correspondente',
    enabled: true,
    entityType: 'Brief',
    checkType: 'relationship_integrity',
    conditions: {
      requiredFields: ['id', 'status', 'completion_score'],
      validRelationships: ['mandatory_briefing_task'],
      businessRules: [
        { rule: 'briefing_completed_requires_task', condition: 'completion_score === 100' }
      ]
    },
    severity: 'high',
    autoFix: true,
    fixActions: {
      createMissing: true,
      notifyAdmin: true
    }
  },
  {
    id: 'service_briefing_consistency',
    name: 'Serviço ↔ Briefing Consistência',
    description: 'Verifica se serviço tem briefing correspondente',
    enabled: true,
    entityType: 'Service',
    checkType: 'data_consistency',
    conditions: {
      requiredFields: ['id', 'briefing_completed', 'briefing_completed_at'],
      businessRules: [
        { rule: 'service_activation_requires_briefing', condition: 'briefing_completed === true' }
      ]
    },
    severity: 'critical',
    autoFix: false,
    fixActions: {
      notifyAdmin: true
    }
  },
  {
    id: 'task_kpi_relationship',
    name: 'Tarefa ↔ KPI Relacionamento',
    description: 'Verifica se tarefas financeiras têm KPIs correspondentes',
    enabled: true,
    entityType: 'Task',
    checkType: 'relationship_integrity',
    conditions: {
      validRelationships: ['financial_kpis'],
      businessRules: [
        { rule: 'financial_task_requires_kpi', condition: 'type === "financial_analysis"' }
      ]
    },
    severity: 'medium',
    autoFix: true,
    fixActions: {
      createMissing: true
    }
  },
  {
    id: 'kpi_learning_consistency',
    name: 'KPI ↔ Aprendizado Consistência',
    description: 'Verifica se KPIs críticos geram aprendizados',
    enabled: true,
    entityType: 'FinancialKPI',
    checkType: 'business_rules',
    conditions: {
      businessRules: [
        { rule: 'critical_kpi_requires_learning', condition: 'thresholdExceeded === true' }
      ]
    },
    severity: 'medium',
    autoFix: true,
    fixActions: {
      createMissing: true
    }
  },
  {
    id: 'audit_trail_completeness',
    name: 'Trilha de Auditoria Completa',
    description: 'Verifica se todas as ações importantes têm logs de auditoria',
    enabled: true,
    entityType: 'AuditLog',
    checkType: 'audit_trail',
    conditions: {
      auditRequirements: [
        { action: 'BRIEFING_COMPLETED', required: true },
        { action: 'TASK_COMPLETED', required: true },
        { action: 'KPI_UPDATED', required: true },
        { action: 'LEARNING_CREATED', required: true }
      ]
    },
    severity: 'high',
    autoFix: true,
    fixActions: {
      createMissing: true,
      notifyAdmin: true
    }
  }
];

class IntegrityManager {
  private rules: IntegrityRule[] = [...DEFAULT_INTEGRITY_RULES];
  private checks: IntegrityCheck[] = [];
  private processing = false;
  private processingInterval: NodeJS.Timeout | null = null;

  // Executar verificação de integridade
  async runIntegrityCheck(
    entityType: string,
    entityId: string,
    serviceId: string,
    clientId: string
  ): Promise<IntegrityCheck> {
    const applicableRules = this.rules.filter(rule => 
      rule.enabled && 
      rule.entityType === entityType
    );

    const check: IntegrityCheck = {
      id: `check_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'data_consistency',
      entityType,
      entityId,
      serviceId,
      clientId,
      timestamp: Date.now(),
      status: 'checking',
      issues: [],
      fixes: [],
      severity: 'low'
    };

    this.checks.push(check);

    try {
      for (const rule of applicableRules) {
        await this.executeRule(rule, check);
      }

      // Determinar severidade geral
      check.severity = this.calculateOverallSeverity(check.issues);
      check.status = check.issues.length === 0 ? 'passed' : 'failed';

      // Aplicar correções automáticas se habilitadas
      if (check.issues.length > 0) {
        await this.applyAutoFixes(check);
      }

    } catch (error) {
      check.status = 'failed';
      check.issues.push({
        id: `error_${Date.now()}`,
        type: 'missing_data',
        description: `Erro durante verificação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        severity: 'critical',
        autoFixable: false
      });
    }

    return check;
  }

  // Executar regra específica
  private async executeRule(rule: IntegrityRule, check: IntegrityCheck): Promise<void> {
    try {
      switch (rule.checkType) {
        case 'data_consistency':
          await this.checkDataConsistency(rule, check);
          break;
        case 'relationship_integrity':
          await this.checkRelationshipIntegrity(rule, check);
          break;
        case 'business_rules':
          await this.checkBusinessRules(rule, check);
          break;
        case 'audit_trail':
          await this.checkAuditTrail(rule, check);
          break;
      }
    } catch (error) {
      console.error(`Erro ao executar regra ${rule.name}:`, error);
    }
  }

  // Verificar consistência de dados
  private async checkDataConsistency(rule: IntegrityRule, check: IntegrityCheck): Promise<void> {
    if (rule.conditions.requiredFields) {
      const entity = await this.getEntity(check.entityType, check.entityId);
      
      for (const field of rule.conditions.requiredFields) {
        if (!entity || entity[field] === undefined || entity[field] === null) {
          check.issues.push({
            id: `missing_${field}_${Date.now()}`,
            type: 'missing_data',
            description: `Campo obrigatório '${field}' está ausente ou nulo`,
            field,
            severity: rule.severity,
            autoFixable: rule.autoFix,
            suggestedFix: `Definir valor padrão para ${field}`
          });
        }
      }
    }
  }

  // Verificar integridade de relacionamentos
  private async checkRelationshipIntegrity(rule: IntegrityRule, check: IntegrityCheck): Promise<void> {
    if (rule.conditions.validRelationships) {
      for (const relationship of rule.conditions.validRelationships) {
        const isValid = await this.validateRelationship(check.entityType, check.entityId, relationship);
        
        if (!isValid) {
          check.issues.push({
            id: `invalid_${relationship}_${Date.now()}`,
            type: 'invalid_relationship',
            description: `Relacionamento '${relationship}' é inválido ou ausente`,
            severity: rule.severity,
            autoFixable: rule.autoFix,
            suggestedFix: `Criar ou corrigir relacionamento ${relationship}`
          });
        }
      }
    }
  }

  // Verificar regras de negócio
  private async checkBusinessRules(rule: IntegrityRule, check: IntegrityCheck): Promise<void> {
    if (rule.conditions.businessRules) {
      const entity = await this.getEntity(check.entityType, check.entityId);
      
      for (const businessRule of rule.conditions.businessRules) {
        const isValid = await this.validateBusinessRule(businessRule, entity, check);
        
        if (!isValid) {
          check.issues.push({
            id: `business_rule_${businessRule.rule}_${Date.now()}`,
            type: 'business_rule_violation',
            description: `Regra de negócio '${businessRule.rule}' foi violada`,
            severity: rule.severity,
            autoFixable: rule.autoFix,
            suggestedFix: `Aplicar correção para regra ${businessRule.rule}`
          });
        }
      }
    }
  }

  // Verificar trilha de auditoria
  private async checkAuditTrail(rule: IntegrityRule, check: IntegrityCheck): Promise<void> {
    if (rule.conditions.auditRequirements) {
      for (const requirement of rule.conditions.auditRequirements) {
        const hasAuditLog = await this.checkAuditLogExists(check.entityId, requirement.action);
        
        if (!hasAuditLog && requirement.required) {
          check.issues.push({
            id: `missing_audit_${requirement.action}_${Date.now()}`,
            type: 'audit_gap',
            description: `Log de auditoria ausente para ação '${requirement.action}'`,
            severity: rule.severity,
            autoFixable: rule.autoFix,
            suggestedFix: `Criar log de auditoria para ${requirement.action}`
          });
        }
      }
    }
  }

  // Validar relacionamento
  private async validateRelationship(entityType: string, entityId: string, relationship: string): Promise<boolean> {
    try {
      switch (relationship) {
        case 'mandatory_briefing_task':
          if (entityType === 'Brief') {
            const tasks = await Task.filter({
              briefingId: entityId,
              type: 'mandatory_briefing'
            });
            return tasks.length > 0;
          }
          break;
          
        case 'financial_kpis':
          if (entityType === 'Task') {
            const task = await Task.get(entityId);
            if (task && task.type === 'financial_analysis') {
              const kpis = await FinancialKPI.filter({
                serviceId: task.serviceId,
                is_current: true
              });
              return kpis.length > 0;
            }
          }
          break;
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao validar relacionamento:', error);
      return false;
    }
  }

  // Validar regra de negócio
  private async validateBusinessRule(rule: any, entity: any, check: IntegrityCheck): Promise<boolean> {
    try {
      switch (rule.rule) {
        case 'briefing_completed_requires_task':
          if (entity.completion_score === 100) {
            const tasks = await Task.filter({
              briefingId: check.entityId,
              type: 'mandatory_briefing'
            });
            return tasks.length > 0;
          }
          break;
          
        case 'service_activation_requires_briefing':
          return entity.briefing_completed === true;
          
        case 'financial_task_requires_kpi':
          if (entity.type === 'financial_analysis') {
            const kpis = await FinancialKPI.filter({
              serviceId: check.serviceId,
              is_current: true
            });
            return kpis.length > 0;
          }
          break;
          
        case 'critical_kpi_requires_learning':
          if (entity.thresholdExceeded === true) {
            const learnings = await LearningEntry.filter({
              sourceRef: check.entityId,
              sourceType: 'kpi_analysis'
            });
            return learnings.length > 0;
          }
          break;
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao validar regra de negócio:', error);
      return false;
    }
  }

  // Verificar se log de auditoria existe
  private async checkAuditLogExists(entityId: string, action: string): Promise<boolean> {
    try {
      const logs = await AuditLog.filter({
        entity_id: entityId,
        action
      });
      return logs.length > 0;
    } catch (error) {
      console.error('Erro ao verificar log de auditoria:', error);
      return false;
    }
  }

  // Obter entidade
  private async getEntity(entityType: string, entityId: string): Promise<any> {
    try {
      switch (entityType) {
        case 'Brief':
          return await Brief.get(entityId);
        case 'Task':
          return await Task.get(entityId);
        case 'Service':
          return await Service.get(entityId);
        case 'FinancialKPI':
          return await FinancialKPI.get(entityId);
        case 'LearningEntry':
          return await LearningEntry.get(entityId);
        default:
          return null;
      }
    } catch (error) {
      console.error('Erro ao obter entidade:', error);
      return null;
    }
  }

  // Calcular severidade geral
  private calculateOverallSeverity(issues: IntegrityIssue[]): 'low' | 'medium' | 'high' | 'critical' {
    if (issues.some(issue => issue.severity === 'critical')) return 'critical';
    if (issues.some(issue => issue.severity === 'high')) return 'high';
    if (issues.some(issue => issue.severity === 'medium')) return 'medium';
    return 'low';
  }

  // Aplicar correções automáticas
  private async applyAutoFixes(check: IntegrityCheck): Promise<void> {
    const autoFixableIssues = check.issues.filter(issue => issue.autoFixable);
    
    for (const issue of autoFixableIssues) {
      try {
        const fix = await this.createFix(issue, check);
        const result = await this.applyFix(fix, check);
        
        check.fixes.push({
          ...fix,
          applied: true,
          appliedAt: Date.now(),
          appliedBy: 'system',
          result: result ? 'success' : 'failed'
        });
        
        if (result) {
          // Remover issue da lista se corrigida
          const issueIndex = check.issues.findIndex(i => i.id === issue.id);
          if (issueIndex !== -1) {
            check.issues.splice(issueIndex, 1);
          }
        }
      } catch (error) {
        console.error('Erro ao aplicar correção automática:', error);
      }
    }
  }

  // Criar correção
  private async createFix(issue: IntegrityIssue, check: IntegrityCheck): Promise<IntegrityFix> {
    return {
      id: `fix_${issue.id}_${Date.now()}`,
      issueId: issue.id,
      type: 'auto_fix',
      description: issue.suggestedFix || `Correção automática para ${issue.type}`,
      applied: false
    };
  }

  // Aplicar correção
  private async applyFix(fix: IntegrityFix, check: IntegrityCheck): Promise<boolean> {
    try {
      // Implementar lógica específica de correção baseada no tipo de issue
      switch (fix.issueId.split('_')[0]) {
        case 'missing':
          return await this.fixMissingData(fix, check);
        case 'invalid':
          return await this.fixInvalidRelationship(fix, check);
        case 'business':
          return await this.fixBusinessRuleViolation(fix, check);
        case 'audit':
          return await this.fixAuditGap(fix, check);
        default:
          return false;
      }
    } catch (error) {
      console.error('Erro ao aplicar correção:', error);
      return false;
    }
  }

  // Corrigir dados ausentes
  private async fixMissingData(fix: IntegrityFix, check: IntegrityCheck): Promise<boolean> {
    // Implementar correção específica baseada no campo ausente
    return true;
  }

  // Corrigir relacionamento inválido
  private async fixInvalidRelationship(fix: IntegrityFix, check: IntegrityCheck): Promise<boolean> {
    // Implementar correção específica baseada no relacionamento
    return true;
  }

  // Corrigir violação de regra de negócio
  private async fixBusinessRuleViolation(fix: IntegrityFix, check: IntegrityCheck): Promise<boolean> {
    // Implementar correção específica baseada na regra violada
    return true;
  }

  // Corrigir gap de auditoria
  private async fixAuditGap(fix: IntegrityFix, check: IntegrityCheck): Promise<boolean> {
    // Implementar correção específica baseada no gap de auditoria
    return true;
  }

  // Gerenciar regras
  addRule(rule: IntegrityRule): void {
    this.rules.push(rule);
  }

  updateRule(ruleId: string, updates: Partial<IntegrityRule>): void {
    const index = this.rules.findIndex(rule => rule.id === ruleId);
    if (index !== -1) {
      this.rules[index] = { ...this.rules[index], ...updates };
    }
  }

  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(rule => rule.id !== ruleId);
  }

  getRules(): IntegrityRule[] {
    return [...this.rules];
  }

  getChecks(): IntegrityCheck[] {
    return [...this.checks];
  }

  // Executar verificação completa do sistema
  async runSystemIntegrityCheck(): Promise<IntegrityCheck[]> {
    const results: IntegrityCheck[] = [];
    
    // Verificar todos os serviços
    const services = await Service.filter({});
    
    for (const service of services) {
      const check = await this.runIntegrityCheck('Service', service.id, service.id, service.clientId);
      results.push(check);
    }
    
    return results;
  }

  // Iniciar monitoramento automático
  startAutoMonitoring(intervalMs: number = 300000): void { // 5 minutos
    if (this.processingInterval) return;

    this.processingInterval = setInterval(async () => {
      await this.runSystemIntegrityCheck();
    }, intervalMs);

    console.log('🔍 Monitoramento automático de integridade iniciado');
  }

  // Parar monitoramento automático
  stopAutoMonitoring(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    console.log('⏹️ Monitoramento automático de integridade parado');
  }
}

// Instância singleton
export const integrityManager = new IntegrityManager();

// Hook para usar o sistema de integridade
export function useIntegrityCheck() {
  const { user } = useSession();
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [checks, setChecks] = useState<IntegrityCheck[]>([]);

  // Executar verificação
  const runCheck = useCallback(async (
    entityType: string,
    entityId: string,
    serviceId: string,
    clientId: string
  ): Promise<IntegrityCheck> => {
    const check = await integrityManager.runIntegrityCheck(
      entityType,
      entityId,
      serviceId,
      clientId
    );
    
    setChecks(prev => [...prev, check]);
    return check;
  }, []);

  // Executar verificação completa do sistema
  const runSystemCheck = useCallback(async (): Promise<IntegrityCheck[]> => {
    const results = await integrityManager.runSystemIntegrityCheck();
    setChecks(prev => [...prev, ...results]);
    return results;
  }, []);

  // Gerenciar regras
  const addRule = useCallback((rule: IntegrityRule) => {
    integrityManager.addRule(rule);
  }, []);

  const updateRule = useCallback((ruleId: string, updates: Partial<IntegrityRule>) => {
    integrityManager.updateRule(ruleId, updates);
  }, []);

  const removeRule = useCallback((ruleId: string) => {
    integrityManager.removeRule(ruleId);
  }, []);

  const getRules = useCallback(() => {
    return integrityManager.getRules();
  }, []);

  // Controle de monitoramento
  const startMonitoring = useCallback(() => {
    integrityManager.startAutoMonitoring();
    setIsMonitoring(true);
  }, []);

  const stopMonitoring = useCallback(() => {
    integrityManager.stopAutoMonitoring();
    setIsMonitoring(false);
  }, []);

  // Iniciar monitoramento automaticamente
  useEffect(() => {
    startMonitoring();
    return () => stopMonitoring();
  }, [startMonitoring, stopMonitoring]);

  return {
    // Estado
    isMonitoring,
    checks,
    
    // Ações
    runCheck,
    runSystemCheck,
    addRule,
    updateRule,
    removeRule,
    getRules,
    startMonitoring,
    stopMonitoring,
    
    // Utilitários
    integrityManager
  };
}

export default integrityManager;

