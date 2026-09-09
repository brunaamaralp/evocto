import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Task, Service } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';
import LoadingState from '@/components/shared/LoadingState';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  allocatePlannedHoursByDay,
  buildHoursByService,
  buildMemberOccupancyRows,
  enrichTasksWithStageDates,
  resolveHoursHubPeriod,
} from '@/lib/hoursHubCore';
import { formatYmdBr } from '@/lib/businessDaysCore';
import { buildDeliveryWorkspacePath } from '@/lib/deliveryWorkspaceTabs';
import { createPageUrl } from '@/utils';

export default function HoursHubPage() {
  const { agencyId, isAuthenticated, user } = useSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const periodId = searchParams.get('period') || 'week';
  const filterServiceId = searchParams.get('serviceId') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [services, setServices] = useState([]);

  const period = useMemo(() => resolveHoursHubPeriod(periodId), [periodId]);

  const load = useCallback(async () => {
    if (!agencyId) return;
    setLoading(true);
    setError(null);
    try {
      const [taskList, serviceList] = await Promise.all([
        Task.filter({ agencyId }).catch(() => []),
        Service.filter({ agencyId, is_template: false }).catch(() => []),
      ]);
      setTasks(Array.isArray(taskList) ? taskList : []);
      setServices(Array.isArray(serviceList) ? serviceList : []);
    } catch (err) {
      setError(err?.message || 'Falha ao carregar hub de horas');
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => {
    load();
  }, [load]);

  const serviceNameById = useMemo(() => {
    const map = {};
    for (const s of services) map[s.id] = s.name;
    return map;
  }, [services]);

  const scopedTasks = useMemo(() => {
    let list = tasks;
    if (filterServiceId) {
      list = list.filter((t) => String(t.serviceId) === String(filterServiceId));
    }
    return enrichTasksWithStageDates(list, services);
  }, [tasks, services, filterServiceId]);

  const byService = useMemo(
    () => buildHoursByService(scopedTasks, serviceNameById),
    [scopedTasks, serviceNameById]
  );

  const totals = useMemo(() => {
    return byService.reduce(
      (acc, row) => {
        acc.estimated += row.estimated;
        acc.actual += row.actual;
        acc.remaining += row.remaining;
        acc.openCount += row.openCount;
        return acc;
      },
      { estimated: 0, actual: 0, remaining: 0, openCount: 0 }
    );
  }, [byService]);

  const memberIds = useMemo(() => {
    const set = new Set();
    for (const t of scopedTasks) {
      const id = t.assignedTo || t.assigned_to;
      if (id) set.add(String(id));
    }
    const me = user?.id || user?.data?.id;
    if (me) set.add(String(me));
    return [...set];
  }, [scopedTasks, user]);

  const memberLabelById = useMemo(() => {
    const map = {};
    for (const id of memberIds) {
      map[id] = id === String(user?.id || user?.data?.id) ? 'Você' : id.slice(0, 8);
    }
    return map;
  }, [memberIds, user]);

  const plannedByUserDay = useMemo(
    () =>
      allocatePlannedHoursByDay(scopedTasks, {
        fromYmd: period.fromYmd,
        toYmd: period.toYmd,
      }),
    [scopedTasks, period]
  );

  const occupancyRows = useMemo(
    () =>
      buildMemberOccupancyRows({
        memberIds,
        memberLabelById,
        fromYmd: period.fromYmd,
        toYmd: period.toYmd,
        plannedByUserDay,
        capacityHoursPerDay: 8,
      }),
    [memberIds, memberLabelById, period, plannedByUserDay]
  );

  const setPeriod = (id) => {
    const next = new URLSearchParams(searchParams);
    next.set('period', id);
    setSearchParams(next, { replace: true });
  };

  if (!isAuthenticated) {
    return <div className="p-6 text-sm text-slate-600">Faça login para ver o hub de horas.</div>;
  }

  if (loading) return <LoadingState message="Carregando hub de horas..." />;

  if (error) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-700 mb-2">{error}</p>
        <Button size="sm" variant="outline" onClick={load}>
          Tentar de novo
        </Button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Hub de horas</h1>
              <p className="text-sm text-slate-500">
                {period.label} · {formatYmdBr(period.fromYmd)} → {formatYmdBr(period.toYmd)}
                {filterServiceId ? ` · filtro serviço` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={periodId === 'week' ? 'default' : 'outline'}
                onClick={() => setPeriod('week')}
              >
                7 dias
              </Button>
              <Button
                size="sm"
                variant={periodId === 'month' ? 'default' : 'outline'}
                onClick={() => setPeriod('month')}
              >
                Mês
              </Button>
              {filterServiceId ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const next = new URLSearchParams(searchParams);
                    next.delete('serviceId');
                    setSearchParams(next, { replace: true });
                  }}
                >
                  Limpar filtro
                </Button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            {[
              { label: 'Estimadas', value: `${totals.estimated.toFixed(1)}h` },
              { label: 'Registradas', value: `${totals.actual.toFixed(1)}h` },
              { label: 'Restantes', value: `${totals.remaining.toFixed(1)}h` },
              { label: 'Tarefas abertas', value: String(totals.openCount) },
            ].map((s) => (
              <Card key={s.label} className="border-slate-200 shadow-none">
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs font-medium text-slate-500">{s.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-semibold text-slate-900">{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-slate-200 shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Ocupação da equipe</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {occupancyRows.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Nenhuma tarefa atribuída no período. Atribua responsáveis para ver a carga.
                </p>
              ) : (
                occupancyRows.map((row) => (
                  <div key={row.userId}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-800">{row.label}</span>
                      <span className="text-xs text-slate-500">
                        {row.totalPlanned.toFixed(1)}h / {row.totalCapacity.toFixed(0)}h ·{' '}
                        {Math.round(row.load * 100)}%
                      </span>
                    </div>
                    <div className="flex gap-0.5 overflow-x-auto">
                      {row.dayHours.map((d) => {
                        const tone =
                          d.load > 1
                            ? 'bg-red-500'
                            : d.load > 0.75
                              ? 'bg-amber-500'
                              : d.load > 0
                                ? 'bg-slate-700'
                                : 'bg-slate-200';
                        return (
                          <div
                            key={d.ymd}
                            className="flex flex-col items-center gap-0.5"
                            title={`${formatYmdBr(d.ymd)}: ${d.planned.toFixed(1)}h`}
                          >
                            <div
                              className={`w-6 rounded-sm ${tone}`}
                              style={{
                                height: `${Math.max(4, Math.min(40, d.planned * 4))}px`,
                              }}
                            />
                            <span className="text-[9px] text-slate-400">
                              {new Date(`${d.ymd}T12:00:00`).getDate()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Por entrega</CardTitle>
            </CardHeader>
            <CardContent>
              {byService.length === 0 ? (
                <p className="text-sm text-slate-500">Sem tarefas neste recorte.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {byService.map((row) => (
                    <li
                      key={row.serviceId}
                      className="flex flex-wrap items-center justify-between gap-2 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{row.label}</p>
                        <p className="text-xs text-slate-500">
                          {row.openCount} abertas · {row.actual.toFixed(1)}h / {row.estimated.toFixed(1)}h
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {row.remaining.toFixed(1)}h rest.
                        </Badge>
                        {row.serviceId !== '_none' ? (
                          <Button asChild size="sm" variant="outline">
                            <Link
                              to={buildDeliveryWorkspacePath(row.serviceId, 'atividade')}
                            >
                              Workspace
                            </Link>
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <p className="text-xs text-slate-400">
            Capacidade padrão: 8h/dia útil. Carga alocada por due date ou espalhada nas datas da
            etapa.
          </p>
          <Button asChild variant="ghost" size="sm">
            <Link to={createPageUrl('dashboard')}>Voltar ao dashboard</Link>
          </Button>
        </div>
      </div>
    </ErrorBoundary>
  );
}
