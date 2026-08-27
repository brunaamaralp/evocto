import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { Service } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
} from '@/components/ui/dialog';
import { 
  Save, AlertTriangle, Calendar, DollarSign, Users, 
  Target, Clock, FileText, Settings, LayoutTemplate, X,
  Briefcase
} from 'lucide-react';
import { toast } from 'sonner';
import { SERVICE_CATEGORIES } from '@/constants/serviceCategories';

const SERVICE_STATUS_OPTIONS = [
  { value: 'draft', label: 'Rascunho', color: 'bg-gray-100 text-gray-800' },
  { value: 'active', label: 'Ativo', color: 'bg-green-100 text-green-800' },
  { value: 'on_hold', label: 'Em Pausa', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'completed', label: 'Concluído', color: 'bg-blue-100 text-blue-800' },
  { value: 'cancelled', label: 'Cancelado', color: 'bg-red-100 text-red-800' }
];

/**
 * Modal para criação e edição de INSTÂNCIAS de serviço
 * Instâncias são serviços específicos para um cliente
 */
export default function ServiceInstanceEditor({ 
  isOpen, 
  onClose, 
  serviceInstance = null,
  clients = [],
  templates = [],
  onSaved 
}) {
  const { user, agencyId } = useSession();
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    version: '1.0',
    clientId: '',
    start_date: '',
    end_date: '',
    service_status: 'draft',
    contract_value: 0,
    pricing: {
      type: 'fixed',
      base_price: 0,
      currency: 'BRL',
      billing_cycle: 'one_time'
    },
    cycle_frequency: 'monthly',
    is_active: true,
    base_service_id: null,
    template_version_used: null
  });

  const [selectedTemplate, setSelectedTemplate] = useState(null);

  useEffect(() => {
    if (serviceInstance && isOpen) {
      // Editando instância existente
      setFormData({
        name: serviceInstance.name || '',
        description: serviceInstance.description || '',
        category: serviceInstance.category || '',
        version: serviceInstance.version || '1.0',
        clientId: serviceInstance.clientId || '',
        start_date: serviceInstance.start_date || '',
        end_date: serviceInstance.end_date || '',
        service_status: serviceInstance.service_status || 'draft',
        contract_value: serviceInstance.contract_value || 0,
        pricing: serviceInstance.pricing || {
          type: 'fixed',
          base_price: 0,
          currency: 'BRL',
          billing_cycle: 'one_time'
        },
        cycle_frequency: serviceInstance.cycle_frequency || 'monthly',
        is_active: serviceInstance.is_active !== false,
        base_service_id: serviceInstance.base_service_id,
        template_version_used: serviceInstance.template_version_used
      });

      // Se baseado em template, carregar o template
      if (serviceInstance.base_service_id) {
        const template = templates.find(t => t.id === serviceInstance.base_service_id);
        setSelectedTemplate(template);
      }
    } else if (!serviceInstance && isOpen) {
      // Nova instância - resetar form
      setFormData({
        name: '',
        description: '',
        category: '',
        version: '1.0',
        clientId: '',
        start_date: '',
        end_date: '',
        service_status: 'draft',
        contract_value: 0,
        pricing: {
          type: 'fixed',
          base_price: 0,
          currency: 'BRL',
          billing_cycle: 'one_time'
        },
        cycle_frequency: 'monthly',
        is_active: true,
        base_service_id: null,
        template_version_used: null
      });
      setSelectedTemplate(null);
    }
  }, [serviceInstance, isOpen, templates]);

  const handleTemplateChange = (templateId) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      setFormData(prev => ({
        ...prev,
        name: template.name,
        description: template.description,
        category: template.category,
        pricing: template.pricing,
        cycle_frequency: template.cycle_frequency,
        base_service_id: template.id,
        template_version_used: template.version
      }));
    } else {
      setSelectedTemplate(null);
      setFormData(prev => ({
        ...prev,
        base_service_id: null,
        template_version_used: null
      }));
    }
  };

  const validateService = () => {
    const errors = [];

    if (!formData.name.trim()) {
      errors.push('Nome do serviço é obrigatório');
    }

    if (!formData.clientId) {
      errors.push('Cliente é obrigatório');
    }

    if (!formData.category) {
      errors.push('Categoria é obrigatória');
    }

    if (formData.service_status === 'active' && !formData.start_date) {
      errors.push('Data de início é obrigatória para serviços ativos');
    }

    return errors;
  };

  const handleSave = async () => {
    const validationErrors = validateService();
    
    if (validationErrors.length > 0) {
      toast.error('Corrija os erros antes de salvar:', {
        description: validationErrors.join('; ')
      });
      return;
    }

    setSaving(true);
    try {
      // IMPORTANTE: Garantir que é uma instância
      const instanceData = {
        ...formData,
        agencyId,
        is_template: false,       // FORÇAR como instância
        // Garantir metadados corretos de instância
        template_metadata: null,  // Instâncias não têm metadados de template
        instance_metadata: {
          created_from_template: formData.base_service_id,
          account_manager: user?.id,
          project_code: generateProjectCode(formData.clientId, formData.name)
        }
      };

      let savedService;
      if (serviceInstance) {
        savedService = await Service.update(serviceInstance.id, instanceData);
        toast.success('Serviço atualizado com sucesso!');
      } else {
        savedService = await Service.create(instanceData);
        toast.success('Serviço criado com sucesso!');
      }

      if (onSaved) {
        onSaved(savedService);
      }
      
      onClose();
    } catch (error) {
      console.error('Erro ao salvar serviço:', error);
      toast.error('Erro ao salvar serviço');
    } finally {
      setSaving(false);
    }
  };

  const generateProjectCode = (clientId, serviceName) => {
    const client = clients.find(c => c.id === clientId);
    const clientCode = client?.name?.substring(0, 3).toUpperCase() || 'CLI';
    const serviceCode = serviceName?.substring(0, 3).toUpperCase() || 'SRV';
    const year = new Date().getFullYear();
    return `${clientCode}-${serviceCode}-${year}`;
  };

  const getSelectedClient = () => {
    return clients.find(c => c.id === formData.clientId);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              {serviceInstance ? `Editar Serviço: ${serviceInstance.name}` : 'Novo Serviço'}
            </DialogTitle>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Seleção de Template (apenas para novos serviços) */}
          {!serviceInstance && templates.length > 0 && (
            <Card className="border-blue-200 bg-blue-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-800">
                  <LayoutTemplate className="w-5 h-5" />
                  Usar Template (Opcional)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Selecionar Template</Label>
                    <Select
                      value={selectedTemplate?.id || ''}
                      onValueChange={handleTemplateChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Criar do zero ou usar template..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>Criar do zero</SelectItem>
                        {templates.map(template => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name} (v{template.version})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {selectedTemplate && (
                    <div className="flex items-center gap-2 text-sm text-blue-700">
                      <Badge variant="outline" className="border-blue-300">
                        Template: {selectedTemplate.name}
                      </Badge>
                    </div>
                  )}
                </div>
                
                {selectedTemplate && (
                  <div className="mt-3 p-3 bg-blue-100 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Descrição:</strong> {selectedTemplate.description}
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                      Os campos abaixo foram preenchidos com base no template. Você pode ajustá-los conforme necessário.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Template de origem (para edição) */}
          {serviceInstance && formData.base_service_id && (
            <Card className="border-purple-200 bg-purple-50/50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-purple-800">
                  <LayoutTemplate className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    Baseado no template: {selectedTemplate?.name || 'Template não encontrado'}
                    {formData.template_version_used && ` (v${formData.template_version_used})`}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Informações do Serviço
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="service-client">Cliente *</Label>
                <Select
                  value={formData.clientId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, clientId: value }))}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="service-name">Nome do Serviço *</Label>
                  <Input
                    id="service-name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Marketing Operacional 360 - Cliente ABC"
                  />
                </div>

                <div>
                  <Label htmlFor="service-version">Versão</Label>
                  <Input
                    id="service-version"
                    value={formData.version}
                    onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
                    placeholder="1.0"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="service-description">Descrição</Label>
                <Textarea
                  id="service-description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva o escopo específico deste serviço..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Categoria *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SERVICE_CATEGORIES).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Status do Serviço</Label>
                  <Select
                    value={formData.service_status}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, service_status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_STATUS_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <Badge className={option.color}>
                              {option.label}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cronograma e Datas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Cronograma
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start-date">Data de Início</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="end-date">Data de Término Prevista</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                  />
                </div>
              </div>

              {formData.service_status === 'active' && !formData.start_date && (
                <div className="flex items-center gap-2 text-amber-600 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Data de início é obrigatória para serviços ativos</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contrato e Financeiro */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Contrato e Valores
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contract-value">Valor do Contrato (R$)</Label>
                  <Input
                    id="contract-value"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.contract_value}
                    onChange={(e) => setFormData(prev => ({ ...prev, contract_value: parseFloat(e.target.value) || 0 }))}
                  />
                </div>

                <div>
                  <Label>Tipo de Cobrança</Label>
                  <Select
                    value={formData.pricing.type}
                    onValueChange={(value) => setFormData(prev => ({
                      ...prev,
                      pricing: { ...prev.pricing, type: value }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Preço Fixo</SelectItem>
                      <SelectItem value="hourly">Por Hora</SelectItem>
                      <SelectItem value="retainer">Mensalidade</SelectItem>
                      <SelectItem value="success_fee">Taxa de Sucesso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {getSelectedClient() && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Informações do Cliente</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Cliente:</span>
                      <div className="font-semibold">{getSelectedClient().name}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Setor:</span>
                      <div className="font-semibold">{getSelectedClient().sector || 'Não informado'}</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Ações */}
        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {serviceInstance ? 'Atualizar Serviço' : 'Criar Serviço'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}