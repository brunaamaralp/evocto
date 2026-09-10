/**
 * Crypto helpers for material deliveries (tokens + Drive refresh encryption).
 */
import { createHash, createHmac, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';

const TOKEN_BYTES = 32;

function getEncryptionKey() {
  const raw = String(
    process.env.DRIVE_TOKEN_ENCRYPTION_KEY ||
      process.env.MATERIAL_SECRET_KEY ||
      process.env.APPWRITE_API_KEY ||
      ''
  ).trim();
  if (!raw) {
    throw new Error(
      'Defina DRIVE_TOKEN_ENCRYPTION_KEY (ou MATERIAL_SECRET_KEY / APPWRITE_API_KEY) para criptografia'
    );
  }
  // Accept 64-char hex or any string hashed to 32 bytes
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, 'hex');
  }
  return createHash('sha256').update(raw).digest();
}

export function generatePublicToken() {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

export function hashToken(rawToken) {
  return createHash('sha256').update(String(rawToken || ''), 'utf8').digest('hex');
}

export function encryptSecret(plainText) {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64url')}:${tag.toString('base64url')}:${enc.toString('base64url')}`;
}

export function decryptSecret(payload) {
  const key = getEncryptionKey();
  const parts = String(payload || '').split(':');
  if (parts.length !== 4 || parts[0] !== 'v1') {
    throw new Error('ciphertext_invalid');
  }
  const iv = Buffer.from(parts[1], 'base64url');
  const tag = Buffer.from(parts[2], 'base64url');
  const data = Buffer.from(parts[3], 'base64url');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

export function signOAuthState(payload) {
  const key = getEncryptionKey();
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = createHmac('sha256', key).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyOAuthState(state, maxAgeMs = 15 * 60 * 1000) {
  const key = getEncryptionKey();
  const [body, sig] = String(state || '').split('.');
  if (!body || !sig) throw new Error('state_invalid');
  const expected = createHmac('sha256', key).update(body).digest('base64url');
  if (expected !== sig) throw new Error('state_tampered');
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  if (!payload?.exp || Date.now() > Number(payload.exp)) throw new Error('state_expired');
  if (Date.now() + maxAgeMs < Number(payload.exp) - maxAgeMs) {
    // ignore clock skew beyond window — already checked exp
  }
  return payload;
}

export function sha256Buffer(buf) {
  return createHash('sha256').update(buf).digest('hex');
}
