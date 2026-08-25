/**
 * Smoke estático da Fase 1 (sem chamar a Cloud).
 * Uso: node scripts/smoke-appwrite-phase1.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { TABLE_MAP, PHASE1_TABLES, TABLE_COLUMNS } from '../src/api/appwrite/tableMap.js';

const requiredFiles = [
  'src/api/appwriteClient.js',
  'src/api/appwrite/entityAdapter.js',
  'src/api/appwrite/authAdapter.js',
  'src/api/appwrite/integrations.js',
  'src/api/appwrite/functions.js',
  'src/pages/login.jsx',
  'scripts/appwrite-setup.mjs',
  '.env.example',
];

let failed = 0;

for (const file of requiredFiles) {
  if (!existsSync(file)) {
    console.error(`FALHOU: arquivo ausente ${file}`);
    failed += 1;
  } else {
    console.log(`ok  ${file}`);
  }
}

const expectedTables = [
  'profiles', 'agencies', 'clients', 'services', 'tasks',
  'cycle_plans', 'briefs', 'briefing_templates', 'approval_requests', 'invites',
];

for (const table of expectedTables) {
  if (!PHASE1_TABLES.includes(table)) {
    console.error(`FALHOU: tabela ${table} fora do PHASE1_TABLES`);
    failed += 1;
  }
  if (!TABLE_COLUMNS[table]) {
    console.error(`FALHOU: TABLE_COLUMNS sem ${table}`);
    failed += 1;
  }
}

const entities = readFileSync('src/api/entities.js', 'utf8');
if (!entities.includes("authAdapter") || !entities.includes("createEntityAdapter")) {
  console.error('FALHOU: entities.js não está wired no Appwrite');
  failed += 1;
}

const functions = readFileSync('src/api/functions.js', 'utf8');
if (!functions.includes('appwrite/functions')) {
  console.error('FALHOU: functions.js não aponta para Appwrite');
  failed += 1;
}

const loginPage = readFileSync('src/pages/login.jsx', 'utf8');
if (!loginPage.includes('User.login')) {
  console.error('FALHOU: login.jsx sem User.login');
  failed += 1;
}

console.log('entidades mapeadas:', Object.keys(TABLE_MAP).join(', '));

if (failed > 0) {
  console.error(`\nSmoke falhou: ${failed} problema(s)`);
  process.exit(1);
}

console.log('\nSmoke Fase 1 OK');
