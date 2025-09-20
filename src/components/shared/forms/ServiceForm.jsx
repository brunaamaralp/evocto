import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { validators, validateFields } from '@/components/utils/validation';

/**
 * Formulário unificado para criação e edição de serviços
 * Substitui múltiplas implementações duplicadas
 */
export default function ServiceForm({ 
  initialData = {}, 
  onDataChange,
  errors = {},
  disabled = false,
  isTemplate = false,
  clients = []
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'gestao_financeira',
    version: '1.0',
    is_template: isTemplate,
    is_active: true,
    clientId: '',
    start_date: '',
    end_date: '',
    pricing: {
      type: 'fixed',
      base_price: 0,
      currency: 'BRL',
      billing_cycle: 'one_time'
    },
    ...initialData
  });

  // Atualizar dados quando initialData mudar
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  // Propagar mudanças para o componente pai
  useEffect(() => {
    if (onDataChange) {
      onDataChange(formData);
    }
  }, [formData, onDataChange]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePricingChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      pricing: { ...prev.pricing, [field]: value }
    }));
  };

  const validateForm = () => {
    return validateFields(formData, {
      name: [validators.required, validators.minLength(3)],
      description: [validators.required, validators.minLength(10)],
      category: [validators.required]
    });
  };

  const categoryLabels = {
    'gestao_financeira': 'Gestão Financeira',
    'consultoria_tributaria': 'Consultoria Tributária',
    'valuation': 'Valuation',
    'planejamento_financeiro': 'Planejamento Financeiro',
    'fusao_aquisicao': 'Fusão & Aquisição',
    'reestruturacao': 'Reestruturação'
  };

  const pricingTypeLabels = {
    'fixed': 'Preço Fixo',
    'hourly': 'Por Hora',
    'retainer': 'Mensalidade',
    'success_fee': 'Taxa de Sucesso'
  };

  const billingCycleLabels = {
    'one_time': 'Único',
    'monthly': 'Mensal',
    'quarterly': 'Trimestral',
    'yearly': 'Anual'
  };

  return (
    <div className="space-y-4">
      {/* Nome do Serviço */}
      <div>
        <Label htmlFor="name">
          Nome do Serviço <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          placeholder="Ex: Diagnóstico Financeiro Completo"
          disabled={disabled}
          className={errors.name ? 'border-red-500' : ''}
        />
        {errors.name && (
          <p className="text-red-500 text-sm mt-1">{errors.name}</p>
        )}
      </div>

      {/* Descrição */}
      <div>
        <Label htmlFor="description">
          Descrição <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Descreva detalhadamente o que este serviço oferece..."
          disabled={disabled}
          className={errors.description ? 'border-red-500' : ''}
          rows={4}
        />
        {errors.description && (
          <p className="text-red-500 text-sm mt-1">{errors.description}</p>
        )}
      </div>

      {/* Categoria e Versão */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="category">
            Categoria <span className="text-red-500">*</span>
          </Label>
          <Select 
            value={formData.category} 
            onValueChange={(value) => handleInputChange('category', value)}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(categoryLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="version">Versão</Label>
          <Input
            id="version"
            value={formData.version}
            onChange={(e) => handleInputChange('version', e.target.value)}
            placeholder="1.0"
            disabled={disabled}
          />
        </div>
      </div>

      {/* Cliente (apenas para instâncias) */}
      {!isTemplate && clients.length > 0 && (
        <div>
          <Label htmlFor="clientId">
            Cliente <span className="text-red-500">*</span>
          </Label>
          <Select 
            value={formData.clientId} 
            onValueChange={(value) => handleInputChange('clientId', value)}
            disabled={disabled}
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
      )}

      {/* Datas (apenas para instâncias) */}
      {!isTemplate && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="start_date">Data de Início</Label>
            <Input
              id="start_date"
              type="date"
              value={formData.start_date}
              onChange={(e) => handleInputChange('start_date', e.target.value)}
              disabled={disabled}
            />
          </div>

          <div>
            <Label htmlFor="end_date">Data de Término (Prevista)</Label>
            <Input
              id="end_date"
              type="date"
              value={formData.end_date}
              onChange={(e) => handleInputChange('end_date', e.target.value)}
              disabled={disabled}
            />
          </div>
        </div>
      )}

      {/* Seção de Pricing */}
      <div className="border-t pt-4">
        <h3 className="font-medium text-gray-900 mb-3">Estrutura de Preços</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="pricing_type">Tipo de Preço</Label>
            <Select 
              value={formData.pricing?.type || 'fixed'} 
              onValueChange={(value) => handlePricingChange('type', value)}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(pricingTypeLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="base_price">Valor Base (R$)</Label>
            <Input
              id="base_price"
              type="number"
              value={formData.pricing?.base_price || ''}
              onChange={(e) => handlePricingChange('base_price', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              disabled={disabled}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <Label htmlFor="currency">Moeda</Label>
            <Select 
              value={formData.pricing?.currency || 'BRL'} 
              onValueChange={(value) => handlePricingChange('currency', value)}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BRL">Real (BRL)</SelectItem>
                <SelectItem value="USD">Dólar (USD)</SelectItem>
                <SelectItem value="EUR">Euro (EUR)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="billing_cycle">Ciclo de Cobrança</Label>
            <Select 
              value={formData.pricing?.billing_cycle || 'one_time'} 
              onValueChange={(value) => handlePricingChange('billing_cycle', value)}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(billingCycleLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}