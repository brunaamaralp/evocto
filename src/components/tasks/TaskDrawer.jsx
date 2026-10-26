import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Task } from "@/api/entities";
import { User } from "@/api/entities";
import { Client } from "@/api/entities";
import { Notification } from "@/api/entities";
import { useSession } from "@/components/auth/SessionManager";
import {
  applyTaskIdToSearch,
  buildTaskDeepLink,
  readTaskIdFromSearch,
} from "@/lib/openTaskDrawer";
import { listTaskDrawerContextLinks } from "@/lib/taskDrawerContextLinks";
import {
  COMMENT_VISIBILITY,
  getCommentVisibility,
  withCommentVisibility,
} from "@/lib/taskCommentVisibility";
import { listManualBlockers } from "@/lib/taskDependencyStatus";
import { getTaskAssigneeId } from "@/lib/taskFilterPresets";

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
  MoreVertical, Copy, X, Upload, ChevronUp, ChevronDown, Image as ImageIcon,
  ChevronRight, FolderOpen
} from "lucide-react";
import { toast } from "sonner";
import TaskTimerButton from "@/components/tasks/TaskTimerButton";
import TaskTimeSessionsPanel from "@/components/tasks/TaskTimeSessionsPanel";
import TaskDependencies from "@/components/tasks/TaskDependencies";
import TaskHistory from "@/components/tasks/TaskHistory";
import { transitionTaskStatus, completedKanbanColumnForTask } from "@/lib/taskStatusTransition";
import { completeTask, notifyTaskCompleted, toastTaskCompleted, toastTaskCompleteError } from "@/lib/completeTask";
import { appendAssignmentHistoryEntry } from "@/lib/taskActivityHistory";
import TaskNotificationService from "@/components/notifications/TaskNotificationService";
import { syncPipelineAfterTaskComplete } from "@/api/functions/transitionPipelinePhase";
import { statusLabelPt } from "@/lib/statusLabelsPt";
import {
  getTaskStatusConfig,
  getTaskStatusSelectMap,
} from "@/lib/taskStatusCanonical";
import { getStagePastel } from "@/lib/modulePastels";
import {
  appendFilesToTaskAttachments,
  isImageAttachment,
  reorderAttachments,
  saveTaskAttachmentsOrder,
} from "@/lib/taskAttachmentsUpload";

const UNASSIGNED = "unassigned";

const STATUS_CONFIG = getTaskStatusSelectMap();

const PRIORITY_CONFIG = {
  low: { label: "Baixa", color: getStagePastel("backlog").badge },
  medium: { label: "Média", color: getStagePastel("waiting_client").badge },
  high: { label: "Alta", color: getStagePastel("in_progress").badge },
  urgent: { label: "Urgente", color: getStagePastel("blocked").badge },
};

function formatDueShort(dateStr) {
  if (!dateStr) return "Sem prazo";
  try {
    const d = new Date(dateStr);
    const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;
    return d.toLocaleString("pt-BR", {
      day: "numeric",
      month: "short",
      ...(hasTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    });
  } catch {
    return "Sem prazo";
  }
}

/** ISO → valor datetime-local no fuso local */
function toDatetimeLocalValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isMeetingTask(task) {
  return (
    task?.activityKind === "meeting" ||
    task?.type === "reuniao" ||
    task?.type === "reuniao_alinhamento" ||
    (Array.isArray(task?.tags) && task.tags.includes("reuniao"))
  );
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
  const location = useLocation();
  const navigate = useNavigate();
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
  const [commentVisibility, setCommentVisibility] = React.useState(
    COMMENT_VISIBILITY.INTERNAL
  );
  const [commentSending, setCommentSending] = React.useState(false);
  const [newTag, setNewTag] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [activeTab, setActiveTab] = React.useState("comments");
  const contextLinks = React.useMemo(
    () => listTaskDrawerContextLinks(task),
    [task]
  );
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [pendingRemove, setPendingRemove] = React.useState(null); // { type, id, label }
  const [dragOver, setDragOver] = React.useState(false);

  const [newChecklistItem, setNewChecklistItem] = React.useState("");
  const [checklistItemAssignee, setChecklistItemAssignee] = React.useState(UNASSIGNED);
  const [checklistItemDueDate, setChecklistItemDueDate] = React.useState("");

  const titleInputRef = React.useRef(null);
  const fileInputRef = React.useRef(null);
  const descRef = React.useRef(null);
  const openTaskIdRef = React.useRef(null);
  const skipNextUrlOpenRef = React.useRef(false);
  const taskRef = React.useRef(null);
  const titleDraftRef = React.useRef("");
  const descDraftRef = React.useRef("");
  const editingTitleRef = React.useRef(false);
  const editingDescRef = React.useRef(false);

  React.useEffect(() => {
    taskRef.current = task;
  }, [task]);
  React.useEffect(() => {
    titleDraftRef.current = titleDraft;
  }, [titleDraft]);
  React.useEffect(() => {
    descDraftRef.current = descDraft;
  }, [descDraft]);
  React.useEffect(() => {
    editingTitleRef.current = editingTitle;
  }, [editingTitle]);
  React.useEffect(() => {
    editingDescRef.current = editingDesc;
  }, [editingDesc]);

  const syncTaskQuery = React.useCallback(
    (id) => {
      const nextSearch = applyTaskIdToSearch(location.search, id || null);
      if (nextSearch === (location.search || '')) return;
      skipNextUrlOpenRef.current = true;
      navigate(`${location.pathname}${nextSearch}${location.hash || ''}`, { replace: true });
    },
    [location.hash, location.pathname, location.search, navigate]
  );

  const fetchAll = React.useCallback(async (id) => {
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
  }, [agencyId]);

  const flushDrafts = React.useCallback(async () => {
    const t = taskRef.current;
    if (!t?.id) return;
    const patches = {};
    if (editingTitleRef.current) {
      const nextTitle = String(titleDraftRef.current || "").trim();
      if (nextTitle && nextTitle !== (t.title || "")) {
        patches.title = nextTitle;
      }
    }
    if (
      editingDescRef.current ||
      String(descDraftRef.current || "") !== String(t.description || "")
    ) {
      const nextDesc = descDraftRef.current;
      if (nextDesc !== (t.description || "")) {
        patches.description = nextDesc;
      }
    }
    if (!Object.keys(patches).length) return;
    try {
      await Task.update(t.id, patches);
      notifyLists(t.id, patches);
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível salvar alterações em andamento");
    }
  }, []);

  const openById = React.useCallback(
    async (id, { syncUrl = true } = {}) => {
      if (!id) return;
      const normalized = String(id);
      if (
        openTaskIdRef.current &&
        String(openTaskIdRef.current) !== normalized
      ) {
        await flushDrafts();
      }
      openTaskIdRef.current = normalized;
      setTaskId(normalized);
      setOpen(true);
      fetchAll(normalized);
      if (syncUrl) syncTaskQuery(normalized);
    },
    [fetchAll, syncTaskQuery, flushDrafts]
  );

  React.useEffect(() => {
    const handler = (e) => {
      const id = e?.detail?.taskId;
      if (!id) return;
      openById(id, { syncUrl: true });
    };
    window.addEventListener("task:open", handler);
    return () => window.removeEventListener("task:open", handler);
  }, [openById]);

  // Deep link: ?taskId= / ?task=
  React.useEffect(() => {
    if (skipNextUrlOpenRef.current) {
      skipNextUrlOpenRef.current = false;
      return;
    }
    const id = readTaskIdFromSearch(location.search);
    if (!id) {
      if (open && openTaskIdRef.current) {
        // URL limpa (ex.: back) — fecha drawer
        openTaskIdRef.current = null;
        setOpen(false);
        setTaskId(null);
        setTask(null);
      }
      return;
    }
    if (String(openTaskIdRef.current) === String(id) && open) return;
    openById(id, { syncUrl: false });
  }, [location.search, open, openById]);

  const closeDrawer = async () => {
    await flushDrafts();
    openTaskIdRef.current = null;
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
    setPendingRemove(null);
    setNewChecklistItem("");
    setChecklistItemAssignee(UNASSIGNED);
    setChecklistItemDueDate("");
    syncTaskQuery(null);
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
      let updated;
      if (newStatus === "completed") {
        const result = await completeTask(task, {
          agencyId: task.agencyId || user?.agencyId || user?.data?.agencyId,
          user,
        });
        if (!result.success) {
          toastTaskCompleteError(result.message || "Não é possível concluir esta tarefa");
          return;
        }
        updated = result.task;
        setTask(updated);
        toastTaskCompleted(task, {
          alreadyCompleted: result.alreadyCompleted,
          warning: result.warning,
        });
      } else {
        const result = await transitionTaskStatus(task, newStatus, {
          agencyId: task.agencyId || user?.agencyId || user?.data?.agencyId,
          user,
        });
        if (!result.success) {
          toast.error(result.message || "Não é possível alterar o status");
          return;
        }
        updated = result.task;
        setTask(updated);
        const statusLabel = getTaskStatusConfig(newStatus).label || statusLabelPt(newStatus);
        toast.success(`Status: ${statusLabel}`, { duration: 1600 });
        if (result.warning) {
          toast.warning(result.warning, { duration: 4500 });
        }
      }

      const statusLabel = getTaskStatusConfig(newStatus).label || statusLabelPt(newStatus);

      const systemComment = {
        id: `sys_${Date.now()}`,
        userId: currentUserId,
        userEmail: user?.email,
        userName: user?.full_name || user?.email,
        content: `Status alterado para: ${statusLabel}`,
        type: "system",
        createdAt: new Date().toISOString(),
      };
      // Reenvia status/kanbanColumn no mesmo update dos comentários para não
      // regravar um status antigo se o getRow intermediário vier defasado.
      const commentPatch = {
        comments: [...(updated.comments || []), systemComment],
        status: newStatus,
        kanbanColumn:
          newStatus === "completed"
            ? completedKanbanColumnForTask({ ...task, ...updated, status: newStatus })
            : newStatus,
      };
      if (newStatus === "completed") {
        commentPatch.completedAt =
          updated?.completedAt || new Date().toISOString();
        commentPatch.progress = 100;
      }
      updated = await Task.update(task.id, commentPatch);
      setTask(updated);

      if (newStatus === "completed") {
        notifyTaskCompleted(task.id, {
          kanbanColumn: commentPatch.kanbanColumn,
        });
      } else {
        notifyLists(task.id, { status: newStatus });
      }

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
    const previousAssignee = getTaskAssigneeId(task);
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
    if (!value) {
      if (!task.dueDate) return;
      await patchTask({ dueDate: null }, { field: "dueDate" });
      return;
    }
    const dueDate = value.includes("T")
      ? new Date(value).toISOString()
      : new Date(`${value}T12:00:00`).toISOString();
    if (
      task.dueDate &&
      !Number.isNaN(new Date(dueDate).getTime()) &&
      new Date(task.dueDate).getTime() === new Date(dueDate).getTime()
    ) {
      return;
    }
    await patchTask({ dueDate }, { field: "dueDate" });
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
    try {
      const { task: updated, added, failures } = await appendFilesToTaskAttachments(
        task,
        files,
        {
          uploadedBy: currentUserId,
          uploadedByName: user?.full_name || user?.email,
          prepend: true,
          onProgress: setUploadProgress,
        }
      );
      if (updated) {
        setTask(updated);
        notifyLists(task.id);
      }
      if (failures.length && !added.length) {
        toast.error("Não foi possível anexar os arquivos");
      } else if (failures.length) {
        toast.warning(
          `${added.length} anexado(s); ${failures.length} falhou(aram)`
        );
      } else {
        toast.success(
          files.length === 1 ? "Arquivo anexado" : `${files.length} arquivos anexados`
        );
      }
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

  const requestRemoveAttachment = (attachment) => {
    if (!attachment?.id) return;
    setPendingRemove({
      type: "attachment",
      id: attachment.id,
      label: attachment.name || "este anexo",
    });
  };

  const moveAttachment = async (fromIndex, delta) => {
    if (!task) return;
    const toIndex = fromIndex + delta;
    const next = reorderAttachments(task.attachments, fromIndex, toIndex);
    if (next === task.attachments) return;
    setTask({ ...task, attachments: next });
    try {
      const updated = await saveTaskAttachmentsOrder(task.id, next);
      setTask(updated);
      notifyLists(task.id);
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível reordenar");
      try {
        const fresh = await Task.get(task.id);
        setTask(fresh);
      } catch {
        /* ignore */
      }
    }
  };

  const sendForApproval = async () => {
    if (!task) return;
    const attachments = task.attachments || [];
    if (!attachments.length) {
      toast.error("Anexe o conteúdo antes de enviar para aprovação");
      return;
    }
    if (task.status === "in_review" && task.clientVisible === true) {
      toast.message("Já está em revisão com o cliente");
      return;
    }
    setSavingField("status");
    try {
      let current = task;
      if (current.status !== "in_review") {
        const result = await transitionTaskStatus(current, "in_review", {
          agencyId: current.agencyId || user?.agencyId || user?.data?.agencyId,
          user,
        });
        if (!result.success) {
          toast.error(result.message || "Não é possível enviar para aprovação");
          return;
        }
        current = result.task;
        setTask(current);
        notifyLists(current.id);
      }
      if (current.clientVisible !== true) {
        const updated = await Task.update(current.id, { clientVisible: true });
        setTask(updated);
        notifyLists(current.id);
      }
      toast.success("Enviado para aprovação do cliente");
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível enviar para aprovação");
    } finally {
      setSavingField("");
    }
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
      openById(created.id, { syncUrl: true });
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

  const requestRemoveChecklistItem = (item) => {
    if (!item?.id) return;
    setPendingRemove({
      type: "checklist",
      id: item.id,
      label: item.text || "este item",
    });
  };

  const confirmPendingRemove = async () => {
    if (!pendingRemove) return;
    const { type, id } = pendingRemove;
    setPendingRemove(null);
    if (type === "attachment") await removeAttachment(id);
    if (type === "checklist") await deleteChecklistItem(id);
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

      comments.unshift(
        withCommentVisibility(
          {
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
          },
          commentVisibility
        )
      );

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
          href: buildTaskDeepLink(task.id),
          severity: "info",
        }).catch(() => {});
      }

      setCommentText("");
      setCommentVisibility(COMMENT_VISIBILITY.INTERNAL);
      toast.success(
        commentVisibility === COMMENT_VISIBILITY.CLIENT
          ? "Comentário enviado (visível ao cliente)"
          : "Comentário interno enviado"
      );
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

  const addTag = async () => {
    const tag = newTag.trim().toLowerCase();
    if (!task || !tag) return;
    const tags = Array.isArray(task.tags) ? [...task.tags] : [];
    if (tags.includes(tag)) {
      setNewTag("");
      return;
    }
    tags.push(tag);
    setNewTag("");
    await patchTask({ tags }, { field: "tags" });
  };

  const removeTag = async (tagToRemove) => {
    if (!task) return;
    const tags = (Array.isArray(task.tags) ? task.tags : []).filter(
      (t) => t !== tagToRemove
    );
    await patchTask({ tags }, { field: "tags" });
  };

  const assigneeValue = getTaskAssigneeId(task) || UNASSIGNED;
  const meetingItem = isMeetingTask(task);
  const manualBlockers = listManualBlockers(task);
  const dependencyCount = Array.isArray(task?.dependencies)
    ? task.dependencies.length
    : 0;
  const showBlockBanner =
    String(task?.status || "").toLowerCase() === "blocked" ||
    manualBlockers.length > 0 ||
    dependencyCount > 0;
  const dueValue = task?.dueDate
    ? meetingItem
      ? toDatetimeLocalValue(task.dueDate)
      : String(task.dueDate).slice(0, 10)
    : "";
  const assignedUser = getAssignedUser(getTaskAssigneeId(task));

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
          onEscapeKeyDown={(e) => {
            if (editingTitle || editingDesc) {
              e.preventDefault();
              if (editingTitle) cancelTitleEdit();
              if (editingDesc) {
                setDescDraft(task?.description || "");
                setEditingDesc(false);
              }
            }
          }}
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
                        e.stopPropagation();
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
                  {(client?.name || (task && !task.clientId ? 'Interno' : null)) && (
                    <span className="truncate max-w-[160px]">
                      {client?.name || 'Interno'}
                    </span>
                  )}
                  {task?.deliverableName && (
                    <>
                      {(client?.name || !task?.clientId) ? <span>·</span> : null}
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
                {contextLinks.length > 0 ? (
                  <nav
                    className="mt-2 flex flex-wrap items-center gap-x-1 gap-y-1 text-xs"
                    aria-label="Contexto da tarefa"
                  >
                    {contextLinks.map((link, index) => (
                      <React.Fragment key={link.href + link.label}>
                        {index > 0 ? (
                          <ChevronRight className="w-3 h-3 text-muted-foreground/70 shrink-0" />
                        ) : (
                          <FolderOpen className="w-3 h-3 text-muted-foreground/70 shrink-0 mr-0.5" />
                        )}
                        <Link
                          to={link.href}
                          className="font-medium text-teal-800 hover:underline truncate max-w-[140px]"
                          onClick={() => setOpen(false)}
                        >
                          {link.label}
                        </Link>
                      </React.Fragment>
                    ))}
                  </nav>
                ) : null}
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
              {showBlockBanner ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 space-y-1">
                  <div className="flex items-center gap-2 font-medium">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {String(task.status || "").toLowerCase() === "blocked" ||
                    manualBlockers.length > 0
                      ? "Atenção: tarefa bloqueada"
                      : "Esta tarefa tem dependências"}
                  </div>
                  {manualBlockers.length > 0 ? (
                    <ul className="text-xs space-y-0.5 pl-6 list-disc">
                      {manualBlockers.map((b, i) => (
                        <li key={b.id || i}>
                          {b.reason || b.message || "Bloqueio registrado"}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {dependencyCount > 0 ? (
                    <button
                      type="button"
                      className="text-xs underline underline-offset-2 pl-6"
                      onClick={() => setActiveTab("dependencies")}
                    >
                      Ver {dependencyCount} dependência
                      {dependencyCount === 1 ? "" : "s"}
                    </button>
                  ) : null}
                </div>
              ) : null}

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
                  <span className="text-xs font-medium text-muted-foreground">
                    {meetingItem ? "Horário" : "Prazo"}
                  </span>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="relative flex-1 min-w-0">
                      <Calendar className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      <Input
                        type={meetingItem ? "datetime-local" : "date"}
                        value={dueValue}
                        onChange={(e) => handleDueDateChange(e.target.value)}
                        className="h-9 pl-8"
                        disabled={savingField === "dueDate"}
                        aria-label={`${meetingItem ? "Horário" : "Prazo"}: ${formatDueShort(task.dueDate)}`}
                      />
                    </div>
                    {task.dueDate && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={() => handleDueDateChange("")}
                        aria-label={meetingItem ? "Remover horário" : "Remover prazo"}
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

                <div className="grid grid-cols-[100px_1fr] sm:grid-cols-[120px_1fr] items-start gap-2">
                  <span className="text-xs font-medium text-muted-foreground pt-2">
                    Tags
                  </span>
                  <div className="space-y-2 min-w-0">
                    <div className="flex flex-wrap gap-1.5">
                      {(task.tags || []).length === 0 ? (
                        <span className="text-xs text-muted-foreground py-1">
                          Nenhuma tag
                        </span>
                      ) : (
                        (task.tags || []).map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-[11px] gap-1 pr-1"
                          >
                            {tag}
                            <button
                              type="button"
                              className="rounded-sm hover:text-red-600"
                              aria-label={`Remover tag ${tag}`}
                              disabled={savingField === "tags"}
                              onClick={() => removeTag(tag)}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))
                      )}
                    </div>
                    <div className="flex gap-1.5">
                      <Input
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder="Nova tag…"
                        className="h-8 text-sm"
                        disabled={savingField === "tags"}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void addTag();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 shrink-0"
                        disabled={savingField === "tags" || !newTag.trim()}
                        onClick={() => void addTag()}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
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
                      {savingField === "status" ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5 mr-1" />
                      )}
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
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        e.preventDefault();
                        e.stopPropagation();
                        setDescDraft(task?.description || "");
                        setEditingDesc(false);
                      }
                    }}
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
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-[#18162A]">Anexos</h3>
                    {(() => {
                      const atts = task.attachments || [];
                      const imageCount = atts.filter((a) => isImageAttachment(a)).length;
                      if (imageCount >= 2) {
                        return (
                          <p className="text-xs text-muted-foreground">
                            Carrossel ({imageCount} slides)
                          </p>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {(task.attachments || []).length > 0 &&
                    task.status !== "completed" &&
                    task.status !== "cancelled" &&
                    !(task.status === "in_review" && task.clientVisible === true) ? (
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 text-xs bg-primary hover:bg-[var(--color-primary-dark)]"
                        onClick={sendForApproval}
                        disabled={savingField === "status" || uploading}
                      >
                        <Send className="w-3.5 h-3.5 mr-1" />
                        Enviar para aprovação
                      </Button>
                    ) : null}
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
                  </div>
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

                {(task.attachments || []).some((a) => isImageAttachment(a)) ? (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {(task.attachments || [])
                      .filter((a) => isImageAttachment(a))
                      .map((a) => (
                        <a
                          key={`preview-${a.id}`}
                          href={a.url}
                          target="_blank"
                          rel="noreferrer"
                          className="group relative aspect-square overflow-hidden rounded-md border bg-muted"
                        >
                          <img
                            src={a.url}
                            alt={a.name}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          />
                          <span className="absolute inset-x-0 bottom-0 truncate bg-black/50 px-1 py-0.5 text-[10px] text-white">
                            {a.name}
                          </span>
                        </a>
                      ))}
                  </div>
                ) : null}

                <div className="space-y-2">
                  {(task.attachments || []).map((a, index) => (
                    <div
                      key={`${a.id}-${a.name}`}
                      className="flex items-center gap-3 p-2.5 rounded-lg border bg-white"
                    >
                      {isImageAttachment(a) ? (
                        <ImageIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                      ) : (
                        <Paperclip className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">
                          {index + 1}. {a.name}
                        </div>
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
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={index === 0}
                          onClick={() => moveAttachment(index, -1)}
                          aria-label="Mover para cima"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={index === (task.attachments || []).length - 1}
                          onClick={() => moveAttachment(index, 1)}
                          aria-label="Mover para baixo"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </Button>
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
                          onClick={() => requestRemoveAttachment(a)}
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
                      <TabsTrigger value="comments" className="text-xs shrink-0 gap-1">
                        <MessageCircle className="w-3.5 h-3.5" />
                        Comentários
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
                      <TabsTrigger value="dependencies" className="text-xs shrink-0 gap-1">
                        <Link2 className="w-3.5 h-3.5" />
                        Deps
                      </TabsTrigger>
                      <TabsTrigger value="history" className="text-xs shrink-0 gap-1">
                        <History className="w-3.5 h-3.5" />
                        Histórico
                      </TabsTrigger>
                      <TabsTrigger value="more" className="text-xs shrink-0 gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Tempo
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
                            onClick={() => requestRemoveChecklistItem(item)}
                            aria-label="Remover item do checklist"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                      {!(task.checklist || []).length ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Nenhum item no checklist
                        </p>
                      ) : null}
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
                      <div className="flex flex-wrap justify-between items-center gap-2">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                            <AtSign className="w-3 h-3" />
                            Use @ para mencionar
                          </span>
                          <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer">
                            <Switch
                              checked={
                                commentVisibility === COMMENT_VISIBILITY.CLIENT
                              }
                              onCheckedChange={(checked) =>
                                setCommentVisibility(
                                  checked
                                    ? COMMENT_VISIBILITY.CLIENT
                                    : COMMENT_VISIBILITY.INTERNAL
                                )
                              }
                              aria-label="Comentário visível ao cliente"
                            />
                            Visível ao cliente
                          </label>
                        </div>
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
                      {(task.comments || []).map((c) => {
                        const vis = getCommentVisibility(c);
                        return (
                          <div
                            key={c.id}
                            className={`rounded-md border p-3 ${
                              c.type === "system"
                                ? "bg-[var(--color-primary-surface)]/60 border-[#FFD4C8]"
                                : ""
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Avatar className="w-6 h-6">
                                <AvatarFallback className="text-[10px]">
                                  {(c.userName || c.userEmail || "?").charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs font-medium">
                                {c.userName || c.userEmail}
                              </span>
                              {c.type !== "system" ? (
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] h-4 px-1 ${
                                    vis === COMMENT_VISIBILITY.CLIENT
                                      ? "border-teal-300 text-teal-800"
                                      : "border-slate-300 text-slate-600"
                                  }`}
                                >
                                  {vis === COMMENT_VISIBILITY.CLIENT
                                    ? "Cliente"
                                    : "Interno"}
                                </Badge>
                              ) : null}
                              <span className="text-[10px] text-muted-foreground">
                                {c.createdAt
                                  ? new Date(c.createdAt).toLocaleString("pt-BR")
                                  : ""}
                              </span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{c.content}</p>
                          </div>
                        );
                      })}
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

      <AlertDialog
        open={Boolean(pendingRemove)}
        onOpenChange={(v) => {
          if (!v) setPendingRemove(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingRemove?.type === "attachment"
                ? "Remover anexo?"
                : "Remover item do checklist?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRemove?.type === "attachment"
                ? `O arquivo “${pendingRemove?.label}” será removido desta tarefa.`
                : `O item “${pendingRemove?.label}” será removido do checklist.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmPendingRemove}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
