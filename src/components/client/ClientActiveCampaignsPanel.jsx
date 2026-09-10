import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  Clock,
  FileText,
  Megaphone,
  Plus,
  Target,
} from 'lucide-react';
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
    <li className="rounded-xl border border-[#E8E5F5]/80 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <Megaphone className="w-4 h-4 text-[#6C47D8] shrink-0" />
            <p className="font-semibold text-[#18162A] truncate">{campaign.name}</p>
          </div>
          <p className="text-xs text-[#7A7595]">{progressScopeLabel(campaign.progressScope)}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-bold text-[#18162A] tabular-nums">
            {progress.percentComplete}%
          </p>
          <p className="text-[11px] text-[#7A7595]">
            {progress.completed}/{progress.total} concluídas
          </p>
        </div>
      </div>

      <Progress value={progress.percentComplete} className="h-2 mt-3" />

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-[#7A7595]">
        <span className="inline-flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {progress.pending} pendente{progress.pending === 1 ? '' : 's'}
        </span>
        <span className="inline-flex items-center gap-1">
          <Target className="w-3.5 h-3.5" />
          {progress.inProgress} em andamento
        </span>
        {progress.overdue > 0 && (
          <span className="inline-flex items-center gap-1 text-[#E24B4A]">
            <AlertTriangle className="w-3.5 h-3.5" />
            {progress.overdue} atrasada{progress.overdue === 1 ? '' : 's'}
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline" className="h-8">
          <Link to={campaign.tasksHref}>
            Tarefas
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </Button>
        <Button asChild size="sm" variant="ghost" className="h-8">
          <Link to={campaign.href}>
            <FileText className="w-3.5 h-3.5 mr-1" />
            Briefing
          </Link>
        </Button>
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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base gap-2">
          <span className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-[#6C47D8]" />
            Campanhas em andamento
          </span>
          {campaigns.length > 0 && (
            <Badge variant="secondary">{campaigns.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {groups.length === 0 ? (
          <div className="text-center py-8 border border-dashed rounded-xl">
            <Megaphone className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-3">
              Nenhuma campanha ativa neste cliente
            </p>
            {showCreateCta && (
              <Button asChild size="sm">
                <Link to={newBriefHref}>
                  <Plus className="w-4 h-4 mr-1" />
                  Nova campanha
                </Link>
              </Button>
            )}
          </div>
        ) : (
          groups.map((group) => (
            <section key={group.cycleId || 'none'} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Calendar className="w-4 h-4 text-[#22C98A] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#18162A] truncate">
                      {group.cycleTitle}
                      {group.cyclePeriod ? ` · ${group.cyclePeriod}` : ''}
                    </p>
                    <p className="text-[11px] text-[#7A7595]">
                      {group.campaigns.length} campanha
                      {group.campaigns.length === 1 ? '' : 's'} neste período
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {group.cycleStatus && (
                    <Badge variant="secondary" className="text-[10px]">
                      {cycleStatusLabel(group.cycleStatus)}
                    </Badge>
                  )}
                  {group.cycleHref && (
                    <Button asChild variant="ghost" size="sm" className="h-7 px-2 gap-1">
                      <Link to={group.cycleHref}>
                        Workspace
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
              <ul className="space-y-3">
                {group.campaigns.map((campaign) => (
                  <CampaignRow key={campaign.id} campaign={campaign} />
                ))}
              </ul>
            </section>
          ))
        )}
      </CardContent>
    </Card>
  );
}
