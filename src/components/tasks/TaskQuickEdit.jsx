import React, { useEffect, useState, useCallback } from "react";
import { useSession } from "@/components/auth/SessionManager";
import { Task } from "@/api/entities";
import { User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar, Save } from "lucide-react";
import { toast } from "sonner";

const STATUS = [
  { value: "backlog", label: "Backlog" },
  { value: "todo", label: "A Fazer" },
  { value: "in_progress", label: "Em Progresso" },
  { value: "in_review", label: "Em Revisão" },
  { value: "completed", label: "Concluído" },
  { value: "blocked", label: "Bloqueado" },
];

const PRIORITY = [
  { value: "low", label: "Baixa" },
  { value: "medium", label: "Média" },
  { value: "high", label: "Alta" },
  { value: "urgent", label: "Urgente" },
];

export default function TaskQuickEdit({ task, open, onOpenChange, onSaved }) {
  const { user } = useSession();
  const [form, setForm] = useState(task || {});
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(task || {});
  }, [task]);

  const loadUsers = useCallback(async () => {
    if (!user?.agencyId) return;
    const list = await User.filter({ agencyId: user.agencyId });
    setUsers(list);
  }, [user?.agencyId]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleChange = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    try {
      setSaving(true);
      const payload = {
        title: form.title,
        status: form.status,
        priority: form.priority,
        assignedTo: form.assignedTo || "",
        dueDate: form.dueDate || "",
      };
      const updated = await Task.update(task.id, payload);
      toast.success("Tarefa atualizada");
      onSaved && onSaved(updated);
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edição Rápida</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="Título"
            value={form.title || ""}
            onChange={(e) => handleChange("title", e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              value={form.status || "todo"}
              onValueChange={(v) => handleChange("status", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={form.priority || "medium"}
              onValueChange={(v) => handleChange("priority", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Select
            value={form.assignedTo || ""}
            onValueChange={(v) => handleChange("assignedTo", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Não atribuído</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div>
            <div className="text-sm text-slate-700 mb-1">Data limite</div>
            <Input
              type="datetime-local"
              value={form.dueDate ? form.dueDate.slice(0, 16) : ""}
              onChange={(e) =>
                handleChange(
                  "dueDate",
                  e.target.value ? new Date(e.target.value).toISOString() : ""
                )
              }
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}