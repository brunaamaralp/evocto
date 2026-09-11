import { Link } from 'react-router-dom';
import { ArrowRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  getCreateCtaLabel,
  shouldShowCreateCta,
} from '@/lib/serviceOperationProfile';

function UnitCard({ unit }) {
  const { progress } = unit;
  const metaParts = [];

  if (unit.statusLabel) metaParts.push(unit.statusLabel);
  if (progress?.kind === 'steps' && progress.total > 0) {
    metaParts.push(`${progress.completed} de ${progress.total} etapas`);
  } else if (progress?.kind === 'tasks' && progress.total > 0) {
    metaParts.push(
      `${progress.total} tarefa${progress.total === 1 ? '' : 's'}`
    );
    if (progress.pending > 0) {
      metaParts.push(
        `${progress.pending} pendente${progress.pending === 1 ? '' : 's'}`
      );
    }
    if (progress.overdue > 0) {
      metaParts.push(
        `${progress.overdue} atrasada${progress.overdue === 1 ? '' : 's'}`
      );
    }
  }

  return (
    <li className="rounded-xl border border-[#eee] bg-white p-5 transition-colors hover:border-[#ddd]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link
            to={unit.href}
            className="block truncate text-base font-semibold text-[#111] hover:text-[#007bff]"
          >
            {unit.title}
          </Link>
          {metaParts.length > 0 ? (
            <p className="mt-1 text-sm text-[#555]">{metaParts.join(' · ')}</p>
          ) : null}
        </div>
        {progress?.total > 0 ? (
          <div className="shrink-0 text-right">
            <p className="text-xl font-bold tabular-nums text-[#111]">
              {progress.percentComplete}%
            </p>
          </div>
        ) : null}
      </div>

      {progress?.total > 0 && progress.kind === 'steps' ? (
        <Progress value={progress.percentComplete} className="mt-4 h-1.5" />
      ) : null}
      {progress?.total > 0 && progress.kind === 'tasks' ? (
        <Progress value={progress.percentComplete} className="mt-4 h-1.5" />
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button asChild size="sm" className="bg-[#007bff] hover:bg-[#0056b3]">
          <Link to={unit.href}>
            Abrir
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
        {unit.tasksHref && unit.kind === 'campaign_brief' ? (
          <Link
            to={unit.tasksHref}
            className="text-sm font-medium text-[#555] hover:text-[#111]"
          >
            Tarefas
          </Link>
        ) : null}
      </div>
    </li>
  );
}

function SingleProjectView({ singleProject, onStart, starting = false }) {
  if (!singleProject) return null;

  if (!singleProject.ready) {
    return (
      <div className="rounded-xl border border-dashed border-[#ddd] px-5 py-10 text-center">
        <p className="text-sm font-medium text-[#111]">Operação ainda não iniciada</p>
        <p className="mt-1 text-sm text-[#555]">
          As etapas deste serviço aparecem aqui quando a operação começar.
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

  return (
    <div className="space-y-4 rounded-xl border border-[#eee] bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-base font-semibold text-[#111]">{singleProject.title}</p>
          <p className="mt-1 text-sm text-[#555]">
            {singleProject.statusLabel}
            {singleProject.progress?.total > 0
              ? ` · ${singleProject.progress.completed} de ${singleProject.progress.total} etapas`
              : ''}
          </p>
        </div>
        {singleProject.progress?.total > 0 ? (
          <p className="text-xl font-bold tabular-nums text-[#111]">
            {singleProject.progress.percentComplete}%
          </p>
        ) : null}
      </div>

      {singleProject.progress?.total > 0 ? (
        <Progress
          value={singleProject.progress.percentComplete}
          className="h-1.5"
        />
      ) : null}

      <ul className="divide-y divide-[#f0f0f0]">
        {singleProject.steps.map((step) => (
          <li
            key={step.id}
            className="flex items-center justify-between gap-3 py-2.5 text-sm"
          >
            <span
              className={
                step.completed ? 'text-[#555] line-through' : 'text-[#111]'
              }
            >
              {step.title}
            </span>
            <span
              className={`tabular-nums ${
                step.completed ? 'text-[#27ae60]' : 'text-[#bbb]'
              }`}
              aria-hidden
            >
              {step.completed ? '✓' : '○'}
            </span>
          </li>
        ))}
      </ul>

      {singleProject.href ? (
        <Button asChild variant="outline" size="sm">
          <Link to={singleProject.href}>Abrir operação</Link>
        </Button>
      ) : null}
    </div>
  );
}

function EmptyUnits({ profile, onCreate }) {
  const showCta = shouldShowCreateCta(profile);
  const ctaLabel = getCreateCtaLabel(profile);
  const ctaText = String(ctaLabel || '')
    .replace(/^\+\s*/, '')
    .trim();
  const noun = profile?.itemLabelPlural || 'itens';

  return (
    <div className="mx-auto max-w-sm py-12 text-center">
      <h3 className="mb-2 text-lg font-semibold text-[#111]">
        Nenhum {profile?.itemLabel || 'item'} ainda
      </h3>
      <p className="mb-6 text-sm leading-relaxed text-[#555]">
        Serviço definido. Crie o primeiro {profile?.itemLabel || 'item'} para
        começar a operar ({noun}).
      </p>
      {showCta && onCreate ? (
        <Button className="bg-[#007bff] hover:bg-[#0056b3]" onClick={onCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          {ctaText}
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

  return (
    <div className="space-y-8">
      {lens.groups.map((group, index) => (
        <section
          key={group.periodKey || group.cycleId || `group-${index}`}
          className="space-y-3"
        >
          {group.periodLabel ? (
            <div className="border-b border-[#eee] pb-2">
              <p className="text-[15px] font-semibold text-[#111]">
                {group.periodLabel}
              </p>
              <p className="text-xs text-[#555]">
                {group.units.length}{' '}
                {group.units.length === 1
                  ? lens.profile?.itemLabel || 'item'
                  : lens.profile?.itemLabelPlural || 'itens'}
              </p>
            </div>
          ) : null}
          <ul className="space-y-3">
            {group.units.map((unit) => (
              <UnitCard key={unit.id} unit={unit} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
