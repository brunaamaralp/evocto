import { useState } from 'react';
import {
  ArrowRight,
  Flag,
  Loader2,
  Mail,
  MessageCircle,
  MessagesSquare,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Trash2,
  Users,
  Video,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  INTERACTION_TYPES,
  INTERACTION_TYPE_LABELS,
  labelFrom,
} from '@/lib/agencyLeads/constants';
import { leadEnteredAt, toDateTimeInputValue } from '@/lib/agencyLeads/leadFields';
import { canManageLeadItem } from '@/lib/agencyLeads/leadCrmApi';
import { MemberSelect, TabEmpty, TabError, TabLoading } from '../LeadShared';
import { formatDateTime, formatRelativeDay, memberName } from '../leadUi';

const CHANNEL_ICONS = {
  whatsapp: MessageCircle,
  ligacao: Phone,
  email: Mail,
  reuniao: Video,
  presencial: Users,
  outro: MoreHorizontal,
};

function InteractionForm({ initial, members, userId, onSubmit, onCancel, submitLabel = 'Registrar', allowSchedule = true }) {
  const [form, setForm] = useState(() => ({
    occurredAt: toDateTimeInputValue(initial?.occurredAt || new Date()),
    channel: initial?.channel || 'whatsapp',
    description: initial?.description || '',
    nextStep: initial?.nextStep || '',
    nextStepDueAt: '',
    responsibleId: initial?.responsibleId || userId || '',
  }));
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.description.trim()) {
      toast.error('Descreva o que foi conversado');
      return;
    }
    if (form.nextStepDueAt && !form.nextStep.trim()) {
      toast.error('Descreva o próximo passo para agendá-lo');
      return;
    }
    setSaving(true);
    try {
      await onSubmit(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-[#E4DDD4] bg-white p-4">
      <div>
        <Label className="text-xs text-[#6B635C]">Tipo de interação</Label>
        <div className="mt-1.5 flex flex-wrap gap-1.5" role="radiogroup">
          {INTERACTION_TYPES.map((t) => {
            const Icon = CHANNEL_ICONS[t.id] || MoreHorizontal;
            const active = form.channel === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => set('channel', t.id)}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors',
                  active
                    ? 'border-[#B80015] bg-[#FFF5F5] font-medium text-[#B80015]'
                    : 'border-[#E4DDD4] bg-white text-[#6B635C] hover:border-[#C9BFB4]'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="int-when" className="text-xs text-[#6B635C]">Data e horário</Label>
          <Input
            id="int-when"
            type="datetime-local"
            value={form.occurredAt}
            onChange={(e) => set('occurredAt', e.target.value)}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="int-resp" className="text-xs text-[#6B635C]">Responsável pelo contato</Label>
          <MemberSelect id="int-resp" members={members} value={form.responsibleId} onChange={(v) => set('responsibleId', v)} />
        </div>
      </div>
      <div>
        <Label htmlFor="int-desc" className="text-xs text-[#6B635C]">O que foi conversado *</Label>
        <Textarea
          id="int-desc"
          rows={3}
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          className="mt-1.5"
          placeholder="Resumo da conversa, objeções, interesses…"
          autoFocus
        />
      </div>
      <div className={cn('grid grid-cols-1 gap-3', allowSchedule && 'sm:grid-cols-[1fr_auto]')}>
        <div>
          <Label htmlFor="int-next" className="text-xs text-[#6B635C]">Próximo passo combinado</Label>
          <Input
            id="int-next"
            value={form.nextStep}
            onChange={(e) => set('nextStep', e.target.value)}
            className="mt-1.5"
            placeholder="Ex.: enviar proposta revisada"
          />
        </div>
        {allowSchedule ? (
          <div>
            <Label htmlFor="int-next-at" className="text-xs text-[#6B635C]">Agendar follow-up</Label>
            <Input
              id="int-next-at"
              type="datetime-local"
              value={form.nextStepDueAt}
              onChange={(e) => set('nextStepDueAt', e.target.value)}
              className="mt-1.5"
            />
          </div>
        ) : null}
      </div>
      {allowSchedule && form.nextStepDueAt ? (
        <p className="text-[11px] text-[#6B635C]">
          Um follow-up será criado em Atividades e no quadro de tarefas do responsável.
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
        ) : null}
        <Button type="submit" size="sm" className="bg-[#B80015] hover:bg-[#8A0010]" disabled={saving}>
          {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

export default function LeadTimelineTab({
  lead,
  items,
  loading,
  error,
  schemaMissing,
  onRetry,
  members,
  user,
  isAdmin,
  onCreate,
  onUpdate,
  onDelete,
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  if (loading) return <TabLoading label="Carregando histórico…" />;
  if (error) return <TabError message={error} schemaMissing={schemaMissing} onRetry={onRetry} />;

  const handleCreate = async (form) => {
    try {
      const res = await onCreate(form);
      toast.success(res?.followUp ? 'Interação registrada e follow-up agendado' : 'Interação registrada');
      setAdding(false);
    } catch (err) {
      toast.error(err?.message || 'Erro ao registrar interação');
    }
  };

  const handleUpdate = async (item, form) => {
    try {
      await onUpdate(item, {
        occurredAt: form.occurredAt ? new Date(form.occurredAt).toISOString() : item.occurredAt,
        channel: form.channel,
        description: form.description.trim(),
        nextStep: form.nextStep.trim() || null,
        responsibleId: form.responsibleId || null,
      });
      toast.success('Interação atualizada');
      setEditingId(null);
    } catch (err) {
      toast.error(err?.message || 'Erro ao atualizar');
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm('Excluir esta interação do histórico?')) return;
    setDeletingId(item.id);
    try {
      await onDelete(item);
      toast.success('Interação excluída');
    } catch (err) {
      toast.error(err?.message || 'Erro ao excluir');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-3">
      {adding ? (
        <InteractionForm
          members={members}
          userId={user?.id}
          onSubmit={handleCreate}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <Button
          type="button"
          className="w-full bg-[#B80015] hover:bg-[#8A0010] sm:w-auto"
          size="sm"
          onClick={() => setAdding(true)}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Registrar interação
        </Button>
      )}

      {items.length === 0 && !adding ? (
        <TabEmpty
          icon={MessagesSquare}
          title="Nenhuma interação registrada"
          description="Registre ligações, mensagens e reuniões para montar o histórico do relacionamento."
        />
      ) : null}

      <ol className="relative space-y-3 before:absolute before:bottom-2 before:left-[15px] before:top-2 before:w-px before:bg-[#E4DDD4]">
        {items.map((item) => {
          const Icon = CHANNEL_ICONS[item.channel] || MoreHorizontal;
          const canManage = canManageLeadItem(item, { userId: user?.id, isAdmin });
          const responsible = memberName(members, item.responsibleId) || item.authorName;
          if (editingId === item.id) {
            return (
              <li key={item.id} className="relative pl-10">
                <InteractionForm
                  initial={item}
                  members={members}
                  userId={user?.id}
                  allowSchedule={false}
                  submitLabel="Salvar"
                  onSubmit={(form) => handleUpdate(item, form)}
                  onCancel={() => setEditingId(null)}
                />
              </li>
            );
          }
          return (
            <li key={item.id} className="relative pl-10">
              <span className="absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full border border-[#E4DDD4] bg-white">
                <Icon className="h-4 w-4 text-[#B80015]" aria-hidden />
              </span>
              <div className="rounded-2xl border border-[#E4DDD4] bg-white p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#1A1210]">
                      {labelFrom(INTERACTION_TYPE_LABELS, item.channel) || 'Interação'}
                    </p>
                    <p className="text-xs text-[#9A9088]" title={formatDateTime(item.occurredAt)}>
                      {formatRelativeDay(item.occurredAt || item.created_date)}
                      {responsible ? ` · ${responsible}` : ''}
                      {item.editedAt ? ' · editado' : ''}
                    </p>
                  </div>
                  {canManage ? (
                    <div className="flex shrink-0 gap-0.5">
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label="Editar interação" onClick={() => setEditingId(item.id)}>
                        <Pencil className="h-3.5 w-3.5 text-[#6B635C]" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-label="Excluir interação"
                        disabled={deletingId === item.id}
                        onClick={() => handleDelete(item)}
                      >
                        {deletingId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 text-[#6B635C]" />}
                      </Button>
                    </div>
                  ) : null}
                </div>
                {item.description ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#1A1210]">{item.description}</p>
                ) : null}
                {item.nextStep ? (
                  <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-[#F8F7FB] px-2.5 py-1.5 text-xs text-[#1A1210]">
                    <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#B80015]" />
                    <span>
                      <span className="font-medium">Próximo passo:</span> {item.nextStep}
                    </span>
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
        <li className="relative pl-10">
          <span className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border border-[#E4DDD4] bg-[#F8F7FB]">
            <Flag className="h-4 w-4 text-[#9A9088]" aria-hidden />
          </span>
          <p className="pt-1.5 text-xs text-[#9A9088]">
            Lead criado no CRM · {formatDateTime(leadEnteredAt(lead))}
          </p>
        </li>
      </ol>
    </div>
  );
}
