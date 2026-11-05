/**
 * Lista de tarefas agrupada por prazo (estilo Asana "Minhas tarefas").
 * - Clique na linha abre o TaskDrawer (evento `task:open`).
 * - Círculo à esquerda conclui a tarefa.
 * - Campo "Adicionar tarefa" cria com Enter (atribuída ao usuário atual).
 */

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Circle, CheckCircle2, Loader2, Plus } from 'lucide-react';
import { useSession } from '@/components/auth/SessionManager';
import { createManualTask } from '@/lib/createManualTask';
import {
  completeTask,
  notifyTaskCompleted,
  toastTaskCompleted,
  toastTaskCompleteError,
} from '@/lib/completeTask';
import { groupTasksByDue, formatDueShort, resolveDueGroupId } from '@/lib/taskDueGroups';
import { toast } from 'sonner';

function openTask(taskId) {
  if (!taskId) return;
  window.dispatchEvent(new CustomEvent('task:open', { detail: { taskId } }));
}

const PRIORITY_LABEL = {
  urgent: { label: 'Urgente', className: 'text-[#c0392b]' },
  high: { label: 'Alta', className: 'text-[#c0392b]' },
};

function QuickAddTask({ clientId = null, onCreated }) {
  const { agencyId, user } = useSession();
  const userId = user?.id || user?.data?.id || null;
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const trimmed = title.trim();
    if (!trimmed || saving || !agencyId) return;
    setSaving(true);
    try {
      const task = await createManualTask({
        title: trimmed,
        agencyId,
        userId,
        clientId: clientId || null,
        assignedTo: userId,
        status: 'todo',
        priority: 'medium',
        quickAdd: true,
      });
      setTitle('');
      onCreated?.(task);
      window.dispatchEvent(new Event('task:refresh'));
    } catch (err) {
      console.error('[QuickAddTask]', err);
      toast.error(err?.message || 'Não foi possível criar a tarefa');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2 border-b border-[#F0EEF7] px-3 py-2">
      {saving ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#6B635C]" aria-hidden />
      ) : (
        <Plus className="h-4 w-4 shrink-0 text-[#6B635C]" aria-hidden />
      )}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            submit();
          }
        }}
        disabled={saving}
        placeholder="Adicionar tarefa… (Enter para salvar)"
        aria-label="Adicionar tarefa"
        className="min-w-0 flex-1 bg-transparent py-1 text-sm text-[#1A1210] placeholder:text-[#9A918A] focus:outline-none"
      />
    </div>
  );
}

function TaskRow({ task, clientName, showClient, completing, onComplete, now }) {
  const due = formatDueShort(task, now);
  const overdue = resolveDueGroupId(task, now) === 'overdue';
  const priority = PRIORITY_LABEL[String(task.priority || '').toLowerCase()] || null;

  return (
    <li className="group flex items-center gap-1 border-b border-[#F0EEF7] last:border-b-0 hover:bg-[#FAFAFB]">
      <button
        type="button"
        onClick={() => onComplete(task)}
        disabled={completing}
        className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#9A918A] hover:text-[#1a7f37]"
        aria-label={`Concluir "${task.title || 'tarefa'}"`}
        title="Marcar como concluída"
      >
        {completing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Circle className="h-[18px] w-[18px] group-hover:hidden" />
            <CheckCircle2 className="hidden h-[18px] w-[18px] group-hover:block" />
          </>
        )}
      </button>
      <button
        type="button"
        onClick={() => openTask(task.id)}
        className="flex min-w-0 flex-1 items-center justify-between gap-3 py-2.5 pr-3 text-left"
      >
        <span className="min-w-0 flex-1 truncate text-sm text-[#1A1210]">
          {task.title || 'Tarefa sem título'}
        </span>
        <span className="flex shrink-0 items-center gap-3 text-xs">
          {showClient && clientName ? (
            <span className="hidden max-w-[10rem] truncate rounded-full bg-[#F1EDE7] px-2 py-0.5 text-[#6B635C] sm:inline">
              {clientName}
            </span>
          ) : null}
          {priority ? <span className={`font-medium ${priority.className}`}>{priority.label}</span> : null}
          {due ? (
            <span
              className={`tabular-nums ${
                overdue ? 'font-medium text-[#c0392b]' : due === 'Hoje' ? 'font-medium text-[#B80015]' : 'text-[#6B635C]'
              }`}
            >
              {due}
            </span>
          ) : null}
        </span>
      </button>
    </li>
  );
}

/**
 * @param {object} props
 * @param {object[]} props.tasks
 * @param {Record<string,string>} [props.clientNames] id → nome (mostra etiqueta do cliente)
 * @param {string|null} [props.clientId] cliente padrão para adição rápida
 * @param {(taskId: string) => void} [props.onTaskCompleted]
 * @param {() => void} [props.onTaskCreated]
 * @param {string} [props.emptyMessage]
 */
export default function TaskDueList({
  tasks = [],
  clientNames = null,
  clientId = null,
  onTaskCompleted,
  onTaskCreated,
  emptyMessage = 'Nenhuma tarefa aberta. Adicione a primeira acima.',
}) {
  const { agencyId, user } = useSession();
  const [completingId, setCompletingId] = useState(null);
  const [collapsed, setCollapsed] = useState({ later: true });
  const now = useMemo(() => new Date(), [tasks]); // eslint-disable-line react-hooks/exhaustive-deps
  const groups = useMemo(() => groupTasksByDue(tasks, { now }), [tasks, now]);
  const total = groups.reduce((n, g) => n + g.tasks.length, 0);

  const handleComplete = async (task) => {
    if (!task?.id || completingId) return;
    setCompletingId(task.id);
    try {
      const result = await completeTask(task, { agencyId: agencyId || task.agencyId, user });
      if (!result.success) {
        toastTaskCompleteError(result.message || 'Não é possível concluir esta tarefa');
        return;
      }
      toastTaskCompleted(task, {
        alreadyCompleted: result.alreadyCompleted,
        warning: result.warning,
      });
      notifyTaskCompleted(task.id);
      onTaskCompleted?.(task.id);
    } catch (err) {
      toastTaskCompleteError(err?.message || 'Erro ao concluir tarefa');
    } finally {
      setCompletingId(null);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-[#E4DDD4] bg-white">
      <QuickAddTask clientId={clientId} onCreated={onTaskCreated} />
      {total === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-[#6B635C]">{emptyMessage}</p>
      ) : (
        groups
          .filter((g) => g.tasks.length > 0)
          .map((group) => {
            const isCollapsed = Boolean(collapsed[group.id]);
            return (
              <section key={group.id} aria-label={group.label}>
                <button
                  type="button"
                  onClick={() =>
                    setCollapsed((prev) => ({ ...prev, [group.id]: !prev[group.id] }))
                  }
                  className="flex w-full items-center gap-1.5 border-b border-[#F0EEF7] bg-[#FAFAFB] px-3 py-2 text-left text-xs font-semibold text-[#1A1210]"
                  aria-expanded={!isCollapsed}
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-3.5 w-3.5 text-[#6B635C]" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-[#6B635C]" />
                  )}
                  <span className={group.id === 'overdue' ? 'text-[#c0392b]' : ''}>{group.label}</span>
                  <span className="font-normal tabular-nums text-[#6B635C]">{group.tasks.length}</span>
                </button>
                {!isCollapsed ? (
                  <ul>
                    {group.tasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        now={now}
                        showClient={Boolean(clientNames)}
                        clientName={
                          clientNames
                            ? task.clientId
                              ? clientNames[String(task.clientId)] || null
                              : 'Interno'
                            : null
                        }
                        completing={completingId === task.id}
                        onComplete={handleComplete}
                      />
                    ))}
                  </ul>
                ) : null}
              </section>
            );
          })
      )}
    </div>
  );
}
