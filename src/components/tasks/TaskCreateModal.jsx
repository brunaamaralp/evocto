
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Client } from "@/api/entities";
import { Service } from "@/api/entities";
import { User } from "@/api/entities";
import { useSession } from "@/components/auth/SessionManager";
import { createManualTask } from "@/lib/createManualTask";
import { Loader2, X, Calendar, User as UserIcon, Flag } from "lucide-react";

/** Valor sentinela no Select — tarefa/reunião interna sem cliente */
const INTERNAL_CLIENT_VALUE = "__internal__";
/** Valor sentinela no Select — sem responsável (Radix não aceita value={null}) */
const UNASSIGNED_VALUE = "unassigned";

const MEETING_TYPES = new Set(["reuniao", "reuniao_alinhamento"]);

function isMeetingType(type) {
  return MEETING_TYPES.has(type);
}

/** datetime-local → ISO UTC */
function fromDatetimeLocalValue(local) {
  if (!local) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {(open: boolean) => void} props.onOpenChange
 * @param {(task: object) => void} [props.onSuccess]
 * @param {'task' | 'meeting'} [props.defaultKind]
 */
export default function TaskCreateModal({
  open,
  onOpenChange,
  onSuccess,
  defaultKind = "task",
}) {
  const { user, agencyId } = useSession();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [kind, setKind] = React.useState(defaultKind === "meeting" ? "meeting" : "task");

  // Form data
  const [taskData, setTaskData] = React.useState({
    title: "",
    description: "",
    status: "todo",
    priority: "medium",
    type: "analise_documentos",
    clientId: INTERNAL_CLIENT_VALUE,
    serviceId: "",
    assignedTo: UNASSIGNED_VALUE,
    dueDate: "",
    estimatedHours: 4,
  });

  // Dropdown data
  const [clients, setClients] = React.useState([]);
  const [services, setServices] = React.useState([]);
  const [users, setUsers] = React.useState([]);

  const loadFormData = React.useCallback(async () => {
    try {
      const clientFilters = agencyId ? { agencyId } : {};
      const [clientsData, usersData] = await Promise.all([
        Client.filter(clientFilters, "-updated_date", 50),
        User.filter(
          {
            ...(agencyId ? { agencyId } : {}),
            role: { $in: ["owner", "admin", "team"] },
          },
          "-updated_date",
          50
        ),
      ]);

      setClients(clientsData || []);
      setUsers(usersData || []);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
      setError("Erro ao carregar dados do formulário");
    }
  }, [agencyId]);

  const resetForm = React.useCallback((nextKind = defaultKind) => {
    const meeting = nextKind === "meeting";
    setKind(meeting ? "meeting" : "task");
    setTaskData({
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      type: meeting ? "reuniao" : "analise_documentos",
      clientId: INTERNAL_CLIENT_VALUE,
      serviceId: "",
      assignedTo: UNASSIGNED_VALUE,
      dueDate: "",
      estimatedHours: meeting ? 1 : 4,
    });
    setError("");
    setServices([]);
  }, [defaultKind]);

  React.useEffect(() => {
    if (open) {
      loadFormData();
      resetForm(defaultKind);
    }
  }, [open, loadFormData, resetForm, defaultKind]);

  const loadServices = async (clientId) => {
    if (!clientId || clientId === INTERNAL_CLIENT_VALUE) {
      setServices([]);
      return;
    }

    try {
      const servicesData = await Service.filter({
        clientId,
        is_template: false,
        is_active: true,
      });
      setServices(servicesData || []);
    } catch (err) {
      console.error("Erro ao carregar serviços:", err);
    }
  };

  const handleClientChange = (clientId) => {
    setTaskData((prev) => ({
      ...prev,
      clientId,
      serviceId: "",
    }));
    loadServices(clientId);
  };

  const handleKindChange = (nextKind) => {
    setKind(nextKind);
    setTaskData((prev) => ({
      ...prev,
      type: nextKind === "meeting" ? "reuniao" : "analise_documentos",
      estimatedHours: nextKind === "meeting" ? 1 : prev.estimatedHours || 4,
      // Reunião precisa de horário: se só tinha data, limpa para o usuário preencher datetime
      dueDate:
        nextKind === "meeting" && prev.dueDate && !prev.dueDate.includes("T")
          ? `${prev.dueDate}T09:00`
          : prev.dueDate,
    }));
  };

  const isInternalTask = !taskData.clientId || taskData.clientId === INTERNAL_CLIENT_VALUE;
  const isMeeting = kind === "meeting" || isMeetingType(taskData.type);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!taskData.title.trim()) {
      setError(isMeeting ? "Título da reunião é obrigatório" : "Título é obrigatório");
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

      const resolvedType = isMeeting
        ? isMeetingType(taskData.type)
          ? taskData.type
          : "reuniao"
        : taskData.type || "analise_documentos";

      const createdTask = await createManualTask({
        title: taskData.title.trim(),
        agencyId,
        userId: user?.id || null,
        clientId: isInternalTask ? null : taskData.clientId,
        serviceId: isInternalTask ? null : taskData.serviceId || null,
        assignedTo:
          !taskData.assignedTo || taskData.assignedTo === UNASSIGNED_VALUE
            ? null
            : taskData.assignedTo,
        status: taskData.status || "todo",
        priority: taskData.priority || "medium",
        type: resolvedType,
        description: taskData.description || "",
        dueDate: dueDateIso,
        estimatedHours: Number(taskData.estimatedHours) || (isMeeting ? 1 : 4),
        isMeeting,
        activityKind: isMeeting ? "meeting" : null,
        startDate: isMeeting && dueDateIso ? dueDateIso : undefined,
      });

      if (onSuccess) {
        onSuccess(createdTask);
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("task:refresh"));
      }

      onOpenChange(false);
    } catch (err) {
      console.error("Erro ao criar tarefa:", err);
      setError(
        err.message ||
          (isMeeting
            ? "Erro ao agendar reunião. Verifique os dados e tente novamente."
            : "Erro ao criar tarefa. Verifique os dados e tente novamente.")
      );
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{isMeeting ? "Agendar reunião" : "Nova tarefa"}</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded border border-red-200">
                {error}
              </div>
            )}

            {/* Tarefa vs Reunião */}
            <div
              className="flex rounded-xl border border-[#E8E5F5] bg-[#F8F7FB] p-0.5"
              role="group"
              aria-label="Tipo de item"
            >
              <button
                type="button"
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  !isMeeting
                    ? "bg-white text-[#18162A] shadow-sm"
                    : "text-[#7A7595] hover:text-[#18162A]"
                }`}
                onClick={() => handleKindChange("task")}
              >
                Tarefa
              </button>
              <button
                type="button"
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isMeeting
                    ? "bg-white text-[#18162A] shadow-sm"
                    : "text-[#7A7595] hover:text-[#18162A]"
                }`}
                onClick={() => handleKindChange("meeting")}
              >
                Reunião
              </button>
            </div>

            <div>
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={taskData.title}
                onChange={(e) => setTaskData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder={
                  isMeeting ? "Ex.: Alinhamento semanal da equipe" : "Digite o título da tarefa"
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="description">{isMeeting ? "Pauta / notas" : "Descrição"}</Label>
              <Textarea
                id="description"
                value={taskData.description}
                onChange={(e) =>
                  setTaskData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder={
                  isMeeting ? "Assuntos, link da call, participantes..." : "Descreva a tarefa..."
                }
                rows={3}
              />
            </div>

            <div>
              <Label>Cliente</Label>
              <Select
                value={taskData.clientId || INTERNAL_CLIENT_VALUE}
                onValueChange={handleClientChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Interno ou cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={INTERNAL_CLIENT_VALUE}>Interno (sem cliente)</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Use &quot;Interno&quot; para reuniões e tarefas da equipe, sem vincular a um cliente.
              </p>
            </div>

            {!isMeeting && (
              <div>
                <Label>Serviço (opcional)</Label>
                <Select
                  value={taskData.serviceId || undefined}
                  onValueChange={(value) =>
                    setTaskData((prev) => ({
                      ...prev,
                      serviceId: value === "__none__" ? "" : value,
                    }))
                  }
                  disabled={isInternalTask}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        isInternalTask ? "Disponível com cliente" : "Selecione o serviço (opcional)"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum serviço</SelectItem>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {isMeeting ? (
                <div>
                  <Label>Tipo de reunião</Label>
                  <Select
                    value={isMeetingType(taskData.type) ? taskData.type : "reuniao"}
                    onValueChange={(value) => setTaskData((prev) => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reuniao">Reunião</SelectItem>
                      <SelectItem value="reuniao_alinhamento">Reunião de alinhamento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div>
                  <Label>Tipo</Label>
                  <Select
                    value={taskData.type}
                    onValueChange={(value) => {
                      setTaskData((prev) => ({ ...prev, type: value }));
                      if (isMeetingType(value)) setKind("meeting");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="analise_documentos">Análise Documentos</SelectItem>
                      <SelectItem value="coleta_dados">Coleta Dados</SelectItem>
                      <SelectItem value="analise_dados">Análise Dados</SelectItem>
                      <SelectItem value="analise_financeira">Análise Financeira</SelectItem>
                      <SelectItem value="relatorio_financeiro">Relatório Financeiro</SelectItem>
                      <SelectItem value="planejamento_estrategico">Planejamento Estratégico</SelectItem>
                      <SelectItem value="implementacao">Implementação</SelectItem>
                      <SelectItem value="treinamento">Treinamento</SelectItem>
                      <SelectItem value="administrativo">Administrativo</SelectItem>
                      <SelectItem value="auditoria">Auditoria</SelectItem>
                      <SelectItem value="consultoria">Consultoria</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label className="flex items-center gap-1">
                  <Flag className="w-4 h-4" />
                  Prioridade
                </Label>
                <Select
                  value={taskData.priority}
                  onValueChange={(value) => setTaskData((prev) => ({ ...prev, priority: value }))}
                >
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
              </div>

              <div>
                <Label className="flex items-center gap-1">
                  <UserIcon className="w-4 h-4" />
                  {isMeeting ? "Organizador / responsável" : "Responsável"}
                </Label>
                <Select
                  value={taskData.assignedTo || UNASSIGNED_VALUE}
                  onValueChange={(value) =>
                    setTaskData((prev) => ({ ...prev, assignedTo: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED_VALUE}>Não atribuído</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name || u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {isMeeting ? "Data e horário *" : "Prazo"}
                </Label>
                {isMeeting ? (
                  <Input
                    type="datetime-local"
                    value={
                      taskData.dueDate?.includes("T")
                        ? taskData.dueDate
                        : taskData.dueDate
                          ? `${taskData.dueDate}T09:00`
                          : ""
                    }
                    onChange={(e) =>
                      setTaskData((prev) => ({ ...prev, dueDate: e.target.value }))
                    }
                    required
                  />
                ) : (
                  <Input
                    type="date"
                    value={
                      taskData.dueDate?.includes("T")
                        ? taskData.dueDate.slice(0, 10)
                        : taskData.dueDate || ""
                    }
                    onChange={(e) =>
                      setTaskData((prev) => ({ ...prev, dueDate: e.target.value }))
                    }
                  />
                )}
              </div>

              <div>
                <Label>{isMeeting ? "Duração (horas)" : "Horas estimadas"}</Label>
                <Input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={taskData.estimatedHours}
                  onChange={(e) =>
                    setTaskData((prev) => ({
                      ...prev,
                      estimatedHours: Number(e.target.value) || (isMeeting ? 1 : 4),
                    }))
                  }
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={loading || !taskData.title.trim()}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isMeeting ? "Agendando..." : "Criando..."}
                  </>
                ) : isMeeting ? (
                  "Agendar reunião"
                ) : (
                  "Criar tarefa"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
