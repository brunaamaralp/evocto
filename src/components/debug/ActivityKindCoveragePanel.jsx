import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  analyzeActivityKindCoverage,
  coverageKindLabel,
} from '@/lib/analyzeActivityKindCoverage';

const STATUS_FILTERS = [
  { id: 'all', label: 'Todos os issues' },
  { id: 'unclassified', label: 'unclassified' },
  { id: 'known_gap', label: 'known_gap' },
  { id: 'invalid_kind', label: 'invalid_kind' },
  { id: 'intentional_container', label: 'containers' },
];

const SOURCE_FILTERS = [
  { id: 'all', label: 'task+checklist' },
  { id: 'task', label: 'task' },
  { id: 'checklist', label: 'checklist' },
];

const ORIGIN_FILTERS = [
  { id: 'all', label: 'todas origens' },
  { id: 'template', label: 'template' },
  { id: 'manual', label: 'manual' },
  { id: 'item_cycle', label: 'item_cycle' },
  { id: 'unknown', label: 'unknown' },
];

function statusBadgeVariant(status) {
  if (status === 'classified') return 'default';
  if (status === 'invalid_kind') return 'destructive';
  if (status === 'known_gap') return 'secondary';
  if (status === 'intentional_container') return 'outline';
  return 'secondary';
}

/**
 * Painel compacto de qualidade do dado activityKind (admin/dev).
 * Não edita Tasks — só observa.
 */
export default function ActivityKindCoveragePanel({
  tasks = [],
  agencyId = null,
  loading = false,
  universeLabel = null,
  onRefresh = null,
}) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [originFilter, setOriginFilter] = useState('all');

  const analysis = useMemo(
    () =>
      analyzeActivityKindCoverage(tasks, {
        agencyId,
        universeLabel:
          universeLabel ||
          `Até ${tasks.length} Tasks da agência carregadas (ordenadas por updated_date)`,
      }),
    [tasks, agencyId, universeLabel]
  );

  const { summary, byKind, bySource, byOrigin, byTemplate, universe } = analysis;

  const issueRows = useMemo(() => {
    let rows =
      statusFilter === 'intentional_container'
        ? analysis.containers
        : analysis.issues;
    if (statusFilter !== 'all' && statusFilter !== 'intentional_container') {
      rows = rows.filter((r) => r.status === statusFilter);
    }
    if (sourceFilter !== 'all') {
      rows = rows.filter((r) => r.source === sourceFilter);
    }
    if (originFilter !== 'all') {
      rows = rows.filter((r) => r.origin === originFilter);
    }
    return rows;
  }, [analysis, statusFilter, sourceFilter, originFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Cobertura activityKind</h2>
          <p className="text-sm text-gray-600 mt-1 max-w-2xl">
            Qualidade do contrato de natureza do trabalho — não mapeia fases operacionais.
            Containers intencionais ficam fora do denominador.
          </p>
        </div>
        {onRefresh ? (
          <Button type="button" variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
            {loading ? 'Carregando…' : 'Recarregar Tasks'}
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Resumo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-6">
            <div>
              <div className="text-4xl font-bold tabular-nums text-gray-900">
                {summary.coveragePercent == null ? '—' : `${summary.coveragePercent}%`}
              </div>
              <div className="text-xs text-gray-500 mt-1">cobertura do contrato</div>
            </div>
            <div className="text-sm text-gray-700 space-y-0.5">
              <div>
                <span className="font-medium tabular-nums">{summary.totalClassifiable}</span>{' '}
                classificáveis
              </div>
              <div>
                <span className="font-medium tabular-nums">{summary.classifiedCount}</span>{' '}
                classificadas
              </div>
              <div>
                <span className="font-medium tabular-nums">{summary.withoutValidKindCount}</span>{' '}
                sem kind válido
              </div>
              <div className="text-gray-500">
                containers ignorados: {summary.intentionalContainerCount} · known_gap:{' '}
                {summary.knownGapCount} · invalid_kind: {summary.invalidKindCount} · manuais sem
                kind: {summary.manualUnclassifiedCount}
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-500 border-t pt-3">
            Universo: {universe.label}. agencyId={universe.agencyId || '—'}. Tasks no escopo:{' '}
            {universe.tasksInScope}. {universe.coverageSemantics}
          </p>
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded px-2 py-1.5">
            Legado: {universe.legacyNote}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Por origem (source)</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <div>
              Tasks ………… {bySource.task.classified}/{bySource.task.classifiable}
            </div>
            <div>
              Checklist … {bySource.checklist.classified}/{bySource.checklist.classifiable}
            </div>
            <div className="text-gray-500">Containers: {bySource.containers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Por origem de criação</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            {Object.entries(byOrigin).map(([key, row]) => (
              <div key={key}>
                {key} …… {row.classified}/{row.classifiable}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Breakdown por activityKind</CardTitle>
        </CardHeader>
        <CardContent>
          {byKind.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum kind classificado neste universo.</p>
          ) : (
            <ul className="text-sm columns-1 sm:columns-2 gap-x-8">
              {byKind.map((row) => (
                <li key={row.key} className="flex justify-between gap-4 py-0.5 break-inside-avoid">
                  <span>
                    {row.label}{' '}
                    <span className="text-gray-400 font-mono text-xs">({row.key})</span>
                  </span>
                  <span className="tabular-nums font-medium">{row.count}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Por template / passo</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {byTemplate.length === 0 ? (
            <p className="text-sm text-gray-500">Sem unidades classificáveis.</p>
          ) : (
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-xs text-gray-500 border-b">
                  <th className="py-1 pr-2 font-medium">Template / id</th>
                  <th className="py-1 pr-2 font-medium">Cobertura</th>
                  <th className="py-1 font-medium">Classif.</th>
                </tr>
              </thead>
              <tbody>
                {byTemplate.slice(0, 40).map((row) => (
                  <tr key={row.label} className="border-b border-gray-100">
                    <td className="py-1.5 pr-2 font-mono text-xs">{row.label}</td>
                    <td className="py-1.5 pr-2 tabular-nums">
                      {row.coveragePercent == null ? '—' : `${row.coveragePercent}%`}
                    </td>
                    <td className="py-1.5 tabular-nums">
                      {row.classified}/{row.classifiable}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Itens sem classificação válida</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((f) => (
              <Button
                key={f.id}
                type="button"
                size="sm"
                variant={statusFilter === f.id ? 'default' : 'outline'}
                onClick={() => setStatusFilter(f.id)}
              >
                {f.label}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {SOURCE_FILTERS.map((f) => (
              <Button
                key={f.id}
                type="button"
                size="sm"
                variant={sourceFilter === f.id ? 'secondary' : 'ghost'}
                onClick={() => setSourceFilter(f.id)}
              >
                {f.label}
              </Button>
            ))}
            {ORIGIN_FILTERS.map((f) => (
              <Button
                key={f.id}
                type="button"
                size="sm"
                variant={originFilter === f.id ? 'secondary' : 'ghost'}
                onClick={() => setOriginFilter(f.id)}
              >
                {f.label}
              </Button>
            ))}
          </div>

          {issueRows.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum item neste filtro.</p>
          ) : (
            <ul className="divide-y divide-gray-100 border rounded-md">
              {issueRows.slice(0, 100).map((row) => (
                <li key={row.id} className="px-3 py-2 text-sm space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-gray-900">{row.title}</span>
                    <Badge variant={statusBadgeVariant(row.status)}>{row.status}</Badge>
                    <Badge variant="outline">{row.source}</Badge>
                    <Badge variant="outline">{row.origin}</Badge>
                  </div>
                  <div className="text-xs text-gray-500 font-mono space-x-2">
                    <span>kind={coverageKindLabel(row.activityKind) || row.rawActivityKind || 'null'}</span>
                    {row.templateId ? <span>template_id={row.templateId}</span> : null}
                    {row.templateStepId ? <span>step={row.templateStepId}</span> : null}
                    {row.taskId ? <span>task={row.taskId}</span> : null}
                    {row.clientId ? <span>client={row.clientId}</span> : null}
                  </div>
                  <div className="text-xs text-gray-600">{row.reason}</div>
                </li>
              ))}
            </ul>
          )}
          {issueRows.length > 100 ? (
            <p className="text-xs text-gray-500">Mostrando 100 de {issueRows.length}.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
