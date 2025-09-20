/**
 * 🧹 Hook para Sanitização de Dados do Briefing
 * 
 * Centraliza sanitização de dados antes de salvar briefing
 */

import { useCallback } from 'react';

export interface BriefingSanitizationOptions {
  removeHtml?: boolean;
  maxLength?: {
    textField?: number;
    textArea?: number;
    numericField?: number;
  };
  allowedTags?: string[];
  strictMode?: boolean;
}

export function useBriefingSanitization(options: BriefingSanitizationOptions = {}) {
  const {
    removeHtml = true,
    maxLength = {
      textField: 200,
      textArea: 1000,
      numericField: 15
    },
    allowedTags = ['b', 'i', 'em', 'strong'],
    strictMode = false
  } = options;

  // Sanitizar string removendo HTML e limitando tamanho
  const sanitizeString = useCallback((str: string, maxLen?: number): string => {
    if (!str) return '';

    let sanitized = str.trim();

    // Remover HTML se configurado
    if (removeHtml) {
      // Permitir apenas tags específicas se definidas
      if (allowedTags.length > 0) {
        const allowedTagsRegex = new RegExp(`<(?!/?(?:${allowedTags.join('|')})(?:\\s|>))[^>]*>`, 'gi');
        sanitized = sanitized.replace(allowedTagsRegex, '');
      } else {
        // Remover todas as tags HTML
        sanitized = sanitized.replace(/<[^>]*>/g, '');
      }
    }

    // Limitar tamanho
    const maxLengthToUse = maxLen || maxLength.textField;
    if (sanitized.length > maxLengthToUse) {
      sanitized = sanitized.substring(0, maxLengthToUse).trim();
    }

    return sanitized;
  }, [removeHtml, allowedTags, maxLength.textField]);

  // Sanitizar número
  const sanitizeNumber = useCallback((num: any, min: number = 0, max: number = 10000000): number => {
    if (num === null || num === undefined || num === '') return min;
    
    const parsed = parseFloat(num);
    if (isNaN(parsed)) return min;
    
    return Math.max(min, Math.min(max, parsed));
  }, []);

  // Sanitizar valor de select
  const sanitizeSelectValue = useCallback((value: any, allowedValues: string[]): string => {
    if (!value) return '';
    
    const normalized = value.toString().toLowerCase().trim();
    const validValue = allowedValues.find(v => v.toLowerCase() === normalized);
    
    return validValue || '';
  }, []);

  // Sanitizar campo específico do briefing
  const sanitizeBriefingField = useCallback((field: string, value: any, serviceType: string): any => {
    // Campos de texto
    const textFields = [
      'restricoes_tempo',
      'expectativas_cliente',
      'objetivos_especificos',
      'observacoes_adicionais'
    ];

    if (textFields.includes(field)) {
      return sanitizeString(value, maxLength.textArea);
    }

    // Campos numéricos
    const numericFields = [
      'faturamento_mensal_medio',
      'endividamento_total',
      'margem_atual',
      'margem_desejada',
      'numero_funcionarios',
      'orcamento_disponivel'
    ];

    if (numericFields.includes(field)) {
      return sanitizeNumber(value);
    }

    // Campos de select
    const selectFields = {
      disponibilidade_dados: ['baixa', 'media', 'alta'],
      principal_dor: ['fluxo_caixa', 'endividamento', 'lucratividade', 'crescimento'],
      elasticidade_preco_percebida: ['baixa', 'media', 'alta'],
      capacidade_negociacao_fornecedores: ['baixa', 'media', 'alta'],
      politica_descontos_atual: ['conservadora', 'moderada', 'agressiva'],
      risco_perda_clientes_com_reajuste: ['baixo', 'medio', 'alto'],
      maturidade_processos: ['baixa', 'media', 'alta'],
      nivel_automatizacao: ['manual', 'parcial', 'completo'],
      capacidade_equipe: ['limitada', 'adequada', 'excelente'],
      urgencia_implementacao: ['baixa', 'media', 'alta'],
      canal_venda_predominante: ['online', 'fisico', 'hibrido']
    };

    if (selectFields[field]) {
      return sanitizeSelectValue(value, selectFields[field]);
    }

    // Campos de texto simples
    return sanitizeString(value, maxLength.textField);
  }, [sanitizeString, sanitizeNumber, sanitizeSelectValue, maxLength]);

  // Sanitizar dados completos do briefing
  const sanitizeBriefingData = useCallback((briefingData: any): any => {
    if (!briefingData || typeof briefingData !== 'object') return {};

    const sanitized = { ...briefingData };

    // Sanitizar campos básicos
    if (sanitized.id) {
      sanitized.id = sanitizeString(sanitized.id, 50);
    }

    if (sanitized.servico_instancia_id) {
      sanitized.servico_instancia_id = sanitizeString(sanitized.servico_instancia_id, 50);
    }

    if (sanitized.cliente_id) {
      sanitized.cliente_id = sanitizeString(sanitized.cliente_id, 50);
    }

    if (sanitized.servico_tipo) {
      const validServiceTypes = ['diagnostico_avulso', 'mentoria_margem', 'gestao_360'];
      sanitized.servico_tipo = sanitizeSelectValue(sanitized.servico_tipo, validServiceTypes);
    }

    if (sanitized.preenchido_por_user_id) {
      sanitized.preenchido_por_user_id = sanitizeString(sanitized.preenchido_por_user_id, 50);
    }

    // Sanitizar itens do briefing
    if (sanitized.itens && typeof sanitized.itens === 'object') {
      const sanitizedItens = {};
      
      Object.keys(sanitized.itens).forEach(field => {
        const value = sanitized.itens[field];
        sanitizedItens[field] = sanitizeBriefingField(field, value, sanitized.servico_tipo);
      });

      sanitized.itens = sanitizedItens;
    }

    // Sanitizar metadados
    if (sanitized.metadata && typeof sanitized.metadata === 'object') {
      const sanitizedMetadata = {};
      
      Object.keys(sanitized.metadata).forEach(key => {
        const value = sanitized.metadata[key];
        if (typeof value === 'string') {
          sanitizedMetadata[key] = sanitizeString(value, 200);
        } else {
          sanitizedMetadata[key] = value;
        }
      });

      sanitized.metadata = sanitizedMetadata;
    }

    return sanitized;
  }, [sanitizeString, sanitizeSelectValue, sanitizeBriefingField]);

  // Validar dados sanitizados
  const validateSanitizedData = useCallback((briefingData: any): { 
    isValid: boolean; 
    errors: string[]; 
    warnings: string[] 
  } => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validar campos obrigatórios
    if (!briefingData.servico_instancia_id) {
      errors.push('ID da instância de serviço é obrigatório');
    }

    if (!briefingData.cliente_id) {
      errors.push('ID do cliente é obrigatório');
    }

    if (!briefingData.servico_tipo) {
      errors.push('Tipo de serviço é obrigatório');
    }

    if (!briefingData.preenchido_por_user_id) {
      errors.push('ID do usuário é obrigatório');
    }

    // Validar itens do briefing
    if (!briefingData.itens || typeof briefingData.itens !== 'object') {
      errors.push('Dados do briefing (itens) são obrigatórios');
    } else {
      const itens = briefingData.itens;
      const requiredFields = getRequiredFieldsForServiceType(briefingData.servico_tipo);
      
      requiredFields.forEach(field => {
        const value = itens[field];
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          errors.push(`${getFieldLabel(field)} é obrigatório`);
        }
      });

      // Validar valores numéricos
      const numericFields = [
        'faturamento_mensal_medio',
        'endividamento_total',
        'margem_atual',
        'margem_desejada',
        'numero_funcionarios',
        'orcamento_disponivel'
      ];

      numericFields.forEach(field => {
        const value = itens[field];
        if (value !== undefined && value !== null && value !== '') {
          const numValue = parseFloat(value);
          if (isNaN(numValue)) {
            errors.push(`${getFieldLabel(field)} deve ser um número válido`);
          } else if (numValue < 0) {
            warnings.push(`${getFieldLabel(field)} tem valor negativo`);
          }
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }, []);

  // Obter campos obrigatórios por tipo de serviço
  const getRequiredFieldsForServiceType = useCallback((serviceType: string): string[] => {
    const requiredFields = {
      diagnostico_avulso: [
        'disponibilidade_dados',
        'principal_dor',
        'faturamento_mensal_medio'
      ],
      mentoria_margem: [
        'elasticidade_preco_percebida',
        'capacidade_negociacao_fornecedores',
        'politica_descontos_atual'
      ],
      gestao_360: [
        'maturidade_processos',
        'nivel_automatizacao',
        'capacidade_equipe'
      ]
    };

    return requiredFields[serviceType] || [];
  }, []);

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
      maturidade_processos: 'Maturidade dos Processos',
      nivel_automatizacao: 'Nível de Automação',
      capacidade_equipe: 'Capacidade da Equipe'
    };

    return labels[field] || field;
  }, []);

  // Sanitizar e validar dados completos
  const sanitizeAndValidate = useCallback((briefingData: any): {
    sanitizedData: any;
    validation: { isValid: boolean; errors: string[]; warnings: string[] };
  } => {
    const sanitizedData = sanitizeBriefingData(briefingData);
    const validation = validateSanitizedData(sanitizedData);

    return {
      sanitizedData,
      validation
    };
  }, [sanitizeBriefingData, validateSanitizedData]);

  return {
    sanitizeString,
    sanitizeNumber,
    sanitizeSelectValue,
    sanitizeBriefingField,
    sanitizeBriefingData,
    validateSanitizedData,
    sanitizeAndValidate,
    getRequiredFieldsForServiceType,
    getFieldLabel
  };
}

