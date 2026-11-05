import { useState } from 'react';
import { Loader2, Lock, NotebookPen, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { canManageLeadItem } from '@/lib/agencyLeads/leadCrmApi';
import { TabEmpty, TabError, TabLoading } from '../LeadShared';
import { formatAgo, formatDateTime } from '../leadUi';

export default function LeadNotesTab({ notes, loading, error, schemaMissing, onRetry, user, isAdmin, onCreate, onUpdate, onDelete }) {
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [busyId, setBusyId] = useState(null);

  if (loading) return <TabLoading label="Carregando notas…" />;
  if (error) return <TabError message={error} schemaMissing={schemaMissing} onRetry={onRetry} />;

  const create = async () => {
    if (!draft.trim()) return;
    setSaving(true);
    try {
      await onCreate(draft);
      setDraft('');
      toast.success('Nota adicionada');
    } catch (err) {
      toast.error(err?.message || 'Erro ao salvar nota');
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async (note) => {
    if (!editText.trim()) {
      toast.error('A nota não pode ficar vazia');
      return;
    }
    setBusyId(note.id);
    try {
      await onUpdate(note, { body: editText.trim() });
      setEditingId(null);
      toast.success('Nota atualizada');
    } catch (err) {
      toast.error(err?.message || 'Erro ao atualizar');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (note) => {
    if (!window.confirm('Excluir esta nota?')) return;
    setBusyId(note.id);
    try {
      await onDelete(note);
      toast.success('Nota excluída');
    } catch (err) {
      toast.error(err?.message || 'Erro ao excluir');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-[#E4DDD4] bg-white p-3">
        <Textarea
          rows={3}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') create();
          }}
          placeholder="Anotação interna sobre o lead (percepções, alertas, combinados internos)…"
          className="border-0 p-0 shadow-none focus-visible:ring-0"
          aria-label="Nova nota interna"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-[11px] text-[#9A9088]">
            <Lock className="h-3 w-3" />
            Visível apenas para a equipe
          </span>
          <Button type="button" size="sm" className="bg-[#B80015] hover:bg-[#8A0010]" onClick={create} disabled={saving || !draft.trim()}>
            {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
            Adicionar nota
          </Button>
        </div>
      </div>

      {notes.length === 0 ? (
        <TabEmpty icon={NotebookPen} title="Nenhuma nota interna" description="Use notas para registrar percepções da equipe que não fazem parte do histórico de contatos." />
      ) : (
        <ul className="space-y-2">
          {notes.map((note) => {
            const canManage = canManageLeadItem(note, { userId: user?.id, isAdmin });
            const busy = busyId === note.id;
            return (
              <li key={note.id} className="rounded-2xl border border-[#F3E6B5] bg-[#FFFCF2] p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs text-[#6B635C]">
                    <span className="font-semibold text-[#1A1210]">{note.authorName || 'Equipe'}</span>
                    {' · '}
                    <span title={formatDateTime(note.occurredAt || note.created_date)}>{formatAgo(note.occurredAt || note.created_date)}</span>
                    {note.editedAt ? ' · editada' : ''}
                  </p>
                  {canManage && editingId !== note.id ? (
                    <div className="flex shrink-0 gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-label="Editar nota"
                        onClick={() => {
                          setEditingId(note.id);
                          setEditText(note.body || '');
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5 text-[#6B635C]" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label="Excluir nota" disabled={busy} onClick={() => remove(note)}>
                        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 text-[#6B635C]" />}
                      </Button>
                    </div>
                  ) : null}
                </div>
                {editingId === note.id ? (
                  <div className="mt-2 space-y-2">
                    <Textarea rows={3} value={editText} onChange={(e) => setEditText(e.target.value)} autoFocus />
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setEditingId(null)} disabled={busy}>
                        Cancelar
                      </Button>
                      <Button type="button" size="sm" className="bg-[#B80015] hover:bg-[#8A0010]" onClick={() => saveEdit(note)} disabled={busy}>
                        {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                        Salvar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-[#1A1210]">{note.body}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
