import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, FileText, PenLine } from 'lucide-react';
import {
  buildBriefingInicialHref,
  resolveBriefingInicialStatus,
} from '@/lib/briefingInicial';
import { createPageUrl } from '@/utils';

/**
 * Status + CTA do briefing inicial na Visão Geral / Serviços.
 */
export default function ClientBriefingStatusCard({
  clientId,
  briefs = [],
  compact = false,
}) {
  if (!clientId) return null;

  const { status, brief, label } = resolveBriefingInicialStatus(briefs);
  const href = createPageUrl(
    buildBriefingInicialHref(clientId, { briefingId: brief?.id })
  );
  const isReady = status === 'ready';
  const isDraft = status === 'draft';
  const cta = isReady ? 'Editar briefing' : isDraft ? 'Continuar briefing' : 'Preencher briefing';

  if (compact) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3">
        <div className="flex min-w-0 items-center gap-2">
          {isReady ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
          ) : (
            <Circle className="h-4 w-4 shrink-0 text-amber-500" aria-hidden />
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900">Briefing inicial</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        </div>
        <Button asChild size="sm" variant={isReady ? 'outline' : 'default'} className="shrink-0 gap-1.5">
          <Link to={href}>
            {isReady ? <PenLine className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
            {cta}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <section
      aria-labelledby="briefing-status-heading"
      className="rounded-xl border border-[#e8eef5] bg-[#f7fafc] px-4 py-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            {isReady ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />
            ) : (
              <FileText className="h-4 w-4 text-[#555]" aria-hidden />
            )}
            <h2 id="briefing-status-heading" className="text-sm font-medium text-[#111]">
              Briefing inicial
            </h2>
            <span className="text-xs text-[#666]">· {label}</span>
          </div>
          <p className="text-sm text-[#666]">
            {isReady
              ? 'DNA do cliente preenchido. Edite quando o contexto mudar.'
              : 'Base estratégica do cliente — preencha ou continue pelo editor.'}
          </p>
        </div>
        <Button
          asChild
          className={
            isReady
              ? 'w-full shrink-0 sm:w-auto'
              : 'w-full shrink-0 bg-[#007bff] hover:bg-[#0056b3] sm:w-auto'
          }
          variant={isReady ? 'outline' : 'default'}
        >
          <Link to={href} className="inline-flex items-center gap-1.5">
            {isReady ? <PenLine className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
            {cta}
          </Link>
        </Button>
      </div>
    </section>
  );
}
