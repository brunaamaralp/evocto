/**
 * 🧾 Modelo de Briefing por Instância de Serviço
 *
 * Briefing híbrido preenchido pelo time da agência durante kickoff.
 * Personaliza execução sem quebrar lógica de templates.
 */

import { randomUUID } from '@/components/debug/CryptoShim';
import { resolveOfferingType } from '@/constants/serviceCategories';

export class Briefing {
  constructor(data = {}) {
    this.id = data.id || randomUUID();
    this.servico_instancia_id = data.servico_instancia_id;
    this.cliente_id = data.cliente_id;
    // Canônicos: diagnostico_comunicacao | estrategia_conteudo | marketing_360
    // Legados ainda aceitos via resolveOfferingType
    this.servico_tipo = data.servico_tipo;
    this.itens = data.itens || {};
    this.preenchido_por_user_id = data.preenchido_por_user_id;
    this.preenchido_em = data.preenchido_em || new Date().toISOString();
    this.versao = data.versao || 1;
    this.status = data.status || 'rascunho'; // 'ativo' | 'superseded' | 'rascunho'
    this.created_at = data.created_at || new Date().toISOString();
    this.updated_at = data.updated_at || new Date().toISOString();
  }

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

    const schemaValidation = this.validateSchema();
    if (!schemaValidation.isValid) {
      errors.push(...schemaValidation.errors);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  validateSchema() {
    const schemas = {
      diagnostico_comunicacao: {
        empresa_setor: { type: 'string', required: true },
        principal_dor: {
          type: 'enum',
          values: [
            'posicionamento_fraco',
            'mensagem_inconsistente',
            'baixa_autoridade',
            'canais_desalinhados',
            'crise_reputacao',
            'outro',
          ],
          required: true,
        },
        publico_prioritario: { type: 'string', required: true },
        canais_ativos: {
          type: 'array',
          values: ['instagram', 'linkedin', 'site', 'email', 'midia_paga', 'pr', 'youtube', 'outro'],
          required: true,
        },
        tom_desejado: {
          type: 'enum',
          values: ['institucional', 'proximo', 'tecnico', 'irreverente', 'inspiracional'],
          required: true,
        },
        materiais_existentes: {
          type: 'array',
          values: ['manual_marca', 'site', 'pecas_recentes', 'guia_tom', 'nenhum'],
          required: true,
        },
        disponibilidade_acessos: {
          type: 'enum',
          values: ['completa', 'parcial', 'baixa'],
          required: true,
        },
        prioridades_do_cliente: { type: 'array', required: false },
        restricoes_tempo: {
          type: 'enum',
          values: ['urgente_7d', 'curto_30d', 'normal'],
          required: true,
        },
        observacoes: { type: 'string', required: false },
      },

      estrategia_conteudo: {
        objetivo_conteudo: {
          type: 'enum',
          values: ['autoridade', 'demanda', 'retencao', 'recrutamento', 'misto'],
          required: true,
        },
        produto_ou_oferta_foco: { type: 'string', required: true },
        personas_prioritarias: { type: 'array', required: true },
        canais_prioritarios: {
          type: 'array',
          values: ['blog', 'linkedin', 'instagram', 'youtube', 'email', 'podcast', 'outro'],
          required: true,
        },
        capacidade_producao_semanal: { type: 'number', required: true, min: 0 },
        tom_de_voz: {
          type: 'enum',
          values: ['formal', 'conversacional', 'tecnico', 'inspiracional'],
          required: true,
        },
        restricoes_compliance: { type: 'string', required: false },
        diferenciais_prova: { type: 'array', required: false },
        concorrentes_referencia: { type: 'array', required: false },
        metrica_sucesso: {
          type: 'enum',
          values: ['engajamento', 'leads', 'trafego', 'share_of_voice', 'conversao'],
          required: true,
        },
        observacoes: { type: 'string', required: false },
      },

      marketing_360: {
        objetivos_negocio: { type: 'array', required: true },
        canais_no_escopo: {
          type: 'array',
          values: [
            'organico',
            'midia_paga',
            'conteudo',
            'email',
            'seo',
            'pr',
            'influenciadores',
            'design',
          ],
          required: true,
        },
        budget_midia_mensal: { type: 'number', required: true, min: 0 },
        responsavel_aprovacao: { type: 'string', required: true },
        sla_aprovacao_dias: { type: 'number', required: true, min: 1 },
        ferramentas_atuais: { type: 'array', required: false },
        kpis_prioritarios: {
          type: 'array',
          values: ['ROAS', 'CAC', 'leads', 'engajamento', 'brand_lift', 'conversao'],
          required: true,
        },
        maturidade_processos: {
          type: 'enum',
          values: ['baixa', 'media', 'alta'],
          required: true,
        },
        restricoes_marca: { type: 'string', required: false },
        observacoes: { type: 'string', required: false },
      },
    };

    // Aliases legados apontam para o schema canônico
    schemas.diagnostico_avulso = schemas.diagnostico_comunicacao;
    schemas.diagnostico_financeiro = schemas.diagnostico_comunicacao;
    schemas.mentoria_margem = schemas.estrategia_conteudo;
    schemas.mentoria_precificacao = schemas.estrategia_conteudo;
    schemas.gestao_360 = schemas.marketing_360;
    schemas.gestao_financeira_360 = schemas.marketing_360;

    const tipo = resolveOfferingType(this.servico_tipo) || this.servico_tipo;
    const schema = schemas[tipo] || schemas[this.servico_tipo];

    if (!schema) {
      return {
        isValid: false,
        errors: [`Tipo de serviço '${this.servico_tipo}' não suportado`],
      };
    }

    const errors = [];
    const itens = this.itens || {};

    for (const [field, rules] of Object.entries(schema)) {
      const value = itens[field];

      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`Campo '${field}' é obrigatório`);
        continue;
      }

      if (!rules.required && (value === undefined || value === null || value === '')) {
        continue;
      }

      if (rules.type === 'string' && typeof value !== 'string') {
        errors.push(`Campo '${field}' deve ser uma string`);
      } else if (rules.type === 'number' && typeof value !== 'number') {
        errors.push(`Campo '${field}' deve ser um número`);
      } else if (rules.type === 'boolean' && typeof value !== 'boolean') {
        errors.push(`Campo '${field}' deve ser um boolean`);
      } else if (rules.type === 'array' && !Array.isArray(value)) {
        errors.push(`Campo '${field}' deve ser um array`);
      } else if (rules.type === 'enum' && rules.values && !rules.values.includes(value)) {
        errors.push(`Campo '${field}' deve ser um de: ${rules.values.join(', ')}`);
      }

      if (rules.type === 'number') {
        if (rules.min !== undefined && value < rules.min) {
          errors.push(`Campo '${field}' deve ser >= ${rules.min}`);
        }
        if (rules.max !== undefined && value > rules.max) {
          errors.push(`Campo '${field}' deve ser <= ${rules.max}`);
        }
      }

      if (rules.type === 'array' && rules.values && Array.isArray(value)) {
        const invalid = value.filter((v) => !rules.values.includes(v));
        if (invalid.length) {
          errors.push(`Campo '${field}' contém valores inválidos: ${invalid.join(', ')}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  activate() {
    this.status = 'ativo';
    this.updated_at = new Date().toISOString();
  }

  supersede() {
    this.status = 'superseded';
    this.updated_at = new Date().toISOString();
  }

  createNewVersion() {
    return new Briefing({
      ...this.toJSON(),
      id: randomUUID(),
      versao: this.versao + 1,
      status: 'rascunho',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

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
      updated_at: this.updated_at,
    };
  }

  static fromJSON(data) {
    return new Briefing(data);
  }

  static async create(data) {
    const briefing = new Briefing(data);
    const validation = briefing.validate();

    if (!validation.isValid) {
      throw new Error(`Briefing inválido: ${validation.errors.join(', ')}`);
    }

    console.log('[Briefing] Criando briefing:', briefing.toJSON());
    return briefing;
  }

  static async get(id) {
    console.log('[Briefing] Buscando briefing:', id);
    return null;
  }

  static async update(id, data) {
    console.log('[Briefing] Atualizando briefing:', id, data);
    return null;
  }

  static async delete(id) {
    console.log('[Briefing] Excluindo briefing:', id);
    return true;
  }

  static async findByService(servico_instancia_id) {
    console.log('[Briefing] Buscando briefings do serviço:', servico_instancia_id);
    return [];
  }

  static async getLatestActive(servico_instancia_id) {
    console.log('[Briefing] Buscando briefing ativo mais recente:', servico_instancia_id);
    return null;
  }
}

export default Briefing;
