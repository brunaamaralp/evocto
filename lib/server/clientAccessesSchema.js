/**
 * Validação e DTO de acessos/credenciais do cliente (sem plaintext de senha).
 */

export const CLIENT_ACCESSES_TABLE = 'client_accesses';
export const CLIENTS_TABLE = 'clients';
export const GENERAL_NOTES_FIELD = 'acessos_info_geral';

export const ACCESS_COLUMNS = [
  'agencyId',
  'clientId',
  'platform',
  'url',
  'username',
  'encryptedPassword',
  'notes',
  'createdBy',
];

export const CLIENT_COLUMNS = ['agencyId', 'name', 'status', 'email', 'phone'];

const MAX_PLATFORM = 255;
const MAX_URL = 512;
const MAX_USERNAME = 255;
const MAX_NOTES = 8000;
const MAX_PASSWORD = 512;
const MAX_GENERAL_NOTES = 20000;

function trimStr(value, max) {
  const s = String(value ?? '').trim();
  return s.length > max ? s.slice(0, max) : s;
}

/**
 * Serializa acesso para API — nunca inclui senha nem ciphertext.
 * @param {object} row
 */
export function toAccessDto(row) {
  if (!row) return null;
  return {
    id: row.id || row.$id || null,
    agencyId: row.agencyId || null,
    clientId: row.clientId || null,
    platform: row.platform || '',
    url: row.url || '',
    username: row.username || '',
    notes: row.notes || '',
    hasPassword: Boolean(String(row.encryptedPassword || '').trim()),
    createdBy: row.createdBy || null,
    created_date: row.created_date || row.$createdAt || null,
    updated_date: row.updated_date || row.$updatedAt || null,
  };
}

/**
 * @param {object} body
 * @param {{ requirePassword?: boolean }} opts
 */
export function validateAccessWrite(body = {}, { requirePassword = false } = {}) {
  const errors = {};
  const platform = trimStr(body.platform, MAX_PLATFORM);
  const url = trimStr(body.url, MAX_URL);
  const username = trimStr(body.username, MAX_USERNAME);
  const notes = trimStr(body.notes, MAX_NOTES);
  const passwordRaw = body.password == null ? '' : String(body.password);
  const password = passwordRaw.length > MAX_PASSWORD ? passwordRaw.slice(0, MAX_PASSWORD) : passwordRaw;

  if (!platform) errors.platform = 'Informe a plataforma/serviço';
  if (requirePassword && !password) errors.password = 'Informe a senha';

  const clientId = trimStr(body.clientId, 64);
  if (!clientId) errors.clientId = 'clientId é obrigatório';

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    value: {
      clientId,
      platform,
      url,
      username,
      notes,
      password,
      clearPassword: body.clearPassword === true,
    },
  };
}

export function validateGeneralNotes(body = {}) {
  const notes = trimStr(body.generalNotes ?? body.notes ?? '', MAX_GENERAL_NOTES);
  const clientId = trimStr(body.clientId, 64);
  const errors = {};
  if (!clientId) errors.clientId = 'clientId é obrigatório';
  return {
    valid: Object.keys(errors).length === 0,
    errors,
    value: { clientId, generalNotes: notes },
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
