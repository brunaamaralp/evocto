import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useSession } from '@/components/auth/SessionManager';
import { useTimeEntryChangeListener } from '@/hooks/useTaskTimer';
import { formatDurationHms, canMutateTimeEntry } from '@/lib/timeEntriesCore';
import { deleteTimeEntry, listTimeEntries } from '@/lib/timeEntriesApi';
import { Trash2 } from 'lucide-react';

export default function TaskTimeSessionsPanel({ taskId }) {
  const { agencyId } = useSession();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!agencyId || !taskId) return;
    setLoading(true);
    try {
      const rows = await listTimeEntries(agencyId, { taskId, limit: 50 });
      setEntries(rows);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [agencyId, taskId]);

  useEffect(() => {
    load();
  }, [load]);

  useTimeEntryChangeListener(load);

  const total = entries
    .filter((e) => e.status === 'completed' || e.status === 'paused')
    .reduce((s, e) => s + (e.durationSeconds || 0), 0);

  const handleDelete = async (id) => {
    try {
      await deleteTimeEntry(agencyId, id);
      toast.success('Sessão removida');
      load();
    } catch (e) {
      toast.error(e?.message || 'Falha ao remover');
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-slate-800">Sessões de tempo</h4>
        <span className="text-xs font-mono text-slate-500">{formatDurationHms(total)}</span>
      </div>
      {loading ? (
        <p className="text-xs text-slate-500">Carregando…</p>
      ) : entries.length === 0 ? (
        <p className="text-xs text-slate-500">Nenhuma sessão ainda.</p>
      ) : (
        <ul className="space-y-1 max-h-48 overflow-y-auto">
          {entries.map((e) => (
            <li
              key={e.id}
              className="flex items-center justify-between gap-2 text-xs border border-slate-100 rounded px-2 py-1.5"
            >
              <div className="min-w-0">
                <span className="font-mono">{formatDurationHms(e.durationSeconds)}</span>
                <span className="text-slate-400 ml-2">{e.status}</span>
                <div className="text-[10px] text-slate-400 truncate">
                  {e.startedAt ? new Date(e.startedAt).toLocaleString('pt-BR') : ''}
                </div>
              </div>
              {canMutateTimeEntry(e) ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                  onClick={() => handleDelete(e.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
