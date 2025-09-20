
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Bell, Mail, Loader2 } from 'lucide-react'; // Assuming lucide-react for icons

// --- MOCK/PLACEHOLDER IMPORTS ---
// In a real application, these would be actual service/hook imports.
// This mock is provided to ensure the code is functional and runnable for demonstration.
const NotificationPreference = {
  filter: async ({ userId }) => {
    // Simulate API call to fetch existing preferences
    return new Promise(resolve => setTimeout(() => {
      const stored = localStorage.getItem(`user_prefs_${userId}`);
      if (stored) {
        resolve([JSON.parse(stored)]);
      } else {
        resolve([]); // No preferences found, will trigger default creation
      }
    }, 300));
  },
  save: async (prefs) => {
    // Simulate API call to save preferences
    return new Promise(resolve => setTimeout(() => {
      localStorage.setItem(`user_prefs_${prefs.userId}`, JSON.stringify(prefs));
      resolve(prefs);
    }, 300));
  }
};

const useUser = () => {
  // Simulate a user context hook
  // Replace 'some-user-id' with an actual user ID from your authentication system
  return { user: { id: 'some-user-id' } }; 
};
// --- END MOCK IMPORTS ---

const typeLabels = {
  rc_created: 'Link de aprovação criado',
  rc_expiring: 'Link de aprovação expirando',
  plan_pending: 'Plano pendente',
  plan_approved: 'Plano aprovado/rejeitado',
  cycle_due: 'Prazos do mês',
  workorder_due: 'Prazos de jobs pontuais',
  briefing_review: 'Briefing para revisão',
  learning_triage: 'Aprendizado para triagem',
  health_alert: 'Alertas de estado do serviço'
};

export default function NotificationPreferences() {
  const { user } = useUser();
  const [preferences, setPreferences] = useState(null); // null indicates loading/not initialized
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.id) { // Ensure user ID is available before loading preferences
      loadPreferences();
    }
  }, [user?.id]); // Re-run effect if user ID changes

  const loadPreferences = async () => {
    setLoading(true);
    try {
      const data = await NotificationPreference.filter({ userId: user.id });
      if (data.length > 0) {
        setPreferences(data[0]);
      } else {
        // Create default preferences if none exist for the user
        const defaultPrefs = {
          userId: user.id,
          inApp: true, // Default to in-app notifications enabled
          email: 'important', // Default to only important emails
          quietHours: {
            enabled: false, // Default to quiet hours disabled
            startTime: '20:00',
            endTime: '08:00'
          },
          digestTime: '08:30', // Default daily digest time
          typePreferences: {
            // All specific notification types default to enabled for both in-app and email
            rc_created: { inApp: true, email: true },
            rc_expiring: { inApp: true, email: true },
            plan_pending: { inApp: true, email: true },
            plan_approved: { inApp: true, email: true },
            cycle_due: { inApp: true, email: true },
            workorder_due: { inApp: true, email: true },
            briefing_review: { inApp: true, email: true },
            learning_triage: { inApp: true, email: true },
            health_alert: { inApp: true, email: true },
          }
        };
        setPreferences(defaultPrefs);
      }
    } catch (error) {
      console.error('Falha ao carregar preferências de notificação:', error);
      // Set preferences to null to indicate a loading error state to the user
      setPreferences(null); 
    } finally {
      setLoading(false);
    }
  };

  // Helper function to update nested state immutably based on a dot-separated path
  const updatePreference = (path, value) => {
    setPreferences(prev => {
      if (!prev) return prev; // Safety check: if preferences are not loaded, don't update
      const newPrefs = { ...prev };
      const pathParts = path.split('.');

      // Handles various levels of nesting (e.g., 'inApp', 'quietHours.enabled', 'typePreferences.rc_created.inApp')
      if (pathParts.length === 1) {
        newPrefs[pathParts[0]] = value;
      } else if (pathParts.length === 2) {
        newPrefs[pathParts[0]] = {
          ...newPrefs[pathParts[0]],
          [pathParts[1]]: value
        };
      } else if (pathParts.length === 3) {
        // Ensure parent objects exist before attempting to spread/assign
        if (!newPrefs[pathParts[0]]) newPrefs[pathParts[0]] = {};
        if (!newPrefs[pathParts[0]][pathParts[1]]) newPrefs[pathParts[0]][pathParts[1]] = {};
        newPrefs[pathParts[0]][pathParts[1]] = {
          ...newPrefs[pathParts[0]][pathParts[1]],
          [pathParts[2]]: value
        };
      }
      return newPrefs;
    });
  };

  const handleSave = async () => {
    if (!preferences) return; // Do not save if preferences are not loaded/initialized
    setSaving(true);
    try {
      await NotificationPreference.save(preferences);
      // In a real app, you might show a success toast message here
      console.log('Preferências salvas com sucesso!');
    } catch (error) {
      console.error('Falha ao salvar preferências:', error);
      // In a real app, you might show an error toast message here
    } finally {
      setSaving(false);
    }
  };

  // Show a loading spinner while preferences are being fetched
  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  // Show an error message if preferences failed to load
  if (!preferences) {
    return <div className="text-center text-slate-500">Erro: Não foi possível carregar as preferências de notificação. Por favor, tente novamente.</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto py-8"> {/* Added mx-auto py-8 for better centering/spacing */}
      {/* In-App Notifications Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-indigo-600" />
            <CardTitle>Notificações no Aplicativo</CardTitle>
          </div>
          <CardDescription>
            Ative ou desative todas as notificações que aparecem dentro do aplicativo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="in-app-notifications">Receber notificações no aplicativo</Label>
            <Switch
              id="in-app-notifications"
              checked={preferences.inApp}
              onCheckedChange={(checked) => updatePreference('inApp', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Email Notifications Card */}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> {/* Responsive grid */}
            <div className="space-y-2">
              <Label>Frequência de E-mails</Label>
              <Select
                value={preferences.email}
                onValueChange={(value) => updatePreference('email', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a frequência" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="important">Apenas importantes</SelectItem>
                  <SelectItem value="digest_only">Apenas resumo diário</SelectItem>
                  <SelectItem value="off">Desativado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Horário do Resumo Diário</Label>
              <Input
                type="time"
                value={preferences.digestTime}
                onChange={(e) => updatePreference('digestTime', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="quiet-hours-toggle">Horário Silencioso</Label>
              <Switch
                id="quiet-hours-toggle"
                checked={preferences.quietHours.enabled}
                onCheckedChange={(checked) => updatePreference('quietHours.enabled', checked)}
              />
            </div>

            {/* Quiet Hours time inputs, conditionally rendered */}
            {preferences.quietHours.enabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6 mt-2">
                <div className="space-y-2">
                  <Label htmlFor="quiet-hours-start">Início</Label>
                  <Input
                    id="quiet-hours-start"
                    type="time"
                    value={preferences.quietHours.startTime}
                    onChange={(e) => updatePreference('quietHours.startTime', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quiet-hours-end">Fim</Label>
                  <Input
                    id="quiet-hours-end"
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

      {/* Notification Type Preferences Card */}
      <Card>
        <CardHeader>
          <CardTitle>Preferências por Tipo de Notificação</CardTitle>
          <CardDescription>
            Ajuste as configurações para cada tipo específico de notificação, tanto no aplicativo quanto por e-mail.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(typeLabels).map(([typeKey, label]) => (
            <div key={typeKey} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 py-2 border-b last:border-b-0">
              <Label className="flex-grow text-base">{label}</Label>
              <div className="flex items-center gap-4 mt-2 sm:mt-0">
                <div className="flex items-center gap-1">
                  <Label htmlFor={`inApp-${typeKey}`} className="text-sm">App</Label>
                  <Switch
                    id={`inApp-${typeKey}`}
                    checked={preferences.typePreferences[typeKey]?.inApp || false}
                    onCheckedChange={(checked) => updatePreference(`typePreferences.${typeKey}.inApp`, checked)}
                    className="data-[state=checked]:bg-indigo-500" // Custom color for checked state
                  />
                </div>
                <div className="flex items-center gap-1">
                  <Label htmlFor={`email-${typeKey}`} className="text-sm">Email</Label>
                  <Switch
                    id={`email-${typeKey}`}
                    checked={preferences.typePreferences[typeKey]?.email || false}
                    onCheckedChange={(checked) => updatePreference(`typePreferences.${typeKey}.email`, checked)}
                    className="data-[state=checked]:bg-green-500" // Custom color for checked state
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end pt-4">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            'Salvar Preferências'
          )}
        </Button>
      </div>
    </div>
  );
}
