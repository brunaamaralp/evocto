import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Project } from '@/api/entities';
import { UploadFile } from '@/api/integrations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Save, 
  Upload, 
  Palette, 
  Clock, 
  Globe, 
  Mail,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Settings as SettingsIcon
} from 'lucide-react';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { useAuthorization } from '../components/auth/useAuthorization';

const timezones = [
  { value: 'America/Sao_Paulo', label: 'São Paulo (GMT-3)' },
  { value: 'America/New_York', label: 'New York (GMT-5)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (GMT-8)' },
  { value: 'Europe/London', label: 'London (GMT+0)' },
  { value: 'Europe/Paris', label: 'Paris (GMT+1)' },
  { value: 'UTC', label: 'UTC (GMT+0)' }
];

export default function ProjectSettings() {
  const location = useLocation();
  const navigate = useNavigate();
  const { authorize } = useAuthorization();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    timezone: 'America/Sao_Paulo',
    locale: 'pt-BR',
    branding: {
      logo_url: '',
      primary_color: '#2563EB',
      company_name: ''
    },
    notifications: {
      default_emails: [],
      approval_emails: [],
      send_reminders: true
    }
  });

  const projectId = new URLSearchParams(location.search).get('id');

  useEffect(() => {
    if (projectId) {
      loadProject();
    } else {
      setError('ID do projeto não encontrado.');
      setLoading(false);
    }
  }, [projectId]);

  const loadProject = async () => {
    if (!authorize('project:edit')) return;
    
    setLoading(true);
    try {
      const projectData = await Project.get(projectId);
      setProject(projectData);
      
      // Initialize form with existing settings or defaults
      const settings = projectData.settings || {};
      setFormData({
        timezone: settings.timezone || 'America/Sao_Paulo',
        locale: settings.locale || 'pt-BR',
        branding: {
          logo_url: settings.branding?.logo_url || '',
          primary_color: settings.branding?.primary_color || '#2563EB',
          company_name: settings.branding?.company_name || ''
        },
        notifications: {
          default_emails: settings.notifications?.default_emails || [],
          approval_emails: settings.notifications?.approval_emails || [],
          send_reminders: settings.notifications?.send_reminders !== false
        }
      });
    } catch (error) {
      console.error('Erro ao carregar projeto:', error);
      setError('Erro ao carregar projeto.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!authorize('project:edit')) return;
    
    setSaving(true);
    setError('');
    
    try {
      await Project.update(projectId, {
        settings: formData
      });
      
      toast.success('Configurações salvas com sucesso!');
      navigate(createPageUrl('Projects'));
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      setError('Erro ao salvar configurações. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem válida.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      toast.error('A imagem deve ter no máximo 5MB.');
      return;
    }

    setUploadingLogo(true);
    try {
      const { file_url } = await UploadFile({ file });
      setFormData(prev => ({
        ...prev,
        branding: {
          ...prev.branding,
          logo_url: file_url
        }
      }));
      toast.success('Logo carregado com sucesso!');
    } catch (error) {
      console.error('Erro ao fazer upload do logo:', error);
      toast.error('Erro ao fazer upload do logo.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleEmailsChange = (field, value) => {
    const emails = value.split(',').map(email => email.trim()).filter(email => email);
    setFormData(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [field]: emails
      }
    }));
  };

  const validateEmails = (emails) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emails.every(email => emailRegex.test(email));
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate(createPageUrl('Projects'))}
          className="p-2"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Configurações do Projeto</h1>
          <p className="text-slate-600 mt-1">{project?.title}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Timezone & Language */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Regionalização
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timezone">Fuso Horário</Label>
                  <Select
                    value={formData.timezone}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, timezone: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o fuso horário" />
                    </SelectTrigger>
                    <SelectContent>
                      {timezones.map(tz => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="locale">Idioma</Label>
                  <Select
                    value={formData.locale}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, locale: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o idioma" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                      <SelectItem value="en-US">English (US)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Branding */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Identidade Visual
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company_name">Nome da Empresa</Label>
                <Input
                  id="company_name"
                  value={formData.branding.company_name}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    branding: { ...prev.branding, company_name: e.target.value }
                  }))}
                  placeholder="Nome para exibição nos documentos"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primary_color">Cor Primária</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      id="primary_color"
                      value={formData.branding.primary_color}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        branding: { ...prev.branding, primary_color: e.target.value }
                      }))}
                      className="w-12 h-10 border border-slate-300 rounded-md cursor-pointer"
                    />
                    <Input
                      value={formData.branding.primary_color}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        branding: { ...prev.branding, primary_color: e.target.value }
                      }))}
                      placeholder="#2563EB"
                      className="flex-1"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="logo">Logo da Empresa</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      id="logo"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('logo').click()}
                      disabled={uploadingLogo}
                      className="flex-1"
                    >
                      {uploadingLogo ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      {formData.branding.logo_url ? 'Alterar Logo' : 'Carregar Logo'}
                    </Button>
                  </div>
                  {formData.branding.logo_url && (
                    <div className="mt-2">
                      <img
                        src={formData.branding.logo_url}
                        alt="Logo preview"
                        className="h-12 object-contain border border-slate-200 rounded-md p-1"
                      />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Notificações por Email
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="default_emails">Emails Padrão</Label>
                <Textarea
                  id="default_emails"
                  value={formData.notifications.default_emails.join(', ')}
                  onChange={(e) => handleEmailsChange('default_emails', e.target.value)}
                  placeholder="email1@empresa.com, email2@empresa.com"
                  rows={2}
                />
                <p className="text-sm text-slate-500">
                  Emails que receberão todas as notificações do projeto
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="approval_emails">Emails de Aprovação</Label>
                <Textarea
                  id="approval_emails"
                  value={formData.notifications.approval_emails.join(', ')}
                  onChange={(e) => handleEmailsChange('approval_emails', e.target.value)}
                  placeholder="aprovador1@cliente.com, aprovador2@cliente.com"
                  rows={2}
                />
                <p className="text-sm text-slate-500">
                  Emails que receberão solicitações de aprovação
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="send_reminders"
                  checked={formData.notifications.send_reminders}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    notifications: { ...prev.notifications, send_reminders: e.target.checked }
                  }))}
                  className="rounded"
                />
                <Label htmlFor="send_reminders" className="text-sm">
                  Enviar lembretes automáticos
                </Label>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <div className="space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <SettingsIcon className="w-5 h-5" />
                Prévia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border border-slate-200 rounded-lg bg-slate-50">
                <div className="flex items-center gap-2 mb-3">
                  {formData.branding.logo_url && (
                    <img 
                      src={formData.branding.logo_url} 
                      alt="Logo" 
                      className="h-8 object-contain"
                    />
                  )}
                  <div 
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: formData.branding.primary_color }}
                  />
                </div>
                
                <h3 className="font-semibold text-slate-900">
                  {formData.branding.company_name || 'Nome da Empresa'}
                </h3>
                
                <div className="mt-3 space-y-1 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    <span>{timezones.find(tz => tz.value === formData.timezone)?.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="w-3 h-3" />
                    <span>{formData.locale === 'pt-BR' ? 'Português' : 'English'}</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-medium text-slate-900">Emails de Notificação</h4>
                <div className="space-y-1">
                  {formData.notifications.default_emails.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {formData.notifications.default_emails.length} padrão
                    </Badge>
                  )}
                  {formData.notifications.approval_emails.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {formData.notifications.approval_emails.length} aprovação
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </div>
      </div>
    </div>
  );
}