import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import { buildAnnualPlanHref } from '@/lib/planoAnualHub';
import { buildBriefingInicialHref } from '@/lib/briefingInicial';

/**
 * Aba Contexto: referência ao briefing inicial (editor) e Panorama.
 */
export default function CampaignWorkspaceContexto({
  clientId,
  clientName,
  serviceName,
}) {
  const panoramaHref = clientId ? buildAnnualPlanHref(clientId) : createPageUrl('clients');
  const inicialHref = clientId
    ? createPageUrl(buildBriefingInicialHref(clientId))
    : null;

  return (
    <section className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Contexto</h2>
        <p className="text-sm text-slate-500 mt-1">
          Briefing inicial e base estratégica do cliente. A edição fica no
          formulário de briefing — aqui só a referência para operar.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Cliente</p>
          <p className="text-sm font-medium text-slate-900">{clientName || '—'}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Serviço</p>
          <p className="text-sm font-medium text-slate-900">{serviceName || '—'}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {inicialHref ? (
          <Button type="button" asChild>
            <Link to={inicialHref}>Abrir briefing inicial</Link>
          </Button>
        ) : null}
        <Button type="button" variant="outline" asChild>
          <Link to={panoramaHref}>Abrir Panorama</Link>
        </Button>
      </div>
    </section>
  );
}
