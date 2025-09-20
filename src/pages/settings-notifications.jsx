import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { NotificationPreference } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Bell, Mail, Clock, Smartphone } from 'lucide-react';

export default function NotificationSettingsPage() {
  const { user } = useSession();
  const [preferences, setPreferences] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) return;

      try {
        const prefs = await NotificationPreference.filter({ userId: user.id });
        
        if (prefs.length > 0) {
          setPreferences(prefs[0]);
        } else {
          // Criar preferências padrão
          const defaultPrefs = {
            userId: user.id,
            inApp: true,
            email: 'important',
            quietHours: {
              enabled: true,
              startTime: '20:00',
              endTime: '08:00'
            },
            digestTime: '08:30',
            typePreferences: {
              rc_created: true,
              rc_expiring: true,
              plan_pending: true,
              plan_approved: true,
              cycle_due: true,
              workorder_due: true,
              briefing_review: false,
              learning_triage: false,
              health_alert: true,
              task_assigned: true,
              task_due_soon: true,
              task_overdue: true
            }
          };

          const created = await NotificationPreference.create(defaultPrefs);
          setPreferences(created);
        }
      } catch (error) {
        console.error('Error loading notification preferences:', error);
        toast.error('Erro ao carregar preferências');
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [user]);

  const handleSave = async () => {
    if (!preferences) return;

    setSaving(true);
    try {
      await NotificationPreference.update(preferences.id, preferences);
      toast.success('Preferências salvas com sucesso!');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Erro ao salvar preferências');
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (field, value) => {
    setPreferences(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateTypePreference = (type, value) => {
    setPreferences(prev => ({
      ...prev,
      typePreferences: {
        ...prev.typePreferences,
        [type]: value
      }
    }));
  };

  const updateQuietHours = (field, value) => {
    setPreferences(prev => ({
      ...prev,
      quietHours: {
        ...prev.quietHours,
        [field]: value
      }
    }));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="space-y-4">
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notificações</h1>
          <p className="text-gray-600">Erro ao carregar preferências</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notificações</h1>
        <p className="text-gray-600">Configure como e quando você quer receber notificações</p>
      </div>

      {/* Configurações Gerais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Configurações Gerais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="inApp">Notificações no Sistema</Label>
              <p className="text-sm text-gray-600">Receber notificações dentro da plataforma</p>
            </div>
            <Switch
              id="inApp"
              checked={preferences.inApp}
              onCheckedChange={(checked) => updatePreference('inApp', checked)}
            />
          </div>

          <div className="space-y-2">
            <Label>Notificações por Email</Label>
            <Select 
              value={preferences.email} 
              onValueChange={(value) => updatePreference('email', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as notificações</SelectItem>
                <SelectItem value="important">Apenas importantes</SelectItem>
                <SelectItem value="digest_only">Apenas resumo diário</SelectItem>
                <SelectItem value="off">Desabilitado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Horário Silencioso */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Horário Silencioso
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Ativar Horário Silencioso</Label>
              <p className="text-sm text-gray-600">Não enviar emails durante determinado período</p>
            </div>
            <Switch
              checked={preferences.quietHours?.enabled}
              onCheckedChange={(checked) => updateQuietHours('enabled', checked)}
            />
          </div>

          {preferences.quietHours?.enabled && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Início</Label>
                <Select 
                  value={preferences.quietHours.startTime} 
                  onValueChange={(value) => updateQuietHours('startTime', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => {
                      const time = `${i.toString().padStart(2, '0')}:00`;
                      return <SelectItem key={time} value={time}>{time}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Fim</Label>
                <Select 
                  value={preferences.quietHours.endTime} 
                  onValueChange={(value) => updateQuietHours('endTime', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => {
                      const time = `${i.toString().padStart(2, '0')}:00`;
                      return <SelectItem key={time} value={time}>{time}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div>
            <Label>Horário do Resumo Diário</Label>
            <Select 
              value={preferences.digestTime} 
              onValueChange={(value) => updatePreference('digestTime', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="08:00">08:00</SelectItem>
                <SelectItem value="08:30">08:30</SelectItem>
                <SelectItem value="09:00">09:00</SelectItem>
                <SelectItem value="18:00">18:00</SelectItem>
                <SelectItem value="19:00">19:00</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tipos de Notificação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Tipos de Notificação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(preferences.typePreferences || {}).map(([type, enabled]) => (
            <div key={type} className="flex items-center justify-between">
              <div>
                <Label>{getNotificationTypeLabel(type)}</Label>
                <p className="text-sm text-gray-600">{getNotificationTypeDescription(type)}</p>
              </div>
              <Switch
                checked={enabled}
                onCheckedChange={(checked) => updateTypePreference(type, checked)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar Preferências'}
        </Button>
      </div>
    </div>
  );
}

function getNotificationTypeLabel(type) {
  const labels = {
    rc_created: 'RC Criado',
    rc_expiring: 'RC Expirando',
    plan_pending: 'Plano Pendente',
    plan_approved: 'Plano Aprovado',
    cycle_due: 'Ciclo Vencendo',
    workorder_due: 'Work Order Vencendo',
    briefing_review: 'Revisão de Briefing',
    learning_triage: 'Triagem de Aprendizado',
    health_alert: 'Alerta de Saúde',
    task_assigned: 'Tarefa Atribuída',
    task_due_soon: 'Tarefa Vencendo',
    task_overdue: 'Tarefa Atrasada'
  };
  return labels[type] || type;
}

function getNotificationTypeDescription(type) {
  const descriptions = {
    rc_created: 'Quando um novo RC for criado',
    rc_expiring: 'Quando um RC estiver próximo do vencimento',
    plan_pending: 'Quando um plano estiver aguardando aprovação',
    plan_approved: 'Quando um plano for aprovado',
    cycle_due: 'Quando um ciclo estiver vencendo',
    workorder_due: 'Quando um work order estiver vencendo',
    briefing_review: 'Quando um briefing precisar de revisão',
    learning_triage: 'Quando aprendizados precisarem de triagem',
    health_alert: 'Alertas sobre a saúde do sistema',
    task_assigned: 'Quando uma tarefa for atribuída a você',
    task_due_soon: 'Quando uma tarefa estiver vencendo',
    task_overdue: 'Quando uma tarefa estiver atrasada'
  };
  return descriptions[type] || '';
}