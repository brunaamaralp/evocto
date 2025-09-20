
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bell, 
  BellRing, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Clock,
  Settings,
  Mail,
  MessageSquare,
  Smartphone,
  Users
} from 'lucide-react';
import { FinancialKPI } from '@/api/entities';

const ALERT_TYPES = [
  {
    id: 'threshold_breach',
    name: 'Violação de Limites',
    description: 'Quando KPI ultrapassa limites críticos',
    icon: AlertTriangle,
    defaultEnabled: true,
    severity: 'high'
  },
  {
    id: 'trend_negative',
    name: 'Tendência Negativa',
    description: 'KPI em declínio por 2+ períodos',
    icon: TrendingDown,
    defaultEnabled: true,
    severity: 'medium'
  },
  {
    id: 'target_missed',
    name: 'Meta Perdida',
    description: 'KPI não atingiu meta do período',
    icon: AlertCircle,
    defaultEnabled: false,
    severity: 'low'
  },
  {
    id: 'stale_data',
    name: 'Dados Desatualizados',
    description: 'KPI sem atualização por muito tempo',
    icon: Clock,
    defaultEnabled: true,
    severity: 'medium'
  },
  {
    id: 'calculation_error',
    name: 'Erro de Cálculo',
    description: 'Falha no cálculo automático',
    icon: AlertTriangle,
    defaultEnabled: true,
    severity: 'critical'
  },
  {
    id: 'positive_milestone',
    name: 'Marco Positivo',
    description: 'KPI atingiu marco importante',
    icon: CheckCircle2,
    defaultEnabled: false,
    severity: 'info'
  }
];

const NOTIFICATION_CHANNELS = [
  {
    id: 'email',
    name: 'E-mail',
    icon: Mail,
    description: 'Notificações por e-mail'
  },
  {
    id: 'in_app',
    name: 'In-App',
    icon: Bell,
    description: 'Notificações no sistema'
  },
  {
    id: 'sms',
    name: 'SMS',
    icon: Smartphone,
    description: 'Mensagens de texto'
  },
  {
    id: 'slack',
    name: 'Slack',
    icon: MessageSquare,
    description: 'Canal do Slack'
  }
];

export default function KPINotificationEngine({ 
  clientId, 
  serviceId,
  onConfigUpdate,
  className = "" 
}) {
  const [notificationConfig, setNotificationConfig] = useState({
    enabled: true,
    alertTypes: {},
    channels: {},
    recipients: [],
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00'
    },
    frequency: {
      immediate: true,
      digest: false,
      digestTime: '09:00'
    }
  });

  const [kpis, setKpis] = useState([]);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const loadNotificationConfig = useCallback(async () => {
    try {
      setLoading(true);

      // Carregar KPIs para configuração
      const filters = { clientId, is_current: true };
      if (serviceId) filters.service_instance_id = serviceId;
      
      const kpiData = await FinancialKPI.filter(filters);
      setKpis(kpiData);

      // Carregar configuração existente (mock por enquanto)
      const config = {
        enabled: true,
        alertTypes: ALERT_TYPES.reduce((acc, type) => {
          acc[type.id] = {
            enabled: type.defaultEnabled,
            severity: type.severity,
            thresholds: {}
          };
          return acc;
        }, {}),
        channels: NOTIFICATION_CHANNELS.reduce((acc, channel) => {
          acc[channel.id] = {
            enabled: channel.id === 'in_app' || channel.id === 'email',
            config: {}
          };
          return acc;
        }, {}),
        recipients: [
          { 
            email: 'admin@empresa.com', 
            name: 'Administrador',
            role: 'admin',
            alertTypes: ['threshold_breach', 'calculation_error']
          }
        ]
      };

      setNotificationConfig(config);

      // Carregar notificações recentes (mock)
      setRecentNotifications([
        {
          id: 1,
          kpiName: 'Margem Líquida',
          alertType: 'threshold_breach',
          severity: 'high',
          message: 'Margem líquida caiu abaixo do limite crítico (8%)',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          status: 'unread'
        },
        {
          id: 2,
          kpiName: 'Faturamento',
          alertType: 'positive_milestone',
          severity: 'info',
          message: 'Faturamento ultrapassou meta mensal em 15%',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          status: 'read'
        }
      ]);

    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    } finally {
      setLoading(false);
    }
  }, [clientId, serviceId]);

  useEffect(() => {
    loadNotificationConfig();
  }, [loadNotificationConfig]);

  const handleAlertTypeToggle = (alertTypeId, enabled) => {
    setNotificationConfig(prev => ({
      ...prev,
      alertTypes: {
        ...prev.alertTypes,
        [alertTypeId]: {
          ...prev.alertTypes[alertTypeId],
          enabled
        }
      }
    }));
  };

  const handleChannelToggle = (channelId, enabled) => {
    setNotificationConfig(prev => ({
      ...prev,
      channels: {
        ...prev.channels,
        [channelId]: {
          ...prev.channels[channelId],
          enabled
        }
      }
    }));
  };

  const saveConfiguration = async () => {
    try {
      setSaving(true);
      
      // Aqui salvaria a configuração no backend
      console.log('Salvando configuração:', notificationConfig);
      
      // Simular salvamento
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (onConfigUpdate) {
        onConfigUpdate(notificationConfig);
      }

    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
    } finally {
      setSaving(false);
    }
  };

  const testNotification = async (alertType) => {
    try {
      setTesting(true);
      
      // Simular envio de notificação de teste
      console.log('Testando notificação:', alertType);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      alert('Notificação de teste enviada com sucesso!');

    } catch (error) {
      console.error('Erro ao testar notificação:', error);
    } finally {
      setTesting(false);
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      critical: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-blue-100 text-blue-800',
      info: 'bg-green-100 text-green-800'
    };
    return colors[severity] || 'bg-gray-100 text-gray-800';
  };

  const getAlertTypeIcon = (alertTypeId) => {
    const alertType = ALERT_TYPES.find(type => type.id === alertTypeId);
    const Icon = alertType?.icon || Bell;
    return <Icon className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BellRing className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-xl font-semibold">Sistema de Notificações</h2>
            <p className="text-sm text-gray-600">
              Configure alertas inteligentes para seus KPIs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={notificationConfig.enabled ? "default" : "secondary"}>
            {notificationConfig.enabled ? 'Ativo' : 'Inativo'}
          </Badge>
          <Switch
            checked={notificationConfig.enabled}
            onCheckedChange={(enabled) => 
              setNotificationConfig(prev => ({ ...prev, enabled }))
            }
          />
        </div>
      </div>

      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="alerts">Tipos de Alerta</TabsTrigger>
          <TabsTrigger value="channels">Canais</TabsTrigger>
          <TabsTrigger value="recipients">Destinatários</TabsTrigger>
          <TabsTrigger value="recent">Recentes</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Configuração de Alertas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ALERT_TYPES.map((alertType) => (
                <div key={alertType.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <alertType.icon className="w-5 h-5 text-gray-600" />
                    <div>
                      <div className="font-medium">{alertType.name}</div>
                      <div className="text-sm text-gray-600">{alertType.description}</div>
                    </div>
                    <Badge className={getSeverityColor(alertType.severity)}>
                      {alertType.severity}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={notificationConfig.alertTypes[alertType.id]?.enabled || false}
                      onCheckedChange={(enabled) => handleAlertTypeToggle(alertType.id, enabled)}
                      disabled={!notificationConfig.enabled}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => testNotification(alertType.id)}
                      disabled={testing || !notificationConfig.alertTypes[alertType.id]?.enabled}
                    >
                      Testar
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="channels" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Canais de Notificação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {NOTIFICATION_CHANNELS.map((channel) => (
                <div key={channel.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <channel.icon className="w-5 h-5 text-gray-600" />
                    <div>
                      <div className="font-medium">{channel.name}</div>
                      <div className="text-sm text-gray-600">{channel.description}</div>
                    </div>
                  </div>
                  
                  <Switch
                    checked={notificationConfig.channels[channel.id]?.enabled || false}
                    onCheckedChange={(enabled) => handleChannelToggle(channel.id, enabled)}
                    disabled={!notificationConfig.enabled}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recipients" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Destinatários
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {notificationConfig.recipients.map((recipient, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium">{recipient.name}</div>
                      <div className="text-sm text-gray-600">{recipient.email}</div>
                      <div className="text-xs text-gray-500">
                        {recipient.alertTypes.length} tipos de alerta
                      </div>
                    </div>
                  </div>
                  
                  <Badge variant="outline">
                    {recipient.role}
                  </Badge>
                </div>
              ))}

              <Button variant="outline" className="w-full">
                <Users className="w-4 h-4 mr-2" />
                Adicionar Destinatário
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notificações Recentes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentNotifications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Nenhuma notificação recente</p>
                </div>
              ) : (
                recentNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border rounded-lg ${
                      notification.status === 'unread' ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`p-1 rounded-full ${getSeverityColor(notification.severity)}`}>
                          {getAlertTypeIcon(notification.alertType)}
                        </div>
                        <div>
                          <div className="font-medium">{notification.kpiName}</div>
                          <div className="text-sm text-gray-700 mt-1">
                            {notification.message}
                          </div>
                          <div className="text-xs text-gray-500 mt-2">
                            {new Date(notification.timestamp).toLocaleString('pt-BR')}
                          </div>
                        </div>
                      </div>
                      
                      <Badge className={getSeverityColor(notification.severity)}>
                        {notification.severity}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Ações */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={loadNotificationConfig}>
          Cancelar
        </Button>
        <Button onClick={saveConfiguration} disabled={saving}>
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
              Salvando...
            </>
          ) : (
            'Salvar Configuração'
          )}
        </Button>
      </div>
    </div>
  );
}
