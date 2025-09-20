
import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { NotificationTemplate } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Bell, Mail, Smartphone, Webhook, Plus, Edit, Trash2,
  Save, Eye, EyeOff, Settings, Clock, CheckCircle,
  AlertTriangle, Target, Play, Info
} from 'lucide-react';
import { toast } from 'sonner';

const EVENT_TYPES = {
  StageStarted: {
    label: 'Etapa Iniciada',
    description: 'Quando uma etapa/deliverable é iniciada',
    icon: Play,
    color: 'blue',
    variables: ['client_name', 'service_name', 'stage_name', 'estimated_duration', 'team_member']
  },
  StageCompleted: {
    label: 'Etapa Concluída',
    description: 'Quando uma etapa/deliverable é concluída',
    icon: CheckCircle,
    color: 'green',
    variables: ['client_name', 'service_name', 'stage_name', 'completion_date', 'next_stage']
  },
  TaskDueSoon: {
    label: 'Tarefa Vencendo',
    description: 'Quando uma tarefa está próxima do prazo',
    icon: Clock,
    color: 'yellow',
    variables: ['client_name', 'task_title', 'due_date', 'assignee', 'priority']
  },
  ApprovalRequested: {
    label: 'Aprovação Solicitada',
    description: 'Quando aprovação é solicitada ao cliente',
    icon: AlertTriangle,
    color: 'purple',
    variables: ['client_name', 'deliverable_name', 'approval_url', 'deadline', 'description']
  },
  ApprovalResolved: {
    label: 'Aprovação Resolvida',
    description: 'Quando aprovação é aprovada/rejeitada',
    icon: Target,
    color: 'indigo',
    variables: ['client_name', 'deliverable_name', 'status', 'comment', 'resolved_by']
  }
};

const CHANNEL_TYPES = {
  email: { label: 'Email', icon: Mail, color: 'blue' },
  in_app: { label: 'In-App', icon: Bell, color: 'purple' },
  sms: { label: 'SMS', icon: Smartphone, color: 'green' },
  webhook: { label: 'Webhook', icon: Webhook, color: 'orange' }
};

const RECIPIENT_TYPES = {
  client: 'Cliente',
  team: 'Equipe',
  assignee: 'Responsável',
  admin: 'Administrador',
  custom: 'Customizado'
};

const PRIORITY_LEVELS = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente'
};

export default function NotificationTemplateEditor({ serviceId = null, deliverableId = null }) {
  const { user } = useSession();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState('StageStarted');
  const [selectedChannel, setSelectedChannel] = useState('email');

  const [formData, setFormData] = useState({
    event: 'StageStarted',
    channel: 'email',
    is_enabled: true,
    recipient_type: 'client',
    custom_recipients: [],
    priority: 'medium',
    subject: '',
    body: '',
    variables: [],
    conditions: {},
    schedule: {
      delay_minutes: 0,
      send_at: 'immediate',
      custom_time: '',
      retry_attempts: 3
    }
  });

  const loadTemplates = useCallback(async () => {
    if (!user?.data?.agencyId) return;

    try {
      setLoading(true);

      const filters = {
        agencyId: user.data.agencyId,
        is_enabled: true
      };

      if (serviceId) filters.serviceId = serviceId;
      if (deliverableId) filters.deliverable_id = deliverableId;

      const templatesData = await NotificationTemplate.filter(filters, '-created_date');
      setTemplates(templatesData || []);
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
      toast.error('Erro ao carregar templates de notificação');
    } finally {
      setLoading(false);
    }
  }, [serviceId, deliverableId, user?.data?.agencyId]); // Added dependencies for useCallback

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]); // Updated dependency array to include loadTemplates

  const handleSaveTemplate = async () => {
    if (!formData.subject || !formData.body) {
      toast.error('Assunto e corpo da mensagem são obrigatórios');
      return;
    }

    try {
      const templateData = {
        ...formData,
        agencyId: user.data.agencyId,
        serviceId: serviceId || null,
        deliverable_id: deliverableId || null,
        variables: EVENT_TYPES[formData.event]?.variables || [],
        template_type: serviceId ? 'service_specific' : 'custom',
        metadata: {
          created_by: user.email,
          version: '1.0',
          usage_count: 0
        }
      };

      if (editingTemplate) {
        await NotificationTemplate.update(editingTemplate.id, templateData);
        toast.success('Template atualizado com sucesso');
      } else {
        await NotificationTemplate.create(templateData);
        toast.success('Template criado com sucesso');
      }

      setEditingTemplate(null);
      setIsCreating(false);
      loadTemplates();
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar template:', error);
      toast.error('Erro ao salvar template');
    }
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setFormData({
      event: template.event,
      channel: template.channel,
      is_enabled: template.is_enabled,
      recipient_type: template.recipient_type,
      custom_recipients: template.custom_recipients || [],
      priority: template.priority,
      subject: template.subject,
      body: template.body,
      variables: template.variables || [],
      conditions: template.conditions || {},
      schedule: template.schedule || {
        delay_minutes: 0,
        send_at: 'immediate',
        custom_time: '',
        retry_attempts: 3
      }
    });
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!confirm('Tem certeza que deseja excluir este template?')) return;

    try {
      await NotificationTemplate.delete(templateId);
      toast.success('Template excluído com sucesso');
      loadTemplates();
    } catch (error) {
      console.error('Erro ao excluir template:', error);
      toast.error('Erro ao excluir template');
    }
  };

  const resetForm = () => {
    setFormData({
      event: 'StageStarted',
      channel: 'email',
      is_enabled: true,
      recipient_type: 'client',
      custom_recipients: [],
      priority: 'medium',
      subject: '',
      body: '',
      variables: [],
      conditions: {},
      schedule: {
        delay_minutes: 0,
        send_at: 'immediate',
        custom_time: '',
        retry_attempts: 3
      }
    });
  };

  const getDefaultSubject = (event) => {
    const subjects = {
      StageStarted: '[{{service_name}}] Nova etapa iniciada: {{stage_name}}',
      StageCompleted: '[{{service_name}}] Etapa concluída: {{stage_name}}',
      TaskDueSoon: '[{{client_name}}] Tarefa vencendo: {{task_title}}',
      ApprovalRequested: '[{{client_name}}] Sua aprovação é necessária: {{deliverable_name}}',
      ApprovalResolved: '[{{client_name}}] Aprovação {{status}}: {{deliverable_name}}'
    };
    return subjects[event] || '';
  };

  const getDefaultBody = (event) => {
    const bodies = {
      StageStarted: `Olá {{client_name}},

Iniciamos uma nova etapa do seu projeto: **{{stage_name}}**.

**Duração estimada:** {{estimated_duration}} dias
**Responsável:** {{team_member}}

Você será notificado quando esta etapa for concluída.

Atenciosamente,
Equipe`,

      StageCompleted: `Olá {{client_name}},

Temos o prazer de informar que concluímos a etapa **{{stage_name}}** do seu projeto.

**Data de conclusão:** {{completion_date}}
**Próxima etapa:** {{next_stage}}

Os resultados estão disponíveis em sua área do cliente.

Atenciosamente,
Equipe`,

      TaskDueSoon: `Atenção,

A tarefa **{{task_title}}** está próxima do prazo de vencimento.

**Cliente:** {{client_name}}
**Prazo:** {{due_date}}
**Responsável:** {{assignee}}
**Prioridade:** {{priority}}

Favor verificar e atualizar o status.`,

      ApprovalRequested: `Olá {{client_name}},

Precisamos da sua aprovação para o entregável: **{{deliverable_name}}**.

**Descrição:** {{description}}
**Prazo para aprovação:** {{deadline}}

[Clique aqui para aprovar]({{approval_url}})

Atenciosamente,
Equipe`,

      ApprovalResolved: `Olá {{client_name}},

Sua aprovação foi **{{status}}** para: **{{deliverable_name}}**.

{{#if comment}}
**Comentário:** {{comment}}
{{/if}}

**Resolvido por:** {{resolved_by}}

Atenciosamente,
Equipe`
    };
    return bodies[event] || '';
  };

  const insertVariable = (variable) => {
    const textarea = document.getElementById('template-body');
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = formData.body;
      const newText = text.substring(0, start) + `{{${variable}}}` + text.substring(end);
      setFormData(prev => ({ ...prev, body: newText }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Templates de Notificação</h2>
          <p className="text-gray-600">Configure notificações automáticas por evento</p>
        </div>
        <Button onClick={() => setIsCreating(true)} disabled={isCreating}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Template
        </Button>
      </div>

      <Tabs defaultValue="templates">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="templates">Templates Configurados</TabsTrigger>
          <TabsTrigger value="events">Eventos Disponíveis</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          {templates.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="font-medium text-gray-900 mb-2">Nenhum template configurado</h3>
                <p className="text-gray-600 mb-4">
                  Crie templates para automatizar notificações por evento
                </p>
                <Button onClick={() => setIsCreating(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeiro Template
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => {
                const eventConfig = EVENT_TYPES[template.event];
                const channelConfig = CHANNEL_TYPES[template.channel];
                const EventIcon = eventConfig?.icon || Bell;
                const ChannelIcon = channelConfig?.icon || Mail;

                return (
                  <Card key={template.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <EventIcon className={`w-5 h-5 text-${eventConfig?.color}-600`} />
                          <div>
                            <CardTitle className="text-sm">{eventConfig?.label}</CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              <ChannelIcon className={`w-4 h-4 text-${channelConfig?.color}-600`} />
                              <span className="text-xs text-gray-500">{channelConfig?.label}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {template.is_enabled ? (
                            <Eye className="w-4 h-4 text-green-600" />
                          ) : (
                            <EyeOff className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Assunto:</div>
                          <div className="text-sm font-medium line-clamp-2">{template.subject}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Destinatário:</div>
                          <Badge variant="outline" className="text-xs">
                            {RECIPIENT_TYPES[template.recipient_type]}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditTemplate(template)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(EVENT_TYPES).map(([eventKey, eventConfig]) => {
              const EventIcon = eventConfig.icon;
              return (
                <Card key={eventKey}>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <EventIcon className={`w-5 h-5 text-${eventConfig.color}-600`} />
                      <CardTitle className="text-sm">{eventConfig.label}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-3">{eventConfig.description}</p>
                    <div>
                      <div className="text-xs text-gray-500 mb-2">Variáveis disponíveis:</div>
                      <div className="flex flex-wrap gap-1">
                        {eventConfig.variables.map((variable) => (
                          <Badge key={variable} variant="secondary" className="text-xs">
                            {variable}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Template Creation/Edit Modal */}
      {(isCreating || editingTemplate) && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>
                {editingTemplate ? 'Editar Template' : 'Novo Template de Notificação'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Evento</Label>
                  <Select
                    value={formData.event}
                    onValueChange={(value) => {
                      setFormData(prev => ({
                        ...prev,
                        event: value,
                        subject: getDefaultSubject(value),
                        body: getDefaultBody(value)
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(EVENT_TYPES).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Canal</Label>
                  <Select
                    value={formData.channel}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, channel: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CHANNEL_TYPES).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Destinatário</Label>
                  <Select
                    value={formData.recipient_type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, recipient_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(RECIPIENT_TYPES).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Enable/Priority */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.is_enabled}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_enabled: checked }))}
                  />
                  <Label>Template ativo</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Label>Prioridade:</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIORITY_LEVELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Subject */}
              <div>
                <Label>Assunto</Label>
                <Input
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Assunto da notificação"
                />
              </div>

              {/* Body with Variables */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Corpo da Mensagem</Label>
                  <div className="text-sm text-gray-500">
                    Clique em uma variável para inserir:
                  </div>
                </div>

                {/* Variables Helper */}
                <div className="flex flex-wrap gap-1 mb-2 p-2 bg-gray-50 rounded">
                  {EVENT_TYPES[formData.event]?.variables.map((variable) => (
                    <button
                      key={variable}
                      type="button"
                      onClick={() => insertVariable(variable)}
                      className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                    >
                      {variable}
                    </button>
                  ))}
                </div>

                <Textarea
                  id="template-body"
                  value={formData.body}
                  onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
                  placeholder="Corpo da mensagem"
                  rows={12}
                  className="font-mono text-sm"
                />
              </div>

              {/* Schedule Options */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Delay (minutos)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.schedule.delay_minutes}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      schedule: { ...prev.schedule, delay_minutes: parseInt(e.target.value) || 0 }
                    }))}
                  />
                </div>

                <div>
                  <Label>Envio</Label>
                  <Select
                    value={formData.schedule.send_at}
                    onValueChange={(value) => setFormData(prev => ({
                      ...prev,
                      schedule: { ...prev.schedule, send_at: value }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Imediato</SelectItem>
                      <SelectItem value="business_hours">Horário Comercial</SelectItem>
                      <SelectItem value="custom_time">Horário Customizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Tentativas</Label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.schedule.retry_attempts}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      schedule: { ...prev.schedule, retry_attempts: parseInt(e.target.value) || 3 }
                    }))}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingTemplate(null);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button onClick={handleSaveTemplate}>
                  <Save className="w-4 h-4 mr-2" />
                  {editingTemplate ? 'Atualizar' : 'Criar'} Template
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
