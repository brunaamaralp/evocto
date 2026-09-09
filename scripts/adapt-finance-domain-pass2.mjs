import fs from 'fs';
import path from 'path';

const root = path.resolve('src/components/finance');

const pairs = [
  ['Selecione uma academia.', 'Selecione uma agência.'],
  ['Buscar aluno na fila de cobrança', 'Buscar cliente na fila de cobrança'],
  ['Nenhum aluno neste filtro', 'Nenhum cliente neste filtro'],
  ['O badge do aluno', 'O badge do cliente'],
  ['A academia paga a taxa da maquininha', 'A agência paga a taxa da maquininha'],
  ['cobrado do aluno', 'cobrado do cliente'],
  ['Quando a academia paga', 'Quando a agência paga'],
  ['Padrão geral da academia', 'Padrão geral da agência'],
  ['pagamento do aluno fica', 'pagamento do cliente fica'],
  ['Pendências de Mensalidades', 'Pendências de Cobranças'],
  ['aba Pendências de Cobranças', 'aba Pendências de Cobranças'],
  ['turma', 'equipe'], // only if in UI - careful, skip if too broad
];

// Safer second pass: only exact UI phrases still remaining
const safePairs = pairs.filter(([a]) => a !== 'turma');

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (/\.(jsx|js)$/.test(ent.name)) out.push(p);
  }
  return out;
}

let updated = 0;
for (const file of walk(root)) {
  let text = fs.readFileSync(file, 'utf8');
  const orig = text;
  for (const [a, b] of safePairs) text = text.split(a).join(b);
  if (text !== orig) {
    fs.writeFileSync(file, text);
    updated += 1;
    console.log(path.relative(root, file));
  }
}
console.log('Updated', updated, 'files');
