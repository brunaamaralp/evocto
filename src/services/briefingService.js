/**
 * 🧾 Serviço de Briefing (CRUD + Aplicação de Regras)
 * 
 * Gerencia briefing por instância de serviço
 * Aplica regras de IA e gerencia ajustes de tarefas
 */

import { Briefing } from '@/models/Briefing';
import { TaskAdjustment } from '@/models/TaskAdjustment';
import { aiRulesService } from '@/services/aiRulesService';
import { useTriggerSystem } from '@/hooks/useTriggerSystem';

export class BriefingService {
  constructor() {
    this.briefings = new Map(); // Simulação de persistência
    this.adjustments = new Map(); // Simulação de persistência
  }

  // Criar novo briefing
  async createBriefing(data) {
    try {
      console.log('[BriefingService] Criando briefing:', data);

      // Validar dados obrigatórios
      if (!data.servico_instancia_id) {
        throw new Error('ID da instância do serviço é obrigatório');
      }

      if (!data.cliente_id) {
        throw new Error('ID do cliente é obrigatório');
      }

      if (!data.servico_tipo) {
        throw new Error('Tipo do serviço é obrigatório');
      }

      if (!data.preenchido_por_user_id) {
        throw new Error('ID do usuário é obrigatório');
      }

      // Criar briefing
      const briefing = await Briefing.create({
        servico_instancia_id: data.servico_instancia_id,
        cliente_id: data.cliente_id,
        servico_tipo: data.servico_tipo,
        itens: data.itens || {},
        preenchido_por_user_id: data.preenchido_por_user_id,
        status: 'rascunho'
      });

      // Persistir (simulação)
      this.briefings.set(briefing.id, briefing);

      console.log('[BriefingService] Briefing criado:', briefing.id);
      return briefing;

    } catch (error) {
      console.error('[BriefingService] Erro ao criar briefing:', error);
      throw error;
    }
  }

  // Atualizar briefing
  async updateBriefing(briefingId, data) {
    try {
      console.log('[BriefingService] Atualizando briefing:', briefingId);

      const briefing = this.briefings.get(briefingId);
      if (!briefing) {
        throw new Error('Briefing não encontrado');
      }

      // Atualizar dados
      if (data.itens) {
        briefing.itens = { ...briefing.itens, ...data.itens };
      }

      if (data.status) {
        briefing.status = data.status;
      }

      briefing.updated_at = new Date().toISOString();

      // Validar após atualização
      const validation = briefing.validate();
      if (!validation.isValid) {
        throw new Error(`Briefing inválido: ${validation.errors.join(', ')}`);
      }

      // Persistir (simulação)
      this.briefings.set(briefingId, briefing);

      console.log('[BriefingService] Briefing atualizado:', briefingId);
      return briefing;

    } catch (error) {
      console.error('[BriefingService] Erro ao atualizar briefing:', error);
      throw error;
    }
  }

  // Obter briefing por ID
  async getBriefing(briefingId) {
    try {
      console.log('[BriefingService] Buscando briefing:', briefingId);

      const briefing = this.briefings.get(briefingId);
      if (!briefing) {
        throw new Error('Briefing não encontrado');
      }

      return briefing;

    } catch (error) {
      console.error('[BriefingService] Erro ao buscar briefing:', error);
      throw error;
    }
  }

  // Obter briefing ativo mais recente por serviço
  async getLatestActiveBriefing(servicoInstanciaId) {
    try {
      console.log('[BriefingService] Buscando briefing ativo mais recente:', servicoInstanciaId);

      let latestBriefing = null;
      let latestVersion = 0;

      // Buscar briefing ativo mais recente
      for (const briefing of this.briefings.values()) {
        if (briefing.servico_instancia_id === servicoInstanciaId && 
            briefing.status === 'ativo' && 
            briefing.versao > latestVersion) {
          latestBriefing = briefing;
          latestVersion = briefing.versao;
        }
      }

      return latestBriefing;

    } catch (error) {
      console.error('[BriefingService] Erro ao buscar briefing ativo:', error);
      throw error;
    }
  }

  // Listar briefings por serviço
  async getBriefingsByService(servicoInstanciaId) {
    try {
      console.log('[BriefingService] Listando briefings do serviço:', servicoInstanciaId);

      const briefings = [];
      for (const briefing of this.briefings.values()) {
        if (briefing.servico_instancia_id === servicoInstanciaId) {
          briefings.push(briefing);
        }
      }

      // Ordenar por versão (mais recente primeiro)
      briefings.sort((a, b) => b.versao - a.versao);

      return briefings;

    } catch (error) {
      console.error('[BriefingService] Erro ao listar briefings:', error);
      throw error;
    }
  }

  // Enviar briefing e aplicar regras de IA
  async submitBriefing(briefingId) {
    try {
      console.log('[BriefingService] Enviando briefing:', briefingId);

      const briefing = await this.getBriefing(briefingId);
      
      // Validar briefing antes de enviar
      const { aiRulesService } = await import('./aiRulesService');
      const validation = aiRulesService.validateBriefingForRules(briefing);
      
      if (!validation.isValid) {
        console.error('[BriefingService] Briefing inválido:', validation.errors);
        throw new Error(`Briefing inválido: ${validation.errors.join('; ')}`);
      }

      // Log warnings se houver
      if (validation.warnings.length > 0) {
        console.warn('[BriefingService] Warnings na validação:', validation.warnings);
      }

      // Marcar versões anteriores como supersedidas
      await this.supersedePreviousVersions(briefing.servico_instancia_id);

      // Ativar briefing atual
      briefing.activate();

      // Aplicar regras de IA com validação
      console.log('[BriefingService] Aplicando regras de IA...');
      const adjustments = await aiRulesService.applyRules(briefing);
      
      // Gerar tarefas personalizadas com IA
      console.log('[BriefingService] Gerando tarefas personalizadas...');
      const { aiTaskGenerator } = await import('./AITaskGenerator');
      const taskGenerationResult = await aiTaskGenerator.generateTasksFromBriefing(briefing);
      
      if (taskGenerationResult.success) {
        console.log(`[BriefingService] ${taskGenerationResult.tasks.length} tarefas geradas pela IA`);
        // Integrar tarefas geradas com ajustes existentes
        adjustments.push(...taskGenerationResult.tasks.map(task => ({
          id: `ai_task_${task.id}`,
          servico_instancia_id: briefing.servico_instancia_id,
          briefing_id: briefing.id,
          action: 'ADD_TASK',
          task_id: null,
          task_template_key: null,
          payload: task,
          reason: 'Tarefa gerada por IA baseada no briefing',
          created_by: briefing.preenchido_por_user_id,
          status: 'active'
        })));
      } else {
        console.warn('[BriefingService] Falha na geração de tarefas:', taskGenerationResult.error);
      }

      // Persistir ajustes
      for (const adjustment of adjustments) {
        this.adjustments.set(adjustment.id, adjustment);
      }

      // Persistir briefing atualizado
      this.briefings.set(briefingId, briefing);

      // Disparar evento de briefing enviado
      await this.triggerBriefingSubmitted(briefing, adjustments);

      console.log('[BriefingService] Briefing enviado com sucesso:', briefingId);
      console.log('[BriefingService] Ajustes aplicados:', adjustments.length);

      return {
        briefing,
        adjustments,
        stats: aiRulesService.getRuleStats(adjustments),
        validation: {
          isValid: true,
          warnings: validation.warnings
        }
      };

    } catch (error) {
      console.error('[BriefingService] Erro ao enviar briefing:', error);
      throw error;
    }
  }

  // Superseder versões anteriores
  async supersedePreviousVersions(servicoInstanciaId) {
    try {
      console.log('[BriefingService] Supersedendo versões anteriores:', servicoInstanciaId);

      for (const briefing of this.briefings.values()) {
        if (briefing.servico_instancia_id === servicoInstanciaId && 
            briefing.status === 'ativo') {
          briefing.supersede();
          this.briefings.set(briefing.id, briefing);
        }
      }

    } catch (error) {
      console.error('[BriefingService] Erro ao superseder versões:', error);
      throw error;
    }
  }

  // Criar nova versão do briefing
  async createNewVersion(briefingId) {
    try {
      console.log('[BriefingService] Criando nova versão do briefing:', briefingId);

      const currentBriefing = await this.getBriefing(briefingId);
      const newBriefing = currentBriefing.createNewVersion();

      // Persistir nova versão
      this.briefings.set(newBriefing.id, newBriefing);

      console.log('[BriefingService] Nova versão criada:', newBriefing.id);
      return newBriefing;

    } catch (error) {
      console.error('[BriefingService] Erro ao criar nova versão:', error);
      throw error;
    }
  }

  // Obter ajustes por briefing
  async getAdjustmentsByBriefing(briefingId) {
    try {
      console.log('[BriefingService] Buscando ajustes do briefing:', briefingId);

      const adjustments = [];
      for (const adjustment of this.adjustments.values()) {
        if (adjustment.briefing_id === briefingId) {
          adjustments.push(adjustment);
        }
      }

      return adjustments;

    } catch (error) {
      console.error('[BriefingService] Erro ao buscar ajustes:', error);
      throw error;
    }
  }

  // Obter ajustes ativos por serviço
  async getActiveAdjustmentsByService(servicoInstanciaId) {
    try {
      console.log('[BriefingService] Buscando ajustes ativos do serviço:', servicoInstanciaId);

      const adjustments = [];
      for (const adjustment of this.adjustments.values()) {
        if (adjustment.servico_instancia_id === servicoInstanciaId && 
            adjustment.status === 'active') {
          adjustments.push(adjustment);
        }
      }

      return adjustments;

    } catch (error) {
      console.error('[BriefingService] Erro ao buscar ajustes ativos:', error);
      throw error;
    }
  }

  // Aplicar ajustes a lista de tarefas
  async applyAdjustmentsToTasks(tasks, servicoInstanciaId) {
    try {
      console.log('[BriefingService] Aplicando ajustes às tarefas:', servicoInstanciaId);

      const adjustments = await this.getActiveAdjustmentsByService(servicoInstanciaId);
      const result = TaskAdjustment.applyAdjustmentsToTasks(tasks, adjustments);

      console.log('[BriefingService] Ajustes aplicados:', result.adjustedTasks.length, 'tarefas ajustadas');
      console.log('[BriefingService] Novas tarefas:', result.newTasks.length);

      return result;

    } catch (error) {
      console.error('[BriefingService] Erro ao aplicar ajustes:', error);
      throw error;
    }
  }

  // Disparar evento de briefing enviado
  async triggerBriefingSubmitted(briefing, adjustments) {
    try {
      console.log('[BriefingService] Disparando evento de briefing enviado');

      // Simular trigger system (será integrado com o sistema existente)
      const eventData = {
        briefing_id: briefing.id,
        servico_instancia_id: briefing.servico_instancia_id,
        cliente_id: briefing.cliente_id,
        servico_tipo: briefing.servico_tipo,
        adjustments_count: adjustments.length,
        timestamp: new Date().toISOString()
      };

      console.log('[BriefingService] Evento disparado:', eventData);

      // Integrar com sistema de triggers existente
      try {
        const { useTriggerSystem } = await import('@/hooks/useTriggerSystem');
        // Em um contexto real, isso seria feito através de um contexto ou serviço global
        // await triggerSystem.registerEvent('briefing_submitted', 'Briefing', briefing.id, briefing.servico_instancia_id, briefing.cliente_id, eventData);
        console.log('[BriefingService] Evento registrado no sistema de triggers');
      } catch (triggerError) {
        console.warn('[BriefingService] Erro ao registrar evento no sistema de triggers:', triggerError);
      }

    } catch (error) {
      console.error('[BriefingService] Erro ao disparar evento:', error);
    }
  }

  // Obter estatísticas do briefing
  async getBriefingStats(servicoInstanciaId) {
    try {
      console.log('[BriefingService] Calculando estatísticas:', servicoInstanciaId);

      const briefings = await this.getBriefingsByService(servicoInstanciaId);
      const adjustments = await this.getActiveAdjustmentsByService(servicoInstanciaId);

      const stats = {
        total_briefings: briefings.length,
        active_briefings: briefings.filter(b => b.status === 'ativo').length,
        draft_briefings: briefings.filter(b => b.status === 'rascunho').length,
        superseded_briefings: briefings.filter(b => b.status === 'superseded').length,
        total_adjustments: adjustments.length,
        adjustments_by_action: {},
        latest_version: briefings.length > 0 ? Math.max(...briefings.map(b => b.versao)) : 0
      };

      // Contar ajustes por ação
      adjustments.forEach(adjustment => {
        stats.adjustments_by_action[adjustment.action] = 
          (stats.adjustments_by_action[adjustment.action] || 0) + 1;
      });

      return stats;

    } catch (error) {
      console.error('[BriefingService] Erro ao calcular estatísticas:', error);
      throw error;
    }
  }

  // Validar permissões do usuário
  validateUserPermissions(userId, action) {
    // Simulação de validação de permissões
    // Em produção, integrar com sistema de autorização existente
    
    const allowedActions = ['create', 'update', 'submit', 'view'];
    
    if (!allowedActions.includes(action)) {
      throw new Error('Ação não permitida');
    }

    // Simular validação de consultor
    if (action === 'create' || action === 'update' || action === 'submit') {
      // Verificar se usuário é consultor
      console.log('[BriefingService] Validando permissões de consultor para:', userId);
    }

    return true;
  }

  // Limpar dados (para testes)
  clearData() {
    this.briefings.clear();
    this.adjustments.clear();
    console.log('[BriefingService] Dados limpos');
  }
}

// Instância singleton
export const briefingService = new BriefingService();

export default briefingService;
