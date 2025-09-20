import React from "react";
import { Task } from "@/api/entities";
import { User } from "@/api/entities";
import { Client } from "@/api/entities";
import { ClientDocument } from "@/api/entities";
import { Notification } from "@/api/entities";
import { UploadPrivateFile } from "@/api/integrations";
import { useSession } from "@/components/auth/SessionManager";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Loader2, Calendar, Paperclip, CheckSquare, X, Send, 
  User as UserIcon, AlertCircle, MessageCircle, Clock,
  Flag, Eye, Hash, AtSign, Check, Save, ExternalLink,
  Building2, ArrowRight, Zap, MoreVertical, Edit, Trash2, Plus
} from "lucide-react";
// import ReactQuill from "react-quill"; // Removido - não instalado
import { toast } from "sonner";

// Status mapping para o Kanban
const STATUS_CONFIG = {
  backlog: { label: 'Backlog', color: 'bg-gray-100 text-gray-800', kanbanColor: 'bg-gray-500' },
  todo: { label: 'A Fazer', color: 'bg-blue-100 text-blue-800', kanbanColor: 'bg-blue-500' },
  in_progress: { label: 'Em Progresso', color: 'bg-yellow-100 text-yellow-800', kanbanColor: 'bg-yellow-500' },
  in_review: { label: 'Em Revisão', color: 'bg-purple-100 text-purple-800', kanbanColor: 'bg-purple-500' },
  completed: { label: 'Concluído', color: 'bg-green-100 text-green-800', kanbanColor: 'bg-green-500' },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800', kanbanColor: 'bg-red-500' },
  blocked: { label: 'Bloqueado', color: 'bg-orange-100 text-orange-800', kanbanColor: 'bg-orange-500' }
};

const PRIORITY_CONFIG = {
  low: { label: 'Baixa', color: 'bg-blue-100 text-blue-800' },
  medium: { label: 'Média', color: 'bg-yellow-100 text-yellow-800' },
  high: { label: 'Alta', color: 'bg-orange-100 text-orange-800' },
  urgent: { label: 'Urgente', color: 'bg-red-100 text-red-800' }
};

export default function TaskDrawer() {
  const { user } = useSession();
  const [open, setOpen] = React.useState(false);
  const [taskId, setTaskId] = React.useState(null);
  const [task, setTask] = React.useState(null);
  const [client, setClient] = React.useState(null);
  const [users, setUsers] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [descHTML, setDescHTML] = React.useState("");
  const [assignee, setAssignee] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");
  const [priority, setPriority] = React.useState("medium");
  const [currentStatus, setCurrentStatus] = React.useState("todo");
  const [commentText, setCommentText] = React.useState("");
  const [commentSending, setCommentSending] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [activeTab, setActiveTab] = React.useState("details");
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);

  // Estados para checklist avançado
  const [newChecklistItem, setNewChecklistItem] = React.useState("");
  const [checklistItemAssignee, setChecklistItemAssignee] = React.useState("");
  const [checklistItemDueDate, setChecklistItemDueDate] = React.useState("");
  const [editingItemId, setEditingItemId] = React.useState(null);
  const [editingItemText, setEditingItemText] = React.useState("");
  const [editingItemAssignee, setEditingItemAssignee] = React.useState("");
  const [editingItemDueDate, setEditingItemDueDate] = React.useState("");

  const firstFieldRef = React.useRef(null);

  // Listener global: abrir drawer
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
    setHasUnsavedChanges(false);
    
    try {
      const [t, us] = await Promise.all([
        Task.get(id),
        User.list("-updated_date", 100)
      ]);

      setTask(t);
      setUsers(us || []);
      setDescHTML(t.description || "");
      setAssignee(t.assignedTo || "");
      setDueDate(t.dueDate ? t.dueDate.split("T")[0] : "");
      setPriority(t.priority || "medium");
      setCurrentStatus(t.status || "todo");

      // Carregar dados do cliente
      if (t.clientId) {
        try {
          const clientData = await Client.get(t.clientId);
          setClient(clientData);
        } catch (clientError) {
          console.warn("Não foi possível carregar dados do cliente:", clientError);
          setClient(null);
        }
      } else {
        setClient(null);
      }

      // Auto-focus no primeiro campo após carregar
      setTimeout(() => {
        try {
          if (firstFieldRef.current) firstFieldRef.current.focus();
        } catch {}
      }, 100);
      
    } catch (e) {
      setError("Não foi possível carregar a tarefa. Tente novamente.");
      console.error("Erro ao carregar tarefa:", e);
    } finally {
      setLoading(false);
    }
  };

  const closeDrawer = () => {
    if (hasUnsavedChanges) {
      const confirmClose = window.confirm("Você tem alterações não salvas. Deseja realmente fechar?");
      if (!confirmClose) return;
    }
    
    setOpen(false);
    setTaskId(null);
    setTask(null);
    setClient(null);
    setError("");
    setUploadProgress(0);
    setUploading(false);
    setCommentText("");
    setActiveTab("details");
    setHasUnsavedChanges(false);
    
    // Reset checklist states
    setNewChecklistItem("");
    setChecklistItemAssignee("");
    setChecklistItemDueDate("");
    setEditingItemId(null);
    setEditingItemText("");
    setEditingItemAssignee("");
    setEditingItemDueDate("");
  };

  // Detectar mudanças nos campos
  React.useEffect(() => {
    if (!task) return;
    
    const hasChanges = 
      descHTML !== (task.description || "") ||
      assignee !== (task.assignedTo || "") ||
      dueDate !== (task.dueDate ? task.dueDate.split("T")[0] : "") ||
      priority !== (task.priority || "medium") ||
      currentStatus !== (task.status || "todo");
      
    setHasUnsavedChanges(hasChanges);
  }, [task, descHTML, assignee, dueDate, priority, currentStatus]);

  // Função para mudança rápida de status
  const handleQuickStatusChange = async (newStatus) => {
    if (!task || newStatus === currentStatus) return;
    
    setSaving(true);
    setError("");
    
    try {
      const payload = { 
        status: newStatus,
        kanbanColumn: newStatus
      };
      
      if (newStatus === 'completed') {
        payload.completedAt = new Date().toISOString();
        payload.actualHours = task.actualHours || task.estimatedHours || 0;
        payload.progress = 100;
      } else if (task.status === 'completed' && newStatus !== 'completed') {
        payload.completedAt = null;
        payload.actualHours = null;
        payload.progress = 0;
      }

      const updated = await Task.update(task.id, payload);
      setTask(updated);
      setCurrentStatus(newStatus);
      setHasUnsavedChanges(false);

      const statusLabel = STATUS_CONFIG[newStatus]?.label || newStatus;
      toast.success(`Tarefa movida para "${statusLabel}"`, {
        description: `${task.title} foi atualizada com sucesso`,
        duration: 3000
      });

      const systemComment = {
        id: `sys_${Date.now()}`,
        userId: user.id,
        userEmail: user.email,
        userName: user.full_name || user.email,
        content: `Status alterado para: ${statusLabel}`,
        type: 'system',
        createdAt: new Date().toISOString()
      };
      
      const updatedWithComment = await Task.update(task.id, {
        comments: [...(updated.comments || []), systemComment]
      });
      setTask(updatedWithComment);

      window.dispatchEvent(new CustomEvent('task:updated', { 
        detail: { taskId: task.id, status: newStatus } 
      }));

    } catch (e) {
      setError("Falha ao alterar status. Tente novamente.");
      console.error("Erro ao alterar status:", e);
      toast.error("Erro ao alterar status da tarefa");
    } finally {
      setSaving(false);
    }
  };

  const handleMarkCompleted = () => {
    handleQuickStatusChange('completed');
  };

  const saveEdits = async () => {
    if (!task) return;
    setSaving(true);
    setError("");
    
    try {
      const payload = {
        description: descHTML,
        assignedTo: assignee || null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        priority: priority || "medium",
        status: currentStatus
      };
      
      const updated = await Task.update(task.id, payload);
      setTask(updated);
      setHasUnsavedChanges(false);

      toast.success("Tarefa salva com sucesso!", {
        description: "Todas as alterações foram aplicadas",
        duration: 2000
      });

      const changes = [];
      if (task.assignedTo !== assignee) {
        const newUser = users.find(u => u.id === assignee);
        const oldUser = users.find(u => u.id === task.assignedTo);
        changes.push(`Responsável: ${oldUser?.full_name || 'Sem responsável'} → ${newUser?.full_name || 'Sem responsável'}`);
      }
      if (task.priority !== priority) {
        changes.push(`Prioridade: ${PRIORITY_CONFIG[task.priority]?.label || task.priority} → ${PRIORITY_CONFIG[priority]?.label || priority}`);
      }
      if ((task.dueDate ? task.dueDate.split("T")[0] : "") !== dueDate) {
        const oldDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString('pt-BR') : 'Sem prazo';
        const newDate = payload.dueDate ? new Date(payload.dueDate).toLocaleDateString('pt-BR') : 'Sem prazo';
        changes.push(`Prazo: ${oldDate} → ${newDate}`);
      }
      
      if (changes.length > 0) {
        const systemComment = {
          id: `sys_${Date.now()}`,
          userId: user.id,
          userEmail: user.email,
          userName: user.full_name || user.email,
          content: changes.join('\n'),
          type: 'system',
          createdAt: new Date().toISOString()
        };
        
        const updatedWithComment = await Task.update(task.id, {
          comments: [...(updated.comments || []), systemComment]
        });
        setTask(updatedWithComment);
      }

    } catch (e) {
      setError("Falha ao salvar alterações. Tente novamente.");
      console.error("Erro ao salvar:", e);
      toast.error("Erro ao salvar alterações");
    } finally {
      setSaving(false);
    }
  };

  // NOVO: Funções do Checklist Avançado
  const addChecklistItem = async () => {
    if (!task || !newChecklistItem.trim()) return;
    
    try {
      const checklist = Array.isArray(task.checklist) ? [...task.checklist] : [];
      const newItem = {
        id: `checklist_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        text: newChecklistItem.trim(),
        completed: false,
        order: checklist.length,
        required: false,
        evidenceRequired: false,
        evidenceUrls: [],
        assignedTo: checklistItemAssignee || null,
        dueDate: checklistItemDueDate ? new Date(checklistItemDueDate).toISOString() : null
      };

      checklist.push(newItem);
      const updated = await Task.update(task.id, { checklist });
      setTask(updated);

      // Reset form
      setNewChecklistItem("");
      setChecklistItemAssignee("");
      setChecklistItemDueDate("");

      toast.success("Item adicionado ao checklist!");
    } catch (e) {
      console.error("Erro ao adicionar item:", e);
      toast.error("Erro ao adicionar item ao checklist");
    }
  };

  const toggleChecklistItem = async (itemId) => {
    if (!task) return;
    
    try {
      const checklist = Array.isArray(task.checklist) ? [...task.checklist] : [];
      const itemIndex = checklist.findIndex(item => item.id === itemId);
      if (itemIndex === -1) return;

      const now = new Date().toISOString();
      checklist[itemIndex] = {
        ...checklist[itemIndex],
        completed: !checklist[itemIndex].completed,
        completedAt: !checklist[itemIndex].completed ? now : null,
        completedBy: !checklist[itemIndex].completed ? user.id : null,
        completedByName: !checklist[itemIndex].completed ? (user.full_name || user.email) : null
      };

      const updated = await Task.update(task.id, { checklist });
      setTask(updated);

      toast.success(checklist[itemIndex].completed ? "Item marcado como concluído!" : "Item desmarcado");
    } catch (e) {
      console.error("Erro ao atualizar item:", e);
      toast.error("Erro ao atualizar item do checklist");
    }
  };

  const startEditingItem = (item) => {
    setEditingItemId(item.id);
    setEditingItemText(item.text);
    setEditingItemAssignee(item.assignedTo || "");
    setEditingItemDueDate(item.dueDate ? item.dueDate.split("T")[0] : "");
  };

  const saveEditingItem = async () => {
    if (!task || !editingItemId || !editingItemText.trim()) return;
    
    try {
      const checklist = Array.isArray(task.checklist) ? [...task.checklist] : [];
      const itemIndex = checklist.findIndex(item => item.id === editingItemId);
      if (itemIndex === -1) return;

      checklist[itemIndex] = {
        ...checklist[itemIndex],
        text: editingItemText.trim(),
        assignedTo: editingItemAssignee || null,
        dueDate: editingItemDueDate ? new Date(editingItemDueDate).toISOString() : null
      };

      const updated = await Task.update(task.id, { checklist });
      setTask(updated);

      setEditingItemId(null);
      setEditingItemText("");
      setEditingItemAssignee("");
      setEditingItemDueDate("");

      toast.success("Item atualizado!");
    } catch (e) {
      console.error("Erro ao editar item:", e);
      toast.error("Erro ao editar item do checklist");
    }
  };

  const cancelEditingItem = () => {
    setEditingItemId(null);
    setEditingItemText("");
    setEditingItemAssignee("");
    setEditingItemDueDate("");
  };

  const deleteChecklistItem = async (itemId) => {
    if (!task) return;
    
    try {
      const checklist = Array.isArray(task.checklist) ? [...task.checklist] : [];
      const filteredChecklist = checklist.filter(item => item.id !== itemId);
      
      const updated = await Task.update(task.id, { checklist: filteredChecklist });
      setTask(updated);

      toast.success("Item removido do checklist");
    } catch (e) {
      console.error("Erro ao deletar item:", e);
      toast.error("Erro ao remover item do checklist");
    }
  };

  // Upload via drag and drop
  const onDrop = async (ev) => {
    ev.preventDefault();
    if (!task) return;
    const files = ev.dataTransfer?.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadProgress(5);

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      try {
        setUploadProgress(15 + (i * 40));
        
        const buf = await f.arrayBuffer();
        const uint = new Uint8Array(buf);

        const { file_uri } = await UploadPrivateFile({ file: uint });

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
            fileUrl: file_uri,
            fileType: f.type || "application/octet-stream",
            fileSize: f.size || uint.length,
            version: "1.0",
            visibility: "internal",
            status: "approved",
            metadata: { attached_to_task: task.id },
            uploadedBy: user.id
          });
        }

        const attachments = Array.isArray(task.attachments) ? [...task.attachments] : [];
        attachments.unshift({
          id: `att_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          name: f.name,
          url: file_uri,
          type: "document",
          mimeType: f.type || "application/octet-stream",
          size: f.size || uint.length,
          uploadedBy: user.id,
          uploadedByName: user.full_name || user.email,
          uploadedAt: new Date().toISOString(),
          description: f.name,
          isEvidence: false
        });
        
        const updated = await Task.update(task.id, { attachments });
        setTask(updated);
        
        setUploadProgress(90 + (i * 5));
        toast.success(`Arquivo ${f.name} anexado com sucesso!`);
      } catch (e) {
        console.error("Upload error:", e);
        setError(`Falha ao anexar ${f.name}. Tente novamente.`);
        toast.error(`Falha ao anexar ${f.name}.`);
      }
    }
    
    setUploadProgress(100);
    setTimeout(() => {
      setUploadProgress(0);
      setUploading(false);
    }, 1000);
  };

  const onDragOver = (ev) => {
    ev.preventDefault();
  };

  const submitComment = async () => {
    if (!task || !commentText.trim()) return;
    setCommentSending(true);
    setError("");
    
    try {
      const comments = Array.isArray(task.comments) ? [...task.comments] : [];
      
      const mentions = [];
      const mentionRegex = /@(\w+)/g;
      let match;
      while ((match = mentionRegex.exec(commentText)) !== null) {
        const mentionedUsername = match[1];
        const mentionedUser = users.find(u => 
          u.full_name?.toLowerCase().includes(mentionedUsername.toLowerCase()) ||
          u.email?.toLowerCase().includes(mentionedUsername.toLowerCase())
        );
        if (mentionedUser && !mentions.includes(mentionedUser.id)) {
          mentions.push(mentionedUser.id);
        }
      }
      
      const newComment = {
        id: `c_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        userId: user.id,
        userEmail: user.email,
        userName: user.full_name || user.email,
        content: commentText.trim(),
        type: "comment",
        mentions: mentions,
        attachments: [],
        createdAt: new Date().toISOString(),
        isEdited: false
      };
      
      comments.unshift(newComment);
      const updated = await Task.update(task.id, { comments });
      setTask(updated);

      for (const mentionedUserId of mentions) {
        try {
          await Notification.create({
            agencyId: task.agencyId,
            userId: mentionedUserId,
            type: "task_mentioned",
            subject: { type: "task", id: task.id },
            title: `Você foi mencionado em "${task.title}"`,
            context: commentText.length > 180 ? commentText.slice(0, 180) + "..." : commentText,
            href: `/tasks-manager?taskId=${task.id}`,
            severity: "info"
          });
        } catch (_) {
          // tolerante a falha de notificação
        }
      }

      if (task.assignedTo && task.assignedTo !== user.id && !mentions.includes(task.assignedTo)) {
        try {
          await Notification.create({
            agencyId: task.agencyId,
            userId: task.assignedTo,
            type: "task_commented",
            subject: { type: "task", id: task.id },
            title: `Novo comentário em "${task.title}"`,
            context: commentText.length > 180 ? commentText.slice(0, 180) + "..." : commentText,
            href: `/tasks-manager?taskId=${task.id}`,
            severity: "info"
          });
        } catch (_) {
          // tolerante a falha
        }
      }

      setCommentText("");
      toast.success("Comentário enviado!");
      
    } catch (e) {
      setError("Não foi possível enviar o comentário. Tente novamente.");
      toast.error("Erro ao enviar comentário.");
    } finally {
      setCommentSending(false);
    }
  };

  const progressChecklist = React.useMemo(() => {
    const list = Array.isArray(task?.checklist) ? task.checklist : [];
    if (list.length === 0) return 0;
    const done = list.filter((c) => c.completed).length;
    return Math.round((done / list.length) * 100);
  }, [task]);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Não definida';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return 'Data inválida';
    }
  };

  const getAssignedUser = (userId) => {
    return users.find(u => u.id === userId);
  };

  return (
    <Sheet open={open} onOpenChange={(v) => v ? setOpen(true) : closeDrawer()}>
      <SheetContent side="right" className="w-full sm:max-w-3xl flex flex-col">
        {/* Cabeçalho Contextual Dinâmico */}
        <SheetHeader className="border-b pb-4 px-6 pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Contexto da Tarefa */}
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {client && (
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                    <Building2 className="w-3 h-3 mr-1" />
                    {client.name}
                  </Badge>
                )}
                
                <Badge className={`text-xs ${STATUS_CONFIG[currentStatus]?.color || 'bg-gray-100 text-gray-800'}`}>
                  <div className={`w-2 h-2 rounded-full mr-1 ${STATUS_CONFIG[currentStatus]?.kanbanColor || 'bg-gray-500'}`} />
                  {STATUS_CONFIG[currentStatus]?.label || currentStatus}
                </Badge>

                {task && (
                  <Badge className={`text-xs ${PRIORITY_CONFIG[priority]?.color || 'bg-gray-100 text-gray-800'}`}>
                    <Flag className="w-3 h-3 mr-1" />
                    {PRIORITY_CONFIG[priority]?.label || priority}
                  </Badge>
                )}

                {task?.id && (
                  <Badge variant="outline" className="text-xs font-mono">
                    #{task.id.slice(-8)}
                  </Badge>
                )}
              </div>

              {/* Título */}
              <SheetTitle className="text-xl font-semibold leading-tight pr-4">
                {task ? task.title : "Carregando tarefa..."}
              </SheetTitle>

              {/* Ações Rápidas de Status */}
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700 sr-only sm:not-sr-only">Status:</label>
                  <Select value={currentStatus} onValueChange={handleQuickStatusChange} disabled={saving}>
                    <SelectTrigger className="w-auto min-w-[120px] h-8 text-xs sm:w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key} className="text-xs">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${config.kanbanColor}`} />
                            {config.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {currentStatus !== 'completed' && (
                  <Button 
                    size="sm" 
                    onClick={handleMarkCompleted} 
                    disabled={saving}
                    className="bg-green-600 hover:bg-green-700 text-white h-8 px-3 text-xs"
                  >
                    {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Check className="w-3 h-3 mr-1" />}
                    Concluir
                  </Button>
                )}
              </div>
            </div>

            {/* Metadados Laterais */}
            <div className="text-right text-xs text-muted-foreground space-y-1 min-w-[120px]">
              {task?.dueDate && (
                <div className="flex items-center gap-1 justify-end">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(task.dueDate)}</span>
                </div>
              )}
              {task?.estimatedHours && (
                <div className="flex items-center gap-1 justify-end">
                  <Clock className="w-3 h-3" />
                  <span>{task.estimatedHours}h estimadas</span>
                </div>
              )}
              {getAssignedUser(task?.assignedTo) && (
                <div className="flex items-center gap-1 justify-end">
                  <Avatar className="w-4 h-4">
                    <AvatarFallback className="text-xs">
                      {getAssignedUser(task.assignedTo).full_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span>{getAssignedUser(task.assignedTo).full_name || getAssignedUser(task.assignedTo).email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Indicador de Mudanças Não Salvas */}
          {hasUnsavedChanges && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-2 mt-3">
              <div className="flex items-center gap-2 text-yellow-800">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">Você tem alterações não salvas</span>
              </div>
            </div>
          )}
        </SheetHeader>

        {/* Loading/Error States */}
        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
              <p className="text-gray-600">Carregando detalhes da tarefa...</p>
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center max-w-md space-y-4">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
              <h3 className="text-lg font-semibold text-gray-900">Erro ao carregar</h3>
              <p className="text-gray-600">{error}</p>
              <Button onClick={() => fetchAll(taskId)} className="gap-2">
                <Loader2 className="w-4 h-4" />
                Tentar novamente
              </Button>
            </div>
          </div>
        )}

        {/* Content Area com Scroll Independente */}
        {!loading && task && (
          <>
            <div className="flex-1 overflow-hidden px-6 pt-4">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="details" className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    <span className="hidden sm:inline">Detalhes</span>
                  </TabsTrigger>
                  <TabsTrigger value="checklist" className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4" />
                    <span className="hidden sm:inline">Checklist</span>
                    {task.checklist?.length > 0 && (
                      <Badge variant="secondary" className="text-xs h-4 px-1 ml-1">
                        {progressChecklist}%
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="comments" className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    <span className="hidden sm:inline">Comentários</span>
                    {task.comments?.length > 0 && (
                      <Badge variant="secondary" className="text-xs h-4 px-1 ml-1">
                        {task.comments.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                {/* Tabs Content com Scroll */}
                <div className="flex-1 overflow-y-auto pr-2 -mr-2">
                  <TabsContent value="details" className="space-y-4 pb-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Descrição</label>
                      <Textarea
                        ref={firstFieldRef}
                        value={descHTML}
                        onChange={(e) => setDescHTML(e.target.value)}
                        placeholder="Descreva a tarefa..."
                        rows={4}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-1 block flex items-center gap-1">
                          <UserIcon className="w-4 h-4" />Responsável
                        </label>
                        <Select value={assignee || ""} onValueChange={setAssignee}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60 overflow-auto">
                            <SelectItem value={null}>Sem responsável</SelectItem>
                            {users.filter(u => ["owner", "admin", "team"].includes(u.role)).map(u => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.full_name || u.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-1 block flex items-center gap-1">
                          <Calendar className="w-4 h-4" />Prazo
                        </label>
                        <Input 
                          type="date" 
                          value={dueDate} 
                          onChange={(e) => setDueDate(e.target.value)} 
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-1 block flex items-center gap-1">
                          <Flag className="w-4 h-4" />Prioridade
                        </label>
                        <Select value={priority} onValueChange={setPriority}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                              <SelectItem key={key} value={key}>
                                {config.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Checklist Avançado */}
                  <TabsContent value="checklist" className="space-y-4 pb-4">
                    {/* Barra de Progresso */}
                    {task.checklist?.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Progresso</span>
                          <Badge variant="secondary" className="text-sm">
                            {task.checklist.filter(c => c.completed).length}/{task.checklist.length} ({progressChecklist}%)
                          </Badge>
                        </div>
                        <Progress value={progressChecklist} className="w-full" />
                      </div>
                    )}

                    {/* Formulário de Adicionar Item */}
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Input
                            value={newChecklistItem}
                            onChange={(e) => setNewChecklistItem(e.target.value)}
                            placeholder="Adicionar item ao checklist..."
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addChecklistItem();
                              }
                            }}
                            className="flex-1"
                          />
                          <Button
                            size="sm"
                            onClick={addChecklistItem}
                            disabled={!newChecklistItem.trim()}
                            className="px-3"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                          <div className="flex items-center gap-1">
                            <UserIcon className="w-3 h-3" />
                            <Select 
                              value={checklistItemAssignee} 
                              onValueChange={setChecklistItemAssignee}
                            >
                              <SelectTrigger className="h-7 w-32 text-xs">
                                <SelectValue placeholder="Responsável" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={null}>Nenhum</SelectItem>
                                {users.filter(u => ["owner", "admin", "team"].includes(u.role)).map(u => (
                                  <SelectItem key={u.id} value={u.id} className="text-xs">
                                    {u.full_name || u.email}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <Input
                              type="date"
                              value={checklistItemDueDate}
                              onChange={(e) => setChecklistItemDueDate(e.target.value)}
                              className="h-7 w-32 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Lista de Itens */}
                    <div className="space-y-2">
                      {(task.checklist || []).map(item => (
                        <div key={item.id} className="border rounded p-3 hover:bg-gray-50">
                          {editingItemId === item.id ? (
                            // Modo de edição
                            <div className="space-y-3">
                              <Input
                                value={editingItemText}
                                onChange={(e) => setEditingItemText(e.target.value)}
                                className="text-sm"
                                autoFocus
                              />
                              
                              <div className="flex items-center gap-2">
                                <Select 
                                  value={editingItemAssignee} 
                                  onValueChange={setEditingItemAssignee}
                                >
                                  <SelectTrigger className="h-8 w-40 text-xs">
                                    <SelectValue placeholder="Responsável" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={null}>Nenhum</SelectItem>
                                    {users.filter(u => ["owner", "admin", "team"].includes(u.role)).map(u => (
                                      <SelectItem key={u.id} value={u.id} className="text-xs">
                                        {u.full_name || u.email}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>

                                <Input
                                  type="date"
                                  value={editingItemDueDate}
                                  onChange={(e) => setEditingItemDueDate(e.target.value)}
                                  className="h-8 w-40 text-xs"
                                />
                              </div>

                              <div className="flex justify-end gap-2">
                                <Button size="sm" variant="outline" onClick={cancelEditingItem}>
                                  Cancelar
                                </Button>
                                <Button size="sm" onClick={saveEditingItem}>
                                  Salvar
                                </Button>
                              </div>
                            </div>
                          ) : (
                            // Modo de visualização
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3 flex-1">
                                <input
                                  type="checkbox"
                                  className="mt-1"
                                  checked={!!item.completed}
                                  onChange={() => toggleChecklistItem(item.id)}
                                />
                                <div className="flex-1">
                                  <span className={item.completed ? "line-through text-gray-500" : ""}>
                                    {item.text}
                                  </span>
                                  
                                  {/* Detalhes do item */}
                                  <div className="flex items-center gap-3 mt-1">
                                    {item.assignedTo && (
                                      <div className="flex items-center gap-1 text-xs text-gray-600">
                                        <Avatar className="w-4 h-4">
                                          <AvatarFallback className="text-xs">
                                            {getAssignedUser(item.assignedTo)?.full_name?.charAt(0) || '?'}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span>{getAssignedUser(item.assignedTo)?.full_name || getAssignedUser(item.assignedTo)?.email}</span>
                                      </div>
                                    )}
                                    
                                    {item.dueDate && (
                                      <div className="flex items-center gap-1 text-xs text-gray-600">
                                        <Calendar className="w-3 h-3" />
                                        <span>{new Date(item.dueDate).toLocaleDateString('pt-BR')}</span>
                                      </div>
                                    )}
                                  </div>

                                  {item.completed && item.completedByName && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      Concluído por {item.completedByName} em {formatDate(item.completedAt)}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => startEditingItem(item)}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => deleteChecklistItem(item.id)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}
                        </div>
                      ))}

                      {(!task.checklist || task.checklist.length === 0) && (
                        <div className="text-center py-8 text-gray-500">
                          <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p>Nenhum item no checklist</p>
                          <p className="text-sm">Adicione itens para quebrar esta tarefa em passos menores</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* Comentários Tab */}
                  <TabsContent value="comments" className="space-y-4 pb-4">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Textarea
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="Escreva um comentário... Use @nome para mencionar alguém"
                          rows={3}
                        />
                        <div className="flex justify-between items-center">
                          <div className="text-xs text-gray-500">
                            <AtSign className="w-3 h-3 inline mr-1" />
                            Use @ para mencionar pessoas
                          </div>
                          <Button 
                            size="sm" 
                            onClick={submitComment} 
                            disabled={commentSending || !commentText.trim()} 
                            className="gap-2"
                          >
                            {commentSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            {commentSending ? "Enviando..." : "Enviar"}
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        {(task.comments || []).map(c => (
                          <div key={c.id} className={`border rounded p-3 ${c.type === 'system' ? 'bg-blue-50 border-blue-200' : 'bg-white'}`}>
                            <div className="flex items-start gap-3">
                              <Avatar className="w-8 h-8">
                                <AvatarFallback className="text-xs">
                                  {c.userName?.charAt(0) || c.userEmail?.charAt(0) || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium">{c.userName || c.userEmail}</span>
                                  <span className="text-xs text-gray-500">
                                    {new Date(c.createdAt || task.updated_date || Date.now()).toLocaleString('pt-BR')}
                                  </span>
                                  {c.type === 'system' && (
                                    <Badge variant="outline" className="text-xs">Sistema</Badge>
                                  )}
                                </div>
                                <div className="text-sm whitespace-pre-wrap">{c.content}</div>
                                {c.mentions?.length > 0 && (
                                  <div className="mt-2 text-xs text-blue-600">
                                    Mencionou: {c.mentions.map(id => {
                                      const user = users.find(u => u.id === id);
                                      return user?.full_name || user?.email || id;
                                    }).join(', ')}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        {(!task.comments || task.comments.length === 0) && (
                          <div className="text-center py-8 text-gray-500">
                            <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p>Nenhum comentário ainda</p>
                            <p className="text-sm">Inicie uma conversa sobre esta tarefa</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  {/* Anexos (drag and drop zone) */}
                  <div 
                    onDrop={onDrop} 
                    onDragOver={onDragOver} 
                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors mt-6"
                  >
                    <Paperclip className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-gray-600 mb-1">Arraste arquivos aqui para anexar</p>
                    <p className="text-sm text-gray-500">ou clique para selecionar</p>
                    
                    {uploading && (
                      <div className="mt-4">
                        <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Enviando... {uploadProgress}%
                        </div>
                        <Progress value={uploadProgress} className="w-full mt-2" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 mt-4">
                    {(task.attachments || []).map(a => (
                      <div key={`${a.id}-${a.name}`} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          <Paperclip className="w-4 h-4 text-gray-500" />
                          <div>
                            <div className="text-sm font-medium">{a.name}</div>
                            <div className="text-xs text-gray-500">
                              {a.uploadedByName} • {new Date(a.uploadedAt).toLocaleDateString('pt-BR')}
                              {a.size && ` • ${(a.size / 1024 / 1024).toFixed(1)} MB`}
                            </div>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <a href={a.url} target="_blank" rel="noreferrer" className="gap-2">
                            <Eye className="w-4 h-4" />
                            Ver
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </Tabs>
            </div>

            {/* Rodapé Fixo com Ações */}
            <div className="border-t bg-white p-4 px-6 mt-auto">
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  <span>Tarefa #{task.id?.slice(-8)}</span>
                  <span>•</span>
                  <span>ESC para fechar</span>
                  {hasUnsavedChanges && (
                    <>
                      <span>•</span>
                      <span className="text-yellow-600 font-medium">Alterações pendentes</span>
                    </>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    onClick={closeDrawer}
                    className="text-sm"
                  >
                    Fechar
                  </Button>
                  
                  <Button 
                    onClick={saveEdits} 
                    disabled={saving || !hasUnsavedChanges} 
                    className="gap-2 text-sm"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {saving ? "Salvando..." : hasUnsavedChanges ? "Salvar" : "Salvo"}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}