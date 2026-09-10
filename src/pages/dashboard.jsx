import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AlertCircle,
  ArrowRight,
  CheckSquare,
  Clock,
  FileText,
  Loader2,
  Megaphone,
  Plus,
  RefreshCw,
  Users,
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
 * Dashboard operacional — campanhas ativas por cliente.
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
          return {
            id: t.id,
            title: t.title,
            dueDate: new Date(t.dueDate).toLocaleDateString(),
            priority: t.priority || 'medium',
            clientName: client?.name || null,
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erro ao carregar</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={loadDashboardData} className="flex items-center mx-auto">
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  const { stats, campaignGroups, upcomingTasks } = dashboardData;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#18162A]">Dashboard</h1>
          <p className="text-[#7A7595] mt-1">
            Campanhas ativas por cliente
          </p>
        </div>
        <div className="flex flex-wrap gap-6 sm:gap-8">
          <div className="evocto-kpi">
            <span className="evocto-kpi-value">{stats.activeCampaigns}</span>
            <span className="evocto-kpi-label">Campanhas ativas</span>
          </div>
          <div className="evocto-kpi">
            <span className="evocto-kpi-value">{stats.clientsWithCampaigns}</span>
            <span className="evocto-kpi-label">Clientes com campanha</span>
          </div>
          <div className="evocto-kpi">
            <span className="evocto-kpi-value">{stats.pendingTasks}</span>
            <span className="evocto-kpi-label">Tarefas pendentes</span>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
          <CardTitle className="flex items-center text-base">
            <Megaphone className="h-5 w-5 mr-2 text-[#6C47D8]" />
            Campanhas em andamento
          </CardTitle>
          <Button asChild size="sm" variant="outline" className="rounded-xl">
            <Link to={createPageUrl('clients')}>
              <Users className="h-4 w-4 mr-1" />
              Ver clientes
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {campaignGroups.length === 0 ? (
            <div className="text-center py-10 border border-dashed rounded-xl">
              <Megaphone className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-[#18162A] font-medium mb-1">
                Nenhuma campanha ativa no momento
              </p>
              <p className="text-sm text-[#7A7595] mb-4">
                Abra um cliente e crie a campanha do mês para começar a operar.
              </p>
              <Button asChild size="sm">
                <Link to={createPageUrl('clients')}>
                  <Plus className="w-4 h-4 mr-1" />
                  Ir para clientes
                </Link>
              </Button>
            </div>
          ) : (
            campaignGroups.map((group) => (
              <section key={group.clientId} className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      to={group.href}
                      className="text-sm font-semibold text-[#18162A] hover:text-[#6C47D8] truncate block"
                    >
                      {group.clientName}
                    </Link>
                    <p className="text-[11px] text-[#7A7595]">
                      {group.campaigns.length} campanha
                      {group.campaigns.length === 1 ? '' : 's'} ativa
                      {group.campaigns.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <Button asChild size="sm" variant="ghost" className="h-8 gap-1">
                    <Link to={createPageUrl(`briefing-campanha?clientId=${group.clientId}`)}>
                      <Plus className="w-3.5 h-3.5" />
                      Nova campanha
                    </Link>
                  </Button>
                </div>
                <ul className="space-y-2">
                  {group.campaigns.map((campaign) => (
                    <li
                      key={campaign.id}
                      className="rounded-xl border border-[#E8E5F5]/80 bg-[#FAFAFC] p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-[#18162A] truncate">{campaign.name}</p>
                          <p className="text-xs text-[#7A7595] mt-0.5">
                            {campaign.cycleTitle || campaign.cyclePeriod || 'Sem ciclo vinculado'}
                            {campaign.progress.total > 0
                              ? ` · ${campaign.progress.completed}/${campaign.progress.total} tarefas`
                              : ' · Sem tarefas vinculadas'}
                          </p>
                        </div>
                        <p className="text-xl font-bold text-[#18162A] tabular-nums shrink-0">
                          {campaign.progress.percentComplete}%
                        </p>
                      </div>
                      {campaign.progress.total > 0 && (
                        <Progress
                          value={campaign.progress.percentComplete}
                          className="h-1.5 mt-3"
                        />
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button asChild size="sm" variant="outline" className="h-8">
                          <Link to={campaign.tasksHref}>
                            Tarefas
                            <ArrowRight className="w-3.5 h-3.5 ml-1" />
                          </Link>
                        </Button>
                        <Button asChild size="sm" variant="ghost" className="h-8">
                          <Link to={group.href}>
                            Cliente
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
                  ))}
                </ul>
              </section>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <Clock className="h-5 w-5 mr-2 text-[#E8955A]" />
              Próximas tarefas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingTasks.length === 0 ? (
              <p className="text-sm text-[#7A7595]">Nenhuma tarefa com prazo próximo.</p>
            ) : (
              <div className="space-y-4">
                {upcomingTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#18162A] truncate">{task.title}</p>
                      <p className="text-xs text-[#7A7595]">
                        {task.clientName ? `${task.clientName} · ` : ''}
                        Vence em {task.dueDate}
                      </p>
                    </div>
                    <Badge
                      variant={
                        task.priority === 'high'
                          ? 'destructive'
                          : task.priority === 'medium'
                            ? 'default'
                            : 'secondary'
                      }
                    >
                      {task.priority === 'high'
                        ? 'Alta'
                        : task.priority === 'medium'
                          ? 'Média'
                          : 'Baixa'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-[#F5F2FC]/60 border-[#E8E5F5]">
          <CardHeader>
            <CardTitle className="text-base">Ações rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link to={createPageUrl('clients')}>
                <Button variant="outline" className="w-full justify-start rounded-xl bg-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Clientes
                </Button>
              </Link>
              <Link to={createPageUrl('tasks-manager')}>
                <Button variant="outline" className="w-full justify-start rounded-xl bg-white">
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Tarefas
                </Button>
              </Link>
              <Link to={createPageUrl('campaigns-performance')}>
                <Button variant="outline" className="w-full justify-start rounded-xl bg-white">
                  <Megaphone className="h-4 w-4 mr-2" />
                  Performance
                </Button>
              </Link>
              <Link to={createPageUrl('library')}>
                <Button variant="outline" className="w-full justify-start rounded-xl bg-white">
                  <FileText className="h-4 w-4 mr-2" />
                  Biblioteca
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
