import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, Plus } from 'lucide-react';
import { createPageUrl } from '@/utils';

function cycleStatusLabel(status) {
  switch (status) {
    case 'in_execution':
      return 'Em execução';
    case 'approved':
      return 'Aprovado';
    default:
      return status || '—';
  }
}

function progressScopeLabel(scope) {
  if (scope === 'none') return 'Sem tarefas vinculadas ainda';
  return 'Progresso';
}

function groupByCycle(campaigns = []) {
  const groups = new Map();
  for (const campaign of campaigns) {
    const key = campaign.cycleId || '_none';
    if (!groups.has(key)) {
      groups.set(key, {
        cycleId: campaign.cycleId,
        cycleTitle: campaign.cycleTitle || 'Sem ciclo vinculado',
        cycleStatus: campaign.cycleStatus,
        cyclePeriod: campaign.cyclePeriod,
        cycleHref: campaign.cycleHref,
        campaigns: [],
      });
    }
    groups.get(key).campaigns.push(campaign);
  }
  return Array.from(groups.values());
}

function CampaignRow({ campaign }) {
  const { progress } = campaign;

  return (
    <li className="rounded-xl border border-[#eee] bg-white p-5 transition-colors hover:border-[#ddd]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link
            to={campaign.href}
            className="block truncate text-base font-semibold text-[#111] hover:text-[#007bff]"
          >
            {campaign.name}
          </Link>
          <p className="mt-1 text-sm text-[#555]">{progressScopeLabel(campaign.progressScope)}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xl font-bold tabular-nums text-[#111]">
            {progress.percentComplete}%
          </p>
          <p className="text-xs text-[#555]">
            {progress.completed}/{progress.total} concluídas
          </p>
        </div>
      </div>

      {progress.total > 0 ? (
        <Progress value={progress.percentComplete} className="mt-4 h-1.5" />
      ) : null}

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#555]">
        <span>
          {progress.pending} pendente{progress.pending === 1 ? '' : 's'}
        </span>
        <span>
          {progress.inProgress} em andamento
        </span>
        {progress.overdue > 0 ? (
          <span className="font-medium text-[#c0392b]">
            {progress.overdue} atrasada{progress.overdue === 1 ? '' : 's'}
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button asChild size="sm" className="bg-[#007bff] hover:bg-[#0056b3]">
          <Link to={campaign.href}>
            Abrir
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
        <Link
          to={campaign.tasksHref}
          className="text-sm font-medium text-[#555] hover:text-[#111]"
        >
          Tarefas
        </Link>
        <Link
          to={campaign.briefingHref || campaign.href}
          className="text-sm font-medium text-[#555] hover:text-[#111]"
        >
          Briefing
        </Link>
      </div>
    </li>
  );
}

export default function ClientActiveCampaignsPanel({
  clientId,
  campaigns = [],
  showCreateCta = true,
}) {
  const groups = groupByCycle(campaigns);
  const newBriefHref = createPageUrl(`briefing-campanha?clientId=${clientId}`);

  return (
    <section aria-labelledby="campaigns-panel-heading" className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="campaigns-panel-heading"
          className="text-sm font-semibold uppercase tracking-wide text-[#555]"
        >
          Campanhas em andamento
          {campaigns.length > 0 ? ` · ${campaigns.length}` : ''}
        </h2>
      </div>

      {groups.length === 0 ? (
        <div className="mx-auto max-w-sm py-12 text-center">
          <h3 className="mb-2 text-lg font-semibold text-[#111]">
            Nenhuma campanha ativa
          </h3>
          <p className="mb-6 text-sm leading-relaxed text-[#555]">
            Crie a campanha do mês para começar a operar neste cliente.
          </p>
          {showCreateCta ? (
            <Button asChild className="bg-[#007bff] hover:bg-[#0056b3]">
              <Link to={newBriefHref}>
                <Plus className="mr-1.5 h-4 w-4" />
                Nova campanha
              </Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.cycleId || 'none'} className="space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#eee] pb-2">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-[#111]">
                    {group.cycleTitle}
                    {group.cyclePeriod ? ` · ${group.cyclePeriod}` : ''}
                  </p>
                  <p className="text-xs text-[#555]">
                    {group.campaigns.length} campanha
                    {group.campaigns.length === 1 ? '' : 's'}
                    {group.cycleStatus
                      ? ` · ${cycleStatusLabel(group.cycleStatus)}`
                      : ''}
                  </p>
                </div>
                {group.cycleHref ? (
                  <Link
                    to={group.cycleHref}
                    className="shrink-0 text-sm font-medium text-[#555] hover:text-[#111]"
                  >
                    Workspace
                  </Link>
                ) : null}
              </div>
              <ul className="space-y-3">
                {group.campaigns.map((campaign) => (
                  <CampaignRow key={campaign.id} campaign={campaign} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
