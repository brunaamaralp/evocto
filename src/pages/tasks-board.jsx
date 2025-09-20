import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Task } from "@/api/entities";
import { Client } from "@/api/entities";
import { CyclePlan } from "@/api/entities";
import { User } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import TaskFilters from "@/components/tasks/TaskFilters";
import TimeTracker from "@/components/tasks/TimeTracker";
import { Input } from "@/components/ui/input";
// import { DndContext } from "@hello-pangea/dnd";
// import { arrayMove, SortableContext, verticalListSortingStrategy } from "@hello-pangea/dnd";
import { GripVertical, Plus, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const STATUSES = ["backlog", "todo", "in_progress", "in_review", "completed"];

function TaskCard({ task, onUpdateTitle }) {
  // const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });
  // const style = { transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined, transition };
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);

  return (
    <div className="bg-white rounded-md border p-3 space-y-2 shadow-sm">
      <div className="flex items-center gap-2">
        <button className="cursor-grab text-slate-400">
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
          <button onClick={() => setEditing(true)} className="text-left font-medium text-slate-800 flex-1">
            {task.title}
          </button>
        )}
      </div>
      <div className="flex items-center justify-between">
        <Badge variant="outline">{task.priority}</Badge>
        <TimeTracker task={task} />
      </div>
      {task.clientId && (
        <div className="text-xs text-slate-500">Cliente: {task.client?.name || task.clientId}</div>
      )}
    </div>
  );
}

export default function TasksBoardPage() {
  const [tasks, setTasks] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [clients, setClients] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [filters, setFilters] = useState({ q: "", assignedTo: "all", clientId: "all", cycleId: "all" });
  const [columns, setColumns] = useState(() => {
    const init = {};
    STATUSES.forEach(s => { init[s] = []; });
    return init;
  });

  // const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const load = useCallback(async () => {
    const [ts, cls, cyc, us] = await Promise.all([
      Task.filter({}, "-updated_date", 200),
      Client.list("-updated_date", 200),
      CyclePlan.list("-updated_date", 200),
      User.filter({})
    ]);
    const clientMap = new Map(cls.map(c => [c.id, c]));
    const enhanced = (ts || []).map(t => ({ ...t, client: clientMap.get(t.clientId) || null }));
    setTasks(enhanced);
    setAssignees(us || []);
    setClients(cls || []);
    setCycles(cyc || []);
  }, []);

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener("task:refresh", handler);
    return () => window.removeEventListener("task:refresh", handler);
  }, [load]);

  // Filter tasks
  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (filters.q && !t.title.toLowerCase().includes(filters.q.toLowerCase())) return false;
      if (filters.assignedTo !== "all" && (t.assignedTo || "") !== filters.assignedTo) return false;
      if (filters.clientId !== "all" && (t.clientId || "") !== filters.clientId) return false;
      if (filters.cycleId !== "all" && (t.cycleId || "") !== filters.cycleId) return false;
      return true;
    });
  }, [tasks, filters]);

  // Build columns
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tarefas • Kanban</h1>
        <div className="text-sm text-slate-600">Horas registradas (filtro atual): <span className="font-semibold">{totalHours.toFixed(2)}h</span></div>
      </div>

      <TaskFilters
        assignees={assignees}
        clients={clients}
        cycles={cycles}
        filters={filters}
        onChange={setFilters}
      />

      {/* <DndContext onDragEnd={onDragEnd}> */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {STATUSES.map((status) => (
            <Card key={status} className="border-0 shadow-sm bg-slate-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm uppercase text-slate-600">{status.replace("_", " ")}</CardTitle>
              </CardHeader>
              <CardContent>
                {/* <SortableContext items={(columns[status] || []).map(t => t.id)} strategy={verticalListSortingStrategy}> */}
                  <div className="space-y-3">
                    {(columns[status] || []).map((t) => (
                      <TaskCard
                        key={t.id}
                        task={t}
                        onUpdateTitle={(title) => updateTitle(t.id, title)}
                      />
                    ))}
                  </div>
                {/* </SortableContext> */}
              </CardContent>
            </Card>
          ))}
        </div>
      {/* </DndContext> */}
    </div>
  );
}