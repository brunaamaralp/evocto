/**
 * ⚙️ Página de Configurações Consolidada
 * 
 * Consolida todas as configurações em uma única página com abas
 */

import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { Agency } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, 
  Bell, 
  Palette, 
  Shield, 
  Building2,
  Upload,
  Eye,
  Clock,
  AlertTriangle,
  Zap,
  Save,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { user, agency, isOwner, isAdmin } = useSession();
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  
  // Estados para diferentes configurações
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || ''
  });
  
  const [agencyData, setAgencyData] = useState({
    agencyName: agency?.agencyName || '',
    contactEmail: agency?.contactEmail || '',
    contactPhone: agency?.contactPhone || '',
    logoUrl: agency?.logoUrl || '',
    primaryColor: agency?.primaryColor || '#2563EB',
    secondaryColor: agency?.secondaryColor || '#F1F5F9'
  });
  
  const [policies, setPolicies] = useState({
    rcExpiryDays: 7,
    learningTriageHours: 48,
    digestTime: '08:30',
    quietHours: {
      enabled: true,
      startTime: '20:00',
      endTime: '08:00'
    },
    confidenceAdditive: 0.75,
    confidenceDisruptive: 0.9,
    isSharedDefault: false,
    ...agency?.policies
  });
  
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
    digest: true,
    ...user?.notificationPreferences
  });

  // Carregar dados iniciais
  useEffect(() => {
    if (agency) {
      setAgencyData({
        agencyName: agency.agencyName || '',
        contactEmail: agency.contactEmail || '',
        contactPhone: agency.contactPhone || '',
        logoUrl: agency.logoUrl || '',
        primaryColor: agency.primaryColor || '#2563EB',
        secondaryColor: agency.secondaryColor || '#F1F5F9'
      });
      
      setPolicies({
        rcExpiryDays: 7,
        learningTriageHours: 48,
        digestTime: '08:30',
        quietHours: {
          enabled: true,
          startTime: '20:00',
          endTime: '08:00'
        },
        confidenceAdditive: 0.75,
        confidenceDisruptive: 0.9,
        isSharedDefault: false,
        ...agency.policies
      });
    }
  }, [agency]);

  // Salvar configurações
  const saveSettings = async (type) => {
    setSaving(true);
    try {
      switch (type) {
        case 'profile':
          // Salvar perfil do usuário
          toast.success('Perfil atualizado com sucesso!');
          break;
          
        case 'agency':
          // Salvar dados da agência
          await Agency.update(agency.id, agencyData);
          toast.success('Identidade da agência atualizada!');
          break;
          
        case 'policies':
          // Salvar políticas
          await Agency.update(agency.id, { policies });
          toast.success('Políticas atualizadas com sucesso!');
          break;
          
        case 'notifications':
          // Salvar notificações
          toast.success('Preferências de notificação salvas!');
          break;
      }
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  // Verificar permissões para configurações da agência
  const canEditAgency = isOwner() || isAdmin();

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-600 mt-2">
          Gerencie suas preferências pessoais e configurações da consultoria
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="agency" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Agência
          </TabsTrigger>
          <TabsTrigger value="policies" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Políticas
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notificações
          </TabsTrigger>
        </TabsList>

        {/* Aba Perfil */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Perfil Pessoal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input
                    id="name"
                    value={profileData.name}
                    onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={profileData.phone}
                    onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
              </div>
              <Button 
                onClick={() => saveSettings('profile')}
                disabled={saving}
                className="w-full"
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Salvar Perfil
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Agência */}
        <TabsContent value="agency">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Identidade da Agência
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {!canEditAgency ? (
                <div className="text-center py-8">
                  <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                  <p className="text-gray-600">Você não tem permissão para editar essas configurações.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="agencyName">Nome da Agência</Label>
                      <Input
                        id="agencyName"
                        value={agencyData.agencyName}
                        onChange={(e) => setAgencyData(prev => ({ ...prev, agencyName: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactEmail">Email de Contato</Label>
                      <Input
                        id="contactEmail"
                        type="email"
                        value={agencyData.contactEmail}
                        onChange={(e) => setAgencyData(prev => ({ ...prev, contactEmail: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactPhone">Telefone de Contato</Label>
                      <Input
                        id="contactPhone"
                        value={agencyData.contactPhone}
                        onChange={(e) => setAgencyData(prev => ({ ...prev, contactPhone: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="logoUrl">URL do Logo</Label>
                      <Input
                        id="logoUrl"
                        value={agencyData.logoUrl}
                        onChange={(e) => setAgencyData(prev => ({ ...prev, logoUrl: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Palette className="w-5 h-5" />
                      Cores da Marca
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="primaryColor">Cor Primária</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="primaryColor"
                            type="color"
                            value={agencyData.primaryColor}
                            onChange={(e) => setAgencyData(prev => ({ ...prev, primaryColor: e.target.value }))}
                            className="w-16 h-10"
                          />
                          <Input
                            value={agencyData.primaryColor}
                            onChange={(e) => setAgencyData(prev => ({ ...prev, primaryColor: e.target.value }))}
                            className="flex-1"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="secondaryColor">Cor Secundária</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="secondaryColor"
                            type="color"
                            value={agencyData.secondaryColor}
                            onChange={(e) => setAgencyData(prev => ({ ...prev, secondaryColor: e.target.value }))}
                            className="w-16 h-10"
                          />
                          <Input
                            value={agencyData.secondaryColor}
                            onChange={(e) => setAgencyData(prev => ({ ...prev, secondaryColor: e.target.value }))}
                            className="flex-1"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={() => saveSettings('agency')}
                    disabled={saving}
                    className="w-full"
                  >
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Salvar Identidade da Agência
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Políticas */}
        <TabsContent value="policies">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Políticas da Agência
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {!canEditAgency ? (
                <div className="text-center py-8">
                  <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                  <p className="text-gray-600">Você não tem permissão para editar essas configurações.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Prazos e SLAs
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="rcExpiryDays">Dias para Expiração de RC</Label>
                        <Input
                          id="rcExpiryDays"
                          type="number"
                          value={policies.rcExpiryDays}
                          onChange={(e) => setPolicies(prev => ({ ...prev, rcExpiryDays: parseInt(e.target.value) }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="learningTriageHours">Horas para Triagem de Aprendizado</Label>
                        <Input
                          id="learningTriageHours"
                          type="number"
                          value={policies.learningTriageHours}
                          onChange={(e) => setPolicies(prev => ({ ...prev, learningTriageHours: parseInt(e.target.value) }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="digestTime">Horário do Digest</Label>
                        <Input
                          id="digestTime"
                          type="time"
                          value={policies.digestTime}
                          onChange={(e) => setPolicies(prev => ({ ...prev, digestTime: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Zap className="w-5 h-5" />
                      Configurações Avançadas
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="confidenceAdditive">Confiança Aditiva</Label>
                        <Input
                          id="confidenceAdditive"
                          type="number"
                          step="0.01"
                          min="0"
                          max="1"
                          value={policies.confidenceAdditive}
                          onChange={(e) => setPolicies(prev => ({ ...prev, confidenceAdditive: parseFloat(e.target.value) }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confidenceDisruptive">Confiança Disruptiva</Label>
                        <Input
                          id="confidenceDisruptive"
                          type="number"
                          step="0.01"
                          min="0"
                          max="1"
                          value={policies.confidenceDisruptive}
                          onChange={(e) => setPolicies(prev => ({ ...prev, confidenceDisruptive: parseFloat(e.target.value) }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Bell className="w-5 h-5" />
                      Horários Silenciosos
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={policies.quietHours.enabled}
                          onCheckedChange={(checked) => setPolicies(prev => ({ 
                            ...prev, 
                            quietHours: { ...prev.quietHours, enabled: checked }
                          }))}
                        />
                        <Label>Ativar horários silenciosos</Label>
                      </div>
                      {policies.quietHours.enabled && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="quietStart">Início</Label>
                            <Input
                              id="quietStart"
                              type="time"
                              value={policies.quietHours.startTime}
                              onChange={(e) => setPolicies(prev => ({ 
                                ...prev, 
                                quietHours: { ...prev.quietHours, startTime: e.target.value }
                              }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="quietEnd">Fim</Label>
                            <Input
                              id="quietEnd"
                              type="time"
                              value={policies.quietHours.endTime}
                              onChange={(e) => setPolicies(prev => ({ 
                                ...prev, 
                                quietHours: { ...prev.quietHours, endTime: e.target.value }
                              }))}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <Button 
                    onClick={() => saveSettings('policies')}
                    disabled={saving}
                    className="w-full"
                  >
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Salvar Políticas
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Notificações */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Preferências de Notificação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="email">Notificações por Email</Label>
                    <p className="text-sm text-gray-600">Receber notificações por email</p>
                  </div>
                  <Switch
                    id="email"
                    checked={notifications.email}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, email: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="push">Notificações Push</Label>
                    <p className="text-sm text-gray-600">Receber notificações push no navegador</p>
                  </div>
                  <Switch
                    id="push"
                    checked={notifications.push}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, push: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="sms">Notificações SMS</Label>
                    <p className="text-sm text-gray-600">Receber notificações por SMS</p>
                  </div>
                  <Switch
                    id="sms"
                    checked={notifications.sms}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, sms: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="digest">Digest Diário</Label>
                    <p className="text-sm text-gray-600">Receber resumo diário das atividades</p>
                  </div>
                  <Switch
                    id="digest"
                    checked={notifications.digest}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, digest: checked }))}
                  />
                </div>
              </div>

              <Button 
                onClick={() => saveSettings('notifications')}
                disabled={saving}
                className="w-full"
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Salvar Preferências
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
