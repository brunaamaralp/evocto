/**
 * Validação e DTO de acessos/credenciais da agência (sem plaintext de senha).
 * Escopo: agencyId apenas — sem clientId (não mistura com vaults de cliente).
 */

export const AGENCY_ACCESSES_TABLE = 'agency_accesses';

export const ACCESS_COLUMNS = [
  'agencyId',
  'platform',
  'url',
  'username',
  'encryptedPassword',
  'notes',
  'createdBy',
];

const MAX_PLATFORM = 255;
const MAX_URL = 512;
const MAX_USERNAME = 255;
const MAX_NOTES = 8000;
const MAX_PASSWORD = 512;

function trimStr(value, max) {
  const s = String(value ?? '').trim();
  return s.length > max ? s.slice(0, max) : s;
}

/**
 * Serializa acesso para API — nunca inclui senha nem ciphertext.
 * @param {object} row
 */
export function toAgencyAccessDto(row) {
  if (!row) return null;
  return {
    id: row.id || row.$id || null,
    agencyId: row.agencyId || null,
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
export function validateAgencyAccessWrite(body = {}, { requirePassword = false } = {}) {
  const errors = {};
  const platform = trimStr(body.platform, MAX_PLATFORM);
  const url = trimStr(body.url, MAX_URL);
  const username = trimStr(body.username, MAX_USERNAME);
  const notes = trimStr(body.notes, MAX_NOTES);
  const passwordRaw = body.password == null ? '' : String(body.password);
  const password =
    passwordRaw.length > MAX_PASSWORD ? passwordRaw.slice(0, MAX_PASSWORD) : passwordRaw;

  if (!platform) errors.platform = 'Informe a plataforma/serviço';
  if (requirePassword && !password) errors.password = 'Informe a senha';

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    value: {
      platform,
      url,
      username,
      notes,
      password,
      clearPassword: body.clearPassword === true,
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
