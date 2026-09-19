/**
 * Auditoria + hardening de permissões das tables Material Deliveries.
 *
 * Uso:
 *   node scripts/audit-material-permissions.mjs           # read-only
 *   node scripts/audit-material-permissions.mjs --apply   # aplica correções
 *
 * Requer APPWRITE_API_KEY + VITE_APPWRITE_* em .env.local
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Client, TablesDB, Permission, Role } from 'node-appwrite';

function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    const path = resolve(process.cwd(), file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

loadEnv();

const APPLY = process.argv.includes('--apply');
const ENDPOINT = process.env.VITE_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.VITE_APPWRITE_PROJECT_ID;
const API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.VITE_APPWRITE_DATABASE_ID || 'evocto';

if (!ENDPOINT || !PROJECT_ID || !API_KEY || !DATABASE_ID) {
  console.error('Defina VITE_APPWRITE_ENDPOINT, PROJECT_ID, DATABASE_ID e APPWRITE_API_KEY');
  process.exit(1);
}

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
const tables = new TablesDB(client);

/** Esperado: sem Role.any; Material/Drive server-only. */
const EXPECTED = {
  material_deliveries: { serverOnly: true, allowAny: false },
  material_delivery_versions: { serverOnly: true, allowAny: false },
  agency_drive_connections: { serverOnly: true, allowAny: false },
  approval_requests: { serverOnly: false, allowAny: false },
  notifications: { serverOnly: false, allowAny: false },
  audit_logs: { serverOnly: false, allowAny: false },
};

function permStrings(perms) {
  return (perms || []).map((p) => String(p));
}

function hasAnyRole(perms) {
  return permStrings(perms).some((p) => p.includes('any') || p.includes('Role.any'));
}

function isServerOnly(perms) {
  return !perms || perms.length === 0;
}

async function auditTable(tableId) {
  const expected = EXPECTED[tableId];
  try {
    const table = await tables.getTable({ databaseId: DATABASE_ID, tableId });
    const perms = table.$permissions || table.permissions || [];
    const rowSecurity = table.rowSecurity ?? table.documentSecurity ?? null;
    const any = hasAnyRole(perms);
    const serverOnly = isServerOnly(perms);

    const issues = [];
    if (any) issues.push('HAS_ROLE_ANY');
    if (expected.serverOnly && !serverOnly) {
      issues.push('EXPECTED_SERVER_ONLY_BUT_HAS_TABLE_PERMS');
    }
    if (!expected.allowAny && any) issues.push('FORBIDDEN_PUBLIC_ACCESS');

    return {
      tableId,
      exists: true,
      permissions: permStrings(perms),
      rowSecurity,
      issues,
      ok: issues.length === 0,
    };
  } catch (err) {
    return {
      tableId,
      exists: false,
      error: err.message,
      issues: ['MISSING_TABLE'],
      ok: false,
    };
  }
}

async function applyHardening(report) {
  for (const row of report) {
    if (!row.exists) continue;
    const expected = EXPECTED[row.tableId];
    if (!expected) continue;

    let nextPerms = null;
    if (expected.serverOnly) {
      nextPerms = [];
    } else if (hasAnyRole(row.permissions)) {
      // Strip any; keep create(users) if present, else empty + create users
      nextPerms = [Permission.create(Role.users())];
    }

    if (nextPerms === null) continue;

    try {
      await tables.updateTable({
        databaseId: DATABASE_ID,
        tableId: row.tableId,
        permissions: nextPerms,
        rowSecurity: true,
      });
      console.log(`  ✓ ${row.tableId}: permissões atualizadas (serverOnly=${expected.serverOnly})`);
    } catch (err) {
      console.error(`  ✗ ${row.tableId}: falha ao atualizar — ${err.message}`);
    }
  }
}

async function main() {
  console.log(`\nAuditoria Material Deliveries — database=${DATABASE_ID}`);
  console.log(`Modo: ${APPLY ? 'APPLY' : 'READ-ONLY'}\n`);

  const report = [];
  for (const tableId of Object.keys(EXPECTED)) {
    const row = await auditTable(tableId);
    report.push(row);
    const mark = row.ok ? 'OK' : '!!';
    console.log(`[${mark}] ${tableId}`);
    if (!row.exists) {
      console.log(`     missing: ${row.error}`);
      continue;
    }
    console.log(`     rowSecurity=${row.rowSecurity}`);
    console.log(`     permissions=${JSON.stringify(row.permissions)}`);
    if (row.issues.length) console.log(`     issues=${row.issues.join(', ')}`);
  }

  const bad = report.filter((r) => !r.ok);
  console.log(`\nResumo: ${report.length - bad.length}/${report.length} ok`);

  if (APPLY && bad.length) {
    console.log('\nAplicando correções…');
    await applyHardening(report);
    console.log('\nReauditoria…');
    for (const tableId of Object.keys(EXPECTED)) {
      const row = await auditTable(tableId);
      console.log(`  ${row.ok ? 'OK' : '!!'} ${tableId} ${row.issues?.join(',') || ''}`);
    }
  } else if (bad.length && !APPLY) {
    console.log('\nRode com --apply para corrigir table permissions (sem Role.any / server-only).');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
