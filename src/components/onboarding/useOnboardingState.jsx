import { useState, useEffect, useCallback } from 'react';
import { Client, Brief, CyclePlan, LearningEntry } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';

export function useOnboardingState() {
  const { agency, user } = useSession();
  const [onboardingState, setOnboardingState] = useState({
    hasClients: false,
    hasBriefing: false,
    hasPlan: false,
    hasApproval: false,
    knowsLearnings: false,
    isComplete: false,
    currentStep: 1
  });
  const [loading, setLoading] = useState(true);

  const checkOnboardingProgress = useCallback(async () => {
    if (!agency?.id) return;

    try {
      setLoading(true);

      // Verificar se tem clientes
      const clients = await Client.filter({ agencyId: agency.id }, 'created_date', 1);
      const hasClients = clients.length > 0;

      // Verificar se tem briefing preenchido
      const briefings = await Brief.filter({ agencyId: agency.id }, 'created_date', 1);
      const hasBriefing = briefings.length > 0 && briefings[0].completion_score > 60;

      // Verificar se tem plano criado
      const plans = await CyclePlan.filter({ agencyId: agency.id }, 'created_date', 1);
      const hasPlan = plans.length > 0;

      // Verificar se enviou para aprovação
      const approvals = await CyclePlan.filter({ 
        agencyId: agency.id, 
        status: { $in: ['pending_approval', 'approved'] }
      }, 'created_date', 1);
      const hasApproval = approvals.length > 0;

      // Verificar se visitou os aprendizados (localStorage)
      const knowsLearnings = localStorage.getItem(`onboarding_${agency.id}_learnings_visited`) === 'true';

      const newState = {
        hasClients,
        hasBriefing,
        hasPlan,
        hasApproval,
        knowsLearnings,
        isComplete: hasClients && hasBriefing && hasPlan && hasApproval && knowsLearnings,
        currentStep: getCurrentStep(hasClients, hasBriefing, hasPlan, hasApproval, knowsLearnings)
      };

      setOnboardingState(newState);

    } catch (error) {
      console.error('Erro ao verificar progresso do onboarding:', error);
    } finally {
      setLoading(false);
    }
  }, [agency?.id]);

  const markLearningsVisited = useCallback(() => {
    if (agency?.id) {
      localStorage.setItem(`onboarding_${agency.id}_learnings_visited`, 'true');
      setOnboardingState(prev => ({ ...prev, knowsLearnings: true }));
    }
  }, [agency?.id]);

  const getCurrentStep = (hasClients, hasBriefing, hasPlan, hasApproval, knowsLearnings) => {
    if (!hasClients) return 1;
    if (!hasBriefing) return 2;
    if (!hasPlan) return 3;
    if (!hasApproval) return 4;
    if (!knowsLearnings) return 5;
    return 6; // Completo
  };

  useEffect(() => {
    checkOnboardingProgress();
  }, [checkOnboardingProgress]);

  return {
    onboardingState,
    loading,
    markLearningsVisited,
    refreshProgress: checkOnboardingProgress
  };
}