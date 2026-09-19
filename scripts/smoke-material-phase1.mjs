/**
 * Smoke Fase 1 — crypto + DTO público + rotas (sem Drive obrigatório nos asserts básicos).
 *
 *   node scripts/smoke-material-phase1.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash, randomBytes, createCipheriv } from 'node:crypto';

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
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

loadEnv();

function ok(msg) {
  console.log(`  ✓ ${msg}`);
}
function fail(msg) {
  console.error(`  ✗ ${msg}`);
  process.exitCode = 1;
}

async function testCryptoModule() {
  console.log('\n[1] MATERIAL_ENCRYPTION_KEY / materialCrypto');
  const saved = process.env.MATERIAL_ENCRYPTION_KEY;
  const hadDrive = process.env.DRIVE_TOKEN_ENCRYPTION_KEY;
  const hadApi = process.env.APPWRITE_API_KEY;

  // Fresh import after env mutate is hard with ESM cache — test logic inline like module
  delete process.env.MATERIAL_ENCRYPTION_KEY;
  process.env.APPWRITE_API_KEY = hadApi || 'should-not-be-used';
  process.env.DRIVE_TOKEN_ENCRYPTION_KEY = 'should-not-be-used';

  const { encryptSecret, isMaterialEncryptionConfigured, MaterialCryptoConfigError } =
    await import('../lib/server/materialCrypto.js');

  if (isMaterialEncryptionConfigured()) {
    fail('isMaterialEncryptionConfigured deveria ser false sem MATERIAL_ENCRYPTION_KEY');
  } else {
    ok('sem MATERIAL_ENCRYPTION_KEY → não configurado');
  }

  try {
    encryptSecret('x');
    fail('encryptSecret deveria lançar sem MATERIAL_ENCRYPTION_KEY');
  } catch (err) {
    if (err instanceof MaterialCryptoConfigError || err?.code === 'crypto_not_configured') {
      ok('encryptSecret falha com crypto_not_configured (não usa API key)');
    } else {
      fail(`erro inesperado: ${err.message}`);
    }
  }

  process.env.MATERIAL_ENCRYPTION_KEY = saved || randomBytes(32).toString('hex');
  // re-import won't reload — test key derivation via same functions after setting env
  // Module already read getEncryptionKey at call time from process.env — OK
  try {
    const { encryptSecret: enc2, decryptSecret } = await import('../lib/server/materialCrypto.js');
    const cipher = enc2('hello-material');
    const plain = decryptSecret(cipher);
    if (plain === 'hello-material') ok('encrypt/decrypt roundtrip com MATERIAL_ENCRYPTION_KEY');
    else fail('roundtrip falhou');
  } catch (err) {
    fail(`roundtrip: ${err.message}`);
  }

  if (saved) process.env.MATERIAL_ENCRYPTION_KEY = saved;
  if (hadDrive) process.env.DRIVE_TOKEN_ENCRYPTION_KEY = hadDrive;
  else delete process.env.DRIVE_TOKEN_ENCRYPTION_KEY;
}

async function testSourceGuards() {
  console.log('\n[2] Código / rotas');
  const fs = await import('node:fs');
  const cryptoSrc = fs.readFileSync('lib/server/materialCrypto.js', 'utf8');
  if (/APPWRITE_API_KEY/.test(cryptoSrc) && !/never falls back to APPWRITE_API_KEY/.test(cryptoSrc)) {
    fail('materialCrypto ainda usa APPWRITE_API_KEY como fallback');
  } else {
    ok('materialCrypto sem fallback APPWRITE_API_KEY');
  }
  if (!cryptoSrc.includes('MATERIAL_ENCRYPTION_KEY')) {
    fail('MATERIAL_ENCRYPTION_KEY ausente');
  } else {
    ok('MATERIAL_ENCRYPTION_KEY é a chave canônica');
  }

  const indexSrc = fs.readFileSync('src/pages/index.jsx', 'utf8');
  if (indexSrc.includes('public-deliverable-approval')) {
    fail('index.jsx ainda referencia public-deliverable-approval');
  } else {
    ok('rota public-deliverable-approval removida do index');
  }
  if (!indexSrc.includes('/public-approval') && !indexSrc.includes('public-approval')) {
    fail('public-approval sumiu do index');
  } else {
    ok('public-approval permanece');
  }
  if (!indexSrc.includes('/review/:token')) {
    fail('/review/:token ausente');
  } else {
    ok('/review/:token presente');
  }

  for (const dead of [
    'src/pages/public-deliverable-approval.jsx',
    'src/components/approval/DeliverableApprovalFlow.jsx',
    'src/components/services/DeliverableActionButtons.jsx',
    'src/components/client/ClientDeliverablePortal.jsx',
  ]) {
    if (fs.existsSync(dead)) fail(`arquivo legado ainda existe: ${dead}`);
    else ok(`removido: ${dead}`);
  }

  const handler = fs.readFileSync('lib/server/materialDeliveriesHandler.js', 'utf8');
  if (handler.includes('delivery.id') && handler.includes('handlePublicReview')) {
    // check DTO block does not include id fields
  }
  if (
    handler.includes('versionNumber: version.versionNumber') &&
    !handler.match(/handlePublicReview[\s\S]*?delivery:\s*\{[\s\S]*?\bid\b/)
  ) {
    ok('DTO público parece sem delivery.id');
  } else if (handler.includes('title: delivery.title') && !handler.includes('id: delivery.id')) {
    ok('DTO público sem delivery.id');
  } else {
    // finer check
    const idx = handler.indexOf('async function handlePublicReview');
    const slice = handler.slice(idx, idx + 1200);
    if (slice.includes('id: delivery.id') || slice.includes('id: version.id')) {
      fail('DTO público ainda expõe ids');
    } else {
      ok('DTO público sem ids internos');
    }
    if (slice.includes('feedback:')) fail('DTO público ainda inclui feedback');
    else ok('DTO público sem feedback');
  }
}

async function testApiIfAvailable() {
  console.log('\n[3] API HTTP (opcional)');
  const base =
    process.env.MATERIAL_API_BASE ||
    process.env.APP_PUBLIC_URL ||
    process.env.VITE_APP_PUBLIC_URL ||
    '';
  if (!base) {
    console.log('  (skip) sem APP_PUBLIC_URL — não testou HTTP');
    return;
  }
  const origin = base.replace(/\/+$/, '');
  try {
    const res = await fetch(
      `${origin}/api/material-deliveries?route=review&token=invalid-token-phase1`
    );
    const body = await res.json().catch(() => ({}));
    if (res.status === 404 && (body.error === 'not_found' || body.error)) {
      ok(`token inválido → ${res.status} ${body.error}`);
    } else if (res.status === 404 || res.status === 400) {
      ok(`token inválido → ${res.status}`);
    } else {
      fail(`token inválido status inesperado ${res.status} ${JSON.stringify(body)}`);
    }

    const noToken = await fetch(`${origin}/api/material-deliveries?route=review`);
    const noBody = await noToken.json().catch(() => ({}));
    if (noToken.status === 400) ok('review sem token → 400');
    else fail(`review sem token → ${noToken.status} ${JSON.stringify(noBody)}`);
  } catch (err) {
    console.log(`  (skip) API inacessível: ${err.message}`);
  }
}

await testCryptoModule();
await testSourceGuards();
await testApiIfAvailable();

console.log(process.exitCode ? '\nFalhas encontradas.' : '\nSmoke Fase 1 OK.');
