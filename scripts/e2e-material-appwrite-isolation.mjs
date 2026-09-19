/**
 * Testes negativos Appwrite — approval_requests isolation (sem alterar permissões).
 * node scripts/e2e-material-appwrite-isolation.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Client, TablesDB, Users, Query, ID, Permission, Role } from 'node-appwrite';
import { createHash, randomBytes } from 'node:crypto';

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

if (!ENDPOINT || !PROJECT_ID || !API_KEY) {
  console.error('APPWRITE admin incompleto');
  process.exit(1);
}

const admin = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
const tables = new TablesDB(admin);
const users = new Users(admin);

const results = [];
function log(id, status, detail) {
  results.push({ id, status, detail });
  console.log(`${status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '•'} [${id}] ${detail}`);
}

const cleanup = { userId: null, rowIds: [] };

async function main() {
  // Table-level snapshot
  const table = await tables.getTable({ databaseId: DATABASE_ID, tableId: 'approval_requests' });
  const perms = table.$permissions || table.permissions || [];
  log(
    'table_perms',
    'INFO',
    `approval_requests permissions=${JSON.stringify(perms)} rowSecurity=${table.rowSecurity}`
  );

  // Create ephemeral user (no team)
  const email = `e2e.material.${Date.now()}@example.invalid`;
  const password = `E2e!${randomBytes(8).toString('hex')}`;
  const user = await users.create({
    userId: ID.unique(),
    email,
    password,
    name: 'E2E Material Isolation',
  });
  cleanup.userId = user.$id;
  log('user_create', 'PASS', `user ephemeral criado (sem team)`);

  // Session as that user
  const userClient = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID);
  // node-appwrite doesn't do email session easily without Account.createEmailPasswordSession
  const { Account } = await import('node-appwrite');
  const account = new Account(userClient);
  const session = await account.createEmailPasswordSession({ email, password });
  userClient.setSession(session.secret);
  const userTables = new TablesDB(userClient);

  // Try list all approval_requests
  try {
    const list = await userTables.listRows({
      databaseId: DATABASE_ID,
      tableId: 'approval_requests',
      queries: [Query.limit(5)],
    });
    const n = (list.rows || list.documents || []).length;
    if (n > 0) {
      log('list_approvals', 'FAIL', `usuário comum listou ${n} approval_requests`);
    } else {
      log('list_approvals', 'PASS', 'lista vazia (sem leitura de rows alheias)');
    }
  } catch (err) {
    log('list_approvals', 'PASS', `list bloqueado: ${err.type || err.code || err.message}`);
  }

  // Try create row
  const fakeToken = createHash('sha256').update(randomBytes(32)).digest('hex');
  let createdId = null;
  try {
    const row = await userTables.createRow({
      databaseId: DATABASE_ID,
      tableId: 'approval_requests',
      rowId: ID.unique(),
      data: {
        agencyId: 'attacker-agency',
        clientId: 'attacker-client',
        status: 'active',
        token: fakeToken,
        contentType: 'material_delivery',
        contentId: 'fake-delivery-id',
      },
    });
    createdId = row.$id || row.id;
    cleanup.rowIds.push(createdId);
    log(
      'create_approval',
      'WARN',
      `usuário comum CONSEGUIU createRow id=${createdId} (table allow create(users))`
    );
  } catch (err) {
    log('create_approval', 'PASS', `create bloqueado: ${err.type || err.code || err.message}`);
  }

  // If created, try read own / update / delete
  if (createdId) {
    try {
      await userTables.getRow({
        databaseId: DATABASE_ID,
        tableId: 'approval_requests',
        rowId: createdId,
      });
      log('read_own_created', 'WARN', 'conseguiu ler a row que criou');
    } catch (err) {
      log('read_own_created', 'INFO', `read próprio falhou: ${err.message}`);
    }

    try {
      await userTables.updateRow({
        databaseId: DATABASE_ID,
        tableId: 'approval_requests',
        rowId: createdId,
        data: { status: 'approved' },
      });
      log('update_own', 'FAIL', 'conseguiu update status=approved');
    } catch (err) {
      log('update_own', 'PASS', `update bloqueado: ${err.type || err.message}`);
    }

    try {
      await userTables.deleteRow({
        databaseId: DATABASE_ID,
        tableId: 'approval_requests',
        rowId: createdId,
      });
      log('delete_own', 'PASS', 'delete próprio ok (ou permitido)');
      cleanup.rowIds = cleanup.rowIds.filter((id) => id !== createdId);
    } catch (err) {
      log('delete_own', 'INFO', `delete bloqueado: ${err.message}`);
    }
  }

  // Try read a random/other id
  try {
    await userTables.getRow({
      databaseId: DATABASE_ID,
      tableId: 'approval_requests',
      rowId: 'nonexistent000000000000000001',
    });
    log('read_foreign', 'FAIL', 'leu row inexistente/outra');
  } catch (err) {
    log('read_foreign', 'PASS', `getRow estranho bloqueado: ${err.type || err.code || 'denied'}`);
  }

  // material_deliveries list as user
  try {
    const list = await userTables.listRows({
      databaseId: DATABASE_ID,
      tableId: 'material_deliveries',
      queries: [Query.limit(5)],
    });
    const n = (list.rows || []).length;
    log(
      'list_material_deliveries',
      n > 0 ? 'FAIL' : 'PASS',
      n > 0 ? `listou ${n} deliveries` : 'lista vazia ou sem acesso útil'
    );
  } catch (err) {
    log('list_material_deliveries', 'PASS', `bloqueado: ${err.type || err.message}`);
  }

  // Cleanup with admin
  for (const id of cleanup.rowIds) {
    try {
      await tables.deleteRow({ databaseId: DATABASE_ID, tableId: 'approval_requests', rowId: id });
    } catch {
      /* ignore */
    }
  }
  if (cleanup.userId) {
    try {
      await users.delete({ userId: cleanup.userId });
      log('cleanup', 'PASS', 'usuário/rows de teste removidos');
    } catch (err) {
      log('cleanup', 'WARN', `falha cleanup user: ${err.message}`);
    }
  }

  console.log('\nJSON_SUMMARY');
  console.log(JSON.stringify(results, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
