/**
 * Migração de dados para Projetos.
 *
 * Para cada agência:
 *   - 1 projeto por serviço contratado (não-template), com o nome do serviço
 *   - 1 projeto "Geral" por cliente para o que não tem serviço (criado só se preciso)
 *   - 1 projeto "Interno da agência" para tarefas sem cliente (só se preciso)
 *   - projectId em services, cycle_plans, briefs e tasks (subtarefas herdam da mãe)
 *   - briefs: projectId legado (= clientId) vira projeto real; clientId é preenchido
 *
 * Idempotente: projetos existentes (por serviceId / isDefault) são reaproveitados.
 *
 * Uso:
 *   node scripts/migrate-projects.mjs                 # dry-run (não grava)
 *   node scripts/migrate-projects.mjs --apply         # grava
 *   node scripts/migrate-projects.mjs --agency=<id>   # só uma agência
 *
 * Pré-requisito: node scripts/appwrite-setup-projects.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Client, TablesDB, Query, ID, Permission, Role } from 'node-appwrite';
import { planProjectMigration } from '../src/lib/projects/projectModel.js';

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
const AGENCY_ARG = (process.argv.find((a) => a.startsWith('--agency=')) || '').split('=')[1];

const ENDPOINT = process.env.VITE_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.VITE_APPWRITE_PROJECT_ID;
const API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.VITE_APPWRITE_DATABASE_ID || 'evocto';

if (!ENDPOINT || !PROJECT_ID || !API_KEY) {
  console.error('Defina VITE_APPWRITE_ENDPOINT, VITE_APPWRITE_PROJECT_ID e APPWRITE_API_KEY');
  process.exit(1);
}

const tables = new TablesDB(
  new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY)
);

function merge(row) {
  let extra = {};
  try {
    extra = row.payload ? JSON.parse(row.payload) : {};
  } catch {
    extra = {};
  }
  const { payload: _p, $id, $createdAt, $updatedAt, ...rest } = row;
  for (const k of Object.keys(rest)) if (k.startsWith('$')) delete rest[k];
  return { ...extra, ...rest, id: $id, created_date: $createdAt, updated_date: $updatedAt };
}

async function listAll(tableId, agencyId) {
  const out = [];
  let cursor = null;
  for (;;) {
    const queries = [Query.limit(100)];
    if (agencyId) queries.push(Query.equal('agencyId', agencyId));
    if (cursor) queries.push(Query.cursorAfter(cursor));
    const res = await tables.listRows({ databaseId: DATABASE_ID, tableId, queries });
    const rows = res.rows || [];
    out.push(...rows.map(merge));
    if (rows.length < 100) break;
    cursor = rows[rows.length - 1].$id;
  }
  return out;
}

function projectRow(p) {
  const { id: _id, agencyId, clientId, name, status, kind, serviceId, isDefault, ...rest } = p;
  return {
    agencyId,
    clientId: clientId || null,
    name,
    status,
    kind,
    serviceId: serviceId || null,
    isDefault: Boolean(isDefault),
    payload: JSON.stringify(rest),
  };
}

function teamPerms(agencyId) {
  return [
    Permission.read(Role.team(agencyId)),
    Permission.update(Role.team(agencyId)),
    Permission.delete(Role.team(agencyId)),
  ];
}

async function migrateAgency(agencyId) {
  const [clients, projects, services, cycles, briefs, tasks] = await Promise.all([
    listAll('clients', agencyId),
    listAll('projects', agencyId),
    listAll('services', agencyId),
    listAll('cycle_plans', agencyId),
    listAll('briefs', agencyId),
    listAll('tasks', agencyId),
  ]);

  const plan = planProjectMigration({
    agencyId,
    clients,
    projects,
    services,
    cycles,
    briefs,
    tasks,
    idFactory: () => ID.unique(),
  });

  console.log(`\nAgência ${agencyId}`);
  console.log(
    `  existentes: ${clients.length} clientes, ${projects.length} projetos, ${services.length} serviços, ` +
      `${cycles.length} ciclos, ${briefs.length} briefs, ${tasks.length} tarefas`
  );
  console.log('  plano:', plan.stats);
  for (const p of plan.createProjects.slice(0, 20)) {
    console.log(`    + projeto "${p.name}" (${p.kind}) cliente=${p.clientId || '—'}`);
  }
  if (plan.createProjects.length > 20) console.log(`    … +${plan.createProjects.length - 20}`);

  if (!APPLY) return plan.stats;

  for (const p of plan.createProjects) {
    await tables.createRow({
      databaseId: DATABASE_ID,
      tableId: 'projects',
      rowId: p.id,
      data: projectRow(p),
      permissions: teamPerms(agencyId),
    });
  }
  for (const [tableId, list] of Object.entries(plan.updates)) {
    for (const u of list) {
      const { id, ...data } = u;
      await tables.updateRow({ databaseId: DATABASE_ID, tableId, rowId: id, data });
    }
  }
  console.log('  ✔ aplicado');
  return plan.stats;
}

async function main() {
  console.log(APPLY ? 'MODO APPLY — gravando' : 'DRY-RUN — nada será gravado (use --apply)');
  const agencyIds = AGENCY_ARG
    ? [AGENCY_ARG]
    : (await listAll('agencies')).map((a) => a.id);

  const total = { projectsToCreate: 0, services: 0, cycle_plans: 0, briefs: 0, tasks: 0 };
  for (const agencyId of agencyIds) {
    const stats = await migrateAgency(agencyId);
    for (const k of Object.keys(total)) total[k] += stats[k] || 0;
  }
  console.log('\nTotal:', total);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
