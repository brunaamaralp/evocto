/**
 * Schema / normalização da extração de briefing inicial a partir de arquivo.
 * O resultado preenche o formulário para revisão — não grava sozinho.
 */

import { normalizeBriefingInicialForm } from './briefingInicial.js';
import { normalizeFormato } from './empresaConfig.js';
import { normalizeProdutosLinhas } from './campanhaAnualSchema.js';

export const EXTRACT_BRIEFING_SCHEMA_VERSION = 2;

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

/**
 * Detecta quais campos a IA realmente preencheu (sem contar fallback de clientName).
 */
export function detectFilledKeysFromRaw(raw = {}) {
  const src = raw?.empresa && typeof raw.empresa === 'object' ? raw.empresa : raw;
  const declared = Array.isArray(raw?.campos_preenchidos)
    ? raw.campos_preenchidos.map((k) => String(k)).filter((k) => TRACKED_KEYS.includes(k))
    : null;

  if (declared && declared.length) return [...new Set(declared)];

  const keys = [];
  if (asString(src.nome)) keys.push('nome');
  if (asString(src.publico_alvo || src.publico)) keys.push('publico_alvo');
  if (asString(src.tom_brand || src.tom || src.tom_de_marca)) keys.push('tom_brand');
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
    asString(formato.duracao_videos || formato.duracao)
  ) {
    keys.push('formato_padrao');
  }
  if (asString(src.restricoes_criativas || src.restricoes || src.nao_fazer)) {
    keys.push('restricoes_criativas');
  }
  const produtos = src.produtos_linhas || src.produtos || src.linhas || [];
  if (Array.isArray(produtos) && produtos.some((p) => asString(p?.nome))) {
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
  const src = raw?.empresa && typeof raw.empresa === 'object' ? raw.empresa : raw;
  const formatoRaw = src.formato_padrao || src.formato || {};
  const orcamento =
    asPositiveNumber(src.orcamento_padrao_mensal) ??
    asPositiveNumber(src.orcamento) ??
    '';

  const nomeFromDoc = asString(src.nome);
  const empresa = {
    nome: nomeFromDoc || (allowClientNameFallback ? asString(clientName) : ''),
    publico_alvo: asString(src.publico_alvo || src.publico),
    tom_brand: asString(src.tom_brand || src.tom || src.tom_de_marca),
    restricoes_criativas: asString(
      src.restricoes_criativas || src.restricoes || src.nao_fazer
    ),
    orcamento_padrao_mensal: orcamento === '' ? '' : orcamento,
    formato_padrao: normalizeFormato({
      num_videos: formatoRaw.num_videos ?? formatoRaw.videos,
      num_designs: formatoRaw.num_designs ?? formatoRaw.designs,
      duracao_videos: formatoRaw.duracao_videos || formatoRaw.duracao,
    }),
    produtos_linhas: normalizeProdutosLinhas(
      src.produtos_linhas || src.produtos || src.linhas || []
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
  const incoming = normalizeExtractedBriefingEmpresa(
    extracted?.empresa ? extracted : { empresa: extracted },
    clientName,
    { allowClientNameFallback: false }
  );

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
