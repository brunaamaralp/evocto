import { useMemo, useState } from 'react';
import { Check, ChevronRight, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Task } from '@/api/entities';
import TaskTimerButton from '@/components/tasks/TaskTimerButton';
import { completeTask, notifyTaskCompleted, toastTaskCompleted, toastTaskCompleteError } from '@/lib/completeTask';
import { completedKanbanColumnForTask } from '@/lib/taskStatusTransition';
import { statusLabelPt } from '@/lib/statusLabelsPt';

/** Colunas Kanban da campanha (spec produto). */
export const CAMPAIGN_KANBAN_COLUMNS = Object.freeze([
  {
    id: 'planejamento',
    label: 'Planejamento',
    statuses: ['not_started', 'backlog', 'todo', 'planned', 'planejamento'],
  },
  {
    id: 'roteiros',
    label: 'Roteiros',
    statuses: ['roteiro', 'roteiros', 'script', 'drafting'],
  },
  {
    id: 'producao',
    label: 'Produção',
    statuses: ['in_progress', 'producao', 'production', 'doing'],
  },
  {
    id: 'revisao',
    label: 'Revisão',
    statuses: [
      'in_review',
      'ready_for_review',
      'pending_approval',
      'revisao',
      'review',
    ],
  },
  {
    id: 'publicacao',
    label: 'Publicação',
    statuses: ['approved', 'completed', 'done', 'published', 'publicacao'],
  },
]);

/** Payload ao avançar para a próxima coluna. */
export const CAMPAIGN_COLUMN_ADVANCE = Object.freeze({
  planejamento: { kanbanColumn: 'roteiros', status: 'roteiro' },
  roteiros: { kanbanColumn: 'producao', status: 'in_progress' },
  producao: { kanbanColumn: 'revisao', status: 'in_review' },
  revisao: { kanbanColumn: 'publicacao', status: 'completed' },
  publicacao: null,
});

export const CAMPAIGN_DONE_PATCH = Object.freeze({
  kanbanColumn: 'publicacao',
  status: 'completed',
});

export function columnForTask(task) {
  const status = String(task?.status || 'todo').toLowerCase();
  const stage = String(task?.kanbanColumn || task?.stage || task?.pipeline_stage || '')
    .toLowerCase()
    .trim();

  // Status terminal manda — evita tarefa concluída presa em "Planejamento"/"A Fazer"
  // quando kanbanColumn ficou desatualizado.
  if (['completed', 'done', 'approved', 'published'].includes(status)) {
    return 'publicacao';
  }

  if (stage) {
    for (const col of CAMPAIGN_KANBAN_COLUMNS) {
      if (col.id === stage || col.statuses.includes(stage)) return col.id;
    }
  }

  for (const col of CAMPAIGN_KANBAN_COLUMNS) {
    if (col.statuses.includes(status)) return col.id;
  }

  if (['blocked', 'rejected', 'cancelled'].includes(status)) return 'revisao';
  return 'planejamento';
}

function isDoneTask(task) {
  const status = String(task?.status || '').toLowerCase();
  return ['completed', 'done', 'approved', 'published'].includes(status);
}

function openTaskDrawer(task) {
  if (!task?.id || typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('task:open', { detail: { taskId: task.id } }));
}

function TaskCard({ task, busyId, onAdvance, onComplete }) {
  const col = columnForTask(task);
  const done = isDoneTask(task) || col === 'publicacao';
  const busy = busyId === task.id;
  const canAdvance = !done && CAMPAIGN_COLUMN_ADVANCE[col];

  return (
    <li className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
      <button
        type="button"
        className="w-full text-left"
        onClick={() => openTaskDrawer(task)}
      >
        <p className="text-sm font-medium text-slate-800 leading-snug">{task.title}</p>
      </button>
      <div className="mt-2 flex items-center justify-between gap-2">
        <Badge variant="outline" className="text-[10px]">
          {statusLabelPt(task.status || 'todo')}
        </Badge>
        <TaskTimerButton task={task} showLabel={false} />
      </div>
      {!done ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {canAdvance ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2 text-[11px]"
              disabled={busy}
              onClick={() => onAdvance(task)}
            >
              {busy ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              Avançar
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            className="h-7 px-2 text-[11px] bg-emerald-600 hover:bg-emerald-700"
            disabled={busy}
            onClick={() => onComplete(task)}
          >
            {busy ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Check className="h-3 w-3" />
            )}
            Concluir
          </Button>
        </div>
      ) : (
        <p className="mt-2 text-[11px] font-medium text-emerald-700">Concluída</p>
      )}
    </li>
  );
}

/**
 * Kanban operacional da campanha (tarefas já filtradas por escopo).
 */
export default function CampaignWorkspaceTasks({
  tasks = [],
  scopeLabel = null,
  sharedCycleFallback = false,
  onTasksNeedReload = null,
}) {
  const [busyId, setBusyId] = useState(null);
  const [localOverrides, setLocalOverrides] = useState({});

  const effectiveTasks = useMemo(() => {
    return (Array.isArray(tasks) ? tasks : []).map((t) =>
      localOverrides[t.id] ? { ...t, ...localOverrides[t.id] } : t
    );
  }, [tasks, localOverrides]);

  const byColumn = useMemo(() => {
    const map = Object.fromEntries(CAMPAIGN_KANBAN_COLUMNS.map((c) => [c.id, []]));
    for (const task of effectiveTasks) {
      const col = columnForTask(task);
      map[col].push(task);
    }
    return map;
  }, [effectiveTasks]);

  const patchTask = async (task, patch, successMsg) => {
    if (!task?.id || busyId) return;
    setBusyId(task.id);
    try {
      const updated = await Task.update(task.id, {
        ...patch,
        editado_em: new Date().toISOString(),
      });
      setLocalOverrides((prev) => ({
        ...prev,
        [task.id]: {
          status: updated?.status ?? patch.status,
          kanbanColumn: updated?.kanbanColumn ?? patch.kanbanColumn,
        },
      }));
      toast.success(successMsg);
      if (typeof onTasksNeedReload === 'function') {
        await onTasksNeedReload();
      }
    } catch (err) {
      console.error('[CampaignWorkspaceTasks]', err);
      toast.error(err?.message || 'Não foi possível atualizar a tarefa');
    } finally {
      setBusyId(null);
    }
  };

  const handleAdvance = async (task) => {
    const col = columnForTask(task);
    const next = CAMPAIGN_COLUMN_ADVANCE[col];
    if (!next) return;
    await patchTask(task, next, 'Tarefa avançada');
  };

  const handleComplete = async (task) => {
    if (!task?.id || busyId) return;
    setBusyId(task.id);
    try {
      const result = await completeTask(task);
      if (!result.success) {
        toastTaskCompleteError(result.message || 'Não é possível concluir esta tarefa');
        return;
      }
      setLocalOverrides((prev) => ({
        ...prev,
        [task.id]: {
          status: 'completed',
          kanbanColumn: completedKanbanColumnForTask(task),
        },
      }));
      toastTaskCompleted(task, {
        alreadyCompleted: result.alreadyCompleted,
        warning: result.warning,
      });
      notifyTaskCompleted(task.id, {
        kanbanColumn: completedKanbanColumnForTask(task),
      });
      if (typeof onTasksNeedReload === 'function') {
        window.setTimeout(() => {
          void onTasksNeedReload();
        }, 900);
      }
    } catch (err) {
      console.error('[CampaignWorkspaceTasks]', err);
      toastTaskCompleteError(err?.message || 'Não foi possível atualizar a tarefa');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Tarefas</h2>
          <p className="text-sm text-slate-500 mt-1">
            Kanban da campanha
            {scopeLabel ? ` · ${scopeLabel}` : ''}. Use{' '}
            <span className="font-medium text-slate-700">Concluir</span> ou{' '}
            <span className="font-medium text-slate-700">Avançar</span>.
          </p>
        </div>
        {sharedCycleFallback ? (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1">
            Exibindo tarefas do ciclo (ainda sem vínculo direto à campanha).
          </p>
        ) : null}
      </div>

      {effectiveTasks.length === 0 ? (
        <p className="text-sm text-slate-500">
          Nenhuma tarefa nesta campanha ainda.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 overflow-x-auto">
          {CAMPAIGN_KANBAN_COLUMNS.map((col) => (
            <div
              key={col.id}
              className="min-w-[160px] rounded-xl bg-slate-50 border border-slate-200 p-2"
            >
              <div className="flex items-center justify-between px-1 mb-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  {col.label}
                </h3>
                <span className="text-[10px] text-slate-400 tabular-nums">
                  {byColumn[col.id].length}
                </span>
              </div>
              <ul className="space-y-2 min-h-[80px]">
                {byColumn[col.id].map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    busyId={busyId}
                    onAdvance={handleAdvance}
                    onComplete={handleComplete}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
