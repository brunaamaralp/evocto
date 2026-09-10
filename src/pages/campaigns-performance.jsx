import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, BarChart3 } from 'lucide-react';
import { useSession } from '@/components/auth/SessionManager';
import { CyclePlan } from '@/api/entities';
import { createPageUrl } from '@/utils';
import { buildCampaignsPerformanceReport } from '@/lib/personaDashboard';

export default function CampaignsPerformancePage() {
  const { agencyId, loading: sessionLoading } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);

  const load = useCallback(async () => {
    if (!agencyId) return;
    setLoading(true);
    setError(null);
    try {
      const plans = await CyclePlan.filter({ agencyId }, '-updated_date', 40).catch(() => []);
      setReport(buildCampaignsPerformanceReport(plans, 12));
    } catch (err) {
      setError(err?.message || 'Falha ao carregar relatório');
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => {
    load();
  }, [load]);

  if (sessionLoading || loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Carregando performance…
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

  const { rows = [], summary = {} } = report || {};

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <BarChart3 className="h-6 w-6" />
            Performance · últimas 12 campanhas
          </h1>
          <p className="text-sm text-slate-500">
            Ciclos com feedback estruturado (vendas, engagement, aprendizados).
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/dashboard/bruna">Dashboard Bruna</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to={createPageUrl('campaign-insights')}>Insights</Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="shadow-none">
          <CardContent className="pt-4">
            <div className="text-xs text-slate-500">Campanhas</div>
            <div className="text-2xl font-semibold">{summary.total || 0}</div>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardContent className="pt-4">
            <div className="text-xs text-slate-500">Com feedback</div>
            <div className="text-2xl font-semibold">{summary.withFeedback || 0}</div>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardContent className="pt-4">
            <div className="text-xs text-slate-500">Por ciclo</div>
            <div className="flex flex-wrap gap-1 pt-1">
              {Object.entries(summary.byCiclo || {}).map(([k, v]) => (
                <Badge key={k} variant="secondary">
                  {k}: {v}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Campanhas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {rows.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum ciclo encontrado.</p>
          ) : (
            rows.map((r) => (
              <div
                key={r.id}
                className="rounded-md border border-slate-100 px-3 py-2 space-y-1"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-medium text-slate-900">{r.title}</div>
                  <div className="flex flex-wrap gap-1">
                    {r.tipo_campanha ? (
                      <Badge variant="outline">{r.tipo_campanha}</Badge>
                    ) : null}
                    {r.ciclo_comercial ? (
                      <Badge variant="secondary">{r.ciclo_comercial}</Badge>
                    ) : null}
                    {r.linha_focal ? <Badge variant="outline">{r.linha_focal}</Badge> : null}
                    <Badge variant={r.hasFeedback ? 'default' : 'outline'}>
                      {r.hasFeedback ? 'com feedback' : 'sem feedback'}
                    </Badge>
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  {r.start_date || '—'} → {r.end_date || '—'} · {r.status}
                </div>
                {r.hasFeedback ? (
                  <div className="grid gap-1 text-xs text-slate-700 sm:grid-cols-3">
                    <span>Vendas: {r.vendas_realizado || '—'}</span>
                    <span>Engagement: {r.engagement_realizado || '—'}</span>
                    <span className="sm:col-span-1 line-clamp-2">
                      {r.aprendizados || r.feedback?.o_que_funcionou || '—'}
                    </span>
                  </div>
                ) : null}
                {r.serviceId ? (
                  <Button size="sm" variant="ghost" className="h-7 px-0 text-xs" asChild>
                    <Link
                      to={createPageUrl(
                        `delivery-workspace?serviceId=${r.serviceId}&section=overview`
                      )}
                    >
                      Abrir workspace
                    </Link>
                  </Button>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
