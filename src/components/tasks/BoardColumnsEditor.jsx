/**
 * Editor das colunas do quadro: nome, tipo (status base), ordem, adicionar e remover.
 * No quadro de um cliente, escolhe entre colunas próprias do cliente ou o padrão da agência.
 */

import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  COLUMN_STATUS_OPTIONS,
  DEFAULT_BOARD_COLUMNS,
  MAX_COLUMNS,
  MAX_COLUMN_NAME,
  newColumnId,
} from '@/lib/boardColumns';

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {(open: boolean) => void} props.onOpenChange
 * @param {ReturnType<import('@/hooks/useBoardColumns').default>} props.board
 * @param {Record<string, number>} [props.taskCounts] id da coluna → nº de tarefas
 * @param {string} [props.clientName]
 */
export default function BoardColumnsEditor({ open, onOpenChange, board, taskCounts = {}, clientName = null }) {
  const isClientBoard = board.canUseClientScope;
  const [scope, setScope] = useState('agency');
  const [draft, setDraft] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const initialScope = isClientBoard && board.source === 'client' ? 'client' : 'agency';
    setScope(initialScope);
    setDraft(board.columns.map((c) => ({ ...c })));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const changeScope = (next) => {
    setScope(next);
    // Ao sair das colunas próprias, mostra as da agência; ao criar próprias, parte das atuais
    if (next === 'agency') setDraft(board.agencyColumns.map((c) => ({ ...c })));
  };

  const update = (index, patch) =>
    setDraft((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));

  const move = (index, delta) =>
    setDraft((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const remove = (index) => {
    const col = draft[index];
    const count = taskCounts[col.id] || 0;
    if (
      count > 0 &&
      !window.confirm(
        `"${col.name}" tem ${count} tarefa${count === 1 ? '' : 's'}. Elas vão para outra coluna do mesmo tipo (ou a mais parecida). Remover?`
      )
    ) {
      return;
    }
    setDraft((prev) => prev.filter((_, i) => i !== index));
  };

  const add = () =>
    setDraft((prev) =>
      prev.length >= MAX_COLUMNS
        ? prev
        : [...prev, { id: newColumnId(), name: 'Nova coluna', status: 'in_progress' }]
    );

  const handleSave = async () => {
    const cleaned = draft.map((c) => ({ ...c, name: c.name.trim() }));
    if (cleaned.length === 0) {
      toast.error('O quadro precisa de pelo menos uma coluna.');
      return;
    }
    if (cleaned.some((c) => !c.name)) {
      toast.error('Dê um nome para todas as colunas.');
      return;
    }
    setSaving(true);
    try {
      if (isClientBoard && scope === 'agency' && board.source === 'client') {
        // Cliente deixa de ter colunas próprias; o padrão da agência também pode ter sido editado
        await board.resetClientColumns();
        await board.saveColumns(cleaned, 'agency');
      } else {
        await board.saveColumns(cleaned, scope);
      }
      toast.success('Colunas salvas');
      onOpenChange(false);
    } catch (err) {
      console.error('[BoardColumnsEditor]', err);
      toast.error(err?.message || 'Não foi possível salvar as colunas');
    } finally {
      setSaving(false);
    }
  };

  const hasDoneColumn = draft.some((c) => c.status === 'completed');

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Colunas do quadro</DialogTitle>
          <DialogDescription>
            O tipo diz ao sistema o que a coluna significa — por exemplo, cards em uma coluna do tipo
            “Concluída” contam como tarefas concluídas.
          </DialogDescription>
        </DialogHeader>

        {isClientBoard ? (
          <div role="radiogroup" aria-label="Onde aplicar" className="grid grid-cols-2 gap-2 text-sm">
            {[
              { id: 'client', label: `Só ${clientName || 'deste cliente'}`, hint: 'Colunas próprias' },
              { id: 'agency', label: 'Padrão da agência', hint: 'Vale para todos sem colunas próprias' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={scope === opt.id}
                onClick={() => changeScope(opt.id)}
                className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                  scope === opt.id
                    ? 'border-[#1A1210] bg-[#1A1210] text-white'
                    : 'border-[#E4DDD4] text-[#1A1210] hover:bg-[#FAFAFB]'
                }`}
              >
                <span className="block truncate font-medium">{opt.label}</span>
                <span className={`block text-xs ${scope === opt.id ? 'text-white/70' : 'text-[#6B635C]'}`}>
                  {opt.hint}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#6B635C]">
            Estas são as colunas padrão da agência: valem no quadro geral e nos clientes sem colunas
            próprias.
          </p>
        )}

        <ol className="space-y-2">
          {draft.map((col, index) => (
            <li key={col.id} className="flex items-center gap-2 rounded-xl border border-[#E4DDD4] p-2">
              <div className="flex flex-col">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label={`Mover "${col.name}" para a esquerda`}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => move(index, 1)}
                  disabled={index === draft.length - 1}
                  aria-label={`Mover "${col.name}" para a direita`}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Input
                value={col.name}
                maxLength={MAX_COLUMN_NAME}
                onChange={(e) => update(index, { name: e.target.value })}
                aria-label="Nome da coluna"
                className="min-w-0 flex-1"
              />
              <Select value={col.status} onValueChange={(value) => update(index, { status: value })}>
                <SelectTrigger className="w-[9.5rem] shrink-0" aria-label="Tipo da coluna">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLUMN_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-[#6B635C] hover:text-[#c0392b]"
                onClick={() => remove(index)}
                disabled={draft.length <= 1}
                aria-label={`Remover "${col.name}"`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button type="button" variant="outline" size="sm" onClick={add} disabled={draft.length >= MAX_COLUMNS}>
            <Plus className="mr-1 h-4 w-4" />
            Adicionar coluna
          </Button>
          <button
            type="button"
            className="text-xs text-[#6B635C] hover:text-[#1A1210] hover:underline"
            onClick={() => setDraft(DEFAULT_BOARD_COLUMNS.map((c) => ({ ...c })))}
          >
            Restaurar colunas padrão
          </button>
        </div>

        {!hasDoneColumn ? (
          <p className="text-xs text-[#b45309]">
            Sem coluna do tipo “Concluída”, tarefas concluídas aparecem na última coluna.
          </p>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar colunas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
