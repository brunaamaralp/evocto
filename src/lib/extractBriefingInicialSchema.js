/**
 * Schema / normalização da extração de briefing inicial a partir de arquivo.
 * O resultado preenche o formulário para revisão — não grava sozinho.
 */

import { normalizeBriefingInicialForm } from './briefingInicial.js';
import { normalizeFormato } from './empresaConfig.js';
import { normalizeProdutosLinhas } from './campanhaAnualSchema.js';

export const EXTRACT_BRIEFING_SCHEMA_VERSION = 1;

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

function asString(v) {
  return String(v ?? '').trim();
}

function asPositiveNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
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

  // Alguns browsers mandam DOC legado; só aceitamos DOCX real pelo conteúdo.
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
  if (ext && entry.ext.length && !entry.ext.includes(ext) && ext !== '.doc') {
    // Extensão estranha mas MIME ok — ainda aceita.
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
 * Normaliza o JSON da IA para o shape do formulário (empresa.*).
 */
export function normalizeExtractedBriefingEmpresa(raw = {}, clientName = '') {
  const src = raw?.empresa && typeof raw.empresa === 'object' ? raw.empresa : raw;
  const formatoRaw = src.formato_padrao || src.formato || {};
  const orcamento =
    asPositiveNumber(src.orcamento_padrao_mensal) ??
    asPositiveNumber(src.orcamento) ??
    '';

  const empresa = {
    nome: asString(src.nome) || asString(clientName),
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
 * Mescla extração no formulário atual: valores não vazios da IA prevalecem;
 * brand_guidelines do formulário atual é preservado.
 */
export function mergeBriefingInicialFromExtract(
  currentForm,
  extracted,
  clientName = ''
) {
  const current = normalizeBriefingInicialForm(currentForm, clientName);
  const incoming = normalizeExtractedBriefingEmpresa(
    extracted?.empresa ? extracted : { empresa: extracted },
    clientName
  );

  const cur = current.empresa;
  const inc = incoming.empresa;

  const pickStr = (keep, next) => {
    const n = asString(next);
    return n ? n : keep;
  };

  const merged = {
    empresa: {
      ...cur,
      nome: pickStr(cur.nome, inc.nome) || clientName || '',
      publico_alvo: pickStr(cur.publico_alvo, inc.publico_alvo),
      tom_brand: pickStr(cur.tom_brand, inc.tom_brand),
      restricoes_criativas: pickStr(
        cur.restricoes_criativas,
        inc.restricoes_criativas
      ),
      orcamento_padrao_mensal:
        Number(inc.orcamento_padrao_mensal) > 0
          ? Number(inc.orcamento_padrao_mensal)
          : cur.orcamento_padrao_mensal,
      formato_padrao: {
        num_videos:
          Number(inc.formato_padrao?.num_videos) > 0
            ? Number(inc.formato_padrao.num_videos)
            : cur.formato_padrao.num_videos,
        num_designs:
          Number(inc.formato_padrao?.num_designs) > 0
            ? Number(inc.formato_padrao.num_designs)
            : cur.formato_padrao.num_designs,
        duracao_videos: pickStr(
          cur.formato_padrao.duracao_videos,
          inc.formato_padrao?.duracao_videos
        ),
      },
      produtos_linhas: (inc.produtos_linhas || []).some((p) => asString(p.nome))
        ? inc.produtos_linhas
        : cur.produtos_linhas,
      brand_guidelines: cur.brand_guidelines || null,
    },
  };

  return normalizeBriefingInicialForm(merged, clientName);
}

/**
 * Conta quantos campos-chave a extração preencheu (feedback na UI).
 */
export function countExtractedFields(form) {
  const n = normalizeBriefingInicialForm(form);
  const e = n.empresa;
  let filled = 0;
  const keys = [];
  if (asString(e.nome)) {
    filled += 1;
    keys.push('nome');
  }
  if (asString(e.publico_alvo)) {
    filled += 1;
    keys.push('publico_alvo');
  }
  if (asString(e.tom_brand)) {
    filled += 1;
    keys.push('tom_brand');
  }
  if (Number(e.orcamento_padrao_mensal) > 0) {
    filled += 1;
    keys.push('orcamento');
  }
  if (asString(e.restricoes_criativas)) {
    filled += 1;
    keys.push('restricoes');
  }
  if ((e.produtos_linhas || []).some((p) => asString(p.nome))) {
    filled += 1;
    keys.push('produtos');
  }
  if (Number(e.formato_padrao?.num_videos) > 0) {
    filled += 1;
    keys.push('formato');
  }
  return { filled, keys };
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

  // Rough size from base64 length
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
