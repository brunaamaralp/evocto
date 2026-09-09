import fs from 'fs';
import path from 'path';

const missing = [];
const checked = new Set();
const roots = [
  'src/pages/financeiro.jsx',
  'src/components/finance/FinanceiroConfigTab.jsx',
  'src/lib/studentPaymentsApi.js',
  'src/lib/studentSaleSearch.js',
  'src/lib/useUserRole.js',
];

function resolveImport(fromFile, spec) {
  if (spec.startsWith('@/')) return path.resolve('src', spec.slice(2));
  if (spec.startsWith('.')) return path.resolve(path.dirname(fromFile), spec);
  return null;
}

function tryFile(base) {
  const cands = [
    base,
    `${base}.js`,
    `${base}.jsx`,
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, 'index.js'),
    path.join(base, 'index.jsx'),
  ];
  for (const c of cands) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}

function shouldWalk(found) {
  const rel = found.replace(/\\/g, '/');
  return (
    rel.includes('/components/finance/') ||
    rel.includes('/lib/finance') ||
    rel.includes('/lib/financeiro') ||
    rel.includes('/lib/student') ||
    rel.includes('/lib/mensalidades') ||
    rel.includes('/lib/payment') ||
    rel.includes('/lib/collection') ||
    rel.includes('/lib/academy') ||
    rel.includes('/pages/financeiro') ||
    rel.includes('/hooks/useFinance') ||
    rel.includes('/features/contracts') ||
    rel.includes('/components/academy') ||
    rel.includes('/store/useLead') ||
    rel.includes('/store/useStudent') ||
    rel.includes('/store/useAccounting') ||
    rel.includes('/components/shared/') ||
    rel.includes('/components/layout/PageHeader')
  );
}

function walk(file) {
  const abs = tryFile(file) || file;
  if (!fs.existsSync(abs) || checked.has(abs)) return;
  checked.add(abs);
  if (!/\.(jsx?|tsx?)$/.test(abs)) return;
  const text = fs.readFileSync(abs, 'utf8');
  const re =
    /(?:import|export)\s+[^'"]*from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;
  let m;
  while ((m = re.exec(text))) {
    const spec = m[1] || m[2];
    const resolved = resolveImport(abs, spec);
    if (!resolved) continue;
    const found = tryFile(resolved);
    if (!found) missing.push({ from: abs, spec });
    else if (shouldWalk(found)) walk(found);
  }
}

for (const r of roots) walk(path.resolve(r));
console.log('checked', checked.size);
console.log('missing', missing.length);
for (const x of missing.slice(0, 50)) {
  console.log('-', path.relative('.', x.from), '->', x.spec);
}
