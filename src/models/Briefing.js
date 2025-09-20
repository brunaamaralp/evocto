/**
 * 🧾 Modelo de Briefing por Instância de Serviço
 * 
 * Briefing híbrido preenchido pelo consultor durante kickoff
 * Personaliza execução sem quebrar lógica de templates
 */

import { randomUUID } from '@/components/debug/CryptoShim';

export class Briefing {
  constructor(data = {}) {
    this.id = data.id || randomUUID();
    this.servico_instancia_id = data.servico_instancia_id;
    this.cliente_id = data.cliente_id;
    this.servico_tipo = data.servico_tipo; // 'diagnostico_avulso' | 'mentoria_margem' | 'gestao_360'
    this.itens = data.itens || {}; // Schema específico por tipo de serviço
    this.preenchido_por_user_id = data.preenchido_por_user_id;
    this.preenchido_em = data.preenchido_em || new Date().toISOString();
    this.versao = data.versao || 1;
    this.status = data.status || 'rascunho'; // 'ativo' | 'superseded' | 'rascunho'
    this.created_at = data.created_at || new Date().toISOString();
    this.updated_at = data.updated_at || new Date().toISOString();
  }

  // Validação do schema baseado no tipo de serviço
  validate() {
    const errors = [];

    if (!this.servico_instancia_id) {
      errors.push('ID da instância do serviço é obrigatório');
    }

    if (!this.cliente_id) {
      errors.push('ID do cliente é obrigatório');
    }

    if (!this.servico_tipo) {
      errors.push('Tipo do serviço é obrigatório');
    }

    if (!this.preenchido_por_user_id) {
      errors.push('ID do usuário que preencheu é obrigatório');
    }

    // Validar schema específico por tipo de serviço
    const schemaValidation = this.validateSchema();
    if (!schemaValidation.isValid) {
      errors.push(...schemaValidation.errors);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validação do schema específico por tipo de serviço
  validateSchema() {
    const schemas = {
      diagnostico_avulso: {
        empresa_setor: { type: 'string', required: true },
        principal_dor: { 
          type: 'enum', 
          values: ['fluxo_caixa', 'margem_baixa', 'endividamento', 'controles', 'precificacao', 'outro'],
          required: true 
        },
        faturamento_mensal_medio: { type: 'number', required: true, min: 0 },
        ticket_medio: { type: 'number', required: true, min: 0 },
        mix_receita: { type: 'array', required: false },
        endividamento_total: { type: 'number', required: true, min: 0 },
        atrasos_frequentes: { type: 'boolean', required: true },
        controles_existentes: { 
          type: 'array', 
          values: ['planilha_basica', 'erp', 'nenhum', 'contabilidade_terceiros'],
          required: true 
        },
        disponibilidade_dados: { 
          type: 'enum', 
          values: ['completa', 'parcial', 'baixa'],
          required: true 
        },
        prioridades_do_cliente: { type: 'array', required: false },
        restricoes_tempo: { 
          type: 'enum', 
          values: ['urgente_7d', 'curto_30d', 'normal'],
          required: true 
        },
        observacoes: { type: 'string', required: false }
      },
      mentoria_margem: {
        produto_foco: { type: 'string', required: true },
        margem_atual_percent: { type: 'number', required: true, min: 0, max: 100 },
        volume_mensal: { type: 'number', required: true, min: 0 },
        elasticidade_preco_percebida: { 
          type: 'enum', 
          values: ['baixa', 'media', 'alta'],
          required: true 
        },
        custos_variaveis_chave: { type: 'array', required: false },
        capacidade_negociacao_fornecedores: { 
          type: 'enum', 
          values: ['alta', 'media', 'baixa'],
          required: true 
        },
        concorrentes_principais: { type: 'array', required: false },
        diferenciadores_produto: { type: 'array', required: false },
        risco_perda_clientes_com_reajuste: { 
          type: 'enum', 
          values: ['baixo', 'medio', 'alto'],
          required: true 
        },
        canal_venda_predominante: { 
          type: 'enum', 
          values: ['loja_fisica', 'online', 'distribuicao', 'misto'],
          required: true 
        },
        politica_descontos_atual: { 
          type: 'enum', 
          values: ['agressiva', 'moderada', 'controlada', 'inexistente'],
          required: true 
        },
        metrica_sucesso: { 
          type: 'enum', 
          values: ['margem_percent', 'lucro_bruto', 'EBITDA', 'mix_margem'],
          required: true 
        },
        meta_margem_percent: { type: 'number', required: true, min: 0, max: 100 },
        observacoes: { type: 'string', required: false }
      },
      gestao_360: {
        estrutura_operacional: { 
          type: 'array', 
          values: ['vendas', 'operacao', 'estoque', 'servicos_campo', 'ecommerce'],
          required: true 
        },
        rotina_financeira_atual: { 
          type: 'array', 
          values: ['conciliacao_bancaria', 'contas_a_pagar', 'contas_a_receber', 'fluxo_caixa', 'centro_custos'],
          required: true 
        },
        responsavel_financeiro: { type: 'string', required: true },
        ERP_ou_ferramentas: { type: 'array', required: false },
        ciclo_caixa_dias: { type: 'number', required: true, min: 0 },
        estoque_valor: { type: 'number', required: true, min: 0 },
        ruptura_estoque_frequente: { type: 'boolean', required: true },
        inadimplencia_percent: { type: 'number', required: true, min: 0, max: 100 },
        politica_credito: { 
          type: 'enum', 
          values: ['rigida', 'moderada', 'flexivel', 'inexistente'],
          required: true 
        },
        relatorios_necessarios: { 
          type: 'array', 
          values: ['DRE_mensal', 'fluxo_caixa_semanal', 'projecoes', 'custos_setor', 'estoque'],
          required: true 
        },
        metas_anuais: { type: 'array', required: false },
        maturidade_processos: { 
          type: 'enum', 
          values: ['baixa', 'media', 'alta'],
          required: true 
        },
        observacoes: { type: 'string', required: false }
      }
    };

    const schema = schemas[this.servico_tipo];
    if (!schema) {
      return {
        isValid: false,
        errors: [`Tipo de serviço '${this.servico_tipo}' não suportado`]
      };
    }

    const errors = [];
    const itens = this.itens || {};

    // Validar cada campo do schema
    for (const [field, rules] of Object.entries(schema)) {
      const value = itens[field];

      // Campo obrigatório
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`Campo '${field}' é obrigatório`);
        continue;
      }

      // Se campo não obrigatório e vazio, pular validação
      if (!rules.required && (value === undefined || value === null || value === '')) {
        continue;
      }

      // Validar tipo
      if (rules.type === 'string' && typeof value !== 'string') {
        errors.push(`Campo '${field}' deve ser uma string`);
      } else if (rules.type === 'number' && typeof value !== 'number') {
        errors.push(`Campo '${field}' deve ser um número`);
      } else if (rules.type === 'boolean' && typeof value !== 'boolean') {
        errors.push(`Campo '${field}' deve ser um boolean`);
      } else if (rules.type === 'array' && !Array.isArray(value)) {
        errors.push(`Campo '${field}' deve ser um array`);
      }

      // Validar valores específicos para enum
      if (rules.type === 'enum' && rules.values && !rules.values.includes(value)) {
        errors.push(`Campo '${field}' deve ser um dos valores: ${rules.values.join(', ')}`);
      }

      // Validar valores específicos para array
      if (rules.type === 'array' && rules.values && Array.isArray(value)) {
        const invalidValues = value.filter(v => !rules.values.includes(v));
        if (invalidValues.length > 0) {
          errors.push(`Campo '${field}' contém valores inválidos: ${invalidValues.join(', ')}`);
        }
      }

      // Validar limites numéricos
      if (rules.type === 'number') {
        if (rules.min !== undefined && value < rules.min) {
          errors.push(`Campo '${field}' deve ser maior ou igual a ${rules.min}`);
        }
        if (rules.max !== undefined && value > rules.max) {
          errors.push(`Campo '${field}' deve ser menor ou igual a ${rules.max}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Marcar como ativo e supersedar versões anteriores
  activate() {
    this.status = 'ativo';
    this.updated_at = new Date().toISOString();
  }

  // Marcar como supersedido
  supersede() {
    this.status = 'superseded';
    this.updated_at = new Date().toISOString();
  }

  // Criar nova versão
  createNewVersion() {
    return new Briefing({
      ...this,
      id: randomUUID(),
      versao: this.versao + 1,
      status: 'rascunho',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  // Serializar para JSON
  toJSON() {
    return {
      id: this.id,
      servico_instancia_id: this.servico_instancia_id,
      cliente_id: this.cliente_id,
      servico_tipo: this.servico_tipo,
      itens: this.itens,
      preenchido_por_user_id: this.preenchido_por_user_id,
      preenchido_em: this.preenchido_em,
      versao: this.versao,
      status: this.status,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }

  // Criar a partir de JSON
  static fromJSON(data) {
    return new Briefing(data);
  }

  // Métodos estáticos para operações CRUD (simulando API)
  static async create(data) {
    const briefing = new Briefing(data);
    const validation = briefing.validate();
    
    if (!validation.isValid) {
      throw new Error(`Briefing inválido: ${validation.errors.join(', ')}`);
    }

    // Simular persistência
    console.log('[Briefing] Criando briefing:', briefing.toJSON());
    return briefing;
  }

  static async get(id) {
    // Simular busca
    console.log('[Briefing] Buscando briefing:', id);
    return null; // Implementar busca real
  }

  static async update(id, data) {
    // Simular atualização
    console.log('[Briefing] Atualizando briefing:', id, data);
    return null; // Implementar atualização real
  }

  static async delete(id) {
    // Simular exclusão
    console.log('[Briefing] Excluindo briefing:', id);
    return true; // Implementar exclusão real
  }

  static async findByService(servico_instancia_id) {
    // Simular busca por serviço
    console.log('[Briefing] Buscando briefings do serviço:', servico_instancia_id);
    return []; // Implementar busca real
  }

  static async getLatestActive(servico_instancia_id) {
    // Simular busca da versão ativa mais recente
    console.log('[Briefing] Buscando briefing ativo mais recente:', servico_instancia_id);
    return null; // Implementar busca real
  }
}

export default Briefing;

