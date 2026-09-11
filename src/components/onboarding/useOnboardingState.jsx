import { useState, useEffect, useCallback } from 'react';
import { Client, Brief, CyclePlan, Service } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';

export function useOnboardingState() {
  const { agency, _user } = useSession();
  const [onboardingState, setOnboardingState] = useState({
    hasClients: false,
    hasService: false,
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

      const clients = await Client.filter({ agencyId: agency.id }, 'created_date', 1);
      const hasClients = clients.length > 0;

      const services = await Service.filter({
        agencyId: agency.id,
        is_template: false,
      }).catch(() => []);
      const hasService = (Array.isArray(services) ? services : []).some(
        (s) => s?.is_active !== false
      );

      const briefings = await Brief.filter({ agencyId: agency.id }, 'created_date', 1);
      const hasBriefing = briefings.length > 0 && briefings[0].completion_score > 60;

      const plans = await CyclePlan.filter({ agencyId: agency.id }, 'created_date', 1);
      const hasPlan = plans.length > 0;

      const approvals = await CyclePlan.filter({ 
        agencyId: agency.id, 
        status: { $in: ['pending_approval', 'approved'] }
      }, 'created_date', 1);
      const hasApproval = approvals.length > 0;

      const knowsLearnings = localStorage.getItem(`onboarding_${agency.id}_learnings_visited`) === 'true';

      const newState = {
        hasClients,
        hasService,
        hasBriefing,
        hasPlan,
        hasApproval,
        knowsLearnings,
        isComplete:
          hasClients &&
          hasService &&
          hasBriefing &&
          hasPlan &&
          hasApproval &&
          knowsLearnings,
        currentStep: getCurrentStep(
          hasClients,
          hasService,
          hasBriefing,
          hasPlan,
          hasApproval,
          knowsLearnings
        ),
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

  const getCurrentStep = (
    hasClients,
    hasService,
    hasBriefing,
    hasPlan,
    hasApproval,
    knowsLearnings
  ) => {
    if (!hasClients) return 1;
    if (!hasService) return 2;
    if (!hasBriefing) return 3;
    if (!hasPlan) return 4;
    if (!hasApproval) return 5;
    if (!knowsLearnings) return 6;
    return 7;
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
