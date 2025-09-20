/**
 * 🔍 Hook para Validação em Tempo Real do Briefing
 * 
 * Centraliza validação de dados do briefing com feedback imediato
 */

import { useState, useCallback, useEffect } from 'react';

export interface BriefingValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
  score: number;
}

export interface BriefingValidationOptions {
  serviceType: string;
  strictMode?: boolean;
  showWarnings?: boolean;
}

export function useBriefingValidation(options: BriefingValidationOptions) {
  const { serviceType, strictMode = false, showWarnings = true } = options;
  const [validationResult, setValidationResult] = useState<BriefingValidationResult>({
    isValid: false,
    errors: {},
    warnings: {},
    score: 0
  });

  // Obter campos obrigatórios por tipo de serviço
  const getRequiredFields = useCallback((serviceType: string): string[] => {
    const requiredFields = {
      diagnostico_avulso: [
        'disponibilidade_dados',
        'principal_dor',
        'faturamento_mensal_medio',
        'endividamento_total'
      ],
      mentoria_margem: [
        'elasticidade_preco_percebida',
        'capacidade_negociacao_fornecedores',
        'politica_descontos_atual',
        'risco_perda_clientes_com_reajuste'
      ],
      gestao_360: [
        'maturidade_processos',
        'nivel_automatizacao',
        'capacidade_equipe',
        'urgencia_implementacao'
      ]
    };

    return requiredFields[serviceType] || [];
  }, []);

  // Obter valores válidos para campos select
  const getValidValues = useCallback((field: string): string[] => {
    const validValues = {
      disponibilidade_dados: ['baixa', 'media', 'alta'],
      principal_dor: ['fluxo_caixa', 'endividamento', 'lucratividade', 'crescimento'],
      elasticidade_preco_percebida: ['baixa', 'media', 'alta'],
      capacidade_negociacao_fornecedores: ['baixa', 'media', 'alta'],
      politica_descontos_atual: ['conservadora', 'moderada', 'agressiva'],
      risco_perda_clientes_com_reajuste: ['baixo', 'medio', 'alto'],
      maturidade_processos: ['baixa', 'media', 'alta'],
      nivel_automatizacao: ['manual', 'parcial', 'completo'],
      capacidade_equipe: ['limitada', 'adequada', 'excelente'],
      urgencia_implementacao: ['baixa', 'media', 'alta']
    };

    return validValues[field] || [];
  }, []);

  // Validar campo individual
  const validateField = useCallback((field: string, value: any): { error?: string; warning?: string } => {
    const result: { error?: string; warning?: string } = {};

    // Validação de campo obrigatório
    const requiredFields = getRequiredFields(serviceType);
    if (requiredFields.includes(field)) {
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        result.error = `${getFieldLabel(field)} é obrigatório`;
        return result;
      }
    }

    // Se campo está vazio e não é obrigatório, é válido
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return result;
    }

    // Validação de valores válidos para campos select
    const validValues = getValidValues(field);
    if (validValues.length > 0) {
      if (!validValues.includes(value)) {
        result.error = `Valor inválido para ${getFieldLabel(field)}. Valores permitidos: ${validValues.join(', ')}`;
        return result;
      }
    }

    // Validação de campos numéricos
    const numericFields = [
      'faturamento_mensal_medio',
      'endividamento_total',
      'margem_atual',
      'margem_desejada',
      'numero_funcionarios',
      'orcamento_disponivel'
    ];

    if (numericFields.includes(field)) {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) {
        result.error = `${getFieldLabel(field)} deve ser um número válido`;
        return result;
      }
      
      if (numValue < 0) {
        result.warning = `${getFieldLabel(field)} tem valor negativo`;
      }
      
      if (numValue > 10000000) {
        result.warning = `${getFieldLabel(field)} tem valor muito alto`;
      }
    }

    // Validação de campos de texto
    const textFields = [
      'restricoes_tempo',
      'expectativas_cliente',
      'objetivos_especificos'
    ];

    if (textFields.includes(field)) {
      if (typeof value === 'string' && value.length < 10) {
        result.warning = `${getFieldLabel(field)} é muito curto (mínimo 10 caracteres)`;
      }
      
      if (typeof value === 'string' && value.length > 1000) {
        result.error = `${getFieldLabel(field)} é muito longo (máximo 1000 caracteres)`;
        return result;
      }
    }

    return result;
  }, [serviceType, getRequiredFields, getValidValues]);

  // Obter label do campo
  const getFieldLabel = useCallback((field: string): string => {
    const labels = {
      disponibilidade_dados: 'Disponibilidade de Dados',
      principal_dor: 'Principal Dor',
      faturamento_mensal_medio: 'Faturamento Mensal Médio',
      endividamento_total: 'Endividamento Total',
      elasticidade_preco_percebida: 'Elasticidade de Preço Percebida',
      capacidade_negociacao_fornecedores: 'Capacidade de Negociação com Fornecedores',
      politica_descontos_atual: 'Política de Descontos Atual',
      risco_perda_clientes_com_reajuste: 'Risco de Perda de Clientes',
      maturidade_processos: 'Maturidade dos Processos',
      nivel_automatizacao: 'Nível de Automação',
      capacidade_equipe: 'Capacidade da Equipe',
      urgencia_implementacao: 'Urgência de Implementação',
      restricoes_tempo: 'Restrições de Tempo',
      expectativas_cliente: 'Expectativas do Cliente',
      objetivos_especificos: 'Objetivos Específicos',
      canal_venda_predominante: 'Canal de Venda Predominante',
      margem_atual: 'Margem Atual',
      margem_desejada: 'Margem Desejada',
      numero_funcionarios: 'Número de Funcionários',
      orcamento_disponivel: 'Orçamento Disponível'
    };

    return labels[field] || field;
  }, []);

  // Validar dados completos do briefing
  const validateBriefing = useCallback((formData: Record<string, any>): BriefingValidationResult => {
    const errors: Record<string, string> = {};
    const warnings: Record<string, string> = {};
    
    const allFields = Object.keys(formData);
    const requiredFields = getRequiredFields(serviceType);
    
    // Validar cada campo
    allFields.forEach(field => {
      const fieldValidation = validateField(field, formData[field]);
      
      if (fieldValidation.error) {
        errors[field] = fieldValidation.error;
      }
      
      if (fieldValidation.warning && showWarnings) {
        warnings[field] = fieldValidation.warning;
      }
    });

    // Verificar campos obrigatórios ausentes
    requiredFields.forEach(field => {
      if (!allFields.includes(field) || !formData[field]) {
        errors[field] = `${getFieldLabel(field)} é obrigatório`;
      }
    });

    // Calcular score de completude
    const totalFields = requiredFields.length;
    const completedFields = requiredFields.filter(field => 
      formData[field] && (typeof formData[field] !== 'string' || formData[field].trim() !== '')
    ).length;
    
    const score = totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0;

    // Em modo estrito, warnings viram erros
    if (strictMode) {
      Object.keys(warnings).forEach(field => {
        errors[field] = warnings[field];
        delete warnings[field];
      });
    }

    const result: BriefingValidationResult = {
      isValid: Object.keys(errors).length === 0,
      errors,
      warnings,
      score
    };

    setValidationResult(result);
    return result;
  }, [serviceType, getRequiredFields, validateField, getFieldLabel, strictMode, showWarnings]);

  // Validar campo em tempo real
  const validateFieldRealTime = useCallback((field: string, value: any) => {
    const fieldValidation = validateField(field, value);
    
    setValidationResult(prev => ({
      ...prev,
      errors: {
        ...prev.errors,
        [field]: fieldValidation.error || ''
      },
      warnings: {
        ...prev.warnings,
        [field]: fieldValidation.warning || ''
      }
    }));

    return {
      isValid: !fieldValidation.error,
      error: fieldValidation.error,
      warning: fieldValidation.warning
    };
  }, [validateField]);

  // Limpar validação
  const clearValidation = useCallback(() => {
    setValidationResult({
      isValid: false,
      errors: {},
      warnings: {},
      score: 0
    });
  }, []);

  // Verificar se pode submeter
  const canSubmit = useCallback((formData: Record<string, any>): boolean => {
    const validation = validateBriefing(formData);
    return validation.isValid && validation.score >= 80; // Mínimo 80% de completude
  }, [validateBriefing]);

  // Obter estatísticas de validação
  const getValidationStats = useCallback(() => {
    const totalErrors = Object.keys(validationResult.errors).length;
    const totalWarnings = Object.keys(validationResult.warnings).length;
    const requiredFields = getRequiredFields(serviceType);
    
    return {
      totalErrors,
      totalWarnings,
      score: validationResult.score,
      totalRequiredFields: requiredFields.length,
      isValid: validationResult.isValid,
      canSubmit: validationResult.isValid && validationResult.score >= 80
    };
  }, [validationResult, getRequiredFields, serviceType]);

  return {
    validationResult,
    validateBriefing,
    validateFieldRealTime,
    clearValidation,
    canSubmit,
    getValidationStats,
    getRequiredFields: () => getRequiredFields(serviceType),
    getFieldLabel
  };
}

