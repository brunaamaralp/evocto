import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { getUrlSearchParam } from '@/utils';
import { buildPlanejamentoHref } from '@/lib/panoramaAnual';

/**
 * Bookmark legado: /client-planning → Panorama (/planejamento).
 * URL preservada via redirect; clientId/ano mantidos quando presentes.
 */
export default function ClientPlanningRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const clientId = getUrlSearchParam(params, 'clientId', 'id');
    const ano = params.get('ano');
    if (clientId) {
      navigate(buildPlanejamentoHref(clientId, { ano: ano || undefined }), {
        replace: true,
      });
    } else {
      navigate('/clients', { replace: true });
    }
  }, [navigate]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-slate-400" aria-hidden />
      <span className="sr-only">Redirecionando para o Panorama…</span>
    </div>
  );
}
