/**
 * Validação e DTO de itens da Central de Informações da Agência (não-secretos).
 * Tipos: note | link | document. Sem senhas — vault de acessos é etapa posterior.
 */

export const AGENCY_INFO_ITEMS_TABLE = 'agency_info_items';

export const ITEM_TYPES = ['note', 'link', 'document'];
export const ITEM_STATUSES = ['active', 'archived'];

export const ITEM_COLUMNS = [
  'agencyId',
  'type',
  'title',
  'category',
  'status',
  'pinned',
  'favorite',
  'externalUrl',
  'fileId',
  'createdBy',
  'updatedBy',
];

export const CATEGORY_SEEDS = [
  'administrativo',
  'comercial',
  'financeiro',
  'processos',
  'ferramentas',
  'referencias',
  'outros',
];

const MAX_TITLE = 255;
const MAX_CATEGORY = 64;
const MAX_URL = 1024;
const MAX_BODY = 50000;
const MAX_SUMMARY = 500;
const MAX_FILE_NAME = 255;
const MAX_MIME = 128;
const MAX_TAGS = 20;
const MAX_TAG_LEN = 40;

function trimStr(value, max) {
  const s = String(value ?? '').trim();
  return s.length > max ? s.slice(0, max) : s;
}

function asBool(value, fallback = false) {
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  if (value == null || value === '') return fallback;
  return Boolean(value);
}

function normalizeTags(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  const seen = new Set();
  for (const t of raw) {
    const tag = trimStr(t, MAX_TAG_LEN).toLowerCase();
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}

function isHttpUrl(url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Serializa item para API.
 * @param {object} row
 */
export function toItemDto(row) {
  if (!row) return null;
  const tags = Array.isArray(row.tags) ? row.tags : [];
  return {
    id: row.id || row.$id || null,
    agencyId: row.agencyId || null,
    type: row.type || '',
    title: row.title || '',
    category: row.category || '',
    status: row.status || 'active',
    pinned: asBool(row.pinned, false),
    favorite: asBool(row.favorite, false),
    body: row.body != null ? String(row.body) : '',
    tags,
    externalUrl: row.externalUrl || '',
    fileId: row.fileId || null,
    fileUrl: row.fileUrl || null,
    fileName: row.fileName || null,
    fileMimeType: row.fileMimeType || null,
    fileSize:
      row.fileSize == null || row.fileSize === ''
        ? null
        : Number.isFinite(Number(row.fileSize))
          ? Number(row.fileSize)
          : null,
    summary: row.summary != null ? String(row.summary) : '',
    createdBy: row.createdBy || null,
    updatedBy: row.updatedBy || null,
    created_date: row.created_date || row.$createdAt || null,
    updated_date: row.updated_date || row.$updatedAt || null,
  };
}

/**
 * @param {object} body
 * @param {{ partial?: boolean }} opts — update parcial (não exige type/title se omitidos)
 */
export function validateItemWrite(body = {}, { partial = false } = {}) {
  const errors = {};
  const has = (key) => Object.prototype.hasOwnProperty.call(body, key);

  const typeRaw = has('type') || !partial ? trimStr(body.type, 32) : undefined;
  const titleRaw = has('title') || !partial ? trimStr(body.title, MAX_TITLE) : undefined;

  let type = typeRaw;
  if (!partial || has('type')) {
    if (!type) errors.type = 'Informe o tipo (note, link ou document)';
    else if (!ITEM_TYPES.includes(type)) errors.type = 'Tipo inválido';
  }

  let title = titleRaw;
  if (!partial || has('title')) {
    if (!title) errors.title = 'Informe o título';
  }

  const category = has('category') || !partial ? trimStr(body.category, MAX_CATEGORY) : undefined;
  const statusRaw = has('status') ? trimStr(body.status, 32) : undefined;
  let status;
  if (has('status')) {
    status = statusRaw || 'active';
    if (!ITEM_STATUSES.includes(status)) errors.status = 'Status inválido';
  } else if (!partial) {
    status = 'active';
  }

  const bodyText = has('body') || !partial ? trimStr(body.body, MAX_BODY) : undefined;
  const summary = has('summary') || !partial ? trimStr(body.summary, MAX_SUMMARY) : undefined;
  const externalUrl =
    has('externalUrl') || !partial ? trimStr(body.externalUrl, MAX_URL) : undefined;
  const fileId = has('fileId') || !partial ? trimStr(body.fileId, 64) : undefined;
  const fileUrl = has('fileUrl') || !partial ? trimStr(body.fileUrl, 2048) : undefined;
  const fileName = has('fileName') || !partial ? trimStr(body.fileName, MAX_FILE_NAME) : undefined;
  const fileMimeType =
    has('fileMimeType') || !partial ? trimStr(body.fileMimeType, MAX_MIME) : undefined;

  let fileSize;
  if (has('fileSize') || !partial) {
    if (body.fileSize == null || body.fileSize === '') {
      fileSize = null;
    } else {
      const n = Number(body.fileSize);
      fileSize = Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
      if (body.fileSize != null && body.fileSize !== '' && fileSize === null) {
        errors.fileSize = 'fileSize inválido';
      }
    }
  }

  const tags = has('tags') || !partial ? normalizeTags(body.tags) : undefined;

  let pinned;
  let favorite;
  if (has('pinned') || !partial) pinned = asBool(body.pinned, false);
  if (has('favorite') || !partial) favorite = asBool(body.favorite, false);

  // Create: regras por tipo. Update parcial: só valida formato; o handler
  // revalida o registro merged (documento precisa de arquivo/link).
  if (!partial && type === 'link') {
    if (!externalUrl) errors.externalUrl = 'Informe a URL do link';
    else if (!isHttpUrl(externalUrl)) {
      errors.externalUrl = 'URL deve começar com http:// ou https://';
    }
  }

  if (!partial && type === 'document') {
    if (!fileId && !fileUrl && !externalUrl) {
      errors.file = 'Informe fileId, fileUrl ou externalUrl para o documento';
    }
  }

  if (externalUrl != null && externalUrl !== '' && !isHttpUrl(externalUrl)) {
    errors.externalUrl = 'URL deve começar com http:// ou https://';
  }

  if (fileUrl != null && fileUrl !== '' && !isHttpUrl(fileUrl) && !fileUrl.startsWith('/')) {
    // fileUrl do Appwrite costuma ser URL absoluta; aceita path relativo do bucket.
    errors.fileUrl = 'fileUrl inválida';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    value: {
      ...(type !== undefined ? { type } : {}),
      ...(title !== undefined ? { title } : {}),
      ...(category !== undefined ? { category } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(bodyText !== undefined ? { body: bodyText } : {}),
      ...(summary !== undefined ? { summary } : {}),
      ...(externalUrl !== undefined ? { externalUrl } : {}),
      ...(fileId !== undefined ? { fileId } : {}),
      ...(fileUrl !== undefined ? { fileUrl } : {}),
      ...(fileName !== undefined ? { fileName } : {}),
      ...(fileMimeType !== undefined ? { fileMimeType } : {}),
      ...(fileSize !== undefined ? { fileSize } : {}),
      ...(tags !== undefined ? { tags } : {}),
      ...(pinned !== undefined ? { pinned } : {}),
      ...(favorite !== undefined ? { favorite } : {}),
    },
  };
}

/** Remove campos sensíveis de objetos antes de log/erro. */
export function redactSecrets(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = Array.isArray(obj) ? [...obj] : { ...obj };
  const sensitive = new Set([
    'password',
    'encryptedPassword',
    'secret',
    'token',
    'Authorization',
    'authorization',
  ]);
  for (const key of Object.keys(out)) {
    if (sensitive.has(key)) {
      out[key] = '[redacted]';
    } else if (out[key] && typeof out[key] === 'object') {
      out[key] = redactSecrets(out[key]);
    }
  }
  return out;
}

export function matchesSearchQuery(item, q) {
  const needle = String(q || '')
    .trim()
    .toLowerCase();
  if (!needle) return true;
  const title = String(item?.title || '').toLowerCase();
  const category = String(item?.category || '').toLowerCase();
  return title.includes(needle) || category.includes(needle);
}
