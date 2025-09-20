import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Timer, Square } from "lucide-react";
import { Task } from "@/api/entities";

export default function TimeTracker({ task }) {
  const runningEntry = useMemo(() => (task.timeEntries || []).find(te => te.startTime && !te.endTime), [task]);
  const [busy, setBusy] = useState(false);

  const start = async () => {
    setBusy(true);
    const newEntry = {
      userId: task.assignedTo || undefined,
      startTime: new Date().toISOString(),
      endTime: null,
      duration: 0,
      description: "Timer iniciado"
    };
    await Task.update(task.id, { timeEntries: [...(task.timeEntries || []), newEntry] });
    setBusy(false);
    window.dispatchEvent(new Event("task:refresh"));
  };

  const stop = async () => {
    if (!runningEntry) return;
    setBusy(true);
    const end = new Date();
    const start = new Date(runningEntry.startTime);
    const durationHours = Math.max(0, (end - start) / (1000 * 60 * 60));
    const updated = (task.timeEntries || []).map((te) => {
      if (te.startTime === runningEntry.startTime && !te.endTime) {
        return { ...te, endTime: end.toISOString(), duration: durationHours };
      }
      return te;
    });
    const actual = (task.actualHours || 0) + durationHours;
    await Task.update(task.id, { timeEntries: updated, actualHours: actual });
    setBusy(false);
    window.dispatchEvent(new Event("task:refresh"));
  };

  if (runningEntry) {
    return (
      <Button size="sm" variant="outline" onClick={stop} disabled={busy} className="gap-1">
        <Square className="w-4 h-4" /> Stop
      </Button>
    );
    }
  return (
    <Button size="sm" onClick={start} disabled={busy} className="gap-1">
      <Timer className="w-4 h-4" /> Start
    </Button>
  );
}