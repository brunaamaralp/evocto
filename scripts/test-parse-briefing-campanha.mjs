/**
 * Smoke test do parser de campanha.
 * Uso: node scripts/test-parse-briefing-campanha.mjs
 */
import {
  parseBriefingCampanha,
  calcularConfianca,
} from '../src/lib/parseBriefingCampanha.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const teste = `
Vamos fazer a campanha de outono.
Objetivo é aumentar as vendas.
Lança a linha Gold com desconto 15%.
A dona aparece, interior da loja.
Grava 15-18 de setembro.
`;

const resultado = parseBriefingCampanha(teste);
console.log('Resultado Outono:', JSON.stringify(resultado, null, 2));

assert(resultado.nome, 'nome deve ser detectado');
assert(/outono/i.test(resultado.nome.valor), 'nome deve conter outono');
assert(resultado.nome.confianca >= 80, 'confiança nome >= 80');
assert(resultado.objetivo, 'objetivo deve ser detectado');
assert(resultado.objetivo.confianca >= 75, 'confiança objetivo >= 75');
assert(resultado.acoes_comerciais, 'acoes devem ser detectadas');
assert(resultado.talento_locacao, 'talento deve ser detectado');
assert(resultado.data, 'data deve ser detectada');
assert(resultado.data.confianca >= 80, 'confiança data >= 80');

const baguncado = `
Galera, vamos fazer a coisa de black friday.
A galera quer vender muito mesmo, tá apertado.
Precisa de umas 5 vídeos e 2 designs.
A dona aparece, aquele interior da loja mesmo.
Grava na semana que vem, segunda, pode ser?
`;

const r2 = parseBriefingCampanha(baguncado);
console.log('Resultado Black Friday bagunçado:', JSON.stringify(r2, null, 2));

assert(r2.nome && /black/i.test(r2.nome.valor), 'Black Friday detectado');
assert(r2.objetivo || r2.talento_locacao, 'pelo menos objetivo ou talento');
assert(r2.talento_locacao, 'talento detectado');
assert(r2.data, 'data/semana que vem detectada');
// ações podem falhar (apertado) — OK

const conf = calcularConfianca('nome', ['outono'], 'campanha de outono outono');
assert(conf >= 50 && conf <= 100, 'confiança no range');

console.log('\n✓ Todos os testes do parser passaram');
