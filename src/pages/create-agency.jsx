import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingState from '@/components/shared/LoadingState';

/**
 * Rota legada — criação de agência acontece em /create-account.
 */
export default function CreateAgencyRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/create-account', { replace: true });
  }, [navigate]);

  return <LoadingState />;
}
