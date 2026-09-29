import { useEffect } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { useNavigate } from 'react-router-dom';
import LoadingState from '@/components/shared/LoadingState';

/**
 * First-run vive no dashboard (checklist).
 * Esta rota só redireciona — evita o wizard órfão e o dead-end /create-agency.
 */
export default function OnboardingPage() {
  const { user, agencyId, loading } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate('/', { replace: true });
      return;
    }

    if (!agencyId) {
      navigate('/create-account', { replace: true });
      return;
    }

    navigate('/dashboard', { replace: true });
  }, [user, agencyId, loading, navigate]);

  return <LoadingState />;
}
