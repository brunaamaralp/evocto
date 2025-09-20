import { LearningEntry, Brief } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';
import { toast } from 'sonner';

/**
 * Serviço para integração real de aprendizados com briefings
 */
export class BriefingLearningIntegration {
  constructor() {
    this.session = null;
  }

  setSession(session) {
    this.session = session;
  }

  /**
   * Aplica aprendizado a um briefing real
   */
  async applyLearningToBriefing(learningId, briefingId, applicationNotes = '') {
    try {
      const learning = await LearningEntry.get(learningId);
      const briefing = await Brief.get(briefingId);

      if (!learning || !briefing) {
        throw new Error('Aprendizado ou briefing não encontrado');
      }

      // Atualizar briefing com insights do aprendizado
      const updatedBriefing = await this.updateBriefingWithLearning(briefing, learning, applicationNotes);

      // Marcar aprendizado como aplicado
      await LearningEntry.update(learningId, {
        tags: [...(learning.tags || []), 'applied_to_briefing'],
        metadata: {
          ...learning.metadata,
          appliedToBriefings: [...(learning.metadata?.appliedToBriefings || []), briefingId],
          lastAppliedAt: new Date().toISOString(),
          appliedBy: this.session?.user?.email,
          applicationNotes
        }
      });

      return updatedBriefing;
    } catch (error) {
      console.error('Erro ao aplicar aprendizado ao briefing:', error);
      throw error;
    }
  }

  /**
   * Atualiza briefing com insights do aprendizado
   */
  async updateBriefingWithLearning(briefing, learning, notes) {
    const updates = {};

    // Adicionar insights baseados no tipo de aprendizado
    if (learning.niche && learning.niche !== 'Não identificado') {
      updates.niche_insights = this.mergeInsights(briefing.niche_insights, {
        niche: learning.niche,
        insights: [learning.description],
        source: 'learning',
        learningId: learning.id,
        confidence: learning.confidence_score
      });
    }

    if (learning.format && learning.format !== 'Não especificado') {
      updates.format_insights = this.mergeInsights(briefing.format_insights, {
        format: learning.format,
        insights: [learning.description],
        source: 'learning',
        learningId: learning.id,
        confidence: learning.confidence_score
      });
    }

    if (learning.trigger && learning.trigger !== 'Não identificado') {
      updates.trigger_insights = this.mergeInsights(briefing.trigger_insights, {
        trigger: learning.trigger,
        insights: [learning.description],
        source: 'learning',
        learningId: learning.id,
        confidence: learning.confidence_score
      });
    }

    // Adicionar notas de aplicação
    if (notes) {
      updates.application_notes = this.mergeNotes(briefing.application_notes, {
        learningId: learning.id,
        learningTitle: learning.title,
        notes,
        appliedAt: new Date().toISOString(),
        appliedBy: this.session?.user?.email
      });
    }

    // Atualizar score de completude se necessário
    if (learning.confidence_score >= 80) {
      updates.completion_score = Math.min((briefing.completion_score || 0) + 5, 100);
    }

    // Atualizar briefing
    return await Brief.update(briefing.id, updates);
  }

  /**
   * Mescla insights existentes com novos insights
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
   * Mescla notas de aplicação
   */
  mergeNotes(existingNotes, newNote) {
    const notes = existingNotes || [];
    notes.push(newNote);
    return notes;
  }

  /**
   * Obtém sugestões de aprendizados para um briefing
   */
  async getBriefingSuggestions(briefingId, limit = 5) {
    try {
      const briefing = await Brief.get(briefingId);
      if (!briefing) return [];

      // Buscar aprendizados relacionados
      const suggestions = await LearningEntry.filter({
        agencyId: this.session?.agency?.id,
        reviewed: true,
        isShared: true,
        $or: [
          { niche: briefing.niche },
          { format: briefing.format },
          { tags: { $in: briefing.tags || [] } }
        ]
      }, '-confidence_score', limit);

      return suggestions.map(learning => ({
        ...learning,
        relevanceScore: this.calculateRelevanceScore(learning, briefing)
      }));
    } catch (error) {
      console.error('Erro ao buscar sugestões para briefing:', error);
      return [];
    }
  }

  /**
   * Calcula score de relevância para briefing
   */
  calculateRelevanceScore(learning, briefing) {
    let score = 0;

    // Score por confiança
    score += (learning.confidence_score || 0) * 0.3;

    // Score por nicho
    if (learning.niche === briefing.niche) {
      score += 30;
    }

    // Score por formato
    if (learning.format === briefing.format) {
      score += 25;
    }

    // Score por tags em comum
    if (learning.tags && briefing.tags) {
      const commonTags = learning.tags.filter(tag => briefing.tags.includes(tag));
      score += (commonTags.length / Math.max(learning.tags.length, briefing.tags.length)) * 20;
    }

    // Score por aplicações anteriores
    if (learning.metadata?.appliedToBriefings?.length > 0) {
      score += 15;
    }

    return Math.min(score, 100);
  }

  /**
   * Remove aplicação de aprendizado de um briefing
   */
  async removeLearningFromBriefing(learningId, briefingId) {
    try {
      const learning = await LearningEntry.get(learningId);
      const briefing = await Brief.get(briefingId);

      if (!learning || !briefing) {
        throw new Error('Aprendizado ou briefing não encontrado');
      }

      // Remover tags de aplicação
      const updatedTags = (learning.tags || []).filter(tag => tag !== 'applied_to_briefing');
      
      await LearningEntry.update(learningId, {
        tags: updatedTags,
        metadata: {
          ...learning.metadata,
          appliedToBriefings: (learning.metadata?.appliedToBriefings || []).filter(id => id !== briefingId)
        }
      });

      // Remover insights do briefing
      await this.removeInsightsFromBriefing(briefing, learning);

      return true;
    } catch (error) {
      console.error('Erro ao remover aprendizado do briefing:', error);
      throw error;
    }
  }

  /**
   * Remove insights de um briefing
   */
  async removeInsightsFromBriefing(briefing, learning) {
    const updates = {};

    // Remover insights de nicho
    if (briefing.niche_insights) {
      updates.niche_insights = briefing.niche_insights.filter(
        insight => insight.learningId !== learning.id
      );
    }

    // Remover insights de formato
    if (briefing.format_insights) {
      updates.format_insights = briefing.format_insights.filter(
        insight => insight.learningId !== learning.id
      );
    }

    // Remover insights de gatilho
    if (briefing.trigger_insights) {
      updates.trigger_insights = briefing.trigger_insights.filter(
        insight => insight.learningId !== learning.id
      );
    }

    // Remover notas de aplicação
    if (briefing.application_notes) {
      updates.application_notes = briefing.application_notes.filter(
        note => note.learningId !== learning.id
      );
    }

    // Atualizar briefing
    return await Brief.update(briefing.id, updates);
  }
}

// Instância singleton
export const briefingLearningIntegration = new BriefingLearningIntegration();

