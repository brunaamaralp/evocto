import { useState } from 'react';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import {
  formatOperationalDaysRemaining,
  formatOperationalWeekContext,
  formatOperationalWeekPeriod,
} from '@/lib/agencyOperationalCycle';
import { getActivityKindLabel } from '@/constants/activityKinds';

const BRAND = '#6C47D8';

/**
 * @param {{ state: 'completed' | 'current' | 'upcoming' }} props
 */
function PhaseMarker({ state }) {
  if (state === 'completed') {
    return (
      <span
        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#e8e8e8] text-[#666]"
        aria-hidden="true"
      >
        <Check className="h-3 w-3" strokeWidth={2.5} />
      </span>
    );
  }
  if (state === 'current') {
    return (
      <span
        className="inline-flex h-5 w-5 items-center justify-center rounded-full"
        style={{ backgroundColor: BRAND }}
        aria-hidden="true"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-white" />
      </span>
    );
  }
  return (
    <span
      className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#ddd] bg-white"
      aria-hidden="true"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-[#ccc]" />
    </span>
  );
}

/**
 * Timeline temporal do ciclo (passado / atual / futuro).
 * @param {{ phases: import('@/lib/agencyOperationalCycle').OperationalCyclePhaseItem[] }} props
 */
function OperationalCycleTimeline({ phases }) {
  if (!Array.isArray(phases) || phases.length === 0) return null;

  return (
    <nav aria-label="Ciclo operacional do mês" className="pt-3">
      <ol className="space-y-2.5 sm:hidden">
        {phases.map((item) => {
          const isCurrent = item.state === 'current';
          return (
            <li
              key={item.slot}
              className="flex items-center gap-2.5"
              aria-current={isCurrent ? 'step' : undefined}
            >
              <PhaseMarker state={item.state} />
              <span
                className={
                  isCurrent
                    ? 'text-sm font-semibold text-[#18162A]'
                    : item.state === 'completed'
                      ? 'text-sm text-[#888]'
                      : 'text-sm text-[#aaa]'
                }
              >
                {item.label}
                {isCurrent ? (
                  <span className="sr-only"> (fase atual)</span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>

      <ol className="hidden sm:flex sm:items-start sm:justify-between sm:gap-1">
        {phases.map((item, index) => {
          const isCurrent = item.state === 'current';
          const isLast = index === phases.length - 1;
          return (
            <li
              key={item.slot}
              className="relative flex min-w-0 flex-1 flex-col items-center text-center"
              aria-current={isCurrent ? 'step' : undefined}
            >
              <div className="relative z-[1] flex items-center justify-center">
                <PhaseMarker state={item.state} />
              </div>
              {!isLast ? (
                <span
                  className="pointer-events-none absolute left-[calc(50%+12px)] right-[calc(-50%+12px)] top-2.5 h-px bg-[#e5e5e5]"
                  aria-hidden="true"
                />
              ) : null}
              <span
                className={
                  isCurrent
                    ? 'mt-2 max-w-[7.5rem] text-[11px] font-semibold leading-snug text-[#18162A]'
                    : item.state === 'completed'
                      ? 'mt-2 max-w-[7.5rem] text-[11px] leading-snug text-[#888]'
                      : 'mt-2 max-w-[7.5rem] text-[11px] leading-snug text-[#aaa]'
                }
              >
                {item.label}
                {isCurrent ? (
                  <span className="sr-only"> (fase atual)</span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Resumo amigável do foco da fase (sem jargão técnico).
 */
function PhaseFocusSummary({ phaseWork }) {
  if (!phaseWork?.enabled) return null;

  const focusLabels = (phaseWork.focusKinds || [])
    .map((k) => getActivityKindLabel(k) || k)
    .filter(Boolean);

  if (phaseWork.emptyReason === 'no_focus_kinds') {
    return (
      <p className="text-sm text-[#7A7595]">Sem foco definido nesta fase do mês.</p>
    );
  }

  if (phaseWork.emptyReason === 'no_classified_work') {
    return (
      <p className="text-sm text-[#7A7595]">
        Ainda não há atividades no foco desta fase.
      </p>
    );
  }

  if (!(phaseWork.total > 0)) return null;

  const parts = [];
  if (phaseWork.open > 0) {
    parts.push(`${phaseWork.open} aberta${phaseWork.open === 1 ? '' : 's'}`);
  }
  if (phaseWork.done > 0) {
    parts.push(`${phaseWork.done} concluída${phaseWork.done === 1 ? '' : 's'}`);
  }
  const summary =
    parts.join(' · ') ||
    `${phaseWork.total} atividade${phaseWork.total === 1 ? '' : 's'}`;

  return (
    <div className="space-y-1" data-testid="agency-operational-phase-work">
      {focusLabels.length > 0 ? (
        <p className="text-xs text-[#7A7595]">Foco: {focusLabels.join(' · ')}</p>
      ) : null}
      <p className="text-sm text-[#7A7595]">{summary}</p>
    </div>
  );
}

/**
 * Indicador do ciclo operacional da agência no hero da Home.
 * Compacto por padrão: uma linha + detalhes sob demanda.
 *
 * @param {{
 *   cycle?: import('@/lib/agencyOperationalCycle').ResolvedOperationalCycle | null,
 *   phase?: import('@/lib/agencyOperationalCycle').ResolvedOperationalPhase | null,
 *   phaseWork?: object | null,
 *   compact?: boolean,
 * }} props
 */
export default function AgencyOperationalPhaseIndicator({
  cycle = null,
  phase = null,
  phaseWork = null,
  compact = true,
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const current = cycle?.currentPhase || phase;
  if (!current) return null;

  const contextLine = formatOperationalWeekContext(current);
  const periodLabel = formatOperationalWeekPeriod(
    current.operationalWeekStartYmd,
    current.operationalWeekEndYmd
  );
  const daysLabel =
    typeof current.daysRemaining === 'number'
      ? formatOperationalDaysRemaining(current.daysRemaining)
      : '';

  const phaseBit = current.label ? `Fase · ${current.label}` : null;
  const compactBits = [contextLine, phaseBit, daysLabel].filter(Boolean);
  const showTimeline = Boolean(cycle?.phases?.length);
  const canExpand = showTimeline || Boolean(phaseWork?.enabled);

  if (compact) {
    return (
      <div className="space-y-2 pt-1" data-testid="agency-operational-phase">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-xs leading-relaxed text-[#7A7595] sm:text-sm">
            {compactBits.map((bit, i) => (
              <span key={`${bit}-${i}`}>
                {i > 0 ? <span className="text-[#ccc]"> · </span> : null}
                <span className={i === 1 ? 'font-semibold text-[#18162A]' : undefined}>
                  {bit}
                </span>
              </span>
            ))}
          </p>
          {canExpand ? (
            <button
              type="button"
              onClick={() => setDetailsOpen((v) => !v)}
              className="inline-flex items-center gap-0.5 text-xs font-medium text-[#6C47D8] hover:underline"
              aria-expanded={detailsOpen}
            >
              {detailsOpen ? 'Ocultar' : 'O que é isso?'}
              {detailsOpen ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
          ) : null}
        </div>
        {detailsOpen ? (
          <div className="rounded-xl border border-[#E8E5F5] bg-[#F5F2FC]/60 px-3 py-3 space-y-2">
            {periodLabel ? (
              <p className="text-xs text-[#7A7595]" data-testid="agency-operational-period">
                {periodLabel}
              </p>
            ) : null}
            {current.description ? (
              <p className="text-sm leading-relaxed text-[#555]">{current.description}</p>
            ) : null}
            <PhaseFocusSummary phaseWork={phaseWork} />
            {showTimeline ? (
              <OperationalCycleTimeline phases={cycle.phases} />
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  const metaLine = [periodLabel, daysLabel].filter(Boolean).join(' · ');

  return (
    <div className="space-y-1.5 pt-1" data-testid="agency-operational-phase">
      {contextLine ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#888]">
          {contextLine}
        </p>
      ) : null}
      <p className="text-base font-semibold tracking-tight text-[#18162A] sm:text-lg">
        {current.label}
      </p>
      {current.description ? (
        <p className="max-w-xl text-sm leading-relaxed text-[#555]">
          {current.description}
        </p>
      ) : null}
      {metaLine ? (
        <p className="text-sm text-[#777]" data-testid="agency-operational-period">
          {metaLine}
        </p>
      ) : null}
      <PhaseFocusSummary phaseWork={phaseWork} />
      {showTimeline ? <OperationalCycleTimeline phases={cycle.phases} /> : null}
    </div>
  );
}
