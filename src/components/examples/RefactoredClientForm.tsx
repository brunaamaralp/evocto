/**
 * 🏢 Exemplo de Uso dos Novos Hooks - Cliente Refatorado
 * 
 * Demonstra como usar os hooks centralizados para criar clientes
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Plus, Save, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Client } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';
import { useClientValidation } from '@/hooks/useClientValidation';
import { useErrorHandling, useFormErrorHandling } from '@/hooks/useErrorHandling';
import { toast } from 'sonner';

interface RefactoredClientFormProps {
  onClientCreated?: (client: any) => void;
  triggerButton?: React.ReactNode;
}

export default function RefactoredClientForm({ 
  onClientCreated, 
  triggerButton 
}: RefactoredClientFormProps) {
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Hooks centralizados
  const {
    validateForm,
    validateFieldRealTime,
    formatCNPJ,
    formatPhone,
    clearErrors: clearValidationErrors,
    showValidationErrors
  } = useClientValidation();

  const { handleError, handleValidationError } = useErrorHandling();
  const { 
    fieldErrors, 
    clearAllFieldErrors, 
    handleFormError 
  } = useFormErrorHandling();

  const [formData, setFormData] = useState({
    name: '',
    legal_name: '',
    cnpj: '',
    email: '',
    phone: '',
    sector: '',
    company_size: 'pequena',
    revenue_range: 'ate_1m',
    status: 'ativo'
  });

  const [fieldValidationErrors, setFieldValidationErrors] = useState<Record<string, string>>({});

  // Atualizar campo com validação em tempo real
  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Validação em tempo real
    const error = validateFieldRealTime(field, value);
    if (error) {
      setFieldValidationErrors(prev => ({ ...prev, [field]: error }));
    } else {
      setFieldValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Formatar campos automaticamente
  const handleCNPJChange = (value: string) => {
    const formatted = formatCNPJ(value);
    handleFieldChange('cnpj', formatted);
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhone(value);
    handleFieldChange('phone', formatted);
  };

  // Submeter formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Limpar erros anteriores
    clearValidationErrors();
    clearAllFieldErrors();
    setFieldValidationErrors({});

    // Validar formulário completo
    const validationResult = validateForm(formData);
    
    if (!validationResult.isValid) {
      showValidationErrors(validationResult);
      
      // Mapear erros para campos específicos
      validationResult.errors.forEach(error => {
        if (error.includes('Nome')) {
          setFieldValidationErrors(prev => ({ ...prev, name: error }));
        } else if (error.includes('Razão Social')) {
          setFieldValidationErrors(prev => ({ ...prev, legal_name: error }));
        } else if (error.includes('Email')) {
          setFieldValidationErrors(prev => ({ ...prev, email: error }));
        } else if (error.includes('CNPJ')) {
          setFieldValidationErrors(prev => ({ ...prev, cnpj: error }));
        } else if (error.includes('Telefone')) {
          setFieldValidationErrors(prev => ({ ...prev, phone: error }));
        }
      });
      
      return;
    }

    // Verificar agência do usuário
    if (!user?.data?.agencyId) {
      handleError(
        new Error('Usuário não tem agência associada'),
        { action: 'create_client', userId: user?.email },
        { customMessage: 'Erro de configuração. Entre em contato com o suporte.' }
      );
      return;
    }

    setLoading(true);

    try {
      const clientData = {
        ...formData,
        agencyId: user.data.agencyId
      };

      const newClient = await Client.create(clientData);
      
      toast.success('Cliente criado com sucesso!');
      
      // Reset form
      setFormData({
        name: '',
        legal_name: '',
        cnpj: '',
        email: '',
        phone: '',
        sector: '',
        company_size: 'pequena',
        revenue_range: 'ate_1m',
        status: 'ativo'
      });
      
      setOpen(false);
      
      // Callback para atualizar a lista
      if (onClientCreated) {
        onClientCreated(newClient);
      }
      
    } catch (error: any) {
      // Usar sistema unificado de tratamento de erros
      handleFormError(error, {
        action: 'create_client',
        userId: user?.email,
        formData: formData
      });
      
    } finally {
      setLoading(false);
    }
  };

  const defaultTrigger = (
    <Button>
      <Plus className="w-4 h-4 mr-2" />
      Novo Cliente
    </Button>
  );

  const hasFieldError = (field: string) => {
    return fieldValidationErrors[field] || fieldErrors[field];
  };

  const getFieldError = (field: string) => {
    return fieldValidationErrors[field] || fieldErrors[field];
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || defaultTrigger}
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Novo Cliente
            <Badge variant="outline" className="text-xs">
              Validação Inteligente
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">
                    Nome da Empresa *
                    {hasFieldError('name') && (
                      <AlertCircle className="w-4 h-4 inline ml-1 text-red-500" />
                    )}
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    placeholder="Ex: Empresa ABC Ltda"
                    className={hasFieldError('name') ? 'border-red-500' : ''}
                  />
                  {getFieldError('name') && (
                    <p className="text-sm text-red-600 mt-1">{getFieldError('name')}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="legal_name">
                    Razão Social *
                    {hasFieldError('legal_name') && (
                      <AlertCircle className="w-4 h-4 inline ml-1 text-red-500" />
                    )}
                  </Label>
                  <Input
                    id="legal_name"
                    value={formData.legal_name}
                    onChange={(e) => handleFieldChange('legal_name', e.target.value)}
                    placeholder="Ex: Empresa ABC Ltda"
                    className={hasFieldError('legal_name') ? 'border-red-500' : ''}
                  />
                  {getFieldError('legal_name') && (
                    <p className="text-sm text-red-600 mt-1">{getFieldError('legal_name')}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cnpj">
                    CNPJ
                    {hasFieldError('cnpj') && (
                      <AlertCircle className="w-4 h-4 inline ml-1 text-red-500" />
                    )}
                  </Label>
                  <Input
                    id="cnpj"
                    value={formData.cnpj}
                    onChange={(e) => handleCNPJChange(e.target.value)}
                    placeholder="00.000.000/0000-00"
                    className={hasFieldError('cnpj') ? 'border-red-500' : ''}
                  />
                  {getFieldError('cnpj') && (
                    <p className="text-sm text-red-600 mt-1">{getFieldError('cnpj')}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="email">
                    Email *
                    {hasFieldError('email') && (
                      <AlertCircle className="w-4 h-4 inline ml-1 text-red-500" />
                    )}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    placeholder="contato@empresa.com"
                    className={hasFieldError('email') ? 'border-red-500' : ''}
                  />
                  {getFieldError('email') && (
                    <p className="text-sm text-red-600 mt-1">{getFieldError('email')}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="phone">
                  Telefone
                  {hasFieldError('phone') && (
                    <AlertCircle className="w-4 h-4 inline ml-1 text-red-500" />
                  )}
                </Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className={hasFieldError('phone') ? 'border-red-500' : ''}
                />
                {getFieldError('phone') && (
                  <p className="text-sm text-red-600 mt-1">{getFieldError('phone')}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Informações Adicionais */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações Adicionais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="sector">Setor</Label>
                <Input
                  id="sector"
                  value={formData.sector}
                  onChange={(e) => handleFieldChange('sector', e.target.value)}
                  placeholder="Ex: Tecnologia, Varejo, Serviços"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company_size">Porte da Empresa</Label>
                  <select
                    id="company_size"
                    value={formData.company_size}
                    onChange={(e) => handleFieldChange('company_size', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="micro">Microempresa</option>
                    <option value="pequena">Pequena</option>
                    <option value="media">Média</option>
                    <option value="grande">Grande</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="revenue_range">Faixa de Receita</Label>
                  <select
                    id="revenue_range"
                    value={formData.revenue_range}
                    onChange={(e) => handleFieldChange('revenue_range', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="ate_1m">Até R$ 1M</option>
                    <option value="1m_5m">R$ 1M - R$ 5M</option>
                    <option value="5m_10m">R$ 5M - R$ 10M</option>
                    <option value="acima_10m">Acima de R$ 10M</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Botões */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {loading ? 'Criando...' : 'Criar Cliente'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

