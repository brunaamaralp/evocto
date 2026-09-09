import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, ListTodo, Clock } from 'lucide-react';

function deliverableProgress(deliverables = [], tasks = []) {
  if (!deliverables.length) return 0;
  const done = deliverables.filter((d) =>
    ['completed', 'approved'].includes(String(d.status || '').toLowerCase())
  ).length;
  return Math.round((done / deliverables.length) * 100);
}

export default function DeliveryWorkspaceOverview({
  service,
  tasks = [],
  onGoSection,
}) {
  const deliverables = service?.deliverables || [];
  const progress = useMemo(
    () => deliverableProgress(deliverables, tasks),
    [deliverables, tasks]
  );

  const openTasks = tasks.filter((t) => !['completed', 'cancelled'].includes(t.status)).length;
  const doneTasks = tasks.filter((t) => t.status === 'completed').length;
  const loggedHours = tasks.reduce((sum, t) => sum + (Number(t.actualHours) || 0), 0);
  const estimatedHours = tasks.reduce((sum, t) => sum + (Number(t.estimatedHours) || 0), 0);

  return (
    <div className="space-y-4">
      <Card className="border-slate-200 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Progresso da entrega</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Etapas concluídas</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-slate-500">
            {deliverables.filter((d) => ['completed', 'approved'].includes(d.status)).length} de{' '}
            {deliverables.length} etapas
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          className="text-left rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-300"
          onClick={() => onGoSection?.('tasks')}
        >
          <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
            <ListTodo className="w-3.5 h-3.5" />
            Tarefas abertas
          </div>
          <div className="text-2xl font-semibold text-slate-900">{openTasks}</div>
          <div className="text-xs text-slate-500">{doneTasks} concluídas</div>
        </button>
        <button
          type="button"
          className="text-left rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-300"
          onClick={() => onGoSection?.('atividade')}
        >
          <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
            <Clock className="w-3.5 h-3.5" />
            Horas
          </div>
          <div className="text-2xl font-semibold text-slate-900">
            {loggedHours.toFixed(1)}h
          </div>
          <div className="text-xs text-slate-500">de {estimatedHours.toFixed(1)}h estimadas</div>
        </button>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500 mb-1">Valor / contrato</div>
          <div className="text-2xl font-semibold text-slate-900">
            {service?.contract_value || service?.monthly_value
              ? `R$ ${Number(service.contract_value || service.monthly_value).toLocaleString('pt-BR')}`
              : '—'}
          </div>
          <button
            type="button"
            className="text-xs text-slate-600 underline mt-1"
            onClick={() => onGoSection?.('finance')}
          >
            Ver financeiro
          </button>
        </div>
      </div>

      <Card className="border-slate-200 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Etapas</CardTitle>
        </CardHeader>
        <CardContent>
          {deliverables.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma etapa configurada neste serviço.</p>
          ) : (
            <ul className="space-y-2">
              {deliverables.map((d) => {
                const done = ['completed', 'approved'].includes(String(d.status || '').toLowerCase());
                const active = String(d.status || '') === 'in_progress';
                return (
                  <li
                    key={d.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-slate-100 px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {done ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <Circle className={`w-4 h-4 shrink-0 ${active ? 'text-blue-600' : 'text-slate-300'}`} />
                      )}
                      <span className="text-sm text-slate-800 truncate">{d.name}</span>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {(d.status || 'not_started').replace(/_/g, ' ')}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
