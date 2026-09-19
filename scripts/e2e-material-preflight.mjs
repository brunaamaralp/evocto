/**
 * Pré-flight E2E Material Deliveries — não imprime secrets.
 * node scripts/e2e-material-preflight.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    const path = resolve(process.cwd(), file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq === -1) continue;
      const k = t.slice(0, eq).trim();
      let v = t.slice(eq + 1).trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

loadEnv();

const KEYS = [
  'MATERIAL_ENCRYPTION_KEY',
  'APP_PUBLIC_URL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_OAUTH_REDIRECT_URI',
  'APPWRITE_API_KEY',
];

function status(k) {
  const v = String(process.env[k] || '').trim();
  if (!v) return 'AUSENTE';
  if (k === 'APP_PUBLIC_URL' && !/^https?:\/\//i.test(v)) return 'INVALIDA';
  if (
    k === 'GOOGLE_OAUTH_REDIRECT_URI' &&
    (!/^https?:\/\//i.test(v) || !v.includes('material-deliveries'))
  ) {
    return 'INVALIDA';
  }
  if (k === 'MATERIAL_ENCRYPTION_KEY' && v.length < 16) return 'INVALIDA';
  if (k === 'APPWRITE_API_KEY' && v.length < 20) return 'INVALIDA';
  if (k === 'GOOGLE_CLIENT_ID' && !v.includes('.apps.googleusercontent.com') && v.length < 10) {
    return 'INVALIDA';
  }
  return 'CONFIGURADA';
}

const report = {};
for (const k of KEYS) report[k] = status(k);

const localFile = existsSync(resolve('.env.local')) ? '.env.local' : existsSync(resolve('.env')) ? '.env' : null;
const keyInFile = localFile
  ? /(?:^|\n)\s*MATERIAL_ENCRYPTION_KEY\s*=\s*\S+/m.test(readFileSync(resolve(localFile), 'utf8'))
  : false;

console.log(JSON.stringify({
  envFile: localFile,
  vars: report,
  materialEncryptionKeyInEnvFile: keyInFile ? 'CONFIGURADA' : 'AUSENTE',
  note: 'API serverless lê as mesmas vars do process.env no host; local Vite proxy usa .env.local no Node da function se vercel/netlify dev estiver ativo.',
}, null, 2));
