import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Client } from "@/api/entities";
import { User } from "@/api/entities";
import { useSession } from "@/components/auth/SessionManager";
import { createManualTask } from "@/lib/createManualTask";
import { Loader2, X } from "lucide-react";

/** Valor sentinela no Select — tarefa sem cliente */
const NO_CLIENT_VALUE = "__internal__";
/** Valor sentinela no Select — sem responsável (Radix não aceita value={null}) */
const UNASSIGNED_VALUE = "unassigned";

/** datetime-local → ISO UTC */
function fromDatetimeLocalValue(local) {
  if (!local) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function emptyForm({ clientId, assignedTo }) {
  return {
    title: "",
    description: "",
    priority: "medium",
    clientId: clientId || NO_CLIENT_VALUE,
    assignedTo: assignedTo || UNASSIGNED_VALUE,
    dueDate: "",
  };
}

/**
 * Formulário simples de tarefa (estilo gestor de tarefas):
 * título, responsável, prazo, prioridade, cliente opcional e descrição.
 *
 * Serviço / campanha / ciclo não aparecem no formulário. Se a tela que abriu
 * o modal já estiver nesse contexto (props default*), o vínculo é mantido
 * em segundo plano enquanto o cliente não for trocado.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {(open: boolean) => void} props.onOpenChange
 * @param {(task: object) => void} [props.onSuccess]
 * @param {'task' | 'meeting'} [props.defaultKind] reunião exige data e horário
 * @param {string|null} [props.defaultClientId]
 * @param {string|null} [props.defaultServiceId]
 * @param {string|null} [props.defaultBriefingId]
 * @param {string|null} [props.defaultCycleId]
 */
export default function TaskCreateModal({
  open,
  onOpenChange,
  onSuccess,
  defaultKind = "task",
  defaultClientId = null,
  defaultServiceId = null,
  defaultBriefingId = null,
  defaultCycleId = null,
}) {
  const { user, agencyId } = useSession();
  const currentUserId = user?.id || user?.data?.id || null;
  const isMeeting = defaultKind === "meeting";
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [clients, setClients] = React.useState([]);
  const [users, setUsers] = React.useState([]);
  const [taskData, setTaskData] = React.useState(() =>
    emptyForm({ clientId: defaultClientId, assignedTo: currentUserId })
  );

  const set = (patch) => setTaskData((prev) => ({ ...prev, ...patch }));

  React.useEffect(() => {
    if (!open) return;
    setTaskData(
      emptyForm({
        clientId: defaultClientId ? String(defaultClientId) : null,
        assignedTo: currentUserId,
      })
    );
    setError("");

    let cancelled = false;
    (async () => {
      try {
        const [clientsData, usersData] = await Promise.all([
          Client.filter(agencyId ? { agencyId } : {}, "-updated_date", 100),
          User.filter(
            {
              ...(agencyId ? { agencyId } : {}),
              role: { $in: ["owner", "admin", "team"] },
            },
            "-updated_date",
            50
          ),
        ]);
        if (cancelled) return;
        setClients(clientsData || []);
        setUsers(usersData || []);
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
        if (!cancelled) setError("Erro ao carregar dados do formulário");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, agencyId, defaultClientId, currentUserId]);

  // Garante que o usuário atual aparece na lista mesmo se a consulta não o trouxer
  const assigneeOptions = React.useMemo(() => {
    const list = Array.isArray(users) ? [...users] : [];
    if (currentUserId && !list.some((u) => String(u.id) === String(currentUserId))) {
      list.unshift({
        id: currentUserId,
        full_name: user?.full_name || user?.name || user?.email || "Eu",
      });
    }
    return list;
  }, [users, currentUserId, user]);

  const hasClient = taskData.clientId && taskData.clientId !== NO_CLIENT_VALUE;
  // Mantém vínculos de contexto só se o cliente continuar o mesmo do default
  const keepContext =
    hasClient && defaultClientId && String(taskData.clientId) === String(defaultClientId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const title = taskData.title.trim();
    if (!title) {
      setError("Título é obrigatório");
      return;
    }
    if (isMeeting && !taskData.dueDate) {
      setError("Escolha data e horário da reunião");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const dueDateIso = isMeeting
        ? fromDatetimeLocalValue(taskData.dueDate)
        : taskData.dueDate
          ? new Date(`${taskData.dueDate}T12:00:00`).toISOString()
          : null;

      const createdTask = await createManualTask({
        title,
        agencyId,
        userId: currentUserId,
        clientId: hasClient ? taskData.clientId : null,
        serviceId: keepContext ? defaultServiceId || null : null,
        briefingId: keepContext ? defaultBriefingId || null : null,
        cycleId: keepContext ? defaultCycleId || null : null,
        kanbanColumn: keepContext && defaultBriefingId ? "planejamento" : undefined,
        assignedTo: taskData.assignedTo === UNASSIGNED_VALUE ? null : taskData.assignedTo,
        status: "todo",
        priority: taskData.priority || "medium",
        description: taskData.description || "",
        dueDate: dueDateIso,
        isMeeting,
        activityKind: isMeeting ? "meeting" : null,
        startDate: isMeeting && dueDateIso ? dueDateIso : undefined,
      });

      onSuccess?.(createdTask);
      window.dispatchEvent(new Event("task:refresh"));
      onOpenChange(false);
    } catch (err) {
      console.error("Erro ao criar tarefa:", err);
      setError(err.message || "Erro ao salvar. Verifique os dados e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onOpenChange(false);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-create-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl"
      >
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between border-b border-[#F0EEF7] px-5 py-3">
            <h2 id="task-create-title" className="text-sm font-semibold text-[#1A1210]">
              {isMeeting ? "Agendar reunião" : "Nova tarefa"}
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onOpenChange(false)}
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-4 px-5 py-4">
            {error ? (
              <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <input
              id="title"
              autoFocus
              value={taskData.title}
              onChange={(e) => set({ title: e.target.value })}
              placeholder={isMeeting ? "Nome da reunião" : "Nome da tarefa"}
              aria-label="Título"
              required
              className="w-full border-0 bg-transparent p-0 text-lg font-semibold text-[#1A1210] placeholder:text-[#B5ADA6] focus:outline-none focus:ring-0"
            />

            <div className="grid grid-cols-[7rem_minmax(0,1fr)] items-center gap-x-3 gap-y-3 text-sm">
              <Label className="text-[#6B635C]">Responsável</Label>
              <Select value={taskData.assignedTo} onValueChange={(value) => set({ assignedTo: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED_VALUE}>Ninguém</SelectItem>
                  {assigneeOptions.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {String(u.id) === String(currentUserId)
                        ? `${u.full_name || u.email} (eu)`
                        : u.full_name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Label className="text-[#6B635C]">{isMeeting ? "Data e hora *" : "Prazo"}</Label>
              {isMeeting ? (
                <Input
                  type="datetime-local"
                  value={taskData.dueDate}
                  onChange={(e) => set({ dueDate: e.target.value })}
                  required
                />
              ) : (
                <Input
                  type="date"
                  value={taskData.dueDate}
                  onChange={(e) => set({ dueDate: e.target.value })}
                />
              )}

              <Label className="text-[#6B635C]">Prioridade</Label>
              <Select value={taskData.priority} onValueChange={(value) => set({ priority: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>

              <Label className="text-[#6B635C]">Cliente</Label>
              <Select value={taskData.clientId} onValueChange={(value) => set({ clientId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sem cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CLIENT_VALUE}>Sem cliente</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Textarea
              id="description"
              value={taskData.description}
              onChange={(e) => set({ description: e.target.value })}
              placeholder={isMeeting ? "Pauta, link da call…" : "Descrição (opcional)"}
              aria-label="Descrição"
              rows={3}
            />
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-[#F0EEF7] px-5 py-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" className="w-full sm:w-auto" disabled={loading || !taskData.title.trim()}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando…
                </>
              ) : isMeeting ? (
                "Agendar reunião"
              ) : (
                "Criar tarefa"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
