/**
 * Smoke do fluxo de aprovação (create staff → decide portal / process token).
 * Uso:
 *   node scripts/smoke-approval-workflow.mjs
 *   node scripts/smoke-approval-workflow.mjs --apply
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Client, TablesDB, Users, Query, ID } from 'node-appwrite';
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

const APPLY = process.argv.includes('--apply');
const ENDPOINT = process.env.VITE_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.VITE_APPWRITE_PROJECT_ID;
const API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.VITE_APPWRITE_DATABASE_ID || 'evocto';

const admin = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
const tables = new TablesDB(admin);
const users = new Users(admin);

function ok(msg) {
  console.log(`  ✓ ${msg}`);
}
function fail(msg) {
  console.error(`  ✗ ${msg}`);
  process.exitCode = 1;
}

function hashToken(raw) {
  return createHash('sha256').update(String(raw), 'utf8').digest('hex');
}

function encryptSecret(plainText) {
  const raw = String(
    process.env.DRIVE_TOKEN_ENCRYPTION_KEY ||
      process.env.MATERIAL_SECRET_KEY ||
      process.env.APPWRITE_API_KEY ||
      ''
  ).trim();
  const key = /^[0-9a-fA-F]{64}$/.test(raw)
    ? Buffer.from(raw, 'hex')
    : createHash('sha256').update(raw).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64url')}:${tag.toString('base64url')}:${enc.toString('base64url')}`;
}

async function checkHandlersExist() {
  console.log('\n[1] Handlers / exports');
  const fs = await import('node:fs');
  const files = [
    'api/approval-workflow.js',
    'lib/server/approvalWorkflowHandler.js',
    'src/api/functions/approvalWorkflow.js',
  ];
  for (const f of files) {
    if (fs.existsSync(resolve(process.cwd(), f))) ok(f);
    else fail(`missing ${f}`);
  }
}

async function applyProbe() {
  console.log('\n[2] Probe --apply: cria approval pending + decide via admin (simula regras)');
  const agencies = await tables.listRows({
    databaseId: DATABASE_ID,
    tableId: 'agencies',
    queries: [Query.limit(1)],
  });
  const agency = (agencies.rows || [])[0];
  if (!agency) {
    fail('sem agency');
    return;
  }
  const agencyId = agency.$id;
  const stamp = Date.now();
  const created = {};

  try {
    const clientRow = await tables.createRow({
      databaseId: DATABASE_ID,
      tableId: 'clients',
      rowId: ID.unique(),
      data: {
        agencyId,
        name: `Smoke Approval ${stamp}`,
        status: 'active',
        email: `smoke-approval-${stamp}@example.com`,
        payload: '{}',
      },
      permissions: [
        `read("team:${agencyId}")`,
        `update("team:${agencyId}")`,
        `delete("team:${agencyId}")`,
      ],
    });
    created.clientId = clientRow.$id;

    const plan = await tables.createRow({
      databaseId: DATABASE_ID,
      tableId: 'cycle_plans',
      rowId: ID.unique(),
      data: {
        agencyId,
        clientId: clientRow.$id,
        status: 'pending_approval',
        title: `Plano smoke ${stamp}`,
        payload: '{}',
      },
      permissions: [
        `read("team:${agencyId}")`,
        `update("team:${agencyId}")`,
        `delete("team:${agencyId}")`,
      ],
    });
    created.planId = plan.$id;

    const rawToken = randomBytes(24).toString('base64url');
    const approval = await tables.createRow({
      databaseId: DATABASE_ID,
      tableId: 'approval_requests',
      rowId: ID.unique(),
      data: {
        agencyId,
        clientId: clientRow.$id,
        status: 'pending',
        token: hashToken(rawToken),
        contentType: 'cycle_plan',
        contentId: plan.$id,
        expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
        payload: JSON.stringify({
          title: `Aprovar plano ${stamp}`,
          encryptedToken: encryptSecret(rawToken),
        }),
      },
      permissions: [
        `read("team:${agencyId}")`,
        `update("team:${agencyId}")`,
        `delete("team:${agencyId}")`,
      ],
    });
    created.approvalId = approval.$id;
    ok(`approval pending criado ${approval.$id}`);

    // Simulate decide isolation: wrong clientId must not be updatable without server check
    // (this smoke validates row exists and can be updated by admin; HTTP isolation is in handler)
    await tables.updateRow({
      databaseId: DATABASE_ID,
      tableId: 'approval_requests',
      rowId: approval.$id,
      data: {
        status: 'approved',
        payload: JSON.stringify({
          title: `Aprovar plano ${stamp}`,
          processedAt: new Date().toISOString(),
          decision: 'approved',
        }),
      },
    });
    const after = await tables.getRow({
      databaseId: DATABASE_ID,
      tableId: 'approval_requests',
      rowId: approval.$id,
    });
    if (after.status === 'approved') ok('status updated to approved');
    else fail(`status inesperado: ${after.status}`);

    await tables.updateRow({
      databaseId: DATABASE_ID,
      tableId: 'cycle_plans',
      rowId: plan.$id,
      data: { status: 'approved' },
    });
    ok('cycle_plan marcado approved');
  } finally {
    console.log('\n[cleanup]');
    for (const [key, id] of Object.entries(created)) {
      const table =
        key === 'approvalId'
          ? 'approval_requests'
          : key === 'planId'
            ? 'cycle_plans'
            : key === 'clientId'
              ? 'clients'
              : null;
      if (!table) continue;
      try {
        await tables.deleteRow({ databaseId: DATABASE_ID, tableId: table, rowId: id });
        ok(`${table} ${id} removido`);
      } catch (e) {
        console.warn(`  cleanup ${key}:`, e.message);
      }
    }
  }
}

async function main() {
  console.log('Smoke Approval Workflow');
  if (!ENDPOINT || !PROJECT_ID || !API_KEY) {
    console.error('Missing Appwrite env');
    process.exit(1);
  }
  await checkHandlersExist();
  if (APPLY) await applyProbe();
  else console.log('\n(use --apply para criar rows temporárias)');

  if (process.exitCode) {
    console.error('\nFALHOU');
    process.exit(1);
  }
  console.log('\nOK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
