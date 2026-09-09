import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

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

const headers = {
  'X-Appwrite-Project': process.env.VITE_APPWRITE_PROJECT_ID,
  'X-Appwrite-Key': process.env.APPWRITE_API_KEY,
};

async function get(path) {
  const r = await fetch(`${process.env.VITE_APPWRITE_ENDPOINT}${path}`, { headers });
  const j = await r.json();
  return { status: r.status, j };
}

const teams = await get('/teams?limit=5');
const users = await get('/users?limit=5');
console.log(
  JSON.stringify(
    {
      teams: { status: teams.status, total: teams.j.total, sample: (teams.j.teams || []).map((t) => t.$id) },
      users: { status: users.status, total: users.j.total },
    },
    null,
    2
  )
);
