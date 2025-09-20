/**
 * Utilitários de validação centralizados
 * Evita duplicação de lógicas de validação
 */

export const validators = {
  required: (value, fieldName = 'Campo') => {
    if (!value || !value.toString().trim()) {
      return `${fieldName} é obrigatório`;
    }
    return null;
  },

  email: (value) => {
    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return 'Por favor, insira um e-mail válido';
    }
    return null;
  },

  minLength: (min) => (value, fieldName = 'Campo') => {
    if (value && value.length < min) {
      return `${fieldName} deve ter pelo menos ${min} caracteres`;
    }
    return null;
  },

  maxLength: (max) => (value, fieldName = 'Campo') => {
    if (value && value.length > max) {
      return `${fieldName} deve ter no máximo ${max} caracteres`;
    }
    return null;
  },

  cnpj: (value) => {
    if (value) {
      // Remove formatação
      const cleanCnpj = value.replace(/[^\d]/g, '');
      
      if (cleanCnpj.length !== 14) {
        return 'CNPJ deve ter 14 dígitos';
      }
      
      // Validação básica de CNPJ (algoritmo completo seria muito extenso)
      if (/^(\d)\1{13}$/.test(cleanCnpj)) {
        return 'CNPJ inválido';
      }
    }
    return null;
  },

  phone: (value) => {
    if (value) {
      const cleanPhone = value.replace(/[^\d]/g, '');
      if (cleanPhone.length < 10 || cleanPhone.length > 11) {
        return 'Telefone deve ter 10 ou 11 dígitos';
      }
    }
    return null;
  },

  positiveNumber: (value, fieldName = 'Valor') => {
    if (value !== undefined && value !== null && value !== '') {
      const num = parseFloat(value);
      if (isNaN(num) || num < 0) {
        return `${fieldName} deve ser um número positivo`;
      }
    }
    return null;
  }
};

/**
 * Valida múltiplos campos com suas respectivas regras
 */
export const validateFields = (data, fieldRules) => {
  const errors = {};

  Object.keys(fieldRules).forEach(fieldName => {
    const rules = fieldRules[fieldName];
    const value = data[fieldName];

    for (const rule of rules) {
      const error = rule(value, fieldName);
      if (error) {
        errors[fieldName] = error;
        break; // Para no primeiro erro
      }
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Schemas de validação pré-definidos para entidades comuns
 */
export const validationSchemas = {
  client: {
    name: [validators.required, validators.minLength(2)],
    email: [validators.email],
    phone: [validators.phone],
    legal_name: [validators.maxLength(255)]
  },

  service: {
    name: [validators.required, validators.minLength(3)],
    description: [validators.required, validators.minLength(10)],
    category: [validators.required]
  },

  task: {
    title: [validators.required, validators.minLength(3)],
    description: [validators.minLength(5)],
    estimatedHours: [validators.positiveNumber]
  }
};