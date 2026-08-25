
import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Building, Users, Settings, Palette, Mail, 
  Phone, Globe, Upload, Save, Plus, Edit,
  UserPlus, RefreshCw, Trash2, Shield, Crown
} from 'lucide-react';
import { toast } from 'sonner';
import { useT } from '@/components/i18n/I18nProvider';
import TeamMemberManagement from '@/components/team/TeamMemberManagement';
import InvitesPanel from '@/components/team/InvitesPanel';
import { Agency } from '@/api/entities';

export default function AgencyManagementPage() {
  const { user, agency, agencyId, isOwner, isAdmin } = useSession();
  const t = useT();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  
  // Estados para informações da agência
  const [agencyData, setAgencyData] = useState({
    agencyName: '',
    logoUrl: '',
    primaryColor: '#2563EB',
    secondaryColor: '#F1F5F9',
    contactEmail: '',
    contactPhone: ''
  });

  // MOVER useEffect ANTES da verificação de permissões para evitar hook condicional
  // Carregar dados da agência
  useEffect(() => {
    if (agency) {
      setAgencyData({
        agencyName: agency.agencyName || '',
        logoUrl: agency.logoUrl || '',
        primaryColor: agency.primaryColor || '#2563EB',
        secondaryColor: agency.secondaryColor || '#F1F5F9',
        contactEmail: agency.contactEmail || '',
        contactPhone: agency.contactPhone || ''
      });
    }
  }, [agency]);

  const handleSaveAgency = async () => {
    if (!agencyId) {
      toast.error('ID da agência não encontrado');
      return;
    }

    try {
      setSaving(true);
      
      await Agency.update(agencyId, agencyData);
      toast.success('Informações da agência atualizadas com sucesso!');
      
    } catch (error) {
      console.error('Erro ao atualizar agência:', error);
      toast.error('Erro ao atualizar informações da agência');
    } finally {
      setSaving(false);
    }
  };

  // Verificar permissões APÓS todos os hooks
  if (!isOwner() && !isAdmin()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Acesso Negado</h2>
          <p className="text-gray-600">Você não tem permissão para acessar o gerenciamento da agência.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Building className="w-8 h-8 text-blue-600" />
            Gerenciar Agência
          </h1>
          <p className="text-gray-600 mt-1">
            Gerencie informações da agência, equipe e configurações
          </p>
        </div>

        {/* Tabs principais */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
            <TabsTrigger value="info" className="flex items-center gap-2">
              <Building className="w-4 h-4" />
              Agência
            </TabsTrigger>
            
            <TabsTrigger value="team" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Equipe
            </TabsTrigger>
            
            <TabsTrigger value="branding" className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Visual
            </TabsTrigger>
            
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Configurações
            </TabsTrigger>
          </TabsList>

          {/* Aba Informações da Agência */}
          <TabsContent value="info" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  Informações Básicas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="agencyName">Nome da Agência</Label>
                  <Input
                    id="agencyName"
                    value={agencyData.agencyName}
                    onChange={(e) => setAgencyData(prev => ({ ...prev, agencyName: e.target.value }))}
                    placeholder="Nome da sua agência"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contactEmail">Email de Contato</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={agencyData.contactEmail}
                      onChange={(e) => setAgencyData(prev => ({ ...prev, contactEmail: e.target.value }))}
                      placeholder="contato@agencia.com"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="contactPhone">Telefone</Label>
                    <Input
                      id="contactPhone"
                      value={agencyData.contactPhone}
                      onChange={(e) => setAgencyData(prev => ({ ...prev, contactPhone: e.target.value }))}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveAgency} disabled={saving}>
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Salvando...' : 'Salvar Informações'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Estatísticas Rápidas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6 text-center">
                  <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">
                    {/* TODO: Implementar contador real */}
                    -
                  </div>
                  <div className="text-sm text-gray-600">Membros da Equipe</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <Mail className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">
                    {/* TODO: Implementar contador real */}
                    -
                  </div>
                  <div className="text-sm text-gray-600">Convites Pendentes</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <Shield className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">
                    {user?.role === 'owner' ? 'Owner' : 'Admin'}
                  </div>
                  <div className="text-sm text-gray-600">Seu Nível de Acesso</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Aba Equipe */}
          <TabsContent value="team" className="space-y-6">
            {/* Gerenciamento de Membros */}
            <TeamMemberManagement />
            
            <Separator />
            
            {/* Painel de Convites */}
            <InvitesPanel />
          </TabsContent>

          {/* Aba Visual/Branding */}
          <TabsContent value="branding" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Identidade Visual
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="logoUrl" className="text-sm">URL do Logo</Label>
                  <div className="flex gap-2">
                    <Input
                      id="logoUrl"
                      value={agencyData.logoUrl}
                      onChange={(e) => setAgencyData(prev => ({ ...prev, logoUrl: e.target.value }))}
                      placeholder="https://..."
                    />
                    <Button variant="outline" size="icon">
                      <Upload className="w-4 h-4" />
                    </Button>
                  </div>
                  {agencyData.logoUrl && (
                    <div className="mt-2">
                      <img 
                        src={agencyData.logoUrl} 
                        alt="Preview do logo" 
                        className="h-16 object-contain"
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="primaryColor" className="text-sm">Cor Principal</Label>
                    <div className="flex gap-2 items-center">
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
                        placeholder="#2563EB"
                        className="font-mono"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="secondaryColor" className="text-sm">Cor Secundária</Label>
                    <div className="flex gap-2 items-center">
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
                        placeholder="#F1F5F9"
                        className="font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveAgency} disabled={saving}>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Visual
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Preview das cores */}
            <Card>
              <CardHeader>
                <CardTitle>Preview das Cores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div 
                    className="h-24 rounded-lg flex items-center justify-center text-white font-semibold"
                    style={{ backgroundColor: agencyData.primaryColor }}
                  >
                    Cor Principal
                  </div>
                  <div 
                    className="h-24 rounded-lg flex items-center justify-center font-semibold"
                    style={{ 
                      backgroundColor: agencyData.secondaryColor,
                      color: agencyData.primaryColor
                    }}
                  >
                    Cor Secundária
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Configurações */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Configurações Avançadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center py-8 text-gray-500">
                    <Settings className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Configurações avançadas em desenvolvimento...</p>
                    <p className="text-sm">Em breve: políticas, integrações, automações</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
