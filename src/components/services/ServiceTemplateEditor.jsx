
import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/auth/SessionManager';
import { Service } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
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
  Plus, Trash2, Save, Clock, Target, 
  AlertTriangle, CheckCircle, Calendar, Settings, 
  Copy, FileText, Package, BookOpen, GitBranch, X,
  LayoutTemplate, DollarSign // Added LayoutTemplate and DollarSign
} from 'lucide-react';
import { useServiceTemplateValidation } from '@/hooks/useServiceTemplateValidation';
import { useErrorHandling } from '@/hooks/useErrorHandling';
import { useAgencyValidation } from '@/hooks/useAgencyValidation';
import { useExitConfirmation } from '@/hooks/useExitConfirmation';
import { SERVICE_CATEGORIES, DEFAULT_SERVICE_CATEGORY } from '@/constants/serviceCategories';

const CATEGORY_OPTIONS = Object.entries(SERVICE_CATEGORIES).map(([value, label]) => ({ value, label }));

const PRICING_TYPES = [
  { value: 'fixed', label: 'Preço Fixo' },
  { value: 'hourly', label: 'Por Hora' },
  { value: 'retainer', label: 'Mensalidade' },
  { value: 'success_fee', label: 'Taxa de Sucesso' }
];

const CYCLE_FREQUENCIES = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'quarterly', label: 'Trimestral' }
];

/**
 * Modal para criação e edição de TEMPLATES de serviço
 * Templates são modelos reutilizáveis sem cliente específico
 */
export default function ServiceTemplateEditor({ 
  isOpen, 
  onClose, 
  template = null, 
  onSaved 
}) {
  const { user, agencyId } = useSession();
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: DEFAULT_SERVICE_CATEGORY,
    version: '1.0',
    pricing: {
      type: 'fixed',
      base_price: 0,
      currency: 'BRL',
      billing_cycle: 'one_time'
    },
    cycle_frequency: 'monthly',
    is_active: true,
    deliverables: [],
    template_metadata: {
      usage_count: 0,
      last_used: null,
      success_rate: 0,
      average_duration: 0,
      created_by: '',
      tags: []
    }
  });

  useEffect(() => {
    if (template && isOpen) {
      setFormData({
        name: template.name || '',
        description: template.description || '',
        category: template.category || DEFAULT_SERVICE_CATEGORY,
        version: template.version || '1.0',
        pricing: template.pricing || {
          type: 'fixed',
          base_price: 0,
          currency: 'BRL',
          billing_cycle: 'one_time'
        },
        cycle_frequency: template.cycle_frequency || 'monthly',
        is_active: template.is_active !== false,
        deliverables: template.deliverables || [],
        template_metadata: template.template_metadata || {
          usage_count: 0,
          last_used: null,
          success_rate: 0,
          average_duration: 0,
          created_by: template.created_by || user?.email || '',
          tags: []
        }
      });
    } else if (!template && isOpen) {
      // Novo template - resetar form
      setFormData({
        name: '',
        description: '',
        category: DEFAULT_SERVICE_CATEGORY,
        version: '1.0',
        pricing: {
          type: 'fixed',
          base_price: 0,
          currency: 'BRL',
          billing_cycle: 'one_time'
        },
        cycle_frequency: 'monthly',
        is_active: true,
        deliverables: [],
        template_metadata: {
          usage_count: 0,
          last_used: null,
          success_rate: 0,
          average_duration: 0,
          created_by: user?.email || '',
          tags: []
        }
      });
    }
  }, [template, isOpen, user?.email]);

  // Hooks centralizados
  const {
    validateForm,
    sanitizeData,
    handleSpecificError,
    showValidationErrors
  } = useServiceTemplateValidation();

  const { handleError } = useErrorHandling();
  const { validateAgencyWithFeedback, getValidAgencyId } = useAgencyValidation();
  
  // Confirmação de saída
  const { handleExitAttempt: handleCloseWithConfirmation } = useExitConfirmation(
    isOpen,
    formData.name || formData.description, // Tem dados preenchidos
    onClose,
    {
      message: 'Você tem alterações não salvas. Deseja realmente fechar sem salvar?'
    }
  );

  const handleSave = async () => {
    // Sanitizar dados antes de validar
    const sanitizedData = sanitizeData(formData);
    
    // Validar formulário completo
    const validationResult = validateForm(sanitizedData);
    
    if (!validationResult.isValid) {
      showValidationErrors(validationResult);
      return;
    }

    setSaving(true);
    try {
      // Verificar agência antes de salvar
      if (!validateAgencyWithFeedback()) {
        setSaving(false);
        return;
      }

      // IMPORTANTE: Garantir que é um template
      const templateData = {
        ...sanitizedData,
        agencyId: getValidAgencyId(),
        is_template: true,        // FORÇAR como template
        clientId: null,          // Templates NÃO têm cliente
        start_date: null,        // Templates não têm data de início
        end_date: null,
        actual_end_date: null,
        service_status: null,    // Templates não têm status de execução
        contract_value: null,
        contract_terms: null,
        base_service_id: null,
        template_version_used: null,
        instance_metadata: null, // Limpar metadados de instância
        template_metadata: {
          ...sanitizedData.template_metadata,
          created_by: sanitizedData.template_metadata.created_by || user?.email
        }
      };

      let savedTemplate;
      if (template) {
        savedTemplate = await Service.update(template.id, templateData);
        toast.success('Template atualizado com sucesso!');
      } else {
        savedTemplate = await Service.create(templateData);
        toast.success('Template criado com sucesso!');
      }

      if (onSaved) {
        onSaved(savedTemplate);
      }
      
      onClose();
    } catch (error) {
      console.error('Erro ao salvar template:', error);
      
      // Usar tratamento específico de erro
      const errorMessage = handleSpecificError(error);
      handleError(error, {
        action: 'save_template',
        userId: user?.email,
        templateData: sanitizedData
      });
      
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleCloseWithConfirmation}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <LayoutTemplate className="w-5 h-5" />
              {template ? `Editar Template: ${template.name}` : 'Novo Template de Serviço'}
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
          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Informações do Template
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="template-name">Nome do Template *</Label>
                  <Input
                    id="template-name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Marketing Operacional 360"
                  />
                </div>

                <div>
                  <Label htmlFor="template-version">Versão *</Label>
                  <Input
                    id="template-version"
                    value={formData.version}
                    onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
                    placeholder="1.0"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="template-description">Descrição</Label>
                <Textarea
                  id="template-description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva o propósito e escopo deste template..."
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
                      {CATEGORY_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Frequência dos Ciclos</Label>
                  <Select
                    value={formData.cycle_frequency}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, cycle_frequency: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CYCLE_FREQUENCIES.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="template-active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                  <Label htmlFor="template-active">Template Ativo</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Precificação Base */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Precificação Base
                <Badge variant="outline" className="text-xs">
                  Pode ser ajustada por projeto
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Tipo</Label>
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
                      {PRICING_TYPES.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Valor Base (R$)</Label>
                  <Input
                    type="number"
                    value={formData.pricing.base_price}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      pricing: { ...prev.pricing, base_price: parseFloat(e.target.value) || 0 }
                    }))}
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <Label>Ciclo de Cobrança</Label>
                  <Select
                    value={formData.pricing.billing_cycle}
                    onValueChange={(value) => setFormData(prev => ({
                      ...prev,
                      pricing: { ...prev.pricing, billing_cycle: value }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one_time">Único</SelectItem>
                      <SelectItem value="monthly">Mensal</SelectItem>
                      <SelectItem value="quarterly">Trimestral</SelectItem>
                      <SelectItem value="yearly">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Entregáveis - Placeholder por enquanto */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Entregáveis ({formData.deliverables.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {formData.deliverables.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Target className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum entregável configurado</p>
                  <p className="text-sm">Em breve: editor visual de entregáveis</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {formData.deliverables.map((deliverable, index) => (
                    <div key={index} className="border rounded-lg p-3 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <Badge variant="outline">Fase {deliverable.phase || index + 1}</Badge>
                          <h4 className="font-medium mt-1">{deliverable.name || 'Sem nome'}</h4>
                        </div>
                        <div className="text-sm text-gray-600">
                          {deliverable.estimated_hours || 0}h • {deliverable.duration_days || 0}d
                        </div>
                      </div>
                    </div>
                  ))}
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
                {template ? 'Atualizar Template' : 'Criar Template'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
