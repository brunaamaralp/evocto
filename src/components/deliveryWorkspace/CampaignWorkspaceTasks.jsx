import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import TaskTimerButton from '@/components/tasks/TaskTimerButton';

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

function columnForTask(task) {
  const status = String(task?.status || 'todo').toLowerCase();
  const stage = String(task?.kanbanColumn || task?.stage || task?.pipeline_stage || '')
    .toLowerCase()
    .trim();

  for (const col of CAMPAIGN_KANBAN_COLUMNS) {
    if (stage && col.statuses.includes(stage)) return col.id;
    if (col.statuses.includes(status)) return col.id;
  }
  // Fallback: sem match explícito → Planejamento
  if (['blocked', 'rejected', 'cancelled'].includes(status)) return 'revisao';
  return 'planejamento';
}

function TaskCard({ task }) {
  return (
    <li className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
      <p className="text-sm font-medium text-slate-800 leading-snug">{task.title}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <Badge variant="outline" className="text-[10px]">
          {(task.status || 'todo').replace(/_/g, ' ')}
        </Badge>
        <TaskTimerButton task={task} showLabel={false} />
      </div>
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
}) {
  const byColumn = useMemo(() => {
    const map = Object.fromEntries(CAMPAIGN_KANBAN_COLUMNS.map((c) => [c.id, []]));
    for (const task of tasks) {
      const col = columnForTask(task);
      map[col].push(task);
    }
    return map;
  }, [tasks]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Tarefas</h2>
          <p className="text-sm text-slate-500 mt-1">
            Kanban da campanha
            {scopeLabel ? ` · ${scopeLabel}` : ''}.
          </p>
        </div>
        {sharedCycleFallback ? (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1">
            Exibindo tarefas do ciclo (ainda sem vínculo direto à campanha).
          </p>
        ) : null}
      </div>

      {tasks.length === 0 ? (
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
                  <TaskCard key={task.id} task={task} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
