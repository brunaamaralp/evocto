/**
 * READ-ONLY audit of public_briefing_* table permissions.
 * Does NOT apply changes. Production permission changes need explicit approval.
 *
 *   node scripts/audit-public-briefing-permissions.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Client, TablesDB } from 'node-appwrite';

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

const ENDPOINT = process.env.VITE_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.VITE_APPWRITE_PROJECT_ID;
const API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.VITE_APPWRITE_DATABASE_ID || 'evocto';

const TABLES = ['public_briefing_tokens', 'public_briefing_responses'];

function hasAny(perms) {
  return (perms || []).some((p) => String(p).includes('any'));
}

async function main() {
  if (!ENDPOINT || !PROJECT_ID || !API_KEY) {
    console.error('Defina VITE_APPWRITE_* e APPWRITE_API_KEY (somente leitura).');
    process.exit(1);
  }

  const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
  const tables = new TablesDB(client);

  console.log('Audit public_briefing_* (read-only)\n');
  let issues = 0;
  for (const tableId of TABLES) {
    try {
      const table = await tables.getTable({ databaseId: DATABASE_ID, tableId });
      const perms = table.$permissions || table.permissions || [];
      const any = hasAny(perms);
      console.log(`  ${tableId}`);
      console.log(`    permissions: ${JSON.stringify(perms.map(String))}`);
      if (any) {
        console.log('    ISSUE: Role.any presente — remoção requer migração aprovada');
        issues += 1;
      } else {
        console.log('    OK: sem Role.any na table');
      }
    } catch (err) {
      console.log(`  ${tableId}: ${err?.message || err}`);
      issues += 1;
    }
  }

  console.log(
    issues
      ? `\n${issues} issue(s). Não aplique correção em produção sem plano de rollback.`
      : '\nNenhum Role.any nas tables (estado alinhado ao setup novo).'
  );
  process.exitCode = issues ? 1 : 0;
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
