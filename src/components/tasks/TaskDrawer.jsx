import React from "react";
import { Task } from "@/api/entities";
import { User } from "@/api/entities";
import { Client } from "@/api/entities";
import { ClientDocument } from "@/api/entities";
import { Notification } from "@/api/entities";
import { UploadPrivateFile } from "@/api/integrations";
import { useSession } from "@/components/auth/SessionManager";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Loader2, Calendar, Paperclip, CheckSquare, Send,
  AlertCircle, MessageCircle, Clock,
  Flag, Eye, AtSign, Check, Download, Trash2, Plus, Link2, History,
  MoreVertical, Copy, X, Upload
} from "lucide-react";
import { toast } from "sonner";
import TaskTimerButton from "@/components/tasks/TaskTimerButton";
import TaskTimeSessionsPanel from "@/components/tasks/TaskTimeSessionsPanel";
import TaskDependencies from "@/components/tasks/TaskDependencies";
import TaskHistory from "@/components/tasks/TaskHistory";
import { transitionTaskStatus } from "@/lib/taskStatusTransition";
import { appendAssignmentHistoryEntry } from "@/lib/taskActivityHistory";
import TaskNotificationService from "@/components/notifications/TaskNotificationService";
import { syncPipelineAfterTaskComplete } from "@/api/functions/transitionPipelinePhase";

const UNASSIGNED = "unassigned";

const STATUS_CONFIG = {
  backlog: { label: "Backlog", color: "bg-gray-100 text-gray-800", kanbanColor: "bg-gray-500" },
  todo: { label: "A Fazer", color: "bg-blue-100 text-blue-800", kanbanColor: "bg-blue-500" },
  in_progress: { label: "Em Progresso", color: "bg-yellow-100 text-yellow-800", kanbanColor: "bg-yellow-500" },
  in_review: { label: "Em Revisão", color: "bg-purple-100 text-purple-800", kanbanColor: "bg-purple-500" },
  completed: { label: "Concluído", color: "bg-green-100 text-green-800", kanbanColor: "bg-green-500" },
  cancelled: { label: "Cancelado", color: "bg-red-100 text-red-800", kanbanColor: "bg-red-500" },
  blocked: { label: "Bloqueado", color: "bg-orange-100 text-orange-800", kanbanColor: "bg-orange-500" },
};

const PRIORITY_CONFIG = {
  low: { label: "Baixa", color: "bg-blue-100 text-blue-800" },
  medium: { label: "Média", color: "bg-yellow-100 text-yellow-800" },
  high: { label: "Alta", color: "bg-orange-100 text-orange-800" },
  urgent: { label: "Urgente", color: "bg-red-100 text-red-800" },
};

function formatDueShort(dateStr) {
  if (!dateStr) return "Sem prazo";
  try {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return "Sem prazo";
  }
}

function formatFileSize(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function notifyLists(taskId, extra = {}) {
  window.dispatchEvent(new CustomEvent("task:updated", { detail: { taskId, ...extra } }));
  window.dispatchEvent(new Event("task:refresh"));
}

export default function TaskDrawer() {
  const { user, agencyId } = useSession();
  const currentUserId = user?.id || user?.data?.id;

  const [open, setOpen] = React.useState(false);
  const [taskId, setTaskId] = React.useState(null);
  const [task, setTask] = React.useState(null);
  const [client, setClient] = React.useState(null);
  const [users, setUsers] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [savingField, setSavingField] = React.useState("");
  const [error, setError] = React.useState("");

  const [editingTitle, setEditingTitle] = React.useState(false);
  const [titleDraft, setTitleDraft] = React.useState("");
  const [descDraft, setDescDraft] = React.useState("");
  const [editingDesc, setEditingDesc] = React.useState(false);

  const [commentText, setCommentText] = React.useState("");
  const [commentSending, setCommentSending] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [activeTab, setActiveTab] = React.useState("more");
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [dragOver, setDragOver] = React.useState(false);

  const [newChecklistItem, setNewChecklistItem] = React.useState("");
  const [checklistItemAssignee, setChecklistItemAssignee] = React.useState(UNASSIGNED);
  const [checklistItemDueDate, setChecklistItemDueDate] = React.useState("");

  const titleInputRef = React.useRef(null);
  const fileInputRef = React.useRef(null);
  const descRef = React.useRef(null);

  React.useEffect(() => {
    const handler = (e) => {
      const id = e?.detail?.taskId;
      if (!id) return;
      setTaskId(id);
      setOpen(true);
      fetchAll(id);
    };
    window.addEventListener("task:open", handler);
    return () => window.removeEventListener("task:open", handler);
  }, []);

  const fetchAll = async (id) => {
    setLoading(true);
    setError("");
    setEditingTitle(false);
    setEditingDesc(false);
    try {
      const [t, us] = await Promise.all([
        Task.get(id),
        User.filter(
          {
            ...(agencyId ? { agencyId } : {}),
            role: { $in: ["owner", "admin", "team"] },
          },
          "-updated_date",
          100
        ).catch(() =>
          User.filter(agencyId ? { agencyId } : {}, "-updated_date", 100)
        ),
      ]);
      setTask(t);
      setTitleDraft(t.title || "");
      setDescDraft(t.description || "");
      setUsers(us || []);
      if (t.clientId) {
        try {
          setClient(await Client.get(t.clientId));
        } catch {
          setClient(null);
        }
      } else {
        setClient(null);
      }
    } catch (e) {
      setError("Não foi possível carregar a tarefa. Tente novamente.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const closeDrawer = () => {
    setOpen(false);
    setTaskId(null);
    setTask(null);
    setClient(null);
    setError("");
    setUploadProgress(0);
    setUploading(false);
    setCommentText("");
    setActiveTab("more");
    setEditingTitle(false);
    setEditingDesc(false);
    setDeleteOpen(false);
    setNewChecklistItem("");
    setChecklistItemAssignee(UNASSIGNED);
    setChecklistItemDueDate("");
  };

  const teamUsers = React.useMemo(
    () => (users || []).filter((u) => ["owner", "admin", "team"].includes(u.role)),
    [users]
  );

  const getAssignedUser = (userId) => users.find((u) => u.id === userId);

  const patchTask = async (partial, opts = {}) => {
    if (!task?.id) return null;
    const prev = task;
    const optimistic = { ...task, ...partial };
    setTask(optimistic);
    setSavingField(opts.field || "field");
    try {
      const updated = await Task.update(task.id, partial);
      setTask(updated);
      notifyLists(task.id, partial);
      if (!opts.silent) {
        toast.success("Salvo", { duration: 1400 });
      }
      return updated;
    } catch (e) {
      setTask(prev);
      console.error(e);
      toast.error(opts.errorMessage || "Não foi possível salvar");
      throw e;
    } finally {
      setSavingField("");
    }
  };

  const saveTitle = async () => {
    const next = titleDraft.trim();
    if (!task) return;
    if (!next) {
      setTitleDraft(task.title || "");
      setEditingTitle(false);
      toast.error("Título é obrigatório");
      return;
    }
    if (next === (task.title || "")) {
      setEditingTitle(false);
      return;
    }
    setEditingTitle(false);
    await patchTask({ title: next }, { field: "title" });
  };

  const cancelTitleEdit = () => {
    setTitleDraft(task?.title || "");
    setEditingTitle(false);
  };

  const saveDescription = async () => {
    if (!task) return;
    const next = descDraft;
    if (next === (task.description || "")) {
      setEditingDesc(false);
      return;
    }
    setEditingDesc(false);
    await patchTask({ description: next }, { field: "description" });
  };

  const handleStatusChange = async (newStatus) => {
    if (!task || newStatus === task.status) return;
    const prev = task;
    setSavingField("status");
    try {
      const result = await transitionTaskStatus(task, newStatus, {
        agencyId: task.agencyId || user?.agencyId || user?.data?.agencyId,
        user,
      });
      if (!result.success) {
        toast.error(result.message || "Não é possível alterar o status");
        return;
      }
      let updated = result.task;
      setTask(updated);
      const statusLabel = STATUS_CONFIG[newStatus]?.label || newStatus;
      toast.success(`Status: ${statusLabel}`, { duration: 1600 });

      const systemComment = {
        id: `sys_${Date.now()}`,
        userId: currentUserId,
        userEmail: user?.email,
        userName: user?.full_name || user?.email,
        content: `Status alterado para: ${statusLabel}`,
        type: "system",
        createdAt: new Date().toISOString(),
      };
      updated = await Task.update(task.id, {
        comments: [...(updated.comments || []), systemComment],
      });
      setTask(updated);
      notifyLists(task.id, { status: newStatus });

      if (newStatus === "completed" && task.serviceId) {
        syncPipelineAfterTaskComplete({
          serviceId: task.serviceId,
          taskId: task.id,
          actorId: currentUserId,
        })
          .then((sync) => {
            if (sync?.transitions?.length) {
              toast.message("Pipeline avançou automaticamente", {
                description: `${sync.transitions.length} fase(s)`,
              });
            }
          })
          .catch(() => {});
      }
    } catch (e) {
      setTask(prev);
      console.error(e);
      toast.error("Erro ao alterar status");
    } finally {
      setSavingField("");
    }
  };

  const handleAssigneeChange = async (value) => {
    if (!task) return;
    const assigneeId = !value || value === UNASSIGNED ? null : value;
    const previousAssignee = task.assignedTo || task.assigneeId || null;
    if (String(previousAssignee || "") === String(assigneeId || "")) return;

    const partial = {
      assignedTo: assigneeId,
      assigneeId,
      statusHistory: appendAssignmentHistoryEntry(task, {
        assigneeId,
        previousAssigneeId: previousAssignee,
        user,
      }),
    };
    const updated = await patchTask(partial, { field: "assignee" });
    if (assigneeId && assigneeId !== currentUserId) {
      await TaskNotificationService.createTaskAssignedNotification(
        { ...updated, assignedTo: assigneeId },
        user
      ).catch(() => {});
    }
  };

  const handleDueDateChange = async (value) => {
    if (!task) return;
    const prevYmd = task.dueDate ? String(task.dueDate).slice(0, 10) : "";
    if (value === prevYmd) return;
    await patchTask(
      { dueDate: value ? new Date(`${value}T12:00:00`).toISOString() : null },
      { field: "dueDate" }
    );
  };

  const handlePriorityChange = async (value) => {
    if (!task || value === task.priority) return;
    await patchTask({ priority: value }, { field: "priority" });
  };

  const uploadFiles = async (fileList) => {
    if (!task || !fileList?.length) return;
    const files = Array.from(fileList);
    setUploading(true);
    setUploadProgress(5);
    let attachments = Array.isArray(task.attachments) ? [...task.attachments] : [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      try {
        setUploadProgress(10 + Math.round((i / files.length) * 80));
        const uploaded = await UploadPrivateFile({ file: f });
        const fileUrl = uploaded.file_url || uploaded.url || uploaded.file_uri;
        if (!fileUrl) throw new Error("URL do arquivo não retornada");

        if (task.agencyId && task.clientId) {
          await ClientDocument.create({
            agencyId: task.agencyId,
            clientId: task.clientId,
            serviceId: task.serviceId || null,
            deliverable_id: task.deliverableId || null,
            group: "other",
            fileName: f.name,
            title: f.name,
            description: `Anexo da tarefa: ${task.title}`,
            fileUrl,
            fileType: f.type || "application/octet-stream",
            fileSize: f.size || 0,
            version: "1.0",
            visibility: "internal",
            status: "approved",
            metadata: { attached_to_task: task.id },
            uploadedBy: currentUserId,
          }).catch(() => {});
        }

        attachments = [
          {
            id: `att_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            name: f.name,
            url: fileUrl,
            type: f.type?.startsWith("image/") ? "image" : "document",
            mimeType: f.type || "application/octet-stream",
            size: f.size || 0,
            uploadedBy: currentUserId,
            uploadedByName: user?.full_name || user?.email,
            uploadedAt: new Date().toISOString(),
            description: f.name,
            isEvidence: false,
          },
          ...attachments,
        ];
      } catch (e) {
        console.error(e);
        toast.error(`Falha ao anexar ${f.name}`);
      }
    }

    try {
      const updated = await Task.update(task.id, { attachments });
      setTask(updated);
      notifyLists(task.id);
      toast.success(
        files.length === 1 ? "Arquivo anexado" : `${files.length} arquivos anexados`
      );
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível salvar os anexos");
    } finally {
      setUploadProgress(100);
      setTimeout(() => {
        setUploadProgress(0);
        setUploading(false);
      }, 400);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeAttachment = async (attachmentId) => {
    if (!task) return;
    const prev = task.attachments || [];
    const next = prev.filter((a) => a.id !== attachmentId);
    await patchTask({ attachments: next }, { field: "attachments", silent: true });
    toast.success("Anexo removido");
  };

  const duplicateTask = async () => {
    if (!task) return;
    setSavingField("duplicate");
    try {
      const {
        id,
        $id,
        created_date,
        updated_date,
        completedAt,
        statusHistory,
        comments,
        timeEntries,
        ...rest
      } = task;
      const created = await Task.create({
        ...rest,
        title: `Cópia de ${task.title || "tarefa"}`,
        status: "todo",
        kanbanColumn: "todo",
        progress: 0,
        actualHours: 0,
        comments: [],
        statusHistory: [],
        timeEntries: [],
        completedAt: null,
        assignedBy: currentUserId,
        clientVisible: false,
      });
      toast.success("Tarefa duplicada");
      notifyLists(created.id);
      setTaskId(created.id);
      await fetchAll(created.id);
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível duplicar");
    } finally {
      setSavingField("");
    }
  };

  const deleteTask = async () => {
    if (!task) return;
    setSavingField("delete");
    try {
      await Task.delete(task.id);
      toast.success("Tarefa excluída");
      notifyLists(task.id, { deleted: true });
      setDeleteOpen(false);
      closeDrawer();
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível excluir");
    } finally {
      setSavingField("");
    }
  };

  const addChecklistItem = async () => {
    if (!task || !newChecklistItem.trim()) return;
    const checklist = Array.isArray(task.checklist) ? [...task.checklist] : [];
    checklist.push({
      id: `checklist_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      text: newChecklistItem.trim(),
      completed: false,
      order: checklist.length,
      required: false,
      evidenceRequired: false,
      evidenceUrls: [],
      assignedTo:
        checklistItemAssignee === UNASSIGNED ? null : checklistItemAssignee || null,
      dueDate: checklistItemDueDate
        ? new Date(checklistItemDueDate).toISOString()
        : null,
    });
    await patchTask({ checklist }, { field: "checklist", silent: true });
    setNewChecklistItem("");
    setChecklistItemAssignee(UNASSIGNED);
    setChecklistItemDueDate("");
    toast.success("Item adicionado");
  };

  const toggleChecklistItem = async (itemId) => {
    if (!task) return;
    const checklist = Array.isArray(task.checklist) ? [...task.checklist] : [];
    const idx = checklist.findIndex((item) => item.id === itemId);
    if (idx === -1) return;
    const now = new Date().toISOString();
    const wasDone = checklist[idx].completed;
    checklist[idx] = {
      ...checklist[idx],
      completed: !wasDone,
      completedAt: !wasDone ? now : null,
      completedBy: !wasDone ? currentUserId : null,
      completedByName: !wasDone ? user?.full_name || user?.email : null,
    };
    await patchTask({ checklist }, { field: "checklist", silent: true });
  };

  const deleteChecklistItem = async (itemId) => {
    if (!task) return;
    const checklist = (task.checklist || []).filter((item) => item.id !== itemId);
    await patchTask({ checklist }, { field: "checklist", silent: true });
    toast.success("Item removido");
  };

  const submitComment = async () => {
    if (!task || !commentText.trim()) return;
    setCommentSending(true);
    try {
      const comments = Array.isArray(task.comments) ? [...task.comments] : [];
      const mentions = [];
      const mentionRegex = /@(\w+)/g;
      let match;
      while ((match = mentionRegex.exec(commentText)) !== null) {
        const mentionedUsername = match[1];
        const mentionedUser = users.find(
          (u) =>
            u.full_name?.toLowerCase().includes(mentionedUsername.toLowerCase()) ||
            u.email?.toLowerCase().includes(mentionedUsername.toLowerCase())
        );
        if (mentionedUser && !mentions.includes(mentionedUser.id)) {
          mentions.push(mentionedUser.id);
        }
      }

      comments.unshift({
        id: `c_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        userId: currentUserId,
        userEmail: user?.email,
        userName: user?.full_name || user?.email,
        content: commentText.trim(),
        type: "comment",
        mentions,
        attachments: [],
        createdAt: new Date().toISOString(),
        isEdited: false,
      });

      const updated = await Task.update(task.id, { comments });
      setTask(updated);

      for (const mentionedUserId of mentions) {
        await Notification.create({
          agencyId: task.agencyId,
          userId: mentionedUserId,
          type: "task_mentioned",
          subject: { type: "task", id: task.id },
          title: `Você foi mencionado em "${task.title}"`,
          context:
            commentText.length > 180
              ? `${commentText.slice(0, 180)}...`
              : commentText,
          href: `/tasks-manager?taskId=${task.id}`,
          severity: "info",
        }).catch(() => {});
      }

      setCommentText("");
      toast.success("Comentário enviado");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao enviar comentário");
    } finally {
      setCommentSending(false);
    }
  };

  const progressChecklist = React.useMemo(() => {
    const list = Array.isArray(task?.checklist) ? task.checklist : [];
    if (!list.length) return 0;
    return Math.round((list.filter((c) => c.completed).length / list.length) * 100);
  }, [task]);

  const assigneeValue = task?.assigneeId || task?.assignedTo || UNASSIGNED;
  const dueValue = task?.dueDate ? String(task.dueDate).slice(0, 10) : "";
  const assignedUser = getAssignedUser(task?.assigneeId || task?.assignedTo);

  React.useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [editingTitle]);

  React.useEffect(() => {
    if (editingDesc && !(descDraft && descDraft.length > 0)) {
      descRef.current?.focus();
    }
  }, [editingDesc, descDraft]);

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => (v ? setOpen(true) : closeDrawer())}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl md:max-w-2xl flex flex-col p-0 gap-0"
        >
          <SheetHeader className="border-b px-4 sm:px-5 pt-4 pb-3 space-y-0 text-left">
            <div className="flex items-start gap-2 pr-8">
              <div className="flex-1 min-w-0">
                {editingTitle ? (
                  <Input
                    ref={titleInputRef}
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onBlur={saveTitle}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        saveTitle();
                      }
                      if (e.key === "Escape") {
                        e.preventDefault();
                        cancelTitleEdit();
                      }
                    }}
                    className="text-lg sm:text-xl font-semibold h-auto py-1 px-2"
                    disabled={savingField === "title"}
                  />
                ) : (
                  <SheetTitle
                    className="text-lg sm:text-xl font-semibold leading-snug cursor-text rounded-md px-1 -mx-1 hover:bg-muted/60"
                    onClick={() => {
                      if (!task) return;
                      setTitleDraft(task.title || "");
                      setEditingTitle(true);
                    }}
                  >
                    {task ? task.title : "Carregando…"}
                  </SheetTitle>
                )}
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {client?.name && <span className="truncate max-w-[160px]">{client.name}</span>}
                  {task?.deliverableName && (
                    <>
                      {client?.name ? <span>·</span> : null}
                      <span className="truncate max-w-[180px]">{task.deliverableName}</span>
                    </>
                  )}
                  {savingField ? (
                    <span className="inline-flex items-center gap-1 text-teal-700">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Salvando…
                    </span>
                  ) : null}
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    aria-label="Mais ações"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={duplicateTask} disabled={!!savingField}>
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicar tarefa
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-600 focus:text-red-600"
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir tarefa
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </SheetHeader>

          {loading && (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-teal-700" />
            </div>
          )}

          {!loading && error && (
            <div className="flex-1 flex items-center justify-center p-6 text-center space-y-3">
              <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button onClick={() => fetchAll(taskId)} variant="outline" size="sm">
                Tentar novamente
              </Button>
            </div>
          )}

          {!loading && task && (
            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-5">
              {/* Property rows */}
              <div className="space-y-2.5">
                <div className="grid grid-cols-[100px_1fr] sm:grid-cols-[120px_1fr] items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Status</span>
                  <Select
                    value={task.status || "todo"}
                    onValueChange={handleStatusChange}
                    disabled={savingField === "status"}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <span className="inline-flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${config.kanbanColor}`} />
                            {config.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-[100px_1fr] sm:grid-cols-[120px_1fr] items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Visibilidade</span>
                  <div className="flex items-center justify-between gap-3 min-h-9 rounded-md border px-3 py-1.5">
                    <Label
                      htmlFor="task-client-visible"
                      className="text-sm font-normal text-foreground cursor-pointer"
                    >
                      Visível para o cliente
                    </Label>
                    <Switch
                      id="task-client-visible"
                      checked={task.clientVisible === true}
                      disabled={savingField === "clientVisible"}
                      onCheckedChange={async (checked) => {
                        await patchTask(
                          { clientVisible: Boolean(checked) },
                          { field: "clientVisible" }
                        );
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-[100px_1fr] sm:grid-cols-[120px_1fr] items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Responsável</span>
                  <Select
                    value={assigneeValue || UNASSIGNED}
                    onValueChange={handleAssigneeChange}
                    disabled={savingField === "assignee"}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Sem responsável">
                        {assignedUser ? (
                          <span className="inline-flex items-center gap-2 min-w-0">
                            <Avatar className="w-5 h-5">
                              <AvatarFallback className="text-[10px]">
                                {(assignedUser.full_name || assignedUser.email || "?").charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate">
                              {assignedUser.full_name || assignedUser.email}
                            </span>
                          </span>
                        ) : (
                          "Sem responsável"
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      <SelectItem value={UNASSIGNED}>Sem responsável</SelectItem>
                      {teamUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.full_name || u.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-[100px_1fr] sm:grid-cols-[120px_1fr] items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Prazo</span>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="relative flex-1 min-w-0">
                      <Calendar className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      <Input
                        type="date"
                        value={dueValue}
                        onChange={(e) => handleDueDateChange(e.target.value)}
                        className="h-9 pl-8"
                        disabled={savingField === "dueDate"}
                        aria-label={`Prazo: ${formatDueShort(task.dueDate)}`}
                      />
                    </div>
                    {task.dueDate && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={() => handleDueDateChange("")}
                        aria-label="Remover prazo"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-[100px_1fr] sm:grid-cols-[120px_1fr] items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Prioridade</span>
                  <Select
                    value={task.priority || "medium"}
                    onValueChange={handlePriorityChange}
                    disabled={savingField === "priority"}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <span className="inline-flex items-center gap-2">
                            <Flag className="w-3 h-3" />
                            {config.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  {task.status !== "completed" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => handleStatusChange("completed")}
                      disabled={!!savingField}
                    >
                      <Check className="w-3.5 h-3.5 mr-1" />
                      Concluir
                    </Button>
                  )}
                  <TaskTimerButton task={task} />
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <h3 className="text-sm font-semibold text-[#18162A]">Descrição</h3>
                {editingDesc || (descDraft && descDraft.length > 0) ? (
                  <Textarea
                    ref={descRef}
                    value={descDraft}
                    onChange={(e) => {
                      setDescDraft(e.target.value);
                      setEditingDesc(true);
                    }}
                    onBlur={saveDescription}
                    onFocus={() => setEditingDesc(true)}
                    placeholder="Adicionar descrição…"
                    rows={4}
                    className="resize-y min-h-[96px]"
                  />
                ) : (
                  <button
                    type="button"
                    className="w-full text-left text-sm text-muted-foreground rounded-md border border-dashed px-3 py-3 hover:bg-muted/40"
                    onClick={() => {
                      setEditingDesc(true);
                      requestAnimationFrame(() => descRef.current?.focus());
                    }}
                  >
                    Adicionar descrição…
                  </button>
                )}
              </div>

              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-[#18162A]">Anexos</h3>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Adicionar arquivo
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => uploadFiles(e.target.files)}
                  />
                </div>

                <div
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    uploadFiles(e.dataTransfer?.files);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  className={`rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
                    dragOver
                      ? "border-teal-500 bg-teal-50/50"
                      : "border-muted-foreground/25 hover:border-muted-foreground/40"
                  }`}
                >
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground/60" />
                  <p className="text-sm text-muted-foreground">
                    Arraste arquivos aqui ou use Adicionar arquivo
                  </p>
                  {uploading && (
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center justify-center gap-2 text-xs">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Enviando… {uploadProgress}%
                      </div>
                      <Progress value={uploadProgress} className="h-1.5" />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {(task.attachments || []).map((a) => (
                    <div
                      key={`${a.id}-${a.name}`}
                      className="flex items-center gap-3 p-2.5 rounded-lg border bg-white"
                    >
                      <Paperclip className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{a.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {[
                            a.mimeType || a.type,
                            a.size != null ? formatFileSize(a.size) : null,
                            a.uploadedAt
                              ? new Date(a.uploadedAt).toLocaleDateString("pt-BR")
                              : null,
                            a.uploadedByName,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <a href={a.url} target="_blank" rel="noreferrer" aria-label="Abrir">
                            <Eye className="w-4 h-4" />
                          </a>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <a href={a.url} download={a.name} aria-label="Baixar">
                            <Download className="w-4 h-4" />
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700"
                          onClick={() => removeAttachment(a.id)}
                          aria-label="Remover"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {!(task.attachments || []).length && !uploading && (
                    <p className="text-xs text-muted-foreground text-center py-1">
                      Nenhum anexo ainda
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t pt-3">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <div className="overflow-x-auto -mx-1 px-1 mb-3">
                    <TabsList className="inline-flex w-max min-w-full h-auto gap-1">
                      <TabsTrigger value="more" className="text-xs shrink-0 gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Tempo
                      </TabsTrigger>
                      <TabsTrigger value="checklist" className="text-xs shrink-0 gap-1">
                        <CheckSquare className="w-3.5 h-3.5" />
                        Checklist
                        {task.checklist?.length > 0 && (
                          <Badge variant="secondary" className="text-[10px] h-4 px-1">
                            {progressChecklist}%
                          </Badge>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="comments" className="text-xs shrink-0 gap-1">
                        <MessageCircle className="w-3.5 h-3.5" />
                        Comentários
                      </TabsTrigger>
                      <TabsTrigger value="dependencies" className="text-xs shrink-0 gap-1">
                        <Link2 className="w-3.5 h-3.5" />
                        Deps
                      </TabsTrigger>
                      <TabsTrigger value="history" className="text-xs shrink-0 gap-1">
                        <History className="w-3.5 h-3.5" />
                        Histórico
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="more" className="mt-0">
                    <TaskTimeSessionsPanel taskId={task.id} />
                  </TabsContent>

                  <TabsContent value="checklist" className="mt-0 space-y-3">
                    {task.checklist?.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span>Progresso</span>
                          <span>
                            {task.checklist.filter((c) => c.completed).length}/
                            {task.checklist.length}
                          </span>
                        </div>
                        <Progress value={progressChecklist} className="h-1.5" />
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Input
                        value={newChecklistItem}
                        onChange={(e) => setNewChecklistItem(e.target.value)}
                        placeholder="Adicionar item…"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addChecklistItem();
                          }
                        }}
                      />
                      <Button
                        size="icon"
                        onClick={addChecklistItem}
                        disabled={!newChecklistItem.trim()}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {(task.checklist || []).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start gap-2 p-2 rounded-md border"
                        >
                          <button
                            type="button"
                            className="mt-0.5"
                            onClick={() => toggleChecklistItem(item.id)}
                          >
                            {item.completed ? (
                              <CheckSquare className="w-4 h-4 text-green-600" />
                            ) : (
                              <div className="w-4 h-4 rounded border border-muted-foreground/40" />
                            )}
                          </button>
                          <span
                            className={`flex-1 text-sm ${
                              item.completed ? "line-through text-muted-foreground" : ""
                            }`}
                          >
                            {item.text}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground"
                            onClick={() => deleteChecklistItem(item.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="comments" className="mt-0 space-y-3">
                    <div className="space-y-2">
                      <Textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Escreva um comentário… Use @nome para mencionar"
                        rows={3}
                      />
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                          <AtSign className="w-3 h-3" />
                          Use @ para mencionar
                        </span>
                        <Button
                          size="sm"
                          onClick={submitComment}
                          disabled={commentSending || !commentText.trim()}
                        >
                          {commentSending ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-1" />
                          ) : (
                            <Send className="w-4 h-4 mr-1" />
                          )}
                          Enviar
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {(task.comments || []).map((c) => (
                        <div
                          key={c.id}
                          className={`rounded-md border p-3 ${
                            c.type === "system" ? "bg-blue-50/60 border-blue-100" : ""
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Avatar className="w-6 h-6">
                              <AvatarFallback className="text-[10px]">
                                {(c.userName || c.userEmail || "?").charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs font-medium">
                              {c.userName || c.userEmail}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {c.createdAt
                                ? new Date(c.createdAt).toLocaleString("pt-BR")
                                : ""}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{c.content}</p>
                        </div>
                      ))}
                      {!(task.comments || []).length && (
                        <p className="text-sm text-muted-foreground text-center py-6">
                          Nenhum comentário ainda
                        </p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="dependencies" className="mt-0">
                    <TaskDependencies
                      task={task}
                      onUpdate={(updated) => setTask(updated)}
                    />
                  </TabsContent>

                  <TabsContent value="history" className="mt-0">
                    <TaskHistory task={task} />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta tarefa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteTask}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {savingField === "delete" ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
