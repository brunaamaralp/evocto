import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Task } from "@/api/entities";
import { Client } from "@/api/entities";
import { User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import TaskFilters from "@/components/tasks/TaskFilters";
import TimeTracker from "@/components/tasks/TimeTracker";
import { Input } from "@/components/ui/input";
import { GripVertical, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/components/auth/SessionManager";
import {
  EMPTY_TASK_FILTERS,
  applyTaskFilters,
} from "@/lib/taskFilterPresets";
import { getStagePastel } from "@/lib/modulePastels";

const STATUSES = ["backlog", "todo", "in_progress", "in_review", "completed"];

const STATUS_LABELS = {
  backlog: "Backlog",
  todo: "A Fazer",
  in_progress: "Em Andamento",
  in_review: "Em Revisão",
  completed: "Concluído",
};

function TaskCard({ task, onUpdateTitle }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);

  return (
    <div className="bg-white rounded-xl border border-white/60 p-3 space-y-2 shadow-sm">
      <div className="flex items-center gap-2">
        <button className="cursor-grab text-[#7A7595]">
          <GripVertical className="w-4 h-4" />
        </button>
        {editing ? (
          <div className="flex items-center gap-2 w-full">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-8" />
            <Button size="sm" onClick={() => { onUpdateTitle(title); setEditing(false); }} className="gap-1">
              <Save className="w-4 h-4" /> Salvar
            </Button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} className="text-left font-medium text-[#18162A] flex-1">
            {task.title}
          </button>
        )}
      </div>
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="bg-white/60">{task.priority}</Badge>
        <TimeTracker task={task} />
      </div>
      {task.clientId && (
        <div className="text-xs text-[#7A7595]">Cliente: {task.client?.name || task.clientId}</div>
      )}
    </div>
  );
}

export default function TasksBoardPage() {
  const { user, agencyId } = useSession();
  const currentUserId = user?.id || user?.data?.id;
  const [tasks, setTasks] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [filters, setFilters] = useState({ ...EMPTY_TASK_FILTERS });
  const [columns, setColumns] = useState(() => {
    const init = {};
    STATUSES.forEach(s => { init[s] = []; });
    return init;
  });

  const load = useCallback(async () => {
    const [ts, cls, us] = await Promise.all([
      Task.filter(agencyId ? { agencyId } : {}, "-updated_date", 200),
      Client.list("-updated_date", 200),
      User.filter(agencyId ? { agencyId } : {})
    ]);
    const clientMap = new Map((cls || []).map(c => [c.id, c]));
    const enhanced = (ts || []).map(t => ({ ...t, client: clientMap.get(t.clientId) || null }));
    setTasks(enhanced);
    setAssignees(us || []);
  }, [agencyId]);

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener("task:refresh", handler);
    return () => window.removeEventListener("task:refresh", handler);
  }, [load]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => applyTaskFilters(t, filters, { userId: currentUserId }));
  }, [tasks, filters, currentUserId]);

  useEffect(() => {
    const next = {};
    STATUSES.forEach(s => { next[s] = []; });
    filtered.forEach(t => {
      const col = t.status && STATUSES.includes(t.status) ? t.status : "todo";
      next[col].push(t);
    });
    setColumns(next);
  }, [filtered]);

  const onDragEnd = async (evt) => {
    const { active, over } = evt;
    if (!over) return;
    const fromCol = Object.keys(columns).find(c => columns[c].some(t => t.id === active.id));
    const toCol = over.id;
    if (!fromCol || !toCol) return;
    if (fromCol === toCol) return;

    const task = tasks.find(t => t.id === active.id);
    await Task.update(task.id, { status: toCol, kanbanColumn: toCol });
    await load();
  };

  const updateTitle = async (taskId, title) => {
    await Task.update(taskId, { title });
    await load();
  };

  const totalHours = useMemo(() => {
    return filtered.reduce((sum, t) => sum + (t.actualHours || 0), 0);
  }, [filtered]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#18162A]">Tarefas · Kanban</h1>
          <p className="text-sm text-[#7A7595] mt-1">
            Horas registradas (filtro atual): <span className="font-semibold text-[#18162A]">{totalHours.toFixed(2)}h</span>
          </p>
        </div>
      </div>

      <TaskFilters
        filters={filters}
        onFiltersChange={setFilters}
        tasks={tasks}
        users={assignees}
        currentUserId={currentUserId}
      />

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {STATUSES.map((status) => {
          const stagePastel = getStagePastel(status);
          return (
            <div key={status} className={`rounded-2xl p-4 ${stagePastel.column}`}>
              <div className="pb-2 mb-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#18162A]">{STATUS_LABELS[status]}</span>
                  <Badge variant="secondary" className="text-xs rounded-full bg-white/70">
                    {(columns[status] || []).length}
                  </Badge>
                </div>
              </div>
              <div className="space-y-3">
                {(columns[status] || []).map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onUpdateTitle={(title) => updateTitle(t.id, title)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
