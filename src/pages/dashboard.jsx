import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  AlertCircle,
  ArrowRight,
  Loader2,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { useSession } from '@/components/auth/SessionManager';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Client } from '@/api/entities';
import { Service } from '@/api/entities';
import { Task } from '@/api/entities';
import { Brief } from '@/api/entities';
import { CyclePlan } from '@/api/entities';
import { deriveActiveCampaigns } from '@/hooks/useClientHubData';
import { buildClientCampaignHref } from '@/lib/campaignHref';
import { buildClientTasksHref } from '@/lib/taskScope';

async function safeFilter(entity, filters) {
  try {
    const result = await entity.filter(filters);
    return Array.isArray(result) ? result : [];
  } catch (err) {
    console.warn('[dashboard] filter failed:', err?.message || err);
    return [];
  }
}

function groupCampaignsByClient(clients, briefs, cycles, tasks, services) {
  const groups = [];

  for (const client of clients) {
    const clientId = client.id;
    const clientBriefs = briefs.filter(
      (b) =>
        String(b.clientId || '') === String(clientId) ||
        String(b.projectId || '') === String(clientId)
    );
    const clientCycles = cycles.filter((c) => String(c.clientId || '') === String(clientId));
    const clientTasks = tasks.filter((t) => String(t.clientId || '') === String(clientId));
    const clientServices = services.filter((s) => String(s.clientId || '') === String(clientId));

    const campaigns = deriveActiveCampaigns({
      briefs: clientBriefs,
      cycles: clientCycles,
      tasks: clientTasks,
      services: clientServices,
      clientId,
    });

    if (campaigns.length === 0) continue;

    groups.push({
      clientId,
      clientName: client.name || 'Cliente',
      clientStatus: client.status,
      href: createPageUrl(`client-detail?clientId=${clientId}`),
      campaigns,
    });
  }

  return groups.sort((a, b) => a.clientName.localeCompare(b.clientName));
}

/**
 * Home operacional — campanhas ativas (filosofia Apple: 1 foco, 1 CTA).
 */
export default function DashboardPage() {
  const { agencyId, loading: sessionLoading } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!agencyId) {
        setError('ID da organização não encontrado.');
        setLoading(false);
        return;
      }

      const [clients, services, tasks, briefs, cycles] = await Promise.all([
        safeFilter(Client, { agencyId }),
        safeFilter(Service, { agencyId, is_template: false }),
        safeFilter(Task, { agencyId }),
        safeFilter(Brief, { agencyId }),
        safeFilter(CyclePlan, { agencyId }),
      ]);

      const activeClients = clients.filter((c) => c.status === 'ativo');
      const clientsForCampaigns = activeClients.length > 0 ? activeClients : clients;

      const campaignGroups = groupCampaignsByClient(
        clientsForCampaigns,
        briefs,
        cycles,
        tasks,
        services
      );

      const activeCampaignsCount = campaignGroups.reduce(
        (sum, g) => sum + g.campaigns.length,
        0
      );
      const clientsWithCampaigns = campaignGroups.length;

      const pendingTasks = tasks.filter((t) =>
        ['todo', 'in_progress', 'pending', 'blocked'].includes(String(t.status || ''))
      ).length;

      const upcomingTasks = tasks
        .filter((t) => t.dueDate && ['todo', 'in_progress', 'pending'].includes(String(t.status || '')))
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .slice(0, 5)
        .map((t) => {
          const client = clients.find((c) => String(c.id) === String(t.clientId));
          const briefingId = t.briefingId || t.briefId || null;
          const href = briefingId
            ? createPageUrl(
                buildClientCampaignHref({
                  clientId: t.clientId,
                  briefingId,
                })
              )
            : t.clientId
              ? createPageUrl(buildClientTasksHref({ clientId: t.clientId }))
              : createPageUrl('tasks-manager');
          return {
            id: t.id,
            title: t.title,
            dueDate: new Date(t.dueDate).toLocaleDateString(),
            priority: t.priority || 'medium',
            clientName: client?.name || null,
            href,
          };
        });

      setDashboardData({
        stats: {
          activeCampaigns: activeCampaignsCount,
          clientsWithCampaigns,
          pendingTasks,
          activeClients: activeClients.length || clients.length,
        },
        campaignGroups,
        upcomingTasks,
      });
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
      setError(`Erro ao carregar dados: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => {
    if (!sessionLoading && agencyId) {
      loadDashboardData();
    }
  }, [sessionLoading, agencyId, loadDashboardData]);

  if (sessionLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-7 w-7 animate-spin text-[#007bff]" aria-hidden />
          <p className="text-sm text-[#555]">Carregando campanhas…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6">
        <div className="max-w-md text-center">
          <AlertCircle className="mx-auto mb-4 h-10 w-10 text-[#c0392b]" aria-hidden />
          <h2 className="mb-2 text-xl font-semibold text-[#111]">Erro ao carregar</h2>
          <p className="mb-5 text-sm text-[#555]">{error}</p>
          <Button onClick={loadDashboardData} className="bg-[#007bff] hover:bg-[#0056b3]">
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  const { stats, campaignGroups, upcomingTasks } = dashboardData;
  const hasCampaigns = campaignGroups.length > 0;

  return (
    <div className="mx-auto max-w-4xl space-y-10 px-1 pb-8 sm:px-0">
      {/* Header — 1 título, meta discreta, 1 CTA */}
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-2">
          <h1 className="text-[1.375rem] font-bold tracking-tight text-[#111] sm:text-[1.5rem]">
            Campanhas
          </h1>
          <p className="text-sm text-[#555]">
            {stats.activeCampaigns} ativa{stats.activeCampaigns === 1 ? '' : 's'}
            {' · '}
            {stats.clientsWithCampaigns} cliente{stats.clientsWithCampaigns === 1 ? '' : 's'}
            {stats.pendingTasks > 0
              ? ` · ${stats.pendingTasks} tarefa${stats.pendingTasks === 1 ? '' : 's'} pendente${stats.pendingTasks === 1 ? '' : 's'}`
              : ''}
          </p>
        </div>
        <Button asChild className="w-full shrink-0 bg-[#007bff] hover:bg-[#0056b3] sm:w-auto">
          <Link to={createPageUrl('clients')}>
            <Plus className="mr-1.5 h-4 w-4" />
            {hasCampaigns ? 'Nova campanha' : 'Começar'}
          </Link>
        </Button>
      </header>

      {/* Foco principal: lista de campanhas */}
      <section aria-labelledby="campaigns-heading">
        <h2 id="campaigns-heading" className="sr-only">
          Campanhas em andamento
        </h2>

        {!hasCampaigns ? (
          <div className="mx-auto max-w-sm py-16 text-center">
            <h3 className="mb-2 text-lg font-semibold text-[#111]">
              Nenhuma campanha ativa
            </h3>
            <p className="mb-6 text-sm leading-relaxed text-[#555]">
              Abra um cliente e crie a campanha do mês para começar a operar.
            </p>
            <Button asChild className="bg-[#007bff] hover:bg-[#0056b3]">
              <Link to={createPageUrl('clients')}>
                Ir para clientes
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-10">
            {campaignGroups.map((group) => (
              <section key={group.clientId} className="space-y-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#eee] pb-2">
                  <Link
                    to={group.href}
                    className="text-[15px] font-semibold text-[#111] hover:text-[#007bff]"
                  >
                    {group.clientName}
                  </Link>
                  <span className="text-xs text-[#555]">
                    {group.campaigns.length} campanha
                    {group.campaigns.length === 1 ? '' : 's'}
                  </span>
                </div>

                <ul className="space-y-3">
                  {group.campaigns.map((campaign) => (
                    <li
                      key={campaign.id}
                      className="rounded-xl border border-[#eee] bg-white p-5 transition-colors hover:border-[#ddd]"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <Link
                            to={campaign.href}
                            className="block truncate text-base font-semibold text-[#111] hover:text-[#007bff]"
                          >
                            {campaign.name}
                          </Link>
                          {(() => {
                            const subtitle = [
                              campaign.cyclePeriod || campaign.cycleTitle,
                              campaign.progress.total > 0
                                ? `${campaign.progress.completed}/${campaign.progress.total} tarefas`
                                : null,
                            ]
                              .filter(Boolean)
                              .join(' · ');
                            return subtitle ? (
                              <p className="mt-1 text-sm text-[#555]">{subtitle}</p>
                            ) : null;
                          })()}
                        </div>
                        <p className="shrink-0 text-xl font-bold tabular-nums text-[#111]">
                          {campaign.progress.percentComplete}%
                        </p>
                      </div>

                      {campaign.progress.total > 0 && (
                        <Progress
                          value={campaign.progress.percentComplete}
                          className="mt-4 h-1.5"
                        />
                      )}

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
                          to={group.href}
                          className="text-sm font-medium text-[#555] hover:text-[#111]"
                        >
                          Cliente
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>

                <div>
                  <Link
                    to={createPageUrl(`briefing-campanha?clientId=${group.clientId}`)}
                    className="text-sm font-medium text-[#007bff] hover:underline"
                  >
                    + Nova campanha neste cliente
                  </Link>
                </div>
              </section>
            ))}
          </div>
        )}
      </section>

      {/* Secundário: próximas tarefas — só se houver */}
      {upcomingTasks.length > 0 ? (
        <section aria-labelledby="tasks-heading" className="border-t border-[#eee] pt-8">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 id="tasks-heading" className="text-sm font-semibold uppercase tracking-wide text-[#555]">
              Próximas tarefas
            </h2>
            <Link
              to={createPageUrl('tasks-manager')}
              className="text-sm font-medium text-[#007bff] hover:underline"
            >
              Ver todas
            </Link>
          </div>
          <ul className="space-y-1">
            {upcomingTasks.map((task) => (
              <li key={task.id}>
                <Link
                  to={task.href}
                  className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-[#f9f9f9]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#111]">{task.title}</p>
                    <p className="text-xs text-[#555]">
                      {task.clientName ? `${task.clientName} · ` : ''}
                      Vence em {task.dueDate}
                    </p>
                  </div>
                  {task.priority === 'high' ? (
                    <span className="shrink-0 text-xs font-semibold text-[#c0392b]">Alta</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
