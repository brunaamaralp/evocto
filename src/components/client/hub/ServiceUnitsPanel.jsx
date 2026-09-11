import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getCreateCtaLabel,
  shouldShowCreateCta,
  UNIT_KINDS,
} from '@/lib/serviceOperationProfile';

function capitalizeLabel(label) {
  const s = String(label || '').trim();
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function unitMetaLine(unit) {
  const { progress } = unit;
  const parts = [];

  if (unit.statusLabel) parts.push(unit.statusLabel);

  if (progress?.kind === 'steps' && progress.total > 0) {
    parts.push(`${progress.completed} de ${progress.total} etapas`);
  } else if (progress?.kind === 'tasks' && progress.total > 0) {
    parts.push(
      `${progress.total} tarefa${progress.total === 1 ? '' : 's'}`
    );
    if (progress.pending > 0) {
      parts.push(
        `${progress.pending} pendente${progress.pending === 1 ? '' : 's'}`
      );
    }
    if (progress.overdue > 0) {
      parts.push(
        `${progress.overdue} atrasada${progress.overdue === 1 ? '' : 's'}`
      );
    }
  }

  return parts.join(' · ');
}

function UnitCard({ unit }) {
  const percent =
    unit.progress?.total > 0 ? unit.progress.percentComplete : null;
  const meta = unitMetaLine(unit);

  return (
    <li>
      <Link
        to={unit.href}
        className="group block rounded-lg border border-[#eee] bg-white px-4 py-3.5 transition-colors hover:border-[#ccc] hover:bg-[#fafafa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007bff]/40"
      >
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 truncate text-[15px] font-medium text-[#111] group-hover:text-[#007bff]">
            {unit.title}
          </p>
          {percent != null ? (
            <span className="shrink-0 text-sm tabular-nums text-[#666]">
              {percent}%
            </span>
          ) : null}
        </div>
        {meta ? (
          <p className="mt-1 truncate text-sm text-[#666]">{meta}</p>
        ) : null}
      </Link>
    </li>
  );
}

function SingleProjectView({ singleProject, onStart, starting = false }) {
  if (!singleProject) return null;

  if (!singleProject.ready) {
    return (
      <div className="py-10 text-center">
        <p className="text-sm font-medium text-[#111]">Operação ainda não iniciada</p>
        <p className="mt-1 text-sm text-[#666]">
          As etapas aparecem aqui quando a operação começar.
        </p>
        {onStart ? (
          <Button
            className="mt-5 bg-[#007bff] hover:bg-[#0056b3]"
            onClick={onStart}
            disabled={starting}
          >
            {starting ? 'Iniciando…' : 'Iniciar operação'}
          </Button>
        ) : null}
      </div>
    );
  }

  const steps = Array.isArray(singleProject.steps) ? singleProject.steps : [];
  const firstOpenIndex = steps.findIndex((s) => !s.completed);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-[#666]">
          {[
            singleProject.statusLabel,
            singleProject.progress?.total > 0
              ? `${singleProject.progress.completed} de ${singleProject.progress.total} etapas`
              : null,
            singleProject.progress?.total > 0
              ? `${singleProject.progress.percentComplete}%`
              : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
        {singleProject.href ? (
          <Link
            to={singleProject.href}
            className="text-sm font-medium text-[#007bff] hover:underline"
          >
            Abrir etapas
          </Link>
        ) : null}
      </div>

      <ul className="divide-y divide-[#f0f0f0] rounded-lg border border-[#eee] bg-white">
        {steps.map((step, index) => {
          const isCurrent = !step.completed && index === firstOpenIndex;
          return (
            <li
              key={step.id}
              className={`flex items-center justify-between gap-3 px-4 py-2.5 text-sm ${
                isCurrent ? 'bg-[#f7faff]' : ''
              }`}
            >
              <span
                className={
                  step.completed
                    ? 'text-[#888] line-through'
                    : isCurrent
                      ? 'font-medium text-[#111]'
                      : 'text-[#111]'
                }
              >
                {step.title}
                {isCurrent ? (
                  <span className="ml-2 text-xs font-normal text-[#007bff]">
                    Em andamento
                  </span>
                ) : null}
              </span>
              <span
                className={`tabular-nums ${
                  step.completed
                    ? 'text-[#27ae60]'
                    : isCurrent
                      ? 'text-[#007bff]'
                      : 'text-[#ccc]'
                }`}
                aria-hidden
              >
                {step.completed ? '✓' : isCurrent ? '●' : '○'}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function EmptyUnits({ profile, onCreate }) {
  const showCta = shouldShowCreateCta(profile);
  const ctaLabel = getCreateCtaLabel(profile);
  const ctaText = String(ctaLabel || '')
    .replace(/^\+\s*/, '')
    .trim();
  const item = profile?.itemLabel || 'trabalho';
  const isCampaign = profile?.unitKind === UNIT_KINDS.CAMPAIGN_BRIEF;

  return (
    <div className="mx-auto max-w-sm py-10 text-center">
      <h3 className="text-base font-medium text-[#111]">
        Nenhum {item} ainda
      </h3>
      <p className="mt-1 text-sm text-[#666]">
        {isCampaign
          ? 'Crie no Planejamento para começar a operar aqui.'
          : 'Crie o primeiro para começar a operar.'}
      </p>
      {showCta && onCreate ? (
        <Button className="mt-5 bg-[#007bff] hover:bg-[#0056b3]" onClick={onCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          {ctaText || capitalizeLabel(item)}
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Lista de unidades / operação single_project / empty da lente.
 */
export default function ServiceUnitsPanel({
  lens,
  onCreate,
  onStartSingleProject,
  startingSingleProject = false,
}) {
  if (!lens) return null;

  if (lens.singleProject) {
    return (
      <SingleProjectView
        singleProject={lens.singleProject}
        onStart={onStartSingleProject}
        starting={startingSingleProject}
      />
    );
  }

  if (!lens.unitsCount) {
    return <EmptyUnits profile={lens.profile} onCreate={onCreate} />;
  }

  const noun =
    lens.unitsCount === 1
      ? lens.profile?.itemLabel || 'trabalho'
      : lens.profile?.itemLabelPlural || 'trabalhos';

  return (
    <div className="space-y-5">
      <p className="text-sm text-[#666]">
        Em andamento · {lens.unitsCount} {noun}
      </p>
      <div className="space-y-6">
        {lens.groups.map((group, index) => (
          <section
            key={group.periodKey || group.cycleId || `group-${index}`}
            className="space-y-2.5"
          >
            {group.periodLabel ? (
              <p className="text-sm font-medium text-[#555]">
                {group.periodLabel}
                <span className="ml-2 font-normal text-[#888]">
                  {group.units.length}{' '}
                  {group.units.length === 1
                    ? lens.profile?.itemLabel || 'trabalho'
                    : lens.profile?.itemLabelPlural || 'trabalhos'}
                </span>
              </p>
            ) : null}
            <ul className="space-y-2">
              {group.units.map((unit) => (
                <UnitCard key={unit.id} unit={unit} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
