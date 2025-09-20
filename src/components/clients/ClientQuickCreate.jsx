import React, { useState } from 'react';
import { Client } from '@/api/entities';
import { useSession } from '@/components/auth/SessionManager';
import { Button } from '@/components/ui/button';
import { ValidatedInput, CNPJInput, PhoneInput, EmailInput } from '@/components/ui/ValidatedInput';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Save, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useClientValidation } from '@/hooks/useClientValidation';
import { useErrorHandling, useFormErrorHandling } from '@/hooks/useErrorHandling';
import { useAgencyValidation } from '@/hooks/useAgencyValidation';
import { useExitConfirmation } from '@/hooks/useExitConfirmation';
import { useFormRateLimit } from '@/hooks/useRateLimit';
import { useClientUserCreation } from '@/hooks/useClientUserCreation';
import ClientLoginConfig from './ClientLoginConfig';
import { toast } from 'sonner';

export default function ClientQuickCreate({ onClientCreated, triggerButton = null }) {
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('form'); // 'form' | 'login_config'
  
  // Hooks centralizados
  const {
    validateForm,
    validateFieldRealTime,
    formatCNPJ,
    formatPhone,
    clearErrors: clearValidationErrors,
    showValidationErrors,
    checkDuplicates,
    sanitizeData,
    handleSpecificError
  } = useClientValidation();

  const { handleError, handleValidationError } = useErrorHandling();
  const { 
    fieldErrors, 
    clearAllFieldErrors, 
    handleFormError 
  } = useFormErrorHandling();
  
  const { validateAgencyWithFeedback, getValidAgencyId } = useAgencyValidation();
  
  // Hook para criação de usuários
  const { createClientWithUser, createClientOnly } = useClientUserCreation();
  
  // Confirmação de saída
  const { handleExitAttempt: handleCloseWithConfirmation } = useExitConfirmation(
    open,
    formData.name || formData.legal_name || formData.email, // Tem dados preenchidos
    () => {
      setOpen(false);
      setStep('form'); // Reset step
    },
    {
      message: 'Você tem dados preenchidos. Deseja realmente fechar sem salvar?'
    }
  );
  
  // Rate limiting para formulário
  const { submitWithRateLimit } = useFormRateLimit({
    maxRequests: 3,
    windowMs: 30000 // 30 segundos
  });

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

  const [fieldValidationErrors, setFieldValidationErrors] = useState({});

  // Atualizar campo com validação em tempo real
  const handleFieldChange = (field, value) => {
    // Sanitizar dados antes de atualizar
    const sanitizedValue = field === 'email' ? value.toLowerCase().trim() : value.trim();
    setFormData(prev => ({ ...prev, [field]: sanitizedValue }));
    
    // Validação em tempo real
    const error = validateFieldRealTime(field, sanitizedValue);
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

  // Formatar campos automaticamente (mantido para compatibilidade)
  const handleCNPJChange = (value) => {
    const formatted = formatCNPJ(value);
    handleFieldChange('cnpj', formatted);
  };

  const handlePhoneChange = (value) => {
    const formatted = formatPhone(value);
    handleFieldChange('phone', formatted);
  };

  const handleFormSubmit = async (e) => {
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

    // Verificar duplicatas
    try {
      const duplicates = await checkDuplicates(formData);
      if (duplicates.length > 0) {
        duplicates.forEach(duplicate => {
          if (duplicate.includes('Email')) {
            setFieldValidationErrors(prev => ({ ...prev, email: duplicate }));
          } else if (duplicate.includes('CNPJ')) {
            setFieldValidationErrors(prev => ({ ...prev, cnpj: duplicate }));
          } else if (duplicate.includes('Nome')) {
            setFieldValidationErrors(prev => ({ ...prev, name: duplicate }));
          }
        });
        toast.error('Dados duplicados encontrados:', {
          description: duplicates.join('; ')
        });
        return;
      }
    } catch (duplicateError) {
      console.error('Erro ao verificar duplicatas:', duplicateError);
      toast.warning('Não foi possível verificar duplicatas. Continuando...');
    }

    // Verificar agência do usuário
    if (!validateAgencyWithFeedback()) {
      return;
    }

    // Ir para configuração de login
    setStep('login_config');
  };

  const handleLoginConfigSuccess = (result) => {
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
    
    setStep('form');
    setOpen(false);
    
    // Callback para atualizar a lista
    if (onClientCreated) {
      onClientCreated(result.client);
    }

    // Mostrar informações sobre senha temporária se aplicável
    if (result.temporaryPassword) {
      toast.success(
        `Cliente criado! Senha temporária: ${result.temporaryPassword}`,
        { duration: 10000 }
      );
    }
  };

  const handleLoginConfigCancel = () => {
    setStep('form');
  };

  const defaultTrigger = (
    <Button>
      <Plus className="w-4 h-4 mr-2" />
      Novo Cliente
    </Button>
  );

  const hasFieldError = (field) => {
    return fieldValidationErrors[field] || fieldErrors[field];
  };

  const getFieldError = (field) => {
    return fieldValidationErrors[field] || fieldErrors[field];
  };

  return (
    <Dialog open={open} onOpenChange={handleCloseWithConfirmation}>
      <DialogTrigger asChild>
        {triggerButton || defaultTrigger}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            {step === 'form' ? 'Criar Novo Cliente' : 'Configuração de Login'}
          </DialogTitle>
        </DialogHeader>
        
        {step === 'form' ? (
          <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <ValidatedInput
              id="name"
              label="Nome Fantasia"
                value={formData.name}
              onChange={(value) => handleFieldChange('name', value)}
                placeholder="Ex: Empresa ABC Ltda"
                required
              validate={(value) => {
                if (!value.trim()) return 'Nome é obrigatório';
                if (value.length < 2) return 'Nome deve ter pelo menos 2 caracteres';
                if (value.length > 100) return 'Nome deve ter no máximo 100 caracteres';
                return null;
              }}
            />

            <ValidatedInput
              id="legal_name"
              label="Razão Social"
                value={formData.legal_name}
              onChange={(value) => handleFieldChange('legal_name', value)}
                placeholder="Razão social completa"
                required
              validate={(value) => {
                if (!value.trim()) return 'Razão social é obrigatória';
                if (value.length < 2) return 'Razão social deve ter pelo menos 2 caracteres';
                if (value.length > 200) return 'Razão social deve ter no máximo 200 caracteres';
                return null;
              }}
            />

            <div className="grid grid-cols-2 gap-3">
              <CNPJInput
                id="cnpj"
                label="CNPJ"
                  value={formData.cnpj}
                onChange={(value) => handleFieldChange('cnpj', value)}
              />

              <EmailInput
                id="email"
                label="Email"
                  value={formData.email}
                onChange={(value) => handleFieldChange('email', value)}
              />
            </div>

            <PhoneInput
              id="phone"
              label="Telefone"
              value={formData.phone}
              onChange={(value) => handleFieldChange('phone', value)}
            />

            <ValidatedInput
              id="sector"
              label="Setor de Atuação"
                value={formData.sector}
              onChange={(value) => handleFieldChange('sector', value)}
                placeholder="Ex: Varejo, Tecnologia, Indústria"
              validate={(value) => {
                if (value && value.length > 100) return 'Setor deve ter no máximo 100 caracteres';
                return null;
              }}
              />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium">Porte da Empresa</Label>
                <Select
                  value={formData.company_size}
                  onValueChange={(value) => handleFieldChange('company_size', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
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

              <div>
                <Label className="text-sm font-medium">Faixa de Faturamento</Label>
                <Select
                  value={formData.revenue_range}
                  onValueChange={(value) => handleFieldChange('revenue_range', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ate_1m">Até R$ 1M</SelectItem>
                    <SelectItem value="1m_5m">R$ 1M - 5M</SelectItem>
                    <SelectItem value="5m_20m">R$ 5M - 20M</SelectItem>
                    <SelectItem value="20m_100m">R$ 20M - 100M</SelectItem>
                    <SelectItem value="acima_100m">Acima R$ 100M</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Validando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Próximo Passo
                  </>
                )}
              </Button>
            </div>
          </form>
        ) : (
          <ClientLoginConfig
            clientData={{
              ...sanitizeData(formData),
              agencyId: getValidAgencyId()
            }}
            onSuccess={handleLoginConfigSuccess}
            onCancel={handleLoginConfigCancel}
            mode="create"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}