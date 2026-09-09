import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import { ExternalLink } from 'lucide-react';

export default function DeliveryWorkspaceActivity({ service, tasks = [] }) {
  const byDeliverable = useMemo(() => {
    const map = new Map();
    for (const t of tasks) {
      const key = t.deliverableId || '_none';
      const name =
        t.template_metadata?.deliverable_name ||
        t.deliverableName ||
        (key === '_none' ? 'Sem etapa' : key);
      if (!map.has(key)) {
        map.set(key, { name, estimated: 0, actual: 0, count: 0 });
      }
      const row = map.get(key);
      row.estimated += Number(t.estimatedHours) || 0;
      row.actual += Number(t.actualHours) || 0;
      row.count += 1;
    }
    return [...map.values()];
  }, [tasks]);

  const byAssignee = useMemo(() => {
    const map = new Map();
    for (const t of tasks) {
      const key = t.assignedTo || t.assigned_to || '_unassigned';
      const label = key === '_unassigned' ? 'Não atribuído' : key;
      if (!map.has(key)) map.set(key, { label, estimated: 0, actual: 0, remaining: 0 });
      const row = map.get(key);
      const est = Number(t.estimatedHours) || 0;
      const act = Number(t.actualHours) || 0;
      row.estimated += est;
      row.actual += act;
      if (!['completed', 'cancelled'].includes(t.status)) {
        row.remaining += Math.max(0, est - act);
      }
    }
    return [...map.values()].sort((a, b) => b.remaining - a.remaining);
  }, [tasks]);

  const totalActual = byDeliverable.reduce((s, r) => s + r.actual, 0);
  const totalEstimated = byDeliverable.reduce((s, r) => s + r.estimated, 0);
  const hubHref = `${createPageUrl('hours-hub')}${
    service?.id ? `?serviceId=${service.id}` : ''
  }`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Atividade</h2>
          <p className="text-xs text-slate-500">Horas desta entrega · hub global para a equipe</p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to={hubHref}>
            Hub de horas
            <ExternalLink className="w-3.5 h-3.5 ml-1" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="border-slate-200 shadow-none">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-slate-600">Horas registradas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{totalActual.toFixed(1)}h</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-none">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-slate-600">Horas estimadas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{totalEstimated.toFixed(1)}h</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Por etapa</CardTitle>
        </CardHeader>
        <CardContent>
          {byDeliverable.length === 0 ? (
            <p className="text-sm text-slate-500">Sem tarefas para agregar horas.</p>
          ) : (
            <ul className="space-y-3">
              {byDeliverable.map((row) => {
                const pct =
                  row.estimated > 0
                    ? Math.min(100, Math.round((row.actual / row.estimated) * 100))
                    : 0;
                return (
                  <li key={row.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-800 font-medium">{row.name}</span>
                      <span className="text-slate-500">
                        {row.actual.toFixed(1)}h / {row.estimated.toFixed(1)}h
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-slate-700 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Por responsável</CardTitle>
        </CardHeader>
        <CardContent>
          {byAssignee.length === 0 ? (
            <p className="text-sm text-slate-500">Sem atribuições.</p>
          ) : (
            <ul className="space-y-2">
              {byAssignee.map((row) => (
                <li
                  key={row.label}
                  className="flex items-center justify-between text-sm border-b border-slate-50 py-2 last:border-0"
                >
                  <span className="text-slate-800 truncate max-w-[50%]">{row.label}</span>
                  <span className="text-slate-500 text-xs">
                    {row.actual.toFixed(1)}h feitas · {row.remaining.toFixed(1)}h restantes
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
