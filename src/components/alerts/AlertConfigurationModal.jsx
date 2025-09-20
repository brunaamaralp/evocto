import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Switch,
} from '@/components/ui/switch';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import { 
  Bell, 
  Clock, 
  Target, 
  User, 
  Settings,
  CheckCircle, 
  AlertCircle,
  Save,
  RefreshCw,
  Calendar,
  Mail,
  Smartphone,
  Slack,
  Webhook
} from 'lucide-react';
import { useSession } from '@/components/auth/SessionManager';
import { toast } from 'sonner';

/**
 * Sistema de configuração de alertas e lembretes
 */
export default function AlertConfigurationModal({ 
  isOpen, 
  onClose, 
  clientId, 
  serviceId,
  onConfigurationSaved 
}) {
  const { user } = useSession();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [configurations, setConfigurations] = useState({});

  // Configurações padrão
  const defaultConfig = {
    taskReminders: {
      enabled: true,
      channels: ['email', 'in_app'],
      frequencies: {
        '1_day': true,
        '3_days': true,
        '7_days': false
      },
      recipients: ['consultant', 'client']
    },
    kpiAlerts: {
      enabled: true,
      channels: ['email', 'in_app'],
      thresholds: {
        critical: 80, // <80% da meta
        warning: 90, // 80-90% da meta
        success: 95  // >=95% da meta
      },
      recipients: ['consultant', 'client']
    },
    clientNotifications: {
      enabled: true,
      channels: ['email', 'in_app'],
      events: {
        briefing_completed: true,
        approval_received: true,
        document_uploaded: true,
        comment_added: true
      },
      recipients: ['consultant']
    },
    systemAlerts: {
      enabled: true,
      channels: ['email', 'in_app'],
      events: {
        maintenance: true,
        errors: true,
        reports: false,
        sync: false
      },
      recipients: ['consultant']
    },
    schedules: {
      daily: {
        enabled: true,
        time: '09:00',
        timezone: 'America/Sao_Paulo'
      },
      weekly: {
        enabled: true,
        day: 'monday',
        time: '09:00',
        timezone: 'America/Sao_Paulo'
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadConfiguration();
    }
  }, [isOpen, clientId, serviceId]);

  const loadConfiguration = async () => {
    setLoading(true);
    try {
      // Simular carregamento da configuração
      const response = await fetch(`/api/alert-configurations/${clientId}/${serviceId}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });

      if (response.ok) {
        const config = await response.json();
        setConfigurations(config);
      } else {
        // Usar configuração padrão
        setConfigurations(defaultConfig);
      }
    } catch (err) {
      console.error('Erro ao carregar configuração:', err);
      setConfigurations(defaultConfig);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = (section, key, value) => {
    setConfigurations(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  const handleNestedConfigChange = (section, key, subKey, value) => {
    setConfigurations(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: {
          ...prev[section][key],
          [subKey]: value
        }
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/alert-configurations/${clientId}/${serviceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          ...configurations,
          updatedBy: user.email,
          updatedAt: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Erro ao salvar configuração: ${response.statusText}`);
      }

      toast.success('Configuração de alertas salva com sucesso!');
      onConfigurationSaved(configurations);
      onClose();

    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setConfigurations({});
    setError(null);
    onClose();
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-2">Carregando configurações...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            Configuração de Alertas e Lembretes
          </DialogTitle>
          <DialogDescription>
            Configure como e quando receber notificações sobre tarefas, KPIs e eventos do sistema
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Lembretes de Tarefas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-600" />
                Lembretes de Tarefas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Ativar lembretes de tarefas</Label>
                  <p className="text-sm text-gray-600">Notificações quando tarefas estão próximas do prazo</p>
                </div>
                <Switch
                  checked={configurations.taskReminders?.enabled || false}
                  onCheckedChange={(checked) => handleConfigChange('taskReminders', 'enabled', checked)}
                />
              </div>

              {configurations.taskReminders?.enabled && (
                <div className="space-y-4 pl-4 border-l-2 border-orange-200">
                  <div>
                    <Label className="font-medium">Canais de notificação</Label>
                    <div className="flex gap-4 mt-2">
                      {[
                        { key: 'email', label: 'Email', icon: Mail },
                        { key: 'in_app', label: 'No App', icon: Bell },
                        { key: 'sms', label: 'SMS', icon: Smartphone },
                        { key: 'slack', label: 'Slack', icon: Slack }
                      ].map(({ key, label, icon: Icon }) => (
                        <div key={key} className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          <Switch
                            checked={configurations.taskReminders?.channels?.includes(key) || false}
                            onCheckedChange={(checked) => {
                              const channels = configurations.taskReminders?.channels || [];
                              const newChannels = checked 
                                ? [...channels, key]
                                : channels.filter(c => c !== key);
                              handleConfigChange('taskReminders', 'channels', newChannels);
                            }}
                          />
                          <span className="text-sm">{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="font-medium">Frequência dos lembretes</Label>
                    <div className="space-y-2 mt-2">
                      {[
                        { key: '1_day', label: '1 dia antes do prazo' },
                        { key: '3_days', label: '3 dias antes do prazo' },
                        { key: '7_days', label: '7 dias antes do prazo' }
                      ].map(({ key, label }) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-sm">{label}</span>
                          <Switch
                            checked={configurations.taskReminders?.frequencies?.[key] || false}
                            onCheckedChange={(checked) => handleNestedConfigChange('taskReminders', 'frequencies', key, checked)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="font-medium">Destinatários</Label>
                    <div className="flex gap-4 mt-2">
                      {[
                        { key: 'consultant', label: 'Consultor' },
                        { key: 'client', label: 'Cliente' }
                      ].map(({ key, label }) => (
                        <div key={key} className="flex items-center gap-2">
                          <Switch
                            checked={configurations.taskReminders?.recipients?.includes(key) || false}
                            onCheckedChange={(checked) => {
                              const recipients = configurations.taskReminders?.recipients || [];
                              const newRecipients = checked 
                                ? [...recipients, key]
                                : recipients.filter(r => r !== key);
                              handleConfigChange('taskReminders', 'recipients', newRecipients);
                            }}
                          />
                          <span className="text-sm">{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Alertas de KPIs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="w-5 h-5 text-red-600" />
                Alertas de KPIs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Ativar alertas de KPIs</Label>
                  <p className="text-sm text-gray-600">Notificações quando KPIs estão fora da meta</p>
                </div>
                <Switch
                  checked={configurations.kpiAlerts?.enabled || false}
                  onCheckedChange={(checked) => handleConfigChange('kpiAlerts', 'enabled', checked)}
                />
              </div>

              {configurations.kpiAlerts?.enabled && (
                <div className="space-y-4 pl-4 border-l-2 border-red-200">
                  <div>
                    <Label className="font-medium">Canais de notificação</Label>
                    <div className="flex gap-4 mt-2">
                      {[
                        { key: 'email', label: 'Email', icon: Mail },
                        { key: 'in_app', label: 'No App', icon: Bell },
                        { key: 'sms', label: 'SMS', icon: Smartphone }
                      ].map(({ key, label, icon: Icon }) => (
                        <div key={key} className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          <Switch
                            checked={configurations.kpiAlerts?.channels?.includes(key) || false}
                            onCheckedChange={(checked) => {
                              const channels = configurations.kpiAlerts?.channels || [];
                              const newChannels = checked 
                                ? [...channels, key]
                                : channels.filter(c => c !== key);
                              handleConfigChange('kpiAlerts', 'channels', newChannels);
                            }}
                          />
                          <span className="text-sm">{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="font-medium">Limites de alerta</Label>
                    <div className="grid grid-cols-3 gap-4 mt-2">
                      <div>
                        <Label className="text-sm text-red-600">Crítico</Label>
                        <Input
                          type="number"
                          value={configurations.kpiAlerts?.thresholds?.critical || 80}
                          onChange={(e) => handleNestedConfigChange('kpiAlerts', 'thresholds', 'critical', parseInt(e.target.value))}
                          className="text-red-600"
                        />
                        <p className="text-xs text-gray-500">% da meta</p>
                      </div>
                      <div>
                        <Label className="text-sm text-yellow-600">Atenção</Label>
                        <Input
                          type="number"
                          value={configurations.kpiAlerts?.thresholds?.warning || 90}
                          onChange={(e) => handleNestedConfigChange('kpiAlerts', 'thresholds', 'warning', parseInt(e.target.value))}
                          className="text-yellow-600"
                        />
                        <p className="text-xs text-gray-500">% da meta</p>
                      </div>
                      <div>
                        <Label className="text-sm text-green-600">Sucesso</Label>
                        <Input
                          type="number"
                          value={configurations.kpiAlerts?.thresholds?.success || 95}
                          onChange={(e) => handleNestedConfigChange('kpiAlerts', 'thresholds', 'success', parseInt(e.target.value))}
                          className="text-green-600"
                        />
                        <p className="text-xs text-gray-500">% da meta</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notificações de Cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5 text-green-600" />
                Notificações de Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Ativar notificações de cliente</Label>
                  <p className="text-sm text-gray-600">Notificar consultor quando cliente realiza ações</p>
                </div>
                <Switch
                  checked={configurations.clientNotifications?.enabled || false}
                  onCheckedChange={(checked) => handleConfigChange('clientNotifications', 'enabled', checked)}
                />
              </div>

              {configurations.clientNotifications?.enabled && (
                <div className="space-y-4 pl-4 border-l-2 border-green-200">
                  <div>
                    <Label className="font-medium">Eventos a notificar</Label>
                    <div className="space-y-2 mt-2">
                      {[
                        { key: 'briefing_completed', label: 'Briefing concluído' },
                        { key: 'approval_received', label: 'Aprovação recebida' },
                        { key: 'document_uploaded', label: 'Documento enviado' },
                        { key: 'comment_added', label: 'Comentário adicionado' }
                      ].map(({ key, label }) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-sm">{label}</span>
                          <Switch
                            checked={configurations.clientNotifications?.events?.[key] || false}
                            onCheckedChange={(checked) => handleNestedConfigChange('clientNotifications', 'events', key, checked)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Agendamento */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                Agendamento de Relatórios
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="font-medium">Relatórios diários</Label>
                <div className="flex items-center gap-4 mt-2">
                  <Switch
                    checked={configurations.schedules?.daily?.enabled || false}
                    onCheckedChange={(checked) => handleNestedConfigChange('schedules', 'daily', 'enabled', checked)}
                  />
                  {configurations.schedules?.daily?.enabled && (
                    <Input
                      type="time"
                      value={configurations.schedules?.daily?.time || '09:00'}
                      onChange={(e) => handleNestedConfigChange('schedules', 'daily', 'time', e.target.value)}
                      className="w-32"
                    />
                  )}
                </div>
              </div>

              <div>
                <Label className="font-medium">Relatórios semanais</Label>
                <div className="flex items-center gap-4 mt-2">
                  <Switch
                    checked={configurations.schedules?.weekly?.enabled || false}
                    onCheckedChange={(checked) => handleNestedConfigChange('schedules', 'weekly', 'enabled', checked)}
                  />
                  {configurations.schedules?.weekly?.enabled && (
                    <div className="flex gap-2">
                      <Select
                        value={configurations.schedules?.weekly?.day || 'monday'}
                        onValueChange={(value) => handleNestedConfigChange('schedules', 'weekly', 'day', value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monday">Segunda</SelectItem>
                          <SelectItem value="tuesday">Terça</SelectItem>
                          <SelectItem value="wednesday">Quarta</SelectItem>
                          <SelectItem value="thursday">Quinta</SelectItem>
                          <SelectItem value="friday">Sexta</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="time"
                        value={configurations.schedules?.weekly?.time || '09:00'}
                        onChange={(e) => handleNestedConfigChange('schedules', 'weekly', 'time', e.target.value)}
                        className="w-32"
                      />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Erro */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex gap-3">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar Configuração
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

