import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pause, Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useSession } from '@/components/auth/SessionManager';
import { useLiveElapsedSeconds, useTimeEntryChangeListener } from '@/hooks/useTaskTimer';
import { useTimeEntryStore } from '@/store/useTimeEntryStore';
import {
  entryNeedsTaskAssignment,
  formatDurationHms,
  isRunningEntry,
} from '@/lib/timeEntriesCore';
import {
  listTimeEntries,
  pauseTimeEntry,
  startFloatingTimeEntry,
  stopTimeEntry,
  assignTimeEntry,
} from '@/lib/timeEntriesApi';
import { Task } from '@/api/entities';
import { createPageUrl } from '@/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function AssignModal({ open, entry, agencyId, onClose, onAssigned }) {
  const [tasks, setTasks] = useState([]);
  const [taskId, setTaskId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !agencyId) return;
    Task.filter({ agencyId }, '-updated_date', 100)
      .then((rows) => setTasks(Array.isArray(rows) ? rows : []))
      .catch(() => setTasks([]));
  }, [open, agencyId]);

  const handleAssign = async () => {
    if (!entry?.id || !taskId) return;
    setSaving(true);
    try {
      const task = tasks.find((t) => t.id === taskId);
      await assignTimeEntry(agencyId, entry.id, {
        taskId,
        serviceId: task?.serviceId || '',
        deliverableId: task?.deliverableId || '',
      });
      toast.success('Tempo vinculado à tarefa');
      onAssigned?.();
      onClose?.();
    } catch (e) {
      toast.error(e?.message || 'Falha ao vincular');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vincular tempo a uma tarefa</DialogTitle>
        </DialogHeader>
        <Select value={taskId} onValueChange={setTaskId}>
          <SelectTrigger>
            <SelectValue placeholder="Escolha a tarefa" />
          </SelectTrigger>
          <SelectContent>
            {tasks.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleAssign} disabled={!taskId || saving}>
            Vincular
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function TopbarTimerWidget() {
  const { agencyId, user } = useSession();
  const userId = user?.id || user?.$id || user?.data?.id;
  const activeEntry = useTimeEntryStore((s) => s.activeEntry);
  const syncActive = useTimeEntryStore((s) => s.syncActive);
  const configured = useTimeEntryStore((s) => s.configured);
  const isStale = useTimeEntryStore((s) => s.isStale);
  const [loading, setLoading] = useState(false);
  const [assignEntry, setAssignEntry] = useState(null);
  const [pendingUnassigned, setPendingUnassigned] = useState([]);

  useEffect(() => {
    if (!agencyId || !userId) return;
    void syncActive(agencyId, { userId });
  }, [agencyId, userId, syncActive]);

  const refreshPending = useCallback(async () => {
    if (!agencyId || !userId) {
      setPendingUnassigned([]);
      return;
    }
    try {
      const rows = await listTimeEntries(agencyId, { userId, limit: 50 });
      setPendingUnassigned(
        (rows || []).filter(
          (e) =>
            e.status === 'completed' &&
            entryNeedsTaskAssignment(e)
        )
      );
    } catch {
      setPendingUnassigned([]);
    }
  }, [agencyId, userId]);

  useEffect(() => {
    void refreshPending();
  }, [refreshPending]);

  useTimeEntryChangeListener(
    useCallback(() => {
      void refreshPending();
    }, [refreshPending])
  );

  const isRunning = Boolean(activeEntry && isRunningEntry(activeEntry));
  const startedAt = activeEntry?.startedAt || activeEntry?.started_at;
  const liveSeconds = useLiveElapsedSeconds(startedAt, isRunning);
  const timeLabel = useMemo(
    () => (isRunning ? formatDurationHms(liveSeconds) : ''),
    [isRunning, liveSeconds]
  );
  const stale = isRunning && isStale();

  const handleStart = async () => {
    if (!agencyId || !userId || loading || isRunning) return;
    setLoading(true);
    try {
      await startFloatingTimeEntry(agencyId, userId);
      toast.success('Timer iniciado (sem tarefa)');
    } catch (e) {
      toast.error(e?.message || 'Falha ao iniciar');
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async () => {
    const id = String(activeEntry?.id || '').trim();
    if (!id || loading) return;
    setLoading(true);
    try {
      await pauseTimeEntry(agencyId, id);
      toast.success('Timer pausado');
    } catch (e) {
      toast.error(e?.message || 'Falha ao pausar');
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    const id = String(activeEntry?.id || '').trim();
    if (!id || loading) return;
    setLoading(true);
    try {
      const stopped = await stopTimeEntry(agencyId, id);
      if (entryNeedsTaskAssignment(stopped)) {
        setAssignEntry(stopped);
        toast.message('Timer parado — vincule a uma tarefa');
      } else {
        toast.success('Timer finalizado');
      }
      void refreshPending();
    } catch (e) {
      toast.error(e?.message || 'Falha ao parar');
    } finally {
      setLoading(false);
    }
  };

  if (!configured) return null;

  return (
    <>
      <div className="flex items-center gap-1.5">
        {isRunning ? (
          <>
            <span
              className={`text-xs font-mono tabular-nums px-2 py-1 rounded ${
                stale ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-800'
              }`}
              title={
                stale
                  ? 'Timer há mais de 8h — revise'
                  : activeEntry?.taskId
                    ? 'Timer na tarefa'
                    : 'Timer flutuante'
              }
            >
              {timeLabel}
              {!activeEntry?.taskId ? ' · livre' : ''}
            </span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              disabled={loading}
              onClick={handlePause}
              title="Pausar"
            >
              <Pause className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              disabled={loading}
              onClick={handleStop}
              title="Parar"
            >
              <Square className="w-4 h-4" />
            </Button>
          </>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1"
            disabled={loading || !agencyId}
            onClick={handleStart}
            title="Iniciar timer flutuante"
          >
            <Play className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-xs">Timer</span>
          </Button>
        )}
        {pendingUnassigned.length > 0 ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 text-xs text-amber-700"
            onClick={() => setAssignEntry(pendingUnassigned[0])}
          >
            {pendingUnassigned.length} sem tarefa
          </Button>
        ) : null}
        <Button asChild size="sm" variant="ghost" className="h-8 text-xs hidden md:inline-flex">
          <Link to={createPageUrl('hours-hub')}>Horas</Link>
        </Button>
      </div>

      <AssignModal
        open={Boolean(assignEntry)}
        entry={assignEntry}
        agencyId={agencyId}
        onClose={() => setAssignEntry(null)}
        onAssigned={refreshPending}
      />
    </>
  );
}
