import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { buildBriefingInicialHref } from '@/lib/briefingInicial';
import LoadingState from '@/components/shared/LoadingState';

/**
 * Redirect legado: /client-briefing → /briefing-inicial
 * Mantido por bookmarks; o hub intermediário foi removido.
 */
export default function ClientBriefingRedirect() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const clientId = urlParams.get('clientId');
  const briefingId = urlParams.get('briefingId');

  useEffect(() => {
    if (!clientId) {
      navigate(createPageUrl('clients'), { replace: true });
      return;
    }
    navigate(
      createPageUrl(buildBriefingInicialHref(clientId, { briefingId })),
      { replace: true }
    );
  }, [clientId, briefingId, navigate]);

  return <LoadingState message="Abrindo briefing…" />;
}
