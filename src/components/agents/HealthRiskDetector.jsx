/**
 * Sistema de detecção de riscos para o Agente de Saúde
 * Analisa diferentes entidades e detecta problemas potenciais
 */

import { differenceInHours, differenceInDays, isAfter, addHours } from 'date-fns';

export class HealthRiskDetector {
  constructor(agencyPolicies = {}) {
    this.thresholds = {
      approval_expiring_hours: agencyPolicies.rcExpiryDays ? agencyPolicies.rcExpiryDays * 24 : 168, // 7 dias default
      cycle_overdue_days: 3,
      learning_untriaged_hours: agencyPolicies.learningTriageHours || 72, // 3 dias default
      briefing_pending_days: 5,
      ...agencyPolicies
    };
  }

  /**
   * Analisa todos os dados e retorna uma lista de riscos detectados
   */
  async analyzeAll({ cyclePlans, services, clients, learnings, briefingVersions }) {
    const risks = [];
    const now = new Date();

    // 1. Verificar aprovações expirando
    const approvalRisks = this.detectExpiringApprovals(cyclePlans, briefingVersions, now);
    risks.push(...approvalRisks);

    // 2. Verificar ciclos atrasados
    const cycleRisks = this.detectOverdueCycles(cyclePlans, now);
    risks.push(...cycleRisks);

    // 3. Verificar aprendizados não revisados
    const learningRisks = this.detectUntriagedLearnings(learnings, now);
    risks.push(...learningRisks);

    // 4. Verificar briefings desatualizados
    const briefingRisks = this.detectStaleBriefings(briefingVersions, now);
    risks.push(...briefingRisks);

    // Ordenar por severidade (crítico primeiro)
    return risks.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  /**
   * Detecta aprovações próximas do vencimento
   */
  detectExpiringApprovals(cyclePlans, briefingVersions, now) {
    const risks = [];

    // Verificar planos de ciclo pendentes
    const pendingCyclePlans = cyclePlans.filter(plan => 
      plan.status === 'pending_approval' && 
      plan.approvalData?.token_expires_at
    );

    pendingCyclePlans.forEach(plan => {
      const expiresAt = new Date(plan.approvalData.token_expires_at);
      const hoursUntilExpiry = differenceInHours(expiresAt, now);

      if (hoursUntilExpiry <= this.thresholds.approval_expiring_hours && hoursUntilExpiry > 0) {
        const severity = hoursUntilExpiry <= 24 ? 'critical' : 
                        hoursUntilExpiry <= 48 ? 'high' : 'medium';

        risks.push({
          id: `approval_expiring_cycle_${plan.id}`,
          type: 'approval_expiring',
          severity,
          title: `Aprovação de plano expira em ${Math.floor(hoursUntilExpiry)}h`,
          description: `O link de aprovação do plano "${plan.cyclePeriod}" expira em breve. O cliente precisa aprovar ou solicitar ajustes.`,
          entity: {
            type: 'CyclePlan',
            id: plan.id,
            name: `${plan.cyclePeriod} - ${plan.clientId}`
          },
          suggested_actions: [
            'Enviar lembrete para o cliente',
            'Entrar em contato direto',
            'Estender prazo de aprovação se necessário'
          ],
          detected_at: now.toISOString()
        });
      }
    });

    // Verificar briefings pendentes (similar)
    const pendingBriefings = briefingVersions.filter(version => 
      version.status === 'IN_REVIEW' && 
      version.token_expires_at
    );

    pendingBriefings.forEach(briefing => {
      const expiresAt = new Date(briefing.token_expires_at);
      const hoursUntilExpiry = differenceInHours(expiresAt, now);

      if (hoursUntilExpiry <= this.thresholds.approval_expiring_hours && hoursUntilExpiry > 0) {
        const severity = hoursUntilExpiry <= 24 ? 'critical' : 
                        hoursUntilExpiry <= 48 ? 'high' : 'medium';

        risks.push({
          id: `approval_expiring_briefing_${briefing.id}`,
          type: 'approval_expiring',
          severity,
          title: `Aprovação de briefing expira em ${Math.floor(hoursUntilExpiry)}h`,
          description: `O link de aprovação do briefing expira em breve.`,
          entity: {
            type: 'BriefingVersion',
            id: briefing.id,
            name: `Briefing v${briefing.version_name}`
          },
          suggested_actions: [
            'Enviar lembrete para o cliente',
            'Revisar briefing com a equipe',
            'Estender prazo se necessário'
          ],
          detected_at: now.toISOString()
        });
      }
    });

    return risks;
  }

  /**
   * Detecta ciclos com execução atrasada
   */
  detectOverdueCycles(cyclePlans, now) {
    const risks = [];

    const overdueCycles = cyclePlans.filter(plan => {
      // Ciclos aprovados mas sem fechamento há muito tempo
      if (plan.status === 'approved' || plan.status === 'in_execution') {
        const approvedAt = plan.approvalData?.approved_at ? new Date(plan.approvalData.approved_at) : null;
        if (approvedAt) {
          const daysSinceApproval = differenceInDays(now, approvedAt);
          return daysSinceApproval > this.thresholds.cycle_overdue_days;
        }
      }
      return false;
    });

    overdueCycles.forEach(plan => {
      const approvedAt = new Date(plan.approvalData.approved_at);
      const daysSinceApproval = differenceInDays(now, approvedAt);
      
      const severity = daysSinceApproval > 7 ? 'high' : 'medium';

      risks.push({
        id: `cycle_overdue_${plan.id}`,
        type: 'cycle_overdue',
        severity,
        title: `Ciclo em execução há ${daysSinceApproval} dias`,
        description: `O ciclo "${plan.cyclePeriod}" foi aprovado mas não tem progresso de fechamento há mais de ${this.thresholds.cycle_overdue_days} dias.`,
        entity: {
          type: 'CyclePlan',
          id: plan.id,
          name: `${plan.cyclePeriod} - ${plan.clientId}`
        },
        suggested_actions: [
          'Verificar progresso da execução',
          'Atualizar status do ciclo',
          'Agendar reunião de acompanhamento com o cliente'
        ],
        detected_at: now.toISOString()
      });
    });

    return risks;
  }

  /**
   * Detecta aprendizados que precisam de triagem
   */
  detectUntriagedLearnings(learnings, now) {
    const risks = [];

    const untriagedLearnings = learnings.filter(learning => {
      if (learning.status !== 'ready' || learning.reviewed) return false;
      
      const createdAt = new Date(learning.created_date);
      const hoursSinceCreation = differenceInHours(now, createdAt);
      
      return hoursSinceCreation > this.thresholds.learning_untriaged_hours;
    });

    if (untriagedLearnings.length > 0) {
      const oldestLearning = untriagedLearnings.reduce((oldest, current) => 
        new Date(current.created_date) < new Date(oldest.created_date) ? current : oldest
      );
      
      const hoursUntriaged = differenceInHours(now, new Date(oldestLearning.created_date));
      const severity = hoursUntriaged > 168 ? 'high' : 'medium'; // > 7 dias = high

      risks.push({
        id: `learning_untriaged_batch`,
        type: 'learning_untriaged',
        severity,
        title: `${untriagedLearnings.length} aprendizados aguardando revisão`,
        description: `Há aprendizados não revisados há mais de ${Math.floor(hoursUntriaged / 24)} dias. Eles podem conter insights valiosos.`,
        entity: {
          type: 'LearningEntry',
          id: 'library',
          name: 'Biblioteca de Aprendizados'
        },
        suggested_actions: [
          'Revisar e validar aprendizados pendentes',
          'Aplicar aprendizados relevantes aos projetos ativos',
          'Arquivar aprendizados irrelevantes'
        ],
        detected_at: now.toISOString()
      });
    }

    return risks;
  }

  /**
   * Detecta briefings que podem estar desatualizados
   */
  detectStaleBriefings(briefingVersions, now) {
    const risks = [];

    // Por simplicidade, apenas detecta briefings sem atualização há muito tempo
    const staleBriefings = briefingVersions.filter(version => {
      if (version.status !== 'APPROVED') return false;
      
      const approvedAt = new Date(version.approved_at);
      const daysSinceApproval = differenceInDays(now, approvedAt);
      
      return daysSinceApproval > this.thresholds.briefing_pending_days * 6; // 30 dias
    });

    staleBriefings.forEach(briefing => {
      const daysSinceUpdate = differenceInDays(now, new Date(briefing.approved_at));
      
      risks.push({
        id: `briefing_stale_${briefing.id}`,
        type: 'briefing_stale',
        severity: 'low',
        title: `Briefing sem atualizações há ${daysSinceUpdate} dias`,
        description: `O briefing não recebe atualizações há mais de um mês. Pode estar defasado.`,
        entity: {
          type: 'BriefingVersion',
          id: briefing.id,
          name: `Briefing v${briefing.version_name}`
        },
        suggested_actions: [
          'Revisar relevância do briefing atual',
          'Verificar se houve mudanças no negócio do cliente',
          'Considerar atualização com base em aprendizados recentes'
        ],
        detected_at: now.toISOString()
      });
    });

    return risks;
  }
}