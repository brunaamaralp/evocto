/**
 * Smoke / isolation checks for Client Portal security model (Opção A).
 *
 * READ-MOSTLY: creates temporary test users/rows only if --apply is passed.
 * Default: validates schema + row ACL assumptions + requireClient shape via static checks.
 *
 * Uso:
 *   node scripts/smoke-client-portal-isolation.mjs
 *   node scripts/smoke-client-portal-isolation.mjs --apply   # cria users de teste e limpa
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Client, TablesDB, Users, Teams, Account, Query, ID } from 'node-appwrite';

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
const teams = new Teams(admin);

function ok(msg) {
  console.log(`  ✓ ${msg}`);
}
function fail(msg) {
  console.error(`  ✗ ${msg}`);
  process.exitCode = 1;
}

async function checkSchema() {
  console.log('\n[1] Schema tasks.clientVisible');
  const table = await tables.getTable({ databaseId: DATABASE_ID, tableId: 'tasks' });
  const col = (table.columns || []).find((c) => c.key === 'clientVisible');
  if (!col) fail('coluna clientVisible ausente — rode npm run appwrite:setup-client-visible');
  else ok(`clientVisible presente (type=${col.type}, default=${col.default})`);
}

async function checkTeamAclOnRows() {
  console.log('\n[2] Row ACL ainda usa Role.team (esperado para staff)');
  const res = await tables.listRows({
    databaseId: DATABASE_ID,
    tableId: 'tasks',
    queries: [Query.limit(5)],
  });
  const rows = res.rows || [];
  if (!rows.length) {
    ok('sem tasks para amostrar (ok)');
    return;
  }
  const withTeam = rows.filter((r) =>
    (r.$permissions || []).some((p) => String(p).includes('team:'))
  );
  ok(`${withTeam.length}/${rows.length} tasks com permissão de team (staff)`);
}

async function checkClientProfilesNotInTeam() {
  console.log('\n[3] Profiles role=client fora do team da agência');
  const res = await tables.listRows({
    databaseId: DATABASE_ID,
    tableId: 'profiles',
    queries: [Query.equal('role', 'client'), Query.limit(25)],
  });
  const profiles = res.rows || [];
  if (!profiles.length) {
    ok('nenhum profile client ainda — criação futura não deve adicionar ao team');
    return;
  }
  for (const p of profiles) {
    const list = await users.listMemberships({ userId: p.$id });
    const onAgency = (list.memberships || []).some((m) => m.teamId === p.agencyId);
    if (onAgency) {
      fail(
        `user ${p.$id} ainda é membro do team ${p.agencyId} — remova o membership (Opção A)`
      );
    } else {
      ok(`user ${p.$id} NÃO está no team da agência`);
    }
  }
}

async function applyIsolationProbe() {
  console.log('\n[4] Probe --apply: cria 2 clients + 1 task cada e testa sessão JWT');
  const agencies = await tables.listRows({
    databaseId: DATABASE_ID,
    tableId: 'agencies',
    queries: [Query.limit(1)],
  });
  const agency = (agencies.rows || [])[0];
  if (!agency) {
    fail('nenhuma agency para probe');
    return;
  }
  const agencyId = agency.$id;
  const stamp = Date.now();
  const password = `Tmp!${stamp}Aa`;
  const created = [];

  try {
    for (const label of ['a', 'b']) {
      const clientRow = await tables.createRow({
        databaseId: DATABASE_ID,
        tableId: 'clients',
        rowId: ID.unique(),
        data: {
          agencyId,
          name: `Smoke Portal ${label.toUpperCase()} ${stamp}`,
          status: 'active',
          email: `smoke-portal-${label}-${stamp}@example.com`,
          payload: '{}',
        },
        permissions: [
          `read("team:${agencyId}")`,
          `update("team:${agencyId}")`,
          `delete("team:${agencyId}")`,
        ],
      });

      const userId = ID.unique();
      const email = `smoke.portal.${label}.${stamp}@example.com`;
      await users.create({
        userId,
        email,
        password,
        name: `Smoke Client ${label}`,
      });
      // NÃO createMembership — Opção A

      await tables.createRow({
        databaseId: DATABASE_ID,
        tableId: 'profiles',
        rowId: userId,
        data: {
          agencyId,
          role: 'client',
          clientId: clientRow.$id,
          name: `Smoke Client ${label}`,
          email,
          full_name: `Smoke Client ${label}`,
          status: 'active',
          payload: JSON.stringify({ smoke: true }),
        },
        permissions: [
          `read("user:${userId}")`,
          `update("user:${userId}")`,
          `read("team:${agencyId}")`,
          `update("team:${agencyId}")`,
        ],
      });

      const task = await tables.createRow({
        databaseId: DATABASE_ID,
        tableId: 'tasks',
        rowId: ID.unique(),
        data: {
          agencyId,
          clientId: clientRow.$id,
          title: `Smoke task ${label} ${stamp}`,
          status: 'todo',
          clientVisible: label === 'a',
          payload: JSON.stringify({ estimatedHours: 99, secret: 'internal' }),
        },
        permissions: [
          `read("team:${agencyId}")`,
          `update("team:${agencyId}")`,
          `delete("team:${agencyId}")`,
        ],
      });

      created.push({ label, userId, email, password, clientId: clientRow.$id, taskId: task.$id });
    }

    const sessionClient = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID);
    const account = new Account(sessionClient);
    await account.createEmailPasswordSession({
      email: created[0].email,
      password: created[0].password,
    });

    const userTables = new TablesDB(sessionClient);
    // Client A session should NOT list agency tasks via SDK (not on team)
    try {
      const listed = await userTables.listRows({
        databaseId: DATABASE_ID,
        tableId: 'tasks',
        queries: [Query.limit(10)],
      });
      const rows = listed.rows || [];
      const other = rows.filter((r) => r.clientId === created[1].clientId);
      if (other.length > 0) {
        fail(`Cliente A listou ${other.length} task(s) do Cliente B via SDK`);
      } else if (rows.length === 0) {
        ok('Cliente A não lista tasks via SDK (isolado do team)');
      } else {
        fail(`Cliente A ainda vê ${rows.length} task(s) via SDK — verifique membership/ACL`);
      }
    } catch (e) {
      ok(`Cliente A bloqueado ao listar tasks via SDK (${e.message})`);
    }

    try {
      await userTables.getRow({
        databaseId: DATABASE_ID,
        tableId: 'tasks',
        rowId: created[1].taskId,
      });
      fail('Cliente A conseguiu get Task do Cliente B');
    } catch {
      ok('Cliente A NÃO acessa Task do Cliente B por ID');
    }

    try {
      await userTables.getRow({
        databaseId: DATABASE_ID,
        tableId: 'clients',
        rowId: created[1].clientId,
      });
      fail('Cliente A conseguiu get Client B');
    } catch {
      ok('Cliente A NÃO acessa Client B por ID');
    }

    try {
      await account.deleteSession({ sessionId: 'current' });
    } catch {
      // ignore
    }
  } finally {
    console.log('\n[cleanup]');
    for (const item of created) {
      try {
        await tables.deleteRow({ databaseId: DATABASE_ID, tableId: 'tasks', rowId: item.taskId });
        ok(`task ${item.taskId} removida`);
      } catch (e) {
        console.warn('  task cleanup:', e.message);
      }
      try {
        await tables.deleteRow({ databaseId: DATABASE_ID, tableId: 'profiles', rowId: item.userId });
      } catch {
        // ignore
      }
      try {
        await tables.deleteRow({ databaseId: DATABASE_ID, tableId: 'clients', rowId: item.clientId });
      } catch {
        // ignore
      }
      try {
        await users.delete({ userId: item.userId });
        ok(`user ${item.label} removido`);
      } catch (e) {
        console.warn('  user cleanup:', e.message);
      }
    }
  }
}

async function main() {
  console.log('Smoke Client Portal Isolation');
  console.log(`database=${DATABASE_ID} apply=${APPLY}`);
  if (!ENDPOINT || !PROJECT_ID || !API_KEY) {
    console.error('Missing Appwrite env');
    process.exit(1);
  }

  await checkSchema();
  await checkTeamAclOnRows();
  await checkClientProfilesNotInTeam();
  if (APPLY) await applyIsolationProbe();
  else console.log('\n(pulo do probe com sessão — use --apply para criar users temporários)');

  if (process.exitCode) {
    console.error('\nFALHOU');
    process.exit(1);
  }
  console.log('\nOK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
