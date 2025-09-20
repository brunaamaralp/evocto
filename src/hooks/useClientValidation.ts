/**
 * 🏢 Hook Centralizado de Validação de Clientes
 * 
 * Centraliza toda a lógica de validação para criação e edição de clientes
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

// Tipos para validação
export interface ClientValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ClientFormData {
  name: string;
  legal_name: string;
  cnpj: string;
  email: string;
  phone: string;
  sector: string;
  company_size: string;
  revenue_range: string;
  status: string;
}

// Configurações de validação
const VALIDATION_RULES = {
  name: {
    required: true,
    minLength: 2,
    maxLength: 100,
    pattern: /^[a-zA-ZÀ-ÿ\s]+$/,
    message: 'Nome deve conter apenas letras e espaços (2-100 caracteres)'
  },
  legal_name: {
    required: true,
    minLength: 2,
    maxLength: 200,
    pattern: /^[a-zA-ZÀ-ÿ0-9\s\.\-]+$/,
    message: 'Razão social deve conter apenas letras, números e caracteres especiais (2-200 caracteres)'
  },
  cnpj: {
    required: false,
    pattern: /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/,
    message: 'CNPJ deve estar no formato 00.000.000/0000-00'
  },
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Email deve ter formato válido'
  },
  phone: {
    required: false,
    pattern: /^\(\d{2}\)\s\d{4,5}-\d{4}$/,
    message: 'Telefone deve estar no formato (00) 0000-0000'
  },
  sector: {
    required: false,
    maxLength: 100,
    message: 'Setor deve ter no máximo 100 caracteres'
  },
  company_size: {
    required: false,
    enum: ['pequena', 'media', 'grande'],
    message: 'Tamanho da empresa deve ser: pequena, media ou grande'
  },
  revenue_range: {
    required: false,
    enum: ['ate_1m', '1m_10m', '10m_50m', '50m_100m', 'acima_100m'],
    message: 'Faixa de receita inválida'
  },
  status: {
    required: true,
    enum: ['ativo', 'inativo', 'suspenso'],
    message: 'Status deve ser: ativo, inativo ou suspenso'
  }
};

export function useClientValidation() {
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  // Validar CNPJ
  const validateCNPJ = useCallback((cnpj: string): boolean => {
    if (!cnpj) return true; // CNPJ é opcional

    // Remove caracteres não numéricos
    const cleanCNPJ = cnpj.replace(/\D/g, '');
    
    // Verifica se tem 14 dígitos
    if (cleanCNPJ.length !== 14) return false;
    
    // Verifica se não são todos iguais
    if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false;
    
    // Validação dos dígitos verificadores
    let sum = 0;
    let weight = 5;
    
    // Primeiro dígito verificador
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cleanCNPJ[i]) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    
    const firstDigit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (parseInt(cleanCNPJ[12]) !== firstDigit) return false;
    
    // Segundo dígito verificador
    sum = 0;
    weight = 6;
    
    for (let i = 0; i < 13; i++) {
      sum += parseInt(cleanCNPJ[i]) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    
    const secondDigit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    return parseInt(cleanCNPJ[13]) === secondDigit;
  }, []);

  // Validar campo individual
  const validateField = useCallback((field: string, value: string): string | null => {
    const rule = VALIDATION_RULES[field as keyof typeof VALIDATION_RULES];
    if (!rule) return null;

    // Campo obrigatório vazio
    if (rule.required && !value.trim()) {
      return `${field} é obrigatório`;
    }

    // Se campo vazio e não obrigatório, é válido
    if (!value.trim() && !rule.required) {
      return null;
    }

    // Validação de tamanho mínimo
    if (rule.minLength && value.length < rule.minLength) {
      return `${field} deve ter pelo menos ${rule.minLength} caracteres`;
    }

    // Validação de tamanho máximo
    if (rule.maxLength && value.length > rule.maxLength) {
      return `${field} deve ter no máximo ${rule.maxLength} caracteres`;
    }

    // Validação de enum
    if (rule.enum && !rule.enum.includes(value)) {
      return rule.message;
    }

    // Validação de padrão
    if (rule.pattern && !rule.pattern.test(value)) {
      return rule.message;
    }

    // Validação específica para CNPJ
    if (field === 'cnpj' && value && !validateCNPJ(value)) {
      return 'CNPJ inválido';
    }

    return null;
  }, [validateCNPJ]);

  // Validar formulário completo
  const validateForm = useCallback((formData: ClientFormData): ClientValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validar cada campo
    Object.entries(formData).forEach(([field, value]) => {
      const error = validateField(field, value);
      if (error) {
        errors.push(error);
      }
    });

    // Validações específicas de negócio
    if (formData.name && formData.legal_name && formData.name === formData.legal_name) {
      warnings.push('Nome e razão social são iguais - verifique se está correto');
    }

    // Verificar se email já existe (simulação - em produção seria uma consulta à API)
    if (formData.email && formData.email.includes('test@example.com')) {
      warnings.push('Este email pode já estar em uso');
    }

    const result: ClientValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings
    };

    setValidationErrors(errors);
    setValidationWarnings(warnings);

    return result;
  }, [validateField]);

  // Validar em tempo real (para uso em inputs)
  const validateFieldRealTime = useCallback((field: string, value: string): string | null => {
    return validateField(field, value);
  }, [validateField]);

  // Formatar CNPJ
  const formatCNPJ = useCallback((cnpj: string): string => {
    const cleanCNPJ = cnpj.replace(/\D/g, '');
    return cleanCNPJ.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }, []);

  // Formatar telefone
  const formatPhone = useCallback((phone: string): string => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length <= 10) {
      return cleanPhone.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
    } else {
      return cleanPhone.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    }
  }, []);

  // Limpar erros
  const clearErrors = useCallback(() => {
    setValidationErrors([]);
    setValidationWarnings([]);
  }, []);

  // Verificar duplicatas (simulação - em produção seria uma consulta à API)
  const checkDuplicates = useCallback(async (formData: ClientFormData, excludeId?: string): Promise<string[]> => {
    const duplicates: string[] = [];
    
    try {
      // Simular verificação de email duplicado
      if (formData.email) {
        // Em produção: const existingByEmail = await Client.findByEmail(formData.email);
        // if (existingByEmail && existingByEmail.id !== excludeId) {
        //   duplicates.push('Email já está em uso');
        // }
      }
      
      // Simular verificação de CNPJ duplicado
      if (formData.cnpj) {
        // Em produção: const existingByCNPJ = await Client.findByCNPJ(formData.cnpj);
        // if (existingByCNPJ && existingByCNPJ.id !== excludeId) {
        //   duplicates.push('CNPJ já está em uso');
        // }
      }
      
      // Simular verificação de nome duplicado
      if (formData.name) {
        // Em produção: const existingByName = await Client.findByName(formData.name);
        // if (existingByName && existingByName.id !== excludeId) {
        //   duplicates.push('Nome já está em uso');
        // }
      }
      
    } catch (error) {
      console.error('Erro ao verificar duplicatas:', error);
    }
    
    return duplicates;
  }, []);

  // Sanitizar dados
  const sanitizeData = useCallback((data: ClientFormData): ClientFormData => {
    return {
      name: data.name?.trim().replace(/[<>]/g, '') || '',
      legal_name: data.legal_name?.trim().replace(/[<>]/g, '') || '',
      cnpj: data.cnpj?.trim() || '',
      email: data.email?.trim().toLowerCase() || '',
      phone: data.phone?.trim() || '',
      sector: data.sector?.trim().replace(/[<>]/g, '') || '',
      company_size: data.company_size || 'pequena',
      revenue_range: data.revenue_range || 'ate_1m',
      status: data.status || 'ativo'
    };
  }, []);

  // Tratar erro específico
  const handleSpecificError = useCallback((error: any): string => {
    if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
      return 'Já existe um cliente com este CNPJ ou email';
    } else if (error.message?.includes('validation')) {
      return 'Dados inválidos. Verifique as informações preenchidas';
    } else if (error.message?.includes('agency')) {
      return 'Erro de configuração. Entre em contato com o suporte.';
    } else if (error.message?.includes('permission')) {
      return 'Você não tem permissão para realizar esta ação';
    } else if (error.message?.includes('network')) {
      return 'Erro de conexão. Verifique sua internet e tente novamente';
    } else {
      return 'Erro interno. Tente novamente ou entre em contato com o suporte';
    }
  }, []);

  // Mostrar erros via toast
  const showValidationErrors = useCallback((result: ClientValidationResult) => {
    if (!result.isValid) {
      toast.error('Corrija os erros antes de continuar:', {
        description: result.errors.join('; ')
      });
    }
    
    if (result.warnings.length > 0) {
      toast.warning('Atenção:', {
        description: result.warnings.join('; ')
      });
    }
  }, []);

  return {
    // Estado
    validationErrors,
    validationWarnings,
    
    // Validações
    validateForm,
    validateFieldRealTime,
    validateCNPJ,
    checkDuplicates,
    
    // Formatação
    formatCNPJ,
    formatPhone,
    
    // Sanitização e tratamento
    sanitizeData,
    handleSpecificError,
    
    // Utilitários
    clearErrors,
    showValidationErrors,
    
    // Constantes
    VALIDATION_RULES
  };
}
