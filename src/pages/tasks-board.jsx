import { useEffect, useMemo, useState, useCallback } from "react";
import { Task } from "@/api/entities";
import { Client } from "@/api/entities";
import { User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import TaskFilters from "@/components/tasks/TaskFilters";
import TaskCreateModal from "@/components/tasks/TaskCreateModal";
import TimeTracker from "@/components/tasks/TimeTracker";
import { Input } from "@/components/ui/input";
import { GripVertical, Plus, Save } from "lucide-react";
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
      <div className="flex items-start gap-2">
        <button type="button" className="cursor-grab text-[#7A7595] shrink-0 mt-0.5" aria-label="Arrastar">
          <GripVertical className="w-4 h-4" />
        </button>
        {editing ? (
          <div className="flex flex-col gap-2 w-full min-w-0">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-8" />
            <Button
              size="sm"
              className="gap-1 w-full"
              onClick={() => {
                onUpdateTitle(title);
                setEditing(false);
              }}
            >
              <Save className="w-4 h-4" /> Salvar
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-left font-medium text-[#18162A] flex-1 min-w-0 break-words"
          >
            {task.title}
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge variant="outline" className="bg-white/60 shrink-0">{task.priority}</Badge>
        <div className="min-w-0 overflow-hidden">
          <TimeTracker task={task} />
        </div>
      </div>
      {task.clientId && (
        <div className="text-xs text-[#7A7595] truncate">Cliente: {task.client?.name || task.clientId}</div>
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
  const [createOpen, setCreateOpen] = useState(false);
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

  const _onDragEnd = async (evt) => {
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#18162A]">Tarefas · Kanban</h1>
          <p className="text-sm text-[#7A7595] mt-1">
            Horas registradas (filtro atual): <span className="font-semibold text-[#18162A]">{totalHours.toFixed(2)}h</span>
          </p>
        </div>
        <Button
          className="gap-2 w-full sm:w-auto shrink-0"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="w-4 h-4" />
          Nova Tarefa
        </Button>
      </div>

      <TaskFilters
        filters={filters}
        onFiltersChange={setFilters}
        tasks={tasks}
        users={assignees}
        currentUserId={currentUserId}
      />

      <div className="overflow-x-auto -mx-1 px-1 pb-2">
        <div className="flex gap-4 min-w-max lg:min-w-0 lg:grid lg:grid-cols-5 lg:w-full">
        {STATUSES.map((status) => {
          const stagePastel = getStagePastel(status);
          return (
            <div key={status} className={`w-72 shrink-0 lg:w-auto rounded-2xl p-4 ${stagePastel.column}`}>
              <div className="pb-2 mb-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-[#18162A] truncate">{STATUS_LABELS[status]}</span>
                  <Badge variant="secondary" className="text-xs rounded-full bg-white/70 shrink-0">
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

      <TaskCreateModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => {
          setCreateOpen(false);
          load();
        }}
      />
    </div>
  );
}
