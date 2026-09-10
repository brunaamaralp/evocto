import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Lightbulb, Download, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from '@/components/auth/SessionManager';
import { CyclePlan, Task, Service } from '@/api/entities';
import { createPageUrl } from '@/utils';
import {
  analyzeCampaignPatterns,
  buildNextCampaignRecommendations,
} from '@/lib/campaignInsights';
import {
  SCHEDULER_PROVIDERS,
  buildSchedulePayloadFromTasks,
  pushToScheduler,
  fetchSchedulerProviderStatus,
} from '@/lib/scheduleIntegrations';

const PRIORITY_CLASS = {
  high: 'border-amber-300 bg-amber-50',
  medium: 'border-slate-200 bg-white',
  low: 'border-slate-100 bg-slate-50',
};

export default function CampaignInsightsPage() {
  const { agencyId, loading: sessionLoading } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [recs, setRecs] = useState([]);
  const [services, setServices] = useState([]);
  const [exportServiceId, setExportServiceId] = useState('');
  const [exportProvider, setExportProvider] = useState('manual');
  const [exporting, setExporting] = useState(false);
  const [providerStatus, setProviderStatus] = useState(() =>
    SCHEDULER_PROVIDERS.map((p) => ({
      ...p,
      configured: p.id === 'manual',
      status: p.id === 'manual' ? 'ready' : 'needs_credentials',
    }))
  );

  const load = useCallback(async () => {
    if (!agencyId) return;
    setLoading(true);
    setError(null);
    try {
      const [plans, svc] = await Promise.all([
        CyclePlan.filter({ agencyId }, '-updated_date', 40).catch(() => []),
        Service.filter({ agencyId, is_template: false }, '-updated_date', 40).catch(() => []),
      ]);
      const a = analyzeCampaignPatterns(plans, 12);
      setAnalysis(a);
      setRecs(buildNextCampaignRecommendations(a, {}));
      const list = Array.isArray(svc) ? svc : [];
      setServices(list);
      setExportServiceId((cur) => cur || list[0]?.id || '');
      const status = await fetchSchedulerProviderStatus().catch(() => null);
      if (Array.isArray(status) && status.length) setProviderStatus(status);
    } catch (err) {
      setError(err?.message || 'Falha ao analisar padrões');
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => {
    load();
  }, [load]);

  const patternBlocks = useMemo(() => {
    if (!analysis) return [];
    return [
      { title: 'Por ciclo comercial', rows: analysis.byCiclo },
      { title: 'Por tipo de campanha', rows: analysis.byTipo },
      { title: 'Por linha focal', rows: analysis.byLinha },
    ];
  }, [analysis]);

  const handleExport = async () => {
    if (!exportServiceId) {
      toast.error('Selecione um serviço');
      return;
    }
    setExporting(true);
    try {
      const service = services.find((s) => s.id === exportServiceId);
      const tasks = await Task.filter({
        agencyId,
        serviceId: exportServiceId,
      }).catch(() => []);
      const payload = buildSchedulePayloadFromTasks(tasks, {
        provider: exportProvider,
        serviceId: exportServiceId,
        campaignName: service?.name,
        tipo_campanha: service?.tipo_campanha,
        ciclo_comercial: service?.ciclo_comercial,
        linha_focal: service?.linha_focal,
      });
      const result = await pushToScheduler(exportProvider, payload);
      if (!result.success) {
        toast.error(result.message || 'Falha no agendamento', {
          description: result.docsUrl || result.errors?.[0]?.error,
        });
        return;
      }
      if (result.csv) {
        const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `agendamento_${exportServiceId}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`CSV com ${result.postCount} post(s) baixado`);
        return;
      }
      toast.success(result.message || `${result.postCount} post(s) enviados`, {
        description: result.note,
      });
    } catch (err) {
      toast.error(err?.message || 'Falha no agendamento');
    } finally {
      setExporting(false);
    }
  };

  const selectedProviderMeta = providerStatus.find((p) => p.id === exportProvider);

  if (sessionLoading || loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Analisando padrões…
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
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <Sparkles className="h-6 w-6" />
            Insights & recomendações
          </h1>
          <p className="text-sm text-slate-500">
            Padrões das últimas {analysis?.sampleSize || 0} campanhas ·{' '}
            {analysis?.scoredCount || 0} com feedback
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link to={createPageUrl('campaigns-performance')}>Performance 12</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/dashboard/bruna">Dashboard Bruna</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="shadow-none">
          <CardContent className="pt-4">
            <div className="text-xs text-slate-500">Score médio</div>
            <div className="text-2xl font-semibold">
              {analysis?.overallAvgScore != null
                ? Math.round(analysis.overallAvgScore)
                : '—'}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardContent className="pt-4">
            <div className="text-xs text-slate-500">Melhor ciclo</div>
            <div className="text-lg font-semibold">
              {analysis?.topCiclo?.key || '—'}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardContent className="pt-4">
            <div className="text-xs text-slate-500">Melhor tipo</div>
            <div className="text-lg font-semibold">
              {analysis?.topTipo?.key || '—'}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-4 w-4" />
            Recomendações para a próxima campanha
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recs.length === 0 ? (
            <p className="text-sm text-slate-500">Sem recomendações ainda.</p>
          ) : (
            recs.map((r) => (
              <div
                key={r.id}
                className={`rounded-md border px-3 py-2 ${PRIORITY_CLASS[r.priority] || PRIORITY_CLASS.medium}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-slate-900">{r.title}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {r.priority}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-slate-600">{r.description}</p>
                {(r.actions || []).length > 0 ? (
                  <ul className="mt-1 list-inside list-disc text-xs text-slate-700">
                    {r.actions.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {patternBlocks.map((block) => (
          <Card key={block.title} className="shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{block.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {(block.rows || []).length === 0 ? (
                <p className="text-xs text-slate-500">Sem dados</p>
              ) : (
                block.rows.map((row) => (
                  <div
                    key={row.key}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="truncate font-medium text-slate-800">{row.key}</span>
                    <span className="shrink-0 text-slate-500">
                      n={row.count}
                      {row.avgScore != null ? ` · ${Math.round(row.avgScore)}` : ''}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {(analysis?.learnings || []).length > 0 ? (
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Aprendizados recentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {analysis.learnings.slice(0, 8).map((l, i) => (
              <div key={`${l.cycleId}-${i}`} className="rounded-md border border-slate-100 px-3 py-2">
                <div className="flex flex-wrap gap-1 text-[10px] text-slate-500">
                  <Badge variant="outline">{l.kind}</Badge>
                  <span>{l.title}</span>
                  {l.score != null ? <span>score {l.score}</span> : null}
                </div>
                <p className="mt-1 text-xs text-slate-700">{l.text}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card className="shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Agendamento (Buffer / Later / Metricool)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-slate-500">
            Envia posts da fase de agendamento via API (Buffer / Metricool) ou exporta CSV.
            Credenciais só no servidor (Netlify env).
          </p>
          <div className="flex flex-wrap gap-1.5">
            {providerStatus.map((p) => (
              <Badge
                key={p.id}
                variant="outline"
                className={
                  p.configured || p.status === 'ready'
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 text-slate-500'
                }
              >
                {p.label}
                {p.id === 'manual' || p.configured ? ' · ok' : ' · falta env'}
              </Badge>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div>
              <Select value={exportServiceId} onValueChange={setExportServiceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Serviço" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={exportProvider} onValueChange={setExportProvider}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {providerStatus.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                      {p.id !== 'manual' && !p.configured ? ' (configurar env)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="button" disabled={exporting} onClick={handleExport}>
              {exporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              {exportProvider === 'manual' ? 'Exportar CSV' : 'Enviar'}
            </Button>
          </div>
          {selectedProviderMeta?.note ? (
            <p className="text-[11px] text-amber-700">{selectedProviderMeta.note}</p>
          ) : null}
          {selectedProviderMeta?.docsUrl ? (
            <a
              className="text-[11px] text-slate-500 underline"
              href={selectedProviderMeta.docsUrl}
              target="_blank"
              rel="noreferrer"
            >
              Docs {selectedProviderMeta.label}
            </a>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
