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
 * Formulário unificado para criação e edição de clientes
 * Substitui múltiplas implementações duplicadas
 */
export default function ClientForm({ 
  initialData = {}, 
  onDataChange,
  errors = {},
  disabled = false
}) {
  const [formData, setFormData] = useState({
    name: '',
    legal_name: '',
    email: '',
    phone: '',
    status: 'prospecto',
    sector: '',
    company_size: '',
    cnpj: '',
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

  const validateForm = () => {
    return validateFields(formData, {
      name: [validators.required, validators.minLength(2)],
      email: [validators.email],
      phone: [validators.phone],
      cnpj: [validators.cnpj]
    });
  };

  return (
    <div className="space-y-4">
      {/* Nome da Empresa */}
      <div>
        <Label htmlFor="name">
          Nome da Empresa <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          placeholder="Ex: Empresa ABC Ltda"
          disabled={disabled}
          className={errors.name ? 'border-red-500' : ''}
        />
        {errors.name && (
          <p className="text-red-500 text-sm mt-1">{errors.name}</p>
        )}
      </div>

      {/* Razão Social */}
      <div>
        <Label htmlFor="legal_name">Razão Social</Label>
        <Input
          id="legal_name"
          value={formData.legal_name}
          onChange={(e) => handleInputChange('legal_name', e.target.value)}
          placeholder="Razão social completa"
          disabled={disabled}
          className={errors.legal_name ? 'border-red-500' : ''}
        />
        {errors.legal_name && (
          <p className="text-red-500 text-sm mt-1">{errors.legal_name}</p>
        )}
      </div>

      {/* CNPJ */}
      <div>
        <Label htmlFor="cnpj">CNPJ</Label>
        <Input
          id="cnpj"
          value={formData.cnpj}
          onChange={(e) => handleInputChange('cnpj', e.target.value)}
          placeholder="00.000.000/0000-00"
          disabled={disabled}
          className={errors.cnpj ? 'border-red-500' : ''}
        />
        {errors.cnpj && (
          <p className="text-red-500 text-sm mt-1">{errors.cnpj}</p>
        )}
      </div>

      {/* Email e Telefone */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="contato@empresa.com"
            disabled={disabled}
            className={errors.email ? 'border-red-500' : ''}
          />
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email}</p>
          )}
        </div>
        
        <div>
          <Label htmlFor="phone">Telefone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            placeholder="(11) 99999-9999"
            disabled={disabled}
            className={errors.phone ? 'border-red-500' : ''}
          />
          {errors.phone && (
            <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
          )}
        </div>
      </div>

      {/* Status e Setor */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="status">
            Status <span className="text-red-500">*</span>
          </Label>
          <Select 
            value={formData.status} 
            onValueChange={(value) => handleInputChange('status', value)}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ativo">🟢 Ativo</SelectItem>
              <SelectItem value="prospecto">🔵 Prospecto</SelectItem>
              <SelectItem value="inativo">🔴 Inativo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="sector">Setor</Label>
          <Input
            id="sector"
            value={formData.sector}
            onChange={(e) => handleInputChange('sector', e.target.value)}
            placeholder="Ex: Tecnologia, Varejo"
            disabled={disabled}
          />
        </div>
      </div>

      {/* Porte da Empresa */}
      <div>
        <Label htmlFor="company_size">Porte da Empresa</Label>
        <Select 
          value={formData.company_size} 
          onValueChange={(value) => handleInputChange('company_size', value)}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o porte" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="startup">Startup</SelectItem>
            <SelectItem value="pequena">Pequena</SelectItem>
            <SelectItem value="media">Média</SelectItem>
            <SelectItem value="grande">Grande</SelectItem>
            <SelectItem value="multinacional">Multinacional</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}