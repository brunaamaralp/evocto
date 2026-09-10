import React from "react";
import { Button } from "@/components/ui/button";
import { Service } from "@/api/entities";
import { Loader2, Settings2, PlayCircle, PauseCircle, Trash2, CheckCircle2, ListTodo } from "lucide-react";
import { useTaskGeneration } from "@/hooks/useTaskGeneration";
import { useErrorHandling } from "@/hooks/useErrorHandling";
import { TaskPreview } from "@/components/tasks/TaskPreview";
import { toast } from "sonner";

const RUNNING_STATUSES = new Set(["active", "in_execution"]);
const NEEDS_ACTIVATION_STATUSES = new Set([
  "draft",
  "archived",
  "on_hold",
  "setup",
  "briefing_pending",
  "cancelled",
]);

function needsActivation(service) {
  if (!service) return false;
  if (service.is_active === false) return true;
  const status = service.service_status;
  if (!status) return service.is_active !== true;
  if (NEEDS_ACTIVATION_STATUSES.has(status)) return true;
  return !RUNNING_STATUSES.has(status) && service.is_active !== true;
}

function isRunning(service) {
  if (!service || service.is_active === false) return false;
  const status = service.service_status;
  return !status || RUNNING_STATUSES.has(status);
}

export default function ServiceActionsFab() {
  const [busy, setBusy] = React.useState(false);
  const [service, setService] = React.useState(null);
  const [error, setError] = React.useState("");
  const [showPreview, setShowPreview] = React.useState(false);
  const [validationResult, setValidationResult] = React.useState(null);

  const {
    activateServiceAndGenerateTasks,
    generateTasksWithFeedback,
    validateServiceActivation,
    isGenerating,
  } = useTaskGeneration();

  const { handleError } = useErrorHandling();

  const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const serviceId = urlParams ? (urlParams.get("serviceId") || urlParams.get("id")) : null;

  React.useEffect(() => {
    let mounted = true;
    async function fetchService() {
      if (!serviceId) return;
      try {
        const s = await Service.get(serviceId);
        if (mounted) setService(s || null);
      } catch (_e) {
        if (mounted) setError("Não foi possível carregar os dados do serviço.");
      }
    }
    fetchService();
    return () => { mounted = false; };
  }, [serviceId]);

  if (!serviceId) return null;

  const showActivate = needsActivation(service);
  const showGenerateOnly = isRunning(service);

  const reload = () => {
    try {
      window.location.reload();
    } catch (_err) {
      // ignore reload failures (e.g. restricted environments)
    }
  };

  const activateAndGenerate = async () => {
    if (!serviceId) return;

    try {
      setBusy(true);
      setError("");

      const validation = await validateServiceActivation(serviceId);
      setValidationResult(validation);

      if (!validation.canActivate) {
        toast.error("Não é possível ativar o serviço:", {
          description: validation.errors.join("; "),
        });
        return;
      }

      if (validation.warnings.length > 0) {
        setShowPreview(true);
        return;
      }

      await performActivation();
    } catch (e) {
      handleError(e, {
        action: "validate_service_activation",
        serviceId,
      });
      setError(e?.message || "Falha ao validar ativação do serviço.");
    } finally {
      setBusy(false);
    }
  };

  const performActivation = async () => {
    try {
      const result = await activateServiceAndGenerateTasks(serviceId, {
        autoAssign: true,
        skipExisting: true,
      });

      if (result.success) {
        toast.success(`Serviço ativado e ${result.tasksCreated} tarefas geradas!`);
        if (result.warnings && result.warnings.length > 0) {
          toast.warning("Atenção:", {
            description: result.warnings.join("; "),
          });
        }
        reload();
      } else {
        throw new Error(result.errors.join("; "));
      }
    } catch (e) {
      handleError(e, {
        action: "activate_and_generate_tasks",
        serviceId,
      });
      setError(e?.message || "Falha ao ativar e gerar tarefas.");
    }
  };

  const generateMissingTasks = async () => {
    if (!serviceId) return;
    try {
      setBusy(true);
      setError("");
      const result = await generateTasksWithFeedback({
        serviceId,
        autoAssign: true,
        skipExisting: true,
        startDate: service?.start_date,
      });
      if (result.success) {
        reload();
      } else if (result.errors?.length) {
        setError(result.errors.join("; "));
      }
    } catch (e) {
      handleError(e, {
        action: "generate_tasks_recovery",
        serviceId,
      });
      setError(e?.message || "Falha ao gerar tarefas.");
    } finally {
      setBusy(false);
    }
  };

  const handlePreviewConfirm = async () => {
    setShowPreview(false);
    await performActivation();
  };

  const deactivateService = async () => {
    if (!serviceId) return;
    if (!confirm("Tem certeza que deseja inativar este serviço?")) return;
    setBusy(true);
    setError("");
    try {
      const updated = await Service.update(serviceId, {
        is_active: false,
        service_status: "archived",
      });
      setService(updated);
      toast.success("Serviço inativado com sucesso.");
      reload();
    } catch (e) {
      setError(e?.message || "Falha ao inativar serviço.");
    } finally {
      setBusy(false);
    }
  };

  const deleteService = async () => {
    if (!serviceId) return;
    if (!confirm("Esta ação é permanente. Deseja realmente excluir o serviço e seus vínculos?")) return;
    setBusy(true);
    setError("");
    try {
      await Service.delete(serviceId);
      toast.success("Serviço excluído com sucesso.");
      window.location.href = "/services";
    } catch (e) {
      setError(e?.message || "Falha ao excluir serviço.");
    } finally {
      setBusy(false);
    }
  };

  const statusLabel =
    service?.service_status || (service?.is_active ? "active" : "archived");

  return (
    <div className="fixed bottom-24 right-6 z-[60]">
      <div className="flex flex-col items-end gap-2">
        {error && (
          <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded shadow">{error}</div>
        )}
        <div className="bg-white/90 backdrop-blur-md border rounded-lg shadow-lg p-3 w-64">
          <div className="flex items-center gap-2 mb-2">
            <Settings2 className="w-4 h-4 text-gray-600" />
            <div className="text-sm font-medium">Ações do Serviço</div>
          </div>

          <div className="space-y-2">
            {showActivate && (
              <Button
                className="w-full justify-start gap-2"
                onClick={activateAndGenerate}
                disabled={busy || !service}
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                Ativar e gerar tarefas
              </Button>
            )}

            {showGenerateOnly && (
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={generateMissingTasks}
                disabled={busy || !service}
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ListTodo className="w-4 h-4" />}
                Gerar tarefas faltantes
              </Button>
            )}

            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={deactivateService}
              disabled={busy || !service || service?.is_active === false}
            >
              <PauseCircle className="w-4 h-4" />
              Inativar serviço
            </Button>

            <Button
              variant="destructive"
              className="w-full justify-start gap-2"
              onClick={deleteService}
              disabled={busy}
            >
              <Trash2 className="w-4 h-4" />
              Excluir serviço
            </Button>

            {service && (
              <div className="text-xs text-gray-600 pt-1 border-t mt-2">
                Status atual:{" "}
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2
                    className={`w-3 h-3 ${service.is_active ? "text-green-600" : "text-gray-400"}`}
                  />
                  {statusLabel}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <TaskPreview
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        onConfirm={handlePreviewConfirm}
        service={service}
        deliverables={service?.deliverables || []}
        isLoading={isGenerating}
        validationResult={validationResult}
      />
    </div>
  );
}
