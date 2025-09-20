import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { X, Plus, Clock, Target, DollarSign, Calendar } from 'lucide-react';
import { toast } from 'sonner';

const categoryOptions = [
  { value: 'gestao_financeira', label: 'Gestão Financeira' },
  { value: 'consultoria_tributaria', label: 'Consultoria Tributária' },
  { value: 'valuation', label: 'Valuation' },
  { value: 'planejamento_financeiro', label: 'Planejamento Financeiro' },
  { value: 'fusao_aquisicao', label: 'Fusão & Aquisição' },
  { value: 'reestruturacao', label: 'Reestruturação' }
];

const commonChannels = [
  'Email Marketing', 'Google Ads', 'Facebook Ads', 'LinkedIn', 
  'SEO', 'Blog', 'YouTube', 'Instagram', 'WhatsApp', 'Website'
];

export default function ServiceOverview({ service, onUpdate, readOnly = false }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedService, setEditedService] = useState(service);

  const handleEdit = () => {
    setEditedService(service);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (onUpdate) {
      onUpdate(editedService);
    }
    setIsEditing(false);
    toast.success('Serviço atualizado com sucesso!');
  };

  const handleCancel = () => {
    setEditedService(service);
    setIsEditing(false);
  };

  const addChannel = (channel) => {
    if (!editedService.channels) {
      setEditedService({
        ...editedService,
        channels: [channel]
      });
    } else if (!editedService.channels.includes(channel)) {
      setEditedService({
        ...editedService,
        channels: [...editedService.channels, channel]
      });
    }
  };

  const removeChannel = (channel) => {
    if (editedService.channels) {
      setEditedService({
        ...editedService,
        channels: editedService.channels.filter(c => c !== channel)
      });
    }
  };

  const updateField = (field, value) => {
    setEditedService({
      ...editedService,
      [field]: value
    });
  };

  const updateNestedField = (parent, field, value) => {
    setEditedService({
      ...editedService,
      [parent]: {
        ...editedService[parent],
        [field]: value
      }
    });
  };

  const currentService = isEditing ? editedService : service;

  return (
    <div className="space-y-6">
      
      {/* Header com ações */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Informações Básicas</CardTitle>
            {!readOnly && (
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Button variant="outline" onClick={handleCancel} size="sm">
                      Cancelar
                    </Button>
                    <Button onClick={handleSave} size="sm">
                      Salvar
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" onClick={handleEdit} size="sm">
                    Editar
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Serviço</Label>
              {isEditing ? (
                <Input
                  id="name"
                  value={currentService.name || ''}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="Ex: Gestão Financeira Mensal"
                />
              ) : (
                <p className="text-sm text-gray-900 py-2">{currentService.name}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              {isEditing ? (
                <Select
                  value={currentService.category}
                  onValueChange={(value) => updateField('category', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge className="bg-blue-100 text-blue-700">
                  {categoryOptions.find(c => c.value === currentService.category)?.label || currentService.category}
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            {isEditing ? (
              <Textarea
                id="description"
                value={currentService.description || ''}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Descreva o que está incluído neste serviço..."
                rows={3}
              />
            ) : (
              <p className="text-sm text-gray-600 leading-relaxed">
                {currentService.description || 'Nenhuma descrição fornecida.'}
              </p>
            )}
          </div>

          {/* Canais (se aplicável) */}
          {currentService.channels && (
            <div className="space-y-2">
              <Label>Canais Atendidos</Label>
              <div className="flex flex-wrap gap-2 mb-3">
                {(currentService.channels || []).map(channel => (
                  <Badge key={channel} variant="secondary" className="flex items-center gap-1">
                    {channel}
                    {isEditing && (
                      <X 
                        className="w-3 h-3 cursor-pointer hover:text-red-500" 
                        onClick={() => removeChannel(channel)}
                      />
                    )}
                  </Badge>
                ))}
              </div>
              
              {isEditing && (
                <Select onValueChange={addChannel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Adicionar canal..." />
                  </SelectTrigger>
                  <SelectContent>
                    {commonChannels
                      .filter(ch => !(currentService.channels || []).includes(ch))
                      .map(channel => (
                        <SelectItem key={channel} value={channel}>
                          {channel}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configurações de Preço e SLA */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Preços e SLAs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Pricing */}
          {currentService.pricing && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Estrutura de Preços</h4>
              
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Cobrança</Label>
                  {isEditing ? (
                    <Select
                      value={currentService.pricing.type}
                      onValueChange={(value) => updateNestedField('pricing', 'type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Valor Fixo</SelectItem>
                        <SelectItem value="hourly">Por Hora</SelectItem>
                        <SelectItem value="retainer">Mensalidade</SelectItem>
                        <SelectItem value="success_fee">Taxa de Sucesso</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline">
                      {currentService.pricing.type === 'fixed' ? 'Valor Fixo' :
                       currentService.pricing.type === 'hourly' ? 'Por Hora' :
                       currentService.pricing.type === 'retainer' ? 'Mensalidade' :
                       currentService.pricing.type === 'success_fee' ? 'Taxa de Sucesso' :
                       currentService.pricing.type}
                    </Badge>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label>Valor Base (R$)</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={currentService.pricing.base_price || 0}
                      onChange={(e) => updateNestedField('pricing', 'base_price', parseFloat(e.target.value) || 0)}
                    />
                  ) : (
                    <p className="text-sm font-medium">
                      R$ {(currentService.pricing.base_price || 0).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label>Ciclo de Cobrança</Label>
                  {isEditing ? (
                    <Select
                      value={currentService.pricing.billing_cycle}
                      onValueChange={(value) => updateNestedField('pricing', 'billing_cycle', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="one_time">Uma vez</SelectItem>
                        <SelectItem value="monthly">Mensal</SelectItem>
                        <SelectItem value="quarterly">Trimestral</SelectItem>
                        <SelectItem value="yearly">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline">
                      {currentService.pricing.billing_cycle === 'one_time' ? 'Uma vez' :
                       currentService.pricing.billing_cycle === 'monthly' ? 'Mensal' :
                       currentService.pricing.billing_cycle === 'quarterly' ? 'Trimestral' :
                       currentService.pricing.billing_cycle === 'yearly' ? 'Anual' :
                       currentService.pricing.billing_cycle}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Status */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Status do Serviço</Label>
              <p className="text-sm text-gray-600">
                {currentService.is_active ? 'Serviço ativo e disponível' : 'Serviço inativo'}
              </p>
            </div>
            {isEditing ? (
              <Switch
                checked={currentService.is_active !== false}
                onCheckedChange={(checked) => updateField('is_active', checked)}
              />
            ) : (
              <Badge variant={currentService.is_active ? "default" : "secondary"}>
                {currentService.is_active ? 'Ativo' : 'Inativo'}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Entregáveis */}
      {currentService.deliverables && currentService.deliverables.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Entregáveis ({currentService.deliverables.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {currentService.deliverables.map((deliverable, index) => (
                <div key={deliverable.id || index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{deliverable.name}</h4>
                    {deliverable.duration_days && (
                      <Badge variant="outline" className="ml-2">
                        <Clock className="w-3 h-3 mr-1" />
                        {deliverable.duration_days} dias
                      </Badge>
                    )}
                  </div>
                  
                  {deliverable.description && (
                    <p className="text-sm text-gray-600 mb-2">
                      {deliverable.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2 flex-wrap">
                    {deliverable.category && (
                      <Badge variant="secondary" className="text-xs">
                        {deliverable.category}
                      </Badge>
                    )}
                    
                    {deliverable.priority && (
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          deliverable.priority === 'high' ? 'border-red-300 text-red-700' :
                          deliverable.priority === 'medium' ? 'border-yellow-300 text-yellow-700' :
                          'border-gray-300 text-gray-700'
                        }`}
                      >
                        {deliverable.priority === 'high' ? 'Alta' :
                         deliverable.priority === 'medium' ? 'Média' : 'Baixa'} prioridade
                      </Badge>
                    )}

                    {deliverable.estimated_hours && (
                      <span className="text-xs text-gray-500">
                        {deliverable.estimated_hours}h estimadas
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}