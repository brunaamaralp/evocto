import React, { useEffect } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { useNavigate } from 'react-router-dom';
import AgencyOnboarding from '@/components/onboarding/AgencyOnboarding';
import LoadingState from '@/components/shared/LoadingState';

export default function OnboardingPage() {
  const { user, agencyId, loading } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    // Se não estiver logado, redirecionar para home
    if (!loading && !user) {
      navigate('/');
      return;
    }

    // Se não tiver agência, redirecionar para criar agência
    if (!loading && user && !agencyId) {
      navigate('/create-agency');
      return;
    }
  }, [user, agencyId, loading, navigate]);

  if (loading) {
    return <LoadingState />;
  }

  if (!user || !agencyId) {
    return null;
  }

  return <AgencyOnboarding />;
}