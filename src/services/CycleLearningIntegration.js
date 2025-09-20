import { LearningEntry, CyclePlan } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';
import { toast } from 'sonner';

/**
 * Serviço para integração real de aprendizados com ciclos
 */
export class CycleLearningIntegration {
  constructor() {
    this.session = null;
  }

  setSession(session) {
    this.session = session;
  }

  /**
   * Aplica aprendizado a um ciclo real
   */
  async applyLearningToCycle(learningId, cycleId, applicationNotes = '') {
    try {
      const learning = await LearningEntry.get(learningId);
      const cycle = await CyclePlan.get(cycleId);

      if (!learning || !cycle) {
        throw new Error('Aprendizado ou ciclo não encontrado');
      }

      // Atualizar ciclo com insights do aprendizado
      const updatedCycle = await this.updateCycleWithLearning(cycle, learning, applicationNotes);

      // Marcar aprendizado como aplicado
      await LearningEntry.update(learningId, {
        tags: [...(learning.tags || []), 'in_current_plan'],
        metadata: {
          ...learning.metadata,
          appliedToCycles: [...(learning.metadata?.appliedToCycles || []), cycleId],
          lastAppliedAt: new Date().toISOString(),
          appliedBy: this.session?.user?.email,
          applicationNotes
        }
      });

      return updatedCycle;
    } catch (error) {
      console.error('Erro ao aplicar aprendizado ao ciclo:', error);
      throw error;
    }
  }

  /**
   * Atualiza ciclo com insights do aprendizado
   */
  async updateCycleWithLearning(cycle, learning, notes) {
    const updates = {};

    // Adicionar insights estratégicos
    if (learning.rationale && learning.rationale !== 'Contexto específico não disponível nos dados fornecidos.') {
      updates.strategic_insights = this.mergeInsights(cycle.strategic_insights, {
        learningId: learning.id,
        learningTitle: learning.title,
        insight: learning.rationale,
        niche: learning.niche,
        format: learning.format,
        confidence: learning.confidence_score,
        source: 'learning'
      });
    }

    // Adicionar ajustes baseados no aprendizado
    if (learning.format && learning.format !== 'Não especificado') {
      updates.format_adjustments = this.mergeAdjustments(cycle.format_adjustments, {
        learningId: learning.id,
        format: learning.format,
        adjustment: learning.description,
        rationale: learning.rationale,
        confidence: learning.confidence_score
      });
    }

    // Adicionar otimizações de gatilho
    if (learning.trigger && learning.trigger !== 'Não identificado') {
      updates.trigger_optimizations = this.mergeOptimizations(cycle.trigger_optimizations, {
        learningId: learning.id,
        trigger: learning.trigger,
        optimization: learning.description,
        rationale: learning.rationale,
        confidence: learning.confidence_score
      });
    }

    // Adicionar notas de aplicação
    if (notes) {
      updates.learning_notes = this.mergeNotes(cycle.learning_notes, {
        learningId: learning.id,
        learningTitle: learning.title,
        notes,
        appliedAt: new Date().toISOString(),
        appliedBy: this.session?.user?.email
      });
    }

    // Atualizar prioridades se o aprendizado for de alta confiança
    if (learning.confidence_score >= 80) {
      updates.priorities = this.updatePriorities(cycle.priorities, learning);
    }

    // Atualizar escopo se necessário
    if (learning.tags?.includes('oportunidade') || learning.tags?.includes('risco')) {
      updates.scope = this.updateScope(cycle.scope, learning);
    }

    // Atualizar ciclo
    return await CyclePlan.update(cycle.id, updates);
  }

  /**
   * Mescla insights estratégicos
   */
  mergeInsights(existingInsights, newInsight) {
    const insights = existingInsights || [];
    
    // Verificar se já existe insight para este aprendizado
    const existingIndex = insights.findIndex(insight => 
      insight.learningId === newInsight.learningId
    );

    if (existingIndex >= 0) {
      // Atualizar insight existente
      insights[existingIndex] = {
        ...insights[existingIndex],
        ...newInsight,
        updatedAt: new Date().toISOString()
      };
    } else {
      // Adicionar novo insight
      insights.push({
        ...newInsight,
        createdAt: new Date().toISOString()
      });
    }

    return insights;
  }

  /**
   * Mescla ajustes de formato
   */
  mergeAdjustments(existingAdjustments, newAdjustment) {
    const adjustments = existingAdjustments || [];
    
    const existingIndex = adjustments.findIndex(adj => 
      adj.learningId === newAdjustment.learningId
    );

    if (existingIndex >= 0) {
      adjustments[existingIndex] = {
        ...adjustments[existingIndex],
        ...newAdjustment,
        updatedAt: new Date().toISOString()
      };
    } else {
      adjustments.push({
        ...newAdjustment,
        createdAt: new Date().toISOString()
      });
    }

    return adjustments;
  }

  /**
   * Mescla otimizações de gatilho
   */
  mergeOptimizations(existingOptimizations, newOptimization) {
    const optimizations = existingOptimizations || [];
    
    const existingIndex = optimizations.findIndex(opt => 
      opt.learningId === newOptimization.learningId
    );

    if (existingIndex >= 0) {
      optimizations[existingIndex] = {
        ...optimizations[existingIndex],
        ...newOptimization,
        updatedAt: new Date().toISOString()
      };
    } else {
      optimizations.push({
        ...newOptimization,
        createdAt: new Date().toISOString()
      });
    }

    return optimizations;
  }

  /**
   * Mescla notas de aplicação
   */
  mergeNotes(existingNotes, newNote) {
    const notes = existingNotes || [];
    notes.push(newNote);
    return notes;
  }

  /**
   * Atualiza prioridades baseadas no aprendizado
   */
  updatePriorities(existingPriorities, learning) {
    const priorities = existingPriorities || [];
    
    // Se o aprendizado é sobre oportunidade, adicionar como prioridade
    if (learning.tags?.includes('oportunidade')) {
      const newPriority = {
        id: `learning_${learning.id}`,
        title: learning.title,
        description: learning.description,
        priority: 'high',
        source: 'learning',
        learningId: learning.id,
        confidence: learning.confidence_score
      };
      
      // Verificar se já existe
      const existingIndex = priorities.findIndex(p => p.learningId === learning.id);
      if (existingIndex >= 0) {
        priorities[existingIndex] = newPriority;
      } else {
        priorities.push(newPriority);
      }
    }

    return priorities;
  }

  /**
   * Atualiza escopo baseado no aprendizado
   */
  updateScope(existingScope, learning) {
    const scope = existingScope || { in: [], out: [] };
    
    // Se é uma oportunidade, adicionar ao escopo "in"
    if (learning.tags?.includes('oportunidade')) {
      const newItem = {
        id: `learning_${learning.id}`,
        title: learning.title,
        description: learning.description,
        effort: 'medium',
        impact: 'high',
        rationale: learning.rationale,
        source: 'learning',
        learningId: learning.id,
        confidence: learning.confidence_score
      };
      
      // Verificar se já existe
      const existingIndex = scope.in.findIndex(item => item.learningId === learning.id);
      if (existingIndex >= 0) {
        scope.in[existingIndex] = newItem;
      } else {
        scope.in.push(newItem);
      }
    }

    // Se é um risco, adicionar ao escopo "out"
    if (learning.tags?.includes('risco')) {
      const newItem = {
        id: `learning_${learning.id}`,
        title: learning.title,
        description: learning.description,
        rationale: learning.rationale,
        source: 'learning',
        learningId: learning.id,
        confidence: learning.confidence_score
      };
      
      // Verificar se já existe
      const existingIndex = scope.out.findIndex(item => item.learningId === learning.id);
      if (existingIndex >= 0) {
        scope.out[existingIndex] = newItem;
      } else {
        scope.out.push(newItem);
      }
    }

    return scope;
  }

  /**
   * Obtém sugestões de aprendizados para um ciclo
   */
  async getCycleSuggestions(cycleId, limit = 5) {
    try {
      const cycle = await CyclePlan.get(cycleId);
      if (!cycle) return [];

      // Buscar aprendizados relacionados
      const suggestions = await LearningEntry.filter({
        agencyId: this.session?.agency?.id,
        reviewed: true,
        isShared: true,
        $or: [
          { niche: cycle.niche },
          { format: cycle.format },
          { tags: { $in: cycle.tags || [] } }
        ]
      }, '-confidence_score', limit);

      return suggestions.map(learning => ({
        ...learning,
        relevanceScore: this.calculateRelevanceScore(learning, cycle)
      }));
    } catch (error) {
      console.error('Erro ao buscar sugestões para ciclo:', error);
      return [];
    }
  }

  /**
   * Calcula score de relevância para ciclo
   */
  calculateRelevanceScore(learning, cycle) {
    let score = 0;

    // Score por confiança
    score += (learning.confidence_score || 0) * 0.3;

    // Score por nicho
    if (learning.niche === cycle.niche) {
      score += 30;
    }

    // Score por formato
    if (learning.format === cycle.format) {
      score += 25;
    }

    // Score por tags em comum
    if (learning.tags && cycle.tags) {
      const commonTags = learning.tags.filter(tag => cycle.tags.includes(tag));
      score += (commonTags.length / Math.max(learning.tags.length, cycle.tags.length)) * 20;
    }

    // Score por aplicações anteriores
    if (learning.metadata?.appliedToCycles?.length > 0) {
      score += 15;
    }

    return Math.min(score, 100);
  }

  /**
   * Remove aplicação de aprendizado de um ciclo
   */
  async removeLearningFromCycle(learningId, cycleId) {
    try {
      const learning = await LearningEntry.get(learningId);
      const cycle = await CyclePlan.get(cycleId);

      if (!learning || !cycle) {
        throw new Error('Aprendizado ou ciclo não encontrado');
      }

      // Remover tags de aplicação
      const updatedTags = (learning.tags || []).filter(tag => tag !== 'in_current_plan');
      
      await LearningEntry.update(learningId, {
        tags: updatedTags,
        metadata: {
          ...learning.metadata,
          appliedToCycles: (learning.metadata?.appliedToCycles || []).filter(id => id !== cycleId)
        }
      });

      // Remover insights do ciclo
      await this.removeInsightsFromCycle(cycle, learning);

      return true;
    } catch (error) {
      console.error('Erro ao remover aprendizado do ciclo:', error);
      throw error;
    }
  }

  /**
   * Remove insights de um ciclo
   */
  async removeInsightsFromCycle(cycle, learning) {
    const updates = {};

    // Remover insights estratégicos
    if (cycle.strategic_insights) {
      updates.strategic_insights = cycle.strategic_insights.filter(
        insight => insight.learningId !== learning.id
      );
    }

    // Remover ajustes de formato
    if (cycle.format_adjustments) {
      updates.format_adjustments = cycle.format_adjustments.filter(
        adj => adj.learningId !== learning.id
      );
    }

    // Remover otimizações de gatilho
    if (cycle.trigger_optimizations) {
      updates.trigger_optimizations = cycle.trigger_optimizations.filter(
        opt => opt.learningId !== learning.id
      );
    }

    // Remover notas de aplicação
    if (cycle.learning_notes) {
      updates.learning_notes = cycle.learning_notes.filter(
        note => note.learningId !== learning.id
      );
    }

    // Remover de prioridades
    if (cycle.priorities) {
      updates.priorities = cycle.priorities.filter(
        priority => priority.learningId !== learning.id
      );
    }

    // Remover de escopo
    if (cycle.scope) {
      updates.scope = {
        in: cycle.scope.in?.filter(item => item.learningId !== learning.id) || [],
        out: cycle.scope.out?.filter(item => item.learningId !== learning.id) || []
      };
    }

    // Atualizar ciclo
    return await CyclePlan.update(cycle.id, updates);
  }
}

// Instância singleton
export const cycleLearningIntegration = new CycleLearningIntegration();

