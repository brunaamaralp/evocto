/**
 * 🎯 Hook Centralizado de Validação de Templates de Serviço
 * 
 * Centraliza toda a lógica de validação para criação e edição de templates
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

// Tipos para validação
export interface ServiceTemplateValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface DeliverableData {
  id: string;
  title: string;
  description: string;
  estimatedHours: number;
  taskTemplates: TaskTemplateData[];
}

export interface TaskTemplateData {
  id: string;
  title: string;
  description: string;
  estimatedHours: number;
  checklist: ChecklistItemData[];
}

export interface ChecklistItemData {
  id: string;
  text: string;
  required: boolean;
}

export interface KPIData {
  id: string;
  name: string;
  description: string;
  formula: string;
  target: number;
  frequency: string;
}

export interface ServiceTemplateFormData {
  name: string;
  description: string;
  category: string;
  version: string;
  pricing: {
    type: string;
    base_price: number;
    currency: string;
    billing_cycle: string;
  };
  cycle_frequency: string;
  is_active: boolean;
  deliverables: DeliverableData[];
  kpis: KPIData[];
  template_metadata: {
    usage_count: number;
    last_used: string | null;
    success_rate: number;
    average_duration: number;
    created_by: string;
    tags: string[];
  };
}

// Configurações de validação
const VALIDATION_RULES = {
  name: {
    required: true,
    minLength: 3,
    maxLength: 100,
    pattern: /^[a-zA-ZÀ-ÿ0-9\s\-_]+$/,
    message: 'Nome deve conter apenas letras, números, espaços, hífens e underscores (3-100 caracteres)'
  },
  description: {
    required: true,
    minLength: 10,
    maxLength: 500,
    message: 'Descrição deve ter entre 10 e 500 caracteres'
  },
  category: {
    required: true,
    enum: ['gestao_financeira', 'consultoria_tributaria', 'valuation', 'planejamento_financeiro', 'fusao_aquisicao', 'reestruturacao'],
    message: 'Categoria é obrigatória'
  },
  version: {
    required: true,
    pattern: /^\d+\.\d+$/,
    message: 'Versão deve estar no formato X.Y (ex: 1.0)'
  },
  base_price: {
    required: true,
    min: 0,
    message: 'Preço base deve ser um valor positivo'
  },
  cycle_frequency: {
    required: true,
    enum: ['monthly', 'weekly', 'quarterly'],
    message: 'Frequência do ciclo é obrigatória'
  }
};

export function useServiceTemplateValidation() {
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  // Validar campo individual
  const validateField = useCallback((field: string, value: any): string | null => {
    const rule = VALIDATION_RULES[field as keyof typeof VALIDATION_RULES];
    if (!rule) return null;

    // Campo obrigatório vazio
    if (rule.required && (!value || (typeof value === 'string' && !value.trim()))) {
      return `${field} é obrigatório`;
    }

    // Se campo vazio e não obrigatório, é válido
    if ((!value || (typeof value === 'string' && !value.trim())) && !rule.required) {
      return null;
    }

    // Validação de tamanho mínimo
    if (rule.minLength && typeof value === 'string' && value.length < rule.minLength) {
      return `${field} deve ter pelo menos ${rule.minLength} caracteres`;
    }

    // Validação de tamanho máximo
    if (rule.maxLength && typeof value === 'string' && value.length > rule.maxLength) {
      return `${field} deve ter no máximo ${rule.maxLength} caracteres`;
    }

    // Validação de valor mínimo
    if (rule.min !== undefined && typeof value === 'number' && value < rule.min) {
      return `${field} deve ser pelo menos ${rule.min}`;
    }

    // Validação de enum
    if (rule.enum && !rule.enum.includes(value)) {
      return rule.message;
    }

    // Validação de padrão
    if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
      return rule.message;
    }

    return null;
  }, []);

  // Validar deliverable
  const validateDeliverable = useCallback((deliverable: DeliverableData): string[] => {
    const errors: string[] = [];

    if (!deliverable.title?.trim()) {
      errors.push(`Deliverable "${deliverable.id}" deve ter título`);
    }

    if (!deliverable.description?.trim()) {
      errors.push(`Deliverable "${deliverable.id}" deve ter descrição`);
    }

    if (!deliverable.estimatedHours || deliverable.estimatedHours <= 0) {
      errors.push(`Deliverable "${deliverable.id}" deve ter horas estimadas válidas`);
    }

    if (!deliverable.taskTemplates || deliverable.taskTemplates.length === 0) {
      errors.push(`Deliverable "${deliverable.id}" deve ter pelo menos uma tarefa`);
    }

    // Validar task templates
    deliverable.taskTemplates?.forEach((task, index) => {
      if (!task.title?.trim()) {
        errors.push(`Tarefa ${index + 1} do deliverable "${deliverable.id}" deve ter título`);
      }

      if (!task.description?.trim()) {
        errors.push(`Tarefa ${index + 1} do deliverable "${deliverable.id}" deve ter descrição`);
      }

      if (!task.estimatedHours || task.estimatedHours <= 0) {
        errors.push(`Tarefa ${index + 1} do deliverable "${deliverable.id}" deve ter horas estimadas válidas`);
      }

      if (!task.checklist || task.checklist.length === 0) {
        errors.push(`Tarefa ${index + 1} do deliverable "${deliverable.id}" deve ter pelo menos um item no checklist`);
      }

      // Validar checklist
      task.checklist?.forEach((item, itemIndex) => {
        if (!item.text?.trim()) {
          errors.push(`Item ${itemIndex + 1} do checklist da tarefa ${index + 1} deve ter texto`);
        }
      });
    });

    return errors;
  }, []);

  // Validar KPI
  const validateKPI = useCallback((kpi: KPIData): string[] => {
    const errors: string[] = [];

    if (!kpi.name?.trim()) {
      errors.push(`KPI "${kpi.id}" deve ter nome`);
    }

    if (!kpi.description?.trim()) {
      errors.push(`KPI "${kpi.id}" deve ter descrição`);
    }

    if (!kpi.formula?.trim()) {
      errors.push(`KPI "${kpi.id}" deve ter fórmula`);
    }

    if (kpi.target === undefined || kpi.target === null) {
      errors.push(`KPI "${kpi.id}" deve ter valor alvo`);
    }

    if (!kpi.frequency?.trim()) {
      errors.push(`KPI "${kpi.id}" deve ter frequência`);
    }

    return errors;
  }, []);

  // Validar formulário completo
  const validateForm = useCallback((formData: ServiceTemplateFormData): ServiceTemplateValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validar campos básicos
    Object.entries(formData).forEach(([field, value]) => {
      if (field === 'deliverables' || field === 'kpis' || field === 'template_metadata') {
        return; // Validar separadamente
      }

      const error = validateField(field, value);
      if (error) {
        errors.push(error);
      }
    });

    // Validar pricing
    if (formData.pricing) {
      const priceError = validateField('base_price', formData.pricing.base_price);
      if (priceError) {
        errors.push(priceError);
      }
    }

    // Validar deliverables
    if (!formData.deliverables || formData.deliverables.length === 0) {
      errors.push('Template deve ter pelo menos um deliverable');
    } else {
      formData.deliverables.forEach((deliverable, index) => {
        const deliverableErrors = validateDeliverable(deliverable);
        deliverableErrors.forEach(error => {
          errors.push(`Deliverable ${index + 1}: ${error}`);
        });
      });
    }

    // Validar KPIs (opcionais, mas se existirem devem ser válidos)
    if (formData.kpis && formData.kpis.length > 0) {
      formData.kpis.forEach((kpi, index) => {
        const kpiErrors = validateKPI(kpi);
        kpiErrors.forEach(error => {
          errors.push(`KPI ${index + 1}: ${error}`);
        });
      });
    }

    // Validações específicas de negócio
    if (formData.deliverables && formData.deliverables.length > 0) {
      const totalHours = formData.deliverables.reduce((sum, d) => sum + (d.estimatedHours || 0), 0);
      if (totalHours > 1000) {
        warnings.push('Template tem mais de 1000 horas estimadas - considere dividir em módulos menores');
      }

      if (totalHours < 10) {
        warnings.push('Template tem menos de 10 horas estimadas - verifique se está completo');
      }
    }

    // Verificar se há tarefas sem checklist obrigatório
    if (formData.deliverables) {
      formData.deliverables.forEach((deliverable, dIndex) => {
        deliverable.taskTemplates?.forEach((task, tIndex) => {
          const requiredItems = task.checklist?.filter(item => item.required) || [];
          if (requiredItems.length === 0) {
            warnings.push(`Tarefa ${tIndex + 1} do deliverable ${dIndex + 1} não tem itens obrigatórios no checklist`);
          }
        });
      });
    }

    const result: ServiceTemplateValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings
    };

    setValidationErrors(errors);
    setValidationWarnings(warnings);

    return result;
  }, [validateField, validateDeliverable, validateKPI]);

  // Validar etapa específica do wizard
  const validateStep = useCallback((step: number, formData: ServiceTemplateFormData): boolean => {
    switch (step) {
      case 0: // Basic Info
        return !!(formData.name?.trim() && formData.description?.trim() && formData.category?.trim());
      
      case 1: // Deliverables
        return !!(formData.deliverables && formData.deliverables.length > 0);
      
      case 2: // KPIs
        return true; // KPIs são opcionais
      
      case 3: // Settings
        return !!(formData.version?.trim() && formData.pricing?.base_price >= 0);
      
      default:
        return false;
    }
  }, []);

  // Sanitizar dados
  const sanitizeData = useCallback((data: ServiceTemplateFormData): ServiceTemplateFormData => {
    return {
      ...data,
      name: data.name?.trim().replace(/[<>]/g, '') || '',
      description: data.description?.trim().replace(/[<>]/g, '') || '',
      category: data.category?.trim() || '',
      version: data.version?.trim() || '1.0',
      deliverables: data.deliverables?.map(deliverable => ({
        ...deliverable,
        title: deliverable.title?.trim().replace(/[<>]/g, '') || '',
        description: deliverable.description?.trim().replace(/[<>]/g, '') || '',
        taskTemplates: deliverable.taskTemplates?.map(task => ({
          ...task,
          title: task.title?.trim().replace(/[<>]/g, '') || '',
          description: task.description?.trim().replace(/[<>]/g, '') || '',
          checklist: task.checklist?.map(item => ({
            ...item,
            text: item.text?.trim().replace(/[<>]/g, '') || ''
          })) || []
        })) || []
      })) || [],
      kpis: data.kpis?.map(kpi => ({
        ...kpi,
        name: kpi.name?.trim().replace(/[<>]/g, '') || '',
        description: kpi.description?.trim().replace(/[<>]/g, '') || '',
        formula: kpi.formula?.trim().replace(/[<>]/g, '') || ''
      })) || []
    };
  }, []);

  // Tratar erro específico
  const handleSpecificError = useCallback((error: any): string => {
    if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
      return 'Já existe um template com este nome';
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

  // Limpar erros
  const clearErrors = useCallback(() => {
    setValidationErrors([]);
    setValidationWarnings([]);
  }, []);

  // Mostrar erros via toast
  const showValidationErrors = useCallback((result: ServiceTemplateValidationResult) => {
    if (!result.isValid) {
      toast.error('Corrija os erros antes de continuar:', {
        description: result.errors.slice(0, 3).join('; ') + (result.errors.length > 3 ? '...' : '')
      });
    }
    
    if (result.warnings.length > 0) {
      toast.warning('Atenção:', {
        description: result.warnings.slice(0, 2).join('; ') + (result.warnings.length > 2 ? '...' : '')
      });
    }
  }, []);

  return {
    // Estado
    validationErrors,
    validationWarnings,
    
    // Validações
    validateForm,
    validateStep,
    validateDeliverable,
    validateKPI,
    
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

