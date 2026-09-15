import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Layers,
  FileText,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  Circle,
} from 'lucide-react';
import {
  panoramaStatusLabel,
  summarizeCicloDistribution,
  extractPanoramaTrends,
  buildPanoramaSuggestion,
  findNextEmptyMonth,
  buildPlanejamentoHref,
} from '@/lib/panoramaAnual';
import { buildNovaCampanhaHref } from '@/lib/planoAnualHub';
import { buildCampaignWorkspaceTasksPath } from '@/lib/campaignWorkspaceHref';
import { buildBriefingInicialHref } from '@/lib/briefingInicial';
import { createPageUrl } from '@/utils';

function PanoramaStatusGlyph({ status, className = 'h-4 w-4' }) {
  switch (status) {
    case 'done':
      return <CheckCircle2 className={`${className} text-emerald-600`} aria-hidden />;
    case 'active':
      return <RefreshCw className={`${className} text-amber-600`} aria-hidden />;
    case 'planned':
      return <FileText className={`${className} text-slate-600`} aria-hidden />;
    default:
      return <Circle className={`${className} text-slate-400`} aria-hidden />;
  }
}

function PanoramaLegendItem({ status, label }) {
  return (
    <span className="inline-flex items-center gap-1">
      <PanoramaStatusGlyph status={status} className="h-3 w-3" />
      {label}
    </span>
  );
}

/**
 * HOME de Planejamento — Panorama Anual (sempre visível).
 * PI-1: timeline + ciclos + placeholders tendências/sugestão + ações.
 */
export default function AnnualPanorama({
  clientId,
  clientName = 'Cliente',
  ano,
  months = [],
  onPlanMultiple,
}) {
  const year = Number(ano) || new Date().getFullYear();
  const now = new Date();
  const currentMes = now.getMonth() + 1;
  const isCurrentYear = year === now.getFullYear();
  const dist = summarizeCicloDistribution(months);
  const trends = extractPanoramaTrends(months);
  const suggestion = buildPanoramaSuggestion({
    months,
    dist,
    fromMes: isCurrentYear ? currentMes : 1,
  });
  const nextEmpty = findNextEmptyMonth(
    months,
    isCurrentYear ? currentMes : 1
  );
  const novaCampanhaMes = suggestion.nextMes || nextEmpty?.mes || currentMes;

  const monthHref = (month) => {
    if (!clientId) return '#';
    if (month.campaignId && month.serviceId) {
      return buildCampaignWorkspaceTasksPath({
        serviceId: month.serviceId,
        clientId,
        campaignId: month.campaignId,
      });
    }
    if (month.campaignId) {
      return createPageUrl(
        `client-campaign?clientId=${clientId}&campaignId=${month.campaignId}&briefingId=${month.campaignId}`
      );
    }
    return buildNovaCampanhaHref(clientId, {
      mes: month.mes,
      ano: year,
    });
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Planejamento
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {year} — Panorama Anual de {clientName}
          </h1>
          <p className="text-sm text-slate-500">
            Mapa vivo do ano. Clique num mês para planejar ou abrir a campanha.
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button asChild variant="outline" size="icon" className="h-8 w-8">
            <Link
              to={buildPlanejamentoHref(clientId, { ano: year - 1 })}
              aria-label={`Ano ${year - 1}`}
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <span className="min-w-[3.5rem] text-center text-sm font-semibold text-slate-800">
            {year}
          </span>
          <Button asChild variant="outline" size="icon" className="h-8 w-8">
            <Link
              to={buildPlanejamentoHref(clientId, { ano: year + 1 })}
              aria-label={`Ano ${year + 1}`}
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-800">Timeline</h2>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12">
          {months.map((m) => {
            const href = monthHref(m);
            const isNow = isCurrentYear && m.mes === currentMes;
            return (
              <Link
                key={m.mes}
                to={href}
                title={`${m.label}: ${panoramaStatusLabel(m.status)}${
                  m.title ? ` — ${m.title}` : ''
                }`}
                className={[
                  'flex flex-col items-center gap-1 rounded-xl border bg-white px-1 py-3 text-center shadow-sm transition',
                  isNow
                    ? 'border-slate-800 ring-1 ring-slate-800/20'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
                ].join(' ')}
              >
                <span className="leading-none" aria-hidden>
                  <PanoramaStatusGlyph status={m.status} />
                </span>
                <span className="text-xs font-semibold text-slate-800">{m.label}</span>
                <span className="text-[10px] text-slate-500 line-clamp-1 px-0.5">
                  {m.title || panoramaStatusLabel(m.status)}
                </span>
              </Link>
            );
          })}
        </div>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          <PanoramaLegendItem status="done" label="concluído" />
          <PanoramaLegendItem status="active" label="em execução" />
          <PanoramaLegendItem status="planned" label="planejado" />
          <PanoramaLegendItem status="empty" label="a planejar" />
          {isCurrentYear ? (
            <span className="text-slate-400">· mês atual destacado</span>
          ) : null}
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-800">
            Distribuição de ciclos
          </h2>
          {dist.bars.length === 0 ? (
            <p className="text-sm text-slate-500">
              Ainda sem campanhas neste ano. Planeje o primeiro mês.
            </p>
          ) : (
            <ul className="space-y-2">
              {dist.bars.map((b) => (
                <li key={b.ciclo} className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span className="capitalize">{b.ciclo.replace(/_/g, ' ')}</span>
                    <span>
                      {b.percent}% · {b.count}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-slate-700/80"
                      style={{ width: `${Math.min(100, b.percent)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-slate-400">
            {dist.empty} mês(es) ainda sem campanha
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-800">Tendências</h2>
            {trends.length === 0 ? (
              <p className="text-sm text-slate-500">
                Quando campanhas tiverem aprendizado ou feedback do cliente, eles
                aparecem aqui.
              </p>
            ) : (
              <ul className="space-y-2">
                {trends.map((t) => (
                  <li
                    key={`${t.mes}-${t.text.slice(0, 24)}`}
                    className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2"
                  >
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                      {t.label}
                      {t.title ? ` · ${t.title}` : ''}
                    </p>
                    <p className="text-sm text-slate-700 line-clamp-2">{t.text}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-slate-100 pt-3 space-y-2">
            <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-slate-500" />
              Sugestão
            </h2>
            <p className="text-sm font-medium text-slate-800">{suggestion.headline}</p>
            <p className="text-sm text-slate-500">{suggestion.body}</p>
            <p className="text-[11px] text-slate-400">
              Heurística local — sugestão com IA entra em fases seguintes.
            </p>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap gap-2">
        <Button asChild className="gap-1.5">
          <Link
            to={buildNovaCampanhaHref(clientId, {
              mes: novaCampanhaMes,
              ano: year,
            })}
          >
            <Plus className="h-4 w-4" />
            Nova Campanha
            {novaCampanhaMes ? ` (${months[novaCampanhaMes - 1]?.label || ''})` : ''}
          </Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="gap-1.5"
          onClick={() => onPlanMultiple?.()}
        >
          <Layers className="h-4 w-4" />
          Planejar Múltiplos
        </Button>
        <Button asChild variant="ghost" className="gap-1.5">
          <Link to={createPageUrl(buildBriefingInicialHref(clientId))}>
            <FileText className="h-4 w-4" />
            Briefing inicial
          </Link>
        </Button>
      </section>
    </div>
  );
}
