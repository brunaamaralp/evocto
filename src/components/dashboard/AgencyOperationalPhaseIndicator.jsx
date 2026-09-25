import { Check } from 'lucide-react';
import {
  formatOperationalDaysRemaining,
  formatOperationalWeekContext,
  formatOperationalWeekPeriod,
} from '@/lib/agencyOperationalCycle';
import { getActivityKindLabel } from '@/constants/activityKinds';

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
        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#007bff]"
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
 * Não representa conclusão de tarefas.
 *
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
                    ? 'text-sm font-semibold text-[#111]'
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
                    ? 'mt-2 max-w-[7.5rem] text-[11px] font-semibold leading-snug text-[#111]'
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
 * Andamento do foco da fase (V2.6).
 * Só unidades classificadas cujo activityKind ∈ currentPhase.activityKinds.
 */
function PhaseFocusProgress({ phaseWork }) {
  if (!phaseWork?.enabled) return null;

  const focusLabels = (phaseWork.focusKinds || [])
    .map((k) => getActivityKindLabel(k) || k)
    .filter(Boolean);

  let summary;
  if (phaseWork.emptyReason === 'no_focus_kinds') {
    summary = 'Esta fase não tem naturezas de trabalho no foco.';
  } else if (phaseWork.emptyReason === 'no_classified_work') {
    summary =
      'Nenhuma atividade classificada no foco desta fase (só entram Tasks/checklist com activityKind).';
  } else if (phaseWork.total > 0) {
    const parts = [];
    if (phaseWork.open > 0) {
      parts.push(`${phaseWork.open} aberta${phaseWork.open === 1 ? '' : 's'}`);
    }
    if (phaseWork.done > 0) {
      parts.push(
        `${phaseWork.done} concluída${phaseWork.done === 1 ? '' : 's'}`
      );
    }
    summary = `No foco: ${parts.join(' · ') || `${phaseWork.total} atividade${phaseWork.total === 1 ? '' : 's'}`}`;
  } else {
    return null;
  }

  const openItems = (phaseWork.items || []).filter((i) => !i.done).slice(0, 5);

  return (
    <div className="space-y-1.5 pt-2" data-testid="agency-operational-phase-work">
      {focusLabels.length > 0 ? (
        <p className="text-[11px] text-[#888]">Foco: {focusLabels.join(' · ')}</p>
      ) : null}
      <p className="text-sm text-[#555]">{summary}</p>
      {openItems.length > 0 ? (
        <ul className="space-y-0.5 pt-0.5">
          {openItems.map((item) => (
            <li
              key={item.id}
              className="truncate text-sm text-[#333]"
              title={item.title}
            >
              <span className="text-[#888]">{item.activityKindLabel}</span>
              <span className="text-[#ccc]"> · </span>
              {item.title}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * Indicador do ciclo operacional da agência no hero da Home.
 *
 * @param {{
 *   cycle?: import('@/lib/agencyOperationalCycle').ResolvedOperationalCycle | null,
 *   phase?: import('@/lib/agencyOperationalCycle').ResolvedOperationalPhase | null,
 *   phaseWork?: object | null,
 * }} props
 */
export default function AgencyOperationalPhaseIndicator({
  cycle = null,
  phase = null,
  phaseWork = null,
}) {
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
  const metaLine = [periodLabel, daysLabel].filter(Boolean).join(' · ');

  return (
    <div className="space-y-1.5 pt-1" data-testid="agency-operational-phase">
      {contextLine ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#888]">
          {contextLine}
        </p>
      ) : null}
      <p className="text-base font-semibold tracking-tight text-[#111] sm:text-lg">
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
      <PhaseFocusProgress phaseWork={phaseWork} />
      {cycle?.phases?.length ? (
        <OperationalCycleTimeline phases={cycle.phases} />
      ) : null}
    </div>
  );
}
