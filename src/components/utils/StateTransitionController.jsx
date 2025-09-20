
import React from 'react';
import { Service } from '@/api/entities';
import { Task } from '@/api/entities';
import { Job } from '@/api/entities';
import { AuditLog } from '@/api/entities';
import { Notification } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';
import { toast } from 'sonner';

/**
 * Controlador centralizado para transições de estado idempotentes e resistentes a race conditions
 * Implementa optimistic locking e deduplicação de efeitos
 */
export class StateTransitionController {
  constructor(user, agencyId) {
    this.user = user;
    this.agencyId = agencyId;
    this.transitionCache = new Map(); // Cache para evitar transições duplicadas
  }

  // ====== OPTIMISTIC LOCKING ======

  async executeWithOptimisticLock(entityType, entityId, transitionData) {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        // 1. Buscar entidade atual com transition_version
        const currentEntity = await this.getEntityWithVersion(entityType, entityId);
        
        if (!currentEntity) {
          throw new Error(`${entityType} não encontrado: ${entityId}`);
        }

        const expectedVersion = transitionData.expected_version || currentEntity.transition_version;

        // 2. Verificar se versão ainda é válida
        if (currentEntity.transition_version !== expectedVersion) {
          if (attempt === maxRetries - 1) {
            throw new ConflictError(
              `Conflito de edição: ${entityType} foi modificado por outro usuário. ` +
              `Esperado versão ${expectedVersion}, atual versão ${currentEntity.transition_version}.`
            );
          }
          
          // Retry com nova versão
          attempt++;
          await this.sleep(100 * attempt); // Backoff exponencial
          continue;
        }

        // 3. Verificar idempotência
        const transitionKey = this.buildTransitionKey(entityType, entityId, transitionData);
        if (this.isTransitionInProgress(transitionKey)) {
          // Transição já em andamento, aguardar resultado
          return await this.waitForTransitionCompletion(transitionKey);
        }

        // 4. Marcar transição em progresso
        this.markTransitionInProgress(transitionKey);

        // 5. Executar transição atomicamente
        const result = await this.performAtomicTransition(
          entityType,
          currentEntity,
          transitionData,
          expectedVersion
        );

        // 6. Marcar transição concluída
        this.markTransitionCompleted(transitionKey, result);

        return result;

      } catch (error) {
        if (error instanceof ConflictError) {
          throw error;
        }
        
        attempt++;
        if (attempt >= maxRetries) {
          throw new Error(`Falha na transição após ${maxRetries} tentativas: ${error.message}`);
        }
        
        await this.sleep(100 * attempt);
      }
    }
  }

  async getEntityWithVersion(entityType, entityId) {
    switch (entityType) {
      case 'Service':
        return await Service.get(entityId);
      case 'Task':
        return await Task.get(entityId);
      default:
        throw new Error(`Tipo de entidade não suportado: ${entityType}`);
    }
  }

  async performAtomicTransition(entityType, currentEntity, transitionData, expectedVersion) {
    const newVersion = expectedVersion + 1;
    const timestamp = new Date().toISOString();

    // Preparar dados da transição
    const updateData = {
      ...transitionData.updates,
      transition_version: newVersion,
      updated_date: timestamp
    };

    // Adicionar histórico se for mudança de status
    if (transitionData.updates.status || transitionData.updates.service_status) {
      const historyEntry = {
        status: transitionData.updates.status || transitionData.updates.service_status,
        changedBy: this.user.id,
        changedByName: this.user.full_name || this.user.email,
        changedAt: timestamp,
        reason: transitionData.reason || '',
        previousStatus: currentEntity.status || currentEntity.service_status,
        transition_version: newVersion
      };

      if (entityType === 'Service') {
        updateData.status_history = [...(currentEntity.status_history || []), historyEntry];
      } else if (entityType === 'Task') {
        updateData.statusHistory = [...(currentEntity.statusHistory || []), historyEntry];
      }
    }

    // Atualizar entidade com check de versão
    const updated = await this.updateEntityWithVersionCheck(
      entityType, 
      currentEntity.id, 
      updateData, 
      expectedVersion
    );

    // Executar efeitos idempotentes
    await this.executeIdempotentEffects(entityType, currentEntity, transitionData, updated);

    return updated;
  }

  async updateEntityWithVersionCheck(entityType, entityId, updateData, expectedVersion) {
    const EntityClass = entityType === 'Service' ? Service : Task;
    
    // Simular update com WHERE transition_version = expectedVersion
    // Em implementação real, seria uma query SQL condicional
    const current = await EntityClass.get(entityId);
    if (current.transition_version !== expectedVersion) {
      throw new ConflictError('Versão da entidade mudou durante a transição');
    }

    return await EntityClass.update(entityId, updateData);
  }

  // ====== EXECUÇÃO DE EFEITOS IDEMPOTENTES ======

  async executeIdempotentEffects(entityType, previousEntity, transitionData, updatedEntity) {
    const effects = transitionData.effects || [];

    for (const effect of effects) {
      try {
        await this.executeEffect(effect, entityType, previousEntity, updatedEntity);
      } catch (error) {
        console.error(`Erro ao executar efeito ${effect.type}:`, error);
        // Log mas não falha a transição principal
        await this.logEffectError(effect, error);
      }
    }
  }

  async executeEffect(effect, entityType, previousEntity, updatedEntity) {
    const dedupeKey = this.buildEffectDedupeKey(effect, updatedEntity);

    switch (effect.type) {
      case 'send_notification':
        return await this.sendIdempotentNotification(effect, dedupeKey);

      case 'create_audit_log':
        return await this.createIdempotentAuditLog(effect, dedupeKey);

      case 'execute_async_job':
        return await this.executeIdempotentJob(effect, dedupeKey);

      case 'update_related_entities':
        return await this.updateRelatedEntitiesIdempotently(effect, dedupeKey);

      case 'propagate_status':
        return await this.propagateStatusIdempotently(effect, updatedEntity, dedupeKey);

      default:
        console.warn(`Tipo de efeito não reconhecido: ${effect.type}`);
    }
  }

  async sendIdempotentNotification(effect, dedupeKey) {
    // Verificar se notificação já foi enviada
    const existing = await Notification.filter({
      agencyId: this.agencyId,
      dedupKey: dedupeKey
    });

    if (existing.length > 0) {
      console.log(`Notificação já enviada (dedupe): ${dedupeKey}`);
      return existing[0];
    }

    // Criar nova notificação
    return await Notification.create({
      agencyId: this.agencyId,
      userId: effect.userId,
      type: effect.notificationType,
      subject: effect.subject,
      title: effect.title,
      context: effect.context,
      href: effect.href,
      severity: effect.severity || 'info',
      dedupKey: dedupeKey,
      metadata: effect.metadata || {}
    });
  }

  async createIdempotentAuditLog(effect, dedupeKey) {
    // AuditLog sempre permite duplicatas, mas podemos usar dedupe para performance
    const recentLogs = await AuditLog.filter({
      agencyId: this.agencyId,
      entity_type: effect.entityType,
      entity_id: effect.entityId,
      action: effect.action,
      created_date: { $gte: new Date(Date.now() - 5000).toISOString() } // 5 segundos
    });

    const duplicate = recentLogs.find(log => 
      log.actor_id === this.user.id &&
      JSON.stringify(log.after_data) === JSON.stringify(effect.after_data)
    );

    if (duplicate) {
      console.log(`AuditLog similar já criado: ${duplicate.id}`);
      return duplicate;
    }

    return await AuditLog.create({
      agencyId: this.agencyId,
      entity_type: effect.entityType,
      entity_id: effect.entityId,
      action: effect.action,
      actor_id: this.user.id,
      before_data: effect.before_data,
      after_data: effect.after_data,
      changes: effect.changes || [],
      meta_json: effect.meta_json || {},
      severity: effect.severity || 'medium',
      category: effect.category || 'user_action'
    });
  }

  async executeIdempotentJob(effect, dedupeKey) {
    // Verificar se job já foi criado/executado
    const existingJob = await Job.filter({
      agencyId: this.agencyId,
      idempotencyKey: dedupeKey
    });

    if (existingJob.length > 0) {
      const job = existingJob[0];
      console.log(`Job já existe com status ${job.status}: ${dedupeKey}`);
      
      if (job.status === 'completed') {
        return job;
      } else if (job.status === 'failed' && effect.retryOnFailure) {
        // Retentar job que falhou
        return await Job.update(job.id, {
          status: 'queued',
          attempts: 0,
          processAt: new Date().toISOString()
        });
      }
      
      return job;
    }

    // Criar novo job assíncrono
    return await Job.create({
      agencyId: this.agencyId,
      idempotencyKey: dedupeKey,
      type: effect.jobType,
      payload: effect.payload,
      processAt: effect.processAt || new Date().toISOString(),
      maxAttempts: effect.maxAttempts || 3
    });
  }

  async propagateStatusIdempotently(effect, updatedEntity, dedupeKey) {
    // Propagar mudanças de status para entidades relacionadas
    // Ex: Task blocked → Deliverable has_blockers = true
    
    if (effect.targetEntityType === 'Service' && effect.field === 'has_blockers') {
      const service = await Service.get(updatedEntity.serviceId);
      
      if (service && service.has_blockers !== effect.value) {
        await Service.update(service.id, {
          has_blockers: effect.value,
          transition_version: service.transition_version + 1
        });

        console.log(`Propagated ${effect.field}=${effect.value} to Service ${service.id}`);
      }
    }
  }

  // ====== UTILITÁRIOS ======

  buildTransitionKey(entityType, entityId, transitionData) {
    return `${entityType}:${entityId}:${transitionData.event}:${transitionData.expected_version}`;
  }

  buildEffectDedupeKey(effect, updatedEntity) {
    const baseKey = `${effect.type}:${updatedEntity.id}:${effect.event || 'unknown'}`;
    
    if (effect.customDedupeKey) {
      return `${baseKey}:${effect.customDedupeKey}`;
    }
    
    return `${baseKey}:${updatedEntity.transition_version}`;
  }

  isTransitionInProgress(transitionKey) {
    return this.transitionCache.has(transitionKey) && 
           this.transitionCache.get(transitionKey).status === 'in_progress';
  }

  markTransitionInProgress(transitionKey) {
    this.transitionCache.set(transitionKey, {
      status: 'in_progress',
      startedAt: Date.now()
    });
  }

  markTransitionCompleted(transitionKey, result) {
    this.transitionCache.set(transitionKey, {
      status: 'completed',
      result,
      completedAt: Date.now()
    });

    // Limpar cache após 30 segundos
    setTimeout(() => {
      this.transitionCache.delete(transitionKey);
    }, 30000);
  }

  async waitForTransitionCompletion(transitionKey) {
    const maxWait = 10000; // 10 segundos
    const pollInterval = 100; // 100ms
    let waited = 0;

    while (waited < maxWait) {
      const cached = this.transitionCache.get(transitionKey);
      
      if (!cached) {
        throw new Error('Transição não encontrada no cache');
      }

      if (cached.status === 'completed') {
        return cached.result;
      }

      await this.sleep(pollInterval);
      waited += pollInterval;
    }

    throw new Error('Timeout aguardando conclusão da transição');
  }

  async logEffectError(effect, error) {
    try {
      await AuditLog.create({
        agencyId: this.agencyId,
        entity_type: 'StateTransition',
        entity_id: 'effect_error',
        action: 'EFFECT_FAILED',
        actor_id: this.user.id,
        meta_json: {
          effect_type: effect.type,
          error_message: error.message,
          error_stack: error.stack
        },
        severity: 'high',
        category: 'system'
      });
    } catch (logError) {
      console.error('Erro ao registrar falha de efeito:', logError);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Error customizado para conflitos de versão
export class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConflictError';
    this.userFriendly = true;
  }
}

// Hook React para usar o controlador
export function useStateTransitionController() {
  const { user } = useSession();
  const agencyId = user?.data?.agencyId;

  return React.useMemo(() => {
    if (!user || !agencyId) {
      return null;
    }
    return new StateTransitionController(user, agencyId);
  }, [user, agencyId]);
}

export default StateTransitionController;
