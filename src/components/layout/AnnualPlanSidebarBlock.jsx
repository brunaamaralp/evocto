import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Brief } from '@/api/entities';
import { createPageUrl } from '@/utils';
import { CLIENT_CONTEXT } from '@/lib/clientContextTheme';
import {
  buildAnnualPlanHref,
  buildBrainstormHref,
  deriveAnnualPlanFromBriefs,
  listPlanMonths,
  planMonthStatusTone,
} from '@/lib/planoAnualHub';
import { buildClientCampaignHref } from '@/lib/campaignHref';

const TONE_CLASS = {
  done: 'bg-emerald-500/80 text-white',
  ready: 'bg-sky-500/80 text-white',
  tema: 'bg-amber-500/70 text-white',
  reject: 'bg-rose-500/70 text-white',
  empty: 'bg-teal-900/60 text-teal-200/80',
};

/**
 * Bloco compacto na sidebar: 12 meses do plano anual (lazy-load).
 */
export default function AnnualPlanSidebarBlock({ clientId, agencyId }) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const ano = new Date().getFullYear();
  const currentMes = new Date().getMonth() + 1;

  const load = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const filters = agencyId ? { clientId, agencyId } : { clientId };
      const rows = await Brief.filter(filters).catch(() => []);
      const found = deriveAnnualPlanFromBriefs(rows || [], ano);
      setPlan(found);
    } catch (err) {
      console.warn('[AnnualPlanSidebarBlock]', err);
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }, [clientId, agencyId, ano]);

  useEffect(() => {
    load();
  }, [load]);

  const months = useMemo(() => listPlanMonths(plan), [plan]);
  const progress = useMemo(() => {
    const materializado = months.filter((m) => m.materializado).length;
    const ready = months.filter((m) => m.actionable).length;
    return { materializado, ready };
  }, [months]);

  if (loading) {
    return (
      <div className="px-3 py-2">
        <div className="h-3 w-24 animate-pulse rounded bg-teal-800/80" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="px-3 py-2">
        <Link
          to={buildAnnualPlanHref(clientId)}
          className={`block rounded-lg px-2 py-1.5 text-xs ${CLIENT_CONTEXT.sidebarMuted} ${CLIENT_CONTEXT.sidebarHover}`}
        >
          Criar plano anual {ano}
        </Link>
      </div>
    );
  }

  return (
    <div className="px-2 pb-2">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs ${CLIENT_CONTEXT.sidebarMuted} ${CLIENT_CONTEXT.sidebarHover}`}
      >
        <span>
          Plano {plan.ano || ano}
          <span className="ml-1 opacity-80">
            · {progress.materializado}/12
          </span>
        </span>
        <span aria-hidden>{expanded ? '▾' : '▸'}</span>
      </button>

      {expanded ? (
        <div className="mt-1.5 space-y-2 px-1">
          <div className="grid grid-cols-4 gap-1">
            {months.map((m) => {
              const tone = planMonthStatusTone(m.status_mes);
              const isCurrent = m.mes === currentMes;
              const href = m.materializado && m.brief_mensal_id
                ? createPageUrl(
                    buildClientCampaignHref({
                      clientId,
                      briefingId: m.brief_mensal_id,
                    })
                  )
                : m.actionable || m.tema?.titulo
                  ? buildBrainstormHref(clientId, {
                      mes: m.mes,
                      ano: plan.ano || ano,
                      planId: plan.id,
                      modo: 'plano',
                    })
                  : buildAnnualPlanHref(clientId, plan.id);

              return (
                <Link
                  key={m.mes}
                  to={href}
                  title={`${m.mesLabel}: ${m.status_mes}${
                    m.campanha?.nome_campanha || m.tema?.titulo
                      ? ` — ${m.campanha?.nome_campanha || m.tema?.titulo}`
                      : ''
                  }`}
                  className={`rounded px-0.5 py-1 text-center text-[10px] font-semibold leading-tight ${
                    TONE_CLASS[tone]
                  } ${isCurrent ? 'ring-1 ring-white/70' : ''}`}
                >
                  {m.mesShort}
                </Link>
              );
            })}
          </div>
          <Link
            to={buildAnnualPlanHref(clientId, plan.id)}
            className={`block text-center text-[11px] font-medium ${CLIENT_CONTEXT.sidebarText} underline-offset-2 hover:underline`}
          >
            Abrir plano completo
          </Link>
        </div>
      ) : null}
    </div>
  );
}
