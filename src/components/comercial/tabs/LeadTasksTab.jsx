import { useMemo, useState } from 'react';
import { Bell, CalendarClock, CheckCircle2, Circle, ListTodo, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { LEAD_TASK_TYPES, LEAD_TASK_TYPE_LABELS, labelFrom } from '@/lib/agencyLeads/constants';
import { isLeadTaskOpen, sortLeadTasks, taskDueState } from '@/lib/agencyLeads/followUp';
import { toDateTimeInputValue } from '@/lib/agencyLeads/leadFields';
import { canManageLeadItem } from '@/lib/agencyLeads/leadCrmApi';
import { MemberSelect, TabEmpty, TabError, TabLoading } from '../LeadShared';
import { TONE_CLASSES, formatDateTime, formatRelativeDay, memberName } from '../leadUi';

const DUE_TONE = { overdue: 'danger', due_soon: 'warning', scheduled: 'muted', none: 'muted', done: 'ok' };
const DUE_LABEL = { overdue: 'Atrasada', due_soon: 'Em breve', scheduled: '', none: 'Sem data', done: 'Concluída' };
const TYPE_ICON = { follow_up: CalendarClock, tarefa: ListTodo, lembrete: Bell };

function defaultDue() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return toDateTimeInputValue(d);
}

function TaskForm({ initial, members, userId, onSubmit, onCancel, submitLabel }) {
  const [form, setForm] = useState(() => ({
    leadTaskType: initial?.leadTaskType || 'follow_up',
    title: initial?.title || '',
    dueDate: initial ? toDateTimeInputValue(initial.dueDate) : defaultDue(),
    assigneeId: initial?.assigneeId || userId || '',
    description: initial?.description || '',
  }));
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Informe o que precisa ser feito');
      return;
    }
    setSaving(true);
    try {
      await onSubmit({ ...form, title: form.title.trim(), dueDate: form.dueDate || null });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-[#E4DDD4] bg-white p-4">
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Tipo de atividade">
        {LEAD_TASK_TYPES.map((t) => {
          const Icon = TYPE_ICON[t.id] || ListTodo;
          const active = form.leadTaskType === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => set('leadTaskType', t.id)}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs',
                active ? 'border-[#B80015] bg-[#FFF5F5] font-medium text-[#B80015]' : 'border-[#E4DDD4] text-[#6B635C]'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>
      <div>
        <Label htmlFor="task-title" className="text-xs text-[#6B635C]">O que fazer *</Label>
        <Input
          id="task-title"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          className="mt-1.5"
          placeholder={form.leadTaskType === 'follow_up' ? 'Ex.: ligar para retomar proposta' : 'Ex.: montar apresentação'}
          autoFocus
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="task-due" className="text-xs text-[#6B635C]">Vencimento</Label>
          <Input id="task-due" type="datetime-local" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="task-assignee" className="text-xs text-[#6B635C]">Responsável</Label>
          <MemberSelect id="task-assignee" members={members} value={form.assigneeId} onChange={(v) => set('assigneeId', v)} />
        </div>
      </div>
      <div>
        <Label htmlFor="task-desc" className="text-xs text-[#6B635C]">Observações / lembrete</Label>
        <Textarea id="task-desc" rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} className="mt-1.5" />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" className="bg-[#B80015] hover:bg-[#8A0010]" disabled={saving}>
          {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

export default function LeadTasksTab({
  tasks,
  loading,
  error,
  schemaMissing,
  onRetry,
  members,
  user,
  isAdmin,
  onCreate,
  onUpdate,
  onToggleDone,
  onDelete,
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [showDone, setShowDone] = useState(false);

  const sorted = useMemo(() => sortLeadTasks(tasks), [tasks]);
  const open = sorted.filter(isLeadTaskOpen);
  const done = sorted.filter((t) => !isLeadTaskOpen(t));

  if (loading) return <TabLoading label="Carregando atividades…" />;
  if (error) return <TabError message={error} schemaMissing={schemaMissing} onRetry={onRetry} />;

  const run = async (id, fn, okMsg) => {
    setBusyId(id);
    try {
      await fn();
      if (okMsg) toast.success(okMsg);
    } catch (err) {
      toast.error(err?.message || 'Não foi possível concluir a ação');
    } finally {
      setBusyId(null);
    }
  };

  const renderTask = (task) => {
    if (editingId === task.id) {
      return (
        <li key={task.id}>
          <TaskForm
            initial={task}
            members={members}
            userId={user?.id}
            submitLabel="Salvar"
            onCancel={() => setEditingId(null)}
            onSubmit={async (form) => {
              try {
                await onUpdate(task, form);
                toast.success('Atividade atualizada');
                setEditingId(null);
              } catch (err) {
                toast.error(err?.message || 'Erro ao salvar');
              }
            }}
          />
        </li>
      );
    }
    const state = taskDueState(task);
    const isDone = state === 'done';
    const Icon = TYPE_ICON[task.leadTaskType] || ListTodo;
    const canManage = canManageLeadItem({ createdBy: task.assignedBy || task.assigneeId }, { userId: user?.id, isAdmin }) ||
      String(task.assigneeId || '') === String(user?.id || '');
    const busy = busyId === task.id;
    return (
      <li key={task.id} className="flex items-start gap-3 rounded-2xl border border-[#E4DDD4] bg-white p-3">
        <button
          type="button"
          className="mt-0.5 shrink-0 disabled:opacity-50"
          aria-label={isDone ? 'Reabrir atividade' : 'Marcar como concluída'}
          disabled={busy}
          onClick={() => run(task.id, () => onToggleDone(task, !isDone), isDone ? 'Atividade reaberta' : 'Atividade concluída')}
        >
          {busy ? (
            <Loader2 className="h-5 w-5 animate-spin text-[#B80015]" />
          ) : isDone ? (
            <CheckCircle2 className="h-5 w-5 text-[#2E8B57]" />
          ) : (
            <Circle className="h-5 w-5 text-[#B5ACA3] hover:text-[#B80015]" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <p className={cn('text-sm font-medium text-[#1A1210]', isDone && 'text-[#9A9088] line-through')}>{task.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#6B635C]">
            <span className="inline-flex items-center gap-1">
              <Icon className="h-3 w-3" />
              {labelFrom(LEAD_TASK_TYPE_LABELS, task.leadTaskType) || 'Tarefa'}
            </span>
            {task.dueDate ? (
              <span title={formatDateTime(task.dueDate)}>· {formatRelativeDay(task.dueDate)}</span>
            ) : null}
            {memberName(members, task.assigneeId) ? <span>· {memberName(members, task.assigneeId)}</span> : null}
            {DUE_LABEL[state] && !isDone ? (
              <span className={cn('rounded-full border px-1.5 py-px text-[10px] font-medium', TONE_CLASSES[DUE_TONE[state]])}>
                {DUE_LABEL[state]}
              </span>
            ) : null}
          </div>
          {task.description ? (
            <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-[#6B635C]">{task.description}</p>
          ) : null}
        </div>
        {canManage ? (
          <div className="flex shrink-0 gap-0.5">
            {!isDone ? (
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label="Editar atividade" onClick={() => setEditingId(task.id)}>
                <Pencil className="h-3.5 w-3.5 text-[#6B635C]" />
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label="Excluir atividade"
              disabled={busy}
              onClick={() => {
                if (window.confirm('Excluir esta atividade?')) run(task.id, () => onDelete(task), 'Atividade excluída');
              }}
            >
              <Trash2 className="h-3.5 w-3.5 text-[#6B635C]" />
            </Button>
          </div>
        ) : null}
      </li>
    );
  };

  return (
    <div className="space-y-3">
      {adding ? (
        <TaskForm
          members={members}
          userId={user?.id}
          submitLabel="Criar atividade"
          onCancel={() => setAdding(false)}
          onSubmit={async (form) => {
            try {
              await onCreate(form);
              toast.success('Atividade criada');
              setAdding(false);
            } catch (err) {
              toast.error(err?.message || 'Erro ao criar atividade');
            }
          }}
        />
      ) : (
        <Button type="button" size="sm" className="w-full bg-[#B80015] hover:bg-[#8A0010] sm:w-auto" onClick={() => setAdding(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Agendar próximo contato / tarefa
        </Button>
      )}

      {open.length === 0 && !adding ? (
        <TabEmpty
          icon={CalendarClock}
          title="Nenhuma atividade em aberto"
          description="Todo lead em negociação precisa de um próximo passo. Agende o próximo contato para não perder o timing."
        />
      ) : (
        <ul className="space-y-2">{open.map(renderTask)}</ul>
      )}

      {done.length > 0 ? (
        <div className="pt-1">
          <button
            type="button"
            className="text-xs font-medium text-[#6B635C] hover:text-[#B80015]"
            onClick={() => setShowDone((v) => !v)}
          >
            {showDone ? 'Ocultar' : 'Mostrar'} concluídas ({done.length})
          </button>
          {showDone ? <ul className="mt-2 space-y-2">{done.map(renderTask)}</ul> : null}
        </div>
      ) : null}
    </div>
  );
}
