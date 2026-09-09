import { readFileSync, writeFileSync } from 'node:fs';

const raw = JSON.parse(readFileSync('audit-appwrite-schema.json', 'utf8'));
const compact = {
  fetchedAt: raw.fetchedAt,
  databaseIdFromEnv: raw.databaseIdFromEnv,
  databases: raw.databases.map((d) => ({ id: d.$id, name: d.name })),
  buckets: raw.buckets.map((b) => ({
    id: b.$id,
    name: b.name,
    fileSecurity: b.fileSecurity,
    perms: b.$permissions,
  })),
  tables: raw.tables.map((t) => ({
    id: t.id,
    name: t.name,
    rowSecurity: t.rowSecurity,
    permissions: t.permissions,
    columns: t.columns,
    indexes: t.indexes,
  })),
};
writeFileSync('audit-appwrite-schema-compact.json', JSON.stringify(compact, null, 2));

for (const t of compact.tables) {
  console.log('===', t.id, '===');
  for (const c of t.columns) {
    console.log(
      ' ',
      c.key,
      c.type,
      'req=' + c.required,
      'size=' + (c.size ?? ''),
      'def=' + (c.default ?? ''),
      'status=' + c.status
    );
  }
  console.log(
    ' indexes:',
    t.indexes
      .map((i) => i.key + ':' + (i.columns || []).join('+') + '/' + i.type + '/' + i.status)
      .join(', ')
  );
  const colKeys = new Set(t.columns.map((c) => c.key));
  for (const i of t.indexes) {
    for (const col of i.columns || []) {
      if (!colKeys.has(col)) console.log('  BROKEN INDEX REF:', i.key, '->', col);
    }
  }
}
