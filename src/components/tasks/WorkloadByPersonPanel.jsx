import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { getTaskAssigneeId } from '@/lib/taskFilterPresets';

const OPEN_STATUSES = new Set([
  'backlog',
  'todo',
  'in_progress',
  'in_review',
  'blocked',
]);

function isOverdue(task) {
  if (!task?.dueDate) return false;
  if (task.status === 'completed' || task.status === 'cancelled') return false;
  return new Date(task.dueDate) < new Date();
}

/**
 * Agrega carga de trabalho por assigneeId.
 * @returns {{ id: string, label: string, open: number, inProgress: number, overdue: number, total: number }[]}
 */
export function computeWorkloadByAssignee(tasks = [], users = []) {
  const nameById = new Map();
  for (const u of users) {
    if (u?.id) {
      nameById.set(String(u.id), u.full_name || u.name || u.email || String(u.id));
    }
  }

  const buckets = new Map();

  const ensure = (id, label) => {
    if (!buckets.has(id)) {
      buckets.set(id, {
        id,
        label,
        open: 0,
        inProgress: 0,
        overdue: 0,
        total: 0,
      });
    }
    return buckets.get(id);
  };

  for (const task of tasks) {
    const rawId = getTaskAssigneeId(task);
    const id = rawId ? String(rawId) : 'unassigned';
    const label = rawId
      ? nameById.get(String(rawId)) || task.assigneeName || task.assignedToName || String(rawId)
      : 'Sem responsável';
    const row = ensure(id, label);
    row.total += 1;
    if (OPEN_STATUSES.has(task.status)) row.open += 1;
    if (task.status === 'in_progress') row.inProgress += 1;
    if (isOverdue(task)) row.overdue += 1;
  }

  return [...buckets.values()].sort((a, b) => b.open - a.open || a.label.localeCompare(b.label));
}

export default function WorkloadByPersonPanel({
  tasks = [],
  users = [],
  onSelectAssignee,
  className = '',
}) {
  const rows = useMemo(
    () => computeWorkloadByAssignee(tasks, users),
    [tasks, users]
  );

  if (rows.length === 0) {
    return null;
  }

  return (
    <Card className={`border-slate-200 shadow-none ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="w-4 h-4" />
          Carga por pessoa
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map((row) => (
          <button
            key={row.id}
            type="button"
            className="w-full flex items-center justify-between gap-3 rounded-md border border-slate-100 px-3 py-2 text-left hover:border-slate-300 hover:bg-slate-50"
            onClick={() => onSelectAssignee?.(row.id === 'unassigned' ? 'unassigned' : row.id)}
          >
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-900 truncate">{row.label}</div>
              <div className="text-xs text-slate-500">
                {row.inProgress} em progresso · {row.total} no total
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {row.overdue > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {row.overdue} atrasada{row.overdue > 1 ? 's' : ''}
                </Badge>
              )}
              <Badge variant="secondary" className="text-xs">
                {row.open} aberta{row.open !== 1 ? 's' : ''}
              </Badge>
            </div>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
