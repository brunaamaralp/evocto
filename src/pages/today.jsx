import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import LoadingState from '@/components/shared/LoadingState';

/**
 * Alias legado: /today → /dashboard (mesma home operacional).
 */
export default function TodayRedirect() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    navigate(`/dashboard${location.search}${location.hash}`, { replace: true });
  }, [navigate, location.search, location.hash]);

  return <LoadingState />;
}
