import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import LoadingState from '@/components/shared/LoadingState';

/**
 * Rota legada: redireciona para a aba Evolução em client-learnings.
 */
export default function ClientEvolutionRedirect() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const next = new URLSearchParams();
    const clientId = searchParams.get('clientId');
    const serviceId = searchParams.get('serviceId');
    if (clientId) next.set('clientId', clientId);
    if (serviceId) next.set('serviceId', serviceId);
    next.set('tab', 'evolucao');
    navigate(`${createPageUrl('client-learnings')}?${next.toString()}`, { replace: true });
  }, [navigate, searchParams]);

  return <LoadingState message="Redirecionando..." />;
}
