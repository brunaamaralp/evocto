import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Play, Loader2, CheckSquare, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { canStartDeliverable } from '@/lib/startDeliverableStage';
import { useTaskGeneration } from '@/hooks/useTaskGeneration';
import TaskTimerButton from '@/components/tasks/TaskTimerButton';

const STATUS_BADGE = {
  not_started: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-blue-100 text-blue-800',
  ready_for_review: 'bg-amber-100 text-amber-800',
  pending_approval: 'bg-purple-100 text-purple-800',
  approved: 'bg-emerald-100 text-emerald-800',
  completed: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
};

function TaskRow({ task }) {
  return (
    <li className="flex items-start justify-between gap-2 py-2 border-b border-slate-100 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-800 truncate">{task.title}</p>
        {task.description ? (
          <p className="text-xs text-slate-500 line-clamp-2">{task.description}</p>
        ) : null}
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <Badge variant="outline" className="text-xs">
          {(task.status || 'todo').replace(/_/g, ' ')}
        </Badge>
        <TaskTimerButton task={task} showLabel={false} />
      </div>
    </li>
  );
}

export default function DeliveryWorkspaceTasks({
  service,
  tasks = [],
  activeStageId,
  onStageFocus,
  onServiceUpdated,
}) {
  const { startDeliverableAndGenerateTasks, isGenerating } = useTaskGeneration();
  const [startingId, setStartingId] = useState(null);
  const [hideCompleted, setHideCompleted] = useState(true);
  const [expanded, setExpanded] = useState(() => new Set(activeStageId ? [activeStageId] : []));

  const deliverables = service?.deliverables || [];

  const tasksByDeliverable = useMemo(() => {
    const map = new Map();
    for (const t of tasks) {
      const key = String(t.deliverableId || '_unassigned');
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(t);
    }
    return map;
  }, [tasks]);

  const toggleExpand = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    onStageFocus?.(id);
  };

  const handleStart = async (deliverable) => {
    if (!service?.id || !deliverable?.id) return;
    setStartingId(deliverable.id);
    try {
      const result = await startDeliverableAndGenerateTasks(service.id, deliverable.id, {
        skipExisting: true,
      });
      if (result.success) {
        toast.success(
          result.tasksCreated > 0
            ? `Etapa iniciada · ${result.tasksCreated} tarefa(s) criada(s)`
            : 'Etapa iniciada'
        );
        if (result.service) onServiceUpdated?.(result.service);
        setExpanded((prev) => new Set(prev).add(deliverable.id));
        onStageFocus?.(deliverable.id);
      } else {
        toast.error(result.errors?.[0] || 'Falha ao iniciar etapa');
      }
    } catch (err) {
      toast.error(err?.message || 'Falha ao iniciar etapa');
    } finally {
      setStartingId(null);
    }
  };

  if (!deliverables.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
        Nenhuma etapa neste serviço. Configure entregáveis no editor do serviço.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          Inicie uma etapa para materializar o checklist de tarefas do template.
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <Switch
            id="hide-completed-tasks"
            checked={hideCompleted}
            onCheckedChange={setHideCompleted}
          />
          <Label htmlFor="hide-completed-tasks" className="text-xs text-slate-600">
            Ocultar concluídas
          </Label>
        </div>
      </div>

      <ul className="space-y-3">
        {deliverables.map((d) => {
          const stageTasks = (tasksByDeliverable.get(String(d.id)) || []).filter((t) =>
            hideCompleted ? t.status !== 'completed' : true
          );
          const isOpen = expanded.has(d.id) || activeStageId === d.id;
          const status = d.status || 'not_started';
          const canStart = canStartDeliverable(d) && status !== 'in_progress';
          const busy = startingId === d.id || isGenerating;

          return (
            <li
              key={d.id}
              className={`rounded-lg border bg-white ${
                activeStageId === d.id ? 'border-blue-300' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 px-3 py-3">
                <button
                  type="button"
                  className="p-1 text-slate-500 hover:text-slate-800"
                  onClick={() => toggleExpand(d.id)}
                  aria-expanded={isOpen}
                >
                  {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    className="text-left w-full"
                    onClick={() => toggleExpand(d.id)}
                  >
                    <span className="font-medium text-slate-900 text-sm">{d.name}</span>
                    <span className="ml-2 text-xs text-slate-500">
                      {stageTasks.length} tarefa(s)
                      {(d.task_templates || []).length
                        ? ` · ${(d.task_templates || []).length} no template`
                        : ''}
                    </span>
                  </button>
                </div>
                <Badge className={STATUS_BADGE[status] || STATUS_BADGE.not_started}>
                  {String(status).replace(/_/g, ' ')}
                </Badge>
                {canStart ? (
                  <Button
                    size="sm"
                    onClick={() => handleStart(d)}
                    disabled={busy}
                  >
                    {busy ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                    ) : (
                      <Play className="w-3.5 h-3.5 mr-1" />
                    )}
                    Iniciar etapa
                  </Button>
                ) : status === 'in_progress' && (d.task_templates || []).length > 0 ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStart(d)}
                    disabled={busy}
                    title="Rematerializa templates faltantes (ignora existentes)"
                  >
                    {busy ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                    ) : (
                      <CheckSquare className="w-3.5 h-3.5 mr-1" />
                    )}
                    Sync checklist
                  </Button>
                ) : null}
              </div>

              {isOpen ? (
                <div className="border-t border-slate-100 px-4 pb-3">
                  {stageTasks.length === 0 ? (
                    <p className="text-xs text-slate-500 py-3">
                      Sem tarefas nesta etapa. Use &quot;Iniciar etapa&quot; para gerar a partir do template.
                    </p>
                  ) : (
                    <ul>
                      {stageTasks.map((t) => (
                        <TaskRow key={t.id} task={t} />
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {(tasksByDeliverable.get('_unassigned') || []).length > 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-sm font-medium text-slate-800 mb-2">Sem etapa</p>
          <ul>
            {(tasksByDeliverable.get('_unassigned') || [])
              .filter((t) => (hideCompleted ? t.status !== 'completed' : true))
              .map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
