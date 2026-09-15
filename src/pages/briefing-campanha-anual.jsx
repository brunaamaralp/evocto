import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { getUrlSearchParam } from '@/utils';
import { buildPlanejamentoHref } from '@/lib/panoramaAnual';

/**
 * PI-0 — rota legada do plano anual rígido redireciona para o Panorama.
 */
export default function BriefingCampanhaAnualRedirect() {
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
      <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
    </div>
  );
}
