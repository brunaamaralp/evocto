import { useMemo, useState } from 'react';
import { Check, ChevronRight, Loader2, Plus, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Task } from '@/api/entities';
import TaskTimerButton from '@/components/tasks/TaskTimerButton';
import TaskCreateModal from '@/components/tasks/TaskCreateModal';
import { useSession } from '@/components/auth/SessionManager';
import { completeTask, notifyTaskCompleted, toastTaskCompleted, toastTaskCompleteError } from '@/lib/completeTask';
import { createManualTask } from '@/lib/createManualTask';
import { openTaskDrawer } from '@/lib/openTaskDrawer';
import { completedKanbanColumnForTask } from '@/lib/taskStatusTransition';
import { getTaskAssigneeId, isTaskOverdue } from '@/lib/taskFilterPresets';
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

/** Status default ao criar na coluna (quick-add). */
const COLUMN_CREATE_STATUS = Object.freeze({
  planejamento: 'todo',
  roteiros: 'roteiro',
  producao: 'in_progress',
  revisao: 'in_review',
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

function formatDueShort(dueDate) {
  if (!dueDate) return null;
  const d = new Date(dueDate);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function assigneeLabel(task) {
  if (task?.assigneeName) return String(task.assigneeName);
  const id = getTaskAssigneeId(task);
  if (!id) return null;
  return 'Atribuída';
}

function CampaignQuickAdd({
  columnId,
  agencyId,
  userId,
  clientId,
  serviceId,
  cycleId,
  briefingId,
  disabled,
  onCreated,
}) {
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [assignToMe, setAssignToMe] = useState(true);
  const [dueDate, setDueDate] = useState('');
  const createStatus = COLUMN_CREATE_STATUS[columnId];
  if (!createStatus) return null;

  const submit = async ({ openDrawer = false } = {}) => {
    const trimmed = title.trim();
    if (!trimmed || saving || !agencyId || !clientId || !serviceId || disabled) return;
    setSaving(true);
    try {
      const created = await createManualTask({
        title: trimmed,
        agencyId,
        userId: userId || null,
        clientId,
        serviceId,
        cycleId: cycleId || null,
        briefingId: briefingId || null,
        status: createStatus,
        kanbanColumn: columnId,
        quickAdd: true,
        assignedTo: showMore && assignToMe ? userId || null : null,
        dueDate: showMore && dueDate ? dueDate : null,
      });
      setTitle('');
      setDueDate('');
      setShowMore(false);
      toast.success(
        openDrawer ? 'Tarefa criada — complete os detalhes' : 'Tarefa criada'
      );
      if (typeof onCreated === 'function') await onCreated(created);
      if (openDrawer && created?.id) openTaskDrawer(created.id);
    } catch (err) {
      console.error('[CampaignWorkspaceTasks] quick-add', err);
      toast.error(err?.message || 'Não foi possível criar a tarefa');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-2 space-y-1">
      <Input
        value={title}
        disabled={saving || disabled || !agencyId}
        placeholder="Adicionar…"
        className="h-7 bg-white text-xs"
        aria-label={`Criar tarefa em ${columnId}`}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            void submit({ openDrawer: e.shiftKey });
          }
        }}
      />
      {showMore ? (
        <div className="space-y-1">
          <label className="flex items-center gap-1.5 text-[10px] text-slate-600">
            <input
              type="checkbox"
              checked={assignToMe}
              disabled={saving || !userId}
              onChange={(e) => setAssignToMe(e.target.checked)}
            />
            Atribuir a mim
          </label>
          <Input
            type="date"
            value={dueDate}
            disabled={saving}
            className="h-7 bg-white text-xs"
            aria-label="Prazo"
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
      ) : null}
      <button
        type="button"
        className="text-[10px] text-slate-500 hover:underline"
        onClick={() => setShowMore((v) => !v)}
      >
        {showMore ? 'Menos' : 'Responsável / prazo'}
      </button>
    </div>
  );
}

function TaskCard({ task, busyId, onAdvance, onComplete }) {
  const col = columnForTask(task);
  const done = isDoneTask(task) || col === 'publicacao';
  const busy = busyId === task.id;
  const canAdvance = !done && CAMPAIGN_COLUMN_ADVANCE[col];
  const overdue = isTaskOverdue(task);
  const dueLabel = formatDueShort(task.dueDate);
  const who = assigneeLabel(task);

  return (
    <li
      className={`rounded-lg border bg-white p-2.5 shadow-sm ${
        overdue ? 'border-red-300 ring-1 ring-red-200' : 'border-slate-200'
      }`}
    >
      <button
        type="button"
        className="w-full text-left"
        onClick={() => openTaskDrawer(task.id)}
      >
        <p className="text-sm font-medium text-slate-800 leading-snug">{task.title}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
          {who ? (
            <span className="inline-flex items-center gap-0.5">
              <User className="h-2.5 w-2.5" />
              {who}
            </span>
          ) : (
            <span className="text-amber-700">Sem responsável</span>
          )}
          {dueLabel ? (
            <span className={overdue ? 'font-medium text-red-600' : ''}>
              {overdue ? 'Atrasada · ' : ''}
              {dueLabel}
            </span>
          ) : !done ? (
            <span className="text-slate-400">Sem prazo</span>
          ) : null}
        </div>
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
              className="touch-target h-11 px-3 text-xs"
              disabled={busy}
              onClick={() => onAdvance(task)}
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
              Avançar
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            className="touch-target h-11 px-3 text-xs bg-emerald-600 hover:bg-emerald-700"
            disabled={busy}
            onClick={() => onComplete(task)}
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
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
  scopeLabel: _scopeLabel = null,
  sharedCycleFallback = false,
  onTasksNeedReload = null,
  clientId = null,
  serviceId = null,
  briefingId = null,
  cycleId = null,
}) {
  const { user, agencyId } = useSession();
  const [busyId, setBusyId] = useState(null);
  const [localOverrides, setLocalOverrides] = useState({});
  const [showCreate, setShowCreate] = useState(false);
  const [mobileColumn, setMobileColumn] = useState(
    () => CAMPAIGN_KANBAN_COLUMNS[0]?.id || 'planejamento'
  );

  const canCreate = Boolean(clientId && serviceId && agencyId);

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

  const handleAdvance = async (task) => {
    const col = columnForTask(task);
    const next = CAMPAIGN_COLUMN_ADVANCE[col];
    if (!next) return;
    // Transição terminal usa o mesmo caminho de conclusão (notificações/histórico).
    if (String(next.status).toLowerCase() === 'completed') {
      await handleComplete(task);
      return;
    }
    await patchTask(task, next, 'Tarefa avançada');
  };

  const handleTaskCreated = async () => {
    setShowCreate(false);
    if (typeof onTasksNeedReload === 'function') {
      await onTasksNeedReload();
    }
  };

  const handleQuickCreated = async () => {
    if (typeof onTasksNeedReload === 'function') {
      await onTasksNeedReload();
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('task:refresh'));
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Tarefas</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {sharedCycleFallback ? (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1">
              Inclui tarefas do ciclo ainda sem vínculo direto à campanha.
            </p>
          ) : null}
          {canCreate ? (
            <Button className="touch-target" onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Nova tarefa
            </Button>
          ) : null}
        </div>
      </div>

      {effectiveTasks.length === 0 && !canCreate ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center">
          <p className="text-sm text-slate-600">Nenhuma tarefa nesta campanha ainda.</p>
          <p className="mt-2 text-xs text-slate-500">
            Abra o workspace com cliente e serviço para criar tarefas.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile / tablet: uma coluna por vez */}
          <div className="lg:hidden space-y-3">
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
              {CAMPAIGN_KANBAN_COLUMNS.map((col) => {
                const count = byColumn[col.id].length;
                const active = mobileColumn === col.id;
                return (
                  <Button
                    key={col.id}
                    type="button"
                    variant={active ? 'default' : 'outline'}
                    size="sm"
                    className="shrink-0 touch-target h-11 text-xs"
                    onClick={() => setMobileColumn(col.id)}
                  >
                    {col.label} ({count})
                  </Button>
                );
              })}
            </div>
            {CAMPAIGN_KANBAN_COLUMNS.filter((c) => c.id === mobileColumn).map((col) => (
              <div
                key={col.id}
                className="rounded-xl bg-slate-50 border border-slate-200 p-3"
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
                {canCreate ? (
                  <CampaignQuickAdd
                    columnId={col.id}
                    agencyId={agencyId}
                    userId={user?.id}
                    clientId={clientId}
                    serviceId={serviceId}
                    cycleId={cycleId}
                    briefingId={briefingId}
                    disabled={Boolean(busyId)}
                    onCreated={handleQuickCreated}
                  />
                ) : null}
              </div>
            ))}
          </div>

          {/* Desktop: 5 colunas */}
          <div className="hidden lg:grid lg:grid-cols-5 gap-3">
            {CAMPAIGN_KANBAN_COLUMNS.map((col) => (
              <div
                key={col.id}
                className="min-w-0 rounded-xl bg-slate-50 border border-slate-200 p-2"
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
                {canCreate ? (
                  <CampaignQuickAdd
                    columnId={col.id}
                    agencyId={agencyId}
                    userId={user?.id}
                    clientId={clientId}
                    serviceId={serviceId}
                    cycleId={cycleId}
                    briefingId={briefingId}
                    disabled={Boolean(busyId)}
                    onCreated={handleQuickCreated}
                  />
                ) : null}
              </div>
            ))}
          </div>
        </>
      )}

      <TaskCreateModal
        open={showCreate}
        onOpenChange={setShowCreate}
        onSuccess={handleTaskCreated}
        defaultClientId={clientId}
        defaultServiceId={serviceId}
        defaultBriefingId={briefingId}
        defaultCycleId={cycleId}
      />
    </section>
  );
}
