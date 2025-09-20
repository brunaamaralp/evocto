/**
 * 🔧 Hook para Validação de Formulários de Serviço
 * 
 * Centraliza validação de formulários de criação de instâncias de serviço
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export interface ServiceFormData {
  name: string;
  description: string;
  startDate: string;
  endDate?: string;
  contractValue?: number;
  contractTerms?: string;
  teamAssignments?: {
    consultor_lider?: string;
    consultor_apoio?: string[];
    cliente_gestor?: string;
    cliente_aprovador?: string;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function useServiceFormValidation() {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState(false);

  // Validar campo individual
  const validateField = useCallback((field: string, value: any): string | null => {
    switch (field) {
      case 'name':
        if (!value?.trim()) return 'Nome do serviço é obrigatório';
        if (value.trim().length < 3) return 'Nome deve ter pelo menos 3 caracteres';
        if (value.trim().length > 150) return 'Nome deve ter no máximo 150 caracteres';
        return null;

      case 'description':
        if (!value?.trim()) return 'Descrição é obrigatória';
        if (value.trim().length < 10) return 'Descrição deve ter pelo menos 10 caracteres';
        if (value.trim().length > 500) return 'Descrição deve ter no máximo 500 caracteres';
        return null;

      case 'startDate':
        if (!value) return 'Data de início é obrigatória';
        const startDate = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (isNaN(startDate.getTime())) return 'Data de início inválida';
        if (startDate < today) return 'Data de início não pode ser no passado';
        return null;

      case 'endDate':
        if (!value) return null; // Opcional
        const endDate = new Date(value);
        if (isNaN(endDate.getTime())) return 'Data de fim inválida';
        return null;

      case 'contractValue':
        if (value === undefined || value === null) return null; // Opcional
        if (typeof value !== 'number' || isNaN(value)) return 'Valor deve ser um número válido';
        if (value < 0) return 'Valor deve ser positivo';
        if (value > 10000000) return 'Valor muito alto (máximo R$ 10.000.000)';
        return null;

      default:
        return null;
    }
  }, []);

  // Validar formulário completo
  const validateForm = useCallback((formData: ServiceFormData): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const newFieldErrors: Record<string, string> = {};

    // Validar campos obrigatórios
    const nameError = validateField('name', formData.name);
    if (nameError) {
      errors.push(nameError);
      newFieldErrors.name = nameError;
    }

    const descriptionError = validateField('description', formData.description);
    if (descriptionError) {
      errors.push(descriptionError);
      newFieldErrors.description = descriptionError;
    }

    const startDateError = validateField('startDate', formData.startDate);
    if (startDateError) {
      errors.push(startDateError);
      newFieldErrors.startDate = startDateError;
    }

    // Validar campos opcionais
    const endDateError = validateField('endDate', formData.endDate);
    if (endDateError) {
      errors.push(endDateError);
      newFieldErrors.endDate = endDateError;
    }

    const contractValueError = validateField('contractValue', formData.contractValue);
    if (contractValueError) {
      errors.push(contractValueError);
      newFieldErrors.contractValue = contractValueError;
    }

    // Validações de negócio
    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      
      if (endDate <= startDate) {
        errors.push('Data de fim deve ser posterior à data de início');
        newFieldErrors.endDate = 'Data de fim deve ser posterior à data de início';
      }

      // Warning para projetos muito longos
      const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 365) {
        warnings.push('Projeto com duração superior a 1 ano');
      }
    }

    // Validações de equipe
    if (formData.teamAssignments) {
      const { consultor_apoio } = formData.teamAssignments;
      
      if (consultor_apoio && Array.isArray(consultor_apoio)) {
        if (consultor_apoio.length > 5) {
          errors.push('Máximo 5 consultores de apoio');
          newFieldErrors.teamAssignments = 'Máximo 5 consultores de apoio';
        }
      }
    }

    setFieldErrors(newFieldErrors);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }, [validateField]);

  // Validar campo em tempo real
  const validateFieldRealTime = useCallback((field: string, value: any) => {
    const error = validateField(field, value);
    
    setFieldErrors(prev => ({
      ...prev,
      [field]: error || ''
    }));

    return error;
  }, [validateField]);

  // Limpar erros de campo
  const clearFieldError = useCallback((field: string) => {
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  // Limpar todos os erros
  const clearAllErrors = useCallback(() => {
    setFieldErrors({});
  }, []);

  // Mostrar erros de validação
  const showValidationErrors = useCallback((result: ValidationResult) => {
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

  // Verificar se pode prosseguir
  const canProceed = useCallback((formData: ServiceFormData): boolean => {
    const result = validateForm(formData);
    return result.isValid;
  }, [validateForm]);

  return {
    // Estado
    fieldErrors,
    isValidating,
    
    // Validação
    validateForm,
    validateField,
    validateFieldRealTime,
    canProceed,
    
    // Gerenciamento de erros
    clearFieldError,
    clearAllErrors,
    showValidationErrors
  };
}

