import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { NotificationPreference } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';
import { Bell, Mail, Clock, Save } from 'lucide-react';

const typeLabels = {
  rc_created: 'RC Criado',
  rc_expiring: 'RC Expirando',
  plan_pending: 'Plano Pendente',
  plan_approved: 'Plano Aprovado/Rejeitado',
  cycle_due: 'Prazos de Ciclo',
  workorder_due: 'Prazos de Jobs',
  briefing_review: 'Briefing para Revisão',
  learning_triage: 'Aprendizado para Triagem',
  health_alert: 'Alertas de Performance'
};

export default function NotificationPreferences() {
  const { user } = useSession();
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadPreferences();
    }
  }, [user?.id]);

  const loadPreferences = async () => {
    setLoading(true);
    try {
      const data = await NotificationPreference.filter({ userId: user.id });
      if (data.length > 0) {
        setPreferences(data[0]);
      } else {
        // Create default preferences
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
            health_alert: true
          }
        };
        setPreferences(defaultPrefs);
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (preferences.id) {
        await NotificationPreference.update(preferences.id, preferences);
      } else {
        await NotificationPreference.create(preferences);
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (path, value) => {
    setPreferences(prev => {
      const newPrefs = { ...prev };
      const keys = path.split('.');
      let current = newPrefs;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newPrefs;
    });
  };

  if (loading || !preferences) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-5 bg-slate-200 rounded w-32"></div>
              <div className="h-4 bg-slate-200 rounded w-48"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-4 bg-slate-200 rounded"></div>
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            <CardTitle>Notificações In-App</CardTitle>
          </div>
          <CardDescription>
            Configure como receber notificações dentro da plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="in-app">Ativar notificações in-app</Label>
            <Switch
              id="in-app"
              checked={preferences.inApp}
              onCheckedChange={(checked) => updatePreference('inApp', checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-green-600" />
            <CardTitle>Notificações por E-mail</CardTitle>
          </div>
          <CardDescription>
            Configure quando e como receber e-mails de notificação.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Frequência de E-mails</Label>
              <Select 
                value={preferences.email} 
                onValueChange={(value) => updatePreference('email', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="important">Apenas importantes</SelectItem>
                  <SelectItem value="digest_only">Apenas digest diário</SelectItem>
                  <SelectItem value="off">Desativado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Horário do Digest</Label>
              <Input
                type="time"
                value={preferences.digestTime}
                onChange={(e) => updatePreference('digestTime', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Horário Silencioso</Label>
              <Switch
                checked={preferences.quietHours.enabled}
                onCheckedChange={(checked) => updatePreference('quietHours.enabled', checked)}
              />
            </div>
            
            {preferences.quietHours.enabled && (
              <div className="grid grid-cols-2 gap-4 ml-6">
                <div className="space-y-2">
                  <Label className="text-sm">Das</Label>
                  <Input
                    type="time"
                    value={preferences.quietHours.startTime}
                    onChange={(e) => updatePreference('quietHours.startTime', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Até</Label>
                  <Input
                    type="time"
                    value={preferences.quietHours.endTime}
                    onChange={(e) => updatePreference('quietHours.endTime', e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tipos de Notificação</CardTitle>
          <CardDescription>
            Escolha quais tipos de notificação você quer receber.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(typeLabels).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between">
                <Label className="text-sm font-medium">{label}</Label>
                <Switch
                  checked={preferences.typePreferences[key] || false}
                  onCheckedChange={(checked) => updatePreference(`typePreferences.${key}`, checked)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Clock className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Salvar Preferências
            </>
          )}
        </Button>
      </div>
    </div>
  );
}