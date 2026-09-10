import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  AlertTriangle,
  Clock,
  Lock,
  ListTodo,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { useSession } from '@/components/auth/SessionManager';
import { Service, Task, Profile } from '@/api/entities';
import { createPageUrl } from '@/utils';
import {
  PERSONAS,
  normalizePersona,
  filterTasksForPersona,
  buildOrchestrationRows,
  buildPendingGates,
} from '@/lib/personaDashboard';
import { createCampaignShareLink } from '@/lib/campaignShare';
import { toast } from 'sonner';

function dueTone(daysLeft) {
  if (daysLeft == null) return 'text-slate-500';
  if (daysLeft < 0) return 'text-red-700';
  if (daysLeft <= 1) return 'text-red-700';
  if (daysLeft <= 2) return 'text-amber-700';
  return 'text-emerald-700';
}

export default function PersonaDashboardPage() {
  const params = useParams();
  const navigate = useNavigate();
  const { agencyId, user, loading: sessionLoading } = useSession();
  const persona = normalizePersona(params.persona || 'bruna');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [services, setServices] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [busyShare, setBusyShare] = useState(null);

  const meta = PERSONAS.find((p) => p.value === persona);

  const load = useCallback(async () => {
    if (!agencyId) return;
    setLoading(true);
    setError(null);
    try {
      const [svc, tsk, prof] = await Promise.all([
        Service.filter({ agencyId, is_template: false }, '-updated_date', 80).catch(() => []),
        Task.filter({ agencyId }, '-dueDate', 200).catch(() => []),
        Profile.filter({ agencyId }).catch(() => []),
      ]);
      setServices(Array.isArray(svc) ? svc : []);
      setTasks(Array.isArray(tsk) ? tsk : []);
      setProfiles(Array.isArray(prof) ? prof : []);
    } catch (err) {
      setError(err?.message || 'Falha ao carregar dashboard');
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (persona === 'cliente' && user?.role === 'client') {
      navigate(createPageUrl('client-portal'), { replace: true });
    }
  }, [persona, user?.role, navigate]);

  const myTasks = useMemo(
    () =>
      filterTasksForPersona(tasks, persona, profiles, user?.id || user?.data?.id).sort(
        (a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0)
      ),
    [tasks, persona, profiles, user]
  );

  const orchestration = useMemo(
    () => (persona === 'bruna' ? buildOrchestrationRows(services, tasks) : []),
    [persona, services, tasks]
  );

  const gates = useMemo(
    () =>
      persona === 'cliente' || persona === 'influencer'
        ? buildPendingGates(services, persona)
        : [],
    [persona, services]
  );

  const handleSendShare = async (serviceId) => {
    setBusyShare(serviceId);
    try {
      const result = await createCampaignShareLink({
        serviceId,
        gatekeeper: persona === 'influencer' ? 'influencer' : 'cliente',
        actorId: user?.id || user?.data?.id,
      });
      await navigator.clipboard?.writeText?.(result.url).catch(() => {});
      toast.success('Link gerado e copiado', { description: result.url });
      await load();
    } catch (err) {
      toast.error(err?.message || 'Falha ao gerar link');
    } finally {
      setBusyShare(null);
    }
  };

  if (sessionLoading || loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Carregando dashboard {meta?.label}…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-700">{error}</p>
        <Button className="mt-3" variant="outline" onClick={load}>
          Tentar de novo
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Dashboard · {meta?.label}
          </h1>
          <p className="text-sm text-slate-500">{meta?.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {PERSONAS.map((p) => (
            <Button
              key={p.value}
              size="sm"
              variant={p.value === persona ? 'default' : 'outline'}
              onClick={() => navigate(`/dashboard/${p.value}`)}
            >
              {p.label}
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={load}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="shadow-none">
          <CardContent className="pt-4">
            <div className="text-xs text-slate-500">Fila aberta</div>
            <div className="text-2xl font-semibold">{myTasks.length}</div>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardContent className="pt-4">
            <div className="text-xs text-slate-500">Campanhas ativas</div>
            <div className="text-2xl font-semibold">
              {persona === 'bruna' ? orchestration.length : services.filter((s) => !s.is_template).length}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardContent className="pt-4">
            <div className="text-xs text-slate-500">Gates pendentes</div>
            <div className="text-2xl font-semibold">
              {persona === 'bruna'
                ? orchestration.filter((r) => r.blockedPhases.length).length
                : gates.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {persona === 'bruna' && (
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Campanhas · orquestração</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {orchestration.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhuma campanha Narrativa ativa.</p>
            ) : (
              orchestration.map((row) => (
                <div
                  key={row.serviceId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-100 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-900">{row.name}</div>
                    <div className="flex flex-wrap gap-1 text-[11px] text-slate-500">
                      {row.activePhase ? <span>{row.activePhase}</span> : null}
                      {row.tipo_campanha ? <Badge variant="outline">{row.tipo_campanha}</Badge> : null}
                      {row.ciclo_comercial ? (
                        <Badge variant="secondary">{row.ciclo_comercial}</Badge>
                      ) : null}
                      {row.blockedPhases.map((b) => (
                        <Badge key={b} variant="outline" className="border-amber-300 text-amber-800">
                          <Lock className="mr-1 h-3 w-3" />
                          {b}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {row.daysLeft != null ? (
                      <span className={`text-xs font-medium ${dueTone(row.daysLeft)}`}>
                        {row.daysLeft < 0
                          ? `${Math.abs(row.daysLeft)}d atrasado`
                          : `${row.daysLeft}d`}
                      </span>
                    ) : null}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={busyShare === row.serviceId}
                      onClick={() => handleSendShare(row.serviceId)}
                    >
                      {busyShare === row.serviceId ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        'Enviar p/ cliente'
                      )}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" asChild>
                      <Link
                        to={createPageUrl(
                          `delivery-workspace?serviceId=${row.serviceId}&section=overview`
                        )}
                      >
                        Abrir
                      </Link>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {(persona === 'cliente' || persona === 'influencer') && (
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Aguardando sua aprovação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {gates.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhum gate pendente.</p>
            ) : (
              gates.map((g) => (
                <div
                  key={`${g.serviceId}-${g.deliverableId}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
                >
                  <div>
                    <div className="text-sm font-medium">{g.serviceName}</div>
                    <div className="text-xs text-slate-500">
                      {g.phaseName}
                      {g.due ? ` · até ${g.due}` : ''}
                    </div>
                  </div>
                  {g.shareUrl ? (
                    <Button size="sm" asChild>
                      <a href={g.shareUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="mr-1 h-3.5 w-3.5" />
                        Abrir link
                      </a>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyShare === g.serviceId}
                      onClick={() => handleSendShare(g.serviceId)}
                    >
                      Gerar link
                    </Button>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      <Card className="shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ListTodo className="h-4 w-4" />
            {persona === 'bruna' ? 'Tarefas abertas' : 'Minha fila'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {myTasks.length === 0 ? (
            <p className="text-sm text-slate-500">Nada na fila agora.</p>
          ) : (
            myTasks.slice(0, 40).map((t) => (
              <div
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-100 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-900">{t.title}</div>
                  <div className="flex flex-wrap gap-1 text-[11px] text-slate-500">
                    <Badge variant="outline">{t.status}</Badge>
                    {t.gatekeeper ? (
                      <Badge variant="outline">
                        <Lock className="mr-1 h-3 w-3" />
                        {t.gatekeeper}
                      </Badge>
                    ) : null}
                    {t.parentTaskId ? <span>subtarefa</span> : null}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {t.dueDate ? (
                    <span className="inline-flex items-center gap-1 text-slate-600">
                      <Clock className="h-3 w-3" />
                      {String(t.dueDate).slice(0, 10)}
                    </span>
                  ) : null}
                  {t.serviceId ? (
                    <Button size="sm" variant="ghost" className="h-7 text-xs" asChild>
                      <Link
                        to={createPageUrl(
                          `delivery-workspace?serviceId=${t.serviceId}&section=tasks`
                        )}
                      >
                        Abrir
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 text-sm">
        <Button variant="outline" asChild>
          <Link to={createPageUrl('campaigns-performance')}>Performance (12 campanhas)</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to={createPageUrl('campaign-insights')}>Insights & recomendações</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to={createPageUrl('dashboard')}>Dashboard geral</Link>
        </Button>
      </div>

      {persona === 'bruna' && orchestration.some((r) => r.daysLeft != null && r.daysLeft < 0) ? (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          Há campanhas com SLA atrasado — priorize gates em vermelho.
        </div>
      ) : null}
    </div>
  );
}
