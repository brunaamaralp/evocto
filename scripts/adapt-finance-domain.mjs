import fs from 'fs';
import path from 'path';

const root = path.resolve('src/components/finance');

const pairs = [
  ['Minha academia', 'Minha agência'],
  ['Aluno não encontrado', 'Cliente não encontrado'],
  ['Aluno (opcional)', 'Cliente (opcional)'],
  ['Buscar aluno, categoria ou nota', 'Buscar cliente, categoria ou nota'],
  ['Registrar mensalidade e conciliar', 'Registrar cobrança e conciliar'],
  ['Abrir em Mensalidades', 'Abrir em Cobranças'],
  ['Repasse ao aluno', 'Repasse ao cliente'],
  [
    'ao valor da mensalidade quando o plano repassa taxas',
    'ao valor da cobrança quando o pacote repassa taxas',
  ],
  [
    'Aplica-se a mensalidades quando o plano repassa taxas ao aluno',
    'Aplica-se a cobranças quando o pacote repassa taxas ao cliente',
  ],
  [
    'Mensalidades pagas, parciais ou pendentes espelham no Caixa; meses cobertos por pacote não geram lançamento.',
    'Cobranças pagas, parciais ou pendentes espelham no Caixa; meses cobertos por pacote não geram lançamento.',
  ],
  ['preferências do aluno', 'preferências do cliente'],
  ['cadastrada no aluno', 'cadastrada no cliente'],
  ['preferida do aluno', 'preferida do cliente'],
  ['padrão da academia', 'padrão da agência'],
  ['configuração da academia', 'configuração da agência'],
  ['Escolha uma academia', 'Escolha uma agência'],
  ['plano de contas (Minha academia', 'plano de contas (Minha agência'],
  ['Categorias fixas (Mensalidades, Marketing', 'Categorias fixas (Cobranças, Marketing'],
  ['<th>Aluno</th>', '<th>Cliente</th>'],
  ['<dt>Aluno</dt>', '<dt>Cliente</dt>'],
  ["|| 'Aluno'", "|| 'Cliente'"],
  ['novos lançamentos e mensalidades em aberto', 'novos lançamentos e cobranças em aberto'],
  ['Nome do aluno', 'Nome do cliente'],
  ['ao aluno', 'ao cliente'],
  ['Busca de aluno via API', 'Busca de cliente'],
];

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
  for (const [a, b] of pairs) text = text.split(a).join(b);
  text = text.split('/student/${').join('/client-detail?clientId=${');
  text = text.split('to="/alunos').join('to="/clients');
  text = text.split("to='/alunos").join("to='/clients");
  if (text !== orig) {
    fs.writeFileSync(file, text);
    updated += 1;
    console.log(path.relative(root, file));
  }
}
console.log('Updated', updated, 'files');
