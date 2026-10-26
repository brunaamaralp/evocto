/**
 * Dicionário / schema funcional — Geração de proposta & apresentação (Claude Skills).
 *
 * Contrato único usado por:
 * - UI (/gerar-material)
 * - API create job
 * - Prompt enviado ao Claude
 *
 * Fontes de dados:
 * - ids: request (agencyId, clientId, tipo, leadId?)
 * - cliente / dna: Appwrite (clients, empresas, briefs)
 * - lead: agency_leads (CRM) — enriquecimento opcional
 * - overrides: formulário da geração (prioridade sobre dna e lead)
 */

export const GENERATE_MATERIAL_TIPOS = Object.freeze(['proposta', 'apresentacao']);

export const GENERATE_MATERIAL_SCHEMA_VERSION = '1.0.0';

/** Form vazio da UI (overrides). */
export const EMPTY_GENERATE_MATERIAL_OVERRIDES = Object.freeze({
  titulo: '',
  objetivo: '',
  tom: '',
  escopo: '',
  investimento: '',
  prazo: '',
});

/**
 * Catálogo de campos do contrato canônico.
 * path = caminho no JSON enviado ao Claude / persistido no job.
 *
 * required:
 * - true → bloqueia create/validação
 * - 'quality' → não bloqueia; entra em warnings (qualidade da geração)
 * - false → opcional
 */
export const GENERATE_MATERIAL_FIELDS = Object.freeze([
  // --- Identidade do job ---
  {
    path: 'schema_version',
    label: 'Versão do schema',
    type: 'string',
    required: false,
    source: 'system',
    description: 'Versão do contrato de dados da geração.',
    example: '1.0.0',
  },
  {
    path: 'tipo',
    label: 'Tipo de material',
    type: 'enum',
    enum: GENERATE_MATERIAL_TIPOS,
    required: true,
    source: 'request',
    description: 'proposta → DOCX; apresentacao → PPTX.',
    example: 'proposta',
  },
  {
    path: 'data',
    label: 'Data de geração',
    type: 'date',
    required: true,
    source: 'system',
    description: 'ISO date (YYYY-MM-DD) usada na capa.',
    example: '2026-10-20',
  },
  {
    path: 'agencia',
    label: 'Nome da agência',
    type: 'string',
    required: 'quality',
    source: 'request',
    description: 'Quem assina a proposta/apresentação.',
    example: 'narrativa',
  },
  {
    path: 'leadId',
    label: 'ID do lead (CRM)',
    type: 'string',
    required: false,
    source: 'request',
    description: 'Opcional — vínculo com agency_leads quando a geração veio do Comercial.',
    example: '68flead01',
  },
  {
    path: 'lead.companyName',
    label: 'Empresa do lead',
    type: 'string',
    required: false,
    source: 'agency_leads',
    description: 'Nome da empresa no CRM; preenche capa se cliente.nome fraco.',
    example: 'Padaria Sol',
  },
  {
    path: 'lead.notes',
    label: 'Notas do lead',
    type: 'string',
    required: false,
    source: 'agency_leads',
    description: 'Anotações comerciais; base para objetivo/escopo se overrides vazios.',
    example: 'Quer gestão de conteúdo',
  },
  {
    path: 'lead.estimatedValue',
    label: 'Valor estimado do lead',
    type: 'number|null',
    required: false,
    source: 'agency_leads',
    description: 'Valor no CRM; vira investimento se override vazio.',
    example: 8500,
  },

  // --- Cliente ---
  {
    path: 'cliente.id',
    label: 'ID do cliente',
    type: 'string',
    required: true,
    source: 'request',
    description: 'clientId Appwrite.',
    example: '68f1a2b3c4d5',
  },
  {
    path: 'cliente.nome',
    label: 'Nome do cliente',
    type: 'string',
    required: true,
    source: 'clients|dna',
    description: 'Razão social / nome fantasia na capa.',
    example: 'Padaria Sol Nascente',
  },
  {
    path: 'cliente.segmento',
    label: 'Segmento',
    type: 'string',
    required: false,
    source: 'clients',
    description: 'Setor ou nicho do cliente.',
    example: 'Alimentação',
  },
  {
    path: 'cliente.email',
    label: 'E-mail do cliente',
    type: 'string',
    required: false,
    source: 'clients',
    description: 'Contato opcional no encerramento.',
    example: 'contato@cliente.com',
  },

  // --- DNA (briefing inicial / empresa) ---
  {
    path: 'dna.publico_alvo',
    label: 'Público-alvo',
    type: 'string',
    required: 'quality',
    source: 'empresas|briefs.empresa_snapshot',
    description: 'Quem a marca quer alcançar.',
    example: 'Donos de PMEs 25–45 anos na região metropolitana',
  },
  {
    path: 'dna.tom_brand',
    label: 'Tom de marca',
    type: 'string',
    required: 'quality',
    source: 'empresas|briefs|overrides.tom',
    description: 'Tom de voz; override.tom tem prioridade.',
    example: 'Consultivo, próximo, sem jargão',
  },
  {
    path: 'dna.orcamento_padrao_mensal',
    label: 'Orçamento padrão mensal',
    type: 'number|null',
    required: false,
    source: 'empresas|briefs',
    description: 'Referência de verba; não substitui overrides.investimento.',
    example: 8500,
  },
  {
    path: 'dna.formato_padrao',
    label: 'Formato padrão de conteúdo',
    type: 'object',
    required: false,
    source: 'empresas|briefs',
    description: '{ num_videos, num_designs, duracao_videos }.',
    example: { num_videos: 5, num_designs: 2, duracao_videos: '30-45s' },
  },
  {
    path: 'dna.restricoes_criativas',
    label: 'Restrições criativas',
    type: 'string',
    required: false,
    source: 'empresas|briefs',
    description: 'O que evitar (cores, temas, claims).',
    example: 'Não usar humor político; sem stock genérico de aperto de mão',
  },
  {
    path: 'dna.produtos_linhas',
    label: 'Linhas / produtos',
    type: 'array',
    required: 'quality',
    source: 'empresas|briefs',
    description: 'Lista de ofertas da marca (nome, descrição…).',
    example: [{ nome: 'Assinatura mensal', descricao: 'Gestão de redes' }],
  },
  {
    path: 'dna.brand_guidelines',
    label: 'Brand guidelines',
    type: 'object|null',
    required: false,
    source: 'empresas|briefs',
    description: 'Referência de marca (URL, notas, cores).',
    example: null,
  },

  // --- Overrides (formulário) ---
  {
    path: 'overrides.titulo',
    label: 'Título',
    type: 'string',
    required: false,
    source: 'form',
    ui: true,
    input: 'text',
    placeholder: 'Ex.: Proposta de marketing digital 2026',
    description: 'Título do documento/deck; se vazio, a IA sugere.',
    example: 'Proposta — Ciclo de conteúdo Q1',
  },
  {
    path: 'overrides.objetivo',
    label: 'Objetivo',
    type: 'string',
    required: 'quality',
    source: 'form',
    ui: true,
    input: 'textarea',
    rows: 2,
    placeholder: 'O que a proposta/apresentação deve conquistar',
    description: 'Meta comercial ou de comunicação do material.',
    example: 'Fechar contrato de 6 meses de gestão de conteúdo',
  },
  {
    path: 'overrides.tom',
    label: 'Tom (override)',
    type: 'string',
    required: false,
    source: 'form',
    ui: true,
    input: 'text',
    placeholder: 'Ex.: consultivo, direto, premium',
    description: 'Sobrescreve dna.tom_brand quando preenchido.',
    example: 'Premium e direto',
  },
  {
    path: 'overrides.escopo',
    label: 'Escopo',
    type: 'string',
    required: 'quality',
    source: 'form',
    ui: true,
    input: 'textarea',
    rows: 3,
    placeholder: 'Entregáveis, canais, pacotes',
    description: 'Entregáveis e limites do trabalho proposto.',
    example: '8 reels/mês, 4 carrosséis, relatório quinzenal',
  },
  {
    path: 'overrides.investimento',
    label: 'Investimento',
    type: 'string',
    required: false,
    requiredWhenTipo: { proposta: 'quality' },
    source: 'form',
    ui: true,
    input: 'text',
    placeholder: 'Ex.: R$ 8.500 / mês',
    description: 'Valor comercial; se vazio, placeholder [INVESTIMENTO] no arquivo.',
    example: 'R$ 8.500 / mês',
  },
  {
    path: 'overrides.prazo',
    label: 'Prazo',
    type: 'string',
    required: false,
    source: 'form',
    ui: true,
    input: 'text',
    placeholder: 'Ex.: 90 dias',
    description: 'Duração ou marco de entrega; se vazio, [PRAZO].',
    example: '90 dias',
  },

  // --- Metadados de qualidade (não vão “criar” conteúdo, mas orientam) ---
  {
    path: 'qualidade.score',
    label: 'Score de completude',
    type: 'number',
    required: false,
    source: 'system',
    description: '0–100; calculado a partir dos campos quality.',
    example: 72,
  },
  {
    path: 'qualidade.warnings',
    label: 'Avisos de qualidade',
    type: 'array',
    required: false,
    source: 'system',
    description: 'Campos quality ausentes (path + mensagem).',
    example: [{ path: 'overrides.escopo', message: 'Escopo vazio' }],
  },
]);

/** Campos do formulário (ui: true), na ordem da tela. */
export function getGenerateMaterialUiFields() {
  return GENERATE_MATERIAL_FIELDS.filter((f) => f.ui);
}

export function normalizeTipo(raw) {
  const t = String(raw || '')
    .trim()
    .toLowerCase();
  if (t === 'apresentacao' || t === 'presentation' || t === 'pptx') return 'apresentacao';
  return 'proposta';
}

export function normalizeOverrides(raw = {}) {
  const out = { ...EMPTY_GENERATE_MATERIAL_OVERRIDES };
  for (const key of Object.keys(EMPTY_GENERATE_MATERIAL_OVERRIDES)) {
    if (raw[key] != null) out[key] = String(raw[key]).trim();
  }
  return out;
}

function strOrNull(v) {
  const s = v == null ? '' : String(v).trim();
  return s || null;
}

function numOrNull(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function getByPath(obj, path) {
  const parts = String(path).split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[p];
  }
  return cur;
}

function isEmptyValue(v) {
  if (v == null) return true;
  if (typeof v === 'string') return !v.trim();
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') return Object.keys(v).length === 0;
  return false;
}

/**
 * Monta o objeto canônico enviado ao Claude (e útil para preview/debug).
 *
 * @param {'proposta'|'apresentacao'} tipo
 * @param {{
 *   client?: object,
 *   empresa?: object,
 *   briefing?: object,
 *   lead?: object,
 *   leadId?: string,
 *   overrides?: object,
 *   agencyName?: string,
 *   clientId?: string,
 * }} ctx
 */
export function buildGenerateMaterialContext(tipo, ctx = {}) {
  const t = normalizeTipo(tipo);
  const client = ctx.client || {};
  const empresa = ctx.empresa || {};
  const briefing = ctx.briefing || {};
  const lead = ctx.lead || {};
  const snap = briefing.empresa_snapshot || empresa || {};
  const overrides = normalizeOverrides(ctx.overrides || {});

  const produtos =
    (Array.isArray(snap.produtos_linhas) && snap.produtos_linhas) ||
    (Array.isArray(briefing.produtos_snapshot) && briefing.produtos_snapshot) ||
    [];

  const leadCompany = strOrNull(lead.companyName || lead.name);
  const leadNotes = strOrNull(lead.notes);
  const leadValue = numOrNull(lead.estimatedValue);
  const leadValueLabel =
    leadValue != null
      ? leadValue.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
          maximumFractionDigits: 0,
        })
      : null;

  const leadId = strOrNull(ctx.leadId || lead.id || lead.$id);

  const canonical = {
    schema_version: GENERATE_MATERIAL_SCHEMA_VERSION,
    tipo: t,
    data: new Date().toISOString().slice(0, 10),
    agencia: strOrNull(ctx.agencyName),
    leadId,
    lead: leadId
      ? {
          id: leadId,
          companyName: leadCompany,
          contactName: strOrNull(lead.name),
          email: strOrNull(lead.email),
          phone: strOrNull(lead.phone),
          notes: leadNotes,
          estimatedValue: leadValue,
          status: strOrNull(lead.status),
        }
      : null,
    cliente: {
      id: strOrNull(client.id || client.$id || ctx.clientId) || null,
      nome: strOrNull(client.name || client.nome || snap.nome || leadCompany),
      segmento: strOrNull(client.segment || client.segmento),
      email: strOrNull(client.email || lead.email),
    },
    dna: {
      publico_alvo: strOrNull(snap.publico_alvo),
      tom_brand: strOrNull(overrides.tom || snap.tom_brand),
      orcamento_padrao_mensal: numOrNull(snap.orcamento_padrao_mensal) ?? leadValue,
      formato_padrao: snap.formato_padrao && typeof snap.formato_padrao === 'object'
        ? snap.formato_padrao
        : null,
      restricoes_criativas: strOrNull(snap.restricoes_criativas),
      produtos_linhas: produtos,
      brand_guidelines: snap.brand_guidelines || null,
    },
    overrides: {
      titulo: strOrNull(overrides.titulo) || (leadCompany ? `Proposta — ${leadCompany}` : null),
      objetivo: strOrNull(overrides.objetivo) || leadNotes,
      tom: strOrNull(overrides.tom),
      escopo: strOrNull(overrides.escopo) || leadNotes,
      investimento: strOrNull(overrides.investimento) || leadValueLabel,
      prazo: strOrNull(overrides.prazo),
    },
  };

  const quality = assessGenerateMaterialQuality(canonical);
  canonical.qualidade = {
    score: quality.score,
    warnings: quality.warnings,
  };

  return canonical;
}

/**
 * Avalia completude para qualidade (não bloqueia geração).
 */
export function assessGenerateMaterialQuality(canonical) {
  const warnings = [];
  const tipo = normalizeTipo(canonical?.tipo);

  for (const field of GENERATE_MATERIAL_FIELDS) {
    let need = field.required;
    if (field.requiredWhenTipo && field.requiredWhenTipo[tipo] != null) {
      need = field.requiredWhenTipo[tipo];
    }
    if (need !== 'quality') continue;
    if (field.source === 'system') continue;

    const value = getByPath(canonical, field.path);
    if (isEmptyValue(value)) {
      warnings.push({
        path: field.path,
        label: field.label,
        message: `${field.label} vazio — a geração pode ficar genérica`,
      });
    }
  }

  const qualityFields = GENERATE_MATERIAL_FIELDS.filter((f) => {
    let need = f.required;
    if (f.requiredWhenTipo && f.requiredWhenTipo[tipo] != null) {
      need = f.requiredWhenTipo[tipo];
    }
    return need === 'quality' && f.source !== 'system';
  });
  const filled = qualityFields.length - warnings.length;
  const score =
    qualityFields.length === 0
      ? 100
      : Math.round((Math.max(0, filled) / qualityFields.length) * 100);

  return {
    score,
    warnings,
    ok: warnings.length === 0,
  };
}

/**
 * Validação dura do request da API / UI (bloqueia create).
 *
 * @param {{ agencyId?: string, clientId?: string, tipo?: string, overrides?: object } & object} body
 */
export function validateGenerateMaterialRequest(body = {}) {
  const errors = {};
  const agencyId = String(body.agencyId || '').trim();
  const clientId = String(body.clientId || '').trim();
  const leadId = String(body.leadId || '').trim() || null;
  const tipo = normalizeTipo(body.tipo);
  const overrides = normalizeOverrides(body);

  if (!agencyId) errors.agencyId = 'agencyId obrigatório';
  if (!clientId) errors.clientId = 'clientId obrigatório';
  if (!GENERATE_MATERIAL_TIPOS.includes(tipo)) {
    errors.tipo = 'tipo deve ser proposta ou apresentacao';
  }

  // Limites leves anti-abuso
  const maxLen = {
    titulo: 200,
    objetivo: 2000,
    tom: 200,
    escopo: 4000,
    investimento: 200,
    prazo: 120,
  };
  for (const [key, max] of Object.entries(maxLen)) {
    if (overrides[key] && overrides[key].length > max) {
      errors[key] = `${key} excede ${max} caracteres`;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    value: {
      agencyId,
      clientId,
      leadId,
      tipo,
      agencyName: strOrNull(body.agencyName),
      overrides,
    },
  };
}

/**
 * Valida o contexto canônico já montado (ex.: antes de chamar Claude).
 * Exige cliente.nome.
 */
export function validateGenerateMaterialContext(canonical) {
  const errors = {};
  if (!canonical?.cliente?.nome) {
    errors['cliente.nome'] = 'Nome do cliente obrigatório';
  }
  if (!GENERATE_MATERIAL_TIPOS.includes(normalizeTipo(canonical?.tipo))) {
    errors.tipo = 'tipo inválido';
  }
  const quality = assessGenerateMaterialQuality(canonical || {});
  return {
    valid: Object.keys(errors).length === 0,
    errors,
    quality,
  };
}

/**
 * Legenda curta dos campos para o system/user prompt (sem exemplos longos).
 */
export function buildFieldLegendForPrompt() {
  return GENERATE_MATERIAL_FIELDS.filter(
    (f) => !String(f.path).startsWith('qualidade.')
  )
    .map((f) => {
      const req =
        f.required === true
          ? 'obrigatório'
          : f.required === 'quality'
            ? 'recomendado'
            : 'opcional';
      return `- ${f.path} (${f.type}, ${req}): ${f.description}`;
    })
    .join('\n');
}

/**
 * JSON Schema leve (draft-07-ish) para documentação / futuras Skills custom.
 * Não é executado por um validador AJV no runtime — o contrato vivo é
 * validateGenerateMaterialRequest + buildGenerateMaterialContext.
 */
export const GENERATE_MATERIAL_JSON_SCHEMA = Object.freeze({
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'narrativa://generate-material/context/v1',
  title: 'GenerateMaterialContext',
  type: 'object',
  required: ['schema_version', 'tipo', 'data', 'cliente', 'dna', 'overrides'],
  properties: {
    schema_version: { type: 'string' },
    tipo: { type: 'string', enum: [...GENERATE_MATERIAL_TIPOS] },
    data: { type: 'string', format: 'date' },
    agencia: { type: ['string', 'null'] },
    leadId: { type: ['string', 'null'] },
    lead: { type: ['object', 'null'] },
    cliente: {
      type: 'object',
      required: ['id', 'nome'],
      properties: {
        id: { type: ['string', 'null'] },
        nome: { type: ['string', 'null'] },
        segmento: { type: ['string', 'null'] },
        email: { type: ['string', 'null'] },
      },
    },
    dna: {
      type: 'object',
      properties: {
        publico_alvo: { type: ['string', 'null'] },
        tom_brand: { type: ['string', 'null'] },
        orcamento_padrao_mensal: { type: ['number', 'null'] },
        formato_padrao: { type: ['object', 'null'] },
        restricoes_criativas: { type: ['string', 'null'] },
        produtos_linhas: { type: 'array' },
        brand_guidelines: { type: ['object', 'null'] },
      },
    },
    overrides: {
      type: 'object',
      properties: {
        titulo: { type: ['string', 'null'] },
        objetivo: { type: ['string', 'null'] },
        tom: { type: ['string', 'null'] },
        escopo: { type: ['string', 'null'] },
        investimento: { type: ['string', 'null'] },
        prazo: { type: ['string', 'null'] },
      },
    },
    qualidade: {
      type: 'object',
      properties: {
        score: { type: 'number', minimum: 0, maximum: 100 },
        warnings: { type: 'array' },
      },
    },
  },
});
