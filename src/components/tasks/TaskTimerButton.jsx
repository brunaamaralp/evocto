import React, { useState } from 'react';
import { Pause, Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useSession } from '@/components/auth/SessionManager';
import { useTaskTimer } from '@/hooks/useTaskTimer';
import {
  buildTimerStartedToast,
  pauseTimeEntry,
  startTimeEntry,
  stopTimeEntry,
} from '@/lib/timeEntriesApi';

export default function TaskTimerButton({
  task,
  serviceId,
  deliverableId,
  disabled = false,
  showLabel = true,
  onTimeLoggedChange,
}) {
  const { agencyId, user } = useSession();
  const userId = user?.id || user?.$id || user?.data?.id;
  const taskId = String(task?.id || '').trim();
  const baseLogged = Math.max(
    0,
    Math.trunc(
      Number(task?.time_logged_seconds) ||
        Math.round((Number(task?.actualHours) || 0) * 3600) ||
        0
    )
  );

  const { configured, isRunningHere, displayLabel, activeEntry } = useTaskTimer({
    agencyId,
    userId,
    task,
    baseLoggedSeconds: baseLogged,
  });

  const [loading, setLoading] = useState(false);
  const blocked = disabled || !configured || !taskId || !agencyId || !userId;

  const handlePause = async () => {
    const id = String(activeEntry?.id || '').trim();
    if (!id || loading || blocked) return;
    setLoading(true);
    try {
      const paused = await pauseTimeEntry(agencyId, id);
      const added = Math.max(0, Math.trunc(Number(paused?.durationSeconds) || 0));
      onTimeLoggedChange?.(taskId, baseLogged + added);
      toast.success('Timer pausado');
    } catch (e) {
      toast.error(e?.message || 'Falha ao pausar');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    if (blocked || loading) return;
    setLoading(true);
    try {
      const { paused_entry: pausedEntry } = await startTimeEntry(agencyId, {
        userId,
        taskId,
        serviceId: serviceId || task?.serviceId || '',
        deliverableId: deliverableId || task?.deliverableId || '',
      });
      const t = buildTimerStartedToast(pausedEntry);
      toast.success(t.message);
    } catch (e) {
      toast.error(e?.message || 'Falha ao iniciar timer');
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
      const total = baseLogged + Math.max(0, Math.trunc(Number(stopped?.durationSeconds) || 0));
      onTimeLoggedChange?.(taskId, total);
      toast.success('Timer finalizado');
      window.dispatchEvent(new Event('task:refresh'));
    } catch (e) {
      toast.error(e?.message || 'Falha ao parar timer');
    } finally {
      setLoading(false);
    }
  };

  if (!configured) {
    return (
      <span className="text-[10px] text-amber-700" title="Crie a tabela time_entries no Appwrite">
        Timer n/d
      </span>
    );
  }

  if (isRunningHere) {
    return (
      <div className="flex items-center gap-1">
        {showLabel ? (
          <span className="text-xs font-mono text-emerald-700 tabular-nums">{displayLabel}</span>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 px-2"
          disabled={loading || disabled}
          onClick={handlePause}
          title="Pausar"
        >
          <Pause className="w-3.5 h-3.5" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 px-2"
          disabled={loading || disabled}
          onClick={handleStop}
          title="Parar"
        >
          <Square className="w-3.5 h-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {showLabel && baseLogged > 0 ? (
        <span className="text-xs font-mono text-slate-500 tabular-nums">{displayLabel}</span>
      ) : null}
      <Button
        type="button"
        size="sm"
        className="h-7 px-2 gap-1"
        disabled={blocked || loading}
        onClick={handleStart}
        title="Iniciar timer"
      >
        <Play className="w-3.5 h-3.5" />
        {showLabel ? <span className="text-xs">Timer</span> : null}
      </Button>
    </div>
  );
}
