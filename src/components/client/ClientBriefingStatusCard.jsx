import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, FileText, FileUp, PenLine } from 'lucide-react';
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
  const isReady = status === 'ready';

  // Visão geral: briefing concluído não precisa de card de pendência.
  if (isReady && !compact) return null;

  const href = createPageUrl(
    buildBriefingInicialHref(clientId, { briefingId: brief?.id })
  );
  const importHref = createPageUrl(
    buildBriefingInicialHref(clientId, {
      briefingId: brief?.id,
      importFile: true,
    })
  );
  const isDraft = status === 'draft';
  const cta = isReady ? 'Editar briefing' : isDraft ? 'Continuar briefing' : 'Preencher briefing';

  if (compact) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3">
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
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {!isReady ? (
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <Link to={importHref}>
                <FileUp className="h-3.5 w-3.5" />
                Importar
              </Link>
            </Button>
          ) : null}
          <Button asChild size="sm" variant={isReady ? 'outline' : 'default'} className="gap-1.5">
            <Link to={href}>
              {isReady ? <PenLine className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
              {cta}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <section
      aria-labelledby="briefing-status-heading"
      className="rounded-2xl border border-[#E4DDD4] bg-[#F1EDE7] px-4 py-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            {isReady ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />
            ) : (
              <FileText className="h-4 w-4 text-[#6B635C]" aria-hidden />
            )}
            <h2 id="briefing-status-heading" className="text-sm font-medium text-[#1A1210]">
              Briefing inicial
            </h2>
            <span className="text-xs text-[#6B635C]">· {label}</span>
          </div>
          <p className="text-sm text-[#6B635C]">
            {isReady
              ? 'Preenchido. Edite quando a marca mudar.'
              : 'Importe um PDF/DOCX/TXT ou preencha o formulário.'}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          {!isReady ? (
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link to={importHref} className="inline-flex items-center gap-1.5">
                <FileUp className="h-4 w-4" />
                Importar arquivo
              </Link>
            </Button>
          ) : null}
          <Button
            asChild
            className={
              isReady
                ? 'w-full sm:w-auto'
                : 'w-full bg-[#B80015] hover:bg-[#8A0010] sm:w-auto'
            }
            variant={isReady ? 'outline' : 'default'}
          >
            <Link to={href} className="inline-flex items-center gap-1.5">
              {isReady ? <PenLine className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
              {cta}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
