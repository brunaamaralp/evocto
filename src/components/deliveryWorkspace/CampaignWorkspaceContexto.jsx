import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import { buildPlanningCreateCampaignPath } from '@/lib/campaignWorkspaceHref';

/**
 * Aba Contexto: referência ao Briefing do Serviço (casa canônica no Planejamento).
 */
export default function CampaignWorkspaceContexto({
  clientId,
  clientName,
  serviceName,
}) {
  const planningHref = clientId
    ? buildPlanningCreateCampaignPath(clientId)
    : createPageUrl('clients');
  const inicialHref = clientId
    ? `${createPageUrl('briefing-inicial')}?clientId=${encodeURIComponent(clientId)}`
    : null;

  return (
    <section className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Contexto</h2>
        <p className="text-sm text-slate-500 mt-1">
          Briefing do serviço e base estratégica do cliente. A edição completa fica no
          Planejamento — aqui só a referência para operar.
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
        <Button type="button" asChild>
          <Link to={planningHref}>Abrir Planejamento &amp; briefs</Link>
        </Button>
        {inicialHref ? (
          <Button type="button" variant="outline" asChild>
            <Link to={inicialHref}>Briefing do serviço</Link>
          </Button>
        ) : null}
      </div>
    </section>
  );
}
