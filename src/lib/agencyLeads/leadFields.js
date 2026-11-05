/**
 * Campos do perfil do lead (CRM /comercial).
 *
 * Tudo além das colunas tipadas de `agency_leads` (agencyId, name, email, phone,
 * status, convertedClientId) vive no `payload` JSON via entityAdapter — por isso
 * novos campos não exigem migração de schema.
 *
 * Funções puras: sem I/O, fáceis de testar.
 */
import { normalizeLeadStage } from './constants.js';

/** Campos de texto livres do perfil (string vazia → null ao salvar). */
export const LEAD_TEXT_FIELDS = [
  'name',
  'companyName',
  'jobTitle',
  'email',
  'phone',
  'whatsapp',
  'source',
  'campaign',
  'serviceInterest',
  'ownerId',
  'notes',
  'negotiationStatus',
  'lossReason',
  'lossDetails',
  'competitor',
];

export const LEAD_MONEY_FIELDS = ['estimatedValue', 'quotedValue'];
export const LEAD_DATE_FIELDS = ['enteredAt', 'proposalSentAt'];

/** Aceita "1.500,50", "1500.5", "R$ 2.000" → número ou null. */
export function parseMoney(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value : null;
  let s = String(value).replace(/[^\d.,-]/g, '').trim();
  if (!s) return null;
  if (s.includes(',')) {
    // formato BR: ponto = milhar, vírgula = decimal
    s = s.replace(/\./g, '').replace(',', '.');
  } else if ((s.match(/\./g) || []).length > 1) {
    s = s.replace(/\./g, '');
  } else if (/^\d{1,3}\.\d{3}$/.test(s)) {
    // "1.500" → milhar
    s = s.replace('.', '');
  }
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function parseProbability(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(String(value).replace('%', '').replace(',', '.').trim());
  if (!Number.isFinite(n)) return null;
  return Math.min(100, Math.max(0, Math.round(n)));
}

/** Data (YYYY-MM-DD ou ISO) → ISO ou null. */
export function parseDateField(value) {
  if (!value) return null;
  const s = String(value).trim();
  if (!s) return null;
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T12:00:00`) : new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** ISO → "YYYY-MM-DD" para <input type="date">. */
export function toDateInputValue(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** ISO → "YYYY-MM-DDTHH:mm" para <input type="datetime-local">. */
export function toDateTimeInputValue(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${toDateInputValue(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Normaliza um patch parcial vindo da UI para persistência.
 * Só inclui as chaves presentes no input (edição por seção).
 */
export function buildLeadPatch(input = {}) {
  const patch = {};
  for (const key of LEAD_TEXT_FIELDS) {
    if (!(key in input)) continue;
    const v = input[key];
    const s = v === null || v === undefined ? '' : String(v).trim();
    patch[key] = s || null;
  }
  for (const key of LEAD_MONEY_FIELDS) {
    if (key in input) patch[key] = parseMoney(input[key]);
  }
  for (const key of LEAD_DATE_FIELDS) {
    if (key in input) patch[key] = parseDateField(input[key]);
  }
  if ('probability' in input) patch.probability = parseProbability(input.probability);
  if ('status' in input) patch.status = normalizeLeadStage(input.status);
  if ('email' in patch && patch.email) patch.email = patch.email.toLowerCase();
  return patch;
}

/** Valida patch antes de salvar. Retorna mensagem de erro ou null. */
export function validateLeadPatch(patch = {}) {
  if ('name' in patch && !patch.name) return 'Informe o nome do contato';
  if (patch.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patch.email)) {
    return 'E-mail inválido';
  }
  return null;
}

/** Data de entrada no CRM: campo explícito ou criação da linha. */
export function leadEnteredAt(lead = {}) {
  return lead.enteredAt || lead.created_date || null;
}

/** Só dígitos; adiciona DDI 55 para números BR sem DDI. */
export function normalizePhoneDigits(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

export function whatsappHref(lead = {}) {
  const digits = normalizePhoneDigits(lead.whatsapp || lead.phone);
  return digits ? `https://wa.me/${digits}` : null;
}

export function phoneHref(lead = {}) {
  const raw = String(lead.phone || lead.whatsapp || '').trim();
  const digits = raw.replace(/[^\d+]/g, '');
  return digits ? `tel:${digits}` : null;
}

export function emailHref(lead = {}) {
  const email = String(lead.email || '').trim();
  return email ? `mailto:${email}` : null;
}

/** Valor ponderado (valor × probabilidade) para visão de pipeline. */
export function weightedLeadValue(lead = {}) {
  const value = parseMoney(lead.quotedValue) ?? parseMoney(lead.estimatedValue);
  if (!value) return 0;
  const p = parseProbability(lead.probability);
  return p === null ? value : (value * p) / 100;
}

/** Valor principal do lead: orçamento apresentado tem prioridade sobre estimativa. */
export function leadPrimaryValue(lead = {}) {
  return parseMoney(lead.quotedValue) ?? parseMoney(lead.estimatedValue) ?? 0;
}

/**
 * Se o patch muda o estágio, anexa entrada em `stageHistory` (evolução da negociação).
 * Mantém as últimas 50 mudanças.
 */
export function withStageHistory(lead = {}, patch = {}, user = null, now = new Date()) {
  if (!('status' in patch)) return patch;
  const from = normalizeLeadStage(lead.status);
  const to = normalizeLeadStage(patch.status);
  if (from === to) return patch;
  const history = Array.isArray(lead.stageHistory) ? lead.stageHistory : [];
  const entry = {
    from,
    to,
    at: now.toISOString(),
    by: user?.id || null,
    byName: user?.full_name || user?.name || null,
  };
  return { ...patch, stageHistory: [...history, entry].slice(-50) };
}
