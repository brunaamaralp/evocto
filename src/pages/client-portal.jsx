import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';
import { useSession } from '@/components/auth/SessionManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertCircle,
  RefreshCw,
  Loader2,
  HelpCircle,
  ClipboardList,
  CalendarRange,
  Megaphone,
  CircleCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import LoadingState from '@/components/shared/LoadingStates';
import EmptyState from '@/components/shared/EmptyState';
import EducationalMicrotexts from '@/components/client_portal/EducationalMicrotexts';
import {
  getClientPortalOverview,
  getClientAnnualPlan,
  listClientCampaigns,
  getClientCampaign,
  completeClientAction,
} from '@/lib/clientPortalApi';

function formatDue(dateStr) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return null;
  }
}

function NeedsFromYouList({ items, onComplete, busyId }) {
  if (!items?.length) {
    return (
      <EmptyState
        icon={CircleCheck}
        title="Nada pendente com você"
        description="Quando a agência precisar de algo, aparece aqui."
      />
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((action) => {
        const due = formatDue(action.dueDate);
        const done = action.status === 'completed';
        return (
          <li
            key={action.id}
            className="flex items-start gap-3 rounded-lg border bg-white px-3 py-2.5"
          >
            <Checkbox
              checked={done}
              disabled={done || busyId === action.id}
              onCheckedChange={(checked) => {
                if (checked) onComplete?.(action.id);
              }}
              className="mt-0.5"
              aria-label={`Concluir ${action.title}`}
            />
            <div className="min-w-0 flex-1">
              <p
                className={`text-sm font-medium ${
                  done ? 'text-gray-500 line-through' : 'text-gray-900'
                }`}
              >
                {action.title}
              </p>
              {action.description ? (
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                  {action.description}
                </p>
              ) : null}
              <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                {action.campaignName ? <span>{action.campaignName}</span> : null}
                {due ? <span>Prazo {due}</span> : null}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function CampaignFields({ campaign }) {
  const rows = [
    { label: 'Objetivo', value: campaign.objective },
    { label: 'Público', value: campaign.audience },
    { label: 'Produtos', value: campaign.products },
    { label: 'Ações', value: campaign.actions },
  ].filter((r) => r.value);

  const period =
    campaign.period?.start || campaign.period?.end
      ? [campaign.period.start, campaign.period.end].filter(Boolean).join(' → ')
      : null;

  return (
    <div className="space-y-4">
      {period ? (
        <p className="text-sm text-gray-600">
          <span className="font-medium text-gray-800">Período:</span> {period}
        </p>
      ) : null}
      {rows.map((row) => (
        <div key={row.label}>
          <h4 className="text-sm font-medium text-gray-800">{row.label}</h4>
          <p className="text-sm text-gray-600 whitespace-pre-wrap mt-1">{row.value}</p>
        </div>
      ))}
    </div>
  );
}

export default function ClientPortalPage() {
  const { user, isAuthenticated, loading: sessionLoading } = useSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  const campaignIdParam = searchParams.get('campaignId');

  const [overview, setOverview] = useState(null);
  const [plan, setPlan] = useState(null);
  const [campaigns, setCampaigns] = useState(null);
  const [campaignDetail, setCampaignDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busyActionId, setBusyActionId] = useState(null);

  const setTab = useCallback(
    (tab, extra = {}) => {
      const next = new URLSearchParams(searchParams);
      if (!tab || tab === 'overview') next.delete('tab');
      else next.set('tab', tab);
      if (extra.campaignId) next.set('campaignId', extra.campaignId);
      else next.delete('campaignId');
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const loadOverview = useCallback(async () => {
    const data = await getClientPortalOverview();
    setOverview(data);
    return data;
  }, []);

  useEffect(() => {
    if (sessionLoading) return;
    if (!isAuthenticated || user?.role !== 'client') return;

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await loadOverview();
        if (!cancelled) setOverview(data);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Erro ao carregar o portal');
          toast.error('Erro ao carregar o portal');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionLoading, isAuthenticated, user?.role, loadOverview]);

  useEffect(() => {
    if (!overview || user?.role !== 'client') return;
    let cancelled = false;

    (async () => {
      try {
        setTabLoading(true);
        if (activeTab === 'plan' && !plan) {
          const year = overview.annualPlan?.year || new Date().getFullYear();
          const data = await getClientAnnualPlan(year);
          if (!cancelled) setPlan(data.plan);
        }
        if (activeTab === 'campaigns' && !campaigns) {
          const data = await listClientCampaigns();
          if (!cancelled) setCampaigns(data.campaigns || []);
        }
        if (activeTab === 'campaigns' && campaignIdParam) {
          const data = await getClientCampaign(campaignIdParam);
          if (!cancelled) setCampaignDetail(data.campaign || null);
        } else if (activeTab === 'campaigns' && !campaignIdParam) {
          if (!cancelled) setCampaignDetail(null);
        }
      } catch (err) {
        if (!cancelled) toast.error(err.message || 'Erro ao carregar dados');
      } finally {
        if (!cancelled) setTabLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeTab, overview, plan, campaigns, campaignIdParam, user?.role]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      setPlan(null);
      setCampaigns(null);
      setCampaignDetail(null);
      await loadOverview();
      toast.success('Dados atualizados');
    } catch (err) {
      setError(err.message);
      toast.error('Erro ao atualizar');
    } finally {
      setRefreshing(false);
    }
  };

  const handleComplete = async (actionId) => {
    setBusyActionId(actionId);
    try {
      await completeClientAction(actionId);
      toast.success('Pendência concluída');
      setPlan(null);
      setCampaigns(null);
      setCampaignDetail(null);
      await loadOverview();
      if (campaignIdParam) {
        const data = await getClientCampaign(campaignIdParam);
        setCampaignDetail(data.campaign || null);
      }
    } catch (err) {
      toast.error(err.message || 'Não foi possível concluir');
    } finally {
      setBusyActionId(null);
    }
  };

  if (sessionLoading || loading) {
    return <LoadingState message="Carregando seu portal..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/client-login" replace />;
  }

  if (user?.role !== 'client') {
    return <Navigate to="/dashboard" replace />;
  }

  if (error && !overview) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-800">Não foi possível carregar o portal</h3>
              <p className="text-red-700 mt-1 text-sm">{error}</p>
              <Button className="mt-4" variant="outline" onClick={handleRefresh}>
                Tentar novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = overview?.stats || {};
  const clientName = overview?.client?.name || user?.full_name || 'Cliente';
  const upcoming = overview?.upcomingCampaigns || [];
  const needs = overview?.needsFromYou || [];

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">
            Olá, {clientName}
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Acompanhe o planejamento e o que precisamos de você
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          variant="outline"
          className="w-full sm:w-auto shrink-0"
        >
          {refreshing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Atualizar
        </Button>
      </div>

      <Tabs
        value={activeTab === 'campaigns' && campaignIdParam ? 'campaigns' : activeTab}
        onValueChange={(tab) => setTab(tab)}
        className="space-y-6"
      >
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="inline-flex w-max min-w-full gap-1 h-auto">
            <TabsTrigger value="overview" className="shrink-0 gap-2">
              <ClipboardList className="w-4 h-4" />
              <span className="hidden sm:inline">Visão geral</span>
            </TabsTrigger>
            <TabsTrigger value="plan" className="shrink-0 gap-2">
              <CalendarRange className="w-4 h-4" />
              <span className="hidden sm:inline">Planejamento</span>
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="shrink-0 gap-2">
              <Megaphone className="w-4 h-4" />
              <span className="hidden sm:inline">Campanhas</span>
              {stats.sharedCampaigns > 0 ? (
                <Badge variant="secondary" className="ml-1">
                  {stats.sharedCampaigns}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="help" className="shrink-0 gap-2">
              <HelpCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Ajuda</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Próximas campanhas</CardTitle>
              </CardHeader>
              <CardContent>
                {upcoming.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    Nenhuma campanha compartilhada no momento.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {upcoming.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          className="w-full text-left rounded-lg border px-3 py-2 hover:bg-slate-50"
                          onClick={() => setTab('campaigns', { campaignId: c.id })}
                        >
                          <p className="text-sm font-medium text-gray-900">{c.name}</p>
                          <p className="text-xs text-gray-500">
                            {c.month
                              ? `${String(c.month).padStart(2, '0')}/${c.year || ''}`
                              : c.period?.start || 'Em andamento'}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {overview?.annualPlan ? (
                  <Button
                    variant="link"
                    className="px-0 mt-2"
                    onClick={() => setTab('plan')}
                  >
                    Ver planejamento {overview.annualPlan.year}
                  </Button>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Precisamos de você</CardTitle>
                {stats.openClientActions > 0 ? (
                  <Badge variant="secondary">{stats.openClientActions}</Badge>
                ) : null}
              </CardHeader>
              <CardContent>
                <NeedsFromYouList
                  items={needs}
                  onComplete={handleComplete}
                  busyId={busyActionId}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="plan" className="space-y-4">
          {tabLoading && !plan ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : !plan ? (
            <EmptyState
              icon={CalendarRange}
              title="Nenhum planejamento compartilhado"
              description="Quando a agência compartilhar o planejamento anual, ele aparece aqui."
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>{plan.title || `Planejamento ${plan.year}`}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {(plan.months || []).map((m) => {
                    const clickable = m.status === 'shared' && m.campaignId;
                    const content = (
                      <>
                        <p className="text-xs font-semibold uppercase text-gray-500">
                          {m.label?.slice(0, 3) || m.month}
                        </p>
                        <p className="text-sm font-medium text-gray-900 line-clamp-2 mt-1">
                          {m.campaignName || (m.status === 'empty' ? '—' : 'Planejado')}
                        </p>
                        {m.status === 'planned' ? (
                          <Badge variant="outline" className="mt-2 text-[10px]">
                            Planejado
                          </Badge>
                        ) : null}
                        {m.status === 'shared' ? (
                          <Badge className="mt-2 text-[10px]">Campanha</Badge>
                        ) : null}
                      </>
                    );
                    if (clickable) {
                      return (
                        <button
                          key={m.month}
                          type="button"
                          className="rounded-lg border p-3 text-left hover:bg-slate-50"
                          onClick={() =>
                            setTab('campaigns', { campaignId: m.campaignId })
                          }
                        >
                          {content}
                        </button>
                      );
                    }
                    return (
                      <div key={m.month} className="rounded-lg border p-3 bg-slate-50/50">
                        {content}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          {campaignIdParam && campaignDetail ? (
            <div className="space-y-4">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-2"
                onClick={() => setTab('campaigns')}
              >
                ← Todas as campanhas
              </Button>
              <Card>
                <CardHeader>
                  <CardTitle>{campaignDetail.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CampaignFields campaign={campaignDetail} />
                  {(campaignDetail.clientActions || []).some((a) => a.status === 'pending') ? (
                    <div className="mt-6">
                      <h4 className="text-sm font-medium mb-2">Pendências</h4>
                      <NeedsFromYouList
                        items={(campaignDetail.clientActions || []).filter(
                          (a) => a.status === 'pending'
                        )}
                        onComplete={handleComplete}
                        busyId={busyActionId}
                      />
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          ) : tabLoading && !campaigns ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : !campaigns?.length ? (
            <EmptyState
              icon={Megaphone}
              title="Nenhuma campanha compartilhada"
              description="Campanhas liberadas pela agência aparecerão aqui."
            />
          ) : (
            <div className="grid gap-2">
              {campaigns.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="rounded-lg border bg-white px-4 py-3 text-left hover:bg-slate-50"
                  onClick={() => setTab('campaigns', { campaignId: c.id })}
                >
                  <p className="font-medium text-gray-900">{c.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {c.objective ? String(c.objective).slice(0, 120) : 'Abrir detalhes'}
                  </p>
                </button>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="help">
          <EducationalMicrotexts />
        </TabsContent>
      </Tabs>
    </div>
  );
}
