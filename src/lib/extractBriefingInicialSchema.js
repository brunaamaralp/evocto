/**
 * Schema / normalização da extração de briefing inicial a partir de arquivo.
 * O resultado preenche o formulário para revisão — não grava sozinho.
 */

import { normalizeBriefingInicialForm } from './briefingInicial.js';
import { normalizeFormato } from './empresaConfig.js';
import { normalizeProdutosLinhas } from './campanhaAnualSchema.js';

export const EXTRACT_BRIEFING_SCHEMA_VERSION = 3;

const NAO_IDENTIFICAVEL = /^\[?\s*n[aã]o identific[aá]vel\s*\]?$/i;
const INFERIDO_PREFIX = /^\[?\s*inferido\s*\]?\s*/i;

/** ~3.5 MB — Netlify body limit ~6 MB com base64. */
export const EXTRACT_BRIEFING_MAX_BYTES = Math.floor(3.5 * 1024 * 1024);

export const EXTRACT_BRIEFING_ALLOWED = Object.freeze({
  'application/pdf': { kind: 'pdf', ext: ['.pdf'] },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    kind: 'docx',
    ext: ['.docx'],
  },
  'application/msword': { kind: 'docx', ext: ['.doc', '.docx'] },
  'text/plain': { kind: 'txt', ext: ['.txt'] },
  'text/markdown': { kind: 'txt', ext: ['.md', '.txt'] },
});

const EXT_TO_MIME = {
  '.pdf': 'application/pdf',
  '.docx':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.txt': 'text/plain',
  '.md': 'text/plain',
};

const TRACKED_KEYS = [
  'nome',
  'publico_alvo',
  'tom_brand',
  'orcamento_padrao_mensal',
  'formato_padrao',
  'restricoes_criativas',
  'produtos_linhas',
];

function asString(v) {
  return String(v ?? '').trim();
}

function asPositiveNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function hasOwn(obj, key) {
  return obj != null && Object.prototype.hasOwnProperty.call(obj, key);
}

export function extensionOf(filename = '') {
  const name = String(filename || '').toLowerCase();
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i) : '';
}

/**
 * @returns {{ ok: true, mime: string, kind: 'pdf'|'docx'|'txt' } | { ok: false, error: string, message: string }}
 */
export function resolveExtractBriefingFileMeta({ filename, mimeType } = {}) {
  const ext = extensionOf(filename);
  let mime = String(mimeType || '')
    .split(';')[0]
    .trim()
    .toLowerCase();

  if (!mime || mime === 'application/octet-stream') {
    mime = EXT_TO_MIME[ext] || '';
  }

  if (mime === 'application/msword' && ext === '.docx') {
    mime =
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }

  const entry = EXTRACT_BRIEFING_ALLOWED[mime];
  if (!entry) {
    return {
      ok: false,
      error: 'unsupported_file_type',
      message: 'Use PDF, DOCX ou TXT.',
    };
  }
  if (ext === '.doc') {
    return {
      ok: false,
      error: 'unsupported_file_type',
      message: 'Arquivo .doc antigo não é suportado. Salve como .docx ou PDF.',
    };
  }

  return { ok: true, mime, kind: entry.kind };
}

function normalizeOrigem(raw) {
  const o = asString(raw).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (o.startsWith('infer')) return 'inferido';
  if (o.includes('nao_ident') || o.includes('nao identific')) {
    return 'nao_identificavel';
  }
  if (o.startsWith('extra')) return 'extraido';
  return 'extraido';
}

/**
 * Campo narrativo: { valor, origem, justificativa }
 */
export function normalizeCampoAnalise(raw) {
  if (raw == null) {
    return {
      valor: '[Não identificável]',
      origem: 'nao_identificavel',
      justificativa: '',
    };
  }
  if (typeof raw === 'string' || typeof raw === 'number') {
    const valor = asString(raw);
    if (!valor || NAO_IDENTIFICAVEL.test(valor)) {
      return {
        valor: '[Não identificável]',
        origem: 'nao_identificavel',
        justificativa: '',
      };
    }
    const inferido = INFERIDO_PREFIX.test(valor);
    return {
      valor: inferido ? valor.replace(INFERIDO_PREFIX, '').trim() : valor,
      origem: inferido ? 'inferido' : 'extraido',
      justificativa: '',
    };
  }
  const valor = asString(raw.valor ?? raw.value ?? raw.text);
  const origem = normalizeOrigem(raw.origem || raw.source || raw.origin);
  if (!valor || NAO_IDENTIFICAVEL.test(valor) || origem === 'nao_identificavel') {
    return {
      valor: '[Não identificável]',
      origem: 'nao_identificavel',
      justificativa: asString(raw.justificativa || raw.reason),
    };
  }
  return {
    valor: valor.replace(INFERIDO_PREFIX, '').trim(),
    origem: origem === 'inferido' ? 'inferido' : 'extraido',
    justificativa: asString(raw.justificativa || raw.reason),
  };
}

function formatCampoDisplay(campo) {
  const c = normalizeCampoAnalise(campo);
  if (c.origem === 'nao_identificavel') return '[Não identificável]';
  if (c.origem === 'inferido') {
    const why = c.justificativa ? ` (${c.justificativa})` : '';
    return `[Inferido] ${c.valor}${why}`;
  }
  return c.valor;
}

function usableValor(campo) {
  const c = normalizeCampoAnalise(campo);
  if (c.origem === 'nao_identificavel') return '';
  if (c.origem === 'inferido') return `[Inferido] ${c.valor}`;
  return c.valor;
}

/**
 * Normaliza o bloco `analise` do motor Narrativa.
 */
export function normalizeNarrativaAnalise(raw = {}) {
  const src = raw?.analise && typeof raw.analise === 'object' ? raw.analise : raw;
  const id = src.identidade || src.identidade_marca || {};
  const canais = src.canais_operacao || src.canais || {};
  const dir = src.diretrizes || src.diretrizes_campanha || {};
  const frentesRaw = Array.isArray(src.frentes_receita)
    ? src.frentes_receita
    : Array.isArray(src.frentes)
      ? src.frentes
      : [];

  const frentes = frentesRaw.slice(0, 4).map((f, i) => ({
    nome: asString(f?.nome || f?.name || `Frente ${i + 1}`),
    objetivo: normalizeCampoAnalise(f?.objetivo || f?.objective),
    publico_principal: normalizeCampoAnalise(
      f?.publico_principal || f?.publico || f?.audience
    ),
  }));

  return {
    identidade: {
      nome_negocio: normalizeCampoAnalise(id.nome_negocio || id.nome || id.name),
      nicho_modelo: normalizeCampoAnalise(id.nicho_modelo || id.nicho || id.setor),
      proposta_valor: normalizeCampoAnalise(
        id.proposta_valor || id.proposta || id.value_prop
      ),
      tom_voz: normalizeCampoAnalise(id.tom_voz || id.tom || id.voice),
      identidade_visual: normalizeCampoAnalise(
        id.identidade_visual || id.visual || id.estetica
      ),
    },
    frentes_receita: frentes.length
      ? frentes
      : [
          {
            nome: 'Operação principal',
            objetivo: normalizeCampoAnalise(null),
            publico_principal: normalizeCampoAnalise(null),
          },
        ],
    canais_operacao: {
      canais_venda: normalizeCampoAnalise(
        canais.canais_venda || canais.canais || canais.sales_channels
      ),
      historico_marketing: normalizeCampoAnalise(
        canais.historico_marketing || canais.historico || canais.marketing
      ),
      desafios_sazonalidade: normalizeCampoAnalise(
        canais.desafios_sazonalidade || canais.desafios || canais.sazonalidade
      ),
    },
    diretrizes: {
      foco_prioritario: normalizeCampoAnalise(
        dir.foco_prioritario || dir.foco || dir.priority
      ),
      observacoes_estrategicas: normalizeCampoAnalise(
        dir.observacoes_estrategicas || dir.observacoes || dir.insights
      ),
    },
  };
}

/**
 * Texto estruturado para revisão humana (formato Narrativa).
 */
export function formatNarrativaAnaliseMarkdown(analiseInput) {
  const a = normalizeNarrativaAnalise({ analise: analiseInput });
  const lines = [
    '## 1. IDENTIDADE DA MARCA & POSICIONAMENTO',
    `- **Nome do Negócio:** ${formatCampoDisplay(a.identidade.nome_negocio)}`,
    `- **Nicho / Modelo de Negócio:** ${formatCampoDisplay(a.identidade.nicho_modelo)}`,
    `- **Proposta de Valor Central:** ${formatCampoDisplay(a.identidade.proposta_valor)}`,
    `- **Tom de Voz da Marca:** ${formatCampoDisplay(a.identidade.tom_voz)}`,
    `- **Identidade Visual / Estética:** ${formatCampoDisplay(a.identidade.identidade_visual)}`,
    '',
    '## 2. ARQUITETURA DE PRODUTOS OU FRENTES DE RECEITA',
  ];
  a.frentes_receita.forEach((f, i) => {
    lines.push(
      `- **Frente ${i + 1}:** ${f.nome || '—'} | **Objetivo:** ${formatCampoDisplay(f.objetivo)} | **Público Principal:** ${formatCampoDisplay(f.publico_principal)}`
    );
  });
  lines.push(
    '',
    '## 3. CANAIS, OPERAÇÃO E HISTÓRICO',
    `- **Canais de Venda Atuais:** ${formatCampoDisplay(a.canais_operacao.canais_venda)}`,
    `- **Histórico de Marketing / Tráfego:** ${formatCampoDisplay(a.canais_operacao.historico_marketing)}`,
    `- **Desafios e Sazonalidade:** ${formatCampoDisplay(a.canais_operacao.desafios_sazonalidade)}`,
    '',
    '## 4. DIRETRIZES DE CAMPANHA & PRÓXIMOS PASSOS',
    `- **Foco Prioritário:** ${formatCampoDisplay(a.diretrizes.foco_prioritario)}`,
    `- **Observações Estratégicas:** ${formatCampoDisplay(a.diretrizes.observacoes_estrategicas)}`
  );
  return lines.join('\n');
}

/**
 * Deriva campos do formulário a partir da análise Narrativa quando empresa vier incompleta.
 */
export function empresaFromNarrativaAnalise(analiseInput, existingEmpresa = {}) {
  const a = normalizeNarrativaAnalise({ analise: analiseInput });
  const existing =
    existingEmpresa && typeof existingEmpresa === 'object' ? existingEmpresa : {};

  const nome =
    asString(existing.nome) ||
    usableValor(a.identidade.nome_negocio).replace(INFERIDO_PREFIX, '').trim();

  const tom =
    asString(existing.tom_brand || existing.tom) || usableValor(a.identidade.tom_voz);

  const publicos = a.frentes_receita
    .map((f) => usableValor(f.publico_principal))
    .filter(Boolean);
  const proposta = usableValor(a.identidade.proposta_valor);
  const nicho = usableValor(a.identidade.nicho_modelo);
  let publico = asString(existing.publico_alvo || existing.publico);
  if (!publico) {
    const parts = [];
    if (publicos.length) parts.push(publicos.join('; '));
    if (proposta) parts.push(proposta);
    else if (nicho) parts.push(nicho);
    publico = parts.join(' — ');
  }

  const produtosFromFrentes = a.frentes_receita
    .filter((f) => asString(f.nome) && !/^frente\s*\d+$/i.test(f.nome) && f.nome !== 'Operação principal')
    .map((f) => ({
      nome: f.nome,
      descricao: usableValor(f.objetivo).replace(INFERIDO_PREFIX, '').trim(),
      story: usableValor(f.publico_principal).replace(INFERIDO_PREFIX, '').trim(),
      sazonalidade: usableValor(a.canais_operacao.desafios_sazonalidade)
        .replace(INFERIDO_PREFIX, '')
        .trim(),
    }));

  const existingProdutos = existing.produtos_linhas || existing.produtos || [];
  const produtos =
    Array.isArray(existingProdutos) && existingProdutos.some((p) => asString(p?.nome))
      ? existingProdutos
      : produtosFromFrentes.length
        ? produtosFromFrentes
        : a.frentes_receita.map((f) => ({
            nome: f.nome,
            descricao: usableValor(f.objetivo).replace(INFERIDO_PREFIX, '').trim(),
            story: usableValor(f.publico_principal).replace(INFERIDO_PREFIX, '').trim(),
          }));

  const restricaoParts = [
    usableValor(a.canais_operacao.desafios_sazonalidade),
    usableValor(a.identidade.identidade_visual)
      ? `Visual: ${usableValor(a.identidade.identidade_visual)}`
      : '',
    usableValor(a.diretrizes.foco_prioritario)
      ? `Foco: ${usableValor(a.diretrizes.foco_prioritario)}`
      : '',
    usableValor(a.diretrizes.observacoes_estrategicas),
  ].filter(Boolean);

  return {
    nome,
    publico_alvo: publico,
    tom_brand: tom,
    restricoes_criativas:
      asString(existing.restricoes_criativas) || restricaoParts.join('\n'),
    orcamento_padrao_mensal:
      existing.orcamento_padrao_mensal ?? existing.orcamento ?? '',
    formato_padrao: existing.formato_padrao || existing.formato || {},
    produtos_linhas: produtos,
  };
}

/**
 * Detecta quais campos a IA realmente preencheu (sem contar fallback de clientName).
 */
export function detectFilledKeysFromRaw(raw = {}) {
  const src = raw?.empresa && typeof raw.empresa === 'object' ? raw.empresa : raw;
  const declared = Array.isArray(raw?.campos_preenchidos)
    ? raw.campos_preenchidos.map((k) => String(k)).filter((k) => TRACKED_KEYS.includes(k))
    : null;

  if (declared && declared.length) return [...new Set(declared)];

  const usable = (v) => {
    const s = asString(v);
    return Boolean(s) && !NAO_IDENTIFICAVEL.test(s);
  };

  const keys = [];
  if (usable(src.nome)) keys.push('nome');
  if (usable(src.publico_alvo || src.publico)) keys.push('publico_alvo');
  if (usable(src.tom_brand || src.tom || src.tom_de_marca)) keys.push('tom_brand');
  if (
    asPositiveNumber(src.orcamento_padrao_mensal) != null ||
    asPositiveNumber(src.orcamento) != null
  ) {
    keys.push('orcamento_padrao_mensal');
  }
  const formato = src.formato_padrao || src.formato || {};
  if (
    asPositiveNumber(formato.num_videos ?? formato.videos) != null ||
    asPositiveNumber(formato.num_designs ?? formato.designs) != null ||
    usable(formato.duracao_videos || formato.duracao)
  ) {
    keys.push('formato_padrao');
  }
  if (usable(src.restricoes_criativas || src.restricoes || src.nao_fazer)) {
    keys.push('restricoes_criativas');
  }
  const produtos = src.produtos_linhas || src.produtos || src.linhas || [];
  if (Array.isArray(produtos) && produtos.some((p) => usable(p?.nome))) {
    keys.push('produtos_linhas');
  }
  return keys;
}

/**
 * Normaliza o JSON da IA para o shape do formulário (empresa.*).
 * @param {object} raw
 * @param {string} [clientName]
 * @param {{ allowClientNameFallback?: boolean }} [opts]
 */
export function normalizeExtractedBriefingEmpresa(
  raw = {},
  clientName = '',
  opts = {}
) {
  const allowClientNameFallback = opts.allowClientNameFallback !== false;
  const srcRaw = raw?.empresa && typeof raw.empresa === 'object' ? raw.empresa : raw;
  const fromAnalise =
    raw?.analise || srcRaw?.analise
      ? empresaFromNarrativaAnalise(raw.analise || srcRaw.analise, srcRaw)
      : srcRaw;

  const src = { ...fromAnalise, ...srcRaw };
  // Prefer explicit empresa fields when present and usable
  const pick = (explicit, fallback) => {
    const e = asString(explicit);
    if (e && !NAO_IDENTIFICAVEL.test(e)) return e;
    return asString(fallback);
  };

  const formatoRaw = src.formato_padrao || src.formato || {};
  const orcamento =
    asPositiveNumber(src.orcamento_padrao_mensal) ??
    asPositiveNumber(src.orcamento) ??
    '';

  const nomeFromDoc = pick(srcRaw?.nome, fromAnalise?.nome);
  const empresa = {
    nome: nomeFromDoc || (allowClientNameFallback ? asString(clientName) : ''),
    publico_alvo: pick(
      srcRaw?.publico_alvo || srcRaw?.publico,
      fromAnalise?.publico_alvo
    ),
    tom_brand: pick(
      srcRaw?.tom_brand || srcRaw?.tom || srcRaw?.tom_de_marca,
      fromAnalise?.tom_brand
    ),
    restricoes_criativas: pick(
      srcRaw?.restricoes_criativas || srcRaw?.restricoes || srcRaw?.nao_fazer,
      fromAnalise?.restricoes_criativas
    ),
    orcamento_padrao_mensal: orcamento === '' ? '' : orcamento,
    formato_padrao: normalizeFormato({
      num_videos: formatoRaw.num_videos ?? formatoRaw.videos,
      num_designs: formatoRaw.num_designs ?? formatoRaw.designs,
      duracao_videos: formatoRaw.duracao_videos || formatoRaw.duracao,
    }),
    produtos_linhas: normalizeProdutosLinhas(
      (Array.isArray(srcRaw?.produtos_linhas) &&
      srcRaw.produtos_linhas.some((p) => asString(p?.nome))
        ? srcRaw.produtos_linhas
        : null) ||
        srcRaw?.produtos ||
        srcRaw?.linhas ||
        fromAnalise?.produtos_linhas ||
        []
    ),
    brand_guidelines: null,
  };

  return normalizeBriefingInicialForm({ empresa }, clientName);
}

/**
 * Aplica a extração no formulário.
 * - Campos que a IA preencheu substituem o valor atual
 * - Campos vazios na IA mantêm o valor atual
 * - brand_guidelines sempre preservado
 */
export function mergeBriefingInicialFromExtract(
  currentForm,
  extracted,
  clientName = '',
  opts = {}
) {
  const filledKeys = Array.isArray(opts.filledKeys)
    ? opts.filledKeys
    : detectFilledKeysFromRaw(
        extracted?.empresa ? extracted : { empresa: extracted }
      );

  const current = normalizeBriefingInicialForm(currentForm, clientName);
  const payload =
    extracted?.empresa || extracted?.analise
      ? extracted
      : { empresa: extracted };
  const incoming = normalizeExtractedBriefingEmpresa(payload, clientName, {
    allowClientNameFallback: false,
  });

  const cur = current.empresa;
  const inc = incoming.empresa;
  const filled = new Set(filledKeys);

  const pickIfFilled = (key, keep, next) => {
    if (!filled.has(key)) return keep;
    if (key === 'orcamento_padrao_mensal') {
      return Number(next) > 0 ? Number(next) : keep;
    }
    if (key === 'produtos_linhas') {
      return Array.isArray(next) && next.some((p) => asString(p.nome))
        ? next
        : keep;
    }
    if (key === 'formato_padrao') {
      return {
        num_videos:
          Number(next?.num_videos) > 0
            ? Number(next.num_videos)
            : keep.num_videos,
        num_designs:
          Number(next?.num_designs) > 0
            ? Number(next.num_designs)
            : keep.num_designs,
        duracao_videos: asString(next?.duracao_videos)
          ? String(next.duracao_videos).trim()
          : keep.duracao_videos,
      };
    }
    const n = asString(next);
    return n ? n : keep;
  };

  const merged = {
    empresa: {
      ...cur,
      nome: pickIfFilled('nome', cur.nome, inc.nome) || clientName || cur.nome,
      publico_alvo: pickIfFilled(
        'publico_alvo',
        cur.publico_alvo,
        inc.publico_alvo
      ),
      tom_brand: pickIfFilled('tom_brand', cur.tom_brand, inc.tom_brand),
      restricoes_criativas: pickIfFilled(
        'restricoes_criativas',
        cur.restricoes_criativas,
        inc.restricoes_criativas
      ),
      orcamento_padrao_mensal: pickIfFilled(
        'orcamento_padrao_mensal',
        cur.orcamento_padrao_mensal,
        inc.orcamento_padrao_mensal
      ),
      formato_padrao: pickIfFilled(
        'formato_padrao',
        cur.formato_padrao,
        inc.formato_padrao
      ),
      produtos_linhas: pickIfFilled(
        'produtos_linhas',
        cur.produtos_linhas,
        inc.produtos_linhas
      ),
      brand_guidelines: cur.brand_guidelines || null,
    },
  };

  return {
    form: normalizeBriefingInicialForm(merged, clientName),
    filledKeys: [...filled],
  };
}

/**
 * Conta campos realmente vindos do documento (não o nome do cliente do sistema).
 */
export function countExtractedFields(form, filledKeys = null) {
  if (Array.isArray(filledKeys)) {
    return { filled: filledKeys.length, keys: filledKeys };
  }
  const n = normalizeBriefingInicialForm(form);
  const e = n.empresa;
  const keys = [];
  if (asString(e.nome)) keys.push('nome');
  if (asString(e.publico_alvo)) keys.push('publico_alvo');
  if (asString(e.tom_brand)) keys.push('tom_brand');
  if (Number(e.orcamento_padrao_mensal) > 0) keys.push('orcamento_padrao_mensal');
  if (asString(e.restricoes_criativas)) keys.push('restricoes_criativas');
  if ((e.produtos_linhas || []).some((p) => asString(p.nome))) {
    keys.push('produtos_linhas');
  }
  if (
    Number(e.formato_padrao?.num_videos) > 0 ||
    Number(e.formato_padrao?.num_designs) > 0
  ) {
    keys.push('formato_padrao');
  }
  return { filled: keys.length, keys };
}

export function validateExtractBriefingRequest(body = {}) {
  const errors = {};
  const filename = asString(body.filename || body.fileName);
  const contentBase64 = asString(body.contentBase64 || body.base64 || body.data);
  const mimeType = asString(body.mimeType || body.contentType || body.type);
  const clientName = asString(body.clientName || body.client_name);

  if (!filename) errors.filename = 'Nome do arquivo obrigatório';
  if (!contentBase64) errors.contentBase64 = 'Conteúdo do arquivo obrigatório';

  const meta = resolveExtractBriefingFileMeta({ filename, mimeType });
  if (!meta.ok) {
    errors.mimeType = meta.message;
  }

  const approxBytes = Math.floor((contentBase64.length * 3) / 4);
  if (contentBase64 && approxBytes > EXTRACT_BRIEFING_MAX_BYTES) {
    errors.size = `Arquivo muito grande (máx. ${Math.floor(EXTRACT_BRIEFING_MAX_BYTES / (1024 * 1024))} MB)`;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    value: meta.ok
      ? {
          filename,
          contentBase64,
          mimeType: meta.mime,
          kind: meta.kind,
          clientName,
          approxBytes,
        }
      : null,
  };
}

export { TRACKED_KEYS, hasOwn };
