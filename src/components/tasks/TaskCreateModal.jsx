
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Task } from "@/api/entities";
import { Client } from "@/api/entities";
import { Service } from "@/api/entities";
import { User } from "@/api/entities";
import { useSession } from "@/components/auth/SessionManager";
import { Loader2, X, Calendar, User as UserIcon, Flag } from "lucide-react";

export default function TaskCreateModal({ open, onOpenChange, onSuccess }) {
  const { user, agencyId } = useSession();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  
  // Form data
  const [taskData, setTaskData] = React.useState({
    title: "",
    description: "",
    status: "todo",
    priority: "medium",
    type: "analise_documentos",
    clientId: "",
    serviceId: "",
    assignedTo: "",
    dueDate: "",
    estimatedHours: 4
  });

  // Dropdown data
  const [clients, setClients] = React.useState([]);
  const [services, setServices] = React.useState([]);
  const [users, setUsers] = React.useState([]);

  const loadFormData = React.useCallback(async () => {
    try {
      const [clientsData, usersData] = await Promise.all([
        Client.list("-updated_date", 50),
        User.filter({ 
          agencyId, 
          role: { $in: ["owner", "admin", "team"] } 
        }, "-updated_date", 50)
      ]);
      
      setClients(clientsData || []);
      setUsers(usersData || []);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
      setError("Erro ao carregar dados do formulário");
    }
  }, [agencyId]);

  const resetForm = React.useCallback(() => {
    setTaskData({
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      type: "analise_documentos",
      clientId: "",
      serviceId: "",
      assignedTo: "",
      dueDate: "",
      estimatedHours: 4
    });
    setError("");
    setServices([]);
  }, []);

  React.useEffect(() => {
    if (open) {
      loadFormData();
      resetForm();
    }
  }, [open, loadFormData, resetForm]);

  const loadServices = async (clientId) => {
    if (!clientId) {
      setServices([]);
      return;
    }
    
    try {
      const servicesData = await Service.filter({ 
        clientId, 
        is_template: false, 
        is_active: true 
      });
      setServices(servicesData || []);
    } catch (err) {
      console.error("Erro ao carregar serviços:", err);
    }
  };

  const handleClientChange = (clientId) => {
    setTaskData(prev => ({ 
      ...prev, 
      clientId, 
      serviceId: "" // Reset service when client changes
    }));
    loadServices(clientId);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!taskData.title.trim()) {
      setError("Título é obrigatório");
      return;
    }
    
    if (!taskData.clientId) {
      setError("Cliente é obrigatório");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Prepare task payload with correct format
      const taskPayload = {
        agencyId: agencyId,
        clientId: taskData.clientId,
        serviceId: taskData.serviceId || null,
        deliverableId: null, // Tarefa avulsa não tem deliverable
        parentTaskId: null, // Tarefa avulsa não tem parent
        title: taskData.title.trim(),
        description: taskData.description || "",
        status: taskData.status || "todo",
        priority: taskData.priority || "medium",
        type: taskData.type || "analise_documentos",
        assignedTo: taskData.assignedTo || null,
        assignedBy: user?.id || null,
        dueDate: taskData.dueDate ? new Date(taskData.dueDate).toISOString() : null,
        startDate: new Date().toISOString(),
        estimatedHours: Number(taskData.estimatedHours) || 4,
        actualHours: 0,
        progress: 0,
        kanbanColumn: "todo",
        kanbanPosition: 0,
        
        // CRITICAL: Empty arrays for complex fields to avoid validation errors
        dependencies: [], // Tarefa avulsa sem dependências
        blockedBy: [],
        checklist: [],
        comments: [],
        attachments: [],
        timeEntries: [],
        statusHistory: [],
        
        tags: ["avulsa", "manual"],
        
        // Automation settings
        automation: {
          autoAssign: false,
          autoComplete: false,
          notifyOnUpdate: true,
          escalateAfterDays: null,
          blockAutoStart: false,
          dependencyCheckEnabled: false
        },
        
        // Metrics
        metrics: {
          complexity: 5,
          businessValue: 5,
          riskLevel: "medium",
          customerImpact: "medium"
        }
      };

      console.log("Creating task with payload:", taskPayload);

      const createdTask = await Task.create(taskPayload);
      
      console.log("Task created successfully:", createdTask);

      // Success callback
      if (onSuccess) {
        onSuccess(createdTask);
      }
      
      // Close modal
      onOpenChange(false);

    } catch (err) {
      console.error("Erro ao criar tarefa:", err);
      setError(err.message || "Erro ao criar tarefa. Verifique os dados e tente novamente.");
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
            <CardTitle>Nova Tarefa</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
            >
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

            {/* Título */}
            <div>
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={taskData.title}
                onChange={(e) => setTaskData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Digite o título da tarefa"
                required
              />
            </div>

            {/* Descrição */}
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={taskData.description}
                onChange={(e) => setTaskData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descreva a tarefa..."
                rows={3}
              />
            </div>

            {/* Cliente */}
            <div>
              <Label>Cliente *</Label>
              <Select 
                value={taskData.clientId} 
                onValueChange={handleClientChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Serviço (opcional) */}
            <div>
              <Label>Serviço (opcional)</Label>
              <Select 
                value={taskData.serviceId} 
                onValueChange={(value) => setTaskData(prev => ({ ...prev, serviceId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o serviço (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Nenhum serviço</SelectItem>
                  {services.map(service => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Linha: Tipo, Prioridade, Status */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select 
                  value={taskData.type} 
                  onValueChange={(value) => setTaskData(prev => ({ ...prev, type: value }))}
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
                    <SelectItem value="reuniao_alinhamento">Reunião Alinhamento</SelectItem>
                    <SelectItem value="planejamento_estrategico">Planejamento Estratégico</SelectItem>
                    <SelectItem value="implementacao">Implementação</SelectItem>
                    <SelectItem value="treinamento">Treinamento</SelectItem>
                    <SelectItem value="administrativo">Administrativo</SelectItem>
                    <SelectItem value="auditoria">Auditoria</SelectItem>
                    <SelectItem value="consultoria">Consultoria</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="flex items-center gap-1">
                  <Flag className="w-4 h-4" />
                  Prioridade
                </Label>
                <Select 
                  value={taskData.priority} 
                  onValueChange={(value) => setTaskData(prev => ({ ...prev, priority: value }))}
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
                <Label>Status</Label>
                <Select 
                  value={taskData.status} 
                  onValueChange={(value) => setTaskData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="backlog">Backlog</SelectItem>
                    <SelectItem value="todo">A Fazer</SelectItem>
                    <SelectItem value="in_progress">Em Progresso</SelectItem>
                    <SelectItem value="in_review">Em Revisão</SelectItem>
                    <SelectItem value="completed">Concluída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Linha: Responsável, Data, Horas */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="flex items-center gap-1">
                  <UserIcon className="w-4 h-4" />
                  Responsável
                </Label>
                <Select 
                  value={taskData.assignedTo} 
                  onValueChange={(value) => setTaskData(prev => ({ ...prev, assignedTo: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Não atribuído</SelectItem>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Prazo
                </Label>
                <Input
                  type="date"
                  value={taskData.dueDate}
                  onChange={(e) => setTaskData(prev => ({ ...prev, dueDate: e.target.value }))}
                />
              </div>

              <div>
                <Label>Horas Estimadas</Label>
                <Input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={taskData.estimatedHours}
                  onChange={(e) => setTaskData(prev => ({ ...prev, estimatedHours: Number(e.target.value) || 4 }))}
                />
              </div>
            </div>

            {/* Botões */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading || !taskData.title.trim() || !taskData.clientId}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  'Criar Tarefa'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
